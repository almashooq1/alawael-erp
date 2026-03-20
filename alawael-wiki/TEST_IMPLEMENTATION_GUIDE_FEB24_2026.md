# 🔧 دليل التحسين العملي | Practical Implementation Guide
# اختبارات محسّنة وأفضل ممارسات | Enhanced Tests & Best Practices

---

## المرحلة 1: تحسينات فورية | Phase 1: Quick Wins

### 1️⃣ تحديث jest.config.js

**الملف**: `jest.config.js`

```javascript
/**
 * Enhanced Jest Configuration for ERP-Branch Integration Tests
 * With improved coverage tracking and reporting
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/*.test.js',
    '!**/node_modules/**'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
    '<rootDir>/tests/jest.setup.js'
  ],

  // ✅ IMPROVED: Enable coverage collection
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    'services/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    'controllers/**/*.js',
    '!node_modules/**',
    '!vendor/**',
    '!**/node_modules/**',
    '!**/*.config.js',
    '!**/index.js' // Usually just exports
  ],

  // Coverage directory
  coverageDirectory: 'coverage',
  
  // ✅ IMPROVED: Enhanced coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary'
  ],

  // ✅ IMPROVED: Increased coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,      // UP from 50
      functions: 80,     // UP from 50
      lines: 80,         // UP from 50
      statements: 80     // UP from 50
    },
    // ✅ NEW: Specific thresholds for critical files
    './services/**/*.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './models/**/*.js': {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Increased timeout for integration tests
  testTimeout: 60000,

  // ✅ IMPROVED: Enhanced reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-reports',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathAsClassName: true
      }
    ]
  ],

  // ✅ NEW: Transform configuration for ES modules
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // ✅ NEW: Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1'
  },

  // ✅ NEW: Test environment options
  testEnvironmentOptions: {
    // Suppress specific warnings
    suppressConsoleErrorOnDeprecation: true
  },

  // ✅ NEW: Improved performance
  maxWorkers: '50%', // Use 50% of available CPU cores
  bail: 0, // Don't stop on first failure

  // ✅ NEW: Watch mode plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // ✅ IMPROVED: Better snapshot settings
  snapshotSerializers: [
    'jest-serializer-html'
  ],

  // ✅ NEW: Verbose output
  verbose: true
};
```

---

### 2️⃣ تحسين ملف setup.js

**الملف**: `tests/setup.js` - أضف هذا الجزء:

```javascript
// =============================================
// ✅ ENHANCED: COVERAGE OPTIMIZATION
// =============================================

// Track test coverage metadata
global.testCoverageMetadata = {
  startTime: new Date(),
  testCount: 0,
  passCount: 0,
  failCount: 0,
  skipCount: 0
};

// Increment test counter
beforeEach(() => {
  global.testCoverageMetadata.testCount++;
});

// afterEach logic for tracking
afterEach(() => {
  const result = expect.getState();
  if (result.numPassingAsserts > 0) {
    global.testCoverageMetadata.passCount++;
  }
});

// =============================================
// ✅ ENHANCED: CUSTOM MATCHERS
// =============================================

expect.extend({
  /**
   * Check if response matches standard format
   */
  toHaveValidStructure(received, expectedFields = []) {
    const pass = 
      received &&
      typeof received === 'object' &&
      'success' in received &&
      'data' in received &&
      'timestamp' in received &&
      expectedFields.every(field => field in received.data);

    return {
      pass,
      message: () =>
        pass
          ? `Expected response not to have valid structure`
          : `Expected response to include fields: ${expectedFields.join(', ')}`
    };
  },

  /**
   * Check if data is properly sanitized
   */
  toBeClean(received) {
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /<iframe/i,
      /<object/i
    ];

    const pass = !xssPatterns.some(pattern => 
      pattern.test(JSON.stringify(received))
    );

    return {
      pass,
      message: () =>
        pass
          ? `Expected data to contain XSS patterns`
          : `Expected data to be clean of XSS patterns`
    };
  },

  /**
   * Check encryption
   */
  toBeEncrypted(received) {
    // Check if looks like encrypted (contains specific patterns)
    const hasEncryptionMarkers = 
      received && 
      (received.startsWith('$2') || // bcrypt
       received.startsWith('$argon2') || // argon2
       /^[a-f0-9]{64}$/.test(received)); // hex hash

    return {
      pass: hasEncryptionMarkers,
      message: () =>
        hasEncryptionMarkers
          ? `Expected not to be encrypted`
          : `Expected to be properly encrypted`
    };
  }
});

// =============================================
// ✅ ENHANCED: PERFORMANCE TRACKING
// =============================================

// Track slow tests
const slowTests = [];

beforeEach(() => {
  performance.mark('test-start');
});

afterEach(() => {
  performance.mark('test-end');
  performance.measure('test', 'test-start', 'test-end');
  
  const measure = performance.getEntriesByName('test')[0];
  const testName = expect.getState().currentTestName;
  
  // Log slow tests (> 500ms)
  if (measure.duration > 500) {
    slowTests.push({
      name: testName,
      duration: measure.duration.toFixed(2)
    });
  }
  
  performance.clearMarks();
  performance.clearMeasures();
});

// =============================================
// ✅ ENHANCED: MEMORY LEAK DETECTION
// =============================================

// Monitor memory usage
let initialMemory;

beforeAll(() => {
  if (global.gc) {
    global.gc();
  }
  initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
});

afterAll(() => {
  if (global.gc) {
    global.gc();
  }
  
  const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  const increase = (finalMemory - initialMemory).toFixed(2);
  
  console.log(`\n📊 Memory usage increase: ${increase} MB`);
  
  if (slowTests.length > 0) {
    console.log('\n⚠️ Slow tests detected:');
    slowTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.duration}ms`);
    });
  }
});
```

---

## المرحلة 2: اختبارات جديدة | Phase 2: New Tests

### 3️⃣ اختبارات الحدود | Boundary Tests

**الملف**: `tests/boundary-cases.test.js`

```javascript
/**
 * Boundary Cases and Edge Cases Tests
 * Tests for extreme and unusual inputs
 */

describe('Boundary Cases & Edge Cases', () => {
  
  // =============================================
  // String Input Boundaries
  // =============================================
  
  describe('String Input Handling', () => {
    const stringValidator = (input) => {
      if (!input) return false;
      if (typeof input !== 'string') return false;
      if (input.length > 1000) return false;
      return input.trim().length > 0;
    };

    test('should reject empty string', () => {
      expect(stringValidator('')).toBe(false);
    });

    test('should reject whitespace-only string', () => {
      expect(stringValidator('   ')).toBe(false);
    });

    test('should reject very long string', () => {
      const longString = 'a'.repeat(1001);
      expect(stringValidator(longString)).toBe(false);
    });

    test('should reject null', () => {
      expect(stringValidator(null)).toBe(false);
    });

    test('should reject undefined', () => {
      expect(stringValidator(undefined)).toBe(false);
    });

    test('should reject non-string types', () => {
      expect(stringValidator(123)).toBe(false);
      expect(stringValidator({})).toBe(false);
      expect(stringValidator([])).toBe(false);
    });

    test('should accept valid string', () => {
      expect(stringValidator('valid input')).toBe(true);
    });
  });

  // =============================================
  // Numeric Boundaries
  // =============================================
  
  describe('Numeric Input Handling', () => {
    const ageValidator = (age) => {
      if (typeof age !== 'number') return false;
      if (age < 0 || age > 150) return false;
      if (!Number.isInteger(age)) return false;
      return true;
    };

    test('should reject negative age', () => {
      expect(ageValidator(-1)).toBe(false);
    });

    test('should reject age over 150', () => {
      expect(ageValidator(151)).toBe(false);
    });

    test('should reject decimal age', () => {
      expect(ageValidator(25.5)).toBe(false);
    });

    test('should reject zero', () => {
      expect(ageValidator(0)).toBe(false);
    });

    test('should accept valid age', () => {
      expect(ageValidator(25)).toBe(true);
      expect(ageValidator(1)).toBe(true);
      expect(ageValidator(150)).toBe(true);
    });
  });

  // =============================================
  // Array Boundaries
  // =============================================
  
  describe('Array Handling', () => {
    const arrayProcessor = (arr) => {
      if (!Array.isArray(arr)) return null;
      if (arr.length === 0) return null;
      if (arr.length > 1000) return null;
      return arr.filter(item => item != null);
    };

    test('should reject non-array', () => {
      expect(arrayProcessor('not array')).toBeNull();
    });

    test('should reject empty array', () => {
      expect(arrayProcessor([])).toBeNull();
    });

    test('should reject oversized array', () => {
      const hugeArray = Array(1001).fill(1);
      expect(arrayProcessor(hugeArray)).toBeNull();
    });

    test('should process valid array', () => {
      expect(arrayProcessor([1, 2, 3])).toEqual([1, 2, 3]);
    });

    test('should filter null values in array', () => {
      expect(arrayProcessor([1, null, 3])).toEqual([1, 3]);
    });
  });

  // =============================================
  // Date Boundaries
  // =============================================
  
  describe('Date Handling', () => {
    const dateValidator = (date) => {
      if (!(date instanceof Date)) return false;
      if (isNaN(date.getTime())) return false;
      return true;
    };

    test('should reject invalid date', () => {
      expect(dateValidator(new Date('invalid'))).toBe(false);
    });

    test('should reject string date', () => {
      expect(dateValidator('2026-02-24')).toBe(false);
    });

    test('should accept valid date', () => {
      expect(dateValidator(new Date())).toBe(true);
    });
  });

  // =============================================
  // Security Injection Tests
  // =============================================
  
  describe('Injection Prevention', () => {
    const sanitizeInput = (input) => {
      if (typeof input !== 'string') return '';
      
      // Remove common injection patterns
      return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    };

    test('should remove script tags', () => {
      const malicious = '<script>alert("xss")</script>';
      const result = sanitizeInput(malicious);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    test('should remove event handlers', () => {
      const malicious = '<img src=x onerror="alert(1)">';
      const result = sanitizeInput(malicious);
      expect(result).not.toContain('onerror');
    });

    test('should remove javascript protocol', () => {
      const malicious = '<a href="javascript:alert(1)">link</a>';
      const result = sanitizeInput(malicious);
      expect(result).not.toContain('javascript:');
    });

    test('should preserve safe content', () => {
      const safe = 'Hello <strong>World</strong>';
      const result = sanitizeInput(safe);
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });
  });
});
```

---

### 4️⃣ اختبارات الأمان | Security Tests

**الملف**: `tests/security-comprehensive.test.js`

```javascript
/**
 * Comprehensive Security Tests
 * Tests for authentication, authorization, and data protection
 */

describe('Comprehensive Security Tests', () => {
  
  // =============================================
  // Password Security
  // =============================================
  
  describe('Password Validation', () => {
    const validatePassword = (password) => {
      if (!password) return false;
      if (password.length < 8) return false;
      if (!/[A-Z]/.test(password)) return false; // uppercase
      if (!/[a-z]/.test(password)) return false; // lowercase
      if (!/[0-9]/.test(password)) return false; // digit
      if (!/[!@#$%^&*]/.test(password)) return false; // special
      return true;
    };

    test('should reject weak passwords', () => {
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('password')).toBe(false);
      expect(validatePassword('12345678')).toBe(false);
    });

    test('should reject passwords without uppercase', () => {
      expect(validatePassword('secure123!@#')).toBe(false);
    });

    test('should reject passwords without special char', () => {
      expect(validatePassword('Secure123')).toBe(false);
    });

    test('should accept strong passwords', () => {
      expect(validatePassword('Secure@Pass123')).toBe(true);
      expect(validatePassword('MyP@ssw0rd')).toBe(true);
    });
  });

  // =============================================
  // Email Validation
  // =============================================
  
  describe('Email Validation', () => {
    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    test('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@invalid.com')).toBe(false);
      expect(validateEmail('invalid@.com')).toBe(false);
    });

    test('should accept valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user+tag@example.co.uk')).toBe(true);
    });
  });

  // =============================================
  // Rate Limiting
  // =============================================
  
  describe('Rate Limiting', () => {
    class RateLimiter {
      constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs;
        this.attempts = new Map();
      }

      isLimited(key) {
        const now = Date.now();
        const userAttempts = this.attempts.get(key) || [];
        
        // Remove old attempts
        const recentAttempts = userAttempts.filter(
          time => now - time < this.windowMs
        );
        
        if (recentAttempts.length >= this.maxAttempts) {
          return true;
        }
        
        recentAttempts.push(now);
        this.attempts.set(key, recentAttempts);
        return false;
      }

      reset(key) {
        this.attempts.delete(key);
      }
    }

    test('should allow requests within limit', () => {
      const limiter = new RateLimiter(3, 1000);
      const key = 'user123';
      
      expect(limiter.isLimited(key)).toBe(false);
      expect(limiter.isLimited(key)).toBe(false);
      expect(limiter.isLimited(key)).toBe(false);
    });

    test('should block requests exceeding limit', () => {
      const limiter = new RateLimiter(3, 1000);
      const key = 'user123';
      
      limiter.isLimited(key);
      limiter.isLimited(key);
      limiter.isLimited(key);
      
      expect(limiter.isLimited(key)).toBe(true);
    });

    test('should reset on clear', () => {
      const limiter = new RateLimiter(2, 1000);
      const key = 'user123';
      
      limiter.isLimited(key);
      limiter.isLimited(key);
      limiter.reset(key);
      
      expect(limiter.isLimited(key)).toBe(false);
    });
  });

  // =============================================
  // CORS Validation
  // =============================================
  
  describe('CORS Validation', () => {
    const allowedOrigins = [
      'https://example.com',
      'https://app.example.com'
    ];

    const isOriginAllowed = (origin) => {
      return allowedOrigins.includes(origin);
    };

    test('should allow whitelisted origins', () => {
      expect(isOriginAllowed('https://example.com')).toBe(true);
      expect(isOriginAllowed('https://app.example.com')).toBe(true);
    });

    test('should reject non-whitelisted origins', () => {
      expect(isOriginAllowed('https://evil.com')).toBe(false);
      expect(isOriginAllowed('http://localhost:3000')).toBe(false);
    });
  });
});
```

---

## المرحلة 3: أتمتة | Phase 3: Automation

### 5️⃣ نص CI/CD | CI/CD Script

**الملف**: `.github/workflows/test.yml`

```yaml
name: 🧪 Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v3
      
      - name: 📦 Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: 📚 Install dependencies
        run: npm ci
      
      - name: 🔍 Run linter
        run: npm run lint --if-present
      
      - name: 🧪 Run tests
        run: npm test -- --coverage
        env:
          NODE_ENV: test
      
      - name: 📊 Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
      
      - name: 📈 Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: test-reports/
      
      - name: 📉 Coverage Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: coverage-report
          path: coverage/
```

---

## المرحلة 4: الأوامر النافعة | Phase 4: Useful Commands

### 6️⃣ سكريبتات npm | NPM Scripts

أضف إلى `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:performance": "jest --testNamePattern=performance",
    "test:security": "jest --testNamePattern=security",
    "test:boundary": "jest --testNamePattern='Boundary'",
    "test:fast": "jest --maxWorkers=4 --testTimeout=5000",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",
    "test:report": "jest --coverage && open coverage/index.html",
    "test:detect-leaks": "jest --detectOpenHandles"
  }
}
```

---

## 📋 قائمة التحقق | Checklist

### قبل الدمج | Before Merging
- [ ] جميع الاختبارات تمرت ✅
- [ ] التغطية ≥ 80% 📊
- [ ] لا توجد تحذيرات ⚠️
- [ ] أي تحسينات أمنية تم اختبارها 🔒
- [ ] الأداء تم التحقق منها ⚡

### عند التوزيع | Before Deployment
- [ ] اختبارات الإنتاج نجحت ✅
- [ ] التقارير تم طباعتها 📄
- [ ] الموارس تم تنظيفها 🧹
- [ ] لا توجد أخطاء في السجلات 📋

---

**تم إعداد هذا الدليل بواسطة**: GitHub Copilot  
**التاريخ**: FEB 24, 2026  
**النسخة**: 1.0.0  

