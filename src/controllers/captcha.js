const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

// folder where your images are stored
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'captcha');

const imageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/random-image', imageLimiter, (req, res) => {
  fs.readdir(IMAGES_DIR, (err, files) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error reading images directory');
    }

    // filter only images (jpg, png, gif, etc.)
    const imageFiles = files.filter(f =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
    );

    if (imageFiles.length === 0) {
      return res.status(404).send('No images found');
    }

    // pick a random file
    const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];

    // send the image file
    res.sendFile(path.join(IMAGES_DIR, randomFile));
  });
});

module.exports = router;