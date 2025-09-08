# -*- coding: utf-8 -*-
"""
نظام خدمة العملاء والدعم الفني - CRM Customer Support API
يوفر API endpoints شاملة لإدارة تذاكر الدعم وخدمة العملاء
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, desc, asc, func, extract
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

from models import (
    db, CRMCustomer, CRMLead, User,
    CRMSupportTicket, CRMSupportCategory, CRMSupportResponse, CRMSupportKnowledgeBase
)

support_bp = Blueprint('support', __name__, url_prefix='/api/crm/support')

def get_current_user_id():
    """الحصول على معرف المستخدم الحالي"""
    try:
        current_user = get_jwt_identity()
        if isinstance(current_user, dict):
            return current_user.get('user_id')
        return current_user
    except:
        return None

def generate_ticket_number():
    """توليد رقم فريد للتذكرة"""
    return f"TKT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

# ==================== إدارة تذاكر الدعم ====================

@support_bp.route('/tickets', methods=['GET'])
@jwt_required()
def get_support_tickets():
    """قائمة تذاكر الدعم مع الفلترة والترقيم"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        
        # فلاتر البحث
        search = request.args.get('search', '').strip()
        status = request.args.get('status', '').strip()
        priority = request.args.get('priority', '').strip()
        category_id = request.args.get('category_id', type=int)
        assigned_to = request.args.get('assigned_to', type=int)
        customer_id = request.args.get('customer_id', type=int)
        
        # بناء الاستعلام
        query = CRMSupportTicket.query
        
        # البحث النصي
        if search:
            search_filter = or_(
                CRMSupportTicket.subject.ilike(f'%{search}%'),
                CRMSupportTicket.description.ilike(f'%{search}%'),
                CRMSupportTicket.ticket_number.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        # فلاتر أخرى
        if status:
            query = query.filter(CRMSupportTicket.status == status)
        if priority:
            query = query.filter(CRMSupportTicket.priority == priority)
        if category_id:
            query = query.filter(CRMSupportTicket.category_id == category_id)
        if assigned_to:
            query = query.filter(CRMSupportTicket.assigned_to == assigned_to)
        if customer_id:
            query = query.filter(CRMSupportTicket.customer_id == customer_id)
        
        # الترتيب
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        if hasattr(CRMSupportTicket, sort_by):
            if sort_order == 'asc':
                query = query.order_by(asc(getattr(CRMSupportTicket, sort_by)))
            else:
                query = query.order_by(desc(getattr(CRMSupportTicket, sort_by)))
        
        # تحميل البيانات المرتبطة
        query = query.options(
            joinedload(CRMSupportTicket.customer),
            joinedload(CRMSupportTicket.category),
            joinedload(CRMSupportTicket.assigned_user),
            joinedload(CRMSupportTicket.created_by_user),
            joinedload(CRMSupportTicket.responses)
        )
        
        # الترقيم
        tickets = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'tickets': [{
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'subject': ticket.subject,
                'description': ticket.description,
                'status': ticket.status,
                'priority': ticket.priority,
                'customer': {
                    'id': ticket.customer.id,
                    'name': ticket.customer.name,
                    'email': ticket.customer.email
                } if ticket.customer else None,
                'category': {
                    'id': ticket.category.id,
                    'name': ticket.category.name
                } if ticket.category else None,
                'assigned_to': {
                    'id': ticket.assigned_user.id,
                    'username': ticket.assigned_user.username
                } if ticket.assigned_user else None,
                'created_by': ticket.created_by_user.username if ticket.created_by_user else None,
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None,
                'due_date': ticket.due_date.isoformat() if ticket.due_date else None,
                'resolved_at': ticket.resolved_at.isoformat() if ticket.resolved_at else None,
                'responses_count': len(ticket.responses),
                'tags': ticket.tags
            } for ticket in tickets.items],
            'pagination': {
                'page': tickets.page,
                'pages': tickets.pages,
                'per_page': tickets.per_page,
                'total': tickets.total,
                'has_next': tickets.has_next,
                'has_prev': tickets.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب تذاكر الدعم: {str(e)}'
        }), 500

@support_bp.route('/tickets', methods=['POST'])
@jwt_required()
def create_support_ticket():
    """إنشاء تذكرة دعم جديدة"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['subject', 'description', 'customer_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'الحقل {field} مطلوب'
                }), 400
        
        # حساب تاريخ الاستحقاق بناءً على الأولوية
        priority = data.get('priority', 'medium')
        due_hours = {'high': 4, 'medium': 24, 'low': 72}
        due_date = datetime.utcnow() + timedelta(hours=due_hours.get(priority, 24))
        
        # إنشاء التذكرة
        ticket = CRMSupportTicket(
            ticket_number=generate_ticket_number(),
            subject=data['subject'],
            description=data['description'],
            status=data.get('status', 'open'),
            priority=priority,
            customer_id=data['customer_id'],
            category_id=data.get('category_id'),
            assigned_to=data.get('assigned_to'),
            due_date=due_date,
            tags=data.get('tags', []),
            created_by=current_user_id
        )
        
        db.session.add(ticket)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء تذكرة الدعم بنجاح',
            'ticket': {
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'subject': ticket.subject,
                'status': ticket.status,
                'priority': ticket.priority
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء تذكرة الدعم: {str(e)}'
        }), 500

@support_bp.route('/tickets/<int:ticket_id>', methods=['GET'])
@jwt_required()
def get_support_ticket(ticket_id):
    """الحصول على تفاصيل تذكرة دعم محددة"""
    try:
        ticket = CRMSupportTicket.query.options(
            joinedload(CRMSupportTicket.customer),
            joinedload(CRMSupportTicket.category),
            joinedload(CRMSupportTicket.assigned_user),
            joinedload(CRMSupportTicket.created_by_user),
            joinedload(CRMSupportTicket.responses).joinedload(CRMSupportResponse.created_by_user)
        ).get_or_404(ticket_id)
        
        return jsonify({
            'success': True,
            'ticket': {
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'subject': ticket.subject,
                'description': ticket.description,
                'status': ticket.status,
                'priority': ticket.priority,
                'customer': {
                    'id': ticket.customer.id,
                    'name': ticket.customer.name,
                    'email': ticket.customer.email,
                    'phone': ticket.customer.phone
                } if ticket.customer else None,
                'category': {
                    'id': ticket.category.id,
                    'name': ticket.category.name,
                    'description': ticket.category.description
                } if ticket.category else None,
                'assigned_to': {
                    'id': ticket.assigned_user.id,
                    'username': ticket.assigned_user.username
                } if ticket.assigned_user else None,
                'created_by': ticket.created_by_user.username if ticket.created_by_user else None,
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None,
                'due_date': ticket.due_date.isoformat() if ticket.due_date else None,
                'resolved_at': ticket.resolved_at.isoformat() if ticket.resolved_at else None,
                'resolution': ticket.resolution,
                'tags': ticket.tags,
                'responses': [{
                    'id': response.id,
                    'message': response.message,
                    'response_type': response.response_type,
                    'is_internal': response.is_internal,
                    'created_by': response.created_by_user.username if response.created_by_user else None,
                    'created_at': response.created_at.isoformat(),
                    'attachments': response.attachments
                } for response in sorted(ticket.responses, key=lambda x: x.created_at)]
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب تفاصيل التذكرة: {str(e)}'
        }), 500

@support_bp.route('/tickets/<int:ticket_id>', methods=['PUT'])
@jwt_required()
def update_support_ticket(ticket_id):
    """تحديث تذكرة دعم"""
    try:
        ticket = CRMSupportTicket.query.get_or_404(ticket_id)
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # تحديث البيانات
        if 'subject' in data:
            ticket.subject = data['subject']
        if 'description' in data:
            ticket.description = data['description']
        if 'status' in data:
            old_status = ticket.status
            ticket.status = data['status']
            # إذا تم حل التذكرة، تسجيل وقت الحل
            if data['status'] == 'resolved' and old_status != 'resolved':
                ticket.resolved_at = datetime.utcnow()
        if 'priority' in data:
            ticket.priority = data['priority']
        if 'category_id' in data:
            ticket.category_id = data['category_id']
        if 'assigned_to' in data:
            ticket.assigned_to = data['assigned_to']
        if 'due_date' in data:
            ticket.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00')) if data['due_date'] else None
        if 'resolution' in data:
            ticket.resolution = data['resolution']
        if 'tags' in data:
            ticket.tags = data['tags']
        
        ticket.updated_at = datetime.utcnow()
        ticket.updated_by = current_user_id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث التذكرة بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في تحديث التذكرة: {str(e)}'
        }), 500

# ==================== إدارة ردود الدعم ====================

@support_bp.route('/tickets/<int:ticket_id>/responses', methods=['GET'])
@jwt_required()
def get_ticket_responses(ticket_id):
    """قائمة ردود تذكرة الدعم"""
    try:
        responses = CRMSupportResponse.query.filter_by(ticket_id=ticket_id).options(
            joinedload(CRMSupportResponse.created_by_user)
        ).order_by(CRMSupportResponse.created_at).all()
        
        return jsonify({
            'success': True,
            'responses': [{
                'id': response.id,
                'message': response.message,
                'response_type': response.response_type,
                'is_internal': response.is_internal,
                'created_by': response.created_by_user.username if response.created_by_user else None,
                'created_at': response.created_at.isoformat(),
                'attachments': response.attachments
            } for response in responses]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب ردود التذكرة: {str(e)}'
        }), 500

@support_bp.route('/tickets/<int:ticket_id>/responses', methods=['POST'])
@jwt_required()
def add_ticket_response(ticket_id):
    """إضافة رد على تذكرة الدعم"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        if not data.get('message'):
            return jsonify({
                'success': False,
                'message': 'نص الرد مطلوب'
            }), 400
        
        # التحقق من وجود التذكرة
        ticket = CRMSupportTicket.query.get_or_404(ticket_id)
        
        response = CRMSupportResponse(
            ticket_id=ticket_id,
            message=data['message'],
            response_type=data.get('response_type', 'reply'),
            is_internal=data.get('is_internal', False),
            attachments=data.get('attachments', []),
            created_by=current_user_id
        )
        
        db.session.add(response)
        
        # تحديث وقت آخر تحديث للتذكرة
        ticket.updated_at = datetime.utcnow()
        ticket.updated_by = current_user_id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة الرد بنجاح',
            'response_id': response.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إضافة الرد: {str(e)}'
        }), 500

# ==================== إدارة فئات الدعم ====================

@support_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_support_categories():
    """قائمة فئات الدعم"""
    try:
        categories = CRMSupportCategory.query.filter_by(is_active=True).order_by(
            CRMSupportCategory.name
        ).all()
        
        return jsonify({
            'success': True,
            'categories': [{
                'id': category.id,
                'name': category.name,
                'description': category.description,
                'color': category.color,
                'icon': category.icon,
                'sla_hours': category.sla_hours,
                'is_active': category.is_active
            } for category in categories]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب فئات الدعم: {str(e)}'
        }), 500

@support_bp.route('/categories', methods=['POST'])
@jwt_required()
def create_support_category():
    """إنشاء فئة دعم جديدة"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        if not data.get('name'):
            return jsonify({
                'success': False,
                'message': 'اسم الفئة مطلوب'
            }), 400
        
        category = CRMSupportCategory(
            name=data['name'],
            description=data.get('description', ''),
            color=data.get('color', '#007bff'),
            icon=data.get('icon', 'fas fa-question-circle'),
            sla_hours=data.get('sla_hours', 24),
            is_active=data.get('is_active', True),
            created_by=current_user_id
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء فئة الدعم بنجاح',
            'category_id': category.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء فئة الدعم: {str(e)}'
        }), 500

# ==================== قاعدة المعرفة ====================

@support_bp.route('/knowledge-base', methods=['GET'])
@jwt_required()
def get_knowledge_base():
    """قائمة مقالات قاعدة المعرفة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        search = request.args.get('search', '').strip()
        category_id = request.args.get('category_id', type=int)
        
        query = CRMSupportKnowledgeBase.query.filter_by(is_published=True)
        
        if search:
            search_filter = or_(
                CRMSupportKnowledgeBase.title.ilike(f'%{search}%'),
                CRMSupportKnowledgeBase.content.ilike(f'%{search}%'),
                CRMSupportKnowledgeBase.tags.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        if category_id:
            query = query.filter(CRMSupportKnowledgeBase.category_id == category_id)
        
        query = query.options(
            joinedload(CRMSupportKnowledgeBase.category),
            joinedload(CRMSupportKnowledgeBase.created_by_user)
        ).order_by(desc(CRMSupportKnowledgeBase.view_count))
        
        articles = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'articles': [{
                'id': article.id,
                'title': article.title,
                'content': article.content,
                'category': {
                    'id': article.category.id,
                    'name': article.category.name
                } if article.category else None,
                'tags': article.tags,
                'view_count': article.view_count,
                'helpful_count': article.helpful_count,
                'created_by': article.created_by_user.username if article.created_by_user else None,
                'created_at': article.created_at.isoformat(),
                'updated_at': article.updated_at.isoformat() if article.updated_at else None
            } for article in articles.items],
            'pagination': {
                'page': articles.page,
                'pages': articles.pages,
                'per_page': articles.per_page,
                'total': articles.total
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب قاعدة المعرفة: {str(e)}'
        }), 500

# ==================== تحليلات الدعم ====================

@support_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_support_analytics():
    """تحليلات شاملة لنظام الدعم"""
    try:
        # إحصائيات عامة
        total_tickets = CRMSupportTicket.query.count()
        open_tickets = CRMSupportTicket.query.filter_by(status='open').count()
        resolved_tickets = CRMSupportTicket.query.filter_by(status='resolved').count()
        overdue_tickets = CRMSupportTicket.query.filter(
            and_(
                CRMSupportTicket.due_date < datetime.utcnow(),
                CRMSupportTicket.status.in_(['open', 'in_progress'])
            )
        ).count()
        
        # التذاكر حسب الأولوية
        tickets_by_priority = db.session.query(
            CRMSupportTicket.priority,
            func.count(CRMSupportTicket.id).label('count')
        ).group_by(CRMSupportTicket.priority).all()
        
        # التذاكر حسب الفئة
        tickets_by_category = db.session.query(
            CRMSupportCategory.name,
            func.count(CRMSupportTicket.id).label('count')
        ).join(CRMSupportTicket).group_by(CRMSupportCategory.name).all()
        
        # متوسط وقت الحل
        resolved_tickets_with_time = db.session.query(
            func.avg(
                func.extract('epoch', CRMSupportTicket.resolved_at - CRMSupportTicket.created_at) / 3600
            ).label('avg_resolution_hours')
        ).filter(CRMSupportTicket.status == 'resolved').first()
        
        # التذاكر الشهرية
        monthly_tickets = db.session.query(
            extract('year', CRMSupportTicket.created_at).label('year'),
            extract('month', CRMSupportTicket.created_at).label('month'),
            func.count(CRMSupportTicket.id).label('count')
        ).group_by('year', 'month').order_by('year', 'month').limit(12).all()
        
        # أداء فريق الدعم
        agent_performance = db.session.query(
            User.username,
            func.count(CRMSupportTicket.id).label('assigned_tickets'),
            func.count(
                func.case([(CRMSupportTicket.status == 'resolved', 1)])
            ).label('resolved_tickets')
        ).join(CRMSupportTicket, User.id == CRMSupportTicket.assigned_to).group_by(
            User.username
        ).all()
        
        return jsonify({
            'success': True,
            'analytics': {
                'overview': {
                    'total_tickets': total_tickets,
                    'open_tickets': open_tickets,
                    'resolved_tickets': resolved_tickets,
                    'in_progress_tickets': total_tickets - open_tickets - resolved_tickets,
                    'overdue_tickets': overdue_tickets,
                    'resolution_rate': round((resolved_tickets / total_tickets * 100) if total_tickets > 0 else 0, 2),
                    'avg_resolution_hours': round(float(resolved_tickets_with_time.avg_resolution_hours) if resolved_tickets_with_time.avg_resolution_hours else 0, 2)
                },
                'tickets_by_priority': [
                    {'priority': item.priority, 'count': item.count}
                    for item in tickets_by_priority
                ],
                'tickets_by_category': [
                    {'category': item.name, 'count': item.count}
                    for item in tickets_by_category
                ],
                'monthly_trends': [
                    {
                        'year': int(item.year),
                        'month': int(item.month),
                        'count': item.count
                    }
                    for item in monthly_tickets
                ],
                'agent_performance': [
                    {
                        'agent': item.username,
                        'assigned_tickets': item.assigned_tickets,
                        'resolved_tickets': item.resolved_tickets,
                        'resolution_rate': round((item.resolved_tickets / item.assigned_tickets * 100) if item.assigned_tickets > 0 else 0, 2)
                    }
                    for item in agent_performance
                ]
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب تحليلات الدعم: {str(e)}'
        }), 500

@support_bp.route('/tickets/<int:ticket_id>/escalate', methods=['POST'])
@jwt_required()
def escalate_ticket(ticket_id):
    """تصعيد تذكرة الدعم"""
    try:
        ticket = CRMSupportTicket.query.get_or_404(ticket_id)
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # تغيير الأولوية إلى عالية
        ticket.priority = 'high'
        ticket.assigned_to = data.get('escalate_to')
        ticket.updated_at = datetime.utcnow()
        ticket.updated_by = current_user_id
        
        # إضافة رد داخلي للتصعيد
        escalation_response = CRMSupportResponse(
            ticket_id=ticket_id,
            message=f"تم تصعيد التذكرة. السبب: {data.get('reason', 'غير محدد')}",
            response_type='escalation',
            is_internal=True,
            created_by=current_user_id
        )
        
        db.session.add(escalation_response)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تصعيد التذكرة بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في تصعيد التذكرة: {str(e)}'
        }), 500
