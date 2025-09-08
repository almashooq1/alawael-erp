# Conners CTRS-3 Advanced Scoring System
# مقياس كونرز للمعلمين - نظام حساب الدرجات المتقدم

import json
import math
from datetime import datetime
from typing import Dict, List, Tuple, Optional

class ConnersScoring:
    """
    نظام حساب الدرجات المتقدم لمقياس كونرز CTRS-3
    يتضمن حساب T-scores، المئينيات، والتفسير الإكلينيكي
    """
    
    def __init__(self):
        # معايير الدرجات المعيارية حسب العمر والجنس
        self.normative_data = {
            # الذكور 6-8 سنوات
            'male_6_8': {
                'inattention': {'mean': 15.2, 'sd': 8.4},
                'hyperactivity': {'mean': 12.8, 'sd': 7.9},
                'learning_problems': {'mean': 8.6, 'sd': 6.2},
                'executive_functioning': {'mean': 11.4, 'sd': 7.1},
                'aggression': {'mean': 4.2, 'sd': 5.8},
                'peer_relations': {'mean': 3.8, 'sd': 4.9}
            },
            # الذكور 9-11 سنة
            'male_9_11': {
                'inattention': {'mean': 14.8, 'sd': 8.1},
                'hyperactivity': {'mean': 11.2, 'sd': 7.3},
                'learning_problems': {'mean': 9.2, 'sd': 6.8},
                'executive_functioning': {'mean': 10.8, 'sd': 6.9},
                'aggression': {'mean': 3.8, 'sd': 5.2},
                'peer_relations': {'mean': 3.4, 'sd': 4.6}
            },
            # الذكور 12-14 سنة
            'male_12_14': {
                'inattention': {'mean': 13.6, 'sd': 7.8},
                'hyperactivity': {'mean': 9.8, 'sd': 6.9},
                'learning_problems': {'mean': 8.9, 'sd': 6.5},
                'executive_functioning': {'mean': 10.2, 'sd': 6.7},
                'aggression': {'mean': 3.2, 'sd': 4.8},
                'peer_relations': {'mean': 3.1, 'sd': 4.2}
            },
            # الذكور 15-17 سنة
            'male_15_17': {
                'inattention': {'mean': 12.4, 'sd': 7.2},
                'hyperactivity': {'mean': 8.6, 'sd': 6.2},
                'learning_problems': {'mean': 8.1, 'sd': 6.1},
                'executive_functioning': {'mean': 9.4, 'sd': 6.2},
                'aggression': {'mean': 2.8, 'sd': 4.2},
                'peer_relations': {'mean': 2.7, 'sd': 3.8}
            },
            # الإناث 6-8 سنوات
            'female_6_8': {
                'inattention': {'mean': 12.8, 'sd': 7.6},
                'hyperactivity': {'mean': 9.4, 'sd': 6.8},
                'learning_problems': {'mean': 6.8, 'sd': 5.4},
                'executive_functioning': {'mean': 9.2, 'sd': 6.4},
                'aggression': {'mean': 2.8, 'sd': 4.2},
                'peer_relations': {'mean': 2.6, 'sd': 3.8}
            },
            # الإناث 9-11 سنة
            'female_9_11': {
                'inattention': {'mean': 12.2, 'sd': 7.2},
                'hyperactivity': {'mean': 8.6, 'sd': 6.2},
                'learning_problems': {'mean': 7.1, 'sd': 5.8},
                'executive_functioning': {'mean': 8.8, 'sd': 6.1},
                'aggression': {'mean': 2.4, 'sd': 3.8},
                'peer_relations': {'mean': 2.2, 'sd': 3.4}
            },
            # الإناث 12-14 سنة
            'female_12_14': {
                'inattention': {'mean': 11.8, 'sd': 6.9},
                'hyperactivity': {'mean': 7.8, 'sd': 5.8},
                'learning_problems': {'mean': 6.9, 'sd': 5.6},
                'executive_functioning': {'mean': 8.4, 'sd': 5.9},
                'aggression': {'mean': 2.1, 'sd': 3.4},
                'peer_relations': {'mean': 2.0, 'sd': 3.1}
            },
            # الإناث 15-17 سنة
            'female_15_17': {
                'inattention': {'mean': 10.6, 'sd': 6.4},
                'hyperactivity': {'mean': 6.8, 'sd': 5.2},
                'learning_problems': {'mean': 6.2, 'sd': 5.1},
                'executive_functioning': {'mean': 7.8, 'sd': 5.4},
                'aggression': {'mean': 1.8, 'sd': 3.1},
                'peer_relations': {'mean': 1.7, 'sd': 2.8}
            }
        }
        
        # مقاييس فرعية وعناصرها
        self.subscales = {
            'inattention': {
                'name': 'عدم الانتباه',
                'items': [1, 4, 7, 11, 14, 18, 22, 25, 28],
                'max_score': 27
            },
            'hyperactivity': {
                'name': 'فرط الحركة/الاندفاعية',
                'items': [2, 5, 8, 12, 15, 19, 23, 26],
                'max_score': 24
            },
            'learning_problems': {
                'name': 'مشاكل التعلم',
                'items': [3, 6, 9, 13, 16, 20, 24, 27],
                'max_score': 24
            },
            'executive_functioning': {
                'name': 'الوظائف التنفيذية',
                'items': [10, 17, 21, 29, 30, 31, 32],
                'max_score': 21
            },
            'aggression': {
                'name': 'العدوانية',
                'items': [33, 34, 35, 36, 37, 38],
                'max_score': 18
            },
            'peer_relations': {
                'name': 'العلاقات مع الأقران',
                'items': [39, 40, 41, 42, 43],
                'max_score': 15
            }
        }
        
        # مؤشرات DSM-5
        self.dsm5_indices = {
            'adhd_inattentive': {
                'name': 'ADHD عدم الانتباه',
                'items': [1, 4, 7, 11, 14, 18, 22, 25, 28],
                'threshold': 6
            },
            'adhd_hyperactive_impulsive': {
                'name': 'ADHD فرط الحركة/الاندفاعية',
                'items': [2, 5, 8, 12, 15, 19, 23, 26, 44],
                'threshold': 6
            },
            'conduct_disorder': {
                'name': 'اضطراب السلوك',
                'items': [33, 34, 35, 36, 37, 45, 46, 47],
                'threshold': 3
            },
            'oppositional_defiant': {
                'name': 'اضطراب المعارضة والعناد',
                'items': [38, 48, 49, 50, 51, 52, 53, 54],
                'threshold': 4
            }
        }

    def get_age_gender_group(self, age_years: int, gender: str) -> str:
        """تحديد المجموعة العمرية والجنسية للمعايير"""
        gender_key = 'male' if gender.lower() in ['male', 'ذكر', 'm'] else 'female'
        
        if 6 <= age_years <= 8:
            return f"{gender_key}_6_8"
        elif 9 <= age_years <= 11:
            return f"{gender_key}_9_11"
        elif 12 <= age_years <= 14:
            return f"{gender_key}_12_14"
        elif 15 <= age_years <= 17:
            return f"{gender_key}_15_17"
        else:
            # استخدام أقرب مجموعة عمرية
            if age_years < 6:
                return f"{gender_key}_6_8"
            else:
                return f"{gender_key}_15_17"

    def calculate_raw_scores(self, responses: Dict[int, int]) -> Dict[str, int]:
        """حساب الدرجات الخام للمقاييس الفرعية"""
        raw_scores = {}
        
        for subscale_key, subscale_info in self.subscales.items():
            total_score = 0
            for item in subscale_info['items']:
                if item in responses:
                    total_score += responses[item]
            raw_scores[subscale_key] = total_score
            
        return raw_scores

    def calculate_t_score(self, raw_score: int, mean: float, sd: float) -> int:
        """حساب T-Score المعياري"""
        if sd == 0:
            return 50
        
        z_score = (raw_score - mean) / sd
        t_score = 50 + (z_score * 10)
        
        # تحديد النطاق بين 20 و 90
        return max(20, min(90, round(t_score)))

    def calculate_percentile(self, t_score: int) -> int:
        """حساب المئين من T-Score"""
        # تحويل T-score إلى z-score ثم إلى مئين
        z_score = (t_score - 50) / 10
        
        # استخدام التوزيع الطبيعي التراكمي
        percentile = self._normal_cdf(z_score) * 100
        return max(1, min(99, round(percentile)))

    def _normal_cdf(self, x: float) -> float:
        """حساب التوزيع الطبيعي التراكمي"""
        return 0.5 * (1 + math.erf(x / math.sqrt(2)))

    def calculate_dsm5_scores(self, responses: Dict[int, int]) -> Dict[str, Dict]:
        """حساب مؤشرات DSM-5"""
        dsm5_scores = {}
        
        for index_key, index_info in self.dsm5_indices.items():
            symptom_count = 0
            total_score = 0
            
            for item in index_info['items']:
                if item in responses:
                    score = responses[item]
                    total_score += score
                    # اعتبار الأعراض التي تحصل على درجة 2 أو 3 كأعراض موجودة
                    if score >= 2:
                        symptom_count += 1
            
            meets_criteria = symptom_count >= index_info['threshold']
            
            dsm5_scores[index_key] = {
                'name': index_info['name'],
                'symptom_count': symptom_count,
                'total_score': total_score,
                'threshold': index_info['threshold'],
                'meets_criteria': meets_criteria,
                'severity': self._get_severity_level(symptom_count, index_info['threshold'])
            }
            
        return dsm5_scores

    def _get_severity_level(self, symptom_count: int, threshold: int) -> str:
        """تحديد مستوى الشدة"""
        if symptom_count < threshold:
            return 'لا يستوفي المعايير'
        elif symptom_count == threshold or symptom_count == threshold + 1:
            return 'بسيط'
        elif symptom_count <= threshold + 3:
            return 'متوسط'
        else:
            return 'شديد'

    def get_clinical_interpretation(self, t_scores: Dict[str, int], 
                                  dsm5_scores: Dict[str, Dict]) -> Dict[str, str]:
        """التفسير الإكلينيكي للنتائج"""
        interpretation = {}
        
        # تفسير T-Scores
        for subscale, t_score in t_scores.items():
            subscale_name = self.subscales[subscale]['name']
            
            if t_score >= 70:
                level = "مرتفع جداً (أعلى من 98%)"
                concern = "يتطلب تدخل فوري"
            elif t_score >= 65:
                level = "مرتفع (أعلى من 93%)"
                concern = "يتطلب تقييم إضافي"
            elif t_score >= 60:
                level = "مرتفع نسبياً (أعلى من 84%)"
                concern = "يحتاج متابعة"
            elif t_score >= 40:
                level = "ضمن المدى الطبيعي"
                concern = "لا يوجد قلق"
            else:
                level = "منخفض"
                concern = "قد يشير لنقص في التقرير"
            
            interpretation[subscale] = f"{subscale_name}: {level} - {concern}"
        
        # تفسير DSM-5
        adhd_interpretation = []
        if dsm5_scores['adhd_inattentive']['meets_criteria']:
            severity = dsm5_scores['adhd_inattentive']['severity']
            adhd_interpretation.append(f"ADHD عدم الانتباه ({severity})")
            
        if dsm5_scores['adhd_hyperactive_impulsive']['meets_criteria']:
            severity = dsm5_scores['adhd_hyperactive_impulsive']['severity']
            adhd_interpretation.append(f"ADHD فرط الحركة/الاندفاعية ({severity})")
        
        if adhd_interpretation:
            interpretation['adhd_diagnosis'] = "مؤشرات ADHD: " + " و ".join(adhd_interpretation)
        else:
            interpretation['adhd_diagnosis'] = "لا توجد مؤشرات كافية لتشخيص ADHD"
        
        # تفسير اضطرابات السلوك
        behavioral_issues = []
        if dsm5_scores['conduct_disorder']['meets_criteria']:
            behavioral_issues.append("اضطراب السلوك")
        if dsm5_scores['oppositional_defiant']['meets_criteria']:
            behavioral_issues.append("اضطراب المعارضة والعناد")
            
        if behavioral_issues:
            interpretation['behavioral_disorders'] = "مؤشرات اضطرابات سلوكية: " + " و ".join(behavioral_issues)
        else:
            interpretation['behavioral_disorders'] = "لا توجد مؤشرات لاضطرابات سلوكية"
        
        return interpretation

    def generate_recommendations(self, t_scores: Dict[str, int], 
                               dsm5_scores: Dict[str, Dict]) -> List[str]:
        """توليد التوصيات العلاجية"""
        recommendations = []
        
        # توصيات عامة
        high_scores = [k for k, v in t_scores.items() if v >= 65]
        
        if 'inattention' in high_scores:
            recommendations.extend([
                "استراتيجيات تحسين الانتباه والتركيز",
                "تقسيم المهام إلى خطوات صغيرة",
                "استخدام المنبهات البصرية والسمعية",
                "توفير بيئة تعليمية قليلة المشتتات"
            ])
        
        if 'hyperactivity' in high_scores:
            recommendations.extend([
                "أنشطة حركية منظمة",
                "فترات راحة متكررة",
                "استراتيجيات إدارة الطاقة",
                "تقنيات الاسترخاء والتهدئة الذاتية"
            ])
        
        if 'learning_problems' in high_scores:
            recommendations.extend([
                "تقييم تعليمي شامل",
                "خطة تعليمية فردية",
                "استراتيجيات تعليمية متنوعة",
                "دعم أكاديمي إضافي"
            ])
        
        if 'executive_functioning' in high_scores:
            recommendations.extend([
                "تدريب على مهارات التنظيم",
                "استخدام المخططات والجداول",
                "تعليم استراتيجيات حل المشكلات",
                "تطوير مهارات إدارة الوقت"
            ])
        
        if 'aggression' in high_scores:
            recommendations.extend([
                "برامج إدارة الغضب",
                "تدريب على المهارات الاجتماعية",
                "استراتيجيات حل النزاعات",
                "تقييم نفسي متخصص"
            ])
        
        if 'peer_relations' in high_scores:
            recommendations.extend([
                "تدريب على المهارات الاجتماعية",
                "أنشطة جماعية موجهة",
                "تطوير مهارات التواصل",
                "دعم تكوين صداقات إيجابية"
            ])
        
        # توصيات DSM-5
        if any(dsm5_scores[key]['meets_criteria'] for key in ['adhd_inattentive', 'adhd_hyperactive_impulsive']):
            recommendations.extend([
                "تقييم طبي متخصص لـ ADHD",
                "النظر في العلاج الدوائي إذا لزم الأمر",
                "تدريب الوالدين على إدارة ADHD",
                "تنسيق بين المنزل والمدرسة"
            ])
        
        if dsm5_scores['conduct_disorder']['meets_criteria'] or dsm5_scores['oppositional_defiant']['meets_criteria']:
            recommendations.extend([
                "تقييم نفسي شامل",
                "العلاج السلوكي المعرفي",
                "تدريب الوالدين على إدارة السلوك",
                "وضع حدود واضحة ومتسقة"
            ])
        
        return list(set(recommendations))  # إزالة التكرارات

    def calculate_comprehensive_scores(self, responses: Dict[int, int], 
                                     age_years: int, gender: str) -> Dict:
        """حساب شامل لجميع الدرجات والتفسيرات"""
        # تحديد المجموعة المرجعية
        age_gender_group = self.get_age_gender_group(age_years, gender)
        norms = self.normative_data[age_gender_group]
        
        # حساب الدرجات الخام
        raw_scores = self.calculate_raw_scores(responses)
        
        # حساب T-Scores والمئينيات
        t_scores = {}
        percentiles = {}
        
        for subscale in self.subscales.keys():
            if subscale in raw_scores and subscale in norms:
                t_score = self.calculate_t_score(
                    raw_scores[subscale],
                    norms[subscale]['mean'],
                    norms[subscale]['sd']
                )
                t_scores[subscale] = t_score
                percentiles[subscale] = self.calculate_percentile(t_score)
        
        # حساب مؤشرات DSM-5
        dsm5_scores = self.calculate_dsm5_scores(responses)
        
        # التفسير الإكلينيكي
        clinical_interpretation = self.get_clinical_interpretation(t_scores, dsm5_scores)
        
        # التوصيات
        recommendations = self.generate_recommendations(t_scores, dsm5_scores)
        
        # تحديد مستوى الخطر الإجمالي
        risk_level = self._calculate_overall_risk(t_scores, dsm5_scores)
        
        return {
            'raw_scores': raw_scores,
            't_scores': t_scores,
            'percentiles': percentiles,
            'dsm5_scores': dsm5_scores,
            'clinical_interpretation': clinical_interpretation,
            'recommendations': recommendations,
            'risk_level': risk_level,
            'assessment_date': datetime.now().isoformat(),
            'age_gender_group': age_gender_group
        }

    def _calculate_overall_risk(self, t_scores: Dict[str, int], 
                              dsm5_scores: Dict[str, Dict]) -> str:
        """حساب مستوى الخطر الإجمالي"""
        high_scores_count = sum(1 for score in t_scores.values() if score >= 70)
        moderate_scores_count = sum(1 for score in t_scores.values() if 65 <= score < 70)
        
        dsm5_criteria_met = sum(1 for score in dsm5_scores.values() if score['meets_criteria'])
        
        if high_scores_count >= 3 or dsm5_criteria_met >= 2:
            return "خطر عالي - يتطلب تدخل فوري"
        elif high_scores_count >= 1 or moderate_scores_count >= 2 or dsm5_criteria_met >= 1:
            return "خطر متوسط - يتطلب تقييم ومتابعة"
        elif moderate_scores_count >= 1:
            return "خطر منخفض - يحتاج مراقبة"
        else:
            return "ضمن المدى الطبيعي"

# مثال على الاستخدام
def example_usage():
    """مثال على كيفية استخدام نظام التقييم"""
    scorer = ConnersScoring()
    
    # مثال على استجابات الطالب (1-3 لكل عنصر)
    sample_responses = {
        1: 3, 2: 2, 3: 1, 4: 3, 5: 2, 6: 1, 7: 3, 8: 2, 9: 1, 10: 2,
        11: 3, 12: 2, 13: 1, 14: 3, 15: 2, 16: 1, 17: 2, 18: 3, 19: 2, 20: 1,
        21: 2, 22: 3, 23: 2, 24: 1, 25: 3, 26: 2, 27: 1, 28: 3, 29: 2, 30: 1,
        31: 2, 32: 1, 33: 1, 34: 1, 35: 1, 36: 1, 37: 1, 38: 1, 39: 1, 40: 1,
        41: 1, 42: 1, 43: 1, 44: 2, 45: 1, 46: 1, 47: 1, 48: 1, 49: 1, 50: 1,
        51: 1, 52: 1, 53: 1, 54: 1
    }
    
    # حساب النتائج لطالب ذكر عمره 10 سنوات
    results = scorer.calculate_comprehensive_scores(sample_responses, 10, 'male')
    
    return results

if __name__ == "__main__":
    # تشغيل المثال
    results = example_usage()
    print(json.dumps(results, indent=2, ensure_ascii=False))
