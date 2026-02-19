"""
Student Management Integration Services
Integration with HR, Finance, Communications, and Documents systems
"""

from datetime import datetime
from bson.objectid import ObjectId
import requests
import logging

logger = logging.getLogger(__name__)

class StudentHRIntegration:
    """Integration with HR System"""

    @staticmethod
    def sync_student_to_hr(db, student_id):
        """Sync student information to HR system"""
        student = db.students.find_one({"_id": ObjectId(student_id)})

        if not student:
            return False

        hr_record = {
            "externalId": student_id,
            "source": "student_management",
            "firstName": student.get("firstName"),
            "lastName": student.get("lastName"),
            "email": student.get("email"),
            "phone": student.get("phone"),
            "dateOfBirth": student.get("dateOfBirth"),
            "address": student.get("address"),
            "recordType": "student",
            "status": "active",
            "syncedAt": datetime.now()
        }

        # Insert into HR collection if exists
        if "hr_records" in db.list_collection_names():
            db.hr_records.update_one(
                {"externalId": student_id, "source": "student_management"},
                {"$set": hr_record},
                upsert=True
            )

        return True

class StudentFinanceIntegration:
    """Integration with Finance System"""

    @staticmethod
    def create_student_fee_record(db, student_id, course_ids=None):
        """Create fee records for student enrollment"""
        student = db.students.find_one({"_id": ObjectId(student_id)})

        if not student:
            return False

        courses = []
        if course_ids:
            courses = list(db.courses.find({"_id": {"$in": course_ids}}))
        else:
            courses = list(db.courses.find({"enrolledStudents": ObjectId(student_id)}))

        total_fee = 0
        for course in courses:
            # Assuming standard fee per credit
            course_fee = course.get("credits", 3) * 100  # $100 per credit
            total_fee += course_fee

        fee_record = {
            "studentId": ObjectId(student_id),
            "studentName": f"{student.get('firstName')} {student.get('lastName')}",
            "semester": student.get("semester", "Fall 2024"),
            "courses": [str(c["_id"]) for c in courses],
            "totalFee": total_fee,
            "paidAmount": 0,
            "remainingAmount": total_fee,
            "status": "pending",
            "dueDate": datetime(2024, 9, 1),  # Adjust based on semester
            "createdAt": datetime.now(),
            "syncedAt": datetime.now()
        }

        if "student_fees" in db.list_collection_names():
            result = db.student_fees.insert_one(fee_record)
            return result.inserted_id

        return False

    @staticmethod
    def link_payment_to_student(db, student_id, payment_id, amount):
        """Link a finance payment to student fee record"""
        fee_record = db.student_fees.find_one({"studentId": ObjectId(student_id)})

        if not fee_record:
            return False

        db.student_fees.update_one(
            {"_id": fee_record["_id"]},
            {
                "$inc": {"paidAmount": amount, "remainingAmount": -amount},
                "$push": {"payments": payment_id},
                "$set": {
                    "status": "paid" if (fee_record["totalFee"] - amount) <= 0 else "partial",
                    "lastPaymentDate": datetime.now()
                }
            }
        )

        return True

class StudentCommunicationsIntegration:
    """Integration with Communications System"""

    @staticmethod
    def send_grade_notification(db, student_id, course_name, letter_grade, gpa):
        """Send grade notification to student"""
        student = db.students.find_one({"_id": ObjectId(student_id)})

        if not student:
            return False

        notification = {
            "recipientId": ObjectId(student_id),
            "recipientEmail": student.get("email"),
            "recipientPhone": student.get("phone"),
            "type": "academic_notification",
            "subject": f"Grade Posted - {course_name}",
            "message": f"Dear {student.get('firstName')}, your grade for {course_name} is {letter_grade} (GPA: {gpa})",
            "channel": ["email", "sms"],
            "priority": "medium",
            "status": "pending",
            "createdAt": datetime.now(),
            "relatedIds": {"studentId": student_id, "courseId": course_name}
        }

        if "notifications" in db.list_collection_names():
            result = db.notifications.insert_one(notification)
            return result.inserted_id

        return False

    @staticmethod
    def send_attendance_warning(db, student_id, attendance_rate):
        """Send attendance warning to student"""
        student = db.students.find_one({"_id": ObjectId(student_id)})

        if not student:
            return False

        if attendance_rate < 75:
            message = f"Your attendance rate is {attendance_rate}%. Please attend classes regularly or contact your advisor."
        elif attendance_rate < 80:
            message = f"Your attendance rate is {attendance_rate}%. Consider improving your attendance."
        else:
            return False

        notification = {
            "recipientId": ObjectId(student_id),
            "recipientEmail": student.get("email"),
            "type": "attendance_warning",
            "subject": "Attendance Warning",
            "message": message,
            "channel": ["email"],
            "priority": "high",
            "status": "pending",
            "createdAt": datetime.now()
        }

        if "notifications" in db.list_collection_names():
            result = db.notifications.insert_one(notification)
            return result.inserted_id

        return False

    @staticmethod
    def send_enrollment_confirmation(db, student_id, course_id):
        """Send enrollment confirmation to student"""
        student = db.students.find_one({"_id": ObjectId(student_id)})
        course = db.courses.find_one({"_id": ObjectId(course_id)})

        if not student or not course:
            return False

        notification = {
            "recipientId": ObjectId(student_id),
            "recipientEmail": student.get("email"),
            "type": "enrollment_confirmation",
            "subject": f"Enrollment Confirmed - {course.get('courseName')}",
            "message": f"You have been successfully enrolled in {course.get('courseName')} ({course.get('courseCode')})",
            "channel": ["email"],
            "priority": "medium",
            "status": "pending",
            "createdAt": datetime.now(),
            "relatedIds": {"studentId": student_id, "courseId": course_id}
        }

        if "notifications" in db.list_collection_names():
            result = db.notifications.insert_one(notification)
            return result.inserted_id

        return False

class StudentDocumentIntegration:
    """Integration with Document Management System"""

    @staticmethod
    def create_transcript_document(db, student_id):
        """Create and store transcript as document"""
        from models.student_models import TranscriptModel

        transcript = TranscriptModel.generate_transcript(db, student_id)

        if not transcript:
            return False

        document = {
            "documentType": "transcript",
            "studentId": ObjectId(student_id),
            "studentName": transcript.get("studentName"),
            "content": transcript,
            "fileFormat": "pdf",
            "fileName": f"Transcript_{student_id}_{datetime.now().strftime('%Y%m%d')}.pdf",
            "status": "generated",
            "isOfficial": False,
            "createdAt": datetime.now(),
            "createdBy": "system",
            "expiryDate": None
        }

        if "documents" in db.list_collection_names():
            result = db.documents.insert_one(document)
            return result.inserted_id

        return False

    @staticmethod
    def store_student_documents(db, student_id, documents):
        """Store student documents (ID, certificates, etc.)"""
        doc_records = []

        for doc in documents:
            record = {
                "studentId": ObjectId(student_id),
                "documentType": doc.get("type"),  # ID, Certificate, etc.
                "fileName": doc.get("fileName"),
                "filePath": doc.get("filePath"),
                "fileSize": doc.get("fileSize"),
                "mimeType": doc.get("mimeType"),
                "uploadedAt": datetime.now(),
                "uploadedBy": doc.get("uploadedBy"),
                "status": "approved"
            }

            if "documents" in db.list_collection_names():
                result = db.documents.insert_one(record)
                doc_records.append(result.inserted_id)

        return doc_records

class StudentAnalyticsIntegration:
    """Integration with Analytics/Reporting System"""

    @staticmethod
    def record_student_event(db, student_id, event_type, event_data):
        """Record student activity events for analytics"""
        event = {
            "studentId": ObjectId(student_id),
            "eventType": event_type,  # login, grade_received, attendance, etc.
            "eventData": event_data,
            "timestamp": datetime.now(),
            "source": "student_management_system"
        }

        if "student_events" in db.list_collection_names():
            result = db.student_events.insert_one(event)
            return result.inserted_id

        return False

    @staticmethod
    def get_student_analytics(db, student_id):
        """Get analytics data for a student"""
        from models.student_models import GradeModel, AttendanceModel

        student = db.students.find_one({"_id": ObjectId(student_id)})
        if not student:
            return None

        # Get grades summary
        grades = list(db.grades.find({
            "studentId": ObjectId(student_id),
            "status": "approved",
            "deletedAt": None
        }))

        # Get attendance summary
        courses = db.courses.find({"enrolledStudents": ObjectId(student_id)})
        course_ids = [c["_id"] for c in courses]

        attendance_records = list(db.attendance.find({
            "studentId": ObjectId(student_id),
            "courseId": {"$in": course_ids},
            "deletedAt": None
        }))

        # Calculate statistics
        avg_gpa = GradeModel.get_student_gpa(db, student_id)
        total_courses = len(grades)
        completed_courses = len([g for g in grades if g["status"] == "approved"])

        analytics = {
            "studentId": student_id,
            "studentName": f"{student['firstName']} {student['lastName']}",
            "major": student.get("major"),
            "level": student.get("level"),
            "gpa": avg_gpa,
            "totalCourses": total_courses,
            "completedCourses": completed_courses,
            "grades": {
                "A": len([g for g in grades if g["letterGrade"] == "A"]),
                "B": len([g for g in grades if g["letterGrade"] == "B"]),
                "C": len([g for g in grades if g["letterGrade"] == "C"]),
                "D": len([g for g in grades if g["letterGrade"] == "D"]),
                "F": len([g for g in grades if g["letterGrade"] == "F"])
            },
            "attendance": {
                "totalRecords": len(attendance_records),
                "present": len([a for a in attendance_records if a["status"] == "present"]),
                "absent": len([a for a in attendance_records if a["status"] == "absent"]),
                "late": len([a for a in attendance_records if a["status"] == "late"])
            },
            "generatedAt": datetime.now()
        }

        return analytics

class StudentWorkflowService:
    """Workflow orchestration for student operations"""

    @staticmethod
    def complete_student_enrollment(db, student_id, course_ids):
        """Complete full enrollment workflow"""
        from models.student_models import CourseModel, StudentFinanceIntegration, StudentCommunicationsIntegration

        success = True

        try:
            # Enroll in courses
            for course_id in course_ids:
                CourseModel.enroll_student(db, course_id, ObjectId(student_id))
                StudentCommunicationsIntegration.send_enrollment_confirmation(db, student_id, course_id)

            # Create fee records
            StudentFinanceIntegration.create_student_fee_record(db, student_id, course_ids)

            # Sync to HR
            StudentHRIntegration.sync_student_to_hr(db, student_id)

            # Record event
            StudentAnalyticsIntegration.record_student_event(
                db,
                student_id,
                "enrollment_completed",
                {"courses": course_ids, "timestamp": datetime.now()}
            )

        except Exception as e:
            logger.error(f"Error completing enrollment for student {student_id}: {str(e)}")
            success = False

        return success

    @staticmethod
    def process_grade_posting(db, grade_id):
        """Process grade posting and notifications"""
        from models.student_models import StudentCommunicationsIntegration, StudentAnalyticsIntegration

        grade = db.grades.find_one({"_id": ObjectId(grade_id)})

        if not grade:
            return False

        try:
            # Update grade status
            db.grades.update_one(
                {"_id": ObjectId(grade_id)},
                {"$set": {"status": "approved", "submittedAt": datetime.now()}}
            )

            # Get course info
            course = db.courses.find_one({"_id": grade["courseId"]})

            # Send notification
            StudentCommunicationsIntegration.send_grade_notification(
                db,
                str(grade["studentId"]),
                course.get("courseName") if course else "Course",
                grade.get("letterGrade"),
                grade.get("gpa")
            )

            # Record event
            StudentAnalyticsIntegration.record_student_event(
                db,
                str(grade["studentId"]),
                "grade_received",
                {"courseId": str(grade["courseId"]), "grade": grade.get("letterGrade")}
            )

            return True

        except Exception as e:
            logger.error(f"Error processing grade {grade_id}: {str(e)}")
            return False
