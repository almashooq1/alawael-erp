#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Apply RBAC to Backend Routes
تطبيق نظام RBAC على جميع routes الـ backend

This script automatically applies RBAC decorators to backend route files
"""

import os
import re
from pathlib import Path

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*70}{Colors.END}")
    print(f"{Colors.CYAN}{Colors.BOLD}{text:^70}{Colors.END}")
    print(f"{Colors.CYAN}{Colors.BOLD}{'='*70}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.END}")

def has_rbac_import(content):
    """Check if file already has RBAC import"""
    return 'from auth_rbac_decorator import' in content or 'from lib.auth_rbac_decorator import' in content

def add_rbac_imports(content):
    """Add RBAC imports after existing imports"""
    
    # Find the last import statement
    import_lines = []
    for i, line in enumerate(content.split('\n')):
        if line.startswith('import ') or line.startswith('from '):
            import_lines.append(i)
    
    if not import_lines:
        return content
    
    last_import_line = import_lines[-1]
    lines = content.split('\n')
    
    # Check if already has RBAC import
    for i in range(max(0, last_import_line - 5), min(len(lines), last_import_line + 5)):
        if 'auth_rbac_decorator' in lines[i]:
            return content
    
    # Add RBAC import after the last regular import
    rbac_import = "from lib.auth_rbac_decorator import check_permission, require_role, log_audit, guard_payload_size, validate_json"
    
    lines.insert(last_import_line + 1, rbac_import)
    return '\n'.join(lines)

def determine_permission(func_name, method):
    """Determine appropriate permission based on function name and method"""
    func_lower = func_name.lower()
    
    if method == 'GET':
        if 'list' in func_lower or func_lower.endswith('s'):
            return 'view_' + func_lower.replace('_list', '').replace('_get', '').replace('get_', '')
        return 'view_' + func_lower.replace('get_', '')
    
    elif method == 'POST' or method == 'PUT' or method == 'PATCH':
        if 'create' in func_lower:
            resource = func_lower.replace('create_', '')
            return 'manage_' + (resource if resource else 'resources')
        elif 'update' in func_lower:
            resource = func_lower.replace('update_', '')
            return 'manage_' + (resource if resource else 'resources')
        elif 'delete' in func_lower:
            return 'manage_resources'
        else:
            resource = func_lower.replace('_', '')
            return 'manage_' + (resource if resource else 'resources')
    
    elif method == 'DELETE':
        return 'manage_resources'
    
    return 'view_dashboard'

def update_route_decorators(content):
    """Update route decorators with RBAC"""
    
    # Pattern to find routes
    route_pattern = r"(@\w+\.route\(['\"]([^'\"]+)['\"]\s*,\s*methods=\[(['\"]?([A-Z]+)['\"]?[,\s'\"A-Z]*)\]\s*\)\s*)(?:@jwt_required\(\)\s*)?(?:@\w+\([^)]*\)\s*)*(def\s+(\w+)\s*\([^)]*\):)"
    
    def replace_route(match):
        full_route = match.group(1)
        path = match.group(2)
        methods_str = match.group(3)
        first_method = match.group(4)
        full_def = match.group(5)
        func_name = match.group(6)
        
        # Extract all methods
        methods = re.findall(r"['\"]([A-Z]+)['\"]", methods_str)
        if not methods:
            methods = [first_method]
        
        method = methods[0]
        
        # Determine permission
        permission = determine_permission(func_name, method)
        
        # Build decorator stack
        decorators = []
        
        # Add @jwt_required if not already present
        if '@jwt_required' not in content:
            decorators.append("@jwt_required()")
        
        # Add @check_permission
        decorators.append(f"@check_permission('{permission}')")
        
        # Add additional decorators based on method
        if method in ['POST', 'PUT', 'PATCH']:
            decorators.append("@guard_payload_size()")
            if method == 'POST':
                decorators.append("@validate_json()")
        
        # Add audit logging
        audit_action = f"{method}_{func_name.upper()}"
        decorators.append(f"@log_audit('{audit_action}')")
        
        # Build result
        result = full_route + "\n" + "\n".join(decorators) + "\n" + full_def
        return result
    
    # Apply replacements
    updated = re.sub(route_pattern, replace_route, content, flags=re.MULTILINE | re.DOTALL)
    
    return updated if updated != content else content

def process_route_file(filepath):
    """Process a single route file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Skip if already has RBAC
        if has_rbac_import(content):
            print_warning(f"Already has RBAC: {os.path.basename(filepath)}")
            return False
        
        # Add imports
        content = add_rbac_imports(content)
        
        # Update decorators
        content = update_route_decorators(content)
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print_success(f"Updated: {os.path.basename(filepath)}")
        return True
        
    except Exception as e:
        print_error(f"Error processing {os.path.basename(filepath)}: {str(e)}")
        return False

def main():
    print_header("🚀 Applying RBAC to Backend Routes")
    
    # Find all route files
    routes_dir = Path('backend/routes')
    if not routes_dir.exists():
        print_error(f"Routes directory not found: {routes_dir}")
        return
    
    route_files = sorted(list(routes_dir.glob('*.py')))
    
    print_info(f"Found {len(route_files)} route files\n")
    
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for route_file in route_files:
        result = process_route_file(str(route_file))
        if result is True:
            success_count += 1
        elif result is False:
            skip_count += 1
        else:
            error_count += 1
    
    # Print summary
    print_header("📊 Summary")
    
    print(f"✅ Updated:  {success_count}")
    print(f"⏭️  Skipped:   {skip_count}")
    print(f"❌ Errors:    {error_count}")
    print(f"📁 Total:     {len(route_files)}")
    
    print(f"\n{Colors.GREEN}Backend RBAC Application Complete!{Colors.END}\n")

if __name__ == '__main__':
    main()
