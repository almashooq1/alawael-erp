#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
أداة إصلاح النظام الشاملة
System Comprehensive Fixer Tool
"""

import os
import re
import ast
import shutil
from datetime import datetime

class SystemFixer:
    def __init__(self):
        self.fixed_files = []
        self.errors_found = []
        self.warnings = []
        self.backup_created = False
        
    def create_backup(self):
        """إنشاء نسخة احتياطية من الملفات المهمة"""
        backup_dir = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.makedirs(backup_dir, exist_ok=True)
        
        important_files = [
            'app.py', 'models.py', 'database.py',
            'surveillance_system_models.py', 'surveillance_system_services.py',
            'surveillance_system_api.py'
        ]
        
        for file_name in important_files:
            if os.path.exists(file_name):
                shutil.copy2(file_name, backup_dir)
        
        self.backup_created = True
        print(f"✅ تم إنشاء نسخة احتياطية في: {backup_dir}")
        
    def fix_imports_in_file(self, file_path):
        """إصلاح الاستيرادات في ملف واحد"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # إصلاح استيراد database
            if 'db.Model' in content or 'db.Column' in content or 'db.relationship' in content:
                if 'from database import db' not in content and 'from .database import db' not in content:
                    # إضافة استيراد database في بداية الملف
                    lines = content.split('\n')
                    import_index = 0
                    
                    # العثور على مكان الاستيرادات
                    for i, line in enumerate(lines):
                        if line.strip().startswith('from ') or line.strip().startswith('import '):
                            import_index = i + 1
                    
                    lines.insert(import_index, 'from database import db')
                    content = '\n'.join(lines)
            
            # إصلاح استيرادات Flask المفقودة
            if '@app.route' in content or 'Flask(' in content:
                if 'from flask import' not in content:
                    lines = content.split('\n')
                    lines.insert(0, 'from flask import Flask, render_template, request, jsonify, redirect, url_for')
                    content = '\n'.join(lines)
            
            # إصلاح استيرادات JWT المفقودة
            if '@jwt_required' in content:
                if 'from flask_jwt_extended import' not in content:
                    lines = content.split('\n')
                    import_index = 0
                    for i, line in enumerate(lines):
                        if line.strip().startswith('from flask'):
                            import_index = i + 1
                            break
                    lines.insert(import_index, 'from flask_jwt_extended import jwt_required, get_jwt_identity')
                    content = '\n'.join(lines)
            
            # إزالة الاستيرادات المكررة
            lines = content.split('\n')
            seen_imports = set()
            cleaned_lines = []
            
            for line in lines:
                if line.strip().startswith('from ') or line.strip().startswith('import '):
                    if line.strip() not in seen_imports:
                        seen_imports.add(line.strip())
                        cleaned_lines.append(line)
                else:
                    cleaned_lines.append(line)
            
            content = '\n'.join(cleaned_lines)
            
            # حفظ الملف إذا تم تعديله
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.fixed_files.append(file_path)
                print(f"🔧 تم إصلاح الاستيرادات في: {file_path}")
                
        except Exception as e:
            self.errors_found.append(f"خطأ في إصلاح {file_path}: {e}")
            print(f"❌ خطأ في إصلاح {file_path}: {e}")
    
    def check_and_fix_syntax(self, file_path):
        """فحص وإصلاح أخطاء بناء الجملة"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # محاولة تحليل الملف
            ast.parse(content)
            return True
            
        except SyntaxError as e:
            self.errors_found.append(f"خطأ نحوي في {file_path}: {e}")
            print(f"❌ خطأ نحوي في {file_path} السطر {e.lineno}: {e.msg}")
            return False
        except Exception as e:
            self.errors_found.append(f"خطأ في قراءة {file_path}: {e}")
            return False
    
    def fix_database_imports(self):
        """إصلاح استيرادات قاعدة البيانات في جميع الملفات"""
        print("🔧 إصلاح استيرادات قاعدة البيانات...")
        
        # قائمة الملفات التي تحتاج إصلاح
        model_files = [
            'models.py',
            'surveillance_system_models.py',
            'rehabilitation_programs_models.py',
            'finance_models.py',
            'ar_vr_models.py',
            'risk_management_models.py',
            'advanced_dashboard_models.py',
            'learning_behavior_analysis_models.py'
        ]
        
        for file_name in model_files:
            if os.path.exists(file_name):
                self.fix_imports_in_file(file_name)
    
    def fix_api_imports(self):
        """إصلاح استيرادات API endpoints"""
        print("🔧 إصلاح استيرادات API...")
        
        api_files = []
        for file_name in os.listdir('.'):
            if file_name.endswith('_api.py'):
                api_files.append(file_name)
        
        for file_name in api_files:
            self.fix_imports_in_file(file_name)
    
    def remove_duplicate_models(self):
        """إزالة النماذج المكررة من models.py"""
        print("🔧 فحص وإزالة النماذج المكررة...")
        
        if not os.path.exists('models.py'):
            return
        
        try:
            with open('models.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # البحث عن التعريفات المكررة
            class_pattern = r'class\s+(\w+)\s*\([^)]*\):'
            classes = re.findall(class_pattern, content)
            
            # العثور على الفئات المكررة
            class_counts = {}
            for class_name in classes:
                class_counts[class_name] = class_counts.get(class_name, 0) + 1
            
            duplicates = [name for name, count in class_counts.items() if count > 1]
            
            if duplicates:
                print(f"⚠️ وجدت فئات مكررة: {', '.join(duplicates)}")
                # يمكن إضافة منطق لإزالة التكرارات هنا
                
        except Exception as e:
            self.errors_found.append(f"خطأ في فحص models.py: {e}")
    
    def validate_all_files(self):
        """فحص جميع ملفات Python للتأكد من صحتها"""
        print("🔍 فحص جميع ملفات Python...")
        
        valid_files = 0
        total_files = 0
        
        for file_name in os.listdir('.'):
            if file_name.endswith('.py') and not file_name.startswith('__'):
                total_files += 1
                if self.check_and_fix_syntax(file_name):
                    valid_files += 1
        
        print(f"📊 نتيجة الفحص: {valid_files}/{total_files} ملف صحيح")
        return valid_files == total_files
    
    def fix_system(self):
        """تشغيل عملية الإصلاح الشاملة"""
        print("🚀 بدء عملية إصلاح النظام الشاملة...")
        print("=" * 60)
        
        # إنشاء نسخة احتياطية
        self.create_backup()
        
        # إصلاح الاستيرادات
        self.fix_database_imports()
        self.fix_api_imports()
        
        # إزالة التكرارات
        self.remove_duplicate_models()
        
        # فحص نهائي
        all_valid = self.validate_all_files()
        
        # تقرير النتائج
        print("\n" + "=" * 60)
        print("📊 تقرير الإصلاح النهائي:")
        print(f"✅ ملفات تم إصلاحها: {len(self.fixed_files)}")
        print(f"❌ أخطاء وجدت: {len(self.errors_found)}")
        print(f"⚠️ تحذيرات: {len(self.warnings)}")
        
        if self.fixed_files:
            print("\n🔧 الملفات المُصلحة:")
            for file_name in self.fixed_files:
                print(f"  - {file_name}")
        
        if self.errors_found:
            print("\n❌ الأخطاء المتبقية:")
            for error in self.errors_found:
                print(f"  - {error}")
        
        status = "🟢 ممتاز" if all_valid and len(self.errors_found) == 0 else "🟡 يحتاج مراجعة"
        print(f"\n🎯 حالة النظام: {status}")
        print("=" * 60)
        
        return len(self.errors_found) == 0

def main():
    fixer = SystemFixer()
    success = fixer.fix_system()
    return success

if __name__ == "__main__":
    main()
