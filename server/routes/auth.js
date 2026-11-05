const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/mailer');

const router = express.Router();

const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const userData = (u) => ({
  id: u._id,
  name: u.name,
  username: u.username,
  email: u.email,
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    if (exists) {
      return res.status(400).json({ message: 'Email or username already used' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, username, email, password: hashed });

    res.status(201).json({ token: makeToken(user._id), user: userData(user) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password || '', user.password);
    if (!ok) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    res.json({ token: makeToken(user._id), user: userData(user) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

const SENT_MESSAGE =
  'If this email is registered, a 6-digit code has been sent. It is valid for 10 minutes.';

// Forgot password: send a 6-digit code to the email
router.post('/forgot-password', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Enter your email' });

    const user = await User.findOne({ email }).select('+resetSentAt');

    if (user) {
      const recently =
        user.resetSentAt && Date.now() - user.resetSentAt.getTime() < 60 * 1000;

      if (!recently) {
        const otp = String(crypto.randomInt(100000, 1000000));

        user.resetOtp = await bcrypt.hash(otp, 8);
        user.resetExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.resetAttempts = 0;
        user.resetSentAt = new Date();
        await user.save();

        try {
          await sendOtpEmail(user.email, otp);
        } catch (err) {
          console.log('Email error:', err.message);
        }
      }
    }

    // Same answer for every email, so nobody can find out who has an account
    res.json({ message: SENT_MESSAGE });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password with the code
router.post('/reset-password', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();
    const newPassword = req.body.newPassword || '';

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email }).select(
      '+resetOtp +resetExpires +resetAttempts +resetSentAt'
    );

    const invalid = { message: 'Invalid or expired code' };

    if (!user || !user.resetOtp || !user.resetExpires || user.resetExpires < new Date()) {
      return res.status(400).json(invalid);
    }
    if (user.resetAttempts >= 5) {
      return res.status(400).json({ message: 'Too many wrong tries. Ask for a new code.' });
    }

    const ok = await bcrypt.compare(otp, user.resetOtp);
    if (!ok) {
      user.resetAttempts += 1;
      await user.save();
      return res.status(400).json(invalid);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = '';
    user.resetExpires = undefined;
    user.resetAttempts = 0;
    user.resetSentAt = undefined;
    await user.save();

    res.json({ message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;