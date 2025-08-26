# Infrastructure and Deployment Integration

## Enhancement Deployment Strategy

**Deployment Approach:** **Hybrid Multi-Platform Strategy**  
- **Marketing Pages:** Continue AWS Amplify static export (no changes)
- **Guard Management:** Migrate to Vercel for full Next.js capabilities
- **Database:** Single Supabase project with expanded schema
- **Edge Functions:** Supabase Edge Functions for serverless API logic

**Infrastructure Changes:**
- **New Deployment Target:** Vercel for authenticated guard management routes
- **DNS Configuration:** Route-based traffic splitting between platforms
- **Environment Variables:** Unified across both deployment platforms  
- **CI/CD Pipeline:** GitHub Actions for coordinated multi-platform deployment

## Pipeline Integration

**GitHub Actions Workflow:**
```yaml
# .github/workflows/deploy.yml
name: Multi-Platform Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # Database migrations first
  migrate-database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Apply Supabase Migrations
        run: |
          npx supabase db push --linked
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  # Deploy Edge Functions
  deploy-edge-functions:
    needs: migrate-database
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Edge Functions
        run: |
          npx supabase functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  # Marketing site to AWS Amplify (existing)
  deploy-marketing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure Amplify
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      - name: Deploy to Amplify
        run: |
          # Amplify auto-deploys on git push
          echo "Marketing deployment triggered"

  # Guard management to Vercel (new)
  deploy-vercel:
    needs: [migrate-database, deploy-edge-functions]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Rollback Strategy

**Rollback Method:** **Automated Rollback with Health Checks**
- **Database Rollback:** Supabase migration rollback with data preservation
- **Application Rollback:** Vercel instant rollback to previous deployment
- **Health Monitoring:** Automated health checks trigger rollback if needed

**Risk Mitigation:**
- **Blue-Green Deployment:** Zero-downtime updates using Vercel preview URLs
- **Database Backup:** Automated daily backups before major migrations
- **Feature Flags:** Gradual feature rollout with instant disable capability
- **Monitoring Alerts:** Real-time alerts for system failures or performance degradation

**Monitoring:** 
- **Vercel Analytics:** Performance monitoring for guard management routes
- **Supabase Monitoring:** Database performance and Edge Function health
- **Custom Alerts:** Critical workflow failures (hiring pipeline, shift assignments)
- **Uptime Monitoring:** 24/7 system availability tracking
