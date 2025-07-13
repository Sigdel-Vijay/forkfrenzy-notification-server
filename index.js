const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

// Load Firebase Admin credentials
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(bodyParser.json());

// Helper function to send notification
async function sendNotificationToUser(userToken, riderStatus) {
  let messageBody;

  switch (riderStatus) {
    case 'riderfound':
      messageBody = 'Order Accepted by a rider.';
      break;
    case 'delivering':
      messageBody = 'Picked by rider';
      break;
    case 'reached':
      messageBody = 'Reached to drop location';
      break;
    case 'delivered':
      messageBody = 'Your order has been delivered successfully!';
      break;
    case 'canceled':
      messageBody = 'Your order has been canceled.';
      break;
    default:
      return; // 🛑 Skip unknown or unwanted statuses like 'packing' or 'packed'
  }

  const message = {
    notification: {
      title: 'Order Status Update',
      body: messageBody,
    },
    token: userToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
}

// Endpoint to update rider status and notify user
app.post('/updateRiderStatus', async (req, res) => {
  const { orderId, userToken, riderStatus } = req.body;

  if (!orderId || !userToken || !riderStatus) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const lowerStatus = riderStatus.toLowerCase();

  // 🛑 Skip sending notification for 'packing' and 'packed'
  if (lowerStatus === 'packing' || lowerStatus === 'packed') {
    return res.json({ success: true, message: 'No notification for packing or packed status' });
  }

  try {
    await sendNotificationToUser(userToken, lowerStatus);
    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification', details: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
