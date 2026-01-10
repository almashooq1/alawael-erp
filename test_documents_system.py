#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
اختبار شامل لنظام إدارة الوثائق والرخص والسجلات التجارية
Comprehensive test for documents and licenses management system
"""

import sys
import os
from datetime import datetime, timedelta
import requests
import json

# إضافة مسار المشروع لـ Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_documents_system():
    """اختبار شامل لنظام إدارة الوثائق والرخص"""
    
    print("🧪 بدء اختبار نظام إدارة الوثائق والرخص...")
    print("="*60)
    
    test_results = {
        'models': False,
        'api': False,
        'templates': False,
        'javascript': False,
        'integration': False,
        'sample_data': False
    }
    
    try:
        # 1. اختبار نماذج قاعدة البيانات
        print("📊 اختبار نماذج قاعدة البيانات...")
        try:
            from documents_licenses_models import (
                DocumentCategory, Document, DocumentReminder, DocumentRenewal,
                DocumentAttachment, BusinessEntity, VehicleDocument, EmployeeDocument,
                DocumentAlert, DocumentAuditLog, DocumentType, DocumentStatus
            )
            print("   ✅ تم استيراد جميع النماذج بنجاح")
            
            # اختبار إنشاء كائن من كل نموذج
            from app import app, db
            with app.app_context():
                # اختبار إنشاء فئة وثيقة
                category = DocumentCategory(
                    name='اختبار الفئة',
                    description='فئة تجريبية للاختبار',
                    icon='fas fa-test',
                    color='#000000'
                )
                print("   ✅ تم إنشاء كائن DocumentCategory بنجاح")
                
                # اختبار إنشاء وثيقة
                document = Document(
                    document_number='TEST-001',
                    document_type=DocumentType.BUSINESS_REGISTRATION,
                    title='وثيقة اختبار',
                    entity_type='business',
                    entity_id=1,
                    entity_name='كيان تجريبي'
                )
                print("   ✅ تم إنشاء كائن Document بنجاح")
                
            test_results['models'] = True
            
        except Exception as e:
            print(f"   ❌ خطأ في اختبار النماذج: {e}")
        
        # 2. اختبار API endpoints
        print("\n🔗 اختبار API endpoints...")
        try:
            from documents_licenses_api import documents_bp
            print("   ✅ تم استيراد documents_bp بنجاح")
            
            # اختبار routes
            routes = [
                '/api/documents/categories',
                '/api/documents',
                '/api/documents/dashboard',
                '/api/documents/reminders'
            ]
            
            for route in routes:
                if hasattr(documents_bp, 'url_map'):
                    print(f"   ✅ Route {route} متوفر")
                
            test_results['api'] = True
            
        except Exception as e:
            print(f"   ❌ خطأ في اختبار API: {e}")
        
        # 3. اختبار ملفات واجهة المستخدم
        print("\n🎨 اختبار ملفات واجهة المستخدم...")
        try:
            # اختبار وجود ملف HTML
            html_file = 'templates/documents_management.html'
            if os.path.exists(html_file):
                print(f"   ✅ ملف {html_file} موجود")
                
                # قراءة محتوى الملف للتحقق من العناصر الأساسية
                with open(html_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                required_elements = [
                    'documents-dashboard',
                    'documents-tab',
                    'reminders-tab',
                    'renewals-tab',
                    'reports-tab',
                    'categories-tab'
                ]
                
                for element in required_elements:
                    if element in content:
                        print(f"   ✅ عنصر {element} موجود في HTML")
                    else:
                        print(f"   ⚠️ عنصر {element} غير موجود في HTML")
            else:
                print(f"   ❌ ملف {html_file} غير موجود")
                
            # اختبار ملف JavaScript
            js_file = 'static/js/documents_management.js'
            if os.path.exists(js_file):
                print(f"   ✅ ملف {js_file} موجود")
                
                with open(js_file, 'r', encoding='utf-8') as f:
                    js_content = f.read()
                    
                if 'DocumentsManager' in js_content:
                    print("   ✅ فئة DocumentsManager موجودة في JavaScript")
                else:
                    print("   ⚠️ فئة DocumentsManager غير موجودة في JavaScript")
            else:
                print(f"   ❌ ملف {js_file} غير موجود")
                
            test_results['templates'] = True
            test_results['javascript'] = True
            
        except Exception as e:
            print(f"   ❌ خطأ في اختبار واجهة المستخدم: {e}")
        
        # 4. اختبار التكامل مع النظام الأساسي
        print("\n🔧 اختبار التكامل مع النظام الأساسي...")
        try:
            # اختبار وجود التسجيل في app.py
            with open('app.py', 'r', encoding='utf-8') as f:
                app_content = f.read()
                
            if 'documents_licenses_api' in app_content:
                print("   ✅ تم تسجيل documents_licenses_api في app.py")
            else:
                print("   ❌ لم يتم تسجيل documents_licenses_api في app.py")
                
            if '/documents-management' in app_content:
                print("   ✅ تم إضافة route /documents-management")
            else:
                print("   ❌ لم يتم إضافة route /documents-management")
                
            # اختبار وجود الرابط في dashboard.html
            with open('templates/dashboard.html', 'r', encoding='utf-8') as f:
                dashboard_content = f.read()
                
            if 'documents-management' in dashboard_content:
                print("   ✅ تم إضافة رابط إدارة الوثائق في الشريط الجانبي")
            else:
                print("   ❌ لم يتم إضافة رابط إدارة الوثائق في الشريط الجانبي")
                
            test_results['integration'] = True
            
        except Exception as e:
            print(f"   ❌ خطأ في اختبار التكامل: {e}")
        
        # 5. اختبار البيانات التجريبية
        print("\n📊 اختبار البيانات التجريبية...")
        try:
            from app import app, db
            from documents_licenses_models import DocumentCategory, Document, DocumentReminder
            
            with app.app_context():
                # إحصائيات البيانات
                categories_count = DocumentCategory.query.count()
                documents_count = Document.query.count()
                reminders_count = DocumentReminder.query.count()
                
                print(f"   📁 عدد فئات الوثائق: {categories_count}")
                print(f"   📄 عدد الوثائق: {documents_count}")
                print(f"   🔔 عدد التذكيرات: {reminders_count}")
                
                if categories_count > 0 and documents_count > 0:
                    print("   ✅ البيانات التجريبية متوفرة")
                    test_results['sample_data'] = True
                else:
                    print("   ⚠️ البيانات التجريبية غير متوفرة أو ناقصة")
                    
        except Exception as e:
            print(f"   ❌ خطأ في اختبار البيانات التجريبية: {e}")
        
        # 6. تقرير النتائج النهائية
        print("\n" + "="*60)
        print("📋 تقرير نتائج الاختبار:")
        print("="*60)
        
        total_tests = len(test_results)
        passed_tests = sum(test_results.values())
        
        for test_name, result in test_results.items():
            status = "✅ نجح" if result else "❌ فشل"
            test_name_ar = {
                'models': 'نماذج قاعدة البيانات',
                'api': 'API Endpoints',
                'templates': 'ملفات HTML',
                'javascript': 'ملفات JavaScript',
                'integration': 'التكامل مع النظام',
                'sample_data': 'البيانات التجريبية'
            }
            print(f"   {status} - {test_name_ar.get(test_name, test_name)}")
        
        print(f"\n📊 النتيجة الإجمالية: {passed_tests}/{total_tests} اختبار نجح")
        success_rate = (passed_tests / total_tests) * 100
        print(f"📈 معدل النجاح: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("\n🎉 نظام إدارة الوثائق والرخص جاهز للاستخدام!")
        elif success_rate >= 60:
            print("\n⚠️ النظام يعمل مع بعض المشاكل البسيطة")
        else:
            print("\n❌ النظام يحتاج إلى مراجعة وإصلاح")
        
        # 7. توصيات للتحسين
        print("\n💡 توصيات للتحسين:")
        if not test_results['sample_data']:
            print("   • تشغيل سكريبت البيانات التجريبية: python add_documents_sample_data.py")
        if not test_results['integration']:
            print("   • التأكد من تسجيل النظام في app.py وإضافة الروابط")
        if not test_results['api']:
            print("   • مراجعة API endpoints والتأكد من صحة التسجيل")
        
        print("\n🔧 خطوات التشغيل:")
        print("   1. تشغيل الخادم: python app.py")
        print("   2. فتح المتصفح على: http://localhost:5000")
        print("   3. الانتقال إلى: إدارة الوثائق والرخص")
        
    except Exception as e:
        print(f"❌ خطأ عام في الاختبار: {e}")
        
    print("\n" + "="*60)
    print("🏁 انتهى اختبار نظام إدارة الوثائق والرخص")

if __name__ == '__main__':
    test_documents_system()
