#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Family Portal API Endpoints
بوابة الأسرة - نقاط النهاية للواجهة البرمجية
"""

from flask import Blueprint, request, jsonify, session
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from datetime import datetime, date, timedelta
from werkzeug.security import check_password_hash, generate_password_hash
import json

from models import db
from family_portal_models import *
from rehabilitation_programs_models import RehabilitationBeneficiary, RehabilitationProgram
from session_scheduling_models import SessionSchedule
from auth_rbac_decorator import (
    check_permission,
    guard_payload_size,
    validate_json,
    log_audit
)

family_portal_bp = Blueprint('family_portal', __name__)

@family_portal_bp.route('/api/family-portal/login', methods=['POST'])
@guard_payload_size()
@validate_json('username', 'password')
@log_audit('FAMILY_PORTAL_LOGIN')
def family_login():
    """تسجيل دخول أفراد الأسرة"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        family_member = FamilyMember.query.filter_by(
            portal_username=username,
            is_portal_active=True
        ).first()
        
        if not family_member or not check_password_hash(family_member.portal_password_hash, password):
            return jsonify({
                'success': False,
                'message': 'اسم المستخدم أو كلمة المرور غير صحيحة'
            }), 401
        
        # إنشاء رمز الوصول
        access_token = create_access_token(
            identity=family_member.id,
            additional_claims={'user_type': 'family_member'}
        )
        
        # تسجيل جلسة البوابة
        portal_session = FamilyPortalSession(
            session_id=f"FPS-{datetime.now().strftime('%Y%m%d%H%M%S')}-{family_member.id}",
            family_member_id=family_member.id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            device_type='web'
        )
        db.session.add(portal_session)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تسجيل الدخول بنجاح',
            'data': {
                'access_token': access_token,
                'family_member': {
                    'id': family_member.id,
                    'name': family_member.full_name,
                    'role': family_member.relationship_to_beneficiary.value,
                    'beneficiary_name': family_member.beneficiary.full_name
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في تسجيل الدخول: {str(e)}'
        }), 500

@family_portal_bp.route('/api/family-portal/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_family_portal')
@log_audit('VIEW_FAMILY_DASHBOARD')
def get_family_dashboard():
    """لوحة تحكم الأسرة"""
    try:
        family_member_id = get_jwt_identity()
        family_member = FamilyMember.query.get(family_member_id)
        
        if not family_member:
            return jsonify({'success': False, 'message': 'المستخدم غير موجود'}), 404
        
        beneficiary = family_member.beneficiary
        
        # الجلسات القادمة
        upcoming_sessions = SessionSchedule.query.filter(
            SessionSchedule.beneficiary_id == beneficiary.id,
            SessionSchedule.session_date >= date.today(),
            SessionSchedule.status.in_(['scheduled', 'confirmed'])
        ).order_by(SessionSchedule.session_date, SessionSchedule.start_time).limit(5).all()
        
        # الرسائل غير المقروءة
        unread_messages = FamilyMessage.query.filter(
            FamilyMessage.recipient_id == family_member.id,
            FamilyMessage.read_at.is_(None)
        ).count()
        
        # الواجبات المعلقة
        pending_homework = HomeworkAssignment.query.filter(
            HomeworkAssignment.beneficiary_id == beneficiary.id,
            HomeworkAssignment.is_completed == False,
            HomeworkAssignment.due_date >= date.today()
        ).count()
        
        # آخر تقرير تقدم
        latest_report = FamilyProgressReport.query.filter(
            FamilyProgressReport.beneficiary_id == beneficiary.id,
            FamilyProgressReport.shared_with_family == True
        ).order_by(FamilyProgressReport.generated_at.desc()).first()
        
        dashboard_data = {
            'beneficiary_info': {
                'name': beneficiary.full_name,
                'age': beneficiary.age,
                'disability_type': beneficiary.disability_type.value
            },
            'upcoming_sessions': [{
                'id': session.id,
                'date': session.session_date.isoformat(),
                'time': session.start_time.strftime('%H:%M'),
                'type': session.session_type.value,
                'therapist': f"{session.therapist.first_name} {session.therapist.last_name}" if session.therapist else 'غير محدد'
            } for session in upcoming_sessions],
            'statistics': {
                'unread_messages': unread_messages,
                'pending_homework': pending_homework,
                'next_session_days': (upcoming_sessions[0].session_date - date.today()).days if upcoming_sessions else None
            },
            'latest_progress_report': {
                'id': latest_report.id,
                'title': latest_report.report_title,
                'date': latest_report.generated_at.isoformat(),
                'overall_score': latest_report.overall_progress_score
            } if latest_report else None
        }
        
        return jsonify({
            'success': True,
            'message': 'تم جلب بيانات لوحة التحكم بنجاح',
            'data': dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب بيانات لوحة التحكم: {str(e)}'
        }), 500

@family_portal_bp.route('/api/family-portal/messages', methods=['GET'])
@jwt_required()
@check_permission('access_family_portal')
@log_audit('GET_FAMILY_MESSAGES')
def get_family_messages():
    """الحصول على رسائل الأسرة"""
    try:
        family_member_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        message_type = request.args.get('type')
        
        query = FamilyMessage.query.filter_by(recipient_id=family_member_id)
        
        if message_type:
            query = query.filter_by(message_type=MessageType(message_type))
        
        messages = query.order_by(FamilyMessage.sent_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        messages_data = []
        for message in messages.items:
            messages_data.append({
                'id': message.id,
                'message_id': message.message_id,
                'subject': message.subject,
                'message_body': message.message_body,
                'message_type': message.message_type.value,
                'priority': message.priority,
                'status': message.status.value,
                'sent_at': message.sent_at.isoformat(),
                'read_at': message.read_at.isoformat() if message.read_at else None,
                'sender_name': message.staff_sender.username if message.staff_sender else 'النظام',
                'requires_response': message.requires_response,
                'response_deadline': message.response_deadline.isoformat() if message.response_deadline else None
            })
        
        return jsonify({
            'success': True,
            'message': 'تم جلب الرسائل بنجاح',
            'data': {
                'messages': messages_data,
                'pagination': {
                    'page': page,
                    'pages': messages.pages,
                    'per_page': per_page,
                    'total': messages.total
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب الرسائل: {str(e)}'
        }), 500

@family_portal_bp.route('/api/family-portal/messages/<int:message_id>/read', methods=['POST'])
@jwt_required()
@check_permission('manage_family_portal')
@guard_payload_size()
@log_audit('MARK_MESSAGE_READ')
def mark_message_read(message_id):
    """تحديد الرسالة كمقروءة"""
    try:
        family_member_id = get_jwt_identity()
        
        message = FamilyMessage.query.filter_by(
            id=message_id,
            recipient_id=family_member_id
        ).first()
        
        if not message:
            return jsonify({'success': False, 'message': 'الرسالة غير موجودة'}), 404
        
        if not message.read_at:
            message.read_at = datetime.utcnow()
            message.status = MessageStatus.READ
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديد الرسالة كمقروءة'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في تحديث حالة الرسالة: {str(e)}'
        }), 500

@family_portal_bp.route('/api/family-portal/progress-reports', methods=['GET'])
@jwt_required()
@check_permission('view_reports')
@log_audit('GET_PROGRESS_REPORTS')
def get_progress_reports():
    """الحصول على تقارير التقدم"""
    try:
        family_member_id = get_jwt_identity()
        family_member = FamilyMember.query.get(family_member_id)
        
        reports = FamilyProgressReport.query.filter(
            FamilyProgressReport.beneficiary_id == family_member.beneficiary_id,
            FamilyProgressReport.shared_with_family == True
        ).order_by(FamilyProgressReport.generated_at.desc()).all()
        
        reports_data = []
        for report in reports:
            reports_data.append({
                'id': report.id,
                'report_id': report.report_id,
                'title': report.report_title,
                'type': report.report_type.value,
                'period_start': report.report_period_start.isoformat(),
                'period_end': report.report_period_end.isoformat(),
                'overall_score': report.overall_progress_score,
                'attendance_rate': report.session_attendance_rate,
                'goal_achievement_rate': report.goal_achievement_rate,
                'generated_at': report.generated_at.isoformat(),
                'executive_summary': report.executive_summary
            })
        
        return jsonify({
            'success': True,
            'message': 'تم جلب تقارير التقدم بنجاح',
            'data': reports_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب تقارير التقدم: {str(e)}'
        }), 500

@family_portal_bp.route('/api/family-portal/homework', methods=['GET'])
@jwt_required()
@check_permission('view_family_portal')
@log_audit('GET_HOMEWORK_ASSIGNMENTS')
def get_homework_assignments():
    """الحصول على الواجبات المنزلية"""
    try:
        family_member_id = get_jwt_identity()
        family_member = FamilyMember.query.get(family_member_id)
        
        status = request.args.get('status', 'all')  # all, pending, completed, overdue
        
        query = HomeworkAssignment.query.filter_by(beneficiary_id=family_member.beneficiary_id)
        
        if status == 'pending':
            query = query.filter_by(is_completed=False)
        elif status == 'completed':
            query = query.filter_by(is_completed=True)
        elif status == 'overdue':
            query = query.filter(
                HomeworkAssignment.is_completed == False,
                HomeworkAssignment.due_date < date.today()
            )
        
        assignments = query.order_by(HomeworkAssignment.due_date.desc()).all()
        
        assignments_data = []
        for assignment in assignments:
            assignments_data.append({
                'id': assignment.id,
                'assignment_id': assignment.assignment_id,
                'title': assignment.title,
                'description': assignment.description,
                'instructions': assignment.instructions,
                'objectives': assignment.objectives,
                'materials_needed': assignment.materials_needed,
                'assigned_date': assignment.assigned_date.isoformat(),
                'due_date': assignment.due_date.isoformat(),
                'estimated_duration': assignment.estimated_duration_minutes,
                'is_completed': assignment.is_completed,
                'completion_date': assignment.completion_date.isoformat() if assignment.completion_date else None,
                'is_overdue': assignment.is_overdue,
                'days_remaining': assignment.days_remaining,
                'performance_rating': assignment.performance_rating,
                'therapist_feedback': assignment.therapist_feedback
            })
        
        return jsonify({
            'success': True,
            'message': 'تم جلب الواجبات المنزلية بنجاح',
            'data': assignments_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب الواجبات المنزلية: {str(e)}'
        }), 500

@family_portal_bp.route('/api/family-portal/homework/<int:assignment_id>/complete', methods=['POST'])
@jwt_required()
@check_permission('manage_family_portal')
@guard_payload_size()
@log_audit('COMPLETE_HOMEWORK')
def complete_homework(assignment_id):
    """تحديد الواجب كمكتمل"""
    try:
        family_member_id = get_jwt_identity()
        family_member = FamilyMember.query.get(family_member_id)
        data = request.get_json()
        
        assignment = HomeworkAssignment.query.filter_by(
            id=assignment_id,
            beneficiary_id=family_member.beneficiary_id
        ).first()
        
        if not assignment:
            return jsonify({'success': False, 'message': 'الواجب غير موجود'}), 404
        
        assignment.is_completed = True
        assignment.completion_date = date.today()
        assignment.family_notes = data.get('family_notes', '')
        assignment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديد الواجب كمكتمل بنجاح'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في تحديث الواجب: {str(e)}'
        }), 500

@family_portal_bp.route('/api/family-portal/feedback', methods=['POST'])
@jwt_required()
@check_permission('manage_family_portal')
@guard_payload_size()
@log_audit('SUBMIT_FEEDBACK')
def submit_feedback():
    """تقديم تقييم من الأسرة"""
    try:
        family_member_id = get_jwt_identity()
        family_member = FamilyMember.query.get(family_member_id)
        data = request.get_json()
        
        feedback = FamilyFeedback(
            family_member_id=family_member_id,
            beneficiary_id=family_member.beneficiary_id,
            feedback_type=FeedbackType(data['feedback_type']),
            related_session_id=data.get('related_session_id'),
            related_program_id=data.get('related_program_id'),
            related_therapist_id=data.get('related_therapist_id'),
            rating_overall=data.get('rating_overall'),
            rating_communication=data.get('rating_communication'),
            rating_professionalism=data.get('rating_professionalism'),
            rating_effectiveness=data.get('rating_effectiveness'),
            rating_environment=data.get('rating_environment'),
            positive_feedback=data.get('positive_feedback'),
            areas_for_improvement=data.get('areas_for_improvement'),
            suggestions=data.get('suggestions'),
            additional_comments=data.get('additional_comments'),
            is_anonymous=data.get('is_anonymous', False)
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تقديم التقييم بنجاح',
            'data': {'feedback_id': feedback.feedback_id}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في تقديم التقييم: {str(e)}'
        }), 500
