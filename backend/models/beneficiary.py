"""
نموذج المستفيد (Beneficiary)
"""

from . import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class Beneficiary(db.Model):
    """نموذج المستفيد"""

    __tablename__ = 'beneficiaries'

    # الحقول الأساسية
    id = db.Column(db.Integer, primary_key=True)
    national_id = db.Column(db.String(20), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(10), nullable=False)  # male, female

    # معلومات الإعاقة
    disability_type = db.Column(db.String(100))  # physical, mental, sensory, multiple
    disability_category = db.Column(db.String(100))
    severity_level = db.Column(db.String(50))  # mild, moderate, severe, profound
    diagnosis = db.Column(db.Text)
    diagnosis_date = db.Column(db.Date)

    # معلومات الاتصال
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    region = db.Column(db.String(100))
    postal_code = db.Column(db.String(20))

    # معلومات ولي الأمر
    guardian_name = db.Column(db.String(200), nullable=False)
    guardian_relationship = db.Column(db.String(50))  # father, mother, brother, etc.
    guardian_phone = db.Column(db.String(20), nullable=False)
    guardian_email = db.Column(db.String(120))
    guardian_national_id = db.Column(db.String(20))

    # التاريخ الطبي
    medical_history = db.Column(JSON)
    allergies = db.Column(JSON)
    medications = db.Column(JSON)
    previous_interventions = db.Column(JSON)

    # معلومات التسجيل
    registration_date = db.Column(db.Date, default=datetime.utcnow)
    status = db.Column(db.String(20), default='active')  # active, inactive, graduated, transferred
    notes = db.Column(db.Text)

    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # العلاقات
    assessments = db.relationship('Assessment', backref='beneficiary', lazy='dynamic', cascade='all, delete-orphan')
    sessions = db.relationship('TherapySession', backref='beneficiary', lazy='dynamic', cascade='all, delete-orphan')
    reports = db.relationship('Report', backref='beneficiary', lazy='dynamic', cascade='all, delete-orphan')
    goals = db.relationship('Goal', backref='beneficiary', lazy='dynamic', cascade='all, delete-orphan')
    programs = db.relationship('ProgramEnrollment', backref='beneficiary', lazy='dynamic', cascade='all, delete-orphan')

    def __init__(self, **kwargs):
        super(Beneficiary, self).__init__(**kwargs)

    def to_dict(self, include_relations=False):
        """تحويل لـ dictionary"""
        data = {
            'id': self.id,
            'national_id': self.national_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'age': self.calculate_age(),
            'gender': self.gender,
            'disability_type': self.disability_type,
            'disability_category': self.disability_category,
            'severity_level': self.severity_level,
            'diagnosis': self.diagnosis,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'city': self.city,
            'guardian_name': self.guardian_name,
            'guardian_phone': self.guardian_phone,
            'guardian_email': self.guardian_email,
            'status': self.status,
            'registration_date': self.registration_date.isoformat() if self.registration_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

        if include_relations:
            data['assessments_count'] = self.assessments.count()
            data['sessions_count'] = self.sessions.count()
            data['reports_count'] = self.reports.count()
            data['active_goals_count'] = self.goals.filter_by(status='active').count()

        return data

    def calculate_age(self):
        """حساب العمر"""
        if not self.date_of_birth:
            return None

        today = datetime.utcnow().date()
        age = today.year - self.date_of_birth.year

        if today.month < self.date_of_birth.month or \
           (today.month == self.date_of_birth.month and today.day < self.date_of_birth.day):
            age -= 1

        return age
    
    @property
    def full_name(self):
        """الاسم الكامل"""
        return f"{self.first_name} {self.last_name}"
    
    def get_age(self):
        """الحصول على العمر"""
        return self.calculate_age()

    def get_latest_assessment(self):
        """جلب آخر تقييم"""
        return self.assessments.order_by(Assessment.assessment_date.desc()).first()

    def get_active_programs(self):
        """جلب البرامج النشطة"""
        return self.programs.filter_by(status='active').all()

    def __repr__(self):
        return f'<Beneficiary {self.first_name} {self.last_name}>'
