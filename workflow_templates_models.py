#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Workflow Templates System Models
Ready-to-use workflow templates for Al-Awael Centers
"""

# SQLAlchemy import removed - using centralized db instance
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, Enum as SQLEnum, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime, date
from enum import Enum
import uuid

# Import db from database module to avoid conflicts
from database import db

class WorkflowCategory(Enum):
    THERAPY_SESSION = "therapy_session"
    ASSESSMENT = "assessment"
    TREATMENT_PLAN = "treatment_plan"
    FAMILY_COMMUNICATION = "family_communication"
    DOCUMENTATION = "documentation"
    ADMINISTRATIVE = "administrative"
    QUALITY_ASSURANCE = "quality_assurance"
    EMERGENCY = "emergency"

class WorkflowStatus(Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"

class StepType(Enum):
    TASK = "task"
    DECISION = "decision"
    FORM = "form"
    NOTIFICATION = "notification"
    APPROVAL = "approval"
    DELAY = "delay"
    INTEGRATION = "integration"

class StepStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    FAILED = "failed"

class TriggerType(Enum):
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    EVENT_BASED = "event_based"
    CONDITION_BASED = "condition_based"

class WorkflowTemplate(db.Model):
    """Workflow template definitions"""
    __tablename__ = 'workflow_templates'
    
    id = Column(Integer, primary_key=True)
    template_uuid = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    description = Column(Text)
    description_ar = Column(Text)
    
    # Template configuration
    category = Column(SQLEnum(WorkflowCategory), nullable=False)
    version = Column(String(20), default='1.0')
    status = Column(SQLEnum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    
    # Template metadata
    tags = Column(JSON)  # List of tags for categorization
    estimated_duration = Column(Integer)  # Estimated duration in minutes
    complexity_level = Column(String(20), default='medium')  # low, medium, high
    
    # Template settings
    is_public = Column(Boolean, default=True)
    is_system_template = Column(Boolean, default=False)
    requires_approval = Column(Boolean, default=False)
    auto_assign = Column(Boolean, default=False)
    
    # Usage statistics
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    average_completion_time = Column(Integer)  # in minutes
    
    # Template structure
    workflow_config = Column(JSON)  # Complete workflow configuration
    input_schema = Column(JSON)  # Schema for input parameters
    output_schema = Column(JSON)  # Schema for output data
    
    # Triggers and conditions
    trigger_type = Column(SQLEnum(TriggerType), default=TriggerType.MANUAL)
    trigger_conditions = Column(JSON)  # Conditions for automatic triggering
    
    # Metadata
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_id = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    steps = relationship('WorkflowStep', back_populates='template', cascade='all, delete-orphan', order_by='WorkflowStep.step_order')
    instances = relationship('WorkflowInstance', back_populates='template', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<WorkflowTemplate {self.name}>'

class WorkflowStep(db.Model):
    """Individual steps within a workflow template"""
    __tablename__ = 'workflow_steps'
    
    id = Column(Integer, primary_key=True)
    template_id = Column(Integer, ForeignKey('workflow_templates.id'), nullable=False)
    step_uuid = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    
    # Step identification
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    description = Column(Text)
    description_ar = Column(Text)
    
    # Step configuration
    step_type = Column(SQLEnum(StepType), nullable=False)
    step_order = Column(Integer, nullable=False)
    is_required = Column(Boolean, default=True)
    is_parallel = Column(Boolean, default=False)
    
    # Step behavior
    estimated_duration = Column(Integer)  # in minutes
    auto_complete = Column(Boolean, default=False)
    requires_approval = Column(Boolean, default=False)
    can_skip = Column(Boolean, default=False)
    
    # Step configuration
    step_config = Column(JSON)  # Step-specific configuration
    form_schema = Column(JSON)  # Form schema if step_type is 'form'
    validation_rules = Column(JSON)  # Validation rules
    
    # Conditions and routing
    preconditions = Column(JSON)  # Conditions that must be met before step execution
    success_conditions = Column(JSON)  # Conditions for successful completion
    next_step_rules = Column(JSON)  # Rules for determining next step
    
    # Assignment
    assigned_role = Column(String(100))  # Role that should handle this step
    assigned_user_id = Column(Integer, ForeignKey('users.id'))
    assignment_rules = Column(JSON)  # Rules for automatic assignment
    
    # Notifications
    notification_config = Column(JSON)  # Notification settings
    reminder_config = Column(JSON)  # Reminder settings
    
    # Relationships
    template = relationship('WorkflowTemplate', back_populates='steps')
    step_instances = relationship('WorkflowStepInstance', back_populates='step', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<WorkflowStep {self.name}>'

class WorkflowInstance(db.Model):
    """Active workflow instances"""
    __tablename__ = 'workflow_instances'
    
    id = Column(Integer, primary_key=True)
    instance_uuid = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    template_id = Column(Integer, ForeignKey('workflow_templates.id'), nullable=False)
    
    # Instance identification
    name = Column(String(200), nullable=False)
    reference_id = Column(String(100))  # External reference (patient ID, session ID, etc.)
    reference_type = Column(String(50))  # Type of reference
    
    # Instance status
    status = Column(String(50), default='active')  # active, completed, cancelled, failed
    current_step_id = Column(Integer, ForeignKey('workflow_steps.id'))
    progress_percentage = Column(Float, default=0.0)
    
    # Timing
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    due_date = Column(DateTime)
    estimated_completion = Column(DateTime)
    
    # Assignment
    assigned_to_id = Column(Integer, ForeignKey('users.id'))
    assigned_team = Column(String(100))
    
    # Data
    input_data = Column(JSON)  # Input data provided when starting workflow
    context_data = Column(JSON)  # Additional context data
    output_data = Column(JSON)  # Final output data
    
    # Execution tracking
    execution_log = Column(JSON)  # Log of execution events
    error_log = Column(JSON)  # Log of errors and issues
    
    # Priority and urgency
    priority = Column(String(20), default='medium')  # low, medium, high, urgent
    is_urgent = Column(Boolean, default=False)
    
    # Metadata
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    template = relationship('WorkflowTemplate', back_populates='instances')
    step_instances = relationship('WorkflowStepInstance', back_populates='workflow_instance', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<WorkflowInstance {self.name}>'

class WorkflowStepInstance(db.Model):
    """Individual step instances within a workflow execution"""
    __tablename__ = 'workflow_step_instances'
    
    id = Column(Integer, primary_key=True)
    workflow_instance_id = Column(Integer, ForeignKey('workflow_instances.id'), nullable=False)
    step_id = Column(Integer, ForeignKey('workflow_steps.id'), nullable=False)
    
    # Step instance status
    status = Column(SQLEnum(StepStatus), default=StepStatus.PENDING)
    attempt_count = Column(Integer, default=0)
    
    # Timing
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    due_date = Column(DateTime)
    
    # Assignment
    assigned_to_id = Column(Integer, ForeignKey('users.id'))
    assigned_at = Column(DateTime)
    
    # Data
    input_data = Column(JSON)  # Input data for this step
    output_data = Column(JSON)  # Output data from this step
    form_data = Column(JSON)  # Form data if applicable
    
    # Execution details
    execution_notes = Column(Text)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Approval workflow
    requires_approval = Column(Boolean, default=False)
    approved_by_id = Column(Integer, ForeignKey('users.id'))
    approved_at = Column(DateTime)
    approval_notes = Column(Text)
    
    # Relationships
    workflow_instance = relationship('WorkflowInstance', back_populates='step_instances')
    step = relationship('WorkflowStep', back_populates='step_instances')
    
    def __repr__(self):
        return f'<WorkflowStepInstance {self.step.name if self.step else "Unknown"}>'

class WorkflowTemplate_User(db.Model):
    """Many-to-many relationship between templates and users (permissions)"""
    __tablename__ = 'workflow_template_users'
    
    id = Column(Integer, primary_key=True)
    template_id = Column(Integer, ForeignKey('workflow_templates.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Permission level
    permission_level = Column(String(20), default='view')  # view, execute, edit, admin
    can_modify = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_share = Column(Boolean, default=False)
    
    # Assignment preferences
    auto_assign = Column(Boolean, default=False)
    notification_enabled = Column(Boolean, default=True)
    
    # Metadata
    granted_by_id = Column(Integer, ForeignKey('users.id'))
    granted_at = Column(DateTime, default=datetime.utcnow)

class WorkflowNotification(db.Model):
    """Workflow-related notifications"""
    __tablename__ = 'workflow_notifications'
    
    id = Column(Integer, primary_key=True)
    workflow_instance_id = Column(Integer, ForeignKey('workflow_instances.id'))
    step_instance_id = Column(Integer, ForeignKey('workflow_step_instances.id'))
    
    # Notification details
    notification_type = Column(String(50), nullable=False)  # reminder, assignment, completion, error
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # Recipients
    recipient_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    recipient_role = Column(String(100))
    
    # Delivery
    delivery_method = Column(String(50), default='system')  # system, email, sms, push
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime)
    
    # Scheduling
    scheduled_for = Column(DateTime)
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(100))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<WorkflowNotification {self.title}>'

class WorkflowAuditLog(db.Model):
    """Audit log for workflow activities"""
    __tablename__ = 'workflow_audit_logs'
    
    id = Column(Integer, primary_key=True)
    workflow_instance_id = Column(Integer, ForeignKey('workflow_instances.id'))
    step_instance_id = Column(Integer, ForeignKey('workflow_step_instances.id'))
    template_id = Column(Integer, ForeignKey('workflow_templates.id'))
    
    # Action details
    action = Column(String(100), nullable=False)  # created, started, completed, cancelled, etc.
    action_description = Column(Text)
    
    # Actor
    user_id = Column(Integer, ForeignKey('users.id'))
    user_role = Column(String(100))
    
    # Context
    old_values = Column(JSON)  # Previous values (for updates)
    new_values = Column(JSON)  # New values (for updates)
    additional_data = Column(JSON)  # Additional context data
    
    # System info
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    # Timing
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<WorkflowAuditLog {self.action}>'

class WorkflowMetrics(db.Model):
    """Workflow performance metrics"""
    __tablename__ = 'workflow_metrics'
    
    id = Column(Integer, primary_key=True)
    template_id = Column(Integer, ForeignKey('workflow_templates.id'), nullable=False)
    
    # Time period
    metric_date = Column(Date, nullable=False)
    metric_period = Column(String(20), default='daily')  # daily, weekly, monthly
    
    # Usage metrics
    instances_created = Column(Integer, default=0)
    instances_completed = Column(Integer, default=0)
    instances_cancelled = Column(Integer, default=0)
    instances_failed = Column(Integer, default=0)
    
    # Performance metrics
    average_completion_time = Column(Float)  # in hours
    median_completion_time = Column(Float)  # in hours
    success_rate = Column(Float)  # percentage
    
    # Step metrics
    most_failed_step_id = Column(Integer, ForeignKey('workflow_steps.id'))
    average_steps_completed = Column(Float)
    
    # User metrics
    unique_users = Column(Integer, default=0)
    most_active_user_id = Column(Integer, ForeignKey('users.id'))
    
    # Quality metrics
    approval_rate = Column(Float)  # percentage of steps that required approval
    rework_rate = Column(Float)  # percentage of steps that needed rework
    
    # Calculated at
    calculated_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<WorkflowMetrics {self.template_id} - {self.metric_date}>'

class WorkflowIntegration(db.Model):
    """External system integrations for workflows"""
    __tablename__ = 'workflow_integrations'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    
    # Integration details
    integration_type = Column(String(50), nullable=False)  # api, webhook, email, file
    endpoint_url = Column(String(500))
    authentication_config = Column(JSON)  # Authentication configuration
    
    # Configuration
    request_config = Column(JSON)  # Request configuration
    response_config = Column(JSON)  # Response handling configuration
    error_handling = Column(JSON)  # Error handling rules
    
    # Status
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime)
    success_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    
    # Metadata
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<WorkflowIntegration {self.name}>'
