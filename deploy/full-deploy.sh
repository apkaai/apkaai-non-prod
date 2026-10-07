#!/bin/bash
# full-deploy.sh — update remote, pull latest, build, restart
set -e
APP="/home/ec2-user/apkaai"
TOKEN="${GITHUB_TOKEN}"

echo "=== [1/5] Updating git remote with new token ==="
cd "$APP"
git remote set-url origin "https://${TOKEN}@github.com/apkaai/apkaai.git"
echo "  ✅ Remote updated"

echo ""
echo "=== [2/5] Pulling latest main ==="
git fetch origin
git reset --hard origin/main
echo "  ✅ Code: $(git log --oneline -1)"

echo ""
echo "=== [3/5] Installing backend packages ==="
cd "$APP/backend"
npm install --omit=dev --prefer-offline 2>&1 | tail -3
echo "  ✅ Backend packages ready"

echo ""
echo "=== [4/5] Building frontend ==="
cd "$APP/frontend"
npm install --prefer-offline 2>&1 | tail -2
npm run build 2>&1 | tail -10
echo "  ✅ Build complete"

echo ""
echo "=== [5/5] Restarting services ==="
pm2 restart apkaai-api      --update-env
pm2 restart apkaai-frontend --update-env
pm2 save
sleep 5

echo ""
echo "=== Health checks ==="
curl -sf http://localhost:4000/health && echo "  ✅ API healthy" || echo "  ❌ API DOWN"
curl -sf http://localhost:3000 > /dev/null && echo "  ✅ Frontend UP" || echo "  ❌ Frontend DOWN"
pm2 list
echo ""
echo "✅ Deployment complete! Site: http://3.6.107.51"
