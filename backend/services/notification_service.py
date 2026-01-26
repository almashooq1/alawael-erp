"""
Smart Notifications Service
خدمة الإشعارات الذكية
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum
import json


class NotificationType(str, Enum):
    """أنواع الإشعارات"""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class NotificationChannel(str, Enum):
    """قنوات الإرسال"""
    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"


class NotificationPriority(str, Enum):
    """مستويات الأولوية"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class NotificationCategory(str, Enum):
    """فئات الإشعارات"""
    SYSTEM = "system"
    SALES = "sales"
    INVENTORY = "inventory"
    HR = "hr"
    FINANCE = "finance"
    SECURITY = "security"
    CUSTOM = "custom"


class NotificationService:
    """خدمة الإشعارات الذكية"""

    # قاعدة بيانات مؤقتة
    notifications_db = {}
    rules_db = {}
    preferences_db = {}
    templates_db = {}

    @staticmethod
    def create_notification(data: Dict[str, Any]) -> Dict[str, Any]:
        """إنشاء إشعار جديد"""
        try:
            notification_id = f"notif_{len(NotificationService.notifications_db) + 1}"

            notification = {
                'id': notification_id,
                'title': data.get('title'),
                'message': data.get('message'),
                'type': data.get('type', NotificationType.INFO),
                'priority': data.get('priority', NotificationPriority.MEDIUM),
                'category': data.get('category', NotificationCategory.SYSTEM),
                'channels': data.get('channels', [NotificationChannel.IN_APP]),
                'recipients': data.get('recipients', []),
                'data': data.get('data', {}),
                'read': False,
                'sent': False,
                'created_at': datetime.now().isoformat(),
                'scheduled_at': data.get('scheduled_at'),
                'expires_at': data.get('expires_at'),
                'action_url': data.get('action_url'),
                'icon': data.get('icon'),
                'sound': data.get('sound', True)
            }

            NotificationService.notifications_db[notification_id] = notification

            # محاولة الإرسال مباشرة
            if not notification['scheduled_at']:
                NotificationService._send_notification(notification_id)

            return notification

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def _send_notification(notification_id: str) -> bool:
        """إرسال الإشعار عبر القنوات المحددة"""
        try:
            notification = NotificationService.notifications_db.get(notification_id)
            if not notification:
                return False

            channels = notification['channels']
            recipients = notification['recipients']

            # إرسال عبر القنوات
            for channel in channels:
                if channel == NotificationChannel.IN_APP:
                    # الإشعارات داخل التطبيق تُحفظ فقط
                    pass

                elif channel == NotificationChannel.EMAIL:
                    # إرسال عبر Email
                    for recipient in recipients:
                        NotificationService._send_email(
                            to=recipient,
                            subject=notification['title'],
                            body=notification['message']
                        )

                elif channel == NotificationChannel.SMS:
                    # إرسال عبر SMS
                    for recipient in recipients:
                        NotificationService._send_sms(
                            to=recipient,
                            message=notification['message']
                        )

                elif channel == NotificationChannel.PUSH:
                    # إرسال Push Notification
                    for recipient in recipients:
                        NotificationService._send_push(
                            user_id=recipient,
                            title=notification['title'],
                            body=notification['message']
                        )

            # تحديث حالة الإرسال
            notification['sent'] = True
            notification['sent_at'] = datetime.now().isoformat()

            return True

        except Exception as e:
            print(f"Error sending notification: {e}")
            return False

    @staticmethod
    def _send_email(to: str, subject: str, body: str) -> bool:
        """إرسال بريد إلكتروني (نسخة تجريبية)"""
        # TODO: Integrate with SMTP or Email service
        print(f"[EMAIL] To: {to}, Subject: {subject}")
        return True

    @staticmethod
    def _send_sms(to: str, message: str) -> bool:
        """إرسال SMS (نسخة تجريبية)"""
        # TODO: Integrate with Twilio or SMS gateway
        print(f"[SMS] To: {to}, Message: {message}")
        return True

    @staticmethod
    def _send_push(user_id: str, title: str, body: str) -> bool:
        """إرسال Push Notification (نسخة تجريبية)"""
        # TODO: Integrate with Firebase Cloud Messaging or similar
        print(f"[PUSH] User: {user_id}, Title: {title}")
        return True

    @staticmethod
    def get_notifications(user_id: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """الحصول على إشعارات المستخدم"""
        try:
            filters = filters or {}
            notifications = []

            for notif in NotificationService.notifications_db.values():
                # تصفية حسب المستخدم
                if user_id not in notif['recipients'] and 'all' not in notif['recipients']:
                    continue

                # تطبيق الفلاتر
                if filters.get('read') is not None and notif['read'] != filters['read']:
                    continue

                if filters.get('type') and notif['type'] != filters['type']:
                    continue

                if filters.get('category') and notif['category'] != filters['category']:
                    continue

                if filters.get('priority') and notif['priority'] != filters['priority']:
                    continue

                notifications.append(notif)

            # ترتيب حسب الأحدث
            notifications.sort(key=lambda x: x['created_at'], reverse=True)

            return notifications

        except Exception as e:
            return []

    @staticmethod
    def mark_as_read(notification_id: str, user_id: str) -> bool:
        """تحديد إشعار كمقروء"""
        try:
            notification = NotificationService.notifications_db.get(notification_id)
            if not notification:
                return False

            # تحقق من أن المستخدم من المستلمين
            if user_id not in notification['recipients'] and 'all' not in notification['recipients']:
                return False

            notification['read'] = True
            notification['read_at'] = datetime.now().isoformat()

            return True

        except Exception as e:
            return False

    @staticmethod
    def mark_all_as_read(user_id: str) -> int:
        """تحديد جميع الإشعارات كمقروءة"""
        try:
            count = 0
            for notif in NotificationService.notifications_db.values():
                if user_id in notif['recipients'] or 'all' in notif['recipients']:
                    if not notif['read']:
                        notif['read'] = True
                        notif['read_at'] = datetime.now().isoformat()
                        count += 1

            return count

        except Exception as e:
            return 0

    @staticmethod
    def delete_notification(notification_id: str, user_id: str) -> bool:
        """حذف إشعار"""
        try:
            notification = NotificationService.notifications_db.get(notification_id)
            if not notification:
                return False

            # تحقق من الصلاحية
            if user_id not in notification['recipients'] and 'all' not in notification['recipients']:
                return False

            del NotificationService.notifications_db[notification_id]
            return True

        except Exception as e:
            return False

    @staticmethod
    def create_rule(rule_data: Dict[str, Any]) -> Dict[str, Any]:
        """إنشاء قاعدة إشعارات تلقائية"""
        try:
            rule_id = f"rule_{len(NotificationService.rules_db) + 1}"

            rule = {
                'id': rule_id,
                'name': rule_data.get('name'),
                'description': rule_data.get('description'),
                'trigger': rule_data.get('trigger'),  # event, schedule, condition
                'conditions': rule_data.get('conditions', []),
                'notification_template': rule_data.get('notification_template'),
                'channels': rule_data.get('channels', [NotificationChannel.IN_APP]),
                'recipients': rule_data.get('recipients', []),
                'priority': rule_data.get('priority', NotificationPriority.MEDIUM),
                'active': rule_data.get('active', True),
                'created_at': datetime.now().isoformat(),
                'created_by': rule_data.get('created_by')
            }

            NotificationService.rules_db[rule_id] = rule

            return rule

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def evaluate_rules(event: str, data: Dict[str, Any]) -> List[str]:
        """تقييم القواعد وإنشاء الإشعارات"""
        try:
            triggered_rules = []

            for rule_id, rule in NotificationService.rules_db.items():
                if not rule['active']:
                    continue

                # تحقق من المحفز
                if rule['trigger'] == event:
                    # تقييم الشروط
                    conditions_met = NotificationService._evaluate_conditions(
                        rule['conditions'],
                        data
                    )

                    if conditions_met:
                        # إنشاء إشعار
                        template = rule['notification_template']
                        notification_data = {
                            'title': template.get('title', '').format(**data),
                            'message': template.get('message', '').format(**data),
                            'type': template.get('type', NotificationType.INFO),
                            'priority': rule['priority'],
                            'channels': rule['channels'],
                            'recipients': rule['recipients'],
                            'data': data
                        }

                        NotificationService.create_notification(notification_data)
                        triggered_rules.append(rule_id)

            return triggered_rules

        except Exception as e:
            return []

    @staticmethod
    def _evaluate_conditions(conditions: List[Dict], data: Dict) -> bool:
        """تقييم الشروط"""
        if not conditions:
            return True

        for condition in conditions:
            field = condition.get('field')
            operator = condition.get('operator')
            value = condition.get('value')

            if field not in data:
                return False

            data_value = data[field]

            if operator == 'equals' and data_value != value:
                return False
            elif operator == 'greater_than' and data_value <= value:
                return False
            elif operator == 'less_than' and data_value >= value:
                return False
            elif operator == 'contains' and value not in str(data_value):
                return False

        return True

    @staticmethod
    def get_user_preferences(user_id: str) -> Dict[str, Any]:
        """الحصول على تفضيلات المستخدم"""
        default_preferences = {
            'user_id': user_id,
            'channels': {
                'in_app': True,
                'email': True,
                'sms': False,
                'push': True
            },
            'categories': {
                'system': True,
                'sales': True,
                'inventory': True,
                'hr': True,
                'finance': True,
                'security': True,
                'custom': True
            },
            'quiet_hours': {
                'enabled': False,
                'start': '22:00',
                'end': '08:00'
            },
            'sound': True,
            'vibration': True
        }

        return NotificationService.preferences_db.get(user_id, default_preferences)

    @staticmethod
    def update_user_preferences(user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """تحديث تفضيلات المستخدم"""
        try:
            current = NotificationService.get_user_preferences(user_id)

            # دمج التفضيلات الجديدة
            if 'channels' in preferences:
                current['channels'].update(preferences['channels'])

            if 'categories' in preferences:
                current['categories'].update(preferences['categories'])

            if 'quiet_hours' in preferences:
                current['quiet_hours'].update(preferences['quiet_hours'])

            if 'sound' in preferences:
                current['sound'] = preferences['sound']

            if 'vibration' in preferences:
                current['vibration'] = preferences['vibration']

            NotificationService.preferences_db[user_id] = current

            return current

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def get_statistics(user_id: Optional[str] = None) -> Dict[str, Any]:
        """إحصائيات الإشعارات"""
        try:
            notifications = list(NotificationService.notifications_db.values())

            # تصفية حسب المستخدم
            if user_id:
                notifications = [
                    n for n in notifications
                    if user_id in n['recipients'] or 'all' in n['recipients']
                ]

            total = len(notifications)
            read = len([n for n in notifications if n['read']])
            unread = total - read

            by_type = {}
            by_priority = {}
            by_category = {}

            for notif in notifications:
                # حسب النوع
                ntype = notif['type']
                by_type[ntype] = by_type.get(ntype, 0) + 1

                # حسب الأولوية
                priority = notif['priority']
                by_priority[priority] = by_priority.get(priority, 0) + 1

                # حسب الفئة
                category = notif['category']
                by_category[category] = by_category.get(category, 0) + 1

            return {
                'total': total,
                'read': read,
                'unread': unread,
                'by_type': by_type,
                'by_priority': by_priority,
                'by_category': by_category
            }

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def send_bulk_notification(data: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال إشعار جماعي"""
        try:
            recipients = data.get('recipients', [])

            notification_data = {
                'title': data.get('title'),
                'message': data.get('message'),
                'type': data.get('type', NotificationType.INFO),
                'priority': data.get('priority', NotificationPriority.MEDIUM),
                'category': data.get('category', NotificationCategory.SYSTEM),
                'channels': data.get('channels', [NotificationChannel.IN_APP]),
                'recipients': recipients,
                'data': data.get('data', {})
            }

            notification = NotificationService.create_notification(notification_data)

            return {
                'notification_id': notification['id'],
                'recipients_count': len(recipients),
                'status': 'sent'
            }

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def get_notification_templates() -> List[Dict[str, Any]]:
        """الحصول على قوالب الإشعارات"""
        default_templates = [
            {
                'id': 'low_stock',
                'name': 'تنبيه مخزون منخفض',
                'category': NotificationCategory.INVENTORY,
                'template': {
                    'title': 'تنبيه: مخزون منخفض',
                    'message': 'المنتج {product_name} وصل إلى الحد الأدنى ({quantity} وحدة)',
                    'type': NotificationType.WARNING,
                    'priority': NotificationPriority.HIGH
                }
            },
            {
                'id': 'new_sale',
                'name': 'عملية بيع جديدة',
                'category': NotificationCategory.SALES,
                'template': {
                    'title': 'عملية بيع جديدة',
                    'message': 'تم إتمام عملية بيع بقيمة {amount} ر.س',
                    'type': NotificationType.SUCCESS,
                    'priority': NotificationPriority.MEDIUM
                }
            },
            {
                'id': 'payment_received',
                'name': 'استلام دفعة',
                'category': NotificationCategory.FINANCE,
                'template': {
                    'title': 'تم استلام دفعة',
                    'message': 'تم استلام دفعة بقيمة {amount} ر.س من {customer_name}',
                    'type': NotificationType.SUCCESS,
                    'priority': NotificationPriority.MEDIUM
                }
            },
            {
                'id': 'employee_absence',
                'name': 'غياب موظف',
                'category': NotificationCategory.HR,
                'template': {
                    'title': 'غياب موظف',
                    'message': 'الموظف {employee_name} غائب اليوم',
                    'type': NotificationType.WARNING,
                    'priority': NotificationPriority.MEDIUM
                }
            },
            {
                'id': 'security_alert',
                'name': 'تنبيه أمني',
                'category': NotificationCategory.SECURITY,
                'template': {
                    'title': 'تنبيه أمني',
                    'message': '{alert_message}',
                    'type': NotificationType.CRITICAL,
                    'priority': NotificationPriority.URGENT
                }
            }
        ]

        return list(NotificationService.templates_db.values()) + default_templates
