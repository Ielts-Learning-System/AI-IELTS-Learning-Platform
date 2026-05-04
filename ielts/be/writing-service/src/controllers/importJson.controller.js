/**
 * importJson.controller.js — Writing Service
 * POST /writing/import-json
 * Receives a validated JSON payload and creates a new WritingTest.
 */

const WritingTest = require('../models/WritingTest');

exports.importJson = async (req, res) => {
  try {
    const { title, description, tasks } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'title là bắt buộc.' });
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ success: false, message: 'tasks phải là mảng không rỗng.' });
    }

    const validationErrors = [];

    const normalizedTasks = tasks.map((task, tIdx) => {
      const taskNum = Number(task.taskNumber);
      if (![1, 2].includes(taskNum)) {
        validationErrors.push(`Task ${tIdx + 1}: taskNumber phải là 1 hoặc 2.`);
      }
      if (!task.title || !String(task.title).trim()) {
        validationErrors.push(`Task ${tIdx + 1}: thiếu title.`);
      }
      // Strip HTML tags for blank-check (content may be HTML from rich-text editor)
      const contentText = String(task.content || '').replace(/<[^>]*>/g, '').trim();
      if (!contentText) {
        validationErrors.push(`Task ${tIdx + 1}: thiếu content (prompt_text).`);
      }

      const minWords = Number(task.minWords);
      const safeMinWords = Number.isFinite(minWords) && minWords >= 50 ? minWords : taskNum === 1 ? 150 : 250;

      return {
        taskNumber: taskNum || tIdx + 1,
        title: String(task.title || '').trim(),
        content: String(task.content || '').trim(),
        minWords: safeMinWords,
      };
    });

    if (validationErrors.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'Dữ liệu không hợp lệ.',
        errors: validationErrors,
      });
    }

    const test = new WritingTest({
      title: title.trim(),
      description: String(description || '').trim(),
      tasks: normalizedTasks,
    });

    await test.save();

    return res.status(201).json({
      success: true,
      message: 'Import Writing test thành công.',
      data: { _id: test._id, title: test.title },
    });
  } catch (err) {
    console.error('[Writing] importJson error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server khi import.' });
  }
};
