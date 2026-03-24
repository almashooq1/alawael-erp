#!/usr/bin/env node

/**
 * 🚀 QUICK START - البدء السريع
 * نظام النسخ الاحتياطية والاسترجاع
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

console.clear();
console.log(`
${colors.blue}╔═══════════════════════════════════════════════════════════════════╗${colors.reset}
${colors.blue}║                                                                   ║${colors.reset}
${colors.blue}║        🎉 نظام النسخ الاحتياطية الذكي - البدء السريع              ║${colors.reset}
${colors.blue}║                                                                   ║${colors.reset}
${colors.blue}╚═══════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.green}✅ النظام مُثبت وجاهز للاستخدام!${colors.reset}

${colors.cyan}📚 الأوامر المتاحة:${colors.reset}

${colors.yellow}1. النسخ الاحتياطية:${colors.reset}
   ${colors.green}npm run backup:daily${colors.reset}        - نسخة يومية الآن
   ${colors.green}npm run backup:weekly${colors.reset}       - نسخة أسبوعية الآن
   ${colors.green}npm run backup:monthly${colors.reset}      - نسخة شهرية الآن
   ${colors.green}npm run backup:start${colors.reset}        - بدء الجدولة التلقائية
   ${colors.green}npm run backup:stats${colors.reset}        - عرض الإحصائيات

${colors.yellow}2. الاسترجاع:${colors.reset}
   ${colors.green}npm run restore${colors.reset}             - استرجاع تفاعلي (موصى به)
   ${colors.green}npm run restore:list${colors.reset}        - عرض النسخ المتاحة
   ${colors.green}npm run restore:test FILE${colors.reset}   - اختبار الاسترجاع
   ${colors.green}npm run restore:verify FILE${colors.reset} - التحقق من السلامة

${colors.cyan}🚀 البدء السريع (5 دقائق):${colors.reset}

${colors.magenta}الخطوة 1: إنشاء نسخة احتياطية فوراً${colors.reset}
  $ cd backend
  $ npm run backup:daily

${colors.magenta}الخطوة 2: عرض الإحصائيات${colors.reset}
  $ npm run backup:stats

${colors.magenta}الخطوة 3: بدء الجدولة التلقائية${colors.reset}
  $ npm run backup:start
  # سيعمل تلقائياً في الأوقات المحددة
  # 03:00 صباحاً - نسخة يومية
  # 04:00 صباحاً - نسخة أسبوعية (الأحد)
  # 05:00 صباحاً - نسخة شهرية (1 من الشهر)

${colors.cyan}📖 للمزيد من المعلومات:${colors.reset}
  • اقرأ: 📚_BACKUP_SYSTEM_COMPLETE_GUIDE.md
  • أو: 🎊_PHASE_2_COMPLETION_REPORT.md

${colors.cyan}❓ أسئلة شائعة:${colors.reset}
  س: هل يمكن استرجاع البيانات؟
  ج: نعم! اكتب: npm run restore

  س: هل البيانات آمنة؟
  ج: نعم تماماً! مشفرة بـ AES-256

  س: كم حجم النسخة الاحتياطية؟
  ج: حوالي 150 MB (بعد الضغط)

${colors.cyan}🔧 المتطلبات:${colors.reset}
  ✓ MongoDB مُثبت وعامل
  ✓ Node.js 14+
  ✓ مساحة تخزين كافية (>500 MB)

${colors.cyan}🎯 الخطوة التالية:${colors.reset}
  1. اختبر النسخة: npm run restore:test
  2. اطلع على التوثيق الكامل
  3. اطلب المساعدة إذا احتجت

${colors.green}✅ كل شيء جاهز!${colors.reset}

${colors.blue}═══════════════════════════════════════════════════════════════════${colors.reset}
${colors.blue}آخر تحديث: 31 يناير 2026 | النسخة: 2.0 | الحالة: مكتمل${colors.reset}
${colors.blue}═══════════════════════════════════════════════════════════════════${colors.reset}
`);
