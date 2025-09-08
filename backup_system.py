#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نظام النسخ الاحتياطي التلقائي - مع التشفير والجدولة
"""

import os
import shutil
import sqlite3
import schedule
import time
import zipfile
import hashlib
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import json
import logging
from pathlib import Path
import threading
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from email.mime.base import MimeBase
from email import encoders

class AutoBackupSystem:
    def __init__(self, config_file='backup_config.json'):
        self.config_file = config_file
        self.config = self.load_config()
        self.setup_logging()
        self.encryption_key = None
        self.running = False
        
    def load_config(self):
        """تحميل إعدادات النسخ الاحتياطي"""
        default_config = {
            'database_path': 'awail_erp.db',
            'backup_directory': 'backups',
            'cloud_backup_directory': 'cloud_backups',
            'max_local_backups': 30,
            'max_cloud_backups': 90,
            'backup_schedule': {
                'daily': '02:00',
                'weekly': 'sunday',
                'monthly': 1
            },
            'encryption': {
                'enabled': True,
                'password': None  # سيتم إنشاؤها تلقائياً
            },
            'compression': {
                'enabled': True,
                'level': 6
            },
            'email_notifications': {
                'enabled': False,
                'smtp_server': '',
                'smtp_port': 587,
                'username': '',
                'password': '',
                'recipients': []
            },
            'cloud_storage': {
                'enabled': False,
                'provider': 'local',  # local, aws, google, azure
                'credentials': {}
            },
            'include_files': [
                '*.db',
                '*.sqlite',
                '*.sqlite3',
                'uploads/*',
                'static/images/*',
                '.env'
            ],
            'exclude_files': [
                '__pycache__/*',
                '*.pyc',
                '*.log',
                'temp/*',
                'cache/*'
            ]
        }
        
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                # دمج الإعدادات الافتراضية مع المحملة
                for key, value in default_config.items():
                    if key not in config:
                        config[key] = value
                return config
            except Exception as e:
                print(f"خطأ في تحميل الإعدادات: {e}")
                return default_config
        else:
            self.save_config(default_config)
            return default_config
    
    def save_config(self, config=None):
        """حفظ إعدادات النسخ الاحتياطي"""
        if config is None:
            config = self.config
            
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            self.logger.error(f"خطأ في حفظ الإعدادات: {e}")
    
    def setup_logging(self):
        """إعداد نظام السجلات"""
        log_dir = 'logs'
        os.makedirs(log_dir, exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'{log_dir}/backup_system.log', encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def generate_encryption_key(self, password=None):
        """إنشاء مفتاح التشفير"""
        if password is None:
            password = os.urandom(32).hex()
            self.config['encryption']['password'] = password
            self.save_config()
        
        password_bytes = password.encode()
        salt = b'awail_erp_backup_salt_2024'  # في الإنتاج، استخدم salt عشوائي
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password_bytes))
        self.encryption_key = Fernet(key)
        return key
    
    def encrypt_file(self, file_path, output_path):
        """تشفير ملف"""
        try:
            with open(file_path, 'rb') as f:
                data = f.read()
            
            encrypted_data = self.encryption_key.encrypt(data)
            
            with open(output_path, 'wb') as f:
                f.write(encrypted_data)
            
            return True
        except Exception as e:
            self.logger.error(f"خطأ في تشفير الملف {file_path}: {e}")
            return False
    
    def decrypt_file(self, encrypted_file_path, output_path):
        """فك تشفير ملف"""
        try:
            with open(encrypted_file_path, 'rb') as f:
                encrypted_data = f.read()
            
            decrypted_data = self.encryption_key.decrypt(encrypted_data)
            
            with open(output_path, 'wb') as f:
                f.write(decrypted_data)
            
            return True
        except Exception as e:
            self.logger.error(f"خطأ في فك تشفير الملف {encrypted_file_path}: {e}")
            return False
    
    def create_database_backup(self):
        """إنشاء نسخة احتياطية من قاعدة البيانات"""
        db_path = self.config['database_path']
        
        if not os.path.exists(db_path):
            self.logger.warning(f"قاعدة البيانات غير موجودة: {db_path}")
            return None
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"database_backup_{timestamp}.db"
        backup_path = os.path.join(self.config['backup_directory'], backup_name)
        
        try:
            # إنشاء مجلد النسخ الاحتياطية
            os.makedirs(self.config['backup_directory'], exist_ok=True)
            
            # نسخ قاعدة البيانات
            shutil.copy2(db_path, backup_path)
            
            # حساب checksum للتحقق من سلامة البيانات
            checksum = self.calculate_checksum(backup_path)
            
            self.logger.info(f"تم إنشاء نسخة احتياطية من قاعدة البيانات: {backup_path}")
            
            return {
                'path': backup_path,
                'checksum': checksum,
                'size': os.path.getsize(backup_path),
                'timestamp': timestamp
            }
            
        except Exception as e:
            self.logger.error(f"خطأ في إنشاء نسخة احتياطية من قاعدة البيانات: {e}")
            return None
    
    def create_full_backup(self):
        """إنشاء نسخة احتياطية كاملة"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"full_backup_{timestamp}"
        backup_dir = os.path.join(self.config['backup_directory'], backup_name)
        
        try:
            os.makedirs(backup_dir, exist_ok=True)
            
            backup_info = {
                'timestamp': timestamp,
                'type': 'full',
                'files': [],
                'total_size': 0,
                'checksum': None
            }
            
            # نسخ الملفات المحددة
            for pattern in self.config['include_files']:
                files = self.find_files_by_pattern(pattern)
                for file_path in files:
                    if self.should_exclude_file(file_path):
                        continue
                    
                    relative_path = os.path.relpath(file_path)
                    backup_file_path = os.path.join(backup_dir, relative_path)
                    
                    # إنشاء المجلدات المطلوبة
                    os.makedirs(os.path.dirname(backup_file_path), exist_ok=True)
                    
                    # نسخ الملف
                    shutil.copy2(file_path, backup_file_path)
                    
                    file_info = {
                        'original_path': file_path,
                        'backup_path': backup_file_path,
                        'size': os.path.getsize(file_path),
                        'checksum': self.calculate_checksum(file_path)
                    }
                    
                    backup_info['files'].append(file_info)
                    backup_info['total_size'] += file_info['size']
            
            # ضغط النسخة الاحتياطية
            if self.config['compression']['enabled']:
                compressed_path = f"{backup_dir}.zip"
                self.compress_backup(backup_dir, compressed_path)
                
                # حذف المجلد غير المضغوط
                shutil.rmtree(backup_dir)
                backup_info['compressed_path'] = compressed_path
                backup_info['compressed_size'] = os.path.getsize(compressed_path)
            
            # تشفير النسخة الاحتياطية
            if self.config['encryption']['enabled']:
                if self.encryption_key is None:
                    self.generate_encryption_key(self.config['encryption']['password'])
                
                encrypted_path = f"{compressed_path}.encrypted" if self.config['compression']['enabled'] else f"{backup_dir}.encrypted"
                source_path = compressed_path if self.config['compression']['enabled'] else backup_dir
                
                if self.encrypt_file(source_path, encrypted_path):
                    os.remove(source_path)
                    backup_info['encrypted_path'] = encrypted_path
                    backup_info['encrypted'] = True
            
            # حفظ معلومات النسخة الاحتياطية
            info_file = os.path.join(self.config['backup_directory'], f"{backup_name}_info.json")
            with open(info_file, 'w', encoding='utf-8') as f:
                json.dump(backup_info, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"تم إنشاء نسخة احتياطية كاملة: {backup_name}")
            
            return backup_info
            
        except Exception as e:
            self.logger.error(f"خطأ في إنشاء النسخة الاحتياطية الكاملة: {e}")
            return None
    
    def find_files_by_pattern(self, pattern):
        """البحث عن الملفات بناءً على النمط"""
        import glob
        return glob.glob(pattern, recursive=True)
    
    def should_exclude_file(self, file_path):
        """فحص إذا كان يجب استبعاد الملف"""
        import fnmatch
        
        for pattern in self.config['exclude_files']:
            if fnmatch.fnmatch(file_path, pattern):
                return True
        return False
    
    def compress_backup(self, source_dir, output_path):
        """ضغط النسخة الاحتياطية"""
        try:
            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED, 
                               compresslevel=self.config['compression']['level']) as zipf:
                
                for root, dirs, files in os.walk(source_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arc_name = os.path.relpath(file_path, source_dir)
                        zipf.write(file_path, arc_name)
            
            return True
        except Exception as e:
            self.logger.error(f"خطأ في ضغط النسخة الاحتياطية: {e}")
            return False
    
    def calculate_checksum(self, file_path):
        """حساب checksum للملف"""
        hash_md5 = hashlib.md5()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
            return hash_md5.hexdigest()
        except Exception as e:
            self.logger.error(f"خطأ في حساب checksum للملف {file_path}: {e}")
            return None
    
    def cleanup_old_backups(self):
        """حذف النسخ الاحتياطية القديمة"""
        try:
            backup_files = []
            
            # جمع جميع ملفات النسخ الاحتياطية
            for file in os.listdir(self.config['backup_directory']):
                if file.startswith('full_backup_') or file.startswith('database_backup_'):
                    file_path = os.path.join(self.config['backup_directory'], file)
                    backup_files.append({
                        'path': file_path,
                        'mtime': os.path.getmtime(file_path)
                    })
            
            # ترتيب حسب التاريخ (الأحدث أولاً)
            backup_files.sort(key=lambda x: x['mtime'], reverse=True)
            
            # حذف النسخ الزائدة
            max_backups = self.config['max_local_backups']
            if len(backup_files) > max_backups:
                for backup in backup_files[max_backups:]:
                    os.remove(backup['path'])
                    self.logger.info(f"تم حذف النسخة الاحتياطية القديمة: {backup['path']}")
            
        except Exception as e:
            self.logger.error(f"خطأ في تنظيف النسخ الاحتياطية القديمة: {e}")
    
    def restore_backup(self, backup_path, restore_path=None):
        """استعادة نسخة احتياطية"""
        try:
            if restore_path is None:
                restore_path = f"restored_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # فك التشفير إذا كان مشفراً
            if backup_path.endswith('.encrypted'):
                if self.encryption_key is None:
                    self.generate_encryption_key(self.config['encryption']['password'])
                
                decrypted_path = backup_path.replace('.encrypted', '')
                if not self.decrypt_file(backup_path, decrypted_path):
                    return False
                backup_path = decrypted_path
            
            # فك الضغط إذا كان مضغوطاً
            if backup_path.endswith('.zip'):
                with zipfile.ZipFile(backup_path, 'r') as zipf:
                    zipf.extractall(restore_path)
            else:
                shutil.copytree(backup_path, restore_path)
            
            self.logger.info(f"تم استعادة النسخة الاحتياطية إلى: {restore_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"خطأ في استعادة النسخة الاحتياطية: {e}")
            return False
    
    def send_notification(self, subject, message, attachment_path=None):
        """إرسال إشعار بالبريد الإلكتروني"""
        if not self.config['email_notifications']['enabled']:
            return
        
        try:
            msg = MimeMultipart()
            msg['From'] = self.config['email_notifications']['username']
            msg['Subject'] = subject
            
            msg.attach(MimeText(message, 'plain', 'utf-8'))
            
            # إضافة مرفق إذا وُجد
            if attachment_path and os.path.exists(attachment_path):
                with open(attachment_path, "rb") as attachment:
                    part = MimeBase('application', 'octet-stream')
                    part.set_payload(attachment.read())
                
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= {os.path.basename(attachment_path)}'
                )
                msg.attach(part)
            
            # إرسال الرسالة
            server = smtplib.SMTP(
                self.config['email_notifications']['smtp_server'],
                self.config['email_notifications']['smtp_port']
            )
            server.starttls()
            server.login(
                self.config['email_notifications']['username'],
                self.config['email_notifications']['password']
            )
            
            for recipient in self.config['email_notifications']['recipients']:
                msg['To'] = recipient
                server.send_message(msg)
                del msg['To']
            
            server.quit()
            self.logger.info("تم إرسال إشعار البريد الإلكتروني")
            
        except Exception as e:
            self.logger.error(f"خطأ في إرسال الإشعار: {e}")
    
    def schedule_backups(self):
        """جدولة النسخ الاحتياطية"""
        # النسخ الاحتياطية اليومية
        daily_time = self.config['backup_schedule']['daily']
        schedule.every().day.at(daily_time).do(self.run_daily_backup)
        
        # النسخ الاحتياطية الأسبوعية
        weekly_day = self.config['backup_schedule']['weekly']
        getattr(schedule.every(), weekly_day).at(daily_time).do(self.run_weekly_backup)
        
        # النسخ الاحتياطية الشهرية
        monthly_day = self.config['backup_schedule']['monthly']
        schedule.every().month.do(self.run_monthly_backup)
        
        self.logger.info("تم جدولة النسخ الاحتياطية")
    
    def run_daily_backup(self):
        """تشغيل النسخة الاحتياطية اليومية"""
        self.logger.info("بدء النسخة الاحتياطية اليومية")
        
        backup_info = self.create_database_backup()
        if backup_info:
            self.send_notification(
                "نسخة احتياطية يومية - نجحت",
                f"تم إنشاء نسخة احتياطية يومية بنجاح\n"
                f"الحجم: {backup_info['size']:,} بايت\n"
                f"التوقيت: {backup_info['timestamp']}"
            )
        else:
            self.send_notification(
                "نسخة احتياطية يومية - فشلت",
                "فشل في إنشاء النسخة الاحتياطية اليومية"
            )
        
        self.cleanup_old_backups()
    
    def run_weekly_backup(self):
        """تشغيل النسخة الاحتياطية الأسبوعية"""
        self.logger.info("بدء النسخة الاحتياطية الأسبوعية")
        
        backup_info = self.create_full_backup()
        if backup_info:
            self.send_notification(
                "نسخة احتياطية أسبوعية - نجحت",
                f"تم إنشاء نسخة احتياطية أسبوعية كاملة بنجاح\n"
                f"عدد الملفات: {len(backup_info['files'])}\n"
                f"الحجم الإجمالي: {backup_info['total_size']:,} بايت\n"
                f"التوقيت: {backup_info['timestamp']}"
            )
    
    def run_monthly_backup(self):
        """تشغيل النسخة الاحتياطية الشهرية"""
        self.logger.info("بدء النسخة الاحتياطية الشهرية")
        
        # نسخة احتياطية كاملة مع رفع سحابي
        backup_info = self.create_full_backup()
        if backup_info and self.config['cloud_storage']['enabled']:
            self.upload_to_cloud(backup_info)
    
    def upload_to_cloud(self, backup_info):
        """رفع النسخة الاحتياطية للسحابة"""
        # سيتم تطوير هذه الوظيفة لاحقاً حسب مزود الخدمة السحابية
        self.logger.info("رفع النسخة الاحتياطية للسحابة (قيد التطوير)")
    
    def start_scheduler(self):
        """بدء جدولة النسخ الاحتياطية"""
        self.running = True
        self.schedule_backups()
        
        def run_scheduler():
            while self.running:
                schedule.run_pending()
                time.sleep(60)  # فحص كل دقيقة
        
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        
        self.logger.info("تم بدء نظام النسخ الاحتياطي التلقائي")
    
    def stop_scheduler(self):
        """إيقاف جدولة النسخ الاحتياطية"""
        self.running = False
        schedule.clear()
        self.logger.info("تم إيقاف نظام النسخ الاحتياطي التلقائي")
    
    def get_backup_status(self):
        """الحصول على حالة النسخ الاحتياطية"""
        try:
            backup_dir = self.config['backup_directory']
            if not os.path.exists(backup_dir):
                return {
                    'total_backups': 0,
                    'total_size': 0,
                    'latest_backup': None,
                    'oldest_backup': None
                }
            
            backups = []
            total_size = 0
            
            for file in os.listdir(backup_dir):
                if file.startswith(('full_backup_', 'database_backup_')):
                    file_path = os.path.join(backup_dir, file)
                    file_size = os.path.getsize(file_path)
                    file_mtime = os.path.getmtime(file_path)
                    
                    backups.append({
                        'name': file,
                        'path': file_path,
                        'size': file_size,
                        'mtime': file_mtime,
                        'date': datetime.fromtimestamp(file_mtime)
                    })
                    total_size += file_size
            
            backups.sort(key=lambda x: x['mtime'])
            
            return {
                'total_backups': len(backups),
                'total_size': total_size,
                'latest_backup': backups[-1] if backups else None,
                'oldest_backup': backups[0] if backups else None,
                'backups': backups
            }
            
        except Exception as e:
            self.logger.error(f"خطأ في الحصول على حالة النسخ الاحتياطية: {e}")
            return None

# مثال على الاستخدام
if __name__ == "__main__":
    backup_system = AutoBackupSystem()
    
    # إنشاء نسخة احتياطية فورية
    print("إنشاء نسخة احتياطية فورية...")
    backup_info = backup_system.create_full_backup()
    
    if backup_info:
        print(f"تم إنشاء النسخة الاحتياطية بنجاح!")
        print(f"عدد الملفات: {len(backup_info['files'])}")
        print(f"الحجم الإجمالي: {backup_info['total_size']:,} بايت")
    
    # بدء النظام التلقائي
    print("بدء نظام النسخ الاحتياطي التلقائي...")
    backup_system.start_scheduler()
    
    # عرض حالة النسخ الاحتياطية
    status = backup_system.get_backup_status()
    if status:
        print(f"إجمالي النسخ الاحتياطية: {status['total_backups']}")
        print(f"الحجم الإجمالي: {status['total_size']:,} بايت")
