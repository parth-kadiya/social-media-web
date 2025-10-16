// server/routes/chats.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const mongoose = require('mongoose');

/**
 * Helper: check valid ObjectId and that 'friendId' is in user's friends list
 */
async function ensureFriends(meId, friendId) {
  if (!mongoose.Types.ObjectId.isValid(friendId)) return false;
  const me = await User.findById(meId).select('friends');
  if (!me) return false;
  return me.friends.map(f => f.toString()).includes(friendId.toString());
}

/**
 * GET /api/chats/list
 * Return list of friends with unread counts
 */
router.get('/list', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId).populate('friends', 'firstName lastName username').select('friends');
    if (!me) return res.status(404).json({ message: 'User not found' });

    const friends = me.friends || [];

    const results = await Promise.all(friends.map(async friend => {
      const unreadCount = await Message.countDocuments({ from: friend._id, to: req.userId, read: false });
      return {
        _id: friend._id,
        firstName: friend.firstName,
        lastName: friend.lastName,
        username: friend.username,
        unreadCount
      };
    }));

    res.json(results);
  } catch (err) {
    console.error('GET /api/chats/list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/chats/:friendId/messages
 * Fetch chat messages between current user and friend, mark incoming as read and return firstUnreadId
 */
router.get('/:friendId/messages', auth, async (req, res) => {
  try {
    const friendId = req.params.friendId;
    if (!await ensureFriends(req.userId, friendId)) {
      return res.status(403).json({ message: 'You can only fetch chats with your friends' });
    }

    const firstUnread = await Message.findOne({ from: friendId, to: req.userId, read: false }).sort({ createdAt: 1 });
    const firstUnreadId = firstUnread ? firstUnread._id : null;

    await Message.updateMany({ from: friendId, to: req.userId, read: false }, { $set: { read: true } });

    const msgs = await Message.find({
      $or: [{ from: req.userId, to: friendId }, { from: friendId, to: req.userId }]
    }).sort({ createdAt: 1 }).lean();

    res.json({ messages: msgs, firstUnreadId: firstUnreadId });
  } catch (err) {
    console.error('GET /api/chats/:friendId/messages error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/chats/:friendId/message
 * Save message to DB and emit to friend's connected sockets (if any)
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

    // Get a lean copy (no mongoose methods)
    const populatedMsg = await Message.findById(msg._id).lean();

    // Socket logic: emit to all sockets for the receiver (support Set / array / single id)
    try {
      const { io, userSocketMap } = req;
      const receiverEntry = userSocketMap ? userSocketMap[friendId] : null;

      if (receiverEntry) {
        // If receiverEntry is a Set (recommended)
        if (receiverEntry instanceof Set) {
          for (const sid of Array.from(receiverEntry)) {
            io.to(sid).emit('receive-message', populatedMsg);
          }
        } else if (Array.isArray(receiverEntry)) {
          receiverEntry.forEach(sid => io.to(sid).emit('receive-message', populatedMsg));
        } else if (typeof receiverEntry === 'string') {
          io.to(receiverEntry).emit('receive-message', populatedMsg);
        } else {
          // fallback: try to iterate keys (object)
          try {
            for (const sid of Object.values(receiverEntry)) {
              if (sid) io.to(sid).emit('receive-message', populatedMsg);
            }
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (emitErr) {
      console.error('Error emitting message via sockets:', emitErr);
      // do not fail the request; message saved to DB regardless
    }

    res.status(201).json(populatedMsg);
  } catch (err) {
    console.error('POST /api/chats/:friendId/message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
