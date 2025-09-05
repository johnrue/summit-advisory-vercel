#!/bin/bash

# Summit Advisory SaaS Platform - EC2 Setup Script
# This script prepares an EC2 instance for the SaaS platform deployment

set -e

echo "🚀 Starting Summit Advisory SaaS Platform EC2 Setup..."

# Update system packages
echo "📦 Updating system packages..."
sudo yum update -y

# Install Node.js 22.17.0 LTS
echo "📦 Installing Node.js 22.17.0 LTS..."
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo yum install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install pnpm globally
echo "📦 Installing pnpm..."
npm install -g pnpm
pnpm --version

# Install PM2 for process management
echo "📦 Installing PM2 globally..."
npm install -g pm2

# Configure PM2 startup script for ec2-user
echo "🔧 Configuring PM2 startup script..."
pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Install AWS CLI v2
echo "📦 Installing AWS CLI v2..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws/

# Verify AWS CLI installation
aws --version

# Create application directory and logs
echo "📁 Creating application directory..."
sudo mkdir -p /opt/summit-advisory-saas
sudo mkdir -p /opt/summit-advisory-saas/logs
sudo chown -R ec2-user:ec2-user /opt/summit-advisory-saas

# Install and configure nginx (reverse proxy)
echo "📦 Installing nginx..."
sudo yum install -y nginx

# Create sites-available and sites-enabled directories
echo "🔧 Setting up Nginx site structure..."
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled

# Create directory for Let's Encrypt challenges
sudo mkdir -p /var/www/letsencrypt
sudo chown -R nginx:nginx /var/www/letsencrypt

# Install certbot for SSL certificates
echo "📦 Installing certbot for SSL..."
sudo yum install -y python3-certbot-nginx || sudo yum install -y certbot python3-certbot-nginx

# Copy the production nginx configuration (will be copied during deployment)
echo "🔧 Nginx configuration will be deployed with application..."
echo "   Production config location: scripts/deployment/nginx-saas.conf"

# Test nginx configuration
sudo nginx -t

# Enable and start nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# PM2 will handle process management (no systemd service needed)
echo "✅ PM2 configured for process management"

# Create log directory
sudo mkdir -p /var/log/summit-advisory-saas
sudo chown ec2-user:ec2-user /var/log/summit-advisory-saas

# Configure log rotation for application logs
sudo tee /etc/logrotate.d/summit-advisory-saas > /dev/null <<EOF
/opt/summit-advisory-saas/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ec2-user ec2-user
    postrotate
        su - ec2-user -c "pm2 reloadLogs" > /dev/null 2>&1 || true
    endscript
}
EOF

# Configure PM2 log rotation
sudo tee /etc/logrotate.d/pm2-ec2-user > /dev/null <<EOF
/home/ec2-user/.pm2/logs/*.log {
    su ec2-user ec2-user
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ec2-user ec2-user
    postrotate
        su - ec2-user -c "pm2 reloadLogs" > /dev/null 2>&1 || true
    endscript
}
EOF

# Configure AWS CLI region
echo "🔧 Configuring AWS CLI..."
aws configure set region us-east-1
aws configure set output json

# Install CloudWatch agent for monitoring
echo "📦 Installing CloudWatch agent..."
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm
rm -f amazon-cloudwatch-agent.rpm

# Create CloudWatch agent configuration
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null <<EOF
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "metrics": {
    "namespace": "Summit-Advisory/SaaS",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "diskio": {
        "measurement": [
          "io_time"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/summit-advisory-saas/*.log",
            "log_group_name": "/aws/ec2/summit-advisory-saas",
            "log_stream_name": "{instance_id}-application",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "/aws/ec2/summit-advisory-saas",
            "log_stream_name": "{instance_id}-nginx-access",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/aws/ec2/summit-advisory-saas",
            "log_stream_name": "{instance_id}-nginx-error",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
sudo systemctl enable amazon-cloudwatch-agent
sudo systemctl start amazon-cloudwatch-agent

# Setup automated security updates
echo "🔒 Configuring automatic security updates..."
sudo yum install -y yum-cron
sudo systemctl enable yum-cron
sudo systemctl start yum-cron

# Configure firewall
echo "🔥 Configuring firewall..."
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload

echo "✅ EC2 setup completed successfully!"
echo ""
echo "🚀 Production-ready PM2 + Nginx setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Configure AWS Secrets Manager with environment variables"
echo "   2. Set up SSL certificate: sudo certbot --nginx -d app.summitadvisoryfirm.com"
echo "   3. Configure DNS in Route53 for app.summitadvisoryfirm.com"
echo "   4. Deploy the application using GitHub Actions"
echo ""
echo "🔧 Manual commands to run after deployment:"
echo "   pm2 status                              # Check PM2 process status"
echo "   pm2 logs summit-advisory-saas           # View application logs"
echo "   pm2 monit                              # PM2 monitoring dashboard"
echo "   sudo nginx -t && sudo nginx -s reload  # Test and reload Nginx"
echo "   curl http://localhost:3000/api/health   # Test application directly"
echo "   curl http://localhost/api/health        # Test through Nginx proxy"
echo ""
echo "💡 PM2 useful commands:"
echo "   pm2 restart summit-advisory-saas        # Restart application"
echo "   pm2 stop summit-advisory-saas           # Stop application"
echo "   pm2 delete summit-advisory-saas         # Remove from PM2"