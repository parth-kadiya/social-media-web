const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const postStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'social-app-posts',
    allowed_formats: ['jpeg', 'png', 'jpg'],
  },
});

const profilePictureStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'social-app-profile-pics',
        allowed_formats: ['jpeg', 'png', 'jpg'],
        transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }]
    },
});

function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png/;
  const mimetype = allowed.test(file.mimetype);
  if (mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only jpg, jpeg, png allowed'), false);
  }
}

const uploadPost = multer({
  storage: postStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
});

const uploadProfilePic = multer({
    storage: profilePictureStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: fileFilter
});

// CHANGE: cloudinary ko bhi export kiya hai
module.exports = { uploadPost, uploadProfilePic, cloudinary };