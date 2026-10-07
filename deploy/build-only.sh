#!/bin/bash
set -e
APP="/home/ec2-user/apkaai"
echo "=== Building frontend ==="
cd "$APP/frontend"
npm install --prefer-offline 2>&1 | tail -2
npm run build 2>&1
echo "BUILD_DONE"
echo "=== Restarting ==="
pm2 restart apkaai-frontend --update-env
sleep 5
curl -sf http://localhost:3000 > /dev/null && echo "FRONTEND_UP" || echo "FRONTEND_DOWN"
curl -sf http://localhost:4000/health && echo "" || echo "API_DOWN"
pm2 list
