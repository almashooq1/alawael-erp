#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار سريع لنظام المراقبة المتكامل
Quick System Test for Surveillance Integration
"""

import os
import sys

def test_surveillance_files():
    """اختبار وجود ملفات نظام المراقبة"""
    surveillance_files = [
        'surveillance_system_models.py',
        'surveillance_system_services.py', 
        'surveillance_system_api.py',
        'enhanced_surveillance_services.py',
        'hikvision_integration.py',
        'claude_ai_integration.py',
        'templates/surveillance_management.html',
        'static/js/surveillance_management.js',
        'add_surveillance_sample_data.py'
    ]
    
    results = []
    for file_path in surveillance_files:
        if os.path.exists(file_path):
            results.append(f"✅ {file_path}")
        else:
            results.append(f"❌ {file_path}")
    
    return results

def test_app_integration():
    """اختبار تكامل النظام مع التطبيق الرئيسي"""
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # فحص تسجيل blueprint
        if 'surveillance_system_bp' in content:
            return "✅ تم تسجيل surveillance blueprint في app.py"
        else:
            return "❌ لم يتم تسجيل surveillance blueprint"
    except Exception as e:
        return f"❌ خطأ في فحص app.py: {e}"

def test_basic_imports():
    """اختبار الاستيرادات الأساسية"""
    try:
        # اختبار استيراد النماذج
        sys.path.append('.')
        import surveillance_system_models
        
        # اختبار استيراد الخدمات
        import surveillance_system_services
        
        # اختبار استيراد API
        import surveillance_system_api
        
        return "✅ جميع استيرادات نظام المراقبة تعمل بنجاح"
    except Exception as e:
        return f"❌ خطأ في الاستيراد: {e}"

def run_quick_test():
    """تشغيل الاختبار السريع"""
    print("=" * 60)
    print("🔍 اختبار سريع لنظام المراقبة المتكامل")
    print("=" * 60)
    
    # اختبار الملفات
    print("\n📁 فحص ملفات النظام:")
    file_results = test_surveillance_files()
    for result in file_results:
        print(f"  {result}")
    
    # اختبار التكامل
    print(f"\n🔗 فحص التكامل: {test_app_integration()}")
    
    # اختبار الاستيرادات
    print(f"\n📦 فحص الاستيرادات: {test_basic_imports()}")
    
    # حساب النتيجة
    success_count = sum(1 for result in file_results if result.startswith("✅"))
    total_files = len(file_results)
    success_rate = (success_count / total_files) * 100
    
    print("\n" + "=" * 60)
    print(f"📊 النتيجة النهائية: {success_count}/{total_files} ملف ({success_rate:.1f}%)")
    
    if success_rate >= 90:
        print("🎉 النظام جاهز للاستخدام!")
        status = "مكتمل"
    elif success_rate >= 70:
        print("⚠️ النظام يحتاج تحسينات طفيفة")
        status = "يحتاج تحسين"
    else:
        print("❌ النظام يحتاج إصلاحات")
        status = "يحتاج إصلاح"
    
    print("=" * 60)
    return status

if __name__ == "__main__":
    run_quick_test()
