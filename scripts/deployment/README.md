# Deployment Scripts

This directory contains deployment scripts and configurations for the Summit Advisory SaaS Platform on AWS EC2.

## Files

### `deploy-ec2.yml`
GitHub Actions workflow file for automated deployment to EC2. This workflow:
- Runs tests and builds the application
- Creates a deployment package
- Deploys to EC2 via SSH
- Manages environment variables via AWS Secrets Manager
- Handles rollback scenarios

### `ec2-setup.sh`
Initial EC2 instance setup script. This script:
- Installs Node.js 22.17.0 LTS and pnpm
- Configures nginx as a reverse proxy
- Sets up systemd service for the application
- Installs CloudWatch agent for monitoring
- Configures security and firewall settings

### `summit-advisory-saas.service`
Systemd service definition for running the SaaS platform as a system service.

## Prerequisites

### GitHub Secrets Required
Set these secrets in your GitHub repository settings:

```bash
EC2_HOST                    # EC2 instance public IP or DNS
EC2_USERNAME               # EC2 username (usually 'ec2-user')
EC2_PRIVATE_KEY           # Private key for SSH access (PEM format)
NEXT_PUBLIC_SUPABASE_URL  # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anonymous key
OPENAI_API_KEY            # OpenAI API key for resume parsing
```

### AWS Secrets Manager
Create a secret named `summit-advisory-saas-env` containing:

```json
{
  "NEXT_PUBLIC_SUPABASE_URL": "your-supabase-url",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-supabase-anon-key",
  "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
  "OPENAI_API_KEY": "your-openai-api-key",
  "NODE_ENV": "production",
  "PORT": "3000"
}
```

## Deployment Process

### Initial Setup

1. **Launch EC2 Instance**
   ```bash
   # Use Amazon Linux 2023
   # Instance type: t3.micro (development) or t3.small (production)
   # Security groups: Allow HTTP (80), HTTPS (443), SSH (22)
   ```

2. **Run Setup Script**
   ```bash
   # Copy script to EC2 and run
   scp -i your-key.pem scripts/deployment/ec2-setup.sh ec2-user@your-ec2-ip:~/
   ssh -i your-key.pem ec2-user@your-ec2-ip
   chmod +x ec2-setup.sh
   sudo ./ec2-setup.sh
   ```

3. **Configure AWS IAM Role**
   Attach an IAM role to the EC2 instance with these permissions:
   - `SecretsManagerReadWrite` (for environment variables)
   - `CloudWatchAgentServerPolicy` (for monitoring)
   - `AmazonSSMManagedInstanceCore` (for Systems Manager)

### Automated Deployment

Once setup is complete, deployments are automated via GitHub Actions:

1. Push to `main` branch triggers deployment
2. Tests run first (TypeScript, lint, unit tests)
3. Application is built and packaged
4. Package is deployed to EC2 via SSH
5. Environment variables are retrieved from Secrets Manager
6. Application is restarted with zero downtime

### Manual Deployment Commands

```bash
# Check service status
sudo systemctl status summit-advisory-saas

# View logs
sudo journalctl -u summit-advisory-saas -f

# Restart service
sudo systemctl restart summit-advisory-saas

# Test health endpoint
curl http://localhost:3000/api/health

# Check nginx status
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
```

## Monitoring

### CloudWatch Metrics
- CPU utilization
- Memory usage
- Disk usage
- Application logs
- Nginx access/error logs

### Health Checks
- Application health: `GET /api/health`
- Load balancer health checks configured
- Automated alerts for service failures

## Rollback Procedure

The deployment script automatically:
1. Backs up current deployment before updating
2. Keeps last 3 backups for rollback
3. Tests deployment before marking as successful

### Manual Rollback
```bash
# Stop current service
sudo systemctl stop summit-advisory-saas

# Restore backup (replace timestamp)
sudo mv /opt/summit-advisory-saas.backup.YYYYMMDD_HHMMSS /opt/summit-advisory-saas

# Restart service
sudo systemctl start summit-advisory-saas
```

## Security Considerations

- All environment variables stored in AWS Secrets Manager
- Nginx configured with security headers
- Firewall configured to allow only necessary ports
- Automatic security updates enabled
- Application runs as non-root user
- SSL/TLS terminated at Application Load Balancer

## Troubleshooting

### Common Issues

1. **Deployment fails with permission errors**
   ```bash
   # Ensure correct ownership
   sudo chown -R ec2-user:ec2-user /opt/summit-advisory-saas
   ```

2. **Application won't start**
   ```bash
   # Check logs
   sudo journalctl -u summit-advisory-saas --no-pager
   
   # Check environment variables
   sudo cat /opt/summit-advisory-saas/.env.local
   ```

3. **Health check fails**
   ```bash
   # Test locally
   curl http://localhost:3000/api/health
   
   # Check if process is running
   ps aux | grep node
   ```

4. **High memory usage**
   ```bash
   # Monitor with CloudWatch or:
   free -h
   htop
   ```

## Cost Optimization

- Instance scheduled scaling based on usage patterns
- CloudWatch log retention set to 7 days for cost efficiency
- Reserved instances recommended for stable workloads
- Automatic shutdown of non-production instances during off-hours