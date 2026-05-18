process.env.JWT_SECRET = 'exam-test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { makeToken } = require('./helpers');

jest.mock('../src/controllers/exam.controller', () => {
  const ok = (name) => (req, res) => res.status(200).json({ success: true, handler: name });
  return {
    upload: { fields: jest.fn(() => (req, res, next) => next()) },
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

describe('Exam regression/security', () => {
  it('rejects malformed JWT', async () => {
    const res = await request(app).get('/exams').set('Authorization', 'Bearer malformed.token');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/token failed/i);
  });

  it('rejects token signed with wrong secret', async () => {
    const wrong = jwt.sign({ id: 'u', role: 'student' }, 'wrong-secret', { expiresIn: '1h' });
    const res = await request(app).get('/exams').set('Authorization', `Bearer ${wrong}`);
    expect(res.status).toBe(401);
  });

  it('rejects expired token', async () => {
    const expired = jwt.sign({ id: 'u', role: 'student' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
    const res = await request(app).get('/exams').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('rejects student access to teacher endpoints', async () => {
    const student = makeToken('student');
    const res = await request(app).post('/teacher/exams').set('Authorization', `Bearer ${student}`).send({ title: 'X' });
    expect(res.status).toBe(403);
  });

  it('allows admin role on teacher routes', async () => {
    const admin = makeToken('admin');
    const res = await request(app).get('/teacher/exams').set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('listTeacherExams');
  });

  it('SSE route rejects invalid query token', async () => {
    const res = await request(app).get('/teacher/exams/orchestrate-progress/job1?token=badtoken');
    expect(res.status).toBe(401);
  });
});
