const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadPost, cloudinary } = require('../middleware/upload'); // Reusing upload config
const Status = require('../models/Status');
const User = require('../models/User');

// Helper to extract public ID
const getPublicIdFromUrl = (url) => {
    try {
        const parts = url.split('/');
        const filename = parts.pop().split('.')[0];
        const folder = parts.pop();
        return `${folder}/${filename}`;
    } catch (error) { return null; }
};

// 1. Create Status
router.post('/create', auth, uploadPost.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Image required' });
        
        // duration frontend se aayega (hours me: 24, 36, 48)
        const { caption, duration } = req.body; 
        
        // Default 24 hours agar user ne kuch select nahi kiya
        const hoursToAdd = duration ? parseInt(duration) : 24;
        
        // Expiry time calculate karo
        const expiresAt = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);

        const status = new Status({
            user: req.userId,
            imageUrl: req.file.path,
            caption: caption || '',
            expiresAt: expiresAt // Save expiry
        });
        await status.save();
        res.json(status);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 2. Get All Active Statuses (Mine + Friends)
router.get('/feed', auth, async (req, res) => {
    try {
        const me = await User.findById(req.userId).select('friends');
        const friendIds = me.friends.map(f => f);
        const allIds = [...friendIds, req.userId];
        
        // Ab hum "createdAt" check nahi karenge, hum "expiresAt" check karenge
        // Wo status lao jo ABHI expire nahi huye hain (expiresAt > Date.now())
        const statuses = await Status.find({
            user: { $in: allIds },
            expiresAt: { $gt: new Date() } 
        })
        .populate('user', 'firstName lastName profilePictureUrl')
        .populate('views', 'firstName lastName profilePictureUrl') 
        .sort({ createdAt: -1 });

        res.json(statuses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/:id/view', auth, async (req, res) => { /* Same logic */
    try {
        const status = await Status.findById(req.params.id);
        if (!status) return res.status(404).json({ message: 'Not found' });
        if (!status.views.includes(req.userId)) {
            status.views.push(req.userId);
            await status.save();
        }
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// 3. Toggle Like Status
router.post('/:id/like', auth, async (req, res) => { /* Same logic */
    try {
        const status = await Status.findById(req.params.id);
        if (!status) return res.status(404).json({ message: 'Status not found' });
        const index = status.likes.indexOf(req.userId);
        if (index === -1) { status.likes.push(req.userId); } 
        else { status.likes.splice(index, 1); }
        await status.save();
        res.json({ likesCount: status.likes.length, liked: index === -1 });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// 4. Delete Status (Manual)
router.delete('/:id', auth, async (req, res) => { /* Same logic */
    try {
        const status = await Status.findById(req.params.id);
        if (!status) return res.status(404).json({ message: 'Not found' });
        if (status.user.toString() !== req.userId) { return res.status(403).json({ message: 'Not authorized' }); }
        const publicId = getPublicIdFromUrl(status.imageUrl);
        if (publicId) await cloudinary.uploader.destroy(publicId);
        await status.deleteOne();
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;