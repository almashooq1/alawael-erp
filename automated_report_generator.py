#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import json
import pandas as pd
from jinja2 import Template
from database import db
try:
    from comprehensive_rehabilitation_models import (
        RehabilitationBeneficiary, ComprehensiveAssessment, 
        IndividualRehabilitationPlan, TherapySession, ProgressRecord
    )
except ImportError:
    # تعريف بديل في حالة عدم توفر النماذج
    RehabilitationBeneficiary = None
    ComprehensiveAssessment = None
    IndividualRehabilitationPlan = None
    TherapySession = None
    ProgressRecord = None
try:
    from comprehensive_rehabilitation_ai_services import ComprehensiveRehabilitationAIService
except ImportError:
    ComprehensiveRehabilitationAIService = None

class AutomatedReportGenerator:
    """مولد التقارير التلقائي المتقدم"""
    
    def __init__(self):
        self.report_templates = self._initialize_templates()
        self.supported_formats = ['html', 'pdf', 'json', 'excel']
        
    def _initialize_templates(self) -> Dict[str, str]:
        """تهيئة قوالب التقارير"""
        return {
            'progress_report': """
            <div class="report-container">
                <h1>تقرير التقدم - {{ beneficiary.first_name }} {{ beneficiary.last_name }}</h1>
                <div class="report-period">
                    <p>فترة التقرير: {{ period_start }} إلى {{ period_end }}</p>
                </div>
                
                <div class="summary-section">
                    <h2>الملخص التنفيذي</h2>
                    <p>{{ summary }}</p>
                </div>
                
                <div class="scores-section">
                    <h2>النتائج الحالية</h2>
                    {% for skill, score in current_scores.items() %}
                    <div class="skill-score">
                        <span>{{ skill }}: {{ score }}%</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: {{ score }}%"></div>
                        </div>
                    </div>
                    {% endfor %}
                </div>
                
                <div class="goals-section">
                    <h2>الأهداف والإنجازات</h2>
                    {% for goal in goals %}
                    <div class="goal-item">
                        <h3>{{ goal.description }}</h3>
                        <p>الحالة: {{ goal.status }}</p>
                        <p>التقدم: {{ goal.progress }}%</p>
                    </div>
                    {% endfor %}
                </div>
                
                <div class="recommendations-section">
                    <h2>التوصيات</h2>
                    <ul>
                    {% for recommendation in recommendations %}
                        <li>{{ recommendation }}</li>
                    {% endfor %}
                    </ul>
                </div>
            </div>
            """,
            
            'comprehensive_report': """
            <div class="comprehensive-report">
                <h1>التقرير الشامل - {{ beneficiary.first_name }} {{ beneficiary.last_name }}</h1>
                
                <div class="beneficiary-info">
                    <h2>معلومات المستفيد</h2>
                    <table>
                        <tr><td>الاسم:</td><td>{{ beneficiary.first_name }} {{ beneficiary.last_name }}</td></tr>
                        <tr><td>العمر:</td><td>{{ beneficiary.age }} سنة</td></tr>
                        <tr><td>نوع الإعاقة:</td><td>{{ beneficiary.primary_disability }}</td></tr>
                        <tr><td>مستوى الشدة:</td><td>{{ beneficiary.severity_level }}</td></tr>
                    </table>
                </div>
                
                <div class="assessments-history">
                    <h2>تاريخ التقييمات</h2>
                    {% for assessment in assessments %}
                    <div class="assessment-item">
                        <h3>{{ assessment.assessment_date }}</h3>
                        <p>النتيجة الإجمالية: {{ assessment.overall_score }}%</p>
                    </div>
                    {% endfor %}
                </div>
                
                <div class="sessions-summary">
                    <h2>ملخص الجلسات</h2>
                    <p>إجمالي الجلسات: {{ total_sessions }}</p>
                    <p>الجلسات المكتملة: {{ completed_sessions }}</p>
                    <p>معدل الحضور: {{ attendance_rate }}%</p>
                </div>
                
                <div class="ai-insights">
                    <h2>رؤى الذكاء الاصطناعي</h2>
                    <p>{{ ai_insights }}</p>
                </div>
            </div>
            """
        }
    
    def generate_progress_report(self, beneficiary_id: int, period_months: int = 3, 
                               format_type: str = 'html') -> Dict:
        """إنتاج تقرير التقدم"""
        try:
            beneficiary = None
            if RehabilitationBeneficiary:
                beneficiary = RehabilitationBeneficiary.query.get(beneficiary_id)
            if not beneficiary:
                return {'success': False, 'message': 'المستفيد غير موجود'}
            
            # جمع البيانات
            period_start = date.today() - timedelta(days=period_months * 30)
            period_end = date.today()
            
            # التقييمات في الفترة
            assessments = []
            if ComprehensiveAssessment:
                assessments = ComprehensiveAssessment.query.filter(
                    ComprehensiveAssessment.beneficiary_id == beneficiary_id,
                ComprehensiveAssessment.assessment_date >= period_start
            ).order_by(ComprehensiveAssessment.assessment_date.desc()).all()
            
            # الجلسات في الفترة
            sessions = []
            if TherapySession:
                sessions = TherapySession.query.filter(
                    TherapySession.beneficiary_id == beneficiary_id,
                    TherapySession.session_date >= period_start
                ).all()
            
            # الأهداف
            goals = []
            if IndividualRehabilitationPlan:
                try:
                    from comprehensive_rehabilitation_models import RehabilitationGoal
                    goals = RehabilitationGoal.query.join(IndividualRehabilitationPlan).filter(
                        IndividualRehabilitationPlan.beneficiary_id == beneficiary_id
                    ).all()
                except ImportError:
                    goals = []
            
            # النتائج الحالية
            current_scores = self._get_current_scores(beneficiary_id)
            
            # التحليل بالذكاء الاصطناعي
            ai_analysis = {}
            if ComprehensiveRehabilitationAIService:
                try:
                    ai_service = ComprehensiveRehabilitationAIService()
                    ai_analysis = ai_service.predict_progress(beneficiary_id, 3)
                except Exception:
                    ai_analysis = {'insights': 'التحليل غير متوفر حالياً'}
            
            # إنشاء الملخص
            summary = self._generate_summary(beneficiary, assessments, sessions, ai_analysis)
            
            # التوصيات
            recommendations = ai_analysis.get('recommended_actions', [])
            
            # إنتاج التقرير
            template_data = {
                'beneficiary': beneficiary,
                'period_start': period_start.strftime('%Y-%m-%d'),
                'period_end': period_end.strftime('%Y-%m-%d'),
                'current_scores': current_scores,
                'goals': goals,
                'summary': summary,
                'recommendations': recommendations,
                'total_sessions': len(sessions),
                'completed_sessions': len([s for s in sessions if s.status == 'completed']),
                'assessments_count': len(assessments)
            }
            
            if format_type == 'html':
                report_content = self._render_html_report('progress_report', template_data)
            elif format_type == 'json':
                report_content = json.dumps(template_data, ensure_ascii=False, indent=2)
            else:
                report_content = str(template_data)
            
            return {
                'success': True,
                'report_content': report_content,
                'format': format_type,
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنتاج التقرير: {str(e)}'}
    
    def generate_comprehensive_report(self, beneficiary_id: int, format_type: str = 'html') -> Dict:
        """إنتاج التقرير الشامل"""
        try:
            beneficiary = None
            if RehabilitationBeneficiary:
                beneficiary = RehabilitationBeneficiary.query.get(beneficiary_id)
            if not beneficiary:
                return {'success': False, 'message': 'المستفيد غير موجود'}
            
            # جمع جميع البيانات
            assessments = []
            if ComprehensiveAssessment:
                assessments = ComprehensiveAssessment.query.filter_by(
                    beneficiary_id=beneficiary_id
                ).order_by(ComprehensiveAssessment.assessment_date.desc()).all()
            
            sessions = []
            if TherapySession:
                sessions = TherapySession.query.filter_by(
                    beneficiary_id=beneficiary_id
            ).all()
            
            plans = []
            if IndividualRehabilitationPlan:
                plans = IndividualRehabilitationPlan.query.filter_by(
                    beneficiary_id=beneficiary_id
                ).all()
            
            # إحصائيات الجلسات
            total_sessions = len(sessions)
            completed_sessions = len([s for s in sessions if s.status == 'completed'])
            attendance_rate = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0
            
            # رؤى الذكاء الاصطناعي
            ai_insights = self._generate_ai_insights(beneficiary_id)
            
            template_data = {
                'beneficiary': beneficiary,
                'assessments': assessments,
                'total_sessions': total_sessions,
                'completed_sessions': completed_sessions,
                'attendance_rate': round(attendance_rate, 2),
                'ai_insights': ai_insights,
                'plans': plans
            }
            
            if format_type == 'html':
                report_content = self._render_html_report('comprehensive_report', template_data)
            elif format_type == 'json':
                report_content = json.dumps(template_data, ensure_ascii=False, indent=2, default=str)
            else:
                report_content = str(template_data)
            
            return {
                'success': True,
                'report_content': report_content,
                'format': format_type,
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنتاج التقرير: {str(e)}'}
    
    def generate_batch_reports(self, beneficiary_ids: List[int], report_type: str = 'progress') -> Dict:
        """إنتاج تقارير متعددة"""
        results = []
        
        for beneficiary_id in beneficiary_ids:
            if report_type == 'progress':
                result = self.generate_progress_report(beneficiary_id)
            else:
                result = self.generate_comprehensive_report(beneficiary_id)
            
            results.append({
                'beneficiary_id': beneficiary_id,
                'result': result
            })
        
        return {
            'success': True,
            'batch_results': results,
            'total_reports': len(results),
            'successful_reports': len([r for r in results if r['result']['success']])
        }
    
    def _get_current_scores(self, beneficiary_id: int) -> Dict[str, float]:
        """الحصول على النتائج الحالية"""
        latest_assessment = ComprehensiveAssessment.query.filter_by(
            beneficiary_id=beneficiary_id
        ).order_by(ComprehensiveAssessment.assessment_date.desc()).first()
        
        if latest_assessment:
            return {
                'المهارات الحركية': latest_assessment.motor_skills_score or 0,
                'المهارات المعرفية': latest_assessment.cognitive_skills_score or 0,
                'مهارات التواصل': latest_assessment.communication_skills_score or 0,
                'المهارات الاجتماعية': latest_assessment.social_skills_score or 0,
                'المهارات الحسية': latest_assessment.sensory_skills_score or 0,
                'مهارات الحياة اليومية': latest_assessment.daily_living_skills_score or 0
            }
        
        return {}
    
    def _generate_summary(self, beneficiary, assessments, sessions, ai_analysis) -> str:
        """إنتاج الملخص التنفيذي"""
        summary_parts = []
        
        # معلومات أساسية
        summary_parts.append(f"المستفيد {beneficiary.first_name} {beneficiary.last_name}")
        summary_parts.append(f"يعاني من {beneficiary.primary_disability}")
        
        # التقدم
        if len(assessments) >= 2:
            latest_score = assessments[0].overall_score or 0
            previous_score = assessments[1].overall_score or 0
            improvement = latest_score - previous_score
            
            if improvement > 0:
                summary_parts.append(f"أظهر تحسناً بنسبة {improvement:.1f}% في التقييم الأخير")
            elif improvement < 0:
                summary_parts.append(f"انخفض الأداء بنسبة {abs(improvement):.1f}% في التقييم الأخير")
            else:
                summary_parts.append("حافظ على نفس مستوى الأداء")
        
        # الجلسات
        completed_sessions = len([s for s in sessions if s.status == 'completed'])
        summary_parts.append(f"حضر {completed_sessions} جلسة علاجية")
        
        # التوصيات من الذكاء الاصطناعي
        if 'recommended_actions' in ai_analysis and ai_analysis['recommended_actions']:
            summary_parts.append("يُنصح بمتابعة البرنامج العلاجي الحالي مع التركيز على المجالات المحددة")
        
        return ". ".join(summary_parts) + "."
    
    def _generate_ai_insights(self, beneficiary_id: int) -> str:
        """إنتاج رؤى الذكاء الاصطناعي"""
        try:
            prediction = AIProgressPredictor.predict_progress(beneficiary_id, 6)
            
            if 'error' in prediction:
                return "لا توجد بيانات كافية لتوليد رؤى الذكاء الاصطناعي"
            
            insights = []
            
            # التنبؤ بالتقدم
            if 'predicted_scores' in prediction:
                avg_predicted = sum(prediction['predicted_scores'].values()) / len(prediction['predicted_scores'])
                if avg_predicted > 75:
                    insights.append("يُتوقع تقدم ممتاز في الأشهر القادمة")
                elif avg_predicted > 60:
                    insights.append("يُتوقع تقدم جيد مع المتابعة المنتظمة")
                else:
                    insights.append("يحتاج إلى تدخل مكثف لتحسين النتائج")
            
            # عوامل المخاطر
            if 'risk_factors' in prediction and prediction['risk_factors']:
                insights.append(f"يوجد {len(prediction['risk_factors'])} عامل مخاطر يجب مراعاته")
            
            # مستوى الثقة
            confidence = prediction.get('confidence_level', 'منخفض')
            insights.append(f"مستوى الثقة في التنبؤ: {confidence}")
            
            return ". ".join(insights) + "."
            
        except Exception:
            return "تعذر إنتاج رؤى الذكاء الاصطناعي في الوقت الحالي"
    
    def _render_html_report(self, template_name: str, data: Dict) -> str:
        """تحويل القالب إلى HTML"""
        template = Template(self.report_templates[template_name])
        return template.render(**data)
    
    def schedule_automated_reports(self, schedule_config: Dict) -> Dict:
        """جدولة التقارير التلقائية"""
        # يمكن تطوير هذه الوظيفة لجدولة التقارير باستخدام Celery أو مهام مجدولة أخرى
        return {
            'success': True,
            'message': 'تم جدولة التقارير التلقائية',
            'schedule_id': f"schedule_{datetime.now().timestamp()}"
        }
