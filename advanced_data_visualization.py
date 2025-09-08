#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import json
from database import db
try:
    from comprehensive_rehabilitation_models import (
        RehabilitationBeneficiary, ComprehensiveAssessment, 
        TherapySession, ProgressRecord
    )
except ImportError:
    # تعريف بديل في حالة عدم توفر النماذج
    RehabilitationBeneficiary = None
    ComprehensiveAssessment = None
    TherapySession = None
    ProgressRecord = None

class AdvancedDataVisualization:
    """نظام التصور المتقدم للبيانات"""
    
    def __init__(self):
        self.color_schemes = {
            'primary': ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
            'disability_types': {
                'physical': '#e74c3c',
                'intellectual': '#3498db', 
                'autism_spectrum': '#9b59b6',
                'speech_language': '#f39c12',
                'sensory': '#1abc9c',
                'behavioral': '#34495e'
            },
            'progress_levels': {
                'excellent': '#27ae60',
                'good': '#f39c12',
                'needs_improvement': '#e74c3c'
            }
        }
    
    def create_progress_timeline(self, beneficiary_id: int, months: int = 6) -> Dict:
        """إنشاء خط زمني للتقدم"""
        try:
            beneficiary = None
            if RehabilitationBeneficiary:
                beneficiary = RehabilitationBeneficiary.query.get(beneficiary_id)
            if not beneficiary:
                return {'success': False, 'message': 'المستفيد غير موجود'}
            
            # جمع بيانات التقييمات
            assessments = []
            if ComprehensiveAssessment:
                assessments = ComprehensiveAssessment.query.filter_by(
                    beneficiary_id=beneficiary_id
                ).order_by(ComprehensiveAssessment.assessment_date).all()
            
            if not assessments:
                return {'success': False, 'message': 'لا توجد تقييمات للمستفيد'}
            
            # تحضير البيانات
            dates = [a.assessment_date for a in assessments]
            motor_scores = [a.motor_skills_score or 0 for a in assessments]
            cognitive_scores = [a.cognitive_skills_score or 0 for a in assessments]
            communication_scores = [a.communication_skills_score or 0 for a in assessments]
            social_scores = [a.social_skills_score or 0 for a in assessments]
            
            # إنشاء الرسم البياني
            fig = go.Figure()
            
            fig.add_trace(go.Scatter(
                x=dates, y=motor_scores,
                mode='lines+markers',
                name='المهارات الحركية',
                line=dict(color='#e74c3c', width=3),
                marker=dict(size=8)
            ))
            
            fig.add_trace(go.Scatter(
                x=dates, y=cognitive_scores,
                mode='lines+markers',
                name='المهارات المعرفية',
                line=dict(color='#3498db', width=3),
                marker=dict(size=8)
            ))
            
            fig.add_trace(go.Scatter(
                x=dates, y=communication_scores,
                mode='lines+markers',
                name='مهارات التواصل',
                line=dict(color='#f39c12', width=3),
                marker=dict(size=8)
            ))
            
            fig.add_trace(go.Scatter(
                x=dates, y=social_scores,
                mode='lines+markers',
                name='المهارات الاجتماعية',
                line=dict(color='#27ae60', width=3),
                marker=dict(size=8)
            ))
            
            fig.update_layout(
                title='تطور المهارات عبر الزمن',
                xaxis_title='التاريخ',
                yaxis_title='النتيجة (%)',
                yaxis=dict(range=[0, 100]),
                hovermode='x unified',
                template='plotly_white',
                font=dict(family="Arial", size=12),
                legend=dict(
                    orientation="h",
                    yanchor="bottom",
                    y=1.02,
                    xanchor="right",
                    x=1
                )
            )
            
            return {
                'success': True,
                'chart_json': fig.to_json(),
                'chart_html': fig.to_html(include_plotlyjs='cdn')
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنشاء الخط الزمني: {str(e)}'}
    
    def create_skills_radar_chart(self, beneficiary_id: int) -> Dict:
        """إنشاء رسم بياني رادار للمهارات"""
        try:
            # الحصول على آخر تقييم
            latest_assessment = ComprehensiveAssessment.query.filter_by(
                beneficiary_id=beneficiary_id
            ).order_by(ComprehensiveAssessment.assessment_date.desc()).first()
            
            if not latest_assessment:
                return {'success': False, 'message': 'لا يوجد تقييم للمستفيد'}
            
            # تحضير البيانات
            skills = ['المهارات الحركية', 'المهارات المعرفية', 'مهارات التواصل', 
                     'المهارات الاجتماعية', 'المهارات الحسية', 'مهارات الحياة اليومية']
            
            scores = [
                latest_assessment.motor_skills_score or 0,
                latest_assessment.cognitive_skills_score or 0,
                latest_assessment.communication_skills_score or 0,
                latest_assessment.social_skills_score or 0,
                latest_assessment.sensory_skills_score or 0,
                latest_assessment.daily_living_skills_score or 0
            ]
            
            # إنشاء الرسم البياني
            fig = go.Figure()
            
            fig.add_trace(go.Scatterpolar(
                r=scores,
                theta=skills,
                fill='toself',
                name='النتائج الحالية',
                line_color='#3498db',
                fillcolor='rgba(52, 152, 219, 0.3)'
            ))
            
            # إضافة خط المتوسط المطلوب (70%)
            target_scores = [70] * len(skills)
            fig.add_trace(go.Scatterpolar(
                r=target_scores,
                theta=skills,
                fill='toself',
                name='الهدف المطلوب',
                line_color='#27ae60',
                fillcolor='rgba(39, 174, 96, 0.1)',
                line_dash='dash'
            ))
            
            fig.update_layout(
                polar=dict(
                    radialaxis=dict(
                        visible=True,
                        range=[0, 100]
                    )),
                showlegend=True,
                title="تقييم المهارات الشامل",
                template='plotly_white'
            )
            
            return {
                'success': True,
                'chart_json': fig.to_json(),
                'chart_html': fig.to_html(include_plotlyjs='cdn')
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنشاء الرسم الرادار: {str(e)}'}
    
    def create_therapy_effectiveness_chart(self) -> Dict:
        """رسم بياني لفعالية العلاجات"""
        try:
            # جمع بيانات فعالية العلاجات
            therapy_data = db.session.query(
                TherapySession.session_type,
                db.func.avg(ProgressRecord.progress_percentage).label('avg_progress'),
                db.func.count(TherapySession.id).label('session_count')
            ).join(
                ProgressRecord, TherapySession.id == ProgressRecord.session_id
            ).group_by(TherapySession.session_type).all()
            
            if not therapy_data:
                return {'success': False, 'message': 'لا توجد بيانات كافية'}
            
            # تحضير البيانات
            therapy_types = []
            effectiveness_scores = []
            session_counts = []
            
            therapy_translations = {
                'physical_therapy': 'العلاج الطبيعي',
                'occupational_therapy': 'العلاج الوظيفي',
                'speech_therapy': 'علاج النطق',
                'behavioral_therapy': 'العلاج السلوكي'
            }
            
            for therapy_type, avg_progress, session_count in therapy_data:
                therapy_types.append(therapy_translations.get(therapy_type, therapy_type))
                effectiveness_scores.append(float(avg_progress) if avg_progress else 0)
                session_counts.append(session_count)
            
            # إنشاء رسم بياني مختلط
            fig = make_subplots(specs=[[{"secondary_y": True}]])
            
            # أعمدة الفعالية
            fig.add_trace(
                go.Bar(
                    x=therapy_types,
                    y=effectiveness_scores,
                    name='متوسط الفعالية (%)',
                    marker_color='#3498db',
                    yaxis='y'
                ),
                secondary_y=False,
            )
            
            # خط عدد الجلسات
            fig.add_trace(
                go.Scatter(
                    x=therapy_types,
                    y=session_counts,
                    mode='lines+markers',
                    name='عدد الجلسات',
                    line=dict(color='#e74c3c', width=3),
                    marker=dict(size=10),
                    yaxis='y2'
                ),
                secondary_y=True,
            )
            
            fig.update_xaxes(title_text="نوع العلاج")
            fig.update_yaxes(title_text="متوسط الفعالية (%)", secondary_y=False)
            fig.update_yaxes(title_text="عدد الجلسات", secondary_y=True)
            
            fig.update_layout(
                title_text="فعالية أنواع العلاج المختلفة",
                template='plotly_white'
            )
            
            return {
                'success': True,
                'chart_json': fig.to_json(),
                'chart_html': fig.to_html(include_plotlyjs='cdn')
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنشاء رسم الفعالية: {str(e)}'}
    
    def create_disability_distribution_chart(self) -> Dict:
        """رسم بياني لتوزيع أنواع الإعاقة"""
        try:
            # جمع بيانات توزيع الإعاقات
            disability_data = db.session.query(
                RehabilitationBeneficiary.primary_disability,
                db.func.count(RehabilitationBeneficiary.id).label('count')
            ).group_by(RehabilitationBeneficiary.primary_disability).all()
            
            if not disability_data:
                return {'success': False, 'message': 'لا توجد بيانات'}
            
            # تحضير البيانات
            disability_translations = {
                'physical': 'إعاقة حركية',
                'intellectual': 'إعاقة ذهنية',
                'autism_spectrum': 'طيف التوحد',
                'speech_language': 'اضطرابات النطق واللغة',
                'sensory': 'إعاقة حسية',
                'behavioral': 'اضطرابات سلوكية',
                'multiple': 'إعاقات متعددة'
            }
            
            labels = []
            values = []
            colors = []
            
            for disability_type, count in disability_data:
                labels.append(disability_translations.get(disability_type, disability_type))
                values.append(count)
                colors.append(self.color_schemes['disability_types'].get(disability_type, '#95a5a6'))
            
            # إنشاء رسم دائري
            fig = go.Figure(data=[go.Pie(
                labels=labels,
                values=values,
                marker_colors=colors,
                textinfo='label+percent+value',
                textposition='auto',
                hovertemplate='<b>%{label}</b><br>العدد: %{value}<br>النسبة: %{percent}<extra></extra>'
            )])
            
            fig.update_layout(
                title="توزيع المستفيدين حسب نوع الإعاقة",
                template='plotly_white',
                font=dict(size=12)
            )
            
            return {
                'success': True,
                'chart_json': fig.to_json(),
                'chart_html': fig.to_html(include_plotlyjs='cdn')
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنشاء رسم التوزيع: {str(e)}'}
    
    def create_progress_heatmap(self, period_months: int = 6) -> Dict:
        """خريطة حرارية للتقدم"""
        try:
            # جمع بيانات التقدم
            start_date = date.today() - timedelta(days=period_months * 30)
            
            progress_data = db.session.query(
                RehabilitationBeneficiary.first_name,
                RehabilitationBeneficiary.last_name,
                ProgressRecord.skill_area,
                db.func.avg(ProgressRecord.progress_percentage).label('avg_progress')
            ).join(
                ProgressRecord, RehabilitationBeneficiary.id == ProgressRecord.beneficiary_id
            ).filter(
                ProgressRecord.progress_date >= start_date
            ).group_by(
                RehabilitationBeneficiary.id,
                ProgressRecord.skill_area
            ).all()
            
            if not progress_data:
                return {'success': False, 'message': 'لا توجد بيانات تقدم'}
            
            # تحضير البيانات للخريطة الحرارية
            beneficiaries = []
            skill_areas = []
            progress_matrix = []
            
            # تجميع البيانات
            data_dict = {}
            for first_name, last_name, skill_area, avg_progress in progress_data:
                beneficiary_name = f"{first_name} {last_name}"
                if beneficiary_name not in data_dict:
                    data_dict[beneficiary_name] = {}
                data_dict[beneficiary_name][skill_area] = float(avg_progress) if avg_progress else 0
            
            # تحويل إلى مصفوفة
            beneficiaries = list(data_dict.keys())
            all_skills = set()
            for skills in data_dict.values():
                all_skills.update(skills.keys())
            skill_areas = sorted(list(all_skills))
            
            progress_matrix = []
            for beneficiary in beneficiaries:
                row = []
                for skill in skill_areas:
                    row.append(data_dict[beneficiary].get(skill, 0))
                progress_matrix.append(row)
            
            # إنشاء الخريطة الحرارية
            fig = go.Figure(data=go.Heatmap(
                z=progress_matrix,
                x=skill_areas,
                y=beneficiaries,
                colorscale='RdYlGn',
                zmin=0,
                zmax=100,
                hoverongaps=False,
                hovertemplate='المستفيد: %{y}<br>المهارة: %{x}<br>التقدم: %{z}%<extra></extra>'
            ))
            
            fig.update_layout(
                title=f"خريطة التقدم للمستفيدين - آخر {period_months} أشهر",
                xaxis_title="المهارات",
                yaxis_title="المستفيدين",
                template='plotly_white'
            )
            
            return {
                'success': True,
                'chart_json': fig.to_json(),
                'chart_html': fig.to_html(include_plotlyjs='cdn')
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنشاء الخريطة الحرارية: {str(e)}'}
    
    def create_attendance_calendar(self, beneficiary_id: int, year: int = None) -> Dict:
        """تقويم الحضور"""
        try:
            if not year:
                year = datetime.now().year
            
            # جمع بيانات الجلسات
            sessions = TherapySession.query.filter(
                TherapySession.beneficiary_id == beneficiary_id,
                db.extract('year', TherapySession.session_date) == year
            ).all()
            
            if not sessions:
                return {'success': False, 'message': 'لا توجد جلسات في هذا العام'}
            
            # تحضير البيانات للتقويم
            dates = []
            statuses = []
            session_types = []
            
            for session in sessions:
                dates.append(session.session_date)
                statuses.append(session.status)
                session_types.append(session.session_type)
            
            # تحويل الحالات إلى ألوان
            status_colors = {
                'completed': '#27ae60',
                'scheduled': '#f39c12',
                'cancelled': '#e74c3c',
                'missed': '#95a5a6'
            }
            
            colors = [status_colors.get(status, '#95a5a6') for status in statuses]
            
            # إنشاء رسم التقويم
            fig = go.Figure(data=go.Scatter(
                x=dates,
                y=[1] * len(dates),  # نفس المستوى للجميع
                mode='markers',
                marker=dict(
                    size=15,
                    color=colors,
                    line=dict(width=2, color='white')
                ),
                text=[f"{session_type}<br>{status}" for session_type, status in zip(session_types, statuses)],
                hovertemplate='التاريخ: %{x}<br>%{text}<extra></extra>'
            ))
            
            fig.update_layout(
                title=f"تقويم الجلسات - {year}",
                xaxis_title="التاريخ",
                yaxis=dict(visible=False),
                template='plotly_white',
                height=200
            )
            
            return {
                'success': True,
                'chart_json': fig.to_json(),
                'chart_html': fig.to_html(include_plotlyjs='cdn')
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنشاء تقويم الحضور: {str(e)}'}
    
    def create_dashboard_summary(self) -> Dict:
        """ملخص لوحة التحكم المرئي"""
        try:
            # إحصائيات عامة
            total_beneficiaries = RehabilitationBeneficiary.query.count()
            active_plans = IndividualRehabilitationPlan.query.filter_by(status='active').count()
            completed_sessions = TherapySession.query.filter_by(status='completed').count()
            
            # إنشاء مؤشرات KPI
            fig = make_subplots(
                rows=2, cols=2,
                subplot_titles=('إجمالي المستفيدين', 'الخطط النشطة', 'الجلسات المكتملة', 'معدل النجاح'),
                specs=[[{"type": "indicator"}, {"type": "indicator"}],
                       [{"type": "indicator"}, {"type": "indicator"}]]
            )
            
            # مؤشر المستفيدين
            fig.add_trace(go.Indicator(
                mode="number",
                value=total_beneficiaries,
                number={'font': {'size': 40, 'color': '#3498db'}},
                title={'text': "مستفيد", 'font': {'size': 20}}
            ), row=1, col=1)
            
            # مؤشر الخطط النشطة
            fig.add_trace(go.Indicator(
                mode="number",
                value=active_plans,
                number={'font': {'size': 40, 'color': '#27ae60'}},
                title={'text': "خطة نشطة", 'font': {'size': 20}}
            ), row=1, col=2)
            
            # مؤشر الجلسات المكتملة
            fig.add_trace(go.Indicator(
                mode="number",
                value=completed_sessions,
                number={'font': {'size': 40, 'color': '#f39c12'}},
                title={'text': "جلسة مكتملة", 'font': {'size': 20}}
            ), row=2, col=1)
            
            # مؤشر معدل النجاح
            success_rate = 85.5  # يمكن حسابه من البيانات الفعلية
            fig.add_trace(go.Indicator(
                mode="gauge+number",
                value=success_rate,
                gauge={'axis': {'range': [None, 100]},
                       'bar': {'color': "#27ae60"},
                       'steps': [{'range': [0, 50], 'color': "#ecf0f1"},
                                {'range': [50, 80], 'color': "#f39c12"},
                                {'range': [80, 100], 'color': "#27ae60"}],
                       'threshold': {'line': {'color': "red", 'width': 4},
                                   'thickness': 0.75, 'value': 90}},
                number={'suffix': "%", 'font': {'size': 20}},
                title={'text': "معدل النجاح", 'font': {'size': 16}}
            ), row=2, col=2)
            
            fig.update_layout(
                title="ملخص لوحة التحكم",
                template='plotly_white',
                height=600
            )
            
            return {
                'success': True,
                'chart_json': fig.to_json(),
                'chart_html': fig.to_html(include_plotlyjs='cdn')
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنشاء ملخص لوحة التحكم: {str(e)}'}
