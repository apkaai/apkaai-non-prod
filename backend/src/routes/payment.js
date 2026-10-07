const express   = require('express')
const router    = express.Router()
const crypto    = require('crypto')
const Razorpay  = require('razorpay')
const { query } = require('../lib/db')
const { sendEmail } = require('../services/emailService')

// ─────────────────────────────────────────────────────────────────────────────
// Razorpay instance (lazy — only initialised when keys are present)
// ─────────────────────────────────────────────────────────────────────────────
function getRazorpay() {
  const keyId     = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env')
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper — same HMAC scheme as auth.js
// ─────────────────────────────────────────────────────────────────────────────
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
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  const decoded = verifyToken(auth.split(' ')[1])
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = decoded
  next()
}

// ─────────────────────────────────────────────────────────────────────────────
// Email helpers — now powered by SES via emailService (SMTP fallback built-in)
// ─────────────────────────────────────────────────────────────────────────────
async function sendOrderConfirmationEmail({ userName, userEmail, orderId, items, subtotal, discount, tax, total, couponCode, paymentId }) {
  const subject    = `✅ Order Confirmed — #${orderId.slice(0,8).toUpperCase()} | ApkaAI`
  const html       = buildOrderConfirmationEmail({ userName, userEmail, orderId, items, subtotal, discount, tax, total, couponCode, paymentId })
  const text       = [
    `Hi ${userName}, your ApkaAI order is confirmed!`,
    `Order ID: #${orderId.slice(0,8).toUpperCase()}`,
    `Payment ID: ${paymentId || 'N/A'}`,
    `Total Paid: ₹${Number(total).toLocaleString('en-IN')}`,
    '',
    `View your orders: ${(process.env.FRONTEND_URL || 'https://apkaai.com').replace(/\/$/, '')}/orders`,
  ].join('\n')

  const result = await sendEmail(userEmail, subject, html, text)
  if (!result.ok) {
    console.warn(`[Payment] Confirmation email not sent to ${userEmail}: ${result.reason}`)
  } else {
    console.log(`[Payment] Confirmation email sent via ${result.provider} to ${userEmail}`)
  }
  return result
}

function buildOrderConfirmationEmail({ userName, userEmail, orderId, items, subtotal, discount, tax, total, couponCode, paymentId }) {
  const year     = new Date().getFullYear()
  const frontendUrl = (process.env.FRONTEND_URL || 'https://apkaai.com').replace(/\/$/, '')
  const orderUrl = `${frontendUrl}/orders`

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(124,58,237,0.1);">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="36" style="vertical-align:middle;">
              <span style="font-size:24px;">${item.tool_logo || item.toolLogo || '🤖'}</span>
            </td>
            <td style="vertical-align:middle;padding-left:10px;">
              <p style="margin:0;font-size:14px;font-weight:600;color:#fff;">${item.tool_name || item.toolName}</p>
              <p style="margin:2px 0 0;font-size:12px;color:#94A3B8;text-transform:capitalize;">
                ${item.plan_name || item.planName} Plan · ${item.billing_cycle || item.billingCycle} billing
              </p>
            </td>
            <td style="text-align:right;vertical-align:middle;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#C4B5FD;">${item.plan_price || item.planPrice}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Order Confirmed — ApkaAI</title>
</head>
<body style="margin:0;padding:0;background:#08051A;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#08051A;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:540px;background:#0F0A1E;border:1px solid rgba(124,58,237,0.35);border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#150D2E,#0F0A1E);padding:28px 40px;text-align:center;border-bottom:1px solid rgba(124,58,237,0.2);">
          <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#fff;">apka<span style="color:#A855F7;">AI</span></h1>
          <p style="margin:0;font-size:12px;color:#7C3AED;">World's #1 AI Tools Marketplace</p>
        </td></tr>

        <!-- Success banner -->
        <tr><td style="background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(5,150,105,0.08));padding:24px 40px;text-align:center;border-bottom:1px solid rgba(16,185,129,0.15);">
          <div style="width:56px;height:56px;background:rgba(16,185,129,0.2);border:2px solid rgba(16,185,129,0.4);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <span style="font-size:28px;">✅</span>
          </div>
          <h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#fff;">Order Confirmed!</h2>
          <p style="margin:0;font-size:14px;color:#6EE7B7;">Your AI tools subscription is ready.</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 40px;">

          <p style="margin:0 0 20px;font-size:14px;color:#94A3B8;line-height:1.6;">
            Hi <strong style="color:#fff;">${userName}</strong>, thank you for your order!
            Your payment was successful and your subscriptions are now active.
          </p>

          <!-- Order meta -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid rgba(124,58,237,0.1);">
                <span style="font-size:12px;color:#64748B;">Order ID</span><br>
                <span style="font-size:13px;font-weight:700;color:#C4B5FD;font-family:monospace;">#${orderId.slice(0,8).toUpperCase()}</span>
              </td>
              <td style="padding:12px 16px;border-bottom:1px solid rgba(124,58,237,0.1);">
                <span style="font-size:12px;color:#64748B;">Payment ID</span><br>
                <span style="font-size:13px;font-weight:600;color:#fff;font-family:monospace;">${paymentId || 'N/A'}</span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding:12px 16px;">
                <span style="font-size:12px;color:#64748B;">Date</span><br>
                <span style="font-size:13px;color:#fff;">${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</span>
              </td>
            </tr>
          </table>

          <!-- Items -->
          <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.05em;">Items Ordered</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            ${itemRows}
          </table>

          <!-- Price breakdown -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.15);border-radius:10px;overflow:hidden;margin-bottom:24px;">
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#94A3B8;">Subtotal</td>
              <td style="padding:10px 16px;font-size:13px;color:#fff;text-align:right;">₹${Number(subtotal).toLocaleString('en-IN')}</td>
            </tr>
            ${Number(discount) > 0 ? `
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6EE7B7;">Discount${couponCode ? ` (${couponCode})` : ''}</td>
              <td style="padding:10px 16px;font-size:13px;color:#6EE7B7;text-align:right;">−₹${Number(discount).toLocaleString('en-IN')}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#94A3B8;">GST (18%)</td>
              <td style="padding:10px 16px;font-size:13px;color:#fff;text-align:right;">₹${Number(tax).toLocaleString('en-IN')}</td>
            </tr>
            <tr style="background:rgba(124,58,237,0.12);">
              <td style="padding:12px 16px;font-size:15px;font-weight:700;color:#fff;">Total Paid</td>
              <td style="padding:12px 16px;font-size:15px;font-weight:700;color:#C4B5FD;text-align:right;">₹${Number(total).toLocaleString('en-IN')}</td>
            </tr>
          </table>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
            <tr><td style="background:linear-gradient(135deg,#7C3AED,#6D28D9);border-radius:10px;">
              <a href="${orderUrl}" style="display:inline-block;padding:13px 32px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;border-radius:10px;">
                View My Orders →
              </a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid rgba(124,58,237,0.15);margin:0 0 16px;">
          <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;text-align:center;">
            Questions? Reply to this email or contact us at
            <a href="mailto:ashutoshkumarpandey@apkaai.com" style="color:#7C3AED;">ashutoshkumarpandey@apkaai.com</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#080514;padding:16px 40px;text-align:center;border-top:1px solid rgba(124,58,237,0.1);">
          <p style="margin:0;font-size:11px;color:#334155;">
            &copy; ${year} ApkaAI &mdash; World's #1 AI Tools Marketplace &mdash;
            <a href="${frontendUrl}" style="color:#7C3AED;text-decoration:none;">apkaai.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/create-order
// Step 1: Create a Razorpay order for a given ApkaAI order
// Body: { orderId }  (the ApkaAI order already saved in DB)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-order', requireAuth, async (req, res, next) => {
  try {
    const { orderId } = req.body
    if (!orderId) return res.status(400).json({ error: 'orderId is required' })

    // Fetch the order from DB
    const result = await query(
      'SELECT * FROM orders WHERE order_id = $1 AND user_id = $2',
      [orderId, req.user.userId]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    const order = result.rows[0]

    if (order.status === 'completed') {
      return res.status(400).json({ error: 'Order already paid' })
    }

    // Amount in paise (INR × 100)
    const amountPaise = Math.round(Number(order.total) * 100)
    if (amountPaise < 100) {
      return res.status(400).json({ error: 'Order total too low (minimum ₹1)' })
    }

    const razorpay = getRazorpay()
    const rzpOrder = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      receipt:  `apkaai_${order.order_id.slice(0, 16)}`,
      notes: {
        apkaai_order_id: order.order_id,
        user_id:         req.user.userId,
        user_email:      req.user.email,
      },
    })

    // Save Razorpay order ID against our order
    await query(
      'UPDATE orders SET payment_id = $1, updated_at = NOW() WHERE order_id = $2',
      [rzpOrder.id, order.order_id]
    )

    res.json({
      success:        true,
      razorpayOrderId: rzpOrder.id,
      amount:         rzpOrder.amount,
      currency:       rzpOrder.currency,
      keyId:          process.env.RAZORPAY_KEY_ID,
      prefill: {
        name:  req.user.name  || '',
        email: req.user.email || '',
      },
    })
  } catch (err) {
    if (err.message?.includes('Razorpay keys not configured')) {
      return res.status(503).json({ error: err.message })
    }
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/verify
// Step 2: Verify Razorpay signature after client-side payment success
// Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify', requireAuth, async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
      return res.status(400).json({ error: 'razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId are all required' })
    }

    // ── Verify signature ───────────────────────────────────────────────────
    const keySecret  = process.env.RAZORPAY_KEY_SECRET || ''
    const body       = `${razorpayOrderId}|${razorpayPaymentId}`
    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex')

    if (expectedSig !== razorpaySignature) {
      return res.status(400).json({ error: 'Payment signature verification failed. Possible tampering detected.' })
    }

    // ── Update order status → completed ────────────────────────────────────
    const updateResult = await query(
      `UPDATE orders
          SET status     = 'completed',
              payment_id = $1,
              updated_at = NOW()
        WHERE order_id = $2
          AND user_id   = $3
       RETURNING *`,
      [razorpayPaymentId, orderId, req.user.userId]
    )

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found or access denied' })
    }
    const order = updateResult.rows[0]

    // ── Fetch order items for the confirmation email ───────────────────────
    const itemsResult = await query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [orderId]
    )

    // ── Fetch user details ─────────────────────────────────────────────────
    const userResult = await query(
      'SELECT name, email FROM users WHERE user_id = $1',
      [req.user.userId]
    )
    const user = userResult.rows[0] || { name: 'Customer', email: req.user.email }

    // ── Send confirmation email (non-blocking) ─────────────────────────────
    sendOrderConfirmationEmail({
      userName:   user.name,
      userEmail:  user.email,
      orderId:    order.order_id,
      items:      itemsResult.rows,
      subtotal:   order.subtotal,
      discount:   order.discount,
      tax:        order.tax,
      total:      order.total,
      couponCode: order.coupon_code,
      paymentId:  razorpayPaymentId,
    }).catch(err => console.error('[Payment] Email error:', err.message))

    res.json({
      success:   true,
      message:   'Payment verified successfully',
      orderId:   order.order_id,
      paymentId: razorpayPaymentId,
      status:    'completed',
    })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/webhook
// Razorpay webhook — handles async payment events
// Header: x-razorpay-signature
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.warn('[Webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping validation')
    } else {
      const sig      = req.headers['x-razorpay-signature']
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body)
        .digest('hex')
      if (sig !== expected) {
        return res.status(400).json({ error: 'Invalid webhook signature' })
      }
    }

    const event   = JSON.parse(req.body.toString())
    const payload = event?.payload?.payment?.entity

    if (event.event === 'payment.captured' && payload) {
      const rzpOrderId = payload.order_id
      if (rzpOrderId) {
        // Find the ApkaAI order by Razorpay order ID
        const orderResult = await query(
          `UPDATE orders
              SET status     = 'completed',
                  payment_id = $1,
                  updated_at = NOW()
            WHERE payment_id = $2
              AND status != 'completed'
           RETURNING *`,
          [payload.id, rzpOrderId]
        )

        if (orderResult.rowCount > 0) {
          const order = orderResult.rows[0]
          console.log(`[Webhook] Order ${order.order_id} marked completed via webhook`)

          // Send confirmation email if not already sent
          const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [order.order_id])
          const userResult  = await query('SELECT name, email FROM users WHERE user_id = $1', [order.user_id])
          const user        = userResult.rows[0] || { name: 'Customer', email: '' }

          if (user.email) {
            sendOrderConfirmationEmail({
              userName:   user.name,
              userEmail:  user.email,
              orderId:    order.order_id,
              items:      itemsResult.rows,
              subtotal:   order.subtotal,
              discount:   order.discount,
              tax:        order.tax,
              total:      order.total,
              couponCode: order.coupon_code,
              paymentId:  payload.id,
            }).catch(err => console.error('[Webhook] Email error:', err.message))
          }
        }
      }
    }

    if (event.event === 'payment.failed' && payload) {
      const rzpOrderId = payload.order_id
      if (rzpOrderId) {
        await query(
          `UPDATE orders SET status = 'cancelled', updated_at = NOW()
           WHERE payment_id = $1 AND status = 'pending'`,
          [rzpOrderId]
        )
        console.log(`[Webhook] Order payment failed for Razorpay order ${rzpOrderId}`)
      }
    }

    res.json({ received: true })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payment/config
// Returns Razorpay key_id for frontend (safe — public key only)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/config', (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID
  if (!keyId) {
    return res.status(503).json({ error: 'Payment gateway not configured' })
  }
  res.json({ keyId, currency: 'INR' })
})

module.exports = router
