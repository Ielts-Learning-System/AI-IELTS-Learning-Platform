const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'welcome',
        'grading_completed',
        'payment_approved',
        'payment_rejected',
        'payment_declared',
        'submission_created',
        'test_completed',
        'reminder',
        'system',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    channel: {
      type: String,
      required: true,
      enum: ['in-app', 'email', 'push'],
    },
    entityType: { type: String, default: null },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Compound index for efficient user notification queries
notificationLogSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
