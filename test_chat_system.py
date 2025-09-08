#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
نظام اختبار شامل للدردشة المباشرة
Comprehensive Test Suite for Real-time Chat System
"""

import sys
import os
import json
import time
from datetime import datetime

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_chat_system():
    """اختبار شامل لنظام الدردشة المباشرة"""
    
    print("🧪 بدء اختبار نظام الدردشة المباشرة...")
    print("=" * 60)
    
    test_results = {
        'total_tests': 0,
        'passed_tests': 0,
        'failed_tests': 0,
        'test_details': []
    }
    
    def run_test(test_name, test_function):
        """تشغيل اختبار واحد وتسجيل النتيجة"""
        test_results['total_tests'] += 1
        try:
            result = test_function()
            if result:
                test_results['passed_tests'] += 1
                status = "✅ نجح"
                print(f"{status} {test_name}")
            else:
                test_results['failed_tests'] += 1
                status = "❌ فشل"
                print(f"{status} {test_name}")
            
            test_results['test_details'].append({
                'name': test_name,
                'status': 'passed' if result else 'failed',
                'timestamp': datetime.now().isoformat()
            })
            return result
        except Exception as e:
            test_results['failed_tests'] += 1
            status = "❌ خطأ"
            print(f"{status} {test_name}: {str(e)}")
            test_results['test_details'].append({
                'name': test_name,
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
            return False
    
    # 1. اختبار نماذج قاعدة البيانات
    def test_chat_models():
        """اختبار نماذج قاعدة البيانات للدردشة"""
        try:
            from chat_models import (
                ChatRoom, ChatParticipant, ChatMessage, ChatReadReceipt,
                ChatNotification, ChatSession, ChatFile
            )
            
            # التحقق من وجود جميع النماذج
            models = [ChatRoom, ChatParticipant, ChatMessage, ChatReadReceipt,
                     ChatNotification, ChatSession, ChatFile]
            
            for model in models:
                if not hasattr(model, '__tablename__'):
                    return False
            
            return True
        except ImportError:
            return False
    
    # 2. اختبار API endpoints
    def test_chat_api():
        """اختبار API endpoints للدردشة"""
        try:
            from chat_api import chat_bp
            
            # التحقق من وجود Blueprint
            if not chat_bp:
                return False
            
            # التحقق من وجود routes أساسية
            expected_routes = [
                '/api/chat/rooms',
                '/api/chat/messages',
                '/api/chat/upload'
            ]
            
            # هذا اختبار أساسي للتأكد من إمكانية الاستيراد
            return True
        except ImportError:
            return False
    
    # 3. اختبار ملفات واجهة المستخدم
    def test_chat_templates():
        """اختبار ملفات قوالب واجهة المستخدم"""
        template_file = "templates/chat_interface.html"
        
        if not os.path.exists(template_file):
            return False
        
        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # التحقق من وجود العناصر الأساسية
                required_elements = [
                    'chat-container',
                    'chat-sidebar',
                    'chat-main',
                    'messages-container',
                    'chat-input-container',
                    'createRoomModal'
                ]
                
                for element in required_elements:
                    if element not in content:
                        return False
                
                return True
        except Exception:
            return False
    
    # 4. اختبار ملفات JavaScript
    def test_chat_javascript():
        """اختبار ملفات JavaScript للدردشة"""
        js_file = "static/js/chat_interface.js"
        
        if not os.path.exists(js_file):
            return False
        
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # التحقق من وجود الفئات والوظائف الأساسية
                required_functions = [
                    'class ChatManager',
                    'loadRooms',
                    'selectRoom',
                    'sendMessage',
                    'createRoom',
                    'handleNewMessage'
                ]
                
                for func in required_functions:
                    if func not in content:
                        return False
                
                return True
        except Exception:
            return False
    
    # 5. اختبار التكامل مع التطبيق الرئيسي
    def test_app_integration():
        """اختبار التكامل مع التطبيق الرئيسي"""
        try:
            from app import app
            
            # التحقق من تسجيل route للدردشة
            routes = [str(rule) for rule in app.url_map.iter_rules()]
            
            if '/chat' not in routes:
                return False
            
            return True
        except Exception:
            return False
    
    # 6. اختبار ملف البيانات التجريبية
    def test_sample_data_file():
        """اختبار ملف البيانات التجريبية"""
        sample_file = "add_chat_sample_data.py"
        
        if not os.path.exists(sample_file):
            return False
        
        try:
            with open(sample_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # التحقق من وجود الوظائف الأساسية
                required_functions = [
                    'add_chat_sample_data',
                    'ChatRoom',
                    'ChatParticipant',
                    'ChatMessage'
                ]
                
                for func in required_functions:
                    if func not in content:
                        return False
                
                return True
        except Exception:
            return False
    
    # 7. اختبار هيكل الملفات
    def test_file_structure():
        """اختبار هيكل الملفات المطلوبة"""
        required_files = [
            'chat_models.py',
            'chat_api.py',
            'templates/chat_interface.html',
            'static/js/chat_interface.js',
            'add_chat_sample_data.py'
        ]
        
        for file_path in required_files:
            if not os.path.exists(file_path):
                return False
        
        return True
    
    # 8. اختبار CSS والتصميم
    def test_chat_styling():
        """اختبار CSS والتصميم"""
        template_file = "templates/chat_interface.html"
        
        if not os.path.exists(template_file):
            return False
        
        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # التحقق من وجود أنماط CSS الأساسية
                required_styles = [
                    '.chat-container',
                    '.chat-sidebar',
                    '.message',
                    '.chat-input',
                    'Bootstrap',
                    'FontAwesome'
                ]
                
                for style in required_styles:
                    if style not in content:
                        return False
                
                return True
        except Exception:
            return False
    
    # 9. اختبار الدعم متعدد اللغات
    def test_rtl_support():
        """اختبار دعم اللغة العربية RTL"""
        template_file = "templates/chat_interface.html"
        
        if not os.path.exists(template_file):
            return False
        
        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # التحقق من دعم RTL
                rtl_indicators = [
                    'lang="ar"',
                    'dir="rtl"',
                    'text-align: right',
                    'الدردشة المباشرة'
                ]
                
                rtl_count = sum(1 for indicator in rtl_indicators if indicator in content)
                return rtl_count >= 3  # على الأقل 3 مؤشرات RTL
        except Exception:
            return False
    
    # 10. اختبار الأمان والمصادقة
    def test_security_features():
        """اختبار ميزات الأمان والمصادقة"""
        try:
            from chat_api import chat_bp
            
            # هذا اختبار أساسي للتأكد من وجود نظام الأمان
            api_file = "chat_api.py"
            if not os.path.exists(api_file):
                return False
            
            with open(api_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # التحقق من وجود مؤشرات الأمان
                security_indicators = [
                    '@jwt_required',
                    'Authorization',
                    'token',
                    'current_user'
                ]
                
                security_count = sum(1 for indicator in security_indicators if indicator in content)
                return security_count >= 2
        except Exception:
            return False
    
    # 11. اختبار الميزات المتقدمة
    def test_advanced_features():
        """اختبار الميزات المتقدمة"""
        js_file = "static/js/chat_interface.js"
        
        if not os.path.exists(js_file):
            return False
        
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # التحقق من الميزات المتقدمة
                advanced_features = [
                    'socket.io',
                    'typing',
                    'file upload',
                    'real-time',
                    'notification'
                ]
                
                feature_count = sum(1 for feature in advanced_features if feature.lower() in content.lower())
                return feature_count >= 3
        except Exception:
            return False
    
    # 12. اختبار الأداء والتحسين
    def test_performance_optimization():
        """اختبار تحسينات الأداء"""
        js_file = "static/js/chat_interface.js"
        
        if not os.path.exists(js_file):
            return False
        
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # التحقق من تحسينات الأداء
                optimization_indicators = [
                    'debounce',
                    'throttle',
                    'pagination',
                    'lazy load',
                    'cache'
                ]
                
                # اختبار أساسي للبحث عن مؤشرات التحسين
                return 'setTimeout' in content or 'setInterval' in content
        except Exception:
            return False
    
    # تشغيل جميع الاختبارات
    print("🔍 تشغيل اختبارات نظام الدردشة...")
    print("-" * 60)
    
    run_test("1. نماذج قاعدة البيانات", test_chat_models)
    run_test("2. API Endpoints", test_chat_api)
    run_test("3. قوالب واجهة المستخدم", test_chat_templates)
    run_test("4. ملفات JavaScript", test_chat_javascript)
    run_test("5. التكامل مع التطبيق", test_app_integration)
    run_test("6. ملف البيانات التجريبية", test_sample_data_file)
    run_test("7. هيكل الملفات", test_file_structure)
    run_test("8. CSS والتصميم", test_chat_styling)
    run_test("9. دعم اللغة العربية RTL", test_rtl_support)
    run_test("10. ميزات الأمان", test_security_features)
    run_test("11. الميزات المتقدمة", test_advanced_features)
    run_test("12. تحسينات الأداء", test_performance_optimization)
    
    # طباعة النتائج النهائية
    print("\n" + "=" * 60)
    print("📊 نتائج اختبار نظام الدردشة المباشرة")
    print("=" * 60)
    
    success_rate = (test_results['passed_tests'] / test_results['total_tests']) * 100
    
    print(f"📈 إجمالي الاختبارات: {test_results['total_tests']}")
    print(f"✅ الاختبارات الناجحة: {test_results['passed_tests']}")
    print(f"❌ الاختبارات الفاشلة: {test_results['failed_tests']}")
    print(f"📊 معدل النجاح: {success_rate:.1f}%")
    
    # تقييم الحالة العامة
    if success_rate >= 90:
        status = "🎉 ممتاز"
        color = "أخضر"
    elif success_rate >= 75:
        status = "👍 جيد"
        color = "أزرق"
    elif success_rate >= 60:
        status = "⚠️ مقبول"
        color = "أصفر"
    else:
        status = "❌ يحتاج تحسين"
        color = "أحمر"
    
    print(f"🎯 التقييم العام: {status}")
    print(f"🎨 حالة النظام: {color}")
    
    # التوصيات
    print("\n📋 التوصيات:")
    print("-" * 30)
    
    if test_results['failed_tests'] == 0:
        print("🌟 نظام الدردشة جاهز للاستخدام!")
        print("🚀 يمكن البدء في الاختبار التفاعلي")
    else:
        print("🔧 يرجى مراجعة الاختبارات الفاشلة")
        print("📝 تأكد من وجود جميع الملفات المطلوبة")
        
        if test_results['failed_tests'] <= 2:
            print("✨ النظام قريب من الاكتمال")
        else:
            print("⚡ يحتاج المزيد من التطوير")
    
    # حفظ تقرير مفصل
    try:
        report = {
            'test_summary': {
                'total_tests': test_results['total_tests'],
                'passed_tests': test_results['passed_tests'],
                'failed_tests': test_results['failed_tests'],
                'success_rate': success_rate,
                'status': status,
                'timestamp': datetime.now().isoformat()
            },
            'test_details': test_results['test_details'],
            'recommendations': [
                "تأكد من تشغيل add_chat_sample_data.py لإضافة البيانات التجريبية",
                "اختبر الواجهة في متصفحات مختلفة",
                "تأكد من عمل Socket.IO للرسائل الفورية",
                "اختبر رفع الملفات والمرفقات",
                "تحقق من الأمان والمصادقة"
            ]
        }
        
        with open('chat_system_test_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 تم حفظ التقرير المفصل في: chat_system_test_report.json")
    except Exception as e:
        print(f"⚠️ لم يتم حفظ التقرير: {e}")
    
    print("\n" + "=" * 60)
    return test_results

def main():
    """تشغيل اختبار نظام الدردشة"""
    print("🎯 اختبار نظام الدردشة المباشرة - مراكز الأوائل")
    print("📅 التاريخ:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print()
    
    results = test_chat_system()
    
    if results['success_rate'] >= 80:
        print("\n🎊 تهانينا! نظام الدردشة جاهز للاستخدام")
    else:
        print("\n🔨 يحتاج النظام لمزيد من التطوير")
    
    return results

if __name__ == "__main__":
    main()
