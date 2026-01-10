from datetime import datetime, date
from sqlalchemy import CheckConstraint

# Import centralized database instance
from database import db

# Import all models to ensure they are registered with SQLAlchemy
from rehabilitation_programs_models import *

# Import session scheduling models
# Note: comprehensive_rehabilitation_models imported separately in app.py to avoid circular imports

# Import family portal models
from family_portal_models import *
from appointments_calendar_models import *
from speech_therapy_models import *

# Import performance monitoring models
from performance_monitoring_models import *
from workflow_templates_models import *

# نموذج المستخدمين الأساسي
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    national_id = db.Column(db.String(20), unique=True, nullable=False)  # رقم الهوية
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='teacher')  # admin, teacher, supervisor
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    photo = db.Column(db.String(200))  # مسار الصورة
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# نموذج السنة الدراسية
class AcademicYear(db.Model):
    __tablename__ = 'academic_years'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # مثل "2023-2024"
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    students = db.relationship('Student', backref='academic_year', lazy=True)
    classrooms = db.relationship('Classroom', backref='academic_year', lazy=True)

    teachers = db.relationship('Teacher', backref='branch', lazy=True)
    vehicles = db.relationship('Vehicle', backref='branch', lazy=True)

# نموذج المركبات
class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    
    id = db.Column(db.Integer, primary_key=True)
    plate_number = db.Column(db.String(20), unique=True, nullable=False)  # رقم اللوحة
    vehicle_type = db.Column(db.String(50), nullable=False)  # نوع المركبة (باص، سيارة، إلخ)
    brand = db.Column(db.String(50))  # الماركة
    model = db.Column(db.String(50))  # الموديل
    year = db.Column(db.Integer)  # سنة الصنع
    color = db.Column(db.String(30))  # اللون
    capacity = db.Column(db.Integer, default=0)  # السعة
    driver_name = db.Column(db.String(100))  # اسم السائق
    driver_phone = db.Column(db.String(20))  # هاتف السائق
    driver_license = db.Column(db.String(50))  # رقم رخصة السائق
    insurance_expiry = db.Column(db.Date)  # تاريخ انتهاء التأمين
    license_expiry = db.Column(db.Date)  # تاريخ انتهاء الرخصة
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'))
    is_active = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student_transports = db.relationship('StudentTransport', backref='vehicle', lazy=True)

# نموذج المستويات التعليمية
class Level(db.Model):
    __tablename__ = 'levels'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text)
    age_range_min = db.Column(db.Integer)  # العمر الأدنى
    age_range_max = db.Column(db.Integer)  # العمر الأعلى
    order_index = db.Column(db.Integer, default=0)  # ترتيب المستوى
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    classrooms = db.relationship('Classroom', backref='level', lazy=True)
    skills = db.relationship('Skill', backref='level', lazy=True)

# نموذج الفصول الدراسية
class Classroom(db.Model):
    __tablename__ = 'classrooms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    level_id = db.Column(db.Integer, db.ForeignKey('levels.id'), nullable=False)
    capacity = db.Column(db.Integer, default=20)
    current_count = db.Column(db.Integer, default=0)  # العدد الحالي للطلاب
    academic_year_id = db.Column(db.Integer, db.ForeignKey('academic_years.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'))
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'))
    room_number = db.Column(db.String(20))  # رقم الغرفة
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    students = db.relationship('Student', backref='classroom', lazy=True)

# نموذج المعلمين
class Teacher(db.Model):
    __tablename__ = 'teachers'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    national_id = db.Column(db.String(20), unique=True, nullable=False)
    specialization = db.Column(db.String(100))
    qualification = db.Column(db.String(100))
    experience_years = db.Column(db.Integer)
    hire_date = db.Column(db.Date)
    salary = db.Column(db.Float)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'))
    profile_image = db.Column(db.String(255))  # Path to profile image
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User', backref='teacher_profile')
    classrooms = db.relationship('Classroom', backref='teacher', lazy=True)
    assessments = db.relationship('Assessment', backref='assessor', lazy=True)

# نموذج الطلاب
class Student(db.Model):
    __tablename__ = 'students'
    
    id = db.Column(db.Integer, primary_key=True)
    national_id = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    disability_type = db.Column(db.String(100))
    severity_level = db.Column(db.String(50))
    medical_info = db.Column(db.Text)
    guardian_name = db.Column(db.String(100), nullable=False)
    guardian_phone = db.Column(db.String(20), nullable=False)
    guardian_email = db.Column(db.String(100))
    address = db.Column(db.Text)
    enrollment_date = db.Column(db.Date, default=date.today)
    status = db.Column(db.String(20), default='نشط')
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'))
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'))
    notes = db.Column(db.Text)
    profile_image = db.Column(db.String(255))  # Path to profile image
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    classroom = db.relationship('Classroom', backref='enrolled_students')
    
    # العلاقات
    assessments = db.relationship('Assessment', backref='student', lazy=True)
    individual_plans = db.relationship('IndividualPlan', backref='student', lazy=True)
    weekly_plans = db.relationship('WeeklyPlan', backref='student', lazy=True)
    daily_followups = db.relationship('DailyFollowUp', backref='student', lazy=True)

# نموذج مجالات المهارات
class SkillDomain(db.Model):
    __tablename__ = 'skill_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    order_index = db.Column(db.Integer, default=0)  # ترتيب العرض
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    skills = db.relationship('Skill', backref='domain', lazy=True, order_by='Skill.skill_number')


# نموذج الخطة الفردية
class IndividualPlan(db.Model):
    __tablename__ = 'individual_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_name = db.Column(db.String(200), nullable=False)  # اسم عام للخطة
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'))
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'))
    academic_year_id = db.Column(db.Integer, db.ForeignKey('academic_years.id'), nullable=False)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='نشط')  # نشط، مكتمل، متوقف
    notes = db.Column(db.Text)
    created_by = db.Column(db.String(100))
    created_date = db.Column(db.Date, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    teacher = db.relationship('Teacher', backref='individual_plans')
    classroom = db.relationship('Classroom', backref='individual_plans')
    academic_year = db.relationship('AcademicYear', backref='individual_plans')
    plan_skills = db.relationship('IndividualPlanSkill', backref='plan', lazy=True, cascade='all, delete-orphan')

# نموذج مهارات الخطة الفردية
class IndividualPlanSkill(db.Model):
    __tablename__ = 'individual_plan_skills'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('individual_plans.id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id'), nullable=False)
    current_level = db.Column(db.String(50))  # المستوى الحالي
    target_level = db.Column(db.String(50))   # المستوى المستهدف
    priority = db.Column(db.String(20), default='medium')  # high, medium, low
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    skill = db.relationship('Skill', backref='plan_skills')

# نموذج الخطة الأسبوعية
class WeeklyPlan(db.Model):
    __tablename__ = 'weekly_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'))
    week_number = db.Column(db.Integer, nullable=False)
    week_start_date = db.Column(db.Date, nullable=False)
    week_end_date = db.Column(db.Date, nullable=False)
    academic_year_id = db.Column(db.Integer, db.ForeignKey('academic_years.id'), nullable=False)
    status = db.Column(db.String(20), default='نشط')  # نشط، مكتمل
    notes = db.Column(db.Text)
    created_by = db.Column(db.String(100))
    created_date = db.Column(db.Date, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    teacher = db.relationship('Teacher', backref='weekly_plans')
    academic_year = db.relationship('AcademicYear', backref='weekly_plans')
    weekly_skills = db.relationship('WeeklyPlanSkill', backref='weekly_plan', lazy=True, cascade='all, delete-orphan')

# نموذج مهارات الخطة الأسبوعية
class WeeklyPlanSkill(db.Model):
    __tablename__ = 'weekly_plan_skills'
    
    id = db.Column(db.Integer, primary_key=True)
    weekly_plan_id = db.Column(db.Integer, db.ForeignKey('weekly_plans.id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id'), nullable=False)
    target_response = db.Column(db.String(100))  # الاستجابة المستهدفة
    actual_response = db.Column(db.String(100))  # الاستجابة الفعلية
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    skill = db.relationship('Skill', backref='weekly_plan_skills')















# جدول ربط الأدوار والصلاحيات
role_permissions = db.Table('role_permissions',
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True),
    db.Column('permission_id', db.Integer, db.ForeignKey('permissions.id'), primary_key=True)
)

# نظام إدارة الموارد البشرية




# نظام التواصل والإشعارات
class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)  # info, warning, success, error
    target_type = db.Column(db.String(50), nullable=False)  # all, role, user, parent, student
    target_id = db.Column(db.Integer)  # ID of specific target if applicable
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime)
    scheduled_at = db.Column(db.DateTime)  # للإشعارات المجدولة
    sent_at = db.Column(db.DateTime)
    delivery_method = db.Column(db.String(50), default='app')  # app, email, sms, push
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    sender = db.relationship('User', backref='sent_notifications')


class ChatRoom(db.Model):
    __tablename__ = 'chat_rooms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    room_type = db.Column(db.String(50), nullable=False)  # private, group, public, support
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    max_participants = db.Column(db.Integer, default=100)
    settings = db.Column(db.Text)  # JSON settings
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    creator = db.relationship('User', backref='created_chat_rooms')
    
    def __repr__(self):
        return f'<ChatRoom {self.id}: {self.name}>'

class ChatParticipant(db.Model):
    __tablename__ = 'chat_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(50), default='member')  # admin, moderator, member
    is_active = db.Column(db.Boolean, default=True)
    is_muted = db.Column(db.Boolean, default=False)
    last_seen_at = db.Column(db.DateTime)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    room = db.relationship('ChatRoom', backref='participants')
    user = db.relationship('User', backref='chat_participations')
    
    __table_args__ = (db.UniqueConstraint('room_id', 'user_id', name='unique_room_participant'),)
    
    def __repr__(self):
        return f'<ChatParticipant {self.user_id} in {self.room_id}>'

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(50), default='text')  # text, image, file, system, voice
    reply_to_id = db.Column(db.Integer, db.ForeignKey('chat_messages.id'))
    attachments = db.Column(db.Text)  # JSON array of attachments
    extra_metadata = db.Column(db.Text)  # JSON metadata
    is_edited = db.Column(db.Boolean, default=False)
    edited_at = db.Column(db.DateTime)
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    room = db.relationship('ChatRoom', backref='messages')
    sender = db.relationship('User', backref='chat_messages')
    reply_to = db.relationship('ChatMessage', remote_side=[id], backref='replies')
    
    def __repr__(self):
        return f'<ChatMessage {self.id} in room {self.room_id}>'

class MessageDeliveryStatus(db.Model):
    __tablename__ = 'message_delivery_status'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('chat_messages.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False)  # sent, delivered, read
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    message = db.relationship('ChatMessage', backref='delivery_statuses')
    user = db.relationship('User', backref='message_statuses')
    
    __table_args__ = (db.UniqueConstraint('message_id', 'user_id', 'status', name='unique_message_user_status'),)
    
    def __repr__(self):
        return f'<MessageDeliveryStatus {self.message_id}-{self.user_id}: {self.status}>'

class NotificationTemplate(db.Model):
    __tablename__ = 'notification_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    title_template = db.Column(db.String(200), nullable=False)
    message_template = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)
    default_priority = db.Column(db.String(20), default='normal')
    default_channels = db.Column(db.Text)  # JSON array of default delivery channels
    variables = db.Column(db.Text)  # JSON array of template variables
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<NotificationTemplate {self.name}>'

class UserNotificationSettings(db.Model):
    __tablename__ = 'user_notification_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    email_notifications = db.Column(db.Boolean, default=True)
    sms_notifications = db.Column(db.Boolean, default=False)
    push_notifications = db.Column(db.Boolean, default=True)
    in_app_notifications = db.Column(db.Boolean, default=True)
    sound_notifications = db.Column(db.Boolean, default=True)
    desktop_notifications = db.Column(db.Boolean, default=True)
    notification_frequency = db.Column(db.String(20), default='immediate')  # immediate, hourly, daily
    quiet_hours_start = db.Column(db.Time)
    quiet_hours_end = db.Column(db.Time)
    notification_types = db.Column(db.Text)  # JSON object with type-specific settings
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref=db.backref('notification_settings', uselist=False))
    
    def __repr__(self):
        return f'<UserNotificationSettings for user {self.user_id}>'

class NotificationQueue(db.Model):
    __tablename__ = 'notification_queue'
    
    id = db.Column(db.Integer, primary_key=True)
    notification_id = db.Column(db.Integer, db.ForeignKey('realtime_notifications.id'), nullable=False)
    channel = db.Column(db.String(50), nullable=False)  # app, email, sms, push
    status = db.Column(db.String(20), default='pending')  # pending, processing, sent, failed
    attempts = db.Column(db.Integer, default=0)
    max_attempts = db.Column(db.Integer, default=3)
    scheduled_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime)
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    notification = db.relationship('RealTimeNotification', backref='queue_items')
    
    def __repr__(self):
        return f'<NotificationQueue {self.id}: {self.channel} - {self.status}>'

# نظام إدارة المحتوى والمكتبة الرقمية
class ContentCategory(db.Model):
    __tablename__ = 'content_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    name_ar = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    parent_id = db.Column(db.Integer, db.ForeignKey('content_categories.id'))
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    parent = db.relationship('ContentCategory', remote_side=[id], backref='subcategories')
    content_items = db.relationship('ContentItem', backref='category')

class ContentItem(db.Model):
    __tablename__ = 'content_items'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    content_type = db.Column(db.String(50), nullable=False)  # document, video, audio, image, link
    file_path = db.Column(db.String(500))
    file_size = db.Column(db.Integer)  # in bytes
    mime_type = db.Column(db.String(100))
    url = db.Column(db.String(500))  # for external links
    category_id = db.Column(db.Integer, db.ForeignKey('content_categories.id'))
    author = db.Column(db.String(100))
    tags = db.Column(db.Text)  # JSON array of tags
    access_level = db.Column(db.String(50), default='public')  # public, teachers, admin
    download_count = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)
    is_featured = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# نظام إدارة المخزون والأصول

class Asset(db.Model):
    __tablename__ = 'assets'
    
    id = db.Column(db.Integer, primary_key=True)
    asset_code = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey('asset_categories.id'), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'))
    purchase_date = db.Column(db.Date)
    purchase_price = db.Column(db.Float)
    current_value = db.Column(db.Float)
    vendor = db.Column(db.String(100))
    warranty_expiry = db.Column(db.Date)
    location = db.Column(db.String(200))
    responsible_person = db.Column(db.String(100))
    condition = db.Column(db.String(50), default='جيد')  # ممتاز، جيد، مقبول، يحتاج صيانة، تالف
    status = db.Column(db.String(50), default='نشط')  # نشط، معطل، مباع، مفقود
    maintenance_schedule = db.Column(db.String(50))  # شهري، ربع سنوي، نصف سنوي، سنوي
    last_maintenance = db.Column(db.Date)
    next_maintenance = db.Column(db.Date)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    branch = db.relationship('Branch', backref='assets')
    maintenance_records = db.relationship('AssetMaintenance', backref='asset')

class AssetMaintenance(db.Model):
    __tablename__ = 'asset_maintenance'
    
    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id'), nullable=False)
    maintenance_date = db.Column(db.Date, nullable=False)
    maintenance_type = db.Column(db.String(50), nullable=False)  # دورية، إصلاح، استبدال قطع
    description = db.Column(db.Text, nullable=False)
    cost = db.Column(db.Float)
    performed_by = db.Column(db.String(100))
    vendor = db.Column(db.String(100))
    next_maintenance_date = db.Column(db.Date)
    parts_replaced = db.Column(db.Text)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class InventoryItem(db.Model):
    __tablename__ = 'inventory_items'
    
    id = db.Column(db.Integer, primary_key=True)
    item_code = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100), nullable=False)  # مواد تعليمية، قرطاسية، تنظيف، طعام
    unit = db.Column(db.String(50), nullable=False)  # قطعة، كيلو، لتر، علبة
    current_stock = db.Column(db.Float, default=0)
    minimum_stock = db.Column(db.Float, default=0)
    maximum_stock = db.Column(db.Float, default=0)
    unit_price = db.Column(db.Float)
    supplier = db.Column(db.String(100))
    storage_location = db.Column(db.String(100))
    expiry_date = db.Column(db.Date)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    transactions = db.relationship('InventoryTransaction', backref='item')

class InventoryTransaction(db.Model):
    __tablename__ = 'inventory_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('inventory_items.id'), nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # in, out, adjustment
    quantity = db.Column(db.Float, nullable=False)
    unit_price = db.Column(db.Float)
    total_amount = db.Column(db.Float)
    reference_number = db.Column(db.String(100))
    notes = db.Column(db.Text)
    performed_by = db.Column(db.String(100))
    transaction_date = db.Column(db.Date, nullable=False, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# نظام إدارة الأنشطة والفعاليات
class Activity(db.Model):
    __tablename__ = 'activities'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    activity_type = db.Column(db.String(50), nullable=False)  # تعليمي، ترفيهي، رياضي، ثقافي، رحلة
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)
    location = db.Column(db.String(200))
    max_participants = db.Column(db.Integer)
    current_participants = db.Column(db.Integer, default=0)
    age_group = db.Column(db.String(50))  # 3-4 سنوات، 5-6 سنوات، جميع الأعمار
    cost_per_participant = db.Column(db.Float, default=0)
    total_cost = db.Column(db.Float, default=0)
    organizer = db.Column(db.String(100))
    status = db.Column(db.String(20), default='مخطط')  # مخطط، جاري، مكتمل، ملغي
    registration_deadline = db.Column(db.Date)
    requirements = db.Column(db.Text)  # متطلبات المشاركة
    notes = db.Column(db.Text)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'))
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    branch = db.relationship('Branch', backref='activities')
    participants = db.relationship('ActivityParticipant', backref='activity')

class ActivityParticipant(db.Model):
    __tablename__ = 'activity_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    registration_date = db.Column(db.Date, nullable=False, default=date.today)
    attendance_status = db.Column(db.String(20), default='مسجل')  # مسجل، حاضر، غائب، ملغي
    payment_status = db.Column(db.String(20), default='غير مدفوع')  # مدفوع، غير مدفوع، معفى
    notes = db.Column(db.Text)
    registered_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    student = db.relationship('Student', backref='activity_participations')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('activity_id', 'student_id', name='unique_activity_participant'),)

# نظام إدارة المواعيد والتقويم
    
    # Relations
    organizer = db.relationship('User', backref='organized_appointments')
    student = db.relationship('Student', backref='appointments')
    attendees = db.relationship('AppointmentAttendee', backref='appointment')

class AppointmentAttendee(db.Model):
    __tablename__ = 'appointment_attendees'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    attendance_status = db.Column(db.String(20), default='مدعو')  # مدعو، مؤكد، حاضر، غائب
    response_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    
    # Relations
    user = db.relationship('User', backref='appointment_attendances')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('appointment_id', 'user_id', name='unique_appointment_attendee'),)

class CalendarEvent(db.Model):
    __tablename__ = 'calendar_events'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    event_type = db.Column(db.String(50), nullable=False)  # holiday, exam, activity, meeting
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_all_day = db.Column(db.Boolean, default=True)
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)
    location = db.Column(db.String(200))
    color = db.Column(db.String(7), default='#007bff')  # hex color code
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_pattern = db.Column(db.String(50))  # daily, weekly, monthly, yearly
    target_audience = db.Column(db.String(50), default='all')  # all, students, parents, staff
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'))
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    branch = db.relationship('Branch', backref='calendar_events')

# نظام إدارة الجودة والتدقيق
class QualityStandard(db.Model):
    __tablename__ = 'quality_standards'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)  # تعليمي، صحي، أمان، بيئي
    criteria = db.Column(db.Text, nullable=False)  # JSON array of criteria
    minimum_score = db.Column(db.Float, default=70)  # الحد الأدنى للنجاح
    weight = db.Column(db.Float, default=1.0)  # وزن المعيار في التقييم العام
    is_mandatory = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    audits = db.relationship('QualityAudit', backref='standard')

class QualityAudit(db.Model):
    __tablename__ = 'quality_audits'
    
    id = db.Column(db.Integer, primary_key=True)
    audit_title = db.Column(db.String(200), nullable=False)
    audit_type = db.Column(db.String(50), nullable=False)  # internal, external, self_assessment
    standard_id = db.Column(db.Integer, db.ForeignKey('quality_standards.id'), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    audit_date = db.Column(db.Date, nullable=False)
    auditor_name = db.Column(db.String(100), nullable=False)
    auditor_credentials = db.Column(db.String(200))
    score_achieved = db.Column(db.Float)
    max_score = db.Column(db.Float)
    percentage_score = db.Column(db.Float)
    status = db.Column(db.String(20), default='مجدول')  # مجدول، جاري، مكتمل، معلق
    findings = db.Column(db.Text)  # JSON array of findings
    recommendations = db.Column(db.Text)
    action_plan = db.Column(db.Text)
    follow_up_date = db.Column(db.Date)
    compliance_status = db.Column(db.String(20))  # مطابق، غير مطابق، مطابق جزئياً
    attachments = db.Column(db.Text)  # JSON array of file paths
    notes = db.Column(db.Text)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    branch = db.relationship('Branch', backref='quality_audits')
    corrective_actions = db.relationship('CorrectiveAction', backref='audit')

class CorrectiveAction(db.Model):
    __tablename__ = 'corrective_actions'
    
    id = db.Column(db.Integer, primary_key=True)
    audit_id = db.Column(db.Integer, db.ForeignKey('quality_audits.id'), nullable=False)
    finding_description = db.Column(db.Text, nullable=False)
    action_required = db.Column(db.Text, nullable=False)
    responsible_person = db.Column(db.String(100), nullable=False)
    target_date = db.Column(db.Date, nullable=False)
    actual_completion_date = db.Column(db.Date)
    priority = db.Column(db.String(20), default='متوسط')  # عالي، متوسط، منخفض
    status = db.Column(db.String(20), default='مفتوح')  # مفتوح، جاري، مكتمل، مغلق
    verification_method = db.Column(db.String(200))
    verification_date = db.Column(db.Date)
    verified_by = db.Column(db.String(100))
    effectiveness_review = db.Column(db.Text)
    cost_estimate = db.Column(db.Float)
    actual_cost = db.Column(db.Float)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ComplianceChecklist(db.Model):
    __tablename__ = 'compliance_checklists'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    checklist_type = db.Column(db.String(50), nullable=False)  # safety, health, education, admin
    frequency = db.Column(db.String(50), nullable=False)  # daily, weekly, monthly, quarterly, yearly
    items = db.Column(db.Text, nullable=False)  # JSON array of checklist items
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'))
    is_mandatory = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    branch = db.relationship('Branch', backref='compliance_checklists')
    submissions = db.relationship('ChecklistSubmission', backref='checklist')

class ChecklistSubmission(db.Model):
    __tablename__ = 'checklist_submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    checklist_id = db.Column(db.Integer, db.ForeignKey('compliance_checklists.id'), nullable=False)
    submission_date = db.Column(db.Date, nullable=False, default=date.today)
    submitted_by = db.Column(db.String(100), nullable=False)
    responses = db.Column(db.Text, nullable=False)  # JSON array of responses
    overall_compliance = db.Column(db.Float)  # percentage
    non_compliant_items = db.Column(db.Text)  # JSON array of non-compliant items
    corrective_actions_needed = db.Column(db.Text)
    notes = db.Column(db.Text)
    reviewed_by = db.Column(db.String(100))
    review_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='مرسل')  # مرسل، مراجع، معتمد، يحتاج تصحيح
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# نظام النسخ الاحتياطي والأمان
    next_run = db.Column(db.DateTime)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    backup_logs = db.relationship('BackupLog', backref='schedule')

class BackupLog(db.Model):
    __tablename__ = 'backup_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('backup_schedules.id'), nullable=False)
    backup_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(20), nullable=False)  # success, failed, partial
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer)
    files_backed_up = db.Column(db.Integer)
    total_size_mb = db.Column(db.Float)
    compressed_size_mb = db.Column(db.Float)
    backup_file_path = db.Column(db.String(500))
    error_message = db.Column(db.Text)
    warnings = db.Column(db.Text)
    verification_status = db.Column(db.String(20))  # verified, failed, not_verified
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SecurityLog(db.Model):
    __tablename__ = 'security_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(50), nullable=False)  # login, logout, failed_login, data_access, data_modify
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    username = db.Column(db.String(100))
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    resource_accessed = db.Column(db.String(200))
    action_performed = db.Column(db.String(100))
    success = db.Column(db.Boolean, default=True)
    risk_level = db.Column(db.String(20), default='low')  # low, medium, high, critical
    details = db.Column(db.Text)
    session_id = db.Column(db.String(100))
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref='security_logs')


class AuditTrail(db.Model):
    __tablename__ = 'audit_trails'
    
    id = db.Column(db.Integer, primary_key=True)
    table_name = db.Column(db.String(100), nullable=False)
    record_id = db.Column(db.Integer, nullable=False)
    action = db.Column(db.String(20), nullable=False)  # INSERT, UPDATE, DELETE
    old_values = db.Column(db.Text)  # JSON of old values
    new_values = db.Column(db.Text)  # JSON of new values
    changed_fields = db.Column(db.Text)  # JSON array of changed field names
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    username = db.Column(db.String(100))
    ip_address = db.Column(db.String(45))
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref='audit_trails')

# نظام التكامل مع الأنظمة الخارجية
class ExternalSystem(db.Model):
    __tablename__ = 'external_systems'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    system_type = db.Column(db.String(50), nullable=False)  # payment, sms, email, government
    description = db.Column(db.Text)
    api_endpoint = db.Column(db.String(500))
    api_key = db.Column(db.String(500))  # encrypted
    api_secret = db.Column(db.String(500))  # encrypted
    configuration = db.Column(db.Text)  # JSON configuration
    is_active = db.Column(db.Boolean, default=True)
    last_sync = db.Column(db.DateTime)
    sync_frequency = db.Column(db.String(50))  # hourly, daily, weekly, manual
    status = db.Column(db.String(20), default='connected')  # connected, disconnected, error
    error_message = db.Column(db.Text)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    integration_logs = db.relationship('IntegrationLog', backref='system')

class IntegrationLog(db.Model):
    __tablename__ = 'integration_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    system_id = db.Column(db.Integer, db.ForeignKey('external_systems.id'), nullable=False)
    operation_type = db.Column(db.String(50), nullable=False)  # sync, send, receive, authenticate
    operation_details = db.Column(db.Text)
    request_data = db.Column(db.Text)  # JSON of request sent
    response_data = db.Column(db.Text)  # JSON of response received
    status = db.Column(db.String(20), nullable=False)  # success, failed, partial
    error_message = db.Column(db.Text)
    processing_time_ms = db.Column(db.Integer)
    records_processed = db.Column(db.Integer)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class DataAnalytics(db.Model):
    __tablename__ = 'data_analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    report_name = db.Column(db.String(200), nullable=False)
    report_type = db.Column(db.String(50), nullable=False)  # dashboard, trend_analysis, comparative
    data_source = db.Column(db.String(100), nullable=False)  # students, attendance, finance, vehicles
    filters_applied = db.Column(db.Text)  # JSON of filters
    metrics_calculated = db.Column(db.Text, nullable=False)  # JSON of metrics
    results = db.Column(db.Text, nullable=False)  # JSON of results
    insights = db.Column(db.Text)  # AI-generated insights
    recommendations = db.Column(db.Text)  # AI-generated recommendations
    visualization_config = db.Column(db.Text)  # JSON for chart configurations
    is_scheduled = db.Column(db.Boolean, default=False)
    schedule_frequency = db.Column(db.String(50))  # daily, weekly, monthly
    next_run = db.Column(db.DateTime)
    generated_by = db.Column(db.String(100))
    generated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

# نظام أرشفة المستندات والتوقيع الرقمي
class DocumentCategory(db.Model):
    __tablename__ = 'document_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    parent_id = db.Column(db.Integer, db.ForeignKey('document_categories.id'))
    color = db.Column(db.String(7), default='#007bff')
    icon = db.Column(db.String(50), default='folder')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    parent = db.relationship('DocumentCategory', remote_side=[id], backref='subcategories')
    documents = db.relationship('Document', backref='category', lazy=True)

class Document(db.Model):
    __tablename__ = 'documents'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    document_number = db.Column(db.String(50), unique=True)
    category_id = db.Column(db.Integer, db.ForeignKey('document_categories.id'))
    document_type = db.Column(db.String(50), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(200), nullable=False)
    file_size = db.Column(db.Integer)
    file_format = db.Column(db.String(20))
    mime_type = db.Column(db.String(100))
    
    issue_date = db.Column(db.Date)
    expiry_date = db.Column(db.Date)
    reminder_days = db.Column(db.Integer, default=30)
    
    status = db.Column(db.String(20), default='active')
    is_confidential = db.Column(db.Boolean, default=False)
    is_signed = db.Column(db.Boolean, default=False)
    is_stamped = db.Column(db.Boolean, default=False)
    
    tags = db.Column(db.JSON)
    extra_metadata = db.Column(db.JSON)
    version = db.Column(db.String(20), default='1.0')
    
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_documents')
    updater = db.relationship('User', foreign_keys=[updated_by], backref='updated_documents')
    signatures = db.relationship('DocumentSignature', backref='document', lazy=True, cascade='all, delete-orphan')
    stamps = db.relationship('DocumentStamp', backref='document', lazy=True, cascade='all, delete-orphan')
    versions = db.relationship('DocumentVersion', backref='document', lazy=True, cascade='all, delete-orphan')
    reminders = db.relationship('DocumentReminder', backref='document', lazy=True, cascade='all, delete-orphan')
    access_logs = db.relationship('DocumentAccessLog', backref='document', lazy=True, cascade='all, delete-orphan')

class DocumentSignature(db.Model):
    __tablename__ = 'document_signatures'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    signer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    signature_type = db.Column(db.String(20), default='digital')
    signature_data = db.Column(db.Text)
    signature_position = db.Column(db.JSON)
    signature_reason = db.Column(db.String(200))
    signature_location = db.Column(db.String(100))
    
    signed_at = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    certificate_info = db.Column(db.JSON)
    is_valid = db.Column(db.Boolean, default=True)
    
    signer = db.relationship('User', backref='document_signatures')

class DocumentStamp(db.Model):
    __tablename__ = 'document_stamps'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    stamp_type = db.Column(db.String(50), nullable=False)
    stamp_text = db.Column(db.String(200))
    stamp_image = db.Column(db.Text)
    stamp_position = db.Column(db.JSON)
    
    stamped_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    stamped_at = db.Column(db.DateTime, default=datetime.utcnow)
    stamp_reason = db.Column(db.String(200))
    
    stamper = db.relationship('User', backref='document_stamps')

class DocumentVersion(db.Model):
    __tablename__ = 'document_versions'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    version_number = db.Column(db.String(20), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    change_description = db.Column(db.Text)
    
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_current = db.Column(db.Boolean, default=False)
    
    creator = db.relationship('User', backref='document_versions')

class DocumentReminder(db.Model):
    __tablename__ = 'document_reminders'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    reminder_type = db.Column(db.String(20), default='expiry')
    reminder_date = db.Column(db.DateTime, nullable=False)
    message = db.Column(db.Text)
    
    is_sent = db.Column(db.Boolean, default=False)
    sent_at = db.Column(db.DateTime)
    recipients = db.Column(db.JSON)
    
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    creator = db.relationship('User', backref='document_reminders')

class DocumentAccessLog(db.Model):
    __tablename__ = 'document_access_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    details = db.Column(db.JSON)
    
    accessed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='document_access_logs')

class DocumentTemplate(db.Model):
    __tablename__ = 'document_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    template_type = db.Column(db.String(50), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    preview_image = db.Column(db.String(500))
    
    fields = db.Column(db.JSON)
    default_values = db.Column(db.JSON)
    validation_rules = db.Column(db.JSON)
    
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    creator = db.relationship('User', backref='document_templates')

# نظام إدارة الفروع والمراكز
    
    # الحالة والإعدادات
    is_active = db.Column(db.Boolean, default=True)
    working_hours_start = db.Column(db.Time)
    working_hours_end = db.Column(db.Time)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    classrooms = db.relationship('Classroom', backref='branch', lazy=True, cascade='all, delete-orphan')
    teachers = db.relationship('Teacher', backref='branch', lazy=True)
    students = db.relationship('Student', backref='branch', lazy=True)
    administrators = db.relationship('Administrator', backref='branch', lazy=True)

# نظام إدارة الفصول الدراسية




# نظام إدارة الشعارات وإعدادات النظام
class SystemSettings(db.Model):
    __tablename__ = 'system_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(100), unique=True, nullable=False)
    setting_value = db.Column(db.Text)
    setting_type = db.Column(db.String(20), default='text')  # text, number, boolean, file, json
    category = db.Column(db.String(50), default='general')
    
    # وصف الإعداد
    display_name = db.Column(db.String(200))
    description = db.Column(db.Text)
    is_public = db.Column(db.Boolean, default=False)  # هل يمكن عرضه للمستخدمين العاديين
    
    # معلومات التحديث
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    updater = db.relationship('User', backref='updated_settings')

class Logo(db.Model):
    __tablename__ = 'logos'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    logo_type = db.Column(db.String(20), nullable=False)  # main, secondary, favicon, watermark
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(200), nullable=False)
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(50))
    
    # أبعاد الصورة
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    
    # إعدادات العرض
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    alt_text = db.Column(db.String(200))
    
    # معلومات الاستخدام
    usage_locations = db.Column(db.JSON)  # قائمة بالأماكن المستخدم فيها
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'))  # شعار خاص بفرع معين
    
    # معلومات التحديث
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    uploader = db.relationship('User', backref='uploaded_logos')
    branch = db.relationship('Branch', backref='logos')

class Theme(db.Model):
    __tablename__ = 'themes'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    display_name = db.Column(db.String(200))
    description = db.Column(db.Text)
    
    # ألوان النظام
    primary_color = db.Column(db.String(7), default='#007bff')  # اللون الأساسي
    secondary_color = db.Column(db.String(7), default='#6c757d')  # اللون الثانوي
    success_color = db.Column(db.String(7), default='#28a745')  # لون النجاح
    warning_color = db.Column(db.String(7), default='#ffc107')  # لون التحذير
    danger_color = db.Column(db.String(7), default='#dc3545')  # لون الخطر
    info_color = db.Column(db.String(7), default='#17a2b8')  # لون المعلومات
    
    # ألوان الخلفية
    background_color = db.Column(db.String(7), default='#ffffff')
    sidebar_color = db.Column(db.String(7), default='#343a40')
    navbar_color = db.Column(db.String(7), default='#007bff')
    
    # إعدادات الخط
    font_family = db.Column(db.String(100), default='Cairo')
    font_size_base = db.Column(db.String(10), default='14px')
    
    # إعدادات إضافية
    custom_css = db.Column(db.Text)  # CSS مخصص
    is_default = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # معلومات التحديث
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    creator = db.relationship('User', backref='created_themes')

class BrandingSettings(db.Model):
    __tablename__ = 'branding_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_name = db.Column(db.String(200))
    organization_name_en = db.Column(db.String(200))
    tagline = db.Column(db.String(500))
    tagline_en = db.Column(db.String(500))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    website = db.Column(db.String(200))
    address = db.Column(db.Text)
    
    # Social media links
    facebook_url = db.Column(db.String(200))
    twitter_url = db.Column(db.String(200))
    instagram_url = db.Column(db.String(200))
    linkedin_url = db.Column(db.String(200))
    
    # Display settings
    show_logo_in_header = db.Column(db.Boolean, default=True)
    show_logo_in_sidebar = db.Column(db.Boolean, default=True)
    show_logo_in_footer = db.Column(db.Boolean, default=False)
    show_organization_name = db.Column(db.Boolean, default=True)
    
    # Logo references
    main_logo_id = db.Column(db.Integer, db.ForeignKey('logos.id'))
    secondary_logo_id = db.Column(db.Integer, db.ForeignKey('logos.id'))
    favicon_id = db.Column(db.Integer, db.ForeignKey('logos.id'))
    watermark_logo_id = db.Column(db.Integer, db.ForeignKey('logos.id'))

    # Theme reference
    default_theme_id = db.Column(db.Integer, db.ForeignKey('themes.id'))

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # Relationships
    watermark_logo = db.relationship('Logo', foreign_keys=[watermark_logo_id], backref='watermark_branding')
    active_theme = db.relationship('Theme', backref='branding_settings')
    updater = db.relationship('User', backref='updated_branding')

    def __repr__(self):
        return f'<BrandingSettings {self.organization_name}>'

# ===== نماذج إدارة الأيقونات =====

class IconCategory(db.Model):
    __tablename__ = 'icon_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    description = db.Column(db.Text)
    color = db.Column(db.String(7), default='#007bff')  # Hex color
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships
    icons = db.relationship('Icon', backref='category', lazy=True)
    
    def __repr__(self):
        return f'<IconCategory {self.name}>'

class Icon(db.Model):
    __tablename__ = 'icons'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    description = db.Column(db.Text)
    
    # Icon types
    icon_type = db.Column(db.String(20), nullable=False, default='fontawesome')  # fontawesome, svg, image, custom
    
    # Icon data
    icon_class = db.Column(db.String(100))  # For FontAwesome: fas fa-home
    svg_content = db.Column(db.Text)  # For SVG icons
    image_path = db.Column(db.String(500))  # For image icons
    unicode_value = db.Column(db.String(10))  # For custom fonts
    
    # Style properties
    color = db.Column(db.String(7))  # Hex color
    size = db.Column(db.String(20), default='1x')  # 1x, 2x, 3x, lg, sm, xs
    style = db.Column(db.String(20), default='solid')  # solid, regular, light, brands
    
    # Metadata
    category_id = db.Column(db.Integer, db.ForeignKey('icon_categories.id'))
    tags = db.Column(db.Text)  # Comma-separated tags for search
    usage_count = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    is_favorite = db.Column(db.Boolean, default=False)
    
    # File info (for uploaded icons)
    file_size = db.Column(db.Integer)
    file_format = db.Column(db.String(10))  # svg, png, jpg, ico
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<Icon {self.name}>'
    
    def get_icon_html(self, custom_class='', custom_style=''):
        """Generate HTML for the icon"""
        if self.icon_type == 'fontawesome':
            classes = f"{self.icon_class} {custom_class}".strip()
            style = f"color: {self.color}; {custom_style}".strip() if self.color else custom_style
            return f'<i class="{classes}" style="{style}"></i>'
        
        elif self.icon_type == 'svg':
            style = f"color: {self.color}; {custom_style}".strip() if self.color else custom_style
            return f'<span class="{custom_class}" style="{style}">{self.svg_content}</span>'
        
        elif self.icon_type == 'image':
            style = f"{custom_style}".strip()
            return f'<img src="{self.image_path}" class="{custom_class}" style="{style}" alt="{self.name}">'
        
        elif self.icon_type == 'custom':
            style = f"color: {self.color}; {custom_style}".strip() if self.color else custom_style
            return f'<span class="{custom_class}" style="{style}">{self.unicode_value}</span>'
        
        return ''

class IconSet(db.Model):
    __tablename__ = 'icon_sets'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    description = db.Column(db.Text)
    version = db.Column(db.String(20))
    source_url = db.Column(db.String(500))
    license_type = db.Column(db.String(50))  # free, commercial, custom
    
    # Set properties
    total_icons = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    is_default = db.Column(db.Boolean, default=False)
    
    # File info
    css_file_path = db.Column(db.String(500))
    font_file_path = db.Column(db.String(500))
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<IconSet {self.name}>'

class UserIconPreference(db.Model):
    __tablename__ = 'user_icon_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    icon_id = db.Column(db.Integer, db.ForeignKey('icons.id'), nullable=False)
    
    # Preference type
    preference_type = db.Column(db.String(20), nullable=False)  # favorite, recent, custom
    
    # Custom settings
    custom_color = db.Column(db.String(7))
    custom_size = db.Column(db.String(20))
    custom_class = db.Column(db.String(100))
    
    # Usage tracking
    last_used = db.Column(db.DateTime, default=datetime.utcnow)
    usage_count = db.Column(db.Integer, default=1)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<UserIconPreference {self.user_id}-{self.icon_id}>'


# نظام التقارير المتقدمة
# ===== نهاية نماذج مقياس كونرز =====

# ===== نماذج مقياس فاندربلت (Vanderbilt Assessment Scale) =====

class VanderbiltAssessment(db.Model):
    """نموذج التقييم الرئيسي لمقياس فاندربلت"""
    __tablename__ = 'vanderbilt_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    # معلومات التقييم الأساسية
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50), nullable=False, default='diagnostic')  # diagnostic, follow_up, treatment_monitoring
    form_type = db.Column(db.String(50), nullable=False, default='parent')  # parent, teacher, self
    
    # معلومات الطفل
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    grade_level = db.Column(db.String(20))
    
    # حالة التقييم
    status = db.Column(db.String(20), default='in_progress')  # in_progress, completed, cancelled
    completion_date = db.Column(db.DateTime)
    
    # معلومات المقيم
    rater_name = db.Column(db.String(200))
    rater_type = db.Column(db.String(50))  # parent, teacher, guardian, other
    rater_relationship = db.Column(db.String(100))
    
    # معلومات السياق
    school_name = db.Column(db.String(200))
    teacher_name = db.Column(db.String(200))
    assessment_setting = db.Column(db.String(100))
    
    # معلومات التاريخ الطبي والنمائي
    previous_diagnosis = db.Column(db.Text)
    current_medications = db.Column(db.Text)
    medical_history = db.Column(db.Text)
    developmental_concerns = db.Column(db.Text)
    
    # الأعراض والسلوكيات
    inattention_symptoms = db.Column(db.JSON)
    hyperactivity_symptoms = db.Column(db.JSON)
    oppositional_symptoms = db.Column(db.JSON)
    conduct_symptoms = db.Column(db.JSON)
    anxiety_symptoms = db.Column(db.JSON)
    
    # النتائج والدرجات
    inattention_score = db.Column(db.Integer)
    hyperactivity_score = db.Column(db.Integer)
    combined_score = db.Column(db.Integer)
    oppositional_score = db.Column(db.Integer)
    conduct_score = db.Column(db.Integer)
    anxiety_score = db.Column(db.Integer)
    
    # التفسير الإكلينيكي
    adhd_likelihood = db.Column(db.String(50))  # unlikely, possible, probable, highly_probable
    severity_level = db.Column(db.String(50))  # mild, moderate, severe
    impairment_level = db.Column(db.String(50))  # minimal, moderate, severe
    
    # الملاحظات والتوصيات
    behavioral_observations = db.Column(db.Text)
    functional_impairment = db.Column(db.Text)
    environmental_factors = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    treatment_recommendations = db.Column(db.Text)
    follow_up_recommendations = db.Column(db.Text)
    
    # ملاحظات إضافية
    additional_notes = db.Column(db.Text)
    clinician_notes = db.Column(db.Text)
    
    # العلاقات
    item_responses = db.relationship('VanderbiltItemResponse', backref='assessment', lazy=True, cascade='all, delete-orphan')
    domain_results = db.relationship('VanderbiltDomainResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('VanderbiltReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    # معلومات النظام
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))

class VanderbiltDomain(db.Model):
    """نموذج المجالات في مقياس فاندربلت"""
    __tablename__ = 'vanderbilt_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    name_arabic = db.Column(db.String(200), nullable=False)
    name_english = db.Column(db.String(200))
    abbreviation = db.Column(db.String(20))
    
    # معلومات المجال
    domain_type = db.Column(db.String(50), nullable=False)  # inattention, hyperactivity, oppositional, conduct, anxiety, academic, social
    description = db.Column(db.Text)
    clinical_significance = db.Column(db.Text)
    
    # معايير التقييم
    scoring_criteria = db.Column(db.JSON)
    cutoff_scores = db.Column(db.JSON)
    severity_ranges = db.Column(db.JSON)
    
    # معلومات الترتيب
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # نوع النموذج
    form_type = db.Column(db.String(50))  # parent, teacher, both
    age_range = db.Column(db.String(50))
    
    # العلاقات
    items = db.relationship('VanderbiltItem', backref='domain', lazy=True)
    domain_results = db.relationship('VanderbiltDomainResult', backref='domain', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class VanderbiltItemResponse(db.Model):
    """نموذج استجابات العناصر في مقياس فاندربلت"""
    __tablename__ = 'vanderbilt_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('vanderbilt_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('vanderbilt_items.id'), nullable=False)
    
    # الاستجابة
    raw_score = db.Column(db.Integer)
    response_text = db.Column(db.String(200))
    frequency_rating = db.Column(db.String(50))  # never, sometimes, often, very_often
    
    # معلومات إضافية
    observations = db.Column(db.Text)
    behavioral_examples = db.Column(db.Text)
    context_notes = db.Column(db.Text)
    confidence_level = db.Column(db.String(50))  # low, moderate, high
    
    # معلومات التوقيت
    response_date = db.Column(db.DateTime, default=datetime.utcnow)
    response_duration = db.Column(db.Integer)  # بالثواني
    
    # معلومات النظام
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class VanderbiltItem(db.Model):
    """نموذج العناصر في مقياس فاندربلت"""
    __tablename__ = 'vanderbilt_items'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey('vanderbilt_domains.id'), nullable=False)
    
    # معلومات العنصر
    item_number = db.Column(db.Integer, nullable=False)
    item_text_arabic = db.Column(db.Text, nullable=False)
    item_text_english = db.Column(db.Text)
    
    # معلومات التقييم
    item_type = db.Column(db.String(50), default='likert')  # likert, yes_no, frequency
    scoring_scale = db.Column(db.JSON)  # مقياس التقييم
    scoring_options = db.Column(db.JSON)  # خيارات الدرجات
    
    # معلومات إضافية
    examples = db.Column(db.Text)
    behavioral_indicators = db.Column(db.Text)
    clinical_notes = db.Column(db.Text)
    
    # معلومات الترتيب
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # نوع النموذج
    form_type = db.Column(db.String(50))  # parent, teacher, both
    age_applicability = db.Column(db.String(50))
    
    # معايير DSM-5
    dsm5_criterion = db.Column(db.String(10))
    diagnostic_weight = db.Column(db.Float, default=1.0)
    
    # العلاقات
    item_responses = db.relationship('VanderbiltItemResponse', backref='item', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class VanderbiltDomainResult(db.Model):
    """نموذج نتائج المجالات في مقياس فاندربلت"""
    __tablename__ = 'vanderbilt_domain_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('vanderbilt_assessments.id'), nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey('vanderbilt_domains.id'), nullable=False)
    
    # النتائج الخام
    raw_score = db.Column(db.Integer)
    max_possible_score = db.Column(db.Integer)
    percentage_score = db.Column(db.Float)
    
    # النتائج المعيارية
    t_score = db.Column(db.Float)
    percentile_rank = db.Column(db.Float)
    standard_score = db.Column(db.Float)
    
    # التفسير الإكلينيكي
    severity_level = db.Column(db.String(50))  # normal, borderline, clinical, severe
    clinical_range = db.Column(db.String(100))
    diagnostic_significance = db.Column(db.String(100))
    
    # معلومات إضافية
    symptom_count = db.Column(db.Integer)
    criterion_met = db.Column(db.Boolean, default=False)
    impairment_rating = db.Column(db.String(50))
    
    # الملاحظات
    clinical_interpretation = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    
    # معلومات النظام
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class VanderbiltNorms(db.Model):
    """نموذج المعايير والبيانات المعيارية لمقياس فاندربلت"""
    __tablename__ = 'vanderbilt_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات المعيار
    norm_type = db.Column(db.String(50), nullable=False)  # cutoff, percentile, t_score
    domain_type = db.Column(db.String(50), nullable=False)
    form_type = db.Column(db.String(50), nullable=False)
    
    # معلومات ديموغرافية
    age_range_min = db.Column(db.Integer)
    age_range_max = db.Column(db.Integer)
    gender = db.Column(db.String(20))  # male, female, both
    
    # البيانات المعيارية
    normative_data = db.Column(db.JSON)
    cutoff_scores = db.Column(db.JSON)
    percentile_ranks = db.Column(db.JSON)
    t_score_conversions = db.Column(db.JSON)
    
    # معايير التشخيص
    diagnostic_cutoffs = db.Column(db.JSON)
    severity_ranges = db.Column(db.JSON)
    clinical_thresholds = db.Column(db.JSON)
    
    # معلومات المصدر
    source_study = db.Column(db.String(200))
    sample_size = db.Column(db.Integer)
    reliability_data = db.Column(db.JSON)
    validity_data = db.Column(db.JSON)
    
    # معلومات النظام
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class VanderbiltReport(db.Model):
    """نموذج التقارير لمقياس فاندربلت"""
    __tablename__ = 'vanderbilt_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('vanderbilt_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50), nullable=False)  # diagnostic, progress, comprehensive
    report_title = db.Column(db.String(200))
    report_date = db.Column(db.Date, default=datetime.utcnow)
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    assessment_results = db.Column(db.Text)
    symptom_analysis = db.Column(db.Text)
    
    # التفسير الإكلينيكي
    diagnostic_impression = db.Column(db.Text)
    severity_assessment = db.Column(db.Text)
    functional_impact = db.Column(db.Text)
    risk_factors = db.Column(db.Text)
    protective_factors = db.Column(db.Text)
    
    # التوصيات
    treatment_recommendations = db.Column(db.Text)
    educational_recommendations = db.Column(db.Text)
    behavioral_interventions = db.Column(db.Text)
    medication_considerations = db.Column(db.Text)
    follow_up_plan = db.Column(db.Text)
    
    # معلومات إضافية
    limitations = db.Column(db.Text)
    additional_assessments_needed = db.Column(db.Text)
    prognosis = db.Column(db.Text)
    
    # معلومات النظام
    generated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    report_status = db.Column(db.String(50), default='draft')  # draft, final, archived
    
    # ملفات مرفقة
    attachments = db.Column(db.JSON)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ===== نهاية نماذج مقياس فاندربلت =====

# ===== نماذج مقياس النضج الاجتماعي (Social Maturity Scale) =====

class SocialMaturityAssessment(db.Model):
    """نموذج التقييم الرئيسي لمقياس النضج الاجتماعي"""
    __tablename__ = 'social_maturity_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    # معلومات التقييم الأساسية
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50), nullable=False, default='comprehensive')  # comprehensive, screening, follow_up
    assessment_method = db.Column(db.String(50), nullable=False, default='interview')  # interview, observation, questionnaire
    
    # معلومات الطفل
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    developmental_age_years = db.Column(db.Integer)
    developmental_age_months = db.Column(db.Integer)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='in_progress')  # in_progress, completed, cancelled
    completion_date = db.Column(db.DateTime)
    
    # معلومات المقيم والمصدر
    informant_name = db.Column(db.String(200))
    informant_relationship = db.Column(db.String(100))  # parent, teacher, caregiver, self
    informant_reliability = db.Column(db.String(50))  # high, moderate, low
    
    # معلومات السياق
    assessment_setting = db.Column(db.String(100))
    cultural_background = db.Column(db.String(100))
    language_of_assessment = db.Column(db.String(50))
    
    # النتائج الإجمالية
    total_raw_score = db.Column(db.Integer)
    social_quotient = db.Column(db.Float)  # معامل النضج الاجتماعي
    social_age_years = db.Column(db.Integer)
    social_age_months = db.Column(db.Integer)
    
    # مستوى النضج الاجتماعي
    maturity_level = db.Column(db.String(50))  # superior, above_average, average, below_average, significantly_delayed
    developmental_status = db.Column(db.String(50))  # advanced, typical, delayed, significantly_delayed
    
    # المجالات الرئيسية
    self_help_score = db.Column(db.Integer)
    self_direction_score = db.Column(db.Integer)
    occupation_score = db.Column(db.Integer)
    communication_score = db.Column(db.Integer)
    locomotion_score = db.Column(db.Integer)
    socialization_score = db.Column(db.Integer)
    
    # التفسير والملاحظات
    behavioral_observations = db.Column(db.Text)
    social_strengths = db.Column(db.Text)
    social_challenges = db.Column(db.Text)
    environmental_factors = db.Column(db.Text)
    
    # التوصيات
    intervention_recommendations = db.Column(db.Text)
    educational_recommendations = db.Column(db.Text)
    family_recommendations = db.Column(db.Text)
    follow_up_recommendations = db.Column(db.Text)
    
    # ملاحظات إضافية
    additional_notes = db.Column(db.Text)
    clinician_notes = db.Column(db.Text)
    
    # العلاقات
    domain_results = db.relationship('SocialMaturityDomainResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    item_responses = db.relationship('SocialMaturityItemResponse', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('SocialMaturityReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    # معلومات النظام
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))

class SocialMaturityDomain(db.Model):
    """نموذج المجالات في مقياس النضج الاجتماعي"""
    __tablename__ = 'social_maturity_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    name_arabic = db.Column(db.String(200), nullable=False)
    name_english = db.Column(db.String(200))
    abbreviation = db.Column(db.String(20))
    
    # معلومات المجال
    domain_type = db.Column(db.String(50), nullable=False)  # self_help, self_direction, occupation, communication, locomotion, socialization
    description = db.Column(db.Text)
    developmental_significance = db.Column(db.Text)
    
    # معايير التقييم
    scoring_criteria = db.Column(db.JSON)
    age_expectations = db.Column(db.JSON)
    developmental_milestones = db.Column(db.JSON)
    
    # معلومات الترتيب
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # نطاق العمر
    min_age_months = db.Column(db.Integer)
    max_age_months = db.Column(db.Integer)
    
    # العلاقات
    items = db.relationship('SocialMaturityItem', backref='domain', lazy=True)
    domain_results = db.relationship('SocialMaturityDomainResult', backref='domain', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SocialMaturityItem(db.Model):
    """نموذج العناصر في مقياس النضج الاجتماعي"""
    __tablename__ = 'social_maturity_items'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey('social_maturity_domains.id'), nullable=False)
    
    # معلومات العنصر
    item_number = db.Column(db.Integer, nullable=False)
    item_text_arabic = db.Column(db.Text, nullable=False)
    item_text_english = db.Column(db.Text)
    
    # معلومات التقييم
    item_type = db.Column(db.String(50), default='pass_fail')  # pass_fail, rating_scale, observation
    scoring_method = db.Column(db.String(50), default='binary')  # binary, scaled, weighted
    item_weight = db.Column(db.Float, default=1.0)
    
    # معلومات النمو
    typical_age_months = db.Column(db.Integer)  # العمر النموذجي لإتقان المهارة
    age_range_min = db.Column(db.Integer)
    age_range_max = db.Column(db.Integer)
    
    # معلومات إضافية
    behavioral_indicators = db.Column(db.Text)
    observation_guidelines = db.Column(db.Text)
    cultural_considerations = db.Column(db.Text)
    
    # معلومات الترتيب
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # مستوى الصعوبة
    difficulty_level = db.Column(db.String(50))  # basic, intermediate, advanced
    prerequisite_skills = db.Column(db.Text)
    
    # العلاقات
    item_responses = db.relationship('SocialMaturityItemResponse', backref='item', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SocialMaturityItemResponse(db.Model):
    """نموذج استجابات العناصر في مقياس النضج الاجتماعي"""
    __tablename__ = 'social_maturity_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('social_maturity_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('social_maturity_items.id'), nullable=False)
    
    # الاستجابة
    raw_score = db.Column(db.Integer)
    pass_fail = db.Column(db.Boolean)  # نجح/فشل
    performance_level = db.Column(db.String(50))  # independent, assisted, emerging, not_observed
    
    # معلومات إضافية
    observations = db.Column(db.Text)
    behavioral_notes = db.Column(db.Text)
    context_description = db.Column(db.Text)
    assistance_needed = db.Column(db.Text)
    
    # معلومات التقييم
    confidence_level = db.Column(db.String(50))  # high, moderate, low
    assessment_method = db.Column(db.String(50))  # direct_observation, report, demonstration
    
    # معلومات التوقيت
    response_date = db.Column(db.DateTime, default=datetime.utcnow)
    assessment_duration = db.Column(db.Integer)  # بالدقائق
    
    # معلومات النظام
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SocialMaturityDomainResult(db.Model):
    """نموذج نتائج المجالات في مقياس النضج الاجتماعي"""
    __tablename__ = 'social_maturity_domain_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('social_maturity_assessments.id'), nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey('social_maturity_domains.id'), nullable=False)
    
    # النتائج الخام
    raw_score = db.Column(db.Integer)
    max_possible_score = db.Column(db.Integer)
    percentage_score = db.Column(db.Float)
    
    # النتائج النمائية
    developmental_age_months = db.Column(db.Integer)
    developmental_quotient = db.Column(db.Float)
    age_equivalent = db.Column(db.String(50))
    
    # التفسير النمائي
    developmental_level = db.Column(db.String(50))  # advanced, typical, delayed, significantly_delayed
    maturity_status = db.Column(db.String(100))
    
    # معلومات إضافية
    items_passed = db.Column(db.Integer)
    items_failed = db.Column(db.Integer)
    items_emerging = db.Column(db.Integer)
    
    # الملاحظات
    domain_strengths = db.Column(db.Text)
    domain_challenges = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    
    # معلومات النظام
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SocialMaturityNorms(db.Model):
    """نموذج المعايير والبيانات المعيارية لمقياس النضج الاجتماعي"""
    __tablename__ = 'social_maturity_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات المعيار
    norm_type = db.Column(db.String(50), nullable=False)  # age_equivalent, developmental_quotient, percentile
    domain_type = db.Column(db.String(50))
    
    # معلومات ديموغرافية
    age_range_min = db.Column(db.Integer)  # بالشهور
    age_range_max = db.Column(db.Integer)  # بالشهور
    gender = db.Column(db.String(20))  # male, female, both
    cultural_group = db.Column(db.String(100))
    
    # البيانات المعيارية
    normative_data = db.Column(db.JSON)
    age_equivalents = db.Column(db.JSON)
    developmental_quotients = db.Column(db.JSON)
    percentile_ranks = db.Column(db.JSON)
    
    # معايير التفسير
    interpretation_guidelines = db.Column(db.JSON)
    developmental_expectations = db.Column(db.JSON)
    clinical_cutoffs = db.Column(db.JSON)
    
    # معلومات المصدر
    source_study = db.Column(db.String(200))
    sample_size = db.Column(db.Integer)
    reliability_data = db.Column(db.JSON)
    validity_data = db.Column(db.JSON)
    
    # معلومات النظام
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SocialMaturityReport(db.Model):
    """نموذج التقارير لمقياس النضج الاجتماعي"""
    __tablename__ = 'social_maturity_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('social_maturity_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50), nullable=False)  # comprehensive, summary, progress, screening
    report_title = db.Column(db.String(200))
    report_date = db.Column(db.Date, default=datetime.utcnow)
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    assessment_procedures = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    
    # النتائج والتفسير
    overall_results = db.Column(db.Text)
    domain_analysis = db.Column(db.Text)
    developmental_profile = db.Column(db.Text)
    social_functioning_level = db.Column(db.Text)
    
    # نقاط القوة والتحديات
    social_strengths = db.Column(db.Text)
    areas_of_concern = db.Column(db.Text)
    developmental_priorities = db.Column(db.Text)
    
    # التوصيات
    intervention_recommendations = db.Column(db.Text)
    educational_strategies = db.Column(db.Text)
    family_support_recommendations = db.Column(db.Text)
    community_resources = db.Column(db.Text)
    follow_up_plan = db.Column(db.Text)
    
    # معلومات إضافية
    limitations = db.Column(db.Text)
    future_assessments = db.Column(db.Text)
    prognosis = db.Column(db.Text)
    
    # معلومات النظام
    generated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    report_status = db.Column(db.String(50), default='draft')  # draft, final, archived
    
    # ملفات مرفقة
    attachments = db.Column(db.JSON)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ===== نهاية نماذج مقياس النضج الاجتماعي =====

# ===== نماذج مقياس هلب و بوب (Help & Bob Scale) =====

class HelpBobAssessment(db.Model):
    """نموذج التقييم الرئيسي لمقياس هلب و بوب"""
    __tablename__ = 'help_bob_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    # معلومات التقييم الأساسية
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50), nullable=False, default='comprehensive')  # comprehensive, screening, follow_up
    assessment_method = db.Column(db.String(50), nullable=False, default='direct_observation')  # direct_observation, interview, mixed
    
    # معلومات الطفل
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    developmental_age_years = db.Column(db.Integer)
    developmental_age_months = db.Column(db.Integer)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='in_progress')  # in_progress, completed, cancelled
    completion_date = db.Column(db.DateTime)
    
    # معلومات البيئة والسياق
    assessment_setting = db.Column(db.String(100))  # home, school, clinic, community
    environmental_conditions = db.Column(db.Text)
    support_systems_present = db.Column(db.Text)
    
    # معلومات المقيم والمصدر
    primary_informant = db.Column(db.String(200))
    informant_relationship = db.Column(db.String(100))  # parent, teacher, caregiver, therapist
    informant_reliability = db.Column(db.String(50))  # high, moderate, low
    
    # النتائج الإجمالية
    total_raw_score = db.Column(db.Integer)
    developmental_quotient = db.Column(db.Float)
    functional_age_equivalent = db.Column(db.String(50))
    
    # مستوى الأداء الوظيفي
    functional_level = db.Column(db.String(50))  # independent, minimal_support, moderate_support, extensive_support
    independence_level = db.Column(db.String(50))  # high, moderate, low, very_low
    support_needs_level = db.Column(db.String(50))  # minimal, moderate, extensive, pervasive
    
    # المجالات الرئيسية (نتائج المجالات)
    self_care_score = db.Column(db.Integer)
    mobility_score = db.Column(db.Integer)
    communication_score = db.Column(db.Integer)
    social_skills_score = db.Column(db.Integer)
    community_living_score = db.Column(db.Integer)
    work_skills_score = db.Column(db.Integer)
    
    # التقييم السلوكي
    behavioral_observations = db.Column(db.Text)
    attention_span = db.Column(db.String(50))  # excellent, good, fair, poor
    cooperation_level = db.Column(db.String(50))  # excellent, good, fair, poor
    motivation_level = db.Column(db.String(50))  # high, moderate, low
    
    # نقاط القوة والتحديات
    functional_strengths = db.Column(db.Text)
    areas_of_concern = db.Column(db.Text)
    priority_needs = db.Column(db.Text)
    
    # التوصيات
    intervention_recommendations = db.Column(db.Text)
    support_strategies = db.Column(db.Text)
    environmental_modifications = db.Column(db.Text)
    training_recommendations = db.Column(db.Text)
    follow_up_recommendations = db.Column(db.Text)
    
    # معلومات إضافية
    cultural_considerations = db.Column(db.Text)
    language_factors = db.Column(db.Text)
    medical_factors = db.Column(db.Text)
    additional_notes = db.Column(db.Text)
    
    # العلاقات
    domain_results = db.relationship('HelpBobDomainResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    item_responses = db.relationship('HelpBobItemResponse', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('HelpBobReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    # معلومات النظام
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))

class HelpBobDomain(db.Model):
    """نموذج المجالات في مقياس هلب و بوب"""
    __tablename__ = 'help_bob_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    name_arabic = db.Column(db.String(200), nullable=False)
    name_english = db.Column(db.String(200))
    abbreviation = db.Column(db.String(20))
    
    # معلومات المجال
    domain_type = db.Column(db.String(50), nullable=False)  # self_care, mobility, communication, social_skills, community_living, work_skills
    description = db.Column(db.Text)
    functional_focus = db.Column(db.Text)  # التركيز الوظيفي للمجال
    
    # معايير التقييم
    scoring_criteria = db.Column(db.JSON)
    performance_levels = db.Column(db.JSON)  # مستويات الأداء
    independence_indicators = db.Column(db.JSON)  # مؤشرات الاستقلالية
    
    # معلومات الترتيب والعرض
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # نطاق العمر والتطبيق
    min_age_months = db.Column(db.Integer)
    max_age_months = db.Column(db.Integer)
    applicable_settings = db.Column(db.JSON)  # البيئات المناسبة للتطبيق
    
    # أهمية المجال
    priority_level = db.Column(db.String(50))  # critical, important, supplementary
    functional_impact = db.Column(db.Text)  # التأثير الوظيفي
    
    # العلاقات
    items = db.relationship('HelpBobItem', backref='domain', lazy=True)
    domain_results = db.relationship('HelpBobDomainResult', backref='domain', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class HelpBobItem(db.Model):
    """نموذج العناصر في مقياس هلب و بوب"""
    __tablename__ = 'help_bob_items'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey('help_bob_domains.id'), nullable=False)
    
    # معلومات العنصر
    item_number = db.Column(db.Integer, nullable=False)
    item_text_arabic = db.Column(db.Text, nullable=False)
    item_text_english = db.Column(db.Text)
    
    # نوع المهارة
    skill_type = db.Column(db.String(50))  # basic, intermediate, advanced
    functional_category = db.Column(db.String(100))  # الفئة الوظيفية
    
    # معايير التقييم
    scoring_method = db.Column(db.String(50), default='performance_level')  # performance_level, frequency, independence
    performance_criteria = db.Column(db.JSON)  # معايير الأداء
    independence_levels = db.Column(db.JSON)  # مستويات الاستقلالية
    
    # معلومات النمو والتطور
    typical_age_months = db.Column(db.Integer)  # العمر النموذجي لإتقان المهارة
    developmental_sequence = db.Column(db.Integer)  # التسلسل النمائي
    prerequisite_skills = db.Column(db.Text)  # المهارات المتطلبة مسبقاً
    
    # معلومات التطبيق
    assessment_context = db.Column(db.Text)  # سياق التقييم
    observation_guidelines = db.Column(db.Text)  # إرشادات الملاحظة
    prompting_guidelines = db.Column(db.Text)  # إرشادات التوجيه
    
    # العوامل البيئية والثقافية
    environmental_considerations = db.Column(db.Text)
    cultural_adaptations = db.Column(db.Text)
    equipment_needed = db.Column(db.Text)  # المعدات المطلوبة
    
    # معلومات الترتيب
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    is_critical = db.Column(db.Boolean, default=False)  # مهارة حرجة
    
    # العلاقات
    item_responses = db.relationship('HelpBobItemResponse', backref='item', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class HelpBobItemResponse(db.Model):
    """نموذج استجابات العناصر في مقياس هلب و بوب"""
    __tablename__ = 'help_bob_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('help_bob_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('help_bob_items.id'), nullable=False)
    
    # مستوى الأداء
    performance_level = db.Column(db.String(50))  # independent, verbal_prompt, physical_prompt, full_assistance, not_applicable
    independence_score = db.Column(db.Integer)  # درجة الاستقلالية (0-4)
    frequency_score = db.Column(db.Integer)  # درجة التكرار
    
    # تفاصيل الأداء
    can_perform = db.Column(db.Boolean)  # يستطيع الأداء
    performs_consistently = db.Column(db.Boolean)  # يؤدي بانتظام
    needs_prompting = db.Column(db.Boolean)  # يحتاج توجيه
    needs_assistance = db.Column(db.Boolean)  # يحتاج مساعدة
    
    # نوع الدعم المطلوب
    support_type = db.Column(db.String(100))  # verbal, gestural, physical, environmental
    support_level = db.Column(db.String(50))  # minimal, moderate, extensive, full
    
    # معلومات السياق
    assessment_context = db.Column(db.Text)  # سياق التقييم
    environmental_factors = db.Column(db.Text)  # العوامل البيئية
    behavioral_observations = db.Column(db.Text)  # الملاحظات السلوكية
    
    # معلومات التقييم
    assessment_method = db.Column(db.String(50))  # direct_observation, report, demonstration
    confidence_level = db.Column(db.String(50))  # high, moderate, low
    reliability_factors = db.Column(db.Text)  # عوامل الموثوقية
    
    # التوصيات للبند
    item_recommendations = db.Column(db.Text)
    training_priorities = db.Column(db.Text)
    support_strategies = db.Column(db.Text)
    
    # معلومات التوقيت
    response_date = db.Column(db.DateTime, default=datetime.utcnow)
    assessment_duration = db.Column(db.Integer)  # بالدقائق
    
    # معلومات النظام
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class HelpBobDomainResult(db.Model):
    """نموذج نتائج المجالات في مقياس هلب و بوب"""
    __tablename__ = 'help_bob_domain_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('help_bob_assessments.id'), nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey('help_bob_domains.id'), nullable=False)
    
    # النتائج الخام
    raw_score = db.Column(db.Integer)
    max_possible_score = db.Column(db.Integer)
    percentage_score = db.Column(db.Float)
    
    # مستوى الاستقلالية
    independence_level = db.Column(db.String(50))  # high, moderate, low, minimal
    independence_percentage = db.Column(db.Float)
    support_needs_level = db.Column(db.String(50))  # minimal, moderate, extensive, pervasive
    
    # التحليل الوظيفي
    functional_age_equivalent = db.Column(db.String(50))
    developmental_level = db.Column(db.String(50))  # age_appropriate, delayed, significantly_delayed
    functional_status = db.Column(db.String(100))
    
    # تفصيل الأداء
    items_independent = db.Column(db.Integer)  # البنود المستقلة
    items_prompted = db.Column(db.Integer)  # البنود التي تحتاج توجيه
    items_assisted = db.Column(db.Integer)  # البنود التي تحتاج مساعدة
    items_not_applicable = db.Column(db.Integer)  # البنود غير المناسبة
    
    # نقاط القوة والتحديات في المجال
    domain_strengths = db.Column(db.Text)
    domain_challenges = db.Column(db.Text)
    priority_skills = db.Column(db.Text)  # المهارات ذات الأولوية
    
    # التوصيات الخاصة بالمجال
    domain_recommendations = db.Column(db.Text)
    intervention_strategies = db.Column(db.Text)
    support_modifications = db.Column(db.Text)
    
    # معلومات النظام
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class HelpBobNorms(db.Model):
    """نموذج المعايير والبيانات المعيارية لمقياس هلب و بوب"""
    __tablename__ = 'help_bob_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات المعيار
    norm_type = db.Column(db.String(50), nullable=False)  # age_equivalent, independence_level, support_needs
    domain_type = db.Column(db.String(50))
    
    # معلومات ديموغرافية
    age_range_min = db.Column(db.Integer)  # بالشهور
    age_range_max = db.Column(db.Integer)  # بالشهور
    disability_type = db.Column(db.String(100))  # نوع الإعاقة
    severity_level = db.Column(db.String(50))  # مستوى الشدة
    
    # البيانات المعيارية
    normative_data = db.Column(db.JSON)
    independence_benchmarks = db.Column(db.JSON)  # معايير الاستقلالية
    support_level_criteria = db.Column(db.JSON)  # معايير مستوى الدعم
    functional_expectations = db.Column(db.JSON)  # التوقعات الوظيفية
    
    # معايير التفسير
    interpretation_guidelines = db.Column(db.JSON)
    independence_cutoffs = db.Column(db.JSON)  # نقاط قطع الاستقلالية
    support_needs_criteria = db.Column(db.JSON)  # معايير احتياجات الدعم
    
    # معلومات المصدر والموثوقية
    source_study = db.Column(db.String(200))
    sample_size = db.Column(db.Integer)
    population_characteristics = db.Column(db.JSON)
    reliability_data = db.Column(db.JSON)
    validity_data = db.Column(db.JSON)
    
    # معلومات النظام
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class HelpBobReport(db.Model):
    """نموذج التقارير لمقياس هلب و بوب"""
    __tablename__ = 'help_bob_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('help_bob_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50), nullable=False)  # comprehensive, functional_profile, support_plan, progress
    report_title = db.Column(db.String(200))
    report_date = db.Column(db.Date, default=datetime.utcnow)
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    assessment_procedures = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    
    # النتائج والتحليل
    overall_functional_level = db.Column(db.Text)
    independence_analysis = db.Column(db.Text)
    support_needs_analysis = db.Column(db.Text)
    domain_analysis = db.Column(db.Text)
    
    # الملف الوظيفي
    functional_strengths = db.Column(db.Text)
    functional_challenges = db.Column(db.Text)
    priority_areas = db.Column(db.Text)
    support_requirements = db.Column(db.Text)
    
    # خطة الدعم والتدخل
    intervention_goals = db.Column(db.Text)
    support_strategies = db.Column(db.Text)
    environmental_modifications = db.Column(db.Text)
    training_recommendations = db.Column(db.Text)
    
    # التوصيات
    immediate_recommendations = db.Column(db.Text)
    long_term_goals = db.Column(db.Text)
    family_recommendations = db.Column(db.Text)
    professional_recommendations = db.Column(db.Text)
    community_resources = db.Column(db.Text)
    
    # متابعة وتقييم
    follow_up_plan = db.Column(db.Text)
    reassessment_timeline = db.Column(db.Text)
    progress_monitoring = db.Column(db.Text)
    
    # معلومات إضافية
    limitations = db.Column(db.Text)
    cultural_considerations = db.Column(db.Text)
    prognosis = db.Column(db.Text)
    
    # معلومات النظام
    generated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    report_status = db.Column(db.String(50), default='draft')  # draft, final, archived
    
    # ملفات مرفقة
    attachments = db.Column(db.JSON)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ===== نهاية نماذج مقياس هلب و بوب =====

# ===== نماذج مقياس ادوس (ADOS) =====

class AdosAssessment(db.Model):
    """نموذج تقييم مقياس ادوس"""
    __tablename__ = 'ados_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50), nullable=False, default='diagnostic')
    module_used = db.Column(db.String(20), nullable=False)  # Module 1, 2, 3, 4, T
    
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    
    status = db.Column(db.String(20), default='in_progress')
    completion_date = db.Column(db.DateTime)
    
    # معلومات التقييم
    assessment_setting = db.Column(db.String(100))
    session_duration_minutes = db.Column(db.Integer)
    language_used = db.Column(db.String(50), default='arabic')
    
    # الدرجات الإجمالية
    social_affect_total = db.Column(db.Integer)
    restricted_repetitive_total = db.Column(db.Integer)
    overall_total = db.Column(db.Integer)
    
    # التصنيف
    autism_classification = db.Column(db.String(50))  # autism, autism_spectrum, non_spectrum
    comparison_score = db.Column(db.Integer)
    severity_score = db.Column(db.Integer)
    
    # ملاحظات سلوكية
    behavioral_observations = db.Column(db.Text)
    play_observations = db.Column(db.Text)
    social_interaction_quality = db.Column(db.Text)
    communication_patterns = db.Column(db.Text)
    
    # العوامل المؤثرة
    attention_level = db.Column(db.String(50))
    cooperation_level = db.Column(db.String(50))
    anxiety_level = db.Column(db.String(50))
    fatigue_level = db.Column(db.String(50))
    
    # التوصيات
    diagnostic_impression = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    follow_up_needed = db.Column(db.Boolean, default=False)
    additional_assessments_recommended = db.Column(db.Text)
    
    # العلاقات
    activity_results = db.relationship('AdosActivityResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    item_responses = db.relationship('AdosItemResponse', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('AdosReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AdosModule(db.Model):
    """نموذج وحدات مقياس ادوس"""
    __tablename__ = 'ados_modules'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(10), nullable=False, unique=True)
    description = db.Column(db.Text)
    
    # معايير الاستخدام
    age_range_min_months = db.Column(db.Integer)
    age_range_max_months = db.Column(db.Integer)
    language_level = db.Column(db.String(100))
    developmental_level = db.Column(db.String(100))
    
    # معلومات الوحدة
    typical_duration_minutes = db.Column(db.Integer)
    number_of_activities = db.Column(db.Integer)
    scoring_algorithm = db.Column(db.JSON)
    
    # العلاقات
    activities = db.relationship('AdosActivity', backref='module', lazy=True)
    
    # بيانات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AdosActivity(db.Model):
    """نموذج أنشطة مقياس ادوس"""
    __tablename__ = 'ados_activities'
    
    id = db.Column(db.Integer, primary_key=True)
    module_id = db.Column(db.Integer, db.ForeignKey('ados_modules.id'), nullable=False)
    
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(20), nullable=False)
    description = db.Column(db.Text)
    
    # ترتيب النشاط
    sequence_order = db.Column(db.Integer)
    is_required = db.Column(db.Boolean, default=True)
    
    # معلومات النشاط
    activity_type = db.Column(db.String(50))  # structured, semi_structured, observation
    estimated_duration_minutes = db.Column(db.Integer)
    materials_needed = db.Column(db.Text)
    setup_instructions = db.Column(db.Text)
    
    # إرشادات التطبيق
    administration_guidelines = db.Column(db.Text)
    prompting_hierarchy = db.Column(db.JSON)
    scoring_criteria = db.Column(db.JSON)
    
    # العلاقات
    items = db.relationship('AdosItem', backref='activity', lazy=True)
    results = db.relationship('AdosActivityResult', backref='activity', lazy=True)
    
    # بيانات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AdosItem(db.Model):
    """نموذج عناصر تقييم مقياس ادوس"""
    __tablename__ = 'ados_items'
    
    id = db.Column(db.Integer, primary_key=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('ados_activities.id'), nullable=False)
    
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(20), nullable=False)
    description = db.Column(db.Text)
    
    # تصنيف العنصر
    domain = db.Column(db.String(100))  # social_affect, restricted_repetitive
    subdomain = db.Column(db.String(100))
    
    # معايير التسجيل
    scoring_scale = db.Column(db.String(20))  # 0-3, 0-2, binary
    score_descriptions = db.Column(db.JSON)
    behavioral_indicators = db.Column(db.JSON)
    
    # إرشادات التقييم
    observation_guidelines = db.Column(db.Text)
    coding_notes = db.Column(db.Text)
    examples = db.Column(db.JSON)
    
    # العلاقات
    responses = db.relationship('AdosItemResponse', backref='item', lazy=True)
    
    # بيانات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AdosItemResponse(db.Model):
    """نموذج استجابات عناصر مقياس ادوس"""
    __tablename__ = 'ados_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('ados_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('ados_items.id'), nullable=False)
    
    # الدرجة والتقييم
    score = db.Column(db.Integer)
    score_justification = db.Column(db.Text)
    
    # الملاحظات السلوكية
    behavioral_observations = db.Column(db.Text)
    specific_behaviors_noted = db.Column(db.JSON)
    frequency_intensity = db.Column(db.String(50))
    
    # السياق
    context_notes = db.Column(db.Text)
    prompting_used = db.Column(db.String(100))
    environmental_factors = db.Column(db.Text)
    
    # التوقيت
    response_timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AdosActivityResult(db.Model):
    """نموذج نتائج أنشطة مقياس ادوس"""
    __tablename__ = 'ados_activity_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('ados_assessments.id'), nullable=False)
    activity_id = db.Column(db.Integer, db.ForeignKey('ados_activities.id'), nullable=False)
    
    # معلومات التطبيق
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer)
    
    # جودة التطبيق
    administration_quality = db.Column(db.String(50))  # excellent, good, adequate, poor
    participant_engagement = db.Column(db.String(50))
    modifications_made = db.Column(db.Text)
    
    # الملاحظات
    activity_observations = db.Column(db.Text)
    social_behaviors = db.Column(db.Text)
    communication_behaviors = db.Column(db.Text)
    play_behaviors = db.Column(db.Text)
    repetitive_behaviors = db.Column(db.Text)
    
    # التحديات والعوامل المؤثرة
    challenges_encountered = db.Column(db.Text)
    environmental_factors = db.Column(db.Text)
    participant_factors = db.Column(db.Text)
    
    # بيانات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AdosNorms(db.Model):
    """نموذج المعايير والمقارنات لمقياس ادوس"""
    __tablename__ = 'ados_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    module_code = db.Column(db.String(10), nullable=False)
    
    # المعايير الديموغرافية
    age_range_min_months = db.Column(db.Integer)
    age_range_max_months = db.Column(db.Integer)
    language_level = db.Column(db.String(100))
    
    # نقاط القطع
    autism_cutoff_social_affect = db.Column(db.Integer)
    autism_cutoff_restricted_repetitive = db.Column(db.Integer)
    autism_cutoff_total = db.Column(db.Integer)
    
    spectrum_cutoff_social_affect = db.Column(db.Integer)
    spectrum_cutoff_restricted_repetitive = db.Column(db.Integer)
    spectrum_cutoff_total = db.Column(db.Integer)
    
    # معايير الشدة
    severity_scoring_table = db.Column(db.JSON)
    comparison_score_table = db.Column(db.JSON)
    
    # معلومات المعايرة
    normative_sample_size = db.Column(db.Integer)
    normative_sample_description = db.Column(db.Text)
    reliability_data = db.Column(db.JSON)
    validity_data = db.Column(db.JSON)
    
    # بيانات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AdosReport(db.Model):
    """نموذج تقارير مقياس ادوس"""
    __tablename__ = 'ados_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('ados_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50), default='comprehensive')
    report_date = db.Column(db.Date, default=datetime.utcnow)
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    assessment_procedures = db.Column(db.Text)
    
    # النتائج
    quantitative_results = db.Column(db.JSON)
    qualitative_observations = db.Column(db.Text)
    behavioral_profile = db.Column(db.Text)
    
    # التفسير
    diagnostic_interpretation = db.Column(db.Text)
    severity_assessment = db.Column(db.Text)
    comparison_analysis = db.Column(db.Text)
    
    # التوصيات
    intervention_recommendations = db.Column(db.Text)
    educational_recommendations = db.Column(db.Text)
    family_recommendations = db.Column(db.Text)
    follow_up_recommendations = db.Column(db.Text)
    
    # معلومات إضافية
    limitations_considerations = db.Column(db.Text)
    additional_assessments_needed = db.Column(db.Text)
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    approved_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ===== نهاية نماذج مقياس ادوس =====


# ===== نماذج مقياس رسم الرجل (Draw-A-Person Test) =====

# نموذج تقييم رسم الرجل
class DapAssessment(db.Model):
    __tablename__ = 'dap_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50), nullable=False, default='individual')
    test_version = db.Column(db.String(50), nullable=False, default='goodenough_harris')
    
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    
    status = db.Column(db.String(20), default='in_progress')
    completion_date = db.Column(db.DateTime)
    
    # بيئة التقييم
    assessment_environment = db.Column(db.String(100))
    lighting_conditions = db.Column(db.String(50))
    seating_arrangement = db.Column(db.String(100))
    materials_used = db.Column(db.String(200))
    
    # تعليمات الرسم المعطاة
    man_instruction = db.Column(db.Text)
    woman_instruction = db.Column(db.Text)
    self_instruction = db.Column(db.Text)
    
    # الملاحظات السلوكية
    attention_span = db.Column(db.String(50))
    motivation_level = db.Column(db.String(50))
    cooperation_level = db.Column(db.String(50))
    anxiety_level = db.Column(db.String(50))
    
    drawing_approach = db.Column(db.String(100))
    hand_preference = db.Column(db.String(20))
    grip_pattern = db.Column(db.String(50))
    pressure_applied = db.Column(db.String(50))
    
    # نتائج التسجيل
    man_raw_score = db.Column(db.Integer, default=0)
    woman_raw_score = db.Column(db.Integer, default=0)
    self_raw_score = db.Column(db.Integer, default=0)
    total_raw_score = db.Column(db.Integer, default=0)
    
    man_standard_score = db.Column(db.Float)
    woman_standard_score = db.Column(db.Float)
    self_standard_score = db.Column(db.Float)
    composite_standard_score = db.Column(db.Float)
    
    mental_age_equivalent = db.Column(db.String(50))
    percentile_rank = db.Column(db.Integer)
    iq_estimate = db.Column(db.Integer)
    
    # التحليل النوعي
    developmental_level = db.Column(db.String(50))
    cognitive_indicators = db.Column(db.JSON)
    emotional_indicators = db.Column(db.JSON)
    behavioral_indicators = db.Column(db.JSON)
    
    # الملاحظات الإكلينيكية
    figure_proportions = db.Column(db.String(100))
    detail_inclusion = db.Column(db.String(100))
    spatial_organization = db.Column(db.String(100))
    line_quality = db.Column(db.String(100))
    
    behavioral_observations = db.Column(db.Text)
    environmental_factors = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    # العلاقات
    drawing_results = db.relationship('DapDrawingResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    item_scores = db.relationship('DapItemScore', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('DapReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# فئات رسم الرجل
class DapDrawingCategory(db.Model):
    __tablename__ = 'dap_drawing_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    category_name = db.Column(db.String(100), nullable=False)
    category_name_ar = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    description_ar = db.Column(db.Text)
    
    scoring_criteria = db.Column(db.JSON)
    age_appropriateness = db.Column(db.JSON)
    developmental_significance = db.Column(db.Text)
    
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    
    # العلاقات
    scoring_items = db.relationship('DapScoringItem', backref='category', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# عناصر تسجيل رسم الرجل
class DapScoringItem(db.Model):
    __tablename__ = 'dap_scoring_items'
    
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('dap_drawing_categories.id'), nullable=False)
    
    item_number = db.Column(db.Integer, nullable=False)
    item_name = db.Column(db.String(200), nullable=False)
    item_name_ar = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    description_ar = db.Column(db.Text)
    
    # معايير التسجيل
    scoring_method = db.Column(db.String(50), nullable=False, default='present_absent')
    point_value = db.Column(db.Integer, default=1)
    scoring_criteria = db.Column(db.JSON)
    
    # اعتبارات العمر والجنس
    age_range_start = db.Column(db.Integer)
    age_range_end = db.Column(db.Integer)
    gender_specific = db.Column(db.String(20))
    
    # المعلومات التطويرية
    developmental_significance = db.Column(db.Text)
    clinical_indicators = db.Column(db.JSON)
    examples = db.Column(db.JSON)
    
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    
    # العلاقات
    item_scores = db.relationship('DapItemScore', backref='scoring_item', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# نتائج رسم الرجل
class DapDrawingResult(db.Model):
    __tablename__ = 'dap_drawing_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('dap_assessments.id'), nullable=False)
    
    drawing_type = db.Column(db.String(50), nullable=False)  # man, woman, self
    drawing_order = db.Column(db.Integer, nullable=False)
    
    # معلومات التوقيت
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    total_time_minutes = db.Column(db.Integer)
    
    # تحليل الرسم
    raw_score = db.Column(db.Integer, default=0)
    standard_score = db.Column(db.Float)
    age_equivalent = db.Column(db.String(50))
    
    # الخصائص النوعية
    figure_size = db.Column(db.String(50))
    figure_placement = db.Column(db.String(50))
    line_quality = db.Column(db.String(50))
    detail_level = db.Column(db.String(50))
    proportions = db.Column(db.String(50))
    
    # المؤشرات العاطفية
    emotional_indicators = db.Column(db.JSON)
    unusual_features = db.Column(db.JSON)
    omissions = db.Column(db.JSON)
    distortions = db.Column(db.JSON)
    
    # تخزين صورة الرسم
    drawing_image_path = db.Column(db.String(500))
    drawing_thumbnail_path = db.Column(db.String(500))
    
    behavioral_observations = db.Column(db.Text)
    verbalizations = db.Column(db.Text)
    post_drawing_inquiry = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# درجات عناصر رسم الرجل
class DapItemScore(db.Model):
    __tablename__ = 'dap_item_scores'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('dap_assessments.id'), nullable=False)
    scoring_item_id = db.Column(db.Integer, db.ForeignKey('dap_scoring_items.id'), nullable=False)
    
    drawing_type = db.Column(db.String(50), nullable=False)  # man, woman, self
    
    # التسجيل
    score = db.Column(db.Integer, default=0)
    is_present = db.Column(db.Boolean, default=False)
    quality_rating = db.Column(db.String(50))
    
    # التحليل المفصل
    location_description = db.Column(db.String(200))
    size_description = db.Column(db.String(100))
    quality_description = db.Column(db.String(200))
    
    behavioral_observations = db.Column(db.Text)
    scorer_notes = db.Column(db.Text)
    
    scored_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    scored_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# البيانات المعيارية لرسم الرجل
class DapNorms(db.Model):
    __tablename__ = 'dap_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # المعلومات الديموغرافية
    age_years = db.Column(db.Integer, nullable=False)
    age_months = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(10))
    
    # الإحصائيات المعيارية
    mean_score = db.Column(db.Float)
    standard_deviation = db.Column(db.Float)
    percentile_ranks = db.Column(db.JSON)
    standard_scores = db.Column(db.JSON)
    
    # تحويل معدل الذكاء
    iq_conversion_table = db.Column(db.JSON)
    mental_age_equivalents = db.Column(db.JSON)
    
    # الثبات والصدق
    reliability_coefficient = db.Column(db.Float)
    validity_indicators = db.Column(db.JSON)
    
    # الاعتبارات الثقافية
    cultural_group = db.Column(db.String(100))
    socioeconomic_factors = db.Column(db.JSON)
    
    norm_source = db.Column(db.String(200))
    publication_year = db.Column(db.Integer)
    sample_size = db.Column(db.Integer)
    
    is_active = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# تقرير مقياس رسم الرجل
class DapReport(db.Model):
    __tablename__ = 'dap_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('dap_assessments.id'), nullable=False)
    
    report_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    report_type = db.Column(db.String(50), nullable=False, default='comprehensive')
    
    # أقسام التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    
    # النتائج الكمية
    scoring_summary = db.Column(db.JSON)
    normative_comparisons = db.Column(db.JSON)
    developmental_analysis = db.Column(db.Text)
    
    # التحليل النوعي
    cognitive_interpretation = db.Column(db.Text)
    emotional_indicators_analysis = db.Column(db.Text)
    developmental_concerns = db.Column(db.Text)
    
    # الانطباعات الإكلينيكية
    strengths_identified = db.Column(db.Text)
    areas_of_concern = db.Column(db.Text)
    diagnostic_considerations = db.Column(db.Text)
    
    # التوصيات
    educational_recommendations = db.Column(db.Text)
    therapeutic_recommendations = db.Column(db.Text)
    follow_up_suggestions = db.Column(db.Text)
    
    # إدارة التقرير
    report_status = db.Column(db.String(20), default='draft')
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    review_date = db.Column(db.DateTime)
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ===== نهاية نماذج مقياس رسم الرجل =====


# ===== نماذج مقياس جيليام للتوحد (Gilliam Autism Rating Scale) =====

# نموذج تقييم جيليام للتوحد
class GarsAssessment(db.Model):
    __tablename__ = 'gars_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50), nullable=False, default='comprehensive')
    scale_version = db.Column(db.String(50), nullable=False, default='gars_3')
    
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    
    status = db.Column(db.String(20), default='in_progress')
    completion_date = db.Column(db.DateTime)
    
    # معلومات المستجيب
    respondent_name = db.Column(db.String(200))
    respondent_relationship = db.Column(db.String(100))
    respondent_years_known = db.Column(db.Integer)
    respondent_contact_hours = db.Column(db.String(50))
    
    # بيئة التقييم
    assessment_setting = db.Column(db.String(100))
    assessment_duration_minutes = db.Column(db.Integer)
    
    # الدرجات الخام للمجالات
    stereotyped_behaviors_raw = db.Column(db.Integer, default=0)
    communication_raw = db.Column(db.Integer, default=0)
    social_interaction_raw = db.Column(db.Integer, default=0)
    developmental_disturbances_raw = db.Column(db.Integer, default=0)
    
    # الدرجات المعيارية
    stereotyped_behaviors_standard = db.Column(db.Integer)
    communication_standard = db.Column(db.Integer)
    social_interaction_standard = db.Column(db.Integer)
    developmental_disturbances_standard = db.Column(db.Integer)
    
    # مؤشر التوحد
    autism_index = db.Column(db.Integer)
    autism_probability = db.Column(db.String(50))
    severity_level = db.Column(db.String(50))
    
    # الرتب المئوية
    stereotyped_behaviors_percentile = db.Column(db.Integer)
    communication_percentile = db.Column(db.Integer)
    social_interaction_percentile = db.Column(db.Integer)
    developmental_disturbances_percentile = db.Column(db.Integer)
    autism_index_percentile = db.Column(db.Integer)
    
    # التفسير الإكلينيكي
    clinical_interpretation = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    environmental_factors = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    # العلاقات
    domain_results = db.relationship('GarsDomainResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    item_responses = db.relationship('GarsItemResponse', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('GarsReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# مجالات مقياس جيليام
class GarsDomain(db.Model):
    __tablename__ = 'gars_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_name = db.Column(db.String(100), nullable=False)
    domain_name_ar = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    description_ar = db.Column(db.Text)
    
    domain_code = db.Column(db.String(10), nullable=False, unique=True)
    display_order = db.Column(db.Integer, default=0)
    
    # معايير التسجيل
    scoring_range_min = db.Column(db.Integer, default=0)
    scoring_range_max = db.Column(db.Integer, default=3)
    interpretation_guidelines = db.Column(db.JSON)
    
    # المعايير التشخيصية
    diagnostic_significance = db.Column(db.Text)
    behavioral_indicators = db.Column(db.JSON)
    
    is_active = db.Column(db.Boolean, default=True)
    
    # العلاقات
    items = db.relationship('GarsItem', backref='domain', lazy=True)
    domain_results = db.relationship('GarsDomainResult', backref='domain', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# عناصر مقياس جيليام
class GarsItem(db.Model):
    __tablename__ = 'gars_items'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey('gars_domains.id'), nullable=False)
    
    item_number = db.Column(db.Integer, nullable=False)
    item_text = db.Column(db.Text, nullable=False)
    item_text_ar = db.Column(db.Text, nullable=False)
    
    # معايير التسجيل
    scoring_criteria = db.Column(db.JSON)
    behavioral_examples = db.Column(db.JSON)
    
    # معلومات التطوير
    age_appropriateness = db.Column(db.JSON)
    developmental_significance = db.Column(db.Text)
    
    # إرشادات الإدارة
    administration_notes = db.Column(db.Text)
    observation_guidelines = db.Column(db.Text)
    
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    
    # العلاقات
    item_responses = db.relationship('GarsItemResponse', backref='item', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# نتائج مجالات جيليام
class GarsDomainResult(db.Model):
    __tablename__ = 'gars_domain_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('gars_assessments.id'), nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey('gars_domains.id'), nullable=False)
    
    # الدرجات
    raw_score = db.Column(db.Integer, default=0)
    standard_score = db.Column(db.Integer)
    percentile_rank = db.Column(db.Integer)
    
    # التفسير
    performance_level = db.Column(db.String(50))
    clinical_significance = db.Column(db.String(100))
    
    # الملاحظات
    behavioral_observations = db.Column(db.Text)
    strengths_noted = db.Column(db.Text)
    concerns_identified = db.Column(db.Text)
    
    completion_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# استجابات عناصر جيليام
class GarsItemResponse(db.Model):
    __tablename__ = 'gars_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('gars_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('gars_items.id'), nullable=False)
    
    # الاستجابة
    response_score = db.Column(db.Integer, nullable=False)
    response_text = db.Column(db.String(100))
    
    # السياق والملاحظات
    behavioral_context = db.Column(db.Text)
    frequency_observed = db.Column(db.String(50))
    intensity_level = db.Column(db.String(50))
    
    # أمثلة محددة
    specific_examples = db.Column(db.Text)
    environmental_factors = db.Column(db.Text)
    
    # معلومات الاستجابة
    response_confidence = db.Column(db.String(50))
    additional_notes = db.Column(db.Text)
    
    responded_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    response_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# البيانات المعيارية لجيليام
class GarsNorms(db.Model):
    __tablename__ = 'gars_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # المعلومات الديموغرافية
    age_range_start = db.Column(db.Integer, nullable=False)
    age_range_end = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(10))
    
    # البيانات المعيارية للمجالات
    domain_norms = db.Column(db.JSON)
    
    # جداول تحويل الدرجات
    raw_to_standard_conversion = db.Column(db.JSON)
    standard_to_percentile_conversion = db.Column(db.JSON)
    
    # حساب مؤشر التوحد
    autism_index_calculation = db.Column(db.JSON)
    probability_levels = db.Column(db.JSON)
    
    # معلومات المعايرة
    norm_source = db.Column(db.String(200))
    publication_year = db.Column(db.Integer)
    sample_size = db.Column(db.Integer)
    reliability_data = db.Column(db.JSON)
    validity_data = db.Column(db.JSON)
    
    # الاعتبارات الثقافية
    cultural_considerations = db.Column(db.JSON)
    
    is_active = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# تقرير مقياس جيليام
class GarsReport(db.Model):
    __tablename__ = 'gars_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('gars_assessments.id'), nullable=False)
    
    report_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    report_type = db.Column(db.String(50), nullable=False, default='comprehensive')
    
    # أقسام التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    assessment_procedures = db.Column(db.Text)
    
    # النتائج الكمية
    domain_scores_summary = db.Column(db.JSON)
    autism_index_interpretation = db.Column(db.Text)
    comparative_analysis = db.Column(db.Text)
    
    # التحليل النوعي
    behavioral_profile = db.Column(db.Text)
    strengths_analysis = db.Column(db.Text)
    areas_of_concern = db.Column(db.Text)
    
    # التفسير الإكلينيكي
    diagnostic_impressions = db.Column(db.Text)
    severity_assessment = db.Column(db.Text)
    prognosis_considerations = db.Column(db.Text)
    
    # التوصيات
    intervention_recommendations = db.Column(db.Text)
    educational_recommendations = db.Column(db.Text)
    family_support_recommendations = db.Column(db.Text)
    follow_up_recommendations = db.Column(db.Text)
    
    # إدارة التقرير
    report_status = db.Column(db.String(20), default='draft')
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    review_date = db.Column(db.DateTime)
    approved_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    approval_date = db.Column(db.DateTime)
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ===== نهاية نماذج مقياس جيليام للتوحد =====


# ===== نماذج مقياس ريبيل لتقييم اللغة (Reynell Language Assessment) =====

# نموذج تقييم ريبيل للغة
class ReynellAssessment(db.Model):
    __tablename__ = 'reynell_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    
    # معلومات التقييم
    assessment_type = db.Column(db.String(50), nullable=False, default='comprehensive')
    test_version = db.Column(db.String(50), nullable=False, default='reynell_iii')
    language_assessed = db.Column(db.String(50), default='arabic')
    
    # بيئة التقييم
    assessment_setting = db.Column(db.String(100))
    assessment_duration_minutes = db.Column(db.Integer)
    
    # الدرجات الخام
    comprehension_raw_score = db.Column(db.Integer, default=0)
    expression_raw_score = db.Column(db.Integer, default=0)
    
    # الأعمار اللغوية
    comprehension_language_age_months = db.Column(db.Integer)
    expression_language_age_months = db.Column(db.Integer)
    
    # المعادلات العمرية
    comprehension_age_equivalent = db.Column(db.String(20))
    expression_age_equivalent = db.Column(db.String(20))
    
    # الدرجات المعيارية
    comprehension_standard_score = db.Column(db.Integer)
    expression_standard_score = db.Column(db.Integer)
    overall_language_score = db.Column(db.Integer)
    
    # الرتب المئوية
    comprehension_percentile = db.Column(db.Integer)
    expression_percentile = db.Column(db.Integer)
    overall_percentile = db.Column(db.Integer)
    
    # مستوى الأداء
    comprehension_performance_level = db.Column(db.String(50))
    expression_performance_level = db.Column(db.String(50))
    overall_performance_level = db.Column(db.String(50))
    
    # الملاحظات السلوكية
    attention_span = db.Column(db.String(50))
    cooperation_level = db.Column(db.String(50))
    motivation_level = db.Column(db.String(50))
    behavioral_observations = db.Column(db.Text)
    
    # التفسير الإكلينيكي
    language_strengths = db.Column(db.Text)
    language_weaknesses = db.Column(db.Text)
    clinical_impressions = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='in_progress')
    completion_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    
    # العلاقات
    subtest_results = db.relationship('ReynellSubtestResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    item_responses = db.relationship('ReynellItemResponse', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('ReynellReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# الاختبارات الفرعية لمقياس ريبيل
class ReynellSubtest(db.Model):
    __tablename__ = 'reynell_subtests'
    
    id = db.Column(db.Integer, primary_key=True)
    subtest_name = db.Column(db.String(100), nullable=False)
    subtest_name_ar = db.Column(db.String(100), nullable=False)
    subtest_code = db.Column(db.String(20), nullable=False, unique=True)
    
    # تصنيف الاختبار
    domain = db.Column(db.String(50), nullable=False)  # comprehension, expression
    skill_area = db.Column(db.String(100))
    
    description = db.Column(db.Text)
    description_ar = db.Column(db.Text)
    
    # معلومات الإدارة
    administration_instructions = db.Column(db.Text)
    scoring_criteria = db.Column(db.JSON)
    age_range_start = db.Column(db.Integer)
    age_range_end = db.Column(db.Integer)
    
    # ترتيب العرض
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # العلاقات
    items = db.relationship('ReynellItem', backref='subtest', lazy=True)
    subtest_results = db.relationship('ReynellSubtestResult', backref='subtest', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# عناصر مقياس ريبيل
class ReynellItem(db.Model):
    __tablename__ = 'reynell_items'
    
    id = db.Column(db.Integer, primary_key=True)
    subtest_id = db.Column(db.Integer, db.ForeignKey('reynell_subtests.id'), nullable=False)
    
    item_number = db.Column(db.Integer, nullable=False)
    item_text = db.Column(db.Text, nullable=False)
    item_text_ar = db.Column(db.Text, nullable=False)
    
    # معايير التسجيل
    scoring_method = db.Column(db.String(50))  # pass_fail, scaled, multiple_choice
    max_score = db.Column(db.Integer, default=1)
    scoring_criteria = db.Column(db.JSON)
    
    # مواد التقييم
    materials_needed = db.Column(db.JSON)
    visual_aids_path = db.Column(db.String(500))
    audio_file_path = db.Column(db.String(500))
    
    # إرشادات الإدارة
    administration_notes = db.Column(db.Text)
    prompting_allowed = db.Column(db.Boolean, default=False)
    time_limit_seconds = db.Column(db.Integer)
    
    # معلومات التطوير
    developmental_level = db.Column(db.String(50))
    skill_targeted = db.Column(db.String(200))
    
    # ترتيب العرض
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # العلاقات
    item_responses = db.relationship('ReynellItemResponse', backref='item', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# نتائج الاختبارات الفرعية
class ReynellSubtestResult(db.Model):
    __tablename__ = 'reynell_subtest_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('reynell_assessments.id'), nullable=False)
    subtest_id = db.Column(db.Integer, db.ForeignKey('reynell_subtests.id'), nullable=False)
    
    # الدرجات
    raw_score = db.Column(db.Integer, default=0)
    max_possible_score = db.Column(db.Integer)
    percentage_score = db.Column(db.Float)
    
    # التفسير
    performance_level = db.Column(db.String(50))
    age_equivalent_months = db.Column(db.Integer)
    
    # الملاحظات
    behavioral_observations = db.Column(db.Text)
    error_patterns = db.Column(db.Text)
    strengths_noted = db.Column(db.Text)
    areas_of_difficulty = db.Column(db.Text)
    
    completion_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# استجابات عناصر ريبيل
class ReynellItemResponse(db.Model):
    __tablename__ = 'reynell_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('reynell_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('reynell_items.id'), nullable=False)
    
    # الاستجابة
    response_score = db.Column(db.Integer, nullable=False)
    response_text = db.Column(db.Text)
    is_correct = db.Column(db.Boolean)
    
    # تفاصيل الاستجابة
    response_time_seconds = db.Column(db.Integer)
    prompts_given = db.Column(db.Integer, default=0)
    error_type = db.Column(db.String(100))
    
    # الملاحظات
    behavioral_notes = db.Column(db.Text)
    examiner_observations = db.Column(db.Text)
    
    responded_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    response_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# البيانات المعيارية لريبيل
class ReynellNorms(db.Model):
    __tablename__ = 'reynell_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # المعلومات الديموغرافية
    age_range_start_months = db.Column(db.Integer, nullable=False)
    age_range_end_months = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(10))
    
    # البيانات المعيارية
    comprehension_norms = db.Column(db.JSON)
    expression_norms = db.Column(db.JSON)
    
    # جداول تحويل الدرجات
    raw_to_age_equivalent = db.Column(db.JSON)
    raw_to_standard_score = db.Column(db.JSON)
    standard_to_percentile = db.Column(db.JSON)
    
    # معلومات المعايرة
    norm_source = db.Column(db.String(200))
    publication_year = db.Column(db.Integer)
    sample_size = db.Column(db.Integer)
    reliability_data = db.Column(db.JSON)
    validity_data = db.Column(db.JSON)
    
    # الاعتبارات الثقافية واللغوية
    cultural_adaptations = db.Column(db.JSON)
    language_considerations = db.Column(db.JSON)
    
    is_active = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# تقرير مقياس ريبيل
class ReynellReport(db.Model):
    __tablename__ = 'reynell_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('reynell_assessments.id'), nullable=False)
    
    report_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    report_type = db.Column(db.String(50), nullable=False, default='comprehensive')
    
    # أقسام التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    assessment_procedures = db.Column(db.Text)
    
    # النتائج الكمية
    comprehension_results = db.Column(db.Text)
    expression_results = db.Column(db.Text)
    comparative_analysis = db.Column(db.Text)
    
    # التحليل النوعي
    language_profile = db.Column(db.Text)
    error_analysis = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    
    # التفسير الإكلينيكي
    diagnostic_impressions = db.Column(db.Text)
    language_level_interpretation = db.Column(db.Text)
    prognosis = db.Column(db.Text)
    
    # التوصيات
    intervention_recommendations = db.Column(db.Text)
    educational_recommendations = db.Column(db.Text)
    family_recommendations = db.Column(db.Text)
    follow_up_recommendations = db.Column(db.Text)
    
    # إدارة التقرير
    report_status = db.Column(db.String(20), default='draft')
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    review_date = db.Column(db.DateTime)
    approved_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    approval_date = db.Column(db.DateTime)
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ===== نهاية نماذج مقياس ريبيل لتقييم اللغة =====


# ===== نماذج مقياس أريزونا لتقييم النطق (Arizona Articulation Assessment) =====

# نموذج تقييم أريزونا للنطق
class ArizonaAssessment(db.Model):
    __tablename__ = 'arizona_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    
    # معلومات التقييم
    assessment_type = db.Column(db.String(50), nullable=False, default='comprehensive')
    test_version = db.Column(db.String(50), nullable=False, default='arizona_4')
    language_assessed = db.Column(db.String(50), default='arabic')
    
    # بيئة التقييم
    assessment_setting = db.Column(db.String(100))
    assessment_duration_minutes = db.Column(db.Integer)
    
    # الدرجات الإجمالية
    total_errors = db.Column(db.Integer, default=0)
    total_sounds_tested = db.Column(db.Integer, default=0)
    accuracy_percentage = db.Column(db.Float, default=0.0)
    
    # مستوى الشدة
    severity_level = db.Column(db.String(50))  # mild, moderate, severe, profound
    intelligibility_rating = db.Column(db.String(50))  # highly_intelligible, mostly_intelligible, partially_intelligible, unintelligible
    
    # أنماط الأخطاء
    substitution_errors = db.Column(db.Integer, default=0)
    omission_errors = db.Column(db.Integer, default=0)
    distortion_errors = db.Column(db.Integer, default=0)
    addition_errors = db.Column(db.Integer, default=0)
    
    # تحليل الأصوات
    consonant_errors = db.Column(db.Integer, default=0)
    vowel_errors = db.Column(db.Integer, default=0)
    cluster_errors = db.Column(db.Integer, default=0)
    
    # الملاحظات السلوكية
    cooperation_level = db.Column(db.String(50))
    attention_span = db.Column(db.String(50))
    oral_motor_observations = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    
    # التفسير الإكلينيكي
    articulation_strengths = db.Column(db.Text)
    articulation_weaknesses = db.Column(db.Text)
    error_patterns = db.Column(db.Text)
    clinical_impressions = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='in_progress')
    completion_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    
    # العلاقات
    sound_results = db.relationship('ArizonaSoundResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    position_results = db.relationship('ArizonaPositionResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('ArizonaReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# الأصوات في مقياس أريزونا
class ArizonaSound(db.Model):
    __tablename__ = 'arizona_sounds'
    
    id = db.Column(db.Integer, primary_key=True)
    sound_symbol = db.Column(db.String(10), nullable=False, unique=True)
    sound_name_ar = db.Column(db.String(50), nullable=False)
    sound_name_en = db.Column(db.String(50))
    
    # تصنيف الصوت
    sound_type = db.Column(db.String(50), nullable=False)  # consonant, vowel, cluster
    manner_of_articulation = db.Column(db.String(50))  # stop, fricative, nasal, etc.
    place_of_articulation = db.Column(db.String(50))  # bilabial, alveolar, velar, etc.
    voicing = db.Column(db.String(20))  # voiced, voiceless
    
    # معلومات التطوير
    typical_age_acquisition = db.Column(db.String(20))
    developmental_level = db.Column(db.String(50))
    
    # معلومات الاختبار
    test_positions = db.Column(db.JSON)  # initial, medial, final
    stimulus_words = db.Column(db.JSON)
    
    # ترتيب العرض
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # العلاقات
    sound_results = db.relationship('ArizonaSoundResult', backref='sound', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# نتائج الأصوات
class ArizonaSoundResult(db.Model):
    __tablename__ = 'arizona_sound_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('arizona_assessments.id'), nullable=False)
    sound_id = db.Column(db.Integer, db.ForeignKey('arizona_sounds.id'), nullable=False)
    
    # النتائج العامة
    total_attempts = db.Column(db.Integer, default=0)
    correct_productions = db.Column(db.Integer, default=0)
    accuracy_percentage = db.Column(db.Float, default=0.0)
    
    # أنواع الأخطاء
    substitution_count = db.Column(db.Integer, default=0)
    omission_count = db.Column(db.Integer, default=0)
    distortion_count = db.Column(db.Integer, default=0)
    addition_count = db.Column(db.Integer, default=0)
    
    # أنماط الأخطاء
    common_substitutions = db.Column(db.JSON)
    error_consistency = db.Column(db.String(50))  # consistent, inconsistent, emerging
    
    # الملاحظات
    behavioral_observations = db.Column(db.Text)
    stimulability = db.Column(db.String(50))  # stimulable, not_stimulable, emerging
    
    completion_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# نتائج المواضع
class ArizonaPositionResult(db.Model):
    __tablename__ = 'arizona_position_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('arizona_assessments.id'), nullable=False)
    sound_id = db.Column(db.Integer, db.ForeignKey('arizona_sounds.id'), nullable=False)
    
    # موضع الصوت
    position = db.Column(db.String(20), nullable=False)  # initial, medial, final
    stimulus_word = db.Column(db.String(100))
    
    # النتيجة
    production_accuracy = db.Column(db.String(20))  # correct, incorrect, distorted
    actual_production = db.Column(db.String(50))
    error_type = db.Column(db.String(50))
    
    # تفاصيل الاستجابة
    response_time_seconds = db.Column(db.Integer)
    prompts_needed = db.Column(db.Integer, default=0)
    self_correction = db.Column(db.Boolean, default=False)
    
    # الملاحظات
    examiner_notes = db.Column(db.Text)
    
    response_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# البيانات المعيارية لأريزونا
class ArizonaNorms(db.Model):
    __tablename__ = 'arizona_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # المعلومات الديموغرافية
    age_range_start_months = db.Column(db.Integer, nullable=False)
    age_range_end_months = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(10))
    
    # البيانات المعيارية
    accuracy_norms = db.Column(db.JSON)
    error_pattern_norms = db.Column(db.JSON)
    severity_cutoffs = db.Column(db.JSON)
    
    # معايير التشخيص
    diagnostic_criteria = db.Column(db.JSON)
    severity_classifications = db.Column(db.JSON)
    
    # معلومات المعايرة
    norm_source = db.Column(db.String(200))
    publication_year = db.Column(db.Integer)
    sample_size = db.Column(db.Integer)
    reliability_data = db.Column(db.JSON)
    validity_data = db.Column(db.JSON)
    
    # الاعتبارات الثقافية واللغوية
    cultural_considerations = db.Column(db.JSON)
    dialect_variations = db.Column(db.JSON)
    
    is_active = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# تقرير مقياس أريزونا
class ArizonaReport(db.Model):
    __tablename__ = 'arizona_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('arizona_assessments.id'), nullable=False)
    
    report_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    report_type = db.Column(db.String(50), nullable=False, default='comprehensive')
    
    # أقسام التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    assessment_procedures = db.Column(db.Text)
    
    # النتائج الكمية
    accuracy_results = db.Column(db.Text)
    error_analysis = db.Column(db.Text)
    severity_analysis = db.Column(db.Text)
    
    # التحليل النوعي
    articulation_profile = db.Column(db.Text)
    error_patterns_analysis = db.Column(db.Text)
    stimulability_results = db.Column(db.Text)
    
    # التفسير الإكلينيكي
    diagnostic_impressions = db.Column(db.Text)
    severity_rating = db.Column(db.Text)
    prognosis = db.Column(db.Text)
    
    # التوصيات
    intervention_recommendations = db.Column(db.Text)
    therapy_goals = db.Column(db.Text)
    home_program_recommendations = db.Column(db.Text)
    follow_up_recommendations = db.Column(db.Text)
    
    # إدارة التقرير
    report_status = db.Column(db.String(20), default='draft')
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    review_date = db.Column(db.DateTime)
    approved_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    approval_date = db.Column(db.DateTime)
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ===== نهاية نماذج مقياس أريزونا لتقييم النطق =====


# ===== نماذج مقياس شدة التلعثم (Stuttering Severity Assessment) =====

# نموذج تقييم شدة التلعثم
class StutteringAssessment(db.Model):
    __tablename__ = 'stuttering_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    
    # معلومات التقييم
    assessment_type = db.Column(db.String(50), nullable=False, default='comprehensive')
    test_version = db.Column(db.String(50), nullable=False, default='ssi_4')
    
    # بيئة التقييم
    assessment_setting = db.Column(db.String(100))
    assessment_duration_minutes = db.Column(db.Integer)
    
    # عينات الكلام
    reading_sample_words = db.Column(db.Integer, default=0)
    spontaneous_sample_words = db.Column(db.Integer, default=0)
    total_words_analyzed = db.Column(db.Integer, default=0)
    
    # تكرار التلعثم
    total_stuttering_events = db.Column(db.Integer, default=0)
    stuttering_frequency_percentage = db.Column(db.Float, default=0.0)
    frequency_score = db.Column(db.Integer, default=0)
    
    # مدة التلعثم
    average_duration_seconds = db.Column(db.Float, default=0.0)
    longest_duration_seconds = db.Column(db.Float, default=0.0)
    duration_score = db.Column(db.Integer, default=0)
    
    # السلوكيات المصاحبة
    physical_concomitants_score = db.Column(db.Integer, default=0)
    distracting_sounds_score = db.Column(db.Integer, default=0)
    facial_grimaces_score = db.Column(db.Integer, default=0)
    head_movements_score = db.Column(db.Integer, default=0)
    extremity_movements_score = db.Column(db.Integer, default=0)
    
    # النتائج الإجمالية
    total_overall_score = db.Column(db.Integer, default=0)
    severity_rating = db.Column(db.String(50))  # very_mild, mild, moderate, severe, very_severe
    percentile_rank = db.Column(db.Integer)
    
    # أنواع التلعثم
    repetitions_count = db.Column(db.Integer, default=0)
    prolongations_count = db.Column(db.Integer, default=0)
    blocks_count = db.Column(db.Integer, default=0)
    interjections_count = db.Column(db.Integer, default=0)
    revisions_count = db.Column(db.Integer, default=0)
    
    # الملاحظات السلوكية
    avoidance_behaviors = db.Column(db.Text)
    secondary_behaviors = db.Column(db.Text)
    emotional_reactions = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    
    # التفسير الإكلينيكي
    stuttering_pattern = db.Column(db.Text)
    impact_on_communication = db.Column(db.Text)
    clinical_impressions = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='in_progress')
    completion_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    
    # العلاقات
    speech_samples = db.relationship('StutteringSpeechSample', backref='assessment', lazy=True, cascade='all, delete-orphan')
    behavior_observations = db.relationship('StutteringBehaviorObservation', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('StutteringReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# عينات الكلام للتلعثم
class StutteringSpeechSample(db.Model):
    __tablename__ = 'stuttering_speech_samples'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('stuttering_assessments.id'), nullable=False)
    
    # نوع العينة
    sample_type = db.Column(db.String(50), nullable=False)  # reading, spontaneous, conversation
    sample_description = db.Column(db.Text)
    
    # تحليل العينة
    total_words = db.Column(db.Integer, default=0)
    total_syllables = db.Column(db.Integer, default=0)
    stuttering_events = db.Column(db.Integer, default=0)
    
    # أنواع التلعثم في العينة
    repetitions = db.Column(db.Integer, default=0)
    prolongations = db.Column(db.Integer, default=0)
    blocks = db.Column(db.Integer, default=0)
    interjections = db.Column(db.Integer, default=0)
    
    # التوقيت
    sample_duration_seconds = db.Column(db.Integer)
    speaking_time_seconds = db.Column(db.Integer)
    
    # الملاحظات
    sample_notes = db.Column(db.Text)
    audio_file_path = db.Column(db.String(500))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ملاحظات السلوكيات المصاحبة
class StutteringBehaviorObservation(db.Model):
    __tablename__ = 'stuttering_behavior_observations'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('stuttering_assessments.id'), nullable=False)
    
    # نوع السلوك
    behavior_type = db.Column(db.String(50), nullable=False)
    behavior_description = db.Column(db.Text)
    
    # شدة السلوك
    severity_rating = db.Column(db.Integer)  # 0-4 scale
    frequency = db.Column(db.String(50))  # never, rarely, sometimes, often, always
    
    # السياق
    context_observed = db.Column(db.String(100))
    triggers = db.Column(db.Text)
    
    # الملاحظات
    examiner_notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# البيانات المعيارية للتلعثم
class StutteringNorms(db.Model):
    __tablename__ = 'stuttering_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # المعلومات الديموغرافية
    age_range_start_months = db.Column(db.Integer, nullable=False)
    age_range_end_months = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(10))
    
    # البيانات المعيارية
    frequency_norms = db.Column(db.JSON)
    duration_norms = db.Column(db.JSON)
    severity_cutoffs = db.Column(db.JSON)
    
    # جداول تحويل الدرجات
    raw_to_scaled_scores = db.Column(db.JSON)
    severity_classifications = db.Column(db.JSON)
    percentile_ranks = db.Column(db.JSON)
    
    # معلومات المعايرة
    norm_source = db.Column(db.String(200))
    publication_year = db.Column(db.Integer)
    sample_size = db.Column(db.Integer)
    reliability_data = db.Column(db.JSON)
    validity_data = db.Column(db.JSON)
    
    is_active = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# تقرير مقياس التلعثم
class StutteringReport(db.Model):
    __tablename__ = 'stuttering_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('stuttering_assessments.id'), nullable=False)
    
    report_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    report_type = db.Column(db.String(50), nullable=False, default='comprehensive')
    
    # أقسام التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    assessment_procedures = db.Column(db.Text)
    
    # النتائج الكمية
    frequency_analysis = db.Column(db.Text)
    duration_analysis = db.Column(db.Text)
    severity_analysis = db.Column(db.Text)
    
    # التحليل النوعي
    stuttering_pattern_analysis = db.Column(db.Text)
    secondary_behaviors_analysis = db.Column(db.Text)
    impact_assessment = db.Column(db.Text)
    
    # التفسير الإكلينيكي
    diagnostic_impressions = db.Column(db.Text)
    severity_interpretation = db.Column(db.Text)
    prognosis = db.Column(db.Text)
    
    # التوصيات
    therapy_recommendations = db.Column(db.Text)
    intervention_goals = db.Column(db.Text)
    family_counseling_recommendations = db.Column(db.Text)
    follow_up_recommendations = db.Column(db.Text)
    
    # إدارة التقرير
    report_status = db.Column(db.String(20), default='draft')
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    review_date = db.Column(db.DateTime)
    approved_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    approval_date = db.Column(db.DateTime)
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ===== نهاية نماذج مقياس شدة التلعثم =====


# ===== نماذج مقياس عيوب النطق (Speech Defects Assessment) =====

# نموذج تقييم عيوب النطق
class SpeechDefectsAssessment(db.Model):
    __tablename__ = 'speech_defects_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    
    # معلومات التقييم
    assessment_type = db.Column(db.String(50), nullable=False, default='comprehensive')
    language_assessed = db.Column(db.String(50), default='arabic')
    
    # بيئة التقييم
    assessment_setting = db.Column(db.String(100))
    assessment_duration_minutes = db.Column(db.Integer)
    
    # النتائج الإجمالية
    total_defects_identified = db.Column(db.Integer, default=0)
    overall_severity = db.Column(db.String(50))  # mild, moderate, severe, profound
    intelligibility_rating = db.Column(db.String(50))
    
    # أنواع عيوب النطق
    articulation_disorders = db.Column(db.Boolean, default=False)
    phonological_disorders = db.Column(db.Boolean, default=False)
    apraxia_of_speech = db.Column(db.Boolean, default=False)
    dysarthria = db.Column(db.Boolean, default=False)
    
    # عيوب محددة
    lisping = db.Column(db.Boolean, default=False)
    rhotacism = db.Column(db.Boolean, default=False)  # عيب نطق الراء
    lambdacism = db.Column(db.Boolean, default=False)  # عيب نطق اللام
    sigmatism = db.Column(db.Boolean, default=False)  # عيب نطق السين
    
    # تحليل الأصوات المتأثرة
    affected_consonants = db.Column(db.JSON)
    affected_vowels = db.Column(db.JSON)
    affected_clusters = db.Column(db.JSON)
    
    # أنماط الأخطاء
    substitution_patterns = db.Column(db.JSON)
    omission_patterns = db.Column(db.JSON)
    distortion_patterns = db.Column(db.JSON)
    addition_patterns = db.Column(db.JSON)
    
    # التقييم الوظيفي
    oral_motor_function = db.Column(db.String(50))
    hearing_status = db.Column(db.String(50))
    dental_occlusion = db.Column(db.String(50))
    tongue_function = db.Column(db.String(50))
    
    # الملاحظات السلوكية
    cooperation_level = db.Column(db.String(50))
    attention_span = db.Column(db.String(50))
    frustration_level = db.Column(db.String(50))
    behavioral_observations = db.Column(db.Text)
    
    # التأثير الوظيفي
    academic_impact = db.Column(db.Text)
    social_impact = db.Column(db.Text)
    emotional_impact = db.Column(db.Text)
    
    # التفسير الإكلينيكي
    primary_defects = db.Column(db.Text)
    secondary_defects = db.Column(db.Text)
    contributing_factors = db.Column(db.Text)
    clinical_impressions = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='in_progress')
    completion_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    
    # العلاقات
    defect_details = db.relationship('SpeechDefectDetail', backref='assessment', lazy=True, cascade='all, delete-orphan')
    sound_assessments = db.relationship('DefectSoundAssessment', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('SpeechDefectsReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# تفاصيل عيوب النطق
class SpeechDefectDetail(db.Model):
    __tablename__ = 'speech_defect_details'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('speech_defects_assessments.id'), nullable=False)
    
    # نوع العيب
    defect_type = db.Column(db.String(100), nullable=False)
    defect_name_ar = db.Column(db.String(100), nullable=False)
    defect_description = db.Column(db.Text)
    
    # شدة العيب
    severity_level = db.Column(db.String(50))
    frequency = db.Column(db.String(50))
    consistency = db.Column(db.String(50))
    
    # الأصوات المتأثرة
    affected_sounds = db.Column(db.JSON)
    positions_affected = db.Column(db.JSON)  # initial, medial, final
    
    # أمثلة
    error_examples = db.Column(db.JSON)
    correct_productions = db.Column(db.JSON)
    
    # الاستثارة
    stimulability = db.Column(db.String(50))
    stimulation_techniques = db.Column(db.Text)
    
    # الملاحظات
    examiner_notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# تقييم الأصوات لعيوب النطق
class DefectSoundAssessment(db.Model):
    __tablename__ = 'defect_sound_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('speech_defects_assessments.id'), nullable=False)
    
    # الصوت المُقيم
    sound_symbol = db.Column(db.String(10), nullable=False)
    sound_name_ar = db.Column(db.String(50))
    
    # النتائج
    initial_position_accuracy = db.Column(db.String(20))  # correct, incorrect, not_tested
    medial_position_accuracy = db.Column(db.String(20))
    final_position_accuracy = db.Column(db.String(20))
    
    # نوع الخطأ
    error_type = db.Column(db.String(50))
    error_description = db.Column(db.Text)
    
    # الكلمات المستخدمة
    test_words = db.Column(db.JSON)
    
    # الاستثارة
    stimulable = db.Column(db.Boolean, default=False)
    stimulation_level = db.Column(db.String(50))
    
    # الملاحظات
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# تقرير عيوب النطق
class SpeechDefectsReport(db.Model):
    __tablename__ = 'speech_defects_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('speech_defects_assessments.id'), nullable=False)
    
    report_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    report_type = db.Column(db.String(50), nullable=False, default='comprehensive')
    
    # أقسام التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    assessment_procedures = db.Column(db.Text)
    
    # النتائج
    defects_identified = db.Column(db.Text)
    severity_analysis = db.Column(db.Text)
    error_pattern_analysis = db.Column(db.Text)
    
    # التحليل النوعي
    speech_profile = db.Column(db.Text)
    functional_impact = db.Column(db.Text)
    stimulability_results = db.Column(db.Text)
    
    # التفسير الإكلينيكي
    diagnostic_impressions = db.Column(db.Text)
    etiology_discussion = db.Column(db.Text)
    prognosis = db.Column(db.Text)
    
    # التوصيات
    therapy_recommendations = db.Column(db.Text)
    intervention_priorities = db.Column(db.Text)
    home_program = db.Column(db.Text)
    follow_up_recommendations = db.Column(db.Text)
    
    # إدارة التقرير
    report_status = db.Column(db.String(20), default='draft')
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    review_date = db.Column(db.DateTime)
    approved_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    approval_date = db.Column(db.DateTime)
    
    # بيانات التتبع
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ===== نهاية نماذج مقياس عيوب النطق =====


class FormTemplate(db.Model):
    """نموذج النماذج الجاهزة"""
    __tablename__ = 'form_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200))
    description = db.Column(db.Text)
    category = db.Column(db.String(100))  # student, teacher, admin, finance, etc.
    form_type = db.Column(db.String(50), nullable=False)  # registration, evaluation, report, etc.
    
    # محتوى النموذج
    form_structure = db.Column(db.JSON)  # بنية النموذج (الحقول والتخطيط)
    form_config = db.Column(db.JSON)  # إعدادات النموذج
    validation_rules = db.Column(db.JSON)  # قواعد التحقق
    
    # إعدادات العرض
    layout_type = db.Column(db.String(50), default='vertical')  # vertical, horizontal, grid
    theme = db.Column(db.String(50), default='default')
    custom_css = db.Column(db.Text)
    
    # إعدادات الوصول
    is_public = db.Column(db.Boolean, default=False)
    requires_authentication = db.Column(db.Boolean, default=True)
    allowed_roles = db.Column(db.JSON)  # الأدوار المسموح لها بالوصول
    
    # إعدادات الإرسال
    submission_settings = db.Column(db.JSON)  # إعدادات الإرسال والحفظ
    notification_settings = db.Column(db.JSON)  # إعدادات الإشعارات
    
    # إحصائيات
    usage_count = db.Column(db.Integer, default=0)
    submission_count = db.Column(db.Integer, default=0)
    
    # معلومات النظام
    is_active = db.Column(db.Boolean, default=True)
    is_system_template = db.Column(db.Boolean, default=False)  # نموذج نظام أم مخصص
    version = db.Column(db.String(20), default='1.0')
    
    # تواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # علاقات
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'))
    
    # العلاقات
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_form_templates')
    updater = db.relationship('User', foreign_keys=[updated_by], backref='updated_form_templates')
    branch = db.relationship('Branch', backref='form_templates')
    submissions = db.relationship('FormSubmission', backref='template', lazy='dynamic')
    
    def __repr__(self):
        return f'<FormTemplate {self.name}>'

class FormField(db.Model):
    """نموذج حقول النماذج"""
    __tablename__ = 'form_fields'
    
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('form_templates.id'), nullable=False)
    
    # معلومات الحقل
    field_name = db.Column(db.String(100), nullable=False)
    field_label = db.Column(db.String(200), nullable=False)
    field_label_en = db.Column(db.String(200))
    field_type = db.Column(db.String(50), nullable=False)  # text, email, number, select, checkbox, etc.
    
    # إعدادات الحقل
    field_config = db.Column(db.JSON)  # إعدادات خاصة بنوع الحقل
    validation_rules = db.Column(db.JSON)  # قواعد التحقق للحقل
    default_value = db.Column(db.Text)
    placeholder = db.Column(db.String(200))
    help_text = db.Column(db.Text)
    
    # إعدادات العرض
    display_order = db.Column(db.Integer, default=0)
    column_width = db.Column(db.Integer, default=12)  # عرض العمود (1-12)
    is_required = db.Column(db.Boolean, default=False)
    is_visible = db.Column(db.Boolean, default=True)
    is_readonly = db.Column(db.Boolean, default=False)
    
    # إعدادات متقدمة
    conditional_logic = db.Column(db.JSON)  # منطق الإظهار الشرطي
    calculation_formula = db.Column(db.Text)  # صيغة الحساب للحقول المحسوبة
    
    # تواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    template = db.relationship('FormTemplate', backref='fields')
    
    def __repr__(self):
        return f'<FormField {self.field_name}>'

class FormSubmission(db.Model):
    """نموذج إرسالات النماذج"""
    __tablename__ = 'form_submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('form_templates.id'), nullable=False)
    
    # بيانات الإرسال
    submission_data = db.Column(db.JSON, nullable=False)  # بيانات النموذج المرسل
    submission_files = db.Column(db.JSON)  # الملفات المرفقة
    
    # معلومات المرسل
    submitted_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    submitter_ip = db.Column(db.String(45))
    submitter_user_agent = db.Column(db.Text)
    
    # حالة الإرسال
    status = db.Column(db.String(50), default='submitted')  # submitted, reviewed, approved, rejected
    review_notes = db.Column(db.Text)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # معلومات إضافية
    reference_number = db.Column(db.String(50), unique=True)
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    tags = db.Column(db.JSON)
    
    # تواريخ
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # علاقات
    submitter = db.relationship('User', foreign_keys=[submitted_by], backref='form_submissions')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='reviewed_submissions')
    
    def __repr__(self):
        return f'<FormSubmission {self.reference_number}>'

class FormCategory(db.Model):
    """نموذج فئات النماذج"""
    __tablename__ = 'form_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    description = db.Column(db.Text)
    
    # إعدادات العرض
    color = db.Column(db.String(7), default='#007bff')
    icon = db.Column(db.String(50))
    sort_order = db.Column(db.Integer, default=0)
    
    # معلومات النظام
    is_active = db.Column(db.Boolean, default=True)
    is_system_category = db.Column(db.Boolean, default=False)
    
    # تواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # علاقات
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'))
    
    creator = db.relationship('User', backref='created_form_categories')
    branch = db.relationship('Branch', backref='form_categories')
    
    def __repr__(self):
        return f'<FormCategory {self.name}>'

class FormWorkflow(db.Model):
    """نموذج سير العمل للنماذج"""
    __tablename__ = 'form_workflows'
    
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('form_templates.id'), nullable=False)
    
    # معلومات سير العمل
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # خطوات سير العمل
    workflow_steps = db.Column(db.JSON, nullable=False)  # خطوات المراجعة والموافقة
    
    # إعدادات
    is_active = db.Column(db.Boolean, default=True)
    auto_assign = db.Column(db.Boolean, default=False)
    notification_enabled = db.Column(db.Boolean, default=True)
    
    # تواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # علاقات
    template = db.relationship('FormTemplate', backref='workflows')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    creator = db.relationship('User', backref='created_workflows')
    
    def __repr__(self):
        return f'<FormWorkflow {self.name}>'

class FormAnalytics(db.Model):
    """نموذج تحليلات النماذج"""
    __tablename__ = 'form_analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('form_templates.id'), nullable=False)
    
    # إحصائيات يومية
    date = db.Column(db.Date, nullable=False)
    views_count = db.Column(db.Integer, default=0)
    submissions_count = db.Column(db.Integer, default=0)
    completion_rate = db.Column(db.Float, default=0.0)
    average_completion_time = db.Column(db.Integer)  # بالثواني
    field_analytics = db.Column(db.JSON)  # تحليلات على مستوى الحقول
    user_analytics = db.Column(db.JSON)  # تحليلات المستخدمين
    device_analytics = db.Column(db.JSON)  # تحليلات الأجهزة
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    template = db.relationship('FormTemplate', backref='analytics')
    
    def __repr__(self):
        return f'<FormAnalytics {self.template_id} - {self.date}>'

class MessageThread(db.Model):
    __tablename__ = 'message_threads'
    
    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String(255), nullable=False)
    thread_type = db.Column(db.String(50), nullable=False)  # individual, group, announcement
    is_group = db.Column(db.Boolean, default=False)
    group_name = db.Column(db.String(255))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    is_archived = db.Column(db.Boolean, default=False)
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    tags = db.Column(db.JSON)  # علامات للتصنيف
    extra_metadata = db.Column(db.JSON)  # معلومات إضافية
    
    # العلاقات
    creator = db.relationship('User', foreign_keys=[created_by])
    messages = db.relationship('Message', backref='thread', cascade='all, delete-orphan')
    participants = db.relationship('MessageParticipant', backref='thread', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<MessageThread {self.subject}>'


class MessageParticipant(db.Model):
    __tablename__ = 'message_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    thread_id = db.Column(db.Integer, db.ForeignKey('message_threads.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(50), default='member')  # admin, moderator, member
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    left_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    is_muted = db.Column(db.Boolean, default=False)
    permissions = db.Column(db.JSON)  # صلاحيات خاصة
    
    # العلاقات
    user = db.relationship('User')
    
    def __repr__(self):
        return f'<MessageParticipant {self.user_id} in {self.thread_id}>'

class MessageRead(db.Model):
    __tablename__ = 'message_reads'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    read_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User')
    
    def __repr__(self):
        return f'<MessageRead {self.message_id} by {self.user_id}>'

class MessageAttachment(db.Model):
    __tablename__ = 'message_attachments'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    file_type = db.Column(db.String(100))
    mime_type = db.Column(db.String(100))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    message = db.relationship('Message', backref='attachment_files')
    
    def __repr__(self):
        return f'<MessageAttachment {self.filename}>'

class TaskCategory(db.Model):
    __tablename__ = 'task_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    description = db.Column(db.Text)
    color = db.Column(db.String(7), default='#007bff')
    icon = db.Column(db.String(50), default='fas fa-tasks')
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    creator = db.relationship('User')
    tasks = db.relationship('Task', backref='category')
    
    def __repr__(self):
        return f'<TaskCategory {self.name}>'

class Task(db.Model):
    __tablename__ = 'tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey('task_categories.id'))
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(50), default='pending')  # pending, in_progress, completed, cancelled, on_hold
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    due_date = db.Column(db.DateTime)
    start_date = db.Column(db.DateTime)
    completion_date = db.Column(db.DateTime)
    estimated_hours = db.Column(db.Float)
    actual_hours = db.Column(db.Float)
    progress_percentage = db.Column(db.Integer, default=0)
    tags = db.Column(db.JSON)  # علامات للتصنيف
    attachments = db.Column(db.JSON)  # المرفقات
    dependencies = db.Column(db.JSON)  # المهام المعتمدة عليها
    recurring_pattern = db.Column(db.JSON)  # نمط التكرار
    is_recurring = db.Column(db.Boolean, default=False)
    parent_task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'))  # للمهام الفرعية
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    assigner = db.relationship('User', foreign_keys=[assigned_by])
    assignee = db.relationship('User', foreign_keys=[assigned_to])
    parent_task = db.relationship('Task', remote_side=[id])
    subtasks = db.relationship('Task', backref='parent', remote_side=[parent_task_id])
    comments = db.relationship('TaskComment', backref='task', cascade='all, delete-orphan')
    time_logs = db.relationship('TaskTimeLog', backref='task', cascade='all, delete-orphan')
    status_history = db.relationship('TaskStatusHistory', backref='task', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Task {self.title}>'

class TaskComment(db.Model):
    __tablename__ = 'task_comments'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    comment_type = db.Column(db.String(50), default='comment')  # comment, status_update, attachment
    attachments = db.Column(db.JSON)
    is_internal = db.Column(db.Boolean, default=False)  # تعليق داخلي أم عام
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User')
    
    def __repr__(self):
        return f'<TaskComment {self.id} on Task {self.task_id}>'

class TaskTimeLog(db.Model):
    __tablename__ = 'task_time_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer)
    description = db.Column(db.Text)
    is_billable = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User')
    
    def __repr__(self):
        return f'<TaskTimeLog {self.id} for Task {self.task_id}>'

class TaskStatusHistory(db.Model):
    __tablename__ = 'task_status_history'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    old_status = db.Column(db.String(50))
    new_status = db.Column(db.String(50), nullable=False)
    reason = db.Column(db.Text)
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User')
    
    def __repr__(self):
        return f'<TaskStatusHistory {self.task_id}: {self.old_status} -> {self.new_status}>'

class TaskTemplate(db.Model):
    __tablename__ = 'task_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey('task_categories.id'))
    template_data = db.Column(db.JSON)  # بيانات النموذج
    estimated_hours = db.Column(db.Float)
    default_priority = db.Column(db.String(20), default='normal')
    checklist = db.Column(db.JSON)  # قائمة مراجعة
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    creator = db.relationship('User')
    category_rel = db.relationship('TaskCategory')
    
    def __repr__(self):
        return f'<TaskTemplate {self.name}>'

# نماذج الذكاء الاصطناعي
class AIModel(db.Model):
    __tablename__ = 'ai_models'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    description = db.Column(db.Text)
    model_type = db.Column(db.String(50), nullable=False)  # prediction, classification, recommendation, nlp, vision
    category = db.Column(db.String(50), nullable=False)  # student, teacher, admin, messaging, tasks
    version = db.Column(db.String(20), default='1.0')
    model_path = db.Column(db.String(255))  # مسار النموذج المحفوظ
    config = db.Column(db.JSON)  # إعدادات النموذج
    accuracy = db.Column(db.Float)  # دقة النموذج
    training_data_size = db.Column(db.Integer)
    last_trained = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    creator = db.relationship('User')
    predictions = db.relationship('AIPrediction', backref='model')
    
    def __repr__(self):
        return f'<AIModel {self.name}>'

class AIPrediction(db.Model):
    __tablename__ = 'ai_predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.Integer, db.ForeignKey('ai_models.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'))
    prediction_type = db.Column(db.String(50), nullable=False)  # performance, behavior, attendance, risk
    input_data = db.Column(db.JSON)  # البيانات المدخلة
    prediction_result = db.Column(db.JSON)  # نتيجة التنبؤ
    confidence_score = db.Column(db.Float)  # درجة الثقة
    actual_result = db.Column(db.JSON)  # النتيجة الفعلية للمقارنة
    is_accurate = db.Column(db.Boolean)  # هل كان التنبؤ دقيقاً
    feedback = db.Column(db.Text)  # تعليقات على التنبؤ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User')
    student = db.relationship('Student')
    
    def __repr__(self):
        return f'<AIPrediction {self.prediction_type}>'

class AIRecommendation(db.Model):
    __tablename__ = 'ai_recommendations'
    
    id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.Integer, db.ForeignKey('ai_models.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'))
    recommendation_type = db.Column(db.String(50), nullable=False)  # learning_path, intervention, activity, skill
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    recommendation_data = db.Column(db.JSON)  # تفاصيل التوصية
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, urgent
    confidence_score = db.Column(db.Float)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected, implemented
    implemented_at = db.Column(db.DateTime)
    feedback = db.Column(db.Text)
    effectiveness_score = db.Column(db.Float)  # تقييم فعالية التوصية
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    model = db.relationship('AIModel')
    user = db.relationship('User')
    student = db.relationship('Student')
    
    def __repr__(self):
        return f'<AIRecommendation {self.title}>'

class AIAnalytics(db.Model):
    __tablename__ = 'ai_analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    analysis_type = db.Column(db.String(50), nullable=False)  # performance, behavior, engagement, progress
    entity_type = db.Column(db.String(50), nullable=False)  # student, class, teacher, center
    entity_id = db.Column(db.Integer)  # معرف الكيان المحلل
    time_period = db.Column(db.String(20))  # daily, weekly, monthly, yearly
    analysis_date = db.Column(db.Date, nullable=False)
    metrics = db.Column(db.JSON)  # المقاييس المحسوبة
    insights = db.Column(db.JSON)  # الرؤى المستخرجة
    trends = db.Column(db.JSON)  # الاتجاهات
    anomalies = db.Column(db.JSON)  # الشذوذات المكتشفة
    recommendations = db.Column(db.JSON)  # التوصيات المقترحة
    confidence_level = db.Column(db.Float)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    creator = db.relationship('User')
    
    def __repr__(self):
        return f'<AIAnalytics {self.analysis_type}>'

class AIConversation(db.Model):
    __tablename__ = 'ai_conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_id = db.Column(db.String(100), nullable=False)  # معرف الجلسة
    conversation_type = db.Column(db.String(50), nullable=False)  # assistant, tutor, advisor, support
    context = db.Column(db.String(50))  # student_support, teaching_help, admin_query, general
    title = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime)
    total_messages = db.Column(db.Integer, default=0)
    satisfaction_rating = db.Column(db.Integer)  # 1-5
    feedback = db.Column(db.Text)
    
    # العلاقات
    user = db.relationship('User')
    messages = db.relationship('AIMessage', backref='conversation', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<AIConversation {self.session_id}>'

class AIMessage(db.Model):
    __tablename__ = 'ai_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('ai_conversations.id'), nullable=False)
    message_type = db.Column(db.String(20), nullable=False)  # user, ai
    content = db.Column(db.Text, nullable=False)
    intent = db.Column(db.String(100))  # القصد المستخرج من الرسالة
    entities = db.Column(db.JSON)  # الكيانات المستخرجة
    confidence_score = db.Column(db.Float)
    response_time = db.Column(db.Float)  # وقت الاستجابة بالثواني
    model_used = db.Column(db.String(100))  # النموذج المستخدم
    tokens_used = db.Column(db.Integer)  # عدد الرموز المستخدمة
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<AIMessage {self.message_type}>'

class AILearningPath(db.Model):
    __tablename__ = 'ai_learning_paths'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    path_name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    difficulty_level = db.Column(db.String(20))  # beginner, intermediate, advanced
    estimated_duration = db.Column(db.Integer)  # بالأيام
    skills_targeted = db.Column(db.JSON)  # المهارات المستهدفة
    learning_style = db.Column(db.String(50))  # visual, auditory, kinesthetic, mixed
    path_data = db.Column(db.JSON)  # تفاصيل المسار
    progress_percentage = db.Column(db.Integer, default=0)
    current_step = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student')
    creator = db.relationship('User')
    
    def __repr__(self):
        return f'<AILearningPath {self.path_name}>'

class AIAssessment(db.Model):
    __tablename__ = 'ai_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessment_type = db.Column(db.String(50), nullable=False)  # diagnostic, formative, summative, adaptive
    subject_area = db.Column(db.String(100))
    skills_assessed = db.Column(db.JSON)  # المهارات المقيمة
    questions_data = db.Column(db.JSON)  # الأسئلة والإجابات
    ai_analysis = db.Column(db.JSON)  # تحليل الذكاء الاصطناعي
    strengths = db.Column(db.JSON)  # نقاط القوة
    weaknesses = db.Column(db.JSON)  # نقاط الضعف
    recommendations = db.Column(db.JSON)  # التوصيات
    overall_score = db.Column(db.Float)
    confidence_level = db.Column(db.Float)
    time_taken = db.Column(db.Integer)  # بالدقائق
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # العلاقات
    student = db.relationship('Student')
    reviewer = db.relationship('User')
    
    def __repr__(self):
        return f'<AIAssessment {self.assessment_type}>'

class AITeachingAssistant(db.Model):
    __tablename__ = 'ai_teaching_assistants'
    
    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assistant_name = db.Column(db.String(100), nullable=False)
    specialization = db.Column(db.String(100))  # التخصص
    capabilities = db.Column(db.JSON)  # القدرات المتاحة
    personality_traits = db.Column(db.JSON)  # سمات الشخصية
    language_preferences = db.Column(db.JSON)  # تفضيلات اللغة
    teaching_style = db.Column(db.String(50))  # أسلوب التدريس
    is_active = db.Column(db.Boolean, default=True)
    usage_stats = db.Column(db.JSON)  # إحصائيات الاستخدام
    feedback_score = db.Column(db.Float)  # تقييم المعلمين
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    teacher = db.relationship('User')
    
    def __repr__(self):
        return f'<AITeachingAssistant {self.assistant_name}>'

class AIContentGeneration(db.Model):
    __tablename__ = 'ai_content_generations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content_type = db.Column(db.String(50), nullable=False)  # lesson_plan, quiz, worksheet, story, explanation
    subject = db.Column(db.String(100))
    grade_level = db.Column(db.String(20))
    learning_objectives = db.Column(db.JSON)
    input_prompt = db.Column(db.Text)
    generated_content = db.Column(db.Text)
    extra_content_metadata = db.Column(db.JSON)  # معلومات إضافية
    quality_score = db.Column(db.Float)  # تقييم جودة المحتوى
    usage_count = db.Column(db.Integer, default=0)
    feedback_rating = db.Column(db.Float)
    is_approved = db.Column(db.Boolean, default=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    creator = db.relationship('User', foreign_keys=[user_id])
    approver = db.relationship('User', foreign_keys=[approved_by])
    
    def __repr__(self):
        return f'<AIContentGeneration {self.content_type}>'

class AITranslation(db.Model):
    __tablename__ = 'ai_translations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    source_text = db.Column(db.Text, nullable=False)
    source_language = db.Column(db.String(10), nullable=False)
    target_language = db.Column(db.String(10), nullable=False)
    translated_text = db.Column(db.Text, nullable=False)
    context = db.Column(db.String(50))  # message, document, interface
    confidence_score = db.Column(db.Float)
    model_used = db.Column(db.String(100))
    is_human_reviewed = db.Column(db.Boolean, default=False)
    human_correction = db.Column(db.Text)
    quality_rating = db.Column(db.Integer)  # 1-5
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User')
    
    def __repr__(self):
        return f'<AITranslation {self.source_language}->{self.target_language}>'

class AITaskOptimization(db.Model):
    __tablename__ = 'ai_task_optimizations'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'))
    optimization_type = db.Column(db.String(50), nullable=False)  # assignment, scheduling, resource_allocation
    current_assignment = db.Column(db.JSON)  # التوزيع الحالي
    suggested_assignment = db.Column(db.JSON)  # التوزيع المقترح
    optimization_criteria = db.Column(db.JSON)  # معايير التحسين
    expected_improvement = db.Column(db.JSON)  # التحسن المتوقع
    confidence_score = db.Column(db.Float)
    is_implemented = db.Column(db.Boolean, default=False)
    implementation_result = db.Column(db.JSON)  # نتيجة التطبيق
    effectiveness_score = db.Column(db.Float)  # فعالية التحسين
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    implemented_at = db.Column(db.DateTime)
    
    # العلاقات
    task = db.relationship('Task')
    
    def __repr__(self):
        return f'<AITaskOptimization {self.optimization_type}>'

class AINotificationIntelligence(db.Model):
    __tablename__ = 'ai_notification_intelligence'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=False)
    priority_score = db.Column(db.Float)  # أولوية ذكية
    optimal_timing = db.Column(db.DateTime)  # أفضل وقت للإرسال
    channel_recommendation = db.Column(db.String(50))  # القناة المقترحة
    personalization_data = db.Column(db.JSON)  # بيانات التخصيص
    engagement_prediction = db.Column(db.Float)  # توقع التفاعل
    sent_at = db.Column(db.DateTime)
    opened_at = db.Column(db.DateTime)
    clicked_at = db.Column(db.DateTime)
    effectiveness_score = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User')
    
    def __repr__(self):
        return f'<AINotificationIntelligence {self.id}>'

class DisabilityType(db.Model):
    """أنواع الإعاقة"""
    __tablename__ = 'disability_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # اسم نوع الإعاقة
    description = db.Column(db.Text)  # وصف نوع الإعاقة
    category = db.Column(db.String(50))  # فئة الإعاقة (حركية، ذهنية، حسية، إلخ)
    severity_levels = db.Column(db.Text)  # مستويات الشدة (JSON)
    common_needs = db.Column(db.Text)  # الاحتياجات الشائعة (JSON)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    beneficiaries = db.relationship('RehabilitationBeneficiary', backref='disability_type', lazy=True)
    
    def __repr__(self):
        return f'<DisabilityType {self.name}>'


# Note: RehabilitationBeneficiary model is defined in comprehensive_rehabilitation_models.py to avoid table conflicts




class RehabilitationPlan(db.Model):
    """الخطط التأهيلية الفردية"""
    __tablename__ = 'rehabilitation_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    
    # تفاصيل الخطة
    plan_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='active')  # active, completed, paused, cancelled
    
    # الأهداف والمؤشرات
    short_term_goals = db.Column(db.Text)  # الأهداف قصيرة المدى (JSON)
    long_term_goals = db.Column(db.Text)  # الأهداف طويلة المدى (JSON)
    success_indicators = db.Column(db.Text)  # مؤشرات النجاح (JSON)
    intervention_strategies = db.Column(db.Text)  # استراتيجيات التدخل (JSON)
    
    # التقييم والمراجعة
    initial_assessment_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_assessments.id'))
    review_frequency = db.Column(db.String(20))  # تكرار المراجعة
    next_review_date = db.Column(db.Date)
    
    # الفريق المسؤول
    primary_therapist_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    team_members = db.Column(db.Text)  # أعضاء الفريق (JSON)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    activities = db.relationship('RehabilitationActivity', backref='plan', lazy=True)
    progress_records = db.relationship('ProgressRecord', backref='plan', lazy=True)
    
    def __repr__(self):
        return f'<RehabilitationPlan {self.plan_name}>'


class RehabilitationActivity(db.Model):
    """الأنشطة التأهيلية"""
    __tablename__ = 'rehabilitation_activities'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'))
    plan_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_plans.id'))
    
    # تفاصيل النشاط
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    activity_type = db.Column(db.String(50))  # نوع النشاط
    category = db.Column(db.String(50))  # فئة النشاط
    difficulty_level = db.Column(db.String(20))  # مستوى الصعوبة
    
    # الجدولة
    scheduled_date = db.Column(db.Date)
    scheduled_time = db.Column(db.Time)
    duration_minutes = db.Column(db.Integer)
    location = db.Column(db.String(100))
    
    # الموارد والمعدات
    required_equipment = db.Column(db.Text)  # المعدات المطلوبة (JSON)
    materials_needed = db.Column(db.Text)  # المواد المطلوبة (JSON)
    staff_required = db.Column(db.Text)  # الموظفين المطلوبين (JSON)
    
    # الأهداف والتقييم
    objectives = db.Column(db.Text)  # أهداف النشاط (JSON)
    success_criteria = db.Column(db.Text)  # معايير النجاح (JSON)
    assessment_method = db.Column(db.String(50))  # طريقة التقييم
    
    # الحالة
    status = db.Column(db.String(20), default='scheduled')  # scheduled, in_progress, completed, cancelled
    completion_notes = db.Column(db.Text)  # ملاحظات الإنجاز
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    participations = db.relationship('ActivityParticipation', backref='activity', lazy=True)
    
    def __repr__(self):
        return f'<RehabilitationActivity {self.name}>'


class ActivityParticipation(db.Model):
    """مشاركة المستفيدين في الأنشطة"""
    __tablename__ = 'activity_participations'
    
    id = db.Column(db.Integer, primary_key=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_activities.id'), nullable=False)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    
    # تفاصيل المشاركة
    attendance_status = db.Column(db.String(20))  # present, absent, late, excused
    participation_level = db.Column(db.String(20))  # high, medium, low
    performance_rating = db.Column(db.Integer)  # تقييم الأداء (1-10)
    
    # الملاحظات والتقييم
    therapist_notes = db.Column(db.Text)  # ملاحظات المعالج
    behavioral_observations = db.Column(db.Text)  # الملاحظات السلوكية
    skills_demonstrated = db.Column(db.Text)  # المهارات المُظهرة (JSON)
    areas_for_improvement = db.Column(db.Text)  # مجالات التحسين (JSON)
    
    # التقييم الكمي
    goal_achievement = db.Column(db.Float)  # نسبة تحقيق الهدف (0-100)
    effort_level = db.Column(db.Integer)  # مستوى الجهد (1-10)
    cooperation_level = db.Column(db.Integer)  # مستوى التعاون (1-10)
    
    # التواريخ
    participation_date = db.Column(db.Date, default=datetime.utcnow)
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<ActivityParticipation {self.id}>'


# ==================== نظام إدارة الأجهزة المساعدة والمعدات ====================

class AssistiveDeviceCategory(db.Model):
    """فئات الأجهزة المساعدة"""
    __tablename__ = 'assistive_device_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    category_type = db.Column(db.String(50), nullable=False)  # mobility, communication, cognitive, sensory
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    devices = db.relationship('AssistiveDevice', backref='category', lazy=True)
    
    def __repr__(self):
        return f'<AssistiveDeviceCategory {self.name}>'


class AssistiveDevice(db.Model):
    """الأجهزة المساعدة"""
    __tablename__ = 'assistive_devices'
    
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('assistive_device_categories.id'), nullable=False)
    
    # معلومات الجهاز
    name = db.Column(db.String(200), nullable=False)
    model = db.Column(db.String(100))
    manufacturer = db.Column(db.String(100))
    serial_number = db.Column(db.String(100), unique=True)
    barcode = db.Column(db.String(100), unique=True)
    
    # التفاصيل التقنية
    specifications = db.Column(db.Text)  # JSON
    features = db.Column(db.Text)  # JSON
    user_manual_url = db.Column(db.String(500))
    
    # معلومات الشراء
    purchase_date = db.Column(db.Date)
    purchase_price = db.Column(db.Float)
    supplier = db.Column(db.String(200))
    warranty_period = db.Column(db.Integer)  # بالأشهر
    warranty_expires = db.Column(db.Date)
    
    # الحالة والموقع
    status = db.Column(db.String(50), default='available')  # available, assigned, maintenance, damaged, retired
    condition = db.Column(db.String(50), default='excellent')  # excellent, good, fair, poor
    location = db.Column(db.String(200))
    
    # معلومات الصيانة
    last_maintenance = db.Column(db.Date)
    next_maintenance = db.Column(db.Date)
    maintenance_interval = db.Column(db.Integer)  # بالأيام
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    assignments = db.relationship('DeviceAssignment', backref='device', lazy=True)
    maintenance_records = db.relationship('DeviceMaintenance', backref='device', lazy=True)
    
    def __repr__(self):
        return f'<AssistiveDevice {self.name}>'


class DeviceAssignment(db.Model):
    """تخصيص الأجهزة للمستفيدين"""
    __tablename__ = 'device_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('assistive_devices.id'), nullable=False)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    
    # تفاصيل التخصيص
    assignment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    expected_return_date = db.Column(db.Date)
    actual_return_date = db.Column(db.Date)
    assignment_reason = db.Column(db.Text)
    usage_instructions = db.Column(db.Text)
    
    # الحالة
    status = db.Column(db.String(50), default='active')  # active, returned, overdue, lost
    condition_at_assignment = db.Column(db.String(50))
    condition_at_return = db.Column(db.String(50))
    
    # ملاحظات
    notes = db.Column(db.Text)
    return_notes = db.Column(db.Text)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    returned_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<DeviceAssignment {self.id}>'


class DeviceMaintenance(db.Model):
    """سجلات صيانة الأجهزة"""
    __tablename__ = 'device_maintenance'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('assistive_devices.id'), nullable=False)
    
    # تفاصيل الصيانة
    maintenance_type = db.Column(db.String(50), nullable=False)  # preventive, corrective, emergency
    maintenance_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.Text, nullable=False)
    
    # التكلفة والموردين
    cost = db.Column(db.Float)
    service_provider = db.Column(db.String(200))
    technician_name = db.Column(db.String(100))
    
    # قطع الغيار
    parts_replaced = db.Column(db.Text)  # JSON
    parts_cost = db.Column(db.Float)
    
    # النتائج
    maintenance_result = db.Column(db.String(50))  # completed, partial, failed
    device_condition_after = db.Column(db.String(50))
    next_maintenance_date = db.Column(db.Date)
    
    # المرفقات
    attachments = db.Column(db.Text)  # JSON - صور، تقارير
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<DeviceMaintenance {self.id}>'


class DeviceCalibration(db.Model):
    """معايرة الأجهزة"""
    __tablename__ = 'device_calibrations'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('assistive_devices.id'), nullable=False)
    
    # تفاصيل المعايرة
    calibration_date = db.Column(db.Date, nullable=False)
    calibration_type = db.Column(db.String(50))  # routine, after_repair, initial
    calibration_standard = db.Column(db.String(100))
    
    # النتائج
    before_calibration = db.Column(db.Text)  # JSON - القراءات قبل المعايرة
    after_calibration = db.Column(db.Text)  # JSON - القراءات بعد المعايرة
    calibration_result = db.Column(db.String(50))  # passed, failed, adjusted
    
    # الشهادات
    certificate_number = db.Column(db.String(100))
    certificate_expiry = db.Column(db.Date)
    calibration_authority = db.Column(db.String(200))
    
    # التكلفة
    calibration_cost = db.Column(db.Float)
    
    # التواريخ
    next_calibration_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<DeviceCalibration {self.id}>'


# ==================== نظام التقييم النفسي والاجتماعي ====================

class PsychologicalAssessmentType(db.Model):
    """أنواع التقييمات النفسية"""
    __tablename__ = 'psychological_assessment_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    assessment_category = db.Column(db.String(50))  # cognitive, emotional, behavioral, social
    target_age_min = db.Column(db.Integer)
    target_age_max = db.Column(db.Integer)
    duration_minutes = db.Column(db.Integer)
    
    # معايير التقييم
    scoring_method = db.Column(db.String(100))
    interpretation_guide = db.Column(db.Text)
    
    # الحالة
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    assessments = db.relationship('PsychologicalAssessment', backref='assessment_type', lazy=True)
    
    def __repr__(self):
        return f'<PsychologicalAssessmentType {self.name}>'


class PsychologicalAssessment(db.Model):
    """التقييمات النفسية"""
    __tablename__ = 'psychological_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    assessment_type_id = db.Column(db.Integer, db.ForeignKey('psychological_assessment_types.id'), nullable=False)
    
    # تفاصيل التقييم
    assessment_date = db.Column(db.Date, nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # النتائج
    raw_scores = db.Column(db.Text)  # JSON - النتائج الخام
    scaled_scores = db.Column(db.Text)  # JSON - النتائج المعايرة
    percentile_ranks = db.Column(db.Text)  # JSON - الرتب المئوية
    
    # التفسير
    interpretation = db.Column(db.Text)
    strengths = db.Column(db.Text)
    weaknesses = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    
    # معلومات إضافية
    test_conditions = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    validity_concerns = db.Column(db.Text)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<PsychologicalAssessment {self.id}>'


class SocialAssessment(db.Model):
    """التقييمات الاجتماعية"""
    __tablename__ = 'social_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    
    # معلومات التقييم
    assessment_date = db.Column(db.Date, nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # البيئة الأسرية
    family_structure = db.Column(db.Text)  # JSON
    family_income = db.Column(db.String(50))
    housing_conditions = db.Column(db.Text)
    family_support_level = db.Column(db.Integer)  # 1-10
    
    # المهارات الاجتماعية
    communication_skills = db.Column(db.Integer)  # 1-10
    social_interaction = db.Column(db.Integer)  # 1-10
    independence_level = db.Column(db.Integer)  # 1-10
    community_participation = db.Column(db.Integer)  # 1-10
    
    # التحديات الاجتماعية
    social_barriers = db.Column(db.Text)  # JSON
    stigma_experiences = db.Column(db.Text)
    discrimination_incidents = db.Column(db.Text)
    
    # الموارد المتاحة
    available_resources = db.Column(db.Text)  # JSON
    support_networks = db.Column(db.Text)  # JSON
    
    # التوصيات
    social_goals = db.Column(db.Text)
    intervention_recommendations = db.Column(db.Text)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<SocialAssessment {self.id}>'


# ==================== نظام المتابعة الطبية والعلاج الطبيعي ====================

class MedicalRecord(db.Model):
    """السجلات الطبية"""
    __tablename__ = 'medical_records'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    
    # معلومات السجل
    record_date = db.Column(db.Date, nullable=False)
    record_type = db.Column(db.String(50))  # consultation, examination, treatment, follow_up
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # التشخيص
    primary_diagnosis = db.Column(db.String(500))
    secondary_diagnoses = db.Column(db.Text)  # JSON
    icd_codes = db.Column(db.Text)  # JSON
    
    # الأعراض والفحص
    chief_complaint = db.Column(db.Text)
    symptoms = db.Column(db.Text)  # JSON
    vital_signs = db.Column(db.Text)  # JSON
    physical_examination = db.Column(db.Text)
    
    # العلاج
    treatment_plan = db.Column(db.Text)
    medications = db.Column(db.Text)  # JSON
    procedures = db.Column(db.Text)  # JSON
    
    # المتابعة
    follow_up_date = db.Column(db.Date)
    follow_up_instructions = db.Column(db.Text)
    
    # المرفقات
    attachments = db.Column(db.Text)  # JSON - تقارير، صور أشعة
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<MedicalRecord {self.id}>'


class PhysicalTherapySession(db.Model):
    """جلسات العلاج الطبيعي"""
    __tablename__ = 'physical_therapy_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    therapist_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # معلومات الجلسة
    session_date = db.Column(db.Date, nullable=False)
    session_duration = db.Column(db.Integer)  # بالدقائق
    session_type = db.Column(db.String(50))  # individual, group, assessment
    
    # الأهداف والتمارين
    session_goals = db.Column(db.Text)
    exercises_performed = db.Column(db.Text)  # JSON
    equipment_used = db.Column(db.Text)  # JSON
    
    # التقييم
    pain_level_before = db.Column(db.Integer)  # 1-10
    pain_level_after = db.Column(db.Integer)  # 1-10
    range_of_motion = db.Column(db.Text)  # JSON
    strength_measurements = db.Column(db.Text)  # JSON
    functional_improvements = db.Column(db.Text)
    
    # الاستجابة والتقدم
    patient_response = db.Column(db.String(50))  # excellent, good, fair, poor
    compliance_level = db.Column(db.Integer)  # 1-10
    progress_notes = db.Column(db.Text)
    
    # التوصيات
    home_exercises = db.Column(db.Text)  # JSON
    next_session_plan = db.Column(db.Text)
    modifications_needed = db.Column(db.Text)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<PhysicalTherapySession {self.id}>'


class Medication(db.Model):
    """الأدوية"""
    __tablename__ = 'medications'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    
    # معلومات الدواء
    medication_name = db.Column(db.String(200), nullable=False)
    generic_name = db.Column(db.String(200))
    dosage = db.Column(db.String(100))
    frequency = db.Column(db.String(100))
    route = db.Column(db.String(50))  # oral, injection, topical
    
    # تواريخ العلاج
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    prescribed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # التفاصيل
    indication = db.Column(db.Text)  # سبب الوصف
    instructions = db.Column(db.Text)
    side_effects = db.Column(db.Text)
    contraindications = db.Column(db.Text)
    
    # المتابعة
    effectiveness = db.Column(db.String(50))  # excellent, good, fair, poor, unknown
    adverse_reactions = db.Column(db.Text)
    compliance = db.Column(db.Integer)  # 1-10
    
    # الحالة
    status = db.Column(db.String(50), default='active')  # active, discontinued, completed
    discontinuation_reason = db.Column(db.Text)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Medication {self.medication_name}>'


# ==================== نظام التدريب المهني والتأهيل للعمل ====================

class VocationalTrainingProgram(db.Model):
    """برامج التدريب المهني"""
    __tablename__ = 'vocational_training_programs'
    
    id = db.Column(db.Integer, primary_key=True)
    program_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    program_category = db.Column(db.String(100))  # technical, administrative, crafts, services
    
    # متطلبات البرنامج
    prerequisites = db.Column(db.Text)  # JSON
    target_disabilities = db.Column(db.Text)  # JSON
    min_age = db.Column(db.Integer)
    max_age = db.Column(db.Integer)
    
    # تفاصيل البرنامج
    duration_months = db.Column(db.Integer)
    training_hours = db.Column(db.Integer)
    theoretical_hours = db.Column(db.Integer)
    practical_hours = db.Column(db.Integer)
    
    # المهارات والشهادات
    skills_taught = db.Column(db.Text)  # JSON
    certification_type = db.Column(db.String(100))
    certification_authority = db.Column(db.String(200))
    
    # معلومات إضافية
    equipment_needed = db.Column(db.Text)  # JSON
    job_opportunities = db.Column(db.Text)
    success_rate = db.Column(db.Float)
    
    # الحالة
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    enrollments = db.relationship('VocationalEnrollment', backref='program', lazy=True)
    
    def __repr__(self):
        return f'<VocationalTrainingProgram {self.program_name}>'


class VocationalEnrollment(db.Model):
    """التسجيل في برامج التدريب المهني"""
    __tablename__ = 'vocational_enrollments'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('vocational_training_programs.id'), nullable=False)
    
    # تفاصيل التسجيل
    enrollment_date = db.Column(db.Date, nullable=False)
    start_date = db.Column(db.Date)
    expected_completion_date = db.Column(db.Date)
    actual_completion_date = db.Column(db.Date)
    
    # الحالة والتقدم
    status = db.Column(db.String(50), default='enrolled')  # enrolled, active, completed, withdrawn, failed
    completion_percentage = db.Column(db.Float, default=0.0)
    attendance_rate = db.Column(db.Float)
    
    # التقييم
    theoretical_grade = db.Column(db.Float)
    practical_grade = db.Column(db.Float)
    final_grade = db.Column(db.Float)
    performance_notes = db.Column(db.Text)
    
    # الشهادة
    certificate_issued = db.Column(db.Boolean, default=False)
    certificate_date = db.Column(db.Date)
    certificate_number = db.Column(db.String(100))
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    enrolled_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<VocationalEnrollment {self.id}>'


class JobPlacement(db.Model):
    """توظيف المستفيدين"""
    __tablename__ = 'job_placements'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    
    # معلومات الوظيفة
    job_title = db.Column(db.String(200), nullable=False)
    employer_name = db.Column(db.String(200), nullable=False)
    employer_contact = db.Column(db.Text)  # JSON
    job_description = db.Column(db.Text)
    
    # تفاصيل التوظيف
    employment_type = db.Column(db.String(50))  # full_time, part_time, contract, internship
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    salary = db.Column(db.Float)
    benefits = db.Column(db.Text)
    
    # الدعم والمتابعة
    workplace_accommodations = db.Column(db.Text)  # JSON
    support_provided = db.Column(db.Text)
    follow_up_schedule = db.Column(db.Text)  # JSON
    
    # الحالة
    status = db.Column(db.String(50), default='active')  # active, completed, terminated
    termination_reason = db.Column(db.Text)
    
    # التقييم
    job_satisfaction = db.Column(db.Integer)  # 1-10
    employer_satisfaction = db.Column(db.Integer)  # 1-10
    performance_rating = db.Column(db.String(50))
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    placed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<JobPlacement {self.job_title}>'


# ==================== نظام دعم الأسر والإرشاد ====================

class FamilySupport(db.Model):
    """دعم الأسر"""
    __tablename__ = 'family_support'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    
    # معلومات الأسرة
    family_members = db.Column(db.Text)  # JSON
    primary_caregiver = db.Column(db.String(200))
    caregiver_relationship = db.Column(db.String(50))
    caregiver_contact = db.Column(db.Text)  # JSON
    
    # تقييم الاحتياجات
    support_needs = db.Column(db.Text)  # JSON
    stress_level = db.Column(db.Integer)  # 1-10
    coping_mechanisms = db.Column(db.Text)
    available_resources = db.Column(db.Text)  # JSON
    
    # الخدمات المقدمة
    services_provided = db.Column(db.Text)  # JSON
    counseling_sessions = db.Column(db.Integer)
    training_sessions = db.Column(db.Integer)
    
    # التقييم والمتابعة
    progress_assessment = db.Column(db.Text)
    satisfaction_rating = db.Column(db.Integer)  # 1-10
    
    # التواريخ
    assessment_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    assessed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<FormboardReport {self.id}>'


# ===== مقياس منذر للتوحد (Munther Autism Scale) Models =====

class MuntherAssessment(db.Model):
    """تقييم مقياس منذر للتوحد"""
    __tablename__ = 'munther_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50), nullable=False, default='clinical')  # clinical, screening, follow_up
    
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    
    status = db.Column(db.String(20), default='in_progress')  # in_progress, completed, cancelled
    completion_date = db.Column(db.DateTime)
    
    # معلومات المقيم والمصدر
    informant_name = db.Column(db.String(200))  # اسم مقدم المعلومات
    informant_relationship = db.Column(db.String(100))  # العلاقة بالطفل
    assessment_setting = db.Column(db.String(100))  # مكان التقييم
    
    # معلومات التطور والتاريخ
    developmental_concerns = db.Column(db.Text)  # مخاوف التطور
    first_concerns_age = db.Column(db.Integer)  # عمر ظهور أول المخاوف بالشهور
    regression_history = db.Column(db.Boolean, default=False)  # تاريخ التراجع
    regression_age = db.Column(db.Integer)  # عمر التراجع بالشهور
    regression_description = db.Column(db.Text)  # وصف التراجع
    
    # التاريخ الطبي والعائلي
    medical_history = db.Column(db.Text)  # التاريخ الطبي
    family_history_autism = db.Column(db.Boolean, default=False)  # تاريخ عائلي للتوحد
    family_history_details = db.Column(db.Text)  # تفاصيل التاريخ العائلي
    
    # الملاحظات السلوكية أثناء التقييم
    behavioral_observations = db.Column(db.Text)
    cooperation_level = db.Column(db.String(50))  # excellent, good, fair, poor
    attention_span = db.Column(db.String(50))  # excellent, good, fair, poor
    social_engagement = db.Column(db.String(50))  # excellent, good, fair, poor
    
    # التوصيات والملاحظات
    recommendations = db.Column(db.Text)
    additional_notes = db.Column(db.Text)
    
    # العلاقات
    domain_results = db.relationship('MuntherDomainResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    item_responses = db.relationship('MuntherItemResponse', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('MuntherReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<MuntherAssessment {self.id}>'


class MuntherDomain(db.Model):
    """مجالات مقياس منذر للتوحد"""
    __tablename__ = 'munther_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    name_arabic = db.Column(db.String(200), nullable=False)
    name_english = db.Column(db.String(200))
    description = db.Column(db.Text)
    domain_order = db.Column(db.Integer, nullable=False)
    
    # معايير التقييم
    scoring_criteria = db.Column(db.JSON)  # معايير النقاط
    interpretation_guidelines = db.Column(db.Text)  # إرشادات التفسير
    
    # العلاقات
    items = db.relationship('MuntherItem', backref='domain', lazy=True)
    domain_results = db.relationship('MuntherDomainResult', backref='domain', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<MuntherDomain {self.name_arabic}>'


class MuntherItem(db.Model):
    """عناصر مقياس منذر للتوحد"""
    __tablename__ = 'munther_items'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey('munther_domains.id'), nullable=False)
    
    item_number = db.Column(db.String(10), nullable=False)  # رقم العنصر
    item_text_arabic = db.Column(db.Text, nullable=False)
    item_text_english = db.Column(db.Text)
    
    item_order = db.Column(db.Integer, nullable=False)
    
    # معايير التقييم
    scoring_options = db.Column(db.JSON)  # خيارات النقاط
    scoring_criteria = db.Column(db.Text)  # معايير التقييم
    
    # معلومات إضافية
    examples = db.Column(db.Text)  # أمثلة
    clarifications = db.Column(db.Text)  # توضيحات
    age_range = db.Column(db.String(50))  # الفئة العمرية المناسبة
    
    # العلاقات
    item_responses = db.relationship('MuntherItemResponse', backref='item', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<MuntherItem {self.item_number}>'


class MuntherItemResponse(db.Model):
    """استجابات عناصر مقياس منذر للتوحد"""
    __tablename__ = 'munther_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('munther_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('munther_items.id'), nullable=False)
    
    raw_score = db.Column(db.Integer)  # النقاط الخام
    response_details = db.Column(db.JSON)  # تفاصيل الاستجابة
    
    # ملاحظات وتوضيحات
    observations = db.Column(db.Text)  # ملاحظات المقيم
    examples_observed = db.Column(db.Text)  # أمثلة ملاحظة
    informant_examples = db.Column(db.Text)  # أمثلة من مقدم المعلومات
    
    # معلومات التقييم
    assessment_method = db.Column(db.String(50))  # observation, interview, both
    confidence_level = db.Column(db.String(20))  # high, medium, low
    
    response_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<MuntherItemResponse {self.id}>'


class MuntherDomainResult(db.Model):
    """نتائج مجالات مقياس منذر للتوحد"""
    __tablename__ = 'munther_domain_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('munther_assessments.id'), nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey('munther_domains.id'), nullable=False)
    
    # النتائج الخام
    raw_score = db.Column(db.Integer)  # مجموع النقاط الخام
    max_possible_score = db.Column(db.Integer)  # أقصى نقاط ممكنة
    items_completed = db.Column(db.Integer)  # عدد العناصر المكتملة
    items_total = db.Column(db.Integer)  # إجمالي العناصر
    
    # النتائج المعيارية
    percentile_rank = db.Column(db.Float)  # الرتبة المئوية
    severity_level = db.Column(db.String(50))  # minimal, mild, moderate, severe
    clinical_significance = db.Column(db.String(50))  # significant, borderline, not_significant
    
    # التفسير
    interpretation = db.Column(db.Text)  # تفسير النتائج
    recommendations = db.Column(db.Text)  # توصيات خاصة بالمجال
    
    calculation_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<MuntherDomainResult {self.id}>'


class MuntherNorms(db.Model):
    """المعايير والجداول المرجعية لمقياس منذر للتوحد"""
    __tablename__ = 'munther_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات المعيار
    norm_type = db.Column(db.String(50), nullable=False)  # domain, composite, severity
    domain_id = db.Column(db.Integer, db.ForeignKey('munther_domains.id'))
    
    # الفئة العمرية
    age_range_start = db.Column(db.Integer)  # بالشهور
    age_range_end = db.Column(db.Integer)  # بالشهور
    
    # معلومات العينة المرجعية
    sample_size = db.Column(db.Integer)
    sample_description = db.Column(db.Text)
    
    # جداول التحويل
    raw_score_conversions = db.Column(db.JSON)  # تحويل النقاط الخام
    percentile_conversions = db.Column(db.JSON)  # تحويل الرتب المئوية
    severity_cutoffs = db.Column(db.JSON)  # نقاط القطع للشدة
    
    # معلومات الصدق والثبات
    reliability_data = db.Column(db.JSON)  # بيانات الثبات
    validity_data = db.Column(db.JSON)  # بيانات الصدق
    
    version = db.Column(db.String(20))  # إصدار المعايير
    publication_date = db.Column(db.Date)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<MuntherNorms {self.norm_type}>'


class MuntherReport(db.Model):
    """تقارير مقياس منذر للتوحد"""
    __tablename__ = 'munther_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('munther_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50), nullable=False)  # comprehensive, summary, screening
    report_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    generated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    
    # النتائج الإجمالية
    total_score = db.Column(db.Integer)  # إجمالي النقاط
    autism_likelihood = db.Column(db.String(50))  # high, moderate, low, minimal
    severity_classification = db.Column(db.String(50))  # severe, moderate, mild, minimal
    
    # التفسير السريري
    clinical_interpretation = db.Column(db.Text)
    diagnostic_considerations = db.Column(db.Text)  # اعتبارات تشخيصية
    differential_diagnosis = db.Column(db.Text)  # التشخيص التفريقي
    
    # نقاط القوة والضعف
    strengths = db.Column(db.Text)  # نقاط القوة
    areas_of_concern = db.Column(db.Text)  # مجالات القلق
    priority_areas = db.Column(db.Text)  # المجالات ذات الأولوية
    
    # التوصيات
    intervention_recommendations = db.Column(db.Text)  # توصيات التدخل
    educational_recommendations = db.Column(db.Text)  # توصيات تعليمية
    family_recommendations = db.Column(db.Text)  # توصيات للأسرة
    follow_up_recommendations = db.Column(db.Text)  # توصيات المتابعة
    
    # معلومات إضافية
    additional_assessments_needed = db.Column(db.Text)  # تقييمات إضافية مطلوبة
    referrals_suggested = db.Column(db.Text)  # إحالات مقترحة
    
    # ملفات مرفقة
    attachments = db.Column(db.JSON)  # ملفات مرفقة
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')  # draft, final, sent
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    review_date = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<MuntherReport {self.id}>'


# ===== مقياس كونرز (Conners Rating Scale) Models =====

class ConnersAssessment(db.Model):
    """تقييم مقياس كونرز لاضطراب فرط الحركة وتشتت الانتباه"""
    __tablename__ = 'conners_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50), nullable=False, default='comprehensive')  # comprehensive, screening, follow_up
    form_version = db.Column(db.String(20), nullable=False, default='CBRS')  # CBRS, CTRS, CPRS
    
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    
    status = db.Column(db.String(20), default='in_progress')  # in_progress, completed, cancelled
    completion_date = db.Column(db.DateTime)
    
    # معلومات المقيم والمصدر
    rater_name = db.Column(db.String(200))  # اسم المقيم
    rater_relationship = db.Column(db.String(100))  # العلاقة بالطفل
    rater_type = db.Column(db.String(50))  # parent, teacher, self, other
    assessment_setting = db.Column(db.String(100))  # مكان التقييم
    
    # معلومات السياق والبيئة
    school_grade = db.Column(db.String(20))  # الصف الدراسي
    classroom_setting = db.Column(db.String(100))  # بيئة الفصل
    home_environment = db.Column(db.Text)  # البيئة المنزلية
    
    # التاريخ الطبي والتطوري
    medical_history = db.Column(db.Text)  # التاريخ الطبي
    developmental_history = db.Column(db.Text)  # التاريخ التطوري
    previous_diagnoses = db.Column(db.Text)  # التشخيصات السابقة
    current_medications = db.Column(db.Text)  # الأدوية الحالية
    
    # معلومات الأعراض والسلوك
    symptom_onset_age = db.Column(db.Integer)  # عمر بداية الأعراض بالشهور
    symptom_duration = db.Column(db.String(50))  # مدة الأعراض
    symptom_severity = db.Column(db.String(50))  # شدة الأعراض
    functional_impairment = db.Column(db.Text)  # التأثير الوظيفي
    
    # الملاحظات السلوكية أثناء التقييم
    behavioral_observations = db.Column(db.Text)
    attention_during_assessment = db.Column(db.String(50))  # excellent, good, fair, poor
    activity_level = db.Column(db.String(50))  # low, normal, high, very_high
    impulse_control = db.Column(db.String(50))  # excellent, good, fair, poor
    cooperation_level = db.Column(db.String(50))  # excellent, good, fair, poor
    
    # التوصيات والملاحظات
    recommendations = db.Column(db.Text)
    additional_notes = db.Column(db.Text)
    
    # العلاقات
    subscale_results = db.relationship('ConnersSubscaleResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    item_responses = db.relationship('ConnersItemResponse', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('ConnersReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<ConnersAssessment {self.id}>'


class ConnersSubscale(db.Model):
    """مقاييس فرعية لمقياس كونرز"""
    __tablename__ = 'conners_subscales'
    
    id = db.Column(db.Integer, primary_key=True)
    name_arabic = db.Column(db.String(200), nullable=False)
    name_english = db.Column(db.String(200))
    abbreviation = db.Column(db.String(10))  # اختصار المقياس الفرعي
    description = db.Column(db.Text)
    subscale_order = db.Column(db.Integer, nullable=False)
    
    # معلومات المقياس الفرعي
    form_version = db.Column(db.String(20))  # CBRS, CTRS, CPRS
    age_range_start = db.Column(db.Integer)  # بالسنوات
    age_range_end = db.Column(db.Integer)  # بالسنوات
    
    # معايير التقييم والتفسير
    scoring_criteria = db.Column(db.JSON)  # معايير النقاط
    interpretation_guidelines = db.Column(db.Text)  # إرشادات التفسير
    clinical_cutoffs = db.Column(db.JSON)  # نقاط القطع السريرية
    
    # العلاقات
    items = db.relationship('ConnersItem', backref='subscale', lazy=True)
    subscale_results = db.relationship('ConnersSubscaleResult', backref='subscale', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ConnersSubscale {self.name_arabic}>'


class ConnersItemResponse(db.Model):
    """استجابات عناصر مقياس كونرز"""
    __tablename__ = 'conners_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('conners_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('conners_items.id'), nullable=False)
    
    raw_score = db.Column(db.Integer)  # النقاط الخام
    response_value = db.Column(db.String(50))  # قيمة الاستجابة
    
    # ملاحظات وتوضيحات
    observations = db.Column(db.Text)  # ملاحظات المقيم
    frequency_examples = db.Column(db.Text)  # أمثلة على التكرار
    context_notes = db.Column(db.Text)  # ملاحظات السياق
    
    # معلومات التقييم
    confidence_level = db.Column(db.String(20))  # high, medium, low
    observation_period = db.Column(db.String(50))  # فترة الملاحظة
    
    response_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ConnersItemResponse {self.id}>'


class ConnersItem(db.Model):
    """عناصر مقياس كونرز"""
    __tablename__ = 'conners_items'
    
    id = db.Column(db.Integer, primary_key=True)
    subscale_id = db.Column(db.Integer, db.ForeignKey('conners_subscales.id'), nullable=False)
    
    item_number = db.Column(db.String(10), nullable=False)  # رقم العنصر
    item_text_arabic = db.Column(db.Text, nullable=False)
    item_text_english = db.Column(db.Text)
    
    item_order = db.Column(db.Integer, nullable=False)
    
    # معايير التقييم
    scoring_scale = db.Column(db.String(20), default='likert_4')  # نوع المقياس
    scoring_options = db.Column(db.JSON)  # خيارات النقاط
    reverse_scored = db.Column(db.Boolean, default=False)  # عكس النقاط
    
    # معلومات إضافية
    behavioral_domain = db.Column(db.String(100))  # المجال السلوكي
    examples = db.Column(db.Text)  # أمثلة
    clarifications = db.Column(db.Text)  # توضيحات
    
    # العلاقات
    item_responses = db.relationship('ConnersItemResponse', backref='conners_item', lazy=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ConnersItem {self.item_number}>'


class ConnersSubscaleResult(db.Model):
    """نتائج المقاييس الفرعية لمقياس كونرز"""
    __tablename__ = 'conners_subscale_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('conners_assessments.id'), nullable=False)
    subscale_id = db.Column(db.Integer, db.ForeignKey('conners_subscales.id'), nullable=False)
    
    # النتائج الخام
    raw_score = db.Column(db.Integer)  # مجموع النقاط الخام
    max_possible_score = db.Column(db.Integer)  # أقصى نقاط ممكنة
    items_completed = db.Column(db.Integer)  # عدد العناصر المكتملة
    items_total = db.Column(db.Integer)  # إجمالي العناصر
    
    # النتائج المعيارية
    t_score = db.Column(db.Float)  # النقاط التائية
    percentile_rank = db.Column(db.Float)  # الرتبة المئوية
    standard_score = db.Column(db.Float)  # النقاط المعيارية
    
    # التفسير السريري
    clinical_range = db.Column(db.String(50))  # average, slightly_elevated, moderately_elevated, markedly_elevated
    clinical_significance = db.Column(db.String(50))  # significant, borderline, not_significant
    severity_level = db.Column(db.String(50))  # mild, moderate, severe
    
    # التفسير والتوصيات
    interpretation = db.Column(db.Text)  # تفسير النتائج
    recommendations = db.Column(db.Text)  # توصيات خاصة بالمقياس الفرعي
    
    calculation_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ConnersSubscaleResult {self.id}>'


class ConnersNorms(db.Model):
    """المعايير والجداول المرجعية لمقياس كونرز"""
    __tablename__ = 'conners_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات المعيار
    norm_type = db.Column(db.String(50), nullable=False)  # subscale, composite, index
    subscale_id = db.Column(db.Integer, db.ForeignKey('conners_subscales.id'))
    form_version = db.Column(db.String(20))  # CBRS, CTRS, CPRS
    
    # الفئة العمرية والجنس
    age_range_start = db.Column(db.Integer)  # بالسنوات
    age_range_end = db.Column(db.Integer)  # بالسنوات
    gender = db.Column(db.String(10))  # male, female, combined
    
    # معلومات العينة المرجعية
    sample_size = db.Column(db.Integer)
    sample_description = db.Column(db.Text)
    geographic_region = db.Column(db.String(100))
    
    # جداول التحويل
    raw_score_conversions = db.Column(db.JSON)  # تحويل النقاط الخام
    t_score_conversions = db.Column(db.JSON)  # تحويل النقاط التائية
    percentile_conversions = db.Column(db.JSON)  # تحويل الرتب المئوية
    clinical_cutoffs = db.Column(db.JSON)  # نقاط القطع السريرية
    
    # معلومات الصدق والثبات
    reliability_data = db.Column(db.JSON)  # بيانات الثبات
    validity_data = db.Column(db.JSON)  # بيانات الصدق
    
    version = db.Column(db.String(20))  # إصدار المعايير
    publication_date = db.Column(db.Date)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ConnersNorms {self.norm_type}>'


class ConnersReport(db.Model):
    """تقارير مقياس كونرز"""
    __tablename__ = 'conners_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('conners_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50), nullable=False)  # comprehensive, summary, screening
    report_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    generated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    
    # النتائج الإجمالية
    adhd_index = db.Column(db.Float)  # مؤشر ADHD
    global_index = db.Column(db.Float)  # المؤشر العام
    overall_severity = db.Column(db.String(50))  # mild, moderate, severe
    
    # التفسير السريري
    clinical_interpretation = db.Column(db.Text)
    diagnostic_considerations = db.Column(db.Text)  # اعتبارات تشخيصية
    dsm5_criteria_analysis = db.Column(db.Text)  # تحليل معايير DSM-5
    
    # نقاط القوة والضعف
    strengths = db.Column(db.Text)  # نقاط القوة
    areas_of_concern = db.Column(db.Text)  # مجالات القلق
    priority_symptoms = db.Column(db.Text)  # الأعراض ذات الأولوية
    
    # التوصيات
    behavioral_interventions = db.Column(db.Text)  # تدخلات سلوكية
    educational_accommodations = db.Column(db.Text)  # تسهيلات تعليمية
    family_recommendations = db.Column(db.Text)  # توصيات للأسرة
    medication_considerations = db.Column(db.Text)  # اعتبارات دوائية
    follow_up_recommendations = db.Column(db.Text)  # توصيات المتابعة
    
    # معلومات إضافية
    additional_assessments_needed = db.Column(db.Text)  # تقييمات إضافية مطلوبة
    referrals_suggested = db.Column(db.Text)  # إحالات مقترحة
    environmental_modifications = db.Column(db.Text)  # تعديلات بيئية
    
    # ملفات مرفقة
    attachments = db.Column(db.JSON)  # ملفات مرفقة
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')  # draft, final, sent
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    review_date = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<ConnersReport {self.id}>'


class CounselingSession(db.Model):
    """جلسات الإرشاد"""
    __tablename__ = 'counseling_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'))
    family_support_id = db.Column(db.Integer, db.ForeignKey('family_support.id'))
    
    # تفاصيل الجلسة
    session_date = db.Column(db.Date, nullable=False)
    session_type = db.Column(db.String(50))  # individual, family, group
    duration_minutes = db.Column(db.Integer)
    counselor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # المشاركون
    participants = db.Column(db.Text)  # JSON
    session_goals = db.Column(db.Text)
    
    # المحتوى والأنشطة
    topics_discussed = db.Column(db.Text)
    techniques_used = db.Column(db.Text)  # JSON
    homework_assigned = db.Column(db.Text)
    
    # التقييم
    session_outcome = db.Column(db.String(50))  # excellent, good, fair, poor
    participant_engagement = db.Column(db.Integer)  # 1-10
    progress_notes = db.Column(db.Text)
    
    # التوصيات
    next_session_plan = db.Column(db.Text)
    referrals_made = db.Column(db.Text)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<CounselingSession {self.id}>'


# ==================== نظام التكامل مع الخدمات الحكومية ====================

class GovernmentService(db.Model):
    """الخدمات الحكومية"""
    __tablename__ = 'government_services'
    
    id = db.Column(db.Integer, primary_key=True)
    service_name = db.Column(db.String(200), nullable=False)
    service_provider = db.Column(db.String(200))  # وزارة، هيئة، مؤسسة
    service_category = db.Column(db.String(100))  # health, education, social, financial
    
    # تفاصيل الخدمة
    description = db.Column(db.Text)
    eligibility_criteria = db.Column(db.Text)
    required_documents = db.Column(db.Text)  # JSON
    application_process = db.Column(db.Text)
    
    # معلومات الاتصال
    contact_info = db.Column(db.Text)  # JSON
    website_url = db.Column(db.String(500))
    office_locations = db.Column(db.Text)  # JSON
    
    # الحالة
    is_active = db.Column(db.Boolean, default=True)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    applications = db.relationship('ServiceApplication', backref='service', lazy=True)
    
    def __repr__(self):
        return f'<GovernmentService {self.service_name}>'


class ServiceApplication(db.Model):
    """طلبات الخدمات الحكومية"""
    __tablename__ = 'service_applications'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('government_services.id'), nullable=False)
    
    # تفاصيل الطلب
    application_date = db.Column(db.Date, nullable=False)
    application_number = db.Column(db.String(100))
    submitted_documents = db.Column(db.Text)  # JSON
    
    # الحالة والمتابعة
    status = db.Column(db.String(50), default='submitted')  # submitted, under_review, approved, rejected, completed
    status_date = db.Column(db.Date)
    expected_completion = db.Column(db.Date)
    actual_completion = db.Column(db.Date)
    
    # النتائج
    approval_details = db.Column(db.Text)
    rejection_reason = db.Column(db.Text)
    benefits_received = db.Column(db.Text)  # JSON
    
    # المتابعة
    follow_up_notes = db.Column(db.Text)
    renewal_date = db.Column(db.Date)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    submitted_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<ServiceApplication {self.id}>'


# ==================== نظام إدارة النقل والمواصلات ====================

class TransportVehicle(db.Model):
    """مركبات النقل المتخصصة"""
    __tablename__ = 'transport_vehicles'
    
    id = db.Column(db.Integer, primary_key=True)
    vehicle_name = db.Column(db.String(100), nullable=False)
    vehicle_type = db.Column(db.String(50))  # bus, van, car
    license_plate = db.Column(db.String(20), unique=True)
    
    # المواصفات
    capacity = db.Column(db.Integer)
    wheelchair_capacity = db.Column(db.Integer)
    accessibility_features = db.Column(db.Text)  # JSON
    
    # معلومات التشغيل
    status = db.Column(db.String(50), default='active')  # active, maintenance, retired
    last_maintenance = db.Column(db.Date)
    next_maintenance = db.Column(db.Date)
    insurance_expiry = db.Column(db.Date)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    trips = db.relationship('TransportTrip', backref='vehicle', lazy=True)
    
    def __repr__(self):
        return f'<TransportVehicle {self.vehicle_name}>'


class TransportTrip(db.Model):
    """رحلات النقل"""
    __tablename__ = 'transport_trips'
    
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('transport_vehicles.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # تفاصيل الرحلة
    trip_date = db.Column(db.Date, nullable=False)
    trip_type = db.Column(db.String(50))  # pickup, dropoff, appointment, activity
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)
    
    # المسار
    route_details = db.Column(db.Text)  # JSON
    start_location = db.Column(db.String(500))
    end_location = db.Column(db.String(500))
    distance_km = db.Column(db.Float)
    
    # المشاركون
    passengers = db.Column(db.Text)  # JSON - معرفات المستفيدين
    actual_passengers = db.Column(db.Text)  # JSON - من حضر فعلياً
    
    # الحالة
    status = db.Column(db.String(50), default='scheduled')  # scheduled, in_progress, completed, cancelled
    notes = db.Column(db.Text)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<TransportTrip {self.id}>'


# ==================== نظام التعليم التفاعلي والألعاب التعليمية ====================

class EducationalContent(db.Model):
    """المحتوى التعليمي"""
    __tablename__ = 'educational_content'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    content_type = db.Column(db.String(50))  # video, audio, text, interactive, game
    
    # التصنيف
    category = db.Column(db.String(100))
    subject = db.Column(db.String(100))
    difficulty_level = db.Column(db.String(50))  # beginner, intermediate, advanced
    target_age_min = db.Column(db.Integer)
    target_age_max = db.Column(db.Integer)
    
    # المحتوى
    content_url = db.Column(db.String(500))
    duration_minutes = db.Column(db.Integer)
    file_size_mb = db.Column(db.Float)
    
    # إمكانية الوصول
    accessibility_features = db.Column(db.Text)  # JSON
    disability_adaptations = db.Column(db.Text)  # JSON
    
    # التقييم
    learning_objectives = db.Column(db.Text)  # JSON
    assessment_criteria = db.Column(db.Text)  # JSON
    
    # الحالة
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    progress_records = db.relationship('LearningProgress', backref='content', lazy=True)
    
    def __repr__(self):
        return f'<EducationalContent {self.title}>'


class LearningProgress(db.Model):
    """تقدم التعلم"""
    __tablename__ = 'learning_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    content_id = db.Column(db.Integer, db.ForeignKey('educational_content.id'), nullable=False)
    
    # التقدم
    start_date = db.Column(db.Date, nullable=False)
    completion_date = db.Column(db.Date)
    completion_percentage = db.Column(db.Float, default=0.0)
    time_spent_minutes = db.Column(db.Integer, default=0)
    
    # الأداء
    score = db.Column(db.Float)
    attempts = db.Column(db.Integer, default=1)
    best_score = db.Column(db.Float)
    
    # التفاعل
    engagement_level = db.Column(db.Integer)  # 1-10
    difficulty_rating = db.Column(db.Integer)  # 1-10
    satisfaction_rating = db.Column(db.Integer)  # 1-10
    
    # ملاحظات
    notes = db.Column(db.Text)
    challenges_faced = db.Column(db.Text)
    
    # الحالة
    status = db.Column(db.String(50), default='in_progress')  # in_progress, completed, paused, abandoned
    
    # التواريخ
    last_accessed = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<LearningProgress {self.id}>'


class RehabilitationAssessment(db.Model):
    """التقييمات التأهيلية"""
    __tablename__ = 'rehabilitation_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    
    # تفاصيل التقييم
    assessment_type = db.Column(db.String(50), nullable=False)  # initial, periodic, final
    assessment_name = db.Column(db.String(100))
    assessment_date = db.Column(db.Date, nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # مجالات التقييم
    cognitive_assessment = db.Column(db.Text)  # التقييم المعرفي (JSON)
    physical_assessment = db.Column(db.Text)  # التقييم الجسدي (JSON)
    social_assessment = db.Column(db.Text)  # التقييم الاجتماعي (JSON)
    emotional_assessment = db.Column(db.Text)  # التقييم العاطفي (JSON)
    behavioral_assessment = db.Column(db.Text)  # التقييم السلوكي (JSON)
    communication_assessment = db.Column(db.Text)  # تقييم التواصل (JSON)
    
    # النتائج والتوصيات
    overall_score = db.Column(db.Float)  # النتيجة الإجمالية
    strengths = db.Column(db.Text)  # نقاط القوة (JSON)
    weaknesses = db.Column(db.Text)  # نقاط الضعف (JSON)
    recommendations = db.Column(db.Text)  # التوصيات (JSON)
    next_assessment_date = db.Column(db.Date)  # موعد التقييم التالي
    
    # الملفات والمرفقات
    assessment_files = db.Column(db.Text)  # ملفات التقييم (JSON)
    notes = db.Column(db.Text)  # ملاحظات إضافية
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<RehabilitationAssessment {self.assessment_name}>'


class ProgressRecord(db.Model):
    """سجلات التقدم"""
    __tablename__ = 'progress_records'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_plans.id'))
    
    # تفاصيل السجل
    record_date = db.Column(db.Date, nullable=False)
    record_type = db.Column(db.String(50))  # daily, weekly, monthly, milestone
    session_number = db.Column(db.Integer)  # رقم الجلسة
    
    # مؤشرات التقدم
    goals_progress = db.Column(db.Text)  # تقدم الأهداف (JSON)
    skills_development = db.Column(db.Text)  # تطوير المهارات (JSON)
    behavioral_changes = db.Column(db.Text)  # التغيرات السلوكية (JSON)
    challenges_faced = db.Column(db.Text)  # التحديات المواجهة (JSON)
    
    # التقييم الكمي
    overall_progress_score = db.Column(db.Float)  # نقاط التقدم الإجمالية
    attendance_rate = db.Column(db.Float)  # معدل الحضور
    engagement_level = db.Column(db.Integer)  # مستوى المشاركة (1-10)
    satisfaction_level = db.Column(db.Integer)  # مستوى الرضا (1-10)
    
    # الملاحظات والتوصيات
    therapist_observations = db.Column(db.Text)  # ملاحظات المعالج
    family_feedback = db.Column(db.Text)  # تغذية راجعة من الأسرة
    next_steps = db.Column(db.Text)  # الخطوات التالية
    modifications_needed = db.Column(db.Text)  # التعديلات المطلوبة
    
    # المرفقات
    progress_photos = db.Column(db.Text)  # صور التقدم (JSON)
    video_recordings = db.Column(db.Text)  # التسجيلات المرئية (JSON)
    documents = db.Column(db.Text)  # المستندات (JSON)
    
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<ProgressRecord {self.id}>'


# Note: TherapySession model is defined in comprehensive_rehabilitation_models.py to avoid table conflicts


class RehabilitationGoal(db.Model):
    """أهداف التأهيل"""
    __tablename__ = 'rehabilitation_goals'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_plans.id'), nullable=False)
    
    # تفاصيل الهدف
    goal_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    goal_type = db.Column(db.String(50))  # short_term, long_term
    category = db.Column(db.String(50))  # cognitive, physical, social, emotional, behavioral
    priority_level = db.Column(db.String(20))  # high, medium, low
    
    # المعايير والقياس
    success_criteria = db.Column(db.Text)  # معايير النجاح (JSON)
    measurement_method = db.Column(db.String(100))  # طريقة القياس
    target_value = db.Column(db.Float)  # القيمة المستهدفة
    current_value = db.Column(db.Float)  # القيمة الحالية
    unit_of_measurement = db.Column(db.String(50))  # وحدة القياس
    
    # التواريخ والحالة
    start_date = db.Column(db.Date, nullable=False)
    target_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='active')  # active, achieved, modified, discontinued
    achievement_date = db.Column(db.Date)
    achievement_percentage = db.Column(db.Float, default=0.0)
    
    # الاستراتيجيات والموارد
    intervention_strategies = db.Column(db.Text)  # استراتيجيات التدخل (JSON)
    required_resources = db.Column(db.Text)  # الموارد المطلوبة (JSON)
    responsible_staff = db.Column(db.Text)  # الموظفين المسؤولين (JSON)
    
    # التقييم والمراجعة
    review_frequency = db.Column(db.String(20))  # تكرار المراجعة
    last_review_date = db.Column(db.Date)
    next_review_date = db.Column(db.Date)
    modifications_history = db.Column(db.Text)  # تاريخ التعديلات (JSON)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<RehabilitationGoal {self.goal_name}>'

# ==================== نظام إدارة المتطوعين والموظفين ====================

class VolunteerStaff(db.Model):
    """المتطوعون والموظفون"""
    __tablename__ = 'volunteer_staff'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # المعلومات الشخصية
    full_name = db.Column(db.String(200), nullable=False)
    national_id = db.Column(db.String(20), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    address = db.Column(db.Text)
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(10))  # male, female
    
    # معلومات العمل
    staff_type = db.Column(db.String(50), nullable=False)  # volunteer, employee, contractor
    position = db.Column(db.String(100))
    department = db.Column(db.String(100))
    specialization = db.Column(db.String(100))
    experience_years = db.Column(db.Integer)
    
    # الحالة والتوفر
    status = db.Column(db.String(20), default='active')  # active, inactive, suspended, terminated
    availability = db.Column(db.String(20), default='available')  # available, busy, on_leave
    work_schedule = db.Column(db.Text)  # JSON
    
    # المهارات والشهادات
    skills = db.Column(db.Text)  # JSON
    certifications = db.Column(db.Text)  # JSON
    languages = db.Column(db.Text)  # JSON
    
    # معلومات التوظيف
    hire_date = db.Column(db.Date)
    contract_type = db.Column(db.String(50))  # permanent, temporary, part_time, full_time
    salary = db.Column(db.Float)
    benefits = db.Column(db.Text)  # JSON
    
    # معلومات الطوارئ
    emergency_contact_name = db.Column(db.String(200))
    emergency_contact_phone = db.Column(db.String(20))
    emergency_contact_relation = db.Column(db.String(50))
    
    # الوثائق والملفات
    documents = db.Column(db.Text)  # JSON
    photo_url = db.Column(db.String(255))
    
    # التقييم والأداء
    performance_rating = db.Column(db.Float)
    last_evaluation_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<VolunteerStaff {self.full_name}>'

class StaffAttendance(db.Model):
    """حضور الموظفين والمتطوعين"""
    __tablename__ = 'staff_attendance'
    
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    
    # معلومات الحضور
    date = db.Column(db.Date, nullable=False)
    check_in_time = db.Column(db.Time)
    check_out_time = db.Column(db.Time)
    total_hours = db.Column(db.Float)
    
    # الحالة
    status = db.Column(db.String(20), default='present')  # present, absent, late, early_leave, sick_leave, vacation
    attendance_type = db.Column(db.String(20), default='regular')  # regular, overtime, holiday
    
    # الملاحظات
    notes = db.Column(db.Text)
    location = db.Column(db.String(100))
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    staff = db.relationship('VolunteerStaff', backref='attendance_records')
    
    def __repr__(self):
        return f'<StaffAttendance {self.staff_id} - {self.date}>'

class StaffLeaveRequest(db.Model):
    """طلبات الإجازات"""
    __tablename__ = 'staff_leave_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    
    # معلومات الإجازة
    leave_type = db.Column(db.String(50), nullable=False)  # annual, sick, emergency, maternity, unpaid
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    total_days = db.Column(db.Integer)
    
    # الطلب
    reason = db.Column(db.Text)
    supporting_documents = db.Column(db.Text)  # JSON
    
    # الموافقة
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, cancelled
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approval_date = db.Column(db.DateTime)
    approval_notes = db.Column(db.Text)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    staff = db.relationship('VolunteerStaff', backref='leave_requests')
    
    def __repr__(self):
        return f'<StaffLeaveRequest {self.staff_id} - {self.leave_type}>'

class StaffEvaluation(db.Model):
    """تقييم الموظفين والمتطوعين"""
    __tablename__ = 'staff_evaluations'
    
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    
    # معلومات التقييم
    evaluation_period_start = db.Column(db.Date, nullable=False)
    evaluation_period_end = db.Column(db.Date, nullable=False)
    evaluation_type = db.Column(db.String(50))  # annual, probation, performance, disciplinary
    
    # معايير التقييم
    performance_criteria = db.Column(db.Text)  # JSON
    overall_rating = db.Column(db.Float)
    strengths = db.Column(db.Text)
    areas_for_improvement = db.Column(db.Text)
    
    # الأهداف والتطوير
    goals_achieved = db.Column(db.Text)  # JSON
    new_goals = db.Column(db.Text)  # JSON
    development_plan = db.Column(db.Text)
    training_recommendations = db.Column(db.Text)
    
    # التوصيات
    recommendations = db.Column(db.Text)
    promotion_recommendation = db.Column(db.Boolean, default=False)
    salary_adjustment = db.Column(db.Float)
    
    # المقيم
    evaluator_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    evaluation_date = db.Column(db.Date)
    
    # الموافقة
    status = db.Column(db.String(20), default='draft')  # draft, completed, approved
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    staff = db.relationship('VolunteerStaff', backref='evaluations')
    
    def __repr__(self):
        return f'<StaffEvaluation {self.staff_id} - {self.evaluation_type}>'

class StaffTraining(db.Model):
    """تدريب الموظفين والمتطوعين"""
    __tablename__ = 'staff_training'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات التدريب
    training_title = db.Column(db.String(200), nullable=False)
    training_type = db.Column(db.String(50))  # orientation, skill_development, safety, compliance
    description = db.Column(db.Text)
    objectives = db.Column(db.Text)
    
    # التفاصيل
    duration_hours = db.Column(db.Float)
    training_method = db.Column(db.String(50))  # classroom, online, workshop, on_job
    trainer_name = db.Column(db.String(200))
    training_materials = db.Column(db.Text)  # JSON
    
    # الجدولة
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    location = db.Column(db.String(200))
    max_participants = db.Column(db.Integer)
    
    # الحالة
    status = db.Column(db.String(20), default='planned')  # planned, ongoing, completed, cancelled
    
    # التكلفة
    cost = db.Column(db.Float)
    budget_approved = db.Column(db.Boolean, default=False)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<StaffTraining {self.training_title}>'

class StaffTrainingParticipation(db.Model):
    """مشاركة الموظفين في التدريب"""
    __tablename__ = 'staff_training_participation'
    
    id = db.Column(db.Integer, primary_key=True)
    training_id = db.Column(db.Integer, db.ForeignKey('staff_training.id'), nullable=False)
    staff_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    
    # المشاركة
    registration_date = db.Column(db.DateTime, default=datetime.utcnow)
    attendance_status = db.Column(db.String(20), default='registered')  # registered, attended, absent, completed
    completion_date = db.Column(db.DateTime)
    
    # التقييم
    pre_assessment_score = db.Column(db.Float)
    post_assessment_score = db.Column(db.Float)
    feedback = db.Column(db.Text)
    certificate_issued = db.Column(db.Boolean, default=False)
    certificate_number = db.Column(db.String(50))
    
    # الملاحظات
    notes = db.Column(db.Text)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    training = db.relationship('StaffTraining', backref='participants')
    staff = db.relationship('VolunteerStaff', backref='training_records')
    
    def __repr__(self):
        return f'<StaffTrainingParticipation {self.training_id} - {self.staff_id}>'

class StaffSchedule(db.Model):
    """جدولة الموظفين والمتطوعين"""
    __tablename__ = 'staff_schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    
    # معلومات الجدولة
    schedule_date = db.Column(db.Date, nullable=False)
    shift_type = db.Column(db.String(20))  # morning, afternoon, evening, night
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)
    
    # التفاصيل
    department = db.Column(db.String(100))
    role = db.Column(db.String(100))
    responsibilities = db.Column(db.Text)
    location = db.Column(db.String(100))
    
    # الحالة
    status = db.Column(db.String(20), default='scheduled')  # scheduled, confirmed, cancelled, completed
    
    # الملاحظات
    notes = db.Column(db.Text)
    special_instructions = db.Column(db.Text)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    staff = db.relationship('VolunteerStaff', backref='schedules')
    
    def __repr__(self):
        return f'<StaffSchedule {self.staff_id} - {self.schedule_date}>'

# ==================== نظام المهارات والتقييمات ====================

class SkillCategory(db.Model):
    """فئات المهارات"""
    __tablename__ = 'skill_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات الفئة
    category_name = db.Column(db.String(200), nullable=False)
    category_name_en = db.Column(db.String(200))
    description = db.Column(db.Text)
    icon = db.Column(db.String(100))  # أيقونة الفئة
    color = db.Column(db.String(20))  # لون الفئة
    
    # الترتيب والتسلسل
    order_index = db.Column(db.Integer, default=0)
    parent_category_id = db.Column(db.Integer, db.ForeignKey('skill_categories.id'))
    
    # الحالة
    is_active = db.Column(db.Boolean, default=True)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    parent_category = db.relationship('SkillCategory', remote_side=[id], backref='subcategories')
    
    def __repr__(self):
        return f'<SkillCategory {self.category_name}>'

class Skill(db.Model):
    """المهارات"""
    __tablename__ = 'skills'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات المهارة
    skill_name = db.Column(db.String(500), nullable=False)
    skill_name_en = db.Column(db.String(500))
    description = db.Column(db.Text)
    
    # التصنيف
    category_id = db.Column(db.Integer, db.ForeignKey('skill_categories.id'), nullable=False)
    skill_level = db.Column(db.String(50))  # beginner, intermediate, advanced
    age_group = db.Column(db.String(50))  # early_childhood, school_age, adult
    
    # الترتيب والتسلسل
    order_index = db.Column(db.Integer, default=0)
    prerequisite_skills = db.Column(db.Text)  # JSON list of prerequisite skill IDs
    
    # معايير التقييم
    evaluation_criteria = db.Column(db.Text)  # JSON
    success_indicators = db.Column(db.Text)  # JSON
    
    # الحالة
    is_active = db.Column(db.Boolean, default=True)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    category = db.relationship('SkillCategory', backref='skills')
    
    def __repr__(self):
        return f'<Skill {self.skill_name}>'

class StudentSkillAssessment(db.Model):
    """تقييمات مهارات الطلاب"""
    __tablename__ = 'student_skill_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات التقييم
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id'), nullable=False)
    
    # نتيجة التقييم
    assessment_status = db.Column(db.String(20), nullable=False)  # completed, not_completed, maybe
    proficiency_level = db.Column(db.Integer)  # 1-5 scale
    
    # تفاصيل التقييم
    notes = db.Column(db.Text)
    observations = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    
    # معلومات التقييم
    assessment_date = db.Column(db.Date, nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_method = db.Column(db.String(100))  # observation, test, activity
    
    # الأهداف والخطط
    goals = db.Column(db.Text)  # JSON
    intervention_plan = db.Column(db.Text)
    next_assessment_date = db.Column(db.Date)
    
    # الحالة
    is_current = db.Column(db.Boolean, default=True)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='skill_assessments')
    skill = db.relationship('Skill', backref='assessments')
    assessor = db.relationship('User', backref='conducted_assessments')
    
    def __repr__(self):
        return f'<StudentSkillAssessment {self.student_id}-{self.skill_id}>'

class StudentSkillProgress(db.Model):
    """تتبع تقدم الطلاب في المهارات"""
    __tablename__ = 'student_skill_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات التقدم
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id'), nullable=False)
    
    # بيانات التقدم
    progress_percentage = db.Column(db.Float, default=0.0)
    milestones_achieved = db.Column(db.Text)  # JSON
    current_level = db.Column(db.String(50))
    
    # التواريخ المهمة
    started_date = db.Column(db.Date)
    target_completion_date = db.Column(db.Date)
    actual_completion_date = db.Column(db.Date)
    
    # الحالة
    status = db.Column(db.String(20), default='in_progress')  # not_started, in_progress, completed, on_hold
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='skill_progress')
    skill = db.relationship('Skill', backref='student_progress')
    
    def __repr__(self):
        return f'<StudentSkillProgress {self.student_id}-{self.skill_id}>'

class SkillNotification(db.Model):
    """إشعارات المهارات للطلاب"""
    __tablename__ = 'skill_notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات الإشعار
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id'))
    
    # محتوى الإشعار
    notification_type = db.Column(db.String(50), nullable=False)  # achievement, reminder, assessment_due, progress_update
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    icon = db.Column(db.String(100))
    
    # الحالة والأولوية
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, urgent
    is_read = db.Column(db.Boolean, default=False)
    is_archived = db.Column(db.Boolean, default=False)
    
    # التواريخ
    scheduled_date = db.Column(db.DateTime)
    sent_date = db.Column(db.DateTime)
    read_date = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    student = db.relationship('Student', backref='skill_notifications')
    skill = db.relationship('Skill', backref='notifications')
    
    def __repr__(self):
        return f'<SkillNotification {self.title}>'

# ==================== نظام الهيكل التنظيمي ====================

class OrganizationalUnit(db.Model):
    """الوحدات التنظيمية"""
    __tablename__ = 'organizational_units'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات الوحدة
    unit_name = db.Column(db.String(200), nullable=False)
    unit_code = db.Column(db.String(50), unique=True)
    unit_type = db.Column(db.String(50), nullable=False)  # department, division, section, team
    description = db.Column(db.Text)
    
    # الهيكل الهرمي
    parent_unit_id = db.Column(db.Integer, db.ForeignKey('organizational_units.id'))
    level = db.Column(db.Integer, default=1)  # مستوى الوحدة في الهيكل
    hierarchy_path = db.Column(db.String(500))  # مسار هرمي للوحدة
    
    # المسؤوليات والصلاحيات
    responsibilities = db.Column(db.Text)  # JSON
    authorities = db.Column(db.Text)  # JSON
    
    # معلومات الإدارة
    manager_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'))
    deputy_manager_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'))
    
    # الموقع والتواصل
    location = db.Column(db.String(200))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    
    # الحالة والإعدادات
    status = db.Column(db.String(20), default='active')  # active, inactive, restructuring
    budget_code = db.Column(db.String(50))
    cost_center = db.Column(db.String(50))
    
    # التواريخ
    established_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    parent_unit = db.relationship('OrganizationalUnit', remote_side=[id], backref='child_units')
    manager = db.relationship('VolunteerStaff', foreign_keys=[manager_id], backref='managed_units')
    deputy_manager = db.relationship('VolunteerStaff', foreign_keys=[deputy_manager_id], backref='deputy_managed_units')
    
    def __repr__(self):
        return f'<OrganizationalUnit {self.unit_name}>'

class Position(db.Model):
    """المناصب والوظائف"""
    __tablename__ = 'positions'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات المنصب
    position_title = db.Column(db.String(200), nullable=False)
    position_code = db.Column(db.String(50), unique=True)
    job_description = db.Column(db.Text)
    
    # التصنيف والمستوى
    position_level = db.Column(db.Integer)  # مستوى المنصب
    position_grade = db.Column(db.String(20))  # درجة المنصب
    position_category = db.Column(db.String(50))  # فئة المنصب
    
    # الوحدة التنظيمية
    unit_id = db.Column(db.Integer, db.ForeignKey('organizational_units.id'), nullable=False)
    
    # المتطلبات والمؤهلات
    required_qualifications = db.Column(db.Text)  # JSON
    required_experience = db.Column(db.Integer)  # سنوات الخبرة المطلوبة
    required_skills = db.Column(db.Text)  # JSON
    
    # المسؤوليات والمهام
    key_responsibilities = db.Column(db.Text)  # JSON
    performance_indicators = db.Column(db.Text)  # JSON
    
    # معلومات الراتب والمزايا
    salary_range_min = db.Column(db.Float)
    salary_range_max = db.Column(db.Float)
    benefits = db.Column(db.Text)  # JSON
    
    # الحالة
    status = db.Column(db.String(20), default='active')  # active, inactive, vacant, filled
    is_supervisory = db.Column(db.Boolean, default=False)
    reports_to_position_id = db.Column(db.Integer, db.ForeignKey('positions.id'))
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    unit = db.relationship('OrganizationalUnit', backref='positions')
    reports_to = db.relationship('Position', remote_side=[id], backref='subordinate_positions')
    
    def __repr__(self):
        return f'<Position {self.position_title}>'

class StaffAssignment(db.Model):
    """تعيين الموظفين في المناصب"""
    __tablename__ = 'staff_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات التعيين
    staff_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    position_id = db.Column(db.Integer, db.ForeignKey('positions.id'), nullable=False)
    unit_id = db.Column(db.Integer, db.ForeignKey('organizational_units.id'), nullable=False)
    
    # تفاصيل التعيين
    assignment_type = db.Column(db.String(50), default='permanent')  # permanent, temporary, acting, secondment
    assignment_status = db.Column(db.String(20), default='active')  # active, inactive, transferred, terminated
    
    # التواريخ
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)  # للتعيينات المؤقتة
    actual_end_date = db.Column(db.Date)
    
    # الراتب والمزايا
    salary = db.Column(db.Float)
    allowances = db.Column(db.Text)  # JSON
    
    # ملاحظات وسبب التعيين
    assignment_reason = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    # الموافقات
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approval_date = db.Column(db.DateTime)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    staff = db.relationship('VolunteerStaff', backref='assignments')
    position = db.relationship('Position', backref='assignments')
    unit = db.relationship('OrganizationalUnit', backref='staff_assignments')
    
    def __repr__(self):
        return f'<StaffAssignment {self.staff_id} - {self.position_id}>'

class OrganizationalChart(db.Model):
    """مخطط الهيكل التنظيمي"""
    __tablename__ = 'organizational_charts'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات المخطط
    chart_name = db.Column(db.String(200), nullable=False)
    chart_version = db.Column(db.String(20), default='1.0')
    description = db.Column(db.Text)
    
    # إعدادات المخطط
    chart_data = db.Column(db.Text)  # JSON structure of the chart
    layout_settings = db.Column(db.Text)  # JSON layout preferences
    
    # الحالة والموافقة
    status = db.Column(db.String(20), default='draft')  # draft, approved, active, archived
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approval_date = db.Column(db.DateTime)
    
    # تواريخ الفعالية
    effective_from = db.Column(db.Date)
    effective_to = db.Column(db.Date)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<OrganizationalChart {self.chart_name}>'

class ReportingRelationship(db.Model):
    """علاقات التبعية والإشراف"""
    __tablename__ = 'reporting_relationships'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # العلاقة الإشرافية
    subordinate_staff_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    supervisor_staff_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    
    # نوع العلاقة
    relationship_type = db.Column(db.String(50), default='direct')  # direct, indirect, functional, matrix
    authority_level = db.Column(db.String(50))  # full, limited, advisory, coordination
    
    # الوحدات التنظيمية
    subordinate_unit_id = db.Column(db.Integer, db.ForeignKey('organizational_units.id'))
    supervisor_unit_id = db.Column(db.Integer, db.ForeignKey('organizational_units.id'))
    
    # تفاصيل العلاقة
    responsibilities = db.Column(db.Text)  # JSON
    delegation_authority = db.Column(db.Text)  # JSON
    
    # الحالة والتواريخ
    status = db.Column(db.String(20), default='active')  # active, inactive, suspended
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    subordinate = db.relationship('VolunteerStaff', foreign_keys=[subordinate_staff_id], backref='supervisors')
    supervisor = db.relationship('VolunteerStaff', foreign_keys=[supervisor_staff_id], backref='subordinates')
    subordinate_unit = db.relationship('OrganizationalUnit', foreign_keys=[subordinate_unit_id])
    supervisor_unit = db.relationship('OrganizationalUnit', foreign_keys=[supervisor_unit_id])
    
    def __repr__(self):
        return f'<ReportingRelationship {self.subordinate_staff_id} -> {self.supervisor_staff_id}>'

class OrganizationalChange(db.Model):
    """تغييرات الهيكل التنظيمي"""
    __tablename__ = 'organizational_changes'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات التغيير
    change_title = db.Column(db.String(200), nullable=False)
    change_type = db.Column(db.String(50), nullable=False)  # restructure, merge, split, create, dissolve
    description = db.Column(db.Text)
    justification = db.Column(db.Text)
    
    # الوحدات المتأثرة
    affected_units = db.Column(db.Text)  # JSON list of unit IDs
    affected_positions = db.Column(db.Text)  # JSON list of position IDs
    affected_staff = db.Column(db.Text)  # JSON list of staff IDs
    
    # تفاصيل التغيير
    change_details = db.Column(db.Text)  # JSON detailed change information
    implementation_plan = db.Column(db.Text)
    expected_impact = db.Column(db.Text)
    
    # الحالة والموافقة
    status = db.Column(db.String(20), default='proposed')  # proposed, approved, in_progress, completed, cancelled
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approval_date = db.Column(db.DateTime)
    
    # تواريخ التنفيذ
    planned_start_date = db.Column(db.Date)
    planned_end_date = db.Column(db.Date)
    actual_start_date = db.Column(db.Date)
    actual_end_date = db.Column(db.Date)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<OrganizationalChange {self.change_title}>'

# ===== نماذج العيادات المتخصصة =====

class ClinicType(db.Model):
    """أنواع العيادات المتخصصة"""
    __tablename__ = 'clinic_types'
    
    id = db.Column(db.Integer, primary_key=True)
    clinic_name = db.Column(db.String(100), nullable=False, unique=True)  # اسم العيادة
    description = db.Column(db.Text)  # وصف العيادة
    icon = db.Column(db.String(50), default='fas fa-clinic-medical')  # أيقونة العيادة
    color = db.Column(db.String(20), default='#007bff')  # لون العيادة
    is_active = db.Column(db.Boolean, default=True)  # حالة العيادة
    
    # العلاقات
    specialists = db.relationship('ClinicSpecialist', backref='clinic_type', lazy=True, cascade='all, delete-orphan')
    appointments = db.relationship('ClinicAppointment', backref='clinic_type', lazy=True)
    sessions = db.relationship('TherapySession', backref='clinic_type', lazy=True)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<ClinicType {self.clinic_name}>'

class ClinicSpecialist(db.Model):
    """الأخصائيين في العيادات"""
    __tablename__ = 'clinic_specialists'
    
    id = db.Column(db.Integer, primary_key=True)
    clinic_type_id = db.Column(db.Integer, db.ForeignKey('clinic_types.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    # معلومات التخصص
    specialization = db.Column(db.String(200))  # التخصص الدقيق
    license_number = db.Column(db.String(100))  # رقم الترخيص
    experience_years = db.Column(db.Integer)  # سنوات الخبرة
    qualifications = db.Column(db.Text)  # المؤهلات
    
    # معلومات العمل
    work_schedule = db.Column(db.JSON)  # جدول العمل الأسبوعي
    max_daily_appointments = db.Column(db.Integer, default=8)  # الحد الأقصى للمواعيد اليومية
    appointment_duration = db.Column(db.Integer, default=30)  # مدة الموعد بالدقائق
    is_available = db.Column(db.Boolean, default=True)  # متاح للمواعيد
    
    # العلاقات
    appointments = db.relationship('ClinicAppointment', backref='specialist', lazy=True)
    sessions = db.relationship('TherapySession', backref='specialist', lazy=True)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<ClinicSpecialist {self.employee.name} - {self.clinic_type.clinic_name}>'

class ClinicAppointment(db.Model):
    """مواعيد العيادات"""
    __tablename__ = 'clinic_appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    clinic_type_id = db.Column(db.Integer, db.ForeignKey('clinic_types.id'), nullable=False)
    specialist_id = db.Column(db.Integer, db.ForeignKey('clinic_specialists.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    
    # معلومات الموعد
    appointment_date = db.Column(db.Date, nullable=False)  # تاريخ الموعد
    appointment_time = db.Column(db.Time, nullable=False)  # وقت الموعد
    duration = db.Column(db.Integer, default=30)  # مدة الموعد بالدقائق
    appointment_type = db.Column(db.String(50), default='consultation')  # نوع الموعد
    
    # حالة الموعد
    status = db.Column(db.String(20), default='scheduled')  # scheduled, completed, cancelled, no_show
    priority = db.Column(db.String(20), default='normal')  # urgent, high, normal, low
    
    # معلومات إضافية
    reason = db.Column(db.Text)  # سبب الموعد
    notes = db.Column(db.Text)  # ملاحظات
    parent_notified = db.Column(db.Boolean, default=False)  # تم إشعار الوالدين
    reminder_sent = db.Column(db.Boolean, default=False)  # تم إرسال التذكير
    
    # العلاقات
    session = db.relationship('TherapySession', backref='appointment', uselist=False, lazy=True)
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<ClinicAppointment {self.student.name} - {self.clinic_type.clinic_name} - {self.appointment_date}>'

# Note: TherapySession model is defined in comprehensive_rehabilitation_models.py to avoid table conflicts

class SessionAttachment(db.Model):
    """مرفقات الجلسات"""
    __tablename__ = 'session_attachments'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('therapy_sessions.id'), nullable=False)
    
    # معلومات المرفق
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50))  # document, image, audio, video
    file_size = db.Column(db.Integer)  # حجم الملف بالبايت
    description = db.Column(db.Text)  # وصف المرفق
    
    # التواريخ
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<SessionAttachment {self.file_name}>'

class TreatmentPlan(db.Model):
    """خطط العلاج طويلة المدى"""
    __tablename__ = 'treatment_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    clinic_type_id = db.Column(db.Integer, db.ForeignKey('clinic_types.id'), nullable=False)
    specialist_id = db.Column(db.Integer, db.ForeignKey('clinic_specialists.id'), nullable=False)
    
    # معلومات الخطة
    plan_title = db.Column(db.String(200), nullable=False)  # عنوان الخطة
    start_date = db.Column(db.Date, nullable=False)  # تاريخ البداية
    end_date = db.Column(db.Date)  # تاريخ النهاية المتوقع
    status = db.Column(db.String(20), default='active')  # active, completed, paused, cancelled
    
    # التقييم الأولي
    initial_assessment = db.Column(db.Text)  # التقييم الأولي
    baseline_measurements = db.Column(db.Text)  # القياسات الأساسية
    
    # الأهداف
    long_term_goals = db.Column(db.Text)  # الأهداف طويلة المدى
    short_term_goals = db.Column(db.Text)  # الأهداف قصيرة المدى
    measurable_objectives = db.Column(db.Text)  # الأهداف القابلة للقياس
    
    # التدخلات
    intervention_strategies = db.Column(db.Text)  # استراتيجيات التدخل
    frequency = db.Column(db.String(100))  # تكرار الجلسات
    duration_per_session = db.Column(db.Integer)  # مدة كل جلسة
    
    # المراجعة والتقييم
    review_frequency = db.Column(db.String(50))  # تكرار المراجعة
    success_criteria = db.Column(db.Text)  # معايير النجاح
    progress_indicators = db.Column(db.Text)  # مؤشرات التقدم
    
    # العلاقات
    goals = db.relationship('TreatmentGoal', backref='treatment_plan', lazy=True, cascade='all, delete-orphan')
    reviews = db.relationship('PlanReview', backref='treatment_plan', lazy=True, cascade='all, delete-orphan')
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<TreatmentPlan {self.plan_title} - {self.student.name}>'

class TreatmentGoal(db.Model):
    """أهداف خطة العلاج"""
    __tablename__ = 'treatment_goals'
    
    id = db.Column(db.Integer, primary_key=True)
    treatment_plan_id = db.Column(db.Integer, db.ForeignKey('treatment_plans.id'), nullable=False)
    
    # معلومات الهدف
    goal_title = db.Column(db.String(200), nullable=False)  # عنوان الهدف
    goal_description = db.Column(db.Text)  # وصف الهدف
    goal_type = db.Column(db.String(50))  # long_term, short_term, behavioral, academic, social
    priority = db.Column(db.String(20), default='medium')  # high, medium, low
    
    # القياس والتقييم
    baseline_value = db.Column(db.String(100))  # القيمة الأساسية
    target_value = db.Column(db.String(100))  # القيمة المستهدفة
    measurement_method = db.Column(db.Text)  # طريقة القياس
    success_criteria = db.Column(db.Text)  # معايير النجاح
    
    # التوقيت
    target_date = db.Column(db.Date)  # التاريخ المستهدف
    status = db.Column(db.String(20), default='in_progress')  # not_started, in_progress, achieved, modified, discontinued
    
    # التقدم
    current_progress = db.Column(db.Integer, default=0)  # التقدم الحالي (نسبة مئوية)
    progress_notes = db.Column(db.Text)  # ملاحظات التقدم
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<TreatmentGoal {self.goal_title}>'

class PlanReview(db.Model):
    """مراجعات خطة العلاج"""
    __tablename__ = 'plan_reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    treatment_plan_id = db.Column(db.Integer, db.ForeignKey('treatment_plans.id'), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('clinic_specialists.id'), nullable=False)
    
    # معلومات المراجعة
    review_date = db.Column(db.Date, nullable=False)  # تاريخ المراجعة
    review_type = db.Column(db.String(50))  # scheduled, progress, final, emergency
    
    # التقييم
    overall_progress = db.Column(db.Integer)  # التقدم العام (نسبة مئوية)
    goals_achieved = db.Column(db.Integer, default=0)  # عدد الأهداف المحققة
    goals_modified = db.Column(db.Integer, default=0)  # عدد الأهداف المعدلة
    
    # الملاحظات والتوصيات
    progress_summary = db.Column(db.Text)  # ملخص التقدم
    challenges = db.Column(db.Text)  # التحديات
    recommendations = db.Column(db.Text)  # التوصيات
    plan_modifications = db.Column(db.Text)  # تعديلات الخطة
    
    # القرارات
    continue_plan = db.Column(db.Boolean, default=True)  # متابعة الخطة
    modify_plan = db.Column(db.Boolean, default=False)  # تعديل الخطة
    discharge_ready = db.Column(db.Boolean, default=False)  # جاهز للخروج
    
    # المتابعة
    next_review_date = db.Column(db.Date)  # تاريخ المراجعة التالية
    action_items = db.Column(db.Text)  # بنود العمل
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def __repr__(self):
        return f'<PlanReview {self.treatment_plan.plan_title} - {self.review_date}>'

class ReportTemplate(db.Model):
    __tablename__ = 'report_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    template_content = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

# ============================================================================
# VINELAND ADAPTIVE BEHAVIOR SCALES - مقياس فاين لاند للسلوك التكيفي
# ============================================================================

class VinelandAssessment(db.Model):
    """تقييم مقياس فاين لاند للسلوك التكيفي"""
    __tablename__ = 'vineland_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    # معلومات التقييم
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50), nullable=False, default='interview')  # interview, parent_caregiver, teacher
    form_type = db.Column(db.String(50), nullable=False, default='comprehensive')  # comprehensive, survey, teacher
    
    # معلومات الطالب وقت التقييم
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='in_progress')  # in_progress, completed, cancelled
    completion_date = db.Column(db.DateTime)
    
    # المعلومات الإضافية
    respondent_name = db.Column(db.String(200))  # اسم المجيب (الوالد/المعلم)
    respondent_relationship = db.Column(db.String(100))  # علاقة المجيب بالطالب
    assessment_setting = db.Column(db.String(100))  # مكان التقييم
    
    # الملاحظات
    notes = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    
    # العلاقات
    domain_results = db.relationship('VinelandDomainResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    subdomain_results = db.relationship('VinelandSubdomainResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    item_responses = db.relationship('VinelandItemResponse', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('VinelandReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class VinelandDomain(db.Model):
    """مجالات مقياس فاين لاند الرئيسية"""
    __tablename__ = 'vineland_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_code = db.Column(db.String(10), unique=True, nullable=False)
    domain_name_ar = db.Column(db.String(200), nullable=False)
    domain_name_en = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # العلاقات
    subdomains = db.relationship('VinelandSubdomain', backref='domain', lazy=True)
    domain_results = db.relationship('VinelandDomainResult', backref='domain', lazy=True)

class VinelandSubdomain(db.Model):
    """المجالات الفرعية لمقياس فاين لاند"""
    __tablename__ = 'vineland_subdomains'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey('vineland_domains.id'), nullable=False)
    subdomain_code = db.Column(db.String(20), unique=True, nullable=False)
    subdomain_name_ar = db.Column(db.String(200), nullable=False)
    subdomain_name_en = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # العلاقات
    items = db.relationship('VinelandItem', backref='subdomain', lazy=True)
    subdomain_results = db.relationship('VinelandSubdomainResult', backref='subdomain', lazy=True)

class VinelandItem(db.Model):
    """عناصر مقياس فاين لاند"""
    __tablename__ = 'vineland_items'
    
    id = db.Column(db.Integer, primary_key=True)
    subdomain_id = db.Column(db.Integer, db.ForeignKey('vineland_subdomains.id'), nullable=False)
    item_number = db.Column(db.String(20), nullable=False)
    item_text_ar = db.Column(db.Text, nullable=False)
    item_text_en = db.Column(db.Text, nullable=False)
    
    # معايير التسجيل
    scoring_criteria = db.Column(db.JSON)  # معايير التسجيل لكل مستوى (0, 1, 2)
    age_range_start = db.Column(db.Integer)  # العمر الأدنى بالشهور
    age_range_end = db.Column(db.Integer)    # العمر الأعلى بالشهور
    
    # معلومات إضافية
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    difficulty_level = db.Column(db.String(20))  # easy, medium, hard
    
    # العلاقات
    responses = db.relationship('VinelandItemResponse', backref='item', lazy=True)

class VinelandItemResponse(db.Model):
    """استجابات عناصر مقياس فاين لاند"""
    __tablename__ = 'vineland_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('vineland_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('vineland_items.id'), nullable=False)
    
    # الاستجابة
    raw_score = db.Column(db.Integer)  # 0, 1, 2 (لا يفعل، أحياناً/جزئياً، عادة)
    response_notes = db.Column(db.Text)
    
    # معلومات التسجيل
    scored_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    scored_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # فهارس فريدة
    __table_args__ = (db.UniqueConstraint('assessment_id', 'item_id'),)

class VinelandDomainResult(db.Model):
    """نتائج المجالات الرئيسية لمقياس فاين لاند"""
    __tablename__ = 'vineland_domain_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('vineland_assessments.id'), nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey('vineland_domains.id'), nullable=False)
    
    # الدرجات الخام
    raw_score = db.Column(db.Integer)
    max_possible_score = db.Column(db.Integer)
    
    # الدرجات المعيارية
    v_scale_score = db.Column(db.Integer)  # V-Scale Score (20-160)
    percentile_rank = db.Column(db.Integer)
    age_equivalent_years = db.Column(db.Integer)
    age_equivalent_months = db.Column(db.Integer)
    
    # مستوى الأداء
    performance_level = db.Column(db.String(50))  # high, moderately_high, adequate, moderately_low, low
    adaptive_level = db.Column(db.String(50))     # high, moderate, mild, significant
    
    # التفسير
    interpretation = db.Column(db.Text)
    strengths = db.Column(db.Text)
    areas_for_improvement = db.Column(db.Text)
    
    # فهارس فريدة
    __table_args__ = (db.UniqueConstraint('assessment_id', 'domain_id'),)

class VinelandSubdomainResult(db.Model):
    """نتائج المجالات الفرعية لمقياس فاين لاند"""
    __tablename__ = 'vineland_subdomain_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('vineland_assessments.id'), nullable=False)
    subdomain_id = db.Column(db.Integer, db.ForeignKey('vineland_subdomains.id'), nullable=False)
    
    # الدرجات
    raw_score = db.Column(db.Integer)
    max_possible_score = db.Column(db.Integer)
    v_scale_score = db.Column(db.Integer)  # V-Scale Score
    percentile_rank = db.Column(db.Integer)
    age_equivalent_years = db.Column(db.Integer)
    age_equivalent_months = db.Column(db.Integer)
    
    # التحليل
    performance_level = db.Column(db.String(50))
    notes = db.Column(db.Text)
    
    # فهارس فريدة
    __table_args__ = (db.UniqueConstraint('assessment_id', 'subdomain_id'),)

class VinelandNorms(db.Model):
    """معايير وجداول التحويل لمقياس فاين لاند"""
    __tablename__ = 'vineland_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    age_years = db.Column(db.Integer, nullable=False)
    age_months = db.Column(db.Integer, nullable=False)
    domain_code = db.Column(db.String(10), nullable=False)
    
    # جداول التحويل
    raw_to_v_scale = db.Column(db.JSON)  # تحويل الدرجة الخام إلى V-Scale
    v_scale_to_percentile = db.Column(db.JSON)  # تحويل V-Scale إلى مئيني
    age_equivalents = db.Column(db.JSON)  # المكافئات العمرية
    
    # معايير الأداء
    performance_levels = db.Column(db.JSON)  # حدود مستويات الأداء
    
    # معلومات المعايرة
    sample_size = db.Column(db.Integer)
    norm_date = db.Column(db.Date)
    population = db.Column(db.String(100))  # US, Arabic, etc.
    
    # فهارس
    __table_args__ = (db.UniqueConstraint('age_years', 'age_months', 'domain_code', 'population'),)

class VinelandReport(db.Model):
    """تقارير مقياس فاين لاند"""
    __tablename__ = 'vineland_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('vineland_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50), nullable=False)  # comprehensive, summary, progress
    report_title = db.Column(db.String(200))
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    assessment_results = db.Column(db.Text)
    domain_analysis = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    interpretation = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    goals_objectives = db.Column(db.Text)
    
    # الدرجات المركبة
    adaptive_behavior_composite = db.Column(db.Integer)  # ABC
    abc_percentile = db.Column(db.Integer)
    abc_confidence_interval = db.Column(db.String(50))
    
    # التصنيف العام
    overall_adaptive_level = db.Column(db.String(50))
    diagnostic_considerations = db.Column(db.Text)
    
    # معلومات التقرير
    generated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')  # draft, final, archived
    
    # ملفات مرفقة
    attachments = db.Column(db.JSON)  # قائمة بالملفات المرفقة

# ============================================================================
# FORMBOARD TEST - مقياس لوحة الأشكال
# ============================================================================

class FormboardAssessment(db.Model):
    """تقييم مقياس لوحة الأشكال"""
    __tablename__ = 'formboard_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    
    # معلومات التقييم
    assessment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50), nullable=False, default='individual')  # individual, group
    
    # معلومات الطالب وقت التقييم
    chronological_age_years = db.Column(db.Integer)
    chronological_age_months = db.Column(db.Integer)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='in_progress')  # in_progress, completed, cancelled
    completion_date = db.Column(db.DateTime)
    
    # معلومات البيئة والظروف
    assessment_environment = db.Column(db.String(100))  # quiet_room, classroom, clinic
    lighting_conditions = db.Column(db.String(50))      # natural, artificial, mixed
    seating_arrangement = db.Column(db.String(100))     # table_chair, floor, adaptive
    
    # الملاحظات السلوكية
    attention_span = db.Column(db.String(50))           # excellent, good, fair, poor
    motivation_level = db.Column(db.String(50))         # high, moderate, low
    cooperation_level = db.Column(db.String(50))        # excellent, good, fair, poor
    frustration_tolerance = db.Column(db.String(50))    # high, moderate, low
    
    # استراتيجيات الحل
    problem_solving_approach = db.Column(db.String(100)) # systematic, trial_error, random
    hand_preference = db.Column(db.String(20))          # right, left, mixed
    grip_pattern = db.Column(db.String(50))             # mature, developing, immature
    
    # الملاحظات
    behavioral_observations = db.Column(db.Text)
    environmental_factors = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    # العلاقات
    shape_results = db.relationship('FormboardShapeResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    trial_results = db.relationship('FormboardTrialResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('FormboardReport', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class FormboardShape(db.Model):
    """أشكال لوحة الأشكال"""
    __tablename__ = 'formboard_shapes'
    
    id = db.Column(db.Integer, primary_key=True)
    shape_code = db.Column(db.String(10), unique=True, nullable=False)
    shape_name_ar = db.Column(db.String(100), nullable=False)
    shape_name_en = db.Column(db.String(100), nullable=False)
    
    # خصائص الشكل
    shape_type = db.Column(db.String(50))               # geometric, abstract, realistic
    complexity_level = db.Column(db.Integer)            # 1-5 (1=simple, 5=complex)
    number_of_pieces = db.Column(db.Integer)            # عدد القطع
    
    # معايير التقييم
    age_range_start = db.Column(db.Integer)             # العمر الأدنى بالشهور
    age_range_end = db.Column(db.Integer)               # العمر الأعلى بالشهور
    expected_completion_time = db.Column(db.Integer)    # الوقت المتوقع بالثواني
    
    # معلومات إضافية
    description = db.Column(db.Text)
    instructions_ar = db.Column(db.Text)
    instructions_en = db.Column(db.Text)
    image_path = db.Column(db.String(200))              # مسار صورة الشكل
    
    # ترتيب العرض
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # العلاقات
    shape_results = db.relationship('FormboardShapeResult', backref='shape', lazy=True)

class FormboardShapeResult(db.Model):
    """نتائج أشكال لوحة الأشكال"""
    __tablename__ = 'formboard_shape_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('formboard_assessments.id'), nullable=False)
    shape_id = db.Column(db.Integer, db.ForeignKey('formboard_shapes.id'), nullable=False)
    
    # نتائج الأداء
    completion_time = db.Column(db.Integer)             # الوقت بالثواني
    number_of_attempts = db.Column(db.Integer)          # عدد المحاولات
    success_status = db.Column(db.String(20))           # completed, incomplete, refused
    
    # تقييم الأداء
    accuracy_score = db.Column(db.Float)                # درجة الدقة (0-100)
    speed_score = db.Column(db.Float)                   # درجة السرعة
    efficiency_score = db.Column(db.Float)              # درجة الكفاءة
    
    # الملاحظات السلوكية للشكل
    approach_strategy = db.Column(db.String(100))       # systematic, random, trial_error
    error_patterns = db.Column(db.String(200))          # rotation, placement, sequencing
    assistance_needed = db.Column(db.String(100))       # none, verbal, physical, demonstration
    
    # معلومات التسجيل
    scored_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    scored_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    trial_results = db.relationship('FormboardTrialResult', backref='shape_result', lazy=True, cascade='all, delete-orphan')
    
    # فهارس فريدة
    __table_args__ = (db.UniqueConstraint('assessment_id', 'shape_id'),)

class FormboardTrialResult(db.Model):
    """نتائج المحاولات التفصيلية"""
    __tablename__ = 'formboard_trial_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('formboard_assessments.id'), nullable=False)
    shape_result_id = db.Column(db.Integer, db.ForeignKey('formboard_shape_results.id'), nullable=False)
    
    # معلومات المحاولة
    trial_number = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    duration_seconds = db.Column(db.Integer)
    
    # نتيجة المحاولة
    trial_outcome = db.Column(db.String(20))            # success, failure, abandoned
    pieces_placed_correctly = db.Column(db.Integer)     # عدد القطع الموضوعة بشكل صحيح
    total_pieces = db.Column(db.Integer)                # إجمالي عدد القطع
    
    # تفاصيل الأداء
    errors_made = db.Column(db.Integer)                 # عدد الأخطاء
    corrections_made = db.Column(db.Integer)            # عدد التصحيحات
    hesitations_count = db.Column(db.Integer)           # عدد مرات التردد
    
    # الملاحظات
    trial_notes = db.Column(db.Text)
    error_description = db.Column(db.Text)
    
    # فهارس
    __table_args__ = (db.UniqueConstraint('shape_result_id', 'trial_number'),)

class FormboardNorms(db.Model):
    """معايير وجداول التحويل لمقياس لوحة الأشكال"""
    __tablename__ = 'formboard_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    age_years = db.Column(db.Integer, nullable=False)
    age_months = db.Column(db.Integer, nullable=False)
    shape_code = db.Column(db.String(10), nullable=False)
    
    # معايير الوقت
    excellent_time = db.Column(db.Integer)              # الوقت الممتاز (ثواني)
    good_time = db.Column(db.Integer)                   # الوقت الجيد
    average_time = db.Column(db.Integer)                # الوقت المتوسط
    below_average_time = db.Column(db.Integer)          # الوقت دون المتوسط
    
    # معايير الدقة
    accuracy_percentiles = db.Column(db.JSON)           # المئينيات للدقة
    speed_percentiles = db.Column(db.JSON)              # المئينيات للسرعة
    
    # معايير الأداء العام
    performance_levels = db.Column(db.JSON)             # مستويات الأداء
    
    # معلومات المعايرة
    sample_size = db.Column(db.Integer)
    norm_date = db.Column(db.Date)
    population = db.Column(db.String(100))              # Saudi, Gulf, Arab, etc.
    
    # فهارس
    __table_args__ = (db.UniqueConstraint('age_years', 'age_months', 'shape_code', 'population'),)

class FormboardReport(db.Model):
    """تقارير مقياس لوحة الأشكال"""
    __tablename__ = 'formboard_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('formboard_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50), nullable=False)  # comprehensive, summary, progress
    report_title = db.Column(db.String(200))
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    assessment_conditions = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    
    # تحليل الأداء
    overall_performance = db.Column(db.Text)
    strengths_identified = db.Column(db.Text)
    areas_for_improvement = db.Column(db.Text)
    error_analysis = db.Column(db.Text)
    
    # النتائج الكمية
    total_completion_time = db.Column(db.Integer)       # إجمالي الوقت
    average_accuracy = db.Column(db.Float)              # متوسط الدقة
    overall_efficiency = db.Column(db.Float)            # الكفاءة العامة
    
    # التفسير والتوصيات
    interpretation = db.Column(db.Text)
    educational_recommendations = db.Column(db.Text)
    therapeutic_recommendations = db.Column(db.Text)
    follow_up_suggestions = db.Column(db.Text)
    
    # التصنيف العام
    overall_performance_level = db.Column(db.String(50)) # excellent, good, average, below_average, poor
    visual_motor_integration = db.Column(db.String(50))  # تقييم التكامل البصري الحركي
    problem_solving_ability = db.Column(db.String(50))   # قدرة حل المشكلات
    
    # معلومات التقرير
    generated_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')  # draft, final, archived
    
    # ملفات مرفقة
    attachments = db.Column(db.JSON)                    # قائمة بالملفات المرفقة
    charts_data = db.Column(db.JSON)                    # بيانات الرسوم البيانية

# ============================================================================
# AI MODELS - نماذج الذكاء الاصطناعي
# ============================================================================

# نموذج تقييم مقياس بينيه الصورة الخامسة
class StanfordBinetAssessment(db.Model):
    __tablename__ = 'stanford_binet_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    
    # معلومات التقييم الأساسية
    assessment_date = db.Column(db.Date, nullable=False)
    assessment_time = db.Column(db.Time)
    assessment_location = db.Column(db.String(200))
    
    # معلومات الطالب وقت التقييم
    student_age_years = db.Column(db.Integer)
    student_age_months = db.Column(db.Integer)
    student_age_days = db.Column(db.Integer)
    
    # الحالة العامة للتقييم
    assessment_status = db.Column(db.String(50), default='in_progress')  # in_progress, completed, cancelled
    completion_percentage = db.Column(db.Float, default=0.0)
    
    # الدرجات الإجمالية
    full_scale_iq = db.Column(db.Integer)  # معامل الذكاء الكلي
    nonverbal_iq = db.Column(db.Integer)   # معامل الذكاء غير اللفظي
    verbal_iq = db.Column(db.Integer)      # معامل الذكاء اللفظي
    
    # المؤشرات الخمسة الرئيسية
    fluid_reasoning_index = db.Column(db.Integer)      # مؤشر الاستدلال السائل
    knowledge_index = db.Column(db.Integer)            # مؤشر المعرفة
    quantitative_reasoning_index = db.Column(db.Integer)  # مؤشر الاستدلال الكمي
    visual_spatial_index = db.Column(db.Integer)       # مؤشر البصري المكاني
    working_memory_index = db.Column(db.Integer)       # مؤشر الذاكرة العاملة
    
    # معلومات إضافية
    testing_conditions = db.Column(db.Text)  # ظروف التطبيق
    behavioral_observations = db.Column(db.Text)  # الملاحظات السلوكية
    rapport_quality = db.Column(db.String(50))  # جودة العلاقة مع المفحوص
    attention_level = db.Column(db.String(50))  # مستوى الانتباه
    motivation_level = db.Column(db.String(50))  # مستوى الدافعية
    
    # التوصيات والتفسير
    interpretation = db.Column(db.Text)  # تفسير النتائج
    recommendations = db.Column(db.Text)  # التوصيات
    follow_up_needed = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.Date)
    
    # معلومات النظام
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    student = db.relationship('Student', backref='stanford_binet_assessments')
    assessor = db.relationship('Teacher', backref='stanford_binet_assessments')
    subtest_results = db.relationship('StanfordBinetSubtestResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    item_responses = db.relationship('StanfordBinetItemResponse', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<StanfordBinetAssessment {self.student.name} - {self.assessment_date}>'

# نموذج الاختبارات الفرعية لمقياس بينيه
class StanfordBinetSubtest(db.Model):
    __tablename__ = 'stanford_binet_subtests'
    
    id = db.Column(db.Integer, primary_key=True)
    subtest_name_ar = db.Column(db.String(200), nullable=False)  # الاسم العربي
    subtest_name_en = db.Column(db.String(200), nullable=False)  # الاسم الإنجليزي
    subtest_code = db.Column(db.String(10), unique=True, nullable=False)  # رمز الاختبار
    
    # تصنيف الاختبار الفرعي
    domain = db.Column(db.String(100))  # المجال (Verbal/Nonverbal)
    factor = db.Column(db.String(100))  # العامل الرئيسي
    
    # معلومات الاختبار
    description = db.Column(db.Text)  # وصف الاختبار
    administration_time = db.Column(db.Integer)  # وقت التطبيق بالدقائق
    age_range_min = db.Column(db.Integer)  # الحد الأدنى للعمر بالشهور
    age_range_max = db.Column(db.Integer)  # الحد الأعلى للعمر بالشهور
    
    # معايير التطبيق
    starting_point_rules = db.Column(db.Text)  # قواعد نقطة البداية
    basal_rules = db.Column(db.Text)  # قواعد القاعدة
    ceiling_rules = db.Column(db.Text)  # قواعد السقف
    scoring_rules = db.Column(db.Text)  # قواعد التسجيل
    
    # معلومات إضافية
    materials_needed = db.Column(db.Text)  # المواد المطلوبة
    special_instructions = db.Column(db.Text)  # تعليمات خاصة
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    
    # العلاقات
    items = db.relationship('StanfordBinetItem', backref='subtest', lazy=True, order_by='StanfordBinetItem.item_number')
    results = db.relationship('StanfordBinetSubtestResult', backref='subtest', lazy=True)
    
    def __repr__(self):
        return f'<StanfordBinetSubtest {self.subtest_code} - {self.subtest_name_ar}>'

# نموذج عناصر الاختبارات الفرعية
class StanfordBinetItem(db.Model):
    __tablename__ = 'stanford_binet_items'
    
    id = db.Column(db.Integer, primary_key=True)
    subtest_id = db.Column(db.Integer, db.ForeignKey('stanford_binet_subtests.id'), nullable=False)
    
    # معلومات العنصر
    item_number = db.Column(db.Integer, nullable=False)
    item_content = db.Column(db.Text)  # محتوى العنصر
    item_instructions = db.Column(db.Text)  # تعليمات العنصر
    
    # معايير التسجيل
    correct_answer = db.Column(db.Text)  # الإجابة الصحيحة
    scoring_criteria = db.Column(db.Text)  # معايير التسجيل
    max_score = db.Column(db.Integer, default=1)  # الدرجة القصوى
    
    # معلومات إضافية
    difficulty_level = db.Column(db.String(50))  # مستوى الصعوبة
    time_limit = db.Column(db.Integer)  # الحد الزمني بالثواني
    materials_needed = db.Column(db.Text)  # المواد المطلوبة للعنصر
    
    # العلاقات
    responses = db.relationship('StanfordBinetItemResponse', backref='item', lazy=True)
    
    # فهرس مركب لضمان عدم تكرار رقم العنصر في نفس الاختبار الفرعي
    __table_args__ = (db.UniqueConstraint('subtest_id', 'item_number', name='unique_subtest_item'),)
    
    def __repr__(self):
        return f'<StanfordBinetItem {self.subtest.subtest_code}-{self.item_number}>'

# نموذج نتائج الاختبارات الفرعية
class StanfordBinetSubtestResult(db.Model):
    __tablename__ = 'stanford_binet_subtest_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('stanford_binet_assessments.id'), nullable=False)
    subtest_id = db.Column(db.Integer, db.ForeignKey('stanford_binet_subtests.id'), nullable=False)
    
    # نتائج الاختبار الفرعي
    raw_score = db.Column(db.Integer)  # الدرجة الخام
    scaled_score = db.Column(db.Integer)  # الدرجة المعيارية
    percentile_rank = db.Column(db.Integer)  # الرتبة المئوية
    age_equivalent = db.Column(db.String(20))  # المكافئ العمري
    
    # معلومات التطبيق
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    total_time_minutes = db.Column(db.Integer)
    
    # نقاط البداية والنهاية
    starting_item = db.Column(db.Integer)  # العنصر الذي بدأ منه
    basal_item = db.Column(db.Integer)  # عنصر القاعدة
    ceiling_item = db.Column(db.Integer)  # عنصر السقف
    last_item_administered = db.Column(db.Integer)  # آخر عنصر تم تطبيقه
    
    # ملاحظات
    administration_notes = db.Column(db.Text)  # ملاحظات التطبيق
    behavioral_observations = db.Column(db.Text)  # ملاحظات سلوكية
    validity_concerns = db.Column(db.Text)  # مخاوف الصدق
    
    # حالة الاختبار
    completion_status = db.Column(db.String(50), default='completed')  # completed, discontinued, invalid
    discontinuation_reason = db.Column(db.Text)  # سبب التوقف
    
    # فهرس مركب لضمان عدم تكرار نتيجة الاختبار الفرعي في نفس التقييم
    __table_args__ = (db.UniqueConstraint('assessment_id', 'subtest_id', name='unique_assessment_subtest'),)
    
    def __repr__(self):
        return f'<StanfordBinetSubtestResult {self.assessment.student.name} - {self.subtest.subtest_code}>'

# نموذج استجابات العناصر
class StanfordBinetItemResponse(db.Model):
    __tablename__ = 'stanford_binet_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('stanford_binet_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('stanford_binet_items.id'), nullable=False)
    
    # الاستجابة والتسجيل
    response_given = db.Column(db.Text)  # الاستجابة المعطاة
    score_awarded = db.Column(db.Integer)  # الدرجة الممنوحة
    is_correct = db.Column(db.Boolean)  # صحيح/خطأ
    
    # معلومات التطبيق
    response_time_seconds = db.Column(db.Integer)  # وقت الاستجابة
    administration_order = db.Column(db.Integer)  # ترتيب التطبيق
    
    # ملاحظات
    examiner_notes = db.Column(db.Text)  # ملاحظات الفاحص
    behavioral_notes = db.Column(db.Text)  # ملاحظات سلوكية
    
    # معلومات إضافية
    was_prompted = db.Column(db.Boolean, default=False)  # تم التلقين
    number_of_prompts = db.Column(db.Integer, default=0)  # عدد مرات التلقين
    self_corrected = db.Column(db.Boolean, default=False)  # صحح نفسه
    
    # فهرس مركب لضمان عدم تكرار استجابة العنصر في نفس التقييم
    __table_args__ = (db.UniqueConstraint('assessment_id', 'item_id', name='unique_assessment_item_response'),)
    
    def __repr__(self):
        return f'<StanfordBinetItemResponse {self.assessment.student.name} - Item {self.item.item_number}>'

# نموذج المعايير العمرية لمقياس بينيه
class StanfordBinetNorms(db.Model):
    __tablename__ = 'stanford_binet_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    subtest_id = db.Column(db.Integer, db.ForeignKey('stanford_binet_subtests.id'), nullable=False)
    
    # العمر
    age_years = db.Column(db.Integer, nullable=False)
    age_months = db.Column(db.Integer, nullable=False)
    
    # جداول التحويل
    raw_score = db.Column(db.Integer, nullable=False)
    scaled_score = db.Column(db.Integer)
    percentile_rank = db.Column(db.Integer)
    t_score = db.Column(db.Integer)
    z_score = db.Column(db.Float)
    
    # معلومات المعايير
    norm_sample_size = db.Column(db.Integer)  # حجم عينة التقنين
    standard_error = db.Column(db.Float)  # الخطأ المعياري
    confidence_interval_90 = db.Column(db.String(50))  # فترة الثقة 90%
    confidence_interval_95 = db.Column(db.String(50))  # فترة الثقة 95%
    
    # فهرس مركب لضمان عدم تكرار المعايير
    __table_args__ = (db.UniqueConstraint('subtest_id', 'age_years', 'age_months', 'raw_score', name='unique_norm_entry'),)
    
    def __repr__(self):
        return f'<StanfordBinetNorms {self.subtest.subtest_code} - Age {self.age_years}:{self.age_months}>'

# نموذج تقارير مقياس بينيه
class StanfordBinetReport(db.Model):
    __tablename__ = 'stanford_binet_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('stanford_binet_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(100), nullable=False)  # comprehensive, brief, parent_report
    report_title = db.Column(db.String(300))
    report_date = db.Column(db.Date, nullable=False)
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)  # الملخص التنفيذي
    background_information = db.Column(db.Text)  # معلومات خلفية
    test_results = db.Column(db.Text)  # نتائج الاختبار
    interpretation = db.Column(db.Text)  # التفسير
    recommendations = db.Column(db.Text)  # التوصيات
    
    # أقسام إضافية
    behavioral_observations = db.Column(db.Text)  # الملاحظات السلوكية
    test_validity = db.Column(db.Text)  # صدق الاختبار
    diagnostic_considerations = db.Column(db.Text)  # اعتبارات تشخيصية
    educational_implications = db.Column(db.Text)  # الآثار التعليمية
    
    # معلومات التقرير
    report_status = db.Column(db.String(50), default='draft')  # draft, final, reviewed
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # تواريخ مهمة
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    finalized_at = db.Column(db.DateTime)
    sent_to_parents_at = db.Column(db.DateTime)
    
    # العلاقات
    assessment = db.relationship('StanfordBinetAssessment', backref='reports')
    
    def __repr__(self):
        return f'<StanfordBinetReport {self.assessment.student.name} - {self.report_type} - {self.report_date}>'

# ========================== Wechsler Intelligence Scales Models ==========================

# نموذج تقييم مقاييس وكسلر للذكاء
class WechslerAssessment(db.Model):
    __tablename__ = 'wechsler_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    
    # نوع مقياس وكسلر
    scale_type = db.Column(db.String(50), nullable=False)  # WISC-V, WAIS-IV, WPPSI-IV
    scale_version = db.Column(db.String(20))  # الإصدار
    
    # معلومات التقييم الأساسية
    assessment_date = db.Column(db.Date, nullable=False)
    assessment_time = db.Column(db.Time)
    assessment_location = db.Column(db.String(200))
    
    # معلومات الطالب وقت التقييم
    student_age_years = db.Column(db.Integer)
    student_age_months = db.Column(db.Integer)
    student_age_days = db.Column(db.Integer)
    
    # الحالة العامة للتقييم
    assessment_status = db.Column(db.String(50), default='in_progress')  # in_progress, completed, cancelled
    completion_percentage = db.Column(db.Float, default=0.0)
    
    # معاملات الذكاء الرئيسية
    full_scale_iq = db.Column(db.Integer)  # معامل الذكاء الكلي FSIQ
    verbal_comprehension_index = db.Column(db.Integer)  # مؤشر الفهم اللفظي VCI
    perceptual_reasoning_index = db.Column(db.Integer)  # مؤشر الاستدلال الإدراكي PRI
    working_memory_index = db.Column(db.Integer)  # مؤشر الذاكرة العاملة WMI
    processing_speed_index = db.Column(db.Integer)  # مؤشر سرعة المعالجة PSI
    
    # مؤشرات إضافية (حسب النوع)
    fluid_reasoning_index = db.Column(db.Integer)  # مؤشر الاستدلال السائل FRI
    visual_spatial_index = db.Column(db.Integer)  # مؤشر البصري المكاني VSI
    quantitative_reasoning_index = db.Column(db.Integer)  # مؤشر الاستدلال الكمي QRI
    auditory_working_memory_index = db.Column(db.Integer)  # مؤشر الذاكرة العاملة السمعية AWMI
    nonverbal_index = db.Column(db.Integer)  # المؤشر غير اللفظي NVI
    general_ability_index = db.Column(db.Integer)  # مؤشر القدرة العامة GAI
    cognitive_proficiency_index = db.Column(db.Integer)  # مؤشر الكفاءة المعرفية CPI
    
    # معلومات إضافية
    testing_conditions = db.Column(db.Text)  # ظروف التطبيق
    behavioral_observations = db.Column(db.Text)  # الملاحظات السلوكية
    rapport_quality = db.Column(db.String(50))  # جودة العلاقة مع المفحوص
    attention_level = db.Column(db.String(50))  # مستوى الانتباه
    motivation_level = db.Column(db.String(50))  # مستوى الدافعية
    language_used = db.Column(db.String(50), default='arabic')  # لغة التطبيق
    
    # التوصيات والتفسير
    interpretation = db.Column(db.Text)  # تفسير النتائج
    recommendations = db.Column(db.Text)  # التوصيات
    follow_up_needed = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.Date)
    
    # معلومات النظام
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    student = db.relationship('Student', backref='wechsler_assessments')
    assessor = db.relationship('Teacher', backref='wechsler_assessments')
    subtest_results = db.relationship('WechslerSubtestResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
    item_responses = db.relationship('WechslerItemResponse', backref='assessment', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<WechslerAssessment {self.student.name} - {self.scale_type} - {self.assessment_date}>'

# نموذج الاختبارات الفرعية لمقاييس وكسلر
class WechslerSubtest(db.Model):
    __tablename__ = 'wechsler_subtests'
    
    id = db.Column(db.Integer, primary_key=True)
    subtest_name_ar = db.Column(db.String(200), nullable=False)  # الاسم العربي
    subtest_name_en = db.Column(db.String(200), nullable=False)  # الاسم الإنجليزي
    subtest_code = db.Column(db.String(10), unique=True, nullable=False)  # رمز الاختبار
    
    # نوع المقياس والإصدار
    scale_type = db.Column(db.String(50), nullable=False)  # WISC-V, WAIS-IV, WPPSI-IV
    scale_version = db.Column(db.String(20))
    
    # تصنيف الاختبار الفرعي
    domain = db.Column(db.String(100))  # المجال الرئيسي
    index_type = db.Column(db.String(100))  # نوع المؤشر (VCI, PRI, WMI, PSI, etc.)
    subtest_type = db.Column(db.String(50))  # core, supplemental, optional
    
    # معلومات الاختبار
    description = db.Column(db.Text)  # وصف الاختبار
    administration_time = db.Column(db.Integer)  # وقت التطبيق بالدقائق
    age_range_min = db.Column(db.Integer)  # الحد الأدنى للعمر بالشهور
    age_range_max = db.Column(db.Integer)  # الحد الأعلى للعمر بالشهور
    
    # معايير التطبيق
    starting_point_rules = db.Column(db.Text)  # قواعد نقطة البداية
    discontinue_rules = db.Column(db.Text)  # قواعد التوقف
    reverse_rules = db.Column(db.Text)  # قواعد الرجوع للخلف
    scoring_rules = db.Column(db.Text)  # قواعد التسجيل
    
    # معلومات إضافية
    materials_needed = db.Column(db.Text)  # المواد المطلوبة
    special_instructions = db.Column(db.Text)  # تعليمات خاصة
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    
    # العلاقات
    items = db.relationship('WechslerItem', backref='subtest', lazy=True, order_by='WechslerItem.item_number')
    results = db.relationship('WechslerSubtestResult', backref='subtest', lazy=True)
    norms = db.relationship('WechslerNorms', backref='subtest', lazy=True)
    
    def __repr__(self):
        return f'<WechslerSubtest {self.subtest_code} - {self.subtest_name_ar}>'

# نموذج عناصر الاختبارات الفرعية لوكسلر
class WechslerItem(db.Model):
    __tablename__ = 'wechsler_items'
    
    id = db.Column(db.Integer, primary_key=True)
    subtest_id = db.Column(db.Integer, db.ForeignKey('wechsler_subtests.id'), nullable=False)
    
    # معلومات العنصر
    item_number = db.Column(db.Integer, nullable=False)
    item_content = db.Column(db.Text)  # محتوى العنصر
    item_instructions = db.Column(db.Text)  # تعليمات العنصر
    
    # معايير التسجيل
    correct_answer = db.Column(db.Text)  # الإجابة الصحيحة
    scoring_criteria = db.Column(db.Text)  # معايير التسجيل
    max_score = db.Column(db.Integer, default=1)  # الدرجة القصوى
    
    # معلومات إضافية
    difficulty_level = db.Column(db.String(50))  # مستوى الصعوبة
    time_limit = db.Column(db.Integer)  # الحد الزمني بالثواني
    materials_needed = db.Column(db.Text)  # المواد المطلوبة للعنصر
    sample_item = db.Column(db.Boolean, default=False)  # عنصر تدريبي
    
    # العلاقات
    responses = db.relationship('WechslerItemResponse', backref='item', lazy=True)
    
    # فهرس مركب لضمان عدم تكرار رقم العنصر في نفس الاختبار الفرعي
    __table_args__ = (db.UniqueConstraint('subtest_id', 'item_number', name='unique_wechsler_subtest_item'),)
    
    def __repr__(self):
        return f'<WechslerItem {self.subtest.subtest_code}-{self.item_number}>'

# نموذج نتائج الاختبارات الفرعية لوكسلر
class WechslerSubtestResult(db.Model):
    __tablename__ = 'wechsler_subtest_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('wechsler_assessments.id'), nullable=False)
    subtest_id = db.Column(db.Integer, db.ForeignKey('wechsler_subtests.id'), nullable=False)
    
    # نتائج الاختبار الفرعي
    raw_score = db.Column(db.Integer)  # الدرجة الخام
    scaled_score = db.Column(db.Integer)  # الدرجة المعيارية (1-19)
    percentile_rank = db.Column(db.Integer)  # الرتبة المئوية
    age_equivalent = db.Column(db.String(20))  # المكافئ العمري
    
    # معلومات التطبيق
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    total_time_minutes = db.Column(db.Integer)
    
    # نقاط البداية والنهاية
    starting_item = db.Column(db.Integer)  # العنصر الذي بدأ منه
    last_item_administered = db.Column(db.Integer)  # آخر عنصر تم تطبيقه
    discontinue_item = db.Column(db.Integer)  # عنصر التوقف
    reverse_administered = db.Column(db.Boolean, default=False)  # تم الرجوع للخلف
    
    # ملاحظات
    administration_notes = db.Column(db.Text)  # ملاحظات التطبيق
    behavioral_observations = db.Column(db.Text)  # ملاحظات سلوكية
    validity_concerns = db.Column(db.Text)  # مخاوف الصدق
    
    # حالة الاختبار
    completion_status = db.Column(db.String(50), default='completed')  # completed, discontinued, invalid
    discontinuation_reason = db.Column(db.Text)  # سبب التوقف
    
    # فهرس مركب لضمان عدم تكرار نتيجة الاختبار الفرعي في نفس التقييم
    __table_args__ = (db.UniqueConstraint('assessment_id', 'subtest_id', name='unique_wechsler_assessment_subtest'),)
    
    def __repr__(self):
        return f'<WechslerSubtestResult {self.assessment.student.name} - {self.subtest.subtest_code}>'

# نموذج استجابات العناصر لوكسلر
class WechslerItemResponse(db.Model):
    __tablename__ = 'wechsler_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('wechsler_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('wechsler_items.id'), nullable=False)
    
    # الاستجابة والتسجيل
    response_given = db.Column(db.Text)  # الاستجابة المعطاة
    score_awarded = db.Column(db.Integer)  # الدرجة الممنوحة
    is_correct = db.Column(db.Boolean)  # صحيح/خطأ
    
    # معلومات التطبيق
    response_time_seconds = db.Column(db.Integer)  # وقت الاستجابة
    administration_order = db.Column(db.Integer)  # ترتيب التطبيق
    
    # ملاحظات
    examiner_notes = db.Column(db.Text)  # ملاحظات الفاحص
    behavioral_notes = db.Column(db.Text)  # ملاحظات سلوكية
    
    # معلومات إضافية
    was_queried = db.Column(db.Boolean, default=False)  # تم الاستفسار
    number_of_queries = db.Column(db.Integer, default=0)  # عدد مرات الاستفسار
    self_corrected = db.Column(db.Boolean, default=False)  # صحح نفسه
    no_response = db.Column(db.Boolean, default=False)  # لم يجب
    
    # فهرس مركب لضمان عدم تكرار استجابة العنصر في نفس التقييم
    __table_args__ = (db.UniqueConstraint('assessment_id', 'item_id', name='unique_wechsler_assessment_item_response'),)
    
    def __repr__(self):
        return f'<WechslerItemResponse {self.assessment.student.name} - Item {self.item.item_number}>'

# نموذج المعايير العمرية لمقاييس وكسلر
class WechslerNorms(db.Model):
    __tablename__ = 'wechsler_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    subtest_id = db.Column(db.Integer, db.ForeignKey('wechsler_subtests.id'), nullable=False)
    
    # العمر
    age_years = db.Column(db.Integer, nullable=False)
    age_months = db.Column(db.Integer, nullable=False)
    
    # جداول التحويل
    raw_score = db.Column(db.Integer, nullable=False)
    scaled_score = db.Column(db.Integer)  # 1-19
    percentile_rank = db.Column(db.Integer)  # 1-99
    t_score = db.Column(db.Integer)  # T-Score
    z_score = db.Column(db.Float)  # Z-Score
    
    # معلومات المعايير
    norm_sample_size = db.Column(db.Integer)  # حجم عينة التقنين
    standard_error = db.Column(db.Float)  # الخطأ المعياري
    confidence_interval_90 = db.Column(db.String(50))  # فترة الثقة 90%
    confidence_interval_95 = db.Column(db.String(50))  # فترة الثقة 95%
    
    # معلومات إضافية
    norm_group = db.Column(db.String(100))  # مجموعة التقنين
    country = db.Column(db.String(50), default='Saudi Arabia')  # البلد
    
    # فهرس مركب لضمان عدم تكرار المعايير
    __table_args__ = (db.UniqueConstraint('subtest_id', 'age_years', 'age_months', 'raw_score', name='unique_wechsler_norm_entry'),)
    
    def __repr__(self):
        return f'<WechslerNorms {self.subtest.subtest_code} - Age {self.age_years}:{self.age_months}>'

# نموذج تقارير مقاييس وكسلر
class WechslerReport(db.Model):
    __tablename__ = 'wechsler_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('wechsler_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(100), nullable=False)  # comprehensive, brief, parent_report, school_report
    report_title = db.Column(db.String(300))
    report_date = db.Column(db.Date, nullable=False)
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)  # الملخص التنفيذي
    background_information = db.Column(db.Text)  # معلومات خلفية
    test_results = db.Column(db.Text)  # نتائج الاختبار
    interpretation = db.Column(db.Text)  # التفسير
    recommendations = db.Column(db.Text)  # التوصيات
    
    # أقسام إضافية
    behavioral_observations = db.Column(db.Text)  # الملاحظات السلوكية
    test_validity = db.Column(db.Text)  # صدق الاختبار
    diagnostic_considerations = db.Column(db.Text)  # اعتبارات تشخيصية
    educational_implications = db.Column(db.Text)  # الآثار التعليمية
    strengths_weaknesses = db.Column(db.Text)  # نقاط القوة والضعف
    
    # معلومات التقرير
    report_status = db.Column(db.String(50), default='draft')  # draft, final, reviewed
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # تواريخ مهمة
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    finalized_at = db.Column(db.DateTime)
    sent_to_parents_at = db.Column(db.DateTime)
    
    # العلاقات
    assessment = db.relationship('WechslerAssessment', backref='reports')
    
    def __repr__(self):
        return f'<WechslerReport {self.assessment.student.name} - {self.report_type} - {self.report_date}>'


# ============================================================================
# BECK DEPRESSION INVENTORY (BDI-II) - مقياس بيك للاكتئاب الصورة الثانية
# ============================================================================

class BeckDepressionAssessment(db.Model):
    """تقييم مقياس بيك للاكتئاب"""
    __tablename__ = 'beck_depression_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات أساسية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # معلومات التقييم
    assessment_type = db.Column(db.String(50), default='BDI-II')  # BDI-II, BDI-Y للشباب
    administration_method = db.Column(db.String(50))  # فردي، جماعي، إلكتروني
    assessment_duration = db.Column(db.Integer)  # بالدقائق
    
    # المعلومات الديموغرافية
    age_at_assessment = db.Column(db.Float)
    gender = db.Column(db.String(10))
    education_level = db.Column(db.String(50))
    
    # الحالة الإكلينيكية
    current_medications = db.Column(db.Text)  # الأدوية الحالية
    psychiatric_history = db.Column(db.Text)  # التاريخ النفسي
    family_history = db.Column(db.Text)  # التاريخ العائلي
    recent_life_events = db.Column(db.Text)  # الأحداث الحياتية الأخيرة
    
    # نتائج التقييم
    total_score = db.Column(db.Integer)  # الدرجة الإجمالية (0-63)
    severity_level = db.Column(db.String(50))  # مستوى الشدة
    percentile_rank = db.Column(db.Float)  # الرتبة المئوية
    
    # التفسير الإكلينيكي
    clinical_interpretation = db.Column(db.Text)
    risk_assessment = db.Column(db.Text)  # تقييم المخاطر
    suicide_risk_level = db.Column(db.String(20))  # مستوى خطر الانتحار
    
    # التوصيات
    recommendations = db.Column(db.Text)
    referral_needed = db.Column(db.Boolean, default=False)
    referral_type = db.Column(db.String(100))  # نوع الإحالة
    
    # معلومات إضافية
    notes = db.Column(db.Text)
    validity_indicators = db.Column(db.Text)  # مؤشرات صحة الاستجابة
    
    # حالة التقييم
    status = db.Column(db.String(20), default='draft')  # draft, completed, reviewed
    completed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # العلاقات
    student = db.relationship('Student', backref='beck_assessments')
    assessor = db.relationship('User', foreign_keys=[assessor_id], backref='beck_assessments_conducted')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='beck_assessments_reviewed')
    
    def __repr__(self):
        return f'<BeckDepressionAssessment {self.student.name} - {self.assessment_date}>'


class BeckDepressionItem(db.Model):
    """بنود مقياس بيك للاكتئاب"""
    __tablename__ = 'beck_depression_items'
    
    id = db.Column(db.Integer, primary_key=True)
    item_number = db.Column(db.Integer, nullable=False)  # رقم البند (1-21)
    domain = db.Column(db.String(50))  # المجال (cognitive, affective, somatic, vegetative)
    
    # النص العربي للبند
    item_text_ar = db.Column(db.Text, nullable=False)
    
    # خيارات الإجابة (0-3)
    option_0_ar = db.Column(db.Text)  # لا يوجد
    option_1_ar = db.Column(db.Text)  # بسيط
    option_2_ar = db.Column(db.Text)  # متوسط
    option_3_ar = db.Column(db.Text)  # شديد
    
    # النص الإنجليزي (مرجعي)
    item_text_en = db.Column(db.Text)
    option_0_en = db.Column(db.Text)
    option_1_en = db.Column(db.Text)
    option_2_en = db.Column(db.Text)
    option_3_en = db.Column(db.Text)
    
    # معلومات إضافية
    is_reverse_scored = db.Column(db.Boolean, default=False)
    clinical_significance = db.Column(db.Text)  # الأهمية الإكلينيكية
    
    def __repr__(self):
        return f'<BeckDepressionItem {self.item_number}: {self.domain}>'


class BeckDepressionResponse(db.Model):
    """استجابات مقياس بيك للاكتئاب"""
    __tablename__ = 'beck_depression_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('beck_depression_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('beck_depression_items.id'), nullable=False)
    
    # الاستجابة
    response_value = db.Column(db.Integer)  # 0-3
    response_time = db.Column(db.Float)  # وقت الاستجابة بالثواني
    
    # معلومات إضافية
    hesitation_noted = db.Column(db.Boolean, default=False)  # تردد ملحوظ
    clarification_needed = db.Column(db.Boolean, default=False)  # احتاج توضيح
    notes = db.Column(db.Text)
    
    # العلاقات
    assessment = db.relationship('BeckDepressionAssessment', backref='responses')
    item = db.relationship('BeckDepressionItem', backref='responses')
    
    # فهرس مركب لضمان عدم تكرار الاستجابة
    __table_args__ = (db.UniqueConstraint('assessment_id', 'item_id', name='unique_beck_response'),)
    
    def __repr__(self):
        return f'<BeckDepressionResponse Assessment:{self.assessment_id} Item:{self.item.item_number} = {self.response_value}>'


class BeckDepressionDomain(db.Model):
    """مجالات مقياس بيك للاكتئاب"""
    __tablename__ = 'beck_depression_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_name = db.Column(db.String(50), unique=True, nullable=False)
    domain_name_ar = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    # البنود المرتبطة بالمجال
    item_numbers = db.Column(db.Text)  # قائمة أرقام البنود مفصولة بفواصل
    
    def __repr__(self):
        return f'<BeckDepressionDomain {self.domain_name_ar}>'


class BeckDepressionScore(db.Model):
    """درجات مقياس بيك للاكتئاب"""
    __tablename__ = 'beck_depression_scores'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('beck_depression_assessments.id'), nullable=False)
    
    # الدرجات الفرعية
    cognitive_score = db.Column(db.Integer)  # الدرجة المعرفية
    affective_score = db.Column(db.Integer)  # الدرجة الوجدانية
    somatic_score = db.Column(db.Integer)  # الدرجة الجسدية
    vegetative_score = db.Column(db.Integer)  # الدرجة النباتية
    
    # الدرجة الإجمالية
    total_raw_score = db.Column(db.Integer)  # الدرجة الخام الإجمالية
    
    # التفسير
    severity_category = db.Column(db.String(50))  # فئة الشدة
    clinical_cutoff_met = db.Column(db.Boolean)  # تم تجاوز النقطة الفاصلة الإكلينيكية
    
    # مؤشرات خاصة
    suicide_ideation_score = db.Column(db.Integer)  # درجة التفكير الانتحاري (البند 9)
    hopelessness_score = db.Column(db.Integer)  # درجة اليأس
    worthlessness_score = db.Column(db.Integer)  # درجة انعدام القيمة
    
    # العلاقات
    assessment = db.relationship('BeckDepressionAssessment', backref='scores', uselist=False)
    
    def __repr__(self):
        return f'<BeckDepressionScore Assessment:{self.assessment_id} Total:{self.total_raw_score}>'


class BeckDepressionNorms(db.Model):
    """المعايير المرجعية لمقياس بيك للاكتئاب"""
    __tablename__ = 'beck_depression_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # المعلومات الديموغرافية
    age_group = db.Column(db.String(20))  # 13-17, 18-25, 26-35, etc.
    gender = db.Column(db.String(10))  # ذكر، أنثى
    population_type = db.Column(db.String(50))  # عام، إكلينيكي، طلاب
    
    # المعايير الإحصائية
    mean_score = db.Column(db.Float)  # المتوسط
    standard_deviation = db.Column(db.Float)  # الانحراف المعياري
    median_score = db.Column(db.Float)  # الوسيط
    
    # النقاط الفاصلة
    minimal_cutoff = db.Column(db.Integer, default=13)  # 0-13 بسيط
    mild_cutoff = db.Column(db.Integer, default=19)  # 14-19 خفيف
    moderate_cutoff = db.Column(db.Integer, default=28)  # 20-28 متوسط
    severe_cutoff = db.Column(db.Integer, default=63)  # 29-63 شديد
    
    # معلومات العينة
    sample_size = db.Column(db.Integer)
    sample_description = db.Column(db.Text)
    study_reference = db.Column(db.Text)
    
    # معلومات إضافية
    reliability_alpha = db.Column(db.Float)  # معامل الثبات
    validity_info = db.Column(db.Text)  # معلومات الصدق
    
    def __repr__(self):
        return f'<BeckDepressionNorms {self.age_group} {self.gender} - {self.population_type}>'


class BeckDepressionReport(db.Model):
    """تقارير مقياس بيك للاكتئاب"""
    __tablename__ = 'beck_depression_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('beck_depression_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50))  # comprehensive, brief, screening
    report_date = db.Column(db.DateTime, default=datetime.utcnow)
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)  # الملخص التنفيذي
    detailed_results = db.Column(db.Text)  # النتائج التفصيلية
    clinical_interpretation = db.Column(db.Text)  # التفسير الإكلينيكي
    recommendations = db.Column(db.Text)  # التوصيات
    
    # الرسوم البيانية والجداول
    score_profile_data = db.Column(db.Text)  # بيانات الملف الشخصي للدرجات
    comparison_data = db.Column(db.Text)  # بيانات المقارنة
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_at = db.Column(db.DateTime)
    
    # الإرسال والمشاركة
    sent_to_referrer = db.Column(db.Boolean, default=False)
    sent_to_referrer_at = db.Column(db.DateTime)
    sent_to_parents = db.Column(db.Boolean, default=False)
    sent_to_parents_at = db.Column(db.DateTime)
    
    # العلاقات
    assessment = db.relationship('BeckDepressionAssessment', backref='reports')
    generator = db.relationship('User', foreign_keys=[generated_by], backref='beck_reports_generated')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='beck_reports_approved')
    
    def __repr__(self):
        return f'<BeckDepressionReport {self.assessment.student.name} - {self.report_type} - {self.report_date}>'


# ============================================================================
# REVISED CHILDREN'S MANIFEST ANXIETY SCALE (RCMAS-2) - مقياس القلق للأطفال
# ============================================================================

class RCMASAssessment(db.Model):
    """تقييم مقياس القلق للأطفال المنقح"""
    __tablename__ = 'rcmas_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات أساسية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # معلومات التقييم
    assessment_type = db.Column(db.String(50), default='RCMAS-2')  # RCMAS-2, RCMAS-2-SR
    administration_method = db.Column(db.String(50))  # فردي، جماعي، إلكتروني
    assessment_duration = db.Column(db.Integer)  # بالدقائق
    
    # المعلومات الديموغرافية
    age_at_assessment = db.Column(db.Float)
    gender = db.Column(db.String(10))
    grade_level = db.Column(db.String(20))
    
    # السياق الإكلينيكي
    referral_reason = db.Column(db.Text)  # سبب الإحالة
    anxiety_triggers = db.Column(db.Text)  # مثيرات القلق
    family_history_anxiety = db.Column(db.Boolean)  # تاريخ عائلي للقلق
    current_stressors = db.Column(db.Text)  # الضغوط الحالية
    
    # نتائج التقييم
    total_anxiety_score = db.Column(db.Integer)  # الدرجة الإجمالية للقلق
    lie_scale_score = db.Column(db.Integer)  # درجة مقياس الكذب
    t_score = db.Column(db.Integer)  # T-Score
    percentile_rank = db.Column(db.Float)  # الرتبة المئوية
    
    # التفسير الإكلينيكي
    anxiety_level = db.Column(db.String(50))  # مستوى القلق
    clinical_interpretation = db.Column(db.Text)
    validity_status = db.Column(db.String(50))  # صحة الاستجابة
    
    # التوصيات
    recommendations = db.Column(db.Text)
    intervention_needed = db.Column(db.Boolean, default=False)
    referral_needed = db.Column(db.Boolean, default=False)
    referral_type = db.Column(db.String(100))
    
    # معلومات إضافية
    notes = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)  # ملاحظات سلوكية
    
    # حالة التقييم
    status = db.Column(db.String(20), default='draft')
    completed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # العلاقات
    student = db.relationship('Student', backref='rcmas_assessments')
    assessor = db.relationship('User', foreign_keys=[assessor_id], backref='rcmas_assessments_conducted')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='rcmas_assessments_reviewed')
    
    def __repr__(self):
        return f'<RCMASAssessment {self.student.name} - {self.assessment_date}>'


class RCMASItem(db.Model):
    """بنود مقياس القلق للأطفال"""
    __tablename__ = 'rcmas_items'
    
    id = db.Column(db.Integer, primary_key=True)
    item_number = db.Column(db.Integer, nullable=False)  # رقم البند (1-49)
    scale_type = db.Column(db.String(20))  # anxiety, lie
    anxiety_domain = db.Column(db.String(50))  # physiological, worry, social, defensiveness
    
    # النص العربي
    item_text_ar = db.Column(db.Text, nullable=False)
    
    # النص الإنجليزي (مرجعي)
    item_text_en = db.Column(db.Text)
    
    # معلومات التسجيل
    is_reverse_scored = db.Column(db.Boolean, default=False)
    scoring_key = db.Column(db.String(10))  # 'yes', 'no' للإجابة الصحيحة
    
    # معلومات إضافية
    clinical_significance = db.Column(db.Text)
    developmental_considerations = db.Column(db.Text)
    
    def __repr__(self):
        return f'<RCMASItem {self.item_number}: {self.scale_type}>'


class RCMASResponse(db.Model):
    """استجابات مقياس القلق للأطفال"""
    __tablename__ = 'rcmas_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('rcmas_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('rcmas_items.id'), nullable=False)
    
    # الاستجابة
    response_value = db.Column(db.String(10))  # 'yes', 'no'
    response_score = db.Column(db.Integer)  # 0 أو 1
    response_time = db.Column(db.Float)  # وقت الاستجابة
    
    # معلومات إضافية
    hesitation_noted = db.Column(db.Boolean, default=False)
    clarification_needed = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text)
    
    # العلاقات
    assessment = db.relationship('RCMASAssessment', backref='responses')
    item = db.relationship('RCMASItem', backref='responses')
    
    # فهرس مركب
    __table_args__ = (db.UniqueConstraint('assessment_id', 'item_id', name='unique_rcmas_response'),)
    
    def __repr__(self):
        return f'<RCMASResponse Assessment:{self.assessment_id} Item:{self.item.item_number} = {self.response_value}>'


class RCMASScore(db.Model):
    """درجات مقياس القلق للأطفال"""
    __tablename__ = 'rcmas_scores'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('rcmas_assessments.id'), nullable=False)
    
    # الدرجات الفرعية
    physiological_anxiety = db.Column(db.Integer)  # القلق الفسيولوجي
    worry_oversensitivity = db.Column(db.Integer)  # القلق والحساسية المفرطة
    social_concerns = db.Column(db.Integer)  # المخاوف الاجتماعية
    defensiveness = db.Column(db.Integer)  # الدفاعية
    
    # الدرجة الإجمالية
    total_anxiety_raw = db.Column(db.Integer)  # الدرجة الخام للقلق
    lie_scale_raw = db.Column(db.Integer)  # الدرجة الخام لمقياس الكذب
    
    # الدرجات المعيارية
    total_anxiety_t_score = db.Column(db.Integer)  # T-Score للقلق الإجمالي
    total_anxiety_percentile = db.Column(db.Float)  # الرتبة المئوية
    
    # التفسير
    anxiety_level = db.Column(db.String(50))  # مستوى القلق
    clinical_significance = db.Column(db.Boolean)  # الدلالة الإكلينيكية
    validity_status = db.Column(db.String(50))  # حالة الصحة
    
    # العلاقات
    assessment = db.relationship('RCMASAssessment', backref='scores', uselist=False)
    
    def __repr__(self):
        return f'<RCMASScore Assessment:{self.assessment_id} Total:{self.total_anxiety_raw}>'


class RCMASNorms(db.Model):
    """المعايير المرجعية لمقياس القلق للأطفال"""
    __tablename__ = 'rcmas_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # المعلومات الديموغرافية
    age_group = db.Column(db.String(20))  # 6-8, 9-11, 12-14, 15-19
    gender = db.Column(db.String(10))
    grade_level = db.Column(db.String(20))
    
    # المعايير الإحصائية للقلق الإجمالي
    anxiety_mean = db.Column(db.Float)
    anxiety_sd = db.Column(db.Float)
    anxiety_median = db.Column(db.Float)
    
    # المعايير الإحصائية لمقياس الكذب
    lie_mean = db.Column(db.Float)
    lie_sd = db.Column(db.Float)
    lie_median = db.Column(db.Float)
    
    # النقاط الفاصلة
    anxiety_t65_raw = db.Column(db.Integer)  # النقطة الفاصلة T=65
    anxiety_t70_raw = db.Column(db.Integer)  # النقطة الفاصلة T=70
    lie_cutoff = db.Column(db.Integer)  # نقطة فاصلة مقياس الكذب
    
    # معلومات العينة
    sample_size = db.Column(db.Integer)
    sample_description = db.Column(db.Text)
    reliability_coefficient = db.Column(db.Float)
    
    def __repr__(self):
        return f'<RCMASNorms {self.age_group} {self.gender}>'


class RCMASReport(db.Model):
    """تقارير مقياس القلق للأطفال"""
    __tablename__ = 'rcmas_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('rcmas_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50))  # comprehensive, brief, screening
    report_date = db.Column(db.DateTime, default=datetime.utcnow)
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)
    detailed_results = db.Column(db.Text)
    clinical_interpretation = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    
    # الرسوم البيانية
    anxiety_profile_data = db.Column(db.Text)
    comparison_data = db.Column(db.Text)
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_at = db.Column(db.DateTime)
    
    # الإرسال والمشاركة
    sent_to_referrer = db.Column(db.Boolean, default=False)
    sent_to_referrer_at = db.Column(db.DateTime)
    sent_to_parents = db.Column(db.Boolean, default=False)
    sent_to_parents_at = db.Column(db.DateTime)
    
    # العلاقات
    assessment = db.relationship('RCMASAssessment', backref='reports')
    generator = db.relationship('User', foreign_keys=[generated_by], backref='rcmas_reports_generated')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='rcmas_reports_approved')
    
    def __repr__(self):
        return f'<RCMASReport {self.assessment.student.name} - {self.report_type} - {self.report_date}>'


# ============================================================================
# ADAPTIVE BEHAVIOR ASSESSMENT SYSTEM (ABAS-3) - مقياس السلوك التكيفي
# ============================================================================

class ABASAssessment(db.Model):
    """تقييم مقياس السلوك التكيفي الطبعة الثالثة"""
    __tablename__ = 'abas_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات أساسية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # معلومات التقييم
    form_type = db.Column(db.String(50))  # Parent/Primary Caregiver, Teacher/Daycare Provider, Adult
    age_group = db.Column(db.String(20))  # 0-5, 5-21, Adult
    administration_method = db.Column(db.String(50))  # مقابلة، استبيان، ملاحظة
    
    # المعلومات الديموغرافية
    age_at_assessment = db.Column(db.Float)
    gender = db.Column(db.String(10))
    grade_level = db.Column(db.String(20))
    primary_language = db.Column(db.String(50))
    
    # السياق التقييمي
    referral_reason = db.Column(db.Text)
    developmental_concerns = db.Column(db.Text)
    current_services = db.Column(db.Text)  # الخدمات الحالية
    living_situation = db.Column(db.String(100))  # الوضع المعيشي
    
    # نتائج التقييم - المؤشرات العامة
    general_adaptive_composite = db.Column(db.Integer)  # المؤشر التكيفي العام
    conceptual_domain_score = db.Column(db.Integer)  # المجال المفاهيمي
    social_domain_score = db.Column(db.Integer)  # المجال الاجتماعي
    practical_domain_score = db.Column(db.Integer)  # المجال العملي
    
    # التفسير الإكلينيكي
    adaptive_level = db.Column(db.String(50))  # مستوى السلوك التكيفي
    strengths_areas = db.Column(db.Text)  # مجالات القوة
    deficit_areas = db.Column(db.Text)  # مجالات الضعف
    clinical_interpretation = db.Column(db.Text)
    
    # التوصيات
    recommendations = db.Column(db.Text)
    intervention_priorities = db.Column(db.Text)  # أولويات التدخل
    support_needs = db.Column(db.Text)  # احتياجات الدعم
    
    # معلومات إضافية
    notes = db.Column(db.Text)
    environmental_factors = db.Column(db.Text)  # العوامل البيئية
    
    # حالة التقييم
    status = db.Column(db.String(20), default='draft')
    completed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # العلاقات
    student = db.relationship('Student', backref='abas_assessments')
    assessor = db.relationship('User', foreign_keys=[assessor_id], backref='abas_assessments_conducted')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='abas_assessments_reviewed')
    
    def __repr__(self):
        return f'<ABASAssessment {self.student.name} - {self.assessment_date}>'


class ABASSkillArea(db.Model):
    """مجالات المهارات في مقياس السلوك التكيفي"""
    __tablename__ = 'abas_skill_areas'
    
    id = db.Column(db.Integer, primary_key=True)
    skill_area_code = db.Column(db.String(10), unique=True, nullable=False)  # COM, CU, FA, etc.
    skill_area_name_ar = db.Column(db.String(100), nullable=False)
    skill_area_name_en = db.Column(db.String(100))
    
    # تصنيف المجال
    domain = db.Column(db.String(50))  # conceptual, social, practical
    age_range = db.Column(db.String(20))  # 0-5, 5-21, Adult
    
    # وصف المجال
    description = db.Column(db.Text)
    examples = db.Column(db.Text)  # أمثلة على المهارات
    
    def __repr__(self):
        return f'<ABASSkillArea {self.skill_area_code}: {self.skill_area_name_ar}>'


class ABASItem(db.Model):
    """بنود مقياس السلوك التكيفي"""
    __tablename__ = 'abas_items'
    
    id = db.Column(db.Integer, primary_key=True)
    item_number = db.Column(db.Integer, nullable=False)
    skill_area_id = db.Column(db.Integer, db.ForeignKey('abas_skill_areas.id'), nullable=False)
    
    # النص العربي
    item_text_ar = db.Column(db.Text, nullable=False)
    
    # النص الإنجليزي (مرجعي)
    item_text_en = db.Column(db.Text)
    
    # معلومات التسجيل
    age_range = db.Column(db.String(20))  # النطاق العمري للبند
    difficulty_level = db.Column(db.String(20))  # easy, moderate, difficult
    
    # معلومات إضافية
    behavioral_examples = db.Column(db.Text)  # أمثلة سلوكية
    scoring_criteria = db.Column(db.Text)  # معايير التسجيل
    
    # العلاقات
    skill_area = db.relationship('ABASSkillArea', backref='items')
    
    def __repr__(self):
        return f'<ABASItem {self.item_number}: {self.skill_area.skill_area_code}>'


class ABASResponse(db.Model):
    """استجابات مقياس السلوك التكيفي"""
    __tablename__ = 'abas_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('abas_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('abas_items.id'), nullable=False)
    
    # الاستجابة
    response_value = db.Column(db.Integer)  # 0=لا يؤدي، 1=لا أعرف، 2=أحياناً، 3=دائماً
    response_label = db.Column(db.String(20))  # تسمية الاستجابة
    
    # معلومات إضافية
    observation_context = db.Column(db.Text)  # سياق الملاحظة
    frequency_notes = db.Column(db.Text)  # ملاحظات التكرار
    support_needed = db.Column(db.String(50))  # مستوى الدعم المطلوب
    notes = db.Column(db.Text)
    
    # العلاقات
    assessment = db.relationship('ABASAssessment', backref='responses')
    item = db.relationship('ABASItem', backref='responses')
    
    # فهرس مركب
    __table_args__ = (db.UniqueConstraint('assessment_id', 'item_id', name='unique_abas_response'),)
    
    def __repr__(self):
        return f'<ABASResponse Assessment:{self.assessment_id} Item:{self.item.item_number} = {self.response_value}>'


class ABASScore(db.Model):
    """درجات مقياس السلوك التكيفي"""
    __tablename__ = 'abas_scores'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('abas_assessments.id'), nullable=False)
    
    # درجات مجالات المهارات الخام
    communication_raw = db.Column(db.Integer)  # التواصل
    community_use_raw = db.Column(db.Integer)  # استخدام المجتمع
    functional_academics_raw = db.Column(db.Integer)  # الأكاديميات الوظيفية
    home_living_raw = db.Column(db.Integer)  # الحياة المنزلية
    health_safety_raw = db.Column(db.Integer)  # الصحة والسلامة
    leisure_raw = db.Column(db.Integer)  # أوقات الفراغ
    self_care_raw = db.Column(db.Integer)  # العناية بالذات
    self_direction_raw = db.Column(db.Integer)  # التوجيه الذاتي
    social_raw = db.Column(db.Integer)  # المهارات الاجتماعية
    motor_raw = db.Column(db.Integer)  # المهارات الحركية
    work_raw = db.Column(db.Integer)  # العمل
    
    # الدرجات المعيارية لمجالات المهارات
    communication_scaled = db.Column(db.Integer)
    community_use_scaled = db.Column(db.Integer)
    functional_academics_scaled = db.Column(db.Integer)
    home_living_scaled = db.Column(db.Integer)
    health_safety_scaled = db.Column(db.Integer)
    leisure_scaled = db.Column(db.Integer)
    self_care_scaled = db.Column(db.Integer)
    self_direction_scaled = db.Column(db.Integer)
    social_scaled = db.Column(db.Integer)
    motor_scaled = db.Column(db.Integer)
    work_scaled = db.Column(db.Integer)
    
    # درجات المجالات المركبة
    conceptual_domain_standard = db.Column(db.Integer)  # المجال المفاهيمي
    social_domain_standard = db.Column(db.Integer)  # المجال الاجتماعي
    practical_domain_standard = db.Column(db.Integer)  # المجال العملي
    
    # المؤشر التكيفي العام
    general_adaptive_composite = db.Column(db.Integer)  # GAC
    
    # الرتب المئوية
    conceptual_percentile = db.Column(db.Float)
    social_percentile = db.Column(db.Float)
    practical_percentile = db.Column(db.Float)
    gac_percentile = db.Column(db.Float)
    
    # فترات الثقة
    gac_confidence_90_lower = db.Column(db.Integer)
    gac_confidence_90_upper = db.Column(db.Integer)
    gac_confidence_95_lower = db.Column(db.Integer)
    gac_confidence_95_upper = db.Column(db.Integer)
    
    # التصنيف الوصفي
    adaptive_level_classification = db.Column(db.String(50))  # متوسط، أقل من المتوسط، منخفض، إلخ
    
    # العلاقات
    assessment = db.relationship('ABASAssessment', backref='scores', uselist=False)
    
    def __repr__(self):
        return f'<ABASScore Assessment:{self.assessment_id} GAC:{self.general_adaptive_composite}>'


class ABASNorms(db.Model):
    """المعايير المرجعية لمقياس السلوك التكيفي"""
    __tablename__ = 'abas_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # المعلومات الديموغرافية
    age_group = db.Column(db.String(20))  # 0:0-0:11, 1:0-1:11, etc.
    gender = db.Column(db.String(10))
    form_type = db.Column(db.String(50))  # Parent, Teacher, Adult
    
    # المعايير الإحصائية للمجالات
    conceptual_mean = db.Column(db.Float)
    conceptual_sd = db.Column(db.Float)
    social_mean = db.Column(db.Float)
    social_sd = db.Column(db.Float)
    practical_mean = db.Column(db.Float)
    practical_sd = db.Column(db.Float)
    
    # المعايير الإحصائية للمؤشر العام
    gac_mean = db.Column(db.Float, default=100.0)
    gac_sd = db.Column(db.Float, default=15.0)
    
    # معلومات العينة
    sample_size = db.Column(db.Integer)
    sample_description = db.Column(db.Text)
    reliability_info = db.Column(db.Text)
    
    def __repr__(self):
        return f'<ABASNorms {self.age_group} {self.gender} - {self.form_type}>'


class ABASReport(db.Model):
    """تقارير مقياس السلوك التكيفي"""
    __tablename__ = 'abas_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('abas_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50))  # comprehensive, brief, iep_focused
    report_date = db.Column(db.DateTime, default=datetime.utcnow)
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    strengths_summary = db.Column(db.Text)
    areas_of_concern = db.Column(db.Text)
    detailed_results = db.Column(db.Text)
    clinical_interpretation = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    intervention_goals = db.Column(db.Text)  # أهداف التدخل
    
    # الرسوم البيانية والجداول
    skill_profile_data = db.Column(db.Text)
    comparison_data = db.Column(db.Text)
    progress_tracking_data = db.Column(db.Text)
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_at = db.Column(db.DateTime)
    
    # الإرسال والمشاركة
    sent_to_referrer = db.Column(db.Boolean, default=False)
    sent_to_referrer_at = db.Column(db.DateTime)
    sent_to_parents = db.Column(db.Boolean, default=False)
    sent_to_parents_at = db.Column(db.DateTime)
    sent_to_iep_team = db.Column(db.Boolean, default=False)  # فريق البرنامج التعليمي الفردي
    sent_to_iep_team_at = db.Column(db.DateTime)
    
    # العلاقات
    assessment = db.relationship('ABASAssessment', backref='reports')
    generator = db.relationship('User', foreign_keys=[generated_by], backref='abas_reports_generated')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='abas_reports_approved')
    
    def __repr__(self):
        return f'<ABASReport {self.assessment.student.name} - {self.report_type} - {self.report_date}>'


# ============================================================================
# DENVER DEVELOPMENTAL SCREENING TEST II - مقياس دنفر للتطور النمائي
# ============================================================================

class DenverAssessment(db.Model):
    """تقييم مقياس دنفر للتطور النمائي الطبعة الثانية"""
    __tablename__ = 'denver_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات أساسية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # معلومات الطفل
    chronological_age_months = db.Column(db.Integer)  # العمر الزمني بالشهور
    corrected_age_months = db.Column(db.Integer)  # العمر المصحح للخدج
    birth_weight = db.Column(db.Float)  # وزن الولادة بالجرام
    gestational_age = db.Column(db.Integer)  # عمر الحمل بالأسابيع
    is_premature = db.Column(db.Boolean, default=False)
    
    # معلومات التقييم
    testing_environment = db.Column(db.String(100))  # بيئة التقييم
    caregiver_present = db.Column(db.Boolean, default=True)  # حضور مقدم الرعاية
    child_cooperation = db.Column(db.String(50))  # تعاون الطفل
    testing_conditions = db.Column(db.Text)  # ظروف التقييم
    
    # النتائج العامة
    total_items_administered = db.Column(db.Integer)
    items_passed = db.Column(db.Integer)
    items_failed = db.Column(db.Integer)
    items_refused = db.Column(db.Integer)
    items_no_opportunity = db.Column(db.Integer)  # لم تتح الفرصة
    
    # تفسير النتائج
    overall_result = db.Column(db.String(50))  # normal, suspect, untestable
    developmental_concerns = db.Column(db.Text)
    areas_of_strength = db.Column(db.Text)
    areas_of_concern = db.Column(db.Text)
    
    # التوصيات
    recommendations = db.Column(db.Text)
    follow_up_needed = db.Column(db.Boolean, default=False)
    follow_up_timeframe = db.Column(db.String(50))  # 1 month, 3 months, 6 months
    referral_needed = db.Column(db.Boolean, default=False)
    referral_services = db.Column(db.Text)  # الخدمات المحولة إليها
    
    # معلومات إضافية
    behavioral_observations = db.Column(db.Text)
    parent_concerns = db.Column(db.Text)  # مخاوف الوالدين
    risk_factors = db.Column(db.Text)  # عوامل الخطر
    notes = db.Column(db.Text)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='draft')
    completed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # العلاقات
    student = db.relationship('Student', backref='denver_assessments')
    assessor = db.relationship('User', foreign_keys=[assessor_id], backref='denver_assessments_conducted')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='denver_assessments_reviewed')
    
    def __repr__(self):
        return f'<DenverAssessment {self.student.name} - {self.assessment_date}>'


class DenverDomain(db.Model):
    """مجالات التطور في مقياس دنفر"""
    __tablename__ = 'denver_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_code = db.Column(db.String(10), unique=True, nullable=False)  # PS, FM, L, PSS
    domain_name_ar = db.Column(db.String(100), nullable=False)
    domain_name_en = db.Column(db.String(100))
    domain_color = db.Column(db.String(20))  # لون المجال في الرسم البياني
    
    # وصف المجال
    description = db.Column(db.Text)
    age_range = db.Column(db.String(50))  # النطاق العمري
    
    def __repr__(self):
        return f'<DenverDomain {self.domain_code}: {self.domain_name_ar}>'


# Placeholder for DenverMilestone to resolve NameError
class DenverMilestone(db.Model):
    __tablename__ = 'denver_milestones_temp_fix'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))

class DenverItem(db.Model):
    """بنود مقياس دنفر للتطور"""
    __tablename__ = 'denver_items'
    
    id = db.Column(db.Integer, primary_key=True)
    item_number = db.Column(db.String(10), nullable=False)  # رقم البند
    domain_id = db.Column(db.Integer, db.ForeignKey('denver_domains.id'), nullable=False)
    
    # النص العربي
    item_text_ar = db.Column(db.Text, nullable=False)
    
    # النص الإنجليزي (مرجعي)
    item_text_en = db.Column(db.Text)
    
    # معلومات العمر
    age_25_percentile = db.Column(db.Float)  # العمر عند 25%
    age_50_percentile = db.Column(db.Float)  # العمر عند 50%
    age_75_percentile = db.Column(db.Float)  # العمر عند 75%
    age_90_percentile = db.Column(db.Float)  # العمر عند 90%
    
    # معلومات التطبيق
    administration_method = db.Column(db.String(50))  # observation, direct_testing, report
    materials_needed = db.Column(db.Text)  # المواد المطلوبة
    instructions = db.Column(db.Text)  # تعليمات التطبيق
    
    # معايير النجاح
    pass_criteria = db.Column(db.Text)
    fail_criteria = db.Column(db.Text)
    
    # العلاقات
    domain = db.relationship('DenverDomain', backref='items')
    
    def __repr__(self):
        return f'<DenverItem {self.item_number}: {self.domain.domain_code}>'


class DenverResponse(db.Model):
    """استجابات مقياس دنفر"""
    __tablename__ = 'denver_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('denver_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('denver_items.id'), nullable=False)
    
    # الاستجابة
    response_type = db.Column(db.String(20))  # pass, fail, refuse, no_opportunity
    response_method = db.Column(db.String(50))  # observed, tested, reported
    
    # معلومات إضافية
    age_at_testing = db.Column(db.Float)  # عمر الطفل عند التقييم
    attempts_made = db.Column(db.Integer, default=1)
    behavioral_notes = db.Column(db.Text)
    environmental_factors = db.Column(db.Text)
    
    # تحليل النتيجة
    is_age_appropriate = db.Column(db.Boolean)  # مناسب للعمر
    percentile_position = db.Column(db.String(20))  # موقع الطفل في المئينات
    developmental_concern = db.Column(db.Boolean, default=False)
    
    # العلاقات
    assessment = db.relationship('DenverAssessment', backref='responses')
    item = db.relationship('DenverItem', backref='responses')
    
    # فهرس مركب
    __table_args__ = (db.UniqueConstraint('assessment_id', 'item_id', name='unique_denver_response'),)
    
    def __repr__(self):
        return f'<DenverResponse Assessment:{self.assessment_id} Item:{self.item.item_number} = {self.response_type}>'


class DenverDomainScore(db.Model):
    """درجات المجالات في مقياس دنفر"""
    __tablename__ = 'denver_domain_scores'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('denver_assessments.id'), nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey('denver_domains.id'), nullable=False)
    
    # إحصائيات المجال
    total_items_tested = db.Column(db.Integer)
    items_passed = db.Column(db.Integer)
    items_failed = db.Column(db.Integer)
    items_refused = db.Column(db.Integer)
    items_no_opportunity = db.Column(db.Integer)
    
    # النسب المئوية
    pass_percentage = db.Column(db.Float)
    fail_percentage = db.Column(db.Float)
    
    # التفسير
    domain_status = db.Column(db.String(50))  # normal, suspect, abnormal
    developmental_age_months = db.Column(db.Float)  # العمر التطويري المقدر
    delay_months = db.Column(db.Float)  # مقدار التأخير بالشهور
    
    # التوصيات الخاصة بالمجال
    domain_recommendations = db.Column(db.Text)
    intervention_needed = db.Column(db.Boolean, default=False)
    
    # العلاقات
    assessment = db.relationship('DenverAssessment', backref='domain_scores')
    domain = db.relationship('DenverDomain', backref='assessment_scores')
    
    # فهرس مركب
    __table_args__ = (db.UniqueConstraint('assessment_id', 'domain_id', name='unique_denver_domain_score'),)
    
    def __repr__(self):
        return f'<DenverDomainScore Assessment:{self.assessment_id} Domain:{self.domain.domain_code} = {self.domain_status}>'


class DenverNorms(db.Model):
    """المعايير المرجعية لمقياس دنفر"""
    __tablename__ = 'denver_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('denver_items.id'), nullable=False)
    
    # البيانات المعيارية
    sample_size = db.Column(db.Integer)
    gender = db.Column(db.String(10))  # male, female, combined
    ethnicity = db.Column(db.String(50))
    
    # المئينات العمرية
    percentile_25_age = db.Column(db.Float)
    percentile_50_age = db.Column(db.Float)
    percentile_75_age = db.Column(db.Float)
    percentile_90_age = db.Column(db.Float)
    
    # معلومات إحصائية
    mean_age = db.Column(db.Float)
    standard_deviation = db.Column(db.Float)
    reliability_coefficient = db.Column(db.Float)
    
    # معلومات الدراسة
    study_year = db.Column(db.Integer)
    study_location = db.Column(db.String(100))
    study_notes = db.Column(db.Text)
    
    # العلاقات
    item = db.relationship('DenverItem', backref='norms')
    
    def __repr__(self):
        return f'<DenverNorms Item:{self.item.item_number} Gender:{self.gender}>'


class DenverReport(db.Model):
    """تقارير مقياس دنفر للتطور"""
    __tablename__ = 'denver_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('denver_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50))  # screening, comprehensive, follow_up
    report_date = db.Column(db.DateTime, default=datetime.utcnow)
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)
    developmental_profile = db.Column(db.Text)
    domain_analysis = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    parent_interview_summary = db.Column(db.Text)
    
    # النتائج والتفسير
    screening_results = db.Column(db.Text)
    areas_of_concern = db.Column(db.Text)
    developmental_strengths = db.Column(db.Text)
    risk_factors_analysis = db.Column(db.Text)
    
    # التوصيات
    immediate_recommendations = db.Column(db.Text)
    long_term_recommendations = db.Column(db.Text)
    referral_recommendations = db.Column(db.Text)
    parent_guidance = db.Column(db.Text)
    
    # البيانات المرئية
    developmental_chart_data = db.Column(db.Text)  # بيانات الرسم البياني
    comparison_data = db.Column(db.Text)
    progress_tracking_data = db.Column(db.Text)
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_at = db.Column(db.DateTime)
    
    # الإرسال والمشاركة
    sent_to_parents = db.Column(db.Boolean, default=False)
    sent_to_parents_at = db.Column(db.DateTime)
    sent_to_pediatrician = db.Column(db.Boolean, default=False)
    sent_to_pediatrician_at = db.Column(db.DateTime)
    sent_to_early_intervention = db.Column(db.Boolean, default=False)
    sent_to_early_intervention_at = db.Column(db.DateTime)
    
    # العلاقات
    assessment = db.relationship('DenverAssessment', backref='reports')
    generator = db.relationship('User', foreign_keys=[generated_by], backref='denver_reports_generated')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='denver_reports_approved')
    
    def __repr__(self):
        return f'<DenverReport {self.assessment.student.name} - {self.report_type} - {self.report_date}>'


# ============================================================================
# DEVELOPMENTAL LEARNING DIFFICULTIES SCALE - مقياس صعوبات التعلم النمائية
# ============================================================================

class LearningDifficultiesAssessment(db.Model):
    """تقييم مقياس صعوبات التعلم النمائية"""
    __tablename__ = 'learning_difficulties_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات أساسية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # معلومات التقييم
    assessment_purpose = db.Column(db.String(100))  # screening, diagnostic, progress_monitoring
    referral_source = db.Column(db.String(100))  # teacher, parent, self_referral
    presenting_concerns = db.Column(db.Text)  # المشاكل المعروضة
    
    # المعلومات الأكاديمية
    current_grade = db.Column(db.String(20))
    academic_performance = db.Column(db.Text)  # الأداء الأكاديمي الحالي
    previous_interventions = db.Column(db.Text)  # التدخلات السابقة
    special_education_services = db.Column(db.Text)  # خدمات التربية الخاصة
    
    # التاريخ التطويري
    developmental_milestones = db.Column(db.Text)  # المعالم التطويرية
    early_learning_concerns = db.Column(db.Text)  # مخاوف التعلم المبكرة
    family_history_learning_issues = db.Column(db.Text)  # التاريخ العائلي
    
    # النتائج العامة
    overall_risk_level = db.Column(db.String(50))  # low, moderate, high, very_high
    primary_difficulty_areas = db.Column(db.Text)  # مجالات الصعوبة الأساسية
    secondary_difficulty_areas = db.Column(db.Text)  # مجالات الصعوبة الثانوية
    strength_areas = db.Column(db.Text)  # مجالات القوة
    
    # التفسير والتوصيات
    clinical_interpretation = db.Column(db.Text)
    educational_recommendations = db.Column(db.Text)
    intervention_priorities = db.Column(db.Text)
    accommodation_needs = db.Column(db.Text)  # احتياجات التسهيلات
    
    # المتابعة
    follow_up_assessment_needed = db.Column(db.Boolean, default=False)
    follow_up_timeframe = db.Column(db.String(50))
    additional_evaluations_needed = db.Column(db.Text)
    
    # معلومات إضافية
    behavioral_observations = db.Column(db.Text)
    motivational_factors = db.Column(db.Text)  # العوامل التحفيزية
    environmental_factors = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='draft')
    completed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # العلاقات
    student = db.relationship('Student', backref='learning_difficulties_assessments')
    assessor = db.relationship('User', foreign_keys=[assessor_id], backref='learning_difficulties_assessments_conducted')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='learning_difficulties_assessments_reviewed')
    
    def __repr__(self):
        return f'<LearningDifficultiesAssessment {self.student.name} - {self.assessment_date}>'


class LearningDifficultiesDomain(db.Model):
    """مجالات صعوبات التعلم النمائية"""
    __tablename__ = 'learning_difficulties_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_code = db.Column(db.String(10), unique=True, nullable=False)  # ATT, MEM, PER, etc.
    domain_name_ar = db.Column(db.String(100), nullable=False)
    domain_name_en = db.Column(db.String(100))
    
    # تصنيف المجال
    domain_category = db.Column(db.String(50))  # cognitive, academic, behavioral
    age_range = db.Column(db.String(50))  # النطاق العمري المناسب
    
    # وصف المجال
    description = db.Column(db.Text)
    behavioral_indicators = db.Column(db.Text)  # المؤشرات السلوكية
    academic_impact = db.Column(db.Text)  # التأثير الأكاديمي
    
    def __repr__(self):
        return f'<LearningDifficultiesDomain {self.domain_code}: {self.domain_name_ar}>'


class LearningDifficultiesItem(db.Model):
    """بنود مقياس صعوبات التعلم النمائية"""
    __tablename__ = 'learning_difficulties_items'
    
    id = db.Column(db.Integer, primary_key=True)
    item_number = db.Column(db.Integer, nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey('learning_difficulties_domains.id'), nullable=False)
    
    # النص العربي
    item_text_ar = db.Column(db.Text, nullable=False)
    
    # النص الإنجليزي (مرجعي)
    item_text_en = db.Column(db.Text)
    
    # معلومات البند
    item_type = db.Column(db.String(50))  # behavioral_observation, academic_task, cognitive_test
    difficulty_level = db.Column(db.String(20))  # easy, moderate, difficult
    age_appropriateness = db.Column(db.String(50))  # النطاق العمري المناسب
    
    # معلومات التطبيق
    administration_time = db.Column(db.Integer)  # الوقت المطلوب بالدقائق
    materials_required = db.Column(db.Text)  # المواد المطلوبة
    administration_instructions = db.Column(db.Text)  # تعليمات التطبيق
    
    # معايير التقييم
    scoring_criteria = db.Column(db.Text)  # معايير التسجيل
    interpretation_guidelines = db.Column(db.Text)  # إرشادات التفسير
    
    # العلاقات
    domain = db.relationship('LearningDifficultiesDomain', backref='items')
    
    def __repr__(self):
        return f'<LearningDifficultiesItem {self.item_number}: {self.domain.domain_code}>'


class LearningDifficultiesResponse(db.Model):
    """استجابات مقياس صعوبات التعلم النمائية"""
    __tablename__ = 'learning_difficulties_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('learning_difficulties_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('learning_difficulties_items.id'), nullable=False)
    
    # الاستجابة
    response_value = db.Column(db.Integer)  # 0-4 scale typically
    response_label = db.Column(db.String(50))  # تسمية الاستجابة
    confidence_level = db.Column(db.String(20))  # مستوى الثقة في الاستجابة
    
    # معلومات إضافية
    observation_context = db.Column(db.Text)  # سياق الملاحظة
    response_time = db.Column(db.Float)  # وقت الاستجابة
    assistance_provided = db.Column(db.Text)  # المساعدة المقدمة
    behavioral_notes = db.Column(db.Text)  # ملاحظات سلوكية
    
    # تحليل الاستجابة
    error_analysis = db.Column(db.Text)  # تحليل الأخطاء
    strategy_used = db.Column(db.Text)  # الاستراتيجية المستخدمة
    difficulty_indicators = db.Column(db.Text)  # مؤشرات الصعوبة
    
    # العلاقات
    assessment = db.relationship('LearningDifficultiesAssessment', backref='responses')
    item = db.relationship('LearningDifficultiesItem', backref='responses')
    
    # فهرس مركب
    __table_args__ = (db.UniqueConstraint('assessment_id', 'item_id', name='unique_learning_difficulties_response'),)
    
    def __repr__(self):
        return f'<LearningDifficultiesResponse Assessment:{self.assessment_id} Item:{self.item.item_number} = {self.response_value}>'


class LearningDifficultiesScore(db.Model):
    """درجات مقياس صعوبات التعلم النمائية"""
    __tablename__ = 'learning_difficulties_scores'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('learning_difficulties_assessments.id'), nullable=False)
    
    # درجات المجالات الخام
    attention_raw_score = db.Column(db.Integer)  # الانتباه
    memory_raw_score = db.Column(db.Integer)  # الذاكرة
    perception_raw_score = db.Column(db.Integer)  # الإدراك
    motor_skills_raw_score = db.Column(db.Integer)  # المهارات الحركية
    language_raw_score = db.Column(db.Integer)  # اللغة
    thinking_raw_score = db.Column(db.Integer)  # التفكير
    academic_readiness_raw_score = db.Column(db.Integer)  # الاستعداد الأكاديمي
    
    # الدرجات المعيارية
    attention_standard_score = db.Column(db.Integer)
    memory_standard_score = db.Column(db.Integer)
    perception_standard_score = db.Column(db.Integer)
    motor_skills_standard_score = db.Column(db.Integer)
    language_standard_score = db.Column(db.Integer)
    thinking_standard_score = db.Column(db.Integer)
    academic_readiness_standard_score = db.Column(db.Integer)
    
    # الدرجات المركبة
    cognitive_composite_score = db.Column(db.Integer)  # المؤشر المعرفي
    academic_composite_score = db.Column(db.Integer)  # المؤشر الأكاديمي
    overall_learning_difficulties_index = db.Column(db.Integer)  # مؤشر صعوبات التعلم العام
    
    # الرتب المئوية
    cognitive_percentile = db.Column(db.Float)
    academic_percentile = db.Column(db.Float)
    overall_percentile = db.Column(db.Float)
    
    # مستويات الخطر
    attention_risk_level = db.Column(db.String(20))  # low, moderate, high, very_high
    memory_risk_level = db.Column(db.String(20))
    perception_risk_level = db.Column(db.String(20))
    motor_skills_risk_level = db.Column(db.String(20))
    language_risk_level = db.Column(db.String(20))
    thinking_risk_level = db.Column(db.String(20))
    academic_readiness_risk_level = db.Column(db.String(20))
    
    # التصنيف العام
    overall_classification = db.Column(db.String(50))  # no_difficulty, mild, moderate, severe
    learning_profile_type = db.Column(db.String(50))  # نوع الملف التعليمي
    
    # العلاقات
    assessment = db.relationship('LearningDifficultiesAssessment', backref='scores', uselist=False)
    
    def __repr__(self):
        return f'<LearningDifficultiesScore Assessment:{self.assessment_id} Overall:{self.overall_learning_difficulties_index}>'


class LearningDifficultiesNorms(db.Model):
    """المعايير المرجعية لمقياس صعوبات التعلم النمائية"""
    __tablename__ = 'learning_difficulties_norms'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # المعلومات الديموغرافية
    age_group = db.Column(db.String(20))  # 4-5, 6-7, 8-9, etc.
    grade_level = db.Column(db.String(20))  # KG, 1st, 2nd, etc.
    gender = db.Column(db.String(10))  # male, female, combined
    
    # المعايير الإحصائية للمجالات
    attention_mean = db.Column(db.Float)
    attention_sd = db.Column(db.Float)
    memory_mean = db.Column(db.Float)
    memory_sd = db.Column(db.Float)
    perception_mean = db.Column(db.Float)
    perception_sd = db.Column(db.Float)
    motor_skills_mean = db.Column(db.Float)
    motor_skills_sd = db.Column(db.Float)
    language_mean = db.Column(db.Float)
    language_sd = db.Column(db.Float)
    thinking_mean = db.Column(db.Float)
    thinking_sd = db.Column(db.Float)
    academic_readiness_mean = db.Column(db.Float)
    academic_readiness_sd = db.Column(db.Float)
    
    # المعايير للدرجات المركبة
    cognitive_composite_mean = db.Column(db.Float, default=100.0)
    cognitive_composite_sd = db.Column(db.Float, default=15.0)
    academic_composite_mean = db.Column(db.Float, default=100.0)
    academic_composite_sd = db.Column(db.Float, default=15.0)
    overall_index_mean = db.Column(db.Float, default=100.0)
    overall_index_sd = db.Column(db.Float, default=15.0)
    
    # معلومات العينة
    sample_size = db.Column(db.Integer)
    sample_description = db.Column(db.Text)
    cultural_context = db.Column(db.String(100))  # السياق الثقافي
    
    # معلومات الثبات والصدق
    reliability_coefficients = db.Column(db.Text)  # معاملات الثبات
    validity_evidence = db.Column(db.Text)  # أدلة الصدق
    
    def __repr__(self):
        return f'<LearningDifficultiesNorms {self.age_group} {self.gender}>'


class LearningDifficultiesReport(db.Model):
    """تقارير مقياس صعوبات التعلم النمائية"""
    __tablename__ = 'learning_difficulties_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('learning_difficulties_assessments.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50))  # screening, comprehensive, progress, iep_focused
    report_date = db.Column(db.DateTime, default=datetime.utcnow)
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)
    background_information = db.Column(db.Text)
    assessment_procedures = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    
    # النتائج والتحليل
    quantitative_results = db.Column(db.Text)  # النتائج الكمية
    qualitative_analysis = db.Column(db.Text)  # التحليل النوعي
    domain_specific_findings = db.Column(db.Text)  # نتائج المجالات المحددة
    pattern_analysis = db.Column(db.Text)  # تحليل الأنماط
    
    # التفسير الإكلينيكي
    diagnostic_impressions = db.Column(db.Text)  # الانطباعات التشخيصية
    differential_diagnosis = db.Column(db.Text)  # التشخيص التفريقي
    severity_assessment = db.Column(db.Text)  # تقييم الشدة
    prognosis = db.Column(db.Text)  # التنبؤ
    
    # التوصيات
    educational_recommendations = db.Column(db.Text)
    intervention_strategies = db.Column(db.Text)
    accommodation_modifications = db.Column(db.Text)  # التسهيلات والتعديلات
    family_guidance = db.Column(db.Text)  # إرشاد الأسرة
    professional_referrals = db.Column(db.Text)  # الإحالات المهنية
    
    # البيانات المرئية
    profile_chart_data = db.Column(db.Text)  # بيانات الرسم البياني للملف
    comparison_data = db.Column(db.Text)
    progress_monitoring_data = db.Column(db.Text)
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_at = db.Column(db.DateTime)
    
    # الإرسال والمشاركة
    sent_to_parents = db.Column(db.Boolean, default=False)
    sent_to_parents_at = db.Column(db.DateTime)
    sent_to_school = db.Column(db.Boolean, default=False)
    sent_to_school_at = db.Column(db.DateTime)
    sent_to_iep_team = db.Column(db.Boolean, default=False)
    sent_to_iep_team_at = db.Column(db.DateTime)
    sent_to_specialists = db.Column(db.Boolean, default=False)
    sent_to_specialists_at = db.Column(db.DateTime)
    
    # العلاقات
    assessment = db.relationship('LearningDifficultiesAssessment', backref='reports')
    generator = db.relationship('User', foreign_keys=[generated_by], backref='learning_difficulties_reports_generated')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='learning_difficulties_reports_approved')
    
    def __repr__(self):
        return f'<LearningDifficultiesReport {self.assessment.student.name} - {self.report_type} - {self.report_date}>'


# ============================================================================
# PORTAGE PROGRAM - برنامج بروتج للإعاقة الذهنية
# ============================================================================

class PortageProgram(db.Model):
    """برنامج بروتج للإعاقة الذهنية"""
    __tablename__ = 'portage_programs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات أساسية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    coordinator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # معلومات البرنامج
    program_type = db.Column(db.String(50))  # home_based, center_based, combined
    service_model = db.Column(db.String(50))  # weekly, bi_weekly, monthly
    intensity_level = db.Column(db.String(20))  # low, moderate, high, intensive
    
    # الأهداف العامة
    primary_goals = db.Column(db.Text)  # الأهداف الأساسية
    secondary_goals = db.Column(db.Text)  # الأهداف الثانوية
    family_priorities = db.Column(db.Text)  # أولويات الأسرة
    
    # التقييم الأولي
    initial_assessment_date = db.Column(db.DateTime)
    developmental_age = db.Column(db.Float)  # العمر التطويري بالشهور
    chronological_age = db.Column(db.Float)  # العمر الزمني بالشهور
    developmental_quotient = db.Column(db.Float)  # معامل التطور
    
    # مجالات التطور (درجات من 0-100)
    cognitive_level = db.Column(db.Integer, default=0)
    language_level = db.Column(db.Integer, default=0)
    self_help_level = db.Column(db.Integer, default=0)
    motor_level = db.Column(db.Integer, default=0)
    social_level = db.Column(db.Integer, default=0)
    
    # حالة البرنامج
    status = db.Column(db.String(20), default='active')  # active, completed, suspended, discontinued
    completion_date = db.Column(db.DateTime)
    completion_reason = db.Column(db.Text)
    
    # المشاركون
    family_involvement = db.Column(db.Text)  # مشاركة الأسرة
    team_members = db.Column(db.Text)  # أعضاء الفريق
    external_services = db.Column(db.Text)  # الخدمات الخارجية
    
    # التقييم والمراجعة
    last_review_date = db.Column(db.DateTime)
    next_review_date = db.Column(db.DateTime)
    progress_summary = db.Column(db.Text)
    challenges_identified = db.Column(db.Text)
    
    # الملاحظات
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='portage_programs')
    coordinator = db.relationship('User', backref='portage_programs_coordinated')
    
    def __repr__(self):
        return f'<PortageProgram {self.student.name} - {self.program_type}>'


class PortageSkillArea(db.Model):
    """مجالات المهارات في برنامج بروتج"""
    __tablename__ = 'portage_skill_areas'
    
    id = db.Column(db.Integer, primary_key=True)
    area_code = db.Column(db.String(10), unique=True, nullable=False)  # COG, LAN, SH, MOT, SOC
    area_name_ar = db.Column(db.String(100), nullable=False)
    area_name_en = db.Column(db.String(100))
    
    # تصنيف المجال
    age_range = db.Column(db.String(50))  # 0-6 years
    developmental_sequence = db.Column(db.Integer)  # ترتيب التطور
    
    # وصف المجال
    description = db.Column(db.Text)
    importance = db.Column(db.Text)  # أهمية المجال
    assessment_criteria = db.Column(db.Text)  # معايير التقييم
    
    # معلومات إضافية
    color_code = db.Column(db.String(7))  # لون المجال في الواجهة
    icon = db.Column(db.String(50))  # أيقونة المجال
    
    def __repr__(self):
        return f'<PortageSkillArea {self.area_code}: {self.area_name_ar}>'


class PortageSkillItem(db.Model):
    """بنود المهارات في برنامج بروتج"""
    __tablename__ = 'portage_skill_items'
    
    id = db.Column(db.Integer, primary_key=True)
    item_number = db.Column(db.String(20), nullable=False)  # COG-1, LAN-15, etc.
    skill_area_id = db.Column(db.Integer, db.ForeignKey('portage_skill_areas.id'), nullable=False)
    
    # النص العربي
    skill_description_ar = db.Column(db.Text, nullable=False)
    
    # النص الإنجليزي (مرجعي)
    skill_description_en = db.Column(db.Text)
    
    # معلومات المهارة
    age_range = db.Column(db.String(20))  # 0-6, 6-12, 12-18, etc. (بالشهور)
    difficulty_level = db.Column(db.String(20))  # basic, intermediate, advanced
    prerequisite_skills = db.Column(db.Text)  # المهارات المتطلبة مسبقاً
    
    # معايير التقييم
    mastery_criteria = db.Column(db.Text)  # معايير الإتقان
    assessment_method = db.Column(db.Text)  # طريقة التقييم
    materials_needed = db.Column(db.Text)  # المواد المطلوبة
    
    # استراتيجيات التدريس
    teaching_strategies = db.Column(db.Text)
    practice_activities = db.Column(db.Text)  # أنشطة التدريب
    home_activities = db.Column(db.Text)  # أنشطة منزلية
    
    # معلومات إضافية
    sequence_order = db.Column(db.Integer)  # ترتيب المهارة في التسلسل
    is_critical = db.Column(db.Boolean, default=False)  # مهارة حرجة
    
    # العلاقات
    skill_area = db.relationship('PortageSkillArea', backref='skill_items')
    
    def __repr__(self):
        return f'<PortageSkillItem {self.item_number}: {self.skill_area.area_code}>'


class PortageAssessment(db.Model):
    """تقييم برنامج بروتج"""
    __tablename__ = 'portage_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('portage_programs.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # معلومات التقييم
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50))  # initial, progress, final, annual
    assessment_purpose = db.Column(db.Text)
    
    # البيئة والظروف
    assessment_setting = db.Column(db.String(100))  # home, center, clinic
    family_present = db.Column(db.Boolean, default=True)
    assessment_duration = db.Column(db.Integer)  # بالدقائق
    
    # الملاحظات السلوكية
    child_cooperation = db.Column(db.String(50))  # excellent, good, fair, poor
    attention_span = db.Column(db.String(50))
    motivation_level = db.Column(db.String(50))
    behavioral_concerns = db.Column(db.Text)
    
    # النتائج العامة
    overall_developmental_age = db.Column(db.Float)  # بالشهور
    overall_progress_rate = db.Column(db.Float)  # معدل التقدم
    strengths_identified = db.Column(db.Text)
    areas_of_concern = db.Column(db.Text)
    
    # التوصيات
    recommendations = db.Column(db.Text)
    priority_goals = db.Column(db.Text)
    family_training_needs = db.Column(db.Text)
    service_modifications = db.Column(db.Text)
    
    # المتابعة
    next_assessment_date = db.Column(db.DateTime)
    follow_up_actions = db.Column(db.Text)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='draft')
    completed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # العلاقات
    program = db.relationship('PortageProgram', backref='assessments')
    assessor = db.relationship('User', foreign_keys=[assessor_id], backref='portage_assessments_conducted')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='portage_assessments_reviewed')
    
    def __repr__(self):
        return f'<PortageAssessment {self.program.student.name} - {self.assessment_type} - {self.assessment_date}>'


class PortageSkillResponse(db.Model):
    """استجابات تقييم المهارات في برنامج بروتج"""
    __tablename__ = 'portage_skill_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('portage_assessments.id'), nullable=False)
    skill_item_id = db.Column(db.Integer, db.ForeignKey('portage_skill_items.id'), nullable=False)
    
    # الاستجابة
    mastery_level = db.Column(db.String(20))  # not_emerged, emerging, developing, mastered
    score = db.Column(db.Integer)  # 0-3 scale
    confidence_level = db.Column(db.String(20))  # high, medium, low
    
    # معلومات التقييم
    assessment_method_used = db.Column(db.String(100))  # observation, direct_test, parent_report
    prompts_needed = db.Column(db.String(50))  # none, minimal, moderate, maximum
    consistency = db.Column(db.String(50))  # always, usually, sometimes, rarely
    
    # الملاحظات
    behavioral_notes = db.Column(db.Text)
    environmental_factors = db.Column(db.Text)
    adaptations_used = db.Column(db.Text)
    
    # التحليل
    error_patterns = db.Column(db.Text)
    learning_style_notes = db.Column(db.Text)
    motivation_factors = db.Column(db.Text)
    
    # التوصيات للمهارة
    teaching_recommendations = db.Column(db.Text)
    practice_frequency = db.Column(db.String(50))  # daily, weekly, bi_weekly
    target_date = db.Column(db.Date)  # تاريخ الهدف للإتقان
    
    # العلاقات
    assessment = db.relationship('PortageAssessment', backref='skill_responses')
    skill_item = db.relationship('PortageSkillItem', backref='responses')
    
    # فهرس مركب
    __table_args__ = (db.UniqueConstraint('assessment_id', 'skill_item_id', name='unique_portage_skill_response'),)
    
    def __repr__(self):
        return f'<PortageSkillResponse Assessment:{self.assessment_id} Skill:{self.skill_item.item_number} = {self.mastery_level}>'


class PortageGoal(db.Model):
    """أهداف برنامج بروتج"""
    __tablename__ = 'portage_goals'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('portage_programs.id'), nullable=False)
    skill_item_id = db.Column(db.Integer, db.ForeignKey('portage_skill_items.id'), nullable=False)
    
    # معلومات الهدف
    goal_statement = db.Column(db.Text, nullable=False)
    goal_type = db.Column(db.String(50))  # short_term, long_term, maintenance
    priority_level = db.Column(db.String(20))  # high, medium, low
    
    # التواريخ
    start_date = db.Column(db.Date, nullable=False)
    target_date = db.Column(db.Date, nullable=False)
    achieved_date = db.Column(db.Date)
    
    # معايير النجاح
    success_criteria = db.Column(db.Text)
    measurement_method = db.Column(db.Text)
    frequency_target = db.Column(db.String(100))  # 80% of opportunities for 3 consecutive sessions
    
    # الاستراتيجيات
    teaching_strategies = db.Column(db.Text)
    materials_resources = db.Column(db.Text)
    environmental_modifications = db.Column(db.Text)
    
    # المسؤوليات
    primary_instructor = db.Column(db.Integer, db.ForeignKey('users.id'))
    family_role = db.Column(db.Text)
    team_responsibilities = db.Column(db.Text)
    
    # التقدم والحالة
    current_status = db.Column(db.String(50))  # not_started, in_progress, achieved, discontinued
    progress_percentage = db.Column(db.Integer, default=0)
    last_progress_date = db.Column(db.Date)
    
    # الملاحظات
    progress_notes = db.Column(db.Text)
    challenges = db.Column(db.Text)
    modifications_made = db.Column(db.Text)
    
    # العلاقات
    program = db.relationship('PortageProgram', backref='goals')
    skill_item = db.relationship('PortageSkillItem', backref='goals')
    instructor = db.relationship('User', backref='portage_goals_assigned')
    
    def __repr__(self):
        return f'<PortageGoal {self.program.student.name} - {self.skill_item.item_number}>'


class PortageSession(db.Model):
    """جلسات برنامج بروتج"""
    __tablename__ = 'portage_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('portage_programs.id'), nullable=False)
    instructor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # معلومات الجلسة
    session_date = db.Column(db.DateTime, nullable=False)
    session_type = db.Column(db.String(50))  # home_visit, center_session, family_training
    duration_minutes = db.Column(db.Integer)
    
    # المشاركون
    participants = db.Column(db.Text)  # من حضر الجلسة
    family_members_present = db.Column(db.Text)
    
    # الأهداف المستهدفة
    goals_addressed = db.Column(db.Text)
    activities_conducted = db.Column(db.Text)
    materials_used = db.Column(db.Text)
    
    # التقدم والملاحظات
    child_performance = db.Column(db.Text)
    family_participation = db.Column(db.Text)
    behavioral_observations = db.Column(db.Text)
    
    # التوصيات والمتابعة
    home_practice_assigned = db.Column(db.Text)
    family_training_provided = db.Column(db.Text)
    next_session_plan = db.Column(db.Text)
    
    # حالة الجلسة
    status = db.Column(db.String(20), default='completed')  # scheduled, completed, cancelled, rescheduled
    cancellation_reason = db.Column(db.Text)
    
    # العلاقات
    program = db.relationship('PortageProgram', backref='sessions')
    instructor = db.relationship('User', backref='portage_sessions_conducted')
    
    def __repr__(self):
        return f'<PortageSession {self.program.student.name} - {self.session_date}>'


class PortageProgressReport(db.Model):
    """تقارير تقدم برنامج بروتج"""
    __tablename__ = 'portage_progress_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('portage_programs.id'), nullable=False)
    
    # معلومات التقرير
    report_period_start = db.Column(db.Date, nullable=False)
    report_period_end = db.Column(db.Date, nullable=False)
    report_type = db.Column(db.String(50))  # monthly, quarterly, annual, final
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    report_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ملخص التقدم
    overall_progress_summary = db.Column(db.Text)
    goals_achieved = db.Column(db.Integer, default=0)
    goals_in_progress = db.Column(db.Integer, default=0)
    goals_not_started = db.Column(db.Integer, default=0)
    
    # التقدم في المجالات
    cognitive_progress = db.Column(db.Text)
    language_progress = db.Column(db.Text)
    self_help_progress = db.Column(db.Text)
    motor_progress = db.Column(db.Text)
    social_progress = db.Column(db.Text)
    
    # مشاركة الأسرة
    family_participation_level = db.Column(db.String(50))  # excellent, good, fair, poor
    family_training_completed = db.Column(db.Text)
    family_concerns_addressed = db.Column(db.Text)
    
    # الخدمات المقدمة
    sessions_conducted = db.Column(db.Integer, default=0)
    home_visits_completed = db.Column(db.Integer, default=0)
    center_sessions_completed = db.Column(db.Integer, default=0)
    
    # التحديات والحلول
    challenges_encountered = db.Column(db.Text)
    solutions_implemented = db.Column(db.Text)
    environmental_factors = db.Column(db.Text)
    
    # التوصيات للفترة القادمة
    recommendations_next_period = db.Column(db.Text)
    goals_for_next_period = db.Column(db.Text)
    service_modifications = db.Column(db.Text)
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_at = db.Column(db.DateTime)
    
    # الإرسال والمشاركة
    sent_to_family = db.Column(db.Boolean, default=False)
    sent_to_family_at = db.Column(db.DateTime)
    sent_to_team = db.Column(db.Boolean, default=False)
    sent_to_team_at = db.Column(db.DateTime)
    
    # العلاقات
    program = db.relationship('PortageProgram', backref='progress_reports')
    generator = db.relationship('User', foreign_keys=[generated_by], backref='portage_reports_generated')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='portage_reports_approved')
    
    def __repr__(self):
        return f'<PortageProgressReport {self.program.student.name} - {self.report_type} - {self.report_period_end}>'


# ============================================================================
# TEACCH PROGRAM - برنامج تييش للتوحد
# ============================================================================

class TeacchProgram(db.Model):
    """برنامج تييش للتوحد"""
    __tablename__ = 'teacch_programs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات أساسية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    coordinator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # معلومات البرنامج
    program_level = db.Column(db.String(50))  # preschool, elementary, secondary, adult
    service_setting = db.Column(db.String(50))  # classroom, home, community, clinic
    intensity_hours_weekly = db.Column(db.Integer)  # ساعات أسبوعية
    
    # التقييم الأولي
    pep_assessment_date = db.Column(db.DateTime)  # تاريخ تقييم PEP
    aapep_assessment_date = db.Column(db.DateTime)  # تاريخ تقييم AAPEP
    ttap_assessment_date = db.Column(db.DateTime)  # تاريخ تقييم TTAP
    
    # مستويات الأداء الحالية
    developmental_level = db.Column(db.String(50))  # emerging, developing, passing
    communication_level = db.Column(db.String(50))
    social_interaction_level = db.Column(db.String(50))
    behavioral_level = db.Column(db.String(50))
    
    # الأهداف والأولويات
    primary_goals = db.Column(db.Text)
    communication_goals = db.Column(db.Text)
    social_goals = db.Column(db.Text)
    behavioral_goals = db.Column(db.Text)
    academic_goals = db.Column(db.Text)
    independence_goals = db.Column(db.Text)
    
    # البيئة المنظمة
    physical_structure_needs = db.Column(db.Text)  # احتياجات البنية الفيزيائية
    visual_supports_used = db.Column(db.Text)  # الدعائم البصرية المستخدمة
    schedule_system = db.Column(db.Text)  # نظام الجدولة
    work_system_type = db.Column(db.Text)  # نوع نظام العمل
    
    # الاستراتيجيات المستخدمة
    structured_teaching_strategies = db.Column(db.Text)
    communication_strategies = db.Column(db.Text)
    behavioral_strategies = db.Column(db.Text)
    sensory_strategies = db.Column(db.Text)
    
    # حالة البرنامج
    status = db.Column(db.String(20), default='active')
    completion_date = db.Column(db.DateTime)
    transition_plan = db.Column(db.Text)  # خطة الانتقال
    
    # الفريق والتعاون
    team_members = db.Column(db.Text)
    family_involvement_level = db.Column(db.String(50))  # high, moderate, low
    school_collaboration = db.Column(db.Text)
    community_integration = db.Column(db.Text)
    
    # المراجعة والتقييم
    last_review_date = db.Column(db.DateTime)
    next_review_date = db.Column(db.DateTime)
    progress_summary = db.Column(db.Text)
    
    # الملاحظات
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='teacch_programs')
    coordinator = db.relationship('User', backref='teacch_programs_coordinated')
    
    def __repr__(self):
        return f'<TeacchProgram {self.student.name} - {self.program_level}>'


class TeacchSkillDomain(db.Model):
    """مجالات المهارات في برنامج تييش"""
    __tablename__ = 'teacch_skill_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_code = db.Column(db.String(10), unique=True, nullable=False)  # COM, SOC, BEH, ACA, IND
    domain_name_ar = db.Column(db.String(100), nullable=False)
    domain_name_en = db.Column(db.String(100))
    
    # تصنيف المجال
    domain_category = db.Column(db.String(50))  # core, supplementary
    age_appropriateness = db.Column(db.String(50))  # all_ages, preschool, school_age, adult
    
    # وصف المجال
    description = db.Column(db.Text)
    assessment_focus = db.Column(db.Text)  # تركيز التقييم
    intervention_approach = db.Column(db.Text)  # نهج التدخل
    
    # معلومات إضافية
    color_code = db.Column(db.String(7))
    icon = db.Column(db.String(50))
    
    def __repr__(self):
        return f'<TeacchSkillDomain {self.domain_code}: {self.domain_name_ar}>'


class TeacchSkillItem(db.Model):
    """بنود المهارات في برنامج تييش"""
    __tablename__ = 'teacch_skill_items'
    
    id = db.Column(db.Integer, primary_key=True)
    item_code = db.Column(db.String(20), nullable=False)  # COM-1, SOC-15, etc.
    domain_id = db.Column(db.Integer, db.ForeignKey('teacch_skill_domains.id'), nullable=False)
    
    # وصف المهارة
    skill_description_ar = db.Column(db.Text, nullable=False)
    skill_description_en = db.Column(db.Text)
    
    # معلومات المهارة
    developmental_level = db.Column(db.String(50))  # emerging, developing, passing
    age_range = db.Column(db.String(50))
    complexity_level = db.Column(db.String(20))  # basic, intermediate, advanced
    
    # معايير التقييم
    assessment_criteria = db.Column(db.Text)
    scoring_method = db.Column(db.Text)  # طريقة التسجيل
    observation_guidelines = db.Column(db.Text)
    
    # استراتيجيات التدخل
    structured_teaching_approach = db.Column(db.Text)
    visual_supports_recommended = db.Column(db.Text)
    environmental_modifications = db.Column(db.Text)
    
    # معلومات إضافية
    sequence_order = db.Column(db.Integer)
    is_prerequisite = db.Column(db.Boolean, default=False)
    
    # العلاقات
    domain = db.relationship('TeacchSkillDomain', backref='skill_items')
    
    def __repr__(self):
        return f'<TeacchSkillItem {self.item_code}: {self.domain.domain_code}>'


class TeacchAssessment(db.Model):
    """تقييم برنامج تييش"""
    __tablename__ = 'teacch_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('teacch_programs.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # معلومات التقييم
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50))  # pep, aapep, ttap, progress, annual
    assessment_version = db.Column(db.String(20))  # PEP-3, AAPEP, TTAP
    
    # ظروف التقييم
    assessment_setting = db.Column(db.String(100))
    assessment_duration = db.Column(db.Integer)  # بالدقائق
    breaks_taken = db.Column(db.Integer)
    
    # الملاحظات السلوكية
    cooperation_level = db.Column(db.String(50))
    attention_span = db.Column(db.String(50))
    communication_attempts = db.Column(db.String(50))
    behavioral_challenges = db.Column(db.Text)
    
    # النتائج العامة
    overall_developmental_level = db.Column(db.String(50))
    communication_profile = db.Column(db.Text)
    behavioral_profile = db.Column(db.Text)
    learning_style_profile = db.Column(db.Text)
    
    # التوصيات
    structured_teaching_recommendations = db.Column(db.Text)
    visual_support_recommendations = db.Column(db.Text)
    communication_recommendations = db.Column(db.Text)
    behavioral_recommendations = db.Column(db.Text)
    
    # خطة التدخل
    priority_goals = db.Column(db.Text)
    intervention_strategies = db.Column(db.Text)
    environmental_modifications = db.Column(db.Text)
    family_training_needs = db.Column(db.Text)
    
    # المتابعة
    next_assessment_date = db.Column(db.DateTime)
    follow_up_recommendations = db.Column(db.Text)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='draft')
    completed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # العلاقات
    program = db.relationship('TeacchProgram', backref='assessments')
    assessor = db.relationship('User', foreign_keys=[assessor_id], backref='teacch_assessments_conducted')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='teacch_assessments_reviewed')
    
    def __repr__(self):
        return f'<TeacchAssessment {self.program.student.name} - {self.assessment_type} - {self.assessment_date}>'


class TeacchSkillResponse(db.Model):
    """استجابات تقييم المهارات في برنامج تييش"""
    __tablename__ = 'teacch_skill_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('teacch_assessments.id'), nullable=False)
    skill_item_id = db.Column(db.Integer, db.ForeignKey('teacch_skill_items.id'), nullable=False)
    
    # الاستجابة
    performance_level = db.Column(db.String(20))  # emerging, developing, passing, not_applicable
    raw_score = db.Column(db.Integer)
    developmental_age = db.Column(db.Float)  # بالشهور
    
    # تفاصيل الأداء
    prompting_level = db.Column(db.String(50))  # independent, minimal, moderate, maximum
    consistency = db.Column(db.String(50))  # consistent, inconsistent, variable
    generalization = db.Column(db.String(50))  # across_settings, limited, none
    
    # الملاحظات
    behavioral_observations = db.Column(db.Text)
    communication_notes = db.Column(db.Text)
    sensory_considerations = db.Column(db.Text)
    
    # التحليل
    strengths_noted = db.Column(db.Text)
    challenges_identified = db.Column(db.Text)
    learning_style_observations = db.Column(db.Text)
    
    # التوصيات للمهارة
    teaching_strategies = db.Column(db.Text)
    visual_supports_needed = db.Column(db.Text)
    environmental_supports = db.Column(db.Text)
    practice_opportunities = db.Column(db.Text)
    
    # العلاقات
    assessment = db.relationship('TeacchAssessment', backref='skill_responses')
    skill_item = db.relationship('TeacchSkillItem', backref='responses')
    
    # فهرس مركب
    __table_args__ = (db.UniqueConstraint('assessment_id', 'skill_item_id', name='unique_teacch_skill_response'),)
    
    def __repr__(self):
        return f'<TeacchSkillResponse Assessment:{self.assessment_id} Skill:{self.skill_item.item_code} = {self.performance_level}>'


# ============================================================================
# ABLE PROGRAM - برنامج أبل للتوحد
# ============================================================================

class AbleProgram(db.Model):
    """برنامج أبل للتوحد"""
    __tablename__ = 'able_programs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات أساسية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    coordinator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # معلومات البرنامج
    program_phase = db.Column(db.String(50))  # assessment, intervention, maintenance, transition
    service_model = db.Column(db.String(50))  # individual, group, family_centered, community_based
    intensity_level = db.Column(db.String(20))  # intensive, moderate, maintenance
    
    # التقييم الوظيفي
    functional_assessment_date = db.Column(db.DateTime)
    behavioral_assessment_date = db.Column(db.DateTime)
    communication_assessment_date = db.Column(db.DateTime)
    
    # مجالات التركيز
    communication_focus = db.Column(db.Text)
    social_skills_focus = db.Column(db.Text)
    behavioral_focus = db.Column(db.Text)
    academic_focus = db.Column(db.Text)
    life_skills_focus = db.Column(db.Text)
    
    # الأهداف الوظيفية
    primary_functional_goals = db.Column(db.Text)
    secondary_functional_goals = db.Column(db.Text)
    family_priorities = db.Column(db.Text)
    
    # استراتيجيات التدخل
    aba_strategies = db.Column(db.Text)  # استراتيجيات تحليل السلوك التطبيقي
    communication_strategies = db.Column(db.Text)
    social_skills_strategies = db.Column(db.Text)
    behavioral_interventions = db.Column(db.Text)
    
    # البيئة والدعم
    environmental_modifications = db.Column(db.Text)
    assistive_technology = db.Column(db.Text)
    visual_supports = db.Column(db.Text)
    sensory_accommodations = db.Column(db.Text)
    
    # حالة البرنامج
    status = db.Column(db.String(20), default='active')
    completion_date = db.Column(db.DateTime)
    transition_planning = db.Column(db.Text)
    
    # الفريق والتعاون
    team_composition = db.Column(db.Text)
    family_involvement = db.Column(db.Text)
    school_collaboration = db.Column(db.Text)
    community_partnerships = db.Column(db.Text)
    
    # المراجعة والتقييم
    last_review_date = db.Column(db.DateTime)
    next_review_date = db.Column(db.DateTime)
    progress_summary = db.Column(db.Text)
    outcome_measures = db.Column(db.Text)
    
    # الملاحظات
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='able_programs')
    coordinator = db.relationship('User', backref='able_programs_coordinated')
    
    def __repr__(self):
        return f'<AbleProgram {self.student.name} - {self.program_phase}>'


class AbleFunctionalArea(db.Model):
    """المجالات الوظيفية في برنامج أبل"""
    __tablename__ = 'able_functional_areas'
    
    id = db.Column(db.Integer, primary_key=True)
    area_code = db.Column(db.String(10), unique=True, nullable=False)  # COM, SOC, BEH, ACA, LIFE
    area_name_ar = db.Column(db.String(100), nullable=False)
    area_name_en = db.Column(db.String(100))
    
    # تصنيف المجال
    functional_category = db.Column(db.String(50))  # essential, important, supplementary
    age_range = db.Column(db.String(50))
    
    # وصف المجال
    description = db.Column(db.Text)
    functional_importance = db.Column(db.Text)
    assessment_approach = db.Column(db.Text)
    intervention_principles = db.Column(db.Text)
    
    # معلومات إضافية
    color_code = db.Column(db.String(7))
    icon = db.Column(db.String(50))
    
    def __repr__(self):
        return f'<AbleFunctionalArea {self.area_code}: {self.area_name_ar}>'


class AbleFunctionalSkill(db.Model):
    """المهارات الوظيفية في برنامج أبل"""
    __tablename__ = 'able_functional_skills'
    
    id = db.Column(db.Integer, primary_key=True)
    skill_code = db.Column(db.String(20), nullable=False)  # COM-REQ-1, SOC-INT-5, etc.
    functional_area_id = db.Column(db.Integer, db.ForeignKey('able_functional_areas.id'), nullable=False)
    
    # وصف المهارة
    skill_description_ar = db.Column(db.Text, nullable=False)
    skill_description_en = db.Column(db.Text)
    
    # الخصائص الوظيفية
    functional_purpose = db.Column(db.Text)  # الغرض الوظيفي
    real_world_application = db.Column(db.Text)  # التطبيق في العالم الحقيقي
    prerequisite_skills = db.Column(db.Text)
    
    # معايير التقييم
    assessment_method = db.Column(db.Text)
    mastery_criteria = db.Column(db.Text)
    generalization_criteria = db.Column(db.Text)
    
    # استراتيجيات التعليم
    teaching_procedures = db.Column(db.Text)
    prompting_strategies = db.Column(db.Text)
    reinforcement_strategies = db.Column(db.Text)
    error_correction_procedures = db.Column(db.Text)
    
    # معلومات إضافية
    priority_level = db.Column(db.String(20))  # high, medium, low
    complexity_level = db.Column(db.String(20))  # basic, intermediate, advanced
    sequence_order = db.Column(db.Integer)
    
    # العلاقات
    functional_area = db.relationship('AbleFunctionalArea', backref='functional_skills')
    
    def __repr__(self):
        return f'<AbleFunctionalSkill {self.skill_code}: {self.functional_area.area_code}>'


class AbleAssessment(db.Model):
    """تقييم برنامج أبل"""
    __tablename__ = 'able_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('able_programs.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # معلومات التقييم
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50))  # functional, behavioral, communication, progress
    
    # النتائج الوظيفية
    functional_communication_level = db.Column(db.String(50))
    social_interaction_level = db.Column(db.String(50))
    behavioral_regulation_level = db.Column(db.String(50))
    academic_performance_level = db.Column(db.String(50))
    life_skills_level = db.Column(db.String(50))
    
    # التوصيات
    intervention_recommendations = db.Column(db.Text)
    family_training_recommendations = db.Column(db.Text)
    environmental_recommendations = db.Column(db.Text)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='draft')
    completed_at = db.Column(db.DateTime)
    
    # العلاقات
    program = db.relationship('AbleProgram', backref='assessments')
    assessor = db.relationship('User', backref='able_assessments_conducted')
    
    def __repr__(self):
        return f'<AbleAssessment {self.program.student.name} - {self.assessment_type} - {self.assessment_date}>'


class AbleFunctionalResponse(db.Model):
    """استجابات التقييم الوظيفي في برنامج أبل"""
    __tablename__ = 'able_functional_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('able_assessments.id'), nullable=False)
    functional_skill_id = db.Column(db.Integer, db.ForeignKey('able_functional_skills.id'), nullable=False)
    
    # مستوى الأداء الوظيفي
    independence_level = db.Column(db.String(50))  # independent, prompted, assisted, dependent
    consistency_level = db.Column(db.String(50))  # consistent, variable, inconsistent
    generalization_level = db.Column(db.String(50))  # generalized, limited, specific
    
    # الملاحظات الوظيفية
    functional_observations = db.Column(db.Text)
    environmental_factors = db.Column(db.Text)
    support_needs = db.Column(db.Text)
    
    # العلاقات
    assessment = db.relationship('AbleAssessment', backref='functional_responses')
    functional_skill = db.relationship('AbleFunctionalSkill', backref='responses')
    
    # فهرس مركب
    __table_args__ = (db.UniqueConstraint('assessment_id', 'functional_skill_id', name='unique_able_functional_response'),)
    
    def __repr__(self):
        return f'<AbleFunctionalResponse Assessment:{self.assessment_id} Skill:{self.functional_skill.skill_code} = {self.independence_level}>'


# ============================================================================
# SON-RISE PROGRAM - برنامج صن رايز للتوحد
# ============================================================================

class SonRiseProgram(db.Model):
    """برنامج صن رايز للتوحد"""
    __tablename__ = 'son_rise_programs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات أساسية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    coordinator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # فلسفة البرنامج
    program_philosophy = db.Column(db.Text)  # فلسفة البرنامج
    child_centered_approach = db.Column(db.Text)  # النهج المتمركز حول الطفل
    joining_strategy = db.Column(db.Text)  # استراتيجية الانضمام
    
    # البيئة العلاجية
    playroom_setup = db.Column(db.Text)  # إعداد غرفة اللعب
    environmental_control = db.Column(db.Text)  # التحكم البيئي
    distraction_elimination = db.Column(db.Text)  # إزالة المشتتات
    
    # مستوى التطور الحالي
    current_developmental_stage = db.Column(db.String(50))  # exclusive, ritualistic, flexible, interactive
    social_development_level = db.Column(db.String(50))
    communication_development_level = db.Column(db.String(50))
    flexibility_level = db.Column(db.String(50))
    
    # الأهداف التطويرية
    social_connection_goals = db.Column(db.Text)
    communication_goals = db.Column(db.Text)
    flexibility_goals = db.Column(db.Text)
    eye_contact_goals = db.Column(db.Text)
    attention_span_goals = db.Column(db.Text)
    
    # استراتيجيات التدخل
    joining_techniques = db.Column(db.Text)  # تقنيات الانضمام
    motivation_strategies = db.Column(db.Text)  # استراتيجيات التحفيز
    celebration_techniques = db.Column(db.Text)  # تقنيات الاحتفال
    requesting_strategies = db.Column(db.Text)  # استراتيجيات الطلب
    
    # الفريق والتدريب
    team_members = db.Column(db.Text)
    volunteer_coordinators = db.Column(db.Text)
    family_involvement = db.Column(db.Text)
    training_completed = db.Column(db.Text)
    
    # جدولة الجلسات
    session_hours_daily = db.Column(db.Integer)
    session_frequency = db.Column(db.String(50))
    session_duration = db.Column(db.Integer)  # بالدقائق
    
    # حالة البرنامج
    status = db.Column(db.String(20), default='active')
    completion_date = db.Column(db.DateTime)
    transition_planning = db.Column(db.Text)
    
    # المراجعة والتقييم
    last_review_date = db.Column(db.DateTime)
    next_review_date = db.Column(db.DateTime)
    progress_summary = db.Column(db.Text)
    breakthrough_moments = db.Column(db.Text)  # لحظات الاختراق
    
    # الملاحظات
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='son_rise_programs')
    coordinator = db.relationship('User', backref='son_rise_programs_coordinated')
    
    def __repr__(self):
        return f'<SonRiseProgram {self.student.name} - Stage: {self.current_developmental_stage}>'


class SonRiseDevelopmentalArea(db.Model):
    """مجالات التطور في برنامج صن رايز"""
    __tablename__ = 'son_rise_developmental_areas'
    
    id = db.Column(db.Integer, primary_key=True)
    area_code = db.Column(db.String(10), unique=True, nullable=False)  # SOC, COM, FLX, EYE, ATT
    area_name_ar = db.Column(db.String(100), nullable=False)
    area_name_en = db.Column(db.String(100))
    
    # خصائص المجال
    developmental_importance = db.Column(db.Text)
    assessment_criteria = db.Column(db.Text)
    intervention_approach = db.Column(db.Text)
    
    # معلومات إضافية
    color_code = db.Column(db.String(7))
    icon = db.Column(db.String(50))
    
    def __repr__(self):
        return f'<SonRiseDevelopmentalArea {self.area_code}: {self.area_name_ar}>'


class SonRiseSkill(db.Model):
    """مهارات برنامج صن رايز"""
    __tablename__ = 'son_rise_skills'
    
    id = db.Column(db.Integer, primary_key=True)
    skill_code = db.Column(db.String(20), nullable=False)
    developmental_area_id = db.Column(db.Integer, db.ForeignKey('son_rise_developmental_areas.id'), nullable=False)
    
    # وصف المهارة
    skill_description_ar = db.Column(db.Text, nullable=False)
    skill_description_en = db.Column(db.Text)
    
    # مستوى التطور
    developmental_stage = db.Column(db.String(50))  # exclusive, ritualistic, flexible, interactive
    complexity_level = db.Column(db.String(20))  # basic, intermediate, advanced
    
    # معايير التقييم
    assessment_method = db.Column(db.Text)
    observation_guidelines = db.Column(db.Text)
    progress_indicators = db.Column(db.Text)
    
    # استراتيجيات التدخل
    joining_strategies = db.Column(db.Text)
    motivation_techniques = db.Column(db.Text)
    celebration_methods = db.Column(db.Text)
    
    # معلومات إضافية
    sequence_order = db.Column(db.Integer)
    prerequisite_skills = db.Column(db.Text)
    
    # العلاقات
    developmental_area = db.relationship('SonRiseDevelopmentalArea', backref='skills')
    
    def __repr__(self):
        return f'<SonRiseSkill {self.skill_code}: {self.developmental_area.area_code}>'


class SonRiseAssessment(db.Model):
    """تقييم برنامج صن رايز"""
    __tablename__ = 'son_rise_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('son_rise_programs.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # معلومات التقييم
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    assessment_type = db.Column(db.String(50))  # initial, progress, comprehensive, transition
    
    # المستوى التطويري الحالي
    overall_developmental_stage = db.Column(db.String(50))
    social_development_stage = db.Column(db.String(50))
    communication_stage = db.Column(db.String(50))
    flexibility_stage = db.Column(db.String(50))
    
    # تقييم التفاعل الاجتماعي
    eye_contact_quality = db.Column(db.String(50))
    social_initiation = db.Column(db.String(50))
    response_to_others = db.Column(db.String(50))
    joint_attention = db.Column(db.String(50))
    
    # تقييم التواصل
    verbal_communication = db.Column(db.String(50))
    nonverbal_communication = db.Column(db.String(50))
    requesting_skills = db.Column(db.String(50))
    expressive_language = db.Column(db.String(50))
    
    # تقييم المرونة
    adaptation_to_change = db.Column(db.String(50))
    variety_in_play = db.Column(db.String(50))
    response_to_requests = db.Column(db.String(50))
    
    # الملاحظات السلوكية
    attention_span = db.Column(db.String(50))
    motivation_level = db.Column(db.String(50))
    self_stimulating_behaviors = db.Column(db.Text)
    challenging_behaviors = db.Column(db.Text)
    
    # التوصيات
    intervention_priorities = db.Column(db.Text)
    joining_recommendations = db.Column(db.Text)
    motivation_strategies = db.Column(db.Text)
    environmental_modifications = db.Column(db.Text)
    family_guidance = db.Column(db.Text)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='draft')
    completed_at = db.Column(db.DateTime)
    
    # العلاقات
    program = db.relationship('SonRiseProgram', backref='assessments')
    assessor = db.relationship('User', backref='son_rise_assessments_conducted')
    
    def __repr__(self):
        return f'<SonRiseAssessment {self.program.student.name} - {self.assessment_type} - {self.assessment_date}>'


class SonRiseSkillResponse(db.Model):
    """استجابات تقييم المهارات في برنامج صن رايز"""
    __tablename__ = 'son_rise_skill_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('son_rise_assessments.id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('son_rise_skills.id'), nullable=False)
    
    # مستوى الأداء
    performance_level = db.Column(db.String(50))  # not_present, emerging, developing, mastered
    consistency = db.Column(db.String(50))  # never, rarely, sometimes, often, always
    motivation_level = db.Column(db.String(50))  # low, moderate, high
    
    # ملاحظات التفاعل
    joining_success = db.Column(db.String(50))  # unsuccessful, partial, successful
    child_initiation = db.Column(db.String(50))
    response_to_joining = db.Column(db.String(50))
    celebration_response = db.Column(db.String(50))
    
    # الملاحظات
    behavioral_observations = db.Column(db.Text)
    breakthrough_moments = db.Column(db.Text)
    challenges_noted = db.Column(db.Text)
    
    # التوصيات للمهارة
    intervention_strategies = db.Column(db.Text)
    joining_techniques = db.Column(db.Text)
    motivation_methods = db.Column(db.Text)
    
    # العلاقات
    assessment = db.relationship('SonRiseAssessment', backref='skill_responses')
    skill = db.relationship('SonRiseSkill', backref='responses')
    
    # فهرس مركب
    __table_args__ = (db.UniqueConstraint('assessment_id', 'skill_id', name='unique_son_rise_skill_response'),)
    
    def __repr__(self):
        return f'<SonRiseSkillResponse Assessment:{self.assessment_id} Skill:{self.skill.skill_code} = {self.performance_level}>'


# ============================================================================
# BURKS BEHAVIOR RATING SCALES - مقياس بيركس لتقييم السلوك
# ============================================================================

class BurksAssessment(db.Model):
    """مقياس بيركس لتقييم السلوك"""
    __tablename__ = 'burks_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات أساسية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # معلومات التقييم
    assessment_version = db.Column(db.String(20))  # BBRS-2
    rater_type = db.Column(db.String(50))  # parent, teacher, self, clinician
    rater_relationship = db.Column(db.String(100))
    
    # معلومات الطفل
    child_age_months = db.Column(db.Integer)
    child_grade = db.Column(db.String(20))
    assessment_setting = db.Column(db.String(100))
    
    # ظروف التقييم
    assessment_duration = db.Column(db.Integer)  # بالدقائق
    observation_period = db.Column(db.String(50))  # recent_week, recent_month, recent_6months
    assessment_purpose = db.Column(db.Text)
    
    # الدرجات الخام للمقاييس الفرعية
    disruptive_behavior_raw = db.Column(db.Integer)
    impulse_control_raw = db.Column(db.Integer)
    attention_problems_raw = db.Column(db.Integer)
    academic_performance_raw = db.Column(db.Integer)
    social_withdrawal_raw = db.Column(db.Integer)
    poor_anger_control_raw = db.Column(db.Integer)
    aggressive_behavior_raw = db.Column(db.Integer)
    peer_relations_raw = db.Column(db.Integer)
    self_concept_raw = db.Column(db.Integer)
    anxiety_raw = db.Column(db.Integer)
    depression_raw = db.Column(db.Integer)
    sense_of_inadequacy_raw = db.Column(db.Integer)
    
    # الدرجات المعيارية (T-Scores)
    disruptive_behavior_t = db.Column(db.Float)
    impulse_control_t = db.Column(db.Float)
    attention_problems_t = db.Column(db.Float)
    academic_performance_t = db.Column(db.Float)
    social_withdrawal_t = db.Column(db.Float)
    poor_anger_control_t = db.Column(db.Float)
    aggressive_behavior_t = db.Column(db.Float)
    peer_relations_t = db.Column(db.Float)
    self_concept_t = db.Column(db.Float)
    anxiety_t = db.Column(db.Float)
    depression_t = db.Column(db.Float)
    sense_of_inadequacy_t = db.Column(db.Float)
    
    # المؤشرات المركبة
    externalizing_problems_composite = db.Column(db.Float)
    internalizing_problems_composite = db.Column(db.Float)
    overall_problem_index = db.Column(db.Float)
    
    # مستويات الخطر
    disruptive_behavior_risk = db.Column(db.String(20))  # low, moderate, high, very_high
    impulse_control_risk = db.Column(db.String(20))
    attention_problems_risk = db.Column(db.String(20))
    academic_performance_risk = db.Column(db.String(20))
    social_withdrawal_risk = db.Column(db.String(20))
    poor_anger_control_risk = db.Column(db.String(20))
    aggressive_behavior_risk = db.Column(db.String(20))
    peer_relations_risk = db.Column(db.String(20))
    self_concept_risk = db.Column(db.String(20))
    anxiety_risk = db.Column(db.String(20))
    depression_risk = db.Column(db.String(20))
    sense_of_inadequacy_risk = db.Column(db.String(20))
    
    # التفسير الإكلينيكي
    clinical_interpretation = db.Column(db.Text)
    behavioral_profile = db.Column(db.Text)
    strengths_identified = db.Column(db.Text)
    areas_of_concern = db.Column(db.Text)
    
    # التوصيات
    intervention_recommendations = db.Column(db.Text)
    behavioral_strategies = db.Column(db.Text)
    academic_accommodations = db.Column(db.Text)
    social_emotional_support = db.Column(db.Text)
    family_recommendations = db.Column(db.Text)
    
    # المتابعة
    follow_up_recommendations = db.Column(db.Text)
    reassessment_timeline = db.Column(db.String(50))
    
    # حالة التقييم
    status = db.Column(db.String(20), default='draft')
    completed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # الملاحظات
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='burks_assessments')
    assessor = db.relationship('User', foreign_keys=[assessor_id], backref='burks_assessments_conducted')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='burks_assessments_reviewed')
    
    def __repr__(self):
        return f'<BurksAssessment {self.student.name} - {self.rater_type} - {self.assessment_date}>'


class BurksScale(db.Model):
    """مقاييس بيركس الفرعية"""
    __tablename__ = 'burks_scales'
    
    id = db.Column(db.Integer, primary_key=True)
    scale_code = db.Column(db.String(10), unique=True, nullable=False)
    scale_name_ar = db.Column(db.String(100), nullable=False)
    scale_name_en = db.Column(db.String(100))
    
    # وصف المقياس
    description = db.Column(db.Text)
    behavioral_indicators = db.Column(db.Text)
    clinical_significance = db.Column(db.Text)
    
    # معلومات إضافية
    scale_category = db.Column(db.String(50))  # externalizing, internalizing, academic, social
    color_code = db.Column(db.String(7))
    
    def __repr__(self):
        return f'<BurksScale {self.scale_code}: {self.scale_name_ar}>'


class BurksItem(db.Model):
    """بنود مقياس بيركس"""
    __tablename__ = 'burks_items'
    
    id = db.Column(db.Integer, primary_key=True)
    item_number = db.Column(db.Integer, nullable=False)
    scale_id = db.Column(db.Integer, db.ForeignKey('burks_scales.id'), nullable=False)
    
    # نص البند
    item_text_ar = db.Column(db.Text, nullable=False)
    item_text_en = db.Column(db.Text)
    
    # معلومات البند
    reverse_scored = db.Column(db.Boolean, default=False)
    item_weight = db.Column(db.Float, default=1.0)
    
    # العلاقات
    scale = db.relationship('BurksScale', backref='items')
    
    def __repr__(self):
        return f'<BurksItem {self.item_number}: {self.scale.scale_code}>'


class BurksItemResponse(db.Model):
    """استجابات بنود مقياس بيركس"""
    __tablename__ = 'burks_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('burks_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('burks_items.id'), nullable=False)
    
    # الاستجابة
    response_value = db.Column(db.Integer)  # 1=Never, 2=Sometimes, 3=Often, 4=Always
    response_text = db.Column(db.String(50))
    
    # ملاحظات
    item_notes = db.Column(db.Text)
    
    # العلاقات
    assessment = db.relationship('BurksAssessment', backref='item_responses')
    item = db.relationship('BurksItem', backref='responses')
    
    # فهرس مركب
    __table_args__ = (db.UniqueConstraint('assessment_id', 'item_id', name='unique_burks_item_response'),)
    
    def __repr__(self):
        return f'<BurksItemResponse Assessment:{self.assessment_id} Item:{self.item.item_number} = {self.response_value}>'


# ============================================================================
# BAYLEY SCALES OF INFANT AND TODDLER DEVELOPMENT - مقاييس بيللي لنمو الأطفال
# ============================================================================

class BayleyAssessment(db.Model):
    """مقاييس بيللي لنمو الأطفال"""
    __tablename__ = 'bayley_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات أساسية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # معلومات التقييم
    assessment_version = db.Column(db.String(20))  # BSID-III, BSID-IV
    child_age_months = db.Column(db.Integer)
    child_age_days = db.Column(db.Integer)
    corrected_age_months = db.Column(db.Integer)  # للأطفال المولودين مبكراً
    
    # ظروف التقييم
    assessment_setting = db.Column(db.String(100))
    assessment_duration = db.Column(db.Integer)  # بالدقائق
    breaks_taken = db.Column(db.Integer)
    caregiver_present = db.Column(db.Boolean, default=True)
    
    # الملاحظات السلوكية العامة
    cooperation_level = db.Column(db.String(50))  # excellent, good, fair, poor
    attention_span = db.Column(db.String(50))
    activity_level = db.Column(db.String(50))
    fearfulness = db.Column(db.String(50))
    
    # المقياس المعرفي (Cognitive Scale)
    cognitive_raw_score = db.Column(db.Integer)
    cognitive_scaled_score = db.Column(db.Integer)
    cognitive_composite_score = db.Column(db.Integer)
    cognitive_percentile = db.Column(db.Integer)
    cognitive_age_equivalent = db.Column(db.Integer)  # بالشهور
    cognitive_classification = db.Column(db.String(50))  # very_superior, superior, high_average, average, low_average, borderline, extremely_low
    
    # مقياس اللغة (Language Scale)
    language_raw_score = db.Column(db.Integer)
    language_scaled_score = db.Column(db.Integer)
    language_composite_score = db.Column(db.Integer)
    language_percentile = db.Column(db.Integer)
    language_age_equivalent = db.Column(db.Integer)
    language_classification = db.Column(db.String(50))
    
    # مقياس اللغة الاستقبالية
    receptive_communication_raw = db.Column(db.Integer)
    receptive_communication_scaled = db.Column(db.Integer)
    receptive_communication_age_equivalent = db.Column(db.Integer)
    
    # مقياس اللغة التعبيرية
    expressive_communication_raw = db.Column(db.Integer)
    expressive_communication_scaled = db.Column(db.Integer)
    expressive_communication_age_equivalent = db.Column(db.Integer)
    
    # المقياس الحركي (Motor Scale)
    motor_raw_score = db.Column(db.Integer)
    motor_scaled_score = db.Column(db.Integer)
    motor_composite_score = db.Column(db.Integer)
    motor_percentile = db.Column(db.Integer)
    motor_age_equivalent = db.Column(db.Integer)
    motor_classification = db.Column(db.String(50))
    
    # المهارات الحركية الكبرى
    gross_motor_raw = db.Column(db.Integer)
    gross_motor_scaled = db.Column(db.Integer)
    gross_motor_age_equivalent = db.Column(db.Integer)
    
    # المهارات الحركية الدقيقة
    fine_motor_raw = db.Column(db.Integer)
    fine_motor_scaled = db.Column(db.Integer)
    fine_motor_age_equivalent = db.Column(db.Integer)
    
    # مقياس السلوك الاجتماعي-العاطفي (Social-Emotional Scale)
    social_emotional_raw = db.Column(db.Integer)
    social_emotional_scaled = db.Column(db.Integer)
    social_emotional_composite = db.Column(db.Integer)
    social_emotional_percentile = db.Column(db.Integer)
    social_emotional_classification = db.Column(db.String(50))
    
    # مقياس السلوك التكيفي (Adaptive Behavior Scale)
    adaptive_behavior_raw = db.Column(db.Integer)
    adaptive_behavior_scaled = db.Column(db.Integer)
    adaptive_behavior_composite = db.Column(db.Integer)
    adaptive_behavior_percentile = db.Column(db.Integer)
    adaptive_behavior_classification = db.Column(db.String(50))
    
    # المؤشرات الإضافية
    general_adaptive_composite = db.Column(db.Integer)  # GAC
    overall_developmental_quotient = db.Column(db.Float)
    
    # تحليل نقاط القوة والضعف
    cognitive_strengths = db.Column(db.Text)
    cognitive_weaknesses = db.Column(db.Text)
    language_strengths = db.Column(db.Text)
    language_weaknesses = db.Column(db.Text)
    motor_strengths = db.Column(db.Text)
    motor_weaknesses = db.Column(db.Text)
    
    # التفسير الإكلينيكي
    clinical_interpretation = db.Column(db.Text)
    developmental_profile = db.Column(db.Text)
    risk_factors_identified = db.Column(db.Text)
    protective_factors = db.Column(db.Text)
    
    # التوصيات
    intervention_recommendations = db.Column(db.Text)
    early_intervention_needs = db.Column(db.Text)
    family_support_recommendations = db.Column(db.Text)
    educational_recommendations = db.Column(db.Text)
    therapeutic_recommendations = db.Column(db.Text)
    
    # المتابعة
    follow_up_recommendations = db.Column(db.Text)
    reassessment_timeline = db.Column(db.String(50))
    monitoring_priorities = db.Column(db.Text)
    
    # حالة التقييم
    status = db.Column(db.String(20), default='draft')
    completed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    
    # الملاحظات
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='bayley_assessments')
    assessor = db.relationship('User', foreign_keys=[assessor_id], backref='bayley_assessments_conducted')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='bayley_assessments_reviewed')
    
    def __repr__(self):
        return f'<BayleyAssessment {self.student.name} - Age: {self.child_age_months}m - {self.assessment_date}>'


class BayleyDomain(db.Model):
    """مجالات مقاييس بيللي"""
    __tablename__ = 'bayley_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    domain_code = db.Column(db.String(10), unique=True, nullable=False)  # COG, LAN, MOT, SE, AB
    domain_name_ar = db.Column(db.String(100), nullable=False)
    domain_name_en = db.Column(db.String(100))
    
    # خصائص المجال
    age_range_start = db.Column(db.Integer)  # بالشهور
    age_range_end = db.Column(db.Integer)
    domain_description = db.Column(db.Text)
    developmental_importance = db.Column(db.Text)
    
    # معلومات التقييم
    administration_time = db.Column(db.Integer)  # بالدقائق
    materials_needed = db.Column(db.Text)
    scoring_method = db.Column(db.Text)
    
    # معلومات إضافية
    color_code = db.Column(db.String(7))
    icon = db.Column(db.String(50))
    
    def __repr__(self):
        return f'<BayleyDomain {self.domain_code}: {self.domain_name_ar}>'


class BayleyItem(db.Model):
    """بنود مقاييس بيللي"""
    __tablename__ = 'bayley_items'
    
    id = db.Column(db.Integer, primary_key=True)
    item_number = db.Column(db.Integer, nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey('bayley_domains.id'), nullable=False)
    
    # وصف البند
    item_description_ar = db.Column(db.Text, nullable=False)
    item_description_en = db.Column(db.Text)
    
    # معلومات البند
    age_range_start = db.Column(db.Integer)  # بالشهور
    age_range_end = db.Column(db.Integer)
    difficulty_level = db.Column(db.String(20))  # easy, moderate, difficult
    
    # معايير التقييم
    administration_instructions = db.Column(db.Text)
    scoring_criteria = db.Column(db.Text)
    materials_required = db.Column(db.Text)
    time_limit = db.Column(db.Integer)  # بالثواني
    
    # معايير النجاح
    pass_criteria = db.Column(db.Text)
    fail_criteria = db.Column(db.Text)
    discontinue_rule = db.Column(db.Text)
    
    # معلومات إضافية
    sequence_order = db.Column(db.Integer)
    basal_item = db.Column(db.Boolean, default=False)
    ceiling_item = db.Column(db.Boolean, default=False)
    
    # العلاقات
    domain = db.relationship('BayleyDomain', backref='items')
    
    def __repr__(self):
        return f'<BayleyItem {self.item_number}: {self.domain.domain_code}>'


class BayleyItemResponse(db.Model):
    """استجابات بنود مقاييس بيللي"""
    __tablename__ = 'bayley_item_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('bayley_assessments.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('bayley_items.id'), nullable=False)
    
    # الاستجابة
    response_score = db.Column(db.Integer)  # 0=Fail, 1=Pass
    response_quality = db.Column(db.String(50))  # clear_pass, marginal_pass, clear_fail
    
    # تفاصيل الأداء
    attempts_made = db.Column(db.Integer)
    time_taken = db.Column(db.Integer)  # بالثواني
    prompting_needed = db.Column(db.Boolean, default=False)
    modification_used = db.Column(db.Text)
    
    # الملاحظات السلوكية
    behavioral_observations = db.Column(db.Text)
    attention_during_item = db.Column(db.String(50))
    cooperation_level = db.Column(db.String(50))
    
    # ملاحظات إضافية
    item_notes = db.Column(db.Text)
    examiner_confidence = db.Column(db.String(50))  # high, medium, low
    
    # العلاقات
    assessment = db.relationship('BayleyAssessment', backref='item_responses')
    item = db.relationship('BayleyItem', backref='responses')
    
    # فهرس مركب
    __table_args__ = (db.UniqueConstraint('assessment_id', 'item_id', name='unique_bayley_item_response'),)
    
    def __repr__(self):
        return f'<BayleyItemResponse Assessment:{self.assessment_id} Item:{self.item.item_number} = {self.response_score}>'


class BayleyBehavioralObservation(db.Model):
    """الملاحظات السلوكية في مقاييس بيللي"""
    __tablename__ = 'bayley_behavioral_observations'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('bayley_assessments.id'), nullable=False)
    
    # سلوكيات الانتباه
    attention_to_examiner = db.Column(db.String(50))  # consistently, usually, occasionally, rarely
    attention_to_materials = db.Column(db.String(50))
    distractibility = db.Column(db.String(50))
    
    # سلوكيات التفاعل الاجتماعي
    social_engagement = db.Column(db.String(50))
    eye_contact = db.Column(db.String(50))
    social_referencing = db.Column(db.String(50))
    response_to_praise = db.Column(db.String(50))
    
    # السلوكيات العاطفية
    emotional_regulation = db.Column(db.String(50))
    frustration_tolerance = db.Column(db.String(50))
    mood_during_assessment = db.Column(db.String(50))
    
    # السلوكيات الحركية
    activity_level = db.Column(db.String(50))  # hypoactive, appropriate, hyperactive
    motor_coordination = db.Column(db.String(50))
    fine_motor_control = db.Column(db.String(50))
    
    # سلوكيات التواصل
    vocalization_frequency = db.Column(db.String(50))
    gesture_use = db.Column(db.String(50))
    response_to_verbal_direction = db.Column(db.String(50))
    
    # سلوكيات أخرى
    persistence_with_tasks = db.Column(db.String(50))
    problem_solving_approach = db.Column(db.String(50))
    self_soothing_behaviors = db.Column(db.Text)
    
    # ملاحظات عامة
    overall_behavioral_impression = db.Column(db.Text)
    factors_affecting_performance = db.Column(db.Text)
    validity_of_results = db.Column(db.String(50))  # valid, questionable, invalid
    
    # العلاقات
    assessment = db.relationship('BayleyAssessment', backref='behavioral_observations')
    
    def __repr__(self):
        return f'<BayleyBehavioralObservation Assessment:{self.assessment_id}>'

# ==================== Staff Program Assignment Models ====================

class StaffProgramAssignment(db.Model):
    """تخصيص الموظفين والأخصائيين للبرامج"""
    __tablename__ = 'staff_program_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    assignment_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active')
    responsibilities = db.Column(db.Text)
    workload_percentage = db.Column(db.Float, default=100.0)
    notes = db.Column(db.Text)
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    staff = db.relationship('VolunteerStaff', backref='program_assignments')
    program = db.relationship('RehabilitationProgram', backref='staff_assignments')
    assigner = db.relationship('User', backref='program_assignments_made')

class StaffAssessmentAssignment(db.Model):
    """تخصيص الموظفين للمقاييس والتقييمات"""
    __tablename__ = 'staff_assessment_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    assessment_type = db.Column(db.String(100), nullable=False)
    specialization_required = db.Column(db.String(100))
    certification_level = db.Column(db.String(50))
    assignment_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active')
    max_assessments_per_month = db.Column(db.Integer, default=10)
    current_workload = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    staff = db.relationship('VolunteerStaff', backref='assessment_assignments')
    assigner = db.relationship('User', backref='assessment_assignments_made')

# ==================== Student Program Assignment Models ====================

class StudentProgramEnrollment(db.Model):
    """تسجيل الطلاب في البرامج التأهيلية"""
    __tablename__ = 'student_program_enrollments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    enrollment_date = db.Column(db.Date, nullable=False)
    expected_completion_date = db.Column(db.Date)
    actual_completion_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active')
    priority_level = db.Column(db.String(20), default='medium')
    enrollment_reason = db.Column(db.Text)
    goals = db.Column(db.Text)
    progress_notes = db.Column(db.Text)
    completion_percentage = db.Column(db.Float, default=0.0)
    assigned_therapist_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'))
    parent_consent = db.Column(db.Boolean, default=False)
    medical_clearance = db.Column(db.Boolean, default=False)
    enrolled_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student = db.relationship('Student', backref='program_enrollments')
    program = db.relationship('RehabilitationProgram', backref='student_enrollments')
    assigned_therapist = db.relationship('VolunteerStaff', backref='assigned_students')
    enrolling_user = db.relationship('User', backref='student_enrollments_made')

class StudentAssessmentSchedule(db.Model):
    """جدولة التقييمات للطلاب"""
    __tablename__ = 'student_assessment_schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessment_type = db.Column(db.String(100), nullable=False)
    scheduled_date = db.Column(db.Date, nullable=False)
    scheduled_time = db.Column(db.Time)
    assigned_assessor_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    location = db.Column(db.String(100))
    status = db.Column(db.String(20), default='scheduled')
    priority = db.Column(db.String(20), default='medium')
    assessment_reason = db.Column(db.Text)
    special_instructions = db.Column(db.Text)
    estimated_duration = db.Column(db.Integer, default=60)
    parent_notification_sent = db.Column(db.Boolean, default=False)
    reminder_sent = db.Column(db.Boolean, default=False)
    actual_start_time = db.Column(db.DateTime)
    actual_end_time = db.Column(db.DateTime)
    completion_notes = db.Column(db.Text)
    scheduled_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student = db.relationship('Student', backref='assessment_schedules')
    assigned_assessor = db.relationship('VolunteerStaff', backref='scheduled_assessments')
    scheduler = db.relationship('User', backref='assessments_scheduled')

class StudentSkillGoal(db.Model):
    """أهداف المهارات للطلاب"""
    __tablename__ = 'student_skill_goals'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id'), nullable=False)
    enrollment_id = db.Column(db.Integer, db.ForeignKey('student_program_enrollments.id'))
    goal_description = db.Column(db.Text, nullable=False)
    target_date = db.Column(db.Date, nullable=False)
    priority_level = db.Column(db.String(20), default='medium')
    current_level = db.Column(db.String(20), default='not_started')
    target_level = db.Column(db.String(20), default='mastered')
    success_criteria = db.Column(db.Text)
    teaching_strategies = db.Column(db.Text)
    materials_needed = db.Column(db.Text)
    frequency_per_week = db.Column(db.Integer, default=3)
    duration_per_session = db.Column(db.Integer, default=15)
    progress_tracking_method = db.Column(db.String(100))
    baseline_data = db.Column(db.Text)
    current_data = db.Column(db.Text)
    status = db.Column(db.String(20), default='active')
    assigned_therapist_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'))
    parent_involvement = db.Column(db.Text)
    home_practice_activities = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student = db.relationship('Student', backref='skill_goals')
    skill = db.relationship('Skill', backref='student_goals')
    enrollment = db.relationship('StudentProgramEnrollment', backref='skill_goals')
    assigned_therapist = db.relationship('VolunteerStaff', backref='assigned_skill_goals')
    creator = db.relationship('User', backref='skill_goals_created')

# نماذج الذكاء الاصطناعي للبرامج والمقاييس
class ProgramAIAnalysis(db.Model):
    """تحليل الذكاء الاصطناعي للبرامج التأهيلية"""
    __tablename__ = 'program_ai_analysis'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    analysis_type = db.Column(db.String(50), nullable=False)  # effectiveness, optimization, prediction, recommendation
    analysis_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # نتائج التحليل
    effectiveness_score = db.Column(db.Float)  # درجة الفعالية (0-100)
    completion_rate = db.Column(db.Float)  # معدل الإكمال
    satisfaction_score = db.Column(db.Float)  # درجة الرضا
    improvement_rate = db.Column(db.Float)  # معدل التحسن
    
    # التنبؤات
    predicted_success_rate = db.Column(db.Float)  # معدل النجاح المتوقع
    predicted_completion_time = db.Column(db.Integer)  # الوقت المتوقع للإكمال (بالأيام)
    risk_factors = db.Column(db.Text)  # عوامل الخطر (JSON)
    
    # التوصيات
    recommendations = db.Column(db.Text)  # التوصيات (JSON)
    optimization_suggestions = db.Column(db.Text)  # اقتراحات التحسين (JSON)
    resource_requirements = db.Column(db.Text)  # متطلبات الموارد (JSON)
    
    # البيانات الإضافية
    analysis_data = db.Column(db.Text)  # بيانات التحليل التفصيلية (JSON)
    confidence_level = db.Column(db.Float)  # مستوى الثقة في التحليل
    model_version = db.Column(db.String(20))  # إصدار نموذج الذكاء الاصطناعي
    
    # معلومات التتبع
    analyzed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    program = db.relationship('RehabilitationProgram', backref='ai_analyses')
    analyzer = db.relationship('User', backref='program_analyses')

class AssessmentAIAnalysis(db.Model):
    """تحليل الذكاء الاصطناعي للمقاييس والتقييمات"""
    __tablename__ = 'assessment_ai_analysis'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_assessments.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    analysis_type = db.Column(db.String(50), nullable=False)  # pattern_analysis, progress_prediction, recommendation
    analysis_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # تحليل الأنماط
    performance_patterns = db.Column(db.Text)  # أنماط الأداء (JSON)
    strength_areas = db.Column(db.Text)  # مناطق القوة (JSON)
    weakness_areas = db.Column(db.Text)  # مناطق الضعف (JSON)
    learning_style = db.Column(db.String(50))  # نمط التعلم المفضل
    
    # التنبؤات
    predicted_improvement = db.Column(db.Float)  # التحسن المتوقع
    predicted_timeline = db.Column(db.Integer)  # الجدول الزمني المتوقع (بالأسابيع)
    success_probability = db.Column(db.Float)  # احتمالية النجاح
    intervention_needs = db.Column(db.Text)  # احتياجات التدخل (JSON)
    
    # التوصيات الشخصية
    personalized_goals = db.Column(db.Text)  # الأهداف الشخصية (JSON)
    recommended_activities = db.Column(db.Text)  # الأنشطة المقترحة (JSON)
    therapy_modifications = db.Column(db.Text)  # تعديلات العلاج (JSON)
    support_strategies = db.Column(db.Text)  # استراتيجيات الدعم (JSON)
    
    # مؤشرات الأداء
    current_level = db.Column(db.String(20))  # المستوى الحالي
    target_level = db.Column(db.String(20))  # المستوى المستهدف
    progress_rate = db.Column(db.Float)  # معدل التقدم
    engagement_score = db.Column(db.Float)  # درجة المشاركة
    
    # البيانات التحليلية
    analysis_details = db.Column(db.Text)  # تفاصيل التحليل (JSON)
    comparison_data = db.Column(db.Text)  # بيانات المقارنة (JSON)
    confidence_score = db.Column(db.Float)  # درجة الثقة
    model_accuracy = db.Column(db.Float)  # دقة النموذج
    
    # معلومات التتبع
    analyzed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    assessment = db.relationship('RehabilitationAssessment', backref='ai_analyses')
    student = db.relationship('Student', backref='assessment_analyses')
    analyzer = db.relationship('User', backref='assessment_analyses_created')

class ProgramOptimizationSuggestion(db.Model):
    """اقتراحات تحسين البرامج بالذكاء الاصطناعي"""
    __tablename__ = 'program_optimization_suggestions'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    suggestion_type = db.Column(db.String(50), nullable=False)  # content, schedule, resources, methodology
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    
    # تفاصيل الاقتراح
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    rationale = db.Column(db.Text)  # المبرر العلمي
    expected_impact = db.Column(db.Text)  # التأثير المتوقع
    
    # التنفيذ
    implementation_steps = db.Column(db.Text)  # خطوات التنفيذ (JSON)
    required_resources = db.Column(db.Text)  # الموارد المطلوبة (JSON)
    estimated_cost = db.Column(db.Float)  # التكلفة المقدرة
    implementation_time = db.Column(db.Integer)  # وقت التنفيذ (بالأيام)
    
    # المقاييس والمؤشرات
    success_metrics = db.Column(db.Text)  # مقاييس النجاح (JSON)
    kpi_targets = db.Column(db.Text)  # أهداف مؤشرات الأداء (JSON)
    monitoring_plan = db.Column(db.Text)  # خطة المراقبة (JSON)
    
    # الحالة والتتبع
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, implemented
    approval_date = db.Column(db.DateTime)
    implementation_date = db.Column(db.DateTime)
    completion_date = db.Column(db.DateTime)
    
    # التقييم
    effectiveness_rating = db.Column(db.Float)  # تقييم الفعالية بعد التنفيذ
    feedback = db.Column(db.Text)  # التغذية الراجعة
    lessons_learned = db.Column(db.Text)  # الدروس المستفادة
    
    # معلومات التتبع
    suggested_by_ai = db.Column(db.Boolean, default=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    program = db.relationship('RehabilitationProgram', backref='optimization_suggestions')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='reviewed_suggestions')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='approved_suggestions')

class AssessmentInsight(db.Model):
    """رؤى ذكية من التقييمات"""
    __tablename__ = 'assessment_insights'
    
    id = db.Column(db.Integer, primary_key=True)
    insight_type = db.Column(db.String(50), nullable=False)  # trend, pattern, anomaly, prediction
    category = db.Column(db.String(50), nullable=False)  # individual, group, program, system
    
    # نطاق الرؤية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'))  # للرؤى الفردية
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'))  # للرؤى البرنامجية
    assessment_type = db.Column(db.String(50))  # نوع التقييم
    
    # محتوى الرؤية
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    key_findings = db.Column(db.Text)  # النتائج الرئيسية (JSON)
    statistical_data = db.Column(db.Text)  # البيانات الإحصائية (JSON)
    
    # الأهمية والتأثير
    importance_score = db.Column(db.Float)  # درجة الأهمية (0-100)
    confidence_level = db.Column(db.Float)  # مستوى الثقة (0-100)
    potential_impact = db.Column(db.String(20))  # low, medium, high
    urgency_level = db.Column(db.String(20))  # low, medium, high, critical
    
    # التوصيات والإجراءات
    recommended_actions = db.Column(db.Text)  # الإجراءات المقترحة (JSON)
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.DateTime)
    
    # البيانات المرجعية
    data_sources = db.Column(db.Text)  # مصادر البيانات (JSON)
    analysis_period = db.Column(db.String(50))  # فترة التحليل
    sample_size = db.Column(db.Integer)  # حجم العينة
    
    # الحالة والتتبع
    status = db.Column(db.String(20), default='active')  # active, archived, acted_upon
    viewed_by = db.Column(db.Text)  # المستخدمون الذين شاهدوا الرؤية (JSON)
    action_taken = db.Column(db.Text)  # الإجراءات المتخذة
    
    # معلومات التتبع
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)  # تاريخ انتهاء صلاحية الرؤية
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='assessment_insights')
    program = db.relationship('RehabilitationProgram', backref='assessment_insights')

class ProgramPerformanceMetrics(db.Model):
    """مقاييس أداء البرامج المحسوبة بالذكاء الاصطناعي"""
    __tablename__ = 'program_performance_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    metric_date = db.Column(db.Date, default=datetime.utcnow().date, nullable=False)
    calculation_period = db.Column(db.String(20), nullable=False)  # daily, weekly, monthly, quarterly
    
    # مقاييس الأداء الأساسية
    enrollment_count = db.Column(db.Integer, default=0)
    completion_rate = db.Column(db.Float, default=0.0)
    dropout_rate = db.Column(db.Float, default=0.0)
    average_progress = db.Column(db.Float, default=0.0)
    satisfaction_score = db.Column(db.Float, default=0.0)
    
    # مقاييس الجودة
    goal_achievement_rate = db.Column(db.Float, default=0.0)
    skill_improvement_rate = db.Column(db.Float, default=0.0)
    therapy_effectiveness = db.Column(db.Float, default=0.0)
    parent_satisfaction = db.Column(db.Float, default=0.0)
    
    # مقاييس الكفاءة
    resource_utilization = db.Column(db.Float, default=0.0)
    cost_per_student = db.Column(db.Float, default=0.0)
    staff_efficiency = db.Column(db.Float, default=0.0)
    time_to_goal = db.Column(db.Float, default=0.0)  # متوسط الوقت لتحقيق الأهداف
    
    # مقاييس التنبؤ
    predicted_success_rate = db.Column(db.Float, default=0.0)
    risk_score = db.Column(db.Float, default=0.0)
    improvement_potential = db.Column(db.Float, default=0.0)
    
    # البيانات التفصيلية
    detailed_metrics = db.Column(db.Text)  # مقاييس تفصيلية إضافية (JSON)
    benchmark_comparison = db.Column(db.Text)  # مقارنة مع المعايير (JSON)
    trend_analysis = db.Column(db.Text)  # تحليل الاتجاهات (JSON)
    
    # معلومات التتبع
    calculated_by = db.Column(db.String(50), default='AI_System')
    calculation_accuracy = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    program = db.relationship('RehabilitationProgram', backref='performance_metrics')

class StudentProgressPrediction(db.Model):
    """تنبؤات تقدم الطلاب بالذكاء الاصطناعي"""
    __tablename__ = 'student_progress_predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    prediction_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # التنبؤات الأساسية
    predicted_completion_date = db.Column(db.Date)
    success_probability = db.Column(db.Float, default=0.0)  # احتمالية النجاح (0-100)
    expected_improvement = db.Column(db.Float, default=0.0)  # التحسن المتوقع
    risk_of_dropout = db.Column(db.Float, default=0.0)  # خطر التسرب
    
    # التنبؤات التفصيلية
    skill_predictions = db.Column(db.Text)  # تنبؤات المهارات (JSON)
    milestone_timeline = db.Column(db.Text)  # جدول المعالم الزمني (JSON)
    intervention_recommendations = db.Column(db.Text)  # توصيات التدخل (JSON)
    
    # عوامل التأثير
    positive_factors = db.Column(db.Text)  # العوامل الإيجابية (JSON)
    negative_factors = db.Column(db.Text)  # العوامل السلبية (JSON)
    critical_factors = db.Column(db.Text)  # العوامل الحرجة (JSON)
    
    # مؤشرات الثقة
    prediction_confidence = db.Column(db.Float, default=0.0)  # ثقة التنبؤ
    model_accuracy = db.Column(db.Float, default=0.0)  # دقة النموذج
    data_quality_score = db.Column(db.Float, default=0.0)  # جودة البيانات
    
    # التوصيات
    recommended_adjustments = db.Column(db.Text)  # التعديلات المقترحة (JSON)
    support_strategies = db.Column(db.Text)  # استراتيجيات الدعم (JSON)
    monitoring_points = db.Column(db.Text)  # نقاط المراقبة (JSON)
    
    # الحالة والتتبع
    status = db.Column(db.String(20), default='active')  # active, outdated, validated
    validation_date = db.Column(db.DateTime)  # تاريخ التحقق من صحة التنبؤ
    actual_outcome = db.Column(db.Text)  # النتيجة الفعلية (JSON)
    prediction_accuracy = db.Column(db.Float)  # دقة التنبؤ الفعلية
    
    # معلومات التتبع
    model_version = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='progress_predictions')
    program = db.relationship('RehabilitationProgram', backref='student_predictions')

# ==================== Emergency Management Models ====================

class EmergencyIncident(db.Model):
    __tablename__ = 'emergency_incidents'
    
    id = db.Column(db.Integer, primary_key=True)
    incident_type = db.Column(db.String(50), nullable=False)  # fire, medical, security, natural, technical, accident
    emergency_level = db.Column(db.String(20), nullable=False)  # critical, high, medium, low
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(200), nullable=False)
    incident_time = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='active')  # active, investigating, monitoring, resolved
    affected_persons = db.Column(db.Integer, default=0)
    actions_taken = db.Column(db.Text)
    response_team = db.Column(db.Text)
    response_time = db.Column(db.Integer)  # minutes
    resolution_time = db.Column(db.DateTime)

# ==================== Branch Maintenance & Fault Management Models ====================

class BranchFaultReport(db.Model):
    """تقارير الأعطال من الفروع"""
    __tablename__ = 'branch_fault_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات الفرع
    branch_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False)
    branch_name = db.Column(db.String(100), nullable=False)
    
    # معلومات العطل
    fault_type = db.Column(db.String(50), nullable=False)  # electrical, plumbing, hvac, equipment, structural, it, safety
    fault_category = db.Column(db.String(30), nullable=False)  # critical, urgent, normal, minor
    fault_title = db.Column(db.String(200), nullable=False)
    fault_description = db.Column(db.Text, nullable=False)
    
    # الموقع والتفاصيل
    location_details = db.Column(db.String(200))  # الموقع المحدد داخل الفرع
    affected_area = db.Column(db.String(100))  # المنطقة المتأثرة
    equipment_involved = db.Column(db.String(200))  # الأجهزة المتأثرة
    
    # مستوى الأولوية والتأثير
    priority_level = db.Column(db.String(20), default='normal')  # critical, high, normal, low
    impact_level = db.Column(db.String(20), default='medium')  # high, medium, low
    safety_risk = db.Column(db.Boolean, default=False)  # خطر على السلامة
    service_disruption = db.Column(db.Boolean, default=False)  # تعطيل الخدمة
    
    # التوقيت
    reported_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    occurred_at = db.Column(db.DateTime)  # وقت حدوث العطل
    estimated_repair_time = db.Column(db.Integer)  # الوقت المقدر للإصلاح (ساعات)
    
    # الحالة والتتبع
    status = db.Column(db.String(20), default='reported')  # reported, acknowledged, assigned, in_progress, completed, closed
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))  # المُكلف بالإصلاح
    maintenance_team = db.Column(db.String(100))  # فريق الصيانة
    
    # التكلفة والموارد
    estimated_cost = db.Column(db.Float, default=0.0)
    actual_cost = db.Column(db.Float, default=0.0)
    required_parts = db.Column(db.Text)  # قطع الغيار المطلوبة (JSON)
    external_contractor = db.Column(db.String(100))  # مقاول خارجي
    
    # المرفقات والوثائق
    photos = db.Column(db.Text)  # مسارات الصور (JSON)
    documents = db.Column(db.Text)  # المستندات المرفقة (JSON)
    
    # معلومات الإبلاغ
    reported_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    contact_person = db.Column(db.String(100))  # الشخص المسؤول في الفرع
    contact_phone = db.Column(db.String(20))
    
    # التحديثات والملاحظات
    notes = db.Column(db.Text)  # ملاحظات إضافية
    internal_notes = db.Column(db.Text)  # ملاحظات داخلية للفرع الرئيسي
    
    # التواريخ المهمة
    acknowledged_at = db.Column(db.DateTime)  # تاريخ الاستلام
    assigned_at = db.Column(db.DateTime)  # تاريخ التكليف
    started_at = db.Column(db.DateTime)  # تاريخ بدء العمل
    completed_at = db.Column(db.DateTime)  # تاريخ الانتهاء
    closed_at = db.Column(db.DateTime)  # تاريخ الإغلاق
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    branch = db.relationship('Clinic', backref='fault_reports')
    reporter = db.relationship('User', foreign_keys=[reported_by], backref='reported_faults')
    assigned_user = db.relationship('User', foreign_keys=[assigned_to], backref='assigned_faults')

class MaintenanceSchedule(db.Model):
    """جدولة الصيانة الدورية"""
    __tablename__ = 'maintenance_schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات الفرع
    branch_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False)
    
    # معلومات الصيانة
    maintenance_type = db.Column(db.String(50), nullable=False)  # preventive, corrective, emergency, inspection
    equipment_type = db.Column(db.String(100))  # نوع الجهاز أو النظام
    equipment_id = db.Column(db.String(50))  # رقم الجهاز
    maintenance_title = db.Column(db.String(200), nullable=False)
    maintenance_description = db.Column(db.Text)
    
    # الجدولة
    scheduled_date = db.Column(db.Date, nullable=False)
    scheduled_time = db.Column(db.Time)
    estimated_duration = db.Column(db.Integer)  # المدة المقدرة (دقائق)
    frequency = db.Column(db.String(20))  # daily, weekly, monthly, quarterly, yearly, one_time
    
    # الحالة والتكرار
    status = db.Column(db.String(20), default='scheduled')  # scheduled, in_progress, completed, cancelled, postponed
    recurrence_pattern = db.Column(db.String(100))  # نمط التكرار
    next_due_date = db.Column(db.Date)  # التاريخ التالي للصيانة
    
    # الفريق والموارد
    assigned_team = db.Column(db.String(100))
    required_skills = db.Column(db.Text)  # المهارات المطلوبة (JSON)
    required_tools = db.Column(db.Text)  # الأدوات المطلوبة (JSON)
    required_parts = db.Column(db.Text)  # قطع الغيار (JSON)
    
    # التكلفة والوقت
    estimated_cost = db.Column(db.Float, default=0.0)
    actual_cost = db.Column(db.Float, default=0.0)
    actual_duration = db.Column(db.Integer)  # المدة الفعلية
    
    # التنفيذ
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # النتائج والتقييم
    work_performed = db.Column(db.Text)  # العمل المنجز
    findings = db.Column(db.Text)  # الملاحظات والنتائج
    recommendations = db.Column(db.Text)  # التوصيات
    quality_rating = db.Column(db.Integer)  # تقييم الجودة (1-5)
    
    # الوثائق
    checklist = db.Column(db.Text)  # قائمة التحقق (JSON)
    photos_before = db.Column(db.Text)  # صور قبل الصيانة
    photos_after = db.Column(db.Text)  # صور بعد الصيانة
    reports = db.Column(db.Text)  # التقارير المرفقة
    
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    branch = db.relationship('Clinic', backref='maintenance_schedules')
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_maintenance_schedules')
    performer = db.relationship('User', foreign_keys=[performed_by], backref='performed_maintenance')

class MaintenanceRequest(db.Model):
    """طلبات الصيانة من الفروع"""
    __tablename__ = 'maintenance_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات الطلب
    request_number = db.Column(db.String(20), unique=True, nullable=False)  # رقم الطلب
    branch_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False)
    
    # تفاصيل الطلب
    request_type = db.Column(db.String(50), nullable=False)  # repair, installation, upgrade, inspection
    urgency_level = db.Column(db.String(20), default='normal')  # emergency, urgent, normal, low
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    
    # الموقع والمعدات
    location = db.Column(db.String(200))
    equipment_details = db.Column(db.Text)  # تفاصيل المعدات (JSON)
    
    # التوقيت المطلوب
    requested_date = db.Column(db.Date)
    preferred_time = db.Column(db.String(50))  # morning, afternoon, evening, anytime
    deadline = db.Column(db.Date)  # الموعد النهائي
    
    # الحالة والموافقة
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, scheduled, completed
    approval_status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approval_date = db.Column(db.DateTime)
    rejection_reason = db.Column(db.Text)
    
    # التكلفة والميزانية
    estimated_budget = db.Column(db.Float, default=0.0)
    approved_budget = db.Column(db.Float, default=0.0)
    budget_source = db.Column(db.String(50))  # branch, headquarters, external
    
    # التكليف والتنفيذ
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))
    maintenance_team = db.Column(db.String(100))
    external_contractor = db.Column(db.String(100))
    
    # المتابعة
    scheduled_date = db.Column(db.Date)
    completed_date = db.Column(db.Date)
    satisfaction_rating = db.Column(db.Integer)  # تقييم الرضا (1-5)
    feedback = db.Column(db.Text)  # تعليقات الفرع
    
    requested_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    branch = db.relationship('Clinic', backref='maintenance_requests')
    requester = db.relationship('User', foreign_keys=[requested_by], backref='maintenance_requests')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='approved_maintenance_requests')
    assignee = db.relationship('User', foreign_keys=[assigned_to], backref='assigned_maintenance_requests')

class EquipmentInventory(db.Model):
    """جرد المعدات والأجهزة"""
    __tablename__ = 'equipment_inventory'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # معلومات المعدات
    equipment_code = db.Column(db.String(50), unique=True, nullable=False)
    equipment_name = db.Column(db.String(200), nullable=False)
    equipment_type = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50))  # medical, office, maintenance, safety, it
    
    # الموقع
    branch_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False)
    location_details = db.Column(db.String(200))  # الموقع المحدد
    room_number = db.Column(db.String(20))
    
    # معلومات الشراء
    manufacturer = db.Column(db.String(100))  # الشركة المصنعة
    model_number = db.Column(db.String(100))  # رقم الموديل
    serial_number = db.Column(db.String(100))  # الرقم التسلسلي
    purchase_date = db.Column(db.Date)
    purchase_cost = db.Column(db.Float, default=0.0)
    supplier = db.Column(db.String(100))  # المورد
    
    # الضمان والصيانة
    warranty_start = db.Column(db.Date)
    warranty_end = db.Column(db.Date)
    warranty_provider = db.Column(db.String(100))
    maintenance_contract = db.Column(db.String(100))  # عقد الصيانة
    last_maintenance = db.Column(db.Date)
    next_maintenance = db.Column(db.Date)
    
    # الحالة والاستخدام
    condition_status = db.Column(db.String(20), default='good')  # excellent, good, fair, poor, out_of_service
    operational_status = db.Column(db.String(20), default='active')  # active, inactive, maintenance, retired
    usage_frequency = db.Column(db.String(20))  # daily, weekly, monthly, occasional
    
    # المواصفات التقنية
    specifications = db.Column(db.Text)  # المواصفات (JSON)
    operating_manual = db.Column(db.String(200))  # دليل التشغيل
    safety_requirements = db.Column(db.Text)  # متطلبات السلامة
    
    # التقييم والمراجعة
    last_inspection = db.Column(db.Date)
    inspection_notes = db.Column(db.Text)
    replacement_value = db.Column(db.Float, default=0.0)  # القيمة الاستبدالية
    depreciation_rate = db.Column(db.Float, default=0.0)  # معدل الاستهلاك
    
    # المسؤولية
    responsible_person = db.Column(db.Integer, db.ForeignKey('users.id'))
    backup_responsible = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # الوثائق والصور
    photos = db.Column(db.Text)  # صور المعدات (JSON)
    documents = db.Column(db.Text)  # المستندات (JSON)
    qr_code = db.Column(db.String(100))  # رمز QR للمعدات
    
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    branch = db.relationship('Clinic', backref='equipment_inventory')
    responsible = db.relationship('User', foreign_keys=[responsible_person], backref='responsible_equipment')
    backup = db.relationship('User', foreign_keys=[backup_responsible], backref='backup_equipment')
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_equipment')

class MaintenanceLog(db.Model):
    """سجل أعمال الصيانة"""
    __tablename__ = 'maintenance_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # الربط
    fault_report_id = db.Column(db.Integer, db.ForeignKey('branch_fault_reports.id'))
    maintenance_request_id = db.Column(db.Integer, db.ForeignKey('maintenance_requests.id'))
    equipment_id = db.Column(db.Integer, db.ForeignKey('equipment_inventory.id'))
    
    # تفاصيل العمل
    work_type = db.Column(db.String(50), nullable=False)  # repair, maintenance, inspection, installation
    work_description = db.Column(db.Text, nullable=False)
    work_performed = db.Column(db.Text)  # العمل المنجز
    
    # التوقيت
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer)
    
    # الفريق والموارد
    technician = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assistant_technicians = db.Column(db.Text)  # المساعدين (JSON)
    tools_used = db.Column(db.Text)  # الأدوات المستخدمة (JSON)
    parts_used = db.Column(db.Text)  # قطع الغيار المستخدمة (JSON)
    
    # التكلفة
    labor_cost = db.Column(db.Float, default=0.0)
    parts_cost = db.Column(db.Float, default=0.0)
    total_cost = db.Column(db.Float, default=0.0)
    
    # النتائج
    work_status = db.Column(db.String(20), default='completed')  # completed, partial, failed
    quality_check = db.Column(db.Boolean, default=False)
    issues_found = db.Column(db.Text)  # المشاكل المكتشفة
    recommendations = db.Column(db.Text)  # التوصيات
    
    # المتابعة
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.Date)
    warranty_period = db.Column(db.Integer)  # فترة الضمان (أيام)
    
    # الوثائق
    before_photos = db.Column(db.Text)  # صور قبل العمل
    after_photos = db.Column(db.Text)  # صور بعد العمل
    work_report = db.Column(db.Text)  # تقرير العمل
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    fault_report = db.relationship('BranchFaultReport', backref='maintenance_logs')
    maintenance_request = db.relationship('MaintenanceRequest', backref='maintenance_logs')
    equipment = db.relationship('EquipmentInventory', backref='maintenance_logs')
    tech = db.relationship('User', backref='maintenance_work_logs')
    reported_by = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class EmergencyResponseTeam(db.Model):
    __tablename__ = 'emergency_response_teams'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    specialization = db.Column(db.String(100))  # fire, medical, security, evacuation
    leader_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    members = db.Column(db.Text)  # JSON array of member IDs or names
    contact_info = db.Column(db.Text)
    availability_status = db.Column(db.String(20), default='available')  # available, busy, off_duty
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class EmergencyAlert(db.Model):
    __tablename__ = 'emergency_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    alert_type = db.Column(db.String(50), nullable=False)  # general, fire, medical, security, evacuation
    message = db.Column(db.Text, nullable=False)
    triggered_by = db.Column(db.String(100), nullable=False)
    triggered_at = db.Column(db.DateTime, nullable=False)
    dismissed_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    recipients = db.Column(db.Text)  # JSON array of recipient IDs or roles

class EmergencyProtocolActivation(db.Model):
    __tablename__ = 'emergency_protocol_activations'
    
    id = db.Column(db.Integer, primary_key=True)
    protocol_type = db.Column(db.String(50), nullable=False)  # fire, medical, evacuation, lockdown
    activated_by = db.Column(db.String(100), nullable=False)
    activated_at = db.Column(db.DateTime, nullable=False)
    deactivated_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text)

class EmergencyDrill(db.Model):
    __tablename__ = 'emergency_drills'
    
    id = db.Column(db.Integer, primary_key=True)
    drill_type = db.Column(db.String(50), nullable=False)  # fire, evacuation, lockdown, medical
    drill_datetime = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.String(200), nullable=False)
    participants = db.Column(db.Text)
    objectives = db.Column(db.Text)
    duration_minutes = db.Column(db.Integer, default=30)
    status = db.Column(db.String(20), default='scheduled')  # scheduled, in_progress, completed, cancelled
    results = db.Column(db.Text)
    feedback = db.Column(db.Text)
    scheduled_by = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ==================== Medical Follow-up Models ====================

class MedicalFollowupRecord(db.Model):
    __tablename__ = 'medical_followup_records'
    
    id = db.Column(db.Integer, primary_key=True)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    record_type = db.Column(db.String(50), nullable=False)  # medical, therapy, consultation, emergency
    record_date = db.Column(db.DateTime, nullable=False)
    chief_complaint = db.Column(db.Text)
    diagnosis = db.Column(db.Text, nullable=False)
    treatment = db.Column(db.Text, nullable=False)
    medications = db.Column(db.Text)
    vital_signs = db.Column(db.Text)  # JSON format
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='completed')  # scheduled, completed, cancelled, ongoing
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    next_appointment = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    beneficiary = db.relationship('RehabilitationBeneficiary', backref='medical_records')
    doctor = db.relationship('User', backref='medical_records')

# Note: TherapySession model is defined in comprehensive_rehabilitation_models.py to avoid table conflicts

# ==================== Volunteer Staff Models ====================


class BayleyBehavioralObservation(db.Model):
    """الملاحظات السلوكية في مقاييس بيللي"""
    __tablename__ = 'bayley_behavioral_observations'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('bayley_assessments.id'), nullable=False)
    
    # سلوكيات الانتباه
    attention_to_examiner = db.Column(db.String(50))  # consistently, usually, occasionally, rarely
    attention_to_materials = db.Column(db.String(50))
    distractibility = db.Column(db.String(50))
    
    # سلوكيات التفاعل الاجتماعي
    social_engagement = db.Column(db.String(50))
    eye_contact = db.Column(db.String(50))
    social_referencing = db.Column(db.String(50))
    response_to_praise = db.Column(db.String(50))
    
    # السلوكيات العاطفية
    emotional_regulation = db.Column(db.String(50))
    frustration_tolerance = db.Column(db.String(50))
    mood_during_assessment = db.Column(db.String(50))
    
    # السلوكيات الحركية
    activity_level = db.Column(db.String(50))  # hypoactive, appropriate, hyperactive
    motor_coordination = db.Column(db.String(50))
    fine_motor_control = db.Column(db.String(50))
    
    # سلوكيات التواصل
    vocalization_frequency = db.Column(db.String(50))
    gesture_use = db.Column(db.String(50))
    response_to_verbal_direction = db.Column(db.String(50))
    
    # سلوكيات أخرى
    persistence_with_tasks = db.Column(db.String(50))
    problem_solving_approach = db.Column(db.String(50))
    self_soothing_behaviors = db.Column(db.Text)
    
    # ملاحظات عامة
    overall_behavioral_impression = db.Column(db.Text)
    factors_affecting_performance = db.Column(db.Text)
    validity_of_results = db.Column(db.String(50))  # valid, questionable, invalid
    
    # العلاقات
    assessment = db.relationship('BayleyAssessment', backref='behavioral_observations')
    
    def __repr__(self):
        return f'<BayleyBehavioralObservation Assessment:{self.assessment_id}>'

# ==================== Staff Program Assignment Models ====================

class StaffProgramAssignment(db.Model):
    """تخصيص الموظفين والأخصائيين للبرامج"""
    __tablename__ = 'staff_program_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    assignment_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active')
    responsibilities = db.Column(db.Text)
    workload_percentage = db.Column(db.Float, default=100.0)
    notes = db.Column(db.Text)
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    staff = db.relationship('VolunteerStaff', backref='program_assignments')
    program = db.relationship('RehabilitationProgram', backref='staff_assignments')
    assigner = db.relationship('User', backref='program_assignments_made')

class StaffAssessmentAssignment(db.Model):
    """تخصيص الموظفين للمقاييس والتقييمات"""
    __tablename__ = 'staff_assessment_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    assessment_type = db.Column(db.String(100), nullable=False)
    specialization_required = db.Column(db.String(100))
    certification_level = db.Column(db.String(50))
    assignment_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active')
    max_assessments_per_month = db.Column(db.Integer, default=10)
    current_workload = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    staff = db.relationship('VolunteerStaff', backref='assessment_assignments')
    assigner = db.relationship('User', backref='assessment_assignments_made')

# ==================== Student Program Assignment Models ====================

class StudentProgramEnrollment(db.Model):
    """تسجيل الطلاب في البرامج التأهيلية"""
    __tablename__ = 'student_program_enrollments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    enrollment_date = db.Column(db.Date, nullable=False)
    expected_completion_date = db.Column(db.Date)
    actual_completion_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active')
    priority_level = db.Column(db.String(20), default='medium')
    enrollment_reason = db.Column(db.Text)
    goals = db.Column(db.Text)
    progress_notes = db.Column(db.Text)
    completion_percentage = db.Column(db.Float, default=0.0)
    assigned_therapist_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'))
    parent_consent = db.Column(db.Boolean, default=False)
    medical_clearance = db.Column(db.Boolean, default=False)
    enrolled_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student = db.relationship('Student', backref='program_enrollments')
    program = db.relationship('RehabilitationProgram', backref='student_enrollments')
    assigned_therapist = db.relationship('VolunteerStaff', backref='assigned_students')
    enrolling_user = db.relationship('User', backref='student_enrollments_made')

class StudentAssessmentSchedule(db.Model):
    """جدولة التقييمات للطلاب"""
    __tablename__ = 'student_assessment_schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    assessment_type = db.Column(db.String(100), nullable=False)
    scheduled_date = db.Column(db.Date, nullable=False)
    scheduled_time = db.Column(db.Time)
    assigned_assessor_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'), nullable=False)
    location = db.Column(db.String(100))
    status = db.Column(db.String(20), default='scheduled')
    priority = db.Column(db.String(20), default='medium')
    assessment_reason = db.Column(db.Text)
    special_instructions = db.Column(db.Text)
    estimated_duration = db.Column(db.Integer, default=60)
    parent_notification_sent = db.Column(db.Boolean, default=False)
    reminder_sent = db.Column(db.Boolean, default=False)
    actual_start_time = db.Column(db.DateTime)
    actual_end_time = db.Column(db.DateTime)
    completion_notes = db.Column(db.Text)
    scheduled_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student = db.relationship('Student', backref='assessment_schedules')
    assigned_assessor = db.relationship('VolunteerStaff', backref='scheduled_assessments')
    scheduler = db.relationship('User', backref='assessments_scheduled')

class StudentSkillGoal(db.Model):
    """أهداف المهارات للطلاب"""
    __tablename__ = 'student_skill_goals'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id'), nullable=False)
    enrollment_id = db.Column(db.Integer, db.ForeignKey('student_program_enrollments.id'))
    goal_description = db.Column(db.Text, nullable=False)
    target_date = db.Column(db.Date, nullable=False)
    priority_level = db.Column(db.String(20), default='medium')
    current_level = db.Column(db.String(20), default='not_started')
    target_level = db.Column(db.String(20), default='mastered')
    success_criteria = db.Column(db.Text)
    teaching_strategies = db.Column(db.Text)
    materials_needed = db.Column(db.Text)
    frequency_per_week = db.Column(db.Integer, default=3)
    duration_per_session = db.Column(db.Integer, default=15)
    progress_tracking_method = db.Column(db.String(100))
    baseline_data = db.Column(db.Text)
    current_data = db.Column(db.Text)
    status = db.Column(db.String(20), default='active')
    assigned_therapist_id = db.Column(db.Integer, db.ForeignKey('volunteer_staff.id'))
    parent_involvement = db.Column(db.Text)
    home_practice_activities = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student = db.relationship('Student', backref='skill_goals')
    skill = db.relationship('Skill', backref='student_goals')
    enrollment = db.relationship('StudentProgramEnrollment', backref='skill_goals')
    assigned_therapist = db.relationship('VolunteerStaff', backref='assigned_skill_goals')
    creator = db.relationship('User', backref='skill_goals_created')

# نماذج الذكاء الاصطناعي للبرامج والمقاييس
class ProgramAIAnalysis(db.Model):
    """تحليل الذكاء الاصطناعي للبرامج التأهيلية"""
    __tablename__ = 'program_ai_analysis'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    analysis_type = db.Column(db.String(50), nullable=False)  # effectiveness, optimization, prediction, recommendation
    analysis_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # نتائج التحليل
    effectiveness_score = db.Column(db.Float)  # درجة الفعالية (0-100)
    completion_rate = db.Column(db.Float)  # معدل الإكمال
    satisfaction_score = db.Column(db.Float)  # درجة الرضا
    improvement_rate = db.Column(db.Float)  # معدل التحسن
    
    # التنبؤات
    predicted_success_rate = db.Column(db.Float)  # معدل النجاح المتوقع
    predicted_completion_time = db.Column(db.Integer)  # الوقت المتوقع للإكمال (بالأيام)
    risk_factors = db.Column(db.Text)  # عوامل الخطر (JSON)
    
    # التوصيات
    recommendations = db.Column(db.Text)  # التوصيات (JSON)
    optimization_suggestions = db.Column(db.Text)  # اقتراحات التحسين (JSON)
    resource_requirements = db.Column(db.Text)  # متطلبات الموارد (JSON)
    
    # البيانات الإضافية
    analysis_data = db.Column(db.Text)  # بيانات التحليل التفصيلية (JSON)
    confidence_level = db.Column(db.Float)  # مستوى الثقة في التحليل
    model_version = db.Column(db.String(20))  # إصدار نموذج الذكاء الاصطناعي
    
    # معلومات التتبع
    analyzed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    program = db.relationship('RehabilitationProgram', backref='ai_analyses')
    analyzer = db.relationship('User', backref='program_analyses')

class AssessmentAIAnalysis(db.Model):
    """تحليل الذكاء الاصطناعي للمقاييس والتقييمات"""
    __tablename__ = 'assessment_ai_analysis'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_assessments.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    analysis_type = db.Column(db.String(50), nullable=False)  # pattern_analysis, progress_prediction, recommendation
    analysis_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # تحليل الأنماط
    performance_patterns = db.Column(db.Text)  # أنماط الأداء (JSON)
    strength_areas = db.Column(db.Text)  # مناطق القوة (JSON)
    weakness_areas = db.Column(db.Text)  # مناطق الضعف (JSON)
    learning_style = db.Column(db.String(50))  # نمط التعلم المفضل
    
    # التنبؤات
    predicted_improvement = db.Column(db.Float)  # التحسن المتوقع
    predicted_timeline = db.Column(db.Integer)  # الجدول الزمني المتوقع (بالأسابيع)
    success_probability = db.Column(db.Float)  # احتمالية النجاح
    intervention_needs = db.Column(db.Text)  # احتياجات التدخل (JSON)
    
    # التوصيات الشخصية
    personalized_goals = db.Column(db.Text)  # الأهداف الشخصية (JSON)
    recommended_activities = db.Column(db.Text)  # الأنشطة المقترحة (JSON)
    therapy_modifications = db.Column(db.Text)  # تعديلات العلاج (JSON)
    support_strategies = db.Column(db.Text)  # استراتيجيات الدعم (JSON)
    
    # مؤشرات الأداء
    current_level = db.Column(db.String(20))  # المستوى الحالي
    target_level = db.Column(db.String(20))  # المستوى المستهدف
    progress_rate = db.Column(db.Float)  # معدل التقدم
    engagement_score = db.Column(db.Float)  # درجة المشاركة
    
    # البيانات التحليلية
    analysis_details = db.Column(db.Text)  # تفاصيل التحليل (JSON)
    comparison_data = db.Column(db.Text)  # بيانات المقارنة (JSON)
    confidence_score = db.Column(db.Float)  # درجة الثقة
    model_accuracy = db.Column(db.Float)  # دقة النموذج
    
    # معلومات التتبع
    analyzed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    assessment = db.relationship('RehabilitationAssessment', backref='ai_analyses')
    student = db.relationship('Student', backref='assessment_analyses')
    analyzer = db.relationship('User', backref='assessment_analyses_created')

class ProgramOptimizationSuggestion(db.Model):
    """اقتراحات تحسين البرامج بالذكاء الاصطناعي"""
    __tablename__ = 'program_optimization_suggestions'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    suggestion_type = db.Column(db.String(50), nullable=False)  # content, schedule, resources, methodology
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    
    # تفاصيل الاقتراح
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    rationale = db.Column(db.Text)  # المبرر العلمي
    expected_impact = db.Column(db.Text)  # التأثير المتوقع
    
    # التنفيذ
    implementation_steps = db.Column(db.Text)  # خطوات التنفيذ (JSON)
    required_resources = db.Column(db.Text)  # الموارد المطلوبة (JSON)
    estimated_cost = db.Column(db.Float)  # التكلفة المقدرة
    implementation_time = db.Column(db.Integer)  # وقت التنفيذ (بالأيام)
    
    # المقاييس والمؤشرات
    success_metrics = db.Column(db.Text)  # مقاييس النجاح (JSON)
    kpi_targets = db.Column(db.Text)  # أهداف مؤشرات الأداء (JSON)
    monitoring_plan = db.Column(db.Text)  # خطة المراقبة (JSON)
    
    # الحالة والتتبع
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, implemented
    approval_date = db.Column(db.DateTime)
    implementation_date = db.Column(db.DateTime)
    completion_date = db.Column(db.DateTime)
    
    # التقييم
    effectiveness_rating = db.Column(db.Float)  # تقييم الفعالية بعد التنفيذ
    feedback = db.Column(db.Text)  # التغذية الراجعة
    lessons_learned = db.Column(db.Text)  # الدروس المستفادة
    
    # معلومات التتبع
    suggested_by_ai = db.Column(db.Boolean, default=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    program = db.relationship('RehabilitationProgram', backref='optimization_suggestions')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='reviewed_suggestions')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='approved_suggestions')

class AssessmentInsight(db.Model):
    """رؤى ذكية من التقييمات"""
    __tablename__ = 'assessment_insights'
    
    id = db.Column(db.Integer, primary_key=True)
    insight_type = db.Column(db.String(50), nullable=False)  # trend, pattern, anomaly, prediction
    category = db.Column(db.String(50), nullable=False)  # individual, group, program, system
    
    # نطاق الرؤية
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'))  # للرؤى الفردية
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'))  # للرؤى البرنامجية
    assessment_type = db.Column(db.String(50))  # نوع التقييم
    
    # محتوى الرؤية
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    key_findings = db.Column(db.Text)  # النتائج الرئيسية (JSON)
    statistical_data = db.Column(db.Text)  # البيانات الإحصائية (JSON)
    
    # الأهمية والتأثير
    importance_score = db.Column(db.Float)  # درجة الأهمية (0-100)
    confidence_level = db.Column(db.Float)  # مستوى الثقة (0-100)
    potential_impact = db.Column(db.String(20))  # low, medium, high
    urgency_level = db.Column(db.String(20))  # low, medium, high, critical
    
    # التوصيات والإجراءات
    recommended_actions = db.Column(db.Text)  # الإجراءات المقترحة (JSON)
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.DateTime)
    
    # البيانات المرجعية
    data_sources = db.Column(db.Text)  # مصادر البيانات (JSON)
    analysis_period = db.Column(db.String(50))  # فترة التحليل
    sample_size = db.Column(db.Integer)  # حجم العينة
    
    # الحالة والتتبع
    status = db.Column(db.String(20), default='active')  # active, archived, acted_upon
    viewed_by = db.Column(db.Text)  # المستخدمون الذين شاهدوا الرؤية (JSON)
    action_taken = db.Column(db.Text)  # الإجراءات المتخذة
    
    # معلومات التتبع
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)  # تاريخ انتهاء صلاحية الرؤية
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='assessment_insights')
    program = db.relationship('RehabilitationProgram', backref='assessment_insights')

class ProgramPerformanceMetrics(db.Model):
    """مقاييس أداء البرامج المحسوبة بالذكاء الاصطناعي"""
    __tablename__ = 'program_performance_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    metric_date = db.Column(db.Date, default=datetime.utcnow().date, nullable=False)
    calculation_period = db.Column(db.String(20), nullable=False)  # daily, weekly, monthly, quarterly
    
    # مقاييس الأداء الأساسية
    enrollment_count = db.Column(db.Integer, default=0)
    completion_rate = db.Column(db.Float, default=0.0)
    dropout_rate = db.Column(db.Float, default=0.0)
    average_progress = db.Column(db.Float, default=0.0)
    satisfaction_score = db.Column(db.Float, default=0.0)
    
    # مقاييس الجودة
    goal_achievement_rate = db.Column(db.Float, default=0.0)
    skill_improvement_rate = db.Column(db.Float, default=0.0)
    therapy_effectiveness = db.Column(db.Float, default=0.0)
    parent_satisfaction = db.Column(db.Float, default=0.0)
    
    # مقاييس الكفاءة
    resource_utilization = db.Column(db.Float, default=0.0)
    cost_per_student = db.Column(db.Float, default=0.0)
    staff_efficiency = db.Column(db.Float, default=0.0)
    time_to_goal = db.Column(db.Float, default=0.0)  # متوسط الوقت لتحقيق الأهداف
    
    # مقاييس التنبؤ
    predicted_success_rate = db.Column(db.Float, default=0.0)
    risk_score = db.Column(db.Float, default=0.0)
    improvement_potential = db.Column(db.Float, default=0.0)
    
    # البيانات التفصيلية
    detailed_metrics = db.Column(db.Text)  # مقاييس تفصيلية إضافية (JSON)
    benchmark_comparison = db.Column(db.Text)  # مقارنة مع المعايير (JSON)
    trend_analysis = db.Column(db.Text)  # تحليل الاتجاهات (JSON)
    
    # معلومات التتبع
    calculated_by = db.Column(db.String(50), default='AI_System')
    calculation_accuracy = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    program = db.relationship('RehabilitationProgram', backref='performance_metrics')

class StudentProgressPrediction(db.Model):
    """تنبؤات تقدم الطلاب بالذكاء الاصطناعي"""
    __tablename__ = 'student_progress_predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('rehabilitation_programs.id'), nullable=False)
    prediction_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # التنبؤات الأساسية
    predicted_completion_date = db.Column(db.Date)
    success_probability = db.Column(db.Float, default=0.0)  # احتمالية النجاح (0-100)
    expected_improvement = db.Column(db.Float, default=0.0)  # التحسن المتوقع
    risk_of_dropout = db.Column(db.Float, default=0.0)  # خطر التسرب
    
    # التنبؤات التفصيلية
    skill_predictions = db.Column(db.Text)  # تنبؤات المهارات (JSON)
    milestone_timeline = db.Column(db.Text)  # جدول المعالم الزمني (JSON)
    intervention_recommendations = db.Column(db.Text)  # توصيات التدخل (JSON)
    
    # عوامل التأثير
    positive_factors = db.Column(db.Text)  # العوامل الإيجابية (JSON)
    negative_factors = db.Column(db.Text)  # العوامل السلبية (JSON)
    critical_factors = db.Column(db.Text)  # العوامل الحرجة (JSON)
    
    # مؤشرات الثقة
    prediction_confidence = db.Column(db.Float, default=0.0)  # ثقة التنبؤ
    model_accuracy = db.Column(db.Float, default=0.0)  # دقة النموذج
    data_quality_score = db.Column(db.Float, default=0.0)  # جودة البيانات
    
    # التوصيات
    recommended_adjustments = db.Column(db.Text)  # التعديلات المقترحة (JSON)
    support_strategies = db.Column(db.Text)  # استراتيجيات الدعم (JSON)
    monitoring_points = db.Column(db.Text)  # نقاط المراقبة (JSON)
    
    # الحالة والتتبع
    status = db.Column(db.String(20), default='active')  # active, outdated, validated
    validation_date = db.Column(db.DateTime)  # تاريخ التحقق من صحة التنبؤ
    actual_outcome = db.Column(db.Text)  # النتيجة الفعلية (JSON)
    prediction_accuracy = db.Column(db.Float)  # دقة التنبؤ الفعلية
    
    # معلومات التتبع
    model_version = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    student = db.relationship('Student', backref='progress_predictions')
    program = db.relationship('RehabilitationProgram', backref='student_predictions')
