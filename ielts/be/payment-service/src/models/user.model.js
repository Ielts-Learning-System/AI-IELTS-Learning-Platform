const mongoose = require('mongoose');

/**
 * Lightweight User model for payment-service.
 * Only includes the subscription-related fields this service needs to update.
 * Reads/writes to the same 'users' collection as auth-service.
 */
const userSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ['FREE', 'PLUS', 'PRO'],
      default: 'FREE',
    },
    vipValidUntil: {
      type: Date,
      default: null,
    },
  },
  {
    // strict: false so Mongoose doesn't strip auth-service fields on save
    strict: false,
    timestamps: true,
    collection: 'users',
  }
);

module.exports = mongoose.model('User', userSchema);
