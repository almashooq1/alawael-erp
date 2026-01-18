"""
نموذج التقييم (Assessment)
"""

from . import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class Assessment(db.Model):
    """نموذج التقييم"""

    __tablename__ = 'assessments'

    # الحقول الأساسية
    id = db.Column(db.Integer, primary_key=True)
    assessment_number = db.Column(db.String(50), unique=True, nullable=False, index=True)

    # العلاقات
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('beneficiaries.id'), nullable=False, index=True)
    assessor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # نوع التقييم
    assessment_type = db.Column(db.String(50), nullable=False, index=True)
    # initial, periodic, final, specialized, functional, cognitive, behavioral, etc.

    assessment_tool = db.Column(db.String(100))
    # ABAS, Vineland, Bayley, WISC, etc.

    # التاريخ
    assessment_date = db.Column(db.Date, nullable=False, index=True)

    # النتائج
    results = db.Column(JSON)  # نتائج التقييم المفصلة
    scores = db.Column(JSON)  # الدرجات
    percentiles = db.Column(JSON)  # النسب المئوية

    # المجالات المقيّمة
    domains_assessed = db.Column(JSON)
    # motor, cognitive, language, social, adaptive, behavioral

    # الملخص
    summary = db.Column(db.Text)
    strengths = db.Column(JSON)  # نقاط القوة
    weaknesses = db.Column(JSON)  # نقاط الضعف
    recommendations = db.Column(JSON)  # التوصيات

    # المقارنة مع التقييم السابق
    comparison_notes = db.Column(db.Text)
    progress_indicators = db.Column(JSON)

    # الحالة
    status = db.Column(db.String(20), default='draft')
    # draft, completed, reviewed, approved

    # المرفقات
    attachments = db.Column(JSON)

    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # العلاقات
    assessor = db.relationship('User', backref='assessments')

    def __init__(self, **kwargs):
        super(Assessment, self).__init__(**kwargs)
        if not self.assessment_number:
            self.assessment_number = self.generate_assessment_number()

    def generate_assessment_number(self):
        """توليد رقم تقييم فريد"""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        return f"ASS-{timestamp}"

    def to_dict(self, include_results=False):
        """تحويل لـ dictionary"""
        data = {
            'id': self.id,
            'assessment_number': self.assessment_number,
            'beneficiary_id': self.beneficiary_id,
            'assessor_id': self.assessor_id,
            'assessment_type': self.assessment_type,
            'assessment_tool': self.assessment_tool,
            'assessment_date': self.assessment_date.isoformat() if self.assessment_date else None,
            'status': self.status,
            'summary': self.summary,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

        if include_results:
            data['results'] = self.results
            data['scores'] = self.scores
            data['percentiles'] = self.percentiles
            data['domains_assessed'] = self.domains_assessed
            data['strengths'] = self.strengths
            data['weaknesses'] = self.weaknesses
            data['recommendations'] = self.recommendations
            data['comparison_notes'] = self.comparison_notes
            data['progress_indicators'] = self.progress_indicators
            data['attachments'] = self.attachments

        # معلومات المستفيد والمقيّم
        if self.beneficiary:
            data['beneficiary'] = {
                'id': self.beneficiary.id,
                'name': f"{self.beneficiary.first_name} {self.beneficiary.last_name}"
            }

        if self.assessor:
            data['assessor'] = {
                'id': self.assessor.id,
                'name': f"{self.assessor.first_name} {self.assessor.last_name}" if self.assessor.first_name else self.assessor.username
            }

        return data

    def calculate_overall_score(self):
        """حساب الدرجة الإجمالية"""
        if not self.scores:
            return None

        total = 0
        count = 0

        for domain, score in self.scores.items():
            if isinstance(score, (int, float)):
                total += score
                count += 1

        return total / count if count > 0 else None

    def compare_with_previous(self):
        """مقارنة مع التقييم السابق"""
        previous = Assessment.query.filter(
            Assessment.beneficiary_id == self.beneficiary_id,
            Assessment.assessment_date < self.assessment_date,
            Assessment.id != self.id
        ).order_by(Assessment.assessment_date.desc()).first()

        if not previous:
            return None

        comparison = {
            'previous_date': previous.assessment_date.isoformat(),
            'previous_score': previous.calculate_overall_score(),
            'current_score': self.calculate_overall_score(),
            'change': None
        }

        if comparison['previous_score'] and comparison['current_score']:
            comparison['change'] = comparison['current_score'] - comparison['previous_score']

        return comparison

    def __repr__(self):
        return f'<Assessment {self.assessment_number}>'
