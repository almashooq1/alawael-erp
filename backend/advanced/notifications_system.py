"""
نظام الإشعارات والتنبيهات المتقدم
Advanced Notification & Alert System
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable
from enum import Enum
import json
import logging
from abc import ABC, abstractmethod
import threading
from queue import Queue, PriorityQueue

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== تعريفات النظام ====================

class NotificationType(Enum):
    """أنواع الإشعارات"""
    GRADE_POSTED = "grade_posted"
    ATTENDANCE_WARNING = "attendance_warning"
    COURSE_ANNOUNCEMENT = "course_announcement"
    ACADEMIC_ALERT = "academic_alert"
    SCHEDULE_CHANGE = "schedule_change"
    EXAM_REMINDER = "exam_reminder"
    PAYMENT_DUE = "payment_due"
    SYSTEM_MESSAGE = "system_message"


class AlertSeverity(Enum):
    """مستويات الخطورة"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class NotificationChannel(Enum):
    """قنوات التوصيل"""
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"
    PUSH = "push"
    DASHBOARD = "dashboard"


# ==================== قاعدة الإشعارات ====================

class Notification:
    """كلاس الإشعار الأساسي"""
    
    def __init__(self, 
                 recipient_id: str,
                 notification_type: NotificationType,
                 title: str,
                 message: str,
                 severity: AlertSeverity = AlertSeverity.LOW,
                 data: Optional[Dict] = None):
        
        self.id = self._generate_id()
        self.recipient_id = recipient_id
        self.type = notification_type
        self.title = title
        self.message = message
        self.severity = severity
        self.data = data or {}
        self.created_at = datetime.now()
        self.read = False
        self.channels = []
    
    def _generate_id(self) -> str:
        """توليد معرف فريد"""
        import uuid
        return f"NOTIF_{uuid.uuid4().hex[:8]}"
    
    def mark_as_read(self):
        """وضع علامة على الإشعار كمقروء"""
        self.read = True
        self.read_at = datetime.now()
        logger.info(f"✅ الإشعار {self.id} تم قراءته")
    
    def to_dict(self) -> Dict:
        """تحويل إلى قاموس JSON"""
        return {
            'id': self.id,
            'recipient_id': self.recipient_id,
            'type': self.type.value,
            'title': self.title,
            'message': self.message,
            'severity': self.severity.name,
            'created_at': self.created_at.isoformat(),
            'read': self.read,
            'data': self.data
        }


# ==================== قنوات الإرسال ====================

class NotificationChannel(ABC):
    """قاعدة قنوات الإرسال"""
    
    @abstractmethod
    def send(self, notification: Notification) -> bool:
        pass


class EmailChannel(NotificationChannel):
    """قناة البريد الإلكتروني"""
    
    def send(self, notification: Notification) -> bool:
        """إرسال بريد إلكتروني"""
        
        email_template = f"""
        الموضوع: {notification.title}
        
        السلام عليكم ورحمة الله وبركاته
        
        {notification.message}
        
        التفاصيل:
        - النوع: {notification.type.value}
        - الخطورة: {notification.severity.name}
        - الوقت: {notification.created_at.strftime('%Y-%m-%d %H:%M')}
        
        مع أطيب التحيات،
        نظام إدارة الطلاب
        """
        
        logger.info(f"📧 إرسال بريد إلى {notification.recipient_id}")
        logger.debug(f"محتوى البريد:\n{email_template}")
        
        return True


class SMSChannel(NotificationChannel):
    """قناة الرسائل القصيرة"""
    
    def send(self, notification: Notification) -> bool:
        """إرسال SMS"""
        
        sms_body = f"{notification.title}: {notification.message[:100]}"
        
        logger.info(f"📱 إرسال SMS إلى {notification.recipient_id}")
        logger.debug(f"محتوى SMS: {sms_body}")
        
        return True


class InAppChannel(NotificationChannel):
    """قناة الإشعارات داخل التطبيق"""
    
    def __init__(self):
        self.notifications_store = {}
    
    def send(self, notification: Notification) -> bool:
        """إرسال إشعار داخل التطبيق"""
        
        if notification.recipient_id not in self.notifications_store:
            self.notifications_store[notification.recipient_id] = []
        
        self.notifications_store[notification.recipient_id].append(notification)
        
        logger.info(f"📲 إشعار داخل التطبيق لـ {notification.recipient_id}")
        
        return True
    
    def get_unread_count(self, user_id: str) -> int:
        """الحصول على عدد الإشعارات غير المقروءة"""
        notifications = self.notifications_store.get(user_id, [])
        return len([n for n in notifications if not n.read])
    
    def get_user_notifications(self, user_id: str, 
                              limit: int = 50) -> List[Dict]:
        """الحصول على إشعارات المستخدم"""
        notifications = self.notifications_store.get(user_id, [])
        return [n.to_dict() for n in sorted(
            notifications,
            key=lambda x: x.created_at,
            reverse=True
        )[:limit]]


class PushChannel(NotificationChannel):
    """قناة الإشعارات الفورية (Push)"""
    
    def send(self, notification: Notification) -> bool:
        """إرسال push notification"""
        
        logger.info(f"🔔 Push notification لـ {notification.recipient_id}")
        logger.debug(f"العنوان: {notification.title}")
        
        return True


class DashboardChannel(NotificationChannel):
    """قناة لوحة التحكم"""
    
    def __init__(self):
        self.dashboard_alerts = {}
    
    def send(self, notification: Notification) -> bool:
        """عرض التنبيه على لوحة التحكم"""
        
        if notification.recipient_id not in self.dashboard_alerts:
            self.dashboard_alerts[notification.recipient_id] = []
        
        self.dashboard_alerts[notification.recipient_id].append(notification)
        
        logger.info(f"📊 تنبيه لوحة تحكم لـ {notification.recipient_id}")
        
        return True


# ==================== مدير الإشعارات ====================

class NotificationManager:
    """مدير الإشعارات المركزي"""
    
    def __init__(self):
        self.channels = {
            NotificationChannel.EMAIL: EmailChannel(),
            NotificationChannel.SMS: SMSChannel(),
            NotificationChannel.IN_APP: InAppChannel(),
            NotificationChannel.PUSH: PushChannel(),
            NotificationChannel.DASHBOARD: DashboardChannel()
        }
        
        self.notification_queue = PriorityQueue()
        self.notification_history = []
        self.user_preferences = {}
        
        # تشغيل معالج الرسائل
        self.processing_thread = threading.Thread(
            target=self._process_queue,
            daemon=True
        )
        self.processing_thread.start()
    
    def send_notification(self, 
                         recipient_id: str,
                         notification_type: NotificationType,
                         title: str,
                         message: str,
                         severity: AlertSeverity = AlertSeverity.LOW,
                         channels: List[NotificationChannel] = None,
                         data: Optional[Dict] = None) -> str:
        """إرسال إشعار"""
        
        notification = Notification(
            recipient_id=recipient_id,
            notification_type=notification_type,
            title=title,
            message=message,
            severity=severity,
            data=data
        )
        
        # إضافة إلى قائمة الانتظار
        priority = severity.value
        self.notification_queue.put((priority, notification))
        
        # حفظ في السجل
        self.notification_history.append(notification)
        
        logger.info(f"✅ إشعار تم إضافته إلى قائمة الانتظار: {notification.id}")
        
        return notification.id
    
    def _process_queue(self):
        """معالجة قائمة الانتظار"""
        while True:
            try:
                priority, notification = self.notification_queue.get(timeout=1)
                
                # الحصول على تفضيلات المستخدم
                user_prefs = self.user_preferences.get(
                    notification.recipient_id,
                    {'channels': list(self.channels.keys())}
                )
                
                # الإرسال عبر القنوات المفضلة
                for channel_type in user_prefs.get('channels', self.channels.keys()):
                    if channel_type in self.channels:
                        self.channels[channel_type].send(notification)
                
            except Exception as e:
                logger.debug(f"معالج قائمة الانتظار: {e}")
    
    def set_user_preferences(self, user_id: str, 
                            channels: List[NotificationChannel],
                            quiet_hours: Optional[Dict] = None):
        """تعيين تفضيلات المستخدم"""
        
        self.user_preferences[user_id] = {
            'channels': channels,
            'quiet_hours': quiet_hours  # مثل: {'start': '22:00', 'end': '08:00'}
        }
        
        logger.info(f"✅ تم تحديث تفضيلات المستخدم {user_id}")
    
    def get_user_notifications(self, user_id: str) -> List[Dict]:
        """الحصول على إشعارات المستخدم"""
        in_app = self.channels[NotificationChannel.IN_APP]
        return in_app.get_user_notifications(user_id)
    
    def mark_as_read(self, notification_id: str):
        """وضع علامة على الإشعار كمقروء"""
        for notif in self.notification_history:
            if notif.id == notification_id:
                notif.mark_as_read()
                return True
        return False


# ==================== قواعد الإشعارات الذكية ====================

class NotificationRule:
    """قاعدة إشعار قابلة للتخصيص"""
    
    def __init__(self, name: str, condition: Callable, 
                 action: Dict):
        self.name = name
        self.condition = condition  # دالة تعود True/False
        self.action = action  # {type, title, message, severity}
        self.enabled = True
    
    def evaluate(self, context: Dict) -> bool:
        """تقييم القاعدة"""
        return self.enabled and self.condition(context)


class RuleEngine:
    """محرك القواعد الذكي"""
    
    def __init__(self, notification_manager: NotificationManager):
        self.manager = notification_manager
        self.rules = []
    
    def add_rule(self, rule: NotificationRule):
        """إضافة قاعدة"""
        self.rules.append(rule)
        logger.info(f"✅ تمت إضافة القاعدة: {rule.name}")
    
    def evaluate_all(self, context: Dict) -> List[str]:
        """تقييم جميع القواعد"""
        triggered_notifications = []
        
        for rule in self.rules:
            if rule.evaluate(context):
                action = rule.action
                notif_id = self.manager.send_notification(
                    recipient_id=context.get('user_id'),
                    notification_type=NotificationType[action.get('type', 'SYSTEM_MESSAGE')],
                    title=action.get('title', ''),
                    message=action.get('message', ''),
                    severity=action.get('severity', AlertSeverity.LOW),
                    data=context
                )
                triggered_notifications.append(notif_id)
                logger.info(f"🎯 تم تفعيل القاعدة: {rule.name}")
        
        return triggered_notifications


# ==================== قواعس مسبقة الصنع ====================

def create_default_rules(rule_engine: RuleEngine):
    """إنشاء قواعس افتراضية"""
    
    # القاعدة 1: تنبيه الدرجات المنخفضة
    rule1 = NotificationRule(
        name="تنبيه الدرجات المنخفضة",
        condition=lambda ctx: ctx.get('grade', 0) < 60,
        action={
            'type': 'ACADEMIC_ALERT',
            'title': '⚠️ درجة منخفضة',
            'message': 'لقد حصلت على درجة منخفضة. يرجى التواصل مع المستشار الأكاديمي.',
            'severity': AlertSeverity.HIGH
        }
    )
    
    # القاعدة 2: تنبيه الحضور الضعيف
    rule2 = NotificationRule(
        name="تنبيه الحضور الضعيف",
        condition=lambda ctx: ctx.get('attendance_rate', 100) < 75,
        action={
            'type': 'ATTENDANCE_WARNING',
            'title': '🚨 تحذير الحضور',
            'message': 'معدل حضورك أقل من 75%. قد تؤثر على درجاتك النهائية.',
            'severity': AlertSeverity.CRITICAL
        }
    )
    
    # القاعدة 3: تذكير الامتحان
    rule3 = NotificationRule(
        name="تذكير الامتحان",
        condition=lambda ctx: ctx.get('days_to_exam', 0) == 3,
        action={
            'type': 'EXAM_REMINDER',
            'title': '📝 تذكير الامتحان',
            'message': 'يتبقى 3 أيام على الامتحان. ابدأ التحضير الآن!',
            'severity': AlertSeverity.MEDIUM
        }
    )
    
    # القاعدة 4: تنبيه GPA المنخفض جداً
    rule4 = NotificationRule(
        name="تنبيه GPA المنخفض جداً",
        condition=lambda ctx: ctx.get('gpa', 4.0) < 2.0,
        action={
            'type': 'ACADEMIC_ALERT',
            'title': '🔴 GPA حرج',
            'message': 'معدلك التراكمي اقل من 2.0. تواصل مع الإدارة الأكاديمية فوراً.',
            'severity': AlertSeverity.CRITICAL
        }
    )
    
    rule_engine.add_rule(rule1)
    rule_engine.add_rule(rule2)
    rule_engine.add_rule(rule3)
    rule_engine.add_rule(rule4)


# ==================== عرض توضيحي ====================

def demo_notification_system():
    """عرض توضيحي للنظام"""
    
    # إنشاء المدير والمحرك
    manager = NotificationManager()
    rule_engine = RuleEngine(manager)
    
    # إضافة القواعس الافتراضية
    create_default_rules(rule_engine)
    
    # تعيين تفضيلات المستخدم
    manager.set_user_preferences(
        'STU001',
        channels=[
            NotificationChannel.EMAIL,
            NotificationChannel.IN_APP,
            NotificationChannel.PUSH
        ]
    )
    
    # محاكاة سياق الطالب
    student_context = {
        'user_id': 'STU001',
        'grade': 55,
        'attendance_rate': 70,
        'days_to_exam': 3,
        'gpa': 1.8
    }
    
    # تقييم القواعس
    print("🎯 تقييم القواعس الذكية...")
    triggered = rule_engine.evaluate_all(student_context)
    
    print(f"✅ تم تفعيل {len(triggered)} قاعدة/قواعده")
    
    # عرض الإشعارات
    print("\n📬 الإشعارات:")
    notifications = manager.get_user_notifications('STU001')
    for notif in notifications:
        print(f"  - {notif['title']}: {notif['message']}")


if __name__ == '__main__':
    demo_notification_system()
