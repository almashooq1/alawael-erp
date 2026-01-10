# -*- coding: utf-8 -*-
"""
خدمات التوصيات الذكية للبرامج العلاجية
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_, desc, asc
from database import db
from smart_therapy_recommendations_models import (
    TherapyRecommendationEngine, TherapyRecommendation, RecommendationTemplate,
    RecommendationFeedback, RecommendationRule, RecommendationMetrics,
    RecommendationAlert, RecommendationHistory
)
import json
import numpy as np
from typing import Dict, List, Optional, Any
import statistics
import random

class SmartTherapyRecommendationService:
    """خدمة التوصيات الذكية للبرامج العلاجية"""
    
    @staticmethod
    def generate_recommendations_for_student(student_id: int, recommendation_type: str = None) -> Dict[str, Any]:
        """إنشاء توصيات ذكية للطالب"""
        try:
            from models import Student, StudentSkillAssessment, StudentSkillProgress
            from learning_behavior_analysis_models import StudentLearningProfile, LearningAnalytics
            
            student = Student.query.get(student_id)
            if not student:
                return {'success': False, 'message': 'الطالب غير موجود'}
            
            # جمع بيانات الطالب
            student_data = SmartTherapyRecommendationService._collect_student_data(student_id)
            
            # تحليل البيانات
            analysis_results = SmartTherapyRecommendationService._analyze_student_needs(student_data)
            
            # إنشاء التوصيات
            recommendations = SmartTherapyRecommendationService._create_recommendations(
                student_id, analysis_results, recommendation_type
            )
            
            # حفظ التوصيات في قاعدة البيانات
            saved_recommendations = []
            for rec_data in recommendations:
                recommendation = TherapyRecommendation(
                    student_id=student_id,
                    recommendation_type=rec_data['type'],
                    title=rec_data['title'],
                    description=rec_data['description'],
                    rationale=rec_data['rationale'],
                    priority_level=rec_data['priority'],
                    confidence_score=rec_data['confidence'],
                    target_skills=json.dumps(rec_data['target_skills']),
                    expected_outcomes=json.dumps(rec_data['expected_outcomes']),
                    implementation_steps=json.dumps(rec_data['implementation_steps']),
                    required_resources=json.dumps(rec_data['required_resources']),
                    estimated_duration=rec_data['estimated_duration'],
                    frequency_per_week=rec_data['frequency_per_week'],
                    session_duration=rec_data['session_duration'],
                    success_metrics=json.dumps(rec_data['success_metrics'])
                )
                
                db.session.add(recommendation)
                saved_recommendations.append(recommendation)
            
            db.session.commit()
            
            return {
                'success': True,
                'student_name': student.name,
                'recommendations_count': len(saved_recommendations),
                'recommendations': [rec.to_dict() for rec in saved_recommendations],
                'analysis_summary': analysis_results
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في إنشاء التوصيات: {str(e)}'}
    
    @staticmethod
    def _collect_student_data(student_id: int) -> Dict[str, Any]:
        """جمع بيانات الطالب الشاملة"""
        from models import Student, StudentSkillAssessment, StudentSkillProgress
        from learning_behavior_analysis_models import StudentLearningProfile, LearningAnalytics, BehaviorObservation
        
        data = {
            'basic_info': {},
            'assessments': [],
            'progress': [],
            'learning_profile': None,
            'behavior_data': [],
            'analytics': []
        }
        
        # البيانات الأساسية
        student = Student.query.get(student_id)
        if student:
            data['basic_info'] = {
                'age': student.age,
                'condition': student.condition,
                'severity_level': getattr(student, 'severity_level', 'moderate')
            }
        
        # التقييمات
        assessments = StudentSkillAssessment.query.filter_by(student_id=student_id).order_by(
            StudentSkillAssessment.assessment_date.desc()
        ).limit(10).all()
        data['assessments'] = [assessment.to_dict() for assessment in assessments]
        
        # التقدم
        progress_records = StudentSkillProgress.query.filter_by(student_id=student_id).order_by(
            StudentSkillProgress.progress_date.desc()
        ).limit(20).all()
        data['progress'] = [progress.to_dict() for progress in progress_records]
        
        # ملف التعلم
        learning_profile = StudentLearningProfile.query.filter_by(student_id=student_id).first()
        if learning_profile:
            data['learning_profile'] = learning_profile.to_dict()
        
        # ملاحظات السلوك
        behavior_obs = BehaviorObservation.query.filter_by(student_id=student_id).order_by(
            BehaviorObservation.observation_date.desc()
        ).limit(15).all()
        data['behavior_data'] = [obs.to_dict() for obs in behavior_obs]
        
        # التحليلات
        analytics = LearningAnalytics.query.filter_by(student_id=student_id).order_by(
            LearningAnalytics.analysis_date.desc()
        ).limit(5).all()
        data['analytics'] = [analysis.to_dict() for analysis in analytics]
        
        return data
    
    @staticmethod
    def _analyze_student_needs(student_data: Dict[str, Any]) -> Dict[str, Any]:
        """تحليل احتياجات الطالب"""
        analysis = {
            'priority_areas': [],
            'strengths': [],
            'challenges': [],
            'learning_style': None,
            'behavioral_patterns': [],
            'progress_trends': {},
            'recommendations_focus': []
        }
        
        # تحليل نقاط القوة والضعف
        if student_data['assessments']:
            skill_scores = {}
            for assessment in student_data['assessments']:
                skill_name = assessment.get('skill_name', 'Unknown')
                score = assessment.get('score', 0)
                
                if skill_name not in skill_scores:
                    skill_scores[skill_name] = []
                skill_scores[skill_name].append(score)
            
            for skill, scores in skill_scores.items():
                avg_score = statistics.mean(scores)
                if avg_score >= 75:
                    analysis['strengths'].append(skill)
                elif avg_score < 50:
                    analysis['challenges'].append(skill)
                    analysis['priority_areas'].append({
                        'area': skill,
                        'current_level': avg_score,
                        'urgency': 'high' if avg_score < 30 else 'medium'
                    })
        
        # تحليل نمط التعلم
        if student_data['learning_profile']:
            profile = student_data['learning_profile']
            analysis['learning_style'] = profile.get('primary_learning_style')
            if profile.get('strengths'):
                analysis['strengths'].extend(profile['strengths'])
            if profile.get('challenges'):
                analysis['challenges'].extend(profile['challenges'])
        
        # تحليل الأنماط السلوكية
        if student_data['behavior_data']:
            positive_behaviors = 0
            negative_behaviors = 0
            
            for obs in student_data['behavior_data']:
                if obs.get('behavior_pattern'):
                    category = obs['behavior_pattern'].get('category')
                    if category == 'positive':
                        positive_behaviors += 1
                    elif category == 'negative':
                        negative_behaviors += 1
            
            analysis['behavioral_patterns'] = {
                'positive_ratio': positive_behaviors / (positive_behaviors + negative_behaviors) if (positive_behaviors + negative_behaviors) > 0 else 0,
                'needs_behavioral_support': negative_behaviors > positive_behaviors
            }
        
        # تحليل اتجاهات التقدم
        if student_data['progress']:
            recent_progress = student_data['progress'][:5]
            if len(recent_progress) >= 2:
                scores = [p.get('progress_score', 0) for p in recent_progress]
                trend = SmartTherapyRecommendationService._calculate_trend(scores)
                analysis['progress_trends'] = {
                    'overall_trend': 'improving' if trend > 0.1 else 'declining' if trend < -0.1 else 'stable',
                    'trend_value': trend
                }
        
        # تحديد محاور التركيز للتوصيات
        if analysis['challenges']:
            analysis['recommendations_focus'].append('skill_development')
        
        if analysis['behavioral_patterns'].get('needs_behavioral_support'):
            analysis['recommendations_focus'].append('behavioral_intervention')
        
        if analysis['progress_trends'].get('overall_trend') == 'declining':
            analysis['recommendations_focus'].append('motivation_enhancement')
        
        return analysis
    
    @staticmethod
    def _create_recommendations(student_id: int, analysis: Dict[str, Any], rec_type: str = None) -> List[Dict[str, Any]]:
        """إنشاء التوصيات بناءً على التحليل"""
        recommendations = []
        
        # توصيات تطوير المهارات
        if 'skill_development' in analysis['recommendations_focus']:
            for priority_area in analysis['priority_areas']:
                rec = SmartTherapyRecommendationService._create_skill_development_recommendation(
                    priority_area, analysis
                )
                recommendations.append(rec)
        
        # توصيات التدخل السلوكي
        if 'behavioral_intervention' in analysis['recommendations_focus']:
            rec = SmartTherapyRecommendationService._create_behavioral_recommendation(analysis)
            recommendations.append(rec)
        
        # توصيات تحفيز التعلم
        if 'motivation_enhancement' in analysis['recommendations_focus']:
            rec = SmartTherapyRecommendationService._create_motivation_recommendation(analysis)
            recommendations.append(rec)
        
        # توصيات عامة للتحسين
        if not recommendations:
            rec = SmartTherapyRecommendationService._create_general_recommendation(analysis)
            recommendations.append(rec)
        
        return recommendations
    
    @staticmethod
    def _create_skill_development_recommendation(priority_area: Dict, analysis: Dict) -> Dict[str, Any]:
        """إنشاء توصية لتطوير المهارات"""
        skill_name = priority_area['area']
        current_level = priority_area['current_level']
        urgency = priority_area['urgency']
        
        return {
            'type': 'therapy_program',
            'title': f'برنامج تطوير مهارة {skill_name}',
            'description': f'برنامج علاجي مكثف لتحسين مهارة {skill_name} من المستوى الحالي {current_level}%',
            'rationale': f'تحليل البيانات يشير إلى ضعف في مهارة {skill_name} مما يتطلب تدخل علاجي مركز',
            'priority': urgency,
            'confidence': 0.85,
            'target_skills': [skill_name],
            'expected_outcomes': [
                f'تحسين مهارة {skill_name} بنسبة 20-30%',
                'زيادة الثقة بالنفس',
                'تحسين الأداء العام'
            ],
            'implementation_steps': [
                'تقييم مفصل للمهارة',
                'وضع أهداف قابلة للقياس',
                'تنفيذ جلسات علاجية منتظمة',
                'مراقبة التقدم أسبوعياً',
                'تعديل الخطة حسب الحاجة'
            ],
            'required_resources': [
                'أخصائي مدرب',
                'أدوات تعليمية مناسبة',
                'بيئة هادئة ومحفزة'
            ],
            'estimated_duration': 12,
            'frequency_per_week': 3,
            'session_duration': 45,
            'success_metrics': [
                f'تحسن درجة {skill_name} إلى 70% أو أكثر',
                'تقليل الأخطاء بنسبة 50%',
                'زيادة الاستقلالية في المهارة'
            ]
        }
    
    @staticmethod
    def _create_behavioral_recommendation(analysis: Dict) -> Dict[str, Any]:
        """إنشاء توصية للتدخل السلوكي"""
        return {
            'type': 'intervention',
            'title': 'برنامج تعديل السلوك الإيجابي',
            'description': 'برنامج شامل لتعزيز السلوكيات الإيجابية وتقليل السلوكيات غير المرغوبة',
            'rationale': 'تحليل السلوك يشير إلى الحاجة لتدخل سلوكي لتحسين التفاعل والمشاركة',
            'priority': 'high',
            'confidence': 0.80,
            'target_skills': ['التحكم في السلوك', 'المهارات الاجتماعية', 'التنظيم الذاتي'],
            'expected_outcomes': [
                'تقليل السلوكيات السلبية بنسبة 60%',
                'زيادة السلوكيات الإيجابية',
                'تحسين التفاعل الاجتماعي'
            ],
            'implementation_steps': [
                'تحديد السلوكيات المستهدفة',
                'وضع نظام مكافآت وعواقب',
                'تدريب الفريق والأهل',
                'تطبيق الخطة بثبات',
                'مراجعة وتعديل الخطة'
            ],
            'required_resources': [
                'أخصائي سلوك',
                'نظام مكافآت',
                'تدريب للأهل والمعلمين'
            ],
            'estimated_duration': 16,
            'frequency_per_week': 2,
            'session_duration': 60,
            'success_metrics': [
                'تحسن نسبة السلوكيات الإيجابية إلى 70%',
                'تقليل نوبات الغضب',
                'زيادة التعاون والمشاركة'
            ]
        }
    
    @staticmethod
    def _create_motivation_recommendation(analysis: Dict) -> Dict[str, Any]:
        """إنشاء توصية لتحفيز التعلم"""
        return {
            'type': 'activity',
            'title': 'برنامج تحفيز التعلم التفاعلي',
            'description': 'أنشطة تفاعلية مصممة لزيادة الدافعية والمشاركة في التعلم',
            'rationale': 'تراجع مستوى التقدم يتطلب إعادة إشعال الحماس للتعلم من خلال أنشطة محفزة',
            'priority': 'medium',
            'confidence': 0.75,
            'target_skills': ['الدافعية للتعلم', 'المشاركة النشطة', 'الثقة بالنفس'],
            'expected_outcomes': [
                'زيادة الحماس للتعلم',
                'تحسن مستوى المشاركة',
                'استعادة الثقة بالقدرات'
            ],
            'implementation_steps': [
                'تحديد الاهتمامات الشخصية',
                'تصميم أنشطة مخصصة',
                'دمج عناصر اللعب في التعلم',
                'تقديم تحديات متدرجة',
                'الاحتفال بالإنجازات'
            ],
            'required_resources': [
                'ألعاب تعليمية',
                'تقنيات تفاعلية',
                'نظام مكافآت متنوع'
            ],
            'estimated_duration': 8,
            'frequency_per_week': 4,
            'session_duration': 30,
            'success_metrics': [
                'زيادة وقت المشاركة النشطة',
                'تحسن الموقف تجاه التعلم',
                'زيادة المبادرة الذاتية'
            ]
        }
    
    @staticmethod
    def _create_general_recommendation(analysis: Dict) -> Dict[str, Any]:
        """إنشاء توصية عامة للتحسين"""
        return {
            'type': 'assessment',
            'title': 'تقييم شامل للاحتياجات',
            'description': 'تقييم مفصل لتحديد الاحتياجات الدقيقة ووضع خطة علاجية مخصصة',
            'rationale': 'الحاجة لتقييم أكثر تفصيلاً لتحديد أفضل التدخلات المناسبة',
            'priority': 'medium',
            'confidence': 0.70,
            'target_skills': ['جميع المجالات'],
            'expected_outcomes': [
                'فهم أعمق للاحتياجات',
                'خطة علاجية مخصصة',
                'تحديد الأولويات بدقة'
            ],
            'implementation_steps': [
                'تقييم شامل متعدد التخصصات',
                'تحليل النتائج',
                'وضع خطة علاجية مفصلة',
                'تحديد الأهداف والمقاييس',
                'بدء تنفيذ الخطة'
            ],
            'required_resources': [
                'فريق متعدد التخصصات',
                'أدوات تقييم معيارية',
                'وقت كافٍ للتقييم'
            ],
            'estimated_duration': 4,
            'frequency_per_week': 2,
            'session_duration': 90,
            'success_metrics': [
                'اكتمال التقييم الشامل',
                'وضع خطة علاجية مفصلة',
                'بدء تنفيذ التوصيات'
            ]
        }
    
    @staticmethod
    def _calculate_trend(values: List[float]) -> float:
        """حساب اتجاه التغيير"""
        if len(values) < 2:
            return 0.0
        
        x = list(range(len(values)))
        y = values
        
        if len(set(y)) == 1:
            return 0.0
        
        try:
            correlation = np.corrcoef(x, y)[0, 1]
            return correlation
        except:
            return 0.0
    
    @staticmethod
    def get_recommendations_dashboard(student_id: int = None, status: str = None) -> Dict[str, Any]:
        """لوحة تحكم التوصيات"""
        try:
            query = TherapyRecommendation.query
            
            if student_id:
                query = query.filter_by(student_id=student_id)
            
            if status:
                query = query.filter_by(status=status)
            
            recommendations = query.order_by(TherapyRecommendation.generated_at.desc()).all()
            
            # إحصائيات عامة
            total_recommendations = len(recommendations)
            by_status = {}
            by_priority = {}
            by_type = {}
            
            for rec in recommendations:
                # حسب الحالة
                status_key = rec.status
                by_status[status_key] = by_status.get(status_key, 0) + 1
                
                # حسب الأولوية
                priority_key = rec.priority_level
                by_priority[priority_key] = by_priority.get(priority_key, 0) + 1
                
                # حسب النوع
                type_key = rec.recommendation_type
                by_type[type_key] = by_type.get(type_key, 0) + 1
            
            # متوسط درجة الثقة
            confidence_scores = [rec.confidence_score for rec in recommendations if rec.confidence_score]
            avg_confidence = statistics.mean(confidence_scores) if confidence_scores else 0
            
            # التوصيات عالية الأولوية
            high_priority = [rec for rec in recommendations if rec.priority_level == 'high']
            
            return {
                'success': True,
                'summary': {
                    'total_recommendations': total_recommendations,
                    'by_status': by_status,
                    'by_priority': by_priority,
                    'by_type': by_type,
                    'avg_confidence': round(avg_confidence, 2),
                    'high_priority_count': len(high_priority)
                },
                'recent_recommendations': [rec.to_dict() for rec in recommendations[:10]],
                'high_priority_recommendations': [rec.to_dict() for rec in high_priority[:5]]
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في لوحة التحكم: {str(e)}'}
    
    @staticmethod
    def approve_recommendation(recommendation_id: int, reviewer_id: int, notes: str = None) -> Dict[str, Any]:
        """الموافقة على توصية"""
        try:
            recommendation = TherapyRecommendation.query.get(recommendation_id)
            if not recommendation:
                return {'success': False, 'message': 'التوصية غير موجودة'}
            
            recommendation.status = 'approved'
            recommendation.reviewed_by = reviewer_id
            recommendation.reviewed_at = datetime.utcnow()
            if notes:
                recommendation.notes = notes
            
            # إضافة سجل في التاريخ
            history = RecommendationHistory(
                recommendation_id=recommendation_id,
                action_type='approved',
                action_description='تم الموافقة على التوصية',
                performed_by=reviewer_id,
                notes=notes
            )
            db.session.add(history)
            
            db.session.commit()
            
            return {
                'success': True,
                'message': 'تم الموافقة على التوصية بنجاح',
                'recommendation': recommendation.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في الموافقة: {str(e)}'}
    
    @staticmethod
    def add_feedback(recommendation_id: int, evaluator_id: int, feedback_data: Dict[str, Any]) -> Dict[str, Any]:
        """إضافة تقييم للتوصية"""
        try:
            feedback = RecommendationFeedback(
                recommendation_id=recommendation_id,
                evaluator_id=evaluator_id,
                evaluator_role=feedback_data.get('evaluator_role'),
                feedback_type=feedback_data.get('feedback_type'),
                rating=feedback_data.get('rating'),
                feedback_text=feedback_data.get('feedback_text'),
                implementation_challenges=json.dumps(feedback_data.get('implementation_challenges', [])),
                observed_improvements=json.dumps(feedback_data.get('observed_improvements', [])),
                suggested_modifications=json.dumps(feedback_data.get('suggested_modifications', [])),
                would_recommend=feedback_data.get('would_recommend'),
                additional_notes=feedback_data.get('additional_notes')
            )
            
            db.session.add(feedback)
            db.session.commit()
            
            return {
                'success': True,
                'message': 'تم إضافة التقييم بنجاح',
                'feedback': feedback.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في إضافة التقييم: {str(e)}'}
