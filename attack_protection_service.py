from flask import request, session, current_app, abort
from datetime import datetime, timedelta
import re
import json
import hashlib
import ipaddress
from collections import defaultdict, deque
from security_models import *
from models import db
import logging
import time

class AttackProtectionService:
    """خدمة الحماية من الهجمات الأمنية"""
    
    def __init__(self):
        self.rate_limits = defaultdict(deque)
        self.blocked_ips = set()
        self.suspicious_patterns = self._load_attack_patterns()
        self.whitelist_ips = self._load_whitelist_ips()
    
    def check_rate_limiting(self, identifier, limit=100, window=3600):
        """فحص حدود المعدل (Rate Limiting)"""
        try:
            current_time = time.time()
            
            # تنظيف الطلبات القديمة
            while self.rate_limits[identifier] and self.rate_limits[identifier][0] < current_time - window:
                self.rate_limits[identifier].popleft()
            
            # فحص الحد الأقصى
            if len(self.rate_limits[identifier]) >= limit:
                self._log_attack_attempt('rate_limiting', identifier, 'Rate limit exceeded')
                return False
            
            # إضافة الطلب الحالي
            self.rate_limits[identifier].append(current_time)
            return True
            
        except Exception as e:
            logging.error(f"خطأ في فحص Rate Limiting: {str(e)}")
            return True
    
    def detect_sql_injection(self, input_data):
        """كشف محاولات SQL Injection"""
        if not input_data:
            return False
        
        # أنماط SQL Injection الشائعة
        sql_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
            r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
            r"(\b(OR|AND)\s+['\"]?\w+['\"]?\s*=\s*['\"]?\w+['\"]?)",
            r"(--|#|/\*|\*/)",
            r"(\bUNION\s+(ALL\s+)?SELECT\b)",
            r"(\bINTO\s+OUTFILE\b)",
            r"(\bLOAD_FILE\s*\()",
            r"(\bCHAR\s*\(\s*\d+)",
            r"(\bCONCAT\s*\()",
            r"(\bSUBSTRING\s*\()",
            r"(\bASCII\s*\()",
            r"(\bBENCHMARK\s*\()",
            r"(\bSLEEP\s*\()",
            r"(\bWAITFOR\s+DELAY\b)"
        ]
        
        input_str = str(input_data).upper()
        
        for pattern in sql_patterns:
            if re.search(pattern, input_str, re.IGNORECASE):
                self._log_attack_attempt('sql_injection', request.remote_addr, f"SQL Injection detected: {pattern}")
                return True
        
        return False
    
    def detect_xss_attack(self, input_data):
        """كشف محاولات XSS"""
        if not input_data:
            return False
        
        # أنماط XSS الشائعة
        xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"vbscript:",
            r"onload\s*=",
            r"onerror\s*=",
            r"onclick\s*=",
            r"onmouseover\s*=",
            r"onfocus\s*=",
            r"onblur\s*=",
            r"onchange\s*=",
            r"onsubmit\s*=",
            r"<iframe[^>]*>",
            r"<object[^>]*>",
            r"<embed[^>]*>",
            r"<link[^>]*>",
            r"<meta[^>]*>",
            r"expression\s*\(",
            r"url\s*\(",
            r"@import",
            r"<\s*img[^>]+src\s*=\s*[\"']?\s*javascript:",
            r"<\s*body[^>]+onload\s*="
        ]
        
        input_str = str(input_data)
        
        for pattern in xss_patterns:
            if re.search(pattern, input_str, re.IGNORECASE):
                self._log_attack_attempt('xss_attack', request.remote_addr, f"XSS attack detected: {pattern}")
                return True
        
        return False
    
    def detect_path_traversal(self, input_data):
        """كشف محاولات Path Traversal"""
        if not input_data:
            return False
        
        # أنماط Path Traversal
        traversal_patterns = [
            r"\.\./",
            r"\.\.\\",
            r"%2e%2e%2f",
            r"%2e%2e/",
            r"..%2f",
            r"%2e%2e%5c",
            r"..%5c",
            r"%252e%252e%252f",
            r"..%252f",
            r"..%c0%af",
            r"..%c1%9c"
        ]
        
        input_str = str(input_data).lower()
        
        for pattern in traversal_patterns:
            if re.search(pattern, input_str, re.IGNORECASE):
                self._log_attack_attempt('path_traversal', request.remote_addr, f"Path traversal detected: {pattern}")
                return True
        
        return False
    
    def detect_command_injection(self, input_data):
        """كشف محاولات Command Injection"""
        if not input_data:
            return False
        
        # أنماط Command Injection
        command_patterns = [
            r"[;&|`$(){}[\]<>]",
            r"\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|wget|curl|nc|telnet|ssh|ftp)\b",
            r"(&&|\|\|)",
            r"(\$\(|\`)",
            r"(\${|%ENV)",
            r"(\\x[0-9a-f]{2})",
            r"(%[0-9a-f]{2})",
            r"(eval\s*\()",
            r"(exec\s*\()",
            r"(system\s*\()",
            r"(shell_exec\s*\()",
            r"(passthru\s*\()",
            r"(popen\s*\()"
        ]
        
        input_str = str(input_data)
        
        for pattern in command_patterns:
            if re.search(pattern, input_str, re.IGNORECASE):
                self._log_attack_attempt('command_injection', request.remote_addr, f"Command injection detected: {pattern}")
                return True
        
        return False
    
    def detect_csrf_attack(self):
        """كشف محاولات CSRF"""
        try:
            if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
                # فحص CSRF Token
                token = request.form.get('csrf_token') or request.headers.get('X-CSRF-Token')
                expected_token = session.get('csrf_token')
                
                if not token or not expected_token or token != expected_token:
                    self._log_attack_attempt('csrf_attack', request.remote_addr, 'Invalid or missing CSRF token')
                    return True
                
                # فحص Referer Header
                referer = request.headers.get('Referer', '')
                if referer and not self._is_valid_referer(referer):
                    self._log_attack_attempt('csrf_attack', request.remote_addr, f'Invalid referer: {referer}')
                    return True
            
            return False
            
        except Exception as e:
            logging.error(f"خطأ في فحص CSRF: {str(e)}")
            return False
    
    def check_ip_reputation(self, ip_address):
        """فحص سمعة عنوان IP"""
        try:
            if not ip_address or ip_address in self.whitelist_ips:
                return True
            
            if ip_address in self.blocked_ips:
                self._log_attack_attempt('blocked_ip', ip_address, 'IP in blocklist')
                return False
            
            # فحص محاولات فاشلة متكررة
            recent_failures = AuditLog.query.filter(
                AuditLog.ip_address == ip_address,
                AuditLog.created_at >= datetime.utcnow() - timedelta(hours=1),
                AuditLog.risk_level.in_(['high', 'critical'])
            ).count()
            
            if recent_failures > 10:
                self.blocked_ips.add(ip_address)
                self._log_attack_attempt('ip_blocked', ip_address, f'IP blocked due to {recent_failures} suspicious activities')
                return False
            
            return True
            
        except Exception as e:
            logging.error(f"خطأ في فحص سمعة IP: {str(e)}")
            return True
    
    def detect_brute_force_attack(self, username, ip_address):
        """كشف هجمات Brute Force"""
        try:
            # فحص محاولات تسجيل الدخول الفاشلة
            failed_attempts = AuditLog.query.filter(
                AuditLog.action_type == 'login_failed',
                AuditLog.ip_address == ip_address,
                AuditLog.created_at >= datetime.utcnow() - timedelta(minutes=15)
            ).count()
            
            if failed_attempts > 5:
                self._log_attack_attempt('brute_force', ip_address, f'Brute force detected: {failed_attempts} failed attempts')
                return True
            
            # فحص محاولات على مستخدمين متعددين
            user_attempts = AuditLog.query.filter(
                AuditLog.action_type == 'login_failed',
                AuditLog.ip_address == ip_address,
                AuditLog.created_at >= datetime.utcnow() - timedelta(minutes=30)
            ).distinct(AuditLog.user_id).count()
            
            if user_attempts > 10:
                self._log_attack_attempt('brute_force', ip_address, f'Multiple user brute force: {user_attempts} users')
                return True
            
            return False
            
        except Exception as e:
            logging.error(f"خطأ في كشف Brute Force: {str(e)}")
            return False
    
    def sanitize_input(self, input_data, input_type='general'):
        """تنظيف وتعقيم المدخلات"""
        if input_data is None:
            return None
        
        try:
            input_str = str(input_data)
            
            # إزالة الأحرف الخطيرة حسب نوع المدخل
            if input_type == 'sql':
                # تنظيف SQL
                input_str = re.sub(r"[';\"\\]", "", input_str)
                input_str = re.sub(r"\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b", "", input_str, flags=re.IGNORECASE)
            
            elif input_type == 'html':
                # تنظيف HTML
                input_str = re.sub(r"<[^>]*>", "", input_str)
                input_str = input_str.replace("&", "&amp;")
                input_str = input_str.replace("<", "&lt;")
                input_str = input_str.replace(">", "&gt;")
                input_str = input_str.replace("\"", "&quot;")
                input_str = input_str.replace("'", "&#x27;")
            
            elif input_type == 'filename':
                # تنظيف أسماء الملفات
                input_str = re.sub(r"[^\w\-_\.]", "", input_str)
                input_str = re.sub(r"\.{2,}", ".", input_str)
            
            elif input_type == 'email':
                # تنظيف الإيميل
                input_str = re.sub(r"[^\w@\.\-]", "", input_str)
            
            else:
                # تنظيف عام
                input_str = re.sub(r"[<>\"'&;]", "", input_str)
            
            return input_str.strip()
            
        except Exception as e:
            logging.error(f"خطأ في تنظيف المدخلات: {str(e)}")
            return ""
    
    def generate_csrf_token(self):
        """توليد CSRF Token"""
        try:
            import secrets
            token = secrets.token_urlsafe(32)
            session['csrf_token'] = token
            return token
        except Exception as e:
            logging.error(f"خطأ في توليد CSRF Token: {str(e)}")
            return None
    
    def _load_attack_patterns(self):
        """تحميل أنماط الهجمات"""
        return {
            'sql_injection': [
                'union select', 'drop table', 'insert into', 'delete from',
                'update set', 'create table', 'alter table', 'exec sp_',
                'xp_cmdshell', 'sp_executesql'
            ],
            'xss': [
                '<script>', 'javascript:', 'vbscript:', 'onload=',
                'onerror=', 'onclick=', 'onmouseover=', '<iframe>',
                '<object>', '<embed>'
            ],
            'command_injection': [
                '&&', '||', ';', '|', '`', '$(',
                'cat ', 'ls ', 'pwd', 'whoami', 'id',
                'uname', 'ps ', 'netstat', 'ifconfig'
            ]
        }
    
    def _load_whitelist_ips(self):
        """تحميل قائمة IP المسموحة"""
        try:
            # يمكن تحميلها من قاعدة البيانات أو ملف تكوين
            whitelist = set()
            
            # إضافة IP المحلية
            whitelist.add('127.0.0.1')
            whitelist.add('::1')
            whitelist.add('localhost')
            
            # إضافة شبكات محلية
            local_networks = [
                '192.168.0.0/16',
                '10.0.0.0/8',
                '172.16.0.0/12'
            ]
            
            return whitelist
            
        except Exception:
            return set()
    
    def _is_valid_referer(self, referer):
        """فحص صحة Referer Header"""
        try:
            from urllib.parse import urlparse
            parsed_referer = urlparse(referer)
            allowed_hosts = [
                request.host,
                'localhost',
                '127.0.0.1'
            ]
            
            return parsed_referer.hostname in allowed_hosts
            
        except Exception:
            return False
    
    def _log_attack_attempt(self, attack_type, source_ip, details):
        """تسجيل محاولة الهجوم"""
        try:
            incident = SecurityIncident(
                incident_type=attack_type,
                severity='high',
                title=f"محاولة هجوم: {attack_type}",
                description=f"تم رصد محاولة هجوم من نوع {attack_type}",
                source_ip=source_ip,
                user_agent=request.user_agent.string if request else None,
                attack_vector=details,
                impact_assessment="محاولة هجوم تم إيقافها",
                containment_actions="تم حجب الطلب تلقائياً",
                detected_at=datetime.utcnow()
            )
            
            db.session.add(incident)
            
            # إنشاء تنبيه أمني
            alert = SecurityAlert(
                alert_type=attack_type,
                severity='high',
                title=f"هجوم محتمل: {attack_type}",
                message=f"تم رصد محاولة هجوم من {source_ip}",
                source_system='attack_protection',
                ip_address=source_ip,
                metadata=json.dumps({
                    'attack_type': attack_type,
                    'details': details,
                    'timestamp': datetime.utcnow().isoformat()
                }, ensure_ascii=False)
            )
            
            db.session.add(alert)
            db.session.commit()
            
            logging.warning(f"Attack detected: {attack_type} from {source_ip} - {details}")
            
        except Exception as e:
            logging.error(f"خطأ في تسجيل محاولة الهجوم: {str(e)}")

class SessionManagementService:
    """خدمة إدارة الجلسات المتقدمة"""
    
    def __init__(self):
        self.session_timeout = 3600  # ساعة واحدة
        self.max_sessions_per_user = 5
        self.session_encryption_key = current_app.config.get('SESSION_ENCRYPTION_KEY', Fernet.generate_key())
    
    def create_secure_session(self, user_id, remember_me=False):
        """إنشاء جلسة آمنة"""
        try:
            # إنهاء الجلسات القديمة إذا تجاوزت الحد الأقصى
            self._cleanup_old_sessions(user_id)
            
            # توليد رمز جلسة آمن
            session_token = self._generate_session_token()
            
            # تحليل معلومات الجهاز
            device_info = self._get_device_fingerprint()
            
            # حساب وقت انتهاء الجلسة
            timeout = 30 * 24 * 3600 if remember_me else self.session_timeout  # 30 يوم أو ساعة
            expires_at = datetime.utcnow() + timedelta(seconds=timeout)
            
            # إنشاء سجل الجلسة
            session_security = SessionSecurity(
                user_id=user_id,
                session_token=session_token,
                ip_address=request.remote_addr if request else None,
                user_agent=request.user_agent.string if request else None,
                location=self._get_location_info(),
                device_fingerprint=device_info,
                expires_at=expires_at,
                last_activity=datetime.utcnow()
            )
            
            db.session.add(session_security)
            db.session.commit()
            
            # تعيين معلومات الجلسة
            session['session_id'] = session_security.id
            session['session_token'] = session_token
            session['user_id'] = user_id
            session['session_start'] = datetime.utcnow().isoformat()
            session['device_fingerprint'] = device_info
            
            # تسجيل إنشاء الجلسة
            self._log_session_event(user_id, 'session_created', session_security.id)
            
            return session_security.id
            
        except Exception as e:
            logging.error(f"خطأ في إنشاء الجلسة: {str(e)}")
            return None
    
    def validate_session(self, session_id, session_token):
        """التحقق من صحة الجلسة"""
        try:
            session_record = SessionSecurity.query.filter_by(
                id=session_id,
                session_token=session_token,
                is_active=True
            ).first()
            
            if not session_record:
                return False
            
            # فحص انتهاء الجلسة
            if session_record.expires_at < datetime.utcnow():
                self._terminate_session(session_id, 'expired')
                return False
            
            # فحص النشاط الأخير
            if session_record.last_activity < datetime.utcnow() - timedelta(seconds=self.session_timeout):
                self._terminate_session(session_id, 'timeout')
                return False
            
            # فحص الجهاز والموقع
            current_fingerprint = self._get_device_fingerprint()
            if session_record.device_fingerprint != current_fingerprint:
                self._flag_suspicious_session(session_id, 'device_mismatch')
            
            current_ip = request.remote_addr if request else None
            if current_ip and session_record.ip_address != current_ip:
                self._flag_suspicious_session(session_id, 'ip_change')
            
            # تحديث النشاط الأخير
            session_record.last_activity = datetime.utcnow()
            db.session.commit()
            
            return True
            
        except Exception as e:
            logging.error(f"خطأ في التحقق من الجلسة: {str(e)}")
            return False
    
    def terminate_session(self, session_id, reason='user_logout'):
        """إنهاء الجلسة"""
        return self._terminate_session(session_id, reason)
    
    def terminate_all_user_sessions(self, user_id, except_current=True):
        """إنهاء جميع جلسات المستخدم"""
        try:
            current_session_id = session.get('session_id')
            
            query = SessionSecurity.query.filter_by(user_id=user_id, is_active=True)
            
            if except_current and current_session_id:
                query = query.filter(SessionSecurity.id != current_session_id)
            
            sessions = query.all()
            
            for session_record in sessions:
                session_record.is_active = False
                
            db.session.commit()
            
            # تسجيل العملية
            self._log_session_event(user_id, 'all_sessions_terminated', len(sessions))
            
            return len(sessions)
            
        except Exception as e:
            logging.error(f"خطأ في إنهاء جلسات المستخدم: {str(e)}")
            return 0
    
    def get_active_sessions(self, user_id):
        """الحصول على الجلسات النشطة للمستخدم"""
        try:
            sessions = SessionSecurity.query.filter_by(
                user_id=user_id,
                is_active=True
            ).filter(
                SessionSecurity.expires_at > datetime.utcnow()
            ).all()
            
            session_list = []
            for sess in sessions:
                session_info = {
                    'id': sess.id,
                    'ip_address': sess.ip_address,
                    'location': sess.location,
                    'user_agent': sess.user_agent,
                    'last_activity': sess.last_activity.isoformat() if sess.last_activity else None,
                    'created_at': sess.created_at.isoformat() if sess.created_at else None,
                    'is_current': sess.id == session.get('session_id'),
                    'is_suspicious': sess.is_suspicious
                }
                session_list.append(session_info)
            
            return session_list
            
        except Exception as e:
            logging.error(f"خطأ في الحصول على الجلسات النشطة: {str(e)}")
            return []
    
    def _generate_session_token(self):
        """توليد رمز جلسة آمن"""
        import secrets
        return secrets.token_urlsafe(64)
    
    def _get_device_fingerprint(self):
        """الحصول على بصمة الجهاز"""
        try:
            if not request:
                return "unknown"
            
            # جمع معلومات الجهاز
            user_agent = request.user_agent.string or ""
            accept_language = request.headers.get('Accept-Language', "")
            accept_encoding = request.headers.get('Accept-Encoding', "")
            
            # إنشاء بصمة فريدة
            fingerprint_data = f"{user_agent}|{accept_language}|{accept_encoding}"
            
            import hashlib
            return hashlib.sha256(fingerprint_data.encode()).hexdigest()[:32]
            
        except Exception:
            return "unknown"
    
    def _get_location_info(self):
        """الحصول على معلومات الموقع"""
        try:
            ip_address = request.remote_addr if request else None
            if not ip_address or ip_address in ['127.0.0.1', 'localhost']:
                return 'Local'
            
            # هنا يمكن استخدام خدمة GeoIP
            return 'Unknown'
            
        except Exception:
            return 'Unknown'
    
    def _cleanup_old_sessions(self, user_id):
        """تنظيف الجلسات القديمة"""
        try:
            # إنهاء الجلسات المنتهية الصلاحية
            expired_sessions = SessionSecurity.query.filter(
                SessionSecurity.user_id == user_id,
                SessionSecurity.expires_at < datetime.utcnow(),
                SessionSecurity.is_active == True
            ).all()
            
            for sess in expired_sessions:
                sess.is_active = False
            
            # الحد من عدد الجلسات النشطة
            active_sessions = SessionSecurity.query.filter_by(
                user_id=user_id,
                is_active=True
            ).order_by(SessionSecurity.last_activity.desc()).all()
            
            if len(active_sessions) >= self.max_sessions_per_user:
                # إنهاء أقدم الجلسات
                sessions_to_terminate = active_sessions[self.max_sessions_per_user-1:]
                for sess in sessions_to_terminate:
                    sess.is_active = False
            
            db.session.commit()
            
        except Exception as e:
            logging.error(f"خطأ في تنظيف الجلسات القديمة: {str(e)}")
    
    def _terminate_session(self, session_id, reason):
        """إنهاء جلسة محددة"""
        try:
            session_record = SessionSecurity.query.get(session_id)
            if session_record:
                session_record.is_active = False
                db.session.commit()
                
                # تسجيل إنهاء الجلسة
                self._log_session_event(session_record.user_id, 'session_terminated', session_id, reason)
                
                # مسح بيانات الجلسة
                if session.get('session_id') == session_id:
                    session.clear()
                
                return True
            
            return False
            
        except Exception as e:
            logging.error(f"خطأ في إنهاء الجلسة: {str(e)}")
            return False
    
    def _flag_suspicious_session(self, session_id, reason):
        """وضع علامة على الجلسة كمشبوهة"""
        try:
            session_record = SessionSecurity.query.get(session_id)
            if session_record:
                session_record.is_suspicious = True
                db.session.commit()
                
                # إنشاء تنبيه أمني
                alert = SecurityAlert(
                    alert_type='suspicious_session',
                    severity='medium',
                    title='جلسة مشبوهة',
                    message=f'تم رصد نشاط مشبوه في الجلسة: {reason}',
                    source_system='session_management',
                    user_id=session_record.user_id,
                    ip_address=session_record.ip_address,
                    metadata=json.dumps({
                        'session_id': session_id,
                        'reason': reason,
                        'timestamp': datetime.utcnow().isoformat()
                    }, ensure_ascii=False)
                )
                
                db.session.add(alert)
                db.session.commit()
                
        except Exception as e:
            logging.error(f"خطأ في وضع علامة على الجلسة المشبوهة: {str(e)}")
    
    def _log_session_event(self, user_id, event_type, session_id, details=None):
        """تسجيل أحداث الجلسة"""
        try:
            from security_services import SecurityAuditService
            audit_service = SecurityAuditService()
            
            audit_service.log_user_action(
                user_id=user_id,
                action_type=event_type,
                resource_type='session',
                resource_id=str(session_id),
                description=f"Session {event_type}: {details or ''}",
                risk_level='low'
            )
            
        except Exception as e:
            logging.error(f"خطأ في تسجيل حدث الجلسة: {str(e)}")
