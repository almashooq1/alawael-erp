# SQLAlchemy import removed - using centralized db instance
from datetime import datetime
import json
import uuid

# Import db from database module to avoid conflicts
from database import db

class ChatRoom(db.Model):
    """غرف الدردشة"""
    __tablename__ = 'chat_rooms'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    room_name = db.Column(db.String(200), nullable=False)
    room_type = db.Column(db.String(50), nullable=False, default='private')  # private, group, support, public
    description = db.Column(db.Text)
    
    # إعدادات الغرفة
    is_active = db.Column(db.Boolean, default=True)
    max_participants = db.Column(db.Integer, default=50)
    is_encrypted = db.Column(db.Boolean, default=True)
    allow_file_sharing = db.Column(db.Boolean, default=True)
    auto_delete_messages = db.Column(db.Boolean, default=False)
    auto_delete_days = db.Column(db.Integer, default=30)
    
    # معلومات الإنشاء
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    participants = db.relationship('ChatParticipant', backref='room', lazy='dynamic', cascade='all, delete-orphan')
    messages = db.relationship('ChatMessage', backref='room', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<ChatRoom {self.room_name}>'

class ChatParticipant(db.Model):
    """مشاركو الدردشة"""
    __tablename__ = 'chat_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # الأدوار والصلاحيات
    role = db.Column(db.String(50), default='member')  # admin, moderator, member
    can_send_messages = db.Column(db.Boolean, default=True)
    can_share_files = db.Column(db.Boolean, default=True)
    can_add_participants = db.Column(db.Boolean, default=False)
    can_remove_participants = db.Column(db.Boolean, default=False)
    
    # حالة المشارك
    is_active = db.Column(db.Boolean, default=True)
    is_muted = db.Column(db.Boolean, default=False)
    muted_until = db.Column(db.DateTime)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    last_read_message_id = db.Column(db.Integer)
    
    # إعدادات الإشعارات
    notifications_enabled = db.Column(db.Boolean, default=True)
    mention_notifications = db.Column(db.Boolean, default=True)
    
    # تواريخ
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    left_at = db.Column(db.DateTime)
    
    # فهارس مركبة
    __table_args__ = (
        db.UniqueConstraint('room_id', 'user_id', name='unique_room_participant'),
        db.Index('idx_participant_room_user', 'room_id', 'user_id'),
    )
    
    def __repr__(self):
        return f'<ChatParticipant Room:{self.room_id} User:{self.user_id}>'

class ChatMessage(db.Model):
    """رسائل الدردشة"""
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # محتوى الرسالة
    message_type = db.Column(db.String(50), default='text')  # text, image, file, voice, video, system
    content = db.Column(db.Text)
    formatted_content = db.Column(db.Text)  # HTML formatted content
    
    # الملفات والوسائط
    attachments = db.Column(db.Text)  # JSON array of file info
    file_url = db.Column(db.String(500))
    file_name = db.Column(db.String(200))
    file_size = db.Column(db.Integer)
    file_type = db.Column(db.String(100))
    
    # الرد على رسالة
    reply_to_message_id = db.Column(db.Integer, db.ForeignKey('chat_messages.id'))
    reply_to_message = db.relationship('ChatMessage', remote_side=[id], backref='replies')
    
    # الإشارات والتفاعلات
    mentions = db.Column(db.Text)  # JSON array of mentioned user IDs
    reactions = db.Column(db.Text)  # JSON object of reactions
    
    # حالة الرسالة
    is_edited = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)
    is_pinned = db.Column(db.Boolean, default=False)
    is_system_message = db.Column(db.Boolean, default=False)
    
    # التشفير والأمان
    is_encrypted = db.Column(db.Boolean, default=True)
    encryption_key_id = db.Column(db.String(100))
    
    # التوقيتات
    sent_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    edited_at = db.Column(db.DateTime)
    deleted_at = db.Column(db.DateTime)
    
    # إحصائيات
    read_count = db.Column(db.Integer, default=0)
    reaction_count = db.Column(db.Integer, default=0)
    
    # العلاقات
    read_receipts = db.relationship('MessageReadReceipt', backref='message', lazy='dynamic', cascade='all, delete-orphan')
    
    # فهارس
    __table_args__ = (
        db.Index('idx_message_room_time', 'room_id', 'sent_at'),
        db.Index('idx_message_sender_time', 'sender_id', 'sent_at'),
    )
    
    def __repr__(self):
        return f'<ChatMessage {self.message_id}>'

class MessageReadReceipt(db.Model):
    """إيصالات قراءة الرسائل"""
    __tablename__ = 'message_read_receipts'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('chat_messages.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    read_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # فهارس مركبة
    __table_args__ = (
        db.UniqueConstraint('message_id', 'user_id', name='unique_message_read'),
        db.Index('idx_read_receipt_message_user', 'message_id', 'user_id'),
    )

class ChatNotification(db.Model):
    """إشعارات الدردشة"""
    __tablename__ = 'chat_notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    notification_id = db.Column(db.String(50), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id'), nullable=False)
    message_id = db.Column(db.Integer, db.ForeignKey('chat_messages.id'))
    
    # نوع الإشعار
    notification_type = db.Column(db.String(50), nullable=False)  # new_message, mention, room_invite, etc.
    title = db.Column(db.String(200))
    content = db.Column(db.Text)
    
    # حالة الإشعار
    is_read = db.Column(db.Boolean, default=False)
    is_sent = db.Column(db.Boolean, default=False)
    
    # التوقيتات
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime)
    sent_at = db.Column(db.DateTime)

class ChatSession(db.Model):
    """جلسات الدردشة النشطة"""
    __tablename__ = 'chat_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id'), nullable=False)
    
    # معلومات الجلسة
    socket_id = db.Column(db.String(100))
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    device_type = db.Column(db.String(50))  # web, mobile, desktop
    
    # حالة الجلسة
    is_active = db.Column(db.Boolean, default=True)
    is_typing = db.Column(db.Boolean, default=False)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    
    # التوقيتات
    connected_at = db.Column(db.DateTime, default=datetime.utcnow)
    disconnected_at = db.Column(db.DateTime)

class ChatFile(db.Model):
    """ملفات الدردشة"""
    __tablename__ = 'chat_files'
    
    id = db.Column(db.Integer, primary_key=True)
    file_id = db.Column(db.String(50), unique=True, nullable=False)
    message_id = db.Column(db.Integer, db.ForeignKey('chat_messages.id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id'), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # معلومات الملف
    original_name = db.Column(db.String(255), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_url = db.Column(db.String(500))
    file_type = db.Column(db.String(100))
    mime_type = db.Column(db.String(100))
    file_size = db.Column(db.Integer)
    
    # معلومات الوسائط
    thumbnail_url = db.Column(db.String(500))
    duration = db.Column(db.Integer)  # للفيديو والصوت بالثواني
    width = db.Column(db.Integer)  # للصور والفيديو
    height = db.Column(db.Integer)  # للصور والفيديو
    
    # الأمان
    is_scanned = db.Column(db.Boolean, default=False)
    scan_result = db.Column(db.String(50))  # clean, infected, suspicious
    is_encrypted = db.Column(db.Boolean, default=True)
    
    # التوقيتات
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)

# دوال مساعدة
def generate_room_id():
    """توليد معرف فريد للغرفة"""
    return f"room_{uuid.uuid4().hex[:12]}"

def generate_message_id():
    """توليد معرف فريد للرسالة"""
    return f"msg_{uuid.uuid4().hex[:16]}"

def generate_file_id():
    """توليد معرف فريد للملف"""
    return f"file_{uuid.uuid4().hex[:12]}"

def generate_notification_id():
    """توليد معرف فريد للإشعار"""
    return f"notif_{uuid.uuid4().hex[:12]}"

def generate_session_id():
    """توليد معرف فريد للجلسة"""
    return f"session_{uuid.uuid4().hex[:16]}"

# إنشاء الفهارس
def create_chat_indexes():
    """إنشاء الفهارس المطلوبة لتحسين الأداء"""
    try:
        # فهارس إضافية للأداء
        db.engine.execute('CREATE INDEX IF NOT EXISTS idx_chat_messages_room_sent ON chat_messages(room_id, sent_at DESC)')
        db.engine.execute('CREATE INDEX IF NOT EXISTS idx_chat_participants_user_active ON chat_participants(user_id, is_active)')
        db.engine.execute('CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_active ON chat_sessions(user_id, is_active)')
        db.engine.execute('CREATE INDEX IF NOT EXISTS idx_chat_notifications_user_read ON chat_notifications(user_id, is_read)')
        print("✅ تم إنشاء فهارس الدردشة بنجاح")
    except Exception as e:
        print(f"⚠️ خطأ في إنشاء فهارس الدردشة: {e}")
