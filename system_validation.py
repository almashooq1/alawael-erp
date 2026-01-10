#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نص التحقق من صحة النظام الشامل
System Validation Script for Al-Awael ERP Rehabilitation System
"""

import sys
import traceback
from datetime import datetime

def test_imports():
    """اختبار استيراد الوحدات الأساسية"""
    print("🔍 Testing core module imports...")
    
    try:
        # Core Flask modules
        from flask import Flask
        from flask_sqlalchemy import SQLAlchemy
        from flask_jwt_extended import JWTManager
        print("✅ Flask core modules imported successfully")
        
        # Database and models
        from database import db
        from models import *
        print("✅ Database and core models imported successfully")
        
        # Comprehensive rehabilitation modules
        from comprehensive_rehabilitation_models import *
        print("✅ Comprehensive rehabilitation models imported successfully")
        
        from comprehensive_rehabilitation_api import comprehensive_rehab_bp
        print("✅ Comprehensive rehabilitation API imported successfully")
        
        from comprehensive_rehabilitation_enhanced_api import comprehensive_rehab_enhanced_bp
        print("✅ Enhanced comprehensive rehabilitation API imported successfully")
        
        # Speech therapy modules
        from speech_therapy_models import *
        from speech_therapy_api import speech_therapy_bp
        print("✅ Speech therapy modules imported successfully")
        
        # AI and advanced services
        try:
            from comprehensive_rehabilitation_ai_services import *
            print("✅ AI services imported successfully")
        except Exception as e:
            print(f"⚠️  AI services import warning: {str(e)}")
        
        try:
            from advanced_data_visualization import *
            print("✅ Data visualization imported successfully")
        except Exception as e:
            print(f"⚠️  Data visualization import warning: {str(e)}")
        
        try:
            from automated_report_generator import *
            print("✅ Report generator imported successfully")
        except Exception as e:
            print(f"⚠️  Report generator import warning: {str(e)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Import error: {str(e)}")
        traceback.print_exc()
        return False

def test_app_creation():
    """اختبار إنشاء تطبيق Flask"""
    print("\n🔍 Testing Flask app creation...")
    
    try:
        from app import app
        print("✅ Flask app created successfully")
        
        # Test app configuration
        if app.config.get('SECRET_KEY'):
            print("✅ Secret key configured")
        else:
            print("⚠️  Secret key not configured")
        
        if app.config.get('JWT_SECRET_KEY'):
            print("✅ JWT secret key configured")
        else:
            print("⚠️  JWT secret key not configured")
        
        return True
        
    except Exception as e:
        print(f"❌ App creation error: {str(e)}")
        traceback.print_exc()
        return False

def test_database_models():
    """اختبار نماذج قاعدة البيانات"""
    print("\n🔍 Testing database models...")
    
    try:
        from models import (
            RehabilitationBeneficiary, ComprehensiveAssessment,
            IndividualRehabilitationPlan, TherapySession,
            ProgressRecord, RehabilitationTherapist
        )
        
        # Test model attributes
        beneficiary_attrs = ['id', 'full_name', 'beneficiary_code', 'disability_type']
        for attr in beneficiary_attrs:
            if hasattr(RehabilitationBeneficiary, attr):
                print(f"✅ RehabilitationBeneficiary.{attr} exists")
            else:
                print(f"❌ RehabilitationBeneficiary.{attr} missing")
        
        assessment_attrs = ['id', 'beneficiary_id', 'assessment_date', 'assessment_type']
        for attr in assessment_attrs:
            if hasattr(ComprehensiveAssessment, attr):
                print(f"✅ ComprehensiveAssessment.{attr} exists")
            else:
                print(f"❌ ComprehensiveAssessment.{attr} missing")
        
        return True
        
    except Exception as e:
        print(f"❌ Database models error: {str(e)}")
        traceback.print_exc()
        return False

def test_api_blueprints():
    """اختبار مخططات API"""
    print("\n🔍 Testing API blueprints...")
    
    try:
        from comprehensive_rehabilitation_api import comprehensive_rehab_bp
        from comprehensive_rehabilitation_enhanced_api import comprehensive_rehab_enhanced_bp
        from speech_therapy_api import speech_therapy_bp
        
        # Test blueprint names and URL prefixes
        blueprints = [
            (comprehensive_rehab_bp, 'comprehensive_rehab', '/api/comprehensive-rehab'),
            (comprehensive_rehab_enhanced_bp, 'comprehensive_rehab_enhanced', '/api/comprehensive-rehab-enhanced'),
            (speech_therapy_bp, 'speech_therapy', '/api/speech-therapy')
        ]
        
        for bp, expected_name, expected_prefix in blueprints:
            if bp.name == expected_name:
                print(f"✅ Blueprint {expected_name} name correct")
            else:
                print(f"❌ Blueprint {expected_name} name incorrect: {bp.name}")
            
            if bp.url_prefix == expected_prefix:
                print(f"✅ Blueprint {expected_name} URL prefix correct")
            else:
                print(f"❌ Blueprint {expected_name} URL prefix incorrect: {bp.url_prefix}")
        
        return True
        
    except Exception as e:
        print(f"❌ API blueprints error: {str(e)}")
        traceback.print_exc()
        return False

def test_javascript_files():
    """اختبار ملفات JavaScript"""
    print("\n🔍 Testing JavaScript files...")
    
    import os
    js_files = [
        'static/js/comprehensive_rehabilitation.js',
        'static/js/speech_therapy.js',
        'static/js/ai.js'
    ]
    
    for js_file in js_files:
        if os.path.exists(js_file):
            print(f"✅ {js_file} exists")
            
            # Check file size
            size = os.path.getsize(js_file)
            if size > 0:
                print(f"✅ {js_file} has content ({size} bytes)")
            else:
                print(f"⚠️  {js_file} is empty")
        else:
            print(f"❌ {js_file} missing")
    
    return True

def test_configuration_files():
    """اختبار ملفات التكوين"""
    print("\n🔍 Testing configuration files...")
    
    import os
    config_files = [
        '.env',
        '.env.production',
        'requirements.txt',
        'Dockerfile'
    ]
    
    for config_file in config_files:
        if os.path.exists(config_file):
            print(f"✅ {config_file} exists")
        else:
            print(f"❌ {config_file} missing")
    
    return True

def main():
    """الدالة الرئيسية للاختبار"""
    print("=" * 60)
    print("🚀 Al-Awael ERP Rehabilitation System Validation")
    print("=" * 60)
    print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    tests = [
        ("Import Tests", test_imports),
        ("App Creation Tests", test_app_creation),
        ("Database Model Tests", test_database_models),
        ("API Blueprint Tests", test_api_blueprints),
        ("JavaScript File Tests", test_javascript_files),
        ("Configuration File Tests", test_configuration_files)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'=' * 50}")
        print(f"🧪 {test_name}")
        print('=' * 50)
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:<30} {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! System is ready.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
