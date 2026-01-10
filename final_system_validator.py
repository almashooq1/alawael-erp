#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مُدقق النظام النهائي - فحص شامل للأخطاء البرمجية
Final System Validator - Comprehensive Programming Error Check
"""

import os
import ast
import re
from pathlib import Path

class SystemValidator:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.fixes_applied = []
        
    def validate_python_syntax(self, filepath):
        """فحص syntax Python"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # فحص syntax
            ast.parse(content, filename=filepath)
            return True, "✅ صحيح"
            
        except SyntaxError as e:
            error_msg = f"❌ خطأ Syntax في السطر {e.lineno}: {e.msg}"
            self.errors.append(f"{filepath}: {error_msg}")
            return False, error_msg
            
        except Exception as e:
            error_msg = f"❌ خطأ: {str(e)}"
            self.errors.append(f"{filepath}: {error_msg}")
            return False, error_msg
    
    def check_duplicate_backrefs(self, filepath):
        """فحص backref المكررة في SQLAlchemy"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # البحث عن backref
            backref_pattern = r"backref='([^']+)'"
            backrefs = re.findall(backref_pattern, content)
            
            # فحص التكرار
            seen_backrefs = set()
            duplicates = []
            
            for backref in backrefs:
                if backref in seen_backrefs:
                    duplicates.append(backref)
                seen_backrefs.add(backref)
            
            if duplicates:
                self.warnings.append(f"{filepath}: backref مكررة: {', '.join(duplicates)}")
                return False, f"⚠️ backref مكررة: {', '.join(duplicates)}"
            
            return True, "✅ لا توجد backref مكررة"
            
        except Exception as e:
            return False, f"❌ خطأ في فحص backref: {str(e)}"
    
    def check_import_structure(self, filepath):
        """فحص هيكل الاستيرادات"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            import_section = True
            import_lines = []
            other_lines = []
            
            for line in lines:
                stripped = line.strip()
                if stripped.startswith(('import ', 'from ')) and import_section:
                    import_lines.append(line)
                elif stripped and not stripped.startswith('#'):
                    import_section = False
                    other_lines.append(line)
                else:
                    if import_section:
                        import_lines.append(line)
                    else:
                        other_lines.append(line)
            
            # فحص الاستيرادات المكررة
            unique_imports = []
            duplicates = []
            
            for line in import_lines:
                if line.strip() and line not in unique_imports:
                    unique_imports.append(line)
                elif line.strip():
                    duplicates.append(line.strip())
            
            if duplicates:
                self.warnings.append(f"{filepath}: استيرادات مكررة: {len(duplicates)}")
                return False, f"⚠️ {len(duplicates)} استيراد مكرر"
            
            return True, f"✅ {len(unique_imports)} استيراد صحيح"
            
        except Exception as e:
            return False, f"❌ خطأ في فحص الاستيرادات: {str(e)}"
    
    def validate_models_structure(self, filepath):
        """فحص هيكل نماذج قاعدة البيانات"""
        if not filepath.endswith('models.py'):
            return True, "تم التخطي"
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # فحص وجود الاستيرادات الأساسية
            required_imports = [
                'from database import db',
                'from datetime import datetime, date'
            ]
            
            missing_imports = []
            for imp in required_imports:
                if imp not in content:
                    missing_imports.append(imp)
            
            if missing_imports:
                self.warnings.append(f"{filepath}: استيرادات مفقودة: {', '.join(missing_imports)}")
                return False, f"⚠️ استيرادات مفقودة: {len(missing_imports)}"
            
            # فحص وجود نماذج أساسية
            required_models = ['class User(', 'class Student(', 'class Teacher(']
            missing_models = []
            
            for model in required_models:
                if model not in content:
                    missing_models.append(model.replace('class ', '').replace('(', ''))
            
            if missing_models:
                self.warnings.append(f"{filepath}: نماذج مفقودة: {', '.join(missing_models)}")
                return False, f"⚠️ نماذج مفقودة: {len(missing_models)}"
            
            return True, "✅ هيكل النماذج صحيح"
            
        except Exception as e:
            return False, f"❌ خطأ في فحص النماذج: {str(e)}"
    
    def validate_system(self):
        """فحص شامل للنظام"""
        print("🔍 بدء الفحص الشامل للنظام...")
        print("="*60)
        
        # الملفات المهمة للفحص
        critical_files = [
            'models.py',
            'app.py',
            'database.py',
            'learning_difficulties_scoring.py',
            'comprehensive_rehabilitation_enhanced_api.py'
        ]
        
        for filepath in critical_files:
            if os.path.exists(filepath):
                print(f"\n📁 فحص: {filepath}")
                
                # فحص syntax
                syntax_ok, syntax_msg = self.validate_python_syntax(filepath)
                print(f"   Syntax: {syntax_msg}")
                
                # فحص backref المكررة
                backref_ok, backref_msg = self.check_duplicate_backrefs(filepath)
                print(f"   Backref: {backref_msg}")
                
                # فحص الاستيرادات
                import_ok, import_msg = self.check_import_structure(filepath)
                print(f"   Imports: {import_msg}")
                
                # فحص هيكل النماذج
                models_ok, models_msg = self.validate_models_structure(filepath)
                print(f"   Models: {models_msg}")
                
            else:
                print(f"\n⚠️  الملف غير موجود: {filepath}")
                self.errors.append(f"ملف مفقود: {filepath}")
        
        self.generate_final_report()
    
    def generate_final_report(self):
        """إنشاء التقرير النهائي"""
        print(f"\n{'='*60}")
        print("📊 التقرير النهائي لفحص النظام")
        print("="*60)
        
        if not self.errors and not self.warnings:
            print("\n🎉 ممتاز! النظام خالي من الأخطاء البرمجية")
            print("✅ جميع الملفات صحيحة")
            print("✅ لا توجد أخطاء Syntax")
            print("✅ لا توجد مشاكل في الاستيرادات")
            print("✅ هيكل النماذج صحيح")
        else:
            if self.errors:
                print(f"\n❌ أخطاء حرجة ({len(self.errors)}):")
                for error in self.errors:
                    print(f"   • {error}")
            
            if self.warnings:
                print(f"\n⚠️  تحذيرات ({len(self.warnings)}):")
                for warning in self.warnings:
                    print(f"   • {warning}")
        
        print("="*60)
        
        # حالة النظام العامة
        if not self.errors:
            print("🟢 حالة النظام: جاهز للاستخدام")
        else:
            print("🔴 حالة النظام: يحتاج إصلاح")
        
        print("="*60)

def main():
    """الدالة الرئيسية"""
    validator = SystemValidator()
    validator.validate_system()

if __name__ == "__main__":
    main()
