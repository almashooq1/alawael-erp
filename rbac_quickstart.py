#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 سكريبت البدء السريع - RBAC Quick Start
يساعد على تطبيق RBAC بسرعة وسهولة
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

class RBACQuickStart:
    """برنامج البدء السريع لـ RBAC"""
    
    def __init__(self):
        self.project_root = Path.cwd()
        self.log = []
    
    def print_banner(self):
        """طباعة البانر"""
        print("\n" + "=" * 80)
        print("🚀 برنامج البدء السريع لـ RBAC System")
        print("=" * 80)
        print(f"📁 المجلد الحالي: {self.project_root}")
        print(f"⏰ التاريخ والوقت: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80 + "\n")
    
    def check_requirements(self):
        """التحقق من المتطلبات"""
        print("🔍 التحقق من المتطلبات...\n")
        
        requirements = {
            'Python 3.8+': self.check_python(),
            'Flask': self.check_module('flask'),
            'Flask-JWT-Extended': self.check_module('flask_jwt_extended'),
            'SQLAlchemy': self.check_module('sqlalchemy'),
        }
        
        all_ok = True
        for req, status in requirements.items():
            symbol = "✅" if status else "❌"
            print(f"{symbol} {req}")
            if not status:
                all_ok = False
        
        print()
        
        if not all_ok:
            print("⚠️  يوجد متطلبات ناقصة!")
            print("💾 استخدم: pip install flask flask-jwt-extended sqlalchemy\n")
            return False
        
        print("✅ جميع المتطلبات موجودة!\n")
        return True
    
    def check_python(self):
        """التحقق من إصدار Python"""
        try:
            version = sys.version_info
            return version.major >= 3 and version.minor >= 8
        except:
            return False
    
    def check_module(self, module_name):
        """التحقق من وجود مكتبة"""
        try:
            __import__(module_name.replace('-', '_'))
            return True
        except ImportError:
            return False
    
    def show_setup_steps(self):
        """عرض خطوات الإعداد"""
        print("📋 خطوات الإعداد:\n")
        
        steps = [
            {
                'number': 1,
                'title': 'استيراد المكتبة',
                'description': 'أضف هذا الاستيراد في بداية كل ملف API:',
                'code': '''from auth_rbac_decorator import (
    check_permission, check_multiple_permissions,
    check_any_permission, guard_payload_size,
    validate_json, log_audit
)
from flask_jwt_extended import jwt_required'''
            },
            {
                'number': 2,
                'title': 'تطبيق على Endpoint',
                'description': 'أضف الـ decorators على كل endpoint:',
                'code': '''@app.route('/api/endpoint', methods=['GET'])
@jwt_required()
@check_permission('permission_key')
@log_audit('ACTION_NAME')
def endpoint():
    # ... code here
    return jsonify(response)'''
            },
            {
                'number': 3,
                'title': 'الاختبار',
                'description': 'قم بتشغيل الاختبارات:',
                'code': '''python test_rbac_system.py'''
            },
            {
                'number': 4,
                'title': 'النشر',
                'description': 'انشر التغييرات:',
                'code': '''git add .
git commit -m "Apply RBAC system"
git push'''
            },
        ]
        
        for step in steps:
            print(f"\n{'=' * 80}")
            print(f"الخطوة {step['number']}: {step['title']}")
            print("=" * 80)
            print(f"\n📝 {step['description']}\n")
            print("```python" if 'python' in step.get('code', '') else "```bash")
            print(step['code'])
            print("```\n")
    
    def generate_endpoint_template(self):
        """توليد قالب endpoint"""
        print("\n" + "=" * 80)
        print("📄 قالب Endpoint جاهز للاستخدام")
        print("=" * 80 + "\n")
        
        template = '''# ============================================================
# قالب Endpoint محمي بـ RBAC
# ============================================================

@bp.route('/api/<resource>', methods=['GET'])
@jwt_required()                          # 1️⃣ التحقق من JWT
@check_permission('view_<resource>')    # 2️⃣ فحص الصلاحية
@log_audit('LIST_<RESOURCE>')           # 3️⃣ تسجيل التدقيق
def list_resources():
    """
    الحصول على قائمة الموارد
    
    المتطلبات:
    - JWT valid token
    - Permission: view_<resource>
    
    الرد:
    - 200: قائمة الموارد
    - 401: Unauthorized
    - 403: Forbidden
    """
    try:
        page = request.args.get('page', 1, type=int)
        resources = Resource.query.paginate(page=page, per_page=10)
        return jsonify({
            'resources': [r.to_dict() for r in resources.items],
            'pagination': {
                'page': page,
                'total': resources.total,
                'pages': resources.pages
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/<resource>', methods=['POST'])
@jwt_required()                                # 1️⃣ التحقق من JWT
@check_permission('manage_<resource>')       # 2️⃣ فحص الصلاحية
@guard_payload_size(max_bytes=2_000_000)     # 3️⃣ حماية الحجم
@validate_json('required_field_1', 'required_field_2')  # 4️⃣ التحقق من JSON
@log_audit('CREATE_<RESOURCE>')              # 5️⃣ تسجيل التدقيق
def create_resource():
    """
    إنشاء مورد جديد
    
    المتطلبات:
    - JWT valid token
    - Permission: manage_<resource>
    - JSON: required_field_1, required_field_2
    
    الرد:
    - 201: المورد الجديد
    - 400: Bad Request
    - 401: Unauthorized
    - 403: Forbidden
    - 413: Payload Too Large
    """
    try:
        data = request.get_json()
        new_resource = Resource(**data)
        db.session.add(new_resource)
        db.session.commit()
        return jsonify(new_resource.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@bp.route('/api/<resource>/<int:id>', methods=['PATCH'])
@jwt_required()
@check_permission('manage_<resource>')
@guard_payload_size()
@log_audit('UPDATE_<RESOURCE>')
def update_resource(id):
    """تحديث مورد"""
    resource = Resource.query.get_or_404(id)
    data = request.get_json()
    # ... update logic
    db.session.commit()
    return jsonify(resource.to_dict())


@bp.route('/api/<resource>/<int:id>', methods=['DELETE'])
@jwt_required()
@check_permission('manage_<resource>')
@log_audit('DELETE_<RESOURCE>')
def delete_resource(id):
    """حذف مورد"""
    resource = Resource.query.get_or_404(id)
    db.session.delete(resource)
    db.session.commit()
    return jsonify({'message': 'تم الحذف'})
'''
        
        print(template)
        print("\n" + "=" * 80)
        print("💡 تلميحات:")
        print("=" * 80)
        print("""
• استبدل <resource> باسم المورد الفعلي (مثل: files, students, assessments)
• استبدل <RESOURCE> بالاسم بأحرف كبيرة (مثل: FILES, STUDENTS, ASSESSMENTS)
• استبدل required_field_1, required_field_2 بالحقول المطلوبة فعلاً
• أضف @guard_payload_size() و @validate_json() فقط حيث مطلوب
• تأكد من استخدام أسماء الصلاحيات الصحيحة من ملف rbac_config.json
        """)
    
    def show_common_permissions(self):
        """عرض الصلاحيات الشائعة"""
        print("\n" + "=" * 80)
        print("🔐 الصلاحيات الشائعة")
        print("=" * 80 + "\n")
        
        permissions = {
            'عرض البيانات': [
                'view_students',
                'view_files',
                'view_assessments',
                'view_reports',
            ],
            'إدارة البيانات': [
                'manage_students',
                'manage_files',
                'manage_assessments',
                'manage_documents',
            ],
            'تصدير والطباعة': [
                'export_files',
                'print_files',
            ],
            'تحليل': [
                'ai_analysis',
                'create_recommendations',
            ],
        }
        
        for category, perms in permissions.items():
            print(f"\n{category}:")
            for perm in perms:
                print(f"  • {perm}")
    
    def show_role_summary(self):
        """عرض ملخص الأدوار"""
        print("\n" + "=" * 80)
        print("👥 ملخص الأدوار")
        print("=" * 80 + "\n")
        
        roles = {
            'super_admin': '⭐⭐⭐⭐⭐ مسؤول النظام (كل شيء)',
            'admin': '⭐⭐⭐⭐ المدير العام (إدارة كاملة)',
            'manager': '⭐⭐⭐ مدير البرامج (إدارة البيانات)',
            'teacher': '⭐⭐ المعلم (تقييمات وتوصيات)',
            'staff': '⭐ الموظف (عرض محدود)',
        }
        
        for role, desc in roles.items():
            print(f"{desc}")
    
    def show_testing_guide(self):
        """عرض دليل الاختبار"""
        print("\n" + "=" * 80)
        print("🧪 دليل الاختبار")
        print("=" * 80 + "\n")
        
        guide = """
1. اختبار مع curl:
   
   # احصل على التوكن
   TOKEN=$(curl -s -X POST http://localhost:5000/auth/login \\
     -d '{"username":"admin","password":"pass"}' | jq -r '.token')
   
   # اختبر endpoint
   curl -H "Authorization: Bearer $TOKEN" \\
     http://localhost:5000/api/files

2. اختبار مع Python:
   
   import requests
   token = "your_token"
   headers = {"Authorization": f"Bearer {token}"}
   response = requests.get('http://localhost:5000/api/files', headers=headers)
   print(response.json())

3. اختبار الأدوار المختلفة:
   
   # كـ admin - يجب أن ينجح
   curl -H "Authorization: Bearer $ADMIN_TOKEN" \\
     http://localhost:5000/api/files
   
   # كـ staff - يجب أن ينجح (view فقط)
   curl -H "Authorization: Bearer $STAFF_TOKEN" \\
     http://localhost:5000/api/files
   
   # كـ staff - يجب أن يفشل مع 403
   curl -X POST http://localhost:5000/api/files \\
     -H "Authorization: Bearer $STAFF_TOKEN"

4. اختبار الأخطاء:
   
   # بدون توكن - توقع 401
   curl http://localhost:5000/api/files
   
   # بدون صلاحيات - توقع 403
   curl -H "Authorization: Bearer $WRONG_ROLE_TOKEN" \\
     -X POST http://localhost:5000/api/files
   
   # بدون حقول - توقع 400
   curl -X POST http://localhost:5000/api/files \\
     -H "Authorization: Bearer $TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{}'
        """
        
        print(guide)
    
    def create_implementation_checklist(self):
        """إنشاء قائمة التحقق من التطبيق"""
        print("\n" + "=" * 80)
        print("✅ قائمة التحقق من التطبيق")
        print("=" * 80 + "\n")
        
        checklist = """
PRE-IMPLEMENTATION
  ☐ مراجعة auth_rbac_decorator.py
  ☐ قراءة الدليل الشامل
  ☐ فهم الأدوار والصلاحيات
  ☐ تثبيت جميع المتطلبات

IMPLEMENTATION
  ☐ نسخ auth_rbac_decorator.py إلى المشروع
  ☐ استيراد المكتبة في كل ملف API
  ☐ إضافة @jwt_required() على جميع الـ endpoints
  ☐ إضافة @check_permission() على جميع الـ endpoints
  ☐ إضافة @guard_payload_size() على POST/PATCH
  ☐ إضافة @validate_json() حيث مطلوب
  ☐ إضافة @log_audit() على العمليات الحساسة
  ☐ اختبار كل endpoint مع أدوار مختلفة

TESTING
  ☐ تشغيل unit tests
  ☐ اختبار التكامل
  ☐ اختبار الأداء
  ☐ اختبار رسائل الخطأ
  ☐ اختبار مع أدوار جميع المستخدمين

DEPLOYMENT
  ☐ مراجعة كود نهائية
  ☐ تحديث التوثيق
  ☐ إبلاغ الفريق
  ☐ نشر التغييرات
  ☐ مراقبة السجلات

POST-DEPLOYMENT
  ☐ التحقق من جميع الـ endpoints
  ☐ قراءة سجلات التدقيق
  ☐ جمع الملاحظات
  ☐ تصحيح أي مشاكل
  ☐ توثيق الدروس المستفادة
        """
        
        print(checklist)
    
    def run(self):
        """تشغيل برنامج البدء السريع"""
        self.print_banner()
        
        # التحقق من المتطلبات
        if not self.check_requirements():
            print("❌ يوجد متطلبات ناقصة. يرجى تثبيتها أولاً.")
            return
        
        # عرض القائمة الرئيسية
        while True:
            print("\n" + "=" * 80)
            print("🎯 القائمة الرئيسية")
            print("=" * 80)
            print("""
1️⃣  عرض خطوات الإعداد
2️⃣  عرض قالب Endpoint
3️⃣  عرض الصلاحيات الشائعة
4️⃣  عرض ملخص الأدوار
5️⃣  عرض دليل الاختبار
6️⃣  عرض قائمة التحقق
7️⃣  خروج
            """)
            
            choice = input("اختر رقماً (1-7): ").strip()
            
            if choice == '1':
                self.show_setup_steps()
            elif choice == '2':
                self.generate_endpoint_template()
            elif choice == '3':
                self.show_common_permissions()
            elif choice == '4':
                self.show_role_summary()
            elif choice == '5':
                self.show_testing_guide()
            elif choice == '6':
                self.create_implementation_checklist()
            elif choice == '7':
                print("\n✅ شكراً لاستخدام برنامج البدء السريع!")
                break
            else:
                print("❌ اختيار غير صحيح. حاول مجدداً.")


def main():
    """البرنامج الرئيسي"""
    app = RBACQuickStart()
    app.run()


if __name__ == '__main__':
    main()
