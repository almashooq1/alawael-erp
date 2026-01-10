#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Workflow Templates System API
Ready-to-use workflow templates endpoints for Al-Awael Centers
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, desc, asc, and_, or_
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
import json
import uuid

from workflow_templates_models import (
    db, WorkflowTemplate, WorkflowStep, WorkflowInstance, WorkflowStepInstance,
    WorkflowTemplate_User, WorkflowNotification, WorkflowAuditLog, WorkflowMetrics,
    WorkflowIntegration, WorkflowCategory, WorkflowStatus, StepType, StepStatus, TriggerType
)

workflow_templates_bp = Blueprint('workflow_templates', __name__, url_prefix='/api/workflows')

# Template Management Endpoints

@workflow_templates_bp.route('/templates', methods=['GET'])
@jwt_required()
def get_templates():
    """Get workflow templates with filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Filters
        category = request.args.get('category')
        status = request.args.get('status')
        search = request.args.get('search', '').strip()
        is_public = request.args.get('is_public')
        
        query = WorkflowTemplate.query
        
        # Apply filters
        if category:
            query = query.filter(WorkflowTemplate.category == WorkflowCategory(category))
        if status:
            query = query.filter(WorkflowTemplate.status == WorkflowStatus(status))
        if is_public is not None:
            query = query.filter(WorkflowTemplate.is_public == (is_public.lower() == 'true'))
        if search:
            query = query.filter(
                or_(
                    WorkflowTemplate.name.ilike(f'%{search}%'),
                    WorkflowTemplate.name_ar.ilike(f'%{search}%'),
                    WorkflowTemplate.description.ilike(f'%{search}%')
                )
            )
        
        query = query.order_by(desc(WorkflowTemplate.usage_count), WorkflowTemplate.name)
        
        templates = query.paginate(page=page, per_page=per_page, error_out=False)
        
        templates_data = []
        for template in templates.items:
            templates_data.append({
                'id': template.id,
                'template_uuid': template.template_uuid,
                'name': template.name,
                'name_ar': template.name_ar,
                'description': template.description,
                'category': template.category.value,
                'status': template.status.value,
                'version': template.version,
                'usage_count': template.usage_count,
                'success_rate': template.success_rate,
                'estimated_duration': template.estimated_duration,
                'complexity_level': template.complexity_level,
                'is_public': template.is_public,
                'steps_count': len(template.steps),
                'created_at': template.created_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'templates': templates_data,
            'pagination': {
                'page': templates.page,
                'pages': templates.pages,
                'per_page': templates.per_page,
                'total': templates.total
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting templates: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب القوالب'}), 500

@workflow_templates_bp.route('/templates', methods=['POST'])
@jwt_required()
def create_template():
    """Create a new workflow template"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        # Validate required fields
        required_fields = ['name', 'name_ar', 'category']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'حقل {field} مطلوب'}), 400
        
        template = WorkflowTemplate(
            name=data['name'],
            name_ar=data['name_ar'],
            description=data.get('description'),
            description_ar=data.get('description_ar'),
            category=WorkflowCategory(data['category']),
            version=data.get('version', '1.0'),
            tags=data.get('tags', []),
            estimated_duration=data.get('estimated_duration'),
            complexity_level=data.get('complexity_level', 'medium'),
            is_public=data.get('is_public', True),
            requires_approval=data.get('requires_approval', False),
            auto_assign=data.get('auto_assign', False),
            trigger_type=TriggerType(data.get('trigger_type', 'manual')),
            trigger_conditions=data.get('trigger_conditions'),
            workflow_config=data.get('workflow_config', {}),
            input_schema=data.get('input_schema', {}),
            output_schema=data.get('output_schema', {}),
            created_by_id=user_id
        )
        
        db.session.add(template)
        db.session.flush()
        
        # Create steps if provided
        if 'steps' in data:
            for step_data in data['steps']:
                step = WorkflowStep(
                    template_id=template.id,
                    name=step_data['name'],
                    name_ar=step_data['name_ar'],
                    description=step_data.get('description'),
                    step_type=StepType(step_data['step_type']),
                    step_order=step_data['step_order'],
                    is_required=step_data.get('is_required', True),
                    estimated_duration=step_data.get('estimated_duration'),
                    step_config=step_data.get('step_config', {}),
                    assigned_role=step_data.get('assigned_role')
                )
                db.session.add(step)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء القالب بنجاح',
            'template': {
                'id': template.id,
                'template_uuid': template.template_uuid,
                'name': template.name,
                'name_ar': template.name_ar
            }
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating template: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في إنشاء القالب'}), 500

@workflow_templates_bp.route('/templates/<int:template_id>', methods=['GET'])
@jwt_required()
def get_template(template_id):
    """Get template details with steps"""
    try:
        template = WorkflowTemplate.query.options(
            joinedload(WorkflowTemplate.steps)
        ).get_or_404(template_id)
        
        steps_data = []
        for step in template.steps:
            steps_data.append({
                'id': step.id,
                'step_uuid': step.step_uuid,
                'name': step.name,
                'name_ar': step.name_ar,
                'description': step.description,
                'step_type': step.step_type.value,
                'step_order': step.step_order,
                'is_required': step.is_required,
                'estimated_duration': step.estimated_duration,
                'assigned_role': step.assigned_role,
                'step_config': step.step_config
            })
        
        return jsonify({
            'success': True,
            'template': {
                'id': template.id,
                'template_uuid': template.template_uuid,
                'name': template.name,
                'name_ar': template.name_ar,
                'description': template.description,
                'category': template.category.value,
                'status': template.status.value,
                'version': template.version,
                'estimated_duration': template.estimated_duration,
                'complexity_level': template.complexity_level,
                'usage_count': template.usage_count,
                'success_rate': template.success_rate,
                'workflow_config': template.workflow_config,
                'input_schema': template.input_schema,
                'output_schema': template.output_schema,
                'steps': steps_data,
                'created_at': template.created_at.isoformat()
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting template: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب القالب'}), 500

# Workflow Instance Management

@workflow_templates_bp.route('/instances', methods=['POST'])
@jwt_required()
def create_instance():
    """Create a new workflow instance"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        template_id = data.get('template_id')
        if not template_id:
            return jsonify({'success': False, 'message': 'معرف القالب مطلوب'}), 400
        
        template = WorkflowTemplate.query.get_or_404(template_id)
        
        instance = WorkflowInstance(
            template_id=template_id,
            name=data.get('name', f"{template.name_ar} - {datetime.now().strftime('%Y-%m-%d %H:%M')}"),
            reference_id=data.get('reference_id'),
            reference_type=data.get('reference_type'),
            input_data=data.get('input_data', {}),
            context_data=data.get('context_data', {}),
            priority=data.get('priority', 'medium'),
            assigned_to_id=data.get('assigned_to_id'),
            due_date=datetime.fromisoformat(data['due_date']) if data.get('due_date') else None,
            created_by_id=user_id
        )
        
        db.session.add(instance)
        db.session.flush()
        
        # Create step instances
        for step in template.steps:
            step_instance = WorkflowStepInstance(
                workflow_instance_id=instance.id,
                step_id=step.id,
                status=StepStatus.PENDING,
                assigned_to_id=step.assigned_user_id
            )
            db.session.add(step_instance)
        
        # Update template usage count
        template.usage_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء سير العمل بنجاح',
            'instance': {
                'id': instance.id,
                'instance_uuid': instance.instance_uuid,
                'name': instance.name
            }
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating instance: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في إنشاء سير العمل'}), 500

@workflow_templates_bp.route('/instances', methods=['GET'])
@jwt_required()
def get_instances():
    """Get workflow instances"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Filters
        status = request.args.get('status')
        template_id = request.args.get('template_id', type=int)
        assigned_to = request.args.get('assigned_to', type=int)
        
        query = WorkflowInstance.query.options(joinedload(WorkflowInstance.template))
        
        if status:
            query = query.filter(WorkflowInstance.status == status)
        if template_id:
            query = query.filter(WorkflowInstance.template_id == template_id)
        if assigned_to:
            query = query.filter(WorkflowInstance.assigned_to_id == assigned_to)
        
        query = query.order_by(desc(WorkflowInstance.created_at))
        
        instances = query.paginate(page=page, per_page=per_page, error_out=False)
        
        instances_data = []
        for instance in instances.items:
            instances_data.append({
                'id': instance.id,
                'instance_uuid': instance.instance_uuid,
                'name': instance.name,
                'template_name': instance.template.name_ar,
                'status': instance.status,
                'progress_percentage': instance.progress_percentage,
                'priority': instance.priority,
                'started_at': instance.started_at.isoformat(),
                'due_date': instance.due_date.isoformat() if instance.due_date else None,
                'completed_at': instance.completed_at.isoformat() if instance.completed_at else None
            })
        
        return jsonify({
            'success': True,
            'instances': instances_data,
            'pagination': {
                'page': instances.page,
                'pages': instances.pages,
                'per_page': instances.per_page,
                'total': instances.total
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting instances: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب سير العمل'}), 500

# Dashboard and Analytics

@workflow_templates_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """Get workflow dashboard data"""
    try:
        # Summary statistics
        total_templates = WorkflowTemplate.query.count()
        active_templates = WorkflowTemplate.query.filter_by(status=WorkflowStatus.ACTIVE).count()
        total_instances = WorkflowInstance.query.count()
        active_instances = WorkflowInstance.query.filter_by(status='active').count()
        completed_instances = WorkflowInstance.query.filter_by(status='completed').count()
        
        # Recent activity
        recent_instances = WorkflowInstance.query.options(
            joinedload(WorkflowInstance.template)
        ).order_by(desc(WorkflowInstance.created_at)).limit(10).all()
        
        recent_activity = []
        for instance in recent_instances:
            recent_activity.append({
                'id': instance.id,
                'name': instance.name,
                'template_name': instance.template.name_ar,
                'status': instance.status,
                'created_at': instance.started_at.isoformat()
            })
        
        # Category distribution
        category_stats = db.session.query(
            WorkflowTemplate.category,
            func.count(WorkflowTemplate.id)
        ).group_by(WorkflowTemplate.category).all()
        
        category_distribution = [
            {'category': cat[0].value, 'count': cat[1]}
            for cat in category_stats
        ]
        
        return jsonify({
            'success': True,
            'summary': {
                'total_templates': total_templates,
                'active_templates': active_templates,
                'total_instances': total_instances,
                'active_instances': active_instances,
                'completed_instances': completed_instances,
                'completion_rate': round((completed_instances / total_instances * 100) if total_instances > 0 else 0, 1)
            },
            'recent_activity': recent_activity,
            'category_distribution': category_distribution
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting dashboard: {str(e)}")
        return jsonify({'success': False, 'message': 'خطأ في جلب بيانات لوحة التحكم'}), 500
