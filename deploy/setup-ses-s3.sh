#!/bin/bash
# =============================================================================
# setup-ses-s3.sh — Configure AWS SES + S3 for ApkaAI email/invoice workflow
# Run from LOCAL machine: bash deploy/setup-ses-s3.sh
# Requires: AWS CLI configured locally with admin-level IAM access
# =============================================================================
set -euo pipefail

REGION="ap-south-1"
ROLE_NAME="apkaai-ec2-role"
BUCKET="apkaai-invoices-prod"
ACCOUNT_ID="409154939720"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ApkaAI — SES + S3 Setup Script"
echo "  Region : $REGION"
echo "  Role   : $ROLE_NAME"
echo "  Bucket : $BUCKET"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── STEP 1: Update IAM role policy ────────────────────────────────────────────
echo "[1/5] Updating IAM role: $ROLE_NAME ..."
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "apkaai-ses-s3-invoices-policy" \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "SESPermissions",
        "Effect": "Allow",
        "Action": [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:GetAccount",
          "ses:ListEmailIdentities",
          "ses:GetEmailIdentity",
          "ses:GetAccountSendingEnabled"
        ],
        "Resource": "*"
      },
      {
        "Sid": "S3InvoicesReadWrite",
        "Effect": "Allow",
        "Action": [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:HeadObject"
        ],
        "Resource": "arn:aws:s3:::apkaai-invoices-prod/*"
      },
      {
        "Sid": "S3InvoicesBucket",
        "Effect": "Allow",
        "Action": [
          "s3:HeadBucket",
          "s3:ListBucket"
        ],
        "Resource": "arn:aws:s3:::apkaai-invoices-prod"
      }
    ]
  }'
echo "  ✅ IAM policy applied to $ROLE_NAME"

# ── STEP 2: Create private S3 bucket ──────────────────────────────────────────
echo ""
echo "[2/5] Creating private S3 bucket: $BUCKET ..."

# Check if bucket already exists
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "  ℹ️  Bucket $BUCKET already exists — skipping creation"
else
  aws s3api create-bucket \
    --bucket "$BUCKET" \
    --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
  echo "  ✅ Bucket created: s3://$BUCKET"
fi

# ── STEP 3: Block all public access ───────────────────────────────────────────
echo ""
echo "[3/5] Blocking all public access on $BUCKET ..."
aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
echo "  ✅ Public access blocked"

# ── STEP 4: Enable default AES-256 encryption ─────────────────────────────────
echo ""
echo "[4/5] Enabling AES-256 server-side encryption ..."
aws s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
echo "  ✅ Encryption enabled (AES-256)"

# ── STEP 5: Enable versioning ─────────────────────────────────────────────────
echo ""
echo "[5/5] Enabling versioning on $BUCKET ..."
aws s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled
echo "  ✅ Versioning enabled"

# ── Lifecycle policy (archive old invoices) ───────────────────────────────────
echo ""
echo "[+] Applying lifecycle policy (archive after 90 days, Glacier after 365) ..."
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET" \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "InvoiceArchivalPolicy",
        "Status": "Enabled",
        "Filter": { "Prefix": "invoices/" },
        "Transitions": [
          { "Days": 90,  "StorageClass": "STANDARD_IA" },
          { "Days": 365, "StorageClass": "GLACIER" }
        ]
      }
    ]
  }'
echo "  ✅ Lifecycle policy applied"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅  DONE — Steps 1-5 complete!"
echo ""
echo "  Next (manual in AWS Console):"
echo "  1. Go to: https://console.aws.amazon.com/ses/home?region=ap-south-1"
echo "  2. Verified identities → Create identity → Domain: apkaai.com"
echo "  3. Copy DKIM CNAME records + TXT record → add to GoDaddy DNS"
echo "  4. Verify: no-reply@apkaai.com and billing@apkaai.com"
echo "  5. Account dashboard → Request production access"
echo ""
echo "  After SES verifies, add to EC2 .env:"
echo "    SES_FROM_EMAIL=no-reply@apkaai.com"
echo "    SES_REGION=ap-south-1"
echo "    S3_INVOICES_BUCKET=apkaai-invoices-prod"
echo "═══════════════════════════════════════════════════════"
