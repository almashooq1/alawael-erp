"""
Advanced Features
Batch operations, advanced search, reporting, and data visualization
"""

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_, func
import csv
from io import StringIO, BytesIO
from datetime import datetime, timedelta
import uuid
from app import db
from models import User, Beneficiary, Session
from lib.auth_rbac_decorator import check_permission, require_role, log_audit, guard_payload_size, validate_json

advanced_bp = Blueprint('advanced', __name__, url_prefix='/api/advanced')


# ==================== BATCH OPERATIONS ====================

@advanced_bp.route('/beneficiaries/batch-create', methods=['POST'])

@check_permission('manage_batch_beneficiaries')
@guard_payload_size()
@validate_json()
@log_audit('POST_BATCH_CREATE_BENEFICIARIES')
def batch_create_beneficiaries():
    """Create multiple beneficiaries at once"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        beneficiaries_data = data.get('beneficiaries', [])

        created = []
        errors = []

        for idx, b_data in enumerate(beneficiaries_data):
            try:
                beneficiary = Beneficiary(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    name=b_data.get('name'),
                    date_of_birth=b_data.get('date_of_birth'),
                    gender=b_data.get('gender'),
                    contact_info=b_data.get('contact_info'),
                    goals=b_data.get('goals', []),
                    status='active'
                )
                db.session.add(beneficiary)
                created.append(beneficiary.to_dict())
            except Exception as e:
                errors.append({
                    'index': idx,
                    'error': str(e)
                })

        db.session.commit()

        return jsonify({
            'success': True,
            'created_count': len(created),
            'error_count': len(errors),
            'beneficiaries': created,
            'errors': errors
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 400


@advanced_bp.route('/beneficiaries/batch-update', methods=['PUT'])

@check_permission('manage_batch_beneficiaries')
@guard_payload_size()
@log_audit('PUT_BATCH_UPDATE_BENEFICIARIES')
def batch_update_beneficiaries():
    """Update multiple beneficiaries"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        updates = data.get('updates', [])

        updated = []
        errors = []

        for idx, update_data in enumerate(updates):
            try:
                beneficiary = Beneficiary.query.filter_by(
                    id=update_data.get('id'),
                    user_id=user_id
                ).first()

                if not beneficiary:
                    errors.append({
                        'index': idx,
                        'id': update_data.get('id'),
                        'error': 'Not found'
                    })
                    continue

                # Update fields
                for field, value in update_data.items():
                    if field != 'id' and hasattr(beneficiary, field):
                        setattr(beneficiary, field, value)

                updated.append(beneficiary.to_dict())
            except Exception as e:
                errors.append({
                    'index': idx,
                    'error': str(e)
                })

        db.session.commit()

        return jsonify({
            'success': True,
            'updated_count': len(updated),
            'error_count': len(errors),
            'beneficiaries': updated,
            'errors': errors
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 400


@advanced_bp.route('/beneficiaries/batch-delete', methods=['DELETE'])

@check_permission('manage_resources')
@log_audit('DELETE_BATCH_DELETE_BENEFICIARIES')
def batch_delete_beneficiaries():
    """Delete multiple beneficiaries"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        ids = data.get('ids', [])

        deleted_count = 0
        errors = []

        for b_id in ids:
            try:
                beneficiary = Beneficiary.query.filter_by(
                    id=b_id,
                    user_id=user_id
                ).first()

                if beneficiary:
                    db.session.delete(beneficiary)
                    deleted_count += 1
                else:
                    errors.append({
                        'id': b_id,
                        'error': 'Not found'
                    })
            except Exception as e:
                errors.append({
                    'id': b_id,
                    'error': str(e)
                })

        db.session.commit()

        return jsonify({
            'success': True,
            'deleted_count': deleted_count,
            'error_count': len(errors),
            'errors': errors
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ==================== ADVANCED SEARCH ====================

@advanced_bp.route('/search', methods=['POST'])

@check_permission('manage_advancedsearch')
@guard_payload_size()
@validate_json()
@log_audit('POST_ADVANCED_SEARCH')
def advanced_search():
    """Advanced search across beneficiaries and sessions"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        query_type = data.get('type', 'beneficiaries')  # 'beneficiaries' or 'sessions'
        search_term = data.get('q', '')
        filters = data.get('filters', {})
        sort_by = data.get('sort_by', 'name')
        sort_order = data.get('sort_order', 'asc')
        page = data.get('page', 1)
        per_page = data.get('per_page', 20)

        if query_type == 'beneficiaries':
            query = Beneficiary.query.filter_by(user_id=user_id)

            # Search term
            if search_term:
                query = query.filter(
                    or_(
                        Beneficiary.name.ilike(f'%{search_term}%'),
                        Beneficiary.contact_info.ilike(f'%{search_term}%')
                    )
                )

            # Filters
            if 'status' in filters:
                query = query.filter_by(status=filters['status'])
            if 'gender' in filters:
                query = query.filter_by(gender=filters['gender'])

            # Sorting
            if hasattr(Beneficiary, sort_by):
                sort_col = getattr(Beneficiary, sort_by)
                if sort_order == 'desc':
                    query = query.order_by(sort_col.desc())
                else:
                    query = query.order_by(sort_col)

            results = query.paginate(page=page, per_page=per_page)

            return jsonify({
                'success': True,
                'type': 'beneficiaries',
                'results': [b.to_dict() for b in results.items],
                'total': results.total,
                'pages': results.pages,
                'current_page': page
            }), 200

        elif query_type == 'sessions':
            query = db.session.query(Session).join(
                Beneficiary,
                Session.beneficiary_id == Beneficiary.id
            ).filter(Beneficiary.user_id == user_id)

            # Search term
            if search_term:
                query = query.filter(
                    or_(
                        Beneficiary.name.ilike(f'%{search_term}%'),
                        Session.notes.ilike(f'%{search_term}%')
                    )
                )

            # Filters
            if 'status' in filters:
                status = filters['status']
                if status == 'active':
                    query = query.filter(Session.end_time == None)
                elif status == 'completed':
                    query = query.filter(Session.end_time != None)

            if 'date_from' in filters:
                query = query.filter(Session.start_time >= filters['date_from'])
            if 'date_to' in filters:
                query = query.filter(Session.start_time <= filters['date_to'])

            # Sorting
            if sort_by == 'start_time':
                if sort_order == 'desc':
                    query = query.order_by(Session.start_time.desc())
                else:
                    query = query.order_by(Session.start_time)

            results = query.paginate(page=page, per_page=per_page)

            return jsonify({
                'success': True,
                'type': 'sessions',
                'results': [s.to_dict() for s in results.items],
                'total': results.total,
                'pages': results.pages,
                'current_page': page
            }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ==================== REPORTING & EXPORT ====================

@advanced_bp.route('/reports/beneficiary/<beneficiary_id>', methods=['GET'])

@check_permission('view_beneficiary_report')
@log_audit('GET_GET_BENEFICIARY_REPORT')
def get_beneficiary_report(beneficiary_id):
    """Generate comprehensive beneficiary report"""
    try:
        user_id = get_jwt_identity()

        beneficiary = Beneficiary.query.filter_by(
            id=beneficiary_id,
            user_id=user_id
        ).first()

        if not beneficiary:
            return jsonify({'error': 'Beneficiary not found'}), 404

        # Get sessions
        sessions = Session.query.filter_by(beneficiary_id=beneficiary_id).all()

        # Calculate statistics
        total_sessions = len(sessions)
        completed_sessions = len([s for s in sessions if s.end_time])
        active_sessions = total_sessions - completed_sessions

        total_duration = sum([
            (s.end_time - s.start_time).total_seconds() / 60
            for s in sessions if s.end_time
        ])

        report = {
            'beneficiary': beneficiary.to_dict(),
            'statistics': {
                'total_sessions': total_sessions,
                'completed_sessions': completed_sessions,
                'active_sessions': active_sessions,
                'total_duration_minutes': round(total_duration, 2),
                'average_session_duration': round(
                    total_duration / completed_sessions if completed_sessions > 0 else 0, 2
                )
            },
            'recent_sessions': [s.to_dict() for s in sessions[-5:]],
            'generated_at': datetime.utcnow().isoformat()
        }

        return jsonify({
            'success': True,
            'report': report
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 400


@advanced_bp.route('/export/csv', methods=['POST'])

@check_permission('manage_exportcsv')
@guard_payload_size()
@validate_json()
@log_audit('POST_EXPORT_CSV')
def export_csv():
    """Export data to CSV"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        export_type = data.get('type', 'beneficiaries')

        # Create CSV
        output = StringIO()
        writer = None

        if export_type == 'beneficiaries':
            beneficiaries = Beneficiary.query.filter_by(user_id=user_id).all()

            if beneficiaries:
                writer = csv.DictWriter(
                    output,
                    fieldnames=['id', 'name', 'date_of_birth', 'gender', 'status', 'created_at']
                )
                writer.writeheader()

                for b in beneficiaries:
                    writer.writerow({
                        'id': b.id,
                        'name': b.name,
                        'date_of_birth': b.date_of_birth,
                        'gender': b.gender,
                        'status': b.status,
                        'created_at': b.created_at.isoformat() if b.created_at else ''
                    })

        elif export_type == 'sessions':
            sessions = db.session.query(Session).join(
                Beneficiary,
                Session.beneficiary_id == Beneficiary.id
            ).filter(Beneficiary.user_id == user_id).all()

            if sessions:
                writer = csv.DictWriter(
                    output,
                    fieldnames=['id', 'beneficiary_name', 'start_time', 'end_time', 'duration_minutes', 'status']
                )
                writer.writeheader()

                for s in sessions:
                    duration = 0
                    if s.end_time:
                        duration = (s.end_time - s.start_time).total_seconds() / 60

                    writer.writerow({
                        'id': s.id,
                        'beneficiary_name': s.beneficiary.name if s.beneficiary else '',
                        'start_time': s.start_time.isoformat() if s.start_time else '',
                        'end_time': s.end_time.isoformat() if s.end_time else '',
                        'duration_minutes': round(duration, 2),
                        'status': 'completed' if s.end_time else 'active'
                    })

        # Convert to bytes
        output.seek(0)
        bytes_output = BytesIO(output.getvalue().encode('utf-8'))
        bytes_output.seek(0)

        return send_file(
            bytes_output,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'{export_type}_export_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 400
