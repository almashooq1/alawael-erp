# 🆘 دليل استكشاف الأخطاء والحل

**التاريخ**: يناير 17, 2026  
**الأولوية**: 🟠 MEDIUM  
**الحالة**: شامل وعملي

---

## 🔍 استكشاف الأخطاء الشهيرة

### المشكلة 1: لا يمكن الاتصال بقاعدة البيانات

**الأعراض:**

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**الحل:**

```bash
# 1. تحقق من أن MySQL يعمل
sudo systemctl status mysql

# أو ابدأه إن لم يكن يعمل
sudo systemctl start mysql

# 2. تحقق من بيانات الاتصال في .env
cat .env | grep DB_

# 3. اختبر الاتصال يدويً
mysql -h localhost -u alawael_user -p alawael_erp

# 4. إذا كنت تستخدم Docker
docker-compose ps  # تحقق من حالة الخدمات
docker-compose logs db  # اعرض logs الـ database

# 5. تحقق من الأذونات
mysql -u root -p
SELECT user, host FROM mysql.user;
```

---

### المشكلة 2: Port 3001 مشغول بالفعل

**الأعراض:**

```
Error: listen EADDRINUSE :::3001
```

**الحل:**

```bash
# 1. اعرض العملية التي تستخدم الـ port
lsof -i :3001
# أو على Windows
netstat -ano | findstr :3001

# 2. أوقف العملية
kill -9 <PID>
# أو على Windows
taskkill /PID <PID> /F

# 3. أو استخدم port مختلف
PORT=3002 npm run dev
```

---

### المشكلة 3: خطأ JWT/Token غير صحيح

**الأعراض:**

```
Error: jwt malformed
Error: invalid token
```

**الحل:**

```bash
# 1. تحقق من JWT_SECRET في .env
echo $JWT_SECRET
# يجب أن يكون قويً وطويلاً

# 2. اطلب token جديد
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# 3. استخدم Token الجديد
curl -H "Authorization: Bearer <NEW_TOKEN>" \
  http://localhost:3001/api/users/me

# 4. تحقق من Token Expiry
# اختبر token expired:
npm run test -- auth.test.js
```

---

### المشكلة 4: خطأ في الـ Migrations

**الأعراض:**

```
Error: table already exists
Error: migration failed
```

**الحل:**

```bash
# 1. اعرض حالة الـ migrations
npm run migrate:status

# 2. تراجع عن آخر migration
npm run migrate:rollback

# 3. اعرض logs الـ migration
npm run migrate:status --verbose

# 4. إذا كنت متأكداً، احذف الجداول وأعد الـ migrations
mysql -u root -p alawael_erp
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sessions;

# ثم أعد تشغيل الـ migrations
npm run migrate
npm run seed
```

---

### المشكلة 5: أخطاء الأمان (SSL/TLS)

**الأعراض:**

```
Error: SELF_SIGNED_CERT_IN_CHAIN
Error: SSL certificate problem
```

**الحل (Development فقط):**

```bash
# تجاهل التحقق من SSL في التطوير
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev

# أو في .env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**الحل (Production):**

```bash
# احصل على شهادة SSL من Let's Encrypt
sudo certbot certonly --standalone -d alawael.com

# تحقق من الشهادة
sudo certbot certificates

# تجديد الشهادة
sudo certbot renew --dry-run

# تفعيل التجديد التلقائي
sudo systemctl enable certbot.timer
```

---

## 📊 فحص الأداء

### بطء في الاستجابة

```bash
# 1. اعرض الـ logs
pm2 logs

# 2. اعرض استخدام الموارد
top -p $(pgrep -f "node server.js")

# 3. اختبر الـ queries
npm run test:db

# 4. استخدم slow query log
mysql -u root -p
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

# 5. اعرض الـ queries البطيئة
tail -f /var/log/mysql/slow.log
```

### استخدام عالي للـ Memory

```bash
# 1. اعرض استخدام الذاكرة
pm2 info alawael-erp

# 2. ابحث عن memory leaks
node --inspect server.js

# 3. افتح Chrome DevTools
chrome://inspect

# 4. أو استخدم clinic.js
npm install -g clinic
clinic doctor -- node server.js

# 5. إعادة تشغيل العملية
pm2 restart alawael-erp
```

---

## 🔐 مشاكل الأمان

### محاولات تسجيل دخول متعددة

```bash
# 1. اعرض السجلات
grep "failed login" ./logs/*.log

# 2. تحقق من account lockout
mysql -u root -p alawael_erp
SELECT * FROM users WHERE status = 'suspended';

# 3. فعّل المصادقة الثنائية
UPDATE users SET two_factor_enabled = TRUE WHERE role = 'admin';

# 4. أعد تعيين كلمة المرور
UPDATE users SET password_hash = '$2b$10$...' WHERE id = 1;
```

### شك في اختراق

```bash
# 1. راجع سجلات الأنشطة
SELECT * FROM activity_logs
WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY created_at DESC;

# 2. تحقق من الجلسات النشطة غير العادية
SELECT * FROM sessions WHERE is_active = TRUE;

# 3. أنهِ الجلسات المريبة
UPDATE sessions SET is_active = FALSE WHERE id = XX;

# 4. غيّر أسرار قوية
npm run change-password
```

---

## 📱 مشاكل الـ Frontend

### الـ API يعطي الرد لكن الـ Frontend لا يعمل

```javascript
// 1. افتح Developer Console (F12)
// 2. اعرض Network tab
// 3. تحقق من CORS errors
// 4. تحقق من Content-Type header

// الحل:
// تأكد من CORS في .env
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

// وأعد تشغيل الخادم
npm run dev
```

---

## 📋 قائمة فحص استكشاف الأخطاء

```
عند حدوث مشكلة:
☐ اعرض رسالة الخطأ كاملة
☐ افتح logs (/logs و browser console)
☐ تحقق من .env والإعدادات
☐ اختبر الاتصالات الأساسية
☐ جرب restart الخدمات
☐ تحقق من الموارد (CPU, Memory)
☐ ابحث عن الخطأ في التوثيق
☐ اطلب help من الفريق

معلومات مهمة لـ Debugging:
✓ رسالة الخطأ الكاملة
✓ متى بدأت المشكلة
✓ ما الذي تغير مؤخراً
✓ لا توثق أسرار أو passwords
✓ اعرض relevant logs فقط
```

---

## 🎯 الدعم والمساعدة

```
للحصول على المساعدة:
1. اعرض الـ logs أولاً
2. ابحث في التوثيق
3. اسأل في Slack (قنوات التطوير)
4. افتح issue في GitHub
5. اتصل بـ Lead Developer

الساعات المتاحة:
- النوبة الأولى: 8 AM - 5 PM (GMT+3)
- النوبة الثانية: 4 PM - 1 AM (GMT+3)
- Support 24/7 للـ Critical Issues

الأولويات:
🔴 Critical: النظام معطل - فوري
🟠 High: ميزة مهمة لا تعمل - ساعتين
🟡 Medium: مشكلة عادية - يوم واحد
🟢 Low: تحسينات - أسبوع واحد
```

---

**الحالة**: ✅ جاهز للاستخدام  
**آخر تحديث**: يناير 17, 2026
