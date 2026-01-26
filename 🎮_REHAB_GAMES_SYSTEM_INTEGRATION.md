# 🎮 دليل تكامل نظام الألعاب التفاعلية لتأهيل ذوي الإعاقة

# Interactive Games Rehabilitation System - Integration Guide

## 📋 نظرة عامة | Overview

نظام شامل لإدارة برامج التأهيل من خلال الألعاب التفاعلية، مصمم خصيصاً لدعم ذوي
الإعاقات المختلفة.

---

## ⚡ التكامل السريع | Quick Integration

### الخطوة 1: إضافة الاستيراد | Add Import

في ملف **backend/server.js** (حوالي السطر 100):

```javascript
const { router: rehabGamesRouter } = require('./routes/rehab_games_routes');
```

### الخطوة 2: تسجيل المسار | Register Route

في ملف **backend/server.js** (حوالي السطر 610):

```javascript
app.use('/api/rehab-games', rehabGamesRouter);
```

---

## ✅ التحقق | Verification

### 1. اختبار صحة النظام | Test System Health

```bash
curl http://localhost:3001/api/rehab-games/health
```

**النتيجة المتوقعة | Expected Result:**

```json
{
  "success": true,
  "message": "System is healthy",
  "data": {
    "status": "operational",
    "service": "Interactive Games Rehabilitation System"
  }
}
```

### 2. تشغيل الاختبارات | Run Tests

```bash
cd backend
node tests/rehab_games_test.js
```

**النتيجة المتوقعة | Expected Result:**

```
✅ 12/12 اختبارات نجحت
   All tests passing
```

### 3. الحصول على الإحصائيات | Get Statistics

```bash
curl http://localhost:3001/api/rehab-games/stats
```

---

## 📡 نقاط النهاية الرئيسية | Main API Endpoints

### إدارة المرضى | Patient Management

| Method | Endpoint                                     | الوصف          | Description    |
| ------ | -------------------------------------------- | -------------- | -------------- |
| `POST` | `/api/rehab-games/patients`                  | إضافة مريض     | Add patient    |
| `GET`  | `/api/rehab-games/patients/:id`              | معلومات مريض   | Get patient    |
| `PUT`  | `/api/rehab-games/patients/:id`              | تحديث مريض     | Update patient |
| `GET`  | `/api/rehab-games/patients`                  | قائمة المرضى   | List patients  |
| `GET`  | `/api/rehab-games/patients/:id/dashboard`    | لوحة المعلومات | Dashboard      |
| `GET`  | `/api/rehab-games/patients/:id/progress`     | التقدم         | Progress       |
| `GET`  | `/api/rehab-games/patients/:id/achievements` | الإنجازات      | Achievements   |

### إدارة المعالجين | Therapist Management

| Method | Endpoint                                | الوصف         | Description   |
| ------ | --------------------------------------- | ------------- | ------------- |
| `POST` | `/api/rehab-games/therapists`           | إضافة معالج   | Add therapist |
| `GET`  | `/api/rehab-games/therapists/:id`       | معلومات معالج | Get therapist |
| `GET`  | `/api/rehab-games/therapists/:id/stats` | إحصائيات      | Statistics    |

### إدارة الألعاب | Games Management

| Method | Endpoint                     | الوصف          | Description  |
| ------ | ---------------------------- | -------------- | ------------ |
| `POST` | `/api/rehab-games/games`     | إضافة لعبة     | Add game     |
| `GET`  | `/api/rehab-games/games/:id` | معلومات لعبة   | Get game     |
| `GET`  | `/api/rehab-games/games`     | البحث عن ألعاب | Search games |

### إدارة الجلسات | Session Management

| Method | Endpoint                                       | الوصف      | Description      |
| ------ | ---------------------------------------------- | ---------- | ---------------- |
| `POST` | `/api/rehab-games/sessions`                    | إنشاء جلسة | Create session   |
| `POST` | `/api/rehab-games/sessions/:id/start`          | بدء جلسة   | Start session    |
| `POST` | `/api/rehab-games/sessions/:id/complete`       | إنهاء جلسة | Complete session |
| `GET`  | `/api/rehab-games/sessions/patient/:patientId` | جلسات مريض | Patient sessions |

### التقييمات والتمارين | Assessments & Exercises

| Method | Endpoint                                          | الوصف        | Description         |
| ------ | ------------------------------------------------- | ------------ | ------------------- |
| `POST` | `/api/rehab-games/assessments`                    | إنشاء تقييم  | Create assessment   |
| `GET`  | `/api/rehab-games/assessments/patient/:patientId` | تقييمات مريض | Patient assessments |
| `POST` | `/api/rehab-games/exercises`                      | إنشاء تمرين  | Create exercise     |
| `GET`  | `/api/rehab-games/exercises/patient/:patientId`   | تمارين مريض  | Patient exercises   |

### التقارير | Reports

| Method | Endpoint                            | الوصف       | Description     |
| ------ | ----------------------------------- | ----------- | --------------- |
| `POST` | `/api/rehab-games/reports/generate` | توليد تقرير | Generate report |

---

## 🧪 أمثلة الاستخدام | Usage Examples

### إضافة مريض جديد | Add New Patient

```bash
curl -X POST http://localhost:3001/api/rehab-games/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "أحمد علي",
    "age": 28,
    "gender": "male",
    "disabilityType": "physical",
    "disabilityLevel": "moderate",
    "currentCondition": "إصابة في الحبل الشوكي",
    "goals": ["تحسين قوة العضلات", "زيادة مدى الحركة"],
    "assignedTherapist": "T0001",
    "email": "ahmed@email.com",
    "phone": "+201234567890"
  }'
```

### إنشاء جلسة تأهيل | Create Rehabilitation Session

```bash
curl -X POST http://localhost:3001/api/rehab-games/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "P0001",
    "therapistId": "T0001",
    "gameId": "G0001",
    "type": "training",
    "scheduledDate": "2026-01-22T10:00:00Z",
    "duration": 20,
    "goals": ["تحسين التوازن"]
  }'
```

### الحصول على لوحة معلومات المريض | Get Patient Dashboard

```bash
curl http://localhost:3001/api/rehab-games/patients/P0001/dashboard
```

---

## 📚 ملفات التوثيق | Documentation Files

1. **backend/lib/interactive_games_rehab_system.js**
   - النظام الأساسي الكامل
   - Complete core system

2. **backend/routes/rehab_games_routes.js**
   - جميع نقاط النهاية
   - All API endpoints

3. **backend/tests/rehab_games_test.js**
   - مجموعة الاختبارات
   - Test suite

4. **backend/sample_rehab_games_data.js**
   - بيانات عينة وسيناريوهات
   - Sample data and scenarios

---

## 🎯 المميزات الأساسية | Core Features

### ✅ إدارة المرضى

- تسجيل معلومات شاملة
- تتبع التقدم اليومي
- أهداف قابلة للتخصيص
- ملفات طبية كاملة

### ✅ مكتبة ألعاب تفاعلية

- ألعاب متخصصة لكل نوع إعاقة
- مستويات صعوبة متعددة
- دعم الوصول الشامل
- قابلة للتخصيص

### ✅ نظام الجلسات

- جدولة ذكية
- تتبع حي للأداء
- تسجيل تلقائي للنتائج
- تحليل فوري

### ✅ نظام الإنجازات

- تحفيز المرضى
- مكافآت تلقائية
- شارات وجوائز
- تتبع التقدم

### ✅ التقارير والتحليلات

- تقارير شاملة
- تحليل الأداء
- توصيات ذكية
- رسوم بيانية

### ✅ لوحة معلومات تفاعلية

- عرض شامل للإحصائيات
- الجلسات القادمة
- آخر الإنجازات
- رسائل تحفيزية

---

## 🔍 أنواع الإعاقات المدعومة | Supported Disability Types

| النوع       | Type   | الوصف         | Description            |
| ----------- | ------ | ------------- | ---------------------- |
| `physical`  | حركية  | إعاقات حركية  | Physical disabilities  |
| `cognitive` | معرفية | إعاقات معرفية | Cognitive disabilities |
| `sensory`   | حسية   | إعاقات حسية   | Sensory disabilities   |
| `multiple`  | متعددة | إعاقات متعددة | Multiple disabilities  |

---

## 🎮 فئات الألعاب | Game Categories

- **motor** - ألعاب حركية | Motor games
- **cognitive** - ألعاب معرفية | Cognitive games
- **sensory** - ألعاب حسية | Sensory games
- **speech** - ألعاب النطق | Speech games
- **memory** - ألعاب الذاكرة | Memory games
- **coordination** - ألعاب التنسيق | Coordination games

---

## ⚙️ الإعدادات والتخصيص | Settings & Customization

### مستويات الصعوبة | Difficulty Levels

- `beginner` - مبتدئ
- `intermediate` - متوسط
- `advanced` - متقدم

### أنواع الجلسات | Session Types

- `assessment` - تقييم
- `training` - تدريب
- `therapy` - علاج
- `practice` - تمرين

### مستويات الإعاقة | Disability Levels

- `mild` - خفيف
- `moderate` - متوسط
- `severe` - شديد

---

## 📊 الإحصائيات والتقارير | Statistics & Reports

يوفر النظام:

- تتبع شامل للتقدم
- تحليل الأداء
- معدلات النجاح
- الاستمرارية والالتزام
- المجالات القوية والضعيفة
- توصيات تلقائية

---

## 🛡️ الأمان والخصوصية | Security & Privacy

- تشفير البيانات الطبية
- صلاحيات محددة للمعالجين
- حماية معلومات المرضى
- سجلات تدقيق كاملة

---

## 🚀 الخطوات التالية | Next Steps

1. **التكامل**: أضف المسارات إلى backend/server.js
2. **الاختبار**: شغّل الاختبارات التلقائية
3. **البيانات**: راجع البيانات العينة
4. **التخصيص**: عدّل الألعاب والإعدادات حسب الحاجة
5. **النشر**: انشر النظام للاستخدام الفعلي

---

## 📞 الدعم | Support

للمزيد من المعلومات، راجع:

- ملف النظام الأساسي
- ملف الاختبارات
- ملف البيانات العينة

---

## ✨ الحالة | Status

- ✅ **التطوير**: مكتمل 100%
- ✅ **الاختبارات**: 12/12 جاهزة
- ✅ **التوثيق**: شامل
- ✅ **الجاهزية**: جاهز للنشر الفوري

---

**تم التطوير**: 22 يناير 2026  
**الإصدار**: 1.0.0  
**الحالة**: ✅ جاهز للإنتاج | Production Ready
