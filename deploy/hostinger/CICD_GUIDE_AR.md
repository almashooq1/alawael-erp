# 🚀 دليل النشر التلقائي (CI/CD) - GitHub Actions → Hostinger VPS

## كيف يعمل النظام؟

```
أنت (push code) → GitHub → GitHub Actions → السيرفر (Hostinger VPS)
                              ↓
                    1. يفحص الأخطاء (Tests)
                    2. يبني Frontend
                    3. يرفع الملفات للسيرفر عبر SSH
                    4. يعيد تشغيل التطبيق
                    5. يتحقق أنه يعمل ✅
```

**كل ما عليك**: اكتب كود → `git push` → GitHub ينشر تلقائياً! 🎉

---

## 📋 الإعداد لأول مرة (مرة واحدة فقط)

---

### الخطوة 1: إعداد MongoDB Atlas

> نفس الخطوات في الدليل الأساسي - [DEPLOYMENT_GUIDE_AR.md](DEPLOYMENT_GUIDE_AR.md#الخطوة-1-إعداد-mongodb-atlas-مجاني)

1. افتح [cloud.mongodb.com](https://cloud.mongodb.com)
2. أنشئ Cluster مجاني (M0 FREE)
3. أنشئ مستخدم + كلمة مرور
4. أضف IP السيرفر في Network Access
5. انسخ رابط الاتصال

---

### الخطوة 2: توصيل الدومين

في **Hostinger Panel** → **Domains** → **DNS Records**:

| النوع | الاسم | القيمة |
|-------|-------|--------|
| A | @ | IP السيرفر |
| A | www | IP السيرفر |

---

### الخطوة 3: إعداد السيرفر

```bash
# 1. ادخل السيرفر
ssh root@IP_السيرفر

# 2. حمّل سكربت الإعداد (أو ارفعه بـ SCP)
mkdir -p /home/alawael/app/deploy/hostinger
# ارفع الملف setup-vps-cicd.sh

# 3. شغّل الإعداد
chmod +x /home/alawael/app/deploy/hostinger/setup-vps-cicd.sh
sudo bash /home/alawael/app/deploy/hostinger/setup-vps-cicd.sh
```

**السكربت سيطبع مفتاح SSH** — **انسخه كاملاً!** (ستحتاجه في الخطوة التالية)

---

### الخطوة 4: عدّل ملف .env على السيرفر

```bash
nano /home/alawael/app/backend/.env
```

غيّر:
- `MONGODB_URI` ← رابط MongoDB Atlas
- `JWT_SECRET` ← ولّد عشوائياً: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `JWT_REFRESH_SECRET` ← ولّد عشوائياً (مختلف)
- `SESSION_SECRET` ← ولّد عشوائياً (مختلف)

احفظ: `Ctrl+X` → `Y` → `Enter`

---

### الخطوة 5: إضافة Secrets في GitHub ⭐

هذه **الخطوة الأهم** — ربط GitHub بالسيرفر:

1. افتح مستودعك في GitHub
2. اذهب لـ **Settings** → **Secrets and variables** → **Actions**
3. اضغط **New repository secret** لكل واحد:

| الاسم | القيمة | مثال |
|-------|--------|------|
| `VPS_HOST` | عنوان IP السيرفر | `154.53.xxx.xxx` |
| `VPS_USER` | `alawael` | `alawael` |
| `VPS_SSH_KEY` | مفتاح SSH الخاص (من الخطوة 3) | المفتاح الطويل الذي نسخته |
| `DOMAIN` | اسم الدومين (بدون https) | `alawael.com` |

#### كيف تنسخ مفتاح SSH؟

المفتاح يبدأ بـ:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

**انسخ كل شيء** من `-----BEGIN` إلى `-----END` (شامل السطرين).

---

### الخطوة 6: ارفع الكود على GitHub

```bash
# من جهازك المحلي
cd مجلد_المشروع

git init
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git add .
git commit -m "Initial deployment"
git push -u origin main
```

**بمجرد الـ push ← GitHub Actions ينشر تلقائياً!** 🚀

---

## 🔄 التحديث اليومي

بعد أي تعديل على الكود:

```bash
git add .
git commit -m "وصف التعديل"
git push origin main
```

**هذا كل شيء!** GitHub يفعل الباقي:
1. ✅ يفحص الاختبارات
2. ✅ يبني Frontend
3. ✅ يرفع للسيرفر
4. ✅ يعيد التشغيل
5. ✅ يتحقق من الصحة

---

## 📊 متابعة النشر

### مشاهدة التقدم:
1. اذهب لـ GitHub → **Actions**
2. اضغط على آخر workflow run
3. شاهد الخطوات مباشرة

### حالة النشر:
- ✅ **أخضر** = نجح
- ❌ **أحمر** = فشل (اضغط لمعرفة السبب)
- 🟡 **أصفر** = قيد التنفيذ

---

## 🎛️ نشر يدوي (بدون push)

لو تريد نشر بدون تعديل كود:

1. GitHub → **Actions** → **Deploy to Hostinger VPS**
2. اضغط **Run workflow**
3. اختر:
   - `both` — ينشر Backend + Frontend
   - `backend-only` — Backend فقط
   - `frontend-only` — Frontend فقط

---

## 🆘 حل المشاكل

### ❌ "Permission denied (publickey)"
- تأكد أن `VPS_SSH_KEY` في GitHub Secrets يحتوي المفتاح **الخاص** (يبدأ بـ `-----BEGIN OPENSSH PRIVATE KEY-----`)
- تحقق أن المفتاح العام موجود في السيرفر: `cat /home/alawael/.ssh/authorized_keys`

### ❌ "Health check failed"
```bash
# على السيرفر:
pm2 logs alawael-api --lines 50
cat /home/alawael/app/backend/.env | grep MONGODB
```

### ❌ "rsync: connection refused"
- تأكد أن `VPS_HOST` صحيح في GitHub Secrets
- تأكد أن SSH يعمل: `ssh alawael@IP_السيرفر`

### ❌ "Tests failed"
- GitHub Actions لن ينشر إذا فشلت الاختبارات
- أصلح الأخطاء وادفع مرة أخرى

---

## 📁 ملفات النشر

```
.github/workflows/deploy-hostinger.yml  ← GitHub Actions workflow
deploy/hostinger/
├── setup-vps-cicd.sh                   ← إعداد السيرفر (مرة واحدة)
├── ecosystem.config.js                  ← إعدادات PM2
├── .env.production                      ← قالب متغيرات البيئة
├── DEPLOYMENT_GUIDE_AR.md               ← دليل النشر اليدوي
├── CICD_GUIDE_AR.md                     ← هذا الملف
└── setup-server.sh                      ← إعداد يدوي (بديل)
```

---

**تم! 🎉** الآن كل push لـ `main` سينشر تلقائياً.
