#!/bin/bash
# Настройка нового сервера proev.ru на Ubuntu 22.04
# Запускать от root: bash setup-server.sh
set -e

apt-get update -y && apt-get upgrade -y
apt-get install -y curl git wget unzip htop ufw fail2ban \
  ca-certificates gnupg lsb-release nginx certbot python3-certbot-nginx

# Docker
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
systemctl enable docker

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# UFW
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 9000/tcp
echo "y" | ufw enable

# fail2ban
systemctl enable fail2ban && systemctl start fail2ban

# Пользователь deploy
useradd -m -s /bin/bash deploy 2>/dev/null || true
usermod -aG docker deploy

# Директория проекта
mkdir -p /opt/proev
chown deploy:deploy /opt/proev

echo "=== Сервер готов! ==="
