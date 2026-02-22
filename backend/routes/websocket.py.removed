"""
WebSocket Real-Time Features
Provides real-time notifications, session updates, and live dashboard
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import emit, join_room, leave_room
from datetime import datetime
import json
from app import socketio, db, redis_client
from models import User, Beneficiary, Session
from lib.auth_rbac_decorator import check_permission, require_role, log_audit, guard_payload_size, validate_json

# Connected users tracking
connected_users = {}
user_rooms = {}


@socketio.on('connect')
def handle_connect():
    """Handle user connection"""
    print(f'Client connected: {request.sid}')
    emit('connection_response', {
        'data': 'Connected to real-time server',
        'timestamp': datetime.now().isoformat()
    })


@socketio.on('disconnect')
def handle_disconnect():
    """Handle user disconnection"""
    if request.sid in connected_users:
        user_id = connected_users.pop(request.sid)
        if user_id in user_rooms:
            user_rooms[user_id].discard(request.sid)
    print(f'Client disconnected: {request.sid}')


@socketio.on('authenticate')
def handle_authentication(data):
    """Authenticate user and subscribe to updates"""
    try:
        token = data.get('token')
        # In production, validate JWT token here
        user_id = data.get('user_id')

        connected_users[request.sid] = user_id
        if user_id not in user_rooms:
            user_rooms[user_id] = set()
        user_rooms[user_id].add(request.sid)

        join_room(f'user_{user_id}')

        emit('auth_response', {
            'status': 'authenticated',
            'user_id': user_id,
            'timestamp': datetime.now().isoformat()
        })

        print(f'User {user_id} authenticated')

    except Exception as e:
        emit('error', {
            'message': f'Authentication failed: {str(e)}'
        })


@socketio.on('subscribe_sessions')
def handle_subscribe_sessions(data):
    """Subscribe to session updates for a beneficiary"""
    try:
        beneficiary_id = data.get('beneficiary_id')
        user_id = connected_users.get(request.sid)

        # Verify user has access to this beneficiary
        beneficiary = Beneficiary.query.filter_by(
            id=beneficiary_id,
            user_id=user_id
        ).first()

        if beneficiary:
            room = f'beneficiary_{beneficiary_id}_sessions'
            join_room(room)

            emit('subscription_response', {
                'status': 'subscribed',
                'type': 'sessions',
                'beneficiary_id': beneficiary_id,
                'timestamp': datetime.now().isoformat()
            })
        else:
            emit('error', {
                'message': 'Access denied'
            })
    except Exception as e:
        emit('error', {
            'message': str(e)
        })


@socketio.on('subscribe_dashboard')
def handle_subscribe_dashboard():
    """Subscribe to dashboard updates"""
    try:
        user_id = connected_users.get(request.sid)
        room = f'user_{user_id}_dashboard'
        join_room(room)

        emit('subscription_response', {
            'status': 'subscribed',
            'type': 'dashboard',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        emit('error', {
            'message': str(e)
        })


@socketio.on('notify_session_start')
def handle_session_start(data):
    """Notify about session start"""
    try:
        user_id = connected_users.get(request.sid)
        beneficiary_id = data.get('beneficiary_id')
        session_id = data.get('session_id')

        room = f'beneficiary_{beneficiary_id}_sessions'

        notification = {
            'type': 'session_started',
            'session_id': session_id,
            'beneficiary_id': beneficiary_id,
            'timestamp': datetime.now().isoformat()
        }

        # Emit to all users subscribed to this beneficiary
        emit('session_update', notification, room=room)

        # Cache in Redis
        redis_client.setex(
            f'session:{session_id}:status',
            3600,
            json.dumps({'status': 'active', 'timestamp': notification['timestamp']})
        )

    except Exception as e:
        emit('error', {
            'message': str(e)
        })


@socketio.on('notify_session_end')
def handle_session_end(data):
    """Notify about session end"""
    try:
        beneficiary_id = data.get('beneficiary_id')
        session_id = data.get('session_id')

        room = f'beneficiary_{beneficiary_id}_sessions'

        notification = {
            'type': 'session_ended',
            'session_id': session_id,
            'beneficiary_id': beneficiary_id,
            'timestamp': datetime.now().isoformat()
        }

        emit('session_update', notification, room=room)

        # Update Redis cache
        redis_client.setex(
            f'session:{session_id}:status',
            3600,
            json.dumps({'status': 'completed', 'timestamp': notification['timestamp']})
        )

    except Exception as e:
        emit('error', {
            'message': str(e)
        })


@socketio.on('broadcast_dashboard')
def handle_dashboard_update(data):
    """Broadcast dashboard update to user"""
    try:
        user_id = connected_users.get(request.sid)
        room = f'user_{user_id}_dashboard'

        update = {
            'type': 'dashboard_update',
            'data': data.get('data'),
            'timestamp': datetime.now().isoformat()
        }

        emit('dashboard_update', update, room=room)

    except Exception as e:
        emit('error', {
            'message': str(e)
        })


@socketio.on('request_live_stats')
def handle_live_stats_request():
    """Send live statistics to client"""
    try:
        user_id = connected_users.get(request.sid)

        # Get real-time stats
        active_sessions = db.session.query(Session).filter(
            Session.end_time == None
        ).count()

        total_beneficiaries = db.session.query(Beneficiary).filter_by(
            user_id=user_id
        ).count()

        stats = {
            'active_sessions': active_sessions,
            'total_beneficiaries': total_beneficiaries,
            'timestamp': datetime.now().isoformat()
        }

        emit('live_stats', stats)

    except Exception as e:
        emit('error', {
            'message': str(e)
        })


def notify_user(user_id, event_type, data):
    """Helper function to notify a user"""
    room = f'user_{user_id}'
    socketio.emit(event_type, data, room=room)


def notify_beneficiary_subscribers(beneficiary_id, event_type, data):
    """Helper function to notify all subscribers of a beneficiary"""
    room = f'beneficiary_{beneficiary_id}_sessions'
    socketio.emit(event_type, data, room=room)
