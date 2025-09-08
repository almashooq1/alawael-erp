#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إعداد العيادات المتخصصة الأساسية
"""

from app import app, db
from models import ClinicType

def setup_basic_clinics():
    """إضافة العيادات المتخصصة الأساسية للنظام"""
    
    with app.app_context():
        # قائمة العيادات المتخصصة
        clinics_data = [
            {
                "clinic_name": "العيادة الطبية",
                "description": "فحص طبي شامل ومتابعة الحالة الصحية العامة للأطفال",
                "icon": "fas fa-stethoscope",
                "color": "#dc3545"
            },
            {
                "clinic_name": "العيادة الاجتماعية",
                "description": "تقييم الحالة الاجتماعية وتطوير المهارات الاجتماعية والسلوكية",
                "icon": "fas fa-users",
                "color": "#28a745"
            },
            {
                "clinic_name": "العيادة النفسية",
                "description": "تقييم وعلاج الحالات النفسية والسلوكية والعاطفية",
                "icon": "fas fa-brain",
                "color": "#6f42c1"
            },
            {
                "clinic_name": "عيادة النطق والتخاطب",
                "description": "تقييم وعلاج اضطرابات النطق واللغة والتواصل",
                "icon": "fas fa-comments",
                "color": "#fd7e14"
            },
            {
                "clinic_name": "عيادة العلاج الطبيعي",
                "description": "تقييم وعلاج المشاكل الحركية وتطوير المهارات الحركية الكبرى",
                "icon": "fas fa-running",
                "color": "#20c997"
            },
            {
                "clinic_name": "عيادة العلاج الوظيفي",
                "description": "تطوير المهارات الحركية الدقيقة والأنشطة اليومية والاستقلالية",
                "icon": "fas fa-hand-paper",
                "color": "#17a2b8"
            }
        ]
        
        # إضافة العيادات إلى قاعدة البيانات
        clinics_added = 0
        for clinic_data in clinics_data:
            # التحقق من عدم وجود العيادة مسبقاً
            existing_clinic = ClinicType.query.filter_by(clinic_name=clinic_data["clinic_name"]).first()
            if not existing_clinic:
                new_clinic = ClinicType(
                    clinic_name=clinic_data["clinic_name"],
                    description=clinic_data["description"],
                    icon=clinic_data["icon"],
                    color=clinic_data["color"],
                    is_active=True
                )
                db.session.add(new_clinic)
                clinics_added += 1
        
        # حفظ التغييرات
        db.session.commit()
        print(f"تم إضافة {clinics_added} عيادة متخصصة جديدة")
        print("تم إكمال إعداد العيادات المتخصصة بنجاح!")
        
        # عرض العيادات المضافة
        all_clinics = ClinicType.query.all()
        print("\nالعيادات المتاحة:")
        for clinic in all_clinics:
            print(f"- {clinic.clinic_name}: {clinic.description}")

if __name__ == "__main__":
    setup_basic_clinics()
