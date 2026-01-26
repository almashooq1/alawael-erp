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
API Endpoints لإدارة الأنشطة والمهام - نظام CRM
Activities and Tasks Management API Endpoints - CRM System
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import and_, or_, desc, func
from sqlalchemy.orm import joinedload

from app import db
from crm_models import *

# إنشاء Blueprint للأنشطة
activities_bp = Blueprint('activities', __name__, url_prefix='/api/crm')

def get_current_user_id():
    """الحصول على معرف المستخدم الحالي"""
    return get_jwt_identity()

# Activity Management APIs
@activities_bp.route('/activities', methods=['GET'])
@jwt_required()
@check_permission('view_crm_activities')
@log_audit('GET_ACTIVITIES')
def get_activities():
    """الحصول على قائمة الأنشطة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        activity_type = request.args.get('activity_type', '')
        priority = request.args.get('priority', '')
        is_completed = request.args.get('is_completed', '')
        assigned_to = request.args.get('assigned_to', '')
        customer_id = request.args.get('customer_id', '')
        opportunity_id = request.args.get('opportunity_id', '')
        
        # بناء الاستعلام
        query = Activity.query.options(
            joinedload(Activity.customer),
            joinedload(Activity.opportunity),
            joinedload(Activity.assigned_to)
        )
        
        # البحث
        if search:
            query = query.filter(
                or_(
                    Activity.subject.contains(search),
                    Activity.description.contains(search)
                )
            )
        
        # فلترة حسب النوع
        if activity_type:
            query = query.filter(Activity.activity_type == activity_type)
        
        # فلترة حسب الأولوية
        if priority:
            query = query.filter(Activity.priority == priority)
        
        # فلترة حسب الحالة
        if is_completed:
            query = query.filter(Activity.is_completed == (is_completed.lower() == 'true'))
        
        # فلترة حسب المسؤول
        if assigned_to:
            query = query.filter(Activity.assigned_to_id == assigned_to)
        
        # فلترة حسب العميل
        if customer_id:
            query = query.filter(Activity.customer_id == customer_id)
        
        # فلترة حسب الفرصة
        if opportunity_id:
            query = query.filter(Activity.opportunity_id == opportunity_id)
        
        # ترتيب وترقيم الصفحات
        query = query.order_by(desc(Activity.created_at))
        activities = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # تحضير البيانات
        activities_data = []
        for activity in activities.items:
            activity_data = {
                'id': activity.id,
                'subject': activity.subject,
                'description': activity.description,
                'activity_type': activity.activity_type.value if activity.activity_type else None,
                'priority': activity.priority.value if activity.priority else None,
                'scheduled_date': activity.scheduled_date.isoformat() if activity.scheduled_date else None,
                'due_date': activity.due_date.isoformat() if activity.due_date else None,
                'is_completed': activity.is_completed,
                'completed_date': activity.completed_date.isoformat() if activity.completed_date else None,
                'customer': {
                    'id': activity.customer.id,
                    'name': activity.customer.display_name
                } if activity.customer else None,
                'opportunity': {
                    'id': activity.opportunity.id,
                    'name': activity.opportunity.name
                } if activity.opportunity else None,
                'assigned_to': activity.assigned_to.username if activity.assigned_to else None,
                'created_at': activity.created_at.isoformat() if activity.created_at else None,
                'updated_at': activity.updated_at.isoformat() if activity.updated_at else None
            }
            activities_data.append(activity_data)
        
        return jsonify({
            'success': True,
            'activities': activities_data,
            'pagination': {
                'page': activities.page,
                'pages': activities.pages,
                'per_page': activities.per_page,
                'total': activities.total,
                'has_next': activities.has_next,
                'has_prev': activities.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@activities_bp.route('/activities', methods=['POST'])
@jwt_required()
@check_permission('manage_crm_activities')
@guard_payload_size()
@log_audit('CREATE_ACTIVITY')
def create_activity():
    """إنشاء نشاط جديد"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # التحقق من البيانات المطلوبة
        if not data.get('subject') or not data.get('activity_type'):
            return jsonify({'success': False, 'message': 'موضوع النشاط ونوعه مطلوبان'}), 400
        
        # إنشاء النشاط
        activity = Activity(
            subject=data['subject'],
            description=data.get('description'),
            activity_type=ActivityType(data['activity_type']),
            priority=ActivityPriority(data.get('priority', 'medium')),
            scheduled_date=datetime.fromisoformat(data['scheduled_date'].replace('Z', '+00:00')) if data.get('scheduled_date') else None,
            due_date=datetime.fromisoformat(data['due_date'].replace('Z', '+00:00')) if data.get('due_date') else None,
            customer_id=data.get('customer_id'),
            opportunity_id=data.get('opportunity_id'),
            lead_id=data.get('lead_id'),
            assigned_to_id=data.get('assigned_to_id', current_user_id),
            created_by_id=current_user_id,
            updated_by_id=current_user_id
        )
        
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء النشاط بنجاح',
            'activity_id': activity.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@activities_bp.route('/activities/<int:activity_id>', methods=['GET'])
@jwt_required()
@check_permission('view_crm_activities')
@log_audit('GET_ACTIVITY')
def get_activity(activity_id):
    """الحصول على تفاصيل نشاط"""
    try:
        activity = Activity.query.options(
            joinedload(Activity.customer),
            joinedload(Activity.opportunity),
            joinedload(Activity.lead),
            joinedload(Activity.assigned_to)
        ).get_or_404(activity_id)
        
        activity_data = {
            'id': activity.id,
            'subject': activity.subject,
            'description': activity.description,
            'activity_type': activity.activity_type.value if activity.activity_type else None,
            'priority': activity.priority.value if activity.priority else None,
            'scheduled_date': activity.scheduled_date.isoformat() if activity.scheduled_date else None,
            'due_date': activity.due_date.isoformat() if activity.due_date else None,
            'is_completed': activity.is_completed,
            'completed_date': activity.completed_date.isoformat() if activity.completed_date else None,
            'customer': {
                'id': activity.customer.id,
                'name': activity.customer.display_name,
                'email': activity.customer.email,
                'phone': activity.customer.phone
            } if activity.customer else None,
            'opportunity': {
                'id': activity.opportunity.id,
                'name': activity.opportunity.name,
                'stage': activity.opportunity.stage.value if activity.opportunity.stage else None
            } if activity.opportunity else None,
            'lead': {
                'id': activity.lead.id,
                'name': activity.lead.full_name,
                'email': activity.lead.email,
                'phone': activity.lead.phone
            } if activity.lead else None,
            'assigned_to': activity.assigned_to.username if activity.assigned_to else None,
            'created_at': activity.created_at.isoformat() if activity.created_at else None,
            'updated_at': activity.updated_at.isoformat() if activity.updated_at else None
        }
        
        return jsonify({
            'success': True,
            'activity': activity_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@activities_bp.route('/activities/<int:activity_id>', methods=['PUT'])
@jwt_required()
@check_permission('manage_crm_activities')
@guard_payload_size()
@log_audit('UPDATE_ACTIVITY')
def update_activity(activity_id):
    """تحديث بيانات نشاط"""
    try:
        activity = Activity.query.get_or_404(activity_id)
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # تحديث البيانات
        if 'subject' in data:
            activity.subject = data['subject']
        if 'description' in data:
            activity.description = data['description']
        if 'activity_type' in data:
            activity.activity_type = ActivityType(data['activity_type'])
        if 'priority' in data:
            activity.priority = ActivityPriority(data['priority'])
        if 'scheduled_date' in data:
            activity.scheduled_date = datetime.fromisoformat(data['scheduled_date'].replace('Z', '+00:00')) if data['scheduled_date'] else None
        if 'due_date' in data:
            activity.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00')) if data['due_date'] else None
        if 'assigned_to_id' in data:
            activity.assigned_to_id = data['assigned_to_id']
        
        activity.updated_by_id = current_user_id
        activity.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث بيانات النشاط بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@activities_bp.route('/activities/<int:activity_id>/complete', methods=['PUT'])
@jwt_required()
@check_permission('manage_crm_activities')
@guard_payload_size()
@log_audit('COMPLETE_ACTIVITY')
def complete_activity(activity_id):
    """إكمال نشاط"""
    try:
        activity = Activity.query.get_or_404(activity_id)
        current_user_id = get_current_user_id()
        
        activity.is_completed = True
        activity.completed_date = datetime.utcnow()
        activity.updated_by_id = current_user_id
        activity.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إكمال النشاط بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Task Analytics APIs
@activities_bp.route('/activities/analytics', methods=['GET'])
@jwt_required()
@check_permission('view_crm_activities')
@log_audit('GET_ACTIVITIES_ANALYTICS')
def get_activities_analytics():
    """الحصول على تحليلات الأنشطة"""
    try:
        current_user_id = get_current_user_id()
        
        # إحصائيات عامة
        total_activities = Activity.query.count()
        completed_activities = Activity.query.filter(Activity.is_completed == True).count()
        pending_activities = Activity.query.filter(Activity.is_completed == False).count()
        
        # الأنشطة المتأخرة
        overdue_activities = Activity.query.filter(
            and_(
                Activity.due_date < datetime.utcnow(),
                Activity.is_completed == False
            )
        ).count()
        
        # الأنشطة المجدولة لهذا الأسبوع
        week_start = datetime.now() - timedelta(days=datetime.now().weekday())
        week_end = week_start + timedelta(days=6)
        
        this_week_activities = Activity.query.filter(
            and_(
                Activity.scheduled_date >= week_start,
                Activity.scheduled_date <= week_end
            )
        ).count()
        
        # الأنشطة حسب النوع
        activities_by_type = db.session.query(
            Activity.activity_type,
            func.count(Activity.id).label('count')
        ).group_by(Activity.activity_type).all()
        
        activities_by_type_data = [
            {
                'type': activity.activity_type.value if activity.activity_type else 'غير محدد',
                'count': activity.count
            }
            for activity in activities_by_type
        ]
        
        # الأنشطة حسب الأولوية
        activities_by_priority = db.session.query(
            Activity.priority,
            func.count(Activity.id).label('count')
        ).group_by(Activity.priority).all()
        
        activities_by_priority_data = [
            {
                'priority': activity.priority.value if activity.priority else 'غير محدد',
                'count': activity.count
            }
            for activity in activities_by_priority
        ]
        
        # معدل الإكمال
        completion_rate = (completed_activities / total_activities * 100) if total_activities > 0 else 0
        
        return jsonify({
            'success': True,
            'analytics': {
                'summary': {
                    'total_activities': total_activities,
                    'completed_activities': completed_activities,
                    'pending_activities': pending_activities,
                    'overdue_activities': overdue_activities,
                    'this_week_activities': this_week_activities,
                    'completion_rate': round(completion_rate, 2)
                },
                'activities_by_type': activities_by_type_data,
                'activities_by_priority': activities_by_priority_data
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@activities_bp.route('/activities/upcoming', methods=['GET'])
@jwt_required()
@check_permission('view_crm_activities')
@log_audit('GET_UPCOMING_ACTIVITIES')
def get_upcoming_activities():
    """الحصول على الأنشطة القادمة"""
    try:
        days = request.args.get('days', 7, type=int)
        current_user_id = get_current_user_id()
        
        end_date = datetime.now() + timedelta(days=days)
        
        activities = Activity.query.filter(
            and_(
                Activity.scheduled_date >= datetime.now(),
                Activity.scheduled_date <= end_date,
                Activity.is_completed == False,
                Activity.assigned_to_id == current_user_id
            )
        ).order_by(Activity.scheduled_date).all()
        
        activities_data = []
        for activity in activities:
            activity_data = {
                'id': activity.id,
                'subject': activity.subject,
                'activity_type': activity.activity_type.value if activity.activity_type else None,
                'priority': activity.priority.value if activity.priority else None,
                'scheduled_date': activity.scheduled_date.isoformat() if activity.scheduled_date else None,
                'due_date': activity.due_date.isoformat() if activity.due_date else None,
                'customer_name': activity.customer.display_name if activity.customer else None,
                'opportunity_name': activity.opportunity.name if activity.opportunity else None
            }
            activities_data.append(activity_data)
        
        return jsonify({
            'success': True,
            'activities': activities_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
