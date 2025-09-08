# -*- coding: utf-8 -*-
"""
اختبار شامل لنظام طلب الإمداد بالمواد
Comprehensive Supply Request System Testing Script
"""

import requests
import json
import sys
import time
from datetime import datetime, timedelta
import random

class SupplySystemTester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.auth_token = None
        self.test_results = []
        self.created_items = []
        
    def log_test(self, test_name, success, message="", details=None):
        """تسجيل نتائج الاختبار"""
        result = {
            'test_name': test_name,
            'success': success,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ نجح" if success else "❌ فشل"
        print(f"{status} - {test_name}: {message}")
        
        if details:
            print(f"   التفاصيل: {details}")
    
    def authenticate(self, username="admin", password="admin123"):
        """المصادقة والحصول على رمز الوصول"""
        try:
            response = requests.post(f"{self.base_url}/api/login", 
                                   json={"username": username, "password": password})
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('access_token')
                self.log_test("المصادقة", True, "تم تسجيل الدخول بنجاح")
                return True
            else:
                self.log_test("المصادقة", False, f"فشل تسجيل الدخول: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("المصادقة", False, f"خطأ في الاتصال: {str(e)}")
            return False
    
    def get_headers(self):
        """الحصول على headers مع رمز المصادقة"""
        return {
            'Authorization': f'Bearer {self.auth_token}',
            'Content-Type': 'application/json'
        }
    
    def test_database_models(self):
        """اختبار نماذج قاعدة البيانات"""
        try:
            # Test importing models
            from supply_models import (
                SupplyCategory, SupplyItem, BranchInventory, 
                SupplyRequest, SupplyRequestItem, SupplyTransfer, 
                SupplyTransferItem, SupplyNotification
            )
            
            self.log_test("استيراد نماذج قاعدة البيانات", True, "تم استيراد جميع النماذج بنجاح")
            
            # Test model relationships
            from app import db
            
            # Check if tables exist
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            required_tables = [
                'supply_categories', 'supply_items', 'branch_inventory',
                'supply_requests', 'supply_request_items', 'supply_transfers',
                'supply_transfer_items', 'supply_notifications'
            ]
            
            missing_tables = [table for table in required_tables if table not in tables]
            
            if missing_tables:
                self.log_test("فحص جداول قاعدة البيانات", False, 
                            f"جداول مفقودة: {', '.join(missing_tables)}")
            else:
                self.log_test("فحص جداول قاعدة البيانات", True, "جميع الجداول موجودة")
                
        except Exception as e:
            self.log_test("اختبار نماذج قاعدة البيانات", False, f"خطأ: {str(e)}")
    
    def test_api_endpoints(self):
        """اختبار جميع API endpoints"""
        if not self.auth_token:
            self.log_test("اختبار API", False, "لا يوجد رمز مصادقة")
            return
        
        # Test dashboard endpoint
        self.test_dashboard_api()
        
        # Test supply categories
        self.test_supply_categories_api()
        
        # Test supply items
        self.test_supply_items_api()
        
        # Test inventory
        self.test_inventory_api()
        
        # Test supply requests
        self.test_supply_requests_api()
        
        # Test notifications
        self.test_notifications_api()
    
    def test_dashboard_api(self):
        """اختبار API لوحة التحكم"""
        try:
            response = requests.get(f"{self.base_url}/api/supply-dashboard", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    stats = data.get('statistics', {})
                    required_stats = ['total_requests', 'pending_requests', 'approved_requests', 'urgent_requests']
                    
                    if all(stat in stats for stat in required_stats):
                        self.log_test("API لوحة التحكم", True, "جميع الإحصائيات متاحة")
                    else:
                        self.log_test("API لوحة التحكم", False, "إحصائيات مفقودة")
                else:
                    self.log_test("API لوحة التحكم", False, data.get('error', 'خطأ غير محدد'))
            else:
                self.log_test("API لوحة التحكم", False, f"كود الاستجابة: {response.status_code}")
                
        except Exception as e:
            self.log_test("API لوحة التحكم", False, f"خطأ: {str(e)}")
    
    def test_supply_categories_api(self):
        """اختبار API فئات المواد"""
        try:
            # Test GET categories
            response = requests.get(f"{self.base_url}/api/supply-categories", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test("GET فئات المواد", True, f"تم جلب {len(data.get('categories', []))} فئة")
                else:
                    self.log_test("GET فئات المواد", False, data.get('error', 'خطأ غير محدد'))
            else:
                self.log_test("GET فئات المواد", False, f"كود الاستجابة: {response.status_code}")
            
            # Test POST new category
            new_category = {
                "category_name": "فئة اختبار",
                "category_name_en": "Test Category",
                "description": "فئة للاختبار",
                "sort_order": 1
            }
            
            response = requests.post(f"{self.base_url}/api/supply-categories", 
                                   headers=self.get_headers(), 
                                   json=new_category)
            
            if response.status_code == 201:
                data = response.json()
                if data.get('success'):
                    self.created_items.append(('category', data.get('category_id')))
                    self.log_test("POST فئة جديدة", True, "تم إنشاء فئة جديدة")
                else:
                    self.log_test("POST فئة جديدة", False, data.get('error', 'خطأ غير محدد'))
            else:
                self.log_test("POST فئة جديدة", False, f"كود الاستجابة: {response.status_code}")
                
        except Exception as e:
            self.log_test("اختبار API فئات المواد", False, f"خطأ: {str(e)}")
    
    def test_supply_items_api(self):
        """اختبار API المواد والإمدادات"""
        try:
            # Test GET items
            response = requests.get(f"{self.base_url}/api/supply-items", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test("GET المواد", True, f"تم جلب {len(data.get('items', []))} مادة")
                else:
                    self.log_test("GET المواد", False, data.get('error', 'خطأ غير محدد'))
            else:
                self.log_test("GET المواد", False, f"كود الاستجابة: {response.status_code}")
            
            # Test POST new item (if we have a category)
            category_id = None
            for item_type, item_id in self.created_items:
                if item_type == 'category':
                    category_id = item_id
                    break
            
            if category_id:
                new_item = {
                    "item_code": f"TEST-{random.randint(1000, 9999)}",
                    "item_name": "مادة اختبار",
                    "item_name_en": "Test Item",
                    "description": "مادة للاختبار",
                    "category_id": category_id,
                    "unit_of_measure": "قطعة",
                    "unit_cost": 10.50,
                    "minimum_stock_level": 5,
                    "maximum_stock_level": 100
                }
                
                response = requests.post(f"{self.base_url}/api/supply-items", 
                                       headers=self.get_headers(), 
                                       json=new_item)
                
                if response.status_code == 201:
                    data = response.json()
                    if data.get('success'):
                        self.created_items.append(('item', data.get('item_id')))
                        self.log_test("POST مادة جديدة", True, "تم إنشاء مادة جديدة")
                    else:
                        self.log_test("POST مادة جديدة", False, data.get('error', 'خطأ غير محدد'))
                else:
                    self.log_test("POST مادة جديدة", False, f"كود الاستجابة: {response.status_code}")
            
        except Exception as e:
            self.log_test("اختبار API المواد", False, f"خطأ: {str(e)}")
    
    def test_inventory_api(self):
        """اختبار API المخزون"""
        try:
            response = requests.get(f"{self.base_url}/api/branch-inventory", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test("GET المخزون", True, f"تم جلب {len(data.get('inventory', []))} عنصر مخزون")
                else:
                    self.log_test("GET المخزون", False, data.get('error', 'خطأ غير محدد'))
            else:
                self.log_test("GET المخزون", False, f"كود الاستجابة: {response.status_code}")
                
        except Exception as e:
            self.log_test("اختبار API المخزون", False, f"خطأ: {str(e)}")
    
    def test_supply_requests_api(self):
        """اختبار API طلبات الإمداد"""
        try:
            # Test GET requests
            response = requests.get(f"{self.base_url}/api/supply-requests", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test("GET طلبات الإمداد", True, f"تم جلب {len(data.get('requests', []))} طلب")
                else:
                    self.log_test("GET طلبات الإمداد", False, data.get('error', 'خطأ غير محدد'))
            else:
                self.log_test("GET طلبات الإمداد", False, f"كود الاستجابة: {response.status_code}")
            
            # Test POST new request (if we have items)
            item_id = None
            for item_type, item_id_val in self.created_items:
                if item_type == 'item':
                    item_id = item_id_val
                    break
            
            if item_id:
                tomorrow = datetime.now() + timedelta(days=1)
                new_request = {
                    "requesting_branch_id": 1,
                    "supplying_branch_id": 2,
                    "request_type": "normal",
                    "priority_level": "normal",
                    "required_date": tomorrow.strftime('%Y-%m-%d %H:%M:%S'),
                    "reason": "طلب اختبار للنظام",
                    "notes": "هذا طلب تجريبي",
                    "shipping_method": "internal_transport",
                    "items": [{
                        "item_id": item_id,
                        "requested_quantity": 5,
                        "notes": "للاختبار"
                    }]
                }
                
                response = requests.post(f"{self.base_url}/api/supply-requests", 
                                       headers=self.get_headers(), 
                                       json=new_request)
                
                if response.status_code == 201:
                    data = response.json()
                    if data.get('success'):
                        self.created_items.append(('request', data.get('request_id')))
                        self.log_test("POST طلب إمداد جديد", True, "تم إنشاء طلب إمداد جديد")
                    else:
                        self.log_test("POST طلب إمداد جديد", False, data.get('error', 'خطأ غير محدد'))
                else:
                    self.log_test("POST طلب إمداد جديد", False, f"كود الاستجابة: {response.status_code}")
            
        except Exception as e:
            self.log_test("اختبار API طلبات الإمداد", False, f"خطأ: {str(e)}")
    
    def test_notifications_api(self):
        """اختبار API الإشعارات"""
        try:
            response = requests.get(f"{self.base_url}/api/supply-notifications", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test("GET الإشعارات", True, f"تم جلب {len(data.get('notifications', []))} إشعار")
                else:
                    self.log_test("GET الإشعارات", False, data.get('error', 'خطأ غير محدد'))
            else:
                self.log_test("GET الإشعارات", False, f"كود الاستجابة: {response.status_code}")
                
        except Exception as e:
            self.log_test("اختبار API الإشعارات", False, f"خطأ: {str(e)}")
    
    def test_ui_accessibility(self):
        """اختبار إمكانية الوصول لواجهة المستخدم"""
        try:
            # Test supply management page
            response = requests.get(f"{self.base_url}/supply-management", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                self.log_test("صفحة إدارة الإمداد", True, "الصفحة متاحة")
                
                # Check for Arabic content
                content = response.text
                if 'نظام طلب الإمداد' in content:
                    self.log_test("المحتوى العربي", True, "المحتوى العربي موجود")
                else:
                    self.log_test("المحتوى العربي", False, "المحتوى العربي مفقود")
                    
                # Check for required CSS/JS files
                required_files = ['bootstrap.rtl.min.css', 'supply_management.js']
                for file_name in required_files:
                    if file_name in content:
                        self.log_test(f"ملف {file_name}", True, "الملف مرجع بشكل صحيح")
                    else:
                        self.log_test(f"ملف {file_name}", False, "الملف غير مرجع")
                        
            else:
                self.log_test("صفحة إدارة الإمداد", False, f"كود الاستجابة: {response.status_code}")
                
        except Exception as e:
            self.log_test("اختبار واجهة المستخدم", False, f"خطأ: {str(e)}")
    
    def test_ai_integration(self):
        """اختبار التكامل مع الذكاء الاصطناعي"""
        try:
            # Test AI services import
            from ai_services import analyze_supply_request, predict_inventory_needs
            self.log_test("استيراد خدمات الذكاء الاصطناعي", True, "تم استيراد الخدمات بنجاح")
            
            # Test AI analysis function
            test_request_data = {
                'requesting_branch': 'الفرع الرئيسي',
                'items': [
                    {'name': 'أقلام', 'quantity': 100},
                    {'name': 'ورق A4', 'quantity': 50}
                ],
                'priority': 'normal',
                'reason': 'نفاد المخزون'
            }
            
            analysis = analyze_supply_request(test_request_data)
            if analysis and 'recommendation' in analysis:
                self.log_test("تحليل الذكاء الاصطناعي للطلبات", True, "التحليل يعمل بشكل صحيح")
            else:
                self.log_test("تحليل الذكاء الاصطناعي للطلبات", False, "التحليل لا يعمل")
            
            # Test inventory prediction
            test_inventory_data = {
                'branch_id': 1,
                'item_id': 1,
                'current_stock': 10,
                'usage_history': [5, 8, 12, 6, 9]
            }
            
            prediction = predict_inventory_needs(test_inventory_data)
            if prediction and 'predicted_usage' in prediction:
                self.log_test("توقع احتياجات المخزون", True, "التوقع يعمل بشكل صحيح")
            else:
                self.log_test("توقع احتياجات المخزون", False, "التوقع لا يعمل")
                
        except ImportError:
            self.log_test("اختبار التكامل مع الذكاء الاصطناعي", False, "خدمات الذكاء الاصطناعي غير متاحة")
        except Exception as e:
            self.log_test("اختبار التكامل مع الذكاء الاصطناعي", False, f"خطأ: {str(e)}")
    
    def test_performance(self):
        """اختبار الأداء"""
        try:
            # Test response time for dashboard
            start_time = time.time()
            response = requests.get(f"{self.base_url}/api/supply-dashboard", 
                                  headers=self.get_headers())
            end_time = time.time()
            
            response_time = end_time - start_time
            
            if response.status_code == 200 and response_time < 2.0:
                self.log_test("أداء لوحة التحكم", True, f"وقت الاستجابة: {response_time:.2f} ثانية")
            else:
                self.log_test("أداء لوحة التحكم", False, f"وقت الاستجابة بطيء: {response_time:.2f} ثانية")
                
        except Exception as e:
            self.log_test("اختبار الأداء", False, f"خطأ: {str(e)}")
    
    def run_all_tests(self):
        """تشغيل جميع الاختبارات"""
        print("🚀 بدء اختبار نظام طلب الإمداد بالمواد")
        print("=" * 60)
        
        # Authentication test
        if not self.authenticate():
            print("❌ فشل في المصادقة - توقف الاختبار")
            return
        
        # Database tests
        print("\n📊 اختبار قاعدة البيانات:")
        self.test_database_models()
        
        # API tests
        print("\n🔌 اختبار API Endpoints:")
        self.test_api_endpoints()
        
        # UI tests
        print("\n🎨 اختبار واجهة المستخدم:")
        self.test_ui_accessibility()
        
        # AI integration tests
        print("\n🤖 اختبار التكامل مع الذكاء الاصطناعي:")
        self.test_ai_integration()
        
        # Performance tests
        print("\n⚡ اختبار الأداء:")
        self.test_performance()
        
        # Generate report
        self.generate_report()
    
    def generate_report(self):
        """إنشاء تقرير شامل"""
        print("\n" + "=" * 60)
        print("📋 تقرير اختبار نظام طلب الإمداد")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"📈 إجمالي الاختبارات: {total_tests}")
        print(f"✅ اختبارات ناجحة: {passed_tests}")
        print(f"❌ اختبارات فاشلة: {failed_tests}")
        print(f"📊 معدل النجاح: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ الاختبارات الفاشلة:")
            for test in self.test_results:
                if not test['success']:
                    print(f"   - {test['test_name']}: {test['message']}")
        
        print("\n🎯 التوصيات:")
        if passed_tests == total_tests:
            print("   ✅ النظام يعمل بشكل ممتاز!")
            print("   ✅ جميع المكونات تعمل بشكل صحيح")
            print("   ✅ التكامل مع الذكاء الاصطناعي فعال")
        else:
            print("   ⚠️  يحتاج النظام إلى إصلاحات في المناطق الفاشلة")
            print("   ⚠️  راجع الأخطاء المذكورة أعلاه")
        
        # Save detailed report
        report_data = {
            'test_summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'failed_tests': failed_tests,
                'success_rate': (passed_tests/total_tests)*100
            },
            'test_results': self.test_results,
            'timestamp': datetime.now().isoformat()
        }
        
        with open('supply_system_test_report.json', 'w', encoding='utf-8') as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 تم حفظ التقرير المفصل في: supply_system_test_report.json")

if __name__ == "__main__":
    # Run the tests
    tester = SupplySystemTester()
    tester.run_all_tests()
