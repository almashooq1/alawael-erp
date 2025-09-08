#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام برامج تأهيل ذوي الاحتياجات الخاصة
Add Sample Data for Rehabilitation Programs System
"""

from datetime import datetime, date, timedelta
from models import db, User
from rehabilitation_programs_models import (
    RehabilitationBeneficiary, RehabilitationProgram, BeneficiaryProgram,
    TherapySession, ProgressAssessment, Therapist, Equipment, EducationalResource,
    DisabilityType, ProgramType, SessionStatus, ProgressLevel
)
import random

def add_rehabilitation_programs_sample_data():
    """إضافة بيانات تجريبية شاملة لنظام برامج التأهيل"""
    
    print("🏥 إضافة بيانات تجريبية لنظام برامج التأهيل...")
    
    try:
        # الحصول على مستخدم أدمن
        admin_user = User.query.filter_by(role='admin').first()
        if not admin_user:
            print("❌ لم يتم العثور على مستخدم أدمن")
            return False
        
        # 1. إضافة المستفيدين
        beneficiaries_data = [
            {
                'first_name': 'أحمد',
                'last_name': 'محمد علي',
                'date_of_birth': date(2015, 3, 15),
                'gender': 'male',
                'national_id': '1234567890',
                'disability_type': DisabilityType.AUTISM,
                'disability_description': 'طيف التوحد مع تأخر في النطق والتفاعل الاجتماعي',
                'disability_degree': 'moderate',
                'phone': '0501234567',
                'email': 'ahmed.family@email.com',
                'address': 'الرياض، حي النرجس',
                'guardian_name': 'محمد علي أحمد',
                'guardian_relationship': 'والد',
                'guardian_phone': '0501234567'
            },
            {
                'first_name': 'فاطمة',
                'last_name': 'عبدالله السالم',
                'date_of_birth': date(2012, 8, 22),
                'gender': 'female',
                'national_id': '2345678901',
                'disability_type': DisabilityType.INTELLECTUAL,
                'disability_description': 'إعاقة ذهنية بسيطة مع صعوبات في التعلم',
                'disability_degree': 'mild',
                'phone': '0502345678',
                'email': 'fatima.family@email.com',
                'address': 'جدة، حي الصفا',
                'guardian_name': 'عبدالله السالم',
                'guardian_relationship': 'والد',
                'guardian_phone': '0502345678'
            },
            {
                'first_name': 'خالد',
                'last_name': 'سعد المطيري',
                'date_of_birth': date(2010, 12, 5),
                'gender': 'male',
                'national_id': '3456789012',
                'disability_type': DisabilityType.PHYSICAL,
                'disability_description': 'شلل دماغي يؤثر على الحركة والتوازن',
                'disability_degree': 'severe',
                'phone': '0503456789',
                'email': 'khalid.family@email.com',
                'address': 'الدمام، حي الفيصلية',
                'guardian_name': 'سعد المطيري',
                'guardian_relationship': 'والد',
                'guardian_phone': '0503456789'
            },
            {
                'first_name': 'نورا',
                'last_name': 'عمر الزهراني',
                'date_of_birth': date(2014, 6, 18),
                'gender': 'female',
                'national_id': '4567890123',
                'disability_type': DisabilityType.SPEECH,
                'disability_description': 'تأخر في النطق وصعوبات في التواصل اللفظي',
                'disability_degree': 'moderate',
                'phone': '0504567890',
                'email': 'nora.family@email.com',
                'address': 'مكة المكرمة، حي العزيزية',
                'guardian_name': 'عمر الزهراني',
                'guardian_relationship': 'والد',
                'guardian_phone': '0504567890'
            },
            {
                'first_name': 'يوسف',
                'last_name': 'حسن القحطاني',
                'date_of_birth': date(2013, 9, 30),
                'gender': 'male',
                'national_id': '5678901234',
                'disability_type': DisabilityType.SENSORY,
                'disability_description': 'ضعف في السمع يتطلب استخدام المعينات السمعية',
                'disability_degree': 'moderate',
                'phone': '0505678901',
                'email': 'youssef.family@email.com',
                'address': 'المدينة المنورة، حي قباء',
                'guardian_name': 'حسن القحطاني',
                'guardian_relationship': 'والد',
                'guardian_phone': '0505678901'
            }
        ]
        
        beneficiaries = []
        for i, data in enumerate(beneficiaries_data, 1):
            beneficiary = RehabilitationBeneficiary(
                beneficiary_number=f"RB{i:06d}",
                created_by=admin_user.id,
                **data
            )
            beneficiaries.append(beneficiary)
            db.session.add(beneficiary)
        
        # 2. إضافة برامج التأهيل
        programs_data = [
            {
                'name': 'برنامج العلاج الطبيعي المكثف',
                'description': 'برنامج شامل للعلاج الطبيعي يهدف إلى تحسين الحركة والتوازن',
                'program_type': ProgramType.PHYSICAL_THERAPY,
                'target_disability_types': ['physical', 'multiple'],
                'age_group_min': 3,
                'age_group_max': 18,
                'duration_weeks': 12,
                'sessions_per_week': 3,
                'session_duration_minutes': 45,
                'objectives': [
                    'تحسين القوة العضلية',
                    'تطوير التوازن والتناسق',
                    'زيادة مدى الحركة',
                    'تحسين المهارات الحركية الكبرى'
                ],
                'activities': [
                    'تمارين التقوية',
                    'تمارين التوازن',
                    'تمارين المرونة',
                    'الألعاب الحركية'
                ],
                'max_participants': 1,
                'cost_per_session': 150.0
            },
            {
                'name': 'برنامج علاج النطق والتخاطب',
                'description': 'برنامج متخصص لتطوير مهارات النطق والتواصل',
                'program_type': ProgramType.SPEECH_THERAPY,
                'target_disability_types': ['speech', 'autism', 'intellectual'],
                'age_group_min': 2,
                'age_group_max': 16,
                'duration_weeks': 16,
                'sessions_per_week': 2,
                'session_duration_minutes': 30,
                'objectives': [
                    'تحسين وضوح النطق',
                    'تطوير المفردات',
                    'تحسين فهم اللغة',
                    'تطوير مهارات التواصل'
                ],
                'activities': [
                    'تمارين النطق',
                    'ألعاب لغوية',
                    'قصص تفاعلية',
                    'تمارين التنفس'
                ],
                'max_participants': 1,
                'cost_per_session': 120.0
            },
            {
                'name': 'برنامج العلاج السلوكي التطبيقي (ABA)',
                'description': 'برنامج مبني على مبادئ تحليل السلوك التطبيقي لأطفال التوحد',
                'program_type': ProgramType.BEHAVIORAL_THERAPY,
                'target_disability_types': ['autism', 'intellectual'],
                'age_group_min': 2,
                'age_group_max': 12,
                'duration_weeks': 24,
                'sessions_per_week': 4,
                'session_duration_minutes': 60,
                'objectives': [
                    'تقليل السلوكيات غير المرغوبة',
                    'تطوير المهارات الاجتماعية',
                    'تحسين التواصل',
                    'زيادة الاستقلالية'
                ],
                'activities': [
                    'برامج التعزيز',
                    'تدريب المهارات',
                    'العلاج باللعب',
                    'التدريب على التواصل'
                ],
                'max_participants': 1,
                'cost_per_session': 200.0
            },
            {
                'name': 'برنامج العلاج الوظيفي',
                'description': 'برنامج لتطوير المهارات الحركية الدقيقة ومهارات الحياة اليومية',
                'program_type': ProgramType.OCCUPATIONAL_THERAPY,
                'target_disability_types': ['physical', 'intellectual', 'sensory'],
                'age_group_min': 3,
                'age_group_max': 18,
                'duration_weeks': 14,
                'sessions_per_week': 2,
                'session_duration_minutes': 45,
                'objectives': [
                    'تطوير المهارات الحركية الدقيقة',
                    'تحسين التناسق البصري الحركي',
                    'تطوير مهارات الحياة اليومية',
                    'تحسين الاستقلالية'
                ],
                'activities': [
                    'أنشطة المهارات الدقيقة',
                    'تمارين التناسق',
                    'تدريب على المهارات اليومية',
                    'الأنشطة الحسية'
                ],
                'max_participants': 2,
                'cost_per_session': 130.0
            },
            {
                'name': 'برنامج التأهيل التعليمي',
                'description': 'برنامج تعليمي مخصص للأطفال ذوي صعوبات التعلم',
                'program_type': ProgramType.EDUCATIONAL,
                'target_disability_types': ['learning', 'intellectual'],
                'age_group_min': 6,
                'age_group_max': 16,
                'duration_weeks': 20,
                'sessions_per_week': 3,
                'session_duration_minutes': 50,
                'objectives': [
                    'تحسين المهارات الأكاديمية',
                    'تطوير استراتيجيات التعلم',
                    'زيادة الثقة بالنفس',
                    'تحسين التركيز والانتباه'
                ],
                'activities': [
                    'برامج تعليمية مخصصة',
                    'ألعاب تعليمية',
                    'تمارين التركيز',
                    'أنشطة إبداعية'
                ],
                'max_participants': 4,
                'cost_per_session': 100.0
            }
        ]
        
        programs = []
        for i, data in enumerate(programs_data, 1):
            program_type_code = data['program_type'].value[:3].upper()
            program = RehabilitationProgram(
                program_code=f"{program_type_code}{i:03d}",
                created_by=admin_user.id,
                **data
            )
            programs.append(program)
            db.session.add(program)
        
        db.session.commit()
        
        # 3. إضافة تسجيلات المستفيدين في البرامج
        enrollments_data = [
            {
                'beneficiary_idx': 0,  # أحمد - التوحد
                'program_idx': 2,      # برنامج ABA
                'start_date': date.today() - timedelta(days=30),
                'individual_goals': [
                    'تقليل نوبات الغضب',
                    'تحسين التواصل البصري',
                    'تطوير مهارات اللعب'
                ]
            },
            {
                'beneficiary_idx': 1,  # فاطمة - إعاقة ذهنية
                'program_idx': 4,      # برنامج تعليمي
                'start_date': date.today() - timedelta(days=45),
                'individual_goals': [
                    'تحسين مهارات القراءة',
                    'تطوير المهارات الحسابية',
                    'زيادة فترة التركيز'
                ]
            },
            {
                'beneficiary_idx': 2,  # خالد - شلل دماغي
                'program_idx': 0,      # العلاج الطبيعي
                'start_date': date.today() - timedelta(days=60),
                'individual_goals': [
                    'تحسين قوة العضلات',
                    'تطوير التوازن',
                    'زيادة مدى الحركة'
                ]
            },
            {
                'beneficiary_idx': 3,  # نورا - تأخر نطق
                'program_idx': 1,      # علاج النطق
                'start_date': date.today() - timedelta(days=20),
                'individual_goals': [
                    'تحسين وضوح النطق',
                    'زيادة المفردات',
                    'تطوير التواصل'
                ]
            },
            {
                'beneficiary_idx': 4,  # يوسف - ضعف سمع
                'program_idx': 3,      # العلاج الوظيفي
                'start_date': date.today() - timedelta(days=35),
                'individual_goals': [
                    'تطوير المهارات البصرية',
                    'تحسين التناسق الحركي',
                    'زيادة الاستقلالية'
                ]
            }
        ]
        
        enrollments = []
        for enrollment_data in enrollments_data:
            beneficiary = beneficiaries[enrollment_data['beneficiary_idx']]
            program = programs[enrollment_data['program_idx']]
            
            enrollment = BeneficiaryProgram(
                beneficiary_id=beneficiary.id,
                program_id=program.id,
                enrollment_date=enrollment_data['start_date'],
                start_date=enrollment_data['start_date'],
                individual_goals=enrollment_data['individual_goals'],
                assigned_therapist_id=admin_user.id,
                completion_percentage=random.uniform(20, 80),
                created_by=admin_user.id
            )
            
            # حساب تاريخ الانتهاء المتوقع
            if program.duration_weeks:
                enrollment.expected_completion_date = enrollment.start_date + timedelta(weeks=program.duration_weeks)
            
            enrollments.append(enrollment)
            db.session.add(enrollment)
        
        db.session.commit()
        
        # 4. إضافة جلسات علاجية
        sessions_count = 0
        for enrollment in enrollments:
            program = next(p for p in programs if p.id == enrollment.program_id)
            
            # إنشاء جلسات للأسابيع الماضية
            weeks_passed = min(4, (date.today() - enrollment.start_date).days // 7)
            
            for week in range(weeks_passed):
                for session_num in range(program.sessions_per_week or 2):
                    sessions_count += 1
                    session_date = enrollment.start_date + timedelta(
                        weeks=week, 
                        days=session_num * 2  # توزيع الجلسات على الأسبوع
                    )
                    
                    session = TherapySession(
                        session_number=f"S{sessions_count:06d}",
                        beneficiary_id=enrollment.beneficiary_id,
                        program_id=enrollment.program_id,
                        beneficiary_program_id=enrollment.id,
                        scheduled_date=datetime.combine(session_date, datetime.min.time().replace(hour=9 + session_num)),
                        actual_start_time=datetime.combine(session_date, datetime.min.time().replace(hour=9 + session_num)),
                        actual_end_time=datetime.combine(session_date, datetime.min.time().replace(hour=9 + session_num, minute=program.session_duration_minutes or 45)),
                        duration_minutes=program.session_duration_minutes or 45,
                        therapist_id=admin_user.id,
                        status=SessionStatus.COMPLETED,
                        attendance_status='present',
                        session_objectives=program.objectives[:2] if program.objectives else [],
                        activities_performed=program.activities[:2] if program.activities else [],
                        performance_rating=random.choice(list(ProgressLevel)),
                        therapist_notes=f"جلسة جيدة مع تحسن ملحوظ في الأداء. الطفل متعاون ومتفاعل.",
                        recommendations=f"الاستمرار في التمارين المنزلية والتركيز على الأهداف المحددة.",
                        created_by=admin_user.id
                    )
                    db.session.add(session)
        
        # إضافة جلسات مجدولة للأسبوع القادم
        for enrollment in enrollments:
            program = next(p for p in programs if p.id == enrollment.program_id)
            
            for session_num in range(program.sessions_per_week or 2):
                sessions_count += 1
                session_date = date.today() + timedelta(days=session_num * 2 + 1)
                
                session = TherapySession(
                    session_number=f"S{sessions_count:06d}",
                    beneficiary_id=enrollment.beneficiary_id,
                    program_id=enrollment.program_id,
                    beneficiary_program_id=enrollment.id,
                    scheduled_date=datetime.combine(session_date, datetime.min.time().replace(hour=9 + session_num)),
                    therapist_id=admin_user.id,
                    status=SessionStatus.SCHEDULED,
                    session_objectives=program.objectives[:2] if program.objectives else [],
                    created_by=admin_user.id
                )
                db.session.add(session)
        
        # 5. إضافة تقييمات التقدم
        assessments_count = 0
        for enrollment in enrollments:
            assessments_count += 1
            
            assessment = ProgressAssessment(
                assessment_number=f"PA{assessments_count:06d}",
                beneficiary_id=enrollment.beneficiary_id,
                program_id=enrollment.program_id,
                assessment_date=enrollment.start_date + timedelta(days=30),
                assessment_type='periodic',
                assessor_id=admin_user.id,
                motor_skills={
                    'gross_motor': random.randint(60, 85),
                    'fine_motor': random.randint(55, 80),
                    'balance': random.randint(50, 75)
                },
                cognitive_skills={
                    'attention': random.randint(65, 85),
                    'memory': random.randint(60, 80),
                    'problem_solving': random.randint(55, 75)
                },
                communication_skills={
                    'receptive_language': random.randint(70, 90),
                    'expressive_language': random.randint(60, 85),
                    'social_communication': random.randint(55, 80)
                },
                social_skills={
                    'peer_interaction': random.randint(50, 75),
                    'cooperation': random.randint(60, 85),
                    'following_instructions': random.randint(65, 90)
                },
                overall_progress=random.choice([ProgressLevel.FAIR, ProgressLevel.GOOD, ProgressLevel.VERY_GOOD]),
                strengths="تحسن ملحوظ في التفاعل والتعاون، استجابة جيدة للتعليمات",
                areas_for_improvement="يحتاج إلى مزيد من العمل على المهارات الاجتماعية والتواصل",
                recommendations="الاستمرار في البرنامج الحالي مع التركيز على الأنشطة الاجتماعية",
                goals_achieved=enrollment.individual_goals[:1] if enrollment.individual_goals else [],
                new_goals=["هدف جديد للمرحلة القادمة"],
                created_by=admin_user.id
            )
            db.session.add(assessment)
        
        # 6. إضافة معدات التأهيل
        equipment_data = [
            {
                'name': 'جهاز المشي المساعد',
                'description': 'جهاز مشي مخصص للأطفال لتطوير المهارات الحركية',
                'category': 'العلاج الطبيعي',
                'manufacturer': 'RehabTech',
                'model': 'WT-2023',
                'condition': 'excellent',
                'location': 'غرفة العلاج الطبيعي 1',
                'usage_instructions': 'يستخدم تحت إشراف أخصائي العلاج الطبيعي'
            },
            {
                'name': 'طاولة العلاج الوظيفي',
                'description': 'طاولة قابلة للتعديل للأنشطة الحركية الدقيقة',
                'category': 'العلاج الوظيفي',
                'manufacturer': 'OccuTherapy',
                'model': 'OT-Table-Pro',
                'condition': 'good',
                'location': 'غرفة العلاج الوظيفي',
                'usage_instructions': 'تنظيف بعد كل استخدام'
            },
            {
                'name': 'جهاز تدريب النطق الإلكتروني',
                'description': 'جهاز تفاعلي لتدريب النطق والتواصل',
                'category': 'علاج النطق',
                'manufacturer': 'SpeechTech',
                'model': 'ST-Interactive-2023',
                'condition': 'excellent',
                'location': 'غرفة علاج النطق',
                'usage_instructions': 'يتطلب معايرة يومية قبل الاستخدام'
            }
        ]
        
        for i, data in enumerate(equipment_data, 1):
            equipment = Equipment(
                equipment_code=f"EQ{i:06d}",
                purchase_date=date.today() - timedelta(days=random.randint(30, 365)),
                purchase_cost=random.uniform(5000, 25000),
                last_maintenance_date=date.today() - timedelta(days=random.randint(1, 90)),
                next_maintenance_date=date.today() + timedelta(days=random.randint(30, 180)),
                created_by=admin_user.id,
                **data
            )
            db.session.add(equipment)
        
        # 7. إضافة موارد تعليمية
        resources_data = [
            {
                'title': 'ألعاب تطوير المهارات الحركية',
                'description': 'مجموعة من الألعاب التفاعلية لتطوير المهارات الحركية الكبرى والدقيقة',
                'resource_type': 'game',
                'target_disability_types': ['physical', 'intellectual'],
                'target_age_group': '3-12 سنة',
                'difficulty_level': 'متوسط',
                'skills_targeted': ['المهارات الحركية', 'التناسق', 'التوازن'],
                'learning_objectives': ['تحسين التناسق الحركي', 'تطوير القوة العضلية'],
                'rating': 4.5,
                'reviews_count': 25,
                'is_approved': True,
                'author': 'فريق العلاج الطبيعي',
                'language': 'ar'
            },
            {
                'title': 'برنامج تدريب النطق التفاعلي',
                'description': 'برنامج رقمي شامل لتدريب النطق وتطوير مهارات التواصل',
                'resource_type': 'app',
                'target_disability_types': ['speech', 'autism'],
                'target_age_group': '2-10 سنوات',
                'difficulty_level': 'متدرج',
                'skills_targeted': ['النطق', 'التواصل', 'المفردات'],
                'learning_objectives': ['تحسين وضوح النطق', 'زيادة المفردات'],
                'rating': 4.8,
                'reviews_count': 42,
                'is_approved': True,
                'author': 'أخصائي علاج النطق',
                'language': 'ar'
            },
            {
                'title': 'قصص اجتماعية للأطفال ذوي التوحد',
                'description': 'مجموعة من القصص المصورة لتعليم المهارات الاجتماعية',
                'resource_type': 'document',
                'target_disability_types': ['autism', 'intellectual'],
                'target_age_group': '4-12 سنة',
                'difficulty_level': 'بسيط',
                'skills_targeted': ['المهارات الاجتماعية', 'التواصل', 'السلوك'],
                'learning_objectives': ['تطوير المهارات الاجتماعية', 'تحسين السلوك'],
                'rating': 4.3,
                'reviews_count': 18,
                'is_approved': True,
                'author': 'أخصائي السلوك',
                'language': 'ar'
            }
        ]
        
        for i, data in enumerate(resources_data, 1):
            resource = EducationalResource(
                resource_code=f"ER{i:06d}",
                created_by=admin_user.id,
                **data
            )
            db.session.add(resource)
        
        # حفظ جميع البيانات
        db.session.commit()
        
        print(f"✅ تم إضافة البيانات التجريبية بنجاح:")
        print(f"   📋 {len(beneficiaries)} مستفيد")
        print(f"   🏥 {len(programs)} برنامج تأهيل")
        print(f"   📝 {len(enrollments)} تسجيل في البرامج")
        print(f"   🕐 {sessions_count} جلسة علاجية")
        print(f"   📊 {assessments_count} تقييم تقدم")
        print(f"   🔧 {len(equipment_data)} معدة")
        print(f"   📚 {len(resources_data)} مورد تعليمي")
        
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
        return False

if __name__ == '__main__':
    from app import app
    with app.app_context():
        add_rehabilitation_programs_sample_data()
