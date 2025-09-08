#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات لنظام التأهيل الشامل لذوي الإعاقة
Comprehensive Disability Rehabilitation System Models
"""

from datetime import datetime, date, timedelta
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, Enum, Float, JSON, Time
from sqlalchemy.orm import relationship
from database import db
import enum
import uuid

class DisabilityCategory(enum.Enum):
    """فئات الإعاقة الرئيسية"""
    PHYSICAL = 'physical'  # حركية
    INTELLECTUAL = 'intellectual'  # ذهنية/فكرية
    SENSORY = 'sensory'  # حسية (بصرية/سمعية)
    SPEECH_LANGUAGE = 'speech_language'  # نطق ولغة
    AUTISM_SPECTRUM = 'autism_spectrum'  # طيف التوحد
    LEARNING_DIFFICULTIES = 'learning_difficulties'  # صعوبات التعلم
    BEHAVIORAL = 'behavioral'  # سلوكية
    MULTIPLE = 'multiple'  # متعددة
    RARE_DISEASES = 'rare_diseases'  # أمراض نادرة

class SeverityLevel(enum.Enum):
    """مستوى شدة الإعاقة"""
    MILD = 'mild'  # بسيطة
    MODERATE = 'moderate'  # متوسطة
    SEVERE = 'severe'  # شديدة
    PROFOUND = 'profound'  # شديدة جداً

class TherapyType(enum.Enum):
    """أنواع العلاج"""
    PHYSICAL_THERAPY = 'physical_therapy'  # علاج طبيعي
    OCCUPATIONAL_THERAPY = 'occupational_therapy'  # علاج وظيفي
    SPEECH_THERAPY = 'speech_therapy'  # علاج نطق
    BEHAVIORAL_THERAPY = 'behavioral_therapy'  # علاج سلوكي
    COGNITIVE_THERAPY = 'cognitive_therapy'  # علاج معرفي
    SENSORY_INTEGRATION = 'sensory_integration'  # تكامل حسي
    MUSIC_THERAPY = 'music_therapy'  # علاج بالموسيقى
    ART_THERAPY = 'art_therapy'  # علاج بالفن
    AQUATIC_THERAPY = 'aquatic_therapy'  # علاج مائي
    PSYCHOLOGICAL_THERAPY = 'psychological_therapy'  # علاج نفسي

class AssessmentType(enum.Enum):
    """أنواع التقييم"""
    INITIAL = 'initial'  # تقييم أولي
    PERIODIC = 'periodic'  # تقييم دوري
    PROGRESS = 'progress'  # تقييم تقدم
    FINAL = 'final'  # تقييم نهائي
    EMERGENCY = 'emergency'  # تقييم طارئ

class SessionStatus(enum.Enum):
    """حالة الجلسة"""
    SCHEDULED = 'scheduled'  # مجدولة
    IN_PROGRESS = 'in_progress'  # جارية
    COMPLETED = 'completed'  # مكتملة
    CANCELLED = 'cancelled'  # ملغية
    NO_SHOW = 'no_show'  # غياب
    RESCHEDULED = 'rescheduled'  # معاد جدولتها

class ProgressStatus(enum.Enum):
    """حالة التقدم"""
    EXCELLENT = 'excellent'  # ممتاز
    GOOD = 'good'  # جيد
    SATISFACTORY = 'satisfactory'  # مرضي
    NEEDS_IMPROVEMENT = 'needs_improvement'  # يحتاج تحسين
    POOR = 'poor'  # ضعيف

# نموذج المستفيد الشامل
class RehabilitationBeneficiary(db.Model):
    __tablename__ = 'rehabilitation_beneficiaries'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_code = db.Column(db.String(50), unique=True, nullable=False)
    
    # المعلومات الشخصية
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    arabic_name = db.Column(db.String(200))
    national_id = db.Column(db.String(20), unique=True)
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    nationality = db.Column(db.String(50))
    
    # معلومات الاتصال
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    address = db.Column(db.Text)
    city = db.Column(db.String(50))
    postal_code = db.Column(db.String(10))
    
    # معلومات الإعاقة
    primary_disability = db.Column(db.Enum(DisabilityCategory), nullable=False)
    secondary_disabilities = db.Column(JSON)  # قائمة بالإعاقات الثانوية
    severity_level = db.Column(db.Enum(SeverityLevel), nullable=False)
    diagnosis_date = db.Column(db.Date)
    medical_diagnosis = db.Column(db.Text)
    
    # المعلومات الطبية
    medical_history = db.Column(db.Text)
    current_medications = db.Column(JSON)
    allergies = db.Column(db.Text)
    emergency_contact_name = db.Column(db.String(100))
    emergency_contact_phone = db.Column(db.String(20))
    emergency_contact_relation = db.Column(db.String(50))
    
    # معلومات التسجيل
    registration_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='active')
    notes = db.Column(db.Text)
    created_by = db.Column(db.String(100))
    
    # العلاقات
    assessments = db.relationship('ComprehensiveAssessment', backref='beneficiary', lazy=True)
    rehabilitation_plans = db.relationship('IndividualRehabilitationPlan', backref='beneficiary', lazy=True)
    therapy_sessions = db.relationship('TherapySession', backref='beneficiary', lazy=True)
    progress_records = db.relationship('ProgressRecord', backref='beneficiary', lazy=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.beneficiary_code:
            self.beneficiary_code = self.generate_beneficiary_code()
    
    def generate_beneficiary_code(self):
        """توليد رمز المستفيد"""
        year = datetime.now().year
        count = RehabilitationBeneficiary.query.count() + 1
        return f"RB{year}{count:04d}"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def age(self):
        if self.date_of_birth:
            return (date.today() - self.date_of_birth).days // 365
        return None

# نموذج التقييم الشامل
class ComprehensiveAssessment(db.Model):
    __tablename__ = 'comprehensive_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_code = db.Column(db.String(50), unique=True, nullable=False)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    
    assessment_type = db.Column(db.Enum(AssessmentType), nullable=False)
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    assessor_name = db.Column(db.String(100), nullable=False)
    assessor_title = db.Column(db.String(100))
    
    # التقييم الحركي
    motor_skills_score = db.Column(db.Float)
    gross_motor_skills = db.Column(JSON)
    fine_motor_skills = db.Column(JSON)
    mobility_assessment = db.Column(db.Text)
    
    # التقييم المعرفي
    cognitive_score = db.Column(db.Float)
    attention_span = db.Column(db.String(50))
    memory_skills = db.Column(db.String(50))
    problem_solving = db.Column(db.String(50))
    academic_skills = db.Column(JSON)
    
    # التقييم اللغوي والتواصلي
    communication_score = db.Column(db.Float)
    receptive_language = db.Column(db.String(50))
    expressive_language = db.Column(db.String(50))
    speech_clarity = db.Column(db.String(50))
    social_communication = db.Column(db.String(50))
    
    # التقييم الاجتماعي والسلوكي
    social_skills_score = db.Column(db.Float)
    behavioral_assessment = db.Column(db.Text)
    adaptive_behavior = db.Column(JSON)
    challenging_behaviors = db.Column(db.Text)
    
    # التقييم الحسي
    sensory_score = db.Column(db.Float)
    visual_assessment = db.Column(db.Text)
    auditory_assessment = db.Column(db.Text)
    tactile_sensitivity = db.Column(db.Text)
    
    # مهارات الحياة اليومية
    daily_living_score = db.Column(db.Float)
    self_care_skills = db.Column(JSON)
    domestic_skills = db.Column(JSON)
    community_skills = db.Column(JSON)
    
    # التوصيات والأهداف
    recommendations = db.Column(db.Text)
    priority_areas = db.Column(JSON)
    suggested_therapies = db.Column(JSON)
    
    # معلومات إضافية
    assessment_duration = db.Column(db.Integer)  # بالدقائق
    next_assessment_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.assessment_code:
            self.assessment_code = self.generate_assessment_code()
    
    def generate_assessment_code(self):
        """توليد رمز التقييم"""
        year = datetime.now().year
        month = datetime.now().month
        count = ComprehensiveAssessment.query.count() + 1
        return f"ASS{year}{month:02d}{count:04d}"

# نموذج الخطة الفردية للتأهيل
class IndividualRehabilitationPlan(db.Model):
    __tablename__ = 'individual_rehabilitation_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_code = db.Column(db.String(50), unique=True, nullable=False)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    assessment_id = db.Column(db.Integer, db.ForeignKey('comprehensive_assessments.id'))
    
    # معلومات الخطة
    plan_name = db.Column(db.String(200), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    duration_weeks = db.Column(db.Integer)
    
    # الأهداف العامة
    long_term_goals = db.Column(JSON)
    short_term_goals = db.Column(JSON)
    
    # العلاجات المطلوبة
    required_therapies = db.Column(JSON)
    therapy_frequency = db.Column(JSON)  # عدد الجلسات لكل نوع علاج
    
    # الفريق العلاجي
    primary_therapist_id = db.Column(db.Integer, db.ForeignKey('therapists.id'))
    team_members = db.Column(JSON)  # قائمة بأعضاء الفريق
    
    # معايير النجاح
    success_criteria = db.Column(JSON)
    measurement_methods = db.Column(JSON)
    
    # الموارد والأدوات
    required_equipment = db.Column(JSON)
    environmental_modifications = db.Column(db.Text)
    
    # مشاركة الأسرة
    family_involvement = db.Column(db.Text)
    home_program = db.Column(db.Text)
    
    # معلومات إضافية
    status = db.Column(db.String(20), default='active')
    progress_notes = db.Column(db.Text)
    created_by = db.Column(db.String(100))
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    therapy_sessions = db.relationship('TherapySession', backref='rehabilitation_plan', lazy=True)
    goals = db.relationship('RehabilitationGoal', backref='rehabilitation_plan', lazy=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.plan_code:
            self.plan_code = self.generate_plan_code()
    
    def generate_plan_code(self):
        """توليد رمز الخطة"""
        year = datetime.now().year
        count = IndividualRehabilitationPlan.query.count() + 1
        return f"IRP{year}{count:04d}"

# نموذج أهداف التأهيل
class RehabilitationGoal(db.Model):
    __tablename__ = 'rehabilitation_goals'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('individual_rehabilitation_plans.id'), nullable=False)
    
    goal_category = db.Column(db.String(50), nullable=False)  # حركي، معرفي، تواصلي، اجتماعي
    goal_description = db.Column(db.Text, nullable=False)
    target_behavior = db.Column(db.Text)
    
    # معايير القياس
    baseline_measurement = db.Column(db.String(200))
    target_measurement = db.Column(db.String(200))
    measurement_method = db.Column(db.String(100))
    
    # التوقيت
    target_date = db.Column(db.Date)
    priority_level = db.Column(db.String(20))  # عالي، متوسط، منخفض
    
    # التقدم
    current_status = db.Column(db.Enum(ProgressStatus))
    achievement_percentage = db.Column(db.Float, default=0.0)
    
    # معلومات إضافية
    strategies = db.Column(db.Text)
    materials_needed = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    created_date = db.Column(db.DateTime, default=datetime.utcnow)

# نموذج المعالجين والأخصائيين
class Therapist(db.Model):
    __tablename__ = 'therapists'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), unique=True)
    
    # المعلومات الشخصية
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    arabic_name = db.Column(db.String(200))
    
    # المعلومات المهنية
    specialization = db.Column(db.Enum(TherapyType), nullable=False)
    license_number = db.Column(db.String(50))
    license_expiry = db.Column(db.Date)
    
    # المؤهلات
    education_level = db.Column(db.String(100))
    certifications = db.Column(JSON)
    experience_years = db.Column(db.Integer)
    
    # معلومات الاتصال
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    
    # معلومات العمل
    hire_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active')
    working_hours = db.Column(JSON)  # ساعات العمل الأسبوعية
    max_daily_sessions = db.Column(db.Integer, default=8)
    
    # العلاقات
    therapy_sessions = db.relationship('TherapySession', backref='therapist', lazy=True)
    rehabilitation_plans = db.relationship('IndividualRehabilitationPlan', backref='primary_therapist', lazy=True)
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

# نموذج الجلسات العلاجية
class TherapySession(db.Model):
    __tablename__ = 'therapy_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    session_code = db.Column(db.String(50), unique=True, nullable=False)
    
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    therapist_id = db.Column(db.Integer, db.ForeignKey('therapists.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('individual_rehabilitation_plans.id'))
    
    # معلومات الجلسة
    therapy_type = db.Column(db.Enum(TherapyType), nullable=False)
    session_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    duration_minutes = db.Column(db.Integer)
    
    # الحالة والحضور
    status = db.Column(db.Enum(SessionStatus), default=SessionStatus.SCHEDULED)
    attendance_status = db.Column(db.String(20))
    
    # محتوى الجلسة
    session_objectives = db.Column(JSON)
    activities_performed = db.Column(JSON)
    materials_used = db.Column(JSON)
    
    # التقييم والتقدم
    performance_rating = db.Column(db.Enum(ProgressStatus))
    goals_addressed = db.Column(JSON)
    progress_notes = db.Column(db.Text)
    
    # التوصيات
    homework_assigned = db.Column(db.Text)
    next_session_focus = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    
    # معلومات إضافية
    session_notes = db.Column(db.Text)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.session_code:
            self.session_code = self.generate_session_code()
        if self.start_time and self.end_time:
            self.calculate_duration()
    
    def generate_session_code(self):
        """توليد رمز الجلسة"""
        today = datetime.now()
        count = TherapySession.query.filter_by(session_date=today.date()).count() + 1
        return f"TS{today.strftime('%Y%m%d')}{count:03d}"
    
    def calculate_duration(self):
        """حساب مدة الجلسة"""
        if self.start_time and self.end_time:
            start_dt = datetime.combine(date.today(), self.start_time)
            end_dt = datetime.combine(date.today(), self.end_time)
            duration = end_dt - start_dt
            self.duration_minutes = int(duration.total_seconds() / 60)

# نموذج سجلات التقدم
class ProgressRecord(db.Model):
    __tablename__ = 'progress_records'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey('therapy_sessions.id'))
    goal_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_goals.id'))
    
    # معلومات التقدم
    record_date = db.Column(db.Date, nullable=False)
    skill_area = db.Column(db.String(100), nullable=False)
    specific_skill = db.Column(db.String(200))
    
    # القياسات
    baseline_score = db.Column(db.Float)
    current_score = db.Column(db.Float)
    target_score = db.Column(db.Float)
    improvement_percentage = db.Column(db.Float)
    
    # التقييم النوعي
    performance_level = db.Column(db.Enum(ProgressStatus))
    consistency_rating = db.Column(db.String(50))
    independence_level = db.Column(db.String(50))
    
    # الملاحظات
    observations = db.Column(db.Text)
    challenges_noted = db.Column(db.Text)
    strategies_used = db.Column(db.Text)
    
    # التوصيات
    next_steps = db.Column(db.Text)
    modifications_needed = db.Column(db.Text)
    
    recorded_by = db.Column(db.String(100))
    created_date = db.Column(db.DateTime, default=datetime.utcnow)

# نموذج المعدات والأدوات العلاجية
class TherapyEquipment(db.Model):
    __tablename__ = 'therapy_equipment'
    
    id = db.Column(db.Integer, primary_key=True)
    equipment_code = db.Column(db.String(50), unique=True, nullable=False)
    
    name = db.Column(db.String(200), nullable=False)
    arabic_name = db.Column(db.String(200))
    category = db.Column(db.String(100))
    therapy_type = db.Column(db.Enum(TherapyType))
    
    # معلومات المعدة
    description = db.Column(db.Text)
    manufacturer = db.Column(db.String(100))
    model = db.Column(db.String(100))
    serial_number = db.Column(db.String(100))
    
    # الحالة والصيانة
    status = db.Column(db.String(20), default='available')
    condition = db.Column(db.String(50))
    last_maintenance = db.Column(db.Date)
    next_maintenance = db.Column(db.Date)
    
    # الموقع والاستخدام
    location = db.Column(db.String(100))
    usage_instructions = db.Column(db.Text)
    safety_notes = db.Column(db.Text)
    
    purchase_date = db.Column(db.Date)
    purchase_cost = db.Column(db.Float)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.equipment_code:
            self.equipment_code = self.generate_equipment_code()
    
    def generate_equipment_code(self):
        """توليد رمز المعدة"""
        count = TherapyEquipment.query.count() + 1
        return f"EQ{count:05d}"

# نموذج تقارير التقدم الشاملة
class ComprehensiveProgressReport(db.Model):
    __tablename__ = 'comprehensive_progress_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    report_code = db.Column(db.String(50), unique=True, nullable=False)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('individual_rehabilitation_plans.id'))
    
    # معلومات التقرير
    report_period_start = db.Column(db.Date, nullable=False)
    report_period_end = db.Column(db.Date, nullable=False)
    report_type = db.Column(db.String(50))  # شهري، ربع سنوي، سنوي
    
    # ملخص التقدم
    overall_progress = db.Column(db.Enum(ProgressStatus))
    goals_achieved = db.Column(db.Integer, default=0)
    goals_in_progress = db.Column(db.Integer, default=0)
    total_sessions_attended = db.Column(db.Integer, default=0)
    attendance_rate = db.Column(db.Float)
    
    # التقدم في المجالات المختلفة
    motor_skills_progress = db.Column(JSON)
    cognitive_progress = db.Column(JSON)
    communication_progress = db.Column(JSON)
    social_skills_progress = db.Column(JSON)
    daily_living_progress = db.Column(JSON)
    
    # التوصيات والخطط المستقبلية
    achievements_summary = db.Column(db.Text)
    challenges_summary = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    future_goals = db.Column(JSON)
    
    # معلومات إضافية
    family_feedback = db.Column(db.Text)
    therapist_notes = db.Column(db.Text)
    
    prepared_by = db.Column(db.String(100))
    prepared_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.report_code:
            self.report_code = self.generate_report_code()
    
    def generate_report_code(self):
        """توليد رمز التقرير"""
        year = datetime.now().year
        month = datetime.now().month
        count = ComprehensiveProgressReport.query.count() + 1
        return f"RPT{year}{month:02d}{count:04d}"

# دوال مساعدة
def calculate_age(birth_date):
    """حساب العمر"""
    if birth_date:
        return (date.today() - birth_date).days // 365
    return None

def get_disability_label(disability_type):
    """الحصول على تسمية الإعاقة بالعربية"""
    labels = {
        'physical': 'حركية',
        'intellectual': 'ذهنية/فكرية',
        'sensory': 'حسية',
        'speech_language': 'نطق ولغة',
        'autism_spectrum': 'طيف التوحد',
        'learning_difficulties': 'صعوبات التعلم',
        'behavioral': 'سلوكية',
        'multiple': 'متعددة',
        'rare_diseases': 'أمراض نادرة'
    }
    return labels.get(disability_type, disability_type)

def get_therapy_label(therapy_type):
    """الحصول على تسمية العلاج بالعربية"""
    labels = {
        'physical_therapy': 'علاج طبيعي',
        'occupational_therapy': 'علاج وظيفي',
        'speech_therapy': 'علاج نطق',
        'behavioral_therapy': 'علاج سلوكي',
        'cognitive_therapy': 'علاج معرفي',
        'sensory_integration': 'تكامل حسي',
        'music_therapy': 'علاج بالموسيقى',
        'art_therapy': 'علاج بالفن',
        'aquatic_therapy': 'علاج مائي',
        'psychological_therapy': 'علاج نفسي'
    }
    return labels.get(therapy_type, therapy_type)

def get_progress_color(status):
    """الحصول على لون حالة التقدم"""
    colors = {
        'excellent': '#28a745',
        'good': '#17a2b8',
        'satisfactory': '#ffc107',
        'needs_improvement': '#fd7e14',
        'poor': '#dc3545'
    }
    return colors.get(status, '#6c757d')
