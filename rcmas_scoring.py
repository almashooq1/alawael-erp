# -*- coding: utf-8 -*-
"""
نظام حساب الدرجات لمقياس القلق للأطفال RCMAS-2
Revised Children's Manifest Anxiety Scale - Second Edition Scoring System
"""

import math
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from models import (
    RCMASAssessment, RCMASScore, RCMASResponse, RCMASDomain, 
    RCMASItem, RCMASNorms, db
)


class RCMASScoring:
    """فئة حساب درجات مقياس القلق للأطفال"""
    
    # مجالات القلق الأساسية
    ANXIETY_DOMAINS = {
        'physiological': 'PHY',  # القلق الفسيولوجي
        'worry': 'WOR',          # القلق والهم
        'social': 'SOC',         # القلق الاجتماعي
        'defensiveness': 'DEF'   # الدفاعية
    }
    
    # مستويات القلق
    ANXIETY_LEVELS = {
        (70, float('inf')): "قلق مرتفع جداً",
        (65, 69): "قلق مرتفع",
        (60, 64): "قلق فوق المتوسط",
        (40, 59): "قلق متوسط",
        (35, 39): "قلق أقل من المتوسط",
        (30, 34): "قلق منخفض",
        (0, 29): "قلق منخفض جداً"
    }
    
    # معايير التفسير الإكلينيكي
    CLINICAL_CUTOFFS = {
        'very_high': 70,      # قلق مرتفع جداً - يتطلب تدخل فوري
        'high': 65,           # قلق مرتفع - يتطلب متابعة
        'elevated': 60,       # قلق فوق المتوسط - يحتاج مراقبة
        'average': 40,        # متوسط
        'low': 30             # منخفض
    }
    
    # مؤشرات الصدق
    VALIDITY_INDICATORS = {
        'defensiveness_high': 65,     # دفاعية مرتفعة
        'inconsistency_threshold': 3,  # عتبة عدم الاتساق
        'random_responding': 0.2      # الاستجابة العشوائية
    }
    
    def __init__(self, assessment_id: int):
        """تهيئة نظام الحساب للتقييم المحدد"""
        self.assessment = RCMASAssessment.query.get(assessment_id)
        if not self.assessment:
            raise ValueError(f"Assessment with ID {assessment_id} not found")
        
        self.responses = RCMASResponse.query.filter_by(assessment_id=assessment_id).all()
        self.age_at_assessment = self.assessment.age_at_assessment or 0
        self.gender = self.assessment.gender or 'combined'
        
    def calculate_raw_scores(self) -> Dict[str, int]:
        """حساب الدرجات الخام لكل مجال"""
        raw_scores = {}
        
        # تجميع الاستجابات حسب المجال
        domain_responses = {}
        for response in self.responses:
            domain_code = response.item.domain.domain_code
            if domain_code not in domain_responses:
                domain_responses[domain_code] = []
            domain_responses[domain_code].append(response)
        
        # حساب الدرجة الخام لكل مجال
        for domain_code, responses in domain_responses.items():
            total_score = 0
            valid_responses = 0
            
            for response in responses:
                if response.response_value is not None:
                    # في RCMAS، الإجابة "نعم" تحصل على نقطة واحدة للقلق
                    if response.response_value == 1:  # نعم
                        total_score += 1
                    valid_responses += 1
            
            # تطبيق تصحيح للاستجابات المفقودة إذا لزم الأمر
            if valid_responses > 0:
                expected_items = len(responses)
                if valid_responses < expected_items:
                    # تقدير الدرجة بناءً على النسبة المئوية للاستجابات
                    completion_rate = valid_responses / expected_items
                    if completion_rate >= 0.8:  # 80% على الأقل من البنود مكتملة
                        adjusted_score = int(total_score / completion_rate)
                        raw_scores[domain_code.lower()] = min(adjusted_score, expected_items)
                    else:
                        raw_scores[domain_code.lower()] = None  # بيانات غير كافية
                else:
                    raw_scores[domain_code.lower()] = total_score
            else:
                raw_scores[domain_code.lower()] = None
                
        return raw_scores
    
    def convert_to_t_scores(self, raw_scores: Dict[str, int]) -> Dict[str, int]:
        """تحويل الدرجات الخام إلى درجات T"""
        t_scores = {}
        
        # الحصول على المعايير المناسبة
        norms = self._get_appropriate_norms()
        
        for domain, raw_score in raw_scores.items():
            if raw_score is not None:
                # الحصول على المتوسط والانحراف المعياري للمجال
                mean = getattr(norms, f'{domain}_mean', 10.0) if norms else 10.0
                sd = getattr(norms, f'{domain}_sd', 3.0) if norms else 3.0
                
                if sd > 0:
                    # تحويل إلى درجة T (متوسط = 50، انحراف معياري = 10)
                    t_score = 50 + ((raw_score - mean) / sd) * 10
                    t_score = max(20, min(80, round(t_score)))  # تحديد النطاق
                else:
                    t_score = 50
                    
                t_scores[domain] = int(t_score)
            else:
                t_scores[domain] = None
                
        return t_scores
    
    def calculate_total_anxiety_score(self, t_scores: Dict[str, int]) -> int:
        """حساب درجة القلق الإجمالية"""
        anxiety_domains = ['phy', 'wor', 'soc']  # استبعاد الدفاعية
        valid_scores = []
        
        for domain in anxiety_domains:
            if domain in t_scores and t_scores[domain] is not None:
                valid_scores.append(t_scores[domain])
        
        if len(valid_scores) >= 2:  # يتطلب على الأقل مجالين
            # حساب المتوسط المرجح
            total_anxiety = sum(valid_scores) / len(valid_scores)
            return int(round(total_anxiety))
        
        return 50  # القيمة الافتراضية
    
    def assess_validity(self, raw_scores: Dict[str, int], responses: List) -> Dict[str, any]:
        """تقييم صحة الاستجابات"""
        validity_indicators = {}
        
        # 1. تقييم الدفاعية
        defensiveness_score = raw_scores.get('def', 0)
        if defensiveness_score is not None:
            if defensiveness_score >= self.VALIDITY_INDICATORS['defensiveness_high']:
                validity_indicators['defensiveness'] = 'high'
                validity_indicators['defensiveness_concern'] = True
            else:
                validity_indicators['defensiveness'] = 'acceptable'
                validity_indicators['defensiveness_concern'] = False
        
        # 2. تقييم الاتساق في الاستجابات
        inconsistency_count = self._calculate_inconsistency(responses)
        validity_indicators['inconsistency_count'] = inconsistency_count
        validity_indicators['inconsistency_concern'] = inconsistency_count > self.VALIDITY_INDICATORS['inconsistency_threshold']
        
        # 3. تقييم الاستجابة العشوائية
        random_pattern = self._detect_random_responding(responses)
        validity_indicators['random_responding'] = random_pattern
        validity_indicators['random_concern'] = random_pattern > self.VALIDITY_INDICATORS['random_responding']
        
        # 4. التقييم العام للصحة
        major_concerns = [
            validity_indicators.get('defensiveness_concern', False),
            validity_indicators.get('inconsistency_concern', False),
            validity_indicators.get('random_concern', False)
        ]
        
        if sum(major_concerns) >= 2:
            validity_indicators['overall_validity'] = 'questionable'
        elif sum(major_concerns) == 1:
            validity_indicators['overall_validity'] = 'caution'
        else:
            validity_indicators['overall_validity'] = 'acceptable'
        
        return validity_indicators
    
    def generate_clinical_interpretation(self, scores: Dict, validity: Dict) -> Dict[str, str]:
        """توليد التفسير الإكلينيكي"""
        total_anxiety = scores.get('total_anxiety_score', 50)
        
        interpretation = {
            'overall_anxiety_level': self._interpret_anxiety_level(total_anxiety),
            'domain_analysis': self._analyze_anxiety_domains(scores),
            'clinical_significance': self._assess_clinical_significance(total_anxiety),
            'validity_concerns': self._interpret_validity(validity),
            'risk_assessment': self._assess_anxiety_risk(scores),
            'recommendations': self._generate_recommendations(scores, validity)
        }
        
        return interpretation
    
    def calculate_percentiles(self, t_scores: Dict[str, int]) -> Dict[str, float]:
        """حساب الرتب المئوية"""
        percentiles = {}
        
        for domain, t_score in t_scores.items():
            if t_score is not None:
                # تحويل درجة T إلى رتبة مئوية
                z_score = (t_score - 50) / 10
                percentile = self._z_to_percentile(z_score)
                percentiles[f'{domain}_percentile'] = round(percentile, 1)
        
        return percentiles
    
    def calculate_complete_scores(self) -> RCMASScore:
        """حساب جميع الدرجات وإنشاء سجل النتائج"""
        # حساب الدرجات الخام
        raw_scores = self.calculate_raw_scores()
        
        # تحويل إلى درجات T
        t_scores = self.convert_to_t_scores(raw_scores)
        
        # حساب درجة القلق الإجمالية
        total_anxiety = self.calculate_total_anxiety_score(t_scores)
        
        # تقييم الصحة
        validity = self.assess_validity(raw_scores, self.responses)
        
        # حساب الرتب المئوية
        percentiles = self.calculate_percentiles(t_scores)
        
        # إنشاء أو تحديث سجل الدرجات
        score_record = RCMASScore.query.filter_by(assessment_id=self.assessment.id).first()
        if not score_record:
            score_record = RCMASScore(assessment_id=self.assessment.id)
            db.session.add(score_record)
        
        # تحديث الدرجات الخام
        score_record.physiological_raw_score = raw_scores.get('phy')
        score_record.worry_raw_score = raw_scores.get('wor')
        score_record.social_raw_score = raw_scores.get('soc')
        score_record.defensiveness_raw_score = raw_scores.get('def')
        
        # تحديث درجات T
        score_record.physiological_t_score = t_scores.get('phy')
        score_record.worry_t_score = t_scores.get('wor')
        score_record.social_t_score = t_scores.get('soc')
        score_record.defensiveness_t_score = t_scores.get('def')
        
        # تحديث الدرجة الإجمالية
        score_record.total_anxiety_score = total_anxiety
        
        # تحديث الرتب المئوية
        for percentile_key, percentile_value in percentiles.items():
            setattr(score_record, percentile_key, percentile_value)
        
        # تحديث مؤشرات الصحة
        score_record.defensiveness_level = validity.get('defensiveness', 'acceptable')
        score_record.response_consistency = validity.get('overall_validity', 'acceptable')
        score_record.validity_concerns = str(validity)
        
        # تحديد مستوى القلق
        score_record.anxiety_level_classification = self._get_anxiety_classification(total_anxiety)
        
        # حفظ التغييرات
        db.session.commit()
        
        return score_record
    
    def _get_appropriate_norms(self) -> Optional[RCMASNorms]:
        """الحصول على المعايير المناسبة للعمر والجنس"""
        age_group = self._determine_age_group(self.age_at_assessment)
        
        norms = RCMASNorms.query.filter_by(
            age_group=age_group,
            gender=self.gender
        ).first()
        
        if not norms:
            # البحث عن معايير مجمعة
            norms = RCMASNorms.query.filter_by(
                age_group=age_group,
                gender='combined'
            ).first()
        
        return norms
    
    def _determine_age_group(self, age: float) -> str:
        """تحديد المجموعة العمرية"""
        if age < 7:
            return "6-7"
        elif age < 9:
            return "8-9"
        elif age < 11:
            return "10-11"
        elif age < 13:
            return "12-13"
        elif age < 15:
            return "14-15"
        elif age < 17:
            return "16-17"
        else:
            return "18-19"
    
    def _calculate_inconsistency(self, responses: List) -> int:
        """حساب عدد الاستجابات غير المتسقة"""
        # هذه دالة مبسطة - في التطبيق الحقيقي ستحتاج لمقارنة البنود المتشابهة
        inconsistency_count = 0
        
        # مثال: مقارنة البنود المتشابهة في المعنى
        similar_pairs = [
            # يجب تحديد أزواج البنود المتشابهة بناءً على محتوى المقياس
        ]
        
        return inconsistency_count
    
    def _detect_random_responding(self, responses: List) -> float:
        """اكتشاف الاستجابة العشوائية"""
        if len(responses) < 10:
            return 0.0
        
        # حساب نسبة الاستجابات المتتالية المتشابهة
        consecutive_same = 0
        total_pairs = len(responses) - 1
        
        for i in range(total_pairs):
            if (responses[i].response_value == responses[i + 1].response_value and 
                responses[i].response_value is not None):
                consecutive_same += 1
        
        if total_pairs > 0:
            return consecutive_same / total_pairs
        return 0.0
    
    def _interpret_anxiety_level(self, total_score: int) -> str:
        """تفسير مستوى القلق"""
        for (min_score, max_score), level in self.ANXIETY_LEVELS.items():
            if min_score <= total_score <= max_score:
                return level
        return "غير محدد"
    
    def _analyze_anxiety_domains(self, scores: Dict) -> str:
        """تحليل مجالات القلق"""
        domain_analysis = []
        
        domains = {
            'physiological_t_score': 'القلق الفسيولوجي',
            'worry_t_score': 'القلق والهم',
            'social_t_score': 'القلق الاجتماعي'
        }
        
        for score_key, domain_name in domains.items():
            score = scores.get(score_key, 50)
            if score is not None:
                if score >= 65:
                    domain_analysis.append(f"{domain_name}: مرتفع ({score})")
                elif score >= 60:
                    domain_analysis.append(f"{domain_name}: فوق المتوسط ({score})")
                elif score <= 35:
                    domain_analysis.append(f"{domain_name}: منخفض ({score})")
                else:
                    domain_analysis.append(f"{domain_name}: متوسط ({score})")
        
        return "؛ ".join(domain_analysis) if domain_analysis else "لا توجد بيانات كافية"
    
    def _assess_clinical_significance(self, total_score: int) -> str:
        """تقييم الأهمية الإكلينيكية"""
        if total_score >= self.CLINICAL_CUTOFFS['very_high']:
            return "مستوى قلق مرتفع جداً يتطلب تدخلاً إكلينيكياً فورياً"
        elif total_score >= self.CLINICAL_CUTOFFS['high']:
            return "مستوى قلق مرتفع يتطلب متابعة مهنية متخصصة"
        elif total_score >= self.CLINICAL_CUTOFFS['elevated']:
            return "مستوى قلق فوق المتوسط يحتاج إلى مراقبة ودعم"
        else:
            return "مستوى قلق ضمن النطاق الطبيعي"
    
    def _interpret_validity(self, validity: Dict) -> str:
        """تفسير مؤشرات الصحة"""
        concerns = []
        
        if validity.get('defensiveness_concern', False):
            concerns.append("مستوى دفاعية مرتفع قد يؤثر على دقة النتائج")
        
        if validity.get('inconsistency_concern', False):
            concerns.append("وجود تناقضات في الاستجابات")
        
        if validity.get('random_concern', False):
            concerns.append("نمط استجابة قد يشير إلى عدم الانتباه")
        
        if concerns:
            return "تحذيرات الصحة: " + "؛ ".join(concerns)
        else:
            return "النتائج صحيحة وموثوقة"
    
    def _assess_anxiety_risk(self, scores: Dict) -> str:
        """تقييم مخاطر القلق"""
        total_score = scores.get('total_anxiety_score', 50)
        
        if total_score >= 70:
            return "خطر عالي: يحتاج تدخل فوري ومتابعة مكثفة"
        elif total_score >= 65:
            return "خطر متوسط إلى عالي: يحتاج متابعة منتظمة"
        elif total_score >= 60:
            return "خطر متوسط: يحتاج مراقبة ودعم"
        else:
            return "خطر منخفض: متابعة روتينية"
    
    def _generate_recommendations(self, scores: Dict, validity: Dict) -> str:
        """توليد التوصيات"""
        total_score = scores.get('total_anxiety_score', 50)
        recommendations = []
        
        # توصيات بناءً على مستوى القلق
        if total_score >= 70:
            recommendations.extend([
                "إحالة فورية لأخصائي نفسي أو طبيب نفسي",
                "تقييم شامل للحالة النفسية",
                "وضع خطة علاجية متكاملة",
                "متابعة أسبوعية في البداية"
            ])
        elif total_score >= 65:
            recommendations.extend([
                "استشارة أخصائي نفسي",
                "تطبيق تقنيات إدارة القلق",
                "دعم الأسرة والمدرسة",
                "متابعة شهرية"
            ])
        elif total_score >= 60:
            recommendations.extend([
                "تعليم تقنيات الاسترخاء",
                "دعم نفسي واجتماعي",
                "مراقبة التطور",
                "متابعة كل 3 أشهر"
            ])
        
        # توصيات بناءً على صحة النتائج
        if validity.get('overall_validity') == 'questionable':
            recommendations.append("إعادة التقييم مع ضمان فهم أفضل للتعليمات")
        
        return "؛ ".join(recommendations) if recommendations else "متابعة روتينية حسب الحاجة"
    
    def _get_anxiety_classification(self, total_score: int) -> str:
        """تحديد تصنيف القلق"""
        for (min_score, max_score), classification in self.ANXIETY_LEVELS.items():
            if min_score <= total_score <= max_score:
                return classification
        return "غير محدد"
    
    def _z_to_percentile(self, z_score: float) -> float:
        """تحويل الدرجة المعيارية إلى رتبة مئوية"""
        return 50 * (1 + math.erf(z_score / math.sqrt(2)))


def calculate_rcmas_scores(assessment_id: int) -> Dict:
    """دالة مساعدة لحساب درجات RCMAS"""
    try:
        scorer = RCMASScoring(assessment_id)
        score_record = scorer.calculate_complete_scores()
        
        # توليد التفسير الإكلينيكي
        scores_dict = {
            'total_anxiety_score': score_record.total_anxiety_score,
            'physiological_t_score': score_record.physiological_t_score,
            'worry_t_score': score_record.worry_t_score,
            'social_t_score': score_record.social_t_score,
            'defensiveness_t_score': score_record.defensiveness_t_score
        }
        
        validity_dict = eval(score_record.validity_concerns) if score_record.validity_concerns else {}
        clinical_interpretation = scorer.generate_clinical_interpretation(scores_dict, validity_dict)
        
        # تحديث التقييم بالنتائج
        assessment = RCMASAssessment.query.get(assessment_id)
        assessment.total_anxiety_score = score_record.total_anxiety_score
        assessment.anxiety_level = score_record.anxiety_level_classification
        assessment.clinical_interpretation = clinical_interpretation['overall_anxiety_level']
        assessment.validity_concerns = clinical_interpretation['validity_concerns']
        assessment.recommendations = clinical_interpretation['recommendations']
        
        db.session.commit()
        
        return {
            'success': True,
            'scores': score_record,
            'interpretation': clinical_interpretation,
            'message': 'تم حساب درجات مقياس القلق بنجاح'
        }
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e),
            'message': 'حدث خطأ أثناء حساب الدرجات'
        }
