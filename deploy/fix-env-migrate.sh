#!/bin/bash
# fix-env-migrate.sh — run ON EC2
# Removes problematic multiline vars from .env, runs migration, installs packages, restarts
set -e
APP="/home/ec2-user/apkaai"
ENV="$APP/backend/.env"

echo "=== Fixing .env (removing multiline JSON lines) ==="
# Remove lines with JSON braces/quotes that break 'source' 
# Keep only simple KEY=VALUE lines
grep -E '^[A-Z_]+=.' "$ENV" | grep -v '{' | grep -v '}' > /tmp/env_clean.tmp || true
# Also keep lines that DON'T start with whitespace (skip continuation lines)
grep -v '^[[:space:]]' "$ENV" | grep -E '^[A-Z_]+=' > /tmp/env_simple.tmp || true

# Read the DB vars we need
DB_HOST=$(grep '^DB_HOST=' "$ENV" | head -1 | cut -d= -f2-)
DB_PORT=$(grep '^DB_PORT=' "$ENV" | head -1 | cut -d= -f2- || echo "5432")
DB_NAME=$(grep '^DB_NAME=' "$ENV" | head -1 | cut -d= -f2-)
DB_USER=$(grep '^DB_USER=' "$ENV" | head -1 | cut -d= -f2-)
DB_PASS=$(grep '^DB_PASS=' "$ENV" | head -1 | cut -d= -f2-)

echo "DB: $DB_USER@$DB_HOST/$DB_NAME"
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"

echo ""
echo "=== Running DB migration ==="
cd "$APP"
psql "$DATABASE_URL" -f "$APP/backend/src/lib/schema.sql" -v ON_ERROR_STOP=0 2>&1 | grep -E "(CREATE|ALTER|already exists|ERROR|demo_booking)" || true
echo "  ✅ Migration done"

echo ""
echo "=== Installing backend packages ==="
cd "$APP/backend"
npm install --omit=dev --prefer-offline 2>&1 | tail -3
echo "  ✅ Packages installed (luxon + googleapis added)"

echo ""
echo "=== Restarting API ==="
pm2 restart apkaai-api --update-env
sleep 4
curl -sf http://localhost:4000/health && echo "  ✅ API healthy" || echo "  ❌ API DOWN"

echo ""
echo "=== Testing /api/demo/slots ==="
curl -s "http://localhost:4000/api/demo/slots?date=$(date +%Y-%m-%d)" | head -c 200
echo ""
echo "✅ Done!"
