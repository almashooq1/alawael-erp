"""
Routes للجلسات العلاجية (Therapy Sessions)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.session import TherapySession
from datetime import datetime, timedelta
from sqlalchemy import and_
from lib.auth_rbac_decorator import check_permission, require_role, log_audit, guard_payload_size, validate_json

bp = Blueprint('sessions', __name__, url_prefix='/api/sessions')

@bp.route('', methods=['GET'])
@jwt_required()
def list_sessions():
    """قائمة الجلسات"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        beneficiary_id = request.args.get('beneficiary_id', type=int)
        therapist_id = request.args.get('therapist_id', type=int)
        status = request.args.get('status')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        query = TherapySession.query

        if beneficiary_id:
            query = query.filter_by(beneficiary_id=beneficiary_id)

        if therapist_id:
            query = query.filter_by(therapist_id=therapist_id)

        if status:
            query = query.filter_by(status=status)

        if date_from:
            query = query.filter(TherapySession.session_date >= datetime.strptime(date_from, '%Y-%m-%d').date())

        if date_to:
            query = query.filter(TherapySession.session_date <= datetime.strptime(date_to, '%Y-%m-%d').date())

        query = query.order_by(TherapySession.session_date.desc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': [s.to_dict() for s in pagination.items],
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

@check_permission('view_session')
@log_audit('GET_GET_SESSION')
def get_session(id):
    """تفاصيل جلسة"""
    try:
        session = TherapySession.query.get_or_404(id)
        return jsonify({
            'success': True,
            'data': session.to_dict(include_details=True)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('', methods=['POST'])
@jwt_required()
def create_session():
    """إنشاء جلسة جديدة"""
    try:
        data = request.get_json()

        session = TherapySession(
            beneficiary_id=data['beneficiary_id'],
            therapist_id=data.get('therapist_id', get_jwt_identity()),
            program_id=data.get('program_id'),
            session_type=data['session_type'],
            session_date=datetime.strptime(data['session_date'], '%Y-%m-%d').date(),
            start_time=datetime.strptime(data['start_time'], '%H:%M').time(),
            end_time=datetime.strptime(data['end_time'], '%H:%M').time(),
            objectives=data.get('objectives'),
            status=data.get('status', 'scheduled')
        )

        db.session.add(session)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم إنشاء الجلسة بنجاح',
            'data': session.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>', methods=['PUT'])

@check_permission('manage_session')
@guard_payload_size()
@log_audit('PUT_UPDATE_SESSION')
def update_session(id):
    """تحديث جلسة"""
    try:
        session = TherapySession.query.get_or_404(id)
        data = request.get_json()

        updateable_fields = ['activities', 'notes', 'observations', 'progress_rating',
                            'beneficiary_engagement', 'goals_achieved', 'attendance_status',
                            'recommendations', 'homework', 'status']

        for field in updateable_fields:
            if field in data:
                setattr(session, field, data[field])

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم تحديث الجلسة بنجاح',
            'data': session.to_dict(include_details=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/complete', methods=['POST'])

@check_permission('manage_completesession')
@guard_payload_size()
@validate_json()
@log_audit('POST_COMPLETE_SESSION')
def complete_session(id):
    """إكمال جلسة"""
    try:
        session = TherapySession.query.get_or_404(id)
        session.mark_completed()

        return jsonify({
            'success': True,
            'message': 'تم إكمال الجلسة بنجاح'
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/cancel', methods=['POST'])

@check_permission('manage_cancelsession')
@guard_payload_size()
@validate_json()
@log_audit('POST_CANCEL_SESSION')
def cancel_session(id):
    """إلغاء جلسة"""
    try:
        session = TherapySession.query.get_or_404(id)
        data = request.get_json()

        session.mark_cancelled(data.get('reason'))

        return jsonify({
            'success': True,
            'message': 'تم إلغاء الجلسة'
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/upcoming', methods=['GET'])

@check_permission('view_upcoming_sessions')
@log_audit('GET_GET_UPCOMING_SESSIONS')
def get_upcoming_sessions():
    """الجلسات القادمة"""
    try:
        days = request.args.get('days', 7, type=int)
        today = datetime.utcnow().date()
        end_date = today + timedelta(days=days)

        sessions = TherapySession.query.filter(
            and_(
                TherapySession.session_date >= today,
                TherapySession.session_date <= end_date,
                TherapySession.status == 'scheduled'
            )
        ).order_by(TherapySession.session_date.asc()).all()

        return jsonify({
            'success': True,
            'data': [s.to_dict() for s in sessions]
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
