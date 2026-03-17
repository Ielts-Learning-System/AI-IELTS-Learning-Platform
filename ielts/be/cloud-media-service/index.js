const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

const mediaRoutes = require('./src/routes/media.routes');
const { MAX_FILE_SIZE_MB } = require('./src/middlewares/upload.middleware');

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'cloud-media-service is healthy',
  });
});

app.use('/api/media', mediaRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`,
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message:
          err.message ||
          'Invalid file format. Allowed: jpg, png, webp, mp3, wav, ogg, pdf',
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`cloud-media-service is running on port ${PORT}`);
});
