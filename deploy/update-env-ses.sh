#!/bin/bash
# update-env-ses.sh — Add SES + S3 vars to EC2 .env and install missing packages
set -euo pipefail

KEY="/c/Users/ashutosh.p/Documents/apkaai-2026/apkaai/apkaai-key.pem"
HOST="ec2-user@3.6.107.51"
APP="/home/ec2-user/apkaai"

echo "🔧 Updating EC2 .env with SES + S3 variables..."

ssh -o StrictHostKeyChecking=no -i "$KEY" "$HOST" << 'REMOTE'
set -e
APP="/home/ec2-user/apkaai"
ENV_FILE="$APP/backend/.env"

echo "[1/4] Adding SES + S3 vars to .env..."

# Remove old entries if they exist (avoid duplicates)
sed -i '/^SES_FROM_EMAIL/d' "$ENV_FILE"
sed -i '/^SES_REGION/d'     "$ENV_FILE"
sed -i '/^S3_INVOICES_BUCKET/d' "$ENV_FILE"

# Append the 3 new vars
cat >> "$ENV_FILE" << 'ENVVARS'

# ── AWS SES ──────────────────────────────────────────────────────────────────
SES_FROM_EMAIL=no-reply@apkaai.com
SES_REGION=ap-south-1

# ── AWS S3 Invoice Storage ────────────────────────────────────────────────────
S3_INVOICES_BUCKET=apkaai-invoices-prod
ENVVARS

echo "  ✅ .env updated"
grep -E "SES_FROM_EMAIL|SES_REGION|S3_INVOICES_BUCKET" "$ENV_FILE"

echo ""
echo "[2/4] Pulling latest code (includes @aws-sdk/client-cloudwatch fix)..."
cd "$APP"
git pull origin main
echo "  ✅ Code updated — $(git log --oneline -1)"

echo ""
echo "[3/4] Installing backend packages (adds client-cloudwatch + ses + s3)..."
cd "$APP/backend"
npm install --omit=dev --prefer-offline 2>&1 | tail -5
echo "  ✅ Packages installed"

echo ""
echo "[4/4] Restarting apkaai-api..."
pm2 restart apkaai-api --update-env
sleep 3

echo ""
echo "=== Health check ==="
curl -sf http://localhost:4000/health && echo "  ✅ API healthy" || echo "  ❌ API not responding"

echo ""
echo "=== Testing forgot-password endpoint ==="
curl -s -X POST http://localhost:4000/api/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@apkaai.com"}' | head -c 200
echo ""

echo ""
echo "✅ Done! SES + S3 active on EC2."
REMOTE
