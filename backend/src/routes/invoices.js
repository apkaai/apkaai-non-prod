/**
 * invoices.js — POST /api/invoices/send
 * ─────────────────────────────────────────────────────────────────────────────
 * Full invoice workflow:
 *   1. Fetch order + items + user from DB
 *   2. Generate branded PDF (pdfService)
 *   3. Upload PDF to private S3 bucket (s3Service)
 *   4. Generate 1-hour pre-signed download URL (s3Service)
 *   5. Email PDF attachment + download link via SES (emailService)
 *   6. Persist invoice record in `invoices` table (s3Service.saveInvoiceMetadata)
 *   7. Return { invoiceNo, downloadUrl, emailSent }
 *
 * Auth: Bearer token — owner or admin only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express  = require('express')
const router   = express.Router()
const crypto   = require('crypto')
const { query }               = require('../lib/db')
const { generateInvoicePDF }  = require('../services/pdfService')
const { uploadInvoice, createDownloadUrl, saveInvoiceMetadata } = require('../services/s3Service')
const { sendEmailWithAttachment, sendEmail } = require('../services/emailService')

// ─── Auth helper ──────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Invoice email HTML template (includes download link)
// ─────────────────────────────────────────────────────────────────────────────
function buildInvoiceEmailHtml({ userName, invoiceNo, orderId, total, downloadUrl }) {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://apkaai.com').replace(/\/$/, '')
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your ApkaAI Invoice ${invoiceNo}</title>
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

        <!-- Icon -->
        <tr><td style="padding:32px 40px 20px;text-align:center;border-bottom:1px solid rgba(124,58,237,0.15);">
          <div style="width:56px;height:56px;background:rgba(124,58,237,0.2);border:2px solid rgba(124,58,237,0.4);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <span style="font-size:26px;">🧾</span>
          </div>
          <h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#fff;">Your Invoice is Ready</h2>
          <p style="margin:0;font-size:14px;color:#94A3B8;">Invoice <strong style="color:#C4B5FD;">${invoiceNo}</strong> for order #${orderId.slice(0,8).toUpperCase()}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 40px;">
          <p style="margin:0 0 16px;font-size:14px;color:#94A3B8;line-height:1.6;">
            Hi <strong style="color:#fff;">${userName}</strong>, your invoice is attached to this email as a PDF.
            You can also download it using the secure link below.
          </p>

          <!-- Amount -->
          <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);border-radius:10px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-size:12px;color:#64748B;">Total Paid</p>
            <p style="margin:0;font-size:24px;font-weight:800;color:#C4B5FD;">₹${Number(total).toLocaleString('en-IN')}</p>
          </div>

          <!-- Download CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr><td style="background:linear-gradient(135deg,#7C3AED,#6D28D9);border-radius:10px;">
              <a href="${downloadUrl}"
                 style="display:inline-block;padding:13px 32px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;border-radius:10px;">
                ⬇ Download Invoice PDF
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 20px;font-size:11px;color:#475569;">This download link expires in 1 hour. The PDF is also attached to this email.</p>

          <!-- View orders -->
          <p style="margin:0;font-size:13px;color:#94A3B8;">
            View all your orders:
            <a href="${frontendUrl}/orders" style="color:#7C3AED;text-decoration:none;font-weight:600;">${frontendUrl}/orders</a>
          </p>

          <hr style="border:none;border-top:1px solid rgba(124,58,237,0.15);margin:24px 0 16px;">
          <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;text-align:center;">
            Questions? <a href="mailto:billing@apkaai.com" style="color:#7C3AED;">billing@apkaai.com</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#080514;padding:16px 40px;text-align:center;border-top:1px solid rgba(124,58,237,0.1);">
          <p style="margin:0;font-size:11px;color:#334155;">
            &copy; ${year} ApkaAI &mdash;
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
// POST /api/invoices/send
// Generate PDF, upload to S3, email to user, return download URL.
// Body: { orderId }
// Auth: Owner or admin.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send', requireAuth, async (req, res, next) => {
  try {
    const { orderId } = req.body
    if (!orderId) return res.status(400).json({ error: 'orderId is required' })

    // ── 1. Fetch order ─────────────────────────────────────────────────────
    const orderResult = await query(
      'SELECT * FROM orders WHERE order_id = $1',
      [orderId]
    )
    if (orderResult.rowCount === 0) return res.status(404).json({ error: 'Order not found' })
    const order = orderResult.rows[0]

    // ── Access control — owner or admin ────────────────────────────────────
    const userResult = await query(
      'SELECT name, email, role FROM users WHERE user_id = $1',
      [req.user.userId]
    )
    const requester = userResult.rows[0]
    const isAdmin   = requester?.role === 'admin'
    if (order.user_id !== req.user.userId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // ── 2. Fetch order items ───────────────────────────────────────────────
    const itemsResult = await query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC',
      [orderId]
    )

    // ── 3. Fetch order owner details ───────────────────────────────────────
    const ownerResult = await query(
      'SELECT name, email FROM users WHERE user_id = $1',
      [order.user_id]
    )
    const owner = ownerResult.rows[0] || { name: 'Customer', email: '' }

    const invoiceNo = `INV-${order.order_id.slice(0, 8).toUpperCase()}`

    // ── 4. Generate PDF ───────────────────────────────────────────────────
    const orderForPdf = {
      ...order,
      items: itemsResult.rows,
      user:  owner,
    }
    const pdfBuffer = await generateInvoicePDF(orderForPdf)

    // ── 5. Upload to S3 (private) ─────────────────────────────────────────
    let s3Key      = null
    let downloadUrl = null
    let s3Uploaded  = false

    const s3Bucket = process.env.S3_INVOICES_BUCKET
    if (s3Bucket) {
      try {
        s3Key       = await uploadInvoice(pdfBuffer, invoiceNo)
        downloadUrl = await createDownloadUrl(s3Key, 3600)
        s3Uploaded  = true
      } catch (s3Err) {
        console.warn('[Invoices] S3 upload failed (non-fatal):', s3Err.message)
        // Continue — we'll still email the PDF attachment
      }
    } else {
      console.warn('[Invoices] S3_INVOICES_BUCKET not set — skipping S3 upload')
    }

    // ── 6. Send email with PDF attachment ─────────────────────────────────
    let emailSent = false
    if (owner.email) {
      const subject  = `🧾 Your ApkaAI Invoice — ${invoiceNo}`
      const html     = buildInvoiceEmailHtml({
        userName:    owner.name,
        invoiceNo,
        orderId:     order.order_id,
        total:       order.total,
        downloadUrl: downloadUrl || `${(process.env.FRONTEND_URL || 'https://apkaai.com')}/orders`,
      })

      const emailResult = await sendEmailWithAttachment(
        owner.email,
        subject,
        html,
        pdfBuffer,
        `${invoiceNo}.pdf`
      )
      emailSent = emailResult.ok
      if (!emailResult.ok) {
        console.warn(`[Invoices] Email not sent to ${owner.email}: ${emailResult.reason}`)
      }
    }

    // ── 7. Save invoice metadata to DB ─────────────────────────────────────
    if (s3Uploaded) {
      await saveInvoiceMetadata({
        orderId:   order.order_id,
        userId:    order.user_id,
        invoiceNo,
        email:     owner.email,
        amount:    order.total,
        s3Key,
        emailSent,
      })
    }

    res.json({
      success:     true,
      invoiceNo,
      downloadUrl: downloadUrl || null,
      s3Key:       s3Key || null,
      emailSent,
      message:     emailSent
        ? `Invoice emailed to ${owner.email}`
        : 'Invoice generated but email could not be sent',
    })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices/:orderId/download
// Generate a fresh pre-signed download URL for an existing invoice.
// Auth: Owner or admin.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:orderId/download', requireAuth, async (req, res, next) => {
  try {
    // Check invoice record exists
    const result = await query(
      `SELECT i.*, o.user_id
       FROM invoices i
       JOIN orders  o ON o.order_id = i.order_id
       WHERE i.order_id = $1`,
      [req.params.orderId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Invoice not found. Generate it first via POST /api/invoices/send' })

    const inv = result.rows[0]

    // Access control
    const userResult = await query('SELECT role FROM users WHERE user_id = $1', [req.user.userId])
    const isAdmin    = userResult.rows[0]?.role === 'admin'
    if (inv.user_id !== req.user.userId && !isAdmin) return res.status(403).json({ error: 'Access denied' })

    if (!inv.s3_key) return res.status(404).json({ error: 'Invoice PDF not found in storage' })

    const downloadUrl = await createDownloadUrl(inv.s3_key, 3600)
    res.json({ success: true, invoiceNo: inv.invoice_no, downloadUrl, expiresIn: 3600 })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices (admin only) — list all invoices
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userResult = await query('SELECT role FROM users WHERE user_id = $1', [req.user.userId])
    if (userResult.rows[0]?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })

    const result = await query(
      `SELECT i.*, u.name AS user_name, u.email AS user_email
       FROM invoices i
       JOIN users u ON u.user_id = i.user_id
       ORDER BY i.created_at DESC
       LIMIT 100`,
      []
    )
    res.json({ invoices: result.rows, total: result.rowCount })
  } catch (err) { next(err) }
})

module.exports = router
