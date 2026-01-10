#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
نماذج قاعدة البيانات لنظام الذكاء الاصطناعي في الاتصالات
AI Communications Database Models
"""

from datetime import datetime
from app import db
import uuid
import json

class AIKnowledgeBase(db.Model):
    """قاعدة المعرفة للذكاء الاصطناعي"""
    __tablename__ = 'ai_knowledge_base'
    
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(100), nullable=False)  # فئة المعرفة
    question = db.Column(db.Text, nullable=False)  # السؤال
    answer = db.Column(db.Text, nullable=False)  # الإجابة
    keywords = db.Column(db.Text)  # الكلمات المفتاحية (JSON)
    confidence_score = db.Column(db.Float, default=1.0)  # درجة الثقة
    usage_count = db.Column(db.Integer, default=0)  # عدد مرات الاستخدام
    success_rate = db.Column(db.Float, default=1.0)  # معدل النجاح
    language = db.Column(db.String(10), default='ar')  # اللغة
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_keywords_list(self):
        """الحصول على قائمة الكلمات المفتاحية"""
        if self.keywords:
            try:
                return json.loads(self.keywords)
            except:
                return []
        return []
    
    def set_keywords_list(self, keywords_list):
        """تعيين قائمة الكلمات المفتاحية"""
        self.keywords = json.dumps(keywords_list, ensure_ascii=False)

class AIChatbot(db.Model):
    """نموذج الشات بوت الذكي"""
    __tablename__ = 'ai_chatbot'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # اسم البوت
    description = db.Column(db.Text)  # وصف البوت
    bot_type = db.Column(db.String(50), default='general')  # نوع البوت
    personality = db.Column(db.Text)  # شخصية البوت
    greeting_message = db.Column(db.Text)  # رسالة الترحيب
    fallback_message = db.Column(db.Text)  # رسالة عدم الفهم
    is_active = db.Column(db.Boolean, default=True)
    learning_enabled = db.Column(db.Boolean, default=True)  # تفعيل التعلم
    confidence_threshold = db.Column(db.Float, default=0.7)  # حد الثقة
    response_delay = db.Column(db.Integer, default=1)  # تأخير الرد (ثواني)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    conversations = db.relationship('AIChatConversation', backref='chatbot', lazy='dynamic')

class AIChatConversation(db.Model):
    """محادثات الشات بوت"""
    __tablename__ = 'ai_chat_conversation'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.String(100), unique=True, nullable=False)
    chatbot_id = db.Column(db.Integer, db.ForeignKey('ai_chatbot.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    channel = db.Column(db.String(50), default='web')  # قناة المحادثة
    status = db.Column(db.String(20), default='active')  # حالة المحادثة
    context = db.Column(db.Text)  # سياق المحادثة (JSON)
    satisfaction_score = db.Column(db.Float)  # تقييم الرضا
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime)
    
    # العلاقات
    messages = db.relationship('AIChatMessage', backref='conversation', lazy='dynamic')
    
    def __init__(self, **kwargs):
        super(AIChatConversation, self).__init__(**kwargs)
        if not self.conversation_id:
            self.conversation_id = str(uuid.uuid4())

class AIChatMessage(db.Model):
    """رسائل المحادثة مع البوت"""
    __tablename__ = 'ai_chat_message'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('ai_chat_conversation.id'), nullable=False)
    sender_type = db.Column(db.String(20), nullable=False)  # user, bot
    message_text = db.Column(db.Text, nullable=False)
    intent = db.Column(db.String(100))  # النية المكتشفة
    confidence_score = db.Column(db.Float)  # درجة الثقة
    response_time = db.Column(db.Float)  # وقت الاستجابة
    knowledge_base_id = db.Column(db.Integer, db.ForeignKey('ai_knowledge_base.id'))
    sentiment = db.Column(db.String(20))  # المشاعر
    sentiment_score = db.Column(db.Float)  # درجة المشاعر
    entities = db.Column(db.Text)  # الكيانات المستخرجة (JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AISentimentAnalysis(db.Model):
    """تحليل المشاعر للرسائل"""
    __tablename__ = 'ai_sentiment_analysis'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, nullable=False)  # معرف الرسالة
    message_type = db.Column(db.String(50), nullable=False)  # نوع الرسالة
    text_content = db.Column(db.Text, nullable=False)
    sentiment = db.Column(db.String(20), nullable=False)  # positive, negative, neutral
    sentiment_score = db.Column(db.Float, nullable=False)  # -1 to 1
    emotions = db.Column(db.Text)  # المشاعر المفصلة (JSON)
    confidence = db.Column(db.Float, default=0.0)
    language = db.Column(db.String(10), default='ar')
    analyzed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def get_emotions_dict(self):
        """الحصول على قاموس المشاعر"""
        if self.emotions:
            try:
                return json.loads(self.emotions)
            except:
                return {}
        return {}

class AIAutoResponse(db.Model):
    """الردود التلقائية المقترحة"""
    __tablename__ = 'ai_auto_response'
    
    id = db.Column(db.Integer, primary_key=True)
    trigger_text = db.Column(db.Text, nullable=False)  # النص المحفز
    response_text = db.Column(db.Text, nullable=False)  # نص الرد
    response_type = db.Column(db.String(50), default='suggestion')  # نوع الرد
    priority = db.Column(db.Integer, default=1)  # الأولوية
    category = db.Column(db.String(100))  # الفئة
    conditions = db.Column(db.Text)  # شروط الاستخدام (JSON)
    usage_count = db.Column(db.Integer, default=0)
    success_rate = db.Column(db.Float, default=1.0)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AIMessageClassification(db.Model):
    """تصنيف الرسائل التلقائي"""
    __tablename__ = 'ai_message_classification'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, nullable=False)
    message_type = db.Column(db.String(50), nullable=False)
    classification = db.Column(db.String(100), nullable=False)  # التصنيف
    priority_level = db.Column(db.String(20), default='medium')  # urgent, high, medium, low
    category = db.Column(db.String(100))  # الفئة
    tags = db.Column(db.Text)  # العلامات (JSON)
    confidence_score = db.Column(db.Float, default=0.0)
    requires_human = db.Column(db.Boolean, default=False)  # يحتاج تدخل بشري
    escalation_reason = db.Column(db.Text)  # سبب التصعيد
    classified_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def get_tags_list(self):
        """الحصول على قائمة العلامات"""
        if self.tags:
            try:
                return json.loads(self.tags)
            except:
                return []
        return []

class AILearningFeedback(db.Model):
    """تغذية راجعة للتعلم"""
    __tablename__ = 'ai_learning_feedback'
    
    id = db.Column(db.Integer, primary_key=True)
    interaction_type = db.Column(db.String(50), nullable=False)  # نوع التفاعل
    interaction_id = db.Column(db.Integer, nullable=False)  # معرف التفاعل
    feedback_type = db.Column(db.String(20), nullable=False)  # positive, negative, neutral
    feedback_score = db.Column(db.Float)  # درجة التقييم
    feedback_text = db.Column(db.Text)  # نص التقييم
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    improvement_suggestion = db.Column(db.Text)  # اقتراح التحسين
    is_processed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AIAnalyticsReport(db.Model):
    """تقارير التحليلات المتقدمة"""
    __tablename__ = 'ai_analytics_report'
    
    id = db.Column(db.Integer, primary_key=True)
    report_type = db.Column(db.String(100), nullable=False)  # نوع التقرير
    report_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    data_source = db.Column(db.String(100))  # مصدر البيانات
    filters = db.Column(db.Text)  # المرشحات (JSON)
    metrics = db.Column(db.Text)  # المقاييس (JSON)
    insights = db.Column(db.Text)  # الرؤى (JSON)
    predictions = db.Column(db.Text)  # التنبؤات (JSON)
    recommendations = db.Column(db.Text)  # التوصيات (JSON)
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    report_period_start = db.Column(db.DateTime)
    report_period_end = db.Column(db.DateTime)
    
    def get_metrics_dict(self):
        """الحصول على قاموس المقاييس"""
        if self.metrics:
            try:
                return json.loads(self.metrics)
            except:
                return {}
        return {}
    
    def get_insights_list(self):
        """الحصول على قائمة الرؤى"""
        if self.insights:
            try:
                return json.loads(self.insights)
            except:
                return []
        return []

class AIPredictiveModel(db.Model):
    """نماذج التنبؤ"""
    __tablename__ = 'ai_predictive_model'
    
    id = db.Column(db.Integer, primary_key=True)
    model_name = db.Column(db.String(100), nullable=False)
    model_type = db.Column(db.String(50), nullable=False)  # regression, classification, clustering
    description = db.Column(db.Text)
    target_variable = db.Column(db.String(100))  # المتغير المستهدف
    features = db.Column(db.Text)  # الميزات (JSON)
    model_parameters = db.Column(db.Text)  # معاملات النموذج (JSON)
    accuracy_score = db.Column(db.Float)  # دقة النموذج
    training_data_size = db.Column(db.Integer)
    last_trained = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    predictions = db.relationship('AIPrediction', backref='model', lazy='dynamic')

class AIPrediction(db.Model):
    """التنبؤات المولدة"""
    __tablename__ = 'ai_prediction'
    
    id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.Integer, db.ForeignKey('ai_predictive_model.id'), nullable=False)
    prediction_type = db.Column(db.String(100), nullable=False)
    input_data = db.Column(db.Text)  # بيانات الإدخال (JSON)
    prediction_result = db.Column(db.Text)  # نتيجة التنبؤ (JSON)
    confidence_score = db.Column(db.Float)
    probability_distribution = db.Column(db.Text)  # توزيع الاحتمالات (JSON)
    actual_outcome = db.Column(db.Text)  # النتيجة الفعلية (للتقييم)
    is_accurate = db.Column(db.Boolean)  # هل التنبؤ دقيق
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def get_prediction_dict(self):
        """الحصول على قاموس التنبؤ"""
        if self.prediction_result:
            try:
                return json.loads(self.prediction_result)
            except:
                return {}
        return {}

class AIPerformanceMetrics(db.Model):
    """مقاييس أداء الذكاء الاصطناعي"""
    __tablename__ = 'ai_performance_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    metric_type = db.Column(db.String(100), nullable=False)  # نوع المقياس
    metric_name = db.Column(db.String(100), nullable=False)
    metric_value = db.Column(db.Float, nullable=False)
    metric_unit = db.Column(db.String(50))  # وحدة القياس
    benchmark_value = db.Column(db.Float)  # القيمة المرجعية
    target_value = db.Column(db.Float)  # القيمة المستهدفة
    trend = db.Column(db.String(20))  # improving, declining, stable
    period_start = db.Column(db.DateTime)
    period_end = db.Column(db.DateTime)
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    @property
    def performance_status(self):
        """حالة الأداء"""
        if self.target_value:
            if self.metric_value >= self.target_value:
                return "excellent"
            elif self.metric_value >= self.target_value * 0.8:
                return "good"
            elif self.metric_value >= self.target_value * 0.6:
                return "fair"
            else:
                return "poor"
        return "unknown"

# فهارس لتحسين الأداء
db.Index('idx_knowledge_base_category', AIKnowledgeBase.category)
db.Index('idx_knowledge_base_keywords', AIKnowledgeBase.keywords)
db.Index('idx_chat_conversation_user', AIChatConversation.user_id)
db.Index('idx_chat_message_conversation', AIChatMessage.conversation_id)
db.Index('idx_sentiment_analysis_message', AISentimentAnalysis.message_id)
db.Index('idx_message_classification_message', AIMessageClassification.message_id)
db.Index('idx_analytics_report_type', AIAnalyticsReport.report_type)
db.Index('idx_prediction_model', AIPrediction.model_id)
db.Index('idx_performance_metrics_type', AIPerformanceMetrics.metric_type)
