const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadPost, cloudinary } = require('../middleware/upload');
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment'); // <--- Import Comment Model

// 1. Create post (Modified to accept caption)
router.post('/create', auth, uploadPost.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image required' });
    
    // Caption body se nikal rahe hain
    const { caption } = req.body; 

    const imageUrl = req.file.path;
    
    const post = new Post({ 
      user: req.userId, 
      imageUrl, 
      caption: caption || '', // Caption save kar rahe hain
      likes: [] 
    });
    
    await post.save();
    res.json({ message: 'Post created', post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Your posts (Modified to include caption)
router.get('/mine', auth, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.userId }).sort({ createdAt: -1 })
        .populate('user', 'firstName lastName username profilePictureUrl');
    
    // Promise.all use kar rahe hain taki comments count calculate ho sake
    const mapped = await Promise.all(posts.map(async p => {
        const commentsCount = await Comment.countDocuments({ post: p._id });
        return {
            _id: p._id,
            user: p.user,
            imageUrl: p.imageUrl,
            caption: p.caption,
            createdAt: p.createdAt,
            likesCount: (p.likes || []).length,
            commentsCount: commentsCount, // <--- Added
            likedByMe: (p.likes || []).some(id => id.toString() === req.userId)
        };
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Friend posts (Modified to include caption)
router.get('/friends', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId).select('friends');
    const friends = (me && me.friends) ? me.friends : [];

    const posts = await Post.find({ user: { $in: friends } })
      .populate('user', 'firstName lastName username profilePictureUrl')
      .sort({ createdAt: -1 });

    const mapped = await Promise.all(posts.map(async p => {
        const commentsCount = await Comment.countDocuments({ post: p._id });
        return {
            _id: p._id,
            user: p.user,
            imageUrl: p.imageUrl,
            caption: p.caption,
            createdAt: p.createdAt,
            likesCount: (p.likes || []).length,
            commentsCount: commentsCount, // <--- Added
            likedByMe: (p.likes || []).some(id => id.toString() === req.userId)
        };
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle Like (Existing logic kept same)
router.post('/:id/like', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const already = (post.likes || []).some(id => id.toString() === userId);
    if (already) {
      await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } });
      const updated = await Post.findById(postId);
      return res.json({ liked: false, likesCount: (updated.likes || []).length });
    } else {
      await Post.findByIdAndUpdate(postId, { $addToSet: { likes: userId } });
      const updated = await Post.findById(postId);
      return res.json({ liked: true, likesCount: (updated.likes || []).length });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const getPublicIdFromUrl = (url) => {
    try {
        // URL example: https://res.cloudinary.com/.../upload/v1234/social-app-posts/xyz.jpg
        const parts = url.split('/');
        const filenameWithExtension = parts.pop(); // xyz.jpg
        const folder = parts.pop(); // social-app-posts
        const publicId = `${folder}/${filenameWithExtension.split('.')[0]}`; // social-app-posts/xyz
        return publicId;
    } catch (error) {
        console.error("Error extracting publicId:", error);
        return null;
    }
};

// Delete Post (Existing logic kept same)
router.delete('/:id', auth, async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);
        
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.user.toString() !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        // --- NEW: Delete Image from Cloudinary ---
        if (post.imageUrl) {
            const publicId = getPublicIdFromUrl(post.imageUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.log(`Deleted image from Cloudinary: ${publicId}`);
            }
        }
        // -----------------------------------------

        await Post.findByIdAndDelete(postId);
        await Comment.deleteMany({ post: postId });

        res.json({ message: 'Post deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

/* -------------------------------------------
   NEW ROUTES FOR LIKES LIST AND COMMENTS
------------------------------------------- */

// Get list of users who liked the post
router.get('/:id/likes', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('likes', 'firstName lastName username profilePictureUrl'); // Populate user details
        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.json(post.likes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get comments for a post
router.get('/:id/comments', auth, async (req, res) => {
    try {
        const comments = await Comment.find({ post: req.params.id })
            .populate('user', 'firstName lastName username profilePictureUrl')
            .sort({ createdAt: 1 }); // Oldest first (like chat) or -1 for Newest first
        res.json(comments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add a comment
router.post('/:id/comments', auth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });

        const newComment = new Comment({
            post: req.params.id,
            user: req.userId,
            text: text.trim()
        });
        await newComment.save();
        
        // Populate user details immediately to show on frontend
        await newComment.populate('user', 'firstName lastName username profilePictureUrl');
        
        res.json(newComment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;