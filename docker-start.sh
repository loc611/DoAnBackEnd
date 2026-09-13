#!/bin/bash
# ========================================================
# TRƯỜNG THPT TTLN - KHỞI CHẠY HỆ THỐNG TRÊN DOCKER (LINUX / WSL)
# ========================================================

set -e

echo "========================================================"
echo " TRƯỜNG THPT TTLN - DOCKER RUNNER"
echo "========================================================"

# 1. Kiểm tra Docker CLI
if ! command -v docker &> /dev/null; then
    echo "[LỖI] Lệnh 'docker' chưa được cài đặt trên hệ thống."
    echo "Nếu bạn đang dùng Ubuntu/Debian, vui lòng chạy: sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin"
    exit 1
fi

# 2. Kiểm tra Docker Daemon (dockerd)
if ! docker info &> /dev/null; then
    echo "[CẢNH BÁO] Docker daemon (dockerd) chưa chạy hoặc quyền truy cập bị từ chối."
    echo "Đang thử khởi động dockerd service..."
    if command -v systemctl &> /dev/null; then
        sudo systemctl start docker || true
    elif command -v service &> /dev/null; then
        sudo service docker start || true
    fi

    # Thử lại
    if ! docker info &> /dev/null; then
        echo "[LỖI] Không thể kết nối tới Docker daemon (dockerd)."
        echo "Hãy đảm bảo dockerd đang chạy bằng lệnh: sudo dockerd & hoặc sudo service docker start"
        exit 1
    fi
fi

# 3. Kiểm tra .env
if [ ! -f .env ]; then
    echo "[1/3] Tạo tệp .env từ .env.example..."
    cp .env.example .env
fi

# 4. Biên dịch và khởi chạy Docker Compose
echo "[2/3] Đang biên dịch Docker Images và khởi chạy Containers..."
docker compose up --build -d

echo ""
echo "========================================================"
echo " KHỞI CHẠY THÀNH CÔNG HỆ THỐNG TRÊN DOCKER!"
echo "========================================================"
echo " - Giao diện Web Frontend: http://localhost:80"
echo " - API Backend:             http://localhost:5000/api"
echo " - API Health Check:        http://localhost:5000/api/health"
echo "========================================================"
echo ""
echo "Các lệnh quản lý:"
echo "  Xem logs trực tiếp:  docker compose logs -f"
echo "  Kiểm tra trạng thái: docker compose ps"
echo "  Dừng hệ thống:       docker compose down"
echo ""
