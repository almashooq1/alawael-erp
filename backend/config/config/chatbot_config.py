#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ADVANCED CHATBOT - CONFIGURATION & SETTINGS
إعدادات وتكوين الـ Chatbot الذكي المتقدم
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

# تحميل متغيرات البيئة
load_dotenv()


class Config:
    """إعدادات قاعدية"""
    
    # Application
    APP_NAME = "Advanced Intelligent Chatbot"
    APP_VERSION = "2.5"
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    LOG_FILE = os.getenv('LOG_FILE', 'logs/chatbot.log')
    
    # Cache Configuration
    CACHE_CONFIG = {
        'max_size': int(os.getenv('CACHE_MAX_SIZE', 1000)),
        'ttl_seconds': int(os.getenv('CACHE_TTL_SECONDS', 3600)),
        'enable_distributed': os.getenv('CACHE_DISTRIBUTED', 'False') == 'True'
    }
    
    # Performance Thresholds
    PERFORMANCE_THRESHOLDS = {
        'response_time_ms': float(os.getenv('PERF_RESPONSE_TIME_MS', 1000)),
        'error_rate': float(os.getenv('PERF_ERROR_RATE', 0.1)),
        'confidence_threshold': float(os.getenv('PERF_CONFIDENCE_THRESHOLD', 0.5))
    }
    
    # NLP Configuration
    NLP_CONFIG = {
        'supported_languages': ['ar', 'en'],
        'min_confidence': 0.3,
        'max_confidence': 1.0,
        'entity_extraction': True,
        'sentiment_detection': True,
        'emotion_detection': True
    }
    
    # Intent Classification
    INTENT_CONFIG = {
        'context_boost_factor': 1.15,
        'similarity_threshold': 0.5,
        'pattern_matching': True,
        'keyword_matching': True,
        'intent_history_limit': 5
    }
    
    # Context Management
    CONTEXT_CONFIG = {
        'short_term_memory_limit': 10,
        'long_term_memory_enabled': True,
        'conversation_timeout_minutes': 30,
        'max_context_variables': 100
    }
    
    # Session Configuration
    SESSION_CONFIG = {
        'session_id_prefix': 'session_',
        'cookie_secure': True,
        'cookie_httponly': True,
        'permanent_session_lifetime': timedelta(hours=24),
        'session_cookie_name': 'chatbot_session'
    }
    
    # Knowledge Base
    KNOWLEDGE_BASE_CONFIG = {
        'search_limit': 10,
        'search_timeout': 5,
        'cache_results': True,
        'index_enabled': True,
        'auto_update': True
    }
    
    # Escalation
    ESCALATION_CONFIG = {
        'auto_escalate_on_frustration': True,
        'frustration_threshold': 2,  # عدد الرسائل السلبية المتتالية
        'confidence_low_threshold': 0.4,
        'max_failed_attempts': 3
    }
    
    # Monitoring
    MONITORING_CONFIG = {
        'track_performance': True,
        'track_errors': True,
        'alert_on_threshold': True,
        'metrics_update_interval': 60,  # ثواني
        'retention_days': 30
    }
    
    # Database (if applicable)
    DB_CONFIG = {
        'type': os.getenv('DB_TYPE', 'sqlite'),
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'database': os.getenv('DB_NAME', 'chatbot_db'),
        'user': os.getenv('DB_USER', 'chatbot'),
        'password': os.getenv('DB_PASSWORD', '')
    }
    
    # API Configuration
    API_CONFIG = {
        'base_url': os.getenv('API_BASE_URL', 'http://localhost:5000'),
        'version': 'v2',
        'rate_limit_enabled': True,
        'rate_limit_requests': 100,
        'rate_limit_period': 60,  # ثانية
        'timeout': 30
    }
    
    # Security
    SECURITY_CONFIG = {
        'require_auth': True,
        'jwt_secret': os.getenv('JWT_SECRET', 'your-secret-key-change-in-production'),
        'jwt_algorithm': 'HS256',
        'enable_cors': True,
        'cors_origins': ['http://localhost:3000', 'http://localhost:5173']
    }
    
    # Email Configuration (for alerts)
    EMAIL_CONFIG = {
        'enabled': os.getenv('EMAIL_ENABLED', 'False') == 'True',
        'smtp_server': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
        'smtp_port': int(os.getenv('SMTP_PORT', 587)),
        'sender_email': os.getenv('SENDER_EMAIL', ''),
        'sender_password': os.getenv('SENDER_PASSWORD', ''),
        'admin_emails': os.getenv('ADMIN_EMAILS', '').split(',')
    }
    
    # Features Flags
    FEATURES = {
        'nlp_analysis': True,
        'emotion_detection': True,
        'entity_extraction': True,
        'sentiment_analysis': True,
        'conversation_history': True,
        'user_rating': True,
        'escalation': True,
        'caching': True,
        'performance_monitoring': True,
        'scheduled_cleanup': True
    }


class DevelopmentConfig(Config):
    """إعدادات التطوير"""
    
    DEBUG = True
    TESTING = False
    LOG_LEVEL = 'DEBUG'
    
    CACHE_CONFIG = {
        'max_size': 100,
        'ttl_seconds': 600,
        'enable_distributed': False
    }
    
    MONITORING_CONFIG = {
        'track_performance': True,
        'track_errors': True,
        'alert_on_threshold': False,
        'metrics_update_interval': 10,
        'retention_days': 7
    }


class ProductionConfig(Config):
    """إعدادات الإنتاج"""
    
    DEBUG = False
    TESTING = False
    LOG_LEVEL = 'WARNING'
    
    CACHE_CONFIG = {
        'max_size': 5000,
        'ttl_seconds': 3600,
        'enable_distributed': True
    }
    
    MONITORING_CONFIG = {
        'track_performance': True,
        'track_errors': True,
        'alert_on_threshold': True,
        'metrics_update_interval': 300,
        'retention_days': 90
    }
    
    SECURITY_CONFIG = {
        'require_auth': True,
        'jwt_secret': os.getenv('JWT_SECRET'),
        'jwt_algorithm': 'HS256',
        'enable_cors': True,
        'cors_origins': [os.getenv('FRONTEND_URL', 'http://localhost:3000')]
    }


class TestingConfig(Config):
    """إعدادات الاختبارات"""
    
    DEBUG = True
    TESTING = True
    LOG_LEVEL = 'DEBUG'
    
    CACHE_CONFIG = {
        'max_size': 50,
        'ttl_seconds': 300,
        'enable_distributed': False
    }
    
    DB_CONFIG = {
        'type': 'sqlite',
        'database': ':memory:'
    }


# اختيار الإعدادات بناءً على البيئة
ENV = os.getenv('ENV', 'development').lower()

if ENV == 'production':
    config = ProductionConfig()
elif ENV == 'testing':
    config = TestingConfig()
else:
    config = DevelopmentConfig()


# Advanced Settings
class AdvancedSettings:
    """إعدادات متقدمة"""
    
    # NLP Advanced
    NLP_ADVANCED = {
        'use_word_embeddings': False,
        'embedding_model': 'fasttext',
        'use_transformers': False,
        'transformer_model': 'bert-base-multilingual',
        'stemming_enabled': False,
        'lemmatization_enabled': False
    }
    
    # Machine Learning
    ML_CONFIG = {
        'auto_train': False,
        'training_interval_hours': 24,
        'model_validation': True,
        'cross_validation_folds': 5,
        'test_train_split': 0.2
    }
    
    # Distributed Processing
    DISTRIBUTED = {
        'enabled': False,
        'use_celery': False,
        'broker_url': os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379'),
        'result_backend': os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379'),
        'worker_concurrency': 4
    }
    
    # Vector Database (for embeddings)
    VECTOR_DB = {
        'enabled': False,
        'type': 'milvus',  # or 'weaviate', 'pinecone', 'qdrant'
        'host': os.getenv('VECTOR_DB_HOST', 'localhost'),
        'port': int(os.getenv('VECTOR_DB_PORT', 19530)),
        'collection_name': 'chatbot_embeddings'
    }
    
    # Analytics
    ANALYTICS = {
        'enabled': True,
        'track_user_behavior': True,
        'analytics_service': 'google',  # or 'mixpanel', 'segment'
        'track_events': True,
        'custom_events': True
    }
    
    # Webhooks
    WEBHOOKS = {
        'enabled': False,
        'retry_attempts': 3,
        'timeout': 10,
        'endpoints': {
            'on_escalation': os.getenv('WEBHOOK_ON_ESCALATION', ''),
            'on_error': os.getenv('WEBHOOK_ON_ERROR', ''),
            'on_feedback': os.getenv('WEBHOOK_ON_FEEDBACK', '')
        }
    }


# Quick Access Functions
def get_config():
    """الحصول على إعدادات التطبيق"""
    return config


def get_cache_config():
    """الحصول على إعدادات الكاش"""
    return config.CACHE_CONFIG


def get_nlp_config():
    """الحصول على إعدادات NLP"""
    return config.NLP_CONFIG


def get_intent_config():
    """الحصول على إعدادات تصنيف النوايا"""
    return config.INTENT_CONFIG


def get_monitoring_config():
    """الحصول على إعدادات المراقبة"""
    return config.MONITORING_CONFIG


def is_debug():
    """التحقق من وضع التصحيح"""
    return config.DEBUG


def is_production():
    """التحقق من بيئة الإنتاج"""
    return ENV == 'production'


# Configuration Validation
def validate_config():
    """التحقق من صحة الإعدادات"""
    errors = []
    
    # التحقق من الإعدادات الأساسية
    if config.CACHE_CONFIG['max_size'] <= 0:
        errors.append("CACHE_MAX_SIZE يجب أن يكون أكبر من 0")
    
    if config.CACHE_CONFIG['ttl_seconds'] <= 0:
        errors.append("CACHE_TTL_SECONDS يجب أن يكون أكبر من 0")
    
    # التحقق من النسبة المئوية
    for key, value in config.PERFORMANCE_THRESHOLDS.items():
        if key == 'error_rate' and (value < 0 or value > 1):
            errors.append("PERF_ERROR_RATE يجب أن يكون بين 0 و 1")
    
    if is_production() and not os.getenv('JWT_SECRET'):
        errors.append("JWT_SECRET مطلوب في بيئة الإنتاج")
    
    if errors:
        raise ValueError("خطأ في إعدادات التطبيق:\\n" + "\\n".join(errors))
    
    return True


# Print Configuration (for debugging)
def print_config():
    """طباعة الإعدادات الحالية"""
    print(f"""
╔═══════════════════════════════════════════════════════════════════════════╗
║                      CHATBOT CONFIGURATION                               ║
║                         إعدادات الـ Chatbot                                ║
╚═══════════════════════════════════════════════════════════════════════════╝

البيئة: {ENV.upper()}
إصدار التطبيق: {config.APP_VERSION}
وضع التصحيح: {config.DEBUG}

🔧 الإعدادات الرئيسية:
  • حجم الكاش: {config.CACHE_CONFIG['max_size']}
  • مدة انتهاء الكاش: {config.CACHE_CONFIG['ttl_seconds']} ثانية
  • مستوى السجل: {config.LOG_LEVEL}
  
📊 عتبات الأداء:
  • وقت الاستجابة: {config.PERFORMANCE_THRESHOLDS['response_time_ms']}ms
  • معدل الخطأ: {config.PERFORMANCE_THRESHOLDS['error_rate']}
  • حد الثقة: {config.PERFORMANCE_THRESHOLDS['confidence_threshold']}

🌐 اللغات المدعومة: {', '.join(config.NLP_CONFIG['supported_languages'])}

🔒 الأمان: {'مفعل' if config.SECURITY_CONFIG['require_auth'] else 'معطل'}

✅ تم التحقق من الإعدادات بنجاح
═══════════════════════════════════════════════════════════════════════════
    """)


if __name__ == '__main__':
    print_config()
