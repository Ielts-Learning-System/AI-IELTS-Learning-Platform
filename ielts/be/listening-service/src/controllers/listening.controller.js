const ListeningTest = require('../models/ListeningTest');
const ListeningAttempt = require('../models/attempt.model');
const { convertRawToBand } = require('../utils/scoreConverter');

const normalizeAnswer = (value) => String(value || '').trim().toLowerCase();

// Get all tests (with partCount & totalQuestionCount)
exports.getAllTests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [tests, total] = await Promise.all([
      ListeningTest.aggregate([
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            createdAt: 1,
            partCount: { $size: { $ifNull: ['$parts', []] } },
            totalQuestionCount: {
              $reduce: {
                input: { $ifNull: ['$parts', []] },
                initialValue: 0,
                in: {
                  $add: [
                    '$$value',
                    { $size: { $ifNull: ['$$this.questions', []] } },
                  ],
                },
              },
            },
          },
        },
      ]),
      ListeningTest.countDocuments({}),
    ]);

    res.status(200).json({
      success: true,
      data: tests,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ Get All Listening Tests Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đề thi Listening',
      error: error.message,
    });
  }
};

// Get test by ID (hide correct answers)
exports.getTestById = async (req, res) => {
  try {
    const test = await ListeningTest.findById(req.params.id)
      .select('-parts.questions.correctAnswer');
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new test
exports.createTest = async (req, res) => {
  try {
    const test = new ListeningTest(req.body);
    await test.save();
    res.status(201).json(test);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update existing test
exports.updateTest = async (req, res) => {
  try {
    const test = await ListeningTest.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json(test);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete test
exports.deleteTest = async (req, res) => {
  try {
    const test = await ListeningTest.findByIdAndDelete(req.params.id);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json({ success: true, message: 'Đề thi Listening đã được xóa' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Submit test answers
exports.submitTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentAnswers, timeSpent } = req.body;

    if (!Array.isArray(studentAnswers)) {
      return res.status(400).json({
        success: false,
        message: 'studentAnswers phải là một mảng',
      });
    }

    const test = await ListeningTest.findById(id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found',
      });
    }

    const correctAnswers = test.parts.flatMap((part) =>
      part.questions.map((question) => question.correctAnswer)
    );

    let rawScore = 0;
    const details = correctAnswers.map((correctAnswer, index) => {
      const studentAnswer = String(studentAnswers[index] || '');
      const isCorrect =
        normalizeAnswer(studentAnswer) === normalizeAnswer(correctAnswer);

      if (isCorrect) {
        rawScore++;
      }

      return {
        questionIndex: index + 1,
        studentAnswer,
        correctAnswer: String(correctAnswer || ''),
        isCorrect,
      };
    });

    const bandScore = convertRawToBand(rawScore, 'listening');

    const attempt = await ListeningAttempt.create({
      testId: test._id,
      studentId: req.user.id,
      studentAnswers: studentAnswers.map((answer) => String(answer || '')),
      rawScore,
      bandScore,
      timeSpent: Number.isFinite(Number(timeSpent))
        ? Math.max(0, Number(timeSpent))
        : 0,
      details,
    });

    const populatedAttempt = await ListeningAttempt.findById(attempt._id).populate(
      'testId',
      'title'
    );

    res.status(201).json({
      success: true,
      data: populatedAttempt,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi chấm điểm bài Listening',
      error: error.message,
    });
  }
};

// Get all auto-graded listening attempts
exports.getAttempts = async (req, res) => {
  try {
    const attempts = await ListeningAttempt.find({})
      .populate('testId', 'title')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách kết quả auto-graded Listening',
      error: error.message,
    });
  }
};

