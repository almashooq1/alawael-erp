# 🔧 دليل إعداد GitHub Secrets & Variables

## 📌 نظرة عامة

هذا الملف يحتوي على جميع المتغيرات والأسرار التي يجب تعريفها في GitHub Repository لكي تعمل GitHub Actions workflows بشكل صحيح.

---

## 🔐 Repository Secrets (القيم الحساسة)

يجب إضافة هذه القيم في:  
**Repository → Settings → Secrets and variables → Actions → Secrets**

### 1. SSH Keys للتوزيع

```plaintext
STAGING_KEY
القيمة: محتوى SSH private key للـ staging server
الاستخدام: نشر التطبيق على staging environment

PROD_KEY
القيمة: محتوى SSH private key للـ production server
الاستخدام: نشر التطبيق على production environment
```

**كيفية إنشاء SSH Key:**

```bash
# على جهازك المحلي:
ssh-keygen -t ed25519 -C "github-actions@yourproject.com" -f github_deploy_key
# سينشئ ملفين:
# - github_deploy_key (private key) → أضفه كـ secret
# - github_deploy_key.pub (public key) → أضفه على السيرفر
```

### 2. JWT & Authentication

```plaintext
JWT_SECRET
القيمة: سلسلة عشوائية طويلة (32+ حرف)
الاستخدام: تشفير JWT tokens
مثال: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08

MONGO_PASSWORD
القيمة: كلمة مرور MongoDB
الاستخدام: الاتصال بقاعدة البيانات
ملاحظة: يجب أن تكون قوية (12+ حرف، أرقام، رموز)
```

### 3. Slack Notifications (اختياري)

```plaintext
SLACK_WEBHOOK
القيمة: Slack Webhook URL
الاستخدام: إرسال إشعارات التوزيع
مثال: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

**كيفية الحصول على Slack Webhook:**

1. اذهب إلى https://api.slack.com/apps
2. Create New App → From scratch
3. اختر workspace
4. Incoming Webhooks → Activate
5. Add New Webhook to Workspace
6. انسخ Webhook URL

---

## 📝 Repository Variables (القيم العامة)

يجب إضافة هذه القيم في:  
**Repository → Settings → Secrets and variables → Actions → Variables**

### 1. Server Hostnames

```plaintext
STAGING_HOST
القيمة: staging.yoursite.com
الاستخدام: عنوان staging server

PROD_HOST
القيمة: yoursite.com أو www.yoursite.com
الاستخدام: عنوان production server
```

### 2. Server Users

```plaintext
STAGING_USER
القيمة: deploy أو username على staging server
الاستخدام: المستخدم للاتصال بـ staging server

PROD_USER
القيمة: deploy أو username على production server
الاستخدام: المستخدم للاتصال بـ production server
```

### 3. AWS Configuration (إذا كنت تستخدم AWS)

```plaintext
AWS_ACCOUNT_ID
القيمة: 123456789012 (12 رقم)
الاستخدام: AWS account identifier
كيفية معرفته: AWS Console → Account → Account ID

PRODUCTION_API_URL
القيمة: https://api.yoursite.com
الاستخدام: API endpoint للـ smoke tests
```

### 4. Feature Flags

```plaintext
SLACK_NOTIFICATIONS_ENABLED
القيمة: true أو false
الاستخدام: تفعيل/تعطيل Slack notifications
افتراضي: false
```

---

## 📋 قائمة تحقق سريعة

قبل تشغيل GitHub Actions، تأكد من:

### ✅ Secrets Required

- [ ] STAGING_KEY
- [ ] PROD_KEY
- [ ] JWT_SECRET
- [ ] MONGO_PASSWORD

### ✅ Variables Required

- [ ] STAGING_HOST
- [ ] STAGING_USER
- [ ] PROD_HOST
- [ ] PROD_USER

### ⚠️ Optional (حسب احتياجك)

- [ ] SLACK_WEBHOOK (إذا كنت تريد Slack notifications)
- [ ] SLACK_NOTIFICATIONS_ENABLED
- [ ] AWS_ACCOUNT_ID (إذا كنت تستخدم AWS)
- [ ] PRODUCTION_API_URL

---

## 🔨 كيفية إضافة Secret/Variable

### خطوات إضافة Secret:

1. اذهب إلى GitHub Repository
2. اضغط على **Settings** (في الأعلى)
3. في القائمة الجانبية: **Secrets and variables** → **Actions**
4. اختر تبويب **Secrets**
5. اضغط **New repository secret**
6. أدخل:
   - Name: اسم المتغير (مثل: `JWT_SECRET`)
   - Secret: القيمة الحساسة
7. اضغط **Add secret**

### خطوات إضافة Variable:

1. نفس الخطوات 1-3 أعلاه
2. اختر تبويب **Variables**
3. اضغط **New repository variable**
4. أدخل:
   - Name: اسم المتغير (مثل: `STAGING_HOST`)
   - Value: القيمة (مثل: `staging.example.com`)
5. اضغط **Add variable**

---

## 🎯 أمثلة قيم كاملة

### مثال للتطوير/الاختبار:

**Secrets:**

```plaintext
JWT_SECRET=test_jwt_secret_for_development_only_change_in_production_123456
MONGO_PASSWORD=mongodb_dev_password_123
STAGING_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFl...
-----END OPENSSH PRIVATE KEY-----
```

**Variables:**

```plaintext
STAGING_HOST=staging.example.com
STAGING_USER=deploy
SLACK_NOTIFICATIONS_ENABLED=false
```

### مثال للإنتاج:

**Secrets:**

```plaintext
JWT_SECRET=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
MONGO_PASSWORD=MvC#7$kL9@pQ2xR5
PROD_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFl...
-----END OPENSSH PRIVATE KEY-----
SLACK_WEBHOOK=https://hooks.slack.com/services/T1234/B5678/ABCDEF
```

**Variables:**

```plaintext
PROD_HOST=www.mysite.com
PROD_USER=deploy
PRODUCTION_API_URL=https://api.mysite.com
SLACK_NOTIFICATIONS_ENABLED=true
```

---

## 🔒 نصائح الأمان

### ✅ افعل:

- ✅ استخدم كلمات مرور قوية (12+ حرف)
- ✅ استخدم SSH keys بدلاً من كلمات المرور
- ✅ غيّر JWT_SECRET بشكل دوري
- ✅ احفظ نسخة احتياطية من SSH keys بشكل آمن
- ✅ استخدم secrets مختلفة لـ staging و production

### ❌ لا تفعل:

- ❌ لا تضع secrets في الكود
- ❌ لا تشارك secrets عبر Slack/Email
- ❌ لا تستخدم كلمات مرور بسيطة
- ❌ لا تستخدم نفس JWT_SECRET في staging و production
- ❌ لا تنشر secrets على GitHub

---

## 🧪 اختبار التكوين

بعد إضافة جميع Secrets و Variables، يمكنك اختبار التكوين:

```bash
# 1. Push إلى branch
git push origin feature/test-actions

# 2. راقب GitHub Actions
# اذهب إلى: Repository → Actions
# ابحث عن workflow run الجديد

# 3. تحقق من النتائج
# إذا نجح: ✅ جميع secrets/variables صحيحة
# إذا فشل: راجع logs وتأكد من القيم
```

---

## ❓ استكشاف الأخطاء

### Error: "Context access might be invalid"

**السبب:** المتغير غير معرّف في GitHub  
**الحل:** أضف المتغير في Repository Variables/Secrets

### Error: "Permission denied (publickey)"

**السبب:** SSH key غير صحيح أو غير موجود  
**الحل:**

1. تأكد من إضافة STAGING_KEY/PROD_KEY في Secrets
2. تأكد من إضافة public key على السيرفر:

```bash
# على السيرفر:
echo "ssh-ed25519 AAAA..." >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Error: "Invalid JWT"

**السبب:** JWT_SECRET غير متطابق  
**الحل:** تأكد من أن JWT_SECRET في GitHub مطابق للـ .env على السيرفر

---

## 📞 المساعدة

إذا واجهت مشاكل:

1. تحقق من أسماء المتغيرات (case-sensitive)
2. تأكد من عدم وجود مسافات إضافية
3. راجع GitHub Actions logs للتفاصيل
4. تأكد من permissions على GitHub (Settings → Actions → General)

---

**آخر تحديث:** 18 يناير 2026  
**الإصدار:** 1.0.0
