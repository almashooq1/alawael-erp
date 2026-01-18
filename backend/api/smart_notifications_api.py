"""
🔔 Smart Notifications API Routes
نظام الإشعارات الذكية - API Endpoints
"""

from flask import Blueprint, request, jsonify
from services.smart_notifications_service import SmartNotificationsService
from datetime import datetime
import logging

api = Blueprint('notifications', __name__, url_prefix='/api/notifications')
logger = logging.getLogger(__name__)


# ==========================================
# 1. إرسال الإشعارات
# ==========================================

@api.route('/send', methods=['POST'])
def send_notification():
    """
    إرسال إشعار فوري

    POST /api/notifications/send
    Body:
    {
        "user_id": "user_123",
        "type": "alert|info|warning|success|error",
        "title": "العنوان",
        "message": "نص الرسالة",
        "channels": ["email", "push"],
        "priority": "high"
    }
    """
    try:
        data = request.get_json()
        db = request.app.db
        email_config = request.app.email_config

        service = SmartNotificationsService(db, email_config)
        result = service.send_notification(data)

        logger.info(f"Notification sent to {data.get('user_id')}")

        return jsonify({
            'status': 'success',
            'notification_id': result.get('notification_id'),
            'delivery_status': result.get('status'),
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 2. جدولة الإشعارات
# ==========================================

@api.route('/schedule', methods=['POST'])
def schedule_notification():
    """
    جدولة إشعار للإرسال في وقت محدد

    POST /api/notifications/schedule
    Body:
    {
        "notification_config": {...},
        "send_time": "2026-01-17T10:00:00"
    }
    """
    try:
        data = request.get_json()
        db = request.app.db

        service = SmartNotificationsService(db)
        result = service.schedule_notification(
            data['notification_config'],
            data['send_time']
        )

        logger.info(f"Notification scheduled: {result['schedule_id']}")

        return jsonify({
            'status': 'success',
            'schedule': result,
            'timestamp': datetime.now().isoformat()
        }), 201

    except Exception as e:
        logger.error(f"Error scheduling notification: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 3. جدولة الإشعارات المتكررة
# ==========================================

@api.route('/schedule-recurring', methods=['POST'])
def schedule_recurring():
    """
    جدولة إشعار متكرر

    POST /api/notifications/schedule-recurring
    Body:
    {
        "notification_config": {...},
        "frequency": "daily|weekly|monthly",
        "start_time": "2026-01-17T08:00:00",
        "end_time": "2026-12-31T23:59:59"
    }
    """
    try:
        data = request.get_json()
        db = request.app.db

        service = SmartNotificationsService(db)
        result = service.schedule_recurring_notification(
            data['notification_config'],
            data['frequency'],
            data['start_time'],
            data.get('end_time')
        )

        logger.info(f"Recurring notification scheduled: {result['schedule_id']}")

        return jsonify({
            'status': 'success',
            'schedule': result,
            'timestamp': datetime.now().isoformat()
        }), 201

    except Exception as e:
        logger.error(f"Error scheduling recurring notification: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 4. تعيين التفضيلات
# ==========================================

@api.route('/preferences/<user_id>', methods=['PUT'])
def set_preferences(user_id):
    """
    تعيين تفضيلات الإشعارات

    PUT /api/notifications/preferences/<user_id>
    Body:
    {
        "email_enabled": true,
        "sms_enabled": false,
        "push_enabled": true,
        "quiet_hours": {
            "start": "22:00",
            "end": "08:00"
        }
    }
    """
    try:
        data = request.get_json()
        db = request.app.db

        service = SmartNotificationsService(db)
        result = service.set_notification_preferences(user_id, data)

        logger.info(f"Preferences updated for {user_id}")

        return jsonify({
            'status': 'success',
            'message': result.get('message'),
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error setting preferences: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 5. الحصول على التفضيلات
# ==========================================

@api.route('/preferences/<user_id>', methods=['GET'])
def get_preferences(user_id):
    """
    الحصول على تفضيلات الإشعارات

    GET /api/notifications/preferences/<user_id>
    """
    try:
        db = request.app.db

        service = SmartNotificationsService(db)
        preferences = service.get_notification_preferences(user_id)

        return jsonify({
            'status': 'success',
            'preferences': preferences,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting preferences: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 6. قائمة الإشعارات
# ==========================================

@api.route('/list', methods=['GET'])
def list_notifications():
    """
    الحصول على قائمة الإشعارات

    GET /api/notifications/list
    Query Params:
    - user_id: معرف المستخدم
    - limit: عدد النتائج
    - offset: الإزاحة
    """
    try:
        user_id = request.args.get('user_id')
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        db = request.app.db

        query = {}
        if user_id:
            query['user_id'] = user_id

        notifications = list(
            db['notifications'].find(query).sort('created_at', -1).skip(offset).limit(limit)
        )

        total = db['notifications'].count_documents(query)

        return jsonify({
            'status': 'success',
            'notifications': notifications,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'total': total
            },
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error listing notifications: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 7. سجل الإشعارات
# ==========================================

@api.route('/history/<user_id>', methods=['GET'])
def get_notification_history(user_id):
    """
    الحصول على سجل الإشعارات

    GET /api/notifications/history/<user_id>
    Query Params:
    - limit: عدد النتائج (افتراضي: 50)
    """
    try:
        limit = request.args.get('limit', 50, type=int)
        db = request.app.db

        service = SmartNotificationsService(db)
        history = service.get_notification_history(user_id, limit)

        return jsonify({
            'status': 'success',
            'user_id': user_id,
            'history': history,
            'count': len(history),
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting notification history: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 8. إحصائيات الإشعارات
# ==========================================

@api.route('/statistics/<user_id>', methods=['GET'])
def get_notification_stats(user_id):
    """
    الحصول على إحصائيات الإشعارات

    GET /api/notifications/statistics/<user_id>
    Query Params:
    - date_from: من تاريخ
    - date_to: إلى تاريخ
    """
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        db = request.app.db

        service = SmartNotificationsService(db)
        stats = service.get_notification_stats(
            user_id,
            date_from,
            date_to
        )

        return jsonify({
            'status': 'success',
            'user_id': user_id,
            'statistics': stats,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting notification stats: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# معالجة الأخطاء
# ==========================================

@api.errorhandler(400)
def bad_request(error):
    return jsonify({
        'status': 'error',
        'message': 'Bad request'
    }), 400


@api.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found'
    }), 404
