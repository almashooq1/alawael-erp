"""
📈 Performance Analytics API Routes
نظام تحليل الأداء - API Endpoints
"""

from flask import Blueprint, request, jsonify
from services.performance_analytics_service import PerformanceAnalyticsService
from datetime import datetime
import logging

api = Blueprint('analytics', __name__, url_prefix='/api/analytics')
logger = logging.getLogger(__name__)


# ==========================================
# 1. تسجيل المقاييس
# ==========================================

@api.route('/metrics/record', methods=['POST'])
def record_metric():
    """
    تسجيل مقياس أداء

    POST /api/analytics/metrics/record
    Body:
    {
        "metric_name": "response_time",
        "value": 250,
        "unit": "ms",
        "tags": {"endpoint": "/api/users"}
    }
    """
    try:
        data = request.get_json()
        db = request.app.db
        service = PerformanceAnalyticsService(db)

        result = service.record_metric(
            data['metric_name'],
            data['value'],
            data.get('unit'),
            data.get('tags')
        )

        logger.info(f"Metric recorded: {data['metric_name']}")

        return jsonify({
            'status': 'success',
            'message': result.get('message'),
            'timestamp': datetime.now().isoformat()
        }), 201

    except Exception as e:
        logger.error(f"Error recording metric: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 2. الأداء الحالي
# ==========================================

@api.route('/performance/current', methods=['GET'])
def get_current_performance():
    """
    الحصول على الأداء الحالي

    GET /api/analytics/performance/current
    """
    try:
        db = request.app.db
        service = PerformanceAnalyticsService(db)

        performance = service.get_current_performance()

        return jsonify({
            'status': 'success',
            'performance': performance,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting performance: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 3. تحليل وقت الاستجابة
# ==========================================

@api.route('/performance/response-time', methods=['GET'])
def analyze_response_time():
    """
    تحليل وقت الاستجابة

    GET /api/analytics/performance/response-time
    Query Params:
    - endpoint: نقطة النهاية
    - limit: عدد القراءات
    """
    try:
        endpoint = request.args.get('endpoint')
        limit = request.args.get('limit', 100, type=int)

        db = request.app.db
        service = PerformanceAnalyticsService(db)

        analysis = service.analyze_response_time(endpoint, limit)

        return jsonify({
            'status': 'success',
            'analysis': analysis,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error analyzing response time: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 4. تحليل استخدام الموارد
# ==========================================

@api.route('/performance/resource-usage', methods=['GET'])
def analyze_resource_usage():
    """
    تحليل استخدام الموارد

    GET /api/analytics/performance/resource-usage
    """
    try:
        db = request.app.db
        service = PerformanceAnalyticsService(db)

        analysis = service.analyze_resource_usage()

        return jsonify({
            'status': 'success',
            'analysis': analysis,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error analyzing resource usage: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 5. تحديد الاختناقات
# ==========================================

@api.route('/performance/bottlenecks', methods=['GET'])
def identify_bottlenecks():
    """
    تحديد اختناقات الأداء

    GET /api/analytics/performance/bottlenecks
    """
    try:
        db = request.app.db
        service = PerformanceAnalyticsService(db)

        bottlenecks = service.identify_bottlenecks()

        return jsonify({
            'status': 'success',
            'bottlenecks': bottlenecks,
            'count': len(bottlenecks),
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error identifying bottlenecks: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 6. تعيين حد التنبيهات
# ==========================================

@api.route('/alerts/threshold', methods=['POST'])
def set_alert_threshold():
    """
    تعيين حد التنبيهات

    POST /api/analytics/alerts/threshold
    Body:
    {
        "metric_name": "response_time",
        "threshold": 500,
        "condition": "greater_than"
    }
    """
    try:
        data = request.get_json()
        db = request.app.db
        service = PerformanceAnalyticsService(db)

        result = service.set_alert_threshold(
            data['metric_name'],
            data['threshold'],
            data['condition']
        )

        logger.info(f"Alert threshold set: {data['metric_name']}")

        return jsonify({
            'status': 'success',
            'message': result.get('message'),
            'timestamp': datetime.now().isoformat()
        }), 201

    except Exception as e:
        logger.error(f"Error setting alert threshold: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 7. التنبيهات النشطة
# ==========================================

@api.route('/alerts/active', methods=['GET'])
def get_active_alerts():
    """
    الحصول على التنبيهات النشطة

    GET /api/analytics/alerts/active
    """
    try:
        db = request.app.db
        service = PerformanceAnalyticsService(db)

        alerts = service.get_active_alerts()

        return jsonify({
            'status': 'success',
            'alerts': alerts,
            'count': len(alerts),
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting active alerts: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 8. سجل التنبيهات
# ==========================================

@api.route('/alerts/history', methods=['GET'])
def get_alert_history():
    """
    الحصول على سجل التنبيهات

    GET /api/analytics/alerts/history
    Query Params:
    - limit: عدد النتائج
    - resolved: true|false
    """
    try:
        limit = request.args.get('limit', 50, type=int)
        resolved = request.args.get('resolved')

        db = request.app.db

        query = {}
        if resolved is not None:
            query['resolved'] = resolved.lower() == 'true'

        history = list(
            db['alert_history'].find(query).sort('created_at', -1).limit(limit)
        )

        return jsonify({
            'status': 'success',
            'history': history,
            'count': len(history),
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting alert history: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 9. تقرير الأداء
# ==========================================

@api.route('/performance/report', methods=['GET'])
def generate_performance_report():
    """
    توليد تقرير الأداء

    GET /api/analytics/performance/report
    Query Params:
    - date_from: من تاريخ
    - date_to: إلى تاريخ
    """
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        db = request.app.db
        service = PerformanceAnalyticsService(db)

        report = service.generate_performance_report(date_from, date_to)

        return jsonify({
            'status': 'success',
            'report': report,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 10. لوحة التحكم الرئيسية
# ==========================================

@api.route('/dashboard', methods=['GET'])
def analytics_dashboard():
    """
    لوحة تحكم التحليلات

    GET /api/analytics/dashboard
    """
    try:
        db = request.app.db
        service = PerformanceAnalyticsService(db)

        # جمع البيانات الرئيسية
        dashboard_data = {
            'current_performance': service.get_current_performance(),
            'active_alerts': service.get_active_alerts(),
            'bottlenecks': service.identify_bottlenecks(),
            'resource_usage': service.analyze_resource_usage(),
            'timestamp': datetime.now().isoformat()
        }

        return jsonify({
            'status': 'success',
            'dashboard': dashboard_data
        }), 200

    except Exception as e:
        logger.error(f"Error getting dashboard: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# معالجة الأخطاء
# ==========================================

@api.errorhandler(400)
def bad_request(error):
    return jsonify({
        'status': 'error',
        'message': 'Bad request'
    }), 400


@api.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found'
    }), 404
