#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API endpoints لنظام إدارة المواعيد والتقويم
Appointments and Calendar Management API
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta, time
from sqlalchemy import and_, or_, func, text
from sqlalchemy.exc import IntegrityError
from models import db, User
from appointments_calendar_models import (
    Appointment, AppointmentReminder, AppointmentConflict, Calendar, 
    CalendarSettings, SpecialEvent, AppointmentType, AppointmentStatus,
    RecurrenceType, ReminderType, Priority
)
import uuid
import json

# إنشاء Blueprint
appointments_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')

# مساعد لتوليد رقم الموعد
def generate_appointment_number():
    """توليد رقم موعد فريد"""
    return f"APT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

# مساعد للتحقق من التعارضات
def check_appointment_conflicts(start_datetime, end_datetime, participants, appointment_id=None):
    """التحقق من تعارض المواعيد"""
    conflicts = []
    
    # التحقق من تعارض المشاركين
    for participant_id in participants:
        query = db.session.query(Appointment).filter(
            and_(
                Appointment.id != appointment_id if appointment_id else True,
                or_(
                    Appointment.organizer_id == participant_id,
                    Appointment.therapist_id == participant_id,
                    Appointment.participants.contains([participant_id])
                ),
                Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]),
                or_(
                    and_(Appointment.start_datetime <= start_datetime, Appointment.end_datetime > start_datetime),
                    and_(Appointment.start_datetime < end_datetime, Appointment.end_datetime >= end_datetime),
                    and_(Appointment.start_datetime >= start_datetime, Appointment.end_datetime <= end_datetime)
                )
            )
        )
        
        conflicting_appointments = query.all()
        for conflict in conflicting_appointments:
            conflicts.append({
                'type': 'participant',
                'participant_id': participant_id,
                'conflicting_appointment': conflict.id,
                'conflicting_title': conflict.title,
                'conflict_start': conflict.start_datetime.isoformat(),
                'conflict_end': conflict.end_datetime.isoformat()
            })
    
    return conflicts

# إنشاء موعد جديد
@appointments_bp.route('/', methods=['POST'])
@jwt_required()
def create_appointment():
    """إنشاء موعد جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['title', 'start_datetime', 'end_datetime', 'appointment_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'الحقل {field} مطلوب'}), 400
        
        # تحويل التواريخ
        start_datetime = datetime.fromisoformat(data['start_datetime'].replace('Z', '+00:00'))
        end_datetime = datetime.fromisoformat(data['end_datetime'].replace('Z', '+00:00'))
        
        # التحقق من صحة التوقيت
        if start_datetime >= end_datetime:
            return jsonify({'error': 'وقت البداية يجب أن يكون قبل وقت النهاية'}), 400
        
        # حساب المدة
        duration_minutes = int((end_datetime - start_datetime).total_seconds() / 60)
        
        # إعداد المشاركين
        participants = data.get('participants', [])
        if data.get('therapist_id'):
            participants.append(data['therapist_id'])
        participants.append(current_user_id)  # إضافة المنظم
        participants = list(set(participants))  # إزالة التكرار
        
        # التحقق من التعارضات
        conflicts = check_appointment_conflicts(start_datetime, end_datetime, participants)
        if conflicts and not data.get('ignore_conflicts', False):
            return jsonify({
                'error': 'يوجد تعارض في المواعيد',
                'conflicts': conflicts
            }), 409
        
        # إنشاء الموعد
        appointment = Appointment(
            appointment_number=generate_appointment_number(),
            title=data['title'],
            description=data.get('description'),
            appointment_type=AppointmentType(data['appointment_type']),
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            duration_minutes=duration_minutes,
            timezone=data.get('timezone', 'Asia/Riyadh'),
            organizer_id=current_user_id,
            participants=participants,
            beneficiary_id=data.get('beneficiary_id'),
            therapist_id=data.get('therapist_id'),
            location=data.get('location'),
            room_number=data.get('room_number'),
            virtual_meeting_link=data.get('virtual_meeting_link'),
            priority=Priority(data.get('priority', 'medium')),
            notes=data.get('notes'),
            preparation_instructions=data.get('preparation_instructions'),
            materials_needed=data.get('materials_needed', []),
            cost=data.get('cost'),
            created_by=current_user_id
        )
        
        # معالجة التكرار
        if data.get('is_recurring', False):
            appointment.is_recurring = True
            appointment.recurrence_type = RecurrenceType(data.get('recurrence_type', 'weekly'))
            appointment.recurrence_interval = data.get('recurrence_interval', 1)
            appointment.recurrence_end_date = datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d').date() if data.get('recurrence_end_date') else None
            appointment.recurrence_count = data.get('recurrence_count')
        
        db.session.add(appointment)
        db.session.flush()  # للحصول على ID
        
        # إنشاء المواعيد المتكررة
        if appointment.is_recurring:
            create_recurring_appointments(appointment, data)
        
        # إنشاء التذكيرات
        if data.get('reminders'):
            create_appointment_reminders(appointment.id, data['reminders'], current_user_id)
        
        db.session.commit()
        
        return jsonify({
            'message': 'تم إنشاء الموعد بنجاح',
            'appointment': {
                'id': appointment.id,
                'appointment_number': appointment.appointment_number,
                'title': appointment.title,
                'start_datetime': appointment.start_datetime.isoformat(),
                'end_datetime': appointment.end_datetime.isoformat(),
                'status': appointment.status.value
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في إنشاء الموعد: {str(e)}'}), 500

# إنشاء المواعيد المتكررة
def create_recurring_appointments(parent_appointment, data):
    """إنشاء المواعيد المتكررة"""
    current_date = parent_appointment.start_datetime
    end_date = parent_appointment.recurrence_end_date
    count = parent_appointment.recurrence_count or 50  # حد أقصى 50 تكرار
    
    created_count = 0
    while created_count < count:
        # حساب التاريخ التالي
        if parent_appointment.recurrence_type == RecurrenceType.DAILY:
            current_date += timedelta(days=parent_appointment.recurrence_interval)
        elif parent_appointment.recurrence_type == RecurrenceType.WEEKLY:
            current_date += timedelta(weeks=parent_appointment.recurrence_interval)
        elif parent_appointment.recurrence_type == RecurrenceType.MONTHLY:
            # إضافة شهر (تقريبي)
            current_date += timedelta(days=30 * parent_appointment.recurrence_interval)
        else:
            break
        
        # التحقق من تاريخ الانتهاء
        if end_date and current_date.date() > end_date:
            break
        
        # إنشاء الموعد المتكرر
        duration = parent_appointment.end_datetime - parent_appointment.start_datetime
        recurring_appointment = Appointment(
            appointment_number=generate_appointment_number(),
            title=parent_appointment.title,
            description=parent_appointment.description,
            appointment_type=parent_appointment.appointment_type,
            start_datetime=current_date,
            end_datetime=current_date + duration,
            duration_minutes=parent_appointment.duration_minutes,
            timezone=parent_appointment.timezone,
            organizer_id=parent_appointment.organizer_id,
            participants=parent_appointment.participants,
            beneficiary_id=parent_appointment.beneficiary_id,
            therapist_id=parent_appointment.therapist_id,
            location=parent_appointment.location,
            room_number=parent_appointment.room_number,
            virtual_meeting_link=parent_appointment.virtual_meeting_link,
            priority=parent_appointment.priority,
            notes=parent_appointment.notes,
            preparation_instructions=parent_appointment.preparation_instructions,
            materials_needed=parent_appointment.materials_needed,
            cost=parent_appointment.cost,
            parent_appointment_id=parent_appointment.id,
            created_by=parent_appointment.created_by
        )
        
        db.session.add(recurring_appointment)
        created_count += 1

# إنشاء تذكيرات الموعد
def create_appointment_reminders(appointment_id, reminders_data, user_id):
    """إنشاء تذكيرات الموعد"""
    appointment = Appointment.query.get(appointment_id)
    
    for reminder_data in reminders_data:
        reminder_datetime = appointment.start_datetime - timedelta(minutes=reminder_data['minutes_before'])
        
        reminder = AppointmentReminder(
            appointment_id=appointment_id,
            reminder_type=ReminderType(reminder_data['type']),
            remind_before_minutes=reminder_data['minutes_before'],
            scheduled_datetime=reminder_datetime,
            recipient_id=reminder_data.get('recipient_id', user_id),
            recipient_contact=reminder_data.get('contact'),
            subject=reminder_data.get('subject', f'تذكير بموعد: {appointment.title}'),
            message=reminder_data.get('message'),
            created_by=user_id
        )
        
        db.session.add(reminder)

# الحصول على المواعيد
@appointments_bp.route('/', methods=['GET'])
@jwt_required()
def get_appointments():
    """الحصول على المواعيد"""
    try:
        current_user_id = get_jwt_identity()
        
        # معاملات الاستعلام
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')
        appointment_type = request.args.get('type')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # بناء الاستعلام
        query = Appointment.query.filter(
            or_(
                Appointment.organizer_id == current_user_id,
                Appointment.therapist_id == current_user_id,
                Appointment.participants.contains([current_user_id])
            )
        )
        
        # تطبيق الفلاتر
        if start_date:
            query = query.filter(Appointment.start_datetime >= datetime.strptime(start_date, '%Y-%m-%d'))
        
        if end_date:
            query = query.filter(Appointment.end_datetime <= datetime.strptime(end_date + ' 23:59:59', '%Y-%m-%d %H:%M:%S'))
        
        if status:
            query = query.filter(Appointment.status == AppointmentStatus(status))
        
        if appointment_type:
            query = query.filter(Appointment.appointment_type == AppointmentType(appointment_type))
        
        # ترتيب وتقسيم الصفحات
        query = query.order_by(Appointment.start_datetime.desc())
        appointments = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # تحضير البيانات
        appointments_data = []
        for appointment in appointments.items:
            organizer = User.query.get(appointment.organizer_id)
            therapist = User.query.get(appointment.therapist_id) if appointment.therapist_id else None
            
            appointments_data.append({
                'id': appointment.id,
                'appointment_number': appointment.appointment_number,
                'title': appointment.title,
                'description': appointment.description,
                'type': appointment.appointment_type.value,
                'start_datetime': appointment.start_datetime.isoformat(),
                'end_datetime': appointment.end_datetime.isoformat(),
                'duration_minutes': appointment.duration_minutes,
                'status': appointment.status.value,
                'priority': appointment.priority.value,
                'location': appointment.location,
                'room_number': appointment.room_number,
                'organizer': {
                    'id': organizer.id,
                    'name': organizer.name
                } if organizer else None,
                'therapist': {
                    'id': therapist.id,
                    'name': therapist.name
                } if therapist else None,
                'beneficiary_id': appointment.beneficiary_id,
                'participants': appointment.participants,
                'notes': appointment.notes,
                'cost': appointment.cost,
                'is_recurring': appointment.is_recurring,
                'created_at': appointment.created_at.isoformat()
            })
        
        return jsonify({
            'appointments': appointments_data,
            'pagination': {
                'page': appointments.page,
                'pages': appointments.pages,
                'per_page': appointments.per_page,
                'total': appointments.total,
                'has_next': appointments.has_next,
                'has_prev': appointments.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب المواعيد: {str(e)}'}), 500

# الحصول على موعد محدد
@appointments_bp.route('/<int:appointment_id>', methods=['GET'])
@jwt_required()
def get_appointment(appointment_id):
    """الحصول على موعد محدد"""
    try:
        current_user_id = get_jwt_identity()
        
        appointment = Appointment.query.filter(
            and_(
                Appointment.id == appointment_id,
                or_(
                    Appointment.organizer_id == current_user_id,
                    Appointment.therapist_id == current_user_id,
                    Appointment.participants.contains([current_user_id])
                )
            )
        ).first()
        
        if not appointment:
            return jsonify({'error': 'الموعد غير موجود'}), 404
        
        # جلب التذكيرات
        reminders = AppointmentReminder.query.filter_by(appointment_id=appointment_id).all()
        reminders_data = [{
            'id': reminder.id,
            'type': reminder.reminder_type.value,
            'minutes_before': reminder.remind_before_minutes,
            'scheduled_datetime': reminder.scheduled_datetime.isoformat(),
            'is_sent': reminder.is_sent,
            'recipient_id': reminder.recipient_id
        } for reminder in reminders]
        
        # جلب التعارضات
        conflicts = AppointmentConflict.query.filter_by(appointment_id=appointment_id, is_resolved=False).all()
        conflicts_data = [{
            'id': conflict.id,
            'type': conflict.conflict_type,
            'description': conflict.conflict_description,
            'severity': conflict.severity,
            'conflicting_appointment_id': conflict.conflicting_appointment_id
        } for conflict in conflicts]
        
        organizer = User.query.get(appointment.organizer_id)
        therapist = User.query.get(appointment.therapist_id) if appointment.therapist_id else None
        
        appointment_data = {
            'id': appointment.id,
            'appointment_number': appointment.appointment_number,
            'title': appointment.title,
            'description': appointment.description,
            'type': appointment.appointment_type.value,
            'start_datetime': appointment.start_datetime.isoformat(),
            'end_datetime': appointment.end_datetime.isoformat(),
            'duration_minutes': appointment.duration_minutes,
            'timezone': appointment.timezone,
            'status': appointment.status.value,
            'priority': appointment.priority.value,
            'location': appointment.location,
            'room_number': appointment.room_number,
            'virtual_meeting_link': appointment.virtual_meeting_link,
            'organizer': {
                'id': organizer.id,
                'name': organizer.name
            } if organizer else None,
            'therapist': {
                'id': therapist.id,
                'name': therapist.name
            } if therapist else None,
            'beneficiary_id': appointment.beneficiary_id,
            'participants': appointment.participants,
            'notes': appointment.notes,
            'preparation_instructions': appointment.preparation_instructions,
            'materials_needed': appointment.materials_needed,
            'cost': appointment.cost,
            'is_recurring': appointment.is_recurring,
            'recurrence_type': appointment.recurrence_type.value if appointment.recurrence_type else None,
            'reminders': reminders_data,
            'conflicts': conflicts_data,
            'created_at': appointment.created_at.isoformat(),
            'updated_at': appointment.updated_at.isoformat()
        }
        
        return jsonify({'appointment': appointment_data}), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب الموعد: {str(e)}'}), 500

# تحديث موعد
@appointments_bp.route('/<int:appointment_id>', methods=['PUT'])
@jwt_required()
def update_appointment(appointment_id):
    """تحديث موعد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        appointment = Appointment.query.filter(
            and_(
                Appointment.id == appointment_id,
                or_(
                    Appointment.organizer_id == current_user_id,
                    Appointment.therapist_id == current_user_id
                )
            )
        ).first()
        
        if not appointment:
            return jsonify({'error': 'الموعد غير موجود أو ليس لديك صلاحية تعديله'}), 404
        
        # تحديث البيانات
        if 'title' in data:
            appointment.title = data['title']
        if 'description' in data:
            appointment.description = data['description']
        if 'start_datetime' in data:
            appointment.start_datetime = datetime.fromisoformat(data['start_datetime'].replace('Z', '+00:00'))
        if 'end_datetime' in data:
            appointment.end_datetime = datetime.fromisoformat(data['end_datetime'].replace('Z', '+00:00'))
        if 'location' in data:
            appointment.location = data['location']
        if 'room_number' in data:
            appointment.room_number = data['room_number']
        if 'notes' in data:
            appointment.notes = data['notes']
        if 'status' in data:
            appointment.status = AppointmentStatus(data['status'])
        if 'priority' in data:
            appointment.priority = Priority(data['priority'])
        
        # إعادة حساب المدة إذا تغير التوقيت
        if 'start_datetime' in data or 'end_datetime' in data:
            appointment.duration_minutes = int((appointment.end_datetime - appointment.start_datetime).total_seconds() / 60)
        
        appointment.updated_by = current_user_id
        appointment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'تم تحديث الموعد بنجاح'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في تحديث الموعد: {str(e)}'}), 500

# إلغاء موعد
@appointments_bp.route('/<int:appointment_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_appointment(appointment_id):
    """إلغاء موعد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        appointment = Appointment.query.filter(
            and_(
                Appointment.id == appointment_id,
                or_(
                    Appointment.organizer_id == current_user_id,
                    Appointment.therapist_id == current_user_id
                )
            )
        ).first()
        
        if not appointment:
            return jsonify({'error': 'الموعد غير موجود أو ليس لديك صلاحية إلغاؤه'}), 404
        
        appointment.status = AppointmentStatus.CANCELLED
        appointment.cancellation_reason = data.get('reason', 'لم يتم تحديد السبب')
        appointment.cancelled_at = datetime.utcnow()
        appointment.cancelled_by = current_user_id
        appointment.updated_by = current_user_id
        appointment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'تم إلغاء الموعد بنجاح'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في إلغاء الموعد: {str(e)}'}), 500

# إحصائيات المواعيد
@appointments_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_appointments_stats():
    """إحصائيات المواعيد"""
    try:
        current_user_id = get_jwt_identity()
        
        # إحصائيات عامة
        total_appointments = Appointment.query.filter(
            or_(
                Appointment.organizer_id == current_user_id,
                Appointment.therapist_id == current_user_id,
                Appointment.participants.contains([current_user_id])
            )
        ).count()
        
        # المواعيد اليوم
        today = date.today()
        today_appointments = Appointment.query.filter(
            and_(
                func.date(Appointment.start_datetime) == today,
                or_(
                    Appointment.organizer_id == current_user_id,
                    Appointment.therapist_id == current_user_id,
                    Appointment.participants.contains([current_user_id])
                )
            )
        ).count()
        
        # المواعيد القادمة
        upcoming_appointments = Appointment.query.filter(
            and_(
                Appointment.start_datetime > datetime.utcnow(),
                Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
                or_(
                    Appointment.organizer_id == current_user_id,
                    Appointment.therapist_id == current_user_id,
                    Appointment.participants.contains([current_user_id])
                )
            )
        ).count()
        
        # المواعيد المكتملة هذا الشهر
        start_of_month = date.today().replace(day=1)
        completed_this_month = Appointment.query.filter(
            and_(
                Appointment.start_datetime >= start_of_month,
                Appointment.status == AppointmentStatus.COMPLETED,
                or_(
                    Appointment.organizer_id == current_user_id,
                    Appointment.therapist_id == current_user_id,
                    Appointment.participants.contains([current_user_id])
                )
            )
        ).count()
        
        # التعارضات غير المحلولة
        unresolved_conflicts = AppointmentConflict.query.join(Appointment).filter(
            and_(
                AppointmentConflict.is_resolved == False,
                or_(
                    Appointment.organizer_id == current_user_id,
                    Appointment.therapist_id == current_user_id,
                    Appointment.participants.contains([current_user_id])
                )
            )
        ).count()
        
        return jsonify({
            'stats': {
                'total_appointments': total_appointments,
                'today_appointments': today_appointments,
                'upcoming_appointments': upcoming_appointments,
                'completed_this_month': completed_this_month,
                'unresolved_conflicts': unresolved_conflicts
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب الإحصائيات: {str(e)}'}), 500

# التحقق من التوفر
@appointments_bp.route('/availability', methods=['GET'])
@jwt_required()
def check_availability():
    """التحقق من التوفر"""
    try:
        current_user_id = get_jwt_identity()
        
        # معاملات الاستعلام
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        user_id = request.args.get('user_id', current_user_id)
        
        if not start_date or not end_date:
            return jsonify({'error': 'تاريخ البداية والنهاية مطلوبان'}), 400
        
        start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
        end_datetime = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        
        # جلب المواعيد المحجوزة
        busy_slots = Appointment.query.filter(
            and_(
                Appointment.start_datetime >= start_datetime,
                Appointment.end_datetime <= end_datetime,
                Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]),
                or_(
                    Appointment.organizer_id == user_id,
                    Appointment.therapist_id == user_id,
                    Appointment.participants.contains([user_id])
                )
            )
        ).all()
        
        busy_slots_data = [{
            'start': slot.start_datetime.isoformat(),
            'end': slot.end_datetime.isoformat(),
            'title': slot.title,
            'type': slot.appointment_type.value
        } for slot in busy_slots]
        
        return jsonify({
            'busy_slots': busy_slots_data,
            'available': len(busy_slots_data) == 0
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في التحقق من التوفر: {str(e)}'}), 500
