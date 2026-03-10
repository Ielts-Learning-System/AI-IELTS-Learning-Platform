const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  plan: {
    type: String,
    enum: ['FREE', 'PLUS', 'PRO'],
    default: 'FREE',
  },
  fullTestUsed: {
    type: Number,
    default: 0,
  },
  validUntil: {
    type: Date,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Subscription', subscriptionSchema);