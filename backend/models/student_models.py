"""
Student Management System - Database Models
Models for Student, Course, Grade, Attendance, and Transcript management
"""

from datetime import datetime
from pymongo import MongoClient
from enum import Enum
from bson.objectid import ObjectId
import hashlib

class StudentStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    GRADUATED = "graduated"
    SUSPENDED = "suspended"
    TRANSFERRED = "transferred"

class GradeStatus(Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    APPROVED = "approved"

class AttendanceStatus(Enum):
    PRESENT = "present"
    ABSENT = "absent"
    EXCUSE = "excuse"
    LATE = "late"

class StudentModel:
    """Student Information Model"""

    @staticmethod
    def create_student(db, student_data):
        """Create a new student record"""
        student = {
            "studentId": student_data.get("studentId"),
            "firstName": student_data.get("firstName"),
            "lastName": student_data.get("lastName"),
            "email": student_data.get("email"),
            "phone": student_data.get("phone"),
            "dateOfBirth": student_data.get("dateOfBirth"),
            "gender": student_data.get("gender"),
            "enrollmentDate": student_data.get("enrollmentDate", datetime.now()),
            "major": student_data.get("major"),
            "level": student_data.get("level", 1),
            "status": student_data.get("status", "active"),
            "gpa": 0.0,
            "totalCredits": 0,
            "address": {
                "street": student_data.get("address_street", ""),
                "city": student_data.get("address_city", ""),
                "postalCode": student_data.get("address_postal_code", ""),
                "country": student_data.get("address_country", "")
            },
            "guardianInfo": {
                "name": student_data.get("guardian_name", ""),
                "phone": student_data.get("guardian_phone", ""),
                "email": student_data.get("guardian_email", ""),
                "relationship": student_data.get("guardian_relationship", "")
            },
            "photo": student_data.get("photo", ""),
            "documents": [],
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
            "createdBy": student_data.get("createdBy"),
            "deletedAt": None
        }
        result = db.students.insert_one(student)
        return result.inserted_id

    @staticmethod
    def get_student(db, student_id):
        """Get student by ID"""
        if isinstance(student_id, str):
            try:
                student_id = ObjectId(student_id)
            except:
                return db.students.find_one({"studentId": student_id})
        return db.students.find_one({"_id": student_id})

    @staticmethod
    def update_student(db, student_id, update_data):
        """Update student information"""
        if isinstance(student_id, str):
            try:
                student_id = ObjectId(student_id)
            except:
                student_id = {"studentId": student_id}

        update_data["updatedAt"] = datetime.now()
        result = db.students.update_one({"_id": student_id}, {"$set": update_data})
        return result.modified_count

    @staticmethod
    def get_all_students(db, filters=None, page=1, page_size=10):
        """Get all students with pagination"""
        query = {"deletedAt": None}
        if filters:
            query.update(filters)

        skip = (page - 1) * page_size
        students = list(db.students.find(query).skip(skip).limit(page_size))
        total = db.students.count_documents(query)

        return students, total

class CourseModel:
    """Course Information Model"""

    @staticmethod
    def create_course(db, course_data):
        """Create a new course"""
        course = {
            "courseCode": course_data.get("courseCode"),
            "courseName": course_data.get("courseName"),
            "description": course_data.get("description", ""),
            "credits": course_data.get("credits", 3),
            "level": course_data.get("level", 1),
            "instructor": course_data.get("instructor"),
            "semester": course_data.get("semester"),
            "schedule": course_data.get("schedule", []),
            "capacity": course_data.get("capacity", 40),
            "enrolled": 0,
            "enrolledStudents": [],
            "prerequisite": course_data.get("prerequisite", []),
            "location": course_data.get("location", ""),
            "startDate": course_data.get("startDate"),
            "endDate": course_data.get("endDate"),
            "status": "active",
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
            "createdBy": course_data.get("createdBy"),
            "deletedAt": None
        }
        result = db.courses.insert_one(course)
        return result.inserted_id

    @staticmethod
    def enroll_student(db, course_id, student_id):
        """Enroll a student in a course"""
        course = db.courses.find_one({"_id": ObjectId(course_id)})

        if not course:
            return False

        if course["enrolled"] >= course["capacity"]:
            return False

        if student_id in course["enrolledStudents"]:
            return False

        db.courses.update_one(
            {"_id": ObjectId(course_id)},
            {
                "$addToSet": {"enrolledStudents": student_id},
                "$inc": {"enrolled": 1}
            }
        )
        return True

class GradeModel:
    """Grade Information Model"""

    @staticmethod
    def create_grade(db, grade_data):
        """Create a new grade record"""
        grade = {
            "studentId": ObjectId(grade_data.get("studentId")),
            "courseId": ObjectId(grade_data.get("courseId")),
            "semester": grade_data.get("semester"),
            "year": grade_data.get("year"),
            "assessmentScores": {
                "attendance": grade_data.get("attendance", 0),
                "participation": grade_data.get("participation", 0),
                "assignment": grade_data.get("assignment", 0),
                "midTerm": grade_data.get("midTerm", 0),
                "project": grade_data.get("project", 0),
                "final": grade_data.get("final", 0)
            },
            "totalScore": 0,
            "letterGrade": "",
            "gpa": 0.0,
            "status": "pending",
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
            "submittedAt": None,
            "createdBy": grade_data.get("createdBy"),
            "deletedAt": None
        }

        # Calculate total score and grade
        grade["totalScore"] = GradeModel.calculate_total_score(grade["assessmentScores"])
        grade["letterGrade"] = GradeModel.calculate_letter_grade(grade["totalScore"])
        grade["gpa"] = GradeModel.calculate_gpa(grade["totalScore"])

        result = db.grades.insert_one(grade)
        return result.inserted_id

    @staticmethod
    def calculate_total_score(scores):
        """Calculate weighted total score"""
        weights = {
            "attendance": 0.05,
            "participation": 0.05,
            "assignment": 0.15,
            "midTerm": 0.25,
            "project": 0.15,
            "final": 0.35
        }
        total = sum(scores.get(key, 0) * weights[key] for key in weights)
        return round(total, 2)

    @staticmethod
    def calculate_letter_grade(score):
        """Convert numerical score to letter grade"""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"

    @staticmethod
    def calculate_gpa(score):
        """Convert score to GPA (out of 4.0)"""
        if score >= 90:
            return 4.0
        elif score >= 80:
            return 3.5
        elif score >= 70:
            return 3.0
        elif score >= 60:
            return 2.0
        else:
            return 0.0

    @staticmethod
    def get_student_gpa(db, student_id):
        """Calculate overall GPA for a student"""
        grades = list(db.grades.find({
            "studentId": ObjectId(student_id),
            "status": "approved",
            "deletedAt": None
        }))

        if not grades:
            return 0.0

        total_gpa = sum(g["gpa"] for g in grades)
        return round(total_gpa / len(grades), 2)

class AttendanceModel:
    """Attendance Record Model"""

    @staticmethod
    def mark_attendance(db, attendance_data):
        """Mark attendance for a student"""
        attendance = {
            "studentId": ObjectId(attendance_data.get("studentId")),
            "courseId": ObjectId(attendance_data.get("courseId")),
            "date": attendance_data.get("date", datetime.now()),
            "status": attendance_data.get("status", "present"),
            "checkInTime": attendance_data.get("checkInTime"),
            "checkOutTime": attendance_data.get("checkOutTime"),
            "notes": attendance_data.get("notes", ""),
            "createdAt": datetime.now(),
            "createdBy": attendance_data.get("createdBy"),
            "deletedAt": None
        }
        result = db.attendance.insert_one(attendance)
        return result.inserted_id

    @staticmethod
    def get_student_attendance_rate(db, student_id, course_id):
        """Calculate attendance rate for a student in a course"""
        total_classes = db.attendance.count_documents({
            "courseId": ObjectId(course_id),
            "deletedAt": None
        })

        attended_classes = db.attendance.count_documents({
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id),
            "status": {"$in": ["present", "late"]},
            "deletedAt": None
        })

        if total_classes == 0:
            return 0.0

        return round((attended_classes / total_classes) * 100, 2)

class TranscriptModel:
    """Academic Transcript Model"""

    @staticmethod
    def generate_transcript(db, student_id):
        """Generate academic transcript for a student"""
        student = db.students.find_one({"_id": ObjectId(student_id)})
        grades = list(db.grades.find({
            "studentId": ObjectId(student_id),
            "status": "approved",
            "deletedAt": None
        }).sort("semester", -1))

        if not student or not grades:
            return None

        transcript = {
            "studentId": student_id,
            "studentName": f"{student['firstName']} {student['lastName']}",
            "studentEmail": student["email"],
            "major": student["major"],
            "enrollmentDate": student["enrollmentDate"],
            "grades": grades,
            "totalCredits": sum(db.courses.find_one({"_id": g["courseId"]})["credits"]
                              for g in grades if db.courses.find_one({"_id": g["courseId"]})),
            "cumulativeGPA": GradeModel.get_student_gpa(db, student_id),
            "completedCourses": len(grades),
            "generatedAt": datetime.now(),
            "generatedBy": "System",
            "isOfficial": False
        }

        return transcript

class ScheduleModel:
    """Class Schedule Model"""

    @staticmethod
    def create_schedule(db, schedule_data):
        """Create a class schedule"""
        schedule = {
            "courseId": ObjectId(schedule_data.get("courseId")),
            "dayOfWeek": schedule_data.get("dayOfWeek"),
            "startTime": schedule_data.get("startTime"),
            "endTime": schedule_data.get("endTime"),
            "location": schedule_data.get("location"),
            "instructor": schedule_data.get("instructor"),
            "classRoom": schedule_data.get("classRoom"),
            "capacity": schedule_data.get("capacity"),
            "type": schedule_data.get("type", "lecture"),  # lecture, lab, tutorial
            "startDate": schedule_data.get("startDate"),
            "endDate": schedule_data.get("endDate"),
            "createdAt": datetime.now(),
            "createdBy": schedule_data.get("createdBy"),
            "deletedAt": None
        }
        result = db.schedules.insert_one(schedule)
        return result.inserted_id

    @staticmethod
    def get_student_schedule(db, student_id):
        """Get a student's complete schedule"""
        # Get all courses for the student
        courses = db.courses.find({"enrolledStudents": ObjectId(student_id)})
        course_ids = [c["_id"] for c in courses]

        # Get schedules for these courses
        schedules = list(db.schedules.find({
            "courseId": {"$in": course_ids},
            "deletedAt": None
        }).sort("dayOfWeek", 1).sort("startTime", 1))

        return schedules

# Database initialization function
def init_db(db):
    """Initialize database collections with indexes"""

    # Create indexes for better performance
    db.students.create_index("studentId", unique=True)
    db.students.create_index("email", unique=True)
    db.courses.create_index("courseCode", unique=True)
    db.grades.create_index([("studentId", 1), ("courseId", 1), ("semester", 1)], unique=True)
    db.attendance.create_index([("studentId", 1), ("courseId", 1), ("date", 1)], unique=True)
    db.schedules.create_index("courseId")

    print("Database indexes created successfully")
