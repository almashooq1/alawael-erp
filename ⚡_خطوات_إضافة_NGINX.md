# إضافة Nginx إلى docker-compose.yml

# Adding Nginx to docker-compose.yml

## الخدمة الجديدة | New Service

أضف هذا القسم إلى ملف `docker-compose.yml` بعد قسم `mailcatcher`:

```yaml
# ==========================================
# 🌐 Reverse Proxy (Nginx)
# ==========================================
nginx:
  image: nginx:alpine
  container_name: alaweal-nginx
  ports:
    - '80:80'
    - '443:443'
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
    - nginx_cache:/var/cache/nginx
  depends_on:
    client:
      condition: service_healthy
    api:
      condition: service_healthy
  networks:
    - alaweal-network
  restart: unless-stopped
  healthcheck:
    test:
      [
        'CMD',
        'wget',
        '--quiet',
        '--tries=1',
        '--spider',
        'http://127.0.0.1/health',
      ]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 20s
  logging:
    driver: 'json-file'
    options:
      max-size: '10m'
      max-file: '3'
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 256M
      reservations:
        cpus: '0.1'
        memory: 128M
```

## التعديلات المطلوبة | Required Modifications

### 1. تحديث خدمة Frontend (client)

```yaml
client:
  # ... الإعدادات الموجودة
  ports:
    # تعليق المنفذ المباشر | Comment direct port
    # - "3000:80"
  expose:
    - '80' # استخدام expose بدلاً من ports
```

### 2. تحديث خدمة Backend (api)

```yaml
api:
  # ... الإعدادات الموجودة
  ports:
    # تعليق المنفذ المباشر | Comment direct port
    # - "3001:3001"
  expose:
    - '3001' # استخدام expose بدلاً من ports
```

### 3. إضافة Volume لـ Nginx

أضف هذا إلى قسم `volumes` في نهاية الملف:

```yaml
volumes:
  # ... الـ volumes الموجودة
  nginx_cache:
    driver: local
```

### 4. تحديث متغيرات البيئة

في ملف `.env`:

```bash
# تحديث Frontend API URL
REACT_APP_API_URL=http://localhost/api

# تحديث Backend CORS
API_CORS_ORIGIN=http://localhost
```

## docker-compose.yml الكامل | Complete File

إليك الملف الكامل المعدل:

```yaml
services:
  # ==========================================
  # 🟢 Frontend (React Client)
  # ==========================================
  client:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: alaweal-client
    # ports:
    #   - "3000:80"  # استخدام nginx بدلاً من هذا
    expose:
      - '80'
    depends_on:
      api:
        condition: service_healthy
    networks:
      - alaweal-network
    restart: unless-stopped
    healthcheck:
      test:
        ['CMD', 'wget', '--quiet', '--tries=1', '--spider', 'http://127.0.0.1/']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    environment:
      - REACT_APP_API_URL=http://localhost/api # تحديث للعمل مع nginx
      - NGINX_CACHE_SIZE=50m
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  # ==========================================
  # 🔵 Backend (Node.js API)
  # ==========================================
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: alaweal-api
    # ports:
    #   - "3001:3001"  # استخدام nginx بدلاً من هذا
    expose:
      - '3001'
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MONGODB_URI=mongodb://${MONGO_ROOT_USER:-admin}:${MONGO_ROOT_PASSWORD:-password}@mongo:27017/${MONGO_DB_NAME:-alaweal_db}?authSource=admin
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis_password}@redis:6379
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-redis_password}
      - JWT_SECRET=${JWT_SECRET:-secure_production_secret}
      - JWT_EXPIRY=${JWT_EXPIRY:-3600}
      - ENABLE_MONITORING=${ENABLE_MONITORING:-true}
      - ENABLE_COMPRESSION=${COMPRESSION_ENABLED:-true}
      - CACHE_TTL=${CACHE_TTL:-3600}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - ENABLE_AUTO_BACKUP=${ENABLE_AUTO_BACKUP:-true}
      - BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
      - BACKUP_TIME=${BACKUP_TIME:-03:00}
      - API_CORS_ORIGIN=http://localhost # تحديث للعمل مع nginx
    volumes:
      - backup_data:/app/backups
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - alaweal-network
    restart: unless-stopped
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "require('http').get('http://127.0.0.1:3001/api/health', r =>
          process.exit(r.statusCode === 200 ? 0 : 1))",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1.5G
        reservations:
          cpus: '0.5'
          memory: 512M

  # ==========================================
  # 🍃 Database (MongoDB)
  # ==========================================
  mongo:
    image: mongo:6.0
    container_name: alaweal-mongo
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USER:-admin}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD:-password}
      - MONGO_INITDB_DATABASE=${MONGO_DB_NAME:-alaweal_db}
    volumes:
      - mongo_data:/data/db
      - mongo_config:/data/configdb
    networks:
      - alaweal-network
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')", '--quiet']
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1.5G
        reservations:
          cpus: '0.5'
          memory: 512M

  # ==========================================
  # ⚡ Cache & Queue (Redis)
  # ==========================================
  redis:
    image: redis:7-alpine
    container_name: alaweal-redis
    command:
      redis-server --appendonly yes --requirepass
      ${REDIS_PASSWORD:-redis_password}
    volumes:
      - redis_data:/data
    networks:
      - alaweal-network
    restart: unless-stopped
    healthcheck:
      test:
        [
          'CMD',
          'redis-cli',
          '-a',
          '${REDIS_PASSWORD:-redis_password}',
          '--raw',
          'incr',
          'ping',
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M

  # ==========================================
  # 🌐 Reverse Proxy (Nginx)
  # ==========================================
  nginx:
    image: nginx:alpine
    container_name: alaweal-nginx
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_cache:/var/cache/nginx
    depends_on:
      client:
        condition: service_healthy
      api:
        condition: service_healthy
    networks:
      - alaweal-network
    restart: unless-stopped
    healthcheck:
      test:
        [
          'CMD',
          'wget',
          '--quiet',
          '--tries=1',
          '--spider',
          'http://127.0.0.1/health',
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M

networks:
  alaweal-network:
    driver: bridge

volumes:
  mongo_data:
    driver: local
  mongo_config:
    driver: local
  redis_data:
    driver: local
  backup_data:
    driver: local
  nginx_cache:
    driver: local
```

## خطوات التطبيق | Implementation Steps

### 1. تحديث docker-compose.yml

```bash
# انسخ المحتوى أعلاه إلى docker-compose.yml
# أو قم بالتعديلات اليدوية المذكورة
```

### 2. تحديث ملف .env

```bash
# تحديث المتغيرات
REACT_APP_API_URL=http://localhost/api
API_CORS_ORIGIN=http://localhost
```

### 3. إيقاف الخدمات الحالية

```bash
docker-compose down
```

### 4. إعادة البناء والتشغيل

```bash
docker-compose build --no-cache
docker-compose up -d
```

### 5. التحقق من الحالة

```bash
# التحقق من حالة الخدمات
docker-compose ps

# يجب أن ترى جميع الخدمات بحالة "healthy"
# بما في ذلك nginx
```

### 6. الاختبار

```bash
# اختبار الواجهة الأمامية
curl http://localhost/

# اختبار الـ API
curl http://localhost/api/health

# اختبار صحة nginx
curl http://localhost/health

# اختبار rate limiting
for i in {1..20}; do curl http://localhost/api/health; echo; done
```

## الوصول إلى الخدمات | Service Access

بعد التطبيق، يمكن الوصول إلى الخدمات عبر:

| الخدمة          | URL القديم            | URL الجديد (عبر Nginx) |
| --------------- | --------------------- | ---------------------- |
| Frontend        | http://localhost:3000 | http://localhost       |
| Backend API     | http://localhost:3001 | http://localhost/api   |
| Mongo Express   | http://localhost:8081 | http://localhost:8081  |
| Redis Commander | http://localhost:8082 | http://localhost:8082  |
| MailCatcher     | http://localhost:1080 | http://localhost:1080  |

**ملاحظة**: الخدمات الإدارية (Mongo Express, Redis Commander, MailCatcher) لا
تزال متاحة على منافذها المباشرة.

## استكشاف الأخطاء | Troubleshooting

### خطأ: nginx لا يبدأ

```bash
# التحقق من السجلات
docker-compose logs nginx

# التحقق من ملف الإعدادات
docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t
```

### خطأ: 502 Bad Gateway

```bash
# التحقق من صحة الـ backend
curl http://localhost:3001/api/health

# التحقق من الشبكة
docker network inspect alaweal-network
```

### خطأ: CORS

```bash
# تحقق من أن API_CORS_ORIGIN محدث في .env
echo $API_CORS_ORIGIN

# أعد تشغيل الخدمات
docker-compose restart api
```

---

**التاريخ**: 20 يناير 2026 **الإصدار**: 1.0 **الحالة**: جاهز للتطبيق
