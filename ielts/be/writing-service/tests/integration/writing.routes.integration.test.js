const request = require('supertest');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

const app = require('../../app');
const Writing = require('../../src/models/Writing');
const WritingSubmission = require('../../src/models/writingSubmission.model');
const { generateTestToken } = require('../helpers');
require('../setup');

describe('Writing Routes — Integration', () => {
  const teacherId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  let teacherToken;
  let studentToken;

  beforeAll(() => {
    teacherToken = generateTestToken(teacherId.toString(), 'Teacher');
    studentToken = generateTestToken(studentId.toString(), 'Student');
  });

  // ============================================================
  // GET / — list all writing tests
  // ============================================================
  describe('GET /', () => {
    it('should return all writing tests', async () => {
      await Writing.create({
        title: 'Task 2 Essay',
        type: 'Task 2',
        contentHtml: '<p>Discuss both views</p>',
      });

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });

  // ============================================================
  // GET /items — list with filters
  // ============================================================
  describe('GET /items', () => {
    beforeEach(async () => {
      await Writing.create([
        { title: 'Task 1 Letter', type: 'Task 1', contentHtml: '<p>Letter</p>', isSample: false },
        { title: 'Task 2 Essay', type: 'Task 2', contentHtml: '<p>Essay</p>', isSample: true },
      ]);
    });

    it('should return all items', async () => {
      const res = await request(app).get('/items');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should filter by type', async () => {
      const res = await request(app).get('/items?type=Task 1');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].type).toBe('Task 1');
    });

    it('should filter by isSample', async () => {
      const res = await request(app).get('/items?isSample=true');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].isSample).toBe(true);
    });
  });

  // ============================================================
  // POST / — create writing test (teacher only)
  // ============================================================
  describe('POST /', () => {
    it('should create a writing test as teacher', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'New Essay',
          type: 'Task 2',
          contentHtml: '<p>Write about...</p>',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New Essay');
    });

    it('should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ title: 'No content' });

      expect(res.status).toBe(400);
    });

    it('should return 403 for student', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Hack', type: 'Task 2', contentHtml: '<p>X</p>' });

      expect(res.status).toBe(403);
    });
  });

  // ============================================================
  // POST /submissions — student submits writing
  // ============================================================
  describe('POST /submissions', () => {
    let writingId;

    beforeEach(async () => {
      const writing = await Writing.create({
        title: 'Essay Prompt',
        type: 'Task 2',
        contentHtml: '<p>Discuss...</p>',
      });
      writingId = writing._id.toString();
    });

    it('should submit writing successfully', async () => {
      const res = await request(app)
        .post('/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          writingId,
          taskType: 'Task 2',
          content: '<p>This is my essay about education. It has enough words to be meaningful.</p>',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.wordCount).toBeGreaterThan(0);
    });

    it('should return 400 if fields are missing', async () => {
      const res = await request(app)
        .post('/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ writingId });

      expect(res.status).toBe(400);
    });

    it('should return 404 if writing prompt does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          writingId: fakeId.toString(),
          taskType: 'Task 2',
          content: 'Some content',
        });

      expect(res.status).toBe(404);
    });

    it('should return 400 if taskType does not match prompt', async () => {
      const res = await request(app)
        .post('/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          writingId,
          taskType: 'Task 1', // prompt is Task 2
          content: 'Some content',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/does not match/i);
    });
  });

  // ============================================================
  // PUT /submissions/:id/grade — teacher grades
  // ============================================================
  describe('PUT /submissions/:id/grade', () => {
    let submissionId;

    beforeEach(async () => {
      const writing = await Writing.create({
        title: 'Grade Me',
        type: 'Task 2',
        contentHtml: '<p>Essay</p>',
      });

      const submission = await WritingSubmission.create({
        studentId,
        writingId: writing._id,
        taskType: 'Task 2',
        content: '<p>My essay response</p>',
        wordCount: 250,
      });
      submissionId = submission._id.toString();
    });

    it('should grade a submission successfully', async () => {
      const res = await request(app)
        .put(`/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          criteria: { TR: 7, CC: 6.5, LR: 7, GRA: 6 },
          teacherFeedback: 'Good effort, improve grammar.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Graded');
      expect(res.body.data.grading.overallBand).toBeDefined();
      expect(res.body.data.grading.criteria.TR).toBe(7);
    });

    it('should return 400 if criteria is missing', async () => {
      const res = await request(app)
        .put(`/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ teacherFeedback: 'No criteria' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if score is out of range', async () => {
      const res = await request(app)
        .put(`/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          criteria: { TR: 10, CC: 6, LR: 7, GRA: 6 }, // TR > 9
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/between 0 and 9/i);
    });

    it('should return 404 for non-existent submission', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/submissions/${fakeId}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ criteria: { TR: 7, CC: 7, LR: 7, GRA: 7 } });

      expect(res.status).toBe(404);
    });

    it('should return 403 for student trying to grade', async () => {
      const res = await request(app)
        .put(`/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ criteria: { TR: 7, CC: 7, LR: 7, GRA: 7 } });

      expect(res.status).toBe(403);
    });
  });
});
