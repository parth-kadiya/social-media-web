const Status = require('../models/Status');
const { cloudinary } = require('../middleware/upload');

const startStatusCleanup = () => {
    // Run every 1 hour
    setInterval(async () => {
        console.log('Running Status Cleanup Job...');
        try {
            // Find statuses jinka expiry time nikal chuka hai (expiresAt < now)
            const expiredStatuses = await Status.find({ expiresAt: { $lt: new Date() } });
            
            for (const status of expiredStatuses) {
                if (status.imageUrl) {
                    try {
                        const parts = status.imageUrl.split('/');
                        const filenameWithExtension = parts.pop(); 
                        const folder = parts.pop(); 
                        const publicId = `${folder}/${filenameWithExtension.split('.')[0]}`;
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`Deleted expired status: ${publicId}`);
                    } catch (cldErr) { console.error('Cloudinary delete fail:', cldErr.message); }
                }
                await status.deleteOne();
            }
        } catch (err) { console.error('Cleanup Error:', err); }
    }, 3600000); 
};

module.exports = startStatusCleanup;