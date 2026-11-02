const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = router;