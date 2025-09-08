#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
نماذج قاعدة البيانات للملف الشامل للطالب مع الاختبارات والمقاييس
Comprehensive Student File Models with Assessments and Tests
"""

# SQLAlchemy import removed - using centralized db instance
from datetime import datetime, date
import json

# Import db from database module to avoid conflicts
from database import db

class StudentComprehensiveFile(db.Model):
    """الملف الشامل للطالب"""
    __tablename__ = 'student_comprehensive_files'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    file_number = db.Column(db.String(50), unique=True, nullable=False)  # رقم الملف
    creation_date = db.Column(db.Date, default=date.today)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # معلومات أساسية
    personal_info = db.Column(db.JSON)  # المعلومات الشخصية
    medical_history = db.Column(db.JSON)  # التاريخ الطبي
    family_info = db.Column(db.JSON)  # معلومات الأسرة
    educational_background = db.Column(db.JSON)  # الخلفية التعليمية
    
    # حالة الملف
    status = db.Column(db.String(20), default='active')  # active, archived, transferred
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    assessments = db.relationship('StudentAssessmentRecord', backref='comprehensive_file', lazy=True)
    test_results = db.relationship('StudentTestResult', backref='comprehensive_file', lazy=True)
    progress_reports = db.relationship('StudentProgressReport', backref='comprehensive_file', lazy=True)
    documents = db.relationship('StudentDocument', backref='comprehensive_file', lazy=True)
    ai_analyses = db.relationship('StudentAIAnalysis', backref='comprehensive_file', lazy=True)

class AssessmentTemplate(db.Model):
    """قوالب الاختبارات والمقاييس"""
    __tablename__ = 'assessment_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200))
    description = db.Column(db.Text)
    category = db.Column(db.String(100), nullable=False)  # psychological, educational, behavioral, etc.
    age_range_min = db.Column(db.Integer)
    age_range_max = db.Column(db.Integer)
    
    # هيكل الاختبار
    sections = db.Column(db.JSON)  # أقسام الاختبار
    questions = db.Column(db.JSON)  # الأسئلة والعناصر
    scoring_method = db.Column(db.JSON)  # طريقة التصحيح
    interpretation_guide = db.Column(db.JSON)  # دليل التفسير
    
    # معلومات إضافية
    duration_minutes = db.Column(db.Integer)  # مدة الاختبار بالدقائق
    required_materials = db.Column(db.JSON)  # المواد المطلوبة
    administrator_qualifications = db.Column(db.JSON)  # مؤهلات المطبق
    
    # معايير الصدق والثبات
    validity_info = db.Column(db.JSON)
    reliability_info = db.Column(db.JSON)
    normative_data = db.Column(db.JSON)  # البيانات المعيارية
    
    # إعدادات النظام
    is_active = db.Column(db.Boolean, default=True)
    requires_ai_analysis = db.Column(db.Boolean, default=False)
    ai_analysis_type = db.Column(db.String(50))  # scoring, interpretation, recommendations
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

class StudentAssessmentRecord(db.Model):
    """سجل تطبيق الاختبارات والمقاييس على الطلاب"""
    __tablename__ = 'student_assessment_records'
    
    id = db.Column(db.Integer, primary_key=True)
    comprehensive_file_id = db.Column(db.Integer, db.ForeignKey('student_comprehensive_files.id'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('assessment_templates.id'), nullable=False)
    
    # معلومات التطبيق
    assessment_date = db.Column(db.Date, nullable=False)
    administrator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_number = db.Column(db.Integer, default=1)  # رقم الجلسة
    duration_actual = db.Column(db.Integer)  # المدة الفعلية
    
    # البيانات والنتائج
    responses = db.Column(db.JSON)  # إجابات الطالب
    raw_scores = db.Column(db.JSON)  # الدرجات الخام
    standard_scores = db.Column(db.JSON)  # الدرجات المعيارية
    percentiles = db.Column(db.JSON)  # المئينيات
    
    # التفسير والتوصيات
    interpretation = db.Column(db.Text)
    recommendations = db.Column(db.JSON)
    follow_up_needed = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.Date)
    
    # معلومات إضافية
    testing_conditions = db.Column(db.JSON)  # ظروف التطبيق
    behavioral_observations = db.Column(db.Text)  # الملاحظات السلوكية
    validity_concerns = db.Column(db.Text)  # مخاوف الصدق
    
    # حالة السجل
    status = db.Column(db.String(20), default='completed')  # scheduled, in_progress, completed, cancelled
    is_baseline = db.Column(db.Boolean, default=False)  # هل هو قياس أساسي
    
    # الذكاء الاصطناعي
    ai_analysis_requested = db.Column(db.Boolean, default=False)
    ai_analysis_completed = db.Column(db.Boolean, default=False)
    ai_confidence_score = db.Column(db.Float)
    
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    updated_date = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class StudentTestResult(db.Model):
    """نتائج الاختبارات المفصلة"""
    __tablename__ = 'student_test_results'
    
    id = db.Column(db.Integer, primary_key=True)
    comprehensive_file_id = db.Column(db.Integer, db.ForeignKey('student_comprehensive_files.id'), nullable=False)
    assessment_record_id = db.Column(db.Integer, db.ForeignKey('student_assessment_records.id'), nullable=False)
    
    # تفاصيل النتائج
    subtest_name = db.Column(db.String(200), nullable=False)
    raw_score = db.Column(db.Float)
    standard_score = db.Column(db.Float)
    percentile = db.Column(db.Float)
    age_equivalent = db.Column(db.String(20))
    grade_equivalent = db.Column(db.String(20))
    
    # التصنيف والتفسير
    performance_level = db.Column(db.String(50))  # superior, above_average, average, below_average, impaired
    confidence_interval = db.Column(db.JSON)  # فترة الثقة
    error_analysis = db.Column(db.JSON)  # تحليل الأخطاء
    
    # مقارنات
    previous_score = db.Column(db.Float)  # النتيجة السابقة
    change_significance = db.Column(db.String(20))  # significant_improvement, no_change, significant_decline
    
    created_date = db.Column(db.DateTime, default=datetime.utcnow)

class StudentProgressReport(db.Model):
    """تقارير تقدم الطالب"""
    __tablename__ = 'student_progress_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    comprehensive_file_id = db.Column(db.Integer, db.ForeignKey('student_comprehensive_files.id'), nullable=False)
    
    # معلومات التقرير
    report_type = db.Column(db.String(50), nullable=False)  # monthly, quarterly, annual, discharge
    report_period_start = db.Column(db.Date, nullable=False)
    report_period_end = db.Column(db.Date, nullable=False)
    generated_date = db.Column(db.Date, default=date.today)
    
    # محتوى التقرير
    executive_summary = db.Column(db.Text)
    goals_progress = db.Column(db.JSON)  # تقدم الأهداف
    assessment_changes = db.Column(db.JSON)  # تغيرات في النتائج
    behavioral_changes = db.Column(db.JSON)  # التغيرات السلوكية
    
    # التوصيات والخطط
    current_recommendations = db.Column(db.JSON)
    future_goals = db.Column(db.JSON)
    service_modifications = db.Column(db.JSON)  # تعديلات الخدمات
    
    # المشاركون في إعداد التقرير
    primary_author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    contributors = db.Column(db.JSON)  # المساهمون الآخرون
    
    # حالة التقرير
    status = db.Column(db.String(20), default='draft')  # draft, review, approved, distributed
    approval_date = db.Column(db.Date)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # الذكاء الاصطناعي
    ai_generated_insights = db.Column(db.JSON)
    ai_recommendations = db.Column(db.JSON)

class StudentDocument(db.Model):
    """وثائق ومرفقات الطالب"""
    __tablename__ = 'student_documents'
    
    id = db.Column(db.Integer, primary_key=True)
    comprehensive_file_id = db.Column(db.Integer, db.ForeignKey('student_comprehensive_files.id'), nullable=False)
    
    # معلومات الوثيقة
    document_type = db.Column(db.String(100), nullable=False)  # assessment_report, medical_record, etc.
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # الملف
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    
    # معلومات إضافية
    document_date = db.Column(db.Date)
    source = db.Column(db.String(200))  # مصدر الوثيقة
    confidentiality_level = db.Column(db.String(20), default='standard')  # public, standard, confidential, restricted
    
    # إعدادات النظام
    is_printable = db.Column(db.Boolean, default=True)
    is_exportable = db.Column(db.Boolean, default=True)
    requires_signature = db.Column(db.Boolean, default=False)
    
    uploaded_date = db.Column(db.DateTime, default=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

class StudentAIAnalysis(db.Model):
    """تحليلات الذكاء الاصطناعي للطالب"""
    __tablename__ = 'student_ai_analyses'
    
    id = db.Column(db.Integer, primary_key=True)
    comprehensive_file_id = db.Column(db.Integer, db.ForeignKey('student_comprehensive_files.id'), nullable=False)
    assessment_record_id = db.Column(db.Integer, db.ForeignKey('student_assessment_records.id'))
    
    # نوع التحليل
    analysis_type = db.Column(db.String(100), nullable=False)  # pattern_recognition, progress_prediction, etc.
    analysis_scope = db.Column(db.String(50), nullable=False)  # single_assessment, longitudinal, comparative
    
    # البيانات المدخلة
    input_data = db.Column(db.JSON)
    data_sources = db.Column(db.JSON)  # مصادر البيانات المستخدمة
    
    # نتائج التحليل
    findings = db.Column(db.JSON)
    patterns_identified = db.Column(db.JSON)
    risk_factors = db.Column(db.JSON)
    protective_factors = db.Column(db.JSON)
    
    # التنبؤات والتوصيات
    predictions = db.Column(db.JSON)
    confidence_scores = db.Column(db.JSON)
    recommendations = db.Column(db.JSON)
    intervention_suggestions = db.Column(db.JSON)
    
    # معلومات النموذج
    ai_model_used = db.Column(db.String(100))
    model_version = db.Column(db.String(20))
    processing_time = db.Column(db.Float)  # وقت المعالجة بالثواني
    
    # التحقق والمراجعة
    requires_human_review = db.Column(db.Boolean, default=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    review_date = db.Column(db.DateTime)
    review_notes = db.Column(db.Text)
    approved = db.Column(db.Boolean, default=False)
    
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

class FileExportImportLog(db.Model):
    """سجل عمليات التصدير والاستيراد"""
    __tablename__ = 'file_export_import_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    comprehensive_file_id = db.Column(db.Integer, db.ForeignKey('student_comprehensive_files.id'))
    
    # نوع العملية
    operation_type = db.Column(db.String(20), nullable=False)  # export, import
    export_format = db.Column(db.String(20))  # pdf, excel, json, xml
    
    # تفاصيل العملية
    data_included = db.Column(db.JSON)  # البيانات المشمولة
    file_path = db.Column(db.String(500))
    file_size = db.Column(db.Integer)
    
    # معلومات الأمان
    access_level = db.Column(db.String(20))  # full, limited, summary_only
    encryption_used = db.Column(db.Boolean, default=False)
    password_protected = db.Column(db.Boolean, default=False)
    
    # حالة العملية
    status = db.Column(db.String(20), default='pending')  # pending, completed, failed
    error_message = db.Column(db.Text)
    
    # معلومات المستخدم
    requested_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    request_date = db.Column(db.DateTime, default=datetime.utcnow)
    completion_date = db.Column(db.DateTime)
    
    # معلومات إضافية
    purpose = db.Column(db.String(200))  # الغرض من التصدير/الاستيراد
    recipient_info = db.Column(db.JSON)  # معلومات المستلم

class PrintJob(db.Model):
    """مهام الطباعة"""
    __tablename__ = 'print_jobs'
    
    id = db.Column(db.Integer, primary_key=True)
    comprehensive_file_id = db.Column(db.Integer, db.ForeignKey('student_comprehensive_files.id'))
    
    # تفاصيل المهمة
    job_name = db.Column(db.String(200), nullable=False)
    document_type = db.Column(db.String(100), nullable=False)  # full_file, assessment_report, progress_report
    content_selection = db.Column(db.JSON)  # المحتوى المحدد للطباعة
    
    # إعدادات الطباعة
    print_settings = db.Column(db.JSON)  # إعدادات الطباعة (حجم الورق، الألوان، إلخ)
    page_range = db.Column(db.String(50))
    copies = db.Column(db.Integer, default=1)
    
    # معلومات الأمان
    confidentiality_level = db.Column(db.String(20), default='standard')
    watermark_text = db.Column(db.String(100))
    requires_authorization = db.Column(db.Boolean, default=False)
    authorized_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # حالة المهمة
    status = db.Column(db.String(20), default='pending')  # pending, processing, completed, failed, cancelled
    printer_name = db.Column(db.String(100))
    
    # معلومات المستخدم
    requested_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    request_date = db.Column(db.DateTime, default=datetime.utcnow)
    completion_date = db.Column(db.DateTime)
    
    # معلومات إضافية
    purpose = db.Column(db.String(200))
    notes = db.Column(db.Text)

# إنشاء الفهارس لتحسين الأداء
db.Index('idx_comprehensive_file_student', StudentComprehensiveFile.student_id)
db.Index('idx_comprehensive_file_number', StudentComprehensiveFile.file_number)
db.Index('idx_assessment_record_file', StudentAssessmentRecord.comprehensive_file_id)
db.Index('idx_assessment_record_date', StudentAssessmentRecord.assessment_date)
db.Index('idx_test_result_file', StudentTestResult.comprehensive_file_id)
db.Index('idx_progress_report_file', StudentProgressReport.comprehensive_file_id)
db.Index('idx_document_file', StudentDocument.comprehensive_file_id)
db.Index('idx_ai_analysis_file', StudentAIAnalysis.comprehensive_file_id)
db.Index('idx_export_import_file', FileExportImportLog.comprehensive_file_id)
db.Index('idx_print_job_file', PrintJob.comprehensive_file_id)
