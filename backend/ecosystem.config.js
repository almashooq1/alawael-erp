// Load .env BEFORE the apps[].env block is evaluated, so process.env.*
// references below resolve to real values (Redis password, DB URI, etc.).
// PM2 itself does NOT auto-load .env; without this, secrets are empty
// strings and the app boots in `degraded` mode (Wave 195 deploy postmortem).
try {
  require('dotenv').config({ path: __dirname + '/.env' });
} catch (_e) {
  // dotenv is a regular dep; if missing, fall through and rely on shell env.
}

module.exports = {
  apps: [
    {
      name: 'alawael-api',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DISABLE_REDIS: 'false',
        REDIS_ENABLED: 'true',
        // Redis credentials MUST be set via .env or secrets manager — never hardcode
        REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
        REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
        REDIS_PORT: process.env.REDIS_PORT || '6379',
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
        REDIS_DB: '0',
        REDIS_TLS: 'false',
        USE_MOCK_CACHE: 'false',
        AUTO_MIGRATE: 'false',
      },
      error_file: '/home/alawael/logs/api-error.log',
      out_file: '/home/alawael/logs/api-out.log',
      merge_logs: true,
      max_memory_restart: '1500M',
      watch: false,
      max_restarts: 50,
      min_uptime: '30s',
      autorestart: true,
      kill_timeout: 35000,
      listen_timeout: 90000,
      wait_ready: true,
      node_args: '--max-old-space-size=1024',
    },
  ],
};
