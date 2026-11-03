const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const notify = require('../utils/notify');
const router = express.Router();

// Get my profile (login needed)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update my profile (login needed)
router.put('/me', auth, async (req, res) => {
  try {
    const update = {};
    if (req.body.name) update.name = req.body.name;
    if (req.body.bio !== undefined) update.bio = req.body.bio;
    if (req.body.avatar !== undefined) update.avatar = req.body.avatar;

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Anyone can see a public profile
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() }).select('-password -email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow or unfollow a user (login needed)
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;

    if (targetId === req.userId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const me = await User.findById(req.userId);
    const alreadyFollowing = me.following.some((id) => id.toString() === targetId);

    if (alreadyFollowing) {
      await User.findByIdAndUpdate(req.userId, { $pull: { following: targetId } });
      await User.findByIdAndUpdate(targetId, { $pull: { followers: req.userId } });
    } else {
      await User.findByIdAndUpdate(req.userId, { $addToSet: { following: targetId } });
      await User.findByIdAndUpdate(targetId, { $addToSet: { followers: req.userId } });
    }
    if (!alreadyFollowing) {
      await notify({ recipient: targetId, sender: req.userId, type: 'follow' });
    }
    res.json({ following: !alreadyFollowing });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;