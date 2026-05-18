process.env.JWT_SECRET = 'exam-test-secret';
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const Exam = require('../src/models/Exam');
const ExamAttempt = require('../src/models/ExamAttempt');
const SkillAttempt = require('../src/models/SkillAttempt');

describe('Exam service schemas', () => {
  it('creates valid Exam with defaults', async () => {
    const exam = await Exam.create({
      title: 'Mock IELTS Test 01',
      skillRefs: {
        readingId: 'read-1',
        listeningId: 'listen-1',
        writingId: 'write-1',
        speakingId: 'speak-1',
      },
      createdBy: 'teacher-1',
    });

    expect(exam.status).toBe('DRAFT');
    expect(exam.durationMinutes).toBe(165);
    expect(exam.globalLimitHours).toBe(24);
    expect(exam.skillDurations.reading).toBe(60);
  });

  it('rejects invalid exam status', async () => {
    await expect(
      Exam.create({
        title: 'Bad',
        skillRefs: {
          readingId: 'r',
          listeningId: 'l',
          writingId: 'w',
          speakingId: 's',
        },
        createdBy: 'teacher-1',
        status: 'INVALID',
      })
    ).rejects.toThrow();
  });

  it('creates valid ExamAttempt with IN_PROGRESS default', async () => {
    const exam = await Exam.create({
      title: 'Exam',
      skillRefs: { readingId: 'r', listeningId: 'l', writingId: 'w', speakingId: 's' },
      createdBy: 'teacher-1',
    });

    const now = new Date();
    const end = new Date(now.getTime() + 24 * 3600 * 1000);

    const attempt = await ExamAttempt.create({
      examId: exam._id,
      userId: 'student-1',
      globalStartTime: now,
      globalEndTime: end,
    });

    expect(attempt.status).toBe('IN_PROGRESS');
    expect(attempt.overallBandScores).toBeDefined();
  });

  it('creates valid SkillAttempt and enforces unique examAttemptId+skillType', async () => {
    await SkillAttempt.init();

    const exam = await Exam.create({
      title: 'Exam',
      skillRefs: { readingId: 'r', listeningId: 'l', writingId: 'w', speakingId: 's' },
      createdBy: 'teacher-1',
    });

    const now = new Date();
    const end = new Date(now.getTime() + 24 * 3600 * 1000);
    const attempt = await ExamAttempt.create({
      examId: exam._id,
      userId: 'student-1',
      globalStartTime: now,
      globalEndTime: end,
    });

    await SkillAttempt.create({
      examAttemptId: attempt._id,
      examId: exam._id,
      userId: 'student-1',
      skillType: 'reading',
      skillRefId: 'r',
    });

    await expect(
      SkillAttempt.create({
        examAttemptId: attempt._id,
        examId: exam._id,
        userId: 'student-1',
        skillType: 'reading',
        skillRefId: 'r2',
      })
    ).rejects.toThrow();
  });

  it('rejects invalid skillType enum', async () => {
    const oid = new mongoose.Types.ObjectId();
    await expect(
      SkillAttempt.create({
        examAttemptId: oid,
        examId: oid,
        userId: 'student-1',
        skillType: 'grammar',
        skillRefId: 'g-1',
      })
    ).rejects.toThrow();
  });
});
