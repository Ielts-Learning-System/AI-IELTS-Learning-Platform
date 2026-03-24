const request = require('supertest');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

const app = require('../../app');
const SpeakingTest = require('../../src/models/SpeakingTest');
const SpeakingSubmission = require('../../src/models/SpeakingSubmission');
const { generateTestToken } = require('../helpers');
require('../setup');

describe('Speaking Routes — Integration', () => {
  const teacherId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  let teacherToken;
  let studentToken;

  beforeAll(() => {
    teacherToken = generateTestToken(teacherId.toString(), 'teacher');
    studentToken = generateTestToken(studentId.toString(), 'student');
  });

  // ============================================================
  // GET /tests — list all speaking tests
  // ============================================================
  describe('GET /tests', () => {
    it('should return all speaking tests', async () => {
      await SpeakingTest.create({
        title: 'Speaking Test 1',
        part1: ['What is your name?', 'Where are you from?'],
        part2: 'Describe a book you recently read',
        part3: ['Do you think reading is important?'],
      });

      const res = await request(app).get('/tests');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
  });

  // ============================================================
  // POST /tests — create speaking test (teacher)
  // ============================================================
  describe('POST /tests', () => {
    it('should create a speaking test', async () => {
      const res = await request(app)
        .post('/tests')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'New Speaking Test',
          part1: ['Tell me about yourself'],
          part2: 'Describe your favorite place',
          part3: ['Why do people travel?'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New Speaking Test');
    });

    it('should return 400 if title missing', async () => {
      const res = await request(app)
        .post('/tests')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          part1: ['Q1'],
          part2: 'Cue card',
          part3: ['Q3'],
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 if part1 is empty', async () => {
      const res = await request(app)
        .post('/tests')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Test',
          part1: [],
          part2: 'Cue card',
          part3: ['Q3'],
        });

      expect(res.status).toBe(400);
    });

    it('should return 403 for student', async () => {
      const res = await request(app)
        .post('/tests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Hack',
          part1: ['Q1'],
          part2: 'Card',
          part3: ['Q3'],
        });

      expect(res.status).toBe(403);
    });
  });

  // ============================================================
  // PUT /:id/submit — submit audio
  // ============================================================
  describe('PUT /:id/submit', () => {
    let submissionId;

    beforeEach(async () => {
      const submission = await SpeakingSubmission.create({
        studentId,
        questions: ['Describe your hometown'],
        status: 'Pending',
      });
      submissionId = submission._id.toString();
    });

    it('should submit audio URL', async () => {
      const res = await request(app)
        .put(`/${submissionId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ audioUrl: 'https://cloudinary.com/audio/test.mp3' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.audioUrl).toBe('https://cloudinary.com/audio/test.mp3');
    });

    it('should return 400 if audioUrl is missing', async () => {
      const res = await request(app)
        .put(`/${submissionId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent submission', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/${fakeId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ audioUrl: 'https://example.com/audio.mp3' });

      expect(res.status).toBe(404);
    });

    it('should return 403 if different student tries', async () => {
      const otherStudentId = new mongoose.Types.ObjectId();
      const otherToken = generateTestToken(otherStudentId.toString(), 'student');

      const res = await request(app)
        .put(`/${submissionId}/submit`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ audioUrl: 'https://example.com/audio.mp3' });

      expect(res.status).toBe(403);
    });
  });

  // ============================================================
  // PUT /:id/grade — teacher grades speaking
  // ============================================================
  describe('PUT /:id/grade', () => {
    let submissionId;

    beforeEach(async () => {
      const submission = await SpeakingSubmission.create({
        studentId,
        questions: ['Describe a trip'],
        status: 'Pending',
        audioUrl: 'https://cloudinary.com/audio/speaking.mp3',
      });
      submissionId = submission._id.toString();
    });

    it('should grade a speaking submission successfully', async () => {
      const res = await request(app)
        .put(`/${submissionId}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          criteria: { FC: 7, LR: 6.5, GRA: 7, PR: 6 },
          teacherFeedback: 'Good fluency, work on pronunciation.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Graded');
      expect(res.body.data.grading.overallBand).toBeDefined();
    });

    it('should return 400 if criteria missing', async () => {
      const res = await request(app)
        .put(`/${submissionId}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 if scores out of range', async () => {
      const res = await request(app)
        .put(`/${submissionId}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          criteria: { FC: 10, LR: 7, GRA: 7, PR: 7 },
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 if no audio submitted yet', async () => {
      const noAudioSub = await SpeakingSubmission.create({
        studentId,
        questions: ['Question'],
        status: 'Pending',
        audioUrl: '',
      });

      const res = await request(app)
        .put(`/${noAudioSub._id}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          criteria: { FC: 7, LR: 7, GRA: 7, PR: 7 },
        });

      expect(res.status).toBe(400);
    });
  });
});
