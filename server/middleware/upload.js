const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'social-app-posts', // Cloudinary me folder ka naam
    allowed_formats: ['jpeg', 'png', 'jpg'],
    // transformation: [{ width: 500, height: 500, crop: 'limit' }] // Optional: image size fix karne ke liye
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

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: fileFilter
});

module.exports = upload;