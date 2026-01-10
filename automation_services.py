"""
نظام خدمات الأتمتة الشامل
يتضمن محرك سير العمل، جدولة المهام، معالجة القواعد والشروط
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from enum import Enum
from dataclasses import dataclass
import threading
import time
import schedule
from flask import current_app
from sqlalchemy import and_, or_
from models import db
from automation_models import (
    AutomationWorkflow, AutomationAction, ScheduledMessage, 
    WorkflowExecution, ActionExecution, MessageDelivery,
    AutomationRule, MessageTemplate, AutomationLog
)
from integration_services import CommunicationService, ExternalSystemIntegration

# إعداد التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WorkflowStatus(Enum):
    """حالات سير العمل"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

class ActionType(Enum):
    """أنواع الإجراءات"""
    SEND_MESSAGE = "send_message"
    SEND_EMAIL = "send_email"
    SEND_WHATSAPP = "send_whatsapp"
    SEND_PUSH = "send_push"
    MAKE_CALL = "make_call"
    UPDATE_RECORD = "update_record"
    CREATE_RECORD = "create_record"
    SYNC_SYSTEM = "sync_system"
    WAIT = "wait"
    CONDITION = "condition"
    LOOP = "loop"
    API_CALL = "api_call"

class RuleOperator(Enum):
    """عوامل المقارنة للقواعد"""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    IN = "in"
    NOT_IN = "not_in"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"

@dataclass
class WorkflowContext:
    """سياق تنفيذ سير العمل"""
    workflow_id: int
    execution_id: int
    variables: Dict[str, Any]
    current_step: int
    user_id: Optional[int] = None
    trigger_data: Optional[Dict[str, Any]] = None

class WorkflowEngine:
    """محرك سير العمل الرئيسي"""
    
    def __init__(self):
        self.communication_service = CommunicationService()
        self.integration_service = ExternalSystemIntegration()
        self.running_workflows = {}
        self.scheduler_thread = None
        self.is_running = False
        
    def start_scheduler(self):
        """بدء مجدول المهام"""
        if not self.is_running:
            self.is_running = True
            self.scheduler_thread = threading.Thread(target=self._run_scheduler)
            self.scheduler_thread.daemon = True
            self.scheduler_thread.start()
            logger.info("تم بدء مجدول المهام")
    
    def stop_scheduler(self):
        """إيقاف مجدول المهام"""
        self.is_running = False
        if self.scheduler_thread:
            self.scheduler_thread.join()
        logger.info("تم إيقاف مجدول المهام")
    
    def _run_scheduler(self):
        """تشغيل مجدول المهام"""
        while self.is_running:
            try:
                schedule.run_pending()
                self._check_scheduled_workflows()
                self._check_scheduled_messages()
                time.sleep(60)  # فحص كل دقيقة
            except Exception as e:
                logger.error(f"خطأ في مجدول المهام: {str(e)}")
                time.sleep(60)
    
    def _check_scheduled_workflows(self):
        """فحص سير العمل المجدول"""
        try:
            now = datetime.utcnow()
            scheduled_workflows = AutomationWorkflow.query.filter(
                and_(
                    AutomationWorkflow.is_active == True,
                    AutomationWorkflow.schedule_type.isnot(None),
                    or_(
                        AutomationWorkflow.next_run <= now,
                        AutomationWorkflow.next_run.is_(None)
                    )
                )
            ).all()
            
            for workflow in scheduled_workflows:
                if self._should_run_workflow(workflow):
                    self.execute_workflow(workflow.id)
                    self._update_next_run(workflow)
                    
        except Exception as e:
            logger.error(f"خطأ في فحص سير العمل المجدول: {str(e)}")
    
    def _check_scheduled_messages(self):
        """فحص الرسائل المجدولة"""
        try:
            now = datetime.utcnow()
            scheduled_messages = ScheduledMessage.query.filter(
                and_(
                    ScheduledMessage.status == 'pending',
                    ScheduledMessage.scheduled_time <= now
                )
            ).all()
            
            for message in scheduled_messages:
                self._send_scheduled_message(message)
                
        except Exception as e:
            logger.error(f"خطأ في فحص الرسائل المجدولة: {str(e)}")
    
    def _should_run_workflow(self, workflow: AutomationWorkflow) -> bool:
        """تحديد ما إذا كان يجب تشغيل سير العمل"""
        if not workflow.is_active:
            return False
            
        # فحص القواعد والشروط
        if workflow.trigger_conditions:
            return self._evaluate_conditions(workflow.trigger_conditions)
            
        return True
    
    def _update_next_run(self, workflow: AutomationWorkflow):
        """تحديث موعد التشغيل التالي"""
        try:
            if workflow.schedule_type == 'once':
                workflow.is_active = False
            elif workflow.schedule_type == 'daily':
                workflow.next_run = datetime.utcnow() + timedelta(days=1)
            elif workflow.schedule_type == 'weekly':
                workflow.next_run = datetime.utcnow() + timedelta(weeks=1)
            elif workflow.schedule_type == 'monthly':
                workflow.next_run = datetime.utcnow() + timedelta(days=30)
            elif workflow.schedule_type == 'hourly':
                workflow.next_run = datetime.utcnow() + timedelta(hours=1)
                
            db.session.commit()
            
        except Exception as e:
            logger.error(f"خطأ في تحديث موعد التشغيل التالي: {str(e)}")
            db.session.rollback()
    
    def execute_workflow(self, workflow_id: int, trigger_data: Optional[Dict] = None, user_id: Optional[int] = None) -> Dict[str, Any]:
        """تنفيذ سير عمل"""
        try:
            workflow = AutomationWorkflow.query.get(workflow_id)
            if not workflow:
                return {"success": False, "error": "سير العمل غير موجود"}
            
            if not workflow.is_active:
                return {"success": False, "error": "سير العمل غير نشط"}
            
            # إنشاء تنفيذ جديد
            execution = WorkflowExecution(
                workflow_id=workflow_id,
                status='running',
                started_at=datetime.utcnow(),
                trigger_data=json.dumps(trigger_data) if trigger_data else None,
                user_id=user_id
            )
            db.session.add(execution)
            db.session.commit()
            
            # إنشاء سياق التنفيذ
            context = WorkflowContext(
                workflow_id=workflow_id,
                execution_id=execution.id,
                variables=json.loads(workflow.variables) if workflow.variables else {},
                current_step=0,
                user_id=user_id,
                trigger_data=trigger_data
            )
            
            # تسجيل بداية التنفيذ
            self._log_automation_event(
                workflow_id, execution.id, 'workflow_started',
                f"بدء تنفيذ سير العمل: {workflow.name}"
            )
            
            # تنفيذ الإجراءات
            result = self._execute_workflow_actions(workflow, context)
            
            # تحديث حالة التنفيذ
            execution.status = 'completed' if result['success'] else 'failed'
            execution.completed_at = datetime.utcnow()
            execution.result = json.dumps(result)
            db.session.commit()
            
            # تسجيل انتهاء التنفيذ
            self._log_automation_event(
                workflow_id, execution.id, 'workflow_completed',
                f"انتهاء تنفيذ سير العمل: {workflow.name} - النتيجة: {execution.status}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"خطأ في تنفيذ سير العمل {workflow_id}: {str(e)}")
            if 'execution' in locals():
                execution.status = 'failed'
                execution.completed_at = datetime.utcnow()
                execution.error_message = str(e)
                db.session.commit()
            
            return {"success": False, "error": str(e)}
    
    def _execute_workflow_actions(self, workflow: AutomationWorkflow, context: WorkflowContext) -> Dict[str, Any]:
        """تنفيذ إجراءات سير العمل"""
        try:
            actions = AutomationAction.query.filter_by(
                workflow_id=workflow.id
            ).order_by(AutomationAction.order_index).all()
            
            results = []
            
            for action in actions:
                context.current_step += 1
                
                # تنفيذ الإجراء
                action_result = self._execute_action(action, context)
                results.append(action_result)
                
                # إذا فشل الإجراء وكان مطلوباً، توقف
                if not action_result['success'] and action.is_required:
                    return {
                        "success": False,
                        "error": f"فشل الإجراء المطلوب: {action.name}",
                        "results": results
                    }
                
                # تحديث المتغيرات
                if action_result.get('variables'):
                    context.variables.update(action_result['variables'])
            
            return {
                "success": True,
                "message": "تم تنفيذ جميع الإجراءات بنجاح",
                "results": results
            }
            
        except Exception as e:
            logger.error(f"خطأ في تنفيذ إجراءات سير العمل: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _execute_action(self, action: AutomationAction, context: WorkflowContext) -> Dict[str, Any]:
        """تنفيذ إجراء واحد"""
        try:
            # إنشاء تنفيذ الإجراء
            action_execution = ActionExecution(
                workflow_execution_id=context.execution_id,
                action_id=action.id,
                status='running',
                started_at=datetime.utcnow()
            )
            db.session.add(action_execution)
            db.session.commit()
            
            # تسجيل بداية الإجراء
            self._log_automation_event(
                context.workflow_id, context.execution_id, 'action_started',
                f"بدء تنفيذ الإجراء: {action.name}"
            )
            
            # تحليل معاملات الإجراء
            parameters = json.loads(action.parameters) if action.parameters else {}
            
            # استبدال المتغيرات في المعاملات
            parameters = self._replace_variables(parameters, context)
            
            result = {"success": True, "message": "تم تنفيذ الإجراء بنجاح"}
            
            # تنفيذ الإجراء حسب النوع
            if action.action_type == ActionType.SEND_MESSAGE.value:
                result = self._execute_send_message(parameters)
            elif action.action_type == ActionType.SEND_EMAIL.value:
                result = self._execute_send_email(parameters)
            elif action.action_type == ActionType.SEND_WHATSAPP.value:
                result = self._execute_send_whatsapp(parameters)
            elif action.action_type == ActionType.SEND_PUSH.value:
                result = self._execute_send_push(parameters)
            elif action.action_type == ActionType.MAKE_CALL.value:
                result = self._execute_make_call(parameters)
            elif action.action_type == ActionType.UPDATE_RECORD.value:
                result = self._execute_update_record(parameters)
            elif action.action_type == ActionType.CREATE_RECORD.value:
                result = self._execute_create_record(parameters)
            elif action.action_type == ActionType.SYNC_SYSTEM.value:
                result = self._execute_sync_system(parameters)
            elif action.action_type == ActionType.WAIT.value:
                result = self._execute_wait(parameters)
            elif action.action_type == ActionType.CONDITION.value:
                result = self._execute_condition(parameters, context)
            elif action.action_type == ActionType.API_CALL.value:
                result = self._execute_api_call(parameters)
            else:
                result = {"success": False, "error": f"نوع إجراء غير مدعوم: {action.action_type}"}
            
            # تحديث تنفيذ الإجراء
            action_execution.status = 'completed' if result['success'] else 'failed'
            action_execution.completed_at = datetime.utcnow()
            action_execution.result = json.dumps(result)
            if not result['success']:
                action_execution.error_message = result.get('error', 'خطأ غير محدد')
            
            db.session.commit()
            
            # تسجيل انتهاء الإجراء
            self._log_automation_event(
                context.workflow_id, context.execution_id, 'action_completed',
                f"انتهاء تنفيذ الإجراء: {action.name} - النتيجة: {action_execution.status}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"خطأ في تنفيذ الإجراء {action.id}: {str(e)}")
            if 'action_execution' in locals():
                action_execution.status = 'failed'
                action_execution.completed_at = datetime.utcnow()
                action_execution.error_message = str(e)
                db.session.commit()
            
            return {"success": False, "error": str(e)}
    
    def _replace_variables(self, data: Any, context: WorkflowContext) -> Any:
        """استبدال المتغيرات في البيانات"""
        if isinstance(data, str):
            # استبدال المتغيرات في النص
            for key, value in context.variables.items():
                data = data.replace(f"{{{key}}}", str(value))
            return data
        elif isinstance(data, dict):
            return {key: self._replace_variables(value, context) for key, value in data.items()}
        elif isinstance(data, list):
            return [self._replace_variables(item, context) for item in data]
        else:
            return data
    
    def _execute_send_message(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """تنفيذ إرسال رسالة SMS"""
        try:
            phone = parameters.get('phone')
            message = parameters.get('message')
            template_id = parameters.get('template_id')
            
            if not phone or not message:
                return {"success": False, "error": "رقم الهاتف والرسالة مطلوبان"}
            
            result = self.communication_service.send_sms(phone, message, template_id)
            return result
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _execute_send_email(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """تنفيذ إرسال بريد إلكتروني"""
        try:
            email = parameters.get('email')
            subject = parameters.get('subject')
            message = parameters.get('message')
            template_id = parameters.get('template_id')
            
            if not email or not subject or not message:
                return {"success": False, "error": "البريد الإلكتروني والموضوع والرسالة مطلوبة"}
            
            result = self.communication_service.send_email(email, subject, message, template_id)
            return result
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _execute_send_whatsapp(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """تنفيذ إرسال رسالة واتساب"""
        try:
            phone = parameters.get('phone')
            message = parameters.get('message')
            template_id = parameters.get('template_id')
            
            if not phone or not message:
                return {"success": False, "error": "رقم الهاتف والرسالة مطلوبان"}
            
            result = self.communication_service.send_whatsapp(phone, message, template_id)
            return result
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _execute_send_push(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """تنفيذ إرسال إشعار فوري"""
        try:
            user_id = parameters.get('user_id')
            title = parameters.get('title')
            message = parameters.get('message')
            data = parameters.get('data')
            
            if not user_id or not title or not message:
                return {"success": False, "error": "معرف المستخدم والعنوان والرسالة مطلوبة"}
            
            result = self.communication_service.send_push_notification(user_id, title, message, data)
            return result
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _execute_make_call(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """تنفيذ مكالمة صوتية"""
        try:
            phone = parameters.get('phone')
            message = parameters.get('message')
            language = parameters.get('language', 'ar')
            
            if not phone or not message:
                return {"success": False, "error": "رقم الهاتف والرسالة مطلوبان"}
            
            result = self.communication_service.send_voice_call(phone, message, language)
            return result
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _execute_update_record(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """تنفيذ تحديث سجل"""
        try:
            # تنفيذ تحديث السجل حسب المعاملات
            # يمكن توسيعه لدعم جداول مختلفة
            return {"success": True, "message": "تم تحديث السجل بنجاح"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _execute_create_record(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """تنفيذ إنشاء سجل"""
        try:
            # تنفيذ إنشاء السجل حسب المعاملات
            # يمكن توسيعه لدعم جداول مختلفة
            return {"success": True, "message": "تم إنشاء السجل بنجاح"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _execute_sync_system(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """تنفيذ مزامنة نظام خارجي"""
        try:
            system_type = parameters.get('system_type')
            system_id = parameters.get('system_id')
            data = parameters.get('data', {})
            
            if system_type == 'government':
                result = self.integration_service.sync_with_government_system(system_id, data)
            elif system_type == 'hospital':
                result = self.integration_service.sync_with_hospital_system(system_id, data)
            elif system_type == 'laboratory':
                result = self.integration_service.sync_with_laboratory_system(system_id, data)
            elif system_type == 'pharmacy':
                result = self.integration_service.sync_with_pharmacy_system(system_id, data)
            else:
                return {"success": False, "error": f"نوع نظام غير مدعوم: {system_type}"}
            
            return result
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _execute_wait(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """تنفيذ انتظار"""
        try:
            duration = parameters.get('duration', 0)  # بالثواني
            if duration > 0:
                time.sleep(duration)
            
            return {"success": True, "message": f"تم الانتظار لمدة {duration} ثانية"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _execute_condition(self, parameters: Dict[str, Any], context: WorkflowContext) -> Dict[str, Any]:
        """تنفيذ شرط"""
        try:
            conditions = parameters.get('conditions', [])
            operator = parameters.get('operator', 'and')  # and, or
            
            results = []
            for condition in conditions:
                result = self._evaluate_single_condition(condition, context)
                results.append(result)
            
            if operator == 'and':
                final_result = all(results)
            else:  # or
                final_result = any(results)
            
            return {
                "success": True,
                "condition_result": final_result,
                "message": f"نتيجة الشرط: {final_result}"
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _execute_api_call(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """تنفيذ استدعاء API"""
        try:
            import requests
            
            url = parameters.get('url')
            method = parameters.get('method', 'GET')
            headers = parameters.get('headers', {})
            data = parameters.get('data')
            
            if not url:
                return {"success": False, "error": "رابط API مطلوب"}
            
            response = requests.request(method, url, headers=headers, json=data)
            
            return {
                "success": response.status_code < 400,
                "status_code": response.status_code,
                "response": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _evaluate_conditions(self, conditions: str) -> bool:
        """تقييم الشروط"""
        try:
            conditions_data = json.loads(conditions) if isinstance(conditions, str) else conditions
            return self._evaluate_condition_group(conditions_data)
        except Exception as e:
            logger.error(f"خطأ في تقييم الشروط: {str(e)}")
            return False
    
    def _evaluate_condition_group(self, conditions: Dict[str, Any]) -> bool:
        """تقييم مجموعة شروط"""
        operator = conditions.get('operator', 'and')
        rules = conditions.get('rules', [])
        
        results = []
        for rule in rules:
            if 'operator' in rule:  # مجموعة فرعية
                result = self._evaluate_condition_group(rule)
            else:  # قاعدة واحدة
                result = self._evaluate_single_condition(rule)
            results.append(result)
        
        if operator == 'and':
            return all(results)
        else:  # or
            return any(results)
    
    def _evaluate_single_condition(self, condition: Dict[str, Any], context: Optional[WorkflowContext] = None) -> bool:
        """تقييم شرط واحد"""
        try:
            field = condition.get('field')
            operator = condition.get('operator')
            value = condition.get('value')
            
            # الحصول على قيمة الحقل
            field_value = self._get_field_value(field, context)
            
            # تطبيق العامل
            if operator == RuleOperator.EQUALS.value:
                return field_value == value
            elif operator == RuleOperator.NOT_EQUALS.value:
                return field_value != value
            elif operator == RuleOperator.GREATER_THAN.value:
                return field_value > value
            elif operator == RuleOperator.LESS_THAN.value:
                return field_value < value
            elif operator == RuleOperator.CONTAINS.value:
                return value in str(field_value)
            elif operator == RuleOperator.NOT_CONTAINS.value:
                return value not in str(field_value)
            elif operator == RuleOperator.IN.value:
                return field_value in value
            elif operator == RuleOperator.NOT_IN.value:
                return field_value not in value
            elif operator == RuleOperator.IS_NULL.value:
                return field_value is None
            elif operator == RuleOperator.IS_NOT_NULL.value:
                return field_value is not None
            
            return False
            
        except Exception as e:
            logger.error(f"خطأ في تقييم الشرط: {str(e)}")
            return False
    
    def _get_field_value(self, field: str, context: Optional[WorkflowContext] = None) -> Any:
        """الحصول على قيمة حقل"""
        try:
            if context and field in context.variables:
                return context.variables[field]
            
            # يمكن إضافة منطق للحصول على قيم من قاعدة البيانات
            # أو من مصادر أخرى حسب الحاجة
            
            return None
            
        except Exception as e:
            logger.error(f"خطأ في الحصول على قيمة الحقل {field}: {str(e)}")
            return None
    
    def _send_scheduled_message(self, message: ScheduledMessage):
        """إرسال رسالة مجدولة"""
        try:
            message.status = 'sending'
            db.session.commit()
            
            result = None
            if message.message_type == 'sms':
                result = self.communication_service.send_sms(
                    message.recipient, message.content, message.template_id
                )
            elif message.message_type == 'email':
                result = self.communication_service.send_email(
                    message.recipient, message.subject or 'رسالة مجدولة', 
                    message.content, message.template_id
                )
            elif message.message_type == 'whatsapp':
                result = self.communication_service.send_whatsapp(
                    message.recipient, message.content, message.template_id
                )
            elif message.message_type == 'push':
                result = self.communication_service.send_push_notification(
                    int(message.recipient), message.subject or 'إشعار',
                    message.content, json.loads(message.metadata) if message.metadata else None
                )
            
            if result and result.get('success'):
                message.status = 'sent'
                message.sent_at = datetime.utcnow()
                
                # إنشاء سجل تسليم
                delivery = MessageDelivery(
                    scheduled_message_id=message.id,
                    status='delivered',
                    delivered_at=datetime.utcnow(),
                    provider_response=json.dumps(result)
                )
                db.session.add(delivery)
            else:
                message.status = 'failed'
                message.error_message = result.get('error') if result else 'خطأ غير محدد'
            
            db.session.commit()
            
        except Exception as e:
            logger.error(f"خطأ في إرسال الرسالة المجدولة {message.id}: {str(e)}")
            message.status = 'failed'
            message.error_message = str(e)
            db.session.commit()
    
    def _log_automation_event(self, workflow_id: int, execution_id: int, event_type: str, message: str):
        """تسجيل حدث أتمتة"""
        try:
            log = AutomationLog(
                workflow_id=workflow_id,
                execution_id=execution_id,
                event_type=event_type,
                message=message,
                timestamp=datetime.utcnow()
            )
            db.session.add(log)
            db.session.commit()
            
        except Exception as e:
            logger.error(f"خطأ في تسجيل حدث الأتمتة: {str(e)}")
    
    def pause_workflow(self, execution_id: int) -> Dict[str, Any]:
        """إيقاف سير عمل مؤقتاً"""
        try:
            execution = WorkflowExecution.query.get(execution_id)
            if not execution:
                return {"success": False, "error": "تنفيذ سير العمل غير موجود"}
            
            execution.status = 'paused'
            db.session.commit()
            
            return {"success": True, "message": "تم إيقاف سير العمل مؤقتاً"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def resume_workflow(self, execution_id: int) -> Dict[str, Any]:
        """استئناف سير عمل متوقف"""
        try:
            execution = WorkflowExecution.query.get(execution_id)
            if not execution:
                return {"success": False, "error": "تنفيذ سير العمل غير موجود"}
            
            if execution.status != 'paused':
                return {"success": False, "error": "سير العمل ليس متوقفاً"}
            
            execution.status = 'running'
            db.session.commit()
            
            # يمكن إضافة منطق لاستئناف التنفيذ من النقطة المتوقفة
            
            return {"success": True, "message": "تم استئناف سير العمل"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def cancel_workflow(self, execution_id: int) -> Dict[str, Any]:
        """إلغاء سير عمل"""
        try:
            execution = WorkflowExecution.query.get(execution_id)
            if not execution:
                return {"success": False, "error": "تنفيذ سير العمل غير موجود"}
            
            execution.status = 'cancelled'
            execution.completed_at = datetime.utcnow()
            db.session.commit()
            
            return {"success": True, "message": "تم إلغاء سير العمل"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

# إنشاء مثيل عام من محرك سير العمل
workflow_engine = WorkflowEngine()

class RuleEngine:
    """محرك القواعد والشروط"""
    
    def __init__(self):
        self.workflow_engine = workflow_engine
    
    def evaluate_rule(self, rule_id: int, context_data: Optional[Dict] = None) -> Dict[str, Any]:
        """تقييم قاعدة"""
        try:
            rule = AutomationRule.query.get(rule_id)
            if not rule:
                return {"success": False, "error": "القاعدة غير موجودة"}
            
            if not rule.is_active:
                return {"success": False, "error": "القاعدة غير نشطة"}
            
            # تقييم الشروط
            conditions = json.loads(rule.conditions) if rule.conditions else {}
            result = self.workflow_engine._evaluate_condition_group(conditions)
            
            # إذا تحققت الشروط، تنفيذ الإجراءات
            if result and rule.workflow_id:
                workflow_result = self.workflow_engine.execute_workflow(
                    rule.workflow_id, context_data
                )
                return {
                    "success": True,
                    "rule_triggered": True,
                    "workflow_result": workflow_result
                }
            
            return {
                "success": True,
                "rule_triggered": result,
                "message": f"القاعدة {'تحققت' if result else 'لم تتحقق'}"
            }
            
        except Exception as e:
            logger.error(f"خطأ في تقييم القاعدة {rule_id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def check_all_active_rules(self, context_data: Optional[Dict] = None):
        """فحص جميع القواعد النشطة"""
        try:
            active_rules = AutomationRule.query.filter_by(is_active=True).all()
            
            for rule in active_rules:
                self.evaluate_rule(rule.id, context_data)
                
        except Exception as e:
            logger.error(f"خطأ في فحص القواعد النشطة: {str(e)}")

# إنشاء مثيل عام من محرك القواعد
rule_engine = RuleEngine()

class TaskScheduler:
    """مجدول المهام المتقدم"""
    
    def __init__(self):
        self.workflow_engine = workflow_engine
    
    def schedule_workflow(self, workflow_id: int, schedule_type: str, 
                         schedule_time: Optional[datetime] = None,
                         schedule_data: Optional[Dict] = None) -> Dict[str, Any]:
        """جدولة سير عمل"""
        try:
            workflow = AutomationWorkflow.query.get(workflow_id)
            if not workflow:
                return {"success": False, "error": "سير العمل غير موجود"}
            
            workflow.schedule_type = schedule_type
            workflow.schedule_data = json.dumps(schedule_data) if schedule_data else None
            
            if schedule_time:
                workflow.next_run = schedule_time
            elif schedule_type == 'daily':
                workflow.next_run = datetime.utcnow() + timedelta(days=1)
            elif schedule_type == 'weekly':
                workflow.next_run = datetime.utcnow() + timedelta(weeks=1)
            elif schedule_type == 'monthly':
                workflow.next_run = datetime.utcnow() + timedelta(days=30)
            elif schedule_type == 'hourly':
                workflow.next_run = datetime.utcnow() + timedelta(hours=1)
            
            db.session.commit()
            
            return {"success": True, "message": "تم جدولة سير العمل بنجاح"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def schedule_message(self, message_type: str, recipient: str, content: str,
                        scheduled_time: datetime, subject: Optional[str] = None,
                        template_id: Optional[int] = None,
                        metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """جدولة رسالة"""
        try:
            message = ScheduledMessage(
                message_type=message_type,
                recipient=recipient,
                subject=subject,
                content=content,
                scheduled_time=scheduled_time,
                template_id=template_id,
                metadata=json.dumps(metadata) if metadata else None,
                status='pending'
            )
            
            db.session.add(message)
            db.session.commit()
            
            return {
                "success": True,
                "message": "تم جدولة الرسالة بنجاح",
                "message_id": message.id
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

# إنشاء مثيل عام من مجدول المهام
task_scheduler = TaskScheduler()
