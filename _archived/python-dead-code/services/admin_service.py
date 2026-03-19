"""
Admin Management Service
خدمة إدارة النظام والمسؤولين
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
import json


class UserRole(Enum):
    """أدوار المستخدمين"""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    SUPERVISOR = "supervisor"
    STAFF = "staff"
    USER = "user"


class Permission(Enum):
    """الصلاحيات"""
    # User Management
    CREATE_USER = "create_user"
    EDIT_USER = "edit_user"
    DELETE_USER = "delete_user"
    VIEW_USERS = "view_users"
    RESET_PASSWORD = "reset_password"

    # Role Management
    CREATE_ROLE = "create_role"
    EDIT_ROLE = "edit_role"
    DELETE_ROLE = "delete_role"
    VIEW_ROLES = "view_roles"

    # System Management
    VIEW_AUDIT_LOGS = "view_audit_logs"
    VIEW_ANALYTICS = "view_analytics"
    VIEW_REPORTS = "view_reports"
    MANAGE_SETTINGS = "manage_settings"
    MANAGE_BACKUP = "manage_backup"

    # Data Management
    EXPORT_DATA = "export_data"
    IMPORT_DATA = "import_data"
    DELETE_DATA = "delete_data"

    # Content Management
    CREATE_CONTENT = "create_content"
    EDIT_CONTENT = "edit_content"
    DELETE_CONTENT = "delete_content"
    PUBLISH_CONTENT = "publish_content"


class AdminService:
    """خدمة الإدارة المتقدمة"""

    # Role-Permission Mapping
    ROLE_PERMISSIONS = {
        UserRole.SUPER_ADMIN: [p for p in Permission],
        UserRole.ADMIN: [
            Permission.CREATE_USER, Permission.EDIT_USER, Permission.DELETE_USER,
            Permission.VIEW_USERS, Permission.RESET_PASSWORD,
            Permission.VIEW_AUDIT_LOGS, Permission.VIEW_ANALYTICS,
            Permission.VIEW_REPORTS, Permission.MANAGE_SETTINGS,
            Permission.EXPORT_DATA, Permission.CREATE_CONTENT,
            Permission.EDIT_CONTENT, Permission.DELETE_CONTENT, Permission.PUBLISH_CONTENT
        ],
        UserRole.MANAGER: [
            Permission.VIEW_USERS, Permission.EDIT_USER,
            Permission.VIEW_AUDIT_LOGS, Permission.VIEW_ANALYTICS,
            Permission.VIEW_REPORTS, Permission.EXPORT_DATA,
            Permission.CREATE_CONTENT, Permission.EDIT_CONTENT
        ],
        UserRole.SUPERVISOR: [
            Permission.VIEW_USERS, Permission.VIEW_REPORTS,
            Permission.VIEW_ANALYTICS, Permission.EXPORT_DATA
        ],
        UserRole.STAFF: [
            Permission.VIEW_USERS, Permission.EXPORT_DATA
        ],
        UserRole.USER: []
    }

    # Mock data storage
    users_db = {}
    roles_db = {}
    audit_logs_db = []
    permissions_db = {}

    @staticmethod
    def has_permission(user_role: UserRole, permission: Permission) -> bool:
        """التحقق من صلاحية المستخدم"""
        permissions = AdminService.ROLE_PERMISSIONS.get(user_role, [])
        return permission in permissions

    @staticmethod
    def get_user_permissions(user_id: str) -> List[str]:
        """الحصول على صلاحيات المستخدم"""
        user = AdminService.users_db.get(user_id, {})
        role = UserRole(user.get("role", UserRole.USER.value))
        permissions = AdminService.ROLE_PERMISSIONS.get(role, [])
        return [p.value for p in permissions]

    @staticmethod
    def create_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
        """إنشاء مستخدم جديد"""
        user_id = f"user_{len(AdminService.users_db) + 1}"

        user = {
            "id": user_id,
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "role": user_data.get("role", UserRole.USER.value),
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "last_login": None,
            "permissions": AdminService.get_user_permissions(user_id)
        }

        AdminService.users_db[user_id] = user
        AdminService._log_audit("CREATE_USER", f"Created user: {user_data.get('name')}")

        return user

    @staticmethod
    def update_user(user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """تحديث بيانات المستخدم"""
        if user_id not in AdminService.users_db:
            return {"error": "User not found"}

        user = AdminService.users_db[user_id]
        user.update(update_data)
        user["updated_at"] = datetime.utcnow().isoformat()

        AdminService._log_audit("UPDATE_USER", f"Updated user: {user_id}")

        return user

    @staticmethod
    def delete_user(user_id: str) -> Dict[str, Any]:
        """حذف مستخدم"""
        if user_id not in AdminService.users_db:
            return {"error": "User not found"}

        user = AdminService.users_db.pop(user_id)
        AdminService._log_audit("DELETE_USER", f"Deleted user: {user_id}")

        return {"message": f"User {user_id} deleted successfully"}

    @staticmethod
    def get_user(user_id: str) -> Dict[str, Any]:
        """الحصول على بيانات المستخدم"""
        return AdminService.users_db.get(user_id, {"error": "User not found"})

    @staticmethod
    def get_all_users(skip: int = 0, limit: int = 10) -> Dict[str, Any]:
        """الحصول على قائمة المستخدمين"""
        users_list = list(AdminService.users_db.values())
        total = len(users_list)
        users = users_list[skip:skip + limit]

        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "users": users
        }

    @staticmethod
    def search_users(query: str) -> List[Dict[str, Any]]:
        """البحث عن المستخدمين"""
        results = []
        for user in AdminService.users_db.values():
            if (query.lower() in user.get("name", "").lower() or
                query.lower() in user.get("email", "").lower()):
                results.append(user)
        return results

    @staticmethod
    def create_role(role_data: Dict[str, Any]) -> Dict[str, Any]:
        """إنشاء دور جديد"""
        role_id = f"role_{len(AdminService.roles_db) + 1}"

        role = {
            "id": role_id,
            "name": role_data.get("name"),
            "description": role_data.get("description"),
            "permissions": role_data.get("permissions", []),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        AdminService.roles_db[role_id] = role
        AdminService._log_audit("CREATE_ROLE", f"Created role: {role_data.get('name')}")

        return role

    @staticmethod
    def update_role(role_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """تحديث الدور"""
        if role_id not in AdminService.roles_db:
            return {"error": "Role not found"}

        role = AdminService.roles_db[role_id]
        role.update(update_data)
        role["updated_at"] = datetime.utcnow().isoformat()

        AdminService._log_audit("UPDATE_ROLE", f"Updated role: {role_id}")

        return role

    @staticmethod
    def delete_role(role_id: str) -> Dict[str, Any]:
        """حذف الدور"""
        if role_id not in AdminService.roles_db:
            return {"error": "Role not found"}

        role = AdminService.roles_db.pop(role_id)
        AdminService._log_audit("DELETE_ROLE", f"Deleted role: {role_id}")

        return {"message": f"Role {role_id} deleted successfully"}

    @staticmethod
    def get_all_roles() -> List[Dict[str, Any]]:
        """الحصول على جميع الأدوار"""
        return list(AdminService.roles_db.values())

    @staticmethod
    def assign_permission_to_role(role_id: str, permission: str) -> Dict[str, Any]:
        """تعيين صلاحية للدور"""
        if role_id not in AdminService.roles_db:
            return {"error": "Role not found"}

        role = AdminService.roles_db[role_id]
        if permission not in role["permissions"]:
            role["permissions"].append(permission)

        AdminService._log_audit("ASSIGN_PERMISSION", f"Assigned permission to role: {role_id}")

        return role

    @staticmethod
    def revoke_permission_from_role(role_id: str, permission: str) -> Dict[str, Any]:
        """إزالة صلاحية من الدور"""
        if role_id not in AdminService.roles_db:
            return {"error": "Role not found"}

        role = AdminService.roles_db[role_id]
        if permission in role["permissions"]:
            role["permissions"].remove(permission)

        AdminService._log_audit("REVOKE_PERMISSION", f"Revoked permission from role: {role_id}")

        return role

    @staticmethod
    def _log_audit(action: str, details: str, user_id: str = "SYSTEM") -> None:
        """تسجيل إجراء في سجل التدقيق"""
        log_entry = {
            "id": len(AdminService.audit_logs_db) + 1,
            "action": action,
            "details": details,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "ip_address": "0.0.0.0"  # تعديله حسب الحاجة
        }

        AdminService.audit_logs_db.append(log_entry)

    @staticmethod
    def get_audit_logs(skip: int = 0, limit: int = 50) -> Dict[str, Any]:
        """الحصول على سجلات التدقيق"""
        total = len(AdminService.audit_logs_db)
        logs = AdminService.audit_logs_db[skip:skip + limit]

        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "logs": logs
        }

    @staticmethod
    def filter_audit_logs(action: str = None, user_id: str = None) -> List[Dict[str, Any]]:
        """تصفية سجلات التدقيق"""
        results = []
        for log in AdminService.audit_logs_db:
            if action and log["action"] != action:
                continue
            if user_id and log["user_id"] != user_id:
                continue
            results.append(log)

        return results

    @staticmethod
    def get_system_stats() -> Dict[str, Any]:
        """الحصول على إحصائيات النظام"""
        return {
            "total_users": len(AdminService.users_db),
            "total_roles": len(AdminService.roles_db),
            "total_audit_logs": len(AdminService.audit_logs_db),
            "active_users": sum(1 for u in AdminService.users_db.values() if u["status"] == "active"),
            "inactive_users": sum(1 for u in AdminService.users_db.values() if u["status"] == "inactive"),
            "users_by_role": {
                role.value: sum(1 for u in AdminService.users_db.values() if u["role"] == role.value)
                for role in UserRole
            }
        }

    @staticmethod
    def get_dashboard_summary() -> Dict[str, Any]:
        """ملخص لوحة التحكم"""
        stats = AdminService.get_system_stats()
        recent_logs = AdminService.audit_logs_db[-10:]

        return {
            "statistics": stats,
            "recent_activity": recent_logs,
            "timestamp": datetime.utcnow().isoformat()
        }

    @staticmethod
    def reset_user_password(user_id: str, new_password: str) -> Dict[str, Any]:
        """إعادة تعيين كلمة مرور المستخدم"""
        if user_id not in AdminService.users_db:
            return {"error": "User not found"}

        user = AdminService.users_db[user_id]
        user["password_reset_required"] = False
        user["updated_at"] = datetime.utcnow().isoformat()

        AdminService._log_audit("RESET_PASSWORD", f"Password reset for user: {user_id}")

        return {"message": f"Password reset for user {user_id}"}

    @staticmethod
    def enable_user(user_id: str) -> Dict[str, Any]:
        """تفعيل المستخدم"""
        if user_id not in AdminService.users_db:
            return {"error": "User not found"}

        user = AdminService.users_db[user_id]
        user["status"] = "active"

        AdminService._log_audit("ENABLE_USER", f"Enabled user: {user_id}")

        return user

    @staticmethod
    def disable_user(user_id: str) -> Dict[str, Any]:
        """تعطيل المستخدم"""
        if user_id not in AdminService.users_db:
            return {"error": "User not found"}

        user = AdminService.users_db[user_id]
        user["status"] = "inactive"

        AdminService._log_audit("DISABLE_USER", f"Disabled user: {user_id}")

        return user

    @staticmethod
    def export_users_to_csv() -> str:
        """تصدير المستخدمين إلى CSV"""
        csv_data = "ID,Name,Email,Role,Status,Created_At\n"
        for user in AdminService.users_db.values():
            csv_data += f"{user['id']},{user['name']},{user['email']},{user['role']},{user['status']},{user['created_at']}\n"

        AdminService._log_audit("EXPORT_USERS", "Exported users to CSV")

        return csv_data

    @staticmethod
    def get_user_activity_report(user_id: str) -> Dict[str, Any]:
        """تقرير نشاط المستخدم"""
        logs = AdminService.filter_audit_logs(user_id=user_id)

        return {
            "user_id": user_id,
            "total_actions": len(logs),
            "recent_activities": logs[-10:],
            "generated_at": datetime.utcnow().isoformat()
        }
