#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
أداة تحليل النظام الشاملة
Comprehensive System Analyzer for Al-Awael ERP
"""

import os
import re
import ast
import sys
from collections import defaultdict, Counter
from pathlib import Path

class SystemAnalyzer:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.errors = []
        self.duplicates = []
        self.warnings = []
        self.imports = defaultdict(list)
        self.models = {}
        self.apis = {}
        
    def analyze_all(self):
        """تحليل شامل للنظام"""
        print("🔍 بدء التحليل الشامل للنظام...")
        print("=" * 60)
        
        # تحليل ملفات Python
        self.analyze_python_files()
        
        # تحليل ملفات JavaScript
        self.analyze_javascript_files()
        
        # تحليل ملفات التكوين
        self.analyze_config_files()
        
        # إنشاء التقرير
        self.generate_report()
        
        # إنشاء ملفات الإصلاح
        self.generate_fixes()
        
    def analyze_python_files(self):
        """تحليل ملفات Python"""
        print("📄 تحليل ملفات Python...")
        
        python_files = list(self.project_path.glob("*.py"))
        
        for file_path in python_files:
            if file_path.name.startswith('.'):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                self.analyze_python_file(file_path, content)
                
            except Exception as e:
                self.errors.append(f"خطأ في قراءة {file_path}: {e}")
    
    def analyze_python_file(self, file_path, content):
        """تحليل ملف Python واحد"""
        try:
            # تحليل الاستيرادات
            imports = re.findall(r'^(?:from\s+[\w.]+\s+)?import\s+(.+)$', content, re.MULTILINE)
            for imp in imports:
                self.imports[str(file_path)].extend([i.strip() for i in imp.split(',')])
            
            # البحث عن التكرار في الاستيرادات
            file_imports = self.imports[str(file_path)]
            duplicated_imports = [item for item, count in Counter(file_imports).items() if count > 1]
            
            if duplicated_imports:
                self.duplicates.append({
                    'file': str(file_path),
                    'type': 'imports',
                    'items': duplicated_imports
                })
            
            # تحليل النماذج
            if 'models' in file_path.name:
                self.analyze_models(file_path, content)
            
            # تحليل APIs
            if 'api' in file_path.name:
                self.analyze_apis(file_path, content)
                
            # البحث عن أخطاء شائعة
            self.find_common_errors(file_path, content)
            
        except Exception as e:
            self.errors.append(f"خطأ في تحليل {file_path}: {e}")
    
    def analyze_models(self, file_path, content):
        """تحليل نماذج قاعدة البيانات"""
        # البحث عن تعريفات النماذج
        model_classes = re.findall(r'class\s+(\w+)\(db\.Model\):', content)
        
        for model in model_classes:
            self.models[model] = {
                'file': str(file_path),
                'relationships': [],
                'foreign_keys': []
            }
            
            # البحث عن العلاقات
            relationships = re.findall(rf'class\s+{model}.*?(?=class|\Z)', content, re.DOTALL)
            if relationships:
                model_content = relationships[0]
                
                # العلاقات
                rels = re.findall(r'(\w+)\s*=\s*db\.relationship\([\'"](\w+)[\'"]', model_content)
                self.models[model]['relationships'] = rels
                
                # المفاتيح الخارجية
                fks = re.findall(r'(\w+)\s*=\s*db\.Column\([^,]*db\.ForeignKey\([\'"]([^\'\"]+)[\'"]', model_content)
                self.models[model]['foreign_keys'] = fks
        
        # البحث عن العلاقات المكررة
        for model, data in self.models.items():
            rel_names = [rel[0] for rel in data['relationships']]
            duplicated_rels = [item for item, count in Counter(rel_names).items() if count > 1]
            
            if duplicated_rels:
                self.duplicates.append({
                    'file': str(file_path),
                    'type': 'relationships',
                    'model': model,
                    'items': duplicated_rels
                })
    
    def analyze_apis(self, file_path, content):
        """تحليل ملفات API"""
        # البحث عن تعريفات Blueprint
        blueprints = re.findall(r'(\w+)\s*=\s*Blueprint\([\'"]([^\'\"]+)[\'"].*?url_prefix=[\'"]([^\'\"]+)[\'"]', content)
        
        for bp_var, bp_name, url_prefix in blueprints:
            self.apis[bp_name] = {
                'file': str(file_path),
                'variable': bp_var,
                'url_prefix': url_prefix,
                'routes': []
            }
        
        # البحث عن المسارات
        routes = re.findall(r'@(\w+)\.route\([\'"]([^\'\"]+)[\'"]', content)
        
        for bp_var, route in routes:
            # العثور على Blueprint المطابق
            for bp_name, data in self.apis.items():
                if data['variable'] == bp_var:
                    data['routes'].append(route)
                    break
    
    def find_common_errors(self, file_path, content):
        """البحث عن الأخطاء الشائعة"""
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            # أخطاء الاستيراد
            if 'import' in line and 'from' in line:
                if line.count('import') > 1:
                    self.errors.append(f"{file_path}:{i} - استيراد مكرر في نفس السطر")
            
            # أخطاء العلاقات
            if 'db.relationship' in line:
                if 'backref=' in line and 'back_populates=' in line:
                    self.errors.append(f"{file_path}:{i} - استخدام backref و back_populates معاً")
            
            # أخطاء التسمية
            if re.search(r'@\w+\.route', line):
                if not re.search(r'@\w+_bp\.route|@app\.route', line):
                    self.warnings.append(f"{file_path}:{i} - تسمية Blueprint غير متسقة")
    
    def analyze_javascript_files(self):
        """تحليل ملفات JavaScript"""
        print("📄 تحليل ملفات JavaScript...")
        
        js_files = list(self.project_path.glob("static/js/*.js"))
        
        for file_path in js_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # البحث عن الدوال المكررة
                functions = re.findall(r'function\s+(\w+)\s*\(', content)
                duplicated_functions = [item for item, count in Counter(functions).items() if count > 1]
                
                if duplicated_functions:
                    self.duplicates.append({
                        'file': str(file_path),
                        'type': 'functions',
                        'items': duplicated_functions
                    })
                
                # البحث عن المتغيرات غير المعرفة
                if 'makeRequest' in content and 'function makeRequest' not in content:
                    self.errors.append(f"{file_path} - دالة makeRequest غير معرفة")
                
                if 'showAlert' in content and 'function showAlert' not in content:
                    self.errors.append(f"{file_path} - دالة showAlert غير معرفة")
                    
            except Exception as e:
                self.errors.append(f"خطأ في قراءة {file_path}: {e}")
    
    def analyze_config_files(self):
        """تحليل ملفات التكوين"""
        print("📄 تحليل ملفات التكوين...")
        
        # تحليل requirements.txt
        req_file = self.project_path / 'requirements.txt'
        if req_file.exists():
            try:
                with open(req_file, 'r', encoding='utf-8') as f:
                    requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
                
                # البحث عن التكرار
                packages = [req.split('==')[0] for req in requirements]
                duplicated_packages = [item for item, count in Counter(packages).items() if count > 1]
                
                if duplicated_packages:
                    self.duplicates.append({
                        'file': str(req_file),
                        'type': 'packages',
                        'items': duplicated_packages
                    })
                    
            except Exception as e:
                self.errors.append(f"خطأ في قراءة requirements.txt: {e}")
    
    def generate_report(self):
        """إنشاء تقرير التحليل"""
        print("\n" + "=" * 60)
        print("📊 تقرير التحليل الشامل")
        print("=" * 60)
        
        # الأخطاء
        if self.errors:
            print(f"\n❌ الأخطاء المكتشفة ({len(self.errors)}):")
            for i, error in enumerate(self.errors, 1):
                print(f"  {i}. {error}")
        
        # التكرار
        if self.duplicates:
            print(f"\n🔄 التكرار المكتشف ({len(self.duplicates)}):")
            for i, dup in enumerate(self.duplicates, 1):
                print(f"  {i}. {dup['file']} - {dup['type']}: {', '.join(dup['items'])}")
        
        # التحذيرات
        if self.warnings:
            print(f"\n⚠️ التحذيرات ({len(self.warnings)}):")
            for i, warning in enumerate(self.warnings, 1):
                print(f"  {i}. {warning}")
        
        # النماذج
        if self.models:
            print(f"\n📋 النماذج المكتشفة ({len(self.models)}):")
            for model, data in self.models.items():
                print(f"  - {model}: {len(data['relationships'])} علاقات, {len(data['foreign_keys'])} مفاتيح خارجية")
        
        # APIs
        if self.apis:
            print(f"\n🔗 APIs المكتشفة ({len(self.apis)}):")
            for api, data in self.apis.items():
                print(f"  - {api}: {data['url_prefix']} ({len(data['routes'])} مسار)")
        
        print(f"\n✅ تم الانتهاء من التحليل")
        print(f"📁 الملفات المحللة: {len(list(self.project_path.glob('*.py')))} Python, {len(list(self.project_path.glob('static/js/*.js')))} JavaScript")
    
    def generate_fixes(self):
        """إنشاء ملفات الإصلاح"""
        print("\n🔧 إنشاء ملفات الإصلاح...")
        
        fixes = []
        
        # إصلاحات للتكرار
        for dup in self.duplicates:
            if dup['type'] == 'imports':
                fixes.append(f"# إزالة الاستيرادات المكررة من {dup['file']}")
                fixes.append(f"# المكررات: {', '.join(dup['items'])}")
                fixes.append("")
            
            elif dup['type'] == 'packages':
                fixes.append(f"# إزالة الحزم المكررة من requirements.txt")
                fixes.append(f"# المكررات: {', '.join(dup['items'])}")
                fixes.append("")
        
        # إصلاحات للأخطاء
        for error in self.errors:
            fixes.append(f"# إصلاح: {error}")
            fixes.append("")
        
        # حفظ ملف الإصلاحات
        fixes_file = self.project_path / 'system_fixes.txt'
        with open(fixes_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(fixes))
        
        print(f"📝 تم حفظ ملف الإصلاحات: {fixes_file}")

def main():
    """الدالة الرئيسية"""
    project_path = os.getcwd()
    analyzer = SystemAnalyzer(project_path)
    analyzer.analyze_all()

if __name__ == "__main__":
    main()
