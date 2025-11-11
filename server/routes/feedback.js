const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Feedback = require('../models/Feedback');

// POST /api/feedback
// Submit user feedback (problem or suggestion)
router.post('/', auth, async (req, res) => {
  try {
    const { type, message } = req.body;

    if (!['problem', 'suggestion'].includes(type)) {
      return res.status(400).json({ message: 'Invalid feedback type' });
    }
    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const newFeedback = new Feedback({
      user: req.userId,
      type: type,
      message: message.trim()
    });

    await newFeedback.save();

    res.status(201).json({ message: 'Feedback submitted successfully. Thank you!' });

  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;