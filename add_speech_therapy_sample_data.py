#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام برامج النطق والتخاطب
Speech Therapy Sample Data Generator
"""

from app import app
from models import db, User
from speech_therapy_models import (
    SpeechClient, SpeechAssessment, TherapyPlan, TherapyGoal, 
    TherapySession, SpeechTherapist, TherapyMaterial, ProgressReport,
    SpeechDisorderType, SeverityLevel, TherapyType, SessionStatus,
    AssessmentType, GoalStatus
)
from datetime import datetime, date, timedelta
import random

def add_speech_therapy_sample_data():
    """إضافة بيانات تجريبية شاملة لنظام النطق والتخاطب"""
    
    with app.app_context():
        try:
            print("🚀 بدء إضافة البيانات التجريبية لنظام النطق والتخاطب...")
            
            # التأكد من وجود المستخدمين
            users = User.query.limit(5).all()
            if not users:
                print("⚠️ لا توجد مستخدمين في النظام. يرجى إضافة مستخدمين أولاً.")
                return
            
            # 1. إضافة المستفيدين
            print("📝 إضافة المستفيدين...")
            clients_data = [
                {
                    'first_name': 'أحمد',
                    'last_name': 'محمد',
                    'arabic_name': 'أحمد محمد علي',
                    'date_of_birth': date(2018, 5, 15),
                    'gender': 'male',
                    'national_id': '1234567890',
                    'phone': '0501234567',
                    'guardian_name': 'محمد علي',
                    'guardian_phone': '0501234568',
                    'guardian_relationship': 'والد',
                    'medical_history': 'تأخر في النطق منذ الولادة',
                    'current_medications': ['فيتامين د'],
                    'allergies': [],
                    'referral_source': 'طبيب الأطفال'
                },
                {
                    'first_name': 'فاطمة',
                    'last_name': 'أحمد',
                    'arabic_name': 'فاطمة أحمد سالم',
                    'date_of_birth': date(2019, 8, 22),
                    'gender': 'female',
                    'national_id': '1234567891',
                    'phone': '0501234569',
                    'guardian_name': 'أحمد سالم',
                    'guardian_phone': '0501234570',
                    'guardian_relationship': 'والد',
                    'medical_history': 'اضطراب في النطق والتواصل',
                    'current_medications': [],
                    'allergies': ['البنسلين'],
                    'referral_source': 'مركز التأهيل'
                },
                {
                    'first_name': 'عبدالله',
                    'last_name': 'خالد',
                    'arabic_name': 'عبدالله خالد محمد',
                    'date_of_birth': date(2017, 12, 10),
                    'gender': 'male',
                    'national_id': '1234567892',
                    'phone': '0501234571',
                    'guardian_name': 'خالد محمد',
                    'guardian_phone': '0501234572',
                    'guardian_relationship': 'والد',
                    'medical_history': 'طيف التوحد مع تأخر لغوي',
                    'current_medications': ['ريسبيردال'],
                    'allergies': [],
                    'referral_source': 'طبيب نفسي'
                },
                {
                    'first_name': 'نورا',
                    'last_name': 'سعد',
                    'arabic_name': 'نورا سعد عبدالله',
                    'date_of_birth': date(2020, 3, 8),
                    'gender': 'female',
                    'national_id': '1234567893',
                    'phone': '0501234573',
                    'guardian_name': 'سعد عبدالله',
                    'guardian_phone': '0501234574',
                    'guardian_relationship': 'والد',
                    'medical_history': 'اضطراب في الطلاقة (التأتأة)',
                    'current_medications': [],
                    'allergies': [],
                    'referral_source': 'المدرسة'
                },
                {
                    'first_name': 'يوسف',
                    'last_name': 'عمر',
                    'arabic_name': 'يوسف عمر حسن',
                    'date_of_birth': date(2016, 11, 25),
                    'gender': 'male',
                    'national_id': '1234567894',
                    'phone': '0501234575',
                    'guardian_name': 'عمر حسن',
                    'guardian_phone': '0501234576',
                    'guardian_relationship': 'والد',
                    'medical_history': 'ضعف سمع متوسط',
                    'current_medications': [],
                    'allergies': ['الأسبرين'],
                    'referral_source': 'طبيب أنف وأذن'
                }
            ]
            
            clients = []
            for i, client_data in enumerate(clients_data):
                client = SpeechClient(
                    client_number=f"SC-{datetime.now().strftime('%Y%m%d')}-{str(i+1).zfill(3)}",
                    first_name=client_data['first_name'],
                    last_name=client_data['last_name'],
                    arabic_name=client_data['arabic_name'],
                    date_of_birth=client_data['date_of_birth'],
                    gender=client_data['gender'],
                    national_id=client_data['national_id'],
                    phone=client_data['phone'],
                    guardian_name=client_data['guardian_name'],
                    guardian_phone=client_data['guardian_phone'],
                    guardian_relationship=client_data['guardian_relationship'],
                    medical_history=client_data['medical_history'],
                    current_medications=client_data['current_medications'],
                    allergies=client_data['allergies'],
                    referral_source=client_data['referral_source'],
                    enrollment_date=date.today() - timedelta(days=random.randint(30, 365)),
                    created_by=users[0].id
                )
                db.session.add(client)
                clients.append(client)
            
            db.session.flush()
            print(f"✅ تم إضافة {len(clients)} مستفيد")
            
            # 2. إضافة المعالجين
            print("👨‍⚕️ إضافة المعالجين...")
            therapists_data = [
                {
                    'user_id': users[0].id,
                    'license_number': 'ST-2023-001',
                    'specialization': ['اضطرابات النطق', 'اضطرابات اللغة'],
                    'qualifications': ['ماجستير علاج النطق', 'دبلوم التأهيل'],
                    'experience_years': 8,
                    'languages': ['العربية', 'الإنجليزية']
                },
                {
                    'user_id': users[1].id,
                    'license_number': 'ST-2023-002',
                    'specialization': ['طيف التوحد', 'التأخر النمائي'],
                    'qualifications': ['بكالوريوس علاج النطق', 'دورة ABA'],
                    'experience_years': 5,
                    'languages': ['العربية']
                }
            ]
            
            therapists = []
            for therapist_data in therapists_data:
                therapist = SpeechTherapist(
                    user_id=therapist_data['user_id'],
                    license_number=therapist_data['license_number'],
                    specialization=therapist_data['specialization'],
                    qualifications=therapist_data['qualifications'],
                    experience_years=therapist_data['experience_years'],
                    languages=therapist_data['languages'],
                    created_by=users[0].id
                )
                db.session.add(therapist)
                therapists.append(therapist)
            
            db.session.flush()
            print(f"✅ تم إضافة {len(therapists)} معالج")
            
            # 3. إضافة التقييمات
            print("📋 إضافة التقييمات...")
            assessments_data = [
                {
                    'client': clients[0],
                    'assessment_type': AssessmentType.initial,
                    'primary_disorder': SpeechDisorderType.articulation,
                    'severity_level': SeverityLevel.moderate,
                    'observations': 'صعوبة في نطق الأصوات الاحتكاكية',
                    'recommendations': 'جلسات علاج نطق مكثفة 3 مرات أسبوعياً',
                    'articulation_score': 65,
                    'language_comprehension': 80,
                    'language_expression': 70
                },
                {
                    'client': clients[1],
                    'assessment_type': AssessmentType.initial,
                    'primary_disorder': SpeechDisorderType.language,
                    'severity_level': SeverityLevel.mild,
                    'observations': 'تأخر في تطور المفردات والتراكيب',
                    'recommendations': 'برنامج تطوير اللغة التعبيرية',
                    'articulation_score': 85,
                    'language_comprehension': 75,
                    'language_expression': 60
                },
                {
                    'client': clients[2],
                    'assessment_type': AssessmentType.diagnostic,
                    'primary_disorder': SpeechDisorderType.autism,
                    'severity_level': SeverityLevel.severe,
                    'observations': 'صعوبات في التواصل الاجتماعي والتفاعل',
                    'recommendations': 'برنامج تدخل مبكر شامل',
                    'articulation_score': 45,
                    'language_comprehension': 50,
                    'language_expression': 40
                },
                {
                    'client': clients[3],
                    'assessment_type': AssessmentType.initial,
                    'primary_disorder': SpeechDisorderType.fluency,
                    'severity_level': SeverityLevel.moderate,
                    'observations': 'تكرار وإطالة في الأصوات',
                    'recommendations': 'تقنيات تحسين الطلاقة',
                    'fluency_score': 60,
                    'language_comprehension': 90,
                    'language_expression': 85
                },
                {
                    'client': clients[4],
                    'assessment_type': AssessmentType.initial,
                    'primary_disorder': SpeechDisorderType.hearing,
                    'severity_level': SeverityLevel.moderate,
                    'observations': 'ضعف سمع يؤثر على تطور النطق',
                    'recommendations': 'استخدام المعينات السمعية وعلاج النطق',
                    'articulation_score': 55,
                    'language_comprehension': 65,
                    'language_expression': 60
                }
            ]
            
            assessments = []
            for i, assessment_data in enumerate(assessments_data):
                assessment = SpeechAssessment(
                    assessment_number=f"SA-{datetime.now().strftime('%Y%m%d')}-{str(i+1).zfill(3)}",
                    client_id=assessment_data['client'].id,
                    therapist_id=therapists[i % len(therapists)].user_id,
                    assessment_type=assessment_data['assessment_type'],
                    assessment_date=date.today() - timedelta(days=random.randint(1, 30)),
                    primary_disorder=assessment_data['primary_disorder'],
                    severity_level=assessment_data['severity_level'],
                    observations=assessment_data['observations'],
                    recommendations=assessment_data['recommendations'],
                    articulation_score=assessment_data.get('articulation_score'),
                    language_comprehension=assessment_data.get('language_comprehension'),
                    language_expression=assessment_data.get('language_expression'),
                    fluency_score=assessment_data.get('fluency_score'),
                    assessment_tools=['GFTA-3', 'PPVT-4', 'CELF-5'],
                    created_by=therapists[0].user_id
                )
                db.session.add(assessment)
                assessments.append(assessment)
            
            db.session.flush()
            print(f"✅ تم إضافة {len(assessments)} تقييم")
            
            # 4. إضافة الخطط العلاجية
            print("📋 إضافة الخطط العلاجية...")
            therapy_plans_data = [
                {
                    'client': clients[0],
                    'assessment': assessments[0],
                    'plan_title': 'برنامج تحسين النطق',
                    'therapy_type': TherapyType.articulation,
                    'plan_description': 'برنامج شامل لتحسين نطق الأصوات الاحتكاكية',
                    'estimated_duration_weeks': 12,
                    'sessions_per_week': 3,
                    'long_term_goals': ['تحسين وضوح النطق إلى 85%', 'زيادة الثقة في التواصل'],
                    'short_term_goals': ['نطق صوت /س/ بوضوح', 'نطق صوت /ش/ في الكلمات']
                },
                {
                    'client': clients[1],
                    'assessment': assessments[1],
                    'plan_title': 'برنامج تطوير اللغة',
                    'therapy_type': TherapyType.language,
                    'plan_description': 'برنامج لتطوير المفردات والتراكيب اللغوية',
                    'estimated_duration_weeks': 16,
                    'sessions_per_week': 2,
                    'long_term_goals': ['زيادة المفردات إلى 500 كلمة', 'تكوين جمل من 4-5 كلمات'],
                    'short_term_goals': ['تعلم 20 كلمة جديدة', 'تكوين جمل من كلمتين']
                },
                {
                    'client': clients[2],
                    'assessment': assessments[2],
                    'plan_title': 'برنامج التدخل المبكر للتوحد',
                    'therapy_type': TherapyType.autism,
                    'plan_description': 'برنامج شامل للتواصل والتفاعل الاجتماعي',
                    'estimated_duration_weeks': 24,
                    'sessions_per_week': 4,
                    'long_term_goals': ['تطوير التواصل البصري', 'زيادة التفاعل الاجتماعي'],
                    'short_term_goals': ['الاستجابة للاسم', 'التقليد الحركي البسيط']
                }
            ]
            
            therapy_plans = []
            for i, plan_data in enumerate(therapy_plans_data):
                plan = TherapyPlan(
                    plan_number=f"TP-{datetime.now().strftime('%Y%m%d')}-{str(i+1).zfill(3)}",
                    client_id=plan_data['client'].id,
                    therapist_id=therapists[i % len(therapists)].user_id,
                    assessment_id=plan_data['assessment'].id,
                    plan_title=plan_data['plan_title'],
                    plan_description=plan_data['plan_description'],
                    therapy_type=plan_data['therapy_type'],
                    start_date=date.today(),
                    estimated_duration_weeks=plan_data['estimated_duration_weeks'],
                    sessions_per_week=plan_data['sessions_per_week'],
                    session_duration_minutes=45,
                    long_term_goals=plan_data['long_term_goals'],
                    short_term_goals=plan_data['short_term_goals'],
                    therapy_methods=['العلاج المباشر', 'الألعاب التعليمية', 'التدريب المنزلي'],
                    materials_needed=['بطاقات مصورة', 'ألعاب تفاعلية', 'مرآة'],
                    created_by=therapists[0].user_id
                )
                db.session.add(plan)
                therapy_plans.append(plan)
            
            db.session.flush()
            print(f"✅ تم إضافة {len(therapy_plans)} خطة علاجية")
            
            # 5. إضافة الأهداف العلاجية
            print("🎯 إضافة الأهداف العلاجية...")
            goals_data = [
                # أهداف الخطة الأولى
                {
                    'therapy_plan': therapy_plans[0],
                    'goal_title': 'نطق صوت /س/ بوضوح',
                    'goal_description': 'قدرة الطفل على نطق صوت السين في بداية ووسط ونهاية الكلمة',
                    'target_accuracy': 80,
                    'priority_level': 1
                },
                {
                    'therapy_plan': therapy_plans[0],
                    'goal_title': 'نطق صوت /ش/ بوضوح',
                    'goal_description': 'قدرة الطفل على نطق صوت الشين في جميع مواضع الكلمة',
                    'target_accuracy': 75,
                    'priority_level': 2
                },
                # أهداف الخطة الثانية
                {
                    'therapy_plan': therapy_plans[1],
                    'goal_title': 'تعلم 50 كلمة جديدة',
                    'goal_description': 'زيادة المفردات النشطة للطفل',
                    'target_accuracy': 90,
                    'priority_level': 1
                },
                {
                    'therapy_plan': therapy_plans[1],
                    'goal_title': 'تكوين جمل من 3 كلمات',
                    'goal_description': 'قدرة الطفل على تكوين جمل بسيطة',
                    'target_accuracy': 70,
                    'priority_level': 2
                }
            ]
            
            goals = []
            for i, goal_data in enumerate(goals_data):
                goal = TherapyGoal(
                    therapy_plan_id=goal_data['therapy_plan'].id,
                    goal_number=f"G{i+1}",
                    goal_title=goal_data['goal_title'],
                    goal_description=goal_data['goal_description'],
                    target_accuracy=goal_data['target_accuracy'],
                    priority_level=goal_data['priority_level'],
                    target_date=date.today() + timedelta(weeks=4),
                    status=GoalStatus.active,
                    created_by=therapists[0].user_id
                )
                db.session.add(goal)
                goals.append(goal)
            
            db.session.flush()
            print(f"✅ تم إضافة {len(goals)} هدف علاجي")
            
            # 6. إضافة الجلسات العلاجية
            print("📅 إضافة الجلسات العلاجية...")
            sessions = []
            for i, plan in enumerate(therapy_plans):
                # إضافة 5 جلسات لكل خطة
                for j in range(5):
                    session_date = date.today() - timedelta(days=j*3)
                    session = TherapySession(
                        session_number=f"TS-{datetime.now().strftime('%Y%m%d')}-{str(i*5+j+1).zfill(3)}",
                        client_id=plan.client_id,
                        therapist_id=plan.therapist_id,
                        therapy_plan_id=plan.id,
                        session_date=session_date,
                        start_time=datetime.strptime('10:00', '%H:%M').time(),
                        end_time=datetime.strptime('10:45', '%H:%M').time(),
                        duration_minutes=45,
                        session_objectives=['تحسين النطق', 'زيادة المفردات'],
                        activities_performed=['تمارين النطق', 'ألعاب تفاعلية'],
                        materials_used=['بطاقات مصورة', 'مرآة'],
                        client_performance=f'أداء جيد - دقة {random.randint(60, 90)}%',
                        progress_made='تحسن ملحوظ في النطق',
                        status=SessionStatus.completed if j < 3 else SessionStatus.scheduled,
                        attendance_status='حضر' if j < 4 else 'لم يحضر',
                        created_by=plan.therapist_id
                    )
                    db.session.add(session)
                    sessions.append(session)
            
            db.session.flush()
            print(f"✅ تم إضافة {len(sessions)} جلسة علاجية")
            
            # 7. إضافة المواد العلاجية
            print("📚 إضافة المواد العلاجية...")
            materials_data = [
                {
                    'material_name': 'بطاقات الأصوات المصورة',
                    'material_type': 'بطاقات تعليمية',
                    'target_skills': ['النطق', 'التعرف على الأصوات'],
                    'age_range': '3-8 سنوات',
                    'description': 'مجموعة بطاقات مصورة لتعليم الأصوات'
                },
                {
                    'material_name': 'ألعاب التفاعل اللغوي',
                    'material_type': 'ألعاب تعليمية',
                    'target_skills': ['اللغة التعبيرية', 'التفاعل الاجتماعي'],
                    'age_range': '4-10 سنوات',
                    'description': 'ألعاب تفاعلية لتطوير اللغة'
                },
                {
                    'material_name': 'تطبيق النطق الذكي',
                    'material_type': 'تطبيق إلكتروني',
                    'target_skills': ['النطق', 'التدريب المنزلي'],
                    'age_range': '5-12 سنة',
                    'description': 'تطبيق ذكي لتحسين النطق'
                }
            ]
            
            materials = []
            for material_data in materials_data:
                material = TherapyMaterial(
                    material_name=material_data['material_name'],
                    material_type=material_data['material_type'],
                    target_skills=material_data['target_skills'],
                    age_range=material_data['age_range'],
                    description=material_data['description'],
                    usage_instructions='يستخدم تحت إشراف المعالج',
                    availability_status='متوفر',
                    created_by=therapists[0].user_id
                )
                db.session.add(material)
                materials.append(material)
            
            db.session.flush()
            print(f"✅ تم إضافة {len(materials)} مادة علاجية")
            
            # 8. إضافة تقارير التقدم
            print("📊 إضافة تقارير التقدم...")
            reports = []
            for i, plan in enumerate(therapy_plans[:2]):  # تقارير للخطتين الأوليين فقط
                report = ProgressReport(
                    client_id=plan.client_id,
                    therapist_id=plan.therapist_id,
                    therapy_plan_id=plan.id,
                    report_date=date.today() - timedelta(days=7),
                    report_period_start=date.today() - timedelta(days=30),
                    report_period_end=date.today(),
                    sessions_attended=12,
                    sessions_scheduled=15,
                    overall_progress_percentage=75,
                    goals_achieved=1,
                    goals_in_progress=2,
                    strengths=['تحسن في النطق', 'زيادة التفاعل'],
                    areas_for_improvement=['الحاجة لمزيد من التدريب المنزلي'],
                    recommendations=['زيادة التدريب المنزلي', 'استخدام التطبيقات التعليمية'],
                    next_steps=['مراجعة الأهداف', 'تطوير خطة جديدة'],
                    family_feedback='الأهل راضون عن التقدم',
                    created_by=plan.therapist_id
                )
                db.session.add(report)
                reports.append(report)
            
            db.session.flush()
            print(f"✅ تم إضافة {len(reports)} تقرير تقدم")
            
            # حفظ جميع التغييرات
            db.session.commit()
            
            print("\n" + "="*60)
            print("🎉 تم إكمال إضافة البيانات التجريبية بنجاح!")
            print("="*60)
            print(f"📊 ملخص البيانات المضافة:")
            print(f"   • المستفيدين: {len(clients)}")
            print(f"   • المعالجين: {len(therapists)}")
            print(f"   • التقييمات: {len(assessments)}")
            print(f"   • الخطط العلاجية: {len(therapy_plans)}")
            print(f"   • الأهداف العلاجية: {len(goals)}")
            print(f"   • الجلسات العلاجية: {len(sessions)}")
            print(f"   • المواد العلاجية: {len(materials)}")
            print(f"   • تقارير التقدم: {len(reports)}")
            print("="*60)
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
            raise e

if __name__ == '__main__':
    add_speech_therapy_sample_data()
