#!/bin/bash
APP="/home/ec2-user/apkaai"

echo "=== Creating demo_bookings table via Node.js ==="
cd "$APP/backend"
node -e "
require('dotenv').config();
// Read individual env vars to avoid JSON parse issues
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => {
  const line = envContent.split('\n').find(l => l.startsWith(key + '='));
  return line ? line.split('=').slice(1).join('=').trim() : '';
};
const { Pool } = require('pg');
const pool = new Pool({
  host: getEnv('DB_HOST'),
  port: parseInt(getEnv('DB_PORT') || '5432'),
  database: getEnv('DB_NAME'),
  user: getEnv('DB_USER'),
  password: getEnv('DB_PASS'),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

const sql = \`
CREATE TABLE IF NOT EXISTS demo_bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(200) NOT NULL,
  email            VARCHAR(200) NOT NULL,
  company          VARCHAR(200),
  phone            VARCHAR(30),
  use_case         TEXT,
  slot_date        DATE NOT NULL,
  slot_time        TIME NOT NULL,
  slot_timezone    VARCHAR(80) DEFAULT 'Asia/Kolkata',
  duration_minutes INTEGER DEFAULT 30,
  status           VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  calendar_type    VARCHAR(20) DEFAULT 'google' CHECK (calendar_type IN ('google','outlook','teams','none')),
  meeting_link     TEXT,
  google_event_id  VARCHAR(200),
  ms_event_id      VARCHAR(200),
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  reminder_1h_sent  BOOLEAN DEFAULT FALSE,
  cancellation_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_demo_email     ON demo_bookings(email);
CREATE INDEX IF NOT EXISTS idx_demo_slot_date ON demo_bookings(slot_date);
CREATE INDEX IF NOT EXISTS idx_demo_status    ON demo_bookings(status);
\`;

pool.query(sql).then(r => {
  console.log('demo_bookings table created/verified!');
  return pool.query('SELECT COUNT(*) FROM demo_bookings');
}).then(r => {
  console.log('Existing bookings:', r.rows[0].count);
  pool.end();
}).catch(e => {
  console.error('Error:', e.message);
  pool.end();
  process.exit(1);
});
" 2>&1

echo ""
echo "=== Testing demo booking with email ==="
curl -s -X POST http://localhost:4000/api/demo/book \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Ashutosh Pandey\",\"email\":\"ashutoshkumarpandey@apkaai.com\",\"company\":\"ApkaAI\",\"slot_date\":\"2026-10-10\",\"slot_time\":\"14:00:00\",\"slot_timezone\":\"Asia/Kolkata\",\"duration_minutes\":30,\"calendar_type\":\"none\",\"use_case\":\"Demo test booking\"}"
echo ""
echo "=== Done ==="
