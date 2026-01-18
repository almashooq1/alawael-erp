"""
نموذج الجلسة العلاجية (Therapy Session)
"""

from . import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class TherapySession(db.Model):
    """نموذج الجلسة العلاجية"""

    __tablename__ = 'therapy_sessions'

    # الحقول الأساسية
    id = db.Column(db.Integer, primary_key=True)
    session_number = db.Column(db.String(50), unique=True, nullable=False, index=True)

    # العلاقات
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('beneficiaries.id'), nullable=False, index=True)
    therapist_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), index=True)

    # معلومات الجلسة
    session_type = db.Column(db.String(50), nullable=False)
    # physical_therapy, occupational_therapy, speech_therapy, behavioral_therapy, etc.

    session_date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    duration = db.Column(db.Integer)  # بالدقائق

    # الحالة
    status = db.Column(db.String(20), default='scheduled')
    # scheduled, completed, cancelled, no_show, rescheduled

    # المحتوى
    objectives = db.Column(JSON)  # أهداف الجلسة
    activities = db.Column(JSON)  # الأنشطة المنفذة
    notes = db.Column(db.Text)  # ملاحظات المعالج
    observations = db.Column(db.Text)  # الملاحظات السلوكية

    # التقييم
    progress_rating = db.Column(db.Integer)  # من 1 إلى 10
    beneficiary_engagement = db.Column(db.String(20))  # excellent, good, fair, poor
    goals_achieved = db.Column(JSON)  # الأهداف المحققة

    # الحضور
    attendance_status = db.Column(db.String(20), default='present')
    # present, absent, late, early_departure
    arrival_time = db.Column(db.Time)
    departure_time = db.Column(db.Time)

    # التوصيات
    recommendations = db.Column(db.Text)
    homework = db.Column(db.JSON)  # واجبات منزلية
    next_session_plan = db.Column(db.Text)

    # المرفقات
    attachments = db.Column(JSON)  # صور، فيديوهات، ملفات

    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # العلاقات
    therapist = db.relationship('User', backref='sessions')

    def __init__(self, **kwargs):
        super(TherapySession, self).__init__(**kwargs)
        if not self.session_number:
            self.session_number = self.generate_session_number()
        if self.start_time and self.end_time:
            self.calculate_duration()

    def generate_session_number(self):
        """توليد رقم جلسة فريد"""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        return f"SES-{timestamp}"

    def calculate_duration(self):
        """حساب مدة الجلسة"""
        if self.start_time and self.end_time:
            start = datetime.combine(datetime.today(), self.start_time)
            end = datetime.combine(datetime.today(), self.end_time)
            duration = (end - start).total_seconds() / 60
            self.duration = int(duration)

    def to_dict(self, include_details=False):
        """تحويل لـ dictionary"""
        data = {
            'id': self.id,
            'session_number': self.session_number,
            'beneficiary_id': self.beneficiary_id,
            'therapist_id': self.therapist_id,
            'program_id': self.program_id,
            'session_type': self.session_type,
            'session_date': self.session_date.isoformat() if self.session_date else None,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration': self.duration,
            'status': self.status,
            'attendance_status': self.attendance_status,
            'progress_rating': self.progress_rating,
            'beneficiary_engagement': self.beneficiary_engagement,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

        if include_details:
            data['objectives'] = self.objectives
            data['activities'] = self.activities
            data['notes'] = self.notes
            data['observations'] = self.observations
            data['goals_achieved'] = self.goals_achieved
            data['recommendations'] = self.recommendations
            data['homework'] = self.homework
            data['attachments'] = self.attachments

        # معلومات المستفيد والمعالج
        if self.beneficiary:
            data['beneficiary'] = {
                'id': self.beneficiary.id,
                'name': f"{self.beneficiary.first_name} {self.beneficiary.last_name}"
            }

        if self.therapist:
            data['therapist'] = {
                'id': self.therapist.id,
                'name': f"{self.therapist.first_name} {self.therapist.last_name}" if self.therapist.first_name else self.therapist.username
            }

        return data

    def mark_completed(self):
        """تعليم الجلسة كمكتملة"""
        self.status = 'completed'
        db.session.commit()

    def mark_cancelled(self, reason=None):
        """إلغاء الجلسة"""
        self.status = 'cancelled'
        if reason:
            self.notes = f"إلغاء: {reason}\n{self.notes or ''}"
        db.session.commit()

    def __repr__(self):
        return f'<TherapySession {self.session_number}>'
