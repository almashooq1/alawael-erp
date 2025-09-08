#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Sample data script for Rehabilitation Reports System
This script adds sample data to test the reports and analytics functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import User
from rehabilitation_programs_models import (
    RehabilitationBeneficiary, RehabilitationProgram, BeneficiaryProgram,
    TherapySession, ProgressAssessment, Therapist, Equipment, EducationalResource,
    DisabilityType, ProgramType, SessionStatus, ProgressLevel
)
from datetime import datetime, date, timedelta
import random

def create_sample_reports_data():
    """Create comprehensive sample data for rehabilitation reports"""
    
    with app.app_context():
        try:
            print("🔄 إنشاء بيانات تجريبية لنظام التقارير التأهيلية...")
            
            # Get existing admin user
            admin_user = User.query.filter_by(username='admin').first()
            if not admin_user:
                print("⚠️ لم يتم العثور على مستخدم admin")
                return False
            
            # Create additional beneficiaries for reports
            beneficiaries_data = [
                {
                    'beneficiary_number': 'BEN-2024-006',
                    'first_name': 'سارة',
                    'last_name': 'أحمد محمد',
                    'date_of_birth': date(2018, 3, 15),
                    'gender': 'أنثى',
                    'disability_type': DisabilityType.AUTISM,
                    'disability_description': 'اضطراب طيف التوحد مع تأخر في النطق',
                    'phone': '0501234567',
                    'guardian_name': 'أحمد محمد علي',
                    'guardian_phone': '0501234567',
                    'address': 'الرياض - حي النرجس',
                    'created_by': admin_user.id
                },
                {
                    'beneficiary_number': 'BEN-2024-007',
                    'first_name': 'عبدالله',
                    'last_name': 'سالم الغامدي',
                    'date_of_birth': date(2016, 8, 22),
                    'gender': 'ذكر',
                    'disability_type': DisabilityType.LEARNING,
                    'disability_description': 'صعوبات تعلم في القراءة والكتابة',
                    'phone': '0509876543',
                    'guardian_name': 'سالم الغامدي',
                    'guardian_phone': '0509876543',
                    'address': 'جدة - حي الصفا',
                    'created_by': admin_user.id
                },
                {
                    'beneficiary_number': 'BEN-2024-008',
                    'first_name': 'فاطمة',
                    'last_name': 'عبدالرحمن القحطاني',
                    'date_of_birth': date(2019, 12, 5),
                    'gender': 'أنثى',
                    'disability_type': DisabilityType.SENSORY,
                    'disability_description': 'ضعف سمع متوسط',
                    'phone': '0555123456',
                    'guardian_name': 'عبدالرحمن القحطاني',
                    'guardian_phone': '0555123456',
                    'address': 'الدمام - حي الشاطئ',
                    'created_by': admin_user.id
                }
            ]
            
            created_beneficiaries = []
            for ben_data in beneficiaries_data:
                existing = RehabilitationBeneficiary.query.filter_by(
                    beneficiary_number=ben_data['beneficiary_number']
                ).first()
                
                if not existing:
                    beneficiary = RehabilitationBeneficiary(**ben_data)
                    db.session.add(beneficiary)
                    created_beneficiaries.append(beneficiary)
            
            db.session.commit()
            print(f"✅ تم إنشاء {len(created_beneficiaries)} مستفيد جديد")
            
            # Create additional programs for variety
            programs_data = [
                {
                    'program_code': 'PROG-006',
                    'name': 'برنامج التأهيل المعرفي',
                    'program_type': ProgramType.COGNITIVE,
                    'target_disability_types': ['intellectual', 'learning'],
                    'age_group_min': 6,
                    'age_group_max': 18,
                    'duration_weeks': 20,
                    'sessions_per_week': 2,
                    'session_duration_minutes': 45,
                    'objectives': ['تحسين الذاكرة', 'تطوير التركيز', 'تعزيز مهارات حل المشكلات'],
                    'activities': ['ألعاب الذاكرة', 'تمارين التركيز', 'أنشطة حل المشكلات'],
                    'required_specialists': ['أخصائي نفسي', 'أخصائي تربوي'],
                    'max_participants': 6,
                    'cost_per_session': 150.0,
                    'created_by': admin_user.id
                },
                {
                    'program_code': 'PROG-007',
                    'name': 'برنامج التدريب على المهارات الحياتية',
                    'program_type': ProgramType.SOCIAL,
                    'target_disability_types': ['autism', 'intellectual'],
                    'age_group_min': 8,
                    'age_group_max': 25,
                    'duration_weeks': 16,
                    'sessions_per_week': 3,
                    'session_duration_minutes': 60,
                    'objectives': ['تطوير مهارات العناية بالذات', 'تحسين التفاعل الاجتماعي'],
                    'activities': ['تدريب على النظافة الشخصية', 'أنشطة اجتماعية جماعية'],
                    'required_specialists': ['أخصائي اجتماعي', 'مدرب مهارات حياتية'],
                    'max_participants': 8,
                    'cost_per_session': 120.0,
                    'created_by': admin_user.id
                }
            ]
            
            created_programs = []
            for prog_data in programs_data:
                existing = RehabilitationProgram.query.filter_by(
                    program_code=prog_data['program_code']
                ).first()
                
                if not existing:
                    program = RehabilitationProgram(**prog_data)
                    db.session.add(program)
                    created_programs.append(program)
            
            db.session.commit()
            print(f"✅ تم إنشاء {len(created_programs)} برنامج جديد")
            
            # Create beneficiary program enrollments
            all_beneficiaries = RehabilitationBeneficiary.query.all()
            all_programs = RehabilitationProgram.query.all()
            
            enrollments_created = 0
            for beneficiary in all_beneficiaries[:10]:  # Limit to first 10
                # Enroll each beneficiary in 1-2 programs
                num_programs = random.randint(1, 2)
                selected_programs = random.sample(all_programs, min(num_programs, len(all_programs)))
                
                for program in selected_programs:
                    existing_enrollment = BeneficiaryProgram.query.filter_by(
                        beneficiary_id=beneficiary.id,
                        program_id=program.id
                    ).first()
                    
                    if not existing_enrollment:
                        enrollment_date = date.today() - timedelta(days=random.randint(30, 180))
                        start_date = enrollment_date + timedelta(days=random.randint(1, 14))
                        
                        enrollment = BeneficiaryProgram(
                            beneficiary_id=beneficiary.id,
                            program_id=program.id,
                            enrollment_date=enrollment_date,
                            start_date=start_date,
                            expected_completion_date=start_date + timedelta(weeks=program.duration_weeks),
                            status=random.choice(['active', 'completed', 'on_hold']),
                            completion_percentage=random.randint(20, 95),
                            individual_goals=['هدف فردي 1', 'هدف فردي 2'],
                            assigned_therapist_id=admin_user.id,
                            created_by=admin_user.id
                        )
                        db.session.add(enrollment)
                        enrollments_created += 1
            
            db.session.commit()
            print(f"✅ تم إنشاء {enrollments_created} تسجيل في البرامج")
            
            # Create therapy sessions for enrolled beneficiaries
            enrollments = BeneficiaryProgram.query.all()
            sessions_created = 0
            
            for enrollment in enrollments[:15]:  # Limit to first 15
                # Create 5-10 sessions per enrollment
                num_sessions = random.randint(5, 10)
                
                for i in range(num_sessions):
                    session_date = enrollment.start_date + timedelta(days=i*7)  # Weekly sessions
                    
                    session = TherapySession(
                        session_number=f"SES-{enrollment.id}-{i+1:03d}",
                        beneficiary_id=enrollment.beneficiary_id,
                        program_id=enrollment.program_id,
                        beneficiary_program_id=enrollment.id,
                        scheduled_date=datetime.combine(session_date, datetime.min.time().replace(hour=10)),
                        actual_start_time=datetime.combine(session_date, datetime.min.time().replace(hour=10)),
                        actual_end_time=datetime.combine(session_date, datetime.min.time().replace(hour=11)),
                        duration_minutes=60,
                        therapist_id=admin_user.id,
                        status=random.choice([SessionStatus.COMPLETED, SessionStatus.SCHEDULED]),
                        attendance_status=random.choice(['حضر', 'غاب', 'تأخر']),
                        session_objectives=['تحقيق الهدف 1', 'تحقيق الهدف 2'],
                        activities_performed=['نشاط 1', 'نشاط 2'],
                        performance_rating=random.choice(list(ProgressLevel)),
                        therapist_notes=f'ملاحظات الجلسة رقم {i+1}',
                        created_by=admin_user.id
                    )
                    db.session.add(session)
                    sessions_created += 1
            
            db.session.commit()
            print(f"✅ تم إنشاء {sessions_created} جلسة علاجية")
            
            # Create progress assessments
            assessments_created = 0
            for enrollment in enrollments[:10]:
                # Create 2-3 assessments per enrollment
                num_assessments = random.randint(2, 3)
                
                for i in range(num_assessments):
                    assessment_date = enrollment.start_date + timedelta(days=i*30)  # Monthly assessments
                    
                    assessment = ProgressAssessment(
                        beneficiary_id=enrollment.beneficiary_id,
                        program_id=enrollment.program_id,
                        assessment_date=assessment_date,
                        assessor_id=admin_user.id,
                        assessment_type='تقييم شهري',
                        motor_skills_score=random.randint(60, 95),
                        cognitive_skills_score=random.randint(65, 90),
                        communication_skills_score=random.randint(70, 95),
                        social_skills_score=random.randint(60, 85),
                        behavioral_skills_score=random.randint(65, 90),
                        self_care_skills_score=random.randint(70, 95),
                        overall_progress_level=random.choice(list(ProgressLevel)),
                        strengths=['نقطة قوة 1', 'نقطة قوة 2'],
                        areas_for_improvement=['مجال للتحسين 1', 'مجال للتحسين 2'],
                        recommendations=['توصية 1', 'توصية 2'],
                        next_assessment_date=assessment_date + timedelta(days=30),
                        created_by=admin_user.id
                    )
                    db.session.add(assessment)
                    assessments_created += 1
            
            db.session.commit()
            print(f"✅ تم إنشاء {assessments_created} تقييم تقدم")
            
            print("✅ تم إنشاء جميع البيانات التجريبية لنظام التقارير بنجاح!")
            return True
            
        except Exception as e:
            print(f"❌ خطأ في إنشاء البيانات التجريبية: {str(e)}")
            db.session.rollback()
            return False

if __name__ == "__main__":
    success = create_sample_reports_data()
    if success:
        print("\n🎉 تم إكمال إنشاء البيانات التجريبية لنظام التقارير التأهيلية!")
        print("يمكنك الآن اختبار جميع ميزات التقارير والتحليلات")
    else:
        print("\n❌ فشل في إنشاء البيانات التجريبية")
        sys.exit(1)
