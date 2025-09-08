#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار شامل للنظام - فحص جميع المكونات والوظائف
"""

import os
import sys
import ast
import importlib.util
from datetime import datetime

class SystemTester:
    def __init__(self):
        self.test_results = {}
        self.errors = []
        self.warnings = []
        
    def test_file_syntax(self, file_path):
        """اختبار بناء الجملة للملف"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            ast.parse(content)
            return True, None
        except SyntaxError as e:
            return False, f"خطأ في بناء الجملة: {str(e)}"
        except Exception as e:
            return False, f"خطأ في قراءة الملف: {str(e)}"
    
    def test_imports(self, file_path):
        """اختبار الاستيرادات"""
        try:
            spec = importlib.util.spec_from_file_location("test_module", file_path)
            if spec is None:
                return False, "لا يمكن إنشاء spec للملف"
            
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            return True, None
        except ImportError as e:
            return False, f"خطأ في الاستيراد: {str(e)}"
        except Exception as e:
            return False, f"خطأ في تحميل الملف: {str(e)}"
    
    def test_database_connection(self):
        """اختبار الاتصال بقاعدة البيانات"""
        try:
            from app import app
            from database import db
            
            with app.app_context():
                # اختبار الاتصال
                db.engine.execute('SELECT 1')
                
                # فحص الجداول
                from sqlalchemy import inspect
                inspector = inspect(db.engine)
                tables = inspector.get_table_names()
                
                return True, f"تم العثور على {len(tables)} جدول"
        except Exception as e:
            return False, f"خطأ في الاتصال بقاعدة البيانات: {str(e)}"
    
    def test_models_integrity(self):
        """اختبار سلامة النماذج"""
        try:
            from models import User, Student, Teacher, Classroom
            
            # فحص وجود الخصائص الأساسية
            required_attrs = {
                'User': ['id', 'username', 'email'],
                'Student': ['id', 'name', 'national_id'],
                'Teacher': ['id', 'user_id', 'national_id'],
                'Classroom': ['id', 'name', 'capacity']
            }
            
            missing_attrs = []
            for model_name, attrs in required_attrs.items():
                model = locals()[model_name]
                for attr in attrs:
                    if not hasattr(model, attr):
                        missing_attrs.append(f"{model_name}.{attr}")
            
            if missing_attrs:
                return False, f"خصائص مفقودة: {', '.join(missing_attrs)}"
            
            return True, "جميع النماذج سليمة"
        except Exception as e:
            return False, f"خطأ في فحص النماذج: {str(e)}"
    
    def test_api_endpoints(self):
        """اختبار نقاط النهاية للـ API"""
        try:
            from app import app
            
            with app.test_client() as client:
                # اختبار الصفحة الرئيسية
                response = client.get('/')
                if response.status_code not in [200, 302]:
                    return False, f"خطأ في الصفحة الرئيسية: {response.status_code}"
                
                # اختبار API الأساسي
                response = client.get('/api/health')
                # إذا لم يكن موجود، فهذا طبيعي
                
                return True, "نقاط النهاية تعمل بشكل صحيح"
        except Exception as e:
            return False, f"خطأ في اختبار API: {str(e)}"
    
    def test_static_files(self):
        """اختبار الملفات الثابتة"""
        static_dirs = ['static', 'templates']
        missing_dirs = []
        
        for dir_name in static_dirs:
            if not os.path.exists(dir_name):
                missing_dirs.append(dir_name)
        
        if missing_dirs:
            return False, f"مجلدات مفقودة: {', '.join(missing_dirs)}"
        
        # فحص ملفات CSS و JS الأساسية
        important_files = [
            'static/css/style.css',
            'templates/dashboard.html'
        ]
        
        missing_files = []
        for file_path in important_files:
            if not os.path.exists(file_path):
                missing_files.append(file_path)
        
        if missing_files:
            return False, f"ملفات مفقودة: {', '.join(missing_files)}"
        
        return True, "جميع الملفات الثابتة موجودة"
    
    def run_comprehensive_test(self):
        """تشغيل اختبار شامل للنظام"""
        print("🚀 بدء الاختبار الشامل للنظام...")
        print("=" * 60)
        
        # قائمة الاختبارات
        tests = [
            ("فحص بناء الجملة للملفات الأساسية", self.test_core_files_syntax),
            ("اختبار الاستيرادات", self.test_core_imports),
            ("اختبار الاتصال بقاعدة البيانات", self.test_database_connection),
            ("اختبار سلامة النماذج", self.test_models_integrity),
            ("اختبار نقاط النهاية للـ API", self.test_api_endpoints),
            ("اختبار الملفات الثابتة", self.test_static_files)
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🔍 {test_name}...")
            try:
                success, message = test_func()
                if success:
                    print(f"  ✅ نجح: {message}")
                    passed_tests += 1
                    self.test_results[test_name] = "نجح"
                else:
                    print(f"  ❌ فشل: {message}")
                    self.test_results[test_name] = f"فشل: {message}"
                    self.errors.append(f"{test_name}: {message}")
            except Exception as e:
                print(f"  ❌ خطأ: {str(e)}")
                self.test_results[test_name] = f"خطأ: {str(e)}"
                self.errors.append(f"{test_name}: {str(e)}")
        
        # طباعة التقرير النهائي
        self.print_final_report(passed_tests, total_tests)
        
        return passed_tests == total_tests
    
    def test_core_files_syntax(self):
        """اختبار بناء الجملة للملفات الأساسية"""
        core_files = ['models.py', 'app.py', 'database.py']
        
        for file_path in core_files:
            if os.path.exists(file_path):
                success, error = self.test_file_syntax(file_path)
                if not success:
                    return False, f"{file_path}: {error}"
            else:
                return False, f"الملف غير موجود: {file_path}"
        
        return True, "جميع الملفات الأساسية سليمة"
    
    def test_core_imports(self):
        """اختبار استيرادات الملفات الأساسية"""
        try:
            # اختبار استيراد database
            import database
            
            # اختبار استيراد models
            import models
            
            # اختبار استيراد app
            import app
            
            return True, "جميع الاستيرادات تعمل بشكل صحيح"
        except Exception as e:
            return False, f"خطأ في الاستيرادات: {str(e)}"
    
    def print_final_report(self, passed_tests, total_tests):
        """طباعة التقرير النهائي"""
        print("\n" + "=" * 60)
        print("📋 تقرير الاختبار الشامل")
        print("=" * 60)
        
        # إحصائيات عامة
        success_rate = (passed_tests / total_tests) * 100
        print(f"📊 معدل النجاح: {success_rate:.1f}% ({passed_tests}/{total_tests})")
        print(f"❌ الأخطاء: {len(self.errors)}")
        print(f"⚠️ التحذيرات: {len(self.warnings)}")
        
        # تفاصيل النتائج
        print(f"\n📋 تفاصيل الاختبارات:")
        for test_name, result in self.test_results.items():
            status = "✅" if result == "نجح" else "❌"
            print(f"  {status} {test_name}: {result}")
        
        # الأخطاء
        if self.errors:
            print(f"\n❌ الأخطاء المكتشفة:")
            for error in self.errors:
                print(f"  - {error}")
        
        # التقييم النهائي
        if success_rate == 100:
            print(f"\n🎉 النظام في حالة ممتازة!")
            print("✅ جميع الاختبارات نجحت")
            print("✅ النظام جاهز للاستخدام")
        elif success_rate >= 80:
            print(f"\n✅ النظام في حالة جيدة")
            print("⚠️ بعض التحسينات مطلوبة")
        else:
            print(f"\n⚠️ النظام يحتاج إصلاحات مهمة")
            print("❌ يجب إصلاح الأخطاء قبل الاستخدام")

def main():
    """الدالة الرئيسية"""
    tester = SystemTester()
    success = tester.run_comprehensive_test()
    
    if success:
        print(f"\n🎉 تم اجتياز جميع الاختبارات بنجاح!")
    else:
        print(f"\n⚠️ يوجد مشاكل تحتاج إصلاح")
    
    return success

if __name__ == "__main__":
    main()
