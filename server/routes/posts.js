const express = require('express');
const multer = require('multer');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const auth = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO },
});

const handleUpload = (req, res, next) => {
  upload.single('media')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File is too big. Photos can be up to 10 MB and videos up to 50 MB.'
          : 'Upload error';
      return res.status(400).json({ message });
    }
    next();
  });
};

const uploadToCloudinary = (buffer, resourceType) =>
  new Promise((resolve, reject) => {
    const options = {
      folder: 'creators-hub',
      resource_type: resourceType,
      timeout: 300000,
    };
    const done = (err, result) => (err ? reject(err) : resolve(result));

    const stream =
      resourceType === 'video'
        ? cloudinary.uploader.upload_large_stream(null, done, {
            ...options,
            chunk_size: 6000000,
          })
        : cloudinary.uploader.upload_stream(options, done);

    stream.end(buffer);
  });

// Create a post with a photo or video (login needed)
router.post('/', auth, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Choose a photo or a video' });
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    const isImage = req.file.mimetype.startsWith('image/');

    if (!isVideo && !isImage) {
      return res.status(400).json({ message: 'Only photos and videos are allowed' });
    }
    if (isImage && req.file.size > MAX_IMAGE) {
      return res.status(400).json({ message: 'Photos can be up to 10 MB' });
    }

    const result = await uploadToCloudinary(req.file.buffer, isVideo ? 'video' : 'image');

    const post = await Post.create({
      user: req.userId,
      imageUrl: result.secure_url,
      mediaType: isVideo ? 'video' : 'image',
      caption: (req.body.caption || '').slice(0, 500),
    });

    res.status(201).json(post);
  } catch (err) {
    console.log('Upload error:', err.message);
    res.status(500).json({ message: 'Upload failed. Check your Cloudinary keys.' });
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

// All posts of one user (anyone can see)
router.get('/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
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

// Add a comment (login needed)
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({ post: post._id, user: req.userId, text });
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// See all comments of a post (anyone can see)
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: -1 })
      .populate('user', 'name username avatar');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reels: only video posts, newest first (anyone can see)
router.get('/reels', async (req, res) => {
  try {
    const posts = await Post.find({ mediaType: 'video' })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('user', 'name username avatar');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;