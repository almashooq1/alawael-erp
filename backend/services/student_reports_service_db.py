"""
Student Reports Service - Database Integration
خدمة التقارير المتقدمة - مع تكامل قاعدة البيانات
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
from sqlalchemy import and_
import uuid

logger = logging.getLogger(__name__)


class StudentReportsServiceDB:
    """خدمة التقارير المتقدمة مع تكامل قاعدة البيانات"""
    
    def __init__(self, db):
        """
        تهيئة الخدمة
        
        Args:
            db: SQLAlchemy database instance
        """
        self.db = db
    
    # ==========================================
    # 1. جلب البيانات من قاعدة البيانات
    # ==========================================
    
    def _fetch_student_data(self, student_id: str, date_from: str, date_to: str) -> Dict:
        """جلب بيانات الطالب الشاملة"""
        try:
            from backend.models.models import Student
            
            student = Student.query.filter_by(id=student_id).first()
            if not student:
                logger.error(f"Student {student_id} not found")
                raise ValueError(f"الطالب {student_id} غير موجود")
            
            return {
                'student': student,
                'grades': self._fetch_grades(student_id, date_from, date_to),
                'attendance': self._fetch_attendance(student_id, date_from, date_to),
                'behavior': self._fetch_behavior_records(student_id, date_from, date_to),
                'skills': self._fetch_skills_assessment(student_id),
            }
        except Exception as e:
            logger.error(f"Error fetching student data: {e}")
            raise
    
    def _fetch_grades(self, student_id: str, date_from: str, date_to: str) -> List[Dict]:
        """جلب درجات الطالب في الفترة المحددة"""
        try:
            from backend.models.models import Grade
            
            # تحويل التواريخ إلى datetime
            start_date = datetime.fromisoformat(date_from)
            end_date = datetime.fromisoformat(date_to)
            
            grades = Grade.query.filter(
                and_(
                    Grade.student_id == student_id,
                    Grade.date >= start_date,
                    Grade.date <= end_date
                )
            ).all()
            
            return [g.to_dict() for g in grades]
        except Exception as e:
            logger.error(f"Error fetching grades: {e}")
            return []
    
    def _fetch_attendance(self, student_id: str, date_from: str, date_to: str) -> Dict:
        """جلب بيانات الحضور"""
        try:
            from backend.models.models import Attendance
            
            start_date = datetime.fromisoformat(date_from).date()
            end_date = datetime.fromisoformat(date_to).date()
            
            records = Attendance.query.filter(
                and_(
                    Attendance.student_id == student_id,
                    Attendance.date >= start_date,
                    Attendance.date <= end_date
                )
            ).all()
            
            total_days = len(records)
            present_days = len([r for r in records if r.status == 'present'])
            late_days = len([r for r in records if r.status == 'late'])
            absent_days = len([r for r in records if r.status == 'absent'])
            excused_days = len([r for r in records if r.status == 'excused'])
            
            return {
                'total_days': total_days,
                'present_days': present_days,
                'late_days': late_days,
                'absent_days': absent_days,
                'excused_days': excused_days,
                'rate': (present_days / total_days * 100) if total_days > 0 else 0,
                'late_rate': (late_days / total_days * 100) if total_days > 0 else 0,
                'records': [r.to_dict() for r in records[-10:]]  # آخر 10 سجلات
            }
        except Exception as e:
            logger.error(f"Error fetching attendance: {e}")
            return {
                'total_days': 0,
                'present_days': 0,
                'late_days': 0,
                'absent_days': 0,
                'rate': 0,
                'records': []
            }
    
    def _fetch_behavior_records(self, student_id: str, date_from: str, date_to: str) -> List[Dict]:
        """جلب سجلات السلوك"""
        try:
            from backend.models.models import BehaviorRecord
            
            start_date = datetime.fromisoformat(date_from)
            end_date = datetime.fromisoformat(date_to)
            
            records = BehaviorRecord.query.filter(
                and_(
                    BehaviorRecord.student_id == student_id,
                    BehaviorRecord.date >= start_date,
                    BehaviorRecord.date <= end_date
                )
            ).order_by(BehaviorRecord.date.desc()).all()
            
            return [r.to_dict() for r in records]
        except Exception as e:
            logger.error(f"Error fetching behavior records: {e}")
            return []
    
    def _fetch_skills_assessment(self, student_id: str) -> Dict:
        """جلب تقييم المهارات الحديث"""
        try:
            from backend.models.models import SkillsAssessment
            
            assessment = SkillsAssessment.query.filter_by(
                student_id=student_id
            ).order_by(SkillsAssessment.assessment_date.desc()).first()
            
            if not assessment:
                return self._get_default_skills()
            
            return assessment.to_dict()
        except Exception as e:
            logger.error(f"Error fetching skills assessment: {e}")
            return self._get_default_skills()
    
    # ==========================================
    # 2. التحليلات والحسابات
    # ==========================================
    
    def _analyze_academic_performance(self, student_data: Dict) -> Dict:
        """تحليل الأداء الأكاديمي"""
        grades = student_data.get('grades', [])
        
        if not grades:
            return {
                'average': 0,
                'highest': 0,
                'lowest': 0,
                'variance': 0,
                'trend': 'neutral',
                'grade_count': 0
            }
        
        scores = [g['percentage'] for g in grades]
        average = sum(scores) / len(scores) if scores else 0
        
        # حساب الاتجاه
        if len(scores) >= 3:
            recent_avg = sum(scores[-3:]) / 3
            older_avg = sum(scores[:-3]) / len(scores[:-3]) if len(scores) > 3 else scores[0]
            
            if recent_avg > older_avg:
                trend = 'up'
            elif recent_avg < older_avg:
                trend = 'down'
            else:
                trend = 'stable'
        else:
            trend = 'neutral'
        
        return {
            'average': round(average, 2),
            'highest': max(scores) if scores else 0,
            'lowest': min(scores) if scores else 0,
            'variance': round(max(scores) - min(scores), 2) if scores else 0,
            'trend': trend,
            'grade_count': len(grades),
            'subjects': list(set([g['subject'] for g in grades]))
        }
    
    def _analyze_behavior(self, student_data: Dict) -> Dict:
        """تحليل السلوك والانضباط"""
        records = student_data.get('behavior', [])
        
        if not records:
            return {
                'average_score': 0,
                'positive_count': 0,
                'warning_count': 0,
                'incident_count': 0,
                'trend': 'stable'
            }
        
        positive_count = len([r for r in records if r['type'] == 'positive'])
        warning_count = len([r for r in records if r['type'] == 'warning'])
        incident_count = len([r for r in records if r['type'] == 'incident'])
        
        average_score = sum(r['score'] for r in records) / len(records) if records else 0
        
        # تحديد الاتجاه بناءً على النسب
        total = len(records)
        positive_rate = positive_count / total if total > 0 else 0
        
        if positive_rate > 0.7:
            trend = 'positive'
        elif positive_rate < 0.3:
            trend = 'negative'
        else:
            trend = 'neutral'
        
        return {
            'average_score': round(average_score, 2),
            'positive_count': positive_count,
            'warning_count': warning_count,
            'incident_count': incident_count,
            'total_records': len(records),
            'trend': trend,
            'positive_rate': round(positive_rate * 100, 1)
        }
    
    def _analyze_attendance(self, student_data: Dict) -> Dict:
        """تحليل الحضور"""
        attendance = student_data.get('attendance', {})
        
        return {
            'total_days': attendance.get('total_days', 0),
            'present_days': attendance.get('present_days', 0),
            'late_days': attendance.get('late_days', 0),
            'absent_days': attendance.get('absent_days', 0),
            'attendance_rate': round(attendance.get('rate', 0), 1),
            'late_rate': round(attendance.get('late_rate', 0), 1),
            'trend': 'good' if attendance.get('rate', 0) > 90 else 'fair' if attendance.get('rate', 0) > 75 else 'poor'
        }
    
    def _analyze_skills(self, student_data: Dict) -> Dict:
        """تحليل المهارات"""
        skills = student_data.get('skills', {})
        
        if not skills:
            return self._get_default_skills()
        
        return {
            'academic_skills': skills.get('academic_skills', 0),
            'life_skills': skills.get('life_skills', 0),
            'social_skills': skills.get('social_skills', 0),
            'cognitive_skills': skills.get('cognitive_skills', 0),
            'emotional_skills': skills.get('emotional_skills', 0),
            'overall': round(
                sum([
                    skills.get('academic_skills', 0),
                    skills.get('life_skills', 0),
                    skills.get('social_skills', 0),
                    skills.get('cognitive_skills', 0),
                    skills.get('emotional_skills', 0),
                ]) / 5, 2
            )
        }
    
    # ==========================================
    # 3. الرؤى والتوصيات
    # ==========================================
    
    def _generate_insights(self, student_data: Dict) -> List[Dict]:
        """توليد الرؤى الذكية"""
        insights = []
        academic = self._analyze_academic_performance(student_data)
        attendance = self._analyze_attendance(student_data)
        behavior = self._analyze_behavior(student_data)
        
        # رؤية الأداء الأكاديمي
        if academic['trend'] == 'up':
            insights.append({
                'type': 'success',
                'title': 'تحسن ملحوظ في الأداء الأكاديمي',
                'details': f"المعدل يتجه نحو الأعلى، الاتجاه إيجابي جداً",
                'priority': 'high'
            })
        elif academic['trend'] == 'down':
            insights.append({
                'type': 'warning',
                'title': 'تراجع في الأداء الأكاديمي',
                'details': f"المعدل يتجه نحو الانخفاض، يحتاج متابعة",
                'priority': 'high'
            })
        
        # رؤية الحضور
        if attendance['attendance_rate'] < 85:
            insights.append({
                'type': 'warning',
                'title': 'نسبة حضور منخفضة',
                'details': f"نسبة الحضور {attendance['attendance_rate']}% أقل من المتوقع",
                'priority': 'high'
            })
        
        # رؤية السلوك
        if behavior['trend'] == 'positive':
            insights.append({
                'type': 'success',
                'title': 'سلوك إيجابي',
                'details': f"نسبة السلوكيات الإيجابية {behavior['positive_rate']}%",
                'priority': 'medium'
            })
        
        return insights
    
    def _assess_risk_signals(self, student_data: Dict) -> List[Dict]:
        """تقييم إشارات الخطر"""
        signals = []
        academic = self._analyze_academic_performance(student_data)
        behavior = self._analyze_behavior(student_data)
        attendance = self._analyze_attendance(student_data)
        
        # خطر أكاديمي
        if academic['average'] < 2.5:
            signals.append({
                'type': 'academic',
                'level': 'critical' if academic['average'] < 2.0 else 'high',
                'score': academic['average']
            })
        
        # خطر سلوكي
        if behavior['incident_count'] > 3:
            signals.append({
                'type': 'behavior',
                'level': 'high',
                'incident_count': behavior['incident_count']
            })
        
        # خطر الحضور
        if attendance['attendance_rate'] < 85:
            signals.append({
                'type': 'attendance',
                'level': 'high' if attendance['attendance_rate'] < 75 else 'medium',
                'rate': attendance['attendance_rate']
            })
        
        return signals
    
    def _generate_recommendations(self, student_data: Dict) -> List[Dict]:
        """توليد التوصيات"""
        recommendations = []
        academic = self._analyze_academic_performance(student_data)
        
        if academic['trend'] == 'down':
            recommendations.append({
                'title': 'تحسين الأداء الأكاديمي',
                'priority': 'high',
                'actions': [
                    'زيادة ساعات الدراسة',
                    'طلب مساعدة من المعلم',
                    'تنظيم جدول دراسي'
                ]
            })
        
        recommendations.append({
            'title': 'الاستمرار في التحسن',
            'priority': 'medium',
            'actions': [
                'المشاركة النشطة في الفصل',
                'حل الواجبات في الوقت المحدد',
                'التركيز على نقاط الضعف'
            ]
        })
        
        return recommendations
    
    # ==========================================
    # 4. البيانات الافتراضية
    # ==========================================
    
    def _get_default_skills(self) -> Dict:
        """البيانات الافتراضية للمهارات"""
        return {
            'academic_skills': 0,
            'life_skills': 0,
            'social_skills': 0,
            'cognitive_skills': 0,
            'emotional_skills': 0,
            'overall': 0
        }
    
    # ==========================================
    # 5. دوال مساعدة
    # ==========================================
    
    def _generate_report_id(self) -> str:
        """توليد معرف فريد للتقرير"""
        return str(uuid.uuid4())


# ==========================================
# استخدام الخدمة
# ==========================================

def create_service(db):
    """إنشاء instance من الخدمة"""
    return StudentReportsServiceDB(db)
