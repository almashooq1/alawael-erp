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
API endpoints لنظام التأهيل الشامل لذوي الإعاقة
Comprehensive Disability Rehabilitation System API
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from sqlalchemy import and_, or_, func
from database import db
from comprehensive_rehabilitation_models import *
import json

# إنشاء Blueprint
comprehensive_rehab_bp = Blueprint('comprehensive_rehab', __name__, url_prefix='/api/comprehensive-rehab')

# ===== إدارة المستفيدين =====

@comprehensive_rehab_bp.route('/beneficiaries', methods=['GET'])
@jwt_required()
@check_permission('view_comprehensive_rehabilitation')
@log_audit('GET_BENEFICIARIES')
def get_beneficiaries():
    """الحصول على قائمة المستفيدين مع الفلترة والبحث"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        disability_type = request.args.get('disability_type', '')
        severity = request.args.get('severity', '')
        status = request.args.get('status', 'active')
        
        query = RehabilitationBeneficiary.query
        
        if search:
            query = query.filter(or_(
                RehabilitationBeneficiary.first_name.contains(search),
                RehabilitationBeneficiary.last_name.contains(search),
                RehabilitationBeneficiary.beneficiary_code.contains(search)
            ))
        
        if disability_type:
            query = query.filter(RehabilitationBeneficiary.primary_disability == disability_type)
        
        if severity:
            query = query.filter(RehabilitationBeneficiary.severity_level == severity)
        
        if status:
            query = query.filter(RehabilitationBeneficiary.status == status)
        
        beneficiaries = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'data': {
                'beneficiaries': [{
                    'id': b.id,
                    'beneficiary_code': b.beneficiary_code,
                    'full_name': b.full_name,
                    'age': b.age,
                    'primary_disability': b.primary_disability.value if b.primary_disability else None,
                    'severity_level': b.severity_level.value if b.severity_level else None,
                    'status': b.status,
                    'registration_date': b.registration_date.isoformat() if b.registration_date else None
                } for b in beneficiaries.items],
                'pagination': {
                    'page': beneficiaries.page,
                    'pages': beneficiaries.pages,
                    'per_page': beneficiaries.per_page,
                    'total': beneficiaries.total,
                    'has_next': beneficiaries.has_next,
                    'has_prev': beneficiaries.has_prev
                }
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@comprehensive_rehab_bp.route('/beneficiaries', methods=['POST'])
@jwt_required()
@check_permission('manage_comprehensive_rehabilitation')
@guard_payload_size()
@log_audit('CREATE_BENEFICIARY')
def create_beneficiary():
    """إضافة مستفيد جديد"""
    try:
        data = request.get_json()
        
        beneficiary = RehabilitationBeneficiary(
            first_name=data['first_name'],
            last_name=data['last_name'],
            arabic_name=data.get('arabic_name'),
            national_id=data.get('national_id'),
            date_of_birth=datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date(),
            gender=data['gender'],
            nationality=data.get('nationality'),
            phone=data.get('phone'),
            email=data.get('email'),
            address=data.get('address'),
            city=data.get('city'),
            primary_disability=DisabilityCategory(data['primary_disability']),
            secondary_disabilities=data.get('secondary_disabilities', []),
            severity_level=SeverityLevel(data['severity_level']),
            diagnosis_date=datetime.strptime(data['diagnosis_date'], '%Y-%m-%d').date() if data.get('diagnosis_date') else None,
            medical_diagnosis=data.get('medical_diagnosis'),
            medical_history=data.get('medical_history'),
            current_medications=data.get('current_medications', []),
            allergies=data.get('allergies'),
            emergency_contact_name=data.get('emergency_contact_name'),
            emergency_contact_phone=data.get('emergency_contact_phone'),
            emergency_contact_relation=data.get('emergency_contact_relation'),
            notes=data.get('notes'),
            created_by=get_jwt_identity()
        )
        
        db.session.add(beneficiary)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة المستفيد بنجاح',
            'data': {
                'id': beneficiary.id,
                'beneficiary_code': beneficiary.beneficiary_code
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@comprehensive_rehab_bp.route('/beneficiaries/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
@check_permission('view_comprehensive_rehabilitation')
@log_audit('GET_BENEFICIARY_DETAILS')
def get_beneficiary_details(beneficiary_id):
    """الحصول على تفاصيل مستفيد محدد"""
    try:
        beneficiary = RehabilitationBeneficiary.query.get_or_404(beneficiary_id)
        
        return jsonify({
            'success': True,
            'data': {
                'id': beneficiary.id,
                'beneficiary_code': beneficiary.beneficiary_code,
                'first_name': beneficiary.first_name,
                'last_name': beneficiary.last_name,
                'arabic_name': beneficiary.arabic_name,
                'national_id': beneficiary.national_id,
                'date_of_birth': beneficiary.date_of_birth.isoformat() if beneficiary.date_of_birth else None,
                'age': beneficiary.age,
                'gender': beneficiary.gender,
                'nationality': beneficiary.nationality,
                'phone': beneficiary.phone,
                'email': beneficiary.email,
                'address': beneficiary.address,
                'city': beneficiary.city,
                'primary_disability': beneficiary.primary_disability.value if beneficiary.primary_disability else None,
                'secondary_disabilities': beneficiary.secondary_disabilities,
                'severity_level': beneficiary.severity_level.value if beneficiary.severity_level else None,
                'diagnosis_date': beneficiary.diagnosis_date.isoformat() if beneficiary.diagnosis_date else None,
                'medical_diagnosis': beneficiary.medical_diagnosis,
                'medical_history': beneficiary.medical_history,
                'current_medications': beneficiary.current_medications,
                'allergies': beneficiary.allergies,
                'emergency_contact_name': beneficiary.emergency_contact_name,
                'emergency_contact_phone': beneficiary.emergency_contact_phone,
                'emergency_contact_relation': beneficiary.emergency_contact_relation,
                'registration_date': beneficiary.registration_date.isoformat() if beneficiary.registration_date else None,
                'status': beneficiary.status,
                'notes': beneficiary.notes,
                'assessments_count': len(beneficiary.assessments),
                'active_plans_count': len([p for p in beneficiary.rehabilitation_plans if p.status == 'active']),
                'total_sessions': len(beneficiary.therapy_sessions)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== إدارة التقييمات =====

@comprehensive_rehab_bp.route('/assessments', methods=['POST'])
@jwt_required()
@check_permission('manage_comprehensive_rehabilitation')
@guard_payload_size()
@log_audit('CREATE_ASSESSMENT')
def create_assessment():
    """إنشاء تقييم شامل جديد"""
    try:
        data = request.get_json()
        
        assessment = ComprehensiveAssessment(
            beneficiary_id=data['beneficiary_id'],
            assessment_type=AssessmentType(data['assessment_type']),
            assessor_name=data['assessor_name'],
            assessor_title=data.get('assessor_title'),
            motor_skills_score=data.get('motor_skills_score'),
            gross_motor_skills=data.get('gross_motor_skills', {}),
            fine_motor_skills=data.get('fine_motor_skills', {}),
            mobility_assessment=data.get('mobility_assessment'),
            cognitive_score=data.get('cognitive_score'),
            attention_span=data.get('attention_span'),
            memory_skills=data.get('memory_skills'),
            problem_solving=data.get('problem_solving'),
            academic_skills=data.get('academic_skills', {}),
            communication_score=data.get('communication_score'),
            receptive_language=data.get('receptive_language'),
            expressive_language=data.get('expressive_language'),
            speech_clarity=data.get('speech_clarity'),
            social_communication=data.get('social_communication'),
            social_skills_score=data.get('social_skills_score'),
            behavioral_assessment=data.get('behavioral_assessment'),
            adaptive_behavior=data.get('adaptive_behavior', {}),
            challenging_behaviors=data.get('challenging_behaviors'),
            sensory_score=data.get('sensory_score'),
            visual_assessment=data.get('visual_assessment'),
            auditory_assessment=data.get('auditory_assessment'),
            tactile_sensitivity=data.get('tactile_sensitivity'),
            daily_living_score=data.get('daily_living_score'),
            self_care_skills=data.get('self_care_skills', {}),
            domestic_skills=data.get('domestic_skills', {}),
            community_skills=data.get('community_skills', {}),
            recommendations=data.get('recommendations'),
            priority_areas=data.get('priority_areas', []),
            suggested_therapies=data.get('suggested_therapies', []),
            assessment_duration=data.get('assessment_duration'),
            next_assessment_date=datetime.strptime(data['next_assessment_date'], '%Y-%m-%d').date() if data.get('next_assessment_date') else None,
            notes=data.get('notes')
        )
        
        db.session.add(assessment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء التقييم بنجاح',
            'data': {
                'id': assessment.id,
                'assessment_code': assessment.assessment_code
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== إدارة الخطط الفردية =====

@comprehensive_rehab_bp.route('/rehabilitation-plans', methods=['POST'])
@jwt_required()
@check_permission('manage_comprehensive_rehabilitation')
@guard_payload_size()
@log_audit('CREATE_REHABILITATION_PLAN')
def create_rehabilitation_plan():
    """إنشاء خطة تأهيل فردية"""
    try:
        data = request.get_json()
        
        plan = IndividualRehabilitationPlan(
            beneficiary_id=data['beneficiary_id'],
            assessment_id=data.get('assessment_id'),
            plan_name=data['plan_name'],
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date(),
            duration_weeks=data.get('duration_weeks'),
            long_term_goals=data.get('long_term_goals', []),
            short_term_goals=data.get('short_term_goals', []),
            required_therapies=data.get('required_therapies', []),
            therapy_frequency=data.get('therapy_frequency', {}),
            primary_therapist_id=data.get('primary_therapist_id'),
            team_members=data.get('team_members', []),
            success_criteria=data.get('success_criteria', []),
            measurement_methods=data.get('measurement_methods', []),
            required_equipment=data.get('required_equipment', []),
            environmental_modifications=data.get('environmental_modifications'),
            family_involvement=data.get('family_involvement'),
            home_program=data.get('home_program'),
            created_by=get_jwt_identity()
        )
        
        db.session.add(plan)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الخطة بنجاح',
            'data': {
                'id': plan.id,
                'plan_code': plan.plan_code
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== إدارة الجلسات العلاجية =====

@comprehensive_rehab_bp.route('/therapy-sessions', methods=['POST'])
@jwt_required()
@check_permission('manage_comprehensive_rehabilitation')
@guard_payload_size()
@log_audit('CREATE_THERAPY_SESSION')
def create_therapy_session():
    """إنشاء جلسة علاجية جديدة"""
    try:
        data = request.get_json()
        
        session = TherapySession(
            beneficiary_id=data['beneficiary_id'],
            therapist_id=data['therapist_id'],
            plan_id=data.get('plan_id'),
            therapy_type=TherapyType(data['therapy_type']),
            session_date=datetime.strptime(data['session_date'], '%Y-%m-%d').date(),
            start_time=datetime.strptime(data['start_time'], '%H:%M').time(),
            end_time=datetime.strptime(data['end_time'], '%H:%M').time(),
            session_objectives=data.get('session_objectives', []),
            activities_performed=data.get('activities_performed', []),
            materials_used=data.get('materials_used', []),
            performance_rating=ProgressStatus(data['performance_rating']) if data.get('performance_rating') else None,
            goals_addressed=data.get('goals_addressed', []),
            progress_notes=data.get('progress_notes'),
            homework_assigned=data.get('homework_assigned'),
            next_session_focus=data.get('next_session_focus'),
            recommendations=data.get('recommendations'),
            session_notes=data.get('session_notes')
        )
        
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الجلسة بنجاح',
            'data': {
                'id': session.id,
                'session_code': session.session_code
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== لوحة التحكم والإحصائيات =====

@comprehensive_rehab_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_DASHBOARD_STATS')
def get_dashboard_stats():
    """الحصول على إحصائيات لوحة التحكم"""
    try:
        # إحصائيات المستفيدين
        total_beneficiaries = RehabilitationBeneficiary.query.filter_by(status='active').count()
        new_beneficiaries_this_month = RehabilitationBeneficiary.query.filter(
            RehabilitationBeneficiary.registration_date >= datetime.now().replace(day=1)
        ).count()
        
        # إحصائيات التقييمات
        total_assessments = ComprehensiveAssessment.query.count()
        assessments_this_month = ComprehensiveAssessment.query.filter(
            ComprehensiveAssessment.assessment_date >= datetime.now().replace(day=1)
        ).count()
        
        # إحصائيات الخطط
        active_plans = IndividualRehabilitationPlan.query.filter_by(status='active').count()
        
        # إحصائيات الجلسات
        total_sessions = TherapySession.query.count()
        sessions_today = TherapySession.query.filter_by(session_date=date.today()).count()
        completed_sessions = TherapySession.query.filter_by(status=SessionStatus.COMPLETED).count()
        
        # توزيع أنواع الإعاقة
        disability_distribution = db.session.query(
            RehabilitationBeneficiary.primary_disability,
            func.count(RehabilitationBeneficiary.id)
        ).group_by(RehabilitationBeneficiary.primary_disability).all()
        
        # توزيع أنواع العلاج
        therapy_distribution = db.session.query(
            TherapySession.therapy_type,
            func.count(TherapySession.id)
        ).group_by(TherapySession.therapy_type).all()
        
        return jsonify({
            'success': True,
            'data': {
                'beneficiaries': {
                    'total': total_beneficiaries,
                    'new_this_month': new_beneficiaries_this_month
                },
                'assessments': {
                    'total': total_assessments,
                    'this_month': assessments_this_month
                },
                'plans': {
                    'active': active_plans
                },
                'sessions': {
                    'total': total_sessions,
                    'today': sessions_today,
                    'completed': completed_sessions,
                    'completion_rate': round((completed_sessions / total_sessions * 100) if total_sessions > 0 else 0, 2)
                },
                'disability_distribution': [
                    {
                        'type': disability.value if disability else 'unknown',
                        'count': count,
                        'label': get_disability_label(disability.value if disability else 'unknown')
                    } for disability, count in disability_distribution
                ],
                'therapy_distribution': [
                    {
                        'type': therapy.value if therapy else 'unknown',
                        'count': count,
                        'label': get_therapy_label(therapy.value if therapy else 'unknown')
                    } for therapy, count in therapy_distribution
                ]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== إدارة المعالجين =====

@comprehensive_rehab_bp.route('/therapists', methods=['GET'])
@jwt_required()
@check_permission('view_comprehensive_rehabilitation')
@log_audit('GET_THERAPISTS')
def get_therapists():
    """الحصول على قائمة المعالجين"""
    try:
        therapists = Therapist.query.filter_by(status='active').all()
        
        return jsonify({
            'success': True,
            'data': [{
                'id': t.id,
                'full_name': t.full_name,
                'specialization': t.specialization.value if t.specialization else None,
                'specialization_label': get_therapy_label(t.specialization.value if t.specialization else ''),
                'experience_years': t.experience_years,
                'license_number': t.license_number,
                'phone': t.phone,
                'email': t.email
            } for t in therapists]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== تقارير التقدم =====

@comprehensive_rehab_bp.route('/progress-reports/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
@check_permission('view_comprehensive_rehabilitation')
@log_audit('GET_BENEFICIARY_PROGRESS')
def get_beneficiary_progress(beneficiary_id):
    """الحصول على تقرير تقدم المستفيد"""
    try:
        beneficiary = RehabilitationBeneficiary.query.get_or_404(beneficiary_id)
        
        # الحصول على آخر تقييم
        latest_assessment = ComprehensiveAssessment.query.filter_by(
            beneficiary_id=beneficiary_id
        ).order_by(ComprehensiveAssessment.assessment_date.desc()).first()
        
        # الحصول على الخطط النشطة
        active_plans = IndividualRehabilitationPlan.query.filter_by(
            beneficiary_id=beneficiary_id,
            status='active'
        ).all()
        
        # الحصول على الجلسات الأخيرة
        recent_sessions = TherapySession.query.filter_by(
            beneficiary_id=beneficiary_id
        ).order_by(TherapySession.session_date.desc()).limit(10).all()
        
        return jsonify({
            'success': True,
            'data': {
                'beneficiary': {
                    'id': beneficiary.id,
                    'full_name': beneficiary.full_name,
                    'age': beneficiary.age,
                    'primary_disability': get_disability_label(beneficiary.primary_disability.value if beneficiary.primary_disability else '')
                },
                'latest_assessment': {
                    'id': latest_assessment.id,
                    'assessment_date': latest_assessment.assessment_date.isoformat(),
                    'motor_skills_score': latest_assessment.motor_skills_score,
                    'cognitive_score': latest_assessment.cognitive_score,
                    'communication_score': latest_assessment.communication_score,
                    'social_skills_score': latest_assessment.social_skills_score,
                    'daily_living_score': latest_assessment.daily_living_score
                } if latest_assessment else None,
                'active_plans': [{
                    'id': plan.id,
                    'plan_name': plan.plan_name,
                    'start_date': plan.start_date.isoformat(),
                    'end_date': plan.end_date.isoformat(),
                    'required_therapies': plan.required_therapies
                } for plan in active_plans],
                'recent_sessions': [{
                    'id': session.id,
                    'session_date': session.session_date.isoformat(),
                    'therapy_type': get_therapy_label(session.therapy_type.value if session.therapy_type else ''),
                    'performance_rating': session.performance_rating.value if session.performance_rating else None,
                    'progress_notes': session.progress_notes
                } for session in recent_sessions]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
