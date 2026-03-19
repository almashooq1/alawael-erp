# AWS + GitHub Actions Setup Guide

## 📋 الإعداد الكامل لـ AWS و GitHub CI/CD

هذا الدليل يوضح كيفية إعداد التكامل الكامل بين GitHub و AWS.

---

## 1️⃣ متطلبات أولية

### تثبيت الأدوات المطلوبة

```bash
# تثبيت AWS CLI
# من هنا: https://aws.amazon.com/cli/

# التحقق من التثبيت
aws --version

# تكوين AWS credentials
aws configure
# سيطلب:
# AWS Access Key ID: [your-key]
# AWS Secret Access Key: [your-secret]
# Default region: us-east-1
# Default output format: json
```

### التحقق من الوصول

```bash
# تأكد من الوصول إلى AWS
aws sts get-caller-identity

# يجب أن ترى:
# {
#     "UserId": "AIDAI...",
#     "Account": "248505667813",
#     "Arn": "arn:aws:iam::248505667813:user/..."
# }
```

---

## 2️⃣ إنشاء IAM Role للـ GitHub Actions

### الخيار A: استخدام السكريبت (الأسهل)

```bash
bash scripts/aws-setup.sh
```

### الخيار B: إنشاء يدوي

#### الخطوة 1: إنشاء OIDC Provider

```bash
# بدون الحاجة لـ AWS keys - استخدم browser

# اذهب إلى:
# https://console.aws.amazon.com/iamv2/

# 1. اختر: Identity Providers
# 2. انقر: Add provider
# 3. اختر: OpenID Connect
# 4. Provider URL: https://token.actions.githubusercontent.com
# 5. Audience: sts.amazonaws.com
```

#### الخطوة 2: إنشاء Role

```bash
# إنشاء trust policy file
cat > /tmp/trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::248505667813:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:almashooq1/*"
        }
      }
    }
  ]
}
EOF

# إنشاء role
aws iam create-role \
  --role-name github-actions-role \
  --assume-role-policy-document file:///tmp/trust-policy.json
```

#### الخطوة 3: إضافة Policies

```bash
# ECR Policy
cat > /tmp/ecr-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:*",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name github-actions-role \
  --policy-name ecr-access \
  --policy-document file:///tmp/ecr-policy.json

# ECS Policy
cat > /tmp/ecs-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:*",
        "ec2:*",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name github-actions-role \
  --policy-name ecs-access \
  --policy-document file:///tmp/ecs-policy.json
```

---

## 3️⃣ إنشاء ECR Repositories

```bash
# إنشاء repositories
aws ecr create-repository \
  --repository-name alawael-api-backend \
  --region us-east-1

aws ecr create-repository \
  --repository-name alawael-api-frontend \
  --region us-east-1

# التحقق
aws ecr describe-repositories --region us-east-1
```

---

## 4️⃣ إضافة GitHub Secrets

### الخطوات في GitHub:

1. اذهب إلى: **Repository Settings**
2. اختر: **Secrets and variables → Actions**
3. انقر: **New repository secret**

### الـ Secrets المطلوبة:

```
# أساسية (مطلوبة)
AWS_ACCOUNT_ID = 248505667813

# اختيارية (قد تكون الـ workflow توفرها من الكود)
AWS_REGION = us-east-1
JWT_SECRET = your-secret-key-here
CORS_ORIGIN = https://yourdomain.com
ENCRYPTION_KEY = your-encryption-key

# إذا أردت deployment إلى production server
PRODUCTION_HOST = your-server.com
PRODUCTION_USER = deploy-user
PRODUCTION_SSH_KEY = (SSH private key)
PRODUCTION_PATH = /var/www/app

# Database credentials
PRODUCTION_MONGODB_URI = mongodb+srv://...
PRODUCTION_REDIS_URL = redis://...
```

### كيفية الحصول على Account ID:

```bash
aws sts get-caller-identity --query Account --output text
```

---

## 5️⃣ إعداد ECS (اختياري)

إذا كنت تريد automated deployment إلى ECS:

### إنشاء ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name alawael-cluster \
  --region us-east-1
```

### إنشاء Task Definition

```bash
cat > /tmp/task-definition.json << 'EOF'
{
  "family": "alawael-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "248505667813.dkr.ecr.us-east-1.amazonaws.com/alawael-api-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ]
    }
  ]
}
EOF

aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-definition.json \
  --region us-east-1
```

### إنشاء Service

```bash
aws ecs create-service \
  --cluster alawael-cluster \
  --service-name alawael-api-service \
  --task-definition alawael-api \
  --desired-count 1 \
  --launch-type FARGATE \
  --region us-east-1
```

---

## 6️⃣ اختبار Setup محلياً

### 1. بناء Docker image محلي

```bash
# بناء صورة backend
docker build -t alawael-api-backend:test .

# أو إذا كان Dockerfile في مجلد آخر
docker build -t alawael-api-backend:test -f docker/Dockerfile.backend .

# اختبر الصورة
docker run -p 3000:3000 alawael-api-backend:test
```

### 2. اختبار npm scripts

```bash
# تثبيت dependencies
npm install

# اختبارات
npm test -- --passWithNoTests

# بناء
npm run build

# لinting
npm run lint || true
```

### 3. اختبار AWS connectivity

```bash
# تسجيل الدخول إلى ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 248505667813.dkr.ecr.us-east-1.amazonaws.com

# دفع صورة تجريبية
docker tag alawael-api-backend:test \
  248505667813.dkr.ecr.us-east-1.amazonaws.com/alawael-api-backend:test

docker push 248505667813.dkr.ecr.us-east-1.amazonaws.com/alawael-api-backend:test
```

---

## 7️⃣ تشغيل الـ Workflow

### الطريقة 1: Push تلقائي

```bash
git add .
git commit -m "fix: aws deployment"
git push origin main
```

### الطريقة 2: تشغيل يدوي

```
GitHub → Actions → Build and Deploy to AWS
→ Run workflow
```

### مراقبة التنفيذ

```
GitHub → Actions → [Latest Run]
```

---

## 8️⃣ استكشاف الأخطاء

### لا يظهر الخيار "Run workflow"

```
✓ تأكد أن الـ workflow موجود: .github/workflows/deploy.yml
✓ تأكد من الـ syntax صحيح (YAML)
✓ افحص: Actions → All workflows
```

### AWS credentials error

```bash
# تحقق من role ARN
aws iam get-role --role-name github-actions-role

# تحقق من OIDC provider
aws iam list-open-id-connect-providers
```

### ECR push failed

```bash
# تحقق من ECR repositories
aws ecr describe-repositories --region us-east-1

# تحقق من permissions
aws iam get-user-policy \
  --user-name $(aws sts get-caller-identity --query User.UserName --output text) \
  --policy-name github-actions-role
```

---

## ✅ Checklist نهائي

- [ ] AWS CLI مثبت و مكوّن
- [ ] OIDC Provider في AWS IAM
- [ ] IAM Role `github-actions-role` موجود
- [ ] ECR repositories موجودة
- [ ] GitHub Secrets مضافة:
  - [ ] AWS_ACCOUNT_ID
  - [ ] JWT_SECRET (if needed)
- [ ] `.github/workflows/deploy.yml` موجود وصحيح
- [ ] `scripts/health-check.sh` موجود
- [ ] `scripts/aws-setup.sh` موجود
- [ ] `package.json` موجود مع scripts
- [ ] `Dockerfile` موجود
- [ ] اختبار محلي ناجح
- [ ] Push branch main/develop
- [ ] Actions workflow بدأ التشغيل بنجاح

---

## 📞 الدعم

### المراجع الرسمية

- AWS GitHub Actions: https://github.com/aws-actions
- GitHub Actions Docs: https://docs.github.com/actions
- ECR Documentation: https://docs.aws.amazon.com/ecr/

### أسئلة شائعة

**س: هل أحتاج لـ AWS keys؟**  
ج: لا، استخدم GitHub OIDC (أفضل وأكثر أماناً)

**س: كيف أحدّث صورة في ECR؟**  
ج: ببساطة push غيير إلى main branch، الـ workflow سيعيد بناءها

**س: كيف أرولباك deployment؟**  
ج: استخدم ECS "View task definition revisions"

---

**آخر تحديث:** 24 فبراير 2026  
**الحالة:** ✅ كامل وجاهز للاستخدام
