#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
أداة الإصلاح الشاملة النهائية لنظام ERP مراكز الأوائل
Comprehensive System Fixer for Al-Awael ERP
"""

import os
import re
import sys
import ast
from pathlib import Path
from collections import defaultdict

def fix_comprehensive_rehabilitation_enhanced_api():
    """إصلاح ملف comprehensive_rehabilitation_enhanced_api.py"""
    file_path = Path('comprehensive_rehabilitation_enhanced_api.py')
    if not file_path.exists():
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # إصلاح Blueprint references
        content = re.sub(r'@enhanced_rehab_bp\.route', '@comprehensive_rehab_enhanced_bp.route', content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ تم إصلاح comprehensive_rehabilitation_enhanced_api.py")
        return True
    except Exception as e:
        print(f"❌ خطأ في إصلاح comprehensive_rehabilitation_enhanced_api.py: {e}")
        return False

def fix_javascript_files():
    """إصلاح ملفات JavaScript وإضافة الدوال المفقودة"""
    js_dir = Path('static/js')
    if not js_dir.exists():
        return False
    
    utility_functions = '''
// Utility functions for Al-Awael ERP System
async function makeRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
    };
    
    try {
        const response = await fetch(url, { ...defaultOptions, ...options });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer') || document.body;
    const alertId = 'alert-' + Date.now();
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    alertContainer.insertAdjacentHTML('afterbegin', alertHTML);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.remove();
        }
    }, 5000);
}

function showLoading(show = true) {
    const loadingElement = document.getElementById('loadingSpinner');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function renderPagination(currentPage, totalPages, onPageChange) {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer || totalPages <= 1) return;
    
    let paginationHTML = '<nav><ul class="pagination justify-content-center">';
    
    // Previous button
    paginationHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="${currentPage > 1 ? `${onPageChange}(${currentPage - 1})` : 'return false;'}">السابق</a>
    </li>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            paginationHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="${onPageChange}(${i})">${i}</a>
            </li>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    // Next button
    paginationHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="${currentPage < totalPages ? `${onPageChange}(${currentPage + 1})` : 'return false;'}">التالي</a>
    </li>`;
    
    paginationHTML += '</ul></nav>';
    paginationContainer.innerHTML = paginationHTML;
}

function getDisabilityLabel(type) {
    const labels = {
        'motor': 'حركية',
        'intellectual': 'ذهنية', 
        'sensory': 'حسية',
        'speech': 'نطقية',
        'autism': 'طيف التوحد',
        'learning': 'صعوبات التعلم',
        'behavioral': 'سلوكية',
        'multiple': 'متعددة',
        'rare_diseases': 'أمراض نادرة'
    };
    return labels[type] || type;
}
'''
    
    js_files = list(js_dir.glob('*.js'))
    fixed_files = []
    
    for js_file in js_files:
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if utility functions are needed
            needs_utility = False
            if 'makeRequest(' in content and 'function makeRequest' not in content and 'async function makeRequest' not in content:
                needs_utility = True
            if 'showAlert(' in content and 'function showAlert' not in content:
                needs_utility = True
            if 'showLoading(' in content and 'function showLoading' not in content:
                needs_utility = True
            if 'renderPagination(' in content and 'function renderPagination' not in content:
                needs_utility = True
            if 'getDisabilityLabel(' in content and 'function getDisabilityLabel' not in content:
                needs_utility = True
            
            if needs_utility:
                # Add utility functions at the end
                content += '\n\n' + utility_functions
                
                with open(js_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                fixed_files.append(js_file.name)
                
        except Exception as e:
            print(f"❌ خطأ في إصلاح {js_file.name}: {e}")
    
    if fixed_files:
        print(f"✅ تم إصلاح ملفات JavaScript: {', '.join(fixed_files)}")
    
    return len(fixed_files) > 0

def create_database_init_script():
    """إنشاء سكريبت تهيئة قاعدة البيانات"""
    init_content = '''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database Initialization Script
سكريبت تهيئة قاعدة البيانات
"""

from flask import Flask
from database import db
import os

def init_database():
    """تهيئة قاعدة البيانات وإنشاء الجداول"""
    print("🗄️ بدء تهيئة قاعدة البيانات...")
    
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///alawael_erp.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        try:
            # Import all models
            print("📋 استيراد النماذج...")
            from models import *
            
            # Try to import additional models safely
            try:
                from comprehensive_rehabilitation_models import *
                print("✅ تم استيراد نماذج التأهيل الشامل")
            except ImportError as e:
                print(f"⚠️ تعذر استيراد نماذج التأهيل الشامل: {e}")
            
            try:
                from speech_therapy_models import *
                print("✅ تم استيراد نماذج علاج النطق")
            except ImportError as e:
                print(f"⚠️ تعذر استيراد نماذج علاج النطق: {e}")
            
            try:
                from rehabilitation_programs_models import *
                print("✅ تم استيراد نماذج برامج التأهيل")
            except ImportError as e:
                print(f"⚠️ تعذر استيراد نماذج برامج التأهيل: {e}")
            
            # Create all tables
            print("🔨 إنشاء الجداول...")
            db.create_all()
            
            print("✅ تم إنشاء قاعدة البيانات بنجاح!")
            return True
            
        except Exception as e:
            print(f"❌ خطأ في تهيئة قاعدة البيانات: {e}")
            return False

if __name__ == "__main__":
    success = init_database()
    if success:
        print("🎉 تمت تهيئة قاعدة البيانات بنجاح!")
    else:
        print("💥 فشلت تهيئة قاعدة البيانات!")
'''
    
    with open('init_database.py', 'w', encoding='utf-8') as f:
        f.write(init_content)
    
    print("✅ تم إنشاء سكريبت تهيئة قاعدة البيانات")
    return True

def create_env_file():
    """إنشاء ملف .env إذا لم يكن موجوداً"""
    env_file = Path('.env')
    if env_file.exists():
        print("✅ ملف .env موجود بالفعل")
        return True
    
    env_content = '''# Al-Awael ERP Configuration
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production-2024
DATABASE_URI=sqlite:///alawael_erp.db
JWT_SECRET_KEY=dev-jwt-secret-key-change-in-production-2024

# Mail Configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-email-password

# Upload Configuration
UPLOAD_FOLDER=static/uploads
MAX_CONTENT_LENGTH=16777216
'''
    
    with open(env_file, 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print("✅ تم إنشاء ملف .env")
    return True

def run_system_tests():
    """تشغيل اختبارات النظام الأساسية"""
    print("🧪 تشغيل اختبارات النظام...")
    
    tests_passed = 0
    tests_total = 0
    
    # Test 1: Database import
    tests_total += 1
    try:
        from database import db
        print("✅ اختبار استيراد قاعدة البيانات: نجح")
        tests_passed += 1
    except Exception as e:
        print(f"❌ اختبار استيراد قاعدة البيانات: فشل - {e}")
    
    # Test 2: Models import
    tests_total += 1
    try:
        from models import User, Student, Teacher
        print("✅ اختبار استيراد النماذج الأساسية: نجح")
        tests_passed += 1
    except Exception as e:
        print(f"❌ اختبار استيراد النماذج الأساسية: فشل - {e}")
    
    # Test 3: App import
    tests_total += 1
    try:
        # Just check if app.py exists and has basic structure
        with open('app.py', 'r', encoding='utf-8') as f:
            content = f.read()
            if 'Flask' in content and 'db.init_app' in content:
                print("✅ اختبار بنية التطبيق الأساسية: نجح")
                tests_passed += 1
            else:
                print("❌ اختبار بنية التطبيق الأساسية: فشل - بنية غير صحيحة")
    except Exception as e:
        print(f"❌ اختبار بنية التطبيق الأساسية: فشل - {e}")
    
    # Test 4: Requirements file
    tests_total += 1
    try:
        with open('requirements.txt', 'r', encoding='utf-8') as f:
            content = f.read()
            if 'Flask' in content and 'SQLAlchemy' in content:
                print("✅ اختبار ملف المتطلبات: نجح")
                tests_passed += 1
            else:
                print("❌ اختبار ملف المتطلبات: فشل - متطلبات ناقصة")
    except Exception as e:
        print(f"❌ اختبار ملف المتطلبات: فشل - {e}")
    
    success_rate = (tests_passed / tests_total) * 100 if tests_total > 0 else 0
    print(f"\n📊 نتائج الاختبارات: {tests_passed}/{tests_total} ({success_rate:.1f}%)")
    
    return tests_passed == tests_total

def main():
    """الدالة الرئيسية للإصلاح الشامل"""
    print("🔧 بدء الإصلاح الشامل لنظام ERP مراكز الأوائل")
    print("=" * 60)
    
    fixes_applied = []
    errors_found = []
    
    # 1. إصلاح comprehensive_rehabilitation_enhanced_api.py
    if fix_comprehensive_rehabilitation_enhanced_api():
        fixes_applied.append("إصلاح comprehensive_rehabilitation_enhanced_api.py")
    else:
        errors_found.append("فشل إصلاح comprehensive_rehabilitation_enhanced_api.py")
    
    # 2. إصلاح ملفات JavaScript
    if fix_javascript_files():
        fixes_applied.append("إصلاح ملفات JavaScript وإضافة الدوال المفقودة")
    else:
        fixes_applied.append("لا توجد ملفات JavaScript تحتاج إصلاح")
    
    # 3. إنشاء سكريبت تهيئة قاعدة البيانات
    if create_database_init_script():
        fixes_applied.append("إنشاء سكريبت تهيئة قاعدة البيانات")
    
    # 4. إنشاء ملف .env
    if create_env_file():
        fixes_applied.append("التحقق من/إنشاء ملف .env")
    
    # 5. تشغيل اختبارات النظام
    if run_system_tests():
        fixes_applied.append("جميع اختبارات النظام نجحت")
    else:
        errors_found.append("بعض اختبارات النظام فشلت")
    
    # تقرير نهائي
    print("\n" + "=" * 60)
    print("📋 التقرير النهائي للإصلاح الشامل")
    print("=" * 60)
    
    print(f"\n✅ الإصلاحات المطبقة ({len(fixes_applied)}):")
    for i, fix in enumerate(fixes_applied, 1):
        print(f"  {i}. {fix}")
    
    if errors_found:
        print(f"\n❌ الأخطاء المتبقية ({len(errors_found)}):")
        for i, error in enumerate(errors_found, 1):
            print(f"  {i}. {error}")
    else:
        print("\n🎉 لا توجد أخطاء متبقية!")
    
    success_rate = len(fixes_applied) / (len(fixes_applied) + len(errors_found)) * 100 if (len(fixes_applied) + len(errors_found)) > 0 else 100
    print(f"\n📊 معدل نجاح الإصلاح: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("\n🏆 الإصلاح الشامل اكتمل بنجاح!")
        print("💡 يمكنك الآن تشغيل النظام باستخدام: python app.py")
    else:
        print("\n⚠️ يحتاج النظام إلى مراجعة إضافية")
    
    return success_rate >= 80

if __name__ == "__main__":
    main()
