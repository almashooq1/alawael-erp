"""
Report API Routes
مسارات API التقارير
"""

from flask import Blueprint, request, jsonify, Response
from services.report_service import ReportService, ReportType, ReportFormat
from middleware.auth_middleware import AuthMiddleware
from services.admin_service import Permission
from lib.auth_rbac_decorator import check_permission, require_role, log_audit, guard_payload_size, validate_json

report_bp = Blueprint('report', __name__, url_prefix='/api/reports')


# ==================== Generate Reports ====================

@report_bp.route('/sales', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def generate_sales_report():
    """
    توليد تقرير المبيعات

    Request Body:
        {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
            "group_by": "day"
        }
    """
    try:
        filters = request.get_json() or {}
        report = ReportService.generate_sales_report(filters)

        if 'error' in report:
            return jsonify(report), 400

        return jsonify(report), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@report_bp.route('/revenue', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def generate_revenue_report():
    """
    توليد تقرير الإيرادات

    Request Body:
        {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
            "category": "all"
        }
    """
    try:
        filters = request.get_json() or {}
        report = ReportService.generate_revenue_report(filters)

        if 'error' in report:
            return jsonify(report), 400

        return jsonify(report), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@report_bp.route('/users', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def generate_users_report():
    """
    توليد تقرير المستخدمين

    Request Body:
        {
            "role": "all",
            "status": "all"
        }
    """
    try:
        filters = request.get_json() or {}
        report = ReportService.generate_users_report(filters)

        if 'error' in report:
            return jsonify(report), 400

        return jsonify(report), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@report_bp.route('/attendance', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def generate_attendance_report():
    """
    توليد تقرير الحضور

    Request Body:
        {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
    """
    try:
        filters = request.get_json() or {}
        report = ReportService.generate_attendance_report(filters)

        if 'error' in report:
            return jsonify(report), 400

        return jsonify(report), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Export Reports ====================

@report_bp.route('/export/<report_id>/csv', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.EXPORT_DATA)
def export_report_csv(report_id):
    """تصدير التقرير إلى CSV"""
    try:
        csv_data = ReportService.export_to_csv(report_id)

        if not csv_data:
            return jsonify({'error': 'Report not found'}), 404

        return Response(
            csv_data,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename=report_{report_id}.csv'
            }
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@report_bp.route('/export/<report_id>/json', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.EXPORT_DATA)
def export_report_json(report_id):
    """تصدير التقرير إلى JSON"""
    try:
        json_data = ReportService.export_to_json(report_id)

        if not json_data:
            return jsonify({'error': 'Report not found'}), 404

        return Response(
            json_data,
            mimetype='application/json',
            headers={
                'Content-Disposition': f'attachment; filename=report_{report_id}.json'
            }
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Templates ====================

@report_bp.route('/templates', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def create_template():
    """
    إنشاء قالب تقرير

    Request Body:
        {
            "name": "Monthly Sales Template",
            "description": "Template for monthly sales reports",
            "report_type": "sales",
            "filters": {...},
            "columns": [...]
        }
    """
    try:
        data = request.get_json()

        from flask import g
        data['created_by'] = g.user_id if hasattr(g, 'user_id') else 'unknown'

        template = ReportService.create_template(data)

        if 'error' in template:
            return jsonify(template), 400

        return jsonify(template), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@report_bp.route('/templates/<template_id>', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def get_template(template_id):
    """الحصول على قالب"""
    try:
        template = ReportService.get_template(template_id)

        if not template:
            return jsonify({'error': 'Template not found'}), 404

        return jsonify(template), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@report_bp.route('/templates', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def get_all_templates():
    """الحصول على جميع القوالب"""
    try:
        templates = ReportService.get_all_templates()

        return jsonify({
            'templates': templates,
            'total': len(templates)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Scheduled Reports ====================

@report_bp.route('/schedule', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def schedule_report():
    """
    جدولة تقرير

    Request Body:
        {
            "report_type": "sales",
            "template_id": "template_1",
            "frequency": "daily",
            "recipients": ["user@example.com"],
            "format": "json",
            "next_run": "2024-01-01T00:00:00"
        }
    """
    try:
        data = request.get_json()
        schedule = ReportService.schedule_report(data)

        if 'error' in schedule:
            return jsonify(schedule), 400

        return jsonify(schedule), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Report Management ====================

@report_bp.route('/<report_id>', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def get_report(report_id):
    """الحصول على تقرير محدد"""
    try:
        report = ReportService.get_report(report_id)

        if not report:
            return jsonify({'error': 'Report not found'}), 404

        return jsonify(report), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@report_bp.route('/', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def get_all_reports():
    """الحصول على جميع التقارير"""
    try:
        reports = ReportService.get_all_reports()

        return jsonify({
            'reports': reports,
            'total': len(reports)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@report_bp.route('/<report_id>', methods=['DELETE'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.DELETE_USER)
def delete_report(report_id):
    """حذف تقرير"""
    try:
        success = ReportService.delete_report(report_id)

        if not success:
            return jsonify({'error': 'Report not found'}), 404

        return jsonify({'message': 'Report deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Statistics ====================

@report_bp.route('/statistics', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_STATS)
def get_statistics():
    """إحصائيات التقارير"""
    try:
        stats = ReportService.get_report_statistics()

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Health Check ====================

@report_bp.route('/health', methods=['GET'])

@jwt_required()
@check_permission('view_health_check')
@log_audit('GET_HEALTH_CHECK')
def health_check():
    """فحص صحة نظام التقارير"""
    return jsonify({
        'status': 'healthy',
        'service': 'reports',
        'total_reports': len(ReportService.reports_db),
        'total_templates': len(ReportService.templates_db),
        'timestamp': '2026-01-20'
    }), 200
