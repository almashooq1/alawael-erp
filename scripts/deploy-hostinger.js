#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════
 * Al-Awael ERP — Hostinger VPS Deployment Helper
 * نظام الأوائل — مساعد النشر على Hostinger VPS
 * ════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   node scripts/deploy-hostinger.js                # Full deploy guide
 *   node scripts/deploy-hostinger.js --check-only   # Check readiness only
 *   node scripts/deploy-hostinger.js --gen-secrets   # Generate JWT secrets
 *   node scripts/deploy-hostinger.js --gen-env       # Generate .env from template
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const HOSTINGER = path.join(ROOT, 'deploy', 'hostinger');

// Colors
const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const args = process.argv.slice(2);

// ═══════════════════════════════════════════════════════════════
// Generate Secrets
// ═══════════════════════════════════════════════════════════════
if (args.includes('--gen-secrets')) {
  console.log(`\n${C.bold}${C.cyan}🔐 توليد مفاتيح أمان عشوائية${C.reset}\n`);
  console.log(`JWT_SECRET=${crypto.randomBytes(64).toString('hex')}`);
  console.log(`JWT_REFRESH_SECRET=${crypto.randomBytes(64).toString('hex')}`);
  console.log(`SESSION_SECRET=${crypto.randomBytes(64).toString('hex')}`);
  console.log(`\n${C.dim}انسخ هذه القيم إلى ملف .env على السيرفر${C.reset}\n`);
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
// Generate .env from template
// ═══════════════════════════════════════════════════════════════
if (args.includes('--gen-env')) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(resolve => rl.question(q, resolve));

  (async () => {
    console.log(`\n${C.bold}${C.cyan}📝 إنشاء ملف .env للإنتاج${C.reset}\n`);

    const domain = await ask(`${C.yellow}أدخل الدومين (مثال: alawael.com): ${C.reset}`);
    const mongoUri = await ask(`${C.yellow}أدخل رابط MongoDB Atlas: ${C.reset}`);
    const email = await ask(`${C.yellow}أدخل بريد SMTP (Gmail): ${C.reset}`);
    const emailPass = await ask(`${C.yellow}أدخل كلمة مرور التطبيق (App Password): ${C.reset}`);
    rl.close();

    const template = fs.readFileSync(path.join(HOSTINGER, '.env.production'), 'utf8');
    const result = template
      .replace(/YOUR_DOMAIN\.com/g, domain)
      .replace('CHANGE_ME_MONGODB_ATLAS_URI', mongoUri)
      .replace('CHANGE_ME_JWT_SECRET', crypto.randomBytes(64).toString('hex'))
      .replace('CHANGE_ME_JWT_REFRESH_SECRET', crypto.randomBytes(64).toString('hex'))
      .replace('CHANGE_ME_SESSION_SECRET', crypto.randomBytes(64).toString('hex'))
      .replace('CHANGE_ME_EMAIL@gmail.com', email)
      .replace('CHANGE_ME_APP_PASSWORD', emailPass);

    const outPath = path.join(BACKEND, '.env.production.generated');
    fs.writeFileSync(outPath, result, 'utf8');
    console.log(`\n${C.green}✅ تم إنشاء الملف: ${outPath}${C.reset}`);
    console.log(`${C.yellow}   ارفعه للسيرفر: scp ${outPath} user@server:/home/alawael/app/backend/.env${C.reset}\n`);
  })();
  return;
}

// ═══════════════════════════════════════════════════════════════
// Readiness Check
// ═══════════════════════════════════════════════════════════════
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

console.log(`\n${C.bold}${C.blue}════════════════════════════════════════════════════════════${C.reset}`);
console.log(`${C.bold}${C.blue}  🚀 فحص جاهزية النشر على Hostinger VPS${C.reset}`);
console.log(`${C.bold}${C.blue}════════════════════════════════════════════════════════════${C.reset}`);

// ─── 1. Node Version ─────────────────────────────────────────
section('1. فحص البيئة');
const nodeMajor = parseInt(process.version.slice(1).split('.')[0], 10);
if (nodeMajor >= 18) pass(`Node.js ${process.version}`);
else fail(`Node.js ${process.version} — مطلوب >= 18`);

// ─── 2. Project Files ───────────────────────────────────────
section('2. ملفات المشروع');

const criticalFiles = [
  ['backend/server.js', 'نقطة الدخول'],
  ['backend/app.js', 'تهيئة Express'],
  ['backend/package.json', 'حزم Backend'],
  ['backend/package-lock.json', 'ملف القفل'],
  ['frontend/package.json', 'حزم Frontend'],
  ['deploy/hostinger/ecosystem.config.js', 'إعدادات PM2'],
  ['deploy/hostinger/.env.production', 'قالب البيئة'],
  ['deploy/hostinger/deploy.sh', 'سكربت النشر'],
  ['deploy/hostinger/setup-server.sh', 'سكربت الإعداد'],
  ['deploy/hostinger/nginx-alawael.conf', 'إعدادات Nginx'],
];

criticalFiles.forEach(([f, desc]) => {
  if (fs.existsSync(path.join(ROOT, f))) pass(`${desc} (${f})`);
  else fail(`${desc} مفقود (${f})`);
});

// ─── 3. Frontend Build ──────────────────────────────────────
section('3. بناء Frontend');
const buildDir = path.join(FRONTEND, 'build');
if (fs.existsSync(path.join(buildDir, 'index.html'))) {
  const stats = fs.statSync(path.join(buildDir, 'index.html'));
  const buildAge = (Date.now() - stats.mtimeMs) / 1000 / 60 / 60;
  pass(`Frontend مبني (Build age: ${buildAge.toFixed(1)} ساعة)`);
  if (buildAge > 24) warn('البناء قديم — أعد البناء: cd frontend && npm run build');
} else {
  fail('Frontend لم يُبنى — شغّل: cd frontend && npm run build');
}

// ─── 4. Environment Template ────────────────────────────────
section('4. ملف البيئة');
const envProd = path.join(HOSTINGER, '.env.production');
if (fs.existsSync(envProd)) {
  const content = fs.readFileSync(envProd, 'utf8');
  if (content.includes('CHANGE_ME')) {
    pass('قالب البيئة جاهز (يحتاج تعبئة على السيرفر)');
  } else {
    pass('ملف البيئة معبأ');
  }
} else {
  fail('قالب البيئة مفقود');
}

// Check frontend env
const frontendEnvProd = path.join(FRONTEND, '.env.production');
if (fs.existsSync(frontendEnvProd)) {
  const content = fs.readFileSync(frontendEnvProd, 'utf8');
  if (content.includes('YOUR_DOMAIN.com')) {
    warn('frontend/.env.production يحتوي على YOUR_DOMAIN.com — غيّره قبل البناء');
  } else {
    pass('Frontend .env.production مُعدّ');
  }
} else {
  fail('frontend/.env.production مفقود');
}

// ─── 5. GitHub Actions ──────────────────────────────────────
section('5. CI/CD (GitHub Actions)');
const cicdFile = path.join(ROOT, '.github', 'workflows', 'deploy-hostinger.yml');
if (fs.existsSync(cicdFile)) {
  pass('GitHub Actions workflow موجود (deploy-hostinger.yml)');
  info('Secrets مطلوبة في GitHub: VPS_HOST, VPS_USER, VPS_SSH_KEY, DOMAIN');
} else {
  warn('deploy-hostinger.yml غير موجود');
}

// ─── 6. SSH Key Check ───────────────────────────────────────
section('6. اتصال SSH');
try {
  execSync('ssh -V', { encoding: 'utf8', stdio: 'pipe' });
  pass('SSH client متاح');
} catch {
  warn('SSH client غير متاح — تأكد من تثبيته');
}

try {
  execSync('scp --help 2>&1', { encoding: 'utf8', stdio: 'pipe' });
  pass('SCP متاح لنقل الملفات');
} catch {
  try {
    execSync('where scp', { encoding: 'utf8', stdio: 'pipe' });
    pass('SCP متاح');
  } catch {
    info('SCP غير متاح — يمكنك استخدام FileZilla بدلاً منه');
  }
}

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log(`\n${C.bold}${'═'.repeat(60)}${C.reset}`);
console.log(`${C.bold}  📊 ملخص فحص Hostinger  ${C.reset}`);
console.log(`${'═'.repeat(60)}`);
console.log(`  ${C.green}✅ نجح: ${passed}${C.reset}`);
console.log(`  ${C.yellow}⚠️  تحذيرات: ${warnings}${C.reset}`);
console.log(`  ${C.red}❌ أخطاء: ${errors}${C.reset}`);
console.log(`${'═'.repeat(60)}`);

if (args.includes('--check-only')) {
  process.exit(errors > 0 ? 1 : 0);
}

// ═══════════════════════════════════════════════════════════════
// Deployment Guide
// ═══════════════════════════════════════════════════════════════
console.log(`
${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════${C.reset}
${C.bold}${C.cyan}  📋 خطوات النشر على Hostinger VPS${C.reset}
${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════${C.reset}

${C.bold}الخطوة 1: إعداد MongoDB Atlas (مجاني)${C.reset}
  ${C.dim}افتح https://cloud.mongodb.com وأنشئ قاعدة بيانات M0 مجانية${C.reset}
  ${C.dim}اختر المنطقة: eu-central-1 (Frankfurt) — الأقرب للسعودية${C.reset}

${C.bold}الخطوة 2: توليد المفاتيح${C.reset}
  ${C.yellow}npm run deploy:hostinger -- --gen-secrets${C.reset}

${C.bold}الخطوة 3: إنشاء ملف .env تلقائياً${C.reset}
  ${C.yellow}npm run deploy:hostinger -- --gen-env${C.reset}

${C.bold}الخطوة 4: بناء Frontend${C.reset}
  ${C.dim}عدّل frontend/.env.production — غيّر YOUR_DOMAIN.com بدومينك${C.reset}
  ${C.yellow}cd frontend && npm run build && cd ..${C.reset}

${C.bold}الخطوة 5: الاتصال بالسيرفر وإعداده${C.reset}
  ${C.yellow}ssh root@IP_السيرفر${C.reset}
  ${C.yellow}mkdir -p /home/alawael/app${C.reset}

${C.bold}الخطوة 6: رفع الملفات (من جهازك)${C.reset}
  ${C.yellow}scp -r backend/ root@IP:/home/alawael/app/backend/${C.reset}
  ${C.yellow}scp -r frontend/ root@IP:/home/alawael/app/frontend/${C.reset}
  ${C.yellow}scp -r deploy/ root@IP:/home/alawael/app/deploy/${C.reset}

${C.bold}الخطوة 7: إعداد السيرفر (على السيرفر - مرة واحدة)${C.reset}
  ${C.yellow}cd /home/alawael/app${C.reset}
  ${C.yellow}sudo bash deploy/hostinger/setup-vps-cicd.sh${C.reset}

${C.bold}الخطوة 8: ضبط .env (على السيرفر)${C.reset}
  ${C.yellow}cp deploy/hostinger/.env.production backend/.env${C.reset}
  ${C.yellow}nano backend/.env${C.reset}
  ${C.dim}← ضع رابط MongoDB Atlas والمفاتيح من الخطوة 2 و 3${C.reset}

${C.bold}الخطوة 9: نشر التطبيق (على السيرفر)${C.reset}
  ${C.yellow}sudo -u alawael bash deploy/hostinger/deploy.sh${C.reset}

${C.bold}الخطوة 10: التحقق${C.reset}
  ${C.yellow}curl https://yourdomain.com/health${C.reset}
  ${C.yellow}pm2 list${C.reset}
  ${C.yellow}pm2 logs alawael-api${C.reset}

${C.bold}${C.green}🔄 للنشر التلقائي عبر GitHub:${C.reset}
  أضف هذه Secrets في GitHub → Settings → Secrets → Actions:
  ${C.cyan}VPS_HOST${C.reset}     = IP السيرفر
  ${C.cyan}VPS_USER${C.reset}     = alawael
  ${C.cyan}VPS_SSH_KEY${C.reset}  = المفتاح الخاص (من الخطوة 7)
  ${C.cyan}DOMAIN${C.reset}       = دومينك (مثال: alawael.com)
  ثم: ${C.yellow}git push origin main${C.reset} ← سيبدأ النشر تلقائياً!
`);

process.exit(errors > 0 ? 1 : 0);
