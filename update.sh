#!/bin/sh
set -e

echo "==> 拉取最新代码..."
git pull origin main

echo "==> 重新构建并启动容器..."
sudo docker-compose down
sudo docker-compose up --build -d

echo "==> 完成！访问 http://$(hostname -I | awk '{print $1}'):8181"
