"""
Routes للأهداف (Goals)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.goal import Goal, GoalProgress
from datetime import datetime
from lib.auth_rbac_decorator import check_permission, require_role, log_audit, guard_payload_size, validate_json

bp = Blueprint('goals', __name__, url_prefix='/api/goals')

@bp.route('', methods=['GET'])
@jwt_required()
def list_goals():
    """قائمة الأهداف"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        beneficiary_id = request.args.get('beneficiary_id', type=int)
        status = request.args.get('status')
        goal_type = request.args.get('type')

        query = Goal.query

        if beneficiary_id:
            query = query.filter_by(beneficiary_id=beneficiary_id)

        if status:
            query = query.filter_by(status=status)

        if goal_type:
            query = query.filter_by(goal_type=goal_type)

        query = query.order_by(Goal.target_date.asc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': [g.to_dict() for g in pagination.items],
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

@check_permission('view_goal')
@log_audit('GET_GET_GOAL')
def get_goal(id):
    """تفاصيل هدف"""
    try:
        goal = Goal.query.get_or_404(id)
        return jsonify({
            'success': True,
            'data': goal.to_dict(include_details=True)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('', methods=['POST'])
@jwt_required()
def create_goal():
    """إنشاء هدف جديد"""
    try:
        data = request.get_json()

        goal = Goal(
            beneficiary_id=data['beneficiary_id'],
            created_by=get_jwt_identity(),
            goal_type=data['goal_type'],
            domain=data.get('domain'),
            title=data['title'],
            description=data.get('description'),
            specific=data.get('specific'),
            measurable=data.get('measurable'),
            achievable=data.get('achievable'),
            relevant=data.get('relevant'),
            time_bound=data.get('time_bound'),
            sub_goals=data.get('sub_goals'),
            success_criteria=data.get('success_criteria'),
            baseline=data.get('baseline'),
            target=data.get('target'),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
            target_date=datetime.strptime(data['target_date'], '%Y-%m-%d').date(),
            strategies=data.get('strategies'),
            resources_needed=data.get('resources_needed'),
            responsible_staff=data.get('responsible_staff'),
            review_frequency=data.get('review_frequency')
        )

        db.session.add(goal)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم إنشاء الهدف بنجاح',
            'data': goal.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/progress', methods=['POST'])

@check_permission('manage_goal_progress')
@guard_payload_size()
@validate_json()
@log_audit('POST_UPDATE_GOAL_PROGRESS')
def update_goal_progress(id):
    """تحديث تقدم هدف"""
    try:
        goal = Goal.query.get_or_404(id)
        data = request.get_json()

        goal.update_progress(
            percentage=data['progress_percentage'],
            notes=data.get('notes')
        )

        return jsonify({
            'success': True,
            'message': 'تم تحديث التقدم بنجاح',
            'data': goal.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/progress', methods=['GET'])

@check_permission('view_goal_progress_history')
@log_audit('GET_GET_GOAL_PROGRESS_HISTORY')
def get_goal_progress_history(id):
    """سجل تقدم الهدف"""
    try:
        goal = Goal.query.get_or_404(id)
        progress_records = goal.progress_records.order_by(GoalProgress.recorded_at.desc()).all()

        return jsonify({
            'success': True,
            'data': [p.to_dict() for p in progress_records]
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
