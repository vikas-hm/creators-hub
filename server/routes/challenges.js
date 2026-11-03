const express = require('express');
const Challenge = require('../models/Challenge');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Current challenge with its ranked entries (anyone can see)
router.get('/current', async (req, res) => {
  try {
    const challenge = await Challenge.findOne().sort({ createdAt: -1 });
    if (!challenge) return res.json({ challenge: null });

    const entries = await Post.find({ challenge: challenge._id }).populate(
      'user',
      'name username avatar'
    );

    // Most likes first. If likes are equal, the earlier post ranks higher.
    entries.sort(
      (a, b) => b.likes.length - a.likes.length || a.createdAt - b.createdAt
    );

    res.json({
      challenge,
      active: challenge.endsAt > new Date(),
      entries,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a challenge (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    const admin = (process.env.ADMIN_USERNAME || '').toLowerCase();
    if (!me || !admin || me.username !== admin) {
      return res.status(403).json({ message: 'Only the admin can create challenges' });
    }

    const { title, description, endsAt } = req.body;
    if (!title || !endsAt) {
      return res.status(400).json({ message: 'Title and end date are required' });
    }

    const date = new Date(endsAt);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ message: 'End date is not valid' });
    }

    const challenge = await Challenge.create({ title, description, endsAt: date });
    res.status(201).json(challenge);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Tells the app if the logged in user is the admin
router.get('/is-admin', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    const admin = (process.env.ADMIN_USERNAME || '').toLowerCase();
    res.json({ admin: !!me && !!admin && me.username === admin });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;