# Complete Hybrid Setup for Summit Advisory Firm
## Marketing Site (Amplify) + SaaS Platform (EC2/ALB) - Adapted for Supabase

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Route 53 DNS                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  summitadvisoryfirm.com          app.summitadvisoryfirm.com │
│           ↓                                ↓                 │
│    AWS Amplify                        ALB + EC2             │
│   (Marketing Site)                  (SaaS Platform)         │
│                                                              │
│   Git Repo #1                        Git Repo #2            │
│   - Homepage                         - Dashboard             │
│   - About/Services                   - Guard Management     │
│   - Contact/QR System               - Scheduling/Compliance │
│   - Login → redirect to app          - Reports/Analytics    │
│                                                              │
│           ┌─────────────────────────────────────────────┐    │
│           │             Supabase Backend               │    │
│           │  - Authentication & RLS                    │    │
│           │  - PostgreSQL Database                     │    │
│           │  - Real-time subscriptions                 │    │
│           │  - Edge Functions                          │    │
│           └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Part 1: Update Marketing Site (Amplify)

### Add Login/Portal Links to Main Site

Create or update these files in your existing Amplify Git repository:

```jsx
// components/Header.jsx (or wherever your navigation is)
import Link from 'next/link';

export default function Header() {
  return (
    <header className="header">
      <nav className="nav">
        <Link href="/">
          <img src="/logo.png" alt="Summit Advisory Firm" />
        </Link>
        
        <div className="nav-links">
          <Link href="/services">Services</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          
          {/* Portal Button - Stands Out */}
          <a 
            href="https://app.summitadvisoryfirm.com" 
            className="btn-portal"
            target="_blank"
            rel="noopener noreferrer"
          >
            Client Portal →
          </a>
        </div>
      </nav>
    </header>
  );
}
```

```jsx
// pages/index.jsx - Add CTA section on homepage
export default function Home() {
  return (
    <>
      {/* Your existing homepage content */}
      
      {/* Add Client Access Section */}
      <section className="client-access">
        <div className="container">
          <h2>Existing Clients</h2>
          <p>Access your security guard management dashboard</p>
          <a 
            href="https://app.summitadvisoryfirm.com" 
            className="btn-primary-large"
          >
            Log In to Portal
          </a>
        </div>
      </section>
    </>
  );
}
```

```jsx
// pages/login.jsx - Dedicated login redirect page
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  
  useEffect(() => {
    // Preserve any query parameters (like return URLs)
    const queryString = window.location.search;
    window.location.href = `https://app.summitadvisoryfirm.com/login${queryString}`;
  }, []);
  
  return (
    <div className="login-redirect">
      <h2>Redirecting to Client Portal...</h2>
      <p>You are being redirected to our secure client portal.</p>
      <p>
        If you are not redirected automatically, 
        <a href="https://app.summitadvisoryfirm.com/login"> click here</a>.
      </p>
    </div>
  );
}
```

```css
/* styles/portal.css - Styling for portal button */
.btn-portal {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 600;
  transition: transform 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-portal:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}

.client-access {
  background: #f7fafc;
  padding: 80px 0;
  text-align: center;
}

.btn-primary-large {
  font-size: 1.2rem;
  padding: 16px 32px;
  background: #4a5568;
  color: white;
  border-radius: 8px;
  display: inline-block;
  margin-top: 20px;
}
```

## Part 2: Complete Terraform Configuration for SaaS

### Directory Structure for New Git Repository

```
summit-saas-platform/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── network.tf
│   ├── security.tf
│   ├── alb.tf
│   ├── ec2.tf
│   ├── acm.tf
│   ├── route53.tf
│   ├── secrets.tf
│   ├── outputs.tf
│   ├── terraform.tfvars
│   └── user_data.sh
├── .github/
│   └── workflows/
│       └── deploy.yml
├── src/
│   └── [Your Next.js SaaS application]
└── README.md
```

### Updated Terraform Configuration Files

#### `terraform/variables.tf`
```hcl
variable "project_name" {
  description = "Project name"
  type        = string
  default     = "summit-saas"
}

variable "environment" {
  description = "Environment"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "root_domain" {
  description = "Root domain name"
  type        = string
  default     = "summitadvisoryfirm.com"
}

variable "app_subdomain" {
  description = "Application subdomain"
  type        = string
  default     = "app"
}

variable "route53_zone_id" {
  description = "Route53 Hosted Zone ID for summitadvisoryfirm.com"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository URL for SaaS platform"
  type        = string
}

variable "github_token" {
  description = "GitHub personal access token for private repo"
  type        = string
  sensitive   = true
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "min_size" {
  description = "Minimum ASG size"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum ASG size"
  type        = number
  default     = 3
}

variable "supabase_url" {
  description = "Supabase URL"
  type        = string
  sensitive   = true
}

variable "supabase_anon_key" {
  description = "Supabase anonymous key"
  type        = string
  sensitive   = true
}

variable "supabase_service_key" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key for resume parsing"
  type        = string
  sensitive   = true
}
```

#### `terraform/terraform.tfvars`
```hcl
# Project Configuration
project_name    = "summit-saas"
environment     = "production"
aws_region      = "us-east-1"
root_domain     = "summitadvisoryfirm.com"
app_subdomain   = "app"

# Get this from Route53 console
route53_zone_id = "ZXXXXXXXXXXXXX"

# GitHub Configuration (new repo for SaaS)
github_repo  = "https://github.com/YOUR_USERNAME/summit-saas-platform.git"
github_token = "ghp_XXXXXXXXXXXXXX"  # Create a personal access token

# Instance Configuration (start small)
instance_type = "t3.small"
min_size      = 1
max_size      = 1  # Increase when you need to scale

# Supabase Configuration (existing from current setup)
supabase_url         = "https://XXXXX.supabase.co"
supabase_anon_key    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXX"
supabase_service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXX"

# OpenAI API key for resume parsing (existing from current setup)
openai_api_key = "sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

#### `terraform/main.tf`
```hcl
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # Optional: S3 backend for state
  backend "s3" {
    bucket = "summit-terraform-state"
    key    = "saas/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Domain      = "${var.app_subdomain}.${var.root_domain}"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]
  
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

data "aws_route53_zone" "main" {
  zone_id = var.route53_zone_id
}
```

#### `terraform/acm.tf`
```hcl
# SSL Certificate for app.summitadvisoryfirm.com
resource "aws_acm_certificate" "saas" {
  domain_name               = "${var.app_subdomain}.${var.root_domain}"
  subject_alternative_names = [
    "www.${var.app_subdomain}.${var.root_domain}",
    "api.${var.root_domain}"  # If you want an API subdomain later
  ]
  validation_method = "DNS"
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = {
    Name = "${var.project_name}-ssl-cert"
  }
}

# DNS validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.saas.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  
  zone_id         = var.route53_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

# Wait for validation
resource "aws_acm_certificate_validation" "saas" {
  certificate_arn         = aws_acm_certificate.saas.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

#### `terraform/route53.tf`
```hcl
# A record for app.summitadvisoryfirm.com pointing to ALB
resource "aws_route53_record" "app" {
  zone_id = var.route53_zone_id
  name    = "${var.app_subdomain}.${var.root_domain}"
  type    = "A"
  
  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# Optional: CNAME for www.app.summitadvisoryfirm.com
resource "aws_route53_record" "app_www" {
  zone_id = var.route53_zone_id
  name    = "www.${var.app_subdomain}.${var.root_domain}"
  type    = "CNAME"
  ttl     = 300
  records = ["${var.app_subdomain}.${var.root_domain}"]
}
```

#### `terraform/user_data.sh`
```bash
#!/bin/bash

# Set variables from Terraform
PROJECT_NAME="${project_name}"
GITHUB_REPO="${github_repo}"
GITHUB_TOKEN="${github_token}"
AWS_REGION="${aws_region}"
SECRET_NAME="${secret_name}"
APP_DOMAIN="${app_domain}"

# Update system
yum update -y

# Install dependencies
yum install -y git nginx aws-cli jq

# Install Node.js 20
curl -sL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Install PM2
npm install -g pm2

# Setup application directory
mkdir -p /var/app
cd /var/app

# Clone repository with token for private repo
git clone https://${GITHUB_TOKEN}@${GITHUB_REPO#https://} .

# Get secrets from AWS Secrets Manager
SECRETS=$(aws secretsmanager get-secret-value \
  --secret-id $SECRET_NAME \
  --region $AWS_REGION \
  --query SecretString \
  --output text)

# Create .env.production file
cat > .env.production << EOF
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://${APP_DOMAIN}
NEXT_PUBLIC_SUPABASE_URL=$(echo $SECRETS | jq -r .SUPABASE_URL)
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(echo $SECRETS | jq -r .SUPABASE_ANON_KEY)
SUPABASE_SERVICE_KEY=$(echo $SECRETS | jq -r .SUPABASE_SERVICE_KEY)
OPENAI_API_KEY=$(echo $SECRETS | jq -r .OPENAI_API_KEY)
EOF

# Build application
npm ci --production
npm run build

# Setup PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'summit-saas',
    script: 'npm',
    args: 'start',
    cwd: '/var/app',
    instances: 1,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      PORT: 3000
    },
    error_file: '/var/log/pm2/error.log',
    out_file: '/var/log/pm2/out.log',
    time: true
  }]
}
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Configure Nginx
cat > /etc/nginx/conf.d/saas.conf << 'NGINX'
upstream app {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80 default_server;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Proxy to Next.js
    location / {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /api/health {
        proxy_pass http://app;
        access_log off;
    }
    
    # Static files with caching
    location /_next/static {
        proxy_pass http://app;
        proxy_cache_valid 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    location /static {
        proxy_pass http://app;
        proxy_cache_valid 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
NGINX

# Enable and start Nginx
systemctl enable nginx
systemctl start nginx

# Setup CloudWatch logging
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CW'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/pm2/out.log",
            "log_group_name": "/aws/ec2/summit-saas",
            "log_stream_name": "{instance_id}/app"
          },
          {
            "file_path": "/var/log/pm2/error.log",
            "log_group_name": "/aws/ec2/summit-saas",
            "log_stream_name": "{instance_id}/error"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/aws/ec2/summit-saas",
            "log_stream_name": "{instance_id}/nginx"
          }
        ]
      }
    }
  },
  "metrics": {
    "metrics_collected": {
      "cpu": {
        "measurement": [{"name": "cpu_usage_idle"}],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [{"name": "used_percent"}],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": [{"name": "mem_used_percent"}],
        "metrics_collection_interval": 60
      }
    }
  }
}
CW

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

echo "Deployment complete!"
```

## Part 3: Next.js SaaS Application Configuration

### Update your SaaS Next.js app configuration:

#### `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variables
  env: {
    APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://app.summitadvisoryfirm.com',
    MARKETING_URL: 'https://summitadvisoryfirm.com',
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      }
    ]
  }
}

module.exports = nextConfig
```

#### `pages/api/health.js`
```javascript
// Health check endpoint for ALB
export default function handler(req, res) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  };
  
  res.status(200).json(health);
}
```

#### `app/login/page.tsx` (Adapted for existing codebase structure)
```typescript
"use client";

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Login() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      alert(error.message);
    } else {
      window.location.href = '/dashboard';
    }
    
    setLoading(false);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Summit Advisory Portal</h1>
          <p className="text-muted-foreground">Security Guard Management System</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>
        
        <div className="text-center space-y-2">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot Password?
          </Link>
          <br />
          <a href="https://summitadvisoryfirm.com/contact" className="text-sm text-muted-foreground hover:underline">
            Need Help? Contact Support
          </a>
        </div>
        
        <div className="text-center">
          <a href="https://summitadvisoryfirm.com" className="text-sm text-muted-foreground hover:underline">
            ← Back to Main Site
          </a>
        </div>
      </div>
    </div>
  );
}
```

## Part 4: GitHub Actions Deployment

#### `.github/workflows/deploy.yml`
```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Get EC2 Instance IPs
        id: get-instances
        run: |
          INSTANCE_IPS=$(aws ec2 describe-instances \
            --filters "Name=tag:Project,Values=summit-saas" \
                     "Name=instance-state-name,Values=running" \
            --query "Reservations[*].Instances[*].PrivateIpAddress" \
            --output text)
          echo "instances=$INSTANCE_IPS" >> $GITHUB_OUTPUT
      
      - name: Deploy to EC2
        run: |
          for ip in ${{ steps.get-instances.outputs.instances }}; do
            aws ssm send-command \
              --instance-ids $(aws ec2 describe-instances \
                --filters "Name=private-ip-address,Values=$ip" \
                --query "Reservations[*].Instances[*].InstanceId" \
                --output text) \
              --document-name "AWS-RunShellScript" \
              --parameters 'commands=[
                "cd /var/app",
                "git pull",
                "npm ci --production",
                "npm run build",
                "pm2 restart all"
              ]'
          done
```

## Part 5: Commands to Execute

### For Claude Code or Terminal:

```bash
# 1. Create new Git repository for SaaS
mkdir summit-saas-platform
cd summit-saas-platform
git init

# 2. Create terraform directory
mkdir -p terraform
cd terraform

# 3. Create all the .tf files from above
# (Copy all terraform files from artifact)

# 4. Initialize Terraform
terraform init

# 5. Plan the deployment
terraform plan

# 6. Apply (create all infrastructure)
terraform apply -auto-approve

# 7. Get your new SaaS URL
terraform output website_url
# Output: https://app.summitadvisoryfirm.com
```

## Part 6: Post-Deployment Checklist

### Week 1:
- [ ] Deploy infrastructure with Terraform
- [ ] Verify SSL certificate is active
- [ ] Test app.summitadvisoryfirm.com loads
- [ ] Update Amplify site with portal links
- [ ] Test login flow from marketing → SaaS

### Week 2:
- [ ] Set up monitoring dashboards
- [ ] Configure backup strategy
- [ ] Document deployment process
- [ ] Train team on new structure

### Week 3:
- [ ] Performance testing
- [ ] Security audit
- [ ] Cost analysis
- [ ] Scale testing (increase to 2 instances briefly)

## Cost Breakdown

| Service | Purpose | Monthly Cost |
|---------|---------|--------------|
| **Amplify** | Marketing site | $5-10 |
| **EC2 t3.small** | SaaS server | $15 |
| **ALB** | Load balancer | $20 |
| **Route 53** | DNS | $1 |
| **ACM** | SSL certificates | Free |
| **Data Transfer** | ~100GB | $5 |
| **Total** | **Everything** | **~$46-51** |

## Monitoring Dashboard

```javascript
// Add to your SaaS app: pages/api/status.js
export default async function handler(req, res) {
  const status = {
    app: 'operational',
    database: await checkSupabase(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };
  
  res.status(200).json(status);
}

async function checkSupabase() {
  try {
    // Ping Supabase REST API endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
      {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      }
    );
    return response.ok ? 'operational' : 'degraded';
  } catch {
    return 'offline';
  }
}
```

## Key Adaptations for Existing Summit Advisory Codebase

### 1. **Maintain Current Tech Stack**
- Keep existing Supabase integration (authentication, database, real-time)
- Preserve OpenAI API integration for resume parsing
- Use existing shadcn/ui components and Tailwind styling
- Keep current TypeScript and Next.js App Router structure

### 2. **Codebase Split Strategy**
- **Marketing Site (Amplify)**: Homepage, services, contact, QR system
- **Guard Management Platform (EC2)**: All dashboard routes, authentication, guard management features
- Both sites share the same Supabase backend for data consistency

### 3. **Environment Variables Mapping**
Current `.env` variables will work in the new setup:
```bash
# Existing variables to migrate to AWS Secrets Manager
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
```

### 4. **Implementation Timeline**
1. **Week 1**: Infrastructure setup with Terraform
2. **Week 2**: Code repository split and deployment pipeline
3. **Week 3**: DNS routing and SSL certificate configuration  
4. **Week 4**: Testing authentication flow and data sync

### 5. **Benefits Over Current Vercel Setup**
- **Cost Reduction**: ~$46-51/month vs Vercel scaling costs
- **Infrastructure Control**: Direct server access and configuration
- **Scalability**: Auto-scaling groups for peak usage
- **Monitoring**: CloudWatch integration for performance tracking
- **Security**: VPC isolation and security group controls

Your hybrid architecture is now adapted for your existing Summit Advisory codebase! The marketing site stays on Amplify with automatic deployments, while your guard management platform runs on EC2 with enterprise-grade infrastructure and maintains all current Supabase functionality.