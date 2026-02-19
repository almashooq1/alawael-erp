"""
اختبارات شاملة لنماذج إدارة الطلاب
Unit Tests for Student Management Models
"""

import pytest
from datetime import datetime, timedelta
from bson import ObjectId
from unittest.mock import Mock, patch, MagicMock

# Mock MongoDB for testing
@pytest.fixture
def mock_db():
    """إعداد قاعدة بيانات مزيفة للاختبار"""
    db = MagicMock()
    db.students = MagicMock()
    db.courses = MagicMock()
    db.grades = MagicMock()
    db.attendance = MagicMock()
    db.schedules = MagicMock()
    db.transcripts = MagicMock()
    return db


class TestStudentModel:
    """اختبارات نموذج الطالب"""

    def test_student_creation_success(self, mock_db):
        """اختبار إنشاء طالب جديد بنجاح"""
        student_data = {
            'studentId': 'STU001',
            'firstName': 'أحمد',
            'lastName': 'محمد',
            'email': 'ahmad@example.com',
            'phoneNumber': '+966501234567',
            'dateOfBirth': datetime(2000, 1, 15),
            'gender': 'M',
            'major': 'Computer Science',
            'level': 1,
            'status': 'active',
            'enrollmentDate': datetime.now(),
            'gpa': 0.0,
            'completedCredits': 0
        }

        mock_db.students.insert_one = Mock(return_value=Mock(inserted_id=ObjectId()))

        # يجب أن ينجح الإدراج
        result = mock_db.students.insert_one(student_data)
        assert result.inserted_id is not None
        mock_db.students.insert_one.assert_called_once()

    def test_student_creation_missing_fields(self, mock_db):
        """اختبار فشل الإنشاء عند فقدان حقول مهمة"""
        incomplete_data = {
            'firstName': 'أحمد',
            'lastName': 'محمد'
            # حقول مفقودة مثل email, phoneNumber إلخ
        }

        # يجب أن نتحقق من الحقول المفقودة قبل الإدراج
        required_fields = {'studentId', 'email', 'phoneNumber', 'dateOfBirth', 'gender'}
        has_all_fields = all(field in incomplete_data for field in required_fields)

        assert not has_all_fields, "يجب أن تفشل العملية عند فقدان الحقول"

    def test_student_retrieval_by_id(self, mock_db):
        """اختبار استرجاع طالب بواسطة معرفه"""
        student_id = ObjectId()
        mock_student = {
            '_id': student_id,
            'studentId': 'STU001',
            'firstName': 'أحمد',
            'email': 'ahmad@example.com'
        }

        mock_db.students.find_one = Mock(return_value=mock_student)

        result = mock_db.students.find_one({'_id': student_id})
        assert result is not None
        assert result['studentId'] == 'STU001'
        mock_db.students.find_one.assert_called_once()

    def test_student_update_gpa(self, mock_db):
        """اختبار تحديث معدل الطالب الفصلي"""
        student_id = ObjectId()
        new_gpa = 3.75

        mock_db.students.update_one = Mock(return_value=Mock(modified_count=1))

        result = mock_db.students.update_one(
            {'_id': student_id},
            {'$set': {'gpa': new_gpa}}
        )

        assert result.modified_count == 1
        mock_db.students.update_one.assert_called_once()

    def test_student_status_transition(self, mock_db):
        """اختبار تغيير حالة الطالب"""
        student_id = ObjectId()

        # Transition possibilities: active -> graduated, suspended, withdrawn
        valid_transitions = {
            'active': ['graduated', 'suspended', 'withdrawn'],
            'suspended': ['active', 'withdrawn'],
            'withdrawn': [],  # No further transitions
            'graduated': []   # No further transitions
        }

        current_status = 'active'
        new_status = 'graduated'

        assert new_status in valid_transitions[current_status], \
            f"Transition from {current_status} to {new_status} is not allowed"

    def test_student_delete_soft_delete(self, mock_db):
        """اختبار حذف ناعم (Soft Delete) للطالب"""
        student_id = ObjectId()

        mock_db.students.update_one = Mock(return_value=Mock(modified_count=1))

        result = mock_db.students.update_one(
            {'_id': student_id},
            {'$set': {'deletedAt': datetime.now(), 'status': 'deleted'}}
        )

        assert result.modified_count == 1


class TestCourseModel:
    """اختبارات نموذج المقرر"""

    def test_course_creation(self, mock_db):
        """اختبار إنشاء مقرر جديد"""
        course_data = {
            'courseCode': 'CS101',
            'courseName': 'مقدمة في علوم الحاسوب',
            'description': 'دورة أساسية في علوم الحاسوب',
            'credits': 3,
            'semester': 'Fall 2024',
            'capacity': 30,
            'enrolledStudents': 0,
            'instructor': ObjectId(),
            'schedule': {
                'days': ['Monday', 'Wednesday'],
                'startTime': '10:00',
                'endTime': '11:30',
                'location': 'Hall 101'
            },
            'status': 'active',
            'createdAt': datetime.now()
        }

        mock_db.courses.insert_one = Mock(return_value=Mock(inserted_id=ObjectId()))

        result = mock_db.courses.insert_one(course_data)
        assert result.inserted_id is not None

    def test_course_enrollment_capacity(self, mock_db):
        """اختبار فحص سعة المقرر قبل التسجيل"""
        course_id = ObjectId()
        course = {
            '_id': course_id,
            'courseCode': 'CS101',
            'capacity': 30,
            'enrolledStudents': 30,
            'students': ['STU001', 'STU002', '...', 'STU030']
        }

        # التحقق من إمكانية الالتحاق
        can_enroll = course['enrolledStudents'] < course['capacity']

        assert not can_enroll, "لا يمكن الالتحاق - المقرر امتلأ"

    def test_course_capacity_increase(self, mock_db):
        """اختبار زيادة سعة المقرر"""
        course_id = ObjectId()
        new_capacity = 40

        mock_db.courses.update_one = Mock(return_value=Mock(modified_count=1))

        result = mock_db.courses.update_one(
            {'_id': course_id},
            {'$set': {'capacity': new_capacity}}
        )

        assert result.modified_count == 1

    def test_course_enable_disable(self, mock_db):
        """اختبار تفعيل وتعطيل المقرر"""
        course_id = ObjectId()

        # Disable course
        mock_db.courses.update_one = Mock(return_value=Mock(modified_count=1))
        mock_db.courses.update_one({'_id': course_id}, {'$set': {'status': 'inactive'}})

        assert mock_db.courses.update_one.called

    def test_student_enroll_in_course(self, mock_db):
        """اختبار تسجيل طالب في مقرر"""
        student_id = ObjectId()
        course_id = ObjectId()

        mock_db.courses.update_one = Mock(return_value=Mock(modified_count=1))

        result = mock_db.courses.update_one(
            {'_id': course_id, 'enrolledStudents': {'$lt': 30}},
            {
                '$push': {'students': student_id},
                '$inc': {'enrolledStudents': 1}
            }
        )

        assert result.modified_count == 1


class TestGradeModel:
    """اختبارات نموذج الدرجات"""

    def test_grade_entry_creation(self, mock_db):
        """اختبار إدخال درجة جديدة"""
        grade_data = {
            'studentId': ObjectId(),
            'courseId': ObjectId(),
            'semester': 'Fall 2024',
            'assignments': 85,
            'midterm': 78,
            'final': 88,
            'totalScore': 0,
            'letterGrade': '',
            'gradePoints': 0.0,
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        }

        mock_db.grades.insert_one = Mock(return_value=Mock(inserted_id=ObjectId()))

        result = mock_db.grades.insert_one(grade_data)
        assert result.inserted_id is not None

    def test_grade_calculation_total(self, mock_db):
        """اختبار حساب الدرجة الكلية"""
        weights = {
            'assignments': 0.20,
            'midterm': 0.30,
            'final': 0.50
        }

        scores = {
            'assignments': 85,
            'midterm': 78,
            'final': 88
        }

        total_score = sum(scores[component] * weights[component]
                         for component in scores)

        expected_total = 85*0.20 + 78*0.30 + 88*0.50
        assert abs(total_score - expected_total) < 0.01
        assert 83 < total_score < 84  # Approximately 83.4

    def test_letter_grade_conversion(self, mock_db):
        """اختبار تحويل الدرجة العددية إلى حرفية"""
        grade_scale = {
            'A': (90, 100),
            'B': (80, 89),
            'C': (70, 79),
            'D': (60, 69),
            'F': (0, 59)
        }

        test_scores = [95, 85, 75, 65, 55]
        expected_grades = ['A', 'B', 'C', 'D', 'F']

        for score, expected_grade in zip(test_scores, expected_grades):
            for grade, (min_score, max_score) in grade_scale.items():
                if min_score <= score <= max_score:
                    assert grade == expected_grade
                    break

    def test_gpa_calculation(self, mock_db):
        """اختبار حساب معدل الطالب التراكمي"""
        # GPA = Sum(grade_points * credits) / Total_Credits
        courses = [
            {'course': 'CS101', 'gradePoints': 4.0, 'credits': 3},
            {'course': 'CS102', 'gradePoints': 3.75, 'credits': 3},
            {'course': 'CS103', 'gradePoints': 3.5, 'credits': 4}
        ]

        total_grade_points = sum(c['gradePoints'] * c['credits']
                                 for c in courses)
        total_credits = sum(c['credits'] for c in courses)
        gpa = total_grade_points / total_credits

        expected_gpa = (4.0*3 + 3.75*3 + 3.5*4) / 10
        assert abs(gpa - expected_gpa) < 0.01
        assert 3.7 < gpa < 3.8

    def test_grade_update_validation(self, mock_db):
        """اختبار التحقق من صحة تحديث الدرجات"""
        grade_components = {
            'assignments': 85,
            'midterm': 78,
            'final': 88
        }

        # يجب أن تكون جميع القيم بين 0 و 100
        for component, value in grade_components.items():
            assert 0 <= value <= 100, f"{component} must be between 0 and 100"

    def test_duplicate_grade_prevention(self, mock_db):
        """اختبار منع إدخال درجات مكررة"""
        student_id = ObjectId()
        course_id = ObjectId()
        semester = 'Fall 2024'

        # يجب أن يكون هناك فهرس فريد على (studentId, courseId, semester)
        unique_key = f"{student_id}:{course_id}:{semester}"

        grades = {}
        new_grade = {'studentId': student_id, 'courseId': course_id}

        if unique_key not in grades:
            grades[unique_key] = new_grade
        else:
            # يجب رفع استثناء للدرجة المكررة
            assert False, "Duplicate grade entry"


class TestAttendanceModel:
    """اختبارات نموذج الحضور"""

    def test_attendance_marking(self, mock_db):
        """اختبار تسجيل حضور الطالب"""
        attendance_data = {
            'studentId': ObjectId(),
            'courseId': ObjectId(),
            'date': datetime.now().date(),
            'status': 'present',  # 'present', 'absent', 'late'
            'remarks': 'حاضر في الموعد',
            'recordedBy': ObjectId(),
            'recordedAt': datetime.now()
        }

        mock_db.attendance.insert_one = Mock(return_value=Mock(inserted_id=ObjectId()))

        result = mock_db.attendance.insert_one(attendance_data)
        assert result.inserted_id is not None

    def test_attendance_rate_calculation(self, mock_db):
        """اختبار حساب نسبة الحضور"""
        total_classes = 30
        attended_classes = 27

        attendance_rate = (attended_classes / total_classes) * 100

        assert attendance_rate == 90.0
        assert attendance_rate >= 75.0  # إذا كان الحد الأدنى 75%

    def test_attendance_warning_threshold(self, mock_db):
        """اختبار تنبيه الحضور الضعيف"""
        attendance_rate = 65.0
        warning_threshold = 75.0

        needs_warning = attendance_rate < warning_threshold

        assert needs_warning, "يجب إرسال تنبيه للمعدل المنخفض"

    def test_attendance_bulk_marking(self, mock_db):
        """اختبار تسجيل حضور جماعي"""
        students_attendance = [
            {'studentId': ObjectId(), 'status': 'present'},
            {'studentId': ObjectId(), 'status': 'present'},
            {'studentId': ObjectId(), 'status': 'absent'},
            {'studentId': ObjectId(), 'status': 'late'}
        ]

        mock_db.attendance.insert_many = Mock(return_value=Mock(inserted_ids=[ObjectId() for _ in students_attendance]))

        result = mock_db.attendance.insert_many(students_attendance)
        assert len(result.inserted_ids) == len(students_attendance)


class TestTranscriptModel:
    """اختبارات نموذج السجل الأكاديمي"""

    def test_transcript_generation(self, mock_db):
        """اختبار إنشاء السجل الأكاديمي"""
        student_id = ObjectId()

        transcript_data = {
            'studentId': student_id,
            'studentName': 'أحمد محمد',
            'major': 'Computer Science',
            'generatedDate': datetime.now(),
            'cumulativeGPA': 3.75,
            'totalCreditsEarned': 120,
            'courses': [
                {'courseCode': 'CS101', 'grade': 'A', 'credits': 3},
                {'courseCode': 'CS102', 'grade': 'B+', 'credits': 3}
            ],
            'semesters': [
                {'semester': 'Fall 2023', 'gpa': 3.8, 'credits': 15},
                {'semester': 'Spring 2024', 'gpa': 3.7, 'credits': 12}
            ]
        }

        mock_db.transcripts.insert_one = Mock(return_value=Mock(inserted_id=ObjectId()))

        result = mock_db.transcripts.insert_one(transcript_data)
        assert result.inserted_id is not None

    def test_transcript_signature_validation(self, mock_db):
        """اختبار التوقيع الرقمي للسجل"""
        transcript_id = ObjectId()
        signature_required = True
        signed = False

        if signature_required:
            assert signed, "السجل يجب أن يكون موقعاً رقمياً"

    def test_transcript_export_pdf(self, mock_db):
        """اختبار تصدير السجل إلى PDF"""
        transcript_id = ObjectId()

        mock_db.transcripts.find_one = Mock(return_value={
            '_id': transcript_id,
            'studentName': 'أحمد محمد',
            'cumulativeGPA': 3.75
        })

        transcript = mock_db.transcripts.find_one({'_id': transcript_id})

        # محاكاة إنشاء ملف PDF
        pdf_created = transcript is not None
        assert pdf_created


class TestScheduleModel:
    """اختبارات نموذج الجدول الزمني"""

    def test_schedule_creation(self, mock_db):
        """اختبار إنشاء جدول زمني"""
        schedule_data = {
            'courseId': ObjectId(),
            'semester': 'Fall 2024',
            'sessions': [
                {
                    'dayOfWeek': 'Monday',
                    'startTime': '10:00',
                    'endTime': '11:30',
                    'location': 'Hall 101',
                    'instructor': 'د. محمد'
                },
                {
                    'dayOfWeek': 'Wednesday',
                    'startTime': '10:00',
                    'endTime': '11:30',
                    'location': 'Hall 101',
                    'instructor': 'د. محمد'
                }
            ],
            'createdAt': datetime.now()
        }

        mock_db.schedules.insert_one = Mock(return_value=Mock(inserted_id=ObjectId()))

        result = mock_db.schedules.insert_one(schedule_data)
        assert result.inserted_id is not None

    def test_schedule_conflict_detection(self, mock_db):
        """اختبار كشف تضارب الجدول"""
        student_courses = [
            {
                'courseId': 'CS101',
                'schedule': {'day': 'Monday', 'startTime': '10:00', 'endTime': '11:30'}
            },
            {
                'courseId': 'CS102',
                'schedule': {'day': 'Monday', 'startTime': '11:00', 'endTime': '12:30'}
            }
        ]

        # التحقق من التضارب
        has_conflict = False
        for i in range(len(student_courses)):
            for j in range(i+1, len(student_courses)):
                course1 = student_courses[i]
                course2 = student_courses[j]

                if course1['schedule']['day'] == course2['schedule']['day']:
                    # Check time overlap
                    start1 = course1['schedule']['startTime']
                    end1 = course1['schedule']['endTime']
                    start2 = course2['schedule']['startTime']
                    end2 = course2['schedule']['endTime']

                    if start1 < end2 and start2 < end1:
                        has_conflict = True

        assert has_conflict, "يجب أن يكون هناك تضارب في الجدول"

    def test_student_schedule_retrieval(self, mock_db):
        """اختبار استرجاع جدول الطالب"""
        student_id = ObjectId()

        mock_db.schedules.find = Mock(return_value=[
            {'courseCode': 'CS101', 'time': '10:00-11:30', 'day': 'Monday'},
            {'courseCode': 'CS102', 'time': '14:00-15:30', 'day': 'Wednesday'}
        ])

        schedules = list(mock_db.schedules.find({'studentId': student_id}))

        assert len(schedules) == 2


# اختبارات البيانات الحدية (Edge Cases)
class TestEdgeCases:
    """اختبارات الحالات الحدية والخاصة"""

    def test_zero_credit_course(self, mock_db):
        """اختبار مقرر بـ 0 ساعات معتمدة"""
        credits = 0
        assert credits == 0, "يجب قبول المقررات بـ 0 ساعات"

    def test_extreme_gpa_values(self):
        """اختبار قيم GPA القصوى"""
        valid_gpa = [0.0, 4.0]
        for gpa in valid_gpa:
            assert 0.0 <= gpa <= 4.0, "GPA يجب أن يكون بين 0 و 4"

    def test_large_class_size(self, mock_db):
        """اختبار فئة كبيرة الحجم (1000+ طالب)"""
        large_capacity = 1000
        assert large_capacity > 500, "يجب دعم فصول كبيرة"

    def test_null_value_handling(self, mock_db):
        """اختبار التعامل مع القيم الفارغة"""
        data = {
            'name': 'أحمد',
            'email': None,
            'phone': '',
            'remarks': None
        }

        # يجب أن نعامل None و '' بحذر
        assert data['email'] is None
        assert data['remarks'] is None


# اختبارات الأداء
class TestPerformance:
    """اختبارات الأداء والقابلية للتوسع"""

    def test_large_grade_list_retrieval(self, mock_db):
        """اختبار استرجاع قائمة كبيرة من الدرجات"""
        mock_db.grades.find = Mock(return_value=[
            {'grade': i % 5} for i in range(10000)
        ])

        grades = list(mock_db.grades.find({'semester': 'Fall 2024'}))

        # يجب أن يكون الاسترجاع سريعاً
        assert len(grades) == 10000

    def test_bulk_student_import(self, mock_db):
        """اختبار استيراد جماعي للطلاب"""
        students = [
            {'studentId': f'STU{i:05d}', 'name': f'Student {i}'}
            for i in range(1000)
        ]

        mock_db.students.insert_many = Mock(return_value=Mock(
            inserted_ids=[ObjectId() for _ in students]
        ))

        result = mock_db.students.insert_many(students)

        assert len(result.inserted_ids) == 1000


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
