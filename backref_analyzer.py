#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
محلل العلاقات المكررة - تحديد المشاكل المحددة في models.py
"""

import re
from collections import defaultdict

def analyze_models_file():
    """تحليل ملف models.py للعثور على العلاقات المكررة"""
    
    with open('models.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    
    # البحث عن جميع العلاقات مع السياق
    relationships = []
    current_class = None
    
    for i, line in enumerate(lines):
        # تحديد الكلاس الحالي
        if line.strip().startswith('class ') and '(db.Model)' in line:
            current_class = line.strip().split()[1].split('(')[0]
        
        # البحث عن العلاقات
        if 'db.relationship(' in line and 'backref=' in line:
            backref_match = re.search(r"backref='([^']+)'", line)
            relationship_match = re.search(r"(\w+)\s*=\s*db\.relationship", line)
            
            if backref_match and relationship_match:
                relationships.append({
                    'line_num': i + 1,
                    'class': current_class,
                    'relationship': relationship_match.group(1),
                    'backref': backref_match.group(1),
                    'full_line': line.strip()
                })
    
    # تجميع العلاقات المكررة
    backref_groups = defaultdict(list)
    for rel in relationships:
        backref_groups[rel['backref']].append(rel)
    
    # العثور على المكررات
    duplicates = {k: v for k, v in backref_groups.items() if len(v) > 1}
    
    print("🔍 تحليل العلاقات في models.py")
    print("=" * 50)
    print(f"إجمالي العلاقات: {len(relationships)}")
    print(f"العلاقات المكررة: {len(duplicates)}")
    
    if duplicates:
        print("\n❌ العلاقات المكررة:")
        for backref, relations in duplicates.items():
            print(f"\n🔄 backref='{backref}' ({len(relations)} مرات):")
            for rel in relations:
                print(f"  - Line {rel['line_num']}: {rel['class']}.{rel['relationship']}")
                print(f"    {rel['full_line']}")
    
    return duplicates

def suggest_fixes(duplicates):
    """اقتراح إصلاحات للعلاقات المكررة"""
    print("\n🛠️ الإصلاحات المقترحة:")
    print("=" * 50)
    
    fixes = []
    
    for backref, relations in duplicates.items():
        print(f"\n🔧 إصلاح '{backref}':")
        
        for i, rel in enumerate(relations):
            if i == 0:
                # الأول يبقى كما هو
                print(f"  ✅ {rel['class']}.{rel['relationship']} - يبقى: '{backref}'")
            else:
                # الباقي يحتاج تغيير
                new_backref = f"{rel['class'].lower()}_{backref}"
                print(f"  🔄 {rel['class']}.{rel['relationship']} - يتغير إلى: '{new_backref}'")
                
                fixes.append({
                    'line_num': rel['line_num'],
                    'old_backref': backref,
                    'new_backref': new_backref,
                    'class': rel['class'],
                    'relationship': rel['relationship'],
                    'old_line': rel['full_line'],
                    'new_line': rel['full_line'].replace(f"backref='{backref}'", f"backref='{new_backref}'")
                })
    
    return fixes

if __name__ == "__main__":
    duplicates = analyze_models_file()
    if duplicates:
        suggest_fixes(duplicates)
    else:
        print("✅ لا توجد علاقات مكررة!")
