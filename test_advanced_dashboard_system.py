# -*- coding: utf-8 -*-
"""
اختبار نظام لوحة التحكم التفاعلية المتقدمة
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

import sys
import os
import traceback
from datetime import datetime

def test_advanced_dashboard_system():
    """اختبار شامل لنظام لوحة التحكم المتقدمة"""
    
    print("=" * 70)
    print("🧪 بدء اختبار نظام لوحة التحكم التفاعلية المتقدمة")
    print("=" * 70)
    
    test_results = {
        'total_tests': 0,
        'passed_tests': 0,
        'failed_tests': 0,
        'errors': []
    }
    
    # 1. اختبار استيراد النماذج
    print("\n1️⃣ اختبار استيراد نماذج قاعدة البيانات...")
    test_results['total_tests'] += 1
    
    try:
        from advanced_dashboard_models import (
            DashboardWidget, DashboardLayout, DashboardAlert, DashboardFilter,
            DashboardMetric, DashboardExport, DashboardTheme, DashboardNotification
        )
        print("✅ تم استيراد جميع النماذج بنجاح")
        test_results['passed_tests'] += 1
    except Exception as e:
        print(f"❌ خطأ في استيراد النماذج: {str(e)}")
        test_results['failed_tests'] += 1
        test_results['errors'].append(f"استيراد النماذج: {str(e)}")
    
    # 2. اختبار استيراد الخدمات
    print("\n2️⃣ اختبار استيراد خدمات لوحة التحكم...")
    test_results['total_tests'] += 1
    
    try:
        from advanced_dashboard_services import AdvancedDashboardService
        print("✅ تم استيراد خدمات لوحة التحكم بنجاح")
        test_results['passed_tests'] += 1
    except Exception as e:
        print(f"❌ خطأ في استيراد الخدمات: {str(e)}")
        test_results['failed_tests'] += 1
        test_results['errors'].append(f"استيراد الخدمات: {str(e)}")
    
    # 3. اختبار استيراد API
    print("\n3️⃣ اختبار استيراد API endpoints...")
    test_results['total_tests'] += 1
    
    try:
        from advanced_dashboard_api import advanced_dashboard_bp
        print("✅ تم استيراد API endpoints بنجاح")
        test_results['passed_tests'] += 1
    except Exception as e:
        print(f"❌ خطأ في استيراد API: {str(e)}")
        test_results['failed_tests'] += 1
        test_results['errors'].append(f"استيراد API: {str(e)}")
    
    # 4. اختبار ملفات الواجهة
    print("\n4️⃣ اختبار ملفات الواجهة...")
    test_results['total_tests'] += 2
    
    # اختبار HTML template
    html_file = 'templates/advanced_dashboard.html'
    if os.path.exists(html_file):
        print("✅ ملف HTML موجود")
        test_results['passed_tests'] += 1
    else:
        print("❌ ملف HTML غير موجود")
        test_results['failed_tests'] += 1
        test_results['errors'].append("ملف HTML غير موجود")
    
    # اختبار JavaScript file
    js_file = 'static/js/advanced_dashboard.js'
    if os.path.exists(js_file):
        print("✅ ملف JavaScript موجود")
        test_results['passed_tests'] += 1
    else:
        print("❌ ملف JavaScript غير موجود")
        test_results['failed_tests'] += 1
        test_results['errors'].append("ملف JavaScript غير موجود")
    
    # 5. اختبار التكامل مع التطبيق الرئيسي
    print("\n5️⃣ اختبار التكامل مع التطبيق الرئيسي...")
    test_results['total_tests'] += 1
    
    try:
        # قراءة app.py للتحقق من التكامل
        with open('app.py', 'r', encoding='utf-8') as f:
            app_content = f.read()
            
        if 'advanced_dashboard_bp' in app_content and 'register_blueprint' in app_content:
            print("✅ تم تسجيل Blueprint في التطبيق الرئيسي")
            test_results['passed_tests'] += 1
        else:
            print("❌ لم يتم تسجيل Blueprint في التطبيق الرئيسي")
            test_results['failed_tests'] += 1
            test_results['errors'].append("Blueprint غير مسجل")
            
    except Exception as e:
        print(f"❌ خطأ في فحص التكامل: {str(e)}")
        test_results['failed_tests'] += 1
        test_results['errors'].append(f"فحص التكامل: {str(e)}")
    
    # 6. اختبار ملف البيانات التجريبية
    print("\n6️⃣ اختبار ملف البيانات التجريبية...")
    test_results['total_tests'] += 1
    
    sample_data_file = 'add_advanced_dashboard_sample_data.py'
    if os.path.exists(sample_data_file):
        try:
            # محاولة استيراد الدالة
            sys.path.append(os.getcwd())
            from add_advanced_dashboard_sample_data import add_advanced_dashboard_sample_data
            print("✅ ملف البيانات التجريبية جاهز")
            test_results['passed_tests'] += 1
        except Exception as e:
            print(f"❌ خطأ في ملف البيانات التجريبية: {str(e)}")
            test_results['failed_tests'] += 1
            test_results['errors'].append(f"البيانات التجريبية: {str(e)}")
    else:
        print("❌ ملف البيانات التجريبية غير موجود")
        test_results['failed_tests'] += 1
        test_results['errors'].append("ملف البيانات التجريبية غير موجود")
    
    # 7. اختبار route في dashboard.html
    print("\n7️⃣ اختبار إضافة الرابط في لوحة التحكم...")
    test_results['total_tests'] += 1
    
    try:
        with open('templates/dashboard.html', 'r', encoding='utf-8') as f:
            dashboard_content = f.read()
            
        if 'advanced-dashboard' in dashboard_content and 'لوحة التحكم المتقدمة' in dashboard_content:
            print("✅ تم إضافة الرابط في لوحة التحكم")
            test_results['passed_tests'] += 1
        else:
            print("❌ لم يتم إضافة الرابط في لوحة التحكم")
            test_results['failed_tests'] += 1
            test_results['errors'].append("الرابط غير موجود في لوحة التحكم")
            
    except Exception as e:
        print(f"❌ خطأ في فحص لوحة التحكم: {str(e)}")
        test_results['failed_tests'] += 1
        test_results['errors'].append(f"فحص لوحة التحكم: {str(e)}")
    
    # طباعة النتائج النهائية
    print("\n" + "=" * 70)
    print("📊 نتائج الاختبار النهائية")
    print("=" * 70)
    
    print(f"📈 إجمالي الاختبارات: {test_results['total_tests']}")
    print(f"✅ الاختبارات الناجحة: {test_results['passed_tests']}")
    print(f"❌ الاختبارات الفاشلة: {test_results['failed_tests']}")
    
    success_rate = (test_results['passed_tests'] / test_results['total_tests']) * 100
    print(f"📊 معدل النجاح: {success_rate:.1f}%")
    
    if test_results['errors']:
        print("\n🚨 الأخطاء المكتشفة:")
        for i, error in enumerate(test_results['errors'], 1):
            print(f"   {i}. {error}")
    
    print("\n" + "=" * 70)
    
    if success_rate >= 80:
        print("🎉 نظام لوحة التحكم التفاعلية المتقدمة جاهز للاستخدام!")
        print("💡 يمكنك الآن:")
        print("   • تشغيل التطبيق والوصول إلى /advanced-dashboard")
        print("   • إضافة البيانات التجريبية")
        print("   • تخصيص الودجات والتخطيطات")
        print("   • استخدام الميزات التفاعلية المتقدمة")
    else:
        print("⚠️ يحتاج النظام إلى إصلاحات قبل الاستخدام")
        print("🔧 يرجى مراجعة الأخطاء المذكورة أعلاه")
    
    print("=" * 70)
    
    return test_results

if __name__ == '__main__':
    test_advanced_dashboard_system()
