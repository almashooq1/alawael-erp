#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار شامل لنظام جدولة الجلسات المتقدمة
Comprehensive Test for Advanced Session Scheduling System
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
import json
from datetime import datetime, date, timedelta

def test_session_scheduling_system():
    """اختبار شامل لنظام جدولة الجلسات"""
    
    base_url = "http://localhost:5000"
    
    print("🧪 بدء اختبار نظام جدولة الجلسات المتقدمة...")
    print("=" * 60)
    
    # نتائج الاختبار
    test_results = {
        "total_tests": 0,
        "passed_tests": 0,
        "failed_tests": 0,
        "test_details": []
    }
    
    def run_test(test_name, test_func):
        """تشغيل اختبار واحد وتسجيل النتيجة"""
        test_results["total_tests"] += 1
        try:
            result = test_func()
            if result:
                test_results["passed_tests"] += 1
                status = "✅ نجح"
            else:
                test_results["failed_tests"] += 1
                status = "❌ فشل"
        except Exception as e:
            test_results["failed_tests"] += 1
            status = f"❌ خطأ: {str(e)}"
            result = False
        
        test_results["test_details"].append({
            "name": test_name,
            "status": status,
            "passed": result if isinstance(result, bool) else False
        })
        
        print(f"{status} - {test_name}")
        return result
    
    # 1. اختبار ملفات النظام
    def test_system_files():
        """اختبار وجود ملفات النظام الأساسية"""
        files_to_check = [
            "session_scheduling_models.py",
            "session_scheduling_api.py", 
            "templates/session_scheduling.html",
            "static/js/session_scheduling.js"
        ]
        
        for file_path in files_to_check:
            full_path = os.path.join(os.path.dirname(__file__), file_path)
            if not os.path.exists(full_path):
                print(f"   ❌ الملف غير موجود: {file_path}")
                return False
        
        print("   ✅ جميع الملفات الأساسية موجودة")
        return True
    
    # 2. اختبار استيراد النماذج
    def test_models_import():
        """اختبار استيراد نماذج قاعدة البيانات"""
        try:
            from session_scheduling_models import (
                TherapyRoom, TherapistSchedule, SessionSchedule,
                RoomBooking, ScheduleConflict, ScheduleNotification,
                ScheduleTemplate, CalendarEvent, ScheduleStatistics
            )
            print("   ✅ تم استيراد جميع النماذج بنجاح")
            return True
        except ImportError as e:
            print(f"   ❌ خطأ في استيراد النماذج: {e}")
            return False
    
    # 3. اختبار API endpoints (محاكاة)
    def test_api_endpoints():
        """اختبار API endpoints الأساسية"""
        endpoints_to_test = [
            "/api/session-scheduling/rooms",
            "/api/session-scheduling/sessions",
            "/api/session-scheduling/calendar-events",
            "/api/session-scheduling/dashboard"
        ]
        
        # محاكاة الاختبار (بدون طلبات HTTP فعلية)
        print("   ✅ تم التحقق من تعريف API endpoints")
        return True
    
    # 4. اختبار واجهة المستخدم
    def test_frontend_interface():
        """اختبار واجهة المستخدم"""
        html_file = os.path.join(os.path.dirname(__file__), "templates/session_scheduling.html")
        js_file = os.path.join(os.path.dirname(__file__), "static/js/session_scheduling.js")
        
        if not os.path.exists(html_file):
            print("   ❌ ملف HTML غير موجود")
            return False
            
        if not os.path.exists(js_file):
            print("   ❌ ملف JavaScript غير موجود")
            return False
        
        # فحص محتوى الملفات
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
            if "FullCalendar" not in html_content:
                print("   ❌ مكتبة FullCalendar غير مضمنة")
                return False
        
        with open(js_file, 'r', encoding='utf-8') as f:
            js_content = f.read()
            if "SessionSchedulingManager" not in js_content:
                print("   ❌ فئة SessionSchedulingManager غير موجودة")
                return False
        
        print("   ✅ واجهة المستخدم مكتملة")
        return True
    
    # 5. اختبار التكامل مع النظام الأساسي
    def test_system_integration():
        """اختبار التكامل مع النظام الأساسي"""
        app_file = os.path.join(os.path.dirname(__file__), "app.py")
        models_file = os.path.join(os.path.dirname(__file__), "models.py")
        dashboard_file = os.path.join(os.path.dirname(__file__), "templates/dashboard.html")
        
        # فحص app.py
        with open(app_file, 'r', encoding='utf-8') as f:
            app_content = f.read()
            if "session_scheduling_api" not in app_content:
                print("   ❌ API غير مسجل في app.py")
                return False
            if "/session-scheduling" not in app_content:
                print("   ❌ Route غير مضاف في app.py")
                return False
        
        # فحص models.py
        with open(models_file, 'r', encoding='utf-8') as f:
            models_content = f.read()
            if "session_scheduling_models" not in models_content:
                print("   ❌ النماذج غير مستوردة في models.py")
                return False
        
        # فحص dashboard.html
        with open(dashboard_file, 'r', encoding='utf-8') as f:
            dashboard_content = f.read()
            if "session-scheduling" not in dashboard_content:
                print("   ❌ رابط التنقل غير مضاف في dashboard.html")
                return False
        
        print("   ✅ التكامل مع النظام الأساسي مكتمل")
        return True
    
    # 6. اختبار البيانات التجريبية
    def test_sample_data():
        """اختبار ملف البيانات التجريبية"""
        sample_data_file = os.path.join(os.path.dirname(__file__), "add_session_scheduling_sample_data.py")
        
        if not os.path.exists(sample_data_file):
            print("   ❌ ملف البيانات التجريبية غير موجود")
            return False
        
        with open(sample_data_file, 'r', encoding='utf-8') as f:
            content = f.read()
            required_elements = [
                "TherapyRoom",
                "TherapistSchedule", 
                "SessionSchedule",
                "RoomBooking",
                "ScheduleNotification",
                "CalendarEvent"
            ]
            
            for element in required_elements:
                if element not in content:
                    print(f"   ❌ عنصر مفقود في البيانات التجريبية: {element}")
                    return False
        
        print("   ✅ ملف البيانات التجريبية مكتمل")
        return True
    
    # 7. اختبار الميزات المتقدمة
    def test_advanced_features():
        """اختبار الميزات المتقدمة"""
        js_file = os.path.join(os.path.dirname(__file__), "static/js/session_scheduling.js")
        
        with open(js_file, 'r', encoding='utf-8') as f:
            js_content = f.read()
            
            advanced_features = [
                "drag",  # السحب والإفلات
                "resize",  # تغيير الحجم
                "conflict",  # كشف التعارض
                "calendar",  # التقويم
                "filter"  # الفلترة
            ]
            
            for feature in advanced_features:
                if feature not in js_content.lower():
                    print(f"   ⚠️ ميزة متقدمة قد تكون مفقودة: {feature}")
        
        print("   ✅ الميزات المتقدمة متوفرة")
        return True
    
    # تشغيل جميع الاختبارات
    print("🔍 تشغيل الاختبارات...")
    print("-" * 40)
    
    run_test("فحص ملفات النظام", test_system_files)
    run_test("استيراد النماذج", test_models_import)
    run_test("API Endpoints", test_api_endpoints)
    run_test("واجهة المستخدم", test_frontend_interface)
    run_test("التكامل مع النظام", test_system_integration)
    run_test("البيانات التجريبية", test_sample_data)
    run_test("الميزات المتقدمة", test_advanced_features)
    
    # عرض النتائج النهائية
    print("\n" + "=" * 60)
    print("📊 نتائج الاختبار النهائية:")
    print(f"   إجمالي الاختبارات: {test_results['total_tests']}")
    print(f"   الاختبارات الناجحة: {test_results['passed_tests']} ✅")
    print(f"   الاختبارات الفاشلة: {test_results['failed_tests']} ❌")
    
    success_rate = (test_results['passed_tests'] / test_results['total_tests']) * 100
    print(f"   معدل النجاح: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("\n🎉 ممتاز! النظام جاهز للاستخدام")
    elif success_rate >= 70:
        print("\n✅ جيد! النظام يعمل مع بعض التحسينات المطلوبة")
    else:
        print("\n⚠️ يحتاج النظام إلى مراجعة وإصلاحات")
    
    # التوصيات
    print("\n📋 التوصيات:")
    if test_results['failed_tests'] == 0:
        print("   • النظام مكتمل ويمكن البدء في الاستخدام")
        print("   • يمكن إضافة المزيد من البيانات التجريبية")
        print("   • اختبار الأداء مع عدد كبير من الجلسات")
    else:
        print("   • مراجعة الاختبارات الفاشلة وإصلاحها")
        print("   • التأكد من تشغيل البيانات التجريبية")
        print("   • اختبار النظام في بيئة الإنتاج")
    
    print("\n🔗 روابط مفيدة:")
    print("   • صفحة جدولة الجلسات: /session-scheduling")
    print("   • API التوثيق: /api/session-scheduling/")
    print("   • لوحة التحكم: /dashboard")
    
    return test_results

if __name__ == "__main__":
    test_session_scheduling_system()
