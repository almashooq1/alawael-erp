#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
أداة إصلاح العلاقات المكررة في نماذج قاعدة البيانات
تحديد وإصلاح جميع backref المكررة في ملف models.py
"""

import re
import os
from collections import defaultdict

def analyze_backref_duplicates(file_path):
    """تحليل الـ backref المكررة في الملف"""
    print("🔍 تحليل العلاقات المكررة في models.py...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # البحث عن جميع backref في الملف
    backref_pattern = r"backref='([^']+)'"
    matches = re.findall(backref_pattern, content)
    
    # حساب التكرارات
    backref_counts = defaultdict(int)
    for backref in matches:
        backref_counts[backref] += 1
    
    # العثور على المكررات
    duplicates = {k: v for k, v in backref_counts.items() if v > 1}
    
    print(f"📊 إجمالي العلاقات: {len(matches)}")
    print(f"🔄 العلاقات المكررة: {len(duplicates)}")
    
    if duplicates:
        print("\n❌ العلاقات المكررة الموجودة:")
        for backref, count in duplicates.items():
            print(f"  - '{backref}': {count} مرات")
    
    return duplicates, content

def get_backref_context(content, backref_name):
    """الحصول على سياق كل backref مكرر"""
    lines = content.split('\n')
    contexts = []
    
    for i, line in enumerate(lines):
        if f"backref='{backref_name}'" in line:
            # البحث عن اسم الكلاس
            class_name = None
            for j in range(i, max(0, i-20), -1):
                if lines[j].strip().startswith('class ') and '(db.Model)' in lines[j]:
                    class_name = lines[j].strip().split()[1].split('(')[0]
                    break
            
            # البحث عن اسم العلاقة
            relationship_match = re.search(r"(\w+)\s*=\s*db\.relationship", line)
            relationship_name = relationship_match.group(1) if relationship_match else "unknown"
            
            contexts.append({
                'line_number': i + 1,
                'line': line.strip(),
                'class_name': class_name,
                'relationship_name': relationship_name
            })
    
    return contexts

def generate_fixes(duplicates, content):
    """توليد الإصلاحات المقترحة"""
    fixes = []
    
    for backref_name, count in duplicates.items():
        contexts = get_backref_context(content, backref_name)
        
        print(f"\n🔧 إصلاح العلاقة المكررة: '{backref_name}'")
        
        for i, context in enumerate(contexts):
            if i == 0:
                # الأول يبقى كما هو
                print(f"  ✅ {context['class_name']}.{context['relationship_name']} - يبقى: '{backref_name}'")
            else:
                # الباقي يحتاج تغيير
                new_backref = f"{context['class_name'].lower()}_{backref_name}"
                print(f"  🔄 {context['class_name']}.{context['relationship_name']} - يتغير إلى: '{new_backref}'")
                
                fixes.append({
                    'old_line': context['line'],
                    'new_line': context['line'].replace(f"backref='{backref_name}'", f"backref='{new_backref}'"),
                    'class_name': context['class_name'],
                    'relationship_name': context['relationship_name']
                })
    
    return fixes

def apply_fixes(file_path, fixes):
    """تطبيق الإصلاحات على الملف"""
    print(f"\n🛠️ تطبيق {len(fixes)} إصلاح...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # إنشاء نسخة احتياطية
    backup_path = file_path + '.backup'
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"💾 تم إنشاء نسخة احتياطية: {backup_path}")
    
    # تطبيق الإصلاحات
    for fix in fixes:
        if fix['old_line'] in content:
            content = content.replace(fix['old_line'], fix['new_line'])
            print(f"  ✅ تم إصلاح: {fix['class_name']}.{fix['relationship_name']}")
        else:
            print(f"  ❌ لم يتم العثور على: {fix['old_line']}")
    
    # حفظ الملف المحدث
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ تم حفظ الملف المحدث")

def verify_fixes(file_path):
    """التحقق من نجاح الإصلاحات"""
    print("\n🔍 التحقق من نجاح الإصلاحات...")
    
    duplicates, _ = analyze_backref_duplicates(file_path)
    
    if not duplicates:
        print("✅ تم إصلاح جميع العلاقات المكررة بنجاح!")
        return True
    else:
        print("❌ لا تزال هناك علاقات مكررة:")
        for backref, count in duplicates.items():
            print(f"  - '{backref}': {count} مرات")
        return False

def main():
    """الدالة الرئيسية"""
    file_path = "models.py"
    
    if not os.path.exists(file_path):
        print(f"❌ الملف غير موجود: {file_path}")
        return
    
    print("🚀 بدء إصلاح العلاقات المكررة في models.py")
    print("=" * 60)
    
    # تحليل المشكلة
    duplicates, content = analyze_backref_duplicates(file_path)
    
    if not duplicates:
        print("✅ لا توجد علاقات مكررة!")
        return
    
    # توليد الإصلاحات
    fixes = generate_fixes(duplicates, content)
    
    if not fixes:
        print("❌ لم يتم توليد أي إصلاحات")
        return
    
    # تطبيق الإصلاحات
    apply_fixes(file_path, fixes)
    
    # التحقق من النتائج
    success = verify_fixes(file_path)
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 تم إصلاح جميع العلاقات المكررة بنجاح!")
    else:
        print("⚠️ قد تحتاج بعض العلاقات إلى إصلاح يدوي")

if __name__ == "__main__":
    main()
