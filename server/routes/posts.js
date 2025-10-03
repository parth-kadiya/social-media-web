const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Post = require('../models/Post');
const User = require('../models/User');
const fs = require('fs').promises;
const path = require('path');

// create post (image upload)
router.post('/create', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image required' });
    // const imageUrl = `/uploads/${req.file.filename}`; // <-- Purani line ko comment/delete karein
    const imageUrl = req.file.path; // <-- Is nayi line ko add karein (Cloudinary URL)
    const post = new Post({ user: req.userId, imageUrl, likes: [] });
    await post.save();
    res.json({ message: 'Post created', post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// your posts
router.get('/mine', auth, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.userId }).sort({ createdAt: -1 }).populate('user', 'firstName lastName username');
    // augment each post with likesCount and likedByMe
    const mapped = posts.map(p => {
      const likesCount = (p.likes || []).length;
      const likedByMe = (p.likes || []).some(id => id.toString() === req.userId);
      return {
        _id: p._id,
        user: p.user,
        imageUrl: p.imageUrl,
        createdAt: p.createdAt,
        likesCount,
        likedByMe
      };
    });
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// friend posts (posts by friends)
router.get('/friends', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId).select('friends');
    const friends = (me && me.friends) ? me.friends : [];
    const posts = await Post.find({ user: { $in: friends } })
      .populate('user', 'firstName lastName username')
      .sort({ createdAt: -1 });

    const mapped = posts.map(p => {
      const likesCount = (p.likes || []).length;
      const likedByMe = (p.likes || []).some(id => id.toString() === req.userId);
      return {
        _id: p._id,
        user: p.user,
        imageUrl: p.imageUrl,
        createdAt: p.createdAt,
        likesCount,
        likedByMe
      };
    });
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// toggle like on a post (like/unlike)
router.post('/:id/like', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const already = (post.likes || []).some(id => id.toString() === userId);

    if (already) {
      // unlike
      await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } });
      const updated = await Post.findById(postId);
      return res.json({ liked: false, likesCount: (updated.likes || []).length });
    } else {
      // like
      await Post.findByIdAndUpdate(postId, { $addToSet: { likes: userId } });
      const updated = await Post.findById(postId);
      return res.json({ liked: true, likesCount: (updated.likes || []).length });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// delete a post (only owner can delete) - also removes file from uploads folder
router.delete('/:id', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // build absolute path to file
    // post.imageUrl is like '/uploads/<filename>'
    const relPath = post.imageUrl.replace(/^\/+/, ''); // remove leading slash(es)
    const filePath = path.join(__dirname, '..', relPath);

    // delete file if exists
    try {
      await fs.unlink(filePath);
    } catch (err) {
      // if file doesn't exist, log but continue to remove DB entry
      console.warn('Failed to delete file or file not found:', filePath, err.message);
    }

    // remove DB entry
    await Post.findByIdAndDelete(postId);

    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
