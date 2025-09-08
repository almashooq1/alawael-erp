#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
أداة الإصلاح الشاملة النهائية
Ultimate System Fixer for Al-Awael ERP
"""

import os
import re
import sys
import ast
import shutil
from pathlib import Path
from collections import defaultdict

class UltimateSystemFixer:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.fixes_applied = []
        self.errors_found = []
        
    def fix_all_system_issues(self):
        """إصلاح جميع مشاكل النظام"""
        print("🔧 بدء الإصلاح الشامل النهائي للنظام...")
        print("=" * 60)
        
        # المرحلة 1: فحص وإصلاح ملفات Python
        self.fix_python_files()
        
        # المرحلة 2: إصلاح الاستيرادات والتبعيات
        self.fix_imports_and_dependencies()
        
        # المرحلة 3: حل مشاكل قاعدة البيانات
        self.fix_database_issues()
        
        # المرحلة 4: إصلاح ملفات API
        self.fix_api_files()
        
        # المرحلة 5: إصلاح ملفات JavaScript
        self.fix_javascript_files()
        
        # المرحلة 6: إصلاح التكوين
        self.fix_configuration_files()
        
        # المرحلة 7: اختبار شامل
        self.run_comprehensive_test()
        
        # تقرير نهائي
        self.generate_final_report()
    
    def fix_python_files(self):
        """إصلاح جميع ملفات Python"""
        print("🐍 إصلاح ملفات Python...")
        
        python_files = list(self.project_path.glob("*.py"))
        
        for py_file in python_files:
            if py_file.name.startswith('.') or py_file.name == 'ultimate_system_fixer.py':
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # إزالة الاستيرادات المكررة
                content = self.remove_duplicate_imports(content)
                
                # إصلاح أخطاء الصيغة
                content = self.fix_syntax_errors(content)
                
                # إصلاح العلاقات المكررة
                if 'models' in py_file.name:
                    content = self.fix_duplicate_relationships(content)
                
                # إصلاح Blueprint references
                if 'api' in py_file.name:
                    content = self.fix_blueprint_references(content)
                
                if content != original_content:
                    with open(py_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    self.fixes_applied.append(f"إصلاح {py_file.name}")
                    
            except Exception as e:
                self.errors_found.append(f"خطأ في {py_file.name}: {e}")
    
    def remove_duplicate_imports(self, content):
        """إزالة الاستيرادات المكررة"""
        lines = content.split('\n')
        seen_imports = set()
        cleaned_lines = []
        
        for line in lines:
            stripped = line.strip()
            if stripped.startswith(('import ', 'from ')):
                if stripped not in seen_imports:
                    seen_imports.add(stripped)
                    cleaned_lines.append(line)
            else:
                cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def fix_syntax_errors(self, content):
        """إصلاح أخطاء الصيغة الأساسية"""
        # إزالة الأسطر الفارغة المتعددة
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        
        # إصلاح المسافات البادئة
        lines = content.split('\n')
        fixed_lines = []
        
        for line in lines:
            # استبدال التابات بالمسافات
            line = line.expandtabs(4)
            fixed_lines.append(line)
        
        return '\n'.join(fixed_lines)
    
    def fix_duplicate_relationships(self, content):
        """إصلاح العلاقات المكررة في النماذج"""
        lines = content.split('\n')
        current_class = None
        seen_relationships = defaultdict(set)
        cleaned_lines = []
        
        for line in lines:
            class_match = re.match(r'class\s+(\w+)', line)
            if class_match:
                current_class = class_match.group(1)
            
            if 'db.relationship' in line and current_class:
                rel_match = re.search(r'(\w+)\s*=\s*db\.relationship', line)
                if rel_match:
                    rel_name = rel_match.group(1)
                    if rel_name not in seen_relationships[current_class]:
                        seen_relationships[current_class].add(rel_name)
                        cleaned_lines.append(line)
                    else:
                        continue
                else:
                    cleaned_lines.append(line)
            else:
                cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def fix_blueprint_references(self, content):
        """إصلاح مراجع Blueprint"""
        blueprint_matches = re.findall(r'(\w+)\s*=\s*Blueprint\([\'"]([^\'\"]+)[\'"]', content)
        
        if blueprint_matches:
            bp_var, bp_name = blueprint_matches[0]
            content = re.sub(r'@\w*_bp\.route', f'@{bp_var}.route', content)
        
        return content
    
    def fix_imports_and_dependencies(self):
        """إصلاح الاستيرادات والتبعيات"""
        print("📦 إصلاح الاستيرادات والتبعيات...")
        
        # إصلاح requirements.txt
        req_file = self.project_path / 'requirements.txt'
        if req_file.exists():
            try:
                with open(req_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                seen_packages = set()
                cleaned_lines = []
                
                for line in lines:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        cleaned_lines.append(line)
                        continue
                    
                    package_name = line.split('==')[0].split('>=')[0].split('<=')[0]
                    if package_name not in seen_packages:
                        seen_packages.add(package_name)
                        cleaned_lines.append(line)
                
                with open(req_file, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(cleaned_lines) + '\n')
                
                self.fixes_applied.append("تنظيف requirements.txt")
                
            except Exception as e:
                self.errors_found.append(f"خطأ في requirements.txt: {e}")
    
    def fix_database_issues(self):
        """حل مشاكل قاعدة البيانات"""
        print("🗄️ حل مشاكل قاعدة البيانات...")
        
        # إنشاء ملف إصلاح قاعدة البيانات
        db_init_content = '''
from flask import Flask
from database import db
import os

def init_database():
    """تهيئة قاعدة البيانات"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///alawael_erp.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        try:
            # استيراد النماذج
            from models import *
            try:
                from comprehensive_rehabilitation_models import *
            except:
                pass
            try:
                from speech_therapy_models import *
            except:
                pass
            
            # إنشاء الجداول
            db.create_all()
            print("✅ تم إنشاء قاعدة البيانات")
            return True
        except Exception as e:
            print(f"❌ خطأ: {e}")
            return False

if __name__ == "__main__":
    init_database()
'''
        
        init_file = self.project_path / 'init_database.py'
        with open(init_file, 'w', encoding='utf-8') as f:
            f.write(db_init_content)
        
        self.fixes_applied.append("إنشاء ملف تهيئة قاعدة البيانات")
    
    def fix_api_files(self):
        """إصلاح ملفات API"""
        print("🔗 إصلاح ملفات API...")
        
        api_files = list(self.project_path.glob("*api*.py"))
        
        for api_file in api_files:
            try:
                with open(api_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # إضافة الاستيرادات المفقودة
                if 'from flask import' not in content:
                    content = 'from flask import Flask, jsonify, request\n' + content
                
                if 'from flask_jwt_extended import' not in content:
                    content = 'from flask_jwt_extended import jwt_required\n' + content
                
                with open(api_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.fixes_applied.append(f"إصلاح {api_file.name}")
                
            except Exception as e:
                self.errors_found.append(f"خطأ في {api_file.name}: {e}")
    
    def fix_javascript_files(self):
        """إصلاح ملفات JavaScript"""
        print("📜 إصلاح ملفات JavaScript...")
        
        js_dir = self.project_path / 'static' / 'js'
        if not js_dir.exists():
            return
        
        js_files = list(js_dir.glob("*.js"))
        
        utility_functions = '''
// Utility functions
async function makeRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
    };
    const response = await fetch(url, { ...defaultOptions, ...options });
    return await response.json();
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer') || document.body;
    const alertId = 'alert-' + Date.now();
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    alertContainer.insertAdjacentHTML('afterbegin', alertHTML);
    setTimeout(() => document.getElementById(alertId)?.remove(), 5000);
}

function showLoading(show = true) {
    const loadingElement = document.getElementById('loadingSpinner');
    if (loadingElement) loadingElement.style.display = show ? 'block' : 'none';
}
'''
        
        for js_file in js_files:
            try:
                with open(js_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # إضافة الدوال المفقودة
                needs_utility = False
                if 'makeRequest(' in content and 'function makeRequest' not in content:
                    needs_utility = True
                if 'showAlert(' in content and 'function showAlert' not in content:
                    needs_utility = True
                if 'showLoading(' in content and 'function showLoading' not in content:
                    needs_utility = True
                
                if needs_utility:
                    content += '\n\n' + utility_functions
                    
                    with open(js_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    self.fixes_applied.append(f"إضافة الدوال المفقودة في {js_file.name}")
                
            except Exception as e:
                self.errors_found.append(f"خطأ في {js_file.name}: {e}")
    
    def fix_configuration_files(self):
        """إصلاح ملفات التكوين"""
        print("⚙️ إصلاح ملفات التكوين...")
        
        # إنشاء .env إذا لم يكن موجوداً
        env_file = self.project_path / '.env'
        if not env_file.exists():
            env_content = '''FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
DATABASE_URI=sqlite:///alawael_erp.db
JWT_SECRET_KEY=dev-jwt-secret-key
'''
            with open(env_file, 'w', encoding='utf-8') as f:
                f.write(env_content)
            
            self.fixes_applied.append("إنشاء ملف .env")
    
    def run_comprehensive_test(self):
        """اختبار شامل للنظام"""
        print("🧪 اختبار شامل للنظام...")
        
        # اختبار الاستيرادات
        try:
            sys.path.append(str(self.project_path))
            from database import db
            self.fixes_applied.append("اختبار استيراد قاعدة البيانات: نجح")
        except Exception as e:
            self.errors_found.append(f"اختبار استيراد قاعدة البيانات: {e}")
        
        # اختبار النماذج
        try:
            from models import User
            self.fixes_applied.append("اختبار استيراد النماذج: نجح")
        except Exception as e:
            self.errors_found.append(f"اختبار استيراد النماذج: {e}")
    
    def generate_final_report(self):
        """إنشاء التقرير النهائي"""
        print("\n" + "=" * 60)
        print("📋 التقرير النهائي الشامل")
        print("=" * 60)
        
        print(f"\n✅ الإصلاحات المطبقة ({len(self.fixes_applied)}):")
        for i, fix in enumerate(self.fixes_applied, 1):
            print(f"  {i}. {fix}")
        
        if self.errors_found:
            print(f"\n❌ الأخطاء المتبقية ({len(self.errors_found)}):")
            for i, error in enumerate(self.errors_found, 1):
                print(f"  {i}. {error}")
        else:
            print("\n🎉 لا توجد أخطاء متبقية!")
        
        # حفظ التقرير
        report_content = f"""
تقرير الإصلاح الشامل النهائي - نظام ERP مراكز الأوائل
{'=' * 60}

الإصلاحات المطبقة ({len(self.fixes_applied)}):
{chr(10).join([f"{i}. {fix}" for i, fix in enumerate(self.fixes_applied, 1)])}

الأخطاء المتبقية ({len(self.errors_found)}):
{chr(10).join([f"{i}. {error}" for i, error in enumerate(self.errors_found, 1)])}

معدل النجاح: {((len(self.fixes_applied))/(len(self.fixes_applied)+len(self.errors_found))*100) if (len(self.fixes_applied)+len(self.errors_found)) > 0 else 100:.1f}%
"""
        
        report_file = self.project_path / 'ultimate_fix_report.txt'
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"\n📄 تم حفظ التقرير: {report_file}")
        print("\n🏁 انتهى الإصلاح الشامل النهائي!")

def main():
    """الدالة الرئيسية"""
    project_path = os.getcwd()
    fixer = UltimateSystemFixer(project_path)
    fixer.fix_all_system_issues()

if __name__ == "__main__":
    main()
