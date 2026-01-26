#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RBAC Usage Examples Script
أمثلة استخدام نظام RBAC

يحتوي على أمثلة عملية لكيفية استخدام نظام RBAC في مختلف السيناريوهات
"""

from flask import Flask, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit,
    require_role,
    require_role_level
)

# ============================================
# Example 1: Basic CRUD with RBAC
# ============================================

def example_1_basic_crud():
    """مثال أساسي: CRUD للموظفين"""
    
    print("=" * 60)
    print("Example 1: Basic CRUD Operations")
    print("=" * 60)
    
    code = '''
# READ - يحتاج view_employees
@app.route('/api/employees', methods=['GET'])
@jwt_required()
@check_permission('view_employees')
@log_audit('LIST_EMPLOYEES')
def get_employees():
    employees = Employee.query.all()
    return jsonify([e.to_dict() for e in employees])

# CREATE - يحتاج manage_employees
@app.route('/api/employees', methods=['POST'])
@jwt_required()
@check_permission('manage_employees')
@guard_payload_size(max_size_mb=5)
@validate_json('name', 'email', 'department')
@log_audit('CREATE_EMPLOYEE')
def create_employee():
    data = request.get_json()
    employee = Employee(**data)
    db.session.add(employee)
    db.session.commit()
    return jsonify(employee.to_dict()), 201

# UPDATE - يحتاج manage_employees
@app.route('/api/employees/<int:id>', methods=['PATCH'])
@jwt_required()
@check_permission('manage_employees')
@guard_payload_size()
@log_audit('UPDATE_EMPLOYEE')
def update_employee(id):
    employee = Employee.query.get_or_404(id)
    data = request.get_json()
    for key, value in data.items():
        setattr(employee, key, value)
    db.session.commit()
    return jsonify(employee.to_dict())

# DELETE - يحتاج manage_employees
@app.route('/api/employees/<int:id>', methods=['DELETE'])
@jwt_required()
@check_permission('manage_employees')
@log_audit('DELETE_EMPLOYEE')
def delete_employee(id):
    employee = Employee.query.get_or_404(id)
    db.session.delete(employee)
    db.session.commit()
    return '', 204
    '''
    
    print(code)

# ============================================
# Example 2: Multi-Permission Endpoint
# ============================================

def example_2_multi_permission():
    """مثال: endpoint يحتاج عدة صلاحيات"""
    
    print("\n" + "=" * 60)
    print("Example 2: Multiple Permissions")
    print("=" * 60)
    
    code = '''
# Dashboard يحتاج عدة صلاحيات
@app.route('/api/dashboard/hr-analytics', methods=['GET'])
@jwt_required()
@check_multiple_permissions([
    'view_employees',
    'view_hr_dashboard',
    'ai_analysis'
])
@log_audit('VIEW_HR_ANALYTICS')
def get_hr_analytics():
    """
    هذا endpoint يتطلب 3 صلاحيات:
    - view_employees: لقراءة بيانات الموظفين
    - view_hr_dashboard: لعرض الـ dashboard
    - ai_analysis: لاستخدام التحليلات الذكية
    """
    analytics = {
        'total_employees': Employee.query.count(),
        'departments': get_department_breakdown(),
        'ai_insights': generate_ai_insights()
    }
    return jsonify(analytics)
    '''
    
    print(code)

# ============================================
# Example 3: Role-Based Dashboard
# ============================================

def example_3_role_dashboard():
    """مثال: dashboards حسب الدور"""
    
    print("\n" + "=" * 60)
    print("Example 3: Role-Based Dashboards")
    print("=" * 60)
    
    code = '''
# Super Admin Dashboard - مستوى 10
@app.route('/api/dashboard/admin', methods=['GET'])
@jwt_required()
@require_role_level(10)
@log_audit('VIEW_ADMIN_DASHBOARD')
def admin_dashboard():
    return jsonify({
        'system_stats': get_system_stats(),
        'all_users': User.query.count(),
        'security_logs': get_security_logs()
    })

# HR Manager Dashboard - مستوى 8
@app.route('/api/dashboard/hr', methods=['GET'])
@jwt_required()
@require_role_level(8)
@log_audit('VIEW_HR_DASHBOARD')
def hr_dashboard():
    return jsonify({
        'employees': get_employee_summary(),
        'attendance': get_attendance_summary(),
        'leave_requests': get_pending_leaves()
    })

# Employee Dashboard - مستوى 3
@app.route('/api/dashboard/employee', methods=['GET'])
@jwt_required()
@require_role_level(3)
@log_audit('VIEW_EMPLOYEE_DASHBOARD')
def employee_dashboard():
    user_id = get_jwt_identity()
    return jsonify({
        'my_info': get_employee_info(user_id),
        'my_attendance': get_my_attendance(user_id),
        'my_leaves': get_my_leaves(user_id)
    })
    '''
    
    print(code)

# ============================================
# Example 4: Specific Role Required
# ============================================

def example_4_specific_role():
    """مثال: صلاحيات لدور محدد فقط"""
    
    print("\n" + "=" * 60)
    print("Example 4: Specific Role Requirements")
    print("=" * 60)
    
    code = '''
# فقط Finance Manager يمكنه تعديل الميزانية
@app.route('/api/finance/budget', methods=['POST'])
@jwt_required()
@require_role('finance_manager')
@guard_payload_size(max_size_mb=10)
@validate_json('department', 'amount', 'fiscal_year')
@log_audit('UPDATE_BUDGET')
def update_budget():
    """فقط Finance Manager يمكنه تحديث الميزانية"""
    data = request.get_json()
    budget = Budget(**data)
    db.session.add(budget)
    db.session.commit()
    return jsonify(budget.to_dict()), 201

# فقط HR Manager يمكنه الموافقة على الإجازات
@app.route('/api/hr/leaves/<int:id>/approve', methods=['POST'])
@jwt_required()
@require_role('hr_manager')
@log_audit('APPROVE_LEAVE')
def approve_leave(id):
    """فقط HR Manager يمكنه الموافقة"""
    leave = LeaveRequest.query.get_or_404(id)
    leave.status = 'approved'
    leave.approved_by = get_jwt_identity()
    db.session.commit()
    return jsonify(leave.to_dict())
    '''
    
    print(code)

# ============================================
# Example 5: Payload Protection
# ============================================

def example_5_payload_protection():
    """مثال: حماية من payload كبير"""
    
    print("\n" + "=" * 60)
    print("Example 5: Payload Size Protection")
    print("=" * 60)
    
    code = '''
# رفع ملف - حماية من DOS attacks
@app.route('/api/files/upload', methods=['POST'])
@jwt_required()
@check_permission('upload_files')
@guard_payload_size(max_size_mb=20)  # أقصى حجم 20MB
@log_audit('UPLOAD_FILE')
def upload_file():
    """
    @guard_payload_size يمنع:
    - DOS attacks عن طريق payload كبير
    - استهلاك الذاكرة الزائد
    - تحميل الخادم
    """
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file provided'}), 400
    
    # حفظ الملف
    filename = secure_filename(file.filename)
    file.save(os.path.join(UPLOAD_FOLDER, filename))
    
    return jsonify({'filename': filename}), 201

# استيراد بيانات كبيرة - حد أكبر
@app.route('/api/import/bulk', methods=['POST'])
@jwt_required()
@check_permission('import_data')
@guard_payload_size(max_size_mb=50)  # 50MB للـ bulk import
@validate_json('data_type', 'records')
@log_audit('BULK_IMPORT')
def bulk_import():
    data = request.get_json()
    # معالجة البيانات الكبيرة
    process_bulk_data(data)
    return jsonify({'success': True, 'count': len(data['records'])})
    '''
    
    print(code)

# ============================================
# Example 6: JSON Validation
# ============================================

def example_6_json_validation():
    """مثال: التحقق من حقول JSON"""
    
    print("\n" + "=" * 60)
    print("Example 6: JSON Field Validation")
    print("=" * 60)
    
    code = '''
# إنشاء مستخدم - التحقق من الحقول المطلوبة
@app.route('/api/users', methods=['POST'])
@jwt_required()
@check_permission('manage_users')
@guard_payload_size()
@validate_json('username', 'email', 'password', 'role')
@log_audit('CREATE_USER')
def create_user():
    """
    @validate_json يتحقق من:
    - وجود جميع الحقول المطلوبة
    - أن الـ payload هو JSON صالح
    - يرجع 400 Bad Request إذا كان هناك حقل ناقص
    """
    data = request.get_json()
    
    # الحقول موجودة بالتأكيد بعد @validate_json
    user = User(
        username=data['username'],
        email=data['email'],
        password=hash_password(data['password']),
        role=data['role']
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify(user.to_dict()), 201

# تحديث الملف الشخصي - حقول اختيارية
@app.route('/api/users/profile', methods=['PATCH'])
@jwt_required()
@guard_payload_size()
@log_audit('UPDATE_PROFILE')
def update_profile():
    """
    بدون @validate_json - كل الحقول اختيارية
    يمكن للمستخدم تحديث أي حقل يريده
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    
    data = request.get_json()
    allowed_fields = ['phone', 'address', 'bio', 'avatar']
    
    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])
    
    db.session.commit()
    return jsonify(user.to_dict())
    '''
    
    print(code)

# ============================================
# Example 7: Audit Logging
# ============================================

def example_7_audit_logging():
    """مثال: تسجيل العمليات"""
    
    print("\n" + "=" * 60)
    print("Example 7: Audit Logging")
    print("=" * 60)
    
    code = '''
# حذف بيانات حساسة - تسجيل تلقائي
@app.route('/api/employees/<int:id>', methods=['DELETE'])
@jwt_required()
@check_permission('manage_employees')
@log_audit('DELETE_EMPLOYEE')
def delete_employee(id):
    """
    @log_audit يسجل تلقائياً:
    - من قام بالعملية (user_id)
    - ماذا فعل (DELETE_EMPLOYEE)
    - متى (timestamp)
    - أين (IP address)
    - على ماذا (resource_id)
    """
    employee = Employee.query.get_or_404(id)
    db.session.delete(employee)
    db.session.commit()
    return '', 204

# الاطلاع على السجلات - للمراجعين
@app.route('/api/audit-logs', methods=['GET'])
@jwt_required()
@require_role_level(8)  # فقط المدراء
def get_audit_logs():
    """عرض سجلات التدقيق"""
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(100).all()
    return jsonify([{
        'user_id': log.user_id,
        'action': log.action,
        'resource_type': log.resource_type,
        'resource_id': log.resource_id,
        'ip_address': log.ip_address,
        'timestamp': log.created_at.isoformat()
    } for log in logs])

# البحث في السجلات
@app.route('/api/audit-logs/search', methods=['GET'])
@jwt_required()
@require_role('super_admin')
def search_audit_logs():
    """البحث في السجلات - فقط Super Admin"""
    user_id = request.args.get('user_id')
    action = request.args.get('action')
    start_date = request.args.get('start_date')
    
    query = AuditLog.query
    
    if user_id:
        query = query.filter_by(user_id=user_id)
    if action:
        query = query.filter_by(action=action)
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    
    logs = query.order_by(AuditLog.created_at.desc()).limit(500).all()
    return jsonify([log.to_dict() for log in logs])
    '''
    
    print(code)

# ============================================
# Example 8: Complex Multi-Decorator
# ============================================

def example_8_complex_stack():
    """مثال: stack معقد من decorators"""
    
    print("\n" + "=" * 60)
    print("Example 8: Complex Decorator Stack")
    print("=" * 60)
    
    code = '''
# Endpoint معقد يستخدم كل decorators
@app.route('/api/finance/reports/generate', methods=['POST'])
@jwt_required()
@require_role_level(8)  # فقط المدراء
@check_multiple_permissions([
    'view_finance_reports',
    'generate_reports',
    'ai_analysis'
])
@guard_payload_size(max_size_mb=15)
@validate_json('report_type', 'start_date', 'end_date', 'departments')
@log_audit('GENERATE_FINANCE_REPORT')
def generate_finance_report():
    """
    Endpoint شامل مع كل الحماية:
    1. @jwt_required - التحقق من تسجيل الدخول
    2. @require_role_level(8) - فقط مستوى 8+
    3. @check_multiple_permissions - 3 صلاحيات مطلوبة
    4. @guard_payload_size - حماية من payload كبير
    5. @validate_json - التحقق من الحقول المطلوبة
    6. @log_audit - تسجيل العملية
    
    هذا المثال يوضح أقصى مستوى من الحماية
    """
    data = request.get_json()
    
    # جميع الشروط تم التحقق منها تلقائياً
    report = generate_report(
        report_type=data['report_type'],
        start_date=data['start_date'],
        end_date=data['end_date'],
        departments=data['departments']
    )
    
    return jsonify({
        'report_id': report.id,
        'status': 'generated',
        'download_url': f'/api/reports/{report.id}/download'
    }), 201
    '''
    
    print(code)

# ============================================
# Main Function
# ============================================

def main():
    """عرض جميع الأمثلة"""
    
    print("\n")
    print("=" * 60)
    print("🎓 RBAC Usage Examples")
    print("أمثلة استخدام نظام RBAC")
    print("=" * 60)
    print("\n")
    
    example_1_basic_crud()
    example_2_multi_permission()
    example_3_role_dashboard()
    example_4_specific_role()
    example_5_payload_protection()
    example_6_json_validation()
    example_7_audit_logging()
    example_8_complex_stack()
    
    print("\n" + "=" * 60)
    print("✅ All examples displayed!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Copy the examples you need")
    print("2. Adapt them to your endpoints")
    print("3. Test with test_rbac_endpoints.py")
    print("4. Check audit logs")
    print("\n")

if __name__ == '__main__':
    main()
