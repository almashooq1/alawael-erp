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

      // Number of instances (max = number of CPU cores)
      instances: 'max',

      // Execution mode (cluster for multi-process, fork for single)
      exec_mode: 'cluster',

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Log files
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',

      // Log timestamp format
      time_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Merge logs from all instances
      merge_logs: true,

      // Maximum memory before restart (500MB)
      max_memory_restart: '500M',

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

      // Cron expression for scheduled restart (daily at midnight)
      cron_restart: '0 0 * * *',

      // Time to kill process after sending SIGTERM (5 seconds)
      kill_timeout: 5000,

      // Time to wait for app to start before considering it dead
      listen_timeout: 10000,

      // Allow process manager to listen on message events
      shutdown_with_message: true,

      // Max concurrent clients
      max_clients: null,

      // Delay between restart attempts (exponential backoff)
      wait_ready: false,

      // Amount of memory to pretend the app takes for priority in cluster mode
      pmx: false,

      // Application arguments
      args: '',

      // Additional node arguments
      node_args: '--max-old-space-size=1024',

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
      user: 'cpanel_username',
      host: 'yourdomain.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/alawael-backend.git',
      path: '/home/cpanel_username/public_html/backend',
      'post-deploy': 'npm ci --only=production && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production..."',
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
