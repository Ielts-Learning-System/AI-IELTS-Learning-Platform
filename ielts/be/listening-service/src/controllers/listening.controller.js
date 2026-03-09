const ListeningTest = require('../models/ListeningTest');

// Helper function to calculate IELTS band score
const calculateBandScore = (correctAnswers) => {
  if (correctAnswers >= 39) return 9.0;
  if (correctAnswers >= 37) return 8.5;
  if (correctAnswers >= 35) return 8.0;
  if (correctAnswers >= 32) return 7.5;
  if (correctAnswers >= 30) return 7.0;
  if (correctAnswers >= 26) return 6.5;
  if (correctAnswers >= 23) return 6.0;
  if (correctAnswers >= 18) return 5.5;
  if (correctAnswers >= 15) return 5.0;
  if (correctAnswers >= 13) return 4.5;
  if (correctAnswers >= 10) return 4.0;
  if (correctAnswers >= 8) return 3.5;
  if (correctAnswers >= 6) return 3.0;
  if (correctAnswers >= 4) return 2.5;
  if (correctAnswers >= 2) return 2.0;
  if (correctAnswers >= 0) return 1.5;
  return 1.0;
};

// Get all tests (only _id, title, description)
exports.getAllTests = async (req, res) => {
  try {
    const tests = await ListeningTest.find({}, '_id title description');
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Submit test answers
exports.submitTest = async (req, res) => {
  try {
    const { testId, answers } = req.body; // answers should be an array of objects: [{ partNumber, questionIndex, answer }]

    const test = await ListeningTest.findById(testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    let totalCorrect = 0;
    const results = [];

    // Process each part
    test.parts.forEach((part, partIndex) => {
      const partResults = {
        partNumber: part.partNumber,
        title: part.title,
        questions: []
      };

      part.questions.forEach((question, questionIndex) => {
        const userAnswer = answers.find(a =>
          a.partNumber === part.partNumber && a.questionIndex === questionIndex
        );

        const submittedAnswer = userAnswer ? userAnswer.answer.toLowerCase().trim() : '';
        const correctAnswer = question.correctAnswer.toLowerCase().trim();
        const isCorrect = submittedAnswer === correctAnswer;

        if (isCorrect) totalCorrect++;

        partResults.questions.push({
          questionIndex,
          submittedAnswer: userAnswer ? userAnswer.answer : '',
          correctAnswer: question.correctAnswer,
          isCorrect
        });
      });

      results.push(partResults);
    });

    const bandScore = calculateBandScore(totalCorrect);

    res.json({
      totalCorrect,
      totalQuestions: 40, // Assuming 40 questions total
      bandScore,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

