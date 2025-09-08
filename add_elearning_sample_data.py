#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
إضافة بيانات تجريبية لنظام التعلم الإلكتروني المتقدم
Advanced E-Learning Platform Sample Data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from database import db
from elearning_models import *
from models import User, Student
import random

def add_elearning_sample_data():
    """إضافة بيانات تجريبية شاملة لنظام التعلم الإلكتروني"""
    
    try:
        print("🚀 بدء إضافة البيانات التجريبية لنظام التعلم الإلكتروني...")
        
        # 1. إضافة فئات الدورات
        categories_data = [
            {
                'name': 'التأهيل الحركي',
                'description': 'دورات متخصصة في التأهيل الحركي والعلاج الطبيعي',
                'color_code': '#FF6B6B'
            },
            {
                'name': 'التأهيل النطقي',
                'description': 'برامج تدريبية لتطوير مهارات النطق والتخاطب',
                'color_code': '#4ECDC4'
            },
            {
                'name': 'التأهيل السلوكي',
                'description': 'دورات في تعديل السلوك والتدخل السلوكي',
                'color_code': '#45B7D1'
            },
            {
                'name': 'التأهيل المعرفي',
                'description': 'برامج تنمية المهارات المعرفية والذهنية',
                'color_code': '#96CEB4'
            },
            {
                'name': 'التأهيل الاجتماعي',
                'description': 'دورات تطوير المهارات الاجتماعية والتفاعل',
                'color_code': '#FFEAA7'
            }
        ]
        
        categories = []
        for cat_data in categories_data:
            category = CourseCategory(
                name=cat_data['name'],
                description=cat_data['description'],
                color_code=cat_data['color_code'],
                is_active=True
            )
            db.session.add(category)
            categories.append(category)
        
        db.session.flush()
        print(f"✅ تم إضافة {len(categories)} فئة دورات")
        
        # 2. إضافة الدورات التعليمية
        courses_data = [
            {
                'title': 'أساسيات العلاج الطبيعي للأطفال',
                'description': 'دورة شاملة تغطي أساسيات العلاج الطبيعي المخصص للأطفال ذوي الاحتياجات الخاصة',
                'category_id': categories[0].id,
                'difficulty_level': 'beginner',
                'duration_hours': 40,
                'price': 500.00,
                'is_free': False,
                'learning_objectives': ['فهم أساسيات التشريح', 'تقنيات العلاج الطبيعي', 'التقييم الحركي']
            },
            {
                'title': 'تقنيات النطق والتخاطب المتقدمة',
                'description': 'برنامج متخصص في تطوير مهارات النطق وعلاج اضطرابات التخاطب',
                'category_id': categories[1].id,
                'difficulty_level': 'intermediate',
                'duration_hours': 35,
                'price': 450.00,
                'is_free': False,
                'learning_objectives': ['تشخيص اضطرابات النطق', 'تقنيات العلاج', 'التدريب العملي']
            },
            {
                'title': 'مقدمة في تعديل السلوك',
                'description': 'دورة تأسيسية في مبادئ تعديل السلوك والتدخل السلوكي الإيجابي',
                'category_id': categories[2].id,
                'difficulty_level': 'beginner',
                'duration_hours': 30,
                'price': 0.00,
                'is_free': True,
                'learning_objectives': ['مبادئ تعديل السلوك', 'استراتيجيات التدخل', 'قياس السلوك']
            },
            {
                'title': 'تنمية المهارات المعرفية',
                'description': 'برنامج شامل لتطوير المهارات المعرفية والذهنية للأطفال',
                'category_id': categories[3].id,
                'difficulty_level': 'intermediate',
                'duration_hours': 45,
                'price': 600.00,
                'is_free': False,
                'learning_objectives': ['التقييم المعرفي', 'برامج التدخل', 'استراتيجيات التعلم']
            },
            {
                'title': 'المهارات الاجتماعية للأطفال',
                'description': 'دورة متخصصة في تطوير المهارات الاجتماعية والتفاعل الاجتماعي',
                'category_id': categories[4].id,
                'difficulty_level': 'beginner',
                'duration_hours': 25,
                'price': 0.00,
                'is_free': True,
                'learning_objectives': ['المهارات الاجتماعية الأساسية', 'التفاعل الاجتماعي', 'حل المشكلات']
            },
            {
                'title': 'العلاج الوظيفي المتقدم',
                'description': 'برنامج متقدم في العلاج الوظيفي وتطوير المهارات الحياتية',
                'category_id': categories[0].id,
                'difficulty_level': 'advanced',
                'duration_hours': 50,
                'price': 750.00,
                'is_free': False,
                'learning_objectives': ['التقييم الوظيفي', 'التدخل العلاجي', 'التكيف البيئي']
            }
        ]
        
        courses = []
        for course_data in courses_data:
            course = Course(
                title=course_data['title'],
                description=course_data['description'],
                category_id=course_data['category_id'],
                difficulty_level=course_data['difficulty_level'],
                duration_hours=course_data['duration_hours'],
                price=course_data['price'],
                is_free=course_data['is_free'],
                learning_objectives=course_data['learning_objectives'],
                start_date=datetime.now() + timedelta(days=random.randint(1, 30)),
                end_date=datetime.now() + timedelta(days=random.randint(60, 120)),
                is_active=True,
                created_by='admin'
            )
            db.session.add(course)
            courses.append(course)
        
        db.session.flush()
        print(f"✅ تم إضافة {len(courses)} دورة تعليمية")
        
        # 3. إضافة الدروس لكل دورة
        lesson_types = ['video', 'text', 'interactive', 'quiz']
        
        for course in courses:
            num_lessons = random.randint(5, 10)
            for i in range(num_lessons):
                lesson = Lesson(
                    course_id=course.id,
                    title=f'الدرس {i+1}: {course.title}',
                    description=f'محتوى الدرس {i+1} من دورة {course.title}',
                    lesson_type=random.choice(lesson_types),
                    content_url=f'/content/course_{course.id}/lesson_{i+1}',
                    duration_minutes=random.randint(15, 60),
                    order_index=i+1,
                    is_preview=i == 0,  # الدرس الأول معاينة مجانية
                    is_active=True
                )
                db.session.add(lesson)
        
        db.session.flush()
        print("✅ تم إضافة الدروس للدورات")
        
        # 4. إضافة التسجيلات (استخدام الطلاب الموجودين)
        students = Student.query.limit(10).all()
        
        if students:
            for student in students:
                # تسجيل كل طالب في 2-4 دورات عشوائية
                num_enrollments = random.randint(2, 4)
                selected_courses = random.sample(courses, min(num_enrollments, len(courses)))
                
                for course in selected_courses:
                    enrollment = Enrollment(
                        student_id=student.id,
                        course_id=course.id,
                        enrollment_date=datetime.now() - timedelta(days=random.randint(1, 30)),
                        status=random.choice(['active', 'completed', 'paused']),
                        progress_percentage=random.randint(10, 100),
                        completion_date=datetime.now() - timedelta(days=random.randint(1, 10)) if random.choice([True, False]) else None
                    )
                    db.session.add(enrollment)
            
            print(f"✅ تم إضافة التسجيلات للطلاب")
        
        # 5. إضافة الاختبارات
        for course in courses:
            # إضافة 2-3 اختبارات لكل دورة
            num_quizzes = random.randint(2, 3)
            for i in range(num_quizzes):
                quiz = Quiz(
                    course_id=course.id,
                    title=f'اختبار {i+1}: {course.title}',
                    description=f'اختبار تقييمي للوحدة {i+1}',
                    total_marks=random.randint(50, 100),
                    passing_marks=random.randint(30, 60),
                    time_limit_minutes=random.randint(30, 90),
                    max_attempts=3,
                    is_active=True
                )
                db.session.add(quiz)
                db.session.flush()
                
                # إضافة أسئلة للاختبار
                num_questions = random.randint(5, 10)
                for j in range(num_questions):
                    question = QuizQuestion(
                        quiz_id=quiz.id,
                        question_text=f'السؤال {j+1}: ما هو المفهوم الأساسي في {course.title}؟',
                        question_type='multiple_choice',
                        options=[
                            'الخيار الأول',
                            'الخيار الثاني', 
                            'الخيار الثالث',
                            'الخيار الرابع'
                        ],
                        correct_answer='الخيار الأول',
                        marks=random.randint(5, 10),
                        order_index=j+1
                    )
                    db.session.add(question)
        
        print("✅ تم إضافة الاختبارات والأسئلة")
        
        # 6. إضافة الواجبات
        for course in courses:
            num_assignments = random.randint(1, 3)
            for i in range(num_assignments):
                assignment = Assignment(
                    course_id=course.id,
                    title=f'واجب {i+1}: {course.title}',
                    description=f'واجب عملي للوحدة {i+1} من دورة {course.title}',
                    instructions='يرجى إكمال المهام المطلوبة وتسليم التقرير النهائي',
                    total_marks=random.randint(50, 100),
                    due_date=datetime.now() + timedelta(days=random.randint(7, 30)),
                    submission_type='file',
                    is_active=True
                )
                db.session.add(assignment)
        
        print("✅ تم إضافة الواجبات")
        
        # 7. إضافة المناقشات
        for course in courses:
            num_discussions = random.randint(2, 4)
            for i in range(num_discussions):
                discussion = Discussion(
                    course_id=course.id,
                    title=f'مناقشة {i+1}: {course.title}',
                    description=f'مناقشة حول موضوع مهم في {course.title}',
                    created_by='instructor',
                    is_pinned=i == 0,
                    is_active=True
                )
                db.session.add(discussion)
                db.session.flush()
                
                # إضافة مشاركات في المناقشة
                num_posts = random.randint(3, 8)
                for j in range(num_posts):
                    post = DiscussionPost(
                        discussion_id=discussion.id,
                        content=f'مشاركة {j+1} في المناقشة حول {discussion.title}',
                        author_type='student' if j > 0 else 'instructor',
                        author_id=random.choice(students).id if students and j > 0 else 1,
                        created_date=datetime.now() - timedelta(hours=random.randint(1, 72))
                    )
                    db.session.add(post)
        
        print("✅ تم إضافة المناقشات والمشاركات")
        
        # 8. إضافة التقييمات والمراجعات
        if students:
            completed_enrollments = Enrollment.query.filter_by(status='completed').all()
            for enrollment in completed_enrollments[:15]:  # أول 15 تسجيل مكتمل
                review = CourseReview(
                    course_id=enrollment.course_id,
                    student_id=enrollment.student_id,
                    rating=random.randint(3, 5),
                    review_text=f'دورة ممتازة ومفيدة جداً. استفدت كثيراً من المحتوى المقدم.',
                    is_approved=True
                )
                db.session.add(review)
        
        print("✅ تم إضافة التقييمات والمراجعات")
        
        # 9. إضافة الشهادات
        completed_enrollments = Enrollment.query.filter_by(status='completed').all()
        for enrollment in completed_enrollments[:10]:  # أول 10 تسجيلات مكتملة
            certificate = Certificate(
                student_id=enrollment.student_id,
                course_id=enrollment.course_id,
                issue_date=enrollment.completion_date or datetime.now(),
                certificate_url=f'/certificates/{enrollment.student_id}_{enrollment.course_id}.pdf',
                verification_code=f'CERT-{enrollment.student_id}-{enrollment.course_id}-{random.randint(1000, 9999)}',
                is_valid=True
            )
            db.session.add(certificate)
        
        print("✅ تم إضافة الشهادات")
        
        # 10. إضافة مسارات التعلم
        learning_paths_data = [
            {
                'name': 'مسار التأهيل الشامل',
                'description': 'مسار تعليمي متكامل يغطي جميع جوانب التأهيل',
                'courses': courses[:4]
            },
            {
                'name': 'مسار المهارات الأساسية',
                'description': 'مسار للمبتدئين في مجال التأهيل',
                'courses': [courses[0], courses[2], courses[4]]
            }
        ]
        
        for path_data in learning_paths_data:
            learning_path = LearningPath(
                name=path_data['name'],
                description=path_data['description'],
                estimated_duration_hours=sum(course.duration_hours for course in path_data['courses']),
                difficulty_level='intermediate',
                is_active=True,
                created_by='admin'
            )
            db.session.add(learning_path)
            db.session.flush()
            
            # ربط الدورات بالمسار
            for order, course in enumerate(path_data['courses'], 1):
                path_course = PathCourse(
                    learning_path_id=learning_path.id,
                    course_id=course.id,
                    order_index=order,
                    is_required=True
                )
                db.session.add(path_course)
        
        print("✅ تم إضافة مسارات التعلم")
        
        # حفظ جميع التغييرات
        db.session.commit()
        
        print("\n" + "="*60)
        print("🎉 تم إنشاء البيانات التجريبية بنجاح!")
        print("="*60)
        print(f"📚 الفئات: {len(categories)}")
        print(f"🎓 الدورات: {len(courses)}")
        print(f"📖 الدروس: {Lesson.query.count()}")
        print(f"👥 التسجيلات: {Enrollment.query.count()}")
        print(f"📝 الاختبارات: {Quiz.query.count()}")
        print(f"❓ الأسئلة: {QuizQuestion.query.count()}")
        print(f"📋 الواجبات: {Assignment.query.count()}")
        print(f"💬 المناقشات: {Discussion.query.count()}")
        print(f"⭐ التقييمات: {CourseReview.query.count()}")
        print(f"🏆 الشهادات: {Certificate.query.count()}")
        print(f"🛤️ مسارات التعلم: {LearningPath.query.count()}")
        print("="*60)
        
        return True
        
    except Exception as e:
        print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
        db.session.rollback()
        return False

if __name__ == '__main__':
    from app import app
    
    with app.app_context():
        success = add_elearning_sample_data()
        if success:
            print("✅ تم إكمال إضافة البيانات التجريبية بنجاح")
        else:
            print("❌ فشل في إضافة البيانات التجريبية")
