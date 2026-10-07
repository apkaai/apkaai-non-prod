#!/bin/bash
# check-and-fix-all.sh — diagnose + fix demo email + deploy latest frontend
APP="/home/ec2-user/apkaai"
TOKEN="${GITHUB_TOKEN}"

echo "=== 1. Current git state ==="
cd "$APP"
git remote set-url origin "https://${TOKEN}@github.com/apkaai/apkaai.git"
git fetch origin
echo "Local:  $(git log --oneline -1)"
echo "Remote: $(git log --oneline origin/main -1)"

echo ""
echo "=== 2. Email config check ==="
grep "^SES_FROM_EMAIL\|^SMTP_HOST\|^SMTP_USER\|^SMTP_PASS" "$APP/backend/.env" 2>/dev/null || echo "NO EMAIL CONFIG FOUND"

echo ""
echo "=== 3. Demo route check ==="
curl -s "http://localhost:4000/api/demo/slots?date=2026-10-09" | head -c 200
echo ""

echo ""
echo "=== 4. Pull latest code ==="
git reset --hard origin/main
echo "  Code: $(git log --oneline -1)"

echo ""
echo "=== 5. Fix payment.js ==="
node --check "$APP/backend/src/routes/payment.js" 2>&1 && echo "payment.js OK" || {
  echo "payment.js broken - applying inline fix"
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
}

echo ""
echo "=== 6. Install backend packages ==="
cd "$APP/backend"
npm install --omit=dev --prefer-offline 2>&1 | tail -3

echo ""
echo "=== 7. Test email sending directly ==="
node -e "
require('dotenv').config({path:'$APP/backend/.env'});
const {sendEmail} = require('./src/services/emailService');
sendEmail(
  process.env.DEMO_HOST_EMAIL || process.env.SMTP_USER,
  'Test Email from ApkaAI EC2',
  '<h2>Test</h2><p>Email service is working from EC2.</p>',
  'Test email from EC2'
).then(r => {
  console.log('Email result:', JSON.stringify(r));
  process.exit(0);
}).catch(e => {
  console.error('Email error:', e.message);
  process.exit(1);
});
" 2>&1 || true

echo ""
echo "=== 8. Restart API ==="
pm2 restart apkaai-api --update-env
sleep 4
curl -sf http://localhost:4000/health && echo "  API: OK" || echo "  API: FAILED"

echo ""
echo "=== 9. Build + restart frontend ==="
cd "$APP/frontend"
npm install --prefer-offline 2>&1 | tail -2
npm run build 2>&1 | tail -5
pm2 restart apkaai-frontend --update-env
sleep 3
curl -sf http://localhost:3000 > /dev/null && echo "  Frontend: UP" || echo "  Frontend: DOWN"

echo ""
echo "=== 10. Test demo booking with email ==="
curl -s -X POST http://localhost:4000/api/demo/book \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Ashutosh Pandey\",\"email\":\"ashutoshkumarpandey@apkaai.com\",\"slot_date\":\"2026-10-09\",\"slot_time\":\"14:00:00\",\"slot_timezone\":\"Asia/Kolkata\",\"duration_minutes\":30,\"calendar_type\":\"none\"}"
echo ""
echo "=== DONE ==="
