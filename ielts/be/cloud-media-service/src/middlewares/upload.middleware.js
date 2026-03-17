const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 10);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'application/pdf',
]);

const allowedExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.mp3',
  '.wav',
  '.ogg',
  '.pdf',
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isMimeAllowed = allowedMimeTypes.has(file.mimetype);
  const isExtAllowed = allowedExtensions.has(ext);

  if (isMimeAllowed && isExtAllowed) {
    return cb(null, true);
  }

  const error = new Error(
    'Unsupported file format. Allowed: jpg, png, webp, mp3, wav, ogg, pdf'
  );
  error.statusCode = 400;
  return cb(error);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter,
});

module.exports = {
  upload,
  MAX_FILE_SIZE_MB,
};
