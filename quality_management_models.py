#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Quality Management and Accreditation System Models
نماذج نظام إدارة الجودة والاعتماد
"""

from database import db
from datetime import datetime, date
from sqlalchemy import func
import json

class QualityStandard(db.Model):
    """معايير الجودة"""
    __tablename__ = 'quality_standards'
    
    id = db.Column(db.Integer, primary_key=True)
    standard_code = db.Column(db.String(50), unique=True, nullable=False)  # ISO-9001-001
    standard_name = db.Column(db.String(200), nullable=False)
    standard_name_en = db.Column(db.String(200))
    category = db.Column(db.String(100), nullable=False)  # إدارية، تعليمية، علاجية، أمان
    description = db.Column(db.Text)
    requirements = db.Column(db.JSON)  # متطلبات المعيار
    measurement_criteria = db.Column(db.JSON)  # معايير القياس
    target_score = db.Column(db.Float, default=85.0)  # النتيجة المستهدفة
    weight = db.Column(db.Float, default=1.0)  # وزن المعيار
    compliance_level = db.Column(db.String(50), default='mandatory')  # إلزامي، مستحسن، اختياري
    international_standard = db.Column(db.String(100))  # ISO 9001, CARF, JCI
    version = db.Column(db.String(20), default='1.0')
    effective_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date)
    is_active = db.Column(db.Boolean, default=True)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    audits = db.relationship('QualityAudit', backref='standard', lazy='dynamic')
    assessments = db.relationship('QualityAssessment', backref='standard', lazy='dynamic')

class QualityAudit(db.Model):
    """تدقيق الجودة"""
    __tablename__ = 'quality_audits'
    
    id = db.Column(db.Integer, primary_key=True)
    audit_code = db.Column(db.String(50), unique=True, nullable=False)  # QA-2025-001
    audit_title = db.Column(db.String(200), nullable=False)
    audit_type = db.Column(db.String(50), nullable=False)  # داخلي، خارجي، ذاتي، اعتماد
    standard_id = db.Column(db.Integer, db.ForeignKey('quality_standards.id'), nullable=False)
    department = db.Column(db.String(100))  # القسم المُدقق
    clinic_id = db.Column(db.Integer, db.ForeignKey('clinics.id'))  # الفرع
    auditor_name = db.Column(db.String(100), nullable=False)
    auditor_certification = db.Column(db.String(100))  # شهادة المدقق
    audit_scope = db.Column(db.Text)  # نطاق التدقيق
    audit_objectives = db.Column(db.JSON)  # أهداف التدقيق
    planned_date = db.Column(db.Date, nullable=False)
    actual_start_date = db.Column(db.Date)
    actual_end_date = db.Column(db.Date)
    duration_hours = db.Column(db.Float)
    status = db.Column(db.String(50), default='planned')  # مخطط، جاري، مكتمل، ملغي
    overall_score = db.Column(db.Float)  # النتيجة الإجمالية
    compliance_percentage = db.Column(db.Float)  # نسبة الامتثال
    findings_count = db.Column(db.Integer, default=0)  # عدد الملاحظات
    major_nonconformities = db.Column(db.Integer, default=0)  # عدم المطابقة الرئيسي
    minor_nonconformities = db.Column(db.Integer, default=0)  # عدم المطابقة الثانوي
    opportunities_improvement = db.Column(db.Integer, default=0)  # فرص التحسين
    audit_summary = db.Column(db.Text)  # ملخص التدقيق
    recommendations = db.Column(db.JSON)  # التوصيات
    corrective_actions_required = db.Column(db.Boolean, default=False)
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.Date)
    certification_status = db.Column(db.String(50))  # معتمد، مشروط، مرفوض
    certificate_number = db.Column(db.String(100))
    certificate_valid_until = db.Column(db.Date)
    audit_report_path = db.Column(db.String(500))  # مسار تقرير التدقيق
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    clinic = db.relationship('Clinic', backref='quality_audits')
    findings = db.relationship('AuditFinding', backref='audit', lazy='dynamic')
    corrective_actions = db.relationship('CorrectiveAction', backref='audit', lazy='dynamic')

class AuditFinding(db.Model):
    """ملاحظات التدقيق"""
    __tablename__ = 'audit_findings'
    
    id = db.Column(db.Integer, primary_key=True)
    finding_code = db.Column(db.String(50), nullable=False)  # AF-001
    audit_id = db.Column(db.Integer, db.ForeignKey('quality_audits.id'), nullable=False)
    finding_type = db.Column(db.String(50), nullable=False)  # عدم مطابقة رئيسي، ثانوي، فرصة تحسين
    severity = db.Column(db.String(50), default='medium')  # عالي، متوسط، منخفض
    category = db.Column(db.String(100))  # إدارية، تقنية، سلامة، جودة
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    evidence = db.Column(db.Text)  # الأدلة
    requirement_reference = db.Column(db.String(200))  # مرجع المتطلب
    root_cause_analysis = db.Column(db.Text)  # تحليل السبب الجذري
    risk_assessment = db.Column(db.String(50))  # تقييم المخاطر
    impact_assessment = db.Column(db.Text)  # تقييم التأثير
    recommended_action = db.Column(db.Text)  # الإجراء الموصى به
    priority = db.Column(db.String(50), default='medium')  # عالي، متوسط، منخفض
    target_completion_date = db.Column(db.Date)
    responsible_person = db.Column(db.String(100))
    status = db.Column(db.String(50), default='open')  # مفتوح، قيد المعالجة، مغلق، مؤجل
    resolution_date = db.Column(db.Date)
    resolution_notes = db.Column(db.Text)
    verification_required = db.Column(db.Boolean, default=True)
    verification_date = db.Column(db.Date)
    verified_by = db.Column(db.String(100))
    attachments = db.Column(db.JSON)  # المرفقات
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)

class QualityAssessment(db.Model):
    """تقييم الجودة"""
    __tablename__ = 'quality_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_code = db.Column(db.String(50), unique=True, nullable=False)
    standard_id = db.Column(db.Integer, db.ForeignKey('quality_standards.id'), nullable=False)
    assessment_date = db.Column(db.Date, nullable=False)
    assessor_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100))
    clinic_id = db.Column(db.Integer, db.ForeignKey('clinics.id'))
    assessment_type = db.Column(db.String(50))  # ذاتي، داخلي، خارجي
    assessment_method = db.Column(db.String(100))  # مراجعة وثائق، مقابلة، ملاحظة، قياس
    criteria_scores = db.Column(db.JSON)  # نتائج المعايير الفرعية
    overall_score = db.Column(db.Float, nullable=False)
    compliance_percentage = db.Column(db.Float)
    performance_level = db.Column(db.String(50))  # ممتاز، جيد جداً، جيد، مقبول، ضعيف
    strengths = db.Column(db.JSON)  # نقاط القوة
    weaknesses = db.Column(db.JSON)  # نقاط الضعف
    improvement_opportunities = db.Column(db.JSON)  # فرص التحسين
    action_plan = db.Column(db.JSON)  # خطة العمل
    next_assessment_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    attachments = db.Column(db.JSON)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    clinic = db.relationship('Clinic', backref='quality_assessments')

class AccreditationBody(db.Model):
    """جهات الاعتماد"""
    __tablename__ = 'accreditation_bodies'
    
    id = db.Column(db.Integer, primary_key=True)
    body_code = db.Column(db.String(50), unique=True, nullable=False)
    body_name = db.Column(db.String(200), nullable=False)
    body_name_en = db.Column(db.String(200))
    country = db.Column(db.String(100))
    website = db.Column(db.String(200))
    contact_email = db.Column(db.String(100))
    contact_phone = db.Column(db.String(50))
    accreditation_scope = db.Column(db.JSON)  # نطاق الاعتماد
    standards_supported = db.Column(db.JSON)  # المعايير المدعومة
    recognition_level = db.Column(db.String(50))  # دولي، إقليمي، محلي
    validity_period_years = db.Column(db.Integer, default=3)
    renewal_notice_days = db.Column(db.Integer, default=90)
    is_active = db.Column(db.Boolean, default=True)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    certifications = db.relationship('AccreditationCertificate', backref='accreditation_body', lazy='dynamic')

class AccreditationCertificate(db.Model):
    """شهادات الاعتماد"""
    __tablename__ = 'accreditation_certificates'
    
    id = db.Column(db.Integer, primary_key=True)
    certificate_number = db.Column(db.String(100), unique=True, nullable=False)
    accreditation_body_id = db.Column(db.Integer, db.ForeignKey('accreditation_bodies.id'), nullable=False)
    clinic_id = db.Column(db.Integer, db.ForeignKey('clinics.id'))
    certificate_type = db.Column(db.String(100), nullable=False)  # ISO 9001, CARF, JCI
    scope_of_accreditation = db.Column(db.Text)
    issue_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), default='active')  # نشط، منتهي، معلق، ملغي
    grade = db.Column(db.String(50))  # A+, A, B+, B, C
    score = db.Column(db.Float)
    conditions = db.Column(db.JSON)  # شروط الاعتماد
    surveillance_dates = db.Column(db.JSON)  # تواريخ المراقبة
    renewal_application_date = db.Column(db.Date)
    renewal_status = db.Column(db.String(50))  # مطلوب، مقدم، قيد المراجعة، مكتمل
    certificate_file_path = db.Column(db.String(500))
    public_listing = db.Column(db.Boolean, default=True)  # إدراج عام
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    clinic = db.relationship('Clinic', backref='accreditation_certificates')

class PerformanceIndicator(db.Model):
    """مؤشرات الأداء"""
    __tablename__ = 'performance_indicators'
    
    id = db.Column(db.Integer, primary_key=True)
    indicator_code = db.Column(db.String(50), unique=True, nullable=False)
    indicator_name = db.Column(db.String(200), nullable=False)
    indicator_name_en = db.Column(db.String(200))
    category = db.Column(db.String(100), nullable=False)  # جودة، كفاءة، فعالية، رضا
    description = db.Column(db.Text)
    measurement_unit = db.Column(db.String(50))  # نسبة مئوية، عدد، وقت، تكلفة
    calculation_formula = db.Column(db.Text)  # صيغة الحساب
    data_source = db.Column(db.String(200))  # مصدر البيانات
    collection_frequency = db.Column(db.String(50))  # يومي، أسبوعي، شهري، ربع سنوي
    target_value = db.Column(db.Float)  # القيمة المستهدفة
    threshold_green = db.Column(db.Float)  # حد اللون الأخضر
    threshold_yellow = db.Column(db.Float)  # حد اللون الأصفر
    threshold_red = db.Column(db.Float)  # حد اللون الأحمر
    trend_direction = db.Column(db.String(20))  # تصاعدي، تنازلي، ثابت
    responsible_person = db.Column(db.String(100))
    review_frequency = db.Column(db.String(50))  # شهري، ربع سنوي، سنوي
    is_active = db.Column(db.Boolean, default=True)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    measurements = db.relationship('IndicatorMeasurement', backref='indicator', lazy='dynamic')

class IndicatorMeasurement(db.Model):
    """قياسات المؤشرات"""
    __tablename__ = 'indicator_measurements'
    
    id = db.Column(db.Integer, primary_key=True)
    indicator_id = db.Column(db.Integer, db.ForeignKey('performance_indicators.id'), nullable=False)
    measurement_date = db.Column(db.Date, nullable=False)
    measurement_period = db.Column(db.String(50))  # يناير 2025، Q1 2025، 2025
    clinic_id = db.Column(db.Integer, db.ForeignKey('clinics.id'))
    department = db.Column(db.String(100))
    actual_value = db.Column(db.Float, nullable=False)
    target_value = db.Column(db.Float)
    variance = db.Column(db.Float)  # الانحراف
    variance_percentage = db.Column(db.Float)  # نسبة الانحراف
    performance_status = db.Column(db.String(20))  # ممتاز، جيد، مقبول، ضعيف
    color_indicator = db.Column(db.String(20))  # أخضر، أصفر، أحمر
    trend_analysis = db.Column(db.String(50))  # تحسن، تراجع، ثابت
    contributing_factors = db.Column(db.JSON)  # العوامل المؤثرة
    improvement_actions = db.Column(db.JSON)  # إجراءات التحسين
    data_quality = db.Column(db.String(50), default='good')  # ممتاز، جيد، مقبول، ضعيف
    verified = db.Column(db.Boolean, default=False)
    verified_by = db.Column(db.String(100))
    verification_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    clinic = db.relationship('Clinic', backref='indicator_measurements')

class QualityImprovement(db.Model):
    """مشاريع تحسين الجودة"""
    __tablename__ = 'quality_improvements'
    
    id = db.Column(db.Integer, primary_key=True)
    project_code = db.Column(db.String(50), unique=True, nullable=False)
    project_title = db.Column(db.String(200), nullable=False)
    project_type = db.Column(db.String(50))  # تحسين عملية، تطوير خدمة، حل مشكلة
    priority = db.Column(db.String(50), default='medium')  # عالي، متوسط، منخفض
    category = db.Column(db.String(100))  # جودة، كفاءة، سلامة، رضا العملاء
    description = db.Column(db.Text, nullable=False)
    current_state = db.Column(db.Text)  # الوضع الحالي
    desired_state = db.Column(db.Text)  # الوضع المرغوب
    success_criteria = db.Column(db.JSON)  # معايير النجاح
    expected_benefits = db.Column(db.JSON)  # الفوائد المتوقعة
    resources_required = db.Column(db.JSON)  # الموارد المطلوبة
    estimated_cost = db.Column(db.Float)
    estimated_savings = db.Column(db.Float)
    roi_percentage = db.Column(db.Float)  # عائد الاستثمار
    project_manager = db.Column(db.String(100), nullable=False)
    team_members = db.Column(db.JSON)  # أعضاء الفريق
    sponsor = db.Column(db.String(100))  # الراعي
    start_date = db.Column(db.Date, nullable=False)
    planned_end_date = db.Column(db.Date, nullable=False)
    actual_end_date = db.Column(db.Date)
    status = db.Column(db.String(50), default='planning')  # تخطيط، تنفيذ، مراقبة، مكتمل، ملغي
    progress_percentage = db.Column(db.Float, default=0.0)
    milestones = db.Column(db.JSON)  # المعالم الرئيسية
    risks = db.Column(db.JSON)  # المخاطر
    issues = db.Column(db.JSON)  # القضايا
    lessons_learned = db.Column(db.Text)  # الدروس المستفادة
    final_report_path = db.Column(db.String(500))
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)

class ComplianceChecklist(db.Model):
    """قوائم الامتثال"""
    __tablename__ = 'compliance_checklists'
    
    id = db.Column(db.Integer, primary_key=True)
    checklist_code = db.Column(db.String(50), unique=True, nullable=False)
    checklist_name = db.Column(db.String(200), nullable=False)
    standard_id = db.Column(db.Integer, db.ForeignKey('quality_standards.id'))
    category = db.Column(db.String(100))  # سلامة، جودة، بيئة، أمان
    description = db.Column(db.Text)
    checklist_items = db.Column(db.JSON, nullable=False)  # بنود القائمة
    scoring_method = db.Column(db.String(50), default='percentage')  # نسبة مئوية، نقاط، مستويات
    passing_score = db.Column(db.Float, default=80.0)
    frequency = db.Column(db.String(50))  # يومي، أسبوعي، شهري، ربع سنوي
    responsible_role = db.Column(db.String(100))  # الدور المسؤول
    approval_required = db.Column(db.Boolean, default=False)
    version = db.Column(db.String(20), default='1.0')
    effective_date = db.Column(db.Date, nullable=False)
    review_date = db.Column(db.Date)
    is_active = db.Column(db.Boolean, default=True)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    standard = db.relationship('QualityStandard', backref='checklists')
    submissions = db.relationship('ChecklistSubmission', backref='checklist', lazy='dynamic')

class ChecklistSubmission(db.Model):
    """تقديم قوائم الامتثال"""
    __tablename__ = 'checklist_submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    submission_code = db.Column(db.String(50), unique=True, nullable=False)
    checklist_id = db.Column(db.Integer, db.ForeignKey('compliance_checklists.id'), nullable=False)
    clinic_id = db.Column(db.Integer, db.ForeignKey('clinics.id'))
    department = db.Column(db.String(100))
    submission_date = db.Column(db.Date, nullable=False)
    submitted_by = db.Column(db.String(100), nullable=False)
    reviewer = db.Column(db.String(100))
    review_date = db.Column(db.Date)
    responses = db.Column(db.JSON, nullable=False)  # إجابات البنود
    total_items = db.Column(db.Integer, nullable=False)
    compliant_items = db.Column(db.Integer, default=0)
    non_compliant_items = db.Column(db.Integer, default=0)
    not_applicable_items = db.Column(db.Integer, default=0)
    compliance_score = db.Column(db.Float)
    compliance_percentage = db.Column(db.Float)
    overall_status = db.Column(db.String(50))  # مطابق، غير مطابق، يحتاج تحسين
    non_compliance_issues = db.Column(db.JSON)  # قضايا عدم المطابقة
    corrective_actions = db.Column(db.JSON)  # الإجراءات التصحيحية
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.Date)
    approved = db.Column(db.Boolean, default=False)
    approved_by = db.Column(db.String(100))
    approval_date = db.Column(db.Date)
    comments = db.Column(db.Text)
    attachments = db.Column(db.JSON)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    clinic = db.relationship('Clinic', backref='checklist_submissions')

# Helper functions for quality management
def calculate_compliance_percentage(compliant_items, total_items, not_applicable_items=0):
    """حساب نسبة الامتثال"""
    applicable_items = total_items - not_applicable_items
    if applicable_items == 0:
        return 100.0
    return (compliant_items / applicable_items) * 100

def get_performance_status(score, thresholds):
    """تحديد حالة الأداء بناءً على النتيجة والحدود"""
    if score >= thresholds.get('excellent', 95):
        return 'ممتاز'
    elif score >= thresholds.get('good', 85):
        return 'جيد جداً'
    elif score >= thresholds.get('satisfactory', 75):
        return 'جيد'
    elif score >= thresholds.get('acceptable', 65):
        return 'مقبول'
    else:
        return 'ضعيف'

def get_color_indicator(score, green_threshold, yellow_threshold):
    """تحديد مؤشر اللون بناءً على النتيجة"""
    if score >= green_threshold:
        return 'أخضر'
    elif score >= yellow_threshold:
        return 'أصفر'
    else:
        return 'أحمر'
