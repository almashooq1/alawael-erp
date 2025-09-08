# -*- coding: utf-8 -*-
"""
واجهة برمجة التطبيقات المحسنة لنظام الواقع المعزز والافتراضي
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ar_vr_services import ARVRService
from ar_vr_models import (
    ARVRContent, ARVRSession, ARVRInteraction, VirtualEnvironment,
    ARMarker, TherapyScenario, DeviceCalibration, ARVRAnalytics
)
from database import db
from datetime import datetime, date
import json

# إنشاء Blueprint
ar_vr_enhanced_bp = Blueprint('ar_vr_enhanced', __name__, url_prefix='/api/ar-vr')

# إنشاء خدمة AR/VR
ar_vr_service = ARVRService()

@ar_vr_enhanced_bp.route('/content', methods=['GET'])
@jwt_required()
def get_content_library():
    """الحصول على مكتبة المحتوى"""
    try:
        filters = {}
        if request.args.get('experience_type'):
            filters['experience_type'] = request.args.get('experience_type')
        if request.args.get('category'):
            filters['category'] = request.args.get('category')
        if request.args.get('age_min'):
            filters['age_min'] = int(request.args.get('age_min'))
        if request.args.get('age_max'):
            filters['age_max'] = int(request.args.get('age_max'))
        if request.args.get('difficulty_level'):
            filters['difficulty_level'] = request.args.get('difficulty_level')
        if request.args.get('target_disability'):
            filters['target_disability'] = request.args.get('target_disability')
        
        content_list = ar_vr_service.get_content_library(filters)
        return jsonify({'content': content_list}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/content', methods=['POST'])
@jwt_required()
def create_content():
    """إنشاء محتوى AR/VR جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['title_ar', 'experience_type', 'category', 'content_path']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        content = ar_vr_service.create_content(data, current_user_id)
        return jsonify(content), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/content/<content_id>', methods=['GET'])
@jwt_required()
def get_content_details():
    """الحصول على تفاصيل المحتوى"""
    try:
        content_id = request.view_args['content_id']
        content = ARVRContent.query.get(content_id)
        
        if not content:
            return jsonify({'error': 'المحتوى غير موجود'}), 404
        
        return jsonify(ar_vr_service._content_to_dict(content)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/sessions/start', methods=['POST'])
@jwt_required()
def start_session():
    """بدء جلسة AR/VR"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['content_id', 'student_id', 'supervisor_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        session = ar_vr_service.start_session(data, current_user_id)
        return jsonify(session), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/sessions/<session_id>/end', methods=['PUT'])
@jwt_required()
def end_session():
    """إنهاء جلسة AR/VR"""
    try:
        session_id = request.view_args['session_id']
        data = request.get_json()
        
        session = ar_vr_service.end_session(session_id, data)
        return jsonify(session), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/interactions', methods=['POST'])
@jwt_required()
def record_interaction():
    """تسجيل تفاعل في الجلسة"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['session_id', 'interaction_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        interaction = ar_vr_service.record_interaction(data)
        return jsonify(interaction), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/student/<int:student_id>/sessions', methods=['GET'])
@jwt_required()
def get_student_sessions():
    """الحصول على جلسات الطالب"""
    try:
        student_id = request.view_args['student_id']
        
        # فلاتر اختيارية
        filters = {}
        if request.args.get('content_id'):
            filters['content_id'] = request.args.get('content_id')
        if request.args.get('date_from'):
            filters['date_from'] = datetime.strptime(request.args.get('date_from'), '%Y-%m-%d')
        if request.args.get('date_to'):
            filters['date_to'] = datetime.strptime(request.args.get('date_to'), '%Y-%m-%d')
        if request.args.get('experience_type'):
            filters['experience_type'] = request.args.get('experience_type')
        
        sessions = ar_vr_service.get_student_sessions(student_id, filters)
        return jsonify({'sessions': sessions}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/sessions/<session_id>/analytics', methods=['GET'])
@jwt_required()
def get_session_analytics():
    """تحليل تفصيلي للجلسة"""
    try:
        session_id = request.view_args['session_id']
        analytics = ar_vr_service.get_session_analytics(session_id)
        return jsonify(analytics), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_analytics_dashboard():
    """الحصول على بيانات لوحة التحكم"""
    try:
        filters = {}
        if request.args.get('date_from'):
            filters['date_from'] = datetime.strptime(request.args.get('date_from'), '%Y-%m-%d').date()
        if request.args.get('date_to'):
            filters['date_to'] = datetime.strptime(request.args.get('date_to'), '%Y-%m-%d').date()
        
        dashboard_data = ar_vr_service.get_analytics_dashboard(filters)
        return jsonify(dashboard_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/therapy-scenarios', methods=['GET'])
@jwt_required()
def get_therapy_scenarios():
    """الحصول على السيناريوهات العلاجية"""
    try:
        therapy_type = request.args.get('therapy_type')
        target_condition = request.args.get('target_condition')
        
        query = TherapyScenario.query
        if therapy_type:
            query = query.filter_by(therapy_type=therapy_type)
        if target_condition:
            query = query.filter_by(target_condition=target_condition)
        
        scenarios = query.all()
        return jsonify([ar_vr_service._scenario_to_dict(s) for s in scenarios]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/therapy-scenarios', methods=['POST'])
@jwt_required()
def create_therapy_scenario():
    """إنشاء سيناريو علاجي جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name_ar', 'therapy_type', 'target_condition']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        scenario = ar_vr_service.create_therapy_scenario(data, current_user_id)
        return jsonify(scenario), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/devices/calibrate', methods=['POST'])
@jwt_required()
def calibrate_device():
    """معايرة الجهاز"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['device_id', 'device_type', 'calibration_data']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        calibration = ar_vr_service.calibrate_device(data, current_user_id)
        return jsonify(calibration), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/devices/<device_id>/calibrations', methods=['GET'])
@jwt_required()
def get_device_calibrations():
    """الحصول على معايرات الجهاز"""
    try:
        device_id = request.view_args['device_id']
        calibrations = DeviceCalibration.query.filter_by(device_id=device_id).order_by(
            DeviceCalibration.calibrated_at.desc()
        ).all()
        
        return jsonify([ar_vr_service._calibration_to_dict(c) for c in calibrations]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/environments', methods=['GET'])
@jwt_required()
def get_virtual_environments():
    """الحصول على البيئات الافتراضية"""
    try:
        environment_type = request.args.get('environment_type')
        realism_level = request.args.get('realism_level')
        
        query = VirtualEnvironment.query
        if environment_type:
            query = query.filter_by(environment_type=environment_type)
        if realism_level:
            query = query.filter_by(realism_level=realism_level)
        
        environments = query.all()
        
        result = []
        for env in environments:
            result.append({
                'id': env.id,
                'name_ar': env.name_ar,
                'name_en': env.name_en,
                'description_ar': env.description_ar,
                'description_en': env.description_en,
                'environment_type': env.environment_type,
                'realism_level': env.realism_level,
                'interactive_objects': env.interactive_objects,
                'navigation_type': env.navigation_type,
                'physics_enabled': env.physics_enabled,
                'audio_environment': env.audio_environment,
                'lighting_conditions': env.lighting_conditions,
                'weather_effects': env.weather_effects,
                'safety_boundaries': env.safety_boundaries,
                'customization_options': env.customization_options,
                'created_at': env.created_at.isoformat() if env.created_at else None
            })
        
        return jsonify({'environments': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/markers', methods=['GET'])
@jwt_required()
def get_ar_markers():
    """الحصول على علامات الواقع المعزز"""
    try:
        marker_type = request.args.get('marker_type')
        
        query = ARMarker.query
        if marker_type:
            query = query.filter_by(marker_type=marker_type)
        
        markers = query.all()
        
        result = []
        for marker in markers:
            result.append({
                'id': marker.id,
                'marker_name': marker.marker_name,
                'marker_type': marker.marker_type,
                'associated_content': marker.associated_content,
                'trigger_distance': marker.trigger_distance,
                'activation_angle': marker.activation_angle,
                'tracking_quality': marker.tracking_quality,
                'is_persistent': marker.is_persistent,
                'usage_count': marker.usage_count,
                'created_at': marker.created_at.isoformat() if marker.created_at else None
            })
        
        return jsonify({'markers': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/analytics/content/<content_id>', methods=['GET'])
@jwt_required()
def get_content_analytics():
    """تحليلات محتوى محدد"""
    try:
        content_id = request.view_args['content_id']
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        query = ARVRAnalytics.query.filter_by(content_id=content_id)
        
        if date_from:
            query = query.filter(ARVRAnalytics.date >= datetime.strptime(date_from, '%Y-%m-%d').date())
        if date_to:
            query = query.filter(ARVRAnalytics.date <= datetime.strptime(date_to, '%Y-%m-%d').date())
        
        analytics = query.order_by(ARVRAnalytics.date.desc()).all()
        
        result = []
        for analytic in analytics:
            result.append({
                'id': analytic.id,
                'content_id': analytic.content_id,
                'date': analytic.date.isoformat() if analytic.date else None,
                'total_sessions': analytic.total_sessions,
                'unique_users': analytic.unique_users,
                'avg_session_duration': analytic.avg_session_duration,
                'avg_completion_rate': analytic.avg_completion_rate,
                'avg_engagement_score': analytic.avg_engagement_score,
                'motion_sickness_incidents': analytic.motion_sickness_incidents,
                'technical_issues_count': analytic.technical_issues_count,
                'user_satisfaction': analytic.user_satisfaction,
                'learning_effectiveness': analytic.learning_effectiveness,
                'popular_interactions': analytic.popular_interactions,
                'improvement_areas': analytic.improvement_areas
            })
        
        return jsonify({'analytics': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/reports/usage', methods=['GET'])
@jwt_required()
def get_usage_report():
    """تقرير الاستخدام"""
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # إحصائيات الاستخدام
        query = ARVRSession.query
        
        if date_from:
            query = query.filter(ARVRSession.session_start >= datetime.strptime(date_from, '%Y-%m-%d'))
        if date_to:
            query = query.filter(ARVRSession.session_start <= datetime.strptime(date_to, '%Y-%m-%d'))
        
        sessions = query.all()
        
        # تحليل البيانات
        total_sessions = len(sessions)
        total_duration = sum(s.duration_seconds or 0 for s in sessions) / 3600  # بالساعات
        avg_completion = sum(s.completion_percentage or 0 for s in sessions) / max(total_sessions, 1)
        motion_sickness_count = sum(1 for s in sessions if s.motion_sickness)
        
        # توزيع الأجهزة
        device_usage = {}
        for session in sessions:
            device = session.device_used or 'غير محدد'
            device_usage[device] = device_usage.get(device, 0) + 1
        
        # أكثر المحتويات استخداماً
        content_usage = {}
        for session in sessions:
            content_id = session.content_id
            if content_id:
                content = ARVRContent.query.get(content_id)
                if content:
                    title = content.title_ar
                    content_usage[title] = content_usage.get(title, 0) + 1
        
        # ترتيب المحتوى حسب الاستخدام
        popular_content = sorted(content_usage.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return jsonify({
            'period': {
                'from': date_from,
                'to': date_to
            },
            'summary': {
                'total_sessions': total_sessions,
                'total_duration_hours': round(total_duration, 2),
                'avg_completion_rate': round(avg_completion, 1),
                'motion_sickness_rate': round((motion_sickness_count / max(total_sessions, 1)) * 100, 1)
            },
            'device_usage': device_usage,
            'popular_content': [{'title': title, 'sessions': count} for title, count in popular_content]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ar_vr_enhanced_bp.route('/safety/guidelines', methods=['GET'])
@jwt_required()
def get_safety_guidelines():
    """الحصول على إرشادات الأمان"""
    try:
        guidelines = {
            'general': [
                'التأكد من وجود مساحة كافية للحركة',
                'عدم استخدام النظارة لأكثر من 30 دقيقة متواصلة للأطفال',
                'وجود مشرف مدرب أثناء الجلسة',
                'التوقف فوراً عند الشعور بالدوار أو عدم الراحة'
            ],
            'age_specific': {
                '3-6': [
                    'جلسات قصيرة لا تتجاوز 15 دقيقة',
                    'محتوى بسيط وغير مخيف',
                    'مراقبة مستمرة للطفل'
                ],
                '7-12': [
                    'جلسات تصل إلى 25 دقيقة',
                    'فترات راحة كل 10 دقائق',
                    'تجنب المحتوى المثير للقلق'
                ],
                '13+': [
                    'جلسات تصل إلى 45 دقيقة',
                    'مراقبة علامات التعب',
                    'تدريب على الاستخدام الآمن'
                ]
            },
            'disability_specific': {
                'autism': [
                    'بدء تدريجي مع المحتوى',
                    'تجنب الأصوات العالية المفاجئة',
                    'إعداد الطفل مسبقاً لما سيحدث'
                ],
                'adhd': [
                    'جلسات قصيرة ومتنوعة',
                    'محتوى تفاعلي وجذاب',
                    'فترات راحة متكررة'
                ],
                'visual_impairment': [
                    'استخدام الإشارات الصوتية',
                    'تجنب الاعتماد على البصر فقط',
                    'توفير بدائل لمسية'
                ]
            },
            'technical': [
                'معايرة الجهاز قبل كل استخدام',
                'التأكد من نظافة العدسات',
                'فحص الكابلات والاتصالات',
                'تحديث البرامج بانتظام'
            ]
        }
        
        return jsonify({'guidelines': guidelines}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
