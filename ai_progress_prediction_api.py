from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit
)
# -*- coding: utf-8 -*-
"""
واجهة برمجة التطبيقات لنظام التنبؤ بالنتائج والتقدم بالذكاء الاصطناعي
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ai_progress_prediction_services import AIProgressPredictionService
from ai_progress_prediction_models import (
    PredictionModel, ProgressPrediction, PredictionFeature, 
    PredictionAlert, PredictionValidation, PredictionReport
)
from database import db
from datetime import datetime, date
import json

# إنشاء Blueprint
ai_prediction_bp = Blueprint('ai_prediction', __name__, url_prefix='/api/ai-prediction')

# إنشاء خدمة التنبؤ
prediction_service = AIProgressPredictionService()

@ai_prediction_bp.route('/models', methods=['GET'])
@jwt_required()
@check_permission('view_ai_progress_prediction')
@log_audit('GET_PREDICTION_MODELS')
def get_prediction_models():
    """الحصول على قائمة نماذج التنبؤ"""
    try:
        models = PredictionModel.query.filter_by(is_active=True).all()
        return jsonify([model.to_dict() for model in models]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/models', methods=['POST'])
@jwt_required()
@check_permission('manage_ai_progress_prediction')
@guard_payload_size()
@log_audit('CREATE_PREDICTION_MODEL')
def create_prediction_model():
    """إنشاء نموذج تنبؤ جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name', 'model_type', 'target_variable', 'algorithm']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        model = prediction_service.create_prediction_model(data, current_user_id)
        return jsonify(model), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/models/<int:model_id>/train', methods=['POST'])
@jwt_required()
@check_permission('manage_ai_progress_prediction')
@guard_payload_size()
@log_audit('TRAIN_MODEL')
def train_model():
    """تدريب نموذج التنبؤ"""
    try:
        model_id = request.view_args['model_id']
        data = request.get_json()
        
        model = prediction_service.train_prediction_model(model_id, data.get('training_data'))
        return jsonify(model), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/predict', methods=['POST'])
@jwt_required()
@check_permission('generate_ai_progress_prediction')
@guard_payload_size()
@log_audit('GENERATE_PREDICTION')
def generate_prediction():
    """إنشاء تنبؤ جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['student_id', 'model_id', 'prediction_type', 'target_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        # تحويل التاريخ
        data['target_date'] = datetime.strptime(data['target_date'], '%Y-%m-%d').date()
        
        prediction = prediction_service.generate_prediction(
            data['student_id'],
            data['model_id'],
            data,
            current_user_id
        )
        return jsonify(prediction), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/student/<int:student_id>/predictions', methods=['GET'])
@jwt_required()
@check_permission('view_ai_progress_prediction')
@log_audit('GET_STUDENT_PREDICTIONS')
def get_student_predictions():
    """الحصول على تنبؤات الطالب"""
    try:
        student_id = request.view_args['student_id']
        
        # فلاتر اختيارية
        filters = {}
        if request.args.get('prediction_type'):
            filters['prediction_type'] = request.args.get('prediction_type')
        if request.args.get('skill_area'):
            filters['skill_area'] = request.args.get('skill_area')
        if request.args.get('status'):
            filters['status'] = request.args.get('status')
        if request.args.get('date_from'):
            filters['date_from'] = datetime.strptime(request.args.get('date_from'), '%Y-%m-%d').date()
        if request.args.get('date_to'):
            filters['date_to'] = datetime.strptime(request.args.get('date_to'), '%Y-%m-%d').date()
        
        predictions = prediction_service.get_student_predictions(student_id, filters)
        return jsonify({'predictions': predictions}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/predictions/<int:prediction_id>', methods=['GET'])
@jwt_required()
@check_permission('view_ai_progress_prediction')
@log_audit('GET_PREDICTION_DETAILS')
def get_prediction_details():
    """الحصول على تفاصيل التنبؤ"""
    try:
        prediction_id = request.view_args['prediction_id']
        prediction = ProgressPrediction.query.get(prediction_id)
        
        if not prediction:
            return jsonify({'error': 'التنبؤ غير موجود'}), 404
        
        return jsonify(prediction.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/predictions/<int:prediction_id>/validate', methods=['POST'])
@jwt_required()
@check_permission('manage_ai_progress_prediction')
@guard_payload_size()
@log_audit('VALIDATE_PREDICTION')
def validate_prediction():
    """التحقق من صحة التنبؤ"""
    try:
        current_user_id = get_jwt_identity()
        prediction_id = request.view_args['prediction_id']
        data = request.get_json()
        
        if 'actual_outcome' not in data:
            return jsonify({'error': 'النتيجة الفعلية مطلوبة'}), 400
        
        validation = prediction_service.validate_prediction(
            prediction_id,
            data['actual_outcome'],
            current_user_id
        )
        return jsonify(validation), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_PREDICTION_DASHBOARD')
def get_prediction_dashboard():
    """الحصول على بيانات لوحة تحكم التنبؤات"""
    try:
        filters = {}
        if request.args.get('date_from'):
            filters['date_from'] = datetime.strptime(request.args.get('date_from'), '%Y-%m-%d').date()
        if request.args.get('date_to'):
            filters['date_to'] = datetime.strptime(request.args.get('date_to'), '%Y-%m-%d').date()
        
        dashboard_data = prediction_service.get_prediction_dashboard(filters)
        return jsonify(dashboard_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/alerts', methods=['GET'])
@jwt_required()
@check_permission('view_ai_progress_prediction')
@log_audit('GET_PREDICTION_ALERTS')
def get_prediction_alerts():
    """الحصول على تنبيهات التنبؤات"""
    try:
        status = request.args.get('status', 'active')
        severity = request.args.get('severity')
        
        query = PredictionAlert.query.filter_by(status=status)
        if severity:
            query = query.filter_by(severity_level=severity)
        
        alerts = query.order_by(PredictionAlert.trigger_date.desc()).limit(50).all()
        return jsonify([alert.to_dict() for alert in alerts]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/alerts/<int:alert_id>/acknowledge', methods=['PUT'])
@jwt_required()
@check_permission('manage_ai_progress_prediction')
@guard_payload_size()
@log_audit('ACKNOWLEDGE_ALERT')
def acknowledge_alert():
    """الإقرار بالتنبيه"""
    try:
        current_user_id = get_jwt_identity()
        alert_id = request.view_args['alert_id']
        
        alert = PredictionAlert.query.get(alert_id)
        if not alert:
            return jsonify({'error': 'التنبيه غير موجود'}), 404
        
        alert.status = 'acknowledged'
        alert.acknowledged_by = current_user_id
        alert.acknowledged_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify(alert.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/alerts/<int:alert_id>/resolve', methods=['PUT'])
@jwt_required()
@check_permission('manage_ai_progress_prediction')
@guard_payload_size()
@log_audit('RESOLVE_ALERT')
def resolve_alert():
    """حل التنبيه"""
    try:
        current_user_id = get_jwt_identity()
        alert_id = request.view_args['alert_id']
        
        alert = PredictionAlert.query.get(alert_id)
        if not alert:
            return jsonify({'error': 'التنبيه غير موجود'}), 404
        
        alert.status = 'resolved'
        alert.resolved_by = current_user_id
        alert.resolved_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify(alert.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/features', methods=['GET'])
@jwt_required()
@check_permission('view_ai_progress_prediction')
@log_audit('GET_PREDICTION_FEATURES')
def get_prediction_features():
    """الحصول على خصائص التنبؤ"""
    try:
        features = PredictionFeature.query.filter_by(is_active=True).all()
        return jsonify([feature.to_dict() for feature in features]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/features', methods=['POST'])
@jwt_required()
@check_permission('manage_ai_progress_prediction')
@guard_payload_size()
@log_audit('CREATE_PREDICTION_FEATURE')
def create_prediction_feature():
    """إنشاء خاصية تنبؤ جديدة"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name', 'feature_type', 'data_source']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        feature = PredictionFeature(
            name=data['name'],
            description=data.get('description'),
            feature_type=data['feature_type'],
            data_source=data['data_source'],
            category=data.get('category'),
            importance_score=data.get('importance_score'),
            correlation_score=data.get('correlation_score'),
            preprocessing_method=data.get('preprocessing_method'),
            missing_value_strategy=data.get('missing_value_strategy'),
            is_required=data.get('is_required', False),
            created_by=current_user_id
        )
        
        db.session.add(feature)
        db.session.commit()
        
        return jsonify(feature.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/reports', methods=['GET'])
@jwt_required()
@check_permission('view_reports')
@log_audit('GET_PREDICTION_REPORTS')
def get_prediction_reports():
    """الحصول على تقارير التنبؤات"""
    try:
        report_type = request.args.get('report_type')
        status = request.args.get('status')
        
        query = PredictionReport.query
        if report_type:
            query = query.filter_by(report_type=report_type)
        if status:
            query = query.filter_by(status=status)
        
        reports = query.order_by(PredictionReport.generated_at.desc()).limit(20).all()
        return jsonify([report.to_dict() for report in reports]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/reports', methods=['POST'])
@jwt_required()
@check_permission('generate_ai_progress_prediction')
@guard_payload_size()
@log_audit('GENERATE_PREDICTION_REPORT')
def generate_prediction_report():
    """إنشاء تقرير تنبؤات"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['title', 'report_type', 'date_from', 'date_to']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        # تحويل التواريخ
        date_from = datetime.strptime(data['date_from'], '%Y-%m-%d').date()
        date_to = datetime.strptime(data['date_to'], '%Y-%m-%d').date()
        
        # جمع بيانات التقرير (مبسط)
        report_data = {
            'total_predictions': ProgressPrediction.query.filter(
                ProgressPrediction.prediction_date.between(date_from, date_to)
            ).count(),
            'validated_predictions': ProgressPrediction.query.filter(
                ProgressPrediction.prediction_date.between(date_from, date_to),
                ProgressPrediction.is_validated == True
            ).count()
        }
        
        report = PredictionReport(
            title=data['title'],
            description=data.get('description'),
            report_type=data['report_type'],
            student_id=data.get('student_id'),
            model_id=data.get('model_id'),
            date_from=date_from,
            date_to=date_to,
            report_data=json.dumps(report_data),
            format_type=data.get('format_type', 'json'),
            generated_by=current_user_id
        )
        
        db.session.add(report)
        db.session.commit()
        
        return jsonify(report.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/analytics/accuracy', methods=['GET'])
@jwt_required()
@check_permission('view_ai_progress_prediction')
@log_audit('GET_ACCURACY_ANALYTICS')
def get_accuracy_analytics():
    """تحليلات دقة التنبؤات"""
    try:
        # حساب دقة النماذج
        validations = PredictionValidation.query.all()
        
        if not validations:
            return jsonify({
                'overall_accuracy': 0,
                'model_accuracies': {},
                'accuracy_trends': []
            }), 200
        
        # الدقة الإجمالية
        overall_accuracy = sum(1 for v in validations if v.is_accurate) / len(validations) * 100
        
        # دقة كل نموذج
        model_accuracies = {}
        for validation in validations:
            model_id = validation.prediction.prediction_model_id
            if model_id not in model_accuracies:
                model_accuracies[model_id] = {'correct': 0, 'total': 0}
            
            model_accuracies[model_id]['total'] += 1
            if validation.is_accurate:
                model_accuracies[model_id]['correct'] += 1
        
        # حساب النسب المئوية
        for model_id in model_accuracies:
            total = model_accuracies[model_id]['total']
            correct = model_accuracies[model_id]['correct']
            model_accuracies[model_id]['accuracy'] = (correct / total) * 100 if total > 0 else 0
        
        return jsonify({
            'overall_accuracy': overall_accuracy,
            'model_accuracies': model_accuracies,
            'total_validations': len(validations)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_prediction_bp.route('/analytics/trends', methods=['GET'])
@jwt_required()
@check_permission('view_ai_progress_prediction')
@log_audit('GET_PREDICTION_TRENDS')
def get_prediction_trends():
    """تحليل اتجاهات التنبؤات"""
    try:
        # اتجاهات التنبؤات خلال الأشهر الماضية
        from sqlalchemy import func, extract
        
        monthly_predictions = db.session.query(
            extract('year', ProgressPrediction.prediction_date).label('year'),
            extract('month', ProgressPrediction.prediction_date).label('month'),
            func.count(ProgressPrediction.id).label('count')
        ).group_by('year', 'month').order_by('year', 'month').all()
        
        trends = []
        for year, month, count in monthly_predictions:
            trends.append({
                'period': f"{int(year)}-{int(month):02d}",
                'predictions_count': count
            })
        
        return jsonify({'trends': trends}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
