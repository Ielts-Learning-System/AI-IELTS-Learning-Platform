const { handleEvent, handlers } = require('../../src/handlers/eventHandlers');
const { dispatch } = require('../../src/services/dispatcher');

// Mock the dispatcher
jest.mock('../../src/services/dispatcher', () => ({
  dispatch: jest.fn(),
  setSocketIO: jest.fn(),
}));

describe('Event Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle auth.user.created event', async () => {
    const event = {
      eventId: 'test-uuid',
      eventType: 'auth.user.created',
      timestamp: new Date().toISOString(),
      source: 'auth-service',
      data: {
        userId: '507f1f77bcf86cd799439011',
        metadata: { name: 'John', email: 'john@test.com' },
      },
    };

    await handleEvent(event);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '507f1f77bcf86cd799439011',
        type: 'welcome',
        category: 'system',
      })
    );
  });

  it('should handle payment.transaction.approved event', async () => {
    const event = {
      eventId: 'test-uuid-2',
      eventType: 'payment.transaction.approved',
      timestamp: new Date().toISOString(),
      source: 'payment-service',
      data: {
        userId: '507f1f77bcf86cd799439011',
        entityType: 'Payment',
        entityId: '507f1f77bcf86cd799439022',
        metadata: { planName: 'Premium', email: 'john@test.com' },
      },
    };

    await handleEvent(event);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'payment_approved',
        category: 'payment',
      })
    );
  });

  it('should handle writing.grading.completed event', async () => {
    const event = {
      eventId: 'test-uuid-3',
      eventType: 'writing.grading.completed',
      timestamp: new Date().toISOString(),
      source: 'writing-service',
      data: {
        userId: '507f1f77bcf86cd799439011',
        entityType: 'WritingSubmission',
        entityId: '507f1f77bcf86cd799439033',
        metadata: { bandScore: 6.5 },
      },
    };

    await handleEvent(event);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'grading_completed',
        category: 'grading',
        entityType: 'WritingSubmission',
      })
    );
  });

  it('should handle speaking.grading.completed event', async () => {
    const event = {
      eventId: 'test-uuid-4',
      eventType: 'speaking.grading.completed',
      timestamp: new Date().toISOString(),
      source: 'speaking-service',
      data: {
        userId: '507f1f77bcf86cd799439011',
        entityType: 'SpeakingSubmission',
        entityId: '507f1f77bcf86cd799439044',
        metadata: { bandScore: 7.0 },
      },
    };

    await handleEvent(event);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'grading_completed',
        category: 'grading',
        entityType: 'SpeakingSubmission',
      })
    );
  });

  it('should warn on unknown event type', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await handleEvent({
      eventType: 'unknown.event.type',
      data: { userId: '507f1f77bcf86cd799439011' },
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No handler registered')
    );

    warnSpy.mockRestore();
  });

  it('should have handlers for all expected event types', () => {
    const expectedEvents = [
      'auth.user.created',
      'payment.transaction.declared',
      'payment.transaction.approved',
      'payment.transaction.rejected',
      'writing.grading.completed',
      'speaking.grading.completed',
      'reading.test.completed',
      'listening.test.completed',
    ];

    for (const event of expectedEvents) {
      expect(handlers[event]).toBeDefined();
    }
  });
});
