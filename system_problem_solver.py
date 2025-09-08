#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
حلال مشاكل النظام الشامل - إصلاح جميع المشاكل في نظام ERP مراكز الأوائل
"""

import os
import re
import ast
import sys
import traceback
from collections import defaultdict
from datetime import datetime

class SystemProblemSolver:
    def __init__(self):
        self.issues_found = []
        self.fixes_applied = []
        self.errors = []
        
    def log_issue(self, issue_type, description, file_path=None, line_num=None):
        """تسجيل مشكلة تم العثور عليها"""
        self.issues_found.append({
            'type': issue_type,
            'description': description,
            'file': file_path,
            'line': line_num,
            'timestamp': datetime.now()
        })
        
    def log_fix(self, fix_description, file_path=None):
        """تسجيل إصلاح تم تطبيقه"""
        self.fixes_applied.append({
            'description': fix_description,
            'file': file_path,
            'timestamp': datetime.now()
        })
        
    def check_syntax_errors(self, file_path):
        """فحص أخطاء بناء الجملة"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # محاولة تحليل الملف
            ast.parse(content)
            return True
            
        except SyntaxError as e:
            self.log_issue('SYNTAX_ERROR', f'خطأ في بناء الجملة: {str(e)}', file_path, e.lineno)
            return False
        except Exception as e:
            self.log_issue('PARSE_ERROR', f'خطأ في تحليل الملف: {str(e)}', file_path)
            return False
    
    def fix_duplicate_backrefs(self, file_path):
        """إصلاح العلاقات المكررة في models.py"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # البحث عن العلاقات المكررة
            backref_pattern = r"backref='([^']+)'"
            matches = re.findall(backref_pattern, content)
            
            backref_counts = defaultdict(int)
            for backref in matches:
                backref_counts[backref] += 1
            
            duplicates = {k: v for k, v in backref_counts.items() if v > 1}
            
            if not duplicates:
                return True
            
            # إصلاح العلاقات المكررة
            lines = content.split('\n')
            current_class = None
            backref_usage = defaultdict(int)
            
            for i, line in enumerate(lines):
                # تحديد الكلاس الحالي
                if line.strip().startswith('class ') and '(db.Model)' in line:
                    current_class = line.strip().split()[1].split('(')[0]
                
                # إصلاح العلاقات المكررة
                for duplicate_backref in duplicates:
                    if f"backref='{duplicate_backref}'" in line:
                        backref_usage[duplicate_backref] += 1
                        
                        # إذا لم تكن الأولى، قم بتغييرها
                        if backref_usage[duplicate_backref] > 1:
                            new_backref = f"{current_class.lower()}_{duplicate_backref}"
                            lines[i] = line.replace(f"backref='{duplicate_backref}'", f"backref='{new_backref}'")
                            self.log_fix(f'تم تغيير backref من {duplicate_backref} إلى {new_backref} في {current_class}', file_path)
            
            # حفظ الملف المحدث
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(lines))
            
            self.log_fix(f'تم إصلاح {len(duplicates)} علاقة مكررة', file_path)
            return True
            
        except Exception as e:
            self.log_issue('BACKREF_FIX_ERROR', f'خطأ في إصلاح العلاقات: {str(e)}', file_path)
            return False
    
    def check_import_errors(self, file_path):
        """فحص أخطاء الاستيراد"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # البحث عن الاستيرادات
            import_lines = []
            for i, line in enumerate(content.split('\n')):
                if line.strip().startswith(('import ', 'from ')):
                    import_lines.append((i+1, line.strip()))
            
            # فحص الاستيرادات المكررة
            seen_imports = set()
            for line_num, import_line in import_lines:
                if import_line in seen_imports:
                    self.log_issue('DUPLICATE_IMPORT', f'استيراد مكرر: {import_line}', file_path, line_num)
                else:
                    seen_imports.add(import_line)
            
            return True
            
        except Exception as e:
            self.log_issue('IMPORT_CHECK_ERROR', f'خطأ في فحص الاستيرادات: {str(e)}', file_path)
            return False
    
    def fix_common_issues(self, file_path):
        """إصلاح المشاكل الشائعة"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # إصلاح المسافات الزائدة في نهاية الأسطر
            content = re.sub(r' +\n', '\n', content)
            
            # إصلاح الأسطر الفارغة المتعددة
            content = re.sub(r'\n{3,}', '\n\n', content)
            
            # إصلاح المسافات قبل الفواصل
            content = re.sub(r' +,', ',', content)
            
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.log_fix('تم إصلاح مشاكل التنسيق', file_path)
            
            return True
            
        except Exception as e:
            self.log_issue('FORMATTING_ERROR', f'خطأ في إصلاح التنسيق: {str(e)}', file_path)
            return False
    
    def check_database_models(self, file_path):
        """فحص نماذج قاعدة البيانات"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # فحص وجود الاستيرادات المطلوبة
            required_imports = [
                'from database import db',
                'from datetime import datetime',
                'from sqlalchemy'
            ]
            
            for required_import in required_imports:
                if required_import not in content:
                    self.log_issue('MISSING_IMPORT', f'استيراد مفقود: {required_import}', file_path)
            
            # فحص تعريف النماذج
            class_pattern = r'class\s+(\w+)\(db\.Model\):'
            classes = re.findall(class_pattern, content)
            
            if not classes:
                self.log_issue('NO_MODELS', 'لا توجد نماذج قاعدة بيانات', file_path)
            
            return True
            
        except Exception as e:
            self.log_issue('MODEL_CHECK_ERROR', f'خطأ في فحص النماذج: {str(e)}', file_path)
            return False
    
    def solve_all_problems(self):
        """حل جميع مشاكل النظام"""
        print("🚀 بدء حل جميع مشاكل النظام...")
        print("=" * 60)
        
        # قائمة الملفات المهمة للفحص
        important_files = [
            'models.py',
            'app.py',
            'database.py'
        ]
        
        # فحص الملفات المهمة
        for file_path in important_files:
            if os.path.exists(file_path):
                print(f"\n🔍 فحص الملف: {file_path}")
                
                # فحص أخطاء بناء الجملة
                if self.check_syntax_errors(file_path):
                    print(f"  ✅ بناء الجملة سليم")
                else:
                    print(f"  ❌ يوجد أخطاء في بناء الجملة")
                
                # فحص أخطاء الاستيراد
                self.check_import_errors(file_path)
                
                # إصلاح المشاكل الشائعة
                self.fix_common_issues(file_path)
                
                # إصلاحات خاصة بـ models.py
                if file_path == 'models.py':
                    self.fix_duplicate_backrefs(file_path)
                    self.check_database_models(file_path)
            else:
                self.log_issue('MISSING_FILE', f'الملف غير موجود: {file_path}')
        
        # فحص جميع ملفات Python
        python_files = []
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.endswith('.py') and not file.startswith('__'):
                    python_files.append(os.path.join(root, file))
        
        print(f"\n🔍 فحص {len(python_files)} ملف Python...")
        
        syntax_errors = 0
        for file_path in python_files:
            if not self.check_syntax_errors(file_path):
                syntax_errors += 1
        
        print(f"  📊 ملفات بها أخطاء: {syntax_errors}")
        
        # طباعة التقرير النهائي
        self.print_final_report()
    
    def print_final_report(self):
        """طباعة التقرير النهائي"""
        print("\n" + "=" * 60)
        print("📋 التقرير النهائي")
        print("=" * 60)
        
        print(f"🔍 المشاكل المكتشفة: {len(self.issues_found)}")
        print(f"🛠️ الإصلاحات المطبقة: {len(self.fixes_applied)}")
        
        if self.issues_found:
            print("\n❌ المشاكل المكتشفة:")
            issue_types = defaultdict(int)
            for issue in self.issues_found:
                issue_types[issue['type']] += 1
                print(f"  - {issue['type']}: {issue['description']}")
                if issue['file']:
                    print(f"    الملف: {issue['file']}")
                if issue['line']:
                    print(f"    السطر: {issue['line']}")
            
            print(f"\n📊 إحصائيات المشاكل:")
            for issue_type, count in issue_types.items():
                print(f"  - {issue_type}: {count}")
        
        if self.fixes_applied:
            print("\n✅ الإصلاحات المطبقة:")
            for fix in self.fixes_applied:
                print(f"  - {fix['description']}")
                if fix['file']:
                    print(f"    الملف: {fix['file']}")
        
        # تقييم حالة النظام
        critical_issues = [issue for issue in self.issues_found if issue['type'] in ['SYNTAX_ERROR', 'MISSING_FILE']]
        
        if not critical_issues:
            print("\n🎉 النظام جاهز للتشغيل!")
        else:
            print(f"\n⚠️ يوجد {len(critical_issues)} مشكلة حرجة تحتاج إصلاح")

def main():
    """الدالة الرئيسية"""
    solver = SystemProblemSolver()
    solver.solve_all_problems()

if __name__ == "__main__":
    main()
