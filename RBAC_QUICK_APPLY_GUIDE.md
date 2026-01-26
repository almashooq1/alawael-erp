# 🚀 دليل التطبيق السريع - RBAC

## خطوات التطبيق السريعة

### 1. استيراد المكتبة

```python
# في بداية ملف API
from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    check_any_permission,
    guard_payload_size,
    validate_json,
    log_audit
)
from flask_jwt_extended import jwt_required
```

### 2. تطبيق على Endpoint

```python
@bp.route('/files', methods=['GET'])
@jwt_required()                           # ✅ التحقق من JWT
@check_permission('view_files')          # ✅ التحقق من الصلاحية
@log_audit('LIST_FILES')                 # ✅ تسجيل التدقيق
def list_files():
    """قائمة الملفات"""
    files = StudentComprehensiveFile.query.all()
    return jsonify([f.to_dict() for f in files])
```

### 3. حماية POST/PATCH

```python
@bp.route('/files', methods=['POST'])
@jwt_required()
@check_permission('manage_files')
@guard_payload_size(max_bytes=2_000_000)  # ✅ حماية من الطلبات الكبيرة
@validate_json('student_id', 'file_number')  # ✅ التحقق من الحقول
@log_audit('CREATE_FILE')
def create_file():
    """إنشاء ملف جديد"""
    data = request.get_json()
    # ... business logic
    return jsonify({'file_id': new_file.id}), 201
```

---

## أمثلة للتطبيق الفعلي

### مثال كامل لـ student_comprehensive_api.py

```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from auth_rbac_decorator import (
    check_permission, check_multiple_permissions,
    check_any_permission, guard_payload_size,
    validate_json, log_audit, RoleGroups
)
from student_comprehensive_models import StudentComprehensiveFile
from models import db, User

bp = Blueprint('student_comprehensive', __name__, url_prefix='/api/comprehensive')

# ================== ملفات الطلاب ==================

@bp.route('/files', methods=['GET'])
@jwt_required()
@check_permission('view_files')
@log_audit('LIST_FILES')
def list_files():
    """الحصول على قائمة الملفات الشاملة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        query = StudentComprehensiveFile.query
        total = query.count()
        files = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'files': [f.to_dict() for f in files.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': files.pages
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/files/<int:file_id>', methods=['GET'])
@jwt_required()
@check_permission('view_files')
@log_audit('VIEW_FILE')
def get_file(file_id):
    """الحصول على ملف محدد"""
    file = StudentComprehensiveFile.query.get_or_404(file_id)
    return jsonify(file.to_dict())


@bp.route('/files', methods=['POST'])
@jwt_required()
@check_permission('manage_files')
@guard_payload_size(max_bytes=2_000_000)
@validate_json('student_id', 'file_number')
@log_audit('CREATE_FILE')
def create_file():
    """إنشاء ملف شامل جديد"""
    data = request.get_json()
    user_id = get_jwt_identity()

    try:
        new_file = StudentComprehensiveFile(
            student_id=data.get('student_id'),
            file_number=data.get('file_number'),
            class_level=data.get('class_level'),
            academic_year=data.get('academic_year'),
            created_by_id=user_id,
            status='draft'
        )

        db.session.add(new_file)
        db.session.commit()

        return jsonify({
            'message': 'تم إنشاء الملف بنجاح',
            'file': new_file.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@bp.route('/files/<int:file_id>', methods=['PATCH'])
@jwt_required()
@check_permission('manage_files')
@guard_payload_size()
@log_audit('UPDATE_FILE')
def update_file(file_id):
    """تحديث ملف شامل"""
    file = StudentComprehensiveFile.query.get_or_404(file_id)
    data = request.get_json()

    try:
        if 'class_level' in data:
            file.class_level = data['class_level']
        if 'status' in data:
            file.status = data['status']
        if 'notes' in data:
            file.notes = data['notes']

        file.updated_at = func.now()
        db.session.commit()

        return jsonify({
            'message': 'تم تحديث الملف بنجاح',
            'file': file.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@bp.route('/files/<int:file_id>', methods=['DELETE'])
@jwt_required()
@check_permission('manage_files')
@log_audit('DELETE_FILE')
def delete_file(file_id):
    """حذف ملف شامل"""
    file = StudentComprehensiveFile.query.get_or_404(file_id)

    try:
        db.session.delete(file)
        db.session.commit()

        return jsonify({
            'message': 'تم حذف الملف بنجاح',
            'file_id': file_id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ================== التقييمات ==================

@bp.route('/assessments', methods=['POST'])
@jwt_required()
@check_permission('manage_assessments')
@guard_payload_size()
@validate_json('file_id', 'template_id')
@log_audit('CREATE_ASSESSMENT')
def create_assessment():
    """إنشاء تقييم جديد"""
    data = request.get_json()
    user_id = get_jwt_identity()

    try:
        # ... create assessment logic
        return jsonify({'message': 'تم إنشاء التقييم'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@bp.route('/assessments/<int:assessment_id>', methods=['PATCH'])
@jwt_required()
@check_permission('manage_assessments')
@guard_payload_size()
@log_audit('UPDATE_ASSESSMENT')
def update_assessment(assessment_id):
    """تحديث تقييم"""
    # ... update logic
    return jsonify({'message': 'تم التحديث'})


@bp.route('/assessments/<int:assessment_id>', methods=['DELETE'])
@jwt_required()
@check_permission('manage_assessments')
@log_audit('DELETE_ASSESSMENT')
def delete_assessment(assessment_id):
    """حذف تقييم"""
    # ... delete logic
    return jsonify({'message': 'تم الحذف'})


# ================== التصدير والطباعة ==================

@bp.route('/files/<int:file_id>/export', methods=['POST'])
@jwt_required()
@check_permission('export_files')
@log_audit('EXPORT_FILE')
def export_file(file_id):
    """تصدير ملف بصيغة PDF/Excel/JSON"""
    file = StudentComprehensiveFile.query.get_or_404(file_id)
    export_format = request.args.get('format', 'pdf')

    try:
        # ... export logic
        return jsonify({
            'message': 'تم التصدير',
            'format': export_format,
            'file_id': file_id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/files/<int:file_id>/print', methods=['POST'])
@jwt_required()
@check_permission('print_files')
@log_audit('PRINT_FILE')
def print_file(file_id):
    """طباعة ملف"""
    file = StudentComprehensiveFile.query.get_or_404(file_id)

    try:
        # ... print logic
        return jsonify({
            'message': 'تم إرسال الملف للطابعة',
            'file_id': file_id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ================== تحليل الذكاء الاصطناعي ==================

@bp.route('/assessments/<int:assessment_id>/ai-analysis', methods=['POST'])
@jwt_required()
@check_permission('ai_analysis')
@guard_payload_size()
@log_audit('REQUEST_AI_ANALYSIS')
def request_ai_analysis(assessment_id):
    """طلب تحليل بالذكاء الاصطناعي"""
    data = request.get_json()
    user_id = get_jwt_identity()

    try:
        # ... AI analysis logic
        return jsonify({
            'message': 'تم طلب التحليل',
            'assessment_id': assessment_id
        }), 202
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ================== لوحة التحكم ==================

@bp.route('/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_analytics')
@log_audit('VIEW_DASHBOARD')
def get_dashboard():
    """الحصول على بيانات لوحة التحكم"""
    try:
        user_id = get_jwt_identity()

        stats = {
            'total_files': StudentComprehensiveFile.query.count(),
            'total_assessments': 0,  # Add actual query
            'pending_tasks': 0,  # Add actual logic
            'recent_activities': []  # Add actual data
        }

        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ================== قوالب التقييم ==================

@bp.route('/assessment-templates', methods=['GET'])
@jwt_required()
@check_permission('view_assessments')
@log_audit('LIST_TEMPLATES')
def list_templates():
    """قائمة قوالس التقييم"""
    # ... list logic
    return jsonify({'templates': []})


@bp.route('/assessment-templates', methods=['POST'])
@jwt_required()
@check_permission('manage_templates')
@guard_payload_size()
@validate_json('name', 'type')
@log_audit('CREATE_TEMPLATE')
def create_template():
    """إنشاء قالب تقييم جديد"""
    # ... create logic
    return jsonify({'message': 'تم الإنشاء'}), 201


# ================== المستندات ==================

@bp.route('/files/<int:file_id>/documents', methods=['POST'])
@jwt_required()
@check_permission('manage_documents')
@guard_payload_size(max_bytes=5_000_000)
@log_audit('UPLOAD_DOCUMENT')
def upload_document(file_id):
    """رفع مستند للملف"""
    file = StudentComprehensiveFile.query.get_or_404(file_id)
    # ... upload logic
    return jsonify({'message': 'تم الرفع'}), 201


@bp.route('/documents/<int:document_id>', methods=['DELETE'])
@jwt_required()
@check_permission('manage_documents')
@log_audit('DELETE_DOCUMENT')
def delete_document(document_id):
    """حذف مستند"""
    # ... delete logic
    return jsonify({'message': 'تم الحذف'})
```

---

## اختبار الـ Endpoints

### استخدام Postman أو curl

```bash
# الحصول على التوكن
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# استخدام التوكن
TOKEN="your_token_here"

# الحصول على الملفات
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/comprehensive/files

# إنشاء ملف جديد
curl -X POST http://localhost:5000/api/comprehensive/files \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id":1,"file_number":"S001"}'

# حذف ملف
curl -X DELETE http://localhost:5000/api/comprehensive/files/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## التحقق من الأخطاء الشائعة

| الخطأ                 | السبب             | الحل                                |
| --------------------- | ----------------- | ----------------------------------- |
| 401 Unauthorized      | لا توجد توكن JWT  | أضف `Authorization: Bearer <token>` |
| 403 Forbidden         | صلاحيات غير كافية | تحقق من دور المستخدم                |
| 400 Bad Request       | حقول مفقودة       | أرسل جميع الحقول المطلوبة           |
| 413 Payload Too Large | حجم الطلب كبير    | قلل حجم البيانات المرسلة            |

---

## قائمة التحقق

- [ ] تثبيت المكتبات المطلوبة
- [ ] استيراد المكتبة في كل ملف API
- [ ] إضافة decorators على كل endpoint
- [ ] اختبار مع أدوار مختلفة
- [ ] التحقق من سجلات التدقيق
- [ ] توثيق الصلاحيات المطلوبة
