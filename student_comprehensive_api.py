#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
API endpoints للملف الشامل للطالب مع الاختبارات والمقاييس
Student Comprehensive File API with Assessments and Tests
"""

from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
import json
import os
import io
import pandas as pd
from functools import wraps
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfutils
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

# استيراد نظام RBAC المركزي
from auth_rbac_decorator import (
    check_permission, check_multiple_permissions,
    guard_payload_size, validate_json, log_audit
)

# استيراد النماذج
from student_comprehensive_models import (
    db, StudentComprehensiveFile, AssessmentTemplate, StudentAssessmentRecord,
    StudentTestResult, StudentProgressReport, StudentDocument, StudentAIAnalysis,
    FileExportImportLog, PrintJob
)
from models import Student, User
from ai_communications_services import AIService

# إنشاء Blueprint
student_comprehensive_bp = Blueprint('student_comprehensive', __name__, url_prefix='/api/student-comprehensive')


# ===== ملاحظة: نظام RBAC الآن مركزي في auth_rbac_decorator.py =====

# ===== إدارة الملفات الشاملة =====

@student_comprehensive_bp.route('/files', methods=['GET'])
@jwt_required()
@check_permission('view_files')
@log_audit('LIST_COMPREHENSIVE_FILES')
def get_comprehensive_files():
    """الحصول على قائمة الملفات الشاملة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        
        query = StudentComprehensiveFile.query
        
        if search:
            query = query.join(Student).filter(
                Student.name.contains(search) |
                StudentComprehensiveFile.file_number.contains(search)
            )
        
        if status:
            query = query.filter(StudentComprehensiveFile.status == status)
        
        files = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'files': [{
                'id': f.id,
                'file_number': f.file_number,
                'student_name': f.student.name if f.student else 'غير محدد',
                'creation_date': f.creation_date.isoformat(),
                'last_updated': f.last_updated.isoformat(),
                'status': f.status,
                'assessments_count': len(f.assessments),
                'documents_count': len(f.documents)
            } for f in files.items],
            'total': files.total,
            'pages': files.pages,
            'current_page': files.page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@student_comprehensive_bp.route('/files/<int:file_id>', methods=['GET'])
@jwt_required()
@check_permission('view_files')
@log_audit('VIEW_COMPREHENSIVE_FILE')
def get_comprehensive_file(file_id):
    """الحصول على ملف شامل محدد"""
    try:
        file = StudentComprehensiveFile.query.get_or_404(file_id)
        
        return jsonify({
            'id': file.id,
            'file_number': file.file_number,
            'student_id': file.student_id,
            'student_name': file.student.name if file.student else 'غير محدد',
            'creation_date': file.creation_date.isoformat(),
            'last_updated': file.last_updated.isoformat(),
            'personal_info': file.personal_info,
            'medical_history': file.medical_history,
            'family_info': file.family_info,
            'educational_background': file.educational_background,
            'status': file.status,
            'assessments': [{
                'id': a.id,
                'template_name': a.template.name if a.template else 'غير محدد',
                'assessment_date': a.assessment_date.isoformat(),
                'status': a.status,
                'ai_analysis_completed': a.ai_analysis_completed
            } for a in file.assessments],
            'documents': [{
                'id': d.id,
                'title': d.title,
                'document_type': d.document_type,
                'document_date': d.document_date.isoformat() if d.document_date else None,
                'file_size': d.file_size
            } for d in file.documents]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@student_comprehensive_bp.route('/files', methods=['POST'])
@jwt_required()
@roles_required('manage_files')
def create_comprehensive_file():
    """إنشاء ملف شامل جديد"""
    try:
        size_error = _ensure_payload_size()
        if size_error:
            return size_error
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # توليد رقم الملف
        file_number = f"CF-{datetime.now().strftime('%Y%m%d')}-{data['student_id']:04d}"
        
        file = StudentComprehensiveFile(
            student_id=data['student_id'],
            file_number=file_number,
            personal_info=data.get('personal_info', {}),
            medical_history=data.get('medical_history', {}),
            family_info=data.get('family_info', {}),
            educational_background=data.get('educational_background', {}),
            created_by=current_user_id
        )
        
        db.session.add(file)
        db.session.commit()
        
        return jsonify({
            'message': 'تم إنشاء الملف الشامل بنجاح',
            'file_id': file.id,
            'file_number': file.file_number
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@student_comprehensive_bp.route('/files/<int:file_id>', methods=['PATCH'])
@jwt_required()
@roles_required('manage_files')
def update_comprehensive_file(file_id):
    """تحديث بيانات الملف الشامل"""
    try:
        size_error = _ensure_payload_size()
        if size_error:
            return size_error

        data = request.get_json() or {}
        file = StudentComprehensiveFile.query.get_or_404(file_id)

        allowed_fields = ['personal_info', 'medical_history', 'family_info', 'educational_background', 'status']
        for field in allowed_fields:
            if field in data:
                setattr(file, field, data[field])

        file.updated_by = get_jwt_identity()
        db.session.commit()

        return jsonify({'message': 'تم تحديث الملف الشامل بنجاح'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@student_comprehensive_bp.route('/files/<int:file_id>', methods=['DELETE'])
@jwt_required()
@roles_required('manage_files')
def delete_comprehensive_file(file_id):
    """أرشفة أو حذف ملف شامل"""
    try:
        file = StudentComprehensiveFile.query.get_or_404(file_id)
        action = request.args.get('action', 'archive')

        if action == 'delete':
            db.session.delete(file)
        else:
            file.status = 'archived'
            file.updated_by = get_jwt_identity()

        db.session.commit()
        return jsonify({'message': 'تمت معالجة الملف الشامل بنجاح', 'action': action})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===== إدارة قوالب الاختبارات =====

@student_comprehensive_bp.route('/assessment-templates', methods=['GET'])
@jwt_required()
@roles_required('view_files')
def get_assessment_templates():
    """الحصول على قوالب الاختبارات"""
    try:
        category = request.args.get('category', '')
        age_min = request.args.get('age_min', type=int)
        age_max = request.args.get('age_max', type=int)
        
        query = AssessmentTemplate.query.filter(AssessmentTemplate.is_active == True)
        
        if category:
            query = query.filter(AssessmentTemplate.category == category)
        
        if age_min:
            query = query.filter(AssessmentTemplate.age_range_min >= age_min)
        
        if age_max:
            query = query.filter(AssessmentTemplate.age_range_max <= age_max)
        
        templates = query.all()
        
        return jsonify({
            'templates': [{
                'id': t.id,
                'name': t.name,
                'name_en': t.name_en,
                'description': t.description,
                'category': t.category,
                'age_range': f"{t.age_range_min}-{t.age_range_max}" if t.age_range_min and t.age_range_max else 'غير محدد',
                'duration_minutes': t.duration_minutes,
                'requires_ai_analysis': t.requires_ai_analysis
            } for t in templates]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@student_comprehensive_bp.route('/assessment-templates', methods=['POST'])
@jwt_required()
@roles_required('manage_assessments')
def create_assessment_template():
    """إنشاء قالب اختبار جديد"""
    try:
        size_error = _ensure_payload_size()
        if size_error:
            return size_error
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        template = AssessmentTemplate(
            name=data['name'],
            name_en=data.get('name_en'),
            description=data.get('description'),
            category=data['category'],
            age_range_min=data.get('age_range_min'),
            age_range_max=data.get('age_range_max'),
            sections=data.get('sections', []),
            questions=data.get('questions', []),
            scoring_method=data.get('scoring_method', {}),
            interpretation_guide=data.get('interpretation_guide', {}),
            duration_minutes=data.get('duration_minutes'),
            required_materials=data.get('required_materials', []),
            administrator_qualifications=data.get('administrator_qualifications', []),
            validity_info=data.get('validity_info', {}),
            reliability_info=data.get('reliability_info', {}),
            normative_data=data.get('normative_data', {}),
            requires_ai_analysis=data.get('requires_ai_analysis', False),
            ai_analysis_type=data.get('ai_analysis_type'),
            created_by=current_user_id
        )
        
        db.session.add(template)
        db.session.commit()
        
        return jsonify({
            'message': 'تم إنشاء قالب الاختبار بنجاح',
            'template_id': template.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===== إدارة سجلات الاختبارات =====

@student_comprehensive_bp.route('/assessments', methods=['POST'])
@jwt_required()
@check_permission('manage_assessments')
@guard_payload_size()
@validate_json('comprehensive_file_id', 'template_id', 'assessment_date')
@log_audit('CREATE_ASSESSMENT')
def create_assessment_record():
    """إنشاء سجل اختبار جديد"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        record = StudentAssessmentRecord(
            comprehensive_file_id=data['comprehensive_file_id'],
            template_id=data['template_id'],
            assessment_date=datetime.strptime(data['assessment_date'], '%Y-%m-%d').date(),
            administrator_id=current_user_id,
            session_number=data.get('session_number', 1),
            duration_actual=data.get('duration_actual'),
            responses=data.get('responses', {}),
            raw_scores=data.get('raw_scores', {}),
            standard_scores=data.get('standard_scores', {}),
            percentiles=data.get('percentiles', {}),
            interpretation=data.get('interpretation'),
            recommendations=data.get('recommendations', []),
            testing_conditions=data.get('testing_conditions', {}),
            behavioral_observations=data.get('behavioral_observations'),
            is_baseline=data.get('is_baseline', False),
            ai_analysis_requested=data.get('ai_analysis_requested', False)
        )
        
        db.session.add(record)
        db.session.commit()
        
        # طلب تحليل الذكاء الاصطناعي إذا كان مطلوباً
        if record.ai_analysis_requested:
            ai_service = AIService()
            ai_analysis = ai_service.analyze_assessment_results(record.id)
            
            if ai_analysis:
                record.ai_analysis_completed = True
                db.session.commit()
        
        return jsonify({
            'message': 'تم إنشاء سجل الاختبار بنجاح',
            'record_id': record.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@student_comprehensive_bp.route('/assessments/<int:record_id>', methods=['PATCH'])
@jwt_required()
@check_permission('manage_assessments')
@guard_payload_size()
@log_audit('UPDATE_ASSESSMENT')
def update_assessment_record(record_id):
    """تحديث سجل اختبار"""
    try:
        data = request.get_json() or {}
        record = StudentAssessmentRecord.query.get_or_404(record_id)

        mutable_fields = ['assessment_date', 'session_number', 'duration_actual', 'responses', 'raw_scores', 'standard_scores', 'percentiles', 'interpretation', 'recommendations', 'testing_conditions', 'behavioral_observations', 'status', 'ai_analysis_requested']

        if 'assessment_date' in data:
            record.assessment_date = datetime.strptime(data['assessment_date'], '%Y-%m-%d').date()

        for field in mutable_fields:
            if field != 'assessment_date' and field in data:
                setattr(record, field, data[field])

        record.updated_date = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'تم تحديث سجل الاختبار بنجاح'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@student_comprehensive_bp.route('/assessments/<int:record_id>', methods=['DELETE'])
@jwt_required()
@check_permission('manage_assessments')
@log_audit('DELETE_ASSESSMENT')
def delete_assessment_record(record_id):
    """حذف سجل اختبار"""
    try:
        record = StudentAssessmentRecord.query.get_or_404(record_id)
        db.session.delete(record)
        db.session.commit()
        return jsonify({'message': 'تم حذف سجل الاختبار بنجاح'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@student_comprehensive_bp.route('/assessments/<int:record_id>/ai-analysis', methods=['POST'])
@jwt_required()
@check_permission('ai_analysis')
@log_audit('REQUEST_AI_ANALYSIS')
def request_ai_analysis(record_id):
    """طلب تحليل الذكاء الاصطناعي للاختبار"""
    try:
        record = StudentAssessmentRecord.query.get_or_404(record_id)
        current_user_id = get_jwt_identity()
        
        ai_service = AIService()
        analysis_result = ai_service.analyze_assessment_comprehensive(record_id)
        
        if analysis_result:
            ai_analysis = StudentAIAnalysis(
                comprehensive_file_id=record.comprehensive_file_id,
                assessment_record_id=record_id,
                analysis_type='comprehensive_assessment',
                analysis_scope='single_assessment',
                input_data=analysis_result.get('input_data', {}),
                findings=analysis_result.get('findings', {}),
                patterns_identified=analysis_result.get('patterns', []),
                predictions=analysis_result.get('predictions', {}),
                recommendations=analysis_result.get('recommendations', []),
                ai_model_used=analysis_result.get('model_used', 'default'),
                confidence_scores=analysis_result.get('confidence_scores', {}),
                created_by=current_user_id
            )
            
            db.session.add(ai_analysis)
            record.ai_analysis_completed = True
            record.ai_confidence_score = analysis_result.get('overall_confidence', 0.0)
            
            db.session.commit()
            
            return jsonify({
                'message': 'تم إجراء التحليل بالذكاء الاصطناعي بنجاح',
                'analysis_id': ai_analysis.id,
                'confidence_score': record.ai_confidence_score
            })
        else:
            return jsonify({'error': 'فشل في إجراء التحليل'}), 500
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===== تصدير الملفات =====

@student_comprehensive_bp.route('/files/<int:file_id>/export', methods=['POST'])
@jwt_required()
@check_permission('export_files')
@guard_payload_size()
@log_audit('EXPORT_FILE')
def export_comprehensive_file(file_id):
    """تصدير الملف الشامل"""
    try:
        data = request.get_json()
        export_format = data.get('format', 'pdf')  # pdf, excel, json
        include_sections = data.get('include_sections', [])
        current_user_id = get_jwt_identity()
        
        file = StudentComprehensiveFile.query.get_or_404(file_id)
        
        # تسجيل عملية التصدير
        export_log = FileExportImportLog(
            comprehensive_file_id=file_id,
            operation_type='export',
            export_format=export_format,
            data_included=include_sections,
            access_level=data.get('access_level', 'full'),
            requested_by=current_user_id,
            purpose=data.get('purpose', '')
        )
        
        db.session.add(export_log)
        db.session.commit()
        
        if export_format == 'pdf':
            file_path = generate_pdf_report(file, include_sections)
        elif export_format == 'excel':
            file_path = generate_excel_report(file, include_sections)
        elif export_format == 'json':
            file_path = generate_json_export(file, include_sections)
        else:
            return jsonify({'error': 'تنسيق غير مدعوم'}), 400
        
        # تحديث سجل التصدير
        export_log.status = 'completed'
        export_log.file_path = file_path
        export_log.completion_date = datetime.utcnow()
        db.session.commit()
        
        return send_file(file_path, as_attachment=True)
        
    except Exception as e:
        if 'export_log' in locals():
            export_log.status = 'failed'
            export_log.error_message = str(e)
            db.session.commit()
        return jsonify({'error': str(e)}), 500


@student_comprehensive_bp.route('/files/<int:file_id>/documents', methods=['POST'])
@jwt_required()
@check_permission('manage_files')
@guard_payload_size()
@validate_json('title', 'document_type')
@log_audit('ADD_DOCUMENT')
def add_document(file_id):
    """إضافة مستند مرتبط بالملف الشامل (بيانات وصفية فقط)."""
    try:
        data = request.get_json() or {}

        document_date = None
        if data.get('document_date'):
            document_date = datetime.strptime(data['document_date'], '%Y-%m-%d').date()

        document = StudentDocument(
            comprehensive_file_id=file_id,
            title=data['title'],
            document_type=data['document_type'],
            description=data.get('description'),
            file_name=data.get('file_name', data['title']),
            file_path=data.get('file_path', ''),
            file_size=data.get('file_size'),
            mime_type=data.get('mime_type'),
            document_date=document_date,
            source=data.get('source'),
            confidentiality_level=data.get('confidentiality_level', 'standard'),
            requires_signature=data.get('requires_signature', False),
            uploaded_by=get_jwt_identity()
        )

        db.session.add(document)
        db.session.commit()

        return jsonify({'message': 'تم إضافة المستند بنجاح', 'document_id': document.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@student_comprehensive_bp.route('/documents/<int:document_id>', methods=['DELETE'])
@jwt_required()
@check_permission('manage_files')
@log_audit('DELETE_DOCUMENT')
def delete_document(document_id):
    """حذف مستند"""
    try:
        document = StudentDocument.query.get_or_404(document_id)
        db.session.delete(document)
        db.session.commit()
        return jsonify({'message': 'تم حذف المستند بنجاح'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def generate_pdf_report(file, sections):
    """توليد تقرير PDF"""
    filename = f"comprehensive_file_{file.file_number}.pdf"
    filepath = os.path.join(current_app.config.get('EXPORT_FOLDER', '/tmp'), filename)
    
    # إنشاء PDF
    c = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4
    
    # إعداد الخط العربي
    try:
        pdfmetrics.registerFont(TTFont('Arabic', 'arial.ttf'))
        c.setFont('Arabic', 12)
    except:
        c.setFont('Helvetica', 12)
    
    y_position = height - 50
    
    # العنوان
    c.drawString(50, y_position, f"الملف الشامل - {file.student.name if file.student else 'غير محدد'}")
    y_position -= 30
    
    c.drawString(50, y_position, f"رقم الملف: {file.file_number}")
    y_position -= 20
    
    c.drawString(50, y_position, f"تاريخ الإنشاء: {file.creation_date}")
    y_position -= 40
    
    # المحتوى حسب الأقسام المطلوبة
    if 'personal_info' in sections and file.personal_info:
        c.drawString(50, y_position, "المعلومات الشخصية:")
        y_position -= 20
        for key, value in file.personal_info.items():
            c.drawString(70, y_position, f"{key}: {value}")
            y_position -= 15
        y_position -= 20
    
    if 'assessments' in sections:
        c.drawString(50, y_position, "الاختبارات والمقاييس:")
        y_position -= 20
        for assessment in file.assessments:
            c.drawString(70, y_position, f"- {assessment.template.name if assessment.template else 'غير محدد'}")
            y_position -= 15
            c.drawString(90, y_position, f"التاريخ: {assessment.assessment_date}")
            y_position -= 15
    
    c.save()
    return filepath

def generate_excel_report(file, sections):
    """توليد تقرير Excel"""
    filename = f"comprehensive_file_{file.file_number}.xlsx"
    filepath = os.path.join(current_app.config.get('EXPORT_FOLDER', '/tmp'), filename)
    
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        # معلومات أساسية
        basic_info = pd.DataFrame([{
            'رقم الملف': file.file_number,
            'اسم الطالب': file.student.name if file.student else 'غير محدد',
            'تاريخ الإنشاء': file.creation_date,
            'آخر تحديث': file.last_updated,
            'الحالة': file.status
        }])
        basic_info.to_excel(writer, sheet_name='معلومات أساسية', index=False)
        
        # الاختبارات
        if 'assessments' in sections and file.assessments:
            assessments_data = []
            for assessment in file.assessments:
                assessments_data.append({
                    'اسم الاختبار': assessment.template.name if assessment.template else 'غير محدد',
                    'تاريخ التطبيق': assessment.assessment_date,
                    'المطبق': assessment.administrator.username if assessment.administrator else 'غير محدد',
                    'الحالة': assessment.status,
                    'تحليل الذكاء الاصطناعي': 'مكتمل' if assessment.ai_analysis_completed else 'غير مكتمل'
                })
            
            assessments_df = pd.DataFrame(assessments_data)
            assessments_df.to_excel(writer, sheet_name='الاختبارات', index=False)
    
    return filepath

def generate_json_export(file, sections):
    """توليد تصدير JSON"""
    filename = f"comprehensive_file_{file.file_number}.json"
    filepath = os.path.join(current_app.config.get('EXPORT_FOLDER', '/tmp'), filename)
    
    export_data = {
        'file_info': {
            'id': file.id,
            'file_number': file.file_number,
            'student_name': file.student.name if file.student else 'غير محدد',
            'creation_date': file.creation_date.isoformat(),
            'last_updated': file.last_updated.isoformat(),
            'status': file.status
        }
    }
    
    if 'personal_info' in sections:
        export_data['personal_info'] = file.personal_info
    
    if 'medical_history' in sections:
        export_data['medical_history'] = file.medical_history
    
    if 'assessments' in sections:
        export_data['assessments'] = [{
            'template_name': a.template.name if a.template else 'غير محدد',
            'assessment_date': a.assessment_date.isoformat(),
            'responses': a.responses,
            'raw_scores': a.raw_scores,
            'interpretation': a.interpretation
        } for a in file.assessments]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)
    
    return filepath

# ===== طباعة الملفات =====

@student_comprehensive_bp.route('/files/<int:file_id>/print', methods=['POST'])
@jwt_required()
@check_permission('print_files')
@log_audit('CREATE_PRINT_JOB')
def create_print_job(file_id):
    """إنشاء مهمة طباعة"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        print_job = PrintJob(
            comprehensive_file_id=file_id,
            job_name=data.get('job_name', f'طباعة ملف {file_id}'),
            document_type=data.get('document_type', 'full_file'),
            content_selection=data.get('content_selection', []),
            print_settings=data.get('print_settings', {}),
            copies=data.get('copies', 1),
            confidentiality_level=data.get('confidentiality_level', 'standard'),
            watermark_text=data.get('watermark_text'),
            purpose=data.get('purpose'),
            requested_by=current_user_id
        )
        
        db.session.add(print_job)
        db.session.commit()
        
        return jsonify({
            'message': 'تم إنشاء مهمة الطباعة بنجاح',
            'job_id': print_job.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===== لوحة التحكم والإحصائيات =====

@student_comprehensive_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_files')
@log_audit('VIEW_DASHBOARD')
def get_dashboard_stats():
    """إحصائيات لوحة التحكم"""
    try:
        total_files = StudentComprehensiveFile.query.count()
        active_files = StudentComprehensiveFile.query.filter_by(status='active').count()
        total_assessments = StudentAssessmentRecord.query.count()
        ai_analyses = StudentAIAnalysis.query.count()
        
        recent_assessments = StudentAssessmentRecord.query.order_by(
            StudentAssessmentRecord.assessment_date.desc()
        ).limit(10).all()
        
        return jsonify({
            'stats': {
                'total_files': total_files,
                'active_files': active_files,
                'total_assessments': total_assessments,
                'ai_analyses': ai_analyses
            },
            'recent_assessments': [{
                'id': a.id,
                'student_name': a.comprehensive_file.student.name if a.comprehensive_file.student else 'غير محدد',
                'template_name': a.template.name if a.template else 'غير محدد',
                'assessment_date': a.assessment_date.isoformat(),
                'status': a.status
            } for a in recent_assessments]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
