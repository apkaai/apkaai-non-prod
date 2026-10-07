/**
 * s3.js — AWS S3 client
 *
 * Used for:
 *   - Uploading PDF invoices to private bucket  (apkaai-invoices-prod)
 *   - Generating pre-signed download URLs (1-hour expiry)
 *
 * On EC2 with IAM role:  credentials auto-resolved.
 * For local dev:  set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in backend/.env
 */
const { S3Client } = require('@aws-sdk/client-s3')

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
})

module.exports = s3Client
