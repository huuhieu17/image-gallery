const express = require('express');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const app = express();
const PORT = 3000;

const imagesDir = path.join(__dirname, 'images');
const thumbnailsDir = path.join(__dirname, 'thumbnails');
const thumbnailSize = 350;

// Function to create a thumbnail
const createThumbnail = (inputPath, outputPath) => {
  return sharp(inputPath)
    .rotate()
    .resize(thumbnailSize, thumbnailSize, { fit: 'inside' })
    .toFile(outputPath);
};

// Function to generate thumbnails for all images in the images directory
const generateThumbnails = () => {
  return new Promise((resolve, reject) => {
    fs.readdir(imagesDir, (err, files) => {
      if (err) {
        return reject(err);
      }

      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif';
      });

      const thumbnailPromises = imageFiles.map(file => {
        const inputPath = path.join(imagesDir, file);
        const outputPath = path.join(thumbnailsDir, file);
        return createThumbnail(inputPath, outputPath);
      });

      Promise.all(thumbnailPromises)
        .then(() => resolve())
        .catch(err => reject(err));
    });
  });
};

// Middleware to serve static files with caching headers
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '1y', // Cache for one year
  etag: false
}));

// Endpoint to get the list of images
app.get('/images', (req, res) => {
  fs.readdir(imagesDir, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory');
    }

    const images = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif';
    });

    const imageUrls = images.map(image => ({
      src: `/images/${image}`,
      srct: `/thumbnails/${image}`
    }));
    res.json(imageUrls);
  });
});

// Serve images and thumbnails from respective directories
app.use('/images', express.static(imagesDir));
app.use('/thumbnails', express.static(thumbnailsDir));

// Serve the index.html file at the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ensure thumbnails directory exists
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir);
}

// Generate thumbnails and start server
generateThumbnails()
  .then(() => {
    console.log('Thumbnails generated successfully');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error generating thumbnails', err);
  });
