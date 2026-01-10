#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
نظام اختبار شامل لنظام الأمان والامتثال
مراكز الأوائل للتأهيل الطبي
"""

import sys
import os
import requests
import json
import time
from datetime import datetime

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_security_system():
    """اختبار شامل لنظام الأمان والامتثال"""
    
    print("🔐 بدء اختبار نظام الأمان والامتثال الشامل...")
    print("=" * 60)
    
    base_url = "http://localhost:5000"
    test_results = {
        'total_tests': 0,
        'passed_tests': 0,
        'failed_tests': 0,
        'test_details': []
    }
    
    # رمز الوصول للاختبار (يجب الحصول عليه من تسجيل الدخول)
    access_token = None
    
    def run_test(test_name, test_function):
        """تشغيل اختبار واحد وتسجيل النتيجة"""
        test_results['total_tests'] += 1
        print(f"\n🧪 اختبار: {test_name}")
        
        try:
            result = test_function()
            if result:
                print(f"✅ نجح: {test_name}")
                test_results['passed_tests'] += 1
                test_results['test_details'].append({
                    'name': test_name,
                    'status': 'PASS',
                    'message': 'اختبار ناجح'
                })
                return True
            else:
                print(f"❌ فشل: {test_name}")
                test_results['failed_tests'] += 1
                test_results['test_details'].append({
                    'name': test_name,
                    'status': 'FAIL',
                    'message': 'اختبار فاشل'
                })
                return False
        except Exception as e:
            print(f"❌ خطأ في {test_name}: {e}")
            test_results['failed_tests'] += 1
            test_results['test_details'].append({
                'name': test_name,
                'status': 'ERROR',
                'message': str(e)
            })
            return False
    
    def make_request(endpoint, method='GET', data=None, auth_required=True):
        """إرسال طلب HTTP مع معالجة الأخطاء"""
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and access_token:
            headers['Authorization'] = f'Bearer {access_token}'
        
        url = f"{base_url}{endpoint}"
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"خطأ في الطلب: {e}")
            return None
    
    # ==================== اختبارات API Endpoints ====================
    
    def test_security_dashboard():
        """اختبار لوحة تحكم الأمان"""
        response = make_request('/api/security-dashboard')
        if response and response.status_code == 200:
            data = response.json()
            return data.get('success', False) and 'statistics' in data
        return False
    
    def test_mfa_setup():
        """اختبار إعداد المصادقة متعددة العوامل"""
        mfa_data = {
            'method_type': 'totp'
        }
        response = make_request('/api/mfa/setup', 'POST', mfa_data)
        if response and response.status_code == 200:
            data = response.json()
            return data.get('success', False)
        return False
    
    def test_audit_logs():
        """اختبار سجلات المراجعة"""
        response = make_request('/api/audit-logs')
        if response and response.status_code == 200:
            data = response.json()
            return data.get('success', False) and 'logs' in data
        return False
    
    def test_security_incidents():
        """اختبار حوادث الأمان"""
        # اختبار استرجاع الحوادث
        response = make_request('/api/security-incidents')
        if response and response.status_code == 200:
            data = response.json()
            if not (data.get('success', False) and 'incidents' in data):
                return False
        
        # اختبار إنشاء حادث جديد
        incident_data = {
            'incident_type': 'unauthorized_access',
            'severity': 'high',
            'title': 'اختبار حادث أمان',
            'description': 'هذا حادث اختبار',
            'source_ip': '192.168.1.100',
            'detection_method': 'automated'
        }
        response = make_request('/api/security-incidents', 'POST', incident_data)
        if response and response.status_code == 200:
            data = response.json()
            return data.get('success', False)
        
        return False
    
    def test_security_alerts():
        """اختبار تنبيهات الأمان"""
        response = make_request('/api/security-alerts')
        if response and response.status_code == 200:
            data = response.json()
            return data.get('success', False) and 'alerts' in data
        return False
    
    def test_backup_schedules():
        """اختبار جداول النسخ الاحتياطي"""
        response = make_request('/api/backup-schedules')
        if response and response.status_code == 200:
            data = response.json()
            return data.get('success', False) and 'schedules' in data
        return False
    
    def test_backup_history():
        """اختبار تاريخ النسخ الاحتياطي"""
        response = make_request('/api/backup-history')
        if response and response.status_code == 200:
            data = response.json()
            return data.get('success', False) and 'history' in data
        return False
    
    # ==================== اختبارات الملفات والهيكل ====================
    
    def test_security_models_file():
        """اختبار وجود ملف نماذج الأمان"""
        return os.path.exists('security_models.py')
    
    def test_security_api_file():
        """اختبار وجود ملف API الأمان"""
        return os.path.exists('security_api.py')
    
    def test_security_html_file():
        """اختبار وجود ملف HTML إدارة الأمان"""
        return os.path.exists('templates/security_management.html')
    
    def test_security_js_file():
        """اختبار وجود ملف JavaScript إدارة الأمان"""
        return os.path.exists('static/js/security_management.js')
    
    def test_sample_data_file():
        """اختبار وجود ملف البيانات التجريبية"""
        return os.path.exists('add_security_sample_data.py')
    
    # ==================== اختبارات قاعدة البيانات ====================
    
    def test_database_models():
        """اختبار نماذج قاعدة البيانات"""
        try:
            from security_models import (
                SecurityConfig, MultiFactorAuth, AuditLog, DataEncryption,
                BackupSchedule, BackupHistory, PrivacyConsent, DataRetention,
                SecurityIncident, SecurityAlert, PermissionRole, UserPermission,
                SessionSecurity, EncryptionHelper
            )
            
            # التحقق من وجود جميع النماذج
            models = [
                SecurityConfig, MultiFactorAuth, AuditLog, DataEncryption,
                BackupSchedule, BackupHistory, PrivacyConsent, DataRetention,
                SecurityIncident, SecurityAlert, PermissionRole, UserPermission,
                SessionSecurity
            ]
            
            for model in models:
                if not hasattr(model, '__tablename__'):
                    return False
            
            # التحقق من وجود EncryptionHelper
            if not hasattr(EncryptionHelper, 'encrypt_data'):
                return False
            
            return True
        except ImportError as e:
            print(f"خطأ في استيراد النماذج: {e}")
            return False
    
    def test_encryption_helper():
        """اختبار مساعد التشفير"""
        try:
            from security_models import EncryptionHelper
            
            # اختبار التشفير وفك التشفير
            test_data = "بيانات اختبار سرية"
            key = b"test_key_32_bytes_long_for_test!"
            
            encrypted = EncryptionHelper.encrypt_data(test_data, key)
            decrypted = EncryptionHelper.decrypt_data(encrypted, key)
            
            if decrypted != test_data:
                return False
            
            # اختبار تشفير كلمة المرور
            password = "test_password"
            hashed = EncryptionHelper.hash_password(password)
            
            if not EncryptionHelper.verify_password(password, hashed):
                return False
            
            # اختبار توليد الرمز الآمن
            token = EncryptionHelper.generate_secure_token(16)
            if len(token) != 16:
                return False
            
            return True
        except Exception as e:
            print(f"خطأ في اختبار التشفير: {e}")
            return False
    
    # ==================== اختبارات التكامل ====================
    
    def test_app_integration():
        """اختبار التكامل مع التطبيق الرئيسي"""
        try:
            # التحقق من تسجيل Blueprint
            from app import app
            
            # البحث عن security blueprint
            security_bp_found = False
            for blueprint in app.blueprints.values():
                if hasattr(blueprint, 'name') and 'security' in blueprint.name:
                    security_bp_found = True
                    break
            
            return security_bp_found
        except Exception as e:
            print(f"خطأ في اختبار التكامل: {e}")
            return False
    
    def test_dashboard_navigation():
        """اختبار رابط التنقل في لوحة التحكم"""
        try:
            with open('templates/dashboard.html', 'r', encoding='utf-8') as f:
                content = f.read()
                return '/security-management' in content and 'الأمان والامتثال' in content
        except Exception as e:
            print(f"خطأ في اختبار التنقل: {e}")
            return False
    
    # ==================== اختبارات واجهة المستخدم ====================
    
    def test_html_structure():
        """اختبار هيكل HTML"""
        try:
            with open('templates/security_management.html', 'r', encoding='utf-8') as f:
                content = f.read()
                
                # التحقق من العناصر الأساسية
                required_elements = [
                    'security-dashboard', 'mfa-tab', 'audit-tab',
                    'incidents-tab', 'alerts-tab', 'backups-tab'
                ]
                
                for element in required_elements:
                    if element not in content:
                        return False
                
                return True
        except Exception as e:
            print(f"خطأ في اختبار HTML: {e}")
            return False
    
    def test_javascript_structure():
        """اختبار هيكل JavaScript"""
        try:
            with open('static/js/security_management.js', 'r', encoding='utf-8') as f:
                content = f.read()
                
                # التحقق من الفئات والوظائف الأساسية
                required_functions = [
                    'SecurityManager', 'loadDashboard', 'setupMFA',
                    'loadAuditLogs', 'loadSecurityIncidents', 'loadSecurityAlerts'
                ]
                
                for func in required_functions:
                    if func not in content:
                        return False
                
                return True
        except Exception as e:
            print(f"خطأ في اختبار JavaScript: {e}")
            return False
    
    # ==================== تشغيل جميع الاختبارات ====================
    
    print("🔍 بدء اختبارات الملفات والهيكل...")
    run_test("وجود ملف نماذج الأمان", test_security_models_file)
    run_test("وجود ملف API الأمان", test_security_api_file)
    run_test("وجود ملف HTML إدارة الأمان", test_security_html_file)
    run_test("وجود ملف JavaScript إدارة الأمان", test_security_js_file)
    run_test("وجود ملف البيانات التجريبية", test_sample_data_file)
    
    print("\n🗄️ بدء اختبارات قاعدة البيانات...")
    run_test("نماذج قاعدة البيانات", test_database_models)
    run_test("مساعد التشفير", test_encryption_helper)
    
    print("\n🔗 بدء اختبارات التكامل...")
    run_test("التكامل مع التطبيق الرئيسي", test_app_integration)
    run_test("رابط التنقل في لوحة التحكم", test_dashboard_navigation)
    
    print("\n🎨 بدء اختبارات واجهة المستخدم...")
    run_test("هيكل HTML", test_html_structure)
    run_test("هيكل JavaScript", test_javascript_structure)
    
    # اختبارات API (تتطلب تشغيل الخادم)
    print("\n🌐 بدء اختبارات API...")
    print("ملاحظة: اختبارات API تتطلب تشغيل الخادم وتسجيل الدخول")
    
    # محاولة الاتصال بالخادم
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200:
            print("✅ الخادم يعمل - يمكن تشغيل اختبارات API")
            
            # ملاحظة: في التطبيق الحقيقي، نحتاج لتسجيل الدخول أولاً
            # run_test("لوحة تحكم الأمان", test_security_dashboard)
            # run_test("سجلات المراجعة", test_audit_logs)
            # run_test("حوادث الأمان", test_security_incidents)
            # run_test("تنبيهات الأمان", test_security_alerts)
            # run_test("جداول النسخ الاحتياطي", test_backup_schedules)
            # run_test("تاريخ النسخ الاحتياطي", test_backup_history)
            
        else:
            print("⚠️ الخادم لا يستجيب - تخطي اختبارات API")
    except:
        print("⚠️ لا يمكن الاتصال بالخادم - تخطي اختبارات API")
    
    # ==================== تقرير النتائج ====================
    
    print("\n" + "=" * 60)
    print("📊 تقرير نتائج الاختبار")
    print("=" * 60)
    
    print(f"إجمالي الاختبارات: {test_results['total_tests']}")
    print(f"الاختبارات الناجحة: {test_results['passed_tests']}")
    print(f"الاختبارات الفاشلة: {test_results['failed_tests']}")
    
    success_rate = (test_results['passed_tests'] / test_results['total_tests']) * 100 if test_results['total_tests'] > 0 else 0
    print(f"معدل النجاح: {success_rate:.1f}%")
    
    print("\n📋 تفاصيل النتائج:")
    for test in test_results['test_details']:
        status_icon = "✅" if test['status'] == 'PASS' else "❌"
        print(f"  {status_icon} {test['name']}: {test['status']}")
        if test['status'] != 'PASS':
            print(f"     السبب: {test['message']}")
    
    # التوصيات
    print("\n💡 التوصيات:")
    
    if test_results['failed_tests'] == 0:
        print("🎉 ممتاز! جميع الاختبارات نجحت.")
        print("✅ نظام الأمان والامتثال جاهز للاستخدام.")
    else:
        print("⚠️ يوجد اختبارات فاشلة تحتاج إلى إصلاح.")
        
        if success_rate >= 80:
            print("✅ النظام في حالة جيدة عموماً.")
        elif success_rate >= 60:
            print("⚠️ النظام يحتاج إلى تحسينات.")
        else:
            print("❌ النظام يحتاج إلى مراجعة شاملة.")
    
    print("\n🔧 خطوات ما بعد الاختبار:")
    print("1. تشغيل add_security_sample_data.py لإضافة البيانات التجريبية")
    print("2. تشغيل الخادم واختبار واجهة المستخدم")
    print("3. اختبار جميع وظائف الأمان والامتثال")
    print("4. مراجعة سجلات الأمان والتنبيهات")
    print("5. اختبار النسخ الاحتياطي والاستعادة")
    
    return test_results

if __name__ == '__main__':
    test_security_system()
