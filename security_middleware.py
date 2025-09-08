from flask import request, session, current_app, abort, jsonify, g
from functools import wraps
from datetime import datetime, timedelta
import json
import logging
from security_services import DataEncryptionService, TwoFactorAuthService, SecurityAuditService
from attack_protection_service import AttackProtectionService, SessionManagementService
from security_models import *
from models import db, User

class SecurityMiddleware:
    """الوسطية الأمنية الشاملة للنظام"""
    
    def __init__(self, app=None):
        self.app = app
        self.encryption_service = DataEncryptionService()
        self.mfa_service = TwoFactorAuthService()
        self.audit_service = SecurityAuditService()
        self.attack_protection = AttackProtectionService()
        self.session_manager = SessionManagementService()
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """تهيئة الوسطية مع التطبيق"""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
        app.teardown_appcontext(self.teardown_request)
        
        # تسجيل معالجات الأخطاء الأمنية
        app.errorhandler(403)(self.handle_forbidden)
        app.errorhandler(429)(self.handle_rate_limit)
        app.errorhandler(400)(self.handle_bad_request)
    
    def before_request(self):
        """معالجة ما قبل الطلب - فحوصات أمنية"""
        try:
            # تسجيل بداية الطلب
            g.request_start_time = datetime.utcnow()
            g.request_id = self.attack_protection.generate_csrf_token()
            
            # تخطي الفحوصات للملفات الثابتة
            if request.endpoint and request.endpoint.startswith('static'):
                return
            
            # فحص سمعة IP
            if not self.attack_protection.check_ip_reputation(request.remote_addr):
                self._log_security_event('ip_blocked', 'high')
                abort(403, description="عنوان IP محظور")
            
            # فحص حدود المعدل
            identifier = f"{request.remote_addr}:{session.get('user_id', 'anonymous')}"
            if not self.attack_protection.check_rate_limiting(identifier):
                self._log_security_event('rate_limit_exceeded', 'medium')
                abort(429, description="تم تجاوز حد الطلبات المسموح")
            
            # فحص CSRF للطلبات المدمرة
            if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
                if self.attack_protection.detect_csrf_attack():
                    self._log_security_event('csrf_attack', 'high')
                    abort(403, description="رمز CSRF غير صحيح")
            
            # فحص المدخلات للهجمات
            self._validate_request_data()
            
            # التحقق من الجلسة للطلبات المحمية
            if self._requires_authentication():
                self._validate_session()
            
            # توليد CSRF token جديد إذا لزم الأمر
            if 'csrf_token' not in session:
                session['csrf_token'] = self.attack_protection.generate_csrf_token()
            
        except Exception as e:
            logging.error(f"خطأ في الوسطية الأمنية: {str(e)}")
            if current_app.debug:
                raise
    
    def after_request(self, response):
        """معالجة ما بعد الطلب - تسجيل وتنظيف"""
        try:
            # حساب وقت الاستجابة
            if hasattr(g, 'request_start_time'):
                response_time = (datetime.utcnow() - g.request_start_time).total_seconds()
                response.headers['X-Response-Time'] = str(response_time)
            
            # إضافة رؤوس الأمان
            self._add_security_headers(response)
            
            # تسجيل الطلب في سجل المراجعة
            if session.get('user_id') and not request.endpoint.startswith('static'):
                self._log_request_audit(response.status_code)
            
            # تحديث نشاط الجلسة
            if session.get('session_id'):
                self._update_session_activity()
            
            return response
            
        except Exception as e:
            logging.error(f"خطأ في معالجة ما بعد الطلب: {str(e)}")
            return response
    
    def teardown_request(self, exception):
        """تنظيف الموارد بعد انتهاء الطلب"""
        try:
            # تسجيل الأخطاء الأمنية
            if exception:
                self._log_security_event('request_exception', 'medium', str(exception))
        except Exception as e:
            logging.error(f"خطأ في تنظيف الطلب: {str(e)}")
    
    def _validate_request_data(self):
        """فحص بيانات الطلب للهجمات"""
        try:
            # فحص المعاملات في URL
            for key, value in request.args.items():
                if self.attack_protection.detect_sql_injection(value):
                    abort(400, description="محاولة SQL Injection مرفوضة")
                if self.attack_protection.detect_xss_attack(value):
                    abort(400, description="محاولة XSS مرفوضة")
                if self.attack_protection.detect_path_traversal(value):
                    abort(400, description="محاولة Path Traversal مرفوضة")
                if self.attack_protection.detect_command_injection(value):
                    abort(400, description="محاولة Command Injection مرفوضة")
            
            # فحص بيانات النموذج
            if request.form:
                for key, value in request.form.items():
                    if self.attack_protection.detect_sql_injection(value):
                        abort(400, description="محاولة SQL Injection مرفوضة")
                    if self.attack_protection.detect_xss_attack(value):
                        abort(400, description="محاولة XSS مرفوضة")
                    if self.attack_protection.detect_command_injection(value):
                        abort(400, description="محاولة Command Injection مرفوضة")
            
            # فحص بيانات JSON
            if request.is_json:
                try:
                    json_data = request.get_json()
                    if json_data:
                        self._validate_json_data(json_data)
                except Exception:
                    abort(400, description="بيانات JSON غير صحيحة")
        
        except Exception as e:
            if e.code in [400, 403]:
                raise
            logging.error(f"خطأ في فحص بيانات الطلب: {str(e)}")
    
    def _validate_json_data(self, data):
        """فحص بيانات JSON بشكل متكرر"""
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, str):
                    if self.attack_protection.detect_sql_injection(value):
                        abort(400, description="محاولة SQL Injection مرفوضة")
                    if self.attack_protection.detect_xss_attack(value):
                        abort(400, description="محاولة XSS مرفوضة")
                elif isinstance(value, (dict, list)):
                    self._validate_json_data(value)
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, (dict, list)):
                    self._validate_json_data(item)
                elif isinstance(item, str):
                    if self.attack_protection.detect_sql_injection(item):
                        abort(400, description="محاولة SQL Injection مرفوضة")
                    if self.attack_protection.detect_xss_attack(item):
                        abort(400, description="محاولة XSS مرفوضة")
    
    def _requires_authentication(self):
        """فحص إذا كان الطلب يتطلب مصادقة"""
        # قائمة المسارات التي لا تتطلب مصادقة
        public_endpoints = [
            'login', 'register', 'static', 'index', 
            'forgot_password', 'reset_password', 'api.login'
        ]
        
        if request.endpoint in public_endpoints:
            return False
        
        # المسارات التي تبدأ بـ /api/ تتطلب مصادقة
        if request.path.startswith('/api/'):
            return True
        
        # المسارات الإدارية تتطلب مصادقة
        admin_paths = ['/admin', '/dashboard', '/management']
        if any(request.path.startswith(path) for path in admin_paths):
            return True
        
        return False
    
    def _validate_session(self):
        """التحقق من صحة الجلسة"""
        try:
            session_id = session.get('session_id')
            session_token = session.get('session_token')
            user_id = session.get('user_id')
            
            if not all([session_id, session_token, user_id]):
                self._clear_session()
                abort(401, description="جلسة غير صحيحة")
            
            # التحقق من الجلسة في قاعدة البيانات
            if not self.session_manager.validate_session(session_id, session_token):
                self._clear_session()
                abort(401, description="جلسة منتهية الصلاحية")
            
            # فحص المصادقة الثنائية للعمليات الحساسة
            if self._requires_mfa():
                mfa_verified = session.get('mfa_verified', False)
                mfa_timestamp = session.get('mfa_timestamp')
                
                if not mfa_verified or not mfa_timestamp:
                    abort(403, description="المصادقة الثنائية مطلوبة")
                
                # التحقق من انتهاء صلاحية المصادقة الثنائية (30 دقيقة)
                mfa_time = datetime.fromisoformat(mfa_timestamp)
                if datetime.utcnow() - mfa_time > timedelta(minutes=30):
                    session.pop('mfa_verified', None)
                    session.pop('mfa_timestamp', None)
                    abort(403, description="انتهت صلاحية المصادقة الثنائية")
        
        except Exception as e:
            if hasattr(e, 'code') and e.code in [401, 403]:
                raise
            logging.error(f"خطأ في التحقق من الجلسة: {str(e)}")
            abort(401, description="خطأ في التحقق من الجلسة")
    
    def _requires_mfa(self):
        """فحص إذا كانت العملية تتطلب مصادقة ثنائية"""
        sensitive_endpoints = [
            'security', 'admin', 'user_management', 
            'financial_management', 'system_config'
        ]
        
        if request.endpoint:
            return any(endpoint in request.endpoint for endpoint in sensitive_endpoints)
        
        sensitive_paths = [
            '/api/admin', '/api/security', '/api/finance',
            '/api/users', '/api/system'
        ]
        
        return any(request.path.startswith(path) for path in sensitive_paths)
    
    def _add_security_headers(self, response):
        """إضافة رؤوس الأمان للاستجابة"""
        # منع XSS
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # HTTPS إجباري
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # سياسة المحتوى
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
            "font-src 'self' https://cdnjs.cloudflare.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self'"
        )
        
        # منع تسريب المرجع
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # معلومات الخادم
        response.headers.pop('Server', None)
        response.headers['X-Powered-By'] = 'مراكز الأوائل'
        
        # CSRF Token
        if 'csrf_token' in session:
            response.headers['X-CSRF-Token'] = session['csrf_token']
    
    def _log_request_audit(self, status_code):
        """تسجيل الطلب في سجل المراجعة"""
        try:
            user_id = session.get('user_id')
            action_type = f"{request.method.lower()}_{request.endpoint or 'unknown'}"
            
            # تحديد مستوى المخاطر حسب رمز الحالة
            if status_code >= 500:
                risk_level = 'high'
            elif status_code >= 400:
                risk_level = 'medium'
            else:
                risk_level = 'low'
            
            self.audit_service.log_user_action(
                user_id=user_id,
                action_type=action_type,
                resource_type='http_request',
                resource_id=request.path,
                description=f"{request.method} {request.path}",
                risk_level=risk_level
            )
        
        except Exception as e:
            logging.error(f"خطأ في تسجيل طلب المراجعة: {str(e)}")
    
    def _update_session_activity(self):
        """تحديث نشاط الجلسة"""
        try:
            session_id = session.get('session_id')
            if session_id:
                session_record = SessionSecurity.query.get(session_id)
                if session_record:
                    session_record.last_activity = datetime.utcnow()
                    db.session.commit()
        
        except Exception as e:
            logging.error(f"خطأ في تحديث نشاط الجلسة: {str(e)}")
    
    def _clear_session(self):
        """مسح بيانات الجلسة"""
        session.clear()
    
    def _log_security_event(self, event_type, severity, details=None):
        """تسجيل حدث أمني"""
        try:
            self.audit_service.log_user_action(
                user_id=session.get('user_id'),
                action_type=event_type,
                resource_type='security_event',
                description=details or event_type,
                risk_level=severity
            )
        except Exception as e:
            logging.error(f"خطأ في تسجيل الحدث الأمني: {str(e)}")
    
    def handle_forbidden(self, error):
        """معالج خطأ 403"""
        self._log_security_event('access_denied', 'medium', str(error))
        
        if request.is_json:
            return jsonify({
                'success': False,
                'message': 'ليس لديك صلاحية للوصول لهذا المورد',
                'error_code': 'ACCESS_DENIED'
            }), 403
        
        return render_template('errors/403.html'), 403
    
    def handle_rate_limit(self, error):
        """معالج خطأ 429"""
        self._log_security_event('rate_limit_exceeded', 'medium', str(error))
        
        if request.is_json:
            return jsonify({
                'success': False,
                'message': 'تم تجاوز حد الطلبات المسموح',
                'error_code': 'RATE_LIMIT_EXCEEDED'
            }), 429
        
        return render_template('errors/429.html'), 429
    
    def handle_bad_request(self, error):
        """معالج خطأ 400"""
        self._log_security_event('bad_request', 'low', str(error))
        
        if request.is_json:
            return jsonify({
                'success': False,
                'message': 'طلب غير صحيح',
                'error_code': 'BAD_REQUEST'
            }), 400
        
        return render_template('errors/400.html'), 400

# ديكوريتر للحماية من الهجمات
def secure_endpoint(require_mfa=False, permission=None):
    """ديكوريتر لحماية نقاط النهاية"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # فحص الصلاحيات
            if permission:
                user_id = session.get('user_id')
                if not user_id:
                    abort(401, description="مطلوب تسجيل الدخول")
                
                # فحص الصلاحية (يمكن تطويرها أكثر)
                # has_permission = check_user_permission(user_id, permission)
                # if not has_permission:
                #     abort(403, description="ليس لديك صلاحية للوصول")
            
            # فحص المصادقة الثنائية
            if require_mfa:
                mfa_verified = session.get('mfa_verified', False)
                if not mfa_verified:
                    abort(403, description="المصادقة الثنائية مطلوبة")
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

# ديكوريتر لتشفير البيانات الحساسة
def encrypt_sensitive_data(*field_names):
    """ديكوريتر لتشفير البيانات الحساسة تلقائياً"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # تشفير البيانات قبل المعالجة
            if request.is_json:
                data = request.get_json()
                encryption_service = DataEncryptionService()
                
                for field in field_names:
                    if field in data and data[field]:
                        data[field] = encryption_service.encrypt_sensitive_data(
                            data[field], field
                        )
                
                # تحديث بيانات الطلب
                request._cached_json = (data, data)
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

# ديكوريتر لتسجيل العمليات الحساسة
def audit_sensitive_operation(operation_type, resource_type):
    """ديكوريتر لتسجيل العمليات الحساسة"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            audit_service = SecurityAuditService()
            user_id = session.get('user_id')
            
            # تسجيل بداية العملية
            audit_service.log_user_action(
                user_id=user_id,
                action_type=f"{operation_type}_start",
                resource_type=resource_type,
                description=f"بداية {operation_type} على {resource_type}",
                risk_level='medium'
            )
            
            try:
                result = f(*args, **kwargs)
                
                # تسجيل نجاح العملية
                audit_service.log_user_action(
                    user_id=user_id,
                    action_type=f"{operation_type}_success",
                    resource_type=resource_type,
                    description=f"نجح {operation_type} على {resource_type}",
                    risk_level='low'
                )
                
                return result
                
            except Exception as e:
                # تسجيل فشل العملية
                audit_service.log_user_action(
                    user_id=user_id,
                    action_type=f"{operation_type}_failed",
                    resource_type=resource_type,
                    description=f"فشل {operation_type} على {resource_type}: {str(e)}",
                    risk_level='high'
                )
                raise
        
        return decorated_function
    return decorator
