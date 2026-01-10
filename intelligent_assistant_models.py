# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات للمساعد الذكي المتقدم
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from database import db
from datetime import datetime
import json

class AIAssistantConversation(db.Model):
    """محادثات المساعد الذكي"""
    __tablename__ = 'ai_assistant_conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_id = db.Column(db.String(100), nullable=False, index=True)
    conversation_type = db.Column(db.String(50), nullable=False)  # general, medical, educational, behavioral
    context_data = db.Column(db.Text)  # JSON data for context
    language = db.Column(db.String(10), default='ar')
    is_active = db.Column(db.Boolean, default=True)
    satisfaction_rating = db.Column(db.Integer)  # 1-5 rating
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    messages = db.relationship('AIAssistantMessage', backref='conversation', lazy=True, cascade='all, delete-orphan')
    user = db.relationship('User', backref='ai_conversations')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'conversation_type': self.conversation_type,
            'context_data': json.loads(self.context_data) if self.context_data else {},
            'language': self.language,
            'is_active': self.is_active,
            'satisfaction_rating': self.satisfaction_rating,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'message_count': len(self.messages)
        }

class AIAssistantMessage(db.Model):
    """رسائل المساعد الذكي"""
    __tablename__ = 'ai_assistant_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('ai_assistant_conversations.id'), nullable=False)
    message_type = db.Column(db.String(20), nullable=False)  # user, assistant, system
    content = db.Column(db.Text, nullable=False)
    intent = db.Column(db.String(100))  # detected intent
    confidence_score = db.Column(db.Float)  # AI confidence 0-1
    response_time = db.Column(db.Float)  # response time in seconds
    attachments = db.Column(db.Text)  # JSON array of file paths
    extra_metadata = db.Column(db.Text)  # JSON metadata
    is_helpful = db.Column(db.Boolean)  # user feedback
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'message_type': self.message_type,
            'content': self.content,
            'intent': self.intent,
            'confidence_score': self.confidence_score,
            'response_time': self.response_time,
            'attachments': json.loads(self.attachments) if self.attachments else [],
            'metadata': json.loads(self.metadata) if self.metadata else {},
            'is_helpful': self.is_helpful,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class AIKnowledgeBase(db.Model):
    """قاعدة المعرفة للمساعد الذكي"""
    __tablename__ = 'ai_knowledge_base'
    
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(100), nullable=False, index=True)
    subcategory = db.Column(db.String(100), index=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    keywords = db.Column(db.Text)  # JSON array of keywords
    language = db.Column(db.String(10), default='ar')
    source_type = db.Column(db.String(50))  # manual, imported, generated
    source_reference = db.Column(db.String(200))
    accuracy_score = db.Column(db.Float, default=1.0)
    usage_count = db.Column(db.Integer, default=0)
    last_used = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    creator = db.relationship('User', backref='knowledge_entries')
    
    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'subcategory': self.subcategory,
            'title': self.title,
            'content': self.content,
            'keywords': json.loads(self.keywords) if self.keywords else [],
            'language': self.language,
            'source_type': self.source_type,
            'source_reference': self.source_reference,
            'accuracy_score': self.accuracy_score,
            'usage_count': self.usage_count,
            'last_used': self.last_used.isoformat() if self.last_used else None,
            'is_active': self.is_active,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class AIIntentPattern(db.Model):
    """أنماط النوايا للمساعد الذكي"""
    __tablename__ = 'ai_intent_patterns'
    
    id = db.Column(db.Integer, primary_key=True)
    intent_name = db.Column(db.String(100), nullable=False, index=True)
    pattern_text = db.Column(db.String(500), nullable=False)
    pattern_type = db.Column(db.String(50), default='keyword')  # keyword, regex, semantic
    language = db.Column(db.String(10), default='ar')
    confidence_threshold = db.Column(db.Float, default=0.7)
    response_template = db.Column(db.Text)
    action_type = db.Column(db.String(50))  # query_db, call_api, redirect, custom
    action_parameters = db.Column(db.Text)  # JSON parameters
    priority = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)
    success_count = db.Column(db.Integer, default=0)
    failure_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'intent_name': self.intent_name,
            'pattern_text': self.pattern_text,
            'pattern_type': self.pattern_type,
            'language': self.language,
            'confidence_threshold': self.confidence_threshold,
            'response_template': self.response_template,
            'action_type': self.action_type,
            'action_parameters': json.loads(self.action_parameters) if self.action_parameters else {},
            'priority': self.priority,
            'is_active': self.is_active,
            'success_count': self.success_count,
            'failure_count': self.failure_count,
            'accuracy_rate': self.success_count / (self.success_count + self.failure_count) if (self.success_count + self.failure_count) > 0 else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class AIUserPreference(db.Model):
    """تفضيلات المستخدم للمساعد الذكي"""
    __tablename__ = 'ai_user_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    preferred_language = db.Column(db.String(10), default='ar')
    communication_style = db.Column(db.String(50), default='formal')  # formal, casual, technical
    response_length = db.Column(db.String(20), default='medium')  # short, medium, detailed
    topics_of_interest = db.Column(db.Text)  # JSON array
    notification_preferences = db.Column(db.Text)  # JSON object
    accessibility_settings = db.Column(db.Text)  # JSON object
    privacy_level = db.Column(db.String(20), default='standard')  # minimal, standard, full
    learning_mode = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User', backref='ai_preferences')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'preferred_language': self.preferred_language,
            'communication_style': self.communication_style,
            'response_length': self.response_length,
            'topics_of_interest': json.loads(self.topics_of_interest) if self.topics_of_interest else [],
            'notification_preferences': json.loads(self.notification_preferences) if self.notification_preferences else {},
            'accessibility_settings': json.loads(self.accessibility_settings) if self.accessibility_settings else {},
            'privacy_level': self.privacy_level,
            'learning_mode': self.learning_mode,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class AIAnalytics(db.Model):
    """تحليلات استخدام المساعد الذكي"""
    __tablename__ = 'ai_analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    metric_type = db.Column(db.String(50), nullable=False)  # conversations, messages, intents, satisfaction
    metric_value = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(100))
    subcategory = db.Column(db.String(100))
    user_type = db.Column(db.String(50))  # parent, therapist, admin, teacher
    extra_metadata = db.Column(db.Text)  # JSON additional data
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('date', 'metric_type', 'category', 'subcategory', 'user_type', name='unique_daily_metric'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'metric_type': self.metric_type,
            'metric_value': self.metric_value,
            'category': self.category,
            'subcategory': self.subcategory,
            'user_type': self.user_type,
            'metadata': json.loads(self.metadata) if self.metadata else {},
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class AIFeedback(db.Model):
    """تقييمات وملاحظات المساعد الذكي"""
    __tablename__ = 'ai_feedback'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    conversation_id = db.Column(db.Integer, db.ForeignKey('ai_assistant_conversations.id'))
    message_id = db.Column(db.Integer, db.ForeignKey('ai_assistant_messages.id'))
    feedback_type = db.Column(db.String(50), nullable=False)  # rating, suggestion, complaint, compliment
    rating = db.Column(db.Integer)  # 1-5 stars
    comment = db.Column(db.Text)
    category = db.Column(db.String(100))  # accuracy, speed, helpfulness, politeness
    is_resolved = db.Column(db.Boolean, default=False)
    resolution_notes = db.Column(db.Text)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    resolved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User', foreign_keys=[user_id], backref='ai_feedback_given')
    resolver = db.relationship('User', foreign_keys=[resolved_by], backref='ai_feedback_resolved')
    conversation = db.relationship('AIAssistantConversation', backref='feedback')
    message = db.relationship('AIAssistantMessage', backref='feedback')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'conversation_id': self.conversation_id,
            'message_id': self.message_id,
            'feedback_type': self.feedback_type,
            'rating': self.rating,
            'comment': self.comment,
            'category': self.category,
            'is_resolved': self.is_resolved,
            'resolution_notes': self.resolution_notes,
            'resolved_by': self.resolved_by,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
