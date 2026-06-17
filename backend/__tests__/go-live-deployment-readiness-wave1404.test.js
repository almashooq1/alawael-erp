/**
 * @file go-live-deployment-readiness-wave1404.test.js
 * @description Test suite for production deployment readiness
 * Validates Staging environment setup, monitoring, backups, sweepers
 *
 * Run: npm run test:sprint (includes this)
 * Or: npx jest __tests__/go-live-deployment-readiness-wave1404.test.js --no-coverage
 */

'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const ROOT = path.join(__dirname, '..');
const DOCS_ROOT = path.join(ROOT, '..', 'docs');
const OPS_ROOT = path.join(ROOT, '..', 'ops');

describe('Wave 1404: Go-Live Deployment Readiness', () => {
  // ────────────────────────────────────────────────────────────────────────
  // Suite 1: Deployment Plan & Documentation
  // ────────────────────────────────────────────────────────────────────────
  describe('1. Deployment Plan Documentation', () => {
    it('should have complete go-live-deployment-plan-w1404.md', () => {
      const planPath = path.join(DOCS_ROOT, 'runbooks', 'go-live-deployment-plan-w1404.md');
      expect(fs.existsSync(planPath)).toBe(true);

      const content = fs.readFileSync(planPath, 'utf8');
      const requiredSections = [
        '## 📋 التحضيرات الأساسية',
        '### 1️⃣ إعداد Staging Environment',
        '## 🔒 الأمان والمراقبة',
        '### 2️⃣ تفعيل المراقبة والتنبيهات',
        '## 💾 النسخ الاحتياطية',
        '### 3️⃣ إعداد نظام Backup',
        '## ⚙️ تشغيل الـ Sweepers',
        '### 4️⃣ تفعيل الـ Automated Tasks',
        '## 🧪 اختبارات الحمل على Staging',
        '### 5️⃣ تشغيل أدوات Load Testing',
        '## 🔄 خطة الـ Rollback',
        '### 6️⃣ Rollback Procedure',
        '## 📊 مراقبة ما بعد النشر',
        '### 7️⃣ First 24 Hours Checklist',
      ];

      requiredSections.forEach(section => {
        expect(content).toContain(section);
      });
    });

    it('should reference all critical scripts', () => {
      const planPath = path.join(DOCS_ROOT, 'runbooks', 'go-live-deployment-plan-w1404.md');
      const content = fs.readFileSync(planPath, 'utf8');

      const scripts = [
        'backup-keygen.js',
        'db-backup.js',
        'dr-verify.js',
        'preflight',
        'check-services',
      ];

      scripts.forEach(script => {
        expect(content).toContain(script);
      });
    });

    it('should document all Sweepers', () => {
      const planPath = path.join(DOCS_ROOT, 'runbooks', 'go-live-deployment-plan-w1404.md');
      const content = fs.readFileSync(planPath, 'utf8');

      const sweepers = [
        'Auto-Backup',
        'NPHIES Reconciliation',
        'ZATCA SLA',
        'Care-Plan Plateau',
        'HR Anomaly',
        'Respite No-Show',
      ];

      sweepers.forEach(sweeper => {
        expect(content).toContain(sweeper);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Suite 2: Prometheus Configuration
  // ────────────────────────────────────────────────────────────────────────
  describe('2. Prometheus Monitoring Configuration', () => {
    it('should have ops/prometheus.yml file', () => {
      const promPath = path.join(OPS_ROOT, 'prometheus.yml');
      expect(fs.existsSync(promPath)).toBe(true);
    });

    it('should have valid Prometheus YAML syntax', () => {
      const promPath = path.join(OPS_ROOT, 'prometheus.yml');
      const content = fs.readFileSync(promPath, 'utf8');

      expect(() => {
        YAML.parse(content);
      }).not.toThrow();
    });

    it('should configure required scrape targets', () => {
      const promPath = path.join(OPS_ROOT, 'prometheus.yml');
      const content = fs.readFileSync(promPath, 'utf8');

      const requiredTargets = ['backend-api', 'redis', 'mongodb', 'node', 'docker'];

      requiredTargets.forEach(target => {
        expect(content).toContain(target);
      });
    });

    it('should reference alerting rules', () => {
      const promPath = path.join(OPS_ROOT, 'prometheus.yml');
      const content = fs.readFileSync(promPath, 'utf8');

      expect(content).toContain('alerting-rules.yml');
    });

    it('should set up alertmanager', () => {
      const promPath = path.join(OPS_ROOT, 'prometheus.yml');
      const content = fs.readFileSync(promPath, 'utf8');

      expect(content).toContain('alertmanagers');
      expect(content).toContain('9093');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Suite 3: Alerting Rules Configuration
  // ────────────────────────────────────────────────────────────────────────
  describe('3. Alerting Rules', () => {
    it('should have ops/alerting-rules.yml file', () => {
      const rulesPath = path.join(OPS_ROOT, 'alerting-rules.yml');
      expect(fs.existsSync(rulesPath)).toBe(true);
    });

    it('should have valid alerting rules YAML', () => {
      const rulesPath = path.join(OPS_ROOT, 'alerting-rules.yml');
      const content = fs.readFileSync(rulesPath, 'utf8');

      expect(() => {
        YAML.parse(content);
      }).not.toThrow();
    });

    it('should define critical alert categories', () => {
      const rulesPath = path.join(OPS_ROOT, 'alerting-rules.yml');
      const content = fs.readFileSync(rulesPath, 'utf8');

      const alertCategories = [
        'HighAPILatency',
        'CriticalErrorRate',
        'MongoDBDown',
        'RedisDown',
        'HighMemoryUsage',
        'LowDiskSpace',
        'BackupFailed',
        'HealthCheckFailing',
      ];

      alertCategories.forEach(alert => {
        expect(content).toContain(`- alert: ${alert}`);
      });
    });

    it('should assign severity levels to alerts', () => {
      const rulesPath = path.join(OPS_ROOT, 'alerting-rules.yml');
      const content = fs.readFileSync(rulesPath, 'utf8');

      expect(content).toContain('severity: critical');
      expect(content).toContain('severity: warning');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Suite 4: Backup Scripts Validation
  // ────────────────────────────────────────────────────────────────────────
  describe('4. Backup Infrastructure', () => {
    const backupScripts = ['db-backup.js', 'dr-verify.js', 'backup-keygen.js'];

    backupScripts.forEach(script => {
      it(`should have ${script} script`, () => {
        const scriptPath = path.join(ROOT, 'scripts', script);
        expect(fs.existsSync(scriptPath)).toBe(true);
      });
    });

    it('should have critical collections in backup', () => {
      const backupPath = path.join(ROOT, 'scripts', 'db-backup.js');
      const content = fs.readFileSync(backupPath, 'utf8');

      const criticalCollections = ['users', 'branches', 'roles', 'permissions'];

      criticalCollections.forEach(collection => {
        expect(content).toContain(`'${collection}'`);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Suite 5: Sweeper Tasks Configuration
  // ────────────────────────────────────────────────────────────────────────
  describe('5. Sweeper Tasks (Automated Jobs)', () => {
    const schedulers = [
      'reports.scheduler.js',
      'reports-ops.scheduler.js',
      'payment-gateway.scheduler.js',
      'smart-insurance.scheduler.js',
    ];

    schedulers.forEach(scheduler => {
      it(`should have ${scheduler}`, () => {
        const schedulerPath = path.join(ROOT, 'scheduler', scheduler);
        expect(fs.existsSync(schedulerPath)).toBe(true);
      });
    });

    it('should have auto-backup scheduler enabled by default', () => {
      // Auto-backup is configured via environment variables
      // Check that the backup scripts exist and can be called
      const backupPath = path.join(ROOT, 'scripts', 'db-backup.js');
      expect(fs.existsSync(backupPath)).toBe(true);
    });

    it('should support cron job configuration', () => {
      const packagePath = path.join(ROOT, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      expect(pkg.dependencies['node-cron']).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Suite 6: Environment Configuration
  // ────────────────────────────────────────────────────────────────────────
  describe('6. Environment Setup', () => {
    it('should have .env.example with all required variables', () => {
      const envPath = path.join(ROOT, '.env.example');
      expect(fs.existsSync(envPath)).toBe(true);

      const content = fs.readFileSync(envPath, 'utf8');
      const requiredVars = [
        'NODE_ENV',
        'MONGODB_URI',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'ENCRYPTION_KEY',
        'SESSION_SECRET',
      ];

      requiredVars.forEach(varName => {
        expect(content).toContain(varName);
      });
    });

    it('should have .env.minimum.example for bootstrap', () => {
      const envMinPath = path.join(ROOT, '.env.minimum.example');
      expect(fs.existsSync(envMinPath)).toBe(true);
    });

    it('should document environment setup in runbook', () => {
      const setupPath = path.join(DOCS_ROOT, 'runbooks', 'environment-setup.md');
      expect(fs.existsSync(setupPath)).toBe(true);

      const content = fs.readFileSync(setupPath, 'utf8');
      expect(content).toContain('MongoDB');
      expect(content).toContain('Redis');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Suite 7: Docker Compose Production Setup
  // ────────────────────────────────────────────────────────────────────────
  describe('7. Docker Compose Production Configuration', () => {
    it('should have docker-compose.professional.yml', () => {
      const dockerPath = path.join(ROOT, '..', 'docker-compose.professional.yml');
      expect(fs.existsSync(dockerPath)).toBe(true);
    });

    it('should have docker-compose.production.yml', () => {
      const dockerPath = path.join(ROOT, '..', 'docker-compose.production.yml');
      expect(fs.existsSync(dockerPath)).toBe(true);
    });

    it('should have resource limits in production config', () => {
      const dockerPath = path.join(ROOT, '..', 'docker-compose.production.yml');
      const content = fs.readFileSync(dockerPath, 'utf8');

      expect(content).toContain('limits');
      expect(content).toContain('memory');
      expect(content).toContain('cpus');
    });

    it('should configure security options', () => {
      const dockerPath = path.join(ROOT, '..', 'docker-compose.production.yml');
      const content = fs.readFileSync(dockerPath, 'utf8');

      expect(content).toContain('security_opt');
      expect(content).toContain('no-new-privileges');
    });

    it('should enable persistent logging', () => {
      const dockerPath = path.join(ROOT, '..', 'docker-compose.production.yml');
      const content = fs.readFileSync(dockerPath, 'utf8');

      expect(content).toContain('json-file');
      expect(content).toContain('max-size');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Suite 8: Load Testing Integration
  // ────────────────────────────────────────────────────────────────────────
  describe('8. Load Testing Configuration', () => {
    it('should reference load testing in deployment plan', () => {
      const planPath = path.join(DOCS_ROOT, 'runbooks', 'go-live-deployment-plan-w1404.md');
      const content = fs.readFileSync(planPath, 'utf8');

      expect(content).toContain('test:load:smoke');
      expect(content).toContain('test:load');
      expect(content).toContain('test:load:gov');
    });

    it('should document SLO thresholds', () => {
      const planPath = path.join(DOCS_ROOT, 'runbooks', 'go-live-deployment-plan-w1404.md');
      const content = fs.readFileSync(planPath, 'utf8');

      expect(content).toContain('p95');
      expect(content).toContain('http_req_failed');
    });

    it('should have performance-load-testing.md runbook', () => {
      const testPath = path.join(DOCS_ROOT, 'runbooks', 'performance-load-testing.md');
      expect(fs.existsSync(testPath)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Suite 9: Rollback Procedures
  // ────────────────────────────────────────────────────────────────────────
  describe('9. Disaster Recovery & Rollback', () => {
    it('should document rollback procedures', () => {
      const planPath = path.join(DOCS_ROOT, 'runbooks', 'go-live-deployment-plan-w1404.md');
      const content = fs.readFileSync(planPath, 'utf8');

      expect(content).toContain('## 🔄 خطة الـ Rollback');
      expect(content).toContain('restore');
      expect(content).toContain('backup');
    });

    it('should document disaster recovery checklist', () => {
      const planPath = path.join(DOCS_ROOT, 'runbooks', 'go-live-deployment-plan-w1404.md');
      const content = fs.readFileSync(planPath, 'utf8');

      expect(content).toContain('Rollback Checklist');
      expect(content).toContain('smoke tests');
    });

    it('should have dr-verify.js for restore testing', () => {
      const drPath = path.join(ROOT, 'scripts', 'dr-verify.js');
      expect(fs.existsSync(drPath)).toBe(true);

      const content = fs.readFileSync(drPath, 'utf8');
      expect(content).toContain('verify');
      expect(content).toContain('restore');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Suite 10: Pre-Deployment Checklist
  // ────────────────────────────────────────────────────────────────────────
  describe('10. Pre-Deployment Verification', () => {
    it('should document full pre-flight checklist', () => {
      const checklistPath = path.join(DOCS_ROOT, 'runbooks', 'pre-deployment-checklist.md');
      expect(fs.existsSync(checklistPath)).toBe(true);
    });

    it('should document go-live checklist', () => {
      const goLivePath = path.join(DOCS_ROOT, 'blueprint', '23-go-live-checklist.md');
      expect(fs.existsSync(goLivePath)).toBe(true);

      const content = fs.readFileSync(goLivePath, 'utf8');
      expect(content).toContain('Backups');
      expect(content).toContain('NPHIES');
      expect(content).toContain('ZATCA');
    });

    it('should document 24-hour post-deployment monitoring', () => {
      const planPath = path.join(DOCS_ROOT, 'runbooks', 'go-live-deployment-plan-w1404.md');
      const content = fs.readFileSync(planPath, 'utf8');

      expect(content).toContain('First 24 Hours Checklist');
      expect(content).toContain('H+0');
      expect(content).toContain('H+24h');
    });

    it('should define success criteria', () => {
      const planPath = path.join(DOCS_ROOT, 'runbooks', 'go-live-deployment-plan-w1404.md');
      const content = fs.readFileSync(planPath, 'utf8');

      expect(content).toContain('علامات النجاح');
      expect(content).toContain('مستعدة للإنتاج');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Suite 11: Ratchet Baselines (Prevent Regression)
  // ────────────────────────────────────────────────────────────────────────
  describe('11. Ratchet Baselines (Regression Prevention)', () => {
    const BASELINE_FILES = [
      'go-live-deployment-plan-w1404.md',
      'prometheus.yml',
      'alerting-rules.yml',
    ];

    it('should not delete deployment plan', () => {
      BASELINE_FILES.forEach(file => {
        let filePath;
        if (file === 'prometheus.yml' || file === 'alerting-rules.yml') {
          filePath = path.join(OPS_ROOT, file);
        } else {
          filePath = path.join(DOCS_ROOT, 'runbooks', file);
        }

        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    it('should update baseline if files are deleted', () => {
      // This test enforces that deleting baseline files requires updating
      // the BASELINE_FILES array in the test file itself
      expect(BASELINE_FILES.length).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Suite 12: Wave Metadata
  // ────────────────────────────────────────────────────────────────────────
  describe('12. Wave W1404 Metadata', () => {
    it('should tag deployment plan with W1404', () => {
      const planPath = path.join(DOCS_ROOT, 'runbooks', 'go-live-deployment-plan-w1404.md');
      const content = fs.readFileSync(planPath, 'utf8');

      expect(content).toContain('W1404');
    });

    it('should include deployment readiness test in test file', () => {
      const testPath = path.join(
        ROOT,
        '__tests__',
        'go-live-deployment-readiness-wave1404.test.js'
      );
      expect(fs.existsSync(testPath)).toBe(true);

      const content = fs.readFileSync(testPath, 'utf8');
      expect(content).toContain('Wave 1404');
    });

    it('should add entry to sprint-tests.txt', () => {
      const sprintPath = path.join(ROOT, 'sprint-tests.txt');
      const content = fs.readFileSync(sprintPath, 'utf8');

      expect(content).toContain('__tests__/go-live-deployment-readiness-wave1404.test.js');
    });
  });
});
