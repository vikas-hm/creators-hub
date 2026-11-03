const Notification = require('../models/Notification');

// Creates a notification. Never notifies you about your own actions.
async function notify({ recipient, sender, type, post = null, comment = null }) {
  try {
    if (!recipient || recipient.toString() === sender.toString()) return;

    // Likes and follows are notified only once, so like, unlike, like does not spam
    if (['like', 'follow', 'comment_like'].includes(type)) {
      const exists = await Notification.findOne({ recipient, sender, type, post, comment });
      if (exists) return;
    }

    await Notification.create({ recipient, sender, type, post, comment });
  } catch (err) {
    console.log('Notify error:', err.message);
  }
}

module.exports = notify;