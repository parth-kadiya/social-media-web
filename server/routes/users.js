const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// Helper: convert ObjectId to string for comparisons
const idStr = (id) => id ? id.toString() : null;

// get other users (to show list for "Add friend")
// Excludes: self, already friends, users with pending friend-requests involving me (either direction)
router.get('/others', auth, async (req, res) => {
  try {
    const meId = req.userId;

    // load my user to get friends
    const me = await User.findById(meId).select('friends');
    const friends = (me && me.friends) ? me.friends.map(id => id.toString()) : [];

    // find pending friend requests where me is either sender or receiver
    const pendings = await FriendRequest.find({
      $or: [{ from: meId }, { to: meId }],
      status: 'pending'
    }).select('from to');

    const pendingIdsSet = new Set();
    pendings.forEach(p => {
      if (p.from) pendingIdsSet.add(p.from.toString());
      if (p.to) pendingIdsSet.add(p.to.toString());
    });

    // build exclusion array: me + friends + pending involved
    const exclude = new Set([meId.toString(), ...friends, ...Array.from(pendingIdsSet)]);

    // query users not in exclude
    const others = await User.find({ _id: { $nin: Array.from(exclude) } }).select('firstName lastName username createdAt');
    res.json(others);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// send friend request
router.post('/friend-request', auth, async (req, res) => {
  try {
    const fromId = req.userId;
    const { toUserId } = req.body;
    if (!toUserId) return res.status(400).json({ message: 'toUserId required' });
    if (toUserId.toString() === fromId.toString()) return res.status(400).json({ message: 'Cannot send request to yourself' });

    // check users exist
    const toUser = await User.findById(toUserId).select('_id');
    if (!toUser) return res.status(404).json({ message: 'User not found' });

    // check already friends
    const me = await User.findById(fromId).select('friends');
    if (me.friends.map(f => f.toString()).includes(toUserId.toString())) {
      return res.status(400).json({ message: 'User already your friend' });
    }

    // check existing pending request either direction
    const existing = await FriendRequest.findOne({
      $or: [
        { from: fromId, to: toUserId },
        { from: toUserId, to: fromId }
      ],
      status: 'pending'
    });

    if (existing) return res.status(400).json({ message: 'There is already a pending request between you and this user' });

    const fr = new FriendRequest({ from: fromId, to: toUserId });
    await fr.save();
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get incoming friend requests
router.get('/friend-requests', auth, async (req, res) => {
 try {
  let requests = await FriendRequest.find({ to: req.userId, status: 'pending' })
   .populate('from', 'firstName lastName username');

  // ADD THIS LINE: Yeh unn requests ko filter kar dega jinka 'from' user delete ho chuka hai
  requests = requests.filter(request => request.from !== null);

  res.json(requests);
 } catch (err) {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
 }
});

// respond to friend request (accept/reject)
router.post('/friend-requests/respond', auth, async (req, res) => {
  try {
    const { requestId, action } = req.body; // action: 'accept' or 'reject'
    if (!requestId || !['accept','reject'].includes(action)) return res.status(400).json({ message: 'Invalid' });

    const fr = await FriendRequest.findById(requestId);
    if (!fr) return res.status(404).json({ message: 'Request not found' });
    if (fr.to.toString() !== req.userId) return res.status(403).json({ message: 'Not authorized' });
    if (fr.status !== 'pending') return res.status(400).json({ message: 'Request already handled' });

    fr.status = action === 'accept' ? 'accepted' : 'rejected';
    await fr.save();

    if (action === 'accept') {
      const UserModel = require('../models/User');
      // add each other to friends arrays
      await UserModel.findByIdAndUpdate(fr.from, { $addToSet: { friends: fr.to } });
      await UserModel.findByIdAndUpdate(fr.to,   { $addToSet: { friends: fr.from } });
    }

    res.json({ message: `Request ${fr.status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get my friends list (populated)
router.get('/friends', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId).populate('friends', 'firstName lastName username');
    if (!me) return res.status(404).json({ message: 'User not found' });
    res.json(me.friends || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------
   NEW: remove friend
   POST /api/users/remove-friend
   body: { friendId }
   removes each other from friends arrays
   --------------------------- */
router.post('/remove-friend', auth, async (req, res) => {
  try {
    const { friendId } = req.body;
    if (!friendId) return res.status(400).json({ message: 'friendId required' });

    const me = await User.findById(req.userId).select('friends');
    if (!me) return res.status(404).json({ message: 'User not found' });

    const isFriend = me.friends.map(f => f.toString()).includes(friendId.toString());
    if (!isFriend) return res.status(400).json({ message: 'This user is not in your friends list' });

    // remove each other from friends array
    await User.findByIdAndUpdate(req.userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: req.userId } });

    res.json({ message: 'Friend removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------
   GET /api/users/me
   returns profile
   --------------------------- */
router.get('/me', auth, async (req, res) => {
  try {
    // include username here
    const me = await User.findById(req.userId).select('firstName lastName mobile email username');
    if (!me) return res.status(404).json({ message: 'User not found' });
    res.json(me);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------
   PUT /api/users/me
   update profile (now supports username update with validation + uniqueness)
   --------------------------- */
router.put('/me', auth, async (req, res) => {
  try {
    const { firstName, lastName, mobile, email, username } = req.body;

    if (!firstName || !lastName || !mobile || !email || !username) {
      return res.status(400).json({ message: 'All fields required including username' });
    }

    // username validations (same as registration)
    if (username !== username.toLowerCase()) {
      return res.status(400).json({ message: 'Username must be lowercase (no capital letters)' });
    }
    const usernameRegex = /^[a-z0-9@._-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: 'Invalid characters in username' });
    }

    // check uniqueness excluding current user
    const existing = await User.findOne({ username });
    if (existing && existing._id.toString() !== req.userId) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const updated = await User.findByIdAndUpdate(
      req.userId,
      { firstName, lastName, mobile, email, username },
      { new: true, runValidators: true, context: 'query' }
    ).select('firstName lastName mobile email username');

    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    // handle duplicate-key error (race condition)
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Username is already taken' });
    }
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

/* ---------------------------
   NEW: GET /api/users/notifications
   returns { newUsersCount, friendRequestsCount }
   newUsersCount = number of OTHER users (not friend / not pending / not self) added after lastSeenSuggestionsAt
   friendRequestsCount = number of pending friend requests created after lastSeenFriendRequestsAt
   --------------------------- */
router.get('/notifications', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId).select('friends lastSeenSuggestionsAt lastSeenFriendRequestsAt');
    if (!me) return res.status(404).json({ message: 'User not found' });

    const friends = (me.friends || []).map(f => f.toString());
    const exclude = new Set([req.userId.toString(), ...friends]);

    // pending ids (either direction) should also be excluded from suggestion counts
    const pendings = await FriendRequest.find({
      $or: [{ from: req.userId }, { to: req.userId }],
      status: 'pending'
    }).select('from to');
    pendings.forEach(p => {
      if (p.from) exclude.add(p.from.toString());
      if (p.to) exclude.add(p.to.toString());
    });

    const sinceSuggestions = me.lastSeenSuggestionsAt || new Date(0);
    const newUsersCount = await User.countDocuments({
      _id: { $nin: Array.from(exclude) },
      createdAt: { $gt: sinceSuggestions }
    });

    const sinceRequests = me.lastSeenFriendRequestsAt || new Date(0);
    const friendRequestsCount = await FriendRequest.countDocuments({
      to: req.userId,
      status: 'pending',
      createdAt: { $gt: sinceRequests }
    });

    res.json({ newUsersCount, friendRequestsCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------
   NEW: POST /api/users/mark-suggestions-seen
   sets lastSeenSuggestionsAt = now
   --------------------------- */
router.post('/mark-suggestions-seen', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { lastSeenSuggestionsAt: new Date() });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------
   NEW: POST /api/users/mark-requests-seen
   sets lastSeenFriendRequestsAt = now
   --------------------------- */
router.post('/mark-requests-seen', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { lastSeenFriendRequestsAt: new Date() });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/me', auth, async (req, res) => {
 try {
  const user = await User.findById(req.userId);
  if (!user) {
  
   return res.status(404).json({ message: 'User not found' });
  }

  // .deleteOne() trigger karega middleware ko jo humne User model me banaya hai
  await user.deleteOne();

  res.json({ message: 'Aapka account aur usse juda saara data safaltapoorvak delete kar diya gaya hai.' });
 } catch (err) {
  console.error(err);
  res.status(500).json({ message: 'Account delete karte samay server mein error aayi.' });
 }
});

module.exports = router;
