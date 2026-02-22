"""
Admin API Routes
مسارات API الإدارة
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from services.admin_service import AdminService, UserRole, Permission
from lib.auth_rbac_decorator import check_permission, log_audit, validate_json, guard_payload_size

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


# ==================== User Management ====================

@admin_bp.route('/users', methods=['POST'])
@jwt_required()
@check_permission('manage_users')
@guard_payload_size()
@validate_json('name', 'email')
@log_audit('CREATE_USER')
def create_user():
    """إنشاء مستخدم جديد"""
    try:
        data = request.get_json()
        required_fields = ['name', 'email']

        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        user = AdminService.create_user(data)
        return jsonify(user), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@check_permission('view_users')
@log_audit('LIST_USERS')
def get_users():
    """الحصول على قائمة المستخدمين"""
    try:
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 10, type=int)

        users = AdminService.get_all_users(skip, limit)
        return jsonify(users), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/users/<user_id>', methods=['GET'])
@jwt_required()
@check_permission('view_users')
@log_audit('GET_USER')
def get_user(user_id):
    """الحصول على بيانات مستخدم محدد"""
    try:
        user = AdminService.get_user(user_id)
        if "error" in user:
            return jsonify(user), 404
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    """تحديث بيانات المستخدم"""
    try:
        data = request.get_json()
        user = AdminService.update_user(user_id, data)

        if "error" in user:
            return jsonify(user), 404
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """حذف مستخدم"""
    try:
        result = AdminService.delete_user(user_id)
        if "error" in result:
            return jsonify(result), 404
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/users/search', methods=['GET'])
def search_users():
    """البحث عن المستخدمين"""
    try:
        query = request.args.get('q', '', type=str)

        if not query:
            return jsonify({"error": "Search query is required"}), 400

        results = AdminService.search_users(query)
        return jsonify({
            "query": query,
            "results": results,
            "count": len(results)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/users/<user_id>/permissions', methods=['GET'])
def get_user_permissions(user_id):
    """الحصول على صلاحيات المستخدم"""
    try:
        permissions = AdminService.get_user_permissions(user_id)
        return jsonify({
            "user_id": user_id,
            "permissions": permissions
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/users/<user_id>/reset-password', methods=['POST'])
def reset_password(user_id):
    """إعادة تعيين كلمة مرور المستخدم"""
    try:
        data = request.get_json()
        new_password = data.get('new_password')

        if not new_password:
            return jsonify({"error": "New password is required"}), 400

        result = AdminService.reset_user_password(user_id, new_password)

        if "error" in result:
            return jsonify(result), 404
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/users/<user_id>/enable', methods=['POST'])
def enable_user(user_id):
    """تفعيل المستخدم"""
    try:
        user = AdminService.enable_user(user_id)

        if "error" in user:
            return jsonify(user), 404
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/users/<user_id>/disable', methods=['POST'])
def disable_user(user_id):
    """تعطيل المستخدم"""
    try:
        user = AdminService.disable_user(user_id)

        if "error" in user:
            return jsonify(user), 404
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Role Management ====================

@admin_bp.route('/roles', methods=['POST'])
def create_role():
    """إنشاء دور جديد"""
    try:
        data = request.get_json()
        required_fields = ['name']

        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        role = AdminService.create_role(data)
        return jsonify(role), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/roles', methods=['GET'])
def get_roles():
    """الحصول على جميع الأدوار"""
    try:
        roles = AdminService.get_all_roles()
        return jsonify({
            "roles": roles,
            "count": len(roles)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/roles/<role_id>', methods=['PUT'])
def update_role(role_id):
    """تحديث الدور"""
    try:
        data = request.get_json()
        role = AdminService.update_role(role_id, data)

        if "error" in role:
            return jsonify(role), 404
        return jsonify(role), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/roles/<role_id>', methods=['DELETE'])
def delete_role(role_id):
    """حذف الدور"""
    try:
        result = AdminService.delete_role(role_id)
        if "error" in result:
            return jsonify(result), 404
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/roles/<role_id>/permissions/add', methods=['POST'])
def assign_permission(role_id):
    """تعيين صلاحية للدور"""
    try:
        data = request.get_json()
        permission = data.get('permission')

        if not permission:
            return jsonify({"error": "Permission is required"}), 400

        role = AdminService.assign_permission_to_role(role_id, permission)

        if "error" in role:
            return jsonify(role), 404
        return jsonify(role), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/roles/<role_id>/permissions/remove', methods=['POST'])
def revoke_permission(role_id):
    """إزالة صلاحية من الدور"""
    try:
        data = request.get_json()
        permission = data.get('permission')

        if not permission:
            return jsonify({"error": "Permission is required"}), 400

        role = AdminService.revoke_permission_from_role(role_id, permission)

        if "error" in role:
            return jsonify(role), 404
        return jsonify(role), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Audit Logs ====================

@admin_bp.route('/audit-logs', methods=['GET'])
def get_audit_logs():
    """الحصول على سجلات التدقيق"""
    try:
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 50, type=int)

        logs = AdminService.get_audit_logs(skip, limit)
        return jsonify(logs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/audit-logs/filter', methods=['GET'])
def filter_audit_logs():
    """تصفية سجلات التدقيق"""
    try:
        action = request.args.get('action', None, type=str)
        user_id = request.args.get('user_id', None, type=str)

        logs = AdminService.filter_audit_logs(action, user_id)
        return jsonify({
            "filters": {"action": action, "user_id": user_id},
            "logs": logs,
            "count": len(logs)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== System Statistics ====================

@admin_bp.route('/stats', methods=['GET'])
def get_stats():
    """الحصول على إحصائيات النظام"""
    try:
        stats = AdminService.get_system_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    """ملخص لوحة التحكم"""
    try:
        dashboard = AdminService.get_dashboard_summary()
        return jsonify(dashboard), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== User Activity ====================

@admin_bp.route('/users/<user_id>/activity', methods=['GET'])
def get_user_activity(user_id):
    """تقرير نشاط المستخدم"""
    try:
        activity = AdminService.get_user_activity_report(user_id)
        return jsonify(activity), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Export ====================

@admin_bp.route('/users/export/csv', methods=['GET'])
def export_users():
    """تصدير المستخدمين إلى CSV"""
    try:
        csv_data = AdminService.export_users_to_csv()

        from flask import send_file
        from io import StringIO

        output = StringIO()
        output.write(csv_data)
        output.seek(0)

        return send_file(
            output,
            mimetype="text/csv",
            as_attachment=True,
            download_name=f"users_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Health Check ====================

@admin_bp.route('/health', methods=['GET'])
def health_check():
    """فحص صحة API الإدارة"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": {
            "users": "/api/admin/users",
            "roles": "/api/admin/roles",
            "audit_logs": "/api/admin/audit-logs",
            "stats": "/api/admin/stats",
            "dashboard": "/api/admin/dashboard"
        }
    }), 200
