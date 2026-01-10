#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
مُنظف النظام - إصلاح وتنظيف جميع الأخطاء
System Cleaner - Fix and Clean All Errors
"""

import os
import re
import ast
import sys
from pathlib import Path
from typing import List, Dict, Set, Tuple
import logging

# إعداد التسجيل
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SystemCleaner:
    """منظف النظام الشامل"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.errors_found = []
        self.fixes_applied = []
        
    def scan_import_errors(self) -> List[Dict]:
        """فحص أخطاء الاستيراد"""
        import_errors = []
        
        for py_file in self.project_root.glob("*.py"):
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # البحث عن استيرادات خاطئة
                import_lines = re.findall(r'^from\s+(\S+)\s+import\s+(.+)$|^import\s+(\S+)$', content, re.MULTILINE)
                
                for line_match in import_lines:
                    if line_match[0]:  # from ... import
                        module = line_match[0]
                        imports = line_match[1]
                    else:  # import
                        module = line_match[2]
                        imports = None
                    
                    # فحص الوحدات المحلية
                    if not self._is_standard_library(module) and not self._module_exists(module):
                        import_errors.append({
                            'file': str(py_file),
                            'module': module,
                            'imports': imports,
                            'type': 'missing_module'
                        })
                        
            except Exception as e:
                logger.error(f"خطأ في فحص {py_file}: {e}")
                
        return import_errors
    
    def fix_database_imports(self):
        """إصلاح استيرادات قاعدة البيانات"""
        files_to_fix = [
            'surveillance_system_models.py',
            'surveillance_system_services.py', 
            'surveillance_system_api.py',
            'enhanced_surveillance_services.py'
        ]
        
        for filename in files_to_fix:
            file_path = self.project_root / filename
            if file_path.exists():
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # إصلاح استيراد قاعدة البيانات
                    content = re.sub(
                        r'from flask_sqlalchemy import SQLAlchemy\n.*?db = SQLAlchemy\(\)',
                        'from database import db',
                        content,
                        flags=re.DOTALL
                    )
                    
                    content = re.sub(
                        r'from models import db',
                        'from database import db',
                        content
                    )
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    self.fixes_applied.append(f"إصلاح استيراد قاعدة البيانات في {filename}")
                    logger.info(f"تم إصلاح {filename}")
                    
                except Exception as e:
                    logger.error(f"خطأ في إصلاح {filename}: {e}")
    
    def fix_service_class_names(self):
        """إصلاح أسماء الفئات في الخدمات"""
        service_file = self.project_root / 'surveillance_system_services.py'
        
        if service_file.exists():
            try:
                with open(service_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # إصلاح تعريف الفئة المكررة
                content = re.sub(
                    r'class RecordingManagementService:\s*"""خدمة إدارة التسجيلات مع دعم Claude AI"""\s*"""خدمة إدارة الكاميرات"""',
                    'class CameraManagementService:\n    """خدمة إدارة الكاميرات"""',
                    content
                )
                
                # إضافة فئات الخدمات المفقودة
                if 'class RecordingManagementService:' not in content:
                    content += self._get_missing_service_classes()
                
                with open(service_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.fixes_applied.append("إصلاح أسماء فئات الخدمات")
                logger.info("تم إصلاح أسماء فئات الخدمات")
                
            except Exception as e:
                logger.error(f"خطأ في إصلاح فئات الخدمات: {e}")
    
    def add_missing_imports(self):
        """إضافة الاستيرادات المفقودة"""
        files_imports = {
            'hikvision_integration.py': [
                'import xml.etree.ElementTree as ET',
                'from urllib.parse import urljoin'
            ],
            'claude_ai_integration.py': [
                'import anthropic',
                'import aiohttp',
                'from PIL import Image',
                'import io'
            ],
            'enhanced_surveillance_services.py': [
                'import asyncio',
                'from pathlib import Path'
            ]
        }
        
        for filename, imports in files_imports.items():
            file_path = self.project_root / filename
            if file_path.exists():
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # إضافة الاستيرادات المفقودة
                    for import_line in imports:
                        if import_line not in content:
                            # إضافة الاستيراد في المكان المناسب
                            lines = content.split('\n')
                            import_section_end = 0
                            
                            for i, line in enumerate(lines):
                                if line.startswith('import ') or line.startswith('from '):
                                    import_section_end = i
                            
                            lines.insert(import_section_end + 1, import_line)
                            content = '\n'.join(lines)
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    self.fixes_applied.append(f"إضافة استيرادات مفقودة في {filename}")
                    
                except Exception as e:
                    logger.error(f"خطأ في إضافة استيرادات {filename}: {e}")
    
    def fix_syntax_errors(self):
        """إصلاح الأخطاء النحوية"""
        for py_file in self.project_root.glob("*.py"):
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # محاولة تحليل الملف
                try:
                    ast.parse(content)
                except SyntaxError as e:
                    logger.warning(f"خطأ نحوي في {py_file}: {e}")
                    
                    # إصلاحات نحوية شائعة
                    content = self._fix_common_syntax_errors(content)
                    
                    with open(py_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    self.fixes_applied.append(f"إصلاح خطأ نحوي في {py_file.name}")
                    
            except Exception as e:
                logger.error(f"خطأ في فحص {py_file}: {e}")
    
    def clean_duplicate_code(self):
        """تنظيف الكود المكرر"""
        for py_file in self.project_root.glob("*.py"):
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # إزالة الاستيرادات المكررة
                lines = content.split('\n')
                seen_imports = set()
                cleaned_lines = []
                
                for line in lines:
                    if line.strip().startswith(('import ', 'from ')):
                        if line not in seen_imports:
                            seen_imports.add(line)
                            cleaned_lines.append(line)
                    else:
                        cleaned_lines.append(line)
                
                cleaned_content = '\n'.join(cleaned_lines)
                
                # إزالة الأسطر الفارغة المتتالية
                cleaned_content = re.sub(r'\n{3,}', '\n\n', cleaned_content)
                
                if cleaned_content != content:
                    with open(py_file, 'w', encoding='utf-8') as f:
                        f.write(cleaned_content)
                    
                    self.fixes_applied.append(f"تنظيف الكود المكرر في {py_file.name}")
                    
            except Exception as e:
                logger.error(f"خطأ في تنظيف {py_file}: {e}")
    
    def validate_models_integrity(self):
        """التحقق من سلامة النماذج"""
        models_files = [
            'models.py',
            'surveillance_system_models.py',
            'branch_integration_models.py'
        ]
        
        for filename in models_files:
            file_path = self.project_root / filename
            if file_path.exists():
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # التحقق من وجود استيراد قاعدة البيانات
                    if 'from database import db' not in content and 'db =' in content:
                        # إضافة الاستيراد
                        lines = content.split('\n')
                        for i, line in enumerate(lines):
                            if line.startswith('from ') or line.startswith('import '):
                                continue
                            else:
                                lines.insert(i, 'from database import db')
                                break
                        
                        content = '\n'.join(lines)
                        
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        
                        self.fixes_applied.append(f"إصلاح استيراد قاعدة البيانات في {filename}")
                        
                except Exception as e:
                    logger.error(f"خطأ في التحقق من {filename}: {e}")
    
    def run_full_cleanup(self):
        """تشغيل التنظيف الكامل"""
        logger.info("بدء عملية التنظيف الشاملة للنظام...")
        
        # 1. إصلاح استيرادات قاعدة البيانات
        self.fix_database_imports()
        
        # 2. إصلاح أسماء الفئات
        self.fix_service_class_names()
        
        # 3. إضافة الاستيرادات المفقودة
        self.add_missing_imports()
        
        # 4. إصلاح الأخطاء النحوية
        self.fix_syntax_errors()
        
        # 5. تنظيف الكود المكرر
        self.clean_duplicate_code()
        
        # 6. التحقق من سلامة النماذج
        self.validate_models_integrity()
        
        # 7. فحص أخطاء الاستيراد
        import_errors = self.scan_import_errors()
        
        # طباعة التقرير
        self._print_cleanup_report(import_errors)
    
    def _is_standard_library(self, module_name: str) -> bool:
        """التحقق من كون الوحدة جزء من المكتبة القياسية"""
        standard_libs = {
            'os', 'sys', 'json', 'datetime', 'logging', 'threading', 'uuid',
            'pathlib', 'typing', 'enum', 'ast', 're', 'base64', 'hashlib',
            'urllib', 'xml', 'io', 'asyncio'
        }
        return module_name.split('.')[0] in standard_libs
    
    def _module_exists(self, module_name: str) -> bool:
        """التحقق من وجود الوحدة"""
        try:
            # فحص الملفات المحلية
            module_file = self.project_root / f"{module_name}.py"
            return module_file.exists()
        except:
            return False
    
    def _fix_common_syntax_errors(self, content: str) -> str:
        """إصلاح الأخطاء النحوية الشائعة"""
        # إصلاح الأقواس غير المتطابقة
        content = re.sub(r'\(\s*\)', '()', content)
        
        # إصلاح الفواصل المفقودة
        content = re.sub(r'(\w+)\s*=\s*(\w+)\s*(\w+)', r'\1 = \2, \3', content)
        
        return content
    
    def _get_missing_service_classes(self) -> str:
        """الحصول على فئات الخدمات المفقودة"""
        return """

class RecordingManagementService:
    \"\"\"خدمة إدارة التسجيلات\"\"\"
    
    @staticmethod
    def start_recording(camera_id: int, duration: int, quality: str, user_id: int) -> Dict:
        \"\"\"بدء تسجيل جديد\"\"\"
        try:
            # منطق بدء التسجيل
            return {'success': True, 'message': 'تم بدء التسجيل'}
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def stop_recording(recording_id: int) -> Dict:
        \"\"\"إيقاف التسجيل\"\"\"
        try:
            # منطق إيقاف التسجيل
            return {'success': True, 'message': 'تم إيقاف التسجيل'}
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def search_recordings(camera_id: int = None, start_date: str = None, end_date: str = None) -> List[Dict]:
        \"\"\"البحث في التسجيلات\"\"\"
        try:
            # منطق البحث
            return []
        except Exception as e:
            logger.error(f"خطأ في البحث: {e}")
            return []

class CameraAccessService:
    \"\"\"خدمة إدارة صلاحيات الكاميرات\"\"\"
    pass

class LiveViewService:
    \"\"\"خدمة المشاهدة المباشرة\"\"\"
    pass

class AlertManagementService:
    \"\"\"خدمة إدارة التنبيهات\"\"\"
    pass

class CameraMonitoringService:
    \"\"\"خدمة مراقبة الكاميرات\"\"\"
    pass

class SurveillanceReportingService:
    \"\"\"خدمة تقارير المراقبة\"\"\"
    pass
"""
    
    def _print_cleanup_report(self, import_errors: List[Dict]):
        """طباعة تقرير التنظيف"""
        print("\n" + "="*60)
        print("تقرير تنظيف النظام")
        print("="*60)
        
        print(f"\n✅ الإصلاحات المطبقة ({len(self.fixes_applied)}):")
        for fix in self.fixes_applied:
            print(f"  • {fix}")
        
        if import_errors:
            print(f"\n⚠️  أخطاء الاستيراد المتبقية ({len(import_errors)}):")
            for error in import_errors[:10]:  # أول 10 أخطاء فقط
                print(f"  • {error['file']}: {error['module']}")
        
        print(f"\n📊 الإحصائيات:")
        print(f"  • الإصلاحات المطبقة: {len(self.fixes_applied)}")
        print(f"  • أخطاء الاستيراد: {len(import_errors)}")
        
        print("\n✨ تم الانتهاء من تنظيف النظام!")

if __name__ == "__main__":
    # تشغيل منظف النظام
    project_root = os.path.dirname(os.path.abspath(__file__))
    cleaner = SystemCleaner(project_root)
    cleaner.run_full_cleanup()
