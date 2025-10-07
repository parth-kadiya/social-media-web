// server/routes/chats.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const mongoose = require('mongoose');

// Helper: check friendship
async function ensureFriends(meId, friendId) {
  if (!mongoose.Types.ObjectId.isValid(friendId)) return false;
  const me = await User.findById(meId).select('friends');
  if (!me) return false;
  return me.friends.map(f => f.toString()).includes(friendId.toString());
}

// GET /api/chats/list (No changes here, same as before)
router.get('/list', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId).populate('friends', 'firstName lastName username').select('friends');
    if (!me) return res.status(404).json({ message: 'User not found' });

    const friends = me.friends || [];
    const results = await Promise.all(friends.map(async friend => {
      const unreadCount = await Message.countDocuments({ from: friend._id, to: req.userId, read: false });
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

// GET /api/chats/:friendId/messages (*** YAHAN BADLAV HUA HAI ***)
router.get('/:friendId/messages', auth, async (req, res) => {
  try {
    const friendId = req.params.friendId;
    if (!await ensureFriends(req.userId, friendId)) {
      return res.status(403).json({ message: 'You can only fetch chats with your friends' });
    }

    // 1. Pehla unread message dhoondhein
    const firstUnread = await Message.findOne({
        from: friendId,
        to: req.userId,
        read: false
    }).sort({ createdAt: 1 });

    const firstUnreadId = firstUnread ? firstUnread._id : null;

    // 2. Saare unread messages ko read mark karein
    await Message.updateMany({ from: friendId, to: req.userId, read: false }, { $set: { read: true } });

    // 3. Saare messages fetch karein
    const msgs = await Message.find({
      $or: [
        { from: req.userId, to: friendId },
        { from: friendId, to: req.userId }
      ]
    }).sort({ createdAt: 1 }).lean();

    // 4. Messages ke saath firstUnreadId bhi bhejein
    res.json({ messages: msgs, firstUnreadId: firstUnreadId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chats/:friendId/message (No changes here, same as before)
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

    const populated = await Message.findById(msg._id).lean();
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;