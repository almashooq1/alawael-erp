"""
Locust Load Testing Script for HR System
Tests critical user workflows under load
"""

from locust import HttpUser, task, between, events
import json
import random
from datetime import datetime, timedelta


class HRSystemUser(HttpUser):
    """
    Simulates HR system user behavior
    Performs realistic workflows under load
    """
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests
    
    def on_start(self):
        """Initialize user session"""
        self.token = None
        self.user_id = None
        self.employee_id = None
        self.headers = {}
        self.login()
    
    def login(self):
        """Login and get authentication token"""
        # Randomly select user type
        user_data = {
            "email": random.choice([
                "admin@example.com",
                "manager@example.com",
                "employee@example.com"
            ]),
            "password": random.choice([
                "Admin@12345",
                "Manager@12345",
                "Employee@12345"
            ])
        }
        
        with self.client.post(
            "/api/auth/login",
            json=user_data,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('token', '')
                self.user_id = data.get('userId', '')
                self.headers = {
                    'Authorization': f'Bearer {self.token}',
                    'Content-Type': 'application/json'
                }
                response.success()
            else:
                response.failure(f"Login failed with status {response.status_code}")

    @task(5)
    def view_dashboard(self):
        """Task: View dashboard (weight: 5)"""
        with self.client.get(
            "/api/dashboard",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Dashboard load failed: {response.status_code}")

    @task(3)
    def view_employees(self):
        """Task: View employee list (weight: 3)"""
        page = random.randint(1, 5)
        with self.client.get(
            f"/api/employees?page={page}&limit=10",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get('data'):
                    self.employee_id = data['data'][0].get('_id')
                response.success()
            else:
                response.failure(f"Get employees failed: {response.status_code}")

    @task(2)
    def search_employees(self):
        """Task: Search employees (weight: 2)"""
        search_term = random.choice(["Ahmed", "Fatima", "Mohammed", "Sarah"])
        with self.client.get(
            f"/api/employees?search={search_term}",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Search failed: {response.status_code}")

    @task(1)
    def get_employee_details(self):
        """Task: Get employee details (weight: 1)"""
        if self.employee_id:
            with self.client.get(
                f"/api/employees/{self.employee_id}",
                headers=self.headers,
                catch_response=True
            ) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Get employee details failed: {response.status_code}")

    @task(4)
    def view_payroll(self):
        """Task: View payroll data (weight: 4)"""
        month = random.randint(1, 12)
        year = 2026
        with self.client.get(
            f"/api/payroll?month={month}&year={year}",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Get payroll failed: {response.status_code}")

    @task(3)
    def view_leave_requests(self):
        """Task: View leave requests (weight: 3)"""
        with self.client.get(
            "/api/leave/requests",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Get leave requests failed: {response.status_code}")

    @task(2)
    def filter_leave_by_status(self):
        """Task: Filter leave by status (weight: 2)"""
        status = random.choice(["pending", "approved", "rejected"])
        with self.client.get(
            f"/api/leave/requests?status={status}",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Filter leave failed: {response.status_code}")

    @task(2)
    def get_reports(self):
        """Task: Get reports (weight: 2)"""
        report_type = random.choice(["overview", "payroll", "performance"])
        with self.client.get(
            f"/api/reports/{report_type}",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Get report failed: {response.status_code}")

    @task(1)
    def export_report(self):
        """Task: Export report (weight: 1)"""
        format_type = random.choice(["pdf", "csv", "excel"])
        with self.client.get(
            f"/api/reports/export?format={format_type}",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Export failed: {response.status_code}")

    @task(1)
    def get_attendance_report(self):
        """Task: Get attendance report (weight: 1)"""
        with self.client.get(
            "/api/attendance/report",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Attendance report failed: {response.status_code}")


class AdminUser(HRSystemUser):
    """Admin user - performs more sensitive operations"""
    
    @task(1)
    def create_employee(self):
        """Task: Create new employee (admin only)"""
        employee_data = {
            "name": f"Test Employee {random.randint(1000, 9999)}",
            "email": f"test{random.randint(1000, 9999)}@example.com",
            "phone": "+966501234567",
            "position": random.choice(["Engineer", "Manager", "Analyst"]),
            "department": random.choice(["IT", "HR", "Finance", "Operations"]),
            "salary": random.randint(5000, 15000)
        }
        
        with self.client.post(
            "/api/employees",
            json=employee_data,
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code in [201, 200]:
                response.success()
            else:
                response.failure(f"Create employee failed: {response.status_code}")

    @task(1)
    def process_payroll(self):
        """Task: Process payroll (admin only)"""
        month = random.randint(1, 12)
        year = 2026
        
        with self.client.post(
            f"/api/payroll/process",
            json={"month": month, "year": year},
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Process payroll failed: {response.status_code}")


# Event handlers for reporting
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when load test starts"""
    print("\n" + "="*70)
    print("HR SYSTEM LOAD TEST STARTED")
    print("="*70)
    print(f"Users: {environment.runner.target_user_count}")
    print(f"Spawn rate: {environment.runner.spawn_rate}")
    print("="*70 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when load test stops"""
    print("\n" + "="*70)
    print("LOAD TEST COMPLETED")
    print("="*70)
    
    # Print statistics
    print("\nResponse Time Statistics:")
    print(f"  Min: {environment.stats.total.min_response_time}ms")
    print(f"  Max: {environment.stats.total.max_response_time}ms")
    print(f"  Avg: {environment.stats.total.avg_response_time}ms")
    
    print(f"\nTotal Requests: {environment.stats.total.num_requests}")
    print(f"Failed Requests: {environment.stats.total.num_failures}")
    print(f"Success Rate: {((environment.stats.total.num_requests - environment.stats.total.num_failures) / environment.stats.total.num_requests * 100):.2f}%")
    
    print("\n" + "="*70 + "\n")
