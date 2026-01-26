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
Session Scheduling and Calendar API Endpoints
Advanced scheduling system with calendar integration and automated scheduling
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, time, timedelta
import json

from database import db
from models import User
from session_scheduling_models import *
from scheduling_algorithms import AutomatedScheduler, SchedulingOptimizer, SchedulingRequest, SchedulingPriority, SchedulingConstraint
import uuid
from rehabilitation_programs_models import RehabilitationBeneficiary, RehabilitationProgram
from session_scheduling_models import (
    SessionSchedule, TherapyRoom, TherapistSchedule, RoomBooking,
    ScheduleConflict, ScheduleNotification, ScheduleTemplate,
    CalendarEvent, ScheduleStatistics, ScheduleOptimization,
    ScheduleStatus, RecurrenceType, RoomType, ConflictType, NotificationMethod
)

# Create Blueprint
session_scheduling_bp = Blueprint('session_scheduling', __name__, url_prefix='/api/scheduling')

# Therapy Rooms Management
@session_scheduling_bp.route('/rooms', methods=['GET'])
@jwt_required()
@check_permission('view_session_scheduling')
@log_audit('GET_THERAPY_ROOMS')
def get_therapy_rooms():
    """Get all therapy rooms with filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        room_type = request.args.get('room_type')
        is_available = request.args.get('is_available', type=bool)
        
        query = TherapyRoom.query
        
        if room_type:
            query = query.filter(TherapyRoom.room_type == room_type)
        if is_available is not None:
            query = query.filter(TherapyRoom.is_active == is_available)
        
        rooms = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'rooms': [{
                'id': room.id,
                'room_code': room.room_code,
                'name': room.name,
                'room_type': room.room_type.value if room.room_type else None,
                'capacity': room.capacity,
                'floor_number': room.floor_number,
                'building': room.building,
                'description': room.description,
                'available_equipment': room.available_equipment,
                'accessibility_features': room.accessibility_features,
                'is_active': room.is_active,
                'operating_hours': room.operating_hours
            } for room in rooms.items],
            'pagination': {
                'page': rooms.page,
                'pages': rooms.pages,
                'per_page': rooms.per_page,
                'total': rooms.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@session_scheduling_bp.route('/rooms', methods=['POST'])
@jwt_required()
@check_permission('manage_session_scheduling')
@guard_payload_size()
@log_audit('CREATE_THERAPY_ROOM')
def create_therapy_room():
    """Create a new therapy room"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        room = TherapyRoom(
            room_code=data['room_code'],
            name=data['name'],
            room_type=RoomType(data['room_type']),
            capacity=data.get('capacity', 1),
            floor_number=data.get('floor_number'),
            building=data.get('building'),
            description=data.get('description'),
            available_equipment=data.get('available_equipment', []),
            accessibility_features=data.get('accessibility_features', []),
            special_features=data.get('special_features', []),
            operating_hours=data.get('operating_hours', {}),
            created_by=current_user_id
        )
        
        db.session.add(room)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الغرفة بنجاح',
            'room_id': room.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Session Scheduling
@session_scheduling_bp.route('/sessions', methods=['GET'])
@jwt_required()
@check_permission('view_session_scheduling')
@log_audit('GET_SCHEDULED_SESSIONS')
def get_scheduled_sessions():
    """Get scheduled sessions with filtering and calendar view"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        
        # Date filtering
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        therapist_id = request.args.get('therapist_id', type=int)
        beneficiary_id = request.args.get('beneficiary_id', type=int)
        room_id = request.args.get('room_id', type=int)
        status = request.args.get('status')
        
        query = SessionSchedule.query.options(
            joinedload(SessionSchedule.beneficiary),
            joinedload(SessionSchedule.program),
            joinedload(SessionSchedule.therapist),
            joinedload(SessionSchedule.room)
        )
        
        if start_date:
            query = query.filter(SessionSchedule.scheduled_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
        if end_date:
            query = query.filter(SessionSchedule.scheduled_date <= datetime.strptime(end_date, '%Y-%m-%d').date())
        if therapist_id:
            query = query.filter(SessionSchedule.therapist_id == therapist_id)
        if beneficiary_id:
            query = query.filter(SessionSchedule.beneficiary_id == beneficiary_id)
        if room_id:
            query = query.filter(SessionSchedule.room_id == room_id)
        if status:
            query = query.filter(SessionSchedule.status == status)
        
        query = query.order_by(SessionSchedule.scheduled_date, SessionSchedule.scheduled_start_time)
        
        sessions = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'sessions': [{
                'id': session.id,
                'schedule_uuid': session.schedule_uuid,
                'beneficiary': {
                    'id': session.beneficiary.id,
                    'name': f"{session.beneficiary.first_name} {session.beneficiary.last_name}",
                    'disability_type': session.beneficiary.disability_type.value if session.beneficiary.disability_type else None
                } if session.beneficiary else None,
                'program': {
                    'id': session.program.id,
                    'name': session.program.name,
                    'program_type': session.program.program_type.value if session.program.program_type else None
                } if session.program else None,
                'therapist': {
                    'id': session.therapist.id,
                    'name': session.therapist.full_name if hasattr(session.therapist, 'full_name') else session.therapist.username
                } if session.therapist else None,
                'room': {
                    'id': session.room.id,
                    'name': session.room.name,
                    'room_code': session.room.room_code
                } if session.room else None,
                'scheduled_date': session.scheduled_date.isoformat(),
                'scheduled_start_time': session.scheduled_start_time.strftime('%H:%M'),
                'scheduled_end_time': session.scheduled_end_time.strftime('%H:%M'),
                'duration_minutes': session.duration_minutes,
                'session_type': session.session_type,
                'status': session.status.value if session.status else None,
                'confirmation_code': session.confirmation_code,
                'recurrence_type': session.recurrence_type.value if session.recurrence_type else None,
                'session_objectives': session.session_objectives,
                'preparation_notes': session.preparation_notes
            } for session in sessions.items],
            'pagination': {
                'page': sessions.page,
                'pages': sessions.pages,
                'per_page': sessions.per_page,
                'total': sessions.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@session_scheduling_bp.route('/sessions', methods=['POST'])
@jwt_required()
@check_permission('manage_session_scheduling')
@guard_payload_size()
@log_audit('CREATE_SESSION_SCHEDULE')
def create_session_schedule():
    """Create a new session schedule"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['beneficiary_id', 'program_id', 'therapist_id', 'scheduled_date', 'scheduled_start_time', 'duration_minutes']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'حقل {field} مطلوب'}), 400
        
        # Parse date and time
        scheduled_date = datetime.strptime(data['scheduled_date'], '%Y-%m-%d').date()
        start_time = datetime.strptime(data['scheduled_start_time'], '%H:%M').time()
        duration = data['duration_minutes']
        end_time = (datetime.combine(date.today(), start_time) + timedelta(minutes=duration)).time()
        
        # Check for conflicts
        conflicts = check_scheduling_conflicts(
            therapist_id=data['therapist_id'],
            room_id=data.get('room_id'),
            scheduled_date=scheduled_date,
            start_time=start_time,
            end_time=end_time,
            beneficiary_id=data['beneficiary_id']
        )
        
        if conflicts:
            return jsonify({
                'success': False,
                'message': 'توجد تعارضات في الجدولة',
                'conflicts': conflicts
            }), 409
        
        # Create session schedule
        session = SessionSchedule(
            beneficiary_id=data['beneficiary_id'],
            program_id=data['program_id'],
            therapist_id=data['therapist_id'],
            assistant_therapist_id=data.get('assistant_therapist_id'),
            scheduled_date=scheduled_date,
            scheduled_start_time=start_time,
            scheduled_end_time=end_time,
            duration_minutes=duration,
            room_id=data.get('room_id'),
            session_type=data.get('session_type', 'individual'),
            session_objectives=data.get('session_objectives', []),
            preparation_notes=data.get('preparation_notes'),
            required_equipment=data.get('required_equipment', []),
            recurrence_type=RecurrenceType(data.get('recurrence_type', 'none')),
            recurrence_pattern=data.get('recurrence_pattern'),
            recurrence_end_date=datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d').date() if data.get('recurrence_end_date') else None,
            confirmation_code=generate_confirmation_code(),
            created_by=current_user_id
        )
        
        db.session.add(session)
        
        # Create room booking if room specified
        if data.get('room_id'):
            booking = RoomBooking(
                room_id=data['room_id'],
                session_schedule_id=session.id,
                booking_date=scheduled_date,
                start_time=start_time,
                end_time=end_time,
                booking_type='session',
                booked_by=current_user_id,
                booking_reason=f"جلسة {session.session_type}",
                is_confirmed=True
            )
            db.session.add(booking)
        
        # Handle recurrence
        if session.recurrence_type != RecurrenceType.NONE and data.get('recurrence_end_date'):
            create_recurring_sessions(session, data.get('recurrence_pattern', {}))
        
        db.session.commit()
        
        # Schedule notifications
        schedule_session_notifications(session)
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الجلسة بنجاح',
            'session_id': session.id,
            'confirmation_code': session.confirmation_code
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@session_scheduling_bp.route('/sessions/<int:session_id>', methods=['PUT'])
@jwt_required()
@check_permission('manage_session_scheduling')
@guard_payload_size()
@log_audit('UPDATE_SESSION_SCHEDULE')
def update_session_schedule(session_id):
    """Update session schedule"""
    try:
        current_user_id = get_jwt_identity()
        session = SessionSchedule.query.get_or_404(session_id)
        data = request.get_json()
        
        # Check if session can be modified
        if session.status in [ScheduleStatus.COMPLETED, ScheduleStatus.CANCELLED]:
            return jsonify({'success': False, 'message': 'لا يمكن تعديل جلسة مكتملة أو ملغاة'}), 400
        
        # Update fields
        if 'scheduled_date' in data:
            session.scheduled_date = datetime.strptime(data['scheduled_date'], '%Y-%m-%d').date()
        if 'scheduled_start_time' in data:
            session.scheduled_start_time = datetime.strptime(data['scheduled_start_time'], '%H:%M').time()
        if 'duration_minutes' in data:
            session.duration_minutes = data['duration_minutes']
            # Recalculate end time
            start_datetime = datetime.combine(session.scheduled_date, session.scheduled_start_time)
            end_datetime = start_datetime + timedelta(minutes=session.duration_minutes)
            session.scheduled_end_time = end_datetime.time()
        
        if 'therapist_id' in data:
            session.therapist_id = data['therapist_id']
        if 'room_id' in data:
            session.room_id = data['room_id']
        if 'session_objectives' in data:
            session.session_objectives = data['session_objectives']
        if 'preparation_notes' in data:
            session.preparation_notes = data['preparation_notes']
        if 'status' in data:
            session.status = ScheduleStatus(data['status'])
        
        session.updated_by = current_user_id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث الجلسة بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@session_scheduling_bp.route('/sessions/<int:session_id>/cancel', methods=['POST'])
@jwt_required()
@check_permission('manage_session_scheduling')
@guard_payload_size()
@log_audit('CANCEL_SESSION')
def cancel_session(session_id):
    """Cancel a scheduled session"""
    try:
        current_user_id = get_jwt_identity()
        session = SessionSchedule.query.get_or_404(session_id)
        data = request.get_json()
        
        if not session.can_be_cancelled:
            return jsonify({'success': False, 'message': 'لا يمكن إلغاء هذه الجلسة'}), 400
        
        session.status = ScheduleStatus.CANCELLED
        session.cancellation_reason = data.get('cancellation_reason', '')
        session.updated_by = current_user_id
        
        # Cancel room booking
        if session.room_id:
            booking = RoomBooking.query.filter_by(session_schedule_id=session_id).first()
            if booking:
                booking.is_cancelled = True
                booking.cancellation_reason = session.cancellation_reason
        
        db.session.commit()
        
        # Send cancellation notifications
        send_cancellation_notifications(session)
        
        return jsonify({
            'success': True,
            'message': 'تم إلغاء الجلسة بنجاح',
            'data': {'session_id': session_id}
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إلغاء الجلسة: {str(e)}'
        }), 500

@session_scheduling_bp.route('/api/session-scheduling/bulk-schedule', methods=['POST'])
@jwt_required()
@check_permission('manage_session_scheduling')
@guard_payload_size()
@log_audit('BULK_SCHEDULE_SESSIONS')
def bulk_schedule_sessions():
    """جدولة مجموعة من الجلسات تلقائياً"""
    try:
        data = request.get_json()
        
        # تحويل البيانات إلى طلبات جدولة
        scheduling_requests = []
        for req_data in data.get('requests', []):
            # إنشاء قيود الجدولة
            constraints = SchedulingConstraint()
            if 'constraints' in req_data:
                constraints_data = req_data['constraints']
                constraints.preferred_times = constraints_data.get('preferred_times', [])
                constraints.excluded_times = constraints_data.get('excluded_times', [])
                constraints.max_sessions_per_day = constraints_data.get('max_sessions_per_day', 8)
                constraints.preferred_days = constraints_data.get('preferred_days', [])
            
            # إنشاء طلب الجدولة
            scheduling_request = SchedulingRequest(
                beneficiary_id=req_data['beneficiary_id'],
                program_id=req_data['program_id'],
                session_type=SessionType(req_data.get('session_type', 'individual')),
                duration_minutes=req_data.get('duration_minutes', 60),
                priority=SchedulingPriority(req_data.get('priority', 'medium')),
                preferred_therapist_id=req_data.get('preferred_therapist_id'),
                preferred_room_id=req_data.get('preferred_room_id'),
                start_date=datetime.strptime(req_data['start_date'], '%Y-%m-%d').date() if req_data.get('start_date') else None,
                end_date=datetime.strptime(req_data['end_date'], '%Y-%m-%d').date() if req_data.get('end_date') else None,
                sessions_per_week=req_data.get('sessions_per_week', 2),
                constraints=constraints
            )
            scheduling_requests.append(scheduling_request)
        
        # تشغيل محرك الجدولة التلقائية
        scheduler = AutomatedScheduler(db.session)
        results = scheduler.schedule_sessions(scheduling_requests)
        
        # حفظ الجلسات المجدولة في قاعدة البيانات
        saved_sessions = []
        for session_data in results['scheduled_sessions']:
            session = SessionSchedule(
                session_number=f"SS-{datetime.now().strftime('%Y%m%d%H%M%S')}-{len(saved_sessions)+1:03d}",
                beneficiary_id=session_data['beneficiary_id'],
                program_id=session_data['program_id'],
                therapist_id=session_data['therapist_id'],
                room_id=session_data['room_id'],
                session_date=session_data['session_date'],
                start_time=session_data['start_time'],
                end_time=session_data['end_time'],
                session_type=session_data['session_type'],
                status=SessionStatus.SCHEDULED,
                priority=SessionPriority(session_data['priority']),
                session_goals=["هدف تلقائي من الجدولة الذكية"],
                preparation_notes="تم إنشاؤها بواسطة نظام الجدولة التلقائية",
                created_by=get_jwt_identity(),
                updated_by=get_jwt_identity()
            )
            db.session.add(session)
            saved_sessions.append(session)
        
        # حفظ إحصائيات التحسين
        if saved_sessions:
            optimization_record = ScheduleOptimization(
                optimization_date=date.today(),
                algorithm_used="automated_scheduler_v1",
                input_parameters={
                    'total_requests': len(scheduling_requests),
                    'optimization_goals': ['maximize_utilization', 'minimize_conflicts']
                },
                optimization_results={
                    'scheduled_sessions': len(saved_sessions),
                    'success_rate': results['statistics']['success_rate'],
                    'optimization_score': results['optimization_score']
                },
                performance_metrics={
                    'execution_time': 'calculated_in_frontend',
                    'conflicts_resolved': len(results['conflicts']),
                    'utilization_improvement': results['optimization_score']
                },
                created_by=get_jwt_identity(),
                updated_by=get_jwt_identity()
            )
            db.session.add(optimization_record)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'تم جدولة {len(saved_sessions)} جلسة بنجاح',
            'data': {
                'scheduled_sessions': len(saved_sessions),
                'unscheduled_requests': len(results['unscheduled_requests']),
                'conflicts': len(results['conflicts']),
                'optimization_score': results['optimization_score'],
                'statistics': results['statistics'],
                'session_ids': [s.id for s in saved_sessions]
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في الجدولة التلقائية: {str(e)}'
        }), 500

@session_scheduling_bp.route('/api/session-scheduling/optimize-schedule', methods=['POST'])
@jwt_required()
@check_permission('manage_session_scheduling')
@guard_payload_size()
@log_audit('OPTIMIZE_WEEKLY_SCHEDULE')
def optimize_weekly_schedule():
    """تحسين الجدول الأسبوعي"""
    try:
        data = request.get_json()
        week_start_date = datetime.strptime(data['week_start_date'], '%Y-%m-%d').date()
        
        # تشغيل محسن الجدولة
        optimizer = SchedulingOptimizer(db.session)
        optimization_results = optimizer.optimize_weekly_schedule(week_start_date)
        
        return jsonify({
            'success': True,
            'message': 'تم تحليل الجدول وإنتاج التوصيات بنجاح',
            'data': optimization_results
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في تحسين الجدول: {str(e)}'
        }), 500

@session_scheduling_bp.route('/api/session-scheduling/scheduling-templates', methods=['GET'])
@jwt_required()
@check_permission('view_session_scheduling')
@log_audit('GET_SCHEDULING_TEMPLATES')
def get_scheduling_templates():
    """الحصول على قوالب الجدولة"""
    try:
        templates = ScheduleTemplate.query.filter_by(is_active=True).all()
        
        templates_data = []
        for template in templates:
            templates_data.append({
                'id': template.id,
                'template_name': template.template_name,
                'template_type': template.template_type.value,
                'target_program_type': template.target_program_type,
                'default_duration_minutes': template.default_duration_minutes,
                'default_room_type': template.default_room_type.value if template.default_room_type else None,
                'session_pattern': template.session_pattern,
                'template_settings': template.template_settings,
                'created_at': template.created_at.isoformat() if template.created_at else None
            })
        
        return jsonify({
            'success': True,
            'message': 'تم جلب قوالب الجدولة بنجاح',
            'data': templates_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب قوالب الجدولة: {str(e)}'
        }), 500

@session_scheduling_bp.route('/api/session-scheduling/apply-template', methods=['POST'])
@jwt_required()
@check_permission('manage_session_scheduling')
@guard_payload_size()
@log_audit('APPLY_SCHEDULING_TEMPLATE')
def apply_scheduling_template():
    """تطبيق قالب جدولة على مستفيد"""
    try:
        data = request.get_json()
        template_id = data['template_id']
        beneficiary_id = data['beneficiary_id']
        program_id = data['program_id']
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        
        # الحصول على القالب
        template = ScheduleTemplate.query.get(template_id)
        if not template:
            return jsonify({
                'success': False,
                'message': 'القالب غير موجود'
            }), 404
        
        # إنشاء طلبات جدولة بناءً على القالب
        scheduling_requests = []
        session_pattern = template.session_pattern
        sessions_per_week = session_pattern.get('sessions_per_week', 2)
        preferred_days = session_pattern.get('preferred_days', [0, 2, 4])  # الاثنين، الأربعاء، الجمعة
        preferred_times = session_pattern.get('preferred_times', ['09:00', '10:00'])
        
        # إنشاء جلسات لمدة 4 أسابيع
        for week in range(4):
            week_start = start_date + timedelta(weeks=week)
            sessions_this_week = 0
            
            for day_offset in range(7):
                if sessions_this_week >= sessions_per_week:
                    break
                
                session_date = week_start + timedelta(days=day_offset)
                if session_date.weekday() in preferred_days:
                    # إنشاء قيود الجدولة
                    constraints = SchedulingConstraint(
                        preferred_times=preferred_times,
                        max_sessions_per_day=template.template_settings.get('max_sessions_per_day', 6)
                    )
                    
                    # إنشاء طلب الجدولة
                    scheduling_request = SchedulingRequest(
                        beneficiary_id=beneficiary_id,
                        program_id=program_id,
                        session_type=SessionType.INDIVIDUAL,
                        duration_minutes=template.default_duration_minutes,
                        priority=SchedulingPriority.MEDIUM,
                        start_date=session_date,
                        end_date=session_date,
                        constraints=constraints
                    )
                    scheduling_requests.append(scheduling_request)
                    sessions_this_week += 1
        
        # تشغيل الجدولة التلقائية
        scheduler = AutomatedScheduler(db.session)
        results = scheduler.schedule_sessions(scheduling_requests)
        
        # حفظ الجلسات المجدولة
        saved_sessions = []
        for session_data in results['scheduled_sessions']:
            session = SessionSchedule(
                session_number=f"ST-{template.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{len(saved_sessions)+1:03d}",
                beneficiary_id=session_data['beneficiary_id'],
                program_id=session_data['program_id'],
                therapist_id=session_data['therapist_id'],
                room_id=session_data['room_id'],
                session_date=session_data['session_date'],
                start_time=session_data['start_time'],
                end_time=session_data['end_time'],
                session_type=session_data['session_type'],
                status=SessionStatus.SCHEDULED,
                priority=SessionPriority.MEDIUM,
                session_goals=[f"جلسة من القالب: {template.template_name}"],
                preparation_notes=f"تم إنشاؤها من القالب: {template.template_name}",
                created_by=get_jwt_identity(),
                updated_by=get_jwt_identity()
            )
            db.session.add(session)
            saved_sessions.append(session)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'تم تطبيق القالب وجدولة {len(saved_sessions)} جلسة',
            'data': {
                'template_name': template.template_name,
                'scheduled_sessions': len(saved_sessions),
                'total_requests': len(scheduling_requests),
                'success_rate': results['statistics']['success_rate']
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في تطبيق القالب: {str(e)}'
        }), 500   

# Calendar Integration
@session_scheduling_bp.route('/calendar/events', methods=['GET'])
@jwt_required()
@check_permission('view_session_scheduling')
@log_audit('GET_CALENDAR_EVENTS')
def get_calendar_events():
    """Get calendar events for calendar view"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        therapist_id = request.args.get('therapist_id', type=int)
        
        if not start_date or not end_date:
            return jsonify({'success': False, 'message': 'تواريخ البداية والنهاية مطلوبة'}), 400
        
        start_dt = datetime.strptime(start_date, '%Y-%m-%d')
        end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        
        # Get sessions as calendar events
        query = SessionSchedule.query.options(
            joinedload(SessionSchedule.beneficiary),
            joinedload(SessionSchedule.program),
            joinedload(SessionSchedule.therapist),
            joinedload(SessionSchedule.room)
        ).filter(
            SessionSchedule.scheduled_date >= start_dt.date(),
            SessionSchedule.scheduled_date <= end_dt.date()
        )
        
        if therapist_id:
            query = query.filter(SessionSchedule.therapist_id == therapist_id)
        
        sessions = query.all()
        
        events = []
        for session in sessions:
            start_datetime = datetime.combine(session.scheduled_date, session.scheduled_start_time)
            end_datetime = datetime.combine(session.scheduled_date, session.scheduled_end_time)
            
            events.append({
                'id': f"session_{session.id}",
                'title': f"{session.beneficiary.first_name if session.beneficiary else 'مستفيد'} - {session.program.name if session.program else 'برنامج'}",
                'start': start_datetime.isoformat(),
                'end': end_datetime.isoformat(),
                'backgroundColor': get_status_color(session.status),
                'borderColor': get_status_color(session.status),
                'textColor': '#ffffff',
                'extendedProps': {
                    'type': 'session',
                    'session_id': session.id,
                    'beneficiary_name': f"{session.beneficiary.first_name} {session.beneficiary.last_name}" if session.beneficiary else '',
                    'program_name': session.program.name if session.program else '',
                    'therapist_name': session.therapist.username if session.therapist else '',
                    'room_name': session.room.name if session.room else '',
                    'status': session.status.value if session.status else '',
                    'confirmation_code': session.confirmation_code
                }
            })
        
        return jsonify({
            'success': True,
            'events': events
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Helper functions
def check_scheduling_conflicts(therapist_id, room_id, scheduled_date, start_time, end_time, beneficiary_id, exclude_session_id=None):
    """Check for scheduling conflicts"""
    conflicts = []
    
    # Check therapist availability
    therapist_conflicts = SessionSchedule.query.filter(
        SessionSchedule.therapist_id == therapist_id,
        SessionSchedule.scheduled_date == scheduled_date,
        SessionSchedule.status.in_([ScheduleStatus.DRAFT, ScheduleStatus.CONFIRMED, ScheduleStatus.IN_PROGRESS]),
        or_(
            and_(SessionSchedule.scheduled_start_time <= start_time, SessionSchedule.scheduled_end_time > start_time),
            and_(SessionSchedule.scheduled_start_time < end_time, SessionSchedule.scheduled_end_time >= end_time),
            and_(SessionSchedule.scheduled_start_time >= start_time, SessionSchedule.scheduled_end_time <= end_time)
        )
    )
    
    if exclude_session_id:
        therapist_conflicts = therapist_conflicts.filter(SessionSchedule.id != exclude_session_id)
    
    if therapist_conflicts.first():
        conflicts.append({
            'type': 'therapist_conflict',
            'message': 'المعالج غير متاح في هذا الوقت'
        })
    
    # Check room availability
    if room_id:
        room_conflicts = SessionSchedule.query.filter(
            SessionSchedule.room_id == room_id,
            SessionSchedule.scheduled_date == scheduled_date,
            SessionSchedule.status.in_([ScheduleStatus.DRAFT, ScheduleStatus.CONFIRMED, ScheduleStatus.IN_PROGRESS]),
            or_(
                and_(SessionSchedule.scheduled_start_time <= start_time, SessionSchedule.scheduled_end_time > start_time),
                and_(SessionSchedule.scheduled_start_time < end_time, SessionSchedule.scheduled_end_time >= end_time),
                and_(SessionSchedule.scheduled_start_time >= start_time, SessionSchedule.scheduled_end_time <= end_time)
            )
        )
        
        if exclude_session_id:
            room_conflicts = room_conflicts.filter(SessionSchedule.id != exclude_session_id)
        
        if room_conflicts.first():
            conflicts.append({
                'type': 'room_conflict',
                'message': 'الغرفة محجوزة في هذا الوقت'
            })
    
    return conflicts

def generate_confirmation_code():
    """Generate a unique confirmation code"""
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def create_recurring_sessions(parent_session, recurrence_pattern):
    """Create recurring sessions based on pattern"""
    # Implementation for creating recurring sessions
    pass

def schedule_session_notifications(session):
    """Schedule notifications for a session"""
    # Implementation for scheduling notifications
    pass

def send_cancellation_notifications(session):
    """Send cancellation notifications"""
    # Implementation for sending cancellation notifications
    pass

def get_status_color(status):
    """Get color for session status"""
    colors = {
        ScheduleStatus.DRAFT: '#6c757d',
        ScheduleStatus.CONFIRMED: '#007bff',
        ScheduleStatus.IN_PROGRESS: '#ffc107',
        ScheduleStatus.COMPLETED: '#28a745',
        ScheduleStatus.CANCELLED: '#dc3545',
        ScheduleStatus.RESCHEDULED: '#17a2b8',
        ScheduleStatus.NO_SHOW: '#fd7e14'
    }
    return colors.get(status, '#6c757d')
