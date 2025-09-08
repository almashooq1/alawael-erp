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
from decimal import Decimal

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import User, Student
from student_comprehensive_models import (
    ComprehensiveStudentFile, AssessmentTemplate, AssessmentRecord,
    AIAnalysisResult, FileExportLog, FileImportLog, PrintJob
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
            export_logs, import_logs = create_export_import_logs(files)
            print(f"✅ تم إنشاء {len(export_logs)} سجل تصدير و {len(import_logs)} سجل استيراد")
            
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
            'scoring_method': 'scale_1_5',
            'max_score': 100,
            'passing_score': 70
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
            'scoring_method': 'percentage',
            'max_score': 100,
            'passing_score': 65
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
            'scoring_method': 'scale_1_10',
            'max_score': 100,
            'passing_score': 60
        }
    ]
    
    templates = []
    for data in templates_data:
        template = AssessmentTemplate(
            name=data['name'],
            description=data['description'],
            category=data['category'],
            sections=data['sections'],
            scoring_method=data['scoring_method'],
            max_score=data['max_score'],
            passing_score=data['passing_score'],
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
        
        comprehensive_file = ComprehensiveStudentFile(
            student_id=file_data['student_id'],
            file_number=file_data['file_number'],
            personal_info=file_data['personal_info'],
            medical_info=file_data['medical_info'],
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
                
                assessment = AssessmentRecord(
                    comprehensive_file_id=file.id,
                    template_id=template.id,
                    assessment_date=assessment_date,
                    assessor_name=f'المقيم {random.randint(1, 5)}',
                    results=results,
                    total_score=Decimal(str(round(final_score, 2))),
                    notes=f'ملاحظات عامة على التقييم رقم {j+1}',
                    recommendations=['توصية عامة 1', 'توصية عامة 2'],
                    status='completed',
                    created_by=1
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
        
        ai_result = AIAnalysisResult(
            assessment_record_id=assessment.id,
            analysis_type=analysis_type,
            analysis_results=analysis_results,
            confidence_score=Decimal(str(random.uniform(0.7, 0.95))),
            insights=['رؤية 1', 'رؤية 2'],
            recommendations=['توصية AI 1', 'توصية AI 2'],
            status='completed',
            created_by=1
        )
        
        db.session.add(ai_result)
        ai_results.append(ai_result)
    
    db.session.flush()
    return ai_results

def create_export_import_logs(files):
    """إنشاء سجلات التصدير والاستيراد"""
    export_logs = []
    import_logs = []
    
    # سجلات التصدير
    for i, file in enumerate(files[:5]):
        export_log = FileExportLog(
            comprehensive_file_id=file.id,
            export_format=random.choice(['pdf', 'excel', 'json']),
            sections_included=['personal_info', 'assessments', 'ai_analysis'],
            file_path=f'/exports/student_{file.id}_export_{i+1}.pdf',
            file_size=random.randint(500000, 2000000),
            status='completed',
            exported_by=1
        )
        db.session.add(export_log)
        export_logs.append(export_log)
    
    # سجلات الاستيراد
    for i in range(3):
        import_log = FileImportLog(
            source_file_path=f'/imports/import_file_{i+1}.json',
            import_type=random.choice(['new_file', 'update_existing', 'merge_data']),
            records_processed=random.randint(5, 20),
            records_successful=random.randint(4, 18),
            records_failed=random.randint(0, 2),
            validation_errors={'errors': ['خطأ تجريبي 1', 'خطأ تجريبي 2']},
            status='completed',
            imported_by=1
        )
        db.session.add(import_log)
        import_logs.append(import_log)
    
    db.session.flush()
    return export_logs, import_logs

def create_print_jobs(files):
    """إنشاء مهام الطباعة"""
    print_jobs = []
    
    for i, file in enumerate(files[:7]):
        print_job = PrintJob(
            comprehensive_file_id=file.id,
            print_type=random.choice(['full_file', 'assessments_only', 'summary_report']),
            sections_to_print=['personal_info', 'assessments'],
            printer_name=f'طابعة المكتب {random.randint(1, 3)}',
            copies_count=random.randint(1, 3),
            paper_size='A4',
            is_confidential=random.choice([True, False]),
            status=random.choice(['pending', 'printing', 'completed']),
            created_by=1
        )
        
        if print_job.status == 'completed':
            print_job.completed_at = datetime.now() - timedelta(hours=random.randint(1, 48))
        
        db.session.add(print_job)
        print_jobs.append(print_job)
    
    db.session.flush()
    return print_jobs

def print_statistics():
    """طباعة إحصائيات البيانات المضافة"""
    print("\n📊 إحصائيات البيانات المضافة:")
    print(f"   📋 قوالب التقييم: {AssessmentTemplate.query.count()}")
    print(f"   📁 الملفات الشاملة: {ComprehensiveStudentFile.query.count()}")
    print(f"   📝 سجلات التقييم: {AssessmentRecord.query.count()}")
    print(f"   🤖 نتائج التحليل الذكي: {AIAnalysisResult.query.count()}")
    print(f"   📤 سجلات التصدير: {FileExportLog.query.count()}")
    print(f"   📥 سجلات الاستيراد: {FileImportLog.query.count()}")
    print(f"   🖨️ مهام الطباعة: {PrintJob.query.count()}")

if __name__ == '__main__':
    add_sample_data()
