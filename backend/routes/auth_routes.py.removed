"""
Authentication Routes
مسارات المصادقة
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from middleware.auth_middleware import AuthMiddleware, get_current_user
from services.admin_service import AdminService
from lib.auth_rbac_decorator import check_permission, log_audit, validate_json, guard_payload_size
import hashlib

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    تسجيل الدخول

    Request Body:
        {
            "email": "user@example.com",
            "password": "password123"
        }

    Response:
        {
            "token": "jwt_token...",
            "user": {
                "id": "user_1",
                "name": "John Doe",
                "email": "user@example.com",
                "role": "admin",
                "permissions": [...]
            }
        }
    """
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # البحث عن المستخدم
        users = AdminService.get_all_users()
        user = next((u for u in users if u.get('email') == email), None)

        if not user:
            return jsonify({"error": "Invalid credentials"}), 401

        # التحقق من كلمة المرور (في الإنتاج، استخدم bcrypt)
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        stored_password = user.get('password_hash', '')

        # للتطوير: إذا لم يكن هناك password_hash، نقبل أي password
        if stored_password and password_hash != stored_password:
            return jsonify({"error": "Invalid credentials"}), 401

        # التحقق من حالة المستخدم
        if user.get('status') != 'active':
            return jsonify({"error": "Account is disabled"}), 403

        # الحصول على الصلاحيات
        permissions = AdminService.get_user_permissions(user['id'])

        # إنشاء Token
        user_data = {
            'id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'permissions': permissions
        }

        token = AuthMiddleware.create_token(user_data)

        # تسجيل آخر تسجيل دخول
        AdminService.update_user(user['id'], {'last_login': 'now'})

        return jsonify({
            "token": token,
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": user['email'],
                "role": user['role'],
                "permissions": permissions
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    تسجيل مستخدم جديد

    Request Body:
        {
            "name": "John Doe",
            "email": "user@example.com",
            "password": "password123",
            "role": "user"  // optional
        }
    """
    try:
        data = request.get_json()

        # التحقق من الحقول المطلوبة
        required_fields = ['name', 'email', 'password']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        # التحقق من عدم تكرار البريد الإلكتروني
        users = AdminService.get_all_users()
        if any(u.get('email') == data['email'] for u in users):
            return jsonify({"error": "Email already exists"}), 409

        # تشفير كلمة المرور
        password_hash = hashlib.sha256(data['password'].encode()).hexdigest()

        # إنشاء المستخدم
        user_data = {
            'name': data['name'],
            'email': data['email'],
            'password_hash': password_hash,
            'role': data.get('role', 'user')
        }

        user = AdminService.create_user(user_data)

        # إنشاء Token
        permissions = AdminService.get_user_permissions(user['id'])
        token_data = {
            'id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'permissions': permissions
        }

        token = AuthMiddleware.create_token(token_data)

        return jsonify({
            "token": token,
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": user['email'],
                "role": user['role'],
                "permissions": permissions
            }
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@AuthMiddleware.require_auth
def get_current_user_info():
    """
    الحصول على بيانات المستخدم الحالي
    يتطلب Token في الـ Header
    """
    try:
        current_user = get_current_user()

        if not current_user:
            return jsonify({"error": "User not found"}), 404

        # الحصول على بيانات كاملة من قاعدة البيانات
        user = AdminService.get_user(current_user['id'])

        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": user['email'],
                "role": user['role'],
                "status": user['status'],
                "permissions": current_user['permissions']
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """
    تحديث Token

    Request Body:
        {
            "token": "old_token..."
        }

    Response:
        {
            "token": "new_token..."
        }
    """
    try:
        data = request.get_json()
        old_token = data.get('token')

        if not old_token:
            return jsonify({"error": "Token is required"}), 400

        new_token = AuthMiddleware.refresh_token(old_token)

        return jsonify({"token": new_token}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 401


@auth_bp.route('/logout', methods=['POST'])
@AuthMiddleware.require_auth
def logout():
    """
    تسجيل الخروج
    في JWT، الـ Logout يحصل على جانب العميل بحذف الـ Token
    هذا الـ Endpoint للتسجيل فقط
    """
    try:
        current_user = get_current_user()

        # يمكن تسجيل حدث تسجيل الخروج
        # AdminService.log_audit("LOGOUT", f"User {current_user['email']} logged out")

        return jsonify({"message": "Logged out successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route('/change-password', methods=['POST'])
@AuthMiddleware.require_auth
def change_password():
    """
    تغيير كلمة المرور

    Request Body:
        {
            "old_password": "oldpass123",
            "new_password": "newpass123"
        }
    """
    try:
        current_user = get_current_user()
        data = request.get_json()

        old_password = data.get('old_password')
        new_password = data.get('new_password')

        if not old_password or not new_password:
            return jsonify({"error": "Both old and new passwords are required"}), 400

        # التحقق من كلمة المرور القديمة
        user = AdminService.get_user(current_user['id'])
        old_password_hash = hashlib.sha256(old_password.encode()).hexdigest()

        if user.get('password_hash') and user['password_hash'] != old_password_hash:
            return jsonify({"error": "Invalid old password"}), 401

        # تحديث كلمة المرور
        new_password_hash = hashlib.sha256(new_password.encode()).hexdigest()
        AdminService.update_user(current_user['id'], {
            'password_hash': new_password_hash
        })

        return jsonify({"message": "Password changed successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """
    التحقق من صحة Token

    Request Body:
        {
            "token": "jwt_token..."
        }

    Response:
        {
            "valid": true,
            "user": {...}
        }
    """
    try:
        data = request.get_json()
        token = data.get('token')

        if not token:
            return jsonify({"error": "Token is required"}), 400

        payload = AuthMiddleware.verify_token(token)

        return jsonify({
            "valid": True,
            "user": {
                "id": payload.get('user_id'),
                "email": payload.get('email'),
                "role": payload.get('role'),
                "permissions": payload.get('permissions', [])
            }
        }), 200

    except Exception as e:
        return jsonify({
            "valid": False,
            "error": str(e)
        }), 401
