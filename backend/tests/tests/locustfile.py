"""
Locustfile - اختبار الحمل لنظام تتبع الحافلات GPS
استخدام: locust -f locustfile.py -u 1000 -r 100 -t 10m
"""

from locust import HttpUser, task, between
import random
import json
from datetime import datetime

# ====== 1. سلوك المستخدم الأساسي ======

class DriverUser(HttpUser):
    """محاكاة سائق الحافلة"""
    
    wait_time = between(5, 15)  # انتظار 5-15 ثانية بين الطلبات
    
    def on_start(self):
        """تسجيل الدخول عند البداية"""
        self.login()
    
    def login(self):
        """تسجيل دخول"""
        response = self.client.post('/auth/login', json={
            'email': f'driver_{random.randint(1, 1000)}@example.com',
            'password': 'TestPassword123!'
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['data']['accessToken']
    
    @task(4)  # تشغيل هذه المهمة أكثر (4 مرات)
    def update_location(self):
        """تحديث موقع المركبة (الأكثر تكراراً)"""
        headers = {'Authorization': f'Bearer {self.token}'}
        
        self.client.post('/gps/location/update', json={
            'vehicleId': f'vehicle_{random.randint(1, 1000)}',
            'latitude': 24.7136 + random.uniform(-0.5, 0.5),
            'longitude': 46.6753 + random.uniform(-0.5, 0.5),
            'speed': random.randint(0, 120),
            'heading': random.randint(0, 360),
            'timestamp': datetime.utcnow().isoformat()
        }, headers=headers)
    
    @task(2)  # أقل تكراراً
    def check_alerts(self):
        """فحص التنبيهات"""
        headers = {'Authorization': f'Bearer {self.token}'}
        self.client.get('/notifications', headers=headers)
    
    @task(1)  # نادر جداً
    def get_route(self):
        """طلب المسار"""
        headers = {'Authorization': f'Bearer {self.token}'}
        vehicle_id = f'vehicle_{random.randint(1, 1000)}'
        self.client.get(f'/gps/vehicle/{vehicle_id}/route', headers=headers)


class ManagerUser(HttpUser):
    """محاكاة مدير الأسطول"""
    
    wait_time = between(10, 30)  # انتظار أطول
    
    def on_start(self):
        self.login()
    
    def login(self):
        response = self.client.post('/auth/login', json={
            'email': f'manager_{random.randint(1, 100)}@example.com',
            'password': 'TestPassword123!'
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['data']['accessToken']
    
    @task(5)
    def view_dashboard(self):
        """عرض لوحة التحكم"""
        headers = {'Authorization': f'Bearer {self.token}'}
        self.client.get('/dashboard/fleet-summary', headers=headers)
    
    @task(3)
    def view_vehicles(self):
        """عرض قائمة المركبات"""
        headers = {'Authorization': f'Bearer {self.token}'}
        self.client.get('/dashboard/vehicles', headers=headers)
    
    @task(2)
    def get_performance_report(self):
        """الحصول على تقرير الأداء"""
        headers = {'Authorization': f'Bearer {self.token}'}
        self.client.get('/reports/performance', params={
            'period': 'month',
            'type': 'fleet'
        }, headers=headers)
    
    @task(1)
    def get_trip_report(self):
        """تقرير الرحلات"""
        headers = {'Authorization': f'Bearer {self.token}'}
        self.client.get('/reports/trips', params={
            'startDate': '2024-01-01',
            'endDate': '2024-01-31'
        }, headers=headers)


class SystemUser(HttpUser):
    """محاكاة نظام متكامل"""
    
    wait_time = between(1, 5)  # طلبات متكررة جداً
    
    def on_start(self):
        self.login()
    
    def login(self):
        response = self.client.post('/auth/login', json={
            'email': 'system@example.com',
            'password': 'TestPassword123!'
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['data']['accessToken']
    
    @task(10)
    def bulk_location_updates(self):
        """تحديثات موقع بالجملة"""
        headers = {'Authorization': f'Bearer {self.token}'}
        
        # تحديث متعدد في طلب واحد
        for _ in range(10):
            self.client.post('/gps/location/update', json={
                'vehicleId': f'vehicle_{random.randint(1, 10000)}',
                'latitude': 24.7136 + random.uniform(-0.5, 0.5),
                'longitude': 46.6753 + random.uniform(-0.5, 0.5),
                'speed': random.randint(0, 120),
                'heading': random.randint(0, 360),
                'timestamp': datetime.utcnow().isoformat()
            }, headers=headers)
    
    @task(5)
    def ml_predictions(self):
        """استدعاء نماذج ML"""
        headers = {'Authorization': f'Bearer {self.token}'}
        
        # بدء تنبؤ
        self.client.post('/predictions/accident-risk', json={
            'vehicleId': f'vehicle_{random.randint(1, 1000)}',
            'speed': random.randint(0, 150),
            'acceleration': random.uniform(-10, 10),
            'weather': random.choice(['clear', 'rain', 'snow']),
            'roadType': random.choice(['highway', 'city', 'rural']),
            'timeOfDay': random.choice(['morning', 'afternoon', 'night']),
            'driverExperience': random.randint(1, 50)
        }, headers=headers)
    
    @task(3)
    def send_notifications(self):
        """إرسال إشعارات"""
        headers = {'Authorization': f'Bearer {self.token}'}
        
        self.client.post('/notifications/send', json={
            'userId': f'user_{random.randint(1, 500)}',
            'type': random.choice(['alert', 'info', 'warning']),
            'title': 'Test Notification',
            'message': 'This is a test notification',
            'channels': ['push', 'email'],
            'priority': random.choice(['low', 'medium', 'high'])
        }, headers=headers)


# ====== 2. سيناريوهات خاصة ======

class SpikeLoadUser(HttpUser):
    """محاكاة ارتفاع مفاجئ في الحمل"""
    
    wait_time = between(0.5, 2)  # طلبات سريعة جداً
    
    def on_start(self):
        self.login()
    
    def login(self):
        response = self.client.post('/auth/login', json={
            'email': f'spike_{random.randint(1, 10000)}@example.com',
            'password': 'TestPassword123!'
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['data']['accessToken']
    
    @task(10)
    def rapid_requests(self):
        """طلبات سريعة متتالية"""
        headers = {'Authorization': f'Bearer {self.token}'}
        
        # 10 طلبات متتالية
        for _ in range(10):
            self.client.get('/dashboard/vehicles', headers=headers)


class StressTestUser(HttpUser):
    """اختبار الضغط - طلبات معقدة"""
    
    wait_time = between(5, 10)
    
    def on_start(self):
        self.login()
    
    def login(self):
        response = self.client.post('/auth/login', json={
            'email': f'stress_{random.randint(1, 1000)}@example.com',
            'password': 'TestPassword123!'
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['data']['accessToken']
    
    @task(1)
    def complex_analytics(self):
        """استعلامات تحليلية معقدة"""
        headers = {'Authorization': f'Bearer {self.token}'}
        
        # استعلام بارامترات معقدة
        self.client.get('/reports/performance', params={
            'period': 'month',
            'type': 'detailed',
            'vehicleId': f'vehicle_{random.randint(1, 1000)}',
            'driverId': f'driver_{random.randint(1, 500)}',
            'format': 'json'
        }, headers=headers)
    
    @task(1)
    def route_optimization(self):
        """تحسين المسارات"""
        headers = {'Authorization': f'Bearer {self.token}'}
        
        self.client.post('/predictions/route-optimization', json={
            'startPoint': {
                'latitude': 24.7136,
                'longitude': 46.6753
            },
            'endPoint': {
                'latitude': 24.8,
                'longitude': 46.8
            },
            'waypoints': [
                {'latitude': 24.72, 'longitude': 46.7},
                {'latitude': 24.75, 'longitude': 46.75}
            ],
            'time': 'morning',
            'preferences': 'fuel_efficient'
        }, headers=headers)


# ====== 3. معالجات الأحداث ======

def on_test_start(environment):
    """عند بدء الاختبار"""
    print(f"🚀 بدء اختبار الحمل في {datetime.now()}")
    print(f"📊 المستخدمون المتزامنون: {environment.runner.target_user_count}")


def on_test_stop(environment):
    """عند انتهاء الاختبار"""
    print(f"\n✅ انتهى اختبار الحمل في {datetime.now()}")
    
    # طباعة الملخص
    stats = environment.stats
    print(f"\nملخص الاختبار:")
    print(f"  إجمالي الطلبات: {stats.total.num_requests}")
    print(f"  أخطاء: {stats.total.num_failures}")
    print(f"  الحد الأدنى: {stats.total.min_response_time}ms")
    print(f"  الحد الأقصى: {stats.total.max_response_time}ms")
    print(f"  المتوسط: {stats.total.avg_response_time}ms")
