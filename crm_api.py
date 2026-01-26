#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API Endpoints لنظام إدارة علاقات العملاء (CRM)
Customer Relationship Management (CRM) API Endpoints
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy import and_, or_, desc, asc, func
from sqlalchemy.orm import joinedload
import uuid

from app import db
from crm_models import *
from auth_rbac_decorator import (
    check_permission,
    guard_payload_size,
    validate_json,
    log_audit
)

# إنشاء Blueprint للـ CRM
crm_bp = Blueprint('crm', __name__, url_prefix='/api/crm')

# Helper Functions
def generate_code(prefix, model_class, field_name):
    """توليد رمز فريد"""
    today = datetime.now()
    year = today.year
    
    # البحث عن آخر رقم في السنة الحالية
    last_record = model_class.query.filter(
        getattr(model_class, field_name).like(f'{prefix}-{year}-%')
    ).order_by(desc(getattr(model_class, field_name))).first()
    
    if last_record:
        last_code = getattr(last_record, field_name)
        last_number = int(last_code.split('-')[-1])
        new_number = last_number + 1
    else:
        new_number = 1
    
    return f'{prefix}-{year}-{new_number:04d}'

def get_current_user_id():
    """الحصول على معرف المستخدم الحالي"""
    return get_jwt_identity()

# Customer Management APIs
@crm_bp.route('/customers', methods=['GET'])
@jwt_required()
@check_permission('view_crm_customers')
@log_audit('LIST_CRM_CUSTOMERS')
def get_customers():
    """الحصول على قائمة العملاء"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        customer_type = request.args.get('customer_type', '')
        assigned_to = request.args.get('assigned_to', '')
        is_active = request.args.get('is_active', '')
        
        # بناء الاستعلام
        query = Customer.query
        
        # البحث
        if search:
            query = query.filter(
                or_(
                    Customer.first_name.contains(search),
                    Customer.last_name.contains(search),
                    Customer.company_name.contains(search),
                    Customer.email.contains(search),
                    Customer.customer_code.contains(search)
                )
            )
        
        # فلترة حسب النوع
        if customer_type:
            query = query.filter(Customer.customer_type == customer_type)
        
        # فلترة حسب المسؤول
        if assigned_to:
            query = query.filter(Customer.assigned_to_id == assigned_to)
        
        # فلترة حسب الحالة
        if is_active:
            query = query.filter(Customer.is_active == (is_active.lower() == 'true'))
        
        # ترتيب وترقيم الصفحات
        query = query.order_by(desc(Customer.created_at))
        customers = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # تحضير البيانات
        customers_data = []
        for customer in customers.items:
            customer_data = {
                'id': customer.id,
                'customer_code': customer.customer_code,
                'customer_type': customer.customer_type.value if customer.customer_type else None,
                'full_name': customer.full_name,
                'display_name': customer.display_name,
                'first_name': customer.first_name,
                'last_name': customer.last_name,
                'company_name': customer.company_name,
                'title': customer.title,
                'email': customer.email,
                'phone': customer.phone,
                'mobile': customer.mobile,
                'website': customer.website,
                'city': customer.city,
                'country': customer.country,
                'industry': customer.industry,
                'annual_revenue': float(customer.annual_revenue) if customer.annual_revenue else None,
                'employee_count': customer.employee_count,
                'source': customer.source,
                'assigned_to': customer.assigned_to.username if customer.assigned_to else None,
                'is_active': customer.is_active,
                'tags': customer.tags,
                'created_at': customer.created_at.isoformat() if customer.created_at else None,
                'updated_at': customer.updated_at.isoformat() if customer.updated_at else None
            }
            customers_data.append(customer_data)
        
        return jsonify({
            'success': True,
            'customers': customers_data,
            'pagination': {
                'page': customers.page,
                'pages': customers.pages,
                'per_page': customers.per_page,
                'total': customers.total,
                'has_next': customers.has_next,
                'has_prev': customers.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@crm_bp.route('/customers', methods=['POST'])
@jwt_required()
@check_permission('manage_crm_customers')
@guard_payload_size()
@validate_json('customer_type')
@log_audit('CREATE_CRM_CUSTOMER')
def create_customer():
    """إنشاء عميل جديد"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # التحقق من البيانات المطلوبة
        if not data.get('customer_type'):
            return jsonify({'success': False, 'message': 'نوع العميل مطلوب'}), 400
        
        # توليد رمز العميل
        customer_code = generate_code('CUST', Customer, 'customer_code')
        
        # إنشاء العميل
        customer = Customer(
            customer_code=customer_code,
            customer_type=CustomerType(data['customer_type']),
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            company_name=data.get('company_name'),
            title=data.get('title'),
            email=data.get('email'),
            phone=data.get('phone'),
            mobile=data.get('mobile'),
            website=data.get('website'),
            address_line1=data.get('address_line1'),
            address_line2=data.get('address_line2'),
            city=data.get('city'),
            state=data.get('state'),
            postal_code=data.get('postal_code'),
            country=data.get('country'),
            industry=data.get('industry'),
            annual_revenue=Decimal(str(data['annual_revenue'])) if data.get('annual_revenue') else None,
            employee_count=data.get('employee_count'),
            source=data.get('source'),
            assigned_to_id=data.get('assigned_to_id'),
            tags=data.get('tags'),
            notes=data.get('notes'),
            created_by_id=current_user_id,
            updated_by_id=current_user_id
        )
        
        db.session.add(customer)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء العميل بنجاح',
            'customer_id': customer.id,
            'customer_code': customer.customer_code
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@crm_bp.route('/customers/<int:customer_id>', methods=['GET'])
@jwt_required()
@check_permission('access_crm')
@log_audit('GET_CUSTOMER')
def get_customer(customer_id):
    """الحصول على تفاصيل عميل"""
    try:
        customer = Customer.query.options(
            joinedload(Customer.assigned_to),
            joinedload(Customer.opportunities),
            joinedload(Customer.activities),
            joinedload(Customer.tickets)
        ).get_or_404(customer_id)
        
        customer_data = {
            'id': customer.id,
            'customer_code': customer.customer_code,
            'customer_type': customer.customer_type.value if customer.customer_type else None,
            'full_name': customer.full_name,
            'display_name': customer.display_name,
            'first_name': customer.first_name,
            'last_name': customer.last_name,
            'company_name': customer.company_name,
            'title': customer.title,
            'email': customer.email,
            'phone': customer.phone,
            'mobile': customer.mobile,
            'website': customer.website,
            'address_line1': customer.address_line1,
            'address_line2': customer.address_line2,
            'city': customer.city,
            'state': customer.state,
            'postal_code': customer.postal_code,
            'country': customer.country,
            'industry': customer.industry,
            'annual_revenue': float(customer.annual_revenue) if customer.annual_revenue else None,
            'employee_count': customer.employee_count,
            'source': customer.source,
            'assigned_to': customer.assigned_to.username if customer.assigned_to else None,
            'is_active': customer.is_active,
            'tags': customer.tags,
            'notes': customer.notes,
            'created_at': customer.created_at.isoformat() if customer.created_at else None,
            'updated_at': customer.updated_at.isoformat() if customer.updated_at else None,
            'opportunities_count': len(customer.opportunities),
            'activities_count': len(customer.activities),
            'tickets_count': len(customer.tickets)
        }
        
        return jsonify({
            'success': True,
            'customer': customer_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@crm_bp.route('/customers/<int:customer_id>', methods=['PUT'])
@jwt_required()
@check_permission('manage_crm')
@guard_payload_size()
@log_audit('UPDATE_CUSTOMER')
def update_customer(customer_id):
    """تحديث بيانات عميل"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # تحديث البيانات
        if 'customer_type' in data:
            customer.customer_type = CustomerType(data['customer_type'])
        if 'first_name' in data:
            customer.first_name = data['first_name']
        if 'last_name' in data:
            customer.last_name = data['last_name']
        if 'company_name' in data:
            customer.company_name = data['company_name']
        if 'title' in data:
            customer.title = data['title']
        if 'email' in data:
            customer.email = data['email']
        if 'phone' in data:
            customer.phone = data['phone']
        if 'mobile' in data:
            customer.mobile = data['mobile']
        if 'website' in data:
            customer.website = data['website']
        if 'address_line1' in data:
            customer.address_line1 = data['address_line1']
        if 'address_line2' in data:
            customer.address_line2 = data['address_line2']
        if 'city' in data:
            customer.city = data['city']
        if 'state' in data:
            customer.state = data['state']
        if 'postal_code' in data:
            customer.postal_code = data['postal_code']
        if 'country' in data:
            customer.country = data['country']
        if 'industry' in data:
            customer.industry = data['industry']
        if 'annual_revenue' in data:
            customer.annual_revenue = Decimal(str(data['annual_revenue'])) if data['annual_revenue'] else None
        if 'employee_count' in data:
            customer.employee_count = data['employee_count']
        if 'source' in data:
            customer.source = data['source']
        if 'assigned_to_id' in data:
            customer.assigned_to_id = data['assigned_to_id']
        if 'is_active' in data:
            customer.is_active = data['is_active']
        if 'tags' in data:
            customer.tags = data['tags']
        if 'notes' in data:
            customer.notes = data['notes']
        
        customer.updated_by_id = current_user_id
        customer.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث بيانات العميل بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Lead Management APIs
@crm_bp.route('/leads', methods=['GET'])
@jwt_required()
@check_permission('view_crm')
@log_audit('GET_LEADS')
def get_leads():
    """الحصول على قائمة العملاء المحتملين"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        assigned_to = request.args.get('assigned_to', '')
        source = request.args.get('source', '')
        
        # بناء الاستعلام
        query = Lead.query
        
        # البحث
        if search:
            query = query.filter(
                or_(
                    Lead.first_name.contains(search),
                    Lead.last_name.contains(search),
                    Lead.company.contains(search),
                    Lead.email.contains(search),
                    Lead.lead_code.contains(search)
                )
            )
        
        # فلترة حسب الحالة
        if status:
            query = query.filter(Lead.status == status)
        
        # فلترة حسب المسؤول
        if assigned_to:
            query = query.filter(Lead.assigned_to_id == assigned_to)
        
        # فلترة حسب المصدر
        if source:
            query = query.filter(Lead.source == source)
        
        # ترتيب وترقيم الصفحات
        query = query.order_by(desc(Lead.created_at))
        leads = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # تحضير البيانات
        leads_data = []
        for lead in leads.items:
            lead_data = {
                'id': lead.id,
                'lead_code': lead.lead_code,
                'full_name': lead.full_name,
                'first_name': lead.first_name,
                'last_name': lead.last_name,
                'company': lead.company,
                'title': lead.title,
                'email': lead.email,
                'phone': lead.phone,
                'mobile': lead.mobile,
                'source': lead.source,
                'status': lead.status.value if lead.status else None,
                'rating': lead.rating,
                'industry': lead.industry,
                'annual_revenue': float(lead.annual_revenue) if lead.annual_revenue else None,
                'employee_count': lead.employee_count,
                'assigned_to': lead.assigned_to.username if lead.assigned_to else None,
                'converted_to_customer_id': lead.converted_to_customer_id,
                'conversion_date': lead.conversion_date.isoformat() if lead.conversion_date else None,
                'tags': lead.tags,
                'created_at': lead.created_at.isoformat() if lead.created_at else None,
                'updated_at': lead.updated_at.isoformat() if lead.updated_at else None
            }
            leads_data.append(lead_data)
        
        return jsonify({
            'success': True,
            'leads': leads_data,
            'pagination': {
                'page': leads.page,
                'pages': leads.pages,
                'per_page': leads.per_page,
                'total': leads.total,
                'has_next': leads.has_next,
                'has_prev': leads.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@crm_bp.route('/leads', methods=['POST'])
@jwt_required()
@check_permission('manage_crm')
@guard_payload_size()
@log_audit('CREATE_LEAD')
def create_lead():
    """إنشاء عميل محتمل جديد"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # التحقق من البيانات المطلوبة
        if not data.get('first_name') or not data.get('last_name') or not data.get('email'):
            return jsonify({'success': False, 'message': 'الاسم الأول والأخير والإيميل مطلوبة'}), 400
        
        # توليد رمز العميل المحتمل
        lead_code = generate_code('LEAD', Lead, 'lead_code')
        
        # إنشاء العميل المحتمل
        lead = Lead(
            lead_code=lead_code,
            first_name=data['first_name'],
            last_name=data['last_name'],
            company=data.get('company'),
            title=data.get('title'),
            email=data['email'],
            phone=data.get('phone'),
            mobile=data.get('mobile'),
            source=data.get('source'),
            status=LeadStatus(data.get('status', 'new')),
            rating=data.get('rating'),
            industry=data.get('industry'),
            annual_revenue=Decimal(str(data['annual_revenue'])) if data.get('annual_revenue') else None,
            employee_count=data.get('employee_count'),
            assigned_to_id=data.get('assigned_to_id'),
            tags=data.get('tags'),
            notes=data.get('notes'),
            created_by_id=current_user_id,
            updated_by_id=current_user_id
        )
        
        db.session.add(lead)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء العميل المحتمل بنجاح',
            'lead_id': lead.id,
            'lead_code': lead.lead_code
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@crm_bp.route('/leads/<int:lead_id>/convert', methods=['POST'])
@jwt_required()
@check_permission('manage_crm')
@guard_payload_size()
@log_audit('CONVERT_LEAD_TO_CUSTOMER')
def convert_lead_to_customer(lead_id):
    """تحويل عميل محتمل إلى عميل"""
    try:
        lead = Lead.query.get_or_404(lead_id)
        current_user_id = get_current_user_id()
        
        # التحقق من أن العميل المحتمل لم يتم تحويله مسبقاً
        if lead.converted_to_customer_id:
            return jsonify({'success': False, 'message': 'تم تحويل هذا العميل المحتمل مسبقاً'}), 400
        
        # إنشاء عميل جديد من بيانات العميل المحتمل
        customer_code = generate_code('CUST', Customer, 'customer_code')
        
        customer = Customer(
            customer_code=customer_code,
            customer_type=CustomerType.INDIVIDUAL if not lead.company else CustomerType.COMPANY,
            first_name=lead.first_name,
            last_name=lead.last_name,
            company_name=lead.company,
            title=lead.title,
            email=lead.email,
            phone=lead.phone,
            mobile=lead.mobile,
            industry=lead.industry,
            annual_revenue=lead.annual_revenue,
            employee_count=lead.employee_count,
            source=lead.source,
            assigned_to_id=lead.assigned_to_id,
            tags=lead.tags,
            notes=lead.notes,
            created_by_id=current_user_id,
            updated_by_id=current_user_id
        )
        
        db.session.add(customer)
        db.session.flush()
        
        # تحديث العميل المحتمل
        lead.status = LeadStatus.CONVERTED
        lead.converted_to_customer_id = customer.id
        lead.conversion_date = datetime.utcnow()
        lead.updated_by_id = current_user_id
        lead.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحويل العميل المحتمل إلى عميل بنجاح',
            'customer_id': customer.id,
            'customer_code': customer.customer_code
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# CRM Dashboard API
@crm_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_CRM_DASHBOARD')
def get_crm_dashboard():
    """الحصول على بيانات لوحة تحكم CRM"""
    try:
        # إحصائيات العملاء
        total_customers = Customer.query.filter(Customer.is_active == True).count()
        new_customers_this_month = Customer.query.filter(
            and_(
                Customer.created_at >= datetime.now().replace(day=1),
                Customer.is_active == True
            )
        ).count()
        
        # إحصائيات العملاء المحتملين
        total_leads = Lead.query.count()
        new_leads_this_month = Lead.query.filter(
            Lead.created_at >= datetime.now().replace(day=1)
        ).count()
        qualified_leads = Lead.query.filter(Lead.status == LeadStatus.QUALIFIED).count()
        
        # إحصائيات الفرص
        total_opportunities = Opportunity.query.count()
        open_opportunities = Opportunity.query.filter(
            ~Opportunity.stage.in_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        ).count()
        won_opportunities = Opportunity.query.filter(Opportunity.stage == OpportunityStage.CLOSED_WON).count()
        
        # قيمة الفرص
        total_opportunity_value = db.session.query(func.sum(Opportunity.amount)).filter(
            ~Opportunity.stage.in_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        ).scalar() or 0
        
        won_opportunity_value = db.session.query(func.sum(Opportunity.amount)).filter(
            Opportunity.stage == OpportunityStage.CLOSED_WON
        ).scalar() or 0
        
        # إحصائيات الأنشطة
        total_activities = Activity.query.count()
        pending_activities = Activity.query.filter(Activity.is_completed == False).count()
        overdue_activities = Activity.query.filter(
            and_(
                Activity.due_date < datetime.utcnow(),
                Activity.is_completed == False
            )
        ).count()
        
        # إحصائيات تذاكر الدعم
        total_tickets = SupportTicket.query.count()
        open_tickets = SupportTicket.query.filter(
            SupportTicket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])
        ).count()
        
        # الأنشطة القادمة
        upcoming_activities = Activity.query.filter(
            and_(
                Activity.scheduled_date >= datetime.utcnow(),
                Activity.scheduled_date <= datetime.utcnow() + timedelta(days=7),
                Activity.is_completed == False
            )
        ).order_by(Activity.scheduled_date).limit(5).all()
        
        upcoming_activities_data = []
        for activity in upcoming_activities:
            activity_data = {
                'id': activity.id,
                'subject': activity.subject,
                'activity_type': activity.activity_type.value if activity.activity_type else None,
                'scheduled_date': activity.scheduled_date.isoformat() if activity.scheduled_date else None,
                'customer_name': activity.customer.display_name if activity.customer else None,
                'lead_name': activity.lead.full_name if activity.lead else None
            }
            upcoming_activities_data.append(activity_data)
        
        return jsonify({
            'success': True,
            'dashboard': {
                'customers': {
                    'total': total_customers,
                    'new_this_month': new_customers_this_month
                },
                'leads': {
                    'total': total_leads,
                    'new_this_month': new_leads_this_month,
                    'qualified': qualified_leads
                },
                'opportunities': {
                    'total': total_opportunities,
                    'open': open_opportunities,
                    'won': won_opportunities,
                    'total_value': float(total_opportunity_value),
                    'won_value': float(won_opportunity_value)
                },
                'activities': {
                    'total': total_activities,
                    'pending': pending_activities,
                    'overdue': overdue_activities
                },
                'support': {
                    'total_tickets': total_tickets,
                    'open_tickets': open_tickets
                },
                'upcoming_activities': upcoming_activities_data
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
