#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
مركزي RBAC (Role-Based Access Control) 
Centralized RBAC Decorator and Permission System
"""

from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity
import logging

logger = logging.getLogger(__name__)


class RoleGroups:
    """تعريف مجموعات الأدوار والصلاحيات
    Define role groups and their permissions
    """
    
    # التعريفات الأساسية للأدوار
    SUPER_ADMIN = 'super_admin'
    ADMIN = 'admin'
    MANAGER = 'manager'
    SUPERVISOR = 'supervisor'
    TEACHER = 'teacher'
    THERAPIST = 'therapist'
    COUNSELOR = 'counselor'
    STAFF = 'staff'
    USER = 'user'
    
    # مجموعات الصلاحيات
    PERMISSION_GROUPS = {
        # عرض البيانات
        'view_students': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR, TEACHER, THERAPIST, COUNSELOR, STAFF},
        'view_files': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR, TEACHER, THERAPIST, COUNSELOR},
        'view_assessments': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR, TEACHER, THERAPIST},
        'view_reports': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR, TEACHER, THERAPIST},
        'view_analytics': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR},
        'view_users': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR},
        'view_dashboard': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR, TEACHER, THERAPIST, COUNSELOR, STAFF, USER},
        
        # إدارة البيانات
        'manage_students': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR},
        'manage_files': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR},
        'manage_assessments': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR, TEACHER, THERAPIST},
        'manage_templates': {SUPER_ADMIN, ADMIN, MANAGER},
        'manage_users': {SUPER_ADMIN, ADMIN},
        'manage_settings': {SUPER_ADMIN, ADMIN},
        
        # تصدير والطباعة
        'export_files': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR},
        'print_files': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR, STAFF},
        'export_data': {SUPER_ADMIN, ADMIN, MANAGER},
        
        # التحليل والتوصيات
        'ai_analysis': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR, TEACHER, THERAPIST},
        'create_recommendations': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR, TEACHER, THERAPIST},
        
        # التقارير
        'create_reports': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR, TEACHER, THERAPIST},
        'approve_reports': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR},
        
        # المستندات
        'manage_documents': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR, TEACHER, THERAPIST},
        'upload_documents': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR, TEACHER, THERAPIST, STAFF},
        'delete_documents': {SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR},
        
        # الإدارة النظام
        'admin_access': {SUPER_ADMIN, ADMIN},
        'audit_logs': {SUPER_ADMIN, ADMIN},
        'system_health': {SUPER_ADMIN, ADMIN},
    }
    
    @classmethod
    def get_roles_for_permission(cls, permission_key):
        """الحصول على قائمة الأدوار المسموح لها بصلاحية معينة"""
        return cls.PERMISSION_GROUPS.get(permission_key, set())
    
    @classmethod
    def is_allowed(cls, user_role, permission_key):
        """التحقق مما إذا كان دور المستخدم مسموح بصلاحية معينة"""
        allowed_roles = cls.get_roles_for_permission(permission_key)
        return user_role.lower() in {role.lower() for role in allowed_roles}


def _get_user_role():
    """الحصول على دور المستخدم من JWT token"""
    try:
        from models import User
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return None
        
        user = User.query.get(int(current_user_id))
        return user.role if user else None
    except Exception as e:
        logger.warning(f"خطأ في الحصول على دور المستخدم: {str(e)}")
        return None


def check_permission(permission_key):
    """Decorator للتحقق من صلاحية معينة
    
    Args:
        permission_key: مفتاح الصلاحية (مثل 'view_files', 'manage_assessments')
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_role = _get_user_role()
            
            if not user_role:
                return jsonify({
                    'error': 'المستخدم غير موجود أو لم يتم التحقق منه',
                    'status': 'unauthorized'
                }), 401
            
            if not RoleGroups.is_allowed(user_role, permission_key):
                logger.warning(
                    f"محاولة وصول غير مصرحة: المستخدم {get_jwt_identity()} "
                    f"بدور '{user_role}' حاول الوصول إلى '{permission_key}'"
                )
                return jsonify({
                    'error': 'ليس لديك الصلاحيات الكافية للقيام بهذا الإجراء',
                    'required_permission': permission_key,
                    'user_role': user_role,
                    'status': 'forbidden'
                }), 403
            
            return fn(*args, **kwargs)
        
        return wrapper
    
    return decorator


def check_multiple_permissions(*permission_keys):
    """Decorator للتحقق من عدة صلاحيات (يجب توفر جميعها)"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_role = _get_user_role()
            
            if not user_role:
                return jsonify({
                    'error': 'المستخدم غير موجود أو لم يتم التحقق منه',
                    'status': 'unauthorized'
                }), 401
            
            missing_permissions = [
                perm for perm in permission_keys
                if not RoleGroups.is_allowed(user_role, perm)
            ]
            
            if missing_permissions:
                logger.warning(
                    f"محاولة وصول غير مصرحة: المستخدم {get_jwt_identity()} "
                    f"بدور '{user_role}' يحتاج إلى: {', '.join(missing_permissions)}"
                )
                return jsonify({
                    'error': 'ليس لديك جميع الصلاحيات المطلوبة',
                    'missing_permissions': missing_permissions,
                    'user_role': user_role,
                    'status': 'forbidden'
                }), 403
            
            return fn(*args, **kwargs)
        
        return wrapper
    
    return decorator


def check_any_permission(*permission_keys):
    """Decorator للتحقق من عدة صلاحيات (يجب توفر واحدة على الأقل)"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_role = _get_user_role()
            
            if not user_role:
                return jsonify({
                    'error': 'المستخدم غير موجود أو لم يتم التحقق منه',
                    'status': 'unauthorized'
                }), 401
            
            has_any = any(
                RoleGroups.is_allowed(user_role, perm)
                for perm in permission_keys
            )
            
            if not has_any:
                logger.warning(
                    f"محاولة وصول غير مصرحة: المستخدم {get_jwt_identity()} "
                    f"بدور '{user_role}' ليس لديه أي من الصلاحيات: {', '.join(permission_keys)}"
                )
                return jsonify({
                    'error': 'ليس لديك واحدة من الصلاحيات المطلوبة',
                    'allowed_permissions': permission_keys,
                    'user_role': user_role,
                    'status': 'forbidden'
                }), 403
            
            return fn(*args, **kwargs)
        
        return wrapper
    
    return decorator


def guard_payload_size(max_bytes=2_000_000):
    """Decorator لحماية من الطلبات الكبيرة جداً"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if request.content_length and request.content_length > max_bytes:
                logger.warning(
                    f"طلب بحجم كبير جداً: {request.content_length} بايت "
                    f"من {request.remote_addr}"
                )
                return jsonify({
                    'error': f'حجم الطلب كبير جداً (الحد الأقصى: {max_bytes / 1_000_000:.1f} MB)',
                    'max_size_bytes': max_bytes,
                    'status': 'payload_too_large'
                }), 413
            
            return fn(*args, **kwargs)
        
        return wrapper
    
    return decorator


def validate_json(*required_fields):
    """Decorator للتحقق من وجود حقول مطلوبة في JSON"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not request.is_json:
                return jsonify({
                    'error': 'Content-Type يجب أن يكون application/json',
                    'status': 'bad_request'
                }), 400
            
            data = request.get_json() or {}
            missing = [field for field in required_fields if field not in data]
            
            if missing:
                return jsonify({
                    'error': 'حقول مطلوبة مفقودة',
                    'missing_fields': missing,
                    'status': 'bad_request'
                }), 400
            
            return fn(*args, **kwargs)
        
        return wrapper
    
    return decorator


def log_audit(action_type):
    """Decorator لتسجيل الإجراءات الحساسة في سجل التدقيق"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user_role = _get_user_role()
            
            logger.info(
                f"[AUDIT] إجراء: {action_type} | "
                f"المستخدم: {user_id} | "
                f"الدور: {user_role} | "
                f"المسار: {request.path} | "
                f"الطريقة: {request.method}"
            )
            
            result = fn(*args, **kwargs)
            return result
        
        return wrapper
    
    return decorator
