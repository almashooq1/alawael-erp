# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات لتحليل أنماط التعلم والسلوك
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from database import db
from datetime import datetime
import json

class LearningStyle(db.Model):
    """أنماط التعلم المختلفة"""
    __tablename__ = 'learning_styles'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    description = db.Column(db.Text)
    characteristics = db.Column(db.Text)  # JSON خصائص النمط
    teaching_strategies = db.Column(db.Text)  # JSON استراتيجيات التدريس
    assessment_methods = db.Column(db.Text)  # JSON طرق التقييم
    color_code = db.Column(db.String(7), default='#007bff')
    icon = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'name_en': self.name_en,
            'description': self.description,
            'characteristics': json.loads(self.characteristics) if self.characteristics else [],
            'teaching_strategies': json.loads(self.teaching_strategies) if self.teaching_strategies else [],
            'assessment_methods': json.loads(self.assessment_methods) if self.assessment_methods else [],
            'color_code': self.color_code,
            'icon': self.icon,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class BehaviorPattern(db.Model):
    """أنماط السلوك"""
    __tablename__ = 'behavior_patterns'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # positive, negative, neutral
    description = db.Column(db.Text)
    indicators = db.Column(db.Text)  # JSON مؤشرات السلوك
    triggers = db.Column(db.Text)  # JSON محفزات السلوك
    interventions = db.Column(db.Text)  # JSON التدخلات المقترحة
    severity_level = db.Column(db.String(20), default='low')  # low, medium, high, critical
    frequency_threshold = db.Column(db.Integer, default=3)  # عدد مرات الحدوث للتنبيه
    color_code = db.Column(db.String(7))
    icon = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'description': self.description,
            'indicators': json.loads(self.indicators) if self.indicators else [],
            'triggers': json.loads(self.triggers) if self.triggers else [],
            'interventions': json.loads(self.interventions) if self.interventions else [],
            'severity_level': self.severity_level,
            'frequency_threshold': self.frequency_threshold,
            'color_code': self.color_code,
            'icon': self.icon,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class StudentLearningProfile(db.Model):
    """ملف تعريف التعلم للطالب"""
    __tablename__ = 'student_learning_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    primary_learning_style_id = db.Column(db.Integer, db.ForeignKey('learning_styles.id'))
    secondary_learning_style_id = db.Column(db.Integer, db.ForeignKey('learning_styles.id'))
    learning_preferences = db.Column(db.Text)  # JSON تفضيلات التعلم
    strengths = db.Column(db.Text)  # JSON نقاط القوة
    challenges = db.Column(db.Text)  # JSON التحديات
    attention_span = db.Column(db.Integer)  # بالدقائق
    motivation_factors = db.Column(db.Text)  # JSON عوامل التحفيز
    preferred_activities = db.Column(db.Text)  # JSON الأنشطة المفضلة
    learning_pace = db.Column(db.String(20), default='medium')  # slow, medium, fast
    social_interaction_level = db.Column(db.String(20), default='medium')  # low, medium, high
    independence_level = db.Column(db.String(20), default='medium')  # low, medium, high
    confidence_score = db.Column(db.Float, default=0.0)  # من 0 إلى 10
    last_assessment_date = db.Column(db.DateTime)
    assessed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='learning_profile')
    primary_learning_style = db.relationship('LearningStyle', foreign_keys=[primary_learning_style_id])
    secondary_learning_style = db.relationship('LearningStyle', foreign_keys=[secondary_learning_style_id])
    assessor = db.relationship('User', backref='learning_assessments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'primary_learning_style': self.primary_learning_style.to_dict() if self.primary_learning_style else None,
            'secondary_learning_style': self.secondary_learning_style.to_dict() if self.secondary_learning_style else None,
            'learning_preferences': json.loads(self.learning_preferences) if self.learning_preferences else [],
            'strengths': json.loads(self.strengths) if self.strengths else [],
            'challenges': json.loads(self.challenges) if self.challenges else [],
            'attention_span': self.attention_span,
            'motivation_factors': json.loads(self.motivation_factors) if self.motivation_factors else [],
            'preferred_activities': json.loads(self.preferred_activities) if self.preferred_activities else [],
            'learning_pace': self.learning_pace,
            'social_interaction_level': self.social_interaction_level,
            'independence_level': self.independence_level,
            'confidence_score': self.confidence_score,
            'last_assessment_date': self.last_assessment_date.isoformat() if self.last_assessment_date else None,
            'assessed_by': self.assessor.name if self.assessor else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class BehaviorObservation(db.Model):
    """ملاحظات السلوك"""
    __tablename__ = 'behavior_observations'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    behavior_pattern_id = db.Column(db.Integer, db.ForeignKey('behavior_patterns.id'))
    observer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    observation_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    duration = db.Column(db.Integer)  # مدة الملاحظة بالدقائق
    context = db.Column(db.String(100))  # classroom, playground, therapy, etc.
    antecedent = db.Column(db.Text)  # ما حدث قبل السلوك
    behavior_description = db.Column(db.Text, nullable=False)
    consequence = db.Column(db.Text)  # ما حدث بعد السلوك
    intensity = db.Column(db.String(20), default='medium')  # low, medium, high
    frequency = db.Column(db.Integer, default=1)  # عدد مرات الحدوث
    intervention_used = db.Column(db.Text)  # التدخل المستخدم
    effectiveness = db.Column(db.String(20))  # effective, partially_effective, not_effective
    environmental_factors = db.Column(db.Text)  # JSON العوامل البيئية
    emotional_state = db.Column(db.String(50))  # الحالة العاطفية للطالب
    social_context = db.Column(db.String(100))  # alone, with_peers, with_adult
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_notes = db.Column(db.Text)
    attachments = db.Column(db.Text)  # JSON مرفقات (صور، فيديو)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='behavior_observations')
    behavior_pattern = db.relationship('BehaviorPattern', backref='observations')
    observer = db.relationship('User', backref='behavior_observations')
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'behavior_pattern': self.behavior_pattern.to_dict() if self.behavior_pattern else None,
            'observer_name': self.observer.name if self.observer else None,
            'observation_date': self.observation_date.isoformat() if self.observation_date else None,
            'duration': self.duration,
            'context': self.context,
            'antecedent': self.antecedent,
            'behavior_description': self.behavior_description,
            'consequence': self.consequence,
            'intensity': self.intensity,
            'frequency': self.frequency,
            'intervention_used': self.intervention_used,
            'effectiveness': self.effectiveness,
            'environmental_factors': json.loads(self.environmental_factors) if self.environmental_factors else [],
            'emotional_state': self.emotional_state,
            'social_context': self.social_context,
            'follow_up_required': self.follow_up_required,
            'follow_up_notes': self.follow_up_notes,
            'attachments': json.loads(self.attachments) if self.attachments else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class LearningAnalytics(db.Model):
    """تحليلات التعلم"""
    __tablename__ = 'learning_analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    analysis_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    analysis_period_start = db.Column(db.DateTime, nullable=False)
    analysis_period_end = db.Column(db.DateTime, nullable=False)
    learning_progress_score = db.Column(db.Float, default=0.0)  # من 0 إلى 100
    engagement_level = db.Column(db.Float, default=0.0)  # من 0 إلى 10
    attention_consistency = db.Column(db.Float, default=0.0)  # من 0 إلى 10
    social_interaction_score = db.Column(db.Float, default=0.0)  # من 0 إلى 10
    independence_growth = db.Column(db.Float, default=0.0)  # من -10 إلى 10
    behavior_improvement = db.Column(db.Float, default=0.0)  # من -10 إلى 10
    skill_acquisition_rate = db.Column(db.Float, default=0.0)  # مهارات جديدة في الفترة
    preferred_learning_times = db.Column(db.Text)  # JSON أوقات التعلم المفضلة
    optimal_session_duration = db.Column(db.Integer)  # بالدقائق
    most_effective_strategies = db.Column(db.Text)  # JSON الاستراتيجيات الأكثر فعالية
    challenging_areas = db.Column(db.Text)  # JSON المجالات الصعبة
    recommendations = db.Column(db.Text)  # JSON التوصيات
    confidence_interval = db.Column(db.Float, default=0.95)  # مستوى الثقة في التحليل
    data_quality_score = db.Column(db.Float, default=0.0)  # جودة البيانات المستخدمة
    generated_by = db.Column(db.String(50), default='ai_system')  # ai_system, manual
    analyst_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='learning_analytics')
    analyst = db.relationship('User', backref='learning_analyses')
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'analysis_date': self.analysis_date.isoformat() if self.analysis_date else None,
            'analysis_period_start': self.analysis_period_start.isoformat() if self.analysis_period_start else None,
            'analysis_period_end': self.analysis_period_end.isoformat() if self.analysis_period_end else None,
            'learning_progress_score': self.learning_progress_score,
            'engagement_level': self.engagement_level,
            'attention_consistency': self.attention_consistency,
            'social_interaction_score': self.social_interaction_score,
            'independence_growth': self.independence_growth,
            'behavior_improvement': self.behavior_improvement,
            'skill_acquisition_rate': self.skill_acquisition_rate,
            'preferred_learning_times': json.loads(self.preferred_learning_times) if self.preferred_learning_times else [],
            'optimal_session_duration': self.optimal_session_duration,
            'most_effective_strategies': json.loads(self.most_effective_strategies) if self.most_effective_strategies else [],
            'challenging_areas': json.loads(self.challenging_areas) if self.challenging_areas else [],
            'recommendations': json.loads(self.recommendations) if self.recommendations else [],
            'confidence_interval': self.confidence_interval,
            'data_quality_score': self.data_quality_score,
            'generated_by': self.generated_by,
            'analyst_name': self.analyst.name if self.analyst else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class BehaviorIntervention(db.Model):
    """تدخلات السلوك"""
    __tablename__ = 'behavior_interventions'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    behavior_pattern_id = db.Column(db.Integer, db.ForeignKey('behavior_patterns.id'))
    intervention_name = db.Column(db.String(200), nullable=False)
    intervention_type = db.Column(db.String(50), nullable=False)  # preventive, reactive, replacement
    description = db.Column(db.Text)
    target_behaviors = db.Column(db.Text)  # JSON السلوكيات المستهدفة
    strategies = db.Column(db.Text, nullable=False)  # JSON الاستراتيجيات
    implementation_steps = db.Column(db.Text)  # JSON خطوات التنفيذ
    responsible_staff = db.Column(db.Text)  # JSON الموظفين المسؤولين
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime)
    frequency = db.Column(db.String(50))  # daily, weekly, as_needed
    duration_per_session = db.Column(db.Integer)  # بالدقائق
    success_criteria = db.Column(db.Text)  # JSON معايير النجاح
    progress_indicators = db.Column(db.Text)  # JSON مؤشرات التقدم
    data_collection_method = db.Column(db.String(100))
    baseline_data = db.Column(db.Text)  # JSON البيانات الأساسية
    current_progress = db.Column(db.Text)  # JSON التقدم الحالي
    effectiveness_rating = db.Column(db.Float, default=0.0)  # من 0 إلى 10
    side_effects = db.Column(db.Text)  # آثار جانبية
    modifications_made = db.Column(db.Text)  # JSON التعديلات المطبقة
    status = db.Column(db.String(20), default='active')  # active, paused, completed, discontinued
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    review_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='behavior_interventions')
    behavior_pattern = db.relationship('BehaviorPattern', backref='interventions')
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_interventions')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='approved_interventions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'behavior_pattern': self.behavior_pattern.to_dict() if self.behavior_pattern else None,
            'intervention_name': self.intervention_name,
            'intervention_type': self.intervention_type,
            'description': self.description,
            'target_behaviors': json.loads(self.target_behaviors) if self.target_behaviors else [],
            'strategies': json.loads(self.strategies) if self.strategies else [],
            'implementation_steps': json.loads(self.implementation_steps) if self.implementation_steps else [],
            'responsible_staff': json.loads(self.responsible_staff) if self.responsible_staff else [],
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'frequency': self.frequency,
            'duration_per_session': self.duration_per_session,
            'success_criteria': json.loads(self.success_criteria) if self.success_criteria else [],
            'progress_indicators': json.loads(self.progress_indicators) if self.progress_indicators else [],
            'data_collection_method': self.data_collection_method,
            'baseline_data': json.loads(self.baseline_data) if self.baseline_data else {},
            'current_progress': json.loads(self.current_progress) if self.current_progress else {},
            'effectiveness_rating': self.effectiveness_rating,
            'side_effects': self.side_effects,
            'modifications_made': json.loads(self.modifications_made) if self.modifications_made else [],
            'status': self.status,
            'created_by': self.creator.name if self.creator else None,
            'approved_by': self.approver.name if self.approver else None,
            'review_date': self.review_date.isoformat() if self.review_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class LearningEnvironmentFactor(db.Model):
    """عوامل البيئة التعليمية"""
    __tablename__ = 'learning_environment_factors'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # physical, social, temporal, instructional
    description = db.Column(db.Text)
    impact_level = db.Column(db.String(20), default='medium')  # low, medium, high
    measurement_method = db.Column(db.String(100))
    optimal_range = db.Column(db.String(100))  # النطاق الأمثل
    unit_of_measurement = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'description': self.description,
            'impact_level': self.impact_level,
            'measurement_method': self.measurement_method,
            'optimal_range': self.optimal_range,
            'unit_of_measurement': self.unit_of_measurement,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class EnvironmentAssessment(db.Model):
    """تقييم البيئة التعليمية"""
    __tablename__ = 'environment_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'))
    assessment_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    environmental_data = db.Column(db.Text)  # JSON بيانات العوامل البيئية
    overall_score = db.Column(db.Float, default=0.0)  # من 0 إلى 100
    strengths = db.Column(db.Text)  # JSON نقاط القوة
    areas_for_improvement = db.Column(db.Text)  # JSON مجالات التحسين
    recommendations = db.Column(db.Text)  # JSON التوصيات
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    classroom = db.relationship('Classroom', backref='environment_assessments')
    assessor = db.relationship('User', backref='environment_assessments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'classroom_id': self.classroom_id,
            'classroom_name': self.classroom.name if self.classroom else None,
            'assessment_date': self.assessment_date.isoformat() if self.assessment_date else None,
            'assessor_name': self.assessor.name if self.assessor else None,
            'environmental_data': json.loads(self.environmental_data) if self.environmental_data else {},
            'overall_score': self.overall_score,
            'strengths': json.loads(self.strengths) if self.strengths else [],
            'areas_for_improvement': json.loads(self.areas_for_improvement) if self.areas_for_improvement else [],
            'recommendations': json.loads(self.recommendations) if self.recommendations else [],
            'follow_up_required': self.follow_up_required,
            'follow_up_date': self.follow_up_date.isoformat() if self.follow_up_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
