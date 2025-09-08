#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
محلل النظام الشامل - أداة فحص متقدمة لتحديد جميع المشاكل
Comprehensive System Analyzer - Advanced tool to identify all system issues
"""

import os
import ast
import re
import json
from collections import defaultdict
from datetime import datetime

class SystemAnalyzer:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.duplicates = []
        self.missing_imports = []
        self.syntax_errors = []
        self.model_issues = []
        self.api_issues = []
        self.ui_issues = []
        
    def analyze_python_file(self, file_path):
        """تحليل ملف Python للبحث عن المشاكل"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # فحص بناء الجملة
            try:
                ast.parse(content)
            except SyntaxError as e:
                self.syntax_errors.append({
                    'file': file_path,
                    'error': str(e),
                    'line': e.lineno if hasattr(e, 'lineno') else 'Unknown'
                })
                return
            
            # فحص الاستيرادات
            self.check_imports(file_path, content)
            
            # فحص النماذج
            if '_models.py' in file_path or file_path.endswith('models.py'):
                self.check_models(file_path, content)
            
            # فحص API endpoints
            if '_api.py' in file_path:
                self.check_api_endpoints(file_path, content)
                
        except Exception as e:
            self.issues.append({
                'type': 'file_read_error',
                'file': file_path,
                'error': str(e)
            })
    
    def check_imports(self, file_path, content):
        """فحص الاستيرادات والتبعيات"""
        lines = content.split('\n')
        imports = []
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            if line.startswith('import ') or line.startswith('from '):
                imports.append((i, line))
        
        # فحص الاستيرادات المفقودة الشائعة
        common_patterns = {
            'Flask': ['from flask import', 'import flask'],
            'SQLAlchemy': ['from flask_sqlalchemy import', 'from sqlalchemy import'],
            'JWT': ['from flask_jwt_extended import'],
            'database': ['from database import db', 'from .database import db']
        }
        
        for pattern_name, patterns in common_patterns.items():
            if any(pattern in content for pattern in patterns):
                continue
            
            # فحص إذا كان الملف يحتاج هذا الاستيراد
            if pattern_name == 'database' and ('db.' in content or 'db.Model' in content):
                self.missing_imports.append({
                    'file': file_path,
                    'missing': 'database import',
                    'suggestion': 'from database import db'
                })
    
    def check_models(self, file_path, content):
        """فحص نماذج قاعدة البيانات"""
        # فحص التعريفات المكررة
        class_pattern = r'class\s+(\w+)\s*\([^)]*\):'
        classes = re.findall(class_pattern, content)
        
        class_counts = defaultdict(int)
        for class_name in classes:
            class_counts[class_name] += 1
        
        for class_name, count in class_counts.items():
            if count > 1:
                self.duplicates.append({
                    'file': file_path,
                    'type': 'duplicate_class',
                    'name': class_name,
                    'count': count
                })
        
        # فحص استخدام db.Model
        if 'class ' in content and 'db.Model' in content:
            if 'from database import db' not in content and 'db = ' not in content:
                self.model_issues.append({
                    'file': file_path,
                    'issue': 'missing_db_import',
                    'description': 'يستخدم db.Model بدون استيراد db'
                })
    
    def check_api_endpoints(self, file_path, content):
        """فحص API endpoints"""
        # فحص Blueprint
        if '@' in content and 'route' in content:
            if 'Blueprint' not in content:
                self.api_issues.append({
                    'file': file_path,
                    'issue': 'missing_blueprint',
                    'description': 'يحتوي على routes بدون Blueprint'
                })
        
        # فحص JWT protection
        routes = re.findall(r'@\w+\.route\([^)]+\)', content)
        jwt_protected = '@jwt_required()' in content
        
        if routes and not jwt_protected:
            self.warnings.append({
                'file': file_path,
                'warning': 'no_jwt_protection',
                'description': 'API endpoints بدون حماية JWT'
            })
    
    def check_ui_files(self):
        """فحص ملفات واجهة المستخدم"""
        template_dir = 'templates'
        static_dir = 'static'
        
        if os.path.exists(template_dir):
            for file_name in os.listdir(template_dir):
                if file_name.endswith('.html'):
                    file_path = os.path.join(template_dir, file_name)
                    self.check_html_file(file_path)
        
        if os.path.exists(static_dir):
            for root, dirs, files in os.walk(static_dir):
                for file_name in files:
                    if file_name.endswith('.js'):
                        file_path = os.path.join(root, file_name)
                        self.check_js_file(file_path)
    
    def check_html_file(self, file_path):
        """فحص ملفات HTML"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # فحص الروابط المكسورة
            if 'href=' in content:
                links = re.findall(r'href=["\']([^"\']+)["\']', content)
                for link in links:
                    if link.startswith('/') and not link.startswith('//'):
                        # فحص الروابط الداخلية
                        if 'static/' in link:
                            static_file = link.replace('/static/', 'static/')
                            if not os.path.exists(static_file):
                                self.ui_issues.append({
                                    'file': file_path,
                                    'issue': 'broken_link',
                                    'link': link,
                                    'description': f'رابط مكسور: {link}'
                                })
                                
        except Exception as e:
            self.ui_issues.append({
                'file': file_path,
                'issue': 'read_error',
                'error': str(e)
            })
    
    def check_js_file(self, file_path):
        """فحص ملفات JavaScript"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # فحص أخطاء JavaScript الشائعة
            if 'console.log' in content:
                self.warnings.append({
                    'file': file_path,
                    'warning': 'debug_code',
                    'description': 'يحتوي على console.log (كود تطوير)'
                })
                
        except Exception as e:
            self.ui_issues.append({
                'file': file_path,
                'issue': 'read_error',
                'error': str(e)
            })
    
    def analyze_system(self):
        """تحليل النظام الكامل"""
        print("🔍 بدء التحليل الشامل للنظام...")
        
        # فحص ملفات Python
        for file_name in os.listdir('.'):
            if file_name.endswith('.py') and not file_name.startswith('__'):
                self.analyze_python_file(file_name)
        
        # فحص ملفات واجهة المستخدم
        self.check_ui_files()
        
        # فحص app.py الرئيسي
        self.check_main_app()
        
        return self.generate_report()
    
    def check_main_app(self):
        """فحص الملف الرئيسي app.py"""
        if not os.path.exists('app.py'):
            self.issues.append({
                'type': 'critical',
                'issue': 'missing_main_app',
                'description': 'ملف app.py الرئيسي غير موجود'
            })
            return
        
        try:
            with open('app.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # فحص التكوين الأساسي
            required_imports = [
                'from flask import Flask',
                'from database import db',
                'from flask_jwt_extended import JWTManager'
            ]
            
            for required_import in required_imports:
                if required_import not in content:
                    self.missing_imports.append({
                        'file': 'app.py',
                        'missing': required_import,
                        'type': 'critical'
                    })
            
            # فحص تسجيل Blueprints
            blueprint_pattern = r'app\.register_blueprint\((\w+)\)'
            blueprints = re.findall(blueprint_pattern, content)
            
            if len(blueprints) < 5:  # يجب أن يكون هناك عدة blueprints
                self.warnings.append({
                    'file': 'app.py',
                    'warning': 'few_blueprints',
                    'description': f'عدد قليل من Blueprints مسجلة: {len(blueprints)}'
                })
                
        except Exception as e:
            self.issues.append({
                'type': 'critical',
                'file': 'app.py',
                'error': str(e)
            })
    
    def generate_report(self):
        """توليد تقرير شامل"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_issues': len(self.issues),
                'syntax_errors': len(self.syntax_errors),
                'missing_imports': len(self.missing_imports),
                'duplicates': len(self.duplicates),
                'model_issues': len(self.model_issues),
                'api_issues': len(self.api_issues),
                'ui_issues': len(self.ui_issues),
                'warnings': len(self.warnings)
            },
            'details': {
                'critical_issues': self.issues,
                'syntax_errors': self.syntax_errors,
                'missing_imports': self.missing_imports,
                'duplicates': self.duplicates,
                'model_issues': self.model_issues,
                'api_issues': self.api_issues,
                'ui_issues': self.ui_issues,
                'warnings': self.warnings
            }
        }
        
        return report
    
    def print_report(self, report):
        """طباعة التقرير"""
        print("\n" + "="*80)
        print("📊 تقرير التحليل الشامل للنظام")
        print("="*80)
        
        summary = report['summary']
        print(f"📅 وقت التحليل: {report['timestamp']}")
        print(f"🔴 مشاكل حرجة: {summary['total_issues']}")
        print(f"❌ أخطاء بناء الجملة: {summary['syntax_errors']}")
        print(f"📦 استيرادات مفقودة: {summary['missing_imports']}")
        print(f"🔄 تكرارات: {summary['duplicates']}")
        print(f"🗃️ مشاكل النماذج: {summary['model_issues']}")
        print(f"🌐 مشاكل API: {summary['api_issues']}")
        print(f"🎨 مشاكل واجهة المستخدم: {summary['ui_issues']}")
        print(f"⚠️ تحذيرات: {summary['warnings']}")
        
        # طباعة التفاصيل
        details = report['details']
        
        if details['syntax_errors']:
            print(f"\n❌ أخطاء بناء الجملة ({len(details['syntax_errors'])}):")
            for error in details['syntax_errors']:
                print(f"  📄 {error['file']} (السطر {error['line']}): {error['error']}")
        
        if details['missing_imports']:
            print(f"\n📦 استيرادات مفقودة ({len(details['missing_imports'])}):")
            for imp in details['missing_imports']:
                print(f"  📄 {imp['file']}: {imp.get('suggestion', imp['missing'])}")
        
        if details['duplicates']:
            print(f"\n🔄 تكرارات ({len(details['duplicates'])}):")
            for dup in details['duplicates']:
                print(f"  📄 {dup['file']}: {dup['name']} ({dup['count']} مرات)")
        
        if details['model_issues']:
            print(f"\n🗃️ مشاكل النماذج ({len(details['model_issues'])}):")
            for issue in details['model_issues']:
                print(f"  📄 {issue['file']}: {issue['description']}")
        
        if details['api_issues']:
            print(f"\n🌐 مشاكل API ({len(details['api_issues'])}):")
            for issue in details['api_issues']:
                print(f"  📄 {issue['file']}: {issue['description']}")
        
        if details['ui_issues']:
            print(f"\n🎨 مشاكل واجهة المستخدم ({len(details['ui_issues'])}):")
            for issue in details['ui_issues']:
                print(f"  📄 {issue['file']}: {issue.get('description', issue.get('error', 'مشكلة غير محددة'))}")
        
        # حساب نسبة صحة النظام
        total_problems = sum(summary.values()) - summary['warnings']
        if total_problems == 0:
            health_score = 100
            status = "🟢 ممتاز"
        elif total_problems <= 5:
            health_score = 85
            status = "🟡 جيد - يحتاج تحسينات طفيفة"
        elif total_problems <= 15:
            health_score = 60
            status = "🟠 متوسط - يحتاج إصلاحات"
        else:
            health_score = 30
            status = "🔴 ضعيف - يحتاج إصلاحات شاملة"
        
        print(f"\n📊 نتيجة صحة النظام: {health_score}% - {status}")
        print("="*80)
        
        return health_score

def main():
    analyzer = SystemAnalyzer()
    report = analyzer.analyze_system()
    health_score = analyzer.print_report(report)
    
    # حفظ التقرير
    with open('system_analysis_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 تم حفظ التقرير المفصل في: system_analysis_report.json")
    return health_score

if __name__ == "__main__":
    main()
