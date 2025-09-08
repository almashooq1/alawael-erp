#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
نماذج قاعدة البيانات لنظام الاتصالات المتكامل
مراكز الأوائل للتأهيل الطبي
"""

from models import db
from datetime import datetime
import json
from enum import Enum

# ==================== Communication Channels ====================

class CommunicationChannel(db.Model):
    """قنوات الاتصال المختلفة"""
    __tablename__ = 'communication_channels'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_name = db.Column(db.String(100), nullable=False, unique=True)  # SMS, Email, Push, Voice, Video
    channel_type = db.Column(db.String(50), nullable=False)  # text, email, push, voice, video
    provider_name = db.Column(db.String(100))  # Twilio, SendGrid, Firebase, etc.
    api_endpoint = db.Column(db.String(500))
    api_key = db.Column(db.Text)  # مشفر
    api_secret = db.Column(db.Text)  # مشفر
    configuration = db.Column(db.JSON)  # إعدادات إضافية
    is_active = db.Column(db.Boolean, default=True)
    daily_limit = db.Column(db.Integer, default=1000)
    monthly_limit = db.Column(db.Integer, default=30000)
    cost_per_message = db.Column(db.Numeric(10, 4), default=0.0)
    success_rate = db.Column(db.Float, default=0.0)  # معدل النجاح
    
    # العلاقات
    messages = db.relationship('CommunicationMessage', backref='channel', lazy='dynamic')
    templates = db.relationship('MessageTemplate', backref='channel', lazy='dynamic')
    campaigns = db.relationship('CommunicationCampaign', backref='channel', lazy='dynamic')
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<CommunicationChannel {self.channel_name}>'

# ==================== Message Templates ====================

class MessageTemplate(db.Model):
    """قوالب الرسائل"""
    __tablename__ = 'message_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    template_name = db.Column(db.String(200), nullable=False)
    template_code = db.Column(db.String(100), unique=True, nullable=False)
    channel_id = db.Column(db.Integer, db.ForeignKey('communication_channels.id'), nullable=False)
    category = db.Column(db.String(100))  # appointment, reminder, notification, marketing
    
    # محتوى القالب
    subject = db.Column(db.String(500))  # للبريد الإلكتروني
    content = db.Column(db.Text, nullable=False)
    html_content = db.Column(db.Text)  # للبريد الإلكتروني HTML
    
    # المتغيرات المتاحة
    variables = db.Column(db.JSON)  # قائمة المتغيرات المتاحة
    
    # إعدادات القالب
    language = db.Column(db.String(10), default='ar')
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    is_active = db.Column(db.Boolean, default=True)
    requires_approval = db.Column(db.Boolean, default=False)
    
    # إحصائيات الاستخدام
    usage_count = db.Column(db.Integer, default=0)
    success_rate = db.Column(db.Float, default=0.0)
    
    # العلاقات
    messages = db.relationship('CommunicationMessage', backref='template', lazy='dynamic')
    
    # المستخدم والتواريخ
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<MessageTemplate {self.template_name}>'

# ==================== Communication Messages ====================

class CommunicationMessage(db.Model):
    """رسائل الاتصال"""
    __tablename__ = 'communication_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.String(100), unique=True)  # معرف فريد للرسالة
    
    # معلومات القناة والقالب
    channel_id = db.Column(db.Integer, db.ForeignKey('communication_channels.id'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('message_templates.id'))
    campaign_id = db.Column(db.Integer, db.ForeignKey('communication_campaigns.id'))
    
    # المرسل والمستقبل
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    recipient_type = db.Column(db.String(50))  # user, student, parent, staff, external
    recipient_id = db.Column(db.Integer)  # معرف المستقبل
    recipient_contact = db.Column(db.String(200), nullable=False)  # رقم الهاتف أو البريد الإلكتروني
    recipient_name = db.Column(db.String(200))
    
    # محتوى الرسالة
    subject = db.Column(db.String(500))
    content = db.Column(db.Text, nullable=False)
    html_content = db.Column(db.Text)
    attachments = db.Column(db.JSON)  # قائمة المرفقات
    
    # حالة الرسالة
    status = db.Column(db.String(50), default='pending')  # pending, sent, delivered, failed, read
    priority = db.Column(db.String(20), default='normal')
    
    # معلومات الإرسال
    scheduled_at = db.Column(db.DateTime)  # موعد الإرسال المجدول
    sent_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)
    read_at = db.Column(db.DateTime)
    failed_at = db.Column(db.DateTime)
    
    # تفاصيل الاستجابة
    provider_message_id = db.Column(db.String(200))  # معرف الرسالة من المزود
    provider_response = db.Column(db.JSON)  # استجابة المزود
    error_message = db.Column(db.Text)
    retry_count = db.Column(db.Integer, default=0)
    max_retries = db.Column(db.Integer, default=3)
    
    # معلومات إضافية
    cost = db.Column(db.Numeric(10, 4), default=0.0)
    extra_metadata = db.Column(db.JSON)  # بيانات إضافية
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<CommunicationMessage {self.message_id}>'

# ==================== Communication Campaigns ====================

class CommunicationCampaign(db.Model):
    """حملات الاتصال"""
    __tablename__ = 'communication_campaigns'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_name = db.Column(db.String(200), nullable=False)
    campaign_code = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    
    # إعدادات الحملة
    channel_id = db.Column(db.Integer, db.ForeignKey('communication_channels.id'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('message_templates.id'))
    
    # الجمهور المستهدف
    target_audience = db.Column(db.JSON)  # معايير الجمهور المستهدف
    recipient_list = db.Column(db.JSON)  # قائمة المستقبلين
    estimated_recipients = db.Column(db.Integer, default=0)
    
    # جدولة الحملة
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    send_immediately = db.Column(db.Boolean, default=False)
    scheduled_send_time = db.Column(db.DateTime)
    
    # حالة الحملة
    status = db.Column(db.String(50), default='draft')  # draft, scheduled, running, completed, paused, cancelled
    
    # إحصائيات الحملة
    total_sent = db.Column(db.Integer, default=0)
    total_delivered = db.Column(db.Integer, default=0)
    total_failed = db.Column(db.Integer, default=0)
    total_read = db.Column(db.Integer, default=0)
    total_cost = db.Column(db.Numeric(10, 2), default=0.0)
    
    # معدلات الأداء
    delivery_rate = db.Column(db.Float, default=0.0)
    read_rate = db.Column(db.Float, default=0.0)
    
    # العلاقات
    messages = db.relationship('CommunicationMessage', backref='campaign', lazy='dynamic')
    
    # المستخدم والتواريخ
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<CommunicationCampaign {self.campaign_name}>'

# ==================== Voice Calls ====================

class VoiceCall(db.Model):
    """المكالمات الصوتية"""
    __tablename__ = 'voice_calls'
    
    id = db.Column(db.Integer, primary_key=True)
    call_id = db.Column(db.String(100), unique=True, nullable=False)
    
    # أطراف المكالمة
    caller_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    caller_number = db.Column(db.String(20))
    recipient_number = db.Column(db.String(20), nullable=False)
    recipient_name = db.Column(db.String(200))
    
    # نوع المكالمة
    call_type = db.Column(db.String(50))  # outbound, inbound, conference
    call_purpose = db.Column(db.String(100))  # appointment, consultation, follow_up, emergency
    
    # حالة المكالمة
    status = db.Column(db.String(50), default='initiated')  # initiated, ringing, answered, busy, failed, completed
    
    # أوقات المكالمة
    initiated_at = db.Column(db.DateTime, default=datetime.utcnow)
    answered_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    duration_seconds = db.Column(db.Integer, default=0)
    
    # تفاصيل المكالمة
    provider_call_id = db.Column(db.String(200))  # معرف المكالمة من المزود
    recording_url = db.Column(db.String(500))  # رابط التسجيل
    is_recorded = db.Column(db.Boolean, default=False)
    quality_score = db.Column(db.Float)  # جودة المكالمة
    
    # التكلفة والفوترة
    cost = db.Column(db.Numeric(10, 4), default=0.0)
    billing_duration = db.Column(db.Integer, default=0)
    
    # ملاحظات ومتابعة
    notes = db.Column(db.Text)
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.DateTime)
    
    # معلومات إضافية
    extra_metadata = db.Column(db.JSON)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<VoiceCall {self.call_id}>'

# ==================== Video Conferences ====================

class VideoConference(db.Model):
    """مؤتمرات الفيديو"""
    __tablename__ = 'video_conferences'
    
    id = db.Column(db.Integer, primary_key=True)
    conference_id = db.Column(db.String(100), unique=True, nullable=False)
    
    # معلومات المؤتمر
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    conference_type = db.Column(db.String(50))  # consultation, meeting, training, therapy
    
    # المضيف والمشاركون
    host_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    max_participants = db.Column(db.Integer, default=10)
    
    # جدولة المؤتمر
    scheduled_start = db.Column(db.DateTime, nullable=False)
    scheduled_end = db.Column(db.DateTime, nullable=False)
    timezone = db.Column(db.String(50), default='Asia/Riyadh')
    
    # حالة المؤتمر
    status = db.Column(db.String(50), default='scheduled')  # scheduled, active, ended, cancelled
    
    # أوقات فعلية
    actual_start = db.Column(db.DateTime)
    actual_end = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer, default=0)
    
    # إعدادات المؤتمر
    is_recording_enabled = db.Column(db.Boolean, default=False)
    is_waiting_room_enabled = db.Column(db.Boolean, default=True)
    require_password = db.Column(db.Boolean, default=False)
    meeting_password = db.Column(db.String(100))
    
    # روابط الانضمام
    join_url = db.Column(db.String(500))
    host_url = db.Column(db.String(500))
    phone_number = db.Column(db.String(20))  # للانضمام عبر الهاتف
    
    # معلومات المزود
    provider_name = db.Column(db.String(100))  # Zoom, Teams, WebEx, etc.
    provider_meeting_id = db.Column(db.String(200))
    provider_response = db.Column(db.JSON)
    
    # التسجيل والمرفقات
    recording_url = db.Column(db.String(500))
    recording_size_mb = db.Column(db.Float)
    shared_files = db.Column(db.JSON)  # الملفات المشاركة
    
    # الإحصائيات
    total_participants = db.Column(db.Integer, default=0)
    peak_participants = db.Column(db.Integer, default=0)
    
    # العلاقات
    participants = db.relationship('ConferenceParticipant', backref='conference', lazy='dynamic')
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<VideoConference {self.title}>'

# ==================== Conference Participants ====================

class ConferenceParticipant(db.Model):
    """مشاركو مؤتمرات الفيديو"""
    __tablename__ = 'conference_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    conference_id = db.Column(db.Integer, db.ForeignKey('video_conferences.id'), nullable=False)
    
    # معلومات المشارك
    participant_type = db.Column(db.String(50))  # user, student, parent, external
    participant_id = db.Column(db.Integer)  # معرف المشارك في النظام
    participant_name = db.Column(db.String(200), nullable=False)
    participant_email = db.Column(db.String(200))
    participant_phone = db.Column(db.String(20))
    
    # حالة المشاركة
    invitation_status = db.Column(db.String(50), default='invited')  # invited, accepted, declined, no_response
    attendance_status = db.Column(db.String(50), default='not_joined')  # not_joined, joined, left
    
    # أوقات المشاركة
    invited_at = db.Column(db.DateTime, default=datetime.utcnow)
    joined_at = db.Column(db.DateTime)
    left_at = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer, default=0)
    
    # صلاحيات المشارك
    can_share_screen = db.Column(db.Boolean, default=False)
    can_record = db.Column(db.Boolean, default=False)
    is_moderator = db.Column(db.Boolean, default=False)
    
    # معلومات الاتصال
    connection_quality = db.Column(db.String(20))  # excellent, good, fair, poor
    device_type = db.Column(db.String(50))  # desktop, mobile, tablet, phone
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<ConferenceParticipant {self.participant_name}>'

# ==================== Push Notifications ====================

class PushNotification(db.Model):
    """الإشعارات التفاعلية"""
    __tablename__ = 'push_notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    notification_id = db.Column(db.String(100), unique=True, nullable=False)
    
    # معلومات الإشعار
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    icon = db.Column(db.String(200))
    image = db.Column(db.String(500))
    
    # المستقبل
    recipient_type = db.Column(db.String(50))  # user, student, parent, all, group
    recipient_id = db.Column(db.Integer)
    device_tokens = db.Column(db.JSON)  # رموز الأجهزة
    
    # نوع الإشعار
    notification_type = db.Column(db.String(100))  # appointment, reminder, alert, message, update
    category = db.Column(db.String(100))
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    
    # الإجراءات
    action_url = db.Column(db.String(500))  # رابط الإجراء
    actions = db.Column(db.JSON)  # أزرار الإجراءات
    
    # حالة الإشعار
    status = db.Column(db.String(50), default='pending')  # pending, sent, delivered, clicked, dismissed
    
    # أوقات الإشعار
    scheduled_at = db.Column(db.DateTime)
    sent_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)
    clicked_at = db.Column(db.DateTime)
    dismissed_at = db.Column(db.DateTime)
    
    # إعدادات الإرسال
    time_to_live = db.Column(db.Integer, default=86400)  # مدة البقاء بالثواني
    collapse_key = db.Column(db.String(100))  # لتجميع الإشعارات
    
    # الاستجابة والإحصائيات
    delivery_attempts = db.Column(db.Integer, default=0)
    provider_response = db.Column(db.JSON)
    error_message = db.Column(db.Text)
    
    # معلومات إضافية
    extra_metadata = db.Column(db.JSON)
    
    # المرسل والتواريخ
    sent_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<PushNotification {self.title}>'

# ==================== Communication Statistics ====================

class CommunicationStats(db.Model):
    """إحصائيات الاتصالات"""
    __tablename__ = 'communication_stats'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # فترة الإحصائية
    stat_date = db.Column(db.Date, nullable=False)
    stat_type = db.Column(db.String(50), nullable=False)  # daily, weekly, monthly
    
    # القناة والنوع
    channel_id = db.Column(db.Integer, db.ForeignKey('communication_channels.id'))
    message_type = db.Column(db.String(100))
    
    # الإحصائيات
    total_sent = db.Column(db.Integer, default=0)
    total_delivered = db.Column(db.Integer, default=0)
    total_failed = db.Column(db.Integer, default=0)
    total_read = db.Column(db.Integer, default=0)
    total_clicked = db.Column(db.Integer, default=0)
    
    # المعدلات
    delivery_rate = db.Column(db.Float, default=0.0)
    read_rate = db.Column(db.Float, default=0.0)
    click_rate = db.Column(db.Float, default=0.0)
    
    # التكاليف
    total_cost = db.Column(db.Numeric(10, 2), default=0.0)
    average_cost_per_message = db.Column(db.Numeric(10, 4), default=0.0)
    
    # أوقات الاستجابة
    average_delivery_time = db.Column(db.Integer, default=0)  # بالثواني
    average_read_time = db.Column(db.Integer, default=0)  # بالثواني
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<CommunicationStats {self.stat_date} - {self.stat_type}>'

# ==================== Communication Preferences ====================

class CommunicationPreference(db.Model):
    """تفضيلات الاتصال للمستخدمين"""
    __tablename__ = 'communication_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # المستخدم
    user_type = db.Column(db.String(50), nullable=False)  # user, student, parent
    user_id = db.Column(db.Integer, nullable=False)
    
    # تفضيلات القنوات
    preferred_channels = db.Column(db.JSON)  # قائمة القنوات المفضلة
    blocked_channels = db.Column(db.JSON)  # قائمة القنوات المحظورة
    
    # أوقات التواصل المفضلة
    preferred_time_start = db.Column(db.Time)
    preferred_time_end = db.Column(db.Time)
    preferred_days = db.Column(db.JSON)  # أيام الأسبوع المفضلة
    
    # تفضيلات المحتوى
    language_preference = db.Column(db.String(10), default='ar')
    content_types = db.Column(db.JSON)  # أنواع المحتوى المرغوبة
    
    # إعدادات الخصوصية
    allow_marketing = db.Column(db.Boolean, default=False)
    allow_reminders = db.Column(db.Boolean, default=True)
    allow_notifications = db.Column(db.Boolean, default=True)
    allow_emergency_contact = db.Column(db.Boolean, default=True)
    
    # معلومات الاتصال
    primary_phone = db.Column(db.String(20))
    secondary_phone = db.Column(db.String(20))
    primary_email = db.Column(db.String(200))
    secondary_email = db.Column(db.String(200))
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<CommunicationPreference {self.user_type}:{self.user_id}>'

# ==================== Helper Functions ====================

def generate_message_id():
    """توليد معرف فريد للرسالة"""
    import uuid
    return f"MSG_{uuid.uuid4().hex[:12].upper()}"

def generate_call_id():
    """توليد معرف فريد للمكالمة"""
    import uuid
    return f"CALL_{uuid.uuid4().hex[:12].upper()}"

def generate_conference_id():
    """توليد معرف فريد للمؤتمر"""
    import uuid
    return f"CONF_{uuid.uuid4().hex[:12].upper()}"

def generate_notification_id():
    """توليد معرف فريد للإشعار"""
    import uuid
    return f"NOTIF_{uuid.uuid4().hex[:12].upper()}"

# ==================== Database Indexes ====================

# إنشاء فهارس لتحسين الأداء
db.Index('idx_comm_messages_status', CommunicationMessage.status)
db.Index('idx_comm_messages_channel', CommunicationMessage.channel_id)
db.Index('idx_comm_messages_recipient', CommunicationMessage.recipient_type, CommunicationMessage.recipient_id)
db.Index('idx_comm_messages_created', CommunicationMessage.created_at)

db.Index('idx_voice_calls_status', VoiceCall.status)
db.Index('idx_voice_calls_caller', VoiceCall.caller_id)
db.Index('idx_voice_calls_created', VoiceCall.created_at)

db.Index('idx_video_conferences_status', VideoConference.status)
db.Index('idx_video_conferences_host', VideoConference.host_id)
db.Index('idx_video_conferences_scheduled', VideoConference.scheduled_start)

db.Index('idx_push_notifications_status', PushNotification.status)
db.Index('idx_push_notifications_recipient', PushNotification.recipient_type, PushNotification.recipient_id)
db.Index('idx_push_notifications_created', PushNotification.created_at)

db.Index('idx_comm_stats_date', CommunicationStats.stat_date)
db.Index('idx_comm_stats_channel', CommunicationStats.channel_id)

db.Index('idx_comm_preferences_user', CommunicationPreference.user_type, CommunicationPreference.user_id)
