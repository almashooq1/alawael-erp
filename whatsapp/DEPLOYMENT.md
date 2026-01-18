# نشر على AWS/Hostinger - دليل سريع

## خطوات النشر على AWS (ECS/Fargate)

### 1. إعداد ECR (Elastic Container Registry)

```bash
# تسجيل الدخول إلى AWS
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# بناء الصورة
docker build -f Dockerfile.prod -t whatsapp-business .

# وسم الصورة
docker tag whatsapp-business:latest YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/whatsapp-business:latest

# دفع الصورة
docker push YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/whatsapp-business:latest
```

### 2. إعداد RDS (Postgres)

```
- Engine: PostgreSQL 15
- Instance: db.t3.micro (free tier)
- Storage: 20GB
- Multi-AZ: No (للتطوير)
- Endpoint: whatsapp-db.xxxxxx.rds.amazonaws.com
```

### 3. إعداد ElastiCache (Redis)

```
- Engine: Redis 7.0
- Node type: cache.t3.micro
- Endpoint: whatsapp-redis.xxxxxx.cache.amazonaws.com
```

### 4. ECS Task Definition

```json
{
  "family": "whatsapp-business",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "whatsapp-business",
      "image": "YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/whatsapp-business:latest",
      "portMappings": [{ "containerPort": 3000 }],
      "environment": [
        { "name": "DATABASE_URL", "value": "postgresql://user:pass@db.rds.amazonaws.com/whatsapp" },
        { "name": "REDIS_URL", "value": "redis://redis.cache.amazonaws.com:6379" },
        { "name": "NODE_ENV", "value": "production" }
      ],
      "secrets": [
        { "name": "APP_SECRET", "valueFrom": "arn:aws:secretsmanager:..." },
        { "name": "WHATSAPP_TOKEN", "valueFrom": "arn:aws:secretsmanager:..." }
      ]
    }
  ]
}
```

### 5. ECS Service

```bash
aws ecs create-service \
  --cluster whatsapp-cluster \
  --service-name whatsapp-business \
  --task-definition whatsapp-business:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

---

## خطوات النشر على Hostinger (VPS)

### 1. الاتصال والإعداد الأولي

```bash
# SSH إلى الخادم
ssh root@your-ip

# تحديث النظام
apt update && apt upgrade -y

# تثبيت Docker و Docker Compose
apt install -y docker.io docker-compose
systemctl start docker
systemctl enable docker
```

### 2. استنساخ المشروع

```bash
cd /opt
git clone https://github.com/your-repo/whatsapp-business.git
cd whatsapp-business
```

### 3. إعداد متغيرات البيئة

```bash
cp .env.example .env

# تحرير .env بالقيم الفعلية
nano .env
```

**القيم الضرورية:**

```
DATABASE_URL=postgresql://user:password@postgres:5432/whatsapp
REDIS_URL=redis://redis:6379
APP_SECRET=your-meta-app-secret
WHATSAPP_TOKEN=your-permanent-token
PHONE_NUMBER_ID=1234567890
VERIFY_TOKEN=your-custom-token
```

### 4. تشغيل عبر Docker Compose

```bash
# إعداد .env وملفات الإنتاج
docker-compose -f docker-compose.prod.yml up -d

# الهجرة
docker-compose exec app npx prisma migrate deploy

# عرض السجلات
docker-compose logs -f app
```

### 5. إعداد Nginx (عكس بروكسي)

```bash
apt install -y nginx certbot python3-certbot-nginx

# ملف تكوين Nginx
cat > /etc/nginx/sites-available/whatsapp <<EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# تفعيل الموقع
ln -s /etc/nginx/sites-available/whatsapp /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# شهادة SSL مجانية
certbot --nginx -d your-domain.com
```

---

## النشر اليدوي (بدون Docker)

### 1. متطلبات التثبيت

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Postgres
apt install -y postgresql postgresql-contrib

# Redis
apt install -y redis-server

# PM2 (لتشغيل العملية)
npm install -g pm2
```

### 2. إعداد التطبيق

```bash
npm install
npm run build

# هجرة قاعدة البيانات
npx prisma migrate deploy

# تشغيل
pm2 start dist/index.js --name whatsapp-business

# حفظ العمليات
pm2 save
pm2 startup
```

---

## فحوصات ما بعد النشر

### 1. اختبر الصحة

```bash
curl http://localhost:3000/health
# الإجابة المتوقعة: 200 OK
```

### 2. تحقق من الاتصال بالقاعدة

```bash
docker-compose exec app npx prisma studio
```

### 3. اختبر Webhook

```bash
curl -X GET "http://your-domain.com/webhook?hub.mode=subscribe&hub.verify_token=your-token&hub.challenge=test123"
```

---

## المراقبة والصيانة

### سجلات التطبيق

```bash
# Docker
docker-compose logs -f app

# PM2
pm2 logs whatsapp-business
```

### النسخ الاحتياطية

```bash
# قاعدة البيانات
pg_dump --username=user --host=localhost whatsapp > backup_$(date +%Y%m%d).sql

# المتغيرات البيئية
cp .env .env.backup
```

### التحديثات

```bash
git pull origin main
npm install
npm run build
npx prisma migrate deploy
docker-compose restart app  # أو pm2 restart whatsapp-business
```

---

## استكشاف الأخطاء

### الخطأ: `ECONNREFUSED` إلى قاعدة البيانات

```bash
# تحقق من حالة Postgres
docker-compose ps
docker-compose logs postgres
```

### الخطأ: `Redis connection refused`

```bash
# تحقق من Redis
redis-cli ping
```

### الخطأ: `Webhook signature verification failed`

```bash
# تأكد من APP_SECRET في .env
# تطابق مع قيمة Meta Webhook Secret
```

---

## نصائح الأداء

1. **استخدم CDN** لملفات الوسائط (CloudFlare Free)
2. **مراقبة الذاكرة** عبر `pm2 monit`
3. **قم بتشغيل Postgres مع وضع الإنتاج**:
   ```sql
   ALTER SYSTEM SET shared_buffers = '256MB';
   ALTER SYSTEM SET effective_cache_size = '1GB';
   SELECT pg_reload_conf();
   ```
4. **استخدم Redis للجلسات** بدلاً من الذاكرة
5. **مراقبة سجلات Nginx** بحثاً عن الأخطاء
