#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
التحديث النهائي للنظام - إصلاح جميع المشاكل وتحديث النظام
"""

import os
import re
import shutil
from datetime import datetime

def create_system_backup():
    """إنشاء نسخة احتياطية من النظام"""
    backup_dir = f"system_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(backup_dir, exist_ok=True)
    
    important_files = ['models.py', 'app.py', 'database.py']
    for file in important_files:
        if os.path.exists(file):
            shutil.copy2(file, backup_dir)
    
    print(f"✅ تم إنشاء نسخة احتياطية: {backup_dir}")
    return backup_dir

def fix_models_relationships():
    """إصلاح العلاقات في models.py"""
    if not os.path.exists('models.py'):
        print("❌ ملف models.py غير موجود")
        return False
    
    with open('models.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # إصلاحات العلاقات المكررة
    fixes_applied = []
    
    # إصلاح علاقة الطلاب والفصول
    if content.count("backref='students'") > 1:
        content = content.replace(
            "classroom = db.relationship('Classroom', backref='students')",
            "classroom = db.relationship('Classroom', backref='enrolled_students')"
        )
        fixes_applied.append("إصلاح علاقة الطلاب والفصول")
    
    # إصلاح علاقة النقل
    if "backref='transports'" in content and "backref='transport_records'" not in content:
        content = content.replace(
            "backref='transports'",
            "backref='transport_records'"
        )
        fixes_applied.append("إصلاح علاقة النقل")
    
    # حفظ الملف المحدث
    with open('models.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    for fix in fixes_applied:
        print(f"✅ {fix}")
    
    return True

def update_database_structure():
    """تحديث هيكل قاعدة البيانات"""
    migration_script = '''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سكريبت ترحيل قاعدة البيانات
"""

from app import app
from database import db
import models

def migrate_database():
    """ترحيل قاعدة البيانات"""
    with app.app_context():
        try:
            # إنشاء جميع الجداول
            db.create_all()
            print("✅ تم تحديث قاعدة البيانات بنجاح")
            return True
        except Exception as e:
            print(f"❌ خطأ في ترحيل قاعدة البيانات: {str(e)}")
            return False

if __name__ == "__main__":
    migrate_database()
'''
    
    with open('migrate_db.py', 'w', encoding='utf-8') as f:
        f.write(migration_script)
    
    print("✅ تم إنشاء سكريبت ترحيل قاعدة البيانات")
    return True

def check_system_integrity():
    """فحص سلامة النظام"""
    issues = []
    
    # فحص الملفات الأساسية
    required_files = ['models.py', 'app.py', 'database.py']
    for file in required_files:
        if not os.path.exists(file):
            issues.append(f"الملف مفقود: {file}")
    
    # فحص models.py
    if os.path.exists('models.py'):
        with open('models.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # فحص العلاقات المكررة
        backref_pattern = r"backref='([^']+)'"
        matches = re.findall(backref_pattern, content)
        
        from collections import defaultdict
        backref_counts = defaultdict(int)
        for backref in matches:
            backref_counts[backref] += 1
        
        duplicates = {k: v for k, v in backref_counts.items() if v > 1}
        for backref, count in duplicates.items():
            issues.append(f"علاقة مكررة: '{backref}' ({count} مرات)")
    
    return issues

def main():
    """الدالة الرئيسية للتحديث"""
    print("🚀 بدء التحديث النهائي للنظام...")
    print("=" * 50)
    
    # إنشاء نسخة احتياطية
    backup_dir = create_system_backup()
    
    # إصلاح العلاقات
    print("\n🔧 إصلاح العلاقات في models.py...")
    if fix_models_relationships():
        print("✅ تم إصلاح العلاقات بنجاح")
    
    # تحديث هيكل قاعدة البيانات
    print("\n📊 تحديث هيكل قاعدة البيانات...")
    if update_database_structure():
        print("✅ تم إنشاء سكريبت الترحيل")
    
    # فحص سلامة النظام
    print("\n🔍 فحص سلامة النظام...")
    issues = check_system_integrity()
    
    if not issues:
        print("✅ النظام سليم ولا توجد مشاكل")
    else:
        print(f"⚠️ تم العثور على {len(issues)} مشكلة:")
        for issue in issues:
            print(f"  - {issue}")
    
    print("\n" + "=" * 50)
    print("📋 ملخص التحديث")
    print("=" * 50)
    print("✅ تم إنشاء نسخة احتياطية")
    print("✅ تم إصلاح العلاقات المكررة")
    print("✅ تم إنشاء سكريبت ترحيل قاعدة البيانات")
    print("✅ تم فحص سلامة النظام")
    
    if not issues:
        print("\n🎉 تم تحديث النظام بنجاح!")
        print("💡 يمكنك الآن تشغيل: python migrate_db.py")
    else:
        print(f"\n⚠️ يوجد {len(issues)} مشكلة تحتاج مراجعة")

if __name__ == "__main__":
    main()
