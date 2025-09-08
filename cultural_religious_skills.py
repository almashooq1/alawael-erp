#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة المهارات الثقافية والدينية
"""

from app import app, db
from models import SkillCategory, Skill

def add_cultural_religious_skills():
    """إضافة المهارات الثقافية والدينية للنظام"""
    
    with app.app_context():
        # إنشاء فئة المهارات الثقافية والدينية
        cultural_category = SkillCategory.query.filter_by(category_name="المهارات الثقافية والدينية").first()
        if not cultural_category:
            cultural_category = SkillCategory(
                category_name="المهارات الثقافية والدينية",
                description="مهارات التراث الثقافي والقيم الدينية والهوية الثقافية",
                icon="fas fa-mosque",
                color="#fd7e14",
                display_order=13
            )
            db.session.add(cultural_category)
            db.session.commit()
            print("تم إنشاء فئة المهارات الثقافية والدينية")
        
        # قائمة المهارات الثقافية والدينية
        cultural_skills = [
            # المهارات الدينية الأساسية
            {
                "skill_name": "يستمع للقرآن الكريم بهدوء",
                "description": "قدرة الطفل على الاستماع للتلاوة بسكينة وهدوء",
                "evaluation_criteria": "يهدأ ويستمع عند تشغيل القرآن الكريم لمدة 2-3 دقائق",
                "success_indicators": "الهدوء الروحي، الاستماع، التأثر بالقرآن"
            },
            {
                "skill_name": "يردد كلمات بسيطة من الأذكار",
                "description": "قدرة الطفل على تكرار كلمات دينية بسيطة",
                "evaluation_criteria": "يردد 'الله' أو 'بسم الله' أو كلمات بسيطة من الأذكار",
                "success_indicators": "التعلم الديني، التكرار، الذاكرة الدينية"
            },
            {
                "skill_name": "يظهر سعادة عند سماع الأناشيد الدينية",
                "description": "قدرة الطفل على التفاعل الإيجابي مع المحتوى الديني",
                "evaluation_criteria": "يبتسم أو يتحرك بسعادة عند سماع الأناشيد الإسلامية",
                "success_indicators": "الفرح الديني، التفاعل الإيجابي، حب الأناشيد"
            },
            {
                "skill_name": "يقلد حركات بسيطة من الصلاة",
                "description": "قدرة الطفل على محاكاة بعض حركات الصلاة",
                "evaluation_criteria": "يرفع يديه أو يضعهما على صدره تقليداً للكبار في الصلاة",
                "success_indicators": "التقليد الديني، المحاكاة، التعلم بالملاحظة"
            },
            {
                "skill_name": "يهدأ في أجواء العبادة",
                "description": "قدرة الطفل على التكيف مع البيئة الدينية الهادئة",
                "evaluation_criteria": "يصبح أكثر هدوءاً في المسجد أو أثناء الصلاة",
                "success_indicators": "الأدب الديني، احترام أوقات العبادة، الهدوء"
            },
            
            # مهارات التراث والثقافة
            {
                "skill_name": "يستمتع بالحكايات الشعبية",
                "description": "قدرة الطفل على الاستماع والتفاعل مع القصص التراثية",
                "evaluation_criteria": "يستمع للحكايات الشعبية ويظهر اهتماماً بها",
                "success_indicators": "حب التراث، الاستماع للقصص، الثقافة الشعبية"
            },
            {
                "skill_name": "يتفاعل مع الموسيقى التراثية",
                "description": "قدرة الطفل على الاستمتاع بالألحان والموسيقى التراثية",
                "evaluation_criteria": "يتحرك أو يستمع بسعادة للموسيقى التراثية العربية",
                "success_indicators": "التذوق الموسيقي التراثي، الهوية الثقافية، الاستمتاع"
            },
            {
                "skill_name": "يظهر اهتماماً بالملابس التراثية",
                "description": "قدرة الطفل على التفاعل مع الزي التراثي والثقافي",
                "evaluation_criteria": "يظهر فضولاً أو سعادة عند رؤية أو ارتداء الملابس التراثية",
                "success_indicators": "الهوية الثقافية، التقدير للتراث، الفخر بالثقافة"
            },
            {
                "skill_name": "يتعرف على بعض الرموز الثقافية",
                "description": "قدرة الطفل على التعرف على الرموز المهمة في ثقافته",
                "evaluation_criteria": "يتعرف على الهلال والنجمة أو رموز ثقافية أخرى",
                "success_indicators": "الوعي الثقافي، التعرف على الرموز، الهوية"
            },
            {
                "skill_name": "يشارك في المناسبات الثقافية البسيطة",
                "description": "قدرة الطفل على المشاركة في الفعاليات الثقافية المناسبة لعمره",
                "evaluation_criteria": "يشارك في احتفالات بسيطة أو مناسبات ثقافية",
                "success_indicators": "المشاركة الثقافية، الانتماء، التفاعل الاجتماعي"
            },
            
            # مهارات القيم والأخلاق
            {
                "skill_name": "يظهر لطفاً مع الحيوانات",
                "description": "قدرة الطفل على التعامل الرحيم مع الحيوانات",
                "evaluation_criteria": "يلمس الحيوانات بلطف ولا يؤذيها عمداً",
                "success_indicators": "الرحمة، اللطف، القيم الأخلاقية"
            },
            {
                "skill_name": "يساعد في أعمال الخير البسيطة",
                "description": "قدرة الطفل على المشاركة في أعمال الخير المناسبة لعمره",
                "evaluation_criteria": "يساعد في إعطاء الطعام للطيور أو أعمال خير بسيطة",
                "success_indicators": "العطاء، المساعدة، القيم الإيجابية"
            },
            {
                "skill_name": "يقول 'شكراً' أو يظهر الامتنان",
                "description": "قدرة الطفل على التعبير عن الشكر والامتنان",
                "evaluation_criteria": "يقول 'شكراً' أو يظهر سعادة عند تلقي شيء جميل",
                "success_indicators": "الامتنان، الأدب، التقدير"
            },
            {
                "skill_name": "يحترم الكبار ويظهر الأدب معهم",
                "description": "قدرة الطفل على إظهار الاحترام للأشخاص الأكبر سناً",
                "evaluation_criteria": "يهدأ ويتصرف بأدب أكثر في وجود كبار السن",
                "success_indicators": "احترام الكبار، الأدب، القيم الاجتماعية"
            },
            {
                "skill_name": "يظهر حناناً تجاه الأطفال الأصغر",
                "description": "قدرة الطفل على التعامل بلطف مع الأطفال الأصغر منه",
                "evaluation_criteria": "يتعامل بلطف مع الأطفال الأصغر ولا يؤذيهم",
                "success_indicators": "الحنان، الرعاية، الحس الأخوي"
            },
            
            # مهارات الهوية والانتماء
            {
                "skill_name": "يتعرف على اسم بلده أو مدينته",
                "description": "قدرة الطفل على معرفة المكان الذي يعيش فيه",
                "evaluation_criteria": "يردد اسم بلده أو مدينته عند السؤال أو التعليم",
                "success_indicators": "الهوية الوطنية، الانتماء، المعرفة الجغرافية"
            },
            {
                "skill_name": "يظهر سعادة عند رؤية العلم الوطني",
                "description": "قدرة الطفل على التفاعل الإيجابي مع رموز الوطن",
                "evaluation_criteria": "يبتسم أو يشير بسعادة عند رؤية العلم الوطني",
                "success_indicators": "الحب الوطني، التعرف على الرموز، الفخر"
            },
            {
                "skill_name": "يستمع للنشيد الوطني بهدوء",
                "description": "قدرة الطفل على إظهار الاحترام للنشيد الوطني",
                "evaluation_criteria": "يهدأ ويستمع عند تشغيل النشيد الوطني",
                "success_indicators": "الاحترام الوطني، الأدب، الهوية الوطنية"
            },
            {
                "skill_name": "يتعلم كلمات بسيطة من لغته الأم",
                "description": "قدرة الطفل على تعلم واستخدام كلمات من لغته الأصلية",
                "evaluation_criteria": "يتعلم ويستخدم كلمات عربية بسيطة في التواصل",
                "success_indicators": "الهوية اللغوية، التعلم، الثقافة اللغوية"
            },
            {
                "skill_name": "يفهم مفهوم العائلة والأسرة",
                "description": "قدرة الطفل على فهم العلاقات الأسرية الأساسية",
                "evaluation_criteria": "يتعرف على أفراد العائلة ويفهم العلاقات البسيطة",
                "success_indicators": "الروابط الأسرية، الهوية العائلية، الانتماء"
            },
            
            # مهارات المناسبات والاحتفالات
            {
                "skill_name": "يستمتع بالاحتفالات الدينية",
                "description": "قدرة الطفل على المشاركة في الأجواء الاحتفالية الدينية",
                "evaluation_criteria": "يظهر سعادة وتفاعل في المناسبات الدينية مثل العيد",
                "success_indicators": "الفرح الديني، المشاركة، الاحتفال"
            },
            {
                "skill_name": "يشارك في تحضير المناسبات البسيطة",
                "description": "قدرة الطفل على المساعدة في تحضيرات الاحتفالات",
                "evaluation_criteria": "يساعد في تزيين المكان أو تحضير أشياء بسيطة للمناسبات",
                "success_indicators": "المشاركة، التعاون، روح الاحتفال"
            },
            {
                "skill_name": "يتفاعل مع الضيوف بأدب",
                "description": "قدرة الطفل على التصرف بأدب في وجود الضيوف",
                "evaluation_criteria": "يتصرف بهدوء وأدب عند وجود ضيوف في المنزل",
                "success_indicators": "الضيافة، الأدب، السلوك الاجتماعي"
            },
            {
                "skill_name": "يفهم مفهوم العطاء والكرم",
                "description": "قدرة الطفل على فهم وممارسة قيم العطاء البسيطة",
                "evaluation_criteria": "يشارك طعامه أو ألعابه مع الآخرين أحياناً",
                "success_indicators": "الكرم، المشاركة، القيم الإيجابية"
            },
            {
                "skill_name": "يظهر احتراماً للأماكن المقدسة",
                "description": "قدرة الطفل على التصرف بأدب في الأماكن الدينية",
                "evaluation_criteria": "يهدأ ويتصرف بأدب في المسجد أو الأماكن المقدسة",
                "success_indicators": "الاحترام الديني، الأدب، التقدير للمقدسات"
            }
        ]
        
        # إضافة المهارات إلى قاعدة البيانات
        skills_added = 0
        for skill_data in cultural_skills:
            # التحقق من عدم وجود المهارة مسبقاً
            existing_skill = Skill.query.filter_by(skill_name=skill_data["skill_name"]).first()
            if not existing_skill:
                new_skill = Skill(
                    skill_name=skill_data["skill_name"],
                    description=skill_data["description"],
                    category_id=cultural_category.id,
                    skill_level="متوسط",
                    evaluation_criteria=skill_data["evaluation_criteria"],
                    success_indicators=skill_data["success_indicators"],
                    is_active=True
                )
                db.session.add(new_skill)
                skills_added += 1
        
        # حفظ التغييرات
        db.session.commit()
        print(f"تم إضافة {skills_added} مهارة ثقافية ودينية جديدة")
        print("تم إكمال إضافة جميع المهارات الثقافية والدينية بنجاح!")

if __name__ == "__main__":
    add_cultural_religious_skills()
