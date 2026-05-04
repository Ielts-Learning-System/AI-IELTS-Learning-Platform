/**
 * resources.controller.js
 *
 * Powers:
 *   GET    /admin/resources/files        → list uploaded assets (paginated)
 *   POST   /admin/resources/files        → create a metadata record
 *   DELETE /admin/resources/files/:id    → delete metadata record
 *   GET    /admin/resources/tags         → list all tags (grouped by category)
 *   POST   /admin/resources/tags         → create a new tag
 *   DELETE /admin/resources/tags/:id     → delete a tag
 */

const mongoose = require('mongoose');
const MediaFile = require('../models/MediaFile');
const Tag = require('../models/Tag');

// ─── Files ───────────────────────────────────────────────────────────

/**
 * GET /admin/resources/files
 * Query params: page, limit, type (MP3|PDF|PNG|…), search (name substring)
 */
const listFiles = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.type)   filter.type = req.query.type.toUpperCase();
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

    const [files, total] = await Promise.all([
      MediaFile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MediaFile.countDocuments(filter),
    ]);

    // Shape the response so the frontend mirrors the mock FILE structure
    const data = files.map((f) => ({
      id:          f._id,
      name:        f.name,
      type:        f.type,
      size:        parseFloat((f.sizeBytes / (1024 * 1024)).toFixed(2)), // → MB
      uploadedBy:  f.uploadedByName || String(f.uploadedBy),
      date:        f.createdAt.toISOString().slice(0, 10),
      secureUrl:   f.secureUrl,
      publicId:    f.publicId,
    }));

    return res.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('LIST FILES ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /admin/resources/files
 * Body: { name, publicId, secureUrl, type, sizeBytes, uploadedByName?, folderName? }
 *
 * Called by cloud-media-service (or the client) after a successful Cloudinary
 * upload to persist the metadata in MongoDB.
 */
const createFileRecord = async (req, res) => {
  try {
    const { name, publicId, secureUrl, type, sizeBytes, uploadedByName, folderName } = req.body;

    if (!name || !publicId || !secureUrl || !type || sizeBytes === undefined) {
      return res.status(400).json({
        success: false,
        message: 'name, publicId, secureUrl, type, and sizeBytes are required',
      });
    }

    const file = await MediaFile.create({
      name,
      publicId,
      secureUrl,
      type:           type.toUpperCase(),
      sizeBytes:      Number(sizeBytes),
      uploadedBy:     req.user._id,
      uploadedByName: uploadedByName || req.user.name || '',
      folderName:     folderName || '',
    });

    return res.status(201).json({ success: true, data: file });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: 'A file with this publicId already exists' });
    }
    console.error('CREATE FILE RECORD ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /admin/resources/files/:id
 * Removes only the MongoDB metadata record; caller must separately
 * delete the asset from Cloudinary via /api/media/delete.
 */
const deleteFileRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid file id' });
    }

    const deleted = await MediaFile.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'File record not found' });
    }

    return res.json({ success: true, message: 'File record deleted' });
  } catch (error) {
    console.error('DELETE FILE RECORD ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Tags ────────────────────────────────────────────────────────────

/**
 * GET /admin/resources/tags
 * Query params: category, search
 * Returns a flat list AND a grouped object keyed by category.
 */
const listTags = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search)   filter.name = { $regex: req.query.search, $options: 'i' };

    const tags = await Tag.find(filter).sort({ category: 1, name: 1 }).lean();

    // Flat list (used for the tag search input)
    const data = tags.map((t) => ({
      id:       t._id,
      name:     t.name,
      category: t.category,
      count:    t.usageCount,
      color:    t.color,
    }));

    // Grouped object (drives the category-heading layout in ResourceManagement)
    const grouped = data.reduce((acc, tag) => {
      (acc[tag.category] = acc[tag.category] || []).push(tag);
      return acc;
    }, {});

    return res.json({ success: true, data, grouped });
  } catch (error) {
    console.error('LIST TAGS ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /admin/resources/tags
 * Body: { name, category, color? }
 */
const createTag = async (req, res) => {
  try {
    const { name, category, color } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: 'name and category are required',
      });
    }

    const tag = await Tag.create({ name: name.trim(), category, color: color || '' });
    return res.status(201).json({ success: true, data: tag });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Tag already exists' });
    }
    console.error('CREATE TAG ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /admin/resources/tags/:id
 */
const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid tag id' });
    }

    const deleted = await Tag.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }

    return res.json({ success: true, message: 'Tag deleted' });
  } catch (error) {
    console.error('DELETE TAG ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listFiles,
  createFileRecord,
  deleteFileRecord,
  listTags,
  createTag,
  deleteTag,
};
