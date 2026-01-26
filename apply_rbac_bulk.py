#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سكريبت آلي لتطبيق نظام RBAC المركزي على جميع ملفات API
Automated RBAC Application Script for All API Files
"""

import os
import re
import glob
from pathlib import Path

# قائمة ملفات API للتحديث
API_FILES = [
    'vehicles_api.py',
    'ai_chatbot_api.py',
    'elearning_api.py',
    'appointments_calendar_api.py',
    'goals_bank_api.py',
    'gamification_api.py',
    'documents_api.py',
    'reports_api.py',
    'inventory_api.py',
    'projects_api.py',
    'tasks_api.py',
    'notifications_api.py'
]

# Import statement للإضافة
RBAC_IMPORT = """from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit
)"""

# قائمة التعيينات لـ permissions حسب endpoint patterns
PERMISSION_MAPPING = {
    # GET endpoints
    r"@\w+\.route\(['\"].*['\"],\s*methods=\['GET'\]\)\s*@jwt_required\(\)\s*def\s+(\w+)": {
        'list': 'view_{module}',
        'get': 'view_{module}',
        'dashboard': 'view_dashboard',
        'stats': 'view_stats',
        'report': 'view_reports'
    },
    # POST endpoints
    r"@\w+\.route\(['\"].*['\"],\s*methods=\['POST'\]\)\s*@jwt_required\(\)\s*def\s+(\w+)": {
        'create': 'manage_{module}',
        'add': 'manage_{module}',
        'send': 'send_{module}',
        'generate': 'generate_{module}'
    },
    # PUT/PATCH endpoints
    r"@\w+\.route\(['\"].*['\"],\s*methods=\['(PUT|PATCH)'\]\)\s*@jwt_required\(\)\s*def\s+(\w+)": {
        'update': 'manage_{module}',
        'edit': 'manage_{module}',
        'modify': 'manage_{module}'
    },
    # DELETE endpoints
    r"@\w+\.route\(['\"].*['\"],\s*methods=\['DELETE'\]\)\s*@jwt_required\(\)\s*def\s+(\w+)": {
        'delete': 'manage_{module}',
        'remove': 'manage_{module}'
    }
}

def find_api_files(directory='.'):
    """البحث عن جميع ملفات API"""
    api_files = []
    for pattern in ['*_api.py', '*_blueprint.py']:
        files = glob.glob(os.path.join(directory, pattern))
        api_files.extend(files)
    return api_files

def has_rbac_import(content):
    """التحقق من وجود RBAC import"""
    return 'from auth_rbac_decorator import' in content

def add_rbac_import(content):
    """إضافة RBAC import إلى الملف"""
    # البحث عن آخر import statement
    import_lines = []
    other_lines = []
    in_imports = True
    
    for line in content.split('\n'):
        if line.strip().startswith(('from ', 'import ')) and in_imports:
            import_lines.append(line)
        else:
            if line.strip() and not line.strip().startswith('#'):
                in_imports = False
            other_lines.append(line)
    
    # إضافة RBAC import
    import_lines.append(RBAC_IMPORT)
    
    return '\n'.join(import_lines) + '\n' + '\n'.join(other_lines)

def extract_module_name(filename):
    """استخراج اسم الوحدة من اسم الملف"""
    # إزالة _api.py أو _blueprint.py
    module = filename.replace('_api.py', '').replace('_blueprint.py', '')
    return module

def find_endpoints(content):
    """البحث عن جميع endpoints في الملف"""
    # Pattern للبحث عن endpoints
    endpoint_pattern = r'@\w+\.route\([\'\"](.*?)[\'\"],\s*methods=\[(.*?)\]\)\s*@jwt_required\(\)\s*def\s+(\w+)\('
    
    matches = re.finditer(endpoint_pattern, content, re.MULTILINE | re.DOTALL)
    
    endpoints = []
    for match in matches:
        route = match.group(1)
        methods = match.group(2)
        function_name = match.group(3)
        
        endpoints.append({
            'route': route,
            'methods': [m.strip().strip("'\"") for m in methods.split(',')],
            'function': function_name,
            'start': match.start(),
            'end': match.end()
        })
    
    return endpoints

def determine_permission(function_name, method, module_name):
    """تحديد الصلاحية المناسبة"""
    function_lower = function_name.lower()
    
    if method == 'GET':
        if 'list' in function_lower or 'get_all' in function_lower:
            return f'view_{module_name}'
        elif 'dashboard' in function_lower:
            return 'view_dashboard'
        elif 'stats' in function_lower or 'statistics' in function_lower:
            return 'view_stats'
        elif 'report' in function_lower:
            return 'view_reports'
        else:
            return f'view_{module_name}'
    
    elif method == 'POST':
        if 'create' in function_lower or 'add' in function_lower:
            return f'manage_{module_name}'
        elif 'send' in function_lower:
            return f'send_{module_name}'
        elif 'generate' in function_lower:
            return f'generate_{module_name}'
        else:
            return f'manage_{module_name}'
    
    elif method in ['PUT', 'PATCH']:
        return f'manage_{module_name}'
    
    elif method == 'DELETE':
        return f'manage_{module_name}'
    
    return f'access_{module_name}'

def update_endpoint_decorators(content, filename):
    """تحديث decorators لجميع endpoints"""
    module_name = extract_module_name(os.path.basename(filename))
    
    # البحث عن patterns
    pattern = r'(@\w+\.route\([\'\"](.*?)[\'\"],\s*methods=\[(.*?)\]\)\s*)(@jwt_required\(\)\s*)(def\s+\w+\()'
    
    def replace_decorator(match):
        route_decorator = match.group(1)
        jwt_decorator = match.group(4)
        function_def = match.group(5)
        methods = [m.strip().strip("'\"") for m in match.group(3).split(',')]
        
        # تحديد الصلاحية
        function_name = function_def.replace('def ', '').replace('(', '').strip()
        permission = determine_permission(function_name, methods[0], module_name)
        
        # بناء decorators جديدة
        new_decorators = route_decorator + jwt_decorator
        new_decorators += f"@check_permission('{permission}')\n"
        
        # إضافة guard_payload_size للـ POST/PUT/PATCH
        if any(m in methods for m in ['POST', 'PUT', 'PATCH']):
            new_decorators += "@guard_payload_size()\n"
        
        # إضافة log_audit
        action_name = function_name.upper()
        new_decorators += f"@log_audit('{action_name}')\n"
        
        return new_decorators + function_def
    
    updated_content = re.sub(pattern, replace_decorator, content, flags=re.MULTILINE | re.DOTALL)
    return updated_content

def process_api_file(filepath):
    """معالجة ملف API واحد"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # التحقق من وجود RBAC import
        if not has_rbac_import(content):
            print(f"  إضافة RBAC import...")
            content = add_rbac_import(content)
        else:
            print(f"  ✓ RBAC import موجود مسبقاً")
        
        # تحديث endpoints
        print(f"  تحديث endpoints...")
        content = update_endpoint_decorators(content, filepath)
        
        # حفظ الملف
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"  ✅ تم التحديث بنجاح")
        return True
        
    except Exception as e:
        print(f"  ❌ خطأ: {str(e)}")
        return False

def main():
    """الدالة الرئيسية"""
    print("=" * 60)
    print("تطبيق نظام RBAC على جميع ملفات API")
    print("=" * 60)
    print()
    
    # البحث عن ملفات API
    current_dir = os.path.dirname(os.path.abspath(__file__))
    api_files = find_api_files(current_dir)
    
    print(f"تم العثور على {len(api_files)} ملف API")
    print()
    
    # معالجة كل ملف
    success_count = 0
    failed_count = 0
    
    for api_file in api_files:
        filename = os.path.basename(api_file)
        print(f"📄 معالجة: {filename}")
        
        if process_api_file(api_file):
            success_count += 1
        else:
            failed_count += 1
        
        print()
    
    # ملخص
    print("=" * 60)
    print("الملخص:")
    print(f"  ✅ نجح: {success_count}")
    print(f"  ❌ فشل: {failed_count}")
    print(f"  📊 إجمالي: {len(api_files)}")
    print("=" * 60)

if __name__ == '__main__':
    main()
