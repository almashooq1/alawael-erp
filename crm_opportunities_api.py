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
API Endpoints لإدارة الفرص التجارية والمبيعات - نظام CRM
Opportunities and Sales Management API Endpoints - CRM System
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

# إنشاء Blueprint للفرص التجارية
opportunities_bp = Blueprint('opportunities', __name__, url_prefix='/api/crm')

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

# Opportunity Management APIs
@opportunities_bp.route('/opportunities', methods=['GET'])
@jwt_required()
@check_permission('view_crm_opportunities')
@log_audit('GET_OPPORTUNITIES')
def get_opportunities():
    """الحصول على قائمة الفرص التجارية"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        stage = request.args.get('stage', '')
        assigned_to = request.args.get('assigned_to', '')
        customer_id = request.args.get('customer_id', '')
        
        # بناء الاستعلام
        query = Opportunity.query.options(
            joinedload(Opportunity.customer),
            joinedload(Opportunity.assigned_to)
        )
        
        # البحث
        if search:
            query = query.filter(
                or_(
                    Opportunity.name.contains(search),
                    Opportunity.opportunity_code.contains(search),
                    Opportunity.description.contains(search)
                )
            )
        
        # فلترة حسب المرحلة
        if stage:
            query = query.filter(Opportunity.stage == stage)
        
        # فلترة حسب المسؤول
        if assigned_to:
            query = query.filter(Opportunity.assigned_to_id == assigned_to)
        
        # فلترة حسب العميل
        if customer_id:
            query = query.filter(Opportunity.customer_id == customer_id)
        
        # ترتيب وترقيم الصفحات
        query = query.order_by(desc(Opportunity.created_at))
        opportunities = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # تحضير البيانات
        opportunities_data = []
        for opportunity in opportunities.items:
            opportunity_data = {
                'id': opportunity.id,
                'opportunity_code': opportunity.opportunity_code,
                'name': opportunity.name,
                'description': opportunity.description,
                'stage': opportunity.stage.value if opportunity.stage else None,
                'probability': opportunity.probability,
                'amount': float(opportunity.amount) if opportunity.amount else None,
                'expected_close_date': opportunity.expected_close_date.isoformat() if opportunity.expected_close_date else None,
                'actual_close_date': opportunity.actual_close_date.isoformat() if opportunity.actual_close_date else None,
                'customer': {
                    'id': opportunity.customer.id,
                    'name': opportunity.customer.display_name
                } if opportunity.customer else None,
                'assigned_to': opportunity.assigned_to.username if opportunity.assigned_to else None,
                'source': opportunity.source,
                'competitor': opportunity.competitor,
                'tags': opportunity.tags,
                'created_at': opportunity.created_at.isoformat() if opportunity.created_at else None,
                'updated_at': opportunity.updated_at.isoformat() if opportunity.updated_at else None
            }
            opportunities_data.append(opportunity_data)
        
        return jsonify({
            'success': True,
            'opportunities': opportunities_data,
            'pagination': {
                'page': opportunities.page,
                'pages': opportunities.pages,
                'per_page': opportunities.per_page,
                'total': opportunities.total,
                'has_next': opportunities.has_next,
                'has_prev': opportunities.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@opportunities_bp.route('/opportunities', methods=['POST'])
@jwt_required()
@check_permission('manage_crm_opportunities')
@guard_payload_size()
@log_audit('CREATE_OPPORTUNITY')
def create_opportunity():
    """إنشاء فرصة تجارية جديدة"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # التحقق من البيانات المطلوبة
        if not data.get('name') or not data.get('customer_id'):
            return jsonify({'success': False, 'message': 'اسم الفرصة ومعرف العميل مطلوبان'}), 400
        
        # التحقق من وجود العميل
        customer = Customer.query.get(data['customer_id'])
        if not customer:
            return jsonify({'success': False, 'message': 'العميل غير موجود'}), 404
        
        # توليد رمز الفرصة
        opportunity_code = generate_code('OPP', Opportunity, 'opportunity_code')
        
        # إنشاء الفرصة التجارية
        opportunity = Opportunity(
            opportunity_code=opportunity_code,
            name=data['name'],
            description=data.get('description'),
            stage=OpportunityStage(data.get('stage', 'prospecting')),
            probability=data.get('probability', 0),
            amount=Decimal(str(data['amount'])) if data.get('amount') else None,
            expected_close_date=datetime.fromisoformat(data['expected_close_date'].replace('Z', '+00:00')) if data.get('expected_close_date') else None,
            customer_id=data['customer_id'],
            assigned_to_id=data.get('assigned_to_id'),
            source=data.get('source'),
            competitor=data.get('competitor'),
            tags=data.get('tags'),
            notes=data.get('notes'),
            created_by_id=current_user_id,
            updated_by_id=current_user_id
        )
        
        db.session.add(opportunity)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الفرصة التجارية بنجاح',
            'opportunity_id': opportunity.id,
            'opportunity_code': opportunity.opportunity_code
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@opportunities_bp.route('/opportunities/<int:opportunity_id>', methods=['GET'])
@jwt_required()
@check_permission('view_crm_opportunities')
@log_audit('GET_OPPORTUNITY')
def get_opportunity(opportunity_id):
    """الحصول على تفاصيل فرصة تجارية"""
    try:
        opportunity = Opportunity.query.options(
            joinedload(Opportunity.customer),
            joinedload(Opportunity.assigned_to),
            joinedload(Opportunity.activities)
        ).get_or_404(opportunity_id)
        
        opportunity_data = {
            'id': opportunity.id,
            'opportunity_code': opportunity.opportunity_code,
            'name': opportunity.name,
            'description': opportunity.description,
            'stage': opportunity.stage.value if opportunity.stage else None,
            'probability': opportunity.probability,
            'amount': float(opportunity.amount) if opportunity.amount else None,
            'expected_close_date': opportunity.expected_close_date.isoformat() if opportunity.expected_close_date else None,
            'actual_close_date': opportunity.actual_close_date.isoformat() if opportunity.actual_close_date else None,
            'customer': {
                'id': opportunity.customer.id,
                'name': opportunity.customer.display_name,
                'email': opportunity.customer.email,
                'phone': opportunity.customer.phone
            } if opportunity.customer else None,
            'assigned_to': opportunity.assigned_to.username if opportunity.assigned_to else None,
            'source': opportunity.source,
            'competitor': opportunity.competitor,
            'tags': opportunity.tags,
            'notes': opportunity.notes,
            'created_at': opportunity.created_at.isoformat() if opportunity.created_at else None,
            'updated_at': opportunity.updated_at.isoformat() if opportunity.updated_at else None,
            'activities_count': len(opportunity.activities)
        }
        
        return jsonify({
            'success': True,
            'opportunity': opportunity_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@opportunities_bp.route('/opportunities/<int:opportunity_id>', methods=['PUT'])
@jwt_required()
@check_permission('manage_crm_opportunities')
@guard_payload_size()
@log_audit('UPDATE_OPPORTUNITY')
def update_opportunity(opportunity_id):
    """تحديث بيانات فرصة تجارية"""
    try:
        opportunity = Opportunity.query.get_or_404(opportunity_id)
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # تحديث البيانات
        if 'name' in data:
            opportunity.name = data['name']
        if 'description' in data:
            opportunity.description = data['description']
        if 'stage' in data:
            opportunity.stage = OpportunityStage(data['stage'])
            # إذا تم إغلاق الفرصة، تحديث تاريخ الإغلاق
            if data['stage'] in ['closed_won', 'closed_lost']:
                opportunity.actual_close_date = datetime.utcnow()
        if 'probability' in data:
            opportunity.probability = data['probability']
        if 'amount' in data:
            opportunity.amount = Decimal(str(data['amount'])) if data['amount'] else None
        if 'expected_close_date' in data:
            opportunity.expected_close_date = datetime.fromisoformat(data['expected_close_date'].replace('Z', '+00:00')) if data['expected_close_date'] else None
        if 'assigned_to_id' in data:
            opportunity.assigned_to_id = data['assigned_to_id']
        if 'source' in data:
            opportunity.source = data['source']
        if 'competitor' in data:
            opportunity.competitor = data['competitor']
        if 'tags' in data:
            opportunity.tags = data['tags']
        if 'notes' in data:
            opportunity.notes = data['notes']
        
        opportunity.updated_by_id = current_user_id
        opportunity.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث بيانات الفرصة التجارية بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@opportunities_bp.route('/opportunities/<int:opportunity_id>/stage', methods=['PUT'])
@jwt_required()
@check_permission('manage_crm_opportunities')
@guard_payload_size()
@log_audit('UPDATE_OPPORTUNITY_STAGE')
def update_opportunity_stage(opportunity_id):
    """تحديث مرحلة الفرصة التجارية"""
    try:
        opportunity = Opportunity.query.get_or_404(opportunity_id)
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        if not data.get('stage'):
            return jsonify({'success': False, 'message': 'المرحلة مطلوبة'}), 400
        
        old_stage = opportunity.stage
        new_stage = OpportunityStage(data['stage'])
        
        opportunity.stage = new_stage
        
        # تحديث الاحتمالية حسب المرحلة
        stage_probabilities = {
            OpportunityStage.PROSPECTING: 10,
            OpportunityStage.QUALIFICATION: 25,
            OpportunityStage.NEEDS_ANALYSIS: 40,
            OpportunityStage.VALUE_PROPOSITION: 60,
            OpportunityStage.DECISION_MAKERS: 75,
            OpportunityStage.PROPOSAL: 85,
            OpportunityStage.NEGOTIATION: 90,
            OpportunityStage.CLOSED_WON: 100,
            OpportunityStage.CLOSED_LOST: 0
        }
        
        opportunity.probability = stage_probabilities.get(new_stage, opportunity.probability)
        
        # إذا تم إغلاق الفرصة، تحديث تاريخ الإغلاق
        if new_stage in [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]:
            opportunity.actual_close_date = datetime.utcnow()
        
        opportunity.updated_by_id = current_user_id
        opportunity.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'تم تحديث مرحلة الفرصة من {old_stage.value if old_stage else "غير محدد"} إلى {new_stage.value}',
            'old_stage': old_stage.value if old_stage else None,
            'new_stage': new_stage.value,
            'probability': opportunity.probability
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Sales Pipeline APIs
@opportunities_bp.route('/sales-pipeline', methods=['GET'])
@jwt_required()
@check_permission('view_crm_opportunities')
@log_audit('GET_SALES_PIPELINE')
def get_sales_pipeline():
    """الحصول على بيانات خط المبيعات"""
    try:
        # إحصائيات حسب المرحلة
        pipeline_data = {}
        total_value = 0
        total_count = 0
        
        for stage in OpportunityStage:
            opportunities = Opportunity.query.filter(Opportunity.stage == stage).all()
            stage_value = sum([float(opp.amount) for opp in opportunities if opp.amount])
            stage_count = len(opportunities)
            
            pipeline_data[stage.value] = {
                'count': stage_count,
                'value': stage_value,
                'opportunities': [
                    {
                        'id': opp.id,
                        'name': opp.name,
                        'amount': float(opp.amount) if opp.amount else 0,
                        'probability': opp.probability,
                        'customer_name': opp.customer.display_name if opp.customer else None,
                        'expected_close_date': opp.expected_close_date.isoformat() if opp.expected_close_date else None
                    }
                    for opp in opportunities
                ]
            }
            
            if stage not in [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]:
                total_value += stage_value
                total_count += stage_count
        
        # الفرص المتوقع إغلاقها هذا الشهر
        start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_of_month = (start_of_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        closing_this_month = Opportunity.query.filter(
            and_(
                Opportunity.expected_close_date >= start_of_month,
                Opportunity.expected_close_date <= end_of_month,
                ~Opportunity.stage.in_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
            )
        ).all()
        
        closing_this_month_data = [
            {
                'id': opp.id,
                'name': opp.name,
                'amount': float(opp.amount) if opp.amount else 0,
                'probability': opp.probability,
                'stage': opp.stage.value,
                'customer_name': opp.customer.display_name if opp.customer else None,
                'expected_close_date': opp.expected_close_date.isoformat() if opp.expected_close_date else None
            }
            for opp in closing_this_month
        ]
        
        # معدل التحويل
        total_opportunities = Opportunity.query.count()
        won_opportunities = Opportunity.query.filter(Opportunity.stage == OpportunityStage.CLOSED_WON).count()
        conversion_rate = (won_opportunities / total_opportunities * 100) if total_opportunities > 0 else 0
        
        return jsonify({
            'success': True,
            'pipeline': {
                'stages': pipeline_data,
                'summary': {
                    'total_open_value': total_value,
                    'total_open_count': total_count,
                    'conversion_rate': round(conversion_rate, 2)
                },
                'closing_this_month': closing_this_month_data
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Activity Management APIs for Opportunities
@opportunities_bp.route('/opportunities/<int:opportunity_id>/activities', methods=['GET'])
@jwt_required()
@check_permission('view_crm_opportunities')
@log_audit('GET_OPPORTUNITY_ACTIVITIES')
def get_opportunity_activities(opportunity_id):
    """الحصول على أنشطة فرصة تجارية"""
    try:
        opportunity = Opportunity.query.get_or_404(opportunity_id)
        
        activities = Activity.query.filter(
            Activity.opportunity_id == opportunity_id
        ).order_by(desc(Activity.created_at)).all()
        
        activities_data = []
        for activity in activities:
            activity_data = {
                'id': activity.id,
                'subject': activity.subject,
                'activity_type': activity.activity_type.value if activity.activity_type else None,
                'description': activity.description,
                'scheduled_date': activity.scheduled_date.isoformat() if activity.scheduled_date else None,
                'due_date': activity.due_date.isoformat() if activity.due_date else None,
                'is_completed': activity.is_completed,
                'completed_date': activity.completed_date.isoformat() if activity.completed_date else None,
                'priority': activity.priority.value if activity.priority else None,
                'assigned_to': activity.assigned_to.username if activity.assigned_to else None,
                'created_at': activity.created_at.isoformat() if activity.created_at else None
            }
            activities_data.append(activity_data)
        
        return jsonify({
            'success': True,
            'activities': activities_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@opportunities_bp.route('/opportunities/<int:opportunity_id>/activities', methods=['POST'])
@jwt_required()
@check_permission('manage_crm_opportunities')
@guard_payload_size()
@log_audit('CREATE_OPPORTUNITY_ACTIVITY')
def create_opportunity_activity(opportunity_id):
    """إنشاء نشاط لفرصة تجارية"""
    try:
        opportunity = Opportunity.query.get_or_404(opportunity_id)
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
            scheduled_date=datetime.fromisoformat(data['scheduled_date'].replace('Z', '+00:00')) if data.get('scheduled_date') else None,
            due_date=datetime.fromisoformat(data['due_date'].replace('Z', '+00:00')) if data.get('due_date') else None,
            priority=ActivityPriority(data.get('priority', 'medium')),
            opportunity_id=opportunity_id,
            customer_id=opportunity.customer_id,
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

# Sales Analytics APIs
@opportunities_bp.route('/sales-analytics', methods=['GET'])
@jwt_required()
@check_permission('view_crm_opportunities')
@log_audit('GET_SALES_ANALYTICS')
def get_sales_analytics():
    """الحصول على تحليلات المبيعات"""
    try:
        # فترة التحليل (آخر 12 شهر)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        
        # إحصائيات الفرص حسب الشهر
        monthly_stats = []
        for i in range(12):
            month_start = (end_date - timedelta(days=30*i)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            # الفرص المنشأة في الشهر
            created_opportunities = Opportunity.query.filter(
                and_(
                    Opportunity.created_at >= month_start,
                    Opportunity.created_at <= month_end
                )
            ).count()
            
            # الفرص المغلقة بنجاح
            won_opportunities = Opportunity.query.filter(
                and_(
                    Opportunity.actual_close_date >= month_start,
                    Opportunity.actual_close_date <= month_end,
                    Opportunity.stage == OpportunityStage.CLOSED_WON
                )
            ).count()
            
            # قيمة المبيعات
            sales_value = db.session.query(func.sum(Opportunity.amount)).filter(
                and_(
                    Opportunity.actual_close_date >= month_start,
                    Opportunity.actual_close_date <= month_end,
                    Opportunity.stage == OpportunityStage.CLOSED_WON
                )
            ).scalar() or 0
            
            monthly_stats.append({
                'month': month_start.strftime('%Y-%m'),
                'created_opportunities': created_opportunities,
                'won_opportunities': won_opportunities,
                'sales_value': float(sales_value)
            })
        
        # أفضل العملاء (حسب قيمة المبيعات)
        top_customers = db.session.query(
            Customer.id,
            Customer.display_name,
            func.sum(Opportunity.amount).label('total_sales'),
            func.count(Opportunity.id).label('opportunities_count')
        ).join(Opportunity).filter(
            Opportunity.stage == OpportunityStage.CLOSED_WON
        ).group_by(Customer.id, Customer.display_name).order_by(
            desc('total_sales')
        ).limit(10).all()
        
        top_customers_data = [
            {
                'customer_id': customer.id,
                'customer_name': customer.display_name,
                'total_sales': float(customer.total_sales),
                'opportunities_count': customer.opportunities_count
            }
            for customer in top_customers
        ]
        
        # أداء المبيعات حسب المصدر
        sales_by_source = db.session.query(
            Opportunity.source,
            func.count(Opportunity.id).label('count'),
            func.sum(Opportunity.amount).label('total_value')
        ).filter(
            Opportunity.stage == OpportunityStage.CLOSED_WON
        ).group_by(Opportunity.source).all()
        
        sales_by_source_data = [
            {
                'source': source.source or 'غير محدد',
                'count': source.count,
                'total_value': float(source.total_value) if source.total_value else 0
            }
            for source in sales_by_source
        ]
        
        # متوسط وقت الإغلاق
        closed_opportunities = Opportunity.query.filter(
            Opportunity.stage.in_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        ).all()
        
        if closed_opportunities:
            total_days = sum([
                (opp.actual_close_date - opp.created_at).days 
                for opp in closed_opportunities 
                if opp.actual_close_date and opp.created_at
            ])
            avg_close_time = total_days / len(closed_opportunities) if closed_opportunities else 0
        else:
            avg_close_time = 0
        
        return jsonify({
            'success': True,
            'analytics': {
                'monthly_stats': monthly_stats,
                'top_customers': top_customers_data,
                'sales_by_source': sales_by_source_data,
                'avg_close_time_days': round(avg_close_time, 1)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
