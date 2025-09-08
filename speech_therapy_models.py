#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات لنظام برامج النطق والتخاطب
Speech Therapy Programs Database Models
"""

# SQLAlchemy import removed - using centralized db instance
from datetime import datetime, date
from sqlalchemy import CheckConstraint, text
from database import db
import enum
import json

# تعدادات النظام
class SpeechDisorderType(enum.Enum):
    """أنواع اضطرابات النطق والتخاطب"""
    ARTICULATION = 'articulation'  # اضطرابات النطق
    FLUENCY = 'fluency'  # اضطرابات الطلاقة
    VOICE = 'voice'  # اضطرابات الصوت
    LANGUAGE = 'language'  # اضطرابات اللغة
    HEARING = 'hearing'  # اضطرابات السمع
    SWALLOWING = 'swallowing'  # اضطرابات البلع
    COGNITIVE = 'cognitive'  # اضطرابات معرفية
    AUTISM_SPECTRUM = 'autism_spectrum'  # طيف التوحد
    DEVELOPMENTAL_DELAY = 'developmental_delay'  # تأخر نمائي

class SeverityLevel(enum.Enum):
    """مستويات الشدة"""
    MILD = 'mild'  # خفيف
    MODERATE = 'moderate'  # متوسط
    SEVERE = 'severe'  # شديد
    PROFOUND = 'profound'  # شديد جداً

class TherapyType(enum.Enum):
    """أنواع العلاج"""
    INDIVIDUAL = 'individual'  # فردي
    GROUP = 'group'  # جماعي
    FAMILY = 'family'  # عائلي
    INTENSIVE = 'intensive'  # مكثف

class SessionStatus(enum.Enum):
    """حالة الجلسة"""
    SCHEDULED = 'scheduled'  # مجدولة
    COMPLETED = 'completed'  # مكتملة
    CANCELLED = 'cancelled'  # ملغية
    NO_SHOW = 'no_show'  # غياب
    RESCHEDULED = 'rescheduled'  # معاد جدولتها

class AssessmentType(enum.Enum):
    """أنواع التقييم"""
    INITIAL = 'initial'  # تقييم أولي
    PROGRESS = 'progress'  # تقييم تقدم
    FINAL = 'final'  # تقييم نهائي
    DIAGNOSTIC = 'diagnostic'  # تقييم تشخيصي

class GoalStatus(enum.Enum):
    """حالة الهدف"""
    NOT_STARTED = 'not_started'  # لم يبدأ
    IN_PROGRESS = 'in_progress'  # قيد التنفيذ
    ACHIEVED = 'achieved'  # محقق
    PARTIALLY_ACHIEVED = 'partially_achieved'  # محقق جزئياً
    NOT_ACHIEVED = 'not_achieved'  # غير محقق

# نموذج المستفيدين من برامج النطق
class SpeechClient(db.Model):
    __tablename__ = 'speech_clients'
    
    id = db.Column(db.Integer, primary_key=True)
    client_number = db.Column(db.String(50), unique=True, nullable=False)
    
    # المعلومات الشخصية
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    arabic_name = db.Column(db.String(200))
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    national_id = db.Column(db.String(20), unique=True)
    
    # معلومات الاتصال
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    
    # معلومات طبية
    medical_history = db.Column(db.Text)
    current_medications = db.Column(db.JSON)
    allergies = db.Column(db.JSON)
    
    # معلومات ولي الأمر
    guardian_name = db.Column(db.String(200))
    guardian_relationship = db.Column(db.String(50))
    guardian_phone = db.Column(db.String(20))
    guardian_email = db.Column(db.String(120))
    
    # معلومات إضافية
    referral_source = db.Column(db.String(200))
    insurance_info = db.Column(db.JSON)
    emergency_contact = db.Column(db.JSON)
    
    # حالة المستفيد
    is_active = db.Column(db.Boolean, default=True)
    enrollment_date = db.Column(db.Date, default=date.today)
    discharge_date = db.Column(db.Date)
    discharge_reason = db.Column(db.Text)
    
    # معلومات التدقيق
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    assessments = db.relationship('SpeechAssessment', backref='client', lazy=True)
    therapy_plans = db.relationship('TherapyPlan', backref='client', lazy=True)
    sessions = db.relationship('TherapySession', backref='client', lazy=True)
    
    @property
    def age(self):
        """حساب العمر"""
        today = date.today()
        return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
    
    @property
    def full_name(self):
        """الاسم الكامل"""
        return f"{self.first_name} {self.last_name}"

# نموذج التقييمات
class SpeechAssessment(db.Model):
    __tablename__ = 'speech_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_number = db.Column(db.String(50), unique=True, nullable=False)
    
    # معلومات التقييم
    client_id = db.Column(db.Integer, db.ForeignKey('speech_clients.id'), nullable=False)
    therapist_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_type = db.Column(db.Enum(AssessmentType), nullable=False)
    assessment_date = db.Column(db.Date, nullable=False)
    
    # التشخيص
    primary_disorder = db.Column(db.Enum(SpeechDisorderType), nullable=False)
    secondary_disorders = db.Column(db.JSON)
    severity_level = db.Column(db.Enum(SeverityLevel), nullable=False)
    
    # نتائج التقييم
    assessment_tools = db.Column(db.JSON)
    test_results = db.Column(db.JSON)
    observations = db.Column(db.Text)
    
    # التقييم التفصيلي
    articulation_score = db.Column(db.Float)
    language_comprehension = db.Column(db.Float)
    language_expression = db.Column(db.Float)
    fluency_score = db.Column(db.Float)
    voice_quality = db.Column(db.Float)
    
    # التوصيات
    recommendations = db.Column(db.Text)
    therapy_frequency = db.Column(db.String(100))
    therapy_duration = db.Column(db.String(100))
    
    # الملفات المرفقة
    audio_recordings = db.Column(db.JSON)
    video_recordings = db.Column(db.JSON)
    documents = db.Column(db.JSON)
    
    # معلومات التدقيق
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    therapist = db.relationship('User', foreign_keys=[therapist_id], backref='speech_assessments')

# نموذج الخطط العلاجية
class TherapyPlan(db.Model):
    __tablename__ = 'therapy_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_number = db.Column(db.String(50), unique=True, nullable=False)
    
    # معلومات الخطة
    client_id = db.Column(db.Integer, db.ForeignKey('speech_clients.id'), nullable=False)
    therapist_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_id = db.Column(db.Integer, db.ForeignKey('speech_assessments.id'))
    
    # تفاصيل الخطة
    plan_title = db.Column(db.String(200), nullable=False)
    plan_description = db.Column(db.Text)
    therapy_type = db.Column(db.Enum(TherapyType), nullable=False)
    
    # التوقيتات
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    estimated_duration_weeks = db.Column(db.Integer)
    sessions_per_week = db.Column(db.Integer, default=2)
    session_duration_minutes = db.Column(db.Integer, default=45)
    
    # الأهداف العامة
    long_term_goals = db.Column(db.Text)
    short_term_goals = db.Column(db.Text)
    
    # طرق العلاج
    therapy_methods = db.Column(db.JSON)
    materials_needed = db.Column(db.JSON)
    home_exercises = db.Column(db.Text)
    
    # حالة الخطة
    is_active = db.Column(db.Boolean, default=True)
    completion_percentage = db.Column(db.Float, default=0.0)
    
    # معلومات التدقيق
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    therapist = db.relationship('User', foreign_keys=[therapist_id], backref='therapy_plans')
    assessment = db.relationship('SpeechAssessment', backref='therapy_plans')
    goals = db.relationship('TherapyGoal', backref='therapy_plan', lazy=True)
    sessions = db.relationship('TherapySession', backref='therapy_plan', lazy=True)

# نموذج الأهداف العلاجية
class TherapyGoal(db.Model):
    __tablename__ = 'therapy_goals'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات الهدف
    therapy_plan_id = db.Column(db.Integer, db.ForeignKey('therapy_plans.id'), nullable=False)
    goal_number = db.Column(db.String(20))
    goal_title = db.Column(db.String(200), nullable=False)
    goal_description = db.Column(db.Text)
    
    # تصنيف الهدف
    goal_category = db.Column(db.String(100))
    target_skill = db.Column(db.String(200))
    
    # معايير النجاح
    success_criteria = db.Column(db.Text)
    target_accuracy = db.Column(db.Float)
    measurement_method = db.Column(db.String(200))
    
    # التوقيتات
    target_date = db.Column(db.Date)
    priority_level = db.Column(db.Integer, default=1)
    
    # حالة الهدف
    status = db.Column(db.Enum(GoalStatus), default=GoalStatus.NOT_STARTED)
    current_accuracy = db.Column(db.Float, default=0.0)
    progress_notes = db.Column(db.Text)
    
    # معلومات التدقيق
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))

# Note: TherapySession model is defined in comprehensive_rehabilitation_models.py to avoid table conflicts

# نموذج الأخصائيين
class SpeechTherapist(db.Model):
    __tablename__ = 'speech_therapists'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # المؤهلات المهنية
    license_number = db.Column(db.String(100), unique=True)
    license_expiry = db.Column(db.Date)
    certifications = db.Column(db.JSON)
    specializations = db.Column(db.JSON)
    
    # الخبرة
    years_of_experience = db.Column(db.Integer)
    education_background = db.Column(db.JSON)
    previous_experience = db.Column(db.Text)
    
    # معلومات العمل
    employment_date = db.Column(db.Date)
    employment_status = db.Column(db.String(50))
    work_schedule = db.Column(db.JSON)
    
    # الإعدادات
    max_clients_per_day = db.Column(db.Integer, default=8)
    preferred_age_groups = db.Column(db.JSON)
    therapy_approaches = db.Column(db.JSON)
    
    # معلومات التدقيق
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    user = db.relationship('User', backref='speech_therapist_profile')

# نموذج الأدوات والمواد العلاجية
class TherapyMaterial(db.Model):
    __tablename__ = 'therapy_materials'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات المادة
    material_code = db.Column(db.String(50), unique=True, nullable=False)
    material_name = db.Column(db.String(200), nullable=False)
    material_type = db.Column(db.String(100))
    category = db.Column(db.String(100))
    
    # الوصف والاستخدام
    description = db.Column(db.Text)
    target_disorders = db.Column(db.JSON)
    age_range = db.Column(db.String(50))
    difficulty_level = db.Column(db.String(50))
    
    # معلومات المخزون
    quantity_available = db.Column(db.Integer, default=0)
    location = db.Column(db.String(200))
    condition_status = db.Column(db.String(50))
    
    # معلومات الشراء
    purchase_date = db.Column(db.Date)
    cost = db.Column(db.Float)
    supplier = db.Column(db.String(200))
    
    # الملفات المرفقة
    images = db.Column(db.JSON)
    instruction_manual = db.Column(db.String(500))
    
    # حالة المادة
    is_active = db.Column(db.Boolean, default=True)
    
    # معلومات التدقيق
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
