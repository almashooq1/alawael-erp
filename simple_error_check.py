#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import ast

def check_syntax(filename):
    """فحص syntax للملف"""
    if not os.path.exists(filename):
        return False, f"الملف {filename} غير موجود"
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        ast.parse(content)
        return True, "صحيح"
    except SyntaxError as e:
        return False, f"خطأ في السطر {e.lineno}: {e.msg}"
    except Exception as e:
        return False, str(e)

# فحص الملفات الأساسية
files_to_check = [
    'models.py',
    'app.py', 
    'database.py',
    'learning_difficulties_scoring.py',
    'comprehensive_rehabilitation_enhanced_api.py'
]

print("فحص الأخطاء البرمجية:")
print("="*40)

all_good = True
for filename in files_to_check:
    is_ok, message = check_syntax(filename)
    status = "✅" if is_ok else "❌"
    print(f"{status} {filename}: {message}")
    if not is_ok:
        all_good = False

print("="*40)
if all_good:
    print("🎉 جميع الملفات صحيحة!")
else:
    print("⚠️ يوجد أخطاء تحتاج إصلاح")
