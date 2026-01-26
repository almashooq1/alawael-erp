"""
Notification API Routes
مسارات API الإشعارات
"""

from flask import Blueprint, request, jsonify, g
from services.notification_service import (
    NotificationService,
    NotificationType,
    NotificationChannel,
    NotificationPriority,
    NotificationCategory
)
from middleware.auth_middleware import AuthMiddleware
from services.admin_service import Permission
from lib.auth_rbac_decorator import check_permission, require_role, log_audit, guard_payload_size, validate_json

notification_bp = Blueprint('notification', __name__, url_prefix='/api/notifications')


# ==================== Create & Send ====================

@notification_bp.route('/', methods=['POST'])
@AuthMiddleware.require_auth
def create_notification():
    """
    إنشاء إشعار جديد

    Request Body:
        {
            "title": "عنوان الإشعار",
            "message": "محتوى الإشعار",
            "type": "info",
            "priority": "medium",
            "category": "system",
            "channels": ["in_app", "email"],
            "recipients": ["user_1", "user_2"],
            "action_url": "/dashboard",
            "data": {}
        }
    """
    try:
        data = request.get_json()

        notification = NotificationService.create_notification(data)

        if 'error' in notification:
            return jsonify(notification), 400

        return jsonify(notification), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@notification_bp.route('/bulk', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.SEND_NOTIFICATIONS)
def send_bulk_notification():
    """
    إرسال إشعار جماعي

    Request Body:
        {
            "title": "إشعار جماعي",
            "message": "رسالة لجميع المستخدمين",
            "type": "info",
            "recipients": ["all"] or ["user_1", "user_2"]
        }
    """
    try:
        data = request.get_json()

        result = NotificationService.send_bulk_notification(data)

        if 'error' in result:
            return jsonify(result), 400

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Get Notifications ====================

@notification_bp.route('/', methods=['GET'])
@AuthMiddleware.require_auth
def get_notifications():
    """
    الحصول على إشعارات المستخدم الحالي

    Query Parameters:
        - read: true/false
        - type: info/success/warning/error/critical
        - category: system/sales/inventory/hr/finance/security
        - priority: low/medium/high/urgent
    """
    try:
        user_id = g.user_id if hasattr(g, 'user_id') else 'user_1'

        filters = {
            'read': request.args.get('read') == 'true' if request.args.get('read') else None,
            'type': request.args.get('type'),
            'category': request.args.get('category'),
            'priority': request.args.get('priority')
        }

        # إزالة الفلاتر الفارغة
        filters = {k: v for k, v in filters.items() if v is not None}

        notifications = NotificationService.get_notifications(user_id, filters)

        return jsonify({
            'notifications': notifications,
            'total': len(notifications)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@notification_bp.route('/unread', methods=['GET'])
@AuthMiddleware.require_auth
def get_unread_notifications():
    """الحصول على الإشعارات غير المقروءة فقط"""
    try:
        user_id = g.user_id if hasattr(g, 'user_id') else 'user_1'

        notifications = NotificationService.get_notifications(user_id, {'read': False})

        return jsonify({
            'notifications': notifications,
            'count': len(notifications)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Mark as Read ====================

@notification_bp.route('/<notification_id>/read', methods=['PUT'])
@AuthMiddleware.require_auth
def mark_as_read(notification_id):
    """تحديد إشعار كمقروء"""
    try:
        user_id = g.user_id if hasattr(g, 'user_id') else 'user_1'

        success = NotificationService.mark_as_read(notification_id, user_id)

        if not success:
            return jsonify({'error': 'Notification not found or access denied'}), 404

        return jsonify({'message': 'Notification marked as read'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@notification_bp.route('/read-all', methods=['PUT'])
@AuthMiddleware.require_auth
def mark_all_as_read():
    """تحديد جميع الإشعارات كمقروءة"""
    try:
        user_id = g.user_id if hasattr(g, 'user_id') else 'user_1'

        count = NotificationService.mark_all_as_read(user_id)

        return jsonify({
            'message': f'{count} notifications marked as read',
            'count': count
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Delete ====================

@notification_bp.route('/<notification_id>', methods=['DELETE'])
@AuthMiddleware.require_auth
def delete_notification(notification_id):
    """حذف إشعار"""
    try:
        user_id = g.user_id if hasattr(g, 'user_id') else 'user_1'

        success = NotificationService.delete_notification(notification_id, user_id)

        if not success:
            return jsonify({'error': 'Notification not found or access denied'}), 404

        return jsonify({'message': 'Notification deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Rules ====================

@notification_bp.route('/rules', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.MANAGE_SETTINGS)
def create_rule():
    """
    إنشاء قاعدة إشعارات تلقائية

    Request Body:
        {
            "name": "Low Stock Alert",
            "description": "Send alert when stock is low",
            "trigger": "inventory_low",
            "conditions": [
                {"field": "quantity", "operator": "less_than", "value": 10}
            ],
            "notification_template": {
                "title": "Low Stock Alert",
                "message": "Product {product_name} is low on stock",
                "type": "warning"
            },
            "channels": ["in_app", "email"],
            "recipients": ["user_1"],
            "priority": "high"
        }
    """
    try:
        data = request.get_json()

        user_id = g.user_id if hasattr(g, 'user_id') else 'admin'
        data['created_by'] = user_id

        rule = NotificationService.create_rule(data)

        if 'error' in rule:
            return jsonify(rule), 400

        return jsonify(rule), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@notification_bp.route('/rules/trigger', methods=['POST'])
@AuthMiddleware.require_auth
def trigger_rules():
    """
    تفعيل قواعد الإشعارات

    Request Body:
        {
            "event": "inventory_low",
            "data": {
                "product_name": "Product A",
                "quantity": 5
            }
        }
    """
    try:
        data = request.get_json()

        event = data.get('event')
        event_data = data.get('data', {})

        triggered_rules = NotificationService.evaluate_rules(event, event_data)

        return jsonify({
            'triggered_rules': triggered_rules,
            'count': len(triggered_rules)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Preferences ====================

@notification_bp.route('/preferences', methods=['GET'])
@AuthMiddleware.require_auth
def get_preferences():
    """الحصول على تفضيلات الإشعارات للمستخدم الحالي"""
    try:
        user_id = g.user_id if hasattr(g, 'user_id') else 'user_1'

        preferences = NotificationService.get_user_preferences(user_id)

        return jsonify(preferences), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@notification_bp.route('/preferences', methods=['PUT'])
@AuthMiddleware.require_auth
def update_preferences():
    """
    تحديث تفضيلات الإشعارات

    Request Body:
        {
            "channels": {
                "in_app": true,
                "email": true,
                "sms": false,
                "push": true
            },
            "categories": {
                "system": true,
                "sales": true,
                "inventory": false
            },
            "quiet_hours": {
                "enabled": true,
                "start": "22:00",
                "end": "08:00"
            },
            "sound": true,
            "vibration": true
        }
    """
    try:
        user_id = g.user_id if hasattr(g, 'user_id') else 'user_1'
        data = request.get_json()

        preferences = NotificationService.update_user_preferences(user_id, data)

        if 'error' in preferences:
            return jsonify(preferences), 400

        return jsonify(preferences), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Statistics ====================

@notification_bp.route('/statistics', methods=['GET'])
@AuthMiddleware.require_auth
def get_statistics():
    """إحصائيات الإشعارات"""
    try:
        user_id = g.user_id if hasattr(g, 'user_id') else None

        # المدراء يرون جميع الإحصائيات
        if hasattr(g, 'permissions') and Permission.VIEW_STATS in g.permissions:
            user_id = None

        stats = NotificationService.get_statistics(user_id)

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Templates ====================

@notification_bp.route('/templates', methods=['GET'])
@AuthMiddleware.require_auth
def get_templates():
    """الحصول على قوالب الإشعارات"""
    try:
        templates = NotificationService.get_notification_templates()

        return jsonify({
            'templates': templates,
            'total': len(templates)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Health Check ====================

@notification_bp.route('/health', methods=['GET'])

@jwt_required()
@check_permission('view_health_check')
@log_audit('GET_HEALTH_CHECK')
def health_check():
    """فحص صحة نظام الإشعارات"""
    return jsonify({
        'status': 'healthy',
        'service': 'notifications',
        'total_notifications': len(NotificationService.notifications_db),
        'total_rules': len(NotificationService.rules_db),
        'timestamp': '2026-01-20'
    }), 200
