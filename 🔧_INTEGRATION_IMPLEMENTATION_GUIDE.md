# 🔧 دليل التكامل والتنفيذ الشامل لنظام التقارير

# Complete Integration and Implementation Guide

---

## 🏗️ معمارية نظام التقارير

```
┌─────────────────────────────────────────────────────────────┐
│                    Reporting System Architecture             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Frontend   │  │   Backend    │  │   Database   │     │
│  │    Layer     │  │    Layer     │  │    Layer     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────▼───────────────────▼──────────────────▼─────────┐  │
│  │         Report Generation Engine                       │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌─────────┐ │  │
│  │  │Template │ │ Data     │ │Visualization│ │ Export  │ │  │
│  │  │Engine   │ │Aggregator│ │ Engine      │ │ Engine  │ │  │
│  │  └─────────┘ └──────────┘ └────────────┘ └─────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Storage & Delivery Layer                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │ PDF/Excel│ │ Archive  │ │ Email    │           │  │
│  │  │ Storage  │ │ System   │ │ Delivery │           │  │
│  │  └──────────┘ └──────────┘ └──────────┘           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 نماذج قاعدة البيانات

### 1️⃣ Report Models

```python
"""
نماذج قاعدة البيانات لنظام التقارير
"""

from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import JSON, ARRAY

class ReportTemplate(db.Model):
    """قالب التقرير"""
    __tablename__ = 'report_templates'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    name_ar = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    description_ar = db.Column(db.Text)

    # نوع التقرير
    report_type = db.Column(db.String(50), nullable=False)
    # individual, progress, group_comparison, institutional, program, statistical

    # القالب
    template_file = db.Column(db.String(255))  # مسار ملف القالب
    template_engine = db.Column(db.String(50), default='jinja2')

    # إعدادات
    settings = db.Column(JSON, default={})
    # {
    #   "sections": ["profile", "assessments", "progress", "recommendations"],
    #   "charts": ["timeline", "radar", "heatmap"],
    #   "export_formats": ["pdf", "excel", "html"],
    #   "language": "ar",
    #   "page_size": "A4",
    #   "orientation": "portrait"
    # }

    # صلاحيات
    required_roles = db.Column(ARRAY(db.String), default=[])

    # الحالة
    is_active = db.Column(db.Boolean, default=True)
    is_public = db.Column(db.Boolean, default=False)

    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # العلاقات
    reports = db.relationship('GeneratedReport', backref='template', lazy='dynamic')

    def __repr__(self):
        return f'<ReportTemplate {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'name_ar': self.name_ar,
            'description': self.description,
            'description_ar': self.description_ar,
            'report_type': self.report_type,
            'settings': self.settings,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class GeneratedReport(db.Model):
    """تقرير مُولَّد"""
    __tablename__ = 'generated_reports'

    id = db.Column(db.Integer, primary_key=True)
    report_number = db.Column(db.String(50), unique=True, nullable=False)

    # القالب المستخدم
    template_id = db.Column(db.Integer, db.ForeignKey('report_templates.id'), nullable=False)

    # المستفيد/المستفيدون
    beneficiary_ids = db.Column(ARRAY(db.Integer), default=[])

    # البيانات المُستخدمة
    data_snapshot = db.Column(JSON, default={})
    # البيانات المستخدمة في وقت إنشاء التقرير

    # الإعدادات المُستخدمة
    generation_settings = db.Column(JSON, default={})
    # {
    #   "date_range": {"start": "2025-01-01", "end": "2026-01-14"},
    #   "include_charts": true,
    #   "include_recommendations": true,
    #   "language": "ar"
    # }

    # الملفات المُولَّدة
    pdf_file_path = db.Column(db.String(255))
    excel_file_path = db.Column(db.String(255))
    html_file_path = db.Column(db.String(255))

    # الحالة
    status = db.Column(db.String(50), default='generating')
    # generating, completed, failed, archived

    error_message = db.Column(db.Text)

    # البيانات الوصفية
    file_size_pdf = db.Column(db.Integer)  # بالبايت
    file_size_excel = db.Column(db.Integer)
    generation_time = db.Column(db.Float)  # بالثواني

    # المشاهدات والتنزيلات
    view_count = db.Column(db.Integer, default=0)
    download_count = db.Column(db.Integer, default=0)

    # التواريخ
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)  # تاريخ انتهاء الصلاحية
    archived_at = db.Column(db.DateTime)

    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # العلاقات
    shares = db.relationship('ReportShare', backref='report', lazy='dynamic')
    comments = db.relationship('ReportComment', backref='report', lazy='dynamic')

    def __repr__(self):
        return f'<GeneratedReport {self.report_number}>'

    def to_dict(self):
        return {
            'id': self.id,
            'report_number': self.report_number,
            'template': self.template.to_dict() if self.template else None,
            'beneficiary_ids': self.beneficiary_ids,
            'status': self.status,
            'pdf_file_path': self.pdf_file_path,
            'excel_file_path': self.excel_file_path,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'view_count': self.view_count,
            'download_count': self.download_count
        }


class ReportSchedule(db.Model):
    """جدولة التقارير التلقائية"""
    __tablename__ = 'report_schedules'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)

    # القالب
    template_id = db.Column(db.Integer, db.ForeignKey('report_templates.id'), nullable=False)

    # المستفيدون
    beneficiary_ids = db.Column(ARRAY(db.Integer), default=[])
    beneficiary_filter = db.Column(JSON, default={})
    # {"disability_type": "autism", "age_range": [4, 12]}

    # التكرار
    frequency = db.Column(db.String(50), nullable=False)
    # daily, weekly, monthly, quarterly, yearly

    schedule_cron = db.Column(db.String(100))  # Cron expression

    # الإعدادات
    settings = db.Column(JSON, default={})

    # المستلمون
    recipients = db.Column(ARRAY(db.String), default=[])  # قائمة البريد الإلكتروني

    # الحالة
    is_active = db.Column(db.Boolean, default=True)

    # آخر تشغيل
    last_run_at = db.Column(db.DateTime)
    last_run_status = db.Column(db.String(50))
    next_run_at = db.Column(db.DateTime)

    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    def __repr__(self):
        return f'<ReportSchedule {self.name}>'


class ReportShare(db.Model):
    """مشاركة التقارير"""
    __tablename__ = 'report_shares'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('generated_reports.id'), nullable=False)

    # المشاركة
    shared_with_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    shared_with_email = db.Column(db.String(255))

    # الصلاحيات
    can_view = db.Column(db.Boolean, default=True)
    can_download = db.Column(db.Boolean, default=False)
    can_share = db.Column(db.Boolean, default=False)

    # رمز الوصول
    access_token = db.Column(db.String(255), unique=True)

    # التواريخ
    shared_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    last_accessed_at = db.Column(db.DateTime)

    shared_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    def __repr__(self):
        return f'<ReportShare {self.id}>'


class ReportComment(db.Model):
    """تعليقات على التقارير"""
    __tablename__ = 'report_comments'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('generated_reports.id'), nullable=False)

    comment_text = db.Column(db.Text, nullable=False)

    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    def __repr__(self):
        return f'<ReportComment {self.id}>'
```

---

## 🔌 Backend Services

### 1️⃣ Report Service

```python
"""
خدمة إنشاء التقارير
"""

import os
import uuid
from datetime import datetime, timedelta
from flask import current_app
from sqlalchemy import and_, or_
from app import db
from app.models.report import GeneratedReport, ReportTemplate
from app.services.pdf_generator import PDFGenerator
from app.services.excel_generator import ExcelGenerator
from app.services.data_aggregator import DataAggregator
from app.services.chart_generator import ChartGenerator

class ReportService:
    """خدمة إنشاء وإدارة التقارير"""

    def __init__(self):
        self.pdf_generator = PDFGenerator()
        self.excel_generator = ExcelGenerator()
        self.data_aggregator = DataAggregator()
        self.chart_generator = ChartGenerator()

    def generate_report(self, template_id, beneficiary_ids, settings=None, user_id=None):
        """إنشاء تقرير جديد"""
        try:
            start_time = datetime.utcnow()

            # جلب القالب
            template = ReportTemplate.query.get(template_id)
            if not template or not template.is_active:
                raise ValueError("قالب التقرير غير موجود أو غير نشط")

            # دمج الإعدادات
            generation_settings = {**template.settings, **(settings or {})}

            # جمع البيانات
            report_data = self._aggregate_data(
                template.report_type,
                beneficiary_ids,
                generation_settings
            )

            # إنشاء رقم التقرير
            report_number = self._generate_report_number()

            # إنشاء سجل التقرير
            report = GeneratedReport(
                report_number=report_number,
                template_id=template_id,
                beneficiary_ids=beneficiary_ids,
                data_snapshot=report_data,
                generation_settings=generation_settings,
                status='generating',
                generated_by=user_id
            )
            db.session.add(report)
            db.session.commit()

            # إنشاء الرسوم البيانية
            charts = self._generate_charts(report_data, generation_settings)
            report_data['charts'] = charts

            # توليد الملفات
            files_generated = {}

            if 'pdf' in generation_settings.get('export_formats', ['pdf']):
                pdf_path = self.pdf_generator.generate(
                    template,
                    report_data,
                    report_number
                )
                report.pdf_file_path = pdf_path
                report.file_size_pdf = os.path.getsize(pdf_path)
                files_generated['pdf'] = pdf_path

            if 'excel' in generation_settings.get('export_formats', []):
                excel_path = self.excel_generator.generate(
                    template,
                    report_data,
                    report_number
                )
                report.excel_file_path = excel_path
                report.file_size_excel = os.path.getsize(excel_path)
                files_generated['excel'] = excel_path

            # تحديث الحالة
            end_time = datetime.utcnow()
            report.status = 'completed'
            report.generation_time = (end_time - start_time).total_seconds()
            report.data_snapshot = report_data

            db.session.commit()

            return {
                'success': True,
                'report_id': report.id,
                'report_number': report_number,
                'files': files_generated,
                'generation_time': report.generation_time
            }

        except Exception as e:
            if 'report' in locals():
                report.status = 'failed'
                report.error_message = str(e)
                db.session.commit()

            return {
                'success': False,
                'error': str(e)
            }

    def _aggregate_data(self, report_type, beneficiary_ids, settings):
        """جمع وتجميع البيانات"""
        if report_type == 'individual':
            return self.data_aggregator.get_individual_data(beneficiary_ids[0], settings)
        elif report_type == 'progress':
            return self.data_aggregator.get_progress_data(beneficiary_ids[0], settings)
        elif report_type == 'group_comparison':
            return self.data_aggregator.get_group_comparison_data(beneficiary_ids, settings)
        elif report_type == 'institutional':
            return self.data_aggregator.get_institutional_data(settings)
        elif report_type == 'program':
            return self.data_aggregator.get_program_data(settings.get('program_id'), settings)
        elif report_type == 'statistical':
            return self.data_aggregator.get_statistical_data(settings)
        else:
            raise ValueError(f"نوع التقرير غير مدعوم: {report_type}")

    def _generate_charts(self, data, settings):
        """إنشاء الرسوم البيانية"""
        charts = {}
        chart_types = settings.get('charts', [])

        if 'timeline' in chart_types:
            charts['timeline'] = self.chart_generator.create_timeline_chart(data)

        if 'radar' in chart_types:
            charts['radar'] = self.chart_generator.create_radar_chart(data)

        if 'heatmap' in chart_types:
            charts['heatmap'] = self.chart_generator.create_heatmap(data)

        if 'bar' in chart_types:
            charts['bar'] = self.chart_generator.create_bar_chart(data)

        if 'pie' in chart_types:
            charts['pie'] = self.chart_generator.create_pie_chart(data)

        return charts

    def _generate_report_number(self):
        """توليد رقم تقرير فريد"""
        prefix = 'RPT'
        year = datetime.now().year
        timestamp = datetime.now().strftime('%m%d%H%M%S')
        random_suffix = str(uuid.uuid4().hex[:6]).upper()
        return f'{prefix}-{year}-{timestamp}-{random_suffix}'

    def get_report(self, report_id):
        """جلب تقرير"""
        report = GeneratedReport.query.get(report_id)
        if not report:
            raise ValueError("التقرير غير موجود")
        return report

    def list_reports(self, filters=None, page=1, per_page=20):
        """قائمة التقارير مع التصفية"""
        query = GeneratedReport.query

        if filters:
            if 'template_id' in filters:
                query = query.filter(GeneratedReport.template_id == filters['template_id'])

            if 'beneficiary_id' in filters:
                query = query.filter(GeneratedReport.beneficiary_ids.contains([filters['beneficiary_id']]))

            if 'status' in filters:
                query = query.filter(GeneratedReport.status == filters['status'])

            if 'date_from' in filters:
                query = query.filter(GeneratedReport.generated_at >= filters['date_from'])

            if 'date_to' in filters:
                query = query.filter(GeneratedReport.generated_at <= filters['date_to'])

            if 'generated_by' in filters:
                query = query.filter(GeneratedReport.generated_by == filters['generated_by'])

        query = query.order_by(GeneratedReport.generated_at.desc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return {
            'reports': [report.to_dict() for report in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }

    def download_report(self, report_id, format='pdf'):
        """تنزيل تقرير"""
        report = self.get_report(report_id)

        if format == 'pdf' and report.pdf_file_path:
            report.download_count += 1
            db.session.commit()
            return report.pdf_file_path
        elif format == 'excel' and report.excel_file_path:
            report.download_count += 1
            db.session.commit()
            return report.excel_file_path
        else:
            raise ValueError(f"التنسيق {format} غير متوفر لهذا التقرير")

    def delete_report(self, report_id):
        """حذف تقرير"""
        report = self.get_report(report_id)

        # حذف الملفات
        if report.pdf_file_path and os.path.exists(report.pdf_file_path):
            os.remove(report.pdf_file_path)

        if report.excel_file_path and os.path.exists(report.excel_file_path):
            os.remove(report.excel_file_path)

        # حذف من قاعدة البيانات
        db.session.delete(report)
        db.session.commit()

        return {'success': True}
```

---

### 2️⃣ Data Aggregator Service

```python
"""
خدمة تجميع البيانات
"""

from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_
from app import db
from app.models.beneficiary import Beneficiary
from app.models.assessment import Assessment, AssessmentResult
from app.models.program import Program, ProgramEnrollment
from app.models.progress import ProgressAssessment
from app.models.session import Session

class DataAggregator:
    """خدمة تجميع البيانات للتقارير"""

    def get_individual_data(self, beneficiary_id, settings):
        """جمع بيانات المستفيد الفردية"""
        beneficiary = Beneficiary.query.get(beneficiary_id)
        if not beneficiary:
            raise ValueError("المستفيد غير موجود")

        data = {
            'beneficiary': self._get_beneficiary_profile(beneficiary),
            'assessments': self._get_assessments_summary(beneficiary_id, settings),
            'programs': self._get_enrolled_programs(beneficiary_id, settings),
            'progress': self._get_progress_analysis(beneficiary_id, settings),
            'sessions': self._get_sessions_summary(beneficiary_id, settings),
            'goals': self._get_goals_status(beneficiary_id, settings),
            'recommendations': self._generate_recommendations(beneficiary_id, settings)
        }

        return data

    def _get_beneficiary_profile(self, beneficiary):
        """معلومات المستفيد الأساسية"""
        return {
            'id': beneficiary.id,
            'name': beneficiary.full_name,
            'national_id': beneficiary.national_id,
            'date_of_birth': beneficiary.date_of_birth.isoformat() if beneficiary.date_of_birth else None,
            'age_years': beneficiary.age_years,
            'age_months': beneficiary.age_months,
            'gender': beneficiary.gender,
            'diagnosis': beneficiary.diagnosis,
            'disability_type': beneficiary.disability_type,
            'disability_severity': beneficiary.disability_severity,
            'enrollment_date': beneficiary.enrollment_date.isoformat() if beneficiary.enrollment_date else None,
            'guardian_name': beneficiary.guardian_name,
            'phone': beneficiary.phone,
            'email': beneficiary.email
        }

    def _get_assessments_summary(self, beneficiary_id, settings):
        """ملخص التقييمات"""
        date_range = settings.get('date_range', {})

        query = AssessmentResult.query.filter(
            AssessmentResult.beneficiary_id == beneficiary_id
        )

        if date_range.get('start'):
            query = query.filter(AssessmentResult.assessment_date >= date_range['start'])
        if date_range.get('end'):
            query = query.filter(AssessmentResult.assessment_date <= date_range['end'])

        results = query.order_by(AssessmentResult.assessment_date.desc()).all()

        assessments = []
        for result in results:
            assessments.append({
                'id': result.id,
                'assessment_name': result.assessment.name,
                'assessment_name_ar': result.assessment.name_ar,
                'date': result.assessment_date.isoformat(),
                'scores': result.scores,
                'total_score': result.total_score,
                'percentile': result.percentile,
                'severity': result.severity,
                'interpretation': result.interpretation,
                'recommendations': result.recommendations
            })

        return {
            'total_count': len(assessments),
            'assessments': assessments,
            'strengths': self._identify_strengths(assessments),
            'areas_for_improvement': self._identify_weaknesses(assessments)
        }

    def _get_progress_analysis(self, beneficiary_id, settings):
        """تحليل التقدم المحرز"""
        # جلب خط الأساس
        baseline = ProgressAssessment.query.filter(
            and_(
                ProgressAssessment.beneficiary_id == beneficiary_id,
                ProgressAssessment.is_baseline == True
            )
        ).first()

        # جلب أحدث تقييم
        current = ProgressAssessment.query.filter(
            ProgressAssessment.beneficiary_id == beneficiary_id
        ).order_by(ProgressAssessment.assessment_date.desc()).first()

        if not baseline or not current:
            return {'error': 'لا توجد بيانات تقدم كافية'}

        domains = ['cognitive', 'motor', 'communication', 'social', 'adaptive', 'sensory']
        progress = {}

        for domain in domains:
            baseline_score = getattr(baseline, f'{domain}_score', 0)
            current_score = getattr(current, f'{domain}_score', 0)

            if baseline_score > 0:
                improvement = current_score - baseline_score
                percent_change = (improvement / baseline_score) * 100

                progress[domain] = {
                    'baseline': baseline_score,
                    'current': current_score,
                    'improvement': improvement,
                    'percent_change': round(percent_change, 2),
                    'trend': self._calculate_trend(beneficiary_id, domain),
                    'rate': self._calculate_rate_of_change(beneficiary_id, domain)
                }

        return {
            'progress_by_domain': progress,
            'overall_progress': self._calculate_overall_progress(progress),
            'timeline': self._get_progress_timeline(beneficiary_id)
        }

    def _calculate_trend(self, beneficiary_id, domain):
        """حساب الاتجاه"""
        assessments = ProgressAssessment.query.filter(
            ProgressAssessment.beneficiary_id == beneficiary_id
        ).order_by(ProgressAssessment.assessment_date).all()

        if len(assessments) < 3:
            return 'insufficient_data'

        scores = [getattr(a, f'{domain}_score', 0) for a in assessments[-5:]]

        # حساب الاتجاه باستخدام الانحدار البسيط
        n = len(scores)
        x = list(range(n))
        x_mean = sum(x) / n
        y_mean = sum(scores) / n

        numerator = sum((x[i] - x_mean) * (scores[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

        if denominator == 0:
            return 'stable'

        slope = numerator / denominator

        if slope > 0.5:
            return 'improving'
        elif slope < -0.5:
            return 'declining'
        else:
            return 'stable'

    def get_institutional_data(self, settings):
        """بيانات الأداء المؤسسي"""
        date_range = settings.get('date_range', {})

        return {
            'beneficiary_statistics': self._get_beneficiary_stats(date_range),
            'service_utilization': self._get_service_utilization(date_range),
            'clinical_outcomes': self._get_clinical_outcomes(date_range),
            'staff_productivity': self._get_staff_productivity(date_range),
            'quality_indicators': self._get_quality_indicators(date_range)
        }

    def _get_beneficiary_stats(self, date_range):
        """إحصائيات المستفيدين"""
        query = Beneficiary.query

        total = query.count()
        active = query.filter(Beneficiary.status == 'active').count()

        # التسجيلات الجديدة
        new_query = query
        if date_range.get('start'):
            new_query = new_query.filter(Beneficiary.enrollment_date >= date_range['start'])
        if date_range.get('end'):
            new_query = new_query.filter(Beneficiary.enrollment_date <= date_range['end'])
        new_enrollments = new_query.count()

        # التوزيع الديموغرافي
        by_age = db.session.query(
            Beneficiary.age_group,
            func.count(Beneficiary.id)
        ).group_by(Beneficiary.age_group).all()

        by_disability = db.session.query(
            Beneficiary.disability_type,
            func.count(Beneficiary.id)
        ).group_by(Beneficiary.disability_type).all()

        return {
            'total_beneficiaries': total,
            'active_cases': active,
            'new_enrollments': new_enrollments,
            'by_age': dict(by_age),
            'by_disability': dict(by_disability)
        }
```

---

## 🎯 API Endpoints

```python
"""
API endpoints لنظام التقارير
"""

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.report_service import ReportService
from app.utils.decorators import admin_required, therapist_required

bp = Blueprint('reports', __name__, url_prefix='/api/reports')
report_service = ReportService()

@bp.route('/templates', methods=['GET'])
@jwt_required()
def list_templates():
    """قائمة قوالب التقارير"""
    templates = ReportTemplate.query.filter_by(is_active=True).all()
    return jsonify({
        'success': True,
        'templates': [t.to_dict() for t in templates]
    })

@bp.route('/generate', methods=['POST'])
@jwt_required()
@therapist_required
def generate_report():
    """إنشاء تقرير جديد"""
    data = request.get_json()
    current_user = get_jwt_identity()

    result = report_service.generate_report(
        template_id=data.get('template_id'),
        beneficiary_ids=data.get('beneficiary_ids'),
        settings=data.get('settings'),
        user_id=current_user['id']
    )

    return jsonify(result)

@bp.route('/', methods=['GET'])
@jwt_required()
def list_reports():
    """قائمة التقارير"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    filters = {
        'template_id': request.args.get('template_id', type=int),
        'beneficiary_id': request.args.get('beneficiary_id', type=int),
        'status': request.args.get('status'),
        'date_from': request.args.get('date_from'),
        'date_to': request.args.get('date_to')
    }
    filters = {k: v for k, v in filters.items() if v is not None}

    result = report_service.list_reports(filters, page, per_page)
    return jsonify({'success': True, **result})

@bp.route('/<int:report_id>', methods=['GET'])
@jwt_required()
def get_report(report_id):
    """جلب تقرير محدد"""
    report = report_service.get_report(report_id)
    return jsonify({
        'success': True,
        'report': report.to_dict()
    })

@bp.route('/<int:report_id>/download/<format>', methods=['GET'])
@jwt_required()
def download_report(report_id, format):
    """تنزيل تقرير"""
    file_path = report_service.download_report(report_id, format)
    return send_file(
        file_path,
        as_attachment=True,
        download_name=f'report_{report_id}.{format}'
    )

@bp.route('/<int:report_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_report(report_id):
    """حذف تقرير"""
    result = report_service.delete_report(report_id)
    return jsonify(result)
```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ دليل التكامل والتنفيذ الشامل جاهز
