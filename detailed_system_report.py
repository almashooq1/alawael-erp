#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
تقرير النظام المفصل - فحص دقيق وتقرير شامل
"""

import os
import ast
import re
from datetime import datetime
from collections import defaultdict, Counter

def check_syntax_errors():
    """فحص أخطاء بناء الجملة"""
    print("🔍 فحص أخطاء بناء الجملة...")
    
    python_files = [f for f in os.listdir('.') if f.endswith('.py')]
    syntax_errors = []
    valid_files = []
    
    for file_path in python_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            ast.parse(content)
            valid_files.append(file_path)
        except SyntaxError as e:
            syntax_errors.append({
                'file': file_path,
                'line': e.lineno,
                'error': str(e)
            })
        except Exception as e:
            syntax_errors.append({
                'file': file_path,
                'line': 'N/A',
                'error': f'خطأ في قراءة الملف: {str(e)}'
            })
    
    print(f"  ✅ ملفات سليمة: {len(valid_files)}")
    print(f"  ❌ ملفات بها أخطاء: {len(syntax_errors)}")
    
    return valid_files, syntax_errors

def analyze_models_file():
    """تحليل ملف النماذج"""
    print("🔍 تحليل ملف models.py...")
    
    if not os.path.exists('models.py'):
        return {'error': 'ملف models.py غير موجود'}
    
    try:
        with open('models.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # البحث عن النماذج
        models = re.findall(r'class\s+(\w+)\(db\.Model\):', content)
        
        # البحث عن العلاقات
        relationships = re.findall(r'(\w+)\s*=\s*db\.relationship\([^)]+\)', content)
        
        # البحث عن العلاقات المكررة
        backref_pattern = r"backref='([^']+)'"
        backrefs = re.findall(backref_pattern, content)
        backref_counts = Counter(backrefs)
        duplicate_backrefs = {k: v for k, v in backref_counts.items() if v > 1}
        
        # حساب الأسطر
        lines = len(content.split('\n'))
        
        analysis = {
            'models_count': len(models),
            'models': models,
            'relationships_count': len(relationships),
            'duplicate_backrefs': duplicate_backrefs,
            'total_lines': lines,
            'file_size': len(content)
        }
        
        print(f"  📊 النماذج: {len(models)}")
        print(f"  🔗 العلاقات: {len(relationships)}")
        print(f"  ⚠️ علاقات مكررة: {len(duplicate_backrefs)}")
        
        return analysis
        
    except Exception as e:
        return {'error': f'خطأ في تحليل models.py: {str(e)}'}

def check_core_files():
    """فحص الملفات الأساسية"""
    print("🔍 فحص الملفات الأساسية...")
    
    core_files = {
        'app.py': 'التطبيق الرئيسي',
        'models.py': 'نماذج قاعدة البيانات',
        'database.py': 'إعدادات قاعدة البيانات',
        'requirements.txt': 'متطلبات النظام',
        '.env': 'متغيرات البيئة'
    }
    
    file_status = {}
    
    for file_path, description in core_files.items():
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            file_status[file_path] = {
                'exists': True,
                'size': size,
                'description': description
            }
            print(f"  ✅ {file_path}: {size:,} بايت")
        else:
            file_status[file_path] = {
                'exists': False,
                'size': 0,
                'description': description
            }
            print(f"  ❌ {file_path}: غير موجود")
    
    return file_status

def check_directories():
    """فحص المجلدات المهمة"""
    print("🔍 فحص المجلدات...")
    
    important_dirs = ['static', 'templates', 'uploads']
    dir_status = {}
    
    for dir_name in important_dirs:
        if os.path.exists(dir_name):
            files_count = len([f for f in os.listdir(dir_name) if os.path.isfile(os.path.join(dir_name, f))])
            subdirs_count = len([d for d in os.listdir(dir_name) if os.path.isdir(os.path.join(dir_name, d))])
            
            dir_status[dir_name] = {
                'exists': True,
                'files': files_count,
                'subdirs': subdirs_count
            }
            print(f"  ✅ {dir_name}: {files_count} ملف، {subdirs_count} مجلد فرعي")
        else:
            dir_status[dir_name] = {
                'exists': False,
                'files': 0,
                'subdirs': 0
            }
            print(f"  ❌ {dir_name}: غير موجود")
    
    return dir_status

def analyze_database():
    """تحليل قاعدة البيانات"""
    print("🔍 تحليل قاعدة البيانات...")
    
    db_files = [f for f in os.listdir('.') if f.endswith(('.db', '.sqlite', '.sqlite3'))]
    
    if not db_files:
        print("  ⚠️ لم يتم العثور على ملف قاعدة البيانات")
        return {'exists': False}
    
    db_info = {}
    for db_file in db_files:
        size = os.path.getsize(db_file)
        db_info[db_file] = {
            'size': size,
            'exists': True
        }
        print(f"  ✅ {db_file}: {size:,} بايت")
    
    return db_info

def count_code_statistics():
    """إحصائيات الكود"""
    print("🔍 حساب إحصائيات الكود...")
    
    python_files = [f for f in os.listdir('.') if f.endswith('.py')]
    
    total_lines = 0
    total_files = len(python_files)
    total_size = 0
    
    file_details = []
    
    for file_path in python_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = len(content.split('\n'))
            size = len(content)
            
            total_lines += lines
            total_size += size
            
            file_details.append({
                'file': file_path,
                'lines': lines,
                'size': size
            })
            
        except Exception:
            continue
    
    # ترتيب الملفات حسب الحجم
    file_details.sort(key=lambda x: x['size'], reverse=True)
    
    print(f"  📊 إجمالي الملفات: {total_files}")
    print(f"  📝 إجمالي الأسطر: {total_lines:,}")
    print(f"  💾 إجمالي الحجم: {total_size:,} بايت")
    
    return {
        'total_files': total_files,
        'total_lines': total_lines,
        'total_size': total_size,
        'largest_files': file_details[:10]  # أكبر 10 ملفات
    }

def generate_system_score():
    """حساب نتيجة النظام"""
    score = 100
    issues = []
    
    # فحص الملفات الأساسية
    core_files = check_core_files()
    missing_core = sum(1 for f in core_files.values() if not f['exists'])
    if missing_core > 0:
        score -= missing_core * 15
        issues.append(f"ملفات أساسية مفقودة: {missing_core}")
    
    # فحص أخطاء بناء الجملة
    valid_files, syntax_errors = check_syntax_errors()
    if syntax_errors:
        score -= len(syntax_errors) * 10
        issues.append(f"أخطاء بناء الجملة: {len(syntax_errors)}")
    
    # فحص النماذج
    models_analysis = analyze_models_file()
    if 'error' in models_analysis:
        score -= 20
        issues.append("مشكلة في ملف النماذج")
    elif models_analysis.get('duplicate_backrefs'):
        score -= len(models_analysis['duplicate_backrefs']) * 5
        issues.append(f"علاقات مكررة: {len(models_analysis['duplicate_backrefs'])}")
    
    score = max(0, score)  # لا تقل عن صفر
    
    return score, issues

def create_detailed_report():
    """إنشاء التقرير المفصل"""
    print("=" * 80)
    print("📋 تقرير النظام الشامل - نظام ERP مراكز الأوائل")
    print("=" * 80)
    print(f"📅 تاريخ التقرير: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # حساب النتيجة العامة
    score, issues = generate_system_score()
    
    print(f"\n🎯 النتيجة العامة: {score}/100")
    
    if score >= 90:
        status = "ممتاز 🎉"
    elif score >= 75:
        status = "جيد جداً ✅"
    elif score >= 60:
        status = "جيد ⚠️"
    else:
        status = "يحتاج تحسين ❌"
    
    print(f"📊 حالة النظام: {status}")
    
    # تفاصيل الفحص
    print(f"\n" + "=" * 50)
    print("📋 تفاصيل الفحص")
    print("=" * 50)
    
    # 1. فحص بناء الجملة
    valid_files, syntax_errors = check_syntax_errors()
    
    # 2. فحص الملفات الأساسية
    core_files = check_core_files()
    
    # 3. فحص المجلدات
    directories = check_directories()
    
    # 4. تحليل النماذج
    models_analysis = analyze_models_file()
    
    # 5. تحليل قاعدة البيانات
    database_info = analyze_database()
    
    # 6. إحصائيات الكود
    code_stats = count_code_statistics()
    
    # ملخص المشاكل
    if issues:
        print(f"\n❌ المشاكل المكتشفة:")
        for issue in issues:
            print(f"  - {issue}")
    
    if syntax_errors:
        print(f"\n🔍 تفاصيل أخطاء بناء الجملة:")
        for error in syntax_errors[:5]:  # أول 5 أخطاء
            print(f"  - {error['file']}: السطر {error['line']} - {error['error']}")
    
    # التوصيات
    print(f"\n💡 التوصيات:")
    
    if syntax_errors:
        print(f"  🔴 عالية الأولوية: إصلاح {len(syntax_errors)} خطأ في بناء الجملة")
    
    if models_analysis.get('duplicate_backrefs'):
        print(f"  🔴 عالية الأولوية: إصلاح {len(models_analysis['duplicate_backrefs'])} علاقة مكررة")
    
    missing_core = sum(1 for f in core_files.values() if not f['exists'])
    if missing_core > 0:
        print(f"  🟡 متوسطة الأولوية: إنشاء {missing_core} ملف أساسي مفقود")
    
    missing_dirs = sum(1 for d in directories.values() if not d['exists'])
    if missing_dirs > 0:
        print(f"  🟢 منخفضة الأولوية: إنشاء {missing_dirs} مجلد مفقود")
    
    if score >= 90:
        print(f"  ✅ النظام في حالة ممتازة!")
    
    # حفظ التقرير في ملف
    report_content = f"""
تقرير النظام الشامل - نظام ERP مراكز الأوائل
=============================================
تاريخ التقرير: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

النتيجة العامة: {score}/100
حالة النظام: {status}

إحصائيات عامة:
- إجمالي ملفات Python: {code_stats['total_files']}
- إجمالي الأسطر: {code_stats['total_lines']:,}
- إجمالي الحجم: {code_stats['total_size']:,} بايت
- النماذج: {models_analysis.get('models_count', 0)}
- العلاقات: {models_analysis.get('relationships_count', 0)}

المشاكل:
{chr(10).join(f'- {issue}' for issue in issues) if issues else 'لا توجد مشاكل حرجة'}

أخطاء بناء الجملة:
{chr(10).join(f'- {error["file"]}: السطر {error["line"]} - {error["error"]}' for error in syntax_errors) if syntax_errors else 'لا توجد أخطاء'}

الملفات الأساسية:
{chr(10).join(f'- {file}: {"موجود" if info["exists"] else "مفقود"}' for file, info in core_files.items())}

المجلدات:
{chr(10).join(f'- {dir_name}: {"موجود" if info["exists"] else "مفقود"}' for dir_name, info in directories.items())}
"""
    
    with open('system_report.txt', 'w', encoding='utf-8') as f:
        f.write(report_content)
    
    print(f"\n💾 تم حفظ التقرير المفصل في: system_report.txt")
    
    return {
        'score': score,
        'status': status,
        'issues': issues,
        'syntax_errors': len(syntax_errors),
        'models_count': models_analysis.get('models_count', 0),
        'total_files': code_stats['total_files']
    }

if __name__ == "__main__":
    report = create_detailed_report()
    print(f"\n🎉 تم إكمال التحليل الشامل للنظام!")
