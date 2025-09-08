#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نماذج بوابة الأسرة لتتبع التقدم والتواصل
Family Portal Models for Progress Tracking and Communication
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, Time, Float, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, date, time
from enum import Enum
import uuid

from database import db

class FamilyMemberRole(Enum):
    """أدوار أفراد الأسرة"""
    FATHER = "والد"
    MOTHER = "والدة"
    GUARDIAN = "ولي أمر"
    SIBLING = "شقيق"
    GRANDPARENT = "جد/جدة"
    OTHER = "آخر"

class CommunicationChannel(Enum):
    """قنوات التواصل"""
    SMS = "رسائل نصية"
    EMAIL = "بريد إلكتروني"
    WHATSAPP = "واتساب"
    PHONE_CALL = "مكالمة هاتفية"
    IN_PERSON = "شخصياً"
    PORTAL_MESSAGE = "رسالة البوابة"

class MessageType(Enum):
    """أنواع الرسائل"""
    PROGRESS_UPDATE = "تحديث التقدم"
    APPOINTMENT_REMINDER = "تذكير موعد"
    GENERAL_INFO = "معلومات عامة"
    URGENT_NOTICE = "إشعار عاجل"
    FEEDBACK_REQUEST = "طلب تقييم"
    HOMEWORK_ASSIGNMENT = "واجب منزلي"

class MessageStatus(Enum):
    """حالة الرسائل"""
    SENT = "مرسلة"
    DELIVERED = "تم التسليم"
    READ = "مقروءة"
    REPLIED = "تم الرد"

class ProgressReportType(Enum):
    """أنواع تقارير التقدم"""
    WEEKLY = "أسبوعي"
    MONTHLY = "شهري"
    QUARTERLY = "ربع سنوي"
    CUSTOM = "مخصص"

class FeedbackType(Enum):
    """أنواع التقييم"""
    SESSION_FEEDBACK = "تقييم الجلسة"
    PROGRAM_FEEDBACK = "تقييم البرنامج"
    THERAPIST_FEEDBACK = "تقييم المعالج"
    FACILITY_FEEDBACK = "تقييم المرفق"
    GENERAL_FEEDBACK = "تقييم عام"

class FamilyMember(db.Model):
    """نموذج أفراد الأسرة"""
    __tablename__ = 'family_members'
    
    id = Column(Integer, primary_key=True)
    member_code = Column(String(20), unique=True, nullable=False)
    beneficiary_id = Column(Integer, ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    
    # معلومات شخصية
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    relationship_to_beneficiary = Column(SQLEnum(FamilyMemberRole), nullable=False)
    national_id = Column(String(20), unique=True)
    date_of_birth = Column(Date)
    gender = Column(String(10))
    
    # معلومات الاتصال
    phone_primary = Column(String(20), nullable=False)
    phone_secondary = Column(String(20))
    email = Column(String(100))
    whatsapp_number = Column(String(20))
    address = Column(Text)
    
    # إعدادات البوابة
    portal_username = Column(String(50), unique=True)
    portal_password_hash = Column(String(255))
    is_primary_contact = Column(Boolean, default=False)
    is_portal_active = Column(Boolean, default=True)
    preferred_communication_channel = Column(SQLEnum(CommunicationChannel), default=CommunicationChannel.SMS)
    language_preference = Column(String(10), default='ar')
    
    # إعدادات الإشعارات
    notification_preferences = Column(JSON, default={
        'progress_updates': True,
        'appointment_reminders': True,
        'homework_assignments': True,
        'general_announcements': True,
        'urgent_notices': True
    })
    
    # معلومات إضافية
    occupation = Column(String(100))
    education_level = Column(String(50))
    notes = Column(Text)
    emergency_contact = Column(Boolean, default=False)
    
    # علاقات
    beneficiary = relationship('RehabilitationBeneficiary', back_populates='family_members')
    messages_sent = relationship('FamilyMessage', foreign_keys='FamilyMessage.sender_id', back_populates='sender')
    messages_received = relationship('FamilyMessage', foreign_keys='FamilyMessage.recipient_id', back_populates='recipient')
    feedback_submissions = relationship('FamilyFeedback', back_populates='family_member')
    portal_sessions = relationship('FamilyPortalSession', back_populates='family_member')
    
    # تتبع التغييرات
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self):
        return f'<FamilyMember {self.member_code}: {self.full_name}>'

class FamilyMessage(db.Model):
    """نموذج رسائل الأسرة"""
    __tablename__ = 'family_messages'
    
    id = Column(Integer, primary_key=True)
    message_id = Column(String(50), unique=True, nullable=False, default=lambda: f"MSG-{uuid.uuid4().hex[:12].upper()}")
    
    # أطراف الرسالة
    sender_id = Column(Integer, ForeignKey('family_members.id'))
    recipient_id = Column(Integer, ForeignKey('family_members.id'))
    staff_sender_id = Column(Integer, ForeignKey('users.id'))  # إذا كان المرسل من الطاقم
    beneficiary_id = Column(Integer, ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    
    # محتوى الرسالة
    subject = Column(String(200), nullable=False)
    message_body = Column(Text, nullable=False)
    message_type = Column(SQLEnum(MessageType), nullable=False)
    priority = Column(String(20), default='normal')  # low, normal, high, urgent
    
    # معلومات التسليم
    communication_channel = Column(SQLEnum(CommunicationChannel), nullable=False)
    status = Column(SQLEnum(MessageStatus), default=MessageStatus.SENT)
    sent_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime)
    read_at = Column(DateTime)
    replied_at = Column(DateTime)
    
    # مرفقات ومعلومات إضافية
    attachments = Column(JSON)  # قائمة بالملفات المرفقة
    related_session_id = Column(Integer, ForeignKey('session_schedules.id'))
    related_program_id = Column(Integer, ForeignKey('rehabilitation_programs.id'))
    
    # إعدادات الرسالة
    requires_response = Column(Boolean, default=False)
    response_deadline = Column(DateTime)
    is_automated = Column(Boolean, default=False)
    template_used = Column(String(100))
    
    # علاقات
    sender = relationship('FamilyMember', foreign_keys=[sender_id], back_populates='messages_sent')
    recipient = relationship('FamilyMember', foreign_keys=[recipient_id], back_populates='messages_received')
    staff_sender = relationship('User', foreign_keys=[staff_sender_id])
    beneficiary = relationship('RehabilitationBeneficiary')
    related_session = relationship('SessionSchedule')
    related_program = relationship('RehabilitationProgram')
    replies = relationship('FamilyMessageReply', back_populates='original_message')
    
    # تتبع التغييرات
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<FamilyMessage {self.message_id}: {self.subject}>'

class FamilyMessageReply(db.Model):
    """نموذج ردود رسائل الأسرة"""
    __tablename__ = 'family_message_replies'
    
    id = Column(Integer, primary_key=True)
    reply_id = Column(String(50), unique=True, nullable=False, default=lambda: f"RPL-{uuid.uuid4().hex[:12].upper()}")
    original_message_id = Column(Integer, ForeignKey('family_messages.id'), nullable=False)
    
    # معلومات الرد
    sender_id = Column(Integer, ForeignKey('family_members.id'))
    staff_sender_id = Column(Integer, ForeignKey('users.id'))
    reply_body = Column(Text, nullable=False)
    
    # معلومات التسليم
    sent_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime)
    
    # مرفقات
    attachments = Column(JSON)
    
    # علاقات
    original_message = relationship('FamilyMessage', back_populates='replies')
    sender = relationship('FamilyMember', foreign_keys=[sender_id])
    staff_sender = relationship('User', foreign_keys=[staff_sender_id])
    
    # تتبع التغييرات
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<FamilyMessageReply {self.reply_id}>'

class FamilyProgressReport(db.Model):
    """نموذج تقارير تقدم الأسرة"""
    __tablename__ = 'family_progress_reports'
    
    id = Column(Integer, primary_key=True)
    report_id = Column(String(50), unique=True, nullable=False, default=lambda: f"FPR-{uuid.uuid4().hex[:12].upper()}")
    
    # معلومات التقرير
    beneficiary_id = Column(Integer, ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    report_type = Column(SQLEnum(ProgressReportType), nullable=False)
    report_period_start = Column(Date, nullable=False)
    report_period_end = Column(Date, nullable=False)
    
    # محتوى التقرير
    report_title = Column(String(200), nullable=False)
    executive_summary = Column(Text)
    detailed_progress = Column(JSON)  # تفاصيل التقدم في كل مجال
    achievements = Column(JSON)  # الإنجازات المحققة
    challenges = Column(JSON)  # التحديات المواجهة
    recommendations = Column(JSON)  # التوصيات للأسرة
    
    # إحصائيات التقدم
    overall_progress_score = Column(Float)  # نقاط التقدم الإجمالية (0-100)
    session_attendance_rate = Column(Float)  # معدل الحضور
    goal_achievement_rate = Column(Float)  # معدل تحقيق الأهداف
    skill_improvement_areas = Column(JSON)  # مجالات تحسن المهارات
    
    # معلومات الجلسات
    total_sessions_planned = Column(Integer)
    total_sessions_attended = Column(Integer)
    total_sessions_missed = Column(Integer)
    session_details = Column(JSON)  # تفاصيل الجلسات
    
    # تقييم الأسرة
    family_satisfaction_score = Column(Float)  # تقييم رضا الأسرة
    family_feedback = Column(Text)  # تعليقات الأسرة
    
    # معلومات الإنشاء والمشاركة
    generated_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    shared_with_family = Column(Boolean, default=False)
    shared_at = Column(DateTime)
    
    # علاقات
    beneficiary = relationship('RehabilitationBeneficiary')
    generator = relationship('User', foreign_keys=[generated_by])
    
    # تتبع التغييرات
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<FamilyProgressReport {self.report_id}: {self.report_title}>'

class FamilyFeedback(db.Model):
    """نموذج تقييمات الأسرة"""
    __tablename__ = 'family_feedback'
    
    id = Column(Integer, primary_key=True)
    feedback_id = Column(String(50), unique=True, nullable=False, default=lambda: f"FB-{uuid.uuid4().hex[:12].upper()}")
    
    # معلومات التقييم
    family_member_id = Column(Integer, ForeignKey('family_members.id'), nullable=False)
    beneficiary_id = Column(Integer, ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    feedback_type = Column(SQLEnum(FeedbackType), nullable=False)
    
    # موضوع التقييم
    related_session_id = Column(Integer, ForeignKey('session_schedules.id'))
    related_program_id = Column(Integer, ForeignKey('rehabilitation_programs.id'))
    related_therapist_id = Column(Integer, ForeignKey('therapists.id'))
    
    # محتوى التقييم
    rating_overall = Column(Integer)  # تقييم عام (1-5)
    rating_communication = Column(Integer)  # تقييم التواصل
    rating_professionalism = Column(Integer)  # تقييم المهنية
    rating_effectiveness = Column(Integer)  # تقييم الفعالية
    rating_environment = Column(Integer)  # تقييم البيئة
    
    # تعليقات مفصلة
    positive_feedback = Column(Text)  # التعليقات الإيجابية
    areas_for_improvement = Column(Text)  # مجالات التحسين
    suggestions = Column(Text)  # الاقتراحات
    additional_comments = Column(Text)  # تعليقات إضافية
    
    # معلومات التقديم
    submitted_at = Column(DateTime, default=datetime.utcnow)
    is_anonymous = Column(Boolean, default=False)
    
    # معلومات المتابعة
    reviewed_by = Column(Integer, ForeignKey('users.id'))
    reviewed_at = Column(DateTime)
    response_provided = Column(Text)
    action_taken = Column(Text)
    
    # علاقات
    family_member = relationship('FamilyMember', back_populates='feedback_submissions')
    beneficiary = relationship('RehabilitationBeneficiary')
    related_session = relationship('SessionSchedule')
    related_program = relationship('RehabilitationProgram')
    related_therapist = relationship('Therapist')
    reviewer = relationship('User', foreign_keys=[reviewed_by])
    
    # تتبع التغييرات
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    @property
    def average_rating(self):
        """حساب متوسط التقييم"""
        ratings = [
            self.rating_overall, self.rating_communication,
            self.rating_professionalism, self.rating_effectiveness,
            self.rating_environment
        ]
        valid_ratings = [r for r in ratings if r is not None]
        return sum(valid_ratings) / len(valid_ratings) if valid_ratings else 0
    
    def __repr__(self):
        return f'<FamilyFeedback {self.feedback_id}: {self.feedback_type.value}>'

class FamilyPortalSession(db.Model):
    """نموذج جلسات بوابة الأسرة"""
    __tablename__ = 'family_portal_sessions'
    
    id = Column(Integer, primary_key=True)
    session_id = Column(String(100), unique=True, nullable=False)
    family_member_id = Column(Integer, ForeignKey('family_members.id'), nullable=False)
    
    # معلومات الجلسة
    login_time = Column(DateTime, default=datetime.utcnow)
    logout_time = Column(DateTime)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    device_type = Column(String(50))
    
    # إحصائيات الاستخدام
    pages_visited = Column(JSON)  # الصفحات التي تم زيارتها
    actions_performed = Column(JSON)  # الإجراءات المنفذة
    session_duration_minutes = Column(Integer)
    
    # معلومات الأمان
    is_active = Column(Boolean, default=True)
    last_activity = Column(DateTime, default=datetime.utcnow)
    
    # علاقات
    family_member = relationship('FamilyMember', back_populates='portal_sessions')
    
    # تتبع التغييرات
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<FamilyPortalSession {self.session_id}>'

class HomeworkAssignment(db.Model):
    """نموذج الواجبات المنزلية"""
    __tablename__ = 'homework_assignments'
    
    id = Column(Integer, primary_key=True)
    assignment_id = Column(String(50), unique=True, nullable=False, default=lambda: f"HW-{uuid.uuid4().hex[:12].upper()}")
    
    # معلومات الواجب
    beneficiary_id = Column(Integer, ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    assigned_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    session_id = Column(Integer, ForeignKey('session_schedules.id'))
    
    # محتوى الواجب
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    instructions = Column(Text)
    objectives = Column(JSON)  # أهداف الواجب
    materials_needed = Column(JSON)  # المواد المطلوبة
    
    # معلومات التوقيت
    assigned_date = Column(Date, default=date.today)
    due_date = Column(Date, nullable=False)
    estimated_duration_minutes = Column(Integer)
    
    # معلومات التسليم
    submission_method = Column(String(50))  # كيفية التسليم
    submission_format = Column(String(50))  # صيغة التسليم
    
    # حالة الواجب
    is_completed = Column(Boolean, default=False)
    completion_date = Column(Date)
    family_notes = Column(Text)  # ملاحظات الأسرة
    therapist_feedback = Column(Text)  # تعليقات المعالج
    
    # تقييم الأداء
    performance_rating = Column(Integer)  # تقييم الأداء (1-5)
    effort_level = Column(String(20))  # مستوى الجهد
    
    # علاقات
    beneficiary = relationship('RehabilitationBeneficiary')
    assigner = relationship('User', foreign_keys=[assigned_by])
    related_session = relationship('SessionSchedule')
    
    # تتبع التغييرات
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    @property
    def is_overdue(self):
        """فحص إذا كان الواجب متأخر"""
        return date.today() > self.due_date and not self.is_completed
    
    @property
    def days_remaining(self):
        """حساب الأيام المتبقية"""
        if self.is_completed:
            return 0
        return (self.due_date - date.today()).days
    
    def __repr__(self):
        return f'<HomeworkAssignment {self.assignment_id}: {self.title}>'

# إضافة العلاقات للنماذج الموجودة
def add_family_relationships():
    """إضافة العلاقات للنماذج الموجودة"""
    from rehabilitation_programs_models import RehabilitationBeneficiary, RehabilitationProgram, Therapist
    from session_scheduling_models import SessionSchedule
    
    # إضافة علاقة أفراد الأسرة للمستفيدين
    RehabilitationBeneficiary.family_members = relationship('FamilyMember', back_populates='beneficiary', cascade='all, delete-orphan')
    
    # إضافة علاقات أخرى حسب الحاجة
    pass
