const express = require('express');
const { upload } = require('../middlewares/upload.middleware');
const {
  uploadMedia,
  deleteMedia,
} = require('../controllers/media.controller');

const router = express.Router();

router.post('/upload', upload.single('file'), uploadMedia);
router.delete('/delete', deleteMedia);

module.exports = router;
