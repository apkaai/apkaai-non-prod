#!/bin/bash
# migrate-demo.sh — create demo_bookings table and test booking
APP="/home/ec2-user/apkaai"

DB_HOST=$(grep '^DB_HOST=' "$APP/backend/.env" | head -1 | cut -d= -f2-)
DB_PORT=$(grep '^DB_PORT=' "$APP/backend/.env" | head -1 | cut -d= -f2- || echo "5432")
DB_NAME=$(grep '^DB_NAME=' "$APP/backend/.env" | head -1 | cut -d= -f2-)
DB_USER=$(grep '^DB_USER=' "$APP/backend/.env" | head -1 | cut -d= -f2-)
DB_PASS=$(grep '^DB_PASS=' "$APP/backend/.env" | head -1 | cut -d= -f2-)
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"

echo "=== Running schema migration ==="
psql "$DATABASE_URL" -f "$APP/backend/src/lib/schema.sql" -v ON_ERROR_STOP=0 2>&1 | grep -E "(CREATE|ALTER|already exists|ERROR|demo)" || true

echo ""
echo "=== Check demo_bookings table ==="
psql "$DATABASE_URL" -c "\dt demo_bookings" 2>&1

echo ""
echo "=== Check demo route is registered ==="
grep -n "demo" "$APP/backend/src/index.js" | head -5

echo ""
echo "=== Check demo.js syntax ==="
node --check "$APP/backend/src/routes/demo.js" && echo "demo.js: OK" || echo "demo.js: SYNTAX ERROR"

echo ""
echo "=== Test slot endpoint ==="
curl -s "http://localhost:4000/api/demo/slots?date=2026-10-09"

echo ""
echo ""
echo "=== Test booking ==="
curl -s -X POST http://localhost:4000/api/demo/book \
  -H "Content-Type: application/json" \
  -d '{"name":"Ashutosh Pandey","email":"ashutoshkumarpandey@apkaai.com","slot_date":"2026-10-09","slot_time":"14:00:00","slot_timezone":"Asia/Kolkata","duration_minutes":30,"calendar_type":"none"}'
echo ""
echo "=== Done ==="
