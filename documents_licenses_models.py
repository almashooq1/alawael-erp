#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
نماذج قاعدة البيانات لنظام السجلات التجارية والرخص والإقامات والوثائق
Database models for business records, licenses, residencies and documents system
"""

from datetime import datetime, timedelta
from enum import Enum
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum, Numeric, Date, JSON
from sqlalchemy.orm import relationship
from app import db

# تعدادات النظام / System Enums

class DocumentType(Enum):
    """أنواع الوثائق"""
    BUSINESS_REGISTRATION = "business_registration"  # السجل التجاري
    COMMERCIAL_LICENSE = "commercial_license"        # الرخصة التجارية
    MUNICIPAL_LICENSE = "municipal_license"          # رخصة البلدية
    CIVIL_DEFENSE_LICENSE = "civil_defense_license"  # رخصة الدفاع المدني
    HEALTH_LICENSE = "health_license"               # الرخصة الصحية
    LABOR_LICENSE = "labor_license"                 # رخصة العمل
    RESIDENCE_PERMIT = "residence_permit"           # الإقامة
    WORK_PERMIT = "work_permit"                     # رخصة العمل
    NATIONAL_ID = "national_id"                     # بطاقة الأحوال المدنية
    PASSPORT = "passport"                           # جواز السفر
    DRIVING_LICENSE = "driving_license"             # رخصة القيادة
    VEHICLE_REGISTRATION = "vehicle_registration"   # استمارة المركبة
    VEHICLE_INSURANCE = "vehicle_insurance"         # تأمين المركبة
    PROFESSIONAL_LICENSE = "professional_license"   # الرخصة المهنية
    TAX_CERTIFICATE = "tax_certificate"            # شهادة الزكاة والضريبة
    CHAMBER_MEMBERSHIP = "chamber_membership"       # عضوية الغرفة التجارية

class DocumentStatus(Enum):
    """حالة الوثيقة"""
    ACTIVE = "active"           # سارية
    EXPIRED = "expired"         # منتهية الصلاحية
    PENDING = "pending"         # قيد المراجعة
    SUSPENDED = "suspended"     # معلقة
    CANCELLED = "cancelled"     # ملغية
    RENEWAL_REQUIRED = "renewal_required"  # تحتاج تجديد

class ReminderType(Enum):
    """نوع التذكير"""
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    SYSTEM = "system"

class ReminderStatus(Enum):
    """حالة التذكير"""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"

class EntityType(Enum):
    """نوع الكيان"""
    EMPLOYEE = "employee"       # موظف
    VEHICLE = "vehicle"         # مركبة
    BUSINESS = "business"       # نشاط تجاري
    INDIVIDUAL = "individual"   # فرد

# النماذج الأساسية / Base Models

class DocumentCategory(db.Model):
    """فئات الوثائق"""
    __tablename__ = 'document_categories'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    name_en = Column(String(100))
    description = Column(Text)
    icon = Column(String(50))
    color = Column(String(20))
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    
    # العلاقات
    documents = relationship('Document', back_populates='category', lazy='dynamic')
    
    # الطوابع الزمنية
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<DocumentCategory {self.name}>'

class Document(db.Model):
    """الوثائق والرخص الأساسية"""
    __tablename__ = 'documents'
    
    id = Column(Integer, primary_key=True)
    document_number = Column(String(100), unique=True, nullable=False, index=True)
    document_type = Column(SQLEnum(DocumentType), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    # معلومات الكيان المرتبط
    entity_type = Column(SQLEnum(EntityType), nullable=False)
    entity_id = Column(Integer, nullable=False)  # ID الموظف أو المركبة أو النشاط
    entity_name = Column(String(200))  # اسم الكيان للبحث السريع
    
    # فئة الوثيقة
    category_id = Column(Integer, ForeignKey('document_categories.id'))
    category = relationship('DocumentCategory', back_populates='documents')
    
    # تواريخ مهمة
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    renewal_date = Column(Date)  # تاريخ آخر تجديد
    
    # الحالة والأولوية
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.ACTIVE, index=True)
    priority = Column(Integer, default=1)  # 1=عادي، 2=مهم، 3=عاجل
    
    # الجهة المصدرة
    issuing_authority = Column(String(200))
    issuing_authority_en = Column(String(200))
    issuing_location = Column(String(100))
    
    # معلومات إضافية
    cost = Column(Numeric(10, 2))
    currency = Column(String(10), default='SAR')
    notes = Column(Text)
    tags = Column(JSON)  # علامات للبحث والتصنيف
    
    # ملفات مرفقة
    file_path = Column(String(500))
    file_name = Column(String(200))
    file_size = Column(Integer)
    file_type = Column(String(50))
    
    # إعدادات التذكير
    reminder_enabled = Column(Boolean, default=True)
    reminder_days_before = Column(JSON)  # [30, 15, 7, 1] أيام قبل الانتهاء
    
    # العلاقات
    reminders = relationship('DocumentReminder', back_populates='document', lazy='dynamic', cascade='all, delete-orphan')
    renewals = relationship('DocumentRenewal', back_populates='document', lazy='dynamic', cascade='all, delete-orphan')
    attachments = relationship('DocumentAttachment', back_populates='document', lazy='dynamic', cascade='all, delete-orphan')
    
    # الطوابع الزمنية
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    # الفهارس
    __table_args__ = (
        db.Index('idx_document_entity', 'entity_type', 'entity_id'),
        db.Index('idx_document_expiry_status', 'expiry_date', 'status'),
        db.Index('idx_document_type_status', 'document_type', 'status'),
    )
    
    @property
    def days_until_expiry(self):
        """عدد الأيام المتبقية حتى انتهاء الصلاحية"""
        if self.expiry_date:
            delta = self.expiry_date - datetime.now().date()
            return delta.days
        return None
    
    @property
    def is_expired(self):
        """هل الوثيقة منتهية الصلاحية"""
        return self.expiry_date and self.expiry_date < datetime.now().date()
    
    @property
    def is_expiring_soon(self, days=30):
        """هل الوثيقة ستنتهي قريباً"""
        days_left = self.days_until_expiry
        return days_left is not None and 0 <= days_left <= days
    
    def get_status_display(self):
        """عرض الحالة بالعربية"""
        status_map = {
            DocumentStatus.ACTIVE: 'سارية',
            DocumentStatus.EXPIRED: 'منتهية الصلاحية',
            DocumentStatus.PENDING: 'قيد المراجعة',
            DocumentStatus.SUSPENDED: 'معلقة',
            DocumentStatus.CANCELLED: 'ملغية',
            DocumentStatus.RENEWAL_REQUIRED: 'تحتاج تجديد'
        }
        return status_map.get(self.status, str(self.status.value))
    
    def get_type_display(self):
        """عرض نوع الوثيقة بالعربية"""
        type_map = {
            DocumentType.BUSINESS_REGISTRATION: 'السجل التجاري',
            DocumentType.COMMERCIAL_LICENSE: 'الرخصة التجارية',
            DocumentType.MUNICIPAL_LICENSE: 'رخصة البلدية',
            DocumentType.CIVIL_DEFENSE_LICENSE: 'رخصة الدفاع المدني',
            DocumentType.HEALTH_LICENSE: 'الرخصة الصحية',
            DocumentType.LABOR_LICENSE: 'رخصة العمل',
            DocumentType.RESIDENCE_PERMIT: 'الإقامة',
            DocumentType.WORK_PERMIT: 'رخصة العمل',
            DocumentType.NATIONAL_ID: 'بطاقة الأحوال المدنية',
            DocumentType.PASSPORT: 'جواز السفر',
            DocumentType.DRIVING_LICENSE: 'رخصة القيادة',
            DocumentType.VEHICLE_REGISTRATION: 'استمارة المركبة',
            DocumentType.VEHICLE_INSURANCE: 'تأمين المركبة',
            DocumentType.PROFESSIONAL_LICENSE: 'الرخصة المهنية',
            DocumentType.TAX_CERTIFICATE: 'شهادة الزكاة والضريبة',
            DocumentType.CHAMBER_MEMBERSHIP: 'عضوية الغرفة التجارية'
        }
        return type_map.get(self.document_type, str(self.document_type.value))
    
    def __repr__(self):
        return f'<Document {self.document_number}: {self.title}>'

class DocumentReminder(db.Model):
    """تذكيرات الوثائق"""
    __tablename__ = 'document_reminders'
    
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    document = relationship('Document', back_populates='reminders')
    
    # إعدادات التذكير
    reminder_type = Column(SQLEnum(ReminderType), nullable=False)
    days_before = Column(Integer, nullable=False)  # عدد الأيام قبل الانتهاء
    reminder_date = Column(DateTime, nullable=False, index=True)
    
    # المستلمون
    recipient_emails = Column(JSON)  # قائمة الإيميلات
    recipient_phones = Column(JSON)  # قائمة أرقام الهواتف
    recipient_users = Column(JSON)   # قائمة معرفات المستخدمين
    
    # المحتوى
    subject = Column(String(200))
    message = Column(Text)
    template_id = Column(Integer)  # معرف القالب المستخدم
    
    # الحالة والتتبع
    status = Column(SQLEnum(ReminderStatus), default=ReminderStatus.PENDING, index=True)
    sent_at = Column(DateTime)
    delivery_attempts = Column(Integer, default=0)
    last_attempt_at = Column(DateTime)
    error_message = Column(Text)
    
    # معلومات إضافية
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(JSON)  # نمط التكرار
    next_reminder_date = Column(DateTime)
    
    # الطوابع الزمنية
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<DocumentReminder {self.id}: {self.document.title}>'

class DocumentRenewal(db.Model):
    """تجديدات الوثائق"""
    __tablename__ = 'document_renewals'
    
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    document = relationship('Document', back_populates='renewals')
    
    # معلومات التجديد
    renewal_number = Column(String(100))
    previous_expiry_date = Column(Date, nullable=False)
    new_expiry_date = Column(Date, nullable=False)
    renewal_date = Column(Date, nullable=False)
    
    # التكاليف
    renewal_cost = Column(Numeric(10, 2))
    fees_paid = Column(Numeric(10, 2))
    currency = Column(String(10), default='SAR')
    
    # الجهة والموظف المسؤول
    renewed_by_authority = Column(String(200))
    renewed_by_employee = Column(String(100))
    processing_time_days = Column(Integer)
    
    # الملفات والوثائق
    receipt_number = Column(String(100))
    receipt_file_path = Column(String(500))
    new_document_file_path = Column(String(500))
    
    # ملاحظات ومتطلبات
    requirements_met = Column(JSON)  # قائمة المتطلبات المستوفاة
    notes = Column(Text)
    next_renewal_reminder = Column(Date)
    
    # الطوابع الزمنية
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<DocumentRenewal {self.id}: {self.document.title}>'

class DocumentAttachment(db.Model):
    """مرفقات الوثائق"""
    __tablename__ = 'document_attachments'
    
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    document = relationship('Document', back_populates='attachments')
    
    # معلومات الملف
    file_name = Column(String(200), nullable=False)
    original_name = Column(String(200))
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    file_type = Column(String(50))
    mime_type = Column(String(100))
    
    # التصنيف والوصف
    attachment_type = Column(String(50))  # original, copy, translation, etc.
    title = Column(String(200))
    description = Column(Text)
    
    # الأمان والصلاحيات
    is_confidential = Column(Boolean, default=False)
    access_level = Column(String(20), default='internal')  # public, internal, restricted
    
    # معلومات إضافية
    version = Column(String(20), default='1.0')
    checksum = Column(String(64))  # للتحقق من سلامة الملف
    
    # الطوابع الزمنية
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<DocumentAttachment {self.file_name}>'

class BusinessEntity(db.Model):
    """الكيانات التجارية"""
    __tablename__ = 'business_entities'
    
    id = Column(Integer, primary_key=True)
    
    # معلومات أساسية
    business_name = Column(String(200), nullable=False)
    business_name_en = Column(String(200))
    commercial_registration = Column(String(50), unique=True, index=True)
    tax_number = Column(String(50), unique=True)
    
    # نوع النشاط
    business_type = Column(String(100))
    business_activity = Column(Text)
    industry_sector = Column(String(100))
    
    # معلومات الاتصال
    address = Column(Text)
    city = Column(String(100))
    region = Column(String(100))
    postal_code = Column(String(20))
    phone = Column(String(20))
    email = Column(String(100))
    website = Column(String(200))
    
    # معلومات قانونية
    legal_form = Column(String(50))  # مؤسسة، شركة، إلخ
    capital = Column(Numeric(15, 2))
    establishment_date = Column(Date)
    
    # الحالة
    is_active = Column(Boolean, default=True)
    status_notes = Column(Text)
    
    # الطوابع الزمنية
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<BusinessEntity {self.business_name}>'

class VehicleDocument(db.Model):
    """وثائق المركبات المتخصصة"""
    __tablename__ = 'vehicle_documents'
    
    id = Column(Integer, primary_key=True)
    
    # ربط بالوثيقة الأساسية
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    document = relationship('Document')
    
    # معلومات المركبة
    vehicle_id = Column(Integer, ForeignKey('vehicles.id'))
    plate_number = Column(String(20), index=True)
    chassis_number = Column(String(50))
    
    # معلومات التأمين (للتأمين فقط)
    insurance_company = Column(String(200))
    policy_number = Column(String(100))
    coverage_type = Column(String(100))
    coverage_amount = Column(Numeric(12, 2))
    deductible_amount = Column(Numeric(10, 2))
    
    # معلومات الترخيص (لاستمارة المركبة)
    license_class = Column(String(20))
    vehicle_use = Column(String(50))  # خاص، تجاري، إلخ
    
    # معلومات إضافية
    additional_info = Column(JSON)
    
    # الطوابع الزمنية
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<VehicleDocument {self.plate_number}>'

class EmployeeDocument(db.Model):
    """وثائق الموظفين المتخصصة"""
    __tablename__ = 'employee_documents'
    
    id = Column(Integer, primary_key=True)
    
    # ربط بالوثيقة الأساسية
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    document = relationship('Document')
    
    # معلومات الموظف
    employee_id = Column(Integer, ForeignKey('employees.id'))
    national_id = Column(String(20), index=True)
    passport_number = Column(String(20))
    
    # معلومات الإقامة/رخصة العمل
    sponsor_name = Column(String(200))
    job_title = Column(String(100))
    salary = Column(Numeric(10, 2))
    
    # معلومات رخصة القيادة
    license_class = Column(String(20))
    restrictions = Column(Text)
    
    # معلومات إضافية
    additional_info = Column(JSON)
    
    # الطوابع الزمنية
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<EmployeeDocument {self.national_id}>'

class DocumentAlert(db.Model):
    """تنبيهات الوثائق"""
    __tablename__ = 'document_alerts'
    
    id = Column(Integer, primary_key=True)
    
    # نوع التنبيه
    alert_type = Column(String(50), nullable=False)  # expiry, renewal_due, missing_document
    severity = Column(String(20), default='medium')  # low, medium, high, critical
    
    # الوثيقة المرتبطة
    document_id = Column(Integer, ForeignKey('documents.id'))
    document = relationship('Document')
    
    # المحتوى
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    action_required = Column(Text)
    
    # التوقيت
    alert_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    
    # الحالة
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolved_by = Column(Integer, ForeignKey('users.id'))
    
    # المستلمون
    assigned_to = Column(JSON)  # قائمة معرفات المستخدمين
    
    # الطوابع الزمنية
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<DocumentAlert {self.title}>'

class DocumentAuditLog(db.Model):
    """سجل مراجعة الوثائق"""
    __tablename__ = 'document_audit_logs'
    
    id = Column(Integer, primary_key=True)
    
    # الوثيقة والعملية
    document_id = Column(Integer, ForeignKey('documents.id'))
    document = relationship('Document')
    
    action = Column(String(50), nullable=False)  # create, update, delete, view, download
    description = Column(Text)
    
    # البيانات المتغيرة
    old_values = Column(JSON)
    new_values = Column(JSON)
    
    # معلومات المستخدم والجلسة
    user_id = Column(Integer, ForeignKey('users.id'))
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    
    # الطابع الزمني
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f'<DocumentAuditLog {self.action}: {self.document_id}>'
