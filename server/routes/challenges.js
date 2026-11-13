const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const Challenge = require('../models/Challenge');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
const MAX_ACTIVE_PER_USER = 3;
const MAX_DAYS = 90;
const DAY = 24 * 60 * 60 * 1000;

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
      folder: 'creators-hub/challenges',
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

// Reads the login token if there is one, but does not require it
const optionalUserId = (req) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return null;
    return jwt.verify(header.split(' ')[1], process.env.JWT_SECRET).id;
  } catch {
    return null;
  }
};

const isAdmin = async (userId) => {
  const admin = (process.env.ADMIN_USERNAME || '').toLowerCase();
  if (!userId || !admin) return false;
  const user = await User.findById(userId).select('username');
  return !!user && user.username === admin;
};

// Most likes first. If likes are equal, the earlier entry ranks higher.
const rank = (entries) =>
  entries.sort((a, b) => b.likes.length - a.likes.length || a.createdAt - b.createdAt);

// All challenges: open ones first, newest first (anyone can see)
router.get('/', async (req, res) => {
  try {
    const challenges = await Challenge.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('createdBy', 'name username avatar');

    const counts = await Post.aggregate([
      { $match: { challenge: { $in: challenges.map((c) => c._id) } } },
      { $group: { _id: '$challenge', count: { $sum: 1 } } },
    ]);
    const countOf = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const now = new Date();
    const list = challenges.map((c) => ({
      ...c.toObject(),
      active: c.endsAt > now,
      entries: countOf.get(c._id.toString()) || 0,
    }));

    list.sort((a, b) => Number(b.active) - Number(a.active));
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// One challenge with its ranked entries (anyone can see)
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const challenge = await Challenge.findById(req.params.id).populate(
      'createdBy',
      'name username avatar'
    );
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    const entries = await Post.find({ challenge: challenge._id }).populate(
      'user',
      'name username avatar'
    );
    rank(entries);

    const uid = optionalUserId(req);
    const isOwner =
      !!uid && !!challenge.createdBy && challenge.createdBy._id.toString() === uid;
    const canDelete = isOwner || (await isAdmin(uid));

    res.json({
      challenge,
      active: challenge.endsAt > new Date(),
      entries,
      canDelete,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Start a challenge (any logged in user)
router.post('/', auth, handleUpload, async (req, res) => {
  try {
    const title = (req.body.title || '').trim().slice(0, 100);
    const description = (req.body.description || '').trim().slice(0, 500);
    if (!title) return res.status(400).json({ message: 'Give your challenge a title' });

    const endsAt = new Date(req.body.endsAt);
    if (isNaN(endsAt.getTime())) {
      return res.status(400).json({ message: 'End date is not valid' });
    }
    if (endsAt.getTime() <= Date.now()) {
      return res.status(400).json({ message: 'End date must be in the future' });
    }
    if (endsAt.getTime() > Date.now() + MAX_DAYS * DAY) {
      return res.status(400).json({ message: 'A challenge can run for up to 90 days' });
    }

    const open = await Challenge.countDocuments({
      createdBy: req.userId,
      endsAt: { $gt: new Date() },
    });
    if (open >= MAX_ACTIVE_PER_USER) {
      return res.status(400).json({
        message: 'You can run up to ' + MAX_ACTIVE_PER_USER + ' challenges at the same time',
      });
    }

    let mediaUrl = '';
    let mediaType = 'image';
    let publicId = '';

    if (req.file) {
      const isVideo = req.file.mimetype.startsWith('video/');
      const isImage = req.file.mimetype.startsWith('image/');
      if (!isVideo && !isImage) {
        return res.status(400).json({ message: 'Only photos and videos are allowed' });
      }
      if (isImage && req.file.size > MAX_IMAGE) {
        return res.status(400).json({ message: 'Photos can be up to 10 MB' });
      }

      const result = await uploadToCloudinary(req.file.buffer, isVideo ? 'video' : 'image');
      mediaUrl = result.secure_url;
      mediaType = isVideo ? 'video' : 'image';
      publicId = result.public_id;
    }

    const challenge = await Challenge.create({
      title,
      description,
      endsAt,
      createdBy: req.userId,
      mediaUrl,
      mediaType,
      publicId,
    });

    res.status(201).json(challenge);
  } catch (err) {
    console.log('Challenge error:', err.message || err);
    const text = String(err.message || '');

    let message = 'Could not create the challenge. Try again.';
    if (/timeout/i.test(text)) {
      message = 'The upload took too long. Try a shorter video, or export it at 720p.';
    } else if (/size|large/i.test(text)) {
      message = 'The file is too large. Use a shorter video.';
    } else if (/invalid|format|unsupported/i.test(text)) {
      message = 'This video format is not supported. Export it as an MP4.';
    }

    res.status(500).json({ message });
  }
});

// Delete a challenge: the person who started it, or the admin
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    const isOwner = !!challenge.createdBy && challenge.createdBy.toString() === req.userId;
    if (!isOwner && !(await isAdmin(req.userId))) {
      return res.status(403).json({ message: 'You cannot delete this challenge' });
    }

    if (challenge.publicId) {
      try {
        await cloudinary.uploader.destroy(challenge.publicId, {
          resource_type: challenge.mediaType,
        });
      } catch (err) {
        console.log('Challenge file delete error:', err.message);
      }
    }

    // Entries stay as normal posts
    await Post.updateMany({ challenge: challenge._id }, { challenge: null });
    await challenge.deleteOne();

    res.json({ message: 'Challenge deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;