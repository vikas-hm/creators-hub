const express = require('express');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

// My latest notifications
router.get('/', auth, async (req, res) => {
  try {
    const items = await Notification.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'name username avatar')
      .populate('post', 'imageUrl mediaType');
    res.json(items);
  } catch (err) {
    console.log('Notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Number of unread notifications (for the bell)
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.userId, read: false });
    res.json({ count });
  } catch (err) {
    console.log('Unread count error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all as read
router.post('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.userId, read: false }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    console.log('Read all error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// The newest unread message and the newest unread notification (for popups)
router.get('/alerts', auth, async (req, res) => {
  try {
    const me = req.userId;

    const msg = await Message.findOne({
      recipient: me,
      read: false,
      unsent: { $ne: true },
      deletedFor: { $ne: me },
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name username avatar');

    const note = await Notification.findOne({ recipient: me, read: false })
      .sort({ createdAt: -1 })
      .populate('sender', 'name username avatar');

    res.json({
      message:
        msg && msg.sender
          ? {
              id: msg._id,
              from: msg.sender,
              text: msg.text,
              hasPost: !!msg.post,
              at: msg.createdAt,
            }
          : null,
      notification:
        note && note.sender
          ? {
              id: note._id,
              from: note.sender,
              type: note.type,
              text: note.text,
              post: note.post,
              at: note.createdAt,
            }
          : null,
    });
  } catch (err) {
    console.log('Alerts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;