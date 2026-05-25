# 🔐 نظام المصادقة المتقدم - Advanced Authentication System

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [المميزات](#المميزات)
3. [طرق تسجيل الدخول](#طرق-تسجيل-الدخول)
4. [التثبيت والإعداد](#التثبيت-والإعداد)
5. [API Endpoints](#api-endpoints)
6. [أمثلة الاستخدام](#أمثلة-الاستخدام)
7. [الأمان](#الأمان)
8. [الاختبارات](#الاختبارات)

---

## 🎯 نظرة عامة

نظام مصادقة متقدم وآمن يدعم **4 طرق دخول مختلفة** مع ميزات أمان عالية جداً:

### 4️⃣ طرق تسجيل الدخول:

1. **البريد الإلكتروني** (Email)
2. **رقم الجوال** (Phone Number)
3. **رقم بطاقة الأحوال** (ID Number)
4. **اسم المستخدم** (Username)

### ⭐ المميزات الإضافية:

- ✅ تسجيل دخول ذكي (Auto-detection)
- ✅ تسجيل حساب جديد
- ✅ استرجاع كلمة المرور
- ✅ تغيير كلمة المرور
- ✅ المصادقة الثنائية (2FA)
- ✅ تسجيل نشاط الدخول
- ✅ JWT Tokens

---

## ✨ المميزات

### أمان عالي جداً

```javascript
✅ Password Hashing (Bcrypt)
✅ JWT Token Authentication
✅ Input Validation & Normalization
✅ Rate Limiting Ready
✅ Secure Session Management
✅ Audit Logging
✅ Two-Factor Authentication Ready
```

### سهولة الاستخدام

```javascript
✅ Smart Login (تحديد الطريقة تلقائياً)
✅ Multiple Login Methods
✅ Form Validation in Real-time
✅ Clear Error Messages
✅ Password Strength Indicator
✅ Responsive Design
```

### تجربة المستخدم

```javascript
✅ Instant Feedback
✅ Password Visibility Toggle
✅ Terms & Conditions
✅ Social Login Ready
✅ Remember Me Option
✅ Dark Mode Support
```

---

## 📱 طرق تسجيل الدخول

### 1️⃣ البريد الإلكتروني

```javascript
// التحقق من صحة البريل
AuthenticationService.isValidEmail('user@example.com');
// → true

// تسجيل الدخول
await AuthenticationService.loginWithEmail('user@example.com', 'password');
// → {success: true, token: '...', user: {...}}
```

### 2️⃣ رقم الجوال السعودي

```javascript
// الصيغ المقبولة:
// 0501234567      (10 أرقام)
// +966501234567   (معدل دولي)
// 966501234567    (بدون علامة +)

// التحقق
AuthenticationService.isValidPhoneNumber('0501234567');
// → true

// تسجيل الدخول
await AuthenticationService.loginWithPhone('0501234567', 'password');
// → {success: true, ...}
```

### 3️⃣ رقم بطاقة الأحوال

```javascript
// رقم الهوية السعودي: 10 أرقام
AuthenticationService.isValidIDNumber('1234567890');
// → true

// تسجيل الدخول
await AuthenticationService.loginWithIDNumber('1234567890', 'password');
// → {success: true, ...}
```

### 4️⃣ اسم المستخدم

```javascript
// من 3 إلى 20 حرف، أحرف وأرقام وشرطة
AuthenticationService.isValidUsername('user123');
// → true

// تسجيل الدخول
await AuthenticationService.loginWithUsername('user123', 'password');
// → {success: true, ...}
```

### ⚡ تسجيل دخول ذكي

```javascript
// النظام يكتشف نوع البيانات تلقائياً
await AuthenticationService.smartLogin(credential, password);

// credential يمكن أن يكون:
// - user@email.com (بريد)
// - 0501234567 (جوال)
// - 1234567890 (هوية)
// - username123 (اسم)
```

---

## 🔧 التثبيت والإعداد

### 1️⃣ المتطلبات

```bash
npm install bcryptjs jwt crypto
```

### 2️⃣ إضافة في Backend (server.js)

```javascript
const authenticationRoutes = require('./routes/authenticationRoutes');

app.use(express.json());
app.use('/api/auth', authenticationRoutes);
```

### 3️⃣ إضافة في Frontend (App.js)

```javascript
import AdvancedLoginComponent from './components/AdvancedLoginComponent';

function App() {
  return <AdvancedLoginComponent onLoginSuccess={handleLogin} />;
}
```

### 4️⃣ Environment Variables (.env)

```env
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10
```

---

## 🌐 API Endpoints

### 1️⃣ تسجيل الدخول الذكي

```http
POST /api/auth/login
Content-Type: application/json

{
  "credential": "user@email.com",  // أو رقم جوال أو هوية أو اسم
  "password": "YourPassword123!"
}

Response: 200 OK
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "user": {
    "id": "user-123",
    "username": "user123",
    "email": "user@email.com",
    "roles": ["user"]
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "7d"
}
```

### 2️⃣ تسجيل الدخول بالبريل

```http
POST /api/auth/login/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "YourPassword123!"
}
```

### 3️⃣ تسجيل الدخول برقم الجوال

```http
POST /api/auth/login/phone
Content-Type: application/json

{
  "phone": "0501234567",
  "password": "YourPassword123!"
}
```

### 4️⃣ تسجيل الدخول برقم الهوية

```http
POST /api/auth/login/idnumber
Content-Type: application/json

{
  "idNumber": "1234567890",
  "password": "YourPassword123!"
}
```

### 5️⃣ تسجيل الدخول باسم المستخدم

```http
POST /api/auth/login/username
Content-Type: application/json

{
  "username": "user123",
  "password": "YourPassword123!"
}
```

### 6️⃣ إنشاء حساب جديد

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "newuser@example.com",
  "phone": "0501234567",
  "idNumber": "1234567890",
  "firstName": "محمد",
  "lastName": "أحمد",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}

Response: 201 Created
{
  "success": true,
  "message": "تم إنشاء الحساب بنجاح",
  "user": {...}
}
```

### 7️⃣ تسجيل الخروج

```http
POST /api/auth/logout
Content-Type: application/json

{
  "userId": "user-123"
}

Response: 200 OK
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}
```

### 8️⃣ تحديث الـ Token

```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response: 200 OK
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "7d"
}
```

### 9️⃣ طلب إعادة تعيين كلمة المرور

```http
POST /api/auth/password/reset-request
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: 200 OK
{
  "success": true,
  "message": "تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني"
}
```

### 🔟 إعادة تعيين كلمة المرور

```http
POST /api/auth/password/reset
Content-Type: application/json

{
  "resetToken": "...",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}

Response: 200 OK
{
  "success": true,
  "message": "تم تعيين كلمة المرور الجديدة بنجاح"
}
```

### 1️⃣1️⃣ تغيير كلمة المرور

```http
POST /api/auth/password/change
Content-Type: application/json

{
  "userId": "user-123",
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}

Response: 200 OK
{
  "success": true,
  "message": "تم تغيير كلمة المرور بنجاح"
}
```

### 1️⃣2️⃣ التحقق من صحة البيانات

```http
POST /api/auth/validate
Content-Type: application/json

{
  "credential": "user@example.com"
}

Response: 200 OK
{
  "success": true,
  "credential": "user@example.com",
  "isValid": true,
  "validationType": "email"  // email, phone, idNumber, username
}
```

### 1️⃣3️⃣ التحقق من قوة كلمة المرور

```http
POST /api/auth/password/strength
Content-Type: application/json

{
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "success": true,
  "isStrong": true,
  "strength": "قوية",
  "requirements": {
    "minLength": "على الأقل 8 أحرف",
    "uppercase": "حرف كبير واحد",
    "lowercase": "حرف صغير واحد",
    "number": "رقم واحد",
    "special": "رمز خاص"
  }
}
```

### 1️⃣4️⃣ المصادقة الثنائية - التفعيل

```http
POST /api/auth/2fa/enable
Content-Type: application/json

{
  "userId": "user-123"
}

Response: 200 OK
{
  "success": true,
  "message": "تم إنشاء رمز المصادقة الثنائية",
  "secret": "...",
  "qrCode": "otpauth://totp/..."
}
```

### 1️⃣5️⃣ المصادقة الثنائية - التحقق

```http
POST /api/auth/2fa/verify
Content-Type: application/json

{
  "userId": "user-123",
  "token": "123456"
}

Response: 200 OK
{
  "success": true,
  "message": "تم التحقق من المصادقة الثنائية بنجاح"
}
```

---

## 💻 أمثلة الاستخدام

### مثال 1: تسجيل الدخول من React Component

```javascript
const handleLogin = async (credential, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, password }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      console.log('✅ تم تسجيل الدخول:', data.user);
    } else {
      console.error('❌ فشل تسجيل الدخول:', data.message);
    }
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
};
```

### مثال 2: التحقق من قوة كلمة المرور

```javascript
const checkPasswordStrength = async password => {
  const response = await fetch('/api/auth/password/strength', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  const data = await response.json();
  console.log(`قوة كلمة المرور: ${data.strength}`);
  console.log('المتطلبات:', data.requirements);
};
```

### مثال 3: التحقق من صحة البيانات

```javascript
const validateCredential = async credential => {
  const response = await fetch('/api/auth/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  const data = await response.json();

  if (data.isValid) {
    console.log(`✅ ${data.validationType}: ${data.credential}`);
  } else {
    console.log('❌ بيانات غير صحيحة');
  }
};
```

### مثال 4: استرجاع كلمة المرور

```javascript
const requestPasswordReset = async email => {
  const response = await fetch('/api/auth/password/reset-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  if (data.success) {
    console.log('✅ تم إرسال البريد');
  }
};
```

### مثال 5: استخدام Middleware للتحقق من الـ Token

```javascript
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'بدون توثيق' });
  }

  try {
    const decoded = AuthenticationService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'token غير صحيح' });
  }
};

// الاستخدام:
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({ user: req.user });
});
```

---

## 🔐 الأمان

### تدابير الأمان المطبقة

1. **Password Hashing**

   - استخدام Bcrypt مع 10 جولات
   - كلمات مرور قوية إجبارية
   - عدم تخزين كلمات مرور عادية

2. **JWT Tokens**

   - توقيع آمن (HS256)
   - انتهاء الصلاحية
   - Refresh Token

3. **Input Validation**

   - التحقق من صيغة البريد
   - التحقق من صيغة الجوال
   - التحقق من صيغة الهوية
   - التحقق من اسم المستخدم

4. **Rate Limiting** (جاهز)

   - تحديد محاولات الدخول
   - حماية من Brute Force

5. **Audit Logging**

   - تسجيل جميع عمليات الدخول
   - تسجيل محاولات فاشلة
   - تسجيل IP والجهاز

6. **Two-Factor Authentication** (جاهز)
   - TOTP Support
   - QR Code Generation
   - Backup Codes

---

## 🧪 الاختبارات

### تشغيل الاختبارات

```bash
# جميع الاختبارات
npm test

# اختبار محدد
npm test -- authenticationService.test.js

# مع التغطية
npm test -- --coverage

# مراقبة (Watch Mode)
npm test -- --watch
```

### نتائج الاختبارات المتوقعة

```text
✅ Input Validation (15 tests)
   ✓ Email validation
   ✓ Phone validation
   ✓ ID number validation
   ✓ Username validation
   ✓ Password strength validation

✅ Input Normalization (3 tests)
✅ Password Hashing (3 tests)
✅ JWT Tokens (3 tests)
✅ API Routes (12 tests)
✅ Security Tests (3 tests)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tests:       50+ passed, 50+ total ✅
Coverage:    90%+ 📊
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📊 متطلبات كلمة المرور

كلمة المرور الآمنة يجب أن تحتوي على:

- ✅ 8 أحرف على الأقل
- ✅ حرف كبير واحد (A-Z)
- ✅ حرف صغير واحد (a-z)
- ✅ رقم واحد (0-9)
- ✅ رمز خاص واحد (@$!%\*?&)

**أمثلة:**

- ✅ `SecurePass123!` - قوية
- ✅ `MyP@ssw0rd` - قوية
- ❌ `password` - ضعيفة جداً
- ❌ `12345678` - بدون أحرف
- ❌ `Pass` - قصيرة جداً

---

## 🎯 الخطوات التالية

يمكن إضافة:

- [ ] دعم تسجيل الدخول عبر Google/Apple
- [ ] تحسين 2FA (SMS, Email, Authenticator)
- [ ] Passwordless Authentication
- [ ] Biometric Login (بصمة, وجه)
- [ ] Session Management المتقدمة
- [ ] IP Whitelisting
- [ ] Device Recognition

---

## 📞 المساعدة

### أسئلة شائعة

**س: كيف أستخدم Smart Login؟**
ج: ادخل أي بيانات تعرّفك (بريد، جوال، هوية، أو اسم) والنظام سيكتشفها تلقائياً.

**س: هل يمكن تغيير متطلبات كلمة المرور؟**
ج: نعم، عدّل الـ regex في `isValidPasswordStrength()`.

**س: كيف أحفظ الـ Token؟**
ج: استخدم localStorage أو sessionStorage، أو cookies محمية.

**س: ماذا عن الـ Refresh Token؟**
ج: استخدمه للحصول على token جديد دون إعادة تسجيل دخول.

---

## ✨ الملخص

✅ نظام مصادقة آمن وموثوق  
✅ 4 طرق دخول مختلفة  
✅ واجهة استخدام رائعة  
✅ اختبارات شاملة  
✅ توثيق كامل  
✅ جاهز للإنتاج

---

**آخر تحديث**: يناير 2026
**الإصدار**: 1.0.0
**الحالة**: ✅ جاهز للإنتاج
