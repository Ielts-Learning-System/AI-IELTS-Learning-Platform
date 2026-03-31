const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g., 'VIP_3M', 'IELTS_PRO_6M'
  name: { type: String, required: true },
  price: { type: Number, required: true },
  isActive: { type: Boolean, default: true }, // Tắt/bật hiển thị gói cho người dùng đăng ký mới
  durationMonths: { type: Number, required: true }, // 1, 3, 6, 12...
  features: [{ type: String }],
  
  // Nhóm các quyền lợi cốt lõi để Backend kiểm tra quyền
  benefits: {
    skills: [{ type: String, enum: ['reading', 'listening', 'writing', 'speaking'] }], // Các kỹ năng được cấp phép
    maxHours: { type: Number, default: -1 }, // -1 = Unlimited
    maxFullTests: { type: Number, default: 0 } // -1 = Unlimited
  },
  
  ui: {
    borderColor: { type: String },
    buttonText: { type: String },
    buttonColor: { type: String },
    badge: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);