"""
نظام التحليلات والتقارير المتقدمة
Advanced Analytics & Reporting System for Student Management
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum
import json
from collections import defaultdict, Counter
import statistics
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== تعريفات البيانات ====================

class ReportType(Enum):
    """أنواع التقارير المتاحة"""
    STUDENT_PERFORMANCE = "student_performance"
    COURSE_ANALYTICS = "course_analytics"
    ATTENDANCE_TRENDS = "attendance_trends"
    ENROLLMENT_ANALYSIS = "enrollment_analysis"
    GPA_DISTRIBUTION = "gpa_distribution"
    INSTRUCTOR_PERFORMANCE = "instructor_performance"
    INSTITUTIONAL_METRICS = "institutional_metrics"


class MetricPeriod(Enum):
    """فترات الحساب"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    SEMESTER = "semester"
    ANNUAL = "annual"


# ==================== محرك التحليلات ====================

class AdvancedAnalytics:
    """محرك التحليلات المتقدم"""
    
    def __init__(self):
        self.cache = {}
        self.metrics_history = defaultdict(list)
    
    # ==================== تحليل الطلاب ====================
    
    def analyze_student_performance(self, student_id: str, 
                                    courses: List[Dict]) -> Dict[str, Any]:
        """تحليل شامل لأداء الطالب"""
        
        if not courses:
            return {'error': 'لا توجد بيانات'}
        
        # حساب المؤشرات الأساسية
        grades = [c['totalScore'] for c in courses]
        credits = [c['credits'] for c in courses]
        
        analysis = {
            'student_id': student_id,
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_courses': len(courses),
                'current_gpa': self._calculate_gpa(grades, credits),
                'average_score': statistics.mean(grades),
                'median_score': statistics.median(grades),
                'std_deviation': statistics.stdev(grades) if len(grades) > 1 else 0,
                'highest_score': max(grades),
                'lowest_score': min(grades),
                'grade_range': max(grades) - min(grades)
            },
            'grade_distribution': self._get_grade_distribution(grades),
            'trends': self._calculate_trends(courses),
            'strengths': self._identify_strengths(courses),
            'weaknesses': self._identify_weaknesses(courses),
            'recommendations': self._generate_recommendations(courses),
            'comparison_to_peers': self._compare_to_class_average(grades),
            'risk_assessment': self._assess_academic_risk(grades, courses)
        }
        
        logger.info(f"✅ تحليل الطالب {student_id} مكتمل")
        return analysis
    
    def _calculate_gpa(self, grades: List[float], 
                       credits: List[int]) -> float:
        """حساب المعدل التراكمي"""
        if not credits or sum(credits) == 0:
            return 0.0
        
        total_grade_points = sum(
            (grade / 25 * 4.0) * credit 
            for grade, credit in zip(grades, credits)
        )
        total_credits = sum(credits)
        
        return min(4.0, max(0.0, total_grade_points / total_credits))
    
    def _get_grade_distribution(self, grades: List[float]) -> Dict[str, int]:
        """توزيع الدرجات (A, B, C, D, F)"""
        distribution = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0}
        
        for grade in grades:
            if grade >= 90:
                distribution['A'] += 1
            elif grade >= 80:
                distribution['B'] += 1
            elif grade >= 70:
                distribution['C'] += 1
            elif grade >= 60:
                distribution['D'] += 1
            else:
                distribution['F'] += 1
        
        return distribution
    
    def _calculate_trends(self, courses: List[Dict]) -> Dict[str, Any]:
        """حساب الاتجاهات (صاعد/هابط)"""
        if len(courses) < 2:
            return {'status': 'غير كافي البيانات'}
        
        # ترتيب بحسب التاريخ
        sorted_courses = sorted(courses, key=lambda x: x.get('date', ''))
        scores = [c['totalScore'] for c in sorted_courses]
        
        # اتجاه بسيط
        trend_direction = "صاعد" if scores[-1] > scores[-2] else "هابط"
        trend_percent = abs(scores[-1] - scores[-2]) / scores[-2] * 100 if scores[-2] != 0 else 0
        
        return {
            'direction': trend_direction,
            'percent_change': round(trend_percent, 2),
            'recent_performance': scores[-3:] if len(scores) >= 3 else scores
        }
    
    def _identify_strengths(self, courses: List[Dict]) -> List[str]:
        """تحديد نقاط القوة"""
        strengths = []
        avg_score = statistics.mean(c['totalScore'] for c in courses)
        
        for course in courses:
            if course['totalScore'] > avg_score + 5:
                strengths.append(f"متفوق في {course.get('name', 'مقرر')}")
        
        return strengths if strengths else ["أداء متوازن"]
    
    def _identify_weaknesses(self, courses: List[Dict]) -> List[str]:
        """تحديد نقاط الضعف"""
        weaknesses = []
        avg_score = statistics.mean(c['totalScore'] for c in courses)
        
        for course in courses:
            if course['totalScore'] < avg_score - 5:
                weaknesses.append(f"يحتاج تحسين في {course.get('name', 'مقرر')}")
        
        return weaknesses
    
    def _generate_recommendations(self, courses: List[Dict]) -> List[str]:
        """توليد التوصيات"""
        recommendations = []
        avg_score = statistics.mean(c['totalScore'] for c in courses)
        
        if avg_score < 60:
            recommendations.append("🔴 توصية عاجلة: التقدم للدعم الأكاديمي")
        elif avg_score < 70:
            recommendations.append("🟠 التركيز على المقررات الضعيفة")
        elif avg_score < 80:
            recommendations.append("🟡 محاولة تحسين الأداء للوصول لـ 80+")
        else:
            recommendations.append("🟢 الاستمرار في الأداء الممتاز")
        
        return recommendations
    
    def _compare_to_class_average(self, student_grades: List[float]) -> Dict[str, Any]:
        """مقارنة مع متوسط الفصل"""
        class_average = statistics.mean(student_grades)  # محاكاة
        student_average = statistics.mean(student_grades)
        
        return {
            'student_average': round(student_average, 2),
            'class_average': round(class_average, 2),
            'percentile': 75,  # محاكاة
            'rank': '12/45'  # محاكاة
        }
    
    def _assess_academic_risk(self, grades: List[float], 
                              courses: List[Dict]) -> Dict[str, Any]:
        """تقييم المخاطر الأكاديمية"""
        avg = statistics.mean(grades)
        
        risk_level = "منخفضة"
        risk_score = 0
        risk_factors = []
        
        if avg < 60:
            risk_level = "عالية جداً"
            risk_score = 90
            risk_factors.append("معدل عام دون المستوى")
        elif avg < 70:
            risk_level = "متوسطة"
            risk_score = 50
            risk_factors.append("أداء يحتاج متابعة")
        elif any(g < 60 for g in grades):
            risk_level = "منخفضة"
            risk_score = 30
            risk_factors.append("درجات منخفضة في مقررات معينة")
        
        return {
            'level': risk_level,
            'score': risk_score,
            'factors': risk_factors,
            'recommended_action': 'جلسة استشارية' if risk_score > 50 else 'المتابعة العادية'
        }
    
    # ==================== تحليل المقررات ====================
    
    def analyze_course_performance(self, course_id: str, 
                                   students_data: List[Dict]) -> Dict[str, Any]:
        """تحليل شامل لأداء المقرر"""
        
        if not students_data:
            return {'error': 'لا توجد بيانات'}
        
        scores = [s['score'] for s in students_data]
        
        analysis = {
            'course_id': course_id,
            'total_students': len(students_data),
            'statistics': {
                'mean': round(statistics.mean(scores), 2),
                'median': statistics.median(scores),
                'std_dev': round(statistics.stdev(scores), 2) if len(scores) > 1 else 0,
                'min': min(scores),
                'max': max(scores)
            },
            'pass_rate': self._calculate_pass_rate(scores),
            'excellence_rate': self._calculate_excellence_rate(scores),
            'difficulty_index': self._calculate_difficulty_index(scores),
            'discrimination_index': self._calculate_discrimination_index(students_data),
            'grade_distribution': self._get_grade_distribution(scores),
            'problem_areas': self._identify_problem_areas(students_data),
            'recommendations': self._get_course_recommendations(scores)
        }
        
        logger.info(f"✅ تحليل المقرر {course_id} مكتمل")
        return analysis
    
    def _calculate_pass_rate(self, scores: List[float]) -> float:
        """نسبة النجاح (60+)"""
        if not scores:
            return 0.0
        return round((len([s for s in scores if s >= 60]) / len(scores)) * 100, 2)
    
    def _calculate_excellence_rate(self, scores: List[float]) -> float:
        """نسبة التفوق (90+)"""
        if not scores:
            return 0.0
        return round((len([s for s in scores if s >= 90]) / len(scores)) * 100, 2)
    
    def _calculate_difficulty_index(self, scores: List[float]) -> str:
        """مؤشر صعوبة المقرر"""
        avg = statistics.mean(scores)
        
        if avg >= 80:
            return "سهل جداً"
        elif avg >= 70:
            return "سهل"
        elif avg >= 60:
            return "متوسط"
        elif avg >= 50:
            return "صعب"
        else:
            return "صعب جداً"
    
    def _calculate_discrimination_index(self, students_data: List[Dict]) -> float:
        """مؤشر التمييز (قدرة المقرر على التفريق بين الطلاب)"""
        if not students_data:
            return 0.0
        
        scores = [s['score'] for s in students_data]
        return round(statistics.stdev(scores) if len(scores) > 1 else 0, 2)
    
    def _identify_problem_areas(self, students_data: List[Dict]) -> List[str]:
        """تحديد المناطق التي يواجه فيها الطلاب صعوبات"""
        problems = []
        scores = [s['score'] for s in students_data]
        
        if statistics.mean(scores) < 65:
            problems.append("محتوى المقرر قد يكون معقداً")
        
        if len([s for s in scores if s < 50]) > len(scores) * 0.3:
            problems.append("نسبة عالية من الطلاب الضعفاء")
        
        return problems if problems else ["المقرر يحقق الأهداف"]
    
    def _get_course_recommendations(self, scores: List[float]) -> List[str]:
        """توصيات لتحسين المقرر"""
        recommendations = []
        avg = statistics.mean(scores)
        
        if avg < 65:
            recommendations.append("إعادة تقييم محتوى المقرر")
            recommendations.append("توفير دعم إضافي للطلاب")
        
        if len([s for s in scores if s >= 80]) < len(scores) * 0.3:
            recommendations.append("تقليل مستوى الصعوبة أو زيادة الدعم")
        
        return recommendations
    
    # ==================== تحليل الحضور ====================
    
    def analyze_attendance_trends(self, attendance_data: List[Dict]) -> Dict[str, Any]:
        """تحليل اتجاهات الحضور"""
        
        if not attendance_data:
            return {'error': 'لا توجد بيانات'}
        
        present_count = len([a for a in attendance_data if a['status'] == 'present'])
        absent_count = len([a for a in attendance_data if a['status'] == 'absent'])
        late_count = len([a for a in attendance_data if a['status'] == 'late'])
        total = len(attendance_data)
        
        analysis = {
            'total_sessions': total,
            'attendance_rate': round((present_count / total) * 100, 2),
            'absence_rate': round((absent_count / total) * 100, 2),
            'lateness_rate': round((late_count / total) * 100, 2),
            'trend': self._detect_attendance_trend(attendance_data),
            'risk_students': self._identify_at_risk_students(attendance_data),
            'pattern_analysis': self._analyze_absence_patterns(attendance_data),
            'predictions': self._predict_attendance_impact(present_count, absent_count)
        }
        
        logger.info(f"✅ تحليل الحضور مكتمل")
        return analysis
    
    def _detect_attendance_trend(self, attendance_data: List[Dict]) -> str:
        """كشف اتجاه الحضور (صاعد/هابط)"""
        # محاكاة الاتجاه
        return "محسّن" if len(attendance_data) > 10 else "محتاج متابعة"
    
    def _identify_at_risk_students(self, attendance_data: List[Dict]) -> List[str]:
        """تحديد الطلاب المعرضين للخطر"""
        # محاكاة
        return ["STU001 (70% الحضور)", "STU015 (60% الحضور)"]
    
    def _analyze_absence_patterns(self, attendance_data: List[Dict]) -> Dict[str, int]:
        """تحليل أنماط الغياب"""
        days = defaultdict(int)
        
        for record in attendance_data:
            if record.get('status') == 'absent':
                day = record.get('day', 'unknown')
                days[day] += 1
        
        return dict(days) if days else {"لا توجد أنماط": 0}
    
    def _predict_attendance_impact(self, present: int, 
                                   absent: int) -> Dict[str, Any]:
        """التنبؤ بتأثير الحضور على الدرجات"""
        attendance_rate = present / (present + absent) * 100 if (present + absent) > 0 else 0
        
        impact = {
            'estimated_grade_impact': '-5 درجات' if attendance_rate < 75 else 'محايد',
            'risk_of_failure': 'مرتفع' if attendance_rate < 60 else 'منخفض'
        }
        
        return impact


# ==================== مولد التقارير ====================

class ReportGenerator:
    """مولد التقارير الاحترافي"""
    
    def __init__(self):
        self.analytics = AdvancedAnalytics()
    
    def generate_comprehensive_report(self, report_type: ReportType,
                                     data: Dict, 
                                     period: MetricPeriod) -> Dict[str, Any]:
        """توليد تقرير شامل"""
        
        report = {
            'type': report_type.value,
            'period': period.value,
            'generated_at': datetime.now().isoformat(),
            'data': data,
            'summary': self._generate_summary(report_type, data),
            'visualizations': self._prepare_visualization_data(report_type, data),
            'export_formats': ['PDF', 'Excel', 'CSV', 'JSON']
        }
        
        logger.info(f"✅ تقرير {report_type.value} تم توليده")
        return report
    
    def _generate_summary(self, report_type: ReportType, 
                         data: Dict) -> str:
        """توليد ملخص التقرير"""
        
        if report_type == ReportType.STUDENT_PERFORMANCE:
            return f"أداء الطالب: {data.get('summary', {}).get('current_gpa', 0)} GPA"
        
        elif report_type == ReportType.COURSE_ANALYTICS:
            return f"متوسط المقرر: {data.get('statistics', {}).get('mean', 0)}"
        
        return "تقرير شامل"
    
    def _prepare_visualization_data(self, report_type: ReportType,
                                    data: Dict) -> Dict[str, Any]:
        """تحضير البيانات للرسوم البيانية"""
        
        return {
            'type': 'bar' if report_type == ReportType.GRADE_DISTRIBUTION else 'line',
            'data': [{'name': 'البيانات', 'values': list(str(data).values())[:10]}],
            'options': {'responsive': True, 'legend': {'display': True}}
        }
    
    def export_report(self, report: Dict, format: str) -> str:
        """تصدير التقرير بصيغة معينة"""
        
        if format == 'JSON':
            return json.dumps(report, ensure_ascii=False, indent=2)
        
        elif format == 'CSV':
            # محاكاة تصدير CSV
            return "student_id,gpa,attendance,status\nSTU001,3.75,95%,ممتاز\n"
        
        elif format == 'PDF':
            return f"[PDF Report Binary Content]"
        
        return json.dumps(report)


# ==================== مثال الاستخدام ====================

def demo_advanced_analytics():
    """عرض توضيحي للنظام"""
    
    # إنشاء محرك التحليلات
    analytics = AdvancedAnalytics()
    report_gen = ReportGenerator()
    
    # بيانات تجريبية
    student_courses = [
        {'totalScore': 85, 'credits': 3, 'name': 'البرمجة'},
        {'totalScore': 92, 'credits': 3, 'name': 'الخوارزميات'},
        {'totalScore': 78, 'credits': 4, 'name': 'قواعد البيانات'},
    ]
    
    # تحليل الطالب
    student_analysis = analytics.analyze_student_performance('STU001', student_courses)
    print("📊 تحليل الطالب:")
    print(json.dumps(student_analysis, ensure_ascii=False, indent=2))
    
    # توليد التقرير
    report = report_gen.generate_comprehensive_report(
        ReportType.STUDENT_PERFORMANCE,
        student_analysis,
        MetricPeriod.SEMESTER
    )
    
    print("\n📄 التقرير:")
    print(json.dumps(report, ensure_ascii=False, indent=2)[:500] + "...")
    
    # التصدير
    csv_export = report_gen.export_report(report, 'CSV')
    print("\n📥 التصدير CSV:")
    print(csv_export)


if __name__ == '__main__':
    demo_advanced_analytics()
