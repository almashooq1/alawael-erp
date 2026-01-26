#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سكريبت التطبيق الشامل لـ RBAC
RBAC Full Application Script
"""

import os
import re
import json
from pathlib import Path
from datetime import datetime

class RBACApplier:
    """تطبيق RBAC على جميع ملفات API"""
    
    def __init__(self, project_root="."):
        self.project_root = Path(project_root)
        self.api_files = []
        self.applied_changes = []
        self.errors = []
    
    def find_api_files(self):
        """البحث عن ملفات API"""
        print("🔍 البحث عن ملفات API...")
        
        api_patterns = [
            '*_api.py',
            'api_*.py',
            'routes.py',
            'blueprint*.py',
        ]
        
        for pattern in api_patterns:
            for file in self.project_root.glob(f"**/{pattern}"):
                if file.is_file() and '__pycache__' not in str(file):
                    self.api_files.append(file)
                    print(f"  ✅ وجدت: {file.name}")
        
        print(f"\n📊 إجمالي الملفات المكتشفة: {len(self.api_files)}\n")
        return self.api_files
    
    def analyze_file(self, filepath):
        """تحليل ملف API"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # البحث عن الـ endpoints
            endpoint_pattern = r"@.*?\.route\(['\"]([^'\"]+)['\"],\s*methods=\[([^\]]+)\]\)"
            endpoints = re.findall(endpoint_pattern, content)
            
            # البحث عن الأدوار المستخدمة
            roles_pattern = r"(?:roles_required|ROLES|'role':|\"role\":)\s*[=\[]([^\]]+)[\]\)]"
            roles_usage = re.findall(roles_pattern, content)
            
            # البحث عن inline decorators
            decorator_pattern = r"@\w+(?:_required|_check|_permission)"
            decorators = re.findall(decorator_pattern, content)
            
            return {
                'filepath': str(filepath),
                'endpoints_count': len(endpoints),
                'endpoints': endpoints[:5],  # أول 5 فقط
                'roles_usage': len(roles_usage),
                'decorators_found': decorators,
            }
        except Exception as e:
            self.errors.append(f"خطأ في تحليل {filepath}: {str(e)}")
            return None
    
    def get_permission_for_endpoint(self, method, path):
        """الحصول على الصلاحية المناسبة للـ endpoint"""
        permission_map = {
            # قوالس عرض البيانات
            ('GET', r'/\w+/?$'): 'view',
            ('GET', r'/\w+/\d+/?$'): 'view',
            
            # قوالس الإنشاء
            ('POST', r'/\w+/?$'): 'manage',
            ('POST', r'/\w+/\d+/\w+'): 'manage',
            
            # قوالس التحديث
            ('PATCH', r'/\w+/\d+'): 'manage',
            ('PUT', r'/\w+/\d+'): 'manage',
            
            # قوالس الحذف
            ('DELETE', r'/\w+/\d+'): 'manage',
            
            # تصدير
            ('POST', r'/\w+/\d+/export'): 'export',
            
            # طباعة
            ('POST', r'/\w+/\d+/print'): 'print',
            
            # تحليل
            ('POST', r'/\w+/\d+/ai-analysis'): 'ai_analysis',
        }
        
        for (m, p), perm in permission_map.items():
            if method == m and re.search(p, path):
                return perm
        
        return 'view'
    
    def generate_decorator_stack(self, method, path, endpoint_name):
        """توليد stack من الـ decorators"""
        decorators = [
            '@jwt_required()',
        ]
        
        # إضافة فحص الصلاحية
        resource = path.split('/')[1] if '/' in path else 'resource'
        permission = self.get_permission_for_endpoint(method, path)
        permission_key = f"{permission}_{resource}s"
        
        decorators.append(f"@check_permission('{permission_key}')")
        
        # إضافة حماية الحجم للطلبات الكبيرة
        if method in ['POST', 'PATCH', 'PUT']:
            decorators.append("@guard_payload_size()")
        
        # إضافة التحقق من JSON للطلبات
        if method in ['POST', 'PATCH', 'PUT']:
            # حقول مطلوبة تقريبية
            fields = []
            if 'create' in endpoint_name.lower():
                fields = ['id', 'name']
            decorators.append(f"@validate_json({', '.join(repr(f) for f in fields) if fields else 'optional'})")
        
        # إضافة تسجيل التدقيق
        action = f"{method}_{resource.upper()}"
        decorators.append(f"@log_audit('{action}')")
        
        return decorators
    
    def create_refactoring_report(self):
        """إنشاء تقرير التطبيق"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_files_analyzed': len(self.api_files),
            'changes_applied': len(self.applied_changes),
            'errors_encountered': len(self.errors),
            'details': {
                'files': [],
                'decorators_applied': {},
                'permission_mappings': {},
            }
        }
        
        # تجميع التفاصيل
        for change in self.applied_changes:
            report['details']['files'].append(change)
        
        return report
    
    def generate_implementation_steps(self):
        """توليد خطوات التطبيق"""
        steps = []
        
        # الخطوة 1: استيراد المكتبة
        steps.append({
            'step': 1,
            'title': 'إضافة الاستيراد',
            'description': 'أضف هذا الاستيراد في بداية كل ملف API:',
            'code': '''from auth_rbac_decorator import (
    check_permission, check_multiple_permissions,
    check_any_permission, guard_payload_size,
    validate_json, log_audit
)
from flask_jwt_extended import jwt_required'''
        })
        
        # الخطوة 2-7: تطبيق على الـ endpoints
        for i, api_file in enumerate(self.api_files, start=2):
            analysis = self.analyze_file(api_file)
            if analysis:
                steps.append({
                    'step': i,
                    'title': f'ملف: {api_file.name}',
                    'description': f'تم اكتشاف {analysis["endpoints_count"]} endpoints',
                    'endpoints': analysis['endpoints'],
                })
        
        # الخطوة النهائية: الاختبار
        steps.append({
            'step': len(self.api_files) + 2,
            'title': 'الاختبار الشامل',
            'description': 'قم بتشغيل اختبارات RBAC:',
            'command': 'python test_rbac_system.py'
        })
        
        return steps
    
    def create_migration_checklist(self):
        """إنشاء قائمة التحقق من الهجرة"""
        checklist = {
            'pre_migration': [
                '✓ عمل نسخة احتياطية من جميع ملفات API',
                '✓ التحقق من أن جميع الـ endpoints محمية بـ @jwt_required',
                '✓ تثبيت المكتبات المطلوبة',
                '✓ قراءة وثائق RBAC الكاملة',
            ],
            'during_migration': [
                '✓ استيراد المكتبة المركزية',
                '✓ إضافة decorators لكل endpoint',
                '✓ اختبار كل endpoint مع أدوار مختلفة',
                '✓ التحقق من رسائل الخطأ',
            ],
            'post_migration': [
                '✓ تشغيل اختبارات الوحدة',
                '✓ اختبار التكامل',
                '✓ فحص الأداء',
                '✓ مراجعة سجلات التدقيق',
                '✓ توثيق جميع الصلاحيات',
            ],
        }
        
        return checklist
    
    def generate_summary_report(self):
        """توليد تقرير ملخص"""
        print("\n" + "=" * 80)
        print("📊 تقرير تطبيق RBAC")
        print("=" * 80)
        
        print(f"\n✅ الملفات المكتشفة: {len(self.api_files)}")
        for f in self.api_files:
            print(f"   - {f.name}")
        
        if self.applied_changes:
            print(f"\n✅ التغييرات المطبقة: {len(self.applied_changes)}")
            for change in self.applied_changes[:3]:
                print(f"   - {change}")
        
        if self.errors:
            print(f"\n⚠️  أخطاء: {len(self.errors)}")
            for error in self.errors[:3]:
                print(f"   - {error}")
        
        print("\n" + "=" * 80)
        print("الخطوات التالية:")
        print("=" * 80)
        print("""
1. ✅ استيراد المكتبة:
   from auth_rbac_decorator import check_permission, log_audit
   from flask_jwt_extended import jwt_required

2. ✅ إضافة decorators على كل endpoint:
   @jwt_required()
   @check_permission('permission_key')
   @log_audit('ACTION_NAME')
   def endpoint():
       pass

3. ✅ اختبار مع أدوار مختلفة:
   - super_admin
   - manager
   - teacher
   - staff

4. ✅ التحقق من سجلات التدقيق

5. ✅ تشغيل اختبارات الأداء
        """)
        
        print("=" * 80)


def main():
    """البرنامج الرئيسي"""
    print("\n" + "=" * 80)
    print("🚀 سكريبت تطبيق RBAC الشامل")
    print("=" * 80 + "\n")
    
    # إنشاء كائن RBAC Applier
    applier = RBACApplier(".")
    
    # البحث عن الملفات
    api_files = applier.find_api_files()
    
    if not api_files:
        print("⚠️  لم يتم العثور على ملفات API")
        print("تأكد من أن أسماء الملفات تنتهي بـ '_api.py' أو تبدأ بـ 'api_'")
        return
    
    # تحليل الملفات
    print("📋 تحليل الملفات...\n")
    
    analysis_results = []
    for api_file in api_files:
        analysis = applier.analyze_file(api_file)
        if analysis:
            analysis_results.append(analysis)
            print(f"✅ {api_file.name}")
            print(f"   Endpoints: {analysis['endpoints_count']}")
            print(f"   Decorators: {len(analysis['decorators_found'])}")
    
    # توليد التقارير
    print("\n" + "=" * 80)
    print("📄 توليد التقارير والملفات")
    print("=" * 80 + "\n")
    
    # تقرير الهجرة
    migration_checklist = applier.create_migration_checklist()
    print("✅ قائمة التحقق من الهجرة:\n")
    for phase, items in migration_checklist.items():
        print(f"\n{phase.replace('_', ' ').title()}:")
        for item in items:
            print(f"  {item}")
    
    # خطوات التطبيق
    steps = applier.generate_implementation_steps()
    print(f"\n✅ خطوات التطبيق: {len(steps)} خطوات")
    
    # تقرير ملخص
    applier.generate_summary_report()
    
    # حفظ التقارير إلى JSON
    report_data = {
        'timestamp': datetime.now().isoformat(),
        'files_analyzed': len(api_files),
        'analysis_results': analysis_results,
        'implementation_steps': steps,
        'migration_checklist': migration_checklist,
    }
    
    report_file = "rbac_implementation_report.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 تم حفظ التقرير في: {report_file}")
    print("\n✨ انتهى سكريبت التطبيق بنجاح!")


if __name__ == '__main__':
    main()
