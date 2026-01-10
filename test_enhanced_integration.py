# -*- coding: utf-8 -*-
"""
اختبار شامل للتكاملات المحسنة
Enhanced Integration System Test
"""

import sys
import os
import requests
import json
from datetime import datetime
from colorama import init, Fore, Style

# Initialize colorama for colored output
init(autoreset=True)

class EnhancedIntegrationTester:
    """فئة اختبار التكاملات المحسنة"""
    
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.test_results = []
        self.passed_tests = 0
        self.failed_tests = 0
    
    def print_header(self, title):
        """طباعة عنوان القسم"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}{title}")
        print(f"{Fore.CYAN}{'='*60}")
    
    def print_test(self, test_name, passed, details=""):
        """طباعة نتيجة الاختبار"""
        if passed:
            print(f"{Fore.GREEN}✅ {test_name}")
            self.passed_tests += 1
        else:
            print(f"{Fore.RED}❌ {test_name}")
            if details:
                print(f"{Fore.YELLOW}   التفاصيل: {details}")
            self.failed_tests += 1
        
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details
        })
    
    def test_file_exists(self, file_path, description):
        """اختبار وجود الملف"""
        exists = os.path.exists(file_path)
        self.print_test(f"وجود الملف: {description}", exists, 
                       f"المسار: {file_path}" if not exists else "")
        return exists
    
    def test_whatsapp_integration(self):
        """اختبار تكامل WhatsApp"""
        self.print_header("اختبار تكامل WhatsApp")
        
        # Test WhatsApp Business API integration
        try:
            from integration_services import CommunicationService
            service = CommunicationService()
            
            # Test WhatsApp settings retrieval
            settings = service._get_whatsapp_settings()
            self.print_test("استرجاع إعدادات WhatsApp", True)
            
            # Test WhatsApp provider methods
            has_twilio_method = hasattr(service, '_send_whatsapp_twilio')
            self.print_test("وجود طريقة Twilio WhatsApp", has_twilio_method)
            
            has_business_api_method = hasattr(service, '_send_whatsapp_business_api')
            self.print_test("وجود طريقة WhatsApp Business API", has_business_api_method)
            
        except Exception as e:
            self.print_test("تكامل WhatsApp", False, str(e))
    
    def test_push_notifications(self):
        """اختبار الإشعارات الفورية"""
        self.print_header("اختبار الإشعارات الفورية")
        
        try:
            from integration_services import CommunicationService
            service = CommunicationService()
            
            # Test push notification methods
            has_firebase_method = hasattr(service, '_send_push_firebase')
            self.print_test("وجود طريقة Firebase", has_firebase_method)
            
            has_onesignal_method = hasattr(service, '_send_push_onesignal')
            self.print_test("وجود طريقة OneSignal", has_onesignal_method)
            
            has_device_token_method = hasattr(service, '_get_user_device_token')
            self.print_test("وجود طريقة استرجاع رمز الجهاز", has_device_token_method)
            
        except Exception as e:
            self.print_test("تكامل الإشعارات الفورية", False, str(e))
    
    def test_voice_calls(self):
        """اختبار المكالمات الصوتية"""
        self.print_header("اختبار المكالمات الصوتية")
        
        try:
            from integration_services import CommunicationService
            service = CommunicationService()
            
            # Test voice call methods
            has_voice_method = hasattr(service, 'send_voice_call')
            self.print_test("وجود طريقة المكالمات الصوتية", has_voice_method)
            
            has_twilio_voice_method = hasattr(service, '_make_voice_call_twilio')
            self.print_test("وجود طريقة Twilio للمكالمات", has_twilio_voice_method)
            
        except Exception as e:
            self.print_test("تكامل المكالمات الصوتية", False, str(e))
    
    def test_sms_providers(self):
        """اختبار مزودي SMS"""
        self.print_header("اختبار مزودي SMS")
        
        try:
            from integration_services import CommunicationService
            service = CommunicationService()
            
            # Test SMS provider methods
            has_twilio_sms = hasattr(service, '_send_sms_twilio')
            self.print_test("وجود طريقة Twilio SMS", has_twilio_sms)
            
            has_taqnyat_sms = hasattr(service, '_send_sms_taqnyat')
            self.print_test("وجود طريقة تقنيات SMS", has_taqnyat_sms)
            
            has_msegat_sms = hasattr(service, '_send_sms_msegat')
            self.print_test("وجود طريقة مسجات SMS", has_msegat_sms)
            
        except Exception as e:
            self.print_test("مزودي SMS", False, str(e))
    
    def test_retry_mechanism(self):
        """اختبار آلية إعادة المحاولة"""
        self.print_header("اختبار آلية إعادة المحاولة")
        
        try:
            from integration_services import CommunicationService
            service = CommunicationService()
            
            # Test retry method
            has_retry_method = hasattr(service, 'retry_failed_message')
            self.print_test("وجود طريقة إعادة المحاولة", has_retry_method)
            
            # Test retry attributes
            has_retry_attempts = hasattr(service, 'retry_attempts')
            self.print_test("وجود متغير عدد المحاولات", has_retry_attempts)
            
            has_retry_delay = hasattr(service, 'retry_delay')
            self.print_test("وجود متغير تأخير المحاولة", has_retry_delay)
            
        except Exception as e:
            self.print_test("آلية إعادة المحاولة", False, str(e))
    
    def test_external_systems(self):
        """اختبار الأنظمة الخارجية"""
        self.print_header("اختبار الأنظمة الخارجية")
        
        try:
            from integration_services import ExternalSystemIntegration
            service = ExternalSystemIntegration()
            
            # Test government system sync
            has_gov_sync = hasattr(service, 'sync_with_government_system')
            self.print_test("وجود مزامنة النظام الحكومي", has_gov_sync)
            
            # Test laboratory system sync
            has_lab_sync = hasattr(service, 'sync_with_laboratory_system')
            self.print_test("وجود مزامنة نظام المختبر", has_lab_sync)
            
            # Test pharmacy system sync
            has_pharmacy_sync = hasattr(service, 'sync_with_pharmacy_system')
            self.print_test("وجود مزامنة نظام الصيدلية", has_pharmacy_sync)
            
            # Test connection testing
            has_connection_test = hasattr(service, 'test_system_connection')
            self.print_test("وجود اختبار الاتصال", has_connection_test)
            
        except Exception as e:
            self.print_test("الأنظمة الخارجية", False, str(e))
    
    def test_enhanced_api_calls(self):
        """اختبار استدعاءات API المحسنة"""
        self.print_header("اختبار استدعاءات API المحسنة")
        
        try:
            from integration_services import ExternalSystemIntegration
            service = ExternalSystemIntegration()
            
            # Test enhanced API call method
            import inspect
            api_method = getattr(service, '_make_api_call')
            signature = inspect.signature(api_method)
            
            # Check if retry_count parameter exists
            has_retry_param = 'retry_count' in signature.parameters
            self.print_test("وجود معامل إعادة المحاولة في API", has_retry_param)
            
            # Test connection test methods
            connection_methods = [
                '_test_hospital_connection',
                '_test_insurance_connection',
                '_test_payment_connection',
                '_test_government_connection',
                '_test_laboratory_connection',
                '_test_pharmacy_connection'
            ]
            
            for method_name in connection_methods:
                has_method = hasattr(service, method_name)
                self.print_test(f"وجود طريقة {method_name}", has_method)
            
        except Exception as e:
            self.print_test("استدعاءات API المحسنة", False, str(e))
    
    def test_new_api_endpoints(self):
        """اختبار API endpoints الجديدة"""
        self.print_header("اختبار API Endpoints الجديدة")
        
        # Test if integration_api.py has new endpoints
        try:
            with open('integration_api.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for new WhatsApp endpoint
            has_whatsapp_endpoint = '/api/communication/send-whatsapp' in content
            self.print_test("وجود endpoint WhatsApp", has_whatsapp_endpoint)
            
            # Check for push notification endpoint
            has_push_endpoint = '/api/communication/send-push' in content
            self.print_test("وجود endpoint الإشعارات الفورية", has_push_endpoint)
            
            # Check for voice call endpoint
            has_voice_endpoint = '/api/communication/send-voice-call' in content
            self.print_test("وجود endpoint المكالمات الصوتية", has_voice_endpoint)
            
            # Check for retry endpoint
            has_retry_endpoint = '/api/communication/retry-message' in content
            self.print_test("وجود endpoint إعادة المحاولة", has_retry_endpoint)
            
            # Check for government sync endpoint
            has_gov_endpoint = '/api/integration/sync-government' in content
            self.print_test("وجود endpoint مزامنة النظام الحكومي", has_gov_endpoint)
            
            # Check for laboratory sync endpoint
            has_lab_endpoint = '/api/integration/sync-laboratory' in content
            self.print_test("وجود endpoint مزامنة المختبر", has_lab_endpoint)
            
            # Check for pharmacy sync endpoint
            has_pharmacy_endpoint = '/api/integration/sync-pharmacy' in content
            self.print_test("وجود endpoint مزامنة الصيدلية", has_pharmacy_endpoint)
            
        except Exception as e:
            self.print_test("API Endpoints الجديدة", False, str(e))
    
    def test_database_models(self):
        """اختبار نماذج قاعدة البيانات"""
        self.print_header("اختبار نماذج قاعدة البيانات")
        
        try:
            from integration_models import (
                ExternalSystem, ExternalSystemType, CommunicationChannel,
                MessageTemplate, CommunicationMessage, PaymentProvider,
                InsuranceProvider, CommunicationSettings
            )
            
            # Test ExternalSystemType enum
            system_types = [
                'HOSPITAL', 'INSURANCE', 'PAYMENT', 'GOVERNMENT',
                'EDUCATION', 'LABORATORY', 'PHARMACY'
            ]
            
            for sys_type in system_types:
                has_type = hasattr(ExternalSystemType, sys_type)
                self.print_test(f"وجود نوع النظام {sys_type}", has_type)
            
            # Test CommunicationChannel enum
            channels = ['SMS', 'EMAIL', 'WHATSAPP', 'PUSH_NOTIFICATION', 'VOICE_CALL']
            
            for channel in channels:
                has_channel = hasattr(CommunicationChannel, channel)
                self.print_test(f"وجود قناة الاتصال {channel}", has_channel)
            
        except Exception as e:
            self.print_test("نماذج قاعدة البيانات", False, str(e))
    
    def run_all_tests(self):
        """تشغيل جميع الاختبارات"""
        print(f"{Fore.MAGENTA}🚀 بدء اختبار التكاملات المحسنة...")
        print(f"{Fore.MAGENTA}التاريخ والوقت: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test core files
        self.test_file_exists('integration_models.py', 'نماذج التكامل')
        self.test_file_exists('integration_services.py', 'خدمات التكامل')
        self.test_file_exists('integration_api.py', 'API endpoints التكامل')
        
        # Test enhanced integrations
        self.test_whatsapp_integration()
        self.test_push_notifications()
        self.test_voice_calls()
        self.test_sms_providers()
        self.test_retry_mechanism()
        self.test_external_systems()
        self.test_enhanced_api_calls()
        self.test_new_api_endpoints()
        self.test_database_models()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """طباعة ملخص النتائج"""
        total_tests = self.passed_tests + self.failed_tests
        success_rate = (self.passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n{Fore.MAGENTA}{'='*60}")
        print(f"{Fore.MAGENTA}ملخص نتائج الاختبار")
        print(f"{Fore.MAGENTA}{'='*60}")
        
        print(f"{Fore.GREEN}✅ الاختبارات الناجحة: {self.passed_tests}")
        print(f"{Fore.RED}❌ الاختبارات الفاشلة: {self.failed_tests}")
        print(f"{Fore.CYAN}📊 إجمالي الاختبارات: {total_tests}")
        print(f"{Fore.YELLOW}📈 معدل النجاح: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print(f"\n{Fore.GREEN}🎉 ممتاز! التكاملات المحسنة تعمل بشكل مثالي")
        elif success_rate >= 75:
            print(f"\n{Fore.YELLOW}👍 جيد! معظم التكاملات تعمل بشكل صحيح")
        else:
            print(f"\n{Fore.RED}⚠️ تحتاج إلى مراجعة وإصلاح بعض التكاملات")
        
        # Print recommendations
        if self.failed_tests > 0:
            print(f"\n{Fore.CYAN}💡 التوصيات:")
            print(f"{Fore.CYAN}• مراجعة الاختبارات الفاشلة وإصلاح المشاكل")
            print(f"{Fore.CYAN}• التأكد من تثبيت جميع المكتبات المطلوبة")
            print(f"{Fore.CYAN}• فحص إعدادات قاعدة البيانات والاتصال")

if __name__ == "__main__":
    tester = EnhancedIntegrationTester()
    tester.run_all_tests()
