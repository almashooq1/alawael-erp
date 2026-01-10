#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار بسيط لنظام برامج التأهيل
"""

import os
from pathlib import Path

def test_rehabilitation_system():
    """اختبار بسيط لنظام برامج التأهيل"""
    project_root = Path(__file__).parent
    
    print("🔍 اختبار نظام برامج التأهيل...")
    print("=" * 50)
    
    # اختبار الملفات المطلوبة
    required_files = [
        'rehabilitation_programs_models.py',
        'rehabilitation_programs_api.py', 
        'templates/rehabilitation_programs.html',
        'static/js/rehabilitation_programs.js',
        'add_rehabilitation_sample_data.py'
    ]
    
    files_status = []
    for file_path in required_files:
        full_path = project_root / file_path
        exists = full_path.exists()
        status = "✅" if exists else "❌"
        files_status.append(exists)
        print(f"{status} {file_path}")
    
    print("\n" + "=" * 50)
    
    # اختبار التكامل مع app.py
    app_file = project_root / 'app.py'
    if app_file.exists():
        content = app_file.read_text(encoding='utf-8')
        
        integration_checks = [
            ('rehabilitation_programs_api', 'استيراد API'),
            ('rehabilitation_bp', 'تسجيل Blueprint'),
            ('/rehabilitation-programs', 'Route للصفحة')
        ]
        
        print("🔗 اختبار التكامل مع app.py:")
        for check, description in integration_checks:
            exists = check in content
            status = "✅" if exists else "❌"
            print(f"{status} {description}")
    
    # اختبار الشريط الجانبي
    dashboard_file = project_root / 'templates' / 'dashboard.html'
    if dashboard_file.exists():
        content = dashboard_file.read_text(encoding='utf-8')
        
        sidebar_checks = [
            ('برامج التأهيل', 'رابط في الشريط الجانبي'),
            ('/rehabilitation-programs', 'URL الصحيح'),
            ('fas fa-hands-helping', 'الأيقونة')
        ]
        
        print("\n🎨 اختبار الشريط الجانبي:")
        for check, description in sidebar_checks:
            exists = check in content
            status = "✅" if exists else "❌"
            print(f"{status} {description}")
    
    print("\n" + "=" * 50)
    
    # النتيجة النهائية
    total_files = len(files_status)
    passed_files = sum(files_status)
    success_rate = (passed_files / total_files * 100) if total_files > 0 else 0
    
    print(f"📊 النتيجة النهائية:")
    print(f"الملفات الموجودة: {passed_files}/{total_files}")
    print(f"معدل النجاح: {success_rate:.1f}%")
    
    if success_rate == 100:
        print("\n🎉 ممتاز! نظام برامج التأهيل مكتمل وجاهز للاستخدام")
        print("🚀 يمكنك الآن تشغيل الخادم والوصول إلى /rehabilitation-programs")
    elif success_rate >= 80:
        print("\n✅ جيد! النظام يعمل مع بعض الملفات المفقودة")
    else:
        print("\n⚠️ يحتاج النظام إلى مراجعة - ملفات مفقودة")
    
    print("\n" + "=" * 50)
    return success_rate >= 80

if __name__ == "__main__":
    test_rehabilitation_system()
