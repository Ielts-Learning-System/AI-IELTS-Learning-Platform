const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Giữ nguyên, lưu ID của user từ auth-service
    required: true,
    unique: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan', // Liên kết (Join) trực tiếp với bảng Plan
    required: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  fullTestUsed: {
    type: Number,
    default: 0,
  },
  validUntil: {
    type: Date,
    required: true // Bắt buộc phải có ngày hết hạn khi tạo sub
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Subscription', subscriptionSchema);