"""
Load Testing using Locust
Tests system performance and concurrent user handling
"""

from locust import HttpUser, task, between
import random
import string


class CRMUser(HttpUser):
    """Simulates a CRM system user"""
    
    wait_time = between(1, 5)
    
    def on_start(self):
        """Login before running tasks"""
        # Generate random credentials
        self.email = f"user_{random.randint(1, 100)}@test.com"
        self.password = "password123"
        
        # Register/Login
        response = self.client.post("/api/auth/register", json={
            "email": self.email,
            "password": self.password,
            "first_name": "Test",
            "last_name": "User"
        })
        
        if response.status_code == 201:
            self.token = response.json().get('access_token', '')
        else:
            # Try login
            response = self.client.post("/api/auth/login", json={
                "email": self.email,
                "password": self.password
            })
            self.token = response.json().get('access_token', '')
    
    @task(1)
    def get_beneficiaries(self):
        """Get list of beneficiaries"""
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.get(
            "/api/beneficiaries",
            headers=headers,
            name="/api/beneficiaries"
        )
    
    @task(2)
    def create_beneficiary(self):
        """Create new beneficiary"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        data = {
            "name": f"Beneficiary {''.join(random.choices(string.ascii_letters, k=5))}",
            "date_of_birth": "1990-01-01",
            "gender": random.choice(["male", "female"]),
            "contact_info": f"contact_{random.randint(1000, 9999)}@example.com",
            "goals": ["goal1", "goal2"]
        }
        
        self.client.post(
            "/api/beneficiaries",
            json=data,
            headers=headers,
            name="/api/beneficiaries"
        )
    
    @task(1)
    def get_sessions(self):
        """Get sessions list"""
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.get(
            "/api/sessions",
            headers=headers,
            name="/api/sessions"
        )
    
    @task(2)
    def start_session(self):
        """Start new session"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # First get a beneficiary
        response = self.client.get(
            "/api/beneficiaries",
            headers=headers
        )
        
        if response.status_code == 200 and response.json().get('beneficiaries'):
            beneficiary_id = response.json()['beneficiaries'][0]['id']
            
            data = {
                "beneficiary_id": beneficiary_id,
                "session_type": random.choice(["assessment", "training", "coaching"])
            }
            
            self.client.post(
                "/api/sessions",
                json=data,
                headers=headers,
                name="/api/sessions"
            )
    
    @task(1)
    def get_analytics(self):
        """Get analytics dashboard"""
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.get(
            "/api/analytics/dashboard",
            headers=headers,
            name="/api/analytics/dashboard"
        )
    
    @task(1)
    def search_beneficiaries(self):
        """Advanced search"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        data = {
            "type": "beneficiaries",
            "q": f"test_{random.randint(1, 100)}",
            "filters": {
                "status": random.choice(["active", "inactive"])
            }
        }
        
        self.client.post(
            "/api/advanced/search",
            json=data,
            headers=headers,
            name="/api/advanced/search"
        )


class AdminUser(HttpUser):
    """Simulates an admin user"""
    
    wait_time = between(2, 8)
    
    def on_start(self):
        """Login as admin"""
        response = self.client.post("/api/auth/login", json={
            "email": "admin@test.com",
            "password": "admin123"
        })
        self.token = response.json().get('access_token', '')
    
    @task(1)
    def view_all_users(self):
        """View all users"""
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.get(
            "/api/admin/users",
            headers=headers,
            name="/api/admin/users"
        )
    
    @task(1)
    def view_analytics(self):
        """View system analytics"""
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.get(
            "/api/admin/analytics",
            headers=headers,
            name="/api/admin/analytics"
        )
    
    @task(1)
    def export_data(self):
        """Export data"""
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.post(
            "/api/advanced/export/csv",
            json={"type": "beneficiaries"},
            headers=headers,
            name="/api/advanced/export/csv"
        )
