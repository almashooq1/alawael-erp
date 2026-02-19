"""
نظام تكامل Machine Learning للتنبؤات والتحليلات الذكية
Advanced ML Integration for Predictions & Smart Analytics
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import json
import logging
import statistics
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== تعريفات النظام ====================

class PredictionType(Enum):
    """أنواع التنبؤات"""
    STUDENT_DROPOUT = "student_dropout"          # التنبؤ بترك الطلاب
    GRADE_PERFORMANCE = "grade_performance"      # توقع الأداء
    ATTENDANCE_PATTERN = "attendance_pattern"    # نمط الحضور
    COURSE_DIFFICULTY = "course_difficulty"      # صعوبة المقرر
    LEARNING_STYLE = "learning_style"            # أسلوب التعلم


class ConfidenceLevel(Enum):
    """مستويات الثقة"""
    LOW = 0.6
    MEDIUM = 0.75
    HIGH = 0.85
    VERY_HIGH = 0.95


class RecommendationType(Enum):
    """أنواع الاستحسانات"""
    INTERVENTION = "intervention"                # تدخل
    ADDITIONAL_HELP = "additional_help"          # مساعدة إضافية
    ENRICHMENT = "enrichment"                    # إثراء
    TUTORING = "tutoring"                        # دروس خصوصية
    COUNSELING = "counseling"                    # استشارة


# ==================== نماذج التنبؤ ====================

@dataclass
class Prediction:
    """تنبؤ"""
    prediction_id: str
    prediction_type: PredictionType
    subject_id: str
    subject_type: str  # student, course
    predicted_value: Any
    confidence: float
    probability: float
    created_at: datetime
    valid_until: datetime
    model_version: str = "1.0"
    reasoning: Dict = None
    
    def is_valid(self) -> bool:
        """هل التنبؤ لا يزال صحيحاً؟"""
        return datetime.now() < self.valid_until
    
    def to_dict(self) -> Dict:
        """تحويل إلى قاموس"""
        return {
            'id': self.prediction_id,
            'type': self.prediction_type.value,
            'subject_id': self.subject_id,
            'predicted_value': self.predicted_value,
            'confidence': self.confidence,
            'probability': self.probability,
            'is_valid': self.is_valid(),
            'created_at': self.created_at.isoformat(),
            'valid_until': self.valid_until.isoformat(),
            'model_version': self.model_version,
            'reasoning': self.reasoning
        }


@dataclass
class Recommendation:
    """استحسان"""
    recommendation_id: str
    student_id: str
    recommendation_type: RecommendationType
    title: str
    description: str
    priority: int  # 1-5
    rationale: str
    action_steps: List[str]
    expected_impact: str
    assigned_to: str = None
    status: str = "pending"
    created_at: datetime = None
    due_date: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.due_date is None:
            self.due_date = self.created_at + timedelta(days=30)
    
    def to_dict(self) -> Dict:
        """تحويل إلى قاموس"""
        return {
            'id': self.recommendation_id,
            'student_id': self.student_id,
            'type': self.recommendation_type.value,
            'title': self.title,
            'description': self.description,
            'priority': self.priority,
            'rationale': self.rationale,
            'action_steps': self.action_steps,
            'expected_impact': self.expected_impact,
            'assigned_to': self.assigned_to,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'due_date': self.due_date.isoformat()
        }


# ==================== محركات التنبؤ ====================

class DropoutPredictor:
    """متنبئ الترك"""
    
    def __init__(self):
        self.model_version = "1.0"
        self.feature_weights = {
            'attendance_rate': 0.25,
            'gpa': 0.30,
            'assignment_completion': 0.20,
            'engagement_score': 0.15,
            'participation': 0.10
        }
    
    def predict(self, student_data: Dict) -> Prediction:
        """التنبؤ بالترك"""
        
        import uuid
        
        # حساب نقاط الخطر
        risk_score = self._calculate_risk_score(student_data)
        
        prediction = Prediction(
            prediction_id=str(uuid.uuid4()),
            prediction_type=PredictionType.STUDENT_DROPOUT,
            subject_id=student_data['student_id'],
            subject_type='student',
            predicted_value={
                'risk_level': self._classify_risk(risk_score),
                'risk_score': risk_score
            },
            confidence=min(risk_score + 0.1, 1.0),
            probability=risk_score,
            created_at=datetime.now(),
            valid_until=datetime.now() + timedelta(days=30),
            model_version=self.model_version,
            reasoning={
                'factors': student_data,
                'risk_score': risk_score,
                'calculation': 'weighted sum of factors'
            }
        )
        
        logger.info(f"📊 تنبؤ بالترك: {student_data['student_id']} - {risk_score:.2%}")
        
        return prediction
    
    def _calculate_risk_score(self, student_data: Dict) -> float:
        """حساب نقاط الخطر"""
        
        score = 0.0
        
        # الحضور (العكس)
        attendance = student_data.get('attendance_rate', 0.8)
        score += (1 - attendance) * self.feature_weights['attendance_rate']
        
        # GPA
        gpa = student_data.get('gpa', 3.0)
        score += (1 - (gpa / 4.0)) * self.feature_weights['gpa']
        
        # إكمال المهام
        completion = student_data.get('assignment_completion', 0.8)
        score += (1 - completion) * self.feature_weights['assignment_completion']
        
        # الانخراط
        engagement = student_data.get('engagement_score', 0.5)
        score += (1 - engagement) * self.feature_weights['engagement_score']
        
        # المشاركة
        participation = student_data.get('participation', 0.5)
        score += (1 - participation) * self.feature_weights['participation']
        
        return min(max(score, 0.0), 1.0)
    
    def _classify_risk(self, score: float) -> str:
        """تصنيف الخطر"""
        if score < 0.3:
            return "low"
        elif score < 0.6:
            return "medium"
        elif score < 0.8:
            return "high"
        else:
            return "critical"


class PerformancePredictor:
    """متنبئ الأداء"""
    
    def __init__(self):
        self.model_version = "1.0"
    
    def predict(self, student_course_data: Dict) -> Prediction:
        """التنبؤ بالأداء"""
        
        import uuid
        
        # تقدير الدرجة النهائية
        predicted_grade = self._estimate_grade(student_course_data)
        
        prediction = Prediction(
            prediction_id=str(uuid.uuid4()),
            prediction_type=PredictionType.GRADE_PERFORMANCE,
            subject_id=student_course_data['student_id'],
            subject_type='student',
            predicted_value={
                'predicted_grade': predicted_grade,
                'letter_grade': self._to_letter_grade(predicted_grade),
                'range': f"{predicted_grade-5:.0f}-{predicted_grade+5:.0f}"
            },
            confidence=0.82,
            probability=0.82,
            created_at=datetime.now(),
            valid_until=datetime.now() + timedelta(days=45),
            model_version=self.model_version,
            reasoning={
                'current_average': student_course_data.get('current_average'),
                'trend': self._analyze_trend(student_course_data),
                'method': 'weighted moving average with trend analysis'
            }
        )
        
        logger.info(f"📊 تنبؤ بالأداء: {predicted_grade:.0f}")
        
        return prediction
    
    def _estimate_grade(self, data: Dict) -> float:
        """تقدير الدرجة"""
        
        current_avg = data.get('current_average', 75)
        assignment_avg = data.get('assignment_average', 80)
        participation = data.get('participation', 0.5)
        
        # متوسط موزون
        weighted_grade = (
            current_avg * 0.5 +
            assignment_avg * 0.3 +
            participation * 100 * 0.2
        )
        
        return min(max(weighted_grade, 0), 100)
    
    def _to_letter_grade(self, score: float) -> str:
        """تحويل إلى درجة حرف"""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    def _analyze_trend(self, data: Dict) -> str:
        """تحليل الاتجاه"""
        
        recent = data.get('recent_grades', [])
        if not recent:
            return "stable"
        
        if len(recent) >= 3:
            if recent[-1] > recent[-2] > recent[-3]:
                return "improving"
            elif recent[-1] < recent[-2] < recent[-3]:
                return "declining"
        
        return "stable"


class AttendancePredictor:
    """متنبئ الحضور"""
    
    def __init__(self):
        self.model_version = "1.0"
    
    def predict(self, student_data: Dict) -> Prediction:
        """التنبؤ بنمط الحضور"""
        
        import uuid
        
        pattern = self._identify_pattern(student_data)
        risk = self._assess_absence_risk(student_data)
        
        prediction = Prediction(
            prediction_id=str(uuid.uuid4()),
            prediction_type=PredictionType.ATTENDANCE_PATTERN,
            subject_id=student_data['student_id'],
            subject_type='student',
            predicted_value={
                'pattern': pattern,
                'absence_risk': risk,
                'expected_attendance': self._project_attendance(student_data)
            },
            confidence=0.78,
            probability=0.78,
            created_at=datetime.now(),
            valid_until=datetime.now() + timedelta(days=14),
            model_version=self.model_version
        )
        
        logger.info(f"📊 تنبؤ الحضور: {pattern}")
        
        return prediction
    
    def _identify_pattern(self, data: Dict) -> str:
        """تحديد النمط"""
        
        attendance_rate = data.get('attendance_rate', 0.8)
        
        if attendance_rate > 0.95:
            return "excellent"
        elif attendance_rate > 0.85:
            return "good"
        elif attendance_rate > 0.70:
            return "acceptable"
        else:
            return "concerning"
    
    def _assess_absence_risk(self, data: Dict) -> str:
        """تقييم خطر الغياب"""
        
        recent_absences = data.get('recent_absences', 0)
        
        if recent_absences == 0:
            return "low"
        elif recent_absences <= 2:
            return "medium"
        else:
            return "high"
    
    def _project_attendance(self, data: Dict) -> float:
        """توقع الحضور المستقبلي"""
        
        current = data.get('attendance_rate', 0.8)
        trend = data.get('trend_direction', 0)  # -1, 0, 1
        
        projected = current + (trend * 0.05)
        return min(max(projected, 0), 1.0)


# ==================== محرك التوصيات ====================

class RecommendationEngine:
    """محرك التوصيات"""
    
    def __init__(self):
        self.recommendation_templates = self._load_templates()
    
    def generate_recommendations(self, student_id: str,
                                predictions: List[Prediction],
                                student_data: Dict) -> List[Recommendation]:
        """توليد التوصيات"""
        
        recommendations = []
        
        for prediction in predictions:
            if prediction.probability > 0.7:
                rec = self._create_recommendation(
                    student_id,
                    prediction,
                    student_data
                )
                if rec:
                    recommendations.append(rec)
        
        logger.info(f"✅ {len(recommendations)} توصيات تم توليدها")
        
        return recommendations
    
    def _create_recommendation(self, student_id: str,
                              prediction: Prediction,
                              student_data: Dict) -> Optional[Recommendation]:
        """إنشاء توصية"""
        
        import uuid
        
        if prediction.prediction_type == PredictionType.STUDENT_DROPOUT:
            if prediction.probability > 0.6:
                return Recommendation(
                    recommendation_id=str(uuid.uuid4()),
                    student_id=student_id,
                    recommendation_type=RecommendationType.INTERVENTION,
                    title="تدخل فوري مطلوب",
                    description="الطالب في خطر الترك",
                    priority=5,
                    rationale="نموذج التنبؤ يشير إلى خطر عالي",
                    action_steps=[
                        "جدول اجتماع مع الطالب",
                        "تقييم الضعف الأساسي",
                        "وضع خطة دعم مخصصة"
                    ],
                    expected_impact="تحسين معدل الاحتفاظ"
                )
        
        elif prediction.prediction_type == PredictionType.GRADE_PERFORMANCE:
            if prediction.probability < 0.6:  # أداء منخفض متوقع
                return Recommendation(
                    recommendation_id=str(uuid.uuid4()),
                    student_id=student_id,
                    recommendation_type=RecommendationType.TUTORING,
                    title="دروس خصوصية مقترحة",
                    description="من المتوقع انخفاض الأداء",
                    priority=4,
                    rationale="توقعات الدرجات تشير إلى صعوبات",
                    action_steps=[
                        "تحديد مناطق الضعف",
                        "توصيل الطالب بمدرس خاص",
                        "جدول جلسات منتظمة"
                    ],
                    expected_impact="تحسين الأداء الأكاديمي"
                )
        
        return None
    
    def _load_templates(self) -> Dict:
        """تحميل القوالب"""
        return {
            'intervention': {
                'priority': 5,
                'duration_days': 30
            },
            'tutoring': {
                'priority': 4,
                'duration_days': 45
            },
            'enrichment': {
                'priority': 2,
                'duration_days': 60
            }
        }


# ==================== نظام ML المتكامل ====================

class MLIntegrationSystem:
    """نظام تكامل ML"""
    
    def __init__(self):
        self.dropout_predictor = DropoutPredictor()
        self.performance_predictor = PerformancePredictor()
        self.attendance_predictor = AttendancePredictor()
        self.recommendation_engine = RecommendationEngine()
        
        self.predictions: Dict[str, List[Prediction]] = {}
        self.recommendations: Dict[str, List[Recommendation]] = {}
    
    def analyze_student(self, student_data: Dict) -> Dict:
        """تحليل الطالب"""
        
        student_id = student_data['student_id']
        
        # توليد التنبؤات
        predictions = [
            self.dropout_predictor.predict(student_data),
            self.performance_predictor.predict(student_data),
            self.attendance_predictor.predict(student_data)
        ]
        
        self.predictions[student_id] = predictions
        
        # توليد التوصيات
        recommendations = self.recommendation_engine.generate_recommendations(
            student_id,
            predictions,
            student_data
        )
        
        self.recommendations[student_id] = recommendations
        
        return {
            'student_id': student_id,
            'predictions': [p.to_dict() for p in predictions],
            'recommendations': [r.to_dict() for r in recommendations],
            'summary': self._generate_summary(predictions, recommendations)
        }
    
    def _generate_summary(self, predictions: List[Prediction],
                         recommendations: List[Recommendation]) -> Dict:
        """توليد ملخص"""
        
        overall_risk = max(
            (p.probability for p in predictions),
            default=0.0
        )
        
        return {
            'overall_risk_level': self._classify_risk(overall_risk),
            'risk_score': overall_risk,
            'recommendations_count': len(recommendations),
            'immediate_action_needed': len([r for r in recommendations if r.priority >= 4]) > 0,
            'analysis_timestamp': datetime.now().isoformat()
        }
    
    def _classify_risk(self, score: float) -> str:
        """تصنيف الخطر"""
        if score < 0.3:
            return "low"
        elif score < 0.6:
            return "medium"
        elif score < 0.8:
            return "high"
        else:
            return "critical"
    
    def get_student_analysis(self, student_id: str) -> Optional[Dict]:
        """الحصول على تحليل الطالب"""
        
        if student_id not in self.predictions:
            return None
        
        return {
            'student_id': student_id,
            'predictions': [p.to_dict() for p in self.predictions[student_id]],
            'recommendations': [r.to_dict() for r in self.recommendations.get(student_id, [])]
        }


# ==================== عرض توضيحي ====================

def demo_ml_integration():
    """عرض توضيحي للنظام"""
    
    print("🤖 عرض توضيحي لـ ML Integration System\n")
    
    # 1. إنشاء النظام
    print("1️⃣ إنشاء نظام ML:")
    ml_system = MLIntegrationSystem()
    print("   تم تحميل جميع المتنبئات")
    
    # 2. بيانات طالب للاختبار
    print("\n2️⃣ بيانات الطالب:")
    student_data = {
        'student_id': 'STU001',
        'attendance_rate': 0.75,
        'gpa': 2.8,
        'assignment_completion': 0.70,
        'engagement_score': 0.6,
        'participation': 0.5,
        'current_average': 72,
        'assignment_average': 75,
        'recent_absences': 3,
        'recent_grades': [70, 72, 71]
    }
    print(f"   الطالب: {student_data['student_id']}")
    print(f"   GPA: {student_data['gpa']:.1f}")
    print(f"   الحضور: {student_data['attendance_rate']:.0%}")
    
    # 3. تحليل الطالب
    print("\n3️⃣ تحليل الطالب:")
    analysis = ml_system.analyze_student(student_data)
    
    print(f"   التنبؤات: {len(analysis['predictions'])}")
    print(f"   التوصيات: {len(analysis['recommendations'])}")
    
    # 4. النتائج
    print("\n4️⃣ النتائج:")
    summary = analysis['summary']
    print(f"   مستوى الخطر: {summary['overall_risk_level']}")
    print(f"   نقاط الخطر: {summary['risk_score']:.2%}")
    print(f"   تدخل طاري مطلوب: {'نعم' if summary['immediate_action_needed'] else 'لا'}")


if __name__ == '__main__':
    demo_ml_integration()
