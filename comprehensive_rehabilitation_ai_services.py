#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import numpy as np
import pandas as pd
from datetime import datetime, date, timedelta
from typing import Dict, List, Tuple, Optional
import json
from database import db
try:
    from comprehensive_rehabilitation_models import (
        ComprehensiveAssessment, RehabilitationBeneficiary, 
        TherapySession, ProgressRecord, DisabilityCategory
    )
except ImportError:
    # تعريف بديل في حالة عدم توفر النماذج
    ComprehensiveAssessment = None
    RehabilitationBeneficiary = None
    TherapySession = None
    ProgressRecord = None
    DisabilityCategory = None

class AdvancedAssessmentAlgorithms:
    """خوارزميات التقييم المتقدمة للتأهيل الشامل"""
    
    @staticmethod
    def calculate_comprehensive_score(assessment) -> Dict:
        """حساب النتيجة الشاملة للتقييم مع التحليل المتقدم"""
        
        if not assessment:
            return {'overall_score': 0, 'analysis': 'لا توجد بيانات تقييم'}
        
        scores = {
            'motor': getattr(assessment, 'motor_skills_score', 0) or 0,
            'cognitive': getattr(assessment, 'cognitive_skills_score', 0) or 0,
            'communication': getattr(assessment, 'communication_skills_score', 0) or 0,
            'social': getattr(assessment, 'social_skills_score', 0) or 0,
            'sensory': getattr(assessment, 'sensory_skills_score', 0) or 0,
            'daily_living': getattr(assessment, 'daily_living_skills_score', 0) or 0
        }
        
        # حساب الأوزان بناءً على نوع الإعاقة
        primary_disability = getattr(getattr(assessment, 'beneficiary', None), 'primary_disability', 'physical')
        weights = AdvancedAssessmentAlgorithms._get_disability_weights(primary_disability
        )
        
        # حساب النتيجة المرجحة
        weighted_score = sum(scores[skill] * weights[skill] for skill in scores)
        total_weight = sum(weights.values())
        normalized_score = weighted_score / total_weight if total_weight > 0 else 0
        
        # تحليل نقاط القوة والضعف
        strengths = [skill for skill, score in scores.items() if score >= 75]
        weaknesses = [skill for skill, score in scores.items() if score < 50]
        
        # تحديد مستوى الأولوية للتدخل
        priority_areas = sorted(scores.items(), key=lambda x: x[1])[:3]
        
        return {
            'overall_score': round(normalized_score, 2),
            'weighted_scores': scores,
            'strengths': strengths,
            'weaknesses': weaknesses,
            'priority_areas': [area[0] for area in priority_areas],
            'improvement_potential': AdvancedAssessmentAlgorithms._calculate_improvement_potential(scores),
            'recommended_interventions': AdvancedAssessmentAlgorithms._get_recommended_interventions(scores, assessment.beneficiary.primary_disability)
        }
    
    @staticmethod
    def _get_disability_weights(disability_type: str) -> Dict[str, float]:
        """تحديد أوزان المهارات بناءً على نوع الإعاقة"""
        
        weight_profiles = {
            'physical': {
                'motor': 0.3, 'cognitive': 0.15, 'communication': 0.15,
                'social': 0.15, 'sensory': 0.1, 'daily_living': 0.15
            },
            'intellectual': {
                'motor': 0.1, 'cognitive': 0.3, 'communication': 0.2,
                'social': 0.2, 'sensory': 0.1, 'daily_living': 0.1
            },
            'autism_spectrum': {
                'motor': 0.1, 'cognitive': 0.2, 'communication': 0.25,
                'social': 0.25, 'sensory': 0.15, 'daily_living': 0.05
            },
            'speech_language': {
                'motor': 0.1, 'cognitive': 0.2, 'communication': 0.4,
                'social': 0.15, 'sensory': 0.1, 'daily_living': 0.05
            },
            'sensory': {
                'motor': 0.15, 'cognitive': 0.2, 'communication': 0.2,
                'social': 0.15, 'sensory': 0.25, 'daily_living': 0.05
            }
        }
        
        return weight_profiles.get(disability_type, {
            'motor': 0.17, 'cognitive': 0.17, 'communication': 0.17,
            'social': 0.17, 'sensory': 0.16, 'daily_living': 0.16
        })
    
    @staticmethod
    def _calculate_improvement_potential(scores: Dict[str, float]) -> Dict[str, str]:
        """حساب إمكانية التحسن لكل مهارة"""
        
        potential = {}
        for skill, score in scores.items():
            if score >= 80:
                potential[skill] = 'محدود'
            elif score >= 60:
                potential[skill] = 'متوسط'
            elif score >= 40:
                potential[skill] = 'عالي'
            else:
                potential[skill] = 'عالي جداً'
        
        return potential
    
    @staticmethod
    def _get_recommended_interventions(scores: Dict[str, float], disability_type: str) -> List[str]:
        """اقتراح التدخلات العلاجية المناسبة"""
        
        interventions = []
        
        # تدخلات بناءً على النتائج
        if scores['motor'] < 60:
            interventions.extend(['العلاج الطبيعي المكثف', 'تمارين التوازن والتنسيق'])
        
        if scores['cognitive'] < 60:
            interventions.extend(['التدريب المعرفي', 'أنشطة تحفيز الذاكرة'])
        
        if scores['communication'] < 60:
            interventions.extend(['علاج النطق واللغة', 'التواصل البديل والمعزز'])
        
        if scores['social'] < 60:
            interventions.extend(['التدريب على المهارات الاجتماعية', 'العلاج الجماعي'])
        
        # تدخلات خاصة بنوع الإعاقة
        disability_interventions = {
            'autism_spectrum': ['العلاج السلوكي التطبيقي (ABA)', 'التدخل المبكر المكثف'],
            'physical': ['العلاج الوظيفي', 'استخدام الأجهزة المساعدة'],
            'intellectual': ['التعلم التدريجي', 'استراتيجيات التعلم البصري']
        }
        
        if disability_type in disability_interventions:
            interventions.extend(disability_interventions[disability_type])
        
        return list(set(interventions))  # إزالة التكرار

class AIProgressPredictor:
    """نظام التنبؤ بالتقدم باستخدام الذكاء الاصطناعي"""
    
    @staticmethod
    def predict_progress(beneficiary_id: int, prediction_period_months: int = 6) -> Dict:
        """التنبؤ بتقدم المستفيد خلال فترة محددة"""
        
        beneficiary = RehabilitationBeneficiary.query.get(beneficiary_id)
        if not beneficiary:
            return {'error': 'المستفيد غير موجود'}
        
        # جمع البيانات التاريخية
        historical_data = AIProgressPredictor._collect_historical_data(beneficiary_id)
        
        if not historical_data:
            return {'error': 'لا توجد بيانات كافية للتنبؤ'}
        
        # حساب معدل التقدم
        progress_rates = AIProgressPredictor._calculate_progress_rates(historical_data)
        
        # التنبؤ بالنتائج المستقبلية
        predictions = AIProgressPredictor._generate_predictions(
            progress_rates, prediction_period_months, beneficiary
        )
        
        # تحديد عوامل المخاطر
        risk_factors = AIProgressPredictor._identify_risk_factors(beneficiary, historical_data)
        
        # اقتراح التدخلات
        recommended_actions = AIProgressPredictor._suggest_interventions(predictions, risk_factors)
        
        return {
            'beneficiary_id': beneficiary_id,
            'prediction_period_months': prediction_period_months,
            'current_scores': AIProgressPredictor._get_latest_scores(beneficiary_id),
            'predicted_scores': predictions,
            'progress_rates': progress_rates,
            'risk_factors': risk_factors,
            'recommended_actions': recommended_actions,
            'confidence_level': AIProgressPredictor._calculate_confidence(historical_data)
        }
    
    @staticmethod
    def _collect_historical_data(beneficiary_id: int) -> List[Dict]:
        """جمع البيانات التاريخية للمستفيد"""
        
        assessments = ComprehensiveAssessment.query.filter_by(
            beneficiary_id=beneficiary_id
        ).order_by(ComprehensiveAssessment.assessment_date).all()
        
        progress_records = ProgressRecord.query.filter_by(
            beneficiary_id=beneficiary_id
        ).order_by(ProgressRecord.progress_date).all()
        
        data = []
        
        # إضافة بيانات التقييمات
        for assessment in assessments:
            data.append({
                'date': assessment.assessment_date,
                'type': 'assessment',
                'motor_score': assessment.motor_skills_score,
                'cognitive_score': assessment.cognitive_skills_score,
                'communication_score': assessment.communication_skills_score,
                'social_score': assessment.social_skills_score,
                'sensory_score': assessment.sensory_skills_score,
                'daily_living_score': assessment.daily_living_skills_score
            })
        
        # إضافة بيانات سجلات التقدم
        for record in progress_records:
            data.append({
                'date': record.progress_date,
                'type': 'progress',
                'skill_area': record.skill_area,
                'baseline_score': record.baseline_score,
                'current_score': record.current_score,
                'progress_percentage': record.progress_percentage
            })
        
        return sorted(data, key=lambda x: x['date'])
    
    @staticmethod
    def _calculate_progress_rates(historical_data: List[Dict]) -> Dict[str, float]:
        """حساب معدلات التقدم لكل مهارة"""
        
        skills = ['motor', 'cognitive', 'communication', 'social', 'sensory', 'daily_living']
        progress_rates = {}
        
        for skill in skills:
            skill_data = []
            for record in historical_data:
                if record['type'] == 'assessment' and f'{skill}_score' in record:
                    score = record[f'{skill}_score']
                    if score is not None:
                        skill_data.append({
                            'date': record['date'],
                            'score': score
                        })
            
            if len(skill_data) >= 2:
                # حساب معدل التغيير الشهري
                first_record = skill_data[0]
                last_record = skill_data[-1]
                
                time_diff = (last_record['date'] - first_record['date']).days / 30.44  # متوسط أيام الشهر
                score_diff = last_record['score'] - first_record['score']
                
                if time_diff > 0:
                    progress_rates[skill] = score_diff / time_diff
                else:
                    progress_rates[skill] = 0
            else:
                progress_rates[skill] = 0
        
        return progress_rates
    
    @staticmethod
    def _generate_predictions(progress_rates: Dict[str, float], months: int, beneficiary) -> Dict[str, float]:
        """توليد التنبؤات للفترة المحددة"""
        
        current_scores = AIProgressPredictor._get_latest_scores(beneficiary.id)
        predictions = {}
        
        for skill, current_score in current_scores.items():
            if skill in progress_rates:
                predicted_change = progress_rates[skill] * months
                predicted_score = current_score + predicted_change
                
                # تطبيق حدود النتيجة (0-100)
                predicted_score = max(0, min(100, predicted_score))
                
                # تطبيق عوامل التصحيح بناءً على نوع الإعاقة ومستوى الشدة
                correction_factor = AIProgressPredictor._get_correction_factor(
                    beneficiary.primary_disability, beneficiary.severity_level, skill
                )
                
                predicted_score *= correction_factor
                predictions[skill] = round(predicted_score, 2)
        
        return predictions
    
    @staticmethod
    def _get_latest_scores(beneficiary_id: int) -> Dict[str, float]:
        """الحصول على أحدث نتائج التقييم"""
        
        latest_assessment = ComprehensiveAssessment.query.filter_by(
            beneficiary_id=beneficiary_id
        ).order_by(ComprehensiveAssessment.assessment_date.desc()).first()
        
        if latest_assessment:
            return {
                'motor': latest_assessment.motor_skills_score or 0,
                'cognitive': latest_assessment.cognitive_skills_score or 0,
                'communication': latest_assessment.communication_skills_score or 0,
                'social': latest_assessment.social_skills_score or 0,
                'sensory': latest_assessment.sensory_skills_score or 0,
                'daily_living': latest_assessment.daily_living_skills_score or 0
            }
        
        return {skill: 0 for skill in ['motor', 'cognitive', 'communication', 'social', 'sensory', 'daily_living']}
    
    @staticmethod
    def _get_correction_factor(disability_type: str, severity_level: str, skill: str) -> float:
        """حساب عامل التصحيح بناءً على نوع الإعاقة والشدة"""
        
        # عوامل التصحيح بناءً على مستوى الشدة
        severity_factors = {
            'mild': 1.1,
            'moderate': 1.0,
            'severe': 0.8,
            'profound': 0.6
        }
        
        # عوامل التصحيح بناءً على نوع الإعاقة والمهارة
        disability_skill_factors = {
            'physical': {'motor': 0.9, 'cognitive': 1.1},
            'intellectual': {'cognitive': 0.8, 'social': 0.9},
            'autism_spectrum': {'social': 0.7, 'communication': 0.8},
            'speech_language': {'communication': 0.8}
        }
        
        base_factor = severity_factors.get(severity_level, 1.0)
        skill_factor = disability_skill_factors.get(disability_type, {}).get(skill, 1.0)
        
        return base_factor * skill_factor
    
    @staticmethod
    def _identify_risk_factors(beneficiary, historical_data: List[Dict]) -> List[str]:
        """تحديد عوامل المخاطر التي قد تؤثر على التقدم"""
        
        risk_factors = []
        
        # عوامل المخاطر بناءً على العمر
        age = beneficiary.age
        if age < 3:
            risk_factors.append('العمر المبكر - يتطلب تدخل مكثف')
        elif age > 18:
            risk_factors.append('العمر المتقدم - قد يبطئ التقدم')
        
        # عوامل المخاطر بناءً على مستوى الشدة
        if beneficiary.severity_level in ['severe', 'profound']:
            risk_factors.append('مستوى شدة عالي - يتطلب تدخل متخصص')
        
        # عوامل المخاطر بناءً على البيانات التاريخية
        if len(historical_data) < 3:
            risk_factors.append('بيانات تاريخية محدودة - دقة التنبؤ منخفضة')
        
        # تحليل انتظام الجلسات
        recent_sessions = TherapySession.query.filter_by(
            beneficiary_id=beneficiary.id
        ).filter(
            TherapySession.session_date >= date.today() - timedelta(days=90)
        ).count()
        
        if recent_sessions < 12:  # أقل من جلسة أسبوعياً
            risk_factors.append('عدم انتظام الجلسات - قد يؤثر على التقدم')
        
        return risk_factors
    
    @staticmethod
    def _suggest_interventions(predictions: Dict[str, float], risk_factors: List[str]) -> List[str]:
        """اقتراح التدخلات بناءً على التنبؤات وعوامل المخاطر"""
        
        interventions = []
        
        # تدخلات بناءً على التنبؤات
        for skill, predicted_score in predictions.items():
            if predicted_score < 50:
                interventions.append(f'تكثيف التدريب في مجال {skill}')
            elif predicted_score > 80:
                interventions.append(f'الحفاظ على المستوى المتقدم في {skill}')
        
        # تدخلات بناءً على عوامل المخاطر
        if 'عدم انتظام الجلسات' in ' '.join(risk_factors):
            interventions.append('زيادة تكرار الجلسات العلاجية')
        
        if 'مستوى شدة عالي' in ' '.join(risk_factors):
            interventions.append('إشراك فريق متعدد التخصصات')
        
        if 'العمر المبكر' in ' '.join(risk_factors):
            interventions.append('تطبيق برامج التدخل المبكر المكثف')
        
        return list(set(interventions))
    
    @staticmethod
    def _calculate_confidence(historical_data: List[Dict]) -> str:
        """حساب مستوى الثقة في التنبؤ"""
        
        data_points = len(historical_data)
        
        if data_points >= 10:
            return 'عالي'
        elif data_points >= 5:
            return 'متوسط'
        elif data_points >= 2:
            return 'منخفض'
        else:
            return 'منخفض جداً'

class RealtimeNotificationSystem:
    """نظام الإشعارات الفورية"""
    
    @staticmethod
    def check_progress_alerts(beneficiary_id: int) -> List[Dict]:
        """فحص التنبيهات المتعلقة بالتقدم"""
        
        alerts = []
        beneficiary = RehabilitationBeneficiary.query.get(beneficiary_id)
        
        if not beneficiary:
            return alerts
        
        # تحقق من الجلسات المتأخرة
        overdue_sessions = TherapySession.query.filter_by(
            beneficiary_id=beneficiary_id,
            status='scheduled'
        ).filter(
            TherapySession.session_date < date.today()
        ).count()
        
        if overdue_sessions > 0:
            alerts.append({
                'type': 'warning',
                'title': 'جلسات متأخرة',
                'message': f'يوجد {overdue_sessions} جلسة متأخرة للمستفيد {beneficiary.first_name}',
                'priority': 'high'
            })
        
        # تحقق من التقييمات المستحقة
        last_assessment = ComprehensiveAssessment.query.filter_by(
            beneficiary_id=beneficiary_id
        ).order_by(ComprehensiveAssessment.assessment_date.desc()).first()
        
        if last_assessment:
            days_since_assessment = (date.today() - last_assessment.assessment_date).days
            if days_since_assessment > 90:  # أكثر من 3 أشهر
                alerts.append({
                    'type': 'info',
                    'title': 'تقييم مستحق',
                    'message': f'آخر تقييم للمستفيد {beneficiary.first_name} كان منذ {days_since_assessment} يوم',
                    'priority': 'medium'
                })
        
        return alerts
