#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
فحص سريع للنظام - التحقق من الحالة الحالية
"""

import os
import ast

def check_file_syntax(file_path):
    """فحص بناء الجملة للملف"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        ast.parse(content)
        return True
    except:
        return False

def check_system_status():
    """فحص حالة النظام"""
    print("🔍 فحص سريع للنظام...")
    print("=" * 40)
    
    # فحص الملفات الأساسية
    core_files = {
        'models.py': 'نماذج قاعدة البيانات',
        'app.py': 'التطبيق الرئيسي',
        'database.py': 'إعدادات قاعدة البيانات'
    }
    
    files_status = {}
    for file_path, description in core_files.items():
        if os.path.exists(file_path):
            syntax_ok = check_file_syntax(file_path)
            status = "✅ سليم" if syntax_ok else "❌ خطأ في بناء الجملة"
            files_status[file_path] = syntax_ok
        else:
            status = "❌ غير موجود"
            files_status[file_path] = False
        
        print(f"{description}: {status}")
    
    # فحص المجلدات المهمة
    print(f"\n📁 المجلدات:")
    important_dirs = ['static', 'templates', 'uploads']
    for dir_name in important_dirs:
        status = "✅ موجود" if os.path.exists(dir_name) else "❌ غير موجود"
        print(f"{dir_name}: {status}")
    
    # تقييم عام
    all_files_ok = all(files_status.values())
    
    print(f"\n📊 التقييم العام:")
    if all_files_ok:
        print("🎉 النظام في حالة جيدة!")
        print("✅ جميع الملفات الأساسية سليمة")
    else:
        print("⚠️ يوجد مشاكل في النظام")
        failed_files = [f for f, status in files_status.items() if not status]
        print(f"❌ ملفات بها مشاكل: {', '.join(failed_files)}")
    
    return all_files_ok

if __name__ == "__main__":
    check_system_status()
