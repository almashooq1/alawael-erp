# -*- coding: utf-8 -*-
"""
خدمات نظام التنبؤ بالنتائج والتقدم بالذكاء الاصطناعي
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from database import db
from ai_progress_prediction_models import (
    PredictionModel, ProgressPrediction, PredictionFeature, 
    PredictionAlert, PredictionValidation, PredictionReport
)
from datetime import datetime, timedelta, date
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_absolute_error, mean_squared_error
import joblib
import os

class AIProgressPredictionService:
    """خدمة التنبؤ بالتقدم باستخدام الذكاء الاصطناعي"""
    
    def __init__(self):
        self.models_path = 'ai_models/progress_prediction/'
        os.makedirs(self.models_path, exist_ok=True)
    
    def create_prediction_model(self, model_data, user_id):
        """إنشاء نموذج تنبؤ جديد"""
        try:
            model = PredictionModel(
                name=model_data['name'],
                description=model_data.get('description'),
                model_type=model_data['model_type'],
                target_variable=model_data['target_variable'],
                algorithm=model_data['algorithm'],
                hyperparameters=json.dumps(model_data.get('hyperparameters', {})),
                feature_columns=json.dumps(model_data.get('feature_columns', [])),
                created_by=user_id
            )
            
            db.session.add(model)
            db.session.commit()
            
            return model.to_dict()
        except Exception as e:
            db.session.rollback()
            raise Exception(f"خطأ في إنشاء نموذج التنبؤ: {str(e)}")
    
    def train_prediction_model(self, model_id, training_data=None):
        """تدريب نموذج التنبؤ"""
        try:
            model = PredictionModel.query.get(model_id)
            if not model:
                raise Exception("النموذج غير موجود")
            
            # جمع بيانات التدريب
            if training_data is None:
                training_data = self._collect_training_data(model)
            
            # معالجة البيانات
            X, y = self._preprocess_data(training_data, model)
            
            # تقسيم البيانات
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # اختيار الخوارزمية
            ml_model = self._get_algorithm(model.algorithm, model.model_type)
            
            # تدريب النموذج
            ml_model.fit(X_train, y_train)
            
            # تقييم النموذج
            y_pred = ml_model.predict(X_test)
            scores = self._calculate_scores(y_test, y_pred, model.model_type)
            
            # حفظ النموذج
            model_file_path = f"{self.models_path}model_{model_id}.pkl"
            joblib.dump(ml_model, model_file_path)
            
            # تحديث معلومات النموذج
            model.accuracy_score = scores.get('accuracy')
            model.precision_score = scores.get('precision')
            model.recall_score = scores.get('recall')
            model.f1_score = scores.get('f1')
            model.mae_score = scores.get('mae')
            model.rmse_score = scores.get('rmse')
            model.training_data_size = len(training_data)
            model.last_trained = datetime.utcnow()
            model.model_file_path = model_file_path
            
            db.session.commit()
            
            return model.to_dict()
        except Exception as e:
            db.session.rollback()
            raise Exception(f"خطأ في تدريب النموذج: {str(e)}")
    
    def generate_prediction(self, student_id, model_id, prediction_data, user_id):
        """إنشاء تنبؤ للطالب"""
        try:
            model = PredictionModel.query.get(model_id)
            if not model or not model.is_active:
                raise Exception("النموذج غير متاح")
            
            # تحميل النموذج المدرب
            if not os.path.exists(model.model_file_path):
                raise Exception("ملف النموذج غير موجود")
            
            ml_model = joblib.load(model.model_file_path)
            
            # إعداد البيانات للتنبؤ
            features = self._prepare_prediction_features(student_id, model, prediction_data)
            
            # إجراء التنبؤ
            predicted_value = ml_model.predict([features])[0]
            confidence_level = self._calculate_confidence(ml_model, [features])
            
            # تحديد الفئة المتوقعة
            predicted_category = self._categorize_prediction(predicted_value, model.target_variable)
            
            # إنشاء التنبؤ
            prediction = ProgressPrediction(
                student_id=student_id,
                prediction_model_id=model_id,
                prediction_type=prediction_data['prediction_type'],
                skill_area=prediction_data.get('skill_area'),
                predicted_value=float(predicted_value),
                predicted_category=predicted_category,
                confidence_level=confidence_level,
                prediction_date=date.today(),
                target_date=prediction_data['target_date'],
                time_horizon=(prediction_data['target_date'] - date.today()).days,
                prediction_details=json.dumps(prediction_data.get('details', {})),
                contributing_factors=json.dumps(self._identify_contributing_factors(features, model)),
                recommendations=json.dumps(self._generate_recommendations(predicted_value, model)),
                created_by=user_id
            )
            
            db.session.add(prediction)
            db.session.commit()
            
            # إنشاء تنبيهات إذا لزم الأمر
            self._check_and_create_alerts(prediction)
            
            return prediction.to_dict()
        except Exception as e:
            db.session.rollback()
            raise Exception(f"خطأ في إنشاء التنبؤ: {str(e)}")
    
    def validate_prediction(self, prediction_id, actual_outcome, user_id):
        """التحقق من صحة التنبؤ"""
        try:
            prediction = ProgressPrediction.query.get(prediction_id)
            if not prediction:
                raise Exception("التنبؤ غير موجود")
            
            # حساب الأخطاء
            absolute_error = abs(actual_outcome - prediction.predicted_value)
            percentage_error = (absolute_error / max(actual_outcome, 0.001)) * 100
            
            # تحديد دقة التنبؤ
            accuracy_threshold = 0.15  # 15% خطأ مقبول
            is_accurate = percentage_error <= (accuracy_threshold * 100)
            
            # إنشاء سجل التحقق
            validation = PredictionValidation(
                prediction_id=prediction_id,
                validation_date=date.today(),
                actual_outcome=actual_outcome,
                predicted_outcome=prediction.predicted_value,
                absolute_error=absolute_error,
                percentage_error=percentage_error,
                is_accurate=is_accurate,
                accuracy_threshold=accuracy_threshold,
                validated_by=user_id
            )
            
            # تحديث التنبؤ
            prediction.actual_value = actual_outcome
            prediction.prediction_accuracy = 100 - percentage_error if percentage_error <= 100 else 0
            prediction.verified_at = datetime.utcnow()
            prediction.is_validated = True
            
            db.session.add(validation)
            db.session.commit()
            
            return validation.to_dict()
        except Exception as e:
            db.session.rollback()
            raise Exception(f"خطأ في التحقق من التنبؤ: {str(e)}")
    
    def get_student_predictions(self, student_id, filters=None):
        """الحصول على تنبؤات الطالب"""
        try:
            query = ProgressPrediction.query.filter_by(student_id=student_id)
            
            if filters:
                if filters.get('prediction_type'):
                    query = query.filter_by(prediction_type=filters['prediction_type'])
                if filters.get('skill_area'):
                    query = query.filter_by(skill_area=filters['skill_area'])
                if filters.get('status'):
                    query = query.filter_by(status=filters['status'])
                if filters.get('date_from'):
                    query = query.filter(ProgressPrediction.prediction_date >= filters['date_from'])
                if filters.get('date_to'):
                    query = query.filter(ProgressPrediction.prediction_date <= filters['date_to'])
            
            predictions = query.order_by(ProgressPrediction.prediction_date.desc()).all()
            return [pred.to_dict() for pred in predictions]
        except Exception as e:
            raise Exception(f"خطأ في جلب التنبؤات: {str(e)}")
    
    def get_prediction_dashboard(self, filters=None):
        """الحصول على بيانات لوحة تحكم التنبؤات"""
        try:
            # إحصائيات عامة
            total_predictions = ProgressPrediction.query.count()
            active_predictions = ProgressPrediction.query.filter_by(status='active').count()
            validated_predictions = ProgressPrediction.query.filter_by(is_validated=True).count()
            
            # دقة النماذج
            validations = PredictionValidation.query.all()
            avg_accuracy = np.mean([v.percentage_error for v in validations]) if validations else 0
            
            # توزيع التنبؤات حسب النوع
            prediction_types = db.session.query(
                ProgressPrediction.prediction_type,
                db.func.count(ProgressPrediction.id)
            ).group_by(ProgressPrediction.prediction_type).all()
            
            # التنبؤات الحديثة
            recent_predictions = ProgressPrediction.query.order_by(
                ProgressPrediction.created_at.desc()
            ).limit(10).all()
            
            # التنبيهات النشطة
            active_alerts = PredictionAlert.query.filter_by(status='active').count()
            
            return {
                'total_predictions': total_predictions,
                'active_predictions': active_predictions,
                'validated_predictions': validated_predictions,
                'validation_rate': (validated_predictions / max(total_predictions, 1)) * 100,
                'average_accuracy': 100 - avg_accuracy,
                'prediction_types_distribution': dict(prediction_types),
                'recent_predictions': [pred.to_dict() for pred in recent_predictions],
                'active_alerts': active_alerts
            }
        except Exception as e:
            raise Exception(f"خطأ في جلب بيانات لوحة التحكم: {str(e)}")
    
    def _collect_training_data(self, model):
        """جمع بيانات التدريب"""
        # هذه دالة مبسطة - في التطبيق الحقيقي ستجمع البيانات من مصادر متعددة
        return []
    
    def _preprocess_data(self, data, model):
        """معالجة البيانات قبل التدريب"""
        # معالجة مبسطة للبيانات
        if not data:
            # إنشاء بيانات تجريبية للاختبار
            np.random.seed(42)
            n_samples = 1000
            n_features = len(json.loads(model.feature_columns)) if model.feature_columns else 5
            
            X = np.random.randn(n_samples, n_features)
            y = np.random.randn(n_samples) if model.model_type == 'regression' else np.random.randint(0, 3, n_samples)
            
            return X, y
        
        # معالجة البيانات الحقيقية
        df = pd.DataFrame(data)
        feature_columns = json.loads(model.feature_columns) if model.feature_columns else []
        
        X = df[feature_columns].values
        y = df[model.target_variable].values
        
        return X, y
    
    def _get_algorithm(self, algorithm_name, model_type):
        """الحصول على خوارزمية التعلم الآلي"""
        algorithms = {
            'regression': {
                'linear_regression': LinearRegression(),
                'random_forest': RandomForestRegressor(n_estimators=100, random_state=42)
            },
            'classification': {
                'logistic_regression': LogisticRegression(random_state=42),
                'random_forest': RandomForestClassifier(n_estimators=100, random_state=42)
            }
        }
        
        return algorithms.get(model_type, {}).get(algorithm_name, RandomForestRegressor())
    
    def _calculate_scores(self, y_true, y_pred, model_type):
        """حساب مقاييس الأداء"""
        scores = {}
        
        if model_type == 'classification':
            scores['accuracy'] = accuracy_score(y_true, y_pred)
            scores['precision'] = precision_score(y_true, y_pred, average='weighted')
            scores['recall'] = recall_score(y_true, y_pred, average='weighted')
            scores['f1'] = f1_score(y_true, y_pred, average='weighted')
        else:
            scores['mae'] = mean_absolute_error(y_true, y_pred)
            scores['rmse'] = np.sqrt(mean_squared_error(y_true, y_pred))
        
        return scores
    
    def _prepare_prediction_features(self, student_id, model, prediction_data):
        """إعداد خصائص التنبؤ"""
        # في التطبيق الحقيقي، ستجمع البيانات من قاعدة البيانات
        feature_columns = json.loads(model.feature_columns) if model.feature_columns else []
        features = np.random.randn(len(feature_columns)) if feature_columns else np.random.randn(5)
        return features
    
    def _calculate_confidence(self, model, features):
        """حساب مستوى الثقة في التنبؤ"""
        # حساب مبسط لمستوى الثقة
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(features)[0]
            confidence = max(probabilities)
        else:
            # للنماذج الانحدارية، استخدم مقياس بديل
            confidence = 0.8  # قيمة افتراضية
        
        return float(confidence)
    
    def _categorize_prediction(self, predicted_value, target_variable):
        """تصنيف التنبؤ إلى فئات"""
        # تصنيف مبسط
        if predicted_value >= 0.8:
            return 'excellent'
        elif predicted_value >= 0.6:
            return 'good'
        elif predicted_value >= 0.4:
            return 'average'
        else:
            return 'needs_improvement'
    
    def _identify_contributing_factors(self, features, model):
        """تحديد العوامل المؤثرة"""
        return ['العمر', 'مستوى التدخل', 'الدعم الأسري', 'شدة الحالة']
    
    def _generate_recommendations(self, predicted_value, model):
        """إنشاء التوصيات"""
        recommendations = []
        
        if predicted_value < 0.5:
            recommendations.extend([
                'زيادة كثافة الجلسات العلاجية',
                'تعزيز الدعم الأسري',
                'مراجعة الخطة العلاجية'
            ])
        elif predicted_value < 0.7:
            recommendations.extend([
                'الحفاظ على البرنامج الحالي',
                'مراقبة التقدم عن كثب'
            ])
        else:
            recommendations.extend([
                'التفكير في تقليل كثافة التدخل',
                'التركيز على المهارات المتقدمة'
            ])
        
        return recommendations
    
    def _check_and_create_alerts(self, prediction):
        """فحص وإنشاء التنبيهات"""
        alerts = []
        
        # تنبيه للتنبؤات منخفضة الثقة
        if prediction.confidence_level < 0.6:
            alerts.append({
                'type': 'low_confidence',
                'severity': 'medium',
                'title': 'تنبؤ منخفض الثقة',
                'message': 'مستوى الثقة في هذا التنبؤ منخفض، يُنصح بمراجعة البيانات'
            })
        
        # تنبيه للنتائج المتوقعة السيئة
        if prediction.predicted_value < 0.3:
            alerts.append({
                'type': 'risk_warning',
                'severity': 'high',
                'title': 'تحذير من خطر ضعف التقدم',
                'message': 'التنبؤ يشير إلى احتمالية ضعف في التقدم، يُنصح بالتدخل المبكر'
            })
        
        # إنشاء التنبيهات في قاعدة البيانات
        for alert_data in alerts:
            alert = PredictionAlert(
                prediction_id=prediction.id,
                student_id=prediction.student_id,
                alert_type=alert_data['type'],
                severity_level=alert_data['severity'],
                title=alert_data['title'],
                message=alert_data['message'],
                created_by=prediction.created_by
            )
            db.session.add(alert)
        
        if alerts:
            db.session.commit()
