const express = require('express');
const router = express.Router();
const {
  listFiles,
  createFileRecord,
  deleteFileRecord,
  listTags,
  createTag,
  deleteTag,
} = require('../controllers/resources.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

const adminGuard = [verifyToken, authorizeRoles('admin')];

// ── Files ─────────────────────────────────────────────────────────────
/**
 * GET  /admin/resources/files          → paginated list (proxied as /api/resources/files)
 * POST /admin/resources/files          → create metadata record after Cloudinary upload
 * DEL  /admin/resources/files/:id      → remove metadata record
 */
router.get(   '/files',      ...adminGuard, listFiles);
router.post(  '/files',      ...adminGuard, createFileRecord);
router.delete('/files/:id',  ...adminGuard, deleteFileRecord);

// ── Tags ──────────────────────────────────────────────────────────────
/**
 * GET  /admin/resources/tags           → all tags, grouped by category (proxied as /api/resources/tags)
 * POST /admin/resources/tags           → create a new tag
 * DEL  /admin/resources/tags/:id       → delete a tag
 */
router.get(   '/tags',       ...adminGuard, listTags);
router.post(  '/tags',       ...adminGuard, createTag);
router.delete('/tags/:id',   ...adminGuard, deleteTag);

module.exports = router;
