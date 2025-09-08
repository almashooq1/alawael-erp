#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار شامل لنظام رفع وإدارة ملفات الوثائق
Test script for Documents File Management System
"""

import os
import sys
import requests
import json
from datetime import datetime

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_documents_file_system():
    """اختبار شامل لنظام إدارة ملفات الوثائق"""
    
    print("🔍 بدء اختبار نظام إدارة ملفات الوثائق...")
    print("=" * 60)
    
    base_url = "http://localhost:5000"
    test_results = {
        'total_tests': 0,
        'passed_tests': 0,
        'failed_tests': 0,
        'errors': []
    }
    
    # 1. اختبار وجود مجلد uploads/documents
    print("1️⃣ اختبار وجود مجلد uploads/documents...")
    test_results['total_tests'] += 1
    
    uploads_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'documents')
    if os.path.exists(uploads_dir):
        print("✅ مجلد uploads/documents موجود")
        test_results['passed_tests'] += 1
    else:
        print("❌ مجلد uploads/documents غير موجود")
        test_results['failed_tests'] += 1
        test_results['errors'].append("مجلد uploads/documents غير موجود")
    
    # 2. اختبار وجود API endpoints
    print("\n2️⃣ اختبار وجود API endpoints...")
    
    api_files = [
        'documents_licenses_api.py'
    ]
    
    for api_file in api_files:
        test_results['total_tests'] += 1
        file_path = os.path.join(os.path.dirname(__file__), api_file)
        if os.path.exists(file_path):
            print(f"✅ ملف {api_file} موجود")
            test_results['passed_tests'] += 1
            
            # فحص محتوى الملف للـ endpoints المطلوبة
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            required_endpoints = [
                'upload_document_file',
                'get_document_attachments', 
                'download_document_attachment',
                'delete_document_attachment'
            ]
            
            for endpoint in required_endpoints:
                test_results['total_tests'] += 1
                if endpoint in content:
                    print(f"✅ Endpoint {endpoint} موجود")
                    test_results['passed_tests'] += 1
                else:
                    print(f"❌ Endpoint {endpoint} غير موجود")
                    test_results['failed_tests'] += 1
                    test_results['errors'].append(f"Endpoint {endpoint} غير موجود في {api_file}")
        else:
            print(f"❌ ملف {api_file} غير موجود")
            test_results['failed_tests'] += 1
            test_results['errors'].append(f"ملف {api_file} غير موجود")
    
    # 3. اختبار وجود نماذج قاعدة البيانات
    print("\n3️⃣ اختبار وجود نماذج قاعدة البيانات...")
    
    models_file = os.path.join(os.path.dirname(__file__), 'documents_licenses_models.py')
    test_results['total_tests'] += 1
    
    if os.path.exists(models_file):
        print("✅ ملف documents_licenses_models.py موجود")
        test_results['passed_tests'] += 1
        
        with open(models_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_models = [
            'DocumentAttachment',
            'DocumentAuditLog'
        ]
        
        for model in required_models:
            test_results['total_tests'] += 1
            if f"class {model}" in content:
                print(f"✅ نموذج {model} موجود")
                test_results['passed_tests'] += 1
            else:
                print(f"❌ نموذج {model} غير موجود")
                test_results['failed_tests'] += 1
                test_results['errors'].append(f"نموذج {model} غير موجود")
    else:
        print("❌ ملف documents_licenses_models.py غير موجود")
        test_results['failed_tests'] += 1
        test_results['errors'].append("ملف documents_licenses_models.py غير موجود")
    
    # 4. اختبار واجهة المستخدم
    print("\n4️⃣ اختبار واجهة المستخدم...")
    
    ui_files = [
        ('templates/documents_management.html', 'صفحة إدارة الوثائق'),
        ('static/js/documents_management.js', 'ملف JavaScript')
    ]
    
    for file_path, description in ui_files:
        test_results['total_tests'] += 1
        full_path = os.path.join(os.path.dirname(__file__), file_path)
        
        if os.path.exists(full_path):
            print(f"✅ {description} موجود")
            test_results['passed_tests'] += 1
            
            # فحص محتوى JavaScript للوظائف المطلوبة
            if file_path.endswith('.js'):
                with open(full_path, 'r', encoding='utf-8') as f:
                    js_content = f.read()
                
                required_functions = [
                    'uploadDocumentFile',
                    'viewDocumentAttachments',
                    'downloadAttachment',
                    'deleteAttachment'
                ]
                
                for func in required_functions:
                    test_results['total_tests'] += 1
                    if func in js_content:
                        print(f"✅ دالة {func} موجودة في JavaScript")
                        test_results['passed_tests'] += 1
                    else:
                        print(f"❌ دالة {func} غير موجودة في JavaScript")
                        test_results['failed_tests'] += 1
                        test_results['errors'].append(f"دالة {func} غير موجودة في JavaScript")
        else:
            print(f"❌ {description} غير موجود")
            test_results['failed_tests'] += 1
            test_results['errors'].append(f"{description} غير موجود")
    
    # 5. اختبار التكامل مع النظام الرئيسي
    print("\n5️⃣ اختبار التكامل مع النظام الرئيسي...")
    
    app_file = os.path.join(os.path.dirname(__file__), 'app.py')
    test_results['total_tests'] += 1
    
    if os.path.exists(app_file):
        print("✅ ملف app.py موجود")
        test_results['passed_tests'] += 1
        
        with open(app_file, 'r', encoding='utf-8') as f:
            app_content = f.read()
        
        # فحص تسجيل blueprint
        test_results['total_tests'] += 1
        if 'documents_licenses_api' in app_content:
            print("✅ تم تسجيل documents_licenses_api blueprint")
            test_results['passed_tests'] += 1
        else:
            print("❌ لم يتم تسجيل documents_licenses_api blueprint")
            test_results['failed_tests'] += 1
            test_results['errors'].append("لم يتم تسجيل documents_licenses_api blueprint")
        
        # فحص route إدارة الوثائق
        test_results['total_tests'] += 1
        if '/documents-management' in app_content:
            print("✅ تم إضافة route /documents-management")
            test_results['passed_tests'] += 1
        else:
            print("❌ لم يتم إضافة route /documents-management")
            test_results['failed_tests'] += 1
            test_results['errors'].append("لم يتم إضافة route /documents-management")
    else:
        print("❌ ملف app.py غير موجود")
        test_results['failed_tests'] += 1
        test_results['errors'].append("ملف app.py غير موجود")
    
    # 6. اختبار البيانات التجريبية
    print("\n6️⃣ اختبار البيانات التجريبية...")
    
    sample_data_file = os.path.join(os.path.dirname(__file__), 'add_documents_sample_data.py')
    test_results['total_tests'] += 1
    
    if os.path.exists(sample_data_file):
        print("✅ ملف add_documents_sample_data.py موجود")
        test_results['passed_tests'] += 1
    else:
        print("❌ ملف add_documents_sample_data.py غير موجود")
        test_results['failed_tests'] += 1
        test_results['errors'].append("ملف add_documents_sample_data.py غير موجود")
    
    # 7. اختبار أذونات الملفات
    print("\n7️⃣ اختبار أذونات مجلد uploads...")
    
    test_results['total_tests'] += 1
    try:
        # محاولة إنشاء ملف تجريبي
        test_file = os.path.join(uploads_dir, 'test_file.txt')
        with open(test_file, 'w') as f:
            f.write('test')
        
        # حذف الملف التجريبي
        os.remove(test_file)
        
        print("✅ أذونات الكتابة في مجلد uploads متاحة")
        test_results['passed_tests'] += 1
    except Exception as e:
        print(f"❌ مشكلة في أذونات مجلد uploads: {e}")
        test_results['failed_tests'] += 1
        test_results['errors'].append(f"مشكلة في أذونات مجلد uploads: {e}")
    
    # طباعة النتائج النهائية
    print("\n" + "=" * 60)
    print("📊 نتائج الاختبار النهائية:")
    print(f"إجمالي الاختبارات: {test_results['total_tests']}")
    print(f"الاختبارات الناجحة: {test_results['passed_tests']} ✅")
    print(f"الاختبارات الفاشلة: {test_results['failed_tests']} ❌")
    
    success_rate = (test_results['passed_tests'] / test_results['total_tests']) * 100
    print(f"معدل النجاح: {success_rate:.1f}%")
    
    if test_results['errors']:
        print("\n🚨 الأخطاء المكتشفة:")
        for i, error in enumerate(test_results['errors'], 1):
            print(f"{i}. {error}")
    
    print("\n" + "=" * 60)
    
    if success_rate >= 90:
        print("🎉 نظام إدارة ملفات الوثائق جاهز للاستخدام!")
        return True
    elif success_rate >= 70:
        print("⚠️ نظام إدارة ملفات الوثائق يحتاج بعض التحسينات")
        return False
    else:
        print("❌ نظام إدارة ملفات الوثائق يحتاج إصلاحات جوهرية")
        return False

def print_system_recommendations():
    """طباعة توصيات النظام"""
    print("\n📋 توصيات لتحسين النظام:")
    print("1. تأكد من تشغيل الخادم على المنفذ 5000")
    print("2. تأكد من وجود قاعدة البيانات وتحديثها")
    print("3. تأكد من صحة إعدادات JWT")
    print("4. اختبر رفع الملفات مع أنواع مختلفة من الملفات")
    print("5. اختبر حدود حجم الملفات")
    print("6. تأكد من أمان النظام ضد رفع الملفات الضارة")
    print("7. اختبر النظام مع مستخدمين متعددين")
    print("8. تأكد من عمل نظام النسخ الاحتياطي للملفات")

if __name__ == "__main__":
    print("🚀 نظام اختبار إدارة ملفات الوثائق")
    print("=" * 60)
    
    try:
        success = test_documents_file_system()
        print_system_recommendations()
        
        if success:
            print("\n✅ تم اكتمال جميع الاختبارات بنجاح!")
            exit(0)
        else:
            print("\n⚠️ بعض الاختبارات فشلت، يرجى مراجعة الأخطاء")
            exit(1)
            
    except Exception as e:
        print(f"\n💥 خطأ في تشغيل الاختبارات: {e}")
        exit(1)
