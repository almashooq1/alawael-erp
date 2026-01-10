# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام التنبؤ بالنتائج والتقدم بالذكاء الاصطناعي
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from database import db
from ai_progress_prediction_models import (
    PredictionModel, ProgressPrediction, PredictionFeature,
    PredictionAlert, PredictionValidation, PredictionReport
)
from datetime import datetime, timedelta, date
import json
import random
import numpy as np

def add_ai_progress_prediction_sample_data():
    """إضافة بيانات تجريبية لنظام التنبؤ بالنتائج والتقدم"""
    
    with app.app_context():
        try:
            print("بدء إضافة البيانات التجريبية لنظام التنبؤ بالذكاء الاصطناعي...")
            
            from models import User, Student
            users = User.query.limit(5).all()
            students = Student.query.limit(10).all()
            
            # 1. إضافة خصائص التنبؤ
            features_data = [
                {
                    'name': 'العمر الزمني',
                    'description': 'عمر الطالب بالسنوات',
                    'feature_type': 'numerical',
                    'data_source': 'student_profile',
                    'category': 'demographic',
                    'importance_score': 0.8,
                    'correlation_score': 0.6,
                    'preprocessing_method': 'normalization',
                    'is_required': True
                },
                {
                    'name': 'شدة الحالة',
                    'description': 'مستوى شدة الإعاقة أو الاضطراب',
                    'feature_type': 'categorical',
                    'data_source': 'assessments',
                    'category': 'clinical',
                    'importance_score': 0.9,
                    'correlation_score': -0.7,
                    'preprocessing_method': 'encoding',
                    'is_required': True
                },
                {
                    'name': 'عدد ساعات التدخل أسبوعياً',
                    'description': 'إجمالي ساعات الجلسات العلاجية أسبوعياً',
                    'feature_type': 'numerical',
                    'data_source': 'therapy_sessions',
                    'category': 'therapeutic',
                    'importance_score': 0.85,
                    'correlation_score': 0.75,
                    'preprocessing_method': 'standardization'
                },
                {
                    'name': 'مستوى الدعم الأسري',
                    'description': 'تقييم مستوى مشاركة ودعم الأسرة',
                    'feature_type': 'categorical',
                    'data_source': 'family_assessments',
                    'category': 'environmental',
                    'importance_score': 0.7,
                    'correlation_score': 0.6,
                    'preprocessing_method': 'encoding'
                },
                {
                    'name': 'النتائج السابقة',
                    'description': 'متوسط النتائج في التقييمات السابقة',
                    'feature_type': 'numerical',
                    'data_source': 'assessments',
                    'category': 'academic',
                    'importance_score': 0.95,
                    'correlation_score': 0.85,
                    'preprocessing_method': 'normalization'
                },
                {
                    'name': 'مدة الالتحاق بالمركز',
                    'description': 'عدد الأشهر منذ بداية الالتحاق',
                    'feature_type': 'numerical',
                    'data_source': 'enrollment_records',
                    'category': 'temporal',
                    'importance_score': 0.6,
                    'correlation_score': 0.4,
                    'preprocessing_method': 'normalization'
                }
            ]
            
            for feature_data in features_data:
                existing_feature = PredictionFeature.query.filter_by(name=feature_data['name']).first()
                if not existing_feature:
                    feature = PredictionFeature(
                        name=feature_data['name'],
                        description=feature_data['description'],
                        feature_type=feature_data['feature_type'],
                        data_source=feature_data['data_source'],
                        category=feature_data['category'],
                        importance_score=feature_data['importance_score'],
                        correlation_score=feature_data['correlation_score'],
                        preprocessing_method=feature_data['preprocessing_method'],
                        missing_value_strategy='mean',
                        is_required=feature_data.get('is_required', False),
                        created_by=random.choice(users).id if users else None
                    )
                    db.session.add(feature)
            
            print("✓ تم إضافة خصائص التنبؤ")
            
            # 2. إضافة نماذج التنبؤ
            models_data = [
                {
                    'name': 'نموذج التنبؤ بتحسن المهارات الحركية',
                    'description': 'نموذج للتنبؤ بمستوى التحسن في المهارات الحركية الدقيقة والإجمالية',
                    'model_type': 'regression',
                    'target_variable': 'motor_skills_improvement',
                    'algorithm': 'random_forest',
                    'hyperparameters': {
                        'n_estimators': 100,
                        'max_depth': 10,
                        'min_samples_split': 5,
                        'random_state': 42
                    },
                    'feature_columns': ['age', 'severity_level', 'therapy_hours', 'family_support', 'baseline_score'],
                    'accuracy_score': 0.87,
                    'mae_score': 0.12,
                    'rmse_score': 0.18
                },
                {
                    'name': 'نموذج التنبؤ بالتقدم في التواصل',
                    'description': 'نموذج للتنبؤ بمستوى التحسن في مهارات التواصل اللفظي وغير اللفظي',
                    'model_type': 'regression',
                    'target_variable': 'communication_progress',
                    'algorithm': 'linear_regression',
                    'hyperparameters': {
                        'fit_intercept': True,
                        'normalize': False
                    },
                    'feature_columns': ['age', 'severity_level', 'therapy_hours', 'family_support', 'enrollment_duration'],
                    'accuracy_score': 0.82,
                    'mae_score': 0.15,
                    'rmse_score': 0.21
                },
                {
                    'name': 'نموذج تصنيف مستوى التحسن السلوكي',
                    'description': 'نموذج لتصنيف مستوى التحسن السلوكي إلى فئات',
                    'model_type': 'classification',
                    'target_variable': 'behavior_improvement_category',
                    'algorithm': 'random_forest',
                    'hyperparameters': {
                        'n_estimators': 150,
                        'max_depth': 8,
                        'min_samples_split': 3
                    },
                    'feature_columns': ['age', 'severity_level', 'therapy_hours', 'family_support', 'baseline_score'],
                    'accuracy_score': 0.89,
                    'precision_score': 0.88,
                    'recall_score': 0.87,
                    'f1_score': 0.87
                }
            ]
            
            for model_data in models_data:
                existing_model = PredictionModel.query.filter_by(name=model_data['name']).first()
                if not existing_model:
                    model = PredictionModel(
                        name=model_data['name'],
                        description=model_data['description'],
                        model_type=model_data['model_type'],
                        target_variable=model_data['target_variable'],
                        algorithm=model_data['algorithm'],
                        hyperparameters=json.dumps(model_data['hyperparameters']),
                        feature_columns=json.dumps(model_data['feature_columns']),
                        accuracy_score=model_data.get('accuracy_score'),
                        precision_score=model_data.get('precision_score'),
                        recall_score=model_data.get('recall_score'),
                        f1_score=model_data.get('f1_score'),
                        mae_score=model_data.get('mae_score'),
                        rmse_score=model_data.get('rmse_score'),
                        training_data_size=random.randint(500, 2000),
                        training_period_start=date.today() - timedelta(days=random.randint(180, 365)),
                        training_period_end=date.today() - timedelta(days=random.randint(30, 90)),
                        last_trained=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                        version='1.0',
                        model_file_path=f'ai_models/progress_prediction/model_{random.randint(1000, 9999)}.pkl',
                        created_by=random.choice(users).id if users else None
                    )
                    db.session.add(model)
            
            print("✓ تم إضافة نماذج التنبؤ")
            
            db.session.commit()
            
            # 3. إضافة تنبؤات للطلاب
            models = PredictionModel.query.all()
            
            if students and models:
                prediction_types = ['skill_progress', 'behavior_improvement', 'academic_achievement']
                skill_areas = ['motor_skills', 'communication', 'cognitive', 'social', 'academic']
                
                for student in students:
                    # إنشاء 2-5 تنبؤات لكل طالب
                    num_predictions = random.randint(2, 5)
                    
                    for _ in range(num_predictions):
                        model = random.choice(models)
                        prediction_date = date.today() - timedelta(days=random.randint(1, 60))
                        target_date = prediction_date + timedelta(days=random.randint(30, 180))
                        
                        # قيم التنبؤ
                        predicted_value = random.uniform(0.2, 0.95)
                        confidence_level = random.uniform(0.6, 0.95)
                        
                        # تحديد الفئة بناءً على القيمة
                        if predicted_value >= 0.8:
                            predicted_category = 'excellent'
                        elif predicted_value >= 0.6:
                            predicted_category = 'good'
                        elif predicted_value >= 0.4:
                            predicted_category = 'average'
                        else:
                            predicted_category = 'needs_improvement'
                        
                        prediction = ProgressPrediction(
                            student_id=student.id,
                            prediction_model_id=model.id,
                            prediction_type=random.choice(prediction_types),
                            skill_area=random.choice(skill_areas),
                            predicted_value=predicted_value,
                            predicted_category=predicted_category,
                            confidence_level=confidence_level,
                            prediction_date=prediction_date,
                            target_date=target_date,
                            time_horizon=(target_date - prediction_date).days,
                            prediction_details=json.dumps({
                                'model_version': model.version,
                                'feature_importance': {
                                    'baseline_score': 0.35,
                                    'therapy_hours': 0.28,
                                    'family_support': 0.20,
                                    'age': 0.17
                                }
                            }),
                            contributing_factors=json.dumps([
                                'مستوى الدعم الأسري',
                                'كثافة الجلسات العلاجية',
                                'النتائج الأساسية',
                                'عمر الطالب'
                            ]),
                            recommendations=json.dumps([
                                'الحفاظ على البرنامج الحالي' if predicted_value > 0.6 else 'زيادة كثافة التدخل',
                                'تعزيز الدعم الأسري',
                                'مراقبة التقدم دورياً'
                            ]),
                            status=random.choice(['active', 'active', 'active', 'verified']),
                            created_by=random.choice(users).id if users else None
                        )
                        
                        # إضافة نتائج فعلية لبعض التنبؤات
                        if prediction.status == 'verified':
                            prediction.actual_value = predicted_value + random.uniform(-0.2, 0.2)
                            prediction.actual_category = predicted_category
                            prediction.prediction_accuracy = max(0, 100 - abs(prediction.actual_value - predicted_value) * 100)
                            prediction.verified_at = datetime.utcnow() - timedelta(days=random.randint(1, 30))
                            prediction.is_validated = True
                        
                        db.session.add(prediction)
                
                print("✓ تم إضافة التنبؤات للطلاب")
            
            db.session.commit()
            
            # 4. إضافة التحققات والتنبيهات
            verified_predictions = ProgressPrediction.query.filter_by(is_validated=True).all()
            
            for prediction in verified_predictions[:10]:  # أول 10 تنبؤات محققة
                # إضافة سجل التحقق
                absolute_error = abs(prediction.actual_value - prediction.predicted_value)
                percentage_error = (absolute_error / max(prediction.actual_value, 0.001)) * 100
                
                validation = PredictionValidation(
                    prediction_id=prediction.id,
                    validation_date=prediction.verified_at.date(),
                    actual_outcome=prediction.actual_value,
                    predicted_outcome=prediction.predicted_value,
                    absolute_error=absolute_error,
                    percentage_error=percentage_error,
                    is_accurate=percentage_error <= 15,
                    accuracy_threshold=0.15,
                    error_analysis=json.dumps({
                        'error_type': 'overestimation' if prediction.predicted_value > prediction.actual_value else 'underestimation',
                        'possible_causes': ['تغيرات في الظروف الأسرية', 'عوامل خارجية غير متوقعة']
                    }),
                    validated_by=random.choice(users).id if users else None,
                    validation_notes='تم التحقق من التنبؤ وتسجيل النتائج الفعلية'
                )
                db.session.add(validation)
            
            # إضافة تنبيهات
            active_predictions = ProgressPrediction.query.filter_by(status='active').all()
            
            for prediction in active_predictions[:15]:  # أول 15 تنبؤ نشط
                # إنشاء تنبيهات بناءً على التنبؤ
                alerts = []
                
                if prediction.confidence_level < 0.7:
                    alerts.append({
                        'type': 'low_confidence',
                        'severity': 'medium',
                        'title': 'تنبؤ منخفض الثقة',
                        'message': f'مستوى الثقة في التنبؤ {prediction.confidence_level:.0%} أقل من المستوى المطلوب'
                    })
                
                if prediction.predicted_value < 0.4:
                    alerts.append({
                        'type': 'risk_warning',
                        'severity': 'high',
                        'title': 'تحذير من خطر ضعف التقدم',
                        'message': 'التنبؤ يشير إلى احتمالية ضعف في التقدم، يُنصح بالتدخل المبكر'
                    })
                
                if prediction.predicted_value > 0.85:
                    alerts.append({
                        'type': 'opportunity',
                        'severity': 'low',
                        'title': 'فرصة للتقدم المتميز',
                        'message': 'التنبؤ يشير إلى إمكانية تحقيق تقدم ممتاز'
                    })
                
                for alert_data in alerts:
                    alert = PredictionAlert(
                        prediction_id=prediction.id,
                        student_id=prediction.student_id,
                        alert_type=alert_data['type'],
                        severity_level=alert_data['severity'],
                        title=alert_data['title'],
                        message=alert_data['message'],
                        detailed_analysis='تحليل مفصل للعوامل المؤثرة على التنبؤ',
                        suggested_actions=json.dumps([
                            'مراجعة الخطة العلاجية',
                            'زيادة المتابعة',
                            'تعزيز الدعم الأسري'
                        ]),
                        priority_level=random.randint(1, 10),
                        trigger_date=datetime.utcnow() - timedelta(days=random.randint(1, 10)),
                        expiry_date=datetime.utcnow() + timedelta(days=random.randint(30, 90)),
                        created_by=random.choice(users).id if users else None
                    )
                    db.session.add(alert)
            
            print("✓ تم إضافة التحققات والتنبيهات")
            
            # 5. إضافة تقارير
            report_types = ['individual', 'group', 'model_performance', 'trend_analysis']
            
            for i in range(5):
                report = PredictionReport(
                    title=f'تقرير التنبؤات - {random.choice(["شهري", "ربع سنوي", "سنوي"])}',
                    description='تقرير شامل عن أداء نماذج التنبؤ ودقتها',
                    report_type=random.choice(report_types),
                    model_id=random.choice(models).id if models else None,
                    date_from=date.today() - timedelta(days=random.randint(30, 180)),
                    date_to=date.today(),
                    report_data=json.dumps({
                        'total_predictions': random.randint(50, 200),
                        'accuracy_rate': random.uniform(75, 95),
                        'improvement_trends': [
                            {'month': '2024-01', 'accuracy': 78},
                            {'month': '2024-02', 'accuracy': 82},
                            {'month': '2024-03', 'accuracy': 85}
                        ]
                    }),
                    summary_statistics=json.dumps({
                        'mean_accuracy': random.uniform(80, 90),
                        'std_accuracy': random.uniform(5, 15),
                        'best_model': random.choice(models).name if models else 'نموذج التنبؤ الأساسي'
                    }),
                    key_insights=json.dumps([
                        'تحسن ملحوظ في دقة التنبؤات',
                        'النماذج تؤدي بشكل أفضل مع البيانات الحديثة',
                        'الحاجة لمزيد من البيانات التدريبية'
                    ]),
                    recommendations=json.dumps([
                        'تحديث النماذج بانتظام',
                        'جمع المزيد من البيانات',
                        'تحسين جودة البيانات المدخلة'
                    ]),
                    status=random.choice(['generated', 'published']),
                    generated_by=random.choice(users).id if users else None,
                    generated_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
                )
                db.session.add(report)
            
            print("✓ تم إضافة التقارير")
            
            db.session.commit()
            print("✅ تم إضافة جميع البيانات التجريبية لنظام التنبؤ بالذكاء الاصطناعي بنجاح!")
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
            db.session.rollback()
            raise e

if __name__ == '__main__':
    add_ai_progress_prediction_sample_data()
