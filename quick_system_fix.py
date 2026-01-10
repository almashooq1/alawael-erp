#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
أداة الإصلاح السريع للنظام
Quick System Fix for Al-Awael ERP
"""

import os
import re
import sys
from pathlib import Path

def fix_main_issues():
    """إصلاح المشاكل الرئيسية"""
    print("🔧 بدء الإصلاح السريع للنظام...")
    
    project_path = Path(os.getcwd())
    fixes = []
    errors = []
    
    # 1. فحص وإصلاح app.py
    print("📋 فحص app.py...")
    app_file = project_path / 'app.py'
    if app_file.exists():
        try:
            with open(app_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # التحقق من الاستيرادات الأساسية
            if 'from database import db' in content:
                fixes.append("✅ استيراد قاعدة البيانات صحيح")
            else:
                errors.append("❌ مشكلة في استيراد قاعدة البيانات")
                
        except Exception as e:
            errors.append(f"❌ خطأ في قراءة app.py: {e}")
    
    # 2. فحص database.py
    print("🗄️ فحص database.py...")
    db_file = project_path / 'database.py'
    if db_file.exists():
        fixes.append("✅ ملف database.py موجود")
    else:
        print("إنشاء database.py...")
        db_content = '''from flask_sqlalchemy import SQLAlchemy

# إنشاء مثيل SQLAlchemy واحد للتطبيق بأكمله
db = SQLAlchemy()
'''
        with open(db_file, 'w', encoding='utf-8') as f:
            f.write(db_content)
        fixes.append("✅ تم إنشاء database.py")
    
    # 3. فحص models.py
    print("📊 فحص models.py...")
    models_file = project_path / 'models.py'
    if models_file.exists():
        fixes.append("✅ ملف models.py موجود")
    else:
        errors.append("❌ ملف models.py مفقود")
    
    # 4. فحص requirements.txt
    print("📦 فحص requirements.txt...")
    req_file = project_path / 'requirements.txt'
    if req_file.exists():
        try:
            with open(req_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # إزالة التكرارات
            lines = content.split('\n')
            seen = set()
            cleaned_lines = []
            
            for line in lines:
                line = line.strip()
                if line and not line.startswith('#'):
                    package = line.split('==')[0].split('>=')[0].split('<=')[0]
                    if package not in seen:
                        seen.add(package)
                        cleaned_lines.append(line)
                elif line.startswith('#') or not line:
                    cleaned_lines.append(line)
            
            cleaned_content = '\n'.join(cleaned_lines)
            if cleaned_content != content:
                with open(req_file, 'w', encoding='utf-8') as f:
                    f.write(cleaned_content)
                fixes.append("✅ تم تنظيف requirements.txt")
            else:
                fixes.append("✅ requirements.txt نظيف")
                
        except Exception as e:
            errors.append(f"❌ خطأ في requirements.txt: {e}")
    
    # 5. إنشاء ملف .env إذا لم يكن موجوداً
    print("⚙️ فحص .env...")
    env_file = project_path / '.env'
    if not env_file.exists():
        env_content = '''FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
DATABASE_URI=sqlite:///alawael_erp.db
JWT_SECRET_KEY=dev-jwt-secret-key-change-in-production
'''
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(env_content)
        fixes.append("✅ تم إنشاء ملف .env")
    else:
        fixes.append("✅ ملف .env موجود")
    
    # 6. اختبار الاستيرادات الأساسية
    print("🧪 اختبار الاستيرادات...")
    try:
        sys.path.insert(0, str(project_path))
        from database import db
        fixes.append("✅ استيراد database نجح")
    except Exception as e:
        errors.append(f"❌ فشل استيراد database: {e}")
    
    try:
        from models import User
        fixes.append("✅ استيراد models نجح")
    except Exception as e:
        errors.append(f"❌ فشل استيراد models: {e}")
    
    # طباعة النتائج
    print("\n" + "="*50)
    print("📋 تقرير الإصلاح السريع")
    print("="*50)
    
    print(f"\n✅ الإصلاحات ({len(fixes)}):")
    for i, fix in enumerate(fixes, 1):
        print(f"  {i}. {fix}")
    
    if errors:
        print(f"\n❌ الأخطاء ({len(errors)}):")
        for i, error in enumerate(errors, 1):
            print(f"  {i}. {error}")
    else:
        print("\n🎉 لا توجد أخطاء!")
    
    success_rate = len(fixes) / (len(fixes) + len(errors)) * 100 if (len(fixes) + len(errors)) > 0 else 100
    print(f"\n📊 معدل النجاح: {success_rate:.1f}%")
    
    return len(errors) == 0

if __name__ == "__main__":
    success = fix_main_issues()
    if success:
        print("\n🏁 الإصلاح السريع اكتمل بنجاح!")
    else:
        print("\n⚠️ يوجد مشاكل تحتاج إصلاح إضافي")
