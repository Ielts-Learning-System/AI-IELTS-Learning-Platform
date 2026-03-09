const ReadingTest = require('../models/ReadingTest');

// ====== Helper Function: Chuyển đổi số câu đúng thành Band điểm IELTS ======
const getBandScore = (totalCorrect) => {
  if (totalCorrect >= 39) return 9.0;
  if (totalCorrect >= 37) return 8.5;
  if (totalCorrect >= 35) return 8.0;
  if (totalCorrect >= 33) return 7.5;
  if (totalCorrect >= 30) return 7.0;
  if (totalCorrect >= 27) return 6.5;
  if (totalCorrect >= 24) return 6.0;
  if (totalCorrect >= 21) return 5.5;
  if (totalCorrect >= 18) return 5.0;
  if (totalCorrect >= 15) return 4.5;
  if (totalCorrect >= 13) return 4.0;
  return 3.5;
};

// ====== 1. Get All Tests ======
exports.getAllTests = async (req, res) => {
  try {
    const tests = await ReadingTest.find({}).select('_id title description createdAt');
    
    res.status(200).json({
      success: true,
      data: tests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đề thi',
      error: error.message,
    });
  }
};

// ====== 2. Get Test By ID (Ẩn đáp án) ======
exports.getTestById = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await ReadingTest.findById(id).select('-passages.questions.correctAnswer');

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
    });

    await newTest.save();

    res.status(201).json({
      success: true,
      message: 'Đề thi đã tạo thành công',
      data: newTest,
    });
  } catch (error) {
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
    const { answers } = req.body; // answers: [{ questionId, userAnswer }, ...]

    // Lấy đề thi đầy đủ (có đáp án)
    const test = await ReadingTest.findById(id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Đề thi không tìm thấy',
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'answers phải là một mảng',
      });
    }

    let totalCorrect = 0;
    const detailedResults = [];

    // Lặp qua passages và questions để so khớp
    test.passages.forEach((passage) => {
      passage.questions.forEach((question) => {
        // Tìm đáp án của user cho câu hỏi này
        const userAnswer = answers.find(
          (ans) => ans.questionId === question._id.toString()
        );

        const correctAnswer = question.correctAnswer.toLowerCase().trim();
        const userAnswerText = userAnswer
          ? userAnswer.userAnswer.toLowerCase().trim()
          : '';

        const isCorrect = userAnswerText === correctAnswer;

        if (isCorrect) {
          totalCorrect++;
        }

        detailedResults.push({
          questionId: question._id,
          passage: passage.title,
          questionText: question.questionText,
          userAnswer: userAnswerText,
          correctAnswer: question.correctAnswer,
          isCorrect,
        });
      });
    });

    // Tính Band Score
    const bandScore = getBandScore(totalCorrect);

    res.status(200).json({
      success: true,
      score: {
        totalCorrect,
        totalQuestions: detailedResults.length,
        bandScore,
        percentage: Math.round((totalCorrect / detailedResults.length) * 100),
      },
      detailedResults,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi chấm điểm',
      error: error.message,
    });
  }
};
