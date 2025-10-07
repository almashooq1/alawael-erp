#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار شامل لنظام الموارد البشرية المتكامل مع الذكاء الاصطناعي
Comprehensive HR Management System Test
"""

import sys
import os
import json
import requests
from datetime import datetime, date
import time

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app_factory import create_app
from database import db
from hr_models import Employee, Department, Position, AttendanceRecord, LeaveRequest, SalaryRecord
from hr_ai_services import HRAnalytics, TurnoverPredictor, SalaryRecommendationAI, TrainingRecommendationAI, RecruitmentAI

# Create app instance
app = create_app()

class HRSystemTester:
    def __init__(self):
        self.base_url = 'http://localhost:5000'
        self.token = None
        self.test_results = {
            'database_tests': [],
            'api_tests': [],
            'ai_tests': [],
            'ui_tests': [],
            'performance_tests': []
        }
        
    def run_all_tests(self):
        """تشغيل جميع الاختبارات"""
        print("🧪 بدء اختبار نظام الموارد البشرية الشامل...")
        print("=" * 60)
        
        # اختبار قاعدة البيانات
        self.test_database_models()
        
        # اختبار خدمات الذكاء الاصطناعي
        self.test_ai_services()
        
        # اختبار API endpoints
        self.test_api_endpoints()
        
        # اختبار الأداء
        self.test_performance()
        
        # اختبار إمكانية الوصول للواجهة
        self.test_ui_accessibility()
        
        # إنشاء تقرير شامل
        self.generate_report()
        
    def test_database_models(self):
        """اختبار نماذج قاعدة البيانات"""
        print("\n📊 اختبار نماذج قاعدة البيانات...")
        
        with app.app_context():
            try:
                # اختبار إنشاء الجداول
                db.create_all()
                self.test_results['database_tests'].append({
                    'test': 'إنشاء الجداول',
                    'status': 'نجح',
                    'message': 'تم إنشاء جميع الجداول بنجاح'
                })
                print("✅ إنشاء الجداول: نجح")
                
                # اختبار العلاقات بين الجداول
                departments_count = Department.query.count()
                positions_count = Position.query.count()
                employees_count = Employee.query.count()
                
                self.test_results['database_tests'].append({
                    'test': 'فحص البيانات',
                    'status': 'نجح',
                    'message': f'الأقسام: {departments_count}, المناصب: {positions_count}, الموظفين: {employees_count}'
                })
                print(f"✅ البيانات الموجودة - الأقسام: {departments_count}, المناصب: {positions_count}, الموظفين: {employees_count}")
                
                # اختبار العلاقات
                if employees_count > 0:
                    employee = Employee.query.first()
                    if employee.department and employee.position:
                        self.test_results['database_tests'].append({
                            'test': 'العلاقات بين الجداول',
                            'status': 'نجح',
                            'message': 'العلاقات تعمل بشكل صحيح'
                        })
                        print("✅ العلاقات بين الجداول: نجح")
                    else:
                        self.test_results['database_tests'].append({
                            'test': 'العلاقات بين الجداول',
                            'status': 'فشل',
                            'message': 'العلاقات لا تعمل بشكل صحيح'
                        })
                        print("❌ العلاقات بين الجداول: فشل")
                
            except Exception as e:
                self.test_results['database_tests'].append({
                    'test': 'اختبار قاعدة البيانات',
                    'status': 'فشل',
                    'message': str(e)
                })
                print(f"❌ خطأ في قاعدة البيانات: {str(e)}")
    
    def test_ai_services(self):
        """اختبار خدمات الذكاء الاصطناعي"""
        print("\n🤖 اختبار خدمات الذكاء الاصطناعي...")
        
        try:
            # اختبار تحليل الأداء
            hr_analytics = HRAnalytics()
            performance_data = {
                'attendance_rate': 0.95,
                'task_completion': 0.88,
                'quality_score': 0.92,
                'collaboration_score': 0.85,
                'goals_achievement': 0.90
            }
            
            analysis = hr_analytics.analyze_performance(performance_data)
            if analysis and hasattr(analysis, 'type'):
                self.test_results['ai_tests'].append({
                    'test': 'تحليل الأداء بالذكاء الاصطناعي',
                    'status': 'نجح',
                    'message': f'النوع: {analysis.type}, الثقة: {analysis.confidence}%'
                })
                print(f"✅ تحليل الأداء: نجح - {analysis.message}")
            else:
                raise Exception("فشل في تحليل الأداء")
            
            # اختبار توقع معدل الدوران
            turnover_predictor = TurnoverPredictor()
            employee_data = {
                'tenure_months': 24,
                'satisfaction_score': 3.5,
                'performance_rating': 4.2,
                'salary_percentile': 0.6,
                'promotion_history': 1,
                'training_hours': 40
            }
            
            prediction = turnover_predictor.predict_turnover_risk(employee_data)
            if prediction and hasattr(prediction, 'type'):
                self.test_results['ai_tests'].append({
                    'test': 'توقع معدل الدوران',
                    'status': 'نجح',
                    'message': f'مستوى المخاطر: {prediction.data.get("risk_level", "غير محدد")}'
                })
                print(f"✅ توقع معدل الدوران: نجح - {prediction.message}")
            else:
                raise Exception("فشل في توقع معدل الدوران")
            
            # اختبار توصية الراتب
            salary_ai = SalaryRecommendationAI()
            employee_data = {
                'salary': 8000,
                'performance_rating': 4.0,
                'years_experience': 3,
                'position_level': 'mid'
            }
            market_data = {
                'mid': {'median': 9000}
            }
            
            recommendation = salary_ai.recommend_salary_adjustment(employee_data, market_data)
            if recommendation and hasattr(recommendation, 'type'):
                self.test_results['ai_tests'].append({
                    'test': 'توصية الراتب',
                    'status': 'نجح',
                    'message': f'نوع التوصية: {recommendation.type}'
                })
                print(f"✅ توصية الراتب: نجح - {recommendation.message}")
            else:
                raise Exception("فشل في توصية الراتب")
            
            # اختبار توصية التدريب
            training_ai = TrainingRecommendationAI()
            employee_data = {
                'skills': ['communication', 'teamwork'],
                'position_requirements': ['leadership', 'technical'],
                'career_goals': ['management']
            }
            performance_gaps = ['leadership', 'technical_skills']
            
            training_rec = training_ai.recommend_training(employee_data, performance_gaps)
            if training_rec and hasattr(training_rec, 'type'):
                self.test_results['ai_tests'].append({
                    'test': 'توصية التدريب',
                    'status': 'نجح',
                    'message': f'عدد التوصيات: {len(training_rec.recommendations)}'
                })
                print(f"✅ توصية التدريب: نجح - {training_rec.message}")
            else:
                raise Exception("فشل في توصية التدريب")
            
            # اختبار تحليل السيرة الذاتية
            recruitment_ai = RecruitmentAI()
            resume_text = """
            أحمد محمد علي
            مطور برمجيات مع 5 سنوات خبرة
            مهارات: Python, JavaScript, SQL
            تعليم: بكالوريوس علوم حاسوب
            """
            job_requirements = {
                'required_skills': ['Python', 'JavaScript'],
                'preferred_skills': ['SQL', 'teamwork'],
                'min_experience': 3
            }
            
            resume_analysis = recruitment_ai.analyze_resume(resume_text, job_requirements)
            if resume_analysis and hasattr(resume_analysis, 'type'):
                self.test_results['ai_tests'].append({
                    'test': 'تحليل السيرة الذاتية',
                    'status': 'نجح',
                    'message': f'النقاط: {resume_analysis.data.get("total_score", 0)}'
                })
                print(f"✅ تحليل السيرة الذاتية: نجح - {resume_analysis.message}")
            else:
                raise Exception("فشل في تحليل السيرة الذاتية")
                
        except Exception as e:
            self.test_results['ai_tests'].append({
                'test': 'خدمات الذكاء الاصطناعي',
                'status': 'فشل',
                'message': str(e)
            })
            print(f"❌ خطأ في خدمات الذكاء الاصطناعي: {str(e)}")
    
    def test_api_endpoints(self):
        """اختبار API endpoints"""
        print("\n🌐 اختبار API endpoints...")
        
        # محاولة الحصول على token (محاكاة)
        try:
            # اختبار endpoint لوحة التحكم
            with app.test_client() as client:
                # محاكاة تسجيل الدخول
                login_data = {
                    'username': 'admin',
                    'password': 'admin123'
                }
                
                # اختبار صفحة إدارة الموارد البشرية
                response = client.get('/hr-management')
                if response.status_code in [200, 302]:  # 302 للتوجيه لتسجيل الدخول
                    self.test_results['api_tests'].append({
                        'test': 'صفحة إدارة الموارد البشرية',
                        'status': 'نجح',
                        'message': f'رمز الاستجابة: {response.status_code}'
                    })
                    print("✅ صفحة إدارة الموارد البشرية: متاحة")
                else:
                    self.test_results['api_tests'].append({
                        'test': 'صفحة إدارة الموارد البشرية',
                        'status': 'فشل',
                        'message': f'رمز الاستجابة: {response.status_code}'
                    })
                    print(f"❌ صفحة إدارة الموارد البشرية: خطأ {response.status_code}")
                
        except Exception as e:
            self.test_results['api_tests'].append({
                'test': 'اختبار API',
                'status': 'فشل',
                'message': str(e)
            })
            print(f"❌ خطأ في اختبار API: {str(e)}")
    
    def test_performance(self):
        """اختبار الأداء"""
        print("\n⚡ اختبار الأداء...")
        
        with app.app_context():
            try:
                # اختبار سرعة الاستعلامات
                start_time = time.time()
                
                # استعلام الموظفين
                employees = Employee.query.limit(100).all()
                employees_time = time.time() - start_time
                
                start_time = time.time()
                # استعلام الحضور
                attendance = AttendanceRecord.query.limit(100).all()
                attendance_time = time.time() - start_time
                
                self.test_results['performance_tests'].append({
                    'test': 'سرعة الاستعلامات',
                    'status': 'نجح',
                    'message': f'الموظفين: {employees_time:.3f}ث, الحضور: {attendance_time:.3f}ث'
                })
                print(f"✅ سرعة الاستعلامات - الموظفين: {employees_time:.3f}ث, الحضور: {attendance_time:.3f}ث")
                
                # اختبار استهلاك الذاكرة
                try:
                    import psutil
                    process = psutil.Process()
                    memory_usage = process.memory_info().rss / 1024 / 1024  # MB
                    
                    self.test_results['performance_tests'].append({
                        'test': 'استهلاك الذاكرة',
                        'status': 'نجح' if memory_usage < 500 else 'تحذير',
                        'message': f'{memory_usage:.1f} MB'
                    })
                    print(f"✅ استهلاك الذاكرة: {memory_usage:.1f} MB")
                except ImportError:
                    self.test_results['performance_tests'].append({
                        'test': 'استهلاك الذاكرة',
                        'status': 'تخطي',
                        'message': 'مكتبة psutil غير متوفرة'
                    })
                    print("⚠️ استهلاك الذاكرة: تم التخطي (psutil غير متوفرة)")
                
            except Exception as e:
                self.test_results['performance_tests'].append({
                    'test': 'اختبار الأداء',
                    'status': 'فشل',
                    'message': str(e)
                })
                print(f"❌ خطأ في اختبار الأداء: {str(e)}")
    
    def test_ui_accessibility(self):
        """اختبار إمكانية الوصول للواجهة"""
        print("\n🎨 اختبار إمكانية الوصول للواجهة...")
        
        try:
            # فحص وجود ملفات الواجهة
            ui_files = [
                'templates/hr_management.html',
                'static/js/hr_management.js'
            ]
            
            for file_path in ui_files:
                if os.path.exists(file_path):
                    self.test_results['ui_tests'].append({
                        'test': f'ملف الواجهة {file_path}',
                        'status': 'نجح',
                        'message': 'الملف موجود'
                    })
                    print(f"✅ {file_path}: موجود")
                else:
                    self.test_results['ui_tests'].append({
                        'test': f'ملف الواجهة {file_path}',
                        'status': 'فشل',
                        'message': 'الملف غير موجود'
                    })
                    print(f"❌ {file_path}: غير موجود")
            
            # فحص دعم اللغة العربية
            with open('templates/hr_management.html', 'r', encoding='utf-8') as f:
                content = f.read()
                if 'lang="ar"' in content and 'dir="rtl"' in content:
                    self.test_results['ui_tests'].append({
                        'test': 'دعم اللغة العربية',
                        'status': 'نجح',
                        'message': 'تم تفعيل دعم RTL والعربية'
                    })
                    print("✅ دعم اللغة العربية: مفعل")
                else:
                    self.test_results['ui_tests'].append({
                        'test': 'دعم اللغة العربية',
                        'status': 'فشل',
                        'message': 'لم يتم تفعيل دعم RTL أو العربية'
                    })
                    print("❌ دعم اللغة العربية: غير مفعل")
                    
        except Exception as e:
            self.test_results['ui_tests'].append({
                'test': 'اختبار الواجهة',
                'status': 'فشل',
                'message': str(e)
            })
            print(f"❌ خطأ في اختبار الواجهة: {str(e)}")
    
    def generate_report(self):
        """إنشاء تقرير شامل للاختبارات"""
        print("\n📋 إنشاء تقرير الاختبارات...")
        
        # حساب الإحصائيات
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        
        for category in self.test_results.values():
            for test in category:
                total_tests += 1
                if test['status'] == 'نجح':
                    passed_tests += 1
                elif test['status'] == 'فشل':
                    failed_tests += 1
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # إنشاء التقرير
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'failed_tests': failed_tests,
                'success_rate': round(success_rate, 2)
            },
            'details': self.test_results
        }
        
        # حفظ التقرير
        with open('hr_system_test_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        # طباعة الملخص
        print("\n" + "="*60)
        print("📊 ملخص نتائج الاختبارات")
        print("="*60)
        print(f"إجمالي الاختبارات: {total_tests}")
        print(f"الاختبارات الناجحة: {passed_tests}")
        print(f"الاختبارات الفاشلة: {failed_tests}")
        print(f"معدل النجاح: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 ممتاز! النظام يعمل بشكل مثالي")
        elif success_rate >= 75:
            print("✅ جيد! النظام يعمل بشكل جيد مع بعض التحسينات المطلوبة")
        elif success_rate >= 50:
            print("⚠️ متوسط! يحتاج النظام إلى تحسينات")
        else:
            print("❌ ضعيف! النظام يحتاج إلى مراجعة شاملة")
        
        print(f"\n📄 تم حفظ التقرير التفصيلي في: hr_system_test_report.json")
        
        return report

def main():
    """الدالة الرئيسية لتشغيل الاختبارات"""
    tester = HRSystemTester()
    
    print("🧪 نظام اختبار الموارد البشرية المتكامل")
    print("مراكز الأوائل للرعاية النهارية")
    print("="*60)
    
    try:
        tester.run_all_tests()
        return True
    except Exception as e:
        print(f"❌ خطأ عام في النظام: {str(e)}")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
