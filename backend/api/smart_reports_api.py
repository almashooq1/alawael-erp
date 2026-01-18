"""
📊 Smart Reports API Routes
نظام التقارير الذكية - API Endpoints
"""

from flask import Blueprint, request, jsonify, send_file
from services.smart_reports_service import SmartReportsService
from datetime import datetime
import logging

api = Blueprint('reports', __name__, url_prefix='/api/reports')
logger = logging.getLogger(__name__)


# ==========================================
# 1. توليد التقارير
# ==========================================

@api.route('/generate', methods=['POST'])
def generate_report():
    """
    توليد تقرير جديد

    POST /api/reports/generate
    Body:
    {
        "title": "تقرير تقدم الطلاب",
        "type": "student_progress",
        "date_from": "2026-01-01",
        "date_to": "2026-01-16",
        "filters": {...}
    }
    """
    try:
        data = request.get_json()
        db = request.app.db
        service = SmartReportsService(db)

        report = service.generate_report(data)

        logger.info(f"Report generated: {report['id']}")

        return jsonify({
            'status': 'success',
            'report': report,
            'timestamp': datetime.now().isoformat()
        }), 201

    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 2. قائمة التقارير
# ==========================================

@api.route('/list', methods=['GET'])
def list_reports():
    """
    الحصول على قائمة التقارير

    GET /api/reports/list
    Query Params:
    - limit: عدد النتائج
    - offset: الإزاحة
    - type: نوع التقرير
    """
    try:
        db = request.app.db
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        report_type = request.args.get('type')

        query = {}
        if report_type:
            query['type'] = report_type

        reports = list(
            db['reports'].find(query).sort('created_at', -1).skip(offset).limit(limit)
        )

        total = db['reports'].count_documents(query)

        return jsonify({
            'status': 'success',
            'reports': reports,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'total': total
            },
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error listing reports: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 3. تفاصيل التقرير
# ==========================================

@api.route('/<report_id>', methods=['GET'])
def get_report(report_id):
    """
    الحصول على تفاصيل التقرير

    GET /api/reports/<report_id>
    """
    try:
        db = request.app.db

        report = db['reports'].find_one({'_id': report_id})

        if not report:
            return jsonify({
                'status': 'error',
                'message': 'Report not found'
            }), 404

        return jsonify({
            'status': 'success',
            'report': report,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting report: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 4. حذف التقرير
# ==========================================

@api.route('/<report_id>', methods=['DELETE'])
def delete_report(report_id):
    """
    حذف تقرير

    DELETE /api/reports/<report_id>
    """
    try:
        db = request.app.db

        result = db['reports'].delete_one({'_id': report_id})

        if result.deleted_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'Report not found'
            }), 404

        logger.info(f"Report deleted: {report_id}")

        return jsonify({
            'status': 'success',
            'message': 'Report deleted successfully'
        }), 200

    except Exception as e:
        logger.error(f"Error deleting report: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 5. تصدير التقرير
# ==========================================

@api.route('/<report_id>/export', methods=['GET'])
def export_report(report_id):
    """
    تصدير التقرير

    GET /api/reports/<report_id>/export?format=pdf
    Format: pdf, excel, csv, json
    """
    try:
        format_type = request.args.get('format', 'pdf')
        db = request.app.db
        service = SmartReportsService(db)

        file_data = service.export_report(report_id, format_type)

        # تحديد نوع المحتوى
        content_types = {
            'pdf': 'application/pdf',
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv': 'text/csv',
            'json': 'application/json'
        }

        logger.info(f"Report exported: {report_id} as {format_type}")

        return send_file(
            file_data,
            mimetype=content_types.get(format_type, 'application/octet-stream'),
            as_attachment=True,
            download_name=f'report_{report_id}.{format_type}'
        )

    except Exception as e:
        logger.error(f"Error exporting report: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 6. جدولة التقارير
# ==========================================

@api.route('/schedule', methods=['POST'])
def schedule_report():
    """
    جدولة تقرير متكرر

    POST /api/reports/schedule
    Body:
    {
        "report_config": {...},
        "frequency": "daily|weekly|monthly",
        "recipients": ["email1@example.com"]
    }
    """
    try:
        data = request.get_json()
        db = request.app.db
        service = SmartReportsService(db)

        result = service.schedule_report(
            data['report_config'],
            data['frequency'],
            data['recipients']
        )

        logger.info(f"Report scheduled: {result['id']}")

        return jsonify({
            'status': 'success',
            'schedule': result,
            'timestamp': datetime.now().isoformat()
        }), 201

    except Exception as e:
        logger.error(f"Error scheduling report: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 7. مقارنة الفترات
# ==========================================

@api.route('/compare', methods=['POST'])
def compare_periods():
    """
    مقارنة التقارير بين فترتين

    POST /api/reports/compare
    Body:
    {
        "report_type": "student_progress",
        "period1": {"from": "2026-01-01", "to": "2026-01-08"},
        "period2": {"from": "2026-01-09", "to": "2026-01-16"}
    }
    """
    try:
        data = request.get_json()
        db = request.app.db
        service = SmartReportsService(db)

        comparison = service.compare_periods(
            data['report_type'],
            data['period1'],
            data['period2']
        )

        logger.info(f"Reports compared: {data['report_type']}")

        return jsonify({
            'status': 'success',
            'comparison': comparison,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error comparing reports: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 8. تقارير مخصصة
# ==========================================

@api.route('/custom', methods=['POST'])
def custom_report():
    """
    توليد تقرير مخصص

    POST /api/reports/custom
    Body: إعدادات مخصصة حسب احتياجات المستخدم
    """
    try:
        data = request.get_json()
        db = request.app.db
        service = SmartReportsService(db)

        report = service.generate_custom_report(data)

        return jsonify({
            'status': 'success',
            'report': report,
            'timestamp': datetime.now().isoformat()
        }), 201

    except Exception as e:
        logger.error(f"Error creating custom report: {str(e)}")
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
        'message': 'Report not found'
    }), 404
