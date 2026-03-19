"""
نظام الأمان المتقدم مع OAuth 2.0 و MFA
Advanced Security System with OAuth 2.0 & Multi-Factor Authentication
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from enum import Enum
import hashlib
import secrets
import json
import logging
from abc import ABC, abstractmethod
import jwt
import qrcode
from io import BytesIO
import base64

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== تعريفات الأمان ====================

class AuthenticationType(Enum):
    """أنواع المصادقة"""
    BASIC = "basic"
    BEARER_TOKEN = "bearer_token"
    OAUTH2 = "oauth2"
    SAML = "saml"


class MFAMethod(Enum):
    """طرق المصادقة الثنائية"""
    TOTP = "time_based_otp"  # Google Authenticator
    SMS = "sms_otp"
    EMAIL = "email_otp"
    BACKUP_CODES = "backup_codes"


class PermissionLevel(Enum):
    """مستويات الصلاحيات"""
    ADMIN = 5
    INSTRUCTOR = 4
    STUDENT = 3
    PARENT = 2
    GUEST = 1


# ==================== نظام المصادقة ====================

class PasswordValidator:
    """التحقق من قوة كلمة المرور"""
    
    @staticmethod
    def validate(password: str) -> Tuple[bool, str]:
        """التحقق من المتطلبات"""
        
        if len(password) < 12:
            return False, "كلمة المرور يجب أن تكون 12 حرف على الأقل"
        
        if not any(c.isupper() for c in password):
            return False, "يجب أن تحتوي على حرف كبير واحد على الأقل"
        
        if not any(c.islower() for c in password):
            return False, "يجب أن تحتوي على حرف صغير واحد على الأقل"
        
        if not any(c.isdigit() for c in password):
            return False, "يجب أن تحتوي على رقم واحد على الأقل"
        
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        if not any(c in special_chars for c in password):
            return False, "يجب أن تحتوي على رمز خاص واحد على الأقل"
        
        # التحقق من عدم استخدام كلمات شائعة
        common_passwords = ['password', '123456', 'qwerty', 'admin']
        if password.lower() in common_passwords:
            return False, "كلمة المرور ضعيفة جداً"
        
        return True, "كلمة مرور قوية"


class PasswordHasher:
    """تجزئة كلمات المرور الآمنة"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """تجزئة كلمة المرور باستخدام PBKDF2"""
        salt = secrets.token_hex(32)
        pwd_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode(),
            salt.encode(),
            100000
        )
        return f"{salt}${pwd_hash.hex()}"
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """التحقق من كلمة المرور"""
        try:
            salt, pwd_hash = hashed.split('$')
            verify_hash = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode(),
                salt.encode(),
                100000
            )
            return verify_hash.hex() == pwd_hash
        except Exception as e:
            logger.error(f"خطأ في التحقق: {e}")
            return False


class JWTManager:
    """مدير JSON Web Tokens"""
    
    def __init__(self, secret_key: str, algorithm: str = 'HS256'):
        self.secret_key = secret_key
        self.algorithm = algorithm
    
    def create_token(self, user_id: str, 
                    permissions: list,
                    expires_in: int = 3600) -> str:
        """إنشاء JWT token"""
        
        payload = {
            'user_id': user_id,
            'permissions': permissions,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(seconds=expires_in),
            'iss': 'student-management-system',
            'aud': 'api'
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        
        logger.info(f"✅ Token تم إنشاؤه للمستخدم {user_id}")
        
        return token
    
    def verify_token(self, token: str) -> Tuple[bool, Dict]:
        """التحقق من صحة Token"""
        
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            return True, payload
        
        except jwt.ExpiredSignatureError:
            logger.warning("❌ Token منتهي الصلاحية")
            return False, {'error': 'Token expired'}
        
        except jwt.InvalidTokenError:
            logger.warning("❌ Token غير صحيح")
            return False, {'error': 'Invalid token'}
    
    def refresh_token(self, token: str) -> Optional[str]:
        """تجديد Token"""
        
        is_valid, payload = self.verify_token(token)
        
        if not is_valid:
            return None
        
        # إنشاء token جديد
        return self.create_token(
            payload['user_id'],
            payload['permissions']
        )


# ==================== نظام المصادقة الثنائية ====================

class TOTPGenerator:
    """مولد رموز TOTP (Time-Based OTP)"""
    
    def __init__(self):
        self.window_size = 30  # ثواني
    
    def generate_secret(self) -> str:
        """توليد سر عشوائي"""
        return secrets.token_urlsafe(32)
    
    def get_qr_code(self, user_id: str, secret: str, 
                   issuer: str = "Student Management") -> str:
        """الحصول على رمز QR"""
        
        otp_uri = f"otpauth://totp/{issuer}:{user_id}?secret={secret}&issuer={issuer}"
        
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(otp_uri)
        qr.make(fit=True)
        
        img = qr.make_image()
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        buffered.seek(0)
        
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def verify_code(self, secret: str, code: str) -> bool:
        """التحقق من الكود"""
        # محاكاة - في الإنتاج استخدم مكتبة pyotp
        return len(code) == 6 and code.isdigit()


class SMSOTPProvider:
    """مزود رموز OTP عبر SMS"""
    
    def __init__(self):
        self.sent_codes = {}
    
    def send_otp(self, phone_number: str) -> bool:
        """إرسال كود OTP"""
        
        code = secrets.randbelow(1000000)
        code_str = f"{code:06d}"
        
        self.sent_codes[phone_number] = {
            'code': code_str,
            'created_at': datetime.now(),
            'attempts': 0
        }
        
        logger.info(f"📱 كود OTP أرسل إلى {phone_number}: {code_str}")
        
        return True
    
    def verify_otp(self, phone_number: str, code: str, 
                   max_age: int = 300) -> bool:
        """التحقق من الكود"""
        
        if phone_number not in self.sent_codes:
            return False
        
        otp_data = self.sent_codes[phone_number]
        
        # التحقق من انتهاء الصلاحية
        age = (datetime.now() - otp_data['created_at']).total_seconds()
        if age > max_age:
            logger.warning(f"⏰ كود OTP منتهي الصلاحية")
            return False
        
        # التحقق من الكود
        if otp_data['code'] != code:
            otp_data['attempts'] += 1
            
            if otp_data['attempts'] >= 3:
                del self.sent_codes[phone_number]
                logger.warning(f"🚫 تم حظر المحاولات")
            
            return False
        
        # حذف الكود المستخدم
        del self.sent_codes[phone_number]
        
        logger.info(f"✅ كود OTP تم التحقق منه")
        
        return True


class EmailOTPProvider:
    """مزود رموز OTP عبر البريد الإلكتروني"""
    
    def __init__(self):
        self.sent_codes = {}
    
    def send_otp(self, email: str) -> bool:
        """إرسال كود OTP"""
        
        code = secrets.randbelow(1000000)
        code_str = f"{code:06d}"
        
        self.sent_codes[email] = {
            'code': code_str,
            'created_at': datetime.now(),
            'attempts': 0
        }
        
        logger.info(f"📧 كود OTP أرسل إلى {email}: {code_str}")
        
        return True
    
    def verify_otp(self, email: str, code: str, 
                   max_age: int = 900) -> bool:
        """التحقق من الكود"""
        
        if email not in self.sent_codes:
            return False
        
        otp_data = self.sent_codes[email]
        
        age = (datetime.now() - otp_data['created_at']).total_seconds()
        if age > max_age:
            return False
        
        if otp_data['code'] != code:
            otp_data['attempts'] += 1
            if otp_data['attempts'] >= 5:
                del self.sent_codes[email]
            return False
        
        del self.sent_codes[email]
        
        logger.info(f"✅ كود OTP درجة بريد {email} تم التحقق")
        
        return True


# ==================== نظام الأدوار والصلاحيات ====================

class RoleBasedAccessControl:
    """نظام التحكم في الوصول بناءً على الأدوار"""
    
    def __init__(self):
        self.role_permissions = {
            'admin': {
                'read': ['all'],
                'write': ['all'],
                'delete': ['all'],
                'manage_users': True,
                'manage_system': True
            },
            'instructor': {
                'read': ['course', 'student', 'grade'],
                'write': ['grade', 'announcement'],
                'delete': ['announcement'],
                'manage_course': True
            },
            'student': {
                'read': ['grade', 'schedule', 'transcript'],
                'write': ['profile'],
                'delete': [],
            },
            'parent': {
                'read': ['grade', 'attendance'],
                'write': [],
                'delete': []
            }
        }
    
    def has_permission(self, role: str, action: str, 
                      resource: str = None) -> bool:
        """التحقق من وجود صلاحية"""
        
        if role not in self.role_permissions:
            return False
        
        permissions = self.role_permissions[role]
        
        if action == 'read':
            resources = permissions.get('read', [])
            return 'all' in resources or resource in resources
        
        elif action == 'write':
            resources = permissions.get('write', [])
            return 'all' in resources or resource in resources
        
        elif action == 'delete':
            resources = permissions.get('delete', [])
            return 'all' in resources or resource in resources
        
        return False
    
    def get_role_permissions(self, role: str) -> Dict:
        """الحصول على صلاحيات الدور"""
        return self.role_permissions.get(role, {})


# ==================== مراقبة الأمان ====================

class SecurityAuditor:
    """مراقب الأمان والتدقيق"""
    
    def __init__(self):
        self.audit_log = []
        self.suspicious_activities = []
    
    def log_event(self, user_id: str, action: str, 
                  resource: str, status: str, 
                  ip_address: str = None):
        """تسجيل حدث أمني"""
        
        event = {
            'timestamp': datetime.now().isoformat(),
            'user_id': user_id,
            'action': action,
            'resource': resource,
            'status': status,
            'ip_address': ip_address
        }
        
        self.audit_log.append(event)
        
        logger.info(f"📝 تدقيق: {user_id} {action} {resource} - {status}")
    
    def detect_suspicious_activity(self, user_id: str) -> bool:
        """كشف الأنشطة المريبة"""
        
        # الحصول على آخر 10 أحداث للمستخدم
        recent_events = [
            e for e in self.audit_log
            if e['user_id'] == user_id
        ][-10:]
        
        # البحث عن محاولات فاشلة متعددة
        failed_logins = len([
            e for e in recent_events
            if e['action'] == 'login' and e['status'] == 'failed'
        ])
        
        if failed_logins >= 5:
            self.suspicious_activities.append({
                'user_id': user_id,
                'type': 'multiple_failed_logins',
                'timestamp': datetime.now().isoformat()
            })
            logger.warning(f"🚨 نشاط مريب: محاولات دخول فاشلة متعددة - {user_id}")
            return True
        
        return False
    
    def get_audit_report(self, user_id: str = None, 
                        days: int = 30) -> list:
        """الحصول على تقرير التدقيق"""
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        report = [
            e for e in self.audit_log
            if datetime.fromisoformat(e['timestamp']) > cutoff_date
        ]
        
        if user_id:
            report = [e for e in report if e['user_id'] == user_id]
        
        return report


# ==================== إدارة الجلسات الآمنة ====================

class SessionManager:
    """مدير الجلسات الآمن"""
    
    def __init__(self):
        self.sessions = {}
    
    def create_session(self, user_id: str, 
                      ip_address: str, 
                      user_agent: str) -> str:
        """إنشاء جلسة جديدة"""
        
        session_id = secrets.token_urlsafe(32)
        
        self.sessions[session_id] = {
            'user_id': user_id,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'created_at': datetime.now(),
            'last_activity': datetime.now(),
            'active': True
        }
        
        logger.info(f"✅ جلسة جديدة: {session_id} للمستخدم {user_id}")
        
        return session_id
    
    def validate_session(self, session_id: str, 
                        ip_address: str = None) -> Tuple[bool, str]:
        """التحقق من صحة الجلسة"""
        
        if session_id not in self.sessions:
            return False, "جلسة غير صحيحة"
        
        session = self.sessions[session_id]
        
        # التحقق من انتهاء الصلاحية (30 دقيقة)
        age = (datetime.now() - session['last_activity']).total_seconds()
        if age > 1800:
            del self.sessions[session_id]
            return False, "انتهت صلاحية الجلسة"
        
        # التحقق من تطابق IP (اختياري)
        if ip_address and session['ip_address'] != ip_address:
            logger.warning(f"⚠️ تحذير: تغير عنوان IP للجلسة {session_id}")
        
        # تحديث آخر نشاط
        session['last_activity'] = datetime.now()
        
        return True, "جلسة صحيحة"


# ==================== عرض توضيحي ====================

def demo_security_system():
    """عرض توضيحي للنظام الأمني"""
    
    print("🔐 عرض توضيحي لنظام الأمان المتقدم\n")
    
    # 1. التحقق من كلمة المرور
    print("1️⃣ التحقق من قوة كلمة المرور:")
    validator = PasswordValidator()
    
    passwords = [
        "weak",
        "StrongPass123!",
        "VerySecurePassword123!@#"
    ]
    
    for pwd in passwords:
        is_valid, msg = validator.validate(pwd)
        print(f"   '{pwd}': {msg}")
    
    # 2. تجزئة وتحقق من كلمة المرور
    print("\n2️⃣ تجزئة كلمة المرور:")
    hasher = PasswordHasher()
    hashed = hasher.hash_password("MySecurePassword123!")
    print(f"   Original: MySecurePassword123!")
    print(f"   Hashed: {hashed[:50]}...")
    print(f"   Verify: {hasher.verify_password('MySecurePassword123!', hashed)}")
    
    # 3. JWT Token
    print("\n3️⃣ JWT Token:")
    jwt_mgr = JWTManager(secret_key="my-secret-key")
    token = jwt_mgr.create_token('STU001', ['read', 'write'], expires_in=3600)
    print(f"   Token: {token[:50]}...")
    is_valid, payload = jwt_mgr.verify_token(token)
    print(f"   Valid: {is_valid}")
    print(f"   User: {payload.get('user_id')}")
    
    # 4. MFA - TOTP
    print("\n4️⃣ المصادقة الثنائية (TOTP):")
    totp = TOTPGenerator()
    secret = totp.generate_secret()
    print(f"   Secret: {secret[:20]}...")
    qr = totp.get_qr_code('STU001', secret)
    print(f"   QR Code Generated: {len(qr)} characters")
    
    # 5. RBAC
    print("\n5️⃣ التحكم في الوصول بناءً على الأدوار:")
    rbac = RoleBasedAccessControl()
    
    checks = [
        ('admin', 'read', 'grade'),
        ('student', 'read', 'grade'),
        ('student', 'delete', 'grade'),
    ]
    
    for role, action, resource in checks:
        has = rbac.has_permission(role, action, resource)
        print(f"   {role} {action} {resource}: {has}")
    
    # 6. التدقيق
    print("\n6️⃣ تسجيل التدقيق:")
    auditor = SecurityAuditor()
    auditor.log_event('STU001', 'view_grade', 'MATH101', 'success', '192.168.1.1')
    auditor.log_event('STU002', 'login', 'system', 'failed', '192.168.1.2')
    print(f"   Audit log entries: {len(auditor.audit_log)}")


if __name__ == '__main__':
    demo_security_system()
