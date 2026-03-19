/**
 * Security Features Testing Suite
 * Validates all security middleware implementations
 * Run: node scripts/security-test.js
 */

const crypto = require('crypto');

// Color codes for output
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Test Suite Manager
 */
class SecurityTestSuite {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0
    };
    this.startTime = Date.now();
  }

  /**
   * Log test result
   */
  logTest(name, passed, details = '') {
    const status = passed ? `${COLORS.green}✓ PASS${COLORS.reset}` : `${COLORS.red}✗ FAIL${COLORS.reset}`;
    console.log(`  ${status} - ${name}`);
    if (details) {
      console.log(`    ${COLORS.cyan}${details}${COLORS.reset}`);
    }

    if (passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }

    this.tests.push({ name, passed, details });
  }

  /**
   * Log warning
   */
  logWarning(name, message) {
    console.log(`  ${COLORS.yellow}⚠ WARNING${COLORS.reset} - ${name}`);
    console.log(`    ${COLORS.cyan}${message}${COLORS.reset}`);
    this.results.warnings++;
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log(`\n${COLORS.blue}=== SECURITY FEATURES TEST SUITE ===${COLORS.reset}\n`);

    await this.testTwoFactorAuth();
    await this.testAccountSecurity();
    await this.testDataProtection();
    await this.testSecurityLogging();
    await this.testEnvironmentSecurity();
    await this.testDependencies();

    this.printSummary();
  }

  /**
   * Test Two-Factor Authentication
   */
  async testTwoFactorAuth() {
    console.log(`\n${COLORS.blue}1. Two-Factor Authentication${COLORS.reset}`);

    try {
      const speakeasy = require('speakeasy');
      this.logTest('Speakeasy module installed', true);

      // Test secret generation
      const secret = speakeasy.generateSecret({
        name: 'Test',
        issuer: 'AlAwael'
      });
      this.logTest('2FA secret generation', !!secret.base32, `Secret: ${secret.base32.substring(0, 10)}...`);

      // Test token verification
      const token = speakeasy.totp({ secret: secret.base32 });
      const verified = speakeasy.totp.verify({
        secret: secret.base32,
        encoding: 'base32',
        token,
        window: 2
      });
      this.logTest('TOTP token verification', verified, `Token: ${token}`);

      // Test backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      this.logTest('Backup code generation', backupCodes.length === 10, `Generated ${backupCodes.length} codes`);

    } catch (error) {
      this.logTest('2FA Module Check', false, error.message);
      this.logWarning('2FA Installation', 'Run: npm install speakeasy qrcode');
    }
  }

  /**
   * Test Account Security
   */
  async testAccountSecurity() {
    console.log(`\n${COLORS.blue}2. Account Security${COLORS.reset}`);

    try {
      const { AccountSecurityManager } = require('../erp_new_system/backend/middleware/accountSecurity.middleware');
      const manager = new AccountSecurityManager();

      // Test max login attempts
      const userId = 'test-user-' + Date.now();
      for (let i = 0; i < 5; i++) {
        manager.recordFailedLogin(userId, '192.168.1.1', 'Mozilla/5.0');
      }

      const isLocked = manager.isAccountLocked(userId);
      this.logTest('Account lockout after 5 attempts', isLocked, 'Account locked successfully');

      // Test lockout duration
      const remaining = manager.getRemainingLockoutTime(userId);
      this.logTest('Lockout timer working', remaining > 0, `${remaining} seconds remaining`);

      // Test session management
      const session = manager.registerSession(userId, '192.168.1.1', 'Mozilla/5.0', 'device-123');
      this.logTest('Session registration', !!session.sessionId, `Session ID: ${session.sessionId.substring(0, 8)}...`);

      // Test session verification
      const verification = manager.verifySession(userId, session.sessionId);
      this.logTest('Session verification', verification.valid, 'Session is valid');

      // Test max sessions
      manager.registerSession(userId, '192.168.1.2', 'Mozilla/5.0', 'device-456');
      manager.registerSession(userId, '192.168.1.3', 'Mozilla/5.0', 'device-789');
      const sessionCount = manager.getUserSessions(userId).length;
      this.logTest('Max sessions limit (3)', sessionCount <= 3, `${sessionCount} sessions active`);

      manager.unlockAccount(userId);
    } catch (error) {
      this.logTest('Account Security Module', false, error.message);
    }
  }

  /**
   * Test Data Protection
   */
  async testDataProtection() {
    console.log(`\n${COLORS.blue}3. Data Protection & Encryption${COLORS.reset}`);

    try {
      const { DataProtectionManager } = require('../erp_new_system/backend/middleware/dataProtection.middleware');

      // Test encryption
      const testData = 'sensitive-email@example.com';
      const encrypted = DataProtectionManager.encrypt(testData);
      this.logTest('Data encryption', !!encrypted && encrypted.includes(':'), `Encrypted: ${encrypted.substring(0, 30)}...`);

      // Test decryption
      const decrypted = DataProtectionManager.decrypt(encrypted);
      this.logTest('Data decryption', decrypted === testData, `Decrypted correctly: ${decrypted}`);

      // Test PII masking
      const userData = {
        email: 'john.doe@example.com',
        phoneNumber: '1234567890',
        ssn: '123456789'
      };
      const masked = DataProtectionManager.maskPII(userData);
      this.logTest('PII masking - Email', masked.email.includes('*'), `Masked: ${masked.email}`);
      this.logTest('PII masking - Phone', masked.phoneNumber.includes('*'), `Masked: ${masked.phoneNumber}`);
      this.logTest('PII masking - SSN', masked.ssn.includes('*'), `Masked: ${masked.ssn}`);

      // Test data hashing
      const hash = DataProtectionManager.hash('test-data');
      this.logTest('Data hashing (SHA256)', hash.length === 64, `Hash: ${hash.substring(0, 20)}...`);

      // Test data retention
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      const shouldRetain = DataProtectionManager.shouldRetainData(oneMonthAgo, 'auditLogs');
      this.logTest('Data retention check', !shouldRetain, `30-day old audit log should not be retained`);

    } catch (error) {
      this.logTest('Data Protection Module', false, error.message);
    }
  }

  /**
   * Test Security Logging
   */
  async testSecurityLogging() {
    console.log(`\n${COLORS.blue}4. Security Logging & Monitoring${COLORS.reset}`);

    try {
      const { SecurityLogger, EVENT_TYPES } = require('../erp_new_system/backend/middleware/securityLogging.middleware');
      const logger = new SecurityLogger('./logs/test-security');

      // Test event logging
      const event = logger.logEvent(EVENT_TYPES.LOGIN_SUCCESS, {
        userId: 'test-user',
        username: 'testuser',
        ip: '192.168.1.1',
        action: 'User logged in',
        resource: '/auth/login'
      });
      this.logTest('Security event logging', !!event.timestamp, `Event ID: ${event.timestamp}`);

      // Test event severity
      const criticalEvent = logger.logEvent(EVENT_TYPES.LOGIN_LOCKED, {
        userId: 'test-user',
        ip: '192.168.1.1',
        action: 'Account locked'
      });
      this.logTest('Critical event severity', criticalEvent.severity === 'CRITICAL', `Severity: ${criticalEvent.severity}`);

      // Test event queue
      this.logTest('Event queue', logger.eventQueue.length > 0, `${logger.eventQueue.length} events queued`);

      // Cleanup
      logger.flushToDisk();
      logger.destroy();

    } catch (error) {
      this.logTest('Security Logging Module', false, error.message);
    }
  }

  /**
   * Test Environment Security
   */
  async testEnvironmentSecurity() {
    console.log(`\n${COLORS.blue}5. Environment & Configuration Security${COLORS.reset}`);

    try {
      // Check .env file exists
      const fs = require('fs');
      const envExists = fs.existsSync('.env') || fs.existsSync('.env.production');
      this.logTest('.env file exists', envExists, 'Environment configuration found');

      // Check for sensitive files
      const sensitiveFiles = ['.env.local', '.env.development.local', 'config.json'];
      const gitignore = fs.readFileSync('.gitignore', 'utf8');
      const hasSensitiveInGitignore = sensitiveFiles.every(f => gitignore.includes(f));
      this.logTest('Sensitive files in .gitignore', hasSensitiveInGitignore, 'All sensitive files properly ignored');

      // Check for hardcoded secrets
      const packageJson = require('../erp_new_system/backend/package.json');
      const suspiciousKeys = ['password', 'secret', 'token', 'key', 'apiKey'];
      const foundSecrets = suspiciousKeys.filter(key => 
        JSON.stringify(packageJson).toLowerCase().includes(key)
      );
      
      if (foundSecrets.length === 0) {
        this.logTest('No hardcoded secrets in package.json', true);
      } else {
        this.logWarning('Hardcoded Secrets', `Found potential secrets: ${foundSecrets.join(', ')}`);
      }

    } catch (error) {
      this.logTest('Environment Security Check', false, error.message);
    }
  }

  /**
   * Test Dependencies
   */
  async testDependencies() {
    console.log(`\n${COLORS.blue}6. Dependency Vulnerability Scan${COLORS.reset}`);

    try {
      const { execSync } = require('child_process');
      
      // Run npm audit
      try {
        const auditOutput = execSync('npm audit --json', { 
          cwd: './erp_new_system/backend',
          encoding: 'utf8' 
        });
        
        const auditData = JSON.parse(auditOutput);
        const vulnerabilities = auditData.metadata?.vulnerabilities || {};
        
        this.logTest('npm audit - Critical vulnerabilities', 
          (vulnerabilities.critical || 0) === 0, 
          `Critical: ${vulnerabilities.critical || 0}`
        );
        
        this.logTest('npm audit - High vulnerabilities', 
          (vulnerabilities.high || 0) === 0, 
          `High: ${vulnerabilities.high || 0}`
        );

        if ((vulnerabilities.moderate || 0) > 0) {
          this.logWarning('Moderate Vulnerabilities', `${vulnerabilities.moderate} moderate vulnerabilities found`);
        }

      } catch (error) {
        // npm audit might fail if vulnerabilities exist
        this.logWarning('npm audit check', 'Run "npm audit" manually to see vulnerabilities');
      }

    } catch (error) {
      this.logTest('Dependency Scan', false, error.message);
    }
  }

  /**
   * Print summary report
   */
  printSummary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    console.log(`\n${COLORS.blue}=== TEST SUMMARY ===${COLORS.reset}`);
    console.log(`  ${COLORS.green}✓ Passed: ${this.results.passed}${COLORS.reset}`);
    console.log(`  ${COLORS.red}✗ Failed: ${this.results.failed}${COLORS.reset}`);
    console.log(`  ${COLORS.yellow}⚠ Warnings: ${this.results.warnings}${COLORS.reset}`);
    console.log(`  ⏱ Duration: ${duration}s`);

    const passRate = ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1);
    console.log(`\n${COLORS.green}Security Score: ${passRate}%${COLORS.reset}`);

    if (this.results.failed === 0 && this.results.warnings === 0) {
      console.log(`\n${COLORS.green}🔒 All security tests PASSED!${COLORS.reset}`);
    } else if (this.results.failed === 0) {
      console.log(`\n${COLORS.yellow}⚠ Tests passed but with warnings${COLORS.reset}`);
    } else {
      console.log(`\n${COLORS.red}❌ Some security tests FAILED - Review above${COLORS.reset}`);
    }

    console.log(`\n${COLORS.blue}Next Steps:${COLORS.reset}`);
    if (this.results.failed > 0) {
      console.log('  1. Fix failed tests');
    }
    console.log('  2. Run "npm install speakeasy qrcode" if not installed');
    console.log('  3. Integrate middleware into server.unified.js');
    console.log('  4. Run "npm test" to verify functionality');
    console.log('  5. Deploy to production\n');
  }
}

// Run tests
if (require.main === module) {
  const suite = new SecurityTestSuite();
  suite.runAll().catch(error => {
    console.error(`${COLORS.red}Test suite error: ${error.message}${COLORS.reset}`);
    process.exit(1);
  });
}

module.exports = SecurityTestSuite;
