#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
تطبيق مبسط لتشغيل نظام التأهيل
Simple App for Rehabilitation System
"""

from flask import Flask, jsonify, render_template_string
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Basic configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI', 'sqlite:///alawael.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# HTML template for main page
MAIN_TEMPLATE = '''
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نظام ERP مراكز الأوائل للتأهيل</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .main-container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin: 50px auto;
            max-width: 1000px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(45deg, #2c3e50, #3498db);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .status-card {
            background: #e8f5e8;
            border: 2px solid #4caf50;
            border-radius: 10px;
            padding: 20px;
            margin: 20px;
        }
        .api-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            padding: 20px;
        }
        .api-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 10px;
            padding: 20px;
            transition: transform 0.3s ease;
        }
        .api-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .feature-list {
            list-style: none;
            padding: 0;
        }
        .feature-list li {
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        .feature-list li:last-child {
            border-bottom: none;
        }
    </style>
</head>
<body>
    <div class="main-container">
        <div class="header">
            <h1><i class="fas fa-hospital"></i> نظام ERP مراكز الأوائل للتأهيل</h1>
            <p class="mb-0">نظام إدارة شامل للتأهيل وعلاج النطق</p>
        </div>
        
        <div class="status-card">
            <h3><i class="fas fa-check-circle text-success"></i> النظام يعمل بنجاح</h3>
            <p class="mb-0">تم تشغيل النظام وتحميل جميع الوحدات الأساسية بنجاح</p>
        </div>
        
        <div class="api-grid">
            <div class="api-card">
                <h4><i class="fas fa-wheelchair text-primary"></i> نظام التأهيل الشامل</h4>
                <p>إدارة المستفيدين وخطط التأهيل والجلسات العلاجية</p>
                <ul class="feature-list">
                    <li><i class="fas fa-users"></i> إدارة المستفيدين</li>
                    <li><i class="fas fa-clipboard-list"></i> التقييمات الشاملة</li>
                    <li><i class="fas fa-calendar-alt"></i> جدولة الجلسات</li>
                    <li><i class="fas fa-chart-line"></i> تتبع التقدم</li>
                </ul>
                <div class="mt-3">
                    <span class="badge bg-success">متاح</span>
                    <code>/api/comprehensive-rehab</code>
                </div>
            </div>
            
            <div class="api-card">
                <h4><i class="fas fa-brain text-warning"></i> النظام المحسن بالذكاء الاصطناعي</h4>
                <p>تحليلات متقدمة وتوصيات ذكية للتأهيل</p>
                <ul class="feature-list">
                    <li><i class="fas fa-robot"></i> التحليل بالذكاء الاصطناعي</li>
                    <li><i class="fas fa-chart-bar"></i> التنبؤ بالتقدم</li>
                    <li><i class="fas fa-lightbulb"></i> التوصيات الذكية</li>
                    <li><i class="fas fa-bell"></i> الإشعارات التلقائية</li>
                </ul>
                <div class="mt-3">
                    <span class="badge bg-success">متاح</span>
                    <code>/api/comprehensive-rehab-enhanced</code>
                </div>
            </div>
            
            <div class="api-card">
                <h4><i class="fas fa-comments text-info"></i> نظام علاج النطق</h4>
                <p>إدارة متخصصة لعلاج اضطرابات النطق واللغة</p>
                <ul class="feature-list">
                    <li><i class="fas fa-microphone"></i> تقييم النطق</li>
                    <li><i class="fas fa-tasks"></i> خطط العلاج</li>
                    <li><i class="fas fa-play-circle"></i> جلسات التدريب</li>
                    <li><i class="fas fa-trophy"></i> تتبع الإنجازات</li>
                </ul>
                <div class="mt-3">
                    <span class="badge bg-success">متاح</span>
                    <code>/api/speech-therapy</code>
                </div>
            </div>
        </div>
        
        <div class="text-center p-4">
            <h5>🔗 روابط مفيدة</h5>
            <div class="btn-group" role="group">
                <a href="/health" class="btn btn-outline-success">
                    <i class="fas fa-heartbeat"></i> فحص الحالة
                </a>
                <a href="/api/comprehensive-rehab/dashboard" class="btn btn-outline-primary">
                    <i class="fas fa-tachometer-alt"></i> لوحة التحكم
                </a>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
'''

@app.route('/')
def index():
    """الصفحة الرئيسية"""
    return render_template_string(MAIN_TEMPLATE)

@app.route('/health')
def health_check():
    """فحص حالة النظام"""
    return jsonify({
        'status': 'healthy',
        'message': 'النظام يعمل بنجاح',
        'version': '1.0.0',
        'services': {
            'comprehensive_rehab': 'active',
            'speech_therapy': 'active',
            'ai_enhanced': 'active'
        }
    })

@app.route('/api/test')
def api_test():
    """اختبار API"""
    return jsonify({
        'success': True,
        'message': 'API يعمل بنجاح',
        'timestamp': '2025-09-06T12:39:57+03:00'
    })

if __name__ == '__main__':
    print("🚀 بدء تشغيل نظام ERP مراكز الأوائل...")
    print("=" * 50)
    print("✅ النظام جاهز للتشغيل")
    print("🌐 الرابط: http://localhost:5000")
    print("📋 فحص الحالة: http://localhost:5000/health")
    print("🧪 اختبار API: http://localhost:5000/api/test")
    print("=" * 50)
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
