# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات لنظام التكامل والاتصالات
Integration and Communication System Database Models
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from app import db
import enum

# ==================== External System Integration Models ====================

class ExternalSystemType(enum.Enum):
    """أنواع الأنظمة الخارجية"""
    HOSPITAL = "hospital"
    INSURANCE = "insurance"
    PAYMENT = "payment"
    GOVERNMENT = "government"
    EDUCATION = "education"
    LABORATORY = "laboratory"
    PHARMACY = "pharmacy"

class ExternalSystem(db.Model):
    """الأنظمة الخارجية"""
    __tablename__ = 'external_systems'
    
    id = Column(Integer, primary_key=True)
    system_name = Column(String(200), nullable=False)
    system_name_en = Column(String(200))
    system_type = Column(Enum(ExternalSystemType), nullable=False)
    description = Column(Text)
    
    # Connection details
    api_endpoint = Column(String(500))
    api_key = Column(String(500))
    username = Column(String(200))
    password_hash = Column(String(500))
    
    # Configuration
    is_active = Column(Boolean, default=True)
    connection_timeout = Column(Integer, default=30)
    retry_attempts = Column(Integer, default=3)
    rate_limit = Column(Integer, default=100)  # requests per minute
    
    # Authentication
    auth_type = Column(String(50), default='api_key')  # api_key, oauth, basic
    oauth_token = Column(Text)
    oauth_refresh_token = Column(Text)
    token_expires_at = Column(DateTime)
    
    # Status
    last_connection_test = Column(DateTime)
    connection_status = Column(String(50), default='unknown')  # active, inactive, error
    last_error_message = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    integrations = relationship("SystemIntegration", back_populates="external_system")
    sync_logs = relationship("DataSyncLog", back_populates="external_system")

class SystemIntegration(db.Model):
    """تكامل الأنظمة"""
    __tablename__ = 'system_integrations'
    
    id = Column(Integer, primary_key=True)
    external_system_id = Column(Integer, ForeignKey('external_systems.id'), nullable=False)
    integration_name = Column(String(200), nullable=False)
    integration_type = Column(String(100), nullable=False)  # data_sync, api_call, webhook
    
    # Configuration
    source_endpoint = Column(String(500))
    target_endpoint = Column(String(500))
    data_mapping = Column(JSON)  # Field mapping configuration
    sync_frequency = Column(String(50))  # hourly, daily, weekly, real_time
    
    # Filters and conditions
    sync_conditions = Column(JSON)
    data_filters = Column(JSON)
    
    # Status
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime)
    next_sync = Column(DateTime)
    sync_status = Column(String(50), default='pending')  # pending, running, completed, failed
    
    # Statistics
    total_syncs = Column(Integer, default=0)
    successful_syncs = Column(Integer, default=0)
    failed_syncs = Column(Integer, default=0)
    last_sync_duration = Column(Float)  # seconds
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    external_system = relationship("ExternalSystem", back_populates="integrations")
    creator = relationship("User", foreign_keys=[created_by])
    sync_logs = relationship("DataSyncLog", back_populates="integration")

class DataSyncLog(db.Model):
    """سجل مزامنة البيانات"""
    __tablename__ = 'data_sync_logs'
    
    id = Column(Integer, primary_key=True)
    external_system_id = Column(Integer, ForeignKey('external_systems.id'), nullable=False)
    integration_id = Column(Integer, ForeignKey('system_integrations.id'))
    
    # Sync details
    sync_type = Column(String(100), nullable=False)  # import, export, bidirectional
    operation = Column(String(100))  # create, update, delete, read
    entity_type = Column(String(100))  # patient, appointment, payment, etc.
    entity_id = Column(String(200))
    
    # Status
    status = Column(String(50), nullable=False)  # pending, running, completed, failed
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime)
    duration = Column(Float)  # seconds
    
    # Data
    records_processed = Column(Integer, default=0)
    records_successful = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    
    # Request/Response
    request_data = Column(JSON)
    response_data = Column(JSON)
    error_message = Column(Text)
    error_details = Column(JSON)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    external_system = relationship("ExternalSystem", back_populates="sync_logs")
    integration = relationship("SystemIntegration", back_populates="sync_logs")
    creator = relationship("User", foreign_keys=[created_by])

# ==================== Communication System Models ====================

class CommunicationChannel(enum.Enum):
    """قنوات الاتصال"""
    SMS = "sms"
    EMAIL = "email"
    PUSH_NOTIFICATION = "push_notification"
    WHATSAPP = "whatsapp"
    VOICE_CALL = "voice_call"
    IN_APP = "in_app"

class MessageTemplate(db.Model):
    """قوالب الرسائل"""
    __tablename__ = 'message_templates'
    
    id = Column(Integer, primary_key=True)
    template_name = Column(String(200), nullable=False)
    template_name_en = Column(String(200))
    description = Column(Text)
    
    # Template content
    subject = Column(String(500))  # For email
    content = Column(Text, nullable=False)
    content_en = Column(Text)
    
    # Configuration
    channel = Column(Enum(CommunicationChannel), nullable=False)
    category = Column(String(100))  # appointment, reminder, alert, notification
    priority = Column(String(50), default='normal')  # low, normal, high, urgent
    
    # Variables and placeholders
    variables = Column(JSON)  # List of available variables
    sample_data = Column(JSON)  # Sample data for testing
    
    # Status
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    messages = relationship("CommunicationMessage", back_populates="template")

class CommunicationMessage(db.Model):
    """رسائل الاتصال"""
    __tablename__ = 'communication_messages'
    
    id = Column(Integer, primary_key=True)
    template_id = Column(Integer, ForeignKey('message_templates.id'))
    
    # Recipients
    recipient_type = Column(String(50), nullable=False)  # user, patient, parent, staff
    recipient_id = Column(Integer)
    recipient_phone = Column(String(20))
    recipient_email = Column(String(200))
    recipient_name = Column(String(200))
    
    # Message content
    channel = Column(Enum(CommunicationChannel), nullable=False)
    subject = Column(String(500))
    content = Column(Text, nullable=False)
    priority = Column(String(50), default='normal')
    
    # Scheduling
    scheduled_at = Column(DateTime)
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    read_at = Column(DateTime)
    
    # Status
    status = Column(String(50), default='pending')  # pending, sent, delivered, read, failed
    delivery_attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    
    # Response tracking
    response_received = Column(Boolean, default=False)
    response_content = Column(Text)
    response_time = Column(DateTime)
    
    # External service details
    external_message_id = Column(String(200))
    service_provider = Column(String(100))
    cost = Column(Float)
    
    # Error handling
    error_message = Column(Text)
    error_code = Column(String(50))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    template = relationship("MessageTemplate", back_populates="messages")
    creator = relationship("User", foreign_keys=[created_by])

class CommunicationCampaign(db.Model):
    """حملات الاتصال"""
    __tablename__ = 'communication_campaigns'
    
    id = Column(Integer, primary_key=True)
    campaign_name = Column(String(200), nullable=False)
    campaign_name_en = Column(String(200))
    description = Column(Text)
    
    # Campaign configuration
    template_id = Column(Integer, ForeignKey('message_templates.id'), nullable=False)
    channel = Column(Enum(CommunicationChannel), nullable=False)
    target_audience = Column(JSON)  # Criteria for selecting recipients
    
    # Scheduling
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    send_immediately = Column(Boolean, default=False)
    
    # Status
    status = Column(String(50), default='draft')  # draft, scheduled, running, completed, paused, cancelled
    total_recipients = Column(Integer, default=0)
    messages_sent = Column(Integer, default=0)
    messages_delivered = Column(Integer, default=0)
    messages_failed = Column(Integer, default=0)
    
    # Budget and cost
    estimated_cost = Column(Float)
    actual_cost = Column(Float)
    budget_limit = Column(Float)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    template = relationship("MessageTemplate", foreign_keys=[template_id])
    creator = relationship("User", foreign_keys=[created_by])

class NotificationRule(db.Model):
    """قواعد الإشعارات التلقائية"""
    __tablename__ = 'notification_rules'
    
    id = Column(Integer, primary_key=True)
    rule_name = Column(String(200), nullable=False)
    rule_name_en = Column(String(200))
    description = Column(Text)
    
    # Trigger conditions
    trigger_event = Column(String(100), nullable=False)  # appointment_created, payment_due, etc.
    trigger_conditions = Column(JSON)  # Specific conditions to check
    
    # Timing
    trigger_timing = Column(String(50), default='immediate')  # immediate, delayed, scheduled
    delay_minutes = Column(Integer, default=0)
    
    # Recipients
    recipient_rules = Column(JSON)  # Rules for selecting recipients
    
    # Message configuration
    template_id = Column(Integer, ForeignKey('message_templates.id'), nullable=False)
    channel = Column(Enum(CommunicationChannel), nullable=False)
    priority = Column(String(50), default='normal')
    
    # Status and control
    is_active = Column(Boolean, default=True)
    execution_count = Column(Integer, default=0)
    last_executed = Column(DateTime)
    
    # Limits
    max_executions_per_day = Column(Integer)
    max_executions_per_recipient = Column(Integer)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    template = relationship("MessageTemplate", foreign_keys=[template_id])
    creator = relationship("User", foreign_keys=[created_by])

class CommunicationSettings(db.Model):
    """إعدادات الاتصال"""
    __tablename__ = 'communication_settings'
    
    id = Column(Integer, primary_key=True)
    setting_key = Column(String(100), nullable=False, unique=True)
    setting_value = Column(Text)
    setting_type = Column(String(50), default='string')  # string, integer, boolean, json
    
    # SMS Settings
    sms_provider = Column(String(100))
    sms_api_key = Column(String(500))
    sms_sender_name = Column(String(50))
    sms_rate_limit = Column(Integer, default=100)
    
    # Email Settings
    email_provider = Column(String(100))
    smtp_host = Column(String(200))
    smtp_port = Column(Integer)
    smtp_username = Column(String(200))
    smtp_password = Column(String(500))
    email_from_address = Column(String(200))
    email_from_name = Column(String(200))
    
    # Push Notification Settings
    push_provider = Column(String(100))
    push_api_key = Column(String(500))
    push_app_id = Column(String(200))
    
    # WhatsApp Settings
    whatsapp_provider = Column(String(100))
    whatsapp_api_key = Column(String(500))
    whatsapp_phone_number = Column(String(20))
    
    # General Settings
    default_language = Column(String(10), default='ar')
    timezone = Column(String(50), default='Asia/Riyadh')
    retry_failed_messages = Column(Boolean, default=True)
    max_retry_attempts = Column(Integer, default=3)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    updater = relationship("User", foreign_keys=[updated_by])

# ==================== Payment Integration Models ====================

class PaymentProvider(db.Model):
    """مقدمي خدمات الدفع"""
    __tablename__ = 'payment_providers'
    
    id = Column(Integer, primary_key=True)
    provider_name = Column(String(200), nullable=False)
    provider_name_en = Column(String(200))
    provider_type = Column(String(100))  # bank, payment_gateway, wallet
    
    # API Configuration
    api_endpoint = Column(String(500))
    api_key = Column(String(500))
    merchant_id = Column(String(200))
    secret_key = Column(String(500))
    
    # Supported features
    supports_recurring = Column(Boolean, default=False)
    supports_refunds = Column(Boolean, default=False)
    supports_installments = Column(Boolean, default=False)
    supported_currencies = Column(JSON)
    
    # Fees and limits
    transaction_fee_percentage = Column(Float, default=0.0)
    transaction_fee_fixed = Column(Float, default=0.0)
    minimum_amount = Column(Float, default=1.0)
    maximum_amount = Column(Float)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_test_mode = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    transactions = relationship("PaymentTransaction", back_populates="provider")

class PaymentTransaction(db.Model):
    """معاملات الدفع"""
    __tablename__ = 'payment_transactions'
    
    id = Column(Integer, primary_key=True)
    transaction_id = Column(String(200), unique=True, nullable=False)
    provider_id = Column(Integer, ForeignKey('payment_providers.id'), nullable=False)
    
    # Transaction details
    patient_id = Column(Integer, ForeignKey('patients.id'))
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default='SAR')
    description = Column(Text)
    
    # Payment method
    payment_method = Column(String(100))  # card, bank_transfer, wallet, cash
    card_last_four = Column(String(4))
    card_brand = Column(String(50))
    
    # Status
    status = Column(String(50), default='pending')  # pending, processing, completed, failed, refunded
    external_transaction_id = Column(String(200))
    
    # Timestamps
    initiated_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Response data
    provider_response = Column(JSON)
    error_message = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    provider = relationship("PaymentProvider", back_populates="transactions")
    patient = relationship("Patient", foreign_keys=[patient_id])
    creator = relationship("User", foreign_keys=[created_by])

# ==================== Insurance Integration Models ====================

class InsuranceProvider(db.Model):
    """شركات التأمين"""
    __tablename__ = 'insurance_providers'
    
    id = Column(Integer, primary_key=True)
    provider_name = Column(String(200), nullable=False)
    provider_name_en = Column(String(200))
    provider_code = Column(String(50), unique=True)
    
    # Contact information
    contact_phone = Column(String(20))
    contact_email = Column(String(200))
    website = Column(String(500))
    
    # API Integration
    api_endpoint = Column(String(500))
    api_key = Column(String(500))
    username = Column(String(200))
    password_hash = Column(String(500))
    
    # Coverage details
    coverage_types = Column(JSON)
    supported_services = Column(JSON)
    
    # Status
    is_active = Column(Boolean, default=True)
    contract_start_date = Column(DateTime)
    contract_end_date = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    claims = relationship("InsuranceClaim", back_populates="provider")

class InsuranceClaim(db.Model):
    """مطالبات التأمين"""
    __tablename__ = 'insurance_claims'
    
    id = Column(Integer, primary_key=True)
    claim_number = Column(String(200), unique=True, nullable=False)
    provider_id = Column(Integer, ForeignKey('insurance_providers.id'), nullable=False)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    
    # Claim details
    service_date = Column(DateTime, nullable=False)
    service_type = Column(String(200))
    diagnosis_code = Column(String(50))
    treatment_code = Column(String(50))
    
    # Financial details
    claimed_amount = Column(Float, nullable=False)
    approved_amount = Column(Float)
    patient_copay = Column(Float)
    
    # Status
    status = Column(String(50), default='submitted')  # submitted, under_review, approved, rejected, paid
    submission_date = Column(DateTime, default=datetime.utcnow)
    approval_date = Column(DateTime)
    payment_date = Column(DateTime)
    
    # External reference
    external_claim_id = Column(String(200))
    
    # Documentation
    supporting_documents = Column(JSON)
    notes = Column(Text)
    rejection_reason = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    provider = relationship("InsuranceProvider", back_populates="claims")
    patient = relationship("Patient", foreign_keys=[patient_id])
    creator = relationship("User", foreign_keys=[created_by])
