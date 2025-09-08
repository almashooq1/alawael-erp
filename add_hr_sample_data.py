#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام الموارد البشرية
HR Sample Data Generator
"""

import sys
import os
from datetime import datetime, date, timedelta
import random

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from hr_models import (
    Department, Position, Employee, AttendanceRecord, LeaveType, 
    LeaveRequest, SalaryRecord, PerformanceReview, TrainingProgram,
    TrainingSession, TrainingEnrollment, JobApplication, Interview,
    AIAnalysis, AIPrediction, HRSettings, HRAuditLog
)

def create_sample_departments():
    """إنشاء أقسام تجريبية"""
    departments = [
        {
            'name': 'إدارة الموارد البشرية',
            'description': 'قسم إدارة شؤون الموظفين والتوظيف',
            'manager_name': 'أحمد محمد علي',
            'budget': 500000.0,
            'location': 'الطابق الثاني - مبنى الإدارة'
        },
        {
            'name': 'التعليم والتدريس',
            'description': 'قسم المعلمين والمشرفين التربويين',
            'manager_name': 'فاطمة أحمد السالم',
            'budget': 1200000.0,
            'location': 'مبنى التعليم الرئيسي'
        },
        {
            'name': 'الشؤون المالية',
            'description': 'قسم المحاسبة والشؤون المالية',
            'manager_name': 'محمد عبدالله الخالد',
            'budget': 300000.0,
            'location': 'الطابق الأول - مبنى الإدارة'
        },
        {
            'name': 'الخدمات العامة',
            'description': 'قسم النظافة والأمن والصيانة',
            'manager_name': 'عبدالرحمن سعد المطيري',
            'budget': 200000.0,
            'location': 'مبنى الخدمات'
        },
        {
            'name': 'تقنية المعلومات',
            'description': 'قسم الحاسوب والشبكات والأنظمة',
            'manager_name': 'سارة محمد الأحمد',
            'budget': 400000.0,
            'location': 'الطابق الثالث - مبنى الإدارة'
        }
    ]
    
    created_departments = []
    for dept_data in departments:
        dept = Department(**dept_data)
        db.session.add(dept)
        created_departments.append(dept)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(created_departments)} قسم")
    return created_departments

def create_sample_positions(departments):
    """إنشاء مناصب تجريبية"""
    positions_data = [
        # إدارة الموارد البشرية
        {'title': 'مدير الموارد البشرية', 'department': departments[0], 'level': 'manager', 'min_salary': 15000, 'max_salary': 20000},
        {'title': 'أخصائي موارد بشرية', 'department': departments[0], 'level': 'senior', 'min_salary': 8000, 'max_salary': 12000},
        {'title': 'منسق التوظيف', 'department': departments[0], 'level': 'mid', 'min_salary': 6000, 'max_salary': 9000},
        
        # التعليم والتدريس
        {'title': 'مشرف تربوي', 'department': departments[1], 'level': 'manager', 'min_salary': 12000, 'max_salary': 16000},
        {'title': 'معلم أول', 'department': departments[1], 'level': 'senior', 'min_salary': 8000, 'max_salary': 11000},
        {'title': 'معلم', 'department': departments[1], 'level': 'mid', 'min_salary': 6000, 'max_salary': 8500},
        {'title': 'مساعد معلم', 'department': departments[1], 'level': 'junior', 'min_salary': 4000, 'max_salary': 6000},
        
        # الشؤون المالية
        {'title': 'مدير مالي', 'department': departments[2], 'level': 'manager', 'min_salary': 14000, 'max_salary': 18000},
        {'title': 'محاسب أول', 'department': departments[2], 'level': 'senior', 'min_salary': 7000, 'max_salary': 10000},
        {'title': 'محاسب', 'department': departments[2], 'level': 'mid', 'min_salary': 5000, 'max_salary': 7500},
        
        # الخدمات العامة
        {'title': 'مشرف خدمات', 'department': departments[3], 'level': 'mid', 'min_salary': 5000, 'max_salary': 7000},
        {'title': 'عامل نظافة', 'department': departments[3], 'level': 'junior', 'min_salary': 3000, 'max_salary': 4500},
        {'title': 'حارس أمن', 'department': departments[3], 'level': 'junior', 'min_salary': 3500, 'max_salary': 5000},
        
        # تقنية المعلومات
        {'title': 'مدير تقنية المعلومات', 'department': departments[4], 'level': 'manager', 'min_salary': 16000, 'max_salary': 22000},
        {'title': 'مطور أنظمة', 'department': departments[4], 'level': 'senior', 'min_salary': 9000, 'max_salary': 13000},
        {'title': 'فني حاسوب', 'department': departments[4], 'level': 'mid', 'min_salary': 6000, 'max_salary': 8500}
    ]
    
    created_positions = []
    for pos_data in positions_data:
        position = Position(
            title=pos_data['title'],
            department_id=pos_data['department'].id,
            level=pos_data['level'],
            min_salary=pos_data['min_salary'],
            max_salary=pos_data['max_salary'],
            requirements=['خبرة في المجال', 'مهارات تواصل جيدة'],
            responsibilities=['تنفيذ المهام المطلوبة', 'التعاون مع الفريق']
        )
        db.session.add(position)
        created_positions.append(position)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(created_positions)} منصب")
    return created_positions

def create_sample_employees(positions):
    """إنشاء موظفين تجريبيين"""
    employees_data = [
        {
            'employee_id': 'EMP001',
            'first_name': 'أحمد',
            'last_name': 'محمد علي',
            'email': 'ahmed.ali@awail.com',
            'phone': '+966501234567',
            'position': positions[0],  # مدير الموارد البشرية
            'salary': 18000,
            'hire_date': date(2020, 1, 15),
            'skills': ['إدارة الموارد البشرية', 'القيادة', 'التخطيط الاستراتيجي']
        },
        {
            'employee_id': 'EMP002',
            'first_name': 'فاطمة',
            'last_name': 'أحمد السالم',
            'email': 'fatima.salem@awail.com',
            'phone': '+966502345678',
            'position': positions[3],  # مشرف تربوي
            'salary': 14000,
            'hire_date': date(2019, 9, 1),
            'skills': ['الإشراف التربوي', 'تطوير المناهج', 'التدريب']
        },
        {
            'employee_id': 'EMP003',
            'first_name': 'محمد',
            'last_name': 'عبدالله الخالد',
            'email': 'mohammed.khalid@awail.com',
            'phone': '+966503456789',
            'position': positions[7],  # مدير مالي
            'salary': 16000,
            'hire_date': date(2021, 3, 10),
            'skills': ['المحاسبة', 'التحليل المالي', 'إدارة الميزانيات']
        },
        {
            'employee_id': 'EMP004',
            'first_name': 'سارة',
            'last_name': 'محمد الأحمد',
            'email': 'sara.ahmed@awail.com',
            'phone': '+966504567890',
            'position': positions[13],  # مدير تقنية المعلومات
            'salary': 19000,
            'hire_date': date(2020, 6, 1),
            'skills': ['البرمجة', 'إدارة الشبكات', 'أمن المعلومات']
        },
        {
            'employee_id': 'EMP005',
            'first_name': 'خالد',
            'last_name': 'سعد المطيري',
            'email': 'khalid.mutairi@awail.com',
            'phone': '+966505678901',
            'position': positions[4],  # معلم أول
            'salary': 9500,
            'hire_date': date(2018, 8, 20),
            'skills': ['التدريس', 'إدارة الصف', 'التقييم التربوي']
        },
        {
            'employee_id': 'EMP006',
            'first_name': 'نورا',
            'last_name': 'عبدالرحمن القحطاني',
            'email': 'nora.qahtani@awail.com',
            'phone': '+966506789012',
            'position': positions[1],  # أخصائي موارد بشرية
            'salary': 10000,
            'hire_date': date(2021, 11, 5),
            'skills': ['التوظيف', 'تقييم الأداء', 'التدريب والتطوير']
        },
        {
            'employee_id': 'EMP007',
            'first_name': 'عبدالله',
            'last_name': 'محمد الشهري',
            'email': 'abdullah.shehri@awail.com',
            'phone': '+966507890123',
            'position': positions[14],  # مطور أنظمة
            'salary': 11000,
            'hire_date': date(2022, 2, 14),
            'skills': ['Python', 'JavaScript', 'قواعد البيانات']
        },
        {
            'employee_id': 'EMP008',
            'first_name': 'مريم',
            'last_name': 'علي الزهراني',
            'email': 'mariam.zahrani@awail.com',
            'phone': '+966508901234',
            'position': positions[5],  # معلم
            'salary': 7200,
            'hire_date': date(2022, 9, 1),
            'skills': ['التدريس', 'اللغة العربية', 'التكنولوجيا التعليمية']
        }
    ]
    
    created_employees = []
    for emp_data in employees_data:
        employee = Employee(
            employee_id=emp_data['employee_id'],
            first_name=emp_data['first_name'],
            last_name=emp_data['last_name'],
            email=emp_data['email'],
            phone=emp_data['phone'],
            position_id=emp_data['position'].id,
            department_id=emp_data['position'].department_id,
            salary=emp_data['salary'],
            hire_date=emp_data['hire_date'],
            skills=emp_data['skills'],
            status='active'
        )
        db.session.add(employee)
        created_employees.append(employee)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(created_employees)} موظف")
    return created_employees

def create_sample_attendance(employees):
    """إنشاء سجلات حضور تجريبية"""
    attendance_records = []
    
    # إنشاء سجلات للأسبوعين الماضيين
    start_date = date.today() - timedelta(days=14)
    
    for day_offset in range(14):
        current_date = start_date + timedelta(days=day_offset)
        
        # تخطي عطل نهاية الأسبوع
        if current_date.weekday() >= 5:
            continue
        
        for employee in employees:
            # 90% احتمال حضور الموظف
            if random.random() < 0.9:
                check_in_hour = random.randint(7, 9)
                check_in_minute = random.randint(0, 59)
                check_in_time = datetime.combine(current_date, datetime.min.time().replace(
                    hour=check_in_hour, minute=check_in_minute
                ))
                
                # وقت الانصراف (8 ساعات عمل + استراحة)
                check_out_time = check_in_time + timedelta(hours=8, minutes=30)
                
                # تحديد حالة الحضور
                if check_in_hour <= 8:
                    status = 'present'
                elif check_in_hour == 9 and check_in_minute <= 15:
                    status = 'late'
                else:
                    status = 'late'
                
                attendance = AttendanceRecord(
                    employee_id=employee.id,
                    date=current_date,
                    check_in_time=check_in_time,
                    check_out_time=check_out_time,
                    status=status,
                    notes='حضور عادي' if status == 'present' else 'تأخير'
                )
                db.session.add(attendance)
                attendance_records.append(attendance)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(attendance_records)} سجل حضور")
    return attendance_records

def create_sample_leave_types():
    """إنشاء أنواع الإجازات"""
    leave_types_data = [
        {
            'name': 'إجازة سنوية',
            'days_per_year': 30,
            'is_paid': True,
            'requires_approval': True,
            'description': 'الإجازة السنوية المدفوعة الأجر'
        },
        {
            'name': 'إجازة مرضية',
            'days_per_year': 15,
            'is_paid': True,
            'requires_approval': True,
            'description': 'إجازة مرضية بتقرير طبي'
        },
        {
            'name': 'إجازة طارئة',
            'days_per_year': 5,
            'is_paid': False,
            'requires_approval': True,
            'description': 'إجازة طارئة غير مدفوعة الأجر'
        },
        {
            'name': 'إجازة أمومة',
            'days_per_year': 70,
            'is_paid': True,
            'requires_approval': False,
            'description': 'إجازة الأمومة للموظفات'
        }
    ]
    
    created_types = []
    for type_data in leave_types_data:
        leave_type = LeaveType(**type_data)
        db.session.add(leave_type)
        created_types.append(leave_type)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(created_types)} نوع إجازة")
    return created_types

def create_sample_leave_requests(employees, leave_types):
    """إنشاء طلبات إجازة تجريبية"""
    leave_requests = []
    
    for i, employee in enumerate(employees[:5]):  # أول 5 موظفين
        # طلب إجازة سنوية
        start_date = date.today() + timedelta(days=random.randint(10, 30))
        end_date = start_date + timedelta(days=random.randint(3, 7))
        
        leave_request = LeaveRequest(
            employee_id=employee.id,
            leave_type_id=leave_types[0].id,  # إجازة سنوية
            start_date=start_date,
            end_date=end_date,
            reason='إجازة سنوية للراحة',
            status='pending' if i < 2 else 'approved',
            applied_date=date.today() - timedelta(days=random.randint(1, 5))
        )
        db.session.add(leave_request)
        leave_requests.append(leave_request)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(leave_requests)} طلب إجازة")
    return leave_requests

def create_sample_salary_records(employees):
    """إنشاء سجلات رواتب تجريبية"""
    salary_records = []
    
    # إنشاء سجلات للشهرين الماضيين
    current_date = date.today()
    
    for month_offset in range(2):
        target_month = current_date.month - month_offset
        target_year = current_date.year
        
        if target_month <= 0:
            target_month += 12
            target_year -= 1
        
        for employee in employees:
            # حساب مكونات الراتب
            basic_salary = employee.salary
            allowances = {
                'بدل نقل': 500,
                'بدل سكن': basic_salary * 0.1,
                'بدل طعام': 300
            }
            
            bonuses = {}
            if random.random() < 0.3:  # 30% احتمال مكافأة
                bonuses['مكافأة أداء'] = random.randint(500, 2000)
            
            deductions = {}
            if random.random() < 0.1:  # 10% احتمال خصم
                deductions['خصم تأخير'] = random.randint(100, 500)
            
            total_allowances = sum(allowances.values())
            total_bonuses = sum(bonuses.values())
            total_deductions = sum(deductions.values())
            
            gross_salary = basic_salary + total_allowances + total_bonuses
            tax_amount = gross_salary * 0.05  # 5% ضريبة
            insurance_amount = basic_salary * 0.02  # 2% تأمين
            net_salary = gross_salary - total_deductions - tax_amount - insurance_amount
            
            salary_record = SalaryRecord(
                employee_id=employee.id,
                month=target_month,
                year=target_year,
                basic_salary=basic_salary,
                allowances=allowances,
                bonuses=bonuses,
                deductions=deductions,
                gross_salary=gross_salary,
                tax_amount=tax_amount,
                insurance_amount=insurance_amount,
                net_salary=net_salary,
                status='paid',
                payment_date=date(target_year, target_month, 25),
                payment_method='bank_transfer'
            )
            db.session.add(salary_record)
            salary_records.append(salary_record)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(salary_records)} سجل راتب")
    return salary_records

def create_sample_training_programs():
    """إنشاء برامج تدريب تجريبية"""
    programs_data = [
        {
            'title': 'مهارات القيادة والإدارة',
            'description': 'برنامج تدريبي لتطوير مهارات القيادة والإدارة الفعالة',
            'category': 'leadership',
            'duration_hours': 40,
            'max_participants': 20,
            'instructor': 'د. محمد أحمد الخبير',
            'cost_per_participant': 2500.0,
            'location': 'قاعة التدريب الرئيسية',
            'is_online': False
        },
        {
            'title': 'تطوير مهارات التدريس الحديثة',
            'description': 'برنامج لتطوير أساليب التدريس باستخدام التكنولوجيا',
            'category': 'teaching',
            'duration_hours': 30,
            'max_participants': 25,
            'instructor': 'أ. فاطمة السالم',
            'cost_per_participant': 1800.0,
            'location': 'مختبر الحاسوب',
            'is_online': True
        },
        {
            'title': 'إدارة الوقت والإنتاجية',
            'description': 'تعلم تقنيات إدارة الوقت وزيادة الإنتاجية في العمل',
            'category': 'productivity',
            'duration_hours': 16,
            'max_participants': 30,
            'instructor': 'أ. خالد المطيري',
            'cost_per_participant': 1200.0,
            'location': 'قاعة المؤتمرات',
            'is_online': False
        }
    ]
    
    created_programs = []
    for program_data in programs_data:
        program = TrainingProgram(**program_data)
        db.session.add(program)
        created_programs.append(program)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(created_programs)} برنامج تدريب")
    return created_programs

def main():
    """الدالة الرئيسية لإنشاء البيانات التجريبية"""
    print("🚀 بدء إنشاء البيانات التجريبية لنظام الموارد البشرية...")
    
    with app.app_context():
        try:
            # إنشاء الجداول
            db.create_all()
            
            # إنشاء البيانات التجريبية
            departments = create_sample_departments()
            positions = create_sample_positions(departments)
            employees = create_sample_employees(positions)
            attendance_records = create_sample_attendance(employees)
            leave_types = create_sample_leave_types()
            leave_requests = create_sample_leave_requests(employees, leave_types)
            salary_records = create_sample_salary_records(employees)
            training_programs = create_sample_training_programs()
            
            print("\n🎉 تم إنشاء جميع البيانات التجريبية بنجاح!")
            print("\n📊 ملخص البيانات المُنشأة:")
            print(f"   • الأقسام: {len(departments)}")
            print(f"   • المناصب: {len(positions)}")
            print(f"   • الموظفين: {len(employees)}")
            print(f"   • سجلات الحضور: {len(attendance_records)}")
            print(f"   • أنواع الإجازات: {len(leave_types)}")
            print(f"   • طلبات الإجازة: {len(leave_requests)}")
            print(f"   • سجلات الرواتب: {len(salary_records)}")
            print(f"   • برامج التدريب: {len(training_programs)}")
            
            print("\n✅ يمكنك الآن الوصول لنظام الموارد البشرية عبر: /hr-management")
            
        except Exception as e:
            print(f"❌ حدث خطأ: {str(e)}")
            db.session.rollback()
            return False
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
