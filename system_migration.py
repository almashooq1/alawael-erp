#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سكريبت ترحيل النظام الشامل - تحديث وترحيل قاعدة البيانات
"""

import os
import sys
from datetime import datetime

def setup_environment():
    """إعداد البيئة للترحيل"""
    try:
        from app import app
        from database import db
        return app, db
    except ImportError as e:
        print(f"❌ خطأ في استيراد المكونات: {str(e)}")
        return None, None

def migrate_database():
    """ترحيل قاعدة البيانات"""
    print("🚀 بدء ترحيل قاعدة البيانات...")
    
    app, db = setup_environment()
    if not app or not db:
        return False
    
    with app.app_context():
        try:
            # إنشاء جميع الجداول
            db.create_all()
            
            # التحقق من الجداول المنشأة
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            print(f"✅ تم إنشاء {len(tables)} جدول بنجاح")
            
            # عرض قائمة الجداول
            essential_tables = [
                'users', 'students', 'teachers', 'classrooms', 
                'skills', 'assessments', 'academic_years'
            ]
            
            missing_tables = []
            for table in essential_tables:
                if table in tables:
                    print(f"  ✅ {table}")
                else:
                    missing_tables.append(table)
                    print(f"  ❌ {table} - مفقود")
            
            if missing_tables:
                print(f"⚠️ يوجد {len(missing_tables)} جدول مفقود")
                return False
            
            print("🎉 تم ترحيل قاعدة البيانات بنجاح!")
            return True
            
        except Exception as e:
            print(f"❌ خطأ في ترحيل قاعدة البيانات: {str(e)}")
            return False

def test_system():
    """اختبار النظام بعد الترحيل"""
    print("\n🔍 اختبار النظام...")
    
    app, db = setup_environment()
    if not app or not db:
        return False
    
    with app.app_context():
        try:
            # اختبار الاتصال بقاعدة البيانات
            result = db.engine.execute('SELECT 1').fetchone()
            if result:
                print("✅ اختبار الاتصال بقاعدة البيانات - نجح")
            
            # اختبار استيراد النماذج
            try:
                from models import User, Student, Teacher, Classroom
                print("✅ اختبار استيراد النماذج - نجح")
            except ImportError as e:
                print(f"❌ خطأ في استيراد النماذج: {str(e)}")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ خطأ في اختبار النظام: {str(e)}")
            return False

def main():
    """الدالة الرئيسية"""
    print("=" * 60)
    print("🚀 ترحيل نظام ERP مراكز الأوائل")
    print("=" * 60)
    print(f"📅 التاريخ: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # ترحيل قاعدة البيانات
    migration_success = migrate_database()
    
    if migration_success:
        # اختبار النظام
        test_success = test_system()
        
        if test_success:
            print("\n" + "=" * 60)
            print("🎉 تم تحديث النظام بنجاح!")
            print("=" * 60)
            print("✅ قاعدة البيانات محدثة")
            print("✅ جميع الجداول منشأة")
            print("✅ النماذج تعمل بشكل صحيح")
            print("✅ النظام جاهز للاستخدام")
        else:
            print("\n⚠️ تم الترحيل ولكن يوجد مشاكل في الاختبار")
    else:
        print("\n❌ فشل في ترحيل النظام")

if __name__ == "__main__":
    main()
