#!/bin/bash
APP="/home/ec2-user/apkaai"

DB_HOST=$(grep '^DB_HOST=' "$APP/backend/.env" | head -1 | cut -d= -f2-)
DB_PORT=$(grep '^DB_PORT=' "$APP/backend/.env" | head -1 | cut -d= -f2- || echo "5432")
DB_NAME=$(grep '^DB_NAME=' "$APP/backend/.env" | head -1 | cut -d= -f2-)
DB_USER=$(grep '^DB_USER=' "$APP/backend/.env" | head -1 | cut -d= -f2-)
DB_PASS=$(grep '^DB_PASS=' "$APP/backend/.env" | head -1 | cut -d= -f2-)

echo "DB: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

PGPASSWORD="$DB_PASS" /usr/bin/psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" << 'SQL'
CREATE TABLE IF NOT EXISTS demo_bookings (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(200) NOT NULL,
  email            VARCHAR(200) NOT NULL,
  company          VARCHAR(200),
  phone            VARCHAR(30),
  use_case         TEXT,
  slot_date        DATE         NOT NULL,
  slot_time        TIME         NOT NULL,
  slot_timezone    VARCHAR(80)  DEFAULT 'Asia/Kolkata',
  duration_minutes INTEGER      DEFAULT 30,
  status           VARCHAR(20)  DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  calendar_type    VARCHAR(20)  DEFAULT 'google'
                   CHECK (calendar_type IN ('google','outlook','teams','none')),
  meeting_link     TEXT,
  google_event_id  VARCHAR(200),
  ms_event_id      VARCHAR(200),
  reminder_24h_sent BOOLEAN     DEFAULT FALSE,
  reminder_1h_sent  BOOLEAN     DEFAULT FALSE,
  cancellation_reason TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_email     ON demo_bookings(email);
CREATE INDEX IF NOT EXISTS idx_demo_slot_date ON demo_bookings(slot_date);
CREATE INDEX IF NOT EXISTS idx_demo_status    ON demo_bookings(status);

SELECT 'demo_bookings table ready' AS status;
SELECT COUNT(*) AS existing_bookings FROM demo_bookings;
SQL

echo ""
echo "=== Testing booking API ==="
curl -s -X POST http://localhost:4000/api/demo/book \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"ashutoshkumarpandey@apkaai.com","slot_date":"2026-10-09","slot_time":"14:00:00","slot_timezone":"Asia/Kolkata","duration_minutes":30,"calendar_type":"none"}'
echo ""
echo "=== Done ==="
