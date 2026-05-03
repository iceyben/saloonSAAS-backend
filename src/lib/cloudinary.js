// src/lib/cloudinary.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Gallery photos storage
const galleryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "salon/gallery",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
  },
});

// Payment screenshot storage
const paymentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "salon/payments",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
  },
});

const uploadGallery  = multer({ storage: galleryStorage });
const uploadPayment  = multer({ storage: paymentStorage });

module.exports = { cloudinary, uploadGallery, uploadPayment };
