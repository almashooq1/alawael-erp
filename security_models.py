# SQLAlchemy import removed - using centralized db instance
from datetime import datetime, timedelta
from sqlalchemy import text
import json
import secrets
import hashlib
from cryptography.fernet import Fernet
import base64

# Import db from database module to avoid conflicts
from database import db

class SecurityConfig(db.Model):
    """إعدادات الأمان العامة للنظام"""
    __tablename__ = 'security_configs'
    
    id = db.Column(db.Integer, primary_key=True)
    config_key = db.Column(db.String(100), unique=True, nullable=False)
    config_value = db.Column(db.Text)
    description = db.Column(db.Text)
    is_encrypted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))

class MultiFactorAuth(db.Model):
    """نظام المصادقة متعددة العوامل"""
    __tablename__ = 'multi_factor_auth'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    method_type = db.Column(db.String(50), nullable=False)  # sms, email, totp, backup_codes
    secret_key = db.Column(db.Text)  # مشفر
    phone_number = db.Column(db.String(20))
    email = db.Column(db.String(120))
    backup_codes = db.Column(db.Text)  # JSON مشفر
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    last_used = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User', backref='mfa_methods')

class MFAAttempt(db.Model):
    """محاولات المصادقة متعددة العوامل"""
    __tablename__ = 'mfa_attempts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    method_type = db.Column(db.String(50), nullable=False)
    code_sent = db.Column(db.String(10))  # مشفر
    code_entered = db.Column(db.String(10))
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    is_successful = db.Column(db.Boolean, default=False)
    failure_reason = db.Column(db.String(200))
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AuditLog(db.Model):
    """سجل العمليات والمراجعة"""
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    session_id = db.Column(db.String(100))
    action_type = db.Column(db.String(50), nullable=False)  # login, logout, create, update, delete, view
    resource_type = db.Column(db.String(100))  # user, student, financial_record, etc.
    resource_id = db.Column(db.String(50))
    action_description = db.Column(db.Text)
    old_values = db.Column(db.Text)  # JSON مشفر
    new_values = db.Column(db.Text)  # JSON مشفر
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    location = db.Column(db.String(200))
    risk_level = db.Column(db.String(20), default='low')  # low, medium, high, critical
    is_suspicious = db.Column(db.Boolean, default=False)
    extra_metadata = db.Column(db.Text)  # JSON إضافي
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User', backref='audit_logs')

class DataEncryption(db.Model):
    """إدارة تشفير البيانات"""
    __tablename__ = 'data_encryption'
    
    id = db.Column(db.Integer, primary_key=True)
    table_name = db.Column(db.String(100), nullable=False)
    column_name = db.Column(db.String(100), nullable=False)
    encryption_key_id = db.Column(db.String(100), nullable=False)
    encryption_algorithm = db.Column(db.String(50), default='AES-256')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class BackupSchedule(db.Model):
    """جدولة النسخ الاحتياطي"""
    __tablename__ = 'backup_schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    backup_type = db.Column(db.String(50), nullable=False)  # full, incremental, differential
    frequency = db.Column(db.String(50), nullable=False)  # daily, weekly, monthly
    schedule_time = db.Column(db.Time)
    schedule_days = db.Column(db.String(20))  # JSON: [1,2,3,4,5] للأيام
    tables_included = db.Column(db.Text)  # JSON قائمة الجداول
    storage_location = db.Column(db.String(500))
    retention_days = db.Column(db.Integer, default=30)
    compression_enabled = db.Column(db.Boolean, default=True)
    encryption_enabled = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    last_run = db.Column(db.DateTime)
    next_run = db.Column(db.DateTime)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class BackupHistory(db.Model):
    """تاريخ النسخ الاحتياطي"""
    __tablename__ = 'backup_history'
    
    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('backup_schedules.id'))
    backup_name = db.Column(db.String(200), nullable=False)
    backup_type = db.Column(db.String(50), nullable=False)
    file_path = db.Column(db.String(500))
    file_size = db.Column(db.BigInteger)  # بالبايت
    checksum = db.Column(db.String(128))  # SHA-256
    status = db.Column(db.String(50), default='running')  # running, completed, failed
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    duration_seconds = db.Column(db.Integer)
    records_count = db.Column(db.Integer)
    error_message = db.Column(db.Text)
    extra_metadata = db.Column(db.Text)  # JSON معلومات إضافية
    
    # العلاقات
    schedule = db.relationship('BackupSchedule', backref='backup_history')

class PrivacyConsent(db.Model):
    """موافقات الخصوصية"""
    __tablename__ = 'privacy_consents'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=True)
    consent_type = db.Column(db.String(100), nullable=False)  # data_processing, marketing, analytics
    purpose = db.Column(db.Text, nullable=False)
    legal_basis = db.Column(db.String(100))  # consent, contract, legal_obligation, etc.
    data_categories = db.Column(db.Text)  # JSON قائمة فئات البيانات
    retention_period = db.Column(db.String(100))
    third_parties = db.Column(db.Text)  # JSON قائمة الأطراف الثالثة
    is_granted = db.Column(db.Boolean, default=False)
    granted_at = db.Column(db.DateTime)
    withdrawn_at = db.Column(db.DateTime)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    version = db.Column(db.String(20), default='1.0')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User', backref='privacy_consents')

class DataRetention(db.Model):
    """سياسات الاحتفاظ بالبيانات"""
    __tablename__ = 'data_retention'
    
    id = db.Column(db.Integer, primary_key=True)
    data_category = db.Column(db.String(100), nullable=False)
    table_name = db.Column(db.String(100), nullable=False)
    retention_period_days = db.Column(db.Integer, nullable=False)
    deletion_method = db.Column(db.String(50), default='soft_delete')  # soft_delete, hard_delete, anonymize
    legal_basis = db.Column(db.String(200))
    exceptions = db.Column(db.Text)  # JSON حالات الاستثناء
    is_active = db.Column(db.Boolean, default=True)
    last_cleanup = db.Column(db.DateTime)
    next_cleanup = db.Column(db.DateTime)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SecurityIncident(db.Model):
    """حوادث الأمان"""
    __tablename__ = 'security_incidents'
    
    id = db.Column(db.Integer, primary_key=True)
    incident_type = db.Column(db.String(100), nullable=False)  # unauthorized_access, data_breach, malware, etc.
    severity = db.Column(db.String(20), nullable=False)  # low, medium, high, critical
    status = db.Column(db.String(50), default='open')  # open, investigating, resolved, closed
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    affected_systems = db.Column(db.Text)  # JSON
    affected_users = db.Column(db.Text)  # JSON
    detection_method = db.Column(db.String(100))
    source_ip = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    attack_vector = db.Column(db.String(200))
    impact_assessment = db.Column(db.Text)
    containment_actions = db.Column(db.Text)
    recovery_actions = db.Column(db.Text)
    lessons_learned = db.Column(db.Text)
    reported_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SecurityAlert(db.Model):
    """تنبيهات الأمان"""
    __tablename__ = 'security_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    alert_type = db.Column(db.String(100), nullable=False)
    severity = db.Column(db.String(20), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text)
    source_system = db.Column(db.String(100))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    ip_address = db.Column(db.String(45))
    extra_metadata = db.Column(db.Text)  # JSON
    is_acknowledged = db.Column(db.Boolean, default=False)
    acknowledged_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    acknowledged_at = db.Column(db.DateTime)
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    resolved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PermissionRole(db.Model):
    """أدوار الصلاحيات المتقدمة"""
    __tablename__ = 'permission_roles'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    display_name = db.Column(db.String(200))
    description = db.Column(db.Text)
    permissions = db.Column(db.Text)  # JSON قائمة الصلاحيات
    restrictions = db.Column(db.Text)  # JSON قيود إضافية
    is_system_role = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserPermission(db.Model):
    """صلاحيات المستخدمين"""
    __tablename__ = 'user_permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('permission_roles.id'))
    permission_name = db.Column(db.String(100))
    resource_type = db.Column(db.String(100))
    resource_id = db.Column(db.String(50))
    access_level = db.Column(db.String(50))  # read, write, delete, admin
    conditions = db.Column(db.Text)  # JSON شروط إضافية
    granted_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    granted_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    
    # العلاقات
    user = db.relationship('User', foreign_keys=[user_id], backref='permissions')
    role = db.relationship('PermissionRole', backref='user_permissions')
    granted_by_user = db.relationship('User', foreign_keys=[granted_by])

class SessionSecurity(db.Model):
    """أمان الجلسات"""
    __tablename__ = 'session_security'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_token = db.Column(db.String(255), unique=True, nullable=False)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    location = db.Column(db.String(200))
    device_fingerprint = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    is_suspicious = db.Column(db.Boolean, default=False)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User', backref='security_sessions')

# دوال مساعدة للتشفير
class EncryptionHelper:
    """مساعد التشفير"""
    
    @staticmethod
    def generate_key():
        """توليد مفتاح تشفير جديد"""
        return Fernet.generate_key()
    
    @staticmethod
    def encrypt_data(data, key):
        """تشفير البيانات"""
        if isinstance(data, str):
            data = data.encode()
        f = Fernet(key)
        return f.encrypt(data)
    
    @staticmethod
    def decrypt_data(encrypted_data, key):
        """فك تشفير البيانات"""
        f = Fernet(key)
        return f.decrypt(encrypted_data).decode()
    
    @staticmethod
    def hash_password(password, salt=None):
        """تشفير كلمة المرور"""
        if salt is None:
            salt = secrets.token_hex(16)
        
        password_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return base64.b64encode(password_hash).decode('utf-8'), salt
    
    @staticmethod
    def verify_password(password, hashed_password, salt):
        """التحقق من كلمة المرور"""
        password_hash, _ = EncryptionHelper.hash_password(password, salt)
        return password_hash == hashed_password
    
    @staticmethod
    def generate_secure_token(length=32):
        """توليد رمز آمن"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def calculate_checksum(data):
        """حساب المجموع الاختباري"""
        if isinstance(data, str):
            data = data.encode()
        return hashlib.sha256(data).hexdigest()

# فهارس لتحسين الأداء
db.Index('idx_audit_logs_user_created', AuditLog.user_id, AuditLog.created_at)
db.Index('idx_audit_logs_action_type', AuditLog.action_type)
db.Index('idx_audit_logs_resource', AuditLog.resource_type, AuditLog.resource_id)
db.Index('idx_mfa_attempts_user_created', MFAAttempt.user_id, MFAAttempt.created_at)
db.Index('idx_security_alerts_severity_created', SecurityAlert.severity, SecurityAlert.created_at)
db.Index('idx_session_security_user_active', SessionSecurity.user_id, SessionSecurity.is_active)
