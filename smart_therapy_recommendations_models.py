# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات للتوصيات الذكية للبرامج العلاجية
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from database import db
from datetime import datetime
import json

class TherapyRecommendationEngine(db.Model):
    """محرك التوصيات العلاجية"""
    __tablename__ = 'therapy_recommendation_engines'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    algorithm_type = db.Column(db.String(50), nullable=False)  # ml_based, rule_based, hybrid
    version = db.Column(db.String(20), default='1.0')
    model_parameters = db.Column(db.Text)  # JSON معاملات النموذج
    training_data_sources = db.Column(db.Text)  # JSON مصادر البيانات
    accuracy_score = db.Column(db.Float, default=0.0)  # دقة النموذج
    last_trained = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    creator = db.relationship('User', backref='recommendation_engines')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'algorithm_type': self.algorithm_type,
            'version': self.version,
            'model_parameters': json.loads(self.model_parameters) if self.model_parameters else {},
            'training_data_sources': json.loads(self.training_data_sources) if self.training_data_sources else [],
            'accuracy_score': self.accuracy_score,
            'last_trained': self.last_trained.isoformat() if self.last_trained else None,
            'is_active': self.is_active,
            'creator_name': self.creator.name if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class TherapyRecommendation(db.Model):
    """التوصيات العلاجية"""
    __tablename__ = 'therapy_recommendations'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    recommendation_engine_id = db.Column(db.Integer, db.ForeignKey('therapy_recommendation_engines.id'))
    recommendation_type = db.Column(db.String(50), nullable=False)  # therapy_program, activity, intervention, assessment
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=False)
    rationale = db.Column(db.Text)  # المبرر العلمي للتوصية
    priority_level = db.Column(db.String(20), default='medium')  # low, medium, high, urgent
    confidence_score = db.Column(db.Float, default=0.0)  # مستوى الثقة من 0 إلى 1
    target_skills = db.Column(db.Text)  # JSON المهارات المستهدفة
    expected_outcomes = db.Column(db.Text)  # JSON النتائج المتوقعة
    implementation_steps = db.Column(db.Text)  # JSON خطوات التنفيذ
    required_resources = db.Column(db.Text)  # JSON الموارد المطلوبة
    estimated_duration = db.Column(db.Integer)  # المدة المتوقعة بالأسابيع
    frequency_per_week = db.Column(db.Integer)  # عدد الجلسات في الأسبوع
    session_duration = db.Column(db.Integer)  # مدة الجلسة بالدقائق
    contraindications = db.Column(db.Text)  # JSON موانع الاستعمال
    prerequisites = db.Column(db.Text)  # JSON المتطلبات المسبقة
    success_metrics = db.Column(db.Text)  # JSON مقاييس النجاح
    review_schedule = db.Column(db.Text)  # JSON جدول المراجعة
    alternative_options = db.Column(db.Text)  # JSON البدائل المتاحة
    evidence_base = db.Column(db.Text)  # JSON الأدلة العلمية
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, implemented, completed
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    implementation_date = db.Column(db.DateTime)
    completion_date = db.Column(db.DateTime)
    effectiveness_rating = db.Column(db.Float)  # تقييم الفعالية بعد التطبيق
    notes = db.Column(db.Text)
    
    # العلاقات
    student = db.relationship('Student', backref='therapy_recommendations')
    recommendation_engine = db.relationship('TherapyRecommendationEngine', backref='recommendations')
    reviewer = db.relationship('User', backref='reviewed_recommendations')
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'recommendation_engine': self.recommendation_engine.name if self.recommendation_engine else None,
            'recommendation_type': self.recommendation_type,
            'title': self.title,
            'description': self.description,
            'rationale': self.rationale,
            'priority_level': self.priority_level,
            'confidence_score': self.confidence_score,
            'target_skills': json.loads(self.target_skills) if self.target_skills else [],
            'expected_outcomes': json.loads(self.expected_outcomes) if self.expected_outcomes else [],
            'implementation_steps': json.loads(self.implementation_steps) if self.implementation_steps else [],
            'required_resources': json.loads(self.required_resources) if self.required_resources else [],
            'estimated_duration': self.estimated_duration,
            'frequency_per_week': self.frequency_per_week,
            'session_duration': self.session_duration,
            'contraindications': json.loads(self.contraindications) if self.contraindications else [],
            'prerequisites': json.loads(self.prerequisites) if self.prerequisites else [],
            'success_metrics': json.loads(self.success_metrics) if self.success_metrics else [],
            'review_schedule': json.loads(self.review_schedule) if self.review_schedule else [],
            'alternative_options': json.loads(self.alternative_options) if self.alternative_options else [],
            'evidence_base': json.loads(self.evidence_base) if self.evidence_base else [],
            'status': self.status,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'reviewer_name': self.reviewer.name if self.reviewer else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'implementation_date': self.implementation_date.isoformat() if self.implementation_date else None,
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'effectiveness_rating': self.effectiveness_rating,
            'notes': self.notes
        }

class RecommendationTemplate(db.Model):
    """قوالب التوصيات"""
    __tablename__ = 'recommendation_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    subcategory = db.Column(db.String(100))
    description = db.Column(db.Text)
    target_conditions = db.Column(db.Text)  # JSON الحالات المستهدفة
    age_range_min = db.Column(db.Integer)
    age_range_max = db.Column(db.Integer)
    severity_levels = db.Column(db.Text)  # JSON مستويات الشدة المناسبة
    template_content = db.Column(db.Text, nullable=False)  # JSON محتوى القالب
    success_rate = db.Column(db.Float, default=0.0)  # معدل النجاح التاريخي
    usage_count = db.Column(db.Integer, default=0)  # عدد مرات الاستخدام
    evidence_level = db.Column(db.String(20), default='moderate')  # low, moderate, high, very_high
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    creator = db.relationship('User', backref='recommendation_templates')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'subcategory': self.subcategory,
            'description': self.description,
            'target_conditions': json.loads(self.target_conditions) if self.target_conditions else [],
            'age_range_min': self.age_range_min,
            'age_range_max': self.age_range_max,
            'severity_levels': json.loads(self.severity_levels) if self.severity_levels else [],
            'template_content': json.loads(self.template_content) if self.template_content else {},
            'success_rate': self.success_rate,
            'usage_count': self.usage_count,
            'evidence_level': self.evidence_level,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'is_active': self.is_active,
            'creator_name': self.creator.name if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RecommendationFeedback(db.Model):
    """تقييم التوصيات"""
    __tablename__ = 'recommendation_feedback'
    
    id = db.Column(db.Integer, primary_key=True)
    recommendation_id = db.Column(db.Integer, db.ForeignKey('therapy_recommendations.id'), nullable=False)
    evaluator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    evaluator_role = db.Column(db.String(50), nullable=False)  # therapist, parent, teacher, student
    feedback_type = db.Column(db.String(50), nullable=False)  # effectiveness, satisfaction, progress, concerns
    rating = db.Column(db.Float, nullable=False)  # من 1 إلى 5
    feedback_text = db.Column(db.Text)
    implementation_challenges = db.Column(db.Text)  # JSON التحديات في التطبيق
    observed_improvements = db.Column(db.Text)  # JSON التحسينات المرصودة
    suggested_modifications = db.Column(db.Text)  # JSON التعديلات المقترحة
    would_recommend = db.Column(db.Boolean)  # هل ينصح بهذه التوصية
    additional_notes = db.Column(db.Text)
    feedback_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    recommendation = db.relationship('TherapyRecommendation', backref='feedback')
    evaluator = db.relationship('User', backref='recommendation_feedback')
    
    def to_dict(self):
        return {
            'id': self.id,
            'recommendation_id': self.recommendation_id,
            'evaluator_name': self.evaluator.name if self.evaluator else None,
            'evaluator_role': self.evaluator_role,
            'feedback_type': self.feedback_type,
            'rating': self.rating,
            'feedback_text': self.feedback_text,
            'implementation_challenges': json.loads(self.implementation_challenges) if self.implementation_challenges else [],
            'observed_improvements': json.loads(self.observed_improvements) if self.observed_improvements else [],
            'suggested_modifications': json.loads(self.suggested_modifications) if self.suggested_modifications else [],
            'would_recommend': self.would_recommend,
            'additional_notes': self.additional_notes,
            'feedback_date': self.feedback_date.isoformat() if self.feedback_date else None
        }

class RecommendationRule(db.Model):
    """قواعد التوصيات"""
    __tablename__ = 'recommendation_rules'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    rule_type = db.Column(db.String(50), nullable=False)  # condition_based, age_based, skill_based, progress_based
    conditions = db.Column(db.Text, nullable=False)  # JSON شروط تطبيق القاعدة
    actions = db.Column(db.Text, nullable=False)  # JSON الإجراءات المطلوبة
    priority = db.Column(db.Integer, default=1)  # أولوية تطبيق القاعدة
    confidence_weight = db.Column(db.Float, default=1.0)  # وزن الثقة
    is_mandatory = db.Column(db.Boolean, default=False)  # هل القاعدة إجبارية
    exceptions = db.Column(db.Text)  # JSON الاستثناءات
    validation_criteria = db.Column(db.Text)  # JSON معايير التحقق
    last_modified = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    creator = db.relationship('User', backref='recommendation_rules')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'rule_type': self.rule_type,
            'conditions': json.loads(self.conditions) if self.conditions else {},
            'actions': json.loads(self.actions) if self.actions else {},
            'priority': self.priority,
            'confidence_weight': self.confidence_weight,
            'is_mandatory': self.is_mandatory,
            'exceptions': json.loads(self.exceptions) if self.exceptions else [],
            'validation_criteria': json.loads(self.validation_criteria) if self.validation_criteria else {},
            'last_modified': self.last_modified.isoformat() if self.last_modified else None,
            'is_active': self.is_active,
            'creator_name': self.creator.name if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RecommendationMetrics(db.Model):
    """مقاييس أداء التوصيات"""
    __tablename__ = 'recommendation_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    recommendation_id = db.Column(db.Integer, db.ForeignKey('therapy_recommendations.id'), nullable=False)
    metric_type = db.Column(db.String(50), nullable=False)  # progress, engagement, satisfaction, outcome
    metric_name = db.Column(db.String(100), nullable=False)
    baseline_value = db.Column(db.Float)  # القيمة الأساسية قبل التطبيق
    current_value = db.Column(db.Float)  # القيمة الحالية
    target_value = db.Column(db.Float)  # القيمة المستهدفة
    improvement_percentage = db.Column(db.Float)  # نسبة التحسن
    measurement_date = db.Column(db.DateTime, nullable=False)
    measurement_method = db.Column(db.String(100))  # طريقة القياس
    measured_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    notes = db.Column(db.Text)
    
    # العلاقات
    recommendation = db.relationship('TherapyRecommendation', backref='metrics')
    measurer = db.relationship('User', backref='measured_metrics')
    
    def to_dict(self):
        return {
            'id': self.id,
            'recommendation_id': self.recommendation_id,
            'metric_type': self.metric_type,
            'metric_name': self.metric_name,
            'baseline_value': self.baseline_value,
            'current_value': self.current_value,
            'target_value': self.target_value,
            'improvement_percentage': self.improvement_percentage,
            'measurement_date': self.measurement_date.isoformat() if self.measurement_date else None,
            'measurement_method': self.measurement_method,
            'measured_by': self.measurer.name if self.measurer else None,
            'notes': self.notes
        }

class RecommendationAlert(db.Model):
    """تنبيهات التوصيات"""
    __tablename__ = 'recommendation_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    recommendation_id = db.Column(db.Integer, db.ForeignKey('therapy_recommendations.id'), nullable=False)
    alert_type = db.Column(db.String(50), nullable=False)  # review_due, low_progress, concern, success
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    trigger_conditions = db.Column(db.Text)  # JSON شروط التفعيل
    target_roles = db.Column(db.Text)  # JSON الأدوار المستهدفة
    is_read = db.Column(db.Boolean, default=False)
    is_resolved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime)
    resolved_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    recommendation = db.relationship('TherapyRecommendation', backref='alerts')
    resolver = db.relationship('User', backref='resolved_alerts')
    
    def to_dict(self):
        return {
            'id': self.id,
            'recommendation_id': self.recommendation_id,
            'alert_type': self.alert_type,
            'title': self.title,
            'message': self.message,
            'severity': self.severity,
            'trigger_conditions': json.loads(self.trigger_conditions) if self.trigger_conditions else {},
            'target_roles': json.loads(self.target_roles) if self.target_roles else [],
            'is_read': self.is_read,
            'is_resolved': self.is_resolved,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolved_by': self.resolver.name if self.resolver else None
        }

class RecommendationHistory(db.Model):
    """تاريخ التوصيات"""
    __tablename__ = 'recommendation_history'
    
    id = db.Column(db.Integer, primary_key=True)
    recommendation_id = db.Column(db.Integer, db.ForeignKey('therapy_recommendations.id'), nullable=False)
    action_type = db.Column(db.String(50), nullable=False)  # created, modified, approved, rejected, implemented, completed
    action_description = db.Column(db.Text)
    previous_values = db.Column(db.Text)  # JSON القيم السابقة
    new_values = db.Column(db.Text)  # JSON القيم الجديدة
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    performed_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    
    # العلاقات
    recommendation = db.relationship('TherapyRecommendation', backref='history')
    performer = db.relationship('User', backref='recommendation_actions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'recommendation_id': self.recommendation_id,
            'action_type': self.action_type,
            'action_description': self.action_description,
            'previous_values': json.loads(self.previous_values) if self.previous_values else {},
            'new_values': json.loads(self.new_values) if self.new_values else {},
            'performed_by': self.performer.name if self.performer else None,
            'performed_at': self.performed_at.isoformat() if self.performed_at else None,
            'notes': self.notes
        }
