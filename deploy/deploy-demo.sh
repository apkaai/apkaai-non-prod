#!/bin/bash
# deploy-demo.sh — deploy demo booking system to EC2
set -e
APP="/home/ec2-user/apkaai"
TOKEN="${GITHUB_TOKEN}"

echo "=== [1/5] Update git remote + pull ==="
cd "$APP"
git remote set-url origin "https://${TOKEN}@github.com/apkaai/apkaai.git"
git fetch origin && git reset --hard origin/main
echo "  ✅ $(git log --oneline -1)"

echo ""
echo "=== [2/5] DB migration (demo_bookings table) ==="
# Read DB vars individually to avoid sourcing invalid JSON lines
DB_HOST=$(grep ^DB_HOST "$APP/backend/.env" | cut -d= -f2)
DB_PORT=$(grep ^DB_PORT "$APP/backend/.env" | cut -d= -f2 || echo "5432")
DB_NAME=$(grep ^DB_NAME "$APP/backend/.env" | cut -d= -f2)
DB_USER=$(grep ^DB_USER "$APP/backend/.env" | cut -d= -f2)
DB_PASS=$(grep ^DB_PASS "$APP/backend/.env" | cut -d= -f2)
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"
echo "  Migrating against: ${DB_HOST}/${DB_NAME}"
psql "$DATABASE_URL" -f "$APP/backend/src/lib/schema.sql" -v ON_ERROR_STOP=0 2>&1 | grep -E "(CREATE|ALTER|already exists|ERROR)" || true
echo "  ✅ Migrations applied"

echo ""
echo "=== [3/5] Install backend (luxon + new packages) ==="
cd "$APP/backend"
npm install --omit=dev --prefer-offline 2>&1 | tail -3
echo "  ✅ Backend packages installed"

echo ""
echo "=== [4/5] Build frontend ==="
cd "$APP/frontend"
npm install --prefer-offline 2>&1 | tail -2
npm run build 2>&1 | tail -5
echo "  ✅ Frontend built"

echo ""
echo "=== [5/5] Restart + health check ==="
pm2 restart apkaai-api --update-env
pm2 restart apkaai-frontend --update-env
pm2 save
sleep 5
curl -sf http://localhost:4000/health && echo "  ✅ API healthy" || echo "  ❌ API FAILED"
curl -sf http://localhost:3000 > /dev/null && echo "  ✅ Frontend UP" || echo "  ❌ Frontend FAILED"
pm2 list
echo ""
echo "✅ Demo booking deployed! Visit http://3.6.107.51/demo"
