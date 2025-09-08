#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة مهارات العناية بالذات من الصورة الخامسة
"""

from app import app, db
from models import SkillCategory, Skill

def add_self_care_skills():
    """إضافة مهارات العناية بالذات للنظام"""
    
    with app.app_context():
        # إنشاء فئة مهارات العناية بالذات
        self_care_category = SkillCategory.query.filter_by(category_name="العناية بالذات").first()
        if not self_care_category:
            self_care_category = SkillCategory(
                category_name="العناية بالذات",
                description="مهارات الاعتناء بالنفس والاستقلالية في الأنشطة اليومية",
                icon="fas fa-user-check",
                color="#20c997",
                display_order=5
            )
            db.session.add(self_care_category)
            db.session.commit()
            print("تم إنشاء فئة العناية بالذات")
        
        # قائمة مهارات العناية بالذات من الصورة
        self_care_skills = [
            # مهارات الأكل والشرب
            {
                "skill_name": "يأكل الطعام الصلب بيديه",
                "description": "قدرة الطفل على تناول الطعام الصلب باستخدام يديه بشكل مستقل",
                "evaluation_criteria": "يتناول قطع الطعام الصلب بيديه دون مساعدة",
                "success_indicators": "الاستقلالية، التنسيق الحركي، النظافة المقبولة"
            },
            {
                "skill_name": "يأكل بالملعقة",
                "description": "قدرة الطفل على استخدام الملعقة لتناول الطعام",
                "evaluation_criteria": "يستخدم الملعقة بشكل صحيح لتناول معظم الوجبة",
                "success_indicators": "الإمساك الصحيح بالملعقة، التحكم في الحركة، قلة الانسكاب"
            },
            {
                "skill_name": "يشرب من الكوب",
                "description": "قدرة الطفل على الشرب من الكوب العادي بدون مساعدة",
                "evaluation_criteria": "يشرب من الكوب دون انسكاب كبير أو مساعدة",
                "success_indicators": "التحكم في الكوب، التنسيق، عدم الانسكاب"
            },
            {
                "skill_name": "يشرب بالشفاطة (المصاصة)",
                "description": "قدرة الطفل على الشرب باستخدام الشفاطة",
                "evaluation_criteria": "يشرب السوائل باستخدام الشفاطة بنجاح",
                "success_indicators": "التحكم في الشفط، التنسيق الفموي، الاستقلالية"
            },
            {
                "skill_name": "يطلب الطعام أو الشراب عند الحاجة",
                "description": "قدرة الطفل على التعبير عن حاجته للطعام أو الشراب",
                "evaluation_criteria": "يعبر عن الجوع أو العطش بطريقة واضحة",
                "success_indicators": "التواصل، التعبير عن الحاجات، الوعي الذاتي"
            },
            {
                "skill_name": "يمضغ الطعام جيداً",
                "description": "قدرة الطفل على مضغ الطعام بشكل مناسب قبل البلع",
                "evaluation_criteria": "يمضغ الطعام عدة مرات قبل البلع",
                "success_indicators": "التنسيق الفموي، الأمان في الأكل، الهضم السليم"
            },
            {
                "skill_name": "يأكل أنواع مختلفة من الطعام",
                "description": "قدرة الطفل على تقبل وتناول أنواع متنوعة من الأطعمة",
                "evaluation_criteria": "يتناول أطعمة متنوعة من مجموعات غذائية مختلفة",
                "success_indicators": "التنوع الغذائي، قبول الأطعمة الجديدة، التغذية المتوازنة"
            },
            
            # مهارات النظافة الشخصية
            {
                "skill_name": "يغسل يديه بالماء والصابون",
                "description": "قدرة الطفل على غسل يديه بالطريقة الصحيحة",
                "evaluation_criteria": "يغسل يديه بالماء والصابون لمدة مناسبة",
                "success_indicators": "النظافة، التسلسل الصحيح، الاستقلالية"
            },
            {
                "skill_name": "يجفف يديه بالمنشفة",
                "description": "قدرة الطفل على تجفيف يديه باستخدام المنشفة",
                "evaluation_criteria": "يجفف يديه بالمنشفة بشكل مناسب",
                "success_indicators": "الاستقلالية، النظافة، التنسيق الحركي"
            },
            {
                "skill_name": "يغسل وجهه",
                "description": "قدرة الطفل على غسل وجهه بالماء",
                "evaluation_criteria": "يغسل وجهه بالماء مع مساعدة قليلة أو بدونها",
                "success_indicators": "النظافة الشخصية، التنسيق، الاستقلالية"
            },
            {
                "skill_name": "يمسح أنفه بالمنديل",
                "description": "قدرة الطفل على استخدام المنديل لتنظيف أنفه",
                "evaluation_criteria": "يستخدم المنديل لتنظيف أنفه عند الحاجة",
                "success_indicators": "النظافة، الوعي الذاتي، الاستقلالية"
            },
            {
                "skill_name": "يغسل أسنانه بمساعدة",
                "description": "قدرة الطفل على غسل أسنانه مع بعض المساعدة والإشراف",
                "evaluation_criteria": "يشارك في غسل أسنانه مع مساعدة الكبار",
                "success_indicators": "النظافة الفموية، التعاون، تعلم الروتين"
            },
            {
                "skill_name": "يمشط شعره أو يحاول تمشيطه",
                "description": "قدرة الطفل على تمشيط شعره أو المحاولة بشكل مستقل",
                "evaluation_criteria": "يحمل المشط ويحاول تمشيط شعره",
                "success_indicators": "الاستقلالية، التنسيق الحركي، الاهتمام بالمظهر"
            },
            
            # مهارات استخدام الحمام
            {
                "skill_name": "يشير إلى الحاجة لاستخدام الحمام",
                "description": "قدرة الطفل على التعبير عن حاجته لاستخدام الحمام",
                "evaluation_criteria": "يعبر عن حاجته للحمام بطريقة واضحة",
                "success_indicators": "التواصل، الوعي الجسدي، التحكم في النفس"
            },
            {
                "skill_name": "يجلس على المرحاض بمساعدة",
                "description": "قدرة الطفل على الجلوس على المرحاض مع المساعدة",
                "evaluation_criteria": "يجلس على المرحاض بأمان مع مساعدة الكبار",
                "success_indicators": "التعاون، الأمان، التوازن"
            },
            {
                "skill_name": "يستخدم ورق التواليت",
                "description": "قدرة الطفل على استخدام ورق التواليت للتنظيف",
                "evaluation_criteria": "يستخدم ورق التواليت مع مساعدة أو توجيه",
                "success_indicators": "النظافة، التنسيق الحركي، الاستقلالية"
            },
            {
                "skill_name": "يغسل يديه بعد استخدام الحمام",
                "description": "قدرة الطفل على غسل يديه بعد استخدام الحمام",
                "evaluation_criteria": "يغسل يديه بالماء والصابون بعد الحمام",
                "success_indicators": "النظافة، تذكر الروتين، الاستقلالية"
            },
            {
                "skill_name": "يبقى جافاً لفترات أطول",
                "description": "قدرة الطفل على التحكم في المثانة لفترات أطول",
                "evaluation_criteria": "يبقى جافاً لساعات عديدة خلال النهار",
                "success_indicators": "التحكم الجسدي، النضج، الوعي"
            },
            
            # مهارات اللبس والخلع
            {
                "skill_name": "يخلع الجوارب",
                "description": "قدرة الطفل على خلع الجوارب بمفرده",
                "evaluation_criteria": "يخلع الجوارب دون مساعدة",
                "success_indicators": "الاستقلالية، التنسيق الحركي، القوة العضلية"
            },
            {
                "skill_name": "يخلع الحذاء",
                "description": "قدرة الطفل على خلع الحذاء بمفرده",
                "evaluation_criteria": "يخلع الحذاء (غير المربوط) بدون مساعدة",
                "success_indicators": "الاستقلالية، التنسيق، القوة"
            },
            {
                "skill_name": "يخلع القميص",
                "description": "قدرة الطفل على خلع القميص بمفرده",
                "evaluation_criteria": "يخلع القميص دون مساعدة كبيرة",
                "success_indicators": "الاستقلالية، التنسيق بين اليدين، المرونة"
            },
            {
                "skill_name": "يخلع البنطال",
                "description": "قدرة الطفل على خلع البنطال بمفرده",
                "evaluation_criteria": "يخلع البنطال دون مساعدة",
                "success_indicators": "الاستقلالية، التوازن، التنسيق"
            },
            {
                "skill_name": "يرتدي القميص بمساعدة",
                "description": "قدرة الطفل على ارتداء القميص مع بعض المساعدة",
                "evaluation_criteria": "يشارك في ارتداء القميص مع مساعدة في الأزرار",
                "success_indicators": "التعاون، التنسيق، فهم التسلسل"
            },
            {
                "skill_name": "يرتدي البنطال بمساعدة",
                "description": "قدرة الطفل على ارتداء البنطال مع بعض المساعدة",
                "evaluation_criteria": "يشارك في ارتداء البنطال مع مساعدة في السحاب",
                "success_indicators": "التعاون، التوازن، التنسيق"
            },
            {
                "skill_name": "يرتدي الجوارب بمساعدة",
                "description": "قدرة الطفل على ارتداء الجوارب مع المساعدة",
                "evaluation_criteria": "يحاول ارتداء الجوارب مع مساعدة في التوجيه",
                "success_indicators": "المحاولة، التعاون، التنسيق الحركي"
            },
            {
                "skill_name": "يرتدي الحذاء بمساعدة",
                "description": "قدرة الطفل على ارتداء الحذاء مع المساعدة",
                "evaluation_criteria": "يضع قدمه في الحذاء مع مساعدة في الربط",
                "success_indicators": "التعاون، فهم اليمين واليسار، التنسيق"
            },
            
            # مهارات النوم والراحة
            {
                "skill_name": "يذهب إلى السرير عند الطلب",
                "description": "قدرة الطفل على الذهاب للسرير عندما يُطلب منه ذلك",
                "evaluation_criteria": "يتوجه للسرير عند الطلب مع مقاومة قليلة",
                "success_indicators": "التعاون، فهم الروتين، الانضباط"
            },
            {
                "skill_name": "يهدأ ويستعد للنوم",
                "description": "قدرة الطفل على الهدوء والاستعداد للنوم",
                "evaluation_criteria": "يهدأ ويقلل من النشاط استعداداً للنوم",
                "success_indicators": "التنظيم الذاتي، فهم الروتين، الهدوء"
            },
            {
                "skill_name": "ينام في سريره الخاص",
                "description": "قدرة الطفل على النوم في سريره دون الحاجة للبقاء مع الكبار",
                "evaluation_criteria": "ينام في سريره لمعظم الليل",
                "success_indicators": "الاستقلالية، الأمان، الثقة"
            },
            {
                "skill_name": "يأخذ قيلولة في الوقت المحدد",
                "description": "قدرة الطفل على أخذ قيلولة في الوقت المناسب",
                "evaluation_criteria": "يأخذ قيلولة عند الحاجة أو في الوقت المحدد",
                "success_indicators": "تنظيم النوم، التعاون، الراحة"
            },
            {
                "skill_name": "يستيقظ من النوم بهدوء",
                "description": "قدرة الطفل على الاستيقاظ من النوم دون بكاء شديد",
                "evaluation_criteria": "يستيقظ بهدوء ويتكيف مع الاستيقاظ",
                "success_indicators": "التنظيم العاطفي، التكيف، الهدوء"
            },
            
            # مهارات الأمان والوعي
            {
                "skill_name": "يتجنب الأشياء الخطيرة عند التحذير",
                "description": "قدرة الطفل على تجنب الأشياء الخطيرة عندما يُحذر منها",
                "evaluation_criteria": "يبتعد عن الأشياء الخطيرة عند التحذير",
                "success_indicators": "الوعي بالأمان، الاستجابة للتحذيرات، الحذر"
            },
            {
                "skill_name": "يطلب المساعدة عند الحاجة",
                "description": "قدرة الطفل على طلب المساعدة عندما يحتاجها",
                "evaluation_criteria": "يطلب المساعدة بطريقة واضحة عند الحاجة",
                "success_indicators": "التواصل، الوعي بالحدود، طلب الدعم"
            },
            {
                "skill_name": "يتبع التعليمات البسيطة للأمان",
                "description": "قدرة الطفل على اتباع تعليمات الأمان البسيطة",
                "evaluation_criteria": "يتبع تعليمات الأمان مثل 'قف' أو 'انتبه'",
                "success_indicators": "الطاعة، الوعي، الاستجابة السريعة"
            },
            {
                "skill_name": "يعرف اسمه الكامل",
                "description": "قدرة الطفل على معرفة وقول اسمه الكامل",
                "evaluation_criteria": "يقول اسمه الأول والأخير عند السؤال",
                "success_indicators": "الهوية الشخصية، الذاكرة، التواصل"
            },
            {
                "skill_name": "يبقى قريباً من الكبار في الأماكن العامة",
                "description": "قدرة الطفل على البقاء قريباً من الكبار في الأماكن المزدحمة",
                "evaluation_criteria": "يبقى في مدى النظر من الكبار في الأماكن العامة",
                "success_indicators": "الوعي بالأمان، الطاعة، الحذر"
            },
            
            # مهارات التنظيم والترتيب
            {
                "skill_name": "يضع الألعاب في مكانها بعد اللعب",
                "description": "قدرة الطفل على ترتيب الألعاب في مكانها المخصص",
                "evaluation_criteria": "يضع معظم الألعاب في مكانها مع التذكير",
                "success_indicators": "التنظيم، المسؤولية، اتباع الروتين"
            },
            {
                "skill_name": "يحافظ على نظافة مكان اللعب",
                "description": "قدرة الطفل على المحافظة على نظافة المكان الذي يلعب فيه",
                "evaluation_criteria": "يتجنب إلقاء الأشياء على الأرض ويحافظ على النظافة",
                "success_indicators": "النظافة، المسؤولية، الوعي"
            },
            {
                "skill_name": "يرتب ملابسه في المكان المخصص",
                "description": "قدرة الطفل على وضع ملابسه في المكان المناسب",
                "evaluation_criteria": "يضع ملابسه في السلة أو الخزانة مع التوجيه",
                "success_indicators": "التنظيم، المسؤولية، اتباع الروتين"
            },
            {
                "skill_name": "يحمل أغراضه الشخصية",
                "description": "قدرة الطفل على حمل أغراضه الشخصية البسيطة",
                "evaluation_criteria": "يحمل حقيبته أو لعبته الخاصة",
                "success_indicators": "المسؤولية، الاستقلالية، التنظيم"
            },
            {
                "skill_name": "يتذكر مكان أغراضه الشخصية",
                "description": "قدرة الطفل على تذكر مكان وضع أغراضه الشخصية",
                "evaluation_criteria": "يجد أغراضه الشخصية في المكان الذي وضعها فيه",
                "success_indicators": "الذاكرة، التنظيم، المسؤولية"
            }
        ]
        
        # إضافة المهارات إلى قاعدة البيانات
        skills_added = 0
        for skill_data in self_care_skills:
            # التحقق من عدم وجود المهارة مسبقاً
            existing_skill = Skill.query.filter_by(skill_name=skill_data["skill_name"]).first()
            if not existing_skill:
                new_skill = Skill(
                    skill_name=skill_data["skill_name"],
                    description=skill_data["description"],
                    category_id=self_care_category.id,
                    skill_level="متوسط",
                    evaluation_criteria=skill_data["evaluation_criteria"],
                    success_indicators=skill_data["success_indicators"],
                    is_active=True
                )
                db.session.add(new_skill)
                skills_added += 1
        
        # حفظ التغييرات
        db.session.commit()
        print(f"تم إضافة {skills_added} مهارة عناية بالذات جديدة")
        print("تم إكمال إضافة جميع مهارات العناية بالذات بنجاح!")

if __name__ == "__main__":
    add_self_care_skills()
