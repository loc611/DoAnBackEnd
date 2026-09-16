# Hệ Thống Quản Lý Trường Học Enterprise (School Management System)
**Chuẩn Thông Tư 22/2021/TT-BGDĐT • Nghị Định 81/2021/NĐ-CP • VietQR NAPAS247 • Docker & dockerd Production Ready**

Ứng dụng quản lý trường học toàn diện với kiến trúc đa tầng:
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Nginx Alpine (Reverse Proxy, Gzip, Caching).
- **Backend**: Node.js 22 Alpine, Express 5, Prisma ORM 7, OpenSSL, dumb-init, RBAC 2-Tier Matrix.
- **Database**: Cloud Neon PostgreSQL (SSL Encrypted).

---

## 🚀 1. Khởi Chạy Nhanh Với Docker & dockerd (Production Mode)

### Cách A: Chạy bằng Script tự động kiểm tra Docker / dockerd
- **Trên Windows (cmd / PowerShell):**
  Nhấp đúp chuột hoặc chạy:
  ```cmd
  docker-start.bat
  ```
- **Trên Linux / WSL / macOS:**
  ```bash
  chmod +x docker-start.sh setup-dockerd.sh
  ./docker-start.sh
  ```

### Cách B: Chạy trực tiếp bằng lệnh Docker Compose:
```bash
docker compose up --build -d
```

---

## 🛠️ 2. Hướng Dẫn Về `dockerd` (Docker Daemon trên Linux / VPS / WSL)

Nếu bạn chạy trên máy chủ Linux hoặc môi trường WSL2 chưa bật `dockerd`:

1. **Khởi động `dockerd` service:**
   ```bash
   sudo service docker start
   # hoặc:
   sudo systemctl start docker
   ```

2. **Nếu chưa cài đặt Docker Engine, chạy script tự động:**
   ```bash
   chmod +x setup-dockerd.sh
   ./setup-dockerd.sh
   ```

3. **Chạy `dockerd` thủ công ở chế độ daemon nền (nếu không có systemd):**
   ```bash
   sudo dockerd > /dev/null 2>&1 &
   ```

4. **Kiểm tra trạng thái kết nối tới `dockerd`:**
   ```bash
   docker info
   ```

---

## 🌐 3. Các Dịch Vụ Và Cổng Truy Cập

Sau khi khởi chạy Docker Containers:

| Dịch Vụ | Địa Chỉ Truy Cập | Chức Năng |
| :--- | :--- | :--- |
| **Frontend Web** | [http://localhost](http://localhost) (Port `80`) | Giao diện Single Page Application (Nginx Alpine) |
| **Backend REST API** | [http://localhost:5000/api](http://localhost:5000/api) | API Server nghiệp vụ đào tạo |
| **Health Check** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | Kiểm tra tình trạng hoạt động của container |

### Tài khoản đăng nhập mẫu:
- **Ban Giám Hiệu / Quản Trị Viên (Admin):**
  - Tài khoản: `admin` (hoặc `admin@school.edu.vn`)
  - Mật khẩu: `admin123`
- **Giáo Viên Chủ Nhiệm (Teacher):**
  - Tài khoản: `gv001`
  - Mật khẩu: `gv001@123`
- **Học Sinh (Student):**
  - Tài khoản: `hs001`
  - Mật khẩu: `hs001@123`

---

## ⚙️ 4. Tối Ưu Hóa Docker Đã Thực Hiện (Enterprise Optimizations)

1. **Multi-Stage Build (Node 22 Alpine):**
   - Tách biệt hoàn toàn công đoạn biên dịch (`builder`) và thực thi (`runner`).
   - Dung lượng Image tối ưu, giảm hơn **70%** so với image thông thường.
2. **Khắc phục triệt để lỗi Prisma trên Alpine:**
   - Cài đặt `openssl`, `libc6-compat`, và `ca-certificates` để Prisma Query Engine kết nối mượt mà tới Cloud Neon Database.
3. **Container Security (Non-Root User):**
   - Chạy với người dùng `USER node` thay vì `root`, chống lại nguy cơ container escape.
4. **Xử lý tín hiệu tắt (PID 1 Signal Handling):**
   - Sử dụng `dumb-init` làm Entrypoint, đảm bảo xử lý SIGTERM / SIGINT chuẩn xác khi dừng container, không bị drop kết nối HTTP dở dang.
5. **Nginx Web Server Tối Ưu:**
   - Kích hoạt **Gzip Compression** (giảm kích thước bundle JavaScript từ 1.2MB xuống ~330KB).
   - Thiết lập **Cache-Control 1 năm** cho static assets (`/assets/`).
   - Cấu hình **Client Body Size 50M** hỗ trợ tải file Excel / Sổ điểm lớn.
   - Bổ sung các header bảo mật: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`.
6. **Healthcheck & Service Dependency:**
   - Cả Backend và Frontend đều có cấu hình `HEALTHCHECK` tích hợp.
   - Frontend chỉ khởi động sau khi Backend đã vượt qua kiểm tra sức khỏe (`condition: service_healthy`).

---

## 📋 5. Các Lệnh Quản Lý Hữu Ích

```bash
# Xem log thời gian thực của cả 2 dịch vụ
docker compose logs -f

# Xem log riêng của Backend
docker compose logs -f backend

# Kiểm tra trạng thái và sức khỏe containers
docker compose ps

# Khởi động lại hệ thống
docker compose restart

# Dừng và giải phóng containers
docker compose down
```
