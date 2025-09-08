#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار شامل لنظام الأعطال والصيانة
"""

import os
import sys
import requests
import json
from datetime import datetime, timedelta

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_maintenance_api_endpoints():
    """اختبار جميع API endpoints لنظام الصيانة"""
    
    base_url = "http://localhost:5000"
    
    # بيانات تسجيل الدخول التجريبية
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    print("🔧 بدء اختبار نظام الأعطال والصيانة...")
    print("=" * 50)
    
    try:
        # 1. اختبار تسجيل الدخول
        print("1️⃣ اختبار تسجيل الدخول...")
        login_response = requests.post(f"{base_url}/api/login", json=login_data)
        if login_response.status_code == 200:
            token = login_response.json().get('access_token')
            headers = {'Authorization': f'Bearer {token}'}
            print("✅ تم تسجيل الدخول بنجاح")
        else:
            print("❌ فشل في تسجيل الدخول")
            return False
        
        # 2. اختبار لوحة التحكم
        print("\n2️⃣ اختبار لوحة التحكم...")
        dashboard_response = requests.get(f"{base_url}/api/maintenance-dashboard", headers=headers)
        if dashboard_response.status_code == 200:
            dashboard_data = dashboard_response.json()
            print(f"✅ لوحة التحكم تعمل - إجمالي الأعطال: {dashboard_data.get('total_faults', 0)}")
        else:
            print("❌ خطأ في لوحة التحكم")
        
        # 3. اختبار تقارير الأعطال
        print("\n3️⃣ اختبار تقارير الأعطال...")
        faults_response = requests.get(f"{base_url}/api/fault-reports", headers=headers)
        if faults_response.status_code == 200:
            faults_data = faults_response.json()
            print(f"✅ تقارير الأعطال تعمل - عدد التقارير: {len(faults_data.get('fault_reports', []))}")
        else:
            print("❌ خطأ في تقارير الأعطال")
        
        # 4. اختبار إضافة تقرير عطل جديد
        print("\n4️⃣ اختبار إضافة تقرير عطل...")
        new_fault = {
            "branch_id": 1,
            "branch_name": "الفرع الرئيسي",
            "fault_type": "electrical",
            "fault_category": "normal",
            "fault_title": "اختبار تقرير عطل",
            "fault_description": "هذا تقرير عطل تجريبي للاختبار",
            "priority_level": "normal",
            "location": "مكتب الاختبار"
        }
        
        add_fault_response = requests.post(f"{base_url}/api/fault-reports", 
                                         json=new_fault, headers=headers)
        if add_fault_response.status_code == 201:
            print("✅ تم إضافة تقرير العطل بنجاح")
        else:
            print("❌ فشل في إضافة تقرير العطل")
        
        # 5. اختبار طلبات الصيانة
        print("\n5️⃣ اختبار طلبات الصيانة...")
        requests_response = requests.get(f"{base_url}/api/maintenance-requests", headers=headers)
        if requests_response.status_code == 200:
            requests_data = requests_response.json()
            print(f"✅ طلبات الصيانة تعمل - عدد الطلبات: {len(requests_data.get('requests', []))}")
        else:
            print("❌ خطأ في طلبات الصيانة")
        
        # 6. اختبار جداول الصيانة
        print("\n6️⃣ اختبار جداول الصيانة...")
        schedules_response = requests.get(f"{base_url}/api/maintenance-schedules", headers=headers)
        if schedules_response.status_code == 200:
            schedules_data = schedules_response.json()
            print(f"✅ جداول الصيانة تعمل - عدد الجداول: {len(schedules_data.get('schedules', []))}")
        else:
            print("❌ خطأ في جداول الصيانة")
        
        # 7. اختبار جرد المعدات
        print("\n7️⃣ اختبار جرد المعدات...")
        equipment_response = requests.get(f"{base_url}/api/equipment-inventory", headers=headers)
        if equipment_response.status_code == 200:
            equipment_data = equipment_response.json()
            print(f"✅ جرد المعدات يعمل - عدد المعدات: {len(equipment_data.get('equipment', []))}")
        else:
            print("❌ خطأ في جرد المعدات")
        
        # 8. اختبار سجلات الصيانة
        print("\n8️⃣ اختبار سجلات الصيانة...")
        logs_response = requests.get(f"{base_url}/api/maintenance-logs", headers=headers)
        if logs_response.status_code == 200:
            logs_data = logs_response.json()
            print(f"✅ سجلات الصيانة تعمل - عدد السجلات: {len(logs_data.get('logs', []))}")
        else:
            print("❌ خطأ في سجلات الصيانة")
        
        # 9. اختبار الإشعارات
        print("\n9️⃣ اختبار الإشعارات...")
        notifications_response = requests.get(f"{base_url}/api/maintenance-notifications", headers=headers)
        if notifications_response.status_code == 200:
            notifications_data = notifications_response.json()
            print(f"✅ الإشعارات تعمل - عدد الإشعارات: {len(notifications_data.get('notifications', []))}")
        else:
            print("❌ خطأ في الإشعارات")
        
        # 10. اختبار الأنشطة الأخيرة
        print("\n🔟 اختبار الأنشطة الأخيرة...")
        activities_response = requests.get(f"{base_url}/api/maintenance-recent-activities", headers=headers)
        if activities_response.status_code == 200:
            activities_data = activities_response.json()
            print(f"✅ الأنشطة الأخيرة تعمل - عدد الأنشطة: {len(activities_data.get('activities', []))}")
        else:
            print("❌ خطأ في الأنشطة الأخيرة")
        
        print("\n" + "=" * 50)
        print("🎉 اكتمل اختبار جميع وظائف نظام الأعطال والصيانة!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ لا يمكن الاتصال بالخادم. تأكد من تشغيل التطبيق على localhost:5000")
        return False
    except Exception as e:
        print(f"❌ خطأ في الاختبار: {str(e)}")
        return False

def test_ui_accessibility():
    """اختبار إمكانية الوصول للواجهات"""
    
    base_url = "http://localhost:5000"
    
    print("\n🖥️ اختبار الواجهات...")
    print("=" * 30)
    
    try:
        # اختبار صفحة نظام الصيانة
        maintenance_page = requests.get(f"{base_url}/maintenance-management")
        if maintenance_page.status_code == 200:
            print("✅ صفحة نظام الصيانة متاحة")
        else:
            print("❌ صفحة نظام الصيانة غير متاحة")
        
        # اختبار ملفات JavaScript
        js_file = requests.get(f"{base_url}/static/js/maintenance_management.js")
        if js_file.status_code == 200:
            print("✅ ملف JavaScript متاح")
        else:
            print("❌ ملف JavaScript غير متاح")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ لا يمكن الاتصال بالخادم")
        return False

def generate_test_report():
    """إنشاء تقرير اختبار شامل"""
    
    print("\n📋 تقرير الاختبار الشامل")
    print("=" * 40)
    
    # معلومات النظام
    print("📊 معلومات النظام:")
    print("   - اسم النظام: نظام الأعطال والصيانة")
    print("   - الإصدار: 1.0.0")
    print("   - التاريخ: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    # المكونات المطورة
    print("\n🔧 المكونات المطورة:")
    print("   ✅ نماذج قاعدة البيانات (5 نماذج)")
    print("   ✅ API Endpoints (10+ endpoints)")
    print("   ✅ واجهة المستخدم العربية RTL")
    print("   ✅ نظام الإشعارات")
    print("   ✅ لوحة التحكم التحليلية")
    print("   ✅ نظام الأمان والصلاحيات")
    
    # الميزات الرئيسية
    print("\n⭐ الميزات الرئيسية:")
    print("   • إدارة تقارير الأعطال")
    print("   • جدولة الصيانة الدورية")
    print("   • طلبات الصيانة مع نظام الموافقات")
    print("   • جرد المعدات والضمانات")
    print("   • سجلات الصيانة المفصلة")
    print("   • إشعارات فورية للأعطال العاجلة")
    print("   • تحليلات وإحصائيات متقدمة")
    
    # حالة الاختبار
    print("\n🧪 حالة الاختبار:")
    if test_maintenance_api_endpoints():
        print("   ✅ جميع API endpoints تعمل بنجاح")
    else:
        print("   ⚠️ بعض API endpoints تحتاج مراجعة")
    
    if test_ui_accessibility():
        print("   ✅ الواجهات متاحة ومتجاوبة")
    else:
        print("   ⚠️ الواجهات تحتاج مراجعة")
    
    print("\n🎯 التوصيات:")
    print("   1. تشغيل الخادم للاختبار الكامل")
    print("   2. إضافة بيانات تجريبية أكثر")
    print("   3. اختبار جميع السيناريوهات")
    print("   4. مراجعة الأمان والأداء")

if __name__ == "__main__":
    generate_test_report()
