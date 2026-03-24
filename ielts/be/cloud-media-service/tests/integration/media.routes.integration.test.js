const request = require('supertest');
const path = require('path');

// Must set env vars before requiring app (cloudinary config validates them)
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = '111111111111111';
process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
process.env.NODE_ENV = 'test';

// Mock Cloudinary before requiring app
jest.mock('cloudinary', () => {
  const mockUploadStream = {
    end: jest.fn(),
  };

  return {
    v2: {
      config: jest.fn(),
      uploader: {
        upload_stream: jest.fn((options, callback) => {
          // Simulate successful upload by calling callback asynchronously
          const { Writable } = require('stream');
          const writable = new Writable({
            write(chunk, encoding, done) {
              done();
            },
          });
          writable.on('finish', () => {
            callback(null, {
              secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/test.jpg',
              public_id: 'ielts_platform/test',
              format: 'jpg',
              resource_type: 'image',
              bytes: 12345,
            });
          });
          return writable;
        }),
        destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
      },
      utils: {
        api_sign_request: jest.fn().mockReturnValue('mock-signature-123'),
      },
    },
  };
});

const app = require('../../app');

describe('Cloud Media Routes — Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // GET /health
  // ============================================================
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/healthy/);
    });
  });

  // ============================================================
  // POST /api/media/upload — upload file via multer
  // ============================================================
  describe('POST /api/media/upload', () => {
    it('should upload an image file successfully', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .attach('file', Buffer.from('fake-image-data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .field('folderName', 'ielts_platform/test');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.secure_url).toContain('cloudinary.com');
      expect(res.body.data.public_id).toBe('ielts_platform/test');
      expect(res.body.data.resource_type).toBe('image');
    });

    it('should upload an audio file successfully', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .attach('file', Buffer.from('fake-audio-data'), {
          filename: 'listening.mp3',
          contentType: 'audio/mpeg',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should upload a PDF file successfully', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .attach('file', Buffer.from('fake-pdf-data'), {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when no file is attached', async () => {
      const res = await request(app)
        .post('/api/media/upload');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no file/i);
    });

    it('should reject unsupported file types', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .attach('file', Buffer.from('fake-exe-data'), {
          filename: 'malware.exe',
          contentType: 'application/x-msdownload',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================================
  // DELETE /api/media/delete
  // ============================================================
  describe('DELETE /api/media/delete', () => {
    it('should delete a media file by public_id', async () => {
      const cloudinary = require('cloudinary').v2;

      const res = await request(app)
        .delete('/api/media/delete')
        .send({ public_id: 'ielts_platform/test', resource_type: 'image' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'ielts_platform/test',
        { resource_type: 'image' }
      );
    });

    it('should default resource_type to image', async () => {
      const cloudinary = require('cloudinary').v2;

      const res = await request(app)
        .delete('/api/media/delete')
        .send({ public_id: 'ielts_platform/test' });

      expect(res.status).toBe(200);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'ielts_platform/test',
        { resource_type: 'image' }
      );
    });

    it('should return 400 when public_id is missing', async () => {
      const res = await request(app)
        .delete('/api/media/delete')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/public_id.*required/i);
    });
  });

  // ============================================================
  // GET /api/media/generate-signature
  // ============================================================
  describe('GET /api/media/generate-signature', () => {
    it('should generate a Cloudinary upload signature', async () => {
      const res = await request(app)
        .get('/api/media/generate-signature')
        .query({ folderName: 'ielts_platform/images' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.signature).toBe('mock-signature-123');
      expect(res.body.data.folder).toBe('ielts_platform/images');
      expect(res.body.data.cloud_name).toBe('test-cloud');
      expect(res.body.data.api_key).toBe('111111111111111');
      expect(res.body.data.timestamp).toBeDefined();
    });

    it('should use default folder when folderName not provided', async () => {
      const res = await request(app)
        .get('/api/media/generate-signature');

      expect(res.status).toBe(200);
      expect(res.body.data.folder).toBe('ielts_platform/misc');
    });
  });
});
