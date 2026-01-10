# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام تحليل أنماط التعلم والسلوك
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from database import db
from learning_behavior_analysis_models import (
    LearningStyle, BehaviorPattern, StudentLearningProfile, BehaviorObservation,
    LearningAnalytics, BehaviorIntervention, LearningEnvironmentFactor, EnvironmentAssessment
)
from datetime import datetime, timedelta
import json
import random

def add_learning_behavior_sample_data():
    """إضافة بيانات تجريبية لنظام تحليل أنماط التعلم والسلوك"""
    
    with app.app_context():
        try:
            print("بدء إضافة البيانات التجريبية لنظام تحليل أنماط التعلم والسلوك...")
            
            # 1. إضافة أنماط التعلم
            learning_styles_data = [
                {
                    'name': 'المتعلم البصري',
                    'name_en': 'Visual Learner',
                    'description': 'يتعلم بشكل أفضل من خلال الصور والرسوم البيانية والألوان',
                    'characteristics': ['يفضل الصور والرسوم', 'يتذكر الوجوه بسهولة', 'يحب الألوان والتنظيم البصري'],
                    'teaching_strategies': ['استخدام الصور والرسوم', 'الخرائط الذهنية', 'الألوان والرموز'],
                    'assessment_methods': ['المشاريع البصرية', 'العروض التقديمية', 'الرسوم والمخططات'],
                    'color_code': '#FF6B6B',
                    'icon': 'fas fa-eye'
                },
                {
                    'name': 'المتعلم السمعي',
                    'name_en': 'Auditory Learner',
                    'description': 'يتعلم بشكل أفضل من خلال الاستماع والمناقشة',
                    'characteristics': ['يحب الاستماع للقصص', 'يتذكر من خلال التكرار الصوتي', 'يفضل المناقشات'],
                    'teaching_strategies': ['القراءة بصوت عالٍ', 'المناقشات الجماعية', 'الموسيقى التعليمية'],
                    'assessment_methods': ['العروض الشفوية', 'المقابلات', 'التسجيلات الصوتية'],
                    'color_code': '#4ECDC4',
                    'icon': 'fas fa-volume-up'
                },
                {
                    'name': 'المتعلم الحركي',
                    'name_en': 'Kinesthetic Learner',
                    'description': 'يتعلم بشكل أفضل من خلال الحركة والتطبيق العملي',
                    'characteristics': ['يحب الحركة والنشاط', 'يتعلم بالممارسة', 'يحتاج للمس والتجريب'],
                    'teaching_strategies': ['الأنشطة العملية', 'التعلم بالحركة', 'الألعاب التفاعلية'],
                    'assessment_methods': ['المشاريع العملية', 'العروض التطبيقية', 'الأنشطة الحركية'],
                    'color_code': '#45B7D1',
                    'icon': 'fas fa-running'
                },
                {
                    'name': 'المتعلم الاجتماعي',
                    'name_en': 'Social Learner',
                    'description': 'يتعلم بشكل أفضل في المجموعات والبيئة الاجتماعية',
                    'characteristics': ['يحب العمل الجماعي', 'يتفاعل مع الآخرين بسهولة', 'يتعلم من النقاش'],
                    'teaching_strategies': ['العمل الجماعي', 'المناقشات', 'الأنشطة التعاونية'],
                    'assessment_methods': ['المشاريع الجماعية', 'العروض التعاونية', 'النقاشات'],
                    'color_code': '#96CEB4',
                    'icon': 'fas fa-users'
                },
                {
                    'name': 'المتعلم الفردي',
                    'name_en': 'Solitary Learner',
                    'description': 'يتعلم بشكل أفضل بمفرده وفي بيئة هادئة',
                    'characteristics': ['يفضل العمل المستقل', 'يحتاج لبيئة هادئة', 'يركز بشكل أفضل وحيداً'],
                    'teaching_strategies': ['التعلم الذاتي', 'المهام الفردية', 'البيئة الهادئة'],
                    'assessment_methods': ['الاختبارات الفردية', 'المشاريع الشخصية', 'التقييم الذاتي'],
                    'color_code': '#FECA57',
                    'icon': 'fas fa-user'
                }
            ]
            
            for style_data in learning_styles_data:
                existing_style = LearningStyle.query.filter_by(name=style_data['name']).first()
                if not existing_style:
                    style = LearningStyle(
                        name=style_data['name'],
                        name_en=style_data['name_en'],
                        description=style_data['description'],
                        characteristics=json.dumps(style_data['characteristics']),
                        teaching_strategies=json.dumps(style_data['teaching_strategies']),
                        assessment_methods=json.dumps(style_data['assessment_methods']),
                        color_code=style_data['color_code'],
                        icon=style_data['icon']
                    )
                    db.session.add(style)
            
            print("✓ تم إضافة أنماط التعلم")
            
            # 2. إضافة أنماط السلوك
            behavior_patterns_data = [
                {
                    'name': 'السلوك التعاوني',
                    'category': 'positive',
                    'description': 'يظهر الطالب سلوكاً تعاونياً مع الزملاء والمعلمين',
                    'indicators': ['يشارك في الأنشطة الجماعية', 'يساعد الآخرين', 'يتبع التعليمات'],
                    'triggers': ['البيئة الإيجابية', 'التشجيع', 'الأنشطة المحفزة'],
                    'interventions': ['التعزيز الإيجابي', 'المكافآت', 'الثناء'],
                    'severity_level': 'low',
                    'frequency_threshold': 5,
                    'color_code': '#2ECC71',
                    'icon': 'fas fa-handshake'
                },
                {
                    'name': 'نوبات الغضب',
                    'category': 'negative',
                    'description': 'يظهر الطالب نوبات غضب عند الإحباط',
                    'indicators': ['الصراخ', 'رمي الأشياء', 'رفض التعاون'],
                    'triggers': ['الإحباط', 'التعب', 'التغيير المفاجئ'],
                    'interventions': ['تقنيات التهدئة', 'إعادة التوجيه', 'فترات راحة'],
                    'severity_level': 'high',
                    'frequency_threshold': 2,
                    'color_code': '#E74C3C',
                    'icon': 'fas fa-angry'
                },
                {
                    'name': 'تشتت الانتباه',
                    'category': 'negative',
                    'description': 'صعوبة في التركيز والانتباه للمهام',
                    'indicators': ['عدم إكمال المهام', 'النظر حوله كثيراً', 'نسيان التعليمات'],
                    'triggers': ['المشتتات البيئية', 'المهام الطويلة', 'الملل'],
                    'interventions': ['تقسيم المهام', 'تقليل المشتتات', 'فترات راحة قصيرة'],
                    'severity_level': 'medium',
                    'frequency_threshold': 3,
                    'color_code': '#F39C12',
                    'icon': 'fas fa-eye-slash'
                },
                {
                    'name': 'المشاركة النشطة',
                    'category': 'positive',
                    'description': 'يشارك الطالب بنشاط في الأنشطة التعليمية',
                    'indicators': ['رفع اليد للإجابة', 'طرح الأسئلة', 'المشاركة في النقاش'],
                    'triggers': ['الموضوعات المثيرة', 'التشجيع', 'البيئة الآمنة'],
                    'interventions': ['التعزيز المستمر', 'توفير فرص أكثر', 'التنويع في الأنشطة'],
                    'severity_level': 'low',
                    'frequency_threshold': 5,
                    'color_code': '#3498DB',
                    'icon': 'fas fa-hand-paper'
                },
                {
                    'name': 'الانطوائية',
                    'category': 'neutral',
                    'description': 'يفضل الطالب العمل بمفرده ولا يتفاعل كثيراً',
                    'indicators': ['تجنب المجموعات', 'الهدوء الشديد', 'عدم المبادرة'],
                    'triggers': ['الخجل', 'قلة الثقة', 'الخوف من الحكم'],
                    'interventions': ['التشجيع التدريجي', 'الأنشطة الفردية أولاً', 'بناء الثقة'],
                    'severity_level': 'medium',
                    'frequency_threshold': 4,
                    'color_code': '#9B59B6',
                    'icon': 'fas fa-user-circle'
                }
            ]
            
            for pattern_data in behavior_patterns_data:
                existing_pattern = BehaviorPattern.query.filter_by(name=pattern_data['name']).first()
                if not existing_pattern:
                    pattern = BehaviorPattern(
                        name=pattern_data['name'],
                        category=pattern_data['category'],
                        description=pattern_data['description'],
                        indicators=json.dumps(pattern_data['indicators']),
                        triggers=json.dumps(pattern_data['triggers']),
                        interventions=json.dumps(pattern_data['interventions']),
                        severity_level=pattern_data['severity_level'],
                        frequency_threshold=pattern_data['frequency_threshold'],
                        color_code=pattern_data['color_code'],
                        icon=pattern_data['icon']
                    )
                    db.session.add(pattern)
            
            print("✓ تم إضافة أنماط السلوك")
            
            # 3. إضافة عوامل البيئة التعليمية
            environment_factors_data = [
                {
                    'name': 'مستوى الإضاءة',
                    'category': 'physical',
                    'description': 'مستوى الإضاءة في الفصل الدراسي',
                    'impact_level': 'high',
                    'measurement_method': 'مقياس الإضاءة (لوكس)',
                    'optimal_range': '300-500 لوكس',
                    'unit_of_measurement': 'لوكس'
                },
                {
                    'name': 'مستوى الضوضاء',
                    'category': 'physical',
                    'description': 'مستوى الضوضاء في البيئة التعليمية',
                    'impact_level': 'high',
                    'measurement_method': 'مقياس الصوت (ديسيبل)',
                    'optimal_range': '35-45 ديسيبل',
                    'unit_of_measurement': 'ديسيبل'
                },
                {
                    'name': 'درجة الحرارة',
                    'category': 'physical',
                    'description': 'درجة حرارة الفصل الدراسي',
                    'impact_level': 'medium',
                    'measurement_method': 'مقياس الحرارة',
                    'optimal_range': '20-24 درجة مئوية',
                    'unit_of_measurement': 'درجة مئوية'
                },
                {
                    'name': 'حجم المجموعة',
                    'category': 'social',
                    'description': 'عدد الطلاب في المجموعة التعليمية',
                    'impact_level': 'high',
                    'measurement_method': 'العد المباشر',
                    'optimal_range': '4-8 طلاب',
                    'unit_of_measurement': 'طالب'
                },
                {
                    'name': 'مدة الجلسة',
                    'category': 'temporal',
                    'description': 'مدة الجلسة التعليمية',
                    'impact_level': 'high',
                    'measurement_method': 'قياس الوقت',
                    'optimal_range': '30-45 دقيقة',
                    'unit_of_measurement': 'دقيقة'
                }
            ]
            
            for factor_data in environment_factors_data:
                existing_factor = LearningEnvironmentFactor.query.filter_by(name=factor_data['name']).first()
                if not existing_factor:
                    factor = LearningEnvironmentFactor(
                        name=factor_data['name'],
                        category=factor_data['category'],
                        description=factor_data['description'],
                        impact_level=factor_data['impact_level'],
                        measurement_method=factor_data['measurement_method'],
                        optimal_range=factor_data['optimal_range'],
                        unit_of_measurement=factor_data['unit_of_measurement']
                    )
                    db.session.add(factor)
            
            print("✓ تم إضافة عوامل البيئة التعليمية")
            
            db.session.commit()
            
            # 4. إضافة ملفات تعريف التعلم للطلاب (عينة)
            from models import Student, User
            
            students = Student.query.limit(10).all()
            learning_styles = LearningStyle.query.all()
            users = User.query.filter_by(role='specialist').limit(5).all()
            
            if students and learning_styles and users:
                for i, student in enumerate(students):
                    existing_profile = StudentLearningProfile.query.filter_by(student_id=student.id).first()
                    if not existing_profile:
                        primary_style = random.choice(learning_styles)
                        secondary_style = random.choice([s for s in learning_styles if s.id != primary_style.id])
                        
                        profile = StudentLearningProfile(
                            student_id=student.id,
                            primary_learning_style_id=primary_style.id,
                            secondary_learning_style_id=secondary_style.id,
                            learning_preferences=json.dumps([
                                'التعلم التفاعلي',
                                'الأنشطة العملية',
                                'التعزيز الإيجابي'
                            ]),
                            strengths=json.dumps([
                                'الذاكرة البصرية',
                                'التركيز في البيئة الهادئة',
                                'التعلم بالتكرار'
                            ]),
                            challenges=json.dumps([
                                'تشتت الانتباه',
                                'صعوبة في المهام الطويلة',
                                'الحاجة للتشجيع المستمر'
                            ]),
                            attention_span=random.randint(15, 45),
                            motivation_factors=json.dumps([
                                'المكافآت',
                                'الثناء',
                                'الأنشطة المفضلة'
                            ]),
                            preferred_activities=json.dumps([
                                'الرسم',
                                'الألعاب التعليمية',
                                'القصص'
                            ]),
                            learning_pace=random.choice(['slow', 'medium', 'fast']),
                            social_interaction_level=random.choice(['low', 'medium', 'high']),
                            independence_level=random.choice(['low', 'medium', 'high']),
                            confidence_score=random.uniform(3.0, 8.0),
                            last_assessment_date=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                            assessed_by=random.choice(users).id,
                            notes=f'ملاحظات تقييم الطالب {student.name}'
                        )
                        db.session.add(profile)
                
                print("✓ تم إضافة ملفات تعريف التعلم للطلاب")
            
            # 5. إضافة ملاحظات السلوك (عينة)
            behavior_patterns = BehaviorPattern.query.all()
            
            if students and behavior_patterns and users:
                for _ in range(50):  # 50 ملاحظة سلوك
                    student = random.choice(students)
                    pattern = random.choice(behavior_patterns)
                    observer = random.choice(users)
                    
                    observation = BehaviorObservation(
                        student_id=student.id,
                        behavior_pattern_id=pattern.id,
                        observer_id=observer.id,
                        observation_date=datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                        duration=random.randint(5, 60),
                        context=random.choice(['classroom', 'playground', 'therapy', 'cafeteria']),
                        antecedent=random.choice([
                            'بداية النشاط الجديد',
                            'انتهاء وقت الراحة',
                            'تغيير في الروتين',
                            'وصول زائر جديد'
                        ]),
                        behavior_description=f'لوحظ على الطالب {pattern.name}',
                        consequence=random.choice([
                            'تم توجيه الطالب بلطف',
                            'حصل على استراحة قصيرة',
                            'تم تشجيعه ومدحه',
                            'تم إعادة توجيهه للنشاط'
                        ]),
                        intensity=random.choice(['low', 'medium', 'high']),
                        frequency=random.randint(1, 5),
                        intervention_used=random.choice([
                            'التعزيز الإيجابي',
                            'إعادة التوجيه',
                            'فترة راحة',
                            'تغيير النشاط'
                        ]),
                        effectiveness=random.choice(['effective', 'partially_effective', 'not_effective']),
                        environmental_factors=json.dumps([
                            'إضاءة جيدة',
                            'مستوى ضوضاء منخفض',
                            'درجة حرارة مناسبة'
                        ]),
                        emotional_state=random.choice(['happy', 'neutral', 'frustrated', 'excited', 'tired']),
                        social_context=random.choice(['alone', 'with_peers', 'with_adult']),
                        follow_up_required=random.choice([True, False]),
                        follow_up_notes='متابعة التقدم في الجلسة القادمة' if random.choice([True, False]) else None
                    )
                    db.session.add(observation)
                
                print("✓ تم إضافة ملاحظات السلوك")
            
            # 6. إضافة تحليلات التعلم (عينة)
            if students:
                for student in students[:5]:  # تحليل لأول 5 طلاب
                    for i in range(3):  # 3 تحليلات لكل طالب
                        analysis_date = datetime.utcnow() - timedelta(days=i*30)
                        start_date = analysis_date - timedelta(days=30)
                        
                        analytics = LearningAnalytics(
                            student_id=student.id,
                            analysis_date=analysis_date,
                            analysis_period_start=start_date,
                            analysis_period_end=analysis_date,
                            learning_progress_score=random.uniform(40.0, 95.0),
                            engagement_level=random.uniform(3.0, 9.0),
                            attention_consistency=random.uniform(4.0, 8.0),
                            social_interaction_score=random.uniform(3.0, 9.0),
                            independence_growth=random.uniform(-2.0, 5.0),
                            behavior_improvement=random.uniform(-1.0, 8.0),
                            skill_acquisition_rate=random.uniform(1.0, 6.0),
                            preferred_learning_times=json.dumps(['09:00', '10:30', '14:00']),
                            optimal_session_duration=random.randint(25, 50),
                            most_effective_strategies=json.dumps([
                                'التعلم البصري',
                                'التعزيز الإيجابي',
                                'الأنشطة التفاعلية'
                            ]),
                            challenging_areas=json.dumps([
                                'المهارات الحركية الدقيقة',
                                'التواصل اللفظي',
                                'المهارات الاجتماعية'
                            ]),
                            recommendations=json.dumps([
                                {
                                    'category': 'learning',
                                    'priority': 'high',
                                    'title': 'تحسين استراتيجيات التعلم',
                                    'description': 'استخدام المزيد من الوسائل البصرية'
                                }
                            ]),
                            confidence_interval=0.85,
                            data_quality_score=random.uniform(0.7, 0.95),
                            generated_by='ai_system'
                        )
                        db.session.add(analytics)
                
                print("✓ تم إضافة تحليلات التعلم")
            
            db.session.commit()
            print("✅ تم إضافة جميع البيانات التجريبية لنظام تحليل أنماط التعلم والسلوك بنجاح!")
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
            db.session.rollback()
            raise e

if __name__ == '__main__':
    add_learning_behavior_sample_data()
