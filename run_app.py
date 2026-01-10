#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ملف تشغيل النظام المبسط
Simplified App Runner for Al-Awael ERP System
"""

import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app():
    """إنشاء تطبيق Flask مع التكوين الأساسي"""
    app = Flask(__name__, template_folder='templates', static_folder='static')
    
    # Basic configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI', 'sqlite:///alawael_erp.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Enable CORS
    CORS(app)
    
    # Initialize extensions
    from database import db
    db.init_app(app)
    
    jwt = JWTManager(app)
    
    # Import and register blueprints safely
    try:
        from comprehensive_rehabilitation_api import comprehensive_rehab_bp
        app.register_blueprint(comprehensive_rehab_bp)
        print("✅ Comprehensive rehabilitation API registered")
    except Exception as e:
        print(f"⚠️ Could not register comprehensive rehabilitation API: {e}")
    
    try:
        from comprehensive_rehabilitation_enhanced_api import comprehensive_rehab_enhanced_bp
        app.register_blueprint(comprehensive_rehab_enhanced_bp)
        print("✅ Enhanced comprehensive rehabilitation API registered")
    except Exception as e:
        print(f"⚠️ Could not register enhanced comprehensive rehabilitation API: {e}")
    
    try:
        from speech_therapy_api import speech_therapy_bp
        app.register_blueprint(speech_therapy_bp)
        print("✅ Speech therapy API registered")
    except Exception as e:
        print(f"⚠️ Could not register speech therapy API: {e}")
    
    # Basic routes
    @app.route('/')
    def index():
        return '''
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>نظام ERP مراكز الأوائل</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #2c3e50; text-align: center; }
                .status { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .api-list { background: #f8f9fa; padding: 20px; border-radius: 5px; }
                .api-item { margin: 10px 0; padding: 10px; background: white; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🏥 نظام ERP مراكز الأوائل للتأهيل</h1>
                <div class="status">
                    <h3>✅ النظام يعمل بنجاح</h3>
                    <p>تم تشغيل النظام وتحميل جميع الوحدات الأساسية</p>
                </div>
                <div class="api-list">
                    <h3>📋 واجهات برمجة التطبيقات المتاحة:</h3>
                    <div class="api-item">🔗 /api/comprehensive-rehab - نظام التأهيل الشامل</div>
                    <div class="api-item">🔗 /api/comprehensive-rehab-enhanced - النظام المحسن بالذكاء الاصطناعي</div>
                    <div class="api-item">🔗 /api/speech-therapy - نظام علاج النطق</div>
                </div>
            </div>
        </body>
        </html>
        '''
    
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'message': 'النظام يعمل بنجاح'}
    
    # Create database tables
    with app.app_context():
        try:
            db.create_all()
            print("✅ Database tables created successfully")
        except Exception as e:
            print(f"⚠️ Database creation warning: {e}")
    
    return app

def main():
    """تشغيل التطبيق"""
    print("🚀 بدء تشغيل نظام ERP مراكز الأوائل...")
    print("=" * 50)
    
    app = create_app()
    
    print("=" * 50)
    print("✅ تم تشغيل النظام بنجاح!")
    print("🌐 الرابط: http://localhost:5000")
    print("📋 فحص الحالة: http://localhost:5000/health")
    print("=" * 50)
    
    # Run the app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=False
    )

if __name__ == '__main__':
    main()
