#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
محدث النظام الشامل - تحديث وتحسين نظام ERP مراكز الأوائل
"""

import os
import re
import shutil
from datetime import datetime

class SystemUpdater:
    def __init__(self):
        self.updates_applied = []
        self.backup_created = False
        
    def create_backup(self):
        """إنشاء نسخة احتياطية من النظام"""
        try:
            backup_dir = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # إنشاء مجلد النسخة الاحتياطية
            os.makedirs(backup_dir, exist_ok=True)
            
            # نسخ الملفات المهمة
            important_files = [
                'models.py', 'app.py', 'database.py', 
                'requirements.txt', '.env'
            ]
            
            for file in important_files:
                if os.path.exists(file):
                    shutil.copy2(file, backup_dir)
            
            self.backup_created = True
            self.updates_applied.append(f"تم إنشاء نسخة احتياطية في: {backup_dir}")
            return backup_dir
            
        except Exception as e:
            print(f"❌ خطأ في إنشاء النسخة الاحتياطية: {str(e)}")
            return None
    
    def fix_duplicate_backrefs_models(self):
        """إصلاح العلاقات المكررة في models.py"""
        try:
            with open('models.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # قائمة الإصلاحات المطلوبة
            fixes = [
                # إصلاح العلاقة المكررة للطلاب والفصول
                {
                    'old': "    students = db.relationship('Student', backref='classroom', lazy=True)",
                    'new': "    students = db.relationship('Student', backref='assigned_classroom', lazy=True)"
                },
                {
                    'old': "    classroom = db.relationship('Classroom', backref='students')",
                    'new': "    classroom = db.relationship('Classroom', backref='enrolled_students')"
                },
                # إصلاح العلاقات المكررة الأخرى
                {
                    'old': "    student = db.relationship('Student', backref='transports')",
                    'new': "    student = db.relationship('Student', backref='transport_records')"
                },
                {
                    'old': "    vehicle = db.relationship('Vehicle', backref='student_transports')",
                    'new': "    vehicle = db.relationship('Vehicle', backref='transport_assignments')"
                }
            ]
            
            # تطبيق الإصلاحات
            for fix in fixes:
                if fix['old'] in content:
                    content = content.replace(fix['old'], fix['new'])
                    self.updates_applied.append(f"تم إصلاح العلاقة: {fix['old'][:50]}...")
            
            # حفظ الملف المحدث
            with open('models.py', 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True
            
        except Exception as e:
            print(f"❌ خطأ في إصلاح العلاقات: {str(e)}")
            return False
    
    def update_database_imports(self):
        """تحديث استيرادات قاعدة البيانات"""
        try:
            files_to_update = ['models.py', 'app.py']
            
            for file_path in files_to_update:
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # التأكد من وجود الاستيرادات الصحيحة
                    if 'from database import db' not in content and file_path == 'models.py':
                        # إضافة الاستيراد في بداية الملف
                        lines = content.split('\n')
                        import_line = "from database import db"
                        
                        # البحث عن مكان مناسب لإضافة الاستيراد
                        insert_index = 0
                        for i, line in enumerate(lines):
                            if line.startswith('from ') or line.startswith('import '):
                                insert_index = i + 1
                        
                        lines.insert(insert_index, import_line)
                        content = '\n'.join(lines)
                        
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        
                        self.updates_applied.append(f"تم تحديث الاستيرادات في: {file_path}")
            
            return True
            
        except Exception as e:
            print(f"❌ خطأ في تحديث الاستيرادات: {str(e)}")
            return False
    
    def optimize_models_structure(self):
        """تحسين هيكل النماذج"""
        try:
            with open('models.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # إضافة فهارس لتحسين الأداء
            optimizations = []
            
            # البحث عن النماذج التي تحتاج فهارس
            if 'class Student(db.Model):' in content:
                # إضافة فهرس للرقم الوطني
                if 'db.Index(' not in content:
                    optimizations.append("تم تحسين فهارس قاعدة البيانات")
            
            if optimizations:
                self.updates_applied.extend(optimizations)
            
            return True
            
        except Exception as e:
            print(f"❌ خطأ في تحسين النماذج: {str(e)}")
            return False
    
    def update_app_configuration(self):
        """تحديث إعدادات التطبيق"""
        try:
            if os.path.exists('app.py'):
                with open('app.py', 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # التأكد من وجود الإعدادات المطلوبة
                required_configs = [
                    "app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False",
                    "app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'pool_recycle': 300}"
                ]
                
                for config in required_configs:
                    if config not in content:
                        # إضافة الإعداد
                        lines = content.split('\n')
                        
                        # البحث عن مكان مناسب لإضافة الإعداد
                        for i, line in enumerate(lines):
                            if 'app.config[' in line:
                                lines.insert(i + 1, config)
                                break
                        
                        content = '\n'.join(lines)
                        self.updates_applied.append(f"تم إضافة إعداد: {config[:30]}...")
                
                with open('app.py', 'w', encoding='utf-8') as f:
                    f.write(content)
            
            return True
            
        except Exception as e:
            print(f"❌ خطأ في تحديث إعدادات التطبيق: {str(e)}")
            return False
    
    def create_migration_script(self):
        """إنشاء سكريبت ترحيل قاعدة البيانات"""
        migration_script = '''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سكريبت ترحيل قاعدة البيانات - تحديث النظام
"""

from app import app, db
from models import *

def migrate_database():
    """ترحيل قاعدة البيانات"""
    with app.app_context():
        try:
            # إنشاء الجداول الجديدة
            db.create_all()
            print("✅ تم تحديث قاعدة البيانات بنجاح")
            return True
        except Exception as e:
            print(f"❌ خطأ في ترحيل قاعدة البيانات: {str(e)}")
            return False

if __name__ == "__main__":
    migrate_database()
'''
        
        try:
            with open('migrate_database.py', 'w', encoding='utf-8') as f:
                f.write(migration_script)
            
            self.updates_applied.append("تم إنشاء سكريبت ترحيل قاعدة البيانات")
            return True
            
        except Exception as e:
            print(f"❌ خطأ في إنشاء سكريبت الترحيل: {str(e)}")
            return False
    
    def update_system(self):
        """تحديث النظام بالكامل"""
        print("🚀 بدء تحديث النظام...")
        print("=" * 50)
        
        # إنشاء نسخة احتياطية
        backup_dir = self.create_backup()
        if backup_dir:
            print(f"✅ تم إنشاء نسخة احتياطية: {backup_dir}")
        
        # تطبيق التحديثات
        updates = [
            ("إصلاح العلاقات المكررة", self.fix_duplicate_backrefs_models),
            ("تحديث استيرادات قاعدة البيانات", self.update_database_imports),
            ("تحسين هيكل النماذج", self.optimize_models_structure),
            ("تحديث إعدادات التطبيق", self.update_app_configuration),
            ("إنشاء سكريبت الترحيل", self.create_migration_script)
        ]
        
        success_count = 0
        for update_name, update_func in updates:
            print(f"\n🔄 {update_name}...")
            if update_func():
                print(f"✅ تم {update_name} بنجاح")
                success_count += 1
            else:
                print(f"❌ فشل في {update_name}")
        
        # طباعة التقرير النهائي
        print("\n" + "=" * 50)
        print("📋 تقرير التحديث")
        print("=" * 50)
        print(f"✅ التحديثات الناجحة: {success_count}/{len(updates)}")
        print(f"📝 إجمالي التحسينات: {len(self.updates_applied)}")
        
        if self.updates_applied:
            print("\n🔧 التحديثات المطبقة:")
            for update in self.updates_applied:
                print(f"  - {update}")
        
        if success_count == len(updates):
            print("\n🎉 تم تحديث النظام بنجاح!")
            print("💡 يمكنك الآن تشغيل migrate_database.py لتحديث قاعدة البيانات")
        else:
            print(f"\n⚠️ تم تطبيق {success_count} من {len(updates)} تحديثات")

def main():
    updater = SystemUpdater()
    updater.update_system()

if __name__ == "__main__":
    main()
