const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // 'FREE', 'PLUS', 'PRO'
  name: { type: String, required: true },
  price: { type: Number, required: true },
  features: [{ type: String }], // Mảng các dòng mô tả tính năng
  ui: {
    borderColor: { type: String },
    buttonText: { type: String },
    buttonColor: { type: String },
    badge: { type: String, default: '' } // Ví dụ: "Phổ biến"
  },
  maxFullTests: { type: Number, default: 0 } // -1 sẽ đại diện cho Vô hạn
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);