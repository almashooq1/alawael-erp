"""
نموذج الأهداف (Goals)
"""

from . import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class Goal(db.Model):
    """نموذج الأهداف"""

    __tablename__ = 'goals'

    # الحقول الأساسية
    id = db.Column(db.Integer, primary_key=True)
    goal_number = db.Column(db.String(50), unique=True, nullable=False, index=True)

    # العلاقات
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('beneficiaries.id'), nullable=False, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # نوع الهدف
    goal_type = db.Column(db.String(50), nullable=False)
    # short_term, long_term, smart

    domain = db.Column(db.String(50))
    # motor, cognitive, language, social, adaptive, behavioral, academic

    # تفاصيل الهدف
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)

    # SMART Goal Criteria
    specific = db.Column(db.Text)  # محدد
    measurable = db.Column(db.Text)  # قابل للقياس
    achievable = db.Column(db.Text)  # قابل للتحقيق
    relevant = db.Column(db.Text)  # ذو صلة
    time_bound = db.Column(db.Text)  # محدد بوقت

    # الأهداف الفرعية
    sub_goals = db.Column(JSON)

    # المعايير
    success_criteria = db.Column(JSON)  # معايير النجاح
    baseline = db.Column(db.String(200))  # الخط القاعدي
    target = db.Column(db.String(200))  # الهدف المستهدف

    # التواريخ
    start_date = db.Column(db.Date, nullable=False)
    target_date = db.Column(db.Date, nullable=False)
    achieved_date = db.Column(db.Date)

    # التقدم
    status = db.Column(db.String(20), default='active')
    # active, achieved, partially_achieved, not_achieved, discontinued

    progress_percentage = db.Column(db.Integer, default=0)
    current_level = db.Column(db.String(200))

    # الاستراتيجيات
    strategies = db.Column(JSON)  # استراتيجيات التدخل
    resources_needed = db.Column(JSON)  # الموارد المطلوبة
    responsible_staff = db.Column(JSON)  # الكادر المسؤول

    # المتابعة
    review_frequency = db.Column(db.String(50))  # weekly, biweekly, monthly
    last_review_date = db.Column(db.Date)
    next_review_date = db.Column(db.Date)

    # الملاحظات
    notes = db.Column(db.Text)

    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # العلاقات
    creator = db.relationship('User', backref='goals_created')
    progress_records = db.relationship('GoalProgress', backref='goal', lazy='dynamic', cascade='all, delete-orphan')

    def __init__(self, **kwargs):
        super(Goal, self).__init__(**kwargs)
        if not self.goal_number:
            self.goal_number = self.generate_goal_number()

    def generate_goal_number(self):
        """توليد رقم هدف فريد"""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        return f"GOAL-{timestamp}"

    def to_dict(self, include_details=False):
        """تحويل لـ dictionary"""
        data = {
            'id': self.id,
            'goal_number': self.goal_number,
            'beneficiary_id': self.beneficiary_id,
            'goal_type': self.goal_type,
            'domain': self.domain,
            'title': self.title,
            'description': self.description,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'achieved_date': self.achieved_date.isoformat() if self.achieved_date else None,
            'status': self.status,
            'progress_percentage': self.progress_percentage,
            'current_level': self.current_level,
            'baseline': self.baseline,
            'target': self.target,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

        if include_details:
            data['specific'] = self.specific
            data['measurable'] = self.measurable
            data['achievable'] = self.achievable
            data['relevant'] = self.relevant
            data['time_bound'] = self.time_bound
            data['sub_goals'] = self.sub_goals
            data['success_criteria'] = self.success_criteria
            data['strategies'] = self.strategies
            data['resources_needed'] = self.resources_needed
            data['responsible_staff'] = self.responsible_staff
            data['review_frequency'] = self.review_frequency
            data['last_review_date'] = self.last_review_date.isoformat() if self.last_review_date else None
            data['next_review_date'] = self.next_review_date.isoformat() if self.next_review_date else None
            data['notes'] = self.notes

        return data

    def update_progress(self, percentage, notes=None):
        """تحديث التقدم"""
        self.progress_percentage = percentage

        if percentage >= 100:
            self.status = 'achieved'
            self.achieved_date = datetime.utcnow().date()

        # إنشاء سجل تقدم
        progress_record = GoalProgress(
            goal_id=self.id,
            progress_percentage=percentage,
            notes=notes
        )
        db.session.add(progress_record)
        db.session.commit()

    def is_overdue(self):
        """التحقق من تجاوز الموعد المستهدف"""
        if self.status in ['achieved', 'discontinued']:
            return False

        return datetime.utcnow().date() > self.target_date

    def __repr__(self):
        return f'<Goal {self.goal_number}: {self.title}>'


class GoalProgress(db.Model):
    """سجل تقدم الأهداف"""

    __tablename__ = 'goal_progress'

    id = db.Column(db.Integer, primary_key=True)
    goal_id = db.Column(db.Integer, db.ForeignKey('goals.id'), nullable=False, index=True)

    progress_percentage = db.Column(db.Integer, nullable=False)
    measurement_value = db.Column(db.String(200))

    notes = db.Column(db.Text)
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)

    recorder = db.relationship('User', backref='goal_progress_records')

    def to_dict(self):
        return {
            'id': self.id,
            'goal_id': self.goal_id,
            'progress_percentage': self.progress_percentage,
            'measurement_value': self.measurement_value,
            'notes': self.notes,
            'recorded_at': self.recorded_at.isoformat() if self.recorded_at else None
        }
