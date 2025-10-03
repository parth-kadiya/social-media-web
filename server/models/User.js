const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// NOTE: pre hook ke andar doosre models ko directly access karne ke liye
// mongoose.model('ModelName') ka use karna ek acchi practice hai.
// Isse circular dependency issues se bacha ja sakta hai.

const UserSchema = new mongoose.Schema({
 firstName: { type: String, required: true },
 lastName: { type: String, required: true },
 mobile:  { type: String, required: true },
 email:  { type: String, required: true },
 username: { type: String, required: true, unique: true, lowercase: true, index: true },
 password: { type: String, required: true },
 friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

 // ---- notification / last-seen timestamps ----
 lastSeenSuggestionsAt: { type: Date, default: null },
 lastSeenFriendRequestsAt: { type: Date, default: null }

}, { timestamps: true });


// --- YEH NAYA CODE ADD HUA HAI ---
// Mongoose middleware to clean up related data before a user is deleted
UserSchema.pre('deleteOne', { document: false, query: true }, async function() {
 console.log('User delete middleware triggered');
 const userId = this.getQuery()['_id'];
 if (!userId) return;

 try {
  // 1. Delete user's posts and their associated image files
  const Post = mongoose.model('Post');
  const posts = await Post.find({ user: userId });
  for (const post of posts) {
   if (post.imageUrl) {
    try {
     // Construct absolute path to the image file
     const imagePath = path.join(__dirname, '..', post.imageUrl);
     await fs.promises.unlink(imagePath);
     console.log(`Deleted image file: ${imagePath}`);
    } catch (err) {
     // Log error if file deletion fails, but continue the process
     console.error(`Failed to delete post image ${post.imageUrl}:`, err.message);
    }
   }
  }
  await Post.deleteMany({ user: userId });

  // 2. Remove user from all other users' friends lists
  const User = mongoose.model('User');
  await User.updateMany(
   { friends: userId },
   { $pull: { friends: userId } }
  );

  // 3. Remove user's likes from all posts
  await Post.updateMany(
   { likes: userId },
   { $pull: { likes: userId } }
  );

  // 4. Delete all friend requests sent to or from this user
  const FriendRequest = mongoose.model('FriendRequest');
  await FriendRequest.deleteMany({
   $or: [{ from: userId }, { to: userId }]
  });

  // 5. Delete all messages sent to or from this user
  const Message = mongoose.model('Message');
  await Message.deleteMany({
   $or: [{ from: userId }, { to: userId }]
  });

 } catch (err) {
  console.error(`Error during user data cleanup for userId ${userId}:`, err);
 }
});

module.exports = mongoose.model('User', UserSchema);