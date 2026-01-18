"""
نموذج التقرير (Report)
"""

from . import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class Report(db.Model):
    """نموذج التقرير"""

    __tablename__ = 'reports'

    # الحقول الأساسية
    id = db.Column(db.Integer, primary_key=True)
    report_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    report_type = db.Column(db.String(50), nullable=False, index=True)
    # individual, progress, group, institutional, program, statistical, family, insurance, qol, abas, integration, recommendations

    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)

    # العلاقات
    beneficiary_id = db.Column(db.Integer, db.ForeignKey('beneficiaries.id'), index=True)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # المحتوى
    content = db.Column(JSON)  # محتوى التقرير بصيغة JSON
    summary = db.Column(db.Text)
    recommendations = db.Column(JSON)

    # الفترة الزمنية
    period_start = db.Column(db.Date)
    period_end = db.Column(db.Date)
    report_date = db.Column(db.Date, default=datetime.utcnow, nullable=False)

    # الحالة
    status = db.Column(db.String(20), default='draft', index=True)
    # draft, pending_review, approved, published, archived

    # المرفقات والملفات
    attachments = db.Column(JSON)  # قائمة المرفقات
    generated_files = db.Column(JSON)  # الملفات المُولدة (PDF, Excel, etc.)

    # المشاركة
    is_shared = db.Column(db.Boolean, default=False)
    shared_with = db.Column(JSON)  # قائمة المستخدمين المشاركين
    share_token = db.Column(db.String(100), unique=True, index=True)
    share_expires_at = db.Column(db.DateTime)

    # الإحصائيات
    views_count = db.Column(db.Integer, default=0)
    downloads_count = db.Column(db.Integer, default=0)

    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = db.Column(db.DateTime)

    # العلاقات
    comments = db.relationship('ReportComment', backref='report', lazy='dynamic', cascade='all, delete-orphan')
    versions = db.relationship('ReportVersion', backref='report', lazy='dynamic', cascade='all, delete-orphan')

    def __init__(self, **kwargs):
        super(Report, self).__init__(**kwargs)
        if not self.report_number:
            self.report_number = self.generate_report_number()

    def generate_report_number(self):
        """توليد رقم تقرير فريد"""
        from datetime import datetime
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        return f"RPT-{timestamp}"

    def to_dict(self, include_content=False):
        """تحويل لـ dictionary"""
        data = {
            'id': self.id,
            'report_number': self.report_number,
            'report_type': self.report_type,
            'title': self.title,
            'description': self.description,
            'beneficiary_id': self.beneficiary_id,
            'author_id': self.author_id,
            'status': self.status,
            'report_date': self.report_date.isoformat() if self.report_date else None,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'is_shared': self.is_shared,
            'views_count': self.views_count,
            'downloads_count': self.downloads_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'published_at': self.published_at.isoformat() if self.published_at else None
        }

        if include_content:
            data['content'] = self.content
            data['summary'] = self.summary
            data['recommendations'] = self.recommendations
            data['attachments'] = self.attachments
            data['generated_files'] = self.generated_files

        # إضافة معلومات المستفيد والمؤلف
        if self.beneficiary:
            data['beneficiary'] = {
                'id': self.beneficiary.id,
                'name': f"{self.beneficiary.first_name} {self.beneficiary.last_name}"
            }

        if self.author:
            data['author'] = {
                'id': self.author.id,
                'name': f"{self.author.first_name} {self.author.last_name}" if self.author.first_name else self.author.username
            }

        return data

    def increment_views(self):
        """زيادة عدد المشاهدات"""
        self.views_count += 1
        db.session.commit()

    def increment_downloads(self):
        """زيادة عدد التنزيلات"""
        self.downloads_count += 1
        db.session.commit()

    def publish(self):
        """نشر التقرير"""
        self.status = 'published'
        self.published_at = datetime.utcnow()
        db.session.commit()

    def archive(self):
        """أرشفة التقرير"""
        self.status = 'archived'
        db.session.commit()

    def __repr__(self):
        return f'<Report {self.report_number}: {self.title}>'


class ReportComment(db.Model):
    """تعليقات التقارير"""

    __tablename__ = 'report_comments'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    content = db.Column(db.Text, nullable=False)
    position = db.Column(JSON)  # موقع التعليق في المستند

    parent_id = db.Column(db.Integer, db.ForeignKey('report_comments.id'))  # للردود
    is_resolved = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # العلاقات
    replies = db.relationship('ReportComment', backref=db.backref('parent', remote_side=[id]), lazy='dynamic')
    user = db.relationship('User', backref='report_comments')

    def to_dict(self):
        return {
            'id': self.id,
            'report_id': self.report_id,
            'user_id': self.user_id,
            'content': self.content,
            'position': self.position,
            'is_resolved': self.is_resolved,
            'created_at': self.created_at.isoformat(),
            'user': {
                'id': self.user.id,
                'name': f"{self.user.first_name} {self.user.last_name}" if self.user.first_name else self.user.username
            }
        }


class ReportVersion(db.Model):
    """سجل إصدارات التقارير"""

    __tablename__ = 'report_versions'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    version_number = db.Column(db.Integer, nullable=False)
    content = db.Column(JSON)  # نسخة من المحتوى
    changes_summary = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='report_versions')

    def to_dict(self):
        return {
            'id': self.id,
            'version_number': self.version_number,
            'changes_summary': self.changes_summary,
            'created_at': self.created_at.isoformat(),
            'user': {
                'id': self.user.id,
                'name': f"{self.user.first_name} {self.user.last_name}" if self.user.first_name else self.user.username
            }
        }
