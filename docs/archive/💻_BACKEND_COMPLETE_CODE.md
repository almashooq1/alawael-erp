# 💻 التطبيق الكامل - Backend Flask

# Complete Flask Backend Application

**التاريخ:** 14 يناير 2026  
**الإصدار:** 1.0  
**الحالة:** ✅ كود جاهز للتشغيل

---

## 📁 هيكل المشروع

```text
backend/
├── app.py                      # نقطة الدخول الرئيسية
├── config.py                   # إعدادات التطبيق
├── requirements.txt            # التبعيات
├── models/                     # نماذج قاعدة البيانات
│   ├── __init__.py
│   ├── user.py
│   ├── beneficiary.py
│   ├── report.py
│   ├── session.py
│   └── assessment.py
├── routes/                     # المسارات
│   ├── __init__.py
│   ├── auth.py
│   ├── reports.py
│   ├── beneficiaries.py
│   ├── analytics.py
│   └── admin.py
├── services/                   # الخدمات
│   ├── __init__.py
│   ├── report_service.py
│   ├── ai_service.py
│   ├── notification_service.py
│   └── cache_service.py
├── utils/                      # الأدوات المساعدة
│   ├── __init__.py
│   ├── security.py
│   ├── validators.py
│   └── helpers.py
└── tests/                      # الاختبارات
    ├── __init__.py
    ├── test_auth.py
    ├── test_reports.py
    └── test_services.py
```

---

## 🚀 app.py - الملف الرئيسي

```python
"""
تطبيق Flask الرئيسي
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress
from flask_socketio import SocketIO
import logging
from datetime import datetime

# الاستيرادات المحلية
from config import Config
from models import db, init_db
from routes import register_blueprints
from utils.security import SecurityManager
from services.cache_service import CacheManager

# إنشاء التطبيق
app = Flask(__name__)
app.config.from_object(Config)

# تفعيل CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "https://rehabilitation.example.com"],
        "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Range", "X-Total-Count"]
    }
})

# تفعيل JWT
jwt = JWTManager(app)

# تحديد معدل الطلبات
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="redis://localhost:6379"
)

# ضغط الاستجابات
Compress(app)

# WebSocket
socketio = SocketIO(app, cors_allowed_origins="*")

# قاعدة البيانات
db.init_app(app)
init_db(app)

# الخدمات
security_manager = SecurityManager()
cache_manager = CacheManager()

# تسجيل المسارات
register_blueprints(app)

# إعداد Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================
# Middleware
# ============================

@app.before_request
def before_request():
    """قبل كل طلب"""
    # تسجيل الطلب
    logger.info(f"{request.method} {request.path} - {get_remote_address()}")

    # التحقق من الصيانة
    if app.config.get('MAINTENANCE_MODE'):
        return jsonify({
            'error': 'maintenance',
            'message': 'النظام تحت الصيانة'
        }), 503

@app.after_request
def after_request(response):
    """بعد كل طلب"""
    # إضافة headers الأمان
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

    return response

# ============================
# Error Handlers
# ============================

@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'error': 'bad_request',
        'message': str(error)
    }), 400

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({
        'error': 'unauthorized',
        'message': 'غير مصرح'
    }), 401

@app.errorhandler(403)
def forbidden(error):
    return jsonify({
        'error': 'forbidden',
        'message': 'ممنوع'
    }), 403

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'not_found',
        'message': 'غير موجود'
    }), 404

@app.errorhandler(429)
def ratelimit_handler(error):
    return jsonify({
        'error': 'rate_limit_exceeded',
        'message': 'تجاوزت الحد المسموح من الطلبات'
    }), 429

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {str(error)}")
    return jsonify({
        'error': 'internal_server_error',
        'message': 'خطأ في الخادم'
    }), 500

# ============================
# Health Check
# ============================

@app.route('/health', methods=['GET'])
def health_check():
    """فحص صحة النظام"""
    try:
        # فحص قاعدة البيانات
        db_status = db.engine.execute('SELECT 1').scalar() == 1

        # فحص Redis
        redis_status = cache_manager.redis_client.ping()

        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'services': {
                'database': 'up' if db_status else 'down',
                'cache': 'up' if redis_status else 'down'
            }
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503

# ============================
# API Root
# ============================

@app.route('/api', methods=['GET'])
def api_root():
    """معلومات API"""
    return jsonify({
        'name': 'Rehabilitation System API',
        'version': '1.0',
        'description': 'نظام إدارة مراكز تأهيل ذوي الإعاقة',
        'endpoints': {
            'auth': '/api/auth',
            'reports': '/api/reports',
            'beneficiaries': '/api/beneficiaries',
            'analytics': '/api/analytics',
            'admin': '/api/admin'
        },
        'documentation': '/api/docs'
    })

# ============================
# WebSocket Events
# ============================

@socketio.on('connect')
def handle_connect():
    """عند الاتصال"""
    logger.info(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    """عند قطع الاتصال"""
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('join_room')
def handle_join_room(data):
    """الانضمام لغرفة"""
    from flask_socketio import join_room
    room = data.get('room')
    join_room(room)
    logger.info(f"Client {request.sid} joined room {room}")

@socketio.on('leave_room')
def handle_leave_room(data):
    """مغادرة غرفة"""
    from flask_socketio import leave_room
    room = data.get('room')
    leave_room(room)
    logger.info(f"Client {request.sid} left room {room}")

# ============================
# Main
# ============================

if __name__ == '__main__':
    # التطوير
    if app.config['DEBUG']:
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)
    else:
        # الإنتاج - استخدم gunicorn
        socketio.run(app, host='0.0.0.0', port=5000)
```

---

## ⚙️ config.py - الإعدادات

```python
"""
إعدادات التطبيق
"""

import os
from datetime import timedelta

class Config:
    """إعدادات أساسية"""

    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_DEBUG', 'False') == 'True'
    TESTING = False

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://user:password@localhost:5432/rehabilitation'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = DEBUG

    # MongoDB (للتقارير)
    MONGO_URI = os.getenv(
        'MONGO_URI',
        'mongodb://localhost:27017/rehabilitation'
    )

    # Redis
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_ALGORITHM = 'HS256'

    # File Upload
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx'}

    # Reports
    REPORTS_FOLDER = os.path.join(os.getcwd(), 'reports')
    REPORT_FORMATS = ['pdf', 'excel', 'html', 'word']

    # Email
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@rehabilitation.com')

    # SMS
    SMS_API_KEY = os.getenv('SMS_API_KEY')
    SMS_API_URL = os.getenv('SMS_API_URL')

    # OpenAI
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    OPENAI_MODEL = 'gpt-4'

    # Security
    BCRYPT_LOG_ROUNDS = 12
    SESSION_COOKIE_SECURE = not DEBUG
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)

    # Rate Limiting
    RATELIMIT_STORAGE_URL = REDIS_URL
    RATELIMIT_STRATEGY = 'fixed-window'

    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')

    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = 'app.log'

    # Maintenance
    MAINTENANCE_MODE = os.getenv('MAINTENANCE_MODE', 'False') == 'True'

    # Pagination
    ITEMS_PER_PAGE = 20
    MAX_ITEMS_PER_PAGE = 100


class DevelopmentConfig(Config):
    """إعدادات التطوير"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """إعدادات الإنتاج"""
    DEBUG = False
    TESTING = False

    # تفعيل الأمان الإضافي
    SESSION_COOKIE_SECURE = True
    PREFERRED_URL_SCHEME = 'https'


class TestingConfig(Config):
    """إعدادات الاختبار"""
    TESTING = True
    DEBUG = True

    # قواعد بيانات اختبار
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    MONGO_URI = 'mongodb://localhost:27017/rehabilitation_test'

    # تعطيل الحماية
    WTF_CSRF_ENABLED = False


# تحديد الإعداد حسب البيئة
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config():
    """جلب الإعدادات حسب البيئة"""
    env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default'])
```

---

## 📦 requirements.txt - التبعيات

```txt
# Flask Framework
Flask==3.0.0
Flask-CORS==4.0.0
Flask-JWT-Extended==4.5.3
Flask-SQLAlchemy==3.1.1
Flask-Migrate==4.0.5
Flask-Limiter==3.5.0
Flask-Compress==1.14
Flask-SocketIO==5.3.5

# Database
psycopg2-binary==2.9.9
pymongo==4.6.1
redis==5.0.1

# Security
bcrypt==4.1.2
cryptography==41.0.7
PyJWT==2.8.0

# Data Processing
pandas==2.1.4
numpy==1.26.2
scipy==1.11.4

# Reports & Export
reportlab==4.0.8
openpyxl==3.1.2
python-docx==1.1.0
Pillow==10.1.0

# Visualization
matplotlib==3.8.2
seaborn==0.13.0
plotly==5.18.0

# AI & ML
transformers==4.36.2
torch==2.1.2
scikit-learn==1.3.2
openai==1.6.1

# NLP
nltk==3.8.1
spacy==3.7.2
sumy==0.11.0
rake-nltk==1.0.6

# API & HTTP
requests==2.31.0
httpx==0.25.2

# Utilities
python-dotenv==1.0.0
python-dateutil==2.8.2
pytz==2023.3
schedule==1.2.0

# Email
Flask-Mail==0.9.1

# Testing
pytest==7.4.3
pytest-cov==4.1.0
pytest-flask==1.3.0

# Development
black==23.12.1
flake8==6.1.0
mypy==1.7.1

# Production Server
gunicorn==21.2.0
gevent==23.9.1
```

---

## 🔐 models/user.py - نموذج المستخدم

```python
"""
نموذج المستخدم
"""

from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from models import db

class User(db.Model):
    """نموذج المستخدم"""

    __tablename__ = 'users'

    # الحقول الأساسية
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

    # المعلومات الشخصية
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    phone = db.Column(db.String(20))
    avatar = db.Column(db.String(255))

    # الصلاحيات
    role = db.Column(db.String(20), default='user')  # admin, therapist, user
    permissions = db.Column(db.JSON, default=list)
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)

    # المصادقة الثنائية
    mfa_enabled = db.Column(db.Boolean, default=False)
    mfa_secret = db.Column(db.String(255))
    mfa_method = db.Column(db.String(20))  # totp, sms, email

    # التواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    # العلاقات
    reports = db.relationship('Report', backref='author', lazy='dynamic')
    sessions = db.relationship('Session', backref='therapist', lazy='dynamic')

    def __init__(self, username, email, password):
        self.username = username
        self.email = email
        self.set_password(password)

    def set_password(self, password):
        """تشفير كلمة المرور"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """التحقق من كلمة المرور"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_sensitive=False):
        """تحويل لـ dict"""
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'avatar': self.avatar,
            'role': self.role,
            'permissions': self.permissions,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'mfa_enabled': self.mfa_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

        if include_sensitive:
            data['mfa_secret'] = self.mfa_secret
            data['mfa_method'] = self.mfa_method

        return data

    def has_permission(self, permission):
        """التحقق من الصلاحية"""
        return (
            self.role == 'admin' or
            permission in self.permissions
        )

    def __repr__(self):
        return f'<User {self.username}>'
```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ كود Backend جاهز للتشغيل
