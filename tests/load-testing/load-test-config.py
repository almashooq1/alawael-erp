"""
Load Test Configuration and Scenarios
Defines different load test profiles for HR System
"""

import os
from enum import Enum


class LoadTestProfile(Enum):
    """Different load testing scenarios"""
    SMOKE_TEST = "smoke"  # Minimal load - verify system works
    BASELINE = "baseline"  # Normal expected load
    PEAK_LOAD = "peak"  # Expected peak time load
    STRESS_TEST = "stress"  # Push until failure
    SPIKE_TEST = "spike"  # Sudden traffic increase


class LoadTestConfig:
    """Configuration for load test scenarios"""
    
    # Base configuration
    BASE_URL = os.getenv('API_URL', 'http://localhost:3001')
    TIMEOUT = 30  # seconds
    
    # Load test profiles
    PROFILES = {
        LoadTestProfile.SMOKE_TEST: {
            "users": 10,
            "spawn_rate": 2,
            "duration": 60,  # 1 minute
            "description": "Smoke test - verify basic functionality"
        },
        LoadTestProfile.BASELINE: {
            "users": 50,
            "spawn_rate": 5,
            "duration": 300,  # 5 minutes
            "description": "Baseline load - normal expected usage"
        },
        LoadTestProfile.PEAK_LOAD: {
            "users": 250,
            "spawn_rate": 10,
            "duration": 600,  # 10 minutes
            "description": "Peak load - expected maximum concurrent users"
        },
        LoadTestProfile.STRESS_TEST: {
            "users": 500,
            "spawn_rate": 20,
            "duration": 900,  # 15 minutes
            "description": "Stress test - push until failure"
        },
        LoadTestProfile.SPIKE_TEST: {
            "users": 1000,
            "spawn_rate": 100,  # Rapid increase
            "duration": 600,  # 10 minutes
            "description": "Spike test - sudden traffic spike"
        }
    }
    
    # Performance targets (SLA)
    PERFORMANCE_TARGETS = {
        "response_time_p50": 100,      # 50th percentile < 100ms
        "response_time_p95": 200,      # 95th percentile < 200ms
        "response_time_p99": 500,      # 99th percentile < 500ms
        "success_rate": 99.5,          # 99.5% success rate
        "error_rate": 0.5,             # < 0.5% errors
        "throughput_min": 100,         # Minimum 100 requests/sec
    }
    
    # Endpoint-specific targets
    ENDPOINT_TARGETS = {
        "/api/auth/login": {
            "p95_ms": 150,
            "p99_ms": 300,
            "success_rate": 99.8
        },
        "/api/dashboard": {
            "p95_ms": 200,
            "p99_ms": 500,
            "success_rate": 99.5
        },
        "/api/employees": {
            "p95_ms": 150,
            "p99_ms": 300,
            "success_rate": 99.5
        },
        "/api/payroll/process": {
            "p95_ms": 500,
            "p99_ms": 1000,
            "success_rate": 99.9
        },
        "/api/leave/requests": {
            "p95_ms": 150,
            "p99_ms": 300,
            "success_rate": 99.5
        },
        "/api/reports/:type": {
            "p95_ms": 200,
            "p99_ms": 500,
            "success_rate": 99.0
        }
    }
    
    # Test user credentials
    TEST_USERS = [
        {
            "email": "admin@example.com",
            "password": "Admin@12345",
            "role": "admin"
        },
        {
            "email": "manager@example.com",
            "password": "Manager@12345",
            "role": "manager"
        },
        {
            "email": "employee@example.com",
            "password": "Employee@12345",
            "role": "employee"
        }
    ]
    
    # Test data generators
    @staticmethod
    def get_employee_data(index):
        """Generate test employee data"""
        return {
            "name": f"Test Employee {index}",
            "email": f"test.employee{index}@example.com",
            "phone": f"+9665012345{str(index).zfill(2)}",
            "position": ["Engineer", "Manager", "Analyst", "Developer"][index % 4],
            "department": ["IT", "HR", "Finance", "Operations"][index % 4],
            "salary": 5000 + (index * 100),
            "joinDate": "2023-01-15",
            "status": "active"
        }
    
    @staticmethod
    def get_leave_request_data(employee_id):
        """Generate test leave request data"""
        return {
            "employeeId": employee_id,
            "startDate": "2026-03-01",
            "endDate": "2026-03-05",
            "type": "annual",
            "reason": "Personal vacation",
            "status": "pending"
        }
    
    @staticmethod
    def get_payroll_data(month, year):
        """Generate test payroll data"""
        return {
            "month": month,
            "year": year,
            "status": "processing"
        }
    
    # Metrics collection settings
    METRICS = {
        "collect_response_times": True,
        "collect_error_rates": True,
        "collect_throughput": True,
        "save_results": True,
        "output_file": "load_test_results.json"
    }
    
    # Reporting settings
    REPORTING = {
        "print_stats_interval": 60,  # Print stats every 60 seconds
        "log_failures": True,
        "save_html_report": True,
        "report_file": "load_test_report.html"
    }


def get_profile_config(profile_name):
    """Get configuration for specific profile"""
    try:
        profile = LoadTestProfile[profile_name.upper()]
        return LoadTestConfig.PROFILES[profile]
    except KeyError:
        raise ValueError(f"Unknown profile: {profile_name}")


def print_config(profile_name):
    """Print configuration details"""
    profile = get_profile_config(profile_name)
    
    print("\n" + "="*60)
    print("LOAD TEST CONFIGURATION")
    print("="*60)
    print(f"Profile: {profile_name}")
    print(f"Description: {profile['description']}")
    print(f"Users: {profile['users']}")
    print(f"Spawn Rate: {profile['spawn_rate']} users/sec")
    print(f"Duration: {profile['duration']} seconds")
    print("\nPerformance Targets:")
    for key, value in LoadTestConfig.PERFORMANCE_TARGETS.items():
        print(f"  {key}: {value}")
    print("="*60 + "\n")


if __name__ == "__main__":
    # Print all available profiles
    print("\nAvailable Load Test Profiles:")
    for profile in LoadTestProfile:
        print(f"  - {profile.name.lower()}")
