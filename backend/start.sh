#!/bin/bash

# WhatsApp Bulk Sender - Backend Deployment Script
# This script sets up and starts the WhatsApp Bulk Sender backend service

# Exit on any error
set -e

# Change to the script directory
cd "$(dirname "$0")"

echo "===== WhatsApp Bulk Sender Backend Setup ====="

# Create required directories
echo "Creating required directories..."
mkdir -p data/attachments
mkdir -p data/logs
mkdir -p data/logs/sessions

# Check for .env file and create if not exists
if [ ! -f .env ]; then
  echo "Creating default .env file..."
  cat > .env << EOF
# API Server Configuration
API_PORT=3001
DASHBOARD_URL=http://localhost:3000

# WhatsApp Client Configuration
HEADLESS=true
COUNTRY_CODE=91

# Message Configuration
DEFAULT_MESSAGE=Hello! Please find the attached document.
DEFAULT_DELAY=10000

# Rate Limiting and Safety
DAILY_LIMIT=800
BATCH_SIZE=100
MAX_SESSION_SIZE=400
SESSION_BREAK_TIME=1800000
RANDOMIZE_DELAY=true
DELAY_VARIANCE=500
EOF
  echo "Default .env file created. Please review and modify as needed."
else
  echo ".env file already exists."
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2 process manager..."
  npm install -g pm2
fi

# Start the API server using PM2
echo "Starting WhatsApp Bulk Sender API server..."
pm2 start src/api/server.js --name whatsapp-sender

# Save PM2 configuration for restart on reboot
echo "Saving PM2 configuration..."
pm2 save

# Display status information
PORT=$(grep "API_PORT" .env | cut -d '=' -f2 || echo "3001")
EXTERNAL_IP=$(curl -s http://checkip.amazonaws.com || echo "your-server-ip")

echo "===== Setup Complete ====="
echo "API server is running on http://localhost:${PORT}/api"
echo "External URL: http://${EXTERNAL_IP}:${PORT}/api"
echo ""
echo "PM2 Commands:"
echo "  View status: pm2 status"
echo "  View logs: pm2 logs whatsapp-sender"
echo "  Restart: pm2 restart whatsapp-sender"
echo ""
echo "For Dashboard configuration, set NEXT_PUBLIC_API_URL to http://${EXTERNAL_IP}:${PORT}/api"
echo ""
echo "To enable HTTPS, please set up Nginx as a reverse proxy with SSL."

exit 0 