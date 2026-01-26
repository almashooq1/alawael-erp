# 📋 RBAC System Implementation Guide

**نظام التحكم بالوصول القائم على الأدوار - الدليل الشامل**

## نظرة عامة

هذا الدليل يوضح نظام RBAC المركزي الذي يوفر تحكماً موحداً بالصلاحيات عبر جميع
نقاط الدخول API.

---

## 🏗️ البنية المعمارية

### المكونات الرئيسية

```
┌─────────────────────────────────────────┐
│  الطلبات الداخلة (HTTP Requests)       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  JWT Token Validation                   │
│  (@jwt_required)                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Role-Based Access Control              │
│  (@check_permission)                    │
│  auth_rbac_decorator.py                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Payload Validation                     │
│  (@guard_payload_size, @validate_json)  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Audit Logging                          │
│  (@log_audit)                           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Route Handler Business Logic           │
└─────────────────────────────────────────┘
```

---

## 👥 الأدوار المعرّفة

| الدور           | الوصف        | الصلاحيات                          |
| --------------- | ------------ | ---------------------------------- |
| **super_admin** | مسؤول النظام | جميع الصلاحيات                     |
| **admin**       | المدير العام | إدارة كاملة (بدون تكوين النظام)    |
| **manager**     | مدير البرامج | إدارة الملفات والتقييمات والتقارير |
| **supervisor**  | المشرف       | عرض والإشراف على البيانات          |
| **teacher**     | المعلم       | إدارة التقييمات والتوصيات          |
| **therapist**   | المعالج      | إدارة التقييمات والتحليلات         |
| **counselor**   | المستشار     | عرض البيانات والتقارير             |
| **staff**       | الموظف       | عرض محدود وطباعة                   |
| **user**        | مستخدم عام   | لا توجد صلاحيات خاصة               |

---

## 🔐 مجموعات الصلاحيات

### عرض البيانات

```python
'view_students'    # عرض بيانات الطلاب
'view_files'       # عرض الملفات الشاملة
'view_assessments' # عرض التقييمات
'view_reports'     # عرض التقارير
'view_analytics'   # عرض التحليلات
'view_users'       # عرض قائمة المستخدمين
```

### إدارة البيانات

```python
'manage_students'    # إضافة/تحديث/حذف الطلاب
'manage_files'       # إدارة الملفات الشاملة
'manage_assessments' # إدارة التقييمات
'manage_templates'   # إدارة قوالب التقييم
'manage_users'       # إدارة المستخدمين
'manage_settings'    # تعديلات النظام
```

### تصدير والطباعة

```python
'export_files'  # تصدير الملفات (PDF, Excel, JSON)
'print_files'   # طباعة الملفات
'export_data'   # تصدير البيانات
```

### التحليل والتوصيات

```python
'ai_analysis'             # طلب تحليل الذكاء الاصطناعي
'create_recommendations'  # إنشاء توصيات
```

### التقارير

```python
'create_reports'   # إنشاء التقارير
'approve_reports'  # الموافقة على التقارير
```

### المستندات

```python
'manage_documents'  # إدارة المستندات
'upload_documents'  # رفع مستندات
'delete_documents'  # حذف مستندات
```

### الإدارة النظام

```python
'admin_access'    # الوصول الإداري الكامل
'audit_logs'      # عرض سجلات التدقيق
'system_health'   # فحص صحة النظام
```

---

## 💻 الاستخدام في الـ API

### مثال 1: حماية endpoint بصلاحية واحدة

```python
from flask_jwt_extended import jwt_required
from auth_rbac_decorator import check_permission, log_audit

@app.route('/api/files', methods=['GET'])
@jwt_required()
@check_permission('view_files')
@log_audit('GET_FILES')
def get_files():
    return jsonify({'files': []})
```

### مثال 2: التحقق من عدة صلاحيات (يجب توفر جميعها)

```python
from auth_rbac_decorator import check_multiple_permissions

@app.route('/api/assessments/export', methods=['POST'])
@jwt_required()
@check_multiple_permissions('manage_assessments', 'export_data')
@log_audit('EXPORT_ASSESSMENTS')
def export_assessments():
    return jsonify({'exported': True})
```

### مثال 3: التحقق من عدة صلاحيات (واحدة منها تكفي)

```python
from auth_rbac_decorator import check_any_permission

@app.route('/api/reports/view', methods=['GET'])
@jwt_required()
@check_any_permission('view_reports', 'create_reports')
@log_audit('VIEW_REPORTS')
def view_reports():
    return jsonify({'reports': []})
```

### مثال 4: حماية من الطلبات الكبيرة وفحص JSON

```python
from auth_rbac_decorator import guard_payload_size, validate_json

@app.route('/api/files', methods=['POST'])
@jwt_required()
@check_permission('manage_files')
@guard_payload_size(max_bytes=2_000_000)
@validate_json('student_id', 'file_number')
@log_audit('CREATE_FILE')
def create_file():
    data = request.get_json()
    return jsonify({'file_id': 123})
```

---

## 📊 مثال: تطبيق على Endpoints متعددة

```python
# ملف: student_comprehensive_api.py

from auth_rbac_decorator import (
    check_permission, guard_payload_size,
    validate_json, log_audit
)

# عرض الملفات
@bp.route('/files', methods=['GET'])
@jwt_required()
@check_permission('view_files')
@log_audit('LIST_FILES')
def list_files():
    pass

# إنشاء ملف جديد
@bp.route('/files', methods=['POST'])
@jwt_required()
@check_permission('manage_files')
@guard_payload_size()
@validate_json('student_id')
@log_audit('CREATE_FILE')
def create_file():
    pass

# تحديث ملف
@bp.route('/files/<id>', methods=['PATCH'])
@jwt_required()
@check_permission('manage_files')
@guard_payload_size()
@log_audit('UPDATE_FILE')
def update_file(id):
    pass

# حذف ملف
@bp.route('/files/<id>', methods=['DELETE'])
@jwt_required()
@check_permission('manage_files')
@log_audit('DELETE_FILE')
def delete_file(id):
    pass

# إدارة التقييمات
@bp.route('/assessments', methods=['POST'])
@jwt_required()
@check_permission('manage_assessments')
@guard_payload_size()
@validate_json('file_id', 'template_id')
@log_audit('CREATE_ASSESSMENT')
def create_assessment():
    pass

# تصدير الملفات
@bp.route('/files/<id>/export', methods=['POST'])
@jwt_required()
@check_permission('export_files')
@log_audit('EXPORT_FILE')
def export_file(id):
    pass

# تحليل بالذكاء الاصطناعي
@bp.route('/assessments/<id>/ai-analysis', methods=['POST'])
@jwt_required()
@check_permission('ai_analysis')
@log_audit('REQUEST_AI_ANALYSIS')
def request_ai_analysis(id):
    pass
```

---

## 🔄 رسائل الخطأ

### 401 - غير مصرح

```json
{
  "error": "المستخدم غير موجود أو لم يتم التحقق منه",
  "status": "unauthorized"
}
```

### 403 - صلاحيات غير كافية

```json
{
  "error": "ليس لديك الصلاحيات الكافية للقيام بهذا الإجراء",
  "required_permission": "manage_files",
  "user_role": "staff",
  "status": "forbidden"
}
```

### 400 - طلب غير صحيح

```json
{
  "error": "حقول مطلوبة مفقودة",
  "missing_fields": ["student_id", "file_number"],
  "status": "bad_request"
}
```

### 413 - حجم الطلب كبير

```json
{
  "error": "حجم الطلب كبير جداً (الحد الأقصى: 2.0 MB)",
  "max_size_bytes": 2000000,
  "status": "payload_too_large"
}
```

---

## 📝 سجل التدقيق

جميع الإجراءات الحساسة يتم تسجيلها تلقائياً:

```
[AUDIT] إجراء: GET_FILES | المستخدم: 5 | الدور: manager | المسار: /api/files | الطريقة: GET
[AUDIT] إجراء: CREATE_FILE | المستخدم: 5 | الدور: manager | المسار: /api/files | الطريقة: POST
[AUDIT] إجراء: DELETE_FILE | المستخدم: 3 | الدور: super_admin | المسار: /api/files/10 | الطريقة: DELETE
```

---

## 🚀 الخطوات التالية

1. **استيراد المكتبات:**

   ```python
   from auth_rbac_decorator import (
       check_permission, check_multiple_permissions,
       check_any_permission, guard_payload_size,
       validate_json, log_audit, RoleGroups
   )
   ```

2. **تطبيق الـ Decorators:**
   - أضف `@check_permission('permission_key')` على كل endpoint
   - أضف `@guard_payload_size()` على endpoints POST/PATCH
   - أضف `@validate_json(...)` للتحقق من الحقول المطلوبة
   - أضف `@log_audit('ACTION_NAME')` للعمليات الحساسة

3. **الاختبار:**
   - اختبر مع أدوار مختلفة
   - تحقق من سجلات التدقيق
   - تأكد من رسائل الخطأ

---

## 📚 المراجع

- **ملف المكتبة الرئيسي:** `auth_rbac_decorator.py`
- **ملف التطبيق:** `student_comprehensive_api.py`
- **نماذج البيانات:** `models.py`
- **ملف الإعدادات:** `rbac_config.py` (قريباً)
