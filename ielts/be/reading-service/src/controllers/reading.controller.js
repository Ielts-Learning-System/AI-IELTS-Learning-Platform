const ReadingTest = require('../models/ReadingTest');
const ReadingAttempt = require('../models/attempt.model');
const { convertRawToBand } = require('../utils/scoreConverter');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ====== Dynamic Gemini key helper ======
// Fetches the API key from auth-service DB config (set by admin).
// Falls back to GEMINI_API_KEY env var if the internal endpoint is unavailable.
async function _getGeminiClient() {
  const authUrl = process.env.AUTH_SERVICE_INTERNAL_URL || 'http://auth-service:3001';
  const secret = process.env.INTERNAL_SECRET || '';
  try {
    const resp = await fetch(`${authUrl}/api/internal/system-config`, {
      headers: { 'x-internal-secret': secret },
    });
    if (resp.ok) {
      const cfg = await resp.json();
      const key = (cfg.geminiApiKey || '').trim();
      if (key) return new GoogleGenerativeAI(key);
    }
  } catch (err) {
    console.warn('[Reading] Could not fetch AI config from auth-service:', err.message);
  }
  // fallback to env var
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!envKey) throw new Error('Gemini API key is not configured. Please set it in Admin → AI Manager.');
  return new GoogleGenerativeAI(envKey);
}

const normalizeAnswer = (value) => String(value || '').trim().toLowerCase();

// ====== 1. Get All Tests (Pagination) ======
exports.getAllTests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [tests, totalResult] = await Promise.all([
      ReadingTest.aggregate([
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            isPublished: 1,
            createdAt: 1,
            createdBy: 1,
            passageCount: { $size: { $ifNull: ['$passages', []] } },
            totalQuestionCount: {
              $reduce: {
                input: { $ifNull: ['$passages', []] },
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
      ReadingTest.countDocuments({}),
    ]);

    const total = totalResult;

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
    console.error('❌ Get All Tests Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đề thi',
      error: error.message,
    });
  }
};

// ====== 2. Get Test By ID (Full Details) ======
exports.getTestById = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await ReadingTest.findById(id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Đề thi không tìm thấy',
      });
    }

    res.status(200).json({
      success: true,
      data: test,
    });
  } catch (error) {
    console.error('❌ Get Test By ID Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết đề thi',
      error: error.message,
    });
  }
};

// ====== 3. Create Test (Admin/Teacher) ======
exports.createTest = async (req, res) => {
  try {
    const { title, description, passages } = req.body;
    const userId = req.user.id;

    if (!title || !passages || passages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu title hoặc passages',
      });
    }

    const newTest = new ReadingTest({
      title,
      description: description || '',
      passages,
      createdBy: userId,
      isPublished: false,
    });

    await newTest.save();

    res.status(201).json({
      success: true,
      message: 'Đề thi đã tạo thành công',
      data: newTest,
    });
  } catch (error) {
    console.error('❌ Create Test Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đề thi',
      error: error.message,
    });
  }
};

// ====== 4. Submit Test & Score It ======
exports.submitTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentAnswers, timeSpent } = req.body;

    const test = await ReadingTest.findById(id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Đề thi không tìm thấy',
      });
    }

    if (!Array.isArray(studentAnswers)) {
      return res.status(400).json({
        success: false,
        message: 'studentAnswers phải là một mảng',
      });
    }

    const correctAnswers = test.passages.flatMap((passage) =>
      passage.questions.map((question) => question.correctAnswer)
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

    const bandScore = convertRawToBand(rawScore, 'reading');

    const attempt = await ReadingAttempt.create({
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

    const populatedAttempt = await ReadingAttempt.findById(attempt._id).populate(
      'testId',
      'title'
    );

    res.status(201).json({
      success: true,
      data: populatedAttempt,
    });
  } catch (error) {
    console.error('❌ Submit Test Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi chấm điểm',
      error: error.message,
    });
  }
};

// ====== 4.1. Get Auto-Graded Attempts ======
exports.getAttempts = async (req, res) => {
  try {
    const attempts = await ReadingAttempt.find({})
      .populate('testId', 'title')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    console.error('❌ Get Reading Attempts Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách kết quả auto-graded Reading',
      error: error.message,
    });
  }
};

exports.getMyAttempts = async (req, res) => {
  try {
    const attempts = await ReadingAttempt.find({ studentId: req.user.id })
      .populate('testId', 'title')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    console.error('❌ Get My Reading Attempts Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử làm bài Reading',
      error: error.message,
    });
  }
};

exports.getAttemptStats = async (req, res) => {
  try {
    const [totalAttempts, stats] = await Promise.all([
      ReadingAttempt.countDocuments({}),
      ReadingAttempt.aggregate([
        {
          $group: {
            _id: null,
            avgBandScore: { $avg: '$bandScore' },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalAttempts,
        avgBandScore: Number((stats?.[0]?.avgBandScore || 0).toFixed(2)),
      },
    });
  } catch (error) {
    console.error('❌ Get Reading Attempt Stats Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê Reading attempts',
      error: error.message,
    });
  }
};

// ====== 5. Update Test ======
exports.updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, passages, isPublished } = req.body;
    const userId = req.user.id;

    // Kiểm tra đề thi tồn tại
    const test = await ReadingTest.findById(id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Đề thi không tìm thấy',
      });
    }

    // Chỉ cho phép chủ sở hữu hoặc admin sửa
    if (test.createdBy.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền sửa đề thi này',
      });
    }

    // Cập nhật các trường được phép
    if (title) test.title = title;
    if (description !== undefined) test.description = description;
    if (passages) test.passages = passages;
    if (isPublished !== undefined) test.isPublished = isPublished;

    await test.save();

    res.status(200).json({
      success: true,
      message: 'Đề thi đã cập nhật thành công',
      data: test,
    });
  } catch (error) {
    console.error('❌ Update Test Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật đề thi',
      error: error.message,
    });
  }
};

// ====== 6. Delete Test ======
exports.deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Kiểm tra đề thi tồn tại
    const test = await ReadingTest.findById(id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Đề thi không tìm thấy',
      });
    }

    // Chỉ cho phép chủ sở hữu hoặc admin xóa
    if (test.createdBy.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa đề thi này',
      });
    }

    await ReadingTest.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Đề thi đã xóa thành công',
    });
  } catch (error) {
    console.error('❌ Delete Test Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa đề thi',
      error: error.message,
    });
  }
};

// ====== 7. Generate Test From AI (Generative AI Test Creation) ======
exports.generateTestFromAI = async (req, res) => {
  try {
    const { bandScore, keywords, passageType } = req.body;

    // Validate passageType
    if (!['1', '2', '3'].includes(String(passageType))) {
      return res.status(400).json({
        success: false,
        message: 'passageType phải là "1", "2", hoặc "3"',
      });
    }

    // Validate bandScore
    if (!bandScore) {
      return res.status(400).json({
        success: false,
        message: 'bandScore là bắt buộc',
      });
    }

    // Define passage specifications based on type
    const passageSpecs = {
      '1': {
        title: 'Passage 1: Factual & Descriptive Text',
        wordCount: '700-800',
        questionCount: 13,
        questionTypes: 'True/False/Not Given (TFNG) and Note Completion (FILL_IN_BLANK)',
        difficulty: 'Factual/descriptive language (easier)',
      },
      '2': {
        title: 'Passage 2: Discursive & Complex Text',
        wordCount: '800-900',
        questionCount: 13,
        questionTypes: 'Matching Headings (MATCHING) and Multiple Choice (MULTIPLE_CHOICE)',
        difficulty: 'Discursive/complex information (medium)',
      },
      '3': {
        title: 'Passage 3: Academic & Argumentative Text',
        wordCount: '800-950',
        questionCount: 14,
        questionTypes: 'Yes/No/Not Given (YNNG) and Matching Features (MATCHING)',
        difficulty: 'Academic/argumentative (challenging)',
      },
    };

    const spec = passageSpecs[passageType];
    const topicKeyword = keywords && keywords.trim() ? keywords : 'general IELTS topics';

    // Construct prompt for Gemini to return JSON
    const prompt = `You are an expert IELTS examiner. Create a Reading ${spec.title}.

REQUIREMENTS:
- Word count for passage: ${spec.wordCount} words
- Number of questions: exactly ${spec.questionCount}
- Question types: ${spec.questionTypes}
- Target band score: ${bandScore}
- Topic/Keywords: ${topicKeyword}
- Difficulty level: ${spec.difficulty}

OUTPUT REQUIREMENTS (CRITICAL - respond ONLY with raw JSON, no markdown):
Return a JSON object with this exact structure:
{
  "title": "Title of the passage",
  "passageContent": "HTML string for the reading text only (no questions) - use clean HTML like <p>, <h2>, <strong>, etc.",
  "questions": [
    {
      "questionNumber": 1,
      "type": "TFNG | MULTIPLE_CHOICE | MATCHING | FILL_IN_BLANK | YNNG",
      "text": "The question text",
      "options": ["Option A", "Option B"], // Only include for MULTIPLE_CHOICE or MATCHING, empty array [] for others
      "correctAnswer": "TRUE",
      "explanation": "Why this is the answer"
    }
  ]
}

IMPORTANT:
- passageContent must be clean HTML without questions
- Generate exactly ${spec.questionCount} questions
- Use the exact type enums: TFNG, MULTIPLE_CHOICE, MATCHING, FILL_IN_BLANK, YNNG
- Do NOT wrap in markdown code blocks or \`\`\`json
- Return only the raw JSON object`;

    console.log('🤖 Calling Google Gemini API for passage type:', passageType);
    const genAI = await _getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log('📝 Response length:', responseText.length);

    // Clean up response (remove markdown code blocks if present)
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('Response content:', cleanedText);
      return res.status(400).json({
        success: false,
        message: 'AI không thể tạo đúng định dạng JSON. Vui lòng thử lại.',
        details: parseError.message,
      });
    }

    // Validate parsed data structure
    if (!parsedData.title || !parsedData.passageContent || !Array.isArray(parsedData.questions)) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu tạo không hợp lệ. Thiếu title, passageContent hoặc questions.',
      });
    }

    // Validate question count
    if (parsedData.questions.length !== spec.questionCount) {
      return res.status(400).json({
        success: false,
        message: `Số câu hỏi phải là ${spec.questionCount}, nhưng nhận được ${parsedData.questions.length}.`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Test generated successfully!',
      data: {
        title: parsedData.title,
        passageContent: parsedData.passageContent,
        questions: parsedData.questions,
        metadata: {
          passageType,
          bandScore,
          keywords,
        },
      },
    });
  } catch (error) {
    console.error('❌ Generate Test From AI Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error generating test with AI',
      error: error.message,
    });
  }
};

// ====== 8. Extract Test From Image (Google Gemini AI) ======
exports.extractTestFromImage = async (req, res) => {
  try {
    // Verify file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng tải lên một file',
      });
    }

    console.log('📁 File nhận được:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    // Convert file to base64
    const base64Data = req.file.buffer.toString('base64');
    const filePart = {
      inlineData: {
        data: base64Data,
        mimeType: req.file.mimetype,
      },
    };

    // Initialize Gemini model
    const genAI = await _getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Crafted prompt for IELTS test extraction
    const prompt = `Bạn là chuyên gia ra đề IELTS. Hãy đọc hình ảnh/tài liệu này và trích xuất nội dung thành ĐÚNG định dạng JSON sau, tuyệt đối KHÔNG có markdown json bao quanh, chỉ trả về JSON thuần túy:

{
  "title": "Tên đề bài dự đoán",
  "passages": [
    {
      "passageNumber": 1,
      "title": "Tiêu đề đoạn văn",
      "content": "Nội dung bài đọc...",
      "questions": [
        {
          "questionNumber": 1,
          "type": "MULTIPLE_CHOICE",
          "text": "Nội dung câu hỏi",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A"
        }
      ]
    }
  ]
}

LƯU Ý:
- Nếu là dạng Fill in Blank, options để rỗng mảng []
- Nếu là dạng Matching hoặc True/False/Not Given, điều chỉnh type và options tương ứng
- Phân tích thật chính xác từ tài liệu
- Đếm đúng số câu hỏi và tiêu đề passages
- Trả về JSON hợp lệ, không có ký tự thừa`;

    // Call Gemini API
    console.log('🤖 Gọi Google Gemini API...');
    const result = await model.generateContent([prompt, filePart]);
    const responseText = result.response.text();

    console.log('📝 Response từ Gemini:', responseText.substring(0, 200) + '...');

    // Clean up response (remove markdown code blocks if present)
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('Response content:', cleanedText);
      return res.status(400).json({
        success: false,
        message: 'AI không thể nhận diện đúng định dạng. Vui lòng thử file khác hoặc nhập thủ công.',
        details: parseError.message,
      });
    }

    // Validate parsed data structure
    if (!parsedData.title || !Array.isArray(parsedData.passages)) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu trích xuất không hợp lệ. Thiếu title hoặc passages.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Trích xuất đề thi thành công!',
      data: parsedData,
    });
  } catch (error) {
    console.error('❌ Extract Test Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý file với AI',
      error: error.message,
    });
  }
};
