/**
 * emailService.js — AWS SES email sender
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides two functions:
 *   sendEmail(to, subject, html, text?)          — plain HTML email
 *   sendEmailWithAttachment(to, subject, html, pdfBuffer, fileName)
 *                                                — HTML + PDF attachment
 *
 * Falls back to nodemailer SMTP if SES_FROM_EMAIL is not set (dev/test).
 * On EC2 with apkaai-ec2-role the IAM role provides credentials automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const {
  SendEmailCommand,
  SendRawEmailCommand,
} = require('@aws-sdk/client-ses')
const nodemailer  = require('nodemailer')
const sesClient   = require('../config/ses')

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pick the verified sender address from env — must be verified in SES console */
function fromAddress() {
  return (
    process.env.SES_FROM_EMAIL ||
    process.env.SMTP_FROM      ||
    process.env.SMTP_USER      ||
    'no-reply@apkaai.com'
  )
}

/** True when SES is configured (SES_FROM_EMAIL set) */
function sesConfigured() {
  return !!process.env.SES_FROM_EMAIL
}

// ─────────────────────────────────────────────────────────────────────────────
// sendEmail — plain HTML email via SES (or nodemailer fallback)
// ─────────────────────────────────────────────────────────────────────────────
async function sendEmail(to, subject, html, text) {
  const from = fromAddress()

  // ── SES path ───────────────────────────────────────────────────────────────
  if (sesConfigured()) {
    const cmd = new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html,         Charset: 'UTF-8' },
          Text: { Data: text || html, Charset: 'UTF-8' },
        },
      },
    })
    try {
      const result = await sesClient.send(cmd)
      console.log(`[SES] Email sent to ${to} — MessageId: ${result.MessageId}`)
      return { ok: true, messageId: result.MessageId, provider: 'ses' }
    } catch (err) {
      console.error('[SES] sendEmail failed:', err.code || err.message)
      return { ok: false, reason: err.code || err.message, provider: 'ses' }
    }
  }

  // ── nodemailer SMTP fallback (local dev / SMTP only setup) ─────────────────
  return _sendViaSMTP(from, to, subject, html, text)
}

// ─────────────────────────────────────────────────────────────────────────────
// sendEmailWithAttachment — HTML + PDF attachment via SES SendRawEmailCommand
// ─────────────────────────────────────────────────────────────────────────────
async function sendEmailWithAttachment(to, subject, html, pdfBuffer, fileName) {
  const from     = fromAddress()
  const boundary = `ApkaAI-${Date.now()}-${Math.random().toString(36).slice(2)}`

  // ── SES path ───────────────────────────────────────────────────────────────
  if (sesConfigured()) {
    const rawMessage = [
      `From: "ApkaAI" <${from}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      html,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf; name="${fileName}"`,
      `Content-Disposition: attachment; filename="${fileName}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      pdfBuffer.toString('base64'),
      ``,
      `--${boundary}--`,
    ].join('\r\n')

    const cmd = new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(rawMessage) },
    })

    try {
      const result = await sesClient.send(cmd)
      console.log(`[SES] Email+PDF sent to ${to} — MessageId: ${result.MessageId}`)
      return { ok: true, messageId: result.MessageId, provider: 'ses' }
    } catch (err) {
      console.error('[SES] sendEmailWithAttachment failed:', err.code || err.message)
      return { ok: false, reason: err.code || err.message, provider: 'ses' }
    }
  }

  // ── nodemailer SMTP fallback ───────────────────────────────────────────────
  return _sendViaSMTPWithAttachment(from, to, subject, html, pdfBuffer, fileName)
}

// ─────────────────────────────────────────────────────────────────────────────
// nodemailer SMTP helpers (fallback for local dev)
// ─────────────────────────────────────────────────────────────────────────────
function _buildSMTPTransport() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  return nodemailer.createTransport({
    host,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user, pass },
    connectionTimeout: 10000,
    socketTimeout:     15000,
  })
}

async function _sendViaSMTP(from, to, subject, html, text) {
  const transport = _buildSMTPTransport()
  if (!transport) {
    console.warn('[Email] Neither SES nor SMTP configured — email not sent')
    return { ok: false, reason: 'EMAIL_NOT_CONFIGURED', provider: 'none' }
  }
  try {
    await transport.sendMail({ from: `"ApkaAI" <${from}>`, to, subject, html, text })
    console.log(`[SMTP] Email sent to ${to}`)
    return { ok: true, provider: 'smtp' }
  } catch (err) {
    console.error('[SMTP] sendMail failed:', err.code || err.message)
    return { ok: false, reason: err.code || err.message, provider: 'smtp' }
  }
}

async function _sendViaSMTPWithAttachment(from, to, subject, html, pdfBuffer, fileName) {
  const transport = _buildSMTPTransport()
  if (!transport) {
    console.warn('[Email] Neither SES nor SMTP configured — email not sent')
    return { ok: false, reason: 'EMAIL_NOT_CONFIGURED', provider: 'none' }
  }
  try {
    await transport.sendMail({
      from: `"ApkaAI" <${from}>`,
      to, subject, html,
      attachments: [{ filename: fileName, content: pdfBuffer, contentType: 'application/pdf' }],
    })
    console.log(`[SMTP] Email+PDF sent to ${to}`)
    return { ok: true, provider: 'smtp' }
  } catch (err) {
    console.error('[SMTP] sendMail+attachment failed:', err.code || err.message)
    return { ok: false, reason: err.code || err.message, provider: 'smtp' }
  }
}

module.exports = { sendEmail, sendEmailWithAttachment }
