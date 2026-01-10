# -*- coding: utf-8 -*-
"""
خدمات تحليل أنماط التعلم والسلوك
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_, desc, asc
from database import db
from learning_behavior_analysis_models import (
    LearningStyle, BehaviorPattern, StudentLearningProfile, BehaviorObservation,
    LearningAnalytics, BehaviorIntervention, LearningEnvironmentFactor, EnvironmentAssessment
)
import json
import numpy as np
from typing import Dict, List, Optional, Any
import statistics

class LearningBehaviorAnalysisService:
    """خدمة تحليل أنماط التعلم والسلوك"""
    
    @staticmethod
    def analyze_student_learning_pattern(student_id: int, period_days: int = 30) -> Dict[str, Any]:
        """تحليل نمط تعلم الطالب"""
        try:
            from models import Student, StudentSkillAssessment, StudentSkillProgress
            
            student = Student.query.get(student_id)
            if not student:
                return {'success': False, 'message': 'الطالب غير موجود'}
            
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=period_days)
            
            # جمع بيانات التقييمات
            assessments = StudentSkillAssessment.query.filter(
                StudentSkillAssessment.student_id == student_id,
                StudentSkillAssessment.assessment_date.between(start_date, end_date)
            ).all()
            
            # جمع بيانات التقدم
            progress_records = StudentSkillProgress.query.filter(
                StudentSkillProgress.student_id == student_id,
                StudentSkillProgress.progress_date.between(start_date, end_date)
            ).all()
            
            # جمع ملاحظات السلوك
            behavior_observations = BehaviorObservation.query.filter(
                BehaviorObservation.student_id == student_id,
                BehaviorObservation.observation_date.between(start_date, end_date)
            ).all()
            
            # تحليل أنماط التعلم
            learning_analysis = LearningBehaviorAnalysisService._analyze_learning_patterns(
                assessments, progress_records
            )
            
            # تحليل أنماط السلوك
            behavior_analysis = LearningBehaviorAnalysisService._analyze_behavior_patterns(
                behavior_observations
            )
            
            # تحليل العوامل البيئية
            environment_analysis = LearningBehaviorAnalysisService._analyze_environmental_factors(
                student_id, start_date, end_date
            )
            
            # إنشاء التوصيات
            recommendations = LearningBehaviorAnalysisService._generate_recommendations(
                learning_analysis, behavior_analysis, environment_analysis
            )
            
            # حفظ التحليل
            analytics_record = LearningAnalytics(
                student_id=student_id,
                analysis_period_start=start_date,
                analysis_period_end=end_date,
                learning_progress_score=learning_analysis.get('progress_score', 0),
                engagement_level=learning_analysis.get('engagement_level', 0),
                attention_consistency=behavior_analysis.get('attention_consistency', 0),
                social_interaction_score=behavior_analysis.get('social_interaction_score', 0),
                independence_growth=learning_analysis.get('independence_growth', 0),
                behavior_improvement=behavior_analysis.get('behavior_improvement', 0),
                skill_acquisition_rate=learning_analysis.get('skill_acquisition_rate', 0),
                preferred_learning_times=json.dumps(learning_analysis.get('preferred_times', [])),
                optimal_session_duration=learning_analysis.get('optimal_duration', 30),
                most_effective_strategies=json.dumps(learning_analysis.get('effective_strategies', [])),
                challenging_areas=json.dumps(learning_analysis.get('challenging_areas', [])),
                recommendations=json.dumps(recommendations),
                data_quality_score=learning_analysis.get('data_quality', 0.8)
            )
            
            db.session.add(analytics_record)
            db.session.commit()
            
            return {
                'success': True,
                'student_name': student.name,
                'analysis_period': f'{start_date.strftime("%Y-%m-%d")} إلى {end_date.strftime("%Y-%m-%d")}',
                'learning_analysis': learning_analysis,
                'behavior_analysis': behavior_analysis,
                'environment_analysis': environment_analysis,
                'recommendations': recommendations,
                'analytics_id': analytics_record.id
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في تحليل نمط التعلم: {str(e)}'}
    
    @staticmethod
    def _analyze_learning_patterns(assessments: List, progress_records: List) -> Dict[str, Any]:
        """تحليل أنماط التعلم"""
        if not assessments and not progress_records:
            return {
                'progress_score': 0,
                'engagement_level': 0,
                'independence_growth': 0,
                'skill_acquisition_rate': 0,
                'preferred_times': [],
                'optimal_duration': 30,
                'effective_strategies': [],
                'challenging_areas': [],
                'data_quality': 0.1
            }
        
        # تحليل التقدم
        progress_scores = []
        skill_areas = {}
        time_patterns = []
        
        for assessment in assessments:
            if assessment.score is not None:
                progress_scores.append(assessment.score)
                
                # تحليل المجالات
                skill_name = assessment.skill.name if assessment.skill else 'غير محدد'
                if skill_name not in skill_areas:
                    skill_areas[skill_name] = []
                skill_areas[skill_name].append(assessment.score)
                
                # تحليل الأوقات
                if assessment.assessment_date:
                    time_patterns.append(assessment.assessment_date.hour)
        
        for progress in progress_records:
            if progress.progress_score is not None:
                progress_scores.append(progress.progress_score)
                
                if progress.progress_date:
                    time_patterns.append(progress.progress_date.hour)
        
        # حساب المقاييس
        avg_progress = statistics.mean(progress_scores) if progress_scores else 0
        progress_trend = LearningBehaviorAnalysisService._calculate_trend(progress_scores)
        
        # تحليل الأوقات المفضلة
        preferred_times = []
        if time_patterns:
            time_counts = {}
            for hour in time_patterns:
                time_counts[hour] = time_counts.get(hour, 0) + 1
            
            # أفضل 3 أوقات
            sorted_times = sorted(time_counts.items(), key=lambda x: x[1], reverse=True)[:3]
            preferred_times = [f"{hour}:00" for hour, _ in sorted_times]
        
        # تحديد المجالات الصعبة
        challenging_areas = []
        for skill, scores in skill_areas.items():
            if scores and statistics.mean(scores) < 60:  # أقل من 60%
                challenging_areas.append(skill)
        
        return {
            'progress_score': round(avg_progress, 2),
            'engagement_level': min(10, max(0, avg_progress / 10)),
            'independence_growth': progress_trend,
            'skill_acquisition_rate': len(skill_areas),
            'preferred_times': preferred_times,
            'optimal_duration': 45 if avg_progress > 70 else 30,
            'effective_strategies': ['التعلم التفاعلي', 'التعزيز الإيجابي'],
            'challenging_areas': challenging_areas,
            'data_quality': min(1.0, len(progress_scores) / 10)
        }
    
    @staticmethod
    def _analyze_behavior_patterns(observations: List) -> Dict[str, Any]:
        """تحليل أنماط السلوك"""
        if not observations:
            return {
                'attention_consistency': 5.0,
                'social_interaction_score': 5.0,
                'behavior_improvement': 0.0,
                'positive_behaviors': 0,
                'negative_behaviors': 0,
                'intervention_effectiveness': 0.0
            }
        
        positive_count = 0
        negative_count = 0
        attention_scores = []
        social_scores = []
        intervention_effectiveness = []
        
        for obs in observations:
            # تصنيف السلوك
            if obs.behavior_pattern:
                if obs.behavior_pattern.category == 'positive':
                    positive_count += 1
                elif obs.behavior_pattern.category == 'negative':
                    negative_count += 1
            
            # تقييم الانتباه (بناءً على المدة والسياق)
            if obs.duration and obs.context == 'classroom':
                attention_score = min(10, obs.duration / 6)  # كل 6 دقائق = نقطة
                attention_scores.append(attention_score)
            
            # تقييم التفاعل الاجتماعي
            if obs.social_context:
                if obs.social_context == 'with_peers':
                    social_scores.append(8)
                elif obs.social_context == 'with_adult':
                    social_scores.append(6)
                else:  # alone
                    social_scores.append(3)
            
            # فعالية التدخل
            if obs.effectiveness:
                if obs.effectiveness == 'effective':
                    intervention_effectiveness.append(10)
                elif obs.effectiveness == 'partially_effective':
                    intervention_effectiveness.append(5)
                else:
                    intervention_effectiveness.append(0)
        
        # حساب المتوسطات
        avg_attention = statistics.mean(attention_scores) if attention_scores else 5.0
        avg_social = statistics.mean(social_scores) if social_scores else 5.0
        avg_intervention = statistics.mean(intervention_effectiveness) if intervention_effectiveness else 0.0
        
        # حساب التحسن السلوكي
        behavior_improvement = 0.0
        if positive_count + negative_count > 0:
            behavior_improvement = (positive_count - negative_count) / (positive_count + negative_count) * 10
        
        return {
            'attention_consistency': round(avg_attention, 2),
            'social_interaction_score': round(avg_social, 2),
            'behavior_improvement': round(behavior_improvement, 2),
            'positive_behaviors': positive_count,
            'negative_behaviors': negative_count,
            'intervention_effectiveness': round(avg_intervention, 2)
        }
    
    @staticmethod
    def _analyze_environmental_factors(student_id: int, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """تحليل العوامل البيئية"""
        try:
            from models import Student
            
            student = Student.query.get(student_id)
            if not student:
                return {'optimal_environment': {}, 'environmental_impact': 0.0}
            
            # الحصول على تقييمات البيئة للفصول التي يدرس فيها الطالب
            environment_assessments = []
            if hasattr(student, 'classrooms'):
                for classroom in student.classrooms:
                    assessments = EnvironmentAssessment.query.filter(
                        EnvironmentAssessment.classroom_id == classroom.id,
                        EnvironmentAssessment.assessment_date.between(start_date, end_date)
                    ).all()
                    environment_assessments.extend(assessments)
            
            if not environment_assessments:
                return {
                    'optimal_environment': {
                        'lighting': 'طبيعي ومعتدل',
                        'noise_level': 'منخفض',
                        'temperature': '22-24 درجة مئوية',
                        'seating': 'مرن وقابل للتعديل'
                    },
                    'environmental_impact': 5.0
                }
            
            # تحليل البيانات البيئية
            total_score = 0
            assessment_count = 0
            
            for assessment in environment_assessments:
                if assessment.overall_score:
                    total_score += assessment.overall_score
                    assessment_count += 1
            
            avg_environmental_score = total_score / assessment_count if assessment_count > 0 else 50.0
            
            return {
                'optimal_environment': {
                    'lighting': 'طبيعي ومعتدل',
                    'noise_level': 'منخفض إلى متوسط',
                    'temperature': '22-24 درجة مئوية',
                    'seating': 'مرن وقابل للتعديل',
                    'visual_distractions': 'محدودة',
                    'organization': 'منظم وواضح'
                },
                'environmental_impact': round(avg_environmental_score / 10, 2)
            }
            
        except Exception as e:
            return {'optimal_environment': {}, 'environmental_impact': 5.0}
    
    @staticmethod
    def _generate_recommendations(learning_analysis: Dict, behavior_analysis: Dict, environment_analysis: Dict) -> List[Dict[str, Any]]:
        """إنشاء التوصيات"""
        recommendations = []
        
        # توصيات التعلم
        if learning_analysis.get('progress_score', 0) < 50:
            recommendations.append({
                'category': 'learning',
                'priority': 'high',
                'title': 'تحسين استراتيجيات التعلم',
                'description': 'يحتاج الطالب إلى استراتيجيات تعلم أكثر فعالية',
                'actions': [
                    'استخدام التعلم البصري والحسي',
                    'تقسيم المهام إلى خطوات صغيرة',
                    'زيادة التعزيز الإيجابي'
                ]
            })
        
        if learning_analysis.get('engagement_level', 0) < 5:
            recommendations.append({
                'category': 'engagement',
                'priority': 'high',
                'title': 'زيادة مستوى المشاركة',
                'description': 'يحتاج الطالب إلى أنشطة أكثر تفاعلية',
                'actions': [
                    'استخدام الألعاب التعليمية',
                    'دمج اهتمامات الطالب في التعلم',
                    'تنويع طرق التدريس'
                ]
            })
        
        # توصيات السلوك
        if behavior_analysis.get('negative_behaviors', 0) > behavior_analysis.get('positive_behaviors', 0):
            recommendations.append({
                'category': 'behavior',
                'priority': 'high',
                'title': 'تحسين السلوك',
                'description': 'يحتاج الطالب إلى تدخلات سلوكية إيجابية',
                'actions': [
                    'تطبيق نظام المكافآت',
                    'تعليم مهارات التنظيم الذاتي',
                    'وضع قواعد واضحة ومتسقة'
                ]
            })
        
        if behavior_analysis.get('social_interaction_score', 0) < 5:
            recommendations.append({
                'category': 'social',
                'priority': 'medium',
                'title': 'تطوير المهارات الاجتماعية',
                'description': 'يحتاج الطالب إلى تطوير مهارات التفاعل الاجتماعي',
                'actions': [
                    'أنشطة جماعية منظمة',
                    'تدريب على مهارات التواصل',
                    'نمذجة السلوك الاجتماعي المناسب'
                ]
            })
        
        # توصيات البيئة
        if environment_analysis.get('environmental_impact', 0) < 5:
            recommendations.append({
                'category': 'environment',
                'priority': 'medium',
                'title': 'تحسين البيئة التعليمية',
                'description': 'تحتاج البيئة التعليمية إلى تحسينات',
                'actions': [
                    'تقليل المشتتات البصرية',
                    'تحسين الإضاءة والتهوية',
                    'توفير مساحات هادئة للتعلم'
                ]
            })
        
        return recommendations
    
    @staticmethod
    def _calculate_trend(values: List[float]) -> float:
        """حساب اتجاه التغيير"""
        if len(values) < 2:
            return 0.0
        
        # حساب معامل الارتباط مع الزمن
        x = list(range(len(values)))
        y = values
        
        if len(set(y)) == 1:  # جميع القيم متساوية
            return 0.0
        
        try:
            correlation = np.corrcoef(x, y)[0, 1]
            return correlation * 10  # تحويل إلى مقياس من -10 إلى 10
        except:
            return 0.0
    
    @staticmethod
    def create_behavior_intervention(student_id: int, intervention_data: Dict[str, Any]) -> Dict[str, Any]:
        """إنشاء تدخل سلوكي"""
        try:
            intervention = BehaviorIntervention(
                student_id=student_id,
                behavior_pattern_id=intervention_data.get('behavior_pattern_id'),
                intervention_name=intervention_data.get('intervention_name'),
                intervention_type=intervention_data.get('intervention_type'),
                description=intervention_data.get('description'),
                target_behaviors=json.dumps(intervention_data.get('target_behaviors', [])),
                strategies=json.dumps(intervention_data.get('strategies', [])),
                implementation_steps=json.dumps(intervention_data.get('implementation_steps', [])),
                responsible_staff=json.dumps(intervention_data.get('responsible_staff', [])),
                start_date=datetime.fromisoformat(intervention_data.get('start_date')),
                end_date=datetime.fromisoformat(intervention_data.get('end_date')) if intervention_data.get('end_date') else None,
                frequency=intervention_data.get('frequency'),
                duration_per_session=intervention_data.get('duration_per_session'),
                success_criteria=json.dumps(intervention_data.get('success_criteria', [])),
                progress_indicators=json.dumps(intervention_data.get('progress_indicators', [])),
                data_collection_method=intervention_data.get('data_collection_method'),
                baseline_data=json.dumps(intervention_data.get('baseline_data', {})),
                created_by=intervention_data.get('created_by')
            )
            
            db.session.add(intervention)
            db.session.commit()
            
            return {
                'success': True,
                'message': 'تم إنشاء التدخل السلوكي بنجاح',
                'intervention': intervention.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في إنشاء التدخل السلوكي: {str(e)}'}
    
    @staticmethod
    def get_learning_analytics_dashboard(student_id: int = None, period_days: int = 30) -> Dict[str, Any]:
        """لوحة تحكم تحليلات التعلم"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=period_days)
            
            query = LearningAnalytics.query.filter(
                LearningAnalytics.analysis_date.between(start_date, end_date)
            )
            
            if student_id:
                query = query.filter(LearningAnalytics.student_id == student_id)
            
            analytics = query.all()
            
            if not analytics:
                return {
                    'success': True,
                    'summary': {
                        'total_analyses': 0,
                        'avg_progress_score': 0,
                        'avg_engagement': 0,
                        'students_analyzed': 0
                    },
                    'trends': {},
                    'recommendations': []
                }
            
            # حساب الإحصائيات
            total_analyses = len(analytics)
            progress_scores = [a.learning_progress_score for a in analytics if a.learning_progress_score]
            engagement_levels = [a.engagement_level for a in analytics if a.engagement_level]
            
            avg_progress = statistics.mean(progress_scores) if progress_scores else 0
            avg_engagement = statistics.mean(engagement_levels) if engagement_levels else 0
            
            # عدد الطلاب المحللين
            unique_students = len(set(a.student_id for a in analytics))
            
            # اتجاهات التحسن
            trends = {
                'progress_trend': LearningBehaviorAnalysisService._calculate_trend(progress_scores),
                'engagement_trend': LearningBehaviorAnalysisService._calculate_trend(engagement_levels)
            }
            
            # التوصيات الشائعة
            all_recommendations = []
            for a in analytics:
                if a.recommendations:
                    recommendations = json.loads(a.recommendations)
                    all_recommendations.extend(recommendations)
            
            # تجميع التوصيات حسب الفئة
            recommendation_categories = {}
            for rec in all_recommendations:
                category = rec.get('category', 'other')
                if category not in recommendation_categories:
                    recommendation_categories[category] = 0
                recommendation_categories[category] += 1
            
            return {
                'success': True,
                'summary': {
                    'total_analyses': total_analyses,
                    'avg_progress_score': round(avg_progress, 2),
                    'avg_engagement': round(avg_engagement, 2),
                    'students_analyzed': unique_students
                },
                'trends': trends,
                'recommendation_categories': recommendation_categories,
                'period': f'{start_date.strftime("%Y-%m-%d")} إلى {end_date.strftime("%Y-%m-%d")}'
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في لوحة التحكم: {str(e)}'}
    
    @staticmethod
    def update_learning_profile(student_id: int, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """تحديث ملف تعريف التعلم للطالب"""
        try:
            profile = StudentLearningProfile.query.filter_by(student_id=student_id).first()
            
            if not profile:
                profile = StudentLearningProfile(student_id=student_id)
                db.session.add(profile)
            
            # تحديث البيانات
            if 'primary_learning_style_id' in profile_data:
                profile.primary_learning_style_id = profile_data['primary_learning_style_id']
            
            if 'secondary_learning_style_id' in profile_data:
                profile.secondary_learning_style_id = profile_data['secondary_learning_style_id']
            
            if 'learning_preferences' in profile_data:
                profile.learning_preferences = json.dumps(profile_data['learning_preferences'])
            
            if 'strengths' in profile_data:
                profile.strengths = json.dumps(profile_data['strengths'])
            
            if 'challenges' in profile_data:
                profile.challenges = json.dumps(profile_data['challenges'])
            
            if 'attention_span' in profile_data:
                profile.attention_span = profile_data['attention_span']
            
            if 'motivation_factors' in profile_data:
                profile.motivation_factors = json.dumps(profile_data['motivation_factors'])
            
            if 'preferred_activities' in profile_data:
                profile.preferred_activities = json.dumps(profile_data['preferred_activities'])
            
            if 'learning_pace' in profile_data:
                profile.learning_pace = profile_data['learning_pace']
            
            if 'social_interaction_level' in profile_data:
                profile.social_interaction_level = profile_data['social_interaction_level']
            
            if 'independence_level' in profile_data:
                profile.independence_level = profile_data['independence_level']
            
            if 'confidence_score' in profile_data:
                profile.confidence_score = profile_data['confidence_score']
            
            if 'assessed_by' in profile_data:
                profile.assessed_by = profile_data['assessed_by']
            
            if 'notes' in profile_data:
                profile.notes = profile_data['notes']
            
            profile.last_assessment_date = datetime.utcnow()
            profile.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'success': True,
                'message': 'تم تحديث ملف تعريف التعلم بنجاح',
                'profile': profile.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في تحديث ملف التعريف: {str(e)}'}
