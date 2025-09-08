"""
نماذج قاعدة البيانات لمنصة التعلم الإلكتروني المتقدمة
Advanced E-Learning Platform Models
"""

from database import db
from datetime import datetime, timedelta
import json
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import func, text

class Course(db.Model):
    """الدورات التعليمية"""
    __tablename__ = 'courses'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    course_code = db.Column(db.String(50), unique=True, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('course_categories.id'), nullable=False)
    instructor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    difficulty_level = db.Column(db.String(50), nullable=False)  # beginner, intermediate, advanced
    duration_hours = db.Column(db.Integer)
    language = db.Column(db.String(50), default='ar')
    prerequisites = db.Column(JSON)
    learning_objectives = db.Column(JSON)
    course_image = db.Column(db.String(500))
    course_video_intro = db.Column(db.String(500))
    price = db.Column(db.Float, default=0.0)
    is_free = db.Column(db.Boolean, default=True)
    is_published = db.Column(db.Boolean, default=False)
    is_featured = db.Column(db.Boolean, default=False)
    enrollment_limit = db.Column(db.Integer)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    certificate_template = db.Column(db.String(500))
    passing_score = db.Column(db.Float, default=70.0)
    tags = db.Column(JSON)
    extra_metadata = db.Column(JSON)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    updated_date = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    category = db.relationship('CourseCategory', backref='courses')
    instructor = db.relationship('User', backref='taught_courses')
    lessons = db.relationship('Lesson', backref='course', lazy=True, cascade='all, delete-orphan')
    enrollments = db.relationship('Enrollment', backref='course', lazy=True)
    reviews = db.relationship('CourseReview', backref='course', lazy=True)

class CourseCategory(db.Model):
    """فئات الدورات"""
    __tablename__ = 'course_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    parent_id = db.Column(db.Integer, db.ForeignKey('course_categories.id'))
    icon = db.Column(db.String(100))
    color = db.Column(db.String(20))
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Self-referential relationship
    parent = db.relationship('CourseCategory', remote_side=[id], backref='subcategories')

class Lesson(db.Model):
    """الدروس"""
    __tablename__ = 'lessons'
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    lesson_order = db.Column(db.Integer, nullable=False)
    lesson_type = db.Column(db.String(50), nullable=False)  # video, text, quiz, assignment, interactive
    content = db.Column(db.Text)
    video_url = db.Column(db.String(500))
    video_duration = db.Column(db.Integer)  # in seconds
    audio_url = db.Column(db.String(500))
    attachments = db.Column(JSON)
    interactive_content = db.Column(JSON)  # for interactive lessons
    is_preview = db.Column(db.Boolean, default=False)
    is_mandatory = db.Column(db.Boolean, default=True)
    estimated_duration = db.Column(db.Integer)  # in minutes
    learning_objectives = db.Column(JSON)
    resources = db.Column(JSON)
    notes = db.Column(db.Text)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    updated_date = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    progress = db.relationship('LessonProgress', backref='lesson', lazy=True)
    quizzes = db.relationship('Quiz', backref='lesson', lazy=True)

class Enrollment(db.Model):
    """التسجيل في الدورات"""
    __tablename__ = 'enrollments'
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    enrollment_date = db.Column(db.DateTime, default=datetime.utcnow)
    completion_date = db.Column(db.DateTime)
    status = db.Column(db.String(50), default='active')  # active, completed, dropped, suspended
    progress_percentage = db.Column(db.Float, default=0.0)
    current_lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'))
    total_time_spent = db.Column(db.Integer, default=0)  # in minutes
    last_accessed = db.Column(db.DateTime)
    certificate_issued = db.Column(db.Boolean, default=False)
    certificate_url = db.Column(db.String(500))
    final_score = db.Column(db.Float)
    payment_status = db.Column(db.String(50), default='free')  # free, paid, pending
    notes = db.Column(db.Text)
    
    # Relations
    student = db.relationship('User', backref='enrollments')
    current_lesson = db.relationship('Lesson')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('course_id', 'student_id', name='unique_course_student'),)

class LessonProgress(db.Model):
    """تقدم الطالب في الدروس"""
    __tablename__ = 'lesson_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    enrollment_id = db.Column(db.Integer, db.ForeignKey('enrollments.id'), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    status = db.Column(db.String(50), default='not_started')  # not_started, in_progress, completed
    progress_percentage = db.Column(db.Float, default=0.0)
    time_spent = db.Column(db.Integer, default=0)  # in seconds
    start_time = db.Column(db.DateTime)
    completion_time = db.Column(db.DateTime)
    last_position = db.Column(db.Integer, default=0)  # for video lessons
    attempts_count = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)
    bookmarks = db.Column(JSON)
    
    # Relations
    enrollment = db.relationship('Enrollment', backref='lesson_progress')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('enrollment_id', 'lesson_id', name='unique_enrollment_lesson'),)

class Quiz(db.Model):
    """الاختبارات"""
    __tablename__ = 'quizzes'
    
    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'))
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    quiz_type = db.Column(db.String(50), nullable=False)  # lesson_quiz, final_exam, practice
    time_limit = db.Column(db.Integer)  # in minutes
    attempts_allowed = db.Column(db.Integer, default=1)
    passing_score = db.Column(db.Float, default=70.0)
    randomize_questions = db.Column(db.Boolean, default=False)
    show_results_immediately = db.Column(db.Boolean, default=True)
    allow_review = db.Column(db.Boolean, default=True)
    is_mandatory = db.Column(db.Boolean, default=True)
    weight = db.Column(db.Float, default=1.0)  # for final grade calculation
    instructions = db.Column(db.Text)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    course = db.relationship('Course', backref='quizzes')
    questions = db.relationship('QuizQuestion', backref='quiz', lazy=True, cascade='all, delete-orphan')
    attempts = db.relationship('QuizAttempt', backref='quiz', lazy=True)

class QuizQuestion(db.Model):
    """أسئلة الاختبارات"""
    __tablename__ = 'quiz_questions'
    
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(50), nullable=False)  # multiple_choice, true_false, short_answer, essay
    question_order = db.Column(db.Integer, nullable=False)
    points = db.Column(db.Float, default=1.0)
    options = db.Column(JSON)  # for multiple choice questions
    correct_answer = db.Column(db.Text)
    explanation = db.Column(db.Text)
    image_url = db.Column(db.String(500))
    audio_url = db.Column(db.String(500))
    video_url = db.Column(db.String(500))
    difficulty_level = db.Column(db.String(50), default='medium')
    tags = db.Column(JSON)
    
    # Relations
    responses = db.relationship('QuizResponse', backref='question', lazy=True)

class QuizAttempt(db.Model):
    """محاولات الاختبارات"""
    __tablename__ = 'quiz_attempts'
    
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    enrollment_id = db.Column(db.Integer, db.ForeignKey('enrollments.id'), nullable=False)
    attempt_number = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    time_taken = db.Column(db.Integer)  # in seconds
    status = db.Column(db.String(50), default='in_progress')  # in_progress, completed, abandoned
    score = db.Column(db.Float)
    percentage = db.Column(db.Float)
    passed = db.Column(db.Boolean)
    feedback = db.Column(db.Text)
    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.String(500))
    
    # Relations
    student = db.relationship('User', backref='quiz_attempts')
    enrollment = db.relationship('Enrollment', backref='quiz_attempts')
    responses = db.relationship('QuizResponse', backref='attempt', lazy=True, cascade='all, delete-orphan')

class QuizResponse(db.Model):
    """إجابات الطلاب على الأسئلة"""
    __tablename__ = 'quiz_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('quiz_attempts.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('quiz_questions.id'), nullable=False)
    student_answer = db.Column(db.Text)
    is_correct = db.Column(db.Boolean)
    points_earned = db.Column(db.Float, default=0.0)
    time_spent = db.Column(db.Integer)  # in seconds
    response_time = db.Column(db.DateTime, default=datetime.utcnow)

class Assignment(db.Model):
    """الواجبات"""
    __tablename__ = 'assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    instructions = db.Column(db.Text)
    due_date = db.Column(db.DateTime)
    max_points = db.Column(db.Float, default=100.0)
    submission_type = db.Column(db.String(50), nullable=False)  # file, text, url, video
    allowed_file_types = db.Column(JSON)
    max_file_size = db.Column(db.Integer)  # in MB
    allow_late_submission = db.Column(db.Boolean, default=False)
    late_penalty = db.Column(db.Float, default=0.0)  # percentage per day
    rubric = db.Column(JSON)
    is_group_assignment = db.Column(db.Boolean, default=False)
    max_group_size = db.Column(db.Integer)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    course = db.relationship('Course', backref='assignments')
    lesson = db.relationship('Lesson', backref='assignments')
    submissions = db.relationship('AssignmentSubmission', backref='assignment', lazy=True)

class AssignmentSubmission(db.Model):
    """تسليم الواجبات"""
    __tablename__ = 'assignment_submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    submission_text = db.Column(db.Text)
    submission_url = db.Column(db.String(500))
    file_attachments = db.Column(JSON)
    submission_date = db.Column(db.DateTime, default=datetime.utcnow)
    is_late = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(50), default='submitted')  # submitted, graded, returned
    grade = db.Column(db.Float)
    feedback = db.Column(db.Text)
    graded_by = db.Column(db.String(100))
    graded_date = db.Column(db.DateTime)
    attempt_number = db.Column(db.Integer, default=1)
    
    # Relations
    student = db.relationship('User', backref='assignment_submissions')

class Discussion(db.Model):
    """منتديات النقاش"""
    __tablename__ = 'discussions'
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    is_pinned = db.Column(db.Boolean, default=False)
    is_locked = db.Column(db.Boolean, default=False)
    allow_anonymous = db.Column(db.Boolean, default=False)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    course = db.relationship('Course', backref='discussions')
    posts = db.relationship('DiscussionPost', backref='discussion', lazy=True, cascade='all, delete-orphan')

class DiscussionPost(db.Model):
    """مشاركات النقاش"""
    __tablename__ = 'discussion_posts'
    
    id = db.Column(db.Integer, primary_key=True)
    discussion_id = db.Column(db.Integer, db.ForeignKey('discussions.id'), nullable=False)
    parent_post_id = db.Column(db.Integer, db.ForeignKey('discussion_posts.id'))
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    attachments = db.Column(JSON)
    is_anonymous = db.Column(db.Boolean, default=False)
    is_instructor_post = db.Column(db.Boolean, default=False)
    likes_count = db.Column(db.Integer, default=0)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    updated_date = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    author = db.relationship('User', backref='discussion_posts')
    parent_post = db.relationship('DiscussionPost', remote_side=[id], backref='replies')
    likes = db.relationship('PostLike', backref='post', lazy=True)

class PostLike(db.Model):
    """إعجابات المشاركات"""
    __tablename__ = 'post_likes'
    
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('discussion_posts.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref='post_likes')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('post_id', 'user_id', name='unique_post_like'),)

class CourseReview(db.Model):
    """تقييمات الدورات"""
    __tablename__ = 'course_reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    review_text = db.Column(db.Text)
    pros = db.Column(db.Text)
    cons = db.Column(db.Text)
    would_recommend = db.Column(db.Boolean)
    difficulty_rating = db.Column(db.Integer)  # 1-5
    instructor_rating = db.Column(db.Integer)  # 1-5
    content_rating = db.Column(db.Integer)  # 1-5
    is_verified = db.Column(db.Boolean, default=False)
    helpful_votes = db.Column(db.Integer, default=0)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    updated_date = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    student = db.relationship('User', backref='course_reviews')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('course_id', 'student_id', name='unique_course_review'),)

class Certificate(db.Model):
    """الشهادات"""
    __tablename__ = 'certificates'
    
    id = db.Column(db.Integer, primary_key=True)
    enrollment_id = db.Column(db.Integer, db.ForeignKey('enrollments.id'), nullable=False)
    certificate_number = db.Column(db.String(100), unique=True, nullable=False)
    certificate_type = db.Column(db.String(50), nullable=False)  # completion, achievement, participation
    template_id = db.Column(db.String(100))
    certificate_data = db.Column(JSON)  # student name, course name, date, etc.
    issue_date = db.Column(db.DateTime, default=datetime.utcnow)
    expiry_date = db.Column(db.DateTime)
    verification_code = db.Column(db.String(100), unique=True)
    certificate_url = db.Column(db.String(500))
    is_revoked = db.Column(db.Boolean, default=False)
    revoked_date = db.Column(db.DateTime)
    revoked_reason = db.Column(db.Text)
    issued_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    enrollment = db.relationship('Enrollment', backref='certificates')

class LearningPath(db.Model):
    """مسارات التعلم"""
    __tablename__ = 'learning_paths'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    path_image = db.Column(db.String(500))
    difficulty_level = db.Column(db.String(50), nullable=False)
    estimated_duration = db.Column(db.Integer)  # in hours
    prerequisites = db.Column(JSON)
    learning_outcomes = db.Column(JSON)
    is_published = db.Column(db.Boolean, default=False)
    sort_order = db.Column(db.Integer, default=0)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    
    # Relations
    courses = db.relationship('PathCourse', backref='learning_path', lazy=True, cascade='all, delete-orphan')
    enrollments = db.relationship('PathEnrollment', backref='learning_path', lazy=True)

class PathCourse(db.Model):
    """دورات المسار التعليمي"""
    __tablename__ = 'path_courses'
    
    id = db.Column(db.Integer, primary_key=True)
    path_id = db.Column(db.Integer, db.ForeignKey('learning_paths.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    course_order = db.Column(db.Integer, nullable=False)
    is_mandatory = db.Column(db.Boolean, default=True)
    unlock_criteria = db.Column(JSON)
    
    # Relations
    course = db.relationship('Course', backref='path_courses')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('path_id', 'course_id', name='unique_path_course'),)

class PathEnrollment(db.Model):
    """التسجيل في المسارات التعليمية"""
    __tablename__ = 'path_enrollments'
    
    id = db.Column(db.Integer, primary_key=True)
    path_id = db.Column(db.Integer, db.ForeignKey('learning_paths.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    enrollment_date = db.Column(db.DateTime, default=datetime.utcnow)
    completion_date = db.Column(db.DateTime)
    status = db.Column(db.String(50), default='active')  # active, completed, paused
    progress_percentage = db.Column(db.Float, default=0.0)
    current_course_id = db.Column(db.Integer, db.ForeignKey('courses.id'))
    
    # Relations
    student = db.relationship('User', backref='path_enrollments')
    current_course = db.relationship('Course')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('path_id', 'student_id', name='unique_path_enrollment'),)

# Helper Functions
def generate_course_code():
    """توليد رمز الدورة التلقائي"""
    import random
    import string
    return 'COURSE_' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def generate_certificate_number():
    """توليد رقم الشهادة التلقائي"""
    import random
    import string
    return 'CERT_' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def generate_verification_code():
    """توليد رمز التحقق للشهادة"""
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))

def calculate_course_rating(course_id):
    """حساب تقييم الدورة"""
    reviews = CourseReview.query.filter_by(course_id=course_id).all()
    if not reviews:
        return 0.0
    
    total_rating = sum(review.rating for review in reviews)
    return round(total_rating / len(reviews), 1)

def get_course_difficulty_color(difficulty):
    """الحصول على لون مستوى الصعوبة"""
    colors = {
        'beginner': 'success',
        'intermediate': 'warning',
        'advanced': 'danger'
    }
    return colors.get(difficulty, 'secondary')

def get_enrollment_status_color(status):
    """الحصول على لون حالة التسجيل"""
    colors = {
        'active': 'primary',
        'completed': 'success',
        'dropped': 'danger',
        'suspended': 'warning'
    }
    return colors.get(status, 'secondary')

def format_duration(minutes):
    """تنسيق المدة الزمنية"""
    if minutes < 60:
        return f"{minutes} دقيقة"
    elif minutes < 1440:  # less than 24 hours
        hours = minutes // 60
        remaining_minutes = minutes % 60
        if remaining_minutes == 0:
            return f"{hours} ساعة"
        else:
            return f"{hours} ساعة و {remaining_minutes} دقيقة"
    else:
        days = minutes // 1440
        remaining_hours = (minutes % 1440) // 60
        if remaining_hours == 0:
            return f"{days} يوم"
        else:
            return f"{days} يوم و {remaining_hours} ساعة"

def get_quiz_type_name(quiz_type):
    """الحصول على اسم نوع الاختبار"""
    types = {
        'lesson_quiz': 'اختبار الدرس',
        'final_exam': 'الاختبار النهائي',
        'practice': 'اختبار تدريبي'
    }
    return types.get(quiz_type, quiz_type)

def get_question_type_name(question_type):
    """الحصول على اسم نوع السؤال"""
    types = {
        'multiple_choice': 'اختيار متعدد',
        'true_false': 'صح أم خطأ',
        'short_answer': 'إجابة قصيرة',
        'essay': 'مقال'
    }
    return types.get(question_type, question_type)
