const mongoose = require('mongoose');
const Lesson = require('../models/lesson.model');

// ─── Helpers ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 6;

// ─── Create ─────────────────────────────────────────────────────────────────
const createLesson = async (req, res) => {
  try {
    const { title, description, videoUrl, videoType, thumbnailUrl, duration, status } = req.body;
    const teacherId = req.user && req.user.id;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: missing user context' });
    }

    if (!title || !description || !videoUrl) {
      return res.status(400).json({ success: false, message: 'title, description, and videoUrl are required' });
    }

    const lesson = await Lesson.create({
      title,
      description,
      videoUrl,
      videoType: videoType || 'cloudinary',
      thumbnailUrl,
      teacherId,
      duration,
      status,
    });

    return res.status(201).json({ success: true, message: 'Lesson created successfully', data: lesson });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create lesson', error: error.message });
  }
};

// ─── Get All (Students – paginated + searchable) ────────────────────────────
const getAllLessons = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = PAGE_SIZE;
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const filter = { status: 'Published' };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [lessons, total] = await Promise.all([
      Lesson.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Lesson.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Lessons fetched successfully',
      data: lessons,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch lessons', error: error.message });
  }
};

// ─── Get All for Teacher (no status filter, paginated + searchable) ──────────
const getAllLessonsTeacher = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = PAGE_SIZE;
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [lessons, total] = await Promise.all([
      Lesson.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Lesson.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Lessons fetched successfully',
      data: lessons,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch lessons', error: error.message });
  }
};

// ─── Get By ID ───────────────────────────────────────────────────────────────
const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid lesson ID' });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    return res.status(200).json({ success: true, message: 'Lesson fetched successfully', data: lesson });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch lesson', error: error.message });
  }
};

// ─── Delete ──────────────────────────────────────────────────────────────────
const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid lesson ID' });
    }

    const deletedLesson = await Lesson.findByIdAndDelete(id);
    if (!deletedLesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    return res.status(200).json({ success: true, message: 'Lesson deleted successfully', data: deletedLesson });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete lesson', error: error.message });
  }
};

module.exports = {
  createLesson,
  getAllLessons,
  getAllLessonsTeacher,
  getLessonById,
  deleteLesson,
};
