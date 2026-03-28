/* eslint-disable no-unused-vars */
/**
 * PM2 Ecosystem Configuration
 *
 * This file configures PM2 (Process Manager) for running the AlAwael ERP Backend
 * in production on Hostinger.
 *
 * Usage:
 * - pm2 start ecosystem.config.js
 * - pm2 restart ecosystem.config.js
 * - pm2 stop ecosystem.config.js
 * - pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      // Application identifier
      name: 'alawael-backend',

      // Script to run
      script: './server.js',

      // Number of instances (max = number of CPU cores, 0 = auto-detect)
      instances: process.env.PM2_INSTANCES || 2,

      // Execution mode (cluster for multi-process, fork for single)
      exec_mode: 'cluster',

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Log files
      error_file: '/home/alawael/logs/api-error.log',
      out_file: '/home/alawael/logs/api-out.log',
      log_file: '/home/alawael/logs/api-combined.log',

      // Log timestamp format
      time_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Merge logs from all instances
      merge_logs: true,

      // Maximum memory before restart (1.5GB — headroom above 1024MB heap)
      max_memory_restart: '1500M',

      // Don't watch files for changes in production
      watch: false,

      // Ignore these directories when watching
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups', 'cache'],

      // Maximum number of restart attempts
      max_restarts: 10,

      // Minimum uptime required before auto-restart
      min_uptime: '10s',

      // Auto-restart crashed process
      autorestart: true,

      // Cron restart disabled — max_memory_restart handles instability
      // cron_restart: '0 0 * * *',

      // Time to kill process after sending SIGTERM
      // MUST be >= gracefulShutdown.js FORCE_TIMEOUT (30s) + buffer
      // to allow in-flight requests and DB connections to close cleanly
      kill_timeout: 35000,

      // Time to wait for app to start before considering it dead
      listen_timeout: 10000,

      // Wait for process.send('ready') before considering app online
      // Enables zero-downtime reload in cluster mode
      wait_ready: true,

      // Allow process manager to listen on message events
      shutdown_with_message: true,

      // Max concurrent clients
      max_clients: null,

      // Disable PM2 built-in monitoring (use custom APM instead)
      pmx: false,

      // Application arguments
      args: '',

      // Node heap = 1024MB (aligned with Dockerfile, < PM2 1.5G limit)
      node_args: '--max-old-space-size=1024 --enable-source-maps',

      // Ignore changes to these files when restarting
      ignore_files: ['.git', '.gitignore', 'README.md', '.env.example', 'package-lock.json'],
    },
  ],

  /**
   * Deployment configuration
   * Can be used for automated deployments
   */
  deploy: {
    production: {
      user: process.env.DEPLOY_USER || 'alawael',
      host: process.env.DEPLOY_HOST || '72.60.84.56',
      ref: 'origin/main',
      repo: 'git@github.com:almashooq1/alawael-erp.git',
      path: process.env.DEPLOY_PATH || '/home/alawael/app',
      'post-deploy':
        'cd backend && npm ci --only=production && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production..."',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};

/**
 * Commands to use:
 *
 * Start:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --name "alawael-backend"
 *
 * Stop:
 *   pm2 stop ecosystem.config.js
 *   pm2 stop alawael-backend
 *
 * Restart:
 *   pm2 restart ecosystem.config.js
 *   pm2 reload ecosystem.config.js (zero-downtime)
 *
 * Delete:
 *   pm2 delete ecosystem.config.js
 *   pm2 delete alawael-backend
 *
 * Status:
 *   pm2 status
 *   pm2 monit
 *
 * Logs:
 *   pm2 logs alawael-backend
 *   pm2 logs alawael-backend --lines 100
 *   pm2 logs alawael-backend --err
 *
 * Setup auto-start:
 *   pm2 startup
 *   pm2 save
 *
 * Deploy with git:
 *   pm2 deploy ecosystem.config.js production
 *
 * Scale up/down:
 *   pm2 scale alawael-backend 2
 */
