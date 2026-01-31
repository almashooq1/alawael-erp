#!/usr/bin/env node

/**
 * Cache Clearing Utility
 * أداة مسح الذاكرة المؤقتة
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Try to load Redis client
let redisClient;
try {
  const { getRedisClient } = require('../config/redis');
  redisClient = getRedisClient();
} catch (error) {
  console.warn('⚠️  Redis not configured, skipping Redis cache clear');
}

/**
 * Clear all cache entries
 */
async function clearAllCache() {
  console.log('🧹 Starting cache clearing process...\n');

  try {
    // Clear Redis cache
    if (redisClient && typeof redisClient.flushdb === 'function') {
      console.log('📦 Clearing Redis cache...');
      await redisClient.flushdb();
      console.log('✅ Redis cache cleared successfully\n');
    } else if (redisClient && typeof redisClient.flushDb === 'function') {
      console.log('📦 Clearing Redis cache...');
      await redisClient.flushDb();
      console.log('✅ Redis cache cleared successfully\n');
    }

    // Clear memory cache stats (if middleware is loaded)
    try {
      const { resetCacheStats } = require('../middleware/cache.middleware');
      resetCacheStats();
      console.log('📊 Cache statistics reset\n');
    } catch (error) {
      console.log('ℹ️  Cache statistics not available\n');
    }

    console.log('✨ Cache clearing complete!\n');
    console.log('📋 Summary:');
    console.log('   - Redis cache: Cleared');
    console.log('   - Memory cache stats: Reset');
    console.log('   - Application cache: Ready for fresh data\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
    process.exit(1);
  }
}

/**
 * Clear cache by pattern
 */
async function clearCacheByPattern(pattern) {
  console.log(`🎯 Clearing cache entries matching: ${pattern}\n`);

  try {
    if (!redisClient) {
      console.error('❌ Redis client not available');
      process.exit(1);
    }

    // Get all keys matching pattern
    const keys = await redisClient.keys(pattern);
    console.log(`📦 Found ${keys.length} keys matching pattern\n`);

    if (keys.length === 0) {
      console.log('ℹ️  No keys to delete\n');
      process.exit(0);
    }

    // Delete keys in batches
    const batchSize = 100;
    let deleted = 0;

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      if (redisClient.del) {
        await redisClient.del(...batch);
      } else if (redisClient.unlink) {
        await redisClient.unlink(...batch);
      }
      deleted += batch.length;
      console.log(`   Progress: ${deleted}/${keys.length} keys deleted`);
    }

    console.log(`\n✅ Successfully deleted ${deleted} cache entries\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing cache by pattern:', error.message);
    process.exit(1);
  }
}

/**
 * Display cache statistics
 */
async function showCacheStats() {
  console.log('📊 Cache Statistics\n');
  console.log('═══════════════════════════════════════\n');

  try {
    // Redis stats
    if (redisClient) {
      try {
        const info = await redisClient.info('stats');
        const memory = await redisClient.info('memory');
        const keyspace = await redisClient.info('keyspace');

        console.log('📦 Redis Cache:');
        console.log('─────────────────────────────────────');

        // Parse info strings
        const parseInfo = infoStr => {
          const lines = infoStr.split('\r\n');
          const data = {};
          lines.forEach(line => {
            const [key, value] = line.split(':');
            if (key && value) {
              data[key] = value;
            }
          });
          return data;
        };

        const stats = parseInfo(info);
        const memStats = parseInfo(memory);
        const ksStats = parseInfo(keyspace);

        // Display key metrics
        console.log(`   Total Connections: ${stats.total_connections_received || 'N/A'}`);
        console.log(`   Total Commands:    ${stats.total_commands_processed || 'N/A'}`);
        console.log(`   Keyspace Hits:     ${stats.keyspace_hits || '0'}`);
        console.log(`   Keyspace Misses:   ${stats.keyspace_misses || '0'}`);

        // Calculate hit rate
        const hits = parseInt(stats.keyspace_hits) || 0;
        const misses = parseInt(stats.keyspace_misses) || 0;
        const total = hits + misses;
        const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';
        console.log(`   Hit Rate:          ${hitRate}%`);

        // Memory usage
        const usedMemory = parseInt(memStats.used_memory) || 0;
        const usedMemoryMB = (usedMemory / 1024 / 1024).toFixed(2);
        console.log(`   Memory Used:       ${usedMemoryMB} MB`);

        // Key count from keyspace
        let totalKeys = 0;
        Object.keys(ksStats).forEach(db => {
          if (db.startsWith('db')) {
            const match = ksStats[db].match(/keys=(\\d+)/);
            if (match) {
              totalKeys += parseInt(match[1]);
            }
          }
        });
        console.log(`   Total Keys:        ${totalKeys}`);

        console.log('\n');
      } catch (error) {
        console.log('   Status: Unable to retrieve stats');
        console.log(`   Error: ${error.message}\n`);
      }
    } else {
      console.log('📦 Redis Cache: Not configured\n');
    }

    // Memory cache stats
    try {
      const { getCacheStats } = require('../middleware/cache.middleware');
      const memStats = getCacheStats();

      console.log('💾 Memory Cache:');
      console.log('─────────────────────────────────────');
      console.log(`   Cache Hits:        ${memStats.hits}`);
      console.log(`   Cache Misses:      ${memStats.misses}`);
      console.log(`   Hit Rate:          ${memStats.getHitRate()}%`);
      console.log(`   Total Requests:    ${memStats.hits + memStats.misses}`);
      console.log('\n');
    } catch (error) {
      console.log('💾 Memory Cache: Stats not available\n');
    }

    console.log('═══════════════════════════════════════\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error retrieving cache stats:', error.message);
    process.exit(1);
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  console.log(`
🧹 Cache Clearing Utility
─────────────────────────────────────

Usage:
  node scripts/clear-cache.js [command] [options]

Commands:
  all                   Clear all cache entries
  pattern <pattern>     Clear cache entries matching pattern
  stats                 Display cache statistics
  help                  Show this help message

Examples:
  node scripts/clear-cache.js all
  node scripts/clear-cache.js pattern "user:*"
  node scripts/clear-cache.js stats

Notes:
  - Requires Redis to be configured for full functionality
  - Use patterns carefully to avoid deleting important data
  - Statistics show both Redis and memory cache metrics
`);
  process.exit(0);
}

// Execute command
switch (command) {
  case 'all':
    clearAllCache();
    break;
  case 'pattern':
    if (!args[1]) {
      console.error('❌ Error: Pattern argument required');
      console.log('Usage: node scripts/clear-cache.js pattern "user:*"\n');
      process.exit(1);
    }
    clearCacheByPattern(args[1]);
    break;
  case 'stats':
    showCacheStats();
    break;
  default:
    console.error(`❌ Unknown command: ${command}`);
    console.log('Run with "help" for usage information\n');
    process.exit(1);
}
