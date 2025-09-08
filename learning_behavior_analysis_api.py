# -*- coding: utf-8 -*-
"""
واجهة برمجة التطبيقات لتحليل أنماط التعلم والسلوك
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from learning_behavior_analysis_services import LearningBehaviorAnalysisService
from learning_behavior_analysis_models import (
    LearningStyle, BehaviorPattern, StudentLearningProfile, BehaviorObservation,
    LearningAnalytics, BehaviorIntervention, LearningEnvironmentFactor, EnvironmentAssessment
)
from database import db
import json

# إنشاء Blueprint
learning_behavior_bp = Blueprint('learning_behavior', __name__, url_prefix='/api/learning-behavior')

@learning_behavior_bp.route('/analyze-student/<int:student_id>', methods=['GET'])
@jwt_required()
def analyze_student_learning_pattern(student_id):
    """تحليل نمط تعلم الطالب"""
    try:
        period_days = request.args.get('period_days', 30, type=int)
        
        result = LearningBehaviorAnalysisService.analyze_student_learning_pattern(
            student_id, period_days
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في تحليل نمط التعلم: {str(e)}'
        }), 500

@learning_behavior_bp.route('/learning-styles', methods=['GET'])
@jwt_required()
def get_learning_styles():
    """الحصول على أنماط التعلم"""
    try:
        styles = LearningStyle.query.filter_by(is_active=True).all()
        
        return jsonify({
            'success': True,
            'learning_styles': [style.to_dict() for style in styles]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب أنماط التعلم: {str(e)}'
        }), 500

@learning_behavior_bp.route('/learning-styles', methods=['POST'])
@jwt_required()
def create_learning_style():
    """إنشاء نمط تعلم جديد"""
    try:
        data = request.get_json()
        
        style = LearningStyle(
            name=data.get('name'),
            name_en=data.get('name_en'),
            description=data.get('description'),
            characteristics=json.dumps(data.get('characteristics', [])),
            teaching_strategies=json.dumps(data.get('teaching_strategies', [])),
            assessment_methods=json.dumps(data.get('assessment_methods', [])),
            color_code=data.get('color_code', '#007bff'),
            icon=data.get('icon')
        )
        
        db.session.add(style)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء نمط التعلم بنجاح',
            'learning_style': style.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء نمط التعلم: {str(e)}'
        }), 500

@learning_behavior_bp.route('/behavior-patterns', methods=['GET'])
@jwt_required()
def get_behavior_patterns():
    """الحصول على أنماط السلوك"""
    try:
        category = request.args.get('category')
        
        query = BehaviorPattern.query.filter_by(is_active=True)
        
        if category:
            query = query.filter_by(category=category)
        
        patterns = query.all()
        
        return jsonify({
            'success': True,
            'behavior_patterns': [pattern.to_dict() for pattern in patterns]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب أنماط السلوك: {str(e)}'
        }), 500

@learning_behavior_bp.route('/behavior-patterns', methods=['POST'])
@jwt_required()
def create_behavior_pattern():
    """إنشاء نمط سلوك جديد"""
    try:
        data = request.get_json()
        
        pattern = BehaviorPattern(
            name=data.get('name'),
            category=data.get('category'),
            description=data.get('description'),
            indicators=json.dumps(data.get('indicators', [])),
            triggers=json.dumps(data.get('triggers', [])),
            interventions=json.dumps(data.get('interventions', [])),
            severity_level=data.get('severity_level', 'low'),
            frequency_threshold=data.get('frequency_threshold', 3),
            color_code=data.get('color_code'),
            icon=data.get('icon')
        )
        
        db.session.add(pattern)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء نمط السلوك بنجاح',
            'behavior_pattern': pattern.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء نمط السلوك: {str(e)}'
        }), 500

@learning_behavior_bp.route('/student-profile/<int:student_id>', methods=['GET'])
@jwt_required()
def get_student_learning_profile(student_id):
    """الحصول على ملف تعريف التعلم للطالب"""
    try:
        profile = StudentLearningProfile.query.filter_by(student_id=student_id).first()
        
        if not profile:
            return jsonify({
                'success': False,
                'message': 'ملف تعريف التعلم غير موجود'
            }), 404
        
        return jsonify({
            'success': True,
            'profile': profile.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب ملف التعريف: {str(e)}'
        }), 500

@learning_behavior_bp.route('/student-profile/<int:student_id>', methods=['POST', 'PUT'])
@jwt_required()
def update_student_learning_profile(student_id):
    """تحديث ملف تعريف التعلم للطالب"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        data['assessed_by'] = current_user_id
        
        result = LearningBehaviorAnalysisService.update_learning_profile(student_id, data)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في تحديث ملف التعريف: {str(e)}'
        }), 500

@learning_behavior_bp.route('/behavior-observations', methods=['GET'])
@jwt_required()
def get_behavior_observations():
    """الحصول على ملاحظات السلوك"""
    try:
        student_id = request.args.get('student_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = BehaviorObservation.query
        
        if student_id:
            query = query.filter_by(student_id=student_id)
        
        if start_date:
            start_date = datetime.fromisoformat(start_date)
            query = query.filter(BehaviorObservation.observation_date >= start_date)
        
        if end_date:
            end_date = datetime.fromisoformat(end_date)
            query = query.filter(BehaviorObservation.observation_date <= end_date)
        
        observations = query.order_by(BehaviorObservation.observation_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'observations': [obs.to_dict() for obs in observations.items],
            'pagination': {
                'page': page,
                'pages': observations.pages,
                'per_page': per_page,
                'total': observations.total
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب ملاحظات السلوك: {str(e)}'
        }), 500

@learning_behavior_bp.route('/behavior-observations', methods=['POST'])
@jwt_required()
def create_behavior_observation():
    """إنشاء ملاحظة سلوك جديدة"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        observation = BehaviorObservation(
            student_id=data.get('student_id'),
            behavior_pattern_id=data.get('behavior_pattern_id'),
            observer_id=current_user_id,
            observation_date=datetime.fromisoformat(data.get('observation_date', datetime.utcnow().isoformat())),
            duration=data.get('duration'),
            context=data.get('context'),
            antecedent=data.get('antecedent'),
            behavior_description=data.get('behavior_description'),
            consequence=data.get('consequence'),
            intensity=data.get('intensity', 'medium'),
            frequency=data.get('frequency', 1),
            intervention_used=data.get('intervention_used'),
            effectiveness=data.get('effectiveness'),
            environmental_factors=json.dumps(data.get('environmental_factors', [])),
            emotional_state=data.get('emotional_state'),
            social_context=data.get('social_context'),
            follow_up_required=data.get('follow_up_required', False),
            follow_up_notes=data.get('follow_up_notes'),
            attachments=json.dumps(data.get('attachments', []))
        )
        
        db.session.add(observation)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء ملاحظة السلوك بنجاح',
            'observation': observation.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء ملاحظة السلوك: {str(e)}'
        }), 500

@learning_behavior_bp.route('/behavior-interventions', methods=['GET'])
@jwt_required()
def get_behavior_interventions():
    """الحصول على التدخلات السلوكية"""
    try:
        student_id = request.args.get('student_id', type=int)
        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = BehaviorIntervention.query
        
        if student_id:
            query = query.filter_by(student_id=student_id)
        
        if status:
            query = query.filter_by(status=status)
        
        interventions = query.order_by(BehaviorIntervention.start_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'interventions': [intervention.to_dict() for intervention in interventions.items],
            'pagination': {
                'page': page,
                'pages': interventions.pages,
                'per_page': per_page,
                'total': interventions.total
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب التدخلات السلوكية: {str(e)}'
        }), 500

@learning_behavior_bp.route('/behavior-interventions', methods=['POST'])
@jwt_required()
def create_behavior_intervention():
    """إنشاء تدخل سلوكي جديد"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        data['created_by'] = current_user_id
        
        result = LearningBehaviorAnalysisService.create_behavior_intervention(
            data.get('student_id'), data
        )
        
        return jsonify(result), 201 if result.get('success') else 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء التدخل السلوكي: {str(e)}'
        }), 500

@learning_behavior_bp.route('/behavior-interventions/<int:intervention_id>', methods=['PUT'])
@jwt_required()
def update_behavior_intervention(intervention_id):
    """تحديث التدخل السلوكي"""
    try:
        data = request.get_json()
        
        intervention = BehaviorIntervention.query.get_or_404(intervention_id)
        
        # تحديث البيانات
        if 'current_progress' in data:
            intervention.current_progress = json.dumps(data['current_progress'])
        
        if 'effectiveness_rating' in data:
            intervention.effectiveness_rating = data['effectiveness_rating']
        
        if 'side_effects' in data:
            intervention.side_effects = data['side_effects']
        
        if 'modifications_made' in data:
            intervention.modifications_made = json.dumps(data['modifications_made'])
        
        if 'status' in data:
            intervention.status = data['status']
        
        if 'notes' in data:
            intervention.notes = data['notes']
        
        intervention.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث التدخل السلوكي بنجاح',
            'intervention': intervention.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في تحديث التدخل السلوكي: {str(e)}'
        }), 500

@learning_behavior_bp.route('/analytics/dashboard', methods=['GET'])
@jwt_required()
def get_analytics_dashboard():
    """لوحة تحكم تحليلات التعلم"""
    try:
        student_id = request.args.get('student_id', type=int)
        period_days = request.args.get('period_days', 30, type=int)
        
        result = LearningBehaviorAnalysisService.get_learning_analytics_dashboard(
            student_id, period_days
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في لوحة التحكم: {str(e)}'
        }), 500

@learning_behavior_bp.route('/analytics/<int:student_id>/history', methods=['GET'])
@jwt_required()
def get_student_analytics_history(student_id):
    """تاريخ تحليلات الطالب"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        analytics = LearningAnalytics.query.filter_by(student_id=student_id).order_by(
            LearningAnalytics.analysis_date.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'analytics': [analysis.to_dict() for analysis in analytics.items],
            'pagination': {
                'page': page,
                'pages': analytics.pages,
                'per_page': per_page,
                'total': analytics.total
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب تاريخ التحليلات: {str(e)}'
        }), 500

@learning_behavior_bp.route('/environment-factors', methods=['GET'])
@jwt_required()
def get_environment_factors():
    """الحصول على عوامل البيئة التعليمية"""
    try:
        category = request.args.get('category')
        
        query = LearningEnvironmentFactor.query.filter_by(is_active=True)
        
        if category:
            query = query.filter_by(category=category)
        
        factors = query.all()
        
        return jsonify({
            'success': True,
            'environment_factors': [factor.to_dict() for factor in factors]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب عوامل البيئة: {str(e)}'
        }), 500

@learning_behavior_bp.route('/environment-assessments', methods=['GET'])
@jwt_required()
def get_environment_assessments():
    """الحصول على تقييمات البيئة"""
    try:
        classroom_id = request.args.get('classroom_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = EnvironmentAssessment.query
        
        if classroom_id:
            query = query.filter_by(classroom_id=classroom_id)
        
        assessments = query.order_by(EnvironmentAssessment.assessment_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'assessments': [assessment.to_dict() for assessment in assessments.items],
            'pagination': {
                'page': page,
                'pages': assessments.pages,
                'per_page': per_page,
                'total': assessments.total
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب تقييمات البيئة: {str(e)}'
        }), 500

@learning_behavior_bp.route('/environment-assessments', methods=['POST'])
@jwt_required()
def create_environment_assessment():
    """إنشاء تقييم بيئة جديد"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        assessment = EnvironmentAssessment(
            classroom_id=data.get('classroom_id'),
            assessor_id=current_user_id,
            assessment_date=datetime.fromisoformat(data.get('assessment_date', datetime.utcnow().isoformat())),
            environmental_data=json.dumps(data.get('environmental_data', {})),
            overall_score=data.get('overall_score', 0.0),
            strengths=json.dumps(data.get('strengths', [])),
            areas_for_improvement=json.dumps(data.get('areas_for_improvement', [])),
            recommendations=json.dumps(data.get('recommendations', [])),
            follow_up_required=data.get('follow_up_required', False),
            follow_up_date=datetime.fromisoformat(data.get('follow_up_date')) if data.get('follow_up_date') else None,
            notes=data.get('notes')
        )
        
        db.session.add(assessment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء تقييم البيئة بنجاح',
            'assessment': assessment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء تقييم البيئة: {str(e)}'
        }), 500

@learning_behavior_bp.route('/reports/student-summary/<int:student_id>', methods=['GET'])
@jwt_required()
def get_student_learning_behavior_summary(student_id):
    """تقرير ملخص التعلم والسلوك للطالب"""
    try:
        period_days = request.args.get('period_days', 90, type=int)
        
        # تحليل نمط التعلم
        learning_analysis = LearningBehaviorAnalysisService.analyze_student_learning_pattern(
            student_id, period_days
        )
        
        # الحصول على ملف التعريف
        profile = StudentLearningProfile.query.filter_by(student_id=student_id).first()
        
        # الحصول على التدخلات النشطة
        active_interventions = BehaviorIntervention.query.filter_by(
            student_id=student_id, status='active'
        ).all()
        
        # الحصول على آخر التحليلات
        recent_analytics = LearningAnalytics.query.filter_by(
            student_id=student_id
        ).order_by(LearningAnalytics.analysis_date.desc()).limit(5).all()
        
        return jsonify({
            'success': True,
            'student_id': student_id,
            'learning_analysis': learning_analysis,
            'learning_profile': profile.to_dict() if profile else None,
            'active_interventions': [intervention.to_dict() for intervention in active_interventions],
            'recent_analytics': [analysis.to_dict() for analysis in recent_analytics],
            'report_date': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء التقرير: {str(e)}'
        }), 500
