#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
اختبار النظام النهائي - فحص شامل لجميع المكونات
Final System Test - Comprehensive Check of All Components
"""

import os
import sys
import ast
from pathlib import Path

def test_file_exists_and_syntax(file_path):
    """اختبار وجود الملف وصحة بناء الجملة"""
    if not os.path.exists(file_path):
        return False, f"الملف غير موجود: {file_path}"
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        ast.parse(content)
        return True, "صحيح"
    except SyntaxError as e:
        return False, f"خطأ في بناء الجملة: {e}"
    except Exception as e:
        return False, f"خطأ في قراءة الملف: {e}"

def test_basic_imports():
    """اختبار الاستيرادات الأساسية"""
    try:
        # اختبار Flask
        import flask
        
        # اختبار SQLAlchemy
        import flask_sqlalchemy
        
        # اختبار JWT
        import flask_jwt_extended
        
        return True, "جميع التبعيات الأساسية متوفرة"
    except ImportError as e:
        return False, f"تبعية مفقودة: {e}"
        
        # اختبار فحص الحالة
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                self.test_results.append(("فحص الحالة", "يعمل", "✅"))
            else:
                self.test_results.append(("فحص الحالة", f"خطأ {response.status_code}", "❌"))
        except Exception as e:
            self.test_results.append(("فحص الحالة", "غير متاح", "⚠️"))
    
    def test_database_connection(self):
        """اختبار اتصال قاعدة البيانات"""
        print("🗄️ اختبار قاعدة البيانات...")
        
        try:
            from flask import Flask
            from database import db
            
            app = Flask(__name__)
            app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test.db'
            app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
            
            db.init_app(app)
            
            with app.app_context():
                db.create_all()
                self.test_results.append(("إنشاء قاعدة البيانات", "نجح", "✅"))
                
        except Exception as e:
            self.test_results.append(("إنشاء قاعدة البيانات", f"فشل: {e}", "❌"))
    
    def test_frontend_files(self):
        """اختبار ملفات الواجهة الأمامية"""
        print("🎨 اختبار الواجهة الأمامية...")
        
        # اختبار مجلدات الواجهة
        frontend_dirs = [
            'static',
            'static/js',
            'static/css',
            'templates'
        ]
        
        for dir_name in frontend_dirs:
            dir_path = Path(dir_name)
            if dir_path.exists() and dir_path.is_dir():
                self.test_results.append((f"مجلد {dir_name}", "موجود", "✅"))
            else:
                self.test_results.append((f"مجلد {dir_name}", "مفقود", "❌"))
        
        # اختبار ملفات JavaScript الأساسية
        js_files = [
            'static/js/comprehensive_rehabilitation.js',
            'static/js/speech_therapy.js',
            'static/js/dashboard.js'
        ]
        
        for js_file in js_files:
            js_path = Path(js_file)
            if js_path.exists():
                # فحص وجود الدوال الأساسية
                try:
                    with open(js_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if 'makeRequest' in content and 'showAlert' in content:
                        self.test_results.append((f"ملف {js_path.name}", "مكتمل", "✅"))
                    else:
                        self.test_results.append((f"ملف {js_path.name}", "ناقص الدوال", "⚠️"))
                        
                except Exception:
                    self.test_results.append((f"ملف {js_path.name}", "خطأ في القراءة", "❌"))
            else:
                self.test_results.append((f"ملف {js_path.name}", "مفقود", "❌"))
    
    def generate_final_report(self):
        """إنشاء التقرير النهائي"""
        print("\n" + "=" * 60)
        print("📋 التقرير النهائي الشامل")
        print("=" * 60)
        
        # إحصائيات
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r[2] == "✅"])
        warning_tests = len([r for r in self.test_results if r[2] == "⚠️"])
        failed_tests = len([r for r in self.test_results if r[2] == "❌"])
        
        print(f"\n📊 الإحصائيات:")
        print(f"  إجمالي الاختبارات: {total_tests}")
        print(f"  نجح: {passed_tests} ✅")
        print(f"  تحذيرات: {warning_tests} ⚠️")
        print(f"  فشل: {failed_tests} ❌")
        
        # النتائج التفصيلية
        print(f"\n📝 النتائج التفصيلية:")
        for test_name, result, status in self.test_results:
            print(f"  {status} {test_name}: {result}")
        
        # التوصيات
        print(f"\n💡 التوصيات:")
        if failed_tests == 0 and warning_tests == 0:
            print("  🎉 النظام يعمل بشكل مثالي!")
        elif failed_tests == 0:
            print("  ✅ النظام يعمل بنجاح مع بعض التحذيرات البسيطة")
        else:
            print("  ⚠️ هناك مشاكل تحتاج إلى مراجعة")
        
        # حفظ التقرير
        report_content = f"""
تقرير الاختبار النهائي الشامل - نظام ERP مراكز الأوائل
{'=' * 60}

الإحصائيات:
- إجمالي الاختبارات: {total_tests}
- نجح: {passed_tests}
- تحذيرات: {warning_tests}  
- فشل: {failed_tests}

النتائج التفصيلية:
{chr(10).join([f"- {status} {test_name}: {result}" for test_name, result, status in self.test_results])}

معدل النجاح: {(passed_tests/total_tests)*100:.1f}%
"""
        
        report_file = Path('final_system_test_report.txt')
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"\n📄 تم حفظ التقرير: {report_file}")
        
        return passed_tests, warning_tests, failed_tests

def main():
    """الدالة الرئيسية"""
    tester = FinalSystemTest()
    tester.run_all_tests()
    
    print("\n🏁 انتهى الاختبار النهائي الشامل")

if __name__ == "__main__":
    main()
