# نظام الاتصالات الإدارية - API Documentation

## نظرة عامة

نظام متكامل لإدارة الاتصالات الإدارية والمراسلات الرسمية في منظومة الأصيل ERP.

## الميزات الرئيسية

### 1. أنواع المراسلات

- مذكرة داخلية (internal_memo)
- خطاب رسمي (official_letter)
- تعميم (circular)
- قرار (decision)
- تقرير (report)
- طلب (request)
- رد (response)
- إشعار (notification)
- عقد (contract)
- دعوة (invitation)
- محضر (minutes)

### 2. مستويات الأولوية

- عاجل (urgent)
- مهم جداً (high)
- عادي (normal)
- قليل الأهمية (low)

### 3. حالات المراسلة

- مسودة → قيد المراجعة → قيد الاعتماد → معتمد → مرسل → مستلم → مكتمل → مؤرشف

### 4. مستويات السرية

- عام (public)
- داخلي (internal)
- سري (confidential)
- سري للغاية (highly_confidential)

## نقاط النهاية (Endpoints)

### المراسلات

```
POST   /api/admin-communications/correspondences          # إنشاء مراسلة
GET    /api/admin-communications/correspondences          # البحث في المراسلات
GET    /api/admin-communications/correspondences/inbox    # صندوق الوارد
GET    /api/admin-communications/correspondences/outbox   # صندوق المرسل
GET    /api/admin-communications/correspondences/overdue  # المراسلات المتأخرة
GET    /api/admin-communications/correspondences/statistics # الإحصائيات
GET    /api/admin-communications/correspondences/:id      # تفاصيل مراسلة
PUT    /api/admin-communications/correspondences/:id      # تحديث مراسلة
POST   /api/admin-communications/correspondences/:id/send # إرسال مراسلة
POST   /api/admin-communications/correspondences/:id/receive # استلام مراسلة
POST   /api/admin-communications/correspondences/:id/approve # الموافقة
POST   /api/admin-communications/correspondences/:id/reject # الرفض
POST   /api/admin-communications/correspondences/:id/directive # إضافة توجيه
POST   /api/admin-communications/correspondences/:id/attachments # إضافة مرفق
POST   /api/admin-communications/correspondences/:id/archive # أرشفة
GET    /api/admin-communications/correspondences/:id/thread # سلسلة المراسلات
GET    /api/admin-communications/correspondences/:id/history # سجل الإجراءات
```

### القوالب

```
GET    /api/admin-communications/templates                # قائمة القوالب
POST   /api/admin-communications/templates                # إنشاء قالب
POST   /api/admin-communications/templates/:id/apply      # تطبيق قالب
```

### الجهات الخارجية

```
GET    /api/admin-communications/external-entities        # البحث في الجهات
POST   /api/admin-communications/external-entities        # إضافة جهة
GET    /api/admin-communications/external-entities/:id    # تفاصيل جهة
PUT    /api/admin-communications/external-entities/:id    # تحديث جهة
```

### التكامل الحكومي

```
GET    /api/admin-communications/government/ministries    # قائمة الوزارات
GET    /api/admin-communications/government/regions       # قائمة المناطق
```

## أمثلة الاستخدام

### إنشاء مراسلة جديدة

```json
POST /api/admin-communications/correspondences
{
  "type": "official_letter",
  "subject": "دعوة لحضور اجتماع تنسيقي",
  "content": "يسرنا دعوتكم لحضور...",
  "priority": "high",
  "confidentiality": "internal",
  "sender": {
    "type": "internal",
    "entityId": "branch_123",
    "name": "الإدارة العامة"
  },
  "recipients": [{
    "type": "government",
    "name": "وزارة التعليم",
    "isPrimary": true
  }],
  "dueDate": "2026-03-01"
}
```

### البحث في المراسلات

```
GET /api/admin-communications/correspondences?q=اجتماع&type=official_letter&status=sent&page=1&limit=20
```

### الموافقة على مراسلة

```json
POST /api/admin-communications/correspondences/:id/approve
{
  "comments": "تمت المراجعة والموافقة"
}
```

## التكامل مع الأنظمة الأخرى

- **نظام الإشعارات**: إرسال إشعارات للمستلمين
- **نظام الأرشفة**: أرشفة تلقائية للمراسلات
- **نظام التقارير**: تقارير إحصائية وإدارية
- **نظام سير العمل**: موافقات متعددة المستويات

## الأمان والصلاحيات

- مصادقة JWT مطلوبة لجميع العمليات
- تحكم بالوصول حسب الأدوار (RBAC)
- تسجيل كامل لجميع الإجراءات
- حماية المرفقات والوثائق السرية

## التثبيت

```javascript
const { adminCommRoutes } = require('./communication');
app.use('/api/admin-communications', adminCommRoutes);
```
