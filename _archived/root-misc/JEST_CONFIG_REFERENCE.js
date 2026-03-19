/**
 * ============================================================
 * ⚙️ Jest Configuration - أفضل الممارسات الموحدة
 * ============================================================
 * 
 * نسخ هذا الملف إلى جميع المشاريع
 * ثم عدّل حسب احتياجات كل مشروع
 * 
 * للـ CommonJS (Node.js Backend):
 *   أسم الملف: jest.config.js
 * 
 * للـ ES Modules:
 *   أسم الملف: jest.config.js + package.json: "type": "module"
 */

module.exports = {
  // ============================================================
  // 🎯 الإعدادات الأساسية
  // ============================================================

  // بيئة الاختبار
  testEnvironment: 'node',

  // مجلدات البحث عن الاختبارات
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // أنماط أسماء ملفات الاختبار
  testMatch: [
    '**/__tests__/**/*.test.{js,ts}',
    '**/?(*.)+(spec|test).{js,ts}',
    'tests/**/*.test.{js,ts}',
  ],

  // امتدادات الملفات المدعومة
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // ============================================================
  // 🔄 التحويلات والـ Transforms
  // ============================================================

  // تحويل الملفات
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
    '^.+\\.jsx?$': 'babel-jest',
  },

  // تجاهل التحويل للمكتبات المحددة
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@testing-library)/)',
  ],

  // ============================================================
  // 📊 تغطية الكود (Code Coverage)
  // ============================================================

  // جمع معلومات التغطية
  collectCoverage: false,

  // المجلدات المراد جمع التغطية منها
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    'src/**/*.{jsx,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,ts}',
    '!src/index.{js,ts}',
    '!src/main.{js,ts}',
    '!src/**/*.types.{js,ts}',
    '!src/generated/**',
  ],

  // مراقبة التغطية
  coverageReporters: [
    'text',                // في الـ console
    'text-summary',        // ملخص في الـ console
    'html',                // تقرير HTML (coverage/index.html)
    'lcov',                // لـ codecov
    'json',                // JSON للـ tools
  ],

  // الحد الأدنى للتغطية المطلوبة
  coverageThreshold: {
    global: {
      branches: 80,        // 80% من الـ branches
      functions: 80,       // 80% من الـ functions
      lines: 80,           // 80% من الـ lines
      statements: 80,      // 80% من الـ statements
    },
  },

  // ============================================================
  // 🔧 الإعدادات المتقدمة
  // ============================================================

  // مجلد الـ cache
  cacheDirectory: '<rootDir>/.jest-cache',

  // مسح الـ mocks بعد كل اختبار
  clearMocks: true,

  // استعادة الـ mocks الأصلية
  restoreMocks: true,

  // عدد الـ workers (العمليات المتوازية)
  maxWorkers: '50%',

  // timeout للاختبارات بالـ milliseconds
  testTimeout: 10000,

  // verbose output
  verbose: true,

  // إيقاف التشغيل عند أول فشل (اختياري)
  bail: 0,

  // ============================================================
  // 📦 نمaping المجلدات والـ Aliases
  // ============================================================

  moduleNameMapper: {
    // مثال: ربط الـ styles
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',

    // مثال: ربط الـ assets
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/__mocks__/fileMock.js',

    // مثال: ربط path aliases (تحتاج نفس الـ config في tsconfig.json)
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
  },

  // ============================================================
  // 🛠️ إعدادات الـ Setup
  // ============================================================

  // ملفات الإعداد قبل التشغيل
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
  ],

  // ============================================================
  // 🧩 إضافات اختيارية
  // ============================================================

  // استخدام globals (describe, it, expect بدون import)
  testEnvironmentOptions: {
    NODE_OPTIONS: '--max-old-space-size=2048',
  },

  // watchPathIgnorePatterns (للـ watch mode)
  watchPathIgnorePatterns: [
    'node_modules',
    'dist',
    'coverage',
  ],

  // notifyMode (إشعارات على نتائج الاختبارات)
  notifyMode: 'failure-change',
};

/**
 * ============================================================
 * 📝 jest.setup.js - ملف الإعداد
 * ============================================================
 */

// مثال على محتوى jest.setup.js:
/*
// تجاهل التحذيرات المحددة
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// إضافة matchers مخصصة
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
*/

/**
 * ============================================================
 * 📝 __mocks__/fileMock.js
 * ============================================================
 */

// مثال على محتوى __mocks__/fileMock.js:
/*
module.exports = 'test-file-stub';
*/

/**
 * ============================================================
 * 🔧 أوامر npm مقترحة (package.json)
 * ============================================================
 */

/*
{
  "scripts": {
    // تشغيل الاختبارات مرة واحدة
    "test": "jest",

    // تشغيل الاختبارات بـ watch mode
    "test:watch": "jest --watch",

    // تشغيل الاختبارات مع coverage
    "test:coverage": "jest --coverage",

    // تشغيل الاختبارات في debug mode
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",

    // تشغيل اختبار محدد فقط
    "test:single": "jest --testNamePattern='^(.*should work.*)'",

    // تحديث snapshots
    "test:update-snapshots": "jest --updateSnapshot",

    // اختبارات محددة فقط
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e"
  }
}
*/

/**
 * ============================================================
 * 🎓 إعدادات حسب نوع المشروع
 * ============================================================
 */

// Backend (Node.js) - JSON Config:
/*
{
  "testEnvironment": "node",
  "coverageThreshold": {
    "global": {
      "branches": 85,
      "functions": 85,
      "lines": 85,
      "statements": 85
    }
  }
}
*/

// Frontend (React) - JSON Config:
/*
{
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
  "moduleNameMapper": {
    "\\.(css|less|scss)$": "identity-obj-proxy"
  },
  "collectCoverageFrom": [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/index.js",
    "!src/reportWebVitals.js"
  ]
}
*/

// React Native:
/*
{
  "preset": "react-native",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"]
}
*/

/**
 * ============================================================
 * 🚀 نصائح لتحسين الأداء
 * ============================================================
 */

/*
1. استخدم maxWorkers لتوازي التنفيذ:
   maxWorkers: '50%'

2. قلل testTimeout للاختبارات السريعة:
   testTimeout: 5000  // بدلاً من 30000

3. استخدم --bail لإيقاف عند أول فشل:
   jest --bail
   jest --bail 1  // إيقاف بعد 1 فشل

4. استخدم --coverage فقط عند الحاجة:
   npm run test:coverage

5. استخدم --watch عند التطوير:
   npm run test:watch

6. استخدم testPathPattern للاختبارات المحددة:
   jest --testPathPattern=auth

7. استخدم testNamePattern للـ tests المحددة:
   jest --testNamePattern="should validate email"

8. أغلق database/servers بشكل صحيح:
   afterAll(async () => {
     await db.close();
     await server.close();
   });
*/

/**
 * ============================================================
 * 🐛 حل المشاكل الشائعة
 * ============================================================
 */

/*
مشكلة: "Cannot find module 'X'"
الحل: تأكد من moduleNameMapper في jest.config.js

مشكلة: "Jest timeout exceeded"
الحل: زد testTimeout أو أغلق resources بشكل صحيح

مشكلة: "Memory leak in test"
الحل: أضف --forceExit أو أغلق servers/connections

مشكلة: "Tests running in parallel conflict"
الحل: استخدم --runInBand لتشغيل متسلسل

مشكلة: "Module mock not working"
الحل: ضع jest.mock() في أعلى الملف قبل imports

مشكلة: "Coverage threshold not met"
الحل: اكتب اختبارات أكثر أو قلل التوقع coverageThreshold
*/
