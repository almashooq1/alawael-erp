"""
Routes للبرامج (Programs)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.program import Program, ProgramEnrollment
from datetime import datetime
from lib.auth_rbac_decorator import check_permission, require_role, log_audit, guard_payload_size, validate_json

bp = Blueprint('programs', __name__, url_prefix='/api/programs')

@bp.route('', methods=['GET'])
@jwt_required()
def list_programs():
    """قائمة البرامج"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        program_type = request.args.get('type')
        status = request.args.get('status')

        query = Program.query

        if program_type:
            query = query.filter_by(program_type=program_type)

        if status:
            query = query.filter_by(status=status)

        query = query.order_by(Program.name.asc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': [p.to_dict() for p in pagination.items],
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>', methods=['GET'])

@check_permission('view_program')
@log_audit('GET_GET_PROGRAM')
def get_program(id):
    """تفاصيل برنامج"""
    try:
        program = Program.query.get_or_404(id)
        return jsonify({
            'success': True,
            'data': program.to_dict(include_details=True)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('', methods=['POST'])
@jwt_required()
def create_program():
    """إنشاء برنامج جديد"""
    try:
        data = request.get_json()

        program = Program(
            name=data['name'],
            name_en=data.get('name_en'),
            description=data.get('description'),
            program_type=data['program_type'],
            category=data.get('category'),
            target_disability=data.get('target_disability'),
            objectives=data.get('objectives'),
            duration_weeks=data.get('duration_weeks'),
            sessions_per_week=data.get('sessions_per_week'),
            session_duration=data.get('session_duration'),
            min_age=data.get('min_age'),
            max_age=data.get('max_age'),
            max_beneficiaries=data.get('max_beneficiaries'),
            prerequisites=data.get('prerequisites'),
            required_assessments=data.get('required_assessments'),
            modules=data.get('modules'),
            activities=data.get('activities'),
            materials=data.get('materials'),
            required_staff=data.get('required_staff'),
            staff_ratio=data.get('staff_ratio'),
            cost_per_session=data.get('cost_per_session'),
            total_cost=data.get('total_cost'),
            status=data.get('status', 'active')
        )

        db.session.add(program)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم إنشاء البرنامج بنجاح',
            'data': program.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/enroll', methods=['POST'])

@check_permission('manage_enrollbeneficiary')
@guard_payload_size()
@validate_json()
@log_audit('POST_ENROLL_BENEFICIARY')
def enroll_beneficiary(id):
    """تسجيل مستفيد في برنامج"""
    try:
        program = Program.query.get_or_404(id)
        data = request.get_json()

        from models.beneficiary import Beneficiary
        beneficiary = Beneficiary.query.get_or_404(data['beneficiary_id'])

        # التحقق من إمكانية التسجيل
        can_enroll, message = program.can_enroll(beneficiary)
        if not can_enroll:
            return jsonify({
                'success': False,
                'message': message
            }), 400

        # التحقق من عدم التسجيل المسبق
        existing = ProgramEnrollment.query.filter_by(
            beneficiary_id=beneficiary.id,
            program_id=program.id,
            status='active'
        ).first()

        if existing:
            return jsonify({
                'success': False,
                'message': 'المستفيد مسجل في هذا البرنامج بالفعل'
            }), 400

        # إنشاء التسجيل
        enrollment = ProgramEnrollment(
            beneficiary_id=beneficiary.id,
            program_id=program.id,
            enrollment_date=datetime.utcnow().date(),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None
        )

        program.current_enrollments += 1

        db.session.add(enrollment)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم تسجيل المستفيد في البرنامج بنجاح',
            'data': enrollment.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
