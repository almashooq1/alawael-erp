# SQLAlchemy import removed - using centralized db instance
from datetime import datetime, date
from database import db

# ==================== نماذج إدارة المخاطر ====================

class RiskCategory(db.Model):
    """فئات المخاطر"""
    __tablename__ = 'risk_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    color_code = db.Column(db.String(7), default='#007bff')  # لون الفئة
    icon = db.Column(db.String(50), default='fas fa-exclamation-triangle')
    
    # الحالة
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    risks = db.relationship('RiskAssessment', backref='category', lazy=True)

class RiskAssessment(db.Model):
    """تقييم المخاطر"""
    __tablename__ = 'risk_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    risk_code = db.Column(db.String(50), unique=True, nullable=False)
    
    # معلومات المخاطر
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('risk_categories.id'), nullable=False)
    location = db.Column(db.String(200))  # الموقع
    department = db.Column(db.String(100))  # القسم
    
    # تقييم المخاطر
    probability = db.Column(db.Integer, nullable=False)  # احتمالية الحدوث (1-5)
    impact = db.Column(db.Integer, nullable=False)  # شدة التأثير (1-5)
    risk_level = db.Column(db.String(20), nullable=False)  # low, medium, high, critical
    risk_score = db.Column(db.Integer)  # النتيجة المحسوبة (probability * impact)
    
    # الأشخاص المتأثرون
    affected_groups = db.Column(db.Text)  # المجموعات المتأثرة (JSON)
    estimated_affected_count = db.Column(db.Integer, default=0)
    
    # التوقيت
    identified_date = db.Column(db.Date, default=date.today)
    last_review_date = db.Column(db.Date)
    next_review_date = db.Column(db.Date)
    
    # الحالة والمتابعة
    status = db.Column(db.String(50), default='identified')  # identified, assessed, mitigated, closed
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, urgent
    
    # التدابير الحالية
    current_controls = db.Column(db.Text)  # التدابير الحالية
    control_effectiveness = db.Column(db.String(20))  # فعالية التدابير
    
    # التوصيات
    recommended_actions = db.Column(db.Text)  # الإجراءات المقترحة
    required_resources = db.Column(db.Text)  # الموارد المطلوبة
    estimated_cost = db.Column(db.Float, default=0.0)
    
    # المسؤوليات
    risk_owner = db.Column(db.Integer, db.ForeignKey('users.id'))  # مسؤول المخاطر
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))  # المكلف بالمتابعة
    
    # المرفقات والوثائق
    attachments = db.Column(db.Text)  # المرفقات (JSON)
    photos = db.Column(db.Text)  # الصور (JSON)
    documents = db.Column(db.Text)  # الوثائق (JSON)
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    risk_owner_user = db.relationship('User', foreign_keys=[risk_owner])
    assigned_user = db.relationship('User', foreign_keys=[assigned_to])
    created_by_user = db.relationship('User', foreign_keys=[created_by])
    updated_by_user = db.relationship('User', foreign_keys=[updated_by])

class EmergencyPlan(db.Model):
    """خطط الطوارئ"""
    __tablename__ = 'emergency_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_code = db.Column(db.String(50), unique=True, nullable=False)
    
    # معلومات الخطة
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    emergency_type = db.Column(db.String(100), nullable=False)  # fire, earthquake, medical, security, etc.
    scope = db.Column(db.String(100))  # building, department, center-wide
    
    # تفاصيل الخطة
    objectives = db.Column(db.Text)  # أهداف الخطة
    activation_criteria = db.Column(db.Text)  # معايير التفعيل
    procedures = db.Column(db.Text)  # الإجراءات (JSON)
    evacuation_routes = db.Column(db.Text)  # مسارات الإخلاء (JSON)
    assembly_points = db.Column(db.Text)  # نقاط التجمع (JSON)
    
    # الأدوار والمسؤوليات
    emergency_coordinator = db.Column(db.Integer, db.ForeignKey('users.id'))
    team_members = db.Column(db.Text)  # أعضاء الفريق (JSON)
    external_contacts = db.Column(db.Text)  # جهات الاتصال الخارجية (JSON)
    
    # الموارد والمعدات
    required_equipment = db.Column(db.Text)  # المعدات المطلوبة (JSON)
    emergency_supplies = db.Column(db.Text)  # المواد الطارئة (JSON)
    communication_tools = db.Column(db.Text)  # أدوات التواصل (JSON)
    
    # التدريب والاختبار
    training_schedule = db.Column(db.Text)  # جدول التدريب (JSON)
    drill_frequency = db.Column(db.String(50))  # تكرار التدريبات
    last_drill_date = db.Column(db.Date)
    next_drill_date = db.Column(db.Date)
    
    # المراجعة والتحديث
    version = db.Column(db.String(20), default='1.0')
    approval_status = db.Column(db.String(20), default='draft')  # draft, approved, active, archived
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approval_date = db.Column(db.Date)
    review_frequency = db.Column(db.String(50), default='annually')
    last_review_date = db.Column(db.Date)
    next_review_date = db.Column(db.Date)
    
    # الحالة
    is_active = db.Column(db.Boolean, default=True)
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    coordinator = db.relationship('User', foreign_keys=[emergency_coordinator])
    approved_by_user = db.relationship('User', foreign_keys=[approved_by])
    created_by_user = db.relationship('User', foreign_keys=[created_by])

class IncidentReport(db.Model):
    """تقارير الحوادث"""
    __tablename__ = 'incident_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    incident_number = db.Column(db.String(50), unique=True, nullable=False)
    
    # معلومات الحادث
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    incident_type = db.Column(db.String(100), nullable=False)  # accident, injury, property_damage, near_miss, etc.
    severity = db.Column(db.String(20), nullable=False)  # minor, moderate, major, critical
    
    # التوقيت والمكان
    incident_date = db.Column(db.Date, nullable=False)
    incident_time = db.Column(db.Time, nullable=False)
    location = db.Column(db.String(200), nullable=False)
    weather_conditions = db.Column(db.String(100))
    
    # الأشخاص المتورطون
    people_involved = db.Column(db.Text)  # الأشخاص المتورطون (JSON)
    witnesses = db.Column(db.Text)  # الشهود (JSON)
    injured_count = db.Column(db.Integer, default=0)
    fatality_count = db.Column(db.Integer, default=0)
    
    # تفاصيل الإصابات
    injury_details = db.Column(db.Text)  # تفاصيل الإصابات (JSON)
    medical_treatment = db.Column(db.Text)  # العلاج الطبي
    hospital_transport = db.Column(db.Boolean, default=False)
    
    # الأضرار
    property_damage = db.Column(db.Text)  # الأضرار المادية
    estimated_damage_cost = db.Column(db.Float, default=0.0)
    environmental_impact = db.Column(db.Text)  # التأثير البيئي
    
    # الاستجابة الفورية
    immediate_actions = db.Column(db.Text)  # الإجراءات الفورية
    emergency_services_called = db.Column(db.Boolean, default=False)
    emergency_services_details = db.Column(db.Text)
    
    # التحقيق
    investigation_status = db.Column(db.String(50), default='pending')  # pending, ongoing, completed
    investigator = db.Column(db.Integer, db.ForeignKey('users.id'))
    investigation_findings = db.Column(db.Text)  # نتائج التحقيق
    root_causes = db.Column(db.Text)  # الأسباب الجذرية (JSON)
    contributing_factors = db.Column(db.Text)  # العوامل المساهمة (JSON)
    
    # الإجراءات التصحيحية
    corrective_actions = db.Column(db.Text)  # الإجراءات التصحيحية (JSON)
    preventive_measures = db.Column(db.Text)  # التدابير الوقائية (JSON)
    responsible_person = db.Column(db.Integer, db.ForeignKey('users.id'))
    target_completion_date = db.Column(db.Date)
    actual_completion_date = db.Column(db.Date)
    
    # الإبلاغ والتوثيق
    reported_to_authorities = db.Column(db.Boolean, default=False)
    authority_details = db.Column(db.Text)  # تفاصيل الجهات المبلغة
    insurance_claim = db.Column(db.Boolean, default=False)
    insurance_details = db.Column(db.Text)
    
    # المرفقات
    photos = db.Column(db.Text)  # الصور (JSON)
    documents = db.Column(db.Text)  # الوثائق (JSON)
    witness_statements = db.Column(db.Text)  # أقوال الشهود (JSON)
    
    # الحالة والمتابعة
    status = db.Column(db.String(50), default='reported')  # reported, investigating, resolved, closed
    follow_up_required = db.Column(db.Boolean, default=True)
    follow_up_date = db.Column(db.Date)
    
    # معلومات التتبع
    reported_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reported_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    investigator_user = db.relationship('User', foreign_keys=[investigator])
    responsible_user = db.relationship('User', foreign_keys=[responsible_person])
    reported_by_user = db.relationship('User', foreign_keys=[reported_by])

class SafetyInspection(db.Model):
    """تفتيش السلامة"""
    __tablename__ = 'safety_inspections'
    
    id = db.Column(db.Integer, primary_key=True)
    inspection_number = db.Column(db.String(50), unique=True, nullable=False)
    
    # معلومات التفتيش
    title = db.Column(db.String(200), nullable=False)
    inspection_type = db.Column(db.String(100), nullable=False)  # routine, special, follow_up, regulatory
    scope = db.Column(db.String(200))  # نطاق التفتيش
    
    # التوقيت والمكان
    inspection_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)
    locations_inspected = db.Column(db.Text)  # المواقع المفتشة (JSON)
    
    # فريق التفتيش
    lead_inspector = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    inspection_team = db.Column(db.Text)  # فريق التفتيش (JSON)
    external_inspectors = db.Column(db.Text)  # مفتشون خارجيون (JSON)
    
    # معايير التفتيش
    inspection_criteria = db.Column(db.Text)  # معايير التفتيش (JSON)
    checklist_used = db.Column(db.Text)  # قائمة التحقق المستخدمة (JSON)
    
    # النتائج
    overall_rating = db.Column(db.String(20))  # excellent, good, satisfactory, needs_improvement, poor
    compliance_percentage = db.Column(db.Float, default=0.0)
    
    # النتائج التفصيلية
    findings = db.Column(db.Text)  # النتائج (JSON)
    violations = db.Column(db.Text)  # المخالفات (JSON)
    recommendations = db.Column(db.Text)  # التوصيات (JSON)
    best_practices = db.Column(db.Text)  # أفضل الممارسات (JSON)
    
    # الإجراءات المطلوبة
    required_actions = db.Column(db.Text)  # الإجراءات المطلوبة (JSON)
    priority_actions = db.Column(db.Text)  # الإجراءات ذات الأولوية (JSON)
    responsible_parties = db.Column(db.Text)  # الأطراف المسؤولة (JSON)
    target_dates = db.Column(db.Text)  # التواريخ المستهدفة (JSON)
    
    # المتابعة
    follow_up_required = db.Column(db.Boolean, default=True)
    follow_up_date = db.Column(db.Date)
    follow_up_status = db.Column(db.String(50), default='pending')
    
    # التوثيق
    photos = db.Column(db.Text)  # الصور (JSON)
    documents = db.Column(db.Text)  # الوثائق (JSON)
    report_file = db.Column(db.String(500))  # ملف التقرير
    
    # الحالة
    status = db.Column(db.String(50), default='completed')  # scheduled, in_progress, completed, reviewed
    approval_status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approval_date = db.Column(db.Date)
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    lead_inspector_user = db.relationship('User', foreign_keys=[lead_inspector])
    approved_by_user = db.relationship('User', foreign_keys=[approved_by])
    created_by_user = db.relationship('User', foreign_keys=[created_by])

class PreventiveMeasure(db.Model):
    """التدابير الوقائية"""
    __tablename__ = 'preventive_measures'
    
    id = db.Column(db.Integer, primary_key=True)
    measure_code = db.Column(db.String(50), unique=True, nullable=False)
    
    # معلومات التدبير
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100))  # safety, security, health, environmental
    type = db.Column(db.String(100))  # policy, procedure, training, equipment, inspection
    
    # النطاق والتطبيق
    scope = db.Column(db.String(200))  # نطاق التطبيق
    applicable_areas = db.Column(db.Text)  # المناطق المطبقة (JSON)
    target_groups = db.Column(db.Text)  # المجموعات المستهدفة (JSON)
    
    # التفاصيل
    objectives = db.Column(db.Text)  # الأهداف
    procedures = db.Column(db.Text)  # الإجراءات (JSON)
    requirements = db.Column(db.Text)  # المتطلبات (JSON)
    resources_needed = db.Column(db.Text)  # الموارد المطلوبة (JSON)
    
    # التنفيذ
    implementation_plan = db.Column(db.Text)  # خطة التنفيذ (JSON)
    responsible_person = db.Column(db.Integer, db.ForeignKey('users.id'))
    implementation_date = db.Column(db.Date)
    target_completion_date = db.Column(db.Date)
    actual_completion_date = db.Column(db.Date)
    
    # التدريب والتوعية
    training_required = db.Column(db.Boolean, default=False)
    training_details = db.Column(db.Text)  # تفاصيل التدريب (JSON)
    awareness_campaign = db.Column(db.Text)  # حملة التوعية
    
    # المراقبة والتقييم
    monitoring_frequency = db.Column(db.String(50))  # تكرار المراقبة
    effectiveness_metrics = db.Column(db.Text)  # مقاييس الفعالية (JSON)
    last_review_date = db.Column(db.Date)
    next_review_date = db.Column(db.Date)
    effectiveness_rating = db.Column(db.String(20))  # very_effective, effective, partially_effective, ineffective
    
    # التكلفة والميزانية
    estimated_cost = db.Column(db.Float, default=0.0)
    actual_cost = db.Column(db.Float, default=0.0)
    budget_source = db.Column(db.String(100))
    cost_benefit_analysis = db.Column(db.Text)
    
    # الحالة والمتابعة
    status = db.Column(db.String(50), default='planned')  # planned, implementing, active, suspended, discontinued
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    
    # التوثيق
    documents = db.Column(db.Text)  # الوثائق (JSON)
    policies = db.Column(db.Text)  # السياسات المرتبطة (JSON)
    procedures_docs = db.Column(db.Text)  # وثائق الإجراءات (JSON)
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    responsible_user = db.relationship('User', foreign_keys=[responsible_person])
    created_by_user = db.relationship('User', foreign_keys=[created_by])

class RiskMitigation(db.Model):
    """تخفيف المخاطر"""
    __tablename__ = 'risk_mitigations'
    
    id = db.Column(db.Integer, primary_key=True)
    risk_id = db.Column(db.Integer, db.ForeignKey('risk_assessments.id'), nullable=False)
    
    # معلومات التخفيف
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    mitigation_type = db.Column(db.String(50))  # avoid, reduce, transfer, accept
    strategy = db.Column(db.Text)  # استراتيجية التخفيف
    
    # التنفيذ
    action_plan = db.Column(db.Text)  # خطة العمل (JSON)
    responsible_person = db.Column(db.Integer, db.ForeignKey('users.id'))
    start_date = db.Column(db.Date)
    target_date = db.Column(db.Date)
    completion_date = db.Column(db.Date)
    
    # الموارد
    required_resources = db.Column(db.Text)  # الموارد المطلوبة (JSON)
    estimated_cost = db.Column(db.Float, default=0.0)
    actual_cost = db.Column(db.Float, default=0.0)
    
    # التقييم
    effectiveness = db.Column(db.String(20))  # high, medium, low
    residual_risk_level = db.Column(db.String(20))  # المخاطر المتبقية
    success_metrics = db.Column(db.Text)  # مقاييس النجاح (JSON)
    
    # الحالة
    status = db.Column(db.String(50), default='planned')  # planned, in_progress, completed, on_hold
    progress_percentage = db.Column(db.Float, default=0.0)
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    risk = db.relationship('RiskAssessment', backref='mitigations')
    responsible_user = db.relationship('User', foreign_keys=[responsible_person])
    created_by_user = db.relationship('User', foreign_keys=[created_by])
