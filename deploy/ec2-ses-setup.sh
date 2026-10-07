#!/bin/bash
# Run ON EC2 directly — updates .env, installs packages, restarts API
set -e
APP="/home/ec2-user/apkaai"
ENV_FILE="$APP/backend/.env"

echo "=== Step 1: Updating .env with SES + S3 vars ==="
sed -i '/^SES_FROM_EMAIL/d'     "$ENV_FILE"
sed -i '/^SES_REGION/d'         "$ENV_FILE"
sed -i '/^S3_INVOICES_BUCKET/d' "$ENV_FILE"

echo "" >> "$ENV_FILE"
echo "SES_FROM_EMAIL=no-reply@apkaai.com" >> "$ENV_FILE"
echo "SES_REGION=ap-south-1"             >> "$ENV_FILE"
echo "S3_INVOICES_BUCKET=apkaai-invoices-prod" >> "$ENV_FILE"
echo "  ✅ .env updated:"
grep -E "SES_FROM_EMAIL|SES_REGION|S3_INVOICES_BUCKET" "$ENV_FILE"

echo ""
echo "=== Step 2: Reset to latest origin/main ==="
cd "$APP"
git fetch origin
git reset --hard origin/main
echo "  ✅ Code: $(git log --oneline -1)"

echo ""
echo "=== Step 3: npm install (adds client-cloudwatch, ses, s3) ==="
cd "$APP/backend"
npm install --omit=dev 2>&1 | tail -5
echo "  ✅ Packages installed"

echo ""
echo "=== Step 4: Restart API ==="
pm2 restart apkaai-api --update-env
sleep 4

echo ""
echo "=== Step 5: Health check ==="
curl -sf http://localhost:4000/health && echo "  ✅ API healthy" || echo "  ❌ API failed"

echo ""
echo "=== Step 6: Test forgot-password ==="
curl -s -X POST http://localhost:4000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@apkaai.com"}'
echo ""
echo "✅ All done!"
