from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit
)
# -*- coding: utf-8 -*-
"""
واجهة برمجة التطبيقات للتوصيات الذكية للبرامج العلاجية
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from smart_therapy_recommendations_services import SmartTherapyRecommendationService
from smart_therapy_recommendations_models import (
    TherapyRecommendationEngine, TherapyRecommendation, RecommendationTemplate,
    RecommendationFeedback, RecommendationRule, RecommendationMetrics,
    RecommendationAlert, RecommendationHistory
)
from database import db
import json

# إنشاء Blueprint
smart_therapy_bp = Blueprint('smart_therapy', __name__, url_prefix='/api/smart-therapy')

@smart_therapy_bp.route('/generate-recommendations/<int:student_id>', methods=['POST'])
@jwt_required()
@check_permission('generate_smart_therapy_recommendations')
@guard_payload_size()
@log_audit('GENERATE_RECOMMENDATIONS')
def generate_recommendations(student_id):
    """إنشاء توصيات ذكية للطالب"""
    try:
        data = request.get_json() or {}
        recommendation_type = data.get('recommendation_type')
        
        result = SmartTherapyRecommendationService.generate_recommendations_for_student(
            student_id, recommendation_type
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء التوصيات: {str(e)}'
        }), 500

@smart_therapy_bp.route('/recommendations', methods=['GET'])
@jwt_required()
@check_permission('view_smart_therapy_recommendations')
@log_audit('GET_RECOMMENDATIONS')
def get_recommendations():
    """الحصول على التوصيات"""
    try:
        student_id = request.args.get('student_id', type=int)
        status = request.args.get('status')
        recommendation_type = request.args.get('type')
        priority = request.args.get('priority')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = TherapyRecommendation.query
        
        if student_id:
            query = query.filter_by(student_id=student_id)
        
        if status:
            query = query.filter_by(status=status)
        
        if recommendation_type:
            query = query.filter_by(recommendation_type=recommendation_type)
        
        if priority:
            query = query.filter_by(priority_level=priority)
        
        recommendations = query.order_by(TherapyRecommendation.generated_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'recommendations': [rec.to_dict() for rec in recommendations.items],
            'pagination': {
                'page': page,
                'pages': recommendations.pages,
                'per_page': per_page,
                'total': recommendations.total
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب التوصيات: {str(e)}'
        }), 500

@smart_therapy_bp.route('/recommendations/<int:recommendation_id>', methods=['GET'])
@jwt_required()
@check_permission('view_smart_therapy_recommendations')
@log_audit('GET_RECOMMENDATION_DETAILS')
def get_recommendation_details(recommendation_id):
    """الحصول على تفاصيل توصية محددة"""
    try:
        recommendation = TherapyRecommendation.query.get_or_404(recommendation_id)
        
        # جلب التقييمات
        feedback = RecommendationFeedback.query.filter_by(
            recommendation_id=recommendation_id
        ).all()
        
        # جلب المقاييس
        metrics = RecommendationMetrics.query.filter_by(
            recommendation_id=recommendation_id
        ).all()
        
        # جلب التاريخ
        history = RecommendationHistory.query.filter_by(
            recommendation_id=recommendation_id
        ).order_by(RecommendationHistory.performed_at.desc()).all()
        
        return jsonify({
            'success': True,
            'recommendation': recommendation.to_dict(),
            'feedback': [fb.to_dict() for fb in feedback],
            'metrics': [metric.to_dict() for metric in metrics],
            'history': [hist.to_dict() for hist in history]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب تفاصيل التوصية: {str(e)}'
        }), 500

@smart_therapy_bp.route('/recommendations/<int:recommendation_id>/approve', methods=['POST'])
@jwt_required()
@check_permission('manage_smart_therapy_recommendations')
@guard_payload_size()
@log_audit('APPROVE_RECOMMENDATION')
def approve_recommendation(recommendation_id):
    """الموافقة على توصية"""
    try:
        data = request.get_json() or {}
        current_user_id = get_jwt_identity()
        notes = data.get('notes')
        
        result = SmartTherapyRecommendationService.approve_recommendation(
            recommendation_id, current_user_id, notes
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الموافقة على التوصية: {str(e)}'
        }), 500

@smart_therapy_bp.route('/recommendations/<int:recommendation_id>/reject', methods=['POST'])
@jwt_required()
@check_permission('manage_smart_therapy_recommendations')
@guard_payload_size()
@log_audit('REJECT_RECOMMENDATION')
def reject_recommendation(recommendation_id):
    """رفض توصية"""
    try:
        data = request.get_json() or {}
        current_user_id = get_jwt_identity()
        reason = data.get('reason', '')
        
        recommendation = TherapyRecommendation.query.get_or_404(recommendation_id)
        
        recommendation.status = 'rejected'
        recommendation.reviewed_by = current_user_id
        recommendation.reviewed_at = datetime.utcnow()
        recommendation.notes = reason
        
        # إضافة سجل في التاريخ
        history = RecommendationHistory(
            recommendation_id=recommendation_id,
            action_type='rejected',
            action_description='تم رفض التوصية',
            performed_by=current_user_id,
            notes=reason
        )
        db.session.add(history)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم رفض التوصية بنجاح',
            'recommendation': recommendation.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في رفض التوصية: {str(e)}'
        }), 500

@smart_therapy_bp.route('/recommendations/<int:recommendation_id>/implement', methods=['POST'])
@jwt_required()
@check_permission('manage_smart_therapy_recommendations')
@guard_payload_size()
@log_audit('IMPLEMENT_RECOMMENDATION')
def implement_recommendation(recommendation_id):
    """تنفيذ توصية"""
    try:
        data = request.get_json() or {}
        current_user_id = get_jwt_identity()
        
        recommendation = TherapyRecommendation.query.get_or_404(recommendation_id)
        
        recommendation.status = 'implemented'
        recommendation.implementation_date = datetime.utcnow()
        
        # إضافة سجل في التاريخ
        history = RecommendationHistory(
            recommendation_id=recommendation_id,
            action_type='implemented',
            action_description='تم بدء تنفيذ التوصية',
            performed_by=current_user_id,
            notes=data.get('notes')
        )
        db.session.add(history)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم بدء تنفيذ التوصية بنجاح',
            'recommendation': recommendation.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في تنفيذ التوصية: {str(e)}'
        }), 500

@smart_therapy_bp.route('/recommendations/<int:recommendation_id>/feedback', methods=['POST'])
@jwt_required()
@check_permission('manage_smart_therapy_recommendations')
@guard_payload_size()
@log_audit('ADD_RECOMMENDATION_FEEDBACK')
def add_recommendation_feedback(recommendation_id):
    """إضافة تقييم للتوصية"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        result = SmartTherapyRecommendationService.add_feedback(
            recommendation_id, current_user_id, data
        )
        
        return jsonify(result), 201 if result.get('success') else 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في إضافة التقييم: {str(e)}'
        }), 500

@smart_therapy_bp.route('/recommendations/<int:recommendation_id>/metrics', methods=['POST'])
@jwt_required()
@check_permission('manage_smart_therapy_recommendations')
@guard_payload_size()
@log_audit('ADD_RECOMMENDATION_METRICS')
def add_recommendation_metrics(recommendation_id):
    """إضافة مقاييس للتوصية"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        metric = RecommendationMetrics(
            recommendation_id=recommendation_id,
            metric_type=data.get('metric_type'),
            metric_name=data.get('metric_name'),
            baseline_value=data.get('baseline_value'),
            current_value=data.get('current_value'),
            target_value=data.get('target_value'),
            measurement_date=datetime.fromisoformat(data.get('measurement_date', datetime.utcnow().isoformat())),
            measurement_method=data.get('measurement_method'),
            measured_by=current_user_id,
            notes=data.get('notes')
        )
        
        # حساب نسبة التحسن
        if metric.baseline_value and metric.current_value:
            improvement = ((metric.current_value - metric.baseline_value) / metric.baseline_value) * 100
            metric.improvement_percentage = improvement
        
        db.session.add(metric)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة المقياس بنجاح',
            'metric': metric.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إضافة المقياس: {str(e)}'
        }), 500

@smart_therapy_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_RECOMMENDATIONS_DASHBOARD')
def get_recommendations_dashboard():
    """لوحة تحكم التوصيات"""
    try:
        student_id = request.args.get('student_id', type=int)
        status = request.args.get('status')
        
        result = SmartTherapyRecommendationService.get_recommendations_dashboard(
            student_id, status
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في لوحة التحكم: {str(e)}'
        }), 500

@smart_therapy_bp.route('/templates', methods=['GET'])
@jwt_required()
@check_permission('view_smart_therapy_recommendations')
@log_audit('GET_RECOMMENDATION_TEMPLATES')
def get_recommendation_templates():
    """الحصول على قوالب التوصيات"""
    try:
        category = request.args.get('category')
        
        query = RecommendationTemplate.query.filter_by(is_active=True)
        
        if category:
            query = query.filter_by(category=category)
        
        templates = query.all()
        
        return jsonify({
            'success': True,
            'templates': [template.to_dict() for template in templates]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب القوالب: {str(e)}'
        }), 500

@smart_therapy_bp.route('/templates', methods=['POST'])
@jwt_required()
@check_permission('manage_smart_therapy_recommendations')
@guard_payload_size()
@log_audit('CREATE_RECOMMENDATION_TEMPLATE')
def create_recommendation_template():
    """إنشاء قالب توصية جديد"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        template = RecommendationTemplate(
            name=data.get('name'),
            category=data.get('category'),
            subcategory=data.get('subcategory'),
            description=data.get('description'),
            target_conditions=json.dumps(data.get('target_conditions', [])),
            age_range_min=data.get('age_range_min'),
            age_range_max=data.get('age_range_max'),
            severity_levels=json.dumps(data.get('severity_levels', [])),
            template_content=json.dumps(data.get('template_content', {})),
            evidence_level=data.get('evidence_level', 'moderate'),
            created_by=current_user_id
        )
        
        db.session.add(template)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء القالب بنجاح',
            'template': template.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء القالب: {str(e)}'
        }), 500

@smart_therapy_bp.route('/rules', methods=['GET'])
@jwt_required()
@check_permission('view_smart_therapy_recommendations')
@log_audit('GET_RECOMMENDATION_RULES')
def get_recommendation_rules():
    """الحصول على قواعد التوصيات"""
    try:
        rule_type = request.args.get('type')
        
        query = RecommendationRule.query.filter_by(is_active=True)
        
        if rule_type:
            query = query.filter_by(rule_type=rule_type)
        
        rules = query.order_by(RecommendationRule.priority.desc()).all()
        
        return jsonify({
            'success': True,
            'rules': [rule.to_dict() for rule in rules]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب القواعد: {str(e)}'
        }), 500

@smart_therapy_bp.route('/rules', methods=['POST'])
@jwt_required()
@check_permission('manage_smart_therapy_recommendations')
@guard_payload_size()
@log_audit('CREATE_RECOMMENDATION_RULE')
def create_recommendation_rule():
    """إنشاء قاعدة توصية جديدة"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        rule = RecommendationRule(
            name=data.get('name'),
            description=data.get('description'),
            rule_type=data.get('rule_type'),
            conditions=json.dumps(data.get('conditions', {})),
            actions=json.dumps(data.get('actions', {})),
            priority=data.get('priority', 1),
            confidence_weight=data.get('confidence_weight', 1.0),
            is_mandatory=data.get('is_mandatory', False),
            exceptions=json.dumps(data.get('exceptions', [])),
            validation_criteria=json.dumps(data.get('validation_criteria', {})),
            created_by=current_user_id
        )
        
        db.session.add(rule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء القاعدة بنجاح',
            'rule': rule.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء القاعدة: {str(e)}'
        }), 500

@smart_therapy_bp.route('/alerts', methods=['GET'])
@jwt_required()
@check_permission('view_smart_therapy_recommendations')
@log_audit('GET_RECOMMENDATION_ALERTS')
def get_recommendation_alerts():
    """الحصول على تنبيهات التوصيات"""
    try:
        alert_type = request.args.get('type')
        severity = request.args.get('severity')
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        query = RecommendationAlert.query
        
        if alert_type:
            query = query.filter_by(alert_type=alert_type)
        
        if severity:
            query = query.filter_by(severity=severity)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        alerts = query.order_by(RecommendationAlert.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'alerts': [alert.to_dict() for alert in alerts]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب التنبيهات: {str(e)}'
        }), 500

@smart_therapy_bp.route('/alerts/<int:alert_id>/mark-read', methods=['POST'])
@jwt_required()
@check_permission('manage_smart_therapy_recommendations')
@guard_payload_size()
@log_audit('MARK_ALERT_AS_READ')
def mark_alert_as_read(alert_id):
    """تمييز التنبيه كمقروء"""
    try:
        alert = RecommendationAlert.query.get_or_404(alert_id)
        
        alert.is_read = True
        alert.read_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تمييز التنبيه كمقروء'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في تحديث التنبيه: {str(e)}'
        }), 500

@smart_therapy_bp.route('/reports/effectiveness', methods=['GET'])
@jwt_required()
@check_permission('view_reports')
@log_audit('GET_EFFECTIVENESS_REPORT')
def get_effectiveness_report():
    """تقرير فعالية التوصيات"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = TherapyRecommendation.query.filter(
            TherapyRecommendation.status == 'completed'
        )
        
        if start_date:
            start_date = datetime.fromisoformat(start_date)
            query = query.filter(TherapyRecommendation.completion_date >= start_date)
        
        if end_date:
            end_date = datetime.fromisoformat(end_date)
            query = query.filter(TherapyRecommendation.completion_date <= end_date)
        
        completed_recommendations = query.all()
        
        # حساب الإحصائيات
        total_completed = len(completed_recommendations)
        effectiveness_ratings = [rec.effectiveness_rating for rec in completed_recommendations if rec.effectiveness_rating]
        avg_effectiveness = sum(effectiveness_ratings) / len(effectiveness_ratings) if effectiveness_ratings else 0
        
        # تجميع حسب النوع
        by_type = {}
        for rec in completed_recommendations:
            rec_type = rec.recommendation_type
            if rec_type not in by_type:
                by_type[rec_type] = {'count': 0, 'total_effectiveness': 0, 'ratings': []}
            
            by_type[rec_type]['count'] += 1
            if rec.effectiveness_rating:
                by_type[rec_type]['total_effectiveness'] += rec.effectiveness_rating
                by_type[rec_type]['ratings'].append(rec.effectiveness_rating)
        
        # حساب متوسط الفعالية لكل نوع
        for rec_type in by_type:
            ratings = by_type[rec_type]['ratings']
            by_type[rec_type]['avg_effectiveness'] = sum(ratings) / len(ratings) if ratings else 0
        
        return jsonify({
            'success': True,
            'report': {
                'total_completed': total_completed,
                'avg_effectiveness': round(avg_effectiveness, 2),
                'by_type': by_type,
                'period': {
                    'start_date': start_date.isoformat() if start_date else None,
                    'end_date': end_date.isoformat() if end_date else None
                }
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء التقرير: {str(e)}'
        }), 500
