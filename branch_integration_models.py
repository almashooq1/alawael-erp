"""
نماذج نظام ربط الفروع مع بعض
Branch Integration System Models
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from enum import Enum
import json

from database import db

class BranchStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    SUSPENDED = "suspended"

class ConnectionType(Enum):
    FULL_SYNC = "full_sync"
    PARTIAL_SYNC = "partial_sync"
    READ_ONLY = "read_only"
    WRITE_ONLY = "write_only"

class DataSyncStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TransferStatus(Enum):
    REQUESTED = "requested"
    APPROVED = "approved"
    IN_TRANSIT = "in_transit"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class Branch(db.Model):
    """نموذج الفروع"""
    __tablename__ = 'branches'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    region = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    manager_name = db.Column(db.String(200))
    manager_phone = db.Column(db.String(20))
    manager_email = db.Column(db.String(120))
    
    # معلومات تقنية
    server_url = db.Column(db.String(500))
    api_key = db.Column(db.String(500))
    database_name = db.Column(db.String(100))
    timezone = db.Column(db.String(50), default='Asia/Riyadh')
    
    # الحالة والإعدادات
    status = db.Column(db.Enum(BranchStatus), default=BranchStatus.ACTIVE)
    is_main_branch = db.Column(db.Boolean, default=False)
    max_students = db.Column(db.Integer, default=500)
    current_students = db.Column(db.Integer, default=0)
    
    # بيانات إضافية
    extra_metadata = db.Column(db.JSON)
    
    # التواريخ
    established_date = db.Column(db.Date)
    last_sync = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    connections_from = db.relationship('BranchConnection', foreign_keys='BranchConnection.source_branch_id', backref='source_branch')
    connections_to = db.relationship('BranchConnection', foreign_keys='BranchConnection.target_branch_id', backref='target_branch')
    
    def __repr__(self):
        return f'<Branch {self.name} ({self.code})>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'address': self.address,
            'city': self.city,
            'region': self.region,
            'phone': self.phone,
            'email': self.email,
            'manager_name': self.manager_name,
            'manager_phone': self.manager_phone,
            'manager_email': self.manager_email,
            'status': self.status.value if self.status else None,
            'is_main_branch': self.is_main_branch,
            'max_students': self.max_students,
            'current_students': self.current_students,
            'established_date': self.established_date.isoformat() if self.established_date else None,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'metadata': self.metadata
        }

class BranchConnection(db.Model):
    """نموذج الاتصالات بين الفروع"""
    __tablename__ = 'branch_connections'
    
    id = db.Column(db.Integer, primary_key=True)
    source_branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    target_branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    
    connection_type = db.Column(db.Enum(ConnectionType), default=ConnectionType.PARTIAL_SYNC)
    is_active = db.Column(db.Boolean, default=True)
    
    # إعدادات المزامنة
    sync_students = db.Column(db.Boolean, default=True)
    sync_teachers = db.Column(db.Boolean, default=True)
    sync_programs = db.Column(db.Boolean, default=True)
    sync_assessments = db.Column(db.Boolean, default=False)
    sync_reports = db.Column(db.Boolean, default=True)
    sync_resources = db.Column(db.Boolean, default=False)
    
    # جدولة المزامنة
    sync_frequency = db.Column(db.String(50), default='daily')  # hourly, daily, weekly, manual
    last_sync = db.Column(db.DateTime)
    next_sync = db.Column(db.DateTime)
    
    # بيانات إضافية
    notes = db.Column(db.Text)
    extra_metadata = db.Column(db.JSON)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('source_branch_id', 'target_branch_id', name='unique_branch_connection'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'source_branch_id': self.source_branch_id,
            'target_branch_id': self.target_branch_id,
            'source_branch': self.source_branch.to_dict() if self.source_branch else None,
            'target_branch': self.target_branch.to_dict() if self.target_branch else None,
            'connection_type': self.connection_type.value if self.connection_type else None,
            'is_active': self.is_active,
            'sync_students': self.sync_students,
            'sync_teachers': self.sync_teachers,
            'sync_programs': self.sync_programs,
            'sync_assessments': self.sync_assessments,
            'sync_reports': self.sync_reports,
            'sync_resources': self.sync_resources,
            'sync_frequency': self.sync_frequency,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'next_sync': self.next_sync.isoformat() if self.next_sync else None,
            'notes': self.notes,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class DataSyncLog(db.Model):
    """سجل مزامنة البيانات"""
    __tablename__ = 'data_sync_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    connection_id = db.Column(db.Integer, db.ForeignKey('branch_connections.id'), nullable=False)
    
    sync_type = db.Column(db.String(100))  # students, teachers, programs, etc.
    status = db.Column(db.Enum(DataSyncStatus), default=DataSyncStatus.PENDING)
    
    # إحصائيات المزامنة
    total_records = db.Column(db.Integer, default=0)
    processed_records = db.Column(db.Integer, default=0)
    successful_records = db.Column(db.Integer, default=0)
    failed_records = db.Column(db.Integer, default=0)
    
    # التوقيتات
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    duration_seconds = db.Column(db.Integer)
    
    # تفاصيل إضافية
    error_message = db.Column(db.Text)
    sync_details = db.Column(db.JSON)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    connection = db.relationship('BranchConnection', backref='sync_logs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'connection_id': self.connection_id,
            'sync_type': self.sync_type,
            'status': self.status.value if self.status else None,
            'total_records': self.total_records,
            'processed_records': self.processed_records,
            'successful_records': self.successful_records,
            'failed_records': self.failed_records,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration_seconds': self.duration_seconds,
            'error_message': self.error_message,
            'sync_details': self.sync_details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class StudentTransfer(db.Model):
    """نموذج نقل الطلاب بين الفروع"""
    __tablename__ = 'student_transfers'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    from_branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    to_branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    
    # معلومات الطلب
    requested_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    status = db.Column(db.Enum(TransferStatus), default=TransferStatus.REQUESTED)
    
    # تفاصيل النقل
    transfer_reason = db.Column(db.Text)
    transfer_date = db.Column(db.Date)
    effective_date = db.Column(db.Date)
    
    # البيانات المنقولة
    transfer_academic_records = db.Column(db.Boolean, default=True)
    transfer_medical_records = db.Column(db.Boolean, default=True)
    transfer_assessments = db.Column(db.Boolean, default=True)
    transfer_programs = db.Column(db.Boolean, default=True)
    
    # ملاحظات
    notes = db.Column(db.Text)
    admin_notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='transfers')
    from_branch = db.relationship('Branch', foreign_keys=[from_branch_id])
    to_branch = db.relationship('Branch', foreign_keys=[to_branch_id])
    requester = db.relationship('User', foreign_keys=[requested_by])
    approver = db.relationship('User', foreign_keys=[approved_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'from_branch_id': self.from_branch_id,
            'to_branch_id': self.to_branch_id,
            'requested_by': self.requested_by,
            'approved_by': self.approved_by,
            'status': self.status.value if self.status else None,
            'transfer_reason': self.transfer_reason,
            'transfer_date': self.transfer_date.isoformat() if self.transfer_date else None,
            'effective_date': self.effective_date.isoformat() if self.effective_date else None,
            'transfer_academic_records': self.transfer_academic_records,
            'transfer_medical_records': self.transfer_medical_records,
            'transfer_assessments': self.transfer_assessments,
            'transfer_programs': self.transfer_programs,
            'notes': self.notes,
            'admin_notes': self.admin_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class SharedResource(db.Model):
    """نموذج الموارد المشتركة بين الفروع"""
    __tablename__ = 'shared_resources'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    resource_type = db.Column(db.String(100))  # document, video, assessment, program, etc.
    
    # معلومات المالك
    owner_branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # إعدادات المشاركة
    is_public = db.Column(db.Boolean, default=False)
    requires_approval = db.Column(db.Boolean, default=True)
    
    # معلومات الملف
    file_path = db.Column(db.String(500))
    file_size = db.Column(db.Integer)
    file_type = db.Column(db.String(100))
    
    # إحصائيات الاستخدام
    download_count = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)
    
    # بيانات إضافية
    tags = db.Column(db.JSON)
    extra_metadata = db.Column(db.JSON)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    owner_branch = db.relationship('Branch', backref='owned_resources')
    creator = db.relationship('User', backref='created_resources')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'resource_type': self.resource_type,
            'owner_branch_id': self.owner_branch_id,
            'created_by': self.created_by,
            'is_public': self.is_public,
            'requires_approval': self.requires_approval,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'download_count': self.download_count,
            'view_count': self.view_count,
            'tags': self.tags,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ResourceAccess(db.Model):
    """نموذج صلاحيات الوصول للموارد المشتركة"""
    __tablename__ = 'resource_access'
    
    id = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(db.Integer, db.ForeignKey('shared_resources.id'), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    
    # نوع الوصول
    access_type = db.Column(db.String(50), default='read')  # read, write, admin
    
    # معلومات الموافقة
    requested_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_at = db.Column(db.DateTime)
    
    # حالة الطلب
    is_approved = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # تواريخ الصلاحية
    valid_from = db.Column(db.DateTime)
    valid_until = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    resource = db.relationship('SharedResource', backref='access_permissions')
    branch = db.relationship('Branch', backref='resource_accesses')
    requester = db.relationship('User', foreign_keys=[requested_by])
    approver = db.relationship('User', foreign_keys=[approved_by])
    
    __table_args__ = (
        db.UniqueConstraint('resource_id', 'branch_id', name='unique_resource_branch_access'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'resource_id': self.resource_id,
            'branch_id': self.branch_id,
            'access_type': self.access_type,
            'requested_by': self.requested_by,
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'is_approved': self.is_approved,
            'is_active': self.is_active,
            'valid_from': self.valid_from.isoformat() if self.valid_from else None,
            'valid_until': self.valid_until.isoformat() if self.valid_until else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class InterBranchReport(db.Model):
    """نموذج التقارير المشتركة بين الفروع"""
    __tablename__ = 'inter_branch_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    report_type = db.Column(db.String(100))  # consolidated, comparative, summary
    
    # الفروع المشمولة
    included_branches = db.Column(db.JSON)  # قائمة بمعرفات الفروع
    
    # معلومات المنشئ
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    
    # فترة التقرير
    report_period_start = db.Column(db.Date)
    report_period_end = db.Column(db.Date)
    
    # بيانات التقرير
    report_data = db.Column(db.JSON)
    summary_statistics = db.Column(db.JSON)
    
    # حالة التقرير
    is_published = db.Column(db.Boolean, default=False)
    is_automated = db.Column(db.Boolean, default=False)
    
    # ملف التقرير
    file_path = db.Column(db.String(500))
    file_format = db.Column(db.String(20), default='pdf')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    creator = db.relationship('User', backref='created_inter_branch_reports')
    branch = db.relationship('Branch', backref='inter_branch_reports')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'report_type': self.report_type,
            'included_branches': self.included_branches,
            'created_by': self.created_by,
            'branch_id': self.branch_id,
            'report_period_start': self.report_period_start.isoformat() if self.report_period_start else None,
            'report_period_end': self.report_period_end.isoformat() if self.report_period_end else None,
            'report_data': self.report_data,
            'summary_statistics': self.summary_statistics,
            'is_published': self.is_published,
            'is_automated': self.is_automated,
            'file_path': self.file_path,
            'file_format': self.file_format,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
