# سكريبتات نشر مفيدة | Deployment Scripts

## 🚀 نشر سريع | Quick Deploy Script

```bash
#!/bin/bash

set -e

echo "🚀 بدء عملية النشر | Starting Deployment..."

# الألوان | Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# الإعدادات | Configuration
REGISTRY="ghcr.io"
IMAGE_NAME="your-org/rehab-system"
VERSION=${1:-latest}
ENVIRONMENT=${2:-staging}

echo -e "${YELLOW}Version: $VERSION${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"

# 1. بناء الصورة | Build
echo -e "${YELLOW}1. Building Docker image...${NC}"
docker build -t $REGISTRY/$IMAGE_NAME:$VERSION .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

# 2. دفع للسجل | Push
echo -e "${YELLOW}2. Pushing to registry...${NC}"
docker push $REGISTRY/$IMAGE_NAME:$VERSION
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Push successful${NC}"
else
    echo -e "${RED}✗ Push failed${NC}"
    exit 1
fi

# 3. التحديث على الخادم | Deploy
echo -e "${YELLOW}3. Deploying to $ENVIRONMENT...${NC}"

if [ "$ENVIRONMENT" = "prod" ]; then
    echo -e "${YELLOW}Creating backup...${NC}"
    docker-compose exec -T backend tar czf backup-$(date +%s).tar.gz /app/data
fi

docker-compose -f docker-compose.$ENVIRONMENT.yml pull
docker-compose -f docker-compose.$ENVIRONMENT.yml up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment successful${NC}"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi

# 4. التحقق من الحالة | Health Check
echo -e "${YELLOW}4. Verifying deployment...${NC}"
sleep 5

for i in {1..10}; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Health check passed${NC}"
        echo -e "${GREEN}✓ Deployment complete!${NC}"
        exit 0
    fi
    echo "Attempt $i/10..."
    sleep 3
done

echo -e "${RED}✗ Health check failed${NC}"
exit 1
```

## 🔄 نص التحديث الآلي | Auto-Update Script

```bash
#!/bin/bash

# للتشغيل التلقائي كل ساعة | Run with cron: 0 * * * * /path/to/auto-update.sh

REPO_DIR="/opt/rehab-system"
LOG_FILE="/var/log/rehab-deploy.log"

cd $REPO_DIR

# فحص التحديثات | Check for updates
git fetch origin

if [ $(git rev-parse HEAD) != $(git rev-parse origin/main) ]; then
    echo "$(date): New updates found. Deploying..." >> $LOG_FILE

    # سحب التحديثات | Pull updates
    git pull origin main

    # إعادة البناء والتشغيل | Rebuild and restart
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d

    echo "$(date): Deployment completed" >> $LOG_FILE
else
    echo "$(date): No updates available" >> $LOG_FILE
fi
```

## 📊 نص المراقبة | Monitoring Script

```bash
#!/bin/bash

# تشغيل كل 5 دقائق | Run every 5 minutes

ALERT_EMAIL="devops@rehab-system.sa"
THRESHOLD_CPU=80
THRESHOLD_MEM=80

# فحص CPU
CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" rehab-backend | sed 's/%//g' | cut -d'.' -f1)

if [ $CPU_USAGE -gt $THRESHOLD_CPU ]; then
    echo "CPU usage is high: $CPU_USAGE%" | mail -s "Alert: High CPU" $ALERT_EMAIL
fi

# فحص الذاكرة | Memory check
MEM_USAGE=$(docker stats --no-stream --format "{{.MemPerc}}" rehab-backend | sed 's/%//g' | cut -d'.' -f1)

if [ $MEM_USAGE -gt $THRESHOLD_MEM ]; then
    echo "Memory usage is high: $MEM_USAGE%" | mail -s "Alert: High Memory" $ALERT_EMAIL

    # إعادة تشغيل التطبيق | Restart service
    docker-compose restart backend
fi

# فحص الصحة | Health check
if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "Health check failed!" | mail -s "Alert: Service Down" $ALERT_EMAIL
    docker-compose restart backend
fi
```

## 🔐 نص النسخ الاحتياطي | Backup Script

```bash
#!/bin/bash

# تشغيل يومياً | Run daily at 2 AM

BACKUP_DIR="/backups/rehab-system"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# النسخ الاحتياطية لقاعدة البيانات | Database backup
docker-compose exec -T mongodb mongodump --uri "mongodb://admin:password@localhost:27017" --out $BACKUP_DIR/mongo_$DATE

# النسخ الاحتياطية للملفات | Files backup
tar czf $BACKUP_DIR/files_$DATE.tar.gz /opt/rehab-system/

# نسخ احتياطية Redis | Redis backup
docker-compose exec -T redis redis-cli BGSAVE
docker cp rehab-redis:/data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# حذف النسخ القديمة | Remove old backups
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
```

## 🧪 نص الاختبار | Test Script

```bash
#!/bin/bash

echo "Running tests..."

# اختبارات الوحدة | Unit tests
echo "1. Running unit tests..."
docker-compose exec -T backend npm test

# اختبارات التكامل | Integration tests
echo "2. Running integration tests..."
docker-compose exec -T backend npm run test:integration

# اختبارات E2E | E2E tests
echo "3. Running E2E tests..."
docker-compose exec -T frontend npm run test:e2e

# اختبارات الأداء | Performance tests
echo "4. Running performance tests..."
docker-compose exec -T backend npm run test:perf

echo "All tests completed!"
```

---

## 📝 الاستخدام | Usage:

```bash
# نسخ السكريبتات | Copy scripts
cp deploy/scripts/*.sh /opt/rehab-system/scripts/

# إعطاء صلاحيات التنفيذ | Make executable
chmod +x /opt/rehab-system/scripts/*.sh

# التشغيل اليدوي | Run manually
./scripts/deploy.sh v1.0.0 prod

# التشغيل التلقائي | Auto run with cron
0 2 * * * /opt/rehab-system/scripts/backup.sh
0 * * * * /opt/rehab-system/scripts/auto-update.sh
```
