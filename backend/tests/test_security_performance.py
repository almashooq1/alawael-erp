"""
Security and Performance Tests
"""

import pytest
from datetime import datetime, timedelta
import json
import time
from app import create_app, db
from models import User, Beneficiary, Session
from models.api_key import APIKey
import uuid


@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    """Create authenticated user and return headers"""
    # Register user
    response = client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123',
        'first_name': 'Test',
        'last_name': 'User'
    })
    
    access_token = response.json['access_token']
    return {'Authorization': f'Bearer {access_token}'}


# ==================== SECURITY TESTS ====================

class TestAPIKeyManagement:
    """Test API Key management"""
    
    def test_create_api_key(self, client, auth_headers):
        """Test creating API key"""
        response = client.post(
            '/api/security/api-keys',
            json={
                'name': 'Test Key',
                'description': 'Test API Key',
                'scopes': ['read', 'write']
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        assert 'key' in response.json
        assert response.json['api_key']['name'] == 'Test Key'
    
    def test_list_api_keys(self, client, auth_headers):
        """Test listing API keys"""
        # Create key first
        client.post(
            '/api/security/api-keys',
            json={'name': 'Test Key'},
            headers=auth_headers
        )
        
        response = client.get(
            '/api/security/api-keys',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert len(response.json['api_keys']) > 0
    
    def test_update_api_key(self, client, auth_headers):
        """Test updating API key"""
        # Create key
        create_response = client.post(
            '/api/security/api-keys',
            json={'name': 'Original Name'},
            headers=auth_headers
        )
        key_id = create_response.json['api_key']['id']
        
        # Update
        response = client.put(
            f'/api/security/api-keys/{key_id}',
            json={'name': 'Updated Name'},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.json['api_key']['name'] == 'Updated Name'
    
    def test_delete_api_key(self, client, auth_headers):
        """Test deleting API key"""
        # Create key
        create_response = client.post(
            '/api/security/api-keys',
            json={'name': 'Delete Test'},
            headers=auth_headers
        )
        key_id = create_response.json['api_key']['id']
        
        # Delete
        response = client.delete(
            f'/api/security/api-keys/{key_id}',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify deleted
        get_response = client.get(
            f'/api/security/api-keys/{key_id}',
            headers=auth_headers
        )
        assert get_response.status_code == 404


class TestTwoFactorAuth:
    """Test 2FA functionality"""
    
    def test_setup_2fa(self, client, auth_headers):
        """Test 2FA setup"""
        response = client.post(
            '/api/security/2fa/setup',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert 'secret' in response.json
        assert 'qr_code' in response.json
    
    def test_disable_2fa(self, client, auth_headers):
        """Test 2FA disable"""
        response = client.post(
            '/api/security/2fa/disable',
            json={'code': '000000'},
            headers=auth_headers
        )
        
        # Will fail since 2FA not enabled, but should return proper error
        assert response.status_code in [200, 400]


class TestAuditLogs:
    """Test audit logging"""
    
    def test_get_audit_logs(self, client, auth_headers):
        """Test retrieving audit logs"""
        # Make some requests to generate logs
        client.get('/api/beneficiaries', headers=auth_headers)
        
        response = client.get(
            '/api/security/audit-logs',
            headers=auth_headers
        )
        
        assert response.status_code == 200


# ==================== PERFORMANCE TESTS ====================

class TestPerformance:
    """Test system performance"""
    
    def test_create_beneficiary_response_time(self, client, auth_headers):
        """Test beneficiary creation response time"""
        start_time = time.time()
        
        response = client.post(
            '/api/beneficiaries',
            json={
                'name': 'Performance Test',
                'date_of_birth': '1990-01-01',
                'gender': 'male'
            },
            headers=auth_headers
        )
        
        elapsed_time = (time.time() - start_time) * 1000  # Convert to ms
        
        assert response.status_code == 201
        assert elapsed_time < 500  # Should be less than 500ms
    
    def test_list_beneficiaries_response_time(self, client, auth_headers):
        """Test list endpoint response time"""
        # Create multiple beneficiaries
        for i in range(20):
            client.post(
                '/api/beneficiaries',
                json={
                    'name': f'Beneficiary {i}',
                    'date_of_birth': '1990-01-01',
                    'gender': 'male'
                },
                headers=auth_headers
            )
        
        start_time = time.time()
        response = client.get(
            '/api/beneficiaries',
            headers=auth_headers
        )
        elapsed_time = (time.time() - start_time) * 1000
        
        assert response.status_code == 200
        assert elapsed_time < 1000  # Should be less than 1 second
    
    def test_search_response_time(self, client, auth_headers):
        """Test search endpoint response time"""
        # Create test data
        for i in range(50):
            client.post(
                '/api/beneficiaries',
                json={
                    'name': f'Search Test {i}',
                    'date_of_birth': '1990-01-01',
                    'gender': 'male'
                },
                headers=auth_headers
            )
        
        start_time = time.time()
        response = client.post(
            '/api/advanced/search',
            json={
                'type': 'beneficiaries',
                'q': 'Search Test'
            },
            headers=auth_headers
        )
        elapsed_time = (time.time() - start_time) * 1000
        
        assert response.status_code == 200
        assert elapsed_time < 1000


# ==================== BATCH OPERATIONS TESTS ====================

class TestBatchOperations:
    """Test batch operations"""
    
    def test_batch_create_beneficiaries(self, client, auth_headers):
        """Test batch creating beneficiaries"""
        response = client.post(
            '/api/advanced/beneficiaries/batch-create',
            json={
                'beneficiaries': [
                    {
                        'name': 'Batch Test 1',
                        'date_of_birth': '1990-01-01',
                        'gender': 'male'
                    },
                    {
                        'name': 'Batch Test 2',
                        'date_of_birth': '1991-01-01',
                        'gender': 'female'
                    }
                ]
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        assert response.json['created_count'] == 2
    
    def test_batch_update_beneficiaries(self, client, auth_headers):
        """Test batch updating beneficiaries"""
        # Create beneficiaries first
        create_response = client.post(
            '/api/advanced/beneficiaries/batch-create',
            json={
                'beneficiaries': [
                    {'name': 'Update Test 1', 'date_of_birth': '1990-01-01', 'gender': 'male'},
                    {'name': 'Update Test 2', 'date_of_birth': '1991-01-01', 'gender': 'female'}
                ]
            },
            headers=auth_headers
        )
        
        ids = [b['id'] for b in create_response.json['beneficiaries']]
        
        # Update
        response = client.put(
            '/api/advanced/beneficiaries/batch-update',
            json={
                'updates': [
                    {'id': ids[0], 'gender': 'female'},
                    {'id': ids[1], 'gender': 'male'}
                ]
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.json['updated_count'] == 2
    
    def test_batch_delete_beneficiaries(self, client, auth_headers):
        """Test batch deleting beneficiaries"""
        # Create beneficiaries
        create_response = client.post(
            '/api/advanced/beneficiaries/batch-create',
            json={
                'beneficiaries': [
                    {'name': 'Delete Test 1', 'date_of_birth': '1990-01-01', 'gender': 'male'},
                    {'name': 'Delete Test 2', 'date_of_birth': '1991-01-01', 'gender': 'female'}
                ]
            },
            headers=auth_headers
        )
        
        ids = [b['id'] for b in create_response.json['beneficiaries']]
        
        # Delete
        response = client.delete(
            '/api/advanced/beneficiaries/batch-delete',
            json={'ids': ids},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.json['deleted_count'] == 2


# ==================== ADVANCED SEARCH TESTS ====================

class TestAdvancedSearch:
    """Test advanced search functionality"""
    
    def test_search_beneficiaries(self, client, auth_headers):
        """Test searching beneficiaries"""
        # Create test data
        client.post(
            '/api/beneficiaries',
            json={
                'name': 'Search Target',
                'date_of_birth': '1990-01-01',
                'gender': 'male'
            },
            headers=auth_headers
        )
        
        response = client.post(
            '/api/advanced/search',
            json={
                'type': 'beneficiaries',
                'q': 'Search Target'
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert len(response.json['results']) > 0
