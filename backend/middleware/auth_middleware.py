"""
Authentication and Authorization Middleware
Middleware للمصادقة والصلاحيات
"""

from functools import wraps
from flask import request, jsonify, g
import jwt
from datetime import datetime
from typing import List, Callable
from services.admin_service import AdminService, Permission, UserRole


class AuthMiddleware:
    """Middleware للمصادقة والتحقق من الصلاحيات"""

    SECRET_KEY = "your-secret-key-change-in-production"  # يجب تغييره في الإنتاج

    @staticmethod
    def verify_token(token: str) -> dict:
        """
        التحقق من صحة الـ Token

        Args:
            token: JWT Token

        Returns:
            dict: بيانات المستخدم من الـ Token

        Raises:
            jwt.InvalidTokenError: إذا كان الـ Token غير صحيح
        """
        try:
            payload = jwt.decode(
                token,
                AuthMiddleware.SECRET_KEY,
                algorithms=["HS256"]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise Exception("Token has expired")
        except jwt.InvalidTokenError:
            raise Exception("Invalid token")

    @staticmethod
    def get_token_from_request() -> str:
        """
        استخراج الـ Token من الطلب

        Returns:
            str: Token من الـ Header

        Raises:
            Exception: إذا لم يتم إيجاد الـ Token
        """
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            raise Exception("Authorization header is missing")

        parts = auth_header.split()

        if len(parts) != 2 or parts[0].lower() != 'bearer':
            raise Exception("Invalid authorization header format")

        return parts[1]

    @staticmethod
    def require_auth(f: Callable) -> Callable:
        """
        Decorator للتحقق من المصادقة

        Usage:
            @admin_bp.route('/protected')
            @AuthMiddleware.require_auth
            def protected_route():
                return jsonify({"user_id": g.user_id})
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                token = AuthMiddleware.get_token_from_request()
                payload = AuthMiddleware.verify_token(token)

                # حفظ بيانات المستخدم في g للوصول إليها في المسار
                g.user_id = payload.get('user_id')
                g.user_email = payload.get('email')
                g.user_role = payload.get('role')
                g.user_permissions = payload.get('permissions', [])

                return f(*args, **kwargs)

            except Exception as e:
                return jsonify({"error": f"Authentication failed: {str(e)}"}), 401

        return decorated_function

    @staticmethod
    def require_permission(permission: Permission) -> Callable:
        """
        Decorator للتحقق من صلاحية معينة

        Args:
            permission: الصلاحية المطلوبة من Permission Enum

        Usage:
            @admin_bp.route('/users', methods=['DELETE'])
            @AuthMiddleware.require_auth
            @AuthMiddleware.require_permission(Permission.DELETE_USER)
            def delete_user():
                return jsonify({"message": "User deleted"})
        """
        def decorator(f: Callable) -> Callable:
            @wraps(f)
            def decorated_function(*args, **kwargs):
                try:
                    # التحقق من وجود المصادقة أولاً
                    if not hasattr(g, 'user_id'):
                        return jsonify({"error": "Authentication required"}), 401

                    # التحقق من الصلاحية
                    user_permissions = g.get('user_permissions', [])

                    if permission.value not in user_permissions:
                        return jsonify({
                            "error": "Insufficient permissions",
                            "required_permission": permission.value
                        }), 403

                    return f(*args, **kwargs)

                except Exception as e:
                    return jsonify({"error": f"Authorization failed: {str(e)}"}), 403

            return decorated_function
        return decorator

    @staticmethod
    def require_role(role: UserRole) -> Callable:
        """
        Decorator للتحقق من دور معين

        Args:
            role: الدور المطلوب من UserRole Enum

        Usage:
            @admin_bp.route('/admin-only')
            @AuthMiddleware.require_auth
            @AuthMiddleware.require_role(UserRole.ADMIN)
            def admin_only_route():
                return jsonify({"message": "Welcome admin"})
        """
        def decorator(f: Callable) -> Callable:
            @wraps(f)
            def decorated_function(*args, **kwargs):
                try:
                    # التحقق من وجود المصادقة أولاً
                    if not hasattr(g, 'user_id'):
                        return jsonify({"error": "Authentication required"}), 401

                    # التحقق من الدور
                    user_role = g.get('user_role')

                    if user_role != role.value:
                        return jsonify({
                            "error": "Insufficient privileges",
                            "required_role": role.value,
                            "current_role": user_role
                        }), 403

                    return f(*args, **kwargs)

                except Exception as e:
                    return jsonify({"error": f"Authorization failed: {str(e)}"}), 403

            return decorated_function
        return decorator

    @staticmethod
    def require_any_permission(permissions: List[Permission]) -> Callable:
        """
        Decorator للتحقق من أي صلاحية من القائمة

        Args:
            permissions: قائمة الصلاحيات (يكفي واحدة منها)

        Usage:
            @admin_bp.route('/users/view')
            @AuthMiddleware.require_auth
            @AuthMiddleware.require_any_permission([Permission.VIEW_USERS, Permission.EDIT_USER])
            def view_users():
                return jsonify({"users": []})
        """
        def decorator(f: Callable) -> Callable:
            @wraps(f)
            def decorated_function(*args, **kwargs):
                try:
                    if not hasattr(g, 'user_id'):
                        return jsonify({"error": "Authentication required"}), 401

                    user_permissions = g.get('user_permissions', [])
                    permission_values = [p.value for p in permissions]

                    has_permission = any(p in user_permissions for p in permission_values)

                    if not has_permission:
                        return jsonify({
                            "error": "Insufficient permissions",
                            "required_any_of": permission_values
                        }), 403

                    return f(*args, **kwargs)

                except Exception as e:
                    return jsonify({"error": f"Authorization failed: {str(e)}"}), 403

            return decorated_function
        return decorator

    @staticmethod
    def require_all_permissions(permissions: List[Permission]) -> Callable:
        """
        Decorator للتحقق من جميع الصلاحيات في القائمة

        Args:
            permissions: قائمة الصلاحيات (يجب توفر الجميع)

        Usage:
            @admin_bp.route('/users/admin-action')
            @AuthMiddleware.require_auth
            @AuthMiddleware.require_all_permissions([Permission.EDIT_USER, Permission.DELETE_USER])
            def admin_action():
                return jsonify({"message": "Action completed"})
        """
        def decorator(f: Callable) -> Callable:
            @wraps(f)
            def decorated_function(*args, **kwargs):
                try:
                    if not hasattr(g, 'user_id'):
                        return jsonify({"error": "Authentication required"}), 401

                    user_permissions = g.get('user_permissions', [])
                    permission_values = [p.value for p in permissions]

                    has_all = all(p in user_permissions for p in permission_values)

                    if not has_all:
                        missing = [p for p in permission_values if p not in user_permissions]
                        return jsonify({
                            "error": "Insufficient permissions",
                            "required_all_of": permission_values,
                            "missing": missing
                        }), 403

                    return f(*args, **kwargs)

                except Exception as e:
                    return jsonify({"error": f"Authorization failed: {str(e)}"}), 403

            return decorated_function
        return decorator

    @staticmethod
    def optional_auth(f: Callable) -> Callable:
        """
        Decorator للمصادقة الاختيارية
        إذا كان هناك Token صحيح، يتم تعيين بيانات المستخدم
        إذا لم يكن، يستمر الطلب بدون مصادقة

        Usage:
            @app.route('/public-or-private')
            @AuthMiddleware.optional_auth
            def flexible_route():
                if hasattr(g, 'user_id'):
                    return jsonify({"message": "Authenticated", "user": g.user_id})
                return jsonify({"message": "Public access"})
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                token = AuthMiddleware.get_token_from_request()
                payload = AuthMiddleware.verify_token(token)

                g.user_id = payload.get('user_id')
                g.user_email = payload.get('email')
                g.user_role = payload.get('role')
                g.user_permissions = payload.get('permissions', [])

            except:
                # لا نرمي خطأ، نستمر بدون مصادقة
                pass

            return f(*args, **kwargs)

        return decorated_function

    @staticmethod
    def create_token(user_data: dict, expires_in: int = 86400) -> str:
        """
        إنشاء JWT Token

        Args:
            user_data: بيانات المستخدم
            expires_in: مدة صلاحية الـ Token بالثواني (افتراضي: 24 ساعة)

        Returns:
            str: JWT Token
        """
        from datetime import datetime, timedelta

        payload = {
            'user_id': user_data.get('id'),
            'email': user_data.get('email'),
            'role': user_data.get('role'),
            'permissions': user_data.get('permissions', []),
            'exp': datetime.utcnow() + timedelta(seconds=expires_in),
            'iat': datetime.utcnow()
        }

        token = jwt.encode(
            payload,
            AuthMiddleware.SECRET_KEY,
            algorithm="HS256"
        )

        return token

    @staticmethod
    def refresh_token(token: str) -> str:
        """
        تحديث Token موجود

        Args:
            token: Token القديم

        Returns:
            str: Token جديد
        """
        try:
            # فك تشفير Token القديم (حتى لو انتهى)
            payload = jwt.decode(
                token,
                AuthMiddleware.SECRET_KEY,
                algorithms=["HS256"],
                options={"verify_exp": False}  # لا نتحقق من الانتهاء
            )

            # إنشاء Token جديد
            new_payload = {
                'user_id': payload.get('user_id'),
                'email': payload.get('email'),
                'role': payload.get('role'),
                'permissions': payload.get('permissions', []),
                'exp': datetime.utcnow() + timedelta(days=1),
                'iat': datetime.utcnow()
            }

            new_token = jwt.encode(
                new_payload,
                AuthMiddleware.SECRET_KEY,
                algorithm="HS256"
            )

            return new_token

        except Exception as e:
            raise Exception(f"Token refresh failed: {str(e)}")


# ==================== Helper Functions ====================

def get_current_user() -> dict:
    """
    الحصول على بيانات المستخدم الحالي من g

    Returns:
        dict: بيانات المستخدم
    """
    if not hasattr(g, 'user_id'):
        return None

    return {
        'id': g.user_id,
        'email': g.user_email,
        'role': g.user_role,
        'permissions': g.user_permissions
    }


def check_permission(permission: Permission) -> bool:
    """
    التحقق من امتلاك المستخدم لصلاحية معينة

    Args:
        permission: الصلاحية المطلوبة

    Returns:
        bool: True إذا كان لديه الصلاحية
    """
    if not hasattr(g, 'user_permissions'):
        return False

    return permission.value in g.user_permissions


def check_role(role: UserRole) -> bool:
    """
    التحقق من دور المستخدم

    Args:
        role: الدور المطلوب

    Returns:
        bool: True إذا كان لديه الدور
    """
    if not hasattr(g, 'user_role'):
        return False

    return g.user_role == role.value
