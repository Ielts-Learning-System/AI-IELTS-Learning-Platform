process.env.JWT_SECRET = 'lesson-test-secret';
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const Lesson = require('../src/models/lesson.model');

describe('Lesson schema', () => {
  const teacherId = new mongoose.Types.ObjectId();

  it('creates valid lesson with defaults', async () => {
    const lesson = await Lesson.create({
      title: 'IELTS Writing Task 2 Intro',
      description: 'Lesson description',
      videoUrl: 'https://cdn.example/video.mp4',
      teacherId,
    });

    expect(lesson._id).toBeDefined();
    expect(lesson.videoType).toBe('cloudinary');
    expect(lesson.status).toBe('Published');
  });

  it('rejects missing required fields', async () => {
    await expect(Lesson.create({ title: 'No fields' })).rejects.toThrow();
  });

  it('accepts youtube videoType', async () => {
    const lesson = await Lesson.create({
      title: 'YouTube lesson',
      description: 'Desc',
      videoUrl: 'https://youtube.com/watch?v=abc',
      videoType: 'youtube',
      teacherId,
    });

    expect(lesson.videoType).toBe('youtube');
  });

  it('rejects invalid videoType enum', async () => {
    await expect(
      Lesson.create({
        title: 'Bad type',
        description: 'Desc',
        videoUrl: 'https://example.com/x.mp4',
        teacherId,
        videoType: 'vimeo',
      })
    ).rejects.toThrow();
  });
});
