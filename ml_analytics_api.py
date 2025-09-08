"""
API endpoints لنظام التحليلات المتقدمة بالذكاء الاصطناعي
Advanced Machine Learning Analytics API
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from ml_analytics_models import (
    MLModel, MLDataset, MLPrediction, PatternAnalysis, ModelEvaluation,
    MLExperiment, FeatureEngineering, MLInsight, AutoMLPipeline, MLAlert,
    calculate_model_performance_score, get_model_status_color, 
    get_insight_priority_score, get_alert_severity_color, format_prediction_confidence
)
from datetime import datetime, timedelta
import json
from sqlalchemy import func, desc, and_, or_

ml_analytics_bp = Blueprint('ml_analytics', __name__, url_prefix='/api/ml-analytics')

# ===== إدارة النماذج =====

@ml_analytics_bp.route('/models', methods=['GET'])
@jwt_required()
def get_models():
    """الحصول على قائمة النماذج مع الفلترة والترقيم"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        model_type = request.args.get('model_type')
        status = request.args.get('status')
        search = request.args.get('search', '')
        
        query = MLModel.query
        
        if model_type:
            query = query.filter(MLModel.model_type == model_type)
        if status:
            query = query.filter(MLModel.status == status)
        if search:
            query = query.filter(
                or_(
                    MLModel.name.contains(search),
                    MLModel.description.contains(search),
                    MLModel.algorithm.contains(search)
                )
            )
        
        models = query.order_by(desc(MLModel.created_date)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        models_data = []
        for model in models.items:
            model_data = {
                'id': model.id,
                'name': model.name,
                'description': model.description,
                'model_type': model.model_type,
                'algorithm': model.algorithm,
                'version': model.version,
                'status': model.status,
                'status_color': get_model_status_color(model.status),
                'accuracy_score': model.accuracy_score,
                'precision_score': model.precision_score,
                'recall_score': model.recall_score,
                'f1_score': model.f1_score,
                'performance_score': calculate_model_performance_score(
                    model.accuracy_score, model.precision_score, 
                    model.recall_score, model.f1_score
                ),
                'training_data_size': model.training_data_size,
                'features_count': model.features_count,
                'created_date': model.created_date.isoformat() if model.created_date else None,
                'last_trained': model.last_trained.isoformat() if model.last_trained else None,
                'created_by': model.created_by,
                'predictions_count': len(model.predictions)
            }
            models_data.append(model_data)
        
        return jsonify({
            'success': True,
            'models': models_data,
            'pagination': {
                'page': models.page,
                'pages': models.pages,
                'per_page': models.per_page,
                'total': models.total,
                'has_next': models.has_next,
                'has_prev': models.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب النماذج: {str(e)}'}), 500

@ml_analytics_bp.route('/models', methods=['POST'])
@jwt_required()
def create_model():
    """إنشاء نموذج جديد"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        model = MLModel(
            name=data['name'],
            description=data.get('description'),
            model_type=data['model_type'],
            algorithm=data['algorithm'],
            version=data.get('version', '1.0'),
            hyperparameters=data.get('hyperparameters', {}),
            created_by=current_user
        )
        
        db.session.add(model)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء النموذج بنجاح',
            'model_id': model.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'خطأ في إنشاء النموذج: {str(e)}'}), 500

@ml_analytics_bp.route('/models/<int:model_id>/train', methods=['POST'])
@jwt_required()
def train_model(model_id):
    """تدريب النموذج"""
    try:
        current_user = get_jwt_identity()
        model = MLModel.query.get_or_404(model_id)
        data = request.get_json()
        
        # محاكاة عملية التدريب
        model.status = 'training'
        model.last_trained = datetime.utcnow()
        model.training_data_size = data.get('training_data_size', 1000)
        model.features_count = data.get('features_count', 10)
        
        # محاكاة نتائج التدريب
        import random
        model.accuracy_score = round(random.uniform(0.75, 0.95), 3)
        model.precision_score = round(random.uniform(0.70, 0.90), 3)
        model.recall_score = round(random.uniform(0.70, 0.90), 3)
        model.f1_score = round(random.uniform(0.70, 0.90), 3)
        
        # محاكاة أهمية الميزات
        feature_importance = {}
        for i in range(model.features_count):
            feature_importance[f'feature_{i+1}'] = round(random.uniform(0.01, 0.15), 3)
        model.feature_importance = feature_importance
        
        model.status = 'ready'
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تدريب النموذج بنجاح',
            'metrics': {
                'accuracy': model.accuracy_score,
                'precision': model.precision_score,
                'recall': model.recall_score,
                'f1': model.f1_score
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'خطأ في تدريب النموذج: {str(e)}'}), 500

# ===== التنبؤات =====

@ml_analytics_bp.route('/predictions', methods=['GET'])
@jwt_required()
def get_predictions():
    """الحصول على قائمة التنبؤات"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        model_id = request.args.get('model_id', type=int)
        prediction_type = request.args.get('prediction_type')
        
        query = MLPrediction.query
        
        if model_id:
            query = query.filter(MLPrediction.model_id == model_id)
        if prediction_type:
            query = query.filter(MLPrediction.prediction_type == prediction_type)
        
        predictions = query.order_by(desc(MLPrediction.prediction_date)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        predictions_data = []
        for pred in predictions.items:
            pred_data = {
                'id': pred.id,
                'model_name': pred.model.name if pred.model else 'غير محدد',
                'prediction_type': pred.prediction_type,
                'confidence_score': pred.confidence_score,
                'confidence_text': format_prediction_confidence(pred.confidence_score or 0),
                'prediction_result': pred.prediction_result,
                'explanation': pred.explanation,
                'prediction_date': pred.prediction_date.isoformat() if pred.prediction_date else None,
                'target_entity_type': pred.target_entity_type,
                'target_entity_id': pred.target_entity_id,
                'accuracy_verified': pred.accuracy_verified,
                'created_by': pred.created_by
            }
            predictions_data.append(pred_data)
        
        return jsonify({
            'success': True,
            'predictions': predictions_data,
            'pagination': {
                'page': predictions.page,
                'pages': predictions.pages,
                'per_page': predictions.per_page,
                'total': predictions.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب التنبؤات: {str(e)}'}), 500

@ml_analytics_bp.route('/predictions', methods=['POST'])
@jwt_required()
def create_prediction():
    """إنشاء تنبؤ جديد"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        model = MLModel.query.get_or_404(data['model_id'])
        
        # محاكاة عملية التنبؤ
        import random
        
        prediction_result = {}
        confidence_score = round(random.uniform(0.6, 0.95), 3)
        
        if model.model_type == 'classification':
            classes = ['منخفض', 'متوسط', 'عالي']
            prediction_result = {
                'predicted_class': random.choice(classes),
                'probabilities': {cls: round(random.uniform(0.1, 0.8), 3) for cls in classes}
            }
        elif model.model_type == 'regression':
            prediction_result = {
                'predicted_value': round(random.uniform(50, 100), 2),
                'confidence_interval': [round(random.uniform(45, 55), 2), round(random.uniform(95, 105), 2)]
            }
        
        explanation = f"التنبؤ مبني على {model.features_count} ميزة مع دقة نموذج {model.accuracy_score:.1%}"
        
        prediction = MLPrediction(
            model_id=data['model_id'],
            prediction_type=data['prediction_type'],
            input_data=data['input_data'],
            prediction_result=prediction_result,
            confidence_score=confidence_score,
            explanation=explanation,
            target_entity_type=data.get('target_entity_type'),
            target_entity_id=data.get('target_entity_id'),
            created_by=current_user
        )
        
        db.session.add(prediction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء التنبؤ بنجاح',
            'prediction': {
                'id': prediction.id,
                'result': prediction_result,
                'confidence': confidence_score,
                'explanation': explanation
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'خطأ في إنشاء التنبؤ: {str(e)}'}), 500

# ===== تحليل الأنماط =====

@ml_analytics_bp.route('/patterns', methods=['GET'])
@jwt_required()
def get_patterns():
    """الحصول على تحليلات الأنماط"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        analysis_type = request.args.get('analysis_type')
        
        query = PatternAnalysis.query
        
        if analysis_type:
            query = query.filter(PatternAnalysis.analysis_type == analysis_type)
        
        patterns = query.order_by(desc(PatternAnalysis.analysis_date)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        patterns_data = []
        for pattern in patterns.items:
            pattern_data = {
                'id': pattern.id,
                'analysis_name': pattern.analysis_name,
                'analysis_type': pattern.analysis_type,
                'data_source': pattern.data_source,
                'algorithm_used': pattern.algorithm_used,
                'pattern_strength': pattern.pattern_strength,
                'statistical_significance': pattern.statistical_significance,
                'sample_size': pattern.sample_size,
                'insights': pattern.insights,
                'recommendations': pattern.recommendations,
                'analysis_date': pattern.analysis_date.isoformat() if pattern.analysis_date else None,
                'created_by': pattern.created_by
            }
            patterns_data.append(pattern_data)
        
        return jsonify({
            'success': True,
            'patterns': patterns_data,
            'pagination': {
                'page': patterns.page,
                'pages': patterns.pages,
                'per_page': patterns.per_page,
                'total': patterns.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب الأنماط: {str(e)}'}), 500

@ml_analytics_bp.route('/patterns/analyze', methods=['POST'])
@jwt_required()
def analyze_patterns():
    """تشغيل تحليل أنماط جديد"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        # محاكاة تحليل الأنماط
        import random
        
        patterns_found = []
        if data['analysis_type'] == 'clustering':
            for i in range(3):
                patterns_found.append({
                    'cluster_id': i + 1,
                    'size': random.randint(50, 200),
                    'characteristics': [f'خاصية {j+1}' for j in range(3)],
                    'centroid': [round(random.uniform(0, 100), 2) for _ in range(5)]
                })
        elif data['analysis_type'] == 'association_rules':
            rules = [
                {'antecedent': 'مهارة A', 'consequent': 'مهارة B', 'confidence': 0.85, 'support': 0.3},
                {'antecedent': 'برنامج X', 'consequent': 'تحسن Y', 'confidence': 0.78, 'support': 0.25}
            ]
            patterns_found = rules
        
        insights = f"تم اكتشاف {len(patterns_found)} نمط مهم في البيانات"
        recommendations = "يُنصح بمراجعة الأنماط المكتشفة وتطبيق التوصيات المناسبة"
        
        analysis = PatternAnalysis(
            analysis_name=data['analysis_name'],
            analysis_type=data['analysis_type'],
            data_source=data['data_source'],
            algorithm_used=data.get('algorithm_used', 'k-means'),
            patterns_found=patterns_found,
            pattern_strength=round(random.uniform(0.6, 0.9), 3),
            statistical_significance=round(random.uniform(0.01, 0.05), 3),
            sample_size=data.get('sample_size', 1000),
            insights=insights,
            recommendations=recommendations,
            created_by=current_user
        )
        
        db.session.add(analysis)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تشغيل تحليل الأنماط بنجاح',
            'analysis_id': analysis.id,
            'patterns_count': len(patterns_found)
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'خطأ في تحليل الأنماط: {str(e)}'}), 500

# ===== الرؤى الذكية =====

@ml_analytics_bp.route('/insights', methods=['GET'])
@jwt_required()
def get_insights():
    """الحصول على الرؤى الذكية"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        category = request.args.get('category')
        status = request.args.get('status')
        
        query = MLInsight.query
        
        if category:
            query = query.filter(MLInsight.insight_category == category)
        if status:
            query = query.filter(MLInsight.status == status)
        
        insights = query.order_by(desc(MLInsight.created_date)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        insights_data = []
        for insight in insights.items:
            priority_score = get_insight_priority_score(
                insight.impact_level, insight.urgency_level, insight.confidence_level
            )
            
            insight_data = {
                'id': insight.id,
                'insight_title': insight.insight_title,
                'insight_category': insight.insight_category,
                'insight_type': insight.insight_type,
                'description': insight.description,
                'confidence_level': insight.confidence_level,
                'impact_level': insight.impact_level,
                'urgency_level': insight.urgency_level,
                'priority_score': priority_score,
                'recommendations': insight.recommendations,
                'status': insight.status,
                'created_date': insight.created_date.isoformat() if insight.created_date else None,
                'created_by': insight.created_by
            }
            insights_data.append(insight_data)
        
        return jsonify({
            'success': True,
            'insights': insights_data,
            'pagination': {
                'page': insights.page,
                'pages': insights.pages,
                'per_page': insights.per_page,
                'total': insights.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب الرؤى: {str(e)}'}), 500

# ===== التنبيهات =====

@ml_analytics_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    """الحصول على تنبيهات الذكاء الاصطناعي"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        severity = request.args.get('severity')
        status = request.args.get('status')
        
        query = MLAlert.query
        
        if severity:
            query = query.filter(MLAlert.severity == severity)
        if status:
            query = query.filter(MLAlert.status == status)
        
        alerts = query.order_by(desc(MLAlert.created_date)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        alerts_data = []
        for alert in alerts.items:
            alert_data = {
                'id': alert.id,
                'alert_type': alert.alert_type,
                'severity': alert.severity,
                'severity_color': get_alert_severity_color(alert.severity),
                'title': alert.title,
                'description': alert.description,
                'current_value': alert.current_value,
                'threshold_value': alert.threshold_value,
                'status': alert.status,
                'created_date': alert.created_date.isoformat() if alert.created_date else None,
                'acknowledged_date': alert.acknowledged_date.isoformat() if alert.acknowledged_date else None,
                'acknowledged_by': alert.acknowledged_by
            }
            alerts_data.append(alert_data)
        
        return jsonify({
            'success': True,
            'alerts': alerts_data,
            'pagination': {
                'page': alerts.page,
                'pages': alerts.pages,
                'per_page': alerts.per_page,
                'total': alerts.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب التنبيهات: {str(e)}'}), 500

@ml_analytics_bp.route('/alerts/<int:alert_id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_alert(alert_id):
    """تأكيد التنبيه"""
    try:
        current_user = get_jwt_identity()
        alert = MLAlert.query.get_or_404(alert_id)
        
        alert.status = 'acknowledged'
        alert.acknowledged_date = datetime.utcnow()
        alert.acknowledged_by = current_user
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تأكيد التنبيه بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'خطأ في تأكيد التنبيه: {str(e)}'}), 500

# ===== لوحة التحكم =====

@ml_analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """الحصول على بيانات لوحة التحكم"""
    try:
        # إحصائيات عامة
        total_models = MLModel.query.count()
        active_models = MLModel.query.filter(MLModel.status == 'deployed').count()
        total_predictions = MLPrediction.query.count()
        total_insights = MLInsight.query.count()
        
        # النماذج حسب النوع
        models_by_type = db.session.query(
            MLModel.model_type,
            func.count(MLModel.id).label('count')
        ).group_by(MLModel.model_type).all()
        
        # التنبؤات الأخيرة
        recent_predictions = MLPrediction.query.order_by(
            desc(MLPrediction.prediction_date)
        ).limit(5).all()
        
        # التنبيهات النشطة
        active_alerts = MLAlert.query.filter(MLAlert.status == 'active').count()
        critical_alerts = MLAlert.query.filter(
            and_(MLAlert.status == 'active', MLAlert.severity == 'critical')
        ).count()
        
        # أداء النماذج
        model_performance = []
        top_models = MLModel.query.filter(
            MLModel.accuracy_score.isnot(None)
        ).order_by(desc(MLModel.accuracy_score)).limit(5).all()
        
        for model in top_models:
            performance_score = calculate_model_performance_score(
                model.accuracy_score, model.precision_score,
                model.recall_score, model.f1_score
            )
            model_performance.append({
                'name': model.name,
                'accuracy': model.accuracy_score,
                'performance_score': performance_score
            })
        
        # الرؤى حسب الفئة
        insights_by_category = db.session.query(
            MLInsight.insight_category,
            func.count(MLInsight.id).label('count')
        ).group_by(MLInsight.insight_category).all()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'statistics': {
                    'total_models': total_models,
                    'active_models': active_models,
                    'total_predictions': total_predictions,
                    'total_insights': total_insights,
                    'active_alerts': active_alerts,
                    'critical_alerts': critical_alerts
                },
                'models_by_type': [{'type': item[0], 'count': item[1]} for item in models_by_type],
                'model_performance': model_performance,
                'insights_by_category': [{'category': item[0], 'count': item[1]} for item in insights_by_category],
                'recent_predictions': [
                    {
                        'id': pred.id,
                        'type': pred.prediction_type,
                        'confidence': pred.confidence_score,
                        'date': pred.prediction_date.isoformat() if pred.prediction_date else None
                    } for pred in recent_predictions
                ]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب بيانات لوحة التحكم: {str(e)}'}), 500

# ===== AutoML =====

@ml_analytics_bp.route('/automl/pipelines', methods=['POST'])
@jwt_required()
def create_automl_pipeline():
    """إنشاء خط أنابيب AutoML"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        pipeline = AutoMLPipeline(
            pipeline_name=data['pipeline_name'],
            description=data.get('description'),
            dataset_id=data['dataset_id'],
            target_variable=data['target_variable'],
            problem_type=data['problem_type'],
            algorithms_to_try=data.get('algorithms_to_try', ['random_forest', 'svm', 'neural_network']),
            evaluation_metric=data.get('evaluation_metric', 'accuracy'),
            time_limit_minutes=data.get('time_limit_minutes', 60),
            created_by=current_user
        )
        
        db.session.add(pipeline)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء خط أنابيب AutoML بنجاح',
            'pipeline_id': pipeline.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'خطأ في إنشاء خط الأنابيب: {str(e)}'}), 500
