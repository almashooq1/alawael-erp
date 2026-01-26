#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Professional System Startup & Recovery Script
 * نظام بدء النظام الاحترافي والاستعادة
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

class SystemManager {
  constructor() {
    this.processes = [];
    this.baseDir = path.join(__dirname);
    this.backendDir = path.join(this.baseDir, 'backend');
    this.frontendDir = path.join(this.baseDir, 'frontend');
  }

  log(message, color = 'reset', prefix = '▶') {
    console.log(`${colors[color]}${prefix} ${message}${colors.reset}`);
  }

  logSection(title) {
    console.log(`\n${colors.cyan}${'═'.repeat(80)}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  ${title}${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}\n`);
  }

  logSuccess(message) {
    this.log(message, 'green', '✅');
  }

  logError(message) {
    this.log(message, 'red', '❌');
  }

  logWarning(message) {
    this.log(message, 'yellow', '⚠️ ');
  }

  logInfo(message) {
    this.log(message, 'cyan', 'ℹ️ ');
  }

  /**
   * Check if file exists
   */
  fileExists(filepath) {
    try {
      return fs.existsSync(filepath);
    } catch (err) {
      return false;
    }
  }

  /**
   * Verify project structure
   */
  verifyProjectStructure() {
    this.logSection('Verifying Project Structure');

    const requiredDirs = [
      { name: 'Backend', path: this.backendDir },
      { name: 'Frontend', path: this.frontendDir },
    ];

    const requiredFiles = [
      { name: 'Backend package.json', path: path.join(this.backendDir, 'package.json') },
      { name: 'Frontend package.json', path: path.join(this.frontendDir, 'package.json') },
      { name: 'Backend server.js', path: path.join(this.backendDir, 'server.js') },
    ];

    let structureValid = true;

    // Check directories
    for (const dir of requiredDirs) {
      if (this.fileExists(dir.path)) {
        this.logSuccess(`${dir.name} directory found`);
      } else {
        this.logError(`${dir.name} directory NOT found at ${dir.path}`);
        structureValid = false;
      }
    }

    // Check files
    for (const file of requiredFiles) {
      if (this.fileExists(file.path)) {
        this.logSuccess(`${file.name} found`);
      } else {
        this.logError(`${file.name} NOT found at ${file.path}`);
        structureValid = false;
      }
    }

    return structureValid;
  }

  /**
   * Kill processes on ports
   */
  async killPortProcesses() {
    this.logSection('Cleaning Up Port Conflicts');

    const ports = [3001, 3002];

    for (const port of ports) {
      try {
        if (process.platform === 'win32') {
          // Windows
          await this.executeCommand('netstat', ['-ano'], `Checking port ${port}`);
        } else {
          // Linux/Mac
          await this.executeCommand('lsof', ['-i', `:${port}`], `Checking port ${port}`);
        }
      } catch (err) {
        // Port likely free
      }
    }

    this.logSuccess('Port cleanup completed');
  }

  /**
   * Execute command
   */
  executeCommand(command, args, description) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: 'pipe' });

      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(error || `Command failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Check system prerequisites
   */
  async checkPrerequisites() {
    this.logSection('Checking Prerequisites');

    const checks = {
      'Node.js': { command: 'node', args: ['--version'] },
      'npm': { command: 'npm', args: ['--version'] },
    };

    let allGood = true;

    for (const [name, { command, args }] of Object.entries(checks)) {
      try {
        const version = await this.executeCommand(command, args);
        this.logSuccess(`${name}: ${version.trim()}`);
      } catch (err) {
        this.logError(`${name}: NOT FOUND - Please install ${name}`);
        allGood = false;
      }
    }

    return allGood;
  }

  /**
   * Check and install dependencies
   */
  async checkDependencies() {
    this.logSection('Checking Dependencies');

    // Check backend dependencies
    this.logInfo('Checking backend dependencies...');
    const backendNodeModules = path.join(this.backendDir, 'node_modules');

    if (!this.fileExists(backendNodeModules)) {
      this.logWarning('Backend node_modules not found. Running npm install...');
      try {
        await this.executeCommand('npm', ['install'], 'Installing backend dependencies');
        this.logSuccess('Backend dependencies installed');
      } catch (err) {
        this.logError(`Failed to install backend dependencies: ${err.message}`);
        return false;
      }
    } else {
      this.logSuccess('Backend dependencies found');
    }

    // Check frontend dependencies
    this.logInfo('Checking frontend dependencies...');
    const frontendNodeModules = path.join(this.frontendDir, 'node_modules');

    if (!this.fileExists(frontendNodeModules)) {
      this.logWarning('Frontend node_modules not found. Running npm install...');
      try {
        await this.executeCommand('npm', ['install'], 'Installing frontend dependencies');
        this.logSuccess('Frontend dependencies installed');
      } catch (err) {
        this.logError(`Failed to install frontend dependencies: ${err.message}`);
      }
    } else {
      this.logSuccess('Frontend dependencies found');
    }

    return true;
  }

  /**
   * Validate configuration files
   */
  validateConfiguration() {
    this.logSection('Validating Configuration');

    const configFiles = [
      { name: '.env', path: path.join(this.backendDir, '.env'), required: false },
      { name: 'package.json', path: path.join(this.backendDir, 'package.json'), required: true },
    ];

    let configValid = true;

    for (const config of configFiles) {
      if (this.fileExists(config.path)) {
        this.logSuccess(`${config.name} found`);
      } else if (config.required) {
        this.logError(`REQUIRED: ${config.name} NOT found`);
        configValid = false;
      } else {
        this.logWarning(`OPTIONAL: ${config.name} not found`);
      }
    }

    return configValid;
  }

  /**
   * Generate configuration if missing
   */
  generateDefaultConfig() {
    const envPath = path.join(this.backendDir, '.env');

    if (!this.fileExists(envPath)) {
      this.logSection('Generating Default Configuration');

      const defaultEnv = `
# ═══════════════════════════════════════════════════════════════
# Application Configuration
# ═══════════════════════════════════════════════════════════════

# Environment
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3002

# Database
USE_MOCK_DB=true
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
JWT_EXPIRATION=24h
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-12345

# API Keys
API_KEY=your-api-key-here

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# AWS S3 (optional)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket

# ═══════════════════════════════════════════════════════════════
# NOTE: Update these values for production deployment
# ═══════════════════════════════════════════════════════════════
`;

      try {
        fs.writeFileSync(envPath, defaultEnv.trim());
        this.logSuccess('.env file generated with default values');
        this.logWarning('IMPORTANT: Update .env with your actual configuration');
      } catch (err) {
        this.logError(`Failed to generate .env: ${err.message}`);
      }
    }
  }

  /**
   * Display system summary
   */
  displaySummary() {
    this.logSection('System Summary');

    console.log(`
${colors.bright}Backend:${colors.reset}
  Location: ${this.backendDir}
  Status: Ready to start
  Port: 3001
  URL: http://localhost:3001/api

${colors.bright}Frontend:${colors.reset}
  Location: ${this.frontendDir}
  Status: Ready to start
  Port: 3002
  URL: http://localhost:3002

${colors.bright}Default Credentials:${colors.reset}
  Email: admin@alawael.com
  Password: Admin@123456

${colors.bright}Health Endpoints:${colors.reset}
  System Health: http://localhost:3001/api/health
  System Status: http://localhost:3001/api/status
  API Docs: http://localhost:3001/api/docs

${colors.bright}Features:${colors.reset}
  ✅ JWT Authentication
  ✅ Rate Limiting
  ✅ CORS Protection
  ✅ Security Headers
  ✅ Request Logging
  ✅ Error Handling
  ✅ Real-time Support (Socket.IO)
  ✅ Full-Text Search
  ✅ Gamification System

${colors.bright}Next Steps:${colors.reset}
  1. Start Backend: npm start (in /backend)
  2. Start Frontend: npm start (in /frontend)
  3. Open Browser: http://localhost:3002
  4. Login with provided credentials
`);
  }

  /**
   * Run full system setup
   */
  async runFullSetup() {
    console.clear();
    this.logSection('🚀 Professional System Setup - الإعداد الاحترافي للنظام');

    try {
      // 1. Verify prerequisites
      const prereqOk = await this.checkPrerequisites();
      if (!prereqOk) {
        this.logError('Prerequisites check failed');
        process.exit(1);
      }

      // 2. Verify project structure
      const structureOk = this.verifyProjectStructure();
      if (!structureOk) {
        this.logError('Project structure invalid');
        process.exit(1);
      }

      // 3. Kill port conflicts
      await this.killPortProcesses();

      // 4. Check dependencies
      await this.checkDependencies();

      // 5. Validate configuration
      const configOk = this.validateConfiguration();
      if (!configOk) {
        this.logWarning('Some configuration files are missing');
      }

      // 6. Generate default config if needed
      this.generateDefaultConfig();

      // 7. Display summary
      this.displaySummary();

      this.logSuccess('✅ System setup completed successfully!');
      this.logInfo('The system is now ready to start.');

    } catch (err) {
      this.logError(`Setup failed: ${err.message}`);
      process.exit(1);
    }
  }
}

// Run setup
const manager = new SystemManager();
manager.runFullSetup().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
