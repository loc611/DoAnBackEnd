# Hệ Thống Quản Lý Trường Học (School Management System)

Ứng dụng quản lý trường học toàn diện với Frontend (React/Vite) và Backend (Node.js/Express, PostgreSQL, Prisma ORM).

---

## 🚀 Cách 1: Khởi Chạy Nhanh Bằng Docker (Khuyên Dùng - Không Cần File .env)

Người dùng hoặc người chấm chỉ cần cài **Docker Desktop** và chạy duy nhất một lệnh trong thư mục gốc `DoAnBackEnd`:

```bash
docker compose up --build -d
```

### Các dịch vụ tự động khởi động:
- **Frontend (Giao diện người dùng)**: [http://localhost](http://localhost) (Port `80`)
- **Backend (API RESTful)**: [http://localhost:5000](http://localhost:5000) (Port `5000`)
- **PostgreSQL Database**: Port `5432` (Tự động khởi tạo bảng qua Prisma và tự tạo tài khoản Admin mẫu)

### Tài khoản đăng nhập mặc định:
- **Tài khoản (Username / Email)**: `admin` (hoặc `admin@school.edu.vn`)
- **Mật khẩu (Password)**: `admin123`

### Để dừng hệ thống:
```bash
docker compose down
```

---

## 💻 Cách 2: Chạy Thủ Công Chế Độ Development (Không Dùng Docker)

### 1. Cài đặt dependencies:
```bash
# Cài đặt thư mục gốc
npm install

# Cài đặt backend & frontend
npm run install:all
```

### 2. Cấu hình biến môi trường:
Tạo file `.env` trong thư mục `backend/` dựa trên mẫu `backend/.env.example`:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/school_management?sslmode=disable"
JWT_SECRET=supersecretkey_for_dev_only
```

### 3. Chạy ứng dụng:
```bash
npm run dev
```
