"""
اختبارات شاملة لنظام الأتمتة
Comprehensive Tests for Automation System
"""

import unittest
import json
import tempfile
import os
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from flask import Flask
from flask_testing import TestCase

# استيراد المكونات المطلوبة للاختبار
from app import create_app, db
from automation_models import (
    AutomationWorkflow, AutomationAction, ScheduledMessage, WorkflowExecution,
    ActionExecution, MessageDelivery, AutomationRule, MessageTemplate,
    AutomationLog, AutomationTriggerType, MessageScheduleType
)
from automation_services import WorkflowEngine, RuleEngine, TaskScheduler
from automation_reports import AutomationReportGenerator, ScheduledReportService
from notification_services import NotificationService, AutomationNotificationHandler

class AutomationTestCase(TestCase):
    """فئة أساسية لاختبارات الأتمتة"""
    
    def create_app(self):
        """إنشاء تطبيق للاختبار"""
        app = create_app()
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['WTF_CSRF_ENABLED'] = False
        app.config['JWT_SECRET_KEY'] = 'test-secret-key'
        return app
    
    def setUp(self):
        """إعداد قاعدة البيانات للاختبار"""
        db.create_all()
        self.create_test_data()
    
    def tearDown(self):
        """تنظيف قاعدة البيانات بعد الاختبار"""
        db.session.remove()
        db.drop_all()
    
    def create_test_data(self):
        """إنشاء بيانات اختبار"""
        # إنشاء سير عمل اختبار
        self.test_workflow = AutomationWorkflow(
            name="اختبار سير العمل",
            description="سير عمل للاختبار",
            trigger_type="manual",
            trigger_conditions={"test": True},
            is_active=True,
            created_by=1
        )
        db.session.add(self.test_workflow)
        
        # إنشاء إجراء اختبار
        self.test_action = AutomationAction(
            workflow=self.test_workflow,
            name="إجراء اختبار",
            action_type="send_message",
            parameters={
                "message_type": "sms",
                "message": "رسالة اختبار",
                "recipient": "+966501234567"
            },
            order=1
        )
        db.session.add(self.test_action)
        
        # إنشاء قاعدة اختبار
        self.test_rule = AutomationRule(
            workflow=self.test_workflow,
            name="قاعدة اختبار",
            conditions={"field": "value"},
            priority=1,
            is_active=True
        )
        db.session.add(self.test_rule)
        
        # إنشاء رسالة مجدولة اختبار
        self.test_message = ScheduledMessage(
            message_type="sms",
            recipient="+966501234567",
            message="رسالة مجدولة للاختبار",
            scheduled_time=datetime.utcnow() + timedelta(hours=1),
            status="pending",
            created_by=1
        )
        db.session.add(self.test_message)
        
        db.session.commit()

class TestWorkflowEngine(AutomationTestCase):
    """اختبارات محرك سير العمل"""
    
    def setUp(self):
        super().setUp()
        self.workflow_engine = WorkflowEngine()
    
    def test_execute_workflow(self):
        """اختبار تنفيذ سير العمل"""
        with patch.object(self.workflow_engine, '_send_message') as mock_send:
            mock_send.return_value = {"success": True, "message_id": "test123"}
            
            result = self.workflow_engine.execute_workflow(
                self.test_workflow.id,
                context={"test_var": "test_value"}
            )
            
            self.assertTrue(result.get('success'))
            self.assertIsNotNone(result.get('execution_id'))
            
            # التحقق من إنشاء سجل التنفيذ
            execution = WorkflowExecution.query.filter_by(
                workflow_id=self.test_workflow.id
            ).first()
            self.assertIsNotNone(execution)
            self.assertEqual(execution.status, 'completed')
    
    def test_pause_resume_workflow(self):
        """اختبار إيقاف واستئناف سير العمل"""
        # بدء تنفيذ سير العمل
        with patch.object(self.workflow_engine, '_send_message') as mock_send:
            mock_send.return_value = {"success": True, "message_id": "test123"}
            
            result = self.workflow_engine.execute_workflow(self.test_workflow.id)
            execution_id = result.get('execution_id')
            
            # إيقاف التنفيذ
            pause_result = self.workflow_engine.pause_execution(execution_id)
            self.assertTrue(pause_result.get('success'))
            
            # استئناف التنفيذ
            resume_result = self.workflow_engine.resume_execution(execution_id)
            self.assertTrue(resume_result.get('success'))
    
    def test_cancel_workflow(self):
        """اختبار إلغاء سير العمل"""
        with patch.object(self.workflow_engine, '_send_message') as mock_send:
            mock_send.return_value = {"success": True, "message_id": "test123"}
            
            result = self.workflow_engine.execute_workflow(self.test_workflow.id)
            execution_id = result.get('execution_id')
            
            # إلغاء التنفيذ
            cancel_result = self.workflow_engine.cancel_execution(execution_id)
            self.assertTrue(cancel_result.get('success'))
            
            # التحقق من حالة التنفيذ
            execution = WorkflowExecution.query.get(execution_id)
            self.assertEqual(execution.status, 'cancelled')
    
    def test_conditional_execution(self):
        """اختبار التنفيذ الشرطي"""
        # إضافة إجراء شرطي
        conditional_action = AutomationAction(
            workflow=self.test_workflow,
            name="إجراء شرطي",
            action_type="condition",
            parameters={
                "condition": "test_var == 'execute'",
                "true_action": "continue",
                "false_action": "skip"
            },
            order=0
        )
        db.session.add(conditional_action)
        db.session.commit()
        
        with patch.object(self.workflow_engine, '_send_message') as mock_send:
            mock_send.return_value = {"success": True, "message_id": "test123"}
            
            # تنفيذ مع شرط صحيح
            result = self.workflow_engine.execute_workflow(
                self.test_workflow.id,
                context={"test_var": "execute"}
            )
            self.assertTrue(result.get('success'))
            
            # تنفيذ مع شرط خاطئ
            result = self.workflow_engine.execute_workflow(
                self.test_workflow.id,
                context={"test_var": "skip"}
            )
            self.assertTrue(result.get('success'))

class TestRuleEngine(AutomationTestCase):
    """اختبارات محرك القواعد"""
    
    def setUp(self):
        super().setUp()
        self.rule_engine = RuleEngine()
    
    def test_evaluate_rule(self):
        """اختبار تقييم القاعدة"""
        # تقييم قاعدة مع بيانات مطابقة
        result = self.rule_engine.evaluate_rule(
            self.test_rule.id,
            {"field": "value"}
        )
        self.assertTrue(result.get('success'))
        self.assertTrue(result.get('matches'))
        
        # تقييم قاعدة مع بيانات غير مطابقة
        result = self.rule_engine.evaluate_rule(
            self.test_rule.id,
            {"field": "different_value"}
        )
        self.assertTrue(result.get('success'))
        self.assertFalse(result.get('matches'))
    
    def test_bulk_rule_evaluation(self):
        """اختبار تقييم القواعد بالجملة"""
        # إنشاء قواعد إضافية
        rule2 = AutomationRule(
            workflow=self.test_workflow,
            name="قاعدة اختبار 2",
            conditions={"status": "active"},
            priority=2,
            is_active=True
        )
        db.session.add(rule2)
        db.session.commit()
        
        # تقييم جميع القواعد
        results = self.rule_engine.evaluate_all_rules(
            {"field": "value", "status": "active"}
        )
        
        self.assertTrue(results.get('success'))
        self.assertEqual(len(results.get('results', [])), 2)
    
    def test_complex_conditions(self):
        """اختبار الشروط المعقدة"""
        # إنشاء قاعدة بشروط معقدة
        complex_rule = AutomationRule(
            workflow=self.test_workflow,
            name="قاعدة معقدة",
            conditions={
                "and": [
                    {"field1": {"gt": 10}},
                    {"field2": {"in": ["value1", "value2"]}}
                ]
            },
            priority=1,
            is_active=True
        )
        db.session.add(complex_rule)
        db.session.commit()
        
        # تقييم مع بيانات مطابقة
        result = self.rule_engine.evaluate_rule(
            complex_rule.id,
            {"field1": 15, "field2": "value1"}
        )
        self.assertTrue(result.get('matches'))
        
        # تقييم مع بيانات غير مطابقة
        result = self.rule_engine.evaluate_rule(
            complex_rule.id,
            {"field1": 5, "field2": "value1"}
        )
        self.assertFalse(result.get('matches'))

class TestTaskScheduler(AutomationTestCase):
    """اختبارات جدولة المهام"""
    
    def setUp(self):
        super().setUp()
        self.task_scheduler = TaskScheduler()
    
    def test_schedule_message(self):
        """اختبار جدولة رسالة"""
        scheduled_time = datetime.utcnow() + timedelta(minutes=30)
        
        result = self.task_scheduler.schedule_message(
            message_type="sms",
            recipient="+966501234567",
            message="رسالة مجدولة",
            scheduled_time=scheduled_time,
            user_id=1
        )
        
        self.assertTrue(result.get('success'))
        self.assertIsNotNone(result.get('message_id'))
        
        # التحقق من إنشاء الرسالة في قاعدة البيانات
        message = ScheduledMessage.query.get(result.get('message_id'))
        self.assertIsNotNone(message)
        self.assertEqual(message.status, 'pending')
    
    def test_schedule_workflow(self):
        """اختبار جدولة سير عمل"""
        scheduled_time = datetime.utcnow() + timedelta(hours=1)
        
        result = self.task_scheduler.schedule_workflow(
            workflow_id=self.test_workflow.id,
            scheduled_time=scheduled_time,
            context={"scheduled": True}
        )
        
        self.assertTrue(result.get('success'))
    
    @patch('automation_services.schedule')
    def test_process_scheduled_tasks(self, mock_schedule):
        """اختبار معالجة المهام المجدولة"""
        # إنشاء رسالة مجدولة للتنفيذ الآن
        message = ScheduledMessage(
            message_type="sms",
            recipient="+966501234567",
            message="رسالة للتنفيذ",
            scheduled_time=datetime.utcnow() - timedelta(minutes=1),
            status="pending",
            created_by=1
        )
        db.session.add(message)
        db.session.commit()
        
        with patch.object(self.task_scheduler, '_send_message') as mock_send:
            mock_send.return_value = {"success": True, "message_id": "test123"}
            
            # معالجة المهام المجدولة
            self.task_scheduler.process_scheduled_messages()
            
            # التحقق من تحديث حالة الرسالة
            db.session.refresh(message)
            self.assertEqual(message.status, 'sent')

class TestNotificationService(AutomationTestCase):
    """اختبارات خدمة الإشعارات"""
    
    def setUp(self):
        super().setUp()
        self.notification_service = NotificationService()
    
    @patch('notification_services.requests.post')
    def test_send_email_notification(self, mock_post):
        """اختبار إرسال إشعار بريد إلكتروني"""
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"success": True}
        
        result = self.notification_service.send_notification(
            notification_type="email",
            recipients=["test@example.com"],
            subject="اختبار الإشعار",
            message="رسالة اختبار الإشعار",
            priority="high"
        )
        
        self.assertTrue(result.get('success'))
    
    @patch('notification_services.requests.post')
    def test_send_sms_notification(self, mock_post):
        """اختبار إرسال إشعار SMS"""
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"success": True}
        
        result = self.notification_service.send_notification(
            notification_type="sms",
            recipients=["+966501234567"],
            message="رسالة اختبار SMS",
            priority="medium"
        )
        
        self.assertTrue(result.get('success'))
    
    def test_notification_retry_logic(self):
        """اختبار منطق إعادة المحاولة للإشعارات"""
        with patch.object(self.notification_service, '_send_email') as mock_send:
            # محاكاة فشل الإرسال
            mock_send.side_effect = [
                {"success": False, "error": "Network error"},
                {"success": False, "error": "Network error"},
                {"success": True, "message_id": "test123"}
            ]
            
            result = self.notification_service.send_notification(
                notification_type="email",
                recipients=["test@example.com"],
                subject="اختبار إعادة المحاولة",
                message="رسالة اختبار",
                priority="high"
            )
            
            # التحقق من نجاح الإرسال بعد إعادة المحاولة
            self.assertTrue(result.get('success'))
            self.assertEqual(mock_send.call_count, 3)

class TestReportGenerator(AutomationTestCase):
    """اختبارات مولد التقارير"""
    
    def setUp(self):
        super().setUp()
        self.report_generator = AutomationReportGenerator()
        self.create_report_test_data()
    
    def create_report_test_data(self):
        """إنشاء بيانات اختبار للتقارير"""
        # إنشاء تنفيذات سير عمل
        execution = WorkflowExecution(
            workflow_id=self.test_workflow.id,
            started_at=datetime.utcnow() - timedelta(days=1),
            completed_at=datetime.utcnow() - timedelta(days=1, hours=-1),
            status='completed',
            context={"test": True},
            started_by=1
        )
        db.session.add(execution)
        
        # إنشاء سجلات أتمتة
        log = AutomationLog(
            workflow_id=self.test_workflow.id,
            execution_id=execution.id,
            event_type="workflow_completed",
            message="تم إكمال سير العمل بنجاح",
            timestamp=datetime.utcnow() - timedelta(days=1)
        )
        db.session.add(log)
        
        db.session.commit()
    
    def test_generate_workflow_performance_report(self):
        """اختبار توليد تقرير أداء سير العمل"""
        result = self.report_generator.generate_report(
            report_type="workflow_performance",
            format_type="json",
            start_date=datetime.utcnow() - timedelta(days=7),
            end_date=datetime.utcnow()
        )
        
        self.assertTrue(result.get('success'))
        self.assertIsNotNone(result.get('data'))
    
    def test_generate_pdf_report(self):
        """اختبار توليد تقرير PDF"""
        result = self.report_generator.generate_report(
            report_type="execution_summary",
            format_type="pdf",
            start_date=datetime.utcnow() - timedelta(days=7),
            end_date=datetime.utcnow()
        )
        
        self.assertTrue(result.get('success'))
        self.assertIsNotNone(result.get('data'))
        self.assertEqual(result.get('content_type'), 'application/pdf')
    
    def test_generate_excel_report(self):
        """اختبار توليد تقرير Excel"""
        result = self.report_generator.generate_report(
            report_type="message_delivery",
            format_type="excel",
            start_date=datetime.utcnow() - timedelta(days=7),
            end_date=datetime.utcnow()
        )
        
        self.assertTrue(result.get('success'))
        self.assertIsNotNone(result.get('data'))
        self.assertIn('xlsx', result.get('content_type', ''))

class TestAPIEndpoints(AutomationTestCase):
    """اختبارات نقاط النهاية API"""
    
    def setUp(self):
        super().setUp()
        # إنشاء رمز JWT للاختبار
        with self.app.test_request_context():
            from flask_jwt_extended import create_access_token
            self.access_token = create_access_token(identity=1)
    
    def test_get_workflows_endpoint(self):
        """اختبار نقطة نهاية الحصول على سير العمل"""
        response = self.client.get(
            '/api/automation/workflows',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get('success'))
        self.assertIsInstance(data.get('workflows'), list)
    
    def test_create_workflow_endpoint(self):
        """اختبار نقطة نهاية إنشاء سير العمل"""
        workflow_data = {
            "name": "سير عمل جديد",
            "description": "وصف سير العمل",
            "trigger_type": "manual",
            "trigger_conditions": {"test": True},
            "actions": [
                {
                    "name": "إجراء جديد",
                    "action_type": "send_message",
                    "parameters": {
                        "message_type": "sms",
                        "message": "رسالة جديدة",
                        "recipient": "+966501234567"
                    },
                    "order": 1
                }
            ]
        }
        
        response = self.client.post(
            '/api/automation/workflows',
            data=json.dumps(workflow_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertTrue(data.get('success'))
        self.assertIsNotNone(data.get('workflow_id'))
    
    def test_execute_workflow_endpoint(self):
        """اختبار نقطة نهاية تنفيذ سير العمل"""
        with patch('automation_services.workflow_engine.execute_workflow') as mock_execute:
            mock_execute.return_value = {
                "success": True,
                "execution_id": "test-execution-id"
            }
            
            response = self.client.post(
                f'/api/automation/workflows/{self.test_workflow.id}/execute',
                data=json.dumps({"context": {"test": True}}),
                content_type='application/json',
                headers={'Authorization': f'Bearer {self.access_token}'}
            )
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data.get('success'))
    
    def test_generate_report_endpoint(self):
        """اختبار نقطة نهاية توليد التقرير"""
        report_data = {
            "report_type": "workflow_performance",
            "format": "json",
            "start_date": (datetime.utcnow() - timedelta(days=7)).isoformat(),
            "end_date": datetime.utcnow().isoformat()
        }
        
        response = self.client.post(
            '/api/automation/reports/generate',
            data=json.dumps(report_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get('success'))
    
    def test_get_report_types_endpoint(self):
        """اختبار نقطة نهاية أنواع التقارير"""
        response = self.client.get(
            '/api/automation/reports/types',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get('success'))
        self.assertIsInstance(data.get('report_types'), list)
        self.assertIsInstance(data.get('formats'), list)

class TestIntegration(AutomationTestCase):
    """اختبارات التكامل الشاملة"""
    
    def test_end_to_end_workflow_execution(self):
        """اختبار تنفيذ سير العمل من البداية للنهاية"""
        # إنشاء سير عمل متكامل
        workflow = AutomationWorkflow(
            name="سير عمل متكامل",
            description="اختبار التكامل الشامل",
            trigger_type="manual",
            trigger_conditions={},
            is_active=True,
            created_by=1
        )
        db.session.add(workflow)
        db.session.flush()
        
        # إضافة إجراءات متعددة
        actions = [
            AutomationAction(
                workflow=workflow,
                name="إرسال SMS",
                action_type="send_message",
                parameters={
                    "message_type": "sms",
                    "message": "بداية سير العمل",
                    "recipient": "+966501234567"
                },
                order=1
            ),
            AutomationAction(
                workflow=workflow,
                name="انتظار",
                action_type="wait",
                parameters={"duration": 1},
                order=2
            ),
            AutomationAction(
                workflow=workflow,
                name="إرسال بريد إلكتروني",
                action_type="send_message",
                parameters={
                    "message_type": "email",
                    "message": "انتهاء سير العمل",
                    "recipient": "test@example.com"
                },
                order=3
            )
        ]
        
        for action in actions:
            db.session.add(action)
        
        db.session.commit()
        
        # تنفيذ سير العمل
        workflow_engine = WorkflowEngine()
        
        with patch.object(workflow_engine, '_send_message') as mock_send:
            mock_send.return_value = {"success": True, "message_id": "test123"}
            
            result = workflow_engine.execute_workflow(
                workflow.id,
                context={"integration_test": True}
            )
            
            self.assertTrue(result.get('success'))
            
            # التحقق من إنشاء سجلات التنفيذ
            execution = WorkflowExecution.query.filter_by(
                workflow_id=workflow.id
            ).first()
            self.assertIsNotNone(execution)
            
            # التحقق من تنفيذ جميع الإجراءات
            action_executions = ActionExecution.query.filter_by(
                execution_id=execution.id
            ).all()
            self.assertEqual(len(action_executions), 3)
    
    def test_notification_workflow_integration(self):
        """اختبار تكامل الإشعارات مع سير العمل"""
        notification_handler = AutomationNotificationHandler()
        
        # محاكاة حدث بدء سير العمل
        with patch.object(notification_handler.notification_service, 'send_notification') as mock_send:
            mock_send.return_value = {"success": True}
            
            notification_handler.handle_workflow_started(
                workflow_id=self.test_workflow.id,
                execution_id="test-execution-id",
                context={"test": True}
            )
            
            # التحقق من إرسال الإشعار
            mock_send.assert_called_once()

if __name__ == '__main__':
    # تشغيل جميع الاختبارات
    unittest.main(verbosity=2)
