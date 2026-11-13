const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

// A message can be edited for 15 minutes after it was sent. Unsend works any time.
const EDIT_WINDOW = 15 * 60 * 1000;

// Messages in both directions between two users
const between = (a, b) => ({
  $or: [
    { sender: a, recipient: b },
    { sender: b, recipient: a },
  ],
});

// Find people to message
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q) return res.json([]);

    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      _id: { $ne: req.userId },
      $or: [{ username: { $regex: safe } }, { name: { $regex: safe, $options: 'i' } }],
    })
      .select('name username avatar')
      .limit(8);

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Number of unread messages (for the navigation bar)
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.userId,
      read: false,
      unsent: { $ne: true },
      deletedFor: { $ne: req.userId },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// My chats, newest first
router.get('/conversations', auth, async (req, res) => {
  try {
    const me = req.userId;
    const msgs = await Message.find({
      $or: [{ sender: me }, { recipient: me }],
      deletedFor: { $ne: me },
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('sender', 'name username avatar')
      .populate('recipient', 'name username avatar');

    const map = new Map();
    for (const m of msgs) {
      if (!m.sender || !m.recipient) continue;

      const mine = m.sender._id.toString() === me;
      const other = mine ? m.recipient : m.sender;
      const key = other._id.toString();

      if (!map.has(key)) {
        map.set(key, {
          user: other,
          last: {
            text: m.unsent ? '' : m.text,
            hasPost: !!m.post,
            unsent: !!m.unsent,
            mine,
            read: m.read,
            createdAt: m.createdAt,
          },
          unread: 0,
        });
      }
      if (!mine && !m.read && !m.unsent) map.get(key).unread += 1;
    }

    res.json([...map.values()]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Messages between me and one user. Also marks their messages as seen.
router.get('/with/:username', auth, async (req, res) => {
  try {
    const me = req.userId;
    const other = await User.findOne({ username: req.params.username.toLowerCase() }).select(
      'name username avatar'
    );
    if (!other) return res.status(404).json({ message: 'User not found' });

    const found = await Message.find({
      $and: [between(me, other._id), { deletedFor: { $ne: me } }],
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate({
        path: 'post',
        select: 'imageUrl mediaType caption user',
        populate: { path: 'user', select: 'username' },
      });

    await Message.updateMany(
      { sender: other._id, recipient: me, read: false },
      { read: true, readAt: new Date() }
    );

    // canEdit tells the app whether to show the Edit option for each message
    const messages = found.map((m) => {
      const o = m.toObject();
      o.canEdit =
        m.sender.toString() === me &&
        !m.unsent &&
        !!m.text &&
        Date.now() - m.createdAt.getTime() < EDIT_WINDOW;
      return o;
    });

    res.json({ user: other, messages });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a whole chat for me only
router.delete('/with/:username', auth, async (req, res) => {
  try {
    const me = req.userId;
    const other = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!other) return res.status(404).json({ message: 'User not found' });

    await Message.updateMany(between(me, other._id), { $addToSet: { deletedFor: me } });

    // When both people have deleted a message, remove it for real
    await Message.deleteMany({
      $and: [between(me, other._id), { deletedFor: { $all: [me, other._id] } }],
    });

    res.json({ message: 'Chat deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message, a shared post, or both
router.post('/to/:username', auth, async (req, res) => {
  try {
    const text = (req.body.text || '').trim().slice(0, 1000);
    const postId = req.body.postId;

    if (!text && !postId) {
      return res.status(400).json({ message: 'Write a message or share a post' });
    }

    const other = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!other) return res.status(404).json({ message: 'User not found' });
    if (other._id.toString() === req.userId) {
      return res.status(400).json({ message: 'You cannot message yourself' });
    }

    let post = null;
    if (postId) {
      if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({ message: 'Post not found' });
      }
      post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });
    }

    const message = await Message.create({
      sender: req.userId,
      recipient: other._id,
      text,
      post: post ? post._id : null,
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Edit one of my messages (within 15 minutes)
router.patch('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ message: 'You can edit only your own messages' });
    }
    if (message.unsent) {
      return res.status(400).json({ message: 'This message was unsent' });
    }
    if (!message.text) {
      return res.status(400).json({ message: 'Only text messages can be edited' });
    }
    if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW) {
      return res.status(400).json({ message: 'You can edit a message only within 15 minutes' });
    }

    const text = (req.body.text || '').trim().slice(0, 1000);
    if (!text) return res.status(400).json({ message: 'The message cannot be empty' });

    message.text = text;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Unsend one of my messages (works any time)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ message: 'You can unsend only your own messages' });
    }

    message.unsent = true;
    message.text = '';
    message.post = null;
    await message.save();

    res.json({ message: 'Message unsent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;