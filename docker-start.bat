@echo off
chcp 65001 >nul
echo ========================================================
echo  TRƯỜNG THPT TTLN - KHỞI CHẠY HỆ THỐNG TRÊN DOCKER
echo ========================================================
echo.

:: Kiểm tra lệnh docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Chưa tìm thấy lệnh 'docker' trong PATH hệ thống.
    echo Vui lòng đảm bảo Docker Desktop đã được cài đặt và đang chạy.
    echo Bạn có thể tải Docker Desktop tại: https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

:: Kiểm tra dockerd (Docker daemon) có đang chạy không
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Docker daemon (dockerd) chưa được khởi động!
    echo Vui lòng mở Docker Desktop hoặc khởi chạy dockerd trước khi chạy script này.
    echo.
    pause
    exit /b 1
)

echo [1/3] Đang kiểm tra cấu hình tệp môi trường .env...
if not exist .env (
    copy .env.example .env
    echo Đã tạo tệp .env từ .env.example.
)

echo [2/3] Đang biên dịch Docker Images và khởi chạy Containers...
docker compose up --build -d

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  KHỞI CHẠY THÀNH CÔNG HỆ THỐNG TRÊN DOCKER!
    echo ========================================================
    echo  - Giao diện Web Frontend: http://localhost:80
    echo  - API Backend:             http://localhost:5000/api
    echo  - API Health Check:        http://localhost:5000/api/health
    echo ========================================================
    echo.
    echo Lệnh hữu ích:
    echo   Xem logs:        docker compose logs -f
    echo   Dừng hệ thống:   docker compose down
    echo.
) else (
    echo.
    echo [LỖI] Quá trình khởi chạy Docker Containers thất bại.
)

pause
