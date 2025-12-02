const mongoose = require('mongoose');
// const fs = require('fs'); 
// const path = require('path');

// Import Cloudinary config directly 
const cloudinary = require('cloudinary').v2;

// Helper inside Model
const getPublicIdFromUrl = (url) => {
    try {
        const parts = url.split('/');
        const filenameWithExtension = parts.pop();
        const folder = parts.pop();
        return `${folder}/${filenameWithExtension.split('.')[0]}`;
    } catch (error) {
        return null;
    }
};

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  mobile:  { type: String, required: true },
  email:  { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  profilePictureUrl: { type: String, default: null }, 

  // ---- notification / last-seen timestamps ----
  lastSeenSuggestionsAt: { type: Date, default: null },
  lastSeenFriendRequestsAt: { type: Date, default: null }

}, { timestamps: true });


// --- CLEANUP MIDDLEWARE (UPDATED) ---
UserSchema.pre('deleteOne', { document: false, query: true }, async function() {
 console.log('User delete middleware triggered (Full Cleanup)');
 const userId = this.getQuery()['_id'];
 if (!userId) return;

 try {
  // 1. Find User to delete Profile Picture from Cloudinary
  const User = mongoose.model('User');
  const userToDelete = await User.findById(userId);
  
  if (userToDelete && userToDelete.profilePictureUrl) {
      const publicId = getPublicIdFromUrl(userToDelete.profilePictureUrl);
      if (publicId) {
          await cloudinary.uploader.destroy(publicId);
          console.log('Deleted User Profile Pic from Cloudinary');
      }
  }

  // 2. Delete user's posts, their Cloudinary images, AND comments on those posts
  const Post = mongoose.model('Post');
  const Comment = mongoose.model('Comment'); // Ensure Comment model is available

  // User ki saari posts find karo
  const posts = await Post.find({ user: userId });
  
  // Un posts ki IDs ka array banao
  const postIds = posts.map(p => p._id);

  // Loop to delete images from Cloudinary
  for (const post of posts) {
   if (post.imageUrl) {
    try {
      const publicId = getPublicIdFromUrl(post.imageUrl);
      if (publicId) {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Deleted post image from Cloudinary: ${publicId}`);
      }
    } catch (err) {
      console.error(`Failed to delete post image ${post.imageUrl}:`, err.message);
    }
   }
  }

  // --- NEW LOGIC ADDED HERE ---
  // 1. Delete comments present ON the user's posts (written by anyone)
  if (postIds.length > 0) {
      await Comment.deleteMany({ post: { $in: postIds } });
      console.log('Deleted comments on user posts');
  }
  // 2. Delete comments written BY the user (on any post)
  await Comment.deleteMany({ user: userId });
  // ----------------------------

  // Finally delete the posts
  await Post.deleteMany({ user: userId });


  // 3. Remove user from all other users' friends lists
  await User.updateMany(
   { friends: userId },
   { $pull: { friends: userId } }
  );

  // 4. Remove user's likes from all posts
  await Post.updateMany(
   { likes: userId },
   { $pull: { likes: userId } }
  );

  // 5. Delete all friend requests sent to or from this user
  const FriendRequest = mongoose.model('FriendRequest');
  await FriendRequest.deleteMany({
   $or: [{ from: userId }, { to: userId }]
  });

  // 6. Delete all messages sent to or from this user
  const Message = mongoose.model('Message');
  await Message.deleteMany({
   $or: [{ from: userId }, { to: userId }]
  });

  // 7. Delete Feedback
  const Feedback = mongoose.model('Feedback');
  await Feedback.deleteMany({ user: userId });

 } catch (err) {
  console.error(`Error during user data cleanup for userId ${userId}:`, err);
 }
});

module.exports = mongoose.model('User', UserSchema);