#!/usr/bin/env node
/**
 * setup-dev.js — Development Environment Setup Wizard
 * ═══════════════════════════════════════════════════════
 * Checks for required services (MongoDB, Redis) and guides the user.
 * Run: node scripts/setup-dev.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logger = console;
const ENV_PATH = path.join(__dirname, '..', '.env');
const ENV_DEV_PATH = path.join(__dirname, '..', '.env.development');

const ENV_TEMPLATE = `# Al-Awael ERP — Development Environment Variables
# ═══════════════════════════════════════════════════════════════
# Copy this file to .env and fill in your values:
#   cp .env.development .env
#
# ─── Server ────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001

# ─── Database ──────────────────────────────────────────────────
# Option A: Local MongoDB (recommended for development)
# MONGODB_URI=mongodb://localhost:27017/alawael-erp
#
# Option B: MongoDB Atlas (cloud)
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/alawael-erp
#
# Option C: Use in-memory MongoDB (no persistence, data lost on restart)
# USE_MOCK_DB=true

# ─── Redis ─────────────────────────────────────────────────────
# Redis is REQUIRED for caching, sessions, and rate limiting.
# Option A: Local Redis (recommended for development)
# REDIS_URL=redis://localhost:6379
# REDIS_ENABLED=true
#
# Option B: Redis Cloud (Upstash, RedisLabs, etc.)
# REDIS_URL=redis://default:password@host:port
# REDIS_ENABLED=true
#
# Option C: Disable Redis (degraded performance, no sessions)
# REDIS_ENABLED=false

# ─── Authentication ────────────────────────────────────────────
JWT_SECRET=dev-jwt-secret-change-me-in-production-32-chars-long
JWT_REFRESH_SECRET=dev-refresh-secret-change-me-too-32-chars
JWT_EXPIRES_IN=24h

# ─── Encryption ────────────────────────────────────────────────
ENCRYPTION_KEY=dev-encryption-key-32-chars-long
SESSION_SECRET=dev-session-secret-16-chars

# ─── CORS ──────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
FRONTEND_URL=http://localhost:3000

# ─── External Services (optional) ──────────────────────────────
# STRIPE_SECRET_KEY=sk_test_...
# TWILIO_ACCOUNT_SID=AC...
# TWILIO_AUTH_TOKEN=...
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# ─── Feature Flags ─────────────────────────────────────────────
ENABLE_SWAGGER=true
CSRF_DISABLE=true
MFA_ENABLED=false

# ─── Monitoring (optional) ─────────────────────────────────────
# OTEL_ENABLED=true
`;

function checkService(command, name, installUrl) {
  try {
    execSync(command, { stdio: 'ignore' });
    logger.log(`  ✅ ${name} is installed`);
    return true;
  } catch {
    logger.log(`  ❌ ${name} is NOT installed`);
    logger.log(`     📖 Install: ${installUrl}`);
    return false;
  }
}

function checkPort(port, name) {
  try {
    execSync(`lsof -i :${port} > /dev/null 2>&1 || netstat -ano | grep :${port} > /dev/null 2>&1`);
    logger.log(`  ✅ ${name} is running on port ${port}`);
    return true;
  } catch {
    logger.log(`  ❌ ${name} is NOT running on port ${port}`);
    return false;
  }
}

async function main() {
  logger.log('\n╔══════════════════════════════════════════════════════════════╗');
  logger.log('║  Al-Awael ERP — Development Environment Setup                ║');
  logger.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 1. Check Node.js version
  const nodeVersion = process.version;
  logger.log(`Node.js version: ${nodeVersion}`);
  const major = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (major < 20) {
    logger.log('  ⚠️  Node.js 20+ is recommended (current: ' + nodeVersion + ')');
  }

  // 2. Check required services
  logger.log('\n📦 Checking required services...');
  const _mongoInstalled = checkService(
    'mongod --version 2>/dev/null || mongosh --version 2>/dev/null',
    'MongoDB',
    'https://www.mongodb.com/docs/manual/installation/'
  );
  const _redisInstalled = checkService(
    'redis-cli --version 2>/dev/null || redis-server --version 2>/dev/null',
    'Redis',
    'https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/'
  );

  // 3. Check running services
  logger.log('\n🔄 Checking running services...');
  const mongoRunning = checkPort(27017, 'MongoDB');
  const redisRunning = checkPort(6379, 'Redis');

  // 4. Check .env file
  logger.log('\n📄 Checking environment file...');
  if (fs.existsSync(ENV_PATH)) {
    logger.log(`  ✅ .env file exists at ${ENV_PATH}`);
    const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    const hasMongo = envContent.includes('MONGODB_URI=');
    const hasRedis = envContent.includes('REDIS_URL=');
    if (!hasMongo) logger.log('  ⚠️  MONGODB_URI not found in .env');
    if (!hasRedis) logger.log('  ⚠️  REDIS_URL not found in .env');
  } else {
    logger.log(`  ❌ .env file NOT found at ${ENV_PATH}`);
    logger.log(`  📄 Creating ${ENV_DEV_PATH} template...`);
    fs.writeFileSync(ENV_DEV_PATH, ENV_TEMPLATE);
    logger.log(`  ✅ Template created: ${ENV_DEV_PATH}`);
    logger.log(`  📋 Copy it: cp .env.development .env`);
  }

  // 5. Summary
  logger.log('\n' + '═'.repeat(64));
  logger.log('  SUMMARY');
  logger.log('═'.repeat(64));

  if (mongoRunning && redisRunning) {
    logger.log('  ✅ All services are running!');
    logger.log('  📋 Next steps:');
    logger.log('     1. Ensure .env has MONGODB_URI and REDIS_URL');
    logger.log('     2. Run: npm run dev');
  } else if (!mongoRunning && !redisRunning) {
    logger.log('  ❌ MongoDB and Redis are not running');
    logger.log('  📋 Options:');
    logger.log('     A. Start services locally:');
    logger.log('        mongod --dbpath /data/db');
    logger.log('        redis-server');
    logger.log('     B. Use Docker (recommended):');
    logger.log('        docker-compose -f docker-compose.streamlined.yml up -d mongodb redis');
    logger.log('     C. Use in-memory fallback (data lost on restart):');
    logger.log('        Set USE_MOCK_DB=true in .env');
  } else {
    logger.log('  ⚠️  Some services are missing');
    if (!mongoRunning) logger.log('     ❌ MongoDB not running');
    if (!redisRunning) logger.log('     ❌ Redis not running');
  }

  logger.log('\n');
}

main().catch(err => {
  logger.error('Setup failed:', err.message);
  process.exit(1);
});
