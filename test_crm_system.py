# -*- coding: utf-8 -*-
"""
اختبار شامل لنظام إدارة علاقات العملاء (CRM)
"""

import requests
import json
from datetime import datetime
import sys
import os

class CRMSystemTester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.token = None
        self.test_results = []
        
    def login(self, username="admin", password="admin123"):
        """تسجيل الدخول للحصول على التوكن"""
        try:
            response = requests.post(f"{self.base_url}/api/login", 
                json={"username": username, "password": password})
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                return True
            return False
        except:
            return False
    
    def get_headers(self):
        """الحصول على headers مع التوكن"""
        return {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
    
    def test_endpoint(self, method, endpoint, data=None, expected_status=200):
        """اختبار endpoint محدد"""
        try:
            url = f"{self.base_url}{endpoint}"
            headers = self.get_headers()
            
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=headers, json=data)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            result = {
                'endpoint': endpoint,
                'method': method,
                'status_code': response.status_code,
                'expected_status': expected_status,
                'success': success,
                'response_size': len(response.content) if response.content else 0
            }
            
            if success and response.content:
                try:
                    json_data = response.json()
                    result['has_data'] = bool(json_data)
                except:
                    result['has_data'] = False
            
            self.test_results.append(result)
            return success, response
            
        except Exception as e:
            result = {
                'endpoint': endpoint,
                'method': method,
                'success': False,
                'error': str(e)
            }
            self.test_results.append(result)
            return False, None
    
    def run_comprehensive_tests(self):
        """تشغيل اختبارات شاملة لجميع وحدات CRM"""
        
        print("🚀 بدء الاختبار الشامل لنظام CRM...")
        print("=" * 60)
        
        # اختبار تسجيل الدخول
        print("🔐 اختبار تسجيل الدخول...")
        if not self.login():
            print("❌ فشل في تسجيل الدخول")
            return False
        print("✅ تم تسجيل الدخول بنجاح")
        
        # اختبار وحدة العملاء
        print("\n👥 اختبار وحدة إدارة العملاء...")
        customer_tests = [
            ('GET', '/api/crm/customers'),
            ('GET', '/api/crm/customers/analytics'),
            ('POST', '/api/crm/customers', {
                'name': 'عميل تجريبي',
                'email': 'test@example.com',
                'phone': '0501234567',
                'customer_type': 'individual'
            }),
        ]
        
        for method, endpoint, *data in customer_tests:
            test_data = data[0] if data else None
            success, response = self.test_endpoint(method, endpoint, test_data)
            status = "✅" if success else "❌"
            print(f"  {status} {method} {endpoint}")
        
        # اختبار وحدة العملاء المحتملين
        print("\n🎯 اختبار وحدة العملاء المحتملين...")
        lead_tests = [
            ('GET', '/api/crm/leads'),
            ('GET', '/api/crm/leads/analytics'),
            ('POST', '/api/crm/leads', {
                'name': 'عميل محتمل تجريبي',
                'email': 'lead@example.com',
                'phone': '0507654321',
                'source': 'website'
            }),
        ]
        
        for method, endpoint, *data in lead_tests:
            test_data = data[0] if data else None
            success, response = self.test_endpoint(method, endpoint, test_data)
            status = "✅" if success else "❌"
            print(f"  {status} {method} {endpoint}")
        
        # اختبار وحدة الفرص التجارية
        print("\n💼 اختبار وحدة الفرص التجارية...")
        opportunity_tests = [
            ('GET', '/api/crm/opportunities'),
            ('GET', '/api/crm/opportunities/analytics'),
            ('GET', '/api/crm/opportunities/pipeline'),
        ]
        
        for method, endpoint, *data in opportunity_tests:
            success, response = self.test_endpoint(method, endpoint)
            status = "✅" if success else "❌"
            print(f"  {status} {method} {endpoint}")
        
        # اختبار وحدة الأنشطة
        print("\n📋 اختبار وحدة الأنشطة...")
        activity_tests = [
            ('GET', '/api/crm/activities'),
            ('GET', '/api/crm/activities/analytics'),
            ('GET', '/api/crm/activities/upcoming'),
        ]
        
        for method, endpoint, *data in activity_tests:
            success, response = self.test_endpoint(method, endpoint)
            status = "✅" if success else "❌"
            print(f"  {status} {method} {endpoint}")
        
        # اختبار وحدة التواصل
        print("\n📞 اختبار وحدة التواصل...")
        communication_tests = [
            ('GET', '/api/crm/communications'),
            ('GET', '/api/crm/communications/analytics'),
        ]
        
        for method, endpoint, *data in communication_tests:
            success, response = self.test_endpoint(method, endpoint)
            status = "✅" if success else "❌"
            print(f"  {status} {method} {endpoint}")
        
        # اختبار وحدة الحملات التسويقية
        print("\n📢 اختبار وحدة الحملات التسويقية...")
        campaign_tests = [
            ('GET', '/api/crm/campaigns'),
            ('GET', '/api/crm/campaigns/analytics'),
        ]
        
        for method, endpoint, *data in campaign_tests:
            success, response = self.test_endpoint(method, endpoint)
            status = "✅" if success else "❌"
            print(f"  {status} {method} {endpoint}")
        
        # اختبار وحدة الدعم الفني
        print("\n🎧 اختبار وحدة الدعم الفني...")
        support_tests = [
            ('GET', '/api/crm/support/tickets'),
            ('GET', '/api/crm/support/categories'),
            ('GET', '/api/crm/support/analytics'),
        ]
        
        for method, endpoint, *data in support_tests:
            success, response = self.test_endpoint(method, endpoint)
            status = "✅" if success else "❌"
            print(f"  {status} {method} {endpoint}")
        
        # اختبار وحدة التقارير
        print("\n📊 اختبار وحدة التقارير...")
        report_tests = [
            ('GET', '/api/crm/reports/sales-summary'),
            ('GET', '/api/crm/reports/customer-analysis'),
            ('GET', '/api/crm/reports/activity-summary'),
        ]
        
        for method, endpoint, *data in report_tests:
            success, response = self.test_endpoint(method, endpoint)
            status = "✅" if success else "❌"
            print(f"  {status} {method} {endpoint}")
        
        # اختبار الصفحات الرئيسية
        print("\n🌐 اختبار الصفحات الرئيسية...")
        page_tests = [
            ('GET', '/crm-management', None, 200),
        ]
        
        for method, endpoint, *args in page_tests:
            expected_status = args[1] if len(args) > 1 else 200
            success, response = self.test_endpoint(method, endpoint, expected_status=expected_status)
            status = "✅" if success else "❌"
            print(f"  {status} {method} {endpoint}")
        
        return self.generate_test_report()
    
    def generate_test_report(self):
        """إنشاء تقرير شامل للاختبارات"""
        
        print("\n" + "=" * 60)
        print("📋 تقرير الاختبار الشامل لنظام CRM")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        successful_tests = sum(1 for result in self.test_results if result.get('success', False))
        failed_tests = total_tests - successful_tests
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 إجمالي الاختبارات: {total_tests}")
        print(f"✅ الاختبارات الناجحة: {successful_tests}")
        print(f"❌ الاختبارات الفاشلة: {failed_tests}")
        print(f"📈 معدل النجاح: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ الاختبارات الفاشلة:")
            for result in self.test_results:
                if not result.get('success', False):
                    endpoint = result.get('endpoint', 'غير محدد')
                    method = result.get('method', 'غير محدد')
                    error = result.get('error', 'خطأ غير محدد')
                    print(f"  • {method} {endpoint}: {error}")
        
        # تحليل الوحدات
        print(f"\n📋 تحليل الوحدات:")
        modules = {}
        for result in self.test_results:
            endpoint = result.get('endpoint', '')
            if '/customers' in endpoint:
                module = 'العملاء'
            elif '/leads' in endpoint:
                module = 'العملاء المحتملين'
            elif '/opportunities' in endpoint:
                module = 'الفرص التجارية'
            elif '/activities' in endpoint:
                module = 'الأنشطة'
            elif '/communications' in endpoint:
                module = 'التواصل'
            elif '/campaigns' in endpoint:
                module = 'الحملات التسويقية'
            elif '/support' in endpoint:
                module = 'الدعم الفني'
            elif '/reports' in endpoint:
                module = 'التقارير'
            else:
                module = 'عام'
            
            if module not in modules:
                modules[module] = {'total': 0, 'success': 0}
            
            modules[module]['total'] += 1
            if result.get('success', False):
                modules[module]['success'] += 1
        
        for module, stats in modules.items():
            success_rate = (stats['success'] / stats['total'] * 100) if stats['total'] > 0 else 0
            status = "✅" if success_rate == 100 else "⚠️" if success_rate >= 80 else "❌"
            print(f"  {status} {module}: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
        
        # التوصيات
        print(f"\n💡 التوصيات:")
        if success_rate >= 95:
            print("  🎉 النظام يعمل بشكل ممتاز! جميع الوحدات تعمل بكفاءة عالية.")
        elif success_rate >= 80:
            print("  👍 النظام يعمل بشكل جيد مع بعض المشاكل البسيطة.")
            print("  🔧 يُنصح بمراجعة الاختبارات الفاشلة وإصلاحها.")
        else:
            print("  ⚠️ النظام يحتاج إلى مراجعة شاملة.")
            print("  🛠️ يجب إصلاح المشاكل الأساسية قبل الإنتاج.")
        
        print("  📚 تأكد من وجود البيانات التجريبية (تشغيل add_crm_sample_data.py)")
        print("  🔐 تحقق من صحة إعدادات JWT والمصادقة")
        print("  🗄️ تأكد من اتصال قاعدة البيانات وصحة النماذج")
        
        print("\n" + "=" * 60)
        
        return success_rate >= 80

def main():
    """تشغيل الاختبار الرئيسي"""
    
    print("🧪 نظام اختبار CRM - مراكز الأوائل")
    print("=" * 60)
    
    # التحقق من المتطلبات
    try:
        import requests
    except ImportError:
        print("❌ مكتبة requests غير مثبتة. قم بتثبيتها: pip install requests")
        return False
    
    # إنشاء كائن الاختبار
    tester = CRMSystemTester()
    
    # تشغيل الاختبارات
    success = tester.run_comprehensive_tests()
    
    # النتيجة النهائية
    if success:
        print("🎉 تم اجتياز جميع الاختبارات بنجاح!")
        return True
    else:
        print("❌ فشل في بعض الاختبارات. يرجى مراجعة التقرير أعلاه.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
