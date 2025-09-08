#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Enhanced Mobile Application Models
Advanced mobile features for parents, staff, and drivers
"""

from datetime import datetime, date
from enum import Enum
import uuid
import json

# Import db from database module to avoid conflicts
from database import db

class NotificationType(Enum):
    """أنواع الإشعارات"""
    ATTENDANCE = 'attendance'
    PROGRESS = 'progress'
    APPOINTMENT = 'appointment'
    TRANSPORT = 'transport'
    EMERGENCY = 'emergency'
    GENERAL = 'general'

class AppUserType(Enum):
    """أنواع مستخدمي التطبيق"""
    PARENT = 'parent'
    TEACHER = 'teacher'
    DRIVER = 'driver'
    ADMIN = 'admin'
    THERAPIST = 'therapist'

class MobileDevice(db.Model):
    """أجهزة الهاتف المحمول المسجلة"""
    __tablename__ = 'mobile_devices'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    device_token = db.Column(db.String(500), unique=True, nullable=False)  # FCM/APNS token
    device_type = db.Column(db.String(20), nullable=False)  # ios, android
    device_model = db.Column(db.String(100))
    os_version = db.Column(db.String(50))
    app_version = db.Column(db.String(20))
    user_type = db.Column(db.Enum(AppUserType), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
    notification_settings = db.Column(db.JSON)  # إعدادات الإشعارات
    location_enabled = db.Column(db.Boolean, default=False)
    biometric_enabled = db.Column(db.Boolean, default=False)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref='mobile_devices')

class PushNotification(db.Model):
    """الإشعارات المرسلة"""
    __tablename__ = 'push_notifications'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = db.Column(db.String(36), db.ForeignKey('mobile_devices.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    notification_type = db.Column(db.Enum(NotificationType), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    data_payload = db.Column(db.JSON)  # بيانات إضافية
    priority = db.Column(db.String(20), default='normal')  # low, normal, high
    scheduled_at = db.Column(db.DateTime)  # للإشعارات المجدولة
    sent_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)
    read_at = db.Column(db.DateTime)
    is_sent = db.Column(db.Boolean, default=False)
    is_delivered = db.Column(db.Boolean, default=False)
    is_read = db.Column(db.Boolean, default=False)
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    device = db.relationship('MobileDevice', backref='notifications')
    user = db.relationship('User', backref='push_notifications')

class VideoCall(db.Model):
    """مكالمات الفيديو"""
    __tablename__ = 'video_calls'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    initiator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'))  # الطالب المعني
    call_type = db.Column(db.String(50))  # consultation, progress_review, emergency
    room_id = db.Column(db.String(100), unique=True, nullable=False)
    scheduled_at = db.Column(db.DateTime)
    started_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer)
    status = db.Column(db.String(20), default='scheduled')  # scheduled, active, ended, cancelled
    recording_url = db.Column(db.String(500))  # رابط التسجيل إن وجد
    participants = db.Column(db.JSON)  # قائمة المشاركين
    notes = db.Column(db.Text)
    quality_rating = db.Column(db.Integer)  # تقييم جودة المكالمة 1-5
    
    # Relations
    initiator = db.relationship('User', foreign_keys=[initiator_id], backref='initiated_calls')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_calls')
    student = db.relationship('Student', backref='video_calls')

class LocationTracking(db.Model):
    """تتبع المواقع (للحافلات والطوارئ)"""
    __tablename__ = 'location_tracking'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = db.Column(db.String(36), db.ForeignKey('mobile_devices.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    accuracy = db.Column(db.Float)  # دقة الموقع بالمتر
    altitude = db.Column(db.Float)
    speed = db.Column(db.Float)  # السرعة بالكيلومتر/ساعة
    heading = db.Column(db.Float)  # الاتجاه بالدرجات
    address = db.Column(db.String(500))  # العنوان المحول
    tracking_type = db.Column(db.String(50))  # bus, emergency, check_in
    is_emergency = db.Column(db.Boolean, default=False)
    battery_level = db.Column(db.Integer)  # مستوى البطارية
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    device = db.relationship('MobileDevice', backref='location_history')
    user = db.relationship('User', backref='location_tracking')

class VoiceRecording(db.Model):
    """التسجيلات الصوتية"""
    __tablename__ = 'voice_recordings'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'))
    recording_type = db.Column(db.String(50))  # note, assessment, therapy_session
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)  # حجم الملف بالبايت
    duration_seconds = db.Column(db.Integer)
    transcription = db.Column(db.Text)  # النص المحول من الصوت
    transcription_confidence = db.Column(db.Float)  # درجة الثقة في التحويل
    language = db.Column(db.String(10), default='ar')
    tags = db.Column(db.JSON)  # علامات للتصنيف
    is_processed = db.Column(db.Boolean, default=False)
    processing_status = db.Column(db.String(50))  # pending, processing, completed, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref='voice_recordings')
    student = db.relationship('Student', backref='voice_recordings')

class ARSession(db.Model):
    """جلسات الواقع المعزز"""
    __tablename__ = 'ar_sessions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    ar_content_id = db.Column(db.String(100))  # معرف المحتوى المعزز
    session_type = db.Column(db.String(50))  # skill_training, assessment, therapy
    skill_targeted = db.Column(db.String(200))  # المهارة المستهدفة
    session_start = db.Column(db.DateTime, default=datetime.utcnow)
    session_end = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer)
    interactions_count = db.Column(db.Integer, default=0)
    success_rate = db.Column(db.Float)  # معدل النجاح في التفاعلات
    engagement_level = db.Column(db.String(20))  # high, medium, low
    session_data = db.Column(db.JSON)  # بيانات الجلسة التفصيلية
    screenshots = db.Column(db.JSON)  # لقطات الشاشة
    performance_metrics = db.Column(db.JSON)  # مقاييس الأداء
    notes = db.Column(db.Text)
    
    # Relations
    student = db.relationship('Student', backref='ar_sessions')
    teacher = db.relationship('Teacher', backref='ar_sessions')

class OfflineSync(db.Model):
    """مزامنة البيانات غير المتصلة"""
    __tablename__ = 'offline_sync'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = db.Column(db.String(36), db.ForeignKey('mobile_devices.id'), nullable=False)
    data_type = db.Column(db.String(50), nullable=False)  # attendance, notes, assessments
    local_id = db.Column(db.String(100))  # المعرف المحلي في التطبيق
    data_payload = db.Column(db.JSON, nullable=False)  # البيانات المحفوظة
    sync_status = db.Column(db.String(20), default='pending')  # pending, synced, failed
    created_offline_at = db.Column(db.DateTime, nullable=False)
    synced_at = db.Column(db.DateTime)
    error_message = db.Column(db.Text)
    retry_count = db.Column(db.Integer, default=0)
    
    # Relations
    device = db.relationship('MobileDevice', backref='offline_data')

class AppFeedback(db.Model):
    """تقييمات وملاحظات التطبيق"""
    __tablename__ = 'app_feedback'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    device_id = db.Column(db.String(36), db.ForeignKey('mobile_devices.id'))
    feedback_type = db.Column(db.String(50))  # bug_report, feature_request, rating
    rating = db.Column(db.Integer)  # تقييم 1-5
    title = db.Column(db.String(200))
    description = db.Column(db.Text)
    category = db.Column(db.String(100))  # ui, performance, functionality
    app_version = db.Column(db.String(20))
    device_info = db.Column(db.JSON)
    screenshots = db.Column(db.JSON)  # لقطات شاشة للمشاكل
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    resolution_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', foreign_keys=[user_id], backref='app_feedback')
    device = db.relationship('MobileDevice', backref='feedback')
    resolver = db.relationship('User', foreign_keys=[resolved_by])

class AppAnalytics(db.Model):
    """تحليلات استخدام التطبيق"""
    __tablename__ = 'app_analytics'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = db.Column(db.String(36), db.ForeignKey('mobile_devices.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_id = db.Column(db.String(100))  # معرف جلسة الاستخدام
    screen_name = db.Column(db.String(100))  # اسم الشاشة
    action = db.Column(db.String(100))  # الإجراء المنفذ
    duration_seconds = db.Column(db.Integer)  # مدة البقاء في الشاشة
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    additional_data = db.Column(db.JSON)  # بيانات إضافية
    
    # Relations
    device = db.relationship('MobileDevice', backref='analytics')
    user = db.relationship('User', backref='app_analytics')
