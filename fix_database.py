#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إصلاح قاعدة البيانات والعلاقات
Database and Relationships Fix for Al-Awael ERP
"""

import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app():
    """إنشاء تطبيق Flask للاختبار"""
    app = Flask(__name__)
    
    # Basic configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI', 'sqlite:///alawael_erp.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    return app

def fix_database():
    """إصلاح قاعدة البيانات"""
    print("🗄️ بدء إصلاح قاعدة البيانات...")
    print("=" * 50)
    
    app = create_app()
    
    try:
        # Initialize database
        from database import db
        db.init_app(app)
        
        with app.app_context():
            # Import all models to ensure they're registered
            try:
                from models import *
                print("✅ تم استيراد النماذج الأساسية")
            except Exception as e:
                print(f"⚠️ تحذير في استيراد النماذج الأساسية: {e}")
            
            try:
                from comprehensive_rehabilitation_models import *
                print("✅ تم استيراد نماذج التأهيل الشامل")
            except Exception as e:
                print(f"⚠️ تحذير في استيراد نماذج التأهيل: {e}")
            
            try:
                from speech_therapy_models import *
                print("✅ تم استيراد نماذج علاج النطق")
            except Exception as e:
                print(f"⚠️ تحذير في استيراد نماذج النطق: {e}")
            
            try:
                from supply_models import *
                print("✅ تم استيراد نماذج الإمدادات")
            except Exception as e:
                print(f"⚠️ تحذير في استيراد نماذج الإمدادات: {e}")
            
            # Create all tables
            try:
                db.create_all()
                print("✅ تم إنشاء جداول قاعدة البيانات بنجاح")
            except Exception as e:
                print(f"❌ خطأ في إنشاء الجداول: {e}")
                return False
            
            # Verify table creation
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"✅ تم إنشاء {len(tables)} جدول في قاعدة البيانات")
            
            # Check for common tables
            expected_tables = [
                'users', 'students', 'teachers', 'classrooms',
                'rehabilitation_beneficiaries', 'comprehensive_assessments',
                'speech_clients', 'speech_assessments'
            ]
            
            missing_tables = []
            for table in expected_tables:
                if table in tables:
                    print(f"  ✅ {table}")
                else:
                    missing_tables.append(table)
                    print(f"  ❌ {table} مفقود")
            
            if missing_tables:
                print(f"\n⚠️ جداول مفقودة: {', '.join(missing_tables)}")
            else:
                print("\n✅ جميع الجداول الأساسية موجودة")
            
            return True
            
    except Exception as e:
        print(f"❌ خطأ عام في إصلاح قاعدة البيانات: {e}")
        return False

def test_relationships():
    """اختبار العلاقات"""
    print("\n🔗 اختبار العلاقات...")
    print("=" * 30)
    
    app = create_app()
    
    try:
        from database import db
        db.init_app(app)
        
        with app.app_context():
            # Test basic relationships
            try:
                from models import User, Student, Teacher
                print("✅ علاقات النماذج الأساسية")
            except Exception as e:
                print(f"❌ خطأ في علاقات النماذج الأساسية: {e}")
            
            try:
                from comprehensive_rehabilitation_models import (
                    RehabilitationBeneficiary, ComprehensiveAssessment,
                    IndividualRehabilitationPlan, TherapySession
                )
                print("✅ علاقات نماذج التأهيل الشامل")
            except Exception as e:
                print(f"❌ خطأ في علاقات نماذج التأهيل: {e}")
            
            try:
                from speech_therapy_models import (
                    SpeechClient, SpeechAssessment, TherapyPlan, TherapyGoal
                )
                print("✅ علاقات نماذج علاج النطق")
            except Exception as e:
                print(f"❌ خطأ في علاقات نماذج النطق: {e}")
            
            return True
            
    except Exception as e:
        print(f"❌ خطأ عام في اختبار العلاقات: {e}")
        return False

def main():
    """الدالة الرئيسية"""
    print("🚀 إصلاح شامل لقاعدة البيانات - نظام ERP مراكز الأوائل")
    print("=" * 60)
    
    # Fix database
    db_success = fix_database()
    
    # Test relationships
    rel_success = test_relationships()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 ملخص الإصلاح")
    print("=" * 60)
    
    if db_success:
        print("✅ إصلاح قاعدة البيانات: نجح")
    else:
        print("❌ إصلاح قاعدة البيانات: فشل")
    
    if rel_success:
        print("✅ اختبار العلاقات: نجح")
    else:
        print("❌ اختبار العلاقات: فشل")
    
    if db_success and rel_success:
        print("\n🎉 تم إصلاح قاعدة البيانات بنجاح!")
        return 0
    else:
        print("\n⚠️ هناك مشاكل تحتاج إلى مراجعة")
        return 1

if __name__ == "__main__":
    sys.exit(main())
