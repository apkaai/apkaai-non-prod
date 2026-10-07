#!/bin/bash
# fix-502.sh — pull latest (with Navbar fix) and rebuild frontend
set -e
APP="/home/ec2-user/apkaai"

echo "=== [1/4] Pull latest code (Navbar fix included) ==="
cd "$APP"
git fetch origin
git reset --hard origin/main
echo "  ✅ $(git log --oneline -1)"

echo ""
echo "=== [2/4] Build frontend ==="
cd "$APP/frontend"
npm install --prefer-offline 2>&1 | tail -2
npm run build 2>&1
echo "  ✅ Build complete"

echo ""
echo "=== [3/4] Restart frontend ==="
pm2 restart apkaai-frontend --update-env
sleep 5

echo ""
echo "=== [4/4] Health checks ==="
curl -sf http://localhost:3000 > /dev/null && echo "  ✅ Frontend UP (port 3000)" || echo "  ❌ Frontend DOWN"
curl -sf http://localhost:4000/health        && echo "  API healthy" || echo "  API error"
pm2 list
echo ""
echo "=== DONE — site should be live at http://3.6.107.51 ==="
