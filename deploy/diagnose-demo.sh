#!/bin/bash
# diagnose-demo.sh — run ON EC2 to diagnose demo booking issues
APP="/home/ec2-user/apkaai"

echo "=== 1. API status ==="
curl -sf http://localhost:4000/health && echo "API: OK" || echo "API: DOWN"

echo ""
echo "=== 2. /api/demo/slots test ==="
curl -s "http://localhost:4000/api/demo/slots?date=2026-10-08"

echo ""
echo ""
echo "=== 3. Check if demo_bookings table exists ==="
DB_HOST=$(grep '^DB_HOST=' "$APP/backend/.env" | head -1 | cut -d= -f2-)
DB_PORT=$(grep '^DB_PORT=' "$APP/backend/.env" | head -1 | cut -d= -f2- || echo "5432")
DB_NAME=$(grep '^DB_NAME=' "$APP/backend/.env" | head -1 | cut -d= -f2-)
DB_USER=$(grep '^DB_USER=' "$APP/backend/.env" | head -1 | cut -d= -f2-)
DB_PASS=$(grep '^DB_PASS=' "$APP/backend/.env" | head -1 | cut -d= -f2-)
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"

psql "$DATABASE_URL" -c "\dt demo_bookings" 2>&1 | head -5

echo ""
echo "=== 4. Check if demo route is registered in index.js ==="
grep "demo" "$APP/backend/src/index.js" || echo "DEMO ROUTE NOT FOUND"

echo ""
echo "=== 5. Check if demo.js exists ==="
ls -la "$APP/backend/src/routes/demo.js" 2>&1

echo ""
echo "=== 6. Syntax check demo.js ==="
node --check "$APP/backend/src/routes/demo.js" && echo "demo.js: SYNTAX OK" || echo "demo.js: SYNTAX ERROR"

echo ""
echo "=== 7. API error logs ==="
pm2 logs apkaai-api --err --lines 8 --nostream 2>&1 | grep -v "^$" | tail -10

echo ""
echo "=== 8. Test POST /api/demo/book ==="
curl -s -X POST http://localhost:4000/api/demo/book \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@apkaai.com","slot_date":"2026-10-08","slot_time":"10:00"}'
echo ""
