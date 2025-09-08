#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
AI-Powered Progress Prediction and Recommendations System
Advanced AI system for predicting student progress and generating personalized recommendations
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import json
from dataclasses import dataclass
from enum import Enum

class PredictionConfidence(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class ProgressPrediction:
    beneficiary_id: int
    predicted_score: float
    confidence_level: PredictionConfidence
    prediction_date: datetime
    factors: Dict[str, float]
    recommendations: List[str]
    risk_level: RiskLevel
    intervention_needed: bool

@dataclass
class RecommendationItem:
    category: str
    priority: str
    description: str
    expected_impact: float
    implementation_difficulty: str
    timeline: str

class AIProgressPredictor:
    """AI system for predicting rehabilitation progress and generating recommendations"""
    
    def __init__(self):
        self.model_weights = {
            'attendance_rate': 0.25,
            'session_engagement': 0.20,
            'homework_completion': 0.15,
            'family_involvement': 0.15,
            'baseline_assessment': 0.10,
            'therapy_duration': 0.10,
            'age_factor': 0.05
        }
        
        self.skill_categories = [
            'motor_skills', 'cognitive_skills', 'communication_skills',
            'social_skills', 'self_care_skills', 'academic_skills'
        ]
    
    def predict_progress(self, beneficiary_id: int, historical_data: Dict) -> ProgressPrediction:
        """Predict future progress for a beneficiary"""
        
        # Calculate prediction factors
        factors = self._calculate_prediction_factors(historical_data)
        
        # Generate prediction score
        predicted_score = self._calculate_prediction_score(factors)
        
        # Determine confidence level
        confidence = self._determine_confidence(factors, historical_data)
        
        # Assess risk level
        risk_level = self._assess_risk_level(factors, predicted_score)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(factors, risk_level)
        
        # Determine if intervention is needed
        intervention_needed = risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
        
        return ProgressPrediction(
            beneficiary_id=beneficiary_id,
            predicted_score=predicted_score,
            confidence_level=confidence,
            prediction_date=datetime.now(),
            factors=factors,
            recommendations=recommendations,
            risk_level=risk_level,
            intervention_needed=intervention_needed
        )
    
    def _calculate_prediction_factors(self, data: Dict) -> Dict[str, float]:
        """Calculate various factors that influence progress prediction"""
        
        factors = {}
        
        # Attendance rate factor
        total_sessions = data.get('total_scheduled_sessions', 1)
        attended_sessions = data.get('attended_sessions', 0)
        factors['attendance_rate'] = attended_sessions / total_sessions if total_sessions > 0 else 0
        
        # Session engagement factor (average engagement score)
        engagement_scores = data.get('engagement_scores', [])
        factors['session_engagement'] = np.mean(engagement_scores) if engagement_scores else 0.5
        
        # Homework completion factor
        total_homework = data.get('total_homework', 1)
        completed_homework = data.get('completed_homework', 0)
        factors['homework_completion'] = completed_homework / total_homework if total_homework > 0 else 0
        
        # Family involvement factor
        family_sessions = data.get('family_session_attendance', 0)
        total_family_sessions = data.get('total_family_sessions', 1)
        factors['family_involvement'] = family_sessions / total_family_sessions if total_family_sessions > 0 else 0
        
        # Baseline assessment factor
        baseline_score = data.get('baseline_assessment_score', 50)
        factors['baseline_assessment'] = baseline_score / 100
        
        # Therapy duration factor (months in therapy)
        therapy_months = data.get('therapy_duration_months', 1)
        factors['therapy_duration'] = min(therapy_months / 12, 1.0)  # Normalize to 1 year max
        
        # Age factor (younger children often show faster progress)
        age = data.get('age', 10)
        factors['age_factor'] = max(0, (15 - age) / 15) if age <= 15 else 0.2
        
        return factors
    
    def _calculate_prediction_score(self, factors: Dict[str, float]) -> float:
        """Calculate overall prediction score based on weighted factors"""
        
        score = 0
        for factor, value in factors.items():
            weight = self.model_weights.get(factor, 0)
            score += value * weight
        
        # Apply non-linear transformation for more realistic predictions
        score = score * 100  # Convert to percentage
        
        # Add some variability based on factor interactions
        interaction_bonus = self._calculate_interaction_effects(factors)
        score += interaction_bonus
        
        # Ensure score is within valid range
        return max(0, min(100, score))
    
    def _calculate_interaction_effects(self, factors: Dict[str, float]) -> float:
        """Calculate bonus/penalty based on factor interactions"""
        
        bonus = 0
        
        # High attendance + high engagement = synergy bonus
        if factors['attendance_rate'] > 0.8 and factors['session_engagement'] > 0.7:
            bonus += 5
        
        # High family involvement + homework completion = family support bonus
        if factors['family_involvement'] > 0.7 and factors['homework_completion'] > 0.8:
            bonus += 3
        
        # Low attendance penalty
        if factors['attendance_rate'] < 0.5:
            bonus -= 8
        
        # Consistency bonus (all factors above average)
        avg_factor = np.mean(list(factors.values()))
        if avg_factor > 0.7:
            bonus += 2
        
        return bonus
    
    def _determine_confidence(self, factors: Dict[str, float], data: Dict) -> PredictionConfidence:
        """Determine confidence level of the prediction"""
        
        # More data points = higher confidence
        data_points = data.get('total_assessments', 0)
        therapy_duration = data.get('therapy_duration_months', 0)
        
        # Calculate confidence score
        confidence_score = 0
        
        # Data availability factor
        if data_points >= 5:
            confidence_score += 0.4
        elif data_points >= 3:
            confidence_score += 0.2
        
        # Therapy duration factor
        if therapy_duration >= 6:
            confidence_score += 0.3
        elif therapy_duration >= 3:
            confidence_score += 0.2
        
        # Factor consistency
        factor_variance = np.var(list(factors.values()))
        if factor_variance < 0.1:  # Low variance = consistent factors
            confidence_score += 0.3
        elif factor_variance < 0.2:
            confidence_score += 0.1
        
        # Determine confidence level
        if confidence_score >= 0.7:
            return PredictionConfidence.HIGH
        elif confidence_score >= 0.4:
            return PredictionConfidence.MEDIUM
        else:
            return PredictionConfidence.LOW
    
    def _assess_risk_level(self, factors: Dict[str, float], predicted_score: float) -> RiskLevel:
        """Assess risk level based on factors and predicted score"""
        
        risk_score = 0
        
        # Low predicted score increases risk
        if predicted_score < 40:
            risk_score += 3
        elif predicted_score < 60:
            risk_score += 1
        
        # Poor attendance is a major risk factor
        if factors['attendance_rate'] < 0.5:
            risk_score += 2
        elif factors['attendance_rate'] < 0.7:
            risk_score += 1
        
        # Low family involvement increases risk
        if factors['family_involvement'] < 0.3:
            risk_score += 2
        elif factors['family_involvement'] < 0.6:
            risk_score += 1
        
        # Poor homework completion
        if factors['homework_completion'] < 0.4:
            risk_score += 1
        
        # Low engagement
        if factors['session_engagement'] < 0.4:
            risk_score += 2
        elif factors['session_engagement'] < 0.6:
            risk_score += 1
        
        # Determine risk level
        if risk_score >= 6:
            return RiskLevel.CRITICAL
        elif risk_score >= 4:
            return RiskLevel.HIGH
        elif risk_score >= 2:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def _generate_recommendations(self, factors: Dict[str, float], risk_level: RiskLevel) -> List[str]:
        """Generate personalized recommendations based on factors and risk level"""
        
        recommendations = []
        
        # Attendance-based recommendations
        if factors['attendance_rate'] < 0.7:
            recommendations.append("تحسين معدل الحضور من خلال تذكيرات منتظمة وجدولة مرنة")
            if factors['attendance_rate'] < 0.5:
                recommendations.append("مراجعة عوائق الحضور مع الأسرة ووضع خطة حلول")
        
        # Engagement recommendations
        if factors['session_engagement'] < 0.6:
            recommendations.append("تنويع الأنشطة العلاجية لزيادة مشاركة الطفل")
            recommendations.append("استخدام أساليب تحفيزية مناسبة لعمر الطفل")
        
        # Family involvement recommendations
        if factors['family_involvement'] < 0.6:
            recommendations.append("زيادة مشاركة الأسرة في الجلسات والأنشطة المنزلية")
            recommendations.append("تقديم تدريب للأسرة على تقنيات الدعم المنزلي")
        
        # Homework recommendations
        if factors['homework_completion'] < 0.7:
            recommendations.append("تبسيط الواجبات المنزلية وجعلها أكثر تفاعلية")
            recommendations.append("إنشاء نظام مكافآت لتشجيع إنجاز الواجبات")
        
        # Risk-specific recommendations
        if risk_level == RiskLevel.CRITICAL:
            recommendations.extend([
                "مراجعة عاجلة للخطة العلاجية مع فريق متعدد التخصصات",
                "زيادة تكرار الجلسات أو تكثيف البرنامج العلاجي",
                "تقييم شامل لاحتياجات الطفل والأسرة"
            ])
        elif risk_level == RiskLevel.HIGH:
            recommendations.extend([
                "مراجعة الخطة العلاجية وتعديلها حسب الحاجة",
                "زيادة التواصل مع الأسرة والمتابعة الدورية"
            ])
        
        # General improvement recommendations
        if np.mean(list(factors.values())) > 0.8:
            recommendations.append("الاستمرار في النهج الحالي مع تحديات تدريجية جديدة")
        
        return recommendations
    
    def generate_skill_specific_predictions(self, beneficiary_id: int, skill_data: Dict) -> Dict[str, float]:
        """Generate predictions for specific skill categories"""
        
        predictions = {}
        
        for skill in self.skill_categories:
            skill_scores = skill_data.get(skill, [])
            if len(skill_scores) >= 2:
                # Calculate trend
                trend = self._calculate_trend(skill_scores)
                current_score = skill_scores[-1] if skill_scores else 50
                
                # Predict next score based on trend
                predicted_score = current_score + (trend * 2)  # 2 months ahead
                predictions[skill] = max(0, min(100, predicted_score))
            else:
                predictions[skill] = skill_scores[-1] if skill_scores else 50
        
        return predictions
    
    def _calculate_trend(self, scores: List[float]) -> float:
        """Calculate the trend in scores over time"""
        if len(scores) < 2:
            return 0
        
        # Simple linear trend calculation
        x = np.arange(len(scores))
        y = np.array(scores)
        
        # Calculate slope
        slope = np.polyfit(x, y, 1)[0]
        return slope
    
    def generate_intervention_plan(self, prediction: ProgressPrediction) -> Dict:
        """Generate detailed intervention plan based on prediction"""
        
        plan = {
            'priority_level': prediction.risk_level.value,
            'timeline': self._determine_timeline(prediction.risk_level),
            'interventions': [],
            'monitoring_frequency': self._determine_monitoring_frequency(prediction.risk_level),
            'success_metrics': []
        }
        
        # Generate specific interventions based on factors
        for factor, value in prediction.factors.items():
            if value < 0.5:  # Below average performance
                intervention = self._generate_factor_intervention(factor, value)
                if intervention:
                    plan['interventions'].append(intervention)
        
        # Add success metrics
        plan['success_metrics'] = [
            'تحسن في معدل الحضور بنسبة 20%',
            'زيادة درجات التقييم بنسبة 15%',
            'تحسن في مشاركة الأسرة',
            'إنجاز 80% من الواجبات المنزلية'
        ]
        
        return plan
    
    def _determine_timeline(self, risk_level: RiskLevel) -> str:
        """Determine intervention timeline based on risk level"""
        timelines = {
            RiskLevel.CRITICAL: "فوري (خلال أسبوع)",
            RiskLevel.HIGH: "عاجل (خلال أسبوعين)",
            RiskLevel.MEDIUM: "قريب (خلال شهر)",
            RiskLevel.LOW: "روتيني (خلال 3 أشهر)"
        }
        return timelines.get(risk_level, "غير محدد")
    
    def _determine_monitoring_frequency(self, risk_level: RiskLevel) -> str:
        """Determine monitoring frequency based on risk level"""
        frequencies = {
            RiskLevel.CRITICAL: "يومي",
            RiskLevel.HIGH: "أسبوعي",
            RiskLevel.MEDIUM: "كل أسبوعين",
            RiskLevel.LOW: "شهري"
        }
        return frequencies.get(risk_level, "شهري")
    
    def _generate_factor_intervention(self, factor: str, value: float) -> Optional[Dict]:
        """Generate specific intervention for a factor"""
        
        interventions = {
            'attendance_rate': {
                'title': 'تحسين معدل الحضور',
                'actions': ['تذكيرات SMS', 'مرونة في المواعيد', 'حل مشاكل النقل'],
                'target': 'زيادة الحضور إلى 80%'
            },
            'session_engagement': {
                'title': 'زيادة المشاركة في الجلسات',
                'actions': ['أنشطة تفاعلية', 'استخدام التكنولوجيا', 'تنويع الأساليب'],
                'target': 'تحسين مستوى المشاركة إلى 70%'
            },
            'homework_completion': {
                'title': 'تحسين إنجاز الواجبات',
                'actions': ['تبسيط المهام', 'نظام مكافآت', 'دعم الأسرة'],
                'target': 'إنجاز 80% من الواجبات'
            },
            'family_involvement': {
                'title': 'زيادة مشاركة الأسرة',
                'actions': ['جلسات تدريبية', 'تواصل منتظم', 'ورش عمل'],
                'target': 'مشاركة الأسرة في 70% من الأنشطة'
            }
        }
        
        return interventions.get(factor)

class RecommendationEngine:
    """Engine for generating detailed recommendations"""
    
    def __init__(self):
        self.recommendation_templates = self._load_recommendation_templates()
    
    def _load_recommendation_templates(self) -> Dict:
        """Load recommendation templates"""
        return {
            'attendance': [
                "إنشاء جدول مواعيد مرن يناسب ظروف الأسرة",
                "تفعيل نظام التذكيرات عبر الرسائل النصية",
                "توفير خدمات النقل أو المساعدة في ترتيب المواصلات",
                "مناقشة العوائق مع الأسرة ووضع حلول عملية"
            ],
            'engagement': [
                "استخدام الألعاب التعليمية والأنشطة التفاعلية",
                "دمج اهتمامات الطفل في الجلسات العلاجية",
                "تنويع أساليب التدريس والعلاج",
                "استخدام التكنولوجيا والوسائل المرئية"
            ],
            'family_support': [
                "تنظيم ورش تدريبية للأسرة",
                "توفير مواد تعليمية للاستخدام المنزلي",
                "إنشاء مجموعات دعم للأسر",
                "تقديم استشارات فردية للوالدين"
            ]
        }
    
    def generate_comprehensive_recommendations(self, prediction: ProgressPrediction) -> List[RecommendationItem]:
        """Generate comprehensive list of recommendations"""
        
        recommendations = []
        
        # Analyze each factor and generate specific recommendations
        for factor, value in prediction.factors.items():
            if value < 0.6:  # Needs improvement
                category_recommendations = self._get_factor_recommendations(factor, value)
                recommendations.extend(category_recommendations)
        
        # Add risk-specific recommendations
        risk_recommendations = self._get_risk_recommendations(prediction.risk_level)
        recommendations.extend(risk_recommendations)
        
        # Sort by priority and expected impact
        recommendations.sort(key=lambda x: (x.priority, -x.expected_impact))
        
        return recommendations[:10]  # Return top 10 recommendations
    
    def _get_factor_recommendations(self, factor: str, value: float) -> List[RecommendationItem]:
        """Get recommendations for specific factor"""
        
        recommendations = []
        priority = "high" if value < 0.4 else "medium"
        
        if factor == 'attendance_rate':
            recommendations.append(RecommendationItem(
                category="الحضور والمواظبة",
                priority=priority,
                description="تحسين معدل الحضور من خلال حل العوائق وتسهيل الوصول",
                expected_impact=0.8,
                implementation_difficulty="متوسط",
                timeline="أسبوعين"
            ))
        
        elif factor == 'session_engagement':
            recommendations.append(RecommendationItem(
                category="المشاركة والتفاعل",
                priority=priority,
                description="زيادة مشاركة الطفل من خلال أنشطة تفاعلية مناسبة",
                expected_impact=0.7,
                implementation_difficulty="سهل",
                timeline="أسبوع"
            ))
        
        # Add more factor-specific recommendations...
        
        return recommendations
    
    def _get_risk_recommendations(self, risk_level: RiskLevel) -> List[RecommendationItem]:
        """Get recommendations based on risk level"""
        
        recommendations = []
        
        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            recommendations.append(RecommendationItem(
                category="تدخل عاجل",
                priority="critical",
                description="مراجعة شاملة للخطة العلاجية مع فريق متعدد التخصصات",
                expected_impact=0.9,
                implementation_difficulty="صعب",
                timeline="فوري"
            ))
        
        return recommendations
