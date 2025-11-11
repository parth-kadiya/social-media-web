const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadPost } = require('../middleware/upload');
const Post = require('../models/Post');
const User = require('../models/User');
// const fs = require('fs').promises; // Cloudinary ke saath iski zaroorat nahi
// const path = require('path');     // Cloudinary ke saath iski zaroorat nahi

// create post (image upload)
router.post('/create', auth, uploadPost.single('image'), async (req, res) => { // <-- YAHAN BADLAV KIYA HAI
  try {
    if (!req.file) return res.status(400).json({ message: 'Image required' });
    const imageUrl = req.file.path; // Cloudinary URL
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
    // --- CORRECTION: Add profilePictureUrl to populate ---
    const posts = await Post.find({ user: req.userId }).sort({ createdAt: -1 })
        .populate('user', 'firstName lastName username profilePictureUrl'); // <-- ADDED profilePictureUrl
    // --- END CORRECTION ---

    const mapped = posts.map(p => ({
        _id: p._id,
        user: p.user, // User object now includes profilePictureUrl
        imageUrl: p.imageUrl,
        createdAt: p.createdAt,
        likesCount: (p.likes || []).length,
        likedByMe: (p.likes || []).some(id => id.toString() === req.userId)
    }));
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

    // --- CORRECTION: Add profilePictureUrl to populate ---
    const posts = await Post.find({ user: { $in: friends } })
      .populate('user', 'firstName lastName username profilePictureUrl') // <-- ADDED profilePictureUrl
      .sort({ createdAt: -1 });
    // --- END CORRECTION ---

    const mapped = posts.map(p => ({
         _id: p._id,
        user: p.user, // User object now includes profilePictureUrl
        imageUrl: p.imageUrl,
        createdAt: p.createdAt,
        likesCount: (p.likes || []).length,
        likedByMe: (p.likes || []).some(id => id.toString() === req.userId)
    }));
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

        // --- Remove local file deletion logic ---
        /*
        // build absolute path to file
        const relPath = post.imageUrl.replace(/^\/+/, '');
        const filePath = path.join(__dirname, '..', relPath);

        // delete file if exists
        try {
            await fs.unlink(filePath);
        } catch (err) {
            console.warn('Failed to delete file or file not found:', filePath, err.message);
        }
        */
        // --- End removal ---

        // Optional: Delete image from Cloudinary here if needed (requires cloudinary api)
        // Example (you'll need to install and configure cloudinary sdk properly):
        /*
        if (post.imageUrl && post.imageUrl.includes('cloudinary')) {
             try {
                 const publicId = post.imageUrl.split('/').pop().split('.')[0]; // Extract public_id
                 await cloudinary.uploader.destroy(`social-app-posts/${publicId}`); // Adjust folder/publicId extraction as needed
                 console.log(`Deleted from Cloudinary: ${publicId}`);
             } catch (cldErr) {
                 console.error("Cloudinary delete error:", cldErr);
             }
        }
        */


        // remove DB entry
        await Post.findByIdAndDelete(postId);

        res.json({ message: 'Post deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
