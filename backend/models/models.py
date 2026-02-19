"""
قاعدة البيانات - النماذج (Models)
Database Models for Student Management System
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()


# ==========================================
# 1. نموذج الطالب (Student)
# ==========================================

class Student(db.Model):
    """نموذج بيانات الطالب"""
    __tablename__ = 'students'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True)
    grade = db.Column(db.String(50), nullable=False)  # الصف
    section = db.Column(db.String(50))  # الشعبة
    student_id = db.Column(db.String(50), unique=True)  # رقم الطالب
    gpa = db.Column(db.Float, default=0.0)  # المعدل التراكمي
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # العلاقات
    grades = db.relationship('Grade', backref='student', lazy=True, cascade='all, delete-orphan')
    attendance_records = db.relationship('Attendance', backref='student', lazy=True, cascade='all, delete-orphan')
    behavior_records = db.relationship('BehaviorRecord', backref='student', lazy=True, cascade='all, delete-orphan')
    skills_assessments = db.relationship('SkillsAssessment', backref='student', lazy=True, cascade='all, delete-orphan')
    scheduled_reports = db.relationship('ScheduledReport', backref='student', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Student {self.name} ({self.student_id})>'
    
    def to_dict(self):
        """تحويل إلى قاموس"""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'grade': self.grade,
            'section': self.section,
            'student_id': self.student_id,
            'gpa': self.gpa
        }


# ==========================================
# 2. نموذج الدرجات (Grade)
# ==========================================

class Grade(db.Model):
    """نموذج درجات الطالب"""
    __tablename__ = 'grades'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(50), db.ForeignKey('students.id'), nullable=False)
    subject = db.Column(db.String(100), nullable=False)  # المادة
    score = db.Column(db.Float, nullable=False)  # الدرجة
    max_score = db.Column(db.Float, default=100)  # الدرجة العظمى
    weight = db.Column(db.Float, default=1.0)  # وزن المادة
    grade_type = db.Column(db.String(50))  # نوع الاختبار: quiz, midterm, final
    date = db.Column(db.DateTime, nullable=False, default=datetime.now)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def __repr__(self):
        return f'<Grade {self.subject}: {self.score}/{self.max_score}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'subject': self.subject,
            'score': self.score,
            'max_score': self.max_score,
            'percentage': (self.score / self.max_score * 100) if self.max_score > 0 else 0,
            'weight': self.weight,
            'grade_type': self.grade_type,
            'date': self.date.isoformat() if self.date else None
        }


# ==========================================
# 3. نموذج الحضور (Attendance)
# ==========================================

class Attendance(db.Model):
    """نموذج الحضور والغياب"""
    __tablename__ = 'attendance'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(50), db.ForeignKey('students.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False)  # present, absent, late, excused
    notes = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    __table_args__ = (
        db.UniqueConstraint('student_id', 'date', name='unique_attendance'),
    )
    
    def __repr__(self):
        return f'<Attendance {self.student_id}: {self.date} ({self.status})>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'status': self.status,
            'notes': self.notes
        }


# ==========================================
# 4. نموذج السلوك (BehaviorRecord)
# ==========================================

class BehaviorRecord(db.Model):
    """نموذج سجل السلوك والانضباط"""
    __tablename__ = 'behavior_records'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(50), db.ForeignKey('students.id'), nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.now)
    type = db.Column(db.String(20), nullable=False)  # positive, warning, incident
    behavior = db.Column(db.String(255), nullable=False)
    score = db.Column(db.Integer, default=0)  # من 0-100
    comments = db.Column(db.Text)
    reported_by = db.Column(db.String(100))  # اسم المعلم
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def __repr__(self):
        return f'<BehaviorRecord {self.student_id}: {self.type}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'type': self.type,
            'behavior': self.behavior,
            'score': self.score,
            'comments': self.comments,
            'reported_by': self.reported_by
        }


# ==========================================
# 5. نموذج تقييم المهارات (SkillsAssessment)
# ==========================================

class SkillsAssessment(db.Model):
    """نموذج تقييم المهارات"""
    __tablename__ = 'skills_assessments'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(50), db.ForeignKey('students.id'), nullable=False)
    
    # المهارات الأكاديمية
    academic_skills = db.Column(db.Float, default=0.0)
    reading = db.Column(db.Float, default=0.0)
    writing = db.Column(db.Float, default=0.0)
    math = db.Column(db.Float, default=0.0)
    critical_thinking = db.Column(db.Float, default=0.0)
    
    # مهارات الحياة
    life_skills = db.Column(db.Float, default=0.0)
    communication = db.Column(db.Float, default=0.0)
    leadership = db.Column(db.Float, default=0.0)
    time_management = db.Column(db.Float, default=0.0)
    
    # المهارات الاجتماعية
    social_skills = db.Column(db.Float, default=0.0)
    teamwork = db.Column(db.Float, default=0.0)
    empathy = db.Column(db.Float, default=0.0)
    cooperation = db.Column(db.Float, default=0.0)
    
    # المهارات الإدراكية
    cognitive_skills = db.Column(db.Float, default=0.0)
    memory = db.Column(db.Float, default=0.0)
    problem_solving = db.Column(db.Float, default=0.0)
    attention = db.Column(db.Float, default=0.0)
    
    # المهارات العاطفية
    emotional_skills = db.Column(db.Float, default=0.0)
    self_awareness = db.Column(db.Float, default=0.0)
    self_regulation = db.Column(db.Float, default=0.0)
    motivation = db.Column(db.Float, default=0.0)
    
    assessment_date = db.Column(db.DateTime, nullable=False, default=datetime.now)
    assessed_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def __repr__(self):
        return f'<SkillsAssessment {self.student_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'academic_skills': self.academic_skills,
            'life_skills': self.life_skills,
            'social_skills': self.social_skills,
            'cognitive_skills': self.cognitive_skills,
            'emotional_skills': self.emotional_skills,
            'assessment_date': self.assessment_date.isoformat() if self.assessment_date else None
        }


# ==========================================
# 6. نموذج التقارير المجدولة (ScheduledReport)
# ==========================================

class ScheduledReport(db.Model):
    """نموذج التقارير المجدولة"""
    __tablename__ = 'scheduled_reports'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(50), db.ForeignKey('students.id'), nullable=False)
    
    # تفاصيل الجدولة
    frequency = db.Column(db.String(20), nullable=False)  # weekly, monthly, quarterly
    recipients = db.Column(db.String(500), nullable=False)  # emails
    report_type = db.Column(db.String(50), default='comprehensive')
    report_format = db.Column(db.String(20), default='pdf')  # pdf, excel, csv
    
    # الحالة
    active = db.Column(db.Boolean, default=True)
    
    # الإرسال التالي
    next_send = db.Column(db.DateTime, nullable=False)
    last_sent = db.Column(db.DateTime)
    
    # التتبع
    send_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f'<ScheduledReport {self.student_id}: {self.frequency}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'frequency': self.frequency,
            'recipients': self.recipients.split(','),
            'report_type': self.report_type,
            'report_format': self.report_format,
            'active': self.active,
            'next_send': self.next_send.isoformat() if self.next_send else None,
            'last_sent': self.last_sent.isoformat() if self.last_sent else None,
            'send_count': self.send_count
        }


# ==========================================
# 7. نموذج التخزين المؤقت (ReportCache)
# ==========================================

class StudentReportCache(db.Model):
    """نموذج تخزين التقارير مؤقتاً"""
    __tablename__ = 'student_report_cache'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(50), db.ForeignKey('students.id'), nullable=False)
    report_type = db.Column(db.String(50), nullable=False)
    
    # البيانات المخزنة
    report_data = db.Column(db.JSON)
    date_from = db.Column(db.Date)
    date_to = db.Column(db.Date)
    
    # مدة الصلاحية
    created_at = db.Column(db.DateTime, default=datetime.now)
    expires_at = db.Column(db.DateTime)
    
    def is_valid(self):
        """التحقق من صلاحية البيانات"""
        if self.expires_at is None:
            return False
        return datetime.now() < self.expires_at
    
    def __repr__(self):
        return f'<StudentReportCache {self.student_id}: {self.report_type}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'report_type': self.report_type,
            'is_valid': self.is_valid(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }


# ==========================================
# وظائف مساعدة
# ==========================================

def init_db(app):
    """تهيئة قاعدة البيانات"""
    with app.app_context():
        db.create_all()
        print("✅ تم إنشاء جداول قاعدة البيانات")


def seed_sample_data():
    """إضافة بيانات عينة للاختبار"""
    from datetime import timedelta
    
    # التحقق من وجود بيانات
    if Student.query.first():
        print("✅ البيانات موجودة بالفعل")
        return
    
    # إنشاء طالب عينة
    student = Student(
        name="أحمد محمد علي",
        email="ahmed@example.com",
        grade="الصف الخامس",
        section="أ",
        student_id="2024001",
        gpa=4.2
    )
    db.session.add(student)
    db.session.flush()  # لتوليد الـ ID
    
    # إضافة درجات عينة
    subjects = [
        ("الرياضيات", 92, "quiz"),
        ("العلوم", 88, "midterm"),
        ("اللغة الإنجليزية", 85, "final"),
        ("اللغة العربية", 95, "quiz")
    ]
    
    for subject, score, grade_type in subjects:
        grade = Grade(
            student_id=student.id,
            subject=subject,
            score=score,
            max_score=100,
            weight=1.0,
            grade_type=grade_type,
            date=datetime.now()
        )
        db.session.add(grade)
    
    # إضافة سجلات حضور
    for i in range(20):
        attendance = Attendance(
            student_id=student.id,
            date=(datetime.now() - timedelta(days=i)).date(),
            status="present" if i % 3 != 0 else "late",
            notes="حاضر" if i % 3 != 0 else "متأخر"
        )
        db.session.add(attendance)
    
    # إضافة تقييم مهارات
    skills = SkillsAssessment(
        student_id=student.id,
        academic_skills=92,
        reading=90,
        writing=88,
        math=95,
        critical_thinking=85,
        life_skills=88,
        communication=90,
        leadership=85,
        time_management=80,
        social_skills=90,
        teamwork=92,
        empathy=88,
        cooperation=90,
        cognitive_skills=91,
        memory=90,
        problem_solving=92,
        attention=89,
        emotional_skills=87,
        self_awareness=85,
        self_regulation=88,
        motivation=90
    )
    db.session.add(skills)
    
    # حفظ البيانات
    db.session.commit()
    print("✅ تمت إضافة بيانات العينة بنجاح")
