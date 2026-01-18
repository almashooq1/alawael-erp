# 🔐 قائمة التحقق الأمنية الشاملة

**التاريخ:** 14 يناير 2026  
**الإصدار:** 1.0.0  
**الحالة:** اختبار شامل مطلوب

---

## 📋 قائمة التحقق الأمان قبل الإطلاق

### الفئة 1: المصادقة والتفويض (Authentication & Authorization)

- [ ] **JWT Secrets محمية**

  ```bash
  # تحقق أن JWT_SECRET في ملف .env آمن
  grep JWT_SECRET .env
  # يجب أن يكون 32+ حرف عشوائي
  ```

- [ ] **كلمات المرور مشفرة**

  ```bash
  # تحقق من استخدام bcrypt
  grep -r "bcrypt" backend/
  ```

- [ ] **لا توجد كلمات مرور في الكود**

  ```bash
  # ابحث عن كلمات مرور مكتوبة
  grep -r "password.*=" backend/ | grep -v "req\|bcrypt"
  ```

- [ ] **Session Timeout معقول**

  ```
  JWT_EXPIRE=7d ✓ (معقول)
  ```

- [ ] **CORS محدد بشكل صحيح**
  ```env
  CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
  # لا تستخدم *
  ```

### الفئة 2: تشفير وحماية البيانات (Encryption & Data Protection)

- [ ] **HTTPS/SSL تفعيل**

  ```bash
  # تحقق من SSL certificate
  ls -la /etc/letsencrypt/live/yourdomain.com/
  ```

- [ ] **التشفير أثناء النقل (TLS)**

  ```
  ✓ تم تفعيل HTTPS
  ✓ TLS 1.2+
  ```

- [ ] **تشفير قاعدة البيانات**

  ```
  MongoDB Authentication: ✓ تفعيل
  ```

- [ ] **No Sensitive Data in Logs**
  ```bash
  # تحقق من السجلات
  grep -i "password\|token\|secret" logs/*.log
  # يجب أن تكون النتيجة فارغة
  ```

### الفئة 3: حماية الخوادم (Server Security)

- [ ] **Helmet Headers تفعيل**

  ```javascript
  const helmet = require('helmet');
  app.use(helmet()); // ✓ موجود
  ```

- [ ] **HSTS معيّن**

  ```
  Strict-Transport-Security: max-age=31536000
  ```

- [ ] **X-Frame-Options**

  ```
  X-Frame-Options: DENY ✓
  ```

- [ ] **Content Security Policy (CSP)**

  ```
  Content-Security-Policy: default-src 'self' ✓
  ```

- [ ] **X-Content-Type-Options**
  ```
  X-Content-Type-Options: nosniff ✓
  ```

### الفئة 4: حدود الطلبات (Rate Limiting)

- [ ] **Rate Limiting تفعيل**

  ```javascript
  const rateLimit = require('express-rate-limit');
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 دقيقة
      max: 100, // 100 طلب
    }),
  );
  ```

- [ ] **استثناءات معقولة**

  ```
  - Login: 5 محاولات/15 دقيقة
  - API: 100 طلب/15 دقيقة
  - Upload: 10 طلب/ساعة
  ```

- [ ] **DDoS Protection**
  ```
  Cloudflare أو WAF معيّن
  ```

### الفئة 5: أمان قاعدة البيانات (Database Security)

- [ ] **SQL Injection Prevention**

  ```bash
  grep -r "query\|exec" backend/ | grep -v "findOne\|find("
  # جميع الاستعلامات يجب أن تستخدم ORM/prepared statements
  ```

- [ ] **MongoDB Injection Prevention**

  ```javascript
  // ✓ استخدام mongo-sanitize
  const mongoSanitize = require('mongo-sanitize');
  app.use(mongoSanitize());
  ```

- [ ] **Credentials Database**

  ```bash
  # تحقق من بيانات الاعتماد
  mongosh
  db.users.findOne() # يجب أن يكون password مشفر
  ```

- [ ] **Database Backups**

  ```bash
  # يجب أن تكون موجودة
  ls -la backups/
  # يجب أن تكون محدثة يومياً
  ```

- [ ] **Firewall Rule**
  ```
  MongoDB: 127.0.0.1:27017 فقط
  Redis: 127.0.0.1:6379 فقط
  ```

### الفئة 6: الملفات والرفع (File Upload Security)

- [ ] **File Type Validation**

  ```javascript
  // تحقق من upload handlers
  const allowedTypes = ['image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }
  ```

- [ ] **File Size Limit**

  ```javascript
  const upload = multer({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  });
  ```

- [ ] **No Executable Files**

  ```bash
  # تحقق من أن لا توجد .exe, .sh, .bat
  find uploads/ -type f \( -name "*.exe" -o -name "*.sh" -o -name "*.bat" \)
  ```

- [ ] **Virus Scanning** (اختياري)
  ```
  استخدم ClamAV لفحص الملفات المرفوعة
  ```

### الفئة 7: Logging و Monitoring (السجلات والمراقبة)

- [ ] **Audit Logging**

  ```bash
  # تحقق من وجود سجلات الأنشطة
  ls logs/audit.log
  ```

- [ ] **Error Logging آمن**

  ```bash
  # لا توجد حساسيات في الأخطاء
  grep "password\|token\|credit" logs/error.log
  ```

- [ ] **Security Events Logged**

  ```
  - Failed logins ✓
  - Permission denials ✓
  - Suspicious activities ✓
  ```

- [ ] **Log Rotation**
  ```bash
  # تحقق من logrotate config
  cat /etc/logrotate.d/almashooq
  ```

### الفئة 8: تحديثات الأمان (Security Updates)

- [ ] **Dependency Vulnerabilities**

  ```bash
  npm audit
  # يجب أن تكون النتيجة:
  # 0 vulnerabilities
  ```

- [ ] **Node.js Version Current**

  ```bash
  node --version
  # يجب أن يكون 18.0+
  ```

- [ ] **npm Updated**

  ```bash
  npm --version
  # يجب أن يكون 8.0+
  ```

- [ ] **Security Patches Applied**
  ```bash
  # قم بتطبيق أحدث التحديثات
  npm update
  ```

### الفئة 9: الخصوصية والامتثال (Privacy & Compliance)

- [ ] **Privacy Policy موجودة**

  ```
  /privacy-policy موجودة
  ```

- [ ] **Terms of Service موجودة**

  ```
  /terms-of-service موجودة
  ```

- [ ] **GDPR Compliance** (إذا لزم الأمر)

  ```
  - Right to access ✓
  - Right to delete ✓
  - Data export ✓
  ```

- [ ] **Data Retention Policy**
  ```
  - User data: محفوظ 2 سنة
  - Logs: محفوظ 30 يوم
  - Backups: محفوظ 3 أشهر
  ```

### الفئة 10: اختبارات الأمان (Security Testing)

- [ ] **Penetration Testing**

  ```bash
  # اختبر الثغرات الشائعة
  # استخدم OWASP ZAP أو Burp Suite
  ```

- [ ] **XSS Testing**

  ```javascript
  // اختبر هذا الرابط:
  // http://localhost:3001/?search=<img src=x onerror=alert('xss')>
  // يجب أن يتم تنقية المدخل
  ```

- [ ] **CSRF Protection**

  ```javascript
  // تحقق من استخدام csrf tokens
  const csrf = require('csurf');
  app.use(csrf()); // ✓ يجب أن يكون موجود
  ```

- [ ] **SQL Injection Testing**

  ```bash
  # اختبر:
  # /api/vehicles?id=1'; DROP TABLE vehicles; --
  # يجب أن يفشل بأمان
  ```

- [ ] **XXE Prevention**
  ```javascript
  // تحقق من معالجة XML آمنة
  // استخدم xml2js مع الإعدادات الآمنة
  ```

---

## 🔍 اختبارات أمان متقدمة

### Test 1: Header Security

```bash
curl -I https://yourdomain.com

# يجب أن ترى:
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: default-src 'self'
# X-XSS-Protection: 1; mode=block
```

### Test 2: CORS Security

```bash
curl -H "Origin: http://evil.com" \
     -H "Access-Control-Request-Method: POST" \
     https://yourdomain.com

# يجب أن ترى رفض الطلب
```

### Test 3: Rate Limiting

```bash
# أرسل 150 طلب في 15 دقيقة
for i in {1..150}; do
  curl https://yourdomain.com/api/health
done

# يجب أن يتم تقييد الطلبات بعد 100
```

### Test 4: SQL/NoSQL Injection

```bash
# اختبر input عادي
curl "https://yourdomain.com/api/vehicles?id=1"

# اختبر injection
curl "https://yourdomain.com/api/vehicles?id=1' OR '1'='1"
curl "https://yourdomain.com/api/vehicles?id={'\$ne':null}"

# يجب أن تفشل بأمان
```

---

## 📊 التحقق السريع

```bash
#!/bin/bash

# 1. فحص التبعيات
echo "🔍 فحص الثغرات الأمنية..."
npm audit

# 2. فحص الكود
echo "🔍 فحص الملفات الحساسة..."
grep -r "password" backend/*.js | grep -v "req\|hash"

# 3. فحص الخوادم
echo "🔍 فحص الخوادم الجارية..."
netstat -tulpn | grep LISTEN

# 4. فحص الاتصالات
echo "🔍 فحص الاتصالات الآمنة..."
curl -I https://yourdomain.com
```

---

## ⚠️ المشاكل الشائعة والحلول

### مشكلة 1: JWT Secret ضعيفة

**الحل:**

```bash
# توليد secret جديد
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# ثم حدث .env
```

### مشكلة 2: HTTPS غير مفعّل

**الحل:**

```bash
# الحصول على certificate من Let's Encrypt
sudo certbot certonly --standalone -d yourdomain.com
```

### مشكلة 3: SQL Injection ممكن

**الحل:**

```javascript
// استخدم parameterized queries
const vehicle = await Vehicle.findOne({ _id: req.params.id });
// بدلاً من:
const vehicle = await Vehicle.find({ $where: req.params.query });
```

### مشكلة 4: Dependency vulnerabilities

**الحل:**

```bash
npm audit fix
npm update
```

---

## 📈 الملخص

| الفئة          | الحالة | الإجراء             |
| -------------- | ------ | ------------------- |
| Authentication | ✅     | تحقق من JWT Secrets |
| Encryption     | ✅     | فعّل HTTPS          |
| Servers        | ✅     | راقب Helmet Headers |
| Rate Limiting  | ✅     | فعّل limits         |
| Database       | ✅     | أضف مصادقة          |
| Files          | ✅     | تحقق من رفع الملفات |
| Logging        | ✅     | سجّل الأمان         |
| Updates        | ✅     | طبّق الحديثة        |
| Privacy        | ✅     | أضف السياسات        |
| Testing        | ✅     | اختبر الثغرات       |

---

**تم إنشاء هذا الملف:** 14 يناير 2026  
**الحالة:** ✅ قابل للاستخدام الفوري
