# ⚡ Copy-Paste Command Reference
## جميع الأوامر الجاهزة للنسخ واللصق

---

## الجزء 1: التحضير (15 دقيقة)

### التحقق من المتطلبات
```bash
# تحقق من كل شيء:
node --version && npm --version && docker --version && aws --version

# إذا كان كل شيء OK، انتقل للـ next step
# إذا امر واحد فاشل، اتبع تعليمات التثبيت تحت
```

### إذا احتجت Node.js
```bash
# Windows: تحميل أونلاين من https://nodejs.org/
# ثبت الـ LTS version (18.x أو 20.x)

# Mac:
brew install node

# Linux:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### إذا احتجت Docker
```bash
# Windows/Mac: اذهب إلى https://www.docker.com/products/docker-desktop
# Linux:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### إذا احتجت AWS CLI
```bash
# Windows: تحميل من https://awscli.amazonaws.com/AWSCLIV2.msi
# Mac:
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Linux:
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

---

## الجزء 2: اختبار محلي (15 دقيقة)

### تنظيف وتثبيت
```bash
cd erp_new_system/backend

# تنظيف كل شيء
npm cache clean --force

# تثبيت جديد
npm install

# في حالة مشاكل:
npm install --legacy-peer-deps
```

### تشغيل الاختبارات
```bash
# من مجلد backend:
npm test -- --passWithNoTests

# أو مع coverage:
npm test -- --coverage --passWithNoTests

# للـ frontend أيضاً:
cd ../frontend
npm install
npm test -- --passWithNoTests

# العودة:
cd ..
```

### بناء Docker (اختياري)
```bash
# بناء صورة backend
docker build -t therapy-api:test erp_new_system/backend/

# بناء صورة frontend
docker build -t therapy-frontend:test erp_new_system/frontend/

# التحقق من الصور:
docker images | grep therapy

# تشغيل سريع للاختبار:
docker run --rm therapy-api:test npm test
```

---

## الجزء 3: AWS Setup (15 دقيقة)

### تكوين AWS credentials
```bash
# تشغيل الأمر:
aws configure

# ادخل المعلومات:
AWS Access Key ID [None]: AKIA... (من AWS)
AWS Secret Access Key [None]: abc... (من AWS)
Default region name [None]: us-east-1
Default output format [json]: json
```

### التحقق من الاتصال
```bash
# اختبر الاتصال:
aws sts get-caller-identity

# يجب تطبع:
# {
#     "UserId": "...",
#     "Account": "123456789012",  <- احفظ هذا الرقم!
#     "Arn": "arn:aws:iam::..."
# }
```

### تشغيل AWS Setup Script
```bash
# من مجلد المشروع الرئيسي:
bash scripts/aws-setup.sh

# أو على Windows PowerShell:
wsl bash scripts/aws-setup.sh

# أو استخدم PowerShell directly:
Invoke-WebRequest -Uri "https://awscli.amazonaws.com/AWSCLIV2.msi" -OutFile "AWSCLIV2.msi"
Start-Process msiexec -ArgumentList "/i AWSCLIV2.msi /qn"

# بعدها:
bash scripts/aws-setup.sh
```

### احفظ الرقم!
```bash
# آخر سطر الـ script سيطبع:
# AWS_ACCOUNT_ID: 123456789012
# احفظ هذا الرقم في موضع آمن!
```

---

## الجزء 4: GitHub Secret (5 دقائق)

### الطريقة السهلة (في الـ UI)
```
1. اذهب إلى: https://github.com/almashooq1/alawael-erp/settings/secrets/actions
2. اضغط: New repository secret
3. الحقول:
   Name: AWS_ACCOUNT_ID
   Value: 123456789012 (الرقم من الجزء 3)
4. اضغط: Add secret
```

### الطريقة برمجية (GitHub CLI)
```bash
# إذا عند github CLI مثبت:
gh secret set AWS_ACCOUNT_ID --body "123456789012"

# أو:
gh secret set AWS_ACCOUNT_ID --repo almashooq1/alawael-erp --body "123456789012"
```

---

## الجزء 5: Git Commit & Push (5 دقائق)

### تحضير الـ commit
```bash
# انتقل إلى مجلد المشروع:
cd alawael-erp

# شوف التغييرات:
git status

# يجب ترى:
# modified:   .github/workflows/deploy.yml
# new file:   scripts/health-check.sh
# new file:   scripts/aws-setup.sh
```

### Add الملفات
```bash
# أضيف كل شيء:
git add .

# أو اختر يدوياً:
git add .github/workflows/deploy.yml
git add scripts/health-check.sh
git add scripts/aws-setup.sh
```

### Commit
```bash
# رسالة بسيطة:
git commit -m "fix: AWS deployment pipeline complete repair"

# أو رسالة مفصلة:
git commit -m "fix: AWS deployment pipeline - complete repair and optimization

Changes:
- Completely rewritten deploy.yml with 7-stage workflow
- Fixed Python 3.14 (non-existent) to Node.js 18 LTS
- Fixed IAM role ARN paths and OIDC configuration
- Added MongoDB and Redis services for testing
- Added parallel test execution (Backend + Frontend)
- Added dedicated health check stage
- Added comprehensive error handling
- Added aws-setup.sh for automated infrastructure setup
- Added health-check.sh for API endpoint verification

Fixes:
- Build and Deploy to AWS: Some jobs were not successful
- Multiple workflow failures and infrastructure setup issues
- Missing test database services configuration"
```

### Push
```bash
# إذا أنت على main:
git push origin main

# إذا أنت على master:
git push origin master:main

# أو إذا كنت تستخدم --force (احذر!):
git push origin main --force-with-lease

# تحقق من النجاح:
git log --oneline -5
```

---

## الجزء 6: مراقبة الـ Workflow (60 دقيقة)

### الذهاب للـ GitHub Actions
```
اذهب إلى:
https://github.com/almashooq1/alawael-erp/actions
```

### اختر Latest Run
```
اضغط على أحدث build (يجب يكون اسم:
"Build and Deploy to AWS" بتاريخ الآن)
```

### اقرأ كل stage
```
تابع كل واحد بترتيب:
1. ✅ VALIDATE & SETUP
2. ✅ BACKEND TESTS
3. ✅ FRONTEND TESTS
4. ✅ BUILD DOCKER IMAGES
5. ✅ DEPLOY TO AWS
6. ✅ HEALTH CHECK
7. ✅ NOTIFY STATUS
```

### إذا فاشل شيء
```bash
# اقرأ الـ logs بالتفصيل
# البحث عن الـ ERROR في آخر few lines

# الأشياء الشائعة:
# - npm ERESOLVE: npm install --legacy-peer-deps
# - Docker not found: Install Docker
# - AWS credentials: aws configure
# - ECR not found: bash scripts/aws-setup.sh

# ثم repeat:
git add .
git commit -m "fix: [الـ issue]"
git push origin main
```

---

## الجزء 7: Verification Commands

### التحقق من كل شيء
```bash
# 1. تحقق من git branch:
git branch; git remote -v

# 2. تحقق من الملفات:
ls -la .github/workflows/deploy.yml
ls -la scripts/health-check.sh
ls -la scripts/aws-setup.sh

# 3. تحقق من AWS:
aws sts get-caller-identity
aws ecr describe-repositories --region us-east-1

# 4. تحقق من GitHub:
curl -H "Authorization: token [TOKEN]" https://api.github.com/repos/almashooq1/alawael-erp/actions/secrets
```

### مسح وإعادة تشغيل
```bash
# إزالة docker images القديمة:
docker system prune -a

# إزالة npm cache:
npm cache clean --force

# إزالة node_modules:
rm -rf erp_new_system/backend/node_modules
rm -rf erp_new_system/frontend/node_modules

# إعادة من الصفر:
npm install
npm test
```

---

## الجزء 8: Troubleshooting Commands

### عرض الـ logs
```bash
# رؤية أخر 100 سطر من log:
npm test 2>&1 | tail -100

# حفظ الـ logs في ملف:
npm test > test-output.log 2>&1

# البحث عن error معين:
npm test 2>&1 | grep -i error

# عرض بألوان:
npm test | grep -A 10 "FAIL"
```

### حل مشاكل npm
```bash
# تفاصيل الـ error:
npm install --verbose

# تفاصيل test:
npm test -- --verbose --detectOpenHandles

# حذف وإعادة:
rm -rf node_modules package-lock.json
npm install

# تثبيت الإصدار القديم:
npm install --legacy-peer-deps
```

### حل مشاكل Docker
```bash
# عرض الـ images:
docker images

# عرض التاريخ:
docker ps -a

# حذف الـ image:
docker rmi therapy-api:test

# بناء جديد بـ no-cache:
docker build --no-cache -t therapy-api:test .

# run شيء:
docker run --rm therapy-api:test bash
```

### حل مشاكل AWS
```bash
# عرض الـ repositories:
aws ecr describe-repositories --region us-east-1

# حذف الـ repository:
aws ecr delete-repository --repository-name therapy-api --region us-east-1 --force

# الـ IAM role:
aws iam list-roles | grep github

# الـ OIDC provider:
aws iam list-open-id-connect-providers
```

---

## الجزء 9: Git Commands

### إلغاء آخر commit
```bash
# If not pushed:
git reset --soft HEAD~1

# If pushed:
git revert HEAD
```

### الرجوع لـ version قديم
```bash
# عرض الـ history:
git log --oneline

# الرجوع:
git checkout [COMMIT_ID] -- .github/workflows/deploy.yml
```

### دمج branches
```bash
git checkout main
git pull
git merge develop
git push
```

---

## Quick Shortcuts

### One-Liner للكل
```bash
# Step 1:
cd erp_new_system/backend && npm cache clean --force && npm install && npm test -- --passWithNoTests

# Step 2:
aws configure && source ~/.aws/credentials && bash ../../scripts/aws-setup.sh

# Step 3:
cd ../../alawael-erp && git add . && git commit -m "fix: AWS deployment" && git push origin main

# Then go watch:
# https://github.com/almashooq1/alawael-erp/actions
```

### Emergency Rollback
```bash
# If everything broke:
cd alawael-erp
git log --oneline | head -5
git reset --hard [PREVIOUS_COMMIT]
git push origin main --force-with-lease
```

---

## 🎯 استخدام هذا الملف

1. **Copy** الأمر اللي أنت احتاجه
2. **Paste** في Terminal
3. **Enter** لتشغيل الأمر
4. **اقرأ الـ output** للتحقق من النجاح
5. **انتقل للأمر التالي**

---

**آخر تحديث:** February 24, 2026  
**الاستخدام:** Copy-Paste مباشرة  
**الدعم:** متوفر 24/7  

✅ **Ready to deploy!**
