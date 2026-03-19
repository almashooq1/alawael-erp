#!/usr/bin/env node

// Quick database and Redis connection test

const env = require('./config/database.js'); // Just to check if module loads
const redis = require('ioredis');

console.log('🧪 Testing Week 2 Infrastructure Connections...\n');

// Test PostgreSQL
console.log('1️⃣  PostgreSQL Connection Test:');
console.log('   Host:', process.env.DB_PRIMARY_HOST || 'localhost');
console.log('   Port:', process.env.DB_PRIMARY_PORT || '5432');
console.log('   Database:', process.env.DB_PRIMARY_DATABASE || 'alawael_erp');
console.log('   User:', process.env.DB_PRIMARY_USER || 'alawael_user');

const { Client } = require('pg');
const pgClient = new Client({
  host: process.env.DB_PRIMARY_HOST || 'localhost',
  port: process.env.DB_PRIMARY_PORT || 5432,
  database: process.env.DB_PRIMARY_DATABASE || 'alawael_erp',
  user: process.env.DB_PRIMARY_USER || 'alawael_user',
  password: process.env.DB_PRIMARY_PASSWORD || 'alawael_secure_password',
  statement_timeout: 5000,
});

pgClient.connect(err => {
  if (err) {
    console.log('   ❌ Error:', err.message);
    process.exit(1);
  }
  console.log('   ✅ Connected!');
  pgClient.query('SELECT 1', (err, res) => {
    if (err) {
      console.log('   ❌ Query Error:', err.message);
    } else {
      console.log('   ✅ Query successful');
    }
    pgClient.end();

    // Test Redis
    console.log('\n2️⃣  Redis Connection Test:');
    const redisClient = new redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retryStrategy: () => {
        throw new Error('Redis unavailable');
      },
    });

    redisClient.ping((err, res) => {
      if (err) {
        console.log('   ❌ Error:', err.message);
      } else {
        console.log('   ✅ PONG received!');
      }
      redisClient.disconnect();
      console.log('\n✅ All tests complete');
      process.exit(0);
    });
  });
});
