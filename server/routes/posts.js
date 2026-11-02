const express = require('express');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a post (login needed)
router.post('/', auth, async (req, res) => {
  try {
    const { imageUrl, caption } = req.body;
    if (!imageUrl) return res.status(400).json({ message: 'Image is required' });

    const post = await Post.create({ user: req.userId, imageUrl, caption });
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Feed: newest posts first (anyone can see)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name username avatar');

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Like or unlike a post (login needed)
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const index = post.likes.findIndex((id) => id.toString() === req.userId);
    if (index === -1) {
      post.likes.push(req.userId);
    } else {
      post.likes.splice(index, 1);
    }
    await post.save();

    res.json({ likes: post.likes.length, liked: index === -1 });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete my own post (login needed)
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'You can delete only your own post' });
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;