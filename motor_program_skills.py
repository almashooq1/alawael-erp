#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة مهارات البرنامج الحركي من الصورة الرابعة
"""

from app import app, db
from models import SkillCategory, Skill

def add_motor_program_skills():
    """إضافة مهارات البرنامج الحركي للنظام"""
    
    with app.app_context():
        # إنشاء فئة مهارات البرنامج الحركي
        motor_program_category = SkillCategory.query.filter_by(category_name="البرنامج الحركي").first()
        if not motor_program_category:
            motor_program_category = SkillCategory(
                category_name="البرنامج الحركي",
                description="مهارات الحركة الدقيقة والكبيرة والتوازن والتنسيق الحركي",
                icon="fas fa-running",
                color="#fd7e14",
                display_order=4
            )
            db.session.add(motor_program_category)
            db.session.commit()
            print("تم إنشاء فئة البرنامج الحركي")
        
        # قائمة مهارات البرنامج الحركي من الصورة
        motor_program_skills = [
            # المهارات الحركية الكبيرة
            {
                "skill_name": "يمشي بثبات دون مساعدة",
                "description": "قدرة الطفل على المشي بثبات واستقلالية دون الحاجة لمساعدة",
                "evaluation_criteria": "يمشي مسافة 10 أمتار على الأقل بثبات ودون سقوط",
                "success_indicators": "التوازن، الثبات، الاستقلالية في المشي"
            },
            {
                "skill_name": "يجري لمسافة قصيرة",
                "description": "قدرة الطفل على الجري لمسافة قصيرة بتنسيق جيد",
                "evaluation_criteria": "يجري مسافة 5 أمتار بتنسيق وتوازن مناسب",
                "success_indicators": "التنسيق الحركي، التوازن أثناء الجري، السرعة المناسبة"
            },
            {
                "skill_name": "يقفز بكلا القدمين معاً",
                "description": "قدرة الطفل على القفز باستخدام كلا القدمين في نفس الوقت",
                "evaluation_criteria": "يقفز عدة مرات متتالية بكلا القدمين معاً",
                "success_indicators": "التنسيق بين القدمين، القوة العضلية، التوازن"
            },
            {
                "skill_name": "يقفز على قدم واحدة",
                "description": "قدرة الطفل على القفز والتوازن على قدم واحدة",
                "evaluation_criteria": "يقفز على قدم واحدة 3-5 مرات متتالية",
                "success_indicators": "التوازن الأحادي، القوة العضلية، التنسيق"
            },
            {
                "skill_name": "يصعد الدرج بمساعدة",
                "description": "قدرة الطفل على صعود الدرج مع الاستعانة بالدرابزين أو المساعدة",
                "evaluation_criteria": "يصعد 5-10 درجات بأمان مع المساعدة",
                "success_indicators": "التنسيق الحركي، القوة، الثقة في الحركة"
            },
            {
                "skill_name": "يصعد الدرج بدون مساعدة",
                "description": "قدرة الطفل على صعود الدرج بشكل مستقل دون مساعدة",
                "evaluation_criteria": "يصعد 5-10 درجات بأمان وبدون مساعدة",
                "success_indicators": "الاستقلالية، التوازن، الثقة بالنفس"
            },
            {
                "skill_name": "ينزل الدرج بمساعدة",
                "description": "قدرة الطفل على النزول من الدرج مع الاستعانة بالدرابزين أو المساعدة",
                "evaluation_criteria": "ينزل 5-10 درجات بأمان مع المساعدة",
                "success_indicators": "التحكم في الحركة، التوازن، الحذر"
            },
            {
                "skill_name": "ينزل الدرج بدون مساعدة",
                "description": "قدرة الطفل على النزول من الدرج بشكل مستقل دون مساعدة",
                "evaluation_criteria": "ينزل 5-10 درجات بأمان وبدون مساعدة",
                "success_indicators": "الاستقلالية، التحكم في الحركة، الثقة"
            },
            {
                "skill_name": "يركب الدراجة ثلاثية العجلات",
                "description": "قدرة الطفل على ركوب وقيادة الدراجة ثلاثية العجلات",
                "evaluation_criteria": "يركب الدراجة ويتحرك بها لمسافة مناسبة",
                "success_indicators": "التنسيق بين اليدين والقدمين، التوازن، التوجه"
            },
            {
                "skill_name": "يرمي الكرة باتجاه الهدف",
                "description": "قدرة الطفل على رمي الكرة في اتجاه محدد أو هدف معين",
                "evaluation_criteria": "يرمي الكرة باتجاه الهدف مع دقة مقبولة",
                "success_indicators": "التنسيق البصري الحركي، التصويب، القوة المناسبة"
            },
            {
                "skill_name": "يمسك الكرة المرمية إليه",
                "description": "قدرة الطفل على التقاط الكرة عند رميها إليه",
                "evaluation_criteria": "يمسك الكرة بنجاح في معظم المحاولات",
                "success_indicators": "التنسيق البصري الحركي، ردة الفعل، التركيز"
            },
            {
                "skill_name": "يركل الكرة بالقدم",
                "description": "قدرة الطفل على ركل الكرة باستخدام القدم",
                "evaluation_criteria": "يركل الكرة بقوة مناسبة وفي اتجاه محدد",
                "success_indicators": "التوازن، التنسيق، القوة العضلية"
            },
            
            # المهارات الحركية الدقيقة
            {
                "skill_name": "يمسك القلم بطريقة صحيحة",
                "description": "قدرة الطفل على الإمساك بالقلم بالطريقة الصحيحة للكتابة",
                "evaluation_criteria": "يمسك القلم بين الإبهام والسبابة مع دعم الإصبع الأوسط",
                "success_indicators": "الإمساك الصحيح، التحكم في القلم، الراحة في الاستخدام"
            },
            {
                "skill_name": "يرسم خطوط مستقيمة",
                "description": "قدرة الطفل على رسم خطوط مستقيمة بالقلم أو القلم الملون",
                "evaluation_criteria": "يرسم خطوط مستقيمة واضحة ومتحكم فيها",
                "success_indicators": "التحكم في الحركة، الدقة، الثبات"
            },
            {
                "skill_name": "يرسم خطوط منحنية",
                "description": "قدرة الطفل على رسم خطوط منحنية ودوائر بسيطة",
                "evaluation_criteria": "يرسم منحنيات ودوائر بشكل واضح ومتحكم فيه",
                "success_indicators": "المرونة في الحركة، التنسيق، التحكم"
            },
            {
                "skill_name": "يرسم أشكال بسيطة (دائرة، مربع)",
                "description": "قدرة الطفل على رسم أشكال هندسية بسيطة",
                "evaluation_criteria": "يرسم دائرة ومربع يمكن التعرف عليهما",
                "success_indicators": "الدقة، التحكم في الحركة، فهم الأشكال"
            },
            {
                "skill_name": "يلون داخل الحدود",
                "description": "قدرة الطفل على التلوين داخل حدود الرسمة دون الخروج عنها",
                "evaluation_criteria": "يلون معظم المساحة داخل الحدود المحددة",
                "success_indicators": "الدقة، التحكم في الحركة، التركيز"
            },
            {
                "skill_name": "يقص بالمقص خطوط مستقيمة",
                "description": "قدرة الطفل على استخدام المقص لقص خطوط مستقيمة",
                "evaluation_criteria": "يقص خط مستقيم بدقة مقبولة باستخدام المقص",
                "success_indicators": "التنسيق بين اليدين، الدقة، الأمان في الاستخدام"
            },
            {
                "skill_name": "يقص أشكال بسيطة بالمقص",
                "description": "قدرة الطفل على قص أشكال بسيطة مثل الدوائر والمربعات",
                "evaluation_criteria": "يقص شكل بسيط يمكن التعرف عليه",
                "success_indicators": "الدقة المتقدمة، التحكم في المقص، التنسيق"
            },
            {
                "skill_name": "يطوي الورق بشكل بسيط",
                "description": "قدرة الطفل على طي الورق بطريقة بسيطة ومنظمة",
                "evaluation_criteria": "يطوي الورق نصفين أو في شكل بسيط",
                "success_indicators": "الدقة، التنسيق بين اليدين، فهم التعليمات"
            },
            {
                "skill_name": "يلصق الأشياء في المكان المحدد",
                "description": "قدرة الطفل على لصق الأشياء بدقة في المكان المطلوب",
                "evaluation_criteria": "يلصق الأشياء في المكان الصحيح بدقة مقبولة",
                "success_indicators": "الدقة، التنسيق البصري الحركي، فهم المكان"
            },
            
            # مهارات التنسيق والتوازن
            {
                "skill_name": "يمشي على خط مستقيم",
                "description": "قدرة الطفل على المشي على خط مستقيم دون الخروج عنه",
                "evaluation_criteria": "يمشي على خط مستقيم لمسافة 3 أمتار دون الخروج عنه كثيراً",
                "success_indicators": "التوازن، التنسيق، التركيز"
            },
            {
                "skill_name": "يقف على قدم واحدة لثوان معدودة",
                "description": "قدرة الطفل على الوقوف والتوازن على قدم واحدة لفترة قصيرة",
                "evaluation_criteria": "يقف على قدم واحدة لمدة 3-5 ثوان",
                "success_indicators": "التوازن، القوة العضلية، التركيز"
            },
            {
                "skill_name": "يمشي للخلف عدة خطوات",
                "description": "قدرة الطفل على المشي للخلف بتوازن وتحكم",
                "evaluation_criteria": "يمشي للخلف 5-10 خطوات دون سقوط",
                "success_indicators": "التوازن، التنسيق، الوعي المكاني"
            },
            {
                "skill_name": "يمشي جانبياً (خطوات جانبية)",
                "description": "قدرة الطفل على المشي جانبياً بتنسيق جيد",
                "evaluation_criteria": "يؤدي خطوات جانبية متتالية بتوازن",
                "success_indicators": "التنسيق، التوازن، المرونة الحركية"
            },
            {
                "skill_name": "يتسلق على الأثاث المنخفض بأمان",
                "description": "قدرة الطفل على التسلق على الأثاث المنخفض بطريقة آمنة",
                "evaluation_criteria": "يتسلق ويتحرك على الأثاث المنخفض بأمان",
                "success_indicators": "القوة العضلية، التنسيق، الوعي بالأمان"
            },
            
            # مهارات اللعب الحركي
            {
                "skill_name": "يلعب بالكرة (دحرجة، رمي، مسك)",
                "description": "قدرة الطفل على اللعب بالكرة بطرق مختلفة",
                "evaluation_criteria": "يدحرج ويرمي ويمسك الكرة بمهارة مناسبة",
                "success_indicators": "التنسيق، المرونة في اللعب، التفاعل"
            },
            {
                "skill_name": "يلعب بالأرجوحة",
                "description": "قدرة الطفل على اللعب بالأرجوحة والتأرجح بأمان",
                "evaluation_criteria": "يجلس على الأرجوحة ويتأرجح بمساعدة أو بدونها",
                "success_indicators": "التوازن، الثقة، الاستمتاع بالحركة"
            },
            {
                "skill_name": "يلعب بالزحليقة",
                "description": "قدرة الطفل على استخدام الزحليقة بأمان ومتعة",
                "evaluation_criteria": "يصعد للزحليقة وينزل منها بأمان",
                "success_indicators": "الثقة، التوازن، الوعي بالأمان"
            },
            {
                "skill_name": "يشارك في الألعاب الحركية الجماعية",
                "description": "قدرة الطفل على المشاركة في الألعاب الحركية مع الآخرين",
                "evaluation_criteria": "يشارك في لعبة حركية جماعية لمدة مناسبة",
                "success_indicators": "التفاعل الاجتماعي، التعاون، المتعة"
            },
            
            # مهارات الرعاية الذاتية الحركية
            {
                "skill_name": "يأكل بالملعقة بشكل مستقل",
                "description": "قدرة الطفل على استخدام الملعقة لتناول الطعام بدون مساعدة",
                "evaluation_criteria": "يأكل وجبة كاملة بالملعقة دون مساعدة",
                "success_indicators": "الاستقلالية، التحكم في الحركة، النظافة"
            },
            {
                "skill_name": "يشرب من الكوب بدون انسكاب",
                "description": "قدرة الطفل على الشرب من الكوب دون انسكاب الماء",
                "evaluation_criteria": "يشرب من الكوب مع انسكاب قليل أو بدون انسكاب",
                "success_indicators": "التحكم في الحركة، التنسيق، الحذر"
            },
            {
                "skill_name": "يغسل يديه بمساعدة بسيطة",
                "description": "قدرة الطفل على غسل يديه مع مساعدة بسيطة في فتح الصنبور",
                "evaluation_criteria": "يغسل يديه بالصابون والماء مع مساعدة قليلة",
                "success_indicators": "النظافة الشخصية، التنسيق، الاستقلالية"
            },
            {
                "skill_name": "يرتدي الملابس البسيطة بمساعدة",
                "description": "قدرة الطفل على ارتداء الملابس البسيطة مع بعض المساعدة",
                "evaluation_criteria": "يرتدي القميص أو البنطال مع مساعدة في الأزرار أو السحاب",
                "success_indicators": "الاستقلالية، التنسيق بين اليدين، الصبر"
            },
            {
                "skill_name": "يخلع الملابس البسيطة بمفرده",
                "description": "قدرة الطفل على خلع الملابس البسيطة بدون مساعدة",
                "evaluation_criteria": "يخلع القميص والبنطال والجوارب بدون مساعدة",
                "success_indicators": "الاستقلالية، القوة العضلية، التنسيق"
            }
        ]
        
        # إضافة المهارات إلى قاعدة البيانات
        skills_added = 0
        for skill_data in motor_program_skills:
            # التحقق من عدم وجود المهارة مسبقاً
            existing_skill = Skill.query.filter_by(skill_name=skill_data["skill_name"]).first()
            if not existing_skill:
                new_skill = Skill(
                    skill_name=skill_data["skill_name"],
                    description=skill_data["description"],
                    category_id=motor_program_category.id,
                    skill_level="متوسط",
                    evaluation_criteria=skill_data["evaluation_criteria"],
                    success_indicators=skill_data["success_indicators"],
                    is_active=True
                )
                db.session.add(new_skill)
                skills_added += 1
        
        # حفظ التغييرات
        db.session.commit()
        print(f"تم إضافة {skills_added} مهارة حركية جديدة")
        print("تم إكمال إضافة جميع مهارات البرنامج الحركي بنجاح!")

if __name__ == "__main__":
    add_motor_program_skills()
