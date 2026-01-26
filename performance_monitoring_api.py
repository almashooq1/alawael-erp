from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit
)
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Performance Monitoring System API
Real-time performance monitoring and analytics endpoints for Al-Awael Centers
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, desc, asc, and_, or_, text
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta, date
import json
import uuid
from collections import defaultdict
import statistics

from performance_monitoring_models import (
    db, PerformanceMetric, MetricDataPoint, PerformanceDashboard, 
    DashboardWidget, PerformanceAlert, SystemHealthCheck, 
    UserActivityLog, PerformanceReport, MetricTrend, PerformanceBenchmark,
    MetricType, AlertLevel, MonitoringStatus, TrendDirection
)

performance_monitoring_bp = Blueprint('performance_monitoring', __name__, url_prefix='/api/performance')

# Utility functions
def calculate_metric_statistics(data_points):
    """Calculate statistics for metric data points"""
    if not data_points:
        return {}
    
    values = [dp.value for dp in data_points]
    return {
        'count': len(values),
        'min': min(values),
        'max': max(values),
        'avg': statistics.mean(values),
        'median': statistics.median(values),
        'std_dev': statistics.stdev(values) if len(values) > 1 else 0
    }

def detect_trend(data_points, days=7):
    """Simple trend detection for metric data points"""
    if len(data_points) < 2:
        return TrendDirection.STABLE, 0.0
    
    # Sort by timestamp
    sorted_points = sorted(data_points, key=lambda x: x.timestamp)
    values = [dp.value for dp in sorted_points]
    
    # Simple linear regression slope
    n = len(values)
    x_values = list(range(n))
    
    x_mean = statistics.mean(x_values)
    y_mean = statistics.mean(values)
    
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, values))
    denominator = sum((x - x_mean) ** 2 for x in x_values)
    
    if denominator == 0:
        return TrendDirection.STABLE, 0.0
    
    slope = numerator / denominator
    
    # Determine trend direction
    if abs(slope) < 0.1:
        direction = TrendDirection.STABLE
    elif slope > 0:
        direction = TrendDirection.UP
    else:
        direction = TrendDirection.DOWN
    
    return direction, abs(slope)

# Performance Metrics Endpoints

@performance_monitoring_bp.route('/metrics', methods=['GET'])
@jwt_required()
@check_permission('view_performance_monitoring')
@log_audit('GET_METRICS')
def get_metrics():
    """Get all performance metrics with filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Filters
        metric_type = request.args.get('type')
        status = request.args.get('status')
        category = request.args.get('category')
        search = request.args.get('search', '').strip()
        
        query = PerformanceMetric.query
        
        # Apply filters
        if metric_type:
            query = query.filter(PerformanceMetric.metric_type == MetricType(metric_type))
        if status:
            query = query.filter(PerformanceMetric.status == MonitoringStatus(status))
        if category:
            query = query.filter(PerformanceMetric.category == category)
        if search:
            query = query.filter(
                or_(
                    PerformanceMetric.name.ilike(f'%{search}%'),
                    PerformanceMetric.name_ar.ilike(f'%{search}%'),
                    PerformanceMetric.description.ilike(f'%{search}%')
                )
            )
        
        # Order by display_order, then name
        query = query.order_by(PerformanceMetric.display_order, PerformanceMetric.name)
        
        metrics = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Get recent data points for each metric
        metrics_data = []
        for metric in metrics.items:
            # Get latest data point
            latest_point = MetricDataPoint.query.filter_by(metric_id=metric.id)\
                .order_by(desc(MetricDataPoint.timestamp)).first()
            
            # Get data points from last 24 hours for trend
            yesterday = datetime.utcnow() - timedelta(days=1)
            recent_points = MetricDataPoint.query.filter(
                and_(
                    MetricDataPoint.metric_id == metric.id,
                    MetricDataPoint.timestamp >= yesterday
                )
            ).all()
            
            trend_direction, trend_strength = detect_trend(recent_points)
            
            metrics_data.append({
                'id': metric.id,
                'metric_uuid': metric.metric_uuid,
                'name': metric.name,
                'name_ar': metric.name_ar,
                'description': metric.description,
                'metric_type': metric.metric_type.value,
                'unit': metric.unit,
                'target_value': metric.target_value,
                'warning_threshold': metric.warning_threshold,
                'critical_threshold': metric.critical_threshold,
                'is_higher_better': metric.is_higher_better,
                'status': metric.status.value,
                'category': metric.category,
                'latest_value': latest_point.value if latest_point else None,
                'latest_timestamp': latest_point.timestamp.isoformat() if latest_point else None,
                'trend_direction': trend_direction.value,
                'trend_strength': trend_strength,
                'data_points_count': len(recent_points),
                'created_at': metric.created_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'metrics': metrics_data,
            'pagination': {
                'page': metrics.page,
                'pages': metrics.pages,
                'per_page': metrics.per_page,
                'total': metrics.total
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting metrics: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب المقاييس'}), 500

@performance_monitoring_bp.route('/metrics', methods=['POST'])
@jwt_required()
@check_permission('manage_performance_monitoring')
@guard_payload_size()
@log_audit('CREATE_METRIC')
def create_metric():
    """Create a new performance metric"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        # Validate required fields
        required_fields = ['name', 'name_ar', 'metric_type', 'calculation_method']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'حقل {field} مطلوب'}), 400
        
        metric = PerformanceMetric(
            name=data['name'],
            name_ar=data['name_ar'],
            description=data.get('description'),
            metric_type=MetricType(data['metric_type']),
            unit=data.get('unit'),
            calculation_method=data['calculation_method'],
            data_source=data.get('data_source'),
            query_definition=data.get('query_definition'),
            target_value=data.get('target_value'),
            warning_threshold=data.get('warning_threshold'),
            critical_threshold=data.get('critical_threshold'),
            is_higher_better=data.get('is_higher_better', True),
            display_order=data.get('display_order', 0),
            chart_type=data.get('chart_type', 'line'),
            color_scheme=data.get('color_scheme'),
            collection_frequency=data.get('collection_frequency', 300),
            retention_days=data.get('retention_days', 90),
            category=data.get('category'),
            tags=data.get('tags'),
            created_by_id=user_id
        )
        
        db.session.add(metric)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء المقياس بنجاح',
            'metric': {
                'id': metric.id,
                'metric_uuid': metric.metric_uuid,
                'name': metric.name,
                'name_ar': metric.name_ar
            }
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating metric: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في إنشاء المقياس'}), 500

@performance_monitoring_bp.route('/metrics/<int:metric_id>/data', methods=['GET'])
@jwt_required()
@check_permission('view_performance_monitoring')
@log_audit('GET_METRIC_DATA')
def get_metric_data(metric_id):
    """Get data points for a specific metric"""
    try:
        metric = PerformanceMetric.query.get_or_404(metric_id)
        
        # Time range parameters
        hours = request.args.get('hours', 24, type=int)
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Aggregation parameters
        aggregation = request.args.get('aggregation', 'raw')  # raw, hourly, daily
        
        query = MetricDataPoint.query.filter(
            and_(
                MetricDataPoint.metric_id == metric_id,
                MetricDataPoint.timestamp >= start_time
            )
        ).order_by(MetricDataPoint.timestamp)
        
        data_points = query.all()
        
        if aggregation == 'raw':
            # Return raw data points
            result = [{
                'timestamp': dp.timestamp.isoformat(),
                'value': dp.value,
                'dimensions': dp.dimensions,
                'is_estimated': dp.is_estimated
            } for dp in data_points]
        else:
            # Aggregate data
            aggregated = defaultdict(list)
            
            for dp in data_points:
                if aggregation == 'hourly':
                    key = dp.timestamp.replace(minute=0, second=0, microsecond=0)
                elif aggregation == 'daily':
                    key = dp.timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
                
                aggregated[key].append(dp.value)
            
            result = []
            for timestamp, values in sorted(aggregated.items()):
                result.append({
                    'timestamp': timestamp.isoformat(),
                    'value': statistics.mean(values),
                    'min': min(values),
                    'max': max(values),
                    'count': len(values)
                })
        
        # Calculate statistics
        stats = calculate_metric_statistics(data_points)
        trend_direction, trend_strength = detect_trend(data_points)
        
        return jsonify({
            'success': True,
            'metric': {
                'id': metric.id,
                'name': metric.name,
                'name_ar': metric.name_ar,
                'unit': metric.unit,
                'target_value': metric.target_value
            },
            'data': result,
            'statistics': stats,
            'trend': {
                'direction': trend_direction.value,
                'strength': trend_strength
            },
            'aggregation': aggregation,
            'time_range_hours': hours
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting metric data: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب بيانات المقياس'}), 500

@performance_monitoring_bp.route('/metrics/<int:metric_id>/data', methods=['POST'])
@jwt_required()
@check_permission('manage_performance_monitoring')
@guard_payload_size()
@log_audit('ADD_METRIC_DATA')
def add_metric_data(metric_id):
    """Add data point to a metric"""
    try:
        metric = PerformanceMetric.query.get_or_404(metric_id)
        data = request.get_json()
        
        # Validate required fields
        if 'value' not in data:
            return jsonify({'success': False, 'message': 'قيمة البيانات مطلوبة'}), 400
        
        data_point = MetricDataPoint(
            metric_id=metric_id,
            value=float(data['value']),
            timestamp=datetime.fromisoformat(data['timestamp']) if data.get('timestamp') else datetime.utcnow(),
            dimensions=data.get('dimensions'),
            metadata=data.get('metadata'),
            is_estimated=data.get('is_estimated', False),
            confidence_score=data.get('confidence_score', 1.0),
            data_source_id=data.get('data_source_id')
        )
        
        db.session.add(data_point)
        
        # Check for alerts
        value = data_point.value
        alert_triggered = False
        
        if metric.critical_threshold is not None:
            if (metric.is_higher_better and value < metric.critical_threshold) or \
               (not metric.is_higher_better and value > metric.critical_threshold):
                alert_triggered = True
                alert_level = AlertLevel.CRITICAL
        elif metric.warning_threshold is not None:
            if (metric.is_higher_better and value < metric.warning_threshold) or \
               (not metric.is_higher_better and value > metric.warning_threshold):
                alert_triggered = True
                alert_level = AlertLevel.WARNING
        
        if alert_triggered:
            alert = PerformanceAlert(
                metric_id=metric_id,
                alert_level=alert_level,
                title=f"تنبيه مقياس: {metric.name_ar}",
                message=f"القيمة {value} {metric.unit or ''} تجاوزت الحد المسموح",
                trigger_value=value,
                threshold_value=metric.critical_threshold if alert_level == AlertLevel.CRITICAL else metric.warning_threshold,
                trigger_condition="less_than" if metric.is_higher_better else "greater_than"
            )
            db.session.add(alert)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة نقطة البيانات بنجاح',
            'alert_triggered': alert_triggered
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding metric data: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في إضافة بيانات المقياس'}), 500

# Dashboard Endpoints

@performance_monitoring_bp.route('/dashboards', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_DASHBOARDS')
def get_dashboards():
    """Get all performance dashboards"""
    try:
        user_id = get_jwt_identity()
        
        # Get dashboards accessible to user
        dashboards = PerformanceDashboard.query.filter(
            or_(
                PerformanceDashboard.is_public == True,
                PerformanceDashboard.created_by_id == user_id,
                PerformanceDashboard.allowed_users.contains([user_id])
            )
        ).order_by(PerformanceDashboard.is_default.desc(), PerformanceDashboard.name).all()
        
        result = []
        for dashboard in dashboards:
            widget_count = len(dashboard.widgets)
            
            result.append({
                'id': dashboard.id,
                'name': dashboard.name,
                'name_ar': dashboard.name_ar,
                'description': dashboard.description,
                'is_public': dashboard.is_public,
                'is_default': dashboard.is_default,
                'refresh_interval': dashboard.refresh_interval,
                'widget_count': widget_count,
                'created_at': dashboard.created_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'dashboards': result
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting dashboards: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب لوحات التحكم'}), 500

@performance_monitoring_bp.route('/dashboards/<int:dashboard_id>', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_DASHBOARD')
def get_dashboard(dashboard_id):
    """Get dashboard with widgets and data"""
    try:
        dashboard = PerformanceDashboard.query.options(
            joinedload(PerformanceDashboard.widgets).joinedload(DashboardWidget.metric)
        ).get_or_404(dashboard_id)
        
        # Get widget data
        widgets_data = []
        for widget in dashboard.widgets:
            if not widget.is_visible:
                continue
                
            widget_data = {
                'id': widget.id,
                'widget_type': widget.widget_type,
                'title': widget.title,
                'title_ar': widget.title_ar,
                'position_x': widget.position_x,
                'position_y': widget.position_y,
                'width': widget.width,
                'height': widget.height,
                'time_range': widget.time_range,
                'chart_config': widget.chart_config
            }
            
            # Get metric data if widget has a metric
            if widget.metric:
                # Parse time range
                time_range_map = {
                    '1h': 1,
                    '24h': 24,
                    '7d': 168,
                    '30d': 720
                }
                hours = time_range_map.get(widget.time_range, 24)
                start_time = datetime.utcnow() - timedelta(hours=hours)
                
                # Get data points
                data_points = MetricDataPoint.query.filter(
                    and_(
                        MetricDataPoint.metric_id == widget.metric.id,
                        MetricDataPoint.timestamp >= start_time
                    )
                ).order_by(MetricDataPoint.timestamp).all()
                
                # Format data for chart
                chart_data = [{
                    'x': dp.timestamp.isoformat(),
                    'y': dp.value
                } for dp in data_points]
                
                # Calculate current value based on aggregation
                if data_points:
                    if widget.aggregation == 'sum':
                        current_value = sum(dp.value for dp in data_points)
                    elif widget.aggregation == 'min':
                        current_value = min(dp.value for dp in data_points)
                    elif widget.aggregation == 'max':
                        current_value = max(dp.value for dp in data_points)
                    else:  # avg
                        current_value = statistics.mean(dp.value for dp in data_points)
                else:
                    current_value = 0
                
                widget_data.update({
                    'metric': {
                        'id': widget.metric.id,
                        'name': widget.metric.name,
                        'name_ar': widget.metric.name_ar,
                        'unit': widget.metric.unit,
                        'target_value': widget.metric.target_value
                    },
                    'current_value': current_value,
                    'chart_data': chart_data
                })
            
            widgets_data.append(widget_data)
        
        return jsonify({
            'success': True,
            'dashboard': {
                'id': dashboard.id,
                'name': dashboard.name,
                'name_ar': dashboard.name_ar,
                'description': dashboard.description,
                'refresh_interval': dashboard.refresh_interval,
                'layout_config': dashboard.layout_config,
                'widgets': widgets_data
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting dashboard: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب لوحة التحكم'}), 500

# Alerts Endpoints

@performance_monitoring_bp.route('/alerts', methods=['GET'])
@jwt_required()
@check_permission('view_performance_monitoring')
@log_audit('GET_ALERTS')
def get_alerts():
    """Get performance alerts"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Filters
        level = request.args.get('level')
        is_active = request.args.get('is_active')
        
        query = PerformanceAlert.query.options(joinedload(PerformanceAlert.metric))
        
        if level:
            query = query.filter(PerformanceAlert.alert_level == AlertLevel(level))
        if is_active is not None:
            query = query.filter(PerformanceAlert.is_active == (is_active.lower() == 'true'))
        
        query = query.order_by(desc(PerformanceAlert.triggered_at))
        
        alerts = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        alerts_data = []
        for alert in alerts.items:
            alerts_data.append({
                'id': alert.id,
                'alert_level': alert.alert_level.value,
                'title': alert.title,
                'message': alert.message,
                'trigger_value': alert.trigger_value,
                'threshold_value': alert.threshold_value,
                'is_active': alert.is_active,
                'triggered_at': alert.triggered_at.isoformat(),
                'acknowledged_at': alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None,
                'metric': {
                    'id': alert.metric.id,
                    'name': alert.metric.name,
                    'name_ar': alert.metric.name_ar,
                    'unit': alert.metric.unit
                } if alert.metric else None
            })
        
        return jsonify({
            'success': True,
            'alerts': alerts_data,
            'pagination': {
                'page': alerts.page,
                'pages': alerts.pages,
                'per_page': alerts.per_page,
                'total': alerts.total
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting alerts: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب التنبيهات'}), 500

@performance_monitoring_bp.route('/alerts/<int:alert_id>/acknowledge', methods=['POST'])
@jwt_required()
@check_permission('manage_performance_monitoring')
@guard_payload_size()
@log_audit('ACKNOWLEDGE_ALERT')
def acknowledge_alert(alert_id):
    """Acknowledge an alert"""
    try:
        alert = PerformanceAlert.query.get_or_404(alert_id)
        user_id = get_jwt_identity()
        
        alert.acknowledged_at = datetime.utcnow()
        alert.acknowledged_by_id = user_id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تأكيد التنبيه بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error acknowledging alert: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في تأكيد التنبيه'}), 500

# System Health Endpoints

@performance_monitoring_bp.route('/health', methods=['GET'])
@jwt_required()
@check_permission('view_performance_monitoring')
@log_audit('GET_SYSTEM_HEALTH')
def get_system_health():
    """Get system health status"""
    try:
        health_checks = SystemHealthCheck.query.all()
        
        overall_health = True
        health_data = []
        
        for check in health_checks:
            is_healthy = check.is_healthy and check.consecutive_failures < check.max_failures
            if not is_healthy:
                overall_health = False
            
            health_data.append({
                'id': check.id,
                'check_name': check.check_name,
                'check_type': check.check_type,
                'is_healthy': is_healthy,
                'last_check_at': check.last_check_at.isoformat() if check.last_check_at else None,
                'response_time_ms': check.response_time_ms,
                'availability_percentage': check.availability_percentage,
                'consecutive_failures': check.consecutive_failures,
                'warning_threshold_ms': check.warning_threshold_ms,
                'critical_threshold_ms': check.critical_threshold_ms
            })
        
        return jsonify({
            'success': True,
            'overall_health': overall_health,
            'health_checks': health_data,
            'total_checks': len(health_checks),
            'healthy_checks': sum(1 for check in health_data if check['is_healthy'])
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting system health: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب حالة النظام'}), 500

# Analytics Dashboard

@performance_monitoring_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_ANALYTICS_DASHBOARD')
def get_analytics_dashboard():
    """Get performance monitoring dashboard data"""
    try:
        # Get summary statistics
        total_metrics = PerformanceMetric.query.count()
        active_metrics = PerformanceMetric.query.filter_by(status=MonitoringStatus.ACTIVE).count()
        
        # Get recent alerts
        recent_alerts = PerformanceAlert.query.filter_by(is_active=True)\
            .order_by(desc(PerformanceAlert.triggered_at)).limit(10).all()
        
        critical_alerts = sum(1 for alert in recent_alerts if alert.alert_level == AlertLevel.CRITICAL)
        warning_alerts = sum(1 for alert in recent_alerts if alert.alert_level == AlertLevel.WARNING)
        
        # Get system health summary
        health_checks = SystemHealthCheck.query.all()
        healthy_systems = sum(1 for check in health_checks if check.is_healthy)
        
        # Get metric types distribution
        metric_types = db.session.query(
            PerformanceMetric.metric_type,
            func.count(PerformanceMetric.id)
        ).group_by(PerformanceMetric.metric_type).all()
        
        metric_distribution = [
            {'type': mt[0].value, 'count': mt[1]}
            for mt in metric_types
        ]
        
        # Get recent activity (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_data_points = MetricDataPoint.query.filter(
            MetricDataPoint.timestamp >= yesterday
        ).count()
        
        return jsonify({
            'success': True,
            'summary': {
                'total_metrics': total_metrics,
                'active_metrics': active_metrics,
                'critical_alerts': critical_alerts,
                'warning_alerts': warning_alerts,
                'healthy_systems': healthy_systems,
                'total_systems': len(health_checks),
                'recent_data_points': recent_data_points
            },
            'metric_distribution': metric_distribution,
            'recent_alerts': [
                {
                    'id': alert.id,
                    'title': alert.title,
                    'level': alert.alert_level.value,
                    'triggered_at': alert.triggered_at.isoformat(),
                    'metric_name': alert.metric.name_ar if alert.metric else 'غير محدد'
                }
                for alert in recent_alerts
            ]
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting dashboard data: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب بيانات لوحة التحكم'}), 500

# Export endpoints

@performance_monitoring_bp.route('/export/metrics', methods=['GET'])
@jwt_required()
@check_permission('view_performance_monitoring')
@log_audit('EXPORT_METRICS_DATA')
def export_metrics_data():
    """Export metrics data"""
    try:
        # Get parameters
        metric_ids = request.args.getlist('metric_ids', type=int)
        hours = request.args.get('hours', 24, type=int)
        format_type = request.args.get('format', 'json')  # json, csv
        
        if not metric_ids:
            return jsonify({'success': False, 'message': 'يجب تحديد المقاييس للتصدير'}), 400
        
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Get metrics and their data
        metrics = PerformanceMetric.query.filter(PerformanceMetric.id.in_(metric_ids)).all()
        
        export_data = []
        for metric in metrics:
            data_points = MetricDataPoint.query.filter(
                and_(
                    MetricDataPoint.metric_id == metric.id,
                    MetricDataPoint.timestamp >= start_time
                )
            ).order_by(MetricDataPoint.timestamp).all()
            
            metric_data = {
                'metric': {
                    'id': metric.id,
                    'name': metric.name,
                    'name_ar': metric.name_ar,
                    'unit': metric.unit,
                    'type': metric.metric_type.value
                },
                'data_points': [
                    {
                        'timestamp': dp.timestamp.isoformat(),
                        'value': dp.value,
                        'dimensions': dp.dimensions
                    }
                    for dp in data_points
                ]
            }
            export_data.append(metric_data)
        
        return jsonify({
            'success': True,
            'export_data': export_data,
            'exported_at': datetime.utcnow().isoformat(),
            'time_range_hours': hours,
            'total_metrics': len(export_data),
            'total_data_points': sum(len(m['data_points']) for m in export_data)
        })
        
    except Exception as e:
        current_app.logger.error(f"Error exporting metrics: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في تصدير البيانات'}), 500
