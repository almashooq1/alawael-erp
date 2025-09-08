# -*- coding: utf-8 -*-
"""
نظام حساب الدرجات لمقياس السلوك التكيفي ABAS-3
Adaptive Behavior Assessment System - Third Edition Scoring System
"""

import math
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from models import (
    ABASAssessment, ABASScore, ABASResponse, ABASSkillArea, 
    ABASItem, ABASNorms, db
)


class ABASScoring:
    """فئة حساب درجات مقياس السلوك التكيفي"""
    
    # مجالات المهارات وتصنيفها
    SKILL_AREAS = {
        'conceptual': {
            'communication': 'COM',
            'functional_academics': 'FA', 
            'self_direction': 'SD'
        },
        'social': {
            'leisure': 'LE',
            'social': 'SO'
        },
        'practical': {
            'community_use': 'CU',
            'home_living': 'HL',
            'health_safety': 'HS',
            'self_care': 'SC',
            'motor': 'MO',  # للأطفال الصغار
            'work': 'WK'    # للمراهقين والبالغين
        }
    }
    
    # مستويات السلوك التكيفي
    ADAPTIVE_LEVELS = {
        (130, float('inf')): "متفوق جداً",
        (120, 129): "متفوق", 
        (110, 119): "فوق المتوسط",
        (90, 109): "متوسط",
        (80, 89): "أقل من المتوسط",
        (70, 79): "حدي",
        (55, 69): "منخفض بشكل معتدل",
        (40, 54): "منخفض بشكل شديد",
        (0, 39): "منخفض جداً"
    }
    
    # معايير التفسير الإكلينيكي
    CLINICAL_SIGNIFICANCE = {
        'very_high': (130, float('inf')),
        'high': (115, 129),
        'high_average': (110, 114),
        'average': (85, 109),
        'low_average': (80, 84),
        'low': (70, 79),
        'very_low': (0, 69)
    }
    
    def __init__(self, assessment_id: int):
        """تهيئة نظام الحساب للتقييم المحدد"""
        self.assessment = ABASAssessment.query.get(assessment_id)
        if not self.assessment:
            raise ValueError(f"Assessment with ID {assessment_id} not found")
        
        self.responses = ABASResponse.query.filter_by(assessment_id=assessment_id).all()
        self.age_at_assessment = self.assessment.age_at_assessment or 0
        self.form_type = self.assessment.form_type or 'Parent'
        
    def calculate_raw_scores(self) -> Dict[str, int]:
        """حساب الدرجات الخام لكل مجال مهارة"""
        raw_scores = {}
        
        # تجميع الاستجابات حسب مجال المهارة
        skill_area_responses = {}
        for response in self.responses:
            skill_area_code = response.item.skill_area.skill_area_code
            if skill_area_code not in skill_area_responses:
                skill_area_responses[skill_area_code] = []
            skill_area_responses[skill_area_code].append(response)
        
        # حساب الدرجة الخام لكل مجال
        for skill_code, responses in skill_area_responses.items():
            total_score = 0
            valid_responses = 0
            
            for response in responses:
                if response.response_value is not None and response.response_value != 1:  # استبعاد "لا أعرف"
                    total_score += response.response_value
                    valid_responses += 1
            
            # تطبيق معادلة التصحيح إذا كانت هناك استجابات مفقودة
            if valid_responses > 0:
                expected_items = len(responses)
                if valid_responses < expected_items:
                    # تعديل الدرجة بناءً على النسبة المئوية للاستجابات الصحيحة
                    adjustment_factor = expected_items / valid_responses
                    total_score = int(total_score * adjustment_factor)
                
                raw_scores[skill_code.lower()] = total_score
            else:
                raw_scores[skill_code.lower()] = 0
                
        return raw_scores
    
    def convert_to_scaled_scores(self, raw_scores: Dict[str, int]) -> Dict[str, int]:
        """تحويل الدرجات الخام إلى درجات معيارية"""
        scaled_scores = {}
        
        # الحصول على المعايير المناسبة للعمر والنوع
        norms = self._get_appropriate_norms()
        
        for skill_area, raw_score in raw_scores.items():
            # تطبيق معادلة التحويل المعياري
            # الدرجة المعيارية = 10 + (الدرجة الخام - المتوسط) / الانحراف المعياري * 3
            mean = getattr(norms, f'{skill_area}_mean', 10.0) if norms else 10.0
            sd = getattr(norms, f'{skill_area}_sd', 3.0) if norms else 3.0
            
            if sd > 0:
                scaled_score = 10 + ((raw_score - mean) / sd) * 3
                scaled_score = max(1, min(19, round(scaled_score)))  # تحديد النطاق 1-19
            else:
                scaled_score = 10
                
            scaled_scores[skill_area] = int(scaled_score)
            
        return scaled_scores
    
    def calculate_composite_scores(self, scaled_scores: Dict[str, int]) -> Dict[str, int]:
        """حساب درجات المجالات المركبة"""
        composite_scores = {}
        
        # حساب المجال المفاهيمي
        conceptual_skills = []
        for skill in self.SKILL_AREAS['conceptual'].keys():
            if skill in scaled_scores:
                conceptual_skills.append(scaled_scores[skill])
        
        if conceptual_skills:
            conceptual_sum = sum(conceptual_skills)
            composite_scores['conceptual_domain'] = self._convert_sum_to_standard_score(
                conceptual_sum, len(conceptual_skills), 'conceptual'
            )
        
        # حساب المجال الاجتماعي
        social_skills = []
        for skill in self.SKILL_AREAS['social'].keys():
            if skill in scaled_scores:
                social_skills.append(scaled_scores[skill])
                
        if social_skills:
            social_sum = sum(social_skills)
            composite_scores['social_domain'] = self._convert_sum_to_standard_score(
                social_sum, len(social_skills), 'social'
            )
        
        # حساب المجال العملي
        practical_skills = []
        for skill in self.SKILL_AREAS['practical'].keys():
            if skill in scaled_scores and self._is_skill_appropriate_for_age(skill):
                practical_skills.append(scaled_scores[skill])
                
        if practical_skills:
            practical_sum = sum(practical_skills)
            composite_scores['practical_domain'] = self._convert_sum_to_standard_score(
                practical_sum, len(practical_skills), 'practical'
            )
        
        return composite_scores
    
    def calculate_general_adaptive_composite(self, composite_scores: Dict[str, int]) -> int:
        """حساب المؤشر التكيفي العام (GAC)"""
        domain_scores = []
        
        for domain in ['conceptual_domain', 'social_domain', 'practical_domain']:
            if domain in composite_scores:
                domain_scores.append(composite_scores[domain])
        
        if len(domain_scores) >= 2:  # يتطلب على الأقل مجالين
            domain_sum = sum(domain_scores)
            # تحويل مجموع درجات المجالات إلى GAC
            gac = self._convert_domain_sum_to_gac(domain_sum, len(domain_scores))
            return max(40, min(160, gac))  # تحديد النطاق
        
        return 100  # القيمة الافتراضية
    
    def calculate_percentiles(self, standard_scores: Dict[str, int]) -> Dict[str, float]:
        """حساب الرتب المئوية"""
        percentiles = {}
        
        for score_type, score in standard_scores.items():
            if score:
                # تحويل الدرجة المعيارية إلى رتبة مئوية
                z_score = (score - 100) / 15
                percentile = self._z_to_percentile(z_score)
                percentiles[f'{score_type}_percentile'] = round(percentile, 1)
        
        return percentiles
    
    def calculate_confidence_intervals(self, gac_score: int) -> Dict[str, int]:
        """حساب فترات الثقة للمؤشر التكيفي العام"""
        # معامل الثبات المقدر لـ ABAS-3
        reliability = 0.95
        sem = 15 * math.sqrt(1 - reliability)  # خطأ القياس المعياري
        
        # فترة الثقة 90%
        ci_90_margin = 1.645 * sem
        ci_90_lower = max(40, int(gac_score - ci_90_margin))
        ci_90_upper = min(160, int(gac_score + ci_90_margin))
        
        # فترة الثقة 95%
        ci_95_margin = 1.96 * sem
        ci_95_lower = max(40, int(gac_score - ci_95_margin))
        ci_95_upper = min(160, int(gac_score + ci_95_margin))
        
        return {
            'gac_confidence_90_lower': ci_90_lower,
            'gac_confidence_90_upper': ci_90_upper,
            'gac_confidence_95_lower': ci_95_lower,
            'gac_confidence_95_upper': ci_95_upper
        }
    
    def get_adaptive_level_classification(self, gac_score: int) -> str:
        """تحديد تصنيف مستوى السلوك التكيفي"""
        for (min_score, max_score), classification in self.ADAPTIVE_LEVELS.items():
            if min_score <= gac_score <= max_score:
                return classification
        return "غير محدد"
    
    def generate_clinical_interpretation(self, scores: Dict) -> Dict[str, str]:
        """توليد التفسير الإكلينيكي"""
        gac = scores.get('general_adaptive_composite', 100)
        conceptual = scores.get('conceptual_domain_standard', 100)
        social = scores.get('social_domain_standard', 100)
        practical = scores.get('practical_domain_standard', 100)
        
        interpretation = {
            'overall_functioning': self._interpret_overall_functioning(gac),
            'domain_analysis': self._analyze_domain_differences(conceptual, social, practical),
            'strengths_areas': self._identify_strengths(scores),
            'deficit_areas': self._identify_deficits(scores),
            'clinical_significance': self._assess_clinical_significance(gac),
            'recommendations': self._generate_recommendations(scores)
        }
        
        return interpretation
    
    def calculate_complete_scores(self) -> ABASScore:
        """حساب جميع الدرجات وإنشاء سجل النتائج"""
        # حساب الدرجات الخام
        raw_scores = self.calculate_raw_scores()
        
        # تحويل إلى درجات معيارية
        scaled_scores = self.convert_to_scaled_scores(raw_scores)
        
        # حساب درجات المجالات المركبة
        composite_scores = self.calculate_composite_scores(scaled_scores)
        
        # حساب المؤشر التكيفي العام
        gac = self.calculate_general_adaptive_composite(composite_scores)
        
        # حساب الرتب المئوية
        all_scores = {**composite_scores, 'general_adaptive_composite': gac}
        percentiles = self.calculate_percentiles(all_scores)
        
        # حساب فترات الثقة
        confidence_intervals = self.calculate_confidence_intervals(gac)
        
        # تحديد التصنيف
        classification = self.get_adaptive_level_classification(gac)
        
        # إنشاء أو تحديث سجل الدرجات
        score_record = ABASScore.query.filter_by(assessment_id=self.assessment.id).first()
        if not score_record:
            score_record = ABASScore(assessment_id=self.assessment.id)
            db.session.add(score_record)
        
        # تحديث الدرجات الخام
        for skill, score in raw_scores.items():
            setattr(score_record, f'{skill}_raw', score)
        
        # تحديث الدرجات المعيارية
        for skill, score in scaled_scores.items():
            setattr(score_record, f'{skill}_scaled', score)
        
        # تحديث درجات المجالات
        score_record.conceptual_domain_standard = composite_scores.get('conceptual_domain')
        score_record.social_domain_standard = composite_scores.get('social_domain')
        score_record.practical_domain_standard = composite_scores.get('practical_domain')
        
        # تحديث المؤشر العام
        score_record.general_adaptive_composite = gac
        
        # تحديث الرتب المئوية
        for percentile_key, percentile_value in percentiles.items():
            setattr(score_record, percentile_key, percentile_value)
        
        # تحديث فترات الثقة
        for ci_key, ci_value in confidence_intervals.items():
            setattr(score_record, ci_key, ci_value)
        
        # تحديث التصنيف
        score_record.adaptive_level_classification = classification
        
        # حفظ التغييرات
        db.session.commit()
        
        return score_record
    
    def _get_appropriate_norms(self) -> Optional[ABASNorms]:
        """الحصول على المعايير المناسبة للعمر والنوع"""
        age_group = self._determine_age_group(self.age_at_assessment)
        gender = self.assessment.gender or 'combined'
        
        norms = ABASNorms.query.filter_by(
            age_group=age_group,
            gender=gender,
            form_type=self.form_type
        ).first()
        
        if not norms:
            # البحث عن معايير مجمعة إذا لم توجد معايير محددة للجنس
            norms = ABASNorms.query.filter_by(
                age_group=age_group,
                gender='combined',
                form_type=self.form_type
            ).first()
        
        return norms
    
    def _determine_age_group(self, age: float) -> str:
        """تحديد المجموعة العمرية"""
        if age < 1:
            return "0:0-0:11"
        elif age < 2:
            return "1:0-1:11"
        elif age < 3:
            return "2:0-2:11"
        elif age < 4:
            return "3:0-3:11"
        elif age < 5:
            return "4:0-4:11"
        elif age < 6:
            return "5:0-5:11"
        elif age < 12:
            return "6:0-11:11"
        elif age < 18:
            return "12:0-17:11"
        elif age < 22:
            return "18:0-21:11"
        else:
            return "22:0+"
    
    def _convert_sum_to_standard_score(self, sum_score: int, num_subtests: int, domain: str) -> int:
        """تحويل مجموع الدرجات المعيارية إلى درجة معيارية مركبة"""
        expected_mean = num_subtests * 10
        expected_sd = num_subtests * 3 * math.sqrt(num_subtests) / num_subtests
        
        standard_score = 100 + ((sum_score - expected_mean) / expected_sd) * 15
        return max(40, min(160, int(round(standard_score))))
    
    def _convert_domain_sum_to_gac(self, domain_sum: int, num_domains: int) -> int:
        """تحويل مجموع درجات المجالات إلى المؤشر التكيفي العام"""
        expected_mean = num_domains * 100
        expected_sd = num_domains * 15 * math.sqrt(0.8)  # تقدير الارتباط بين المجالات
        
        gac = 100 + ((domain_sum - expected_mean) / expected_sd) * 15
        return int(round(gac))
    
    def _is_skill_appropriate_for_age(self, skill: str) -> bool:
        """تحديد ما إذا كانت المهارة مناسبة للعمر"""
        if skill == 'motor' and self.age_at_assessment > 5:
            return False
        if skill == 'work' and self.age_at_assessment < 16:
            return False
        return True
    
    def _z_to_percentile(self, z_score: float) -> float:
        """تحويل الدرجة المعيارية إلى رتبة مئوية"""
        # تقريب باستخدام دالة التوزيع التراكمي العادي
        return 50 * (1 + math.erf(z_score / math.sqrt(2))) * 100 / 100
    
    def _interpret_overall_functioning(self, gac: int) -> str:
        """تفسير الأداء العام"""
        classification = self.get_adaptive_level_classification(gac)
        
        if gac >= 130:
            return f"يُظهر الطالب سلوكاً تكيفياً {classification} يفوق بشكل كبير المتوقع لعمره الزمني."
        elif gac >= 115:
            return f"يُظهر الطالب سلوكاً تكيفياً {classification} أعلى من المتوسط لعمره الزمني."
        elif gac >= 85:
            return f"يُظهر الطالب سلوكاً تكيفياً {classification} ضمن النطاق المتوقع لعمره الزمني."
        elif gac >= 70:
            return f"يُظهر الطالب سلوكاً تكيفياً {classification} أقل من المتوقع لعمره الزمني."
        else:
            return f"يُظهر الطالب سلوكاً تكيفياً {classification} أقل بشكل كبير من المتوقع لعمره الزمني."
    
    def _analyze_domain_differences(self, conceptual: int, social: int, practical: int) -> str:
        """تحليل الفروق بين المجالات"""
        scores = [s for s in [conceptual, social, practical] if s is not None]
        if len(scores) < 2:
            return "لا توجد بيانات كافية لتحليل الفروق بين المجالات."
        
        max_score = max(scores)
        min_score = min(scores)
        difference = max_score - min_score
        
        if difference <= 12:
            return "تُظهر درجات المجالات الثلاثة تجانساً واتساقاً في الأداء."
        elif difference <= 23:
            return "توجد فروق معتدلة بين المجالات تستحق الملاحظة والمتابعة."
        else:
            return "توجد فروق كبيرة وذات دلالة إحصائية بين المجالات تتطلب تحليلاً إضافياً."
    
    def _identify_strengths(self, scores: Dict) -> str:
        """تحديد مجالات القوة"""
        strengths = []
        
        if scores.get('conceptual_domain_standard', 0) >= 110:
            strengths.append("المهارات المفاهيمية (التواصل والأكاديميات الوظيفية)")
        if scores.get('social_domain_standard', 0) >= 110:
            strengths.append("المهارات الاجتماعية والترفيهية")
        if scores.get('practical_domain_standard', 0) >= 110:
            strengths.append("المهارات العملية والحياة اليومية")
        
        if strengths:
            return "؛ ".join(strengths)
        else:
            return "لم تُحدد مجالات قوة واضحة في هذا التقييم"
    
    def _identify_deficits(self, scores: Dict) -> str:
        """تحديد مجالات الضعف"""
        deficits = []
        
        if scores.get('conceptual_domain_standard', 100) <= 80:
            deficits.append("المهارات المفاهيمية تحتاج إلى دعم إضافي")
        if scores.get('social_domain_standard', 100) <= 80:
            deficits.append("المهارات الاجتماعية تتطلب تدخلاً مستهدفاً")
        if scores.get('practical_domain_standard', 100) <= 80:
            deficits.append("المهارات العملية تحتاج إلى تدريب مكثف")
        
        if deficits:
            return "؛ ".join(deficits)
        else:
            return "لم تُحدد مجالات ضعف واضحة تتطلب تدخلاً فورياً"
    
    def _assess_clinical_significance(self, gac: int) -> str:
        """تقييم الأهمية الإكلينيكية"""
        if gac <= 70:
            return "النتائج ذات دلالة إكلينيكية عالية وتتطلب خدمات تأهيلية شاملة"
        elif gac <= 85:
            return "النتائج تشير إلى حاجة للمتابعة والدعم التعليمي المتخصص"
        else:
            return "النتائج ضمن النطاق الطبيعي ولا تتطلب تدخلاً إكلينيكياً"
    
    def _generate_recommendations(self, scores: Dict) -> str:
        """توليد التوصيات"""
        gac = scores.get('general_adaptive_composite', 100)
        recommendations = []
        
        if gac <= 70:
            recommendations.extend([
                "وضع برنامج تأهيلي فردي شامل",
                "تدريب الأسرة على استراتيجيات الدعم المنزلي",
                "التقييم الدوري كل 6 أشهر لمتابعة التقدم"
            ])
        elif gac <= 85:
            recommendations.extend([
                "تطوير خطة تعليمية فردية مع تعديلات مناسبة",
                "توفير الدعم الإضافي في المجالات الضعيفة",
                "التقييم السنوي لمراجعة الخطة"
            ])
        else:
            recommendations.extend([
                "المتابعة الروتينية حسب الحاجة",
                "تعزيز نقاط القوة المحددة",
                "دعم الانتقال للمراحل التطويرية التالية"
            ])
        
        return "؛ ".join(recommendations)


def calculate_abas_scores(assessment_id: int) -> Dict:
    """دالة مساعدة لحساب درجات ABAS"""
    try:
        scorer = ABASScoring(assessment_id)
        score_record = scorer.calculate_complete_scores()
        
        # توليد التفسير الإكلينيكي
        scores_dict = {
            'general_adaptive_composite': score_record.general_adaptive_composite,
            'conceptual_domain_standard': score_record.conceptual_domain_standard,
            'social_domain_standard': score_record.social_domain_standard,
            'practical_domain_standard': score_record.practical_domain_standard
        }
        
        clinical_interpretation = scorer.generate_clinical_interpretation(scores_dict)
        
        # تحديث التقييم بالنتائج
        assessment = ABASAssessment.query.get(assessment_id)
        assessment.general_adaptive_composite = score_record.general_adaptive_composite
        assessment.conceptual_domain_score = score_record.conceptual_domain_standard
        assessment.social_domain_score = score_record.social_domain_standard
        assessment.practical_domain_score = score_record.practical_domain_standard
        assessment.adaptive_level = score_record.adaptive_level_classification
        assessment.clinical_interpretation = clinical_interpretation['overall_functioning']
        assessment.strengths_areas = clinical_interpretation['strengths_areas']
        assessment.deficit_areas = clinical_interpretation['deficit_areas']
        assessment.recommendations = clinical_interpretation['recommendations']
        
        db.session.commit()
        
        return {
            'success': True,
            'scores': score_record,
            'interpretation': clinical_interpretation,
            'message': 'تم حساب درجات مقياس السلوك التكيفي بنجاح'
        }
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e),
            'message': 'حدث خطأ أثناء حساب الدرجات'
        }
