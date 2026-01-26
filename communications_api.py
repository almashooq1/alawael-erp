from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User
from communications_models import (
    CommunicationChannel, MessageTemplate, CommunicationMessage,
    CommunicationCampaign, VoiceCall, VideoConference, ConferenceParticipant,
    PushNotification, CommunicationStats, CommunicationPreference,
    generate_message_id, generate_call_id, generate_conference_id, generate_notification_id
)
from datetime import datetime, timedelta
import json
import requests
from functools import wraps
from auth_rbac_decorator import (
    check_permission,
    guard_payload_size,
    validate_json,
    log_audit
)

communications_bp = Blueprint('communications', __name__)

# ==================== SMS API ====================

@communications_bp.route('/api/sms/send', methods=['POST'])
@jwt_required()
@check_permission('send_sms')
@guard_payload_size()
@validate_json('recipient_phone', 'message')
@log_audit('SEND_SMS')
def send_sms():
    """إرسال رسالة نصية"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['recipient_phone', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} مطلوب'}), 400
        
        # الحصول على قناة SMS
        sms_channel = CommunicationChannel.query.filter_by(
            channel_type='text', is_active=True
        ).first()
        
        if not sms_channel:
            return jsonify({'success': False, 'message': 'قناة SMS غير متاحة'}), 400
        
        # إنشاء الرسالة
        message = CommunicationMessage(
            message_id=generate_message_id(),
            channel_id=sms_channel.id,
            sender_id=user_id,
            recipient_type=data.get('recipient_type', 'external'),
            recipient_id=data.get('recipient_id'),
            recipient_contact=data['recipient_phone'],
            recipient_name=data.get('recipient_name'),
            content=data['message'],
            priority=data.get('priority', 'normal'),
            scheduled_at=datetime.utcnow() if not data.get('schedule_time') else datetime.fromisoformat(data['schedule_time'])
        )
        
        db.session.add(message)
        db.session.commit()
        
        # إرسال الرسالة (محاكاة)
        success = simulate_sms_send(message)
        
        if success:
            message.status = 'sent'
            message.sent_at = datetime.utcnow()
        else:
            message.status = 'failed'
            message.error_message = 'فشل في الإرسال'
        
        db.session.commit()
        
        return jsonify({
            'success': success,
            'message': 'تم إرسال الرسالة بنجاح' if success else 'فشل في إرسال الرسالة',
            'message_id': message.message_id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@communications_bp.route('/api/sms/messages', methods=['GET'])
@jwt_required()
@check_permission('view_communications')
@log_audit('LIST_SMS_MESSAGES')
def get_sms_messages():
    """استرجاع رسائل SMS"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status', '')
        
        # الحصول على قناة SMS
        sms_channel = CommunicationChannel.query.filter_by(channel_type='text').first()
        if not sms_channel:
            return jsonify({'success': False, 'message': 'قناة SMS غير موجودة'}), 404
        
        query = CommunicationMessage.query.filter_by(channel_id=sms_channel.id)
        
        if status:
            query = query.filter(CommunicationMessage.status == status)
        
        messages = query.order_by(CommunicationMessage.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'messages': [{
                'id': msg.id,
                'message_id': msg.message_id,
                'recipient_contact': msg.recipient_contact,
                'recipient_name': msg.recipient_name,
                'content': msg.content,
                'status': msg.status,
                'sent_at': msg.sent_at.isoformat() if msg.sent_at else None,
                'created_at': msg.created_at.isoformat()
            } for msg in messages.items],
            'pagination': {
                'page': messages.page,
                'pages': messages.pages,
                'per_page': messages.per_page,
                'total': messages.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Email API ====================

@communications_bp.route('/api/email/send', methods=['POST'])
@jwt_required()
@check_permission('send_email')
@guard_payload_size()
@validate_json('recipient_email', 'subject', 'content')
@log_audit('SEND_EMAIL')
def send_email():
    """إرسال بريد إلكتروني"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['recipient_email', 'subject', 'content']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} مطلوب'}), 400
        
        # الحصول على قناة البريد الإلكتروني
        email_channel = CommunicationChannel.query.filter_by(
            channel_type='email', is_active=True
        ).first()
        
        if not email_channel:
            return jsonify({'success': False, 'message': 'قناة البريد الإلكتروني غير متاحة'}), 400
        
        # إنشاء الرسالة
        message = CommunicationMessage(
            message_id=generate_message_id(),
            channel_id=email_channel.id,
            sender_id=user_id,
            recipient_type=data.get('recipient_type', 'external'),
            recipient_id=data.get('recipient_id'),
            recipient_contact=data['recipient_email'],
            recipient_name=data.get('recipient_name'),
            subject=data['subject'],
            content=data['content'],
            html_content=data.get('html_content'),
            attachments=json.dumps(data.get('attachments', [])),
            priority=data.get('priority', 'normal'),
            scheduled_at=datetime.utcnow() if not data.get('schedule_time') else datetime.fromisoformat(data['schedule_time'])
        )
        
        db.session.add(message)
        db.session.commit()
        
        # إرسال البريد الإلكتروني (محاكاة)
        success = simulate_email_send(message)
        
        if success:
            message.status = 'sent'
            message.sent_at = datetime.utcnow()
        else:
            message.status = 'failed'
            message.error_message = 'فشل في الإرسال'
        
        db.session.commit()
        
        return jsonify({
            'success': success,
            'message': 'تم إرسال البريد الإلكتروني بنجاح' if success else 'فشل في إرسال البريد الإلكتروني',
            'message_id': message.message_id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Push Notifications API ====================

@communications_bp.route('/api/notifications/send', methods=['POST'])
@jwt_required()
@check_permission('access_communications')
@log_audit('SEND_PUSH_NOTIFICATION')
def send_push_notification():
    """إرسال إشعار تفاعلي"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['title', 'body', 'recipient_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} مطلوب'}), 400
        
        # إنشاء الإشعار
        notification = PushNotification(
            notification_id=generate_notification_id(),
            title=data['title'],
            body=data['body'],
            icon=data.get('icon'),
            image=data.get('image'),
            recipient_type=data['recipient_type'],
            recipient_id=data.get('recipient_id'),
            device_tokens=json.dumps(data.get('device_tokens', [])),
            notification_type=data.get('notification_type', 'general'),
            category=data.get('category'),
            priority=data.get('priority', 'normal'),
            action_url=data.get('action_url'),
            actions=json.dumps(data.get('actions', [])),
            scheduled_at=datetime.utcnow() if not data.get('schedule_time') else datetime.fromisoformat(data['schedule_time']),
            sent_by=user_id
        )
        
        db.session.add(notification)
        db.session.commit()
        
        # إرسال الإشعار (محاكاة)
        success = simulate_push_notification_send(notification)
        
        if success:
            notification.status = 'sent'
            notification.sent_at = datetime.utcnow()
        else:
            notification.status = 'failed'
            notification.error_message = 'فشل في الإرسال'
        
        db.session.commit()
        
        return jsonify({
            'success': success,
            'message': 'تم إرسال الإشعار بنجاح' if success else 'فشل في إرسال الإشعار',
            'notification_id': notification.notification_id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Voice Calls API ====================

@communications_bp.route('/api/calls/initiate', methods=['POST'])
@jwt_required()
@check_permission('manage_communications')
@guard_payload_size()
@log_audit('INITIATE_VOICE_CALL')
def initiate_voice_call():
    """بدء مكالمة صوتية"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        if not data.get('recipient_number'):
            return jsonify({'success': False, 'message': 'رقم المستقبل مطلوب'}), 400
        
        # إنشاء المكالمة
        call = VoiceCall(
            call_id=generate_call_id(),
            caller_id=user_id,
            caller_number=data.get('caller_number'),
            recipient_number=data['recipient_number'],
            recipient_name=data.get('recipient_name'),
            call_type=data.get('call_type', 'outbound'),
            call_purpose=data.get('call_purpose'),
            is_recorded=data.get('is_recorded', False)
        )
        
        db.session.add(call)
        db.session.commit()
        
        # بدء المكالمة (محاكاة)
        success = simulate_voice_call_initiate(call)
        
        if success:
            call.status = 'ringing'
        else:
            call.status = 'failed'
        
        db.session.commit()
        
        return jsonify({
            'success': success,
            'message': 'تم بدء المكالمة بنجاح' if success else 'فشل في بدء المكالمة',
            'call_id': call.call_id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@communications_bp.route('/api/calls/<call_id>/end', methods=['POST'])
@jwt_required()
@check_permission('manage_communications')
@guard_payload_size()
@log_audit('END_VOICE_CALL')
def end_voice_call(call_id):
    """إنهاء مكالمة صوتية"""
    try:
        call = VoiceCall.query.filter_by(call_id=call_id).first()
        if not call:
            return jsonify({'success': False, 'message': 'المكالمة غير موجودة'}), 404
        
        # إنهاء المكالمة
        call.status = 'completed'
        call.ended_at = datetime.utcnow()
        
        if call.answered_at:
            call.duration_seconds = int((call.ended_at - call.answered_at).total_seconds())
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنهاء المكالمة بنجاح',
            'duration_seconds': call.duration_seconds
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Video Conference API ====================

@communications_bp.route('/api/conferences/create', methods=['POST'])
@jwt_required()
@check_permission('manage_communications')
@guard_payload_size()
@log_audit('CREATE_VIDEO_CONFERENCE')
def create_video_conference():
    """إنشاء مؤتمر فيديو"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['title', 'scheduled_start', 'scheduled_end']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} مطلوب'}), 400
        
        # إنشاء المؤتمر
        conference = VideoConference(
            conference_id=generate_conference_id(),
            title=data['title'],
            description=data.get('description'),
            conference_type=data.get('conference_type', 'meeting'),
            host_id=user_id,
            max_participants=data.get('max_participants', 10),
            scheduled_start=datetime.fromisoformat(data['scheduled_start']),
            scheduled_end=datetime.fromisoformat(data['scheduled_end']),
            timezone=data.get('timezone', 'Asia/Riyadh'),
            is_recording_enabled=data.get('is_recording_enabled', False),
            is_waiting_room_enabled=data.get('is_waiting_room_enabled', True),
            require_password=data.get('require_password', False),
            meeting_password=data.get('meeting_password'),
            provider_name=data.get('provider_name', 'Internal')
        )
        
        # توليد روابط الانضمام (محاكاة)
        conference.join_url = f"https://meet.awail.com/join/{conference.conference_id}"
        conference.host_url = f"https://meet.awail.com/host/{conference.conference_id}"
        
        db.session.add(conference)
        db.session.commit()
        
        # إضافة المشاركين
        participants_data = data.get('participants', [])
        for participant_data in participants_data:
            participant = ConferenceParticipant(
                conference_id=conference.id,
                participant_type=participant_data.get('participant_type', 'external'),
                participant_id=participant_data.get('participant_id'),
                participant_name=participant_data['participant_name'],
                participant_email=participant_data.get('participant_email'),
                participant_phone=participant_data.get('participant_phone'),
                can_share_screen=participant_data.get('can_share_screen', False),
                is_moderator=participant_data.get('is_moderator', False)
            )
            db.session.add(participant)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء المؤتمر بنجاح',
            'conference_id': conference.conference_id,
            'join_url': conference.join_url,
            'host_url': conference.host_url
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Templates API ====================

@communications_bp.route('/api/templates', methods=['GET'])
@jwt_required()
@check_permission('view_communications')
@log_audit('GET_MESSAGE_TEMPLATES')
def get_message_templates():
    """استرجاع قوالب الرسائل"""
    try:
        channel_type = request.args.get('channel_type', '')
        category = request.args.get('category', '')
        
        query = MessageTemplate.query.filter_by(is_active=True)
        
        if channel_type:
            channel = CommunicationChannel.query.filter_by(channel_type=channel_type).first()
            if channel:
                query = query.filter_by(channel_id=channel.id)
        
        if category:
            query = query.filter_by(category=category)
        
        templates = query.all()
        
        return jsonify({
            'success': True,
            'templates': [{
                'id': template.id,
                'template_name': template.template_name,
                'template_code': template.template_code,
                'category': template.category,
                'subject': template.subject,
                'content': template.content,
                'variables': template.variables,
                'language': template.language,
                'usage_count': template.usage_count
            } for template in templates]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Dashboard API ====================

@communications_bp.route('/api/communications/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_COMMUNICATIONS_DASHBOARD')
def get_communications_dashboard():
    """استرجاع بيانات لوحة تحكم الاتصالات"""
    try:
        # إحصائيات الرسائل
        total_messages = CommunicationMessage.query.count()
        sent_messages = CommunicationMessage.query.filter_by(status='sent').count()
        failed_messages = CommunicationMessage.query.filter_by(status='failed').count()
        
        # إحصائيات المكالمات
        total_calls = VoiceCall.query.count()
        completed_calls = VoiceCall.query.filter_by(status='completed').count()
        
        # إحصائيات المؤتمرات
        total_conferences = VideoConference.query.count()
        active_conferences = VideoConference.query.filter_by(status='active').count()
        
        # إحصائيات الإشعارات
        total_notifications = PushNotification.query.count()
        delivered_notifications = PushNotification.query.filter_by(status='delivered').count()
        
        return jsonify({
            'success': True,
            'statistics': {
                'messages': {
                    'total': total_messages,
                    'sent': sent_messages,
                    'failed': failed_messages,
                    'success_rate': round((sent_messages / total_messages * 100) if total_messages > 0 else 0, 1)
                },
                'calls': {
                    'total': total_calls,
                    'completed': completed_calls,
                    'success_rate': round((completed_calls / total_calls * 100) if total_calls > 0 else 0, 1)
                },
                'conferences': {
                    'total': total_conferences,
                    'active': active_conferences
                },
                'notifications': {
                    'total': total_notifications,
                    'delivered': delivered_notifications,
                    'delivery_rate': round((delivered_notifications / total_notifications * 100) if total_notifications > 0 else 0, 1)
                }
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
