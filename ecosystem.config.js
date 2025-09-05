/**
 * PM2 Ecosystem Configuration for Summit Advisory SaaS Platform
 * Production-ready configuration with cluster mode, monitoring, and logging
 */
module.exports = {
  apps: [
    {
      name: 'summit-advisory-saas',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/opt/summit-advisory-saas',
      
      // Cluster mode configuration
      instances: 1, // Use 1 instance for smaller EC2 (t3.micro/t3.small)
      exec_mode: 'cluster',
      
      // Environment configuration
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      
      // Process management
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 4000,
      
      // Memory management
      max_memory_restart: '800M', // Reduced for smaller instance
      
      // Logging configuration
      log_file: '/opt/summit-advisory-saas/logs/combined.log',
      out_file: '/opt/summit-advisory-saas/logs/out.log',
      error_file: '/opt/summit-advisory-saas/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json',
      
      // Auto-restart configuration
      watch: false, // Disable in production for stability
      ignore_watch: [
        'node_modules',
        'logs',
        '.next/cache',
        '*.log'
      ],
      
      // Health monitoring
      health_check_http_url: 'http://localhost:3000/api/health',
      health_check_grace_period: 3000,
      
      // Advanced process options
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Source map support for better error tracking
      source_map_support: true,
      
      // Graceful shutdown
      kill_retry_time: 100,
      
      // Process title for easier identification
      instance_var: 'INSTANCE_ID',
      
      // Interpreter options
      node_args: [
        '--max-old-space-size=1024',
        '--optimize-for-size'
      ]
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'ec2-user',
      host: process.env.EC2_HOST || 'app.summitadvisoryfirm.com',
      ref: 'origin/main',
      repo: 'https://github.com/johnrue/summit-advisory-vercel.git',
      path: '/opt/summit-advisory-saas',
      'post-deploy': 'pnpm install --frozen-lockfile --production && pnpm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    }
  }
};