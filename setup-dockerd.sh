#!/bin/bash
# ========================================================
# HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI ĐỘNG DOCKERD (UBUNTU / DEBIAN / WSL)
# ========================================================

set -e

echo "=== Cài đặt Docker Engine & dockerd ==="

# Cập nhật repository
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Thêm Docker GPG Key chính thức
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Cấu hình apt repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài đặt docker engine, cli, compose plugin
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Khởi động dockerd
echo "=== Khởi động Docker daemon (dockerd) ==="
sudo service docker start || sudo systemctl start docker

# Cấp quyền cho user hiện tại (tránh phải dùng sudo mỗi lần)
sudo usermod -aG docker $USER || true

echo ""
echo "=== ĐÃ HOÀN TẤT CÀI ĐẶT DOCKER & DOCKERD ==="
echo "Kiểm tra phiên bản:"
docker --version
docker compose version
echo ""
echo "Bạn có thể chạy dự án ngay bằng lệnh:"
echo "./docker-start.sh"
