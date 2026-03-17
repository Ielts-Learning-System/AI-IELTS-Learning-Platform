const express = require('express');
const { upload } = require('../middlewares/upload.middleware');
const {
  uploadMedia,
  deleteMedia,
  generateUploadSignature,
} = require('../controllers/media.controller');

const router = express.Router();

router.get('/generate-signature', generateUploadSignature);
router.post('/upload', upload.single('file'), uploadMedia);
router.delete('/delete', deleteMedia);

module.exports = router;
