# 📚 مرجع سريع لـ RBAC - Quick Reference

## 🎯 في دقيقة واحدة

```python
# 1️⃣ استيراد
from auth_rbac_decorator import check_permission, log_audit
from flask_jwt_extended import jwt_required

# 2️⃣ تطبيق على endpoint
@app.route('/api/files', methods=['GET'])
@jwt_required()                    # التحقق من JWT
@check_permission('view_files')   # التحقق من الصلاحية
@log_audit('LIST_FILES')          # تسجيل الإجراء
def list_files():
    return jsonify({'files': []})

# 3️⃣ انتهى! ✅
```

---

## 🔑 الأدوار الـ 9 الأساسية

| الدور         | الصلاحيات               | الاستخدام    |
| ------------- | ----------------------- | ------------ |
| `super_admin` | ⭐⭐⭐⭐⭐ (كل شيء)     | مسؤول النظام |
| `admin`       | ⭐⭐⭐⭐ (إدارة كاملة)  | المدير       |
| `manager`     | ⭐⭐⭐ (إدارة البيانات) | مدير البرامج |
| `teacher`     | ⭐⭐ (تقييمات وتوصيات)  | المعلم       |
| `staff`       | ⭐ (عرض فقط)            | الموظف       |
| `user`        | عرض محدود               | مستخدم عام   |

---

## 🔐 الصلاحيات الـ 12 الأساسية

| الصلاحية             | الدور المناسب | المثال                        |
| -------------------- | ------------- | ----------------------------- |
| `view_files`         | teacher+      | GET /files                    |
| `manage_files`       | admin+        | POST/PATCH/DELETE /files      |
| `view_assessments`   | teacher+      | GET /assessments              |
| `manage_assessments` | teacher+      | POST /assessments             |
| `export_files`       | manager+      | POST /files/export            |
| `print_files`        | staff+        | POST /files/print             |
| `ai_analysis`        | teacher+      | POST /assessments/ai-analysis |
| `manage_documents`   | manager+      | POST/DELETE /documents        |
| `create_reports`     | manager+      | POST /reports                 |
| `admin_access`       | admin+        | النظام الكامل                 |
| `audit_logs`         | admin+        | GET /audit/logs               |
| `system_health`      | super_admin   | GET /system/health            |

---

## 🛠️ الـ Decorators الـ 5 الأساسية

### 1. فحص الصلاحية - Check Permission

```python
@check_permission('view_files')  # ✅ صلاحية واحدة
```

### 2. عدة صلاحيات (AND) - Check Multiple

```python
@check_multiple_permissions('manage_files', 'export_files')  # يجب أن يملك الاثنين
```

### 3. عدة صلاحيات (OR) - Check Any

```python
@check_any_permission('export_files', 'print_files')  # واحدة منهما تكفي
```

### 4. حماية الحجم - Guard Payload

```python
@guard_payload_size(max_bytes=2_000_000)  # 2 MB max
```

### 5. التحقق من JSON - Validate JSON

```python
@validate_json('student_id', 'file_number')  # الحقول المطلوبة
```

### 6. تسجيل التدقيق - Log Audit

```python
@log_audit('CREATE_FILE')  # تسجيل الإجراء
```

---

## 📝 أمثلة عملية

### مثال 1: عرض البيانات (GET)

```python
@bp.route('/files', methods=['GET'])
@jwt_required()
@check_permission('view_files')
@log_audit('LIST_FILES')
def list_files():
    files = StudentComprehensiveFile.query.all()
    return jsonify([f.to_dict() for f in files])
```

### مثال 2: إنشاء بيانات (POST)

```python
@bp.route('/files', methods=['POST'])
@jwt_required()
@check_permission('manage_files')
@guard_payload_size()
@validate_json('student_id')
@log_audit('CREATE_FILE')
def create_file():
    data = request.get_json()
    new_file = StudentComprehensiveFile(**data)
    db.session.add(new_file)
    db.session.commit()
    return jsonify(new_file.to_dict()), 201
```

### مثال 3: حذف البيانات (DELETE)

```python
@bp.route('/files/<id>', methods=['DELETE'])
@jwt_required()
@check_permission('manage_files')
@log_audit('DELETE_FILE')
def delete_file(id):
    file = StudentComprehensiveFile.query.get_or_404(id)
    db.session.delete(file)
    db.session.commit()
    return jsonify({'message': 'تم الحذف'})
```

### مثال 4: صلاحيات متعددة

```python
@bp.route('/reports/export', methods=['POST'])
@jwt_required()
@check_multiple_permissions('manage_reports', 'export_data')
@guard_payload_size()
@log_audit('EXPORT_REPORTS')
def export_reports():
    # الكود هنا
    return jsonify({'exported': True})
```

---

## 🧪 اختبار سريع

### استخدام curl

```bash
# احصل على التوكن
TOKEN=$(curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass"}' | jq -r '.token')

# اختبر endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/files
```

### استخدام Python requests

```python
import requests

# توكن JWT
token = "your_token_here"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# GET
response = requests.get('http://localhost:5000/api/files', headers=headers)
print(response.json())

# POST
data = {'student_id': 1, 'file_number': 'S001'}
response = requests.post('http://localhost:5000/api/files',
                        headers=headers, json=data)
print(response.json())
```

---

## ⚠️ رسائل الخطأ الشائعة

| الكود | المعنى            | الحل                                |
| ----- | ----------------- | ----------------------------------- |
| 401   | لا توجد توكن      | أضف `Authorization: Bearer <token>` |
| 403   | صلاحيات غير كافية | تحقق من دور المستخدم                |
| 400   | حقول مفقودة       | تأكد من جميع الحقول المطلوبة        |
| 413   | الحجم كبير        | قلل حجم البيانات                    |

---

## 📋 قائمة التحقق السريعة

- [ ] أضفت `@jwt_required()`؟
- [ ] أضفت `@check_permission('...')`؟
- [ ] أضفت `@guard_payload_size()` للـ POST/PATCH؟
- [ ] أضفت `@validate_json()` للحقول المطلوبة؟
- [ ] أضفت `@log_audit()` للعمليات الحساسة؟
- [ ] اختبرت مع أدوار مختلفة؟
- [ ] فحصت الأخطاء برسائل واضحة؟

---

## 🚀 الخطوة الأولى

```python
# أول شيء: أضف هذا في بداية الملف
from auth_rbac_decorator import check_permission, log_audit
from flask_jwt_extended import jwt_required

# ثاني شيء: أضف على أول endpoint
@check_permission('permission_key')

# ثالث شيء: اختبر!
python test_rbac_system.py
```

---

## 📚 ملفات مهمة

| الملف                          | الاستخدام           |
| ------------------------------ | ------------------- |
| `auth_rbac_decorator.py`       | مكتبة RBAC الرئيسية |
| `test_rbac_system.py`          | اختبارات RBAC       |
| `apply_rbac_system.py`         | سكريبت التطبيق      |
| `RBAC_IMPLEMENTATION_GUIDE.md` | دليل شامل           |
| `RBAC_QUICK_APPLY_GUIDE.md`    | دليل التطبيق        |

---

## 🆘 استكشاف الأخطاء

### المشكلة: 403 Forbidden

```python
# ❌ خطأ شائع
@check_permission('view_files')
def get_files():
    # المستخدم الحالي ليس لديه الصلاحية
    pass

# ✅ الحل
# 1. تحقق من دور المستخدم
# 2. تأكد من أن الدور في permission_groups
# 3. استخدم دور مختلف للاختبار
```

### المشكلة: 400 Bad Request

```python
# ❌ خطأ شائع
@validate_json('field1', 'field2')
def create_item():
    # لم تأرسل الحقول المطلوبة
    pass

# ✅ الحل
# أرسل جميع الحقول المطلوبة:
# {"field1": "value1", "field2": "value2"}
```

### المشكلة: 413 Payload Too Large

```python
# ❌ خطأ شائع
@guard_payload_size(max_bytes=2_000_000)
def upload_file():
    # أرسلت ملف أكبر من 2 MB
    pass

# ✅ الحل
# قلل حجم الملف أو زد max_bytes
```

---

## 🎓 نصائح الخبراء

1. **ابدأ بسيط**: استخدم `check_permission` فقط في البداية
2. **اختبر كثيراً**: اختبر مع كل دور
3. **وثق الصلاحيات**: اكتب تعليقات عن كل صلاحية
4. **راقب السجلات**: استخدم `log_audit` للعمليات الحساسة
5. **قيس الأداء**: تأكد من عدم تأثر الأداء

---

## 💡 الحالات الخاصة

### صلاحية واحدة شاملة

```python
@check_permission('admin_access')  # لـ super_admin فقط
```

### صلاحيات متعددة (الكل مطلوب)

```python
@check_multiple_permissions('manage_files', 'export_files')
```

### صلاحيات متعددة (واحدة تكفي)

```python
@check_any_permission('export_files', 'print_files')
```

---

## 📞 الدعم

**أسئلة شائعة:**

Q: كيف أضيف دور جديد؟ A: عدل `ROLE_GROUPS` في `auth_rbac_decorator.py`

Q: كيف أضيف صلاحية جديدة؟ A: أضفها في `PERMISSION_GROUPS` وأضف الأدوار المناسبة

Q: كيف أختبر الصلاحيات؟ A: استخدم `test_rbac_system.py` أو Postman

Q: كيف أرى سجلات التدقيق؟ A: استعلم من جدول audit_logs في قاعدة البيانات
