#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
فاحص الأخطاء البرمجية المتقدم
Advanced Error Checker for Python Files
"""

import os
import ast
import traceback
from pathlib import Path

def check_file_syntax(filepath):
    """فحص syntax للملف"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # محاولة تحليل الملف
        ast.parse(content, filename=filepath)
        return True, "✅ صحيح"
    
    except SyntaxError as e:
        return False, f"❌ خطأ Syntax في السطر {e.lineno}: {e.msg}"
    except Exception as e:
        return False, f"❌ خطأ: {str(e)}"

def check_common_issues(filepath):
    """فحص المشاكل الشائعة"""
    issues = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines, 1):
            # فحص المسافات والتبويب المختلط
            if '\t' in line and '    ' in line:
                issues.append(f"السطر {i}: خلط بين المسافات والتبويب")
            
            # فحص الأقواس غير المتطابقة
            open_parens = line.count('(') - line.count(')')
            open_brackets = line.count('[') - line.count(']')
            open_braces = line.count('{') - line.count('}')
            
            if open_parens != 0 or open_brackets != 0 or open_braces != 0:
                if not line.strip().endswith(('\\', ',')):
                    issues.append(f"السطر {i}: أقواس غير متطابقة محتملة")
    
    except Exception as e:
        issues.append(f"خطأ في فحص الملف: {str(e)}")
    
    return issues

def main():
    """الدالة الرئيسية"""
    print("🔍 فحص الأخطاء البرمجية في النظام")
    print("="*50)
    
    # الملفات المهمة للفحص
    important_files = [
        'models.py',
        'app.py',
        'database.py',
        'learning_difficulties_scoring.py',
        'rehabilitation_programs_models.py'
    ]
    
    total_errors = 0
    
    for filename in important_files:
        if os.path.exists(filename):
            print(f"\n📁 فحص: {filename}")
            
            # فحص syntax
            syntax_ok, syntax_msg = check_file_syntax(filename)
            print(f"   Syntax: {syntax_msg}")
            
            if not syntax_ok:
                total_errors += 1
            
            # فحص المشاكل الشائعة
            issues = check_common_issues(filename)
            if issues:
                print("   مشاكل إضافية:")
                for issue in issues[:3]:  # أول 3 مشاكل فقط
                    print(f"   - {issue}")
                total_errors += len(issues)
        else:
            print(f"\n⚠️  الملف غير موجود: {filename}")
    
    print(f"\n{'='*50}")
    if total_errors == 0:
        print("🎉 ممتاز! لا توجد أخطاء برمجية واضحة")
    else:
        print(f"⚠️  تم العثور على {total_errors} مشكلة تحتاج مراجعة")
    
    print("="*50)

if __name__ == "__main__":
    main()
