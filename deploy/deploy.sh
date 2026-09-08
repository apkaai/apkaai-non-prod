#!/bin/bash
# =============================================================================
# deploy.sh — Re-deploy latest code to EC2 (run after pushing to Git)
# Usage: bash deploy.sh
# Run from LOCAL machine: ssh into EC2 and run, OR use ssh remote execution
# =============================================================================
set -euo pipefail

EC2_USER="ec2-user"
EC2_HOST="3.6.107.51"            # ApkaAI EC2 Elastic IP (ap-south-1 Mumbai)
APP_DIR="/home/ec2-user/apkaai"

echo "🚀 Deploying ApkaAI to $EC2_HOST..."

ssh -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" << 'REMOTE'
  set -euo pipefail
  APP_DIR="/home/ec2-user/apkaai"
  cd "$APP_DIR"

  echo "[1/5] Pulling latest code..."
  git pull origin main

  echo "[2/5] Installing backend dependencies..."
  cd "$APP_DIR/backend"
  npm ci --omit=dev

  echo "[3/5] Installing & building frontend..."
  cd "$APP_DIR/frontend"
  npm ci
  npm run build

  echo "[4/5] Restarting services..."
  pm2 restart apkaai-api
  pm2 restart apkaai-frontend
  pm2 save

  echo "[5/5] Health check..."
  sleep 3
  curl -sf http://localhost:4000/health && echo "  ✅ API healthy" || echo "  ❌ API not responding"
  curl -sf http://localhost:3000 > /dev/null && echo "  ✅ Frontend healthy" || echo "  ❌ Frontend not responding"
REMOTE

echo ""
echo "✅ Deployment complete! https://apkaai.com"
