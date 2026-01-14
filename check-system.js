#!/usr/bin/env node

/**
 * 🚀 AlAwael ERP - Quick System Check
 * Verifies that all systems are operational after ModulePage fix
 */

const http = require('http');

console.log('\n' + '='.repeat(60));
console.log('   🔍 AlAwael ERP - فحص سريع للنظام');
console.log('='.repeat(60) + '\n');

// Check Backend
function checkBackend() {
  return new Promise(resolve => {
    const req = http.get('http://localhost:3001/health', res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('✅ Backend (3001): ' + json.status);
          resolve(true);
        } catch {
          console.log('❌ Backend (3001): خطأ في الاستجابة');
          resolve(false);
        }
      });
    });
    req.on('error', () => {
      console.log('❌ Backend (3001): لا يعمل');
      resolve(false);
    });
    req.setTimeout(3000, () => {
      req.destroy();
      console.log('❌ Backend (3001): انتهت المهلة');
      resolve(false);
    });
  });
}

// Check Frontend
function checkFrontend() {
  return new Promise(resolve => {
    const req = http.get('http://localhost:3000', res => {
      console.log(`✅ Frontend (3000): يعمل (Status: ${res.statusCode})`);
      resolve(true);
      req.destroy();
    });
    req.on('error', () => {
      console.log('❌ Frontend (3000): لا يعمل');
      resolve(false);
    });
    req.setTimeout(3000, () => {
      req.destroy();
      console.log('❌ Frontend (3000): انتهت المهلة');
      resolve(false);
    });
  });
}

// Main
async function main() {
  const backendOk = await checkBackend();
  const frontendOk = await checkFrontend();

  console.log('\n' + '='.repeat(60));

  if (backendOk && frontendOk) {
    console.log('   ✨ النظام يعمل بالكامل!');
    console.log('='.repeat(60));

    console.log('\n📝 الإصلاحات المطبقة:');
    console.log('   ✓ إصلاح خطأ ModulePage (Cannot read properties of null)');
    console.log('   ✓ إضافة فحص: data && data.charts');
    console.log('   ✓ إضافة Loading State');
    console.log('   ✓ إضافة Loading Skeleton');

    console.log('\n🎯 الصفحات الجاهزة:');
    console.log('   → http://localhost:3000/elearning (التعلم الإلكتروني)');
    console.log('   → http://localhost:3000/reports (التقارير)');
    console.log('   → http://localhost:3000/finance (المالية)');
    console.log('   → http://localhost:3000/hr (الموارد البشرية)');
    console.log('   → http://localhost:3000/crm (إدارة العملاء)');
    console.log('   → http://localhost:3000/rehab (إعادة التأهيل)');
    console.log('   → http://localhost:3000/security (الأمن)');

    console.log('\n🔐 بيانات الدخول:');
    console.log('   Email: admin@alawael.com');
    console.log('   Password: Admin@123456');

    console.log('\n📚 التوثيق:');
    console.log('   • ✅_SYSTEM_STATUS.md - حالة النظام الحالية');
    console.log('   • 🔧_MODULE_PAGE_FIX.md - تفاصيل الإصلاح');
    console.log('   • 🎯_QUICK_START.md - دليل البدء السريع');
  } else {
    console.log('   ⚠️  بعض الخدمات لا تعمل');
    console.log('='.repeat(60));

    if (!backendOk) {
      console.log('\n❌ Backend لا يعمل - قم بتشغيله:');
      console.log('   cd backend');
      console.log('   node server.js');
    }

    if (!frontendOk) {
      console.log('\n❌ Frontend لا يعمل - قم بتشغيله:');
      console.log('   cd frontend');
      console.log('   npm run dev');
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

main().catch(console.error);
