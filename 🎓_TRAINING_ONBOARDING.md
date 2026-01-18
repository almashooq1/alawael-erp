# 🎓 دليل التدريب والـ Onboarding

**التاريخ**: يناير 17, 2026  
**الأولوية**: 🟠 MEDIUM  
**الحالة**: شامل

---

## 📚 تدريب المطورين

### الأسبوع الأول: أساسيات النظام

**اليوم 1-2: البيئة والإعدادات**

```
1. استنساخ المستودع
   git clone https://github.com/org/alawael-erp.git

2. تثبيت الـ dependencies
   npm install

3. إعداد .env
   cp .env.example .env
   # عدّل القيم حسب إعدادات التطوير

4. تشغيل قاعدة البيانات (development)
   npm run db:migrate
   npm run db:seed

5. تشغيل التطبيق
   npm run dev

6. فتح المتصفح
   http://localhost:3001

7. اختبر تسجيل الدخول
   البريد: admin@example.com
   كلمة المرور: Admin@123456
```

**اليوم 3-4: بنية المشروع**

```
📁 Project Structure:
├── src/
│   ├── controllers/      # Business logic
│   ├── routes/           # API endpoints
│   ├── middleware/       # Express middleware
│   ├── models/           # Database models
│   ├── services/         # Business services
│   ├── utils/            # Helper functions
│   └── validators/       # Input validation
├── tests/                # Test files
├── db/
│   ├── migrations/       # Database migrations
│   └── seeds/            # Test data
├── logs/                 # Application logs
└── config/               # Configuration files
```

**اليوم 5: أول Pull Request**

```
1. إنشاء feature branch
   git checkout -b feature/your-feature

2. عمل تغييرات صغيرة

3. اختبار التغييرات
   npm test
   npm run lint

4. Commit التغييرات
   git add .
   git commit -m "Add: description"

5. Push للـ repository
   git push origin feature/your-feature

6. إنشاء Pull Request على GitHub
   - أضف وصف واضح
   - اطلب review من senior developer
```

---

### الأسبوع الثاني: الترميز المتقدم

**الأنماط المستخدمة (Design Patterns)**

```
1. MVC Pattern
   - Model: قاعدة البيانات
   - View: API Responses
   - Controller: Business Logic

2. Service Layer Pattern
   - Authentication Service
   - User Service
   - Email Service
   - Payment Service

3. Middleware Pattern
   - Error handling
   - Logging
   - Authentication
   - Authorization

4. Repository Pattern
   - Database abstraction
   - Reusable queries
```

**أمثلة الترميز**

```javascript
// ✅ الطريقة الصحيحة - استخدام Services

// services/user-service.js
class UserService {
  async createUser(userData) {
    // Validation
    this.validateUserData(userData);

    // Check if exists
    const existing = await this.userRepo.findByEmail(userData.email);
    if (existing) throw new Error('User exists');

    // Hash password
    const hashedPassword = await this.hashPassword(userData.password);

    // Create user
    return await this.userRepo.create({
      ...userData,
      password: hashedPassword,
    });
  }
}

// controllers/user-controller.js
class UserController {
  async createUser(req, res, next) {
    try {
      const user = await this.userService.createUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

// ❌ الطريقة الخاطئة
router.post('/users', async (req, res) => {
  // Mixing concerns - كود في routes
  const user = await db.query('INSERT INTO users...');
  res.json(user);
});
```

---

### الأسبوع الثالث: الاختبارات

**كتابة الاختبارات**

```javascript
// tests/auth.test.js

describe('Authentication', () => {
  describe('Login', () => {
    it('should return JWT token on valid credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.token).toMatch(/^eyJ/);
    });

    it('should return 401 on invalid credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
```

**تشغيل الاختبارات**

```bash
# جميع الاختبارات
npm test

# اختبارات محددة
npm test -- auth.test.js

# مع coverage
npm run test:coverage

# الاختبارات على الحفظ (watch mode)
npm test -- --watch
```

---

## 👨‍💼 تدريب الإدارة والـ Admin

### المسؤوليات الأساسية

```
1. إدارة المستخدمين
   - إنشاء/تفعيل/تعطيل حسابات
   - تعيين الأدوار والأذونات
   - إعادة تعيين كلمات المرور

2. المراقبة
   - مراقبة أداء النظام
   - فحص السجلات
   - إدارة الأخطاء

3. الأمان
   - مراجعة سجل الأنشطة
   - التحقق من المحاولات الفاشلة
   - تفعيل المصادقة الثنائية

4. النسخ الاحتياطية
   - جدولة النسخ الاحتياطية
   - اختبار الاستعادة
   - توثيق إجراءات النسخ الاحتياطية
```

### مهام يومية

```
الصباح:
☐ فحص صحة النظام (Dashboard)
☐ مراجعة أي أخطاء ليلية
☐ التحقق من استخدام الموارد

أثناء اليوم:
☐ الرد على تذاكر الدعم
☐ مراقبة الأداء
☐ تحديث البيانات إن لزم

نهاية اليوم:
☐ مراجعة السجلات
☐ التحقق من النسخ الاحتياطية
☐ توثيق أي مشاكل

أسبوعياً:
☐ تقرير الأداء
☐ تحديث النظام
☐ مراجعة الأمان
☐ اجتماع الفريق
```

---

## 👥 تدريب المستخدمين النهائيين

### دليل المستخدم الأساسي

```
تسجيل الدخول:
1. اذهب إلى https://alawael.com
2. أدخل بريدك الإلكتروني أو رقم هاتفك
3. أدخل كلمة المرور
4. إذا كان لديك 2FA، أدخل الرمز من تطبيقك
5. انقر "دخول"

نسيت كلمة المرور:
1. في صفحة تسجيل الدخول، انقر "نسيت كلمة المرور"
2. أدخل بريدك الإلكتروني
3. افتح الرابط من البريد
4. اختر كلمة مرور جديدة قوية
5. سجل دخولك بكلمة المرور الجديدة

تفعيل المصادقة الثنائية:
1. اذهب إلى إعدادات الحساب
2. انقر "الأمان"
3. اختر "تفعيل المصادقة الثنائية"
4. امسح رمز QR بـ Google Authenticator
5. أدخل الرمز للتأكيد
```

---

## 📋 قائمة فحص التدريب

```
تدريب المطورين:
☐ البيئة معدة بشكل صحيح
☐ يمكنهم تشغيل الـ tests
☐ فهموا البنية الأساسية
☐ قادرون على كتابة اختبارات
☐ يعرفون معايير الترميز
☐ يتابعون Git workflow

تدريب الإدارة:
☐ يمكنهم الوصول للـ dashboard
☐ يفهمون كيفية مراقبة النظام
☐ يعرفون كيفية إدارة المستخدمين
☐ يمكنهم استعادة النسخ الاحتياطية
☐ يعرفون الطوارئ وكيفية التعامل معها

تدريب المستخدمين:
☐ يمكنهم تسجيل الدخول
☐ يعرفون كيفية تغيير كلمة المرور
☐ يعرفون كيفية استخدام المميزات الأساسية
☐ يعرفون من يتصلون به في حالة المشاكل
```

---

**الحالة**: ✅ جاهز للاستخدام  
**آخر تحديث**: يناير 17, 2026
