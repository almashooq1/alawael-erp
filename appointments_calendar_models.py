#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات لنظام إدارة المواعيد والتقويم
Appointments and Calendar Management Models
"""

from datetime import datetime, date, time, timedelta
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Time, Boolean, ForeignKey, Enum, Float, JSON
from sqlalchemy.orm import relationship
from database import db
import enum

class AppointmentType(enum.Enum):
    """أنواع المواعيد"""
    THERAPY_SESSION = 'therapy_session'  # جلسة علاجية
    ASSESSMENT = 'assessment'  # تقييم
    CONSULTATION = 'consultation'  # استشارة
    MEETING = 'meeting'  # اجتماع
    TRAINING = 'training'  # تدريب
    WORKSHOP = 'workshop'  # ورشة عمل
    CONFERENCE = 'conference'  # مؤتمر
    PERSONAL = 'personal'  # شخصي

class AppointmentStatus(enum.Enum):
    """حالة الموعد"""
    SCHEDULED = 'scheduled'  # مجدول
    CONFIRMED = 'confirmed'  # مؤكد
    IN_PROGRESS = 'in_progress'  # جاري
    COMPLETED = 'completed'  # مكتمل
    CANCELLED = 'cancelled'  # ملغي
    NO_SHOW = 'no_show'  # غياب بدون إعذار
    RESCHEDULED = 'rescheduled'  # معاد جدولته

class RecurrenceType(enum.Enum):
    """نوع التكرار"""
    NONE = 'none'  # لا يتكرر
    DAILY = 'daily'  # يومي
    WEEKLY = 'weekly'  # أسبوعي
    BIWEEKLY = 'biweekly'  # كل أسبوعين
    MONTHLY = 'monthly'  # شهري
    QUARTERLY = 'quarterly'  # ربع سنوي
    YEARLY = 'yearly'  # سنوي
    CUSTOM = 'custom'  # مخصص

class ReminderType(enum.Enum):
    """نوع التذكير"""
    EMAIL = 'email'  # بريد إلكتروني
    SMS = 'sms'  # رسالة نصية
    PUSH = 'push'  # إشعار فوري
    WHATSAPP = 'whatsapp'  # واتساب
    PHONE_CALL = 'phone_call'  # مكالمة هاتفية

class Priority(enum.Enum):
    """الأولوية"""
    LOW = 'low'  # منخفضة
    MEDIUM = 'medium'  # متوسطة
    HIGH = 'high'  # عالية
    URGENT = 'urgent'  # عاجلة

# نموذج الموعد
class Appointment(db.Model):
    """الموعد"""
    __tablename__ = 'appointments'
    
    id = Column(Integer, primary_key=True)
    appointment_number = Column(String(50), unique=True, nullable=False)  # رقم الموعد
    title = Column(String(200), nullable=False)  # عنوان الموعد
    description = Column(Text)  # وصف الموعد
    appointment_type = Column(Enum(AppointmentType), nullable=False)  # نوع الموعد
    
    # التوقيت
    start_datetime = Column(DateTime, nullable=False)  # تاريخ ووقت البداية
    end_datetime = Column(DateTime, nullable=False)  # تاريخ ووقت النهاية
    duration_minutes = Column(Integer)  # المدة بالدقائق
    timezone = Column(String(50), default='Asia/Riyadh')  # المنطقة الزمنية
    
    # المشاركون
    organizer_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # المنظم
    participants = Column(JSON)  # المشاركون (قائمة معرفات المستخدمين)
    beneficiary_id = Column(Integer, ForeignKey('rehabilitation_beneficiaries.id'))  # المستفيد
    therapist_id = Column(Integer, ForeignKey('users.id'))  # الأخصائي
    
    # الموقع
    location = Column(String(200))  # الموقع
    room_number = Column(String(50))  # رقم الغرفة
    virtual_meeting_link = Column(String(500))  # رابط الاجتماع الافتراضي
    
    # الحالة والأولوية
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.SCHEDULED)  # الحالة
    priority = Column(Enum(Priority), default=Priority.MEDIUM)  # الأولوية
    
    # التكرار
    is_recurring = Column(Boolean, default=False)  # متكرر
    recurrence_type = Column(Enum(RecurrenceType), default=RecurrenceType.NONE)  # نوع التكرار
    recurrence_interval = Column(Integer, default=1)  # فترة التكرار
    recurrence_end_date = Column(Date)  # تاريخ انتهاء التكرار
    recurrence_count = Column(Integer)  # عدد مرات التكرار
    parent_appointment_id = Column(Integer, ForeignKey('appointments.id'))  # الموعد الأصلي للتكرار
    
    # معلومات إضافية
    notes = Column(Text)  # ملاحظات
    preparation_instructions = Column(Text)  # تعليمات التحضير
    materials_needed = Column(JSON)  # المواد المطلوبة
    cost = Column(Float)  # التكلفة
    
    # التذكيرات
    reminder_sent = Column(Boolean, default=False)  # تم إرسال التذكير
    reminder_datetime = Column(DateTime)  # وقت إرسال التذكير
    
    # معلومات الإلغاء/التأجيل
    cancellation_reason = Column(Text)  # سبب الإلغاء
    cancelled_at = Column(DateTime)  # وقت الإلغاء
    cancelled_by = Column(Integer, ForeignKey('users.id'))  # من ألغى
    rescheduled_from_id = Column(Integer, ForeignKey('appointments.id'))  # معاد جدولته من
    
    # العلاقات
    organizer = relationship('User', foreign_keys=[organizer_id])
    therapist = relationship('User', foreign_keys=[therapist_id])
    cancelled_by_user = relationship('User', foreign_keys=[cancelled_by])
    parent_appointment = relationship('Appointment', remote_side=[id], foreign_keys=[parent_appointment_id])
    child_appointments = relationship('Appointment', remote_side=[parent_appointment_id])
    rescheduled_from = relationship('Appointment', remote_side=[id], foreign_keys=[rescheduled_from_id])
    reminders = relationship('AppointmentReminder', back_populates='appointment', cascade='all, delete-orphan')
    conflicts = relationship('AppointmentConflict', back_populates='appointment', cascade='all, delete-orphan')
    
    # معلومات التدقيق
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<Appointment {self.appointment_number}: {self.title}>'
    
    @property
    def duration_hours(self):
        """المدة بالساعات"""
        if self.duration_minutes:
            return self.duration_minutes / 60
        return None
    
    @property
    def is_past(self):
        """هل الموعد في الماضي"""
        return self.end_datetime < datetime.utcnow()
    
    @property
    def is_today(self):
        """هل الموعد اليوم"""
        return self.start_datetime.date() == date.today()
    
    @property
    def is_upcoming(self):
        """هل الموعد قادم"""
        return self.start_datetime > datetime.utcnow()

# نموذج تذكير الموعد
class AppointmentReminder(db.Model):
    """تذكير الموعد"""
    __tablename__ = 'appointment_reminders'
    
    id = Column(Integer, primary_key=True)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False)
    reminder_type = Column(Enum(ReminderType), nullable=False)  # نوع التذكير
    
    # التوقيت
    remind_before_minutes = Column(Integer, nullable=False)  # التذكير قبل كم دقيقة
    scheduled_datetime = Column(DateTime, nullable=False)  # وقت التذكير المجدول
    sent_datetime = Column(DateTime)  # وقت الإرسال الفعلي
    
    # المستلم
    recipient_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    recipient_contact = Column(String(100))  # معلومات الاتصال (هاتف، إيميل)
    
    # المحتوى
    subject = Column(String(200))  # الموضوع
    message = Column(Text)  # الرسالة
    template_used = Column(String(100))  # القالب المستخدم
    
    # الحالة
    is_sent = Column(Boolean, default=False)  # تم الإرسال
    is_delivered = Column(Boolean, default=False)  # تم التسليم
    is_read = Column(Boolean, default=False)  # تم القراءة
    delivery_status = Column(String(50))  # حالة التسليم
    error_message = Column(Text)  # رسالة الخطأ
    
    # إعدادات التكرار
    is_recurring = Column(Boolean, default=False)  # متكرر
    recurrence_pattern = Column(JSON)  # نمط التكرار
    
    # العلاقات
    appointment = relationship('Appointment', back_populates='reminders')
    recipient = relationship('User', foreign_keys=[recipient_id])
    
    # معلومات التدقيق
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<AppointmentReminder {self.reminder_type.value} for {self.appointment_id}>'

# نموذج تعارض المواعيد
class AppointmentConflict(db.Model):
    """تعارض المواعيد"""
    __tablename__ = 'appointment_conflicts'
    
    id = Column(Integer, primary_key=True)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False)
    conflicting_appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False)
    
    # نوع التعارض
    conflict_type = Column(String(50), nullable=False)  # نوع التعارض (time, resource, participant)
    conflict_description = Column(Text)  # وصف التعارض
    severity = Column(String(20), default='medium')  # شدة التعارض (low, medium, high, critical)
    
    # التفاصيل
    conflicting_resource = Column(String(100))  # المورد المتعارض
    conflicting_participant_id = Column(Integer, ForeignKey('users.id'))  # المشارك المتعارض
    overlap_start = Column(DateTime)  # بداية التداخل
    overlap_end = Column(DateTime)  # نهاية التداخل
    overlap_minutes = Column(Integer)  # دقائق التداخل
    
    # الحالة
    is_resolved = Column(Boolean, default=False)  # تم الحل
    resolution_method = Column(String(100))  # طريقة الحل
    resolution_notes = Column(Text)  # ملاحظات الحل
    resolved_at = Column(DateTime)  # وقت الحل
    resolved_by = Column(Integer, ForeignKey('users.id'))  # من حل التعارض
    
    # العلاقات
    appointment = relationship('Appointment', back_populates='conflicts', foreign_keys=[appointment_id])
    conflicting_appointment = relationship('Appointment', foreign_keys=[conflicting_appointment_id])
    conflicting_participant = relationship('User', foreign_keys=[conflicting_participant_id])
    resolver = relationship('User', foreign_keys=[resolved_by])
    
    # معلومات التدقيق
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    detected_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<AppointmentConflict {self.conflict_type} between {self.appointment_id} and {self.conflicting_appointment_id}>'

# نموذج التقويم
class Calendar(db.Model):
    """التقويم"""
    __tablename__ = 'calendars'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)  # اسم التقويم
    description = Column(Text)  # وصف التقويم
    color = Column(String(7), default='#3498db')  # لون التقويم (hex)
    
    # الملكية والمشاركة
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # المالك
    is_public = Column(Boolean, default=False)  # عام
    is_shared = Column(Boolean, default=False)  # مشارك
    shared_with = Column(JSON)  # مشارك مع (قائمة معرفات المستخدمين)
    
    # الإعدادات
    default_appointment_duration = Column(Integer, default=60)  # مدة الموعد الافتراضية
    working_hours_start = Column(Time, default=time(8, 0))  # بداية ساعات العمل
    working_hours_end = Column(Time, default=time(17, 0))  # نهاية ساعات العمل
    working_days = Column(JSON, default=['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'])  # أيام العمل
    
    # التذكيرات الافتراضية
    default_reminders = Column(JSON)  # التذكيرات الافتراضية
    
    # الحالة
    is_active = Column(Boolean, default=True)  # نشط
    
    # العلاقات
    owner = relationship('User', foreign_keys=[owner_id])
    
    # معلومات التدقيق
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<Calendar {self.name}>'

# نموذج إعدادات التقويم
class CalendarSettings(db.Model):
    """إعدادات التقويم"""
    __tablename__ = 'calendar_settings'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    
    # إعدادات العرض
    default_view = Column(String(20), default='week')  # العرض الافتراضي (day, week, month, year)
    start_of_week = Column(String(10), default='sunday')  # بداية الأسبوع
    time_format = Column(String(10), default='24h')  # تنسيق الوقت (12h, 24h)
    date_format = Column(String(20), default='dd/mm/yyyy')  # تنسيق التاريخ
    
    # إعدادات الإشعارات
    email_notifications = Column(Boolean, default=True)  # إشعارات الإيميل
    sms_notifications = Column(Boolean, default=True)  # إشعارات SMS
    push_notifications = Column(Boolean, default=True)  # الإشعارات الفورية
    
    # إعدادات التذكيرات الافتراضية
    default_reminder_minutes = Column(JSON, default=[15, 60])  # دقائق التذكير الافتراضية
    
    # إعدادات المواعيد
    auto_confirm_appointments = Column(Boolean, default=False)  # تأكيد تلقائي للمواعيد
    allow_conflicts = Column(Boolean, default=False)  # السماح بالتعارضات
    max_appointments_per_day = Column(Integer, default=20)  # الحد الأقصى للمواعيد يومياً
    
    # إعدادات الخصوصية
    show_availability = Column(Boolean, default=True)  # إظهار التوفر
    allow_booking = Column(Boolean, default=True)  # السماح بالحجز
    
    # العلاقات
    user = relationship('User', backref='calendar_settings')
    
    # معلومات التدقيق
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<CalendarSettings for user {self.user_id}>'

# نموذج الأحداث الخاصة
class SpecialEvent(db.Model):
    """الأحداث الخاصة"""
    __tablename__ = 'special_events'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)  # اسم الحدث
    description = Column(Text)  # وصف الحدث
    event_type = Column(String(50))  # نوع الحدث (holiday, training, conference, etc.)
    
    # التوقيت
    start_date = Column(Date, nullable=False)  # تاريخ البداية
    end_date = Column(Date, nullable=False)  # تاريخ النهاية
    is_all_day = Column(Boolean, default=True)  # طوال اليوم
    start_time = Column(Time)  # وقت البداية
    end_time = Column(Time)  # وقت النهاية
    
    # التأثير على المواعيد
    affects_scheduling = Column(Boolean, default=True)  # يؤثر على الجدولة
    blocks_appointments = Column(Boolean, default=False)  # يمنع المواعيد
    
    # التكرار السنوي
    is_recurring_yearly = Column(Boolean, default=False)  # يتكرر سنوياً
    
    # الإعدادات
    color = Column(String(7), default='#e74c3c')  # اللون
    is_public = Column(Boolean, default=True)  # عام
    
    # معلومات التدقيق
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<SpecialEvent {self.name}>'
