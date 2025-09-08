from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
from models import db

# ==================== نماذج إدارة الأطفال والأسر ====================

class ChildProfile(db.Model):
    """الملف الشامل للطفل"""
    __tablename__ = 'child_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    
    # المعلومات الأساسية
    full_name = db.Column(db.String(200), nullable=False)
    nickname = db.Column(db.String(100))
    birth_date = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(10), nullable=False)  # male, female
    nationality = db.Column(db.String(50))
    birth_place = db.Column(db.String(100))
    
    # المعلومات الطبية
    medical_history = db.Column(db.Text)  # التاريخ الطبي
    current_medications = db.Column(db.Text)  # الأدوية الحالية (JSON)
    allergies = db.Column(db.Text)  # الحساسيات (JSON)
    medical_conditions = db.Column(db.Text)  # الحالات الطبية (JSON)
    emergency_medical_info = db.Column(db.Text)  # معلومات طبية طارئة
    
    # معلومات التشخيص
    primary_diagnosis = db.Column(db.String(200))  # التشخيص الأساسي
    secondary_diagnoses = db.Column(db.Text)  # التشخيصات الثانوية (JSON)
    diagnosis_date = db.Column(db.Date)
    diagnosing_doctor = db.Column(db.String(200))
    diagnosis_reports = db.Column(db.Text)  # تقارير التشخيص (JSON)
    
    # المعلومات التطويرية
    developmental_milestones = db.Column(db.Text)  # المعالم التطويرية (JSON)
    current_abilities = db.Column(db.Text)  # القدرات الحالية (JSON)
    areas_of_strength = db.Column(db.Text)  # نقاط القوة (JSON)
    areas_of_need = db.Column(db.Text)  # المجالات التي تحتاج تطوير (JSON)
    
    # المعلومات التعليمية
    educational_background = db.Column(db.Text)  # الخلفية التعليمية
    learning_style = db.Column(db.String(100))  # أسلوب التعلم
    communication_method = db.Column(db.String(100))  # طريقة التواصل
    behavioral_notes = db.Column(db.Text)  # ملاحظات سلوكية
    
    # المعلومات الاجتماعية
    social_skills_level = db.Column(db.String(50))  # مستوى المهارات الاجتماعية
    interaction_preferences = db.Column(db.Text)  # تفضيلات التفاعل (JSON)
    peer_relationships = db.Column(db.Text)  # العلاقات مع الأقران
    
    # الاهتمامات والهوايات
    interests = db.Column(db.Text)  # الاهتمامات (JSON)
    hobbies = db.Column(db.Text)  # الهوايات (JSON)
    favorite_activities = db.Column(db.Text)  # الأنشطة المفضلة (JSON)
    dislikes = db.Column(db.Text)  # ما لا يحبه (JSON)
    
    # معلومات الدعم
    support_needs = db.Column(db.Text)  # احتياجات الدعم (JSON)
    assistive_technology = db.Column(db.Text)  # التقنيات المساعدة (JSON)
    accommodations = db.Column(db.Text)  # التسهيلات المطلوبة (JSON)
    
    # الحالة والتتبع
    status = db.Column(db.String(20), default='active')  # active, inactive, graduated
    enrollment_date = db.Column(db.Date, default=date.today)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    student = db.relationship('Student', backref='child_profile')
    created_by_user = db.relationship('User', foreign_keys=[created_by])
    updated_by_user = db.relationship('User', foreign_keys=[updated_by])

class FamilyProfile(db.Model):
    """ملف الأسرة الشامل"""
    __tablename__ = 'family_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    family_code = db.Column(db.String(50), unique=True, nullable=False)  # رمز الأسرة
    
    # المعلومات الأساسية
    family_name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    postal_code = db.Column(db.String(20))
    primary_phone = db.Column(db.String(20))
    secondary_phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    
    # المعلومات الاقتصادية
    family_income_range = db.Column(db.String(50))  # نطاق الدخل
    employment_status = db.Column(db.Text)  # حالة التوظيف (JSON)
    insurance_info = db.Column(db.Text)  # معلومات التأمين (JSON)
    financial_assistance = db.Column(db.Boolean, default=False)  # مساعدة مالية
    
    # المعلومات الثقافية واللغوية
    primary_language = db.Column(db.String(50), default='Arabic')
    secondary_languages = db.Column(db.Text)  # اللغات الثانوية (JSON)
    cultural_background = db.Column(db.String(100))
    religious_considerations = db.Column(db.Text)  # اعتبارات دينية
    
    # معلومات الدعم
    support_network = db.Column(db.Text)  # شبكة الدعم (JSON)
    previous_services = db.Column(db.Text)  # الخدمات السابقة (JSON)
    current_services = db.Column(db.Text)  # الخدمات الحالية (JSON)
    service_priorities = db.Column(db.Text)  # أولويات الخدمة (JSON)
    
    # التواصل والمشاركة
    preferred_communication = db.Column(db.String(50))  # طريقة التواصل المفضلة
    communication_frequency = db.Column(db.String(50))  # تكرار التواصل
    meeting_preferences = db.Column(db.Text)  # تفضيلات الاجتماعات (JSON)
    participation_level = db.Column(db.String(50))  # مستوى المشاركة
    
    # الحالة والتتبع
    status = db.Column(db.String(20), default='active')  # active, inactive
    registration_date = db.Column(db.Date, default=date.today)
    last_contact = db.Column(db.DateTime)
    notes = db.Column(db.Text)  # ملاحظات عامة
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    created_by_user = db.relationship('User', foreign_keys=[created_by])
    updated_by_user = db.relationship('User', foreign_keys=[updated_by])

class FamilyMember(db.Model):
    """أفراد الأسرة"""
    __tablename__ = 'family_members'
    
    id = db.Column(db.Integer, primary_key=True)
    family_id = db.Column(db.Integer, db.ForeignKey('family_profiles.id'), nullable=False)
    
    # المعلومات الأساسية
    full_name = db.Column(db.String(200), nullable=False)
    relationship = db.Column(db.String(50), nullable=False)  # father, mother, sibling, guardian, etc.
    national_id = db.Column(db.String(20))
    birth_date = db.Column(db.Date)
    gender = db.Column(db.String(10))
    
    # معلومات الاتصال
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    work_phone = db.Column(db.String(20))
    
    # المعلومات المهنية
    occupation = db.Column(db.String(100))
    employer = db.Column(db.String(200))
    work_address = db.Column(db.Text)
    education_level = db.Column(db.String(50))
    
    # معلومات الرعاية
    is_primary_caregiver = db.Column(db.Boolean, default=False)
    is_emergency_contact = db.Column(db.Boolean, default=False)
    is_authorized_pickup = db.Column(db.Boolean, default=False)
    care_responsibilities = db.Column(db.Text)  # مسؤوليات الرعاية (JSON)
    
    # المعلومات الصحية
    health_conditions = db.Column(db.Text)  # الحالات الصحية
    medications = db.Column(db.Text)  # الأدوية
    
    # الحالة والتتبع
    status = db.Column(db.String(20), default='active')  # active, inactive
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    family = db.relationship('FamilyProfile', backref='members')

class ChildFamilyRelation(db.Model):
    """ربط الطفل بالأسرة"""
    __tablename__ = 'child_family_relations'
    
    id = db.Column(db.Integer, primary_key=True)
    child_id = db.Column(db.Integer, db.ForeignKey('child_profiles.id'), nullable=False)
    family_id = db.Column(db.Integer, db.ForeignKey('family_profiles.id'), nullable=False)
    
    # معلومات العلاقة
    relationship_type = db.Column(db.String(50), default='biological')  # biological, adopted, foster, guardian
    custody_status = db.Column(db.String(50))  # full, joint, limited, etc.
    legal_guardian = db.Column(db.Boolean, default=True)
    
    # تواريخ مهمة
    start_date = db.Column(db.Date, default=date.today)
    end_date = db.Column(db.Date)
    
    # الحالة
    status = db.Column(db.String(20), default='active')  # active, inactive
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    child = db.relationship('ChildProfile', backref='family_relations')
    family = db.relationship('FamilyProfile', backref='child_relations')

class ProgressTracking(db.Model):
    """تتبع التقدم والتطور"""
    __tablename__ = 'progress_tracking'
    
    id = db.Column(db.Integer, primary_key=True)
    child_id = db.Column(db.Integer, db.ForeignKey('child_profiles.id'), nullable=False)
    
    # معلومات التقييم
    assessment_date = db.Column(db.Date, nullable=False)
    assessment_type = db.Column(db.String(100), nullable=False)  # developmental, academic, behavioral, etc.
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # المجالات المقيمة
    domain = db.Column(db.String(100), nullable=False)  # communication, motor, cognitive, social, etc.
    subdomain = db.Column(db.String(100))  # تفصيل أكثر للمجال
    
    # النتائج
    current_level = db.Column(db.String(50))  # المستوى الحالي
    previous_level = db.Column(db.String(50))  # المستوى السابق
    progress_status = db.Column(db.String(50))  # improved, maintained, declined, new
    
    # التفاصيل
    specific_skills = db.Column(db.Text)  # المهارات المحددة (JSON)
    observations = db.Column(db.Text)  # الملاحظات
    recommendations = db.Column(db.Text)  # التوصيات
    next_goals = db.Column(db.Text)  # الأهداف التالية (JSON)
    
    # القياسات الكمية
    score = db.Column(db.Float)  # النتيجة الرقمية
    percentage = db.Column(db.Float)  # النسبة المئوية
    benchmark_comparison = db.Column(db.Text)  # مقارنة مع المعايير
    
    # الملفات المرفقة
    attachments = db.Column(db.Text)  # المرفقات (JSON)
    photos = db.Column(db.Text)  # الصور (JSON)
    videos = db.Column(db.Text)  # الفيديوهات (JSON)
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    child = db.relationship('ChildProfile', backref='progress_records')
    assessor = db.relationship('User', backref='progress_assessments')

class SmartAppointment(db.Model):
    """نظام الجدولة الذكية للمواعيد"""
    __tablename__ = 'smart_appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_code = db.Column(db.String(50), unique=True, nullable=False)
    
    # معلومات الموعد
    child_id = db.Column(db.Integer, db.ForeignKey('child_profiles.id'), nullable=False)
    family_id = db.Column(db.Integer, db.ForeignKey('family_profiles.id'), nullable=False)
    staff_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # تفاصيل الموعد
    appointment_type = db.Column(db.String(100), nullable=False)  # assessment, therapy, consultation, etc.
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # التوقيت
    scheduled_date = db.Column(db.Date, nullable=False)
    scheduled_time = db.Column(db.Time, nullable=False)
    duration_minutes = db.Column(db.Integer, default=60)
    end_time = db.Column(db.Time)  # محسوب تلقائياً
    
    # الموقع
    location = db.Column(db.String(200))
    room = db.Column(db.String(50))
    online_meeting_link = db.Column(db.String(500))  # رابط الاجتماع الافتراضي
    
    # الحالة والأولوية
    status = db.Column(db.String(50), default='scheduled')  # scheduled, confirmed, in_progress, completed, cancelled, no_show
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    
    # التذكيرات
    reminder_sent = db.Column(db.Boolean, default=False)
    reminder_date = db.Column(db.DateTime)
    confirmation_required = db.Column(db.Boolean, default=True)
    confirmed_at = db.Column(db.DateTime)
    confirmed_by = db.Column(db.String(100))
    
    # المتطلبات والتحضيرات
    preparation_notes = db.Column(db.Text)  # ملاحظات التحضير
    required_materials = db.Column(db.Text)  # المواد المطلوبة (JSON)
    special_requirements = db.Column(db.Text)  # متطلبات خاصة
    
    # المتابعة
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.Date)
    follow_up_notes = db.Column(db.Text)
    
    # النتائج والملاحظات
    attendance_status = db.Column(db.String(50))  # attended, no_show, cancelled
    session_notes = db.Column(db.Text)  # ملاحظات الجلسة
    outcomes = db.Column(db.Text)  # النتائج (JSON)
    next_appointment_recommended = db.Column(db.Boolean, default=False)
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    child = db.relationship('ChildProfile', backref='appointments')
    family = db.relationship('FamilyProfile', backref='appointments')
    staff = db.relationship('User', foreign_keys=[staff_id], backref='assigned_appointments')
    created_by_user = db.relationship('User', foreign_keys=[created_by])

class ParentCommunication(db.Model):
    """نظام التواصل مع الأهالي"""
    __tablename__ = 'parent_communications'
    
    id = db.Column(db.Integer, primary_key=True)
    communication_code = db.Column(db.String(50), unique=True, nullable=False)
    
    # معلومات التواصل
    family_id = db.Column(db.Integer, db.ForeignKey('family_profiles.id'), nullable=False)
    child_id = db.Column(db.Integer, db.ForeignKey('child_profiles.id'))
    staff_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # نوع التواصل
    communication_type = db.Column(db.String(50), nullable=False)  # email, sms, call, meeting, note
    direction = db.Column(db.String(20), nullable=False)  # outgoing, incoming
    
    # المحتوى
    subject = db.Column(db.String(200))
    message = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(20), default='ar')
    
    # التوقيت
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    delivered_at = db.Column(db.DateTime)
    read_at = db.Column(db.DateTime)
    replied_at = db.Column(db.DateTime)
    
    # الحالة
    status = db.Column(db.String(50), default='sent')  # sent, delivered, read, replied, failed
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    
    # التصنيف
    category = db.Column(db.String(100))  # progress_update, appointment_reminder, general_info, etc.
    tags = db.Column(db.Text)  # العلامات (JSON)
    
    # المرفقات
    attachments = db.Column(db.Text)  # المرفقات (JSON)
    
    # الاستجابة والمتابعة
    requires_response = db.Column(db.Boolean, default=False)
    response_deadline = db.Column(db.DateTime)
    parent_response = db.Column(db.Text)
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.DateTime)
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    family = db.relationship('FamilyProfile', backref='communications')
    child = db.relationship('ChildProfile', backref='communications')
    staff = db.relationship('User', backref='sent_communications')

class SatisfactionSurvey(db.Model):
    """استطلاعات الرضا"""
    __tablename__ = 'satisfaction_surveys'
    
    id = db.Column(db.Integer, primary_key=True)
    survey_code = db.Column(db.String(50), unique=True, nullable=False)
    
    # معلومات الاستطلاع
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    survey_type = db.Column(db.String(50), nullable=False)  # service_satisfaction, program_evaluation, etc.
    
    # الفئة المستهدفة
    target_audience = db.Column(db.String(50), nullable=False)  # parents, staff, students
    
    # الأسئلة
    questions = db.Column(db.Text, nullable=False)  # الأسئلة (JSON)
    
    # التوقيت
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    
    # الحالة
    status = db.Column(db.String(20), default='draft')  # draft, active, closed, archived
    is_anonymous = db.Column(db.Boolean, default=True)
    
    # الإعدادات
    max_responses = db.Column(db.Integer)
    allow_multiple_responses = db.Column(db.Boolean, default=False)
    send_reminders = db.Column(db.Boolean, default=True)
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    created_by_user = db.relationship('User', backref='created_surveys')

class SurveyResponse(db.Model):
    """ردود استطلاعات الرضا"""
    __tablename__ = 'survey_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    survey_id = db.Column(db.Integer, db.ForeignKey('satisfaction_surveys.id'), nullable=False)
    
    # معلومات المستجيب
    family_id = db.Column(db.Integer, db.ForeignKey('family_profiles.id'))
    child_id = db.Column(db.Integer, db.ForeignKey('child_profiles.id'))
    respondent_type = db.Column(db.String(50))  # parent, guardian, staff
    respondent_name = db.Column(db.String(200))  # اختياري للاستطلاعات غير المجهولة
    
    # الردود
    responses = db.Column(db.Text, nullable=False)  # الردود (JSON)
    
    # التقييم العام
    overall_rating = db.Column(db.Integer)  # تقييم عام من 1-5
    additional_comments = db.Column(db.Text)  # تعليقات إضافية
    
    # معلومات الإكمال
    completion_time_minutes = db.Column(db.Integer)  # وقت الإكمال بالدقائق
    completion_percentage = db.Column(db.Float, default=100.0)  # نسبة الإكمال
    
    # الحالة
    status = db.Column(db.String(20), default='completed')  # draft, completed, submitted
    
    # معلومات التتبع
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    survey = db.relationship('SatisfactionSurvey', backref='responses')
    family = db.relationship('FamilyProfile', backref='survey_responses')
    child = db.relationship('ChildProfile', backref='survey_responses')
