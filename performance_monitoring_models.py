#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Performance Monitoring System Models
Real-time performance monitoring and analytics for Al-Awael Centers
"""

# SQLAlchemy import removed - using centralized db instance
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, Enum as SQLEnum, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime, date
from enum import Enum
import uuid

# Import db from database module to avoid conflicts
from database import db

class MetricType(Enum):
    SYSTEM_PERFORMANCE = "system_performance"
    USER_ACTIVITY = "user_activity"
    BUSINESS_KPI = "business_kpi"
    THERAPY_OUTCOME = "therapy_outcome"
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    QUALITY = "quality"
    SATISFACTION = "satisfaction"

class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class MonitoringStatus(Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    DISABLED = "disabled"
    MAINTENANCE = "maintenance"

class TrendDirection(Enum):
    UP = "up"
    DOWN = "down"
    STABLE = "stable"
    VOLATILE = "volatile"

class PerformanceMetric(db.Model):
    """Core performance metrics tracking"""
    __tablename__ = 'performance_metrics'
    
    id = Column(Integer, primary_key=True)
    metric_uuid = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Metric configuration
    metric_type = Column(SQLEnum(MetricType), nullable=False)
    unit = Column(String(50))  # %, count, seconds, etc.
    calculation_method = Column(String(100))  # sum, avg, count, etc.
    data_source = Column(String(100))  # table or API endpoint
    query_definition = Column(JSON)  # SQL query or API parameters
    
    # Thresholds and targets
    target_value = Column(Float)
    warning_threshold = Column(Float)
    critical_threshold = Column(Float)
    is_higher_better = Column(Boolean, default=True)
    
    # Display settings
    display_order = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)
    chart_type = Column(String(50), default='line')  # line, bar, gauge, etc.
    color_scheme = Column(String(50))
    
    # Status and timing
    status = Column(SQLEnum(MonitoringStatus), default=MonitoringStatus.ACTIVE)
    collection_frequency = Column(Integer, default=300)  # seconds
    retention_days = Column(Integer, default=90)
    
    # Metadata
    category = Column(String(100))
    tags = Column(JSON)
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    data_points = relationship('MetricDataPoint', back_populates='metric', cascade='all, delete-orphan')
    alerts = relationship('PerformanceAlert', back_populates='metric', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<PerformanceMetric {self.name}>'

class MetricDataPoint(db.Model):
    """Individual metric data points"""
    __tablename__ = 'metric_data_points'
    
    id = Column(Integer, primary_key=True)
    metric_id = Column(Integer, ForeignKey('performance_metrics.id'), nullable=False)
    
    # Data
    value = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Context
    dimensions = Column(JSON)  # Additional dimensions (user_id, department, etc.)
    metric_metadata = Column(JSON)  # Additional context data
    
    # Data quality
    is_estimated = Column(Boolean, default=False)
    confidence_score = Column(Float, default=1.0)
    data_source_id = Column(String(100))
    
    # Relationships
    metric = relationship('PerformanceMetric', back_populates='data_points')
    
    def __repr__(self):
        return f'<MetricDataPoint {self.metric_id}: {self.value}>'

class PerformanceDashboard(db.Model):
    """Performance monitoring dashboards"""
    __tablename__ = 'performance_dashboards'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Dashboard configuration
    layout_config = Column(JSON)  # Dashboard layout and widget positions
    refresh_interval = Column(Integer, default=60)  # seconds
    is_public = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    
    # Access control
    allowed_roles = Column(JSON)  # List of roles that can access
    allowed_users = Column(JSON)  # List of specific user IDs
    
    # Metadata
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    widgets = relationship('DashboardWidget', back_populates='dashboard', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<PerformanceDashboard {self.name}>'

class DashboardWidget(db.Model):
    """Dashboard widgets for displaying metrics"""
    __tablename__ = 'dashboard_widgets'
    
    id = Column(Integer, primary_key=True)
    dashboard_id = Column(Integer, ForeignKey('performance_dashboards.id'), nullable=False)
    metric_id = Column(Integer, ForeignKey('performance_metrics.id'))
    
    # Widget configuration
    widget_type = Column(String(50), nullable=False)  # chart, gauge, counter, table
    title = Column(String(200))
    title_ar = Column(String(200))
    
    # Layout
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    width = Column(Integer, default=4)
    height = Column(Integer, default=3)
    
    # Display settings
    chart_config = Column(JSON)  # Chart.js configuration
    time_range = Column(String(50), default='24h')  # 1h, 24h, 7d, 30d
    aggregation = Column(String(50), default='avg')  # avg, sum, min, max
    
    # Conditional formatting
    color_rules = Column(JSON)  # Rules for color coding based on values
    
    # Status
    is_visible = Column(Boolean, default=True)
    
    # Relationships
    dashboard = relationship('PerformanceDashboard', back_populates='widgets')
    metric = relationship('PerformanceMetric')
    
    def __repr__(self):
        return f'<DashboardWidget {self.title}>'

class PerformanceAlert(db.Model):
    """Performance alerts and notifications"""
    __tablename__ = 'performance_alerts'
    
    id = Column(Integer, primary_key=True)
    metric_id = Column(Integer, ForeignKey('performance_metrics.id'), nullable=False)
    
    # Alert details
    alert_level = Column(SQLEnum(AlertLevel), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # Trigger information
    trigger_value = Column(Float)
    threshold_value = Column(Float)
    trigger_condition = Column(String(50))  # greater_than, less_than, equals
    
    # Status and timing
    is_active = Column(Boolean, default=True)
    triggered_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime)
    resolved_at = Column(DateTime)
    acknowledged_by_id = Column(Integer, ForeignKey('users.id'))
    resolved_by_id = Column(Integer, ForeignKey('users.id'))
    
    # Notification settings
    notification_channels = Column(JSON)  # email, sms, push, slack
    notified_users = Column(JSON)  # List of user IDs to notify
    
    # Metadata
    context_data = Column(JSON)  # Additional context about the alert
    
    # Relationships
    metric = relationship('PerformanceMetric', back_populates='alerts')
    
    def __repr__(self):
        return f'<PerformanceAlert {self.title}>'

class SystemHealthCheck(db.Model):
    """System health monitoring"""
    __tablename__ = 'system_health_checks'
    
    id = Column(Integer, primary_key=True)
    check_name = Column(String(100), nullable=False)
    check_type = Column(String(50), nullable=False)  # database, api, service, disk, memory
    
    # Check configuration
    endpoint_url = Column(String(500))
    expected_response = Column(Text)
    timeout_seconds = Column(Integer, default=30)
    check_frequency = Column(Integer, default=300)  # seconds
    
    # Status
    is_healthy = Column(Boolean, default=True)
    last_check_at = Column(DateTime)
    last_success_at = Column(DateTime)
    consecutive_failures = Column(Integer, default=0)
    
    # Performance metrics
    response_time_ms = Column(Float)
    availability_percentage = Column(Float, default=100.0)
    
    # Thresholds
    warning_threshold_ms = Column(Float, default=1000)
    critical_threshold_ms = Column(Float, default=5000)
    max_failures = Column(Integer, default=3)
    
    # Metadata
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<SystemHealthCheck {self.check_name}>'

class UserActivityLog(db.Model):
    """User activity tracking for performance analysis"""
    __tablename__ = 'user_activity_logs'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    session_id = Column(String(255))
    
    # Activity details
    action = Column(String(100), nullable=False)
    resource = Column(String(200))
    resource_id = Column(String(100))
    
    # Performance data
    response_time_ms = Column(Float)
    page_load_time_ms = Column(Float)
    
    # Context
    ip_address = Column(String(45))
    user_agent = Column(Text)
    referrer = Column(String(500))
    
    # Timing
    timestamp = Column(DateTime, default=datetime.utcnow)
    duration_seconds = Column(Float)
    
    # Metadata
    activity_metadata = Column(JSON)
    
    def __repr__(self):
        return f'<UserActivityLog {self.action} by {self.user_id}>'

class PerformanceReport(db.Model):
    """Generated performance reports"""
    __tablename__ = 'performance_reports'
    
    id = Column(Integer, primary_key=True)
    report_uuid = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    
    # Report configuration
    report_type = Column(String(50), nullable=False)  # daily, weekly, monthly, custom
    metrics_included = Column(JSON)  # List of metric IDs
    date_range_start = Column(Date, nullable=False)
    date_range_end = Column(Date, nullable=False)
    
    # Report content
    summary = Column(Text)
    key_insights = Column(JSON)
    recommendations = Column(JSON)
    charts_config = Column(JSON)
    
    # Status
    generation_status = Column(String(50), default='pending')  # pending, generating, completed, failed
    file_path = Column(String(500))
    file_size = Column(Integer)
    
    # Scheduling
    is_scheduled = Column(Boolean, default=False)
    schedule_frequency = Column(String(50))  # daily, weekly, monthly
    next_generation = Column(DateTime)
    
    # Recipients
    email_recipients = Column(JSON)
    auto_send = Column(Boolean, default=False)
    
    # Metadata
    generated_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<PerformanceReport {self.name}>'

class MetricTrend(db.Model):
    """Calculated metric trends and forecasts"""
    __tablename__ = 'metric_trends'
    
    id = Column(Integer, primary_key=True)
    metric_id = Column(Integer, ForeignKey('performance_metrics.id'), nullable=False)
    
    # Trend analysis
    trend_direction = Column(SQLEnum(TrendDirection), nullable=False)
    trend_strength = Column(Float)  # 0-1 scale
    trend_start_date = Column(Date, nullable=False)
    trend_end_date = Column(Date, nullable=False)
    
    # Statistical data
    slope = Column(Float)
    r_squared = Column(Float)
    mean_value = Column(Float)
    std_deviation = Column(Float)
    
    # Forecast
    forecast_7d = Column(Float)
    forecast_30d = Column(Float)
    forecast_confidence = Column(Float)
    
    # Anomaly detection
    anomaly_score = Column(Float, default=0.0)
    is_anomalous = Column(Boolean, default=False)
    
    # Metadata
    calculated_at = Column(DateTime, default=datetime.utcnow)
    calculation_method = Column(String(100))
    
    def __repr__(self):
        return f'<MetricTrend {self.metric_id}: {self.trend_direction.value}>'

class PerformanceBenchmark(db.Model):
    """Performance benchmarks and targets"""
    __tablename__ = 'performance_benchmarks'
    
    id = Column(Integer, primary_key=True)
    metric_id = Column(Integer, ForeignKey('performance_metrics.id'), nullable=False)
    
    # Benchmark details
    benchmark_name = Column(String(200), nullable=False)
    benchmark_type = Column(String(50), nullable=False)  # internal, industry, best_practice
    
    # Values
    target_value = Column(Float, nullable=False)
    excellent_value = Column(Float)
    good_value = Column(Float)
    poor_value = Column(Float)
    
    # Context
    time_period = Column(String(50))  # daily, weekly, monthly, yearly
    department = Column(String(100))
    service_type = Column(String(100))
    
    # Validity
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date)
    is_active = Column(Boolean, default=True)
    
    # Metadata
    description = Column(Text)
    source = Column(String(200))
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<PerformanceBenchmark {self.benchmark_name}>'
