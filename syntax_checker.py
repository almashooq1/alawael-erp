#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
أداة فحص الأخطاء البرمجية الشاملة
Comprehensive Syntax and Error Checker
"""

import os
import ast
import sys
import importlib.util
from pathlib import Path

def check_syntax_errors(file_path):
    """فحص أخطاء Syntax"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source = f.read()
        
        # فحص syntax باستخدام ast
        ast.parse(source)
        return True, "✅ لا توجد أخطاء syntax"
    except SyntaxError as e:
        return False, f"❌ خطأ syntax في السطر {e.lineno}: {e.msg}"
    except Exception as e:
        return False, f"❌ خطأ في قراءة الملف: {str(e)}"

def check_import_errors(file_path):
    """فحص أخطاء الاستيراد"""
    try:
        spec = importlib.util.spec_from_file_location("module", file_path)
        if spec is None:
            return False, "❌ لا يمكن تحميل الملف"
        
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return True, "✅ لا توجد أخطاء استيراد"
    except ImportError as e:
        return False, f"❌ خطأ استيراد: {str(e)}"
    except Exception as e:
        return False, f"❌ خطأ في التحميل: {str(e)}"

def check_python_files():
    """فحص جميع ملفات Python في المشروع"""
    python_files = [
        'models.py',
        'app.py', 
        'database.py',
        'learning_difficulties_scoring.py',
        'rehabilitation_programs_models.py',
        'comprehensive_rehabilitation_enhanced_api.py',
        'ai_services.py',
        'test_app.py'
    ]
    
    results = []
    
    for file_name in python_files:
        if os.path.exists(file_name):
            print(f"\n🔍 فحص ملف: {file_name}")
            
            # فحص syntax
            syntax_ok, syntax_msg = check_syntax_errors(file_name)
            print(f"   Syntax: {syntax_msg}")
            
            # فحص الاستيراد (فقط للملفات الأساسية)
            if file_name in ['models.py', 'app.py', 'database.py']:
                import_ok, import_msg = check_import_errors(file_name)
                print(f"   Import: {import_msg}")
                results.append({
                    'file': file_name,
                    'syntax': syntax_ok,
                    'import': import_ok,
                    'syntax_msg': syntax_msg,
                    'import_msg': import_msg
                })
            else:
                results.append({
                    'file': file_name,
                    'syntax': syntax_ok,
                    'import': True,  # تخطي فحص الاستيراد
                    'syntax_msg': syntax_msg,
                    'import_msg': "تم التخطي"
                })
        else:
            print(f"⚠️  الملف غير موجود: {file_name}")
            results.append({
                'file': file_name,
                'syntax': False,
                'import': False,
                'syntax_msg': "الملف غير موجود",
                'import_msg': "الملف غير موجود"
            })
    
    return results

def generate_report(results):
    """إنشاء تقرير شامل"""
    print("\n" + "="*60)
    print("📊 تقرير فحص الأخطاء البرمجية")
    print("="*60)
    
    total_files = len(results)
    syntax_errors = sum(1 for r in results if not r['syntax'])
    import_errors = sum(1 for r in results if not r['import'])
    
    print(f"\n📈 الإحصائيات:")
    print(f"   إجمالي الملفات: {total_files}")
    print(f"   أخطاء Syntax: {syntax_errors}")
    print(f"   أخطاء Import: {import_errors}")
    
    if syntax_errors == 0 and import_errors == 0:
        print(f"\n🎉 ممتاز! لا توجد أخطاء برمجية في النظام")
    else:
        print(f"\n⚠️  يوجد أخطاء تحتاج إصلاح:")
        
        for result in results:
            if not result['syntax'] or not result['import']:
                print(f"\n❌ {result['file']}:")
                if not result['syntax']:
                    print(f"   - {result['syntax_msg']}")
                if not result['import']:
                    print(f"   - {result['import_msg']}")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    print("🚀 بدء فحص الأخطاء البرمجية...")
    results = check_python_files()
    generate_report(results)
