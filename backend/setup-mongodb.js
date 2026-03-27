#!/usr/bin/env node

/**
 * 🚀 MongoDB Setup Interactive Script
 * اختيار سريع وتثبيت آني لـ MongoDB
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = query => new Promise(resolve => { rl.question(query, resolve); })

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

const log = {
  info: msg => console.log(`${COLORS.cyan}ℹ ${msg}${COLORS.reset}`),
  success: msg => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
  warning: msg => console.log(`${COLORS.yellow}⚠️  ${msg}${COLORS.reset}`),
  error: msg => console.log(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
  title: msg => console.log(`\n${COLORS.bright}${COLORS.blue}${msg}${COLORS.reset}\n`),
};

async function main() {
  log.title('🌟 MongoDB Setup Interactive Guide');

  console.log('اختر الخيار المناسب لك:\n');
  console.log('  1️⃣  MongoDB Atlas (مجاني - موصى به)');
  console.log('  2️⃣  Hostinger (إذا كان عندك استضافة)');
  console.log('  3️⃣  Docker (تشغيل محلي)\n');

  const choice = await question('اختر رقم (1/2/3): ');

  switch (choice.trim()) {
    case '1':
      await setupAtlas();
      break;
    case '2':
      await setupHostinger();
      break;
    case '3':
      await setupDocker();
      break;
    default:
      log.error('اختيار غير صحيح!');
      rl.close();
      return;
  }

  rl.close();
}

async function setupAtlas() {
  log.title('📌 MongoDB Atlas Setup');

  log.info('اتبع هذه الخطوات:');
  console.log(`
  1. اذهب إلى: ${COLORS.cyan}https://www.mongodb.com/cloud/atlas${COLORS.reset}
  2. اضغط "Sign Up" وأنشئ حساب مجاني
  3. أنشئ project جديد
  4. اضغط "Create Deployment" واختر "Free"
  5. اختر المنطقة (اختر الأقرب لموقعك)
  6. انتظر التهيئة (حوالي 5-10 دقائق)
  7. اضغط "Connect"
  8. انسخ Connection String
  9. ضعها في backend/.env
  `);

  const connectionString = await question('\nأدخل Connection String من MongoDB Atlas:\n> ');

  if (!connectionString.trim()) {
    log.error('لم تدخل Connection String!');
    return;
  }

  await updateEnvFile(connectionString);
  await finalizeSetup();
}

async function setupHostinger() {
  log.title('🏢 Hostinger Setup');

  log.info('اتبع هذه الخطوات:');
  console.log(`
  1. سجل الدخول لـ Hostinger Control Panel
  2. اذهب إلى: Database → MongoDB
  3. اضغط "Create Database"
  4. أدخل البيانات المطلوبة
  5. انسخ Connection String
  6. ضعها في backend/.env
  `);

  const connectionString = await question('\nأدخل Connection String من Hostinger:\n> ');

  if (!connectionString.trim()) {
    log.error('لم تدخل Connection String!');
    return;
  }

  await updateEnvFile(connectionString);
  await finalizeSetup();
}

async function setupDocker() {
  log.title('🐳 Docker MongoDB Setup');

  log.info('تشغيل MongoDB محلياً باستخدام Docker...\n');

  const command = 'docker run -d -p 27017:27017 --name mongodb-local mongo';

  console.log(`تشغيل الأمر:\n${COLORS.yellow}${command}${COLORS.reset}\n`);

  const connectionString = 'mongodb://localhost:27017/alawael-db?directConnection=true';

  log.success(`Connection String: ${connectionString}`);

  await updateEnvFile(connectionString);
  await finalizeSetup();
}

async function updateEnvFile(connectionString) {
  const envPath = path.join(__dirname, '../.env');

  if (!fs.existsSync(envPath)) {
    log.error(`لم أجد الملف: ${envPath}`);
    return;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');

  // تحديث المتغيرات
  if (envContent.includes('USE_MOCK_DB=')) {
    envContent = envContent.replace(/USE_MOCK_DB=.*/g, 'USE_MOCK_DB=false');
  } else {
    envContent += '\nUSE_MOCK_DB=false';
  }

  if (envContent.includes('MONGODB_URI=')) {
    envContent = envContent.replace(/MONGODB_URI=.*/g, `MONGODB_URI=${connectionString}`);
  } else {
    envContent += `\nMONGODB_URI=${connectionString}`;
  }

  if (envContent.includes('DISABLE_MOCK_FALLBACK=')) {
    envContent = envContent.replace(/DISABLE_MOCK_FALLBACK=.*/g, 'DISABLE_MOCK_FALLBACK=true');
  } else {
    envContent += '\nDISABLE_MOCK_FALLBACK=true';
  }

  fs.writeFileSync(envPath, envContent);
  log.success('تم تحديث .env ✓');
}

async function finalizeSetup() {
  log.title('🎯 الخطوات التالية');

  console.log(`
  1. تشغيل الخادم:
     ${COLORS.yellow}cd backend${COLORS.reset}
     ${COLORS.yellow}npm run dev${COLORS.reset}

  2. فحص الاتصال:
     ${COLORS.yellow}npm run db:validate${COLORS.reset}

  3. يجب ترى ✅ النجاح:
     ${COLORS.green}✅ Database Connection: SUCCESS${COLORS.reset}
     ${COLORS.green}✅ Database Mode: MongoDB${COLORS.reset}
     ${COLORS.green}✅ Status: ALL CHECKS PASSED${COLORS.reset}
  `);

  log.success('تم التثبيت! 🎉');
}

main().catch(err => {
  log.error(`خطأ: ${err.message}`);
  rl.close();
});
