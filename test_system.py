#!/usr/bin/env python3
"""
اختبار نظام الذكاء الاصطناعي للبرامج والمقاييس
"""

import sys
import os

def test_imports():
    """اختبار الاستيرادات"""
    print("🔍 اختبار الاستيرادات...")
    
    try:
        # اختبار استيراد Flask والمكتبات الأساسية
        from flask import Flask, jsonify, request
        print("✅ Flask - تم")
        
        from flask_sqlalchemy import SQLAlchemy
        print("✅ SQLAlchemy - تم")
        
        from flask_jwt_extended import JWTManager
        print("✅ JWT - تم")
        
        # اختبار استيراد النماذج
        from models import (User, Student, RehabilitationProgram, RehabilitationAssessment,
                           ProgramAIAnalysis, AssessmentAIAnalysis, ProgramOptimizationSuggestion,
                           AssessmentInsight, ProgramPerformanceMetrics, StudentProgressPrediction)
        print("✅ نماذج قاعدة البيانات - تم")
        
        # اختبار استيراد خدمات الذكاء الاصطناعي
        from ai_services import ProgramAIService, AssessmentAIService
        print("✅ خدمات الذكاء الاصطناعي - تم")
        
        return True
        
    except ImportError as e:
        print(f"❌ خطأ في الاستيراد: {e}")
        return False
    except Exception as e:
        print(f"❌ خطأ عام: {e}")
        return False

def test_ai_services():
    """اختبار خدمات الذكاء الاصطناعي"""
    print("\n🧠 اختبار خدمات الذكاء الاصطناعي...")
    
    try:
        from ai_services import ProgramAIService, AssessmentAIService
        
        # اختبار خدمة البرامج
        program_service = ProgramAIService()
        print("✅ إنشاء خدمة البرامج - تم")
        
        # اختبار خدمة المقاييس
        assessment_service = AssessmentAIService()
        print("✅ إنشاء خدمة المقاييس - تم")
        
        # اختبار الوظائف الأساسية
        test_data = program_service.collect_performance_data(1)
        if 'metrics' in test_data:
            print("✅ جمع بيانات الأداء - تم")
        
        test_analysis = assessment_service.analyze_assessment_results(1, 'comprehensive', [])
        if 'analysis_data' in test_analysis:
            print("✅ تحليل المقاييس - تم")
            
        return True
        
    except Exception as e:
        print(f"❌ خطأ في اختبار الخدمات: {e}")
        return False

def test_file_structure():
    """اختبار هيكل الملفات"""
    print("\n📁 اختبار هيكل الملفات...")
    
    required_files = [
        'app.py',
        'models.py',
        'ai_services.py',
        'templates/ai_programs_assessments.html',
        'static/js/ai_programs_assessments.js'
    ]
    
    all_exist = True
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path} - موجود")
        else:
            print(f"❌ {file_path} - غير موجود")
            all_exist = False
    
    return all_exist

def test_database_models():
    """اختبار نماذج قاعدة البيانات"""
    print("\n🗄️ اختبار نماذج قاعدة البيانات...")
    
    try:
        from models import (ProgramAIAnalysis, AssessmentAIAnalysis, 
                           ProgramOptimizationSuggestion, AssessmentInsight,
                           ProgramPerformanceMetrics, StudentProgressPrediction)
        
        # اختبار إنشاء كائنات النماذج
        program_analysis = ProgramAIAnalysis(
            program_id=1,
            analysis_type='test',
            analysis_data={'test': 'data'},
            predictions=['test prediction'],
            recommendations=['test recommendation'],
            confidence_score=0.85,
            created_by=1
        )
        print("✅ ProgramAIAnalysis - تم إنشاؤه")
        
        assessment_analysis = AssessmentAIAnalysis(
            assessment_id=1,
            analysis_type='test',
            analysis_data={'test': 'data'},
            patterns_detected=['test pattern'],
            predictions=['test prediction'],
            recommendations=['test recommendation'],
            confidence_score=0.90,
            created_by=1
        )
        print("✅ AssessmentAIAnalysis - تم إنشاؤه")
        
        return True
        
    except Exception as e:
        print(f"❌ خطأ في اختبار النماذج: {e}")
        return False

def main():
    """الوظيفة الرئيسية للاختبار"""
    print("🚀 بدء اختبار نظام الذكاء الاصطناعي للبرامج والمقاييس")
    print("=" * 60)
    
    tests = [
        ("اختبار الاستيرادات", test_imports),
        ("اختبار هيكل الملفات", test_file_structure),
        ("اختبار نماذج قاعدة البيانات", test_database_models),
        ("اختبار خدمات الذكاء الاصطناعي", test_ai_services)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}...")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} - نجح")
            else:
                print(f"❌ {test_name} - فشل")
        except Exception as e:
            print(f"❌ {test_name} - خطأ: {e}")
    
    print("\n" + "=" * 60)
    print(f"📊 نتائج الاختبار: {passed}/{total} اختبارات نجحت")
    
    if passed == total:
        print("🎉 جميع الاختبارات نجحت! النظام جاهز للاستخدام")
        return True
    else:
        print("⚠️ بعض الاختبارات فشلت. يرجى مراجعة الأخطاء أعلاه")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
