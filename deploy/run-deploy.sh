#!/bin/bash
# run-deploy.sh — Full production deploy to EC2
# Usage: bash deploy/run-deploy.sh  (from repo root)
set -e

KEY="$(pwd)/apkaai-key.pem"
HOST="ec2-user@3.6.107.51"
SSH="ssh -o StrictHostKeyChecking=no -i $KEY"

echo "🚀 Deploying ApkaAI to 3.6.107.51..."
echo "   Key: $KEY"
echo ""

$SSH $HOST << 'ENDSSH'
set -e
APP="/home/ec2-user/apkaai"
cd "$APP"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " [1/6] Syncing code from GitHub..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git fetch origin
git reset --hard origin/main
echo "  ✅ $(git log --oneline -1)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " [2/6] Running DB migrations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
set -a; source "$APP/backend/.env"; set +a
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"
psql "$DATABASE_URL" -f "$APP/backend/src/lib/schema.sql" -v ON_ERROR_STOP=0 2>&1 | grep -E "(CREATE|ALTER|ERROR|already exists)" || true
echo "  ✅ Migrations applied"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " [3/6] Installing backend dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$APP/backend"
npm install --omit=dev --prefer-offline 2>&1 | tail -3
echo "  ✅ Backend packages ready"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " [4/6] Building frontend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$APP/frontend"
npm install --prefer-offline 2>&1 | tail -3
rm -rf .next
npm run build 2>&1 | tail -10
echo "  ✅ Frontend built"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " [5/6] Restarting services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 restart apkaai-api --update-env
pm2 restart apkaai-frontend --update-env
pm2 save
echo "  ✅ Services restarted"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " [6/6] Health checks..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 5
curl -sf http://localhost:4000/health && echo "  ✅ API  healthy" || echo "  ❌ API  FAILED — run: pm2 logs apkaai-api"
curl -sf -o /dev/null http://localhost:3000  && echo "  ✅ Frontend healthy" || echo "  ❌ Frontend FAILED — run: pm2 logs apkaai-frontend"

echo ""
pm2 list
ENDSSH

echo ""
echo "═══════════════════════════════════════"
echo "  ✅  Deployment complete!"
echo "  🌐  http://3.6.107.51"
echo "═══════════════════════════════════════"
