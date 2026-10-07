#!/bin/bash
# fix-api.sh — run ON EC2: fix payment.js and restart API
set -e
FILE="/home/ec2-user/apkaai/backend/src/routes/payment.js"

echo "Backing up broken file..."
cp "$FILE" "${FILE}.broken.$(date +%s)"

echo "Writing clean payment.js..."
cat > "$FILE" << 'PAYMENT_JS'
const express   = require('express')
const router    = express.Router()
const crypto    = require('crypto')
const Razorpay  = require('razorpay')
const { query } = require('../lib/db')
const { sendEmail } = require('../services/emailService')

function getRazorpay() {
  const keyId     = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) throw new Error('Razorpay keys not configured')
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.')
    const secret   = process.env.JWT_SECRET || 'apkaai-jwt-secret-2026'
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32)
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch { return null }
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  const decoded = verifyToken(auth.split(' ')[1])
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = decoded
  next()
}

function buildConfirmHtml({ userName, orderId, items, subtotal, discount, tax, total, couponCode, paymentId }) {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://apkaai.com').replace(/\/$/, '')
  const year = new Date().getFullYear()
  const rows = items.map(i => `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(124,58,237,0.1);font-size:14px;color:#fff;">${i.tool_name||i.toolName} — ${i.plan_name||i.planName}</td><td style="padding:8px 0;text-align:right;font-size:14px;color:#C4B5FD;">${i.plan_price||i.planPrice}</td></tr>`).join('')
  return `<!DOCTYPE html><html><body style="margin:0;background:#08051A;font-family:sans-serif;">
<table width="100%" style="padding:40px 16px;background:#08051A;"><tr><td align="center">
<table width="100%" style="max-width:540px;background:#0F0A1E;border:1px solid rgba(124,58,237,0.3);border-radius:16px;overflow:hidden;">
<tr><td style="padding:28px 40px;text-align:center;background:linear-gradient(135deg,#150D2E,#0F0A1E);border-bottom:1px solid rgba(124,58,237,0.2);">
  <h1 style="margin:0;color:#fff;font-size:22px;">apka<span style="color:#A855F7;">AI</span></h1></td></tr>
<tr><td style="padding:28px 40px;">
  <h2 style="margin:0 0 12px;color:#fff;">Order Confirmed!</h2>
  <p style="color:#94A3B8;font-size:14px;">Hi <strong style="color:#fff;">${userName}</strong>, your order is confirmed!</p>
  <p style="color:#94A3B8;font-size:13px;">Order: <strong style="color:#C4B5FD;">#${orderId.slice(0,8).toUpperCase()}</strong> | Payment: <strong style="color:#fff;">${paymentId||'N/A'}</strong></p>
  <table width="100%" style="margin:16px 0;">${rows}</table>
  <table width="100%" style="border-top:1px solid rgba(124,58,237,0.2);padding-top:12px;">
    <tr><td style="color:#94A3B8;font-size:13px;">Subtotal</td><td style="text-align:right;color:#fff;font-size:13px;">Rs.${Number(subtotal).toLocaleString('en-IN')}</td></tr>
    ${Number(discount)>0?`<tr><td style="color:#6EE7B7;font-size:13px;">Discount${couponCode?` (${couponCode})`:''}</td><td style="text-align:right;color:#6EE7B7;font-size:13px;">-Rs.${Number(discount).toLocaleString('en-IN')}</td></tr>`:''}
    <tr><td style="color:#94A3B8;font-size:13px;">GST (18%)</td><td style="text-align:right;color:#fff;font-size:13px;">Rs.${Number(tax).toLocaleString('en-IN')}</td></tr>
    <tr><td style="color:#fff;font-weight:bold;font-size:15px;padding-top:8px;border-top:1px solid rgba(124,58,237,0.2);">Total Paid</td><td style="text-align:right;color:#C4B5FD;font-weight:bold;font-size:15px;padding-top:8px;border-top:1px solid rgba(124,58,237,0.2);">Rs.${Number(total).toLocaleString('en-IN')}</td></tr>
  </table>
  <a href="${frontendUrl}/orders" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;">View Orders</a>
</td></tr>
<tr><td style="padding:16px;text-align:center;background:#080514;font-size:11px;color:#475569;">&copy; ${year} ApkaAI | <a href="${frontendUrl}" style="color:#7C3AED;">apkaai.com</a></td></tr>
</table></td></tr></table></body></html>`
}

async function sendConfirmEmail(data) {
  const subject = `Order Confirmed - #${data.orderId.slice(0,8).toUpperCase()} | ApkaAI`
  const html    = buildConfirmHtml(data)
  const text    = `Hi ${data.userName}, your ApkaAI order #${data.orderId.slice(0,8).toUpperCase()} is confirmed! Total: Rs.${Number(data.total).toLocaleString('en-IN')}`
  const result  = await sendEmail(data.userEmail, subject, html, text)
  if (!result.ok) console.warn('[Payment] Email not sent:', result.reason)
  return result
}

router.post('/create-order', requireAuth, async (req, res, next) => {
  try {
    const { orderId } = req.body
    if (!orderId) return res.status(400).json({ error: 'orderId is required' })
    const r = await query('SELECT * FROM orders WHERE order_id=$1 AND user_id=$2', [orderId, req.user.userId])
    if (!r.rowCount) return res.status(404).json({ error: 'Order not found' })
    const order = r.rows[0]
    if (order.status === 'completed') return res.status(400).json({ error: 'Order already paid' })
    const paise = Math.round(Number(order.total) * 100)
    if (paise < 100) return res.status(400).json({ error: 'Order total too low' })
    const rzp = getRazorpay()
    const rzpOrder = await rzp.orders.create({ amount: paise, currency: 'INR', receipt: `apkaai_${order.order_id.slice(0,16)}` })
    await query('UPDATE orders SET payment_id=$1, updated_at=NOW() WHERE order_id=$2', [rzpOrder.id, order.order_id])
    res.json({ success: true, razorpayOrderId: rzpOrder.id, amount: rzpOrder.amount, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID, prefill: { name: req.user.name||'', email: req.user.email||'' } })
  } catch (err) {
    if (err.message?.includes('Razorpay keys not configured')) return res.status(503).json({ error: err.message })
    next(err)
  }
})

router.post('/verify', requireAuth, async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body
    if (!razorpayOrderId||!razorpayPaymentId||!razorpaySignature||!orderId)
      return res.status(400).json({ error: 'All payment fields required' })
    const secret = process.env.RAZORPAY_KEY_SECRET || ''
    const expected = crypto.createHmac('sha256', secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex')
    if (expected !== razorpaySignature) return res.status(400).json({ error: 'Signature mismatch' })
    const upd = await query(`UPDATE orders SET status='completed',payment_id=$1,updated_at=NOW() WHERE order_id=$2 AND user_id=$3 RETURNING *`, [razorpayPaymentId, orderId, req.user.userId])
    if (!upd.rowCount) return res.status(404).json({ error: 'Order not found' })
    const order = upd.rows[0]
    const [items, user] = await Promise.all([
      query('SELECT * FROM order_items WHERE order_id=$1', [orderId]),
      query('SELECT name,email FROM users WHERE user_id=$1', [req.user.userId])
    ])
    const u = user.rows[0] || { name: 'Customer', email: req.user.email }
    sendConfirmEmail({ userName: u.name, userEmail: u.email, orderId: order.order_id, items: items.rows, subtotal: order.subtotal, discount: order.discount, tax: order.tax, total: order.total, couponCode: order.coupon_code, paymentId: razorpayPaymentId }).catch(e => console.error('[Payment] Email error:', e.message))
    res.json({ success: true, message: 'Payment verified', orderId: order.order_id, paymentId: razorpayPaymentId, status: 'completed' })
  } catch (err) { next(err) }
})

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (secret) {
      const sig = req.headers['x-razorpay-signature']
      const exp = crypto.createHmac('sha256', secret).update(req.body).digest('hex')
      if (sig !== exp) return res.status(400).json({ error: 'Invalid webhook signature' })
    }
    const event = JSON.parse(req.body.toString())
    const p = event?.payload?.payment?.entity
    if (event.event === 'payment.captured' && p?.order_id) {
      const r = await query(`UPDATE orders SET status='completed',payment_id=$1,updated_at=NOW() WHERE payment_id=$2 AND status!='completed' RETURNING *`, [p.id, p.order_id])
      if (r.rowCount) {
        const o = r.rows[0]
        const [items, user] = await Promise.all([query('SELECT * FROM order_items WHERE order_id=$1',[o.order_id]), query('SELECT name,email FROM users WHERE user_id=$1',[o.user_id])])
        const u = user.rows[0]||{name:'Customer',email:''}
        if (u.email) sendConfirmEmail({ userName: u.name, userEmail: u.email, orderId: o.order_id, items: items.rows, subtotal: o.subtotal, discount: o.discount, tax: o.tax, total: o.total, couponCode: o.coupon_code, paymentId: p.id }).catch(e => console.error('[Webhook] Email:', e.message))
      }
    }
    if (event.event === 'payment.failed' && p?.order_id)
      await query(`UPDATE orders SET status='cancelled',updated_at=NOW() WHERE payment_id=$1 AND status='pending'`, [p.order_id])
    res.json({ received: true })
  } catch (err) { next(err) }
})

router.get('/config', (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID
  if (!keyId) return res.status(503).json({ error: 'Payment gateway not configured' })
  res.json({ keyId, currency: 'INR' })
})

router.get('/plans', (req, res) => {
  res.json({ plans: [], message: 'Use /api/tools for tool pricing plans' })
})

module.exports = router
PAYMENT_JS

echo "Syntax check..."
node --check "$FILE" && echo "SYNTAX_OK" || echo "SYNTAX_ERROR"

echo "Restarting API..."
pm2 restart apkaai-api --update-env
sleep 5
curl -sf http://localhost:4000/health && echo "API_OK" || echo "API_FAIL"
