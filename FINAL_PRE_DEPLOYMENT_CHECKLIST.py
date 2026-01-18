#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
قائمة التحقق النهائية قبل النشر
Final Pre-Deployment Checklist
"""

import os
import sys
from pathlib import Path
from datetime import datetime

class FinalChecklist:
    """قائمة التحقق النهائية"""

    def __init__(self):
        self.checks_passed = 0
        self.checks_failed = 0
        self.warnings = 0

    def check(self, condition, message, severity="info"):
        """تنفيذ فحص"""
        if condition:
            print(f"✅ {message}")
            self.checks_passed += 1
        else:
            if severity == "error":
                print(f"❌ {message}")
                self.checks_failed += 1
            else:
                print(f"⚠️  {message}")
                self.warnings += 1

    def print_header(self, title):
        """طباعة رأس القسم"""
        print(f"\n{'='*70}")
        print(f"📋 {title}")
        print(f"{'='*70}\n")

    def print_result(self):
        """طباعة النتائج النهائية"""
        print(f"\n{'='*70}")
        print(f"📊 النتائج النهائية")
        print(f"{'='*70}\n")

        print(f"✅ الفحوصات الناجحة: {self.checks_passed}")
        print(f"❌ الفحوصات الفاشلة: {self.checks_failed}")
        print(f"⚠️  التحذيرات: {self.warnings}")

        if self.checks_failed == 0:
            print("\n🎉 النظام جاهز للنشر!")
            return True
        else:
            print(f"\n🚫 يجب إصلاح {self.checks_failed} مشكلة قبل النشر")
            return False

    def run_all_checks(self):
        """تشغيل جميع الفحوصات"""

        self.print_header("1. فحوصات الملفات الحرجة")

        project_root = Path(__file__).parent

        critical_files = [
            'wsgi.py',
            'app_factory.py',
            'config.py',
            'requirements.txt',
            'gunicorn.conf.py',
            'Procfile'
        ]

        for file in critical_files:
            file_path = project_root / file
            self.check(
                file_path.exists(),
                f"الملف {file} موجود",
                "error" if file in ['wsgi.py', 'requirements.txt'] else "warning"
            )

        self.print_header("2. فحوصات البيئة")

        env_files = [
            ('.env', 'ملف البيئة'),
            ('.env.production', 'ملف بيئة الإنتاج'),
            ('.env.example', 'ملف المثال')
        ]

        for env_file, desc in env_files:
            file_path = project_root / env_file
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    has_secrets = any(key in content for key in ['SECRET_KEY', 'DATABASE_URL'])
                    self.check(
                        has_secrets,
                        f"{desc} يحتوي على التكوينات المطلوبة"
                    )
            else:
                self.check(
                    False,
                    f"{desc} موجود",
                    "warning"
                )

        self.print_header("3. فحوصات المتطلبات")

        req_file = project_root / 'requirements.txt'
        if req_file.exists():
            with open(req_file, 'r', encoding='utf-8') as f:
                content = f.read()

            packages = [
                ('Flask', 'Flask Web Framework'),
                ('SQLAlchemy', 'ORM Database'),
                ('Flask-JWT-Extended', 'JWT Authentication'),
                ('gunicorn', 'WSGI Server'),
                ('python-dotenv', 'Environment Variables'),
                ('Flask-Migrate', 'Database Migrations')
            ]

            for pkg, desc in packages:
                self.check(
                    pkg in content,
                    f"{desc} ({pkg}) مثبت",
                    "error" if pkg in ['Flask', 'SQLAlchemy'] else "warning"
                )
        else:
            self.check(False, "requirements.txt موجود", "error")

        self.print_header("4. فحوصات الأمان")

        config_file = project_root / 'config.py'
        if config_file.exists():
            content = config_file.read_text()

            security_checks = [
                ('SECRET_KEY', 'مفتاح سري'),
                ('SQLALCHEMY_TRACK_MODIFICATIONS', 'تتبع التعديلات'),
                ('SESSION_COOKIE_SECURE', 'أمان الجلسة'),
            ]

            for check, desc in security_checks:
                self.check(
                    check in content,
                    f"تكوين {desc} موجود",
                    "warning"
                )

        self.print_header("5. فحوصات هيكل المشروع")

        directories = [
            ('static', 'المجلد الثابت'),
            ('templates', 'قوالب HTML'),
            ('migrations', 'قاعدة البيانات'),
            ('logs', 'السجلات')
        ]

        for dir_name, desc in directories:
            dir_path = project_root / dir_name
            self.check(
                dir_path.exists(),
                f"{desc} ({dir_name}/) موجود",
                "warning"
            )

        self.print_header("6. فحوصات قاعدة البيانات")

        migrations_dir = project_root / 'migrations'
        if migrations_dir.exists():
            versions_dir = migrations_dir / 'versions'
            has_migrations = versions_dir.exists() and len(list(versions_dir.glob('*.py'))) > 0

            self.check(
                has_migrations,
                "قاعدة البيانات لديها migrations"
            )
        else:
            self.check(False, "مجلد Migrations موجود", "warning")

        self.print_header("7. فحوصات الـ Logging")

        logs_dir = project_root / 'logs'
        self.check(
            logs_dir.exists(),
            "مجلد السجلات موجود"
        )

        self.print_header("8. فحوصات الإعدادات الإضافية")

        hostinger_files = [
            ('nginx.conf', 'تكوين Nginx'),
            ('docker-compose.production.yml', 'Docker Compose'),
        ]

        for file, desc in hostinger_files:
            file_path = project_root / file
            self.check(
                file_path.exists(),
                f"{desc} ({file}) موجود",
                "warning"
            )

        self.print_header("9. فحوصات الملفات غير الضرورية")

        # البحث عن ملفات الاختبار التي قد تسبب مشاكل
        test_files = list(project_root.glob('*test*.py'))
        old_log_files = list(project_root.glob('*.log'))

        self.check(
            len(test_files) == 0 or all('test_' in f.name for f in test_files),
            f"لا توجد ملفات اختبار قديمة (وجدت {len(test_files)})"
        )

        self.check(
            len(old_log_files) == 0,
            f"لا توجد ملفات .log قديمة (وجدت {len(old_log_files)})"
        )

        self.print_header("10. فحوصات الإنتاج")

        env_prod = project_root / '.env.production'
        if env_prod.exists():
            with open(env_prod, 'r', encoding='utf-8', errors='ignore') as f:
                prod_content = f.read()

            prod_checks = [
                ('FLASK_ENV=production', 'بيئة الإنتاج'),
                ('DATABASE_URL=', 'قاعدة البيانات'),
                ('SECRET_KEY=', 'مفتاح سري'),
                ('MAIL_SERVER=', 'خادم البريد'),
            ]

            for check, desc in prod_checks:
                self.check(
                    check in prod_content,
                    f"تكوين {desc} موجود في .env.production"
                )

        print("\n" + "="*70)
        return self.print_result()


def main():
    """البرنامج الرئيسي"""
    checklist = FinalChecklist()
    success = checklist.run_all_checks()

    print("\n📌 الخطوات التالية:\n")

    if success:
        print("1. ✅ تشغيل النظام محلياً:")
        print("   python wsgi.py")
        print("\n2. ✅ اختبار الـ API:")
        print("   curl http://localhost:5000/api/health")
        print("\n3. ✅ النشر على Hostinger:")
        print("   اتبع دليل 🚀_HOSTINGER_DEPLOYMENT_COMPLETE_GUIDE.md")
    else:
        print("❌ يجب إصلاح المشاكل أولاً")
        print("\n📖 اقرأ ⚙️_COMPREHENSIVE_SYSTEM_ANALYSIS_AND_FIXES.md للحصول على الحلول")

    print("\n" + "="*70)
    print(f"⏰ تاريخ الفحص: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70 + "\n")

    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
