"""
Advanced Analytics Endpoints for Therapy Management System
Provides detailed insights and reporting capabilities
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func, extract
from app import db
from models import User, Beneficiary, Session
from lib.auth_rbac_decorator import check_permission, require_role, log_audit, guard_payload_size, validate_json

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')


@analytics_bp.route('/dashboard', methods=['GET'])

@check_permission('view_analytics_dashboard')
@log_audit('GET_GET_ANALYTICS_DASHBOARD')
def get_analytics_dashboard():
    """
    Get comprehensive analytics dashboard
    Returns overview statistics and key metrics
    """
    try:
        current_user_id = get_jwt_identity()

        # Basic counts
        total_beneficiaries = db.session.query(func.count(Beneficiary.id)).filter(
            Beneficiary.user_id == int(current_user_id)
        ).scalar()

        total_sessions = db.session.query(func.count(Session.id)).join(Beneficiary).filter(
            Beneficiary.user_id == int(current_user_id)
        ).scalar()

        # Sessions this month
        now = datetime.now()
        month_start = now.replace(day=1)
        sessions_this_month = db.session.query(func.count(Session.id)).join(Beneficiary).filter(
            Beneficiary.user_id == int(current_user_id),
            Session.start_time >= month_start
        ).scalar()

        # Average session duration (minutes)
        avg_duration = db.session.query(
            func.avg(
                func.extract('epoch', Session.end_time - Session.start_time) / 60
            )
        ).join(Beneficiary).filter(
            Beneficiary.user_id == int(current_user_id)
        ).scalar()

        # Active beneficiaries (with sessions in last 30 days)
        thirty_days_ago = now - timedelta(days=30)
        active_beneficiaries = db.session.query(func.count(func.distinct(Beneficiary.id))).join(
            Session
        ).filter(
            Beneficiary.user_id == int(current_user_id),
            Session.start_time >= thirty_days_ago
        ).scalar()

        dashboard = {
            'summary': {
                'total_beneficiaries': total_beneficiaries or 0,
                'total_sessions': total_sessions or 0,
                'sessions_this_month': sessions_this_month or 0,
                'active_beneficiaries': active_beneficiaries or 0,
                'avg_session_duration_minutes': round(avg_duration or 0, 2)
            },
            'timestamp': datetime.now().isoformat()
        }

        return jsonify({
            'status': 200,
            'message': 'Dashboard retrieved successfully',
            'data': dashboard
        }), 200

    except Exception as e:
        return jsonify({
            'status': 500,
            'message': f'Error retrieving dashboard: {str(e)}'
        }), 500


@analytics_bp.route('/sessions/stats', methods=['GET'])

@check_permission('view_sessions_statistics')
@log_audit('GET_GET_SESSIONS_STATISTICS')
def get_sessions_statistics():
    """
    Get detailed session statistics
    Returns breakdown by various dimensions
    """
    try:
        current_user_id = get_jwt_identity()

        # Sessions by day of week
        sessions_by_day = db.session.query(
            extract('dow', Session.start_time).label('day_of_week'),
            func.count(Session.id).label('count')
        ).join(Beneficiary).filter(
            Beneficiary.user_id == int(current_user_id)
        ).group_by('day_of_week').all()

        days_map = {0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
                    4: 'Thursday', 5: 'Friday', 6: 'Saturday'}

        sessions_by_hour = db.session.query(
            extract('hour', Session.start_time).label('hour'),
            func.count(Session.id).label('count')
        ).join(Beneficiary).filter(
            Beneficiary.user_id == int(current_user_id)
        ).group_by('hour').all()

        stats = {
            'sessions_by_day': [
                {'day': days_map.get(int(day), 'Unknown'), 'count': count}
                for day, count in sessions_by_day
            ],
            'sessions_by_hour': [
                {'hour': f"{int(hour):02d}:00", 'count': count}
                for hour, count in sessions_by_hour
            ],
            'timestamp': datetime.now().isoformat()
        }

        return jsonify({
            'status': 200,
            'message': 'Session statistics retrieved successfully',
            'data': stats
        }), 200

    except Exception as e:
        return jsonify({
            'status': 500,
            'message': f'Error retrieving session statistics: {str(e)}'
        }), 500


@analytics_bp.route('/beneficiaries/stats', methods=['GET'])

@check_permission('view_beneficiaries_statistics')
@log_audit('GET_GET_BENEFICIARIES_STATISTICS')
def get_beneficiaries_statistics():
    """
    Get beneficiary statistics
    Returns demographics and engagement metrics
    """
    try:
        current_user_id = get_jwt_identity()

        # Age distribution
        now = datetime.now()

        age_groups = {
            '0-10': db.session.query(func.count(Beneficiary.id)).filter(
                Beneficiary.user_id == int(current_user_id),
                extract('year', now) - extract('year', Beneficiary.date_of_birth) < 10
            ).scalar() or 0,
            '10-20': db.session.query(func.count(Beneficiary.id)).filter(
                Beneficiary.user_id == int(current_user_id),
                extract('year', now) - extract('year', Beneficiary.date_of_birth) >= 10,
                extract('year', now) - extract('year', Beneficiary.date_of_birth) < 20
            ).scalar() or 0,
            '20-30': db.session.query(func.count(Beneficiary.id)).filter(
                Beneficiary.user_id == int(current_user_id),
                extract('year', now) - extract('year', Beneficiary.date_of_birth) >= 20,
                extract('year', now) - extract('year', Beneficiary.date_of_birth) < 30
            ).scalar() or 0,
            '30+': db.session.query(func.count(Beneficiary.id)).filter(
                Beneficiary.user_id == int(current_user_id),
                extract('year', now) - extract('year', Beneficiary.date_of_birth) >= 30
            ).scalar() or 0
        }

        # Top active beneficiaries
        top_beneficiaries = db.session.query(
            Beneficiary.id,
            Beneficiary.name,
            func.count(Session.id).label('session_count')
        ).join(Session).filter(
            Beneficiary.user_id == int(current_user_id)
        ).group_by(Beneficiary.id).order_by(
            func.count(Session.id).desc()
        ).limit(10).all()

        stats = {
            'age_distribution': age_groups,
            'top_active_beneficiaries': [
                {'id': b[0], 'name': b[1], 'sessions': b[2]}
                for b in top_beneficiaries
            ],
            'timestamp': datetime.now().isoformat()
        }

        return jsonify({
            'status': 200,
            'message': 'Beneficiary statistics retrieved successfully',
            'data': stats
        }), 200

    except Exception as e:
        return jsonify({
            'status': 500,
            'message': f'Error retrieving beneficiary statistics: {str(e)}'
        }), 500


@analytics_bp.route('/usage-trends', methods=['GET'])

@check_permission('view_usage_trends')
@log_audit('GET_GET_USAGE_TRENDS')
def get_usage_trends():
    """
    Get usage trends over time
    Returns data for trend analysis and forecasting
    """
    try:
        current_user_id = get_jwt_identity()

        # Last 30 days trend
        thirty_days_ago = datetime.now() - timedelta(days=30)

        daily_sessions = db.session.query(
            func.date(Session.start_time).label('date'),
            func.count(Session.id).label('count')
        ).join(Beneficiary).filter(
            Beneficiary.user_id == int(current_user_id),
            Session.start_time >= thirty_days_ago
        ).group_by(func.date(Session.start_time)).order_by('date').all()

        trends = {
            'last_30_days': [
                {'date': str(date), 'sessions': count}
                for date, count in daily_sessions
            ],
            'timestamp': datetime.now().isoformat()
        }

        return jsonify({
            'status': 200,
            'message': 'Usage trends retrieved successfully',
            'data': trends
        }), 200

    except Exception as e:
        return jsonify({
            'status': 500,
            'message': f'Error retrieving usage trends: {str(e)}'
        }), 500


@analytics_bp.route('/export/csv', methods=['GET'])

@check_permission('view_export_to_csv')
@log_audit('GET_EXPORT_TO_CSV')
def export_to_csv():
    """
    Export beneficiary data and sessions to CSV
    """
    try:
        current_user_id = get_jwt_identity()

        # This would typically use a library like pandas
        # For now, return JSON that could be converted to CSV

        beneficiaries = db.session.query(Beneficiary).filter(
            Beneficiary.user_id == int(current_user_id)
        ).all()

        data = []
        for b in beneficiaries:
            sessions_count = len(b.sessions)
            data.append({
                'id': b.id,
                'name': b.name,
                'national_id': b.national_id,
                'date_of_birth': b.date_of_birth.isoformat() if b.date_of_birth else None,
                'sessions_count': sessions_count
            })

        return jsonify({
            'status': 200,
            'message': 'Export data prepared',
            'data': data,
            'export_format': 'CSV compatible JSON'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 500,
            'message': f'Error exporting data: {str(e)}'
        }), 500
