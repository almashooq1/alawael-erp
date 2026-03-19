"""
نظام Webhooks و WebSocket للتحديثات الفورية
Advanced Webhooks & Real-time WebSocket System
"""

from datetime import datetime
from typing import Dict, List, Optional, Callable
from enum import Enum
import json
import logging
import asyncio
import threading
from queue import Queue
import uuid
import requests
from abc import ABC, abstractmethod

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== تعريفات النظام ====================

class EventType(Enum):
    """أنواع الأحداث"""
    STUDENT_CREATED = "student.created"
    STUDENT_UPDATED = "student.updated"
    GRADE_POSTED = "grade.posted"
    GRADE_UPDATED = "grade.updated"
    ATTENDANCE_MARKED = "attendance.marked"
    COURSE_CREATED = "course.created"
    COURSE_UPDATED = "course.updated"
    ENROLLMENT_COMPLETED = "enrollment.completed"
    TRANSCRIPT_GENERATED = "transcript.generated"


class WebhookStatus(Enum):
    """حالات Webhook"""
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"
    RETRYING = "retrying"


# ==================== نظام الأحداث ====================

class Event:
    """كلاس الحدث"""
    
    def __init__(self, event_type: EventType, data: Dict):
        self.id = str(uuid.uuid4())
        self.type = event_type
        self.data = data
        self.timestamp = datetime.now()
        self.version = "1.0"
    
    def to_dict(self) -> Dict:
        """تحويل إلى قاموس"""
        return {
            'id': self.id,
            'type': self.type.value,
            'data': self.data,
            'timestamp': self.timestamp.isoformat(),
            'version': self.version
        }


class EventBus:
    """ناقل الأحداث المركزي"""
    
    def __init__(self):
        self.subscribers: Dict[EventType, List[Callable]] = {}
        self.event_history: List[Event] = []
        self.max_history = 1000
    
    def subscribe(self, event_type: EventType, 
                  callback: Callable):
        """الاشتراك في حدث معين"""
        
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        
        self.subscribers[event_type].append(callback)
        
        logger.info(f"✅ اشتراك جديد في {event_type.value}")
    
    def publish(self, event: Event):
        """نشر حدث"""
        
        # حفظ في السجل
        self.event_history.append(event)
        if len(self.event_history) > self.max_history:
            self.event_history.pop(0)
        
        # إخطار المشتركين
        if event.type in self.subscribers:
            for callback in self.subscribers[event.type]:
                try:
                    callback(event)
                except Exception as e:
                    logger.error(f"خطأ في callback: {e}")
        
        logger.info(f"📡 حدث تم نشره: {event.type.value}")
    
    def get_event_history(self, 
                         event_type: Optional[EventType] = None,
                         limit: int = 50) -> List[Dict]:
        """الحصول على سجل الأحداث"""
        
        if event_type:
            filtered = [
                e for e in self.event_history
                if e.type == event_type
            ]
        else:
            filtered = self.event_history
        
        return [e.to_dict() for e in filtered[-limit:]]


# ==================== نظام Webhooks ====================

class WebhookEndpoint:
    """نقطة نهاية Webhook"""
    
    def __init__(self, url: str, events: List[EventType], 
                 secret: str = None, is_active: bool = True):
        self.id = str(uuid.uuid4())
        self.url = url
        self.events = events
        self.secret = secret or str(uuid.uuid4())
        self.is_active = is_active
        self.created_at = datetime.now()
        self.last_triggered = None
        self.delivery_count = 0
        self.failure_count = 0
    
    def to_dict(self) -> Dict:
        """تحويل إلى قاموس"""
        return {
            'id': self.id,
            'url': self.url,
            'events': [e.value for e in self.events],
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'last_triggered': self.last_triggered.isoformat() if self.last_triggered else None,
            'delivery_count': self.delivery_count,
            'failure_count': self.failure_count,
            'success_rate': round(
                (self.delivery_count / (self.delivery_count + self.failure_count) * 100)
                if (self.delivery_count + self.failure_count) > 0 else 0,
                2
            )
        }


class WebhookDelivery:
    """سجل توصيل Webhook"""
    
    def __init__(self, webhook_id: str, event: Event):
        self.id = str(uuid.uuid4())
        self.webhook_id = webhook_id
        self.event = event
        self.status = WebhookStatus.PENDING
        self.attempts = 0
        self.max_attempts = 5
        self.next_retry = datetime.now()
        self.response_code = None
        self.response_body = None
    
    def mark_delivered(self, response_code: int, response_body: str = None):
        """وضع علامة على أنها تم توصيلها"""
        self.status = WebhookStatus.DELIVERED
        self.response_code = response_code
        self.response_body = response_body
        logger.info(f"✅ Webhook تم توصيله: {self.webhook_id}")
    
    def mark_failed(self, response_code: int = None):
        """وضع علامة على أنها فشلت"""
        self.attempts += 1
        
        if self.attempts >= self.max_attempts:
            self.status = WebhookStatus.FAILED
            logger.error(f"❌ Webhook فشل بعد {self.max_attempts} محاولات")
        else:
            self.status = WebhookStatus.RETRYING
            # وقت انتظار متصاعد (exponential backoff)
            self.next_retry = datetime.now() + \
                             timedelta(seconds=2 ** self.attempts)
            logger.warning(f"🔄 إعادة محاولة Webhook الساعة {self.next_retry}")
        
        self.response_code = response_code


class WebhookManager:
    """مدير Webhooks الشامل"""
    
    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self.webhooks: Dict[str, WebhookEndpoint] = {}
        self.deliveries: List[WebhookDelivery] = []
        self.delivery_queue = Queue()
        
        # بدء معالج التوصيل
        self.delivery_thread = threading.Thread(
            target=self._process_deliveries,
            daemon=True
        )
        self.delivery_thread.start()
    
    def register_webhook(self, url: str, 
                        events: List[EventType],
                        secret: str = None) -> str:
        """تسجيل Webhook جديد"""
        
        webhook = WebhookEndpoint(url, events, secret)
        self.webhooks[webhook.id] = webhook
        
        # الاشتراك في الأحداث
        for event_type in events:
            self.event_bus.subscribe(
                event_type,
                lambda e, wid=webhook.id: self._on_event(wid, e)
            )
        
        logger.info(f"✅ Webhook مسجل: {webhook.id}")
        
        return webhook.id
    
    def unregister_webhook(self, webhook_id: str) -> bool:
        """إلغاء تسجيل Webhook"""
        
        if webhook_id in self.webhooks:
            del self.webhooks[webhook_id]
            logger.info(f"✅ Webhook تم إلغاؤه: {webhook_id}")
            return True
        
        return False
    
    def _on_event(self, webhook_id: str, event: Event):
        """معالج الأحداث"""
        
        if webhook_id not in self.webhooks:
            return
        
        webhook = self.webhooks[webhook_id]
        
        if not webhook.is_active:
            return
        
        # إنشاء سجل توصيل
        delivery = WebhookDelivery(webhook_id, event)
        self.deliveries.append(delivery)
        
        # إضافة إلى قائمة الانتظار
        self.delivery_queue.put(delivery)
    
    def _process_deliveries(self):
        """معالج قائمة الانتظار للتوصيل"""
        
        while True:
            try:
                delivery = self.delivery_queue.get(timeout=1)
                
                if delivery.status == WebhookStatus.FAILED:
                    continue
                
                webhook = self.webhooks.get(delivery.webhook_id)
                if not webhook:
                    continue
                
                self._deliver_webhook(webhook, delivery)
                
            except Exception as e:
                logger.debug(f"معالج الانتظار: {e}")
    
    def _deliver_webhook(self, webhook: WebhookEndpoint, 
                        delivery: WebhookDelivery):
        """توصيل Webhook"""
        
        payload = delivery.event.to_dict()
        
        headers = {
            'Content-Type': 'application/json',
            'X-Webhook-ID': delivery.webhook_id,
            'X-Webhook-Signature': self._generate_signature(payload, webhook.secret),
            'User-Agent': 'StudentManagementSystem/1.0'
        }
        
        try:
            response = requests.post(
                webhook.url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201, 204]:
                delivery.mark_delivered(response.status_code, response.text)
                webhook.delivery_count += 1
            else:
                delivery.mark_failed(response.status_code)
                webhook.failure_count += 1
                
                # إعادة المحاولة إذا لم تنجح
                if delivery.status == WebhookStatus.RETRYING:
                    asyncio.sleep(2)
                    self.delivery_queue.put(delivery)
        
        except requests.RequestException as e:
            logger.error(f"خطأ في توصيل Webhook: {e}")
            delivery.mark_failed()
            webhook.failure_count += 1
            
            if delivery.status == WebhookStatus.RETRYING:
                self.delivery_queue.put(delivery)
        
        webhook.last_triggered = datetime.now()
    
    def _generate_signature(self, payload: Dict, secret: str) -> str:
        """توليد توقيع HMAC"""
        import hmac
        import hashlib
        
        payload_str = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            secret.encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    def get_webhook_info(self, webhook_id: str) -> Optional[Dict]:
        """الحصول على معلومات Webhook"""
        
        if webhook_id in self.webhooks:
            return self.webhooks[webhook_id].to_dict()
        
        return None
    
    def list_webhooks(self) -> List[Dict]:
        """قائمة بجميع Webhooks"""
        
        return [w.to_dict() for w in self.webhooks.values()]
    
    def get_delivery_history(self, webhook_id: str, 
                            limit: int = 50) -> List[Dict]:
        """سجل التوصيل لـ Webhook"""
        
        deliveries = [
            d for d in self.deliveries
            if d.webhook_id == webhook_id
        ]
        
        return [{
            'id': d.id,
            'event_type': d.event.type.value,
            'status': d.status.value,
            'attempts': d.attempts,
            'response_code': d.response_code,
            'timestamp': d.event.timestamp.isoformat()
        } for d in deliveries[-limit:]]


# ==================== نظام WebSocket ====================

class WebSocketHandler:
    """معالج WebSocket للتحديثات الفورية"""
    
    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self.connections: Dict[str, List[str]] = {}  # user_id -> [session_ids]
        self.session_data: Dict[str, Dict] = {}
    
    def connect(self, user_id: str, session_id: str) -> str:
        """إنشاء اتصال WebSocket"""
        
        if user_id not in self.connections:
            self.connections[user_id] = []
        
        self.connections[user_id].append(session_id)
        
        self.session_data[session_id] = {
            'user_id': user_id,
            'connected_at': datetime.now(),
            'event_subscriptions': []
        }
        
        logger.info(f"✅ اتصال WebSocket: {session_id} للمستخدم {user_id}")
        
        return session_id
    
    def disconnect(self, session_id: str):
        """قطع اتصال WebSocket"""
        
        if session_id in self.session_data:
            user_id = self.session_data[session_id]['user_id']
            self.connections[user_id].remove(session_id)
            del self.session_data[session_id]
            
            logger.info(f"✅ قطع الاتصال: {session_id}")
    
    def broadcast_to_user(self, user_id: str, message: Dict):
        """بث رسالة لجميع اتصالات المستخدم"""
        
        if user_id in self.connections:
            for session_id in self.connections[user_id]:
                self._send_message(session_id, message)
            
            logger.info(f"📨 رسالة مُرسلة للمستخدم {user_id}")
    
    def broadcast_to_all(self, message: Dict):
        """بث رسالة لجميع المتصلين"""
        
        for user_id in self.connections:
            self.broadcast_to_user(user_id, message)
        
        logger.info(f"📡 رسالة مُرسلة للجميع")
    
    def _send_message(self, session_id: str, message: Dict):
        """إرسال رسالة عبر WebSocket"""
        
        # محاكاة - في الإنتاج استخدم WebSocket فعلي
        logger.debug(f"📤 رسالة WebSocket: {message}")
    
    def subscribe_to_event(self, session_id: str, 
                          event_type: EventType):
        """الاشتراك في حدث معين"""
        
        if session_id in self.session_data:
            self.session_data[session_id]['event_subscriptions'].append(event_type)
            
            # الاشتراك في ناقل الأحداث
            self.event_bus.subscribe(
                event_type,
                lambda e, sid=session_id: self._on_event(sid, e)
            )
            
            logger.info(f"✅ اشتراك في {event_type.value}")
    
    def _on_event(self, session_id: str, event: Event):
        """معالج الحدث"""
        
        if session_id in self.session_data:
            message = {
                'type': 'event',
                'event': event.to_dict()
            }
            
            self._send_message(session_id, message)


# ==================== عرض توضيحي ====================

def demo_webhooks_and_websockets():
    """عرض توضيحي للنظام"""
    
    print("🔗 عرض توضيحي لـ Webhooks و WebSocket\n")
    
    # إنشاء ناقل الأحداث
    event_bus = EventBus()
    
    # 1. Webhooks
    print("1️⃣ نظام Webhooks:")
    webhook_mgr = WebhookManager(event_bus)
    
    webhook_id = webhook_mgr.register_webhook(
        url="https://api.example.com/webhooks",
        events=[EventType.GRADE_POSTED, EventType.STUDENT_CREATED]
    )
    print(f"   Webhook مسجل: {webhook_id}")
    
    # 2. نشر حدث
    print("\n2️⃣ نشر حدث:")
    event = Event(
        EventType.GRADE_POSTED,
        {'student_id': 'STU001', 'grade': 85, 'course': 'MATH101'}
    )
    event_bus.publish(event)
    print(f"   حدث تم نشره: {event.type.value}")
    
    # 3. سجل الأحداث
    print("\n3️⃣ سجل الأحداث:")
    history = event_bus.get_event_history(limit=5)
    print(f"   عدد الأحداث: {len(history)}")
    
    # 4. WebSocket
    print("\n4️⃣ اتصالات WebSocket:")
    ws_handler = WebSocketHandler(event_bus)
    
    session1 = ws_handler.connect('STU001', 'sess_123')
    session2 = ws_handler.connect('STU002', 'sess_456')
    print(f"   متصل: {len(ws_handler.connections)} مستخدمين")
    
    # 5. الاشتراك والبث
    print("\n5️⃣ الاشتراك والبث:")
    ws_handler.subscribe_to_event('sess_123', EventType.GRADE_POSTED)
    ws_handler.broadcast_to_user('STU001', {'type': 'notification', 'message': 'جديد!'})
    print(f"   رسالة مُرسلة")


if __name__ == '__main__':
    demo_webhooks_and_websockets()
