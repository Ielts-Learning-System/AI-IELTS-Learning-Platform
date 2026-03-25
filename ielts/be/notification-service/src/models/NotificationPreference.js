const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    channels: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
    },
    categories: {
      payment: { type: Boolean, default: true },
      grading: { type: Boolean, default: true },
      reminder: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
