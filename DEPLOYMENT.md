# 🚀 Production Deployment Guide - Summit Advisory Platform

## Current Build Status
- **Build Status**: ✅ Clean build with zero warnings/errors
- **Build Time**: ~4 seconds
- **Bundle Size**: 102 kB shared JS
- **Node Version**: 22.17.0 LTS
- **Package Manager**: pnpm

## AWS Infrastructure Details
- **EC2 Instance ID**: `i-09dbbedaa629749c7`
- **Public IP**: `98.81.1.161`
- **Domain**: `app.summitadvisoryfirm.com`
- **Instance Type**: t3.micro (optimized for smaller instance)
- **Region**: us-east-1

## Prerequisites

### 1. GitHub Secrets Configuration
Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

```bash
EC2_HOST=98.81.1.161
EC2_USERNAME=ec2-user
EC2_PRIVATE_KEY=[content of your .pem key file]
NEXT_PUBLIC_SUPABASE_URL=[your Supabase URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your Supabase anon key]
OPENAI_API_KEY=[your OpenAI API key]
```

### 2. Environment Variables in AWS Secrets Manager
Update the secrets in AWS Secrets Manager:

```bash
aws secretsmanager update-secret \
  --secret-id summit-advisory-saas-env \
  --region us-east-1 \
  --secret-string '{
    "NODE_ENV": "production",
    "PORT": "3000",
    "HOSTNAME": "0.0.0.0",
    "NEXT_PUBLIC_SUPABASE_URL": "[your-supabase-url]",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "[your-anon-key]",
    "SUPABASE_SERVICE_ROLE_KEY": "[your-service-key]",
    "OPENAI_API_KEY": "[your-openai-key]"
  }'
```

## Deployment Options

### Option 1: Automated GitHub Actions Deployment (Recommended)

Simply push to the main branch:

```bash
# Commit and push changes
git add .
git commit -m "deploy: production release"
git push origin main
```

GitHub Actions will automatically:
1. Run tests and type checks
2. Build the application
3. Deploy to EC2
4. Configure PM2 and Nginx
5. Verify deployment health

Monitor deployment at: https://github.com/johnrue/summit-advisory-vercel/actions

### Option 2: Manual Deployment

#### Step 1: Connect to EC2
```bash
ssh -i ~/summit-advisory-key.pem ec2-user@98.81.1.161
```

#### Step 2: Deploy Application
```bash
# Navigate to application directory
cd /opt/summit-advisory-saas

# Pull latest code
git pull origin main

# Install dependencies
pnpm install --frozen-lockfile --production

# Get environment variables from Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id summit-advisory-saas-env \
  --region us-east-1 \
  --query SecretString --output text > .env.local
chmod 600 .env.local

# Build application
pnpm run build

# Restart PM2
pm2 restart ecosystem.config.js --env production
pm2 save
```

#### Step 3: Verify Deployment
```bash
# Check PM2 status
pm2 status

# Check application health
curl -f http://localhost:3000/api/health

# Check logs
pm2 logs summit-advisory-saas --lines 50
```

## First-Time Server Setup

If deploying to a new EC2 instance:

```bash
# Connect to instance
ssh -i ~/summit-advisory-key.pem ec2-user@98.81.1.161

# Download and run setup script
wget https://raw.githubusercontent.com/johnrue/summit-advisory-vercel/main/scripts/deployment/ec2-setup.sh
chmod +x ec2-setup.sh
sudo ./ec2-setup.sh

# Setup SSL certificate
sudo certbot --nginx -d app.summitadvisoryfirm.com \
  --non-interactive --agree-tos \
  --email admin@summitadvisoryfirm.com
```

## Monitoring & Maintenance

### Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs summit-advisory-saas

# Server resources
htop

# Nginx access logs
sudo tail -f /var/log/nginx/summit-saas-access.log
```

### PM2 Commands
```bash
# Status
pm2 status

# Restart
pm2 restart summit-advisory-saas

# Stop
pm2 stop summit-advisory-saas

# Reload (zero-downtime)
pm2 reload summit-advisory-saas

# View detailed info
pm2 describe summit-advisory-saas
```

## Troubleshooting

### Application Not Starting
```bash
# Check logs
pm2 logs summit-advisory-saas --err

# Check environment variables
cat /opt/summit-advisory-saas/.env.local

# Restart with verbose logging
pm2 restart summit-advisory-saas --log-date-format "YYYY-MM-DD HH:mm:ss"
```

### Memory Issues (for t3.micro)
```bash
# Check memory usage
free -h

# Restart if memory exceeded
pm2 restart summit-advisory-saas

# Monitor memory
pm2 monit
```

### SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew

# Test Nginx configuration
sudo nginx -t
sudo systemctl reload nginx
```

## Rollback Procedure

If deployment fails:

```bash
# List backups
ls -la /opt/ | grep summit-advisory-saas.backup

# Restore from backup
sudo mv /opt/summit-advisory-saas /opt/summit-advisory-saas.failed
sudo mv /opt/summit-advisory-saas.backup.[timestamp] /opt/summit-advisory-saas

# Restart application
pm2 restart summit-advisory-saas
```

## Performance Optimization

The application is optimized for t3.micro instance:
- PM2 configured for 1 instance (not cluster mode)
- Memory limit set to 800MB
- Node.js memory optimized with `--max-old-space-size=1024`
- Build optimized with Next.js production mode

## URLs & Endpoints

- **Production App**: https://app.summitadvisoryfirm.com
- **Health Check**: https://app.summitadvisoryfirm.com/api/health
- **Marketing Site**: https://summitadvisoryfirm.com

## Support Information

- **EC2 Instance**: i-09dbbedaa629749c7
- **Region**: us-east-1
- **Security Group**: sg-0ee6c53eae47d4acb
- **IAM Role**: summit-advisory-saas-role
- **Secrets Manager**: summit-advisory-saas-env

## Estimated Costs

- **EC2 t3.micro**: ~$8.50/month (after free tier)
- **Data Transfer**: ~$2-5/month
- **Route53**: ~$0.50/month
- **Total**: ~$11-15/month

---

**Last Updated**: 2025-01-22
**Deployment Status**: Ready for production deployment
**Build Quality**: Zero warnings, zero errors