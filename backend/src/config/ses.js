/**
 * ses.js — AWS SES client
 *
 * On EC2 with IAM role (apkaai-ec2-role):  credentials auto-resolved, no .env needed.
 * For local dev:  set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in backend/.env
 *
 * SES endpoint: us-east-1 (global) — also works for ap-south-1 verified identities.
 * To use the Mumbai regional endpoint set SES_REGION=ap-south-1 in .env
 */
const { SESClient } = require('@aws-sdk/client-ses')

const sesClient = new SESClient({
  region: process.env.SES_REGION || process.env.AWS_REGION || 'ap-south-1',
  // Credentials auto-resolved: IAM role (EC2) > env vars > ~/.aws/credentials
})

module.exports = sesClient
