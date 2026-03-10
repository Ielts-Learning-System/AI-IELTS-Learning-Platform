const mongoose = require('mongoose');

// Schema cho từng câu hỏi
const questionSchema = new mongoose.Schema({
  questionNumber: { type: Number, required: true }, // Câu số mấy (1-40)
  type: { 
    type: String, 
    enum: ['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'MATCHING', 'TFNG', 'YNNG'], 
    required: true 
  },
  text: { type: String, required: true }, // Nội dung câu hỏi
  options: [{ type: String }], // Dành cho trắc nghiệm hoặc matching
  correctAnswer: { type: String, required: true }, // Đáp án chuẩn để hệ thống tự chấm
  explanation: { type: String } // Lời giải thích (tùy chọn)
});

// Schema cho từng Đoạn văn (Passage)
const passageSchema = new mongoose.Schema({
  passageNumber: { type: Number, required: true }, // Passage 1, 2, 3
  title: { type: String, required: true },
  content: { type: String, required: true }, // Nội dung bài đọc (lưu dạng HTML hoặc text dài)
  image: { type: String }, // Ảnh đính kèm bài đọc (nếu có)
  questions: [questionSchema] // Danh sách câu hỏi của passage này
});

// Schema tổng của Đề thi
const readingTestSchema = new mongoose.Schema({
  title: { type: String, required: true }, // VD: "Cambridge IELTS 18 - Test 1"
  description: { type: String },
  isPublished: { type: Boolean, default: false }, // Giáo viên duyệt xong mới public cho học sinh
  passages: [passageSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true } // ID của Giáo viên tạo đề
}, { timestamps: true });

module.exports = mongoose.model('ReadingTest', readingTestSchema);