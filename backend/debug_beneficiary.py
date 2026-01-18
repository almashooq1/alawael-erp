import sys
sys.path.insert(0, 'tests')

from app import create_app
from models import db

app, socketio = create_app()
with app.app_context():
    db.drop_all()
    db.create_all()

test_client = app.test_client()

# Register user
reg_response = test_client.post('/api/auth/register', json={
    'username': 'testuser',
    'email': 'test@example.com',
    'password': 'Secure@1234',
    'first_name': 'Test',
    'last_name': 'User'
}, content_type='application/json')

print(f"Register: {reg_response.status_code}")
reg_data = reg_response.get_json()
print(f"Reg response: {reg_data}")
token = reg_data['data']['access_token']

# Try create beneficiary
res = test_client.post('/api/beneficiaries',
    json={
        'national_id': '1234567890',
        'first_name': 'Ahmed',
        'last_name': 'Ali',
        'date_of_birth': '2010-05-15',
        'gender': 'M',
        'disability_type': 'Physical',
        'disability_category': 'Mobility',
        'severity_level': 'Moderate',
        'guardian_name': 'Dad',
        'guardian_phone': '123456'
    },
    headers={'Authorization': f'Bearer {token}'},
    content_type='application/json')

print(f'Status: {res.status_code}')
print(f'Response: {res.get_json()}')
