from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit
)
"""
واجهة برمجة التطبيقات لنظام ربط الفروع
Branch Integration API
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date
import logging

from branch_integration_services import (
    BranchIntegrationService, BranchConnectionService, DataSyncService,
    StudentTransferService, SharedResourceService, InterBranchReportService,
    BranchDashboardService
)
from branch_integration_models import (
    Branch, BranchConnection, DataSyncLog, StudentTransfer,
    SharedResource, ResourceAccess, InterBranchReport
)

# إنشاء Blueprint
branch_integration_bp = Blueprint('branch_integration', __name__, url_prefix='/api/branch-integration')
logger = logging.getLogger(__name__)

# ==================== إدارة الفروع ====================

@branch_integration_bp.route('/branches', methods=['GET'])
@jwt_required()
@check_permission('view_branch_integration')
@log_audit('GET_BRANCHES')
def get_branches():
    """الحصول على جميع الفروع"""
    try:
        branches = BranchIntegrationService.get_all_branches()
        return jsonify({
            'success': True,
            'data': [branch.to_dict() for branch in branches],
            'total': len(branches)
        })
    except Exception as e:
        logger.error(f"خطأ في الحصول على الفروع: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/branches', methods=['POST'])
@jwt_required()
@check_permission('manage_branch_integration')
@guard_payload_size()
@log_audit('CREATE_BRANCH')
def create_branch():
    """إنشاء فرع جديد"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name', 'code']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'الحقل {field} مطلوب'}), 400
        
        branch = BranchIntegrationService.create_branch(data)
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الفرع بنجاح',
            'data': branch.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء الفرع: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/branches/<int:branch_id>', methods=['GET'])
@jwt_required()
@check_permission('view_branch_integration')
@log_audit('GET_BRANCH')
def get_branch(branch_id):
    """الحصول على تفاصيل فرع"""
    try:
        branch = Branch.query.get(branch_id)
        if not branch:
            return jsonify({'success': False, 'message': 'الفرع غير موجود'}), 404
        
        return jsonify({
            'success': True,
            'data': branch.to_dict()
        })
    except Exception as e:
        logger.error(f"خطأ في الحصول على الفرع: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/branches/<int:branch_id>/status', methods=['PUT'])
@jwt_required()
@check_permission('manage_branch_integration')
@guard_payload_size()
@log_audit('UPDATE_BRANCH_STATUS')
def update_branch_status(branch_id):
    """تحديث حالة الفرع"""
    try:
        data = request.get_json()
        status = data.get('status')
        
        if not status:
            return jsonify({'success': False, 'message': 'حالة الفرع مطلوبة'}), 400
        
        success = BranchIntegrationService.update_branch_status(branch_id, status)
        
        if success:
            return jsonify({'success': True, 'message': 'تم تحديث حالة الفرع بنجاح'})
        else:
            return jsonify({'success': False, 'message': 'فشل في تحديث حالة الفرع'}), 400
            
    except Exception as e:
        logger.error(f"خطأ في تحديث حالة الفرع: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== إدارة الاتصالات ====================

@branch_integration_bp.route('/connections', methods=['GET'])
@jwt_required()
@check_permission('view_branch_integration')
@log_audit('GET_CONNECTIONS')
def get_connections():
    """الحصول على جميع الاتصالات"""
    try:
        branch_id = request.args.get('branch_id', type=int)
        
        if branch_id:
            connections = BranchConnectionService.get_branch_connections(branch_id)
        else:
            connections = BranchConnection.query.all()
        
        return jsonify({
            'success': True,
            'data': [conn.to_dict() for conn in connections],
            'total': len(connections)
        })
    except Exception as e:
        logger.error(f"خطأ في الحصول على الاتصالات: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/connections', methods=['POST'])
@jwt_required()
@check_permission('manage_branch_integration')
@guard_payload_size()
@log_audit('CREATE_CONNECTION')
def create_connection():
    """إنشاء اتصال بين فرعين"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['source_branch_id', 'target_branch_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'الحقل {field} مطلوب'}), 400
        
        connection = BranchConnectionService.create_connection(data)
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الاتصال بنجاح',
            'data': connection.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء الاتصال: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/connections/<int:connection_id>/toggle', methods=['PUT'])
@jwt_required()
@check_permission('manage_branch_integration')
@guard_payload_size()
@log_audit('TOGGLE_CONNECTION')
def toggle_connection(connection_id):
    """تفعيل/إلغاء تفعيل الاتصال"""
    try:
        success = BranchConnectionService.toggle_connection_status(connection_id)
        
        if success:
            return jsonify({'success': True, 'message': 'تم تغيير حالة الاتصال بنجاح'})
        else:
            return jsonify({'success': False, 'message': 'فشل في تغيير حالة الاتصال'}), 400
            
    except Exception as e:
        logger.error(f"خطأ في تغيير حالة الاتصال: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== مزامنة البيانات ====================

@branch_integration_bp.route('/sync/<int:connection_id>', methods=['POST'])
@jwt_required()
@check_permission('manage_branch_integration')
@guard_payload_size()
@log_audit('SYNC_DATA')
def sync_data(connection_id):
    """تنفيذ مزامنة البيانات"""
    try:
        data = request.get_json() or {}
        sync_type = data.get('sync_type', 'all')
        
        sync_log = DataSyncService.sync_data(connection_id, sync_type)
        
        return jsonify({
            'success': True,
            'message': 'تمت المزامنة بنجاح',
            'data': sync_log.to_dict()
        })
        
    except Exception as e:
        logger.error(f"خطأ في المزامنة: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/sync/history/<int:connection_id>', methods=['GET'])
@jwt_required()
@check_permission('view_branch_integration')
@log_audit('GET_SYNC_HISTORY')
def get_sync_history(connection_id):
    """الحصول على تاريخ المزامنة"""
    try:
        limit = request.args.get('limit', 50, type=int)
        history = DataSyncService.get_sync_history(connection_id, limit)
        
        return jsonify({
            'success': True,
            'data': [log.to_dict() for log in history],
            'total': len(history)
        })
    except Exception as e:
        logger.error(f"خطأ في الحصول على تاريخ المزامنة: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/sync/pending', methods=['GET'])
@jwt_required()
@check_permission('view_branch_integration')
@log_audit('GET_PENDING_SYNCS')
def get_pending_syncs():
    """الحصول على المزامنات المعلقة"""
    try:
        pending = DataSyncService.get_pending_syncs()
        
        return jsonify({
            'success': True,
            'data': [conn.to_dict() for conn in pending],
            'total': len(pending)
        })
    except Exception as e:
        logger.error(f"خطأ في الحصول على المزامنات المعلقة: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== نقل الطلاب ====================

@branch_integration_bp.route('/transfers', methods=['GET'])
@jwt_required()
@check_permission('view_branch_integration')
@log_audit('GET_TRANSFERS')
def get_transfers():
    """الحصول على طلبات النقل"""
    try:
        branch_id = request.args.get('branch_id', type=int)
        status = request.args.get('status')
        
        if status == 'pending':
            transfers = StudentTransferService.get_pending_transfers(branch_id)
        else:
            query = StudentTransfer.query
            if branch_id:
                query = query.filter(
                    (StudentTransfer.from_branch_id == branch_id) |
                    (StudentTransfer.to_branch_id == branch_id)
                )
            transfers = query.order_by(StudentTransfer.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'data': [transfer.to_dict() for transfer in transfers],
            'total': len(transfers)
        })
    except Exception as e:
        logger.error(f"خطأ في الحصول على طلبات النقل: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/transfers', methods=['POST'])
@jwt_required()
@check_permission('manage_branch_integration')
@guard_payload_size()
@log_audit('REQUEST_TRANSFER')
def request_transfer():
    """طلب نقل طالب"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['student_id', 'from_branch_id', 'to_branch_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'الحقل {field} مطلوب'}), 400
        
        transfer = StudentTransferService.request_transfer(data, user_id)
        
        return jsonify({
            'success': True,
            'message': 'تم طلب النقل بنجاح',
            'data': transfer.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في طلب النقل: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/transfers/<int:transfer_id>/approve', methods=['PUT'])
@jwt_required()
@check_permission('manage_branch_integration')
@guard_payload_size()
@log_audit('APPROVE_TRANSFER')
def approve_transfer(transfer_id):
    """الموافقة على نقل الطالب"""
    try:
        data = request.get_json() or {}
        user_id = get_jwt_identity()
        admin_notes = data.get('admin_notes')
        
        success = StudentTransferService.approve_transfer(transfer_id, user_id, admin_notes)
        
        if success:
            return jsonify({'success': True, 'message': 'تمت الموافقة على النقل بنجاح'})
        else:
            return jsonify({'success': False, 'message': 'فشل في الموافقة على النقل'}), 400
            
    except Exception as e:
        logger.error(f"خطأ في الموافقة على النقل: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/transfers/<int:transfer_id>/execute', methods=['PUT'])
@jwt_required()
@check_permission('manage_branch_integration')
@guard_payload_size()
@log_audit('EXECUTE_TRANSFER')
def execute_transfer(transfer_id):
    """تنفيذ نقل الطالب"""
    try:
        success = StudentTransferService.execute_transfer(transfer_id)
        
        if success:
            return jsonify({'success': True, 'message': 'تم تنفيذ النقل بنجاح'})
        else:
            return jsonify({'success': False, 'message': 'فشل في تنفيذ النقل'}), 400
            
    except Exception as e:
        logger.error(f"خطأ في تنفيذ النقل: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== الموارد المشتركة ====================

@branch_integration_bp.route('/resources', methods=['GET'])
@jwt_required()
@check_permission('view_branch_integration')
@log_audit('GET_RESOURCES')
def get_resources():
    """الحصول على الموارد المشتركة"""
    try:
        branch_id = request.args.get('branch_id', type=int)
        resource_type = request.args.get('type')
        
        if branch_id:
            resources = SharedResourceService.get_available_resources(branch_id)
        else:
            query = SharedResource.query
            if resource_type:
                query = query.filter_by(resource_type=resource_type)
            resources = query.all()
        
        return jsonify({
            'success': True,
            'data': [resource.to_dict() for resource in resources],
            'total': len(resources)
        })
    except Exception as e:
        logger.error(f"خطأ في الحصول على الموارد: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/resources', methods=['POST'])
@jwt_required()
@check_permission('manage_branch_integration')
@guard_payload_size()
@log_audit('CREATE_RESOURCE')
def create_resource():
    """إنشاء مورد مشترك"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        branch_id = data.get('branch_id')  # يجب تمرير معرف الفرع
        
        # التحقق من البيانات المطلوبة
        if not data.get('name'):
            return jsonify({'success': False, 'message': 'اسم المورد مطلوب'}), 400
        
        if not branch_id:
            return jsonify({'success': False, 'message': 'معرف الفرع مطلوب'}), 400
        
        resource = SharedResourceService.create_resource(data, user_id, branch_id)
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء المورد بنجاح',
            'data': resource.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء المورد: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/resources/<int:resource_id>/access', methods=['POST'])
@jwt_required()
@check_permission('manage_branch_integration')
@guard_payload_size()
@log_audit('REQUEST_RESOURCE_ACCESS')
def request_resource_access(resource_id):
    """طلب الوصول لمورد"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        branch_id = data.get('branch_id')
        access_type = data.get('access_type', 'read')
        
        if not branch_id:
            return jsonify({'success': False, 'message': 'معرف الفرع مطلوب'}), 400
        
        access = SharedResourceService.request_access(resource_id, branch_id, user_id, access_type)
        
        return jsonify({
            'success': True,
            'message': 'تم طلب الوصول بنجاح',
            'data': access.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في طلب الوصول: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/resources/access/<int:access_id>/approve', methods=['PUT'])
@jwt_required()
@check_permission('manage_branch_integration')
@guard_payload_size()
@log_audit('APPROVE_RESOURCE_ACCESS')
def approve_resource_access(access_id):
    """الموافقة على طلب الوصول للمورد"""
    try:
        user_id = get_jwt_identity()
        success = SharedResourceService.approve_access(access_id, user_id)
        
        if success:
            return jsonify({'success': True, 'message': 'تمت الموافقة على الوصول بنجاح'})
        else:
            return jsonify({'success': False, 'message': 'فشل في الموافقة على الوصول'}), 400
            
    except Exception as e:
        logger.error(f"خطأ في الموافقة على الوصول: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== التقارير المشتركة ====================

@branch_integration_bp.route('/reports', methods=['GET'])
@jwt_required()
@check_permission('view_reports')
@log_audit('GET_REPORTS')
def get_reports():
    """الحصول على التقارير المشتركة"""
    try:
        branch_id = request.args.get('branch_id', type=int)
        
        if branch_id:
            reports = InterBranchReportService.get_branch_reports(branch_id)
        else:
            reports = InterBranchReport.query.order_by(InterBranchReport.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'data': [report.to_dict() for report in reports],
            'total': len(reports)
        })
    except Exception as e:
        logger.error(f"خطأ في الحصول على التقارير: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/reports', methods=['POST'])
@jwt_required()
@check_permission('manage_branch_integration')
@guard_payload_size()
@log_audit('CREATE_REPORT')
def create_report():
    """إنشاء تقرير مشترك"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        branch_id = data.get('branch_id')
        
        # التحقق من البيانات المطلوبة
        required_fields = ['title', 'included_branches', 'report_period_start', 'report_period_end']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'الحقل {field} مطلوب'}), 400
        
        if not branch_id:
            return jsonify({'success': False, 'message': 'معرف الفرع مطلوب'}), 400
        
        report = InterBranchReportService.generate_consolidated_report(data, user_id, branch_id)
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء التقرير بنجاح',
            'data': report.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء التقرير: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== لوحة التحكم ====================

@branch_integration_bp.route('/dashboard/<int:branch_id>', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_BRANCH_DASHBOARD')
def get_branch_dashboard(branch_id):
    """الحصول على لوحة تحكم الفرع"""
    try:
        dashboard_data = BranchDashboardService.get_branch_overview(branch_id)
        
        return jsonify({
            'success': True,
            'data': dashboard_data
        })
    except Exception as e:
        logger.error(f"خطأ في الحصول على لوحة التحكم: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@branch_integration_bp.route('/network-topology', methods=['GET'])
@jwt_required()
@check_permission('view_branch_integration')
@log_audit('GET_NETWORK_TOPOLOGY')
def get_network_topology():
    """الحصول على طوبولوجيا شبكة الفروع"""
    try:
        branch_id = request.args.get('branch_id', type=int)
        topology = BranchDashboardService.get_network_topology(branch_id)
        
        return jsonify({
            'success': True,
            'data': topology
        })
    except Exception as e:
        logger.error(f"خطأ في الحصول على طوبولوجيا الشبكة: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== معالج الأخطاء ====================

@branch_integration_bp.errorhandler(400)
def bad_request(error):
    return jsonify({'success': False, 'message': 'طلب غير صحيح'}), 400

@branch_integration_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({'success': False, 'message': 'غير مصرح'}), 401

@branch_integration_bp.errorhandler(403)
def forbidden(error):
    return jsonify({'success': False, 'message': 'ممنوع'}), 403

@branch_integration_bp.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'غير موجود'}), 404

@branch_integration_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': 'خطأ داخلي في الخادم'}), 500
