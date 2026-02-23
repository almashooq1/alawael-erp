# 🎯 دليل النظام الموحد - INDEX
## AlAwael ERP v2.0.0
### 21 فبراير 2026

---

## 📦 الملفات الموحدة (31 ملف)

### 🔧 Backend Core (15 ملف)
| الملف | المسار | الوصف |
|-------|--------|-------|
| `auth.unified.js` | `backend/middleware/` | المصادقة والتفويض |
| `validation.unified.js` | `backend/middleware/` | التحقق من البيانات |
| `rateLimiter.unified.js` | `backend/middleware/` | تحديد المعدل |
| `index.unified.js` | `backend/middleware/` | تصدير الوسطاء |
| `hr.routes.unified.js` | `backend/routes/` | مسارات HR |
| `notifications.routes.unified.js` | `backend/routes/` | مسارات الإشعارات |
| `dashboard.routes.unified.js` | `backend/routes/` | مسارات لوحة التحكم |
| `index.unified.js` | `backend/routes/` | تصدير المسارات |
| `index.unified.js` | `backend/models/` | 8 نماذج قاعدة بيانات |
| `index.unified.js` | `backend/services/` | 4 خدمات موحدة |
| `index.unified.js` | `backend/utils/` | 25+ دالة مساعدة |
| `unified-integration.js` | `backend/config/` | دليل التكامل |
| `server.unified.js` | `backend/` | الخادم الرئيسي |
| `app.unified.js` | `backend/` | التطبيق الموحد |
| `index.unified.js` | `backend/` | نقطة البداية |

### 🚀 Backend Config (5 ملفات)
| الملف | المسار | الوصف |
|-------|--------|-------|
| `package.unified.json` | `backend/` | حزم NPM |
| `.env.unified.example` | `backend/` | متغيرات البيئة |
| `README.unified.md` | `backend/` | دليل الاستخدام |
| `Dockerfile.unified` | `backend/` | Docker image |
| `unified.test.js` | `backend/tests/` | الاختبارات |

### 🐳 DevOps (3 ملفات)
| الملف | المسار | الوصف |
|-------|--------|-------|
| `docker-compose.unified.yml` | `/` | Docker Compose |
| `Makefile.unified` | `/` | أوامر Make |
| `unified-ci.yml` | `.github/workflows/` | CI/CD Pipeline |

### 📚 API & Docs (8 ملفات)
| الملف | المسار | الوصف |
|-------|--------|-------|
| `unified-api-collection.json` | `postman/` | Postman Collection |
| `FINAL_SYSTEM_REPORT.md` | `/` | التقرير النهائي |
| `SYSTEM_ANALYSIS_REPORT.md` | `/` | تحليل المشاكل |
| `SYSTEM_CLEANUP_FINAL_REPORT.md` | `/` | تقرير التنظيف |
| `SYSTEM_CLEANUP_COMPLETION.md` | `/` | تقرير الإتمام |
| `UNIFIED_SYSTEM_GUIDE.md` | `/` | دليل النظام |
| `CLEANUP_EXECUTION_GUIDE.md` | `/` | دليل التنظيف |
| `CLEANUP_DUPLICATES.js` | `/` | سكريبت التنظيف |

---

## 🚀 أوامر البدء السريع

### تثبيت وتشغيل:
```bash
cd backend
npm install
node index.unified.js
```

### مع Docker:
```bash
docker-compose -f docker-compose.unified.yml up -d
```

### مع Make:
```bash
make -f Makefile.unified install
make -f Makefile.unified start
```

---

## 📖 API Endpoints

### Auth:
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

### HR:
- `GET /api/hr/employees`
- `POST /api/hr/employees`
- `GET /api/hr/payroll`
- `POST /api/hr/attendance/check-in`
- `POST /api/hr/attendance/check-out`

### Notifications:
- `GET /api/notifications`
- `GET /api/notifications/unread`
- `PUT /api/notifications/read-all`

### Dashboard:
- `GET /api/dashboard`
- `GET /api/dashboard/hr`
- `GET /api/dashboard/kpis`

---

## 🔧 الاستخدام

```javascript
// استيراد موحد
const app = require('./backend/app.unified');

// مكونات منفصلة
const { authenticate } = require('./backend/middleware/index.unified');
const { User, Employee } = require('./backend/models/index.unified');
const { notification } = require('./backend/services/index.unified');
const { formatDate } = require('./backend/utils/index.unified');
```

---

## 📊 الإحصائيات

- **31 ملف** موحد
- **65+ endpoints**
- **8 نماذج**
- **4 خدمات**
- **25+ دالة**
- **15+ اختبار**
- **33 ملف** للتنظيف
- **82% تقليل** التكرار

---

*AlAwael ERP - النظام الموحد*
*21 فبراير 2026*
