const mongoose = require('mongoose');

const StatusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  caption: { type: String, trim: true, default: '' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  views: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true }
});

// Hum manual cleanup karenge Cloudinary ke liye, isliye MongoDB TTL index use nahi kar rahe.
module.exports = mongoose.model('Status', StatusSchema);