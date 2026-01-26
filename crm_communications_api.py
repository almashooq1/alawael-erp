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
API Endpoints لإدارة التواصل والمتابعة مع العملاء - نظام CRM
Communications and Follow-up Management API Endpoints - CRM System
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import and_, or_, desc, func
from sqlalchemy.orm import joinedload

from app import db
from crm_models import *

# إنشاء Blueprint للتواصل
communications_bp = Blueprint('communications', __name__, url_prefix='/api/crm')

def get_current_user_id():
    """الحصول على معرف المستخدم الحالي"""
    return get_jwt_identity()

# Communication Management APIs
@communications_bp.route('/communications', methods=['GET'])
@jwt_required()
@check_permission('view_crm_communications')
@log_audit('GET_COMMUNICATIONS')
def get_communications():
    """الحصول على قائمة الاتصالات"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        communication_type = request.args.get('communication_type', '')
        direction = request.args.get('direction', '')
        customer_id = request.args.get('customer_id', '')
        lead_id = request.args.get('lead_id', '')
        
        # بناء الاستعلام
        query = Communication.query.options(
            joinedload(Communication.customer),
            joinedload(Communication.lead),
            joinedload(Communication.created_by)
        )
        
        # البحث
        if search:
            query = query.filter(
                or_(
                    Communication.subject.contains(search),
                    Communication.content.contains(search),
                    Communication.notes.contains(search)
                )
            )
        
        # فلترة حسب النوع
        if communication_type:
            query = query.filter(Communication.communication_type == communication_type)
        
        # فلترة حسب الاتجاه
        if direction:
            query = query.filter(Communication.direction == direction)
        
        # فلترة حسب العميل
        if customer_id:
            query = query.filter(Communication.customer_id == customer_id)
        
        # فلترة حسب العميل المحتمل
        if lead_id:
            query = query.filter(Communication.lead_id == lead_id)
        
        # ترتيب وترقيم الصفحات
        query = query.order_by(desc(Communication.communication_date))
        communications = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # تحضير البيانات
        communications_data = []
        for comm in communications.items:
            comm_data = {
                'id': comm.id,
                'communication_type': comm.communication_type.value if comm.communication_type else None,
                'direction': comm.direction.value if comm.direction else None,
                'subject': comm.subject,
                'content': comm.content,
                'communication_date': comm.communication_date.isoformat() if comm.communication_date else None,
                'duration_minutes': comm.duration_minutes,
                'customer': {
                    'id': comm.customer.id,
                    'name': comm.customer.display_name
                } if comm.customer else None,
                'lead': {
                    'id': comm.lead.id,
                    'name': comm.lead.full_name
                } if comm.lead else None,
                'created_by': comm.created_by.username if comm.created_by else None,
                'created_at': comm.created_at.isoformat() if comm.created_at else None
            }
            communications_data.append(comm_data)
        
        return jsonify({
            'success': True,
            'communications': communications_data,
            'pagination': {
                'page': communications.page,
                'pages': communications.pages,
                'per_page': communications.per_page,
                'total': communications.total,
                'has_next': communications.has_next,
                'has_prev': communications.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@communications_bp.route('/communications', methods=['POST'])
@jwt_required()
@check_permission('manage_crm_communications')
@guard_payload_size()
@log_audit('CREATE_COMMUNICATION')
def create_communication():
    """إنشاء سجل اتصال جديد"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # التحقق من البيانات المطلوبة
        if not data.get('communication_type') or not data.get('subject'):
            return jsonify({'success': False, 'message': 'نوع الاتصال والموضوع مطلوبان'}), 400
        
        # التحقق من وجود عميل أو عميل محتمل
        if not data.get('customer_id') and not data.get('lead_id'):
            return jsonify({'success': False, 'message': 'يجب تحديد عميل أو عميل محتمل'}), 400
        
        # إنشاء سجل الاتصال
        communication = Communication(
            communication_type=CommunicationType(data['communication_type']),
            direction=CommunicationDirection(data.get('direction', 'outbound')),
            subject=data['subject'],
            content=data.get('content'),
            communication_date=datetime.fromisoformat(data['communication_date'].replace('Z', '+00:00')) if data.get('communication_date') else datetime.utcnow(),
            duration_minutes=data.get('duration_minutes'),
            customer_id=data.get('customer_id'),
            lead_id=data.get('lead_id'),
            notes=data.get('notes'),
            created_by_id=current_user_id,
            updated_by_id=current_user_id
        )
        
        db.session.add(communication)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء سجل الاتصال بنجاح',
            'communication_id': communication.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@communications_bp.route('/communications/<int:communication_id>', methods=['GET'])
@jwt_required()
@check_permission('view_crm_communications')
@log_audit('GET_COMMUNICATION')
def get_communication(communication_id):
    """الحصول على تفاصيل اتصال"""
    try:
        communication = Communication.query.options(
            joinedload(Communication.customer),
            joinedload(Communication.lead),
            joinedload(Communication.created_by)
        ).get_or_404(communication_id)
        
        comm_data = {
            'id': communication.id,
            'communication_type': communication.communication_type.value if communication.communication_type else None,
            'direction': communication.direction.value if communication.direction else None,
            'subject': communication.subject,
            'content': communication.content,
            'communication_date': communication.communication_date.isoformat() if communication.communication_date else None,
            'duration_minutes': communication.duration_minutes,
            'customer': {
                'id': communication.customer.id,
                'name': communication.customer.display_name,
                'email': communication.customer.email,
                'phone': communication.customer.phone
            } if communication.customer else None,
            'lead': {
                'id': communication.lead.id,
                'name': communication.lead.full_name,
                'email': communication.lead.email,
                'phone': communication.lead.phone
            } if communication.lead else None,
            'notes': communication.notes,
            'created_by': communication.created_by.username if communication.created_by else None,
            'created_at': communication.created_at.isoformat() if communication.created_at else None,
            'updated_at': communication.updated_at.isoformat() if communication.updated_at else None
        }
        
        return jsonify({
            'success': True,
            'communication': comm_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@communications_bp.route('/communications/<int:communication_id>', methods=['PUT'])
@jwt_required()
@check_permission('manage_crm_communications')
@guard_payload_size()
@log_audit('UPDATE_COMMUNICATION')
def update_communication(communication_id):
    """تحديث بيانات اتصال"""
    try:
        communication = Communication.query.get_or_404(communication_id)
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # تحديث البيانات
        if 'communication_type' in data:
            communication.communication_type = CommunicationType(data['communication_type'])
        if 'direction' in data:
            communication.direction = CommunicationDirection(data['direction'])
        if 'subject' in data:
            communication.subject = data['subject']
        if 'content' in data:
            communication.content = data['content']
        if 'communication_date' in data:
            communication.communication_date = datetime.fromisoformat(data['communication_date'].replace('Z', '+00:00')) if data['communication_date'] else None
        if 'duration_minutes' in data:
            communication.duration_minutes = data['duration_minutes']
        if 'notes' in data:
            communication.notes = data['notes']
        
        communication.updated_by_id = current_user_id
        communication.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث بيانات الاتصال بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Customer Communication History
@communications_bp.route('/customers/<int:customer_id>/communications', methods=['GET'])
@jwt_required()
@check_permission('view_crm_communications')
@log_audit('GET_CUSTOMER_COMMUNICATIONS')
def get_customer_communications(customer_id):
    """الحصول على تاريخ اتصالات عميل"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        
        communications = Communication.query.filter(
            Communication.customer_id == customer_id
        ).order_by(desc(Communication.communication_date)).all()
        
        communications_data = []
        for comm in communications:
            comm_data = {
                'id': comm.id,
                'communication_type': comm.communication_type.value if comm.communication_type else None,
                'direction': comm.direction.value if comm.direction else None,
                'subject': comm.subject,
                'content': comm.content,
                'communication_date': comm.communication_date.isoformat() if comm.communication_date else None,
                'duration_minutes': comm.duration_minutes,
                'created_by': comm.created_by.username if comm.created_by else None,
                'created_at': comm.created_at.isoformat() if comm.created_at else None
            }
            communications_data.append(comm_data)
        
        return jsonify({
            'success': True,
            'customer': {
                'id': customer.id,
                'name': customer.display_name,
                'email': customer.email,
                'phone': customer.phone
            },
            'communications': communications_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Lead Communication History
@communications_bp.route('/leads/<int:lead_id>/communications', methods=['GET'])
@jwt_required()
@check_permission('view_crm_communications')
@log_audit('GET_LEAD_COMMUNICATIONS')
def get_lead_communications(lead_id):
    """الحصول على تاريخ اتصالات عميل محتمل"""
    try:
        lead = Lead.query.get_or_404(lead_id)
        
        communications = Communication.query.filter(
            Communication.lead_id == lead_id
        ).order_by(desc(Communication.communication_date)).all()
        
        communications_data = []
        for comm in communications:
            comm_data = {
                'id': comm.id,
                'communication_type': comm.communication_type.value if comm.communication_type else None,
                'direction': comm.direction.value if comm.direction else None,
                'subject': comm.subject,
                'content': comm.content,
                'communication_date': comm.communication_date.isoformat() if comm.communication_date else None,
                'duration_minutes': comm.duration_minutes,
                'created_by': comm.created_by.username if comm.created_by else None,
                'created_at': comm.created_at.isoformat() if comm.created_at else None
            }
            communications_data.append(comm_data)
        
        return jsonify({
            'success': True,
            'lead': {
                'id': lead.id,
                'name': lead.full_name,
                'email': lead.email,
                'phone': lead.phone
            },
            'communications': communications_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Communication Analytics
@communications_bp.route('/communications/analytics', methods=['GET'])
@jwt_required()
@check_permission('view_crm_communications')
@log_audit('GET_COMMUNICATIONS_ANALYTICS')
def get_communications_analytics():
    """الحصول على تحليلات الاتصالات"""
    try:
        # إحصائيات عامة
        total_communications = Communication.query.count()
        
        # الاتصالات حسب النوع
        communications_by_type = db.session.query(
            Communication.communication_type,
            func.count(Communication.id).label('count')
        ).group_by(Communication.communication_type).all()
        
        communications_by_type_data = [
            {
                'type': comm.communication_type.value if comm.communication_type else 'غير محدد',
                'count': comm.count
            }
            for comm in communications_by_type
        ]
        
        # الاتصالات حسب الاتجاه
        communications_by_direction = db.session.query(
            Communication.direction,
            func.count(Communication.id).label('count')
        ).group_by(Communication.direction).all()
        
        communications_by_direction_data = [
            {
                'direction': comm.direction.value if comm.direction else 'غير محدد',
                'count': comm.count
            }
            for comm in communications_by_direction
        ]
        
        # الاتصالات الشهرية (آخر 6 أشهر)
        monthly_stats = []
        for i in range(6):
            month_start = (datetime.now() - timedelta(days=30*i)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            month_communications = Communication.query.filter(
                and_(
                    Communication.communication_date >= month_start,
                    Communication.communication_date <= month_end
                )
            ).count()
            
            monthly_stats.append({
                'month': month_start.strftime('%Y-%m'),
                'communications': month_communications
            })
        
        # متوسط مدة المكالمات
        avg_call_duration = db.session.query(
            func.avg(Communication.duration_minutes)
        ).filter(
            Communication.communication_type == CommunicationType.PHONE_CALL
        ).scalar() or 0
        
        return jsonify({
            'success': True,
            'analytics': {
                'summary': {
                    'total_communications': total_communications,
                    'avg_call_duration_minutes': round(avg_call_duration, 2)
                },
                'communications_by_type': communications_by_type_data,
                'communications_by_direction': communications_by_direction_data,
                'monthly_stats': monthly_stats
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Follow-up Management
@communications_bp.route('/follow-ups', methods=['GET'])
@jwt_required()
@check_permission('view_crm_communications')
@log_audit('GET_FOLLOW_UPS')
def get_follow_ups():
    """الحصول على المتابعات المطلوبة"""
    try:
        current_user_id = get_current_user_id()
        
        # العملاء الذين لم يتم التواصل معهم مؤخراً
        days_threshold = request.args.get('days', 30, type=int)
        threshold_date = datetime.now() - timedelta(days=days_threshold)
        
        # العملاء النشطين
        active_customers = Customer.query.filter(Customer.is_active == True).all()
        
        follow_ups_needed = []
        for customer in active_customers:
            # آخر اتصال مع العميل
            last_communication = Communication.query.filter(
                Communication.customer_id == customer.id
            ).order_by(desc(Communication.communication_date)).first()
            
            # إذا لم يكن هناك اتصال أو كان قديماً
            if not last_communication or last_communication.communication_date < threshold_date:
                follow_up_data = {
                    'customer': {
                        'id': customer.id,
                        'name': customer.display_name,
                        'email': customer.email,
                        'phone': customer.phone,
                        'assigned_to': customer.assigned_to.username if customer.assigned_to else None
                    },
                    'last_communication': {
                        'date': last_communication.communication_date.isoformat() if last_communication else None,
                        'type': last_communication.communication_type.value if last_communication and last_communication.communication_type else None,
                        'subject': last_communication.subject if last_communication else None
                    } if last_communication else None,
                    'days_since_last_contact': (datetime.now() - last_communication.communication_date).days if last_communication else None
                }
                follow_ups_needed.append(follow_up_data)
        
        return jsonify({
            'success': True,
            'follow_ups_needed': follow_ups_needed,
            'total_count': len(follow_ups_needed)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@communications_bp.route('/follow-ups/schedule', methods=['POST'])
@jwt_required()
@check_permission('manage_crm_communications')
@guard_payload_size()
@log_audit('SCHEDULE_FOLLOW_UP')
def schedule_follow_up():
    """جدولة متابعة"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # التحقق من البيانات المطلوبة
        if not data.get('customer_id') or not data.get('follow_up_date'):
            return jsonify({'success': False, 'message': 'معرف العميل وتاريخ المتابعة مطلوبان'}), 400
        
        # إنشاء نشاط متابعة
        follow_up_activity = Activity(
            subject=data.get('subject', 'متابعة مع العميل'),
            description=data.get('description', 'متابعة دورية مع العميل'),
            activity_type=ActivityType.FOLLOW_UP,
            priority=ActivityPriority(data.get('priority', 'medium')),
            scheduled_date=datetime.fromisoformat(data['follow_up_date'].replace('Z', '+00:00')),
            due_date=datetime.fromisoformat(data['follow_up_date'].replace('Z', '+00:00')),
            customer_id=data['customer_id'],
            assigned_to_id=data.get('assigned_to_id', current_user_id),
            created_by_id=current_user_id,
            updated_by_id=current_user_id
        )
        
        db.session.add(follow_up_activity)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم جدولة المتابعة بنجاح',
            'activity_id': follow_up_activity.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
