"""
نماذج قاعدة البيانات لنظام الموافقات متعدد المستويات
Database Models for Multi-Level Approval System
"""

from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, JSON, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from app import db
import enum

class ApprovalStatus(enum.Enum):
    """حالات الموافقة"""
    PENDING = "pending"           # في الانتظار
    APPROVED = "approved"         # موافق عليه
    REJECTED = "rejected"         # مرفوض
    CANCELLED = "cancelled"       # ملغي
    EXPIRED = "expired"          # منتهي الصلاحية

class ApprovalType(enum.Enum):
    """أنواع الموافقات"""
    SEQUENTIAL = "sequential"     # متتالي (واحد تلو الآخر)
    PARALLEL = "parallel"        # متوازي (جميعاً في نفس الوقت)
    MAJORITY = "majority"        # أغلبية
    UNANIMOUS = "unanimous"      # إجماع

class ApprovalWorkflow(db.Model):
    """سير عمل الموافقات"""
    __tablename__ = 'approval_workflows'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, comment='اسم سير عمل الموافقة')
    description = Column(Text, comment='وصف سير العمل')
    approval_type = Column(Enum(ApprovalType), default=ApprovalType.SEQUENTIAL, comment='نوع الموافقة')
    
    # إعدادات عامة
    is_active = Column(Boolean, default=True, comment='نشط أم لا')
    auto_approve_amount = Column(Numeric(15, 2), comment='المبلغ للموافقة التلقائية')
    expiry_hours = Column(Integer, default=72, comment='ساعات انتهاء الصلاحية')
    
    # معايير التطبيق
    entity_type = Column(String(100), comment='نوع الكيان (leave_request, expense, etc.)')
    conditions = Column(JSON, comment='شروط تطبيق سير العمل')
    
    # بيانات التتبع
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    steps = relationship("ApprovalStep", back_populates="workflow", cascade="all, delete-orphan")
    requests = relationship("ApprovalRequest", back_populates="workflow")
    creator = relationship("User", foreign_keys=[created_by])
    
    def __repr__(self):
        return f'<ApprovalWorkflow {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'approval_type': self.approval_type.value if self.approval_type else None,
            'is_active': self.is_active,
            'auto_approve_amount': float(self.auto_approve_amount) if self.auto_approve_amount else None,
            'expiry_hours': self.expiry_hours,
            'entity_type': self.entity_type,
            'conditions': self.conditions,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'steps_count': len(self.steps) if self.steps else 0
        }

class ApprovalStep(db.Model):
    """خطوات الموافقة"""
    __tablename__ = 'approval_steps'
    
    id = Column(Integer, primary_key=True)
    workflow_id = Column(Integer, ForeignKey('approval_workflows.id'), nullable=False)
    step_order = Column(Integer, nullable=False, comment='ترتيب الخطوة')
    name = Column(String(200), nullable=False, comment='اسم الخطوة')
    description = Column(Text, comment='وصف الخطوة')
    
    # إعدادات الموافقة
    approver_type = Column(String(50), nullable=False, comment='نوع الموافق (user, role, department)')
    approver_id = Column(String(100), comment='معرف الموافق')
    approver_name = Column(String(200), comment='اسم الموافق')
    
    # شروط الخطوة
    conditions = Column(JSON, comment='شروط تفعيل الخطوة')
    min_amount = Column(Numeric(15, 2), comment='الحد الأدنى للمبلغ')
    max_amount = Column(Numeric(15, 2), comment='الحد الأقصى للمبلغ')
    
    # إعدادات الوقت
    timeout_hours = Column(Integer, default=24, comment='ساعات انتهاء المهلة')
    auto_approve = Column(Boolean, default=False, comment='موافقة تلقائية عند انتهاء المهلة')
    
    # إعدادات التصعيد
    escalation_enabled = Column(Boolean, default=False, comment='تفعيل التصعيد')
    escalation_hours = Column(Integer, comment='ساعات التصعيد')
    escalation_approver_type = Column(String(50), comment='نوع موافق التصعيد')
    escalation_approver_id = Column(String(100), comment='معرف موافق التصعيد')
    
    # بيانات التتبع
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # العلاقات
    workflow = relationship("ApprovalWorkflow", back_populates="steps")
    histories = relationship("ApprovalHistory", back_populates="step")
    
    def __repr__(self):
        return f'<ApprovalStep {self.name} - Order {self.step_order}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'workflow_id': self.workflow_id,
            'step_order': self.step_order,
            'name': self.name,
            'description': self.description,
            'approver_type': self.approver_type,
            'approver_id': self.approver_id,
            'approver_name': self.approver_name,
            'conditions': self.conditions,
            'min_amount': float(self.min_amount) if self.min_amount else None,
            'max_amount': float(self.max_amount) if self.max_amount else None,
            'timeout_hours': self.timeout_hours,
            'auto_approve': self.auto_approve,
            'escalation_enabled': self.escalation_enabled,
            'escalation_hours': self.escalation_hours,
            'is_active': self.is_active
        }

class ApprovalRequest(db.Model):
    """طلبات الموافقة"""
    __tablename__ = 'approval_requests'
    
    id = Column(Integer, primary_key=True)
    workflow_id = Column(Integer, ForeignKey('approval_workflows.id'), nullable=False)
    
    # بيانات الطلب
    title = Column(String(300), nullable=False, comment='عنوان الطلب')
    description = Column(Text, comment='وصف الطلب')
    entity_type = Column(String(100), nullable=False, comment='نوع الكيان')
    entity_id = Column(Integer, nullable=False, comment='معرف الكيان')
    
    # بيانات مالية
    amount = Column(Numeric(15, 2), comment='المبلغ')
    currency = Column(String(10), default='SAR', comment='العملة')
    
    # حالة الطلب
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, comment='حالة الطلب')
    current_step = Column(Integer, comment='الخطوة الحالية')
    
    # بيانات إضافية
    metadata = Column(JSON, comment='بيانات إضافية')
    attachments = Column(JSON, comment='المرفقات')
    
    # بيانات الوقت
    submitted_at = Column(DateTime, default=datetime.utcnow, comment='وقت التقديم')
    expires_at = Column(DateTime, comment='وقت انتهاء الصلاحية')
    completed_at = Column(DateTime, comment='وقت الإكمال')
    
    # بيانات المستخدم
    requester_id = Column(Integer, ForeignKey('users.id'), nullable=False, comment='مقدم الطلب')
    department_id = Column(Integer, comment='القسم')
    
    # إعدادات خاصة
    priority = Column(String(20), default='normal', comment='الأولوية')
    is_urgent = Column(Boolean, default=False, comment='عاجل')
    
    # العلاقات
    workflow = relationship("ApprovalWorkflow", back_populates="requests")
    requester = relationship("User", foreign_keys=[requester_id])
    histories = relationship("ApprovalHistory", back_populates="request", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<ApprovalRequest {self.title} - {self.status.value}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'workflow_id': self.workflow_id,
            'title': self.title,
            'description': self.description,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'amount': float(self.amount) if self.amount else None,
            'currency': self.currency,
            'status': self.status.value if self.status else None,
            'current_step': self.current_step,
            'metadata': self.metadata,
            'attachments': self.attachments,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'requester_id': self.requester_id,
            'department_id': self.department_id,
            'priority': self.priority,
            'is_urgent': self.is_urgent,
            'workflow_name': self.workflow.name if self.workflow else None,
            'requester_name': self.requester.name if self.requester else None
        }
    
    def get_current_step_info(self):
        """الحصول على معلومات الخطوة الحالية"""
        if not self.current_step:
            return None
        
        step = ApprovalStep.query.filter_by(
            workflow_id=self.workflow_id,
            step_order=self.current_step
        ).first()
        
        return step.to_dict() if step else None
    
    def is_expired(self):
        """فحص انتهاء صلاحية الطلب"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    def calculate_expiry(self):
        """حساب وقت انتهاء الصلاحية"""
        if self.workflow and self.workflow.expiry_hours:
            self.expires_at = self.submitted_at + timedelta(hours=self.workflow.expiry_hours)

class ApprovalHistory(db.Model):
    """تاريخ الموافقات"""
    __tablename__ = 'approval_history'
    
    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey('approval_requests.id'), nullable=False)
    step_id = Column(Integer, ForeignKey('approval_steps.id'))
    
    # بيانات الإجراء
    action = Column(String(50), nullable=False, comment='الإجراء (approve, reject, delegate, etc.)')
    status = Column(Enum(ApprovalStatus), nullable=False, comment='الحالة')
    
    # بيانات الموافق
    approver_id = Column(Integer, ForeignKey('users.id'), comment='الموافق')
    approver_name = Column(String(200), comment='اسم الموافق')
    approver_role = Column(String(100), comment='دور الموافق')
    
    # تفاصيل الإجراء
    comments = Column(Text, comment='التعليقات')
    reason = Column(String(500), comment='السبب')
    
    # بيانات إضافية
    metadata = Column(JSON, comment='بيانات إضافية')
    ip_address = Column(String(45), comment='عنوان IP')
    user_agent = Column(String(500), comment='معلومات المتصفح')
    
    # بيانات الوقت
    created_at = Column(DateTime, default=datetime.utcnow, comment='وقت الإجراء')
    
    # التفويض
    delegated_from = Column(Integer, ForeignKey('users.id'), comment='مفوض من')
    delegation_reason = Column(String(500), comment='سبب التفويض')
    
    # العلاقات
    request = relationship("ApprovalRequest", back_populates="histories")
    step = relationship("ApprovalStep", back_populates="histories")
    approver = relationship("User", foreign_keys=[approver_id])
    delegator = relationship("User", foreign_keys=[delegated_from])
    
    def __repr__(self):
        return f'<ApprovalHistory {self.action} - {self.status.value}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'step_id': self.step_id,
            'action': self.action,
            'status': self.status.value if self.status else None,
            'approver_id': self.approver_id,
            'approver_name': self.approver_name,
            'approver_role': self.approver_role,
            'comments': self.comments,
            'reason': self.reason,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'delegated_from': self.delegated_from,
            'delegation_reason': self.delegation_reason,
            'step_name': self.step.name if self.step else None
        }

class ApprovalDelegate(db.Model):
    """تفويض الموافقات"""
    __tablename__ = 'approval_delegates'
    
    id = Column(Integer, primary_key=True)
    
    # بيانات التفويض
    delegator_id = Column(Integer, ForeignKey('users.id'), nullable=False, comment='المفوِض')
    delegate_id = Column(Integer, ForeignKey('users.id'), nullable=False, comment='المفوَض إليه')
    
    # نطاق التفويض
    workflow_id = Column(Integer, ForeignKey('approval_workflows.id'), comment='سير عمل محدد')
    entity_type = Column(String(100), comment='نوع كيان محدد')
    max_amount = Column(Numeric(15, 2), comment='الحد الأقصى للمبلغ')
    
    # فترة التفويض
    start_date = Column(DateTime, nullable=False, comment='تاريخ البداية')
    end_date = Column(DateTime, nullable=False, comment='تاريخ النهاية')
    
    # حالة التفويض
    is_active = Column(Boolean, default=True, comment='نشط')
    reason = Column(String(500), comment='سبب التفويض')
    
    # بيانات التتبع
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    delegator = relationship("User", foreign_keys=[delegator_id])
    delegate = relationship("User", foreign_keys=[delegate_id])
    workflow = relationship("ApprovalWorkflow")
    creator = relationship("User", foreign_keys=[created_by])
    
    def __repr__(self):
        return f'<ApprovalDelegate {self.delegator_id} -> {self.delegate_id}>'
    
    def is_valid(self):
        """فحص صحة التفويض"""
        now = datetime.utcnow()
        return (self.is_active and 
                self.start_date <= now <= self.end_date)
    
    def to_dict(self):
        return {
            'id': self.id,
            'delegator_id': self.delegator_id,
            'delegate_id': self.delegate_id,
            'workflow_id': self.workflow_id,
            'entity_type': self.entity_type,
            'max_amount': float(self.max_amount) if self.max_amount else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'is_active': self.is_active,
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'delegator_name': self.delegator.name if self.delegator else None,
            'delegate_name': self.delegate.name if self.delegate else None,
            'workflow_name': self.workflow.name if self.workflow else None
        }

class ApprovalNotification(db.Model):
    """إشعارات الموافقات"""
    __tablename__ = 'approval_notifications'
    
    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey('approval_requests.id'), nullable=False)
    
    # بيانات الإشعار
    notification_type = Column(String(50), nullable=False, comment='نوع الإشعار')
    recipient_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # محتوى الإشعار
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    
    # حالة الإشعار
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime)
    
    # قنوات الإرسال
    channels = Column(JSON, comment='قنوات الإرسال (email, sms, push)')
    
    # بيانات التتبع
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # العلاقات
    request = relationship("ApprovalRequest")
    recipient = relationship("User")
    
    def __repr__(self):
        return f'<ApprovalNotification {self.notification_type}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'notification_type': self.notification_type,
            'recipient_id': self.recipient_id,
            'title': self.title,
            'message': self.message,
            'is_sent': self.is_sent,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'channels': self.channels,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'recipient_name': self.recipient.name if self.recipient else None
        }

# إنشاء فهارس لتحسين الأداء
from sqlalchemy import Index

# فهارس للبحث السريع
Index('idx_approval_requests_status', ApprovalRequest.status)
Index('idx_approval_requests_requester', ApprovalRequest.requester_id)
Index('idx_approval_requests_workflow', ApprovalRequest.workflow_id)
Index('idx_approval_requests_entity', ApprovalRequest.entity_type, ApprovalRequest.entity_id)
Index('idx_approval_history_request', ApprovalHistory.request_id)
Index('idx_approval_history_approver', ApprovalHistory.approver_id)
Index('idx_approval_steps_workflow', ApprovalStep.workflow_id, ApprovalStep.step_order)
Index('idx_approval_delegates_active', ApprovalDelegate.delegator_id, ApprovalDelegate.is_active)
Index('idx_approval_notifications_recipient', ApprovalNotification.recipient_id, ApprovalNotification.is_read)
