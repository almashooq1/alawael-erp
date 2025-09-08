#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نظام اختبار شامل لنظام برامج التأهيل
يتضمن اختبار جميع المكونات: النماذج، API، واجهة المستخدم، والتكامل
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta
import sqlite3
from pathlib import Path

class RehabilitationSystemTester:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.test_results = {
            'total_tests': 0,
            'passed_tests': 0,
            'failed_tests': 0,
            'errors': []
        }
        self.project_root = Path(__file__).parent
        
    def log_test(self, test_name, passed, error_msg=None):
        """تسجيل نتيجة الاختبار"""
        self.test_results['total_tests'] += 1
        if passed:
            self.test_results['passed_tests'] += 1
            print(f"✅ {test_name}")
        else:
            self.test_results['failed_tests'] += 1
            error_info = f"{test_name}: {error_msg}" if error_msg else test_name
            self.test_results['errors'].append(error_info)
            print(f"❌ {test_name} - {error_msg}")
    
    def test_file_structure(self):
        """اختبار هيكل الملفات"""
        print("\n🔍 اختبار هيكل الملفات...")
        
        required_files = [
            'rehabilitation_programs_models.py',
            'rehabilitation_programs_api.py',
            'templates/rehabilitation_programs.html',
            'static/js/rehabilitation_programs.js',
            'add_rehabilitation_sample_data.py'
        ]
        
        for file_path in required_files:
            full_path = self.project_root / file_path
            exists = full_path.exists()
            self.log_test(f"وجود الملف: {file_path}", exists, 
                         f"الملف غير موجود: {full_path}" if not exists else None)
    
    def test_database_models(self):
        """اختبار نماذج قاعدة البيانات"""
        print("\n🗄️ اختبار نماذج قاعدة البيانات...")
        
        try:
            # استيراد النماذج
            sys.path.append(str(self.project_root))
            from rehabilitation_programs_models import (
                RehabilitationBeneficiary, RehabilitationProgram, 
                RehabilitationEnrollment, RehabilitationSession,
                RehabilitationAssessment, RehabilitationTherapist,
                RehabilitationEquipment, RehabilitationEducationalResource
            )
            
            models = [
                RehabilitationBeneficiary, RehabilitationProgram,
                RehabilitationEnrollment, RehabilitationSession,
                RehabilitationAssessment, RehabilitationTherapist,
                RehabilitationEquipment, RehabilitationEducationalResource
            ]
            
            for model in models:
                self.log_test(f"استيراد نموذج: {model.__name__}", True)
                
                # اختبار الحقول المطلوبة
                if hasattr(model, '__table__'):
                    columns = [col.name for col in model.__table__.columns]
                    has_id = 'id' in columns
                    has_created_at = 'created_at' in columns
                    self.log_test(f"نموذج {model.__name__} يحتوي على ID", has_id)
                    self.log_test(f"نموذج {model.__name__} يحتوي على created_at", has_created_at)
                    
        except Exception as e:
            self.log_test("استيراد نماذج قاعدة البيانات", False, str(e))
    
    def test_api_endpoints(self):
        """اختبار API endpoints"""
        print("\n🌐 اختبار API endpoints...")
        
        # قائمة endpoints المطلوبة
        endpoints = [
            ('/api/rehabilitation/beneficiaries', 'GET'),
            ('/api/rehabilitation/programs', 'GET'),
            ('/api/rehabilitation/sessions', 'GET'),
            ('/api/rehabilitation/enrollments', 'GET'),
            ('/api/rehabilitation/dashboard-stats', 'GET')
        ]
        
        for endpoint, method in endpoints:
            try:
                url = f"{self.base_url}{endpoint}"
                if method == 'GET':
                    response = requests.get(url, timeout=5)
                    # نتوقع 401 بدون JWT token
                    success = response.status_code in [200, 401]
                    self.log_test(f"API endpoint: {method} {endpoint}", success,
                                f"Status code: {response.status_code}" if not success else None)
                else:
                    self.log_test(f"API endpoint: {method} {endpoint}", True, "لم يتم اختباره بعد")
                    
            except requests.exceptions.ConnectionError:
                self.log_test(f"API endpoint: {method} {endpoint}", False, "الخادم غير متاح")
            except Exception as e:
                self.log_test(f"API endpoint: {method} {endpoint}", False, str(e))
    
    def test_frontend_files(self):
        """اختبار ملفات واجهة المستخدم"""
        print("\n🎨 اختبار ملفات واجهة المستخدم...")
        
        # اختبار HTML template
        html_file = self.project_root / 'templates' / 'rehabilitation_programs.html'
        if html_file.exists():
            content = html_file.read_text(encoding='utf-8')
            
            # اختبار العناصر المطلوبة
            required_elements = [
                'برامج التأهيل',
                'المستفيدين',
                'الجلسات',
                'التقييمات',
                'المعالجين',
                'bootstrap',
                'Chart.js'
            ]
            
            for element in required_elements:
                exists = element in content
                self.log_test(f"HTML يحتوي على: {element}", exists)
        else:
            self.log_test("ملف HTML template", False, "الملف غير موجود")
        
        # اختبار JavaScript file
        js_file = self.project_root / 'static' / 'js' / 'rehabilitation_programs.js'
        if js_file.exists():
            content = js_file.read_text(encoding='utf-8')
            
            # اختبار الفئات والوظائف المطلوبة
            required_functions = [
                'RehabilitationManager',
                'loadBeneficiaries',
                'loadPrograms',
                'loadSessions',
                'showAlert'
            ]
            
            for func in required_functions:
                exists = func in content
                self.log_test(f"JavaScript يحتوي على: {func}", exists)
        else:
            self.log_test("ملف JavaScript", False, "الملف غير موجود")
    
    def test_sample_data_script(self):
        """اختبار سكريبت البيانات التجريبية"""
        print("\n📊 اختبار سكريبت البيانات التجريبية...")
        
        sample_data_file = self.project_root / 'add_rehabilitation_sample_data.py'
        if sample_data_file.exists():
            content = sample_data_file.read_text(encoding='utf-8')
            
            # اختبار الوظائف المطلوبة
            required_functions = [
                'add_rehabilitation_sample_data',
                'RehabilitationBeneficiary',
                'RehabilitationProgram',
                'RehabilitationEnrollment'
            ]
            
            for func in required_functions:
                exists = func in content
                self.log_test(f"سكريبت البيانات يحتوي على: {func}", exists)
        else:
            self.log_test("سكريبت البيانات التجريبية", False, "الملف غير موجود")
    
    def test_integration_with_main_app(self):
        """اختبار التكامل مع التطبيق الرئيسي"""
        print("\n🔗 اختبار التكامل مع التطبيق الرئيسي...")
        
        # اختبار app.py
        app_file = self.project_root / 'app.py'
        if app_file.exists():
            content = app_file.read_text(encoding='utf-8')
            
            integration_checks = [
                ('rehabilitation_programs_api', 'استيراد API'),
                ('rehabilitation_bp', 'تسجيل Blueprint'),
                ('/rehabilitation-programs', 'Route للصفحة'),
                ('rehabilitation_programs.html', 'Template')
            ]
            
            for check, description in integration_checks:
                exists = check in content
                self.log_test(f"التكامل - {description}", exists)
        else:
            self.log_test("ملف app.py", False, "الملف غير موجود")
        
        # اختبار dashboard.html
        dashboard_file = self.project_root / 'templates' / 'dashboard.html'
        if dashboard_file.exists():
            content = dashboard_file.read_text(encoding='utf-8')
            
            sidebar_checks = [
                ('برامج التأهيل', 'رابط في الشريط الجانبي'),
                ('/rehabilitation-programs', 'URL الصحيح'),
                ('fas fa-hands-helping', 'الأيقونة')
            ]
            
            for check, description in sidebar_checks:
                exists = check in content
                self.log_test(f"الشريط الجانبي - {description}", exists)
        else:
            self.log_test("ملف dashboard.html", False, "الملف غير موجود")
    
    def test_accessibility_and_rtl(self):
        """اختبار إمكانية الوصول ودعم RTL"""
        print("\n♿ اختبار إمكانية الوصول ودعم RTL...")
        
        html_file = self.project_root / 'templates' / 'rehabilitation_programs.html'
        if html_file.exists():
            content = html_file.read_text(encoding='utf-8')
            
            accessibility_checks = [
                ('dir="rtl"', 'دعم RTL'),
                ('lang="ar"', 'اللغة العربية'),
                ('aria-label', 'تسميات ARIA'),
                ('role=', 'أدوار ARIA'),
                ('alt=', 'نص بديل للصور')
            ]
            
            for check, description in accessibility_checks:
                exists = check in content
                self.log_test(f"إمكانية الوصول - {description}", exists)
        else:
            self.log_test("اختبار إمكانية الوصول", False, "ملف HTML غير موجود")
    
    def test_security_features(self):
        """اختبار ميزات الأمان"""
        print("\n🔒 اختبار ميزات الأمان...")
        
        api_file = self.project_root / 'rehabilitation_programs_api.py'
        if api_file.exists():
            content = api_file.read_text(encoding='utf-8')
            
            security_checks = [
                ('@jwt_required()', 'حماية JWT'),
                ('get_jwt_identity()', 'تحديد هوية المستخدم'),
                ('try:', 'معالجة الأخطاء'),
                ('except', 'التعامل مع الاستثناءات')
            ]
            
            for check, description in security_checks:
                exists = check in content
                self.log_test(f"الأمان - {description}", exists)
        else:
            self.log_test("اختبار الأمان", False, "ملف API غير موجود")
    
    def run_all_tests(self):
        """تشغيل جميع الاختبارات"""
        print("🚀 بدء اختبار نظام برامج التأهيل الشامل...")
        print("=" * 60)
        
        # تشغيل جميع الاختبارات
        self.test_file_structure()
        self.test_database_models()
        self.test_api_endpoints()
        self.test_frontend_files()
        self.test_sample_data_script()
        self.test_integration_with_main_app()
        self.test_accessibility_and_rtl()
        self.test_security_features()
        
        # عرض النتائج النهائية
        self.print_final_results()
    
    def print_final_results(self):
        """عرض النتائج النهائية"""
        print("\n" + "=" * 60)
        print("📊 نتائج اختبار نظام برامج التأهيل")
        print("=" * 60)
        
        total = self.test_results['total_tests']
        passed = self.test_results['passed_tests']
        failed = self.test_results['failed_tests']
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"إجمالي الاختبارات: {total}")
        print(f"الاختبارات الناجحة: {passed}")
        print(f"الاختبارات الفاشلة: {failed}")
        print(f"معدل النجاح: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("\n🎉 ممتاز! النظام جاهز للاستخدام")
        elif success_rate >= 75:
            print("\n✅ جيد! النظام يعمل مع بعض التحسينات المطلوبة")
        elif success_rate >= 50:
            print("\n⚠️ متوسط! يحتاج النظام إلى مراجعة")
        else:
            print("\n❌ ضعيف! النظام يحتاج إلى إصلاحات جوهرية")
        
        if self.test_results['errors']:
            print("\n🔍 الأخطاء المكتشفة:")
            for i, error in enumerate(self.test_results['errors'], 1):
                print(f"{i}. {error}")
        
        print("\n" + "=" * 60)
        
        # حفظ النتائج في ملف
        results_file = self.project_root / 'rehabilitation_test_results.json'
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'results': self.test_results
            }, f, ensure_ascii=False, indent=2)
        
        print(f"💾 تم حفظ النتائج في: {results_file}")

def main():
    """الوظيفة الرئيسية"""
    tester = RehabilitationSystemTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()
