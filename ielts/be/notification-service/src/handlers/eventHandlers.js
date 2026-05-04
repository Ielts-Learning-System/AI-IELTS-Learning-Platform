const { dispatch } = require('../services/dispatcher');

/**
 * Map each RabbitMQ event type to a notification handler.
 */
const handlers = {
  /**
   * auth.user.created — Welcome notification
   */
  'auth.user.created': async (data) => {
    await dispatch({
      userId: data.userId,
      type: 'welcome',
      category: 'system',
      title: 'Welcome to IELTS Platform! 🎉',
      message: `Hi ${data.metadata?.name || 'there'}! Your account has been created successfully. Start your IELTS preparation journey now.`,
      userEmail: data.metadata?.email,
      emailSubject: 'Welcome to IELTS Platform',
      emailHtml: `
        <h2>Welcome to IELTS Platform!</h2>
        <p>Hi ${data.metadata?.name || 'there'},</p>
        <p>Your account has been created successfully. Start practicing Reading, Listening, Writing, and Speaking to achieve your target band score.</p>
        <p>Good luck! 🍀</p>
      `,
    });
  },

  /**
   * payment.transaction.declared — Payment pending notification
   */
  'payment.transaction.declared': async (data) => {
    await dispatch({
      userId: data.userId,
      type: 'payment_declared',
      category: 'payment',
      title: 'Payment Declaration Received',
      message: `Your payment declaration for the ${data.metadata?.planName || 'VIP'} plan has been received and is pending admin review.`,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata,
    });
  },

  /**
   * payment.transaction.approved — VIP activated
   */
  'payment.transaction.approved': async (data) => {
    await dispatch({
      userId: data.userId,
      type: 'payment_approved',
      category: 'payment',
      title: 'Payment Approved — VIP Activated! ✅',
      message: `Your payment for the ${data.metadata?.planName || 'VIP'} plan has been approved. Enjoy premium features!`,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata,
      userEmail: data.metadata?.email,
      emailSubject: 'Payment Approved — VIP Activated',
      emailHtml: `
        <h2>Payment Approved ✅</h2>
        <p>Your payment for the <strong>${data.metadata?.planName || 'VIP'}</strong> plan has been approved.</p>
        <p>You now have access to all premium features. Happy studying!</p>
      `,
    });
  },

  /**
   * payment.transaction.rejected — Payment rejected
   */
  'payment.transaction.rejected': async (data) => {
    await dispatch({
      userId: data.userId,
      type: 'payment_rejected',
      category: 'payment',
      title: 'Payment Rejected ❌',
      message: `Your payment for the ${data.metadata?.planName || 'VIP'} plan was rejected. Please contact support or try again.`,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata,
      userEmail: data.metadata?.email,
      emailSubject: 'Payment Rejected',
      emailHtml: `
        <h2>Payment Rejected</h2>
        <p>Unfortunately, your payment for the <strong>${data.metadata?.planName || 'VIP'}</strong> plan was not approved.</p>
        <p>Please review your declaration and try again, or contact our support team.</p>
      `,
    });
  },

  /**
   * writing.grading.completed — Writing graded
   */
  'writing.grading.completed': async (data) => {
    await dispatch({
      userId: data.userId,
      type: 'grading_completed',
      category: 'grading',
      title: 'Writing Grading Complete ✍️',
      message: `Your writing submission has been graded${data.metadata?.bandScore ? ` — Band ${data.metadata.bandScore}` : ''}. View your detailed feedback now.`,
      entityType: data.entityType || 'WritingSubmission',
      entityId: data.entityId,
      metadata: data.metadata,
    });
  },

  /**
   * speaking.grading.completed — Speaking graded
   */
  'speaking.grading.completed': async (data) => {
    await dispatch({
      userId: data.userId,
      type: 'grading_completed',
      category: 'grading',
      title: 'Speaking Grading Complete 🎤',
      message: `Your speaking submission has been graded${data.metadata?.bandScore ? ` — Band ${data.metadata.bandScore}` : ''}. View your detailed feedback now.`,
      entityType: data.entityType || 'SpeakingSubmission',
      entityId: data.entityId,
      metadata: data.metadata,
    });
  },

  /**
   * reading.test.completed — Reading auto-graded
   */
  'reading.test.completed': async (data) => {
    await dispatch({
      userId: data.userId,
      type: 'test_completed',
      category: 'grading',
      title: 'Reading Test Results Ready 📖',
      message: `Your reading test has been auto-graded${data.metadata?.score != null ? ` — Score: ${data.metadata.score}` : ''}. Check your results.`,
      entityType: data.entityType || 'ReadingTest',
      entityId: data.entityId,
      metadata: data.metadata,
    });
  },

  /**
   * listening.test.completed — Listening auto-graded
   */
  'listening.test.completed': async (data) => {
    await dispatch({
      userId: data.userId,
      type: 'test_completed',
      category: 'grading',
      title: 'Listening Test Results Ready 🎧',
      message: `Your listening test has been auto-graded${data.metadata?.score != null ? ` — Score: ${data.metadata.score}` : ''}. Check your results.`,
      entityType: data.entityType || 'ListeningTest',
      entityId: data.entityId,
      metadata: data.metadata,
    });
  },

  /**
   * exam.completed — Full mock test submitted/expired
   */
  'exam.completed': async (data) => {
    const status = data.metadata?.status || 'SUBMITTED';
    const isExpired = String(status).toUpperCase() === 'EXPIRED';

    await dispatch({
      userId: data.userId,
      type: 'exam_completed',
      category: 'grading',
      title: isExpired ? 'Mock Test Auto-Submitted ⏱️' : 'Mock Test Submitted ✅',
      message: isExpired
        ? 'Your full mock test reached the global time limit and was auto-submitted.'
        : 'Your full mock test has been submitted successfully. Writing/Speaking grading is in progress.',
      entityType: data.entityType || 'ExamAttempt',
      entityId: data.entityId,
      metadata: data.metadata,
    });
  },

  /**
   * exam.graded — Full mock test graded
   */
  'exam.graded': async (data) => {
    const overall = data.metadata?.overall;

    await dispatch({
      userId: data.userId,
      type: 'exam_graded',
      category: 'grading',
      title: 'Your Mock Test Has Been Graded! 🎯',
      message:
        overall != null
          ? `Your full mock test has been graded — Overall Band ${overall}.`
          : 'Your full mock test has been graded. View detailed band scores now.',
      entityType: data.entityType || 'ExamAttempt',
      entityId: data.entityId,
      metadata: data.metadata,
    });
  },

  /**
   * billing.subscription.cancelled — Subscription cancelled with admin message
   * Uses the EXACT title and message provided by the admin
   */
  'billing.subscription.cancelled': async (data) => {
    const {
      userId,
      email,
      name,
      planName,
      title,       // Admin-provided title from modal
      message,     // Admin-provided message from modal
      reason,
      cancelledAt,
    } = data;

    await dispatch({
      userId,
      type: 'subscription_cancelled',
      category: 'billing',
      title: title || '❌ Subscription Cancelled',
      message: message || `Your ${planName} plan has been cancelled.`,
      entityType: 'Subscription',
      entityId: data.subscriptionId,
      metadata: {
        planName,
        reason,
        cancelledAt,
      },
      userEmail: email,
      emailSubject: title || 'Subscription Cancelled',
      emailHtml: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>${title || '❌ Subscription Cancelled'}</h2>
          <p>Hi ${name || 'there'},</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p>${message || `Your ${planName} subscription has been cancelled.`}</p>
          </div>
          <p style="font-size: 0.9em; color: #666; margin-top: 20px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      `,
    });
  },

  /**
   * billing.subscription.restored — Subscription restored (back to ACTIVE)
   */
  'billing.subscription.restored': async (data) => {
    const {
      userId,
      email,
      name,
      planName,
      validUntil,
      restoredAt,
    } = data;

    await dispatch({
      userId,
      type: 'subscription_restored',
      category: 'billing',
      title: '✅ Subscription Restored',
      message: `Welcome back! Your ${planName} plan has been restored and is now active until ${new Date(validUntil).toLocaleDateString()}.`,
      entityType: 'Subscription',
      entityId: data.subscriptionId,
      metadata: {
        planName,
        validUntil,
        restoredAt,
      },
      userEmail: email,
      emailSubject: 'Subscription Restored ✅',
      emailHtml: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>✅ Subscription Restored</h2>
          <p>Hi ${name || 'there'},</p>
          <p>Great news! Your <strong>${planName}</strong> plan has been restored and is now active.</p>
          <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Valid Until:</strong> ${new Date(validUntil).toLocaleDateString()}</p>
            <p>You now have access to all premium features again. Happy learning! 🎉</p>
          </div>
          <p style="font-size: 0.9em; color: #666; margin-top: 20px;">
            Need help? Contact our support team anytime.
          </p>
        </div>
      `,
    });
  },
};

/**
 * Process an incoming RabbitMQ message by routing to the correct handler.
 */
async function handleEvent(event) {
  const { eventType, data } = event;
  const handler = handlers[eventType];

  if (!handler) {
    console.warn(`⚠️  No handler registered for event: ${eventType}`);
    return;
  }

  console.log(`📨 Processing event: ${eventType} for user ${data?.userId}`);
  await handler(data);
}

module.exports = { handleEvent, handlers };
