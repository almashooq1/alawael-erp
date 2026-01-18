# 🔐 أمان نظام المصادقة | Authentication Security Best Practices

## 📋 جدول المحتويات

1. [أفضل ممارسات الأمان](#أفضل-ممارسات-الأمان)
2. [حماية البيانات الحساسة](#حماية-البيانات-الحساسة)
3. [الهجمات الشائعة والحماية](#الهجمات-الشائعة-والحماية)
4. [التشفير والتسلسل](#التشفير-والتسلسل)
5. [الامتثال للمعايير](#الامتثال-للمعايير)

---

## ✅ أفضل ممارسات الأمان

### 1️⃣ كلمات المرور

#### ✅ يجب:

```
✅ الحد الأدنى 8 أحرف
✅ استخدام أحرف كبيرة وصغيرة
✅ استخدام أرقام ورموز خاصة
✅ تشفير Bcrypt (10+ جولات)
✅ عدم تخزين النسخ العادية
✅ عدم إرسال كلمات المرور في URLs
✅ استخدام HTTPS فقط
✅ تطبيق Rate Limiting على محاولات الدخول
```

#### ❌ لا تفعل:

```
❌ كلمات مرور قصيرة < 8 أحرف
❌ كلمات مرور بسيطة مثل: password, 123456
❌ تخزين كلمات المرور في النصوص العادية
❌ إرسال كلمات المرور بدون تشفير
❌ استخدام نفس كلمة المرور لعدة حسابات
❌ كتابة كلمات المرور في الكود
❌ إظهار كلمة المرور في السجلات
```

### 2️⃣ JWT Tokens

#### ✅ الممارسات الجيدة:

```javascript
// إعدادات آمنة لـ JWT
{
  algorithm: 'HS256',      // تحديد الخوارزمية
  expiresIn: '7d',          // صلاحية 7 أيام
  issuer: 'your-app',       // صاحب التطبيق
  audience: 'your-users'    // الجمهور المستهدف
}

// استخدام environment variables
const JWT_SECRET = process.env.JWT_SECRET; // طول 32+ حرف

// لا تحفظ معلومات حساسة في الـ payload
{
  "id": "user-123",
  "email": "user@example.com",
  // ❌ لا تضع: "password", "creditCard", "ssn"
}

// استخدام refresh tokens
{
  accessToken: "قصير الأجل (15-30 دقيقة)",
  refreshToken: "طويل الأجل (7-30 يوم)"
}
```

#### ❌ ما يجب تجنبه:

```javascript
// ❌ سر ضعيف
JWT_SECRET = "secret"

// ❌ صلاحية طويلة جداً
expiresIn: '1y'

// ❌ بيانات حساسة في الـ payload
{
  id: user_id,
  password: "hashed_password", // ❌
  creditCard: "1234-5678",      // ❌
  apiKey: "..."                 // ❌
}

// ❌ عدم التحقق من التوقيع
jwt.decode(token); // ❌

// ✅ التحقق الصحيح
jwt.verify(token, secret); // ✅
```

### 3️⃣ Cookies والتخزين

#### ✅ تخزين آمن للـ Tokens

```javascript
// في الـ Browser:
// ✅ HttpOnly Cookie (الأفضل) - لا يمكن للـ JavaScript الوصول إليه
document.cookie = `authToken=${token}; HttpOnly; Secure; SameSite=Strict`;

// أو ✅ sessionStorage (أقل أماناً من HttpOnly)
sessionStorage.setItem('authToken', token);

// ❌ localStorage (قابل للهجوم XSS)
localStorage.setItem('authToken', token); // ❌ تجنب

// ❌ متغير عام
window.authToken = token; // ❌ خطير جداً
```

### 4️⃣ HTTPS و SSL

```javascript
// ✅ في production:
const express = require('express');
const https = require('https');
const fs = require('fs');

const app = express();

// إجبار HTTPS
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  next();
});

// تفعيل HSTS (HTTP Strict Transport Security)
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// شهادات SSL/TLS
const options = {
  key: fs.readFileSync('/path/to/key.pem'),
  cert: fs.readFileSync('/path/to/cert.pem'),
};

https.createServer(options, app).listen(443);
```

---

## 🔒 حماية البيانات الحساسة

### 1️⃣ Environment Variables

```bash
# .env (لا تضعه في Git!)
JWT_SECRET=your-super-secret-key-min-32-chars
BCRYPT_ROUNDS=10
DB_CONNECTION=mongodb://user:pass@host:port/db
SMTP_PASSWORD=your-email-password
API_KEYS=secret-keys-here
REFRESH_TOKEN_SECRET=another-secret-32-chars
```

```javascript
# .gitignore
.env
.env.local
.env.*.local
node_modules/
dist/
```

### 2️⃣ تشفير البيانات

```javascript
// backend/utils/encryption.js

const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
  }

  // تشفير البيانات
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // أرجع IV مع البيانات المشفرة
    return `${iv.toString('hex')}:${encrypted}`;
  }

  // فك التشفير
  decrypt(encryptedText) {
    const [iv, encrypted] = encryptedText.split(':');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(iv, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

module.exports = new EncryptionService();

// الاستخدام:
// const encrypted = encryptionService.encrypt('sensitive_data');
// const decrypted = encryptionService.decrypt(encrypted);
```

### 3️⃣ تشفير البيانات في قاعدة البيانات

```javascript
// استخدام في Schema:
const userSchema = new mongoose.Schema({
  // بيانات عادية
  username: String,
  email: String,

  // بيانات مشفرة
  ssn: {
    type: String,
    set: value => encryptionService.encrypt(value),
    get: value => encryptionService.decrypt(value),
  },

  phone: {
    type: String,
    set: value => encryptionService.encrypt(value),
    get: value => encryptionService.decrypt(value),
  },
});
```

---

## 🛡️ الهجمات الشائعة والحماية

### 1️⃣ Brute Force Attack

**المشكلة**: محاولة تخمين كلمة المرور من خلال محاولات متكررة

**الحل**:

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // 5 محاولات فقط
  skipSuccessfulRequests: true, // لا تحسب المحاولات الناجحة
  message: 'عدد محاولات كثير جداً',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
  // معالج الدخول
});
```

### 2️⃣ SQL Injection

**المشكلة**: إدراج كود SQL ضار في الحقول

**الحل**:

```javascript
// ❌ غير آمن:
const user = await User.findOne({
  email: req.body.email, // خطر إذا كانت البيانات غير معالجة
});

// ✅ آمن:
const { validationResult } = require('express-validator');

const loginValidator = [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 })];

app.post('/api/auth/login', loginValidator, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  // استخدم Mongoose/ORM بدلاً من الاستعلامات اليدوية
});
```

### 3️⃣ XSS (Cross-Site Scripting)

**المشكلة**: حقن كود JavaScript ضار

**الحل**:

```javascript
// ✅ استخدم المكتبات:
const DOMPurify = require('isomorphic-dompurify');

// تنظيف المدخلات
const cleanInput = DOMPurify.sanitize(userInput);

// ✅ في React:
const escapeHtml = text => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
};

// ✅ استخدم dangerouslySetInnerHTML بحذر جداً
// أو أفضل: use textContent بدلاً من innerHTML
element.textContent = userInput; // ✅
element.innerHTML = userInput; // ❌
```

### 4️⃣ CSRF (Cross-Site Request Forgery)

**المشكلة**: طلبات غير مصرح بها من مواقع أخرى

**الحل**:

```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(cookieParser());

const csrfProtection = csrf({ cookie: true });

app.post('/api/auth/login', csrfProtection, (req, res) => {
  // التحقق التلقائي من CSRF token
});

// أو استخدم SameSite Cookies:
app.use((req, res, next) => {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict', // الأهم
  });
  next();
});
```

### 5️⃣ Session Fixation

**المشكلة**: سرقة جلسة المستخدم

**الحل**:

```javascript
// إعادة إنشاء Session ID بعد الدخول الناجح
app.post('/api/auth/login', async (req, res) => {
  // ... التحقق من البيانات ...

  // ❌ لا تستخدم نفس الـ Session ID
  // ✅ أنشئ واحد جديد
  const newSessionId = crypto.randomBytes(32).toString('hex');

  // حفظ الـ Session الجديدة
  const session = new Session({
    userId: user._id,
    sessionId: newSessionId,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await session.save();

  res.json({ success: true, token });
});
```

### 6️⃣ Man-in-the-Middle (MITM)

**المشكلة**: الاعتراض وقراءة البيانات أثناء النقل

**الحل**:

```javascript
// ✅ استخدم HTTPS دائماً
app.use((req, res, next) => {
  if (!req.secure) {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  next();
});

// ✅ استخدم Certificate Pinning في التطبيقات المحمولة
// ✅ استخدم VPN أو Private Networks
// ✅ استخدم Mutual TLS (mTLS) بين الخدمات
```

---

## 🔐 التشفير والتسلسل

### 1️⃣ معايير الحد الأدنى

```
تشفير البيانات:
✅ AES-256-CBC للبيانات الحساسة
✅ bcrypt 10+ جولات لكلمات المرور
✅ HMAC-SHA256 للتوقيعات
✅ HTTPS/TLS 1.2+ للنقل
```

### 2️⃣ ترتيب العمليات

```javascript
// ترتيب العمليات الآمن:

1. التحقق من صحة البيانات (Validation)
   └─ length, format, type

2. تنظيف البيانات (Sanitization)
   └─ إزالة الأحرف الخطرة

3. التطبيع (Normalization)
   └─ تحويل لصيغة موحدة

4. التشفير (Encryption/Hashing)
   └─ bcrypt للمرور
   └─ AES للبيانات الحساسة

5. التخزين (Storage)
   └─ قاعدة بيانات آمنة

6. النقل (Transport)
   └─ HTTPS فقط

7. الوصول (Access)
   └─ مع JWT tokens
   └─ مع Rate limiting
```

---

## 📋 الامتثال للمعايير

### 1️⃣ OWASP Top 10 (2021)

```
1. ❌ Broken Access Control       → ✅ استخدم Roles/Permissions
2. ❌ Cryptographic Failures      → ✅ استخدم AES-256
3. ❌ Injection                    → ✅ استخدم Parameterized Queries
4. ❌ Insecure Design             → ✅ Design Security
5. ❌ Security Misconfiguration   → ✅ Secure Config
6. ❌ Vulnerable Components       → ✅ تحديثات مستمرة
7. ❌ Authentication Failures     → ✅ Strong Auth
8. ❌ Data Integrity Failures     → ✅ Encryption
9. ❌ Logging Failures            → ✅ Comprehensive Logging
10. ❌ SSRF                        → ✅ Input Validation
```

### 2️⃣ GDPR Compliance

```javascript
// الحفاظ على خصوصية البيانات:

✅ Encryption at Rest
✅ Encryption in Transit
✅ Data Minimization
✅ User Consent
✅ Right to be Forgotten
✅ Data Breach Notification

// مثال:
class UserPrivacyService {
  // حق الوصول
  async getUserData(userId) {
    return await User.findById(userId);
  }

  // حق التصحيح
  async updateUserData(userId, data) {
    return await User.findByIdAndUpdate(userId, data, { new: true });
  }

  // حق الحذف (النسيان)
  async deleteUserData(userId) {
    // حذف البيانات الشخصية بشكل نهائي
    await User.findByIdAndDelete(userId);
    // احتفظ بالبيانات المجردة فقط (إحصائيات)
  }

  // موافقة صريحة
  async grantConsent(userId, consentType) {
    // تسجيل الموافقة مع الوقت والنسخة
  }
}
```

### 3️⃣ PCI-DSS (إذا كان لديك معاملات)

```
إذا تتعامل مع بيانات بطاقات ائتمان:

✅ عدم تخزين الـ CVV
✅ عدم تخزين الـ PIN
✅ تشفير أرقام البطاقات
✅ PCI-compliant Payment Gateway
✅ Regular Security Audits
✅ Penetration Testing
```

---

## 🔍 قائمة التحقق الأمنية

### قبل الإطلاق:

- [ ] جميع البيانات مشفرة (in transit و at rest)
- [ ] كلمات المرور مع bcrypt
- [ ] JWT tokens مع expiration
- [ ] HTTPS فقط
- [ ] Rate limiting على المصادقة
- [ ] Input validation شامل
- [ ] Error messages لا تفشي معلومات
- [ ] Logging شامل
- [ ] No hardcoded secrets
- [ ] Security headers مفعلة

### بشكل دوري:

- [ ] تحديثات المكتبات
- [ ] Penetration Testing
- [ ] Code Security Audit
- [ ] Dependency Scanning
- [ ] Log Review
- [ ] Access Review

---

## 📚 موارد إضافية

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- NIST Cybersecurity: https://www.nist.gov/
- CWE Top 25: https://cwe.mitre.org/top25/
- SANS Top 25: https://www.sans.org/top25-software-errors/

---

**آخر تحديث**: يناير 2026  
**الأهمية**: 🔴 حرجة جداً
**الامتثال**: ✅ OWASP + GDPR
