const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('../models/User');

// signup
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, mobile, email, username, password, confirmPassword } = req.body;
    if (!firstName || !lastName || !mobile || !email || !username || !password || !confirmPassword) 
      return res.status(400).json({ message: 'All fields required' });

    if (password !== confirmPassword) return res.status(400).json({ message: 'Password mismatch' });

    // disallow capitals in username
    if (username !== username.toLowerCase()) 
      return res.status(400).json({ message: 'Username must be lowercase (no capital letters)' });

    // validate username allowed characters (lowercase, digits, @, ., _, -)
    const usernameRegex = /^[a-z0-9@._-]+$/;
    if (!usernameRegex.test(username)) return res.status(400).json({ message: 'Invalid characters in username' });

    // check unique username
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username is already taken' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ firstName, lastName, mobile, email, username, password: hashed });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, firstName: user.firstName, lastName: user.lastName } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// login using mobile or email
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = mobile or email
    if (!identifier || !password) return res.status(400).json({ message: 'All fields required' });

    let user;
    if (identifier.includes('@')) user = await User.findOne({ email: identifier });
    else user = await User.findOne({ mobile: identifier });

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, firstName: user.firstName, lastName: user.lastName } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
