// PM2 Ecosystem Configuration
// نظام الأوائل ERP - Hostinger VPS
module.exports = {
  apps: [
    {
      name: 'alawael-api',
      script: './server.js',
      cwd: '/home/alawael/app/backend',
      instances: 2, // عدد النسخ (غيّر حسب عدد CPU cores)
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/home/alawael/logs/api-error.log',
      out_file: '/home/alawael/logs/api-out.log',
      merge_logs: true,
      log_type: 'json',

      // Restart policy
      max_restarts: 10,
      restart_delay: 4000,
      autorestart: true,
      exp_backoff_restart_delay: 100,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
    },
  ],
};
