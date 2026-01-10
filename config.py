import os
from datetime import timedelta

class Config:
    # General Config
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("No SECRET_KEY set for Flask application")

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI')
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("No DATABASE_URI set for Flask application")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    if not JWT_SECRET_KEY:
        raise ValueError("No JWT_SECRET_KEY set for Flask application")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)

    # Mail
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', '1', 't']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')

    # File Uploads
    UPLOADED_PHOTOS_DEST = os.path.join(os.path.abspath(os.path.dirname(__name__)), 'static', 'uploads', 'students')
    UPLOADED_DOCUMENTS_DEST = os.path.join(os.path.abspath(os.path.dirname(__name__)), 'uploads', 'documents')

class DevelopmentConfig(Config):
    DEBUG = True
    # Override database for development if needed
    # SQLALCHEMY_DATABASE_URI = 'sqlite:///dev.db'

class ProductionConfig(Config):
    DEBUG = False
    # Production specific settings

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
