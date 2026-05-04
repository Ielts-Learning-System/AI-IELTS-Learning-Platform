/**
 * dictation.controller.js
 * -------------------------------------------------------------------
 * Cloudinary-backed CRUD for DictationWord documents.
 *
 * Uses multer memoryStorage + a manual upload_stream call so that
 * no third-party adapter is needed (avoids cloudinary v1/v2 peer
 * dependency conflicts with multer-storage-cloudinary).
 * -------------------------------------------------------------------
 */

const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const streamifier = require('streamifier');
const DictationWord = require('../models/DictationWord');

// ── Cloudinary config ─────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Multer — keep file in memory, validate type/size ─────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB cap
  fileFilter: (_req, file, cb) => {
    const allowed = /audio\/(mpeg|wav|ogg|mp4)|video\//;
    const extOk = /\.(mp3|wav)$/i.test(file.originalname);
    if (allowed.test(file.mimetype) || extOk) {
      cb(null, true);
    } else {
      cb(new Error('Only mp3 and wav audio files are accepted'), false);
    }
  },
});

// ── Helper: upload buffer → Cloudinary, return { url, publicId } ─
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'ielts/dictation/audio',
        resource_type: 'video', // Cloudinary classifies audio as "video"
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// ── Helper: safely delete a Cloudinary audio asset ───────────────
async function destroyCloudinaryAudio(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
  } catch {
    console.warn(`⚠️  Could not delete Cloudinary asset: ${publicId}`);
  }
}

// ── GET /api/dictation ────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.search) {
      filter.transcript = { $regex: req.query.search, $options: 'i' };
    }

    const [words, total] = await Promise.all([
      DictationWord.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DictationWord.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: words,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('❌ getAll dictation:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/dictation ───────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'An audio file is required' });
    }

    const { transcript, difficulty, speaker } = req.body;
    if (!transcript || !transcript.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'transcript is required' });
    }

    const { url, publicId } = await uploadToCloudinary(req.file.buffer);

    const word = await DictationWord.create({
      transcript: transcript.trim(),
      difficulty: difficulty || 'medium',
      speaker: speaker || 'unknown',
      audioUrl: url,
      cloudinaryPublicId: publicId,
      source: 'cloudinary',
    });

    res.status(201).json({ success: true, data: word });
  } catch (err) {
    console.error('❌ create dictation:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/dictation/:id ────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const word = await DictationWord.findById(req.params.id);
    if (!word) {
      return res
        .status(404)
        .json({ success: false, message: 'DictationWord not found' });
    }

    const { transcript, difficulty, speaker } = req.body;
    if (transcript !== undefined) word.transcript = transcript.trim();
    if (difficulty !== undefined) word.difficulty = difficulty;
    if (speaker !== undefined) word.speaker = speaker;

    if (req.file) {
      await destroyCloudinaryAudio(word.cloudinaryPublicId);
      const { url, publicId } = await uploadToCloudinary(req.file.buffer);
      word.audioUrl = url;
      word.cloudinaryPublicId = publicId;
      word.source = 'cloudinary';
    }

    await word.save();
    res.json({ success: true, data: word });
  } catch (err) {
    console.error('❌ update dictation:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/dictation/:id ─────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const word = await DictationWord.findById(req.params.id);
    if (!word) {
      return res
        .status(404)
        .json({ success: false, message: 'DictationWord not found' });
    }

    await destroyCloudinaryAudio(word.cloudinaryPublicId);
    await word.deleteOne();

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error('❌ delete dictation:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Export multer middleware for use in the router
exports.upload = upload;
