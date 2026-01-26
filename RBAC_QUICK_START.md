# 🚀 RBAC Quick Start Guide

## دليل البدء السريع لنظام RBAC

**⏱️ الوقت المتوقع:** 5 دقائق

---

## ✅ الخطوات

### 1️⃣ تشغيل Database Migration

```bash
python rbac_migration.py
```

**النتيجة المتوقعة:**

```
✅ Migration completed!
   Success: 150+
   Roles: 9
   Permissions: 22+
```

---

### 2️⃣ تحديث ملف API واحد (مثال)

**قبل:**

```python
@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    return jsonify(User.query.all())
```

**بعد:**

```python
from auth_rbac_decorator import check_permission, log_audit

@app.route('/api/users', methods=['GET'])
@jwt_required()
@check_permission('view_employees')
@log_audit('LIST_USERS')
def get_users():
    return jsonify(User.query.all())
```

---

### 3️⃣ تطبيق على جميع الملفات تلقائياً

```bash
python apply_rbac_bulk.py
```

**النتيجة المتوقعة:**

```
✅ نجح: 46 ملف
📊 ~500+ endpoints محدثة
```

---

### 4️⃣ اختبار النظام

```bash
python test_rbac_endpoints.py
```

**النتيجة المتوقعة:**

```
✅ Authentication: PASSED
✅ Authorization: PASSED
✅ Payload Protection: PASSED
```

---

## 📝 أمثلة سريعة

### GET Endpoint

```python
@app.route('/api/employees', methods=['GET'])
@jwt_required()
@check_permission('view_employees')
@log_audit('LIST_EMPLOYEES')
def get_employees():
    pass
```

### POST Endpoint

```python
@app.route('/api/employees', methods=['POST'])
@jwt_required()
@check_permission('manage_employees')
@guard_payload_size()
@validate_json('name', 'email')
@log_audit('CREATE_EMPLOYEE')
def create_employee():
    pass
```

### Multiple Permissions

```python
@check_multiple_permissions(['view_employees', 'view_hr_dashboard'])
def get_hr_stats():
    pass
```

---

## 🎯 Decorators السبعة

| Decorator                       | الغرض                  | مثال                                            |
| ------------------------------- | ---------------------- | ----------------------------------------------- |
| `@check_permission()`           | التحقق من صلاحية واحدة | `@check_permission('view_files')`               |
| `@check_multiple_permissions()` | التحقق من عدة صلاحيات  | `@check_multiple_permissions(['view', 'edit'])` |
| `@guard_payload_size()`         | حماية من payload كبير  | `@guard_payload_size(max_size_mb=5)`            |
| `@validate_json()`              | التحقق من حقول JSON    | `@validate_json('name', 'email')`               |
| `@log_audit()`                  | تسجيل تلقائي           | `@log_audit('DELETE_USER')`                     |
| `@require_role()`               | التحقق من دور محدد     | `@require_role('super_admin')`                  |
| `@require_role_level()`         | التحقق من مستوى الدور  | `@require_role_level(8)`                        |

---

## 🔑 الأدوار التسعة

1. **Super Admin** - كل الصلاحيات
2. **System Admin** - إدارة النظام
3. **HR Manager** - الموارد البشرية
4. **Finance Manager** - المالية
5. **Department Manager** - القسم
6. **Employee** - موظف عادي
7. **CRM Manager** - علاقات العملاء
8. **Support Agent** - الدعم الفني
9. **Guest** - زائر

---

## ⚡ أوامر سريعة

```bash
# Migration
python rbac_migration.py

# تطبيق على كل الملفات
python apply_rbac_bulk.py

# اختبار
python test_rbac_endpoints.py

# اختبار endpoint معين
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/employees
```

---

## 📚 المزيد من المعلومات

- **الدليل الكامل:** `RBAC_COMPLETE_GUIDE.md`
- **الكود المصدري:** `auth_rbac_decorator.py`
- **الاختبارات:** `test_rbac_system.py`

---

## 🆘 استكشاف الأخطاء

### خطأ: "Access Denied"

✅ **الحل:** تحديث role المستخدم

```python
user.role = 'hr_manager'
db.session.commit()
```

### خطأ: "Payload Too Large"

✅ **الحل:** زيادة الحد

```python
@guard_payload_size(max_size_mb=20)
```

### خطأ: "Missing required fields"

✅ **الحل:** إرسال جميع الحقول

```python
{
  "name": "Ahmed",
  "email": "ahmed@example.com",
  "department": "IT"
}
```

---

**⏱️ الوقت الكلي:** 5 دقائق  
**✅ الحالة:** جاهز للإنتاج
