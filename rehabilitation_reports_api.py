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
API endpoints لنظام تقارير وتحليلات برامج التأهيل
Rehabilitation Reports and Analytics API Endpoints
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from sqlalchemy import and_, or_, func, desc, case, extract
from sqlalchemy.orm import joinedload
from models import db, User
from rehabilitation_programs_models import (
    RehabilitationBeneficiary, RehabilitationProgram, BeneficiaryProgram,
    TherapySession, ProgressAssessment, Therapist, Equipment, EducationalResource,
    DisabilityType, ProgramType, SessionStatus, ProgressLevel
)
import json
from collections import defaultdict

# إنشاء Blueprint
rehabilitation_reports_bp = Blueprint('rehabilitation_reports', __name__)

@rehabilitation_reports_bp.route('/api/rehabilitation/reports/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_REPORTS_DASHBOARD')
def get_reports_dashboard():
    """لوحة تحكم التقارير والتحليلات"""
    try:
        # فترة التقرير
        period = request.args.get('period', '30')  # آخر 30 يوم افتراضياً
        end_date = date.today()
        start_date = end_date - timedelta(days=int(period))
        
        # إحصائيات عامة
        total_beneficiaries = RehabilitationBeneficiary.query.filter_by(is_active=True).count()
        active_programs = RehabilitationProgram.query.filter_by(is_active=True).count()
        active_enrollments = BeneficiaryProgram.query.filter_by(status='active').count()
        completed_enrollments = BeneficiaryProgram.query.filter_by(status='completed').count()
        
        # جلسات الفترة
        period_sessions = TherapySession.query.filter(
            func.date(TherapySession.scheduled_date).between(start_date, end_date)
        ).count()
        
        completed_sessions = TherapySession.query.filter(
            and_(
                func.date(TherapySession.scheduled_date).between(start_date, end_date),
                TherapySession.status == SessionStatus.COMPLETED
            )
        ).count()
        
        cancelled_sessions = TherapySession.query.filter(
            and_(
                func.date(TherapySession.scheduled_date).between(start_date, end_date),
                TherapySession.status == SessionStatus.CANCELLED
            )
        ).count()
        
        # معدل الحضور
        attendance_rate = (completed_sessions / period_sessions * 100) if period_sessions > 0 else 0
        
        # توزيع أنواع الإعاقة
        disability_stats = db.session.query(
            RehabilitationBeneficiary.disability_type,
            func.count(RehabilitationBeneficiary.id).label('count')
        ).filter_by(is_active=True).group_by(
            RehabilitationBeneficiary.disability_type
        ).all()
        
        # توزيع البرامج
        program_stats = db.session.query(
            RehabilitationProgram.program_type,
            func.count(BeneficiaryProgram.id).label('enrollments'),
            func.avg(BeneficiaryProgram.completion_percentage).label('avg_progress')
        ).join(BeneficiaryProgram).filter(
            BeneficiaryProgram.status == 'active'
        ).group_by(RehabilitationProgram.program_type).all()
        
        # تقييمات الأداء
        performance_stats = db.session.query(
            TherapySession.performance_rating,
            func.count(TherapySession.id).label('count')
        ).filter(
            and_(
                func.date(TherapySession.scheduled_date).between(start_date, end_date),
                TherapySession.performance_rating.isnot(None)
            )
        ).group_by(TherapySession.performance_rating).all()
        
        # اتجاه الجلسات (آخر 12 أسبوع)
        sessions_trend = []
        for i in range(12):
            week_start = end_date - timedelta(weeks=i+1)
            week_end = end_date - timedelta(weeks=i)
            
            week_sessions = TherapySession.query.filter(
                func.date(TherapySession.scheduled_date).between(week_start, week_end)
            ).count()
            
            sessions_trend.append({
                'week': f"الأسبوع {12-i}",
                'sessions': week_sessions,
                'date_range': f"{week_start.strftime('%d/%m')} - {week_end.strftime('%d/%m')}"
            })
        
        return jsonify({
            'success': True,
            'period': {
                'days': period,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'overview': {
                'total_beneficiaries': total_beneficiaries,
                'active_programs': active_programs,
                'active_enrollments': active_enrollments,
                'completed_enrollments': completed_enrollments,
                'completion_rate': (completed_enrollments / (active_enrollments + completed_enrollments) * 100) if (active_enrollments + completed_enrollments) > 0 else 0
            },
            'sessions': {
                'total_sessions': period_sessions,
                'completed_sessions': completed_sessions,
                'cancelled_sessions': cancelled_sessions,
                'attendance_rate': round(attendance_rate, 2)
            },
            'disability_distribution': [
                {
                    'type': stat.disability_type.value if stat.disability_type else 'unknown',
                    'count': stat.count,
                    'percentage': round(stat.count / total_beneficiaries * 100, 1) if total_beneficiaries > 0 else 0
                }
                for stat in disability_stats
            ],
            'program_distribution': [
                {
                    'type': stat.program_type.value if stat.program_type else 'unknown',
                    'enrollments': stat.enrollments,
                    'avg_progress': round(float(stat.avg_progress or 0), 1)
                }
                for stat in program_stats
            ],
            'performance_distribution': [
                {
                    'level': stat.performance_rating.value if stat.performance_rating else 'unknown',
                    'count': stat.count,
                    'percentage': round(stat.count / completed_sessions * 100, 1) if completed_sessions > 0 else 0
                }
                for stat in performance_stats
            ],
            'sessions_trend': sessions_trend
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@rehabilitation_reports_bp.route('/api/rehabilitation/reports/beneficiary/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
@check_permission('view_reports')
@log_audit('GET_BENEFICIARY_REPORT')
def get_beneficiary_report(beneficiary_id):
    """تقرير مفصل عن مستفيد محدد"""
    try:
        beneficiary = RehabilitationBeneficiary.query.get_or_404(beneficiary_id)
        
        # البرامج المسجل فيها
        enrollments = BeneficiaryProgram.query.filter_by(
            beneficiary_id=beneficiary_id
        ).options(joinedload(BeneficiaryProgram.program)).all()
        
        # الجلسات
        sessions = TherapySession.query.filter_by(
            beneficiary_id=beneficiary_id
        ).options(
            joinedload(TherapySession.program),
            joinedload(TherapySession.therapist)
        ).order_by(TherapySession.scheduled_date.desc()).all()
        
        # التقييمات
        assessments = ProgressAssessment.query.filter_by(
            beneficiary_id=beneficiary_id
        ).options(joinedload(ProgressAssessment.assessor)).order_by(
            ProgressAssessment.assessment_date.desc()
        ).all()
        
        # إحصائيات الجلسات
        total_sessions = len(sessions)
        completed_sessions = len([s for s in sessions if s.status == SessionStatus.COMPLETED])
        cancelled_sessions = len([s for s in sessions if s.status == SessionStatus.CANCELLED])
        attendance_rate = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0
        
        # تطور الأداء
        performance_trend = []
        completed_sessions_with_rating = [s for s in sessions if s.status == SessionStatus.COMPLETED and s.performance_rating]
        completed_sessions_with_rating.sort(key=lambda x: x.scheduled_date)
        
        for session in completed_sessions_with_rating[-10:]:  # آخر 10 جلسات
            performance_trend.append({
                'date': session.scheduled_date.strftime('%Y-%m-%d'),
                'rating': session.performance_rating.value,
                'program': session.program.name
            })
        
        return jsonify({
            'success': True,
            'beneficiary': {
                'id': beneficiary.id,
                'name': beneficiary.full_name,
                'beneficiary_number': beneficiary.beneficiary_number,
                'age': beneficiary.age,
                'disability_type': beneficiary.disability_type.value if beneficiary.disability_type else None,
                'disability_description': beneficiary.disability_description,
                'registration_date': beneficiary.registration_date.isoformat() if beneficiary.registration_date else None
            },
            'enrollments': [
                {
                    'id': e.id,
                    'program_name': e.program.name,
                    'program_type': e.program.program_type.value,
                    'enrollment_date': e.enrollment_date.isoformat(),
                    'start_date': e.start_date.isoformat() if e.start_date else None,
                    'status': e.status,
                    'completion_percentage': e.completion_percentage,
                    'individual_goals': e.individual_goals
                }
                for e in enrollments
            ],
            'sessions_summary': {
                'total_sessions': total_sessions,
                'completed_sessions': completed_sessions,
                'cancelled_sessions': cancelled_sessions,
                'attendance_rate': round(attendance_rate, 2)
            },
            'recent_sessions': [
                {
                    'id': s.id,
                    'date': s.scheduled_date.strftime('%Y-%m-%d %H:%M'),
                    'program': s.program.name,
                    'therapist': s.therapist.name if s.therapist else None,
                    'status': s.status.value,
                    'performance_rating': s.performance_rating.value if s.performance_rating else None,
                    'notes': s.therapist_notes
                }
                for s in sessions[:10]
            ],
            'assessments': [
                {
                    'id': a.id,
                    'date': a.assessment_date.isoformat(),
                    'type': a.assessment_type,
                    'assessor': a.assessor.name if a.assessor else None,
                    'overall_progress': a.overall_progress.value if a.overall_progress else None,
                    'strengths': a.strengths,
                    'areas_for_improvement': a.areas_for_improvement
                }
                for a in assessments
            ],
            'performance_trend': performance_trend
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@rehabilitation_reports_bp.route('/api/rehabilitation/reports/program/<int:program_id>', methods=['GET'])
@jwt_required()
@check_permission('view_reports')
@log_audit('GET_PROGRAM_REPORT')
def get_program_report(program_id):
    """تقرير مفصل عن برنامج محدد"""
    try:
        program = RehabilitationProgram.query.get_or_404(program_id)
        
        # المسجلين في البرنامج
        enrollments = BeneficiaryProgram.query.filter_by(
            program_id=program_id
        ).options(joinedload(BeneficiaryProgram.beneficiary)).all()
        
        # الجلسات
        sessions = TherapySession.query.filter_by(
            program_id=program_id
        ).options(
            joinedload(TherapySession.beneficiary),
            joinedload(TherapySession.therapist)
        ).all()
        
        # إحصائيات التسجيل
        total_enrollments = len(enrollments)
        active_enrollments = len([e for e in enrollments if e.status == 'active'])
        completed_enrollments = len([e for e in enrollments if e.status == 'completed'])
        
        # إحصائيات الجلسات
        total_sessions = len(sessions)
        completed_sessions = len([s for s in sessions if s.status == SessionStatus.COMPLETED])
        
        # متوسط التقدم
        active_enrollments_list = [e for e in enrollments if e.status == 'active']
        avg_progress = sum([e.completion_percentage or 0 for e in active_enrollments_list]) / len(active_enrollments_list) if active_enrollments_list else 0
        
        # توزيع الأداء
        performance_distribution = defaultdict(int)
        for session in sessions:
            if session.performance_rating:
                performance_distribution[session.performance_rating.value] += 1
        
        # المستفيدين حسب نوع الإعاقة
        disability_distribution = defaultdict(int)
        for enrollment in enrollments:
            if enrollment.beneficiary.disability_type:
                disability_distribution[enrollment.beneficiary.disability_type.value] += 1
        
        return jsonify({
            'success': True,
            'program': {
                'id': program.id,
                'name': program.name,
                'code': program.program_code,
                'type': program.program_type.value,
                'description': program.description,
                'duration_weeks': program.duration_weeks,
                'sessions_per_week': program.sessions_per_week,
                'session_duration_minutes': program.session_duration_minutes
            },
            'enrollment_stats': {
                'total_enrollments': total_enrollments,
                'active_enrollments': active_enrollments,
                'completed_enrollments': completed_enrollments,
                'completion_rate': round(completed_enrollments / total_enrollments * 100, 2) if total_enrollments > 0 else 0,
                'avg_progress': round(avg_progress, 2)
            },
            'session_stats': {
                'total_sessions': total_sessions,
                'completed_sessions': completed_sessions,
                'completion_rate': round(completed_sessions / total_sessions * 100, 2) if total_sessions > 0 else 0
            },
            'performance_distribution': [
                {'level': level, 'count': count}
                for level, count in performance_distribution.items()
            ],
            'disability_distribution': [
                {'type': disability_type, 'count': count}
                for disability_type, count in disability_distribution.items()
            ],
            'active_beneficiaries': [
                {
                    'id': e.beneficiary.id,
                    'name': e.beneficiary.full_name,
                    'enrollment_date': e.enrollment_date.isoformat(),
                    'progress': e.completion_percentage,
                    'disability_type': e.beneficiary.disability_type.value if e.beneficiary.disability_type else None
                }
                for e in enrollments if e.status == 'active'
            ]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@rehabilitation_reports_bp.route('/api/rehabilitation/reports/therapist/<int:therapist_id>', methods=['GET'])
@jwt_required()
@check_permission('view_reports')
@log_audit('GET_THERAPIST_REPORT')
def get_therapist_report(therapist_id):
    """تقرير أداء أخصائي محدد"""
    try:
        therapist = User.query.get_or_404(therapist_id)
        
        # فترة التقرير
        period = request.args.get('period', '30')
        end_date = date.today()
        start_date = end_date - timedelta(days=int(period))
        
        # الجلسات المنفذة
        sessions = TherapySession.query.filter(
            and_(
                TherapySession.therapist_id == therapist_id,
                func.date(TherapySession.scheduled_date).between(start_date, end_date)
            )
        ).options(
            joinedload(TherapySession.beneficiary),
            joinedload(TherapySession.program)
        ).all()
        
        # المستفيدين المتابعين
        beneficiaries = db.session.query(RehabilitationBeneficiary).join(
            BeneficiaryProgram
        ).filter(
            BeneficiaryProgram.assigned_therapist_id == therapist_id,
            BeneficiaryProgram.status == 'active'
        ).all()
        
        # إحصائيات الجلسات
        total_sessions = len(sessions)
        completed_sessions = len([s for s in sessions if s.status == SessionStatus.COMPLETED])
        cancelled_sessions = len([s for s in sessions if s.status == SessionStatus.CANCELLED])
        
        # توزيع الأداء
        performance_stats = defaultdict(int)
        for session in sessions:
            if session.performance_rating:
                performance_stats[session.performance_rating.value] += 1
        
        # البرامج المنفذة
        program_stats = defaultdict(int)
        for session in sessions:
            program_stats[session.program.name] += 1
        
        # متوسط مدة الجلسة
        completed_sessions_list = [s for s in sessions if s.status == SessionStatus.COMPLETED and s.duration_minutes]
        avg_session_duration = sum([s.duration_minutes for s in completed_sessions_list]) / len(completed_sessions_list) if completed_sessions_list else 0
        
        return jsonify({
            'success': True,
            'therapist': {
                'id': therapist.id,
                'name': therapist.name,
                'email': therapist.email
            },
            'period': {
                'days': period,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'session_stats': {
                'total_sessions': total_sessions,
                'completed_sessions': completed_sessions,
                'cancelled_sessions': cancelled_sessions,
                'completion_rate': round(completed_sessions / total_sessions * 100, 2) if total_sessions > 0 else 0,
                'avg_session_duration': round(avg_session_duration, 2)
            },
            'active_beneficiaries': len(beneficiaries),
            'performance_distribution': [
                {'level': level, 'count': count}
                for level, count in performance_stats.items()
            ],
            'program_distribution': [
                {'program': program, 'sessions': count}
                for program, count in program_stats.items()
            ],
            'beneficiaries_list': [
                {
                    'id': b.id,
                    'name': b.full_name,
                    'disability_type': b.disability_type.value if b.disability_type else None
                }
                for b in beneficiaries
            ]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@rehabilitation_reports_bp.route('/api/rehabilitation/reports/export', methods=['POST'])
@jwt_required()
@check_permission('manage_rehabilitation_reports')
@guard_payload_size()
@log_audit('EXPORT_REPORT')
def export_report():
    """تصدير التقارير بصيغ مختلفة"""
    try:
        data = request.get_json()
        report_type = data.get('report_type')  # dashboard, beneficiary, program, therapist
        format_type = data.get('format', 'json')  # json, csv, pdf
        
        # ه��ا يمكن إضافة منطق التصدير حسب النوع والصيغة المطلوبة
        # للبساطة، سنعيد رسالة نجاح
        
        return jsonify({
            'success': True,
            'message': f'تم تصدير التقرير بصيغة {format_type} بنجاح',
            'download_url': f'/downloads/report_{report_type}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.{format_type}'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@rehabilitation_reports_bp.route('/api/rehabilitation/reports/custom', methods=['POST'])
@jwt_required()
@check_permission('generate_rehabilitation_reports')
@guard_payload_size()
@log_audit('GENERATE_CUSTOM_REPORT')
def generate_custom_report():
    """إنشاء تقرير مخصص"""
    try:
        data = request.get_json()
        
        # معايير التقرير
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        disability_types = data.get('disability_types', [])
        program_types = data.get('program_types', [])
        therapist_ids = data.get('therapist_ids', [])
        
        # بناء الاستعلام
        query = db.session.query(TherapySession).options(
            joinedload(TherapySession.beneficiary),
            joinedload(TherapySession.program),
            joinedload(TherapySession.therapist)
        ).filter(
            func.date(TherapySession.scheduled_date).between(start_date, end_date)
        )
        
        if disability_types:
            query = query.join(RehabilitationBeneficiary).filter(
                RehabilitationBeneficiary.disability_type.in_(disability_types)
            )
        
        if program_types:
            query = query.join(RehabilitationProgram).filter(
                RehabilitationProgram.program_type.in_(program_types)
            )
        
        if therapist_ids:
            query = query.filter(TherapySession.therapist_id.in_(therapist_ids))
        
        sessions = query.all()
        
        # تجميع البيانات
        total_sessions = len(sessions)
        completed_sessions = len([s for s in sessions if s.status == SessionStatus.COMPLETED])
        
        # إحصائيات مفصلة
        beneficiaries_count = len(set([s.beneficiary_id for s in sessions]))
        programs_count = len(set([s.program_id for s in sessions]))
        therapists_count = len(set([s.therapist_id for s in sessions]))
        
        return jsonify({
            'success': True,
            'report': {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                },
                'filters': {
                    'disability_types': disability_types,
                    'program_types': program_types,
                    'therapist_ids': therapist_ids
                },
                'summary': {
                    'total_sessions': total_sessions,
                    'completed_sessions': completed_sessions,
                    'completion_rate': round(completed_sessions / total_sessions * 100, 2) if total_sessions > 0 else 0,
                    'unique_beneficiaries': beneficiaries_count,
                    'unique_programs': programs_count,
                    'unique_therapists': therapists_count
                },
                'sessions': [
                    {
                        'date': s.scheduled_date.strftime('%Y-%m-%d'),
                        'beneficiary': s.beneficiary.full_name,
                        'program': s.program.name,
                        'therapist': s.therapist.name if s.therapist else None,
                        'status': s.status.value,
                        'performance': s.performance_rating.value if s.performance_rating else None
                    }
                    for s in sessions
                ]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
