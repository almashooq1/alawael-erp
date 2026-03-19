"""
اختبارات API المستفيدين
"""

import pytest
from datetime import date


class TestBeneficiariesAPI:
    """اختبارات API المستفيدين"""

    @pytest.fixture
    def beneficiary_data(self):
        """بيانات مستفيد للاختبار"""
        return {
            'national_id': '1234567890',
            'first_name': 'أحمد',
            'last_name': 'محمد',
            'date_of_birth': '2010-05-15',
            'gender': 'M',
            'disability_type': 'Physical',
            'disability_category': 'Mobility',
            'severity_level': 'Moderate',
            'phone': '0501234567',
            'email': 'beneficiary@example.com',
            'address': 'الرياض',
            'guardian_name': 'الأب',
            'guardian_phone': '0509876543'
        }

    def test_create_beneficiary(self, client, auth_token, beneficiary_data):
        """اختبار إنشاء مستفيد جديد"""
        response = client.post('/api/beneficiaries',
            json=beneficiary_data,
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )

        assert response.status_code == 201
        data = response.get_json()
        assert 'data' in data
        assert data['data']['first_name'] == 'أحمد'
        assert 'id' in data['data']

    def test_get_beneficiaries_list(self, client, auth_token, beneficiary_data):
        """اختبار الحصول على قائمة المستفيدين"""
        # إنشاء مستفيد أولاً
        client.post('/api/beneficiaries',
            json=beneficiary_data,
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )

        # الحصول على القائمة
        response = client.get('/api/beneficiaries?page=1&per_page=10',
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert 'data' in data
        assert 'pagination' in data
        assert len(data['data']) > 0

    def test_get_beneficiary_by_id(self, client, auth_token, beneficiary_data):
        """اختبار الحصول على مستفيد محدد"""
        # إنشاء مستفيد
        create_response = client.post('/api/beneficiaries',
            json=beneficiary_data,
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )
        beneficiary_id = create_response.get_json()['data']['id']

        # الحصول على المستفيد
        response = client.get(f'/api/beneficiaries/{beneficiary_id}',
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['first_name'] == 'أحمد'

    def test_update_beneficiary(self, client, auth_token, beneficiary_data):
        """اختبار تحديث مستفيد"""
        # إنشاء مستفيد
        create_response = client.post('/api/beneficiaries',
            json=beneficiary_data,
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )
        beneficiary_id = create_response.get_json()['data']['id']

        # تحديث البيانات
        update_data = beneficiary_data.copy()
        update_data['first_name'] = 'علي'

        response = client.put(f'/api/beneficiaries/{beneficiary_id}',
            json=update_data,
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['first_name'] == 'علي'

    def test_delete_beneficiary(self, client, auth_token, beneficiary_data):
        """اختبار حذف مستفيد"""
        # إنشاء مستفيد
        create_response = client.post('/api/beneficiaries',
            json=beneficiary_data,
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )
        beneficiary_id = create_response.get_json()['data']['id']

        # حذف المستفيد
        response = client.delete(f'/api/beneficiaries/{beneficiary_id}',
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )

        assert response.status_code == 200

        # التحقق من الحذف
        get_response = client.get(f'/api/beneficiaries/{beneficiary_id}',
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )
        assert get_response.status_code == 404

    def test_beneficiary_validation_missing_fields(self, client, auth_token):
        """اختبار التحقق من البيانات الناقصة"""
        invalid_data = {
            'first_name': 'أحمد'
            # البيانات ناقصة
        }

        response = client.post('/api/beneficiaries',
            json=invalid_data,
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )

        assert response.status_code == 400

    def test_get_beneficiary_sessions(self, client, auth_token, beneficiary_data):
        """اختبار الحصول على جلسات المستفيد"""
        # إنشاء مستفيد
        create_response = client.post('/api/beneficiaries',
            json=beneficiary_data,
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )
        beneficiary_id = create_response.get_json()['data']['id']

        # الحصول على الجلسات
        response = client.get(f'/api/beneficiaries/{beneficiary_id}/sessions',
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert 'data' in data
        assert isinstance(data['data'], list)

    def test_beneficiary_pagination(self, client, auth_token, beneficiary_data):
        """اختبار الترقيم"""
        # إنشاء عدة مستفيدين
        for i in range(15):
            data = beneficiary_data.copy()
            data['national_id'] = f'123456789{i}'
            data['first_name'] = f'مستفيد{i}'
            client.post('/api/beneficiaries',
                json=data,
                headers={'Authorization': f'Bearer {auth_token}'},
                content_type='application/json'
            )

        # اختبار صفحة 1
        response = client.get('/api/beneficiaries?page=1&per_page=10',
            headers={'Authorization': f'Bearer {auth_token}'},
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['data']) == 10
        assert data['pagination']['total'] >= 15
