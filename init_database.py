#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database Initialization Script
سكريپت تهيئة قاعدة البيانات
"""

from flask import Flask
from database import db
import os

def init_database():
    """تهيئة قاعدة البيانات وإنشاء الجداول"""
    print("🗄️ بدء تهيئة قاعدة البيانات...")
    
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///alawael_erp.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        try:
            # Import all models
            print("📋 استيراد النماذج...")
            from models import *
            
            # Try to import additional models safely
            try:
                from comprehensive_rehabilitation_models import *
                print("✅ تم استيراد نماذج التأهيل الشامل")
            except ImportError as e:
                print(f"⚠️ تعذر استيراد نماذج التأهيل الشامل: {e}")
            
            try:
                from speech_therapy_models import *
                print("✅ تم استيراد نماذج علاج النطق")
            except ImportError as e:
                print(f"⚠️ تعذر استيراد نماذج علاج النطق: {e}")
            
            try:
                from rehabilitation_programs_models import *
                print("✅ تم استيراد نماذج برامج التأهيل")
            except ImportError as e:
                print(f"⚠️ تعذر استيراد نماذج برامج التأهيل: {e}")
            
            # Create all tables
            print("🔨 إنشاء الجداول...")
            db.create_all()
            
            print("✅ تم إنشاء قاعدة البيانات بنجاح!")
            return True
            
        except Exception as e:
            print(f"❌ خطأ في تهيئة قاعدة البيانات: {e}")
            return False

if __name__ == "__main__":
    success = init_database()
    if success:
        print("🎉 تمت تهيئة قاعدة البيانات بنجاح!")
    else:
        print("💥 فشلت تهيئة قاعدة البيانات!")
