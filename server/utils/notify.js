const Notification = require('../models/Notification');

// Creates a notification. Never notifies you about your own actions.
async function notify({
  recipient,
  sender,
  type,
  post = null,
  comment = null,
  message = null,
  text = '',
}) {
  try {
    if (!recipient || recipient.toString() === sender.toString()) return;

    if (type === 'message_reaction') {
      // One notification per person per message. A new reaction replaces the old one.
      await Notification.deleteMany({ recipient, sender, type, message });
    } else if (['like', 'follow', 'comment_like'].includes(type)) {
      // Likes and follows are notified only once, so like, unlike, like does not spam
      const exists = await Notification.findOne({ recipient, sender, type, post, comment });
      if (exists) return;
    }

    await Notification.create({ recipient, sender, type, post, comment, message, text });
  } catch (err) {
    console.log('Notify error:', err.message);
  }
}

module.exports = notify;