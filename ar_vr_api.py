#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
AR/VR API Endpoints
Comprehensive API for Augmented Reality and Virtual Reality features
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from sqlalchemy import func, and_, or_
import json
import uuid

# Import models
from ar_vr_models import (
    ARVRContent, ARVRSession, ARVRInteraction, VirtualEnvironment,
    ARMarker, TherapyScenario, DeviceCalibration, ARVRAnalytics,
    ExperienceType, ContentCategory, InteractionType
)
from models import Student, Teacher, User
from database import db

# Create blueprint
ar_vr_bp = Blueprint('ar_vr', __name__, url_prefix='/api/ar-vr')

@ar_vr_bp.route('/content', methods=['GET'])
@jwt_required()
def get_ar_vr_content():
    """الحصول على محتوى AR/VR"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        
        # Filters
        experience_type = request.args.get('experience_type')
        category = request.args.get('category')
        difficulty = request.args.get('difficulty')
        age_min = request.args.get('age_min', type=int)
        age_max = request.args.get('age_max', type=int)
        search = request.args.get('search', '').strip()
        
        query = ARVRContent.query.filter_by(is_active=True)
        
        # Apply filters
        if experience_type:
            query = query.filter(ARVRContent.experience_type == experience_type)
        if category:
            query = query.filter(ARVRContent.category == category)
        if difficulty:
            query = query.filter(ARVRContent.difficulty_level == difficulty)
        if age_min:
            query = query.filter(ARVRContent.target_age_min >= age_min)
        if age_max:
            query = query.filter(ARVRContent.target_age_max <= age_max)
        if search:
            query = query.filter(or_(
                ARVRContent.title_ar.contains(search),
                ARVRContent.title_en.contains(search),
                ARVRContent.description_ar.contains(search)
            ))
        
        # Pagination
        content_items = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'content': [{
                'id': item.id,
                'title_ar': item.title_ar,
                'title_en': item.title_en,
                'description_ar': item.description_ar,
                'experience_type': item.experience_type.value,
                'category': item.category.value,
                'target_age_min': item.target_age_min,
                'target_age_max': item.target_age_max,
                'duration_minutes': item.duration_minutes,
                'difficulty_level': item.difficulty_level,
                'thumbnail_url': item.thumbnail_url,
                'requires_supervision': item.requires_supervision,
                'created_at': item.created_at.isoformat()
            } for item in content_items.items],
            'pagination': {
                'page': page,
                'pages': content_items.pages,
                'per_page': per_page,
                'total': content_items.total
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting AR/VR content: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب المحتوى'}), 500

@ar_vr_bp.route('/content', methods=['POST'])
@jwt_required()
def create_ar_vr_content():
    """إنشاء محتوى AR/VR جديد"""
    try:
        data = request.get_json()
        current_user = get_jwt_identity()
        
        # Validate required fields
        required_fields = ['title_ar', 'experience_type', 'category', 'content_path']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'حقل {field} مطلوب'}), 400
        
        # Create new content
        content = ARVRContent(
            title_ar=data['title_ar'],
            title_en=data.get('title_en'),
            description_ar=data.get('description_ar'),
            description_en=data.get('description_en'),
            experience_type=ExperienceType(data['experience_type']),
            category=ContentCategory(data['category']),
            target_age_min=data.get('target_age_min'),
            target_age_max=data.get('target_age_max'),
            target_disabilities=data.get('target_disabilities', []),
            learning_objectives=data.get('learning_objectives', []),
            content_path=data['content_path'],
            thumbnail_url=data.get('thumbnail_url'),
            preview_video_url=data.get('preview_video_url'),
            duration_minutes=data.get('duration_minutes'),
            difficulty_level=data.get('difficulty_level', 'beginner'),
            supported_devices=data.get('supported_devices', []),
            interaction_types=data.get('interaction_types', []),
            accessibility_features=data.get('accessibility_features', []),
            safety_guidelines=data.get('safety_guidelines', []),
            file_size_mb=data.get('file_size_mb'),
            requires_supervision=data.get('requires_supervision', True),
            created_by=current_user
        )
        
        db.session.add(content)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء المحتوى بنجاح',
            'content_id': content.id
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating AR/VR content: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في إنشاء المحتوى'}), 500

@ar_vr_bp.route('/sessions', methods=['POST'])
@jwt_required()
def start_ar_vr_session():
    """بدء جلسة AR/VR"""
    try:
        data = request.get_json()
        current_user = get_jwt_identity()
        
        # Validate required fields
        required_fields = ['content_id', 'student_id', 'device_used']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'حقل {field} مطلوب'}), 400
        
        # Verify content exists
        content = ARVRContent.query.get(data['content_id'])
        if not content:
            return jsonify({'success': False, 'message': 'المحتوى غير موجود'}), 404
        
        # Verify student exists
        student = Student.query.get(data['student_id'])
        if not student:
            return jsonify({'success': False, 'message': 'الطالب غير موجود'}), 404
        
        # Get supervisor (teacher)
        supervisor = Teacher.query.filter_by(user_id=current_user).first()
        if not supervisor:
            return jsonify({'success': False, 'message': 'المشرف غير موجود'}), 404
        
        # Create new session
        session = ARVRSession(
            content_id=data['content_id'],
            student_id=data['student_id'],
            supervisor_id=supervisor.id,
            device_used=data['device_used']
        )
        
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم بدء الجلسة بنجاح',
            'session_id': session.id
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error starting AR/VR session: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في بدء الجلسة'}), 500

@ar_vr_bp.route('/sessions/<session_id>/end', methods=['PUT'])
@jwt_required()
def end_ar_vr_session(session_id):
    """إنهاء جلسة AR/VR"""
    try:
        data = request.get_json()
        
        session = ARVRSession.query.get(session_id)
        if not session:
            return jsonify({'success': False, 'message': 'الجلسة غير موجودة'}), 404
        
        # Update session data
        session.session_end = datetime.utcnow()
        if session.session_start:
            duration = session.session_end - session.session_start
            session.duration_seconds = int(duration.total_seconds())
        
        session.completion_percentage = data.get('completion_percentage', 0.0)
        session.objectives_achieved = data.get('objectives_achieved', [])
        session.performance_metrics = data.get('performance_metrics', {})
        session.comfort_level = data.get('comfort_level')
        session.motion_sickness = data.get('motion_sickness', False)
        session.engagement_score = data.get('engagement_score')
        session.learning_progress = data.get('learning_progress', {})
        session.behavioral_observations = data.get('behavioral_observations')
        session.technical_issues = data.get('technical_issues', [])
        session.session_notes = data.get('session_notes')
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنهاء الجلسة بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error ending AR/VR session: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في إنهاء الجلسة'}), 500

@ar_vr_bp.route('/interactions', methods=['POST'])
@jwt_required()
def record_interaction():
    """تسجيل تفاعل في جلسة AR/VR"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['session_id', 'interaction_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'حقل {field} مطلوب'}), 400
        
        # Verify session exists
        session = ARVRSession.query.get(data['session_id'])
        if not session:
            return jsonify({'success': False, 'message': 'الجلسة غير موجودة'}), 404
        
        # Create interaction record
        interaction = ARVRInteraction(
            session_id=data['session_id'],
            interaction_type=InteractionType(data['interaction_type']),
            object_interacted=data.get('object_interacted'),
            action_performed=data.get('action_performed'),
            position_x=data.get('position_x'),
            position_y=data.get('position_y'),
            position_z=data.get('position_z'),
            head_rotation=data.get('head_rotation'),
            hand_position=data.get('hand_position'),
            gaze_direction=data.get('gaze_direction'),
            interaction_duration=data.get('interaction_duration'),
            success=data.get('success'),
            accuracy=data.get('accuracy'),
            response_time=data.get('response_time'),
            metadata=data.get('metadata', {})
        )
        
        db.session.add(interaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تسجيل التفاعل بنجاح',
            'interaction_id': interaction.id
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error recording interaction: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في تسجيل التفاعل'}), 500

@ar_vr_bp.route('/environments', methods=['GET'])
@jwt_required()
def get_virtual_environments():
    """الحصول على البيئات الافتراضية"""
    try:
        environments = VirtualEnvironment.query.all()
        
        return jsonify({
            'success': True,
            'environments': [{
                'id': env.id,
                'name_ar': env.name_ar,
                'name_en': env.name_en,
                'description_ar': env.description_ar,
                'environment_type': env.environment_type,
                'realism_level': env.realism_level,
                'interactive_objects': env.interactive_objects,
                'navigation_type': env.navigation_type,
                'physics_enabled': env.physics_enabled,
                'created_at': env.created_at.isoformat()
            } for env in environments]
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting virtual environments: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب البيئات'}), 500

@ar_vr_bp.route('/therapy-scenarios', methods=['GET'])
@jwt_required()
def get_therapy_scenarios():
    """الحصول على سيناريوهات العلاج"""
    try:
        therapy_type = request.args.get('therapy_type')
        target_condition = request.args.get('target_condition')
        
        query = TherapyScenario.query
        
        if therapy_type:
            query = query.filter(TherapyScenario.therapy_type == therapy_type)
        if target_condition:
            query = query.filter(TherapyScenario.target_condition == target_condition)
        
        scenarios = query.all()
        
        return jsonify({
            'success': True,
            'scenarios': [{
                'id': scenario.id,
                'name_ar': scenario.name_ar,
                'name_en': scenario.name_en,
                'therapy_type': scenario.therapy_type,
                'target_condition': scenario.target_condition,
                'scenario_description': scenario.scenario_description,
                'difficulty_progression': scenario.difficulty_progression,
                'success_criteria': scenario.success_criteria,
                'created_at': scenario.created_at.isoformat()
            } for scenario in scenarios]
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting therapy scenarios: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب السيناريوهات'}), 500

@ar_vr_bp.route('/calibration', methods=['POST'])
@jwt_required()
def calibrate_device():
    """معايرة جهاز AR/VR"""
    try:
        data = request.get_json()
        current_user = get_jwt_identity()
        
        # Validate required fields
        required_fields = ['device_id', 'device_type', 'calibration_data']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'حقل {field} مطلوب'}), 400
        
        # Create or update calibration
        calibration = DeviceCalibration.query.filter_by(
            device_id=data['device_id'],
            user_id=current_user
        ).first()
        
        if calibration:
            # Update existing calibration
            calibration.calibration_data = data['calibration_data']
            calibration.ipd_measurement = data.get('ipd_measurement')
            calibration.height_adjustment = data.get('height_adjustment')
            calibration.tracking_area = data.get('tracking_area')
            calibration.comfort_settings = data.get('comfort_settings')
            calibration.calibration_quality = data.get('calibration_quality', 'good')
            calibration.calibrated_at = datetime.utcnow()
            calibration.calibrated_by = current_user
        else:
            # Create new calibration
            calibration = DeviceCalibration(
                device_id=data['device_id'],
                device_type=data['device_type'],
                user_id=current_user,
                calibration_data=data['calibration_data'],
                ipd_measurement=data.get('ipd_measurement'),
                height_adjustment=data.get('height_adjustment'),
                tracking_area=data.get('tracking_area'),
                comfort_settings=data.get('comfort_settings'),
                calibration_quality=data.get('calibration_quality', 'good'),
                calibrated_by=current_user
            )
            db.session.add(calibration)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم معايرة الجهاز بنجاح',
            'calibration_id': calibration.id
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error calibrating device: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في معايرة الجهاز'}), 500

@ar_vr_bp.route('/analytics/dashboard', methods=['GET'])
@jwt_required()
def get_ar_vr_dashboard():
    """لوحة تحكل تحليلات AR/VR"""
    try:
        # Date range
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        # Basic statistics
        total_content = ARVRContent.query.filter_by(is_active=True).count()
        total_sessions = ARVRSession.query.count()
        active_users = db.session.query(ARVRSession.student_id).distinct().count()
        
        # Recent sessions
        recent_sessions = ARVRSession.query.filter(
            ARVRSession.session_start >= start_date
        ).count()
        
        # Average session duration
        avg_duration = db.session.query(
            func.avg(ARVRSession.duration_seconds)
        ).scalar() or 0
        avg_duration_minutes = round(avg_duration / 60, 1) if avg_duration else 0
        
        # Completion rate
        completed_sessions = ARVRSession.query.filter(
            ARVRSession.completion_percentage >= 80
        ).count()
        completion_rate = round((completed_sessions / total_sessions * 100), 1) if total_sessions > 0 else 0
        
        # Content usage
        content_usage = db.session.query(
            ARVRContent.title_ar,
            func.count(ARVRSession.id).label('session_count')
        ).join(ARVRSession).group_by(ARVRContent.id).order_by(
            func.count(ARVRSession.id).desc()
        ).limit(5).all()
        
        # Experience type distribution
        experience_distribution = db.session.query(
            ARVRContent.experience_type,
            func.count(ARVRSession.id).label('session_count')
        ).join(ARVRSession).group_by(ARVRContent.experience_type).all()
        
        # Motion sickness incidents
        motion_sickness_count = ARVRSession.query.filter_by(motion_sickness=True).count()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'total_content': total_content,
                'total_sessions': total_sessions,
                'active_users': active_users,
                'recent_sessions': recent_sessions,
                'avg_session_duration': avg_duration_minutes,
                'completion_rate': completion_rate,
                'motion_sickness_incidents': motion_sickness_count,
                'content_usage': [
                    {'name': usage[0], 'sessions': usage[1]}
                    for usage in content_usage
                ],
                'experience_distribution': [
                    {'type': dist[0].value, 'sessions': dist[1]}
                    for dist in experience_distribution
                ]
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting AR/VR dashboard: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب لوحة التحكم'}), 500

@ar_vr_bp.route('/sessions/<student_id>/history', methods=['GET'])
@jwt_required()
def get_student_ar_vr_history(student_id):
    """تاريخ جلسات AR/VR للطالب"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        
        sessions = ARVRSession.query.filter_by(student_id=student_id).order_by(
            ARVRSession.session_start.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'sessions': [{
                'id': session.id,
                'content_title': session.content.title_ar,
                'experience_type': session.content.experience_type.value,
                'session_start': session.session_start.isoformat(),
                'session_end': session.session_end.isoformat() if session.session_end else None,
                'duration_minutes': round(session.duration_seconds / 60, 1) if session.duration_seconds else None,
                'completion_percentage': session.completion_percentage,
                'engagement_score': session.engagement_score,
                'comfort_level': session.comfort_level,
                'motion_sickness': session.motion_sickness
            } for session in sessions.items],
            'pagination': {
                'page': page,
                'pages': sessions.pages,
                'per_page': per_page,
                'total': sessions.total
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting student AR/VR history: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب تاريخ الجلسات'}), 500
