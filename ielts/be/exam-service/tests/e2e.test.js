process.env.JWT_SECRET = 'exam-test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { makeToken } = require('./helpers');

jest.mock('../src/controllers/exam.controller', () => {
  const ok = (name) => (req, res) => res.status(200).json({ success: true, handler: name, params: req.params });

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

describe('Exam E2E route flows', () => {
  const studentToken = makeToken('student');
  const teacherToken = makeToken('teacher');

  it('student flow: start exam -> start skill -> snapshot -> submit skill -> submit exam', async () => {
    const examId = 'exam123';
    const attemptId = 'attempt123';

    const start = await request(app)
      .post(`/exams/${examId}/start`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(start.status).toBe(200);
    expect(start.body.handler).toBe('startExam');

    const startSkill = await request(app)
      .post(`/attempts/${attemptId}/skills/reading/start`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(startSkill.status).toBe(200);
    expect(startSkill.body.handler).toBe('startSkill');

    const snapshot = await request(app)
      .put(`/attempts/${attemptId}/skills/reading/snapshot`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: { q1: 'A' } });
    expect(snapshot.status).toBe(200);
    expect(snapshot.body.handler).toBe('saveSkillSnapshot');

    const submitSkill = await request(app)
      .post(`/attempts/${attemptId}/skills/reading/submit`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(submitSkill.status).toBe(200);
    expect(submitSkill.body.handler).toBe('submitSkill');

    const submitExam = await request(app)
      .post(`/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(submitExam.status).toBe(200);
    expect(submitExam.body.handler).toBe('submitExam');
  });

  it('teacher flow: list exams -> create -> publish -> monitoring -> grade', async () => {
    const examId = 'exam777';
    const attemptId = 'attempt777';
    const userId = 'student777';

    const list = await request(app)
      .get('/teacher/exams')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(list.status).toBe(200);
    expect(list.body.handler).toBe('listTeacherExams');

    const create = await request(app)
      .post('/teacher/exams')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Mock exam' });
    expect(create.status).toBe(200);
    expect(create.body.handler).toBe('createExam');

    const publish = await request(app)
      .post(`/teacher/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(publish.status).toBe(200);
    expect(publish.body.handler).toBe('publishExam');

    const monitoring = await request(app)
      .get('/teacher/monitoring/attempts')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(monitoring.status).toBe(200);
    expect(monitoring.body.handler).toBe('listMonitoringAttempts');

    const studentAttempts = await request(app)
      .get(`/teacher/students/${userId}/attempts`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(studentAttempts.status).toBe(200);
    expect(studentAttempts.body.handler).toBe('getStudentAttempts');

    const grade = await request(app)
      .post(`/teacher/attempts/${attemptId}/grade`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ overall: 7.0 });
    expect(grade.status).toBe(200);
    expect(grade.body.handler).toBe('gradeAttempt');
  });
});
