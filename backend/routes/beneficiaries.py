"""
Routes للمستفيدين (Beneficiaries)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.beneficiary import Beneficiary
from models.user import User
from datetime import datetime
from sqlalchemy import or_

bp = Blueprint('beneficiaries', __name__, url_prefix='/api/beneficiaries')

@bp.route('', methods=['GET'])
@jwt_required()
def list_beneficiaries():
    """قائمة المستفيدين مع البحث والتصفية"""
    try:
        # المعاملات
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        disability_type = request.args.get('disability_type', '')
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # البناء الاستعلام
        query = Beneficiary.query

        # البحث
        if search:
            search_filter = or_(
                Beneficiary.first_name.ilike(f'%{search}%'),
                Beneficiary.last_name.ilike(f'%{search}%'),
                Beneficiary.national_id.ilike(f'%{search}%'),
                Beneficiary.guardian_name.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)

        # التصفية حسب الحالة
        if status:
            query = query.filter_by(status=status)

        # التصفية حسب نوع الإعاقة
        if disability_type:
            query = query.filter_by(disability_type=disability_type)

        # الترتيب
        if sort_order == 'desc':
            query = query.order_by(getattr(Beneficiary, sort_by).desc())
        else:
            query = query.order_by(getattr(Beneficiary, sort_by).asc())

        # Pagination
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': [b.to_dict(include_relations=True) for b in pagination.items],
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
@jwt_required()
def get_beneficiary(id):
    """تفاصيل مستفيد"""
    try:
        beneficiary = Beneficiary.query.get(id)
        if not beneficiary:
            return jsonify({
                'success': False,
                'message': 'المستفيد غير موجود'
            }), 404

        return jsonify({
            'success': True,
            'data': beneficiary.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('', methods=['POST'])
@jwt_required()
def create_beneficiary():
    """إضافة مستفيد جديد"""
    try:
        data = request.get_json()

        # التحقق من البيانات المطلوبة
        required_fields = ['national_id', 'first_name', 'last_name', 'date_of_birth',
                          'gender', 'guardian_name', 'guardian_phone']

        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'الحقل {field} مطلوب'
                }), 400

        # التحقق من عدم تكرار الرقم الوطني
        existing = Beneficiary.query.filter_by(national_id=data['national_id']).first()
        if existing:
            return jsonify({
                'success': False,
                'message': 'الرقم الوطني مسجل مسبقاً'
            }), 400

        # إنشاء المستفيد
        beneficiary = Beneficiary(
            national_id=data['national_id'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            date_of_birth=datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date(),
            gender=data['gender'],
            disability_type=data.get('disability_type'),
            disability_category=data.get('disability_category'),
            severity_level=data.get('severity_level'),
            diagnosis=data.get('diagnosis'),
            phone=data.get('phone'),
            email=data.get('email'),
            address=data.get('address'),
            city=data.get('city'),
            region=data.get('region'),
            guardian_name=data['guardian_name'],
            guardian_relationship=data.get('guardian_relationship'),
            guardian_phone=data['guardian_phone'],
            guardian_email=data.get('guardian_email'),
            guardian_national_id=data.get('guardian_national_id'),
            medical_history=data.get('medical_history'),
            allergies=data.get('allergies'),
            medications=data.get('medications'),
            notes=data.get('notes')
        )

        db.session.add(beneficiary)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم إضافة المستفيد بنجاح',
            'data': beneficiary.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_beneficiary(id):
    """تحديث بيانات مستفيد"""
    try:
        beneficiary = Beneficiary.query.get_or_404(id)
        data = request.get_json()

        # تحديث البيانات
        updateable_fields = [
            'first_name', 'last_name', 'phone', 'email', 'address', 'city',
            'region', 'disability_type', 'disability_category', 'severity_level',
            'diagnosis', 'guardian_name', 'guardian_relationship', 'guardian_phone',
            'guardian_email', 'medical_history', 'allergies', 'medications',
            'status', 'notes'
        ]

        for field in updateable_fields:
            if field in data:
                setattr(beneficiary, field, data[field])

        if 'date_of_birth' in data:
            beneficiary.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم تحديث البيانات بنجاح',
            'data': beneficiary.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_beneficiary(id):
    """حذف مستفيد"""
    try:
        beneficiary = Beneficiary.query.get_or_404(id)

        # حذف المستفيد (سيتم حذف جميع السجلات المرتبطة تلقائياً بسبب cascade)
        db.session.delete(beneficiary)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم حذف المستفيد بنجاح'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/stats', methods=['GET'])
@jwt_required()
def get_beneficiary_stats(id):
    """إحصائيات المستفيد"""
    try:
        beneficiary = Beneficiary.query.get_or_404(id)

        stats = {
            'total_assessments': beneficiary.assessments.count(),
            'total_sessions': beneficiary.sessions.count(),
            'completed_sessions': beneficiary.sessions.filter_by(status='completed').count(),
            'total_reports': beneficiary.reports.count(),
            'active_goals': beneficiary.goals.filter_by(status='active').count(),
            'achieved_goals': beneficiary.goals.filter_by(status='achieved').count(),
            'active_programs': len(beneficiary.get_active_programs()),
            'latest_assessment': None
        }

        latest = beneficiary.get_latest_assessment()
        if latest:
            stats['latest_assessment'] = latest.to_dict()

        return jsonify({
            'success': True,
            'data': stats
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/sessions', methods=['GET'])
@jwt_required()
def get_beneficiary_sessions(id):
    """الحصول على جلسات المستفيد"""
    try:
        beneficiary = Beneficiary.query.get_or_404(id)

        sessions = beneficiary.sessions.all() if beneficiary.sessions else []

        return jsonify({
            'success': True,
            'data': [session.to_dict() if hasattr(session, 'to_dict') else {
                'id': session.id,
                'session_number': session.session_number,
                'session_date': str(session.session_date),
                'session_type': session.session_type,
                'status': session.status
            } for session in sessions]
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_overall_statistics():
    """إحصائيات عامة للمستفيدين"""
    try:
        total = Beneficiary.query.count()
        active = Beneficiary.query.filter_by(status='active').count()
        inactive = Beneficiary.query.filter_by(status='inactive').count()

        # إحصائيات حسب نوع الإعاقة
        disability_stats = db.session.query(
            Beneficiary.disability_type,
            db.func.count(Beneficiary.id)
        ).group_by(Beneficiary.disability_type).all()

        # إحصائيات حسب الفئة العمرية
        age_groups = {
            '0-6': 0,
            '7-12': 0,
            '13-18': 0,
            '19-25': 0,
            '26+': 0
        }

        beneficiaries = Beneficiary.query.all()
        for b in beneficiaries:
            age = b.calculate_age()
            if age:
                if age <= 6:
                    age_groups['0-6'] += 1
                elif age <= 12:
                    age_groups['7-12'] += 1
                elif age <= 18:
                    age_groups['13-18'] += 1
                elif age <= 25:
                    age_groups['19-25'] += 1
                else:
                    age_groups['26+'] += 1

        return jsonify({
            'success': True,
            'data': {
                'total': total,
                'active': active,
                'inactive': inactive,
                'by_disability': [{'type': t, 'count': c} for t, c in disability_stats],
                'by_age_group': age_groups
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
