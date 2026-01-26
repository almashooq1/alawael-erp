from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User
from chat_models import (
from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit
)
    ChatRoom, ChatParticipant, ChatMessage, MessageReadReceipt,
    ChatNotification, ChatSession, ChatFile,
    generate_room_id, generate_message_id, generate_file_id,
    generate_notification_id, generate_session_id
)
from datetime import datetime, timedelta
import json
import os
from werkzeug.utils import secure_filename
from functools import wraps

chat_bp = Blueprint('chat', __name__)

# ==================== Chat Rooms API ====================

@chat_bp.route('/api/chat/rooms', methods=['POST'])
@jwt_required()
@check_permission('manage_chat')
@guard_payload_size()
@log_audit('CREATE_CHAT_ROOM')
def create_chat_room():
    """إنشاء غرفة دردشة جديدة"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        if not data.get('room_name'):
            return jsonify({'success': False, 'message': 'اسم الغرفة مطلوب'}), 400
        
        # إنشاء الغرفة
        room = ChatRoom(
            room_id=generate_room_id(),
            room_name=data['room_name'],
            room_type=data.get('room_type', 'private'),
            description=data.get('description'),
            max_participants=data.get('max_participants', 50),
            is_encrypted=data.get('is_encrypted', True),
            allow_file_sharing=data.get('allow_file_sharing', True),
            created_by=user_id
        )
        
        db.session.add(room)
        db.session.flush()
        
        # إضافة المنشئ كمشارك ومدير
        participant = ChatParticipant(
            room_id=room.id,
            user_id=user_id,
            role='admin',
            can_send_messages=True,
            can_share_files=True,
            can_add_participants=True,
            can_remove_participants=True
        )
        
        db.session.add(participant)
        
        # إضافة المشاركين الآخرين
        participant_ids = data.get('participants', [])
        for participant_id in participant_ids:
            if participant_id != user_id:
                new_participant = ChatParticipant(
                    room_id=room.id,
                    user_id=participant_id,
                    role='member'
                )
                db.session.add(new_participant)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الغرفة بنجاح',
            'room_id': room.room_id,
            'room': {
                'id': room.id,
                'room_id': room.room_id,
                'room_name': room.room_name,
                'room_type': room.room_type,
                'description': room.description,
                'created_at': room.created_at.isoformat()
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@chat_bp.route('/api/chat/rooms', methods=['GET'])
@jwt_required()
@check_permission('view_chat')
@log_audit('GET_USER_CHAT_ROOMS')
def get_user_chat_rooms():
    """استرجاع غرف الدردشة للمستخدم"""
    try:
        user_id = get_jwt_identity()
        
        # الحصول على الغرف التي يشارك فيها المستخدم
        rooms_query = db.session.query(ChatRoom).join(ChatParticipant).filter(
            ChatParticipant.user_id == user_id,
            ChatParticipant.is_active == True,
            ChatRoom.is_active == True
        ).order_by(ChatRoom.updated_at.desc())
        
        rooms = rooms_query.all()
        
        rooms_data = []
        for room in rooms:
            # الحصول على آخر رسالة
            last_message = ChatMessage.query.filter_by(
                room_id=room.id, is_deleted=False
            ).order_by(ChatMessage.sent_at.desc()).first()
            
            # عدد الرسائل غير المقروءة
            participant = ChatParticipant.query.filter_by(
                room_id=room.id, user_id=user_id
            ).first()
            
            unread_count = 0
            if participant and participant.last_read_message_id:
                unread_count = ChatMessage.query.filter(
                    ChatMessage.room_id == room.id,
                    ChatMessage.id > participant.last_read_message_id,
                    ChatMessage.is_deleted == False
                ).count()
            
            # عدد المشاركين النشطين
            active_participants = ChatParticipant.query.filter_by(
                room_id=room.id, is_active=True
            ).count()
            
            rooms_data.append({
                'id': room.id,
                'room_id': room.room_id,
                'room_name': room.room_name,
                'room_type': room.room_type,
                'description': room.description,
                'participants_count': active_participants,
                'unread_count': unread_count,
                'last_message': {
                    'content': last_message.content[:100] if last_message else None,
                    'sent_at': last_message.sent_at.isoformat() if last_message else None,
                    'sender_name': last_message.sender.full_name if last_message else None
                } if last_message else None,
                'updated_at': room.updated_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'rooms': rooms_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@chat_bp.route('/api/chat/rooms/<room_id>/join', methods=['POST'])
@jwt_required()
@check_permission('manage_chat')
@guard_payload_size()
@log_audit('JOIN_CHAT_ROOM')
def join_chat_room(room_id):
    """الانضمام لغرفة دردشة"""
    try:
        user_id = get_jwt_identity()
        
        # البحث عن الغرفة
        room = ChatRoom.query.filter_by(room_id=room_id, is_active=True).first()
        if not room:
            return jsonify({'success': False, 'message': 'الغرفة غير موجودة'}), 404
        
        # التحقق من وجود المستخدم كمشارك
        existing_participant = ChatParticipant.query.filter_by(
            room_id=room.id, user_id=user_id
        ).first()
        
        if existing_participant:
            if existing_participant.is_active:
                return jsonify({'success': False, 'message': 'أنت مشارك بالفعل في هذه الغرفة'}), 400
            else:
                # إعادة تفعيل المشاركة
                existing_participant.is_active = True
                existing_participant.joined_at = datetime.utcnow()
                existing_participant.left_at = None
        else:
            # التحقق من الحد الأقصى للمشاركين
            current_participants = ChatParticipant.query.filter_by(
                room_id=room.id, is_active=True
            ).count()
            
            if current_participants >= room.max_participants:
                return jsonify({'success': False, 'message': 'الغرفة ممتلئة'}), 400
            
            # إنشاء مشاركة جديدة
            participant = ChatParticipant(
                room_id=room.id,
                user_id=user_id,
                role='member'
            )
            db.session.add(participant)
        
        # إنشاء رسالة نظام
        system_message = ChatMessage(
            message_id=generate_message_id(),
            room_id=room.id,
            sender_id=user_id,
            message_type='system',
            content=f'انضم إلى الغرفة',
            is_system_message=True
        )
        db.session.add(system_message)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم الانضمام للغرفة بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Chat Messages API ====================

@chat_bp.route('/api/chat/rooms/<room_id>/messages', methods=['POST'])
@jwt_required()
@check_permission('send_chat')
@guard_payload_size()
@log_audit('SEND_MESSAGE')
def send_message(room_id):
    """إرسال رسالة في غرفة الدردشة"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # البحث عن الغرفة والتحقق من المشاركة
        room = ChatRoom.query.filter_by(room_id=room_id, is_active=True).first()
        if not room:
            return jsonify({'success': False, 'message': 'الغرفة غير موجودة'}), 404
        
        participant = ChatParticipant.query.filter_by(
            room_id=room.id, user_id=user_id, is_active=True
        ).first()
        
        if not participant:
            return jsonify({'success': False, 'message': 'غير مسموح لك بالإرسال في هذه الغرفة'}), 403
        
        if not participant.can_send_messages:
            return jsonify({'success': False, 'message': 'ليس لديك صلاحية إرسال الرسائل'}), 403
        
        # التحقق من محتوى الرسالة
        if not data.get('content') and not data.get('file_url'):
            return jsonify({'success': False, 'message': 'محتوى الرسالة مطلوب'}), 400
        
        # إنشاء الرسالة
        message = ChatMessage(
            message_id=generate_message_id(),
            room_id=room.id,
            sender_id=user_id,
            message_type=data.get('message_type', 'text'),
            content=data.get('content'),
            formatted_content=data.get('formatted_content'),
            file_url=data.get('file_url'),
            file_name=data.get('file_name'),
            file_size=data.get('file_size'),
            file_type=data.get('file_type'),
            reply_to_message_id=data.get('reply_to_message_id'),
            mentions=json.dumps(data.get('mentions', [])),
            is_encrypted=room.is_encrypted
        )
        
        db.session.add(message)
        db.session.flush()
        
        # تحديث وقت آخر نشاط للغرفة
        room.updated_at = datetime.utcnow()
        
        # إنشاء إشعارات للمشاركين الآخرين
        other_participants = ChatParticipant.query.filter(
            ChatParticipant.room_id == room.id,
            ChatParticipant.user_id != user_id,
            ChatParticipant.is_active == True,
            ChatParticipant.notifications_enabled == True
        ).all()
        
        for participant in other_participants:
            notification = ChatNotification(
                notification_id=generate_notification_id(),
                user_id=participant.user_id,
                room_id=room.id,
                message_id=message.id,
                notification_type='new_message',
                title=f'رسالة جديدة في {room.room_name}',
                content=data.get('content', 'ملف')[:100]
            )
            db.session.add(notification)
        
        db.session.commit()
        
        # إرجاع بيانات الرسالة
        sender = User.query.get(user_id)
        return jsonify({
            'success': True,
            'message': 'تم إرسال الرسالة بنجاح',
            'chat_message': {
                'id': message.id,
                'message_id': message.message_id,
                'content': message.content,
                'message_type': message.message_type,
                'sender': {
                    'id': sender.id,
                    'name': sender.full_name,
                    'avatar': getattr(sender, 'avatar_url', None)
                },
                'sent_at': message.sent_at.isoformat(),
                'reply_to': message.reply_to_message_id,
                'mentions': json.loads(message.mentions) if message.mentions else []
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@chat_bp.route('/api/chat/rooms/<room_id>/messages', methods=['GET'])
@jwt_required()
@check_permission('view_chat')
@log_audit('GET_ROOM_MESSAGES')
def get_room_messages(room_id):
    """استرجاع رسائل غرفة الدردشة"""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        # البحث عن الغرفة والتحقق من المشاركة
        room = ChatRoom.query.filter_by(room_id=room_id, is_active=True).first()
        if not room:
            return jsonify({'success': False, 'message': 'الغرفة غير موجودة'}), 404
        
        participant = ChatParticipant.query.filter_by(
            room_id=room.id, user_id=user_id, is_active=True
        ).first()
        
        if not participant:
            return jsonify({'success': False, 'message': 'غير مسموح لك بالوصول لهذه الغرفة'}), 403
        
        # استرجاع الرسائل
        messages_query = ChatMessage.query.filter(
            ChatMessage.room_id == room.id,
            ChatMessage.is_deleted == False
        ).order_by(ChatMessage.sent_at.desc())
        
        messages = messages_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        messages_data = []
        for message in messages.items:
            sender = User.query.get(message.sender_id)
            
            # التحقق من قراءة الرسالة
            read_receipt = MessageReadReceipt.query.filter_by(
                message_id=message.id, user_id=user_id
            ).first()
            
            messages_data.append({
                'id': message.id,
                'message_id': message.message_id,
                'content': message.content,
                'formatted_content': message.formatted_content,
                'message_type': message.message_type,
                'file_url': message.file_url,
                'file_name': message.file_name,
                'file_size': message.file_size,
                'file_type': message.file_type,
                'sender': {
                    'id': sender.id,
                    'name': sender.full_name,
                    'avatar': getattr(sender, 'avatar_url', None)
                },
                'sent_at': message.sent_at.isoformat(),
                'is_edited': message.is_edited,
                'edited_at': message.edited_at.isoformat() if message.edited_at else None,
                'reply_to_message_id': message.reply_to_message_id,
                'mentions': json.loads(message.mentions) if message.mentions else [],
                'reactions': json.loads(message.reactions) if message.reactions else {},
                'is_read': read_receipt is not None,
                'read_at': read_receipt.read_at.isoformat() if read_receipt else None
            })
        
        return jsonify({
            'success': True,
            'messages': list(reversed(messages_data)),  # ترتيب تصاعدي للعرض
            'pagination': {
                'page': messages.page,
                'pages': messages.pages,
                'per_page': messages.per_page,
                'total': messages.total,
                'has_next': messages.has_next,
                'has_prev': messages.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@chat_bp.route('/api/chat/messages/<message_id>/read', methods=['POST'])
@jwt_required()
@check_permission('manage_chat')
@guard_payload_size()
@log_audit('MARK_MESSAGE_READ')
def mark_message_read(message_id):
    """تمييز الرسالة كمقروءة"""
    try:
        user_id = get_jwt_identity()
        
        # البحث عن الرسالة
        message = ChatMessage.query.filter_by(message_id=message_id).first()
        if not message:
            return jsonify({'success': False, 'message': 'الرسالة غير موجودة'}), 404
        
        # التحقق من المشاركة في الغرفة
        participant = ChatParticipant.query.filter_by(
            room_id=message.room_id, user_id=user_id, is_active=True
        ).first()
        
        if not participant:
            return jsonify({'success': False, 'message': 'غير مسموح لك بالوصول لهذه الرسالة'}), 403
        
        # التحقق من وجود إيصال قراءة
        existing_receipt = MessageReadReceipt.query.filter_by(
            message_id=message.id, user_id=user_id
        ).first()
        
        if not existing_receipt:
            # إنشاء إيصال قراءة جديد
            receipt = MessageReadReceipt(
                message_id=message.id,
                user_id=user_id
            )
            db.session.add(receipt)
            
            # تحديث عداد القراءة
            message.read_count += 1
            
            # تحديث آخر رسالة مقروءة للمشارك
            participant.last_read_message_id = message.id
            participant.last_seen = datetime.utcnow()
            
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تمييز الرسالة كمقروءة'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== File Upload API ====================

@chat_bp.route('/api/chat/upload', methods=['POST'])
@jwt_required()
@check_permission('manage_chat')
@guard_payload_size()
@log_audit('UPLOAD_CHAT_FILE')
def upload_chat_file():
    """رفع ملف للدردشة"""
    try:
        user_id = get_jwt_identity()
        
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'لم يتم اختيار ملف'}), 400
        
        file = request.files['file']
        room_id = request.form.get('room_id')
        
        if file.filename == '':
            return jsonify({'success': False, 'message': 'لم يتم اختيار ملف'}), 400
        
        if not room_id:
            return jsonify({'success': False, 'message': 'معرف الغرفة مطلوب'}), 400
        
        # التحقق من الغرفة والصلاحيات
        room = ChatRoom.query.filter_by(room_id=room_id, is_active=True).first()
        if not room:
            return jsonify({'success': False, 'message': 'الغرفة غير موجودة'}), 404
        
        participant = ChatParticipant.query.filter_by(
            room_id=room.id, user_id=user_id, is_active=True
        ).first()
        
        if not participant or not participant.can_share_files:
            return jsonify({'success': False, 'message': 'غير مسموح لك برفع الملفات'}), 403
        
        if not room.allow_file_sharing:
            return jsonify({'success': False, 'message': 'مشاركة الملفات غير مسموحة في هذه الغرفة'}), 403
        
        # التحقق من نوع وحجم الملف
        allowed_extensions = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mp3', 'doc', 'docx', 'xls', 'xlsx'}
        max_file_size = 50 * 1024 * 1024  # 50 MB
        
        filename = secure_filename(file.filename)
        file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        
        if file_extension not in allowed_extensions:
            return jsonify({'success': False, 'message': 'نوع الملف غير مسموح'}), 400
        
        # التحقق من حجم الملف
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > max_file_size:
            return jsonify({'success': False, 'message': 'حجم الملف كبير جداً'}), 400
        
        # إنشاء مجلد الرفع
        upload_folder = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'chat_files')
        os.makedirs(upload_folder, exist_ok=True)
        
        # حفظ الملف
        file_id = generate_file_id()
        new_filename = f"{file_id}_{filename}"
        file_path = os.path.join(upload_folder, new_filename)
        file.save(file_path)
        
        # إنشاء سجل الملف
        chat_file = ChatFile(
            file_id=file_id,
            room_id=room.id,
            uploaded_by=user_id,
            original_name=filename,
            file_name=new_filename,
            file_path=file_path,
            file_url=f'/uploads/chat_files/{new_filename}',
            file_type=file_extension,
            mime_type=file.content_type,
            file_size=file_size
        )
        
        db.session.add(chat_file)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم رفع الملف بنجاح',
            'file': {
                'file_id': file_id,
                'file_name': filename,
                'file_url': chat_file.file_url,
                'file_size': file_size,
                'file_type': file_extension,
                'uploaded_at': chat_file.uploaded_at.isoformat()
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Chat Sessions API ====================

@chat_bp.route('/api/chat/sessions/connect', methods=['POST'])
@jwt_required()
@check_permission('manage_chat')
@guard_payload_size()
@log_audit('CONNECT_CHAT_SESSION')
def connect_chat_session():
    """إنشاء جلسة دردشة نشطة"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        room_id = data.get('room_id')
        socket_id = data.get('socket_id')
        
        if not room_id:
            return jsonify({'success': False, 'message': 'معرف الغرفة مطلوب'}), 400
        
        # البحث عن الغرفة
        room = ChatRoom.query.filter_by(room_id=room_id, is_active=True).first()
        if not room:
            return jsonify({'success': False, 'message': 'الغرفة غير موجودة'}), 404
        
        # إنشاء أو تحديث الجلسة
        session = ChatSession.query.filter_by(
            user_id=user_id, room_id=room.id, is_active=True
        ).first()
        
        if session:
            session.socket_id = socket_id
            session.last_activity = datetime.utcnow()
        else:
            session = ChatSession(
                session_id=generate_session_id(),
                user_id=user_id,
                room_id=room.id,
                socket_id=socket_id,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent', ''),
                device_type=data.get('device_type', 'web')
            )
            db.session.add(session)
        
        # تحديث آخر ظهور للمشارك
        participant = ChatParticipant.query.filter_by(
            room_id=room.id, user_id=user_id
        ).first()
        
        if participant:
            participant.last_seen = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم الاتصال بنجاح',
            'session_id': session.session_id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@chat_bp.route('/api/chat/sessions/disconnect', methods=['POST'])
@jwt_required()
@check_permission('manage_chat')
@guard_payload_size()
@log_audit('DISCONNECT_CHAT_SESSION')
def disconnect_chat_session():
    """قطع جلسة الدردشة"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        session_id = data.get('session_id')
        
        if session_id:
            session = ChatSession.query.filter_by(
                session_id=session_id, user_id=user_id
            ).first()
        else:
            session = ChatSession.query.filter_by(
                user_id=user_id, is_active=True
            ).first()
        
        if session:
            session.is_active = False
            session.disconnected_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم قطع الاتصال بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Chat Dashboard API ====================

@chat_bp.route('/api/chat/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_CHAT_DASHBOARD')
def get_chat_dashboard():
    """استرجاع بيانات لوحة تحكم الدردشة"""
    try:
        user_id = get_jwt_identity()
        
        # إحصائيات عامة
        total_rooms = ChatRoom.query.join(ChatParticipant).filter(
            ChatParticipant.user_id == user_id,
            ChatParticipant.is_active == True,
            ChatRoom.is_active == True
        ).count()
        
        total_messages = ChatMessage.query.join(ChatRoom).join(ChatParticipant).filter(
            ChatParticipant.user_id == user_id,
            ChatParticipant.is_active == True,
            ChatMessage.is_deleted == False
        ).count()
        
        unread_messages = db.session.query(ChatMessage).join(ChatRoom).join(ChatParticipant).filter(
            ChatParticipant.user_id == user_id,
            ChatParticipant.is_active == True,
            ChatMessage.is_deleted == False,
            ChatMessage.sender_id != user_id
        ).outerjoin(MessageReadReceipt, 
            (MessageReadReceipt.message_id == ChatMessage.id) & 
            (MessageReadReceipt.user_id == user_id)
        ).filter(MessageReadReceipt.id == None).count()
        
        active_sessions = ChatSession.query.filter_by(
            user_id=user_id, is_active=True
        ).count()
        
        # الغرف النشطة
        recent_rooms = db.session.query(ChatRoom).join(ChatParticipant).filter(
            ChatParticipant.user_id == user_id,
            ChatParticipant.is_active == True,
            ChatRoom.is_active == True
        ).order_by(ChatRoom.updated_at.desc()).limit(5).all()
        
        recent_rooms_data = []
        for room in recent_rooms:
            last_message = ChatMessage.query.filter_by(
                room_id=room.id, is_deleted=False
            ).order_by(ChatMessage.sent_at.desc()).first()
            
            recent_rooms_data.append({
                'room_id': room.room_id,
                'room_name': room.room_name,
                'room_type': room.room_type,
                'last_message': last_message.content[:50] if last_message else None,
                'last_activity': room.updated_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_rooms': total_rooms,
                'total_messages': total_messages,
                'unread_messages': unread_messages,
                'active_sessions': active_sessions
            },
            'recent_rooms': recent_rooms_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
