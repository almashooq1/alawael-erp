"""
Student Management System - Backend APIs
RESTful API endpoints for student management, grades, courses, and attendance
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from bson.objectid import ObjectId
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Create blueprints
student_bp = Blueprint('student', __name__, url_prefix='/api/v1/students')
course_bp = Blueprint('course', __name__, url_prefix='/api/v1/courses')
grade_bp = Blueprint('grade', __name__, url_prefix='/api/v1/grades')
attendance_bp = Blueprint('attendance', __name__, url_prefix='/api/v1/attendance')
transcript_bp = Blueprint('transcript', __name__, url_prefix='/api/v1/transcripts')
schedule_bp = Blueprint('schedule', __name__, url_prefix='/api/v1/schedules')

def error_handler(func):
    """Decorator for error handling"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {str(e)}")
            return jsonify({"error": str(e), "success": False}), 500
    return wrapper

# ==================== STUDENT MANAGEMENT ENDPOINTS ====================

@student_bp.route('', methods=['GET'])
@error_handler
def get_students():
    """Get all students with pagination"""
    from models.student_models import StudentModel
    from pymongo import MongoClient

    db = request.app.config['DB']
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('per_page', 10, type=int)
    status = request.args.get('status')
    major = request.args.get('major')

    filters = {}
    if status:
        filters['status'] = status
    if major:
        filters['major'] = major

    students, total = StudentModel.get_all_students(db, filters, page, page_size)

    return jsonify({
        "success": True,
        "data": [dict(s, _id=str(s.get('_id'))) for s in students],
        "total": total,
        "page": page,
        "pages": (total + page_size - 1) // page_size
    }), 200

@student_bp.route('/<student_id>', methods=['GET'])
@error_handler
def get_student(student_id):
    """Get student details"""
    from models.student_models import StudentModel
    db = request.app.config['DB']

    student = StudentModel.get_student(db, student_id)
    if not student:
        return jsonify({"error": "Student not found", "success": False}), 404

    student['_id'] = str(student['_id'])
    return jsonify({"success": True, "data": student}), 200

@student_bp.route('', methods=['POST'])
@error_handler
def create_student():
    """Create a new student"""
    from models.student_models import StudentModel
    db = request.app.config['DB']
    data = request.get_json()

    # Validation
    required_fields = ['studentId', 'firstName', 'lastName', 'email']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields", "success": False}), 400

    student_id = StudentModel.create_student(db, data)

    return jsonify({
        "success": True,
        "message": "Student created successfully",
        "studentId": str(student_id)
    }), 201

@student_bp.route('/<student_id>', methods=['PUT'])
@error_handler
def update_student(student_id):
    """Update student information"""
    from models.student_models import StudentModel
    db = request.app.config['DB']
    data = request.get_json()

    student = StudentModel.get_student(db, student_id)
    if not student:
        return jsonify({"error": "Student not found", "success": False}), 404

    StudentModel.update_student(db, student_id, data)

    return jsonify({
        "success": True,
        "message": "Student updated successfully"
    }), 200

@student_bp.route('/<student_id>', methods=['DELETE'])
@error_handler
def delete_student(student_id):
    """Soft delete a student"""
    from models.student_models import StudentModel
    db = request.app.config['DB']

    student = StudentModel.get_student(db, student_id)
    if not student:
        return jsonify({"error": "Student not found", "success": False}), 404

    StudentModel.update_student(db, student_id, {"deletedAt": datetime.now()})

    return jsonify({
        "success": True,
        "message": "Student deleted successfully"
    }), 200

# ==================== COURSE MANAGEMENT ENDPOINTS ====================

@course_bp.route('', methods=['GET'])
@error_handler
def get_courses():
    """Get all courses"""
    db = request.app.config['DB']
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('per_page', 10, type=int)

    skip = (page - 1) * page_size
    courses = list(db.courses.find({"deletedAt": None}).skip(skip).limit(page_size))
    total = db.courses.count_documents({"deletedAt": None})

    for course in courses:
        course['_id'] = str(course['_id'])

    return jsonify({
        "success": True,
        "data": courses,
        "total": total,
        "page": page
    }), 200

@course_bp.route('/<course_id>', methods=['GET'])
@error_handler
def get_course(course_id):
    """Get course details"""
    db = request.app.config['DB']

    course = db.courses.find_one({
        "_id": ObjectId(course_id),
        "deletedAt": None
    })

    if not course:
        return jsonify({"error": "Course not found", "success": False}), 404

    course['_id'] = str(course['_id'])
    return jsonify({"success": True, "data": course}), 200

@course_bp.route('', methods=['POST'])
@error_handler
def create_course():
    """Create a new course"""
    from models.student_models import CourseModel
    db = request.app.config['DB']
    data = request.get_json()

    required_fields = ['courseCode', 'courseName']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields", "success": False}), 400

    course_id = CourseModel.create_course(db, data)

    return jsonify({
        "success": True,
        "message": "Course created successfully",
        "courseId": str(course_id)
    }), 201

@course_bp.route('/<course_id>/enroll', methods=['POST'])
@error_handler
def enroll_student_in_course(course_id):
    """Enroll a student in a course"""
    from models.student_models import CourseModel
    db = request.app.config['DB']
    data = request.get_json()

    student_id = data.get('studentId')
    if not student_id:
        return jsonify({"error": "studentId required", "success": False}), 400

    success = CourseModel.enroll_student(db, course_id, ObjectId(student_id))

    if not success:
        return jsonify({
            "error": "Cannot enroll - course full or student already enrolled",
            "success": False
        }), 400

    return jsonify({
        "success": True,
        "message": "Student enrolled successfully"
    }), 200

# ==================== GRADE MANAGEMENT ENDPOINTS ====================

@grade_bp.route('', methods=['GET'])
@error_handler
def get_grades():
    """Get all grades with filtering"""
    db = request.app.config['DB']
    student_id = request.args.get('studentId')
    course_id = request.args.get('courseId')
    semester = request.args.get('semester')

    filters = {"deletedAt": None}
    if student_id:
        filters['studentId'] = ObjectId(student_id)
    if course_id:
        filters['courseId'] = ObjectId(course_id)
    if semester:
        filters['semester'] = semester

    grades = list(db.grades.find(filters))
    for grade in grades:
        grade['_id'] = str(grade['_id'])
        grade['studentId'] = str(grade['studentId'])
        grade['courseId'] = str(grade['courseId'])

    return jsonify({"success": True, "data": grades}), 200

@grade_bp.route('', methods=['POST'])
@error_handler
def create_grade():
    """Create a new grade record"""
    from models.student_models import GradeModel
    db = request.app.config['DB']
    data = request.get_json()

    required_fields = ['studentId', 'courseId', 'semester']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields", "success": False}), 400

    grade_id = GradeModel.create_grade(db, data)

    return jsonify({
        "success": True,
        "message": "Grade created successfully",
        "gradeId": str(grade_id)
    }), 201

@grade_bp.route('/<grade_id>', methods=['PUT'])
@error_handler
def update_grade(grade_id):
    """Update a grade record"""
    from models.student_models import GradeModel
    db = request.app.config['DB']
    data = request.get_json()

    # Update assessment scores
    if 'assessmentScores' in data:
        data['assessmentScores'] = data.get('assessmentScores')
        data['totalScore'] = GradeModel.calculate_total_score(data['assessmentScores'])
        data['letterGrade'] = GradeModel.calculate_letter_grade(data['totalScore'])
        data['gpa'] = GradeModel.calculate_gpa(data['totalScore'])

    data['updatedAt'] = datetime.now()

    result = db.grades.update_one(
        {"_id": ObjectId(grade_id)},
        {"$set": data}
    )

    if result.matched_count == 0:
        return jsonify({"error": "Grade not found", "success": False}), 404

    return jsonify({
        "success": True,
        "message": "Grade updated successfully"
    }), 200

@grade_bp.route('/student/<student_id>', methods=['GET'])
@error_handler
def get_student_grades(student_id):
    """Get all grades for a student"""
    db = request.app.config['DB']

    grades = list(db.grades.find({
        "studentId": ObjectId(student_id),
        "deletedAt": None
    }))

    for grade in grades:
        grade['_id'] = str(grade['_id'])
        grade['studentId'] = str(grade['studentId'])
        grade['courseId'] = str(grade['courseId'])

    return jsonify({"success": True, "data": grades}), 200

@grade_bp.route('/student/<student_id>/gpa', methods=['GET'])
@error_handler
def get_student_gpa(student_id):
    """Get student's overall GPA"""
    from models.student_models import GradeModel
    db = request.app.config['DB']

    gpa = GradeModel.get_student_gpa(db, student_id)

    return jsonify({
        "success": True,
        "studentId": student_id,
        "gpa": gpa
    }), 200

# ==================== ATTENDANCE ENDPOINTS ====================

@attendance_bp.route('', methods=['POST'])
@error_handler
def mark_attendance():
    """Mark attendance for a student"""
    from models.student_models import AttendanceModel
    db = request.app.config['DB']
    data = request.get_json()

    required_fields = ['studentId', 'courseId']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields", "success": False}), 400

    attendance_id = AttendanceModel.mark_attendance(db, data)

    return jsonify({
        "success": True,
        "message": "Attendance marked successfully",
        "attendanceId": str(attendance_id)
    }), 201

@attendance_bp.route('/student/<student_id>', methods=['GET'])
@error_handler
def get_student_attendance(student_id):
    """Get attendance records for a student"""
    db = request.app.config['DB']
    course_id = request.args.get('courseId')

    filters = {
        "studentId": ObjectId(student_id),
        "deletedAt": None
    }
    if course_id:
        filters['courseId'] = ObjectId(course_id)

    records = list(db.attendance.find(filters).sort("date", -1))

    for record in records:
        record['_id'] = str(record['_id'])
        record['studentId'] = str(record['studentId'])
        record['courseId'] = str(record['courseId'])

    return jsonify({"success": True, "data": records}), 200

@attendance_bp.route('/student/<student_id>/rate', methods=['GET'])
@error_handler
def get_attendance_rate(student_id):
    """Get attendance rate for a student"""
    from models.student_models import AttendanceModel
    db = request.app.config['DB']
    course_id = request.args.get('courseId')

    if not course_id:
        return jsonify({"error": "courseId required", "success": False}), 400

    rate = AttendanceModel.get_student_attendance_rate(db, student_id, course_id)

    return jsonify({
        "success": True,
        "studentId": student_id,
        "courseId": course_id,
        "attendanceRate": rate
    }), 200

# ==================== TRANSCRIPT ENDPOINTS ====================

@transcript_bp.route('/student/<student_id>', methods=['GET'])
@error_handler
def get_student_transcript(student_id):
    """Generate transcript for a student"""
    from models.student_models import TranscriptModel
    db = request.app.config['DB']

    transcript = TranscriptModel.generate_transcript(db, student_id)

    if not transcript:
        return jsonify({"error": "Transcript not found", "success": False}), 404

    transcript['_id'] = str(transcript.get('_id', ''))

    return jsonify({"success": True, "data": transcript}), 200

# ==================== SCHEDULE ENDPOINTS ====================

@schedule_bp.route('/student/<student_id>', methods=['GET'])
@error_handler
def get_student_schedule(student_id):
    """Get student's class schedule"""
    from models.student_models import ScheduleModel
    db = request.app.config['DB']

    schedules = ScheduleModel.get_student_schedule(db, student_id)

    for schedule in schedules:
        schedule['_id'] = str(schedule['_id'])
        schedule['courseId'] = str(schedule['courseId'])

    return jsonify({"success": True, "data": schedules}), 200

@schedule_bp.route('', methods=['POST'])
@error_handler
def create_schedule():
    """Create a class schedule"""
    from models.student_models import ScheduleModel
    db = request.app.config['DB']
    data = request.get_json()

    required_fields = ['courseId', 'dayOfWeek', 'startTime', 'endTime']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields", "success": False}), 400

    schedule_id = ScheduleModel.create_schedule(db, data)

    return jsonify({
        "success": True,
        "message": "Schedule created successfully",
        "scheduleId": str(schedule_id)
    }), 201

# ==================== HEALTH CHECK ====================

@student_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "student-management"}), 200

# Register blueprints with Flask app
def register_student_blueprints(app):
    """Register all student management blueprints"""
    app.register_blueprint(student_bp)
    app.register_blueprint(course_bp)
    app.register_blueprint(grade_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(transcript_bp)
    app.register_blueprint(schedule_bp)
