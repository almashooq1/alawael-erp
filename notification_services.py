"""
نظام الإشعارات التلقائية المتقدم
Advanced Automatic Notification System
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from enum import Enum
import threading
import time
from flask import current_app
from sqlalchemy import and_, or_
from models import db, User
from automation_models import AutomationLog, WorkflowExecution, ScheduledMessage
from integration_services import CommunicationService

# إعداد التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NotificationType(Enum):
    """أنواع الإشعارات"""
    WORKFLOW_STARTED = "workflow_started"
    WORKFLOW_COMPLETED = "workflow_completed"
    WORKFLOW_FAILED = "workflow_failed"
    ACTION_FAILED = "action_failed"
    SYSTEM_ERROR = "system_error"
    SYSTEM_WARNING = "system_warning"
    SCHEDULED_MESSAGE_SENT = "scheduled_message_sent"
    SCHEDULED_MESSAGE_FAILED = "scheduled_message_failed"
    RULE_TRIGGERED = "rule_triggered"
    ENGINE_STARTED = "engine_started"
    ENGINE_STOPPED = "engine_stopped"
    HIGH_FAILURE_RATE = "high_failure_rate"
    RESOURCE_USAGE = "resource_usage"

class NotificationPriority(Enum):
    """أولويات الإشعارات"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4
    URGENT = 5

class NotificationChannel(Enum):
    """قنوات الإشعارات"""
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    PUSH = "push"
    SYSTEM = "system"
    WEBHOOK = "webhook"

class NotificationService:
    """خدمة الإشعارات الرئيسية"""
    
    def __init__(self):
        self.communication_service = CommunicationService()
        self.notification_rules = {}
        self.subscribers = {}
        self.notification_queue = []
        self.processing_thread = None
        self.is_running = False
        self.load_notification_rules()
        
    def start_service(self):
        """بدء خدمة الإشعارات"""
        if not self.is_running:
            self.is_running = True
            self.processing_thread = threading.Thread(target=self._process_notifications)
            self.processing_thread.daemon = True
            self.processing_thread.start()
            logger.info("تم بدء خدمة الإشعارات")
    
    def stop_service(self):
        """إيقاف خدمة الإشعارات"""
        self.is_running = False
        if self.processing_thread:
            self.processing_thread.join()
        logger.info("تم إيقاف خدمة الإشعارات")
    
    def load_notification_rules(self):
        """تحميل قواعد الإشعارات"""
        # قواعد الإشعارات الافتراضية
        self.notification_rules = {
            NotificationType.WORKFLOW_FAILED.value: {
                'enabled': True,
                'priority': NotificationPriority.HIGH.value,
                'channels': [NotificationChannel.EMAIL.value, NotificationChannel.PUSH.value],
                'template': 'فشل في تنفيذ سير العمل: {workflow_name}',
                'recipients': ['admin', 'workflow_managers']
            },
            NotificationType.SYSTEM_ERROR.value: {
                'enabled': True,
                'priority': NotificationPriority.CRITICAL.value,
                'channels': [NotificationChannel.EMAIL.value, NotificationChannel.SMS.value],
                'template': 'خطأ في النظام: {error_message}',
                'recipients': ['admin', 'technical_team']
            },
            NotificationType.HIGH_FAILURE_RATE.value: {
                'enabled': True,
                'priority': NotificationPriority.URGENT.value,
                'channels': [NotificationChannel.EMAIL.value, NotificationChannel.SMS.value, NotificationChannel.PUSH.value],
                'template': 'معدل فشل عالي في النظام: {failure_rate}%',
                'recipients': ['admin', 'technical_team', 'management']
            },
            NotificationType.WORKFLOW_COMPLETED.value: {
                'enabled': True,
                'priority': NotificationPriority.LOW.value,
                'channels': [NotificationChannel.SYSTEM.value],
                'template': 'تم إكمال سير العمل: {workflow_name}',
                'recipients': ['workflow_managers']
            },
            NotificationType.SCHEDULED_MESSAGE_FAILED.value: {
                'enabled': True,
                'priority': NotificationPriority.MEDIUM.value,
                'channels': [NotificationChannel.EMAIL.value],
                'template': 'فشل في إرسال الرسالة المجدولة: {message_subject}',
                'recipients': ['communication_team']
            }
        }
    
    def subscribe(self, user_id: int, notification_types: List[str], channels: List[str]):
        """اشتراك مستخدم في إشعارات معينة"""
        if user_id not in self.subscribers:
            self.subscribers[user_id] = {}
        
        for notification_type in notification_types:
            self.subscribers[user_id][notification_type] = channels
        
        logger.info(f"تم اشتراك المستخدم {user_id} في الإشعارات")
    
    def unsubscribe(self, user_id: int, notification_types: List[str] = None):
        """إلغاء اشتراك مستخدم من إشعارات معينة"""
        if user_id not in self.subscribers:
            return
        
        if notification_types is None:
            # إلغاء جميع الاشتراكات
            del self.subscribers[user_id]
        else:
            for notification_type in notification_types:
                if notification_type in self.subscribers[user_id]:
                    del self.subscribers[user_id][notification_type]
        
        logger.info(f"تم إلغاء اشتراك المستخدم {user_id} من الإشعارات")
    
    def send_notification(self, notification_type: str, data: Dict[str, Any], 
                         recipients: List[str] = None, priority: int = None):
        """إرسال إشعار"""
        try:
            # التحقق من تفعيل نوع الإشعار
            rule = self.notification_rules.get(notification_type)
            if not rule or not rule.get('enabled', False):
                return
            
            # إنشاء الإشعار
            notification = {
                'id': f"notif_{int(time.time() * 1000)}",
                'type': notification_type,
                'priority': priority or rule.get('priority', NotificationPriority.MEDIUM.value),
                'data': data,
                'recipients': recipients or rule.get('recipients', []),
                'channels': rule.get('channels', [NotificationChannel.SYSTEM.value]),
                'template': rule.get('template', ''),
                'created_at': datetime.utcnow(),
                'attempts': 0,
                'max_attempts': 3
            }
            
            # إضافة الإشعار إلى قائمة الانتظار
            self.notification_queue.append(notification)
            
            logger.info(f"تم إضافة إشعار جديد: {notification_type}")
            
        except Exception as e:
            logger.error(f"خطأ في إنشاء الإشعار: {str(e)}")
    
    def _process_notifications(self):
        """معالجة قائمة انتظار الإشعارات"""
        while self.is_running:
            try:
                if self.notification_queue:
                    notification = self.notification_queue.pop(0)
                    self._send_notification(notification)
                else:
                    time.sleep(1)  # انتظار ثانية واحدة إذا لم توجد إشعارات
                    
            except Exception as e:
                logger.error(f"خطأ في معالجة الإشعارات: {str(e)}")
                time.sleep(5)
    
    def _send_notification(self, notification: Dict[str, Any]):
        """إرسال إشعار واحد"""
        try:
            notification['attempts'] += 1
            
            # تحضير محتوى الإشعار
            message = self._prepare_message(notification)
            
            # إرسال عبر القنوات المختلفة
            success = False
            for channel in notification['channels']:
                try:
                    if channel == NotificationChannel.EMAIL.value:
                        success = self._send_email_notification(notification, message)
                    elif channel == NotificationChannel.SMS.value:
                        success = self._send_sms_notification(notification, message)
                    elif channel == NotificationChannel.WHATSAPP.value:
                        success = self._send_whatsapp_notification(notification, message)
                    elif channel == NotificationChannel.PUSH.value:
                        success = self._send_push_notification(notification, message)
                    elif channel == NotificationChannel.SYSTEM.value:
                        success = self._send_system_notification(notification, message)
                    elif channel == NotificationChannel.WEBHOOK.value:
                        success = self._send_webhook_notification(notification, message)
                    
                    if success:
                        break  # إذا نجح الإرسال عبر قناة واحدة، توقف
                        
                except Exception as e:
                    logger.error(f"خطأ في إرسال الإشعار عبر {channel}: {str(e)}")
            
            # إعادة المحاولة إذا فشل الإرسال
            if not success and notification['attempts'] < notification['max_attempts']:
                # إضافة تأخير قبل إعادة المحاولة
                time.sleep(notification['attempts'] * 30)  # 30 ثانية، دقيقة، دقيقة ونصف
                self.notification_queue.append(notification)
            elif not success:
                logger.error(f"فشل في إرسال الإشعار نهائياً: {notification['id']}")
            else:
                logger.info(f"تم إرسال الإشعار بنجاح: {notification['id']}")
                
        except Exception as e:
            logger.error(f"خطأ في إرسال الإشعار: {str(e)}")
    
    def _prepare_message(self, notification: Dict[str, Any]) -> str:
        """تحضير محتوى الرسالة"""
        template = notification.get('template', '')
        data = notification.get('data', {})
        
        # استبدال المتغيرات في القالب
        message = template
        for key, value in data.items():
            message = message.replace(f'{{{key}}}', str(value))
        
        # إضافة معلومات إضافية
        message += f"\n\nالوقت: {notification['created_at'].strftime('%Y-%m-%d %H:%M:%S')}"
        message += f"\nالأولوية: {self._get_priority_text(notification['priority'])}"
        
        return message
    
    def _send_email_notification(self, notification: Dict[str, Any], message: str) -> bool:
        """إرسال إشعار عبر البريد الإلكتروني"""
        try:
            recipients = self._get_recipient_emails(notification['recipients'])
            
            for email in recipients:
                result = self.communication_service.send_email(
                    email=email,
                    subject=f"إشعار النظام - {self._get_notification_title(notification['type'])}",
                    message=message
                )
                if not result.get('success'):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"خطأ في إرسال الإشعار عبر البريد الإلكتروني: {str(e)}")
            return False
    
    def _send_sms_notification(self, notification: Dict[str, Any], message: str) -> bool:
        """إرسال إشعار عبر الرسائل النصية"""
        try:
            recipients = self._get_recipient_phones(notification['recipients'])
            
            # تقصير الرسالة للرسائل النصية
            short_message = message[:160] + "..." if len(message) > 160 else message
            
            for phone in recipients:
                result = self.communication_service.send_sms(
                    phone=phone,
                    message=short_message
                )
                if not result.get('success'):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"خطأ في إرسال الإشعار عبر الرسائل النصية: {str(e)}")
            return False
    
    def _send_whatsapp_notification(self, notification: Dict[str, Any], message: str) -> bool:
        """إرسال إشعار عبر واتساب"""
        try:
            recipients = self._get_recipient_phones(notification['recipients'])
            
            for phone in recipients:
                result = self.communication_service.send_whatsapp(
                    phone=phone,
                    message=message
                )
                if not result.get('success'):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"خطأ في إرسال الإشعار عبر واتساب: {str(e)}")
            return False
    
    def _send_push_notification(self, notification: Dict[str, Any], message: str) -> bool:
        """إرسال إشعار فوري"""
        try:
            recipients = self._get_recipient_user_ids(notification['recipients'])
            
            for user_id in recipients:
                result = self.communication_service.send_push_notification(
                    user_id=user_id,
                    title=self._get_notification_title(notification['type']),
                    message=message,
                    data={'notification_type': notification['type']}
                )
                if not result.get('success'):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"خطأ في إرسال الإشعار الفوري: {str(e)}")
            return False
    
    def _send_system_notification(self, notification: Dict[str, Any], message: str) -> bool:
        """إرسال إشعار داخل النظام"""
        try:
            # حفظ الإشعار في قاعدة البيانات للعرض في النظام
            # يمكن إنشاء جدول خاص بالإشعارات الداخلية
            
            # تسجيل الإشعار في سجل النظام
            log = AutomationLog(
                workflow_id=None,
                execution_id=None,
                event_type='system_notification',
                message=f"[{notification['type']}] {message}",
                timestamp=datetime.utcnow()
            )
            db.session.add(log)
            db.session.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"خطأ في إرسال الإشعار الداخلي: {str(e)}")
            return False
    
    def _send_webhook_notification(self, notification: Dict[str, Any], message: str) -> bool:
        """إرسال إشعار عبر webhook"""
        try:
            import requests
            
            # يمكن تخصيص URL الـ webhook حسب الحاجة
            webhook_urls = self._get_webhook_urls(notification['recipients'])
            
            payload = {
                'type': notification['type'],
                'priority': notification['priority'],
                'message': message,
                'data': notification['data'],
                'timestamp': notification['created_at'].isoformat()
            }
            
            for url in webhook_urls:
                response = requests.post(url, json=payload, timeout=10)
                if response.status_code != 200:
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"خطأ في إرسال الإشعار عبر webhook: {str(e)}")
            return False
    
    def _get_recipient_emails(self, recipients: List[str]) -> List[str]:
        """الحصول على عناوين البريد الإلكتروني للمستقبلين"""
        emails = []
        
        for recipient in recipients:
            if '@' in recipient:
                # بريد إلكتروني مباشر
                emails.append(recipient)
            else:
                # مجموعة أو دور
                group_emails = self._get_group_emails(recipient)
                emails.extend(group_emails)
        
        return list(set(emails))  # إزالة التكرار
    
    def _get_recipient_phones(self, recipients: List[str]) -> List[str]:
        """الحصول على أرقام الهواتف للمستقبلين"""
        phones = []
        
        for recipient in recipients:
            if recipient.startswith('+') or recipient.isdigit():
                # رقم هاتف مباشر
                phones.append(recipient)
            else:
                # مجموعة أو دور
                group_phones = self._get_group_phones(recipient)
                phones.extend(group_phones)
        
        return list(set(phones))  # إزالة التكرار
    
    def _get_recipient_user_ids(self, recipients: List[str]) -> List[int]:
        """الحصول على معرفات المستخدمين للمستقبلين"""
        user_ids = []
        
        for recipient in recipients:
            if recipient.isdigit():
                # معرف مستخدم مباشر
                user_ids.append(int(recipient))
            else:
                # مجموعة أو دور
                group_user_ids = self._get_group_user_ids(recipient)
                user_ids.extend(group_user_ids)
        
        return list(set(user_ids))  # إزالة التكرار
    
    def _get_group_emails(self, group: str) -> List[str]:
        """الحصول على عناوين البريد الإلكتروني لمجموعة"""
        # يمكن تخصيص هذا حسب هيكل المجموعات في النظام
        group_mappings = {
            'admin': ['admin@awail.com'],
            'technical_team': ['tech@awail.com', 'support@awail.com'],
            'workflow_managers': ['workflows@awail.com'],
            'communication_team': ['communications@awail.com'],
            'management': ['management@awail.com']
        }
        
        return group_mappings.get(group, [])
    
    def _get_group_phones(self, group: str) -> List[str]:
        """الحصول على أرقام الهواتف لمجموعة"""
        # يمكن تخصيص هذا حسب هيكل المجموعات في النظام
        group_mappings = {
            'admin': ['+966501234567'],
            'technical_team': ['+966501234568', '+966501234569'],
            'management': ['+966501234570']
        }
        
        return group_mappings.get(group, [])
    
    def _get_group_user_ids(self, group: str) -> List[int]:
        """الحصول على معرفات المستخدمين لمجموعة"""
        try:
            # البحث في قاعدة البيانات عن المستخدمين حسب الدور
            users = User.query.filter(User.role.contains(group)).all()
            return [user.id for user in users]
        except:
            return []
    
    def _get_webhook_urls(self, recipients: List[str]) -> List[str]:
        """الحصول على روابط webhook للمستقبلين"""
        # يمكن تخصيص هذا حسب الحاجة
        webhook_mappings = {
            'slack': 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
            'discord': 'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK',
            'teams': 'https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK'
        }
        
        urls = []
        for recipient in recipients:
            if recipient in webhook_mappings:
                urls.append(webhook_mappings[recipient])
        
        return urls
    
    def _get_notification_title(self, notification_type: str) -> str:
        """الحصول على عنوان الإشعار"""
        titles = {
            'workflow_started': 'بدء سير العمل',
            'workflow_completed': 'اكتمال سير العمل',
            'workflow_failed': 'فشل سير العمل',
            'action_failed': 'فشل الإجراء',
            'system_error': 'خطأ في النظام',
            'system_warning': 'تحذير النظام',
            'scheduled_message_sent': 'إرسال رسالة مجدولة',
            'scheduled_message_failed': 'فشل رسالة مجدولة',
            'rule_triggered': 'تفعيل قاعدة',
            'engine_started': 'بدء المحرك',
            'engine_stopped': 'إيقاف المحرك',
            'high_failure_rate': 'معدل فشل عالي',
            'resource_usage': 'استخدام الموارد'
        }
        
        return titles.get(notification_type, 'إشعار النظام')
    
    def _get_priority_text(self, priority: int) -> str:
        """الحصول على نص الأولوية"""
        priority_texts = {
            1: 'منخفضة',
            2: 'متوسطة',
            3: 'عالية',
            4: 'حرجة',
            5: 'عاجلة'
        }
        
        return priority_texts.get(priority, 'متوسطة')

# إنشاء مثيل عام من خدمة الإشعارات
notification_service = NotificationService()

class AutomationNotificationHandler:
    """معالج إشعارات الأتمتة"""
    
    def __init__(self):
        self.notification_service = notification_service
    
    def handle_workflow_started(self, workflow_id: int, workflow_name: str, execution_id: int):
        """معالجة بدء سير العمل"""
        self.notification_service.send_notification(
            NotificationType.WORKFLOW_STARTED.value,
            {
                'workflow_id': workflow_id,
                'workflow_name': workflow_name,
                'execution_id': execution_id
            }
        )
    
    def handle_workflow_completed(self, workflow_id: int, workflow_name: str, 
                                 execution_id: int, duration: int):
        """معالجة اكتمال سير العمل"""
        self.notification_service.send_notification(
            NotificationType.WORKFLOW_COMPLETED.value,
            {
                'workflow_id': workflow_id,
                'workflow_name': workflow_name,
                'execution_id': execution_id,
                'duration': duration
            }
        )
    
    def handle_workflow_failed(self, workflow_id: int, workflow_name: str, 
                              execution_id: int, error_message: str):
        """معالجة فشل سير العمل"""
        self.notification_service.send_notification(
            NotificationType.WORKFLOW_FAILED.value,
            {
                'workflow_id': workflow_id,
                'workflow_name': workflow_name,
                'execution_id': execution_id,
                'error_message': error_message
            }
        )
    
    def handle_action_failed(self, workflow_id: int, workflow_name: str, 
                            action_id: int, action_name: str, error_message: str):
        """معالجة فشل الإجراء"""
        self.notification_service.send_notification(
            NotificationType.ACTION_FAILED.value,
            {
                'workflow_id': workflow_id,
                'workflow_name': workflow_name,
                'action_id': action_id,
                'action_name': action_name,
                'error_message': error_message
            }
        )
    
    def handle_system_error(self, error_message: str, component: str = None):
        """معالجة خطأ النظام"""
        self.notification_service.send_notification(
            NotificationType.SYSTEM_ERROR.value,
            {
                'error_message': error_message,
                'component': component or 'unknown'
            }
        )
    
    def handle_high_failure_rate(self, failure_rate: float, time_period: str):
        """معالجة معدل الفشل العالي"""
        self.notification_service.send_notification(
            NotificationType.HIGH_FAILURE_RATE.value,
            {
                'failure_rate': failure_rate,
                'time_period': time_period
            }
        )
    
    def handle_scheduled_message_failed(self, message_id: int, message_subject: str, 
                                       error_message: str):
        """معالجة فشل الرسالة المجدولة"""
        self.notification_service.send_notification(
            NotificationType.SCHEDULED_MESSAGE_FAILED.value,
            {
                'message_id': message_id,
                'message_subject': message_subject,
                'error_message': error_message
            }
        )
    
    def handle_engine_status_change(self, is_running: bool):
        """معالجة تغيير حالة المحرك"""
        notification_type = NotificationType.ENGINE_STARTED.value if is_running else NotificationType.ENGINE_STOPPED.value
        
        self.notification_service.send_notification(
            notification_type,
            {
                'status': 'running' if is_running else 'stopped',
                'timestamp': datetime.utcnow().isoformat()
            }
        )

# إنشاء مثيل عام من معالج إشعارات الأتمتة
automation_notification_handler = AutomationNotificationHandler()

class NotificationMonitor:
    """مراقب الإشعارات والتنبيهات"""
    
    def __init__(self):
        self.notification_handler = automation_notification_handler
        self.monitoring_thread = None
        self.is_monitoring = False
        
    def start_monitoring(self):
        """بدء مراقبة النظام"""
        if not self.is_monitoring:
            self.is_monitoring = True
            self.monitoring_thread = threading.Thread(target=self._monitor_system)
            self.monitoring_thread.daemon = True
            self.monitoring_thread.start()
            logger.info("تم بدء مراقبة النظام")
    
    def stop_monitoring(self):
        """إيقاف مراقبة النظام"""
        self.is_monitoring = False
        if self.monitoring_thread:
            self.monitoring_thread.join()
        logger.info("تم إيقاف مراقبة النظام")
    
    def _monitor_system(self):
        """مراقبة النظام بشكل دوري"""
        while self.is_monitoring:
            try:
                # مراقبة معدل الفشل
                self._check_failure_rate()
                
                # مراقبة الرسائل المجدولة الفاشلة
                self._check_failed_messages()
                
                # مراقبة استخدام الموارد
                self._check_resource_usage()
                
                # انتظار 5 دقائق قبل الفحص التالي
                time.sleep(300)
                
            except Exception as e:
                logger.error(f"خطأ في مراقبة النظام: {str(e)}")
                time.sleep(60)
    
    def _check_failure_rate(self):
        """فحص معدل الفشل"""
        try:
            # حساب معدل الفشل في آخر ساعة
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            
            total_executions = WorkflowExecution.query.filter(
                WorkflowExecution.started_at >= one_hour_ago
            ).count()
            
            if total_executions == 0:
                return
            
            failed_executions = WorkflowExecution.query.filter(
                and_(
                    WorkflowExecution.started_at >= one_hour_ago,
                    WorkflowExecution.status == 'failed'
                )
            ).count()
            
            failure_rate = (failed_executions / total_executions) * 100
            
            # إرسال تنبيه إذا كان معدل الفشل أكثر من 20%
            if failure_rate > 20:
                self.notification_handler.handle_high_failure_rate(
                    failure_rate, 'آخر ساعة'
                )
                
        except Exception as e:
            logger.error(f"خطأ في فحص معدل الفشل: {str(e)}")
    
    def _check_failed_messages(self):
        """فحص الرسائل المجدولة الفاشلة"""
        try:
            # البحث عن الرسائل الفاشلة في آخر 30 دقيقة
            thirty_minutes_ago = datetime.utcnow() - timedelta(minutes=30)
            
            failed_messages = ScheduledMessage.query.filter(
                and_(
                    ScheduledMessage.status == 'failed',
                    ScheduledMessage.updated_at >= thirty_minutes_ago
                )
            ).all()
            
            for message in failed_messages:
                self.notification_handler.handle_scheduled_message_failed(
                    message.id,
                    message.subject or 'رسالة بدون عنوان',
                    'فشل في الإرسال'
                )
                
        except Exception as e:
            logger.error(f"خطأ في فحص الرسائل الفاشلة: {str(e)}")
    
    def _check_resource_usage(self):
        """فحص استخدام الموارد"""
        try:
            import psutil
            
            # فحص استخدام المعالج
            cpu_percent = psutil.cpu_percent(interval=1)
            if cpu_percent > 80:
                self.notification_handler.handle_system_error(
                    f"استخدام المعالج عالي: {cpu_percent}%",
                    'CPU'
                )
            
            # فحص استخدام الذاكرة
            memory = psutil.virtual_memory()
            if memory.percent > 85:
                self.notification_handler.handle_system_error(
                    f"استخدام الذاكرة عالي: {memory.percent}%",
                    'Memory'
                )
            
            # فحص مساحة القرص
            disk = psutil.disk_usage('/')
            if disk.percent > 90:
                self.notification_handler.handle_system_error(
                    f"مساحة القرص منخفضة: {disk.percent}% مستخدمة",
                    'Disk'
                )
                
        except ImportError:
            # psutil غير مثبت
            pass
        except Exception as e:
            logger.error(f"خطأ في فحص استخدام الموارد: {str(e)}")

# إنشاء مثيل عام من مراقب الإشعارات
notification_monitor = NotificationMonitor()
