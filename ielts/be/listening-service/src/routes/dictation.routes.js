const express = require('express');
const router = express.Router();
const dictation = require('../controllers/dictation.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

// Public — students and guests can fetch words for practice
router.get('/', dictation.getAll);

// Teacher / Admin only — full CRUD
router.post(
  '/',
  verifyToken,
  authorizeRoles('admin', 'teacher'),
  dictation.upload.single('audio'),
  dictation.create
);

router.put(
  '/:id',
  verifyToken,
  authorizeRoles('admin', 'teacher'),
  dictation.upload.single('audio'), // optional file on update
  dictation.update
);

router.delete(
  '/:id',
  verifyToken,
  authorizeRoles('admin', 'teacher'),
  dictation.remove
);

module.exports = router;
