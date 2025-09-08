#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات لبرامج تأهيل ذوي الاحتياجات الخاصة
Rehabilitation Programs Database Models
"""

from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, Enum, Float, JSON
from sqlalchemy.orm import relationship
from database import db
import enum

class DisabilityType(enum.Enum):
    """أنواع الإعاقة"""
    PHYSICAL = 'physical'  # حركية
    INTELLECTUAL = 'intellectual'  # ذهنية
    SENSORY = 'sensory'  # حسية
    SPEECH = 'speech'  # نطقية
    AUTISM = 'autism'  # طيف التوحد
    LEARNING = 'learning'  # صعوبات التعلم
    MULTIPLE = 'multiple'  # متعددة

class ProgramType(enum.Enum):
    """أنواع برامج التأهيل"""
    PHYSICAL_THERAPY = 'physical_therapy'  # العلاج الطبيعي
    OCCUPATIONAL_THERAPY = 'occupational_therapy'  # العلاج الوظيفي
    SPEECH_THERAPY = 'speech_therapy'  # علاج النطق والتخاطب
    BEHAVIORAL_THERAPY = 'behavioral_therapy'  # العلاج السلوكي
    EDUCATIONAL = 'educational'  # تعليمي
    VOCATIONAL = 'vocational'  # مهني
    SOCIAL = 'social'  # اجتماعي
    PSYCHOLOGICAL = 'psychological'  # نفسي

class SessionStatus(enum.Enum):
    """حالة الجلسة"""
    SCHEDULED = 'scheduled'  # مجدولة
    COMPLETED = 'completed'  # مكتملة
    CANCELLED = 'cancelled'  # ملغية
    NO_SHOW = 'no_show'  # غياب بدون إعذار

class ProgressLevel(enum.Enum):
    """مستوى التقدم"""
    POOR = 'poor'  # ضعيف
    FAIR = 'fair'  # مقبول
    GOOD = 'good'  # جيد
    VERY_GOOD = 'very_good'  # جيد جداً
    EXCELLENT = 'excellent'  # ممتاز

# Note: RehabilitationBeneficiary model is defined in comprehensive_rehabilitation_models.py to avoid table conflicts

# نموذج برنامج التأهيل
class RehabilitationProgram(db.Model):
    """برنامج التأهيل"""
    __tablename__ = 'rehabilitation_programs'
    
    id = Column(Integer, primary_key=True)
    program_code = Column(String(20), unique=True, nullable=False)  # رمز البرنامج
    name = Column(String(200), nullable=False)  # اسم البرنامج
    description = Column(Text)  # وصف البرنامج
    program_type = Column(Enum(ProgramType), nullable=False)  # نوع البرنامج
    
    # تفاصيل البرنامج
    target_disability_types = Column(JSON)  # أنواع الإعاقة المستهدفة
    age_group_min = Column(Integer)  # الحد الأدنى للعمر
    age_group_max = Column(Integer)  # الحد الأقصى للعمر
    duration_weeks = Column(Integer)  # مدة البرنامج بالأسابيع
    sessions_per_week = Column(Integer)  # عدد الجلسات في الأسبوع
    session_duration_minutes = Column(Integer)  # مدة الجلسة بالدقائق
    
    # الأهداف والمحتوى
    objectives = Column(JSON)  # أهداف البرنامج
    activities = Column(JSON)  # الأنشطة والتمارين
    assessment_methods = Column(JSON)  # طرق التقييم
    required_equipment = Column(JSON)  # المعدات المطلوبة
    
    # الموارد البشرية
    required_specialists = Column(JSON)  # الأخصائيين المطلوبين
    max_participants = Column(Integer, default=1)  # الحد الأقصى للمشاركين
    
    # معلومات إدارية
    is_active = Column(Boolean, default=True)  # نشط
    cost_per_session = Column(Float)  # تكلفة الجلسة
    notes = Column(Text)  # ملاحظات
    
    # العلاقات
    beneficiary_programs = relationship('BeneficiaryProgram', back_populates='program', cascade='all, delete-orphan')
    sessions = relationship('TherapySession', back_populates='program', cascade='all, delete-orphan')
    
    # معلومات التدقيق
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<RehabilitationProgram {self.name}>'

# نموذج ربط المستفيد بالبرنامج
class BeneficiaryProgram(db.Model):
    """ربط المستفيد بالبرنامج"""
    __tablename__ = 'beneficiary_programs'
    
    id = Column(Integer, primary_key=True)
    beneficiary_id = Column(Integer, ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    program_id = Column(Integer, ForeignKey('rehabilitation_programs.id'), nullable=False)
    
    # تفاصيل الالتحاق
    enrollment_date = Column(Date, nullable=False)  # تاريخ الالتحاق
    start_date = Column(Date)  # تاريخ البدء
    end_date = Column(Date)  # تاريخ الانتهاء
    expected_completion_date = Column(Date)  # تاريخ الانتهاء المتوقع
    
    # الحالة والتقدم
    status = Column(String(20), default='active')  # الحالة (active, completed, suspended, terminated)
    completion_percentage = Column(Float, default=0.0)  # نسبة الإنجاز
    
    # الأهداف الفردية
    individual_goals = Column(JSON)  # الأهداف الفردية
    special_considerations = Column(Text)  # اعتبارات خاصة
    
    # معلومات المتابعة
    assigned_therapist_id = Column(Integer, ForeignKey('users.id'))  # الأخصائي المكلف
    supervisor_id = Column(Integer, ForeignKey('users.id'))  # المشرف
    
    # نتائج البرنامج
    final_assessment = Column(JSON)  # التقييم النهائي
    recommendations = Column(Text)  # التوصيات
    notes = Column(Text)  # ملاحظات
    
    # العلاقات
    beneficiary = relationship('RehabilitationBeneficiary', back_populates='programs')
    program = relationship('RehabilitationProgram', back_populates='beneficiary_programs')
    assigned_therapist = relationship('User', foreign_keys=[assigned_therapist_id])
    supervisor = relationship('User', foreign_keys=[supervisor_id])
    
    # معلومات التدقيق
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<BeneficiaryProgram {self.beneficiary_id}-{self.program_id}>'

# Note: TherapySession model is defined in comprehensive_rehabilitation_models.py to avoid table conflicts

# نموذج تقييم التقدم
class ProgressAssessment(db.Model):
    """تقييم التقدم"""
    __tablename__ = 'progress_assessments'
    
    id = Column(Integer, primary_key=True)
    assessment_number = Column(String(50), nullable=False)  # رقم التقييم
    beneficiary_id = Column(Integer, ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    program_id = Column(Integer, ForeignKey('rehabilitation_programs.id'))
    
    # معلومات التقييم
    assessment_date = Column(Date, nullable=False)  # تاريخ التقييم
    assessment_type = Column(String(50))  # نوع التقييم (initial, periodic, final)
    assessor_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # المقيم
    
    # مجالات التقييم
    motor_skills = Column(JSON)  # المهارات الحركية
    cognitive_skills = Column(JSON)  # المهارات المعرفية
    communication_skills = Column(JSON)  # مهارات التواصل
    social_skills = Column(JSON)  # المهارات الاجتماعية
    daily_living_skills = Column(JSON)  # مهارات الحياة اليومية
    behavioral_aspects = Column(JSON)  # الجوانب السلوكية
    
    # النتائج والتوصيات
    overall_progress = Column(Enum(ProgressLevel))  # التقدم العام
    strengths = Column(Text)  # نقاط القوة
    areas_for_improvement = Column(Text)  # مجالات التحسين
    recommendations = Column(Text)  # التوصيات
    
    # الأهداف
    goals_achieved = Column(JSON)  # الأهداف المحققة
    new_goals = Column(JSON)  # الأهداف الجديدة
    
    # معلومات إضافية
    family_involvement = Column(Text)  # مشاركة الأسرة
    environmental_factors = Column(Text)  # العوامل البيئية
    notes = Column(Text)  # ملاحظات
    
    # العلاقات
    beneficiary = relationship('RehabilitationBeneficiary', back_populates='assessments')
    assessor = relationship('User', foreign_keys=[assessor_id])
    
    # معلومات التدقيق
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<ProgressAssessment {self.assessment_number}>'

# Note: Therapist model is defined in comprehensive_rehabilitation_models.py to avoid table conflicts

# نموذج المعدات والأدوات
class Equipment(db.Model):
    """المعدات والأدوات"""
    __tablename__ = 'rehabilitation_equipment'
    
    id = Column(Integer, primary_key=True)
    equipment_code = Column(String(50), unique=True, nullable=False)  # رمز المعدة
    name = Column(String(200), nullable=False)  # اسم المعدة
    description = Column(Text)  # وصف المعدة
    category = Column(String(100))  # فئة المعدة
    
    # معلومات المعدة
    manufacturer = Column(String(100))  # الشركة المصنعة
    model = Column(String(100))  # الموديل
    serial_number = Column(String(100))  # الرقم التسلسلي
    purchase_date = Column(Date)  # تاريخ الشراء
    purchase_cost = Column(Float)  # تكلفة الشراء
    
    # الحالة والصيانة
    condition = Column(String(20), default='good')  # الحالة (excellent, good, fair, poor)
    last_maintenance_date = Column(Date)  # تاريخ آخر صيانة
    next_maintenance_date = Column(Date)  # تاريخ الصيانة القادمة
    maintenance_notes = Column(Text)  # ملاحظات الصيانة
    
    # الاستخدام
    location = Column(String(100))  # الموقع
    is_available = Column(Boolean, default=True)  # متاح للاستخدام
    usage_instructions = Column(Text)  # تعليمات الاستخدام
    safety_precautions = Column(Text)  # احتياطات السلامة
    
    # معلومات إضافية
    warranty_expiry_date = Column(Date)  # تاريخ انتهاء الضمان
    supplier_contact = Column(JSON)  # معلومات المورد
    notes = Column(Text)  # ملاحظات
    
    # معلومات التدقيق
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<Equipment {self.name}>'

# نموذج الموارد التعليمية
class EducationalResource(db.Model):
    """الموارد التعليمية"""
    __tablename__ = 'educational_resources'
    
    id = Column(Integer, primary_key=True)
    resource_code = Column(String(50), unique=True, nullable=False)  # رمز المورد
    title = Column(String(200), nullable=False)  # عنوان المورد
    description = Column(Text)  # وصف المورد
    resource_type = Column(String(50))  # نوع المورد (video, document, game, app)
    
    # محتوى المورد
    content_url = Column(String(500))  # رابط المحتوى
    file_path = Column(String(500))  # مسار الملف
    thumbnail_path = Column(String(500))  # مسار الصورة المصغرة
    
    # التصنيف والاستهداف
    target_disability_types = Column(JSON)  # أنواع الإعاقة المستهدفة
    target_age_group = Column(String(50))  # الفئة العمرية المستهدفة
    difficulty_level = Column(String(20))  # مستوى الصعوبة
    skills_targeted = Column(JSON)  # المهارات المستهدفة
    
    # معلومات الاستخدام
    usage_instructions = Column(Text)  # تعليمات الاستخدام
    learning_objectives = Column(JSON)  # الأهداف التعليمية
    assessment_criteria = Column(JSON)  # معايير التقييم
    
    # التقييم والمراجعة
    rating = Column(Float)  # التقييم
    reviews_count = Column(Integer, default=0)  # عدد المراجعات
    is_approved = Column(Boolean, default=False)  # معتمد
    
    # معلومات إضافية
    author = Column(String(100))  # المؤلف
    source = Column(String(200))  # المصدر
    language = Column(String(20), default='ar')  # اللغة
    tags = Column(JSON)  # العلامات
    notes = Column(Text)  # ملاحظات
    
    # معلومات التدقيق
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<EducationalResource {self.title}>'
