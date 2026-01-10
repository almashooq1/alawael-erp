"""
نماذج قاعدة البيانات لنظام التحليلات المتقدمة بالذكاء الاصطناعي
Advanced Machine Learning Analytics Models
"""

from database import db
from datetime import datetime, timedelta
import json
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import func, text

class MLModel(db.Model):
    """نموذج الذكاء الاصطناعي"""
    __tablename__ = 'ml_models'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    model_type = db.Column(db.String(100), nullable=False)  # classification, regression, clustering, forecasting
    algorithm = db.Column(db.String(100), nullable=False)  # random_forest, neural_network, svm, etc.
    version = db.Column(db.String(50), default='1.0')
    status = db.Column(db.String(50), default='training')  # training, ready, deployed, deprecated
    accuracy_score = db.Column(db.Float)
    precision_score = db.Column(db.Float)
    recall_score = db.Column(db.Float)
    f1_score = db.Column(db.Float)
    training_data_size = db.Column(db.Integer)
    features_count = db.Column(db.Integer)
    hyperparameters = db.Column(JSON)
    feature_importance = db.Column(JSON)
    model_path = db.Column(db.String(500))
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_trained = db.Column(db.DateTime)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    predictions = db.relationship('MLPrediction', backref='model', lazy=True)
    evaluations = db.relationship('ModelEvaluation', backref='model', lazy=True)

class MLDataset(db.Model):
    """مجموعة البيانات للتدريب"""
    __tablename__ = 'ml_datasets'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    data_source = db.Column(db.String(100), nullable=False)  # students, assessments, programs, etc.
    data_type = db.Column(db.String(50), nullable=False)  # structured, unstructured, time_series
    records_count = db.Column(db.Integer)
    features_count = db.Column(db.Integer)
    target_variable = db.Column(db.String(100))
    data_quality_score = db.Column(db.Float)
    missing_values_percentage = db.Column(db.Float)
    outliers_count = db.Column(db.Integer)
    data_schema = db.Column(JSON)
    preprocessing_steps = db.Column(JSON)
    file_path = db.Column(db.String(500))
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)

class MLPrediction(db.Model):
    """التنبؤات المولدة"""
    __tablename__ = 'ml_predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.Integer, db.ForeignKey('ml_models.id'), nullable=False)
    prediction_type = db.Column(db.String(100), nullable=False)  # student_progress, risk_assessment, outcome_prediction
    input_data = db.Column(JSON, nullable=False)
    prediction_result = db.Column(JSON, nullable=False)
    confidence_score = db.Column(db.Float)
    probability_distribution = db.Column(JSON)
    feature_contributions = db.Column(JSON)
    explanation = db.Column(db.Text)
    actual_outcome = db.Column(db.String(200))  # للمقارنة لاحقاً
    accuracy_verified = db.Column(db.Boolean, default=False)
    prediction_date = db.Column(db.DateTime, default=datetime.utcnow)
    target_entity_type = db.Column(db.String(50))  # student, program, assessment
    target_entity_id = db.Column(db.Integer)
    created_by = db.Column(db.String(100), nullable=False)

class PatternAnalysis(db.Model):
    """تحليل الأنماط"""
    __tablename__ = 'pattern_analyses'
    
    id = db.Column(db.Integer, primary_key=True)
    analysis_name = db.Column(db.String(200), nullable=False)
    analysis_type = db.Column(db.String(100), nullable=False)  # clustering, association_rules, anomaly_detection
    data_source = db.Column(db.String(100), nullable=False)
    algorithm_used = db.Column(db.String(100), nullable=False)
    patterns_found = db.Column(JSON, nullable=False)
    pattern_strength = db.Column(db.Float)
    statistical_significance = db.Column(db.Float)
    sample_size = db.Column(db.Integer)
    confidence_interval = db.Column(JSON)
    insights = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    visualization_data = db.Column(JSON)
    analysis_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)

class ModelEvaluation(db.Model):
    """تقييم النماذج"""
    __tablename__ = 'model_evaluations'
    
    id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.Integer, db.ForeignKey('ml_models.id'), nullable=False)
    evaluation_type = db.Column(db.String(100), nullable=False)  # cross_validation, holdout, time_series_split
    test_data_size = db.Column(db.Integer)
    metrics = db.Column(JSON, nullable=False)  # accuracy, precision, recall, f1, auc, etc.
    confusion_matrix = db.Column(JSON)
    roc_curve_data = db.Column(JSON)
    feature_importance = db.Column(JSON)
    learning_curve_data = db.Column(JSON)
    validation_curve_data = db.Column(JSON)
    cross_validation_scores = db.Column(JSON)
    evaluation_notes = db.Column(db.Text)
    evaluation_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)

class MLExperiment(db.Model):
    """تجارب الذكاء الاصطناعي"""
    __tablename__ = 'ml_experiments'
    
    id = db.Column(db.Integer, primary_key=True)
    experiment_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    objective = db.Column(db.String(200), nullable=False)
    hypothesis = db.Column(db.Text)
    dataset_id = db.Column(db.Integer, db.ForeignKey('ml_datasets.id'))
    algorithms_tested = db.Column(JSON)
    hyperparameter_grid = db.Column(JSON)
    best_model_id = db.Column(db.Integer, db.ForeignKey('ml_models.id'))
    best_score = db.Column(db.Float)
    experiment_results = db.Column(JSON)
    conclusions = db.Column(db.Text)
    next_steps = db.Column(db.Text)
    status = db.Column(db.String(50), default='running')  # running, completed, failed, cancelled
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    dataset = db.relationship('MLDataset', foreign_keys=[dataset_id], backref='experiments')
    best_model = db.relationship('MLModel', foreign_keys=[best_model_id])

class FeatureEngineering(db.Model):
    """هندسة الميزات"""
    __tablename__ = 'feature_engineering'
    
    id = db.Column(db.Integer, primary_key=True)
    feature_name = db.Column(db.String(200), nullable=False)
    feature_type = db.Column(db.String(100), nullable=False)  # numerical, categorical, text, datetime
    source_columns = db.Column(JSON)
    transformation_method = db.Column(db.String(100), nullable=False)
    transformation_parameters = db.Column(JSON)
    feature_description = db.Column(db.Text)
    importance_score = db.Column(db.Float)
    correlation_with_target = db.Column(db.Float)
    null_percentage = db.Column(db.Float)
    unique_values_count = db.Column(db.Integer)
    statistical_summary = db.Column(JSON)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)

class MLInsight(db.Model):
    """الرؤى المستخرجة من التحليلات"""
    __tablename__ = 'ml_insights'
    
    id = db.Column(db.Integer, primary_key=True)
    insight_title = db.Column(db.String(200), nullable=False)
    insight_category = db.Column(db.String(100), nullable=False)  # performance, risk, opportunity, trend
    insight_type = db.Column(db.String(100), nullable=False)  # descriptive, diagnostic, predictive, prescriptive
    description = db.Column(db.Text, nullable=False)
    data_source = db.Column(db.String(100), nullable=False)
    analysis_method = db.Column(db.String(100), nullable=False)
    confidence_level = db.Column(db.Float)
    impact_level = db.Column(db.String(50))  # high, medium, low
    urgency_level = db.Column(db.String(50))  # urgent, normal, low
    affected_entities = db.Column(JSON)  # students, programs, staff affected
    supporting_data = db.Column(JSON)
    recommendations = db.Column(db.Text)
    action_items = db.Column(JSON)
    expected_outcomes = db.Column(db.Text)
    status = db.Column(db.String(50), default='new')  # new, reviewed, implemented, dismissed
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_date = db.Column(db.DateTime)
    reviewed_by = db.Column(db.String(100))
    created_by = db.Column(db.String(100), nullable=False)

class AutoMLPipeline(db.Model):
    """خط أنابيب التعلم الآلي التلقائي"""
    __tablename__ = 'automl_pipelines'
    
    id = db.Column(db.Integer, primary_key=True)
    pipeline_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    dataset_id = db.Column(db.Integer, db.ForeignKey('ml_datasets.id'), nullable=False)
    target_variable = db.Column(db.String(100), nullable=False)
    problem_type = db.Column(db.String(50), nullable=False)  # classification, regression, clustering
    preprocessing_steps = db.Column(JSON)
    feature_selection_method = db.Column(db.String(100))
    algorithms_to_try = db.Column(JSON)
    evaluation_metric = db.Column(db.String(100))
    time_limit_minutes = db.Column(db.Integer, default=60)
    best_model_id = db.Column(db.Integer, db.ForeignKey('ml_models.id'))
    pipeline_results = db.Column(JSON)
    execution_log = db.Column(db.Text)
    status = db.Column(db.String(50), default='pending')  # pending, running, completed, failed
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    dataset = db.relationship('MLDataset', backref='automl_pipelines')
    best_model = db.relationship('MLModel', foreign_keys=[best_model_id])

class MLAlert(db.Model):
    """تنبيهات الذكاء الاصطناعي"""
    __tablename__ = 'ml_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    alert_type = db.Column(db.String(100), nullable=False)  # model_drift, data_drift, performance_drop, anomaly
    severity = db.Column(db.String(50), nullable=False)  # critical, high, medium, low
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    source_model_id = db.Column(db.Integer, db.ForeignKey('ml_models.id'))
    trigger_conditions = db.Column(JSON)
    alert_data = db.Column(JSON)
    threshold_value = db.Column(db.Float)
    current_value = db.Column(db.Float)
    recommended_actions = db.Column(JSON)
    status = db.Column(db.String(50), default='active')  # active, acknowledged, resolved, dismissed
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    acknowledged_date = db.Column(db.DateTime)
    resolved_date = db.Column(db.DateTime)
    acknowledged_by = db.Column(db.String(100))
    resolved_by = db.Column(db.String(100))
    
    # Relations
    source_model = db.relationship('MLModel', backref='alerts')

# Helper Functions
def calculate_model_performance_score(accuracy, precision, recall, f1):
    """حساب نتيجة أداء النموذج الإجمالية"""
    if not all([accuracy, precision, recall, f1]):
        return 0.0
    return (accuracy * 0.3 + precision * 0.2 + recall * 0.2 + f1 * 0.3)

def get_model_status_color(status):
    """الحصول على لون حالة النموذج"""
    colors = {
        'training': 'warning',
        'ready': 'info', 
        'deployed': 'success',
        'deprecated': 'secondary'
    }
    return colors.get(status, 'secondary')

def get_insight_priority_score(impact_level, urgency_level, confidence_level):
    """حساب نتيجة أولوية الرؤية"""
    impact_scores = {'high': 3, 'medium': 2, 'low': 1}
    urgency_scores = {'urgent': 3, 'normal': 2, 'low': 1}
    
    impact_score = impact_scores.get(impact_level, 1)
    urgency_score = urgency_scores.get(urgency_level, 1)
    confidence_score = confidence_level or 0.5
    
    return (impact_score * urgency_score * confidence_score)

def get_alert_severity_color(severity):
    """الحصول على لون شدة التنبيه"""
    colors = {
        'critical': 'danger',
        'high': 'warning',
        'medium': 'info',
        'low': 'secondary'
    }
    return colors.get(severity, 'secondary')

def format_prediction_confidence(confidence):
    """تنسيق مستوى الثقة في التنبؤ"""
    if confidence >= 0.9:
        return "عالي جداً"
    elif confidence >= 0.8:
        return "عالي"
    elif confidence >= 0.7:
        return "متوسط"
    elif confidence >= 0.6:
        return "منخفض"
    else:
        return "منخفض جداً"
