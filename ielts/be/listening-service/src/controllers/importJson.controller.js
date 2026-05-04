/**
 * importJson.controller.js — Listening Service
 * POST /listening/import-json
 * Receives a validated JSON payload and creates a new ListeningTest.
 */

const ListeningTest = require('../models/ListeningTest');

const VALID_QUESTION_TYPES = ['multiple_choice', 'fill_blank', 'map_labeling', 'matching'];

exports.importJson = async (req, res) => {
  try {
    const { title, description, parts } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'title là bắt buộc.' });
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ success: false, message: 'parts phải là mảng không rỗng.' });
    }

    const validationErrors = [];

    const normalizedParts = parts.map((part, pIdx) => {
      if (!part.audioUrl || !String(part.audioUrl).trim()) {
        validationErrors.push(`Part ${pIdx + 1}: thiếu audioUrl.`);
      }
      if (!part.title || !String(part.title).trim()) {
        validationErrors.push(`Part ${pIdx + 1}: thiếu title.`);
      }

      const questions = Array.isArray(part.questions) ? part.questions : [];

      const normalizedQuestions = questions.map((q, qIdx) => {
        if (!q.questionText || !String(q.questionText).trim()) {
          validationErrors.push(`Part ${pIdx + 1} Q${qIdx + 1}: thiếu questionText.`);
        }
        if (!q.correctAnswer || !String(q.correctAnswer).trim()) {
          validationErrors.push(`Part ${pIdx + 1} Q${qIdx + 1}: thiếu correctAnswer.`);
        }

        const type = VALID_QUESTION_TYPES.includes(q.type) ? q.type : 'fill_blank';

        return {
          questionText: String(q.questionText || '').trim(),
          type,
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          imageUrl: String(q.imageUrl || '').trim(),
          correctAnswer: String(q.correctAnswer || '').trim(),
        };
      });

      return {
        partNumber: Number(part.partNumber) || pIdx + 1,
        title: String(part.title || '').trim(),
        audioUrl: String(part.audioUrl || '').trim(),
        description: String(part.description || '').trim(),
        questions: normalizedQuestions,
      };
    });

    if (validationErrors.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'Dữ liệu không hợp lệ.',
        errors: validationErrors,
      });
    }

    const test = new ListeningTest({
      title: title.trim(),
      description: String(description || '').trim(),
      parts: normalizedParts,
    });

    await test.save();

    return res.status(201).json({
      success: true,
      message: 'Import Listening test thành công.',
      data: { _id: test._id, title: test.title },
    });
  } catch (err) {
    console.error('[Listening] importJson error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server khi import.' });
  }
};
