# AWS ALB + ACM Architecture Deployment

## 🏗️ **Enhanced AWS-Native Architecture**

### ✅ **Deployed Components**

#### Application Load Balancer (ALB)
- **ALB Name**: `summit-advisory-ALB`
- **ARN**: `arn:aws:elasticloadbalancing:us-east-1:209479265200:loadbalancer/app/summit-advisory-ALB/398794d6cbe1435e`
- **DNS**: `summit-advisory-ALB-1147021746.us-east-1.elb.amazonaws.com`
- **Availability Zones**: us-east-1a, us-east-1b, us-east-1c
- **Security Group**: `sg-0ee6c53eae47d4acb`

#### SSL Certificate (ACM)
- **Certificate ARN**: `arn:aws:acm:us-east-1:209479265200:certificate/d4291e39-849b-44f2-9117-d20e0f45812a`
- **Domain**: `app.summitadvisoryfirm.com`
- **Status**: ✅ **ISSUED**
- **Validation**: DNS validated via Route53

#### Target Group
- **Name**: `summit-advisory-saas-tg`
- **ARN**: `arn:aws:elasticloadbalancing:us-east-1:209479265200:targetgroup/summit-advisory-saas-tg/bb9f09f6c62f5841`
- **Protocol**: HTTP:3000
- **Health Check**: `/api/health`
- **Registered Target**: EC2 instance `i-09dbbedaa629749c7`

#### ALB Listeners
- **HTTP (80)**: `arn:aws:elasticloadbalancing:us-east-1:209479265200:listener/app/summit-advisory-ALB/398794d6cbe1435e/b4dde4a0acdf6b60`
- **HTTPS (443)**: `arn:aws:elasticloadbalancing:us-east-1:209479265200:listener/app/summit-advisory-ALB/398794d6cbe1435e/1286981d2ad3e892`

#### DNS Configuration
- **Route53 A Record**: `app.summitadvisoryfirm.com` → ALB (Alias record)
- **ACM Validation**: DNS CNAME record for certificate validation

## 🔄 **Updated Architecture Benefits**

### **AWS-Native Advantages:**
- ✅ **SSL Termination at ALB**: Reduces EC2 CPU overhead
- ✅ **Auto-Renewing ACM Certificates**: No manual certificate management
- ✅ **High Availability**: Multi-AZ deployment ready
- ✅ **Health Checks**: Automatic unhealthy target removal
- ✅ **Security**: EC2 instances can be in private subnets (future enhancement)
- ✅ **Scalability**: Auto Scaling Group integration ready

### **Cost Optimization:**
- **ALB**: ~$16-20/month (vs free Let's Encrypt)
- **ACM Certificate**: Free
- **Better Performance**: SSL termination at edge
- **Future Scaling**: Ready for horizontal scaling

## 🚀 **Updated Deployment Process**

### **1. Infrastructure Status**
```bash
# Check ALB status
aws elbv2 describe-load-balancers --names summit-advisory-ALB

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:209479265200:targetgroup/summit-advisory-saas-tg/bb9f09f6c62f5841

# Check certificate status
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:209479265200:certificate/d4291e39-849b-44f2-9117-d20e0f45812a
```

### **2. Application Deployment**
The EC2 instance now only needs to:
- Run the application on port 3000 (HTTP)
- Provide health check endpoint at `/api/health`
- No SSL configuration needed (handled by ALB)

### **3. Updated Nginx Configuration**
Since SSL is handled by ALB, the Nginx configuration can be simplified:

```nginx
# Simplified Nginx config for ALB backend
server {
    listen 3000;
    server_name _;
    
    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3001;  # Next.js app
        access_log off;
    }
    
    # All other requests
    location / {
        proxy_pass http://localhost:3001;  # Next.js app
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **4. PM2 Configuration Update**
Update ecosystem.config.js for ALB backend:

```javascript
module.exports = {
  apps: [{
    name: 'summit-advisory-saas',
    script: 'node_modules/.bin/next',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,  // Changed from 3000 to 3001
      HOSTNAME: '0.0.0.0'
    }
  }]
};
```

## 🧪 **Testing the ALB Deployment**

### **Health Check Verification**
```bash
# Test direct EC2 health (once app is deployed)
curl http://98.81.1.161:3000/api/health

# Test ALB health check
curl http://summit-advisory-ALB-1147021746.us-east-1.elb.amazonaws.com/api/health

# Test final HTTPS endpoint (after DNS propagates)
curl https://app.summitadvisoryfirm.com/api/health
```

### **SSL Certificate Verification**
```bash
# Check SSL certificate
openssl s_client -connect app.summitadvisoryfirm.com:443 -servername app.summitadvisoryfirm.com

# Verify certificate details
curl -vI https://app.summitadvisoryfirm.com
```

## 📊 **Monitoring & Logging**

### **ALB Metrics (CloudWatch)**
- Request count
- Response time
- HTTP error codes
- Target health status

### **Target Group Health**
```bash
# Monitor target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:209479265200:targetgroup/summit-advisory-saas-tg/bb9f09f6c62f5841
```

### **ALB Access Logs (Optional)**
Enable ALB access logs to S3 for detailed request analysis.

## 🔧 **Troubleshooting**

### **Target Health Issues**
```bash
# Check target registration
aws elbv2 describe-target-health --target-group-arn [TARGET-GROUP-ARN]

# Common issues:
# - Target not in ALB availability zones ✅ Fixed
# - Security group not allowing ALB access
# - Health check endpoint not responding
# - Application not listening on correct port
```

### **SSL Certificate Issues**
```bash
# Verify certificate is attached to listener
aws elbv2 describe-listeners \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:209479265200:loadbalancer/app/summit-advisory-ALB/398794d6cbe1435e
```

### **DNS Resolution**
```bash
# Check DNS propagation
nslookup app.summitadvisoryfirm.com
dig app.summitadvisoryfirm.com

# Should resolve to ALB DNS name
```

## 🎯 **Next Steps**

### **Immediate Tasks**
1. Wait for EC2 instance to fully initialize
2. Deploy application to EC2 instance
3. Verify target health becomes "healthy"
4. Test end-to-end HTTPS connectivity

### **Future Enhancements**
1. Move EC2 instances to private subnets
2. Set up Auto Scaling Group
3. Add WAF (Web Application Firewall)
4. Configure detailed CloudWatch monitoring
5. Set up ALB access logs to S3

---

**Architecture Status**: ✅ ALB + ACM infrastructure fully configured  
**SSL Certificate**: ✅ Issued and attached to HTTPS listener  
**Target Registration**: 🔄 In progress (waiting for application deployment)  
**Next Phase**: Application deployment and health check validation