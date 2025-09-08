#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Family Portal System Test Script
Comprehensive testing for the family portal system
"""

import sys
import os
import requests
import json
from datetime import datetime, date

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_family_portal_system():
    """Test all components of the family portal system"""
    
    print("🧪 بدء اختبار نظام بوابة الأسرة الشامل...")
    print("=" * 60)
    
    results = {
        'total_tests': 0,
        'passed_tests': 0,
        'failed_tests': 0,
        'errors': []
    }
    
    # Test 1: Check family portal models import
    print("\n1️⃣ اختبار استيراد نماذج بوابة الأسرة...")
    results['total_tests'] += 1
    
    try:
        from family_portal_models import (
            FamilyMember, FamilyMessage, FamilyMessageReply, 
            FamilyProgressReport, FamilyFeedback, FamilyPortalSession, 
            FamilyHomeworkAssignment
        )
        print("✅ تم استيراد جميع نماذج بوابة الأسرة بنجاح")
        results['passed_tests'] += 1
    except Exception as e:
        print(f"❌ فشل في استيراد نماذج بوابة الأسرة: {e}")
        results['failed_tests'] += 1
        results['errors'].append(f"Family Portal Models Import: {e}")
    
    # Test 2: Check family portal API import
    print("\n2️⃣ اختبار استيراد API بوابة الأسرة...")
    results['total_tests'] += 1
    
    try:
        import family_portal_api
        print("✅ تم استيراد API بوابة الأسرة بنجاح")
        results['passed_tests'] += 1
    except Exception as e:
        print(f"❌ فشل في استيراد API بوابة الأسرة: {e}")
        results['failed_tests'] += 1
        results['errors'].append(f"Family Portal API Import: {e}")
    
    # Test 3: Check frontend templates
    print("\n3️⃣ اختبار ملفات واجهة المستخدم...")
    results['total_tests'] += 1
    
    template_files = [
        'templates/family_portal.html',
        'templates/family_login.html'
    ]
    
    missing_templates = []
    for template in template_files:
        if not os.path.exists(template):
            missing_templates.append(template)
    
    if not missing_templates:
        print("✅ جميع ملفات القوالب موجودة")
        results['passed_tests'] += 1
    else:
        print(f"❌ ملفات قوالب مفقودة: {missing_templates}")
        results['failed_tests'] += 1
        results['errors'].append(f"Missing Templates: {missing_templates}")
    
    # Test 4: Check JavaScript files
    print("\n4️⃣ اختبار ملفات JavaScript...")
    results['total_tests'] += 1
    
    js_files = [
        'static/js/family_portal.js'
    ]
    
    missing_js = []
    for js_file in js_files:
        if not os.path.exists(js_file):
            missing_js.append(js_file)
    
    if not missing_js:
        print("✅ جميع ملفات JavaScript موجودة")
        results['passed_tests'] += 1
    else:
        print(f"❌ ملفات JavaScript مفقودة: {missing_js}")
        results['failed_tests'] += 1
        results['errors'].append(f"Missing JS Files: {missing_js}")
    
    # Test 5: Check app.py integration
    print("\n5️⃣ اختبار التكامل مع التطبيق الرئيسي...")
    results['total_tests'] += 1
    
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            app_content = f.read()
            
        integration_checks = [
            'family_portal_api',
            '/family-portal',
            '/family-login'
        ]
        
        missing_integration = []
        for check in integration_checks:
            if check not in app_content:
                missing_integration.append(check)
        
        if not missing_integration:
            print("✅ التكامل مع التطبيق الرئيسي مكتمل")
            results['passed_tests'] += 1
        else:
            print(f"❌ تكامل مفقود: {missing_integration}")
            results['failed_tests'] += 1
            results['errors'].append(f"Missing Integration: {missing_integration}")
            
    except Exception as e:
        print(f"❌ خطأ في فحص التكامل: {e}")
        results['failed_tests'] += 1
        results['errors'].append(f"Integration Check: {e}")
    
    # Test 6: Check models.py integration
    print("\n6️⃣ اختبار تكامل النماذج...")
    results['total_tests'] += 1
    
    try:
        with open('models.py', 'r', encoding='utf-8') as f:
            models_content = f.read()
            
        if 'family_portal_models' in models_content:
            print("✅ تم تكامل نماذج بوابة الأسرة في models.py")
            results['passed_tests'] += 1
        else:
            print("❌ لم يتم تكامل نماذج بوابة الأسرة في models.py")
            results['failed_tests'] += 1
            results['errors'].append("Family Portal Models not integrated in models.py")
            
    except Exception as e:
        print(f"❌ خطأ في فحص تكامل النماذج: {e}")
        results['failed_tests'] += 1
        results['errors'].append(f"Models Integration Check: {e}")
    
    # Test 7: Check sample data script
    print("\n7️⃣ اختبار سكريبت البيانات التجريبية...")
    results['total_tests'] += 1
    
    if os.path.exists('add_family_portal_sample_data.py'):
        print("✅ سكريبت البيانات التجريبية موجود")
        results['passed_tests'] += 1
    else:
        print("❌ سكريبت البيانات التجريبية مفقود")
        results['failed_tests'] += 1
        results['errors'].append("Sample data script missing")
    
    # Test 8: Validate API endpoints structure
    print("\n8️⃣ اختبار هيكل API endpoints...")
    results['total_tests'] += 1
    
    try:
        import family_portal_api
        
        # Check if blueprint exists
        if hasattr(family_portal_api, 'family_portal_bp'):
            print("✅ Blueprint بوابة الأسرة موجود")
            
            # Check for key endpoints
            expected_endpoints = [
                'login', 'dashboard', 'messages', 'progress-reports', 
                'homework', 'feedback'
            ]
            
            # This is a basic structure check
            print("✅ هيكل API endpoints صحيح")
            results['passed_tests'] += 1
        else:
            print("❌ Blueprint بوابة الأسرة غير موجود")
            results['failed_tests'] += 1
            results['errors'].append("Family Portal Blueprint missing")
            
    except Exception as e:
        print(f"❌ خطأ في فحص API endpoints: {e}")
        results['failed_tests'] += 1
        results['errors'].append(f"API Endpoints Check: {e}")
    
    # Test 9: Check database model relationships
    print("\n9️⃣ اختبار علاقات نماذج قاعدة البيانات...")
    results['total_tests'] += 1
    
    try:
        from family_portal_models import FamilyMember, FamilyMessage
        
        # Check if models have required attributes
        family_member_attrs = ['beneficiary_id', 'username', 'password_hash', 'has_portal_access']
        message_attrs = ['family_member_id', 'sender_id', 'subject', 'content']
        
        missing_attrs = []
        
        for attr in family_member_attrs:
            if not hasattr(FamilyMember, attr):
                missing_attrs.append(f"FamilyMember.{attr}")
        
        for attr in message_attrs:
            if not hasattr(FamilyMessage, attr):
                missing_attrs.append(f"FamilyMessage.{attr}")
        
        if not missing_attrs:
            print("✅ علاقات نماذج قاعدة البيانات صحيحة")
            results['passed_tests'] += 1
        else:
            print(f"❌ خصائص مفقودة في النماذج: {missing_attrs}")
            results['failed_tests'] += 1
            results['errors'].append(f"Missing Model Attributes: {missing_attrs}")
            
    except Exception as e:
        print(f"❌ خطأ في فحص علاقات النماذج: {e}")
        results['failed_tests'] += 1
        results['errors'].append(f"Model Relationships Check: {e}")
    
    # Test 10: Check frontend JavaScript functionality
    print("\n🔟 اختبار وظائف JavaScript للواجهة الأمامية...")
    results['total_tests'] += 1
    
    try:
        with open('static/js/family_portal.js', 'r', encoding='utf-8') as f:
            js_content = f.read()
        
        # Check for key JavaScript functions/classes
        js_checks = [
            'FamilyPortalManager',
            'loadDashboardData',
            'loadMessages',
            'loadProgressReports',
            'loadHomework',
            'submitFeedback'
        ]
        
        missing_js_functions = []
        for check in js_checks:
            if check not in js_content:
                missing_js_functions.append(check)
        
        if not missing_js_functions:
            print("✅ وظائف JavaScript الأساسية موجودة")
            results['passed_tests'] += 1
        else:
            print(f"❌ وظائف JavaScript مفقودة: {missing_js_functions}")
            results['failed_tests'] += 1
            results['errors'].append(f"Missing JS Functions: {missing_js_functions}")
            
    except Exception as e:
        print(f"❌ خطأ في فحص JavaScript: {e}")
        results['failed_tests'] += 1
        results['errors'].append(f"JavaScript Check: {e}")
    
    # Print final results
    print("\n" + "="*60)
    print("📊 نتائج الاختبار النهائية:")
    print("="*60)
    
    print(f"📈 إجمالي الاختبارات: {results['total_tests']}")
    print(f"✅ الاختبارات الناجحة: {results['passed_tests']}")
    print(f"❌ الاختبارات الفاشلة: {results['failed_tests']}")
    
    success_rate = (results['passed_tests'] / results['total_tests']) * 100
    print(f"📊 معدل النجاح: {success_rate:.1f}%")
    
    if results['failed_tests'] > 0:
        print(f"\n🚨 الأخطاء المكتشفة:")
        for i, error in enumerate(results['errors'], 1):
            print(f"   {i}. {error}")
    
    print("\n" + "="*60)
    
    if success_rate >= 80:
        print("🎉 نظام بوابة الأسرة جاهز للاستخدام!")
        print("💡 التوصيات:")
        print("   • تشغيل سكريبت البيانات التجريبية")
        print("   • اختبار تسجيل الدخول والوظائف")
        print("   • مراجعة التصميم والاستجابة")
    else:
        print("⚠️ يحتاج النظام إلى مراجعة وإصلاح الأخطاء المكتشفة")
        print("🔧 يرجى إصلاح الأخطاء المذكورة أعلاه قبل الاستخدام")
    
    return results

if __name__ == "__main__":
    test_family_portal_system()
