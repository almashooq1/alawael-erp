"""
Performance Monitoring API Routes
مسارات API مراقبة الأداء
"""

from flask import Blueprint, request, jsonify, g
from services.monitoring_service import (
    PerformanceMonitoringService,
    MetricType,
    HealthStatus
)
from middleware.auth_middleware import AuthMiddleware
from services.admin_service import Permission

monitoring_bp = Blueprint('monitoring', __name__, url_prefix='/api/monitoring')


# ==================== Metrics ====================

@monitoring_bp.route('/metrics', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_STATS)
def record_metric():
    """
    تسجيل مقياس جديد

    Request Body:
        {
            "metric_type": "api_response_time",
            "value": 125.5,
            "tags": {
                "method": "GET",
                "path": "/api/users"
            }
        }
    """
    try:
        data = request.get_json()

        metric = PerformanceMonitoringService.record_metric(
            data.get('metric_type'),
            data.get('value'),
            data.get('tags')
        )

        if 'error' in metric:
            return jsonify(metric), 400

        return jsonify(metric), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@monitoring_bp.route('/metrics/<metric_type>', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_STATS)
def get_metrics_by_type(metric_type):
    """الحصول على المقاييس حسب النوع"""
    try:
        limit = request.args.get('limit', 100, type=int)

        metrics = PerformanceMonitoringService.get_metrics_by_type(metric_type, limit)

        return jsonify({
            'metrics': metrics,
            'count': len(metrics)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== System Metrics ====================

@monitoring_bp.route('/system', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_STATS)
def get_system_metrics():
    """الحصول على مقاييس النظام (CPU، Memory، Disk)"""
    try:
        metrics = PerformanceMonitoringService.get_system_metrics()

        if 'error' in metrics:
            return jsonify(metrics), 400

        return jsonify(metrics), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== API Metrics ====================

@monitoring_bp.route('/api-metrics', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_STATS)
def get_api_metrics():
    """الحصول على مقاييس API"""
    try:
        time_range = request.args.get('time_range_minutes', 60, type=int)

        metrics = PerformanceMonitoringService.get_api_metrics(time_range)

        if 'error' in metrics:
            return jsonify(metrics), 400

        return jsonify(metrics), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Error Rate ====================

@monitoring_bp.route('/error-rate', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_STATS)
def get_error_rate():
    """الحصول على معدل الأخطاء"""
    try:
        time_range = request.args.get('time_range_minutes', 60, type=int)

        error_rate = PerformanceMonitoringService.get_error_rate(time_range)

        if 'error' in error_rate:
            return jsonify(error_rate), 400

        return jsonify(error_rate), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Dashboard ====================

@monitoring_bp.route('/dashboard', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_STATS)
def get_dashboard():
    """الحصول على ملخص لوحة التحكم"""
    try:
        summary = PerformanceMonitoringService.get_dashboard_summary()

        if 'error' in summary:
            return jsonify(summary), 400

        return jsonify(summary), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Uptime ====================

@monitoring_bp.route('/uptime', methods=['GET'])
@AuthMiddleware.require_auth
def get_uptime():
    """الحصول على وقت التشغيل"""
    try:
        uptime = PerformanceMonitoringService.get_uptime()

        if 'error' in uptime:
            return jsonify(uptime), 400

        return jsonify(uptime), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Reports ====================

@monitoring_bp.route('/reports/performance', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_STATS)
def get_performance_report():
    """
    الحصول على تقرير الأداء

    Query Parameters:
        - time_range_minutes: 60 (default)
    """
    try:
        time_range = request.args.get('time_range_minutes', 60, type=int)

        report = PerformanceMonitoringService.get_performance_report(time_range)

        if 'error' in report:
            return jsonify(report), 400

        return jsonify(report), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Alerts ====================

@monitoring_bp.route('/alerts/rules', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.MANAGE_SETTINGS)
def create_alert_rule():
    """
    إنشاء قاعدة تنبيه

    Request Body:
        {
            "name": "High CPU Usage",
            "metric_type": "cpu_usage",
            "condition": "greater_than",
            "threshold": 80,
            "duration_seconds": 300,
            "action": "notification",
            "enabled": true
        }
    """
    try:
        data = request.get_json()

        rule = PerformanceMonitoringService.create_alert_rule(data)

        if 'error' in rule:
            return jsonify(rule), 400

        return jsonify(rule), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@monitoring_bp.route('/alerts/rules', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_STATS)
def get_alerts():
    """الحصول على قائمة التنبيهات"""
    try:
        alerts = PerformanceMonitoringService.get_alerts()

        return jsonify({
            'alerts': alerts,
            'total': len(alerts)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Logs ====================

@monitoring_bp.route('/logs', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_STATS)
def get_logs():
    """
    الحصول على السجلات

    Query Parameters:
        - limit: 100 (default)
        - level: error/info (optional)
    """
    try:
        limit = request.args.get('limit', 100, type=int)
        level = request.args.get('level')

        logs = PerformanceMonitoringService.get_logs(limit, level)

        return jsonify({
            'logs': logs,
            'total': len(logs)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@monitoring_bp.route('/logs/error', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_STATS)
def get_error_logs():
    """الحصول على السجلات الخاصة بالأخطاء فقط"""
    try:
        limit = request.args.get('limit', 50, type=int)

        logs = PerformanceMonitoringService.get_logs(limit, 'error')

        return jsonify({
            'logs': logs,
            'total': len(logs)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Cleanup ====================

@monitoring_bp.route('/cleanup', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.DELETE_USER)
def cleanup_old_data():
    """
    تنظيف البيانات القديمة

    Request Body:
        {
            "days": 7
        }
    """
    try:
        data = request.get_json() or {}
        days = data.get('days', 7)

        deleted_count = PerformanceMonitoringService.cleanup_old_data(days)

        return jsonify({
            'message': f'Cleaned up {deleted_count} old records',
            'deleted_count': deleted_count
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Health Check ====================

@monitoring_bp.route('/health', methods=['GET'])

@jwt_required()
@check_permission('view_health_check')
@log_audit('GET_HEALTH_CHECK')
def health_check():
    """فحص الصحة العام للنظام"""
    try:
        dashboard = PerformanceMonitoringService.get_dashboard_summary()

        status_code = 200
        if dashboard.get('overall_status') == HealthStatus.CRITICAL:
            status_code = 503
        elif dashboard.get('overall_status') == HealthStatus.WARNING:
            status_code = 200  # Still responding

        return jsonify(dashboard), status_code

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Real-time Status ====================

@monitoring_bp.route('/status', methods=['GET'])
@AuthMiddleware.require_auth
def get_status():
    """الحصول على الحالة الحالية (تحديث فوري)"""
    try:
        system = PerformanceMonitoringService.get_system_metrics()
        api_metrics = PerformanceMonitoringService.get_api_metrics(5)  # آخر 5 دقائق
        uptime = PerformanceMonitoringService.get_uptime()

        return jsonify({
            'system': system,
            'api_metrics': api_metrics,
            'uptime': uptime,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Imports ====================

from datetime import datetime
from lib.auth_rbac_decorator import check_permission, require_role, log_audit, guard_payload_size, validate_json
