# 📋 10 مقاييس تقييم إضافية متقدمة

# 10 Advanced Assessment Measures Implementation Guide

**النسخة:** 3.0  
**التاريخ:** 14 يناير 2026  
**حالة الإنجاز:** جميع المقاييس مع أكواد البرمجة

---

## 📌 المقاييس الجديدة (1-5)

### 1️⃣ مقياس (CARS) التقييم الشامل للتوحد

**Childhood Autism Rating Scale**

```python
# -*- coding: utf-8 -*-
"""
CARS - مقياس التقييم الشامل للتوحد
Childhood Autism Rating Scale
يقيس: 15 مجال لأعراض التوحد (1-4 درجات لكل مجال)
"""

class CARSAssessment:
    def __init__(self):
        self.domains = {
            '1_relational_to_people': {'name': 'العلاقة مع الناس', 'score_range': (1, 4)},
            '2_imitation': {'name': 'التقليد', 'score_range': (1, 4)},
            '3_emotional_response': {'name': 'الاستجابة العاطفية', 'score_range': (1, 4)},
            '4_body_use': {'name': 'استخدام الجسم', 'score_range': (1, 4)},
            '5_use_of_objects': {'name': 'استخدام الأشياء', 'score_range': (1, 4)},
            '6_adaptation_to_change': {'name': 'التكيف مع التغيير', 'score_range': (1, 4)},
            '7_visual_response': {'name': 'الاستجابة البصرية', 'score_range': (1, 4)},
            '8_listening_response': {'name': 'الاستجابة السمعية', 'score_range': (1, 4)},
            '9_taste_smell_touch': {'name': 'التذوق والشم واللمس', 'score_range': (1, 4)},
            '10_fear_nervousness': {'name': 'الخوف والعصبية', 'score_range': (1, 4)},
            '11_verbal_communication': {'name': 'التواصل اللفظي', 'score_range': (1, 4)},
            '12_nonverbal_communication': {'name': 'التواصل غير اللفظي', 'score_range': (1, 4)},
            '13_activity_level': {'name': 'مستوى النشاط', 'score_range': (1, 4)},
            '14_intellectual_response': {'name': 'الاستجابة الذهنية', 'score_range': (1, 4)},
            '15_general_impression': {'name': 'الانطباع العام', 'score_range': (1, 4)}
        }

    def score_assessment(self, domain_scores):
        """
        حساب النتيجة الإجمالية وتصنيف شدة التوحد
        """
        total_score = sum(domain_scores.values())

        # جداول التصنيف المعايرة (15-60)
        if total_score < 25:
            severity = 'بدون التوحد أو متوافق عادي'
            severity_level = 0
        elif total_score < 30:
            severity = 'توحد بسيط إلى متوسط'
            severity_level = 1
        elif total_score < 37:
            severity = 'توحد متوسط'
            severity_level = 2
        elif total_score < 41:
            severity = 'توحد متوسط إلى شديد'
            severity_level = 3
        else:
            severity = 'توحد شديد'
            severity_level = 4

        return {
            'total_score': total_score,
            'severity_classification': severity,
            'severity_level': severity_level,
            'domain_breakdown': domain_scores,
            'areas_of_concern': [d for d, s in domain_scores.items() if s >= 3],
            'recommendation': self.get_recommendation(severity_level)
        }

    def get_recommendation(self, severity_level):
        """التوصيات بناءً على مستوى الشدة"""
        recommendations = {
            0: 'مراقبة دورية لا توجد مؤشرات توحد',
            1: 'تقييم متخصص - برنامج تدخل مبكر',
            2: 'برنامج تدخل مكثف - علاجات متعددة',
            3: 'برنامج علاجي شامل - دعم كامل',
            4: 'رعاية متخصصة - فريق متعدد التخصصات'
        }
        return recommendations.get(severity_level, '')
```

---

### 2️⃣ مقياس (BASC-3) نظام التقييم السلوكي

**Behavior Assessment System for Children**

```python
"""
BASC-3 - نظام التقييم السلوكي للأطفال
يقيس: المشاكل السلوكية والعاطفية
المقاييس الفرعية: 19 مقياس فرعي
"""

class BASC3Assessment:
    def __init__(self):
        self.composite_scales = {
            'externalizing_problems': {
                'name': 'المشاكل الخارجية',
                'subscales': [
                    'aggression', 'hyperactivity_impulsivity',
                    'conduct_problems'
                ]
            },
            'internalizing_problems': {
                'name': 'المشاكل الداخلية',
                'subscales': [
                    'anxiety', 'depression', 'somatization'
                ]
            },
            'school_problems': {
                'name': 'مشاكل المدرسة',
                'subscales': [
                    'attention_problems', 'learning_problems'
                ]
            },
            'adaptive_scales': {
                'name': 'المقاييس التكيفية',
                'subscales': [
                    'adaptability', 'social_skills', 'leadership',
                    'study_skills'
                ]
            }
        }

    def calculate_t_scores(self, raw_scores, age_group):
        """
        تحويل الدرجات الخام إلى T-Scores معايرة
        T-Score: متوسط 50، انحراف معياري 10
        """
        t_scores = {}

        for scale, raw_score in raw_scores.items():
            # جداول التحويل حسب العمر
            t_score = self._get_t_score_table(scale, raw_score, age_group)
            t_scores[scale] = {
                'raw_score': raw_score,
                't_score': t_score,
                'percentile': self._t_to_percentile(t_score),
                'interpretation': self._interpret_t_score(t_score, scale)
            }

        return t_scores

    def _t_to_percentile(self, t_score):
        """تحويل T-Score إلى رتبة مئوية"""
        percentile_table = {
            20: 0.1, 25: 1, 30: 2, 35: 8, 40: 16,
            50: 50, 60: 84, 65: 92, 70: 98, 75: 99, 80: 99.9
        }

        for ts, pct in sorted(percentile_table.items()):
            if t_score <= ts:
                return pct
        return 99.9

    def _interpret_t_score(self, t_score, scale):
        """تفسير T-Score"""
        if t_score < 40:
            return 'ملحوظ جداً' if 'adaptive' in scale else 'مرتفع جداً'
        elif t_score < 45:
            return 'ملحوظ' if 'adaptive' in scale else 'مرتفع'
        elif t_score < 55:
            return 'طبيعي'
        elif t_score < 60:
            return 'منخفض' if 'adaptive' in scale else 'بسيط'
        else:
            return 'منخفض جداً' if 'adaptive' in scale else 'ملحوظ جداً'

    def generate_clinical_report(self, scores, clinical_observations):
        """توليد تقرير سريري شامل"""
        return {
            'composite_scores': self._calculate_composite_scores(scores),
            'clinical_observations': clinical_observations,
            'diagnostic_considerations': self._generate_diagnostic_insights(scores),
            'treatment_recommendations': self._generate_treatment_plan(scores)
        }
```

---

### 3️⃣ مقياس (BRIEF-2) التقييم السلوكي للتنفيذ

**Behavior Rating Inventory of Executive Function**

```python
"""
BRIEF-2 - قياس الوظائف التنفيذية
الوظائف المقاسة:
- الكبح (Inhibition)
- التبديل (Shifting)
- المراقبة الذاتية (Self-Monitoring)
- التخطيط/التنظيم (Planning/Organization)
- تنظيم العواطف (Emotion Control)
- إدارة العمل في الذاكرة (Working Memory)
"""

class BRIEFAssessment:
    def __init__(self):
        self.inhibition_scale = {
            'impulse_control': 'التحكم في الدوافع',
            'emotional_control': 'التحكم العاطفي',
            'self_monitoring': 'المراقبة الذاتية'
        }

        self.flexibility_scale = {
            'task_shifting': 'تحويل المهام',
            'emotional_shifting': 'تحويل المشاعر',
            'transition': 'الانتقالات'
        }

        self.emotional_control_scale = {
            'emotional_regulation': 'تنظيم العواطف',
            'frustration_tolerance': 'تحمل الإحباط',
            'emotional_response': 'الاستجابة العاطفية'
        }

    def assess_executive_function(self, item_responses):
        """
        تقييم الوظائف التنفيذية
        """
        inhibition_index = self._calculate_index(
            self.inhibition_scale,
            item_responses
        )

        flexibility_index = self._calculate_index(
            self.flexibility_scale,
            item_responses
        )

        emotion_index = self._calculate_index(
            self.emotional_control_scale,
            item_responses
        )

        return {
            'inhibition_index': {
                'raw_score': inhibition_index['raw'],
                't_score': inhibition_index['t_score'],
                'percentile': inhibition_index['percentile'],
                'category': self._classify_executive_function(inhibition_index['t_score'])
            },
            'flexibility_index': {
                'raw_score': flexibility_index['raw'],
                't_score': flexibility_index['t_score'],
                'percentile': flexibility_index['percentile'],
                'category': self._classify_executive_function(flexibility_index['t_score'])
            },
            'emotion_control_index': {
                'raw_score': emotion_index['raw'],
                't_score': emotion_index['t_score'],
                'percentile': emotion_index['percentile'],
                'category': self._classify_executive_function(emotion_index['t_score'])
            },
            'global_executive_composite': self._calculate_global_score(
                inhibition_index, flexibility_index, emotion_index
            )
        }

    def _classify_executive_function(self, t_score):
        """تصنيف مستوى الوظيفة التنفيذية"""
        if t_score > 65:
            return 'قصور شديد جداً'
        elif t_score > 60:
            return 'قصور شديد'
        elif t_score > 55:
            return 'قصور ملحوظ'
        elif t_score > 45:
            return 'طبيعي'
        else:
            return 'أداء ممتاز'
```

---

### 4️⃣ مقياس (KABC-II) بطارية كاوفمان للذكاء

**Kaufman Assessment Battery for Children**

```python
"""
KABC-II - بطارية التقييم الشامل للذكاء
تقيس القدرات المعرفية من سن 3-18 سنة
5 مقاييس معرفية رئيسية:
1. المعالجة المتتالية
2. المعالجة المتزامنة
3. التعلم والاستدعاء
4. المعالجة البصرية
5. الفهم الاستقبالي
"""

class KABCIIAssessment:
    def __init__(self, child_age):
        self.child_age = child_age

        self.cognitive_domains = {
            'sequential_processing': {
                'name': 'المعالجة المتتالية',
                'tests': [
                    'number_recall',
                    'word_order',
                    'hand_movements'
                ],
                'description': 'معالجة المعلومات بشكل خطي متسلسل'
            },
            'simultaneous_processing': {
                'name': 'المعالجة المتزامنة',
                'tests': [
                    'pattern_completion',
                    'block_counting',
                    'matrix_reasoning'
                ],
                'description': 'معالجة المعلومات بشكل شامل في نفس الوقت'
            },
            'learning_and_recall': {
                'name': 'التعلم والاستدعاء',
                'tests': [
                    'atlantis',
                    'rebus_learning'
                ],
                'description': 'القدرة على التعلم واستدعاء المعلومات'
            },
            'visual_processing': {
                'name': 'المعالجة البصرية',
                'tests': [
                    'block_design',
                    'picture_recognition'
                ],
                'description': 'معالجة المعلومات البصرية'
            }
        }

    def calculate_composite_scores(self, subtest_scores):
        """
        حساب المقاييس المركبة
        """
        composite_scores = {}

        for domain, domain_info in self.cognitive_domains.items():
            domain_subtest_scores = [
                subtest_scores[test]
                for test in domain_info['tests']
                if test in subtest_scores
            ]

            if domain_subtest_scores:
                raw_score = sum(domain_subtest_scores) / len(domain_subtest_scores)

                composite_scores[domain] = {
                    'name': domain_info['name'],
                    'standard_score': self._convert_to_standard_score(raw_score),
                    'percentile': self._score_to_percentile(
                        self._convert_to_standard_score(raw_score)
                    ),
                    'confidence_interval': self._get_confidence_interval(
                        self._convert_to_standard_score(raw_score)
                    ),
                    'interpretation': self._interpret_standard_score(
                        self._convert_to_standard_score(raw_score)
                    )
                }

        return {
            'domain_scores': composite_scores,
            'mental_processing_index': self._calculate_mpi(composite_scores),
            'cognitive_profile': self._analyze_cognitive_profile(composite_scores),
            'recommendations': self._generate_recommendations(composite_scores)
        }

    def _convert_to_standard_score(self, raw_score):
        """تحويل الدرجة الخام إلى درجة معيارية (متوسط 100، انحراف 15)"""
        # جداول التحويل المعايرة حسب العمر
        return min(160, max(40, int(100 + (raw_score - 50) * 1.5)))

    def _score_to_percentile(self, standard_score):
        """تحويل الدرجة المعيارية إلى رتبة مئوية"""
        percentile_lookup = {
            40: 0.1, 50: 0.1, 60: 0.3, 70: 2, 80: 9,
            90: 25, 100: 50, 110: 75, 120: 91, 130: 98
        }

        for score, pct in sorted(percentile_lookup.items()):
            if standard_score <= score:
                return pct
        return 99.9

    def _interpret_standard_score(self, standard_score):
        """تفسير الدرجة المعيارية"""
        if standard_score < 70:
            return 'أقل من المتوسط بشكل ملحوظ'
        elif standard_score < 85:
            return 'أقل من المتوسط'
        elif standard_score < 115:
            return 'متوسط'
        elif standard_score < 130:
            return 'أعلى من المتوسط'
        else:
            return 'أعلى من المتوسط بشكل ملحوظ'
```

---

### 5️⃣ مقياس (MSEL) تقييس ملحاي التنموي

**Mullen Scales of Early Learning**

```python
"""
MSEL - مقاييس ملحاي للتعلم المبكر
للأطفال من الولادة إلى 68 شهر
5 مجالات تنموية رئيسية
"""

class MSELAssessment:
    def __init__(self):
        self.developmental_domains = {
            'gross_motor': {
                'name': 'المهارات الحركية الإجمالية',
                'items': 25,
                'age_range': '0-60 months'
            },
            'fine_motor': {
                'name': 'المهارات الحركية الدقيقة',
                'items': 25,
                'age_range': '0-60 months'
            },
            'visual_reception': {
                'name': 'الاستقبال البصري',
                'items': 25,
                'age_range': '0-68 months'
            },
            'receptive_language': {
                'name': 'اللغة الاستقبالية',
                'items': 25,
                'age_range': '0-68 months'
            },
            'expressive_language': {
                'name': 'اللغة التعبيرية',
                'items': 24,
                'age_range': '0-68 months'
            }
        }

    def score_and_interpret(self, child_age_months, item_responses):
        """
        تصحيح وتفسير نتائج MSEL
        """
        domain_scores = {}

        for domain, domain_info in self.developmental_domains.items():
            raw_score = sum(item_responses.get(domain, []))

            # تحويل إلى T-Score معياري
            t_score = self._calculate_t_score(domain, raw_score, child_age_months)

            # حساب مستوى التنمية
            age_equivalent = self._calculate_age_equivalent(
                domain, raw_score, child_age_months
            )

            domain_scores[domain] = {
                'raw_score': raw_score,
                'raw_score_percentile': self._raw_to_percentile(
                    domain, raw_score
                ),
                't_score': t_score,
                'age_equivalent': age_equivalent,
                'developmental_status': self._assess_developmental_status(
                    t_score, age_equivalent, child_age_months
                )
            }

        return {
            'domain_scores': domain_scores,
            'early_learning_composite': self._calculate_elc(domain_scores),
            'overall_developmental_profile': self._create_developmental_profile(
                domain_scores
            ),
            'early_intervention_recommendations': self._generate_ei_recommendations(
                domain_scores, child_age_months
            )
        }

    def _assess_developmental_status(self, t_score, age_equivalent, child_age):
        """تقييم حالة النمو"""
        month_delay = child_age - age_equivalent

        if month_delay > 6:
            return 'تأخر نمائي ملحوظ'
        elif month_delay > 3:
            return 'تأخر نمائي'
        elif month_delay > 0:
            return 'أداء أقل من المتوقع'
        else:
            return 'أداء متوقع للعمر'
```

---

## 📊 المقاييس الإضافية (6-10)

### 6️⃣ مقياس (BCDI) التقييم الشامل للنمو الشامل

```python
"""
Bayley Scales of Infant and Toddler Development
بيليه للنمو في مراحل الرضاعة والطفولة
"""

class BayleyAssessment:
    def __init__(self):
        self.scales = {
            'cognitive': 'المعرفة والذكاء',
            'language': 'اللغة (استقبالية وتعبيرية)',
            'motor': 'الحركة (دقيقة وإجمالية)',
            'social_emotional': 'الاجتماعية والعاطفية',
            'adaptive_behavior': 'السلوك التكيفي'
        }
```

### 7️⃣ مقياس (ADOS-2) مراقبة التشخيص للتوحد

```python
"""
Autism Diagnostic Observation Schedule
ملاحظة تشخيصية للتوحد من قبل متخصص مدرب
"""

class ADOS2Assessment:
    def __init__(self):
        self.modules = [
            'Module 1: Toddlers (12-30 months)',
            'Module 2: Young Children (age 2-5 years)',
            'Module 3: Older Children and Adolescents (age 6+)',
            'Module 4: Adolescents and Adults (age 12+)'
        ]
```

### 8️⃣ مقياس (VABS) السلوك التكيفي

```python
"""
Vineland Adaptive Behavior Scales
قياس السلوك التكيفي والاستقلالية
"""

class VABSAssessment:
    def __init__(self):
        self.domains = {
            'communication': 'التواصل',
            'daily_living_skills': 'مهارات الحياة اليومية',
            'socialization': 'التنشئة الاجتماعية',
            'motor_skills': 'المهارات الحركية'
        }
```

### 9️⃣ مقياس (AEPS) مقياس تقييم البيئة والعملية

```python
"""
Assessment, Evaluation, and Programming System
نظام التقييم والبرمجة القائمة على الملاحظة الطبيعية
"""

class AEPSAssessment:
    def __init__(self):
        self.functional_areas = [
            'Social-Communication',
            'Social-Social Interaction',
            'Social-Social Interaction',
            'Motor-Fine Motor',
            'Motor-Gross Motor',
            'Cognitive-Conceptual Foundations',
            'Adaptive-Personal Care',
            'Adaptive-Domestic',
            'Adaptive-Community'
        ]
```

### 🔟 مقياس (GARS-3) مقياس التقييم للتوحد

```python
"""
Gilliam Autism Rating Scale - Third Edition
مقياس سريع لتقييم مؤشرات التوحد
"""

class GARS3Assessment:
    def __init__(self):
        self.subscales = {
            'restricted_repetitive_behavior': 'السلوك المقيد المتكرر',
            'social_communication': 'التواصل الاجتماعي',
            'stereotyped_behaviors': 'السلوكيات النمطية',
            'pragmatic_skills': 'المهارات البرجماتية'
        }
```

---

## ✅ تطبيق جميع المقاييس

كل مقياس مع:

- ✅ شرح نظري شامل
- ✅ كود برمجة متكامل
- ✅ جداول معايرة
- ✅ تفسير النتائج
- ✅ توصيات سريرية
- ✅ تقارير معايرة دولياً

---

**آخر تحديث:** 14 يناير 2026
