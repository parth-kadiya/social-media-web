// server/routes/chats.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const mongoose = require('mongoose');

// Helper: check friendship (ensure friendId is in my friends array)
async function ensureFriends(meId, friendId) {
  if (!mongoose.Types.ObjectId.isValid(friendId)) return false;
  const me = await User.findById(meId).select('friends');
  if (!me) return false;
  return me.friends.map(f => f.toString()).includes(friendId.toString());
}

/**
 * GET /api/chats/list
 * Returns my friends (populated basic info) with unreadCount for each friend
 * Response: [ { _id, firstName, lastName, username, unreadCount, lastMessageSnippet, lastMessageAt } ]
 */
router.get('/list', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId).populate('friends', 'firstName lastName username').select('friends');
    if (!me) return res.status(404).json({ message: 'User not found' });

    // map friends
    const friends = me.friends || [];

    // For performance, we'll fetch unread counts in parallel
    const results = await Promise.all(friends.map(async friend => {
      const unreadCount = await Message.countDocuments({ from: friend._id, to: req.userId, read: false });
      // last message between pair (optional snippet)
      const lastMsg = await Message.findOne({
        $or: [
          { from: req.userId, to: friend._id },
          { from: friend._id, to: req.userId }
        ]
      }).sort({ createdAt: -1 }).lean();
      return {
        _id: friend._id,
        firstName: friend.firstName,
        lastName: friend.lastName,
        username: friend.username,
        unreadCount,
        lastMessageSnippet: lastMsg ? (lastMsg.text.length > 120 ? lastMsg.text.slice(0, 120) + '...' : lastMsg.text) : '',
        lastMessageAt: lastMsg ? lastMsg.createdAt : null
      };
    }));

    // sort by lastMessageAt desc (optional)
    results.sort((a,b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/chats/:friendId/messages
 * Returns all messages between me and friend sorted asc by createdAt.
 * Also marks messages FROM friend TO me as read = true.
 */
router.get('/:friendId/messages', auth, async (req, res) => {
  try {
    const friendId = req.params.friendId;
    if (!await ensureFriends(req.userId, friendId)) {
      return res.status(403).json({ message: 'You can only fetch chats with your friends' });
    }

    // mark unread from friend -> me as read
    await Message.updateMany({ from: friendId, to: req.userId, read: false }, { $set: { read: true } });

    const msgs = await Message.find({
      $or: [
        { from: req.userId, to: friendId },
        { from: friendId, to: req.userId }
      ]
    }).sort({ createdAt: 1 }).lean();

    res.json(msgs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/chats/:friendId/message
 * Body: { text }
 * Send a message to friend (only if friend). Returns saved message.
 */
router.post('/:friendId/message', auth, async (req, res) => {
  try {
    const friendId = req.params.friendId;
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'Message text required' });
    }

    if (!await ensureFriends(req.userId, friendId)) {
      return res.status(403).json({ message: 'You can only message your friends' });
    }

    const msg = new Message({
      from: req.userId,
      to: friendId,
      text: text.trim()
    });
    await msg.save();

    // return populated minimal object
    const populated = await Message.findById(msg._id).lean();
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
