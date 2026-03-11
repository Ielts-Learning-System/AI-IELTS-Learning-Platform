# 🎯 IELTS Master Platform - AI-Powered Preparation Hub

![IELTS Master Banner](https://via.placeholder.com/1200x400/E53E3E/FFFFFF?text=IELTS+Master+-+AI+Powered+EdTech+Platform)

Một nền tảng luyện thi IELTS toàn diện, mang đến trải nghiệm học tập cá nhân hóa thông qua sức mạnh của Trí tuệ nhân tạo (Google Gemini) và phương pháp luyện tập chuyên sâu (Nghe chép chính tả). Hệ thống được xây dựng trên kiến trúc **Microservices** giúp tối ưu hóa hiệu suất và dễ dàng mở rộng.

---

## ✨ Tính năng nổi bật (Key Features)

### 🤖 1. AI-Generated Reading Tests (Dành cho Giáo viên)
Giáo viên có thể tự động tạo ra các đề thi IELTS Reading chuẩn xác chỉ trong 10 giây.
* **Tích hợp Gemini AI:** Tự động sinh bài đọc dựa trên Band điểm mục tiêu (ví dụ: Band 7.0), chủ đề (Keywords), và độ khó (Passage 1, 2, 3).
* **Cấu trúc dữ liệu chuẩn xác:** AI trả về cấu trúc JSON nghiêm ngặt, tách biệt hoàn toàn giữa nội dung bài đọc (HTML) và bộ câu hỏi (Trắc nghiệm, TFNG, Matching) để phục vụ chấm điểm tự động.
* **Rich Text Editor:** Chỉnh sửa trực tiếp bài đọc được AI tạo ra thông qua bộ soạn thảo siêu tốc **Tiptap**.

### 🎧 2. Dictation Practice - Nghe chép chính tả (Dành cho Học viên)
Phương pháp "Bottom-up listening" tối thượng giúp học viên tăng cường phản xạ bắt âm.
* **Smart Auto-Grading:** Thuật toán chuẩn hóa chuỗi (loại bỏ dấu câu, khoảng trắng thừa, không phân biệt hoa/thường) để chấm điểm chính xác tuyệt đối những gì học viên gõ.
* **Dynamic Hints:** Hệ thống gợi ý thông minh, tự động ẩn từ và chỉ giữ lại chữ cái đầu tiên (vd: `I _ a s______`) để hỗ trợ học viên khi gặp câu khó.
* **Detailed Analytics:** Thống kê trực quan độ chính xác (%) và trung bình số lần nghe lại (replays/question) sau mỗi bài tập.

### 🔐 3. Phân quyền chặt chẽ (RBAC & JWT)
* Phân tách luồng giao diện và quyền truy cập rõ ràng giữa **Admin**, **Teacher** (được phép dùng AI tạo đề), và **Student** (chỉ được làm bài).
* API Gateway bảo vệ các endpoint nội bộ thông qua JWT Token verification.

---

## 🛠️ Tech Stack & Kiến trúc hệ thống

Dự án áp dụng mô hình **Microservices Architecture** được đóng gói bằng Docker, đảm bảo tính độc lập và khả năng mở rộng của từng module.

**Frontend:**
* React.js / Next.js
* Tailwind CSS (Theme chuẩn IELTS: Đỏ & Trắng)
* Lucide React (Icons)
* Axios (API Client)
* Tiptap (Rich Text Editor)

**Backend (Microservices):**
* **API Gateway:** Điều hướng request (Node.js/Express, http-proxy-middleware).
* **Auth Service:** Xử lý xác thực người dùng, cấp phát JWT, phân quyền (RBAC).
* **Reading Service:** Tích hợp Google Gemini SDK (`gemini-2.5-flash`), xử lý lưu trữ JSON/HTML vào MongoDB.
* **Listening Service:** Quản lý tài nguyên file Audio tĩnh tĩnh và streaming dữ liệu Dictation.
* **Database:** MongoDB & Mongoose ORM.
* **DevOps:** Docker & Docker Compose.

---

## 🚀 Hướng dẫn cài đặt (Getting Started)

### Yêu cầu hệ thống:
* Node.js (v18+)
* Docker & Docker Compose
* MongoDB
* Google Gemini API Key

### Các bước khởi chạy cục bộ:

1. **Clone repository:**
   ```bash
   git clone [https://github.com/your-username/ielts-master.git](https://github.com/your-username/ielts-master.git)
   cd ielts-master
Thiết lập biến môi trường (.env):
Copy các file .env.example thành .env tại các thư mục service và điền thông tin:

JWT_SECRET=your_secret_key

GEMINI_API_KEY=your_google_ai_key

NEXT_PUBLIC_API_URL=http://localhost:3000 (Gateway URL)

Khởi chạy hệ thống Microservices bằng Docker:

Bash
docker-compose up -d
Khởi chạy Frontend:

Bash
cd frontend
npm install
npm run dev
Hệ thống sẽ hoạt động tại: http://localhost:5173 (hoặc cổng cấu hình của bạn).

📂 Cấu trúc dự án (Folder Structure)
Plaintext
ielts-master/
├── api-gateway/          # Cổng điều hướng request
├── auth-service/         # Dịch vụ đăng nhập, phân quyền, MongoDB User
├── reading-service/      # Dịch vụ bài tập Đọc & API gọi Google Gemini
├── listening-service/    # Dịch vụ Nghe chép chính tả & File tĩnh (.wav, .json)
└── frontend/             # Giao diện người dùng (Dashboard học viên/giáo viên)
🧠 Thách thức kỹ thuật đã giải quyết
Xung đột định tuyến (Route Conflicts): Cấu hình thành công API Gateway để phân luồng chính xác các request /api/dictation và các request RESTful ID động của hệ thống bài kiểm tra IELTS cũ.

Quản lý Vòng đời React (React Lifecycle): Triển khai kiến trúc "bọc thép" (bulletproof) chống lỗi undefined/null khi fetch dữ liệu bất đồng bộ, đảm bảo giao diện luôn mượt mà và không bao giờ gặp tình trạng White Screen of Death.

Ép kiểu dữ liệu AI: Viết prompt kỹ thuật (system prompt) ép Google Gemini trả về định dạng JSON lồng nhau (Nested JSON) chính xác 100% khớp với Mongoose Schema.

Developed with ❤️ by [Tên của bạn/Team của bạn]
