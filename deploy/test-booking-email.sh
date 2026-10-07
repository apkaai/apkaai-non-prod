#!/bin/bash
# test-booking-email.sh — run ON EC2 to test booking + email
echo "=== Testing booking API with new time slot ==="
curl -s -X POST http://localhost:4000/api/demo/book \
  -H "Content-Type: application/json" \
  -d '{"name":"Ashutosh Pandey","email":"ashutoshkumarpandey@apkaai.com","company":"ApkaAI","slot_date":"2026-10-10","slot_time":"15:00:00","slot_timezone":"Asia/Kolkata","duration_minutes":30,"calendar_type":"none","use_case":"Email test"}' 
echo ""

echo ""
echo "=== API logs (last 10 lines) ==="
pm2 logs apkaai-api --lines 10 --nostream 2>&1 | tail -12

echo ""
echo "=== Check demo_bookings table ==="
node -e "
require('dotenv').config({path:'/home/ec2-user/apkaai/backend/.env'});
const fs=require('fs');
const env=fs.readFileSync('/home/ec2-user/apkaai/backend/.env','utf8');
const g=k=>{const l=env.split('\n').find(x=>x.startsWith(k+'='));return l?l.split('=').slice(1).join('=').trim():''};
const {Pool}=require('pg');
const pool=new Pool({host:g('DB_HOST'),port:parseInt(g('DB_PORT')||'5432'),database:g('DB_NAME'),user:g('DB_USER'),password:g('DB_PASS'),ssl:{rejectUnauthorized:false}});
pool.query('SELECT id,name,email,slot_date,slot_time,status,created_at FROM demo_bookings ORDER BY created_at DESC LIMIT 3').then(r=>{
  console.log('Recent bookings:');
  r.rows.forEach(b=>console.log(' -',b.name,b.email,b.slot_date,b.slot_time,b.status));
  pool.end();
}).catch(e=>{console.error(e.message);pool.end();});
" 2>&1

echo "=== Done ==="
