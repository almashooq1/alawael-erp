#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from database import db
from comprehensive_rehabilitation_models import *
from comprehensive_rehabilitation_ai_services import *
import json

# إنشاء Blueprint للـ API المحسن
comprehensive_rehab_enhanced_bp = Blueprint('comprehensive_rehab_enhanced', __name__, url_prefix='/api/comprehensive-rehab-enhanced')

@comprehensive_rehab_enhanced_bp.route('/ai-assessment/<int:assessment_id>', methods=['POST'])
@jwt_required()
def ai_enhanced_assessment(assessment_id):
    """تحليل التقييم باستخدام الذكاء الاصطناعي"""
    try:
        assessment = ComprehensiveAssessment.query.get_or_404(assessment_id)
        
        # تطبيق خوارزميات التقييم المتقدمة
        ai_analysis = AdvancedAssessmentAlgorithms.calculate_comprehensive_score(assessment)
        
        # حفظ النتائج في قاعدة البيانات
        assessment.ai_analysis_results = json.dumps(ai_analysis, ensure_ascii=False)
        assessment.ai_analysis_date = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': ai_analysis,
            'message': 'تم تحليل التقييم بنجاح باستخدام الذكاء الاصطناعي'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في تحليل التقييم: {str(e)}'
        }), 500

@comprehensive_rehab_enhanced_bp.route('/progress-prediction/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
def predict_beneficiary_progress(beneficiary_id):
    """التنبؤ بتقدم المستفيد"""
    try:
        months = request.args.get('months', 6, type=int)
        
        # استخدام نظام التنبؤ بالذكاء الاصطناعي
        prediction = AIProgressPredictor.predict_progress(beneficiary_id, months)
        
        if 'error' in prediction:
            return jsonify({
                'success': False,
                'message': prediction['error']
            }), 400
        
        return jsonify({
            'success': True,
            'data': prediction,
            'message': 'تم التنبؤ بالتقدم بنجاح'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في التنبؤ بالتقدم: {str(e)}'
        }), 500

@comprehensive_rehab_enhanced_bp.route('/notifications/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
def get_beneficiary_notifications(beneficiary_id):
    """الحصول على إشعارات المستفيد"""
    try:
        alerts = RealtimeNotificationSystem.check_progress_alerts(beneficiary_id)
        
        return jsonify({
            'success': True,
            'data': {
                'alerts': alerts,
                'count': len(alerts)
            },
            'message': 'تم جلب الإشعارات بنجاح'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب الإشعارات: {str(e)}'
        }), 500

@comprehensive_rehab_enhanced_bp.route('/advanced-analytics', methods=['GET'])
@jwt_required()
def get_advanced_analytics():
    """تحليلات متقدمة للنظام"""
    try:
        # إحصائيات التقدم العامة
        total_beneficiaries = RehabilitationBeneficiary.query.count()
        active_plans = IndividualRehabilitationPlan.query.filter_by(status='active').count()
        completed_sessions = TherapySession.query.filter_by(status='completed').count()
        
        # تحليل التقدم حسب نوع الإعاقة
        disability_progress = db.session.query(
            RehabilitationBeneficiary.primary_disability,
            db.func.avg(ComprehensiveAssessment.overall_score).label('avg_score')
        ).join(ComprehensiveAssessment).group_by(
            RehabilitationBeneficiary.primary_disability
        ).all()
        
        # تحليل فعالية العلاجات
        therapy_effectiveness = db.session.query(
            TherapySession.session_type,
            db.func.avg(ProgressRecord.progress_percentage).label('avg_progress')
        ).join(ProgressRecord, TherapySession.id == ProgressRecord.session_id).group_by(
            TherapySession.session_type
        ).all()
        
        # معدل الحضور
        attendance_rate = db.session.query(
            db.func.count(TherapySession.id).filter(TherapySession.status == 'completed').label('completed'),
            db.func.count(TherapySession.id).label('total')
        ).first()
        
        attendance_percentage = 0
        if attendance_rate.total > 0:
            attendance_percentage = (attendance_rate.completed / attendance_rate.total) * 100
        
        # التنبؤات الشاملة
        predictions_summary = {
            'high_potential_beneficiaries': 0,
            'at_risk_beneficiaries': 0,
            'stable_progress_beneficiaries': 0
        }
        
        # تحليل جميع المستفيدين للتنبؤ
        all_beneficiaries = RehabilitationBeneficiary.query.all()
        for beneficiary in all_beneficiaries[:10]:  # تحليل أول 10 للأداء
            try:
                prediction = AIProgressPredictor.predict_progress(beneficiary.id, 3)
                if 'predicted_scores' in prediction:
                    avg_predicted = sum(prediction['predicted_scores'].values()) / len(prediction['predicted_scores'])
                    if avg_predicted > 75:
                        predictions_summary['high_potential_beneficiaries'] += 1
                    elif avg_predicted < 50:
                        predictions_summary['at_risk_beneficiaries'] += 1
                    else:
                        predictions_summary['stable_progress_beneficiaries'] += 1
            except:
                continue
        
        return jsonify({
            'success': True,
            'data': {
                'overview': {
                    'total_beneficiaries': total_beneficiaries,
                    'active_plans': active_plans,
                    'completed_sessions': completed_sessions,
                    'attendance_rate': round(attendance_percentage, 2)
                },
                'disability_progress': [
                    {
                        'disability_type': item[0],
                        'average_score': round(float(item[1]) if item[1] else 0, 2)
                    } for item in disability_progress
                ],
                'therapy_effectiveness': [
                    {
                        'therapy_type': item[0],
                        'average_progress': round(float(item[1]) if item[1] else 0, 2)
                    } for item in therapy_effectiveness
                ],
                'predictions_summary': predictions_summary
            },
            'message': 'تم جلب التحليلات المتقدمة بنجاح'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب التحليلات: {str(e)}'
        }), 500

@comprehensive_rehab_enhanced_bp.route('/smart-recommendations/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
def get_smart_recommendations(beneficiary_id):
    """الحصول على توصيات ذكية للمستفيد"""
    try:
        beneficiary = RehabilitationBeneficiary.query.get_or_404(beneficiary_id)
        
        # الحصول على آخر تقييم
        latest_assessment = ComprehensiveAssessment.query.filter_by(
            beneficiary_id=beneficiary_id
        ).order_by(ComprehensiveAssessment.assessment_date.desc()).first()
        
        if not latest_assessment:
            return jsonify({
                'success': False,
                'message': 'لا يوجد تقييم للمستفيد'
            }), 400
        
        # تحليل التقييم
        ai_analysis = AdvancedAssessmentAlgorithms.calculate_comprehensive_score(latest_assessment)
        
        # التنبؤ بالتقدم
        progress_prediction = AIProgressPredictor.predict_progress(beneficiary_id, 6)
        
        # توصيات ذكية
        recommendations = {
            'immediate_actions': ai_analysis.get('recommended_interventions', []),
            'priority_areas': ai_analysis.get('priority_areas', []),
            'predicted_outcomes': progress_prediction.get('predicted_scores', {}),
            'risk_factors': progress_prediction.get('risk_factors', []),
            'suggested_interventions': progress_prediction.get('recommended_actions', [])
        }
        
        # توصيات إضافية بناءً على التحليل
        additional_recommendations = []
        
        # توصيات بناءً على العمر
        if beneficiary.age < 6:
            additional_recommendations.append('التركيز على برامج التدخل المبكر')
        elif beneficiary.age > 18:
            additional_recommendations.append('التركيز على مهارات الحياة المستقلة')
        
        # توصيات بناءً على نوع الإعاقة
        disability_recommendations = {
            'autism_spectrum': ['العلاج السلوكي التطبيقي', 'التدريب على المهارات الاجتماعية'],
            'physical': ['العلاج الطبيعي المكثف', 'استخدام الأجهزة المساعدة'],
            'intellectual': ['التعلم التدريجي', 'استراتيجيات التعلم البصري']
        }
        
        if beneficiary.primary_disability in disability_recommendations:
            additional_recommendations.extend(disability_recommendations[beneficiary.primary_disability])
        
        recommendations['additional_recommendations'] = additional_recommendations
        
        return jsonify({
            'success': True,
            'data': recommendations,
            'message': 'تم إنشاء التوصيات الذكية بنجاح'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء التوصيات: {str(e)}'
        }), 500

@comprehensive_rehab_enhanced_bp.route('/performance-metrics', methods=['GET'])
@jwt_required()
def get_performance_metrics():
    """مقاييس الأداء المتقدمة"""
    try:
        # مقاييس الأداء العامة
        metrics = {}
        
        # معدل التحسن الشهري
        monthly_improvement = db.session.query(
            db.func.avg(ProgressRecord.progress_percentage)
        ).filter(
            ProgressRecord.progress_date >= date.today() - timedelta(days=30)
        ).scalar() or 0
        
        # معدل إكمال الأهداف
        total_goals = RehabilitationGoal.query.count()
        completed_goals = RehabilitationGoal.query.filter_by(status='completed').count()
        goal_completion_rate = (completed_goals / total_goals * 100) if total_goals > 0 else 0
        
        # معدل رضا الأسر (محاكاة)
        family_satisfaction = 85.5  # يمكن ربطه بنظام استطلاعات حقيقي
        
        # كفاءة المعالجين
        therapist_efficiency = db.session.query(
            Therapist.first_name,
            Therapist.last_name,
            db.func.avg(ProgressRecord.progress_percentage).label('avg_progress')
        ).join(
            TherapySession, Therapist.id == TherapySession.therapist_id
        ).join(
            ProgressRecord, TherapySession.id == ProgressRecord.session_id
        ).group_by(Therapist.id).all()
        
        metrics = {
            'monthly_improvement_rate': round(monthly_improvement, 2),
            'goal_completion_rate': round(goal_completion_rate, 2),
            'family_satisfaction_rate': family_satisfaction,
            'therapist_performance': [
                {
                    'name': f"{item[0]} {item[1]}",
                    'average_progress': round(float(item[2]) if item[2] else 0, 2)
                } for item in therapist_efficiency
            ]
        }
        
        return jsonify({
            'success': True,
            'data': metrics,
            'message': 'تم جلب مقاييس الأداء بنجاح'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب مقاييس الأداء: {str(e)}'
        }), 500

@comprehensive_rehab_enhanced_bp.route('/export-report/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
def export_comprehensive_report(beneficiary_id):
    """تصدير تقرير شامل للمستفيد"""
    try:
        beneficiary = RehabilitationBeneficiary.query.get_or_404(beneficiary_id)
        
        # جمع جميع البيانات
        assessments = ComprehensiveAssessment.query.filter_by(
            beneficiary_id=beneficiary_id
        ).order_by(ComprehensiveAssessment.assessment_date.desc()).all()
        
        plans = IndividualRehabilitationPlan.query.filter_by(
            beneficiary_id=beneficiary_id
        ).all()
        
        sessions = TherapySession.query.filter_by(
            beneficiary_id=beneficiary_id
        ).order_by(TherapySession.session_date.desc()).limit(20).all()
        
        progress_records = ProgressRecord.query.filter_by(
            beneficiary_id=beneficiary_id
        ).order_by(ProgressRecord.progress_date.desc()).limit(50).all()
        
        # التنبؤ بالتقدم
        prediction = AIProgressPredictor.predict_progress(beneficiary_id, 6)
        
        # إنشاء التقرير الشامل
        report = {
            'beneficiary_info': {
                'name': f"{beneficiary.first_name} {beneficiary.last_name}",
                'code': beneficiary.beneficiary_code,
                'age': beneficiary.age,
                'disability_type': beneficiary.primary_disability,
                'severity_level': beneficiary.severity_level,
                'registration_date': beneficiary.registration_date.isoformat() if beneficiary.registration_date else None
            },
            'assessments_summary': [
                {
                    'date': assessment.assessment_date.isoformat(),
                    'type': assessment.assessment_type,
                    'overall_score': assessment.overall_score,
                    'motor_score': assessment.motor_skills_score,
                    'cognitive_score': assessment.cognitive_skills_score,
                    'communication_score': assessment.communication_skills_score,
                    'social_score': assessment.social_skills_score
                } for assessment in assessments
            ],
            'active_plans': [
                {
                    'name': plan.plan_name,
                    'start_date': plan.start_date.isoformat(),
                    'end_date': plan.end_date.isoformat() if plan.end_date else None,
                    'status': plan.status,
                    'goals_count': len(plan.goals)
                } for plan in plans if plan.status == 'active'
            ],
            'recent_sessions': [
                {
                    'date': session.session_date.isoformat(),
                    'type': session.session_type,
                    'duration': session.duration_minutes,
                    'status': session.status,
                    'progress_notes': session.progress_notes
                } for session in sessions
            ],
            'progress_trend': [
                {
                    'date': record.progress_date.isoformat(),
                    'skill_area': record.skill_area,
                    'progress_percentage': record.progress_percentage,
                    'current_score': record.current_score
                } for record in progress_records
            ],
            'ai_predictions': prediction if 'error' not in prediction else None,
            'report_generated_date': datetime.now().isoformat(),
            'report_generated_by': get_jwt_identity()
        }
        
        return jsonify({
            'success': True,
            'data': report,
            'message': 'تم إنشاء التقرير الشامل بنجاح'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء التقرير: {str(e)}'
        }), 500
