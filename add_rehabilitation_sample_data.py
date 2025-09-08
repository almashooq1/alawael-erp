#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام برامج تأهيل ذوي الاحتياجات الخاصة
Add Sample Data for Rehabilitation Programs System
"""

import os
import sys
from datetime import datetime, date, timedelta
import random

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import db, User
from rehabilitation_programs_models import (
    RehabilitationBeneficiary, RehabilitationProgram, BeneficiaryProgram,
    TherapySession, ProgressAssessment, Therapist, Equipment, EducationalResource,
    DisabilityType, ProgramType, SessionStatus, ProgressLevel
)

def add_rehabilitation_sample_data():
    """إضافة بيانات تجريبية شاملة لنظام برامج التأهيل"""
    
    print("🏥 بدء إضافة البيانات التجريبية لنظام برامج التأهيل...")
    
    try:
        # 1. إضافة المستفيدين
        print("👥 إضافة المستفيدين...")
        beneficiaries_data = [
            {
                'first_name': 'أحمد', 'last_name': 'محمد علي',
                'date_of_birth': date(2015, 3, 15), 'gender': 'male',
                'disability_type': DisabilityType.AUTISM,
                'disability_description': 'اضطراب طيف التوحد مع تأخر في النطق',
                'disability_degree': 'moderate',
                'phone': '0501234567', 'guardian_name': 'محمد علي أحمد',
                'guardian_relationship': 'والد', 'guardian_phone': '0501234568'
            },
            {
                'first_name': 'فاطمة', 'last_name': 'عبدالله سالم',
                'date_of_birth': date(2012, 8, 22), 'gender': 'female',
                'disability_type': DisabilityType.PHYSICAL,
                'disability_description': 'شلل دماغي يؤثر على الحركة',
                'disability_degree': 'severe',
                'phone': '0509876543', 'guardian_name': 'عبدالله سالم',
                'guardian_relationship': 'والد', 'guardian_phone': '0509876544'
            },
            {
                'first_name': 'خالد', 'last_name': 'سعد الدين',
                'date_of_birth': date(2018, 1, 10), 'gender': 'male',
                'disability_type': DisabilityType.SPEECH,
                'disability_description': 'تأخر في النطق وصعوبات في التواصل',
                'disability_degree': 'mild',
                'phone': '0555555555', 'guardian_name': 'سعد الدين خالد',
                'guardian_relationship': 'والد', 'guardian_phone': '0555555556'
            },
            {
                'first_name': 'مريم', 'last_name': 'أحمد حسن',
                'date_of_birth': date(2014, 11, 5), 'gender': 'female',
                'disability_type': DisabilityType.INTELLECTUAL,
                'disability_description': 'إعاقة ذهنية بسيطة مع صعوبات تعلم',
                'disability_degree': 'mild',
                'phone': '0544444444', 'guardian_name': 'أحمد حسن',
                'guardian_relationship': 'والد', 'guardian_phone': '0544444445'
            },
            {
                'first_name': 'عبدالرحمن', 'last_name': 'يوسف محمد',
                'date_of_birth': date(2016, 6, 18), 'gender': 'male',
                'disability_type': DisabilityType.SENSORY,
                'disability_description': 'ضعف سمع شديد',
                'disability_degree': 'severe',
                'phone': '0533333333', 'guardian_name': 'يوسف محمد',
                'guardian_relationship': 'والد', 'guardian_phone': '0533333334'
            }
        ]
        
        beneficiaries = []
        for i, data in enumerate(beneficiaries_data, 1):
            beneficiary = RehabilitationBeneficiary(
                beneficiary_number=f"RB{i:06d}",
                **data,
                registration_date=date.today() - timedelta(days=random.randint(30, 365)),
                created_by=1
            )
            beneficiaries.append(beneficiary)
            db.session.add(beneficiary)
        
        db.session.commit()
        print(f"✅ تم إضافة {len(beneficiaries)} مستفيد")
        
        # 2. إضافة برامج التأهيل
        print("📋 إضافة برامج التأهيل...")
        programs_data = [
            {
                'program_code': 'PHY001',
                'name': 'برنامج العلاج الطبيعي الشامل',
                'description': 'برنامج متكامل للعلاج الطبيعي يهدف إلى تحسين الحركة والتوازن',
                'program_type': ProgramType.PHYSICAL_THERAPY,
                'target_disability_types': ['physical'],
                'age_group_min': 3, 'age_group_max': 18,
                'duration_weeks': 12, 'sessions_per_week': 3,
                'session_duration_minutes': 45,
                'objectives': [
                    'تحسين القوة العضلية',
                    'تطوير التوازن والتناسق',
                    'زيادة مدى الحركة'
                ],
                'activities': [
                    'تمارين القوة',
                    'تمارين التوازن',
                    'العلاج بالحركة'
                ],
                'cost_per_session': 150.0
            },
            {
                'program_code': 'SPE001',
                'name': 'برنامج علاج النطق والتخاطب',
                'description': 'برنامج متخصص لعلاج اضطرابات النطق والتواصل',
                'program_type': ProgramType.SPEECH_THERAPY,
                'target_disability_types': ['speech', 'autism'],
                'age_group_min': 2, 'age_group_max': 16,
                'duration_weeks': 16, 'sessions_per_week': 2,
                'session_duration_minutes': 30,
                'objectives': [
                    'تحسين وضوح النطق',
                    'تطوير مهارات التواصل',
                    'زيادة المفردات'
                ],
                'activities': [
                    'تمارين النطق',
                    'ألعاب التواصل',
                    'التدريب السمعي'
                ],
                'cost_per_session': 120.0
            },
            {
                'program_code': 'BEH001',
                'name': 'برنامج التدخل السلوكي المبكر',
                'description': 'برنامج متخصص للأطفال ذوي اضطراب طيف التوحد',
                'program_type': ProgramType.BEHAVIORAL_THERAPY,
                'target_disability_types': ['autism'],
                'age_group_min': 2, 'age_group_max': 12,
                'duration_weeks': 20, 'sessions_per_week': 4,
                'session_duration_minutes': 60,
                'objectives': [
                    'تقليل السلوكيات التحدية',
                    'تطوير المهارات الاجتماعية',
                    'تحسين التواصل'
                ],
                'activities': [
                    'تحليل السلوك التطبيقي',
                    'التدريب على المهارات الاجتماعية',
                    'برامج التعزيز'
                ],
                'cost_per_session': 200.0
            },
            {
                'program_code': 'EDU001',
                'name': 'برنامج التعليم الخاص',
                'description': 'برنامج تعليمي مصمم للأطفال ذوي الإعاقة الذهنية',
                'program_type': ProgramType.EDUCATIONAL,
                'target_disability_types': ['intellectual', 'learning'],
                'age_group_min': 4, 'age_group_max': 18,
                'duration_weeks': 24, 'sessions_per_week': 5,
                'session_duration_minutes': 90,
                'objectives': [
                    'تطوير المهارات الأكاديمية الأساسية',
                    'تحسين مهارات الحياة اليومية',
                    'زيادة الاستقلالية'
                ],
                'activities': [
                    'التعلم التفاعلي',
                    'الأنشطة الحسية',
                    'التدريب على المهارات الحياتية'
                ],
                'cost_per_session': 100.0
            },
            {
                'program_code': 'OCC001',
                'name': 'برنامج العلاج الوظيفي',
                'description': 'برنامج لتطوير المهارات الحركية الدقيقة والحياتية',
                'program_type': ProgramType.OCCUPATIONAL_THERAPY,
                'target_disability_types': ['physical', 'intellectual'],
                'age_group_min': 3, 'age_group_max': 16,
                'duration_weeks': 14, 'sessions_per_week': 2,
                'session_duration_minutes': 45,
                'objectives': [
                    'تطوير المهارات الحركية الدقيقة',
                    'تحسين التناسق البصري الحركي',
                    'زيادة الاستقلالية في الأنشطة اليومية'
                ],
                'activities': [
                    'تمارين المهارات الحركية الدقيقة',
                    'أنشطة الحياة اليومية',
                    'العلاج الحسي'
                ],
                'cost_per_session': 130.0
            }
        ]
        
        programs = []
        for data in programs_data:
            program = RehabilitationProgram(**data, created_by=1)
            programs.append(program)
            db.session.add(program)
        
        db.session.commit()
        print(f"✅ تم إضافة {len(programs)} برنامج تأهيل")
        
        # 3. تسجيل المستفيدين في البرامج
        print("📝 تسجيل المستفيدين في البرامج...")
        enrollments = []
        
        # أحمد - برنامج التدخل السلوكي وعلاج النطق
        enrollment1 = BeneficiaryProgram(
            beneficiary_id=1, program_id=3,  # أحمد - التدخل السلوكي
            enrollment_date=date.today() - timedelta(days=60),
            start_date=date.today() - timedelta(days=50),
            individual_goals=['تحسين التواصل البصري', 'تقليل نوبات الغضب'],
            assigned_therapist_id=1,
            created_by=1
        )
        enrollments.append(enrollment1)
        
        enrollment2 = BeneficiaryProgram(
            beneficiary_id=1, program_id=2,  # أحمد - علاج النطق
            enrollment_date=date.today() - timedelta(days=45),
            start_date=date.today() - timedelta(days=35),
            individual_goals=['زيادة المفردات', 'تحسين النطق'],
            assigned_therapist_id=1,
            created_by=1
        )
        enrollments.append(enrollment2)
        
        # فاطمة - العلاج الطبيعي والوظيفي
        enrollment3 = BeneficiaryProgram(
            beneficiary_id=2, program_id=1,  # فاطمة - العلاج الطبيعي
            enrollment_date=date.today() - timedelta(days=90),
            start_date=date.today() - timedelta(days=80),
            individual_goals=['تحسين القوة العضلية', 'زيادة مدى الحركة'],
            assigned_therapist_id=1,
            created_by=1
        )
        enrollments.append(enrollment3)
        
        # خالد - علاج النطق
        enrollment4 = BeneficiaryProgram(
            beneficiary_id=3, program_id=2,  # خالد - علاج النطق
            enrollment_date=date.today() - timedelta(days=30),
            start_date=date.today() - timedelta(days=20),
            individual_goals=['تحسين وضوح النطق', 'زيادة الثقة في التواصل'],
            assigned_therapist_id=1,
            created_by=1
        )
        enrollments.append(enrollment4)
        
        # مريم - التعليم الخاص
        enrollment5 = BeneficiaryProgram(
            beneficiary_id=4, program_id=4,  # مريم - التعليم الخاص
            enrollment_date=date.today() - timedelta(days=40),
            start_date=date.today() - timedelta(days=30),
            individual_goals=['تعلم الأرقام والحروف', 'تطوير مهارات الحياة اليومية'],
            assigned_therapist_id=1,
            created_by=1
        )
        enrollments.append(enrollment5)
        
        for enrollment in enrollments:
            db.session.add(enrollment)
        
        db.session.commit()
        print(f"✅ تم تسجيل {len(enrollments)} التحاق في البرامج")
        
        # 4. إضافة جلسات علاجية
        print("🗓️ إضافة الجلسات العلاجية...")
        sessions = []
        
        # إنشاء جلسات للأسبوعين الماضيين والقادمين
        for enrollment in enrollments:
            program = next(p for p in programs if p.id == enrollment.program_id)
            
            # جلسات الأسبوع الماضي (مكتملة)
            for week in range(2):
                for session_num in range(program.sessions_per_week):
                    session_date = datetime.now() - timedelta(weeks=week, days=session_num)
                    session = TherapySession(
                        session_number=f"S{enrollment.id:03d}{week:02d}{session_num:02d}",
                        beneficiary_id=enrollment.beneficiary_id,
                        program_id=enrollment.program_id,
                        beneficiary_program_id=enrollment.id,
                        scheduled_date=session_date,
                        actual_start_time=session_date,
                        actual_end_time=session_date + timedelta(minutes=program.session_duration_minutes),
                        duration_minutes=program.session_duration_minutes,
                        therapist_id=1,
                        status=SessionStatus.COMPLETED,
                        performance_rating=random.choice(list(ProgressLevel)),
                        therapist_notes=f"جلسة جيدة، تفاعل المستفيد كان {random.choice(['ممتاز', 'جيد', 'مقبول'])}",
                        created_by=1
                    )
                    sessions.append(session)
        
        # جلسات الأسبوع القادم (مجدولة)
        for enrollment in enrollments:
            program = next(p for p in programs if p.id == enrollment.program_id)
            for session_num in range(program.sessions_per_week):
                session_date = datetime.now() + timedelta(days=session_num + 1)
                session = TherapySession(
                    session_number=f"S{enrollment.id:03d}FU{session_num:02d}",
                    beneficiary_id=enrollment.beneficiary_id,
                    program_id=enrollment.program_id,
                    beneficiary_program_id=enrollment.id,
                    scheduled_date=session_date,
                    therapist_id=1,
                    status=SessionStatus.SCHEDULED,
                    created_by=1
                )
                sessions.append(session)
        
        for session in sessions:
            db.session.add(session)
        
        db.session.commit()
        print(f"✅ تم إضافة {len(sessions)} جلسة علاجية")
        
        # 5. إضافة معدات التأهيل
        print("🔧 إضافة معدات التأهيل...")
        equipment_data = [
            {
                'equipment_code': 'PT001',
                'name': 'جهاز المشي الكهربائي',
                'description': 'جهاز مشي كهربائي مخصص للعلاج الطبيعي',
                'category': 'أجهزة العلاج الطبيعي',
                'manufacturer': 'HUR',
                'condition': 'excellent',
                'location': 'قسم العلاج الطبيعي',
                'purchase_cost': 25000.0
            },
            {
                'equipment_code': 'ST001',
                'name': 'جهاز تدريب النطق',
                'description': 'جهاز إلكتروني لتدريب النطق والتخاطب',
                'category': 'أجهزة علاج النطق',
                'manufacturer': 'Speech Easy',
                'condition': 'good',
                'location': 'قسم علاج النطق',
                'purchase_cost': 8000.0
            },
            {
                'equipment_code': 'OT001',
                'name': 'طاولة العلاج الوظيفي',
                'description': 'طاولة قابلة للتعديل للعلاج الوظيفي',
                'category': 'أثاث العلاج الوظيفي',
                'manufacturer': 'Therapy Tables Inc',
                'condition': 'excellent',
                'location': 'قسم العلاج الوظيفي',
                'purchase_cost': 3500.0
            }
        ]
        
        equipment_list = []
        for data in equipment_data:
            equipment = Equipment(
                **data,
                purchase_date=date.today() - timedelta(days=random.randint(30, 730)),
                created_by=1
            )
            equipment_list.append(equipment)
            db.session.add(equipment)
        
        db.session.commit()
        print(f"✅ تم إضافة {len(equipment_list)} معدة")
        
        # 6. إضافة موارد تعليمية
        print("📚 إضافة الموارد التعليمية...")
        resources_data = [
            {
                'resource_code': 'VID001',
                'title': 'فيديو تعليمي: تمارين النطق الأساسية',
                'description': 'مجموعة من التمارين الأساسية لتحسين النطق',
                'resource_type': 'video',
                'target_disability_types': ['speech'],
                'target_age_group': '3-12 سنة',
                'difficulty_level': 'beginner',
                'language': 'ar'
            },
            {
                'resource_code': 'APP001',
                'title': 'تطبيق تعليمي: مهارات الحياة اليومية',
                'description': 'تطبيق تفاعلي لتعليم مهارات الحياة اليومية',
                'resource_type': 'app',
                'target_disability_types': ['intellectual'],
                'target_age_group': '6-16 سنة',
                'difficulty_level': 'intermediate',
                'language': 'ar'
            },
            {
                'resource_code': 'DOC001',
                'title': 'دليل الأنشطة الحسية',
                'description': 'دليل شامل للأنشطة الحسية للأطفال ذوي التوحد',
                'resource_type': 'document',
                'target_disability_types': ['autism'],
                'target_age_group': '2-10 سنوات',
                'difficulty_level': 'beginner',
                'language': 'ar'
            }
        ]
        
        resources = []
        for data in resources_data:
            resource = EducationalResource(**data, created_by=1)
            resources.append(resource)
            db.session.add(resource)
        
        db.session.commit()
        print(f"✅ تم إضافة {len(resources)} مورد تعليمي")
        
        print("\n🎉 تم إضافة جميع البيانات التجريبية بنجاح!")
        print("=" * 50)
        print("📊 ملخص البيانات المضافة:")
        print(f"👥 المستفيدون: {len(beneficiaries)}")
        print(f"📋 البرامج: {len(programs)}")
        print(f"📝 التسجيلات: {len(enrollments)}")
        print(f"🗓️ الجلسات: {len(sessions)}")
        print(f"🔧 المعدات: {len(equipment_list)}")
        print(f"📚 الموارد التعليمية: {len(resources)}")
        
        return True
        
    except Exception as e:
        print(f"❌ خطأ في إضافة البيانات التجريبية: {e}")
        db.session.rollback()
        return False

if __name__ == "__main__":
    from app import app
    
    with app.app_context():
        success = add_rehabilitation_sample_data()
        if success:
            print("\n✅ تم إكمال إضافة البيانات التجريبية بنجاح!")
        else:
            print("\n❌ فشل في إضافة البيانات التجريبية!")
