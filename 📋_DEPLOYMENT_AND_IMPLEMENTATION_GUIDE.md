# 🎯 دليل النشر والتطبيق العملي

# Deployment & Practical Implementation Guide

---

## 📌 مقدمة

هذا الدليل يوفر خطوات عملية **خطوة بخطوة** لنشر واستخدام الأنظمة الثلاثة
المتكاملة في بيئة الإنتاج.

---

## 🚀 المرحلة 1: التحضير والإعداد

### 1.1 المتطلبات الأساسية

```bash
# Node.js + npm
node --version  # v14+
npm --version   # v6+

# Python (اختياري للتحليلات المتقدمة)
python --version  # v3.8+

# MongoDB (للبيانات)
mongod --version  # v4+

# Docker (اختياري)
docker --version
```

### 1.2 تثبيت المكتبات المطلوبة

```bash
# Backend Dependencies
npm install express flask python-dotenv cors jwt
npm install numpy pandas scikit-learn  # ML libraries
npm install recharts chart.js          # Charting

# Frontend Dependencies
npm install react react-router-dom
npm install @mui/material @mui/icons-material
npm install axios

# Development
npm install --save-dev nodemon jest supertest
```

### 1.3 إعداد ملفات البيئة

```bash
# Backend .env
FLASK_ENV=production
DATABASE_URL=mongodb://localhost:27017/erp
JWT_SECRET=your_secure_key_here
API_PORT=3001
NODE_ENV=production

# Frontend .env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENV=production
REACT_APP_DEBUG=false
```

---

## 🔧 المرحلة 2: التكوين الأساسي

### 2.1 إعداد قاعدة البيانات

```bash
# إنشاء قاعدة بيانات MongoDB
mongo << EOF
use erp_system
db.createCollection("users")
db.createCollection("predictions")
db.createCollection("reports")
db.createCollection("notifications")
db.createCollection("audit_logs")

# إضافة فهارس للأداء
db.predictions.createIndex({ "createdAt": -1 })
db.reports.createIndex({ "type": 1, "createdAt": -1 })
db.notifications.createIndex({ "userId": 1, "read": 1 })
EOF
```

### 2.2 إعداد خادم Backend

```bash
# إنشاء التطبيق
mkdir erp_backend
cd erp_backend

# تهيئة Node.js
npm init -y

# إنشاء ملف التطبيق الرئيسي
touch app.js
touch config.js
touch server.js
```

### 2.3 إعداد تطبيق Frontend

```bash
# إنشاء تطبيق React
npx create-react-app erp_frontend
cd erp_frontend

# تثبيت المكتبات الإضافية
npm install react-router-dom
npm install @mui/material @mui/icons-material
npm install axios
```

---

## 📊 المرحلة 3: تشغيل الأنظمة الثلاثة

### 3.1 تشغيل نظام AI للتنبؤ

```bash
# تشغيل خادم التنبؤ
node backend/services/aiService.js

# أو استخدم PM2 للإنتاج
pm2 start backend/services/aiService.js --name "AI-Service"

# التحقق من الحالة
pm2 status
```

**الاختبار:**

```bash
curl -X POST http://localhost:3001/api/predictions/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"month": 2, "historicalData": {"january": 50000}}'
```

### 3.2 تشغيل نظام التقارير

```bash
# تشغيل خادم التقارير
node backend/services/reportingService.js

# التحقق من الحالة
pm2 start backend/services/reportingService.js --name "Report-Service"
```

**الاختبار:**

```bash
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sales_report",
    "dateRange": {"start": "2026-01-01", "end": "2026-01-20"},
    "format": "pdf"
  }'
```

### 3.3 تشغيل نظام الإشعارات

```bash
# تشغيل خادم الإشعارات
node backend/services/notificationService.js

# التحقق من الحالة
pm2 start backend/services/notificationService.js --name "Notification-Service"
```

**الاختبار:**

```bash
curl -X POST http://localhost:3001/api/notifications/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "title": "اختبار",
    "message": "رسالة اختبار",
    "channels": ["email", "in-app"]
  }'
```

---

## 🐳 المرحلة 4: النشر باستخدام Docker

### 4.1 إنشاء Dockerfile للخادم

```dockerfile
# Backend Dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
```

### 4.2 إنشاء Dockerfile للواجهة

```dockerfile
# Frontend Dockerfile
FROM node:16-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### 4.3 docker-compose.yml

```yaml
version: '3.8'

services:
  # قاعدة البيانات
  mongodb:
    image: mongo:5
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  # خادم Backend
  backend:
    build: ./backend
    ports:
      - '3001:3001'
    environment:
      DATABASE_URL: mongodb://admin:password@mongodb:27017/erp
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on:
      - mongodb
    restart: unless-stopped

  # تطبيق Frontend
  frontend:
    build: ./frontend
    ports:
      - '3000:3000'
    environment:
      REACT_APP_API_URL: http://backend:3001/api
    depends_on:
      - backend
    restart: unless-stopped

  # MongoDB Express (إدارة البيانات)
  mongo-express:
    image: mongo-express
    ports:
      - '8081:8081'
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: password
      ME_CONFIG_MONGODB_URL: mongodb://admin:password@mongodb:27017
    depends_on:
      - mongodb

volumes:
  mongodb_data:

networks:
  default:
    name: erp-network
```

### 4.4 النشر باستخدام Docker

```bash
# بناء وتشغيل
docker-compose up -d

# التحقق من الخدمات
docker-compose ps

# عرض السجلات
docker-compose logs -f backend

# إيقاف التطبيق
docker-compose down
```

---

## 🧪 المرحلة 5: الاختبار والتحقق

### 5.1 اختبار نظام AI

```javascript
// tests/ai.test.js
const AIService = require('../services/aiService');

describe('AI Prediction System', () => {
  test('Should predict sales correctly', async () => {
    const prediction = await AIService.predictSales(2, {
      january: 50000,
      december: 48000,
    });

    expect(prediction.predictedSales).toBeGreaterThan(40000);
    expect(prediction.confidence).toBeGreaterThanOrEqual(80);
  });

  test('Should detect attendance patterns', async () => {
    const prediction = await AIService.predictAttendance('emp_123', {
      dayOfWeek: 'Monday',
      weather: 'good',
    });

    expect(prediction.attendanceProbability).toBeDefined();
    expect(prediction.confidence).toBeGreaterThanOrEqual(70);
  });

  test('Should analyze performance trends', async () => {
    const prediction = await AIService.predictPerformance('emp_456', {
      tasksCompleted: 95,
      qualityScore: 88,
    });

    expect(prediction.predictedScore).toBeLessThanOrEqual(100);
    expect(prediction.confidence).toBeGreaterThanOrEqual(75);
  });
});
```

### 5.2 اختبار نظام التقارير

```javascript
// tests/reports.test.js
const ReportService = require('../services/reportingService');

describe('Report Generation System', () => {
  test('Should generate sales report', async () => {
    const report = await ReportService.generateReport({
      type: 'sales',
      dateRange: { start: '2026-01-01', end: '2026-01-20' },
    });

    expect(report.title).toBeDefined();
    expect(report.data).toBeDefined();
    expect(report.charts).toBeDefined();
  });

  test('Should export to multiple formats', async () => {
    const report = await ReportService.generateReport({ type: 'sales' });

    const csv = ReportService.exportToCSV(report);
    const pdf = ReportService.exportToPDF(report);
    const excel = ReportService.exportToExcel(report);

    expect(csv).toBeTruthy();
    expect(pdf).toBeTruthy();
    expect(excel).toBeTruthy();
  });
});
```

### 5.3 اختبار نظام الإشعارات

```javascript
// tests/notifications.test.js
const NotificationService = require('../services/notificationService');

describe('Notification System', () => {
  test('Should send in-app notification', async () => {
    const result = await NotificationService.sendInAppNotification(
      'user_123',
      'Test Title',
      'Test Message'
    );

    expect(result.success).toBe(true);
    expect(result.notificationId).toBeDefined();
  });

  test('Should send multi-channel notification', async () => {
    const result = await NotificationService.sendMultiChannelNotification(
      'user_123',
      { title: 'Test', message: 'Message' },
      ['email', 'sms', 'push']
    );

    expect(result.sentTo).toContain('email');
    expect(result.sentTo.length).toBeGreaterThan(0);
  });

  test('Should respect user preferences', async () => {
    // تعيين تفضيلات المستخدم
    NotificationService.setUserPreferences('user_123', {
      email: true,
      sms: false,
      push: true,
    });

    const result = await NotificationService.sendMultiChannelNotification(
      'user_123',
      { title: 'Test', message: 'Message' },
      ['email', 'sms', 'push']
    );

    expect(result.sentTo).toContain('email');
    expect(result.sentTo).not.toContain('sms');
    expect(result.sentTo).toContain('push');
  });
});
```

### 5.4 تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل اختبار معين
npm test -- ai.test.js

# تشغيل مع تغطية الكود
npm test -- --coverage
```

---

## 📈 المرحلة 6: المراقبة والأداء

### 6.1 إعداد المراقبة

```bash
# تثبيت أدوات المراقبة
npm install pm2 prometheus express-prometheus-middleware

# تشغيل PM2 مع المراقبة
pm2 start ecosystem.config.js
pm2 monit  # مراقبة فورية
pm2 logs   # عرض السجلات
```

### 6.2 ملف تكوين PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'AI-Service',
      script: './backend/services/aiService.js',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' },
      error_file: './logs/ai-error.log',
      out_file: './logs/ai-out.log',
    },
    {
      name: 'Report-Service',
      script: './backend/services/reportingService.js',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' },
      error_file: './logs/report-error.log',
      out_file: './logs/report-out.log',
    },
    {
      name: 'Notification-Service',
      script: './backend/services/notificationService.js',
      instances: 3,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' },
      error_file: './logs/notification-error.log',
      out_file: './logs/notification-out.log',
    },
  ],
};
```

### 6.3 لوحة المراقبة

```javascript
// middleware/monitoring.js
const prometheus = require('express-prometheus-middleware');

app.use(
  prometheus({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 2, 5],
  })
);

// Endpoint للصحة
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date(),
  });
});
```

---

## 🔒 المرحلة 7: الأمان والنسخ الاحتياطي

### 7.1 تأمين البيانات

```bash
# تفعيل HTTPS
npm install https fs

# إنشاء شهادات SSL
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# تفعيل في التطبيق
const https = require('https');
const fs = require('fs');
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};
https.createServer(options, app).listen(3001);
```

### 7.2 النسخ الاحتياطي التلقائي

```bash
# سكريبت النسخ الاحتياطي
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# نسخ احتياطية من MongoDB
mongodump --out $BACKUP_DIR/backup_$DATE

# ضغط النسخة الاحتياطية
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/backup_$DATE

# حذف ملف النسخة الأصلية
rm -rf $BACKUP_DIR/backup_$DATE

echo "Backup completed: $BACKUP_DIR/backup_$DATE.tar.gz"
```

### 7.3 جدول النسخ الاحتياطية اليومية

```bash
# أضف إلى crontab
0 2 * * * /scripts/backup.sh  # في الساعة 2 صباحاً يومياً
0 * * * * /scripts/cleanup-old-backups.sh  # حذف النسخ القديمة كل ساعة
```

---

## 📋 المرحلة 8: قائمة التحقق النهائية

```markdown
قبل النشر على الإنتاج:

□ تم تثبيت جميع المتطلبات □ تم اختبار جميع الخدمات بنجاح □ تم تكوين المتغيرات
البيئية □ تم إعداد قاعدة البيانات □ تم تفعيل الأمان (HTTPS, JWT) □ تم إعداد
المراقبة والتنبيهات □ تم إعداد النسخ الاحتياطية □ تم توثيق جميع العمليات □ تم
اختبار الأداء تحت الحمل □ تم إعداد خطة الاسترجاع من الأعطال

✅ جاهز للنشر!
```

---

## 🆘 استكشاف الأخطاء

### المشكلة 1: الاتصال بقاعدة البيانات فشل

```bash
# الحل
# 1. تحقق من أن MongoDB يعمل
mongo --version

# 2. تحقق من سلسلة الاتصال
echo $DATABASE_URL

# 3. اختبر الاتصال
mongosh "mongodb://localhost:27017"
```

### المشكلة 2: الخدمات لا تستجيب

```bash
# الحل
# 1. تحقق من السجلات
pm2 logs

# 2. تحقق من موارد النظام
pm2 monit

# 3. أعد تشغيل الخدمات
pm2 restart all
```

### المشكلة 3: بطء الأداء

```bash
# الحل
# 1. تحقق من استخدام CPU والذاكرة
top

# 2. زد عدد النوى في PM2
pm2 scale AI-Service 4

# 3. فعّل التخزين المؤقت
app.use(cacheMiddleware);
```

---

## 📞 الدعم والمساعدة

### روابط مفيدة:

- 📖 [Node.js Documentation](https://nodejs.org/docs)
- 📖 [MongoDB Manual](https://docs.mongodb.com)
- 📖 [React Documentation](https://reactjs.org)
- 📖 [Docker Documentation](https://docs.docker.com)

### الاتصال:

- 📧 البريد الإلكتروني: support@example.com
- 💬 الدردشة: chat.example.com
- 📱 الهاتف: +966-XX-XXXX-XXXX

---

**الحالة**: ✅ جاهز للنشر في الإنتاج  
**آخر تحديث**: 20 يناير 2026  
**الإصدار**: 1.0.0 Production
