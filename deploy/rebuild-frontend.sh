#!/bin/bash
# rebuild-frontend.sh — pull latest and rebuild frontend only
set -e
APP="/home/ec2-user/apkaai"
cd "$APP"

echo "=== Pulling latest code ==="
git fetch origin
git reset --hard origin/main
echo "  ✅ Code: $(git log --oneline -1)"

echo ""
echo "=== Building frontend ==="
cd "$APP/frontend"
npm install --prefer-offline 2>&1 | tail -3
rm -rf .next
npm run build 2>&1 | tail -15
echo "  ✅ Frontend built"

echo ""
echo "=== Restarting frontend ==="
pm2 restart apkaai-frontend --update-env
sleep 3

echo ""
echo "=== Status ==="
pm2 list
echo ""
curl -sf http://localhost:4000/health && echo "API: ✅ healthy" || echo "API: ❌"
echo "✅ Done!"
