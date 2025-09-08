#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Augmented Reality and Virtual Reality Models
AR/VR experiences for special needs education and therapy
"""

from datetime import datetime, date
from enum import Enum
import uuid
import json

# Import db from database module to avoid conflicts
from database import db

class ExperienceType(Enum):
    """أنواع التجارب"""
    AUGMENTED_REALITY = 'ar'
    VIRTUAL_REALITY = 'vr'
    MIXED_REALITY = 'mr'

class ContentCategory(Enum):
    """فئات المحتوى"""
    EDUCATIONAL = 'educational'
    THERAPEUTIC = 'therapeutic'
    SOCIAL_SKILLS = 'social_skills'
    LIFE_SKILLS = 'life_skills'
    MOTOR_SKILLS = 'motor_skills'
    COMMUNICATION = 'communication'

class InteractionType(Enum):
    """أنواع التفاعل"""
    GAZE = 'gaze'
    GESTURE = 'gesture'
    VOICE = 'voice'
    TOUCH = 'touch'
    CONTROLLER = 'controller'

class ARVRContent(db.Model):
    """محتوى الواقع المعزز والافتراضي"""
    __tablename__ = 'ar_vr_content'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title_ar = db.Column(db.String(200), nullable=False)
    title_en = db.Column(db.String(200))
    description_ar = db.Column(db.Text)
    description_en = db.Column(db.Text)
    experience_type = db.Column(db.Enum(ExperienceType), nullable=False)
    category = db.Column(db.Enum(ContentCategory), nullable=False)
    target_age_min = db.Column(db.Integer)
    target_age_max = db.Column(db.Integer)
    target_disabilities = db.Column(db.JSON)  # أنواع الإعاقات المستهدفة
    learning_objectives = db.Column(db.JSON)  # الأهداف التعليمية
    content_path = db.Column(db.String(500), nullable=False)  # مسار الملفات
    thumbnail_url = db.Column(db.String(500))
    preview_video_url = db.Column(db.String(500))
    duration_minutes = db.Column(db.Integer)
    difficulty_level = db.Column(db.String(20), default='beginner')
    supported_devices = db.Column(db.JSON)  # الأجهزة المدعومة
    interaction_types = db.Column(db.JSON)  # أنواع التفاعل المدعومة
    accessibility_features = db.Column(db.JSON)  # ميزات إمكانية الوصول
    safety_guidelines = db.Column(db.JSON)  # إرشادات الأمان
    file_size_mb = db.Column(db.Integer)
    version = db.Column(db.String(20), default='1.0')
    is_active = db.Column(db.Boolean, default=True)
    requires_supervision = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    sessions = db.relationship('ARVRSession', backref='content', lazy=True)

class ARVRSession(db.Model):
    """جلسات الواقع المعزز والافتراضي"""
    __tablename__ = 'ar_vr_sessions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    content_id = db.Column(db.String(36), db.ForeignKey('ar_vr_content.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    supervisor_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    device_used = db.Column(db.String(100))  # نوع الجهاز المستخدم
    session_start = db.Column(db.DateTime, default=datetime.utcnow)
    session_end = db.Column(db.DateTime)
    duration_seconds = db.Column(db.Integer)
    completion_percentage = db.Column(db.Float, default=0.0)
    objectives_achieved = db.Column(db.JSON)  # الأهداف المحققة
    interaction_data = db.Column(db.JSON)  # بيانات التفاعل التفصيلية
    performance_metrics = db.Column(db.JSON)  # مقاييس الأداء
    comfort_level = db.Column(db.String(20))  # مستوى الراحة
    motion_sickness = db.Column(db.Boolean, default=False)  # دوار الحركة
    engagement_score = db.Column(db.Float)  # درجة التفاعل 0-100
    learning_progress = db.Column(db.JSON)  # تقدم التعلم
    behavioral_observations = db.Column(db.Text)  # ملاحظات سلوكية
    technical_issues = db.Column(db.JSON)  # مشاكل تقنية
    session_notes = db.Column(db.Text)
    
    # Relations
    student = db.relationship('Student', backref='ar_vr_sessions')
    supervisor = db.relationship('Teacher', backref='supervised_ar_vr_sessions')
    interactions = db.relationship('ARVRInteraction', backref='session', lazy=True)

class ARVRInteraction(db.Model):
    """تفاعلات الواقع المعزز والافتراضي"""
    __tablename__ = 'ar_vr_interactions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = db.Column(db.String(36), db.ForeignKey('ar_vr_sessions.id'), nullable=False)
    interaction_type = db.Column(db.Enum(InteractionType), nullable=False)
    object_interacted = db.Column(db.String(200))  # الكائن المتفاعل معه
    action_performed = db.Column(db.String(100))  # الإجراء المنفذ
    position_x = db.Column(db.Float)  # موقع التفاعل في الفضاء ثلاثي الأبعاد
    position_y = db.Column(db.Float)
    position_z = db.Column(db.Float)
    head_rotation = db.Column(db.JSON)  # دوران الرأس
    hand_position = db.Column(db.JSON)  # موقع اليد
    gaze_direction = db.Column(db.JSON)  # اتجاه النظر
    interaction_duration = db.Column(db.Float)  # مدة التفاعل بالثواني
    success = db.Column(db.Boolean)  # نجح التفاعل أم لا
    accuracy = db.Column(db.Float)  # دقة التفاعل
    response_time = db.Column(db.Float)  # وقت الاستجابة
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    extra_metadata = db.Column(db.JSON)  # معلومات إضافية

class VirtualEnvironment(db.Model):
    """البيئات الافتراضية"""
    __tablename__ = 'virtual_environments'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name_ar = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200))
    description_ar = db.Column(db.Text)
    description_en = db.Column(db.Text)
    environment_type = db.Column(db.String(50))  # classroom, home, playground, clinic
    realism_level = db.Column(db.String(20))  # realistic, stylized, abstract
    interactive_objects = db.Column(db.JSON)  # الكائنات التفاعلية
    navigation_type = db.Column(db.String(50))  # teleport, walk, fly
    physics_enabled = db.Column(db.Boolean, default=True)
    audio_environment = db.Column(db.JSON)  # البيئة الصوتية
    lighting_conditions = db.Column(db.JSON)  # ظروف الإضاءة
    weather_effects = db.Column(db.JSON)  # تأثيرات الطقس
    safety_boundaries = db.Column(db.JSON)  # حدود الأمان
    customization_options = db.Column(db.JSON)  # خيارات التخصيص
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ARMarker(db.Model):
    """علامات الواقع المعزز"""
    __tablename__ = 'ar_markers'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    marker_name = db.Column(db.String(200), nullable=False)
    marker_type = db.Column(db.String(50))  # image, qr_code, object, face
    marker_data = db.Column(db.LargeBinary)  # بيانات العلامة
    associated_content = db.Column(db.JSON)  # المحتوى المرتبط
    trigger_distance = db.Column(db.Float)  # مسافة التفعيل بالمتر
    activation_angle = db.Column(db.Float)  # زاوية التفعيل
    tracking_quality = db.Column(db.String(20))  # high, medium, low
    is_persistent = db.Column(db.Boolean, default=False)  # هل تبقى مرئية
    usage_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class TherapyScenario(db.Model):
    """سيناريوهات العلاج في VR"""
    __tablename__ = 'therapy_scenarios'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name_ar = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200))
    therapy_type = db.Column(db.String(100))  # exposure, social_skills, phobia, anxiety
    target_condition = db.Column(db.String(100))  # autism, adhd, anxiety, phobia
    scenario_description = db.Column(db.Text)
    difficulty_progression = db.Column(db.JSON)  # تدرج الصعوبة
    success_criteria = db.Column(db.JSON)  # معايير النجاح
    safety_protocols = db.Column(db.JSON)  # بروتوكولات الأمان
    therapist_controls = db.Column(db.JSON)  # تحكمات المعالج
    data_collection = db.Column(db.JSON)  # البيانات المجمعة
    adaptation_rules = db.Column(db.JSON)  # قواعد التكيف
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class DeviceCalibration(db.Model):
    """معايرة الأجهزة"""
    __tablename__ = 'device_calibrations'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = db.Column(db.String(100), nullable=False)
    device_type = db.Column(db.String(50))  # hmd, controller, tracker
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    calibration_data = db.Column(db.JSON, nullable=False)  # بيانات المعايرة
    ipd_measurement = db.Column(db.Float)  # المسافة بين البؤبؤين
    height_adjustment = db.Column(db.Float)  # تعديل الارتفاع
    tracking_area = db.Column(db.JSON)  # منطقة التتبع
    comfort_settings = db.Column(db.JSON)  # إعدادات الراحة
    calibration_quality = db.Column(db.String(20))  # excellent, good, fair, poor
    calibrated_at = db.Column(db.DateTime, default=datetime.utcnow)
    calibrated_by = db.Column(db.String(100))
    
    # Relations
    user = db.relationship('User', backref='device_calibrations')

class ARVRAnalytics(db.Model):
    """تحليلات الواقع المعزز والافتراضي"""
    __tablename__ = 'ar_vr_analytics'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    content_id = db.Column(db.String(36), db.ForeignKey('ar_vr_content.id'))
    date = db.Column(db.Date, nullable=False)
    total_sessions = db.Column(db.Integer, default=0)
    unique_users = db.Column(db.Integer, default=0)
    avg_session_duration = db.Column(db.Float)  # بالدقائق
    avg_completion_rate = db.Column(db.Float)  # معدل الإكمال
    avg_engagement_score = db.Column(db.Float)
    motion_sickness_incidents = db.Column(db.Integer, default=0)
    technical_issues_count = db.Column(db.Integer, default=0)
    user_satisfaction = db.Column(db.Float)  # متوسط الرضا
    learning_effectiveness = db.Column(db.Float)  # فعالية التعلم
    popular_interactions = db.Column(db.JSON)  # التفاعلات الشائعة
    improvement_areas = db.Column(db.JSON)  # مجالات التحسين
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    content = db.relationship('ARVRContent', backref='analytics')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('content_id', 'date', name='unique_content_daily_analytics'),)
