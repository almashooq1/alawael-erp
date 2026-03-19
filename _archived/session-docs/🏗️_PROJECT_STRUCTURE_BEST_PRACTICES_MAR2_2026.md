# 🏗️ بنية المشاريع وأفضل الممارسات
## Project Structure & Best Practices - All 21 Projects | مارس 2، 2026

<div dir="rtl">

---

## 📐 البنية الموحدة للمشاريع

### Backend Service Template

```
my-backend-service/
├── src/                          # الملفات المصدرية
│   ├── controllers/              # منطق التحكم
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   └── index.ts
│   ├── services/                 # الخدمات الأساسية
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   └── cache.service.ts
│   ├── models/                   # نماذج البيانات
│   │   ├── user.model.ts
│   │   ├── product.model.ts
│   │   └── index.ts
│   ├── middleware/               # Middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── index.ts
│   ├── routes/                   # المسارات
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   └── index.ts
│   ├── utils/                    # أدوات مساعدة
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   ├── config/                   # التكوين
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── environment.ts
│   ├── types/                    # TypeScript Types
│   │   ├── common.types.ts
│   │   ├── request.types.ts
│   │   └── response.types.ts
│   ├── errors/                   # معالجة الأخطاء
│   │   ├── AppError.ts
│   │   └── ErrorHandler.ts
│   └── app.ts                    # نقطة الدخول
├── tests/                        # الاختبارات
│   ├── unit/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── routes/
│   │   └── services/
│   ├── e2e/
│   │   └── api/
│   ├── fixtures/
│   │   └── mocks.ts
│   └── setup.ts
├── dist/                         # الملفات المُترجمة
├── node_modules/                 # المكتبات
├── .env.example                  # مثال متغيرات البيئة
├── .env                          # متغيرات البيئة (خاص)
├── .eslintrc.json               # معايير ESLint
├── .prettierrc.json             # معايير Prettier
├── tsconfig.json                # إعدادات TypeScript
├── jest.config.js               # إعدادات Jest
├── package.json                 # المكتبات والنصوص
├── package-lock.json            # قفل الإصدارات
├── README.md                    # التوثيق
├── dockerfile                   # Docker config
├── .dockerignore                # Docker ignore
└── docker-compose.yml           # Docker compose
```

**المميزات:**
- ✅ **Separation of Concerns** - منطق منفصل
- ✅ **Scalability** - سهل التوسع
- ✅ **Testability** - قابل للاختبار
- ✅ **Maintainability** - سهل الصيانة

---

### Frontend Application Template

```
my-frontend-app/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── components/               # مكونات React
│   │   ├── common/              # مكونات مشتركة
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── Navigation.jsx
│   │   ├── feature/             # مكونات الميزات
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   └── Products/
│   │   └── index.js
│   ├── pages/                   # الصفحات
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── 404Page.jsx
│   │   └── index.js
│   ├── hooks/                   # Custom React Hooks
│   │   ├── useAuth.js
│   │   ├── useLocalStorage.js
│   │   └── useFetch.js
│   ├── services/                # API Services
│   │   ├── api.js
│   │   ├── auth.service.js
│   │   └── user.service.js
│   ├── store/                   # Redux/Context
│   │   ├── slices/
│   │   ├── actions/
│   │   └── store.js
│   ├── styles/                  # الأنماط
│   │   ├── globals.css
│   │   ├── variables.css
│   │   └── components/
│   ├── utils/                   # أدوات مساعدة
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   └── helpers.js
│   ├── types/                   # TypeScript/PropTypes
│   │   ├── auth.types.js
│   │   └── api.types.js
│   ├── config/                  # التكوين
│   │   ├── api.config.js
│   │   └── constants.js
│   ├── tests/                   # الاختبارات
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── setup.js
│   ├── App.jsx                  # مكون رئيسي
│   └── index.jsx               # نقطة الدخول
├── .env.example
├── .env
├── .eslintrc.json
├── .prettierrc.json
├── package.json
├── package-lock.json
├── README.md
└── public/
    ├── index.html
    └── manifest.json
```

**المميزات:**
- ✅ **Component-based** - مبني على مكونات
- ✅ **Feature folders** - تنظيم بالميزات
- ✅ **Services layer** - طبقة خدمات منفصلة
- ✅ **Custom hooks** - إعادة استخدام الكود

---

## 🎯 معايير البنية الموحدة

### الملف الموحد package.json

```json
{
  "name": "@alawael/service-name",
  "version": "1.0.0",
  "description": "الوصف بالعربية | English Description",
  "author": "Alawael Team",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "start": "node dist/index.js",
    "dev": "nodemon src/index.ts --exec ts-node",
    "build": "tsc",
    "clean": "rm -rf dist",
    "lint": "eslint src --ext .ts,.tsx,.js 2>/dev/null || true",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,json,md}\" \"tests/**/*.{ts,tsx,js,json}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,json,md}\"",
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",
    "quality:guard": "npm run lint",
    "quality:fast": "npm run quality:guard && npm test -- --passWithNoTests --no-coverage",
    "quality:ci": "npm run quality:guard && npm test -- --ci --runInBand --coverage",
    "quality": "npm run quality:ci",
    "precommit": "npm run lint && npm run format:check",
    "prepare": "husky install"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.0.0",
    "joi": "^17.9.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/jest": "^29.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "nodemon": "^3.0.0",
    "ts-node": "^10.0.0",
    "husky": "^8.0.0"
  },
  "keywords": [
    "alawael",
    "erp",
    "service"
  ]
}
```

---

## 📁 معايير التسمية

### ملفات TypeScript/JavaScript

```
✅ الصحيح:
  - user.service.ts          (خدمة)
  - auth.controller.ts       (متحكم)
  - user.model.ts            (نموذج)
  - auth.middleware.ts       (وسيط)
  - useAuth.ts               (Hook)
  - UserCard.jsx             (مكون)
  - user.types.ts            (أنواع)
  - user.validator.ts        (معالج التحقق)
  - logger.util.ts           (أداة مساعدة)

❌ غير صحيح:
  - UserService.ts           (استخدم snake_case)
  - AUTHCONTROLLER.ts        (تجنب CAPS)
  - usermodel.ts             (فاصل_underscore)
  - authenticate.ts          (غير واضح الدور)
```

### المجلدات

```
✅ الصحيح:
  - src/controllers/         (للتحكم)
  - src/services/            (للخدمات)
  - src/models/              (للنماذج)
  - src/middleware/          (للوسطاء)
  - tests/unit/              (اختبارات الوحدة)
  - tests/integration/       (اختبارات التكامل)

❌ غير صحيح:
  - src/controllers-and-stuff/  (أسماء طويلة)
  - src/MODELS/                (تجنب CAPS)
  - tests/myTests/             (غير واضح النوع)
```

---

## 🔧 المكتبات الموحدة

### إدارة المكتبات

```json
// المكتبات الأساسية (إلزامية)
{
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.0.0"
  }
}

// مكتبات التطوير (إلزامية)
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0",
    "@types/node": "^20.0.0"
  }
}

// مكتبات اختيارية (حسب الحاجة)
{
  "dependencies": {
    "mongoose": "^7.0.0",      // للـ MongoDB
    "redis": "^4.6.0",          // للـ Cache
    "joi": "^17.9.0",           // للتحقق
    "winston": "^3.8.0",        // للـ Logging
    "axios": "^1.4.0"           // للـ HTTP
  }
}
```

**المبدأ:** استخدم المكتبات الموثوقة والمشهورة فقط.

---

## 🧪 معايير الاختبار الموحدة

### بنية الملف

```
tests/
├── fixtures/
│   ├── mocks.ts              # البيانات الوهمية
│   └── factories.ts          # مصانع البيانات
├── unit/
│   ├── services/
│   │   └── user.service.test.ts
│   ├── utils/
│   │   └── validators.test.ts
│   └── controllers/
│       └── auth.controller.test.ts
├── integration/
│   ├── routes/
│   │   └── user.routes.test.ts
│   └── services/
│       └── auth.service.test.ts
├── e2e/
│   └── api/
│       └── auth.api.test.ts
├── setup.ts                  # الإعداد
└── teardown.ts               # إزالة الإعداد
```

### مثال اختبار موحد

```typescript
// user.service.test.ts
describe('UserService', () => {
  let userService: UserService;
  let mockDatabase: jest.Mocked<Database>;

  beforeAll(async () => {
    mockDatabase = createMockDatabase();
    userService = new UserService(mockDatabase);
  });

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const userData = { email: 'test@example.com', name: 'Test' };

      // Act
      const user = await userService.createUser(userData);

      // Assert
      expect(user.email).toBe(userData.email);
      expect(user.id).toBeDefined();
      expect(mockDatabase.save).toHaveBeenCalledWith(userData);
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      mockDatabase.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Email already exists');
    });
  });
});
```

**معايير:**
- ✅ AAA Pattern (Arrange, Act, Assert)
- ✅ Descriptive test names
- ✅ Isolated tests
- ✅ Mocking external dependencies

---

## 📝 معايير التوثيق

### JSDoc Format

```typescript
/**
 * إنشاء مستخدم جديد
 * Creates a new user with the provided data
 *
 * @param {Object} userData - بيانات المستخدم / User data
 * @param {string} userData.email - البريد الإلكتروني / Email address
 * @param {string} userData.name - الاسم الكامل / Full name
 * @param {string} userData.password - كلمة المرور / Password
 *
 * @returns {Promise<User>} المستخدم المنشأ / Created user object
 *
 * @throws {ValidationError} إذا كانت البيانات غير صحيحة
 * @throws {DuplicateError} إذا كان البريد موجوداً
 *
 * @example
 * const user = await userService.createUser({
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   password: 'secure123'
 * });
 */
async function createUser(userData: UserInput): Promise<User> {
  // Implementation
}
```

### README Template

```markdown
# اسم المشروع | Project Name

<div dir="rtl">

## 📝 الوصف

وصف شامل للمشروع بالعربية...

## المميزات / Features
- ميزة 1
- ميزة 2
- ميزة 3

</div>

## Project Description

English description of the project...

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
\`\`\`bash
npm install
\`\`\`

### Configuration
\`\`\`bash
cp .env.example .env
# Edit .env with your values
\`\`\`

### Running the Project
\`\`\`bash
# Development
npm run dev

# Production
npm run build
npm start
\`\`\`

### Testing
\`\`\`bash
npm test              # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage
\`\`\`

## Project Structure

See [STRUCTURE.md](./STRUCTURE.md) for detailed structure.

## API Documentation

See [API.md](./API.md) for endpoints.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
```

---

## ✅ قائمة فحص التحسينات

### المرحلة 1: البنية الأساسية ✅
- [x] تحديد البنية الموحدة
- [x] توثيق المجلدات
- [x] معايير التسمية
- [ ] تطبيق على 21 مشروع (قادم)

### المرحلة 2: المكتبات ⏳
- [ ] تحديد المكتبات الموحدة
- [ ] إنشاء package.json موحد
- [ ] تحديث جميع المشاريع

### المرحلة 3: الاختبارات ⏳
- [ ] معايير Jest الموحدة
- [ ] بنية الاختبارات
- [ ] أمثلة

### المرحلة 4: التوثيق ⏳
- [ ] معايير JSDoc
- [ ] نموذج README
- [ ] API documentation

---

## 🚀 التطبيق الفوري

### خطوات التحسين لكل مشروع:

```bash
# 1. تنظيم البنية (إن لزم الأمر)
mkdir -p src/{controllers,services,models,middleware,routes,utils,config,types,errors}
mkdir -p tests/{unit,integration,e2e,fixtures}

# 2. نسخ ملفات التكوين
cp .eslintrc.json [from-template]
cp .prettierrc.json [from-template]
cp tsconfig.json [from-template]
cp jest.config.js [from-template]

# 3. تثبيت المكتبات
npm install --save-dev eslint prettier jest @types/jest

# 4. تنسيق الكود
npm run format

# 5. فحص الجودة
npm run quality

# 6. التحقق من الاختبارات
npm test

# 7. إنشاء README.md
# استخدم النموذج أعلاه
```

---

**آخر تحديث:** 2 مارس 2026
**التغطية:** 21 مشروع Node.js
**الحالة:** ✅ جاهز للتطبيق

---

</div>
