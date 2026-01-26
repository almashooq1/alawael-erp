from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit
)
# -*- coding: utf-8 -*-
"""
API لوحة التحكم التفاعلية المتقدمة
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from advanced_dashboard_services import AdvancedDashboardService
from advanced_dashboard_models import (
    DashboardWidget, DashboardLayout, DashboardAlert, DashboardFilter,
    DashboardMetric, DashboardExport, DashboardTheme, DashboardNotification
)
from database import db
import json
from datetime import datetime

# إنشاء Blueprint
advanced_dashboard_bp = Blueprint('advanced_dashboard', __name__, url_prefix='/api/advanced-dashboard')

@advanced_dashboard_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_USER_DASHBOARD')
def get_user_dashboard():
    """الحصول على لوحة تحكم المستخدم"""
    try:
        user_id = get_jwt_identity()
        layout_id = request.args.get('layout_id', type=int)
        
        result = AdvancedDashboardService.get_user_dashboard(user_id, layout_id)
        
        return jsonify(result), 200 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/widgets', methods=['GET'])
@jwt_required()
@check_permission('view_advanced_dashboard')
@log_audit('GET_USER_WIDGETS')
def get_user_widgets():
    """الحصول على ودجات المستخدم"""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        widget_type = request.args.get('widget_type')
        
        query = DashboardWidget.query.filter_by(user_id=user_id)
        
        if widget_type:
            query = query.filter_by(widget_type=widget_type)
        
        widgets = query.order_by(
            DashboardWidget.position_y, DashboardWidget.position_x
        ).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'widgets': [widget.to_dict() for widget in widgets.items],
            'pagination': {
                'page': widgets.page,
                'pages': widgets.pages,
                'per_page': widgets.per_page,
                'total': widgets.total
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/widgets', methods=['POST'])
@jwt_required()
@check_permission('manage_advanced_dashboard')
@guard_payload_size()
@log_audit('CREATE_WIDGET')
def create_widget():
    """إنشاء ودجة جديدة"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'لا توجد بيانات'
            }), 400
        
        # التحقق من البيانات المطلوبة
        required_fields = ['widget_type', 'title']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'الحقل {field} مطلوب'
                }), 400
        
        result = AdvancedDashboardService.create_widget(user_id, data)
        
        return jsonify(result), 201 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/widgets/<int:widget_id>', methods=['PUT'])
@jwt_required()
@check_permission('manage_advanced_dashboard')
@guard_payload_size()
@log_audit('UPDATE_WIDGET')
def update_widget(widget_id):
    """تحديث ودجة"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'لا توجد بيانات'
            }), 400
        
        result = AdvancedDashboardService.update_widget(widget_id, user_id, data)
        
        return jsonify(result), 200 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/widgets/<int:widget_id>', methods=['DELETE'])
@jwt_required()
@check_permission('manage_advanced_dashboard')
@log_audit('DELETE_WIDGET')
def delete_widget(widget_id):
    """حذف ودجة"""
    try:
        user_id = get_jwt_identity()
        
        result = AdvancedDashboardService.delete_widget(widget_id, user_id)
        
        return jsonify(result), 200 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/widgets/<int:widget_id>/data', methods=['GET'])
@jwt_required()
@check_permission('view_advanced_dashboard')
@log_audit('GET_WIDGET_DATA')
def get_widget_data(widget_id):
    """الحصول على بيانات ودجة محددة"""
    try:
        user_id = get_jwt_identity()
        filters = request.args.to_dict()
        
        result = AdvancedDashboardService.get_widget_data(widget_id, user_id, filters)
        
        return jsonify(result), 200 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/layouts', methods=['GET'])
@jwt_required()
@check_permission('view_advanced_dashboard')
@log_audit('GET_USER_LAYOUTS')
def get_user_layouts():
    """الحصول على تخطيطات المستخدم"""
    try:
        user_id = get_jwt_identity()
        
        layouts = DashboardLayout.query.filter(
            (DashboardLayout.user_id == user_id) | 
            (DashboardLayout.is_public == True)
        ).order_by(DashboardLayout.is_default.desc(), DashboardLayout.name).all()
        
        return jsonify({
            'success': True,
            'layouts': [layout.to_dict() for layout in layouts]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/layouts', methods=['POST'])
@jwt_required()
@check_permission('manage_advanced_dashboard')
@guard_payload_size()
@log_audit('SAVE_LAYOUT')
def save_layout():
    """حفظ تخطيط لوحة التحكم"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'لا توجد بيانات'
            }), 400
        
        # التحقق من البيانات المطلوبة
        if 'name' not in data:
            return jsonify({
                'success': False,
                'message': 'اسم التخطيط مطلوب'
            }), 400
        
        result = AdvancedDashboardService.save_layout(user_id, data)
        
        return jsonify(result), 201 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/alerts', methods=['GET'])
@jwt_required()
@check_permission('view_advanced_dashboard')
@log_audit('GET_USER_ALERTS')
def get_user_alerts():
    """الحصول على تنبيهات المستخدم"""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        severity = request.args.get('severity')
        category = request.args.get('category')
        is_read = request.args.get('is_read', type=bool)
        
        query = DashboardAlert.query.filter_by(user_id=user_id, is_dismissed=False)
        
        if severity:
            query = query.filter_by(severity=severity)
        if category:
            query = query.filter_by(category=category)
        if is_read is not None:
            query = query.filter_by(is_read=is_read)
        
        alerts = query.order_by(
            DashboardAlert.severity.desc(), DashboardAlert.created_at.desc()
        ).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'alerts': [alert.to_dict() for alert in alerts.items],
            'pagination': {
                'page': alerts.page,
                'pages': alerts.pages,
                'per_page': alerts.per_page,
                'total': alerts.total
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/alerts', methods=['POST'])
@jwt_required()
@check_permission('manage_advanced_dashboard')
@guard_payload_size()
@log_audit('CREATE_ALERT')
def create_alert():
    """إنشاء تنبيه جديد"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'لا توجد بيانات'
            }), 400
        
        # التحقق من البيانات المطلوبة
        required_fields = ['alert_type', 'title', 'message']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'الحقل {field} مطلوب'
                }), 400
        
        result = AdvancedDashboardService.create_alert(user_id, data)
        
        return jsonify(result), 201 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/alerts/<int:alert_id>/read', methods=['PUT'])
@jwt_required()
@check_permission('manage_advanced_dashboard')
@guard_payload_size()
@log_audit('MARK_ALERT_READ')
def mark_alert_read(alert_id):
    """تمييز التنبيه كمقروء"""
    try:
        user_id = get_jwt_identity()
        
        result = AdvancedDashboardService.mark_alert_read(alert_id, user_id)
        
        return jsonify(result), 200 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/alerts/<int:alert_id>/dismiss', methods=['PUT'])
@jwt_required()
@check_permission('manage_advanced_dashboard')
@guard_payload_size()
@log_audit('DISMISS_ALERT')
def dismiss_alert(alert_id):
    """إخفاء التنبيه"""
    try:
        user_id = get_jwt_identity()
        
        result = AdvancedDashboardService.dismiss_alert(alert_id, user_id)
        
        return jsonify(result), 200 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/notifications', methods=['GET'])
@jwt_required()
@check_permission('view_advanced_dashboard')
@log_audit('GET_USER_NOTIFICATIONS')
def get_user_notifications():
    """الحصول على إشعارات المستخدم"""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        is_read = request.args.get('is_read', type=bool)
        
        query = DashboardNotification.query.filter_by(user_id=user_id)
        
        if is_read is not None:
            query = query.filter_by(is_read=is_read)
        
        notifications = query.order_by(
            DashboardNotification.created_at.desc()
        ).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'notifications': [notification.to_dict() for notification in notifications.items],
            'pagination': {
                'page': notifications.page,
                'pages': notifications.pages,
                'per_page': notifications.per_page,
                'total': notifications.total
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/themes', methods=['GET'])
def get_dashboard_themes():
    """الحصول على سمات لوحة التحكم المتاحة"""
    try:
        result = AdvancedDashboardService.get_dashboard_themes()
        
        return jsonify(result), 200 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/export', methods=['POST'])
@jwt_required()
@check_permission('access_advanced_dashboard')
@log_audit('EXPORT_DASHBOARD')
def export_dashboard():
    """تصدير لوحة التحكم"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'لا توجد بيانات'
            }), 400
        
        # التحقق من البيانات المطلوبة
        required_fields = ['export_type', 'export_name']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'الحقل {field} مطلوب'
                }), 400
        
        result = AdvancedDashboardService.export_dashboard(user_id, data)
        
        return jsonify(result), 201 if result['success'] else 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/metrics', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_DASHBOARD_METRICS')
def get_dashboard_metrics():
    """الحصول على مقاييس لوحة التحكم"""
    try:
        category = request.args.get('category')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = DashboardMetric.query
        
        if category:
            query = query.filter_by(metric_category=category)
        
        if start_date:
            start_date = datetime.fromisoformat(start_date)
            query = query.filter(DashboardMetric.calculation_date >= start_date)
        
        if end_date:
            end_date = datetime.fromisoformat(end_date)
            query = query.filter(DashboardMetric.calculation_date <= end_date)
        
        metrics = query.order_by(DashboardMetric.calculation_date.desc()).all()
        
        return jsonify({
            'success': True,
            'metrics': [metric.to_dict() for metric in metrics]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/filters', methods=['GET'])
@jwt_required()
@check_permission('view_advanced_dashboard')
@log_audit('GET_USER_FILTERS')
def get_user_filters():
    """الحصول على فلاتر المستخدم"""
    try:
        user_id = get_jwt_identity()
        
        filters = DashboardFilter.query.filter_by(
            user_id=user_id, is_active=True
        ).order_by(DashboardFilter.name).all()
        
        return jsonify({
            'success': True,
            'filters': [filter_obj.to_dict() for filter_obj in filters]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/filters', methods=['POST'])
@jwt_required()
@check_permission('manage_advanced_dashboard')
@guard_payload_size()
@log_audit('CREATE_FILTER')
def create_filter():
    """إنشاء فلتر جديد"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'لا توجد بيانات'
            }), 400
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name', 'filter_type', 'filter_config']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'الحقل {field} مطلوب'
                }), 400
        
        filter_obj = DashboardFilter(
            user_id=user_id,
            name=data['name'],
            description=data.get('description'),
            filter_type=data['filter_type'],
            filter_config=json.dumps(data['filter_config']),
            applies_to=json.dumps(data.get('applies_to', [])),
            is_global=data.get('is_global', False)
        )
        
        db.session.add(filter_obj)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الفلتر بنجاح',
            'filter': filter_obj.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500

@advanced_dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_DASHBOARD_STATS')
def get_dashboard_stats():
    """الحصول على إحصائيات لوحة التحكم"""
    try:
        user_id = get_jwt_identity()
        
        # إحصائيات الودجات
        total_widgets = DashboardWidget.query.filter_by(user_id=user_id).count()
        visible_widgets = DashboardWidget.query.filter_by(
            user_id=user_id, is_visible=True
        ).count()
        
        # إحصائيات التنبيهات
        total_alerts = DashboardAlert.query.filter_by(
            user_id=user_id, is_dismissed=False
        ).count()
        unread_alerts = DashboardAlert.query.filter_by(
            user_id=user_id, is_read=False, is_dismissed=False
        ).count()
        
        # إحصائيات التخطيطات
        total_layouts = DashboardLayout.query.filter_by(user_id=user_id).count()
        
        # إحصائيات الإشعارات
        unread_notifications = DashboardNotification.query.filter_by(
            user_id=user_id, is_read=False
        ).count()
        
        return jsonify({
            'success': True,
            'stats': {
                'widgets': {
                    'total': total_widgets,
                    'visible': visible_widgets,
                    'hidden': total_widgets - visible_widgets
                },
                'alerts': {
                    'total': total_alerts,
                    'unread': unread_alerts,
                    'read': total_alerts - unread_alerts
                },
                'layouts': {
                    'total': total_layouts
                },
                'notifications': {
                    'unread': unread_notifications
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500
