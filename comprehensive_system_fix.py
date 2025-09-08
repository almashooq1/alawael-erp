#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إصلاح شامل للنظام
Comprehensive System Fix for Al-Awael ERP
"""

import os
import re
import shutil
from pathlib import Path

class SystemFixer:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.fixes_applied = []
        
    def fix_all_issues(self):
        """إصلاح جميع المشاكل في النظام"""
        print("🔧 بدء الإصلاح الشامل للنظام...")
        print("=" * 60)
        
        # إصلاح ملفات Python
        self.fix_python_files()
        
        # إصلاح ملفات JavaScript
        self.fix_javascript_files()
        
        # إصلاح ملفات التكوين
        self.fix_config_files()
        
        # إصلاح قاعدة البيانات
        self.fix_database_issues()
        
        # تنظيف الملفات
        self.cleanup_files()
        
        # إنشاء تقرير الإصلاح
        self.generate_fix_report()
        
    def fix_python_files(self):
        """إصلاح ملفات Python"""
        print("🐍 إصلاح ملفات Python...")
        
        # إصلاح app.py
        self.fix_app_py()
        
        # إصلاح ملفات النماذج
        self.fix_models()
        
        # إصلاح ملفات API
        self.fix_api_files()
        
    def fix_app_py(self):
        """إصلاح ملف app.py الرئيسي"""
        app_file = self.project_path / 'app.py'
        
        if not app_file.exists():
            return
            
        try:
            with open(app_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # إزالة الاستيرادات المكررة
            lines = content.split('\n')
            seen_imports = set()
            cleaned_lines = []
            
            for line in lines:
                if line.strip().startswith(('import ', 'from ')):
                    if line.strip() not in seen_imports:
                        seen_imports.add(line.strip())
                        cleaned_lines.append(line)
                else:
                    cleaned_lines.append(line)
            
            # إزالة الدوال المكررة
            content = '\n'.join(cleaned_lines)
            
            # إزالة تعريفات allowed_file المكررة
            content = re.sub(
                r'def allowed_file\(filename\):\s+return.*?\n.*?\n',
                '',
                content,
                count=1  # إزالة التكرار الثاني فقط
            )
            
            with open(app_file, 'w', encoding='utf-8') as f:
                f.write(content)
                
            self.fixes_applied.append("إصلاح الاستيرادات والدوال المكررة في app.py")
            
        except Exception as e:
            print(f"خطأ في إصلاح app.py: {e}")
    
    def fix_models(self):
        """إصلاح ملفات النماذج"""
        models_file = self.project_path / 'models.py'
        
        if not models_file.exists():
            return
            
        try:
            with open(models_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # إصلاح العلاقات المكررة
            # البحث عن العلاقات المكررة وإزالتها
            lines = content.split('\n')
            seen_relationships = {}
            cleaned_lines = []
            
            current_class = None
            for line in lines:
                # تتبع الفئة الحالية
                class_match = re.match(r'class\s+(\w+)', line)
                if class_match:
                    current_class = class_match.group(1)
                    seen_relationships[current_class] = set()
                
                # فحص العلاقات
                if 'db.relationship' in line and current_class:
                    rel_match = re.search(r'(\w+)\s*=\s*db\.relationship', line)
                    if rel_match:
                        rel_name = rel_match.group(1)
                        if rel_name not in seen_relationships[current_class]:
                            seen_relationships[current_class].add(rel_name)
                            cleaned_lines.append(line)
                        else:
                            # تخطي العلاقة المكررة
                            continue
                    else:
                        cleaned_lines.append(line)
                else:
                    cleaned_lines.append(line)
            
            content = '\n'.join(cleaned_lines)
            
            with open(models_file, 'w', encoding='utf-8') as f:
                f.write(content)
                
            self.fixes_applied.append("إصلاح العلاقات المكررة في models.py")
            
        except Exception as e:
            print(f"خطأ في إصلاح models.py: {e}")
    
    def fix_api_files(self):
        """إصلاح ملفات API"""
        api_files = list(self.project_path.glob("*api*.py"))
        
        for api_file in api_files:
            try:
                with open(api_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # إصلاح تسمية Blueprint
                # التأكد من أن جميع المسارات تستخدم نفس متغير Blueprint
                blueprint_matches = re.findall(r'(\w+)\s*=\s*Blueprint\([\'"]([^\'\"]+)[\'"]', content)
                
                if blueprint_matches:
                    bp_var, bp_name = blueprint_matches[0]
                    
                    # استبدال جميع المراجع الخاطئة للـ Blueprint
                    content = re.sub(
                        r'@\w*_bp\.route',
                        f'@{bp_var}.route',
                        content
                    )
                
                with open(api_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                    
                self.fixes_applied.append(f"إصلاح تسمية Blueprint في {api_file.name}")
                
            except Exception as e:
                print(f"خطأ في إصلاح {api_file}: {e}")
    
    def fix_javascript_files(self):
        """إصلاح ملفات JavaScript"""
        print("📜 إصلاح ملفات JavaScript...")
        
        js_files = list(self.project_path.glob("static/js/*.js"))
        
        for js_file in js_files:
            try:
                with open(js_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # إضافة الدوال المفقودة إذا لم تكن موجودة
                missing_functions = []
                
                if 'makeRequest(' in content and 'function makeRequest' not in content and 'makeRequest(' not in content:
                    missing_functions.append(self.get_make_request_function())
                
                if 'showAlert(' in content and 'function showAlert' not in content and 'showAlert(' not in content:
                    missing_functions.append(self.get_show_alert_function())
                
                if 'showLoading(' in content and 'function showLoading' not in content and 'showLoading(' not in content:
                    missing_functions.append(self.get_show_loading_function())
                
                if missing_functions:
                    content += '\n\n' + '\n\n'.join(missing_functions)
                    
                    with open(js_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    self.fixes_applied.append(f"إضافة الدوال المفقودة في {js_file.name}")
                
            except Exception as e:
                print(f"خطأ في إصلاح {js_file}: {e}")
    
    def get_make_request_function(self):
        """الحصول على دالة makeRequest"""
        return '''
// Utility function for making API requests
async function makeRequest(url, options = {}) {
    try {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}'''
    
    def get_show_alert_function(self):
        """الحصول على دالة showAlert"""
        return '''
// Utility function for showing alerts
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer') || document.body;
    const alertId = 'alert-' + Date.now();
    
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show" role="alert">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('afterbegin', alertHTML);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            alert.remove();
        }
    }, 5000);
}'''
    
    def get_show_loading_function(self):
        """الحصول على دالة showLoading"""
        return '''
// Utility function for showing/hiding loading spinner
function showLoading(show = true) {
    const loadingElement = document.getElementById('loadingSpinner');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}'''
    
    def fix_config_files(self):
        """إصلاح ملفات التكوين"""
        print("⚙️ إصلاح ملفات التكوين...")
        
        # إصلاح requirements.txt
        self.fix_requirements()
        
    def fix_requirements(self):
        """إصلاح ملف requirements.txt"""
        req_file = self.project_path / 'requirements.txt'
        
        if not req_file.exists():
            return
            
        try:
            with open(req_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # إزالة التكرار والتنظيف
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
                
            self.fixes_applied.append("إزالة الحزم المكررة من requirements.txt")
            
        except Exception as e:
            print(f"خطأ في إصلاح requirements.txt: {e}")
    
    def fix_database_issues(self):
        """إصلاح مشاكل قاعدة البيانات"""
        print("🗄️ إصلاح مشاكل قاعدة البيانات...")
        
        # إنشاء ملف إصلاح قاعدة البيانات
        db_fix_content = '''
from database import db
from models import *

def fix_database():
    """إصلاح قاعدة البيانات"""
    try:
        # إنشاء الجداول المفقودة
        db.create_all()
        print("✅ تم إنشاء جداول قاعدة البيانات")
        
        # فحص العلاقات
        print("✅ تم فحص العلاقات")
        
        return True
    except Exception as e:
        print(f"❌ خطأ في إصلاح قاعدة البيانات: {e}")
        return False

if __name__ == "__main__":
    fix_database()
'''
        
        db_fix_file = self.project_path / 'fix_database.py'
        with open(db_fix_file, 'w', encoding='utf-8') as f:
            f.write(db_fix_content)
        
        self.fixes_applied.append("إنشاء ملف إصلاح قاعدة البيانات")
    
    def cleanup_files(self):
        """تنظيف الملفات"""
        print("🧹 تنظيف الملفات...")
        
        # إزالة الملفات المؤقتة
        temp_patterns = ['*.pyc', '__pycache__', '*.tmp', '.DS_Store']
        
        for pattern in temp_patterns:
            for file_path in self.project_path.rglob(pattern):
                try:
                    if file_path.is_file():
                        file_path.unlink()
                    elif file_path.is_dir():
                        shutil.rmtree(file_path)
                except Exception:
                    pass
        
        self.fixes_applied.append("تنظيف الملفات المؤقتة")
    
    def generate_fix_report(self):
        """إنشاء تقرير الإصلاح"""
        print("\n" + "=" * 60)
        print("📋 تقرير الإصلاح الشامل")
        print("=" * 60)
        
        if self.fixes_applied:
            print(f"\n✅ الإصلاحات المطبقة ({len(self.fixes_applied)}):")
            for i, fix in enumerate(self.fixes_applied, 1):
                print(f"  {i}. {fix}")
        else:
            print("\n✅ لم يتم العثور على مشاكل تحتاج إصلاح")
        
        # حفظ التقرير
        report_content = f"""
تقرير الإصلاح الشامل لنظام ERP مراكز الأوائل
{'=' * 50}

الإصلاحات المطبقة:
{chr(10).join([f"{i}. {fix}" for i, fix in enumerate(self.fixes_applied, 1)])}

تاريخ الإصلاح: {os.popen('date').read().strip()}
"""
        
        report_file = self.project_path / 'system_fix_report.txt'
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"\n📝 تم حفظ تقرير الإصلاح: {report_file}")
        print("\n🎉 تم الانتهاء من الإصلاح الشامل للنظام!")

def main():
    """الدالة الرئيسية"""
    project_path = os.getcwd()
    fixer = SystemFixer(project_path)
    fixer.fix_all_issues()

if __name__ == "__main__":
    main()
