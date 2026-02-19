"""
📊 Student Advanced Reports API
نظام التقارير المتقدمة للطلاب - API Endpoints
"""

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.student_reports_service import StudentReportsService
from datetime import datetime, timedelta
import logging

api = Blueprint('student_reports', __name__, url_prefix='/api/student-reports')
logger = logging.getLogger(__name__)


# ==========================================
# 1. التقارير الشاملة
# ==========================================

@api.route('/<student_id>/advanced', methods=['GET'])
@jwt_required()
def get_student_advanced_report(student_id):
    """
    الحصول على التقرير المتقدم الشامل للطالب
    
    GET /api/student-reports/<student_id>/advanced
    Query Params:
    - date_from: تاريخ البداية (YYYY-MM-DD)
    - date_to: تاريخ النهاية (YYYY-MM-DD)
    - report_type: نوع التقرير (comprehensive|academic|behavior|attendance)
    - focus_area: مجال التركيز (all|math|arabic|science|english|skills)
    """
    try:
        date_from = request.args.get('date_from', (datetime.now() - timedelta(days=120)).strftime('%Y-%m-%d'))
        date_to = request.args.get('date_to', datetime.now().strftime('%Y-%m-%d'))
        report_type = request.args.get('report_type', 'comprehensive')
        focus_area = request.args.get('focus_area', 'all')
        
        service = StudentReportsService()
        
        report = service.generate_advanced_report(
            student_id,
            date_from,
            date_to,
            report_type,
            focus_area
        )
        
        logger.info(f"Advanced report generated for student {student_id}")
        
        return jsonify({
            'success': True,
            'data': report,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Error generating advanced report: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# 2. تقارير المقارنة
# ==========================================

@api.route('/<student_id>/comparison', methods=['POST'])
@jwt_required()
def get_comparison_report(student_id):
    """
    مقارنة أداء الطالب بين فترتين
    
    POST /api/student-reports/<student_id>/comparison
    Body:
    {
        "period1": {"from": "2025-09-01", "to": "2025-12-15"},
        "period2": {"from": "2025-12-16", "to": "2026-01-31"}
    }
    """
    try:
        data = request.get_json()
        period1 = data.get('period1', {})
        period2 = data.get('period2', {})
        
        service = StudentReportsService()
        
        comparison = service.generate_comparison_report(
            student_id,
            period1.get('from'),
            period1.get('to'),
            period2.get('from'),
            period2.get('to')
        )
        
        logger.info(f"Comparison report generated for student {student_id}")
        
        return jsonify({
            'success': True,
            'data': comparison,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Error generating comparison report: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# 3. التقارير التنبؤية
# ==========================================

@api.route('/<student_id>/predictive', methods=['GET'])
@jwt_required()
def get_predictive_report(student_id):
    """
    التقرير التنبؤي لأداء الطالب المستقبلي
    
    GET /api/student-reports/<student_id>/predictive
    Query Params:
    - weeks_ahead: عدد الأسابيع للتنبؤ (default: 8)
    """
    try:
        weeks_ahead = request.args.get('weeks_ahead', 8, type=int)
        
        service = StudentReportsService()
        
        prediction = service.generate_predictive_report(
            student_id,
            weeks_ahead
        )
        
        logger.info(f"Predictive report generated for student {student_id}")
        
        return jsonify({
            'success': True,
            'data': prediction,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Error generating predictive report: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# 4. تقارير المهارات
# ==========================================

@api.route('/<student_id>/skills', methods=['GET'])
@jwt_required()
def get_skills_report(student_id):
    """
    تقرير تطور المهارات الحياتية والأكاديمية
    
    GET /api/student-reports/<student_id>/skills
    Query Params:
    - date_from: تاريخ البداية
    - date_to: تاريخ النهاية
    """
    try:
        date_from = request.args.get('date_from', (datetime.now() - timedelta(days=120)).strftime('%Y-%m-%d'))
        date_to = request.args.get('date_to', datetime.now().strftime('%Y-%m-%d'))
        
        service = StudentReportsService()
        
        skills_report = service.generate_skills_report(
            student_id,
            date_from,
            date_to
        )
        
        logger.info(f"Skills report generated for student {student_id}")
        
        return jsonify({
            'success': True,
            'data': skills_report,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Error generating skills report: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# 5. تقارير المخاطر والتحذيرات
# ==========================================

@api.route('/<student_id>/risk-assessment', methods=['GET'])
@jwt_required()
def get_risk_assessment(student_id):
    """
    تقييم المخاطر والتحذيرات المبكرة
    
    GET /api/student-reports/<student_id>/risk-assessment
    """
    try:
        service = StudentReportsService()
        
        assessment = service.generate_risk_assessment(student_id)
        
        logger.info(f"Risk assessment generated for student {student_id}")
        
        return jsonify({
            'success': True,
            'data': assessment,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Error generating risk assessment: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# 6. تصدير التقارير
# ==========================================

@api.route('/<student_id>/export', methods=['POST'])
@jwt_required()
def export_report(student_id):
    """
    تصدير التقرير بصيغ مختلفة
    
    POST /api/student-reports/<student_id>/export
    Body:
    {
        "report_type": "comprehensive",
        "format": "pdf|excel|csv",
        "date_from": "2025-09-01",
        "date_to": "2026-01-31"
    }
    """
    try:
        data = request.get_json()
        report_type = data.get('report_type', 'comprehensive')
        export_format = data.get('format', 'pdf')
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        
        service = StudentReportsService()
        
        file_data, filename = service.export_report(
            student_id,
            report_type,
            export_format,
            date_from,
            date_to
        )
        
        logger.info(f"Report exported for student {student_id} as {export_format}")
        
        content_types = {
            'pdf': 'application/pdf',
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv': 'text/csv'
        }
        
        return send_file(
            file_data,
            mimetype=content_types.get(export_format, 'application/octet-stream'),
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        logger.error(f"Error exporting report: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# 7. جدولة التقارير
# ==========================================

@api.route('/<student_id>/schedule', methods=['POST'])
@jwt_required()
def schedule_report(student_id):
    """
    جدولة إرسال التقرير دورياً
    
    POST /api/student-reports/<student_id>/schedule
    Body:
    {
        "frequency": "weekly|monthly|quarterly",
        "recipients": ["email@example.com"],
        "report_type": "comprehensive",
        "report_format": "pdf"
    }
    """
    try:
        data = request.get_json()
        frequency = data.get('frequency', 'monthly')
        recipients = data.get('recipients', [])
        report_type = data.get('report_type', 'comprehensive')
        report_format = data.get('report_format', 'pdf')
        
        service = StudentReportsService()
        
        schedule = service.schedule_report(
            student_id,
            frequency,
            recipients,
            report_type,
            report_format
        )
        
        logger.info(f"Report scheduled for student {student_id}")
        
        return jsonify({
            'success': True,
            'data': schedule,
            'message': 'تم جدولة التقرير بنجاح',
            'timestamp': datetime.now().isoformat()
        }), 201
    
    except Exception as e:
        logger.error(f"Error scheduling report: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# 8. قائمة التقارير المجدولة
# ==========================================

@api.route('/<student_id>/scheduled-reports', methods=['GET'])
@jwt_required()
def get_scheduled_reports(student_id):
    """
    الحصول على قائمة التقارير المجدولة
    
    GET /api/student-reports/<student_id>/scheduled-reports
    """
    try:
        service = StudentReportsService()
        
        scheduled = service.get_scheduled_reports(student_id)
        
        return jsonify({
            'success': True,
            'data': scheduled,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching scheduled reports: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# 9. تعديل/حذف التقارير المجدولة
# ==========================================

@api.route('/scheduled-reports/<schedule_id>', methods=['PUT'])
@jwt_required()
def update_scheduled_report(schedule_id):
    """تحديث تقرير مجدول"""
    try:
        data = request.get_json()
        service = StudentReportsService()
        
        updated = service.update_scheduled_report(schedule_id, data)
        
        return jsonify({
            'success': True,
            'data': updated,
            'message': 'تم تحديث التقرير المجدول'
        }), 200
    
    except Exception as e:
        logger.error(f"Error updating scheduled report: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api.route('/scheduled-reports/<schedule_id>', methods=['DELETE'])
@jwt_required()
def delete_scheduled_report(schedule_id):
    """حذف تقرير مجدول"""
    try:
        service = StudentReportsService()
        
        service.delete_scheduled_report(schedule_id)
        
        return jsonify({
            'success': True,
            'message': 'تم حذف التقرير المجدول'
        }), 200
    
    except Exception as e:
        logger.error(f"Error deleting scheduled report: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# 10. ملخص سريع
# ==========================================

@api.route('/<student_id>/summary', methods=['GET'])
@jwt_required()
def get_quick_summary(student_id):
    """
    ملخص سريع لأداء الطالب
    
    GET /api/student-reports/<student_id>/summary
    """
    try:
        service = StudentReportsService()
        
        summary = service.generate_quick_summary(student_id)
        
        return jsonify({
            'success': True,
            'data': summary,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# معالجة الأخطاء
# ==========================================

@api.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': 'Bad Request'
    }), 400


@api.errorhandler(401)
def unauthorized(error):
    return jsonify({
        'success': False,
        'error': 'Unauthorized'
    }), 401


@api.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Not Found'
    }), 404


@api.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal Server Error'
    }), 500
