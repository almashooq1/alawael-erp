/**
 * PM2 Ecosystem Config
 * إعدادات PM2 لإدارة التطبيقات في الإنتاج
 */

module.exports = {
  apps: [
    {
      name: 'backend',
      script: './backend/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        MONGODB_URI: process.env.MONGODB_URI,
        JWT_SECRET: process.env.JWT_SECRET,
        LOG_LEVEL: 'info',
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
    },
    {
      name: 'frontend',
      script: './frontend/server.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        REACT_APP_API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '300M',
      watch: false,
      autorestart: true,
      kill_timeout: 5000,
    },
  ],

  // Cluster configurations
  deploy: {
    production: {
      user: process.env.DEPLOY_USER,
      host: process.env.DEPLOY_HOST,
      ref: 'origin/main',
      repo: process.env.REPO_URL,
      path: '/var/www/app',
      'post-deploy': 'npm install && npm run build && pm2 startOrRestart ecosystem.config.js --env production',
      'pre-deploy-local': '',
    },
    development: {
      user: process.env.DEPLOY_USER,
      host: process.env.DEPLOY_HOST,
      ref: 'origin/develop',
      repo: process.env.REPO_URL,
      path: '/var/www/app-dev',
      'post-deploy': 'npm install && npm run build && pm2 startOrRestart ecosystem.config.js --env development',
    },
  },
};
