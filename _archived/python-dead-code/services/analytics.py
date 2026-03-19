"""
خدمة لوحة التحليلات المتقدمة
"""

from datetime import datetime, timedelta
from sqlalchemy import func
from models import (
    db, Beneficiary, TherapySession, Assessment, 
    Report, Goal, GoalProgress, Program, User
)
from flask import Blueprint, jsonify
from flask_jwt_required import jwt_required
import logging

logger = logging.getLogger(__name__)

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')


class AnalyticsService:
    """خدمة التحليلات"""
    
    @staticmethod
    def get_dashboard_summary():
        """الحصول على ملخص لوحة التحكم"""
        try:
            return {
                'total_beneficiaries': Beneficiary.query.count(),
                'total_sessions': TherapySession.query.count(),
                'total_reports': Report.query.count(),
                'total_assessments': Assessment.query.count(),
                'total_goals': Goal.query.count(),
                'total_programs': Program.query.count(),
                'active_users': User.query.filter_by(is_active=True).count(),
                'timestamp': datetime.now()
            }
        except Exception as e:
            logger.error(f"خطأ في الملخص: {str(e)}")
            return {}
    
    @staticmethod
    def get_sessions_statistics(days=30):
        """إحصائيات الجلسات"""
        try:
            start_date = datetime.now() - timedelta(days=days)
            
            # إجمالي الجلسات
            total = TherapySession.query.filter(
                TherapySession.session_date >= start_date
            ).count()
            
            # الجلسات المكتملة
            completed = TherapySession.query.filter(
                TherapySession.session_date >= start_date,
                TherapySession.status == 'completed'
            ).count()
            
            # الجلسات المجدولة
            scheduled = TherapySession.query.filter(
                TherapySession.session_date >= start_date,
                TherapySession.status == 'scheduled'
            ).count()
            
            # الجلسات الملغاة
            cancelled = TherapySession.query.filter(
                TherapySession.session_date >= start_date,
                TherapySession.status == 'cancelled'
            ).count()
            
            # متوسط المدة
            avg_duration = db.session.query(
                func.avg(TherapySession.duration_minutes)
            ).filter(
                TherapySession.session_date >= start_date
            ).scalar() or 0
            
            return {
                'total': total,
                'completed': completed,
                'scheduled': scheduled,
                'cancelled': cancelled,
                'completion_rate': (completed / total * 100) if total > 0 else 0,
                'average_duration': round(avg_duration, 2),
                'period_days': days
            }
        except Exception as e:
            logger.error(f"خطأ في إحصائيات الجلسات: {str(e)}")
            return {}
    
    @staticmethod
    def get_beneficiary_statistics():
        """إحصائيات المستفيدين"""
        try:
            # حسب نوع الإعاقة
            disability_types = db.session.query(
                Beneficiary.disability_type,
                func.count(Beneficiary.id)
            ).group_by(Beneficiary.disability_type).all()
            
            # حسب درجة الشدة
            severity_levels = db.session.query(
                Beneficiary.severity_level,
                func.count(Beneficiary.id)
            ).group_by(Beneficiary.severity_level).all()
            
            # توزيع الجنس
            gender_distribution = db.session.query(
                Beneficiary.gender,
                func.count(Beneficiary.id)
            ).group_by(Beneficiary.gender).all()
            
            return {
                'by_disability_type': [
                    {'type': t[0], 'count': t[1]} for t in disability_types
                ],
                'by_severity_level': [
                    {'level': s[0], 'count': s[1]} for s in severity_levels
                ],
                'by_gender': [
                    {'gender': g[0], 'count': g[1]} for g in gender_distribution
                ],
                'total_active': Beneficiary.query.count()
            }
        except Exception as e:
            logger.error(f"خطأ في إحصائيات المستفيدين: {str(e)}")
            return {}
    
    @staticmethod
    def get_assessment_statistics(days=90):
        """إحصائيات التقييمات"""
        try:
            start_date = datetime.now() - timedelta(days=days)
            
            # التقييمات حسب النوع
            assessment_types = db.session.query(
                Assessment.assessment_type,
                func.count(Assessment.id),
                func.avg(Assessment.total_score)
            ).filter(
                Assessment.assessment_date >= start_date
            ).group_by(Assessment.assessment_type).all()
            
            # متوسط الدرجات الإجمالي
            avg_score = db.session.query(
                func.avg(Assessment.total_score)
            ).filter(
                Assessment.assessment_date >= start_date
            ).scalar() or 0
            
            # التقييمات الأخيرة
            recent = Assessment.query.filter(
                Assessment.assessment_date >= start_date
            ).order_by(Assessment.assessment_date.desc()).limit(10).all()
            
            return {
                'by_type': [
                    {
                        'type': t[0],
                        'count': t[1],
                        'average_score': round(t[2], 2) if t[2] else 0
                    }
                    for t in assessment_types
                ],
                'overall_average_score': round(avg_score, 2),
                'total_assessments': Assessment.query.filter(
                    Assessment.assessment_date >= start_date
                ).count()
            }
        except Exception as e:
            logger.error(f"خطأ في إحصائيات التقييمات: {str(e)}")
            return {}
    
    @staticmethod
    def get_goals_progress():
        """تقدم الأهداف"""
        try:
            # الأهداف النشطة
            active_goals = Goal.query.filter(
                Goal.goal_status == 'active'
            ).count()
            
            # الأهداف المكتملة
            completed_goals = Goal.query.filter(
                Goal.goal_status == 'completed'
            ).count()
            
            # متوسط التقدم
            avg_progress = db.session.query(
                func.avg(Goal.current_progress)
            ).filter(
                Goal.goal_status == 'active'
            ).scalar() or 0
            
            # الأهداف حسب المجال
            goals_by_domain = db.session.query(
                Goal.domain,
                func.count(Goal.id),
                func.avg(Goal.current_progress)
            ).group_by(Goal.domain).all()
            
            return {
                'active_goals': active_goals,
                'completed_goals': completed_goals,
                'completion_rate': (completed_goals / (active_goals + completed_goals) * 100) 
                                  if (active_goals + completed_goals) > 0 else 0,
                'average_progress': round(avg_progress, 2),
                'by_domain': [
                    {
                        'domain': d[0],
                        'count': d[1],
                        'average_progress': round(d[2], 2) if d[2] else 0
                    }
                    for d in goals_by_domain
                ]
            }
        except Exception as e:
            logger.error(f"خطأ في تقدم الأهداف: {str(e)}")
            return {}
    
    @staticmethod
    def get_programs_statistics():
        """إحصائيات البرامج"""
        try:
            # إجمالي البرامج
            total_programs = Program.query.count()
            
            # البرامج النشطة
            active_programs = Program.query.filter(
                Program.is_active == True
            ).count()
            
            # المستفيدين المسجلين
            total_enrollments = db.session.query(
                func.sum(
                    db.session.query(func.count(ProgramEnrollment.id))
                    .filter(ProgramEnrollment.program_id == Program.id)
                )
            ).scalar() or 0
            
            # البرامج حسب النوع
            by_type = db.session.query(
                Program.program_type,
                func.count(Program.id)
            ).group_by(Program.program_type).all()
            
            return {
                'total_programs': total_programs,
                'active_programs': active_programs,
                'total_enrollments': total_enrollments,
                'by_type': [
                    {'type': t[0], 'count': t[1]} for t in by_type
                ]
            }
        except Exception as e:
            logger.error(f"خطأ في إحصائيات البرامج: {str(e)}")
            return {}
    
    @staticmethod
    def get_trends(days=30):
        """الاتجاهات الرسومية"""
        try:
            start_date = datetime.now() - timedelta(days=days)
            
            # بيانات يومية للجلسات
            daily_sessions = db.session.query(
                func.date(TherapySession.session_date),
                func.count(TherapySession.id)
            ).filter(
                TherapySession.session_date >= start_date
            ).group_by(func.date(TherapySession.session_date)).all()
            
            # بيانات يومية للتقارير
            daily_reports = db.session.query(
                func.date(Report.created_at),
                func.count(Report.id)
            ).filter(
                Report.created_at >= start_date
            ).group_by(func.date(Report.created_at)).all()
            
            return {
                'sessions_trend': [
                    {
                        'date': str(date),
                        'count': count
                    }
                    for date, count in daily_sessions
                ],
                'reports_trend': [
                    {
                        'date': str(date),
                        'count': count
                    }
                    for date, count in daily_reports
                ]
            }
        except Exception as e:
            logger.error(f"خطأ في الاتجاهات: {str(e)}")
            return {}


# API Endpoints

@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """لوحة التحكم الرئيسية"""
    data = {
        'summary': AnalyticsService.get_dashboard_summary(),
        'sessions': AnalyticsService.get_sessions_statistics(),
        'beneficiaries': AnalyticsService.get_beneficiary_statistics(),
        'assessments': AnalyticsService.get_assessment_statistics(),
        'goals': AnalyticsService.get_goals_progress(),
        'programs': AnalyticsService.get_programs_statistics(),
        'timestamp': datetime.now()
    }
    return jsonify(data)


@analytics_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_summary():
    """ملخص سريع"""
    return jsonify(AnalyticsService.get_dashboard_summary())


@analytics_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_sessions_analytics():
    """تحليلات الجلسات"""
    days = request.args.get('days', 30, type=int)
    return jsonify(AnalyticsService.get_sessions_statistics(days=days))


@analytics_bp.route('/beneficiaries', methods=['GET'])
@jwt_required()
def get_beneficiaries_analytics():
    """تحليلات المستفيدين"""
    return jsonify(AnalyticsService.get_beneficiary_statistics())


@analytics_bp.route('/assessments', methods=['GET'])
@jwt_required()
def get_assessments_analytics():
    """تحليلات التقييمات"""
    days = request.args.get('days', 90, type=int)
    return jsonify(AnalyticsService.get_assessment_statistics(days=days))


@analytics_bp.route('/goals', methods=['GET'])
@jwt_required()
def get_goals_analytics():
    """تحليلات الأهداف"""
    return jsonify(AnalyticsService.get_goals_progress())


@analytics_bp.route('/programs', methods=['GET'])
@jwt_required()
def get_programs_analytics():
    """تحليلات البرامج"""
    return jsonify(AnalyticsService.get_programs_statistics())


@analytics_bp.route('/trends', methods=['GET'])
@jwt_required()
def get_analytics_trends():
    """الاتجاهات"""
    days = request.args.get('days', 30, type=int)
    return jsonify(AnalyticsService.get_trends(days=days))


@analytics_bp.route('/report', methods=['GET'])
@jwt_required()
def get_analytics_report():
    """تقرير شامل"""
    return jsonify({
        'summary': AnalyticsService.get_dashboard_summary(),
        'sessions': AnalyticsService.get_sessions_statistics(),
        'beneficiaries': AnalyticsService.get_beneficiary_statistics(),
        'assessments': AnalyticsService.get_assessment_statistics(),
        'goals': AnalyticsService.get_goals_progress(),
        'programs': AnalyticsService.get_programs_statistics(),
        'trends': AnalyticsService.get_trends(),
        'generated_at': datetime.now()
    })
