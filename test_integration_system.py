#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار شامل لنظام التكامل والاتصالات
"""

import sys
import os
import requests
import json
from datetime import datetime

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

class IntegrationSystemTester:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.token = None
        self.test_results = []
        
    def login(self):
        """تسجيل الدخول للحصول على token"""
        try:
            response = requests.post(f"{self.base_url}/api/login", 
                                   json={"username": "admin", "password": "admin123"})
            if response.status_code == 200:
                self.token = response.json().get('access_token')
                return True
            return False
        except:
            return False
    
    def get_headers(self):
        """الحصول على headers مع token"""
        return {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
    
    def test_api_endpoint(self, method, endpoint, data=None, expected_status=200):
        """اختبار API endpoint"""
        try:
            url = f"{self.base_url}{endpoint}"
            
            if method.upper() == 'GET':
                response = requests.get(url, headers=self.get_headers())
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=self.get_headers())
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=self.get_headers())
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=self.get_headers())
            
            success = response.status_code == expected_status
            
            result = {
                'endpoint': endpoint,
                'method': method,
                'status_code': response.status_code,
                'expected_status': expected_status,
                'success': success,
                'response_time': response.elapsed.total_seconds(),
                'error': None if success else response.text
            }
            
            self.test_results.append(result)
            return success, response
            
        except Exception as e:
            result = {
                'endpoint': endpoint,
                'method': method,
                'status_code': 0,
                'expected_status': expected_status,
                'success': False,
                'response_time': 0,
                'error': str(e)
            }
            self.test_results.append(result)
            return False, None
    
    def test_communication_apis(self):
        """اختبار APIs الاتصالات"""
        print("\n🔍 اختبار APIs الاتصالات...")
        
        # اختبار إرسال رسالة SMS
        sms_data = {
            'message_type': 'sms',
            'recipient': '966501234567',
            'content': 'رسالة اختبار SMS'
        }
        success, response = self.test_api_endpoint('POST', '/api/communication/send-message', sms_data)
        print(f"   {'✅' if success else '❌'} إرسال SMS")
        
        # اختبار إرسال بريد إلكتروني
        email_data = {
            'message_type': 'email',
            'recipient': 'test@example.com',
            'subject': 'رسالة اختبار',
            'content': 'محتوى رسالة اختبار'
        }
        success, response = self.test_api_endpoint('POST', '/api/communication/send-message', email_data)
        print(f"   {'✅' if success else '❌'} إرسال Email")
        
        # اختبار عرض الرسائل
        success, response = self.test_api_endpoint('GET', '/api/communication/messages')
        print(f"   {'✅' if success else '❌'} عرض الرسائل")
        
        # اختبار قوالب الرسائل
        template_data = {
            'name': 'قالب اختبار',
            'message_type': 'sms',
            'content': 'مرحباً {name}'
        }
        success, response = self.test_api_endpoint('POST', '/api/communication/templates', template_data)
        print(f"   {'✅' if success else '❌'} إنشاء قالب رسالة")
        
        success, response = self.test_api_endpoint('GET', '/api/communication/templates')
        print(f"   {'✅' if success else '❌'} عرض قوالب الرسائل")
    
    def test_external_systems_apis(self):
        """اختبار APIs الأنظمة الخارجية"""
        print("\n🔍 اختبار APIs الأنظمة الخارجية...")
        
        # اختبار إنشاء نظام خارجي
        system_data = {
            'name': 'نظام اختبار',
            'system_type': 'hospital',
            'api_url': 'https://test-api.example.com',
            'description': 'نظام اختبار للتطوير'
        }
        success, response = self.test_api_endpoint('POST', '/api/integration/external-systems', system_data)
        print(f"   {'✅' if success else '❌'} إنشاء نظام خارجي")
        
        # اختبار عرض الأنظمة الخارجية
        success, response = self.test_api_endpoint('GET', '/api/integration/external-systems')
        print(f"   {'✅' if success else '❌'} عرض الأنظمة الخارجية")
        
        # اختبار اتصال النظام
        if success and response:
            systems = response.json().get('systems', [])
            if systems:
                system_id = systems[0]['id']
                success, response = self.test_api_endpoint('POST', f'/api/integration/external-systems/{system_id}/test')
                print(f"   {'✅' if success else '❌'} اختبار اتصال النظام")
    
    def test_payment_apis(self):
        """اختبار APIs المدفوعات"""
        print("\n🔍 اختبار APIs المدفوعات...")
        
        # اختبار عرض مقدمي خدمة الدفع
        success, response = self.test_api_endpoint('GET', '/api/integration/payment-providers')
        print(f"   {'✅' if success else '❌'} عرض مقدمي خدمة الدفع")
        
        # اختبار معالجة دفعة
        payment_data = {
            'amount': 500.00,
            'currency': 'SAR',
            'payment_method': 'mada',
            'description': 'دفع رسوم اختبار'
        }
        success, response = self.test_api_endpoint('POST', '/api/integration/process-payment', payment_data)
        print(f"   {'✅' if success else '❌'} معالجة دفعة")
        
        # اختبار عرض المعاملات
        success, response = self.test_api_endpoint('GET', '/api/integration/transactions')
        print(f"   {'✅' if success else '❌'} عرض المعاملات")
    
    def test_insurance_apis(self):
        """اختبار APIs التأمين"""
        print("\n🔍 اختبار APIs التأمين...")
        
        # اختبار عرض شركات التأمين
        success, response = self.test_api_endpoint('GET', '/api/integration/insurance-providers')
        print(f"   {'✅' if success else '❌'} عرض شركات التأمين")
        
        # اختبار إنشاء مطالبة تأمين
        claim_data = {
            'insurance_provider_id': 1,
            'patient_name': 'مريض اختبار',
            'patient_id': 'TEST123',
            'amount': 1000.00,
            'diagnosis_code': 'TEST001',
            'treatment_details': 'علاج اختبار'
        }
        success, response = self.test_api_endpoint('POST', '/api/integration/insurance-claims', claim_data)
        print(f"   {'✅' if success else '❌'} إنشاء مطالبة تأمين")
        
        # اختبار عرض المطالبات
        success, response = self.test_api_endpoint('GET', '/api/integration/insurance-claims')
        print(f"   {'✅' if success else '❌'} عرض مطالبات التأمين")
    
    def test_sync_logs_apis(self):
        """اختبار APIs سجلات المزامنة"""
        print("\n🔍 اختبار APIs سجلات المزامنة...")
        
        # اختبار عرض سجلات المزامنة
        success, response = self.test_api_endpoint('GET', '/api/integration/sync-logs')
        print(f"   {'✅' if success else '❌'} عرض سجلات المزامنة")
    
    def test_dashboard_api(self):
        """اختبار API لوحة التحكم"""
        print("\n🔍 اختبار API لوحة التحكم...")
        
        success, response = self.test_api_endpoint('GET', '/api/integration/dashboard')
        print(f"   {'✅' if success else '❌'} لوحة تحكم التكامل")
    
    def test_ui_accessibility(self):
        """اختبار إمكانية الوصول لواجهة المستخدم"""
        print("\n🔍 اختبار إمكانية الوصول لواجهة المستخدم...")
        
        # اختبار صفحة إدارة التكامل
        try:
            response = requests.get(f"{self.base_url}/integration-management", 
                                  headers=self.get_headers())
            success = response.status_code == 200
            print(f"   {'✅' if success else '❌'} صفحة إدارة التكامل")
            
            if success:
                # فحص وجود العناصر الأساسية
                content = response.text
                checks = [
                    ('إدارة التكامل والاتصالات', 'العنوان الرئيسي'),
                    ('nav-tabs', 'التبويبات'),
                    ('sendMessageModal', 'نافذة إرسال الرسائل'),
                    ('templateModal', 'نافذة القوالب'),
                    ('systemModal', 'نافذة الأنظمة'),
                    ('integration_management.js', 'ملف JavaScript')
                ]
                
                for check, description in checks:
                    found = check in content
                    print(f"     {'✅' if found else '❌'} {description}")
                    
        except Exception as e:
            print(f"   ❌ خطأ في الوصول للواجهة: {str(e)}")
    
    def test_file_structure(self):
        """اختبار هيكل الملفات"""
        print("\n🔍 اختبار هيكل الملفات...")
        
        required_files = [
            'integration_models.py',
            'integration_services.py', 
            'integration_api.py',
            'templates/integration_management.html',
            'static/js/integration_management.js',
            'add_integration_sample_data.py'
        ]
        
        for file_path in required_files:
            full_path = os.path.join(os.path.dirname(__file__), file_path)
            exists = os.path.exists(full_path)
            print(f"   {'✅' if exists else '❌'} {file_path}")
    
    def test_database_models(self):
        """اختبار نماذج قاعدة البيانات"""
        print("\n🔍 اختبار نماذج قاعدة البيانات...")
        
        try:
            from integration_models import (
                ExternalSystem, SystemIntegration, DataSyncLog,
                CommunicationChannel, MessageTemplate, CommunicationMessage,
                PaymentProvider, PaymentTransaction,
                InsuranceProvider, InsuranceClaim, NotificationRule
            )
            
            models = [
                ('ExternalSystem', ExternalSystem),
                ('SystemIntegration', SystemIntegration),
                ('DataSyncLog', DataSyncLog),
                ('CommunicationChannel', CommunicationChannel),
                ('MessageTemplate', MessageTemplate),
                ('CommunicationMessage', CommunicationMessage),
                ('PaymentProvider', PaymentProvider),
                ('PaymentTransaction', PaymentTransaction),
                ('InsuranceProvider', InsuranceProvider),
                ('InsuranceClaim', InsuranceClaim),
                ('NotificationRule', NotificationRule)
            ]
            
            for name, model in models:
                print(f"   ✅ {name}")
                
        except Exception as e:
            print(f"   ❌ خطأ في تحميل النماذج: {str(e)}")
    
    def test_services(self):
        """اختبار الخدمات"""
        print("\n🔍 اختبار الخدمات...")
        
        try:
            from integration_services import CommunicationService, ExternalSystemIntegration
            
            # اختبار خدمة الاتصالات
            comm_service = CommunicationService()
            print("   ✅ CommunicationService")
            
            # اختبار خدمة التكامل
            integration_service = ExternalSystemIntegration()
            print("   ✅ ExternalSystemIntegration")
            
        except Exception as e:
            print(f"   ❌ خطأ في تحميل الخدمات: {str(e)}")
    
    def generate_report(self):
        """إنشاء تقرير الاختبار"""
        print("\n" + "="*60)
        print("📊 تقرير اختبار نظام التكامل والاتصالات")
        print("="*60)
        
        total_tests = len(self.test_results)
        successful_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - successful_tests
        
        print(f"\n📈 إحصائيات الاختبار:")
        print(f"   • إجمالي الاختبارات: {total_tests}")
        print(f"   • الاختبارات الناجحة: {successful_tests}")
        print(f"   • الاختبارات الفاشلة: {failed_tests}")
        print(f"   • معدل النجاح: {(successful_tests/total_tests*100):.1f}%" if total_tests > 0 else "   • معدل النجاح: 0%")
        
        if failed_tests > 0:
            print(f"\n❌ الاختبارات الفاشلة:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['method']} {result['endpoint']}: {result['error']}")
        
        # حفظ التقرير في ملف
        report_data = {
            'test_date': datetime.now().isoformat(),
            'total_tests': total_tests,
            'successful_tests': successful_tests,
            'failed_tests': failed_tests,
            'success_rate': (successful_tests/total_tests*100) if total_tests > 0 else 0,
            'test_results': self.test_results
        }
        
        with open('integration_test_report.json', 'w', encoding='utf-8') as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 تم حفظ التقرير في: integration_test_report.json")
        
        return successful_tests == total_tests
    
    def run_all_tests(self):
        """تشغيل جميع الاختبارات"""
        print("🚀 بدء اختبار نظام التكامل والاتصالات...")
        print(f"⏰ وقت الاختبار: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # اختبار هيكل الملفات
        self.test_file_structure()
        
        # اختبار نماذج قاعدة البيانات
        self.test_database_models()
        
        # اختبار الخدمات
        self.test_services()
        
        # تسجيل الدخول
        print("\n🔐 تسجيل الدخول...")
        if not self.login():
            print("❌ فشل في تسجيل الدخول - سيتم تخطي اختبارات API")
        else:
            print("✅ تم تسجيل الدخول بنجاح")
            
            # اختبار APIs
            self.test_communication_apis()
            self.test_external_systems_apis()
            self.test_payment_apis()
            self.test_insurance_apis()
            self.test_sync_logs_apis()
            self.test_dashboard_api()
            
            # اختبار واجهة المستخدم
            self.test_ui_accessibility()
        
        # إنشاء التقرير
        success = self.generate_report()
        
        if success:
            print("\n🎉 جميع الاختبارات نجحت!")
        else:
            print("\n⚠️ بعض الاختبارات فشلت - راجع التقرير للتفاصيل")
        
        return success

def main():
    """الدالة الرئيسية"""
    tester = IntegrationSystemTester()
    return tester.run_all_tests()

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
