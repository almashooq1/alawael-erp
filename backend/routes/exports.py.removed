"""
API Endpoints - التصدير
Export API Routes
"""

from flask import Blueprint, jsonify, request, send_file
from services.export_service import ExportService
from datetime import datetime
import logging

bp = Blueprint('exports', __name__, url_prefix='/api/exports')
export_service = ExportService()
logger = logging.getLogger(__name__)

# ==========================================
# 1. تصدير PDF
# ==========================================

@bp.route('/pdf', methods=['POST'])
def export_pdf():
    """
    تصدير التقرير كـ PDF
    
    Request Body:
    {
        "report_data": {...},
        "filename": "report.pdf"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'report_data' not in data:
            return jsonify({'error': 'report_data مطلوب'}), 400
        
        report_data = data['report_data']
        filename = data.get('filename', f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
        
        # تصدير PDF
        pdf_buffer = export_service.export_as_pdf(report_data, filename)
        
        return send_file(
            pdf_buffer,
            mimetype=ExportService.get_mime_type('pdf'),
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"Error exporting PDF: {str(e)}")
        return jsonify({'error': f'خطأ: {str(e)}'}), 500

# ==========================================
# 2. تصدير Excel
# ==========================================

@bp.route('/excel', methods=['POST'])
def export_excel():
    """
    تصدير التقرير كـ Excel
    
    Request Body:
    {
        "report_data": {...},
        "filename": "report.xlsx"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'report_data' not in data:
            return jsonify({'error': 'report_data مطلوب'}), 400
        
        report_data = data['report_data']
        filename = data.get('filename', f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx")
        
        # تصدير Excel
        excel_buffer = export_service.export_as_excel(report_data, filename)
        
        return send_file(
            excel_buffer,
            mimetype=ExportService.get_mime_type('excel'),
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"Error exporting Excel: {str(e)}")
        return jsonify({'error': f'خطأ: {str(e)}'}), 500

# ==========================================
# 3. تصدير CSV
# ==========================================

@bp.route('/csv', methods=['POST'])
def export_csv():
    """
    تصدير التقرير كـ CSV
    
    Request Body:
    {
        "report_data": {...},
        "filename": "report.csv"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'report_data' not in data:
            return jsonify({'error': 'report_data مطلوب'}), 400
        
        report_data = data['report_data']
        filename = data.get('filename', f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
        
        # تصدير CSV
        csv_buffer = export_service.export_as_csv(report_data, filename)
        
        return send_file(
            csv_buffer,
            mimetype=ExportService.get_mime_type('csv'),
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"Error exporting CSV: {str(e)}")
        return jsonify({'error': f'خطأ: {str(e)}'}), 500

# ==========================================
# 4. تصدير JSON
# ==========================================

@bp.route('/json', methods=['POST'])
def export_json():
    """
    تصدير التقرير كـ JSON
    
    Request Body:
    {
        "report_data": {...},
        "filename": "report.json"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'report_data' not in data:
            return jsonify({'error': 'report_data مطلوب'}), 400
        
        report_data = data['report_data']
        filename = data.get('filename', f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        
        # تصدير JSON
        json_buffer = export_service.export_as_json(report_data, filename)
        
        return send_file(
            json_buffer,
            mimetype=ExportService.get_mime_type('json'),
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"Error exporting JSON: {str(e)}")
        return jsonify({'error': f'خطأ: {str(e)}'}), 500

# ==========================================
# 5. تصدير متعدد الصيغ
# ==========================================

@bp.route('/multi', methods=['POST'])
def export_multi():
    """
    تصدير التقرير بصيغ متعددة
    
    Request Body:
    {
        "report_data": {...},
        "formats": ["pdf", "excel", "csv", "json"],
        "base_filename": "report"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'report_data' not in data:
            return jsonify({'error': 'report_data مطلوب'}), 400
        
        report_data = data['report_data']
        formats = data.get('formats', ['pdf', 'excel', 'csv', 'json'])
        base_filename = data.get('base_filename', f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        
        # تصدير متعدد
        results = export_service.export_multi_format(report_data, formats)
        
        return jsonify({
            'status': 'success',
            'message': 'تم تصدير التقرير بنجاح',
            'formats': list(results.keys()),
            'timestamp': datetime.now().isoformat(),
            'base_filename': base_filename
        }), 200
        
    except Exception as e:
        logger.error(f"Error exporting multiple formats: {str(e)}")
        return jsonify({'error': f'خطأ: {str(e)}'}), 500

# ==========================================
# 6. الحصول على معلومات الصيغ المدعومة
# ==========================================

@bp.route('/formats', methods=['GET'])
def get_supported_formats():
    """الحصول على قائمة الصيغ المدعومة"""
    formats_info = []
    
    for fmt in export_service.formats:
        formats_info.append({
            'format': fmt,
            'mime_type': ExportService.get_mime_type(fmt),
            'extension': ExportService.get_file_extension(fmt),
            'description': f'صيغة {fmt.upper()}'
        })
    
    return jsonify({
        'supported_formats': formats_info,
        'total': len(formats_info),
        'timestamp': datetime.now().isoformat()
    }), 200

# ==========================================
# 7. اختبار التصدير
# ==========================================

@bp.route('/test', methods=['GET'])
def test_export():
    """اختبار التصدير مع بيانات عينة"""
    sample_report = {
        'report_type': 'Advanced Student Report',
        'student_name': 'أحمد محمد علي',
        'student_id': 'STU001',
        'grade': 'الصف العاشر',
        'gpa': 4.2,
        'generated_at': datetime.now().isoformat(),
        'academic_performance': {
            'trend': 'up',
            'average': 85.5,
            'total_subjects': 8
        },
        'behavior': {
            'incidents': 2,
            'warnings': 1,
            'positive_notes': 5
        },
        'attendance': {
            'present': 38,
            'absent': 2,
            'late': 1,
            'rate': 94.2
        },
        'skills': {
            'communication': 4.5,
            'critical_thinking': 4.0,
            'collaboration': 3.8,
            'problem_solving': 4.2,
            'creativity': 3.9
        }
    }
    
    return jsonify({
        'status': 'success',
        'message': 'بيانات عينة للاختبار',
        'sample_report': sample_report,
        'supported_formats': export_service.formats,
        'instructions': {
            'pdf': 'POST /api/exports/pdf with report_data in body',
            'excel': 'POST /api/exports/excel with report_data in body',
            'csv': 'POST /api/exports/csv with report_data in body',
            'json': 'POST /api/exports/json with report_data in body',
            'multi': 'POST /api/exports/multi with report_data and formats in body'
        }
    }), 200
