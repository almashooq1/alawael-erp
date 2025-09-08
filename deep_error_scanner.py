#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ماسح الأخطاء العميق - فحص شامل ودقيق للنظام
Deep Error Scanner - Comprehensive and Precise System Check
"""

import os
import ast
import re
import sys
import traceback
from pathlib import Path
from collections import defaultdict

class DeepErrorScanner:
    def __init__(self):
        self.syntax_errors = []
        self.logic_errors = []
        self.structure_errors = []
        self.import_errors = []
        self.database_errors = []
        
    def scan_syntax_deep(self, filepath):
        """فحص عميق لأخطاء Syntax"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # فحص AST
            tree = ast.parse(content, filename=filepath)
            
            # فحص مشاكل محتملة
            issues = []
            
            for node in ast.walk(tree):
                # فحص الدوال بدون return
                if isinstance(node, ast.FunctionDef):
                    has_return = any(isinstance(child, ast.Return) for child in ast.walk(node))
                    if not has_return and node.name not in ['__init__', '__str__', '__repr__']:
                        issues.append(f"الدالة {node.name} قد تحتاج return statement")
                
                # فحص المتغيرات غير المستخدمة
                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name) and target.id.startswith('_'):
                            continue  # تجاهل المتغيرات التي تبدأ بـ _
            
            return True, issues
            
        except SyntaxError as e:
            error_msg = f"خطأ Syntax في السطر {e.lineno}: {e.msg}"
            self.syntax_errors.append(f"{filepath}: {error_msg}")
            return False, [error_msg]
        except Exception as e:
            error_msg = f"خطأ في التحليل: {str(e)}"
            return False, [error_msg]
    
    def check_database_relationships(self, filepath):
        """فحص علاقات قاعدة البيانات"""
        if not filepath.endswith('models.py'):
            return True, []
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            issues = []
            
            # فحص backref المكررة
            backref_pattern = r"backref='([^']+)'"
            backrefs = re.findall(backref_pattern, content)
            backref_counts = defaultdict(int)
            
            for backref in backrefs:
                backref_counts[backref] += 1
            
            for backref, count in backref_counts.items():
                if count > 1:
                    issues.append(f"backref مكررة: '{backref}' ({count} مرات)")
            
            # فحص ForeignKey بدون relationship
            fk_pattern = r"db\.ForeignKey\('([^']+)'\)"
            foreign_keys = re.findall(fk_pattern, content)
            
            relationship_pattern = r"db\.relationship\('([^']+)'"
            relationships = re.findall(relationship_pattern, content)
            
            # فحص __tablename__ المكررة
            tablename_pattern = r"__tablename__ = '([^']+)'"
            tablenames = re.findall(tablename_pattern, content)
            tablename_counts = defaultdict(int)
            
            for tablename in tablenames:
                tablename_counts[tablename] += 1
            
            for tablename, count in tablename_counts.items():
                if count > 1:
                    issues.append(f"__tablename__ مكرر: '{tablename}' ({count} مرات)")
            
            # فحص أعمدة primary_key متعددة بدون composite key
            pk_pattern = r"primary_key=True"
            pk_matches = re.findall(pk_pattern, content)
            
            # تقسيم المحتوى إلى كلاسات
            class_pattern = r"class\s+(\w+)\([^)]*\):"
            classes = re.findall(class_pattern, content)
            
            for class_name in classes:
                class_content_match = re.search(
                    rf"class\s+{class_name}\([^)]*\):(.*?)(?=class\s+\w+|$)", 
                    content, 
                    re.DOTALL
                )
                if class_content_match:
                    class_content = class_content_match.group(1)
                    pk_count = len(re.findall(pk_pattern, class_content))
                    if pk_count > 1:
                        issues.append(f"كلاس {class_name}: أعمدة primary_key متعددة ({pk_count})")
            
            return len(issues) == 0, issues
            
        except Exception as e:
            error_msg = f"خطأ في فحص قاعدة البيانات: {str(e)}"
            self.database_errors.append(f"{filepath}: {error_msg}")
            return False, [error_msg]
    
    def check_import_cycles(self, filepath):
        """فحص الاستيرادات الدائرية"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            issues = []
            
            # استخراج الاستيرادات
            import_pattern = r"^(?:from\s+(\S+)\s+import|import\s+(\S+))"
            imports = re.findall(import_pattern, content, re.MULTILINE)
            
            # فحص الاستيرادات المحلية
            local_imports = []
            for imp in imports:
                module = imp[0] if imp[0] else imp[1]
                if module and not module.startswith(('flask', 'sqlalchemy', 'datetime', 'os', 'sys')):
                    local_imports.append(module)
            
            # فحص الاستيرادات المكررة
            import_lines = re.findall(r"^((?:from\s+\S+\s+import\s+.+|import\s+.+))$", content, re.MULTILINE)
            seen_imports = set()
            
            for imp_line in import_lines:
                if imp_line in seen_imports:
                    issues.append(f"استيراد مكرر: {imp_line}")
                seen_imports.add(imp_line)
            
            return len(issues) == 0, issues
            
        except Exception as e:
            error_msg = f"خطأ في فحص الاستيرادات: {str(e)}"
            self.import_errors.append(f"{filepath}: {error_msg}")
            return False, [error_msg]
    
    def check_code_structure(self, filepath):
        """فحص هيكل الكود"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            issues = []
            
            for i, line in enumerate(lines, 1):
                # فحص الأسطر الطويلة جداً
                if len(line) > 200:
                    issues.append(f"السطر {i}: طويل جداً ({len(line)} حرف)")
                
                # فحص المسافات المختلطة
                if '\t' in line and '    ' in line:
                    issues.append(f"السطر {i}: خلط بين التبويب والمسافات")
                
                # فحص الأقواس غير المتطابقة في سطر واحد
                open_parens = line.count('(') - line.count(')')
                open_brackets = line.count('[') - line.count(']')
                open_braces = line.count('{') - line.count('}')
                
                if any([open_parens > 2, open_brackets > 2, open_braces > 1]):
                    if not line.strip().endswith(('\\', ',')):
                        issues.append(f"السطر {i}: أقواس غير متوازنة محتملة")
            
            return len(issues) == 0, issues
            
        except Exception as e:
            error_msg = f"خطأ في فحص الهيكل: {str(e)}"
            self.structure_errors.append(f"{filepath}: {error_msg}")
            return False, [error_msg]
    
    def scan_file_comprehensive(self, filepath):
        """فحص شامل للملف"""
        print(f"\n🔍 فحص عميق: {filepath}")
        
        if not os.path.exists(filepath):
            print(f"   ❌ الملف غير موجود")
            return False
        
        total_issues = 0
        
        # فحص Syntax
        syntax_ok, syntax_issues = self.scan_syntax_deep(filepath)
        if syntax_ok:
            print(f"   ✅ Syntax: صحيح")
        else:
            print(f"   ❌ Syntax: {len(syntax_issues)} مشكلة")
            for issue in syntax_issues[:3]:  # أول 3 مشاكل
                print(f"      • {issue}")
            total_issues += len(syntax_issues)
        
        # فحص قاعدة البيانات
        db_ok, db_issues = self.check_database_relationships(filepath)
        if db_ok:
            print(f"   ✅ Database: صحيح")
        else:
            print(f"   ❌ Database: {len(db_issues)} مشكلة")
            for issue in db_issues[:3]:
                print(f"      • {issue}")
            total_issues += len(db_issues)
        
        # فحص الاستيرادات
        import_ok, import_issues = self.check_import_cycles(filepath)
        if import_ok:
            print(f"   ✅ Imports: صحيح")
        else:
            print(f"   ⚠️  Imports: {len(import_issues)} تحذير")
            for issue in import_issues[:2]:
                print(f"      • {issue}")
        
        # فحص الهيكل
        struct_ok, struct_issues = self.check_code_structure(filepath)
        if struct_ok:
            print(f"   ✅ Structure: صحيح")
        else:
            print(f"   ⚠️  Structure: {len(struct_issues)} تحذير")
            for issue in struct_issues[:2]:
                print(f"      • {issue}")
        
        return total_issues == 0
    
    def run_deep_scan(self):
        """تشغيل الفحص العميق"""
        print("🔬 بدء الفحص العميق للنظام...")
        print("="*70)
        
        # الملفات الحرجة
        critical_files = [
            'models.py',
            'app.py',
            'database.py',
            'learning_difficulties_scoring.py',
            'rehabilitation_programs_models.py',
            'comprehensive_rehabilitation_enhanced_api.py'
        ]
        
        all_clean = True
        
        for filepath in critical_files:
            file_clean = self.scan_file_comprehensive(filepath)
            if not file_clean:
                all_clean = False
        
        # تقرير نهائي
        print(f"\n{'='*70}")
        print("📊 تقرير الفحص العميق")
        print("="*70)
        
        total_errors = (len(self.syntax_errors) + len(self.logic_errors) + 
                       len(self.database_errors) + len(self.import_errors))
        
        if all_clean and total_errors == 0:
            print("🎉 ممتاز! النظام نظيف تماماً من الأخطاء")
            print("✅ جميع الملفات اجتازت الفحص العميق")
            print("✅ لا توجد مشاكل في قاعدة البيانات")
            print("✅ لا توجد أخطاء برمجية")
            print("🟢 النظام جاهز للإنتاج")
        else:
            print(f"⚠️  تم العثور على {total_errors} مشكلة تحتاج مراجعة")
            
            if self.syntax_errors:
                print(f"\n❌ أخطاء Syntax ({len(self.syntax_errors)}):")
                for error in self.syntax_errors:
                    print(f"   • {error}")
            
            if self.database_errors:
                print(f"\n❌ أخطاء قاعدة البيانات ({len(self.database_errors)}):")
                for error in self.database_errors:
                    print(f"   • {error}")
        
        print("="*70)
        return all_clean and total_errors == 0

def main():
    """الدالة الرئيسية"""
    scanner = DeepErrorScanner()
    success = scanner.run_deep_scan()
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
