# 🚀 AWS EC2 Deployment Guide - Budget Instance

## Infrastructure Details
- **EC2 Instance**: t3.small (2 vCPU, 2GB RAM) - Budget optimized
- **Instance ID**: i-0be167230f91b5890
- **Public IP**: 18.212.109.180
- **Region**: us-east-1
- **Monthly Cost**: ~$15-20 (t3.small)

## Environment Variables
All sensitive environment variables are stored in **AWS Secrets Manager**:
- **Secret Name**: `summit-advisory-env`
- **Region**: us-east-1
- **ARN**: arn:aws:secretsmanager:us-east-1:209479265200:secret:summit-advisory-env-GsFKII

The following variables are securely stored:
- Supabase credentials (URL, Anon Key, Service Role Key)
- OpenAI API key
- Node environment settings
- All other production configurations

## Deployment Methods

### Method 1: Local Script Deployment (Recommended for Quick Deploy)

1. **Set your SSH key path**:
```bash
export EC2_SSH_KEY=~/path/to/your-key.pem
```

2. **Run the deployment script**:
```bash
./scripts/aws-deploy.sh
```

This script will:
- Build the application locally
- Create a deployment package
- Upload to EC2
- Install dependencies on EC2
- Fetch secrets from AWS Secrets Manager
- Configure Nginx
- Start with PM2
- Run health checks

### Method 2: GitHub Actions (Automated CI/CD)

1. **Add your SSH private key to GitHub Secrets**:
   - Go to Repository Settings → Secrets → Actions
   - Add `EC2_PRIVATE_KEY` with your .pem file contents

2. **Push to main branch**:
```bash
git push origin main
```

GitHub Actions will automatically deploy when pushing to main.

### Method 3: Manual SSH Deployment

1. **SSH into the instance**:
```bash
ssh -i ~/your-key.pem ec2-user@18.212.109.180
```

2. **Clone/pull the repository**:
```bash
cd /home/ec2-user
git clone https://github.com/johnrue/summit-advisory-vercel.git summit-advisory
# OR if already exists
cd summit-advisory && git pull
```

3. **Install dependencies**:
```bash
pnpm install --frozen-lockfile --production
```

4. **Get environment variables from Secrets Manager**:
```bash
aws secretsmanager get-secret-value \
  --secret-id summit-advisory-env \
  --region us-east-1 \
  --query SecretString \
  --output text | jq -r 'to_entries | map("\(.key)=\(.value)") | .[]' > .env.local

chmod 600 .env.local
```

5. **Build and start**:
```bash
pnpm run build
pm2 start ecosystem.config.js --env production
pm2 save
```

## Post-Deployment Verification

### Health Check
```bash
curl http://18.212.109.180/api/health
```

### View Logs
```bash
# SSH into instance
ssh -i ~/your-key.pem ec2-user@18.212.109.180

# View PM2 logs
pm2 logs summit-advisory

# View PM2 status
pm2 status
```

### Monitor Resources
```bash
# On EC2 instance
pm2 monit
htop
```

## Nginx Configuration

Nginx is configured as a reverse proxy on port 80:
- Proxies to Node.js app on port 3000
- Handles static file caching
- Manages headers for WebSocket support

## PM2 Configuration

The app runs under PM2 with:
- **Single instance mode** (optimized for t3.small)
- **Auto-restart** on crash
- **Memory limit**: 900MB
- **Logs**: `/home/ec2-user/summit-advisory/logs/`

## Troubleshooting

### App Not Starting
```bash
# Check logs
pm2 logs summit-advisory --err

# Check environment variables
cat .env.local

# Restart
pm2 restart summit-advisory
```

### Memory Issues
```bash
# Check memory
free -h

# Restart if needed
pm2 restart summit-advisory
```

### Cannot Access Secrets
```bash
# Verify IAM role
aws sts get-caller-identity

# Test secret access
aws secretsmanager get-secret-value --secret-id summit-advisory-env --region us-east-1
```

## Security Group Rules

The EC2 instance security group allows:
- **SSH (22)**: Your IP only
- **HTTP (80)**: 0.0.0.0/0
- **HTTPS (443)**: 0.0.0.0/0 (if SSL configured)

## Cost Optimization

This setup is optimized for budget:
- **t3.small instance**: ~$15/month
- **Single PM2 instance**: Reduces memory usage
- **Nginx caching**: Reduces Node.js load
- **AWS Secrets Manager**: ~$0.40/month
- **Total**: ~$15-20/month

## Quick Commands Reference

```bash
# Deploy
./scripts/aws-deploy.sh

# SSH to instance
ssh -i ~/your-key.pem ec2-user@18.212.109.180

# Restart app
pm2 restart summit-advisory

# View logs
pm2 logs summit-advisory

# Monitor
pm2 monit

# Update secrets
aws secretsmanager update-secret --secret-id summit-advisory-env --secret-string '{"KEY":"value"}'
```

## URLs
- **Application**: http://18.212.109.180
- **Health Check**: http://18.212.109.180/api/health

---

**Last Updated**: 2025-01-22
**Status**: Ready for deployment with AWS Secrets Manager integration