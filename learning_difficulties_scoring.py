# -*- coding: utf-8 -*-
"""
نظام حساب الدرجات لمقياس صعوبات التعلم النمائية
Developmental Learning Difficulties Scale Scoring System
"""

from datetime import datetime
from sqlalchemy import and_
from models import (
    db, LearningDifficultiesAssessment, LearningDifficultiesResponse, 
    LearningDifficultiesScore, LearningDifficultiesNorms, LearningDifficultiesDomain,
    LearningDifficultiesItem
)
import logging
import json

# إعداد نظام السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# المعايير الثابتة للمقياس
DOMAIN_WEIGHTS = {
    'attention': 0.18,      # الانتباه
    'memory': 0.16,         # الذاكرة  
    'perception': 0.15,     # الإدراك
    'motor_skills': 0.13,   # المهارات الحركية
    'language': 0.19,       # اللغة
    'thinking': 0.12,       # التفكير
    'academic_readiness': 0.07  # الاستعداد الأكاديمي
}

# معايير تصنيف مستويات الخطر
RISK_LEVELS = {
    'low': {'min': 85, 'max': 115, 'label_ar': 'منخفض', 'color': 'green'},
    'moderate': {'min': 70, 'max': 84, 'label_ar': 'متوسط', 'color': 'yellow'},
    'high': {'min': 55, 'max': 69, 'label_ar': 'عالي', 'color': 'orange'},
    'very_high': {'min': 0, 'max': 54, 'label_ar': 'عالي جداً', 'color': 'red'}
}

# معايير التصنيف العام
OVERALL_CLASSIFICATIONS = {
    'no_difficulty': {'min': 85, 'max': 115, 'label_ar': 'لا توجد صعوبة'},
    'mild': {'min': 70, 'max': 84, 'label_ar': 'صعوبة خفيفة'},
    'moderate': {'min': 55, 'max': 69, 'label_ar': 'صعوبة متوسطة'},
    'severe': {'min': 0, 'max': 54, 'label_ar': 'صعوبة شديدة'}
}

def calculate_raw_scores(assessment_id):
    """حساب الدرجات الخام لجميع المجالات"""
    try:
        # استرجاع جميع الاستجابات للتقييم
        responses = db.session.query(LearningDifficultiesResponse)\
            .join(LearningDifficultiesItem)\
            .join(LearningDifficultiesDomain)\
            .filter(LearningDifficultiesResponse.assessment_id == assessment_id)\
            .all()
        
        if not responses:
            logger.warning(f"لا توجد استجابات للتقييم {assessment_id}")
            return None
        
        # تجميع الدرجات حسب المجال
        domain_scores = {}
        domain_counts = {}
        
        for response in responses:
            domain_code = response.item.domain.domain_code.lower()
            
            if domain_code not in domain_scores:
                domain_scores[domain_code] = 0
                domain_counts[domain_code] = 0
            
            if response.response_value is not None:
                domain_scores[domain_code] += response.response_value
                domain_counts[domain_code] += 1
        
        # حساب المتوسطات للمجالات
        raw_scores = {}
        for domain_code in DOMAIN_WEIGHTS.keys():
            if domain_code in domain_scores and domain_counts[domain_code] > 0:
                raw_scores[domain_code] = domain_scores[domain_code]
            else:
                raw_scores[domain_code] = 0
                logger.warning(f"لا توجد استجابات صالحة لمجال {domain_code}")
        
        logger.info(f"تم حساب الدرجات الخام للتقييم {assessment_id}")
        return raw_scores
        
    except Exception as e:
        logger.error(f"خطأ في حساب الدرجات الخام: {str(e)}")
        return None

def convert_to_standard_scores(raw_scores, student_age, student_gender='combined'):
    """تحويل الدرجات الخام إلى درجات معيارية"""
    try:
        # تحديد المجموعة العمرية
        age_group = get_age_group(student_age)
        
        # استرجاع المعايير المناسبة
        norms = db.session.query(LearningDifficultiesNorms)\
            .filter(and_(
                LearningDifficultiesNorms.age_group == age_group,
                LearningDifficultiesNorms.gender == student_gender
            )).first()
        
        if not norms:
            # استخدام المعايير المدمجة إذا لم توجد معايير محددة
            norms = db.session.query(LearningDifficultiesNorms)\
                .filter(and_(
                    LearningDifficultiesNorms.age_group == age_group,
                    LearningDifficultiesNorms.gender == 'combined'
                )).first()
        
        if not norms:
            logger.warning(f"لا توجد معايير للمجموعة العمرية {age_group}")
            # استخدام معايير افتراضية
            return convert_with_default_norms(raw_scores)
        
        standard_scores = {}
        
        # تحويل كل مجال إلى درجة معيارية
        for domain in DOMAIN_WEIGHTS.keys():
            raw_score = raw_scores.get(domain, 0)
            
            # الحصول على المتوسط والانحراف المعياري للمجال
            mean = getattr(norms, f"{domain}_mean", 50.0)
            sd = getattr(norms, f"{domain}_sd", 10.0)
            
            # حساب الدرجة المعيارية (متوسط = 100, انحراف معياري = 15)
            if sd > 0:
                z_score = (raw_score - mean) / sd
                standard_score = int(100 + (z_score * 15))
                # تحديد النطاق (40-160)
                standard_score = max(40, min(160, standard_score))
            else:
                standard_score = 100
            
            standard_scores[domain] = standard_score
        
        logger.info("تم تحويل الدرجات إلى درجات معيارية")
        return standard_scores
        
    except Exception as e:
        logger.error(f"خطأ في تحويل الدرجات المعيارية: {str(e)}")
        return convert_with_default_norms(raw_scores)

def convert_with_default_norms(raw_scores):
    """تحويل باستخدام معايير افتراضية"""
    standard_scores = {}
    
    # معايير افتراضية بسيطة
    default_means = {
        'attention': 25, 'memory': 22, 'perception': 20, 'motor_skills': 18,
        'language': 28, 'thinking': 16, 'academic_readiness': 12
    }
    
    default_sds = {
        'attention': 5, 'memory': 4.5, 'perception': 4, 'motor_skills': 3.5,
        'language': 5.5, 'thinking': 3, 'academic_readiness': 2.5
    }
    
    for domain in DOMAIN_WEIGHTS.keys():
        raw_score = raw_scores.get(domain, 0)
        mean = default_means.get(domain, 20)
        sd = default_sds.get(domain, 4)
        
        z_score = (raw_score - mean) / sd
        standard_score = int(100 + (z_score * 15))
        standard_score = max(40, min(160, standard_score))
        
        standard_scores[domain] = standard_score
    
    return standard_scores

def calculate_composite_scores(standard_scores):
    """حساب الدرجات المركبة"""
    try:
        # المؤشر المعرفي (الانتباه + الذاكرة + الإدراك + التفكير)
        cognitive_domains = ['attention', 'memory', 'perception', 'thinking']
        cognitive_scores = [standard_scores.get(domain, 100) for domain in cognitive_domains]
        cognitive_composite = int(sum(cognitive_scores) / len(cognitive_scores))
        
        # المؤشر الأكاديمي (اللغة + المهارات الحركية + الاستعداد الأكاديمي)
        academic_domains = ['language', 'motor_skills', 'academic_readiness']
        academic_scores = [standard_scores.get(domain, 100) for domain in academic_domains]
        academic_composite = int(sum(academic_scores) / len(academic_scores))
        
        # المؤشر العام لصعوبات التعلم (متوسط مرجح لجميع المجالات)
        weighted_sum = sum(standard_scores.get(domain, 100) * weight 
                          for domain, weight in DOMAIN_WEIGHTS.items())
        overall_index = int(weighted_sum)
        
        composite_scores = {
            'cognitive_composite': cognitive_composite,
            'academic_composite': academic_composite,
            'overall_index': overall_index
        }
        
        logger.info("تم حساب الدرجات المركبة")
        return composite_scores
        
    except Exception as e:
        logger.error(f"خطأ في حساب الدرجات المركبة: {str(e)}")
        return {
            'cognitive_composite': 100,
            'academic_composite': 100,
            'overall_index': 100
        }

def calculate_percentiles(standard_scores, composite_scores):
    """حساب الرتب المئوية"""
    try:
        percentiles = {}
        
        # حساب الرتب المئوية للدرجات المعيارية
        for domain, score in standard_scores.items():
            percentile = standard_score_to_percentile(score)
            percentiles[f"{domain}_percentile"] = percentile
        
        # حساب الرتب المئوية للدرجات المركبة
        percentiles['cognitive_percentile'] = standard_score_to_percentile(
            composite_scores['cognitive_composite'])
        percentiles['academic_percentile'] = standard_score_to_percentile(
            composite_scores['academic_composite'])
        percentiles['overall_percentile'] = standard_score_to_percentile(
            composite_scores['overall_index'])
        
        logger.info("تم حساب الرتب المئوية")
        return percentiles
        
    except Exception as e:
        logger.error(f"خطأ في حساب الرتب المئوية: {str(e)}")
        return {}

def standard_score_to_percentile(standard_score):
    """تحويل الدرجة المعيارية إلى رتبة مئوية"""
    # استخدام جدول التوزيع الطبيعي المعياري
    z_score = (standard_score - 100) / 15
    
    # تقريب بسيط للرتبة المئوية
    if z_score <= -3.0:
        return 0.1
    elif z_score <= -2.0:
        return 2.3
    elif z_score <= -1.5:
        return 6.7
    elif z_score <= -1.0:
        return 15.9
    elif z_score <= -0.5:
        return 30.9
    elif z_score <= 0.0:
        return 50.0
    elif z_score <= 0.5:
        return 69.1
    elif z_score <= 1.0:
        return 84.1
    elif z_score <= 1.5:
        return 93.3
    elif z_score <= 2.0:
        return 97.7
    elif z_score <= 3.0:
        return 99.9
    else:
        return 99.9

def determine_risk_levels(standard_scores):
    """تحديد مستويات الخطر لكل مجال"""
    try:
        risk_levels = {}
        
        for domain, score in standard_scores.items():
            risk_level = 'low'  # افتراضي
            
            for level, criteria in RISK_LEVELS.items():
                if criteria['min'] <= score <= criteria['max']:
                    risk_level = level
                    break
            
            risk_levels[f"{domain}_risk_level"] = risk_level
        
        logger.info("تم تحديد مستويات الخطر")
        return risk_levels
        
    except Exception as e:
        logger.error(f"خطأ في تحديد مستويات الخطر: {str(e)}")
        return {}

def determine_overall_classification(overall_index):
    """تحديد التصنيف العام لصعوبات التعلم"""
    try:
        classification = 'no_difficulty'  # افتراضي
        
        for class_type, criteria in OVERALL_CLASSIFICATIONS.items():
            if criteria['min'] <= overall_index <= criteria['max']:
                classification = class_type
                break
        
        logger.info(f"التصنيف العام: {classification}")
        return classification
        
    except Exception as e:
        logger.error(f"خطأ في تحديد التصنيف العام: {str(e)}")
        return 'no_difficulty'

def determine_learning_profile_type(standard_scores):
    """تحديد نوع الملف التعليمي"""
    try:
        # تحليل نمط القوة والضعف
        cognitive_domains = ['attention', 'memory', 'perception', 'thinking']
        academic_domains = ['language', 'motor_skills', 'academic_readiness']
        
        cognitive_avg = sum(standard_scores.get(d, 100) for d in cognitive_domains) / len(cognitive_domains)
        academic_avg = sum(standard_scores.get(d, 100) for d in academic_domains) / len(academic_domains)
        
        # تحديد النمط
        if cognitive_avg < 85 and academic_avg < 85:
            profile_type = 'global_difficulties'  # صعوبات شاملة
        elif cognitive_avg < 85 and academic_avg >= 85:
            profile_type = 'cognitive_specific'  # صعوبات معرفية محددة
        elif cognitive_avg >= 85 and academic_avg < 85:
            profile_type = 'academic_specific'  # صعوبات أكاديمية محددة
        elif abs(cognitive_avg - academic_avg) > 15:
            profile_type = 'mixed_profile'  # ملف مختلط
        else:
            profile_type = 'balanced_profile'  # ملف متوازن
        
        logger.info(f"نوع الملف التعليمي: {profile_type}")
        return profile_type
        
    except Exception as e:
        logger.error(f"خطأ في تحديد نوع الملف التعليمي: {str(e)}")
        return 'balanced_profile'

def get_age_group(age_years):
    """تحديد المجموعة العمرية"""
    if age_years < 5:
        return '4-5'
    elif age_years < 7:
        return '6-7'
    elif age_years < 9:
        return '8-9'
    elif age_years < 11:
        return '10-11'
    elif age_years < 13:
        return '12-13'
    else:
        return '14+'

def calculate_age(birth_date):
    """حساب العمر بالسنوات"""
    if not birth_date:
        return 8  # عمر افتراضي
    
    today = datetime.now().date()
    if isinstance(birth_date, datetime):
        birth_date = birth_date.date()
    
    age = today.year - birth_date.year
    if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
        age -= 1
    
    return max(4, min(18, age))  # تحديد النطاق العمري

def save_scores_to_database(assessment_id, raw_scores, standard_scores, composite_scores, 
                           percentiles, risk_levels, overall_classification, learning_profile_type):
    """حفظ النتائج في قاعدة البيانات"""
    try:
        # البحث عن سجل درجات موجود أو إنشاء جديد
        score_record = db.session.query(LearningDifficultiesScore)\
            .filter_by(assessment_id=assessment_id).first()
        
        if not score_record:
            score_record = LearningDifficultiesScore(assessment_id=assessment_id)
        
        # حفظ الدرجات الخام
        for domain in DOMAIN_WEIGHTS.keys():
            setattr(score_record, f"{domain}_raw_score", raw_scores.get(domain, 0))
        
        # حفظ الدرجات المعيارية
        for domain in DOMAIN_WEIGHTS.keys():
            setattr(score_record, f"{domain}_standard_score", standard_scores.get(domain, 100))
        
        # حفظ الدرجات المركبة
        score_record.cognitive_composite_score = composite_scores['cognitive_composite']
        score_record.academic_composite_score = composite_scores['academic_composite']
        score_record.overall_learning_difficulties_index = composite_scores['overall_index']
        
        # حفظ الرتب المئوية
        score_record.cognitive_percentile = percentiles.get('cognitive_percentile', 50.0)
        score_record.academic_percentile = percentiles.get('academic_percentile', 50.0)
        score_record.overall_percentile = percentiles.get('overall_percentile', 50.0)
        
        # حفظ مستويات الخطر
        for domain in DOMAIN_WEIGHTS.keys():
            setattr(score_record, f"{domain}_risk_level", risk_levels.get(f"{domain}_risk_level", 'low'))
        
        # حفظ التصنيف العام ونوع الملف
        score_record.overall_classification = overall_classification
        score_record.learning_profile_type = learning_profile_type
        
        # إضافة إلى الجلسة وحفظ
        db.session.add(score_record)
        db.session.commit()
        
        logger.info(f"تم حفظ النتائج للتقييم {assessment_id}")
        return True
        
    except Exception as e:
        logger.error(f"خطأ في حفظ النتائج: {str(e)}")
        db.session.rollback()
        return False

def calculate_learning_difficulties_scores(assessment_id):
    """الوظيفة الرئيسية لحساب جميع درجات مقياس صعوبات التعلم النمائية"""
    try:
        logger.info(f"بدء حساب درجات مقياس صعوبات التعلم للتقييم {assessment_id}")
        
        # استرجاع معلومات التقييم
        assessment = db.session.query(LearningDifficultiesAssessment).get(assessment_id)
        if not assessment:
            logger.error(f"لا يمكن العثور على التقييم {assessment_id}")
            return None
        
        # حساب عمر الطالب
        student_age = calculate_age(assessment.student.birth_date)
        student_gender = getattr(assessment.student, 'gender', 'combined')
        
        # الخطوة 1: حساب الدرجات الخام
        raw_scores = calculate_raw_scores(assessment_id)
        if not raw_scores:
            logger.error("فشل في حساب الدرجات الخام")
            return None
        
        # الخطوة 2: تحويل إلى درجات معيارية
        standard_scores = convert_to_standard_scores(raw_scores, student_age, student_gender)
        
        # الخطوة 3: حساب الدرجات المركبة
        composite_scores = calculate_composite_scores(standard_scores)
        
        # الخطوة 4: حساب الرتب المئوية
        percentiles = calculate_percentiles(standard_scores, composite_scores)
        
        # الخطوة 5: تحديد مستويات الخطر
        risk_levels = determine_risk_levels(standard_scores)
        
        # الخطوة 6: تحديد التصنيف العام
        overall_classification = determine_overall_classification(composite_scores['overall_index'])
        
        # الخطوة 7: تحديد نوع الملف التعليمي
        learning_profile_type = determine_learning_profile_type(standard_scores)
        
        # الخطوة 8: حفظ النتائج في قاعدة البيانات
        success = save_scores_to_database(
            assessment_id, raw_scores, standard_scores, composite_scores,
            percentiles, risk_levels, overall_classification, learning_profile_type
        )
        
        if not success:
            logger.error("فشل في حفظ النتائج في قاعدة البيانات")
            return None
        
        # إنشاء ملخص النتائج
        results = {
            'assessment_id': assessment_id,
            'student_name': assessment.student.name,
            'assessment_date': assessment.assessment_date.strftime('%Y-%m-%d'),
            'raw_scores': raw_scores,
            'standard_scores': standard_scores,
            'composite_scores': composite_scores,
            'percentiles': percentiles,
            'risk_levels': risk_levels,
            'overall_classification': overall_classification,
            'learning_profile_type': learning_profile_type,
            'success': True
        }
        
        logger.info(f"تم إكمال حساب درجات مقياس صعوبات التعلم للتقييم {assessment_id}")
        return results
        
    except Exception as e:
        logger.error(f"خطأ عام في حساب درجات مقياس صعوبات التعلم: {str(e)}")
        return {
            'assessment_id': assessment_id,
            'success': False,
            'error': str(e)
        }

# وظائف مساعدة إضافية
def get_risk_level_label(risk_level):
    """الحصول على تسمية مستوى الخطر بالعربية"""
    return RISK_LEVELS.get(risk_level, {}).get('label_ar', 'غير محدد')

def get_classification_label(classification):
    """الحصول على تسمية التصنيف بالعربية"""
    return OVERALL_CLASSIFICATIONS.get(classification, {}).get('label_ar', 'غير محدد')

def get_profile_type_label(profile_type):
    """الحصول على تسمية نوع الملف التعليمي بالعربية"""
    labels = {
        'global_difficulties': 'صعوبات شاملة',
        'cognitive_specific': 'صعوبات معرفية محددة',
        'academic_specific': 'صعوبات أكاديمية محددة',
        'mixed_profile': 'ملف مختلط',
        'balanced_profile': 'ملف متوازن'
    }
    return labels.get(profile_type, 'غير محدد')

def generate_clinical_interpretation(assessment_id, scores_data):
    """إنتاج التفسير الإكلينيكي"""
    try:
        assessment = db.session.query(LearningDifficultiesAssessment).get(assessment_id)
        if not assessment:
            return "لا يمكن العثور على التقييم"
        
        interpretation = []
        
        # المقدمة
        interpretation.append(f"تم إجراء تقييم شامل لصعوبات التعلم النمائية للطالب/ة {assessment.student.name}")
        interpretation.append(f"بتاريخ {assessment.assessment_date.strftime('%Y-%m-%d')}")
        
        # النتائج العامة
        overall_index = scores_data.get('overall_index', 100)
        overall_classification = scores_data.get('overall_classification', 'no_difficulty')
        classification_label = get_classification_label(overall_classification)
        
        interpretation.append(f"\nالنتيجة العامة:")
        interpretation.append(f"مؤشر صعوبات التعلم العام: {overall_index}")
        interpretation.append(f"التصنيف: {classification_label}")
        
        # تحليل المجالات
        interpretation.append(f"\nتحليل المجالات:")
        
        domain_labels = {
            'attention': 'الانتباه',
            'memory': 'الذاكرة',
            'perception': 'الإدراك',
            'motor_skills': 'المهارات الحركية',
            'language': 'اللغة',
            'thinking': 'التفكير',
            'academic_readiness': 'الاستعداد الأكاديمي'
        }
        
        strengths = []
        concerns = []
        
        for domain, label in domain_labels.items():
            score = scores_data.get(f"{domain}_standard_score", 100)
            risk_level = scores_data.get(f"{domain}_risk_level", 'low')
            risk_label = get_risk_level_label(risk_level)
            
            if score >= 85:
                strengths.append(f"- {label}: {score} (مستوى الخطر: {risk_label})")
            else:
                concerns.append(f"- {label}: {score} (مستوى الخطر: {risk_label})")
        
        if strengths:
            interpretation.append(f"\nمجالات القوة:")
            interpretation.extend(strengths)
        
        if concerns:
            interpretation.append(f"\nمجالات تحتاج إلى اهتمام:")
            interpretation.extend(concerns)
        
        # الدرجات المركبة
        cognitive_composite = scores_data.get('cognitive_composite', 100)
        academic_composite = scores_data.get('academic_composite', 100)
        
        interpretation.append(f"\nالدرجات المركبة:")
        interpretation.append(f"- المؤشر المعرفي: {cognitive_composite}")
        interpretation.append(f"- المؤشر الأكاديمي: {academic_composite}")
        
        # نوع الملف التعليمي
        profile_type = scores_data.get('learning_profile_type', 'balanced_profile')
        profile_label = get_profile_type_label(profile_type)
        
        interpretation.append(f"\nنوع الملف التعليمي: {profile_label}")
        
        return '\n'.join(interpretation)
        
    except Exception as e:
        logger.error(f"خطأ في إنتاج التفسير الإكلينيكي: {str(e)}")
        return "حدث خطأ في إنتاج التفسير الإكلينيكي"

def generate_recommendations(assessment_id, scores_data):
    """إنتاج التوصيات"""
    try:
        recommendations = []
        
        overall_classification = scores_data.get('overall_classification', 'no_difficulty')
        
        # توصيات عامة حسب التصنيف
        if overall_classification == 'no_difficulty':
            recommendations.append("• متابعة الأداء الأكاديمي العادي مع المراقبة الدورية")
            recommendations.append("• تعزيز نقاط القوة الحالية")
            
        elif overall_classification == 'mild':
            recommendations.append("• تطبيق استراتيجيات تعليمية مساندة")
            recommendations.append("• توفير دعم إضافي في المجالات الضعيفة")
            recommendations.append("• متابعة دورية كل 6 أشهر")
            
        elif overall_classification == 'moderate':
            recommendations.append("• وضع خطة تعليمية فردية (IEP)")
            recommendations.append("• تطبيق تدخلات تعليمية مكثفة")
            recommendations.append("• استخدام تقنيات مساعدة")
            recommendations.append("• متابعة شهرية للتقدم")
            
        elif overall_classification == 'severe':
            recommendations.append("• تطبيق برنامج تعليمي مخصص ومكثف")
            recommendations.append("• العمل مع فريق متعدد التخصصات")
            recommendations.append("• استخدام تقنيات مساعدة متقدمة")
            recommendations.append("• متابعة أسبوعية للتقدم")
        
        # توصيات محددة للمجالات
        domain_recommendations = {
            'attention': [
                "• استخدام استراتيجيات تركيز الانتباه",
                "• تقليل المشتتات في البيئة التعليمية",
                "• تقسيم المهام إلى خطوات صغيرة"
            ],
            'memory': [
                "• استخدام تقنيات التذكر والاسترجاع",
                "• تطبيق استراتيجيات الذاكرة البصرية",
                "• التكرار والمراجعة المنتظمة"
            ],
            'perception': [
                "• تدريبات الإدراك البصري والسمعي",
                "• استخدام المواد التعليمية المتعددة الحواس",
                "• تطوير مهارات التمييز الإدراكي"
            ],
            'motor_skills': [
                "• تدريبات المهارات الحركية الدقيقة",
                "• استخدام أدوات الكتابة المساعدة",
                "• تطوير التناسق الحركي"
            ],
            'language': [
                "• تطوير المهارات اللغوية الاستقبالية والتعبيرية",
                "• استخدام تقنيات التواصل المساعدة",
                "• تعزيز المفردات والتراكيب اللغوية"
            ],
            'thinking': [
                "• تطوير مهارات التفكير النقدي",
                "• استخدام استراتيجيات حل المشكلات",
                "• تعزيز مهارات التفكير المنطقي"
            ],
            'academic_readiness': [
                "• تطوير المهارات الأكاديمية الأساسية",
                "• استخدام برامج التدخل المبكر",
                "• تعزيز الاستعداد للتعلم الأكاديمي"
            ]
        }
        
        # إضافة توصيات للمجالات التي تحتاج اهتمام
        for domain in DOMAIN_WEIGHTS.keys():
            risk_level = scores_data.get(f"{domain}_risk_level", 'low')
            if risk_level in ['moderate', 'high', 'very_high']:
                recommendations.extend(domain_recommendations.get(domain, []))
        
        # توصيات للأسرة
        recommendations.append("\nتوصيات للأسرة:")
        recommendations.append("• التعاون مع المدرسة في تطبيق الاستراتيجيات")
        recommendations.append("• توفير بيئة منزلية داعمة للتعلم")
        recommendations.append("• المشاركة في جلسات التدريب والإرشاد")
        
        return '\n'.join(recommendations)
        
    except Exception as e:
        logger.error(f"خطأ في إنتاج التوصيات: {str(e)}")
        return "حدث خطأ في إنتاج التوصيات"

def update_assessment_with_results(assessment_id, scores_data):
    """تحديث التقييم بالنتائج والتفسير"""
    try:
        assessment = db.session.query(LearningDifficultiesAssessment).get(assessment_id)
        if not assessment:
            return False
        
        # تحديث مستوى الخطر العام
        overall_classification = scores_data.get('overall_classification', 'no_difficulty')
        if overall_classification == 'no_difficulty':
            assessment.overall_risk_level = 'low'
        elif overall_classification == 'mild':
            assessment.overall_risk_level = 'moderate'
        elif overall_classification == 'moderate':
            assessment.overall_risk_level = 'high'
        else:
            assessment.overall_risk_level = 'very_high'
        
        # تحديد مجالات الصعوبة الأساسية والثانوية
        primary_difficulties = []
        secondary_difficulties = []
        strength_areas = []
        
        domain_labels = {
            'attention': 'الانتباه',
            'memory': 'الذاكرة',
            'perception': 'الإدراك',
            'motor_skills': 'المهارات الحركية',
            'language': 'اللغة',
            'thinking': 'التفكير',
            'academic_readiness': 'الاستعداد الأكاديمي'
        }
        
        for domain, label in domain_labels.items():
            score = scores_data.get(f"{domain}_standard_score", 100)
            risk_level = scores_data.get(f"{domain}_risk_level", 'low')
            
            if risk_level == 'very_high':
                primary_difficulties.append(label)
            elif risk_level == 'high':
                secondary_difficulties.append(label)
            elif score >= 115:
                strength_areas.append(label)
        
        assessment.primary_difficulty_areas = ', '.join(primary_difficulties) if primary_difficulties else 'لا توجد'
        assessment.secondary_difficulty_areas = ', '.join(secondary_difficulties) if secondary_difficulties else 'لا توجد'
        assessment.strength_areas = ', '.join(strength_areas) if strength_areas else 'لا توجد'
        
        # إنتاج التفسير والتوصيات
        assessment.clinical_interpretation = generate_clinical_interpretation(assessment_id, scores_data)
        assessment.educational_recommendations = generate_recommendations(assessment_id, scores_data)
        
        # تحديد أولويات التدخل
        if primary_difficulties:
            assessment.intervention_priorities = f"التركيز على: {', '.join(primary_difficulties[:3])}"
        elif secondary_difficulties:
            assessment.intervention_priorities = f"تطوير: {', '.join(secondary_difficulties[:3])}"
        else:
            assessment.intervention_priorities = "الحفاظ على المستوى الحالي وتعزيز نقاط القوة"
        
        # تحديد احتياجات التسهيلات
        accommodations = []
        if overall_classification in ['moderate', 'severe']:
            accommodations.append("وقت إضافي للامتحانات")
            accommodations.append("تقسيم المهام إلى خطوات صغيرة")
            accommodations.append("استخدام التقنيات المساعدة")
        
        if 'attention' in primary_difficulties or 'attention' in secondary_difficulties:
            accommodations.append("بيئة هادئة وقليلة المشتتات")
        
        if 'language' in primary_difficulties or 'language' in secondary_difficulties:
            accommodations.append("تبسيط التعليمات اللفظية")
            accommodations.append("استخدام الوسائل البصرية")
        
        assessment.accommodation_needs = ', '.join(accommodations) if accommodations else 'لا توجد احتياجات خاصة'
        
        # تحديد الحاجة للمتابعة
        if overall_classification in ['moderate', 'severe']:
            assessment.follow_up_assessment_needed = True
            assessment.follow_up_timeframe = '3 أشهر'
            assessment.additional_evaluations_needed = 'تقييم نفسي تعليمي شامل، تقييم طبي عصبي'
        elif overall_classification == 'mild':
            assessment.follow_up_assessment_needed = True
            assessment.follow_up_timeframe = '6 أشهر'
            assessment.additional_evaluations_needed = 'متابعة التقدم الأكاديمي'
        else:
            assessment.follow_up_assessment_needed = False
            assessment.follow_up_timeframe = 'سنة واحدة'
            assessment.additional_evaluations_needed = 'لا توجد'
        
        # تحديث حالة التقييم
        assessment.status = 'completed'
        assessment.completed_at = datetime.utcnow()
        
        db.session.commit()
        logger.info(f"تم تحديث التقييم {assessment_id} بالنتائج")
        return True
        
    except Exception as e:
        logger.error(f"خطأ في تحديث التقييم بالنتائج: {str(e)}")
        db.session.rollback()
        return False

def get_assessment_summary(assessment_id):
    """الحصول على ملخص شامل للتقييم"""
    try:
        assessment = db.session.query(LearningDifficultiesAssessment).get(assessment_id)
        scores = db.session.query(LearningDifficultiesScore).filter_by(assessment_id=assessment_id).first()
        
        if not assessment or not scores:
            return None
        
        summary = {
            'assessment_info': {
                'id': assessment.id,
                'student_name': assessment.student.name,
                'student_id': assessment.student.id,
                'assessment_date': assessment.assessment_date.strftime('%Y-%m-%d'),
                'assessor_name': assessment.assessor.name if assessment.assessor else 'غير محدد',
                'status': assessment.status
            },
            'overall_results': {
                'overall_index': scores.overall_learning_difficulties_index,
                'overall_classification': scores.overall_classification,
                'overall_classification_label': get_classification_label(scores.overall_classification),
                'overall_percentile': scores.overall_percentile,
                'overall_risk_level': assessment.overall_risk_level,
                'learning_profile_type': scores.learning_profile_type,
                'learning_profile_label': get_profile_type_label(scores.learning_profile_type)
            },
            'domain_scores': {},
            'composite_scores': {
                'cognitive_composite': scores.cognitive_composite_score,
                'cognitive_percentile': scores.cognitive_percentile,
                'academic_composite': scores.academic_composite_score,
                'academic_percentile': scores.academic_percentile
            },
            'areas_of_concern': {
                'primary_difficulties': assessment.primary_difficulty_areas,
                'secondary_difficulties': assessment.secondary_difficulty_areas,
                'strength_areas': assessment.strength_areas
            },
            'recommendations': {
                'clinical_interpretation': assessment.clinical_interpretation,
                'educational_recommendations': assessment.educational_recommendations,
                'intervention_priorities': assessment.intervention_priorities,
                'accommodation_needs': assessment.accommodation_needs
            },
            'follow_up': {
                'follow_up_needed': assessment.follow_up_assessment_needed,
                'follow_up_timeframe': assessment.follow_up_timeframe,
                'additional_evaluations': assessment.additional_evaluations_needed
            }
        }
        
        # إضافة درجات المجالات
        domain_labels = {
            'attention': 'الانتباه',
            'memory': 'الذاكرة',
            'perception': 'الإدراك',
            'motor_skills': 'المهارات الحركية',
            'language': 'اللغة',
            'thinking': 'التفكير',
            'academic_readiness': 'الاستعداد الأكاديمي'
        }
        
        for domain, label in domain_labels.items():
            summary['domain_scores'][domain] = {
                'label': label,
                'raw_score': getattr(scores, f"{domain}_raw_score", 0),
                'standard_score': getattr(scores, f"{domain}_standard_score", 100),
                'risk_level': getattr(scores, f"{domain}_risk_level", 'low'),
                'risk_level_label': get_risk_level_label(getattr(scores, f"{domain}_risk_level", 'low'))
            }
        
        return summary
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على ملخص التقييم: {str(e)}")
        return None

if __name__ == "__main__":
    # اختبار النظام
    print("نظام حساب درجات مقياس صعوبات التعلم النمائية جاهز للاستخدام")
