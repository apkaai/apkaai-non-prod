/**
 * mailer.js — shared email utility for ApkaAI
 *
 * Uses AWS SES (primary) with nodemailer SMTP as fallback.
 * SES requires no SMTP credentials — the EC2 IAM role handles auth.
 *
 * Exports:
 *   sendEmail(opts)             — low-level send wrapper, never throws
 *   sendPaymentInvoiceEmail()   — invoice email to the paying customer
 *   sendPaymentAdminAlert()     — notification email to admin recipients
 *   buildTransporter()          — nodemailer transporter (for auth.js reset emails)
 */

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses')
const nodemailer = require('nodemailer')

// ── Admin recipients ──────────────────────────────────────────────────────────
const ADMIN_RECIPIENTS = [
  'shekhargoswami1512@gmail.com',
  'ashutoshkumarpandey@apkaai.com',
]

// ── SES client (uses IAM role on EC2 — no keys needed) ───────────────────────
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'ap-south-1',
})

// ── From address ──────────────────────────────────────────────────────────────
function fromAddress() {
  return process.env.SES_FROM_EMAIL || process.env.SMTP_FROM || 'noreply@apkaai.com'
}

// ── SES send ──────────────────────────────────────────────────────────────────
async function sendViaSES({ to, subject, html, text }) {
  const toList = Array.isArray(to) ? to : [to]
  const from   = fromAddress()

  const cmd = new SendEmailCommand({
    Source: `"ApkaAI" <${from}>`,
    Destination: { ToAddresses: toList },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: html,        Charset: 'UTF-8' },
        Text: { Data: text || '',  Charset: 'UTF-8' },
      },
    },
  })

  const result = await sesClient.send(cmd)
  console.log('[Mailer/SES] Sent to', toList.join(', '), '— MessageId:', result.MessageId)
  return { ok: true, messageId: result.MessageId }
}

// ── SMTP fallback (nodemailer) ────────────────────────────────────────────────
/**
 * Build a fresh nodemailer transporter from env vars.
 * Returns null when SMTP is not configured.
 * Exported for use in auth.js (password reset emails).
 */
function buildTransporter() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port:              parseInt(process.env.SMTP_PORT || '587', 10),
    secure:            process.env.SMTP_SECURE === 'true',
    auth:              { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout:   10_000,
    socketTimeout:     15_000,
  })
}

async function sendViaSMTP({ to, subject, html, text }) {
  const transporter = buildTransporter()
  if (!transporter) return { ok: false, reason: 'SMTP_NOT_CONFIGURED' }

  const from = fromAddress()
  await transporter.sendMail({
    from: `"ApkaAI" <${from}>`,
    to,
    subject,
    html,
    text,
  })
  return { ok: true }
}

// ── Low-level send (SES first, SMTP fallback) ─────────────────────────────────
/**
 * Send an email. Never throws.
 * @param {{ to: string|string[], subject: string, html: string, text?: string }} opts
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
async function sendEmail(opts) {
  // Try SES first
  try {
    return await sendViaSES(opts)
  } catch (sesErr) {
    console.warn('[Mailer/SES] Failed:', sesErr.message, '— trying SMTP fallback')
  }

  // SMTP fallback
  try {
    return await sendViaSMTP(opts)
  } catch (smtpErr) {
    console.error('[Mailer/SMTP] Failed:', smtpErr.message)
    return { ok: false, reason: smtpErr.message }
  }
}

// ── HTML helpers ───────────────────────────────────────────────────────────────
function logoHeader() {
  return `
    <tr>
      <td style="background:linear-gradient(135deg,#150D2E,#0F0A1E);padding:28px 40px;text-align:center;border-bottom:1px solid rgba(124,58,237,0.2);">
        <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;">apka<span style="color:#A855F7;">AI</span></h1>
      </td>
    </tr>`
}

function emailWrapper(bodyRows) {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#08051A;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#08051A;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#0F0A1E;border:1px solid rgba(124,58,237,0.35);border-radius:16px;overflow:hidden;">
        ${logoHeader()}
        ${bodyRows}
        <tr>
          <td style="background:#080514;padding:16px 40px;text-align:center;border-top:1px solid rgba(124,58,237,0.1);">
            <p style="margin:0;font-size:11px;color:#334155;">&copy; ${year} ApkaAI &mdash; World&apos;s #1 AI Tools Marketplace</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Invoice email (to customer) ────────────────────────────────────────────────
async function sendPaymentInvoiceEmail(payment) {
  const {
    userEmail, userName, planName, amountInr,
    billingCycle, paymentId, orderId, verifiedAt,
  } = payment

  const displayName     = userName || userEmail
  const dateStr         = new Date(verifiedAt || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const cycleLabel      = billingCycle === 'yearly' ? 'Annual' : 'Monthly'
  const amountFormatted = `&#8377;${Number(amountInr).toFixed(2)}`

  const bodyRows = `
    <tr><td style="padding:32px 40px;">
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fff;">Payment Confirmed &#127881;</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#94A3B8;line-height:1.6;">
        Hi <strong style="color:#C4B5FD;">${displayName}</strong>, thank you for subscribing to ApkaAI!
        Your payment has been verified and your subscription is now active.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#0A0718;border:1px solid rgba(124,58,237,0.25);border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:16px 24px;border-bottom:1px solid rgba(124,58,237,0.15);">
            <p style="margin:0;font-size:11px;font-weight:600;color:#7C3AED;letter-spacing:0.08em;text-transform:uppercase;">Invoice</p>
          </td>
        </tr>
        <tr><td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#94A3B8;line-height:2;">
            <tr>
              <td style="width:50%;color:#64748B;">Plan</td>
              <td style="color:#fff;font-weight:600;">${planName}</td>
            </tr>
            <tr>
              <td style="color:#64748B;">Billing Cycle</td>
              <td style="color:#fff;">${cycleLabel}</td>
            </tr>
            <tr>
              <td style="color:#64748B;">Amount Paid</td>
              <td style="color:#A855F7;font-weight:700;font-size:15px;">${amountFormatted}</td>
            </tr>
            <tr>
              <td style="color:#64748B;">Payment ID</td>
              <td style="color:#C4B5FD;font-family:monospace;font-size:12px;">${paymentId}</td>
            </tr>
            <tr>
              <td style="color:#64748B;">Order ID</td>
              <td style="color:#C4B5FD;font-family:monospace;font-size:12px;">${orderId}</td>
            </tr>
            <tr>
              <td style="color:#64748B;">Date &amp; Time</td>
              <td style="color:#fff;">${dateStr} IST</td>
            </tr>
          </table>
        </td></tr>
      </table>

      <p style="margin:0;font-size:13px;color:#64748B;line-height:1.6;">
        Please keep this email as your receipt. Questions?
        <a href="mailto:support@apkaai.com" style="color:#A855F7;text-decoration:none;">support@apkaai.com</a>
      </p>
    </td></tr>`

  const html = emailWrapper(bodyRows)
  const text = [
    'Payment Confirmed — ApkaAI',
    '',
    `Hi ${displayName},`,
    `Thank you for subscribing to the ${planName} plan (${cycleLabel}).`,
    '',
    `Amount Paid : INR ${Number(amountInr).toFixed(2)}`,
    `Payment ID  : ${paymentId}`,
    `Order ID    : ${orderId}`,
    `Date        : ${dateStr} IST`,
    '',
    'Keep this email as your receipt.',
    'Questions? Email support@apkaai.com',
  ].join('\n')

  return sendEmail({
    to:      userEmail,
    subject: `Your ApkaAI ${planName} subscription is active — Invoice`,
    html,
    text,
  })
}

// ── Admin notification email ───────────────────────────────────────────────────
async function sendPaymentAdminAlert(payment) {
  const {
    userEmail, userName, planName, amountInr,
    billingCycle, paymentId, orderId, verifiedAt,
  } = payment

  const dateStr         = new Date(verifiedAt || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const cycleLabel      = billingCycle === 'yearly' ? 'Annual' : 'Monthly'
  const amountFormatted = `&#8377;${Number(amountInr).toFixed(2)}`

  const bodyRows = `
    <tr><td style="padding:32px 40px;">
      <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#fff;">&#128176; New Payment Received</h2>
      <p style="margin:0 0 24px;font-size:13px;color:#94A3B8;">A user just completed a subscription payment on ApkaAI.</p>

      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#0A0718;border:1px solid rgba(124,58,237,0.25);border-radius:12px;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#94A3B8;line-height:2.2;">
            <tr>
              <td style="width:40%;color:#64748B;">Customer</td>
              <td style="color:#fff;font-weight:600;">${userName || '&#8212;'}</td>
            </tr>
            <tr>
              <td style="color:#64748B;">Email</td>
              <td><a href="mailto:${userEmail}" style="color:#A855F7;text-decoration:none;">${userEmail}</a></td>
            </tr>
            <tr>
              <td style="color:#64748B;">Plan</td>
              <td style="color:#fff;">${planName} (${cycleLabel})</td>
            </tr>
            <tr>
              <td style="color:#64748B;">Amount</td>
              <td style="color:#34D399;font-weight:700;font-size:15px;">${amountFormatted}</td>
            </tr>
            <tr>
              <td style="color:#64748B;">Payment ID</td>
              <td style="color:#C4B5FD;font-family:monospace;font-size:12px;">${paymentId}</td>
            </tr>
            <tr>
              <td style="color:#64748B;">Order ID</td>
              <td style="color:#C4B5FD;font-family:monospace;font-size:12px;">${orderId}</td>
            </tr>
            <tr>
              <td style="color:#64748B;">Date</td>
              <td style="color:#fff;">${dateStr} IST</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>`

  const html = emailWrapper(bodyRows)
  const text = [
    'New Payment — ApkaAI',
    '',
    `Customer  : ${userName || '—'} <${userEmail}>`,
    `Plan      : ${planName} (${cycleLabel})`,
    `Amount    : INR ${Number(amountInr).toFixed(2)}`,
    `Payment ID: ${paymentId}`,
    `Order ID  : ${orderId}`,
    `Date      : ${dateStr} IST`,
  ].join('\n')

  return sendEmail({
    to:      ADMIN_RECIPIENTS,
    subject: `[ApkaAI] New ${planName} subscription — INR ${Number(amountInr).toFixed(2)}`,
    html,
    text,
  })
}

module.exports = {
  buildTransporter,
  sendEmail,
  sendPaymentInvoiceEmail,
  sendPaymentAdminAlert,
}
