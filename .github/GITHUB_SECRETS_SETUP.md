# 🔐 GitHub Actions Secrets — دليل الإعداد

> **آخر تحديث**: مارس 2026 — يتوافق مع الـ workflows الحالية

## كيفية إضافة Secrets

1. اذهب إلى **Settings → Secrets and variables → Actions**
2. انقر **New repository secret**
3. أدخل الاسم والقيمة
4. انقر **Add secret**

---

## ✅ Secrets المطلوبة الآن (الـ Workflows الحالية)

### للنشر على الـ VPS (deploy.yml + deploy-hostinger.yml)

| اسم الـ Secret | الوصف | ضروري؟ |
|:-------------|:------|:------:|
| `VPS_HOST` | IP أو domain السيرفر (مثل: `203.0.113.10`) | ✅ نعم |
| `VPS_USER` | اسم المستخدم SSH (مثل: `root` أو `alawael`) | ✅ نعم |
| `VPS_SSH_KEY` | مفتاح SSH الخاص (من `~/.ssh/id_rsa`) | ✅ نعم |
| `DOMAIN` | الدومين (مثل: `alaweal.org`) — افتراضي: `alaweal.org` | اختياري |

### للـ Staging (deploy-staging.yml) — نفس VPS أو مختلف

| اسم الـ Secret | الوصف | ضروري؟ |
|:-------------|:------|:------:|
| `STAGING_SSH_KEY` | مفتاح SSH للـ staging (يمكن نفس `VPS_SSH_KEY`) | اختياري |
| `STAGING_HOST` | IP السيرفر staging (يمكن نفس `VPS_HOST`) | اختياري |
| `STAGING_USER` | مستخدم SSH للـ staging | اختياري |
| `STAGING_DOMAIN` | دومين staging (مثل: `staging.alaweal.org`) | اختياري |

> **ملاحظة**: إذا لم تُضف أي secrets للـ staging، سيتم تخطي الـ deploy تلقائياً بدون فشل.

---

## 🔧 كيفية توليد مفتاح SSH

```bash
# توليد مفتاح جديد
ssh-keygen -t ed25519 -b 4096 -f ~/.ssh/alawael_deploy -N "" -C "github-actions-deploy"

# نسخ المفتاح العام إلى السيرفر
ssh-copy-id -i ~/.ssh/alawael_deploy.pub root@YOUR_VPS_IP

# المفتاح الخاص هو ما تضعه في GitHub Secret VPS_SSH_KEY
cat ~/.ssh/alawael_deploy
```

---

## 🧪 اختبار الـ Secrets

بعد الإضافة، تحقق بتشغيل deploy.yml يدوياً:
- **Actions → ⚡ Quick Deploy (Manual) → Run workflow**
- إذا ظهر "✅ All required secrets present" → الإعداد صحيح
- إذا ظهر "❌ Missing: VPS_HOST" → الـ secret ناقص

---

## 🔒 أفضل الممارسات الأمنية

1. **لا تشارك المفاتيح الخاصة** — فقط المفتاح العام يذهب للسيرفر
2. **غيّر المفاتيح كل 6 أشهر** أو عند مغادرة أي عضو للفريق
3. **استخدم مستخدم deploy مخصص** بصلاحيات محدودة (ليس root إن أمكن)
4. **راجع سجل الـ Actions** دورياً للتأكد من عدم وجود وصول غير مصرح به

---

## ⚠️ Secrets محذوفة / مهجورة (من الـ Config القديم)

الأسماء التالية لم تعد مستخدمة في الـ workflows الحالية:

| اسم قديم | البديل الحالي |
|:---------|:-------------|
| `STAGING_KEY` | `STAGING_SSH_KEY` أو `VPS_SSH_KEY` |
| `PROD_KEY` | `VPS_SSH_KEY` |
| `PROD_HOST` | `VPS_HOST` |
| `PROD_USER` | `VPS_USER` |
| `STAGING_MONGODB_URI` | غير مستخدم |
| `STAGING_JWT_SECRET` | غير مستخدم |
| `CODECOV_TOKEN` | غير مستخدم |

---

## 📋 Checklist الإعداد السريع

```
Settings → Secrets and variables → Actions → New repository secret

[ ] VPS_HOST       = عنوان السيرفر
[ ] VPS_USER       = اسم المستخدم (مثلاً: root)
[ ] VPS_SSH_KEY    = المفتاح الخاص (-----BEGIN ... -----END-----)
[ ] DOMAIN         = alaweal.org (اختياري)
```

بعد إضافة هذه الـ 3 secrets، جميع الـ workflows ستعمل بشكل صحيح ✅
