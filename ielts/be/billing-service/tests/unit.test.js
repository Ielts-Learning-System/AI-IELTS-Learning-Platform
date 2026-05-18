/**
 * Billing-service — Unit tests
 * Covers: requireSkill middleware (3 paths), auth middleware edge cases
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Plan = require('../src/models/Plan');
const { requireSkill } = require('../src/middleware/requireSkill.middleware');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

afterEach(async () => {
  await Plan.deleteMany({});
});

// Helper — builds minimal req/res/next objects
const buildCtx = (planCode = 'FREE', userId = new mongoose.Types.ObjectId().toString()) => {
  const req = { userId, user: { id: userId, plan: planCode } };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

// ─── requireSkill ─────────────────────────────────────────────────────────────

describe('requireSkill middleware', () => {
  describe('PRO plan — bypass all', () => {
    it('calls next() for PRO + reading', async () => {
      const { req, res, next } = buildCtx('PRO');
      await requireSkill('reading')(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('calls next() for PRO + speaking (skill not in DB needed)', async () => {
      const { req, res, next } = buildCtx('PRO');
      await requireSkill('speaking')(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('calls next() for lowercase pro', async () => {
      const { req, res, next } = buildCtx('pro');
      await requireSkill('writing')(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('FREE plan — always 403', () => {
    it('returns 403 SKILL_NOT_ALLOWED for FREE + reading', async () => {
      const { req, res, next } = buildCtx('FREE');
      await requireSkill('reading')(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SKILL_NOT_ALLOWED' }));
    });

    it('returns allowedSkills: [] in response for FREE plan', async () => {
      const { req, res, next } = buildCtx('FREE');
      await requireSkill('writing')(req, res, next);
      const body = res.json.mock.calls[0][0];
      expect(body.allowedSkills).toEqual([]);
      expect(body.userPlan).toBe('FREE');
      expect(body.requiredSkill).toBe('writing');
    });

    it('denies all 4 skills for FREE plan', async () => {
      for (const skill of ['reading', 'listening', 'writing', 'speaking']) {
        const { req, res, next } = buildCtx('FREE');
        await requireSkill(skill)(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
      }
    });
  });

  describe('PLUS plan — DB lookup', () => {
    beforeEach(async () => {
      await Plan.create({
        code: 'PLUS', name: 'PLUS Plan', price: 199000, durationMonths: 3,
        benefits: { skills: ['reading', 'listening'] },
      });
    });

    it('allows reading for PLUS plan', async () => {
      const { req, res, next } = buildCtx('PLUS');
      await requireSkill('reading')(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.userPlan).toBeDefined();
    });

    it('allows listening for PLUS plan', async () => {
      const { req, res, next } = buildCtx('PLUS');
      await requireSkill('listening')(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('denies writing for PLUS plan (not in benefits)', async () => {
      const { req, res, next } = buildCtx('PLUS');
      await requireSkill('writing')(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      const body = res.json.mock.calls[0][0];
      expect(body.code).toBe('SKILL_NOT_ALLOWED');
      expect(body.allowedSkills).toContain('reading');
      expect(body.allowedSkills).not.toContain('writing');
    });

    it('denies speaking for PLUS plan', async () => {
      const { req, res, next } = buildCtx('PLUS');
      await requireSkill('speaking')(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Unknown plan code — PLAN_NOT_FOUND', () => {
    it('returns 403 PLAN_NOT_FOUND for nonexistent plan code', async () => {
      const { req, res, next } = buildCtx('UNKNOWN_PLAN');
      await requireSkill('reading')(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      const body = res.json.mock.calls[0][0];
      expect(body.code).toBe('PLAN_NOT_FOUND');
    });
  });

  describe('Missing userId', () => {
    it('returns 401 when no userId on req', async () => {
      const req = { user: { plan: 'PLUS' } }; // no userId, no user.id
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
      const next = jest.fn();
      await requireSkill('reading')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
