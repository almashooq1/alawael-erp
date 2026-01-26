from flask import Blueprint, request, jsonify, render_template, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date
import json
import io
from database import db
from datetime import timedelta
from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit
)
#!/usr/bin/env python3
# -*- coding: utf-8 -*-


# إنشاء Blueprint
reports_viz_bp = Blueprint('reports_visualization', __name__, url_prefix='/api/reports-visualization')

# تهيئة الخدمات - سيتم تحميلها عند الحاجة

@reports_viz_bp.route('/progress-report/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
@check_permission('view_reports')
@log_audit('GENERATE_PROGRESS_REPORT')
def generate_progress_report(beneficiary_id):
    """إنتاج تقرير التقدم"""
    try:
        period_months = request.args.get('period_months', 3, type=int)
        format_type = request.args.get('format', 'html')
        
        # استيراد مؤقت للخدمات
        try:
            from automated_report_generator import AutomatedReportGenerator
            report_generator = AutomatedReportGenerator()
            result = report_generator.generate_progress_report(
                beneficiary_id=beneficiary_id,
                period_months=period_months,
                format_type=format_type
            )
        except ImportError:
            result = {
                'success': False,
                'message': 'خدمة التقارير غير متاحة حالياً'
            }
        
        if result['success']:
            return jsonify({
                'success': True,
                'report': result['report_content'],
                'format': result['format'],
                'generated_at': result['generated_at']
            })
        else:
            return jsonify({'success': False, 'message': result['message']}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنتاج التقرير: {str(e)}'}), 500

@reports_viz_bp.route('/comprehensive-report/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
@check_permission('view_reports')
@log_audit('GENERATE_COMPREHENSIVE_REPORT')
def generate_comprehensive_report(beneficiary_id):
    """إنتاج التقرير الشامل"""
    try:
        format_type = request.args.get('format', 'html')
        
        try:
            from automated_report_generator import AutomatedReportGenerator
            report_generator = AutomatedReportGenerator()
            result = report_generator.generate_comprehensive_report(
                beneficiary_id=beneficiary_id,
                format_type=format_type
            )
        except ImportError:
            result = {
                'success': False,
                'message': 'خدمة التقارير غير متاحة حالياً'
            }
        
        if result['success']:
            return jsonify({
                'success': True,
                'report': result['report_content'],
                'format': result['format'],
                'generated_at': result['generated_at']
            })
        else:
            return jsonify({'success': False, 'message': result['message']}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنتاج التقرير: {str(e)}'}), 500

@reports_viz_bp.route('/batch-reports', methods=['POST'])
@jwt_required()
@check_permission('generate_reports_visualization')
@guard_payload_size()
@log_audit('GENERATE_BATCH_REPORTS')
def generate_batch_reports():
    """إنتاج تقارير متعددة"""
    try:
        data = request.get_json()
        beneficiary_ids = data.get('beneficiary_ids', [])
        report_type = data.get('report_type', 'progress')
        
        if not beneficiary_ids:
            return jsonify({'success': False, 'message': 'يجب تحديد معرفات المستفيدين'}), 400
        
        try:
            from automated_report_generator import AutomatedReportGenerator
            report_generator = AutomatedReportGenerator()
            result = report_generator.generate_batch_reports(
                beneficiary_ids=beneficiary_ids,
                report_type=report_type
            )
        except ImportError:
            result = {
                'success': False,
                'message': 'خدمة التقارير غير متاحة حالياً'
            }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنتاج التقارير: {str(e)}'}), 500

@reports_viz_bp.route('/visualization/progress-timeline/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
@check_permission('view_reports_visualization')
@log_audit('GET_PROGRESS_TIMELINE')
def get_progress_timeline(beneficiary_id):
    """الحصول على خط زمني للتقدم"""
    try:
        try:
            from advanced_data_visualization import AdvancedDataVisualization
            data_visualizer = AdvancedDataVisualization()
            result = data_visualizer.create_progress_timeline(beneficiary_id)
        except ImportError:
            result = {
                'success': False,
                'message': 'خدمة التصور غير متاحة حالياً'
            }
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنشاء الخط الزمني: {str(e)}'}), 500

@reports_viz_bp.route('/visualization/skills-radar/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
@check_permission('view_reports_visualization')
@log_audit('GET_SKILLS_RADAR')
def get_skills_radar(beneficiary_id):
    """الحصول على رسم رادار للمهارات"""
    try:
        try:
            from advanced_data_visualization import AdvancedDataVisualization
            data_visualizer = AdvancedDataVisualization()
            result = data_visualizer.create_skills_radar_chart(beneficiary_id)
        except ImportError:
            result = {
                'success': False,
                'message': 'خدمة التصور غير متاحة حالياً'
            }
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنشاء الرسم الرادار: {str(e)}'}), 500

@reports_viz_bp.route('/visualization/therapy-effectiveness', methods=['GET'])
@jwt_required()
@check_permission('view_reports_visualization')
@log_audit('GET_THERAPY_EFFECTIVENESS')
def get_therapy_effectiveness():
    """الحصول على رسم فعالية العلاجات"""
    try:
        result = data_visualizer.create_therapy_effectiveness_chart()
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنشاء رسم الفعالية: {str(e)}'}), 500

@reports_viz_bp.route('/visualization/disability-distribution', methods=['GET'])
@jwt_required()
@check_permission('view_reports_visualization')
@log_audit('GET_DISABILITY_DISTRIBUTION')
def get_disability_distribution():
    """الحصول على توزيع أنواع الإعاقة"""
    try:
        result = data_visualizer.create_disability_distribution_chart()
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنشاء رسم التوزيع: {str(e)}'}), 500

@reports_viz_bp.route('/visualization/progress-heatmap', methods=['GET'])
@jwt_required()
@check_permission('view_reports_visualization')
@log_audit('GET_PROGRESS_HEATMAP')
def get_progress_heatmap():
    """الحصول على خريطة حرارية للتقدم"""
    try:
        period_months = request.args.get('period_months', 6, type=int)
        result = data_visualizer.create_progress_heatmap(period_months)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنشاء الخريطة الحرارية: {str(e)}'}), 500

@reports_viz_bp.route('/visualization/attendance-calendar/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
@check_permission('view_reports_visualization')
@log_audit('GET_ATTENDANCE_CALENDAR')
def get_attendance_calendar(beneficiary_id):
    """الحصول على تقويم الحضور"""
    try:
        year = request.args.get('year', datetime.now().year, type=int)
        result = data_visualizer.create_attendance_calendar(beneficiary_id, year)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنشاء تقويم الحضور: {str(e)}'}), 500

@reports_viz_bp.route('/visualization/dashboard-summary', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_DASHBOARD_SUMMARY')
def get_dashboard_summary():
    """الحصول على ملخص لوحة التحكم"""
    try:
        result = data_visualizer.create_dashboard_summary()
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنشاء ملخص لوحة التحكم: {str(e)}'}), 500

@reports_viz_bp.route('/schedule-reports', methods=['POST'])
@jwt_required()
@check_permission('manage_reports_visualization')
@guard_payload_size()
@log_audit('SCHEDULE_AUTOMATED_REPORTS')
def schedule_automated_reports():
    """جدولة التقارير التلقائية"""
    try:
        data = request.get_json()
        schedule_config = {
            'beneficiary_ids': data.get('beneficiary_ids', []),
            'report_type': data.get('report_type', 'progress'),
            'frequency': data.get('frequency', 'monthly'),  # daily, weekly, monthly
            'recipients': data.get('recipients', []),
            'format': data.get('format', 'html')
        }
        
        result = report_generator.schedule_automated_reports(schedule_config)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جدولة التقارير: {str(e)}'}), 500

@reports_viz_bp.route('/export-report', methods=['POST'])
@jwt_required()
@check_permission('manage_reports_visualization')
@guard_payload_size()
@log_audit('EXPORT_REPORT')
def export_report():
    """تصدير التقرير بصيغ مختلفة"""
    try:
        data = request.get_json()
        beneficiary_id = data.get('beneficiary_id')
        report_type = data.get('report_type', 'progress')
        export_format = data.get('format', 'pdf')
        
        if not beneficiary_id:
            return jsonify({'success': False, 'message': 'يجب تحديد معرف المستفيد'}), 400
        
        if report_type == 'progress':
            result = report_generator.generate_progress_report(
                beneficiary_id=beneficiary_id,
                format_type=export_format
            )
        else:
            result = report_generator.generate_comprehensive_report(
                beneficiary_id=beneficiary_id,
                format_type=export_format
            )
        
        if result['success']:
            # في التطبيق الحقيقي، يمكن حفظ الملف وإرجاع رابط التحميل
            return jsonify({
                'success': True,
                'download_url': f'/api/reports-visualization/download/{beneficiary_id}_{report_type}_{export_format}',
                'file_size': len(result['report_content']),
                'generated_at': result['generated_at']
            })
        else:
            return jsonify({'success': False, 'message': result['message']}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في تصدير التقرير: {str(e)}'}), 500

@reports_viz_bp.route('/analytics/summary', methods=['GET'])
@jwt_required()
@check_permission('view_reports_visualization')
@log_audit('GET_ANALYTICS_SUMMARY')
def get_analytics_summary():
    """الحصول على ملخص التحليلات"""
    try:
        from comprehensive_rehabilitation_models import (
            RehabilitationBeneficiary, IndividualRehabilitationPlan, 
            TherapySession, ComprehensiveAssessment
        )
        
        # إحصائيات عامة
        total_beneficiaries = RehabilitationBeneficiary.query.count()
        active_plans = IndividualRehabilitationPlan.query.filter_by(status='active').count()
        completed_sessions = TherapySession.query.filter_by(status='completed').count()
        total_assessments = ComprehensiveAssessment.query.count()
        
        # إحصائيات التقدم
        recent_assessments = ComprehensiveAssessment.query.filter(
            ComprehensiveAssessment.assessment_date >= date.today() - timedelta(days=30)
        ).all()
        
        avg_progress = 0
        if recent_assessments:
            total_scores = sum([a.overall_score or 0 for a in recent_assessments])
            avg_progress = total_scores / len(recent_assessments)
        
        # إحصائيات الحضور
        total_scheduled = TherapySession.query.filter_by(status='scheduled').count()
        total_missed = TherapySession.query.filter_by(status='missed').count()
        attendance_rate = 0
        if (completed_sessions + total_missed) > 0:
            attendance_rate = (completed_sessions / (completed_sessions + total_missed)) * 100
        
        return jsonify({
            'success': True,
            'summary': {
                'total_beneficiaries': total_beneficiaries,
                'active_plans': active_plans,
                'completed_sessions': completed_sessions,
                'total_assessments': total_assessments,
                'avg_progress': round(avg_progress, 2),
                'attendance_rate': round(attendance_rate, 2),
                'scheduled_sessions': total_scheduled,
                'missed_sessions': total_missed
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في الحصول على الملخص: {str(e)}'}), 500

@reports_viz_bp.route('/templates', methods=['GET'])
@jwt_required()
@check_permission('view_reports')
@log_audit('GET_REPORT_TEMPLATES')
def get_report_templates():
    """الحصول على قوالب التقارير المتاحة"""
    try:
        templates = {
            'progress_report': {
                'name': 'تقرير التقدم',
                'description': 'تقرير مفصل عن تقدم المستفيد في فترة محددة',
                'parameters': ['beneficiary_id', 'period_months'],
                'formats': ['html', 'pdf', 'json']
            },
            'comprehensive_report': {
                'name': 'التقرير الشامل',
                'description': 'تقرير شامل يتضمن جميع بيانات المستفيد',
                'parameters': ['beneficiary_id'],
                'formats': ['html', 'pdf', 'json']
            },
            'batch_report': {
                'name': 'التقارير المتعددة',
                'description': 'إنتاج تقارير لعدة مستفيدين',
                'parameters': ['beneficiary_ids', 'report_type'],
                'formats': ['json']
            }
        }
        
        return jsonify({
            'success': True,
            'templates': templates
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في الحصول على القوالب: {str(e)}'}), 500
