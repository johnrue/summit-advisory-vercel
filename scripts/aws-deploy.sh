#!/bin/bash

# Summit Advisory AWS EC2 Deployment Script
# This script deploys the application to AWS EC2 with Secrets Manager integration

set -e  # Exit on error

# Configuration
EC2_INSTANCE_ID="i-0be167230f91b5890"
EC2_PUBLIC_IP="18.212.109.180"
EC2_USER="ec2-user"
APP_NAME="summit-advisory"
APP_DIR="/home/ec2-user/summit-advisory"
SECRET_NAME="summit-advisory-env"
REGION="us-east-1"

echo "🚀 Starting deployment to AWS EC2 (t3.small budget instance)"
echo "📍 Instance: $EC2_INSTANCE_ID"
echo "🌐 IP: $EC2_PUBLIC_IP"

# Check if we have SSH key
if [ -z "$EC2_SSH_KEY" ]; then
    echo "❌ Error: EC2_SSH_KEY environment variable not set"
    echo "Please set: export EC2_SSH_KEY=path/to/your/key.pem"
    exit 1
fi

# Build the application locally first
echo "📦 Building application locally..."
pnpm run build

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf deployment.tar.gz \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.env.local' \
  --exclude='*.log' \
  --exclude='.next/cache' \
  --exclude='coverage' \
  --exclude='__tests__' \
  .

# Copy deployment package to EC2
echo "📤 Uploading to EC2..."
scp -i "$EC2_SSH_KEY" -o StrictHostKeyChecking=no \
  deployment.tar.gz \
  $EC2_USER@$EC2_PUBLIC_IP:/tmp/

# Deploy on EC2
echo "🔧 Deploying on EC2..."
ssh -i "$EC2_SSH_KEY" -o StrictHostKeyChecking=no $EC2_USER@$EC2_PUBLIC_IP << 'ENDSSH'
set -e

# Stop existing PM2 process if running
pm2 stop summit-advisory 2>/dev/null || true
pm2 delete summit-advisory 2>/dev/null || true

# Backup current deployment if exists
if [ -d "/home/ec2-user/summit-advisory" ]; then
    echo "📁 Backing up current deployment..."
    sudo mv /home/ec2-user/summit-advisory /home/ec2-user/summit-advisory.backup.$(date +%Y%m%d_%H%M%S)
fi

# Create application directory
mkdir -p /home/ec2-user/summit-advisory
cd /home/ec2-user/summit-advisory

# Extract deployment package
echo "📦 Extracting deployment package..."
tar -xzf /tmp/deployment.tar.gz
rm /tmp/deployment.tar.gz

# Install Node.js and pnpm if not installed
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
    sudo yum install -y nodejs
fi

if ! command -v pnpm &> /dev/null; then
    echo "📥 Installing pnpm..."
    npm install -g pnpm
fi

if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    npm install -g pm2
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile --production

# Get secrets from AWS Secrets Manager and create .env.local
echo "🔐 Fetching secrets from AWS Secrets Manager..."
aws secretsmanager get-secret-value \
  --secret-id summit-advisory-env \
  --region us-east-1 \
  --query SecretString \
  --output text | jq -r 'to_entries | map("\(.key)=\(.value)") | .[]' > .env.local

# Ensure proper permissions
chmod 600 .env.local

# Build the application
echo "🔨 Building application..."
pnpm run build

# Configure Nginx if not already configured
if [ ! -f /etc/nginx/sites-available/summit-advisory ]; then
    echo "🌐 Configuring Nginx..."
    sudo tee /etc/nginx/sites-available/summit-advisory > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }
}
NGINX

    sudo ln -sf /etc/nginx/sites-available/summit-advisory /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl restart nginx
fi

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user | grep "sudo" | bash

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Health check
echo "🏥 Running health check..."
if curl -f http://localhost:3000/api/health; then
    echo "✅ Application is healthy!"
else
    echo "❌ Health check failed!"
    pm2 logs summit-advisory --lines 50
    exit 1
fi

# Show status
echo "📊 PM2 Status:"
pm2 status

# Clean up old backups (keep last 3)
echo "🧹 Cleaning up old backups..."
ls -dt /home/ec2-user/summit-advisory.backup.* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true

echo "✅ Deployment completed successfully!"
echo "🌐 Application is running at: http://$EC2_PUBLIC_IP"
echo "📋 View logs: pm2 logs summit-advisory"
echo "📊 Monitor: pm2 monit"

ENDSSH

# Clean up local deployment package
rm -f deployment.tar.gz

echo "🎉 Deployment complete!"
echo "🌐 Access your application at: http://$EC2_PUBLIC_IP"
echo ""
echo "📝 Useful commands:"
echo "  SSH to instance: ssh -i $EC2_SSH_KEY $EC2_USER@$EC2_PUBLIC_IP"
echo "  View logs: pm2 logs summit-advisory"
echo "  PM2 status: pm2 status"
echo "  Restart app: pm2 restart summit-advisory"