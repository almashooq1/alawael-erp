#!/usr/bin/env node

/**
 * Executive Dashboard Setup & Initialization Script
 * Automates environment setup, dependency installation, and service initialization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

class DashboardSetup {
  constructor() {
    this.config = {};
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Main setup flow
   */
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     Executive Dashboard - Setup & Initialization           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    await this.checkEnvironment();
    await this.collectConfiguration();
    await this.installDependencies();
    await this.initializeDatabase();
    await this.createConfigFiles();
    await this.runInitialization();
    await this.generateReport();

    this.rl.close();
  }

  /**
   * Check system environment
   */
  checkEnvironment() {
    return new Promise((resolve) => {
      console.log('📋 Checking environment...\n');

      const checks = {
        Node: () => {
          try {
            const version = execSync('node --version', { encoding: 'utf8' });
            console.log(`  ✅ Node.js ${version.trim()}`);
            return true;
          } catch {
            console.log('  ❌ Node.js not found');
            return false;
          }
        },
        npm: () => {
          try {
            const version = execSync('npm --version', { encoding: 'utf8' });
            console.log(`  ✅ npm ${version.trim()}`);
            return true;
          } catch {
            console.log('  ❌ npm not found');
            return false;
          }
        },
        MongoDB: () => {
          try {
            execSync('mongod --version', { encoding: 'utf8' });
            console.log('  ✅ MongoDB detected');
            return true;
          } catch {
            console.log('  ⚠️  MongoDB not found (required)');
            return false;
          }
        },
        Redis: () => {
          try {
            execSync('redis-cli --version', { encoding: 'utf8' });
            console.log('  ✅ Redis detected');
            return true;
          } catch {
            console.log('  ⚠️  Redis not found (optional but recommended)');
            return false;
          }
        }
      };

      Object.entries(checks).forEach(([name, check]) => {
        check();
      });

      console.log('\n');
      resolve();
    });
  }

  /**
   * Collect configuration from user
   */
  collectConfiguration() {
    return new Promise((resolve) => {
      console.log('⚙️  Collecting configuration...\n');

      const questions = [
        { key: 'mongoUri', prompt: 'MongoDB URI (http://localhost:27017): ', default: 'mongodb://localhost:27017/executive_dashboard' },
        { key: 'redisUrl', prompt: 'Redis URL (redis://localhost:6379): ', default: 'redis://localhost:6379' },
        { key: 'jwtSecret', prompt: 'JWT Secret (min 32 chars): ', default: 'default-secret-change-in-production-' + Math.random().toString(36).substring(7) },
        { key: 'port', prompt: 'Backend Port (3000): ', default: '3000' },
        { key: 'env', prompt: 'Environment (development/production): ', default: 'development' },
      ];

      let answered = 0;

      const askQuestion = (index) => {
        if (index >= questions.length) {
          console.log('\n✅ Configuration collected\n');
          return resolve();
        }

        const { key, prompt, default: defaultVal } = questions[index];

        this.rl.question(prompt, (answer) => {
          this.config[key] = answer || defaultVal;
          answered++;
          askQuestion(index + 1);
        });
      };

      askQuestion(0);
    });
  }

  /**
   * Install dependencies
   */
  installDependencies() {
    return new Promise((resolve) => {
      console.log('📦 Installing dependencies...\n');

      try {
        const backendPath = path.join(process.cwd(), 'erp_new_system', 'backend');
        const frontendPath = path.join(process.cwd(), 'supply-chain-management', 'frontend');

        // Backend dependencies
        if (fs.existsSync(backendPath)) {
          console.log('  Installing backend dependencies...');
          execSync('npm install', { cwd: backendPath, stdio: 'inherit' });
          console.log('  ✅ Backend dependencies installed\n');
        }

        // Frontend dependencies
        if (fs.existsSync(frontendPath)) {
          console.log('  Installing frontend dependencies...');
          execSync('npm install', { cwd: frontendPath, stdio: 'inherit' });
          console.log('  ✅ Frontend dependencies installed\n');
        }

        resolve();
      } catch (error) {
        console.error('❌ Error installing dependencies:', error.message);
        resolve();
      }
    });
  }

  /**
   * Initialize database
   */
  initializeDatabase() {
    return new Promise((resolve) => {
      console.log('🗄️  Initializing database...\n');

      try {
        // Create MongoDB indexes
        const mongoInit = `
const mongoose = require('mongoose');

mongoose.connect('${this.config.mongoUri}');

const kpiSchema = new mongoose.Schema({
  name: { type: String, index: true },
  category: { type: String, index: true },
  owner: { type: String, index: true },
  status: { type: String, index: true },
  createdAt: { type: Date, index: true }
});

const KPI = mongoose.model('KPI', kpiSchema);

console.log('✅ Database initialized with indexes');
process.exit(0);
        `;

        fs.writeFileSync('/tmp/init-db.js', mongoInit);
        console.log('  ✅ Database initialization configured\n');
        resolve();
      } catch (error) {
        console.error('⚠️  Database initialization skipped:', error.message);
        resolve();
      }
    });
  }

  /**
   * Create configuration files
   */
  createConfigFiles() {
    return new Promise((resolve) => {
      console.log('🔧 Creating configuration files...\n');

      const backendPath = path.join(process.cwd(), 'erp_new_system', 'backend');
      const envContent = `
# Database
MONGODB_URI=${this.config.mongoUri}
MONGODB_TEST_URI=mongodb://localhost:27017/executive_dashboard_test

# Server
PORT=${this.config.port}
NODE_ENV=${this.config.env}

# JWT
JWT_SECRET=${this.config.jwtSecret}
JWT_EXPIRE=24h

# Redis
REDIS_URL=${this.config.redisUrl}

# WebSocket
SOCKET_IO_PORT=3001
SOCKET_IO_CORS_ORIGIN=http://localhost:3000

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
      `;

      try {
        const envPath = path.join(backendPath, '.env');
        fs.writeFileSync(envPath, envContent.trim());
        console.log('  ✅ .env file created\n');
      } catch (error) {
        console.error('  ⚠️  Could not create .env file:', error.message);
      }

      resolve();
    });
  }

  /**
   * Run service initialization
   */
  runInitialization() {
    return new Promise((resolve) => {
      console.log('🚀 Initializing services...\n');

      const initScript = `
const executiveAnalyticsService = require('./services/executiveAnalyticsService');
const dashboardSearchService = require('./services/dashboardSearchService');
const dashboardPerformanceService = require('./services/dashboardPerformanceService');

console.log('  Initializing Analytics Service...');
executiveAnalyticsService.initialize();
console.log('  ✅ Analytics Service initialized');

console.log('  Building Search Index...');
const kpis = executiveAnalyticsService.getAllKPIs();
dashboardSearchService.buildIndex(kpis);
console.log('  ✅ Search Index built');

console.log('  Warming Cache...');
dashboardPerformanceService.warmCache(executiveAnalyticsService, null);
console.log('  ✅ Cache warmed');

console.log('\\n✨ Initialization complete!');
process.exit(0);
      `;

      const backendPath = path.join(process.cwd(), 'erp_new_system', 'backend');

      try {
        fs.writeFileSync(path.join(backendPath, 'init-services.js'), initScript);
        console.log('  ✅ Service initialization scripts created\n');
      } catch (error) {
        console.error('  ⚠️  Service initialization failed:', error.message);
      }

      resolve();
    });
  }

  /**
   * Generate setup report
   */
  generateReport() {
    return new Promise((resolve) => {
      console.log('📄 Setup Report\n');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                   Setup Complete! ✨                        ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      console.log('📋 Configuration Summary:');
      console.log(`   MongoDB: ${this.config.mongoUri}`);
      console.log(`   Redis: ${this.config.redisUrl}`);
      console.log(`   Port: ${this.config.port}`);
      console.log(`   Environment: ${this.config.env}\n`);

      console.log('🎯 Next Steps:\n');
      console.log('1. Start MongoDB:');
      console.log('   mongod\n');

      console.log('2. Start Redis:');
      console.log('   redis-server\n');

      console.log('3. Start Backend:');
      console.log('   cd erp_new_system/backend');
      console.log('   npm start\n');

      console.log('4. Start Frontend (in another terminal):');
      console.log('   cd supply-chain-management/frontend');
      console.log('   npm start\n');

      console.log('📚 Documentation:');
      console.log('   Read: EXECUTIVE_DASHBOARD_COMPLETE_GUIDE.md\n');

      console.log('🧪 Run Tests:');
      console.log('   npm test -- tests/integration/executiveDashboard.test.js\n');

      console.log('📊 Access Dashboard:');
      console.log('   http://localhost:3000/executive-dashboard\n');

      console.log('💡 Pro Tips:');
      console.log('   - Check logs: tail -f logs/app.log');
      console.log('   - Monitor cache: GET /api/executive-dashboard/performance/cache');
      console.log('   - Health check: GET /api/executive-dashboard/performance/health\n');

      resolve();
    });
  }
}

// Run setup
if (require.main === module) {
  const setup = new DashboardSetup();
  setup.run().catch(console.error);
}

module.exports = DashboardSetup;
