const mongoose = require('mongoose');
const Lesson = require('../models/lesson.model');

const createLesson = async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnailUrl, duration, status } = req.body;
    const teacherId = req.user && req.user.id;

    if (!teacherId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: missing user context',
      });
    }

    if (!title || !description || !videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'title, description, and videoUrl are required',
      });
    }

    const lesson = await Lesson.create({
      title,
      description,
      videoUrl,
      thumbnailUrl,
      teacherId,
      duration,
      status,
    });

    return res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: lesson,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create lesson',
      error: error.message,
    });
  }
};

const getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({ status: 'Published' }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Lessons fetched successfully',
      data: lessons,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch lessons',
      error: error.message,
    });
  }
};

const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lesson ID',
      });
    }

    const lesson = await Lesson.findById(id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lesson fetched successfully',
      data: lesson,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch lesson',
      error: error.message,
    });
  }
};

const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lesson ID',
      });
    }

    const deletedLesson = await Lesson.findByIdAndDelete(id);

    if (!deletedLesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    // TODO: Also call cloud-media-service to remove the video from Cloudinary and free storage.
    return res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully',
      data: deletedLesson,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete lesson',
      error: error.message,
    });
  }
};

module.exports = {
  createLesson,
  getAllLessons,
  getLessonById,
  deleteLesson,
};
