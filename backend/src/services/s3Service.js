/**
 * s3Service.js — Private S3 invoice storage + pre-signed download URLs
 * ─────────────────────────────────────────────────────────────────────────────
 * Bucket:  process.env.S3_INVOICES_BUCKET  (default: apkaai-invoices-prod)
 * Access:  Private — no public access. URLs served via pre-signed links only.
 * Encryption: AES-256 server-side encryption on every upload.
 * Folder structure:
 *   invoices/{year}/{invoiceNo}.pdf
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl }                        = require('@aws-sdk/s3-request-presigner')
const s3Client                                = require('../config/s3')
const { query }                               = require('../lib/db')

const BUCKET = () => process.env.S3_INVOICES_BUCKET || 'apkaai-invoices-prod'

// ─────────────────────────────────────────────────────────────────────────────
// uploadInvoice
// Upload a PDF buffer to S3 — returns the S3 object key.
// ─────────────────────────────────────────────────────────────────────────────
async function uploadInvoice(pdfBuffer, invoiceNo) {
  const year = new Date().getFullYear()
  const key  = `invoices/${year}/${invoiceNo}.pdf`

  await s3Client.send(
    new PutObjectCommand({
      Bucket:               BUCKET(),
      Key:                  key,
      Body:                 pdfBuffer,
      ContentType:          'application/pdf',
      ContentDisposition:   `attachment; filename="${invoiceNo}.pdf"`,
      ServerSideEncryption: 'AES256',
      Metadata: {
        invoiceNo,
        uploadedAt: new Date().toISOString(),
      },
    })
  )

  console.log(`[S3] Uploaded invoice: s3://${BUCKET()}/${key}`)
  return key
}

// ─────────────────────────────────────────────────────────────────────────────
// createDownloadUrl
// Generate a pre-signed URL that expires in `expiresInSeconds` (default 1 hour).
// ─────────────────────────────────────────────────────────────────────────────
async function createDownloadUrl(s3Key, expiresInSeconds = 3600) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET(),
    Key:    s3Key,
  })
  const url = await getSignedUrl(s3Client, cmd, { expiresIn: expiresInSeconds })
  return url
}

// ─────────────────────────────────────────────────────────────────────────────
// saveInvoiceMetadata
// Persist invoice record in the `invoices` table (created below in schema note).
// ─────────────────────────────────────────────────────────────────────────────
async function saveInvoiceMetadata({ orderId, userId, invoiceNo, email, amount, s3Key, emailSent }) {
  try {
    await query(
      `INSERT INTO invoices
         (order_id, user_id, invoice_no, email, amount, s3_key, email_sent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (order_id) DO UPDATE
         SET s3_key     = $6,
             email_sent = $7,
             created_at = NOW()`,
      [orderId, userId, invoiceNo, email, amount, s3Key, emailSent]
    )
  } catch (err) {
    // Non-fatal — table may not exist yet (migration pending)
    if (err.code === '42P01') {
      console.warn('[S3] invoices table not found — run schema migration')
    } else {
      console.error('[S3] saveInvoiceMetadata error:', err.message)
    }
  }
}

module.exports = { uploadInvoice, createDownloadUrl, saveInvoiceMetadata }
