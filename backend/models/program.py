"""
نموذج البرنامج التأهيلي (Program)
"""

from . import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class Program(db.Model):
    """نموذج البرنامج التأهيلي"""

    __tablename__ = 'programs'

    # الحقول الأساسية
    id = db.Column(db.Integer, primary_key=True)
    program_code = db.Column(db.String(50), unique=True, nullable=False, index=True)

    name = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200))
    description = db.Column(db.Text)

    # نوع البرنامج
    program_type = db.Column(db.String(50), nullable=False)
    # early_intervention, educational, vocational, social, behavioral, etc.

    category = db.Column(db.String(100))
    target_disability = db.Column(JSON)  # أنواع الإعاقة المستهدفة

    # المعلومات العامة
    objectives = db.Column(JSON)  # أهداف البرنامج
    duration_weeks = db.Column(db.Integer)  # المدة بالأسابيع
    sessions_per_week = db.Column(db.Integer)
    session_duration = db.Column(db.Integer)  # مدة الجلسة بالدقائق

    # الفئة العمرية
    min_age = db.Column(db.Integer)
    max_age = db.Column(db.Integer)

    # المتطلبات
    prerequisites = db.Column(JSON)
    required_assessments = db.Column(JSON)

    # المحتوى
    modules = db.Column(JSON)  # وحدات البرنامج
    activities = db.Column(JSON)  # الأنشطة
    materials = db.Column(JSON)  # المواد المطلوبة

    # الكادر
    required_staff = db.Column(JSON)  # الكادر المطلوب
    staff_ratio = db.Column(db.String(20))  # نسبة الكادر للمستفيدين

    # السعة
    max_beneficiaries = db.Column(db.Integer)
    current_enrollments = db.Column(db.Integer, default=0)

    # الحالة
    status = db.Column(db.String(20), default='active')
    # active, inactive, full, archived

    # التكلفة
    cost_per_session = db.Column(db.Numeric(10, 2))
    total_cost = db.Column(db.Numeric(10, 2))

    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # العلاقات
    enrollments = db.relationship('ProgramEnrollment', backref='program', lazy='dynamic', cascade='all, delete-orphan')
    sessions = db.relationship('TherapySession', backref='program', lazy='dynamic')

    def __init__(self, **kwargs):
        super(Program, self).__init__(**kwargs)
        if not self.program_code:
            self.program_code = self.generate_program_code()

    def generate_program_code(self):
        """توليد كود برنامج فريد"""
        import random
        import string
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        return f"PRG-{code}"

    def to_dict(self, include_details=False):
        """تحويل لـ dictionary"""
        data = {
            'id': self.id,
            'program_code': self.program_code,
            'name': self.name,
            'name_en': self.name_en,
            'description': self.description,
            'program_type': self.program_type,
            'category': self.category,
            'duration_weeks': self.duration_weeks,
            'sessions_per_week': self.sessions_per_week,
            'session_duration': self.session_duration,
            'min_age': self.min_age,
            'max_age': self.max_age,
            'max_beneficiaries': self.max_beneficiaries,
            'current_enrollments': self.current_enrollments,
            'status': self.status,
            'cost_per_session': float(self.cost_per_session) if self.cost_per_session else None,
            'total_cost': float(self.total_cost) if self.total_cost else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

        if include_details:
            data['objectives'] = self.objectives
            data['target_disability'] = self.target_disability
            data['prerequisites'] = self.prerequisites
            data['required_assessments'] = self.required_assessments
            data['modules'] = self.modules
            data['activities'] = self.activities
            data['materials'] = self.materials
            data['required_staff'] = self.required_staff
            data['staff_ratio'] = self.staff_ratio

        return data

    def is_full(self):
        """التحقق من امتلاء البرنامج"""
        return self.current_enrollments >= self.max_beneficiaries if self.max_beneficiaries else False

    def can_enroll(self, beneficiary):
        """التحقق من إمكانية التسجيل"""
        if self.is_full():
            return False, "البرنامج ممتلئ"

        if self.status != 'active':
            return False, "البرنامج غير نشط"

        # التحقق من العمر
        age = beneficiary.calculate_age()
        if age:
            if self.min_age and age < self.min_age:
                return False, f"العمر أقل من الحد الأدنى ({self.min_age})"
            if self.max_age and age > self.max_age:
                return False, f"العمر أكبر من الحد الأقصى ({self.max_age})"

        return True, "يمكن التسجيل"

    def __repr__(self):
        return f'<Program {self.name}>'


class ProgramEnrollment(db.Model):
    """التسجيل في البرامج"""

    __tablename__ = 'program_enrollments'

    id = db.Column(db.Integer, primary_key=True)

    beneficiary_id = db.Column(db.Integer, db.ForeignKey('beneficiaries.id'), nullable=False, index=True)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False, index=True)

    enrollment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    expected_end_date = db.Column(db.Date)

    status = db.Column(db.String(20), default='active')
    # active, completed, withdrawn, suspended

    completion_percentage = db.Column(db.Integer, default=0)
    attendance_rate = db.Column(db.Numeric(5, 2))

    notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'beneficiary_id': self.beneficiary_id,
            'program_id': self.program_id,
            'enrollment_date': self.enrollment_date.isoformat() if self.enrollment_date else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'completion_percentage': self.completion_percentage,
            'attendance_rate': float(self.attendance_rate) if self.attendance_rate else None
        }

    def __repr__(self):
        return f'<ProgramEnrollment B:{self.beneficiary_id} P:{self.program_id}>'
