#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
فاحص صحة النظام - فحص شامل لجميع مكونات النظام
"""

import os
import ast
import sys
import importlib.util
from collections import defaultdict

class SystemHealthChecker:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.fixes_applied = []
        
    def check_syntax_all_files(self):
        """فحص بناء الجملة لجميع ملفات Python"""
        print("🔍 فحص بناء الجملة لجميع ملفات Python...")
        
        python_files = []
        for root, dirs, files in os.walk('.'):
            # تجاهل مجلدات معينة
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['__pycache__', 'venv', '.venv']]
            
            for file in files:
                if file.endswith('.py'):
                    python_files.append(os.path.join(root, file))
        
        syntax_errors = 0
        for file_path in python_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                ast.parse(content)
            except SyntaxError as e:
                self.issues.append(f"خطأ في بناء الجملة في {file_path}: {str(e)}")
                syntax_errors += 1
            except Exception as e:
                self.warnings.append(f"تحذير في {file_path}: {str(e)}")
        
        print(f"  📊 تم فحص {len(python_files)} ملف")
        print(f"  ❌ أخطاء بناء الجملة: {syntax_errors}")
        return syntax_errors == 0
    
    def check_imports(self):
        """فحص الاستيرادات"""
        print("🔍 فحص الاستيرادات...")
        
        # فحص الملفات الأساسية
        core_files = ['app.py', 'models.py', 'database.py']
        
        for file_path in core_files:
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # فحص استيرادات models.py
                    if file_path == 'models.py':
                        if 'from database import db' not in content:
                            self.issues.append("models.py: مفقود 'from database import db'")
                        if 'from datetime import datetime' not in content:
                            self.warnings.append("models.py: قد يحتاج 'from datetime import datetime'")
                    
                    # فحص استيرادات app.py
                    elif file_path == 'app.py':
                        if 'from database import db' not in content:
                            self.issues.append("app.py: مفقود 'from database import db'")
                        if 'from models import' not in content:
                            self.issues.append("app.py: مفقود استيراد النماذج")
                
                except Exception as e:
                    self.issues.append(f"خطأ في قراءة {file_path}: {str(e)}")
            else:
                self.issues.append(f"الملف غير موجود: {file_path}")
        
        return len([issue for issue in self.issues if 'مفقود' in issue]) == 0
    
    def check_database_models(self):
        """فحص نماذج قاعدة البيانات"""
        print("🔍 فحص نماذج قاعدة البيانات...")
        
        if not os.path.exists('models.py'):
            self.issues.append("ملف models.py غير موجود")
            return False
        
        try:
            with open('models.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # فحص وجود النماذج الأساسية
            required_models = ['User', 'Student', 'Teacher', 'Classroom']
            for model in required_models:
                if f'class {model}(db.Model):' not in content:
                    self.issues.append(f"النموذج {model} غير موجود")
            
            # فحص العلاقات المكررة
            import re
            backref_pattern = r"backref='([^']+)'"
            matches = re.findall(backref_pattern, content)
            
            backref_counts = defaultdict(int)
            for backref in matches:
                backref_counts[backref] += 1
            
            duplicates = {k: v for k, v in backref_counts.items() if v > 1}
            if duplicates:
                for backref, count in duplicates.items():
                    self.issues.append(f"علاقة مكررة: '{backref}' ({count} مرات)")
            
            return len(duplicates) == 0
            
        except Exception as e:
            self.issues.append(f"خطأ في فحص models.py: {str(e)}")
            return False
    
    def check_app_configuration(self):
        """فحص إعدادات التطبيق"""
        print("🔍 فحص إعدادات التطبيق...")
        
        if not os.path.exists('app.py'):
            self.issues.append("ملف app.py غير موجود")
            return False
        
        try:
            with open('app.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # فحص الإعدادات المطلوبة
            required_configs = [
                'SQLALCHEMY_DATABASE_URI',
                'SQLALCHEMY_TRACK_MODIFICATIONS',
                'JWT_SECRET_KEY'
            ]
            
            for config in required_configs:
                if config not in content:
                    self.warnings.append(f"إعداد مفقود: {config}")
            
            return True
            
        except Exception as e:
            self.issues.append(f"خطأ في فحص app.py: {str(e)}")
            return False
    
    def fix_critical_issues(self):
        """إصلاح المشاكل الحرجة"""
        print("🛠️ إصلاح المشاكل الحرجة...")
        
        # إصلاح العلاقات المكررة في models.py
        if os.path.exists('models.py'):
            try:
                with open('models.py', 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # إصلاحات محددة
                fixes = [
                    ("backref='students'", "backref='enrolled_students'"),
                    ("backref='classroom'", "backref='assigned_classroom'"),
                    ("backref='transports'", "backref='transport_records'"),
                    ("backref='student_transports'", "backref='transport_assignments'")
                ]
                
                original_content = content
                for old, new in fixes:
                    if content.count(old) > 1:
                        # استبدال الثاني والثالث فقط
                        parts = content.split(old)
                        if len(parts) > 2:
                            content = old.join(parts[:2]) + new + new.join(parts[2:])
                            self.fixes_applied.append(f"تم إصلاح: {old} -> {new}")
                
                if content != original_content:
                    with open('models.py', 'w', encoding='utf-8') as f:
                        f.write(content)
                    print("  ✅ تم إصلاح العلاقات المكررة")
                
            except Exception as e:
                self.issues.append(f"خطأ في إصلاح models.py: {str(e)}")
    
    def run_comprehensive_check(self):
        """تشغيل فحص شامل للنظام"""
        print("🚀 بدء الفحص الشامل للنظام...")
        print("=" * 50)
        
        # تشغيل جميع الفحوصات
        checks = [
            ("فحص بناء الجملة", self.check_syntax_all_files),
            ("فحص الاستيرادات", self.check_imports),
            ("فحص نماذج قاعدة البيانات", self.check_database_models),
            ("فحص إعدادات التطبيق", self.check_app_configuration)
        ]
        
        results = {}
        for check_name, check_func in checks:
            print(f"\n{check_name}...")
            results[check_name] = check_func()
            if results[check_name]:
                print(f"  ✅ {check_name} - نجح")
            else:
                print(f"  ❌ {check_name} - فشل")
        
        # إصلاح المشاكل الحرجة
        self.fix_critical_issues()
        
        # طباعة التقرير النهائي
        self.print_report(results)
        
        return all(results.values())
    
    def print_report(self, results):
        """طباعة التقرير النهائي"""
        print("\n" + "=" * 50)
        print("📋 تقرير صحة النظام")
        print("=" * 50)
        
        # إحصائيات عامة
        total_checks = len(results)
        passed_checks = sum(results.values())
        
        print(f"📊 الفحوصات الناجحة: {passed_checks}/{total_checks}")
        print(f"❌ المشاكل المكتشفة: {len(self.issues)}")
        print(f"⚠️ التحذيرات: {len(self.warnings)}")
        print(f"🛠️ الإصلاحات المطبقة: {len(self.fixes_applied)}")
        
        # تفاصيل المشاكل
        if self.issues:
            print(f"\n❌ المشاكل الحرجة:")
            for issue in self.issues:
                print(f"  - {issue}")
        
        if self.warnings:
            print(f"\n⚠️ التحذيرات:")
            for warning in self.warnings:
                print(f"  - {warning}")
        
        if self.fixes_applied:
            print(f"\n✅ الإصلاحات المطبقة:")
            for fix in self.fixes_applied:
                print(f"  - {fix}")
        
        # تقييم الحالة العامة
        if passed_checks == total_checks and len(self.issues) == 0:
            print(f"\n🎉 النظام في حالة ممتازة!")
        elif passed_checks >= total_checks * 0.8:
            print(f"\n✅ النظام في حالة جيدة مع بعض التحسينات المطلوبة")
        else:
            print(f"\n⚠️ النظام يحتاج إصلاحات مهمة")

def main():
    checker = SystemHealthChecker()
    checker.run_comprehensive_check()

if __name__ == "__main__":
    main()
