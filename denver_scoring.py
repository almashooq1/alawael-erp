# -*- coding: utf-8 -*-
"""
نظام حساب الدرجات لمقياس دنفر للتطور النمائي DENVER II
Denver Developmental Screening Test II Scoring System
"""

from datetime import datetime
from typing import Dict, List, Tuple, Optional
from models import (
    DenverAssessment, DenverDomainScore, DenverResponse, DenverDomain, 
    DenverItem, DenverNorms, db
)


class DenverScoring:
    """فئة حساب درجات مقياس دنفر للتطور النمائي"""
    
    # مجالات التطور الأساسية
    DEVELOPMENTAL_DOMAINS = {
        'personal_social': 'PS',      # الشخصي الاجتماعي
        'fine_motor': 'FM',           # الحركة الدقيقة
        'language': 'L',              # اللغة
        'gross_motor': 'GM'           # الحركة الكبيرة
    }
    
    # تفسير النتائج
    RESULT_INTERPRETATIONS = {
        'normal': 'طبيعي',
        'suspect': 'مشكوك فيه',
        'untestable': 'غير قابل للاختبار',
        'abnormal': 'غير طبيعي'
    }
    
    # معايير التقييم
    ASSESSMENT_CRITERIA = {
        'pass_threshold': 0.75,       # 75% من البنود المناسبة للعمر
        'concern_threshold': 2,       # عدد البنود المثيرة للقلق
        'delay_months': 2            # شهرين تأخير للاعتبار مشكوك فيه
    }
    
    def __init__(self, assessment_id: int):
        """تهيئة نظام الحساب للتقييم المحدد"""
        self.assessment = DenverAssessment.query.get(assessment_id)
        if not self.assessment:
            raise ValueError(f"Assessment with ID {assessment_id} not found")
        
        self.responses = DenverResponse.query.filter_by(assessment_id=assessment_id).all()
        self.chronological_age = self.assessment.chronological_age_months or 0
        self.corrected_age = self.assessment.corrected_age_months or self.chronological_age
        self.use_corrected_age = self.assessment.is_premature and self.corrected_age != self.chronological_age
        
    def calculate_domain_scores(self) -> Dict[str, Dict]:
        """حساب درجات المجالات التطويرية"""
        domain_scores = {}
        
        # تجميع الاستجابات حسب المجال
        domain_responses = {}
        for response in self.responses:
            domain_code = response.item.domain.domain_code
            if domain_code not in domain_responses:
                domain_responses[domain_code] = []
            domain_responses[domain_code].append(response)
        
        # حساب درجة كل مجال
        for domain_code, responses in domain_responses.items():
            domain_score = self._calculate_single_domain_score(domain_code, responses)
            domain_scores[domain_code.lower()] = domain_score
            
        return domain_scores
    
    def _calculate_single_domain_score(self, domain_code: str, responses: List) -> Dict:
        """حساب درجة مجال واحد"""
        # إحصائيات أساسية
        total_items = len(responses)
        passed_items = sum(1 for r in responses if r.response_type == 'pass')
        failed_items = sum(1 for r in responses if r.response_type == 'fail')
        refused_items = sum(1 for r in responses if r.response_type == 'refuse')
        no_opportunity_items = sum(1 for r in responses if r.response_type == 'no_opportunity')
        
        # البنود المناسبة للعمر
        age_appropriate_items = self._get_age_appropriate_items(responses)
        age_appropriate_passed = sum(1 for r in age_appropriate_items if r.response_type == 'pass')
        
        # تحليل الأداء
        performance_analysis = self._analyze_domain_performance(responses, age_appropriate_items)
        
        # تحديد حالة المجال
        domain_status = self._determine_domain_status(
            age_appropriate_items, age_appropriate_passed, performance_analysis
        )
        
        # تقدير العمر التطويري
        developmental_age = self._estimate_developmental_age(responses, domain_code)
        
        # حساب التأخير
        delay_months = max(0, self.corrected_age - developmental_age) if developmental_age else 0
        
        return {
            'total_items_tested': total_items,
            'items_passed': passed_items,
            'items_failed': failed_items,
            'items_refused': refused_items,
            'items_no_opportunity': no_opportunity_items,
            'pass_percentage': (passed_items / total_items * 100) if total_items > 0 else 0,
            'fail_percentage': (failed_items / total_items * 100) if total_items > 0 else 0,
            'domain_status': domain_status,
            'developmental_age_months': developmental_age,
            'delay_months': delay_months,
            'age_appropriate_items': len(age_appropriate_items),
            'age_appropriate_passed': age_appropriate_passed,
            'performance_analysis': performance_analysis
        }
    
    def _get_age_appropriate_items(self, responses: List) -> List:
        """الحصول على البنود المناسبة للعمر"""
        age_to_use = self.corrected_age if self.use_corrected_age else self.chronological_age
        age_appropriate = []
        
        for response in responses:
            item = response.item
            # البند مناسب للعمر إذا كان العمر بين 25% و 90% من المعايير
            if (item.age_25_percentile and item.age_90_percentile and
                item.age_25_percentile <= age_to_use <= item.age_90_percentile):
                age_appropriate.append(response)
        
        return age_appropriate
    
    def _analyze_domain_performance(self, all_responses: List, age_appropriate: List) -> Dict:
        """تحليل أداء المجال"""
        analysis = {
            'concerns': [],
            'strengths': [],
            'patterns': []
        }
        
        # تحليل البنود المناسبة للعمر
        if age_appropriate:
            failed_age_appropriate = [r for r in age_appropriate if r.response_type == 'fail']
            
            if len(failed_age_appropriate) >= 2:
                analysis['concerns'].append("فشل في عدة بنود مناسبة للعمر")
            
            # تحليل الأنماط
            early_items_passed = sum(1 for r in all_responses 
                                   if r.response_type == 'pass' and 
                                   r.item.age_50_percentile and 
                                   r.item.age_50_percentile < self.corrected_age - 6)
            
            if early_items_passed > 0:
                analysis['strengths'].append(f"نجح في {early_items_passed} بند من المهارات المبكرة")
        
        # تحليل الرفض والفرص الضائعة
        refused_count = sum(1 for r in all_responses if r.response_type == 'refuse')
        if refused_count > 2:
            analysis['concerns'].append("رفض عدة بنود قد يؤثر على دقة التقييم")
        
        return analysis
    
    def _determine_domain_status(self, age_appropriate: List, passed_count: int, analysis: Dict) -> str:
        """تحديد حالة المجال"""
        if not age_appropriate:
            return 'untestable'
        
        total_age_appropriate = len(age_appropriate)
        pass_rate = passed_count / total_age_appropriate if total_age_appropriate > 0 else 0
        
        # معايير التقييم
        if pass_rate >= self.ASSESSMENT_CRITERIA['pass_threshold']:
            if len(analysis['concerns']) == 0:
                return 'normal'
            else:
                return 'suspect'
        elif pass_rate >= 0.5:
            return 'suspect'
        else:
            return 'abnormal'
    
    def _estimate_developmental_age(self, responses: List, domain_code: str) -> Optional[float]:
        """تقدير العمر التطويري للمجال"""
        passed_items = [r for r in responses if r.response_type == 'pass']
        
        if not passed_items:
            return None
        
        # العثور على أعلى بند نجح فيه الطفل
        highest_passed_age = 0
        for response in passed_items:
            item = response.item
            if item.age_50_percentile:
                highest_passed_age = max(highest_passed_age, item.age_50_percentile)
        
        # العثور على أقل بند فشل فيه الطفل
        failed_items = [r for r in responses if r.response_type == 'fail']
        lowest_failed_age = float('inf')
        for response in failed_items:
            item = response.item
            if item.age_50_percentile:
                lowest_failed_age = min(lowest_failed_age, item.age_50_percentile)
        
        # تقدير العمر التطويري
        if lowest_failed_age != float('inf'):
            developmental_age = (highest_passed_age + lowest_failed_age) / 2
        else:
            developmental_age = highest_passed_age
        
        return developmental_age if developmental_age > 0 else None
    
    def calculate_overall_result(self, domain_scores: Dict) -> Dict:
        """حساب النتيجة الإجمالية"""
        domain_statuses = [score['domain_status'] for score in domain_scores.values()]
        
        # إحصائيات عامة
        total_items = sum(score['total_items_tested'] for score in domain_scores.values())
        total_passed = sum(score['items_passed'] for score in domain_scores.values())
        total_failed = sum(score['items_failed'] for score in domain_scores.values())
        total_refused = sum(score['items_refused'] for score in domain_scores.values())
        total_no_opportunity = sum(score['items_no_opportunity'] for score in domain_scores.values())
        
        # تحديد النتيجة الإجمالية
        if 'abnormal' in domain_statuses:
            overall_result = 'abnormal'
        elif domain_statuses.count('suspect') >= 2:
            overall_result = 'suspect'
        elif 'suspect' in domain_statuses:
            overall_result = 'suspect'
        elif 'untestable' in domain_statuses and len([s for s in domain_statuses if s == 'normal']) < 2:
            overall_result = 'untestable'
        else:
            overall_result = 'normal'
        
        return {
            'overall_result': overall_result,
            'total_items_administered': total_items,
            'items_passed': total_passed,
            'items_failed': total_failed,
            'items_refused': total_refused,
            'items_no_opportunity': total_no_opportunity
        }
    
    def generate_clinical_interpretation(self, domain_scores: Dict, overall_result: Dict) -> Dict:
        """توليد التفسير الإكلينيكي"""
        interpretation = {
            'developmental_summary': self._generate_developmental_summary(overall_result),
            'domain_analysis': self._analyze_domains(domain_scores),
            'areas_of_strength': self._identify_strengths(domain_scores),
            'areas_of_concern': self._identify_concerns(domain_scores),
            'recommendations': self._generate_recommendations(domain_scores, overall_result),
            'follow_up_plan': self._create_follow_up_plan(overall_result)
        }
        
        return interpretation
    
    def _generate_developmental_summary(self, overall_result: Dict) -> str:
        """توليد ملخص التطور"""
        result = overall_result['overall_result']
        
        if result == 'normal':
            return "يُظهر الطفل تطوراً طبيعياً في المجالات المختبرة مناسباً لعمره الزمني"
        elif result == 'suspect':
            return "توجد مؤشرات تستدعي المتابعة والمراقبة في بعض جوانب التطور"
        elif result == 'abnormal':
            return "يُظهر الطفل تأخيراً واضحاً في التطور يتطلب تقييماً شاملاً وتدخلاً"
        else:
            return "لم يتمكن من إكمال التقييم بشكل كافٍ لإصدار حكم موثوق"
    
    def _analyze_domains(self, domain_scores: Dict) -> str:
        """تحليل المجالات"""
        domain_names = {
            'ps': 'الشخصي الاجتماعي',
            'fm': 'الحركة الدقيقة',
            'l': 'اللغة',
            'gm': 'الحركة الكبيرة'
        }
        
        analysis = []
        for domain_code, scores in domain_scores.items():
            domain_name = domain_names.get(domain_code, domain_code)
            status = scores['domain_status']
            
            if status == 'normal':
                analysis.append(f"{domain_name}: طبيعي")
            elif status == 'suspect':
                analysis.append(f"{domain_name}: مشكوك فيه")
            elif status == 'abnormal':
                analysis.append(f"{domain_name}: غير طبيعي")
            else:
                analysis.append(f"{domain_name}: غير قابل للاختبار")
        
        return "؛ ".join(analysis)
    
    def _identify_strengths(self, domain_scores: Dict) -> str:
        """تحديد نقاط القوة"""
        strengths = []
        
        for domain_code, scores in domain_scores.items():
            if scores['domain_status'] == 'normal' and scores['pass_percentage'] > 80:
                domain_names = {
                    'ps': 'المهارات الشخصية الاجتماعية',
                    'fm': 'المهارات الحركية الدقيقة',
                    'l': 'المهارات اللغوية',
                    'gm': 'المهارات الحركية الكبيرة'
                }
                domain_name = domain_names.get(domain_code, domain_code)
                strengths.append(domain_name)
        
        if strengths:
            return "نقاط القوة تشمل: " + "، ".join(strengths)
        else:
            return "لم تُحدد نقاط قوة واضحة في هذا التقييم"
    
    def _identify_concerns(self, domain_scores: Dict) -> str:
        """تحديد مجالات القلق"""
        concerns = []
        
        for domain_code, scores in domain_scores.items():
            if scores['domain_status'] in ['suspect', 'abnormal']:
                domain_names = {
                    'ps': 'التطور الشخصي الاجتماعي',
                    'fm': 'التطور الحركي الدقيق',
                    'l': 'التطور اللغوي',
                    'gm': 'التطور الحركي الكبير'
                }
                domain_name = domain_names.get(domain_code, domain_code)
                delay = scores.get('delay_months', 0)
                if delay > 0:
                    concerns.append(f"{domain_name} (تأخير {delay:.1f} شهر)")
                else:
                    concerns.append(domain_name)
        
        if concerns:
            return "مجالات القلق تشمل: " + "، ".join(concerns)
        else:
            return "لا توجد مجالات قلق واضحة"
    
    def _generate_recommendations(self, domain_scores: Dict, overall_result: Dict) -> str:
        """توليد التوصيات"""
        result = overall_result['overall_result']
        recommendations = []
        
        if result == 'normal':
            recommendations.extend([
                "متابعة التطور الطبيعي",
                "تشجيع الأنشطة التطويرية المناسبة للعمر",
                "إعادة الفحص في الموعد الروتيني التالي"
            ])
        elif result == 'suspect':
            recommendations.extend([
                "إعادة التقييم خلال شهر إلى شهرين",
                "تقديم الأنشطة التحفيزية في المجالات المشكوك فيها",
                "مراقبة التطور عن كثب"
            ])
        elif result == 'abnormal':
            recommendations.extend([
                "إحالة فورية لتقييم تطويري شامل",
                "استشارة أخصائي تطور الأطفال",
                "النظر في خدمات التدخل المبكر",
                "تقييم طبي شامل"
            ])
        else:
            recommendations.extend([
                "إعادة المحاولة في بيئة أكثر مناسبة",
                "ضمان تعاون الطفل وراحته",
                "النظر في عوامل قد تؤثر على الأداء"
            ])
        
        # توصيات خاصة بالمجالات
        for domain_code, scores in domain_scores.items():
            if scores['domain_status'] in ['suspect', 'abnormal']:
                if domain_code == 'l':
                    recommendations.append("تقييم سمعي شامل")
                elif domain_code in ['fm', 'gm']:
                    recommendations.append("تقييم العلاج الطبيعي/الوظيفي")
                elif domain_code == 'ps':
                    recommendations.append("تقييم المهارات الاجتماعية والسلوكية")
        
        return "؛ ".join(recommendations)
    
    def _create_follow_up_plan(self, overall_result: Dict) -> str:
        """إنشاء خطة المتابعة"""
        result = overall_result['overall_result']
        
        if result == 'normal':
            return "متابعة روتينية حسب جدول الفحوصات التطويرية"
        elif result == 'suspect':
            return "إعادة التقييم خلال 1-2 شهر، مراقبة مستمرة للتطور"
        elif result == 'abnormal':
            return "متابعة فورية مع المختصين، تقييم شامل خلال أسبوعين"
        else:
            return "إعادة التقييم خلال أسبوع في ظروف أفضل"
    
    def calculate_complete_assessment(self) -> Tuple[Dict, Dict]:
        """حساب التقييم الكامل"""
        # حساب درجات المجالات
        domain_scores = self.calculate_domain_scores()
        
        # حساب النتيجة الإجمالية
        overall_result = self.calculate_overall_result(domain_scores)
        
        # حفظ درجات المجالات في قاعدة البيانات
        for domain_code, scores in domain_scores.items():
            domain = DenverDomain.query.filter_by(domain_code=domain_code.upper()).first()
            if domain:
                domain_score = DenverDomainScore.query.filter_by(
                    assessment_id=self.assessment.id,
                    domain_id=domain.id
                ).first()
                
                if not domain_score:
                    domain_score = DenverDomainScore(
                        assessment_id=self.assessment.id,
                        domain_id=domain.id
                    )
                    db.session.add(domain_score)
                
                # تحديث البيانات
                domain_score.total_items_tested = scores['total_items_tested']
                domain_score.items_passed = scores['items_passed']
                domain_score.items_failed = scores['items_failed']
                domain_score.items_refused = scores['items_refused']
                domain_score.items_no_opportunity = scores['items_no_opportunity']
                domain_score.pass_percentage = scores['pass_percentage']
                domain_score.fail_percentage = scores['fail_percentage']
                domain_score.domain_status = scores['domain_status']
                domain_score.developmental_age_months = scores['developmental_age_months']
                domain_score.delay_months = scores['delay_months']
        
        # تحديث التقييم الرئيسي
        self.assessment.total_items_administered = overall_result['total_items_administered']
        self.assessment.items_passed = overall_result['items_passed']
        self.assessment.items_failed = overall_result['items_failed']
        self.assessment.items_refused = overall_result['items_refused']
        self.assessment.items_no_opportunity = overall_result['items_no_opportunity']
        self.assessment.overall_result = overall_result['overall_result']
        
        # توليد التفسير الإكلينيكي
        clinical_interpretation = self.generate_clinical_interpretation(domain_scores, overall_result)
        
        self.assessment.areas_of_strength = clinical_interpretation['areas_of_strength']
        self.assessment.areas_of_concern = clinical_interpretation['areas_of_concern']
        self.assessment.recommendations = clinical_interpretation['recommendations']
        
        # تحديد المتابعة
        if overall_result['overall_result'] in ['suspect', 'abnormal']:
            self.assessment.follow_up_needed = True
            if overall_result['overall_result'] == 'abnormal':
                self.assessment.follow_up_timeframe = '2 weeks'
                self.assessment.referral_needed = True
            else:
                self.assessment.follow_up_timeframe = '1-2 months'
        
        db.session.commit()
        
        return domain_scores, overall_result


def calculate_denver_scores(assessment_id: int) -> Dict:
    """دالة مساعدة لحساب درجات Denver"""
    try:
        scorer = DenverScoring(assessment_id)
        domain_scores, overall_result = scorer.calculate_complete_assessment()
        
        # توليد التفسير الإكلينيكي
        clinical_interpretation = scorer.generate_clinical_interpretation(domain_scores, overall_result)
        
        return {
            'success': True,
            'domain_scores': domain_scores,
            'overall_result': overall_result,
            'interpretation': clinical_interpretation,
            'message': 'تم حساب درجات مقياس دنفر بنجاح'
        }
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e),
            'message': 'حدث خطأ أثناء حساب الدرجات'
        }
