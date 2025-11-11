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
   const me = await User.findById(req.userId)
     .populate('friends', 'firstName lastName username profilePictureUrl')
     .select('friends');

   if (!me) return res.status(404).json({ message: 'User not found' });

   const friends = me.friends || [];

   const results = await Promise.all(friends.map(async friend => {
     if (!friend) return null; // Handle case where friend might be null after deletion
     const unreadCount = await Message.countDocuments({ from: friend._id, to: req.userId, read: false });
     return {
       _id: friend._id,
       firstName: friend.firstName,
       lastName: friend.lastName,
       username: friend.username,
       profilePictureUrl: friend.profilePictureUrl,
       unreadCount
     };
   }));

   // Filter out any null results if a friend was deleted but still in the list somehow
   res.json(results.filter(friend => friend !== null));
 } catch (err) {
   console.error('GET /api/chats/list error:', err);
   res.status(500).json({ message: 'Server error' });
 }
});

/**
 * GET /api/chats/:friendId/messages
 * Fetch chat messages between current user and friend.
 * NOTE: Does NOT mark messages as read anymore.
 */
router.get('/:friendId/messages', auth, async (req, res) => {
 try {
   const friendId = req.params.friendId;
   const myUserId = req.userId;

   if (!await ensureFriends(myUserId, friendId)) {
     return res.status(403).json({ message: 'You can only fetch chats with your friends' });
   }

   // --- LOGIC REMOVED ---
   // Pehle yahan updateMany aur event emit hota tha, ab nahi hoga.
   // const updateResult = await Message.updateMany(...)
   // if (updateResult.modifiedCount > 0) { /* emit logic */ }
   // --- END REMOVED LOGIC ---

   // Sirf first unread ID find karo (scrolling ke liye, optional)
   const firstUnread = await Message.findOne({ from: friendId, to: myUserId, read: false }).sort({ createdAt: 1 });
   const firstUnreadId = firstUnread ? firstUnread._id : null;

   // Chat ke saare messages fetch karo
   const msgs = await Message.find({
     $or: [{ from: myUserId, to: friendId }, { from: friendId, to: myUserId }]
   }).sort({ createdAt: 1 }).lean();

   // Response bhejo
   res.json({ messages: msgs, firstUnreadId: firstUnreadId });

 } catch (err) {
   console.error('GET /api/chats/:friendId/messages error:', err);
   res.status(500).json({ message: 'Server error' });
 }
});

/**
 * POST /api/chats/:friendId/mark-read
 * Mark messages from friendId as read and emit 'messages-seen' event.
 */
router.post('/:friendId/mark-read', auth, async (req, res) => {
 try {
   const friendId = req.params.friendId; // Yeh woh friend hai jiske messages humne dekhe (sender)
   const myUserId = req.userId; // Yeh hum hain (reader)

   if (!await ensureFriends(myUserId, friendId)) {
     return res.status(403).json({ message: 'Cannot mark read for non-friend' });
   }

   // Friend se aaye hue sabhi unread messages ko read mark karo
   const updateResult = await Message.updateMany(
     { from: friendId, to: myUserId, read: false },
     { $set: { read: true } }
   );

   // Agar koi message update hua hai (matlab kuch unread tha jo ab read hua)
   if (updateResult.modifiedCount > 0) {
     console.log(`Marked ${updateResult.modifiedCount} messages as read from ${friendId} for ${myUserId}.`);
     try {
       const { io, userSocketMap } = req; // io aur map ko request se access karo
       const friendSocketIds = userSocketMap ? userSocketMap[friendId] : null; // Friend ke socket IDs

       if (friendSocketIds && friendSocketIds instanceof Set && friendSocketIds.size > 0) {
         // Friend ke sabhi connected devices/tabs ko event bhejo
         friendSocketIds.forEach(socketId => {
           io.to(socketId).emit('messages-seen', {
             readerId: myUserId, // Bataya ki kisne messages dekhe (humne)
             senderId: friendId // Kiske messages dekhe gaye (friend ke)
           });
         });
         console.log(`Emitted 'messages-seen' to user ${friendId} after marking messages read.`);
       } else {
         console.log(`User ${friendId} is not connected. Cannot emit 'messages-seen'.`);
       }
     } catch (emitError) {
       console.error("Error emitting 'messages-seen' from mark-read:", emitError);
     }
     // Respond immediately, don't wait for socket emission
     res.json({ ok: true, markedReadCount: updateResult.modifiedCount });
   } else {
     // Koi message update nahi hua (ya toh sab pehle se read the ya koi message tha hi nahi)
     console.log(`No new messages to mark as read from ${friendId} for ${myUserId}.`);
     res.json({ ok: true, markedReadCount: 0 });
   }

 } catch (err) {
   console.error('POST /api/chats/:friendId/mark-read error:', err);
   res.status(500).json({ message: 'Server error marking messages as read' });
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
     // `read` will be false by default
   });
   await msg.save();

   const populatedMsg = await Message.findById(msg._id).lean();

   // Socket logic: Emit 'receive-message' to the recipient
   try {
     const { io, userSocketMap } = req;
     const receiverEntry = userSocketMap ? userSocketMap[friendId] : null;

     if (receiverEntry && receiverEntry instanceof Set && receiverEntry.size > 0) {
       receiverEntry.forEach(sid => {
         io.to(sid).emit('receive-message', populatedMsg);
       });
       console.log(`Emitted 'receive-message' for message ${msg._id} to user ${friendId}`);
     } else {
         console.log(`User ${friendId} not connected. Cannot emit 'receive-message' in real-time.`);
     }
   } catch (emitErr) {
     console.error('Error emitting receive-message via sockets:', emitErr);
   }

   res.status(201).json(populatedMsg);
 } catch (err) {
   console.error('POST /api/chats/:friendId/message error:', err);
   res.status(500).json({ message: 'Server error sending message' });
 }
});

module.exports = router;