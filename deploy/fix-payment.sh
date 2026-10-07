#!/bin/bash
# fix-payment.sh — run ON EC2 to diagnose and fix payment.js crash
set -e
FILE="/home/ec2-user/apkaai/backend/src/routes/payment.js"

echo "=== Lines in payment.js ==="
wc -l "$FILE"

echo ""
echo "=== Syntax check ==="
node --check "$FILE" 2>&1 && echo "SYNTAX_OK" || echo "SYNTAX_ERROR"

echo ""
echo "=== Lines around error ==="
sed -n '198,210p' "$FILE"
