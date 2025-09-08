#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import json
from database import db
try:
    from comprehensive_rehabilitation_models import (
        RehabilitationBeneficiary, TherapySession, ComprehensiveAssessment
    )
except ImportError:
    # تعريف بديل في حالة عدم توفر النماذج
    RehabilitationBeneficiary = None
    TherapySession = None
    ComprehensiveAssessment = None

class GamificationSystem:
    """نظام التلعيب المتقدم للتأهيل"""
    
    def __init__(self):
        self.achievement_types = {
            'attendance': 'الحضور المنتظم',
            'progress': 'التقدم في المهارات',
            'consistency': 'الثبات والاستمرارية',
            'milestone': 'الوصول للأهداف',
            'participation': 'المشاركة الفعالة',
            'improvement': 'التحسن السريع'
        }
        
        self.badge_levels = {
            'bronze': {'name': 'برونزي', 'points': 100, 'color': '#CD7F32'},
            'silver': {'name': 'فضي', 'points': 250, 'color': '#C0C0C0'},
            'gold': {'name': 'ذهبي', 'points': 500, 'color': '#FFD700'},
            'platinum': {'name': 'بلاتيني', 'points': 1000, 'color': '#E5E4E2'},
            'diamond': {'name': 'ماسي', 'points': 2000, 'color': '#B9F2FF'}
        }
        
        self.challenges = {
            'weekly_attendance': {
                'name': 'تحدي الحضور الأسبوعي',
                'description': 'احضر جميع جلساتك هذا الأسبوع',
                'points': 50,
                'duration_days': 7
            },
            'skill_improvement': {
                'name': 'تحدي تحسين المهارات',
                'description': 'حقق تحسناً بنسبة 10% في مهارة واحدة',
                'points': 100,
                'duration_days': 30
            },
            'consistency_streak': {
                'name': 'تحدي الاستمرارية',
                'description': 'احضر 10 جلسات متتالية دون انقطاع',
                'points': 200,
                'duration_days': 60
            }
        }
    
    def calculate_user_points(self, beneficiary_id: int) -> Dict:
        """حساب نقاط المستفيد"""
        try:
            # نقاط الحضور
            completed_sessions = TherapySession.query.filter_by(
                beneficiary_id=beneficiary_id,
                status='completed'
            ).count()
            attendance_points = completed_sessions * 10
            
            # نقاط التقدم
            latest_assessment = ComprehensiveAssessment.query.filter_by(
                beneficiary_id=beneficiary_id
            ).order_by(ComprehensiveAssessment.assessment_date.desc()).first()
            
            progress_points = 0
            if latest_assessment and latest_assessment.overall_score:
                progress_points = int(latest_assessment.overall_score * 2)
            
            # نقاط الأنشطة
            activity_points = self._calculate_activity_points(beneficiary_id)
            
            # نقاط التحديات
            challenge_points = self._calculate_challenge_points(beneficiary_id)
            
            total_points = attendance_points + progress_points + activity_points + challenge_points
            
            return {
                'success': True,
                'points_breakdown': {
                    'attendance_points': attendance_points,
                    'progress_points': progress_points,
                    'activity_points': activity_points,
                    'challenge_points': challenge_points,
                    'total_points': total_points
                },
                'current_level': self._get_user_level(total_points),
                'next_level_points': self._get_next_level_points(total_points)
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في حساب النقاط: {str(e)}'}
    
    def _calculate_activity_points(self, beneficiary_id: int) -> int:
        """حساب نقاط الأنشطة"""
        # نقاط إضافية للمشاركة في الأنشطة المختلفة
        base_points = 50
        
        # يمكن إضافة المزيد من المعايير هنا
        return base_points
    
    def _calculate_challenge_points(self, beneficiary_id: int) -> int:
        """حساب نقاط التحديات المكتملة"""
        # في التطبيق الحقيقي، يتم الاستعلام من جدول التحديات المكتملة
        completed_challenges = 2  # مثال
        return completed_challenges * 100
    
    def _get_user_level(self, total_points: int) -> Dict:
        """تحديد مستوى المستخدم"""
        for level, data in reversed(list(self.badge_levels.items())):
            if total_points >= data['points']:
                return {
                    'level': level,
                    'name': data['name'],
                    'color': data['color'],
                    'required_points': data['points']
                }
        return {
            'level': 'beginner',
            'name': 'مبتدئ',
            'color': '#808080',
            'required_points': 0
        }
    
    def _get_next_level_points(self, total_points: int) -> int:
        """حساب النقاط المطلوبة للمستوى التالي"""
        for level, data in self.badge_levels.items():
            if total_points < data['points']:
                return data['points'] - total_points
        return 0  # وصل للمستوى الأعلى
    
    def create_achievement(self, beneficiary_id: int, achievement_data: Dict) -> Dict:
        """إنشاء إنجاز جديد"""
        try:
            achievement = {
                'id': f"achievement_{datetime.now().timestamp()}",
                'beneficiary_id': beneficiary_id,
                'type': achievement_data['type'],
                'title': achievement_data['title'],
                'description': achievement_data['description'],
                'points_awarded': achievement_data['points'],
                'badge_level': achievement_data.get('badge_level', 'bronze'),
                'earned_date': datetime.now().isoformat(),
                'criteria_met': achievement_data.get('criteria_met', {}),
                'is_milestone': achievement_data.get('is_milestone', False)
            }
            
            # في التطبيق الحقيقي، يتم حفظ الإنجاز في قاعدة البيانات
            
            return {
                'success': True,
                'achievement': achievement,
                'message': f'تهانينا! لقد حصلت على إنجاز: {achievement["title"]}'
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنشاء الإنجاز: {str(e)}'}
    
    def check_achievements(self, beneficiary_id: int) -> Dict:
        """فحص الإنجازات المستحقة"""
        try:
            new_achievements = []
            
            # فحص إنجاز الحضور
            attendance_achievement = self._check_attendance_achievement(beneficiary_id)
            if attendance_achievement:
                new_achievements.append(attendance_achievement)
            
            # فحص إنجاز التقدم
            progress_achievement = self._check_progress_achievement(beneficiary_id)
            if progress_achievement:
                new_achievements.append(progress_achievement)
            
            # فحص إنجاز الاستمرارية
            consistency_achievement = self._check_consistency_achievement(beneficiary_id)
            if consistency_achievement:
                new_achievements.append(consistency_achievement)
            
            return {
                'success': True,
                'new_achievements': new_achievements,
                'count': len(new_achievements)
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في فحص الإنجازات: {str(e)}'}
    
    def _check_attendance_achievement(self, beneficiary_id: int) -> Optional[Dict]:
        """فحص إنجازات الحضور"""
        completed_sessions = TherapySession.query.filter_by(
            beneficiary_id=beneficiary_id,
            status='completed'
        ).count()
        
        if completed_sessions >= 10 and completed_sessions % 10 == 0:
            return {
                'type': 'attendance',
                'title': f'نجم الحضور - {completed_sessions} جلسة',
                'description': f'حضرت {completed_sessions} جلسة علاجية',
                'points': 50,
                'badge_level': 'silver' if completed_sessions >= 50 else 'bronze'
            }
        return None
    
    def _check_progress_achievement(self, beneficiary_id: int) -> Optional[Dict]:
        """فحص إنجازات التقدم"""
        assessments = ComprehensiveAssessment.query.filter_by(
            beneficiary_id=beneficiary_id
        ).order_by(ComprehensiveAssessment.assessment_date.desc()).limit(2).all()
        
        if len(assessments) >= 2:
            latest_score = assessments[0].overall_score or 0
            previous_score = assessments[1].overall_score or 0
            improvement = latest_score - previous_score
            
            if improvement >= 15:
                return {
                    'type': 'progress',
                    'title': 'قفزة نوعية',
                    'description': f'تحسن بنسبة {improvement:.1f}% في التقييم',
                    'points': 100,
                    'badge_level': 'gold'
                }
        return None
    
    def _check_consistency_achievement(self, beneficiary_id: int) -> Optional[Dict]:
        """فحص إنجازات الاستمرارية"""
        # فحص الجلسات في آخر 30 يوم
        thirty_days_ago = date.today() - timedelta(days=30)
        recent_sessions = TherapySession.query.filter(
            TherapySession.beneficiary_id == beneficiary_id,
            TherapySession.session_date >= thirty_days_ago,
            TherapySession.status == 'completed'
        ).count()
        
        if recent_sessions >= 8:  # جلستان أسبوعياً لمدة شهر
            return {
                'type': 'consistency',
                'title': 'المثابر',
                'description': 'حافظت على الانتظام لمدة شهر كامل',
                'points': 150,
                'badge_level': 'gold'
            }
        return None
    
    def get_leaderboard(self, period: str = 'monthly') -> Dict:
        """الحصول على لوحة المتصدرين"""
        try:
            # في التطبيق الحقيقي، يتم حساب النقاط لجميع المستفيدين
            leaderboard = [
                {
                    'rank': 1,
                    'beneficiary_id': 1,
                    'name': 'أحمد محمد',
                    'points': 1250,
                    'level': 'platinum',
                    'achievements_count': 8
                },
                {
                    'rank': 2,
                    'beneficiary_id': 2,
                    'name': 'فاطمة علي',
                    'points': 980,
                    'level': 'gold',
                    'achievements_count': 6
                },
                {
                    'rank': 3,
                    'beneficiary_id': 3,
                    'name': 'محمد حسن',
                    'points': 750,
                    'level': 'gold',
                    'achievements_count': 5
                }
            ]
            
            return {
                'success': True,
                'leaderboard': leaderboard,
                'period': period,
                'total_participants': len(leaderboard)
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في الحصول على المتصدرين: {str(e)}'}
    
    def create_challenge(self, challenge_data: Dict) -> Dict:
        """إنشاء تحدي جديد"""
        try:
            challenge = {
                'id': f"challenge_{datetime.now().timestamp()}",
                'name': challenge_data['name'],
                'description': challenge_data['description'],
                'points_reward': challenge_data['points'],
                'start_date': challenge_data.get('start_date', datetime.now().isoformat()),
                'end_date': challenge_data['end_date'],
                'criteria': challenge_data['criteria'],
                'participants': [],
                'status': 'active'
            }
            
            return {
                'success': True,
                'challenge': challenge
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنشاء التحدي: {str(e)}'}
    
    def calculate_points(self, beneficiary_id: int, activity_type: str, activity_data: Dict) -> int:
        """حساب النقاط بناءً على النشاط"""
        try:
            beneficiary = None
            if RehabilitationBeneficiary:
                beneficiary = RehabilitationBeneficiary.query.get(beneficiary_id)
            if not beneficiary:
                return 0
{{ ... }}
            return {
                'success': True,
                'participation': participation,
                'message': 'تم الانضمام للتحدي بنجاح'
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في الانضمام للتحدي: {str(e)}'}
    
    def get_user_achievements(self, beneficiary_id: int) -> Dict:
        """الحصول على إنجازات المستفيد"""
        try:
            # في التطبيق الحقيقي، يتم الاستعلام من قاعدة البيانات
            achievements = [
                {
                    'id': 'ach_001',
                    'title': 'أول خطوة',
                    'description': 'أكملت أول جلسة علاجية',
                    'earned_date': '2024-01-01',
                    'points': 25,
                    'badge_level': 'bronze'
                },
                {
                    'id': 'ach_002',
                    'title': 'المثابر',
                    'description': 'حضرت 10 جلسات متتالية',
                    'earned_date': '2024-01-10',
                    'points': 100,
                    'badge_level': 'silver'
                }
            ]
            
            return {
                'success': True,
                'achievements': achievements,
                'total_count': len(achievements),
                'total_points': sum([a['points'] for a in achievements])
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في الحصول على الإنجازات: {str(e)}'}
    
    def get_progress_visualization(self, beneficiary_id: int) -> Dict:
        """الحصول على تصور التقدم التفاعلي"""
        try:
            # بيانات التقدم للرسم البياني
            progress_data = {
                'points_history': [
                    {'date': '2024-01-01', 'points': 25},
                    {'date': '2024-01-05', 'points': 75},
                    {'date': '2024-01-10', 'points': 175},
                    {'date': '2024-01-15', 'points': 250}
                ],
                'skill_progress': {
                    'motor_skills': 75,
                    'cognitive_skills': 68,
                    'communication_skills': 82,
                    'social_skills': 70
                },
                'achievements_timeline': [
                    {'date': '2024-01-01', 'achievement': 'أول خطوة'},
                    {'date': '2024-01-10', 'achievement': 'المثابر'}
                ]
            }
            
            return {
                'success': True,
                'visualization_data': progress_data
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في الحصول على التصور: {str(e)}'}

# إنشاء Blueprint للـ API
gamification_bp = Blueprint('gamification', __name__, url_prefix='/api/gamification')
gamification_service = GamificationSystem()

@gamification_bp.route('/points/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
def get_user_points(beneficiary_id):
    """الحصول على نقاط المستفيد"""
    try:
        result = gamification_service.calculate_user_points(beneficiary_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@gamification_bp.route('/achievements/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
def get_user_achievements(beneficiary_id):
    """الحصول على إنجازات المستفيد"""
    try:
        result = gamification_service.get_user_achievements(beneficiary_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@gamification_bp.route('/achievements/check/<int:beneficiary_id>', methods=['POST'])
@jwt_required()
def check_new_achievements(beneficiary_id):
    """فحص الإنجازات الجديدة"""
    try:
        result = gamification_service.check_achievements(beneficiary_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@gamification_bp.route('/leaderboard', methods=['GET'])
@jwt_required()
def get_leaderboard():
    """الحصول على لوحة المتصدرين"""
    try:
        period = request.args.get('period', 'monthly')
        result = gamification_service.get_leaderboard(period)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@gamification_bp.route('/challenges', methods=['POST'])
@jwt_required()
def create_challenge():
    """إنشاء تحدي جديد"""
    try:
        data = request.get_json()
        result = gamification_service.create_challenge(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@gamification_bp.route('/challenges/<challenge_id>/join', methods=['POST'])
@jwt_required()
def join_challenge(challenge_id):
    """الانضمام لتحدي"""
    try:
        data = request.get_json()
        beneficiary_id = data.get('beneficiary_id')
        result = gamification_service.join_challenge(beneficiary_id, challenge_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@gamification_bp.route('/visualization/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
def get_progress_visualization(beneficiary_id):
    """الحصول على تصور التقدم"""
    try:
        result = gamification_service.get_progress_visualization(beneficiary_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500
