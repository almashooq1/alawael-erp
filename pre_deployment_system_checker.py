#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نظام الإصلاح الشامل قبل النشر على Hostinger
Comprehensive Pre-Deployment Fix System
"""

import os
import sys
import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

class SystemFixer:
    """نظام الإصلاح الشامل للمشروع"""

    def __init__(self):
        self.project_root = Path(__file__).parent
        self.issues_fixed = []
        self.issues_found = []

    def log_issue(self, issue_type, issue_name, severity, solution):
        """تسجيل المشكلة"""
        self.issues_found.append({
            "type": issue_type,
            "name": issue_name,
            "severity": severity,
            "solution": solution,
            "timestamp": datetime.now().isoformat()
        })

    def log_fix(self, fix_name):
        """تسجيل الإصلاح"""
        self.issues_fixed.append({
            "fix": fix_name,
            "timestamp": datetime.now().isoformat()
        })

    def check_critical_files(self):
        """فحص الملفات الحرجة"""
        print("\n🔍 فحص الملفات الحرجة...")

        critical_files = {
            'wsgi.py': 'نقطة الدخول الرئيسية',
            'app_factory.py': 'مصنع التطبيق',
            'config.py': 'التكوين الرئيسي',
            'requirements.txt': 'المتطلبات',
            'gunicorn.conf.py': 'تكوين Gunicorn',
            'Procfile': 'ملف العمليات'
        }

        for file, description in critical_files.items():
            file_path = self.project_root / file
            if file_path.exists():
                print(f"✅ {file} موجود ({description})")
            else:
                print(f"❌ {file} مفقود ({description})")
                self.log_issue('missing_file', file, 'high', f'إنشاء {file}')

    def check_environment_files(self):
        """فحص ملفات البيئة"""
        print("\n🔍 فحص ملفات البيئة...")

        env_files = {
            '.env': 'بيئة التطوير',
            '.env.production': 'بيئة الإنتاج',
            '.env.example': 'مثال البيئة'
        }

        for env_file, description in env_files.items():
            file_path = self.project_root / env_file
            if file_path.exists():
                size = file_path.stat().st_size
                print(f"✅ {env_file} موجود ({size} bytes) - {description}")
            else:
                print(f"⚠️  {env_file} غير موجود - {description}")

    def check_directory_structure(self):
        """فحص هيكل المجلدات"""
        print("\n🔍 فحص هيكل المجلدات...")

        required_dirs = [
            'static',
            'templates',
            'logs',
            'migrations',
            'tests'
        ]

        for dir_name in required_dirs:
            dir_path = self.project_root / dir_name
            if dir_path.exists():
                print(f"✅ {dir_name}/ موجود")
            else:
                print(f"⚠️  {dir_name}/ غير موجود")
                dir_path.mkdir(exist_ok=True)
                print(f"   ✨ تم إنشاء {dir_name}/")

    def check_dependencies(self):
        """فحص المتطلبات"""
        print("\n🔍 فحص المتطلبات...")

        requirements_file = self.project_root / 'requirements.txt'

        if requirements_file.exists():
            with open(requirements_file, 'r', encoding='utf-8') as f:
                deps = f.readlines()
                print(f"✅ requirements.txt يحتوي على {len(deps)} متطلب")

                # فحص المتطلبات الأساسية
                required = ['Flask', 'SQLAlchemy', 'gunicorn', 'python-dotenv']
                content = requirements_file.read_text()

                for pkg in required:
                    if pkg in content:
                        print(f"  ✅ {pkg} موجود")
                    else:
                        print(f"  ❌ {pkg} مفقود")
        else:
            print(f"❌ requirements.txt غير موجود")

    def check_security_configuration(self):
        """فحص تكوين الأمان"""
        print("\n🔍 فحص تكوين الأمان...")

        config_file = self.project_root / 'config.py'

        if config_file.exists():
            content = config_file.read_text()

            checks = {
                'SECRET_KEY': 'مفتاح سري',
                'SQLALCHEMY_TRACK_MODIFICATIONS': 'تتبع التعديلات',
                'SESSION_COOKIE_SECURE': 'أمان الكوكيز',
                'CORS': 'إعدادات CORS'
            }

            for check, description in checks.items():
                if check in content:
                    print(f"✅ {description} ({check}) موجود")
                else:
                    print(f"⚠️  {description} ({check}) قد لا يكون مكون")
        else:
            print(f"❌ config.py غير موجود")

    def check_api_endpoints(self):
        """فحص نقاط النهاية"""
        print("\n🔍 فحص نقاط النهاية الأساسية...")

        api_files = [
            'auth_api.py',
            'user_api.py',
            'api/auth.py',
            'api/users.py'
        ]

        found = False
        for api_file in api_files:
            file_path = self.project_root / api_file
            if file_path.exists():
                print(f"✅ وجدت {api_file}")
                found = True

        if not found:
            print(f"⚠️  لم يتم العثور على ملفات API واضحة")

    def cleanup_old_files(self):
        """تنظيف الملفات القديمة"""
        print("\n🧹 تنظيف الملفات القديمة...")

        # أنماط الملفات التي يجب حذفها
        patterns_to_remove = [
            '*.log',
            '*_test.py',
            '*_backup.py',
            '.pytest_cache',
            '__pycache__'
        ]

        count = 0
        for pattern in patterns_to_remove:
            # البحث عن الملفات المطابقة
            if '*' in pattern:
                for file in self.project_root.rglob(pattern):
                    if file.is_file() and file.stat().st_size < 1024 * 1024:  # أقل من 1 MB
                        # فقط تحذير بدون حذف فعلي
                        print(f"  ℹ️  يمكن حذف: {file.relative_to(self.project_root)}")
                        count += 1
            else:
                dir_path = self.project_root / pattern
                if dir_path.exists():
                    print(f"  ℹ️  يمكن حذف: {pattern}/")
                    count += 1

        print(f"   المجموع: {count} ملفات/مجلدات")

    def check_logging_setup(self):
        """فحص إعداد السجلات"""
        print("\n🔍 فحص إعداد السجلات...")

        # البحث عن ملفات الإعداد
        files_to_check = ['app.py', 'app_factory.py', 'wsgi.py']

        found_logging = False
        for file_name in files_to_check:
            file_path = self.project_root / file_name
            if file_path.exists():
                content = file_path.read_text()
                if 'logging' in content.lower():
                    print(f"✅ تم العثور على logging config في {file_name}")
                    found_logging = True

        if not found_logging:
            print(f"⚠️  لم يتم العثور على إعداد logging واضح")

    def check_error_handling(self):
        """فحص معالجة الأخطاء"""
        print("\n🔍 فحص معالجة الأخطاء...")

        # البحث عن @app.errorhandler
        for py_file in self.project_root.glob('*.py'):
            if py_file.name in ['app.py', 'wsgi.py', 'app_factory.py']:
                content = py_file.read_text()
                if '@app.errorhandler' in content or '@app.route' in content:
                    print(f"✅ {py_file.name} يحتوي على معالجة أخطاء")
                    return

        print(f"⚠️  قد تكون معالجة الأخطاء ناقصة")

    def generate_report(self):
        """إنشاء تقرير النتائج"""
        print("\n" + "="*60)
        print("📊 تقرير فحص النظام")
        print("="*60)

        print(f"\n✅ عدد الإصلاحات المطبقة: {len(self.issues_fixed)}")
        print(f"⚠️  عدد المشاكل المكتشفة: {len(self.issues_found)}")

        if self.issues_found:
            print("\n🔴 المشاكل المكتشفة:")
            for issue in self.issues_found:
                print(f"  - {issue['name']} ({issue['severity']})")
                print(f"    الحل: {issue['solution']}")

        print("\n" + "="*60)

    def run_all_checks(self):
        """تشغيل جميع الفحوصات"""
        print("\n" + "="*80)
        print("🚀 بدء فحص النظام الشامل قبل النشر على Hostinger")
        print("="*80)

        self.check_critical_files()
        self.check_environment_files()
        self.check_directory_structure()
        self.check_dependencies()
        self.check_security_configuration()
        self.check_api_endpoints()
        self.check_logging_setup()
        self.check_error_handling()
        self.cleanup_old_files()

        self.generate_report()

        print("\n✨ انتهى الفحص!")
        print("\n📌 الخطوات التالية:")
        print("  1. تحديث .env.production بالقيم الصحيحة")
        print("  2. تشغيل flask db upgrade")
        print("  3. اختبار محلي: python wsgi.py")
        print("  4. اختبار الـ API endpoints")
        print("  5. نشر آمن على Hostinger")

if __name__ == '__main__':
    fixer = SystemFixer()
    fixer.run_all_checks()
