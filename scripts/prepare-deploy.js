#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════
 * Al-Awael ERP — Production Deployment Preparation Script
 * نظام الأوائل — سكربت تجهيز المشروع للنشر
 * ════════════════════════════════════════════════════════════════
 *
 * Usage: node scripts/prepare-deploy.js [--fix] [--docker]
 *
 * Checks:
 *  1. Node.js version
 *  2. Environment variables
 *  3. Dependencies (no dev in production)
 *  4. Build artifacts
 *  5. Security audit
 *  6. Docker configuration
 *  7. File permissions & structure
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');
const checkDocker = args.includes('--docker');

let errors = 0;
let warnings = 0;
let passed = 0;

function pass(msg) {
  console.log(`  ${C.green}✅ ${msg}${C.reset}`);
  passed++;
}
function warn(msg) {
  console.log(`  ${C.yellow}⚠️  ${msg}${C.reset}`);
  warnings++;
}
function fail(msg) {
  console.log(`  ${C.red}❌ ${msg}${C.reset}`);
  errors++;
}
function info(msg) {
  console.log(`  ${C.dim}ℹ  ${msg}${C.reset}`);
}
function section(title) {
  console.log(`\n${C.bold}${C.cyan}━━━ ${title} ━━━${C.reset}`);
}

// ═══════════════════════════════════════════════════════════════
// 1. Node.js & npm Version
// ═══════════════════════════════════════════════════════════════
section('1. فحص إصدار Node.js و npm');

const nodeVersion = process.version;
const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0], 10);
if (nodeMajor >= 18) {
  pass(`Node.js ${nodeVersion} (مطلوب >= 18)`);
} else {
  fail(`Node.js ${nodeVersion} — مطلوب الإصدار 18 أو أعلى`);
}

try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  const npmMajor = parseInt(npmVersion.split('.')[0], 10);
  if (npmMajor >= 9) {
    pass(`npm v${npmVersion} (مطلوب >= 9)`);
  } else {
    warn(`npm v${npmVersion} — يُفضل الإصدار 9+`);
  }
} catch {
  fail('npm غير مثبت');
}

// ═══════════════════════════════════════════════════════════════
// 2. Environment Configuration
// ═══════════════════════════════════════════════════════════════
section('2. فحص ملفات البيئة');

const envFile = path.join(BACKEND, '.env');
const envExample = path.join(BACKEND, '.env.example');

if (fs.existsSync(envFile)) {
  pass('ملف backend/.env موجود');

  const envContent = fs.readFileSync(envFile, 'utf8');

  // Check for placeholder values
  const placeholders = ['change-me', 'CHANGE_ME', 'your_', 'YOUR_DOMAIN.com', 'USERNAME:PASSWORD', 'sk_test_', 'pk_test_'];
  const foundPlaceholders = placeholders.filter(p => envContent.includes(p));
  if (foundPlaceholders.length > 0) {
    fail(`ملف .env يحتوي على قيم افتراضية يجب تغييرها: ${foundPlaceholders.join(', ')}`);
  } else {
    pass('لا توجد قيم افتراضية في ملف .env');
  }

  // Check critical vars
  const criticalVars = ['MONGODB_URI', 'JWT_SECRET', 'FRONTEND_URL'];
  const missingVars = criticalVars.filter(v => !envContent.includes(`${v}=`));
  if (missingVars.length > 0) {
    fail(`متغيرات مفقودة: ${missingVars.join(', ')}`);
  } else {
    pass('جميع المتغيرات الحرجة موجودة');
  }

  // Check NODE_ENV
  if (envContent.includes('NODE_ENV=production')) {
    pass('NODE_ENV=production');
  } else {
    warn('NODE_ENV ليس production — تأكد من ضبطه قبل النشر');
  }

  // Check USE_MOCK_DB
  if (envContent.includes('USE_MOCK_DB=true')) {
    fail('USE_MOCK_DB=true — يجب أن يكون false في الإنتاج');
  }
} else {
  fail('ملف backend/.env غير موجود — انسخ من .env.example');
  info(`نسخ: cp ${envExample} ${envFile}`);
}

// ═══════════════════════════════════════════════════════════════
// 3. Dependencies Check
// ═══════════════════════════════════════════════════════════════
section('3. فحص التبعيات');

// Backend
const backendPkg = path.join(BACKEND, 'package.json');
if (fs.existsSync(backendPkg)) {
  const pkg = JSON.parse(fs.readFileSync(backendPkg, 'utf8'));
  const depCount = Object.keys(pkg.dependencies || {}).length;
  const devDepCount = Object.keys(pkg.devDependencies || {}).length;
  pass(`Backend: ${depCount} تبعية إنتاج, ${devDepCount} تبعية تطوير`);

  // Check for lock file
  if (fs.existsSync(path.join(BACKEND, 'package-lock.json'))) {
    pass('backend/package-lock.json موجود');
  } else {
    fail('backend/package-lock.json مفقود — شغّل npm install');
  }
} else {
  fail('backend/package.json غير موجود');
}

// Frontend
const frontendPkg = path.join(FRONTEND, 'package.json');
if (fs.existsSync(frontendPkg)) {
  const pkg = JSON.parse(fs.readFileSync(frontendPkg, 'utf8'));
  const depCount = Object.keys(pkg.dependencies || {}).length;
  pass(`Frontend: ${depCount} تبعية`);
}

// ═══════════════════════════════════════════════════════════════
// 4. Build Artifacts
// ═══════════════════════════════════════════════════════════════
section('4. فحص ملفات البناء');

const frontendBuild = path.join(FRONTEND, 'build');
if (fs.existsSync(frontendBuild)) {
  const indexHtml = path.join(frontendBuild, 'index.html');
  if (fs.existsSync(indexHtml)) {
    pass('Frontend build موجود (build/index.html)');
    const stats = fs.statSync(indexHtml);
    info(`آخر بناء: ${stats.mtime.toISOString()}`);
  } else {
    warn('مجلد build موجود لكن index.html مفقود — أعد البناء');
  }
} else {
  warn('Frontend لم يُبنى بعد — شغّل: cd frontend && npm run build');
}

// Check backend server.js exists
if (fs.existsSync(path.join(BACKEND, 'server.js'))) {
  pass('backend/server.js موجود');
} else {
  fail('backend/server.js مفقود');
}

// ═══════════════════════════════════════════════════════════════
// 5. Security Audit
// ═══════════════════════════════════════════════════════════════
section('5. فحص الأمان');

// Check .gitignore
const gitignore = path.join(ROOT, '.gitignore');
if (fs.existsSync(gitignore)) {
  const content = fs.readFileSync(gitignore, 'utf8');
  const requiredEntries = ['.env', 'node_modules', '*.pem', '*.key'];
  const missing = requiredEntries.filter(e => !content.includes(e));
  if (missing.length === 0) {
    pass('.gitignore يحتوي على جميع الاستثناءات المطلوبة');
  } else {
    warn(`.gitignore يفتقد: ${missing.join(', ')}`);
  }
} else {
  fail('.gitignore غير موجود');
}

// Check for exposed secrets in code
try {
  const result = execSync('findstr /r /s "sk_live_ pk_live_ AKIA password=" backend\\*.js 2>nul', { encoding: 'utf8', cwd: ROOT }).trim();
  if (result) {
    fail('تم العثور على أسرار مكشوفة في الكود!');
  }
} catch {
  pass('لم يتم العثور على أسرار مكشوفة في الكود');
}

// Check for SSL certificates in production
const sslDir = path.join(ROOT, 'certs');
if (fs.existsSync(sslDir) && fs.readdirSync(sslDir).length > 0) {
  pass('مجلد الشهادات (certs/) موجود');
} else {
  info('مجلد SSL فارغ — SSL يُدار عادةً بواسطة Nginx/Cloudflare');
}

// ═══════════════════════════════════════════════════════════════
// 6. Docker Configuration (optional)
// ═══════════════════════════════════════════════════════════════
if (checkDocker) {
  section('6. فحص Docker');

  // Check Dockerfile
  if (fs.existsSync(path.join(ROOT, 'Dockerfile'))) {
    pass('Dockerfile الرئيسي موجود');
  } else {
    fail('Dockerfile الرئيسي مفقود');
  }

  if (fs.existsSync(path.join(FRONTEND, 'Dockerfile'))) {
    pass('Frontend Dockerfile موجود');
  }

  // Check docker-compose files
  ['docker-compose.yml', 'docker-compose.professional.yml'].forEach(f => {
    if (fs.existsSync(path.join(ROOT, f))) {
      pass(`${f} موجود`);
    } else {
      warn(`${f} مفقود`);
    }
  });

  // Check .dockerignore
  if (fs.existsSync(path.join(ROOT, '.dockerignore'))) {
    pass('.dockerignore موجود');
  } else {
    warn('.dockerignore مفقود — قد يزيد حجم الصورة');
  }

  // Check Docker availability
  try {
    execSync('docker --version', { encoding: 'utf8' });
    pass('Docker مثبت');
    try {
      execSync('docker compose version', { encoding: 'utf8' });
      pass('Docker Compose متاح');
    } catch {
      warn('Docker Compose غير متاح');
    }
  } catch {
    warn('Docker غير مثبت على هذا الجهاز');
  }
} else {
  section('6. Docker (تم تخطيه — استخدم --docker للفحص)');
}

// ═══════════════════════════════════════════════════════════════
// 7. Project Structure
// ═══════════════════════════════════════════════════════════════
section('7. فحص هيكل المشروع');

const requiredDirs = [
  { path: 'backend', desc: 'الخلفية (Backend)' },
  { path: 'frontend', desc: 'الواجهة (Frontend)' },
  { path: 'backend/config', desc: 'إعدادات الخلفية' },
  { path: 'backend/routes', desc: 'مسارات API' },
  { path: 'backend/models', desc: 'نماذج قاعدة البيانات' },
  { path: 'backend/middleware', desc: 'الوسائط' },
];

requiredDirs.forEach(({ path: dirPath, desc }) => {
  if (fs.existsSync(path.join(ROOT, dirPath))) {
    pass(`${desc} (${dirPath}/)`);
  } else {
    fail(`${desc} مفقود (${dirPath}/)`);
  }
});

// Required files
const requiredFiles = [
  { path: 'backend/server.js', desc: 'نقطة الدخول' },
  { path: 'backend/app.js', desc: 'تهيئة Express' },
  { path: 'backend/ecosystem.config.js', desc: 'إعدادات PM2' },
  { path: 'Dockerfile', desc: 'Dockerfile الرئيسي' },
  { path: 'Procfile', desc: 'Procfile (Heroku/Railway)' },
];

requiredFiles.forEach(({ path: filePath, desc }) => {
  if (fs.existsSync(path.join(ROOT, filePath))) {
    pass(`${desc} (${filePath})`);
  } else {
    warn(`${desc} مفقود (${filePath})`);
  }
});

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log(`\n${C.bold}${'═'.repeat(60)}${C.reset}`);
console.log(`${C.bold}  📊 ملخص التجهيز للنشر  ${C.reset}`);
console.log(`${'═'.repeat(60)}`);
console.log(`  ${C.green}✅ نجح: ${passed}${C.reset}`);
console.log(`  ${C.yellow}⚠️  تحذيرات: ${warnings}${C.reset}`);
console.log(`  ${C.red}❌ أخطاء: ${errors}${C.reset}`);
console.log(`${'═'.repeat(60)}`);

if (errors > 0) {
  console.log(`\n${C.red}${C.bold}❌ المشروع غير جاهز للنشر — أصلح الأخطاء أعلاه${C.reset}`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n${C.yellow}${C.bold}⚠️  المشروع جاهز مبدئياً — راجع التحذيرات${C.reset}`);
  console.log(`\n${C.cyan}الخطوات التالية:${C.reset}`);
  console.log(`  1. أصلح التحذيرات إن أمكن`);
  console.log(`  2. ابنِ الواجهة: cd frontend && npm run build`);
  console.log(`  3. اختبر محلياً: cd backend && npm start`);
  console.log(`  4. انشر: docker compose up -d`);
  process.exit(0);
} else {
  console.log(`\n${C.green}${C.bold}✅ المشروع جاهز للنشر! 🚀${C.reset}`);
  console.log(`\n${C.cyan}أمر النشر:${C.reset}`);
  console.log(`  Docker: docker compose -f docker-compose.professional.yml up -d`);
  console.log(`  PM2:    cd backend && pm2 start ecosystem.config.js`);
  console.log(`  Heroku: git push heroku main`);
  process.exit(0);
}
