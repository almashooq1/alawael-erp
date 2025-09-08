# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية للوحة التحكم التفاعلية المتقدمة
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from database import db
from advanced_dashboard_models import (
    DashboardWidget, DashboardLayout, DashboardAlert, DashboardFilter,
    DashboardMetric, DashboardExport, DashboardTheme, DashboardNotification
)
from datetime import datetime, timedelta
import json

def add_advanced_dashboard_sample_data():
    """إضافة بيانات تجريبية شاملة للوحة التحكم المتقدمة"""
    
    try:
        print("بدء إضافة البيانات التجريبية للوحة التحكم المتقدمة...")
        
        # 1. إضافة سمات لوحة التحكم
        themes = [
            {
                'name': 'light',
                'display_name': 'السمة الفاتحة',
                'description': 'سمة فاتحة ومريحة للعين',
                'theme_config': {
                    'primary_color': '#4CAF50',
                    'secondary_color': '#2196F3',
                    'background_color': '#ffffff',
                    'text_color': '#333333',
                    'card_background': '#ffffff',
                    'border_color': '#e0e0e0'
                },
                'is_default': True,
                'is_public': True
            },
            {
                'name': 'dark',
                'display_name': 'السمة الداكنة',
                'description': 'سمة داكنة مريحة للعمل الليلي',
                'theme_config': {
                    'primary_color': '#4CAF50',
                    'secondary_color': '#2196F3',
                    'background_color': '#121212',
                    'text_color': '#ffffff',
                    'card_background': '#1e1e1e',
                    'border_color': '#333333'
                },
                'is_default': False,
                'is_public': True
            },
            {
                'name': 'blue',
                'display_name': 'السمة الزرقاء',
                'description': 'سمة زرقاء احترافية',
                'theme_config': {
                    'primary_color': '#2196F3',
                    'secondary_color': '#1976D2',
                    'background_color': '#f5f7fa',
                    'text_color': '#333333',
                    'card_background': '#ffffff',
                    'border_color': '#e3f2fd'
                },
                'is_default': False,
                'is_public': True
            }
        ]
        
        for theme_data in themes:
            theme = DashboardTheme(
                name=theme_data['name'],
                display_name=theme_data['display_name'],
                description=theme_data['description'],
                theme_config=json.dumps(theme_data['theme_config']),
                is_default=theme_data['is_default'],
                is_public=theme_data['is_public'],
                usage_count=0
            )
            db.session.add(theme)
        
        print("تم إضافة سمات لوحة التحكم")
        
        # 2. إضافة تخطيطات تجريبية (للمستخدم الأول)
        layouts = [
            {
                'user_id': 1,
                'name': 'التخطيط الافتراضي',
                'description': 'التخطيط الافتراضي للوحة التحكم',
                'layout_data': {
                    'grid_config': {
                        'columns': 12,
                        'rows': 'auto',
                        'cell_height': 80,
                        'margin': 20
                    },
                    'widgets_positions': []
                },
                'is_default': True,
                'is_public': False,
                'theme': 'light'
            },
            {
                'user_id': 1,
                'name': 'تخطيط المدير',
                'description': 'تخطيط مخصص للمديرين مع التركيز على الإحصائيات',
                'layout_data': {
                    'grid_config': {
                        'columns': 12,
                        'rows': 'auto',
                        'cell_height': 80,
                        'margin': 20
                    },
                    'widgets_positions': []
                },
                'is_default': False,
                'is_public': True,
                'theme': 'blue'
            }
        ]
        
        for layout_data in layouts:
            layout = DashboardLayout(
                user_id=layout_data['user_id'],
                name=layout_data['name'],
                description=layout_data['description'],
                layout_data=json.dumps(layout_data['layout_data']),
                is_default=layout_data['is_default'],
                is_public=layout_data['is_public'],
                theme=layout_data['theme']
            )
            db.session.add(layout)
        
        print("تم إضافة تخطيطات لوحة التحكم")
        
        # 3. إضافة ودجات تجريبية
        widgets = [
            {
                'user_id': 1,
                'widget_type': 'students_stats',
                'title': 'إحصائيات الطلاب',
                'description': 'عرض إحصائيات شاملة للطلاب',
                'position_x': 0,
                'position_y': 0,
                'width': 4,
                'height': 3,
                'config': {
                    'show_charts': True,
                    'show_trends': True,
                    'refresh_rate': 300
                },
                'data_source': 'students_api',
                'refresh_interval': 300
            },
            {
                'user_id': 1,
                'widget_type': 'appointments_chart',
                'title': 'مخطط المواعيد',
                'description': 'عرض المواعيد في شكل مخطط بياني',
                'position_x': 4,
                'position_y': 0,
                'width': 4,
                'height': 3,
                'config': {
                    'chart_type': 'line',
                    'time_range': '30_days',
                    'show_status': True
                },
                'data_source': 'appointments_api',
                'refresh_interval': 600
            },
            {
                'user_id': 1,
                'widget_type': 'revenue_chart',
                'title': 'مخطط الإيرادات',
                'description': 'عرض الإيرادات الشهرية',
                'position_x': 8,
                'position_y': 0,
                'width': 4,
                'height': 3,
                'config': {
                    'chart_type': 'bar',
                    'currency': 'SAR',
                    'show_growth': True
                },
                'data_source': 'revenue_api',
                'refresh_interval': 1800
            },
            {
                'user_id': 1,
                'widget_type': 'recent_activities',
                'title': 'الأنشطة الأخيرة',
                'description': 'عرض آخر الأنشطة في النظام',
                'position_x': 0,
                'position_y': 3,
                'width': 6,
                'height': 4,
                'config': {
                    'max_items': 10,
                    'show_icons': True,
                    'group_by_type': False
                },
                'data_source': 'activities_api',
                'refresh_interval': 120
            },
            {
                'user_id': 1,
                'widget_type': 'performance_metrics',
                'title': 'مقاييس الأداء',
                'description': 'عرض مؤشرات الأداء الرئيسية',
                'position_x': 6,
                'position_y': 3,
                'width': 3,
                'height': 4,
                'config': {
                    'show_trends': True,
                    'show_targets': True,
                    'color_coding': True
                },
                'data_source': 'metrics_api',
                'refresh_interval': 900
            },
            {
                'user_id': 1,
                'widget_type': 'alerts_summary',
                'title': 'ملخص التنبيهات',
                'description': 'عرض التنبيهات الهامة',
                'position_x': 9,
                'position_y': 3,
                'width': 3,
                'height': 4,
                'config': {
                    'max_alerts': 5,
                    'show_severity': True,
                    'auto_refresh': True
                },
                'data_source': 'alerts_api',
                'refresh_interval': 60
            }
        ]
        
        for widget_data in widgets:
            widget = DashboardWidget(
                user_id=widget_data['user_id'],
                widget_type=widget_data['widget_type'],
                title=widget_data['title'],
                description=widget_data['description'],
                position_x=widget_data['position_x'],
                position_y=widget_data['position_y'],
                width=widget_data['width'],
                height=widget_data['height'],
                config=json.dumps(widget_data['config']),
                data_source=widget_data['data_source'],
                refresh_interval=widget_data['refresh_interval']
            )
            db.session.add(widget)
        
        print("تم إضافة الودجات التجريبية")
        
        # 4. إضافة تنبيهات تجريبية
        alerts = [
            {
                'user_id': 1,
                'alert_type': 'warning',
                'title': 'موعد قادم',
                'message': 'لديك موعد مع الطالب أحمد محمد خلال 30 دقيقة',
                'severity': 'medium',
                'category': 'appointment',
                'source_type': 'automated',
                'action_required': True,
                'action_url': '/appointments/123',
                'action_text': 'عرض الموعد',
                'expires_at': datetime.utcnow() + timedelta(hours=2)
            },
            {
                'user_id': 1,
                'alert_type': 'info',
                'title': 'تقرير جديد',
                'message': 'تم إنشاء تقرير التقدم الشهري للطالب سارة أحمد',
                'severity': 'low',
                'category': 'report',
                'source_type': 'automated',
                'action_required': False,
                'expires_at': datetime.utcnow() + timedelta(days=7)
            },
            {
                'user_id': 1,
                'alert_type': 'error',
                'title': 'خطأ في النظام',
                'message': 'فشل في تحديث بيانات الطالب محمد علي',
                'severity': 'high',
                'category': 'system',
                'source_type': 'automated',
                'action_required': True,
                'action_url': '/students/456',
                'action_text': 'إعادة المحاولة'
            }
        ]
        
        for alert_data in alerts:
            alert = DashboardAlert(
                user_id=alert_data['user_id'],
                alert_type=alert_data['alert_type'],
                title=alert_data['title'],
                message=alert_data['message'],
                severity=alert_data['severity'],
                category=alert_data['category'],
                source_type=alert_data['source_type'],
                action_required=alert_data['action_required'],
                action_url=alert_data.get('action_url'),
                action_text=alert_data.get('action_text'),
                expires_at=alert_data.get('expires_at')
            )
            db.session.add(alert)
        
        print("تم إضافة التنبيهات التجريبية")
        
        # 5. إضافة إشعارات تجريبية
        notifications = [
            {
                'user_id': 1,
                'notification_type': 'toast',
                'title': 'مرحباً بك',
                'message': 'مرحباً بك في لوحة التحكم المتقدمة',
                'icon': 'fas fa-hand-wave',
                'color': 'success',
                'duration': 5000,
                'position': 'top-right'
            },
            {
                'user_id': 1,
                'notification_type': 'badge',
                'title': 'رسالة جديدة',
                'message': 'لديك رسالة جديدة من ولي أمر الطالب فاطمة',
                'icon': 'fas fa-envelope',
                'color': 'info',
                'is_persistent': True,
                'action_url': '/messages/789',
                'action_text': 'قراءة الرسالة'
            }
        ]
        
        for notification_data in notifications:
            notification = DashboardNotification(
                user_id=notification_data['user_id'],
                notification_type=notification_data['notification_type'],
                title=notification_data['title'],
                message=notification_data['message'],
                icon=notification_data['icon'],
                color=notification_data['color'],
                duration=notification_data.get('duration', 5000),
                position=notification_data.get('position', 'top-right'),
                is_persistent=notification_data.get('is_persistent', False),
                action_url=notification_data.get('action_url'),
                action_text=notification_data.get('action_text')
            )
            db.session.add(notification)
        
        print("تم إضافة الإشعارات التجريبية")
        
        # 6. إضافة مقاييس تجريبية
        metrics = []
        base_date = datetime.utcnow() - timedelta(days=30)
        
        for i in range(30):
            date = base_date + timedelta(days=i)
            
            # مقاييس الطلاب
            metrics.append(DashboardMetric(
                metric_name='total_students',
                metric_category='students',
                metric_value=150 + i,
                metric_unit='count',
                previous_value=150 + i - 1 if i > 0 else 149,
                change_percentage=0.67 if i > 0 else 0,
                trend_direction='up',
                calculation_method='count',
                data_source='students_table',
                calculation_date=date,
                is_real_time=False
            ))
            
            # مقاييس المواعيد
            metrics.append(DashboardMetric(
                metric_name='daily_appointments',
                metric_category='appointments',
                metric_value=25 + (i % 7) * 3,
                metric_unit='count',
                calculation_method='count',
                data_source='appointments_table',
                calculation_date=date,
                is_real_time=True
            ))
            
            # مقاييس الإيرادات
            if i % 7 == 0:  # أسبوعياً
                metrics.append(DashboardMetric(
                    metric_name='weekly_revenue',
                    metric_category='finance',
                    metric_value=15000 + (i * 100),
                    metric_unit='currency',
                    calculation_method='sum',
                    data_source='payments_table',
                    calculation_date=date,
                    is_real_time=False
                ))
        
        for metric in metrics:
            db.session.add(metric)
        
        print("تم إضافة المقاييس التجريبية")
        
        # 7. إضافة فلاتر تجريبية
        filters = [
            {
                'user_id': 1,
                'name': 'الشهر الحالي',
                'description': 'فلتر لعرض بيانات الشهر الحالي فقط',
                'filter_type': 'date_range',
                'filter_config': {
                    'start_date': datetime.utcnow().replace(day=1).isoformat(),
                    'end_date': datetime.utcnow().isoformat(),
                    'relative': True
                },
                'applies_to': ['students_stats', 'appointments_chart', 'revenue_chart'],
                'is_global': True
            },
            {
                'user_id': 1,
                'name': 'الطلاب النشطين',
                'description': 'فلتر لعرض الطلاب النشطين فقط',
                'filter_type': 'status',
                'filter_config': {
                    'field': 'is_active',
                    'value': True,
                    'operator': 'equals'
                },
                'applies_to': ['students_stats'],
                'is_global': False
            }
        ]
        
        for filter_data in filters:
            filter_obj = DashboardFilter(
                user_id=filter_data['user_id'],
                name=filter_data['name'],
                description=filter_data['description'],
                filter_type=filter_data['filter_type'],
                filter_config=json.dumps(filter_data['filter_config']),
                applies_to=json.dumps(filter_data['applies_to']),
                is_global=filter_data['is_global']
            )
            db.session.add(filter_obj)
        
        print("تم إضافة الفلاتر التجريبية")
        
        # حفظ جميع التغييرات
        db.session.commit()
        print("تم حفظ جميع البيانات التجريبية للوحة التحكم المتقدمة بنجاح!")
        
        return True
        
    except Exception as e:
        print(f"خطأ في إضافة البيانات التجريبية: {str(e)}")
        db.session.rollback()
        return False

if __name__ == '__main__':
    add_advanced_dashboard_sample_data()
