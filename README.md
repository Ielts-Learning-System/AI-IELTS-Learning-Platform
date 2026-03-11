# 🎯 IELTS Master Platform

> Nền tảng học tập IELTS được cá nhân hóa bằng AI, thiết kế theo quy chuẩn quốc tế.

![IELTS Master Banner](ielts/fe/src/assets/logo.png)

## 📋 Giới thiệu

**IELTS Master** là một nền tảng luyện thi IELTS toàn diện, tích hợp **Google Gemini AI** để tạo ra các bài tập chất lượng cao với hiệu suất luyện tập tối ưu. Hệ thống được xây dựng trên kiến trúc **Microservices**, cho phép mở rộng dễ dàng và quản lý độc lập các thành phần.

---

## ✨ Tính Năng Chính

### 🤖 AI-Generated Reading Tests
**Dành cho: Giáo viên**

Tự động tạo đề thi IELTS Reading tiêu chuẩn trong vài giây.

| Tính năng | Mô tả |
|----------|-------|
| **Tích hợp Gemini AI** | Sinh bài đọc theo band điểm (Band 5.0 - 9.0), chủ đề, và độ khó (Passage 1-3) |
| **JSON Cấu trúc** | Định dạng JSON nghiêm ngặt tách biệt nội dung (HTML) và câu hỏi (MCQ, TFNG, Matching) |
| **Tiptap Editor** | Chỉnh sửa trực tiếp với trình soạn thảo Rich Text siêu tốc |
| **Auto-Grading** | Chấm điểm tự động và lưu trữ kết quả |

---

### 🎧 Dictation Practice
**Dành cho: Học viên**

Phương pháp "Bottom-up Listening" tiên tiến để tăng cường phản xạ nghe.

| Tính năng | Chi tiết |
|----------|---------|
| **Smart Auto-Grading** | Chuẩn hóa đầu vào (loại bỏ dấu, khoảng trắng, không phân biệt hoa/thường) → Chấm điểm chính xác |
| **Dynamic Hints** | Gợi ý thông minh, ẩn từ dần (ví dụ: `I _ a s______`) |
| **Analytics** | Thống kê độ chính xác (%) và lịch sử replay cho mỗi câu hỏi |

---

### 🔐 Kiểm Soát Truy Cập Thứ Bậc (RBAC)

```
┌─────────────────────────────────────────┐
│  Admin                                  │
│  • Quản lý người dùng & hệ thống      │
├─────────────────────────────────────────┤
│  Teacher (Giáo viên)                    │
│  • Tạo bài tập với AI                 │
│  • Xem kết quả học viên                │
├─────────────────────────────────────────┤
│  Student (Học viên)                    │
│  • Làm bài tập                         │
│  • Xem kết quả cá nhân                 │
└─────────────────────────────────────────┘
```

**Bảo mật:** API Gateway + JWT Token verification

---

## 🛠️ Tech Stack

### Frontend
```
React.js / Next.js
├── Tailwind CSS (Theme: Đỏ & Trắng)
├── Lucide React (Icons)
├── Axios (HTTP Client)
└── Tiptap (Rich Text Editor)
```

### Backend (Microservices)
```
API Gateway (Express.js)
├── Auth Service (JWT + RBAC)
├── Reading Service (Gemini SDK + MongoDB)
├── Listening Service (Audio Management + Streaming)
└── Database Layer (MongoDB + Mongoose)
```

### DevOps
- Docker & Docker Compose
- Multi-container orchestration

---

## 📂 Cấu Trúc Dự Án

```
ielts-master/
├── api-gateway/              # Điều hướng request
├── auth-service/             # Xác thực & phân quyền
├── reading-service/          # Bài tập Reading + Gemini
├── listening-service/        # Dictation + Audio files
├── frontend/                 # UI/UX React
└── docker-compose.yml        # Orchest config
```

---

## 🚀 Hướng Dẫn Cài Đặt

### Yêu Cầu Hệ Thống
- **Node.js**: v18+ 
- **Docker**: v20+
- **MongoDB**: v5.0+
- **Google Gemini API Key**

### Các Bước Khởi Chạy

#### 1️⃣ Clone Repository
```bash
git clone https://github.com/Ielts-Learning-System/09032026.git
cd 09032026
```

#### 2️⃣ Cấu Hình Biến Môi Trường

Tạo file `.env` tại gốc và các thư mục service:
```env
# .env (Gateway)
JWT_SECRET=your_secret_key_here
GEMINI_API_KEY=your_google_ai_key_here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

#### 3️⃣ Khởi Chạy Microservices
```bash
docker-compose up -d
```

#### 4️⃣ Khởi Chạy Frontend
```bash
cd frontend
npm install
npm run dev
```

**Hệ thống sẵn sàng tại:** `http://localhost:5173`

---

## 🧠 Các Thách Thức Kỹ Thuật Đã Giải Quyết

### 1. Xung Đột Định Tuyến (Route Conflicts)
**Vấn đề:** Phân luồng `/api/dictation` vs request RESTful động
**Giải pháp:** Cấu hình prioritize route tại API Gateway

### 2. Quản Lý Vòng Đời React
**Vấn đề:** Lỗi undefined/null khi fetch dữ liệu bất đồng bộ
**Giải pháp:** Kiến trúc "bulletproof" với error boundaries + lazy loading

### 3. Ép Kiểu Dữ Liệu AI
**Vấn đề:** Gemini trả JSON không khớp schema
**Giải pháp:** System prompt chuẩn → Nested JSON 100% khớp Mongoose

---

## 📊 Hiệu Suất

| Metric | Target |
|--------|--------|
| Reading Test Generation | < 10 giây |
| API Response Time | < 200ms |
| Dictation Accuracy | 99% |
| Uptime | 99.9% |

---

## 👥 Đóng Góp

Chúng tôi hoan nghênh các pull request! Vui lòng:
1. Fork dự án
2. Tạo branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

---

## 📜 Giấy Phép

MIT License © 2026 - IELTS Learning System

---

## 📞 Hỗ Trợ

- 📧 Email: support@ieltsmaster.com
- 🐛 Issues: [GitHub Issues](https://github.com/Ielts-Learning-System/09032026/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/Ielts-Learning-System/09032026/discussions)

---

**Developed with ❤️ by IELTS Learning System**