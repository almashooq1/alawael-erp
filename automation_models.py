#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
نماذج قاعدة البيانات لنظام الأتمتة والرسائل المجدولة المتقدمة
Database Models for Advanced Automation and Scheduled Messaging System
"""

from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Enum, Decimal, Index
from sqlalchemy.orm import relationship
from app import db
import enum

class AutomationTriggerType(enum.Enum):
    """أنواع محفزات الأتمتة"""
    TIME_BASED = "time_based"  # مبني على الوقت
    EVENT_BASED = "event_based"  # مبني على الأحداث
    CONDITION_BASED = "condition_based"  # مبني على الشروط
    USER_ACTION = "user_action"  # إجراء المستخدم
    SYSTEM_EVENT = "system_event"  # حدث النظام

class MessageScheduleType(enum.Enum):
    """أنواع جدولة الرسائل"""
    IMMEDIATE = "immediate"  # فوري
    SCHEDULED = "scheduled"  # مجدول
    RECURRING = "recurring"  # متكرر
    CONDITIONAL = "conditional"  # شرطي
    TRIGGERED = "triggered"  # مُحفز

class AutomationStatus(enum.Enum):
    """حالات الأتمتة"""
    ACTIVE = "active"  # نشط
    INACTIVE = "inactive"  # غير نشط
    PAUSED = "paused"  # متوقف مؤقتاً
    COMPLETED = "completed"  # مكتمل
    FAILED = "failed"  # فشل
    DRAFT = "draft"  # مسودة

class AutomationWorkflow(db.Model):
    """نموذج سير العمل الآلي"""
    __tablename__ = 'automation_workflows'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, comment='اسم سير العمل')
    description = Column(Text, comment='وصف سير العمل')
    trigger_type = Column(Enum(AutomationTriggerType), nullable=False, comment='نوع المحفز')
    trigger_conditions = Column(JSON, comment='شروط التحفيز')
    
    # إعدادات التنفيذ
    execution_order = Column(Integer, default=1, comment='ترتيب التنفيذ')
    max_executions = Column(Integer, comment='الحد الأقصى للتنفيذ')
    execution_count = Column(Integer, default=0, comment='عدد مرات التنفيذ')
    
    # التوقيت والجدولة
    start_date = Column(DateTime, comment='تاريخ البداية')
    end_date = Column(DateTime, comment='تاريخ النهاية')
    schedule_pattern = Column(JSON, comment='نمط الجدولة')
    timezone = Column(String(50), default='Asia/Riyadh', comment='المنطقة الزمنية')
    
    # الحالة والمراقبة
    status = Column(Enum(AutomationStatus), default=AutomationStatus.DRAFT, comment='الحالة')
    is_active = Column(Boolean, default=True, comment='نشط')
    last_execution = Column(DateTime, comment='آخر تنفيذ')
    next_execution = Column(DateTime, comment='التنفيذ التالي')
    
    # البيانات الوصفية
    tags = Column(JSON, comment='العلامات')
    priority = Column(Integer, default=5, comment='الأولوية (1-10)')
    category = Column(String(100), comment='الفئة')
    
    # معلومات الإنشاء والتحديث
    created_at = Column(DateTime, default=datetime.utcnow, comment='تاريخ الإنشاء')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='تاريخ التحديث')
    created_by = Column(Integer, ForeignKey('users.id'), comment='منشئ سير العمل')
    updated_by = Column(Integer, ForeignKey('users.id'), comment='محدث سير العمل')
    
    # العلاقات
    actions = relationship("AutomationAction", back_populates="workflow", cascade="all, delete-orphan")
    executions = relationship("WorkflowExecution", back_populates="workflow", cascade="all, delete-orphan")
    scheduled_messages = relationship("ScheduledMessage", back_populates="workflow")
    
    # الفهارس
    __table_args__ = (
        Index('idx_workflow_status', 'status'),
        Index('idx_workflow_trigger_type', 'trigger_type'),
        Index('idx_workflow_next_execution', 'next_execution'),
        Index('idx_workflow_active', 'is_active'),
    )

class AutomationAction(db.Model):
    """نموذج إجراءات الأتمتة"""
    __tablename__ = 'automation_actions'
    
    id = Column(Integer, primary_key=True)
    workflow_id = Column(Integer, ForeignKey('automation_workflows.id'), nullable=False)
    name = Column(String(200), nullable=False, comment='اسم الإجراء')
    action_type = Column(String(100), nullable=False, comment='نوع الإجراء')
    
    # إعدادات الإجراء
    action_config = Column(JSON, comment='إعدادات الإجراء')
    parameters = Column(JSON, comment='معاملات الإجراء')
    conditions = Column(JSON, comment='شروط التنفيذ')
    
    # التسلسل والتحكم
    sequence_order = Column(Integer, default=1, comment='ترتيب التسلسل')
    is_conditional = Column(Boolean, default=False, comment='شرطي')
    retry_count = Column(Integer, default=0, comment='عدد المحاولات')
    max_retries = Column(Integer, default=3, comment='الحد الأقصى للمحاولات')
    
    # التوقيت
    delay_before = Column(Integer, default=0, comment='التأخير قبل التنفيذ (ثواني)')
    timeout = Column(Integer, default=300, comment='انتهاء المهلة (ثواني)')
    
    # الحالة
    is_active = Column(Boolean, default=True, comment='نشط')
    last_execution = Column(DateTime, comment='آخر تنفيذ')
    execution_count = Column(Integer, default=0, comment='عدد مرات التنفيذ')
    
    # معلومات الإنشاء
    created_at = Column(DateTime, default=datetime.utcnow, comment='تاريخ الإنشاء')
    created_by = Column(Integer, ForeignKey('users.id'), comment='منشئ الإجراء')
    
    # العلاقات
    workflow = relationship("AutomationWorkflow", back_populates="actions")
    executions = relationship("ActionExecution", back_populates="action", cascade="all, delete-orphan")

class ScheduledMessage(db.Model):
    """نموذج الرسائل المجدولة"""
    __tablename__ = 'scheduled_messages'
    
    id = Column(Integer, primary_key=True)
    workflow_id = Column(Integer, ForeignKey('automation_workflows.id'), nullable=True)
    
    # محتوى الرسالة
    subject = Column(String(500), comment='موضوع الرسالة')
    content = Column(Text, nullable=False, comment='محتوى الرسالة')
    message_type = Column(String(50), nullable=False, comment='نوع الرسالة')
    
    # المستقبلون
    recipients = Column(JSON, comment='المستقبلون')
    recipient_groups = Column(JSON, comment='مجموعات المستقبلين')
    recipient_filters = Column(JSON, comment='فلاتر المستقبلين')
    
    # الجدولة
    schedule_type = Column(Enum(MessageScheduleType), nullable=False, comment='نوع الجدولة')
    scheduled_time = Column(DateTime, comment='وقت الإرسال المجدول')
    recurrence_pattern = Column(JSON, comment='نمط التكرار')
    timezone = Column(String(50), default='Asia/Riyadh', comment='المنطقة الزمنية')
    
    # الشروط والمحفزات
    trigger_conditions = Column(JSON, comment='شروط التحفيز')
    send_conditions = Column(JSON, comment='شروط الإرسال')
    
    # الحالة والتتبع
    status = Column(String(50), default='scheduled', comment='الحالة')
    is_active = Column(Boolean, default=True, comment='نشط')
    sent_count = Column(Integer, default=0, comment='عدد مرات الإرسال')
    max_sends = Column(Integer, comment='الحد الأقصى للإرسال')
    
    # التوقيت
    last_sent = Column(DateTime, comment='آخر إرسال')
    next_send = Column(DateTime, comment='الإرسال التالي')
    expires_at = Column(DateTime, comment='تاريخ انتهاء الصلاحية')
    
    # الإعدادات المتقدمة
    priority = Column(Integer, default=5, comment='الأولوية')
    delivery_options = Column(JSON, comment='خيارات التسليم')
    tracking_enabled = Column(Boolean, default=True, comment='تفعيل التتبع')
    
    # معلومات الإنشاء
    created_at = Column(DateTime, default=datetime.utcnow, comment='تاريخ الإنشاء')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='تاريخ التحديث')
    created_by = Column(Integer, ForeignKey('users.id'), comment='منشئ الرسالة')
    
    # العلاقات
    workflow = relationship("AutomationWorkflow", back_populates="scheduled_messages")
    deliveries = relationship("MessageDelivery", back_populates="scheduled_message", cascade="all, delete-orphan")
    
    # الفهارس
    __table_args__ = (
        Index('idx_scheduled_message_next_send', 'next_send'),
        Index('idx_scheduled_message_status', 'status'),
        Index('idx_scheduled_message_type', 'message_type'),
    )

class WorkflowExecution(db.Model):
    """نموذج تنفيذ سير العمل"""
    __tablename__ = 'workflow_executions'
    
    id = Column(Integer, primary_key=True)
    workflow_id = Column(Integer, ForeignKey('automation_workflows.id'), nullable=False)
    
    # معلومات التنفيذ
    execution_id = Column(String(100), unique=True, comment='معرف التنفيذ')
    trigger_source = Column(String(100), comment='مصدر التحفيز')
    trigger_data = Column(JSON, comment='بيانات التحفيز')
    
    # التوقيت
    started_at = Column(DateTime, default=datetime.utcnow, comment='وقت البداية')
    completed_at = Column(DateTime, comment='وقت الانتهاء')
    duration = Column(Integer, comment='المدة (ثواني)')
    
    # الحالة والنتائج
    status = Column(String(50), default='running', comment='الحالة')
    result = Column(String(50), comment='النتيجة')
    error_message = Column(Text, comment='رسالة الخطأ')
    execution_log = Column(JSON, comment='سجل التنفيذ')
    
    # الإحصائيات
    actions_total = Column(Integer, default=0, comment='إجمالي الإجراءات')
    actions_completed = Column(Integer, default=0, comment='الإجراءات المكتملة')
    actions_failed = Column(Integer, default=0, comment='الإجراءات الفاشلة')
    
    # العلاقات
    workflow = relationship("AutomationWorkflow", back_populates="executions")
    action_executions = relationship("ActionExecution", back_populates="workflow_execution", cascade="all, delete-orphan")

class ActionExecution(db.Model):
    """نموذج تنفيذ الإجراءات"""
    __tablename__ = 'action_executions'
    
    id = Column(Integer, primary_key=True)
    workflow_execution_id = Column(Integer, ForeignKey('workflow_executions.id'), nullable=False)
    action_id = Column(Integer, ForeignKey('automation_actions.id'), nullable=False)
    
    # معلومات التنفيذ
    sequence_number = Column(Integer, comment='رقم التسلسل')
    started_at = Column(DateTime, default=datetime.utcnow, comment='وقت البداية')
    completed_at = Column(DateTime, comment='وقت الانتهاء')
    duration = Column(Integer, comment='المدة (ميلي ثانية)')
    
    # الحالة والنتائج
    status = Column(String(50), default='running', comment='الحالة')
    result = Column(String(50), comment='النتيجة')
    output_data = Column(JSON, comment='بيانات الإخراج')
    error_message = Column(Text, comment='رسالة الخطأ')
    
    # المحاولات
    attempt_number = Column(Integer, default=1, comment='رقم المحاولة')
    retry_count = Column(Integer, default=0, comment='عدد المحاولات')
    
    # العلاقات
    workflow_execution = relationship("WorkflowExecution", back_populates="action_executions")
    action = relationship("AutomationAction", back_populates="executions")

class MessageDelivery(db.Model):
    """نموذج تسليم الرسائل"""
    __tablename__ = 'message_deliveries'
    
    id = Column(Integer, primary_key=True)
    scheduled_message_id = Column(Integer, ForeignKey('scheduled_messages.id'), nullable=False)
    
    # معلومات المستقبل
    recipient_id = Column(Integer, comment='معرف المستقبل')
    recipient_type = Column(String(50), comment='نوع المستقبل')
    recipient_contact = Column(String(200), comment='معلومات الاتصال')
    
    # معلومات التسليم
    delivery_method = Column(String(50), comment='طريقة التسليم')
    sent_at = Column(DateTime, comment='وقت الإرسال')
    delivered_at = Column(DateTime, comment='وقت التسليم')
    read_at = Column(DateTime, comment='وقت القراءة')
    
    # الحالة والتتبع
    status = Column(String(50), default='pending', comment='الحالة')
    delivery_status = Column(String(50), comment='حالة التسليم')
    error_message = Column(Text, comment='رسالة الخطأ')
    
    # المحاولات
    attempt_count = Column(Integer, default=0, comment='عدد المحاولات')
    max_attempts = Column(Integer, default=3, comment='الحد الأقصى للمحاولات')
    next_retry = Column(DateTime, comment='المحاولة التالية')
    
    # التتبع المتقدم
    tracking_data = Column(JSON, comment='بيانات التتبع')
    response_data = Column(JSON, comment='بيانات الاستجابة')
    
    # العلاقات
    scheduled_message = relationship("ScheduledMessage", back_populates="deliveries")
    
    # الفهارس
    __table_args__ = (
        Index('idx_delivery_status', 'status'),
        Index('idx_delivery_sent_at', 'sent_at'),
        Index('idx_delivery_recipient', 'recipient_id', 'recipient_type'),
    )

class AutomationRule(db.Model):
    """نموذج قواعد الأتمتة"""
    __tablename__ = 'automation_rules'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, comment='اسم القاعدة')
    description = Column(Text, comment='وصف القاعدة')
    
    # شروط القاعدة
    conditions = Column(JSON, nullable=False, comment='شروط القاعدة')
    condition_logic = Column(String(10), default='AND', comment='منطق الشروط (AND/OR)')
    
    # الإجراءات
    actions = Column(JSON, nullable=False, comment='الإجراءات المطلوبة')
    action_parameters = Column(JSON, comment='معاملات الإجراءات')
    
    # الإعدادات
    priority = Column(Integer, default=5, comment='الأولوية')
    is_active = Column(Boolean, default=True, comment='نشط')
    execution_limit = Column(Integer, comment='حد التنفيذ')
    execution_count = Column(Integer, default=0, comment='عدد مرات التنفيذ')
    
    # التوقيت
    valid_from = Column(DateTime, comment='صالح من')
    valid_until = Column(DateTime, comment='صالح حتى')
    last_triggered = Column(DateTime, comment='آخر تحفيز')
    
    # معلومات الإنشاء
    created_at = Column(DateTime, default=datetime.utcnow, comment='تاريخ الإنشاء')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='تاريخ التحديث')
    created_by = Column(Integer, ForeignKey('users.id'), comment='منشئ القاعدة')
    
    # الفهارس
    __table_args__ = (
        Index('idx_rule_active', 'is_active'),
        Index('idx_rule_priority', 'priority'),
    )

class MessageTemplate(db.Model):
    """نموذج قوالب الرسائل"""
    __tablename__ = 'message_templates'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, comment='اسم القالب')
    description = Column(Text, comment='وصف القالب')
    category = Column(String(100), comment='فئة القالب')
    
    # محتوى القالب
    subject_template = Column(String(500), comment='قالب الموضوع')
    content_template = Column(Text, nullable=False, comment='قالب المحتوى')
    message_type = Column(String(50), nullable=False, comment='نوع الرسالة')
    
    # المتغيرات والمعاملات
    variables = Column(JSON, comment='المتغيرات المتاحة')
    default_values = Column(JSON, comment='القيم الافتراضية')
    validation_rules = Column(JSON, comment='قواعد التحقق')
    
    # الإعدادات
    is_active = Column(Boolean, default=True, comment='نشط')
    is_system = Column(Boolean, default=False, comment='قالب النظام')
    usage_count = Column(Integer, default=0, comment='عدد مرات الاستخدام')
    
    # معلومات الإنشاء
    created_at = Column(DateTime, default=datetime.utcnow, comment='تاريخ الإنشاء')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='تاريخ التحديث')
    created_by = Column(Integer, ForeignKey('users.id'), comment='منشئ القالب')
    
    # الفهارس
    __table_args__ = (
        Index('idx_template_category', 'category'),
        Index('idx_template_type', 'message_type'),
        Index('idx_template_active', 'is_active'),
    )

class AutomationLog(db.Model):
    """نموذج سجلات الأتمتة"""
    __tablename__ = 'automation_logs'
    
    id = Column(Integer, primary_key=True)
    
    # معلومات السجل
    log_type = Column(String(50), nullable=False, comment='نوع السجل')
    level = Column(String(20), default='INFO', comment='مستوى السجل')
    message = Column(Text, nullable=False, comment='رسالة السجل')
    
    # السياق
    workflow_id = Column(Integer, ForeignKey('automation_workflows.id'), comment='معرف سير العمل')
    execution_id = Column(String(100), comment='معرف التنفيذ')
    action_id = Column(Integer, comment='معرف الإجراء')
    
    # البيانات الإضافية
    context_data = Column(JSON, comment='بيانات السياق')
    error_details = Column(JSON, comment='تفاصيل الخطأ')
    
    # التوقيت
    timestamp = Column(DateTime, default=datetime.utcnow, comment='الطابع الزمني')
    
    # الفهارس
    __table_args__ = (
        Index('idx_log_type', 'log_type'),
        Index('idx_log_level', 'level'),
        Index('idx_log_timestamp', 'timestamp'),
        Index('idx_log_workflow', 'workflow_id'),
    )
