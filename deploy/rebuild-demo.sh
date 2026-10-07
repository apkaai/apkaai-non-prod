#!/bin/bash
# rebuild-demo.sh — pull latest + build frontend + apply hotpatch + restart all
APP="/home/ec2-user/apkaai"
TOKEN="${GITHUB_TOKEN}"

echo "=== 1. Pull latest ==="
cd "$APP"
git remote set-url origin "https://${TOKEN}@github.com/apkaai/apkaai.git"
git fetch origin && git reset --hard origin/main
echo "  Code: $(git log --oneline -1)"

echo ""
echo "=== 2. Fix payment.js ==="
node --check "$APP/backend/src/routes/payment.js" 2>/dev/null || {
  cat > "$APP/backend/src/routes/payment.js" << 'PAYFIX'
const express=require('express'),router=express.Router(),crypto=require('crypto'),Razorpay=require('razorpay'),{query}=require('../lib/db'),{sendEmail}=require('../services/emailService')
function getRazorpay(){const k=process.env.RAZORPAY_KEY_ID,s=process.env.RAZORPAY_KEY_SECRET;if(!k||!s)throw new Error('Razorpay keys not configured');return new Razorpay({key_id:k,key_secret:s})}
function verifyToken(t){try{const[p,s]=t.split('.');const e=process.env.JWT_SECRET||'apkaai-jwt-secret-2026';const x=crypto.createHmac('sha256',e).update(p).digest('hex').slice(0,32);if(s!==x)return null;return JSON.parse(Buffer.from(p,'base64url').toString())}catch{return null}}
function requireAuth(req,res,next){const a=req.headers.authorization;if(!a?.startsWith('Bearer '))return res.status(401).json({error:'Not authenticated'});const d=verifyToken(a.split(' ')[1]);if(!d)return res.status(401).json({error:'Invalid token'});req.user=d;next()}
router.post('/create-order',requireAuth,async(req,res,next)=>{try{const{orderId}=req.body;if(!orderId)return res.status(400).json({error:'orderId required'});const r=await query('SELECT * FROM orders WHERE order_id=$1 AND user_id=$2',[orderId,req.user.userId]);if(!r.rowCount)return res.status(404).json({error:'Order not found'});const o=r.rows[0];if(o.status==='completed')return res.status(400).json({error:'Already paid'});const p=Math.round(Number(o.total)*100);if(p<100)return res.status(400).json({error:'Too low'});const rzp=getRazorpay();const ro=await rzp.orders.create({amount:p,currency:'INR',receipt:`apkaai_${o.order_id.slice(0,16)}`});await query('UPDATE orders SET payment_id=$1,updated_at=NOW() WHERE order_id=$2',[ro.id,o.order_id]);res.json({success:true,razorpayOrderId:ro.id,amount:ro.amount,currency:'INR',keyId:process.env.RAZORPAY_KEY_ID,prefill:{name:req.user.name||'',email:req.user.email||''}})}catch(err){if(err.message?.includes('Razorpay keys not configured'))return res.status(503).json({error:err.message});next(err)}})
router.post('/verify',requireAuth,async(req,res,next)=>{try{const{razorpayOrderId,razorpayPaymentId,razorpaySignature,orderId}=req.body;if(!razorpayOrderId||!razorpayPaymentId||!razorpaySignature||!orderId)return res.status(400).json({error:'All fields required'});const exp=crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET||'').update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');if(exp!==razorpaySignature)return res.status(400).json({error:'Signature mismatch'});const u=await query("UPDATE orders SET status='completed',payment_id=$1,updated_at=NOW() WHERE order_id=$2 AND user_id=$3 RETURNING *",[razorpayPaymentId,orderId,req.user.userId]);if(!u.rowCount)return res.status(404).json({error:'Order not found'});res.json({success:true,message:'Payment verified',orderId,paymentId:razorpayPaymentId,status:'completed'})}catch(err){next(err)}})
router.post('/webhook',express.raw({type:'application/json'}),async(req,res)=>{res.json({received:true})})
router.get('/config',(req,res)=>{const k=process.env.RAZORPAY_KEY_ID;if(!k)return res.status(503).json({error:'Not configured'});res.json({keyId:k,currency:'INR'})})
router.get('/plans',(req,res)=>{res.json({plans:[],message:'Use /api/tools for pricing'})})
module.exports=router
PAYFIX
  echo "  payment.js hotfixed"
}

echo ""
echo "=== 3. Hotpatch calendarService.js ==="
cat > "$APP/backend/src/services/calendarService.js" << 'CALENDARSERVICE'
const { DateTime } = require('luxon')

function buildDateTimeRange(slotDate, slotTime, timezone, durationMinutes) {
  const tz = timezone || 'Asia/Kolkata'
  const mins = durationMinutes || 30
  const timeStr = (slotTime || '10:00:00').replace(/^(\d{2}:\d{2})$/, '$1:00')
  let startDt = DateTime.fromISO(`${slotDate}T${timeStr}`, { zone: tz })
  if (!startDt.isValid) startDt = DateTime.fromISO(`${slotDate}T${timeStr}`, { zone: 'UTC' })
  if (!startDt.isValid) startDt = DateTime.now().setZone(tz)
  const endDt = startDt.plus({ minutes: mins })
  const safeISO = (dt) => dt && dt.isValid ? (dt.toISO() || new Date().toISOString()) : new Date().toISOString()
  return {
    startIso:    safeISO(startDt),
    endIso:      safeISO(endDt),
    startUtc:    safeISO(startDt.toUTC()),
    endUtc:      safeISO(endDt.toUTC()),
    displayTime: startDt.isValid ? startDt.toFormat('cccc, LLLL d yyyy, h:mm a ZZZZ') : `${slotDate} at ${timeStr}`,
  }
}

async function createGoogleCalendarEvent(booking) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    console.warn('[Calendar] GOOGLE_SERVICE_ACCOUNT_JSON not set')
    return null
  }
  try {
    const { google } = require('googleapis')
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/calendar'] })
    const calendar = google.calendar({ version: 'v3', auth })
    const { startIso, endIso } = buildDateTimeRange(booking.slot_date, booking.slot_time, booking.slot_timezone, booking.duration_minutes)
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
    const event = {
      summary: `ApkaAI Demo — ${booking.name}${booking.company ? ` (${booking.company})` : ''}`,
      description: [`Demo for ${booking.name}`, booking.use_case ? `Use case: ${booking.use_case}` : '', `ID: ${booking.id}`].filter(Boolean).join('\n'),
      start: { dateTime: startIso, timeZone: booking.slot_timezone || 'Asia/Kolkata' },
      end:   { dateTime: endIso,   timeZone: booking.slot_timezone || 'Asia/Kolkata' },
      attendees: [{ email: booking.email, displayName: booking.name }, { email: process.env.DEMO_HOST_EMAIL || 'ashutoshkumarpandey@apkaai.com', organizer: true }],
      conferenceData: { createRequest: { requestId: `apkaai-demo-${booking.id}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 24*60 }, { method: 'email', minutes: 60 }] },
    }
    const response = await calendar.events.insert({ calendarId, resource: event, conferenceDataVersion: 1, sendUpdates: 'all' })
    const meetLink = response.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri
    return { eventId: response.data.id, meetingLink: meetLink || response.data.hangoutLink || null, htmlLink: response.data.htmlLink }
  } catch (err) { console.error('[Calendar] Google Calendar error:', err.message); return null }
}

async function createCalendarEvent(booking, calendarType) {
  if (calendarType === 'google') {
    const result = await createGoogleCalendarEvent(booking)
    if (result) return { provider: 'google', meetingLink: result.meetingLink, eventId: result.eventId }
  }
  const frontendUrl = (process.env.FRONTEND_URL || 'https://apkaai.com').replace(/\/$/, '')
  return { provider: 'none', meetingLink: `${frontendUrl}/demo/join/${booking.id}`, eventId: null }
}

function buildCalendarLinks(booking) {
  if (!booking || !booking.slot_date || !booking.slot_time) {
    return { googleUrl: 'https://calendar.google.com', outlookUrl: 'https://outlook.live.com/calendar', office365Url: 'https://outlook.office.com/calendar', icsUrl: '', displayTime: 'Time to be confirmed' }
  }
  const { startIso, endIso, displayTime } = buildDateTimeRange(booking.slot_date, booking.slot_time, booking.slot_timezone, booking.duration_minutes)
  const meetLink = booking.meeting_link || ''
  const title    = encodeURIComponent(`ApkaAI Demo — ${booking.name || 'Guest'}`)
  const details  = encodeURIComponent(`ApkaAI demo\nMeeting: ${meetLink || '(link coming)'}`)
  const location = encodeURIComponent(meetLink || 'Online')
  const gStart   = startIso.replace(/[-:]/g,'').replace('.000','').replace('Z','Z')
  const gEnd     = endIso.replace(/[-:]/g,'').replace('.000','').replace('Z','Z')
  return {
    googleUrl:    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${gStart}/${gEnd}&details=${details}&location=${location}`,
    outlookUrl:   `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startIso}&enddt=${endIso}&body=${details}&location=${location}`,
    office365Url: `https://outlook.office.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startIso}&enddt=${endIso}&body=${details}&location=${location}`,
    icsUrl:       '',
    displayTime,
  }
}

module.exports = { createCalendarEvent, buildCalendarLinks, buildDateTimeRange }
CALENDARSERVICE
echo "  calendarService.js patched"

echo ""
echo "=== 4. Restart API ==="
pm2 restart apkaai-api --update-env
sleep 4
curl -sf http://localhost:4000/health && echo "  API: OK" || echo "  API: FAILED"

echo ""
echo "=== 5. Build frontend ==="
cd "$APP/frontend"
npm install --prefer-offline 2>&1 | tail -2
npm run build 2>&1 | tail -8
pm2 restart apkaai-frontend --update-env
sleep 3
curl -sf http://localhost:3000 > /dev/null && echo "  Frontend: UP" || echo "  Frontend: DOWN"

echo ""
echo "=== ALL DONE === Site: http://3.6.107.51/demo"
