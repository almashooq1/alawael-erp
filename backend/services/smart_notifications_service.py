"""
🔔 Smart Notifications Service
نظام الإشعارات الذكية المتقدمة

القنوات المدعومة:
1. البريد الإلكتروني
2. SMS
3. Push Notifications
4. In-App Notifications
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class NotificationType(Enum):
    """أنواع الإشعارات"""
    ALERT = "alert"
    INFO = "info"
    WARNING = "warning"
    SUCCESS = "success"
    ERROR = "error"
    REMINDER = "reminder"


class NotificationChannel(Enum):
    """قنوات الإشعارات"""
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"


class SmartNotificationsService:
    """خدمة الإشعارات الذكية المتقدمة"""

    def __init__(self, db, email_config=None, sms_config=None):
        self.db = db
        self.email_config = email_config
        self.sms_config = sms_config
        self.notification_templates = {}
        self._load_templates()

    # ==========================================
    # 1. إرسال الإشعارات
    # ==========================================

    def send_notification(self, notification_config: Dict) -> Dict:
        """
        إرسال إشعار فوري

        Args:
            notification_config: إعدادات الإشعار
                - user_id: معرف المستخدم
                - type: نوع الإشعار
                - title: العنوان
                - message: الرسالة
                - channels: القنوات المطلوبة
                - priority: الأولوية

        Returns:
            Dict: تفاصيل الإرسال
        """

        notification_id = self._generate_notification_id()
        user = self.db['users'].find_one({'_id': notification_config.get('user_id')})

        if not user:
            return {'status': 'failed', 'reason': 'User not found'}

        # الحصول على تفضيلات الإشعارات
        preferences = self._get_notification_preferences(user['_id'])

        # تحديد القنوات المتاحة
        channels = self._determine_channels(notification_config, preferences)

        # إرسال عبر كل قناة
        results = {}
        for channel in channels:
            if channel == NotificationChannel.EMAIL:
                results['email'] = self._send_email_notification(
                    user,
                    notification_config
                )
            elif channel == NotificationChannel.SMS:
                results['sms'] = self._send_sms_notification(
                    user,
                    notification_config
                )
            elif channel == NotificationChannel.PUSH:
                results['push'] = self._send_push_notification(
                    user,
                    notification_config
                )
            elif channel == NotificationChannel.IN_APP:
                results['in_app'] = self._save_in_app_notification(
                    user,
                    notification_config
                )

        # حفظ سجل الإشعار
        notification_log = {
            'id': notification_id,
            'user_id': user['_id'],
            'type': notification_config.get('type'),
            'title': notification_config.get('title'),
            'message': notification_config.get('message'),
            'channels': list(channels),
            'results': results,
            'status': 'sent' if any(r.get('status') == 'success' for r in results.values()) else 'failed',
            'created_at': datetime.now().isoformat()
        }

        self.db['notifications'].insert_one(notification_log)

        return {
            'notification_id': notification_id,
            'status': notification_log['status'],
            'results': results
        }

    # ==========================================
    # 2. الإشعارات عبر البريد الإلكتروني
    # ==========================================

    def _send_email_notification(self, user: Dict,
                                notification_config: Dict) -> Dict:
        """إرسال إشعار عبر البريد الإلكتروني"""

        try:
            # الحصول على القالب المناسب
            template = self._get_email_template(
                notification_config.get('type')
            )

            # تحضير البريد
            email_content = self._render_email_template(
                template,
                {
                    'user_name': user.get('name'),
                    'title': notification_config.get('title'),
                    'message': notification_config.get('message'),
                    'action_url': notification_config.get('action_url'),
                    'company_name': 'Alawael System'
                }
            )

            # إنشاء رسالة البريد
            msg = MIMEMultipart('alternative')
            msg['Subject'] = notification_config.get('title')
            msg['From'] = self.email_config.get('sender')
            msg['To'] = user.get('email')

            # إضافة الجسم
            part1 = MIMEText(email_content['text'], 'plain', 'utf-8')
            part2 = MIMEText(email_content['html'], 'html', 'utf-8')

            msg.attach(part1)
            msg.attach(part2)

            # إرسال
            server = smtplib.SMTP(
                self.email_config.get('smtp_server'),
                self.email_config.get('smtp_port')
            )
            server.starttls()
            server.login(
                self.email_config.get('username'),
                self.email_config.get('password')
            )
            server.send_message(msg)
            server.quit()

            return {
                'status': 'success',
                'channel': 'email',
                'sent_to': user.get('email'),
                'sent_at': datetime.now().isoformat()
            }

        except Exception as e:
            return {
                'status': 'failed',
                'channel': 'email',
                'error': str(e)
            }

    # ==========================================
    # 3. الإشعارات عبر SMS
    # ==========================================

    def _send_sms_notification(self, user: Dict,
                              notification_config: Dict) -> Dict:
        """إرسال إشعار عبر SMS"""

        try:
            # التحقق من رقم الهاتف
            phone = user.get('phone')
            if not phone:
                return {
                    'status': 'failed',
                    'channel': 'sms',
                    'reason': 'Phone number not available'
                }

            # تجهيز الرسالة
            message = self._format_sms_message(notification_config)

            # إرسال عبر خدمة SMS (مثل Twilio)
            # هذا مثال - يمكن استبداله بخدمة فعلية
            result = self._send_sms_via_provider(phone, message)

            if result.get('status') == 'success':
                return {
                    'status': 'success',
                    'channel': 'sms',
                    'sent_to': phone,
                    'sent_at': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'failed',
                    'channel': 'sms',
                    'error': result.get('error')
                }

        except Exception as e:
            return {
                'status': 'failed',
                'channel': 'sms',
                'error': str(e)
            }

    # ==========================================
    # 4. الإشعارات عبر Push
    # ==========================================

    def _send_push_notification(self, user: Dict,
                               notification_config: Dict) -> Dict:
        """إرسال إشعار Push"""

        try:
            # الحصول على أجهزة المستخدم
            devices = self.db['user_devices'].find({
                'user_id': user['_id'],
                'push_enabled': True
            })

            results = []
            for device in devices:
                # إرسال إلى كل جهاز
                result = self._send_push_to_device(
                    device,
                    notification_config
                )
                results.append(result)

            success_count = sum(1 for r in results if r.get('status') == 'success')

            return {
                'status': 'success' if success_count > 0 else 'failed',
                'channel': 'push',
                'devices_targeted': len(list(devices)),
                'devices_succeeded': success_count,
                'sent_at': datetime.now().isoformat()
            }

        except Exception as e:
            return {
                'status': 'failed',
                'channel': 'push',
                'error': str(e)
            }

    # ==========================================
    # 5. الإشعارات داخل التطبيق
    # ==========================================

    def _save_in_app_notification(self, user: Dict,
                                 notification_config: Dict) -> Dict:
        """حفظ إشعار داخل التطبيق"""

        try:
            in_app_notification = {
                'user_id': user['_id'],
                'type': notification_config.get('type'),
                'title': notification_config.get('title'),
                'message': notification_config.get('message'),
                'icon': notification_config.get('icon'),
                'action_url': notification_config.get('action_url'),
                'read': False,
                'priority': notification_config.get('priority', 'normal'),
                'created_at': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(days=30)).isoformat()
            }

            self.db['in_app_notifications'].insert_one(in_app_notification)

            return {
                'status': 'success',
                'channel': 'in_app',
                'saved_at': datetime.now().isoformat()
            }

        except Exception as e:
            return {
                'status': 'failed',
                'channel': 'in_app',
                'error': str(e)
            }

    # ==========================================
    # 6. جدولة الإشعارات
    # ==========================================

    def schedule_notification(self, notification_config: Dict,
                             send_time: str) -> Dict:
        """
        جدولة إشعار للإرسال في وقت محدد

        Args:
            notification_config: إعدادات الإشعار
            send_time: الوقت المطلوب (ISO format)

        Returns:
            Dict: معلومات الجدولة
        """

        schedule = {
            'id': self._generate_schedule_id(),
            'notification_config': notification_config,
            'scheduled_for': send_time,
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }

        self.db['scheduled_notifications'].insert_one(schedule)

        return {
            'schedule_id': schedule['id'],
            'status': 'scheduled',
            'scheduled_for': send_time
        }

    def schedule_recurring_notification(self, notification_config: Dict,
                                       frequency: str,
                                       start_time: str,
                                       end_time: Optional[str] = None) -> Dict:
        """
        جدولة إشعار متكرر

        Args:
            notification_config: إعدادات الإشعار
            frequency: التكرار (daily, weekly, monthly)
            start_time: وقت البدء
            end_time: وقت الانتهاء (اختياري)

        Returns:
            Dict: معلومات الجدولة المتكررة
        """

        recurring_schedule = {
            'id': self._generate_schedule_id(),
            'notification_config': notification_config,
            'frequency': frequency,
            'start_time': start_time,
            'end_time': end_time,
            'is_active': True,
            'created_at': datetime.now().isoformat()
        }

        self.db['recurring_notifications'].insert_one(recurring_schedule)

        return {
            'schedule_id': recurring_schedule['id'],
            'status': 'active',
            'frequency': frequency
        }

    # ==========================================
    # 7. إدارة التفضيلات
    # ==========================================

    def set_notification_preferences(self, user_id: str,
                                    preferences: Dict) -> Dict:
        """
        تعيين تفضيلات الإشعارات للمستخدم

        Args:
            user_id: معرف المستخدم
            preferences: التفضيلات
                - email_enabled
                - sms_enabled
                - push_enabled
                - quiet_hours (مثل {'start': '22:00', 'end': '08:00'})
                - notification_types (أنواع الإشعارات المفضلة)
        """

        user_preferences = {
            'user_id': user_id,
            'email_enabled': preferences.get('email_enabled', True),
            'sms_enabled': preferences.get('sms_enabled', True),
            'push_enabled': preferences.get('push_enabled', True),
            'in_app_enabled': preferences.get('in_app_enabled', True),
            'quiet_hours': preferences.get('quiet_hours'),
            'notification_types': preferences.get('notification_types', []),
            'updated_at': datetime.now().isoformat()
        }

        self.db['notification_preferences'].update_one(
            {'user_id': user_id},
            {'$set': user_preferences},
            upsert=True
        )

        return {
            'status': 'success',
            'message': 'Preferences updated'
        }

    def get_notification_preferences(self, user_id: str) -> Dict:
        """الحصول على تفضيلات الإشعارات"""
        return self._get_notification_preferences(user_id)

    # ==========================================
    # 8. تقارير الإشعارات
    # ==========================================

    def get_notification_history(self, user_id: str,
                                limit: int = 50) -> List[Dict]:
        """
        الحصول على سجل الإشعارات

        Args:
            user_id: معرف المستخدم
            limit: حد أقصى للنتائج

        Returns:
            List: قائمة الإشعارات
        """

        notifications = list(
            self.db['notifications'].find(
                {'user_id': user_id}
            ).sort('created_at', -1).limit(limit)
        )

        return notifications

    def get_notification_stats(self, user_id: str,
                              date_from: str,
                              date_to: str) -> Dict:
        """الحصول على إحصائيات الإشعارات"""

        notifications = list(
            self.db['notifications'].find({
                'user_id': user_id,
                'created_at': {
                    '$gte': date_from,
                    '$lte': date_to
                }
            })
        )

        stats = {
            'total': len(notifications),
            'by_type': {},
            'by_channel': {},
            'success_rate': 0
        }

        for notif in notifications:
            # حسب النوع
            notif_type = notif.get('type')
            stats['by_type'][notif_type] = stats['by_type'].get(notif_type, 0) + 1

            # حسب القناة
            for channel in notif.get('channels', []):
                stats['by_channel'][channel] = stats['by_channel'].get(channel, 0) + 1

        # معدل النجاح
        if notifications:
            success = sum(1 for n in notifications if n.get('status') == 'sent')
            stats['success_rate'] = (success / len(notifications)) * 100

        return stats

    # ==========================================
    # Helper Methods
    # ==========================================

    def _load_templates(self):
        """تحميل قوالب الإشعارات"""
        self.notification_templates = {
            'student_progress': {
                'subject': 'تحديث تقدم الطالب',
                'body': 'لديك تحديث جديد بخصوص تقدم الطالب {student_name}'
            },
            'new_assignment': {
                'subject': 'واجب جديد',
                'body': 'تم إضافة واجب جديد'
            },
            'schedule_reminder': {
                'subject': 'تذكير الموعد',
                'body': 'لديك موعد في {time}'
            }
        }

    def _get_notification_preferences(self, user_id: str) -> Dict:
        """الحصول على تفضيلات الإشعارات"""
        prefs = self.db['notification_preferences'].find_one({'user_id': user_id})

        if not prefs:
            prefs = {
                'email_enabled': True,
                'sms_enabled': True,
                'push_enabled': True,
                'in_app_enabled': True
            }

        return prefs

    def _determine_channels(self, config: Dict,
                           preferences: Dict) -> List[NotificationChannel]:
        """تحديد القنوات المتاحة"""
        channels = []
        requested = config.get('channels', ['email', 'in_app'])

        if 'email' in requested and preferences.get('email_enabled'):
            channels.append(NotificationChannel.EMAIL)
        if 'sms' in requested and preferences.get('sms_enabled'):
            channels.append(NotificationChannel.SMS)
        if 'push' in requested and preferences.get('push_enabled'):
            channels.append(NotificationChannel.PUSH)
        if 'in_app' in requested and preferences.get('in_app_enabled'):
            channels.append(NotificationChannel.IN_APP)

        return channels

    def _generate_notification_id(self) -> str:
        """توليد معرف الإشعار"""
        return f"NOTIF_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def _generate_schedule_id(self) -> str:
        """توليد معرف الجدولة"""
        return f"SCHED_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def _get_email_template(self, notification_type: str) -> Dict:
        """الحصول على قالب البريد الإلكتروني"""
        return self.notification_templates.get(
            notification_type,
            {'subject': 'تنبيه', 'body': 'لديك تنبيه جديد'}
        )

    def _render_email_template(self, template: Dict, data: Dict) -> Dict:
        """تصيير قالب البريد"""
        return {
            'text': template.get('body'),
            'html': f"<html><body>{template.get('body')}</body></html>"
        }

    def _format_sms_message(self, notification_config: Dict) -> str:
        """تنسيق رسالة SMS"""
        return f"{notification_config.get('title')}: {notification_config.get('message')}"[:160]

    def _send_sms_via_provider(self, phone: str, message: str) -> Dict:
        """إرسال SMS عبر مزود الخدمة"""
        # يمكن تنفيذ التكامل مع Twilio أو خدمة أخرى
        return {'status': 'success'}

    def _send_push_to_device(self, device: Dict,
                            notification_config: Dict) -> Dict:
        """إرسال Push إلى جهاز محدد"""
        # يمكن تنفيذ التكامل مع Firebase أو خدمة أخرى
        return {'status': 'success'}
