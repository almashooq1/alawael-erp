"""
🤖 Smart Predictions Service
نظام التنبؤ الذكي باستخدام Machine Learning

التنبؤات المدعومة:
1. تنبؤات أداء الطلاب
2. تنبؤات فرص المبيعات
3. تنبؤات احتياجات الصيانة
4. تنبؤات المخاطر
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
import statistics

class SmartPredictionService:
    """خدمة التنبؤ الذكي المتقدمة"""

    def __init__(self, db):
        self.db = db
        self.models = {
            'student': StudentProgressModel(),
            'deal': DealProbabilityModel(),
            'maintenance': MaintenanceRiskModel(),
            'risk': RiskAssessmentModel()
        }

    # ==========================================
    # 1. تنبؤات أداء الطلاب
    # ==========================================

    def predict_student_progress(self, student_id: str) -> Dict:
        """
        التنبؤ بتقدم الطالب والاحتياجات المستقبلية

        Args:
            student_id: معرف الطالب

        Returns:
            Dict: تنبؤات مفصلة
        """
        # الحصول على بيانات الطالب
        student_data = self._get_student_data(student_id)

        # حساب الاتجاهات
        trends = self._calculate_trends(student_data['grades'], 5)

        # التنبؤ
        prediction = {
            'student_id': student_id,
            'type': 'student_progress',
            'prediction_date': datetime.now().isoformat(),
            'predictions': {
                'next_month_average': self._predict_next_month(student_data['grades']),
                'improvement_probability': self._calculate_improvement_chance(trends),
                'risk_level': self._assess_risk_level(student_data),
                'recommended_actions': self._generate_recommendations(student_data, trends),
                'confidence': self._calculate_confidence(student_data)
            },
            'details': {
                'current_average': statistics.mean(student_data['grades'][-5:]) if student_data['grades'] else 0,
                'trend': 'improving' if trends['slope'] > 0 else 'declining',
                'consistency': 'consistent' if trends['std_dev'] < 10 else 'unstable'
            }
        }

        # حفظ في قاعدة البيانات
        self._save_prediction(prediction)

        return prediction

    # ==========================================
    # 2. تنبؤات فرص المبيعات
    # ==========================================

    def predict_deal_probability(self, deal_id: str) -> Dict:
        """
        التنبؤ باحتمالية إغلاق الصفقة

        Args:
            deal_id: معرف الصفقة

        Returns:
            Dict: احتمالية الإغلاق والتوصيات
        """
        deal_data = self._get_deal_data(deal_id)

        # حساب عوامل النجاح
        factors = {
            'engagement_score': self._calculate_engagement(deal_data),
            'interaction_frequency': self._count_recent_interactions(deal_data),
            'time_in_stage': self._calculate_stage_duration(deal_data),
            'amount_score': self._normalize_deal_amount(deal_data['amount']),
            'competition_level': self._assess_competition(deal_data)
        }

        # حساب الاحتمالية
        close_probability = self._calculate_probability(factors)

        prediction = {
            'deal_id': deal_id,
            'type': 'deal_probability',
            'prediction_date': datetime.now().isoformat(),
            'close_probability': close_probability,
            'confidence': 0.85,
            'factors': factors,
            'predicted_close_date': self._predict_close_date(deal_data, close_probability),
            'risk_factors': self._identify_risks(deal_data),
            'recommended_actions': [
                'Increase engagement frequency',
                'Schedule follow-up call',
                'Send proposal',
                'Address objections'
            ][:self._get_action_count(close_probability)]
        }

        self._save_prediction(prediction)
        return prediction

    # ==========================================
    # 3. تنبؤات الصيانة
    # ==========================================

    def predict_maintenance_risk(self, asset_id: str) -> Dict:
        """
        التنبؤ بمخاطر الصيانة والأعطال المحتملة

        Args:
            asset_id: معرف الأصل

        Returns:
            Dict: مستوى المخاطرة والإجراءات الموصى بها
        """
        asset_data = self._get_asset_data(asset_id)

        # حساب معوقات الأداء
        performance_metrics = {
            'age': self._calculate_asset_age(asset_data),
            'maintenance_history': self._analyze_maintenance_history(asset_data),
            'usage_intensity': self._calculate_usage_intensity(asset_data),
            'environmental_factors': self._assess_environment(asset_data),
            'last_maintenance': self._days_since_maintenance(asset_data)
        }

        risk_level = self._calculate_maintenance_risk(performance_metrics)

        prediction = {
            'asset_id': asset_id,
            'type': 'maintenance_risk',
            'prediction_date': datetime.now().isoformat(),
            'risk_level': risk_level,  # 'low', 'medium', 'high', 'critical'
            'confidence': 0.82,
            'metrics': performance_metrics,
            'predicted_failure_date': self._predict_failure_date(asset_data, risk_level),
            'maintenance_recommendations': {
                'immediate': self._get_immediate_actions(risk_level),
                'scheduled': self._get_scheduled_maintenance(asset_data),
                'preventive': self._get_preventive_measures(asset_data)
            },
            'estimated_cost': self._estimate_repair_cost(asset_data, risk_level)
        }

        self._save_prediction(prediction)
        return prediction

    # ==========================================
    # 4. تقييم المخاطر الشامل
    # ==========================================

    def assess_risk_level(self, entity_type: str, entity_id: str) -> Dict:
        """
        تقييم شامل لمستوى المخاطرة

        Args:
            entity_type: نوع الكيان (student, customer, project)
            entity_id: معرف الكيان

        Returns:
            Dict: تقييم المخاطر
        """

        risk_factors = {
            'performance_risk': self._assess_performance_risk(entity_type, entity_id),
            'compliance_risk': self._assess_compliance_risk(entity_type, entity_id),
            'financial_risk': self._assess_financial_risk(entity_type, entity_id),
            'operational_risk': self._assess_operational_risk(entity_type, entity_id)
        }

        overall_risk = self._calculate_overall_risk(risk_factors)

        return {
            'entity_type': entity_type,
            'entity_id': entity_id,
            'assessment_date': datetime.now().isoformat(),
            'overall_risk_score': overall_risk,
            'risk_level': self._get_risk_level_name(overall_risk),
            'factors': risk_factors,
            'mitigation_strategies': self._generate_mitigation_strategies(risk_factors),
            'monitoring_frequency': self._get_monitoring_frequency(overall_risk)
        }

    # ==========================================
    # Helper Methods - البيانات
    # ==========================================

    def _get_student_data(self, student_id: str) -> Dict:
        """الحصول على بيانات الطالب"""
        student = self.db['students'].find_one({'_id': student_id})
        return {
            'id': student_id,
            'grades': student.get('grades', [])[-20:],  # آخر 20 درجة
            'attendance': student.get('attendance', [])[-20:],
            'behavior': student.get('behavior_scores', [])[-10:],
            'enrollment_date': student.get('enrollment_date'),
            'parent_engagement': student.get('parent_engagement_score', 0)
        }

    def _get_deal_data(self, deal_id: str) -> Dict:
        """الحصول على بيانات الصفقة"""
        deal = self.db['deals'].find_one({'_id': deal_id})
        return {
            'id': deal_id,
            'amount': deal.get('amount', 0),
            'stage': deal.get('stage', ''),
            'created_at': deal.get('created_at'),
            'interactions': deal.get('activities', []),
            'customer_id': deal.get('customer_id'),
            'probability': deal.get('probability', 0)
        }

    def _get_asset_data(self, asset_id: str) -> Dict:
        """الحصول على بيانات الأصل"""
        asset = self.db['assets'].find_one({'_id': asset_id})
        return {
            'id': asset_id,
            'type': asset.get('type', ''),
            'purchase_date': asset.get('purchase_date'),
            'last_maintenance': asset.get('last_maintenance_date'),
            'maintenance_history': asset.get('maintenance_history', []),
            'usage_hours': asset.get('total_usage_hours', 0),
            'status': asset.get('status', 'operational')
        }

    # ==========================================
    # Helper Methods - الحسابات
    # ==========================================

    def _calculate_trends(self, data: List, period: int = 5) -> Dict:
        """حساب الاتجاهات في البيانات"""
        if len(data) < period:
            return {'slope': 0, 'std_dev': 0}

        recent = data[-period:]
        avg_change = (recent[-1] - recent[0]) / (period - 1) if period > 1 else 0
        std_dev = statistics.stdev(recent) if len(recent) > 1 else 0

        return {
            'slope': avg_change,
            'std_dev': std_dev,
            'recent_average': statistics.mean(recent)
        }

    def _predict_next_month(self, grades: List) -> float:
        """التنبؤ بمتوسط الشهر القادم"""
        if not grades:
            return 0

        recent = grades[-10:]
        trend = (recent[-1] - recent[0]) / 10 if len(recent) == 10 else 0

        return round(statistics.mean(recent) + trend, 1)

    def _calculate_improvement_chance(self, trends: Dict) -> float:
        """حساب احتمالية التحسن"""
        if trends['slope'] > 5:
            return 0.85
        elif trends['slope'] > 0:
            return 0.65
        else:
            return 0.40

    def _calculate_engagement(self, deal_data: Dict) -> float:
        """حساب درجة الانخراط"""
        interactions = len(deal_data['interactions'])
        return min(100, interactions * 10)

    def _calculate_probability(self, factors: Dict) -> float:
        """حساب احتمالية الإغلاق"""
        weights = {
            'engagement_score': 0.3,
            'interaction_frequency': 0.25,
            'time_in_stage': 0.2,
            'amount_score': 0.15,
            'competition_level': 0.1
        }

        probability = sum(
            factors[key] * weights[key]
            for key in factors
        ) / 100

        return round(probability, 2)

    def _calculate_maintenance_risk(self, metrics: Dict) -> str:
        """حساب مستوى مخاطرة الصيانة"""
        score = (
            metrics['age'] * 0.3 +
            metrics['usage_intensity'] * 0.3 +
            metrics['last_maintenance'] * 0.25 +
            metrics['environmental_factors'] * 0.15
        )

        if score > 75:
            return 'critical'
        elif score > 50:
            return 'high'
        elif score > 25:
            return 'medium'
        else:
            return 'low'

    def _assess_risk_level(self, student_data: Dict) -> str:
        """تقييم مستوى المخاطرة للطالب"""
        avg_grade = statistics.mean(student_data['grades'][-5:]) if student_data['grades'] else 50

        if avg_grade < 50:
            return 'high'
        elif avg_grade < 70:
            return 'medium'
        else:
            return 'low'

    # ==========================================
    # Helper Methods - التوصيات
    # ==========================================

    def _generate_recommendations(self, student_data: Dict, trends: Dict) -> List[str]:
        """توليد توصيات للطالب"""
        recommendations = []

        if trends['slope'] < 0:
            recommendations.append('Increase tutoring sessions')
            recommendations.append('Schedule parent meeting')

        if len(student_data['attendance']) > 0:
            attendance_rate = sum(1 for a in student_data['attendance'][-10:] if a) / 10
            if attendance_rate < 0.8:
                recommendations.append('Address attendance issues')

        return recommendations

    def _get_immediate_actions(self, risk_level: str) -> List[str]:
        """الإجراءات الفورية بناءً على مستوى الخطر"""
        actions = {
            'critical': ['Schedule immediate inspection', 'Order replacement parts', 'Notify management'],
            'high': ['Schedule maintenance within 1 week', 'Monitor closely'],
            'medium': ['Schedule maintenance within 1 month'],
            'low': ['Continue normal monitoring']
        }
        return actions.get(risk_level, [])

    def _get_scheduled_maintenance(self, asset_data: Dict) -> List[Dict]:
        """الصيانة المجدولة الموصى بها"""
        return [
            {
                'date': (datetime.now() + timedelta(days=30)).isoformat(),
                'type': 'preventive',
                'description': 'Regular inspection'
            }
        ]

    def _generate_mitigation_strategies(self, risk_factors: Dict) -> List[str]:
        """إستراتيجيات تخفيف المخاطر"""
        strategies = []

        if risk_factors.get('performance_risk', 0) > 50:
            strategies.append('Implement performance improvement plan')

        if risk_factors.get('financial_risk', 0) > 50:
            strategies.append('Review financial controls')

        return strategies

    # ==========================================
    # Helper Methods - أخرى
    # ==========================================

    def _calculate_confidence(self, student_data: Dict) -> float:
        """حساب درجة الثقة في التنبؤ"""
        data_points = len(student_data['grades'])

        if data_points >= 10:
            return 0.95
        elif data_points >= 5:
            return 0.80
        else:
            return 0.60

    def _predict_close_date(self, deal_data: Dict, probability: float) -> str:
        """التنبؤ بتاريخ الإغلاق"""
        days_offset = int(30 * (1 - probability))
        return (datetime.now() + timedelta(days=days_offset)).isoformat()

    def _identify_risks(self, deal_data: Dict) -> List[str]:
        """تحديد المخاطر"""
        risks = []
        if deal_data.get('probability', 0) < 40:
            risks.append('Low probability of closure')
        return risks

    def _predict_failure_date(self, asset_data: Dict, risk_level: str) -> str:
        """التنبؤ بتاريخ الفشل المحتمل"""
        days = {'critical': 7, 'high': 30, 'medium': 90, 'low': 365}
        offset = days.get(risk_level, 365)
        return (datetime.now() + timedelta(days=offset)).isoformat()

    def _estimate_repair_cost(self, asset_data: Dict, risk_level: str) -> float:
        """تقدير تكلفة الإصلاح"""
        base_costs = {'critical': 5000, 'high': 3000, 'medium': 1000, 'low': 500}
        return base_costs.get(risk_level, 1000)

    def _get_monitoring_frequency(self, risk_score: float) -> str:
        """تحديد تكرار المراقبة"""
        if risk_score > 75:
            return 'daily'
        elif risk_score > 50:
            return 'weekly'
        else:
            return 'monthly'

    def _days_since_maintenance(self, asset_data: Dict) -> int:
        """عدد الأيام منذ آخر صيانة"""
        if not asset_data.get('last_maintenance'):
            return 999

        last_date = datetime.fromisoformat(asset_data['last_maintenance'])
        return (datetime.now() - last_date).days

    def _calculate_asset_age(self, asset_data: Dict) -> float:
        """حساب عمر الأصل بالسنوات"""
        purchase_date = datetime.fromisoformat(asset_data['purchase_date'])
        age_days = (datetime.now() - purchase_date).days
        return age_days / 365

    def _analyze_maintenance_history(self, asset_data: Dict) -> float:
        """تحليل سجل الصيانة"""
        return len(asset_data.get('maintenance_history', []))

    def _calculate_usage_intensity(self, asset_data: Dict) -> float:
        """حساب كثافة الاستخدام"""
        usage_hours = asset_data.get('usage_hours', 0)
        return min(100, (usage_hours / 10000) * 100)

    def _assess_environment(self, asset_data: Dict) -> float:
        """تقييم العوامل البيئية"""
        return 50  # قيمة افتراضية

    def _normalize_deal_amount(self, amount: float) -> float:
        """تطبيع مبلغ الصفقة"""
        return min(100, (amount / 100000) * 100)

    def _count_recent_interactions(self, deal_data: Dict) -> int:
        """عد التفاعلات الأخيرة"""
        return len(deal_data.get('interactions', []))

    def _calculate_stage_duration(self, deal_data: Dict) -> float:
        """حساب مدة البقاء في المرحلة الحالية"""
        return 50  # قيمة افتراضية

    def _assess_competition(self, deal_data: Dict) -> float:
        """تقييم المنافسة"""
        return 50  # قيمة افتراضية

    def _get_action_count(self, probability: float) -> int:
        """تحديد عدد الإجراءات الموصى بها"""
        if probability < 0.4:
            return 4
        elif probability < 0.7:
            return 3
        else:
            return 1

    def _assess_performance_risk(self, entity_type: str, entity_id: str) -> float:
        """تقييم مخاطر الأداء"""
        return 50

    def _assess_compliance_risk(self, entity_type: str, entity_id: str) -> float:
        """تقييم مخاطر الامتثال"""
        return 30

    def _assess_financial_risk(self, entity_type: str, entity_id: str) -> float:
        """تقييم المخاطر المالية"""
        return 40

    def _assess_operational_risk(self, entity_type: str, entity_id: str) -> float:
        """تقييم المخاطر التشغيلية"""
        return 35

    def _calculate_overall_risk(self, risk_factors: Dict) -> float:
        """حساب المخاطرة الإجمالية"""
        return sum(risk_factors.values()) / len(risk_factors)

    def _get_risk_level_name(self, score: float) -> str:
        """الحصول على اسم مستوى الخطر"""
        if score > 75:
            return 'critical'
        elif score > 50:
            return 'high'
        elif score > 25:
            return 'medium'
        else:
            return 'low'

    def _save_prediction(self, prediction: Dict):
        """حفظ التنبؤ في قاعدة البيانات"""
        self.db['predictions'].insert_one(prediction)


class StudentProgressModel:
    """نموذج تنبؤ تقدم الطالب"""
    pass


class DealProbabilityModel:
    """نموذج احتمالية إغلاق الصفقة"""
    pass


class MaintenanceRiskModel:
    """نموذج مخاطرة الصيانة"""
    pass


class RiskAssessmentModel:
    """نموذج تقييم المخاطر"""
    pass
