#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات لنظام إدارة علاقات العملاء (CRM)
Customer Relationship Management (CRM) Database Models
"""

from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, Numeric, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSON
from app import db
import enum

# Enums for CRM system
class CustomerType(enum.Enum):
    INDIVIDUAL = 'individual'  # فرد
    COMPANY = 'company'  # شركة
    ORGANIZATION = 'organization'  # مؤسسة

class LeadStatus(enum.Enum):
    NEW = 'new'  # جديد
    CONTACTED = 'contacted'  # تم التواصل
    QUALIFIED = 'qualified'  # مؤهل
    CONVERTED = 'converted'  # تم التحويل
    LOST = 'lost'  # فقد

class OpportunityStage(enum.Enum):
    PROSPECTING = 'prospecting'  # استطلاع
    QUALIFICATION = 'qualification'  # تأهيل
    PROPOSAL = 'proposal'  # عرض
    NEGOTIATION = 'negotiation'  # تفاوض
    CLOSED_WON = 'closed_won'  # مغلق - فوز
    CLOSED_LOST = 'closed_lost'  # مغلق - خسارة

class ActivityType(enum.Enum):
    CALL = 'call'  # مكالمة
    EMAIL = 'email'  # إيميل
    MEETING = 'meeting'  # اجتماع
    TASK = 'task'  # مهمة
    NOTE = 'note'  # ملاحظة

class CampaignType(enum.Enum):
    EMAIL = 'email'  # حملة إيميل
    SMS = 'sms'  # حملة رسائل
    SOCIAL = 'social'  # وسائل التواصل
    EVENT = 'event'  # فعالية
    WEBINAR = 'webinar'  # ندوة إلكترونية

class TicketPriority(enum.Enum):
    LOW = 'low'  # منخفضة
    MEDIUM = 'medium'  # متوسطة
    HIGH = 'high'  # عالية
    URGENT = 'urgent'  # عاجلة

class TicketStatus(enum.Enum):
    OPEN = 'open'  # مفتوح
    IN_PROGRESS = 'in_progress'  # قيد المعالجة
    PENDING = 'pending'  # معلق
    RESOLVED = 'resolved'  # محلول
    CLOSED = 'closed'  # مغلق

# Customer Management Models
class Customer(db.Model):
    """نموذج العملاء"""
    __tablename__ = 'crm_customers'
    
    id = Column(Integer, primary_key=True)
    customer_code = Column(String(50), unique=True, nullable=False)  # رمز العميل
    customer_type = Column(Enum(CustomerType), nullable=False)  # نوع العميل
    
    # معلومات أساسية
    first_name = Column(String(100))  # الاسم الأول
    last_name = Column(String(100))  # الاسم الأخير
    company_name = Column(String(200))  # اسم الشركة
    title = Column(String(100))  # المنصب
    
    # معلومات الاتصال
    email = Column(String(255))  # البريد الإلكتروني
    phone = Column(String(20))  # الهاتف
    mobile = Column(String(20))  # الجوال
    website = Column(String(255))  # الموقع الإلكتروني
    
    # العنوان
    address_line1 = Column(String(255))  # العنوان الأول
    address_line2 = Column(String(255))  # العنوان الثاني
    city = Column(String(100))  # المدينة
    state = Column(String(100))  # المنطقة
    postal_code = Column(String(20))  # الرمز البريدي
    country = Column(String(100))  # البلد
    
    # معلومات تجارية
    industry = Column(String(100))  # الصناعة
    annual_revenue = Column(Numeric(15, 2))  # الإيرادات السنوية
    employee_count = Column(Integer)  # عدد الموظفين
    
    # معلومات النظام
    source = Column(String(100))  # مصدر العميل
    assigned_to_id = Column(Integer, ForeignKey('users.id'))  # المسؤول
    is_active = Column(Boolean, default=True)  # نشط
    tags = Column(JSON)  # العلامات
    notes = Column(Text)  # ملاحظات
    
    # تواريخ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey('users.id'))
    updated_by_id = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    assigned_to = relationship('User', foreign_keys=[assigned_to_id])
    created_by = relationship('User', foreign_keys=[created_by_id])
    updated_by = relationship('User', foreign_keys=[updated_by_id])
    opportunities = relationship('Opportunity', back_populates='customer')
    activities = relationship('Activity', back_populates='customer')
    tickets = relationship('SupportTicket', back_populates='customer')
    
    @property
    def full_name(self):
        """الاسم الكامل"""
        if self.customer_type == CustomerType.INDIVIDUAL:
            return f"{self.first_name or ''} {self.last_name or ''}".strip()
        return self.company_name or ''
    
    @property
    def display_name(self):
        """اسم العرض"""
        return self.full_name or self.customer_code

class Lead(db.Model):
    """نموذج العملاء المحتملين"""
    __tablename__ = 'crm_leads'
    
    id = Column(Integer, primary_key=True)
    lead_code = Column(String(50), unique=True, nullable=False)  # رمز العميل المحتمل
    
    # معلومات أساسية
    first_name = Column(String(100), nullable=False)  # الاسم الأول
    last_name = Column(String(100), nullable=False)  # الاسم الأخير
    company = Column(String(200))  # الشركة
    title = Column(String(100))  # المنصب
    
    # معلومات الاتصال
    email = Column(String(255), nullable=False)  # البريد الإلكتروني
    phone = Column(String(20))  # الهاتف
    mobile = Column(String(20))  # الجوال
    
    # معلومات إضافية
    source = Column(String(100))  # المصدر
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW)  # الحالة
    rating = Column(Integer)  # التقييم (1-5)
    industry = Column(String(100))  # الصناعة
    annual_revenue = Column(Numeric(15, 2))  # الإيرادات السنوية
    employee_count = Column(Integer)  # عدد الموظفين
    
    # معلومات النظام
    assigned_to_id = Column(Integer, ForeignKey('users.id'))  # المسؤول
    converted_to_customer_id = Column(Integer, ForeignKey('crm_customers.id'))  # تم التحويل إلى عميل
    conversion_date = Column(DateTime)  # تاريخ التحويل
    tags = Column(JSON)  # العلامات
    notes = Column(Text)  # ملاحظات
    
    # تواريخ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey('users.id'))
    updated_by_id = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    assigned_to = relationship('User', foreign_keys=[assigned_to_id])
    converted_to_customer = relationship('Customer', foreign_keys=[converted_to_customer_id])
    created_by = relationship('User', foreign_keys=[created_by_id])
    updated_by = relationship('User', foreign_keys=[updated_by_id])
    activities = relationship('Activity', back_populates='lead')
    
    @property
    def full_name(self):
        """الاسم الكامل"""
        return f"{self.first_name} {self.last_name}"

# Sales Management Models
class Opportunity(db.Model):
    """نموذج الفرص التجارية"""
    __tablename__ = 'crm_opportunities'
    
    id = Column(Integer, primary_key=True)
    opportunity_code = Column(String(50), unique=True, nullable=False)  # رمز الفرصة
    name = Column(String(200), nullable=False)  # اسم الفرصة
    description = Column(Text)  # الوصف
    
    # معلومات الفرصة
    customer_id = Column(Integer, ForeignKey('crm_customers.id'), nullable=False)  # العميل
    stage = Column(Enum(OpportunityStage), default=OpportunityStage.PROSPECTING)  # المرحلة
    probability = Column(Integer, default=0)  # احتمالية النجاح (%)
    amount = Column(Numeric(15, 2))  # القيمة المتوقعة
    expected_close_date = Column(Date)  # تاريخ الإغلاق المتوقع
    actual_close_date = Column(Date)  # تاريخ الإغلاق الفعلي
    
    # معلومات إضافية
    source = Column(String(100))  # المصدر
    competitor = Column(String(200))  # المنافس
    next_step = Column(Text)  # الخطوة التالية
    
    # معلومات النظام
    assigned_to_id = Column(Integer, ForeignKey('users.id'))  # المسؤول
    tags = Column(JSON)  # العلامات
    
    # تواريخ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey('users.id'))
    updated_by_id = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    customer = relationship('Customer', back_populates='opportunities')
    assigned_to = relationship('User', foreign_keys=[assigned_to_id])
    created_by = relationship('User', foreign_keys=[created_by_id])
    updated_by = relationship('User', foreign_keys=[updated_by_id])
    activities = relationship('Activity', back_populates='opportunity')
    
    @property
    def is_won(self):
        """هل تم كسب الفرصة"""
        return self.stage == OpportunityStage.CLOSED_WON
    
    @property
    def is_lost(self):
        """هل تم فقدان الفرصة"""
        return self.stage == OpportunityStage.CLOSED_LOST
    
    @property
    def is_closed(self):
        """هل تم إغلاق الفرصة"""
        return self.is_won or self.is_lost

# Activity Management Models
class Activity(db.Model):
    """نموذج الأنشطة"""
    __tablename__ = 'crm_activities'
    
    id = Column(Integer, primary_key=True)
    activity_type = Column(Enum(ActivityType), nullable=False)  # نوع النشاط
    subject = Column(String(200), nullable=False)  # الموضوع
    description = Column(Text)  # الوصف
    
    # الارتباطات
    customer_id = Column(Integer, ForeignKey('crm_customers.id'))  # العميل
    lead_id = Column(Integer, ForeignKey('crm_leads.id'))  # العميل المحتمل
    opportunity_id = Column(Integer, ForeignKey('crm_opportunities.id'))  # الفرصة
    
    # معلومات النشاط
    scheduled_date = Column(DateTime)  # تاريخ الجدولة
    due_date = Column(DateTime)  # تاريخ الاستحقاق
    completed_date = Column(DateTime)  # تاريخ الإنجاز
    is_completed = Column(Boolean, default=False)  # مكتمل
    priority = Column(String(20), default='medium')  # الأولوية
    
    # معلومات إضافية
    location = Column(String(255))  # الموقع
    duration_minutes = Column(Integer)  # المدة بالدقائق
    outcome = Column(Text)  # النتيجة
    
    # معلومات النظام
    assigned_to_id = Column(Integer, ForeignKey('users.id'))  # المسؤول
    
    # تواريخ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey('users.id'))
    updated_by_id = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    customer = relationship('Customer', back_populates='activities')
    lead = relationship('Lead', back_populates='activities')
    opportunity = relationship('Opportunity', back_populates='activities')
    assigned_to = relationship('User', foreign_keys=[assigned_to_id])
    created_by = relationship('User', foreign_keys=[created_by_id])
    updated_by = relationship('User', foreign_keys=[updated_by_id])

# Marketing Campaign Models
class Campaign(db.Model):
    """نموذج الحملات التسويقية"""
    __tablename__ = 'crm_campaigns'
    
    id = Column(Integer, primary_key=True)
    campaign_code = Column(String(50), unique=True, nullable=False)  # رمز الحملة
    name = Column(String(200), nullable=False)  # اسم الحملة
    description = Column(Text)  # الوصف
    
    # معلومات الحملة
    campaign_type = Column(Enum(CampaignType), nullable=False)  # نوع الحملة
    status = Column(String(50), default='planned')  # الحالة
    start_date = Column(Date)  # تاريخ البداية
    end_date = Column(Date)  # تاريخ النهاية
    
    # الميزانية والتكاليف
    budget = Column(Numeric(15, 2))  # الميزانية
    actual_cost = Column(Numeric(15, 2))  # التكلفة الفعلية
    
    # الأهداف والنتائج
    target_audience = Column(Text)  # الجمهور المستهدف
    expected_leads = Column(Integer)  # العملاء المحتملون المتوقعون
    actual_leads = Column(Integer, default=0)  # العملاء المحتملون الفعليون
    expected_revenue = Column(Numeric(15, 2))  # الإيرادات المتوقعة
    actual_revenue = Column(Numeric(15, 2), default=0)  # الإيرادات الفعلية
    
    # معلومات النظام
    assigned_to_id = Column(Integer, ForeignKey('users.id'))  # المسؤول
    
    # تواريخ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey('users.id'))
    updated_by_id = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    assigned_to = relationship('User', foreign_keys=[assigned_to_id])
    created_by = relationship('User', foreign_keys=[created_by_id])
    updated_by = relationship('User', foreign_keys=[updated_by_id])
    
    @property
    def roi(self):
        """عائد الاستثمار"""
        if self.actual_cost and self.actual_cost > 0:
            return ((self.actual_revenue or 0) - self.actual_cost) / self.actual_cost * 100
        return 0

# Customer Support Models
class SupportTicket(db.Model):
    """نموذج تذاكر الدعم الفني"""
    __tablename__ = 'crm_support_tickets'
    
    id = Column(Integer, primary_key=True)
    ticket_number = Column(String(50), unique=True, nullable=False)  # رقم التذكرة
    subject = Column(String(200), nullable=False)  # الموضوع
    description = Column(Text, nullable=False)  # الوصف
    
    # معلومات التذكرة
    customer_id = Column(Integer, ForeignKey('crm_customers.id'), nullable=False)  # العميل
    priority = Column(Enum(TicketPriority), default=TicketPriority.MEDIUM)  # الأولوية
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN)  # الحالة
    category = Column(String(100))  # الفئة
    
    # معلومات المعالجة
    assigned_to_id = Column(Integer, ForeignKey('users.id'))  # المسؤول
    resolution = Column(Text)  # الحل
    resolution_date = Column(DateTime)  # تاريخ الحل
    
    # تواريخ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey('users.id'))
    updated_by_id = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    customer = relationship('Customer', back_populates='tickets')
    assigned_to = relationship('User', foreign_keys=[assigned_to_id])
    created_by = relationship('User', foreign_keys=[created_by_id])
    updated_by = relationship('User', foreign_keys=[updated_by_id])
    
    @property
    def is_resolved(self):
        """هل تم حل التذكرة"""
        return self.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]

# Communication Models
class Communication(db.Model):
    """نموذج التواصل"""
    __tablename__ = 'crm_communications'
    
    id = Column(Integer, primary_key=True)
    communication_type = Column(String(50), nullable=False)  # نوع التواصل
    subject = Column(String(200))  # الموضوع
    content = Column(Text, nullable=False)  # المحتوى
    
    # الارتباطات
    customer_id = Column(Integer, ForeignKey('crm_customers.id'))  # العميل
    lead_id = Column(Integer, ForeignKey('crm_leads.id'))  # العميل المحتمل
    
    # معلومات التواصل
    direction = Column(String(20), nullable=False)  # الاتجاه (inbound/outbound)
    channel = Column(String(50))  # القناة (email, phone, sms, etc.)
    status = Column(String(50), default='sent')  # الحالة
    
    # تواريخ
    sent_at = Column(DateTime)  # تاريخ الإرسال
    delivered_at = Column(DateTime)  # تاريخ التسليم
    opened_at = Column(DateTime)  # تاريخ الفتح
    
    # معلومات النظام
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    customer = relationship('Customer', foreign_keys=[customer_id])
    lead = relationship('Lead', foreign_keys=[lead_id])
    created_by = relationship('User', foreign_keys=[created_by_id])

# Analytics and Reporting Models
class CRMReport(db.Model):
    """نموذج تقارير CRM"""
    __tablename__ = 'crm_reports'
    
    id = Column(Integer, primary_key=True)
    report_name = Column(String(200), nullable=False)  # اسم التقرير
    report_type = Column(String(100), nullable=False)  # نوع التقرير
    description = Column(Text)  # الوصف
    
    # معلومات التقرير
    parameters = Column(JSON)  # معاملات التقرير
    data = Column(JSON)  # بيانات التقرير
    file_path = Column(String(500))  # مسار الملف
    
    # معلومات النظام
    generated_at = Column(DateTime, default=datetime.utcnow)
    generated_by_id = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    generated_by = relationship('User', foreign_keys=[generated_by_id])

# Settings and Configuration Models
class CRMSettings(db.Model):
    """نموذج إعدادات CRM"""
    __tablename__ = 'crm_settings'
    
    id = Column(Integer, primary_key=True)
    setting_key = Column(String(100), unique=True, nullable=False)  # مفتاح الإعداد
    setting_value = Column(Text)  # قيمة الإعداد
    setting_type = Column(String(50), default='string')  # نوع الإعداد
    description = Column(Text)  # الوصف
    
    # معلومات النظام
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_id = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    updated_by = relationship('User', foreign_keys=[updated_by_id])

# Audit Trail Model
class CRMAuditLog(db.Model):
    """نموذج سجل المراجعة لـ CRM"""
    __tablename__ = 'crm_audit_logs'
    
    id = Column(Integer, primary_key=True)
    table_name = Column(String(100), nullable=False)  # اسم الجدول
    record_id = Column(Integer, nullable=False)  # معرف السجل
    action = Column(String(50), nullable=False)  # العملية (create, update, delete)
    old_values = Column(JSON)  # القيم القديمة
    new_values = Column(JSON)  # القيم الجديدة
    
    # معلومات النظام
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    created_by = relationship('User', foreign_keys=[created_by_id])
