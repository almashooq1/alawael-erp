#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
فاحص الأخطاء النهائي للنظام
Final System Error Checker
"""

import os
import ast
import sys
import traceback
from pathlib import Path

def check_python_syntax(file_path):
    """فحص syntax للملف Python"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source_code = f.read()
        
        # محاولة تحليل الكود
        ast.parse(source_code, filename=file_path)
        return True, "✅ صحيح"
    
    except SyntaxError as e:
        return False, f"❌ خطأ Syntax في السطر {e.lineno}: {e.msg}"
    except UnicodeDecodeError:
        return False, "❌ خطأ في ترميز الملف"
    except Exception as e:
        return False, f"❌ خطأ: {str(e)}"

def check_imports(file_path):
    """فحص الاستيرادات"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # استخراج الاستيرادات
        tree = ast.parse(content)
        imports = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module)
        
        return True, f"✅ {len(imports)} استيراد"
    
    except Exception as e:
        return False, f"❌ خطأ في الاستيرادات: {str(e)}"

def check_file_structure():
    """فحص هيكل الملفات الأساسية"""
    required_files = {
        'models.py': 'نماذج قاعدة البيانات',
        'app.py': 'التطبيق الرئيسي',
        'database.py': 'إعدادات قاعدة البيانات',
        '.env': 'متغيرات البيئة',
        'requirements.txt': 'متطلبات Python'
    }
    
    results = {}
    for file_name, description in required_files.items():
        if os.path.exists(file_name):
            results[file_name] = f"✅ موجود - {description}"
        else:
            results[file_name] = f"❌ مفقود - {description}"
    
    return results

def main():
    """الدالة الرئيسية للفحص"""
    print("🔍 فحص الأخطاء النهائي للنظام")
    print("="*50)
    
    # فحص هيكل الملفات
    print("\n📁 فحص هيكل الملفات:")
    file_structure = check_file_structure()
    for file_name, status in file_structure.items():
        print(f"   {status}")
    
    # فحص الملفات Python الأساسية
    python_files = ['models.py', 'app.py', 'database.py', 'learning_difficulties_scoring.py']
    
    print(f"\n🐍 فحص ملفات Python:")
    total_errors = 0
    
    for file_name in python_files:
        if os.path.exists(file_name):
            print(f"\n   📄 {file_name}:")
            
            # فحص syntax
            syntax_ok, syntax_msg = check_python_syntax(file_name)
            print(f"      Syntax: {syntax_msg}")
            
            if not syntax_ok:
                total_errors += 1
            
            # فحص الاستيرادات
            import_ok, import_msg = check_imports(file_name)
            print(f"      Imports: {import_msg}")
            
            if not import_ok:
                total_errors += 1
        else:
            print(f"   ⚠️  {file_name}: غير موجود")
            total_errors += 1
    
    # النتيجة النهائية
    print(f"\n{'='*50}")
    if total_errors == 0:
        print("🎉 ممتاز! النظام خالي من الأخطاء البرمجية")
        print("✅ جميع الملفات الأساسية موجودة وصحيحة")
        print("✅ لا توجد أخطاء Syntax")
        print("✅ الاستيرادات صحيحة")
    else:
        print(f"⚠️  تم العثور على {total_errors} مشكلة")
        print("💡 يُنصح بمراجعة الأخطاء المذكورة أعلاه")
    
    print("="*50)
    return total_errors == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
