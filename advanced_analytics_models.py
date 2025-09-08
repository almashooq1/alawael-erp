#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Advanced Analytics and Business Intelligence Models
Real-time analytics, predictive modeling, and interactive dashboards
"""

from datetime import datetime, date, timedelta
from enum import Enum
import uuid
import json

# Import db from database module to avoid conflicts
from database import db

class MetricType(Enum):
    """أنواع المقاييس"""
    COUNTER = 'counter'
    GAUGE = 'gauge'
    HISTOGRAM = 'histogram'
    PERCENTAGE = 'percentage'

class DashboardType(Enum):
    """أنواع لوحات المعلومات"""
    EXECUTIVE = 'executive'
    OPERATIONAL = 'operational'
    ANALYTICAL = 'analytical'
    REAL_TIME = 'real_time'

class PredictionModel(db.Model):
    """نماذج التنبؤ الذكية"""
    __tablename__ = 'prediction_models'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    model_type = db.Column(db.String(50), nullable=False)  # regression, classification, clustering
    target_variable = db.Column(db.String(100), nullable=False)
    features = db.Column(db.JSON, nullable=False)  # قائمة المتغيرات المستقلة
    algorithm = db.Column(db.String(100))  # linear_regression, random_forest, etc.
    model_parameters = db.Column(db.JSON)  # معاملات النموذج
    training_data_query = db.Column(db.Text)  # استعلام البيانات للتدريب
    accuracy_score = db.Column(db.Float)  # دقة النموذج
    last_trained = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    predictions = db.relationship('PredictionResult', backref='model', lazy=True)

class PredictionResult(db.Model):
    """نتائج التنبؤات"""
    __tablename__ = 'prediction_results'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = db.Column(db.String(36), db.ForeignKey('prediction_models.id'), nullable=False)
    entity_type = db.Column(db.String(50))  # student, teacher, program
    entity_id = db.Column(db.Integer)
    input_features = db.Column(db.JSON, nullable=False)
    predicted_value = db.Column(db.Float)
    predicted_class = db.Column(db.String(100))
    confidence_score = db.Column(db.Float)
    prediction_date = db.Column(db.DateTime, default=datetime.utcnow)
    actual_value = db.Column(db.Float)  # القيمة الفعلية للمقارنة
    is_accurate = db.Column(db.Boolean)  # هل كان التنبؤ دقيقاً
    
class InteractiveDashboard(db.Model):
    """لوحات المعلومات التفاعلية"""
    __tablename__ = 'interactive_dashboards'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    dashboard_type = db.Column(db.Enum(DashboardType), nullable=False)
    layout_config = db.Column(db.JSON, nullable=False)  # تكوين التخطيط
    widgets = db.Column(db.JSON, nullable=False)  # قائمة الودجات
    filters = db.Column(db.JSON)  # المرشحات المتاحة
    refresh_interval = db.Column(db.Integer, default=300)  # ثواني
    is_public = db.Column(db.Boolean, default=False)
    allowed_roles = db.Column(db.JSON)  # الأدوار المسموحة
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AnalyticsWidget(db.Model):
    """ودجات التحليلات"""
    __tablename__ = 'analytics_widgets'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    widget_type = db.Column(db.String(50), nullable=False)  # chart, table, kpi, gauge
    data_source = db.Column(db.String(100))  # اسم مصدر البيانات
    query = db.Column(db.Text, nullable=False)  # استعلام البيانات
    chart_config = db.Column(db.JSON)  # تكوين الرسم البياني
    update_frequency = db.Column(db.Integer, default=300)  # ثواني
    cache_duration = db.Column(db.Integer, default=60)  # ثواني
    is_real_time = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class KPIDefinition(db.Model):
    """تعريفات مؤشرات الأداء الرئيسية"""
    __tablename__ = 'kpi_definitions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))  # academic, financial, operational
    calculation_formula = db.Column(db.Text, nullable=False)
    unit = db.Column(db.String(50))  # %, count, hours, etc.
    target_value = db.Column(db.Float)
    warning_threshold = db.Column(db.Float)
    critical_threshold = db.Column(db.Float)
    is_higher_better = db.Column(db.Boolean, default=True)
    update_frequency = db.Column(db.String(20), default='daily')  # hourly, daily, weekly
    responsible_role = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class KPIValue(db.Model):
    """قيم مؤشرات الأداء"""
    __tablename__ = 'kpi_values'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    kpi_id = db.Column(db.String(36), db.ForeignKey('kpi_definitions.id'), nullable=False)
    value = db.Column(db.Float, nullable=False)
    period_start = db.Column(db.DateTime, nullable=False)
    period_end = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20))  # good, warning, critical
    trend = db.Column(db.String(20))  # up, down, stable
    variance_from_target = db.Column(db.Float)  # الانحراف عن الهدف
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    kpi = db.relationship('KPIDefinition', backref='values')

class DataAlert(db.Model):
    """تنبيهات البيانات"""
    __tablename__ = 'data_alerts'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    condition_query = db.Column(db.Text, nullable=False)  # شرط التنبيه
    severity = db.Column(db.String(20), default='medium')  # low, medium, high
    notification_channels = db.Column(db.JSON)  # email, sms, push
    recipients = db.Column(db.JSON)  # قائمة المستلمين
    is_active = db.Column(db.Boolean, default=True)
    last_triggered = db.Column(db.DateTime)
    trigger_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ReportTemplate(db.Model):
    """قوالب التقارير"""
    __tablename__ = 'report_templates'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))
    template_config = db.Column(db.JSON, nullable=False)  # تكوين القالب
    data_sources = db.Column(db.JSON)  # مصادر البيانات
    parameters = db.Column(db.JSON)  # معاملات التقرير
    output_formats = db.Column(db.JSON)  # PDF, Excel, HTML
    schedule_config = db.Column(db.JSON)  # جدولة التقرير
    is_automated = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class GeneratedReport(db.Model):
    """التقارير المولدة"""
    __tablename__ = 'generated_reports'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    template_id = db.Column(db.String(36), db.ForeignKey('report_templates.id'))
    name = db.Column(db.String(200), nullable=False)
    parameters_used = db.Column(db.JSON)
    file_path = db.Column(db.String(500))
    file_size = db.Column(db.Integer)  # بالبايت
    format = db.Column(db.String(20))  # PDF, Excel, HTML
    generation_time = db.Column(db.Float)  # وقت التوليد بالثواني
    generated_by = db.Column(db.String(100))
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)  # تاريخ انتهاء الصلاحية
    download_count = db.Column(db.Integer, default=0)
    
    # Relations
    template = db.relationship('ReportTemplate', backref='generated_reports')

class DataVisualization(db.Model):
    """تصورات البيانات المخصصة"""
    __tablename__ = 'data_visualizations'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    visualization_type = db.Column(db.String(50))  # 3d_chart, heatmap, treemap, etc.
    data_query = db.Column(db.Text, nullable=False)
    config = db.Column(db.JSON, nullable=False)  # تكوين التصور
    interactivity_options = db.Column(db.JSON)  # خيارات التفاعل
    animation_settings = db.Column(db.JSON)  # إعدادات الحركة
    color_scheme = db.Column(db.String(50))
    is_3d = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AnalyticsSession(db.Model):
    """جلسات التحليلات"""
    __tablename__ = 'analytics_sessions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    dashboard_id = db.Column(db.String(36), db.ForeignKey('interactive_dashboards.id'))
    session_start = db.Column(db.DateTime, default=datetime.utcnow)
    session_end = db.Column(db.DateTime)
    interactions = db.Column(db.JSON)  # سجل التفاعلات
    filters_applied = db.Column(db.JSON)  # المرشحات المطبقة
    widgets_viewed = db.Column(db.JSON)  # الودجات المعروضة
    export_actions = db.Column(db.JSON)  # عمليات التصدير
    
    # Relations
    user = db.relationship('User', backref='analytics_sessions')
    dashboard = db.relationship('InteractiveDashboard', backref='sessions')
