import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from app import create_app
from models import db

try:
    from models import User, Beneficiary, Session, Report, Assessment, Goal, Program
except ImportError as e:
    print(f"Warning: Could not import all models: {e}")


@pytest.fixture
def app():
    """Create and configure a test app."""
    # Set environment to use simple cache before creating app
    os.environ['FLASK_ENV'] = 'testing'

    result = create_app('testing')

    # Handle both tuple and direct app returns
    if isinstance(result, tuple):
        app, socketio = result
    else:
        app = result

    # Disable Redis/Limiter for tests
    app.config['RATELIMIT_ENABLED'] = False
    app.config['CACHE_TYPE'] = 'simple'
    app.config['REDIS_URL'] = 'memory://'

    with app.app_context():
        # Create all tables
        db.create_all()
        yield app
        # Clean up
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """A test CLI runner for the app."""
    return app.test_cli_runner()


@pytest.fixture
def auth_token(client):
    """Create a test user and return authentication token."""
    # Register a user
    response = client.post(
        '/api/auth/register',
        json={
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPassword123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )

    # Login to get token
    response = client.post(
        '/api/auth/login',
        json={
            'username': 'testuser',
            'password': 'TestPassword123!'
        }
    )

    if response.status_code == 200:
        return response.get_json()['data']['access_token']

    return None


@pytest.fixture
def beneficiary_data():
    """Sample beneficiary data for testing."""
    return {
        'first_name': 'Ahmed',
        'last_name': 'Mohamed',
        'date_of_birth': '1990-01-15',
        'gender': 'M',
        'national_id': '12345678901234',
        'phone_number': '+966501234567',
        'email': 'ahmed@example.com',
        'marital_status': 'married',
        'nationality': 'Saudi',
        'residency_status': 'resident',
        'education_level': 'secondary',
        'employment_status': 'unemployed',
        'monthly_income': 0,
        'address': 'Riyadh, Saudi Arabia'
    }


@pytest.fixture
def session_data():
    """Sample session data for testing."""
    return {
        'session_date': '2024-01-15',
        'session_type': 'individual',
        'duration': 60,
        'topic': 'Career Development',
        'notes': 'Discussed career planning and skills development',
        'status': 'completed'
    }


@pytest.fixture
def report_data():
    """Sample report data for testing."""
    return {
        'report_type': 'progress',
        'title': 'Monthly Progress Report',
        'content': 'Beneficiary has shown significant progress in their development',
        'status': 'draft'
    }
