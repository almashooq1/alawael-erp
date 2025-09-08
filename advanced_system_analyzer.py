#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
محلل النظام المتقدم - فحص دقيق وشامل لجميع مكونات النظام
"""

import os
import ast
import re
import json
import sqlite3
from datetime import datetime
from collections import defaultdict, Counter
import traceback

class AdvancedSystemAnalyzer:
    def __init__(self):
        self.report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {},
            'files': {},
            'database': {},
            'models': {},
            'imports': {},
            'relationships': {},
            'issues': [],
            'warnings': [],
            'recommendations': [],
            'statistics': {}
        }
        
    def analyze_python_files(self):
        """تحليل جميع ملفات Python"""
        print("🔍 تحليل ملفات Python...")
        
        python_files = []
        for root, dirs, files in os.walk('.'):
            # تجاهل مجلدات معينة
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['__pycache__', 'venv', '.venv', 'node_modules']]
            
            for file in files:
                if file.endswith('.py'):
                    file_path = os.path.join(root, file)
                    python_files.append(file_path)
        
        total_files = len(python_files)
        syntax_errors = 0
        import_errors = 0
        total_lines = 0
        
        for file_path in python_files:
            file_info = self.analyze_single_file(file_path)
            self.report['files'][file_path] = file_info
            
            if not file_info['syntax_valid']:
                syntax_errors += 1
            if file_info['import_issues']:
                import_errors += 1
            total_lines += file_info['line_count']
        
        self.report['statistics']['python_files'] = {
            'total': total_files,
            'syntax_errors': syntax_errors,
            'import_errors': import_errors,
            'total_lines': total_lines,
            'average_lines': total_lines / total_files if total_files > 0 else 0
        }
        
        print(f"  📊 تم تحليل {total_files} ملف Python")
        print(f"  ❌ أخطاء بناء الجملة: {syntax_errors}")
        print(f"  ⚠️ مشاكل الاستيراد: {import_errors}")
        print(f"  📝 إجمالي الأسطر: {total_lines:,}")
        
        return total_files, syntax_errors, import_errors
    
    def analyze_single_file(self, file_path):
        """تحليل ملف واحد بالتفصيل"""
        file_info = {
            'path': file_path,
            'size': 0,
            'line_count': 0,
            'syntax_valid': False,
            'imports': [],
            'classes': [],
            'functions': [],
            'import_issues': [],
            'complexity_score': 0,
            'docstring_coverage': 0
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            file_info['size'] = len(content)
            file_info['line_count'] = len(content.split('\n'))
            
            # فحص بناء الجملة
            try:
                tree = ast.parse(content)
                file_info['syntax_valid'] = True
                
                # تحليل AST
                self.analyze_ast(tree, file_info)
                
            except SyntaxError as e:
                file_info['syntax_valid'] = False
                self.report['issues'].append({
                    'type': 'SYNTAX_ERROR',
                    'file': file_path,
                    'line': e.lineno,
                    'message': str(e)
                })
            
            # تحليل الاستيرادات
            self.analyze_imports(content, file_info)
            
            # حساب التعقيد
            file_info['complexity_score'] = self.calculate_complexity(content)
            
            # فحص التوثيق
            file_info['docstring_coverage'] = self.check_docstring_coverage(content)
            
        except Exception as e:
            self.report['issues'].append({
                'type': 'FILE_READ_ERROR',
                'file': file_path,
                'message': str(e)
            })
        
        return file_info
    
    def analyze_ast(self, tree, file_info):
        """تحليل شجرة AST"""
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                file_info['classes'].append({
                    'name': node.name,
                    'line': node.lineno,
                    'methods': len([n for n in node.body if isinstance(n, ast.FunctionDef)])
                })
            elif isinstance(node, ast.FunctionDef):
                file_info['functions'].append({
                    'name': node.name,
                    'line': node.lineno,
                    'args': len(node.args.args)
                })
    
    def analyze_imports(self, content, file_info):
        """تحليل الاستيرادات"""
        import_pattern = r'^(from\s+\S+\s+import\s+.+|import\s+.+)$'
        
        for line_num, line in enumerate(content.split('\n'), 1):
            line = line.strip()
            if re.match(import_pattern, line):
                file_info['imports'].append({
                    'line': line_num,
                    'statement': line
                })
    
    def calculate_complexity(self, content):
        """حساب تعقيد الكود"""
        complexity = 0
        
        # عدد الشروط والحلقات
        complexity += len(re.findall(r'\b(if|elif|for|while|try|except)\b', content))
        
        # عدد الدوال والكلاسات
        complexity += len(re.findall(r'\b(def|class)\b', content))
        
        # طول الأسطر
        lines = content.split('\n')
        long_lines = sum(1 for line in lines if len(line) > 100)
        complexity += long_lines * 0.1
        
        return round(complexity, 2)
    
    def check_docstring_coverage(self, content):
        """فحص تغطية التوثيق"""
        try:
            tree = ast.parse(content)
            total_items = 0
            documented_items = 0
            
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                    total_items += 1
                    if ast.get_docstring(node):
                        documented_items += 1
            
            return (documented_items / total_items * 100) if total_items > 0 else 0
        except:
            return 0
    
    def analyze_database_models(self):
        """تحليل نماذج قاعدة البيانات"""
        print("🔍 تحليل نماذج قاعدة البيانات...")
        
        if not os.path.exists('models.py'):
            self.report['issues'].append({
                'type': 'MISSING_FILE',
                'file': 'models.py',
                'message': 'ملف النماذج غير موجود'
            })
            return
        
        try:
            with open('models.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # البحث عن النماذج
            models = self.extract_models(content)
            self.report['models'] = models
            
            # فحص العلاقات
            relationships = self.analyze_relationships(content)
            self.report['relationships'] = relationships
            
            # فحص العلاقات المكررة
            duplicate_backrefs = self.find_duplicate_backrefs(content)
            if duplicate_backrefs:
                for backref, count in duplicate_backrefs.items():
                    self.report['issues'].append({
                        'type': 'DUPLICATE_BACKREF',
                        'file': 'models.py',
                        'message': f"علاقة مكررة: '{backref}' ({count} مرات)"
                    })
            
            print(f"  📊 تم العثور على {len(models)} نموذج")
            print(f"  🔗 تم العثور على {len(relationships)} علاقة")
            
        except Exception as e:
            self.report['issues'].append({
                'type': 'MODEL_ANALYSIS_ERROR',
                'file': 'models.py',
                'message': str(e)
            })
    
    def extract_models(self, content):
        """استخراج النماذج من الكود"""
        models = {}
        
        # البحث عن تعريفات الكلاسات
        class_pattern = r'class\s+(\w+)\(db\.Model\):'
        matches = re.finditer(class_pattern, content)
        
        for match in matches:
            model_name = match.group(1)
            start_pos = match.start()
            
            # استخراج محتوى الكلاس
            model_content = self.extract_class_content(content, start_pos)
            
            # تحليل الحقول
            fields = self.extract_model_fields(model_content)
            
            models[model_name] = {
                'name': model_name,
                'fields': fields,
                'field_count': len(fields),
                'has_primary_key': any(f.get('primary_key') for f in fields),
                'has_timestamps': any('created_at' in f['name'] or 'updated_at' in f['name'] for f in fields)
            }
        
        return models
    
    def extract_class_content(self, content, start_pos):
        """استخراج محتوى الكلاس"""
        lines = content[start_pos:].split('\n')
        class_lines = [lines[0]]  # السطر الأول (تعريف الكلاس)
        
        for line in lines[1:]:
            if line.strip() and not line.startswith(' ') and not line.startswith('\t'):
                break  # نهاية الكلاس
            class_lines.append(line)
        
        return '\n'.join(class_lines)
    
    def extract_model_fields(self, model_content):
        """استخراج حقول النموذج"""
        fields = []
        
        # البحث عن تعريفات الحقول
        field_pattern = r'(\w+)\s*=\s*db\.Column\(([^)]+)\)'
        matches = re.finditer(field_pattern, model_content)
        
        for match in matches:
            field_name = match.group(1)
            field_definition = match.group(2)
            
            field_info = {
                'name': field_name,
                'definition': field_definition,
                'primary_key': 'primary_key=True' in field_definition,
                'nullable': 'nullable=False' not in field_definition,
                'unique': 'unique=True' in field_definition
            }
            
            fields.append(field_info)
        
        return fields
    
    def analyze_relationships(self, content):
        """تحليل العلاقات"""
        relationships = []
        
        # البحث عن العلاقات
        relationship_pattern = r'(\w+)\s*=\s*db\.relationship\([^)]+\)'
        matches = re.finditer(relationship_pattern, content)
        
        for match in matches:
            rel_name = match.group(1)
            rel_definition = match.group(0)
            
            # استخراج backref
            backref_match = re.search(r"backref='([^']+)'", rel_definition)
            backref = backref_match.group(1) if backref_match else None
            
            relationships.append({
                'name': rel_name,
                'definition': rel_definition,
                'backref': backref
            })
        
        return relationships
    
    def find_duplicate_backrefs(self, content):
        """البحث عن العلاقات المكررة"""
        backref_pattern = r"backref='([^']+)'"
        matches = re.findall(backref_pattern, content)
        
        backref_counts = Counter(matches)
        return {k: v for k, v in backref_counts.items() if v > 1}
    
    def analyze_database_file(self):
        """تحليل ملف قاعدة البيانات"""
        print("🔍 تحليل قاعدة البيانات...")
        
        # البحث عن ملف قاعدة البيانات
        db_files = []
        for file in os.listdir('.'):
            if file.endswith('.db') or file.endswith('.sqlite') or file.endswith('.sqlite3'):
                db_files.append(file)
        
        if not db_files:
            self.report['warnings'].append({
                'type': 'NO_DATABASE_FILE',
                'message': 'لم يتم العثور على ملف قاعدة البيانات'
            })
            return
        
        for db_file in db_files:
            try:
                conn = sqlite3.connect(db_file)
                cursor = conn.cursor()
                
                # الحصول على قائمة الجداول
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                
                db_info = {
                    'file': db_file,
                    'size': os.path.getsize(db_file),
                    'tables': []
                }
                
                for table in tables:
                    table_name = table[0]
                    
                    # الحصول على معلومات الجدول
                    cursor.execute(f"PRAGMA table_info({table_name});")
                    columns = cursor.fetchall()
                    
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                    row_count = cursor.fetchone()[0]
                    
                    db_info['tables'].append({
                        'name': table_name,
                        'columns': len(columns),
                        'rows': row_count,
                        'column_details': columns
                    })
                
                self.report['database'][db_file] = db_info
                conn.close()
                
                print(f"  📊 قاعدة البيانات: {db_file}")
                print(f"  📋 الجداول: {len(tables)}")
                
            except Exception as e:
                self.report['issues'].append({
                    'type': 'DATABASE_ERROR',
                    'file': db_file,
                    'message': str(e)
                })
    
    def analyze_static_files(self):
        """تحليل الملفات الثابتة"""
        print("🔍 تحليل الملفات الثابتة...")
        
        static_info = {
            'css_files': [],
            'js_files': [],
            'html_files': [],
            'image_files': [],
            'other_files': []
        }
        
        # فحص مجلد static
        if os.path.exists('static'):
            for root, dirs, files in os.walk('static'):
                for file in files:
                    file_path = os.path.join(root, file)
                    file_size = os.path.getsize(file_path)
                    
                    file_info = {
                        'path': file_path,
                        'size': file_size
                    }
                    
                    if file.endswith('.css'):
                        static_info['css_files'].append(file_info)
                    elif file.endswith('.js'):
                        static_info['js_files'].append(file_info)
                    elif file.endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg')):
                        static_info['image_files'].append(file_info)
                    else:
                        static_info['other_files'].append(file_info)
        
        # فحص مجلد templates
        if os.path.exists('templates'):
            for root, dirs, files in os.walk('templates'):
                for file in files:
                    if file.endswith('.html'):
                        file_path = os.path.join(root, file)
                        file_size = os.path.getsize(file_path)
                        static_info['html_files'].append({
                            'path': file_path,
                            'size': file_size
                        })
        
        self.report['static_files'] = static_info
        
        total_static = (len(static_info['css_files']) + len(static_info['js_files']) + 
                       len(static_info['html_files']) + len(static_info['image_files']) + 
                       len(static_info['other_files']))
        
        print(f"  📊 إجمالي الملفات الثابتة: {total_static}")
        print(f"  🎨 ملفات CSS: {len(static_info['css_files'])}")
        print(f"  📜 ملفات JavaScript: {len(static_info['js_files'])}")
        print(f"  📄 ملفات HTML: {len(static_info['html_files'])}")
        print(f"  🖼️ ملفات الصور: {len(static_info['image_files'])}")
    
    def generate_recommendations(self):
        """توليد التوصيات"""
        print("💡 توليد التوصيات...")
        
        recommendations = []
        
        # توصيات بناءً على الأخطاء
        syntax_errors = len([i for i in self.report['issues'] if i['type'] == 'SYNTAX_ERROR'])
        if syntax_errors > 0:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'CODE_QUALITY',
                'message': f'إصلاح {syntax_errors} خطأ في بناء الجملة'
            })
        
        # توصيات بناءً على العلاقات المكررة
        duplicate_backrefs = len([i for i in self.report['issues'] if i['type'] == 'DUPLICATE_BACKREF'])
        if duplicate_backrefs > 0:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'DATABASE',
                'message': f'إصلاح {duplicate_backrefs} علاقة مكررة في قاعدة البيانات'
            })
        
        # توصيات بناءً على التوثيق
        if self.report['files']:
            avg_docstring = sum(f.get('docstring_coverage', 0) for f in self.report['files'].values()) / len(self.report['files'])
            if avg_docstring < 50:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'DOCUMENTATION',
                    'message': f'تحسين التوثيق - التغطية الحالية: {avg_docstring:.1f}%'
                })
        
        # توصيات بناءً على التعقيد
        if self.report['files']:
            high_complexity_files = [f for f in self.report['files'].values() if f.get('complexity_score', 0) > 20]
            if high_complexity_files:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'CODE_QUALITY',
                    'message': f'تبسيط {len(high_complexity_files)} ملف معقد'
                })
        
        self.report['recommendations'] = recommendations
        
        for rec in recommendations:
            priority_icon = "🔴" if rec['priority'] == 'HIGH' else "🟡" if rec['priority'] == 'MEDIUM' else "🟢"
            print(f"  {priority_icon} {rec['message']}")
    
    def generate_summary(self):
        """توليد الملخص"""
        stats = self.report['statistics']
        
        total_issues = len(self.report['issues'])
        total_warnings = len(self.report['warnings'])
        total_recommendations = len(self.report['recommendations'])
        
        # حساب النتيجة العامة
        max_score = 100
        score = max_score
        
        # خصم نقاط للأخطاء
        score -= total_issues * 10
        score -= total_warnings * 5
        
        # خصم نقاط للتعقيد العالي
        if self.report['files']:
            avg_complexity = sum(f.get('complexity_score', 0) for f in self.report['files'].values()) / len(self.report['files'])
            if avg_complexity > 15:
                score -= 10
        
        score = max(0, score)  # لا تقل عن صفر
        
        self.report['summary'] = {
            'overall_score': score,
            'health_status': 'ممتاز' if score >= 90 else 'جيد' if score >= 70 else 'يحتاج تحسين' if score >= 50 else 'يحتاج إصلاح عاجل',
            'total_files': stats.get('python_files', {}).get('total', 0),
            'total_issues': total_issues,
            'total_warnings': total_warnings,
            'total_recommendations': total_recommendations,
            'models_count': len(self.report['models']),
            'relationships_count': len(self.report['relationships'])
        }
    
    def save_report(self, filename='system_analysis_report.json'):
        """حفظ التقرير"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, ensure_ascii=False, indent=2)
        
        print(f"💾 تم حفظ التقرير في: {filename}")
    
    def print_detailed_report(self):
        """طباعة التقرير المفصل"""
        print("\n" + "=" * 80)
        print("📋 تقرير التحليل الشامل للنظام")
        print("=" * 80)
        
        summary = self.report['summary']
        
        print(f"🎯 النتيجة العامة: {summary['overall_score']}/100")
        print(f"📊 حالة النظام: {summary['health_status']}")
        print(f"📅 تاريخ التحليل: {self.report['timestamp']}")
        
        print(f"\n📈 الإحصائيات:")
        print(f"  📁 إجمالي الملفات: {summary['total_files']}")
        print(f"  🏗️ النماذج: {summary['models_count']}")
        print(f"  🔗 العلاقات: {summary['relationships_count']}")
        print(f"  ❌ المشاكل: {summary['total_issues']}")
        print(f"  ⚠️ التحذيرات: {summary['total_warnings']}")
        print(f"  💡 التوصيات: {summary['total_recommendations']}")
        
        # طباعة المشاكل الحرجة
        if self.report['issues']:
            print(f"\n❌ المشاكل الحرجة:")
            for issue in self.report['issues'][:10]:  # أول 10 مشاكل
                print(f"  - {issue['type']}: {issue['message']}")
                if 'file' in issue:
                    print(f"    الملف: {issue['file']}")
        
        # طباعة التوصيات
        if self.report['recommendations']:
            print(f"\n💡 التوصيات:")
            for rec in self.report['recommendations']:
                priority_icon = "🔴" if rec['priority'] == 'HIGH' else "🟡" if rec['priority'] == 'MEDIUM' else "🟢"
                print(f"  {priority_icon} {rec['message']}")
        
        print(f"\n📄 تم حفظ التقرير الكامل في: system_analysis_report.json")
    
    def run_complete_analysis(self):
        """تشغيل التحليل الكامل"""
        print("🚀 بدء التحليل الشامل للنظام...")
        print("=" * 60)
        
        try:
            # تحليل ملفات Python
            self.analyze_python_files()
            
            # تحليل نماذج قاعدة البيانات
            self.analyze_database_models()
            
            # تحليل قاعدة البيانات
            self.analyze_database_file()
            
            # تحليل الملفات الثابتة
            self.analyze_static_files()
            
            # توليد التوصيات
            self.generate_recommendations()
            
            # توليد الملخص
            self.generate_summary()
            
            # حفظ التقرير
            self.save_report()
            
            # طباعة التقرير
            self.print_detailed_report()
            
            return True
            
        except Exception as e:
            print(f"❌ خطأ في التحليل: {str(e)}")
            traceback.print_exc()
            return False

def main():
    """الدالة الرئيسية"""
    analyzer = AdvancedSystemAnalyzer()
    success = analyzer.run_complete_analysis()
    
    if success:
        print(f"\n🎉 تم إكمال التحليل بنجاح!")
    else:
        print(f"\n❌ فشل في إكمال التحليل")
    
    return success

if __name__ == "__main__":
    main()
