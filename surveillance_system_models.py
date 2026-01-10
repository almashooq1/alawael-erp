"""
نماذج نظام كاميرات المراقبة المترابطة
Surveillance System Models
"""

from datetime import datetime
from enum import Enum
import json
from database import db

class CameraStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"
    ERROR = "error"

class CameraType(Enum):
    INDOOR = "indoor"
    OUTDOOR = "outdoor"
    PTZ = "ptz"  # Pan-Tilt-Zoom
    FIXED = "fixed"
    DOME = "dome"
    BULLET = "bullet"

class RecordingQuality(Enum):
    LOW = "480p"
    MEDIUM = "720p"
    HIGH = "1080p"
    ULTRA = "4K"

class AlertType(Enum):
    MOTION_DETECTED = "motion_detected"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    CAMERA_OFFLINE = "camera_offline"
    STORAGE_FULL = "storage_full"
    FACE_RECOGNITION = "face_recognition"
    BEHAVIOR_ANALYSIS = "behavior_analysis"
    EMERGENCY = "emergency"

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AccessLevel(Enum):
    VIEW_ONLY = "view_only"
    CONTROL = "control"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

class Camera(db.Model):
    """نموذج الكاميرات"""
    __tablename__ = 'cameras'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    camera_id = db.Column(db.String(100), unique=True, nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    
    # معلومات الكاميرا
    camera_type = db.Column(db.Enum(CameraType), default=CameraType.FIXED)
    location = db.Column(db.String(200))  # الموقع داخل الفرع
    description = db.Column(db.Text)
    
    # المواصفات التقنية
    ip_address = db.Column(db.String(45))
    port = db.Column(db.Integer, default=554)
    rtsp_url = db.Column(db.String(500))
    username = db.Column(db.String(100))
    password = db.Column(db.String(200))  # مشفر
    
    # إعدادات التسجيل
    recording_quality = db.Column(db.Enum(RecordingQuality), default=RecordingQuality.HIGH)
    recording_enabled = db.Column(db.Boolean, default=True)
    motion_detection = db.Column(db.Boolean, default=True)
    audio_recording = db.Column(db.Boolean, default=False)
    
    # الحالة والمراقبة
    status = db.Column(db.Enum(CameraStatus), default=CameraStatus.OFFLINE)
    last_seen = db.Column(db.DateTime)
    uptime_percentage = db.Column(db.Float, default=0.0)
    
    # إعدادات المشاركة
    is_shared = db.Column(db.Boolean, default=False)
    shared_with_branches = db.Column(db.JSON)  # قائمة معرفات الفروع
    
    # بيانات إضافية
    firmware_version = db.Column(db.String(50))
    model = db.Column(db.String(100))
    manufacturer = db.Column(db.String(100))
    installation_date = db.Column(db.Date)
    warranty_expiry = db.Column(db.Date)
    
    # إحداثيات الموقع
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    floor_level = db.Column(db.String(20))
    zone = db.Column(db.String(100))
    
    # بيانات تقنية
    extra_metadata = db.Column(db.JSON)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    branch = db.relationship('Branch', backref='cameras')
    
    def __repr__(self):
        return f'<Camera {self.name} ({self.camera_id})>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'camera_id': self.camera_id,
            'branch_id': self.branch_id,
            'camera_type': self.camera_type.value if self.camera_type else None,
            'location': self.location,
            'description': self.description,
            'ip_address': self.ip_address,
            'port': self.port,
            'rtsp_url': self.rtsp_url,
            'recording_quality': self.recording_quality.value if self.recording_quality else None,
            'recording_enabled': self.recording_enabled,
            'motion_detection': self.motion_detection,
            'audio_recording': self.audio_recording,
            'status': self.status.value if self.status else None,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'uptime_percentage': self.uptime_percentage,
            'is_shared': self.is_shared,
            'shared_with_branches': self.shared_with_branches,
            'firmware_version': self.firmware_version,
            'model': self.model,
            'manufacturer': self.manufacturer,
            'installation_date': self.installation_date.isoformat() if self.installation_date else None,
            'warranty_expiry': self.warranty_expiry.isoformat() if self.warranty_expiry else None,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'floor_level': self.floor_level,
            'zone': self.zone,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class CameraAccess(db.Model):
    """نموذج صلاحيات الوصول للكاميرات"""
    __tablename__ = 'camera_access'
    
    id = db.Column(db.Integer, primary_key=True)
    camera_id = db.Column(db.Integer, db.ForeignKey('cameras.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    
    # مستوى الوصول
    access_level = db.Column(db.Enum(AccessLevel), default=AccessLevel.VIEW_ONLY)
    
    # أوقات الوصول
    access_start_time = db.Column(db.Time)  # بداية الوقت المسموح يومياً
    access_end_time = db.Column(db.Time)    # نهاية الوقت المسموح يومياً
    allowed_days = db.Column(db.JSON)       # أيام الأسبوع المسموحة
    
    # صلاحيات محددة
    can_view_live = db.Column(db.Boolean, default=True)
    can_view_recordings = db.Column(db.Boolean, default=True)
    can_control_camera = db.Column(db.Boolean, default=False)
    can_download_recordings = db.Column(db.Boolean, default=False)
    can_delete_recordings = db.Column(db.Boolean, default=False)
    
    # معلومات الموافقة
    granted_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    granted_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    
    is_active = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    camera = db.relationship('Camera', backref='access_permissions')
    user = db.relationship('User', foreign_keys=[user_id], backref='camera_accesses')
    branch = db.relationship('Branch', backref='camera_accesses')
    granter = db.relationship('User', foreign_keys=[granted_by])
    
    __table_args__ = (
        db.UniqueConstraint('camera_id', 'user_id', name='unique_camera_user_access'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'camera_id': self.camera_id,
            'user_id': self.user_id,
            'branch_id': self.branch_id,
            'access_level': self.access_level.value if self.access_level else None,
            'access_start_time': self.access_start_time.isoformat() if self.access_start_time else None,
            'access_end_time': self.access_end_time.isoformat() if self.access_end_time else None,
            'allowed_days': self.allowed_days,
            'can_view_live': self.can_view_live,
            'can_view_recordings': self.can_view_recordings,
            'can_control_camera': self.can_control_camera,
            'can_download_recordings': self.can_download_recordings,
            'can_delete_recordings': self.can_delete_recordings,
            'granted_by': self.granted_by,
            'granted_at': self.granted_at.isoformat() if self.granted_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Recording(db.Model):
    """نموذج التسجيلات"""
    __tablename__ = 'recordings'
    
    id = db.Column(db.Integer, primary_key=True)
    camera_id = db.Column(db.Integer, db.ForeignKey('cameras.id'), nullable=False)
    
    # معلومات التسجيل
    filename = db.Column(db.String(500), nullable=False)
    file_path = db.Column(db.String(1000), nullable=False)
    file_size = db.Column(db.BigInteger)  # بالبايت
    duration_seconds = db.Column(db.Integer)
    
    # أوقات التسجيل
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    
    # جودة ومعلومات تقنية
    quality = db.Column(db.Enum(RecordingQuality))
    resolution = db.Column(db.String(20))  # مثل 1920x1080
    fps = db.Column(db.Integer)  # إطارات في الثانية
    bitrate = db.Column(db.Integer)  # كيلوبت في الثانية
    
    # نوع التسجيل
    is_continuous = db.Column(db.Boolean, default=True)
    is_motion_triggered = db.Column(db.Boolean, default=False)
    is_alert_triggered = db.Column(db.Boolean, default=False)
    
    # حالة التسجيل
    is_archived = db.Column(db.Boolean, default=False)
    is_backed_up = db.Column(db.Boolean, default=False)
    backup_location = db.Column(db.String(500))
    
    # معلومات إضافية
    thumbnail_path = db.Column(db.String(500))
    has_audio = db.Column(db.Boolean, default=False)
    encryption_key = db.Column(db.String(500))  # للتسجيلات المشفرة
    
    # بيانات تحليلية
    motion_events_count = db.Column(db.Integer, default=0)
    face_detections_count = db.Column(db.Integer, default=0)
    analysis_data = db.Column(db.JSON)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    camera = db.relationship('Camera', backref='recordings')
    
    def to_dict(self):
        return {
            'id': self.id,
            'camera_id': self.camera_id,
            'filename': self.filename,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'duration_seconds': self.duration_seconds,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'quality': self.quality.value if self.quality else None,
            'resolution': self.resolution,
            'fps': self.fps,
            'bitrate': self.bitrate,
            'is_continuous': self.is_continuous,
            'is_motion_triggered': self.is_motion_triggered,
            'is_alert_triggered': self.is_alert_triggered,
            'is_archived': self.is_archived,
            'is_backed_up': self.is_backed_up,
            'backup_location': self.backup_location,
            'thumbnail_path': self.thumbnail_path,
            'has_audio': self.has_audio,
            'motion_events_count': self.motion_events_count,
            'face_detections_count': self.face_detections_count,
            'analysis_data': self.analysis_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class SurveillanceAlert(db.Model):
    """نموذج تنبيهات المراقبة"""
    __tablename__ = 'surveillance_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    camera_id = db.Column(db.Integer, db.ForeignKey('cameras.id'), nullable=False)
    
    # نوع وشدة التنبيه
    alert_type = db.Column(db.Enum(AlertType), nullable=False)
    severity = db.Column(db.Enum(AlertSeverity), default=AlertSeverity.MEDIUM)
    
    # معلومات التنبيه
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # وقت التنبيه
    detected_at = db.Column(db.DateTime, nullable=False)
    resolved_at = db.Column(db.DateTime)
    
    # بيانات إضافية
    snapshot_path = db.Column(db.String(500))  # صورة من وقت التنبيه
    video_clip_path = db.Column(db.String(500))  # مقطع فيديو قصير
    
    # معلومات التحليل
    confidence_score = db.Column(db.Float)  # درجة الثقة في التنبيه
    detection_data = db.Column(db.JSON)  # بيانات الكشف التفصيلية
    
    # حالة التنبيه
    is_acknowledged = db.Column(db.Boolean, default=False)
    acknowledged_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    acknowledged_at = db.Column(db.DateTime)
    
    is_false_positive = db.Column(db.Boolean, default=False)
    resolution_notes = db.Column(db.Text)
    
    # إعدادات الإشعار
    notification_sent = db.Column(db.Boolean, default=False)
    notified_users = db.Column(db.JSON)  # قائمة المستخدمين المُشعرين
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    camera = db.relationship('Camera', backref='alerts')
    acknowledger = db.relationship('User', foreign_keys=[acknowledged_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'camera_id': self.camera_id,
            'alert_type': self.alert_type.value if self.alert_type else None,
            'severity': self.severity.value if self.severity else None,
            'title': self.title,
            'description': self.description,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'snapshot_path': self.snapshot_path,
            'video_clip_path': self.video_clip_path,
            'confidence_score': self.confidence_score,
            'detection_data': self.detection_data,
            'is_acknowledged': self.is_acknowledged,
            'acknowledged_by': self.acknowledged_by,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'is_false_positive': self.is_false_positive,
            'resolution_notes': self.resolution_notes,
            'notification_sent': self.notification_sent,
            'notified_users': self.notified_users,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class LiveViewSession(db.Model):
    """نموذج جلسات المشاهدة المباشرة"""
    __tablename__ = 'live_view_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    camera_id = db.Column(db.Integer, db.ForeignKey('cameras.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # معلومات الجلسة
    session_token = db.Column(db.String(500), unique=True, nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    duration_seconds = db.Column(db.Integer)
    
    # معلومات الاتصال
    client_ip = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    
    # إحصائيات الجلسة
    data_transferred_mb = db.Column(db.Float, default=0.0)
    average_bitrate = db.Column(db.Integer)
    connection_quality = db.Column(db.String(20))  # excellent, good, fair, poor
    
    # حالة الجلسة
    is_active = db.Column(db.Boolean, default=True)
    disconnect_reason = db.Column(db.String(200))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    camera = db.relationship('Camera', backref='live_sessions')
    user = db.relationship('User', backref='live_view_sessions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'camera_id': self.camera_id,
            'user_id': self.user_id,
            'session_token': self.session_token,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration_seconds': self.duration_seconds,
            'client_ip': self.client_ip,
            'user_agent': self.user_agent,
            'data_transferred_mb': self.data_transferred_mb,
            'average_bitrate': self.average_bitrate,
            'connection_quality': self.connection_quality,
            'is_active': self.is_active,
            'disconnect_reason': self.disconnect_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class CameraGroup(db.Model):
    """نموذج مجموعات الكاميرات"""
    __tablename__ = 'camera_groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # معلومات المجموعة
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # الكاميرات في المجموعة
    camera_ids = db.Column(db.JSON)  # قائمة معرفات الكاميرات
    
    # إعدادات المجموعة
    is_shared = db.Column(db.Boolean, default=False)
    shared_with_branches = db.Column(db.JSON)
    
    # إعدادات التسجيل الموحد
    recording_schedule = db.Column(db.JSON)  # جدول التسجيل
    motion_detection_enabled = db.Column(db.Boolean, default=True)
    alert_notifications = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    branch = db.relationship('Branch', backref='camera_groups')
    creator = db.relationship('User', backref='created_camera_groups')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'branch_id': self.branch_id,
            'created_by': self.created_by,
            'camera_ids': self.camera_ids,
            'is_shared': self.is_shared,
            'shared_with_branches': self.shared_with_branches,
            'recording_schedule': self.recording_schedule,
            'motion_detection_enabled': self.motion_detection_enabled,
            'alert_notifications': self.alert_notifications,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class SurveillanceReport(db.Model):
    """نموذج تقارير المراقبة"""
    __tablename__ = 'surveillance_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # نطاق التقرير
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    camera_ids = db.Column(db.JSON)  # الكاميرات المشمولة
    
    # فترة التقرير
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    
    # نوع التقرير
    report_type = db.Column(db.String(100))  # activity, alerts, usage, maintenance
    
    # بيانات التقرير
    report_data = db.Column(db.JSON)
    summary_statistics = db.Column(db.JSON)
    
    # معلومات الإنشاء
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ملف التقرير
    file_path = db.Column(db.String(500))
    file_format = db.Column(db.String(20), default='pdf')
    
    # العلاقات
    branch = db.relationship('Branch', backref='surveillance_reports')
    creator = db.relationship('User', backref='created_surveillance_reports')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'branch_id': self.branch_id,
            'camera_ids': self.camera_ids,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'report_type': self.report_type,
            'report_data': self.report_data,
            'summary_statistics': self.summary_statistics,
            'created_by': self.created_by,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'file_path': self.file_path,
            'file_format': self.file_format
        }
