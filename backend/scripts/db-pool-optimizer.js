#!/usr/bin/env node

/**
 * Database Connection Pool Optimizer
 * مُحسِّن مجموعة الاتصالات بقاعدة البيانات
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Database Connection Pool Configuration
 */
class DBPoolOptimizer {
  constructor() {
    this.configs = {
      mongodb: {
        development: {
          minPoolSize: 2,
          maxPoolSize: 10,
          maxIdleTimeMS: 45000,
          waitQueueTimeoutMS: 10000,
          description: 'Development: Minimal connections to save resources',
        },
        staging: {
          minPoolSize: 5,
          maxPoolSize: 20,
          maxIdleTimeMS: 60000,
          waitQueueTimeoutMS: 15000,
          description: 'Staging: Balanced for testing',
        },
        production: {
          minPoolSize: 10,
          maxPoolSize: 100,
          maxIdleTimeMS: 30000,
          waitQueueTimeoutMS: 5000,
          description: 'Production: High performance, ready for load',
        },
      },
      redis: {
        development: {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          enableOfflineQueue: true,
          retryStrategy: 'exponential',
          description: 'Development: Resilient for local testing',
        },
        staging: {
          maxRetriesPerRequest: 5,
          enableReadyCheck: true,
          enableOfflineQueue: true,
          retryStrategy: 'exponential',
          description: 'Staging: More resilient',
        },
        production: {
          maxRetriesPerRequest: 10,
          enableReadyCheck: false,
          enableOfflineQueue: false,
          retryStrategy: 'adaptive',
          description: 'Production: High availability',
        },
      },
    };
  }

  /**
   * Get optimal configuration for environment
   */
  getOptimalConfig(database = 'mongodb', env = process.env.NODE_ENV || 'development') {
    const config = this.configs[database]?.[env];

    if (!config) {
      return {
        error: `Configuration not found for ${database} in ${env}`,
        available: Object.keys(this.configs[database] || {}),
      };
    }

    return config;
  }

  /**
   * Generate MongoDB connection string with pool settings
   */
  generateMongoDBURI(baseUri = process.env.MONGODB_URI, env = process.env.NODE_ENV) {
    const config = this.getOptimalConfig('mongodb', env);

    if (config.error) {
      return { error: config.error };
    }

    const params = new URLSearchParams({
      minPoolSize: config.minPoolSize,
      maxPoolSize: config.maxPoolSize,
      maxIdleTimeMS: config.maxIdleTimeMS,
      waitQueueTimeoutMS: config.waitQueueTimeoutMS,
      retryWrites: true,
      w: 'majority',
    });

    const separator = baseUri.includes('?') ? '&' : '?';
    return `${baseUri}${separator}${params.toString()}`;
  }

  /**
   * Generate Redis configuration object
   */
  generateRedisConfig(env = process.env.NODE_ENV) {
    const config = this.getOptimalConfig('redis', env);

    if (config.error) {
      return { error: config.error };
    }

    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      db: parseInt(process.env.REDIS_DB || '0'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      enableReadyCheck: config.enableReadyCheck,
      enableOfflineQueue: config.enableOfflineQueue,
      retryStrategy: times => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: err => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    };
  }

  /**
   * Display configuration recommendations
   */
  displayRecommendations(env = process.env.NODE_ENV || 'development') {
    console.log('\n📊 Database Connection Pool Recommendations\n');
    console.log('═'.repeat(70));
    console.log(`Environment: ${env.toUpperCase()}`);
    console.log('═'.repeat(70));
    console.log('');

    // MongoDB recommendations
    console.log('🍃 MongoDB Configuration:');
    console.log('─'.repeat(70));
    const mongoConfig = this.getOptimalConfig('mongodb', env);
    console.log(`Description: ${mongoConfig.description}`);
    console.log(`Min Pool Size:        ${mongoConfig.minPoolSize}`);
    console.log(`Max Pool Size:        ${mongoConfig.maxPoolSize}`);
    console.log(`Max Idle Time:        ${mongoConfig.maxIdleTimeMS}ms`);
    console.log(`Wait Queue Timeout:   ${mongoConfig.waitQueueTimeoutMS}ms`);
    console.log('');

    // Recommended URI
    console.log('Connection String:');
    const mongoUri = this.generateMongoDBURI(process.env.MONGODB_URI, env);
    console.log(`  ${mongoUri}`);
    console.log('');

    // Redis recommendations
    console.log('🔴 Redis Configuration:');
    console.log('─'.repeat(70));
    const redisConfig = this.getOptimalConfig('redis', env);
    console.log(`Description: ${redisConfig.description}`);
    console.log(`Max Retries Per Request: ${redisConfig.maxRetriesPerRequest}`);
    console.log(`Enable Ready Check:      ${redisConfig.enableReadyCheck}`);
    console.log(`Enable Offline Queue:    ${redisConfig.enableOfflineQueue}`);
    console.log(`Retry Strategy:          ${redisConfig.retryStrategy}`);
    console.log('');

    // Recommended config object
    console.log('Recommended Configuration:');
    const redisConf = this.generateRedisConfig(env);
    console.log(JSON.stringify(redisConf, null, 2));
    console.log('');

    // Performance tuning tips
    console.log('⚡ Performance Tuning Tips:');
    console.log('─'.repeat(70));

    if (env === 'development') {
      console.log('✓ Keep pool sizes small to save memory');
      console.log('✓ Use longer idle timeouts for development');
      console.log('✓ Enable retry mechanisms for resilience');
    } else if (env === 'staging') {
      console.log('✓ Gradually increase pool sizes for testing');
      console.log('✓ Monitor connection usage patterns');
      console.log('✓ Test failure scenarios');
    } else if (env === 'production') {
      console.log('✓ Monitor connection pool metrics continuously');
      console.log('✓ Set up alerts for pool exhaustion');
      console.log('✓ Use adaptive retry strategies');
      console.log('✓ Implement connection pooling at application level');
      console.log('✓ Regular cleanup of idle connections');
    }

    console.log('');
    console.log('═'.repeat(70));
    console.log('');
  }

  /**
   * Generate environment variables
   */
  generateEnvVars(env = process.env.NODE_ENV || 'development') {
    console.log(`\n📝 Environment Variables for ${env.toUpperCase()}\n`);
    console.log('═'.repeat(70));

    const mongoConfig = this.getOptimalConfig('mongodb', env);
    const redisConfig = this.getOptimalConfig('redis', env);

    const envVars = `
# MongoDB Connection Pool
MONGODB_MIN_POOL_SIZE=${mongoConfig.minPoolSize}
MONGODB_MAX_POOL_SIZE=${mongoConfig.maxPoolSize}
MONGODB_MAX_IDLE_TIME_MS=${mongoConfig.maxIdleTimeMS}
MONGODB_WAIT_QUEUE_TIMEOUT_MS=${mongoConfig.waitQueueTimeoutMS}

# Redis Connection Pool
REDIS_MAX_RETRIES=${redisConfig.maxRetriesPerRequest}
REDIS_ENABLE_READY_CHECK=${redisConfig.enableReadyCheck}
REDIS_ENABLE_OFFLINE_QUEUE=${redisConfig.enableOfflineQueue}
`;

    console.log(envVars);
    console.log('═'.repeat(70));
  }
}

// CLI interface
const optimizer = new DBPoolOptimizer();
const command = process.argv[2];
const env = process.argv[3] || process.env.NODE_ENV || 'development';

if (!command || command === 'help' || command === '--help') {
  console.log(`
🗄️  Database Connection Pool Optimizer
═════════════════════════════════════════

Usage:
  node scripts/db-pool-optimizer.js [command] [environment]

Commands:
  recommend [env]    Show recommendations for environment
  envvars [env]      Generate environment variables
  config [env]       Get configuration object
  help               Show this help message

Environments:
  development
  staging
  production

Examples:
  node scripts/db-pool-optimizer.js recommend development
  node scripts/db-pool-optimizer.js recommend production
  node scripts/db-pool-optimizer.js envvars staging
  node scripts/db-pool-optimizer.js config production

Notes:
  - Default environment: ${process.env.NODE_ENV || 'development'}
  - Configurations are optimized for each environment
  - Use 'envvars' output to update your .env file
`);
  process.exit(0);
}

switch (command) {
  case 'recommend':
    optimizer.displayRecommendations(env);
    break;
  case 'envvars':
    optimizer.generateEnvVars(env);
    break;
  case 'config':
    console.log('\n📋 Full Configuration:\n');
    console.log('═'.repeat(70));
    console.log('MongoDB:');
    console.log(JSON.stringify(optimizer.getOptimalConfig('mongodb', env), null, 2));
    console.log('\nRedis:');
    console.log(JSON.stringify(optimizer.getOptimalConfig('redis', env), null, 2));
    console.log('═'.repeat(70));
    console.log('');
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    console.log('Run with "help" for usage information\n');
    process.exit(1);
}

module.exports = { DBPoolOptimizer, optimizer };
