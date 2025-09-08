#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة المهارات الإضافية من الصورة الثانية
"""

from app import app, db
from models import SkillCategory, Skill

def add_additional_skills():
    """إضافة المهارات الإضافية للنظام"""
    
    with app.app_context():
        # إنشاء فئة المهارات الحركية والبصرية
        motor_visual_category = SkillCategory.query.filter_by(category_name="المهارات الحركية والبصرية").first()
        if not motor_visual_category:
            motor_visual_category = SkillCategory(
                category_name="المهارات الحركية والبصرية",
                description="مهارات التواصل البصري والحركات الدقيقة والكبيرة",
                icon="fas fa-eye",
                color="#17a2b8",
                display_order=2
            )
            db.session.add(motor_visual_category)
            db.session.commit()
            print("تم إنشاء فئة المهارات الحركية والبصرية")
        
        # قائمة المهارات الإضافية من الصورة
        additional_skills = [
            # المهارات البصرية والحركية
            {
                "skill_name": "يضع ثلاث في وعاء يفرغ الوعاء",
                "description": "قدرة الطفل على وضع ثلاثة أشياء في وعاء ثم إفراغ الوعاء",
                "evaluation_criteria": "يضع الطفل ثلاثة أشياء في الوعاء بشكل صحيح ثم يفرغها",
                "success_indicators": "إتمام المهمة بنجاح، التحكم في الحركة، فهم التعليمات"
            },
            {
                "skill_name": "ينتقل أداة من يد إلى أخرى لتنشيط أداة أخرى",
                "description": "قدرة الطفل على نقل أداة من يد لأخرى لاستخدام أداة أخرى",
                "evaluation_criteria": "ينقل الأداة بين اليدين بسلاسة لتحقيق هدف محدد",
                "success_indicators": "التنسيق بين اليدين، فهم الهدف، إتمام المهمة"
            },
            {
                "skill_name": "يسقط ويلتقط لعبه",
                "description": "قدرة الطفل على إسقاط لعبة عمداً ثم التقاطها",
                "evaluation_criteria": "يسقط اللعبة بقصد ثم يلتقطها من الأرض",
                "success_indicators": "التحكم في الحركة، التنسيق البصري الحركي، فهم السبب والنتيجة"
            },
            {
                "skill_name": "يجد أداة مخبأة تحت وعاء",
                "description": "قدرة الطفل على العثور على أداة مخفية تحت وعاء",
                "evaluation_criteria": "يرفع الوعاء ويجد الأداة المخفية تحته",
                "success_indicators": "فهم مفهوم الإخفاء، حل المشكلات، الذاكرة البصرية"
            },
            {
                "skill_name": "يدفع ثلاث مكعبات على طريقة قطار",
                "description": "قدرة الطفل على ترتيب ثلاث مكعبات ودفعها كالقطار",
                "evaluation_criteria": "يرتب المكعبات في خط ويدفعها معاً كوحدة واحدة",
                "success_indicators": "التنسيق الحركي، فهم التسلسل، اللعب التخيلي"
            },
            {
                "skill_name": "يرفع دائرة من لوحة الأشكال التسعة",
                "description": "قدرة الطفل على رفع الدائرة من لوحة الأشكال",
                "evaluation_criteria": "يحدد الدائرة ويرفعها من مكانها في اللوحة",
                "success_indicators": "التمييز البصري، التحكم في الحركة الدقيقة، التنسيق البصري الحركي"
            },
            {
                "skill_name": "يضع وتد مجوف في ق د - الأوتاد عند الطلب",
                "description": "قدرة الطفل على وضع الوتد المجوف في المكان المحدد عند الطلب",
                "evaluation_criteria": "يضع الوتد في المكان الصحيح عند طلب ذلك منه",
                "success_indicators": "فهم التعليمات، التحكم في الحركة الدقيقة، التنسيق البصري الحركي"
            },
            {
                "skill_name": "يؤدي حركات بسيطة عند الطلب",
                "description": "قدرة الطفل على تقليد أو أداء حركات بسيطة عند الطلب",
                "evaluation_criteria": "يؤدي الحركات المطلوبة بشكل صحيح",
                "success_indicators": "فهم التعليمات، التقليد، التنسيق الحركي"
            },
            {
                "skill_name": "يخرج ستة أدوات من الوعاء كل على حده",
                "description": "قدرة الطفل على إخراج ستة أدوات من الوعاء واحدة تلو الأخرى",
                "evaluation_criteria": "يخرج الأدوات واحدة واحدة وليس جميعها معاً",
                "success_indicators": "التحكم في الحركة، الصبر، فهم التسلسل"
            },
            {
                "skill_name": "يشير إلى جزء واحد من الجسم",
                "description": "قدرة الطفل على الإشارة إلى جزء واحد من جسمه عند السؤال",
                "evaluation_criteria": "يشير بشكل صحيح إلى جزء من الجسم عند السؤال عنه",
                "success_indicators": "معرفة أجزاء الجسم، فهم التعليمات، التنسيق الحركي"
            },
            {
                "skill_name": "يكدس ثلاث مكعبات فوق بعض",
                "description": "قدرة الطفل على تكديس ثلاث مكعبات فوق بعضها البعض",
                "evaluation_criteria": "يبني برجاً من ثلاث مكعبات بدون سقوط",
                "success_indicators": "التوازن، التنسيق البصري الحركي، التحكم في الحركة الدقيقة"
            },
            
            # مهارات التواصل البصري
            {
                "skill_name": "عمل اتصال بصري استجابة لسماع اسمه أثناء اللعب",
                "description": "قدرة الطفل على النظر للشخص الذي ينادي اسمه أثناء اللعب",
                "evaluation_criteria": "ينظر للمنادي عند سماع اسمه حتى لو كان منشغلاً باللعب",
                "success_indicators": "الاستجابة للاسم، التواصل البصري، الانتباه المشترك"
            },
            {
                "skill_name": "عمل اتصال بصري من على مسافة",
                "description": "قدرة الطفل على إقامة تواصل بصري من مسافة بعيدة",
                "evaluation_criteria": "ينظر في عيني الشخص حتى لو كان على مسافة",
                "success_indicators": "التواصل البصري، الانتباه، التفاعل الاجتماعي"
            },
            {
                "skill_name": "يقول نعم عندما يناديه أحد",
                "description": "قدرة الطفل على الرد بـ'نعم' عند مناداته",
                "evaluation_criteria": "يرد بكلمة 'نعم' أو إيماءة عند مناداته",
                "success_indicators": "فهم المناداة، الاستجابة اللفظية أو الجسدية، التفاعل الاجتماعي"
            },
            {
                "skill_name": "أن يتصل بصره خلال المحادثة",
                "description": "قدرة الطفل على الحفاظ على التواصل البصري أثناء المحادثة",
                "evaluation_criteria": "ينظر في عيني المتحدث أثناء الحديث معه",
                "success_indicators": "التواصل البصري المستمر، الانتباه، التفاعل الاجتماعي"
            },
            {
                "skill_name": "أن يتصل بصره أثناء التعليم الجماعي",
                "description": "قدرة الطفل على النظر للمعلم أثناء التعليم في المجموعة",
                "evaluation_criteria": "ينظر للمعلم أثناء الشرح في البيئة الجماعية",
                "success_indicators": "الانتباه الجماعي، التواصل البصري، التركيز"
            }
        ]
        
        # إضافة المهارات إلى قاعدة البيانات
        skills_added = 0
        for skill_data in additional_skills:
            # التحقق من عدم وجود المهارة مسبقاً
            existing_skill = Skill.query.filter_by(skill_name=skill_data["skill_name"]).first()
            if not existing_skill:
                new_skill = Skill(
                    skill_name=skill_data["skill_name"],
                    description=skill_data["description"],
                    category_id=motor_visual_category.id,
                    skill_level="متوسط",
                    evaluation_criteria=skill_data["evaluation_criteria"],
                    success_indicators=skill_data["success_indicators"],
                    is_active=True
                )
                db.session.add(new_skill)
                skills_added += 1
        
        # حفظ التغييرات
        db.session.commit()
        print(f"تم إضافة {skills_added} مهارة جديدة من المهارات الإضافية")
        print("تم إكمال إضافة جميع المهارات الإضافية بنجاح!")

if __name__ == "__main__":
    add_additional_skills()
