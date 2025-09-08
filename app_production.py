#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إعداد التطبيق للإنتاج - نظام ERP مراكز الأوائل
"""

import os
from app import app, db

# تكوين قاعدة البيانات للإنتاج
if os.environ.get('DATABASE_URL'):
    # استخدام PostgreSQL في الإنتاج
    database_url = os.environ.get('DATABASE_URL')
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    # استخدام SQLite في التطوير
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///alawael_erp.db'

# تكوين الإنتاج
app.config['DEBUG'] = False
app.config['TESTING'] = False
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# إنشاء الجداول إذا لم تكن موجودة
with app.app_context():
    try:
        db.create_all()
        print("✅ تم إنشاء جداول قاعدة البيانات بنجاح")
    except Exception as e:
        print(f"❌ خطأ في إنشاء الجداول: {e}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
