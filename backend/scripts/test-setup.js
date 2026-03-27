#!/usr/bin/env node
/* eslint-disable no-unused-vars */

/**
 * 🧪 MongoDB Atlas Setup Test
 * اختبار كامل الإعداد
 */

const https = require('https');
const fs = require('fs');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class MongoDBSetupTest {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('ar-SA');
    const prefix = {
      info: `${colors.blue}ℹ${colors.reset}`,
      success: `${colors.green}✅${colors.reset}`,
      error: `${colors.red}❌${colors.reset}`,
      warning: `${colors.yellow}⚠${colors.reset}`,
    }[type];
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runTests() {
    console.log(`\n${colors.cyan}${colors.bright}🧪 MongoDB Atlas Setup Test${colors.reset}\n`);

    // Test 1: Check .env file
    this.testEnvFile();

    // Test 2: Check environment variables
    this.testEnvironmentVariables();

    // Test 3: Check MongoDB URI format
    this.testMongoURIFormat();

    // Test 4: Check if mongoose is installed
    await this.testMongooseInstallation();

    // Test 5: Try MongoDB connection
    await this.testMongoDBConnection();

    // Test 6: Test API endpoints
    await this.testAPIEndpoints();

    // Print summary
    this.printSummary();
  }

  testEnvFile() {
    this.log('Checking .env file...', 'info');
    try {
      if (fs.existsSync('.env')) {
        this.log('.env file exists', 'success');
        this.passed++;
      } else {
        this.log('.env file not found in current directory', 'error');
        this.failed++;
      }
    } catch (err) {
      this.log(`Error reading .env: ${err.message}`, 'error');
      this.failed++;
    }
  }

  testEnvironmentVariables() {
    this.log('Checking environment variables...', 'info');

    const required = ['MONGODB_URI', 'USE_MOCK_DB', 'PORT'];
    let allPresent = true;

    for (const variable of required) {
      if (process.env[variable]) {
        const value =
          variable === 'MONGODB_URI'
            ? process.env[variable].substring(0, 40) + '...'
            : process.env[variable];
        this.log(`${variable}: ${value}`, 'success');
        this.passed++;
      } else {
        this.log(`Missing environment variable: ${variable}`, 'error');
        this.failed++;
        allPresent = false;
      }
    }

    if (!allPresent) {
      this.log('Run: npm install && npm start', 'warning');
    }
  }

  testMongoURIFormat() {
    this.log('Validating MongoDB URI format...', 'info');

    const uri = process.env.MONGODB_URI;
    const isAtlasURI = uri.includes('mongodb+srv://');
    const isLocalURI = uri.includes('mongodb://localhost');

    if (isAtlasURI) {
      this.log('✓ Using MongoDB Atlas (cloud)', 'success');

      // Check credentials
      if (uri.includes('alawael_admin')) {
        this.log('✓ Username found: alawael_admin', 'success');
        this.passed++;
      } else {
        this.log('✗ Username not found (expected: alawael_admin)', 'warning');
      }

      if (uri.includes('alawael-erp')) {
        this.log('✓ Database name: alawael-erp', 'success');
        this.passed++;
      } else {
        this.log('✗ Database name not found', 'warning');
      }
    } else if (isLocalURI) {
      this.log('Using local MongoDB', 'warning');
      this.log('For production, use MongoDB Atlas instead', 'warning');
      this.passed++;
    } else {
      this.log('Invalid MongoDB URI format', 'error');
      this.failed++;
    }
  }

  async testMongooseInstallation() {
    this.log('Checking mongoose installation...', 'info');

    try {
      const mongoose = require('mongoose');
      this.log(`✓ Mongoose v${mongoose.version} installed`, 'success');
      this.passed++;
    } catch (err) {
      this.log('Mongoose not installed. Run: npm install mongoose', 'error');
      this.failed++;
    }
  }

  async testMongoDBConnection() {
    this.log('Testing MongoDB connection...', 'info');

    try {
      const mongoose = require('mongoose');

      const connection = await Promise.race([
        mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 5000,
        }),
        new Promise((_, reject) => { setTimeout(() => reject(new Error('Connection timeout')), 6000); }),
      ]);

      this.log('✓ Successfully connected to MongoDB', 'success');

      // Get database stats
      const db = mongoose.connection.db;
      const stats = await db.stats();

      this.log(`Database: ${stats.db}`, 'success');
      this.log(`Collections: ${stats.collections}`, 'success');
      this.log(`Data Size: ${(stats.dataSize / 1024).toFixed(2)} KB`, 'success');

      // List collections
      const collections = await db.listCollections().toArray();
      if (collections.length > 0) {
        this.log(`Found ${collections.length} collections:`, 'info');
        for (const col of collections) {
          const count = await db.collection(col.name).countDocuments();
          this.log(`  - ${col.name}: ${count} documents`, 'success');
        }
        this.passed += 3;
      } else {
        this.log('No collections found. Run: node scripts\\seed.js', 'warning');
        this.passed += 2;
      }

      await mongoose.disconnect();
    } catch (err) {
      this.log(`Connection failed: ${err.message}`, 'error');

      if (err.message.includes('authentication failed')) {
        this.log('Check: Username and password in .env', 'warning');
      }

      if (err.message.includes('MongooseServerSelectionError')) {
        this.log('Check: Network Access in MongoDB Atlas (0.0.0.0/0)', 'warning');
      }

      this.failed++;
    }
  }

  async testAPIEndpoints() {
    this.log('Testing API endpoints...', 'info');

    const endpoints = [
      { path: '/api/organizations', expected: 'organizations' },
      { path: '/api/employees', expected: 'employees' },
    ];

    for (const endpoint of endpoints) {
      try {
        const data = await this.fetchAPI(`http://localhost:3001${endpoint.path}`);
        if (data && data.success) {
          this.log(`✓ ${endpoint.path} - OK`, 'success');
          this.passed++;
        } else {
          this.log(`✗ ${endpoint.path} - No data`, 'warning');
        }
      } catch (err) {
        if (err.code === 'ECONNREFUSED') {
          this.log(`✗ ${endpoint.path} - Server not running (start with: npm start)`, 'warning');
        } else {
          this.log(`✗ ${endpoint.path} - ${err.message}`, 'warning');
        }
      }
    }
  }

  fetchAPI(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url.replace('http://', 'http://'), res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(3000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  printSummary() {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(
      `${colors.green}✅ PASSED: ${this.passed}${colors.reset}  |  ${colors.red}❌ FAILED: ${this.failed}${colors.reset}`
    );
    console.log(`${'═'.repeat(50)}\n`);

    if (this.failed === 0) {
      console.log(
        `${colors.green}${colors.bright}🎉 All tests passed! Ready to go!${colors.reset}\n`
      );
      console.log('Next steps:');
      console.log('  1. npm start (Backend)');
      console.log('  2. cd frontend && npm start (Frontend)');
      console.log('  3. Open: http://localhost:3002\n');
    } else {
      console.log(`${colors.yellow}Some tests failed. Check the messages above.${colors.reset}\n`);
      console.log('Common fixes:');
      console.log('  • Update .env with MongoDB Atlas connection string');
      console.log('  • Add IP address (0.0.0.0/0) in MongoDB Atlas Network Access');
      console.log('  • Run: node scripts\\seed.js to import data');
      console.log('  • Verify internet connection\n');
    }
  }
}

// Run tests
const tester = new MongoDBSetupTest();
tester.runTests().catch(console.error);
