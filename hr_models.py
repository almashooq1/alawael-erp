#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات لنظام إدارة الموارد البشرية المتكامل بالذكاء الاصطناعي
"""

from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, Float, ForeignKey, JSON, Enum, Time
from sqlalchemy.orm import relationship
from app import db
import enum

# الأقسام والإدارات
class Department(db.Model):
    __tablename__ = 'hr_departments'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    name_en = Column(String(100))
    description = Column(Text)
    manager_id = Column(Integer, ForeignKey('hr_employees.id'))
    parent_department_id = Column(Integer, ForeignKey('hr_departments.id'))
    budget = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    manager = relationship("Employee", foreign_keys=[manager_id], back_populates="managed_departments")
    parent_department = relationship("Department", remote_side=[id])
    employees = relationship("Employee", foreign_keys="Employee.department_id", back_populates="department")
    positions = relationship("Position", back_populates="department")

# المناصب والوظائف
class Position(db.Model):
    __tablename__ = 'hr_positions'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    title_en = Column(String(100))
    department_id = Column(Integer, ForeignKey('hr_departments.id'), nullable=False)
    job_description = Column(Text)
    requirements = Column(Text)
    salary_range_min = Column(Float)
    salary_range_max = Column(Float)
    level = Column(String(50))  # junior, mid, senior, manager, director
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # العلاقات
    department = relationship("Department", back_populates="positions")
    employees = relationship("Employee", back_populates="position")

# الموظفين
class Employee(db.Model):
    __tablename__ = 'hr_employees'
    
    id = Column(Integer, primary_key=True)
    employee_id = Column(String(20), unique=True, nullable=False)  # رقم الموظف
    national_id = Column(String(20), unique=True, nullable=False)  # رقم الهوية
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    first_name_en = Column(String(50))
    last_name_en = Column(String(50))
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20))
    emergency_contact = Column(String(20))
    address = Column(Text)
    birth_date = Column(Date)
    gender = Column(String(10))  # male, female
    nationality = Column(String(50))
    marital_status = Column(String(20))  # single, married, divorced, widowed
    
    # معلومات العمل
    department_id = Column(Integer, ForeignKey('hr_departments.id'))
    position_id = Column(Integer, ForeignKey('hr_positions.id'))
    hire_date = Column(Date, nullable=False)
    contract_type = Column(String(20))  # permanent, temporary, contract, part_time
    employment_status = Column(String(20), default='active')  # active, inactive, terminated
    salary = Column(Float)
    manager_id = Column(Integer, ForeignKey('hr_employees.id'))
    
    # معلومات إضافية
    profile_picture = Column(String(255))
    skills = Column(JSON)  # قائمة المهارات
    certifications = Column(JSON)  # الشهادات
    languages = Column(JSON)  # اللغات
    notes = Column(Text)
    
    # تواريخ النظام
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # العلاقات
    department = relationship("Department", foreign_keys=[department_id], back_populates="employees")
    position = relationship("Position", back_populates="employees")
    manager = relationship("Employee", remote_side=[id], back_populates="subordinates")
    subordinates = relationship("Employee", back_populates="manager")
    managed_departments = relationship("Department", foreign_keys="Department.manager_id", back_populates="manager")
    
    # علاقات أخرى
    attendance_records = relationship("AttendanceRecord", back_populates="employee")
    leave_requests = relationship("LeaveRequest", back_populates="employee")
    performance_reviews = relationship("PerformanceReview", back_populates="employee")
    salary_records = relationship("SalaryRecord", back_populates="employee")
    training_enrollments = relationship("TrainingEnrollment", back_populates="employee")

# سجلات الحضور والانصراف
class AttendanceRecord(db.Model):
    __tablename__ = 'hr_attendance_records'
    
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('hr_employees.id'), nullable=False)
    date = Column(Date, nullable=False)
    check_in_time = Column(Time)
    check_out_time = Column(Time)
    break_start_time = Column(Time)
    break_end_time = Column(Time)
    total_hours = Column(Float)
    overtime_hours = Column(Float)
    status = Column(String(20))  # present, absent, late, early_leave, holiday
    location = Column(String(100))  # موقع الحضور
    ip_address = Column(String(45))
    device_info = Column(JSON)
    notes = Column(Text)
    approved_by = Column(Integer, ForeignKey('hr_employees.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # العلاقات
    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="attendance_records")
    approver = relationship("Employee", foreign_keys=[approved_by])

# أنواع الإجازات
class LeaveType(db.Model):
    __tablename__ = 'hr_leave_types'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    name_en = Column(String(50))
    description = Column(Text)
    max_days_per_year = Column(Integer)
    is_paid = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=True)
    advance_notice_days = Column(Integer, default=7)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # العلاقات
    leave_requests = relationship("LeaveRequest", back_populates="leave_type")

# طلبات الإجازات
class LeaveRequest(db.Model):
    __tablename__ = 'hr_leave_requests'
    
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('hr_employees.id'), nullable=False)
    leave_type_id = Column(Integer, ForeignKey('hr_leave_types.id'), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    days_requested = Column(Integer, nullable=False)
    reason = Column(Text)
    status = Column(String(20), default='pending')  # pending, approved, rejected, cancelled
    approved_by = Column(Integer, ForeignKey('hr_employees.id'))
    approval_date = Column(DateTime)
    approval_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    employee = relationship("Employee", back_populates="leave_requests")
    leave_type = relationship("LeaveType", back_populates="leave_requests")
    approver = relationship("Employee", foreign_keys=[approved_by])

# سجلات الرواتب
class SalaryRecord(db.Model):
    __tablename__ = 'hr_salary_records'
    
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('hr_employees.id'), nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)
    basic_salary = Column(Float, nullable=False)
    allowances = Column(JSON)  # البدلات
    bonuses = Column(JSON)  # المكافآت
    deductions = Column(JSON)  # الخصومات
    overtime_amount = Column(Float, default=0.0)
    gross_salary = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0.0)
    insurance_amount = Column(Float, default=0.0)
    net_salary = Column(Float, nullable=False)
    payment_date = Column(Date)
    payment_method = Column(String(20))  # bank_transfer, cash, check
    status = Column(String(20), default='pending')  # pending, paid, cancelled
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('hr_employees.id'))
    
    # العلاقات
    employee = relationship("Employee", back_populates="salary_records")
    creator = relationship("Employee", foreign_keys=[created_by])

# تقييمات الأداء
class PerformanceReview(db.Model):
    __tablename__ = 'hr_performance_reviews'
    
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('hr_employees.id'), nullable=False)
    reviewer_id = Column(Integer, ForeignKey('hr_employees.id'), nullable=False)
    review_period_start = Column(Date, nullable=False)
    review_period_end = Column(Date, nullable=False)
    overall_rating = Column(Float)  # 1-5
    goals_achievement = Column(Float)  # 1-5
    skills_rating = Column(JSON)  # تقييم المهارات
    strengths = Column(Text)
    areas_for_improvement = Column(Text)
    goals_next_period = Column(Text)
    employee_comments = Column(Text)
    reviewer_comments = Column(Text)
    status = Column(String(20), default='draft')  # draft, submitted, approved, finalized
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="performance_reviews")
    reviewer = relationship("Employee", foreign_keys=[reviewer_id])

# برامج التدريب
class TrainingProgram(db.Model):
    __tablename__ = 'hr_training_programs'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    description = Column(Text)
    category = Column(String(50))  # technical, soft_skills, leadership, compliance
    duration_hours = Column(Integer)
    max_participants = Column(Integer)
    instructor = Column(String(100))
    cost_per_participant = Column(Float)
    location = Column(String(100))
    is_online = Column(Boolean, default=False)
    prerequisites = Column(Text)
    learning_objectives = Column(Text)
    materials = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('hr_employees.id'))
    
    # العلاقات
    creator = relationship("Employee", foreign_keys=[created_by])
    sessions = relationship("TrainingSession", back_populates="program")
    enrollments = relationship("TrainingEnrollment", back_populates="program")

# جلسات التدريب
class TrainingSession(db.Model):
    __tablename__ = 'hr_training_sessions'
    
    id = Column(Integer, primary_key=True)
    program_id = Column(Integer, ForeignKey('hr_training_programs.id'), nullable=False)
    session_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    location = Column(String(100))
    instructor = Column(String(100))
    max_participants = Column(Integer)
    status = Column(String(20), default='scheduled')  # scheduled, ongoing, completed, cancelled
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # العلاقات
    program = relationship("TrainingProgram", back_populates="sessions")
    enrollments = relationship("TrainingEnrollment", back_populates="session")

# تسجيل الموظفين في التدريب
class TrainingEnrollment(db.Model):
    __tablename__ = 'hr_training_enrollments'
    
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('hr_employees.id'), nullable=False)
    program_id = Column(Integer, ForeignKey('hr_training_programs.id'), nullable=False)
    session_id = Column(Integer, ForeignKey('hr_training_sessions.id'))
    enrollment_date = Column(Date, default=date.today)
    status = Column(String(20), default='enrolled')  # enrolled, attended, completed, cancelled, no_show
    completion_date = Column(Date)
    score = Column(Float)  # نتيجة الاختبار أو التقييم
    feedback = Column(Text)
    certificate_issued = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # العلاقات
    employee = relationship("Employee", back_populates="training_enrollments")
    program = relationship("TrainingProgram", back_populates="enrollments")
    session = relationship("TrainingSession", back_populates="enrollments")

# طلبات التوظيف
class JobApplication(db.Model):
    __tablename__ = 'hr_job_applications'
    
    id = Column(Integer, primary_key=True)
    position_id = Column(Integer, ForeignKey('hr_positions.id'), nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(100), nullable=False)
    phone = Column(String(20))
    resume_file = Column(String(255))
    cover_letter = Column(Text)
    experience_years = Column(Integer)
    education_level = Column(String(50))
    skills = Column(JSON)
    expected_salary = Column(Float)
    available_start_date = Column(Date)
    status = Column(String(20), default='submitted')  # submitted, screening, interview, offer, hired, rejected
    ai_score = Column(Float)  # نقاط الذكاء الاصطناعي
    ai_analysis = Column(JSON)  # تحليل الذكاء الاصطناعي
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    position = relationship("Position")
    interviews = relationship("Interview", back_populates="application")

# المقابلات
class Interview(db.Model):
    __tablename__ = 'hr_interviews'
    
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey('hr_job_applications.id'), nullable=False)
    interviewer_id = Column(Integer, ForeignKey('hr_employees.id'), nullable=False)
    interview_date = Column(DateTime, nullable=False)
    interview_type = Column(String(20))  # phone, video, in_person
    duration_minutes = Column(Integer)
    location = Column(String(100))
    questions = Column(JSON)
    answers = Column(JSON)
    rating = Column(Float)  # 1-5
    feedback = Column(Text)
    recommendation = Column(String(20))  # hire, reject, second_interview
    status = Column(String(20), default='scheduled')  # scheduled, completed, cancelled, no_show
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # العلاقات
    application = relationship("JobApplication", back_populates="interviews")
    interviewer = relationship("Employee")

# تحليلات الذكاء الاصطناعي للموارد البشرية
class HRAIAnalysis(db.Model):
    __tablename__ = 'hr_ai_analysis'
    
    id = Column(Integer, primary_key=True)
    analysis_type = Column(String(50), nullable=False)  # performance, recruitment, retention, satisfaction
    employee_id = Column(Integer, ForeignKey('hr_employees.id'))
    department_id = Column(Integer, ForeignKey('hr_departments.id'))
    analysis_date = Column(Date, default=date.today)
    data_points = Column(JSON)  # البيانات المستخدمة في التحليل
    ai_insights = Column(JSON)  # النتائج والتوصيات
    confidence_score = Column(Float)  # مستوى الثقة في التحليل
    recommendations = Column(JSON)  # التوصيات
    action_items = Column(JSON)  # العناصر القابلة للتنفيذ
    status = Column(String(20), default='active')  # active, implemented, archived
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('hr_employees.id'))
    
    # العلاقات
    employee = relationship("Employee", foreign_keys=[employee_id])
    department = relationship("Department")
    creator = relationship("Employee", foreign_keys=[created_by])

# التنبؤات والتوصيات الذكية
class HRPrediction(db.Model):
    __tablename__ = 'hr_predictions'
    
    id = Column(Integer, primary_key=True)
    prediction_type = Column(String(50), nullable=False)  # turnover, performance, promotion, salary_adjustment
    employee_id = Column(Integer, ForeignKey('hr_employees.id'))
    prediction_date = Column(Date, default=date.today)
    prediction_period = Column(String(20))  # 1_month, 3_months, 6_months, 1_year
    predicted_value = Column(Float)
    probability = Column(Float)  # احتمالية حدوث التنبؤ
    factors = Column(JSON)  # العوامل المؤثرة
    risk_level = Column(String(20))  # low, medium, high, critical
    recommended_actions = Column(JSON)
    status = Column(String(20), default='active')  # active, monitored, resolved
    actual_outcome = Column(Float)  # النتيجة الفعلية
    accuracy_score = Column(Float)  # دقة التنبؤ
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # العلاقات
    employee = relationship("Employee")

# إعدادات الموارد البشرية
class HRSettings(db.Model):
    __tablename__ = 'hr_settings'
    
    id = Column(Integer, primary_key=True)
    setting_key = Column(String(100), unique=True, nullable=False)
    setting_value = Column(JSON)
    description = Column(Text)
    category = Column(String(50))  # attendance, payroll, performance, general
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey('hr_employees.id'))
    
    # العلاقات
    updater = relationship("Employee")

# سجل التغييرات في الموارد البشرية
class HRAuditLog(db.Model):
    __tablename__ = 'hr_audit_logs'
    
    id = Column(Integer, primary_key=True)
    table_name = Column(String(50), nullable=False)
    record_id = Column(Integer, nullable=False)
    action = Column(String(20), nullable=False)  # create, update, delete
    old_values = Column(JSON)
    new_values = Column(JSON)
    changed_fields = Column(JSON)
    user_id = Column(Integer, ForeignKey('hr_employees.id'), nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(String(255))
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # العلاقات
    user = relationship("Employee")
