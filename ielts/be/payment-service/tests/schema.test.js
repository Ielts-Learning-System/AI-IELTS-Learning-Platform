/**
 * Payment-service — Schema validation tests
 * Covers: Transaction model
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Transaction = require('../src/models/transaction.model');

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
  await Transaction.deleteMany({});
});

describe('Transaction Schema', () => {
  const validTx = () => ({
    orderId: `VIP${Date.now()}`,
    userId: new mongoose.Types.ObjectId(),
    planId: 'PLUS',
    amount: 199000,
  });

  it('saves a valid transaction with default status Pending', async () => {
    const tx = await Transaction.create(validTx());
    expect(tx._id).toBeDefined();
    expect(tx.status).toBe('Pending');
    expect(tx.transId).toBeNull();
    expect(tx.createdAt).toBeInstanceOf(Date);
    expect(tx.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects missing orderId', async () => {
    const { orderId, ...rest } = validTx();
    await expect(Transaction.create(rest)).rejects.toThrow();
  });

  it('rejects missing userId', async () => {
    const { userId, ...rest } = validTx();
    await expect(Transaction.create(rest)).rejects.toThrow();
  });

  it('rejects missing planId', async () => {
    const { planId, ...rest } = validTx();
    await expect(Transaction.create(rest)).rejects.toThrow();
  });

  it('rejects missing amount', async () => {
    const { amount, ...rest } = validTx();
    await expect(Transaction.create(rest)).rejects.toThrow();
  });

  it('enforces unique orderId', async () => {
    const data = validTx();
    await Transaction.create(data);
    await expect(Transaction.create({ ...data, userId: new mongoose.Types.ObjectId() })).rejects.toThrow();
  });

  it('accepts Pending status', async () => {
    const tx = await Transaction.create({ ...validTx(), status: 'Pending' });
    expect(tx.status).toBe('Pending');
  });

  it('accepts Success status', async () => {
    const tx = await Transaction.create({ ...validTx(), status: 'Success' });
    expect(tx.status).toBe('Success');
  });

  it('accepts Failed status', async () => {
    const tx = await Transaction.create({ ...validTx(), status: 'Failed' });
    expect(tx.status).toBe('Failed');
  });

  it('rejects invalid status enum', async () => {
    await expect(Transaction.create({ ...validTx(), status: 'Approved' })).rejects.toThrow();
  });

  it('stores transId when provided', async () => {
    const tx = await Transaction.create({ ...validTx(), transId: 'TXN_ABC123' });
    expect(tx.transId).toBe('TXN_ABC123');
  });

  it('supports all PLAN_UPGRADE_CONFIG planIds as planId', async () => {
    const planIds = ['PLUS', 'VIP_1_MONTH', 'VIP_6_MONTH', 'PRO', 'VIP_1_YEAR'];
    for (const planId of planIds) {
      const tx = await Transaction.create({ ...validTx(), planId, orderId: `VIP${planId}${Date.now()}` });
      expect(tx.planId).toBe(planId);
    }
  });
});
