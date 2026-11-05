const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const notify = require('../utils/notify');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const handleAvatar = (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'Photo can be up to 5 MB' : 'Upload error';
      return res.status(400).json({ message });
    }
    next();
  });
};

const uploadAvatar = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'creators-hub/avatars',
        resource_type: 'image',
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'auto' }],
        timeout: 60000,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

// Search users by name or username (login needed). Keep above /:username
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      $or: [
        { username: { $regex: safe, $options: 'i' } },
        { name: { $regex: safe, $options: 'i' } },
      ],
    })
      .select('name username avatar bio')
      .limit(20);

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// People I follow and people who follow me (for the share box). Keep above /:username
router.get('/connections', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId)
      .populate('following', 'name username avatar')
      .populate('followers', 'name username avatar');
    if (!me) return res.status(404).json({ message: 'User not found' });

    const map = new Map();
    [...me.following, ...me.followers].forEach((u) => {
      if (u && !map.has(u._id.toString())) map.set(u._id.toString(), u);
    });

    res.json([...map.values()].slice(0, 40));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

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

// Update my name and bio (login needed)
router.put('/me', auth, async (req, res) => {
  try {
    const update = {};

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: 'Name cannot be empty' });
      update.name = name.slice(0, 50);
    }
    if (req.body.bio !== undefined) {
      update.bio = String(req.body.bio).trim().slice(0, 150);
    }

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select(
      '-password'
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload or change my profile photo (login needed)
router.post('/me/avatar', auth, handleAvatar, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose a photo' });
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Only photos are allowed' });
    }

    const old = await User.findById(req.userId);
    if (!old) return res.status(404).json({ message: 'User not found' });

    const result = await uploadAvatar(req.file.buffer);
    if (!result || !result.secure_url) {
      return res.status(500).json({ message: 'Upload failed. Try again.' });
    }

    if (old.avatarId) {
      try {
        await cloudinary.uploader.destroy(old.avatarId);
      } catch (err) {
        console.log('Old avatar delete error:', err.message);
      }
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatar: result.secure_url, avatarId: result.public_id },
      { new: true }
    ).select('-password');

    console.log('Avatar saved for', user.username, user.avatar);
    res.json({ avatar: user.avatar });
  } catch (err) {
    console.log('Avatar error:', err.message);
    res.status(500).json({ message: 'Upload failed. Try again.' });
  }
});

// Remove my profile photo (login needed)
router.delete('/me/avatar', auth, async (req, res) => {
  try {
    const old = await User.findById(req.userId);
    if (!old) return res.status(404).json({ message: 'User not found' });

    if (old.avatarId) {
      try {
        await cloudinary.uploader.destroy(old.avatarId);
      } catch (err) {
        console.log('Avatar delete error:', err.message);
      }
    }

    await User.findByIdAndUpdate(req.userId, { avatar: '', avatarId: '' });
    res.json({ avatar: '' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Change my password (login needed)
router.post('/me/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: 'Current password is wrong' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete my account for good (login needed, password required)
router.delete('/me', auth, async (req, res) => {
  try {
    const password = req.body && req.body.password;
    if (!password) return res.status(400).json({ message: 'Enter your password' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Password is wrong' });

    const me = user._id;

    // 1. My posts: remove their files from Cloudinary
    const myPosts = await Post.find({ user: me }).select('publicId mediaType');
    await Promise.allSettled(
      myPosts
        .filter((p) => p.publicId)
        .map((p) => cloudinary.uploader.destroy(p.publicId, { resource_type: p.mediaType }))
    );
    const postIds = myPosts.map((p) => p._id);

    // 2. Comments on my posts, my own comments, and replies to my comments
    const myComments = await Comment.find({ user: me }).select('_id');
    const myCommentIds = myComments.map((c) => c._id);

    await Comment.deleteMany({
      $or: [
        { post: { $in: postIds } },
        { user: me },
        { parent: { $in: myCommentIds } },
      ],
    });
    await Post.deleteMany({ user: me });

    // 3. My likes on other posts and comments
    await Post.updateMany({ likes: me }, { $pull: { likes: me } });
    await Comment.updateMany({ likes: me }, { $pull: { likes: me } });

    // 4. Follow links in both directions
    await User.updateMany({ followers: me }, { $pull: { followers: me } });
    await User.updateMany({ following: me }, { $pull: { following: me } });

    // 5. Notifications and messages
    await Notification.deleteMany({
      $or: [
        { sender: me },
        { recipient: me },
        { post: { $in: postIds } },
        { comment: { $in: myCommentIds } },
      ],
    });
    await Message.deleteMany({ $or: [{ sender: me }, { recipient: me }] });

    // 6. My profile photo, then the account itself
    if (user.avatarId) {
      try {
        await cloudinary.uploader.destroy(user.avatarId);
      } catch (err) {
        console.log('Avatar delete error:', err.message);
      }
    }

    await user.deleteOne();
    console.log('Account deleted:', user.username);

    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.log('Delete account error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Anyone can see a public profile
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() }).select(
      '-password -email'
    );
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