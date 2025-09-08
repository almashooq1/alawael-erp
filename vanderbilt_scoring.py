# Vanderbilt ADHD Diagnostic Parent Rating Scale (VADPRS) Advanced Scoring System
# مقياس فاندربلت التشخيصي لفرط الحركة وتشتت الانتباه - نظام حساب الدرجات المتقدم

import json
import math
from datetime import datetime
from typing import Dict, List, Tuple, Optional

class VanderbiltScoring:
    """
    نظام حساب الدرجات المتقدم لمقياس فاندربلت VADPRS
    يتضمن معايير DSM-5، تقييم الأداء الوظيفي، والتفسير الإكلينيكي
    """
    
    def __init__(self):
        # معايير DSM-5 لـ ADHD
        self.dsm5_criteria = {
            'inattention': {
                'name': 'عدم الانتباه',
                'items': [1, 2, 3, 4, 5, 6, 7, 8, 9],
                'threshold': 6,
                'descriptions': {
                    1: 'لا يعطي اهتماماً كافياً للتفاصيل أو يرتكب أخطاء بسبب الإهمال',
                    2: 'صعوبة في الحفاظ على الانتباه في المهام أو الأنشطة',
                    3: 'لا يبدو أنه يستمع عندما يتم التحدث إليه مباشرة',
                    4: 'لا يتبع التعليمات ويفشل في إنهاء المهام',
                    5: 'صعوبة في تنظيم المهام والأنشطة',
                    6: 'يتجنب أو يكره المهام التي تتطلب جهداً ذهنياً مستمراً',
                    7: 'يفقد الأشياء الضرورية للمهام والأنشطة',
                    8: 'يتشتت بسهولة بالمثيرات الخارجية',
                    9: 'نسيان في الأنشطة اليومية'
                }
            },
            'hyperactivity_impulsivity': {
                'name': 'فرط الحركة/الاندفاعية',
                'items': [10, 11, 12, 13, 14, 15, 16, 17, 18],
                'threshold': 6,
                'descriptions': {
                    10: 'يتململ أو يتحرك في مقعده',
                    11: 'يترك مقعده في المواقف التي يُتوقع فيها البقاء جالساً',
                    12: 'يجري أو يتسلق بشكل مفرط في المواقف غير المناسبة',
                    13: 'صعوبة في اللعب أو المشاركة في الأنشطة الترفيهية بهدوء',
                    14: 'يتصرف كما لو كان "مدفوعاً بمحرك"',
                    15: 'يتحدث بإفراط',
                    16: 'يجيب على الأسئلة قبل اكتمالها',
                    17: 'صعوبة في انتظار دوره',
                    18: 'يقاطع أو يتطفل على الآخرين'
                }
            }
        }
        
        # مقاييس الأداء الوظيفي
        self.performance_measures = {
            'academic': {
                'name': 'الأداء الأكاديمي',
                'items': [19, 20, 21, 22, 23],
                'descriptions': {
                    19: 'الأداء العام في المدرسة',
                    20: 'القراءة',
                    21: 'الرياضيات',
                    22: 'الكتابة',
                    23: 'العلاقة مع الأقران'
                }
            },
            'classroom_behavior': {
                'name': 'السلوك في الفصل',
                'items': [24, 25, 26, 27],
                'descriptions': {
                    24: 'اتباع التوجيهات',
                    25: 'إزعاج الطلاب الآخرين',
                    26: 'تعيين المهام',
                    27: 'السلوك التنظيمي'
                }
            }
        }
        
        # مقاييس الاضطرابات المصاحبة
        self.comorbid_conditions = {
            'anxiety_depression': {
                'name': 'القلق/الاكتئاب',
                'items': [28, 29, 30, 31, 32, 33, 34],
                'threshold': 3,
                'descriptions': {
                    28: 'قلق أو خوف مفرط',
                    29: 'حزن أو اكتئاب',
                    30: 'نوبات غضب',
                    31: 'تقلبات مزاجية',
                    32: 'سلوك عدواني',
                    33: 'سلوك معارض',
                    34: 'صعوبات في النوم'
                }
            },
            'conduct_problems': {
                'name': 'مشاكل السلوك',
                'items': [35, 36, 37, 38, 39, 40],
                'threshold': 2,
                'descriptions': {
                    35: 'يكذب أو يخدع',
                    36: 'يسرق',
                    37: 'يدمر ممتلكات الآخرين',
                    38: 'يتنمر على الآخرين',
                    39: 'يبدأ المشاجرات',
                    40: 'يتغيب عن المدرسة'
                }
            }
        }
        
        # معايير الشدة
        self.severity_levels = {
            'mild': {'min': 6, 'max': 8, 'name': 'بسيط'},
            'moderate': {'min': 9, 'max': 12, 'name': 'متوسط'},
            'severe': {'min': 13, 'max': 18, 'name': 'شديد'}
        }
        
        # معايير ضعف الأداء الوظيفي
        self.impairment_thresholds = {
            'academic': 2,  # متوسط الدرجات >= 2 يشير لضعف
            'classroom_behavior': 2,
            'overall_functioning': 2
        }

    def calculate_dsm5_scores(self, responses: Dict[int, int]) -> Dict[str, Dict]:
        """حساب درجات معايير DSM-5"""
        dsm5_results = {}
        
        for domain_key, domain_info in self.dsm5_criteria.items():
            symptom_count = 0
            total_score = 0
            symptom_details = []
            
            for item in domain_info['items']:
                if item in responses:
                    score = responses[item]
                    total_score += score
                    
                    # اعتبار الأعراض التي تحصل على درجة 2 أو 3 كأعراض موجودة
                    if score >= 2:
                        symptom_count += 1
                        symptom_details.append({
                            'item': item,
                            'description': domain_info['descriptions'][item],
                            'score': score,
                            'present': True
                        })
                    else:
                        symptom_details.append({
                            'item': item,
                            'description': domain_info['descriptions'][item],
                            'score': score,
                            'present': False
                        })
            
            meets_criteria = symptom_count >= domain_info['threshold']
            severity = self._determine_severity(symptom_count, domain_key)
            
            dsm5_results[domain_key] = {
                'name': domain_info['name'],
                'symptom_count': symptom_count,
                'total_score': total_score,
                'threshold': domain_info['threshold'],
                'meets_criteria': meets_criteria,
                'severity': severity,
                'symptom_details': symptom_details
            }
        
        return dsm5_results

    def calculate_performance_scores(self, responses: Dict[int, int]) -> Dict[str, Dict]:
        """حساب درجات الأداء الوظيفي"""
        performance_results = {}
        
        for domain_key, domain_info in self.performance_measures.items():
            scores = []
            item_details = []
            
            for item in domain_info['items']:
                if item in responses:
                    score = responses[item]
                    scores.append(score)
                    item_details.append({
                        'item': item,
                        'description': domain_info['descriptions'][item],
                        'score': score,
                        'impaired': score >= self.impairment_thresholds.get(domain_key, 2)
                    })
            
            if scores:
                average_score = sum(scores) / len(scores)
                is_impaired = average_score >= self.impairment_thresholds.get(domain_key, 2)
                impairment_level = self._get_impairment_level(average_score)
            else:
                average_score = 0
                is_impaired = False
                impairment_level = 'غير محدد'
            
            performance_results[domain_key] = {
                'name': domain_info['name'],
                'average_score': round(average_score, 2),
                'is_impaired': is_impaired,
                'impairment_level': impairment_level,
                'item_details': item_details
            }
        
        return performance_results

    def calculate_comorbid_scores(self, responses: Dict[int, int]) -> Dict[str, Dict]:
        """حساب درجات الاضطرابات المصاحبة"""
        comorbid_results = {}
        
        for condition_key, condition_info in self.comorbid_conditions.items():
            symptom_count = 0
            total_score = 0
            symptom_details = []
            
            for item in condition_info['items']:
                if item in responses:
                    score = responses[item]
                    total_score += score
                    
                    if score >= 2:
                        symptom_count += 1
                        symptom_details.append({
                            'item': item,
                            'description': condition_info['descriptions'][item],
                            'score': score,
                            'present': True
                        })
                    else:
                        symptom_details.append({
                            'item': item,
                            'description': condition_info['descriptions'][item],
                            'score': score,
                            'present': False
                        })
            
            meets_criteria = symptom_count >= condition_info['threshold']
            risk_level = self._get_comorbid_risk_level(symptom_count, condition_info['threshold'])
            
            comorbid_results[condition_key] = {
                'name': condition_info['name'],
                'symptom_count': symptom_count,
                'total_score': total_score,
                'threshold': condition_info['threshold'],
                'meets_criteria': meets_criteria,
                'risk_level': risk_level,
                'symptom_details': symptom_details
            }
        
        return comorbid_results

    def _determine_severity(self, symptom_count: int, domain: str) -> str:
        """تحديد مستوى الشدة"""
        if symptom_count < self.dsm5_criteria[domain]['threshold']:
            return 'لا يستوفي المعايير'
        elif symptom_count <= 8:
            return 'بسيط'
        elif symptom_count <= 12:
            return 'متوسط'
        else:
            return 'شديد'

    def _get_impairment_level(self, average_score: float) -> str:
        """تحديد مستوى ضعف الأداء"""
        if average_score < 1.5:
            return 'لا يوجد ضعف'
        elif average_score < 2.5:
            return 'ضعف بسيط'
        elif average_score < 3.5:
            return 'ضعف متوسط'
        else:
            return 'ضعف شديد'

    def _get_comorbid_risk_level(self, symptom_count: int, threshold: int) -> str:
        """تحديد مستوى خطر الاضطرابات المصاحبة"""
        if symptom_count < threshold:
            return 'خطر منخفض'
        elif symptom_count == threshold:
            return 'خطر متوسط'
        else:
            return 'خطر عالي'

    def determine_adhd_diagnosis(self, dsm5_scores: Dict[str, Dict], 
                                performance_scores: Dict[str, Dict]) -> Dict[str, str]:
        """تحديد التشخيص النهائي لـ ADHD"""
        inattention_criteria = dsm5_scores['inattention']['meets_criteria']
        hyperactivity_criteria = dsm5_scores['hyperactivity_impulsivity']['meets_criteria']
        
        # التحقق من وجود ضعف في الأداء الوظيفي
        functional_impairment = any(
            score['is_impaired'] for score in performance_scores.values()
        )
        
        diagnosis = {}
        
        if inattention_criteria and hyperactivity_criteria:
            if functional_impairment:
                diagnosis['primary'] = 'ADHD النوع المختلط'
                diagnosis['severity'] = max(
                    dsm5_scores['inattention']['severity'],
                    dsm5_scores['hyperactivity_impulsivity']['severity'],
                    key=lambda x: ['بسيط', 'متوسط', 'شديد'].index(x) if x in ['بسيط', 'متوسط', 'شديد'] else 0
                )
            else:
                diagnosis['primary'] = 'أعراض ADHD بدون ضعف وظيفي كافي'
                diagnosis['severity'] = 'غير محدد'
        elif inattention_criteria:
            if functional_impairment:
                diagnosis['primary'] = 'ADHD النوع الغافل (عدم الانتباه)'
                diagnosis['severity'] = dsm5_scores['inattention']['severity']
            else:
                diagnosis['primary'] = 'أعراض عدم انتباه بدون ضعف وظيفي كافي'
                diagnosis['severity'] = 'غير محدد'
        elif hyperactivity_criteria:
            if functional_impairment:
                diagnosis['primary'] = 'ADHD النوع المفرط الحركة/الاندفاعي'
                diagnosis['severity'] = dsm5_scores['hyperactivity_impulsivity']['severity']
            else:
                diagnosis['primary'] = 'أعراض فرط حركة/اندفاعية بدون ضعف وظيفي كافي'
                diagnosis['severity'] = 'غير محدد'
        else:
            diagnosis['primary'] = 'لا يستوفي معايير ADHD'
            diagnosis['severity'] = 'غير قابل للتطبيق'
        
        return diagnosis

    def generate_clinical_interpretation(self, dsm5_scores: Dict[str, Dict],
                                       performance_scores: Dict[str, Dict],
                                       comorbid_scores: Dict[str, Dict],
                                       diagnosis: Dict[str, str]) -> Dict[str, str]:
        """توليد التفسير الإكلينيكي الشامل"""
        interpretation = {}
        
        # تفسير التشخيص الأساسي
        interpretation['primary_diagnosis'] = f"التشخيص الأساسي: {diagnosis['primary']}"
        if diagnosis['severity'] != 'غير قابل للتطبيق':
            interpretation['primary_diagnosis'] += f" ({diagnosis['severity']})"
        
        # تفسير الأعراض
        symptom_summary = []
        for domain, scores in dsm5_scores.items():
            if scores['meets_criteria']:
                symptom_summary.append(f"{scores['name']}: {scores['symptom_count']}/{len(self.dsm5_criteria[domain]['items'])} أعراض")
        
        if symptom_summary:
            interpretation['symptom_profile'] = "ملف الأعراض: " + " | ".join(symptom_summary)
        else:
            interpretation['symptom_profile'] = "لا توجد أعراض كافية لتشخيص ADHD"
        
        # تفسير الأداء الوظيفي
        impairment_areas = []
        for domain, scores in performance_scores.items():
            if scores['is_impaired']:
                impairment_areas.append(f"{scores['name']} ({scores['impairment_level']})")
        
        if impairment_areas:
            interpretation['functional_impairment'] = "مجالات الضعف الوظيفي: " + " | ".join(impairment_areas)
        else:
            interpretation['functional_impairment'] = "لا يوجد ضعف وظيفي ملحوظ"
        
        # تفسير الاضطرابات المصاحبة
        comorbid_conditions = []
        for condition, scores in comorbid_scores.items():
            if scores['meets_criteria']:
                comorbid_conditions.append(f"{scores['name']} ({scores['risk_level']})")
        
        if comorbid_conditions:
            interpretation['comorbid_conditions'] = "الاضطرابات المصاحبة المحتملة: " + " | ".join(comorbid_conditions)
        else:
            interpretation['comorbid_conditions'] = "لا توجد مؤشرات لاضطرابات مصاحبة"
        
        return interpretation

    def generate_recommendations(self, dsm5_scores: Dict[str, Dict],
                               performance_scores: Dict[str, Dict],
                               comorbid_scores: Dict[str, Dict],
                               diagnosis: Dict[str, str]) -> List[str]:
        """توليد التوصيات العلاجية والتدخلية"""
        recommendations = []
        
        # توصيات عامة لـ ADHD
        if 'ADHD' in diagnosis['primary']:
            recommendations.extend([
                "تقييم طبي شامل من طبيب نفسي أو طبيب أطفال متخصص",
                "وضع خطة تعليمية فردية (IEP) أو خطة 504",
                "تدريب الوالدين على إدارة سلوك ADHD",
                "تنسيق بين المنزل والمدرسة",
                "النظر في العلاج الدوائي إذا لزم الأمر"
            ])
        
        # توصيات حسب نوع ADHD
        if dsm5_scores['inattention']['meets_criteria']:
            recommendations.extend([
                "استراتيجيات تحسين الانتباه والتركيز",
                "تقسيم المهام الطويلة إلى خطوات قصيرة",
                "استخدام المنبهات البصرية والتذكيرات",
                "توفير بيئة تعليمية قليلة المشتتات",
                "تدريب على مهارات التنظيم وإدارة الوقت"
            ])
        
        if dsm5_scores['hyperactivity_impulsivity']['meets_criteria']:
            recommendations.extend([
                "توفير فرص للحركة المنظمة",
                "استراتيجيات إدارة الاندفاعية",
                "تعليم تقنيات التهدئة الذاتية",
                "وضع حدود واضحة ومتسقة",
                "استخدام نظام المكافآت والعواقب"
            ])
        
        # توصيات حسب مجالات الضعف الوظيفي
        if performance_scores['academic']['is_impaired']:
            recommendations.extend([
                "تقييم تعليمي شامل",
                "دعم أكاديمي إضافي",
                "استراتيجيات تعليمية متنوعة",
                "تعديلات في الامتحانات والواجبات"
            ])
        
        if performance_scores['classroom_behavior']['is_impaired']:
            recommendations.extend([
                "برنامج إدارة السلوك في الفصل",
                "تدريب المعلمين على التعامل مع ADHD",
                "استراتيجيات تعديل السلوك",
                "نظام التعزيز الإيجابي"
            ])
        
        # توصيات للاضطرابات المصاحبة
        if comorbid_scores['anxiety_depression']['meets_criteria']:
            recommendations.extend([
                "تقييم نفسي للقلق والاكتئاب",
                "العلاج النفسي المعرفي السلوكي",
                "تقنيات إدارة القلق والضغط",
                "دعم الصحة النفسية"
            ])
        
        if comorbid_scores['conduct_problems']['meets_criteria']:
            recommendations.extend([
                "تقييم شامل لاضطرابات السلوك",
                "برامج تعديل السلوك المكثفة",
                "تدريب على المهارات الاجتماعية",
                "إشراف وثيق من الوالدين والمدرسة"
            ])
        
        # توصيات عامة
        recommendations.extend([
            "متابعة دورية لتقييم التقدم",
            "تعديل الخطة العلاجية حسب الحاجة",
            "دعم الأسرة والتثقيف حول ADHD",
            "تعزيز نقاط القوة والمواهب"
        ])
        
        return list(set(recommendations))  # إزالة التكرارات

    def calculate_comprehensive_assessment(self, responses: Dict[int, int]) -> Dict:
        """تقييم شامل لمقياس فاندربلت"""
        # حساب درجات DSM-5
        dsm5_scores = self.calculate_dsm5_scores(responses)
        
        # حساب درجات الأداء الوظيفي
        performance_scores = self.calculate_performance_scores(responses)
        
        # حساب درجات الاضطرابات المصاحبة
        comorbid_scores = self.calculate_comorbid_scores(responses)
        
        # تحديد التشخيص
        diagnosis = self.determine_adhd_diagnosis(dsm5_scores, performance_scores)
        
        # التفسير الإكلينيكي
        clinical_interpretation = self.generate_clinical_interpretation(
            dsm5_scores, performance_scores, comorbid_scores, diagnosis
        )
        
        # التوصيات
        recommendations = self.generate_recommendations(
            dsm5_scores, performance_scores, comorbid_scores, diagnosis
        )
        
        # تحديد مستوى الأولوية
        priority_level = self._determine_priority_level(dsm5_scores, performance_scores, comorbid_scores)
        
        return {
            'dsm5_scores': dsm5_scores,
            'performance_scores': performance_scores,
            'comorbid_scores': comorbid_scores,
            'diagnosis': diagnosis,
            'clinical_interpretation': clinical_interpretation,
            'recommendations': recommendations,
            'priority_level': priority_level,
            'assessment_date': datetime.now().isoformat(),
            'total_items_assessed': len(responses)
        }

    def _determine_priority_level(self, dsm5_scores: Dict[str, Dict],
                                 performance_scores: Dict[str, Dict],
                                 comorbid_scores: Dict[str, Dict]) -> str:
        """تحديد مستوى الأولوية للتدخل"""
        # عدد معايير DSM-5 المستوفاة
        dsm5_criteria_met = sum(1 for score in dsm5_scores.values() if score['meets_criteria'])
        
        # عدد مجالات الضعف الوظيفي
        impaired_areas = sum(1 for score in performance_scores.values() if score['is_impaired'])
        
        # عدد الاضطرابات المصاحبة
        comorbid_conditions = sum(1 for score in comorbid_scores.values() if score['meets_criteria'])
        
        if dsm5_criteria_met >= 2 and impaired_areas >= 2:
            return "أولوية عالية - يتطلب تدخل فوري"
        elif dsm5_criteria_met >= 1 and impaired_areas >= 1:
            return "أولوية متوسطة - يتطلب تقييم ومتابعة"
        elif dsm5_criteria_met >= 1 or impaired_areas >= 1 or comorbid_conditions >= 1:
            return "أولوية منخفضة - يحتاج مراقبة"
        else:
            return "ضمن المدى الطبيعي"

# مثال على الاستخدام
def example_usage():
    """مثال على كيفية استخدام نظام التقييم"""
    scorer = VanderbiltScoring()
    
    # مثال على استجابات الوالدين (0-3 لكل عنصر)
    sample_responses = {
        # أعراض عدم الانتباه
        1: 3, 2: 2, 3: 3, 4: 2, 5: 3, 6: 2, 7: 3, 8: 2, 9: 3,
        # أعراض فرط الحركة/الاندفاعية
        10: 2, 11: 3, 12: 2, 13: 3, 14: 2, 15: 3, 16: 2, 17: 3, 18: 2,
        # الأداء الأكاديمي
        19: 2, 20: 3, 21: 2, 22: 3, 23: 2,
        # السلوك في الفصل
        24: 3, 25: 2, 26: 3, 27: 2,
        # القلق/الاكتئاب
        28: 1, 29: 1, 30: 2, 31: 1, 32: 1, 33: 1, 34: 2,
        # مشاكل السلوك
        35: 1, 36: 0, 37: 1, 38: 0, 39: 1, 40: 0
    }
    
    # حساب التقييم الشامل
    results = scorer.calculate_comprehensive_assessment(sample_responses)
    
    return results

if __name__ == "__main__":
    # تشغيل المثال
    results = example_usage()
    print(json.dumps(results, indent=2, ensure_ascii=False))
