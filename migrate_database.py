#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
سكريبت migration لإنشاء الجداول الجديدة في قاعدة البيانات
"""

import os
import sys
from datetime import datetime

# إضافة المجلد الحالي إلى مسار Python
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import app, db
    from models import *
    
    def create_tables():
        """إنشاء جميع الجداول الجديدة"""
        print("🚀 بدء عملية migration لقاعدة البيانات...")
        
        with app.app_context():
            try:
                # إنشاء جميع الجداول
                db.create_all()
                print("✅ تم إنشاء جميع الجداول بنجاح!")
                
                # إنشاء بيانات تجريبية أساسية
                create_sample_data()
                
                print("🎉 تمت عملية migration بنجاح!")
                return True
                
            except Exception as e:
                print(f"❌ خطأ في إنشاء الجداول: {str(e)}")
                return False
    
    def create_sample_data():
        """إنشاء بيانات تجريبية أساسية"""
        print("📝 إنشاء بيانات تجريبية...")
        
        try:
            # التحقق من وجود فرع أساسي
            existing_branch = Branch.query.first()
            if not existing_branch:
                # إنشاء فرع رئيسي
                main_branch = Branch(
                    name="مركز الأوائل الرئيسي",
                    code="MAIN001",
                    address="الرياض، المملكة العربية السعودية",
                    phone="+966501234567",
                    email="info@awailcenters.com",
                    manager_name="أحمد محمد السعد",
                    capacity=200,
                    current_students=0,
                    establishment_date=datetime.now().date(),
                    license_number="LIC-2024-001",
                    is_active=True
                )
                db.session.add(main_branch)
                db.session.commit()
                print("✅ تم إنشاء الفرع الرئيسي")
                
                # إنشاء فصول تجريبية
                classrooms_data = [
                    {"name": "فصل الأطفال الصغار", "code": "CLS001", "grade_level": "روضة أولى", "age_group_min": 3, "age_group_max": 4},
                    {"name": "فصل الأطفال الكبار", "code": "CLS002", "grade_level": "روضة ثانية", "age_group_min": 4, "age_group_max": 5},
                    {"name": "فصل التمهيدي", "code": "CLS003", "grade_level": "تمهيدي", "age_group_min": 5, "age_group_max": 6}
                ]
                
                for cls_data in classrooms_data:
                    classroom = Classroom(
                        branch_id=main_branch.id,
                        **cls_data,
                        capacity=20,
                        current_students=0,
                        room_number=cls_data["code"],
                        floor=1,
                        area_sqm=50.0,
                        is_active=True,
                        academic_year="2024-2025",
                        semester="الفصل الأول"
                    )
                    db.session.add(classroom)
                
                db.session.commit()
                print("✅ تم إنشاء الفصول التجريبية")
            
            print("✅ تم إنشاء البيانات التجريبية بنجاح")
            
        except Exception as e:
            print(f"⚠️ تحذير في إنشاء البيانات التجريبية: {str(e)}")
            db.session.rollback()
    
    def check_database_status():
        """فحص حالة قاعدة البيانات"""
        print("🔍 فحص حالة قاعدة البيانات...")
        
        with app.app_context():
            try:
                # فحص الجداول الموجودة
        check_database_status()
        
        # تنفيذ Migration
        print("\n2️⃣ تنفيذ Migration:")
        success = create_tables()
        
        # فحص حالة قاعدة البيانات بعد Migration
        if success:
            print("\n3️⃣ فحص حالة قاعدة البيانات بعد Migration:")
            check_database_status()
            
            print("\n" + "=" * 50)
            print("🎉 تمت عملية Migration بنجاح!")
            print("يمكنك الآن استخدام النظام مع الجداول الجديدة")
            print("=" * 50)
        else:
            print("\n" + "=" * 50)
            print("❌ فشلت عملية Migration!")
            print("يرجى مراجعة الأخطاء أعلاه")
            print("=" * 50)

except ImportError as e:
    print(f"❌ خطأ في استيراد الوحدات: {str(e)}")
    print("تأكد من وجود ملفات app.py و models.py في نفس المجلد")
except Exception as e:
    print(f"❌ خطأ عام: {str(e)}")
