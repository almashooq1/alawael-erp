import requests
import json
import os
from datetime import datetime

class RiskManagementSystemTester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.token = None
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def login(self, email="admin@awail.com", password="admin123"):
        """تسجيل الدخول للحصول على رمز المصادقة"""
        try:
            response = requests.post(f"{self.base_url}/api/login", 
                                   json={"email": email, "password": password})
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                print("✅ تم تسجيل الدخول بنجاح")
                return True
            else:
                print(f"❌ فشل تسجيل الدخول: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ خطأ في تسجيل الدخول: {e}")
            return False

    def get_headers(self):
        """الحصول على headers مع رمز المصادقة"""
        return {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }

    def test_api_endpoint(self, method, endpoint, data=None, expected_status=200):
        """اختبار API endpoint"""
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
            
            if response.status_code == expected_status:
                self.test_results['passed'] += 1
                return True, response.json() if response.content else {}
            else:
                self.test_results['failed'] += 1
                error_msg = f"{method} {endpoint} - Expected: {expected_status}, Got: {response.status_code}"
                self.test_results['errors'].append(error_msg)
                return False, None
                
        except Exception as e:
            self.test_results['failed'] += 1
            error_msg = f"{method} {endpoint} - Exception: {str(e)}"
            self.test_results['errors'].append(error_msg)
            return False, None

    def test_risk_categories_api(self):
        """اختبار API فئات المخاطر"""
        print("\n🔍 اختبار API فئات المخاطر...")
        
        # اختبار استرجاع فئات المخاطر
        success, data = self.test_api_endpoint('GET', '/api/risk-categories')
        if success:
            print("✅ استرجاع فئات المخاطر")
        else:
            print("❌ فشل استرجاع فئات المخاطر")
        
        # اختبار إنشاء فئة مخاطر جديدة
        new_category = {
            'name': 'فئة اختبار',
            'description': 'فئة للاختبار',
            'color_code': '#ff0000',
            'icon': 'fas fa-test'
        }
        success, data = self.test_api_endpoint('POST', '/api/risk-categories', new_category)
        if success:
            print("✅ إنشاء فئة مخاطر جديدة")
        else:
            print("❌ فشل إنشاء فئة مخاطر جديدة")

    def test_risk_assessments_api(self):
        """اختبار API تقييمات المخاطر"""
        print("\n🔍 اختبار API تقييمات المخاطر...")
        
        # اختبار استرجاع تقييمات المخاطر
        success, data = self.test_api_endpoint('GET', '/api/risk-assessments')
        if success:
            print("✅ استرجاع تقييمات المخاطر")
        else:
            print("❌ فشل استرجاع تقييمات المخاطر")
        
        # اختبار إنشاء تقييم مخاطر جديد
        new_assessment = {
            'title': 'مخاطر اختبار',
            'description': 'وصف مخاطر الاختبار',
            'category_id': 1,
            'location': 'موقع الاختبار',
            'department': 'قسم الاختبار',
            'probability': 3,
            'impact': 4,
            'current_controls': 'ضوابط حالية',
            'recommended_actions': 'إجراءات موصى بها'
        }
        success, data = self.test_api_endpoint('POST', '/api/risk-assessments', new_assessment)
        if success:
            print("✅ إنشاء تقييم مخاطر جديد")
        else:
            print("❌ فشل إنشاء تقييم مخاطر جديد")

    def test_emergency_plans_api(self):
        """اختبار API خطط الطوارئ"""
        print("\n🔍 اختبار API خطط الطوارئ...")
        
        # اختبار استرجاع خطط الطوارئ
        success, data = self.test_api_endpoint('GET', '/api/emergency-plans')
        if success:
            print("✅ استرجاع خطط الطوارئ")
        else:
            print("❌ فشل استرجاع خطط الطوارئ")
        
        # اختبار إنشاء خطة طوارئ جديدة
        new_plan = {
            'title': 'خطة اختبار',
            'description': 'وصف خطة الاختبار',
            'emergency_type': 'fire',
            'scope': 'نطاق الاختبار',
            'objectives': 'أهداف الاختبار'
        }
        success, data = self.test_api_endpoint('POST', '/api/emergency-plans', new_plan)
        if success:
            print("✅ إنشاء خطة طوارئ جديدة")
        else:
            print("❌ فشل إنشاء خطة طوارئ جديدة")

    def test_incident_reports_api(self):
        """اختبار API تقارير الحوادث"""
        print("\n🔍 اختبار API تقارير الحوادث...")
        
        # اختبار استرجاع تقارير الحوادث
        success, data = self.test_api_endpoint('GET', '/api/incident-reports')
        if success:
            print("✅ استرجاع تقارير الحوادث")
        else:
            print("❌ فشل استرجاع تقارير الحوادث")
        
        # اختبار إنشاء تقرير حادث جديد
        new_incident = {
            'title': 'حادث اختبار',
            'description': 'وصف حادث الاختبار',
            'incident_type': 'injury',
            'severity': 'minor',
            'incident_date': datetime.now().strftime('%Y-%m-%d'),
            'incident_time': '10:30',
            'location': 'موقع الاختبار'
        }
        success, data = self.test_api_endpoint('POST', '/api/incident-reports', new_incident)
        if success:
            print("✅ إنشاء تقرير حادث جديد")
        else:
            print("❌ فشل إنشاء تقرير حادث جديد")

    def test_safety_inspections_api(self):
        """اختبار API تفتيشات السلامة"""
        print("\n🔍 اختبار API تفتيشات السلامة...")
        
        # اختبار استرجاع تفتيشات السلامة
        success, data = self.test_api_endpoint('GET', '/api/safety-inspections')
        if success:
            print("✅ استرجاع تفتيشات السلامة")
        else:
            print("❌ فشل استرجاع تفتيشات السلامة")

    def test_preventive_measures_api(self):
        """اختبار API التدابير الوقائية"""
        print("\n🔍 اختبار API التدابير الوقائية...")
        
        # اختبار استرجاع التدابير الوقائية
        success, data = self.test_api_endpoint('GET', '/api/preventive-measures')
        if success:
            print("✅ استرجاع التدابير الوقائية")
        else:
            print("❌ فشل استرجاع التدابير الوقائية")

    def test_dashboard_api(self):
        """اختبار API لوحة التحكم"""
        print("\n🔍 اختبار API لوحة التحكم...")
        
        # اختبار استرجاع بيانات لوحة التحكم
        success, data = self.test_api_endpoint('GET', '/api/risk-management-dashboard')
        if success:
            print("✅ استرجاع بيانات لوحة التحكم")
        else:
            print("❌ فشل استرجاع بيانات لوحة التحكم")
        
        # اختبار مصفوفة المخاطر
        success, data = self.test_api_endpoint('GET', '/api/risk-matrix')
        if success:
            print("✅ استرجاع مصفوفة المخاطر")
        else:
            print("❌ فشل استرجاع مصفوفة المخاطر")

    def test_ui_files(self):
        """اختبار وجود ملفات واجهة المستخدم"""
        print("\n🔍 اختبار ملفات واجهة المستخدم...")
        
        files_to_check = [
            'templates/risk_management.html',
            'static/js/risk_management.js'
        ]
        
        for file_path in files_to_check:
            full_path = os.path.join(os.getcwd(), file_path)
            if os.path.exists(full_path):
                print(f"✅ {file_path}")
                self.test_results['passed'] += 1
            else:
                print(f"❌ {file_path} غير موجود")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Missing file: {file_path}")

    def test_database_models(self):
        """اختبار نماذج قاعدة البيانات"""
        print("\n🔍 اختبار نماذج قاعدة البيانات...")
        
        try:
            from risk_management_models import (
                RiskCategory, RiskAssessment, EmergencyPlan, 
                IncidentReport, SafetyInspection, PreventiveMeasure, RiskMitigation
            )
            
            models = [
                'RiskCategory', 'RiskAssessment', 'EmergencyPlan',
                'IncidentReport', 'SafetyInspection', 'PreventiveMeasure', 'RiskMitigation'
            ]
            
            for model_name in models:
                print(f"✅ نموذج {model_name}")
                self.test_results['passed'] += 1
                
        except ImportError as e:
            print(f"❌ خطأ في استيراد النماذج: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Model import error: {e}")

    def test_integration(self):
        """اختبار التكامل مع النظام الأساسي"""
        print("\n🔍 اختبار التكامل...")
        
        # اختبار صفحة إدارة المخاطر
        try:
            response = requests.get(f"{self.base_url}/risk-management", 
                                  headers=self.get_headers())
            if response.status_code == 200:
                print("✅ صفحة إدارة المخاطر")
                self.test_results['passed'] += 1
            else:
                print(f"❌ فشل الوصول لصفحة إدارة المخاطر: {response.status_code}")
                self.test_results['failed'] += 1
        except Exception as e:
            print(f"❌ خطأ في الوصول لصفحة إدارة المخاطر: {e}")
            self.test_results['failed'] += 1

    def run_all_tests(self):
        """تشغيل جميع الاختبارات"""
        print("🚀 بدء اختبار نظام إدارة المخاطر...")
        print("=" * 50)
        
        # تسجيل الدخول أولاً
        if not self.login():
            print("❌ فشل تسجيل الدخول - توقف الاختبار")
            return
        
        # تشغيل الاختبارات
        self.test_database_models()
        self.test_ui_files()
        self.test_risk_categories_api()
        self.test_risk_assessments_api()
        self.test_emergency_plans_api()
        self.test_incident_reports_api()
        self.test_safety_inspections_api()
        self.test_preventive_measures_api()
        self.test_dashboard_api()
        self.test_integration()
        
        # عرض النتائج
        self.print_results()

    def print_results(self):
        """عرض نتائج الاختبار"""
        print("\n" + "=" * 50)
        print("📊 نتائج اختبار نظام إدارة المخاطر")
        print("=" * 50)
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        success_rate = (self.test_results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ اختبارات نجحت: {self.test_results['passed']}")
        print(f"❌ اختبارات فشلت: {self.test_results['failed']}")
        print(f"📈 معدل النجاح: {success_rate:.1f}%")
        
        if self.test_results['errors']:
            print("\n🔍 تفاصيل الأخطاء:")
            for error in self.test_results['errors']:
                print(f"   - {error}")
        
        print("\n" + "=" * 50)
        
        if success_rate >= 80:
            print("🎉 نظام إدارة المخاطر يعمل بشكل ممتاز!")
        elif success_rate >= 60:
            print("⚠️ نظام إدارة المخاطر يعمل بشكل جيد مع بعض المشاكل")
        else:
            print("❌ نظام إدارة المخاطر يحتاج إلى مراجعة وإصلاح")

        # التوصيات
        print("\n💡 التوصيات:")
        if self.test_results['failed'] == 0:
            print("   - النظام جاهز للاستخدام الإنتاجي")
            print("   - يمكن إضافة المزيد من الميزات المتقدمة")
        else:
            print("   - مراجعة الأخطاء المذكورة أعلاه")
            print("   - التأكد من تشغيل الخادم بشكل صحيح")
            print("   - فحص اتصال قاعدة البيانات")

if __name__ == '__main__':
    tester = RiskManagementSystemTester()
    tester.run_all_tests()
