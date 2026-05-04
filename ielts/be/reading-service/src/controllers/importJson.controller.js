/**
 * importJson.controller.js — Reading Service
 * POST /reading/import-json
 * Receives a validated JSON payload and creates a new ReadingTest.
 */

const ReadingTest = require('../models/ReadingTest');

const VALID_QUESTION_TYPES = ['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'MATCHING', 'TFNG', 'YNNG'];

exports.importJson = async (req, res) => {
  try {
    const { title, description, passages } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'title là bắt buộc.' });
    }

    if (!Array.isArray(passages) || passages.length === 0) {
      return res.status(400).json({ success: false, message: 'passages phải là mảng không rỗng.' });
    }

    const validationErrors = [];

    const normalizedPassages = passages.map((passage, pIdx) => {
      // Strip HTML tags for blank-check (content may be HTML from rich-text editor)
      const contentText = String(passage.content || '').replace(/<[^>]*>/g, '').trim();
      if (!contentText) {
        validationErrors.push(`Passage ${pIdx + 1}: thiếu content.`);
      }
      if (!passage.title || !String(passage.title).trim()) {
        validationErrors.push(`Passage ${pIdx + 1}: thiếu title.`);
      }

      const questions = Array.isArray(passage.questions) ? passage.questions : [];

      const normalizedQuestions = questions.map((q, qIdx) => {
        if (!q.text || !String(q.text).trim()) {
          validationErrors.push(`Passage ${pIdx + 1} Q${qIdx + 1}: thiếu text.`);
        }
        if (!q.correctAnswer || !String(q.correctAnswer).trim()) {
          validationErrors.push(`Passage ${pIdx + 1} Q${qIdx + 1}: thiếu correctAnswer.`);
        }

        const type = VALID_QUESTION_TYPES.includes(q.type) ? q.type : 'FILL_IN_BLANK';

        return {
          questionNumber: Number(q.questionNumber) || qIdx + 1,
          type,
          text: String(q.text || '').trim(),
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          correctAnswer: String(q.correctAnswer || '').trim(),
          explanation: String(q.explanation || '').trim(),
        };
      });

      return {
        passageNumber: Number(passage.passageNumber) || pIdx + 1,
        title: String(passage.title || '').trim(),
        content: String(passage.content || '').trim(),
        image: String(passage.image || '').trim(),
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

    const test = new ReadingTest({
      title: title.trim(),
      description: String(description || '').trim(),
      passages: normalizedPassages,
      createdBy: req.user.id || req.user._id,
      isPublished: false,
    });

    await test.save();

    return res.status(201).json({
      success: true,
      message: 'Import Reading test thành công.',
      data: { _id: test._id, title: test.title },
    });
  } catch (err) {
    console.error('[Reading] importJson error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server khi import.' });
  }
};
