#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Performance Monitoring Sample Data Script
Adds comprehensive sample data for performance monitoring system
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from performance_monitoring_models import (
    PerformanceMetric, MetricDataPoint, PerformanceDashboard, 
    DashboardWidget, PerformanceAlert, SystemHealthCheck, 
    UserActivityLog, PerformanceReport, MetricTrend, PerformanceBenchmark,
    MetricType, AlertLevel, MonitoringStatus, TrendDirection
)
from datetime import datetime, timedelta, date
import random
import json

def add_performance_monitoring_sample_data():
    """Add comprehensive sample data for performance monitoring system"""
    
    with app.app_context():
        try:
            print("🚀 بدء إضافة البيانات التجريبية لنظام مراقبة الأداء...")
            
            # Clear existing data
            print("🧹 تنظيف البيانات الموجودة...")
            MetricDataPoint.query.delete()
            DashboardWidget.query.delete()
            PerformanceAlert.query.delete()
            MetricTrend.query.delete()
            PerformanceBenchmark.query.delete()
            PerformanceDashboard.query.delete()
            SystemHealthCheck.query.delete()
            UserActivityLog.query.delete()
            PerformanceReport.query.delete()
            PerformanceMetric.query.delete()
            
            # Create performance metrics
            print("📊 إنشاء المقاييس الأساسية...")
            
            metrics_data = [
                {
                    'name': 'System Response Time',
                    'name_ar': 'وقت استجابة النظام',
                    'description': 'Average system response time in milliseconds',
                    'metric_type': MetricType.SYSTEM_PERFORMANCE,
                    'unit': 'ms',
                    'calculation_method': 'avg',
                    'target_value': 500.0,
                    'warning_threshold': 1000.0,
                    'critical_threshold': 2000.0,
                    'is_higher_better': False,
                    'category': 'Performance',
                    'chart_type': 'line'
                },
                {
                    'name': 'Active Users',
                    'name_ar': 'المستخدمون النشطون',
                    'description': 'Number of active users in the system',
                    'metric_type': MetricType.USER_ACTIVITY,
                    'unit': 'users',
                    'calculation_method': 'count',
                    'target_value': 100.0,
                    'warning_threshold': 50.0,
                    'critical_threshold': 20.0,
                    'is_higher_better': True,
                    'category': 'Users',
                    'chart_type': 'line'
                },
                {
                    'name': 'Session Success Rate',
                    'name_ar': 'معدل نجاح الجلسات',
                    'description': 'Percentage of successful therapy sessions',
                    'metric_type': MetricType.THERAPY_OUTCOME,
                    'unit': '%',
                    'calculation_method': 'avg',
                    'target_value': 95.0,
                    'warning_threshold': 85.0,
                    'critical_threshold': 75.0,
                    'is_higher_better': True,
                    'category': 'Therapy',
                    'chart_type': 'gauge'
                },
                {
                    'name': 'Revenue Growth',
                    'name_ar': 'نمو الإيرادات',
                    'description': 'Monthly revenue growth percentage',
                    'metric_type': MetricType.BUSINESS_KPI,
                    'unit': '%',
                    'calculation_method': 'sum',
                    'target_value': 10.0,
                    'warning_threshold': 5.0,
                    'critical_threshold': 0.0,
                    'is_higher_better': True,
                    'category': 'Financial',
                    'chart_type': 'bar'
                },
                {
                    'name': 'Database CPU Usage',
                    'name_ar': 'استخدام معالج قاعدة البيانات',
                    'description': 'Database server CPU utilization percentage',
                    'metric_type': MetricType.SYSTEM_PERFORMANCE,
                    'unit': '%',
                    'calculation_method': 'avg',
                    'target_value': 60.0,
                    'warning_threshold': 80.0,
                    'critical_threshold': 95.0,
                    'is_higher_better': False,
                    'category': 'Infrastructure',
                    'chart_type': 'gauge'
                },
                {
                    'name': 'Patient Satisfaction',
                    'name_ar': 'رضا المرضى',
                    'description': 'Average patient satisfaction score',
                    'metric_type': MetricType.BUSINESS_KPI,
                    'unit': '/5',
                    'calculation_method': 'avg',
                    'target_value': 4.5,
                    'warning_threshold': 4.0,
                    'critical_threshold': 3.5,
                    'is_higher_better': True,
                    'category': 'Quality',
                    'chart_type': 'line'
                }
            ]
            
            metrics = []
            for i, metric_data in enumerate(metrics_data):
                metric = PerformanceMetric(
                    name=metric_data['name'],
                    name_ar=metric_data['name_ar'],
                    description=metric_data['description'],
                    metric_type=metric_data['metric_type'],
                    unit=metric_data['unit'],
                    calculation_method=metric_data['calculation_method'],
                    target_value=metric_data['target_value'],
                    warning_threshold=metric_data['warning_threshold'],
                    critical_threshold=metric_data['critical_threshold'],
                    is_higher_better=metric_data['is_higher_better'],
                    display_order=i,
                    category=metric_data['category'],
                    chart_type=metric_data['chart_type'],
                    created_by_id=1
                )
                db.session.add(metric)
                metrics.append(metric)
            
            db.session.flush()
            
            # Create metric data points (last 7 days)
            print("📈 إنشاء نقاط البيانات...")
            
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=7)
            
            for metric in metrics:
                current_date = start_date
                base_value = metric.target_value or 50.0
                
                while current_date <= end_date:
                    # Generate realistic data with some variation
                    if metric.name == 'System Response Time':
                        value = base_value + random.uniform(-100, 200)
                    elif metric.name == 'Active Users':
                        value = base_value + random.uniform(-20, 30)
                    elif metric.name == 'Session Success Rate':
                        value = min(100, base_value + random.uniform(-5, 5))
                    elif metric.name == 'Revenue Growth':
                        value = base_value + random.uniform(-3, 8)
                    elif metric.name == 'Database CPU Usage':
                        value = min(100, base_value + random.uniform(-10, 25))
                    else:  # Patient Satisfaction
                        value = min(5, max(1, base_value + random.uniform(-0.5, 0.5)))
                    
                    # Add some hourly data points
                    for hour in range(0, 24, 2):
                        timestamp = current_date.replace(hour=hour, minute=0, second=0)
                        hourly_variation = random.uniform(-0.1, 0.1) * value
                        
                        data_point = MetricDataPoint(
                            metric_id=metric.id,
                            value=max(0, value + hourly_variation),
                            timestamp=timestamp,
                            confidence_score=random.uniform(0.8, 1.0)
                        )
                        db.session.add(data_point)
                    
                    current_date += timedelta(days=1)
            
            # Create dashboard
            print("🎛️ إنشاء لوحة التحكم...")
            
            dashboard = PerformanceDashboard(
                name='Main Performance Dashboard',
                name_ar='لوحة التحكم الرئيسية للأداء',
                description='Main dashboard showing key performance metrics',
                refresh_interval=60,
                is_public=True,
                is_default=True,
                created_by_id=1
            )
            db.session.add(dashboard)
            db.session.flush()
            
            # Create dashboard widgets
            print("🔧 إنشاء عناصر لوحة التحكم...")
            
            widget_configs = [
                {'metric_idx': 0, 'type': 'chart', 'title': 'وقت الاستجابة', 'x': 0, 'y': 0, 'w': 6, 'h': 4},
                {'metric_idx': 1, 'type': 'counter', 'title': 'المستخدمون النشطون', 'x': 6, 'y': 0, 'w': 3, 'h': 2},
                {'metric_idx': 2, 'type': 'gauge', 'title': 'معدل نجاح الجلسات', 'x': 9, 'y': 0, 'w': 3, 'h': 2},
                {'metric_idx': 3, 'type': 'chart', 'title': 'نمو الإيرادات', 'x': 0, 'y': 4, 'w': 6, 'h': 3},
                {'metric_idx': 4, 'type': 'gauge', 'title': 'استخدام المعالج', 'x': 6, 'y': 2, 'w': 3, 'h': 2},
                {'metric_idx': 5, 'type': 'chart', 'title': 'رضا المرضى', 'x': 9, 'y': 2, 'w': 3, 'h': 3}
            ]
            
            for config in widget_configs:
                widget = DashboardWidget(
                    dashboard_id=dashboard.id,
                    metric_id=metrics[config['metric_idx']].id,
                    widget_type=config['type'],
                    title=config['title'],
                    title_ar=config['title'],
                    position_x=config['x'],
                    position_y=config['y'],
                    width=config['w'],
                    height=config['h'],
                    time_range='24h',
                    aggregation='avg'
                )
                db.session.add(widget)
            
            # Create alerts
            print("🚨 إنشاء التنبيهات...")
            
            alerts_data = [
                {
                    'metric_idx': 0,
                    'level': AlertLevel.WARNING,
                    'title': 'تحذير: وقت استجابة مرتفع',
                    'message': 'وقت استجابة النظام تجاوز الحد المسموح',
                    'trigger_value': 1200.0,
                    'is_active': True
                },
                {
                    'metric_idx': 4,
                    'level': AlertLevel.CRITICAL,
                    'title': 'حرج: استخدام معالج عالي',
                    'message': 'استخدام معالج قاعدة البيانات وصل لمستوى حرج',
                    'trigger_value': 96.0,
                    'is_active': True
                },
                {
                    'metric_idx': 1,
                    'level': AlertLevel.WARNING,
                    'title': 'تحذير: انخفاض المستخدمين النشطين',
                    'message': 'عدد المستخدمين النشطين أقل من المتوقع',
                    'trigger_value': 45.0,
                    'is_active': False
                }
            ]
            
            for alert_data in alerts_data:
                alert = PerformanceAlert(
                    metric_id=metrics[alert_data['metric_idx']].id,
                    alert_level=alert_data['level'],
                    title=alert_data['title'],
                    message=alert_data['message'],
                    trigger_value=alert_data['trigger_value'],
                    threshold_value=metrics[alert_data['metric_idx']].warning_threshold,
                    trigger_condition='greater_than' if not metrics[alert_data['metric_idx']].is_higher_better else 'less_than',
                    is_active=alert_data['is_active'],
                    triggered_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48))
                )
                db.session.add(alert)
            
            # Create system health checks
            print("💓 إنشاء فحوصات صحة النظام...")
            
            health_checks_data = [
                {
                    'name': 'Database Connection',
                    'type': 'database',
                    'healthy': True,
                    'response_time': 45.2,
                    'availability': 99.8
                },
                {
                    'name': 'Web Server',
                    'type': 'service',
                    'healthy': True,
                    'response_time': 120.5,
                    'availability': 99.9
                },
                {
                    'name': 'File Storage',
                    'type': 'disk',
                    'healthy': True,
                    'response_time': 25.1,
                    'availability': 100.0
                },
                {
                    'name': 'Email Service',
                    'type': 'api',
                    'healthy': False,
                    'response_time': 2500.0,
                    'availability': 95.2
                },
                {
                    'name': 'Backup System',
                    'type': 'service',
                    'healthy': True,
                    'response_time': 180.3,
                    'availability': 98.5
                }
            ]
            
            for check_data in health_checks_data:
                health_check = SystemHealthCheck(
                    check_name=check_data['name'],
                    check_type=check_data['type'],
                    is_healthy=check_data['healthy'],
                    last_check_at=datetime.utcnow() - timedelta(minutes=random.randint(1, 30)),
                    last_success_at=datetime.utcnow() - timedelta(minutes=random.randint(1, 60)),
                    response_time_ms=check_data['response_time'],
                    availability_percentage=check_data['availability'],
                    consecutive_failures=0 if check_data['healthy'] else random.randint(1, 3),
                    warning_threshold_ms=1000.0,
                    critical_threshold_ms=5000.0
                )
                db.session.add(health_check)
            
            # Create user activity logs
            print("👥 إنشاء سجلات نشاط المستخدمين...")
            
            activities = ['login', 'logout', 'view_dashboard', 'create_session', 'update_patient', 'generate_report']
            
            for _ in range(100):
                activity = UserActivityLog(
                    user_id=random.randint(1, 5),
                    session_id=f"session_{random.randint(1000, 9999)}",
                    action=random.choice(activities),
                    resource=random.choice(['dashboard', 'patients', 'sessions', 'reports']),
                    response_time_ms=random.uniform(100, 2000),
                    timestamp=datetime.utcnow() - timedelta(hours=random.randint(1, 168)),
                    ip_address=f"192.168.1.{random.randint(1, 254)}"
                )
                db.session.add(activity)
            
            # Create performance benchmarks
            print("🎯 إنشاء المعايير المرجعية...")
            
            for metric in metrics:
                benchmark = PerformanceBenchmark(
                    metric_id=metric.id,
                    benchmark_name=f"Industry Standard - {metric.name}",
                    benchmark_type='industry',
                    target_value=metric.target_value,
                    excellent_value=metric.target_value * 1.2 if metric.is_higher_better else metric.target_value * 0.8,
                    good_value=metric.target_value * 1.1 if metric.is_higher_better else metric.target_value * 0.9,
                    poor_value=metric.target_value * 0.8 if metric.is_higher_better else metric.target_value * 1.2,
                    time_period='monthly',
                    valid_from=date.today() - timedelta(days=365),
                    created_by_id=1
                )
                db.session.add(benchmark)
            
            # Create metric trends
            print("📊 إنشاء اتجاهات المقاييس...")
            
            trend_directions = [TrendDirection.UP, TrendDirection.DOWN, TrendDirection.STABLE]
            
            for metric in metrics:
                trend = MetricTrend(
                    metric_id=metric.id,
                    trend_direction=random.choice(trend_directions),
                    trend_strength=random.uniform(0.1, 0.9),
                    trend_start_date=date.today() - timedelta(days=30),
                    trend_end_date=date.today(),
                    slope=random.uniform(-1.0, 1.0),
                    r_squared=random.uniform(0.5, 0.95),
                    mean_value=metric.target_value or 50.0,
                    std_deviation=random.uniform(5.0, 20.0),
                    forecast_7d=metric.target_value + random.uniform(-10, 10) if metric.target_value else 50.0,
                    forecast_30d=metric.target_value + random.uniform(-20, 20) if metric.target_value else 50.0,
                    forecast_confidence=random.uniform(0.6, 0.9),
                    anomaly_score=random.uniform(0.0, 0.3),
                    calculation_method='linear_regression'
                )
                db.session.add(trend)
            
            # Create performance reports
            print("📋 إنشاء التقارير...")
            
            report = PerformanceReport(
                name='Weekly Performance Report',
                name_ar='تقرير الأداء الأسبوعي',
                report_type='weekly',
                metrics_included=[m.id for m in metrics[:3]],
                date_range_start=date.today() - timedelta(days=7),
                date_range_end=date.today(),
                summary='Overall system performance is within acceptable ranges with some areas for improvement.',
                key_insights=[
                    'System response time improved by 15% this week',
                    'User activity increased during peak hours',
                    'Session success rate maintained above target'
                ],
                recommendations=[
                    'Consider scaling database resources during peak hours',
                    'Implement caching for frequently accessed data',
                    'Monitor user satisfaction metrics more closely'
                ],
                generation_status='completed',
                generated_by_id=1
            )
            db.session.add(report)
            
            # Commit all changes
            db.session.commit()
            
            print("✅ تم إنشاء البيانات التجريبية بنجاح!")
            print(f"📊 تم إنشاء {len(metrics)} مقياس أداء")
            print(f"📈 تم إنشاء {MetricDataPoint.query.count()} نقطة بيانات")
            print(f"🎛️ تم إنشاء {DashboardWidget.query.count()} عنصر لوحة تحكم")
            print(f"🚨 تم إنشاء {PerformanceAlert.query.count()} تنبيه")
            print(f"💓 تم إنشاء {SystemHealthCheck.query.count()} فحص صحة نظام")
            print(f"👥 تم إنشاء {UserActivityLog.query.count()} سجل نشاط مستخدم")
            print(f"🎯 تم إنشاء {PerformanceBenchmark.query.count()} معيار مرجعي")
            print(f"📊 تم إنشاء {MetricTrend.query.count()} اتجاه مقياس")
            print(f"📋 تم إنشاء {PerformanceReport.query.count()} تقرير")
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    add_performance_monitoring_sample_data()
