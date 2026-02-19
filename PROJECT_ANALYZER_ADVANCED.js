#!/usr/bin/env node

/**
 * ============================================================================
 * 🔍 PROJECT COMPREHENSIVE ANALYZER - أداة تحليل المشروع الشاملة
 * ============================================================================
 * غرض الأداة: فحص شامل دقيق ومنهجي لجميع مشاكل المشروع قبل الإطلاق
 * 
 * المميزات:
 * ✅ فحص هيكل المشروع
 * ✅ التحقق من الملفات والمكونات
 * ✅ فحص البيئات والمتغيرات
 * ✅ اختبار الخدمات والمنافذ
 * ✅ فحص تبعيات npm
 * ✅ اختبار قواعد البيانات
 * ✅ توليد التقارير والحلول
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

// Utility functions
const log = {
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.blue}📋 ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  sub: (msg) => console.log(`   ${colors.dim}→ ${msg}${colors.reset}`),
};

class ProjectAnalyzer {
  constructor(rootPath) {
    this.rootPath = rootPath || process.cwd();
    this.results = {
      timestamp: new Date().toISOString(),
      projectRoot: this.rootPath,
      sections: {},
      issues: [],
      solutions: [],
      summary: {},
    };
  }

  async runFullAnalysis() {
    try {
      log.header('🚀 بدء تحليل المشروع الشامل');
      console.log(`📂 المسار الأساسي: ${this.rootPath}`);
      
      await this.checkProjectStructure();
      await this.checkEnvironmentFiles();
      await this.checkDependencies();
      await this.checkServices();
      await this.checkDatabases();
      await this.checkDockerSetup();
      await this.checkTests();
      await this.checkSecurity();
      await this.generateSolutions();
      await this.generateReport();
      
      log.header('✨ اكتمل التحليل الشامل');
      return this.results;
    } catch (error) {
      log.error(`خطأ في التحليل: ${error.message}`);
      throw error;
    }
  }

  async checkProjectStructure() {
    log.section('1️⃣  فحص هيكل المشروع');
    
    const requiredDirs = [
      'erp_new_system',
      'backend',
      'frontend',
      'docs',
      'deployment',
      'docker',
    ];

    const missingDirs = [];
    const foundDirs = [];

    for (const dir of requiredDirs) {
      const dirPath = path.join(this.rootPath, dir);
      if (fs.existsSync(dirPath)) {
        log.success(`المجلد ${dir} موجود`);
        foundDirs.push(dir);
      } else {
        log.warning(`المجلد ${dir} غير موجود`);
        missingDirs.push(dir);
      }
    }

    this.results.sections.projectStructure = {
      found: foundDirs,
      missing: missingDirs,
      status: missingDirs.length === 0 ? 'PASS' : 'WARN',
    };

    if (missingDirs.length > 0) {
      this.results.issues.push({
        category: 'Project Structure',
        severity: 'WARNING',
        message: `المجلدات المفقودة: ${missingDirs.join(', ')}`,
      });
    }
  }

  async checkEnvironmentFiles() {
    log.section('2️⃣  فحص ملفات البيئة');
    
    const envFiles = [
      '.env',
      '.env.example',
      '.env.docker',
      '.env.production',
    ];

    const foundEnv = [];
    const missingEnv = [];

    for (const file of envFiles) {
      const filePath = path.join(this.rootPath, file);
      if (fs.existsSync(filePath)) {
        log.success(`ملف البيئة ${file} موجود`);
        foundEnv.push(file);
        
        // Check for sensitive data
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('PASSWORD') && !file.includes('example')) {
          if (content.includes('PASSWORD=')) {
            log.warning(`⚠️  تحذير أمان: ملف ${file} يحتوي على كلمات المرور الفعلية`);
            this.results.issues.push({
              category: 'Security',
              severity: 'CRITICAL',
              message: `ملف ${file} يحتوي على بيانات حساسة`,
              solution: 'استخدم متغيرات البيئة من نظام التشغيل أو .env.local',
            });
          }
        }
      } else {
        if (file === '.env') {
          log.error(`ملف البيئة الأساسي ${file} غير موجود`);
          missingEnv.push(file);
        } else {
          log.info(`ملف البيئة الجديد ${file} غير موجود (اختياري)`);
        }
      }
    }

    this.results.sections.environmentFiles = {
      found: foundEnv,
      missing: missingEnv,
      status: missingEnv.includes('.env') ? 'FAIL' : 'PASS',
    };
  }

  async checkDependencies() {
    log.section('3️⃣  فحص التبعيات');
    
    const packageJsonPaths = [
      path.join(this.rootPath, 'package.json'),
      path.join(this.rootPath, 'backend', 'package.json'),
      path.join(this.rootPath, 'frontend', 'package.json'),
      path.join(this.rootPath, 'erp_new_system', 'backend', 'package.json'),
      path.join(this.rootPath, 'erp_new_system', 'frontend', 'package.json'),
    ];

    const packageJsonFiles = [];

    for (const pkgPath of packageJsonPaths) {
      if (fs.existsSync(pkgPath)) {
        log.success(`تم العثور على package.json في: ${path.relative(this.rootPath, pkgPath)}`);
        packageJsonFiles.push(pkgPath);
        
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          
          // Check for critical dependencies
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          const criticalDeps = ['express', 'react', 'typescript', 'jest', 'dotenv'];
          const missing = criticalDeps.filter(dep => !deps[dep]);
          
          if (missing.length > 0) {
            log.warning(`التبعيات المفقودة المهمة: ${missing.join(', ')}`);
          }
        } catch (error) {
          log.error(`خطأ في قراءة package.json: ${error.message}`);
        }
      }
    }

    // Check node_modules
    const nodeModulesPath = path.join(this.rootPath, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      log.success(`مجلد node_modules موجود`);
    } else {
      log.warning(`مجلد node_modules غير موجود - يجب تشغيل npm install`);
      this.results.issues.push({
        category: 'Dependencies',
        severity: 'HIGH',
        message: 'مجلد node_modules غير موجود',
        solution: 'قم بتشغيل: npm install',
      });
    }

    this.results.sections.dependencies = {
      packageJsonFiles: packageJsonFiles.length,
      hasNodeModules: fs.existsSync(nodeModulesPath),
      status: fs.existsSync(nodeModulesPath) ? 'PASS' : 'FAIL',
    };
  }

  async checkServices() {
    log.section('4️⃣  فحص الخدمات والمنافذ');
    
    const services = [
      { name: 'Backend API', port: 3001, healthEndpoint: '/api/health' },
      { name: 'Frontend', port: 3000 },
      { name: 'Database', port: 5432 },
      { name: 'Redis Cache', port: 6379 },
      { name: 'Elasticsearch', port: 9200 },
    ];

    const serviceStatus = [];

    for (const service of services) {
      try {
        const { stdout } = await execAsync(`netstat -ano | findstr :${service.port}`, {
          shell: 'cmd.exe',
        }).catch(() => ({ stdout: '' }));
        
        if (stdout) {
          log.success(`الخدمة ${service.name} تعمل على المنفذ ${service.port}`);
          serviceStatus.push({ ...service, running: true });
        } else {
          log.info(`الخدمة ${service.name} غير مشغلة على المنفذ ${service.port}`);
          serviceStatus.push({ ...service, running: false });
        }
      } catch (error) {
        log.info(`لم يتمكن من التحقق من المنفذ ${service.port}`);
      }
    }

    this.results.sections.services = {
      status: serviceStatus,
      running: serviceStatus.filter(s => s.running).length,
      total: serviceStatus.length,
    };
  }

  async checkDatabases() {
    log.section('5️⃣  فحص قواعد البيانات');
    
    const dbChecks = [
      { name: 'PostgreSQL', command: 'psql --version' },
      { name: 'MongoDB', command: 'mongo --version' },
      { name: 'MySQL', command: 'mysql --version' },
      { name: 'Redis', command: 'redis-cli --version' },
    ];

    const dbStatus = [];

    for (const db of dbChecks) {
      try {
        const { stdout } = await execAsync(db.command).catch(() => ({ stdout: '' }));
        if (stdout) {
          log.success(`${db.name} مثبت: ${stdout.trim().split('\n')[0]}`);
          dbStatus.push({ ...db, installed: true });
        } else {
          log.warning(`${db.name} غير مثبت`);
          dbStatus.push({ ...db, installed: false });
        }
      } catch (error) {
        log.warning(`${db.name} غير مثبت`);
        dbStatus.push({ ...db, installed: false });
      }
    }

    this.results.sections.databases = {
      status: dbStatus,
      installed: dbStatus.filter(d => d.installed).length,
      total: dbStatus.length,
    };
  }

  async checkDockerSetup() {
    log.section('6️⃣  فحص إعداد Docker');
    
    const dockerFiles = [
      'docker-compose.yml',
      'docker-compose.production.yml',
      'Dockerfile',
    ];

    const foundDocker = [];
    const missingDocker = [];

    for (const file of dockerFiles) {
      const filePath = path.join(this.rootPath, file);
      if (fs.existsSync(filePath)) {
        log.success(`ملف Docker ${file} موجود`);
        foundDocker.push(file);
      } else {
        log.info(`ملف Docker ${file} غير موجود`);
        missingDocker.push(file);
      }
    }

    // Check if Docker is installed
    let dockerInstalled = false;
    try {
      const { stdout } = await execAsync('docker --version');
      log.success(`Docker مثبت: ${stdout.trim()}`);
      dockerInstalled = true;
    } catch (error) {
      log.warning('Docker غير مثبت');
    }

    this.results.sections.docker = {
      files: foundDocker,
      dockerInstalled,
      status: dockerInstalled && foundDocker.length > 0 ? 'PASS' : 'WARN',
    };
  }

  async checkTests() {
    log.section('7️⃣  فحص الاختبارات');
    
    const testFiles = [
      'jest.config.js',
      'tests/',
      '__tests__/',
      '.test.js files',
      '.spec.js files',
    ];

    const hasTests = fs.existsSync(path.join(this.rootPath, 'jest.config.js')) ||
                     fs.existsSync(path.join(this.rootPath, 'tests'));

    if (hasTests) {
      log.success('ملفات اختبار موجودة');
    } else {
      log.warning('ملفات اختبار لم تُعثر عليها بالكامل');
    }

    // Count test files
    const testFilesCount = this.countFiles(this.rootPath, /\.(test|spec)\.(js|ts)$/);

    this.results.sections.tests = {
      hasTestSetup: hasTests,
      filesCount: testFilesCount,
      status: testFilesCount > 0 ? 'PASS' : 'WARN',
    };

    if (testFilesCount > 0) {
      log.success(`تم العثور على ${testFilesCount} ملف اختبار`);
    }
  }

  checkSecurity() {
    log.section('8️⃣  فحص الأمان');
    
    const securityIssues = [];
    const gitignorePath = path.join(this.rootPath, '.gitignore');
    
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      if (gitignore.includes('.env')) {
        log.success('.gitignore يتضمن ملفات البيئة');
      } else {
        log.warning('.gitignore لا يتضمن ملفات البيئة');
        securityIssues.push('ملفات .env قد تُرفع للـ git');
      }
    }

    if (fs.existsSync(path.join(this.rootPath, 'node_modules'))) {
      if (!fs.existsSync(gitignorePath) || !fs.readFileSync(gitignorePath, 'utf-8').includes('node_modules')) {
        log.warning('node_modules قد تُرفع للـ git');
        securityIssues.push('node_modules يجب أن تُضاف إلى .gitignore');
      }
    }

    this.results.sections.security = {
      issues: securityIssues,
      status: securityIssues.length === 0 ? 'PASS' : 'WARN',
    };
  }

  countFiles(dir, pattern, fileCount = 0) {
    if (!fs.existsSync(dir)) return fileCount;
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules')) {
        fileCount = this.countFiles(filePath, pattern, fileCount);
      } else if (stat.isFile() && pattern.test(file)) {
        fileCount++;
      }
    }
    
    return fileCount;
  }

  async generateSolutions() {
    log.section('💡 توليد الحلول والتوصيات');
    
    const solutions = [];

    // Based on issues found
    if (this.results.sections.projectStructure?.missing?.length > 0) {
      solutions.push({
        issue: 'المجلدات المفقودة',
        solution: `أنشئ المجلدات التالية: ${this.results.sections.projectStructure.missing.join(', ')}`,
        priority: 'HIGH',
      });
    }

    if (!this.results.sections.dependencies.hasNodeModules) {
      solutions.push({
        issue: 'التبعيات المفقودة',
        solution: 'قم بتشغيل: npm install',
        priority: 'CRITICAL',
        command: 'npm install',
      });
    }

    if (!this.results.sections.environmentFiles.found.includes('.env')) {
      solutions.push({
        issue: 'ملف البيئة مفقود',
        solution: 'انسخ .env.example إلى .env وعدّل المتغيرات',
        priority: 'CRITICAL',
        command: 'cp .env.example .env',
      });
    }

    if (this.results.sections.docker.status !== 'PASS') {
      solutions.push({
        issue: 'إعداد Docker غير مكتمل',
        solution: 'تأكد من وجود docker-compose.yml وتثبيت Docker',
        priority: 'MEDIUM',
        command: 'docker --version && docker-compose --version',
      });
    }

    if (this.results.sections.tests.status === 'WARN') {
      solutions.push({
        issue: 'ملفات الاختبار ناقصة',
        solution: 'أضف ملفات اختبار باستخدام Jest',
        priority: 'MEDIUM',
        url: 'https://jestjs.io/docs/getting-started',
      });
    }

    this.results.solutions = solutions;

    solutions.forEach(sol => {
      log.info(`${sol.priority}: ${sol.issue}`);
      log.sub(`الحل: ${sol.solution}`);
      if (sol.command) {
        log.sub(`الأمر: ${sol.command}`);
      }
    });
  }

  async generateReport() {
    log.section('📊 توليد التقرير النهائي');
    
    const reportPath = path.join(this.rootPath, 'PROJECT_ANALYSIS_REPORT.json');
    const textReportPath = path.join(this.rootPath, 'PROJECT_ANALYSIS_REPORT.txt');

    // Generate summary
    this.results.summary = {
      totalSections: Object.keys(this.results.sections).length,
      totalIssues: this.results.issues.length,
      totalSolutions: this.results.solutions.length,
      criticalIssues: this.results.issues.filter(i => i.severity === 'CRITICAL').length,
      highPriorityIssues: this.results.issues.filter(i => i.severity === 'HIGH').length,
      recommendedActions: this.results.solutions.filter(s => s.priority === 'CRITICAL').length,
      overallStatus: this.results.issues.filter(i => i.severity === 'CRITICAL').length === 0 ? 'READY' : 'NEEDS_FIXES',
    };

    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    log.success(`تم حفظ التقرير JSON في: ${reportPath}`);

    // Generate text report
    let textReport = `
╔════════════════════════════════════════════════════════════════╗
║     تقرير تحليل المشروع الشامل - Project Analysis Report     ║
╚════════════════════════════════════════════════════════════════╝

📅 التاريخ: ${new Date().toLocaleString('ar-SA')}
📂 المسار: ${this.rootPath}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 الملخص التنفيذي:
─────────────────────────────────────────────────────────────────
✓ عدد الأقسام المفحوصة: ${this.results.summary.totalSections}
✓ عدد المشاكل المكتشفة: ${this.results.summary.totalIssues}
✓ المشاكل الحرجة: ${this.results.summary.criticalIssues}
✓ المشاكل العالية: ${this.results.summary.highPriorityIssues}
✓ الإجراءات الموصى بها: ${this.results.summary.recommendedActions}
✓ حالة المشروع: ${this.results.summary.overallStatus}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 تفاصيل الأقسام:
─────────────────────────────────────────────────────────────────

1️⃣  هيكل المشروع:
${JSON.stringify(this.results.sections.projectStructure, null, 2)}

2️⃣  ملفات البيئة:
${JSON.stringify(this.results.sections.environmentFiles, null, 2)}

3️⃣  التبعيات:
${JSON.stringify(this.results.sections.dependencies, null, 2)}

4️⃣  الخدمات:
العداد: ${this.results.sections.services.running}/${this.results.sections.services.total}

5️⃣  قواعد البيانات:
المثبتة: ${this.results.sections.databases.installed}/${this.results.sections.databases.total}

6️⃣  Docker:
${JSON.stringify(this.results.sections.docker, null, 2)}

7️⃣  الاختبارات:
${JSON.stringify(this.results.sections.tests, null, 2)}

8️⃣  الأمان:
${JSON.stringify(this.results.sections.security, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  قائمة المشاكل:
─────────────────────────────────────────────────────────────────
${this.results.issues.length === 0 ? 'لا توجد مشاكل' : this.results.issues.map((issue, i) => `
${i + 1}. [${issue.severity}] ${issue.category}
   المشكلة: ${issue.message}
   ${issue.solution ? `الحل: ${issue.solution}` : ''}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 الحلول والتوصيات:
─────────────────────────────────────────────────────────────────
${this.results.solutions.map((sol, i) => `
${i + 1}. [${sol.priority}] ${sol.issue}
   ✓ الحل: ${sol.solution}
   ${sol.command ? `   🔧 الأمر: ${sol.command}` : ''}
   ${sol.url ? `   📖 المرجع: ${sol.url}` : ''}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 الخطوات التالية الموصى بها:
─────────────────────────────────────────────────────────────────
1. ✓ حل جميع المشاكل الحرجة (CRITICAL)
2. ✓ معالجة المشاكل العالية (HIGH)
3. ✓ تشغيل الاختبارات الشاملة
4. ✓ التحقق من الأداء والأمان
5. ✓ الإطلاق الآمن للإنتاج

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

تم توليد التقرير بواسطة: PROJECT_ANALYZER_ADVANCED
التاريخ: ${new Date().toISOString()}

    `;

    fs.writeFileSync(textReportPath, textReport);
    log.success(`تم حفظ التقرير النصي في: ${textReportPath}`);

    // Print summary
    console.log(textReport);
  }
}

// Main execution
async function main() {
  const projectRoot = process.cwd();
  const analyzer = new ProjectAnalyzer(projectRoot);
  
  try {
    const results = await analyzer.runFullAnalysis();
    process.exit(results.summary.overallStatus === 'READY' ? 0 : 1);
  } catch (error) {
    log.error(`فشل التحليل: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ProjectAnalyzer;
