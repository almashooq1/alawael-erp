from flask import request, session, current_app
from datetime import datetime, timedelta
import secrets
import pyotp
import qrcode
import io
import base64
import json
import hashlib
import hmac
from cryptography.fernet import Fernet
from security_models import *
from models import db, User
import re
import geoip2.database
from user_agents import parse
import logging

class DataEncryptionService:
    """خدمة تشفير البيانات الحساسة"""
    
    def __init__(self):
        self.encryption_key = current_app.config.get('ENCRYPTION_KEY', Fernet.generate_key())
        self.cipher_suite = Fernet(self.encryption_key)
    
    def encrypt_sensitive_data(self, data, data_type='general'):
        """تشفير البيانات الحساسة"""
        try:
            if data is None:
                return None
            
            # تحويل البيانات إلى نص
            if isinstance(data, dict):
                data = json.dumps(data, ensure_ascii=False)
            elif not isinstance(data, str):
                data = str(data)
            
            # تشفير البيانات
            encrypted_data = self.cipher_suite.encrypt(data.encode('utf-8'))
            
            # تسجيل عملية التشفير
            self._log_encryption_operation('encrypt', data_type, True)
            
            return base64.b64encode(encrypted_data).decode('utf-8')
            
        except Exception as e:
            self._log_encryption_operation('encrypt', data_type, False, str(e))
            raise Exception(f"خطأ في تشفير البيانات: {str(e)}")
    
    def decrypt_sensitive_data(self, encrypted_data, data_type='general'):
        """فك تشفير البيانات الحساسة"""
        try:
            if encrypted_data is None:
                return None
            
            # فك الترميز وفك التشفير
            decoded_data = base64.b64decode(encrypted_data.encode('utf-8'))
            decrypted_data = self.cipher_suite.decrypt(decoded_data)
            
            # تسجيل عملية فك التشفير
            self._log_encryption_operation('decrypt', data_type, True)
            
            return decrypted_data.decode('utf-8')
            
        except Exception as e:
            self._log_encryption_operation('decrypt', data_type, False, str(e))
            raise Exception(f"خطأ في فك تشفير البيانات: {str(e)}")
    
    def _log_encryption_operation(self, operation, data_type, success, error=None):
        """تسجيل عمليات التشفير"""
        try:
            audit_log = AuditLog(
                user_id=session.get('user_id'),
                action_type=f'encryption_{operation}',
                resource_type='data_encryption',
                action_description=f'{operation} {data_type} data',
                ip_address=request.remote_addr if request else None,
                user_agent=request.user_agent.string if request else None,
                risk_level='medium' if success else 'high',
                metadata=json.dumps({
                    'data_type': data_type,
                    'success': success,
                    'error': error
                }, ensure_ascii=False)
            )
            db.session.add(audit_log)
            db.session.commit()
        except Exception:
            pass

class TwoFactorAuthService:
    """خدمة المصادقة الثنائية"""
    
    def setup_totp(self, user_id, issuer_name="مراكز الأوائل"):
        """إعداد TOTP للمستخدم"""
        try:
            user = User.query.get(user_id)
            if not user:
                raise Exception("المستخدم غير موجود")
            
            # توليد مفتاح سري جديد
            secret = pyotp.random_base32()
            
            # إنشاء أو تحديث سجل MFA
            mfa_record = MultiFactorAuth.query.filter_by(
                user_id=user_id, 
                method_type='totp'
            ).first()
            
            if not mfa_record:
                mfa_record = MultiFactorAuth(
                    user_id=user_id,
                    method_type='totp'
                )
            
            # تشفير المفتاح السري
            encryption_service = DataEncryptionService()
            mfa_record.secret_key = encryption_service.encrypt_sensitive_data(secret, 'totp_secret')
            mfa_record.is_active = True
            mfa_record.is_verified = False
            
            db.session.add(mfa_record)
            db.session.commit()
            
            # توليد QR Code
            totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=user.email,
                issuer_name=issuer_name
            )
            
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(totp_uri)
            qr.make(fit=True)
            
            qr_img = qr.make_image(fill_color="black", back_color="white")
            img_buffer = io.BytesIO()
            qr_img.save(img_buffer, format='PNG')
            qr_code_data = base64.b64encode(img_buffer.getvalue()).decode()
            
            # تسجيل العملية
            self._log_mfa_operation(user_id, 'setup_totp', True)
            
            return {
                'secret': secret,
                'qr_code': f"data:image/png;base64,{qr_code_data}",
                'backup_codes': self._generate_backup_codes(user_id)
            }
            
        except Exception as e:
            self._log_mfa_operation(user_id, 'setup_totp', False, str(e))
            raise Exception(f"خطأ في إعداد المصادقة الثنائية: {str(e)}")
    
    def verify_totp(self, user_id, code):
        """التحقق من رمز TOTP"""
        try:
            mfa_record = MultiFactorAuth.query.filter_by(
                user_id=user_id, 
                method_type='totp',
                is_active=True
            ).first()
            
            if not mfa_record:
                raise Exception("المصادقة الثنائية غير مفعلة")
            
            # فك تشفير المفتاح السري
            encryption_service = DataEncryptionService()
            secret = encryption_service.decrypt_sensitive_data(mfa_record.secret_key, 'totp_secret')
            
            # التحقق من الرمز
            totp = pyotp.TOTP(secret)
            is_valid = totp.verify(code, valid_window=1)
            
            # تسجيل المحاولة
            attempt = MFAAttempt(
                user_id=user_id,
                method_type='totp',
                code_entered=code,
                ip_address=request.remote_addr if request else None,
                user_agent=request.user_agent.string if request else None,
                is_successful=is_valid,
                expires_at=datetime.utcnow() + timedelta(minutes=5)
            )
            db.session.add(attempt)
            
            if is_valid:
                mfa_record.last_used = datetime.utcnow()
                mfa_record.is_verified = True
                
            db.session.commit()
            
            # تسجيل العملية
            self._log_mfa_operation(user_id, 'verify_totp', is_valid)
            
            return is_valid
            
        except Exception as e:
            self._log_mfa_operation(user_id, 'verify_totp', False, str(e))
            return False
    
    def send_sms_code(self, user_id, phone_number):
        """إرسال رمز SMS"""
        try:
            # توليد رمز عشوائي
            code = str(secrets.randbelow(900000) + 100000)
            
            # تشفير الرمز وحفظه
            encryption_service = DataEncryptionService()
            encrypted_code = encryption_service.encrypt_sensitive_data(code, 'sms_code')
            
            # حفظ أو تحديث سجل MFA
            mfa_record = MultiFactorAuth.query.filter_by(
                user_id=user_id, 
                method_type='sms'
            ).first()
            
            if not mfa_record:
                mfa_record = MultiFactorAuth(
                    user_id=user_id,
                    method_type='sms'
                )
            
            mfa_record.phone_number = phone_number
            mfa_record.secret_key = encrypted_code
            mfa_record.is_active = True
            
            db.session.add(mfa_record)
            
            # تسجيل المحاولة
            attempt = MFAAttempt(
                user_id=user_id,
                method_type='sms',
                code_sent=encrypted_code,
                ip_address=request.remote_addr if request else None,
                user_agent=request.user_agent.string if request else None,
                expires_at=datetime.utcnow() + timedelta(minutes=5)
            )
            db.session.add(attempt)
            db.session.commit()
            
            # إرسال SMS (يحتاج تكامل مع خدمة SMS)
            # هنا يمكن استخدام خدمة مثل Twilio أو STC
            
            self._log_mfa_operation(user_id, 'send_sms', True)
            
            return True
            
        except Exception as e:
            self._log_mfa_operation(user_id, 'send_sms', False, str(e))
            return False
    
    def _generate_backup_codes(self, user_id):
        """توليد رموز النسخ الاحتياطي"""
        codes = []
        for _ in range(10):
            code = secrets.token_hex(4).upper()
            codes.append(f"{code[:4]}-{code[4:]}")
        
        # تشفير وحفظ الرموز
        encryption_service = DataEncryptionService()
        encrypted_codes = encryption_service.encrypt_sensitive_data(
            json.dumps(codes), 'backup_codes'
        )
        
        mfa_record = MultiFactorAuth.query.filter_by(
            user_id=user_id, 
            method_type='backup_codes'
        ).first()
        
        if not mfa_record:
            mfa_record = MultiFactorAuth(
                user_id=user_id,
                method_type='backup_codes'
            )
        
        mfa_record.backup_codes = encrypted_codes
        mfa_record.is_active = True
        
        db.session.add(mfa_record)
        db.session.commit()
        
        return codes
    
    def _log_mfa_operation(self, user_id, operation, success, error=None):
        """تسجيل عمليات المصادقة الثنائية"""
        try:
            audit_log = AuditLog(
                user_id=user_id,
                action_type=f'mfa_{operation}',
                resource_type='multi_factor_auth',
                action_description=f'MFA {operation}',
                ip_address=request.remote_addr if request else None,
                user_agent=request.user_agent.string if request else None,
                risk_level='medium' if success else 'high',
                metadata=json.dumps({
                    'operation': operation,
                    'success': success,
                    'error': error
                }, ensure_ascii=False)
            )
            db.session.add(audit_log)
            db.session.commit()
        except Exception:
            pass

class SecurityAuditService:
    """خدمة تسجيل العمليات الأمنية"""
    
    def log_user_action(self, user_id, action_type, resource_type, resource_id=None, 
                       description=None, old_values=None, new_values=None, risk_level='low'):
        """تسجيل عمليات المستخدم"""
        try:
            # تحليل المخاطر
            calculated_risk = self._calculate_risk_level(action_type, resource_type, user_id)
            final_risk = max(risk_level, calculated_risk, key=lambda x: ['low', 'medium', 'high', 'critical'].index(x))
            
            # تحليل الموقع الجغرافي
            location = self._get_location_info(request.remote_addr if request else None)
            
            # تحليل User Agent
            user_agent_info = self._parse_user_agent(request.user_agent.string if request else None)
            
            audit_log = AuditLog(
                user_id=user_id,
                session_id=session.get('session_id'),
                action_type=action_type,
                resource_type=resource_type,
                resource_id=str(resource_id) if resource_id else None,
                action_description=description or f"{action_type} on {resource_type}",
                old_values=self._encrypt_if_sensitive(old_values),
                new_values=self._encrypt_if_sensitive(new_values),
                ip_address=request.remote_addr if request else None,
                user_agent=request.user_agent.string if request else None,
                location=location,
                risk_level=final_risk,
                is_suspicious=self._detect_suspicious_activity(user_id, action_type),
                metadata=json.dumps({
                    'user_agent_info': user_agent_info,
                    'timestamp': datetime.utcnow().isoformat(),
                    'session_duration': self._get_session_duration()
                }, ensure_ascii=False)
            )
            
            db.session.add(audit_log)
            db.session.commit()
            
            # إنشاء تنبيه أمني إذا لزم الأمر
            if final_risk in ['high', 'critical'] or audit_log.is_suspicious:
                self._create_security_alert(audit_log)
            
            return audit_log.id
            
        except Exception as e:
            logging.error(f"خطأ في تسجيل العملية الأمنية: {str(e)}")
            return None
    
    def _calculate_risk_level(self, action_type, resource_type, user_id):
        """حساب مستوى المخاطر"""
        risk_score = 0
        
        # مخاطر نوع العملية
        high_risk_actions = ['delete', 'admin_access', 'permission_change', 'system_config']
        medium_risk_actions = ['update', 'create', 'export', 'bulk_operation']
        
        if action_type in high_risk_actions:
            risk_score += 3
        elif action_type in medium_risk_actions:
            risk_score += 2
        else:
            risk_score += 1
        
        # مخاطر نوع المورد
        sensitive_resources = ['user', 'financial_record', 'medical_record', 'security_config']
        if resource_type in sensitive_resources:
            risk_score += 2
        
        # مخاطر التوقيت (خارج ساعات العمل)
        current_hour = datetime.now().hour
        if current_hour < 6 or current_hour > 22:
            risk_score += 1
        
        # مخاطر IP جديد
        if self._is_new_ip_for_user(user_id):
            risk_score += 2
        
        # تحويل النقاط إلى مستوى
        if risk_score >= 6:
            return 'critical'
        elif risk_score >= 4:
            return 'high'
        elif risk_score >= 2:
            return 'medium'
        else:
            return 'low'
    
    def _detect_suspicious_activity(self, user_id, action_type):
        """كشف النشاط المشبوه"""
        try:
            # فحص محاولات متعددة في فترة قصيرة
            recent_attempts = AuditLog.query.filter(
                AuditLog.user_id == user_id,
                AuditLog.created_at >= datetime.utcnow() - timedelta(minutes=5),
                AuditLog.action_type == action_type
            ).count()
            
            if recent_attempts > 10:
                return True
            
            # فحص محاولات فاشلة متكررة
            failed_attempts = AuditLog.query.filter(
                AuditLog.user_id == user_id,
                AuditLog.created_at >= datetime.utcnow() - timedelta(minutes=15),
                AuditLog.action_type.like('%failed%')
            ).count()
            
            if failed_attempts > 5:
                return True
            
            return False
            
        except Exception:
            return False
    
    def _encrypt_if_sensitive(self, data):
        """تشفير البيانات الحساسة"""
        if data is None:
            return None
        
        try:
            data_str = json.dumps(data, ensure_ascii=False) if isinstance(data, dict) else str(data)
            
            # فحص البيانات الحساسة
            sensitive_patterns = [
                r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',  # أرقام بطاقات
                r'\b\d{10,14}\b',  # أرقام هوية
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # إيميل
                r'\b\+?[1-9]\d{1,14}\b'  # أرقام هواتف
            ]
            
            is_sensitive = any(re.search(pattern, data_str) for pattern in sensitive_patterns)
            
            if is_sensitive:
                encryption_service = DataEncryptionService()
                return encryption_service.encrypt_sensitive_data(data_str, 'audit_data')
            
            return data_str
            
        except Exception:
            return str(data)
    
    def _get_location_info(self, ip_address):
        """الحصول على معلومات الموقع الجغرافي"""
        try:
            if not ip_address or ip_address in ['127.0.0.1', 'localhost']:
                return 'Local'
            
            # هنا يمكن استخدام خدمة GeoIP
            # reader = geoip2.database.Reader('GeoLite2-City.mmdb')
            # response = reader.city(ip_address)
            # return f"{response.city.name}, {response.country.name}"
            
            return 'Unknown'
            
        except Exception:
            return 'Unknown'
    
    def _parse_user_agent(self, user_agent_string):
        """تحليل User Agent"""
        try:
            if not user_agent_string:
                return {}
            
            parsed = parse(user_agent_string)
            return {
                'browser': f"{parsed.browser.family} {parsed.browser.version_string}",
                'os': f"{parsed.os.family} {parsed.os.version_string}",
                'device': parsed.device.family,
                'is_mobile': parsed.is_mobile,
                'is_tablet': parsed.is_tablet,
                'is_pc': parsed.is_pc
            }
            
        except Exception:
            return {}
    
    def _get_session_duration(self):
        """حساب مدة الجلسة"""
        try:
            session_start = session.get('session_start')
            if session_start:
                duration = datetime.utcnow() - datetime.fromisoformat(session_start)
                return int(duration.total_seconds())
            return 0
        except Exception:
            return 0
    
    def _is_new_ip_for_user(self, user_id):
        """فحص إذا كان IP جديد للمستخدم"""
        try:
            current_ip = request.remote_addr if request else None
            if not current_ip:
                return False
            
            # فحص آخر 30 يوم
            existing_ip = AuditLog.query.filter(
                AuditLog.user_id == user_id,
                AuditLog.ip_address == current_ip,
                AuditLog.created_at >= datetime.utcnow() - timedelta(days=30)
            ).first()
            
            return existing_ip is None
            
        except Exception:
            return False
    
    def _create_security_alert(self, audit_log):
        """إنشاء تنبيه أمني"""
        try:
            alert = SecurityAlert(
                alert_type='suspicious_activity',
                severity=audit_log.risk_level,
                title=f"نشاط مشبوه: {audit_log.action_type}",
                message=f"تم رصد نشاط مشبوه من المستخدم {audit_log.user_id}",
                source_system='audit_service',
                user_id=audit_log.user_id,
                ip_address=audit_log.ip_address,
                metadata=json.dumps({
                    'audit_log_id': audit_log.id,
                    'action_type': audit_log.action_type,
                    'resource_type': audit_log.resource_type,
                    'risk_level': audit_log.risk_level
                }, ensure_ascii=False)
            )
            
            db.session.add(alert)
            db.session.commit()
            
        except Exception as e:
            logging.error(f"خطأ في إنشاء التنبيه الأمني: {str(e)}")
