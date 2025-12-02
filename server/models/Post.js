const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caption: { type: String, trim: true, default: '' },
  imageUrl: { type: String, required: true }, // path to uploads
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // users who liked this post
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);
