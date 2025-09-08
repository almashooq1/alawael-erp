#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
أداة إصلاح الأخطاء البرمجية الشاملة
Comprehensive Programming Error Fixer
"""

import os
import re
import ast
import sys
from pathlib import Path

class ProgrammingErrorFixer:
    def __init__(self):
        self.errors_found = []
        self.fixes_applied = []
        
    def check_and_fix_indentation(self, filepath):
        """فحص وإصلاح مشاكل المسافات والتبويب"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            fixed_lines = []
            changes_made = False
            
            for i, line in enumerate(lines):
                original_line = line
                
                # تحويل التبويب إلى 4 مسافات
                if '\t' in line:
                    line = line.replace('\t', '    ')
                    changes_made = True
                
                # إزالة المسافات الزائدة في نهاية السطر
                if line.rstrip() != line.rstrip(' \t'):
                    line = line.rstrip() + '\n' if line.endswith('\n') else line.rstrip()
                    changes_made = True
                
                fixed_lines.append(line)
            
            if changes_made:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.writelines(fixed_lines)
                self.fixes_applied.append(f"إصلاح المسافات والتبويب في {filepath}")
                return True
            
            return False
            
        except Exception as e:
            self.errors_found.append(f"خطأ في إصلاح المسافات في {filepath}: {str(e)}")
            return False
    
    def check_syntax_errors(self, filepath):
        """فحص أخطاء Syntax"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            ast.parse(content, filename=filepath)
            return True, "✅ لا توجد أخطاء syntax"
            
        except SyntaxError as e:
            error_msg = f"❌ خطأ Syntax في {filepath} السطر {e.lineno}: {e.msg}"
            self.errors_found.append(error_msg)
            return False, error_msg
            
        except Exception as e:
            error_msg = f"❌ خطأ في فحص {filepath}: {str(e)}"
            self.errors_found.append(error_msg)
            return False, error_msg
    
    def fix_common_issues(self, filepath):
        """إصلاح المشاكل الشائعة"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # إصلاح الأقواس المفقودة في نهاية الأسطر
            lines = content.split('\n')
            fixed_lines = []
            
            for i, line in enumerate(lines):
                # فحص الأسطر التي تنتهي بفاصلة وتحتاج قوس إغلاق
                if (line.strip().endswith(',') and 
                    i < len(lines) - 1 and 
                    lines[i + 1].strip() and 
                    not lines[i + 1].strip().startswith((')', ']', '}'))):
                    
                    # التحقق من وجود أقواس مفتوحة
                    open_parens = line.count('(') - line.count(')')
                    open_brackets = line.count('[') - line.count(']')
                    
                    if open_parens > 0 or open_brackets > 0:
                        # البحث عن السطر الذي يحتاج قوس إغلاق
                        for j in range(i + 1, min(i + 5, len(lines))):
                            if lines[j].strip() and not lines[j].strip().startswith((')', ']', '}')):
                                continue
                            break
                
                fixed_lines.append(line)
            
            content = '\n'.join(fixed_lines)
            
            # إصلاح الاستيرادات المكررة
            import_lines = []
            other_lines = []
            in_imports = True
            
            for line in content.split('\n'):
                if line.strip().startswith(('import ', 'from ')) and in_imports:
                    if line not in import_lines:
                        import_lines.append(line)
                else:
                    if line.strip() and not line.strip().startswith('#'):
                        in_imports = False
                    other_lines.append(line)
            
            if import_lines:
                content = '\n'.join(import_lines + [''] + other_lines)
            
            # حفظ التغييرات إذا كانت مختلفة
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.fixes_applied.append(f"إصلاح مشاكل شائعة في {filepath}")
                return True
            
            return False
            
        except Exception as e:
            self.errors_found.append(f"خطأ في إصلاح {filepath}: {str(e)}")
            return False
    
    def fix_models_specific_issues(self):
        """إصلاح مشاكل محددة في ملف models.py"""
        filepath = "models.py"
        if not os.path.exists(filepath):
            return False
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # التأكد من عدم وجود backref مكررة
            backref_pattern = r"backref='([^']+)'"
            backrefs = re.findall(backref_pattern, content)
            
            # إصلاح backref المكررة
            if 'tracking_records' in backrefs:
                content = content.replace(
                    "backref='tracking_records'",
                    "backref='vehicle_tracking_records'",
                    1
                )
            
            # التأكد من وجود الاستيرادات المطلوبة
            required_imports = [
                "from datetime import datetime, date",
                "from sqlalchemy import CheckConstraint",
                "from database import db"
            ]
            
            for imp in required_imports:
                if imp not in content:
                    content = imp + '\n' + content
            
            # حفظ التغييرات
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.fixes_applied.append(f"إصلاح مشاكل محددة في {filepath}")
                return True
            
            return False
            
        except Exception as e:
            self.errors_found.append(f"خطأ في إصلاح models.py: {str(e)}")
            return False
    
    def check_all_files(self):
        """فحص جميع الملفات المهمة"""
        important_files = [
            'models.py',
            'app.py',
            'database.py',
            'learning_difficulties_scoring.py',
            'rehabilitation_programs_models.py',
            'comprehensive_rehabilitation_enhanced_api.py'
        ]
        
        print("🔍 بدء فحص الأخطاء البرمجية...")
        print("="*60)
        
        for filepath in important_files:
            if os.path.exists(filepath):
                print(f"\n📁 فحص ملف: {filepath}")
                
                # إصلاح المسافات والتبويب
                self.check_and_fix_indentation(filepath)
                
                # فحص syntax
                syntax_ok, syntax_msg = self.check_syntax_errors(filepath)
                print(f"   Syntax: {syntax_msg}")
                
                # إصلاح المشاكل الشائعة
                if syntax_ok:
                    self.fix_common_issues(filepath)
                
            else:
                print(f"⚠️  الملف غير موجود: {filepath}")
        
        # إصلاح مشاكل محددة في models.py
        self.fix_models_specific_issues()
        
        self.generate_report()
    
    def generate_report(self):
        """إنشاء تقرير الإصلاح"""
        print(f"\n{'='*60}")
        print("📊 تقرير إصلاح الأخطاء البرمجية")
        print("="*60)
        
        if self.fixes_applied:
            print(f"\n✅ الإصلاحات المطبقة ({len(self.fixes_applied)}):")
            for fix in self.fixes_applied:
                print(f"   • {fix}")
        
        if self.errors_found:
            print(f"\n❌ الأخطاء المتبقية ({len(self.errors_found)}):")
            for error in self.errors_found:
                print(f"   • {error}")
        
        if not self.errors_found and not self.fixes_applied:
            print("\n🎉 ممتاز! لا توجد أخطاء برمجية في النظام")
        elif not self.errors_found:
            print(f"\n🎉 تم إصلاح جميع الأخطاء بنجاح!")
        
        print("="*60)

def main():
    """الدالة الرئيسية"""
    fixer = ProgrammingErrorFixer()
    fixer.check_all_files()

if __name__ == "__main__":
    main()
