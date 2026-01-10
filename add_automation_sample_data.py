#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
إضافة بيانات تجريبية لنظام الأتمتة والرسائل المجدولة
Adding sample data for automation and scheduled messaging system
"""

import sys
import os
from datetime import datetime, timedelta
import json

# إضافة مسار المشروع لـ Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from automation_models import (
    AutomationWorkflow, AutomationAction, ScheduledMessage, 
    WorkflowExecution, ActionExecution, MessageDelivery,
    AutomationRule, MessageTemplate, AutomationLog,
    WorkflowTriggerType, WorkflowStatus, ActionType, ActionStatus,
    MessageType, MessageStatus, SchedulingType, DeliveryStatus,
    RuleConditionType, LogLevel
)
from models import User

def add_automation_sample_data():
    """إضافة بيانات تجريبية شاملة لنظام الأتمتة"""
    
    print("🚀 بدء إضافة البيانات التجريبية لنظام الأتمتة والرسائل المجدولة...")
    
    try:
        with app.app_context():
            # التأكد من وجود المستخدمين
            users = User.query.limit(5).all()
            if not users:
                print("⚠️ لا توجد مستخدمين في النظام. يرجى إضافة مستخدمين أولاً.")
                return
            
            admin_user = users[0]
            
            # 1. إنشاء قوالب الرسائل
            print("📝 إضافة قوالب الرسائل...")
            
            templates = [
                {
                    'name': 'ترحيب بالطلاب الجدد',
                    'subject': 'مرحباً بك في مراكز الأوائل',
                    'content': 'مرحباً {{student_name}}، نرحب بك في مراكز الأوائل. نتطلع لرحلة تعليمية مثمرة معك.',
                    'variables': json.dumps(['student_name', 'parent_name', 'center_name']),
                    'category': 'ترحيب',
                    'language': 'ar'
                },
                {
                    'name': 'تذكير بالموعد',
                    'subject': 'تذكير: موعدك غداً في {{time}}',
                    'content': 'عزيزي {{client_name}}، نذكرك بموعدك غداً {{date}} في تمام الساعة {{time}}. يرجى الحضور قبل 15 دقيقة.',
                    'variables': json.dumps(['client_name', 'date', 'time', 'service_type']),
                    'category': 'تذكير',
                    'language': 'ar'
                },
                {
                    'name': 'تقرير التقدم الشهري',
                    'subject': 'تقرير تقدم {{student_name}} - {{month}}',
                    'content': 'تقرير شامل عن تقدم الطالب {{student_name}} خلال شهر {{month}}. التقييم العام: {{overall_rating}}.',
                    'variables': json.dumps(['student_name', 'month', 'overall_rating', 'achievements']),
                    'category': 'تقارير',
                    'language': 'ar'
                }
            ]
            
            template_objects = []
            for template_data in templates:
                template = MessageTemplate(
                    name=template_data['name'],
                    subject=template_data['subject'],
                    content=template_data['content'],
                    variables=template_data['variables'],
                    category=template_data['category'],
                    language=template_data['language'],
                    is_active=True,
                    created_by=admin_user.id
                )
                db.session.add(template)
                template_objects.append(template)
            
            db.session.flush()
            
            # 2. إنشاء قواعد الأتمتة
            print("⚙️ إضافة قواعد الأتمتة...")
            
            rules = [
                {
                    'name': 'تذكير المواعيد التلقائي',
                    'description': 'إرسال تذكير تلقائي قبل 24 ساعة من الموعد',
                    'condition_type': RuleConditionType.TIME_BASED,
                    'conditions': json.dumps({
                        'trigger_before_hours': 24,
                        'event_type': 'appointment',
                        'status': 'confirmed'
                    }),
                    'actions': json.dumps([
                        {
                            'type': 'send_message',
                            'template_id': 2,
                            'channel': 'sms'
                        }
                    ]),
                    'priority': 1,
                    'is_active': True
                },
                {
                    'name': 'ترحيب الطلاب الجدد',
                    'description': 'إرسال رسالة ترحيب عند تسجيل طالب جديد',
                    'condition_type': RuleConditionType.EVENT_BASED,
                    'conditions': json.dumps({
                        'event': 'student_registered',
                        'status': 'active'
                    }),
                    'actions': json.dumps([
                        {
                            'type': 'send_message',
                            'template_id': 1,
                            'channel': 'email'
                        },
                        {
                            'type': 'create_task',
                            'task_type': 'orientation_call'
                        }
                    ]),
                    'priority': 2,
                    'is_active': True
                }
            ]
            
            rule_objects = []
            for rule_data in rules:
                rule = AutomationRule(
                    name=rule_data['name'],
                    description=rule_data['description'],
                    condition_type=rule_data['condition_type'],
                    conditions=rule_data['conditions'],
                    actions=rule_data['actions'],
                    priority=rule_data['priority'],
                    is_active=rule_data['is_active'],
                    created_by=admin_user.id
                )
                db.session.add(rule)
                rule_objects.append(rule)
            
            db.session.flush()
            
            # 3. إنشاء سير العمل التلقائي
            print("🔄 إضافة سير العمل التلقائي...")
            
            workflows = [
                {
                    'name': 'سير عمل الترحيب بالطلاب الجدد',
                    'description': 'سير عمل شامل للترحيب بالطلاب الجدد وإعدادهم',
                    'trigger_type': WorkflowTriggerType.EVENT,
                    'trigger_config': json.dumps({
                        'event': 'student_registered',
                        'conditions': {'status': 'active'}
                    }),
                    'schedule_config': None,
                    'status': WorkflowStatus.ACTIVE,
                    'priority': 1,
                    'max_retries': 3,
                    'timeout_minutes': 60
                },
                {
                    'name': 'سير عمل التذكير بالمواعيد',
                    'description': 'تذكير تلقائي بالمواعيد المجدولة',
                    'trigger_type': WorkflowTriggerType.SCHEDULE,
                    'trigger_config': None,
                    'schedule_config': json.dumps({
                        'type': 'daily',
                        'time': '09:00',
                        'timezone': 'Asia/Riyadh'
                    }),
                    'status': WorkflowStatus.ACTIVE,
                    'priority': 2,
                    'max_retries': 2,
                    'timeout_minutes': 30
                },
                {
                    'name': 'سير عمل التقارير الشهرية',
                    'description': 'إنشاء وإرسال التقارير الشهرية تلقائياً',
                    'trigger_type': WorkflowTriggerType.SCHEDULE,
                    'trigger_config': None,
                    'schedule_config': json.dumps({
                        'type': 'monthly',
                        'day': 1,
                        'time': '08:00',
                        'timezone': 'Asia/Riyadh'
                    }),
                    'status': WorkflowStatus.ACTIVE,
                    'priority': 3,
                    'max_retries': 5,
                    'timeout_minutes': 120
                }
            ]
            
            workflow_objects = []
            for workflow_data in workflows:
                workflow = AutomationWorkflow(
                    name=workflow_data['name'],
                    description=workflow_data['description'],
                    trigger_type=workflow_data['trigger_type'],
                    trigger_config=workflow_data['trigger_config'],
                    schedule_config=workflow_data['schedule_config'],
                    status=workflow_data['status'],
                    priority=workflow_data['priority'],
                    max_retries=workflow_data['max_retries'],
                    timeout_minutes=workflow_data['timeout_minutes'],
                    created_by=admin_user.id
                )
                db.session.add(workflow)
                workflow_objects.append(workflow)
            
            db.session.flush()
            
            # 4. إضافة إجراءات سير العمل
            print("⚡ إضافة إجراءات سير العمل...")
            
            # إجراءات سير عمل الترحيب
            welcome_actions = [
                {
                    'workflow': workflow_objects[0],
                    'name': 'إرسال رسالة ترحيب',
                    'action_type': ActionType.SEND_MESSAGE,
                    'config': json.dumps({
                        'template_id': template_objects[0].id,
                        'channel': 'email',
                        'variables': {
                            'student_name': '{{student.name}}',
                            'parent_name': '{{parent.name}}',
                            'center_name': 'مراكز الأوائل'
                        }
                    }),
                    'sequence_order': 1
                },
                {
                    'workflow': workflow_objects[0],
                    'name': 'إنشاء مهمة متابعة',
                    'action_type': ActionType.CREATE_TASK,
                    'config': json.dumps({
                        'task_type': 'follow_up_call',
                        'title': 'اتصال متابعة للطالب الجديد',
                        'due_hours': 48,
                        'assigned_to': 'coordinator'
                    }),
                    'sequence_order': 2
                },
                {
                    'workflow': workflow_objects[0],
                    'name': 'تحديث حالة الطالب',
                    'action_type': ActionType.UPDATE_RECORD,
                    'config': json.dumps({
                        'table': 'students',
                        'field': 'onboarding_status',
                        'value': 'welcomed'
                    }),
                    'sequence_order': 3
                }
            ]
            
            # إجراءات سير عمل التذكير
            reminder_actions = [
                {
                    'workflow': workflow_objects[1],
                    'name': 'البحث عن المواعيد غداً',
                    'action_type': ActionType.QUERY_DATA,
                    'config': json.dumps({
                        'query': 'appointments_tomorrow',
                        'filters': {'status': 'confirmed'}
                    }),
                    'sequence_order': 1
                },
                {
                    'workflow': workflow_objects[1],
                    'name': 'إرسال تذكيرات SMS',
                    'action_type': ActionType.SEND_MESSAGE,
                    'config': json.dumps({
                        'template_id': template_objects[1].id,
                        'channel': 'sms',
                        'batch_size': 50
                    }),
                    'sequence_order': 2
                }
            ]
            
            # إجراءات سير عمل التقارير
            report_actions = [
                {
                    'workflow': workflow_objects[2],
                    'name': 'إنشاء التقارير الشهرية',
                    'action_type': ActionType.GENERATE_REPORT,
                    'config': json.dumps({
                        'report_type': 'monthly_progress',
                        'format': 'pdf',
                        'include_charts': True
                    }),
                    'sequence_order': 1
                },
                {
                    'workflow': workflow_objects[2],
                    'name': 'إرسال التقارير للأهالي',
                    'action_type': ActionType.SEND_MESSAGE,
                    'config': json.dumps({
                        'template_id': template_objects[2].id,
                        'channel': 'email',
                        'attach_report': True
                    }),
                    'sequence_order': 2
                }
            ]
            
            all_actions = welcome_actions + reminder_actions + report_actions
            action_objects = []
            
            for action_data in all_actions:
                action = AutomationAction(
                    workflow_id=action_data['workflow'].id,
                    name=action_data['name'],
                    action_type=action_data['action_type'],
                    config=action_data['config'],
                    sequence_order=action_data['sequence_order'],
                    status=ActionStatus.ACTIVE,
                    max_retries=3,
                    timeout_seconds=300,
                    created_by=admin_user.id
                )
                db.session.add(action)
                action_objects.append(action)
            
            db.session.flush()
            
            # 5. إضافة رسائل مجدولة
            print("📅 إضافة رسائل مجدولة...")
            
            scheduled_messages = [
                {
                    'title': 'تذكير أسبوعي - نصائح التأهيل',
                    'content': 'نصائح أسبوعية مفيدة لتحسين عملية التأهيل والتطوير',
                    'message_type': MessageType.EDUCATIONAL,
                    'scheduling_type': SchedulingType.RECURRING,
                    'scheduled_time': datetime.now() + timedelta(days=1),
                    'recurrence_pattern': json.dumps({
                        'type': 'weekly',
                        'day': 'sunday',
                        'time': '10:00'
                    }),
                    'recipients': json.dumps([
                        {'type': 'role', 'value': 'parent'},
                        {'type': 'role', 'value': 'therapist'}
                    ]),
                    'channels': json.dumps(['email', 'sms']),
                    'template_id': template_objects[0].id,
                    'status': MessageStatus.SCHEDULED,
                    'priority': 2
                },
                {
                    'title': 'إشعار صيانة النظام',
                    'content': 'سيتم إجراء صيانة دورية للنظام يوم الجمعة من 12-2 ظهراً',
                    'message_type': MessageType.SYSTEM,
                    'scheduling_type': SchedulingType.SCHEDULED,
                    'scheduled_time': datetime.now() + timedelta(days=3),
                    'recipients': json.dumps([
                        {'type': 'role', 'value': 'all_users'}
                    ]),
                    'channels': json.dumps(['email', 'push']),
                    'status': MessageStatus.SCHEDULED,
                    'priority': 1
                },
                {
                    'title': 'استطلاع رضا الخدمة',
                    'content': 'نود معرفة رأيك في خدماتنا. يرجى تعبئة الاستطلاع المرفق.',
                    'message_type': MessageType.SURVEY,
                    'scheduling_type': SchedulingType.CONDITIONAL,
                    'conditions': json.dumps({
                        'trigger': 'service_completion',
                        'delay_hours': 24
                    }),
                    'recipients': json.dumps([
                        {'type': 'role', 'value': 'client'}
                    ]),
                    'channels': json.dumps(['email']),
                    'template_id': template_objects[1].id,
                    'status': MessageStatus.DRAFT,
                    'priority': 3
                }
            ]
            
            message_objects = []
            for msg_data in scheduled_messages:
                message = ScheduledMessage(
                    title=msg_data['title'],
                    content=msg_data['content'],
                    message_type=msg_data['message_type'],
                    scheduling_type=msg_data['scheduling_type'],
                    scheduled_time=msg_data.get('scheduled_time'),
                    recurrence_pattern=msg_data.get('recurrence_pattern'),
                    conditions=msg_data.get('conditions'),
                    recipients=msg_data['recipients'],
                    channels=msg_data['channels'],
                    template_id=msg_data.get('template_id'),
                    status=msg_data['status'],
                    priority=msg_data['priority'],
                    created_by=admin_user.id
                )
                db.session.add(message)
                message_objects.append(message)
            
            db.session.flush()
            
            # 6. إضافة تنفيذات سير العمل (محاكاة تنفيذات سابقة)
            print("🏃 إضافة سجلات التنفيذ...")
            
            # تنفيذات سير العمل
            executions = []
            for i, workflow in enumerate(workflow_objects[:2]):  # أول سير عملين فقط
                for j in range(3):  # 3 تنفيذات لكل سير عمل
                    execution_time = datetime.now() - timedelta(days=j+1, hours=i*2)
                    execution = WorkflowExecution(
                        workflow_id=workflow.id,
                        trigger_data=json.dumps({
                            'event': f'test_trigger_{j}',
                            'timestamp': execution_time.isoformat()
                        }),
                        status=WorkflowStatus.COMPLETED if j < 2 else WorkflowStatus.RUNNING,
                        started_at=execution_time,
                        completed_at=execution_time + timedelta(minutes=15) if j < 2 else None,
                        result=json.dumps({
                            'success': True,
                            'actions_completed': 3 if j < 2 else 1,
                            'messages_sent': 2 if j < 2 else 0
                        }) if j < 2 else None,
                        created_by=admin_user.id
                    )
                    db.session.add(execution)
                    executions.append(execution)
            
            db.session.flush()
            
            # تنفيذات الإجراءات
            for execution in executions[:4]:  # أول 4 تنفيذات
                for k, action in enumerate(action_objects[:2]):  # أول إجراءين
                    action_execution = ActionExecution(
                        workflow_execution_id=execution.id,
                        action_id=action.id,
                        status=ActionStatus.COMPLETED,
                        started_at=execution.started_at + timedelta(minutes=k*5),
                        completed_at=execution.started_at + timedelta(minutes=k*5+3),
                        result=json.dumps({
                            'success': True,
                            'output': f'Action {k+1} completed successfully'
                        }),
                        created_by=admin_user.id
                    )
                    db.session.add(action_execution)
            
            # 7. إضافة سجلات توصيل الرسائل
            print("📨 إضافة سجلات توصيل الرسائل...")
            
            for i, message in enumerate(message_objects[:2]):  # أول رسالتين
                for j, user in enumerate(users[:3]):  # أول 3 مستخدمين
                    delivery = MessageDelivery(
                        message_id=message.id,
                        recipient_id=user.id,
                        recipient_type='user',
                        recipient_contact=user.email,
                        channel='email',
                        status=DeliveryStatus.DELIVERED if j < 2 else DeliveryStatus.PENDING,
                        sent_at=datetime.now() - timedelta(hours=i*6+j),
                        delivered_at=datetime.now() - timedelta(hours=i*6+j-1) if j < 2 else None,
                        attempts=1,
                        tracking_data=json.dumps({
                            'message_id': f'msg_{i}_{j}',
                            'provider': 'smtp_server'
                        })
                    )
                    db.session.add(delivery)
            
            # 8. إضافة سجلات النظام
            print("📋 إضافة سجلات النظام...")
            
            log_entries = [
                {
                    'level': LogLevel.INFO,
                    'category': 'workflow_execution',
                    'message': 'تم تنفيذ سير عمل الترحيب بالطلاب الجدد بنجاح',
                    'details': json.dumps({
                        'workflow_id': workflow_objects[0].id,
                        'execution_time': '00:00:15',
                        'actions_completed': 3
                    })
                },
                {
                    'level': LogLevel.WARNING,
                    'category': 'message_delivery',
                    'message': 'تأخير في توصيل الرسائل النصية',
                    'details': json.dumps({
                        'provider': 'sms_gateway',
                        'delay_minutes': 5,
                        'affected_messages': 12
                    })
                },
                {
                    'level': LogLevel.ERROR,
                    'category': 'action_execution',
                    'message': 'فشل في تنفيذ إجراء إنشاء المهمة',
                    'details': json.dumps({
                        'action_id': action_objects[1].id,
                        'error': 'Database connection timeout',
                        'retry_count': 2
                    })
                },
                {
                    'level': LogLevel.INFO,
                    'category': 'system',
                    'message': 'تم تحديث قالب الرسائل بنجاح',
                    'details': json.dumps({
                        'template_id': template_objects[0].id,
                        'changes': ['content', 'variables']
                    })
                }
            ]
            
            for log_data in log_entries:
                log_entry = AutomationLog(
                    level=log_data['level'],
                    category=log_data['category'],
                    message=log_data['message'],
                    details=log_data['details'],
                    user_id=admin_user.id
                )
                db.session.add(log_entry)
            
            # حفظ جميع البيانات
            db.session.commit()
            
            # طباعة الإحصائيات
            print("\n" + "="*60)
            print("📊 إحصائيات البيانات التجريبية المضافة:")
            print("="*60)
            print(f"📝 قوالب الرسائل: {MessageTemplate.query.count()}")
            print(f"⚙️ قواعد الأتمتة: {AutomationRule.query.count()}")
            print(f"🔄 سير العمل التلقائي: {AutomationWorkflow.query.count()}")
            print(f"⚡ إجراءات سير العمل: {AutomationAction.query.count()}")
            print(f"📅 رسائل مجدولة: {ScheduledMessage.query.count()}")
            print(f"🏃 تنفيذات سير العمل: {WorkflowExecution.query.count()}")
            print(f"⚡ تنفيذات الإجراءات: {ActionExecution.query.count()}")
            print(f"📨 سجلات توصيل الرسائل: {MessageDelivery.query.count()}")
            print(f"📋 سجلات النظام: {AutomationLog.query.count()}")
            print("="*60)
            
            print("✅ تم إضافة جميع البيانات التجريبية بنجاح!")
            print("🎯 يمكنك الآن اختبار نظام الأتمتة والرسائل المجدولة")
            
    except Exception as e:
        print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
        db.session.rollback()
        raise e

if __name__ == '__main__':
    add_automation_sample_data()
