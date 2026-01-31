# 🚀 Deployment Guide - Rehab AGI System

دليل النشر الكامل لنظام Rehab AGI

[English Version Below]

---

## 🇸🇦 النسخة العربية

### 1️⃣ النشر السريع (Docker)

#### المتطلبات

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM الحد الأدنى

#### خطوات التثبيت

```bash
# 1. استنساخ المشروع
git clone https://github.com/your-org/rehab-agi.git
cd rehab-agi/intelligent-agent/backend/agi

# 2. نسخ ملف التكوين
cp .env.example .env

# 3. تعديل التكوين (اختياري)
nano .env

# 4. تشغيل الحاويات
docker-compose up -d

# 5. التحقق من الحالة
docker-compose ps
```

#### الوصول

- **الخادم**: http://localhost:5001
- **لوحة التحكم**: http://localhost:5001/dashboard
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

---

### 2️⃣ النشر على الإنتاج

#### على Linux/Ubuntu

```bash
# 1. تحديث النظام
sudo apt-get update && apt-get upgrade -y

# 2. تثبيت Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. إضافة المستخدم إلى مجموعة docker
sudo usermod -aG docker $USER

# 4. تثبيت Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 5. نسخ المشروع
git clone https://github.com/your-org/rehab-agi.git
cd rehab-agi/intelligent-agent/backend/agi

# 6. التكوين الإنتاجي
nano .env  # قم بتعديل المتغيرات

# 7. التشغيل
docker-compose -f docker-compose.yml up -d

# 8. فحص السجلات
docker-compose logs -f agi-server
```

#### على Windows Server

```powershell
# 1. تثبيت Docker Desktop أو Docker Server
# اتبع: https://docs.docker.com/docker-for-windows/

# 2. استنساخ المشروع
git clone https://github.com/your-org/rehab-agi.git
cd rehab-agi\intelligent-agent\backend\agi

# 3. نسخ التكوين
Copy-Item -Path .env.example -Destination .env

# 4. تعديل التكوين
notepad .env

# 5. التشغيل
docker-compose up -d

# 6. فحص الحالة
docker-compose ps
```

---

### 3️⃣ متطلبات الإنتاج

#### الحد الأدنى من الموارد

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 20 GB
- **Network**: Connection مستقرة

#### قائمة المراجعة قبل الإنتاج

- [ ] تم تعديل جميع المفاتيح السرية (.env)
- [ ] تم تفعيل HTTPS
- [ ] تم إعداد النسخ الاحتياطية
- [ ] تم إعداد المراقبة
- [ ] تم اختبار الأداء
- [ ] تم إعداد استعادة الكوارث
- [ ] تم توثيق عملية التشغيل

---

## 🇬🇧 English Version

### 1️⃣ Quick Deployment (Docker)

#### Requirements

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum

#### Installation Steps

```bash
# 1. Clone the project
git clone https://github.com/your-org/rehab-agi.git
cd rehab-agi/intelligent-agent/backend/agi

# 2. Copy configuration
cp .env.example .env

# 3. Edit configuration (optional)
nano .env

# 4. Start containers
docker-compose up -d

# 5. Check status
docker-compose ps
```

#### Access Points

- **Server**: http://localhost:5001
- **Dashboard**: http://localhost:5001/dashboard
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

---

### 2️⃣ Production Deployment

#### On Linux/Ubuntu

```bash
# System preparation
sudo apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Deploy
git clone https://github.com/your-org/rehab-agi.git
cd rehab-agi/intelligent-agent/backend/agi
nano .env
docker-compose up -d
```

#### On Cloud Platforms

**AWS ECS**

```bash
# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker build -t rehab-agi .
docker tag rehab-agi:latest <account>.dkr.ecr.<region>.amazonaws.com/rehab-agi:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/rehab-agi:latest
```

**Azure Container Instances**

```bash
az acr login --name <acrName>
docker build -t rehab-agi .
docker tag rehab-agi <acrName>.azurecr.io/rehab-agi:latest
docker push <acrName>.azurecr.io/rehab-agi:latest
```

**Google Cloud Run**

```bash
gcloud auth configure-docker
docker build -t gcr.io/<project>/rehab-agi .
docker push gcr.io/<project>/rehab-agi
gcloud run deploy rehab-agi --image gcr.io/<project>/rehab-agi
```

---

### 3️⃣ Monitoring & Maintenance

#### Health Checks

```bash
# Check server health
curl http://localhost:5001/health

# Check metrics
curl http://localhost:5001/api/agi/metrics

# Database check
docker exec rehab-postgres pg_isready
```

#### Backup

```bash
# Backup database
docker exec rehab-postgres pg_dump -U postgres rehab_agi > backup.sql

# Restore database
docker exec -i rehab-postgres psql -U postgres rehab_agi < backup.sql

# Backup volumes
docker run --rm -v rehab-postgres:/data -v $(pwd):/backup \
  alpine tar czf /backup/db-backup.tar.gz -C /data .
```

#### Logs

```bash
# View logs
docker-compose logs -f agi-server

# Specific container
docker logs rehab-agi-server

# Save logs
docker-compose logs > logs-$(date +%Y%m%d).txt
```

---

### 4️⃣ Scaling & Performance

#### Horizontal Scaling

```yaml
# Update docker-compose.yml
services:
  agi-server:
    deploy:
      replicas: 3
    environment:
      - LOAD_BALANCER_ENABLED=true
```

#### Performance Tuning

```env
# In .env
# Database
DB_POOL_MIN=5
DB_POOL_MAX=20

# Cache
REDIS_CACHE_TTL=3600
CACHE_ENABLED=true

# API
API_RATE_LIMIT=1000
API_TIMEOUT=30000
```

---

### 5️⃣ Troubleshooting

#### Container won't start

```bash
# Check logs
docker-compose logs agi-server

# Rebuild image
docker-compose up -d --build

# Remove and restart
docker-compose down
docker-compose up -d
```

#### Database connection issues

```bash
# Check PostgreSQL status
docker-compose logs postgres

# Verify credentials in .env
grep DB_ .env

# Test connection
psql -h localhost -U postgres -d rehab_agi -c "SELECT 1;"
```

#### Memory issues

```bash
# Check resource usage
docker stats

# Increase memory limit
nano docker-compose.yml  # Update memory: limit
docker-compose down
docker-compose up -d
```

---

### 6️⃣ Security Checklist

- [ ] Changed default passwords
- [ ] Enabled HTTPS/SSL
- [ ] Set strong JWT secret
- [ ] Configured firewall
- [ ] Enabled authentication
- [ ] Set CORS properly
- [ ] Enabled logging
- [ ] Configured backups
- [ ] Set resource limits
- [ ] Regular security updates

---

### 📞 Support

- 📧 Email: support@rehab-agi.com
- 📚 Docs: See README.md
- 🐛 Issues: GitHub Issues
- 💬 Community: Discussions

---

**Last Updated**: January 30, 2026
