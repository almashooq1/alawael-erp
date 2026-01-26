#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
إضافة بيانات تجريبية شاملة لنظام الملف الشامل للطالب
Sample Data for Student Comprehensive File System
"""

import sys
import os
from datetime import datetime, timedelta
import random

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import User, Student
from student_comprehensive_models import (
    StudentComprehensiveFile, AssessmentTemplate, StudentAssessmentRecord,
    StudentAIAnalysis, FileExportImportLog, PrintJob
)

def add_sample_data():
    """إضافة بيانات تجريبية شاملة"""
    
    with app.app_context():
        try:
            print("🚀 بدء إضافة البيانات التجريبية لنظام الملف الشامل للطالب...")
            
            # 1. إنشاء قوالب التقييم
            templates = create_assessment_templates()
            print(f"✅ تم إنشاء {len(templates)} قالب تقييم")
            
            # 2. إنشاء ملفات شاملة للطلاب
            files = create_comprehensive_files()
            print(f"✅ تم إنشاء {len(files)} ملف شامل")
            
            # 3. إنشاء سجلات التقييم
            assessments = create_assessment_records(templates, files)
            print(f"✅ تم إنشاء {len(assessments)} سجل تقييم")

            # 4. إنشاء نتائج التحليل بالذكاء الاصطناعي
            ai_results = create_ai_analysis_results(assessments)
            print(f"✅ تم إنشاء {len(ai_results)} نتيجة تحليل ذكي")

            # 5. إنشاء سجلات التصدير والاستيراد
            export_logs = create_export_logs(files)
            print(f"✅ تم إنشاء {len(export_logs)} سجل تصدير")

            # 6. إنشاء مهام الطباعة
            print_jobs = create_print_jobs(files)
            print(f"✅ تم إنشاء {len(print_jobs)} مهمة طباعة")
            
            db.session.commit()
            print("🎉 تم إضافة جميع البيانات التجريبية بنجاح!")
            
            # طباعة إحصائيات
            print_statistics()
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات: {e}")
            db.session.rollback()
            raise

def create_assessment_templates():
    """إنشاء قوالب التقييم"""
    templates_data = [
        {
            'name': 'تقييم المهارات الحركية',
            'description': 'تقييم شامل للمهارات الحركية الكبرى والدقيقة',
            'category': 'motor_skills',
            'sections': {
                'gross_motor': 'المهارات الحركية الكبرى',
                'fine_motor': 'المهارات الحركية الدقيقة',
                'coordination': 'التناسق والتوازن'
            },
            'scoring_method': {'type': 'scale_1_5'},
            'questions': []
        },
        {
            'name': 'تقييم المهارات المعرفية',
            'description': 'تقييم القدرات المعرفية والذهنية',
            'category': 'cognitive_skills',
            'sections': {
                'attention': 'الانتباه والتركيز',
                'memory': 'الذاكرة',
                'problem_solving': 'حل المشكلات'
            },
            'scoring_method': {'type': 'percentage'},
            'questions': []
        },
        {
            'name': 'تقييم المهارات الاجتماعية',
            'description': 'تقييم التفاعل الاجتماعي والتواصل',
            'category': 'social_skills',
            'sections': {
                'communication': 'التواصل',
                'interaction': 'التفاعل الاجتماعي',
                'behavior': 'السلوك'
            },
            'scoring_method': {'type': 'scale_1_10'},
            'questions': []
        }
    ]
    
    templates = []
    for data in templates_data:
        template = AssessmentTemplate(
            name=data['name'],
            description=data['description'],
            category=data['category'],
            sections=data['sections'],
            questions=data['questions'],
            scoring_method=data['scoring_method'],
            is_active=True,
            created_by=1
        )
        db.session.add(template)
        templates.append(template)
    
    db.session.flush()
    return templates

def create_comprehensive_files():
    """إنشاء ملفات شاملة للطلاب"""
    # الحصول على الطلاب الموجودين
    students = Student.query.limit(10).all()
    if not students:
        print("⚠️ لا توجد طلاب في النظام، سيتم إنشاء ملفات تجريبية")
        return []
    
    files = []
    for i, student in enumerate(students):
        file_data = {
            'student_id': student.id,
            'file_number': f'CF-{2024}-{str(i+1).zfill(4)}',
            'personal_info': {
                'full_name': student.name,
                'birth_date': '2010-01-15',
                'gender': 'male' if i % 2 == 0 else 'female',
                'nationality': 'سعودي',
                'id_number': f'1234567890{i}'
            },
            'medical_info': {
                'diagnosis': 'اضطراب طيف التوحد' if i % 3 == 0 else 'تأخر في النمو',
                'medications': ['دواء تجريبي 1', 'دواء تجريبي 2'],
                'allergies': ['حساسية الفول السوداني'] if i % 4 == 0 else [],
                'medical_history': 'تاريخ طبي طبيعي'
            },
            'family_info': {
                'father_name': f'والد الطالب {i+1}',
                'mother_name': f'والدة الطالب {i+1}',
                'contact_phone': f'05{random.randint(10000000, 99999999)}',
                'address': f'الرياض، حي النموذجي، شارع {i+1}'
            },
            'educational_background': {
                'previous_schools': ['مدرسة تجريبية'],
                'current_level': f'الصف {random.randint(1, 6)}',
                'special_needs': True,
                'iep_status': 'active'
            }
        }
        
        comprehensive_file = StudentComprehensiveFile(
            student_id=file_data['student_id'],
            file_number=file_data['file_number'],
            personal_info=file_data['personal_info'],
            medical_history=file_data['medical_info'],
            family_info=file_data['family_info'],
            educational_background=file_data['educational_background'],
            status='active',
            created_by=1
        )
        
        db.session.add(comprehensive_file)
        files.append(comprehensive_file)
    
    db.session.flush()
    return files

def create_assessment_records(templates, files):
    """إنشاء سجلات التقييم"""
    assessments = []
    
    for file in files:
        for template in templates:
            # إنشاء 2-3 تقييمات لكل طالب في كل قالب
            for j in range(random.randint(2, 3)):
                assessment_date = datetime.now() - timedelta(days=random.randint(30, 365))
                
                # نتائج تجريبية
                results = {}
                total_score = 0
                section_count = len(template.sections)
                
                for section_key in template.sections.keys():
                    section_score = random.randint(50, 95)
                    results[section_key] = {
                        'score': section_score,
                        'notes': f'ملاحظات على {template.sections[section_key]}',
                        'recommendations': [f'توصية 1 لـ {section_key}', f'توصية 2 لـ {section_key}']
                    }
                    total_score += section_score
                
                final_score = total_score / section_count if section_count > 0 else 0
                
                assessment = StudentAssessmentRecord(
                    comprehensive_file_id=file.id,
                    template_id=template.id,
                    assessment_date=assessment_date.date(),
                    administrator_id=1,
                    session_number=j + 1,
                    duration_actual=random.randint(30, 90),
                    responses=results,
                    raw_scores={'total': final_score},
                    standard_scores={},
                    percentiles={},
                    interpretation=f'ملاحظات عامة على التقييم رقم {j+1}',
                    recommendations=['توصية عامة 1', 'توصية عامة 2'],
                    testing_conditions={'room': 'A'},
                    behavioral_observations='ملاحظات سلوكية تجريبية',
                    status='completed',
                    is_baseline=(j == 0),
                    ai_analysis_requested=(j % 2 == 0)
                )
                
                db.session.add(assessment)
                assessments.append(assessment)
    
    db.session.flush()
    return assessments

def create_ai_analysis_results(assessments):
    """إنشاء نتائج التحليل بالذكاء الاصطناعي"""
    ai_results = []
    
    analysis_types = ['performance_analysis', 'pattern_detection', 'progress_prediction', 'recommendation_generation']
    
    for assessment in assessments[:20]:  # تحليل أول 20 تقييم
        analysis_type = random.choice(analysis_types)
        
        # نتائج تحليل تجريبية
        analysis_results = {
            'strengths': ['نقطة قوة 1', 'نقطة قوة 2'],
            'weaknesses': ['نقطة ضعف 1', 'نقطة ضعف 2'],
            'patterns': ['نمط 1', 'نمط 2'],
            'predictions': {
                'short_term': 'تحسن متوقع في المدى القصير',
                'long_term': 'تطور إيجابي في المدى الطويل'
            },
            'recommendations': ['توصية ذكية 1', 'توصية ذكية 2']
        }
        
        ai_result = StudentAIAnalysis(
            comprehensive_file_id=assessment.comprehensive_file_id,
            assessment_record_id=assessment.id,
            analysis_type=analysis_type,
            analysis_scope='single_assessment',
            input_data={'assessment': assessment.id},
            findings=analysis_results,
            patterns_identified=analysis_results.get('patterns'),
            risk_factors={},
            protective_factors={},
            predictions=analysis_results.get('predictions'),
            confidence_scores={'overall': round(random.uniform(0.7, 0.95), 2)},
            recommendations=analysis_results.get('recommendations'),
            intervention_suggestions=[],
            ai_model_used='sample-model',
            model_version='v1',
            requires_human_review=True,
            created_by=1
        )
        
        db.session.add(ai_result)
        ai_results.append(ai_result)
    
    db.session.flush()
    return ai_results

def create_export_logs(files):
    """إنشاء سجلات التصدير"""
    export_logs = []

    for i, file in enumerate(files[:5]):
        export_log = FileExportImportLog(
            comprehensive_file_id=file.id,
            operation_type='export',
            export_format=random.choice(['pdf', 'excel', 'json']),
            data_included=['personal_info', 'assessments', 'ai_analysis'],
            file_path=f'/exports/student_{file.id}_export_{i+1}.pdf',
            file_size=random.randint(500000, 2000000),
            access_level='full',
            encryption_used=False,
            password_protected=False,
            status='completed',
            requested_by=1,
            request_date=datetime.utcnow(),
            completion_date=datetime.utcnow(),
            purpose='sample export'
        )
        db.session.add(export_log)
        export_logs.append(export_log)

    db.session.flush()
    return export_logs

def create_print_jobs(files):
    """إنشاء مهام الطباعة"""
    print_jobs = []
    
    for i, file in enumerate(files[:7]):
        print_job = PrintJob(
            comprehensive_file_id=file.id,
            job_name=f'طباعة ملف {file.file_number}',
            document_type=random.choice(['full_file', 'assessment_report', 'progress_report']),
            content_selection=['personal_info', 'assessments'],
            print_settings={'paper_size': 'A4'},
            page_range=None,
            copies=random.randint(1, 3),
            confidentiality_level='standard',
            watermark_text=None,
            requires_authorization=False,
            status=random.choice(['pending', 'processing', 'completed']),
            printer_name=f'طابعة المكتب {random.randint(1, 3)}',
            requested_by=1,
            request_date=datetime.utcnow(),
            completion_date=datetime.utcnow(),
            purpose='عينات'
        )

        db.session.add(print_job)
        print_jobs.append(print_job)
    
    db.session.flush()
    return print_jobs

def print_statistics():
    """طباعة إحصائيات البيانات المضافة"""
    print("\n📊 إحصائيات البيانات المضافة:")
    print(f"   📋 قوالب التقييم: {AssessmentTemplate.query.count()}")
    print(f"   📁 الملفات الشاملة: {StudentComprehensiveFile.query.count()}")
    print(f"   📝 سجلات التقييم: {StudentAssessmentRecord.query.count()}")
    print(f"   🤖 نتائج التحليل الذكي: {StudentAIAnalysis.query.count()}")
    print(f"   📤 سجلات التصدير: {FileExportImportLog.query.filter_by(operation_type='export').count()}")
    print(f"   🖨️ مهام الطباعة: {PrintJob.query.count()}")

if __name__ == '__main__':
    add_sample_data()
