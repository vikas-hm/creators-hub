const Notification = require('../models/Notification');

// Creates a notification. Never notifies you about your own actions.
async function notify({ recipient, sender, type, post = null }) {
  try {
    if (!recipient || recipient.toString() === sender.toString()) return;

    // Likes and follows are only notified once, so unlike and like again does not spam
    if (type === 'like' || type === 'follow') {
      const exists = await Notification.findOne({ recipient, sender, type, post });
      if (exists) return;
    }

    await Notification.create({ recipient, sender, type, post });
  } catch (err) {
    console.log('Notify error:', err.message);
  }
}

module.exports = notify;