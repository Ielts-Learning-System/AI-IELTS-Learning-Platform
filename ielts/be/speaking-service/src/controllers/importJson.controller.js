/**
 * importJson.controller.js — Speaking Service
 * POST /speaking/import-json
 * Receives a validated JSON payload and creates a new SpeakingTest.
 */

const SpeakingTest = require('../models/SpeakingTest');

exports.importJson = async (req, res) => {
  try {
    const { title, part1, part2, part3 } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'title là bắt buộc.' });
    }

    const validationErrors = [];

    if (!Array.isArray(part1) || part1.filter(Boolean).length === 0) {
      validationErrors.push('part1 phải có ít nhất 1 câu hỏi.');
    }
    // Strip HTML tags for blank-check (part2 may be HTML from rich-text editor)
    const part2Text = String(part2 || '').replace(/<[^>]*>/g, '').trim();
    if (!part2Text) {
      validationErrors.push('part2 (cue card) là bắt buộc.');
    }
    if (!Array.isArray(part3) || part3.filter(Boolean).length === 0) {
      validationErrors.push('part3 phải có ít nhất 1 câu hỏi.');
    }

    if (validationErrors.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'Dữ liệu không hợp lệ.',
        errors: validationErrors,
      });
    }

    const test = new SpeakingTest({
      title: title.trim(),
      part1: part1.filter(Boolean).map((s) => String(s).trim()),
      part2: String(part2).trim(),
      part3: part3.filter(Boolean).map((s) => String(s).trim()),
    });

    await test.save();

    return res.status(201).json({
      success: true,
      message: 'Import Speaking test thành công.',
      data: { _id: test._id, title: test.title },
    });
  } catch (err) {
    console.error('[Speaking] importJson error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server khi import.' });
  }
};
