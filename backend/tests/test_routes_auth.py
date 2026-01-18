"""
اختبارات API الحساسات
"""

import pytest
from flask import json


class TestAuthAPI:
    """اختبارات API المصادقة"""

    def test_register_success(self, client):
        """اختبار التسجيل الناجح"""
        response = client.post('/api/auth/register', json={
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'Secure@1234',
            'first_name': 'New',
            'last_name': 'User'
        }, content_type='application/json')

        assert response.status_code == 201
        data = response.get_json()
        assert 'message' in data
        assert 'data' in data
        assert 'id' in data['data']

    def test_register_duplicate_email(self, client):
        """اختبار التسجيل برسالة موجودة"""
        # سجل مستخدم أولاً
        client.post('/api/auth/register', json={
            'username': 'firstuser',
            'email': 'duplicate@example.com',
            'password': 'Secure@1234',
            'first_name': 'First',
            'last_name': 'User'
        })

        # تحاول التسجيل بنفس البريد
        response = client.post('/api/auth/register', json={
            'username': 'anotheruser',
            'email': 'duplicate@example.com',
            'password': 'Secure@1234',
            'first_name': 'Another',
            'last_name': 'User'
        })

        assert response.status_code == 400

    def test_login_success(self, client):
        """اختبار تسجيل الدخول الناجح"""
        # سجل مستخدم أولاً
        client.post('/api/auth/register', json={
            'username': 'loginuser',
            'email': 'login@example.com',
            'password': 'Password@1234',
            'first_name': 'Login',
            'last_name': 'User'
        })

        # تسجيل الدخول
        response = client.post('/api/auth/login', json={
            'username': 'loginuser',
            'password': 'Password@1234'
        })

        assert response.status_code == 200
        data = response.get_json()
        assert 'data' in data
        assert 'access_token' in data['data']

    def test_login_invalid_password(self, client):
        """اختبار تسجيل الدخول برقم سري خاطئ"""
        # سجل مستخدم أولاً
        client.post('/api/auth/register', json={
            'username': 'pwduser',
            'email': 'pwd@example.com',
            'password': 'CorrectPassword@1234',
            'first_name': 'Password',
            'last_name': 'Test'
        })

        # تسجيل الدخول برقم خاطئ
        response = client.post('/api/auth/login', json={
            'username': 'pwduser',
            'password': 'WrongPassword'
        })

        assert response.status_code == 401

    def test_login_invalid_email(self, client):
        """اختبار تسجيل الدخول ببريد غير موجود"""
        response = client.post('/api/auth/login', json={
            'username': 'nonexistent',
            'password': 'Test@1234'
        })

        assert response.status_code == 401

    def test_refresh_token(self, client, auth_token):
        """اختبار تحديث الرمز"""
        # الحصول على refresh token أولاً من تسجيل الدخول
        response = client.post('/api/auth/login', json={
            'username': 'testuser',
            'password': 'TestPassword123!'
        }, content_type='application/json')

        refresh_token = response.get_json()['data']['refresh_token']

        # استخدام refresh token
        response = client.post('/api/auth/refresh',
            headers={'Authorization': f'Bearer {refresh_token}'},
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert 'data' in data
        assert 'access_token' in data['data']

    def test_get_profile(self, client, auth_token):
        """اختبار الحصول على ملف المستخدم"""
        response = client.get('/api/auth/profile',
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert 'data' in data
        assert data['data']['username'] == 'testuser'
        assert data['data']['email'] == 'test@example.com'

    def test_protected_route_without_token(self, client):
        """اختبار الوصول لمسار محمي بدون رمز"""
        response = client.get('/api/auth/profile',
            content_type='application/json'
        )

        assert response.status_code == 401

    def test_protected_route_with_invalid_token(self, client):
        """اختبار الوصول برمز غير صحيح"""
        response = client.get('/api/auth/profile',
            headers={'Authorization': 'Bearer invalid_token'},
            content_type='application/json'
        )

        assert response.status_code == 422
