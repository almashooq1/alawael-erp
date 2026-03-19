#!/usr/bin/env node
/* eslint-disable no-unused-vars, no-undef, no-empty, prefer-const, no-constant-condition, no-unused-expressions */

/**
 * تشخيص سريع وتقرير شامل لحالة الاختبارات
 * يساعد في تحديد أهم المشاكل التي تحتاج إصلاح فوري
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n📊 === بدء التشخيص الشامل للمشروع === 📊\n');

// 1. عد الملفات
const testDir = path.join(__dirname, 'backend', '__tests__');
const testFiles = fs
  .readdirSync(testDir)
  .filter(f => f.endsWith('.test.js') || f.endsWith('.integration.test.js')).length;

console.log(`📁 عدد ملفات الاختبارات: ${testFiles}`);

// 2. الحصول على آخر نتائج الاختبارات
try {
  console.log('\n🧪 تشغيل الاختبارات (بدون تغطية)...');
  const testOutput = execSync(
    'npm test -- --passWithNoTests --testTimeout=5000 2>&1 | tail -n 30',
    { cwd: path.join(__dirname, 'backend'), encoding: 'utf-8', stdio: 'pipe' }
  );

  // استخراج النتائج
  const lines = testOutput.split('\n');
  const passedMatch = testOutput.match(/(\d+) passed/);
  const failedMatch = testOutput.match(/(\d+) failed/);

  console.log(`\n✅ Passed: ${passedMatch ? passedMatch[1] : '?'}`);
  console.log(`❌ Failed: ${failedMatch ? failedMatch[1] : '?'}`);
} catch (error) {
  console.log('⚠️  لم يتمكن من الحصول على نتائج الاختبارات');
}

// 3. فحص الملفات المهمة
console.log('\n📋 === فحص الملفات الحرجة === 📋\n');

const criticalFiles = [
  'backend/server.js',
  'backend/models/User.js',
  'backend/middleware/auth.middleware.js',
  'backend/utils/seedDatabase.js',
];

criticalFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const size = fs.statSync(fullPath).size;
    console.log(`✅ ${file.split('/').pop()} - ${(size / 1024).toFixed(1)} KB`);
  } else {
    console.log(`❌ ${file.split('/').pop()} - غير موجود`);
  }
});

// 4. فحص المشاكل الشائعة
console.log('\n🔍 === فحص المشاكل الشائعة === 🔍\n');

const problems = [];

// فحص status code patterns
const routeFiles = fs
  .readdirSync(testDir)
  .filter(f => f.includes('routes') || f.includes('route'))
  .slice(0, 3); // فحص أول 3 ملفات فقط

routeFiles.forEach(file => {
  const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
  if (content.includes('expect([200, 400, 401, 403]')) {
    problems.push(`❌ ${file}: قد يحتاج تحديث status codes`);
  }
  if (content.match(/response\.\w+\((\d+)\)/)) {
    problems.push(`⚠️  ${file}: يحتوي على response status hardcoded`);
  }
});

if (problems.length > 0) {
  problems.forEach(p => console.log(p));
} else {
  console.log('✅ لم يتم العثور على مشاكل شائعة واضحة');
}

// 5. ملخص التوصيات
console.log('\n🎯 === التوصيات === 🎯\n');
console.log('1. ✅ تشغيل: npm test -- --no-coverage');
console.log('2. ✅ فحص الحالات الفاشلة بالتفصيل');
console.log('3. ✅ تحديث expectations للـ status codes');
console.log('4. ✅ التحقق من response formats');
console.log('5. ✅ إعادة تشغيل الاختبارات للتأكد');

console.log('\n✨ انتهى التشخيس السريع ✨\n');
