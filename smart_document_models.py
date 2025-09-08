#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Smart Document Management System Models
Advanced document management with AI-powered features for Al-Awael Centers
"""

# SQLAlchemy import removed - using centralized db instance
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Float, Date, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, date
from enum import Enum
import uuid

# Import db from database module to avoid conflicts
from database import db

class DocumentType(Enum):
    MEDICAL_REPORT = "medical_report"
    ASSESSMENT = "assessment"
    THERAPY_PLAN = "therapy_plan"
    PROGRESS_REPORT = "progress_report"
    LEGAL_DOCUMENT = "legal_document"
    ADMINISTRATIVE = "administrative"
    FINANCIAL = "financial"
    EDUCATIONAL = "educational"
    RESEARCH = "research"
    CORRESPONDENCE = "correspondence"

class DocumentStatus(Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"
    EXPIRED = "expired"

class AccessLevel(Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"
    TOP_SECRET = "top_secret"

class DocumentPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"

class AIProcessingStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class SmartDocument(db.Model):
    """Enhanced document model with AI capabilities"""
    __tablename__ = 'smart_documents'
    
    id = Column(Integer, primary_key=True)
    document_uuid = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    document_type = Column(SQLEnum(DocumentType), nullable=False)
    status = Column(SQLEnum(DocumentStatus), nullable=False, default=DocumentStatus.DRAFT)
    priority = Column(SQLEnum(DocumentPriority), nullable=False, default=DocumentPriority.MEDIUM)
    access_level = Column(SQLEnum(AccessLevel), nullable=False, default=AccessLevel.INTERNAL)
    
    # File information
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)  # Size in bytes
    file_hash = Column(String(64))  # SHA-256 hash for integrity
    mime_type = Column(String(100))
    
    # AI processing information
    ai_processing_status = Column(SQLEnum(AIProcessingStatus), default=AIProcessingStatus.PENDING)
    ai_extracted_text = Column(Text)
    ai_summary = Column(Text)
    ai_keywords = Column(JSON)  # List of extracted keywords
    ai_entities = Column(JSON)  # Named entities (people, places, organizations)
    ai_sentiment_score = Column(Float)  # Sentiment analysis score
    ai_confidence_score = Column(Float)  # AI processing confidence
    ai_language_detected = Column(String(10))  # Language code (ar, en, etc.)
    
    # Metadata
    tags = Column(JSON)  # User-defined tags
    custom_fields = Column(JSON)  # Flexible custom fields
    version_number = Column(Integer, default=1)
    is_template = Column(Boolean, default=False)
    template_category = Column(String(100))
    
    # Relationships
    beneficiary_id = Column(Integer, ForeignKey('rehabilitation_beneficiaries.id'))
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    updated_by_id = Column(Integer, ForeignKey('users.id'))
    approved_by_id = Column(Integer, ForeignKey('users.id'))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = Column(DateTime)
    expires_at = Column(DateTime)
    last_accessed_at = Column(DateTime)
    
    # Relationships
    versions = relationship('DocumentVersion', back_populates='document', cascade='all, delete-orphan')
    access_logs = relationship('DocumentAccessLog', back_populates='document', cascade='all, delete-orphan')
    ai_analyses = relationship('DocumentAIAnalysis', back_populates='document', cascade='all, delete-orphan')
    workflows = relationship('DocumentWorkflow', back_populates='document', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<SmartDocument {self.title}>'

class DocumentVersion(db.Model):
    """Document version control"""
    __tablename__ = 'document_versions'
    
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('smart_documents.id'), nullable=False)
    version_number = Column(Integer, nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    file_hash = Column(String(64))
    
    # Change information
    change_summary = Column(Text)
    change_reason = Column(String(255))
    is_major_version = Column(Boolean, default=False)
    
    # Metadata
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship('SmartDocument', back_populates='versions')
    
    def __repr__(self):
        return f'<DocumentVersion {self.document_id} v{self.version_number}>'

class DocumentAccessLog(db.Model):
    """Document access logging for security and analytics"""
    __tablename__ = 'document_access_logs'
    
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('smart_documents.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Access information
    access_type = Column(String(50), nullable=False)  # view, download, edit, delete
    ip_address = Column(String(45))
    user_agent = Column(Text)
    session_id = Column(String(255))
    
    # Security information
    is_authorized = Column(Boolean, default=True)
    security_level_required = Column(String(50))
    security_level_granted = Column(String(50))
    
    # Timestamps
    accessed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship('SmartDocument', back_populates='access_logs')
    
    def __repr__(self):
        return f'<DocumentAccessLog {self.document_id} by {self.user_id}>'

class DocumentAIAnalysis(db.Model):
    """AI analysis results for documents"""
    __tablename__ = 'document_ai_analyses'
    
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('smart_documents.id'), nullable=False)
    
    # Analysis type and results
    analysis_type = Column(String(100), nullable=False)  # ocr, nlp, classification, etc.
    analysis_results = Column(JSON)
    confidence_score = Column(Float)
    processing_time = Column(Float)  # Time in seconds
    
    # AI model information
    model_name = Column(String(100))
    model_version = Column(String(50))
    
    # Status and error handling
    status = Column(SQLEnum(AIProcessingStatus), default=AIProcessingStatus.PENDING)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    document = relationship('SmartDocument', back_populates='ai_analyses')
    
    def __repr__(self):
        return f'<DocumentAIAnalysis {self.analysis_type} for {self.document_id}>'

class DocumentCategory(db.Model):
    """Document categories for organization"""
    __tablename__ = 'document_categories'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    name_ar = Column(String(100), nullable=False)
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey('document_categories.id'))
    
    # Category settings
    color_code = Column(String(7))  # Hex color code
    icon = Column(String(50))
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    
    # AI settings
    auto_classification_enabled = Column(Boolean, default=True)
    classification_keywords = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parent = relationship('DocumentCategory', remote_side=[id])
    children = relationship('DocumentCategory')
    
    def __repr__(self):
        return f'<DocumentCategory {self.name}>'

class DocumentTemplate(db.Model):
    """Document templates for standardization"""
    __tablename__ = 'document_templates'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey('document_categories.id'))
    
    # Template content
    template_content = Column(Text)  # HTML or markdown content
    template_fields = Column(JSON)  # Dynamic fields definition
    template_styles = Column(JSON)  # CSS styles
    
    # Template settings
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)
    usage_count = Column(Integer, default=0)
    
    # Version control
    version = Column(String(20), default='1.0')
    
    # Metadata
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<DocumentTemplate {self.name}>'

class DocumentWorkflow(db.Model):
    """Document workflow management"""
    __tablename__ = 'document_workflows'
    
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('smart_documents.id'), nullable=False)
    workflow_name = Column(String(100), nullable=False)
    
    # Workflow definition
    workflow_steps = Column(JSON)  # List of workflow steps
    current_step = Column(Integer, default=0)
    status = Column(String(50), default='active')
    
    # Participants
    assigned_users = Column(JSON)  # List of user IDs
    current_assignee_id = Column(Integer, ForeignKey('users.id'))
    
    # Timing
    due_date = Column(DateTime)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    document = relationship('SmartDocument', back_populates='workflows')
    
    def __repr__(self):
        return f'<DocumentWorkflow {self.workflow_name} for {self.document_id}>'

class DocumentShare(db.Model):
    """Document sharing and collaboration"""
    __tablename__ = 'document_shares'
    
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('smart_documents.id'), nullable=False)
    shared_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    shared_with_id = Column(Integer, ForeignKey('users.id'))
    shared_with_email = Column(String(255))  # For external sharing
    
    # Share settings
    permission_level = Column(String(50), nullable=False)  # view, edit, admin
    can_download = Column(Boolean, default=True)
    can_share = Column(Boolean, default=False)
    password_protected = Column(Boolean, default=False)
    password_hash = Column(String(255))
    
    # Expiration
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    # Access tracking
    access_count = Column(Integer, default=0)
    last_accessed_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<DocumentShare {self.document_id} to {self.shared_with_id or self.shared_with_email}>'

class DocumentComment(db.Model):
    """Document comments and annotations"""
    __tablename__ = 'document_comments'
    
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('smart_documents.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    parent_id = Column(Integer, ForeignKey('document_comments.id'))  # For replies
    
    # Comment content
    content = Column(Text, nullable=False)
    comment_type = Column(String(50), default='general')  # general, annotation, suggestion
    
    # Position information (for annotations)
    page_number = Column(Integer)
    position_x = Column(Float)
    position_y = Column(Float)
    
    # Status
    is_resolved = Column(Boolean, default=False)
    resolved_by_id = Column(Integer, ForeignKey('users.id'))
    resolved_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parent = relationship('DocumentComment', remote_side=[id])
    replies = relationship('DocumentComment')
    
    def __repr__(self):
        return f'<DocumentComment {self.id} on {self.document_id}>'

class DocumentAnalytics(db.Model):
    """Document usage analytics"""
    __tablename__ = 'document_analytics'
    
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('smart_documents.id'), nullable=False)
    
    # Usage metrics
    view_count = Column(Integer, default=0)
    download_count = Column(Integer, default=0)
    share_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    
    # Time metrics
    total_view_time = Column(Integer, default=0)  # Total seconds viewed
    average_view_time = Column(Float, default=0)
    
    # User engagement
    unique_viewers = Column(JSON)  # List of user IDs who viewed
    popular_sections = Column(JSON)  # Most viewed sections/pages
    
    # Date tracking
    analytics_date = Column(Date, default=date.today)
    
    # Timestamps
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<DocumentAnalytics {self.document_id} for {self.analytics_date}>'
