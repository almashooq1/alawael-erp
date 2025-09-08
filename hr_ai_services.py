#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
خدمات الذكاء الاصطناعي لنظام إدارة الموارد البشرية
"""

import json
import numpy as np
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import re
from collections import defaultdict
import statistics

@dataclass
class AIInsight:
    """فئة لتمثيل رؤية الذكاء الاصطناعي"""
    type: str
    confidence: float
    message: str
    recommendations: List[str]
    data: Dict[str, Any]

class HRAnalyticsAI:
    """خدمة التحليلات الذكية للموارد البشرية"""
    
    def __init__(self):
        self.performance_weights = {
            'attendance': 0.25,
            'productivity': 0.30,
            'goals_achievement': 0.25,
            'teamwork': 0.20
        }
        
        self.turnover_risk_factors = {
            'low_performance': 0.3,
            'high_absence': 0.2,
            'no_promotion': 0.15,
            'low_satisfaction': 0.25,
            'salary_below_market': 0.1
        }
    
    def analyze_employee_performance(self, employee_data: Dict) -> AIInsight:
        """تحليل أداء الموظف بالذكاء الاصطناعي"""
        try:
            # حساب نقاط الأداء
            attendance_score = self._calculate_attendance_score(employee_data.get('attendance', []))
            productivity_score = self._calculate_productivity_score(employee_data.get('tasks', []))
            goals_score = employee_data.get('goals_achievement', 3.0)
            teamwork_score = employee_data.get('teamwork_rating', 3.0)
            
            # حساب النقاط الإجمالية
            total_score = (
                attendance_score * self.performance_weights['attendance'] +
                productivity_score * self.performance_weights['productivity'] +
                goals_score * self.performance_weights['goals_achievement'] +
                teamwork_score * self.performance_weights['teamwork']
            )
            
            # تحديد مستوى الأداء
            if total_score >= 4.5:
                performance_level = "ممتاز"
                recommendations = [
                    "الموظف يحقق أداءً استثنائياً",
                    "يُنصح بترقيته أو إعطائه مسؤوليات إضافية",
                    "يمكن أن يكون مرشداً للموظفين الجدد"
                ]
            elif total_score >= 3.5:
                performance_level = "جيد جداً"
                recommendations = [
                    "أداء الموظف فوق المتوسط",
                    "يحتاج لتطوير مهارات محددة للوصول للمستوى الممتاز",
                    "يُنصح بإشراكه في برامج تدريبية متقدمة"
                ]
            elif total_score >= 2.5:
                performance_level = "مقبول"
                recommendations = [
                    "الموظف يحتاج لتحسين في عدة مجالات",
                    "وضع خطة تطوير شخصية",
                    "متابعة دورية مع المدير المباشر"
                ]
            else:
                performance_level = "يحتاج تحسين"
                recommendations = [
                    "الموظف يحتاج لتدخل فوري",
                    "وضع خطة تحسين الأداء",
                    "تقييم إمكانية النقل أو التدريب المكثف"
                ]
            
            return AIInsight(
                type="performance_analysis",
                confidence=0.85,
                message=f"مستوى الأداء: {performance_level} ({total_score:.2f}/5.0)",
                recommendations=recommendations,
                data={
                    'total_score': total_score,
                    'attendance_score': attendance_score,
                    'productivity_score': productivity_score,
                    'goals_score': goals_score,
                    'teamwork_score': teamwork_score,
                    'performance_level': performance_level
                }
            )
            
        except Exception as e:
            return AIInsight(
                type="error",
                confidence=0.0,
                message=f"خطأ في تحليل الأداء: {str(e)}",
                recommendations=[],
                data={}
            )
    
    def predict_turnover_risk(self, employee_data: Dict) -> AIInsight:
        """التنبؤ بمخاطر ترك الموظف للعمل"""
        try:
            risk_score = 0.0
            risk_factors = []
            
            # تحليل عوامل المخاطر
            performance_rating = employee_data.get('performance_rating', 3.0)
            if performance_rating < 2.5:
                risk_score += self.turnover_risk_factors['low_performance']
                risk_factors.append("أداء منخفض")
            
            absence_rate = employee_data.get('absence_rate', 0.0)
            if absence_rate > 0.1:  # أكثر من 10%
                risk_score += self.turnover_risk_factors['high_absence']
                risk_factors.append("معدل غياب عالي")
            
            years_without_promotion = employee_data.get('years_without_promotion', 0)
            if years_without_promotion > 3:
                risk_score += self.turnover_risk_factors['no_promotion']
                risk_factors.append("عدم الحصول على ترقية لفترة طويلة")
            
            satisfaction_score = employee_data.get('satisfaction_score', 3.0)
            if satisfaction_score < 2.5:
                risk_score += self.turnover_risk_factors['low_satisfaction']
                risk_factors.append("مستوى رضا منخفض")
            
            salary_percentile = employee_data.get('salary_percentile', 50)
            if salary_percentile < 25:
                risk_score += self.turnover_risk_factors['salary_below_market']
                risk_factors.append("راتب أقل من السوق")
            
            # تحديد مستوى المخاطر
            if risk_score >= 0.7:
                risk_level = "عالي جداً"
                color = "danger"
                recommendations = [
                    "تدخل فوري مطلوب",
                    "مقابلة شخصية مع الموظف",
                    "مراجعة الراتب والمزايا",
                    "وضع خطة احتفاظ شخصية"
                ]
            elif risk_score >= 0.5:
                risk_level = "عالي"
                color = "warning"
                recommendations = [
                    "مراقبة دقيقة للموظف",
                    "تحسين بيئة العمل",
                    "توفير فرص تطوير مهني",
                    "زيادة التقدير والاعتراف"
                ]
            elif risk_score >= 0.3:
                risk_level = "متوسط"
                color = "info"
                recommendations = [
                    "متابعة دورية",
                    "تحسين التواصل مع المدير",
                    "توفير تدريب إضافي"
                ]
            else:
                risk_level = "منخفض"
                color = "success"
                recommendations = [
                    "الموظف مستقر",
                    "الحفاظ على الوضع الحالي",
                    "استمرار التقدير والدعم"
                ]
            
            return AIInsight(
                type="turnover_prediction",
                confidence=0.80,
                message=f"مخاطر ترك العمل: {risk_level} ({risk_score:.2f})",
                recommendations=recommendations,
                data={
                    'risk_score': risk_score,
                    'risk_level': risk_level,
                    'risk_factors': risk_factors,
                    'color': color,
                    'probability': min(risk_score * 100, 95)
                }
            )
            
        except Exception as e:
            return AIInsight(
                type="error",
                confidence=0.0,
                message=f"خطأ في التنبؤ بالمخاطر: {str(e)}",
                recommendations=[],
                data={}
            )
    
    def recommend_salary_adjustment(self, employee_data: Dict, market_data: Dict) -> AIInsight:
        """توصية تعديل الراتب بناءً على الأداء والسوق"""
        try:
            current_salary = employee_data.get('salary', 0)
            performance_rating = employee_data.get('performance_rating', 3.0)
            years_experience = employee_data.get('years_experience', 0)
            position_level = employee_data.get('position_level', 'junior')
            
            # حساب الراتب المرجعي من السوق
            market_salary = market_data.get(position_level, {}).get('median', current_salary)
            
            # حساب التعديل المقترح
            performance_multiplier = {
                5.0: 1.15,  # ممتاز - زيادة 15%
                4.0: 1.10,  # جيد جداً - زيادة 10%
                3.0: 1.05,  # مقبول - زيادة 5%
                2.0: 1.00,  # يحتاج تحسين - لا زيادة
                1.0: 0.95   # ضعيف - تقليل محتمل
            }.get(round(performance_rating), 1.0)
            
            # حساب الراتب المقترح
            suggested_salary = market_salary * performance_multiplier
            
            # حساب نسبة التغيير
            change_percentage = ((suggested_salary - current_salary) / current_salary) * 100
            
            if change_percentage > 10:
                recommendation_type = "زيادة كبيرة"
                justification = "أداء ممتاز وراتب أقل من السوق"
            elif change_percentage > 5:
                recommendation_type = "زيادة متوسطة"
                justification = "أداء جيد ومواكبة السوق"
            elif change_percentage > 0:
                recommendation_type = "زيادة طفيفة"
                justification = "تحسين تدريجي"
            elif change_percentage < -5:
                recommendation_type = "مراجعة الراتب"
                justification = "أداء ضعيف أو راتب أعلى من السوق"
            else:
                recommendation_type = "لا تغيير"
                justification = "الراتب مناسب للأداء والسوق"
            
            recommendations = [
                f"الراتب المقترح: {suggested_salary:,.0f} ريال",
                f"نسبة التغيير: {change_percentage:+.1f}%",
                f"المبرر: {justification}"
            ]
            
            return AIInsight(
                type="salary_recommendation",
                confidence=0.75,
                message=f"توصية الراتب: {recommendation_type}",
                recommendations=recommendations,
                data={
                    'current_salary': current_salary,
                    'suggested_salary': suggested_salary,
                    'market_salary': market_salary,
                    'change_percentage': change_percentage,
                    'recommendation_type': recommendation_type,
                    'justification': justification
                }
            )
            
        except Exception as e:
            return AIInsight(
                type="error",
                confidence=0.0,
                message=f"خطأ في توصية الراتب: {str(e)}",
                recommendations=[],
                data={}
            )
    
    def analyze_team_dynamics(self, team_data: List[Dict]) -> AIInsight:
        """تحليل ديناميكية الفريق"""
        try:
            if not team_data:
                return AIInsight(
                    type="error",
                    confidence=0.0,
                    message="لا توجد بيانات فريق للتحليل",
                    recommendations=[],
                    data={}
                )
            
            # حساب المؤشرات
            performance_scores = [emp.get('performance_rating', 3.0) for emp in team_data]
            satisfaction_scores = [emp.get('satisfaction_score', 3.0) for emp in team_data]
            collaboration_scores = [emp.get('collaboration_score', 3.0) for emp in team_data]
            
            avg_performance = statistics.mean(performance_scores)
            avg_satisfaction = statistics.mean(satisfaction_scores)
            avg_collaboration = statistics.mean(collaboration_scores)
            
            performance_std = statistics.stdev(performance_scores) if len(performance_scores) > 1 else 0
            
            # تحليل التوزيع
            high_performers = len([s for s in performance_scores if s >= 4.0])
            low_performers = len([s for s in performance_scores if s < 2.5])
            
            # تحديد نقاط القوة والضعف
            strengths = []
            weaknesses = []
            recommendations = []
            
            if avg_performance >= 4.0:
                strengths.append("أداء عام ممتاز للفريق")
            elif avg_performance < 3.0:
                weaknesses.append("أداء عام منخفض للفريق")
                recommendations.append("تحسين الأداء العام للفريق")
            
            if performance_std > 1.0:
                weaknesses.append("تفاوت كبير في الأداء بين أعضاء الفريق")
                recommendations.append("توحيد مستويات الأداء")
            
            if avg_satisfaction < 3.0:
                weaknesses.append("مستوى رضا منخفض")
                recommendations.append("تحسين بيئة العمل والرضا الوظيفي")
            
            if avg_collaboration < 3.0:
                weaknesses.append("ضعف في التعاون")
                recommendations.append("تعزيز روح الفريق والتعاون")
            
            if high_performers / len(team_data) > 0.7:
                strengths.append("نسبة عالية من المتميزين")
            
            if low_performers > 0:
                weaknesses.append(f"وجود {low_performers} موظف يحتاج تحسين")
                recommendations.append("وضع خطط تطوير للموظفين ضعيفي الأداء")
            
            # تقييم عام للفريق
            team_score = (avg_performance + avg_satisfaction + avg_collaboration) / 3
            
            if team_score >= 4.0:
                team_status = "فريق متميز"
            elif team_score >= 3.5:
                team_status = "فريق جيد"
            elif team_score >= 2.5:
                team_status = "فريق يحتاج تطوير"
            else:
                team_status = "فريق يحتاج تدخل عاجل"
            
            return AIInsight(
                type="team_analysis",
                confidence=0.80,
                message=f"حالة الفريق: {team_status} ({team_score:.2f}/5.0)",
                recommendations=recommendations,
                data={
                    'team_score': team_score,
                    'avg_performance': avg_performance,
                    'avg_satisfaction': avg_satisfaction,
                    'avg_collaboration': avg_collaboration,
                    'performance_std': performance_std,
                    'high_performers': high_performers,
                    'low_performers': low_performers,
                    'team_size': len(team_data),
                    'strengths': strengths,
                    'weaknesses': weaknesses,
                    'team_status': team_status
                }
            )
            
        except Exception as e:
            return AIInsight(
                type="error",
                confidence=0.0,
                message=f"خطأ في تحليل الفريق: {str(e)}",
                recommendations=[],
                data={}
            )
    
    def _calculate_attendance_score(self, attendance_records: List[Dict]) -> float:
        """حساب نقاط الحضور"""
        if not attendance_records:
            return 3.0
        
        total_days = len(attendance_records)
        present_days = len([r for r in attendance_records if r.get('status') == 'present'])
        late_days = len([r for r in attendance_records if r.get('status') == 'late'])
        
        attendance_rate = present_days / total_days if total_days > 0 else 0
        late_rate = late_days / total_days if total_days > 0 else 0
        
        # حساب النقاط (5 نقاط كحد أقصى)
        score = attendance_rate * 5
        score -= late_rate * 1  # خصم نقطة لكل يوم تأخير
        
        return max(1.0, min(5.0, score))
    
    def _calculate_productivity_score(self, tasks: List[Dict]) -> float:
        """حساب نقاط الإنتاجية"""
        if not tasks:
            return 3.0
        
        completed_tasks = len([t for t in tasks if t.get('status') == 'completed'])
        total_tasks = len(tasks)
        on_time_tasks = len([t for t in tasks if t.get('completed_on_time', False)])
        
        completion_rate = completed_tasks / total_tasks if total_tasks > 0 else 0
        on_time_rate = on_time_tasks / completed_tasks if completed_tasks > 0 else 0
        
        # حساب النقاط
        score = (completion_rate * 3) + (on_time_rate * 2)
        
        return max(1.0, min(5.0, score))

class RecruitmentAI:
    """خدمة الذكاء الاصطناعي للتوظيف"""
    
    def __init__(self):
        self.skill_keywords = {
            'technical': ['python', 'java', 'sql', 'javascript', 'react', 'angular', 'node.js'],
            'soft_skills': ['communication', 'leadership', 'teamwork', 'problem solving', 'creativity'],
            'experience': ['years', 'experience', 'worked', 'managed', 'led', 'developed']
        }
    
    def analyze_resume(self, resume_text: str, job_requirements: Dict) -> AIInsight:
        """تحليل السيرة الذاتية مقابل متطلبات الوظيفة"""
        try:
            resume_lower = resume_text.lower()
            
            # استخراج المهارات
            technical_skills = self._extract_skills(resume_lower, 'technical')
            soft_skills = self._extract_skills(resume_lower, 'soft_skills')
            
            # حساب سنوات الخبرة
            experience_years = self._extract_experience_years(resume_lower)
            
            # مطابقة المتطلبات
            required_skills = job_requirements.get('required_skills', [])
            preferred_skills = job_requirements.get('preferred_skills', [])
            min_experience = job_requirements.get('min_experience', 0)
            
            # حساب نقاط المطابقة
            skill_match_score = self._calculate_skill_match(
                technical_skills + soft_skills, 
                required_skills + preferred_skills
            )
            
            experience_score = min(experience_years / max(min_experience, 1), 1.0) if min_experience > 0 else 1.0
            
            # النقاط الإجمالية
            total_score = (skill_match_score * 0.7) + (experience_score * 0.3)
            
            # التوصيات
            if total_score >= 0.8:
                recommendation = "مرشح ممتاز - يُنصح بالمقابلة"
                priority = "high"
            elif total_score >= 0.6:
                recommendation = "مرشح جيد - يستحق المراجعة"
                priority = "medium"
            elif total_score >= 0.4:
                recommendation = "مرشح محتمل - مراجعة إضافية مطلوبة"
                priority = "low"
            else:
                recommendation = "مرشح غير مناسب"
                priority = "reject"
            
            return AIInsight(
                type="resume_analysis",
                confidence=0.75,
                message=f"نقاط المطابقة: {total_score:.2f} - {recommendation}",
                recommendations=[recommendation],
                data={
                    'total_score': total_score,
                    'skill_match_score': skill_match_score,
                    'experience_score': experience_score,
                    'technical_skills': technical_skills,
                    'soft_skills': soft_skills,
                    'experience_years': experience_years,
                    'priority': priority,
                    'recommendation': recommendation
                }
            )
            
        except Exception as e:
            return AIInsight(
                type="error",
                confidence=0.0,
                message=f"خطأ في تحليل السيرة الذاتية: {str(e)}",
                recommendations=[],
                data={}
            )
    
    def _extract_skills(self, text: str, category: str) -> List[str]:
        """استخراج المهارات من النص"""
        found_skills = []
        keywords = self.skill_keywords.get(category, [])
        
        for keyword in keywords:
            if keyword in text:
                found_skills.append(keyword)
        
        return found_skills
    
    def _extract_experience_years(self, text: str) -> int:
        """استخراج سنوات الخبرة من النص"""
        # البحث عن أنماط مثل "5 years experience" أو "3+ years"
        patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?work',
            r'experience\s*(?:of\s*)?(\d+)\+?\s*years?'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return max([int(match) for match in matches])
        
        return 0
    
    def _calculate_skill_match(self, candidate_skills: List[str], required_skills: List[str]) -> float:
        """حساب نسبة مطابقة المهارات"""
        if not required_skills:
            return 1.0
        
        matched_skills = len(set(candidate_skills) & set(required_skills))
        return matched_skills / len(required_skills)

class TrainingRecommendationAI:
    """خدمة توصيات التدريب بالذكاء الاصطناعي"""
    
    def __init__(self):
        self.skill_training_map = {
            'communication': ['public_speaking', 'presentation_skills', 'writing_skills'],
            'leadership': ['management_training', 'team_building', 'decision_making'],
            'technical': ['programming', 'data_analysis', 'system_design'],
            'customer_service': ['customer_relations', 'conflict_resolution', 'sales_techniques']
        }
    
    def recommend_training(self, employee_data: Dict, performance_gaps: List[str]) -> AIInsight:
        """توصية برامج التدريب بناءً على فجوات الأداء"""
        try:
            current_skills = employee_data.get('skills', [])
            position_requirements = employee_data.get('position_requirements', [])
            career_goals = employee_data.get('career_goals', [])
            
            # تحديد المهارات المفقودة
            missing_skills = list(set(position_requirements) - set(current_skills))
            
            # توصيات التدريب
            training_recommendations = []
            priority_scores = {}
            
            # تدريب للمهارات المفقودة (أولوية عالية)
            for skill in missing_skills:
                trainings = self.skill_training_map.get(skill, [skill + '_training'])
                for training in trainings:
                    training_recommendations.append({
                        'program': training,
                        'reason': f'مهارة مطلوبة للمنصب: {skill}',
                        'priority': 'high',
                        'urgency': 'immediate'
                    })
                    priority_scores[training] = 0.9
            
            # تدريب لفجوات الأداء (أولوية متوسطة)
            for gap in performance_gaps:
                trainings = self.skill_training_map.get(gap, [gap + '_improvement'])
                for training in trainings:
                    if training not in [r['program'] for r in training_recommendations]:
                        training_recommendations.append({
                            'program': training,
                            'reason': f'تحسين الأداء في: {gap}',
                            'priority': 'medium',
                            'urgency': 'within_3_months'
                        })
                        priority_scores[training] = 0.7
            
            # تدريب للأهداف المهنية (أولوية منخفضة)
            for goal in career_goals:
                trainings = self.skill_training_map.get(goal, [goal + '_development'])
                for training in trainings:
                    if training not in [r['program'] for r in training_recommendations]:
                        training_recommendations.append({
                            'program': training,
                            'reason': f'تطوير مهني: {goal}',
                            'priority': 'low',
                            'urgency': 'within_6_months'
                        })
                        priority_scores[training] = 0.5
            
            # ترتيب التوصيات حسب الأولوية
            training_recommendations.sort(key=lambda x: priority_scores.get(x['program'], 0), reverse=True)
            
            # أخذ أفضل 5 توصيات
            top_recommendations = training_recommendations[:5]
            
            recommendations_text = [
                f"{rec['program']}: {rec['reason']} (أولوية: {rec['priority']})"
                for rec in top_recommendations
            ]
            
            return AIInsight(
                type="training_recommendation",
                confidence=0.80,
                message=f"تم تحديد {len(top_recommendations)} برنامج تدريبي موصى به",
                recommendations=recommendations_text,
                data={
                    'training_programs': top_recommendations,
                    'missing_skills': missing_skills,
                    'performance_gaps': performance_gaps,
                    'total_recommendations': len(training_recommendations)
                }
            )
            
        except Exception as e:
            return AIInsight(
                type="error",
                confidence=0.0,
                message=f"خطأ في توصيات التدريب: {str(e)}",
                recommendations=[],
                data={}
            )
