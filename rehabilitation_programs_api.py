#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API endpoints لنظام برامج تأهيل ذوي الاحتياجات الخاصة
Rehabilitation Programs API Endpoints
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import joinedload
from models import db, User
from rehabilitation_programs_models import (
    RehabilitationBeneficiary, RehabilitationProgram, BeneficiaryProgram,
    TherapySession, ProgressAssessment, Therapist, Equipment, EducationalResource,
    DisabilityType, ProgramType, SessionStatus, ProgressLevel
)
import json

# إنشاء Blueprint
rehabilitation_bp = Blueprint('rehabilitation_programs', __name__)

# ===== إدارة المستفيدين =====

@rehabilitation_bp.route('/api/rehabilitation/beneficiaries', methods=['GET'])
@jwt_required()
def get_beneficiaries():
    """عرض قائمة المستفيدين"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        disability_type = request.args.get('disability_type', '')
        
        query = RehabilitationBeneficiary.query
        
        if search:
            query = query.filter(
                or_(
                    RehabilitationBeneficiary.first_name.contains(search),
                    RehabilitationBeneficiary.last_name.contains(search),
                    RehabilitationBeneficiary.beneficiary_number.contains(search)
                )
            )
        
        if disability_type:
            query = query.filter(RehabilitationBeneficiary.disability_type == disability_type)
        
        beneficiaries = query.order_by(RehabilitationBeneficiary.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'beneficiaries': [{
                'id': b.id,
                'beneficiary_number': b.beneficiary_number,
                'full_name': b.full_name,
                'age': b.age,
                'disability_type': b.disability_type.value if b.disability_type else None,
                'disability_description': b.disability_description,
                'phone': b.phone,
                'registration_date': b.registration_date.isoformat() if b.registration_date else None,
                'is_active': b.is_active
            } for b in beneficiaries.items],
            'pagination': {
                'page': beneficiaries.page,
                'pages': beneficiaries.pages,
                'per_page': beneficiaries.per_page,
                'total': beneficiaries.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@rehabilitation_bp.route('/api/rehabilitation/beneficiaries', methods=['POST'])
@jwt_required()
def create_beneficiary():
    """إضافة مستفيد جديد"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        # إنشاء رقم مستفيد تلقائي
        last_beneficiary = RehabilitationBeneficiary.query.order_by(
            RehabilitationBeneficiary.id.desc()
        ).first()
        next_number = 1 if not last_beneficiary else last_beneficiary.id + 1
        beneficiary_number = f"RB{next_number:06d}"
        
        beneficiary = RehabilitationBeneficiary(
            beneficiary_number=beneficiary_number,
            first_name=data['first_name'],
            last_name=data['last_name'],
            date_of_birth=datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date(),
            gender=data['gender'],
            national_id=data.get('national_id'),
            disability_type=DisabilityType(data['disability_type']),
            disability_description=data.get('disability_description'),
            disability_degree=data.get('disability_degree'),
            phone=data.get('phone'),
            email=data.get('email'),
            address=data.get('address'),
            guardian_name=data.get('guardian_name'),
            guardian_relationship=data.get('guardian_relationship'),
            guardian_phone=data.get('guardian_phone'),
            notes=data.get('notes'),
            created_by=current_user
        )
        
        db.session.add(beneficiary)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة المستفيد بنجاح',
            'beneficiary_id': beneficiary.id,
            'beneficiary_number': beneficiary.beneficiary_number
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== إدارة البرامج =====

@rehabilitation_bp.route('/api/rehabilitation/programs', methods=['GET'])
@jwt_required()
def get_programs():
    """عرض قائمة برامج التأهيل"""
    try:
        program_type = request.args.get('program_type', '')
        is_active = request.args.get('is_active', 'true')
        
        query = RehabilitationProgram.query
        
        if program_type:
            query = query.filter(RehabilitationProgram.program_type == program_type)
        
        if is_active.lower() == 'true':
            query = query.filter(RehabilitationProgram.is_active == True)
        
        programs = query.order_by(RehabilitationProgram.name).all()
        
        return jsonify({
            'success': True,
            'programs': [{
                'id': p.id,
                'program_code': p.program_code,
                'name': p.name,
                'description': p.description,
                'program_type': p.program_type.value,
                'duration_weeks': p.duration_weeks,
                'sessions_per_week': p.sessions_per_week,
                'session_duration_minutes': p.session_duration_minutes,
                'max_participants': p.max_participants,
                'cost_per_session': p.cost_per_session,
                'is_active': p.is_active
            } for p in programs]
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@rehabilitation_bp.route('/api/rehabilitation/programs', methods=['POST'])
@jwt_required()
def create_program():
    """إضافة برنامج تأهيل جديد"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        # إنشاء رمز برنامج تلقائي
        program_type_code = data['program_type'][:3].upper()
        last_program = RehabilitationProgram.query.filter(
            RehabilitationProgram.program_code.like(f"{program_type_code}%")
        ).order_by(RehabilitationProgram.id.desc()).first()
        
        next_number = 1 if not last_program else int(last_program.program_code[3:]) + 1
        program_code = f"{program_type_code}{next_number:03d}"
        
        program = RehabilitationProgram(
            program_code=program_code,
            name=data['name'],
            description=data.get('description'),
            program_type=ProgramType(data['program_type']),
            target_disability_types=data.get('target_disability_types', []),
            age_group_min=data.get('age_group_min'),
            age_group_max=data.get('age_group_max'),
            duration_weeks=data.get('duration_weeks'),
            sessions_per_week=data.get('sessions_per_week'),
            session_duration_minutes=data.get('session_duration_minutes'),
            objectives=data.get('objectives', []),
            activities=data.get('activities', []),
            max_participants=data.get('max_participants', 1),
            cost_per_session=data.get('cost_per_session'),
            created_by=current_user
        )
        
        db.session.add(program)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة البرنامج بنجاح',
            'program_id': program.id,
            'program_code': program.program_code
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== إدارة الجلسات =====

@rehabilitation_bp.route('/api/rehabilitation/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    """عرض قائمة الجلسات"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        status = request.args.get('status')
        
        query = TherapySession.query.options(
            joinedload(TherapySession.beneficiary),
            joinedload(TherapySession.program),
            joinedload(TherapySession.therapist)
        )
        
        if date_from:
            query = query.filter(TherapySession.scheduled_date >= datetime.strptime(date_from, '%Y-%m-%d'))
        
        if date_to:
            query = query.filter(TherapySession.scheduled_date <= datetime.strptime(date_to, '%Y-%m-%d'))
        
        if status:
            query = query.filter(TherapySession.status == status)
        
        sessions = query.order_by(TherapySession.scheduled_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'sessions': [{
                'id': s.id,
                'session_number': s.session_number,
                'beneficiary_name': s.beneficiary.full_name,
                'program_name': s.program.name,
                'therapist_name': s.therapist.full_name if s.therapist else None,
                'scheduled_date': s.scheduled_date.isoformat(),
                'duration_minutes': s.duration_minutes,
                'status': s.status.value,
                'performance_rating': s.performance_rating.value if s.performance_rating else None
            } for s in sessions.items],
            'pagination': {
                'page': sessions.page,
                'pages': sessions.pages,
                'per_page': sessions.per_page,
                'total': sessions.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== لوحة التحكم والإحصائيات =====

@rehabilitation_bp.route('/api/rehabilitation/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """لوحة تحكم برامج التأهيل"""
    try:
        # إحصائيات عامة
        total_beneficiaries = RehabilitationBeneficiary.query.filter_by(is_active=True).count()
        total_programs = RehabilitationProgram.query.filter_by(is_active=True).count()
        active_enrollments = BeneficiaryProgram.query.filter_by(status='active').count()
        
        # جلسات اليوم
        today = date.today()
        today_sessions = TherapySession.query.filter(
            func.date(TherapySession.scheduled_date) == today
        ).count()
        
        # إحصائيات حسب نوع الإعاقة
        disability_stats = db.session.query(
            RehabilitationBeneficiary.disability_type,
            func.count(RehabilitationBeneficiary.id)
        ).filter_by(is_active=True).group_by(
            RehabilitationBeneficiary.disability_type
        ).all()
        
        # إحصائيات حسب نوع البرنامج
        program_stats = db.session.query(
            RehabilitationProgram.program_type,
            func.count(BeneficiaryProgram.id)
        ).join(BeneficiaryProgram).filter(
            BeneficiaryProgram.status == 'active'
        ).group_by(RehabilitationProgram.program_type).all()
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_beneficiaries': total_beneficiaries,
                'total_programs': total_programs,
                'active_enrollments': active_enrollments,
                'today_sessions': today_sessions,
                'disability_distribution': [
                    {'type': stat[0].value if stat[0] else 'unknown', 'count': stat[1]}
                    for stat in disability_stats
                ],
                'program_distribution': [
                    {'type': stat[0].value if stat[0] else 'unknown', 'count': stat[1]}
                    for stat in program_stats
                ]
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== تسجيل المستفيد في برنامج =====

@rehabilitation_bp.route('/api/rehabilitation/enroll', methods=['POST'])
@jwt_required()
def enroll_beneficiary():
    """تسجيل مستفيد في برنامج"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من وجود المستفيد والبرنامج
        beneficiary = RehabilitationBeneficiary.query.get(data['beneficiary_id'])
        program = RehabilitationProgram.query.get(data['program_id'])
        
        if not beneficiary or not program:
            return jsonify({'success': False, 'message': 'المستفيد أو البرنامج غير موجود'}), 404
        
        # التحقق من عدم وجود تسجيل نشط مسبق
        existing_enrollment = BeneficiaryProgram.query.filter_by(
            beneficiary_id=data['beneficiary_id'],
            program_id=data['program_id'],
            status='active'
        ).first()
        
        if existing_enrollment:
            return jsonify({'success': False, 'message': 'المستفيد مسجل بالفعل في هذا البرنامج'}), 400
        
        enrollment = BeneficiaryProgram(
            beneficiary_id=data['beneficiary_id'],
            program_id=data['program_id'],
            enrollment_date=date.today(),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
            individual_goals=data.get('individual_goals', []),
            special_considerations=data.get('special_considerations'),
            assigned_therapist_id=data.get('assigned_therapist_id'),
            created_by=current_user
        )
        
        # حساب تاريخ الانتهاء المتوقع
        if enrollment.start_date and program.duration_weeks:
            enrollment.expected_completion_date = enrollment.start_date + timedelta(weeks=program.duration_weeks)
        
        db.session.add(enrollment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تسجيل المستفيد في البرنامج بنجاح',
            'enrollment_id': enrollment.id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
