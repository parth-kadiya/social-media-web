const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const { uploadProfilePic } = require('../middleware/upload');
const bcrypt = require('bcryptjs');

// Helper: convert ObjectId to string for comparisons
const idStr = (id) => id ? id.toString() : null;

router.post('/me/profile-picture', auth, uploadProfilePic.single('profilePic'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Image file required' });
        }
        // Update user with the Cloudinary URL
        const user = await User.findByIdAndUpdate(
            req.userId,
            { profilePictureUrl: req.file.path },
            { new: true } // Return the updated document
        ).select('-password'); // Don't send password back

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Send back the updated user object (includes the new URL)
        res.json({ user });
    } catch (err) {
        console.error('Profile pic upload error:', err);
        res.status(500).json({ message: err.message || 'Server error uploading profile picture' });
    }
});

router.delete('/me/profile-picture', auth, async (req, res) => {
    try {
         // Find user and set profilePictureUrl to null
        const user = await User.findByIdAndUpdate(
            req.userId,
            { profilePictureUrl: null },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Optional: Delete from Cloudinary (requires more setup)

        // Send back the updated user object
        res.json({ user });
    } catch (err) {
        console.error('Profile pic removal error:', err);
        res.status(500).json({ message: 'Server error removing profile picture' });
    }
});

// get other users (to show list for "Add friend")
// Excludes: self, already friends, users with pending friend-requests involving me (either direction)
router.get('/others', auth, async (req, res) => {
  try {
    const meId = req.userId;
    const me = await User.findById(meId).select('friends');
    const friends = (me && me.friends) ? me.friends.map(id => id.toString()) : [];
    const pendings = await FriendRequest.find({ $or: [{ from: meId }, { to: meId }], status: 'pending' }).select('from to');
    const pendingIdsSet = new Set();
    pendings.forEach(p => {
      if (p.from) pendingIdsSet.add(p.from.toString());
      if (p.to) pendingIdsSet.add(p.to.toString());
    });
    const exclude = new Set([meId.toString(), ...friends, ...Array.from(pendingIdsSet)]);

    // Query users not in exclude, ADD profilePictureUrl to select
    const others = await User.find({ _id: { $nin: Array.from(exclude) } })
        .select('firstName lastName username createdAt profilePictureUrl'); // <-- SELECT is correct

    // --- CORRECTION ---
    // res.json(others); // <<<--- YEH DUPLICATE LINE HATA DEIN
    res.json(others); // Yeh line rehne dein
    // --- END CORRECTION ---

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
     .populate('from', 'firstName lastName username profilePictureUrl');

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
        const me = await User.findById(req.userId)
            // Add profilePictureUrl to the fields populated for friends
            .populate('friends', 'firstName lastName username profilePictureUrl'); // <-- UPDATE POPULATE
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
  const me = await User.findById(req.userId)
    .select('firstName lastName mobile email username profilePictureUrl');
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
    // Ensure profilePictureUrl is NOT overwritten by this request
    const { firstName, lastName, mobile, email, username } = req.body;

    // ... existing validation ...

    // Only update text fields
    const updateData = { firstName, lastName, mobile, email, username };

    const updated = await User.findByIdAndUpdate(
      req.userId,
      updateData, // Use the filtered update data
      { new: true, runValidators: true, context: 'query' }
      // Update select to include profilePictureUrl in the response
    ).select('firstName lastName mobile email username profilePictureUrl'); // <-- UPDATE SELECT

    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json(updated);
  } catch (err) { /* ... existing error handling ... */ }
});

router.post('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Old password check
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error' });
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

router.post('/delete-account', auth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password is required to delete account' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password. Account deletion failed.' });
    }

    // .deleteOne() trigger karega middleware ko jo humne User model me banaya hai
    await user.deleteOne();

    res.json({ message: 'Your account and all associated data have been successfully deleted.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ message: 'An error occurred on the server while deleting the account.' });
  }
});

module.exports = router;
