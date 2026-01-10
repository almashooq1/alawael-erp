#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار شامل لنظام الذكاء الاصطناعي للبرامج والمقاييس
"""

import requests
import json
import time
from datetime import datetime

class AISystemTester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.token = None
        self.test_results = []
        
    def log_test(self, test_name, status, message=""):
        """تسجيل نتيجة الاختبار"""
        result = {
            'test': test_name,
            'status': status,
            'message': message,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_emoji} {test_name}: {message}")
    
    def test_server_connection(self):
        """اختبار الاتصال بالخادم"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            if response.status_code == 200:
                self.log_test("اتصال الخادم", "PASS", "الخادم يعمل بشكل طبيعي")
                return True
            else:
                self.log_test("اتصال الخادم", "FAIL", f"رمز الاستجابة: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("اتصال الخادم", "FAIL", f"خطأ في الاتصال: {str(e)}")
            return False
    
    def test_ai_page_access(self):
        """اختبار الوصول لصفحة الذكاء الاصطناعي"""
        try:
            response = requests.get(f"{self.base_url}/ai-programs-assessments", timeout=5)
            if response.status_code == 200:
                self.log_test("صفحة الذكاء الاصطناعي", "PASS", "الصفحة متاحة")
                return True
            else:
                self.log_test("صفحة الذكاء الاصطناعي", "FAIL", f"رمز الاستجابة: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("صفحة الذكاء الاصطناعي", "FAIL", f"خطأ: {str(e)}")
            return False
    
    def test_api_endpoints(self):
        """اختبار API endpoints للذكاء الاصطناعي"""
        endpoints = [
            "/api/ai/programs-assessments/dashboard",
            "/api/ai/programs/1/analyze",
            "/api/ai/assessments/1/analyze",
            "/api/ai/students/1/progress-prediction"
        ]
        
        for endpoint in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                # نتوقع 401 أو 403 بسبب عدم وجود token
                if response.status_code in [401, 403]:
                    self.log_test(f"API {endpoint}", "PASS", "يتطلب مصادقة (متوقع)")
                elif response.status_code == 200:
                    self.log_test(f"API {endpoint}", "PASS", "يعمل بشكل طبيعي")
                else:
                    self.log_test(f"API {endpoint}", "WARN", f"رمز غير متوقع: {response.status_code}")
            except Exception as e:
                self.log_test(f"API {endpoint}", "FAIL", f"خطأ: {str(e)}")
    
    def test_static_files(self):
        """اختبار الملفات الثابتة"""
        static_files = [
            "/static/js/ai_programs_assessments.js",
            "/static/css/style.css"
        ]
        
        for file_path in static_files:
            try:
                response = requests.get(f"{self.base_url}{file_path}", timeout=5)
                if response.status_code == 200:
                    self.log_test(f"ملف {file_path}", "PASS", "متاح")
                else:
                    self.log_test(f"ملف {file_path}", "FAIL", f"رمز: {response.status_code}")
            except Exception as e:
                self.log_test(f"ملف {file_path}", "FAIL", f"خطأ: {str(e)}")
    
    def generate_report(self):
        """إنشاء تقرير الاختبار"""
        total_tests = len(self.test_results)
        passed = len([r for r in self.test_results if r['status'] == 'PASS'])
        failed = len([r for r in self.test_results if r['status'] == 'FAIL'])
        warnings = len([r for r in self.test_results if r['status'] == 'WARN'])
        
        print("\n" + "="*60)
        print("📊 تقرير اختبار نظام الذكاء الاصطناعي")
        print("="*60)
        print(f"إجمالي الاختبارات: {total_tests}")
        print(f"✅ نجح: {passed}")
        print(f"❌ فشل: {failed}")
        print(f"⚠️ تحذيرات: {warnings}")
        print(f"📈 معدل النجاح: {(passed/total_tests)*100:.1f}%")
        print("="*60)
        
        if failed == 0:
            print("🎉 جميع الاختبارات الأساسية نجحت!")
        else:
            print("⚠️ يوجد مشاكل تحتاج إلى إصلاح")
    
    def run_all_tests(self):
        """تشغيل جميع الاختبارات"""
        print("🚀 بدء اختبار نظام الذكاء الاصطناعي...")
        print("-" * 60)
        
        # اختبار الاتصال بالخادم
        if not self.test_server_connection():
            print("❌ لا يمكن المتابعة - الخادم غير متاح")
            return
        
        # اختبار باقي المكونات
        self.test_ai_page_access()
        self.test_api_endpoints()
        self.test_static_files()
        
        # إنشاء التقرير
        self.generate_report()

if __name__ == "__main__":
    tester = AISystemTester()
    tester.run_all_tests()
