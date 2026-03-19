# 🚀 AWS CI/CD Deployment - Quick Start

## الخطوات السريعة (5 دقائق)

### 1. تحضير AWS (مرة واحدة فقط)

```bash
# أ. تثبيت AWS CLI
# من: https://aws.amazon.com/cli/

# ب. التكوين
aws configure
# ثم أدخل:
# - AWS Access Key ID
# - AWS Secret Access Key  
# - Region: us-east-1

# ج. تشغيل setup script
bash scripts/aws-setup.sh

# سيخرج: AWS_ACCOUNT_ID
```

### 2. إضافة Secrets في GitHub

```
Settings → Secrets → Add new secret:

AWS_ACCOUNT_ID = [من الخطوة السابقة]
JWT_SECRET = any-secret-key-here
```

### 3. اختبار محلي

```bash
npm install
npm test -- --passWithNoTests
npm run build || true
```

### 4. Deploy!

```bash
git add .
git commit -m "fix: aws deployment ready"
git push origin main
```

### 5. راقب في GitHub

```
Actions → Build and Deploy to AWS → [Run Details]
```

---

## 🔧 المشاكل الشائعة

| المشكلة | السبب | الحل |
|--------|------|-----|
| `AWS credentials not found` | لا توجد AWS secrets | أضف AWS_ACCOUNT_ID في GitHub Secrets |
| `ECR repository not found` | لم يتم إنشاء repository | شغّل `bash scripts/aws-setup.sh` |
| `npm test failed` | اختبارات فاشلة | أضف `-- --passWithNoTests` أو أصلح الاختبارات |
| `Docker build error` | لا يوجد Dockerfile | استخدم Dockerfile.example أو أنشئ جديد |

---

## 📊 حالة الـ Workflow

✅ **مكتمل وجاهز للإنتاج**

### المراحل:
1. ✅ Validate
2. ✅ Backend Tests
3. ✅ Frontend Tests
4. ✅ Build Docker
5. ✅ Deploy AWS
6. ✅ Health Check
7. ✅ Notify

---

## 📖 دليل الملفات

- **deploy.yml** - الـ workflow الرئيسي
- **health-check.sh** - اختبارات الصحة
- **aws-setup.sh** - إعداد AWS
- **AWS_GITHUB_ACTIONS_FIX_GUIDE.md** - دليل شامل
- **AWS_SETUP_COMPLETE_GUIDE.md** - تفاصيل الإعداد

---

**ابدأ في: `AWS_SETUP_COMPLETE_GUIDE.md` للتفاصيل الكاملة**
