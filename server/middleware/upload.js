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
    folder: 'social-app-posts', // Folder for posts
    allowed_formats: ['jpeg', 'png', 'jpg'],
  },
});

const profilePictureStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'social-app-profile-pics', // <<<--- Different folder
        allowed_formats: ['jpeg', 'png', 'jpg'],
        // Automatically crop to 200x200, focusing on face
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: fileFilter
});

const uploadProfilePic = multer({
    storage: profilePictureStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit for profile pics
    fileFilter: fileFilter
});

module.exports = { uploadPost, uploadProfilePic };