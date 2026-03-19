# خطة توحيد وتنظيف مشروع الأصول ERP

## 📋 ملخص المشروع

### النسخ الموجودة:
| النسخة | الوصف | الحالة |
|--------|-------|--------|
| `backend/` | النسخة الأساسية | ✅ الرئيسية |
| `alawael-erp/` | نسخة ERP | 🔄 للمراجعة |
| `alawael-unified/` | النسخة الموحدة | 🔄 للمراجعة |
| `erp_new_system/` | النظام الجديد | 🔄 للمراجعة |
| `alawael-backend-LOCAL/` | نسخة محلية | ⚠️ للإزالة |
| `alawael-backend-REFERENCE/` | نسخة مرجعية | ⚠️ للأرشفة |
| `alawael-unified-LOCAL/` | نسخة محلية | ⚠️ للإزالة |
| `backend-1/` | نسخة قديمة | ⚠️ للإزالة |
| `backend-finance/` | نسخة مالية | ⚠️ للإزالة |

## 🎯 خطة العمل

### المرحلة 1: تحديد النسخة الرئيسية
- **النسخة الرئيسية**: `backend/` + `frontend/`
- تحتوي على أحدث التعليمات البرمجية

### المرحلة 2: ملفات unified
الملفات الموحدة الموجودة في `backend/`:
- `backend/middleware/auth.unified.js`
- `backend/middleware/validation.unified.js`
- `backend/middleware/rateLimiter.unified.js`
- `backend/routes/hr.routes.unified.js`
- `backend/routes/notifications.routes.unified.js`
- `backend/routes/dashboard.routes.unified.js`
- `backend/routes/finance.routes.unified.js`
- `backend/routes/inventory.routes.unified.js`
- `backend/routes/purchasing.routes.unified.js`
- `backend/routes/index.unified.js`
- `backend/services/index.unified.js`
- `backend/models/index.unified.js`
- `backend/server.unified.js`
- `backend/app.unified.js`
- `backend/package.unified.json`

### المرحلة 3: تنظيف الوثائق
أكثر من 300 ملف توثيق يمكن تنظيفه:
- ملفات التقارير القديمة
- ملفات الجلسات السابقة
- الملفات المكررة

## ✅ التوصيات

1. **الاحتفاظ بـ**: `backend/` + `frontend/` كنسخة رئيسية
2. **أرشفة**: `alawael-erp/`, `alawael-unified/`
3. **إزالة**: النسخ المحلية والقديمة

## 📝 خطوات التنفيذ

```bash
# 1. نسخ احتياطي
# 2. إزالة النسخ المكررة
# 3. توحيد الملفات
# 4. تنظيف الوثائق