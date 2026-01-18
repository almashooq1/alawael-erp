"""
اختبارات التطبيق
"""

import os
import tempfile
import pytest
from app import create_app
from models import db


@pytest.fixture
def app():
    """إنشاء وتكوين تطبيق اختبار"""
    db_fd, db_path = tempfile.mkstemp()

    app = create_app('testing')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['TESTING'] = True

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """عميل اختبار Flask"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """CLI test runner"""
    return app.test_cli_runner()


@pytest.fixture
def auth_token(client):
    """الحصول على رمز مصادقة للاختبار"""
    response = client.post('/api/auth/register', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'Test@1234',
        'name': 'Test User'
    })
    assert response.status_code == 201

    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'Test@1234'
    })
    assert response.status_code == 200

    data = response.get_json()
    return data['access_token']
