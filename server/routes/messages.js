const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

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

// Number of unread messages (for the top bar)
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({ recipient: req.userId, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// My chats, newest first
router.get('/conversations', auth, async (req, res) => {
  try {
    const me = req.userId;
    const msgs = await Message.find({ $or: [{ sender: me }, { recipient: me }] })
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
          last: { text: m.text, hasPost: !!m.post, mine, createdAt: m.createdAt },
          unread: 0,
        });
      }
      if (!mine && !m.read) map.get(key).unread += 1;
    }

    res.json([...map.values()]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Messages between me and one user. Also marks their messages as read.
router.get('/with/:username', auth, async (req, res) => {
  try {
    const other = await User.findOne({ username: req.params.username.toLowerCase() }).select(
      'name username avatar'
    );
    if (!other) return res.status(404).json({ message: 'User not found' });

    const messages = await Message.find({
      $or: [
        { sender: req.userId, recipient: other._id },
        { sender: other._id, recipient: req.userId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate({
        path: 'post',
        select: 'imageUrl mediaType caption user',
        populate: { path: 'user', select: 'username' },
      });

    await Message.updateMany(
      { sender: other._id, recipient: req.userId, read: false },
      { read: true }
    );

    res.json({ user: other, messages });
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

module.exports = router;