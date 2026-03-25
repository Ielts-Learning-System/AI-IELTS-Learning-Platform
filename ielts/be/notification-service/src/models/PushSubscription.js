const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true }
);

// One subscription per endpoint per user
pushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
