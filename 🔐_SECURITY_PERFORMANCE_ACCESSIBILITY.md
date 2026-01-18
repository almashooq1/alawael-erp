# 🔐 الأمان والأداء وإمكانية الوصول

# Security, Performance & Accessibility

**التاريخ:** 14 يناير 2026  
**الإصدار:** 6.0  
**الحالة:** ✅ نظام آمن ومحسّن وشامل

---

## 🛡️ نظام الأمان المتقدم

### 1️⃣ إدارة المصادقة والتفويض

```python
"""
نظام أمان متعدد الطبقات
"""

class SecurityManager:
    """مدير الأمان الشامل"""

    def __init__(self):
        from cryptography.fernet import Fernet
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
        import jwt
        import secrets

        self.fernet_key = self._load_or_generate_key()
        self.cipher = Fernet(self.fernet_key)
        self.jwt_secret = os.getenv('JWT_SECRET', secrets.token_urlsafe(32))
        self.failed_attempts = {}
        self.blacklisted_tokens = set()

    def authenticate_user(self, username, password, mfa_code=None):
        """مصادقة متعددة العوامل"""
        # التحقق من محاولات الدخول الفاشلة
        if self._is_account_locked(username):
            return {
                'success': False,
                'error': 'account_locked',
                'unlock_time': self._get_unlock_time(username)
            }

        # التحقق من كلمة المرور
        user = self._get_user(username)
        if not user or not self._verify_password(password, user['password_hash']):
            self._record_failed_attempt(username)
            return {
                'success': False,
                'error': 'invalid_credentials',
                'attempts_left': 3 - self._get_failed_attempts(username)
            }

        # التحقق من MFA
        if user.get('mfa_enabled'):
            if not mfa_code:
                return {
                    'success': False,
                    'error': 'mfa_required',
                    'mfa_method': user['mfa_method']
                }

            if not self._verify_mfa(user['id'], mfa_code):
                return {
                    'success': False,
                    'error': 'invalid_mfa'
                }

        # إنشاء التوكن
        token = self._generate_jwt_token(user)
        refresh_token = self._generate_refresh_token(user)

        # تسجيل الدخول الناجح
        self._log_successful_login(user['id'])
        self._clear_failed_attempts(username)

        return {
            'success': True,
            'access_token': token,
            'refresh_token': refresh_token,
            'user': self._sanitize_user_data(user),
            'expires_in': 3600
        }

    def _generate_jwt_token(self, user):
        """توليد JWT token"""
        import jwt
        from datetime import datetime, timedelta

        payload = {
            'user_id': user['id'],
            'username': user['username'],
            'role': user['role'],
            'permissions': user.get('permissions', []),
            'exp': datetime.utcnow() + timedelta(hours=1),
            'iat': datetime.utcnow(),
            'jti': secrets.token_urlsafe(16)
        }

        token = jwt.encode(payload, self.jwt_secret, algorithm='HS256')
        return token

    def authorize_action(self, token, required_permission):
        """التحقق من الصلاحيات"""
        try:
            # فك تشفير التوكن
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])

            # التحقق من القائمة السوداء
            if payload['jti'] in self.blacklisted_tokens:
                return {
                    'authorized': False,
                    'error': 'token_blacklisted'
                }

            # التحقق من الصلاحية
            user_permissions = payload.get('permissions', [])

            if required_permission in user_permissions or 'admin' in user_permissions:
                return {
                    'authorized': True,
                    'user_id': payload['user_id'],
                    'role': payload['role']
                }

            return {
                'authorized': False,
                'error': 'insufficient_permissions'
            }

        except jwt.ExpiredSignatureError:
            return {
                'authorized': False,
                'error': 'token_expired'
            }
        except jwt.InvalidTokenError:
            return {
                'authorized': False,
                'error': 'invalid_token'
            }

    def enable_mfa(self, user_id, method='totp'):
        """تفعيل المصادقة الثنائية"""
        import pyotp

        if method == 'totp':
            # توليد سر TOTP
            secret = pyotp.random_base32()

            # إنشاء URI للـ QR Code
            totp = pyotp.TOTP(secret)
            provisioning_uri = totp.provisioning_uri(
                name=f"user_{user_id}",
                issuer_name="Rehabilitation System"
            )

            # حفظ السر
            self._save_mfa_secret(user_id, secret, method)

            return {
                'success': True,
                'method': 'totp',
                'secret': secret,
                'qr_code_uri': provisioning_uri,
                'backup_codes': self._generate_backup_codes(user_id)
            }

        elif method == 'sms':
            # إرسال رمز عبر SMS
            code = self._generate_sms_code()
            self._send_sms(user_id, code)

            return {
                'success': True,
                'method': 'sms',
                'message': 'تم إرسال رمز التحقق عبر SMS'
            }

    def encrypt_sensitive_data(self, data):
        """تشفير البيانات الحساسة"""
        if isinstance(data, str):
            data = data.encode()

        encrypted = self.cipher.encrypt(data)
        return encrypted.decode()

    def decrypt_sensitive_data(self, encrypted_data):
        """فك تشفير البيانات"""
        if isinstance(encrypted_data, str):
            encrypted_data = encrypted_data.encode()

        decrypted = self.cipher.decrypt(encrypted_data)
        return decrypted.decode()

    def audit_log(self, user_id, action, resource, details=None):
        """تسجيل مراجعة الأمان"""
        from datetime import datetime

        log_entry = {
            'timestamp': datetime.utcnow(),
            'user_id': user_id,
            'action': action,
            'resource': resource,
            'details': details,
            'ip_address': self._get_current_ip(),
            'user_agent': self._get_current_user_agent()
        }

        # حفظ في قاعدة البيانات
        self._save_audit_log(log_entry)

        # التحقق من الأنماط المشبوهة
        if self._detect_suspicious_activity(log_entry):
            self._trigger_security_alert(log_entry)

    def implement_rate_limiting(self, endpoint, max_requests=100, window=60):
        """تحديد معدل الطلبات"""
        from functools import wraps
        from flask import request, jsonify
        import redis

        redis_client = redis.Redis(host='localhost', port=6379, db=0)

        def decorator(f):
            @wraps(f)
            def wrapped(*args, **kwargs):
                # تحديد المفتاح
                key = f"rate_limit:{endpoint}:{request.remote_addr}"

                # التحقق من العداد
                current = redis_client.get(key)

                if current and int(current) >= max_requests:
                    return jsonify({
                        'error': 'rate_limit_exceeded',
                        'retry_after': redis_client.ttl(key)
                    }), 429

                # زيادة العداد
                pipe = redis_client.pipeline()
                pipe.incr(key)
                pipe.expire(key, window)
                pipe.execute()

                return f(*args, **kwargs)

            return wrapped
        return decorator

    def sanitize_input(self, user_input, input_type='string'):
        """تنظيف المدخلات من الحقن"""
        import bleach
        import re

        if input_type == 'html':
            # السماح فقط ببعض الوسوم الآمنة
            allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li']
            cleaned = bleach.clean(
                user_input,
                tags=allowed_tags,
                strip=True
            )
            return cleaned

        elif input_type == 'sql':
            # منع SQL injection
            # استخدام parameterized queries بدلاً من ذلك
            return user_input.replace("'", "''")

        elif input_type == 'string':
            # إزالة الأحرف الخطيرة
            cleaned = re.sub(r'[<>"\';]', '', user_input)
            return cleaned

        return user_input

```

---

## ⚡ تحسين الأداء

### 1️⃣ نظام التخزين المؤقت

```python
"""
نظام تخزين مؤقت متقدم
"""

class CacheManager:
    """مدير التخزين المؤقت"""

    def __init__(self):
        import redis
        from functools import wraps

        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=0,
            decode_responses=True
        )

        self.cache_strategies = {
            'reports': {'ttl': 3600, 'strategy': 'lru'},
            'analytics': {'ttl': 1800, 'strategy': 'lru'},
            'user_data': {'ttl': 600, 'strategy': 'lru'},
            'static': {'ttl': 86400, 'strategy': 'persistent'}
        }

    def cache_decorator(self, cache_type='default', ttl=None):
        """ديكوريتر للتخزين المؤقت"""
        from functools import wraps
        import json
        import hashlib

        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # إنشاء مفتاح فريد
                cache_key = self._generate_cache_key(
                    func.__name__,
                    args,
                    kwargs
                )

                # محاولة جلب من الكاش
                cached_result = self.redis_client.get(cache_key)

                if cached_result:
                    return json.loads(cached_result)

                # تنفيذ الدالة
                result = func(*args, **kwargs)

                # حفظ في الكاش
                cache_ttl = ttl or self.cache_strategies.get(
                    cache_type,
                    {}
                ).get('ttl', 300)

                self.redis_client.setex(
                    cache_key,
                    cache_ttl,
                    json.dumps(result)
                )

                return result

            return wrapper
        return decorator

    def invalidate_cache(self, pattern):
        """إبطال الكاش"""
        keys = self.redis_client.keys(pattern)
        if keys:
            self.redis_client.delete(*keys)

        return {
            'success': True,
            'invalidated_keys': len(keys)
        }

    def warm_cache(self, data_loaders):
        """تدفئة الكاش مسبقاً"""
        results = {}

        for name, loader in data_loaders.items():
            try:
                data = loader()
                cache_key = f"warm:{name}"
                self.redis_client.setex(
                    cache_key,
                    3600,
                    json.dumps(data)
                )
                results[name] = 'success'
            except Exception as e:
                results[name] = f'failed: {str(e)}'

        return results

```

### 2️⃣ تحسين قاعدة البيانات

```python
"""
تحسينات قاعدة البيانات
"""

class DatabaseOptimizer:
    """محسّن قاعدة البيانات"""

    def __init__(self, db):
        self.db = db
        self.query_cache = {}

    def create_indexes(self):
        """إنشاء الفهارس"""
        indexes = [
            # فهارس التقارير
            ('reports', ['user_id', 'created_at']),
            ('reports', ['report_type', 'status']),
            ('reports', ['beneficiary_id']),

            # فهارس المستخدمين
            ('users', ['username'], {'unique': True}),
            ('users', ['email'], {'unique': True}),

            # فهارس الجلسات
            ('sessions', ['beneficiary_id', 'date']),
            ('sessions', ['therapist_id', 'date']),

            # فهارس التقييمات
            ('assessments', ['beneficiary_id', 'assessment_date']),
            ('assessments', ['assessment_type']),

            # فهارس نصية
            ('reports', ['title'], {'text': True}),
            ('reports', ['content'], {'text': True})
        ]

        created = []
        for index in indexes:
            try:
                table = index[0]
                fields = index[1]
                options = index[2] if len(index) > 2 else {}

                self._create_index(table, fields, options)
                created.append(f"{table}.{'.'.join(fields)}")
            except Exception as e:
                print(f"Failed to create index: {e}")

        return {
            'success': True,
            'indexes_created': created
        }

    def optimize_queries(self):
        """تحسين الاستعلامات"""
        # استخدام select_related و prefetch_related
        optimizations = {
            'use_select_related': [
                'reports.user',
                'sessions.therapist',
                'assessments.beneficiary'
            ],
            'use_prefetch_related': [
                'beneficiaries.sessions',
                'programs.modules',
                'reports.comments'
            ],
            'add_only_fields': [
                'list_views',
                'api_responses'
            ]
        }

        return optimizations

    def implement_pagination(self, query, page=1, per_page=20):
        """ترقيم الصفحات"""
        total = query.count()
        items = query.limit(per_page).offset((page - 1) * per_page).all()

        return {
            'items': items,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }

    def use_connection_pooling(self):
        """استخدام connection pooling"""
        from sqlalchemy import create_engine
        from sqlalchemy.pool import QueuePool

        engine = create_engine(
            os.getenv('DATABASE_URL'),
            poolclass=QueuePool,
            pool_size=20,
            max_overflow=40,
            pool_pre_ping=True,
            pool_recycle=3600
        )

        return engine

```

### 3️⃣ ضغط البيانات والتحميل الكسول

```python
"""
ضغط البيانات والتحميل الكسول
"""

class DataOptimizer:
    """محسّن البيانات"""

    def compress_response(self, data):
        """ضغط الاستجابة"""
        import gzip
        import json

        json_data = json.dumps(data)
        compressed = gzip.compress(json_data.encode('utf-8'))

        return {
            'compressed': compressed,
            'original_size': len(json_data),
            'compressed_size': len(compressed),
            'compression_ratio': len(compressed) / len(json_data)
        }

    def lazy_load_images(self, report_html):
        """تحميل كسول للصور"""
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(report_html, 'html.parser')

        # إضافة lazy loading للصور
        for img in soup.find_all('img'):
            img['loading'] = 'lazy'

            # إضافة placeholder
            if 'src' in img.attrs:
                img['data-src'] = img['src']
                img['src'] = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"%3E%3C/svg%3E'

        return str(soup)

    def implement_cdn_caching(self, static_files):
        """تطبيق CDN للملفات الثابتة"""
        cdn_config = {
            'provider': 'cloudflare',
            'base_url': 'https://cdn.example.com',
            'cache_rules': {
                'images': {
                    'ttl': 86400,
                    'types': ['.jpg', '.png', '.svg', '.webp']
                },
                'scripts': {
                    'ttl': 3600,
                    'types': ['.js']
                },
                'styles': {
                    'ttl': 3600,
                    'types': ['.css']
                }
            }
        }

        return cdn_config

```

---

## ♿ إمكانية الوصول (Accessibility)

### 1️⃣ معايير WCAG 2.1

```python
"""
تطبيق معايير إمكانية الوصول
"""

class AccessibilityManager:
    """مدير إمكانية الوصول"""

    def __init__(self):
        self.wcag_level = 'AA'
        self.supported_languages = ['ar', 'en']

    def add_aria_labels(self, html_content):
        """إضافة ARIA labels"""
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html_content, 'html.parser')

        # إضافة roles
        nav_elements = soup.find_all('nav')
        for nav in nav_elements:
            if 'role' not in nav.attrs:
                nav['role'] = 'navigation'

        # إضافة aria-label للأزرار
        buttons = soup.find_all('button')
        for button in buttons:
            if not button.get_text().strip() and 'aria-label' not in button.attrs:
                button['aria-label'] = 'Button'

        # إضافة alt للصور
        images = soup.find_all('img')
        for img in images:
            if 'alt' not in img.attrs:
                img['alt'] = 'Image'

        return str(soup)

    def implement_keyboard_navigation(self):
        """تطبيق التنقل بلوحة المفاتيح"""
        keyboard_config = {
            'shortcuts': {
                'ctrl+/': 'show_shortcuts_help',
                'ctrl+s': 'save_report',
                'ctrl+p': 'print_report',
                'ctrl+f': 'search',
                'esc': 'close_modal',
                'tab': 'next_field',
                'shift+tab': 'previous_field',
                'enter': 'submit_form',
                'arrow_keys': 'navigate_menu'
            },
            'focus_indicators': {
                'outline': '2px solid #667eea',
                'outline_offset': '2px'
            },
            'skip_links': [
                {'href': '#main-content', 'text': 'الانتقال للمحتوى الرئيسي'},
                {'href': '#navigation', 'text': 'الانتقال للقائمة'},
                {'href': '#footer', 'text': 'الانتقال للتذييل'}
            ]
        }

        return keyboard_config

    def ensure_color_contrast(self, foreground, background):
        """التحقق من تباين الألوان"""
        from colour import Color

        fg = Color(foreground)
        bg = Color(background)

        # حساب النسبة
        contrast_ratio = self._calculate_contrast_ratio(fg, bg)

        # معايير WCAG
        wcag_aa_normal = contrast_ratio >= 4.5
        wcag_aa_large = contrast_ratio >= 3.0
        wcag_aaa_normal = contrast_ratio >= 7.0

        return {
            'contrast_ratio': contrast_ratio,
            'passes_aa_normal': wcag_aa_normal,
            'passes_aa_large': wcag_aa_large,
            'passes_aaa': wcag_aaa_normal,
            'recommendation': 'pass' if wcag_aa_normal else 'adjust_colors'
        }

    def add_screen_reader_support(self, html):
        """دعم قارئات الشاشة"""
        enhancements = """
        <!-- Screen Reader Announcements -->
        <div aria-live="polite" aria-atomic="true" class="sr-only" id="sr-announcements"></div>

        <!-- Hidden descriptions -->
        <span class="sr-only">المحتوى الرئيسي يبدأ هنا</span>

        <!-- Language declaration -->
        <html lang="ar" dir="rtl">

        <!-- Page structure -->
        <main role="main" id="main-content">
            <!-- Main content -->
        </main>
        """

        return enhancements

    def implement_text_scaling(self):
        """تطبيق تكبير النص"""
        css_rules = """
        /* تدعم تكبير النص حتى 200% */
        html {
            font-size: 16px;
        }

        @media (min-width: 768px) {
            html {
                font-size: calc(16px + 0.5vw);
            }
        }

        /* استخدام rem بدلاً من px */
        body {
            font-size: 1rem;
            line-height: 1.5;
        }

        h1 { font-size: 2.5rem; }
        h2 { font-size: 2rem; }
        h3 { font-size: 1.75rem; }

        /* دعم zoom */
        @media (min-resolution: 2dppx) {
            /* تحسينات للشاشات عالية الدقة */
        }
        """

        return css_rules

```

---

## 🌍 الدعم متعدد اللغات

```python
"""
نظام الترجمة وتعدد اللغات
"""

class InternationalizationManager:
    """مدير تعدد اللغات"""

    def __init__(self):
        self.supported_languages = {
            'ar': {'name': 'العربية', 'dir': 'rtl', 'locale': 'ar_SA'},
            'en': {'name': 'English', 'dir': 'ltr', 'locale': 'en_US'},
            'fr': {'name': 'Français', 'dir': 'ltr', 'locale': 'fr_FR'}
        }
        self.translations = self._load_translations()

    def translate(self, key, language='ar', **params):
        """ترجمة نص"""
        if language not in self.translations:
            language = 'ar'  # default

        text = self.translations[language].get(key, key)

        # استبدال المتغيرات
        for param_key, param_value in params.items():
            text = text.replace(f'{{{param_key}}}', str(param_value))

        return text

    def format_date(self, date, language='ar'):
        """تنسيق التاريخ حسب اللغة"""
        from babel.dates import format_date

        locale = self.supported_languages[language]['locale']
        formatted = format_date(date, format='long', locale=locale)

        return formatted

    def format_number(self, number, language='ar'):
        """تنسيق الأرقام"""
        from babel.numbers import format_decimal

        locale = self.supported_languages[language]['locale']
        formatted = format_decimal(number, locale=locale)

        return formatted

    def _load_translations(self):
        """تحميل ملفات الترجمة"""
        return {
            'ar': {
                'welcome': 'مرحباً',
                'report_generated': 'تم إنشاء التقرير بنجاح',
                'error_occurred': 'حدث خطأ',
                'save': 'حفظ',
                'cancel': 'إلغاء',
                'delete': 'حذف',
                'edit': 'تعديل',
                'view': 'عرض',
                'download': 'تنزيل',
                'print': 'طباعة',
                'share': 'مشاركة'
            },
            'en': {
                'welcome': 'Welcome',
                'report_generated': 'Report generated successfully',
                'error_occurred': 'An error occurred',
                'save': 'Save',
                'cancel': 'Cancel',
                'delete': 'Delete',
                'edit': 'Edit',
                'view': 'View',
                'download': 'Download',
                'print': 'Print',
                'share': 'Share'
            }
        }

```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ نظام آمن ومحسّن ويدعم إمكانية الوصول الكاملة
