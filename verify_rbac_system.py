#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RBAC System Verification Script
التحقق من صحة تطبيق نظام RBAC

يتحقق من:
1. وجود جميع الملفات المطلوبة
2. صحة تطبيق decorators
3. وجود جميع imports
4. تناسق الأكواد
"""

import os
import re
import sys
from pathlib import Path

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

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.END}")

def check_file_exists(filepath):
    """التحقق من وجود ملف"""
    if os.path.exists(filepath):
        print_success(f"Found: {os.path.basename(filepath)}")
        return True
    else:
        print_error(f"Missing: {os.path.basename(filepath)}")
        return False

def check_rbac_files():
    """التحقق من وجود ملفات RBAC"""
    print_header("1️⃣  Checking RBAC System Files")
    
    required_files = [
        'auth_rbac_decorator.py',
        'RBAC_COMPLETE_GUIDE.md',
        'RBAC_QUICK_START.md',
        'rbac_migration.py',
        'apply_rbac_bulk.py',
        'test_rbac_endpoints.py',
        'test_rbac_system.py'
    ]
    
    all_found = True
    for filename in required_files:
        if not check_file_exists(filename):
            all_found = False
    
    return all_found

def check_api_file_has_rbac(filepath):
    """التحقق من تطبيق RBAC على ملف API"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        issues = []
        
        # Check 1: RBAC import
        if 'from auth_rbac_decorator import' not in content:
            issues.append("Missing RBAC import")
        
        # Check 2: Has @jwt_required but no RBAC decorators
        if '@jwt_required' in content and '@check_permission' not in content:
            issues.append("Has @jwt_required but no @check_permission")
        
        # Check 3: Count decorators
        check_permission_count = len(re.findall(r'@check_permission\(', content))
        log_audit_count = len(re.findall(r'@log_audit\(', content))
        guard_payload_count = len(re.findall(r'@guard_payload_size\(', content))
        
        if check_permission_count == 0 and '@jwt_required' in content:
            issues.append("No @check_permission found")
        
        if issues:
            print_warning(f"{os.path.basename(filepath)}: {', '.join(issues)}")
            return False
        else:
            print_success(f"{os.path.basename(filepath)}: OK ({check_permission_count} perms, {log_audit_count} audits)")
            return True
            
    except Exception as e:
        print_error(f"Error reading {filepath}: {str(e)}")
        return False

def check_api_files():
    """التحقق من جميع ملفات API"""
    print_header("2️⃣  Checking API Files")
    
    api_files = []
    for pattern in ['*_api.py', '*_blueprint.py']:
        api_files.extend(Path('.').glob(pattern))
    
    print_info(f"Found {len(api_files)} API files")
    
    success_count = 0
    warning_count = 0
    
    for api_file in api_files:
        if check_api_file_has_rbac(str(api_file)):
            success_count += 1
        else:
            warning_count += 1
    
    print(f"\n{Colors.BLUE}Summary:{Colors.END}")
    print(f"  ✅ Correct: {success_count}")
    print(f"  ⚠️  Warnings: {warning_count}")
    
    return warning_count == 0

def check_decorator_patterns():
    """التحقق من أنماط decorators الصحيحة"""
    print_header("3️⃣  Checking Decorator Patterns")
    
    api_files = list(Path('.').glob('*_api.py'))
    
    correct_patterns = 0
    incorrect_patterns = 0
    
    for api_file in api_files:
        try:
            with open(api_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Pattern 1: GET endpoints should have @check_permission + @log_audit
            get_endpoints = re.finditer(
                r"@\w+\.route\(['\"].*?['\"]\s*,\s*methods=\['GET'\]\)\s*@jwt_required\(\)\s*(?:@check_permission\(['\"].*?['\"]\)\s*)?(?:@log_audit\(['\"].*?['\"]\)\s*)?def\s+(\w+)",
                content
            )
            
            for match in get_endpoints:
                full_text = match.group(0)
                if '@check_permission' in full_text and '@log_audit' in full_text:
                    correct_patterns += 1
                else:
                    incorrect_patterns += 1
                    print_warning(f"GET endpoint '{match.group(1)}' in {api_file.name} missing decorators")
            
        except Exception as e:
            print_error(f"Error checking {api_file}: {str(e)}")
    
    print(f"\n{Colors.BLUE}Pattern Check:{Colors.END}")
    print(f"  ✅ Correct: {correct_patterns}")
    print(f"  ⚠️  Incorrect: {incorrect_patterns}")
    
    return incorrect_patterns == 0

def check_permissions_defined():
    """التحقق من تعريف الصلاحيات"""
    print_header("4️⃣  Checking Permission Definitions")
    
    try:
        with open('auth_rbac_decorator.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # استخراج الصلاحيات من ROLE_PERMISSIONS
        role_perms_match = re.search(r'ROLE_PERMISSIONS\s*=\s*{(.*?)}', content, re.DOTALL)
        
        if role_perms_match:
            perms_text = role_perms_match.group(1)
            
            # عد الأدوار
            roles = re.findall(r"'(\w+)':\s*\[", perms_text)
            print_success(f"Found {len(roles)} roles defined")
            
            # عد الصلاحيات الفريدة
            all_perms = re.findall(r"'(\w+)'", perms_text)
            unique_perms = set(all_perms) - set(roles)  # استبعاد أسماء الأدوار
            print_success(f"Found {len(unique_perms)} unique permissions")
            
            # عرض الأدوار
            print(f"\n{Colors.BLUE}Roles:{Colors.END}")
            for role in roles:
                print(f"  - {role}")
            
            return True
        else:
            print_error("Could not find ROLE_PERMISSIONS definition")
            return False
            
    except Exception as e:
        print_error(f"Error checking permissions: {str(e)}")
        return False

def generate_report():
    """إنشاء تقرير شامل"""
    print_header("5️⃣  Generating Report")
    
    report = {
        'timestamp': '',
        'rbac_files': 0,
        'api_files': 0,
        'decorated_endpoints': 0,
        'roles': 0,
        'permissions': 0,
        'issues': []
    }
    
    # Count files
    rbac_files = ['auth_rbac_decorator.py', 'rbac_migration.py', 'apply_rbac_bulk.py']
    report['rbac_files'] = sum(1 for f in rbac_files if os.path.exists(f))
    
    api_files = list(Path('.').glob('*_api.py'))
    report['api_files'] = len(api_files)
    
    # Count decorated endpoints
    for api_file in api_files:
        try:
            with open(api_file, 'r', encoding='utf-8') as f:
                content = f.read()
            report['decorated_endpoints'] += len(re.findall(r'@check_permission\(', content))
        except:
            pass
    
    # Summary
    print(f"\n{Colors.CYAN}{'=' * 60}{Colors.END}")
    print(f"{Colors.CYAN}📊 RBAC System Status Report{Colors.END}")
    print(f"{Colors.CYAN}{'=' * 60}{Colors.END}\n")
    
    print(f"📁 RBAC Files: {report['rbac_files']}/3")
    print(f"📄 API Files: {report['api_files']}")
    print(f"🔒 Decorated Endpoints: {report['decorated_endpoints']}")
    
    # Health status
    if report['rbac_files'] == 3 and report['api_files'] > 0 and report['decorated_endpoints'] > 0:
        print(f"\n{Colors.GREEN}✅ RBAC System Status: HEALTHY{Colors.END}")
    else:
        print(f"\n{Colors.YELLOW}⚠️  RBAC System Status: INCOMPLETE{Colors.END}")
    
    print(f"\n{Colors.CYAN}{'=' * 60}{Colors.END}\n")

def main():
    """الدالة الرئيسية"""
    print("\n")
    print(f"{Colors.CYAN}{'=' * 60}{Colors.END}")
    print(f"{Colors.CYAN}🔍 RBAC System Verification{Colors.END}")
    print(f"{Colors.CYAN}{'=' * 60}{Colors.END}")
    
    results = []
    
    # Run all checks
    results.append(check_rbac_files())
    results.append(check_api_files())
    results.append(check_decorator_patterns())
    results.append(check_permissions_defined())
    
    # Generate report
    generate_report()
    
    # Final result
    if all(results):
        print(f"{Colors.GREEN}✅ All checks passed!{Colors.END}\n")
        return True
    else:
        print(f"{Colors.YELLOW}⚠️  Some checks failed. Review warnings above.{Colors.END}\n")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
