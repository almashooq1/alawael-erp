# -*- coding: utf-8 -*-
"""
نظام حساب الدرجات لمقياس بيركس لتقييم السلوك (BBRS-2)
Burks Behavior Rating Scales Scoring System
"""

import logging
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from models import db, BurksAssessment, BurksItemResponse, BurksScale, BurksItem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BurksScoring:
    """فئة حساب درجات مقياس بيركس"""
    
    def __init__(self):
        # البيانات المعيارية للمقاييس الفرعية
        self.normative_data = {
            'disruptive_behavior': {'mean': 50.0, 'sd': 10.0},
            'impulse_control': {'mean': 50.0, 'sd': 10.0},
            'attention_problems': {'mean': 50.0, 'sd': 10.0},
            'academic_performance': {'mean': 50.0, 'sd': 10.0},
            'social_withdrawal': {'mean': 50.0, 'sd': 10.0},
            'poor_anger_control': {'mean': 50.0, 'sd': 10.0},
            'aggressive_behavior': {'mean': 50.0, 'sd': 10.0},
            'peer_relations': {'mean': 50.0, 'sd': 10.0},
            'self_concept': {'mean': 50.0, 'sd': 10.0},
            'anxiety': {'mean': 50.0, 'sd': 10.0},
            'depression': {'mean': 50.0, 'sd': 10.0},
            'sense_of_inadequacy': {'mean': 50.0, 'sd': 10.0}
        }
        
        # مستويات الخطر
        self.risk_levels = {
            'low': {'min': 30, 'max': 59, 'description': 'منخفض'},
            'moderate': {'min': 60, 'max': 69, 'description': 'متوسط'},
            'high': {'min': 70, 'max': 79, 'description': 'مرتفع'},
            'very_high': {'min': 80, 'max': 100, 'description': 'مرتفع جداً'}
        }

    def calculate_raw_scores(self, assessment_id: int) -> Dict[str, int]:
        """حساب الدرجات الخام للمقاييس الفرعية"""
        try:
            responses = db.session.query(BurksItemResponse)\
                .join(BurksItem)\
                .join(BurksScale)\
                .filter(BurksItemResponse.assessment_id == assessment_id)\
                .all()
            
            scale_scores = {}
            for response in responses:
                scale_code = response.item.scale.scale_code.lower()
                if scale_code not in scale_scores:
                    scale_scores[scale_code] = 0
                
                score = response.response_value
                if response.item.reverse_scored:
                    score = 5 - score
                
                scale_scores[scale_code] += score
            
            return scale_scores
        except Exception as e:
            logger.error(f"خطأ في حساب الدرجات الخام: {str(e)}")
            raise

    def convert_to_t_scores(self, raw_scores: Dict[str, int], child_age_months: int) -> Dict[str, float]:
        """تحويل الدرجات الخام إلى T-Scores"""
        try:
            t_scores = {}
            for scale_name, raw_score in raw_scores.items():
                if scale_name in self.normative_data:
                    t_score = 50 + ((raw_score - 20) / 4) * 10
                    t_score = max(20, min(80, t_score))
                    t_scores[scale_name] = round(t_score, 1)
                else:
                    t_scores[scale_name] = 50.0
            return t_scores
        except Exception as e:
            logger.error(f"خطأ في تحويل T-Scores: {str(e)}")
            raise

    def calculate_composite_scores(self, t_scores: Dict[str, float]) -> Dict[str, float]:
        """حساب المؤشرات المركبة"""
        try:
            composites = {}
            
            # مؤشر المشاكل الخارجية
            ext_scales = ['disruptive_behavior', 'impulse_control', 'poor_anger_control', 'aggressive_behavior']
            ext_scores = [t_scores.get(scale, 50) for scale in ext_scales]
            composites['externalizing_problems'] = round(sum(ext_scores) / len(ext_scores), 1)
            
            # مؤشر المشاكل الداخلية
            int_scales = ['social_withdrawal', 'anxiety', 'depression', 'sense_of_inadequacy']
            int_scores = [t_scores.get(scale, 50) for scale in int_scales]
            composites['internalizing_problems'] = round(sum(int_scores) / len(int_scores), 1)
            
            # مؤشر المشاكل العام
            all_scores = list(t_scores.values())
            composites['overall_problem_index'] = round(sum(all_scores) / len(all_scores), 1)
            
            return composites
        except Exception as e:
            logger.error(f"خطأ في حساب المؤشرات المركبة: {str(e)}")
            raise

    def determine_risk_levels(self, t_scores: Dict[str, float]) -> Dict[str, str]:
        """تحديد مستويات الخطر لكل مقياس"""
        try:
            risk_levels = {}
            for scale_name, t_score in t_scores.items():
                for level, criteria in self.risk_levels.items():
                    if criteria['min'] <= t_score <= criteria['max']:
                        risk_levels[scale_name] = level
                        break
                else:
                    risk_levels[scale_name] = 'low'
            return risk_levels
        except Exception as e:
            logger.error(f"خطأ في تحديد مستويات الخطر: {str(e)}")
            raise

    def generate_clinical_interpretation(self, t_scores: Dict[str, float], 
                                       composites: Dict[str, float],
                                       risk_levels: Dict[str, str]) -> str:
        """توليد التفسير الإكلينيكي"""
        try:
            interpretation = []
            
            overall_score = composites.get('overall_problem_index', 50)
            if overall_score >= 70:
                interpretation.append("تشير النتائج إلى وجود مستوى مرتفع من المشاكل السلوكية والعاطفية.")
            elif overall_score >= 60:
                interpretation.append("تشير النتائج إلى وجود مستوى متوسط من المشاكل السلوكية والعاطفية.")
            else:
                interpretation.append("تشير النتائج إلى مستوى منخفض من المشاكل السلوكية والعاطفية.")
            
            # تحليل المشاكل الخارجية والداخلية
            ext_score = composites.get('externalizing_problems', 50)
            if ext_score >= 65:
                interpretation.append("يظهر الطفل مستوى مرتفع من المشاكل السلوكية الخارجية.")
            
            int_score = composites.get('internalizing_problems', 50)
            if int_score >= 65:
                interpretation.append("يظهر الطفل مستوى مرتفع من المشاكل العاطفية الداخلية.")
            
            return '\n\n'.join(interpretation)
        except Exception as e:
            logger.error(f"خطأ في توليد التفسير الإكلينيكي: {str(e)}")
            return "لم يتمكن من توليد التفسير الإكلينيكي."

    def save_results_to_database(self, assessment_id: int, raw_scores: Dict[str, int],
                                t_scores: Dict[str, float], composites: Dict[str, float],
                                risk_levels: Dict[str, str], interpretation: str) -> bool:
        """حفظ النتائج في قاعدة البيانات"""
        try:
            assessment = BurksAssessment.query.get(assessment_id)
            if not assessment:
                raise ValueError(f"التقييم {assessment_id} غير موجود")
            
            # حفظ الدرجات الخام
            assessment.disruptive_behavior_raw = raw_scores.get('disruptive_behavior', 0)
            assessment.impulse_control_raw = raw_scores.get('impulse_control', 0)
            assessment.attention_problems_raw = raw_scores.get('attention_problems', 0)
            assessment.academic_performance_raw = raw_scores.get('academic_performance', 0)
            assessment.social_withdrawal_raw = raw_scores.get('social_withdrawal', 0)
            assessment.poor_anger_control_raw = raw_scores.get('poor_anger_control', 0)
            assessment.aggressive_behavior_raw = raw_scores.get('aggressive_behavior', 0)
            assessment.peer_relations_raw = raw_scores.get('peer_relations', 0)
            assessment.self_concept_raw = raw_scores.get('self_concept', 0)
            assessment.anxiety_raw = raw_scores.get('anxiety', 0)
            assessment.depression_raw = raw_scores.get('depression', 0)
            assessment.sense_of_inadequacy_raw = raw_scores.get('sense_of_inadequacy', 0)
            
            # حفظ T-Scores
            assessment.disruptive_behavior_t = t_scores.get('disruptive_behavior', 50.0)
            assessment.impulse_control_t = t_scores.get('impulse_control', 50.0)
            assessment.attention_problems_t = t_scores.get('attention_problems', 50.0)
            assessment.academic_performance_t = t_scores.get('academic_performance', 50.0)
            assessment.social_withdrawal_t = t_scores.get('social_withdrawal', 50.0)
            assessment.poor_anger_control_t = t_scores.get('poor_anger_control', 50.0)
            assessment.aggressive_behavior_t = t_scores.get('aggressive_behavior', 50.0)
            assessment.peer_relations_t = t_scores.get('peer_relations', 50.0)
            assessment.self_concept_t = t_scores.get('self_concept', 50.0)
            assessment.anxiety_t = t_scores.get('anxiety', 50.0)
            assessment.depression_t = t_scores.get('depression', 50.0)
            assessment.sense_of_inadequacy_t = t_scores.get('sense_of_inadequacy', 50.0)
            
            # حفظ المؤشرات المركبة
            assessment.externalizing_problems_composite = composites.get('externalizing_problems', 50.0)
            assessment.internalizing_problems_composite = composites.get('internalizing_problems', 50.0)
            assessment.overall_problem_index = composites.get('overall_problem_index', 50.0)
            
            # حفظ مستويات الخطر
            assessment.disruptive_behavior_risk = risk_levels.get('disruptive_behavior', 'low')
            assessment.impulse_control_risk = risk_levels.get('impulse_control', 'low')
            assessment.attention_problems_risk = risk_levels.get('attention_problems', 'low')
            assessment.academic_performance_risk = risk_levels.get('academic_performance', 'low')
            assessment.social_withdrawal_risk = risk_levels.get('social_withdrawal', 'low')
            assessment.poor_anger_control_risk = risk_levels.get('poor_anger_control', 'low')
            assessment.aggressive_behavior_risk = risk_levels.get('aggressive_behavior', 'low')
            assessment.peer_relations_risk = risk_levels.get('peer_relations', 'low')
            assessment.self_concept_risk = risk_levels.get('self_concept', 'low')
            assessment.anxiety_risk = risk_levels.get('anxiety', 'low')
            assessment.depression_risk = risk_levels.get('depression', 'low')
            assessment.sense_of_inadequacy_risk = risk_levels.get('sense_of_inadequacy', 'low')
            
            # حفظ التفسير
            assessment.clinical_interpretation = interpretation
            assessment.status = 'completed'
            assessment.completed_at = datetime.utcnow()
            assessment.updated_at = datetime.utcnow()
            
            db.session.commit()
            return True
        except Exception as e:
            logger.error(f"خطأ في حفظ النتائج: {str(e)}")
            db.session.rollback()
            return False

    def calculate_full_assessment(self, assessment_id: int) -> Dict:
        """حساب التقييم الكامل لمقياس بيركس"""
        try:
            assessment = BurksAssessment.query.get(assessment_id)
            if not assessment:
                raise ValueError(f"التقييم {assessment_id} غير موجود")
            
            raw_scores = self.calculate_raw_scores(assessment_id)
            t_scores = self.convert_to_t_scores(raw_scores, assessment.child_age_months or 120)
            composites = self.calculate_composite_scores(t_scores)
            risk_levels = self.determine_risk_levels(t_scores)
            interpretation = self.generate_clinical_interpretation(t_scores, composites, risk_levels)
            
            success = self.save_results_to_database(
                assessment_id, raw_scores, t_scores, composites, 
                risk_levels, interpretation
            )
            
            if not success:
                raise Exception("فشل في حفظ النتائج")
            
            return {
                'assessment_id': assessment_id,
                'raw_scores': raw_scores,
                't_scores': t_scores,
                'composites': composites,
                'risk_levels': risk_levels,
                'interpretation': interpretation,
                'status': 'completed'
            }
        except Exception as e:
            logger.error(f"خطأ في حساب التقييم الكامل: {str(e)}")
            raise

def score_burks_assessment(assessment_id: int) -> Dict:
    """دالة رئيسية لحساب درجات مقياس بيركس"""
    scorer = BurksScoring()
    return scorer.calculate_full_assessment(assessment_id)
