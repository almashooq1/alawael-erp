# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات لنظام التنبؤ بالنتائج والتقدم بالذكاء الاصطناعي
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from database import db
from datetime import datetime
import json

class PredictionModel(db.Model):
    """نموذج التنبؤ بالذكاء الاصطناعي"""
    __tablename__ = 'prediction_models'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    model_type = db.Column(db.String(50), nullable=False)  # regression, classification, time_series, neural_network
    target_variable = db.Column(db.String(100), nullable=False)  # skill_improvement, behavior_change, academic_progress
    
    # معاملات النموذج
    algorithm = db.Column(db.String(100), nullable=False)  # random_forest, lstm, linear_regression, svm
    hyperparameters = db.Column(db.Text)  # JSON
    feature_columns = db.Column(db.Text)  # JSON - الخصائص المستخدمة في التنبؤ
    
    # أداء النموذج
    accuracy_score = db.Column(db.Float)
    precision_score = db.Column(db.Float)
    recall_score = db.Column(db.Float)
    f1_score = db.Column(db.Float)
    mae_score = db.Column(db.Float)  # Mean Absolute Error
    rmse_score = db.Column(db.Float)  # Root Mean Square Error
    
    # بيانات التدريب
    training_data_size = db.Column(db.Integer)
    training_period_start = db.Column(db.Date)
    training_period_end = db.Column(db.Date)
    last_trained = db.Column(db.DateTime, default=datetime.utcnow)
    
    # حالة النموذج
    is_active = db.Column(db.Boolean, default=True)
    version = db.Column(db.String(20), default='1.0')
    model_file_path = db.Column(db.String(500))  # مسار ملف النموذج المحفوظ
    
    # معلومات إضافية
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    predictions = db.relationship('ProgressPrediction', backref='model', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'model_type': self.model_type,
            'target_variable': self.target_variable,
            'algorithm': self.algorithm,
            'hyperparameters': json.loads(self.hyperparameters) if self.hyperparameters else {},
            'feature_columns': json.loads(self.feature_columns) if self.feature_columns else [],
            'accuracy_score': self.accuracy_score,
            'precision_score': self.precision_score,
            'recall_score': self.recall_score,
            'f1_score': self.f1_score,
            'mae_score': self.mae_score,
            'rmse_score': self.rmse_score,
            'training_data_size': self.training_data_size,
            'training_period_start': self.training_period_start.isoformat() if self.training_period_start else None,
            'training_period_end': self.training_period_end.isoformat() if self.training_period_end else None,
            'last_trained': self.last_trained.isoformat() if self.last_trained else None,
            'is_active': self.is_active,
            'version': self.version,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ProgressPrediction(db.Model):
    """التنبؤات بالتقدم والنتائج"""
    __tablename__ = 'progress_predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    prediction_model_id = db.Column(db.Integer, db.ForeignKey('prediction_models.id'), nullable=False)
    
    # نوع التنبؤ
    prediction_type = db.Column(db.String(50), nullable=False)  # skill_progress, behavior_improvement, academic_achievement
    skill_area = db.Column(db.String(100))  # motor_skills, communication, cognitive, social
    
    # التنبؤ
    predicted_value = db.Column(db.Float, nullable=False)
    predicted_category = db.Column(db.String(50))  # excellent, good, average, needs_improvement
    confidence_level = db.Column(db.Float, nullable=False)  # 0.0 - 1.0
    
    # الإطار الزمني
    prediction_date = db.Column(db.Date, nullable=False)
    target_date = db.Column(db.Date, nullable=False)  # التاريخ المستهدف للتحقق من التنبؤ
    time_horizon = db.Column(db.Integer, nullable=False)  # عدد الأيام
    
    # التفاصيل
    prediction_details = db.Column(db.Text)  # JSON - تفاصيل إضافية
    contributing_factors = db.Column(db.Text)  # JSON - العوامل المؤثرة
    recommendations = db.Column(db.Text)  # JSON - التوصيات المقترحة
    
    # المقارنة مع النتائج الفعلية
    actual_value = db.Column(db.Float)
    actual_category = db.Column(db.String(50))
    prediction_accuracy = db.Column(db.Float)  # دقة التنبؤ عند المقارنة
    verified_at = db.Column(db.DateTime)
    
    # حالة التنبؤ
    status = db.Column(db.String(20), default='active')  # active, verified, expired
    is_validated = db.Column(db.Boolean, default=False)
    
    # معلومات إضافية
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'prediction_model_id': self.prediction_model_id,
            'prediction_type': self.prediction_type,
            'skill_area': self.skill_area,
            'predicted_value': self.predicted_value,
            'predicted_category': self.predicted_category,
            'confidence_level': self.confidence_level,
            'prediction_date': self.prediction_date.isoformat() if self.prediction_date else None,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'time_horizon': self.time_horizon,
            'prediction_details': json.loads(self.prediction_details) if self.prediction_details else {},
            'contributing_factors': json.loads(self.contributing_factors) if self.contributing_factors else [],
            'recommendations': json.loads(self.recommendations) if self.recommendations else [],
            'actual_value': self.actual_value,
            'actual_category': self.actual_category,
            'prediction_accuracy': self.prediction_accuracy,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'status': self.status,
            'is_validated': self.is_validated,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PredictionFeature(db.Model):
    """خصائص البيانات المستخدمة في التنبؤ"""
    __tablename__ = 'prediction_features'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    feature_type = db.Column(db.String(50), nullable=False)  # numerical, categorical, boolean, text
    data_source = db.Column(db.String(100), nullable=False)  # assessments, observations, therapy_sessions
    
    # معلومات الخاصية
    category = db.Column(db.String(50))  # demographic, behavioral, academic, therapeutic
    importance_score = db.Column(db.Float)  # أهمية الخاصية في التنبؤ
    correlation_score = db.Column(db.Float)  # معامل الارتباط مع المتغير المستهدف
    
    # إعدادات المعالجة
    preprocessing_method = db.Column(db.String(50))  # normalization, standardization, encoding
    missing_value_strategy = db.Column(db.String(50))  # mean, median, mode, drop
    
    # حالة الخاصية
    is_active = db.Column(db.Boolean, default=True)
    is_required = db.Column(db.Boolean, default=False)
    
    # معلومات إضافية
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'feature_type': self.feature_type,
            'data_source': self.data_source,
            'category': self.category,
            'importance_score': self.importance_score,
            'correlation_score': self.correlation_score,
            'preprocessing_method': self.preprocessing_method,
            'missing_value_strategy': self.missing_value_strategy,
            'is_active': self.is_active,
            'is_required': self.is_required,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PredictionAlert(db.Model):
    """تنبيهات التنبؤات"""
    __tablename__ = 'prediction_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    prediction_id = db.Column(db.Integer, db.ForeignKey('progress_predictions.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    
    # نوع التنبيه
    alert_type = db.Column(db.String(50), nullable=False)  # risk_warning, opportunity, milestone_alert
    severity_level = db.Column(db.String(20), nullable=False)  # low, medium, high, critical
    
    # محتوى التنبيه
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    detailed_analysis = db.Column(db.Text)
    
    # الإجراءات المقترحة
    suggested_actions = db.Column(db.Text)  # JSON
    priority_level = db.Column(db.Integer, default=1)  # 1-10
    
    # حالة التنبيه
    status = db.Column(db.String(20), default='active')  # active, acknowledged, resolved, dismissed
    acknowledged_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    acknowledged_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    resolved_at = db.Column(db.DateTime)
    
    # توقيت التنبيه
    trigger_date = db.Column(db.DateTime, default=datetime.utcnow)
    expiry_date = db.Column(db.DateTime)
    
    # معلومات إضافية
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    prediction = db.relationship('ProgressPrediction', backref='alerts')
    
    def to_dict(self):
        return {
            'id': self.id,
            'prediction_id': self.prediction_id,
            'student_id': self.student_id,
            'alert_type': self.alert_type,
            'severity_level': self.severity_level,
            'title': self.title,
            'message': self.message,
            'detailed_analysis': self.detailed_analysis,
            'suggested_actions': json.loads(self.suggested_actions) if self.suggested_actions else [],
            'priority_level': self.priority_level,
            'status': self.status,
            'acknowledged_by': self.acknowledged_by,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'resolved_by': self.resolved_by,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'trigger_date': self.trigger_date.isoformat() if self.trigger_date else None,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PredictionValidation(db.Model):
    """التحقق من صحة التنبؤات"""
    __tablename__ = 'prediction_validations'
    
    id = db.Column(db.Integer, primary_key=True)
    prediction_id = db.Column(db.Integer, db.ForeignKey('progress_predictions.id'), nullable=False)
    
    # نتائج التحقق
    validation_date = db.Column(db.Date, nullable=False)
    actual_outcome = db.Column(db.Float, nullable=False)
    predicted_outcome = db.Column(db.Float, nullable=False)
    
    # مقاييس الدقة
    absolute_error = db.Column(db.Float, nullable=False)
    percentage_error = db.Column(db.Float, nullable=False)
    is_accurate = db.Column(db.Boolean, nullable=False)  # ضمن الحد المقبول للخطأ
    accuracy_threshold = db.Column(db.Float, default=0.1)  # الحد المقبول للخطأ
    
    # تحليل الأخطاء
    error_analysis = db.Column(db.Text)  # JSON
    contributing_factors = db.Column(db.Text)  # JSON - العوامل التي أثرت على دقة التنبؤ
    
    # التحسينات المقترحة
    model_improvements = db.Column(db.Text)  # JSON
    data_quality_issues = db.Column(db.Text)  # JSON
    
    # معلومات إضافية
    validated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    validation_notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    prediction = db.relationship('ProgressPrediction', backref='validations')
    
    def to_dict(self):
        return {
            'id': self.id,
            'prediction_id': self.prediction_id,
            'validation_date': self.validation_date.isoformat() if self.validation_date else None,
            'actual_outcome': self.actual_outcome,
            'predicted_outcome': self.predicted_outcome,
            'absolute_error': self.absolute_error,
            'percentage_error': self.percentage_error,
            'is_accurate': self.is_accurate,
            'accuracy_threshold': self.accuracy_threshold,
            'error_analysis': json.loads(self.error_analysis) if self.error_analysis else {},
            'contributing_factors': json.loads(self.contributing_factors) if self.contributing_factors else [],
            'model_improvements': json.loads(self.model_improvements) if self.model_improvements else [],
            'data_quality_issues': json.loads(self.data_quality_issues) if self.data_quality_issues else [],
            'validated_by': self.validated_by,
            'validation_notes': self.validation_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PredictionReport(db.Model):
    """تقارير التنبؤات"""
    __tablename__ = 'prediction_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    report_type = db.Column(db.String(50), nullable=False)  # individual, group, model_performance, trend_analysis
    
    # نطاق التقرير
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'))  # للتقارير الفردية
    model_id = db.Column(db.Integer, db.ForeignKey('prediction_models.id'))
    date_from = db.Column(db.Date, nullable=False)
    date_to = db.Column(db.Date, nullable=False)
    
    # محتوى التقرير
    report_data = db.Column(db.Text, nullable=False)  # JSON - بيانات التقرير
    summary_statistics = db.Column(db.Text)  # JSON - إحصائيات موجزة
    key_insights = db.Column(db.Text)  # JSON - الرؤى الرئيسية
    recommendations = db.Column(db.Text)  # JSON - التوصيات
    
    # إعدادات التقرير
    format_type = db.Column(db.String(20), default='json')  # json, pdf, excel
    is_automated = db.Column(db.Boolean, default=False)
    generation_frequency = db.Column(db.String(20))  # daily, weekly, monthly, quarterly
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')  # draft, generated, published, archived
    file_path = db.Column(db.String(500))  # مسار ملف التقرير المحفوظ
    
    # معلومات إضافية
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    published_at = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'report_type': self.report_type,
            'student_id': self.student_id,
            'model_id': self.model_id,
            'date_from': self.date_from.isoformat() if self.date_from else None,
            'date_to': self.date_to.isoformat() if self.date_to else None,
            'report_data': json.loads(self.report_data) if self.report_data else {},
            'summary_statistics': json.loads(self.summary_statistics) if self.summary_statistics else {},
            'key_insights': json.loads(self.key_insights) if self.key_insights else [],
            'recommendations': json.loads(self.recommendations) if self.recommendations else [],
            'format_type': self.format_type,
            'is_automated': self.is_automated,
            'generation_frequency': self.generation_frequency,
            'status': self.status,
            'file_path': self.file_path,
            'generated_by': self.generated_by,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
