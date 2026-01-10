#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, date, timedelta
import random
from database import db
from app import create_app
from comprehensive_rehabilitation_models import *

def add_comprehensive_rehabilitation_sample_data():
    """Add comprehensive sample data for the disability rehabilitation system"""
    
    app = create_app()
    
    with app.app_context():
        try:
            print("إضافة بيانات تجريبية لنظام التأهيل الشامل...")
            
            # Clear existing data
            db.session.query(ComprehensiveProgressReport).delete()
            db.session.query(ProgressRecord).delete()
            db.session.query(TherapySession).delete()
            db.session.query(RehabilitationGoal).delete()
            db.session.query(IndividualRehabilitationPlan).delete()
            db.session.query(ComprehensiveAssessment).delete()
            db.session.query(TherapyEquipment).delete()
            db.session.query(Therapist).delete()
            db.session.query(RehabilitationBeneficiary).delete()
            
            # Add Therapists
            therapists_data = [
                {
                    'first_name': 'أحمد', 'last_name': 'محمد',
                    'specialization': 'physical_therapy',
                    'license_number': 'PT-2023-001',
                    'qualifications': 'بكالوريوس العلاج الطبيعي - جامعة الملك سعود',
                    'experience_years': 8,
                    'phone': '0501234567',
                    'email': 'ahmed.mohamed@alawael.com'
                },
                {
                    'first_name': 'فاطمة', 'last_name': 'العلي',
                    'specialization': 'occupational_therapy',
                    'license_number': 'OT-2023-002',
                    'qualifications': 'ماجستير العلاج الوظيفي - جامعة الملك عبدالعزيز',
                    'experience_years': 6,
                    'phone': '0507654321',
                    'email': 'fatima.alali@alawael.com'
                },
                {
                    'first_name': 'خالد', 'last_name': 'السعد',
                    'specialization': 'speech_therapy',
                    'license_number': 'ST-2023-003',
                    'qualifications': 'بكالوريوس علاج النطق واللغة',
                    'experience_years': 5,
                    'phone': '0509876543',
                    'email': 'khalid.alsaad@alawael.com'
                }
            ]
            
            therapists = []
            for data in therapists_data:
                therapist = Therapist(**data)
                db.session.add(therapist)
                therapists.append(therapist)
            
            db.session.flush()
            
            # Add Equipment
            equipment_data = [
                {
                    'name': 'جهاز المشي الكهربائي',
                    'category': 'physical_therapy',
                    'model': 'TM-2023',
                    'serial_number': 'TM001',
                    'status': 'available',
                    'maintenance_schedule': 'monthly'
                },
                {
                    'name': 'طاولة العلاج الطبيعي',
                    'category': 'physical_therapy',
                    'model': 'PT-Table-Pro',
                    'serial_number': 'PT001',
                    'status': 'available',
                    'maintenance_schedule': 'quarterly'
                },
                {
                    'name': 'أدوات التدريب الحسي',
                    'category': 'occupational_therapy',
                    'model': 'ST-Kit-2023',
                    'serial_number': 'ST001',
                    'status': 'available',
                    'maintenance_schedule': 'monthly'
                }
            ]
            
            equipment_list = []
            for data in equipment_data:
                equipment = TherapyEquipment(**data)
                db.session.add(equipment)
                equipment_list.append(equipment)
            
            db.session.flush()
            
            # Add Beneficiaries
            beneficiaries_data = [
                {
                    'first_name': 'سارة', 'last_name': 'أحمد',
                    'arabic_name': 'سارة أحمد محمد',
                    'national_id': '1234567890',
                    'date_of_birth': date(2015, 3, 15),
                    'gender': 'female',
                    'nationality': 'سعودي',
                    'phone': '0501111111',
                    'address': 'الرياض - حي النرجس',
                    'city': 'الرياض',
                    'primary_disability': 'physical',
                    'secondary_disabilities': ['speech_language'],
                    'severity_level': 'moderate',
                    'diagnosis_date': date(2016, 1, 10),
                    'medical_diagnosis': 'شلل دماغي',
                    'emergency_contact_name': 'أحمد محمد',
                    'emergency_contact_phone': '0502222222',
                    'emergency_contact_relation': 'والد'
                },
                {
                    'first_name': 'محمد', 'last_name': 'علي',
                    'arabic_name': 'محمد علي حسن',
                    'national_id': '2345678901',
                    'date_of_birth': date(2012, 8, 22),
                    'gender': 'male',
                    'nationality': 'سعودي',
                    'phone': '0503333333',
                    'address': 'جدة - حي الصفا',
                    'city': 'جدة',
                    'primary_disability': 'autism_spectrum',
                    'severity_level': 'mild',
                    'diagnosis_date': date(2014, 5, 15),
                    'medical_diagnosis': 'اضطراب طيف التوحد',
                    'emergency_contact_name': 'علي حسن',
                    'emergency_contact_phone': '0504444444',
                    'emergency_contact_relation': 'والد'
                },
                {
                    'first_name': 'نور', 'last_name': 'خالد',
                    'arabic_name': 'نور خالد عبدالله',
                    'national_id': '3456789012',
                    'date_of_birth': date(2018, 12, 5),
                    'gender': 'female',
                    'nationality': 'سعودي',
                    'phone': '0505555555',
                    'address': 'الدمام - حي الشاطئ',
                    'city': 'الدمام',
                    'primary_disability': 'intellectual',
                    'severity_level': 'moderate',
                    'diagnosis_date': date(2020, 3, 20),
                    'medical_diagnosis': 'إعاقة ذهنية متوسطة',
                    'emergency_contact_name': 'خالد عبدالله',
                    'emergency_contact_phone': '0506666666',
                    'emergency_contact_relation': 'والد'
                }
            ]
            
            beneficiaries = []
            for data in beneficiaries_data:
                beneficiary = RehabilitationBeneficiary(**data)
                db.session.add(beneficiary)
                beneficiaries.append(beneficiary)
            
            db.session.flush()
            
            # Add Assessments
            for i, beneficiary in enumerate(beneficiaries):
                assessment_data = {
                    'beneficiary_id': beneficiary.id,
                    'assessment_type': random.choice(['initial', 'periodic', 'final']),
                    'assessment_date': date.today() - timedelta(days=random.randint(30, 180)),
                    'assessor_name': random.choice(['د. أحمد محمد', 'د. فاطمة علي', 'د. خالد سعد']),
                    'motor_skills_score': random.randint(40, 85),
                    'cognitive_skills_score': random.randint(45, 90),
                    'communication_skills_score': random.randint(35, 80),
                    'social_skills_score': random.randint(50, 85),
                    'sensory_skills_score': random.randint(60, 95),
                    'daily_living_skills_score': random.randint(40, 75),
                    'overall_score': random.randint(45, 82),
                    'strengths': 'تفاعل اجتماعي جيد، استجابة للتعليمات البسيطة',
                    'challenges': 'صعوبة في التوازن، تأخر في النطق',
                    'recommendations': 'زيادة جلسات العلاج الطبيعي، تدريب النطق المكثف'
                }
                
                assessment = ComprehensiveAssessment(**assessment_data)
                db.session.add(assessment)
            
            db.session.flush()
            
            # Add Rehabilitation Plans
            for beneficiary in beneficiaries:
                plan_data = {
                    'beneficiary_id': beneficiary.id,
                    'plan_name': f'خطة التأهيل الشاملة - {beneficiary.first_name}',
                    'start_date': date.today(),
                    'end_date': date.today() + timedelta(days=180),
                    'status': 'active',
                    'primary_goals': ['تحسين المهارات الحركية', 'تطوير التواصل', 'زيادة الاستقلالية'],
                    'therapy_types': ['physical_therapy', 'occupational_therapy', 'speech_therapy'],
                    'team_members': [t.id for t in therapists[:2]],
                    'success_criteria': 'تحقيق 70% من الأهداف المحددة خلال 6 أشهر',
                    'notes': 'خطة شاملة تركز على التطوير المتكامل للمستفيد'
                }
                
                plan = IndividualRehabilitationPlan(**plan_data)
                db.session.add(plan)
                
                # Add Goals for each plan
                goals_data = [
                    {
                        'plan_id': None,  # Will be set after flush
                        'goal_description': 'تحسين التوازن والمشي',
                        'goal_type': 'motor',
                        'target_date': date.today() + timedelta(days=90),
                        'success_criteria': 'المشي لمسافة 10 أمتار بدون مساعدة',
                        'status': 'in_progress',
                        'priority': 'high'
                    },
                    {
                        'plan_id': None,
                        'goal_description': 'تطوير مهارات التواصل',
                        'goal_type': 'communication',
                        'target_date': date.today() + timedelta(days=120),
                        'success_criteria': 'استخدام 20 كلمة وظيفية',
                        'status': 'in_progress',
                        'priority': 'high'
                    }
                ]
                
                db.session.flush()
                
                for goal_data in goals_data:
                    goal_data['plan_id'] = plan.id
                    goal = RehabilitationGoal(**goal_data)
                    db.session.add(goal)
            
            db.session.flush()
            
            # Add Therapy Sessions
            plans = db.session.query(IndividualRehabilitationPlan).all()
            for plan in plans:
                for i in range(10):  # 10 sessions per plan
                    session_date = date.today() - timedelta(days=random.randint(1, 60))
                    session_data = {
                        'beneficiary_id': plan.beneficiary_id,
                        'plan_id': plan.id,
                        'therapist_id': random.choice(therapists).id,
                        'session_type': random.choice(['physical_therapy', 'occupational_therapy', 'speech_therapy']),
                        'session_date': session_date,
                        'duration_minutes': random.choice([30, 45, 60]),
                        'status': random.choice(['completed', 'scheduled', 'cancelled']),
                        'activities_performed': ['تمارين التوازن', 'تدريب المشي', 'أنشطة التنسيق'],
                        'progress_notes': 'تحسن ملحوظ في الأداء، تفاعل جيد مع الأنشطة',
                        'homework_assigned': 'تمارين منزلية للتوازن',
                        'next_session_plan': 'التركيز على تقوية العضلات'
                    }
                    
                    session = TherapySession(**session_data)
                    db.session.add(session)
            
            db.session.flush()
            
            # Add Progress Records
            sessions = db.session.query(TherapySession).filter_by(status='completed').all()
            for session in sessions:
                progress_data = {
                    'beneficiary_id': session.beneficiary_id,
                    'session_id': session.id,
                    'goal_id': None,  # Can be linked to specific goals
                    'progress_date': session.session_date,
                    'skill_area': session.session_type.replace('_therapy', ''),
                    'baseline_score': random.randint(30, 60),
                    'current_score': random.randint(50, 90),
                    'progress_percentage': random.randint(60, 95),
                    'observations': 'تحسن مستمر في الأداء',
                    'challenges_faced': 'صعوبة في التركيز أحياناً',
                    'interventions_used': ['التعزيز الإيجابي', 'التكرار المتدرج'],
                    'recommendations': 'مواصلة التدريب المنتظم'
                }
                
                progress = ProgressRecord(**progress_data)
                db.session.add(progress)
            
            db.session.flush()
            
            # Add Progress Reports
            for beneficiary in beneficiaries:
                report_data = {
                    'beneficiary_id': beneficiary.id,
                    'report_period_start': date.today() - timedelta(days=90),
                    'report_period_end': date.today(),
                    'report_type': 'quarterly',
                    'overall_progress_summary': 'تقدم ملحوظ في جميع المجالات المستهدفة',
                    'goals_achieved': 2,
                    'goals_in_progress': 3,
                    'goals_not_started': 1,
                    'motor_skills_progress': random.randint(70, 90),
                    'cognitive_skills_progress': random.randint(65, 85),
                    'communication_skills_progress': random.randint(60, 80),
                    'social_skills_progress': random.randint(75, 95),
                    'daily_living_skills_progress': random.randint(70, 85),
                    'family_feedback': 'تحسن واضح في المنزل، زيادة في التفاعل',
                    'therapist_recommendations': 'مواصلة البرنامج الحالي مع زيادة التحدي',
                    'next_steps': 'إضافة أنشطة جديدة للتطوير المتقدم',
                    'prepared_by': random.choice(['د. أحمد محمد', 'د. فاطمة علي'])
                }
                
                report = ComprehensiveProgressReport(**report_data)
                db.session.add(report)
            
            db.session.commit()
            
            print("✅ تم إضافة البيانات التجريبية بنجاح!")
            print(f"   - {len(therapists)} معالج")
            print(f"   - {len(equipment_list)} معدة علاجية")
            print(f"   - {len(beneficiaries)} مستفيد")
            print(f"   - {len(beneficiaries)} تقييم شامل")
            print(f"   - {len(plans)} خطة تأهيل")
            print(f"   - {len(plans) * 10} جلسة علاجية")
            print(f"   - تقارير تقدم شاملة")
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    add_comprehensive_rehabilitation_sample_data()
