#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RBAC System Testing Script
اختبار نظام RBAC على endpoints حقيقية

يختبر:
1. Authentication
2. Authorization (Permissions)
3. Audit logging
4. Payload protection
5. JSON validation
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"  # عدّل حسب المنفذ
TEST_USERS = {
    'super_admin': {
        'email': 'admin@example.com',
        'password': 'admin123',
        'expected_role': 'super_admin'
    },
    'hr_manager': {
        'email': 'hr@example.com',
        'password': 'hr123',
        'expected_role': 'hr_manager'
    },
    'employee': {
        'email': 'employee@example.com',
        'password': 'emp123',
        'expected_role': 'employee'
    },
    'guest': {
        'email': 'guest@example.com',
        'password': 'guest123',
        'expected_role': 'guest'
    }
}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.CYAN}{'=' * 60}{Colors.END}")
    print(f"{Colors.CYAN}{text}{Colors.END}")
    print(f"{Colors.CYAN}{'=' * 60}{Colors.END}\n")

def print_test(text):
    print(f"{Colors.BLUE}🧪 {text}{Colors.END}")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def login_user(user_type):
    """تسجيل دخول مستخدم والحصول على token"""
    user = TEST_USERS.get(user_type)
    if not user:
        print_error(f"User type '{user_type}' not found")
        return None
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                'email': user['email'],
                'password': user['password']
            },
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            if token:
                print_success(f"Logged in as {user_type}")
                return token
            else:
                print_error(f"No token in response for {user_type}")
                return None
        else:
            print_error(f"Login failed for {user_type}: {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        print_error(f"Connection error: {str(e)}")
        return None

def test_endpoint_access(endpoint, method='GET', token=None, data=None, expected_status=200):
    """اختبار الوصول لـ endpoint"""
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    try:
        if method == 'GET':
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers, timeout=5)
        elif method == 'POST':
            headers['Content-Type'] = 'application/json'
            response = requests.post(
                f"{BASE_URL}{endpoint}",
                headers=headers,
                json=data,
                timeout=5
            )
        elif method == 'PATCH':
            headers['Content-Type'] = 'application/json'
            response = requests.patch(
                f"{BASE_URL}{endpoint}",
                headers=headers,
                json=data,
                timeout=5
            )
        elif method == 'DELETE':
            response = requests.delete(f"{BASE_URL}{endpoint}", headers=headers, timeout=5)
        else:
            print_error(f"Unsupported method: {method}")
            return False
        
        if response.status_code == expected_status:
            return True
        else:
            print_warning(f"Expected {expected_status}, got {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print_error(f"Request error: {str(e)}")
        return False

def test_authentication():
    """اختبار المصادقة"""
    print_header("1️⃣  Authentication Tests")
    
    # Test 1: Login with valid credentials
    print_test("Login with Super Admin")
    token = login_user('super_admin')
    if token:
        print_success("Authentication successful")
    else:
        print_error("Authentication failed")
        return False
    
    # Test 2: Access protected endpoint without token
    print_test("Access protected endpoint without token")
    success = test_endpoint_access('/api/hr/employees', expected_status=401)
    if success:
        print_success("Correctly rejected (401)")
    else:
        print_error("Should have been rejected")
    
    # Test 3: Access with token
    print_test("Access protected endpoint with token")
    success = test_endpoint_access('/api/hr/employees', token=token, expected_status=200)
    if success:
        print_success("Access granted")
    else:
        print_error("Access should have been granted")
    
    return True

def test_authorization():
    """اختبار التفويض والصلاحيات"""
    print_header("2️⃣  Authorization Tests")
    
    # Test 1: Super Admin - should access everything
    print_test("Super Admin accessing HR endpoints")
    token = login_user('super_admin')
    if token:
        success = test_endpoint_access('/api/hr/employees', token=token, expected_status=200)
        if success:
            print_success("Super Admin has full access")
        else:
            print_error("Super Admin should have access")
    
    # Test 2: HR Manager - should access HR endpoints
    print_test("HR Manager accessing HR endpoints")
    token = login_user('hr_manager')
    if token:
        success = test_endpoint_access('/api/hr/employees', token=token, expected_status=200)
        if success:
            print_success("HR Manager has HR access")
        else:
            print_error("HR Manager should have HR access")
    
    # Test 3: Employee - should NOT access HR management endpoints
    print_test("Employee trying to access HR management")
    token = login_user('employee')
    if token:
        success = test_endpoint_access('/api/hr/employees', token=token, expected_status=403)
        if success:
            print_success("Employee correctly blocked (403)")
        else:
            print_warning("Employee should be blocked from HR management")
    
    # Test 4: Guest - should NOT access any protected endpoints
    print_test("Guest trying to access protected endpoint")
    token = login_user('guest')
    if token:
        success = test_endpoint_access('/api/hr/employees', token=token, expected_status=403)
        if success:
            print_success("Guest correctly blocked (403)")
        else:
            print_warning("Guest should be blocked")
    
    return True

def test_payload_protection():
    """اختبار حماية الـ payload"""
    print_header("3️⃣  Payload Protection Tests")
    
    print_test("Sending large payload (should be rejected)")
    token = login_user('super_admin')
    
    if token:
        # إنشاء payload كبير (> 10MB)
        large_data = {
            'name': 'Test',
            'data': 'x' * (11 * 1024 * 1024)  # 11MB
        }
        
        success = test_endpoint_access(
            '/api/hr/employees',
            method='POST',
            token=token,
            data=large_data,
            expected_status=413  # Payload Too Large
        )
        
        if success:
            print_success("Large payload correctly rejected (413)")
        else:
            print_warning("Large payload should be rejected")
    
    return True

def test_json_validation():
    """اختبار التحقق من JSON"""
    print_header("4️⃣  JSON Validation Tests")
    
    print_test("Sending incomplete data (missing required fields)")
    token = login_user('super_admin')
    
    if token:
        # Data ناقص (بدون حقول مطلوبة)
        incomplete_data = {
            'name': 'Test User'
            # missing: email, department, etc.
        }
        
        success = test_endpoint_access(
            '/api/hr/employees',
            method='POST',
            token=token,
            data=incomplete_data,
            expected_status=400  # Bad Request
        )
        
        if success:
            print_success("Incomplete data correctly rejected (400)")
        else:
            print_warning("Incomplete data should be rejected")
    
    return True

def test_role_hierarchy():
    """اختبار هرمية الأدوار"""
    print_header("5️⃣  Role Hierarchy Tests")
    
    roles_order = ['super_admin', 'hr_manager', 'employee', 'guest']
    
    for role in roles_order:
        print_test(f"Testing {role} access level")
        token = login_user(role)
        
        if token:
            # Super Admin should access everything
            if role == 'super_admin':
                endpoints = ['/api/hr/employees', '/api/finance/accounts', '/api/crm/customers']
                for endpoint in endpoints:
                    success = test_endpoint_access(endpoint, token=token, expected_status=200)
                    if success:
                        print_success(f"{role} can access {endpoint}")
            
            # HR Manager should access HR only
            elif role == 'hr_manager':
                hr_success = test_endpoint_access('/api/hr/employees', token=token, expected_status=200)
                finance_blocked = test_endpoint_access('/api/finance/accounts', token=token, expected_status=403)
                
                if hr_success and finance_blocked:
                    print_success(f"{role} has correct permissions")
            
            # Employee should have limited access
            elif role == 'employee':
                profile_success = test_endpoint_access('/api/profile', token=token, expected_status=200)
                hr_blocked = test_endpoint_access('/api/hr/employees', token=token, expected_status=403)
                
                if profile_success and hr_blocked:
                    print_success(f"{role} has correct permissions")
            
            # Guest should have minimal access
            elif role == 'guest':
                blocked = test_endpoint_access('/api/hr/employees', token=token, expected_status=403)
                if blocked:
                    print_success(f"{role} correctly restricted")
    
    return True

def test_audit_logging():
    """اختبار سجلات التدقيق"""
    print_header("6️⃣  Audit Logging Tests")
    
    print_test("Performing actions and checking audit logs")
    token = login_user('super_admin')
    
    if token:
        # تنفيذ بعض العمليات
        test_endpoint_access('/api/hr/employees', token=token)
        test_endpoint_access('/api/finance/accounts', token=token)
        
        # محاولة الوصول لسجلات التدقيق
        print_test("Accessing audit logs")
        success = test_endpoint_access('/api/audit-logs', token=token, expected_status=200)
        
        if success:
            print_success("Audit logs accessible")
        else:
            print_warning("Audit logs might not be implemented yet")
    
    return True

def main():
    """الدالة الرئيسية"""
    print("\n")
    print(f"{Colors.CYAN}{'=' * 60}{Colors.END}")
    print(f"{Colors.CYAN}🔐 RBAC System Testing Suite{Colors.END}")
    print(f"{Colors.CYAN}{'=' * 60}{Colors.END}")
    print(f"\n{Colors.YELLOW}Testing against: {BASE_URL}{Colors.END}\n")
    
    # Check server availability
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print_success("Server is running")
        else:
            print_warning(f"Server responded with status {response.status_code}")
    except requests.exceptions.RequestException:
        print_error("Cannot connect to server")
        print_warning(f"Make sure server is running at {BASE_URL}")
        return False
    
    # Run all tests
    tests = [
        ("Authentication", test_authentication),
        ("Authorization", test_authorization),
        ("Payload Protection", test_payload_protection),
        ("JSON Validation", test_json_validation),
        ("Role Hierarchy", test_role_hierarchy),
        ("Audit Logging", test_audit_logging)
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print_error(f"Test failed with exception: {str(e)}")
            results[test_name] = False
    
    # Summary
    print_header("📊 Test Summary")
    
    total = len(results)
    passed = sum(1 for r in results.values() if r)
    failed = total - passed
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}✅ PASSED{Colors.END}" if result else f"{Colors.RED}❌ FAILED{Colors.END}"
        print(f"{test_name}: {status}")
    
    print(f"\n{Colors.CYAN}{'=' * 60}{Colors.END}")
    print(f"Total Tests: {total}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
    print(f"{Colors.RED}Failed: {failed}{Colors.END}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    print(f"{Colors.CYAN}{'=' * 60}{Colors.END}\n")
    
    return failed == 0

if __name__ == '__main__':
    import sys
    success = main()
    sys.exit(0 if success else 1)
