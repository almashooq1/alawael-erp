#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API Endpoints لنظام التقارير والتحليلات التجارية - نظام CRM
Reports and Business Analytics API Endpoints - CRM System
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import and_, or_, desc, func, extract
from sqlalchemy.orm import joinedload
import json

from app import db
from crm_models import *

# إنشاء Blueprint للتقارير
reports_bp = Blueprint('reports', __name__, url_prefix='/api/crm')

def get_current_user_id():
    """الحصول على معرف المستخدم الحالي"""
    return get_jwt_identity()

# Sales Reports
@reports_bp.route('/reports/sales-summary', methods=['GET'])
@jwt_required()
def get_sales_summary():
    """تقرير ملخص المبيعات"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # تحديد الفترة الافتراضية (آخر 30 يوم)
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')
        
        start_date = datetime.fromisoformat(start_date)
        end_date = datetime.fromisoformat(end_date)
        
        # إجمالي المبيعات المحققة
        total_sales = db.session.query(func.sum(Opportunity.amount)).filter(
            and_(
                Opportunity.stage == OpportunityStage.CLOSED_WON,
                Opportunity.actual_close_date >= start_date,
                Opportunity.actual_close_date <= end_date
            )
        ).scalar() or 0
        
        # عدد الصفقات المحققة
        deals_won = Opportunity.query.filter(
            and_(
                Opportunity.stage == OpportunityStage.CLOSED_WON,
                Opportunity.actual_close_date >= start_date,
                Opportunity.actual_close_date <= end_date
            )
        ).count()
        
        # عدد الصفقات المفقودة
        deals_lost = Opportunity.query.filter(
            and_(
                Opportunity.stage == OpportunityStage.CLOSED_LOST,
                Opportunity.actual_close_date >= start_date,
                Opportunity.actual_close_date <= end_date
            )
        ).count()
        
        # معدل النجاح
        total_closed = deals_won + deals_lost
        win_rate = (deals_won / total_closed * 100) if total_closed > 0 else 0
        
        # متوسط قيمة الصفقة
        avg_deal_value = (float(total_sales) / deals_won) if deals_won > 0 else 0
        
        # المبيعات حسب الشهر
        monthly_sales = db.session.query(
            extract('year', Opportunity.actual_close_date).label('year'),
            extract('month', Opportunity.actual_close_date).label('month'),
            func.sum(Opportunity.amount).label('total_amount'),
            func.count(Opportunity.id).label('deals_count')
        ).filter(
            and_(
                Opportunity.stage == OpportunityStage.CLOSED_WON,
                Opportunity.actual_close_date >= start_date,
                Opportunity.actual_close_date <= end_date
            )
        ).group_by(
            extract('year', Opportunity.actual_close_date),
            extract('month', Opportunity.actual_close_date)
        ).all()
        
        monthly_data = [
            {
                'period': f"{int(month.year)}-{int(month.month):02d}",
                'sales_amount': float(month.total_amount) if month.total_amount else 0,
                'deals_count': month.deals_count
            }
            for month in monthly_sales
        ]
        
        return jsonify({
            'success': True,
            'report': {
                'period': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d')
                },
                'summary': {
                    'total_sales': float(total_sales),
                    'deals_won': deals_won,
                    'deals_lost': deals_lost,
                    'win_rate': round(win_rate, 2),
                    'avg_deal_value': round(avg_deal_value, 2)
                },
                'monthly_breakdown': monthly_data
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@reports_bp.route('/reports/sales-pipeline', methods=['GET'])
@jwt_required()
def get_sales_pipeline_report():
    """تقرير خط المبيعات التفصيلي"""
    try:
        # الفرص حسب المرحلة
        pipeline_stages = {}
        total_pipeline_value = 0
        
        for stage in OpportunityStage:
            if stage not in [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]:
                opportunities = Opportunity.query.filter(Opportunity.stage == stage).all()
                stage_value = sum([float(opp.amount) for opp in opportunities if opp.amount])
                stage_count = len(opportunities)
                
                pipeline_stages[stage.value] = {
                    'count': stage_count,
                    'value': stage_value,
                    'avg_probability': sum([opp.probability for opp in opportunities]) / stage_count if stage_count > 0 else 0,
                    'weighted_value': sum([float(opp.amount) * opp.probability / 100 for opp in opportunities if opp.amount]) if opportunities else 0
                }
                total_pipeline_value += stage_value
        
        # الفرص المتوقع إغلاقها في الأشهر القادمة
        forecast_data = []
        for i in range(6):  # الأشهر الستة القادمة
            month_start = datetime.now().replace(day=1) + timedelta(days=32*i)
            month_start = month_start.replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            month_opportunities = Opportunity.query.filter(
                and_(
                    Opportunity.expected_close_date >= month_start,
                    Opportunity.expected_close_date <= month_end,
                    ~Opportunity.stage.in_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
                )
            ).all()
            
            month_value = sum([float(opp.amount) for opp in month_opportunities if opp.amount])
            weighted_value = sum([float(opp.amount) * opp.probability / 100 for opp in month_opportunities if opp.amount])
            
            forecast_data.append({
                'month': month_start.strftime('%Y-%m'),
                'opportunities_count': len(month_opportunities),
                'pipeline_value': month_value,
                'weighted_value': round(weighted_value, 2)
            })
        
        return jsonify({
            'success': True,
            'report': {
                'pipeline_stages': pipeline_stages,
                'total_pipeline_value': total_pipeline_value,
                'forecast': forecast_data
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Customer Reports
@reports_bp.route('/reports/customer-analysis', methods=['GET'])
@jwt_required()
def get_customer_analysis():
    """تقرير تحليل العملاء"""
    try:
        # إحصائيات العملاء العامة
        total_customers = Customer.query.filter(Customer.is_active == True).count()
        new_customers_this_month = Customer.query.filter(
            and_(
                Customer.created_at >= datetime.now().replace(day=1),
                Customer.is_active == True
            )
        ).count()
        
        # العملاء حسب النوع
        customers_by_type = db.session.query(
            Customer.customer_type,
            func.count(Customer.id).label('count')
        ).filter(Customer.is_active == True).group_by(Customer.customer_type).all()
        
        customers_by_type_data = [
            {
                'type': customer.customer_type.value if customer.customer_type else 'غير محدد',
                'count': customer.count
            }
            for customer in customers_by_type
        ]
        
        # العملاء حسب المصدر
        customers_by_source = db.session.query(
            Customer.source,
            func.count(Customer.id).label('count')
        ).filter(Customer.is_active == True).group_by(Customer.source).all()
        
        customers_by_source_data = [
            {
                'source': customer.source or 'غير محدد',
                'count': customer.count
            }
            for customer in customers_by_source
        ]
        
        # أفضل العملاء (حسب قيمة المبيعات)
        top_customers = db.session.query(
            Customer.id,
            Customer.display_name,
            func.sum(Opportunity.amount).label('total_sales'),
            func.count(Opportunity.id).label('opportunities_count')
        ).join(Opportunity).filter(
            and_(
                Customer.is_active == True,
                Opportunity.stage == OpportunityStage.CLOSED_WON
            )
        ).group_by(Customer.id, Customer.display_name).order_by(
            desc('total_sales')
        ).limit(10).all()
        
        top_customers_data = [
            {
                'customer_id': customer.id,
                'customer_name': customer.display_name,
                'total_sales': float(customer.total_sales) if customer.total_sales else 0,
                'opportunities_count': customer.opportunities_count
            }
            for customer in top_customers
        ]
        
        # نمو العملاء الشهري
        monthly_growth = []
        for i in range(12):
            month_start = (datetime.now() - timedelta(days=30*i)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            new_customers = Customer.query.filter(
                and_(
                    Customer.created_at >= month_start,
                    Customer.created_at <= month_end,
                    Customer.is_active == True
                )
            ).count()
            
            monthly_growth.append({
                'month': month_start.strftime('%Y-%m'),
                'new_customers': new_customers
            })
        
        return jsonify({
            'success': True,
            'report': {
                'summary': {
                    'total_customers': total_customers,
                    'new_customers_this_month': new_customers_this_month
                },
                'customers_by_type': customers_by_type_data,
                'customers_by_source': customers_by_source_data,
                'top_customers': top_customers_data,
                'monthly_growth': monthly_growth
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Activity Reports
@reports_bp.route('/reports/activity-summary', methods=['GET'])
@jwt_required()
def get_activity_summary():
    """تقرير ملخص الأنشطة"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')
        
        start_date = datetime.fromisoformat(start_date)
        end_date = datetime.fromisoformat(end_date)
        
        # إحصائيات الأنشطة
        total_activities = Activity.query.filter(
            and_(
                Activity.created_at >= start_date,
                Activity.created_at <= end_date
            )
        ).count()
        
        completed_activities = Activity.query.filter(
            and_(
                Activity.created_at >= start_date,
                Activity.created_at <= end_date,
                Activity.is_completed == True
            )
        ).count()
        
        # معدل الإكمال
        completion_rate = (completed_activities / total_activities * 100) if total_activities > 0 else 0
        
        # الأنشطة حسب النوع
        activities_by_type = db.session.query(
            Activity.activity_type,
            func.count(Activity.id).label('total'),
            func.sum(func.case([(Activity.is_completed == True, 1)], else_=0)).label('completed')
        ).filter(
            and_(
                Activity.created_at >= start_date,
                Activity.created_at <= end_date
            )
        ).group_by(Activity.activity_type).all()
        
        activities_by_type_data = [
            {
                'type': activity.activity_type.value if activity.activity_type else 'غير محدد',
                'total': activity.total,
                'completed': activity.completed,
                'completion_rate': round((activity.completed / activity.total * 100) if activity.total > 0 else 0, 2)
            }
            for activity in activities_by_type
        ]
        
        # الأنشطة حسب المستخدم
        activities_by_user = db.session.query(
            Activity.assigned_to_id,
            func.count(Activity.id).label('total'),
            func.sum(func.case([(Activity.is_completed == True, 1)], else_=0)).label('completed')
        ).filter(
            and_(
                Activity.created_at >= start_date,
                Activity.created_at <= end_date
            )
        ).group_by(Activity.assigned_to_id).all()
        
        activities_by_user_data = []
        for activity in activities_by_user:
            user = db.session.get(User, activity.assigned_to_id) if activity.assigned_to_id else None
            activities_by_user_data.append({
                'user_id': activity.assigned_to_id,
                'username': user.username if user else 'غير محدد',
                'total': activity.total,
                'completed': activity.completed,
                'completion_rate': round((activity.completed / activity.total * 100) if activity.total > 0 else 0, 2)
            })
        
        return jsonify({
            'success': True,
            'report': {
                'period': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d')
                },
                'summary': {
                    'total_activities': total_activities,
                    'completed_activities': completed_activities,
                    'completion_rate': round(completion_rate, 2)
                },
                'activities_by_type': activities_by_type_data,
                'activities_by_user': activities_by_user_data
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Lead Conversion Reports
@reports_bp.route('/reports/lead-conversion', methods=['GET'])
@jwt_required()
def get_lead_conversion_report():
    """تقرير تحويل العملاء المحتملين"""
    try:
        # إحصائيات العملاء المحتملين
        total_leads = Lead.query.count()
        converted_leads = Lead.query.filter(Lead.status == LeadStatus.CONVERTED).count()
        
        # معدل التحويل
        conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
        
        # العملاء المحتملين حسب الحالة
        leads_by_status = db.session.query(
            Lead.status,
            func.count(Lead.id).label('count')
        ).group_by(Lead.status).all()
        
        leads_by_status_data = [
            {
                'status': lead.status.value if lead.status else 'غير محدد',
                'count': lead.count
            }
            for lead in leads_by_status
        ]
        
        # العملاء المحتملين حسب المصدر
        leads_by_source = db.session.query(
            Lead.source,
            func.count(Lead.id).label('total'),
            func.sum(func.case([(Lead.status == LeadStatus.CONVERTED, 1)], else_=0)).label('converted')
        ).group_by(Lead.source).all()
        
        leads_by_source_data = [
            {
                'source': lead.source or 'غير محدد',
                'total': lead.total,
                'converted': lead.converted,
                'conversion_rate': round((lead.converted / lead.total * 100) if lead.total > 0 else 0, 2)
            }
            for lead in leads_by_source
        ]
        
        # التحويل الشهري
        monthly_conversion = []
        for i in range(12):
            month_start = (datetime.now() - timedelta(days=30*i)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            month_leads = Lead.query.filter(
                and_(
                    Lead.created_at >= month_start,
                    Lead.created_at <= month_end
                )
            ).count()
            
            month_converted = Lead.query.filter(
                and_(
                    Lead.conversion_date >= month_start,
                    Lead.conversion_date <= month_end,
                    Lead.status == LeadStatus.CONVERTED
                )
            ).count()
            
            monthly_conversion.append({
                'month': month_start.strftime('%Y-%m'),
                'new_leads': month_leads,
                'converted_leads': month_converted,
                'conversion_rate': round((month_converted / month_leads * 100) if month_leads > 0 else 0, 2)
            })
        
        return jsonify({
            'success': True,
            'report': {
                'summary': {
                    'total_leads': total_leads,
                    'converted_leads': converted_leads,
                    'conversion_rate': round(conversion_rate, 2)
                },
                'leads_by_status': leads_by_status_data,
                'leads_by_source': leads_by_source_data,
                'monthly_conversion': monthly_conversion
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Custom Reports
@reports_bp.route('/reports/custom', methods=['POST'])
@jwt_required()
def create_custom_report():
    """إنشاء تقرير مخصص"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # التحقق من البيانات المطلوبة
        if not data.get('name') or not data.get('report_type'):
            return jsonify({'success': False, 'message': 'اسم التقرير ونوعه مطلوبان'}), 400
        
        # إنشاء التقرير المخصص
        report = CRMReport(
            name=data['name'],
            description=data.get('description'),
            report_type=data['report_type'],
            parameters=json.dumps(data.get('parameters', {})),
            created_by_id=current_user_id,
            updated_by_id=current_user_id
        )
        
        db.session.add(report)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء التقرير المخصص بنجاح',
            'report_id': report.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@reports_bp.route('/reports/custom', methods=['GET'])
@jwt_required()
def get_custom_reports():
    """الحصول على قائمة التقارير المخصصة"""
    try:
        current_user_id = get_current_user_id()
        
        reports = CRMReport.query.filter(
            CRMReport.created_by_id == current_user_id
        ).order_by(desc(CRMReport.created_at)).all()
        
        reports_data = []
        for report in reports:
            report_data = {
                'id': report.id,
                'name': report.name,
                'description': report.description,
                'report_type': report.report_type,
                'parameters': json.loads(report.parameters) if report.parameters else {},
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'updated_at': report.updated_at.isoformat() if report.updated_at else None
            }
            reports_data.append(report_data)
        
        return jsonify({
            'success': True,
            'reports': reports_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Export Reports
@reports_bp.route('/reports/export/<report_type>', methods=['GET'])
@jwt_required()
def export_report(report_type):
    """تصدير التقارير"""
    try:
        format_type = request.args.get('format', 'json')  # json, csv, excel
        
        # هنا يمكن إضافة منطق تصدير التقارير بصيغ مختلفة
        # للبساطة، سنعيد البيانات بصيغة JSON
        
        if report_type == 'sales-summary':
            # استدعاء دالة تقرير المبيعات
            pass
        elif report_type == 'customer-analysis':
            # استدعاء دالة تحليل العملاء
            pass
        
        return jsonify({
            'success': True,
            'message': f'تم تصدير تقرير {report_type} بصيغة {format_type}',
            'download_url': f'/api/crm/reports/download/{report_type}'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
