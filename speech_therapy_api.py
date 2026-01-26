from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit
)
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API endpoints لنظام برامج النطق والتخاطب
Speech Therapy Programs API
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from sqlalchemy import and_, or_, func, text
from sqlalchemy.exc import IntegrityError
from models import db, User
from speech_therapy_models import (
    SpeechClient, SpeechAssessment, TherapyPlan, TherapyGoal, 
    TherapySession, SpeechTherapist, TherapyMaterial, ProgressReport,
    SpeechDisorderType, SeverityLevel, TherapyType, SessionStatus,
    AssessmentType, GoalStatus
)
import uuid

# إنشاء Blueprint
speech_therapy_bp = Blueprint('speech_therapy', __name__, url_prefix='/api/speech-therapy')

# مساعد لتوليد أرقام فريدة
def generate_client_number():
    """توليد رقم مستفيد فريد"""
    return f"SC-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

def generate_assessment_number():
    """توليد رقم تقييم فريد"""
    return f"SA-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

def generate_plan_number():
    """توليد رقم خطة علاجية فريد"""
    return f"TP-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

def generate_session_number():
    """توليد رقم جلسة فريد"""
    return f"TS-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

# ================================
# إدارة المستفيدين
# ================================

@speech_therapy_bp.route('/clients', methods=['POST'])
@jwt_required()
@check_permission('manage_speech_therapy')
@guard_payload_size()
@log_audit('CREATE_CLIENT')
def create_client():
    """إنشاء مستفيد جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['first_name', 'last_name', 'date_of_birth', 'gender']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        # التحقق من عدم تكرار رقم الهوية
        if data.get('national_id'):
            existing_client = SpeechClient.query.filter_by(national_id=data['national_id']).first()
            if existing_client:
                return jsonify({'error': 'رقم الهوية مسجل مسبقاً'}), 400
        
        # إنشاء المستفيد
        client = SpeechClient(
            client_number=generate_client_number(),
            first_name=data['first_name'],
            last_name=data['last_name'],
            arabic_name=data.get('arabic_name'),
            date_of_birth=datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date(),
            gender=data['gender'],
            national_id=data.get('national_id'),
            phone=data.get('phone'),
            email=data.get('email'),
            address=data.get('address'),
            city=data.get('city'),
            medical_history=data.get('medical_history'),
            current_medications=data.get('current_medications', []),
            allergies=data.get('allergies', []),
            guardian_name=data.get('guardian_name'),
            guardian_relationship=data.get('guardian_relationship'),
            guardian_phone=data.get('guardian_phone'),
            guardian_email=data.get('guardian_email'),
            referral_source=data.get('referral_source'),
            insurance_info=data.get('insurance_info', {}),
            emergency_contact=data.get('emergency_contact', {}),
            created_by=current_user_id
        )
        
        db.session.add(client)
        db.session.commit()
        
        return jsonify({
            'message': 'تم إنشاء المستفيد بنجاح',
            'client': {
                'id': client.id,
                'client_number': client.client_number,
                'full_name': client.full_name,
                'age': client.age
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في إنشاء المستفيد: {str(e)}'}), 500

@speech_therapy_bp.route('/clients', methods=['GET'])
@jwt_required()
@check_permission('view_speech_therapy')
@log_audit('GET_CLIENTS')
def get_clients():
    """الحصول على قائمة المستفيدين"""
    try:
        # معاملات الاستعلام
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search', '')
        is_active = request.args.get('is_active', 'true').lower() == 'true'
        
        # بناء الاستعلام
        query = SpeechClient.query.filter_by(is_active=is_active)
        
        # البحث
        if search:
            search_filter = or_(
                SpeechClient.first_name.contains(search),
                SpeechClient.last_name.contains(search),
                SpeechClient.arabic_name.contains(search),
                SpeechClient.client_number.contains(search),
                SpeechClient.national_id.contains(search)
            )
            query = query.filter(search_filter)
        
        # ترتيب وتقسيم الصفحات
        clients = query.order_by(SpeechClient.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # تحضير البيانات
        clients_data = []
        for client in clients.items:
            clients_data.append({
                'id': client.id,
                'client_number': client.client_number,
                'full_name': client.full_name,
                'arabic_name': client.arabic_name,
                'age': client.age,
                'gender': client.gender,
                'phone': client.phone,
                'guardian_name': client.guardian_name,
                'enrollment_date': client.enrollment_date.isoformat() if client.enrollment_date else None,
                'is_active': client.is_active
            })
        
        return jsonify({
            'clients': clients_data,
            'pagination': {
                'page': clients.page,
                'pages': clients.pages,
                'per_page': clients.per_page,
                'total': clients.total
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب المستفيدين: {str(e)}'}), 500

@speech_therapy_bp.route('/clients/<int:client_id>', methods=['GET'])
@jwt_required()
@check_permission('view_speech_therapy')
@log_audit('GET_CLIENT')
def get_client(client_id):
    """الحصول على تفاصيل مستفيد محدد"""
    try:
        client = SpeechClient.query.get_or_404(client_id)
        
        # جلب التقييمات الأخيرة
        recent_assessments = SpeechAssessment.query.filter_by(
            client_id=client_id
        ).order_by(SpeechAssessment.assessment_date.desc()).limit(5).all()
        
        # جلب الخطط العلاجية النشطة
        active_plans = TherapyPlan.query.filter_by(
            client_id=client_id, is_active=True
        ).all()
        
        client_data = {
            'id': client.id,
            'client_number': client.client_number,
            'first_name': client.first_name,
            'last_name': client.last_name,
            'arabic_name': client.arabic_name,
            'full_name': client.full_name,
            'date_of_birth': client.date_of_birth.isoformat(),
            'age': client.age,
            'gender': client.gender,
            'national_id': client.national_id,
            'phone': client.phone,
            'email': client.email,
            'address': client.address,
            'city': client.city,
            'medical_history': client.medical_history,
            'current_medications': client.current_medications,
            'allergies': client.allergies,
            'guardian_name': client.guardian_name,
            'guardian_relationship': client.guardian_relationship,
            'guardian_phone': client.guardian_phone,
            'guardian_email': client.guardian_email,
            'referral_source': client.referral_source,
            'insurance_info': client.insurance_info,
            'emergency_contact': client.emergency_contact,
            'enrollment_date': client.enrollment_date.isoformat() if client.enrollment_date else None,
            'is_active': client.is_active,
            'recent_assessments': [{
                'id': assessment.id,
                'assessment_number': assessment.assessment_number,
                'assessment_type': assessment.assessment_type.value,
                'assessment_date': assessment.assessment_date.isoformat(),
                'primary_disorder': assessment.primary_disorder.value,
                'severity_level': assessment.severity_level.value
            } for assessment in recent_assessments],
            'active_plans': [{
                'id': plan.id,
                'plan_number': plan.plan_number,
                'plan_title': plan.plan_title,
                'therapy_type': plan.therapy_type.value,
                'start_date': plan.start_date.isoformat(),
                'completion_percentage': plan.completion_percentage
            } for plan in active_plans]
        }
        
        return jsonify({'client': client_data}), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب بيانات المستفيد: {str(e)}'}), 500

# ================================
# إدارة التقييمات
# ================================

@speech_therapy_bp.route('/assessments', methods=['POST'])
@jwt_required()
@check_permission('manage_speech_therapy')
@guard_payload_size()
@log_audit('CREATE_ASSESSMENT')
def create_assessment():
    """إنشاء تقييم جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['client_id', 'assessment_type', 'assessment_date', 'primary_disorder', 'severity_level']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        # التحقق من وجود المستفيد
        client = SpeechClient.query.get(data['client_id'])
        if not client:
            return jsonify({'error': 'المستفيد غير موجود'}), 404
        
        # إنشاء التقييم
        assessment = SpeechAssessment(
            assessment_number=generate_assessment_number(),
            client_id=data['client_id'],
            therapist_id=current_user_id,
            assessment_type=AssessmentType(data['assessment_type']),
            assessment_date=datetime.strptime(data['assessment_date'], '%Y-%m-%d').date(),
            primary_disorder=SpeechDisorderType(data['primary_disorder']),
            secondary_disorders=data.get('secondary_disorders', []),
            severity_level=SeverityLevel(data['severity_level']),
            assessment_tools=data.get('assessment_tools', []),
            test_results=data.get('test_results', {}),
            observations=data.get('observations'),
            articulation_score=data.get('articulation_score'),
            language_comprehension=data.get('language_comprehension'),
            language_expression=data.get('language_expression'),
            fluency_score=data.get('fluency_score'),
            voice_quality=data.get('voice_quality'),
            recommendations=data.get('recommendations'),
            therapy_frequency=data.get('therapy_frequency'),
            therapy_duration=data.get('therapy_duration'),
            audio_recordings=data.get('audio_recordings', []),
            video_recordings=data.get('video_recordings', []),
            documents=data.get('documents', []),
            created_by=current_user_id
        )
        
        db.session.add(assessment)
        db.session.commit()
        
        return jsonify({
            'message': 'تم إنشاء التقييم بنجاح',
            'assessment': {
                'id': assessment.id,
                'assessment_number': assessment.assessment_number,
                'client_name': client.full_name,
                'assessment_type': assessment.assessment_type.value,
                'primary_disorder': assessment.primary_disorder.value
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في إنشاء التقييم: {str(e)}'}), 500

@speech_therapy_bp.route('/assessments', methods=['GET'])
@jwt_required()
@check_permission('view_speech_therapy')
@log_audit('GET_ASSESSMENTS')
def get_assessments():
    """الحصول على قائمة التقييمات"""
    try:
        # معاملات الاستعلام
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        client_id = request.args.get('client_id')
        assessment_type = request.args.get('assessment_type')
        
        # بناء الاستعلام
        query = SpeechAssessment.query
        
        if client_id:
            query = query.filter_by(client_id=client_id)
        
        if assessment_type:
            query = query.filter_by(assessment_type=AssessmentType(assessment_type))
        
        # ترتيب وتقسيم الصفحات
        assessments = query.order_by(SpeechAssessment.assessment_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # تحضير البيانات
        assessments_data = []
        for assessment in assessments.items:
            therapist = User.query.get(assessment.therapist_id)
            assessments_data.append({
                'id': assessment.id,
                'assessment_number': assessment.assessment_number,
                'client_name': assessment.client.full_name,
                'therapist_name': therapist.name if therapist else 'غير محدد',
                'assessment_type': assessment.assessment_type.value,
                'assessment_date': assessment.assessment_date.isoformat(),
                'primary_disorder': assessment.primary_disorder.value,
                'severity_level': assessment.severity_level.value,
                'created_at': assessment.created_at.isoformat()
            })
        
        return jsonify({
            'assessments': assessments_data,
            'pagination': {
                'page': assessments.page,
                'pages': assessments.pages,
                'per_page': assessments.per_page,
                'total': assessments.total
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب التقييمات: {str(e)}'}), 500

# ================================
# إدارة الخطط العلاجية
# ================================

@speech_therapy_bp.route('/therapy-plans', methods=['POST'])
@jwt_required()
@check_permission('manage_speech_therapy')
@guard_payload_size()
@log_audit('CREATE_THERAPY_PLAN')
def create_therapy_plan():
    """إنشاء خطة علاجية جديدة"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['client_id', 'plan_title', 'therapy_type', 'start_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        # التحقق من وجود المستفيد
        client = SpeechClient.query.get(data['client_id'])
        if not client:
            return jsonify({'error': 'المستفيد غير موجود'}), 404
        
        # إنشاء الخطة العلاجية
        therapy_plan = TherapyPlan(
            plan_number=generate_plan_number(),
            client_id=data['client_id'],
            therapist_id=current_user_id,
            assessment_id=data.get('assessment_id'),
            plan_title=data['plan_title'],
            plan_description=data.get('plan_description'),
            therapy_type=TherapyType(data['therapy_type']),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            estimated_duration_weeks=data.get('estimated_duration_weeks'),
            sessions_per_week=data.get('sessions_per_week', 2),
            session_duration_minutes=data.get('session_duration_minutes', 45),
            long_term_goals=data.get('long_term_goals'),
            short_term_goals=data.get('short_term_goals'),
            therapy_methods=data.get('therapy_methods', []),
            materials_needed=data.get('materials_needed', []),
            home_exercises=data.get('home_exercises'),
            created_by=current_user_id
        )
        
        db.session.add(therapy_plan)
        db.session.flush()  # للحصول على ID
        
        # إنشاء الأهداف العلاجية
        if data.get('goals'):
            for goal_data in data['goals']:
                goal = TherapyGoal(
                    therapy_plan_id=therapy_plan.id,
                    goal_number=goal_data.get('goal_number'),
                    goal_title=goal_data['goal_title'],
                    goal_description=goal_data.get('goal_description'),
                    goal_category=goal_data.get('goal_category'),
                    target_skill=goal_data.get('target_skill'),
                    success_criteria=goal_data.get('success_criteria'),
                    target_accuracy=goal_data.get('target_accuracy'),
                    measurement_method=goal_data.get('measurement_method'),
                    target_date=datetime.strptime(goal_data['target_date'], '%Y-%m-%d').date() if goal_data.get('target_date') else None,
                    priority_level=goal_data.get('priority_level', 1),
                    created_by=current_user_id
                )
                db.session.add(goal)
        
        db.session.commit()
        
        return jsonify({
            'message': 'تم إنشاء الخطة العلاجية بنجاح',
            'therapy_plan': {
                'id': therapy_plan.id,
                'plan_number': therapy_plan.plan_number,
                'client_name': client.full_name,
                'plan_title': therapy_plan.plan_title,
                'therapy_type': therapy_plan.therapy_type.value
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في إنشاء الخطة العلاجية: {str(e)}'}), 500

# ================================
# إدارة الجلسات العلاجية
# ================================

@speech_therapy_bp.route('/sessions', methods=['POST'])
@jwt_required()
@check_permission('manage_speech_therapy')
@guard_payload_size()
@log_audit('CREATE_SESSION')
def create_session():
    """إنشاء جلسة علاجية جديدة"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['client_id', 'session_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        # إنشاء الجلسة
        session = TherapySession(
            session_number=generate_session_number(),
            client_id=data['client_id'],
            therapist_id=current_user_id,
            therapy_plan_id=data.get('therapy_plan_id'),
            session_date=datetime.strptime(data['session_date'], '%Y-%m-%d').date(),
            start_time=datetime.strptime(data['start_time'], '%H:%M').time() if data.get('start_time') else None,
            end_time=datetime.strptime(data['end_time'], '%H:%M').time() if data.get('end_time') else None,
            duration_minutes=data.get('duration_minutes'),
            session_objectives=data.get('session_objectives'),
            activities_performed=data.get('activities_performed', []),
            materials_used=data.get('materials_used', []),
            client_performance=data.get('client_performance'),
            accuracy_scores=data.get('accuracy_scores', {}),
            behavioral_observations=data.get('behavioral_observations'),
            progress_made=data.get('progress_made'),
            challenges_faced=data.get('challenges_faced'),
            next_session_plan=data.get('next_session_plan'),
            home_practice=data.get('home_practice'),
            status=SessionStatus(data.get('status', 'scheduled')),
            attendance_status=data.get('attendance_status'),
            session_recordings=data.get('session_recordings', []),
            worksheets=data.get('worksheets', []),
            photos=data.get('photos', []),
            created_by=current_user_id
        )
        
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            'message': 'تم إنشاء الجلسة بنجاح',
            'session': {
                'id': session.id,
                'session_number': session.session_number,
                'session_date': session.session_date.isoformat(),
                'status': session.status.value
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في إنشاء الجلسة: {str(e)}'}), 500

# ================================
# الإحصائيات والتقارير
# ================================

@speech_therapy_bp.route('/stats', methods=['GET'])
@jwt_required()
@check_permission('view_stats')
@log_audit('GET_STATS')
def get_stats():
    """إحصائيات نظام النطق والتخاطب"""
    try:
        # إحصائيات عامة
        total_clients = SpeechClient.query.filter_by(is_active=True).count()
        total_assessments = SpeechAssessment.query.count()
        active_therapy_plans = TherapyPlan.query.filter_by(is_active=True).count()
        
        # جلسات هذا الشهر
        start_of_month = date.today().replace(day=1)
        sessions_this_month = TherapySession.query.filter(
            TherapySession.session_date >= start_of_month
        ).count()
        
        # إحصائيات حسب نوع الاضطراب
        disorder_stats = db.session.query(
            SpeechAssessment.primary_disorder,
            func.count(SpeechAssessment.id).label('count')
        ).group_by(SpeechAssessment.primary_disorder).all()
        
        # إحصائيات حسب مستوى الشدة
        severity_stats = db.session.query(
            SpeechAssessment.severity_level,
            func.count(SpeechAssessment.id).label('count')
        ).group_by(SpeechAssessment.severity_level).all()
        
        return jsonify({
            'stats': {
                'total_clients': total_clients,
                'total_assessments': total_assessments,
                'active_therapy_plans': active_therapy_plans,
                'sessions_this_month': sessions_this_month,
                'disorder_distribution': [
                    {'disorder': stat[0].value, 'count': stat[1]} 
                    for stat in disorder_stats
                ],
                'severity_distribution': [
                    {'severity': stat[0].value, 'count': stat[1]} 
                    for stat in severity_stats
                ]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب الإحصائيات: {str(e)}'}), 500

# ================================
# البحث والفلترة
# ================================

@speech_therapy_bp.route('/search', methods=['GET'])
@jwt_required()
@check_permission('view_speech_therapy')
@log_audit('SEARCH')
def search():
    """البحث الشامل في النظام"""
    try:
        query = request.args.get('q', '')
        search_type = request.args.get('type', 'all')  # clients, assessments, plans, sessions
        
        results = {}
        
        if search_type in ['all', 'clients']:
            clients = SpeechClient.query.filter(
                or_(
                    SpeechClient.first_name.contains(query),
                    SpeechClient.last_name.contains(query),
                    SpeechClient.arabic_name.contains(query),
                    SpeechClient.client_number.contains(query)
                )
            ).limit(10).all()
            
            results['clients'] = [{
                'id': client.id,
                'client_number': client.client_number,
                'full_name': client.full_name,
                'age': client.age
            } for client in clients]
        
        if search_type in ['all', 'assessments']:
            assessments = SpeechAssessment.query.filter(
                SpeechAssessment.assessment_number.contains(query)
            ).limit(10).all()
            
            results['assessments'] = [{
                'id': assessment.id,
                'assessment_number': assessment.assessment_number,
                'client_name': assessment.client.full_name,
                'assessment_date': assessment.assessment_date.isoformat()
            } for assessment in assessments]
        
        return jsonify({'results': results}), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في البحث: {str(e)}'}), 500
