# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات للوحة التحكم التفاعلية المتقدمة
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from database import db
from datetime import datetime
import json

class DashboardWidget(db.Model):
    """ودجات لوحة التحكم القابلة للتخصيص"""
    __tablename__ = 'dashboard_widgets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    widget_type = db.Column(db.String(50), nullable=False)  # chart, stat, table, calendar, map
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    position_x = db.Column(db.Integer, default=0)
    position_y = db.Column(db.Integer, default=0)
    width = db.Column(db.Integer, default=4)  # Grid columns (1-12)
    height = db.Column(db.Integer, default=3)  # Grid rows
    config = db.Column(db.Text)  # JSON configuration
    data_source = db.Column(db.String(100))  # API endpoint or query
    refresh_interval = db.Column(db.Integer, default=300)  # seconds
    is_visible = db.Column(db.Boolean, default=True)
    is_locked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User', backref='dashboard_widgets')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'widget_type': self.widget_type,
            'title': self.title,
            'description': self.description,
            'position_x': self.position_x,
            'position_y': self.position_y,
            'width': self.width,
            'height': self.height,
            'config': json.loads(self.config) if self.config else {},
            'data_source': self.data_source,
            'refresh_interval': self.refresh_interval,
            'is_visible': self.is_visible,
            'is_locked': self.is_locked,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class DashboardLayout(db.Model):
    """تخطيطات لوحة التحكم المحفوظة"""
    __tablename__ = 'dashboard_layouts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    layout_data = db.Column(db.Text, nullable=False)  # JSON layout configuration
    is_default = db.Column(db.Boolean, default=False)
    is_public = db.Column(db.Boolean, default=False)
    theme = db.Column(db.String(50), default='light')  # light, dark, auto
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User', backref='dashboard_layouts')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'layout_data': json.loads(self.layout_data) if self.layout_data else {},
            'is_default': self.is_default,
            'is_public': self.is_public,
            'theme': self.theme,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class DashboardAlert(db.Model):
    """تنبيهات لوحة التحكم الذكية"""
    __tablename__ = 'dashboard_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    alert_type = db.Column(db.String(50), nullable=False)  # warning, error, info, success
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    category = db.Column(db.String(50))  # system, student, appointment, finance
    source_type = db.Column(db.String(50))  # manual, automated, ai_generated
    source_id = db.Column(db.String(100))  # Reference to source record
    action_required = db.Column(db.Boolean, default=False)
    action_url = db.Column(db.String(200))
    action_text = db.Column(db.String(100))
    is_read = db.Column(db.Boolean, default=False)
    is_dismissed = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime)
    extra_metadata = db.Column(db.Text)  # JSON additional data
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime)
    dismissed_at = db.Column(db.DateTime)
    
    # العلاقات
    user = db.relationship('User', backref='dashboard_alerts')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'alert_type': self.alert_type,
            'title': self.title,
            'message': self.message,
            'severity': self.severity,
            'category': self.category,
            'source_type': self.source_type,
            'source_id': self.source_id,
            'action_required': self.action_required,
            'action_url': self.action_url,
            'action_text': self.action_text,
            'is_read': self.is_read,
            'is_dismissed': self.is_dismissed,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'metadata': json.loads(self.metadata) if self.metadata else {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'dismissed_at': self.dismissed_at.isoformat() if self.dismissed_at else None
        }

class DashboardFilter(db.Model):
    """فلاتر لوحة التحكم المحفوظة"""
    __tablename__ = 'dashboard_filters'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    filter_type = db.Column(db.String(50), nullable=False)  # date_range, category, status, custom
    filter_config = db.Column(db.Text, nullable=False)  # JSON filter configuration
    applies_to = db.Column(db.Text)  # JSON array of widget types/IDs
    is_active = db.Column(db.Boolean, default=True)
    is_global = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User', backref='dashboard_filters')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'filter_type': self.filter_type,
            'filter_config': json.loads(self.filter_config) if self.filter_config else {},
            'applies_to': json.loads(self.applies_to) if self.applies_to else [],
            'is_active': self.is_active,
            'is_global': self.is_global,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class DashboardMetric(db.Model):
    """مقاييس لوحة التحكم المحسوبة"""
    __tablename__ = 'dashboard_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    metric_name = db.Column(db.String(100), nullable=False, index=True)
    metric_category = db.Column(db.String(50), nullable=False, index=True)
    metric_value = db.Column(db.Float, nullable=False)
    metric_unit = db.Column(db.String(20))  # count, percentage, currency, time
    previous_value = db.Column(db.Float)
    change_percentage = db.Column(db.Float)
    trend_direction = db.Column(db.String(10))  # up, down, stable
    calculation_method = db.Column(db.String(100))  # sum, avg, count, custom
    data_source = db.Column(db.String(100))
    filters_applied = db.Column(db.Text)  # JSON filters used in calculation
    calculation_date = db.Column(db.DateTime, nullable=False, index=True)
    is_real_time = db.Column(db.Boolean, default=False)
    extra_metadata = db.Column(db.Text)  # JSON additional calculation info
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('metric_name', 'metric_category', 'calculation_date', name='unique_daily_metric'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'metric_name': self.metric_name,
            'metric_category': self.metric_category,
            'metric_value': self.metric_value,
            'metric_unit': self.metric_unit,
            'previous_value': self.previous_value,
            'change_percentage': self.change_percentage,
            'trend_direction': self.trend_direction,
            'calculation_method': self.calculation_method,
            'data_source': self.data_source,
            'filters_applied': json.loads(self.filters_applied) if self.filters_applied else {},
            'calculation_date': self.calculation_date.isoformat() if self.calculation_date else None,
            'is_real_time': self.is_real_time,
            'metadata': json.loads(self.metadata) if self.metadata else {},
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class DashboardExport(db.Model):
    """تصديرات لوحة التحكم"""
    __tablename__ = 'dashboard_exports'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    export_type = db.Column(db.String(50), nullable=False)  # pdf, excel, csv, image
    export_name = db.Column(db.String(200), nullable=False)
    export_config = db.Column(db.Text)  # JSON export configuration
    file_path = db.Column(db.String(500))
    file_size = db.Column(db.Integer)  # bytes
    status = db.Column(db.String(20), default='pending')  # pending, processing, completed, failed
    error_message = db.Column(db.Text)
    download_count = db.Column(db.Integer, default=0)
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    # العلاقات
    user = db.relationship('User', backref='dashboard_exports')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'export_type': self.export_type,
            'export_name': self.export_name,
            'export_config': json.loads(self.export_config) if self.export_config else {},
            'file_path': self.file_path,
            'file_size': self.file_size,
            'status': self.status,
            'error_message': self.error_message,
            'download_count': self.download_count,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class DashboardTheme(db.Model):
    """سمات لوحة التحكم المخصصة"""
    __tablename__ = 'dashboard_themes'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    display_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    theme_config = db.Column(db.Text, nullable=False)  # JSON theme configuration
    preview_image = db.Column(db.String(200))
    is_default = db.Column(db.Boolean, default=False)
    is_public = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    usage_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    creator = db.relationship('User', backref='created_themes')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'display_name': self.display_name,
            'description': self.description,
            'theme_config': json.loads(self.theme_config) if self.theme_config else {},
            'preview_image': self.preview_image,
            'is_default': self.is_default,
            'is_public': self.is_public,
            'created_by': self.created_by,
            'usage_count': self.usage_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class DashboardNotification(db.Model):
    """إشعارات لوحة التحكم الفورية"""
    __tablename__ = 'dashboard_notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    notification_type = db.Column(db.String(50), nullable=False)  # toast, modal, badge, sound
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    icon = db.Column(db.String(50))  # FontAwesome icon class
    color = db.Column(db.String(20), default='primary')  # Bootstrap color
    duration = db.Column(db.Integer, default=5000)  # milliseconds
    position = db.Column(db.String(20), default='top-right')  # toast position
    is_persistent = db.Column(db.Boolean, default=False)
    action_url = db.Column(db.String(200))
    action_text = db.Column(db.String(100))
    is_delivered = db.Column(db.Boolean, default=False)
    is_read = db.Column(db.Boolean, default=False)
    delivered_at = db.Column(db.DateTime)
    read_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = db.relationship('User', backref='dashboard_notifications')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'notification_type': self.notification_type,
            'title': self.title,
            'message': self.message,
            'icon': self.icon,
            'color': self.color,
            'duration': self.duration,
            'position': self.position,
            'is_persistent': self.is_persistent,
            'action_url': self.action_url,
            'action_text': self.action_text,
            'is_delivered': self.is_delivered,
            'is_read': self.is_read,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
