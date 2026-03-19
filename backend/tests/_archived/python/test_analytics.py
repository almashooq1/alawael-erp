"""
Test Analytics Endpoints
Tests for analytics routes and data aggregation
"""

import pytest
from datetime import datetime, timedelta
from models import User, Beneficiary, Session
from app import db


class TestAnalyticsAPI:
    """Analytics API Tests"""

    def test_get_analytics_dashboard(self, client, auth_token):
        """Test getting analytics dashboard"""
        response = client.get(
            '/api/analytics/dashboard',
            headers={'Authorization': f'Bearer {auth_token}'}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 200
        assert 'data' in data
        assert 'summary' in data['data']
        assert 'total_beneficiaries' in data['data']['summary']
        assert 'total_sessions' in data['data']['summary']

    def test_get_sessions_statistics(self, client, auth_token):
        """Test getting session statistics"""
        response = client.get(
            '/api/analytics/sessions/stats',
            headers={'Authorization': f'Bearer {auth_token}'}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 200
        assert 'data' in data
        assert 'sessions_by_day' in data['data']
        assert 'sessions_by_hour' in data['data']

    def test_get_beneficiaries_statistics(self, client, auth_token):
        """Test getting beneficiary statistics"""
        response = client.get(
            '/api/analytics/beneficiaries/stats',
            headers={'Authorization': f'Bearer {auth_token}'}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 200
        assert 'data' in data
        assert 'age_distribution' in data['data']
        assert 'top_active_beneficiaries' in data['data']

    def test_get_usage_trends(self, client, auth_token):
        """Test getting usage trends"""
        response = client.get(
            '/api/analytics/usage-trends',
            headers={'Authorization': f'Bearer {auth_token}'}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 200
        assert 'data' in data
        assert 'last_30_days' in data['data']

    def test_export_to_csv(self, client, auth_token):
        """Test exporting data to CSV"""
        response = client.get(
            '/api/analytics/export/csv',
            headers={'Authorization': f'Bearer {auth_token}'}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 200
        assert 'data' in data
        assert 'export_format' in data

    def test_analytics_without_token(self, client):
        """Test analytics endpoints without authentication"""
        endpoints = [
            '/api/analytics/dashboard',
            '/api/analytics/sessions/stats',
            '/api/analytics/beneficiaries/stats',
            '/api/analytics/usage-trends'
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401

    def test_analytics_dashboard_with_data(self, client, auth_token, test_user, test_beneficiary, test_session):
        """Test analytics dashboard with actual data"""
        response = client.get(
            '/api/analytics/dashboard',
            headers={'Authorization': f'Bearer {auth_token}'}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['summary']['total_beneficiaries'] >= 0
        assert data['data']['summary']['total_sessions'] >= 0
