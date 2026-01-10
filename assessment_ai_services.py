#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
خدمات الذكاء الاصطناعي للاختبارات والمقاييس
AI Services for Assessments and Tests
"""

import json
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import statistics
import re

from student_comprehensive_models import (
    StudentAssessmentRecord, StudentTestResult, AssessmentTemplate,
    StudentComprehensiveFile, StudentAIAnalysis
)

class AssessmentAIService:
    """خدمة الذكاء الاصطناعي للاختبارات والمقاييس"""
    
    def __init__(self):
        self.confidence_threshold = 0.7
        self.pattern_keywords = {
            'strength': ['قوي', 'ممتاز', 'جيد جداً', 'متفوق', 'عالي'],
            'weakness': ['ضعيف', 'منخفض', 'يحتاج تحسين', 'أقل من المتوسط'],
            'average': ['متوسط', 'عادي', 'ضمن المعدل', 'طبيعي'],
            'improvement': ['تحسن', 'تقدم', 'نمو', 'تطور'],
            'decline': ['تراجع', 'انخفاض', 'تدهور', 'نقص']
        }
    
    def analyze_assessment_comprehensive(self, assessment_record_id: int) -> Dict[str, Any]:
        """تحليل شامل لنتائج الاختبار"""
        try:
            record = StudentAssessmentRecord.query.get(assessment_record_id)
            if not record:
                return None
            
            analysis = {
                'input_data': self._prepare_input_data(record),
                'findings': self._analyze_findings(record),
                'patterns': self._identify_patterns(record),
                'predictions': self._generate_predictions(record),
                'recommendations': self._generate_recommendations(record),
                'confidence_scores': self._calculate_confidence_scores(record),
                'model_used': 'assessment_analyzer_v1.0',
                'overall_confidence': 0.0
            }
            
            # حساب الثقة الإجمالية
            confidence_scores = analysis['confidence_scores']
            if confidence_scores:
                analysis['overall_confidence'] = statistics.mean(confidence_scores.values())
            
            return analysis
            
        except Exception as e:
            print(f"خطأ في التحليل الشامل: {e}")
            return None
    
    def _prepare_input_data(self, record: StudentAssessmentRecord) -> Dict[str, Any]:
        """إعداد البيانات المدخلة للتحليل"""
        return {
            'assessment_id': record.id,
            'template_name': record.template.name if record.template else 'غير محدد',
            'assessment_date': record.assessment_date.isoformat(),
            'raw_scores': record.raw_scores or {},
            'standard_scores': record.standard_scores or {},
            'percentiles': record.percentiles or {},
            'responses': record.responses or {},
            'behavioral_observations': record.behavioral_observations,
            'testing_conditions': record.testing_conditions or {}
        }
    
    def _analyze_findings(self, record: StudentAssessmentRecord) -> Dict[str, Any]:
        """تحليل النتائج والاكتشافات"""
        findings = {
            'score_analysis': self._analyze_scores(record),
            'performance_patterns': self._analyze_performance_patterns(record),
            'behavioral_insights': self._analyze_behavioral_observations(record),
            'comparative_analysis': self._compare_with_norms(record)
        }
        
        return findings
    
    def _analyze_scores(self, record: StudentAssessmentRecord) -> Dict[str, Any]:
        """تحليل الدرجات"""
        score_analysis = {
            'overall_performance': 'متوسط',
            'strengths': [],
            'weaknesses': [],
            'score_distribution': {},
            'reliability_indicators': {}
        }
        
        if record.standard_scores:
            scores = list(record.standard_scores.values())
            if scores:
                mean_score = statistics.mean([s for s in scores if isinstance(s, (int, float))])
                
                if mean_score >= 115:
                    score_analysis['overall_performance'] = 'فوق المتوسط'
                elif mean_score >= 85:
                    score_analysis['overall_performance'] = 'متوسط'
                else:
                    score_analysis['overall_performance'] = 'أقل من المتوسط'
                
                # تحديد نقاط القوة والضعف
                for subtest, score in record.standard_scores.items():
                    if isinstance(score, (int, float)):
                        if score >= 115:
                            score_analysis['strengths'].append(subtest)
                        elif score < 85:
                            score_analysis['weaknesses'].append(subtest)
        
        return score_analysis
    
    def _analyze_performance_patterns(self, record: StudentAssessmentRecord) -> List[str]:
        """تحليل أنماط الأداء"""
        patterns = []
        
        if record.standard_scores:
            scores = [s for s in record.standard_scores.values() if isinstance(s, (int, float))]
            if len(scores) > 1:
                score_variance = statistics.variance(scores)
                
                if score_variance > 225:  # انحراف معياري > 15
                    patterns.append('تباين كبير في الأداء بين المجالات المختلفة')
                elif score_variance < 100:  # انحراف معياري < 10
                    patterns.append('أداء متسق عبر المجالات المختلفة')
                
                # تحليل الاتجاه
                if len(scores) >= 3:
                    trend = self._calculate_trend(scores)
                    if trend > 0.5:
                        patterns.append('اتجاه تصاعدي في الأداء')
                    elif trend < -0.5:
                        patterns.append('اتجاه تنازلي في الأداء')
        
        return patterns
    
    def _analyze_behavioral_observations(self, record: StudentAssessmentRecord) -> List[str]:
        """تحليل الملاحظات السلوكية"""
        insights = []
        
        if record.behavioral_observations:
            text = record.behavioral_observations.lower()
            
            # البحث عن كلمات مفتاحية
            for category, keywords in self.pattern_keywords.items():
                for keyword in keywords:
                    if keyword in text:
                        if category == 'strength':
                            insights.append(f'مؤشرات إيجابية: {keyword}')
                        elif category == 'weakness':
                            insights.append(f'مجالات تحتاج انتباه: {keyword}')
                        break
            
            # تحليل السلوكيات المحددة
            if 'تعاون' in text:
                insights.append('مستوى تعاون جيد أثناء التقييم')
            if 'تركيز' in text:
                insights.append('قدرة على التركيز ملحوظة')
            if 'قلق' in text:
                insights.append('مؤشرات قلق قد تؤثر على الأداء')
        
        return insights
    
    def _compare_with_norms(self, record: StudentAssessmentRecord) -> Dict[str, Any]:
        """مقارنة مع المعايير"""
        comparison = {
            'percentile_interpretation': {},
            'age_comparison': 'غير متوفر',
            'clinical_significance': []
        }
        
        if record.percentiles:
            for subtest, percentile in record.percentiles.items():
                if isinstance(percentile, (int, float)):
                    if percentile >= 75:
                        comparison['percentile_interpretation'][subtest] = 'أداء عالي'
                    elif percentile >= 25:
                        comparison['percentile_interpretation'][subtest] = 'أداء متوسط'
                    else:
                        comparison['percentile_interpretation'][subtest] = 'أداء منخفض'
                    
                    # الأهمية الإكلينيكية
                    if percentile <= 10:
                        comparison['clinical_significance'].append(
                            f'{subtest}: يتطلب تدخل متخصص'
                        )
                    elif percentile <= 25:
                        comparison['clinical_significance'].append(
                            f'{subtest}: يحتاج متابعة'
                        )
        
        return comparison
    
    def _identify_patterns(self, record: StudentAssessmentRecord) -> List[str]:
        """تحديد الأنماط في البيانات"""
        patterns = []
        
        # أنماط الأداء
        performance_patterns = self._analyze_performance_patterns(record)
        patterns.extend(performance_patterns)
        
        # أنماط الاستجابة
        if record.responses:
            response_patterns = self._analyze_response_patterns(record.responses)
            patterns.extend(response_patterns)
        
        # أنماط زمنية
        if record.duration_actual and record.template and record.template.duration_minutes:
            time_ratio = record.duration_actual / record.template.duration_minutes
            if time_ratio > 1.5:
                patterns.append('استغرق وقتاً أطول من المعتاد - قد يشير لصعوبات في المعالجة')
            elif time_ratio < 0.7:
                patterns.append('أنهى الاختبار بسرعة - قد يشير لاندفاعية أو عدم انتباه')
        
        return patterns
    
    def _analyze_response_patterns(self, responses: Dict[str, Any]) -> List[str]:
        """تحليل أنماط الاستجابة"""
        patterns = []
        
        if not responses:
            return patterns
        
        # تحليل أنماط الإجابة
        response_values = []
        for value in responses.values():
            if isinstance(value, (int, float)):
                response_values.append(value)
        
        if response_values:
            # نمط الاستجابة المتطرفة
            extreme_responses = [r for r in response_values if r == min(response_values) or r == max(response_values)]
            if len(extreme_responses) / len(response_values) > 0.7:
                patterns.append('نمط استجابة متطرف - قد يشير لعدم تنوع في الإجابات')
            
            # نمط الاستجابة المتوسطة
            middle_responses = [r for r in response_values if r not in [min(response_values), max(response_values)]]
            if len(middle_responses) / len(response_values) > 0.8:
                patterns.append('ميل للاستجابات المتوسطة - قد يشير للحذر أو عدم اليقين')
        
        return patterns
    
    def _generate_predictions(self, record: StudentAssessmentRecord) -> Dict[str, Any]:
        """توليد التنبؤات"""
        predictions = {
            'progress_likelihood': self._predict_progress(record),
            'intervention_success': self._predict_intervention_success(record),
            'risk_factors': self._identify_risk_factors(record),
            'protective_factors': self._identify_protective_factors(record)
        }
        
        return predictions
    
    def _predict_progress(self, record: StudentAssessmentRecord) -> Dict[str, Any]:
        """التنبؤ بالتقدم"""
        progress_prediction = {
            'likelihood': 'متوسط',
            'timeframe': '6-12 شهر',
            'factors': []
        }
        
        # تحليل العوامل المؤثرة على التقدم
        if record.standard_scores:
            scores = [s for s in record.standard_scores.values() if isinstance(s, (int, float))]
            if scores:
                mean_score = statistics.mean(scores)
                
                if mean_score >= 85:
                    progress_prediction['likelihood'] = 'عالي'
                    progress_prediction['timeframe'] = '3-6 أشهر'
                    progress_prediction['factors'].append('قدرات أساسية جيدة')
                elif mean_score < 70:
                    progress_prediction['likelihood'] = 'يحتاج دعم مكثف'
                    progress_prediction['timeframe'] = '12-18 شهر'
                    progress_prediction['factors'].append('يحتاج تدخل متخصص')
        
        # تحليل الملاحظات السلوكية
        if record.behavioral_observations:
            if 'تعاون' in record.behavioral_observations.lower():
                progress_prediction['factors'].append('مستوى تعاون جيد')
            if 'دافعية' in record.behavioral_observations.lower():
                progress_prediction['factors'].append('دافعية للتعلم')
        
        return progress_prediction
    
    def _predict_intervention_success(self, record: StudentAssessmentRecord) -> Dict[str, Any]:
        """التنبؤ بنجاح التدخل"""
        intervention_prediction = {
            'success_probability': 0.7,
            'recommended_intensity': 'متوسط',
            'optimal_approaches': []
        }
        
        # تحليل نقاط القوة والضعف
        if record.standard_scores:
            strengths = []
            weaknesses = []
            
            for subtest, score in record.standard_scores.items():
                if isinstance(score, (int, float)):
                    if score >= 115:
                        strengths.append(subtest)
                    elif score < 85:
                        weaknesses.append(subtest)
            
            # تحديد شدة التدخل
            if len(weaknesses) > len(strengths):
                intervention_prediction['recommended_intensity'] = 'مكثف'
                intervention_prediction['success_probability'] = 0.6
            elif len(strengths) > len(weaknesses):
                intervention_prediction['recommended_intensity'] = 'خفيف إلى متوسط'
                intervention_prediction['success_probability'] = 0.8
            
            # اقتراح الأساليب
            if strengths:
                intervention_prediction['optimal_approaches'].append('الاستفادة من نقاط القوة')
            if weaknesses:
                intervention_prediction['optimal_approaches'].append('التركيز على المجالات الضعيفة')
        
        return intervention_prediction
    
    def _identify_risk_factors(self, record: StudentAssessmentRecord) -> List[str]:
        """تحديد عوامل المخاطر"""
        risk_factors = []
        
        if record.standard_scores:
            low_scores = [k for k, v in record.standard_scores.items() 
                         if isinstance(v, (int, float)) and v < 70]
            if len(low_scores) >= 2:
                risk_factors.append('درجات منخفضة في مجالات متعددة')
        
        if record.behavioral_observations:
            obs = record.behavioral_observations.lower()
            if 'قلق' in obs:
                risk_factors.append('مؤشرات قلق')
            if 'عدم تعاون' in obs:
                risk_factors.append('صعوبات في التعاون')
            if 'تشتت' in obs:
                risk_factors.append('صعوبات في التركيز')
        
        return risk_factors
    
    def _identify_protective_factors(self, record: StudentAssessmentRecord) -> List[str]:
        """تحديد العوامل الوقائية"""
        protective_factors = []
        
        if record.standard_scores:
            high_scores = [k for k, v in record.standard_scores.items() 
                          if isinstance(v, (int, float)) and v >= 115]
            if high_scores:
                protective_factors.append(f'نقاط قوة في: {", ".join(high_scores)}')
        
        if record.behavioral_observations:
            obs = record.behavioral_observations.lower()
            if 'تعاون' in obs:
                protective_factors.append('مستوى تعاون جيد')
            if 'دافعية' in obs:
                protective_factors.append('دافعية للتعلم')
            if 'مثابرة' in obs:
                protective_factors.append('قدرة على المثابرة')
        
        return protective_factors
    
    def _generate_recommendations(self, record: StudentAssessmentRecord) -> List[Dict[str, Any]]:
        """توليد التوصيات"""
        recommendations = []
        
        # توصيات بناءً على الدرجات
        if record.standard_scores:
            for subtest, score in record.standard_scores.items():
                if isinstance(score, (int, float)):
                    if score < 85:
                        recommendations.append({
                            'area': subtest,
                            'priority': 'عالي' if score < 70 else 'متوسط',
                            'recommendation': f'تدخل متخصص في مجال {subtest}',
                            'type': 'intervention'
                        })
                    elif score >= 115:
                        recommendations.append({
                            'area': subtest,
                            'priority': 'منخفض',
                            'recommendation': f'الاستفادة من نقاط القوة في {subtest}',
                            'type': 'enhancement'
                        })
        
        # توصيات بناءً على الملاحظات
        if record.behavioral_observations:
            obs = record.behavioral_observations.lower()
            if 'قلق' in obs:
                recommendations.append({
                    'area': 'الصحة النفسية',
                    'priority': 'عالي',
                    'recommendation': 'تقييم نفسي متخصص للقلق',
                    'type': 'assessment'
                })
            if 'تشتت' in obs:
                recommendations.append({
                    'area': 'الانتباه والتركيز',
                    'priority': 'متوسط',
                    'recommendation': 'برنامج تدريب الانتباه والتركيز',
                    'type': 'training'
                })
        
        # توصيات عامة
        recommendations.append({
            'area': 'المتابعة',
            'priority': 'متوسط',
            'recommendation': 'إعادة التقييم خلال 6-12 شهر',
            'type': 'follow_up'
        })
        
        return recommendations
    
    def _calculate_confidence_scores(self, record: StudentAssessmentRecord) -> Dict[str, float]:
        """حساب درجات الثقة"""
        confidence_scores = {}
        
        # ثقة التحليل العام
        if record.standard_scores and record.percentiles:
            confidence_scores['overall_analysis'] = 0.85
        elif record.standard_scores or record.percentiles:
            confidence_scores['overall_analysis'] = 0.70
        else:
            confidence_scores['overall_analysis'] = 0.50
        
        # ثقة التنبؤات
        if record.behavioral_observations and record.standard_scores:
            confidence_scores['predictions'] = 0.75
        else:
            confidence_scores['predictions'] = 0.60
        
        # ثقة التوصيات
        confidence_scores['recommendations'] = 0.80
        
        return confidence_scores
    
    def _calculate_trend(self, scores: List[float]) -> float:
        """حساب الاتجاه في الدرجات"""
        if len(scores) < 2:
            return 0
        
        x = list(range(len(scores)))
        n = len(scores)
        
        # حساب معامل الارتباط البسيط
        sum_x = sum(x)
        sum_y = sum(scores)
        sum_xy = sum(x[i] * scores[i] for i in range(n))
        sum_x2 = sum(xi ** 2 for xi in x)
        
        numerator = n * sum_xy - sum_x * sum_y
        denominator = (n * sum_x2 - sum_x ** 2) ** 0.5 * (n * sum(s ** 2 for s in scores) - sum_y ** 2) ** 0.5
        
        if denominator == 0:
            return 0
        
        return numerator / denominator
    
    def compare_longitudinal_assessments(self, file_id: int) -> Dict[str, Any]:
        """مقارنة التقييمات الطولية"""
        try:
            file = StudentComprehensiveFile.query.get(file_id)
            if not file:
                return None
            
            assessments = sorted(file.assessments, key=lambda x: x.assessment_date)
            
            if len(assessments) < 2:
                return {'message': 'يحتاج تقييمين على الأقل للمقارنة'}
            
            comparison = {
                'timeline': [],
                'progress_trends': {},
                'significant_changes': [],
                'overall_trajectory': 'مستقر',
                'recommendations': []
            }
            
            # بناء الخط الزمني
            for assessment in assessments:
                comparison['timeline'].append({
                    'date': assessment.assessment_date.isoformat(),
                    'template': assessment.template.name if assessment.template else 'غير محدد',
                    'overall_score': self._calculate_overall_score(assessment)
                })
            
            # تحليل الاتجاهات
            for template_name in set(a.template.name for a in assessments if a.template):
                template_assessments = [a for a in assessments if a.template and a.template.name == template_name]
                if len(template_assessments) >= 2:
                    trend = self._analyze_template_trend(template_assessments)
                    comparison['progress_trends'][template_name] = trend
            
            # تحديد التغيرات المهمة
            comparison['significant_changes'] = self._identify_significant_changes(assessments)
            
            # تحديد المسار العام
            overall_scores = [self._calculate_overall_score(a) for a in assessments if self._calculate_overall_score(a)]
            if len(overall_scores) >= 2:
                trend = self._calculate_trend(overall_scores)
                if trend > 0.3:
                    comparison['overall_trajectory'] = 'تحسن'
                elif trend < -0.3:
                    comparison['overall_trajectory'] = 'تراجع'
            
            # توصيات بناءً على المقارنة
            comparison['recommendations'] = self._generate_longitudinal_recommendations(comparison)
            
            return comparison
            
        except Exception as e:
            print(f"خطأ في المقارنة الطولية: {e}")
            return None
    
    def _calculate_overall_score(self, assessment: StudentAssessmentRecord) -> Optional[float]:
        """حساب الدرجة الإجمالية للتقييم"""
        if assessment.standard_scores:
            scores = [s for s in assessment.standard_scores.values() if isinstance(s, (int, float))]
            if scores:
                return statistics.mean(scores)
        return None
    
    def _analyze_template_trend(self, assessments: List[StudentAssessmentRecord]) -> Dict[str, Any]:
        """تحليل اتجاه قالب معين"""
        scores = []
        dates = []
        
        for assessment in sorted(assessments, key=lambda x: x.assessment_date):
            overall_score = self._calculate_overall_score(assessment)
            if overall_score:
                scores.append(overall_score)
                dates.append(assessment.assessment_date)
        
        if len(scores) < 2:
            return {'trend': 'غير كافي للتحليل'}
        
        trend_value = self._calculate_trend(scores)
        
        return {
            'trend': 'تحسن' if trend_value > 0.2 else 'تراجع' if trend_value < -0.2 else 'مستقر',
            'trend_value': trend_value,
            'score_change': scores[-1] - scores[0],
            'time_span': (dates[-1] - dates[0]).days
        }
    
    def _identify_significant_changes(self, assessments: List[StudentAssessmentRecord]) -> List[Dict[str, Any]]:
        """تحديد التغيرات المهمة"""
        changes = []
        
        for i in range(1, len(assessments)):
            current = assessments[i]
            previous = assessments[i-1]
            
            current_score = self._calculate_overall_score(current)
            previous_score = self._calculate_overall_score(previous)
            
            if current_score and previous_score:
                change = current_score - previous_score
                if abs(change) >= 15:  # تغير مهم إحصائياً
                    changes.append({
                        'from_date': previous.assessment_date.isoformat(),
                        'to_date': current.assessment_date.isoformat(),
                        'change_type': 'تحسن كبير' if change > 0 else 'تراجع كبير',
                        'magnitude': abs(change),
                        'significance': 'عالي' if abs(change) >= 20 else 'متوسط'
                    })
        
        return changes
    
    def _generate_longitudinal_recommendations(self, comparison: Dict[str, Any]) -> List[str]:
        """توليد توصيات بناءً على المقارنة الطولية"""
        recommendations = []
        
        if comparison['overall_trajectory'] == 'تحسن':
            recommendations.append('الاستمرار في البرنامج الحالي مع مراقبة التقدم')
            recommendations.append('النظر في تقليل كثافة التدخل تدريجياً')
        elif comparison['overall_trajectory'] == 'تراجع':
            recommendations.append('مراجعة شاملة للبرنامج العلاجي')
            recommendations.append('النظر في تكثيف التدخل أو تغيير الاستراتيجية')
        else:
            recommendations.append('مراجعة فعالية البرنامج الحالي')
            recommendations.append('النظر في تعديل الأهداف أو الأساليب')
        
        if comparison['significant_changes']:
            recommendations.append('تحليل العوامل المؤثرة في التغيرات الكبيرة')
        
        return recommendations
