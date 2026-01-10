#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نظام التنبيهات المتقدم - تنبيهات Push، صوتية، ومجدولة
"""

import os
import json
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import schedule
import time
import threading
from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum
import requests
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import logging

class NotificationPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class NotificationType(Enum):
    SYSTEM = "system"
    APPOINTMENT = "appointment"
    REMINDER = "reminder"
    ALERT = "alert"
    MESSAGE = "message"
    ACHIEVEMENT = "achievement"

@dataclass
class Notification:
    id: Optional[int] = None
    user_id: int = None
    title: str = ""
    message: str = ""
    type: NotificationType = NotificationType.SYSTEM
    priority: NotificationPriority = NotificationPriority.MEDIUM
    scheduled_time: Optional[datetime] = None
    created_at: Optional[datetime] = None
    read: bool = False
    delivered: bool = False
    delivery_methods: List[str] = None
    metadata: Dict = None

class AdvancedNotificationSystem:
    def __init__(self, app=None, socketio=None):
        self.app = app
        self.socketio = socketio
        self.db_path = 'notifications.db'
        self.config = self.load_config()
        self.setup_logging()
        self.init_database()
        self.running = False
        
        # تهيئة خدمات التنبيهات
        self.push_service = PushNotificationService(self.config.get('push', {}))
        self.email_service = EmailNotificationService(self.config.get('email', {}))
        self.sms_service = SMSNotificationService(self.config.get('sms', {}))
        
    def load_config(self):
        """تحميل إعدادات التنبيهات"""
        default_config = {
            'push': {
                'enabled': True,
                'vapid_public_key': '',
                'vapid_private_key': '',
                'vapid_email': ''
            },
            'email': {
                'enabled': True,
                'smtp_server': 'smtp.gmail.com',
                'smtp_port': 587,
                'username': '',
                'password': '',
                'from_email': ''
            },
            'sms': {
                'enabled': False,
                'provider': 'twilio',
                'api_key': '',
                'api_secret': '',
                'from_number': ''
            },
            'sound': {
                'enabled': True,
                'default_sound': 'notification.mp3',
                'urgent_sound': 'urgent.mp3'
            },
            'scheduling': {
                'enabled': True,
                'check_interval': 60  # ثانية
            },
            'user_preferences': {
                'default_methods': ['web', 'push'],
                'quiet_hours': {
                    'enabled': True,
                    'start': '22:00',
                    'end': '07:00'
                }
            }
        }
        
        config_file = 'notification_config.json'
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                # دمج الإعدادات
                for key, value in default_config.items():
                    if key not in config:
                        config[key] = value
                return config
            except Exception as e:
                logging.error(f"خطأ في تحميل إعدادات التنبيهات: {e}")
        
        # حفظ الإعدادات الافتراضية
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, ensure_ascii=False, indent=2)
        
        return default_config
    
    def setup_logging(self):
        """إعداد نظام السجلات"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('logs/notifications.log', encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def init_database(self):
        """إنشاء قاعدة بيانات التنبيهات"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # جدول التنبيهات
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL,
                priority TEXT NOT NULL,
                scheduled_time DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                read BOOLEAN DEFAULT FALSE,
                delivered BOOLEAN DEFAULT FALSE,
                delivery_methods TEXT,
                metadata TEXT
            )
        ''')
        
        # جدول تفضيلات المستخدمين
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_notification_preferences (
                user_id INTEGER PRIMARY KEY,
                methods TEXT,
                quiet_hours_enabled BOOLEAN DEFAULT TRUE,
                quiet_hours_start TIME DEFAULT '22:00',
                quiet_hours_end TIME DEFAULT '07:00',
                sound_enabled BOOLEAN DEFAULT TRUE,
                push_enabled BOOLEAN DEFAULT TRUE,
                email_enabled BOOLEAN DEFAULT TRUE,
                sms_enabled BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # جدول سجل التسليم
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notification_delivery_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                notification_id INTEGER,
                method TEXT,
                status TEXT,
                delivered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                error_message TEXT,
                FOREIGN KEY (notification_id) REFERENCES notifications (id)
            )
        ''')
        
        # جدول الاشتراكات Push
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                endpoint TEXT NOT NULL,
                p256dh_key TEXT NOT NULL,
                auth_key TEXT NOT NULL,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
                active BOOLEAN DEFAULT TRUE
            )
        ''')
        
        conn.commit()
        conn.close()
        
        self.logger.info("تم إنشاء قاعدة بيانات التنبيهات")
    
    def create_notification(self, notification: Notification) -> int:
        """إنشاء تنبيه جديد"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO notifications 
                (user_id, title, message, type, priority, scheduled_time, delivery_methods, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                notification.user_id,
                notification.title,
                notification.message,
                notification.type.value,
                notification.priority.value,
                notification.scheduled_time,
                json.dumps(notification.delivery_methods or []),
                json.dumps(notification.metadata or {})
            ))
            
            notification_id = cursor.lastrowid
            conn.commit()
            
            self.logger.info(f"تم إنشاء تنبيه جديد: {notification_id}")
            
            # إرسال فوري إذا لم يكن مجدولاً
            if notification.scheduled_time is None:
                self.deliver_notification(notification_id)
            
            return notification_id
            
        except Exception as e:
            self.logger.error(f"خطأ في إنشاء التنبيه: {e}")
            return None
        finally:
            conn.close()
    
    def get_user_preferences(self, user_id: int) -> Dict:
        """الحصول على تفضيلات المستخدم"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT * FROM user_notification_preferences WHERE user_id = ?
            ''', (user_id,))
            
            result = cursor.fetchone()
            if result:
                return {
                    'methods': json.loads(result[1]) if result[1] else ['web'],
                    'quiet_hours_enabled': bool(result[2]),
                    'quiet_hours_start': result[3],
                    'quiet_hours_end': result[4],
                    'sound_enabled': bool(result[5]),
                    'push_enabled': bool(result[6]),
                    'email_enabled': bool(result[7]),
                    'sms_enabled': bool(result[8])
                }
            else:
                # إنشاء تفضيلات افتراضية
                return self.create_default_preferences(user_id)
                
        except Exception as e:
            self.logger.error(f"خطأ في الحصول على تفضيلات المستخدم: {e}")
            return self.config['user_preferences']
        finally:
            conn.close()
    
    def create_default_preferences(self, user_id: int) -> Dict:
        """إنشاء تفضيلات افتراضية للمستخدم"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        default_prefs = self.config['user_preferences']
        
        try:
            cursor.execute('''
                INSERT INTO user_notification_preferences 
                (user_id, methods, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
                 sound_enabled, push_enabled, email_enabled, sms_enabled)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                json.dumps(default_prefs['default_methods']),
                default_prefs['quiet_hours']['enabled'],
                default_prefs['quiet_hours']['start'],
                default_prefs['quiet_hours']['end'],
                True, True, True, False
            ))
            
            conn.commit()
            return default_prefs
            
        except Exception as e:
            self.logger.error(f"خطأ في إنشاء التفضيلات الافتراضية: {e}")
            return default_prefs
        finally:
            conn.close()
    
    def is_quiet_hours(self, user_id: int) -> bool:
        """فحص إذا كان الوقت الحالي ضمن الساعات الهادئة"""
        preferences = self.get_user_preferences(user_id)
        
        if not preferences.get('quiet_hours_enabled', False):
            return False
        
        now = datetime.now().time()
        start_time = datetime.strptime(preferences['quiet_hours_start'], '%H:%M').time()
        end_time = datetime.strptime(preferences['quiet_hours_end'], '%H:%M').time()
        
        if start_time <= end_time:
            return start_time <= now <= end_time
        else:
            return now >= start_time or now <= end_time
    
    def deliver_notification(self, notification_id: int):
        """تسليم التنبيه"""
        notification = self.get_notification(notification_id)
        if not notification:
            return
        
        preferences = self.get_user_preferences(notification.user_id)
        delivery_methods = notification.delivery_methods or preferences['methods']
        
        # فحص الساعات الهادئة للتنبيهات غير العاجلة
        if (notification.priority != NotificationPriority.URGENT and 
            self.is_quiet_hours(notification.user_id)):
            self.logger.info(f"تأجيل التنبيه {notification_id} بسبب الساعات الهادئة")
            self.schedule_notification_after_quiet_hours(notification_id)
            return
        
        # تسليم عبر الطرق المختلفة
        for method in delivery_methods:
            try:
                success = False
                error_message = None
                
                if method == 'web' and self.socketio:
                    success = self.deliver_web_notification(notification)
                elif method == 'push' and preferences.get('push_enabled', True):
                    success = self.push_service.send_notification(notification)
                elif method == 'email' and preferences.get('email_enabled', True):
                    success = self.email_service.send_notification(notification)
                elif method == 'sms' and preferences.get('sms_enabled', False):
                    success = self.sms_service.send_notification(notification)
                elif method == 'sound' and preferences.get('sound_enabled', True):
                    success = self.deliver_sound_notification(notification)
                
                # تسجيل نتيجة التسليم
                self.log_delivery(notification_id, method, 
                                'success' if success else 'failed', error_message)
                
            except Exception as e:
                self.logger.error(f"خطأ في تسليم التنبيه {notification_id} عبر {method}: {e}")
                self.log_delivery(notification_id, method, 'error', str(e))
        
        # تحديث حالة التسليم
        self.mark_notification_delivered(notification_id)
    
    def deliver_web_notification(self, notification: Notification) -> bool:
        """تسليم التنبيه عبر الويب (WebSocket)"""
        try:
            self.socketio.emit('notification', {
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'type': notification.type.value,
                'priority': notification.priority.value,
                'timestamp': datetime.now().isoformat(),
                'metadata': notification.metadata
            }, room=f'user_{notification.user_id}')
            
            return True
        except Exception as e:
            self.logger.error(f"خطأ في تسليم التنبيه عبر الويب: {e}")
            return False
    
    def deliver_sound_notification(self, notification: Notification) -> bool:
        """تسليم التنبيه الصوتي"""
        try:
            sound_file = (self.config['sound']['urgent_sound'] 
                         if notification.priority == NotificationPriority.URGENT 
                         else self.config['sound']['default_sound'])
            
            # إرسال أمر تشغيل الصوت عبر WebSocket
            self.socketio.emit('play_sound', {
                'sound': sound_file,
                'priority': notification.priority.value
            }, room=f'user_{notification.user_id}')
            
            return True
        except Exception as e:
            self.logger.error(f"خطأ في تسليم التنبيه الصوتي: {e}")
            return False
    
    def get_notification(self, notification_id: int) -> Optional[Notification]:
        """الحصول على تنبيه"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('SELECT * FROM notifications WHERE id = ?', (notification_id,))
            result = cursor.fetchone()
            
            if result:
                return Notification(
                    id=result[0],
                    user_id=result[1],
                    title=result[2],
                    message=result[3],
                    type=NotificationType(result[4]),
                    priority=NotificationPriority(result[5]),
                    scheduled_time=datetime.fromisoformat(result[6]) if result[6] else None,
                    created_at=datetime.fromisoformat(result[7]),
                    read=bool(result[8]),
                    delivered=bool(result[9]),
                    delivery_methods=json.loads(result[10]) if result[10] else [],
                    metadata=json.loads(result[11]) if result[11] else {}
                )
            return None
            
        except Exception as e:
            self.logger.error(f"خطأ في الحصول على التنبيه: {e}")
            return None
        finally:
            conn.close()
    
    def mark_notification_delivered(self, notification_id: int):
        """تحديد التنبيه كمُسلم"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE notifications SET delivered = TRUE WHERE id = ?
            ''', (notification_id,))
            conn.commit()
        except Exception as e:
            self.logger.error(f"خطأ في تحديث حالة التسليم: {e}")
        finally:
            conn.close()
    
    def mark_notification_read(self, notification_id: int, user_id: int):
        """تحديد التنبيه كمقروء"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE notifications SET read = TRUE 
                WHERE id = ? AND user_id = ?
            ''', (notification_id, user_id))
            conn.commit()
            return cursor.rowcount > 0
        except Exception as e:
            self.logger.error(f"خطأ في تحديث حالة القراءة: {e}")
            return False
        finally:
            conn.close()
    
    def log_delivery(self, notification_id: int, method: str, status: str, error_message: str = None):
        """تسجيل نتيجة التسليم"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO notification_delivery_log 
                (notification_id, method, status, error_message)
                VALUES (?, ?, ?, ?)
            ''', (notification_id, method, status, error_message))
            conn.commit()
        except Exception as e:
            self.logger.error(f"خطأ في تسجيل التسليم: {e}")
        finally:
            conn.close()
    
    def get_user_notifications(self, user_id: int, limit: int = 50, unread_only: bool = False) -> List[Dict]:
        """الحصول على تنبيهات المستخدم"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            query = '''
                SELECT * FROM notifications 
                WHERE user_id = ?
            '''
            params = [user_id]
            
            if unread_only:
                query += ' AND read = FALSE'
            
            query += ' ORDER BY created_at DESC LIMIT ?'
            params.append(limit)
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            notifications = []
            for result in results:
                notifications.append({
                    'id': result[0],
                    'title': result[2],
                    'message': result[3],
                    'type': result[4],
                    'priority': result[5],
                    'scheduled_time': result[6],
                    'created_at': result[7],
                    'read': bool(result[8]),
                    'delivered': bool(result[9]),
                    'metadata': json.loads(result[11]) if result[11] else {}
                })
            
            return notifications
            
        except Exception as e:
            self.logger.error(f"خطأ في الحصول على تنبيهات المستخدم: {e}")
            return []
        finally:
            conn.close()
    
    def schedule_notification_after_quiet_hours(self, notification_id: int):
        """جدولة التنبيه بعد انتهاء الساعات الهادئة"""
        notification = self.get_notification(notification_id)
        if not notification:
            return
        
        preferences = self.get_user_preferences(notification.user_id)
        end_time = datetime.strptime(preferences['quiet_hours_end'], '%H:%M').time()
        
        # حساب الوقت التالي لانتهاء الساعات الهادئة
        now = datetime.now()
        next_delivery = datetime.combine(now.date(), end_time)
        
        if next_delivery <= now:
            next_delivery += timedelta(days=1)
        
        # تحديث وقت الجدولة
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE notifications SET scheduled_time = ? WHERE id = ?
            ''', (next_delivery, notification_id))
            conn.commit()
        except Exception as e:
            self.logger.error(f"خطأ في جدولة التنبيه: {e}")
        finally:
            conn.close()
    
    def start_scheduler(self):
        """بدء جدولة التنبيهات"""
        self.running = True
        
        def run_scheduler():
            while self.running:
                self.check_scheduled_notifications()
                time.sleep(self.config['scheduling']['check_interval'])
        
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        
        self.logger.info("تم بدء جدولة التنبيهات")
    
    def check_scheduled_notifications(self):
        """فحص التنبيهات المجدولة"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            now = datetime.now()
            cursor.execute('''
                SELECT id FROM notifications 
                WHERE scheduled_time <= ? AND delivered = FALSE
            ''', (now,))
            
            notification_ids = [row[0] for row in cursor.fetchall()]
            
            for notification_id in notification_ids:
                self.deliver_notification(notification_id)
                
        except Exception as e:
            self.logger.error(f"خطأ في فحص التنبيهات المجدولة: {e}")
        finally:
            conn.close()
    
    def stop_scheduler(self):
        """إيقاف جدولة التنبيهات"""
        self.running = False
        self.logger.info("تم إيقاف جدولة التنبيهات")

class PushNotificationService:
    def __init__(self, config):
        self.config = config
        self.enabled = config.get('enabled', False)
    
    def send_notification(self, notification: Notification) -> bool:
        """إرسال تنبيه Push"""
        if not self.enabled:
            return False
        
        try:
            # هنا سيتم تطبيق إرسال Push notifications
            # باستخدام Web Push Protocol
            return True
        except Exception as e:
            logging.error(f"خطأ في إرسال Push notification: {e}")
            return False

class EmailNotificationService:
    def __init__(self, config):
        self.config = config
        self.enabled = config.get('enabled', False)
    
    def send_notification(self, notification: Notification) -> bool:
        """إرسال تنبيه عبر البريد الإلكتروني"""
        if not self.enabled:
            return False
        
        try:
            # تطبيق إرسال البريد الإلكتروني
            return True
        except Exception as e:
            logging.error(f"خطأ في إرسال البريد الإلكتروني: {e}")
            return False

class SMSNotificationService:
    def __init__(self, config):
        self.config = config
        self.enabled = config.get('enabled', False)
    
    def send_notification(self, notification: Notification) -> bool:
        """إرسال تنبيه عبر SMS"""
        if not self.enabled:
            return False
        
        try:
            # تطبيق إرسال SMS
            return True
        except Exception as e:
            logging.error(f"خطأ في إرسال SMS: {e}")
            return False

# مثال على الاستخدام
if __name__ == "__main__":
    # إنشاء نظام التنبيهات
    notification_system = AdvancedNotificationSystem()
    
    # بدء الجدولة
    notification_system.start_scheduler()
    
    # إنشاء تنبيه تجريبي
    test_notification = Notification(
        user_id=1,
        title="تنبيه تجريبي",
        message="هذا تنبيه تجريبي من النظام",
        type=NotificationType.SYSTEM,
        priority=NotificationPriority.MEDIUM,
        delivery_methods=['web', 'push']
    )
    
    notification_id = notification_system.create_notification(test_notification)
    print(f"تم إنشاء التنبيه: {notification_id}")
