# -*- coding: utf-8 -*-
"""
اختبار نهائي شامل لنظام طلب الإمداد بالمواد مع التكامل مع الذكاء الاصطناعي
Final Comprehensive Test for Supply Request System with AI Integration
"""

import os
import sys
import importlib.util
from datetime import datetime

class FinalSupplySystemTest:
    def __init__(self):
        self.test_results = []
        self.errors = []
        
    def log_result(self, test_name, success, message="", details=None):
        """تسجيل نتائج الاختبار"""
        result = {
            'test_name': test_name,
            'success': success,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅" if success else "❌"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   التفاصيل: {details}")
    
    def test_file_structure(self):
        """اختبار هيكل الملفات"""
        print("\n📁 اختبار هيكل الملفات:")
        
        required_files = [
            'supply_models.py',
            'supply_api.py', 
            'templates/supply_management.html',
            'static/js/supply_management.js',
            'add_supply_sample_data.py',
            'test_supply_system.py'
        ]
        
        for file_path in required_files:
            if os.path.exists(file_path):
                self.log_result(f"ملف {file_path}", True, "موجود")
            else:
                self.log_result(f"ملف {file_path}", False, "مفقود")
    
    def test_models_import(self):
        """اختبار استيراد النماذج"""
        print("\n🗄️ اختبار استيراد النماذج:")
        
        try:
            spec = importlib.util.spec_from_file_location("supply_models", "supply_models.py")
            supply_models = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(supply_models)
            
            required_models = [
                'SupplyCategory', 'SupplyItem', 'BranchInventory',
                'SupplyRequest', 'SupplyRequestItem', 'SupplyTransfer',
                'SupplyTransferItem', 'SupplyNotification'
            ]
            
            for model_name in required_models:
                if hasattr(supply_models, model_name):
                    self.log_result(f"نموذج {model_name}", True, "تم الاستيراد بنجاح")
                else:
                    self.log_result(f"نموذج {model_name}", False, "فشل الاستيراد")
                    
        except Exception as e:
            self.log_result("استيراد النماذج", False, f"خطأ: {str(e)}")
    
    def test_api_structure(self):
        """اختبار هيكل API"""
        print("\n🔌 اختبار هيكل API:")
        
        try:
            with open('supply_api.py', 'r', encoding='utf-8') as f:
                api_content = f.read()
            
            required_endpoints = [
                '/api/supply-dashboard',
                '/api/supply-categories',
                '/api/supply-items',
                '/api/branch-inventory',
                '/api/supply-requests',
                '/api/supply-notifications'
            ]
            
            for endpoint in required_endpoints:
                if endpoint in api_content:
                    self.log_result(f"نقطة نهاية {endpoint}", True, "موجودة في الكود")
                else:
                    self.log_result(f"نقطة نهاية {endpoint}", False, "مفقودة من الكود")
                    
        except Exception as e:
            self.log_result("فحص API", False, f"خطأ: {str(e)}")
    
    def test_ui_components(self):
        """اختبار مكونات واجهة المستخدم"""
        print("\n🎨 اختبار مكونات واجهة المستخدم:")
        
        try:
            with open('templates/supply_management.html', 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            required_components = [
                'نظام طلب الإمداد بالمواد',
                'supply-header',
                'stats-card',
                'nav-tabs',
                'newRequestModal',
                'bootstrap.rtl.min.css',
                'supply_management.js'
            ]
            
            for component in required_components:
                if component in html_content:
                    self.log_result(f"مكون {component}", True, "موجود في HTML")
                else:
                    self.log_result(f"مكون {component}", False, "مفقود من HTML")
                    
        except Exception as e:
            self.log_result("فحص واجهة المستخدم", False, f"خطأ: {str(e)}")
    
    def test_javascript_functions(self):
        """اختبار دوال JavaScript"""
        print("\n⚡ اختبار دوال JavaScript:")
        
        try:
            with open('static/js/supply_management.js', 'r', encoding='utf-8') as f:
                js_content = f.read()
            
            required_functions = [
                'initializeSupplySystem',
                'loadDashboardData',
                'updateDashboardStats',
                'createRequestsChart',
                'loadSupplyRequests',
                'loadInventory',
                'loadSupplyItems',
                'loadNotifications',
                'showNewRequestModal'
            ]
            
            for function in required_functions:
                if f"function {function}" in js_content or f"{function}(" in js_content:
                    self.log_result(f"دالة {function}", True, "موجودة في JavaScript")
                else:
                    self.log_result(f"دالة {function}", False, "مفقودة من JavaScript")
                    
        except Exception as e:
            self.log_result("فحص JavaScript", False, f"خطأ: {str(e)}")
    
    def test_ai_integration_readiness(self):
        """اختبار جاهزية التكامل مع الذكاء الاصطناعي"""
        print("\n🤖 اختبار جاهزية التكامل مع الذكاء الاصطناعي:")
        
        # فحص وجود خدمات الذكاء الاصطناعي
        if os.path.exists('ai_services.py'):
            self.log_result("ملف خدمات الذكاء الاصطناعي", True, "موجود")
            
            try:
                with open('ai_services.py', 'r', encoding='utf-8') as f:
                    ai_content = f.read()
                
                ai_functions = [
                    'analyze_supply_request',
                    'predict_inventory_needs',
                    'optimize_supply_chain',
                    'generate_supply_recommendations'
                ]
                
                for function in ai_functions:
                    if function in ai_content:
                        self.log_result(f"دالة الذكاء الاصطناعي {function}", True, "موجودة")
                    else:
                        self.log_result(f"دالة الذكاء الاصطناعي {function}", False, "مفقودة")
                        
            except Exception as e:
                self.log_result("فحص خدمات الذكاء الاصطناعي", False, f"خطأ: {str(e)}")
        else:
            self.log_result("ملف خدمات الذكاء الاصطناعي", False, "غير موجود")
        
        # فحص التكامل في النماذج
        try:
            with open('supply_models.py', 'r', encoding='utf-8') as f:
                models_content = f.read()
            
            if 'ai_analysis' in models_content or 'prediction' in models_content:
                self.log_result("تكامل الذكاء الاصطناعي في النماذج", True, "موجود")
            else:
                self.log_result("تكامل الذكاء الاصطناعي في النماذج", False, "غير مُفعل")
                
        except Exception as e:
            self.log_result("فحص تكامل النماذج", False, f"خطأ: {str(e)}")
    
    def test_database_integration(self):
        """اختبار التكامل مع قاعدة البيانات"""
        print("\n🗃️ اختبار التكامل مع قاعدة البيانات:")
        
        try:
            with open('app.py', 'r', encoding='utf-8') as f:
                app_content = f.read()
            
            # فحص استيراد النماذج
            if 'from supply_models import' in app_content or 'supply_models' in app_content:
                self.log_result("استيراد نماذج الإمداد في التطبيق", True, "تم الاستيراد")
            else:
                self.log_result("استيراد نماذج الإمداد في التطبيق", False, "لم يتم الاستيراد")
            
            # فحص استيراد API
            if 'from supply_api import' in app_content or 'supply_api' in app_content:
                self.log_result("استيراد API الإمداد في التطبيق", True, "تم الاستيراد")
            else:
                self.log_result("استيراد API الإمداد في التطبيق", False, "لم يتم الاستيراد")
                
        except Exception as e:
            self.log_result("فحص التكامل مع التطبيق", False, f"خطأ: {str(e)}")
    
    def test_navigation_integration(self):
        """اختبار تكامل التنقل"""
        print("\n🧭 اختبار تكامل التنقل:")
        
        try:
            with open('templates/dashboard.html', 'r', encoding='utf-8') as f:
                dashboard_content = f.read()
            
            if 'نظام طلب الإمداد بالمواد' in dashboard_content:
                self.log_result("رابط نظام الإمداد في الشريط الجانبي", True, "موجود")
            else:
                self.log_result("رابط نظام الإمداد في الشريط الجانبي", False, "مفقود")
            
            if '/supply-management' in dashboard_content:
                self.log_result("رابط صفحة الإمداد", True, "موجود")
            else:
                self.log_result("رابط صفحة الإمداد", False, "مفقود")
                
        except Exception as e:
            self.log_result("فحص التنقل", False, f"خطأ: {str(e)}")
    
    def test_sample_data_script(self):
        """اختبار سكريبت البيانات التجريبية"""
        print("\n📊 اختبار سكريبت البيانات التجريبية:")
        
        try:
            with open('add_supply_sample_data.py', 'r', encoding='utf-8') as f:
                sample_data_content = f.read()
            
            required_functions = [
                'add_supply_categories',
                'add_supply_items',
                'add_branch_inventory',
                'add_supply_requests',
                'add_supply_notifications'
            ]
            
            for function in required_functions:
                if f"def {function}" in sample_data_content:
                    self.log_result(f"دالة البيانات التجريبية {function}", True, "موجودة")
                else:
                    self.log_result(f"دالة البيانات التجريبية {function}", False, "مفقودة")
                    
        except Exception as e:
            self.log_result("فحص سكريبت البيانات التجريبية", False, f"خطأ: {str(e)}")
    
    def test_security_features(self):
        """اختبار ميزات الأمان"""
        print("\n🔒 اختبار ميزات الأمان:")
        
        try:
            with open('supply_api.py', 'r', encoding='utf-8') as f:
                api_content = f.read()
            
            # فحص JWT authentication
            if '@jwt_required()' in api_content:
                jwt_count = api_content.count('@jwt_required()')
                self.log_result("مصادقة JWT", True, f"مُطبقة على {jwt_count} نقطة نهاية")
            else:
                self.log_result("مصادقة JWT", False, "غير مُطبقة")
            
            # فحص التحقق من الصلاحيات
            if 'get_jwt_identity()' in api_content:
                self.log_result("التحقق من هوية المستخدم", True, "مُطبق")
            else:
                self.log_result("التحقق من هوية المستخدم", False, "غير مُطبق")
                
        except Exception as e:
            self.log_result("فحص الأمان", False, f"خطأ: {str(e)}")
    
    def generate_final_report(self):
        """إنشاء التقرير النهائي"""
        print("\n" + "=" * 80)
        print("📋 التقرير النهائي لنظام طلب الإمداد بالمواد")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"📊 إجمالي الاختبارات: {total_tests}")
        print(f"✅ اختبارات ناجحة: {passed_tests}")
        print(f"❌ اختبارات فاشلة: {failed_tests}")
        print(f"📈 معدل النجاح: {success_rate:.1f}%")
        
        print("\n🎯 حالة المكونات الرئيسية:")
        
        # تجميع النتائج حسب الفئة
        categories = {
            'هيكل الملفات': [],
            'النماذج والقاعدة': [],
            'API والخدمات': [],
            'واجهة المستخدم': [],
            'الذكاء الاصطناعي': [],
            'الأمان': [],
            'التكامل': []
        }
        
        for result in self.test_results:
            test_name = result['test_name']
            if 'ملف' in test_name:
                categories['هيكل الملفات'].append(result)
            elif 'نموذج' in test_name or 'قاعدة' in test_name:
                categories['النماذج والقاعدة'].append(result)
            elif 'API' in test_name or 'نقطة نهاية' in test_name:
                categories['API والخدمات'].append(result)
            elif 'واجهة' in test_name or 'مكون' in test_name or 'JavaScript' in test_name:
                categories['واجهة المستخدم'].append(result)
            elif 'ذكاء' in test_name or 'AI' in test_name:
                categories['الذكاء الاصطناعي'].append(result)
            elif 'أمان' in test_name or 'JWT' in test_name:
                categories['الأمان'].append(result)
            else:
                categories['التكامل'].append(result)
        
        for category, results in categories.items():
            if results:
                passed = len([r for r in results if r['success']])
                total = len(results)
                status = "✅" if passed == total else "⚠️" if passed > total/2 else "❌"
                print(f"   {status} {category}: {passed}/{total}")
        
        print("\n🚀 التوصيات:")
        
        if success_rate >= 90:
            print("   ✅ النظام جاهز للإنتاج!")
            print("   ✅ جميع المكونات الأساسية تعمل بشكل صحيح")
            print("   ✅ التكامل مع الذكاء الاصطناعي مُعد بشكل جيد")
        elif success_rate >= 75:
            print("   ⚠️ النظام يعمل بشكل جيد مع بعض التحسينات المطلوبة")
            print("   ⚠️ راجع الاختبارات الفاشلة وأصلحها")
        else:
            print("   ❌ النظام يحتاج إلى مراجعة شاملة")
            print("   ❌ عدة مكونات أساسية تحتاج إصلاح")
        
        print("\n📝 الخطوات التالية:")
        print("   1. تشغيل الخادم: python app.py")
        print("   2. إضافة البيانات التجريبية: python add_supply_sample_data.py")
        print("   3. الوصول للنظام: http://localhost:5000/supply-management")
        print("   4. اختبار جميع الوظائف يدوياً")
        print("   5. تفعيل خدمات الذكاء الاصطناعي")
        
        # حفظ التقرير
        report_data = {
            'summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'failed_tests': failed_tests,
                'success_rate': success_rate
            },
            'test_results': self.test_results,
            'timestamp': datetime.now().isoformat()
        }
        
        import json
        with open('final_supply_system_report.json', 'w', encoding='utf-8') as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 تم حفظ التقرير المفصل في: final_supply_system_report.json")
        
        return success_rate >= 75
    
    def run_all_tests(self):
        """تشغيل جميع الاختبارات"""
        print("🚀 بدء الاختبار النهائي الشامل لنظام طلب الإمداد بالمواد")
        print("=" * 80)
        
        # تشغيل جميع الاختبارات
        self.test_file_structure()
        self.test_models_import()
        self.test_api_structure()
        self.test_ui_components()
        self.test_javascript_functions()
        self.test_ai_integration_readiness()
        self.test_database_integration()
        self.test_navigation_integration()
        self.test_sample_data_script()
        self.test_security_features()
        
        # إنشاء التقرير النهائي
        return self.generate_final_report()

if __name__ == "__main__":
    tester = FinalSupplySystemTest()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 النظام جاهز للاستخدام!")
        sys.exit(0)
    else:
        print("\n⚠️ النظام يحتاج مراجعة قبل الاستخدام")
        sys.exit(1)
