# Production Deployment Instructions

## 🚀 Summit Advisory SaaS Platform Production Deployment

### Infrastructure Status: ✅ READY
All AWS infrastructure has been successfully deployed and configured. The system is ready for application deployment.

## 📋 Pre-Deployment Checklist

### 1. AWS Infrastructure Verification
- [x] **EC2 Instance**: `i-09dbbedaa629749c7` running on `98.81.1.161`
- [x] **Security Group**: SSH, HTTP, HTTPS access configured
- [x] **DNS**: `app.summitadvisoryfirm.com` → `98.81.1.161`
- [x] **Secrets Manager**: Environment variables configured
- [x] **IAM Roles**: Instance profile attached for secrets access
- [x] **Billing Alerts**: $50, $100, $200 thresholds active

### 2. GitHub Repository Configuration
Configure these secrets in GitHub repository settings (`Settings > Secrets and variables > Actions`):

```bash
EC2_HOST=98.81.1.161
EC2_USERNAME=ec2-user
EC2_PRIVATE_KEY=[content of ~/summit-advisory-key.pem file]
```

### 3. Environment Variables
Update AWS Secrets Manager with actual values:

```bash
aws secretsmanager update-secret \
  --secret-id summit-advisory-saas-env \
  --secret-string '{
    "NODE_ENV": "production",
    "PORT": "3000",
    "HOSTNAME": "0.0.0.0",
    "NEXT_PUBLIC_SUPABASE_URL": "your-actual-supabase-project-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-actual-supabase-anon-key", 
    "SUPABASE_SERVICE_ROLE_KEY": "your-actual-supabase-service-role-key",
    "OPENAI_API_KEY": "your-actual-openai-api-key"
  }'
```

## 🔧 Manual Deployment Steps

### Step 1: Initial Server Setup
Once the EC2 instance is fully initialized (allow 3-5 minutes after launch):

```bash
# Connect to the instance
ssh -i ~/summit-advisory-key.pem ec2-user@98.81.1.161

# Run the setup script
sudo wget https://raw.githubusercontent.com/johnrue/summit-advisory-vercel/main/scripts/deployment/ec2-setup.sh
sudo chmod +x ec2-setup.sh
sudo ./ec2-setup.sh
```

### Step 2: SSL Certificate Configuration
After DNS propagation (wait 5-10 minutes):

```bash
# Connect to the instance
ssh -i ~/summit-advisory-key.pem ec2-user@98.81.1.161

# Install SSL certificate
sudo certbot --nginx -d app.summitadvisoryfirm.com --non-interactive --agree-tos --email admin@summitadvisoryfirm.com

# Verify SSL configuration
sudo nginx -t && sudo systemctl reload nginx
```

### Step 3: Application Deployment
Deploy via GitHub Actions (recommended) or manually:

#### Option A: GitHub Actions Deployment
```bash
# Push to main branch to trigger deployment
git push origin main

# Monitor deployment in GitHub Actions tab
# Deployment will automatically:
# 1. Run tests and build
# 2. Deploy to EC2
# 3. Configure PM2 and Nginx
# 4. Verify deployment
```

#### Option B: Manual Deployment
```bash
# Clone repository on EC2
ssh -i ~/summit-advisory-key.pem ec2-user@98.81.1.161
cd /opt
sudo git clone https://github.com/johnrue/summit-advisory-vercel.git summit-advisory-saas
sudo chown -R ec2-user:ec2-user summit-advisory-saas
cd summit-advisory-saas

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

# Configure Nginx
sudo cp scripts/deployment/nginx-saas.conf /etc/nginx/sites-available/summit-advisory-saas
sudo ln -sf /etc/nginx/sites-available/summit-advisory-saas /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Step 4: Deployment Verification
```bash
# Health check
curl -f https://app.summitadvisoryfirm.com/api/health

# PM2 status
pm2 status

# Nginx status
sudo systemctl status nginx

# View application logs
pm2 logs summit-advisory-saas
```

## 🌐 Automated Deployment (GitHub Actions)

The deployment pipeline (`/.github/workflows/deploy-ec2.yml`) will automatically:

1. **Test Phase**: 
   - TypeScript compilation check
   - ESLint validation
   - Jest unit tests

2. **Build Phase**:
   - Production build with environment variables
   - Dependency optimization

3. **Deploy Phase**:
   - Secure file transfer to EC2
   - Environment configuration from Secrets Manager
   - PM2 cluster deployment
   - Nginx proxy configuration
   - Health check verification

### Deployment Trigger
```bash
# Any push to main branch triggers deployment
git add .
git commit -m "deploy: production release"
git push origin main
```

## 📊 Post-Deployment Monitoring

### Application URLs
- **SaaS Platform**: https://app.summitadvisoryfirm.com
- **Health Check**: https://app.summitadvisoryfirm.com/api/health
- **Marketing Site**: https://summitadvisoryfirm.com (AWS Amplify)

### Monitoring Commands
```bash
# Application performance
pm2 monit

# Server resources
htop

# Nginx logs
sudo tail -f /var/log/nginx/summit-saas-access.log

# Application logs
pm2 logs summit-advisory-saas --lines 100

# SSL certificate status
sudo certbot certificates
```

### CloudWatch Monitoring
- **Instance Metrics**: CPU, Memory, Disk usage
- **Application Logs**: Available in CloudWatch Logs
- **Billing Alerts**: Active at $50, $100, $200 thresholds

## 🛠️ Troubleshooting

### Common Issues

#### 1. SSH Connection Failed
```bash
# Check instance status
aws ec2 describe-instance-status --instance-ids i-09dbbedaa629749c7

# Verify security group
aws ec2 describe-security-groups --group-ids sg-0ee6c53eae47d4acb

# Wait 5-10 minutes for instance initialization
```

#### 2. DNS Not Resolving
```bash
# Check DNS propagation
nslookup app.summitadvisoryfirm.com
dig app.summitadvisoryfirm.com

# Allow 5-10 minutes for Route53 propagation
```

#### 3. SSL Certificate Issues
```bash
# Ensure DNS is propagated before running certbot
# Check nginx configuration
sudo nginx -t

# Retry certificate installation
sudo certbot --nginx -d app.summitadvisoryfirm.com --force-renewal
```

#### 4. Application Not Starting
```bash
# Check environment variables
cat /opt/summit-advisory-saas/.env.local

# Check PM2 logs
pm2 logs summit-advisory-saas

# Restart application
pm2 restart summit-advisory-saas
```

#### 5. GitHub Actions Deployment Failed
- Verify GitHub secrets are correctly configured
- Check deployment logs in Actions tab
- Ensure EC2 instance is accessible
- Verify Secrets Manager permissions

### Emergency Procedures

#### Rollback Deployment
```bash
# PM2 automatic rollback
ssh -i ~/summit-advisory-key.pem ec2-user@98.81.1.161
pm2 reload ecosystem.config.js

# Manual rollback to previous backup
sudo mv /opt/summit-advisory-saas.backup.[timestamp] /opt/summit-advisory-saas
pm2 restart summit-advisory-saas
```

#### Instance Recovery
```bash
# Launch replacement instance with same configuration
# Update Route53 A record to new instance IP
# Restore application from backup or redeploy
```

## 📞 Support Information

### Key Infrastructure Details
- **EC2 Instance**: `i-09dbbedaa629749c7` (t3.micro)
- **Public IP**: `98.81.1.161`  
- **Region**: `us-east-1` (N. Virginia)
- **VPC**: `vpc-07ebeb9edfce203f1`
- **Security Group**: `sg-0ee6c53eae47d4acb`

### AWS Resources
- **Secrets Manager**: `arn:aws:secretsmanager:us-east-1:209479265200:secret:summit-advisory-saas-env-83rsz9`
- **Route53 Zone**: `Z097850724KE52XL3XEFN`
- **IAM Role**: `summit-advisory-saas-role`

### Contact Information
For deployment support or issues, refer to this documentation and the AWS infrastructure deployment summary.

---

**Deployment Status**: ✅ Infrastructure ready, awaiting application deployment  
**Estimated Deployment Time**: 10-15 minutes (excluding DNS propagation)  
**Monthly Cost**: ~$13-19 (after free tier expires)