#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Biometric Authentication System Models
Advanced security with fingerprint, face, and voice recognition
"""

from datetime import datetime, timedelta
from enum import Enum
import uuid
import json
import hashlib

# Import db from database module to avoid conflicts
from database import db

class BiometricType(Enum):
    """أنواع المصادقة البيومترية"""
    FINGERPRINT = 'fingerprint'
    FACE = 'face'
    VOICE = 'voice'
    IRIS = 'iris'

class AuthenticationStatus(Enum):
    """حالة المصادقة"""
    SUCCESS = 'success'
    FAILED = 'failed'
    BLOCKED = 'blocked'
    PENDING = 'pending'

class BiometricTemplate(db.Model):
    """قوالب البيانات البيومترية"""
    __tablename__ = 'biometric_templates'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    biometric_type = db.Column(db.Enum(BiometricType), nullable=False)
    template_data = db.Column(db.LargeBinary, nullable=False)  # البيانات المشفرة
    template_hash = db.Column(db.String(256), nullable=False)  # هاش للتحقق
    quality_score = db.Column(db.Float)  # جودة القالب 0-100
    enrollment_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_used = db.Column(db.DateTime)
    usage_count = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    device_info = db.Column(db.JSON)  # معلومات الجهاز المستخدم
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref='biometric_templates')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('user_id', 'biometric_type', name='unique_user_biometric'),)

class BiometricAuthLog(db.Model):
    """سجل محاولات المصادقة البيومترية"""
    __tablename__ = 'biometric_auth_logs'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    template_id = db.Column(db.String(36), db.ForeignKey('biometric_templates.id'))
    biometric_type = db.Column(db.Enum(BiometricType), nullable=False)
    status = db.Column(db.Enum(AuthenticationStatus), nullable=False)
    confidence_score = db.Column(db.Float)  # درجة الثقة في المطابقة
    attempt_time = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    device_fingerprint = db.Column(db.String(256))
    location_data = db.Column(db.JSON)  # معلومات الموقع
    failure_reason = db.Column(db.String(200))  # سبب الفشل
    processing_time = db.Column(db.Float)  # وقت المعالجة بالثواني
    
    # Relations
    user = db.relationship('User', backref='auth_logs')
    template = db.relationship('BiometricTemplate', backref='auth_logs')

class SecurityAlert(db.Model):
    """تنبيهات الأمان"""
    __tablename__ = 'security_alerts'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    alert_type = db.Column(db.String(50), nullable=False)  # multiple_failures, suspicious_location, etc.
    severity = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    alert_data = db.Column(db.JSON)  # بيانات إضافية
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    resolved_at = db.Column(db.DateTime)
    resolution_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', foreign_keys=[user_id], backref='security_alerts')
    resolver = db.relationship('User', foreign_keys=[resolved_by])

class DeviceRegistration(db.Model):
    """تسجيل الأجهزة الموثوقة"""
    __tablename__ = 'device_registrations'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    device_fingerprint = db.Column(db.String(256), nullable=False, unique=True)
    device_name = db.Column(db.String(200))
    device_type = db.Column(db.String(50))  # mobile, desktop, tablet
    os_info = db.Column(db.String(200))
    browser_info = db.Column(db.String(200))
    is_trusted = db.Column(db.Boolean, default=False)
    trust_score = db.Column(db.Float, default=0.0)  # درجة الثقة 0-100
    first_seen = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    usage_count = db.Column(db.Integer, default=1)
    location_history = db.Column(db.JSON)  # تاريخ المواقع
    is_active = db.Column(db.Boolean, default=True)
    
    # Relations
    user = db.relationship('User', backref='registered_devices')

class BiometricSettings(db.Model):
    """إعدادات المصادقة البيومترية"""
    __tablename__ = 'biometric_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    fingerprint_enabled = db.Column(db.Boolean, default=False)
    face_enabled = db.Column(db.Boolean, default=False)
    voice_enabled = db.Column(db.Boolean, default=False)
    iris_enabled = db.Column(db.Boolean, default=False)
    require_biometric = db.Column(db.Boolean, default=False)  # إجبارية المصادقة البيومترية
    fallback_to_password = db.Column(db.Boolean, default=True)  # السماح بكلمة المرور كبديل
    max_attempts = db.Column(db.Integer, default=3)  # عدد المحاولات المسموحة
    lockout_duration = db.Column(db.Integer, default=300)  # مدة الحظر بالثواني
    confidence_threshold = db.Column(db.Float, default=0.8)  # حد الثقة المطلوب
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref='biometric_settings', uselist=False)

class BiometricAudit(db.Model):
    """مراجعة أنشطة المصادقة البيومترية"""
    __tablename__ = 'biometric_audits'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(100), nullable=False)  # enroll, authenticate, update, delete
    biometric_type = db.Column(db.Enum(BiometricType))
    success = db.Column(db.Boolean, nullable=False)
    details = db.Column(db.JSON)  # تفاصيل العملية
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id'))  # من قام بالعملية
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', foreign_keys=[user_id], backref='biometric_audits')
    performer = db.relationship('User', foreign_keys=[performed_by])
