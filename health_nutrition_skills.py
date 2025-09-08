#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة مهارات الصحة والتغذية
"""

from app import app, db
from models import SkillCategory, Skill

def add_health_nutrition_skills():
    """إضافة مهارات الصحة والتغذية للنظام"""
    
    with app.app_context():
        # إنشاء فئة مهارات الصحة والتغذية
        health_category = SkillCategory.query.filter_by(category_name="مهارات الصحة والتغذية").first()
        if not health_category:
            health_category = SkillCategory(
                category_name="مهارات الصحة والتغذية",
                description="مهارات التغذية الصحية والعادات الصحية والوعي بالجسم",
                icon="fas fa-heartbeat",
                color="#dc3545",
                display_order=12
            )
            db.session.add(health_category)
            db.session.commit()
            print("تم إنشاء فئة مهارات الصحة والتغذية")
        
        # قائمة مهارات الصحة والتغذية
        health_skills = [
            # مهارات التغذية الأساسية
            {
                "skill_name": "يأكل أطعمة متنوعة دون رفض شديد",
                "description": "قدرة الطفل على تقبل أنواع مختلفة من الطعام",
                "evaluation_criteria": "يجرب أو يأكل 3-4 أنواع مختلفة من الطعام دون رفض قوي",
                "success_indicators": "التنوع الغذائي، المرونة في الطعام، قبول الجديد"
            },
            {
                "skill_name": "يشرب الماء عند العطش",
                "description": "قدرة الطفل على تلبية حاجته للماء",
                "evaluation_criteria": "يطلب الماء أو يشرب عند تقديمه له عندما يكون عطشاً",
                "success_indicators": "الوعي بالعطش، طلب الحاجات، الترطيب الصحي"
            },
            {
                "skill_name": "يظهر تفضيلات غذائية واضحة",
                "description": "قدرة الطفل على إظهار تفضيلات شخصية في الطعام",
                "evaluation_criteria": "يختار أو يطلب أطعمة معينة ويرفض أخرى بوضوح",
                "success_indicators": "التفضيل الشخصي، التعبير عن الرغبات، الاختيار"
            },
            {
                "skill_name": "يأكل الفواكه والخضروات بتشجيع",
                "description": "قدرة الطفل على تناول الأطعمة الصحية مع التحفيز",
                "evaluation_criteria": "يأكل قطع من الفواكه أو الخضروات عندما يشجعه الكبار",
                "success_indicators": "التغذية الصحية، الاستجابة للتشجيع، تقبل الأطعمة المفيدة"
            },
            {
                "skill_name": "يتناول وجبات في أوقات منتظمة",
                "description": "قدرة الطفل على التكيف مع روتين الوجبات",
                "evaluation_criteria": "يأكل في أوقات الوجبات الرئيسية دون مقاومة كبيرة",
                "success_indicators": "الانتظام، قبول الروتين، العادات الغذائية الصحية"
            },
            
            # مهارات الوعي بالجسم
            {
                "skill_name": "يتعرف على أجزاء جسمه الأساسية",
                "description": "قدرة الطفل على تسمية أو الإشارة لأجزاء الجسم",
                "evaluation_criteria": "يشير أو يسمي الرأس، اليدين، القدمين، العينين، الأنف، الفم",
                "success_indicators": "الوعي بالجسم، المعرفة الأساسية، التعرف على الذات"
            },
            {
                "skill_name": "يعبر عن الألم أو عدم الراحة",
                "description": "قدرة الطفل على التواصل عند الشعور بالألم",
                "evaluation_criteria": "يبكي أو يشير أو يعبر عن الألم عند الإصابة أو المرض",
                "success_indicators": "التواصل عن الحاجات، الوعي بالألم، طلب المساعدة"
            },
            {
                "skill_name": "يظهر علامات التعب والحاجة للراحة",
                "description": "قدرة الطفل على إظهار الحاجة للنوم أو الراحة",
                "evaluation_criteria": "يصبح هادئاً أو يطلب النوم عند التعب",
                "success_indicators": "الوعي بالحاجات الجسدية، التعبير عن التعب، طلب الراحة"
            },
            {
                "skill_name": "يستجيب للحرارة والبرد",
                "description": "قدرة الطفل على التفاعل مع تغيرات درجة الحرارة",
                "evaluation_criteria": "يظهر عدم راحة في الحر الشديد أو البرد ويطلب التغيير",
                "success_indicators": "الحساسية للحرارة، التكيف البيئي، التعبير عن عدم الراحة"
            },
            {
                "skill_name": "يحافظ على توازنه أثناء المشي",
                "description": "قدرة الطفل على المشي بثبات وتوازن",
                "evaluation_criteria": "يمشي دون سقوط متكرر ويحافظ على توازنه",
                "success_indicators": "التوازن الحركي، القوة العضلية، التناسق"
            },
            
            # مهارات النظافة الصحية
            {
                "skill_name": "يقبل غسل الوجه واليدين",
                "description": "قدرة الطفل على التعاون في أنشطة النظافة الأساسية",
                "evaluation_criteria": "يسمح بغسل وجهه ويديه دون مقاومة شديدة",
                "success_indicators": "قبول النظافة، التعاون، العادات الصحية"
            },
            {
                "skill_name": "يساعد في تنظيف أسنانه",
                "description": "قدرة الطفل على المشاركة في نظافة الأسنان",
                "evaluation_criteria": "يفتح فمه أو يمسك فرشاة الأسنان أثناء التنظيف",
                "success_indicators": "نظافة الأسنان، المشاركة في العناية، العادات الصحية"
            },
            {
                "skill_name": "يغطي فمه عند السعال أو العطس أحياناً",
                "description": "قدرة الطفل على تعلم آداب النظافة الصحية",
                "evaluation_criteria": "يضع يده أمام فمه أو يدير رأسه عند السعال أحياناً",
                "success_indicators": "الآداب الصحية، الوعي بالنظافة، حماية الآخرين"
            },
            {
                "skill_name": "يحب الاستحمام أو يتقبله",
                "description": "قدرة الطفل على قبول أو الاستمتاع بوقت الاستحمام",
                "evaluation_criteria": "يستمتع بالاستحمام أو يتقبله دون بكاء شديد",
                "success_indicators": "النظافة الشخصية، قبول الروتين، الاستمتاع بالماء"
            },
            {
                "skill_name": "يبقى نظيفاً لفترات أطول",
                "description": "قدرة الطفل على الحفاظ على نظافته لوقت أطول",
                "evaluation_criteria": "يبقى نظيفاً ومرتباً لفترة معقولة بعد التنظيف",
                "success_indicators": "الوعي بالنظافة، العناية بالمظهر، العادات الجيدة"
            },
            
            # مهارات السلامة الصحية
            {
                "skill_name": "يتجنب وضع الأشياء الخطيرة في فمه",
                "description": "قدرة الطفل على تجنب الأشياء غير الآمنة للأكل",
                "evaluation_criteria": "لا يضع أشياء صغيرة أو خطيرة في فمه عند التحذير",
                "success_indicators": "الوعي بالسلامة، تجنب الخطر، اتباع التحذيرات"
            },
            {
                "skill_name": "يطلب المساعدة عند الشعور بالمرض",
                "description": "قدرة الطفل على التواصل عند عدم الشعور بالراحة",
                "evaluation_criteria": "يذهب للكبار أو يعبر عن عدم راحته عند المرض",
                "success_indicators": "طلب المساعدة، التواصل الصحي، الوعي بالحاجة للعلاج"
            },
            {
                "skill_name": "يتقبل تناول الدواء عند الحاجة",
                "description": "قدرة الطفل على التعاون في تناول الأدوية الضرورية",
                "evaluation_criteria": "يتناول الدواء مع التشجيع والمساعدة دون مقاومة شديدة",
                "success_indicators": "التعاون الطبي، قبول العلاج، الثقة بالكبار"
            },
            {
                "skill_name": "يرتدي الملابس المناسبة للطقس",
                "description": "قدرة الطفل على قبول الملابس المناسبة لحالة الطقس",
                "evaluation_criteria": "يقبل ارتداء الملابس الثقيلة في البرد أو الخفيفة في الحر",
                "success_indicators": "التكيف مع الطقس، قبول التوجيه، الوعي بالراحة"
            },
            {
                "skill_name": "يبتعد عن الأماكن الخطيرة عند التحذير",
                "description": "قدرة الطفل على فهم وتجنب المخاطر الصحية",
                "evaluation_criteria": "يبتعد عن المياه العميقة أو الأماكن الخطيرة عند التحذير",
                "success_indicators": "الوعي بالخطر، اتباع التحذيرات، السلامة الشخصية"
            },
            
            # مهارات النشاط البدني
            {
                "skill_name": "يستمتع بالأنشطة الحركية البسيطة",
                "description": "قدرة الطفل على المشاركة في التمارين والأنشطة البدنية",
                "evaluation_criteria": "يشارك في الجري أو القفز أو الرقص بسعادة",
                "success_indicators": "النشاط البدني، الاستمتاع بالحركة، الصحة البدنية"
            },
            {
                "skill_name": "يلعب في الهواء الطلق بسعادة",
                "description": "قدرة الطفل على الاستمتاع بالأنشطة الخارجية",
                "evaluation_criteria": "يلعب في الحديقة أو الهواء الطلق دون خوف أو رفض",
                "success_indicators": "حب الطبيعة، النشاط الخارجي، الصحة البدنية"
            },
            {
                "skill_name": "يتسلق ويتحرك بثقة",
                "description": "قدرة الطفل على الحركة والتسلق الآمن",
                "evaluation_criteria": "يتسلق السلالم أو الأثاث المنخفض بحذر وثقة",
                "success_indicators": "الثقة الحركية، القوة العضلية، التوازن"
            },
            {
                "skill_name": "يستريح عندما يشعر بالتعب",
                "description": "قدرة الطفل على تنظيم نشاطه حسب طاقته",
                "evaluation_criteria": "يجلس أو يطلب الراحة عندما يصبح متعباً من اللعب",
                "success_indicators": "الوعي بالحدود الجسدية، تنظيم النشاط، الراحة المناسبة"
            },
            {
                "skill_name": "يظهر طاقة وحيوية في معظم الأوقات",
                "description": "قدرة الطفل على إظهار النشاط والحيوية الطبيعية",
                "evaluation_criteria": "يظهر نشاطاً وحيوية في اللعب والأنشطة اليومية",
                "success_indicators": "الصحة العامة، الطاقة الطبيعية، النمو الصحي"
            }
        ]
        
        # إضافة المهارات إلى قاعدة البيانات
        skills_added = 0
        for skill_data in health_skills:
            # التحقق من عدم وجود المهارة مسبقاً
            existing_skill = Skill.query.filter_by(skill_name=skill_data["skill_name"]).first()
            if not existing_skill:
                new_skill = Skill(
                    skill_name=skill_data["skill_name"],
                    description=skill_data["description"],
                    category_id=health_category.id,
                    skill_level="متوسط",
                    evaluation_criteria=skill_data["evaluation_criteria"],
                    success_indicators=skill_data["success_indicators"],
                    is_active=True
                )
                db.session.add(new_skill)
                skills_added += 1
        
        # حفظ التغييرات
        db.session.commit()
        print(f"تم إضافة {skills_added} مهارة صحة وتغذية جديدة")
        print("تم إكمال إضافة جميع مهارات الصحة والتغذية بنجاح!")

if __name__ == "__main__":
    add_health_nutrition_skills()
