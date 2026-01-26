from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit
)
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
API endpoints لنظام الأتمتة والرسائل المجدولة المتقدمة
API Endpoints for Advanced Automation and Scheduled Messaging System
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import and_, or_, desc, asc, func
from sqlalchemy.orm import joinedload
import uuid
import json

from app import db
from automation_models import (
    AutomationWorkflow, AutomationAction, ScheduledMessage, WorkflowExecution,
    ActionExecution, MessageDelivery, AutomationRule, MessageTemplate,
    AutomationLog, AutomationTriggerType, MessageScheduleType, AutomationStatus
)
from automation_services import workflow_engine, rule_engine, task_scheduler
from automation_reports import report_generator, scheduled_report_service

# إنشاء Blueprint
automation_bp = Blueprint('automation', __name__, url_prefix='/api/automation')

# ===============================
# Automation Reports Endpoints
# ===============================

@automation_bp.route('/reports/generate', methods=['POST'])
@jwt_required()
@check_permission('generate_automation')
@guard_payload_size()
@log_audit('GENERATE_REPORT')
def generate_report():
    """توليد تقرير"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        if not data.get('report_type'):
            return jsonify({"success": False, "error": "نوع التقرير مطلوب"}), 400
        
        # استخراج المعاملات
        report_type = data['report_type']
        format_type = data.get('format', 'pdf')
        start_date = datetime.fromisoformat(data['start_date']) if data.get('start_date') else None
        end_date = datetime.fromisoformat(data['end_date']) if data.get('end_date') else None
        filters = data.get('filters', {})
        
        # توليد التقرير
        result = report_generator.generate_report(
            report_type=report_type,
            format_type=format_type,
            start_date=start_date,
            end_date=end_date,
            filters=filters
        )
        
        if result.get('success'):
            # إرجاع البيانات أو رابط التحميل
            return jsonify({
                "success": True,
                "filename": result.get('filename'),
                "content_type": result.get('content_type'),
                "message": "تم توليد التقرير بنجاح"
            })
        else:
            return jsonify({"success": False, "error": result.get('error')}), 500
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@automation_bp.route('/reports/types', methods=['GET'])
@jwt_required()
@check_permission('view_reports')
@log_audit('GET_REPORT_TYPES')
def get_report_types():
    """الحصول على أنواع التقارير المتاحة"""
    try:
        from automation_reports import ReportType, ReportFormat
        
        report_types = [
            {
                "value": ReportType.WORKFLOW_PERFORMANCE.value,
                "label": "تقرير أداء سير العمل",
                "description": "تحليل أداء وإحصائيات سير العمل"
            },
            {
                "value": ReportType.EXECUTION_SUMMARY.value,
                "label": "تقرير ملخص التنفيذ",
                "description": "ملخص شامل لتنفيذات النظام"
            },
            {
                "value": ReportType.MESSAGE_DELIVERY.value,
                "label": "تقرير تسليم الرسائل",
                "description": "إحصائيات تسليم الرسائل والإشعارات"
            },
            {
                "value": ReportType.SYSTEM_HEALTH.value,
                "label": "تقرير صحة النظام",
                "description": "مراقبة صحة وأداء النظام"
            },
            {
                "value": ReportType.RULE_EFFECTIVENESS.value,
                "label": "تقرير فعالية القواعد",
                "description": "تحليل فعالية قواعد الأتمتة"
            },
            {
                "value": ReportType.DAILY_SUMMARY.value,
                "label": "التقرير اليومي",
                "description": "ملخص يومي شامل للنظام"
            },
            {
                "value": ReportType.WEEKLY_SUMMARY.value,
                "label": "التقرير الأسبوعي",
                "description": "ملخص أسبوعي شامل للنظام"
            },
            {
                "value": ReportType.MONTHLY_SUMMARY.value,
                "label": "التقرير الشهري",
                "description": "ملخص شهري شامل للنظام"
            }
        ]
        
        formats = [
            {"value": ReportFormat.PDF.value, "label": "PDF"},
            {"value": ReportFormat.EXCEL.value, "label": "Excel"},
            {"value": ReportFormat.CSV.value, "label": "CSV"},
            {"value": ReportFormat.JSON.value, "label": "JSON"},
            {"value": ReportFormat.HTML.value, "label": "HTML"}
        ]
        
        return jsonify({
            "success": True,
            "report_types": report_types,
            "formats": formats
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@automation_bp.route('/reports/schedule', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('SCHEDULE_REPORT')
def schedule_report():
    """جدولة تقرير دوري"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['report_type', 'schedule_type', 'recipients']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"success": False, "error": f"{field} مطلوب"}), 400
        
        # إعداد التقرير المجدول
        report_config = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "report_type": data['report_type'],
            "format": data.get('format', 'pdf'),
            "schedule_type": data['schedule_type'],  # daily, weekly, monthly
            "recipients": data['recipients'],
            "filters": data.get('filters', {}),
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        
        # جدولة التقرير
        result = scheduled_report_service.schedule_report(report_config)
        
        if result.get('success'):
            return jsonify({
                "success": True,
                "report_id": report_config['id'],
                "message": "تم جدولة التقرير بنجاح"
            })
        else:
            return jsonify({"success": False, "error": result.get('error')}), 500
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@automation_bp.route('/reports/scheduled', methods=['GET'])
@jwt_required()
@check_permission('view_reports')
@log_audit('GET_SCHEDULED_REPORTS')
def get_scheduled_reports():
    """الحصول على التقارير المجدولة"""
    try:
        user_id = get_jwt_identity()
        
        # فلترة التقارير حسب المستخدم
        user_reports = [
            report for report in scheduled_report_service.scheduled_reports
            if report.get('user_id') == user_id
        ]
        
        return jsonify({
            "success": True,
            "scheduled_reports": user_reports
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@automation_bp.route('/reports/scheduled/<report_id>', methods=['DELETE'])
@jwt_required()
@check_permission('manage_automation')
@log_audit('CANCEL_SCHEDULED_REPORT')
def cancel_scheduled_report(report_id):
    """إلغاء تقرير مجدول"""
    try:
        user_id = get_jwt_identity()
        
        # البحث عن التقرير وإزالته
        for i, report in enumerate(scheduled_report_service.scheduled_reports):
            if report.get('id') == report_id and report.get('user_id') == user_id:
                scheduled_report_service.scheduled_reports.pop(i)
                return jsonify({
                    "success": True,
                    "message": "تم إلغاء التقرير المجدول بنجاح"
                })
        
        return jsonify({"success": False, "error": "التقرير غير موجود"}), 404
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@automation_bp.route('/reports/statistics', methods=['GET'])
@jwt_required()
@check_permission('view_stats')
@log_audit('GET_REPORT_STATISTICS')
def get_report_statistics():
    """الحصول على إحصائيات سريعة للتقارير"""
    try:
        # تحديد الفترة الزمنية
        days = request.args.get('days', 30, type=int)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # جمع الإحصائيات السريعة
        stats = {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            },
            "workflows": {
                "total": AutomationWorkflow.query.count(),
                "active": AutomationWorkflow.query.filter_by(is_active=True).count(),
                "executions_today": WorkflowExecution.query.filter(
                    WorkflowExecution.started_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                ).count()
            },
            "messages": {
                "scheduled_today": ScheduledMessage.query.filter(
                    ScheduledMessage.scheduled_time >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                ).count(),
                "sent_today": ScheduledMessage.query.filter(
                    and_(
                        ScheduledMessage.sent_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0),
                        ScheduledMessage.status == 'sent'
                    )
                ).count()
            },
            "system": {
                "errors_today": AutomationLog.query.filter(
                    and_(
                        AutomationLog.timestamp >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0),
                        AutomationLog.event_type.contains('error')
                    )
                ).count(),
                "active_rules": AutomationRule.query.filter_by(is_active=True).count()
            }
        }
        
        return jsonify({
            "success": True,
            "statistics": stats
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===============================
# Automation Workflows Endpoints
# ===============================

@automation_bp.route('/workflows', methods=['GET'])
@jwt_required()
@check_permission('view_automation')
@log_audit('GET_WORKFLOWS')
def get_workflows():
    """الحصول على قائمة سير العمل الآلي"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        
        # الفلاتر
        status = request.args.get('status')
        trigger_type = request.args.get('trigger_type')
        category = request.args.get('category')
        search = request.args.get('search', '').strip()
        
        # بناء الاستعلام
        query = AutomationWorkflow.query
        
        if status:
            query = query.filter(AutomationWorkflow.status == status)
        if trigger_type:
            query = query.filter(AutomationWorkflow.trigger_type == trigger_type)
        if category:
            query = query.filter(AutomationWorkflow.category == category)
        if search:
            query = query.filter(
                or_(
                    AutomationWorkflow.name.contains(search),
                    AutomationWorkflow.description.contains(search)
                )
            )
        
        # ترتيب وترقيم الصفحات
        workflows = query.order_by(desc(AutomationWorkflow.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'workflows': [{
                'id': w.id,
                'name': w.name,
                'description': w.description,
                'trigger_type': w.trigger_type.value if w.trigger_type else None,
                'status': w.status.value if w.status else None,
                'category': w.category,
                'priority': w.priority,
                'is_active': w.is_active,
                'execution_count': w.execution_count,
                'last_execution': w.last_execution.isoformat() if w.last_execution else None,
                'next_execution': w.next_execution.isoformat() if w.next_execution else None,
                'created_at': w.created_at.isoformat(),
                'actions_count': len(w.actions)
            } for w in workflows.items],
            'pagination': {
                'page': workflows.page,
                'pages': workflows.pages,
                'per_page': workflows.per_page,
                'total': workflows.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/workflows', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('CREATE_WORKFLOW')
def create_workflow():
    """إنشاء سير عمل آلي جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name', 'trigger_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'الحقل {field} مطلوب'}), 400
        
        # إنشاء سير العمل
        workflow = AutomationWorkflow(
            name=data['name'],
            description=data.get('description', ''),
            trigger_type=AutomationTriggerType(data['trigger_type']),
            trigger_conditions=data.get('trigger_conditions', {}),
            execution_order=data.get('execution_order', 1),
            max_executions=data.get('max_executions'),
            start_date=datetime.fromisoformat(data['start_date']) if data.get('start_date') else None,
            end_date=datetime.fromisoformat(data['end_date']) if data.get('end_date') else None,
            schedule_pattern=data.get('schedule_pattern', {}),
            timezone=data.get('timezone', 'Asia/Riyadh'),
            status=AutomationStatus(data.get('status', 'draft')),
            tags=data.get('tags', []),
            priority=data.get('priority', 5),
            category=data.get('category', ''),
            created_by=current_user_id
        )
        
        db.session.add(workflow)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء سير العمل بنجاح',
            'workflow_id': workflow.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/workflows/<int:workflow_id>', methods=['GET'])
@jwt_required()
@check_permission('view_automation')
@log_audit('GET_WORKFLOW')
def get_workflow(workflow_id):
    """الحصول على تفاصيل سير عمل محدد"""
    try:
        workflow = AutomationWorkflow.query.options(
            joinedload(AutomationWorkflow.actions),
            joinedload(AutomationWorkflow.executions)
        ).get_or_404(workflow_id)
        
        return jsonify({
            'success': True,
            'workflow': {
                'id': workflow.id,
                'name': workflow.name,
                'description': workflow.description,
                'trigger_type': workflow.trigger_type.value if workflow.trigger_type else None,
                'trigger_conditions': workflow.trigger_conditions,
                'execution_order': workflow.execution_order,
                'max_executions': workflow.max_executions,
                'execution_count': workflow.execution_count,
                'start_date': workflow.start_date.isoformat() if workflow.start_date else None,
                'end_date': workflow.end_date.isoformat() if workflow.end_date else None,
                'schedule_pattern': workflow.schedule_pattern,
                'timezone': workflow.timezone,
                'status': workflow.status.value if workflow.status else None,
                'is_active': workflow.is_active,
                'last_execution': workflow.last_execution.isoformat() if workflow.last_execution else None,
                'next_execution': workflow.next_execution.isoformat() if workflow.next_execution else None,
                'tags': workflow.tags,
                'priority': workflow.priority,
                'category': workflow.category,
                'created_at': workflow.created_at.isoformat(),
                'actions': [{
                    'id': a.id,
                    'name': a.name,
                    'action_type': a.action_type,
                    'sequence_order': a.sequence_order,
                    'is_active': a.is_active,
                    'execution_count': a.execution_count
                } for a in sorted(workflow.actions, key=lambda x: x.sequence_order)],
                'recent_executions': [{
                    'id': e.id,
                    'execution_id': e.execution_id,
                    'status': e.status,
                    'started_at': e.started_at.isoformat(),
                    'completed_at': e.completed_at.isoformat() if e.completed_at else None,
                    'duration': e.duration
                } for e in sorted(workflow.executions, key=lambda x: x.started_at, reverse=True)[:5]]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/workflows/<int:workflow_id>', methods=['PUT'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('UPDATE_WORKFLOW')
def update_workflow(workflow_id):
    """تحديث سير عمل آلي"""
    try:
        current_user_id = get_jwt_identity()
        workflow = AutomationWorkflow.query.get_or_404(workflow_id)
        data = request.get_json()
        
        # تحديث الحقول
        if 'name' in data:
            workflow.name = data['name']
        if 'description' in data:
            workflow.description = data['description']
        if 'trigger_type' in data:
            workflow.trigger_type = AutomationTriggerType(data['trigger_type'])
        if 'trigger_conditions' in data:
            workflow.trigger_conditions = data['trigger_conditions']
        if 'schedule_pattern' in data:
            workflow.schedule_pattern = data['schedule_pattern']
        if 'status' in data:
            workflow.status = AutomationStatus(data['status'])
        if 'is_active' in data:
            workflow.is_active = data['is_active']
        if 'priority' in data:
            workflow.priority = data['priority']
        if 'category' in data:
            workflow.category = data['category']
        if 'tags' in data:
            workflow.tags = data['tags']
        
        workflow.updated_by = current_user_id
        workflow.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث سير العمل بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/workflows/<int:workflow_id>/execute', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('EXECUTE_WORKFLOW')
def execute_workflow(workflow_id):
    """تنفيذ سير عمل آلي يدوياً"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        trigger_data = data.get('trigger_data', {})
        
        # تنفيذ سير العمل باستخدام محرك سير العمل
        result = workflow_engine.execute_workflow(
            workflow_id, 
            trigger_data=trigger_data, 
            user_id=current_user_id
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'تم تنفيذ سير العمل بنجاح',
                'result': result
            })
        else:
            return jsonify({
                'success': False,
                'message': result.get('error', 'فشل في تنفيذ سير العمل'),
                'result': result
            }), 400
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===============================
# Automation Actions Endpoints
# ===============================

@automation_bp.route('/workflows/<int:workflow_id>/actions', methods=['GET'])
@jwt_required()
@check_permission('view_automation')
@log_audit('GET_WORKFLOW_ACTIONS')
def get_workflow_actions(workflow_id):
    """الحصول على إجراءات سير عمل محدد"""
    try:
        actions = AutomationAction.query.filter_by(workflow_id=workflow_id)\
            .order_by(AutomationAction.sequence_order).all()
        
        return jsonify({
            'success': True,
            'actions': [{
                'id': a.id,
                'name': a.name,
                'action_type': a.action_type,
                'action_config': a.action_config,
                'parameters': a.parameters,
                'conditions': a.conditions,
                'sequence_order': a.sequence_order,
                'is_conditional': a.is_conditional,
                'retry_count': a.retry_count,
                'max_retries': a.max_retries,
                'delay_before': a.delay_before,
                'timeout': a.timeout,
                'is_active': a.is_active,
                'execution_count': a.execution_count,
                'last_execution': a.last_execution.isoformat() if a.last_execution else None
            } for a in actions]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/workflows/<int:workflow_id>/actions', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('CREATE_ACTION')
def create_action(workflow_id):
    """إضافة إجراء جديد لسير العمل"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من وجود سير العمل
        workflow = AutomationWorkflow.query.get_or_404(workflow_id)
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name', 'action_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'الحقل {field} مطلوب'}), 400
        
        # إنشاء الإجراء
        action = AutomationAction(
            workflow_id=workflow_id,
            name=data['name'],
            action_type=data['action_type'],
            action_config=data.get('action_config', {}),
            parameters=data.get('parameters', {}),
            conditions=data.get('conditions', {}),
            sequence_order=data.get('sequence_order', 1),
            is_conditional=data.get('is_conditional', False),
            max_retries=data.get('max_retries', 3),
            delay_before=data.get('delay_before', 0),
            timeout=data.get('timeout', 300),
            created_by=current_user_id
        )
        
        db.session.add(action)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة الإجراء بنجاح',
            'action_id': action.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ===============================
# Scheduled Messages Endpoints
# ===============================

@automation_bp.route('/messages', methods=['GET'])
@jwt_required()
@check_permission('view_automation')
@log_audit('GET_SCHEDULED_MESSAGES')
def get_scheduled_messages():
    """الحصول على قائمة الرسائل المجدولة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        
        # الفلاتر
        status = request.args.get('status')
        message_type = request.args.get('message_type')
        schedule_type = request.args.get('schedule_type')
        
        # بناء الاستعلام
        query = ScheduledMessage.query
        
        if status:
            query = query.filter(ScheduledMessage.status == status)
        if message_type:
            query = query.filter(ScheduledMessage.message_type == message_type)
        if schedule_type:
            query = query.filter(ScheduledMessage.schedule_type == schedule_type)
        
        # ترتيب وترقيم الصفحات
        messages = query.order_by(desc(ScheduledMessage.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'messages': [{
                'id': m.id,
                'subject': m.subject,
                'message_type': m.message_type,
                'schedule_type': m.schedule_type.value if m.schedule_type else None,
                'scheduled_time': m.scheduled_time.isoformat() if m.scheduled_time else None,
                'next_send': m.next_send.isoformat() if m.next_send else None,
                'status': m.status,
                'is_active': m.is_active,
                'sent_count': m.sent_count,
                'priority': m.priority,
                'created_at': m.created_at.isoformat()
            } for m in messages.items],
            'pagination': {
                'page': messages.page,
                'pages': messages.pages,
                'per_page': messages.per_page,
                'total': messages.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/messages', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('CREATE_SCHEDULED_MESSAGE')
def create_scheduled_message():
    """إنشاء رسالة مجدولة جديدة"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['content', 'message_type', 'schedule_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'الحقل {field} مطلوب'}), 400
        
        # إنشاء الرسالة المجدولة
        message = ScheduledMessage(
            workflow_id=data.get('workflow_id'),
            subject=data.get('subject', ''),
            content=data['content'],
            message_type=data['message_type'],
            recipients=data.get('recipients', []),
            recipient_groups=data.get('recipient_groups', []),
            recipient_filters=data.get('recipient_filters', {}),
            schedule_type=MessageScheduleType(data['schedule_type']),
            scheduled_time=datetime.fromisoformat(data['scheduled_time']) if data.get('scheduled_time') else None,
            recurrence_pattern=data.get('recurrence_pattern', {}),
            timezone=data.get('timezone', 'Asia/Riyadh'),
            trigger_conditions=data.get('trigger_conditions', {}),
            send_conditions=data.get('send_conditions', {}),
            max_sends=data.get('max_sends'),
            priority=data.get('priority', 5),
            delivery_options=data.get('delivery_options', {}),
            tracking_enabled=data.get('tracking_enabled', True),
            created_by=current_user_id
        )
        
        # حساب وقت الإرسال التالي
        if message.schedule_type == MessageScheduleType.SCHEDULED and message.scheduled_time:
            message.next_send = message.scheduled_time
        elif message.schedule_type == MessageScheduleType.IMMEDIATE:
            message.next_send = datetime.utcnow()
        
        db.session.add(message)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الرسالة المجدولة بنجاح',
            'message_id': message.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/messages/<int:message_id>/send', methods=['POST'])
@jwt_required()
@check_permission('send_automation')
@guard_payload_size()
@log_audit('SEND_MESSAGE_NOW')
def send_message_now(message_id):
    """إرسال رسالة مجدولة فوراً"""
    try:
        message = ScheduledMessage.query.get_or_404(message_id)
        
        if not message.is_active:
            return jsonify({'success': False, 'message': 'الرسالة غير نشطة'}), 400
        
        # إرسال الرسالة باستخدام محرك سير العمل
        workflow_engine._send_scheduled_message(message)
        
        return jsonify({
            'success': True,
            'message': 'تم إرسال الرسالة بنجاح',
            'status': message.status
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===============================
# Message Templates Endpoints
# ===============================

@automation_bp.route('/templates', methods=['GET'])
@jwt_required()
@check_permission('view_automation')
@log_audit('GET_MESSAGE_TEMPLATES')
def get_message_templates():
    """الحصول على قوالب الرسائل"""
    try:
        category = request.args.get('category')
        message_type = request.args.get('message_type')
        
        query = MessageTemplate.query.filter_by(is_active=True)
        
        if category:
            query = query.filter(MessageTemplate.category == category)
        if message_type:
            query = query.filter(MessageTemplate.message_type == message_type)
        
        templates = query.order_by(MessageTemplate.name).all()
        
        return jsonify({
            'success': True,
            'templates': [{
                'id': t.id,
                'name': t.name,
                'description': t.description,
                'category': t.category,
                'subject_template': t.subject_template,
                'content_template': t.content_template,
                'message_type': t.message_type,
                'variables': t.variables,
                'usage_count': t.usage_count
            } for t in templates]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/templates', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('CREATE_MESSAGE_TEMPLATE')
def create_message_template():
    """إنشاء قالب رسالة جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name', 'content_template', 'message_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'الحقل {field} مطلوب'}), 400
        
        # إنشاء القالب
        template = MessageTemplate(
            name=data['name'],
            description=data.get('description', ''),
            category=data.get('category', ''),
            subject_template=data.get('subject_template', ''),
            content_template=data['content_template'],
            message_type=data['message_type'],
            variables=data.get('variables', []),
            default_values=data.get('default_values', {}),
            validation_rules=data.get('validation_rules', {}),
            created_by=current_user_id
        )
        
        db.session.add(template)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء القالب بنجاح',
            'template_id': template.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ===============================
# Enhanced Workflow Management
# ===============================

@automation_bp.route('/workflows/<int:workflow_id>/pause', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('PAUSE_WORKFLOW_EXECUTION')
def pause_workflow_execution():
    """إيقاف تنفيذ سير عمل مؤقتاً"""
    try:
        data = request.get_json()
        execution_id = data.get('execution_id')
        
        if not execution_id:
            return jsonify({'success': False, 'message': 'معرف التنفيذ مطلوب'}), 400
        
        result = workflow_engine.pause_workflow(execution_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/workflows/<int:workflow_id>/resume', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('RESUME_WORKFLOW_EXECUTION')
def resume_workflow_execution():
    """استئناف تنفيذ سير عمل متوقف"""
    try:
        data = request.get_json()
        execution_id = data.get('execution_id')
        
        if not execution_id:
            return jsonify({'success': False, 'message': 'معرف التنفيذ مطلوب'}), 400
        
        result = workflow_engine.resume_workflow(execution_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/workflows/<int:workflow_id>/cancel', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('CANCEL_WORKFLOW_EXECUTION')
def cancel_workflow_execution():
    """إلغاء تنفيذ سير عمل"""
    try:
        data = request.get_json()
        execution_id = data.get('execution_id')
        
        if not execution_id:
            return jsonify({'success': False, 'message': 'معرف التنفيذ مطلوب'}), 400
        
        result = workflow_engine.cancel_workflow(execution_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/workflows/<int:workflow_id>/schedule', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('SCHEDULE_WORKFLOW')
def schedule_workflow():
    """جدولة سير عمل"""
    try:
        data = request.get_json()
        workflow_id = data.get('workflow_id')
        schedule_type = data.get('schedule_type')
        schedule_time = data.get('schedule_time')
        schedule_data = data.get('schedule_data')
        
        if not workflow_id or not schedule_type:
            return jsonify({'success': False, 'message': 'معرف سير العمل ونوع الجدولة مطلوبان'}), 400
        
        schedule_time_obj = None
        if schedule_time:
            schedule_time_obj = datetime.fromisoformat(schedule_time)
        
        result = task_scheduler.schedule_workflow(
            workflow_id, schedule_type, schedule_time_obj, schedule_data
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===============================
# Rule Engine Endpoints
# ===============================

@automation_bp.route('/rules/<int:rule_id>/evaluate', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('EVALUATE_RULE')
def evaluate_rule(rule_id):
    """تقييم قاعدة أتمتة"""
    try:
        data = request.get_json() or {}
        context_data = data.get('context_data')
        
        result = rule_engine.evaluate_rule(rule_id, context_data)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/rules/evaluate-all', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('EVALUATE_ALL_RULES')
def evaluate_all_rules():
    """تقييم جميع القواعد النشطة"""
    try:
        data = request.get_json() or {}
        context_data = data.get('context_data')
        
        rule_engine.check_all_active_rules(context_data)
        
        return jsonify({
            'success': True,
            'message': 'تم تقييم جميع القواعد النشطة'
        })
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===============================
# Task Scheduling Endpoints
# ===============================

@automation_bp.route('/messages/schedule', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('SCHEDULE_MESSAGE')
def schedule_message():
    """جدولة رسالة"""
    try:
        data = request.get_json()
        
        required_fields = ['message_type', 'recipient', 'content', 'scheduled_time']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'الحقل {field} مطلوب'}), 400
        
        scheduled_time = datetime.fromisoformat(data['scheduled_time'])
        
        result = task_scheduler.schedule_message(
            message_type=data['message_type'],
            recipient=data['recipient'],
            content=data['content'],
            scheduled_time=scheduled_time,
            subject=data.get('subject'),
            template_id=data.get('template_id'),
            metadata=data.get('metadata')
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===============================
# Workflow Engine Control
# ===============================

@automation_bp.route('/engine/start', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('START_WORKFLOW_ENGINE')
def start_workflow_engine():
    """بدء محرك سير العمل"""
    try:
        workflow_engine.start_scheduler()
        
        return jsonify({
            'success': True,
            'message': 'تم بدء محرك سير العمل بنجاح'
        })
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/engine/stop', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('STOP_WORKFLOW_ENGINE')
def stop_workflow_engine():
    """إيقاف محرك سير العمل"""
    try:
        workflow_engine.stop_scheduler()
        
        return jsonify({
            'success': True,
            'message': 'تم إيقاف محرك سير العمل بنجاح'
        })
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/engine/status', methods=['GET'])
@jwt_required()
@check_permission('view_automation')
@log_audit('GET_ENGINE_STATUS')
def get_engine_status():
    """الحصول على حالة محرك سير العمل"""
    try:
        return jsonify({
            'success': True,
            'is_running': workflow_engine.is_running,
            'running_workflows': len(workflow_engine.running_workflows)
        })
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===============================
# Execution Monitoring
# ===============================

@automation_bp.route('/executions', methods=['GET'])
@jwt_required()
@check_permission('view_automation')
@log_audit('GET_WORKFLOW_EXECUTIONS')
def get_workflow_executions():
    """الحصول على تنفيذات سير العمل"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        
        # الفلاتر
        workflow_id = request.args.get('workflow_id', type=int)
        status = request.args.get('status')
        
        query = WorkflowExecution.query
        
        if workflow_id:
            query = query.filter(WorkflowExecution.workflow_id == workflow_id)
        if status:
            query = query.filter(WorkflowExecution.status == status)
        
        executions = query.order_by(desc(WorkflowExecution.started_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'executions': [{
                'id': e.id,
                'workflow_id': e.workflow_id,
                'workflow_name': e.workflow.name if e.workflow else 'غير محدد',
                'status': e.status,
                'started_at': e.started_at.isoformat(),
                'completed_at': e.completed_at.isoformat() if e.completed_at else None,
                'duration': e.duration,
                'trigger_data': json.loads(e.trigger_data) if e.trigger_data else None,
                'result': json.loads(e.result) if e.result else None,
                'error_message': e.error_message
            } for e in executions.items],
            'pagination': {
                'page': executions.page,
                'pages': executions.pages,
                'per_page': executions.per_page,
                'total': executions.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/executions/<int:execution_id>', methods=['GET'])
@jwt_required()
@check_permission('view_automation')
@log_audit('GET_EXECUTION_DETAILS')
def get_execution_details(execution_id):
    """الحصول على تفاصيل تنفيذ محدد"""
    try:
        execution = WorkflowExecution.query.options(
            joinedload(WorkflowExecution.action_executions)
        ).get_or_404(execution_id)
        
        return jsonify({
            'success': True,
            'execution': {
                'id': execution.id,
                'workflow_id': execution.workflow_id,
                'workflow_name': execution.workflow.name if execution.workflow else 'غير محدد',
                'status': execution.status,
                'started_at': execution.started_at.isoformat(),
                'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
                'duration': execution.duration,
                'trigger_data': json.loads(execution.trigger_data) if execution.trigger_data else None,
                'result': json.loads(execution.result) if execution.result else None,
                'error_message': execution.error_message,
                'action_executions': [{
                    'id': ae.id,
                    'action_id': ae.action_id,
                    'action_name': ae.action.name if ae.action else 'غير محدد',
                    'status': ae.status,
                    'started_at': ae.started_at.isoformat(),
                    'completed_at': ae.completed_at.isoformat() if ae.completed_at else None,
                    'result': json.loads(ae.result) if ae.result else None,
                    'error_message': ae.error_message
                } for ae in execution.action_executions]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/logs', methods=['GET'])
@jwt_required()
@check_permission('view_automation')
@log_audit('GET_AUTOMATION_LOGS')
def get_automation_logs():
    """الحصول على سجلات الأتمتة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 200)
        
        # الفلاتر
        workflow_id = request.args.get('workflow_id', type=int)
        execution_id = request.args.get('execution_id', type=int)
        event_type = request.args.get('event_type')
        
        query = AutomationLog.query
        
        if workflow_id:
            query = query.filter(AutomationLog.workflow_id == workflow_id)
        if execution_id:
            query = query.filter(AutomationLog.execution_id == execution_id)
        if event_type:
            query = query.filter(AutomationLog.event_type == event_type)
        
        logs = query.order_by(desc(AutomationLog.timestamp)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'logs': [{
                'id': log.id,
                'workflow_id': log.workflow_id,
                'execution_id': log.execution_id,
                'event_type': log.event_type,
                'message': log.message,
                'timestamp': log.timestamp.isoformat()
            } for log in logs.items],
            'pagination': {
                'page': logs.page,
                'pages': logs.pages,
                'per_page': logs.per_page,
                'total': logs.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===============================
# Dashboard and Statistics
# ===============================

@automation_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_DASHBOARD_STATS')
def get_dashboard_stats():
    """الحصول على إحصائيات لوحة التحكم"""
    try:
        # إحصائيات سير العمل
        total_workflows = AutomationWorkflow.query.count()
        active_workflows = AutomationWorkflow.query.filter_by(is_active=True).count()
        running_workflows = AutomationWorkflow.query.filter_by(status=AutomationStatus.ACTIVE).count()
        
        # إحصائيات الرسائل
        total_messages = ScheduledMessage.query.count()
        pending_messages = ScheduledMessage.query.filter_by(status='scheduled').count()
        sent_today = ScheduledMessage.query.filter(
            ScheduledMessage.last_sent >= datetime.utcnow().date()
        ).count()
        
        # إحصائيات التنفيذ
        total_executions = WorkflowExecution.query.count()
        successful_executions = WorkflowExecution.query.filter_by(result='success').count()
        failed_executions = WorkflowExecution.query.filter_by(result='failed').count()
        
        # الرسائل القادمة
        upcoming_messages = ScheduledMessage.query.filter(
            and_(
                ScheduledMessage.next_send.isnot(None),
                ScheduledMessage.next_send <= datetime.utcnow() + timedelta(hours=24),
                ScheduledMessage.is_active == True
            )
        ).order_by(ScheduledMessage.next_send).limit(5).all()
        
        # التنفيذات الأخيرة
        recent_executions = WorkflowExecution.query.order_by(
            desc(WorkflowExecution.started_at)
        ).limit(5).all()
        
        return jsonify({
            'success': True,
            'stats': {
                'workflows': {
                    'total': total_workflows,
                    'active': active_workflows,
                    'running': running_workflows
                },
                'messages': {
                    'total': total_messages,
                    'pending': pending_messages,
                    'sent_today': sent_today
                },
                'executions': {
                    'total': total_executions,
                    'successful': successful_executions,
                    'failed': failed_executions,
                    'success_rate': round((successful_executions / total_executions * 100) if total_executions > 0 else 0, 2)
                }
            },
            'upcoming_messages': [{
                'id': m.id,
                'subject': m.subject,
                'next_send': m.next_send.isoformat(),
                'message_type': m.message_type
            } for m in upcoming_messages],
            'recent_executions': [{
                'id': e.id,
                'workflow_name': e.workflow.name if e.workflow else 'غير محدد',
                'status': e.status,
                'started_at': e.started_at.isoformat(),
                'duration': e.duration
            } for e in recent_executions]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ===============================
# Automation Rules Endpoints
# ===============================

@automation_bp.route('/rules', methods=['GET'])
@jwt_required()
@check_permission('view_automation')
@log_audit('GET_AUTOMATION_RULES')
def get_automation_rules():
    """الحصول على قواعد الأتمتة"""
    try:
        rules = AutomationRule.query.filter_by(is_active=True)\
            .order_by(desc(AutomationRule.priority)).all()
        
        return jsonify({
            'success': True,
            'rules': [{
                'id': r.id,
                'name': r.name,
                'description': r.description,
                'conditions': r.conditions,
                'actions': r.actions,
                'priority': r.priority,
                'execution_count': r.execution_count,
                'last_triggered': r.last_triggered.isoformat() if r.last_triggered else None
            } for r in rules]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@automation_bp.route('/rules', methods=['POST'])
@jwt_required()
@check_permission('manage_automation')
@guard_payload_size()
@log_audit('CREATE_AUTOMATION_RULE')
def create_automation_rule():
    """إنشاء قاعدة أتمتة جديدة"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name', 'conditions']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'الحقل {field} مطلوب'}), 400
        
        # إنشاء القاعدة
        rule = AutomationRule(
            name=data['name'],
            description=data.get('description', ''),
            conditions=json.dumps(data['conditions']) if isinstance(data['conditions'], dict) else data['conditions'],
            workflow_id=data.get('workflow_id'),
            priority=data.get('priority', 5),
            created_by=current_user_id
        )
        
        db.session.add(rule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء القاعدة بنجاح',
            'rule_id': rule.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
