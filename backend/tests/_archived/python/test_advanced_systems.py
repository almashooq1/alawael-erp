"""
اختبارات شاملة لجميع الأنظمة المتقدمة
Comprehensive Tests for All Advanced Systems
"""

import unittest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import sys

# استيراد الأنظمة
sys.path.insert(0, '/backend/advanced')

from webhooks_websocket import (
    EventType, Event, EventBus, WebhookEndpoint, 
    WebhookManager, WebSocketHandler
)
from task_queue_scheduler import (
    TaskStatus, TaskPriority, Task, TaskQueue, 
    ScheduledJob, Scheduler, JobType, RecurrencePattern
)
from api_documentation import (
    Parameter, Response, APIEndpoint, APICollection,
    APIDocumentation, DeveloperPortal, HTTPMethod, ParameterType
)
from monitoring_observability import (
    MetricType, AlertSeverity, Metric, MetricsCollector,
    HealthCheck, Alert, AlertManager, ObservabilitySystem
)
from ml_integration import (
    PredictionType, Prediction, Recommendation, DropoutPredictor,
    PerformancePredictor, AttendancePredictor, RecommendationEngine,
    MLIntegrationSystem
)


# ==================== الاختبارات ====================

class TestWebhooksAndWebSocket(unittest.TestCase):
    """اختبارات نظام Webhooks و WebSocket"""
    
    def setUp(self):
        self.event_bus = EventBus()
        self.webhook_manager = WebhookManager(self.event_bus)
    
    def test_event_creation(self):
        """اختبار إنشاء الحدث"""
        event = Event(EventType.GRADE_POSTED, {'grade': 85})
        self.assertIsNotNone(event.id)
        self.assertEqual(event.type, EventType.GRADE_POSTED)
        self.assertEqual(event.data['grade'], 85)
    
    def test_event_bus_subscription(self):
        """اختبار الاشتراك في الأحداث"""
        callback_called = []
        
        def callback(event):
            callback_called.append(event)
        
        self.event_bus.subscribe(EventType.GRADE_POSTED, callback)
        event = Event(EventType.GRADE_POSTED, {'grade': 90})
        self.event_bus.publish(event)
        
        self.assertEqual(len(callback_called), 1)
        self.assertEqual(callback_called[0].data['grade'], 90)
    
    def test_webhook_registration(self):
        """اختبار تسجيل Webhook"""
        webhook_id = self.webhook_manager.register_webhook(
            "https://api.example.com/webhook",
            [EventType.GRADE_POSTED]
        )
        
        self.assertIsNotNone(webhook_id)
        webhook_info = self.webhook_manager.get_webhook_info(webhook_id)
        self.assertIsNotNone(webhook_info)
        self.assertEqual(webhook_info['is_active'], True)
    
    def test_websocket_connection(self):
        """اختبار اتصال WebSocket"""
        ws_handler = WebSocketHandler(self.event_bus)
        session_id = ws_handler.connect('STU001', 'sess_123')
        
        self.assertEqual(session_id, 'sess_123')
        self.assertIn('STU001', ws_handler.connections)


class TestTaskQueue(unittest.TestCase):
    """اختبارات نظام Task Queue"""
    
    def setUp(self):
        self.task_queue = TaskQueue(num_workers=2)
    
    def test_task_creation(self):
        """اختبار إنشاء المهمة"""
        task = Task("task_1", JobType.EMAIL_SEND, {'to': 'test@example.com'})
        self.assertEqual(task.id, "task_1")
        self.assertEqual(task.status, TaskStatus.PENDING)
    
    def test_task_submission(self):
        """اختبار إرسال المهمة"""
        task = Task("task_2", JobType.REPORT_GENERATE, {'type': 'performance'})
        task_id = self.task_queue.submit(task)
        
        self.assertEqual(task_id, "task_2")
        self.assertEqual(task.status, TaskStatus.QUEUED)
    
    def test_task_completion(self):
        """اختبار إكمال المهمة"""
        task = Task("task_3", JobType.DATA_EXPORT, {'format': 'excel'})
        task.start()
        task.complete(result={'file_id': 'file_123'})
        
        self.assertEqual(task.status, TaskStatus.COMPLETED)
        self.assertEqual(task.result['file_id'], 'file_123')
    
    def test_task_failure_and_retry(self):
        """اختبار فشل المهمة وإعادة المحاولة"""
        task = Task("task_4", JobType.ANALYSIS, {'type': 'performance'})
        task.fail(Exception("Test error"))
        
        self.assertEqual(task.status, TaskStatus.RETRYING)
        self.assertEqual(task.attempts, 1)
    
    def test_scheduler_job_creation(self):
        """اختبار إنشاء وظيفة مجدولة"""
        job = ScheduledJob(
            "job_1",
            JobType.BACKUP,
            {'target': 'database'},
            schedule_time=datetime.now() + timedelta(hours=1),
            recurrence=RecurrencePattern.DAILY
        )
        
        self.assertEqual(job.job_type, JobType.BACKUP)
        self.assertEqual(job.recurrence, RecurrencePattern.DAILY)


class TestAPIDocumentation(unittest.TestCase):
    """اختبارات نظام API Documentation"""
    
    def setUp(self):
        self.docs = APIDocumentation()
    
    def test_collection_creation(self):
        """اختبار إنشاء مجموعة API"""
        collection = self.docs.create_collection("Students", "1.0")
        self.assertEqual(collection.name, "Students")
        self.assertEqual(collection.version, "1.0")
    
    def test_endpoint_creation(self):
        """اختبار إنشاء نقطة نهاية"""
        collection = self.docs.create_collection("Students", "1.0")
        
        endpoint = APIEndpoint(
            method=HTTPMethod.GET,
            path="/students",
            summary="احصل على الطلاب",
            description="احصل على قائمة الطلاب",
            tags=["Students"],
            parameters=[
                Parameter("page", ParameterType.INTEGER, description="رقم الصفحة")
            ]
        )
        
        collection.add_endpoint("get_students", endpoint)
        self.assertEqual(collection.get_endpoint_count(), 1)
    
    def test_model_registration(self):
        """اختبار تسجيل نموذج"""
        self.docs.register_model("Student", {
            'type': 'object',
            'properties': {'name': {'type': 'string'}}
        })
        
        self.assertIn("Student", self.docs.models)
    
    def test_error_registration(self):
        """اختبار تسجيل الخطأ"""
        self.docs.register_error(
            404,
            "NotFound",
            "المورد غير موجود",
            ["تحقق من المعرف"]
        )
        
        self.assertIn(404, self.docs.errors)


class TestMonitoring(unittest.TestCase):
    """اختبارات نظام Monitoring"""
    
    def setUp(self):
        self.obs = ObservabilitySystem()
    
    def test_metric_creation(self):
        """اختبار إنشاء المقياس"""
        metric = self.obs.create_metric("cpu_usage", MetricType.GAUGE)
        self.assertIsNotNone(metric)
    
    def test_metric_recording(self):
        """اختبار تسجيل القيمة"""
        self.obs.create_metric("memory_usage", MetricType.GAUGE)
        
        for i in range(10):
            self.obs.record_metric("memory_usage", 50 + i)
        
        metric_info = self.obs.metrics_collector.get_metric("memory_usage")
        stats = metric_info['statistics']
        
        self.assertEqual(stats['count'], 10)
        self.assertGreater(stats['max'], stats['min'])
    
    def test_alert_rule_creation(self):
        """اختبار إنشاء قاعدة التنبيه"""
        self.obs.add_alert_rule("cpu_usage", 80, "greater_than", AlertSeverity.CRITICAL)
        self.assertEqual(len(self.obs.alert_manager.alert_rules), 1)
    
    def test_health_check(self):
        """اختبار فحص الصحة"""
        self.obs.register_health_check(
            "database",
            lambda: True
        )
        
        health = self.obs.get_system_health()
        self.assertEqual(health['overall'], 'healthy')


class TestMLIntegration(unittest.TestCase):
    """اختبارات نظام ML Integration"""
    
    def setUp(self):
        self.ml_system = MLIntegrationSystem()
    
    def test_dropout_prediction(self):
        """اختبار التنبؤ بالترك"""
        student_data = {
            'student_id': 'STU001',
            'attendance_rate': 0.6,
            'gpa': 2.0,
            'assignment_completion': 0.5,
            'engagement_score': 0.4,
            'participation': 0.3
        }
        
        prediction = self.ml_system.dropout_predictor.predict(student_data)
        self.assertEqual(prediction.prediction_type, PredictionType.STUDENT_DROPOUT)
        self.assertGreater(prediction.probability, 0.5)  # خطر عالي
    
    def test_performance_prediction(self):
        """اختبار التنبؤ بالأداء"""
        student_data = {
            'student_id': 'STU002',
            'current_average': 75,
            'assignment_average': 80,
            'participation': 0.7,
            'recent_grades': [70, 75, 80]
        }
        
        prediction = self.ml_system.performance_predictor.predict(student_data)
        self.assertEqual(prediction.prediction_type, PredictionType.GRADE_PERFORMANCE)
        self.assertGreater(prediction.predicted_value['predicted_grade'], 0)
    
    def test_attendance_prediction(self):
        """اختبار التنبؤ بالحضور"""
        student_data = {
            'student_id': 'STU003',
            'attendance_rate': 0.85,
            'recent_absences': 1,
            'trend_direction': 0
        }
        
        prediction = self.ml_system.attendance_predictor.predict(student_data)
        self.assertEqual(prediction.prediction_type, PredictionType.ATTENDANCE_PATTERN)
        self.assertIsNotNone(prediction.predicted_value['pattern'])
    
    def test_student_analysis(self):
        """اختبار تحليل الطالب"""
        student_data = {
            'student_id': 'STU004',
            'attendance_rate': 0.75,
            'gpa': 2.8,
            'assignment_completion': 0.70,
            'engagement_score': 0.6,
            'participation': 0.5,
            'current_average': 72,
            'assignment_average': 75,
            'recent_absences': 3,
            'recent_grades': [70, 72, 71]
        }
        
        analysis = self.ml_system.analyze_student(student_data)
        
        self.assertIn('predictions', analysis)
        self.assertIn('recommendations', analysis)
        self.assertTrue(len(analysis['predictions']) > 0)


# ==================== اختبارات التكامل ====================

class TestSystemIntegration(unittest.TestCase):
    """اختبارات تكامل الأنظمة"""
    
    def test_webhook_to_task_queue_flow(self):
        """اختبار تدفق من Webhooks إلى Task Queue"""
        event_bus = EventBus()
        webhook_manager = WebhookManager(event_bus)
        task_queue = TaskQueue()
        
        # تسجيل Webhook
        webhook_id = webhook_manager.register_webhook(
            "https://api.example.com/webhook",
            [EventType.GRADE_POSTED]
        )
        
        # نشر حدث
        event = Event(EventType.GRADE_POSTED, {'grade': 90, 'student_id': 'STU001'})
        event_bus.publish(event)
        
        # التحقق من أن Webhook تم تسجيله
        self.assertIsNotNone(webhook_manager.get_webhook_info(webhook_id))
    
    def test_ml_to_task_to_webhook_flow(self):
        """اختبار تدفق من ML إلى Task إلى Webhook"""
        ml_system = MLIntegrationSystem()
        event_bus = EventBus()
        webhook_manager = WebhookManager(event_bus)
        
        # تسجيل Webhook للتنبيهات
        webhook_manager.register_webhook(
            "https://alerts.example.com/webhook",
            [EventType.STUDENT_CREATED]
        )
        
        # تحليل طالب
        student_data = {
            'student_id': 'STU005',
            'attendance_rate': 0.5,
            'gpa': 1.5,
            'assignment_completion': 0.3,
            'engagement_score': 0.2,
            'participation': 0.1,
            'current_average': 50,
            'assignment_average': 45,
            'recent_absences': 5,
            'recent_grades': [40, 45, 50]
        }
        
        analysis = ml_system.analyze_student(student_data)
        
        # التحقق من وجود توصيات
        self.assertEqual(len(analysis['recommendations']) > 0, True)


# ==================== اختبارات الأداء ====================

class TestPerformance(unittest.TestCase):
    """اختبارات الأداء"""
    
    def test_metric_collection_performance(self):
        """اختبار أداء جمع المقاييس"""
        obs = ObservabilitySystem()
        obs.create_metric("test_metric", MetricType.GAUGE)
        
        import time
        start = time.time()
        
        # تسجيل 1000 قيمة
        for i in range(1000):
            obs.record_metric("test_metric", i)
        
        elapsed = time.time() - start
        
        # يجب أن تكمل في أقل من ثانية
        self.assertLess(elapsed, 1.0)
    
    def test_prediction_speed(self):
        """اختبار سرعة التنبؤ"""
        ml_system = MLIntegrationSystem()
        
        student_data = {
            'student_id': 'STU006',
            'attendance_rate': 0.8,
            'gpa': 3.5,
            'assignment_completion': 0.9,
            'engagement_score': 0.8,
            'participation': 0.7,
            'current_average': 88,
            'assignment_average': 90,
            'recent_absences': 0,
            'recent_grades': [85, 88, 90]
        }
        
        import time
        start = time.time()
        ml_system.analyze_student(student_data)
        elapsed = time.time() - start
        
        # يجب أن يكمل في أقل من ثانية
        self.assertLess(elapsed, 1.0)


# ==================== تشغيل الاختبارات ====================

def run_all_tests():
    """تشغيل جميع الاختبارات"""
    # إنشاء مجموعة الاختبارات
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # إضافة الاختبارات
    suite.addTests(loader.loadTestsFromTestCase(TestWebhooksAndWebSocket))
    suite.addTests(loader.loadTestsFromTestCase(TestTaskQueue))
    suite.addTests(loader.loadTestsFromTestCase(TestAPIDocumentation))
    suite.addTests(loader.loadTestsFromTestCase(TestMonitoring))
    suite.addTests(loader.loadTestsFromTestCase(TestMLIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestSystemIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestPerformance))
    
    # تشغيل الاختبارات
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # طباعة الملخص
    print("\n" + "="*70)
    print("📊 ملخص الاختبارات")
    print("="*70)
    print(f"✅ عدد الاختبارات الناجحة: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"❌ عدد الاختبارات الفاشلة: {len(result.failures)}")
    print(f"⚠️  عدد الأخطاء: {len(result.errors)}")
    print(f"📈 معدل النجاح: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    print("="*70)
    
    return result


if __name__ == '__main__':
    print("🧪 بدء اختبارات الأنظمة المتقدمة\n")
    result = run_all_tests()
    
    # الخروج برمز الخروج المناسب
    sys.exit(0 if result.wasSuccessful() else 1)
