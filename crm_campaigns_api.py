# -*- coding: utf-8 -*-
"""
نظام إدارة الحملات التسويقية - CRM Marketing Campaigns API
يوفر API endpoints شاملة لإدارة الحملات التسويقية والتسويق الرقمي
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, desc, asc, func, extract
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

from models import (
    db, CRMCustomer, CRMLead, CRMCommunication, User,
    CRMCampaign, CRMCampaignTarget, CRMCampaignActivity, CRMCampaignMetrics
)

campaigns_bp = Blueprint('campaigns', __name__, url_prefix='/api/crm/campaigns')

def get_current_user_id():
    """الحصول على معرف المستخدم الحالي"""
    try:
        current_user = get_jwt_identity()
        if isinstance(current_user, dict):
            return current_user.get('user_id')
        return current_user
    except:
        return None

def generate_campaign_code():
    """توليد رمز فريد للحملة"""
    return f"CAMP-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

# ==================== إدارة الحملات التسويقية ====================

@campaigns_bp.route('', methods=['GET'])
@jwt_required()
def get_campaigns():
    """قائمة الحملات التسويقية مع الفلترة والترقيم"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        
        # فلاتر البحث
        search = request.args.get('search', '').strip()
        status = request.args.get('status', '').strip()
        campaign_type = request.args.get('type', '').strip()
        start_date = request.args.get('start_date', '').strip()
        end_date = request.args.get('end_date', '').strip()
        
        # بناء الاستعلام
        query = CRMCampaign.query
        
        # البحث النصي
        if search:
            search_filter = or_(
                CRMCampaign.name.ilike(f'%{search}%'),
                CRMCampaign.description.ilike(f'%{search}%'),
                CRMCampaign.campaign_code.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        # فلتر الحالة
        if status:
            query = query.filter(CRMCampaign.status == status)
        
        # فلتر نوع الحملة
        if campaign_type:
            query = query.filter(CRMCampaign.campaign_type == campaign_type)
        
        # فلتر التاريخ
        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(CRMCampaign.start_date >= start_dt)
        
        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(CRMCampaign.end_date <= end_dt)
        
        # الترتيب
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        if hasattr(CRMCampaign, sort_by):
            if sort_order == 'asc':
                query = query.order_by(asc(getattr(CRMCampaign, sort_by)))
            else:
                query = query.order_by(desc(getattr(CRMCampaign, sort_by)))
        
        # تحميل البيانات المرتبطة
        query = query.options(
            joinedload(CRMCampaign.created_by_user),
            joinedload(CRMCampaign.targets),
            joinedload(CRMCampaign.activities),
            joinedload(CRMCampaign.metrics)
        )
        
        # الترقيم
        campaigns = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'campaigns': [{
                'id': campaign.id,
                'campaign_code': campaign.campaign_code,
                'name': campaign.name,
                'description': campaign.description,
                'campaign_type': campaign.campaign_type,
                'status': campaign.status,
                'budget': float(campaign.budget) if campaign.budget else 0,
                'spent_amount': float(campaign.spent_amount) if campaign.spent_amount else 0,
                'start_date': campaign.start_date.isoformat() if campaign.start_date else None,
                'end_date': campaign.end_date.isoformat() if campaign.end_date else None,
                'target_audience': campaign.target_audience,
                'channels': campaign.channels,
                'goals': campaign.goals,
                'created_by': campaign.created_by_user.username if campaign.created_by_user else None,
                'created_at': campaign.created_at.isoformat(),
                'targets_count': len(campaign.targets),
                'activities_count': len(campaign.activities),
                'metrics': campaign.metrics[0].__dict__ if campaign.metrics else None
            } for campaign in campaigns.items],
            'pagination': {
                'page': campaigns.page,
                'pages': campaigns.pages,
                'per_page': campaigns.per_page,
                'total': campaigns.total,
                'has_next': campaigns.has_next,
                'has_prev': campaigns.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب الحملات: {str(e)}'
        }), 500

@campaigns_bp.route('', methods=['POST'])
@jwt_required()
def create_campaign():
    """إنشاء حملة تسويقية جديدة"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name', 'campaign_type', 'start_date']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'الحقل {field} مطلوب'
                }), 400
        
        # إنشاء الحملة
        campaign = CRMCampaign(
            campaign_code=generate_campaign_code(),
            name=data['name'],
            description=data.get('description', ''),
            campaign_type=data['campaign_type'],
            status=data.get('status', 'draft'),
            budget=Decimal(str(data.get('budget', 0))),
            start_date=datetime.fromisoformat(data['start_date'].replace('Z', '+00:00')),
            end_date=datetime.fromisoformat(data['end_date'].replace('Z', '+00:00')) if data.get('end_date') else None,
            target_audience=data.get('target_audience', {}),
            channels=data.get('channels', []),
            goals=data.get('goals', {}),
            created_by=current_user_id
        )
        
        db.session.add(campaign)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الحملة بنجاح',
            'campaign': {
                'id': campaign.id,
                'campaign_code': campaign.campaign_code,
                'name': campaign.name,
                'campaign_type': campaign.campaign_type,
                'status': campaign.status
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء الحملة: {str(e)}'
        }), 500

@campaigns_bp.route('/<int:campaign_id>', methods=['GET'])
@jwt_required()
def get_campaign(campaign_id):
    """الحصول على تفاصيل حملة محددة"""
    try:
        campaign = CRMCampaign.query.options(
            joinedload(CRMCampaign.created_by_user),
            joinedload(CRMCampaign.targets).joinedload(CRMCampaignTarget.customer),
            joinedload(CRMCampaign.targets).joinedload(CRMCampaignTarget.lead),
            joinedload(CRMCampaign.activities),
            joinedload(CRMCampaign.metrics)
        ).get_or_404(campaign_id)
        
        return jsonify({
            'success': True,
            'campaign': {
                'id': campaign.id,
                'campaign_code': campaign.campaign_code,
                'name': campaign.name,
                'description': campaign.description,
                'campaign_type': campaign.campaign_type,
                'status': campaign.status,
                'budget': float(campaign.budget) if campaign.budget else 0,
                'spent_amount': float(campaign.spent_amount) if campaign.spent_amount else 0,
                'start_date': campaign.start_date.isoformat() if campaign.start_date else None,
                'end_date': campaign.end_date.isoformat() if campaign.end_date else None,
                'target_audience': campaign.target_audience,
                'channels': campaign.channels,
                'goals': campaign.goals,
                'created_by': campaign.created_by_user.username if campaign.created_by_user else None,
                'created_at': campaign.created_at.isoformat(),
                'updated_at': campaign.updated_at.isoformat() if campaign.updated_at else None,
                'targets': [{
                    'id': target.id,
                    'target_type': target.target_type,
                    'customer': {
                        'id': target.customer.id,
                        'name': target.customer.name,
                        'email': target.customer.email
                    } if target.customer else None,
                    'lead': {
                        'id': target.lead.id,
                        'name': target.lead.name,
                        'email': target.lead.email
                    } if target.lead else None,
                    'status': target.status,
                    'response_date': target.response_date.isoformat() if target.response_date else None
                } for target in campaign.targets],
                'activities': [{
                    'id': activity.id,
                    'activity_type': activity.activity_type,
                    'title': activity.title,
                    'description': activity.description,
                    'scheduled_date': activity.scheduled_date.isoformat() if activity.scheduled_date else None,
                    'status': activity.status,
                    'cost': float(activity.cost) if activity.cost else 0
                } for activity in campaign.activities],
                'metrics': campaign.metrics[0].__dict__ if campaign.metrics else None
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب تفاصيل الحملة: {str(e)}'
        }), 500

@campaigns_bp.route('/<int:campaign_id>', methods=['PUT'])
@jwt_required()
def update_campaign(campaign_id):
    """تحديث حملة تسويقية"""
    try:
        campaign = CRMCampaign.query.get_or_404(campaign_id)
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # تحديث البيانات
        if 'name' in data:
            campaign.name = data['name']
        if 'description' in data:
            campaign.description = data['description']
        if 'campaign_type' in data:
            campaign.campaign_type = data['campaign_type']
        if 'status' in data:
            campaign.status = data['status']
        if 'budget' in data:
            campaign.budget = Decimal(str(data['budget']))
        if 'start_date' in data:
            campaign.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        if 'end_date' in data:
            campaign.end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00')) if data['end_date'] else None
        if 'target_audience' in data:
            campaign.target_audience = data['target_audience']
        if 'channels' in data:
            campaign.channels = data['channels']
        if 'goals' in data:
            campaign.goals = data['goals']
        
        campaign.updated_at = datetime.utcnow()
        campaign.updated_by = current_user_id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث الحملة بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في تحديث الحملة: {str(e)}'
        }), 500

@campaigns_bp.route('/<int:campaign_id>', methods=['DELETE'])
@jwt_required()
def delete_campaign(campaign_id):
    """حذف حملة تسويقية"""
    try:
        campaign = CRMCampaign.query.get_or_404(campaign_id)
        
        # حذف البيانات المرتبطة
        CRMCampaignTarget.query.filter_by(campaign_id=campaign_id).delete()
        CRMCampaignActivity.query.filter_by(campaign_id=campaign_id).delete()
        CRMCampaignMetrics.query.filter_by(campaign_id=campaign_id).delete()
        
        db.session.delete(campaign)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم حذف الحملة بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في حذف الحملة: {str(e)}'
        }), 500

# ==================== إدارة أهداف الحملة ====================

@campaigns_bp.route('/<int:campaign_id>/targets', methods=['GET'])
@jwt_required()
def get_campaign_targets(campaign_id):
    """قائمة أهداف الحملة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        targets = CRMCampaignTarget.query.filter_by(campaign_id=campaign_id).options(
            joinedload(CRMCampaignTarget.customer),
            joinedload(CRMCampaignTarget.lead)
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'targets': [{
                'id': target.id,
                'target_type': target.target_type,
                'customer': {
                    'id': target.customer.id,
                    'name': target.customer.name,
                    'email': target.customer.email,
                    'phone': target.customer.phone
                } if target.customer else None,
                'lead': {
                    'id': target.lead.id,
                    'name': target.lead.name,
                    'email': target.lead.email,
                    'phone': target.lead.phone
                } if target.lead else None,
                'status': target.status,
                'response_date': target.response_date.isoformat() if target.response_date else None,
                'notes': target.notes
            } for target in targets.items],
            'pagination': {
                'page': targets.page,
                'pages': targets.pages,
                'per_page': targets.per_page,
                'total': targets.total
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب أهداف الحملة: {str(e)}'
        }), 500

@campaigns_bp.route('/<int:campaign_id>/targets', methods=['POST'])
@jwt_required()
def add_campaign_targets(campaign_id):
    """إضافة أهداف للحملة"""
    try:
        data = request.get_json()
        targets_data = data.get('targets', [])
        
        if not targets_data:
            return jsonify({
                'success': False,
                'message': 'لا توجد أهداف لإضافتها'
            }), 400
        
        # التحقق من وجود الحملة
        campaign = CRMCampaign.query.get_or_404(campaign_id)
        
        added_targets = []
        for target_data in targets_data:
            target = CRMCampaignTarget(
                campaign_id=campaign_id,
                target_type=target_data['target_type'],
                customer_id=target_data.get('customer_id'),
                lead_id=target_data.get('lead_id'),
                status='pending',
                notes=target_data.get('notes', '')
            )
            db.session.add(target)
            added_targets.append(target)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'تم إضافة {len(added_targets)} هدف للحملة بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إضافة أهداف الحملة: {str(e)}'
        }), 500

# ==================== إدارة أنشطة الحملة ====================

@campaigns_bp.route('/<int:campaign_id>/activities', methods=['GET'])
@jwt_required()
def get_campaign_activities(campaign_id):
    """قائمة أنشطة الحملة"""
    try:
        activities = CRMCampaignActivity.query.filter_by(campaign_id=campaign_id).order_by(
            desc(CRMCampaignActivity.scheduled_date)
        ).all()
        
        return jsonify({
            'success': True,
            'activities': [{
                'id': activity.id,
                'activity_type': activity.activity_type,
                'title': activity.title,
                'description': activity.description,
                'scheduled_date': activity.scheduled_date.isoformat() if activity.scheduled_date else None,
                'completed_date': activity.completed_date.isoformat() if activity.completed_date else None,
                'status': activity.status,
                'cost': float(activity.cost) if activity.cost else 0,
                'results': activity.results,
                'created_at': activity.created_at.isoformat()
            } for activity in activities]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب أنشطة الحملة: {str(e)}'
        }), 500

@campaigns_bp.route('/<int:campaign_id>/activities', methods=['POST'])
@jwt_required()
def create_campaign_activity(campaign_id):
    """إنشاء نشاط جديد للحملة"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # التحقق من البيانات المطلوبة
        if not data.get('title') or not data.get('activity_type'):
            return jsonify({
                'success': False,
                'message': 'العنوان ونوع النشاط مطلوبان'
            }), 400
        
        activity = CRMCampaignActivity(
            campaign_id=campaign_id,
            activity_type=data['activity_type'],
            title=data['title'],
            description=data.get('description', ''),
            scheduled_date=datetime.fromisoformat(data['scheduled_date'].replace('Z', '+00:00')) if data.get('scheduled_date') else None,
            status=data.get('status', 'planned'),
            cost=Decimal(str(data.get('cost', 0))),
            created_by=current_user_id
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
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء النشاط: {str(e)}'
        }), 500

# ==================== تحليلات وإحصائيات الحملات ====================

@campaigns_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_campaigns_analytics():
    """تحليلات شاملة للحملات التسويقية"""
    try:
        # إحصائيات عامة
        total_campaigns = CRMCampaign.query.count()
        active_campaigns = CRMCampaign.query.filter_by(status='active').count()
        completed_campaigns = CRMCampaign.query.filter_by(status='completed').count()
        
        # إجمالي الميزانيات والمصروفات
        budget_stats = db.session.query(
            func.sum(CRMCampaign.budget).label('total_budget'),
            func.sum(CRMCampaign.spent_amount).label('total_spent')
        ).first()
        
        # الحملات حسب النوع
        campaigns_by_type = db.session.query(
            CRMCampaign.campaign_type,
            func.count(CRMCampaign.id).label('count')
        ).group_by(CRMCampaign.campaign_type).all()
        
        # الحملات الشهرية
        monthly_campaigns = db.session.query(
            extract('year', CRMCampaign.created_at).label('year'),
            extract('month', CRMCampaign.created_at).label('month'),
            func.count(CRMCampaign.id).label('count')
        ).group_by('year', 'month').order_by('year', 'month').limit(12).all()
        
        # أفضل الحملات أداءً
        top_campaigns = db.session.query(CRMCampaign).join(CRMCampaignMetrics).order_by(
            desc(CRMCampaignMetrics.conversion_rate)
        ).limit(5).all()
        
        return jsonify({
            'success': True,
            'analytics': {
                'overview': {
                    'total_campaigns': total_campaigns,
                    'active_campaigns': active_campaigns,
                    'completed_campaigns': completed_campaigns,
                    'draft_campaigns': total_campaigns - active_campaigns - completed_campaigns,
                    'total_budget': float(budget_stats.total_budget) if budget_stats.total_budget else 0,
                    'total_spent': float(budget_stats.total_spent) if budget_stats.total_spent else 0
                },
                'campaigns_by_type': [
                    {'type': item.campaign_type, 'count': item.count}
                    for item in campaigns_by_type
                ],
                'monthly_trends': [
                    {
                        'year': int(item.year),
                        'month': int(item.month),
                        'count': item.count
                    }
                    for item in monthly_campaigns
                ],
                'top_campaigns': [
                    {
                        'id': campaign.id,
                        'name': campaign.name,
                        'campaign_type': campaign.campaign_type,
                        'status': campaign.status
                    }
                    for campaign in top_campaigns
                ]
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب تحليلات الحملات: {str(e)}'
        }), 500

@campaigns_bp.route('/<int:campaign_id>/metrics', methods=['GET'])
@jwt_required()
def get_campaign_metrics(campaign_id):
    """مقاييس أداء حملة محددة"""
    try:
        metrics = CRMCampaignMetrics.query.filter_by(campaign_id=campaign_id).first()
        
        if not metrics:
            return jsonify({
                'success': False,
                'message': 'لا توجد مقاييس لهذه الحملة'
            }), 404
        
        return jsonify({
            'success': True,
            'metrics': {
                'id': metrics.id,
                'campaign_id': metrics.campaign_id,
                'impressions': metrics.impressions,
                'clicks': metrics.clicks,
                'conversions': metrics.conversions,
                'leads_generated': metrics.leads_generated,
                'customers_acquired': metrics.customers_acquired,
                'revenue_generated': float(metrics.revenue_generated) if metrics.revenue_generated else 0,
                'cost_per_click': float(metrics.cost_per_click) if metrics.cost_per_click else 0,
                'cost_per_conversion': float(metrics.cost_per_conversion) if metrics.cost_per_conversion else 0,
                'conversion_rate': float(metrics.conversion_rate) if metrics.conversion_rate else 0,
                'roi': float(metrics.roi) if metrics.roi else 0,
                'updated_at': metrics.updated_at.isoformat() if metrics.updated_at else None
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب مقاييس الحملة: {str(e)}'
        }), 500

@campaigns_bp.route('/<int:campaign_id>/launch', methods=['POST'])
@jwt_required()
def launch_campaign(campaign_id):
    """إطلاق الحملة التسويقية"""
    try:
        campaign = CRMCampaign.query.get_or_404(campaign_id)
        
        if campaign.status != 'draft':
            return jsonify({
                'success': False,
                'message': 'يمكن إطلاق الحملات في حالة المسودة فقط'
            }), 400
        
        campaign.status = 'active'
        campaign.updated_at = datetime.utcnow()
        campaign.updated_by = get_current_user_id()
        
        # إنشاء مقاييس أولية للحملة
        if not campaign.metrics:
            metrics = CRMCampaignMetrics(
                campaign_id=campaign_id,
                impressions=0,
                clicks=0,
                conversions=0,
                leads_generated=0,
                customers_acquired=0,
                revenue_generated=Decimal('0'),
                cost_per_click=Decimal('0'),
                cost_per_conversion=Decimal('0'),
                conversion_rate=Decimal('0'),
                roi=Decimal('0')
            )
            db.session.add(metrics)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إطلاق الحملة بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إطلاق الحملة: {str(e)}'
        }), 500
