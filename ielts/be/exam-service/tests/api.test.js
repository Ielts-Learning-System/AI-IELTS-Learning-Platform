process.env.JWT_SECRET = 'exam-test-secret';
process.env.NODE_ENV = 'test';

jest.mock('../src/controllers/exam.controller', () => {
  const ok = (name) => (req, res) => res.status(200).json({ success: true, handler: name });

  return {
    upload: {
      fields: jest.fn(() => (req, res, next) => next()),
    },
    listStudentExams: ok('listStudentExams'),
    startExam: ok('startExam'),
    getAttempt: ok('getAttempt'),
    startSkill: ok('startSkill'),
    saveSkillSnapshot: ok('saveSkillSnapshot'),
    submitSkill: ok('submitSkill'),
    submitExam: ok('submitExam'),
    listTeacherExams: ok('listTeacherExams'),
    orchestrateProgress: ok('orchestrateProgress'),
    createExam: ok('createExam'),
    publishExam: ok('publishExam'),
    deleteExam: ok('deleteExam'),
    createExamFromPdf: ok('createExamFromPdf'),
    listMonitoringAttempts: ok('listMonitoringAttempts'),
    getStudentAttempts: ok('getStudentAttempts'),
    getAttemptForTeacher: ok('getAttemptForTeacher'),
    gradeAttempt: ok('gradeAttempt'),
  };
});

const request = require('supertest');
const app = require('../app');
const { makeToken } = require('./helpers');

describe('Exam API routing/auth', () => {
  const studentToken = makeToken('student');
  const teacherToken = makeToken('teacher');

  it('GET /health returns service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.service).toBe('exam-service');
  });

  it('student can access student routes', async () => {
    const res = await request(app).get('/exams').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('listStudentExams');
  });

  it('requires auth on protected routes', async () => {
    const res = await request(app).get('/exams');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('teacher/admin routes reject student', async () => {
    const res = await request(app)
      .get('/teacher/exams')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it('teacher can access teacher routes', async () => {
    const res = await request(app)
      .get('/teacher/exams')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('listTeacherExams');
  });

  it('SSE progress route accepts token via query parameter', async () => {
    const token = makeToken('teacher');
    const res = await request(app).get(`/teacher/exams/orchestrate-progress/job-1?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('orchestrateProgress');
  });

  it('upload orchestration route resolves upload middleware then controller', async () => {
    const res = await request(app)
      .post('/teacher/exams/orchestrate-pdf')
      .set('Authorization', `Bearer ${teacherToken}`)
      .field('meta', 'x');

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('createExamFromPdf');
  });
});
