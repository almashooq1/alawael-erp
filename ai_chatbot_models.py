#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
AI Chatbot System Models
Intelligent chatbot for Al-Awael Centers with multilingual support
"""

from datetime import datetime, date
from enum import Enum
import uuid
import json

# Import db from database module to avoid conflicts
from database import db

class ChatbotLanguage(Enum):
    """لغات الدردشة المدعومة"""
    ARABIC = 'ar'
    ENGLISH = 'en'

class ChatbotIntent(Enum):
    """أنواع الاستفسارات"""
    STUDENT_INFO = 'student_info'
    APPOINTMENT_BOOKING = 'appointment_booking'
    PROGRESS_INQUIRY = 'progress_inquiry'
    GENERAL_INFO = 'general_info'
    COMPLAINT = 'complaint'
    EMERGENCY = 'emergency'

class ChatbotSession(db.Model):
    """جلسات الدردشة مع البوت"""
    __tablename__ = 'chatbot_sessions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    session_token = db.Column(db.String(100), unique=True, nullable=False)
    language = db.Column(db.Enum(ChatbotLanguage), default=ChatbotLanguage.ARABIC)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    user_type = db.Column(db.String(20))  # parent, teacher, admin, visitor
    context_data = db.Column(db.JSON)  # معلومات السياق
    satisfaction_rating = db.Column(db.Integer)  # تقييم الرضا 1-5
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    messages = db.relationship('ChatbotMessage', backref='session', lazy=True, cascade='all, delete-orphan')

class ChatbotMessage(db.Model):
    """رسائل الدردشة"""
    __tablename__ = 'chatbot_messages'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = db.Column(db.String(36), db.ForeignKey('chatbot_sessions.id'), nullable=False)
    message_text = db.Column(db.Text, nullable=False)
    is_from_user = db.Column(db.Boolean, nullable=False)  # True للمستخدم، False للبوت
    intent = db.Column(db.Enum(ChatbotIntent))
    confidence_score = db.Column(db.Float)  # درجة الثقة في فهم الرسالة
    response_time = db.Column(db.Float)  # وقت الاستجابة بالثواني
    attachments = db.Column(db.JSON)  # مرفقات (صور، ملفات)
    extra_metadata = db.Column(db.JSON)  # معلومات إضافية
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class ChatbotKnowledgeBase(db.Model):
    """قاعدة معرفة البوت"""
    __tablename__ = 'chatbot_knowledge_base'
    
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(100), nullable=False)
    question_ar = db.Column(db.Text, nullable=False)  # السؤال بالعربية
    question_en = db.Column(db.Text)  # السؤال بالإنجليزية
    answer_ar = db.Column(db.Text, nullable=False)  # الإجابة بالعربية
    answer_en = db.Column(db.Text)  # الإجابة بالإنجليزية
    keywords = db.Column(db.JSON)  # كلمات مفتاحية للبحث
    intent = db.Column(db.Enum(ChatbotIntent))
    priority = db.Column(db.Integer, default=1)  # أولوية الإجابة
    is_active = db.Column(db.Boolean, default=True)
    usage_count = db.Column(db.Integer, default=0)  # عدد مرات الاستخدام
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ChatbotFeedback(db.Model):
    """تقييمات المستخدمين للبوت"""
    __tablename__ = 'chatbot_feedback'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(36), db.ForeignKey('chatbot_sessions.id'), nullable=False)
    message_id = db.Column(db.String(36), db.ForeignKey('chatbot_messages.id'))
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    feedback_text = db.Column(db.Text)
    is_helpful = db.Column(db.Boolean)
    improvement_suggestion = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ChatbotAnalytics(db.Model):
    """تحليلات أداء البوت"""
    __tablename__ = 'chatbot_analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    total_sessions = db.Column(db.Integer, default=0)
    total_messages = db.Column(db.Integer, default=0)
    avg_session_duration = db.Column(db.Float)  # متوسط مدة الجلسة بالدقائق
    avg_response_time = db.Column(db.Float)  # متوسط وقت الاستجابة
    successful_resolutions = db.Column(db.Integer, default=0)  # الحلول الناجحة
    escalated_to_human = db.Column(db.Integer, default=0)  # المحولة للبشر
    avg_satisfaction = db.Column(db.Float)  # متوسط الرضا
    top_intents = db.Column(db.JSON)  # أكثر الاستفسارات شيوعاً
    language_distribution = db.Column(db.JSON)  # توزيع اللغات
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint for daily analytics
    __table_args__ = (db.UniqueConstraint('date', name='unique_daily_analytics'),)
