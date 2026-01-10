"""
API endpoints لمنصة التعلم الإلكتروني المتقدمة
Advanced E-Learning Platform API
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from elearning_models import (
    Course, CourseCategory, Lesson, Enrollment, LessonProgress,
    Quiz, QuizQuestion, QuizAttempt, QuizResponse, Assignment,
    AssignmentSubmission, Discussion, DiscussionPost, CourseReview,
    Certificate, LearningPath, PathCourse, PathEnrollment,
    generate_course_code, generate_certificate_number, calculate_course_rating,
    get_course_difficulty_color, get_enrollment_status_color, format_duration
)
from datetime import datetime, timedelta
import json
from sqlalchemy import func, desc, and_, or_

elearning_bp = Blueprint('elearning', __name__, url_prefix='/api/elearning')

# ===== إدارة الدورات =====

@elearning_bp.route('/courses', methods=['GET'])
@jwt_required()
def get_courses():
    """الحصول على قائمة الدورات مع الفلترة والترقيم"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        category_id = request.args.get('category_id', type=int)
        difficulty = request.args.get('difficulty')
        search = request.args.get('search', '')
        is_free = request.args.get('is_free', type=bool)
        
        query = Course.query.filter(Course.is_published == True)
        
        if category_id:
            query = query.filter(Course.category_id == category_id)
        if difficulty:
            query = query.filter(Course.difficulty_level == difficulty)
        if is_free is not None:
            query = query.filter(Course.is_free == is_free)
        if search:
            query = query.filter(
                or_(
                    Course.title.contains(search),
                    Course.description.contains(search),
                    Course.course_code.contains(search)
                )
            )
        
        courses = query.order_by(desc(Course.created_date)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        courses_data = []
        for course in courses.items:
            course_data = {
                'id': course.id,
                'title': course.title,
                'description': course.description,
                'course_code': course.course_code,
                'category': course.category.name if course.category else None,
                'instructor': course.instructor.username if course.instructor else None,
                'difficulty_level': course.difficulty_level,
                'difficulty_color': get_course_difficulty_color(course.difficulty_level),
                'duration_hours': course.duration_hours,
                'price': course.price,
                'is_free': course.is_free,
                'is_featured': course.is_featured,
                'course_image': course.course_image,
                'rating': calculate_course_rating(course.id),
                'enrollments_count': len(course.enrollments),
                'lessons_count': len(course.lessons),
                'created_date': course.created_date.isoformat() if course.created_date else None
            }
            courses_data.append(course_data)
        
        return jsonify({
            'success': True,
            'courses': courses_data,
            'pagination': {
                'page': courses.page,
                'pages': courses.pages,
                'per_page': courses.per_page,
                'total': courses.total,
                'has_next': courses.has_next,
                'has_prev': courses.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب الدورات: {str(e)}'}), 500

@elearning_bp.route('/courses', methods=['POST'])
@jwt_required()
def create_course():
    """إنشاء دورة جديدة"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        course = Course(
            title=data['title'],
            description=data.get('description'),
            course_code=data.get('course_code', generate_course_code()),
            category_id=data['category_id'],
            instructor_id=data.get('instructor_id', 1),  # Default instructor
            difficulty_level=data['difficulty_level'],
            duration_hours=data.get('duration_hours'),
            language=data.get('language', 'ar'),
            prerequisites=data.get('prerequisites', []),
            learning_objectives=data.get('learning_objectives', []),
            price=data.get('price', 0.0),
            is_free=data.get('is_free', True),
            enrollment_limit=data.get('enrollment_limit'),
            start_date=datetime.fromisoformat(data['start_date']) if data.get('start_date') else None,
            end_date=datetime.fromisoformat(data['end_date']) if data.get('end_date') else None,
            passing_score=data.get('passing_score', 70.0),
            tags=data.get('tags', []),
            created_by=current_user
        )
        
        db.session.add(course)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الدورة بنجاح',
            'course_id': course.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'خطأ في إنشاء الدورة: {str(e)}'}), 500

@elearning_bp.route('/courses/<int:course_id>', methods=['GET'])
@jwt_required()
def get_course_details(course_id):
    """الحصول على تفاصيل الدورة"""
    try:
        course = Course.query.get_or_404(course_id)
        
        course_data = {
            'id': course.id,
            'title': course.title,
            'description': course.description,
            'course_code': course.course_code,
            'category': {
                'id': course.category.id,
                'name': course.category.name
            } if course.category else None,
            'instructor': {
                'id': course.instructor.id,
                'name': course.instructor.username
            } if course.instructor else None,
            'difficulty_level': course.difficulty_level,
            'duration_hours': course.duration_hours,
            'language': course.language,
            'prerequisites': course.prerequisites,
            'learning_objectives': course.learning_objectives,
            'price': course.price,
            'is_free': course.is_free,
            'is_published': course.is_published,
            'enrollment_limit': course.enrollment_limit,
            'start_date': course.start_date.isoformat() if course.start_date else None,
            'end_date': course.end_date.isoformat() if course.end_date else None,
            'passing_score': course.passing_score,
            'tags': course.tags,
            'rating': calculate_course_rating(course.id),
            'enrollments_count': len(course.enrollments),
            'lessons': [{
                'id': lesson.id,
                'title': lesson.title,
                'lesson_type': lesson.lesson_type,
                'lesson_order': lesson.lesson_order,
                'estimated_duration': lesson.estimated_duration,
                'is_preview': lesson.is_preview
            } for lesson in sorted(course.lessons, key=lambda x: x.lesson_order)],
            'reviews': [{
                'id': review.id,
                'rating': review.rating,
                'review_text': review.review_text,
                'student_name': review.student.username if review.student else 'مجهول',
                'created_date': review.created_date.isoformat() if review.created_date else None
            } for review in course.reviews[:5]]  # Latest 5 reviews
        }
        
        return jsonify({
            'success': True,
            'course': course_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب تفاصيل الدورة: {str(e)}'}), 500

# ===== التسجيل في الدورات =====

@elearning_bp.route('/courses/<int:course_id>/enroll', methods=['POST'])
@jwt_required()
def enroll_in_course(course_id):
    """التسجيل في دورة"""
    try:
        current_user = get_jwt_identity()
        course = Course.query.get_or_404(course_id)
        
        # Check if already enrolled
        existing_enrollment = Enrollment.query.filter_by(
            course_id=course_id,
            student_id=1  # Default student ID
        ).first()
        
        if existing_enrollment:
            return jsonify({
                'success': False,
                'message': 'أنت مسجل بالفعل في هذه الدورة'
            }), 400
        
        # Check enrollment limit
        if course.enrollment_limit:
            current_enrollments = Enrollment.query.filter_by(
                course_id=course_id,
                status='active'
            ).count()
            
            if current_enrollments >= course.enrollment_limit:
                return jsonify({
                    'success': False,
                    'message': 'تم الوصول للحد الأقصى للتسجيل في هذه الدورة'
                }), 400
        
        enrollment = Enrollment(
            course_id=course_id,
            student_id=1,  # Default student ID
            enrollment_date=datetime.utcnow(),
            status='active'
        )
        
        db.session.add(enrollment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم التسجيل في الدورة بنجاح',
            'enrollment_id': enrollment.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'خطأ في التسجيل: {str(e)}'}), 500

# ===== إدارة الدروس =====

@elearning_bp.route('/courses/<int:course_id>/lessons', methods=['GET'])
@jwt_required()
def get_course_lessons(course_id):
    """الحصول على دروس الدورة"""
    try:
        lessons = Lesson.query.filter_by(course_id=course_id).order_by(Lesson.lesson_order).all()
        
        lessons_data = []
        for lesson in lessons:
            lesson_data = {
                'id': lesson.id,
                'title': lesson.title,
                'description': lesson.description,
                'lesson_order': lesson.lesson_order,
                'lesson_type': lesson.lesson_type,
                'video_duration': lesson.video_duration,
                'estimated_duration': lesson.estimated_duration,
                'is_preview': lesson.is_preview,
                'is_mandatory': lesson.is_mandatory,
                'created_date': lesson.created_date.isoformat() if lesson.created_date else None
            }
            lessons_data.append(lesson_data)
        
        return jsonify({
            'success': True,
            'lessons': lessons_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب الدروس: {str(e)}'}), 500

@elearning_bp.route('/lessons', methods=['POST'])
@jwt_required()
def create_lesson():
    """إنشاء درس جديد"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        lesson = Lesson(
            course_id=data['course_id'],
            title=data['title'],
            description=data.get('description'),
            lesson_order=data['lesson_order'],
            lesson_type=data['lesson_type'],
            content=data.get('content'),
            video_url=data.get('video_url'),
            video_duration=data.get('video_duration'),
            audio_url=data.get('audio_url'),
            attachments=data.get('attachments', []),
            interactive_content=data.get('interactive_content', {}),
            is_preview=data.get('is_preview', False),
            is_mandatory=data.get('is_mandatory', True),
            estimated_duration=data.get('estimated_duration'),
            learning_objectives=data.get('learning_objectives', []),
            resources=data.get('resources', []),
            notes=data.get('notes'),
            created_by=current_user
        )
        
        db.session.add(lesson)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الدرس بنجاح',
            'lesson_id': lesson.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'خطأ في إنشاء الدرس: {str(e)}'}), 500

# ===== إدارة الاختبارات =====

@elearning_bp.route('/quizzes', methods=['POST'])
@jwt_required()
def create_quiz():
    """إنشاء اختبار جديد"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        quiz = Quiz(
            lesson_id=data.get('lesson_id'),
            course_id=data.get('course_id'),
            title=data['title'],
            description=data.get('description'),
            quiz_type=data['quiz_type'],
            time_limit=data.get('time_limit'),
            attempts_allowed=data.get('attempts_allowed', 1),
            passing_score=data.get('passing_score', 70.0),
            randomize_questions=data.get('randomize_questions', False),
            show_results_immediately=data.get('show_results_immediately', True),
            allow_review=data.get('allow_review', True),
            is_mandatory=data.get('is_mandatory', True),
            weight=data.get('weight', 1.0),
            instructions=data.get('instructions'),
            created_by=current_user
        )
        
        db.session.add(quiz)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الاختبار بنجاح',
            'quiz_id': quiz.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'خطأ في إنشاء الاختبار: {str(e)}'}), 500

# ===== فئات الدورات =====

@elearning_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    """الحصول على فئات الدورات"""
    try:
        categories = CourseCategory.query.filter(CourseCategory.is_active == True).order_by(CourseCategory.sort_order).all()
        
        categories_data = []
        for category in categories:
            category_data = {
                'id': category.id,
                'name': category.name,
                'description': category.description,
                'icon': category.icon,
                'color': category.color,
                'courses_count': len(category.courses)
            }
            categories_data.append(category_data)
        
        return jsonify({
            'success': True,
            'categories': categories_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب الفئات: {str(e)}'}), 500

# ===== لوحة التحكم =====

@elearning_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """الحصول على بيانات لوحة التحكم"""
    try:
        # إحصائيات عامة
        total_courses = Course.query.filter(Course.is_published == True).count()
        total_students = db.session.query(Enrollment.student_id).distinct().count()
        total_enrollments = Enrollment.query.count()
        completed_courses = Enrollment.query.filter(Enrollment.status == 'completed').count()
        
        # الدورات الأكثر شعبية
        popular_courses = db.session.query(
            Course.id,
            Course.title,
            func.count(Enrollment.id).label('enrollments_count')
        ).join(Enrollment).group_by(Course.id, Course.title).order_by(
            desc('enrollments_count')
        ).limit(5).all()
        
        # الدورات حسب الفئة
        courses_by_category = db.session.query(
            CourseCategory.name,
            func.count(Course.id).label('count')
        ).join(Course).group_by(CourseCategory.name).all()
        
        # التسجيلات الأخيرة
        recent_enrollments = db.session.query(
            Enrollment,
            Course.title,
            Course.course_image
        ).join(Course).order_by(desc(Enrollment.enrollment_date)).limit(10).all()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'statistics': {
                    'total_courses': total_courses,
                    'total_students': total_students,
                    'total_enrollments': total_enrollments,
                    'completed_courses': completed_courses,
                    'completion_rate': round((completed_courses / total_enrollments * 100) if total_enrollments > 0 else 0, 1)
                },
                'popular_courses': [{
                    'id': course[0],
                    'title': course[1],
                    'enrollments_count': course[2]
                } for course in popular_courses],
                'courses_by_category': [{
                    'category': item[0],
                    'count': item[1]
                } for item in courses_by_category],
                'recent_enrollments': [{
                    'enrollment_id': enrollment[0].id,
                    'course_title': enrollment[1],
                    'course_image': enrollment[2],
                    'enrollment_date': enrollment[0].enrollment_date.isoformat() if enrollment[0].enrollment_date else None,
                    'status': enrollment[0].status
                } for enrollment in recent_enrollments]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب بيانات لوحة التحكم: {str(e)}'}), 500

# ===== تقدم الطالب =====

@elearning_bp.route('/enrollments/<int:enrollment_id>/progress', methods=['GET'])
@jwt_required()
def get_enrollment_progress(enrollment_id):
    """الحصول على تقدم الطالب في الدورة"""
    try:
        enrollment = Enrollment.query.get_or_404(enrollment_id)
        
        # Get lesson progress
        lesson_progress = db.session.query(
            LessonProgress,
            Lesson.title,
            Lesson.lesson_order
        ).join(Lesson).filter(
            LessonProgress.enrollment_id == enrollment_id
        ).order_by(Lesson.lesson_order).all()
        
        progress_data = {
            'enrollment_id': enrollment.id,
            'course_title': enrollment.course.title,
            'status': enrollment.status,
            'progress_percentage': enrollment.progress_percentage,
            'total_time_spent': enrollment.total_time_spent,
            'last_accessed': enrollment.last_accessed.isoformat() if enrollment.last_accessed else None,
            'lessons_progress': [{
                'lesson_id': progress[0].lesson_id,
                'lesson_title': progress[1],
                'lesson_order': progress[2],
                'status': progress[0].status,
                'progress_percentage': progress[0].progress_percentage,
                'time_spent': progress[0].time_spent,
                'completion_time': progress[0].completion_time.isoformat() if progress[0].completion_time else None
            } for progress in lesson_progress]
        }
        
        return jsonify({
            'success': True,
            'progress': progress_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب تقدم الطالب: {str(e)}'}), 500
