#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API endpoints لنظام إدارة الموارد البشرية المتكامل بالذكاء الاصطناعي
"""

from flask import request, jsonify, render_template
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import joinedload
import json

from app import app, db
from hr_models import *
from hr_ai_services import HRAnalyticsAI, RecruitmentAI, TrainingRecommendationAI
from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit
)

# إنشاء خدمات الذكاء الاصطناعي
hr_analytics = HRAnalyticsAI()
recruitment_ai = RecruitmentAI()
training_ai = TrainingRecommendationAI()

# ===== إدارة الموظفين =====

@app.route('/api/hr/employees', methods=['GET'])
@jwt_required()
@check_permission('view_employees')
@log_audit('LIST_EMPLOYEES')
def get_employees():
    """عرض قائمة الموظفين مع الفلترة والبحث"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        department_id = request.args.get('department_id', type=int)
        status = request.args.get('status', 'active')
        
        query = Employee.query
        
        # الفلترة
        if search:
            query = query.filter(or_(
                Employee.first_name.contains(search),
                Employee.last_name.contains(search),
                Employee.email.contains(search),
                Employee.employee_id.contains(search)
            ))
        
        if department_id:
            query = query.filter(Employee.department_id == department_id)
        
        if status:
            query = query.filter(Employee.employment_status == status)
        
        # الترقيم
        employees = query.options(
            joinedload(Employee.department),
            joinedload(Employee.position)
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'employees': [{
                'id': emp.id,
                'employee_id': emp.employee_id,
                'name': f"{emp.first_name} {emp.last_name}",
                'email': emp.email,
                'phone': emp.phone,
                'department': emp.department.name if emp.department else None,
                'position': emp.position.title if emp.position else None,
                'hire_date': emp.hire_date.isoformat() if emp.hire_date else None,
                'status': emp.employment_status,
                'salary': emp.salary
            } for emp in employees.items],
            'pagination': {
                'page': employees.page,
                'pages': employees.pages,
                'per_page': employees.per_page,
                'total': employees.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/hr/employees', methods=['POST'])
@jwt_required()
@check_permission('manage_employees')
@guard_payload_size()
@validate_json('employee_id', 'national_id', 'first_name', 'last_name', 'email', 'hire_date')
@log_audit('CREATE_EMPLOYEE')
def create_employee():
    """إضافة موظف جديد"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['employee_id', 'national_id', 'first_name', 'last_name', 'email', 'hire_date']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'الحقل {field} مطلوب'}), 400
        
        # التحقق من عدم تكرار رقم الموظف والهوية
        if Employee.query.filter_by(employee_id=data['employee_id']).first():
            return jsonify({'success': False, 'error': 'رقم الموظف موجود مسبقاً'}), 400
        
        if Employee.query.filter_by(national_id=data['national_id']).first():
            return jsonify({'success': False, 'error': 'رقم الهوية موجود مسبقاً'}), 400
        
        # إنشاء الموظف
        employee = Employee(
            employee_id=data['employee_id'],
            national_id=data['national_id'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            first_name_en=data.get('first_name_en'),
            last_name_en=data.get('last_name_en'),
            email=data['email'],
            phone=data.get('phone'),
            emergency_contact=data.get('emergency_contact'),
            address=data.get('address'),
            birth_date=datetime.strptime(data['birth_date'], '%Y-%m-%d').date() if data.get('birth_date') else None,
            gender=data.get('gender'),
            nationality=data.get('nationality'),
            marital_status=data.get('marital_status'),
            department_id=data.get('department_id'),
            position_id=data.get('position_id'),
            hire_date=datetime.strptime(data['hire_date'], '%Y-%m-%d').date(),
            contract_type=data.get('contract_type', 'permanent'),
            salary=data.get('salary'),
            manager_id=data.get('manager_id'),
            skills=data.get('skills', []),
            certifications=data.get('certifications', []),
            languages=data.get('languages', []),
            notes=data.get('notes'),
            created_by=get_jwt_identity()
        )
        
        db.session.add(employee)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة الموظف بنجاح',
            'employee_id': employee.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/hr/employees/<int:employee_id>', methods=['GET'])
@jwt_required()
@check_permission('view_employees')
@log_audit('VIEW_EMPLOYEE')
def get_employee(employee_id):
    """عرض تفاصيل موظف محدد"""
    try:
        employee = Employee.query.options(
            joinedload(Employee.department),
            joinedload(Employee.position),
            joinedload(Employee.manager)
        ).get_or_404(employee_id)
        
        return jsonify({
            'success': True,
            'employee': {
                'id': employee.id,
                'employee_id': employee.employee_id,
                'national_id': employee.national_id,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'first_name_en': employee.first_name_en,
                'last_name_en': employee.last_name_en,
                'email': employee.email,
                'phone': employee.phone,
                'emergency_contact': employee.emergency_contact,
                'address': employee.address,
                'birth_date': employee.birth_date.isoformat() if employee.birth_date else None,
                'gender': employee.gender,
                'nationality': employee.nationality,
                'marital_status': employee.marital_status,
                'department': {
                    'id': employee.department.id,
                    'name': employee.department.name
                } if employee.department else None,
                'position': {
                    'id': employee.position.id,
                    'title': employee.position.title
                } if employee.position else None,
                'hire_date': employee.hire_date.isoformat(),
                'contract_type': employee.contract_type,
                'employment_status': employee.employment_status,
                'salary': employee.salary,
                'manager': {
                    'id': employee.manager.id,
                    'name': f"{employee.manager.first_name} {employee.manager.last_name}"
                } if employee.manager else None,
                'skills': employee.skills,
                'certifications': employee.certifications,
                'languages': employee.languages,
                'notes': employee.notes,
                'profile_picture': employee.profile_picture
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== الحضور والانصراف =====

@app.route('/api/hr/attendance', methods=['GET'])
@jwt_required()
@check_permission('view_attendance')
@log_audit('LIST_ATTENDANCE')
def get_attendance():
    """عرض سجلات الحضور والانصراف"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        employee_id = request.args.get('employee_id', type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        query = AttendanceRecord.query
        
        if employee_id:
            query = query.filter(AttendanceRecord.employee_id == employee_id)
        
        if date_from:
            query = query.filter(AttendanceRecord.date >= datetime.strptime(date_from, '%Y-%m-%d').date())
        
        if date_to:
            query = query.filter(AttendanceRecord.date <= datetime.strptime(date_to, '%Y-%m-%d').date())
        
        records = query.options(joinedload(AttendanceRecord.employee)).order_by(
            desc(AttendanceRecord.date)
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'records': [{
                'id': record.id,
                'employee': {
                    'id': record.employee.id,
                    'name': f"{record.employee.first_name} {record.employee.last_name}",
                    'employee_id': record.employee.employee_id
                },
                'date': record.date.isoformat(),
                'check_in_time': record.check_in_time.strftime('%H:%M') if record.check_in_time else None,
                'check_out_time': record.check_out_time.strftime('%H:%M') if record.check_out_time else None,
                'total_hours': record.total_hours,
                'overtime_hours': record.overtime_hours,
                'status': record.status,
                'location': record.location,
                'notes': record.notes
            } for record in records.items],
            'pagination': {
                'page': records.page,
                'pages': records.pages,
                'per_page': records.per_page,
                'total': records.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/hr/attendance/check-in', methods=['POST'])
@jwt_required()
@check_permission('manage_attendance')
@guard_payload_size()
@log_audit('CHECK_IN')
def check_in():
    """تسجيل الحضور"""
    try:
        data = request.get_json()
        employee_id = data.get('employee_id')
        location = data.get('location', 'مكتب')
        
        if not employee_id:
            return jsonify({'success': False, 'error': 'رقم الموظف مطلوب'}), 400
        
        today = date.today()
        
        # التحقق من عدم وجود تسجيل حضور لنفس اليوم
        existing_record = AttendanceRecord.query.filter_by(
            employee_id=employee_id,
            date=today
        ).first()
        
        if existing_record and existing_record.check_in_time:
            return jsonify({'success': False, 'error': 'تم تسجيل الحضور مسبقاً لهذا اليوم'}), 400
        
        if existing_record:
            # تحديث السجل الموجود
            existing_record.check_in_time = datetime.now().time()
            existing_record.status = 'present'
            existing_record.location = location
        else:
            # إنشاء سجل جديد
            record = AttendanceRecord(
                employee_id=employee_id,
                date=today,
                check_in_time=datetime.now().time(),
                status='present',
                location=location,
                ip_address=request.remote_addr
            )
            db.session.add(record)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تسجيل الحضور بنجاح',
            'check_in_time': datetime.now().strftime('%H:%M')
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== الإجازات =====

@app.route('/api/hr/leave-requests', methods=['GET'])
@jwt_required()
@check_permission('view_leave_requests')
@log_audit('LIST_LEAVE_REQUESTS')
def get_leave_requests():
    """عرض طلبات الإجازات"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        employee_id = request.args.get('employee_id', type=int)
        
        query = LeaveRequest.query
        
        if status:
            query = query.filter(LeaveRequest.status == status)
        
        if employee_id:
            query = query.filter(LeaveRequest.employee_id == employee_id)
        
        requests = query.options(
            joinedload(LeaveRequest.employee),
            joinedload(LeaveRequest.leave_type)
        ).order_by(desc(LeaveRequest.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'requests': [{
                'id': req.id,
                'employee': {
                    'id': req.employee.id,
                    'name': f"{req.employee.first_name} {req.employee.last_name}",
                    'employee_id': req.employee.employee_id
                },
                'leave_type': {
                    'id': req.leave_type.id,
                    'name': req.leave_type.name
                },
                'start_date': req.start_date.isoformat(),
                'end_date': req.end_date.isoformat(),
                'days_requested': req.days_requested,
                'reason': req.reason,
                'status': req.status,
                'created_at': req.created_at.isoformat()
            } for req in requests.items],
            'pagination': {
                'page': requests.page,
                'pages': requests.pages,
                'per_page': requests.per_page,
                'total': requests.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/hr/leave-requests', methods=['POST'])
@jwt_required()
@check_permission('manage_leave_requests')
@guard_payload_size()
@validate_json('employee_id', 'leave_type_id', 'start_date', 'end_date', 'reason')
@log_audit('CREATE_LEAVE_REQUEST')
def create_leave_request():
    """إنشاء طلب إجازة جديد"""
    try:
        data = request.get_json()
        
        required_fields = ['employee_id', 'leave_type_id', 'start_date', 'end_date', 'reason']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'الحقل {field} مطلوب'}), 400
        
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        
        if start_date > end_date:
            return jsonify({'success': False, 'error': 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية'}), 400
        
        days_requested = (end_date - start_date).days + 1
        
        leave_request = LeaveRequest(
            employee_id=data['employee_id'],
            leave_type_id=data['leave_type_id'],
            start_date=start_date,
            end_date=end_date,
            days_requested=days_requested,
            reason=data['reason']
        )
        
        db.session.add(leave_request)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء طلب الإجازة بنجاح',
            'request_id': leave_request.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== الذكاء الاصطناعي =====

@app.route('/api/hr/ai/analyze-performance/<int:employee_id>', methods=['POST'])
@jwt_required()
@check_permission('ai_analysis')
@log_audit('AI_ANALYZE_PERFORMANCE')
def analyze_employee_performance(employee_id):
    """تحليل أداء الموظف بالذكاء الاصطناعي"""
    try:
        employee = Employee.query.get_or_404(employee_id)
        
        # جمع بيانات الموظف للتحليل
        employee_data = {
            'attendance': [],  # سيتم جلبها من قاعدة البيانات
            'tasks': [],       # سيتم جلبها من نظام المهام
            'goals_achievement': 3.5,  # من آخر تقييم
            'teamwork_rating': 4.0     # من تقييمات الزملاء
        }
        
        # تحليل الأداء
        analysis = hr_analytics.analyze_employee_performance(employee_data)
        
        # حفظ التحليل في قاعدة البيانات
        ai_analysis = HRAIAnalysis(
            analysis_type='performance',
            employee_id=employee_id,
            data_points=employee_data,
            ai_insights=analysis.data,
            confidence_score=analysis.confidence,
            recommendations=analysis.recommendations,
            created_by=get_jwt_identity()
        )
        
        db.session.add(ai_analysis)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'analysis': {
                'type': analysis.type,
                'message': analysis.message,
                'confidence': analysis.confidence,
                'recommendations': analysis.recommendations,
                'data': analysis.data
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/hr/ai/predict-turnover/<int:employee_id>', methods=['POST'])
@jwt_required()
@check_permission('ai_analysis')
@log_audit('AI_PREDICT_TURNOVER')
def predict_turnover_risk(employee_id):
    """التنبؤ بمخاطر ترك الموظف للعمل"""
    try:
        employee = Employee.query.get_or_404(employee_id)
        
        # جمع بيانات الموظف للتنبؤ
        employee_data = {
            'performance_rating': 3.5,
            'absence_rate': 0.05,
            'years_without_promotion': 2,
            'satisfaction_score': 3.0,
            'salary_percentile': 40
        }
        
        # التنبؤ بالمخاطر
        prediction = hr_analytics.predict_turnover_risk(employee_data)
        
        # حفظ التنبؤ
        hr_prediction = HRPrediction(
            prediction_type='turnover',
            employee_id=employee_id,
            predicted_value=prediction.data.get('risk_score', 0),
            probability=prediction.data.get('probability', 0),
            factors=prediction.data.get('risk_factors', []),
            risk_level=prediction.data.get('risk_level', 'منخفض'),
            recommended_actions=prediction.recommendations
        )
        
        db.session.add(hr_prediction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'prediction': {
                'type': prediction.type,
                'message': prediction.message,
                'confidence': prediction.confidence,
                'recommendations': prediction.recommendations,
                'data': prediction.data
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== لوحة التحكم =====

@app.route('/api/hr/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_hr_dashboard')
@log_audit('VIEW_HR_DASHBOARD')
def hr_dashboard():
    """لوحة تحكم الموارد البشرية"""
    try:
        # إحصائيات عامة
        total_employees = Employee.query.filter_by(employment_status='active').count()
        total_departments = Department.query.filter_by(is_active=True).count()
        pending_leave_requests = LeaveRequest.query.filter_by(status='pending').count()
        
        # إحصائيات الحضور لهذا الشهر
        current_month = date.today().replace(day=1)
        attendance_stats = db.session.query(
            func.count(AttendanceRecord.id).label('total_records'),
            func.sum(func.case([(AttendanceRecord.status == 'present', 1)], else_=0)).label('present_days'),
            func.sum(func.case([(AttendanceRecord.status == 'absent', 1)], else_=0)).label('absent_days'),
            func.sum(func.case([(AttendanceRecord.status == 'late', 1)], else_=0)).label('late_days')
        ).filter(AttendanceRecord.date >= current_month).first()
        
        # أحدث التحليلات
        recent_analyses = HRAIAnalysis.query.order_by(
            desc(HRAIAnalysis.created_at)
        ).limit(5).all()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_employees': total_employees,
                'total_departments': total_departments,
                'pending_leave_requests': pending_leave_requests,
                'attendance': {
                    'total_records': attendance_stats.total_records or 0,
                    'present_days': attendance_stats.present_days or 0,
                    'absent_days': attendance_stats.absent_days or 0,
                    'late_days': attendance_stats.late_days or 0
                }
            },
            'recent_analyses': [{
                'id': analysis.id,
                'type': analysis.analysis_type,
                'employee_name': f"{analysis.employee.first_name} {analysis.employee.last_name}" if analysis.employee else 'عام',
                'confidence': analysis.confidence_score,
                'created_at': analysis.created_at.isoformat()
            } for analysis in recent_analyses]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== الرواتب والمكافآت =====

@app.route('/api/hr/salary-records', methods=['GET'])
@jwt_required()
@check_permission('view_salaries')
@log_audit('LIST_SALARY_RECORDS')
def get_salary_records():
    """عرض سجلات الرواتب"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        employee_id = request.args.get('employee_id', type=int)
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        
        query = SalaryRecord.query
        
        if employee_id:
            query = query.filter(SalaryRecord.employee_id == employee_id)
        
        if month:
            query = query.filter(SalaryRecord.month == month)
        
        if year:
            query = query.filter(SalaryRecord.year == year)
        
        records = query.options(joinedload(SalaryRecord.employee)).order_by(
            desc(SalaryRecord.year), desc(SalaryRecord.month)
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'records': [{
                'id': record.id,
                'employee': {
                    'id': record.employee.id,
                    'name': f"{record.employee.first_name} {record.employee.last_name}",
                    'employee_id': record.employee.employee_id
                },
                'month': record.month,
                'year': record.year,
                'basic_salary': record.basic_salary,
                'allowances': record.allowances,
                'bonuses': record.bonuses,
                'deductions': record.deductions,
                'gross_salary': record.gross_salary,
                'net_salary': record.net_salary,
                'status': record.status,
                'payment_date': record.payment_date.isoformat() if record.payment_date else None
            } for record in records.items],
            'pagination': {
                'page': records.page,
                'pages': records.pages,
                'per_page': records.per_page,
                'total': records.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/hr/salary-records', methods=['POST'])
@jwt_required()
@check_permission('manage_salaries')
@guard_payload_size()
@validate_json('employee_id', 'month', 'year', 'basic_salary')
@log_audit('CREATE_SALARY_RECORD')
def create_salary_record():
    """إنشاء سجل راتب جديد"""
    try:
        data = request.get_json()
        
        required_fields = ['employee_id', 'month', 'year', 'basic_salary']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'الحقل {field} مطلوب'}), 400
        
        # التحقق من عدم وجود سجل راتب لنفس الشهر والسنة
        existing_record = SalaryRecord.query.filter_by(
            employee_id=data['employee_id'],
            month=data['month'],
            year=data['year']
        ).first()
        
        if existing_record:
            return jsonify({'success': False, 'error': 'يوجد سجل راتب لهذا الشهر مسبقاً'}), 400
        
        # حساب الراتب الإجمالي والصافي
        basic_salary = float(data['basic_salary'])
        allowances = data.get('allowances', {})
        bonuses = data.get('bonuses', {})
        deductions = data.get('deductions', {})
        
        total_allowances = sum(allowances.values()) if allowances else 0
        total_bonuses = sum(bonuses.values()) if bonuses else 0
        total_deductions = sum(deductions.values()) if deductions else 0
        
        gross_salary = basic_salary + total_allowances + total_bonuses
        tax_amount = data.get('tax_amount', 0)
        insurance_amount = data.get('insurance_amount', 0)
        net_salary = gross_salary - total_deductions - tax_amount - insurance_amount
        
        salary_record = SalaryRecord(
            employee_id=data['employee_id'],
            month=data['month'],
            year=data['year'],
            basic_salary=basic_salary,
            allowances=allowances,
            bonuses=bonuses,
            deductions=deductions,
            overtime_amount=data.get('overtime_amount', 0),
            gross_salary=gross_salary,
            tax_amount=tax_amount,
            insurance_amount=insurance_amount,
            net_salary=net_salary,
            payment_method=data.get('payment_method', 'bank_transfer'),
            notes=data.get('notes'),
            created_by=get_jwt_identity()
        )
        
        db.session.add(salary_record)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء سجل الراتب بنجاح',
            'record_id': salary_record.id,
            'net_salary': net_salary
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/hr/ai/recommend-salary/<int:employee_id>', methods=['POST'])
@jwt_required()
@check_permission('access_hr')
@log_audit('RECOMMEND_SALARY_ADJUSTMENT')
def recommend_salary_adjustment(employee_id):
    """توصية تعديل الراتب بالذكاء الاصطناعي"""
    try:
        employee = Employee.query.get_or_404(employee_id)
        
        # بيانات الموظف
        employee_data = {
            'salary': employee.salary or 0,
            'performance_rating': 4.0,  # من آخر تقييم
            'years_experience': 3,
            'position_level': employee.position.level if employee.position else 'junior'
        }
        
        # بيانات السوق (يمكن جلبها من مصادر خارجية)
        market_data = {
            'junior': {'median': 8000},
            'mid': {'median': 12000},
            'senior': {'median': 18000},
            'manager': {'median': 25000}
        }
        
        # توصية الراتب
        recommendation = hr_analytics.recommend_salary_adjustment(employee_data, market_data)
        
        return jsonify({
            'success': True,
            'recommendation': {
                'type': recommendation.type,
                'message': recommendation.message,
                'confidence': recommendation.confidence,
                'recommendations': recommendation.recommendations,
                'data': recommendation.data
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== تقييم الأداء =====

@app.route('/api/hr/performance-reviews', methods=['GET'])
@jwt_required()
@check_permission('view_hr')
@log_audit('GET_PERFORMANCE_REVIEWS')
def get_performance_reviews():
    """عرض تقييمات الأداء"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        employee_id = request.args.get('employee_id', type=int)
        status = request.args.get('status')
        
        query = PerformanceReview.query
        
        if employee_id:
            query = query.filter(PerformanceReview.employee_id == employee_id)
        
        if status:
            query = query.filter(PerformanceReview.status == status)
        
        reviews = query.options(
            joinedload(PerformanceReview.employee),
            joinedload(PerformanceReview.reviewer)
        ).order_by(desc(PerformanceReview.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'reviews': [{
                'id': review.id,
                'employee': {
                    'id': review.employee.id,
                    'name': f"{review.employee.first_name} {review.employee.last_name}",
                    'employee_id': review.employee.employee_id
                },
                'reviewer': {
                    'id': review.reviewer.id,
                    'name': f"{review.reviewer.first_name} {review.reviewer.last_name}"
                },
                'review_period_start': review.review_period_start.isoformat(),
                'review_period_end': review.review_period_end.isoformat(),
                'overall_rating': review.overall_rating,
                'goals_achievement': review.goals_achievement,
                'status': review.status,
                'created_at': review.created_at.isoformat()
            } for review in reviews.items],
            'pagination': {
                'page': reviews.page,
                'pages': reviews.pages,
                'per_page': reviews.per_page,
                'total': reviews.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/hr/performance-reviews', methods=['POST'])
@jwt_required()
@check_permission('manage_hr')
@guard_payload_size()
@log_audit('CREATE_PERFORMANCE_REVIEW')
def create_performance_review():
    """إنشاء تقييم أداء جديد"""
    try:
        data = request.get_json()
        
        required_fields = ['employee_id', 'reviewer_id', 'review_period_start', 'review_period_end']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'الحقل {field} مطلوب'}), 400
        
        review = PerformanceReview(
            employee_id=data['employee_id'],
            reviewer_id=data['reviewer_id'],
            review_period_start=datetime.strptime(data['review_period_start'], '%Y-%m-%d').date(),
            review_period_end=datetime.strptime(data['review_period_end'], '%Y-%m-%d').date(),
            overall_rating=data.get('overall_rating'),
            goals_achievement=data.get('goals_achievement'),
            skills_rating=data.get('skills_rating', {}),
            strengths=data.get('strengths'),
            areas_for_improvement=data.get('areas_for_improvement'),
            goals_next_period=data.get('goals_next_period'),
            employee_comments=data.get('employee_comments'),
            reviewer_comments=data.get('reviewer_comments')
        )
        
        db.session.add(review)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء تقييم الأداء بنجاح',
            'review_id': review.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== التدريب =====

@app.route('/api/hr/training-programs', methods=['GET'])
@jwt_required()
@check_permission('view_hr')
@log_audit('GET_TRAINING_PROGRAMS')
def get_training_programs():
    """عرض برامج التدريب"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        category = request.args.get('category')
        is_active = request.args.get('is_active', type=bool)
        
        query = TrainingProgram.query
        
        if category:
            query = query.filter(TrainingProgram.category == category)
        
        if is_active is not None:
            query = query.filter(TrainingProgram.is_active == is_active)
        
        programs = query.order_by(desc(TrainingProgram.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'programs': [{
                'id': program.id,
                'title': program.title,
                'description': program.description,
                'category': program.category,
                'duration_hours': program.duration_hours,
                'max_participants': program.max_participants,
                'instructor': program.instructor,
                'cost_per_participant': program.cost_per_participant,
                'location': program.location,
                'is_online': program.is_online,
                'is_active': program.is_active,
                'created_at': program.created_at.isoformat()
            } for program in programs.items],
            'pagination': {
                'page': programs.page,
                'pages': programs.pages,
                'per_page': programs.per_page,
                'total': programs.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/hr/ai/recommend-training/<int:employee_id>', methods=['POST'])
@jwt_required()
@check_permission('manage_hr')
@guard_payload_size()
@log_audit('RECOMMEND_TRAINING')
def recommend_training(employee_id):
    """توصية برامج التدريب بالذكاء الاصطناعي"""
    try:
        employee = Employee.query.get_or_404(employee_id)
        
        # بيانات الموظف للتدريب
        employee_data = {
            'skills': employee.skills or [],
            'position_requirements': ['communication', 'leadership', 'technical'],
            'career_goals': ['management', 'technical_lead']
        }
        
        performance_gaps = ['communication', 'time_management']
        
        # توصيات التدريب
        recommendations = training_ai.recommend_training(employee_data, performance_gaps)
        
        return jsonify({
            'success': True,
            'recommendations': {
                'type': recommendations.type,
                'message': recommendations.message,
                'confidence': recommendations.confidence,
                'recommendations': recommendations.recommendations,
                'data': recommendations.data
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== التوظيف =====

@app.route('/api/hr/job-applications', methods=['GET'])
@jwt_required()
@check_permission('view_hr')
@log_audit('GET_JOB_APPLICATIONS')
def get_job_applications():
    """عرض طلبات التوظيف"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        position_id = request.args.get('position_id', type=int)
        status = request.args.get('status')
        
        query = JobApplication.query
        
        if position_id:
            query = query.filter(JobApplication.position_id == position_id)
        
        if status:
            query = query.filter(JobApplication.status == status)
        
        applications = query.options(joinedload(JobApplication.position)).order_by(
            desc(JobApplication.created_at)
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'applications': [{
                'id': app.id,
                'position': {
                    'id': app.position.id,
                    'title': app.position.title
                },
                'name': f"{app.first_name} {app.last_name}",
                'email': app.email,
                'phone': app.phone,
                'experience_years': app.experience_years,
                'expected_salary': app.expected_salary,
                'status': app.status,
                'ai_score': app.ai_score,
                'created_at': app.created_at.isoformat()
            } for app in applications.items],
            'pagination': {
                'page': applications.page,
                'pages': applications.pages,
                'per_page': applications.per_page,
                'total': applications.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/hr/ai/analyze-resume/<int:application_id>', methods=['POST'])
@jwt_required()
@check_permission('manage_hr')
@guard_payload_size()
@log_audit('ANALYZE_RESUME')
def analyze_resume(application_id):
    """تحليل السيرة الذاتية بالذكاء الاصطناعي"""
    try:
        application = JobApplication.query.get_or_404(application_id)
        
        # محاكاة نص السيرة الذاتية
        resume_text = f"""
        {application.first_name} {application.last_name}
        Email: {application.email}
        Phone: {application.phone}
        Experience: {application.experience_years} years
        Skills: {', '.join(application.skills or [])}
        Education: {application.education_level}
        """
        
        # متطلبات الوظيفة
        job_requirements = {
            'required_skills': ['communication', 'teamwork', 'problem solving'],
            'preferred_skills': ['leadership', 'technical'],
            'min_experience': 2
        }
        
        # تحليل السيرة الذاتية
        analysis = recruitment_ai.analyze_resume(resume_text, job_requirements)
        
        # تحديث نقاط الذكاء الاصطناعي في الطلب
        application.ai_score = analysis.data.get('total_score', 0)
        application.ai_analysis = analysis.data
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'analysis': {
                'type': analysis.type,
                'message': analysis.message,
                'confidence': analysis.confidence,
                'recommendations': analysis.recommendations,
                'data': analysis.data
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Route لصفحة إدارة الموارد البشرية
@app.route('/hr-management')
@jwt_required()
def hr_management():
    return render_template('hr_management.html')
