# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام التوصيات الذكية للبرامج العلاجية
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from database import db
from smart_therapy_recommendations_models import (
    TherapyRecommendationEngine, TherapyRecommendation, RecommendationTemplate,
    RecommendationFeedback, RecommendationRule, RecommendationMetrics,
    RecommendationAlert, RecommendationHistory
)
from datetime import datetime, timedelta
import json
import random

def add_smart_therapy_recommendations_sample_data():
    """إضافة بيانات تجريبية لنظام التوصيات الذكية للبرامج العلاجية"""
    
    with app.app_context():
        try:
            print("بدء إضافة البيانات التجريبية لنظام التوصيات الذكية للبرامج العلاجية...")
            
            # 1. إضافة محركات التوصيات
            engines_data = [
                {
                    'name': 'محرك التوصيات المبني على التعلم الآلي',
                    'description': 'يستخدم خوارزميات التعلم الآلي لتحليل بيانات الطلاب وإنشاء توصيات مخصصة',
                    'algorithm_type': 'ml_based',
                    'version': '2.1',
                    'model_parameters': {
                        'algorithm': 'random_forest',
                        'n_estimators': 100,
                        'max_depth': 10,
                        'min_samples_split': 5
                    },
                    'training_data_sources': [
                        'تقييمات المهارات',
                        'سجلات التقدم',
                        'ملاحظات السلوك',
                        'تحليلات التعلم'
                    ],
                    'accuracy_score': 0.87,
                    'last_trained': datetime.utcnow() - timedelta(days=7)
                },
                {
                    'name': 'محرك التوصيات المبني على القواعد',
                    'description': 'يطبق قواعد محددة مسبقاً بناءً على الممارسات المثبتة علمياً',
                    'algorithm_type': 'rule_based',
                    'version': '1.5',
                    'model_parameters': {
                        'rule_count': 45,
                        'confidence_threshold': 0.75,
                        'priority_weighting': True
                    },
                    'training_data_sources': [
                        'الأدلة العلمية',
                        'أفضل الممارسات',
                        'خبرة الأخصائيين'
                    ],
                    'accuracy_score': 0.82,
                    'last_trained': datetime.utcnow() - timedelta(days=14)
                },
                {
                    'name': 'المحرك الهجين المتقدم',
                    'description': 'يجمع بين التعلم الآلي والقواعد المحددة لتوصيات أكثر دقة',
                    'algorithm_type': 'hybrid',
                    'version': '3.0',
                    'model_parameters': {
                        'ml_weight': 0.6,
                        'rule_weight': 0.4,
                        'ensemble_method': 'weighted_voting',
                        'confidence_boost': 0.15
                    },
                    'training_data_sources': [
                        'جميع مصادر البيانات',
                        'تقييمات الفعالية',
                        'ملاحظات المستخدمين'
                    ],
                    'accuracy_score': 0.91,
                    'last_trained': datetime.utcnow() - timedelta(days=3)
                }
            ]
            
            from models import User
            users = User.query.limit(5).all()
            
            for engine_data in engines_data:
                existing_engine = TherapyRecommendationEngine.query.filter_by(name=engine_data['name']).first()
                if not existing_engine:
                    engine = TherapyRecommendationEngine(
                        name=engine_data['name'],
                        description=engine_data['description'],
                        algorithm_type=engine_data['algorithm_type'],
                        version=engine_data['version'],
                        model_parameters=json.dumps(engine_data['model_parameters']),
                        training_data_sources=json.dumps(engine_data['training_data_sources']),
                        accuracy_score=engine_data['accuracy_score'],
                        last_trained=engine_data['last_trained'],
                        created_by=random.choice(users).id if users else None
                    )
                    db.session.add(engine)
            
            print("✓ تم إضافة محركات التوصيات")
            
            # 2. إضافة قوالب التوصيات
            templates_data = [
                {
                    'name': 'برنامج تطوير المهارات الحركية الدقيقة',
                    'category': 'motor_skills',
                    'subcategory': 'fine_motor',
                    'description': 'قالب شامل لتطوير المهارات الحركية الدقيقة للأطفال',
                    'target_conditions': ['اضطراب طيف التوحد', 'تأخر النمو', 'صعوبات التعلم'],
                    'age_range_min': 3,
                    'age_range_max': 12,
                    'severity_levels': ['خفيف', 'متوسط', 'شديد'],
                    'template_content': {
                        'activities': [
                            'تمارين الرسم والتلوين',
                            'ألعاب التركيب الصغيرة',
                            'تمارين القص واللصق',
                            'أنشطة الكتابة المتدرجة'
                        ],
                        'duration': '8-12 أسبوع',
                        'frequency': '3-4 جلسات أسبوعياً',
                        'session_length': '30-45 دقيقة'
                    },
                    'success_rate': 0.78,
                    'evidence_level': 'high'
                },
                {
                    'name': 'برنامج تحسين التواصل اللفظي',
                    'category': 'communication',
                    'subcategory': 'verbal_communication',
                    'description': 'برنامج متخصص لتطوير مهارات التواصل اللفظي',
                    'target_conditions': ['اضطراب طيف التوحد', 'تأخر اللغة', 'اضطرابات النطق'],
                    'age_range_min': 2,
                    'age_range_max': 10,
                    'severity_levels': ['متوسط', 'شديد'],
                    'template_content': {
                        'techniques': [
                            'العلاج بالتقليد',
                            'استخدام الصور والرموز',
                            'القصص التفاعلية',
                            'الألعاب اللغوية'
                        ],
                        'goals': [
                            'زيادة المفردات',
                            'تحسين النطق',
                            'تطوير التركيب النحوي'
                        ]
                    },
                    'success_rate': 0.82,
                    'evidence_level': 'very_high'
                },
                {
                    'name': 'برنامج تعديل السلوك الإيجابي',
                    'category': 'behavior',
                    'subcategory': 'behavior_modification',
                    'description': 'استراتيجيات شاملة لتعديل السلوك وتعزيز السلوكيات الإيجابية',
                    'target_conditions': ['اضطراب طيف التوحد', 'اضطراب فرط الحركة', 'اضطرابات السلوك'],
                    'age_range_min': 4,
                    'age_range_max': 16,
                    'severity_levels': ['خفيف', 'متوسط', 'شديد'],
                    'template_content': {
                        'strategies': [
                            'نظام المكافآت والعواقب',
                            'التعزيز التفاضلي',
                            'تقنيات إعادة التوجيه',
                            'التدريب على المهارات الاجتماعية'
                        ],
                        'phases': [
                            'تقييم السلوك الأساسي',
                            'وضع خطة التدخل',
                            'تنفيذ الاستراتيجيات',
                            'مراقبة وتعديل الخطة'
                        ]
                    },
                    'success_rate': 0.75,
                    'evidence_level': 'high'
                }
            ]
            
            for template_data in templates_data:
                existing_template = RecommendationTemplate.query.filter_by(name=template_data['name']).first()
                if not existing_template:
                    template = RecommendationTemplate(
                        name=template_data['name'],
                        category=template_data['category'],
                        subcategory=template_data['subcategory'],
                        description=template_data['description'],
                        target_conditions=json.dumps(template_data['target_conditions']),
                        age_range_min=template_data['age_range_min'],
                        age_range_max=template_data['age_range_max'],
                        severity_levels=json.dumps(template_data['severity_levels']),
                        template_content=json.dumps(template_data['template_content']),
                        success_rate=template_data['success_rate'],
                        evidence_level=template_data['evidence_level'],
                        created_by=random.choice(users).id if users else None
                    )
                    db.session.add(template)
            
            print("✓ تم إضافة قوالب التوصيات")
            
            # 3. إضافة قواعد التوصيات
            rules_data = [
                {
                    'name': 'قاعدة التدخل المبكر للمهارات الحركية',
                    'description': 'إذا كان عمر الطفل أقل من 6 سنوات ولديه تأخر في المهارات الحركية، يوصى بالتدخل المكثف',
                    'rule_type': 'age_based',
                    'conditions': {
                        'age_max': 6,
                        'skill_area': 'motor_skills',
                        'performance_threshold': 50
                    },
                    'actions': {
                        'recommendation_type': 'therapy_program',
                        'intensity': 'high',
                        'frequency_min': 4,
                        'priority': 'urgent'
                    },
                    'priority': 10,
                    'confidence_weight': 0.9,
                    'is_mandatory': True
                },
                {
                    'name': 'قاعدة التقدم البطيء',
                    'description': 'إذا كان معدل التقدم أقل من 10% شهرياً، يجب مراجعة الخطة العلاجية',
                    'rule_type': 'progress_based',
                    'conditions': {
                        'progress_rate_threshold': 10,
                        'time_period': 'monthly',
                        'consecutive_periods': 2
                    },
                    'actions': {
                        'action_type': 'review_plan',
                        'alert_level': 'high',
                        'suggest_modifications': True
                    },
                    'priority': 8,
                    'confidence_weight': 0.85
                },
                {
                    'name': 'قاعدة التوصية بالتقييم الشامل',
                    'description': 'للحالات الجديدة أو المعقدة، يوصى بإجراء تقييم شامل متعدد التخصصات',
                    'rule_type': 'condition_based',
                    'conditions': {
                        'is_new_case': True,
                        'or_conditions': [
                            {'multiple_conditions': True},
                            {'severity_level': 'severe'},
                            {'previous_interventions_failed': True}
                        ]
                    },
                    'actions': {
                        'recommendation_type': 'assessment',
                        'assessment_type': 'comprehensive',
                        'team_required': 'multidisciplinary'
                    },
                    'priority': 9,
                    'confidence_weight': 0.95
                }
            ]
            
            for rule_data in rules_data:
                existing_rule = RecommendationRule.query.filter_by(name=rule_data['name']).first()
                if not existing_rule:
                    rule = RecommendationRule(
                        name=rule_data['name'],
                        description=rule_data['description'],
                        rule_type=rule_data['rule_type'],
                        conditions=json.dumps(rule_data['conditions']),
                        actions=json.dumps(rule_data['actions']),
                        priority=rule_data['priority'],
                        confidence_weight=rule_data['confidence_weight'],
                        is_mandatory=rule_data.get('is_mandatory', False),
                        created_by=random.choice(users).id if users else None
                    )
                    db.session.add(rule)
            
            print("✓ تم إضافة قواعد التوصيات")
            
            db.session.commit()
            
            # 4. إضافة توصيات تجريبية للطلاب
            from models import Student
            
            students = Student.query.limit(8).all()
            engines = TherapyRecommendationEngine.query.all()
            
            if students and engines:
                recommendations_data = [
                    {
                        'type': 'therapy_program',
                        'title': 'برنامج تطوير المهارات الحركية الدقيقة',
                        'description': 'برنامج مكثف لتحسين التناسق الحركي والمهارات الحركية الدقيقة',
                        'rationale': 'تحليل البيانات يشير إلى ضعف في المهارات الحركية الدقيقة مما يؤثر على الأنشطة اليومية',
                        'priority': 'high',
                        'confidence': 0.88,
                        'target_skills': ['التناسق الحركي', 'الإمساك بالقلم', 'المهارات الحركية الدقيقة'],
                        'expected_outcomes': ['تحسن 30% في دقة الحركات', 'زيادة الاستقلالية في الأنشطة اليومية'],
                        'duration': 10,
                        'frequency': 3,
                        'session_duration': 45
                    },
                    {
                        'type': 'intervention',
                        'title': 'برنامج تعديل السلوك للتفاعل الاجتماعي',
                        'description': 'تدخل سلوكي لتحسين مهارات التفاعل الاجتماعي وتقليل السلوكيات التجنبية',
                        'rationale': 'ملاحظات السلوك تظهر تجنب للتفاعل الاجتماعي مما يؤثر على التطور الاجتماعي',
                        'priority': 'medium',
                        'confidence': 0.82,
                        'target_skills': ['التفاعل الاجتماعي', 'التواصل غير اللفظي', 'اللعب التعاوني'],
                        'expected_outcomes': ['زيادة المبادرة في التفاعل', 'تحسن في اللعب مع الأقران'],
                        'duration': 12,
                        'frequency': 2,
                        'session_duration': 60
                    },
                    {
                        'type': 'assessment',
                        'title': 'تقييم شامل للمهارات المعرفية',
                        'description': 'تقييم متعمق للقدرات المعرفية وأساليب التعلم المفضلة',
                        'rationale': 'الحاجة لفهم أفضل للملف المعرفي لتطوير استراتيجيات تعليمية مناسبة',
                        'priority': 'medium',
                        'confidence': 0.75,
                        'target_skills': ['التقييم المعرفي', 'أساليب التعلم', 'نقاط القوة والضعف'],
                        'expected_outcomes': ['فهم أعمق للقدرات', 'خطة تعليمية مخصصة'],
                        'duration': 3,
                        'frequency': 1,
                        'session_duration': 90
                    }
                ]
                
                for i, student in enumerate(students):
                    # إنشاء 1-3 توصيات لكل طالب
                    num_recommendations = random.randint(1, 3)
                    student_recommendations = random.sample(recommendations_data, min(num_recommendations, len(recommendations_data)))
                    
                    for rec_data in student_recommendations:
                        recommendation = TherapyRecommendation(
                            student_id=student.id,
                            recommendation_engine_id=random.choice(engines).id,
                            recommendation_type=rec_data['type'],
                            title=rec_data['title'],
                            description=rec_data['description'],
                            rationale=rec_data['rationale'],
                            priority_level=rec_data['priority'],
                            confidence_score=rec_data['confidence'],
                            target_skills=json.dumps(rec_data['target_skills']),
                            expected_outcomes=json.dumps(rec_data['expected_outcomes']),
                            implementation_steps=json.dumps([
                                'تقييم أولي مفصل',
                                'وضع أهداف قابلة للقياس',
                                'تنفيذ الجلسات وفقاً للخطة',
                                'مراقبة التقدم أسبوعياً',
                                'تعديل الخطة حسب الحاجة',
                                'تقييم نهائي وتوصيات المتابعة'
                            ]),
                            required_resources=json.dumps([
                                'أخصائي مدرب ومؤهل',
                                'أدوات ومواد تعليمية مناسبة',
                                'بيئة علاجية محفزة',
                                'تعاون الأسرة والمدرسة'
                            ]),
                            estimated_duration=rec_data['duration'],
                            frequency_per_week=rec_data['frequency'],
                            session_duration=rec_data['session_duration'],
                            success_metrics=json.dumps([
                                'تحسن قابل للقياس في المهارات المستهدفة',
                                'زيادة الاستقلالية في الأنشطة',
                                'تحسن في جودة الحياة',
                                'رضا الأسرة عن التقدم'
                            ]),
                            status=random.choice(['pending', 'approved', 'implemented']),
                            generated_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
                        )
                        
                        # إضافة تواريخ للتوصيات المنفذة
                        if recommendation.status in ['approved', 'implemented']:
                            recommendation.reviewed_by = random.choice(users).id
                            recommendation.reviewed_at = recommendation.generated_at + timedelta(days=random.randint(1, 5))
                            
                            if recommendation.status == 'implemented':
                                recommendation.implementation_date = recommendation.reviewed_at + timedelta(days=random.randint(1, 7))
                        
                        db.session.add(recommendation)
                
                print("✓ تم إضافة التوصيات التجريبية للطلاب")
            
            db.session.commit()
            
            # 5. إضافة تقييمات وملاحظات للتوصيات
            recommendations = TherapyRecommendation.query.filter(
                TherapyRecommendation.status.in_(['implemented', 'approved'])
            ).all()
            
            if recommendations and users:
                feedback_types = ['effectiveness', 'satisfaction', 'progress', 'concerns']
                evaluator_roles = ['therapist', 'parent', 'teacher']
                
                for recommendation in recommendations[:15]:  # إضافة تقييمات لأول 15 توصية
                    # إضافة 1-3 تقييمات لكل توصية
                    num_feedback = random.randint(1, 3)
                    
                    for _ in range(num_feedback):
                        feedback = RecommendationFeedback(
                            recommendation_id=recommendation.id,
                            evaluator_id=random.choice(users).id,
                            evaluator_role=random.choice(evaluator_roles),
                            feedback_type=random.choice(feedback_types),
                            rating=random.uniform(3.0, 5.0),
                            feedback_text=random.choice([
                                'التوصية مفيدة جداً وأظهرت نتائج إيجابية',
                                'هناك تحسن ملحوظ في المهارات المستهدفة',
                                'الطفل يستجيب بشكل جيد للبرنامج',
                                'نحتاج لتعديل بعض الأنشطة لتناسب احتياجات الطفل',
                                'النتائج مشجعة ونوصي بالاستمرار'
                            ]),
                            observed_improvements=json.dumps([
                                'تحسن في التركيز',
                                'زيادة المشاركة',
                                'تطور في المهارات المستهدفة'
                            ]),
                            would_recommend=random.choice([True, True, True, False]),  # 75% إيجابي
                            feedback_date=datetime.utcnow() - timedelta(days=random.randint(1, 20))
                        )
                        db.session.add(feedback)
                
                print("✓ تم إضافة التقييمات والملاحظات")
            
            # 6. إضافة مقاييس الأداء
            if recommendations and users:
                metric_types = ['progress', 'engagement', 'satisfaction', 'outcome']
                metric_names = [
                    'درجة إتقان المهارة',
                    'مستوى المشاركة',
                    'رضا الأسرة',
                    'تحسن السلوك',
                    'الاستقلالية في المهام'
                ]
                
                for recommendation in recommendations[:10]:  # إضافة مقاييس لأول 10 توصيات
                    # إضافة 2-4 مقاييس لكل توصية
                    num_metrics = random.randint(2, 4)
                    
                    for _ in range(num_metrics):
                        baseline = random.uniform(20.0, 50.0)
                        current = baseline + random.uniform(10.0, 40.0)
                        target = baseline + random.uniform(30.0, 60.0)
                        
                        metric = RecommendationMetrics(
                            recommendation_id=recommendation.id,
                            metric_type=random.choice(metric_types),
                            metric_name=random.choice(metric_names),
                            baseline_value=baseline,
                            current_value=current,
                            target_value=target,
                            improvement_percentage=((current - baseline) / baseline) * 100,
                            measurement_date=datetime.utcnow() - timedelta(days=random.randint(1, 15)),
                            measurement_method=random.choice([
                                'ملاحظة مباشرة',
                                'تقييم معياري',
                                'استبيان الأسرة',
                                'تقرير المعلم'
                            ]),
                            measured_by=random.choice(users).id
                        )
                        db.session.add(metric)
                
                print("✓ تم إضافة مقاييس الأداء")
            
            db.session.commit()
            print("✅ تم إضافة جميع البيانات التجريبية لنظام التوصيات الذكية للبرامج العلاجية بنجاح!")
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
            db.session.rollback()
            raise e

if __name__ == '__main__':
    add_smart_therapy_recommendations_sample_data()
