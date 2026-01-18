"""
نموذج المستخدم (User)
"""

from . import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    """نموذج المستخدم"""

    __tablename__ = 'users'

    # الحقول الأساسية
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # البيانات الشخصية
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone_number = db.Column(db.String(20))
    profile_picture = db.Column(db.String(255))
    
    # نوع المستخدم
    user_type = db.Column(db.String(50), nullable=False)
    # admin, therapist, social_worker, coordinator, data_entry, manager
    
    # الحالة
    is_active = db.Column(db.Boolean, default=True, index=True)
    is_verified = db.Column(db.Boolean, default=False)
    
    # معلومات اضافية
    department = db.Column(db.String(100))
    specialization = db.Column(db.String(100))
    employee_id = db.Column(db.String(50), unique=True)
    
    # التاريخ والوقت
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # العلاقات
    # sessions = db.relationship('TherapySession', foreign_keys='TherapySession.therapist_id', lazy='dynamic')
    # assessments = db.relationship('Assessment', foreign_keys='Assessment.assessor_id', lazy='dynamic')
    # reports = db.relationship('Report', foreign_keys='Report.user_id', lazy='dynamic')
    
    def set_password(self, password):
        """تعيين كلمة المرور مع التشفير"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """التحقق من كلمة المرور"""
        return check_password_hash(self.password_hash, password)
    
    @property
    def full_name(self):
        """الحصول على الاسم الكامل"""
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self):
        return f"<User {self.email}>"
    
    def to_dict(self):
        """تحويل النموذج إلى قاموس"""
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'phone_number': self.phone_number,
            'user_type': self.user_type,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'department': self.department,
            'specialization': self.specialization,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }
