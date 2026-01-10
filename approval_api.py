"""
API endpoints لنظام الموافقات متعدد المستويات
Multi-Level Approval System API Endpoints
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import and_, or_, desc
from app import db
from approval_models import (
    ApprovalWorkflow, ApprovalStep, ApprovalRequest, ApprovalHistory,
    ApprovalDelegate, ApprovalNotification, ApprovalStatus, ApprovalType
)
from approval_services import approval_engine
import logging

logger = logging.getLogger(__name__)

approval_bp = Blueprint('approval', __name__, url_prefix='/api/approval')

@approval_bp.route('/workflows', methods=['GET'])
@jwt_required()
def get_workflows():
    """الحصول على قائمة سير العمل"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        entity_type = request.args.get('entity_type')
        is_active = request.args.get('is_active', type=bool)
        
        query = ApprovalWorkflow.query
        
        if entity_type:
            query = query.filter(ApprovalWorkflow.entity_type == entity_type)
        if is_active is not None:
            query = query.filter(ApprovalWorkflow.is_active == is_active)
        
        workflows = query.order_by(desc(ApprovalWorkflow.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'workflows': [workflow.to_dict() for workflow in workflows.items],
            'total': workflows.total,
            'pages': workflows.pages,
            'current_page': page
        })
        
    except Exception as e:
        logger.error(f"خطأ في جلب سير العمل: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/workflows', methods=['POST'])
@jwt_required()
def create_workflow():
    """إنشاء سير عمل جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name', 'entity_type', 'approval_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'الحقل {field} مطلوب'}), 400
        
        # إنشاء سير العمل
        workflow = ApprovalWorkflow(
            name=data['name'],
            description=data.get('description'),
            entity_type=data['entity_type'],
            approval_type=ApprovalType(data['approval_type']),
            conditions=data.get('conditions', {}),
            timeout_hours=data.get('timeout_hours', 24),
            escalation_enabled=data.get('escalation_enabled', False),
            escalation_hours=data.get('escalation_hours', 48),
            created_by=current_user_id
        )
        
        db.session.add(workflow)
        db.session.flush()
        
        # إضافة خطوات الموافقة
        steps_data = data.get('steps', [])
        for step_data in steps_data:
            step = ApprovalStep(
                workflow_id=workflow.id,
                step_name=step_data['step_name'],
                step_order=step_data['step_order'],
                approver_type=step_data['approver_type'],
                approver_id=step_data['approver_id'],
                conditions=step_data.get('conditions', {}),
                timeout_hours=step_data.get('timeout_hours', 24),
                escalation_enabled=step_data.get('escalation_enabled', False),
                created_by=current_user_id
            )
            db.session.add(step)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'workflow': workflow.to_dict(),
            'message': 'تم إنشاء سير العمل بنجاح'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"خطأ في إنشاء سير العمل: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/workflows/<int:workflow_id>', methods=['GET'])
@jwt_required()
def get_workflow(workflow_id):
    """الحصول على تفاصيل سير العمل"""
    try:
        workflow = ApprovalWorkflow.query.get_or_404(workflow_id)
        return jsonify({
            'success': True,
            'workflow': workflow.to_dict()
        })
        
    except Exception as e:
        logger.error(f"خطأ في جلب سير العمل: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/requests', methods=['POST'])
@jwt_required()
def submit_request():
    """تقديم طلب موافقة"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['entity_type', 'entity_id', 'title']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'الحقل {field} مطلوب'}), 400
        
        result = approval_engine.submit_request(
            entity_type=data['entity_type'],
            entity_id=data['entity_id'],
            requester_id=current_user_id,
            title=data['title'],
            description=data.get('description'),
            amount=data.get('amount'),
            metadata=data.get('metadata', {})
        )
        
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"خطأ في تقديم طلب الموافقة: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/requests', methods=['GET'])
@jwt_required()
def get_requests():
    """الحصول على قائمة الطلبات"""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        status = request.args.get('status')
        entity_type = request.args.get('entity_type')
        my_requests = request.args.get('my_requests', type=bool)
        pending_for_me = request.args.get('pending_for_me', type=bool)
        
        query = ApprovalRequest.query
        
        if my_requests:
            query = query.filter(ApprovalRequest.requester_id == current_user_id)
        elif pending_for_me:
            # الطلبات المعلقة للمستخدم الحالي
            pending_requests = approval_engine.get_pending_requests(current_user_id)
            request_ids = [req['id'] for req in pending_requests]
            query = query.filter(ApprovalRequest.id.in_(request_ids))
        
        if status:
            query = query.filter(ApprovalRequest.status == ApprovalStatus(status))
        if entity_type:
            query = query.filter(ApprovalRequest.entity_type == entity_type)
        
        requests_page = query.order_by(desc(ApprovalRequest.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'requests': [req.to_dict() for req in requests_page.items],
            'total': requests_page.total,
            'pages': requests_page.pages,
            'current_page': page
        })
        
    except Exception as e:
        logger.error(f"خطأ في جلب الطلبات: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/requests/<int:request_id>', methods=['GET'])
@jwt_required()
def get_request(request_id):
    """الحصول على تفاصيل الطلب"""
    try:
        approval_request = ApprovalRequest.query.get_or_404(request_id)
        
        # جلب تاريخ الموافقات
        history = ApprovalHistory.query.filter(
            ApprovalHistory.request_id == request_id
        ).order_by(ApprovalHistory.created_at).all()
        
        return jsonify({
            'success': True,
            'request': approval_request.to_dict(),
            'history': [h.to_dict() for h in history]
        })
        
    except Exception as e:
        logger.error(f"خطأ في جلب تفاصيل الطلب: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/requests/<int:request_id>/approve', methods=['POST'])
@jwt_required()
def approve_request(request_id):
    """الموافقة على الطلب"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        
        result = approval_engine.approve_request(
            request_id=request_id,
            approver_id=current_user_id,
            comments=data.get('comments')
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"خطأ في الموافقة على الطلب: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/requests/<int:request_id>/reject', methods=['POST'])
@jwt_required()
def reject_request(request_id):
    """رفض الطلب"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'reason' not in data:
            return jsonify({'success': False, 'error': 'سبب الرفض مطلوب'}), 400
        
        result = approval_engine.reject_request(
            request_id=request_id,
            approver_id=current_user_id,
            reason=data['reason']
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"خطأ في رفض الطلب: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/requests/<int:request_id>/delegate', methods=['POST'])
@jwt_required()
def delegate_request(request_id):
    """تفويض الموافقة"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        required_fields = ['delegate_id', 'reason']
        for field in required_fields:
            if not data or field not in data:
                return jsonify({'success': False, 'error': f'الحقل {field} مطلوب'}), 400
        
        result = approval_engine.delegate_approval(
            request_id=request_id,
            delegator_id=current_user_id,
            delegate_id=data['delegate_id'],
            reason=data['reason']
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"خطأ في تفويض الموافقة: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/delegates', methods=['GET'])
@jwt_required()
def get_delegates():
    """الحصول على قائمة التفويضات"""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        is_active = request.args.get('is_active', type=bool)
        
        query = ApprovalDelegate.query.filter(
            or_(
                ApprovalDelegate.delegator_id == current_user_id,
                ApprovalDelegate.delegate_id == current_user_id
            )
        )
        
        if is_active is not None:
            query = query.filter(ApprovalDelegate.is_active == is_active)
        
        delegates = query.order_by(desc(ApprovalDelegate.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'delegates': [delegate.to_dict() for delegate in delegates.items],
            'total': delegates.total,
            'pages': delegates.pages,
            'current_page': page
        })
        
    except Exception as e:
        logger.error(f"خطأ في جلب التفويضات: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/delegates', methods=['POST'])
@jwt_required()
def create_delegate():
    """إنشاء تفويض جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        required_fields = ['delegate_id', 'start_date', 'end_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'الحقل {field} مطلوب'}), 400
        
        delegate = ApprovalDelegate(
            delegator_id=current_user_id,
            delegate_id=data['delegate_id'],
            start_date=datetime.fromisoformat(data['start_date']),
            end_date=datetime.fromisoformat(data['end_date']),
            reason=data.get('reason'),
            conditions=data.get('conditions', {}),
            created_by=current_user_id
        )
        
        db.session.add(delegate)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'delegate': delegate.to_dict(),
            'message': 'تم إنشاء التفويض بنجاح'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"خطأ في إنشاء التفويض: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/delegates/<int:delegate_id>', methods=['PUT'])
@jwt_required()
def update_delegate(delegate_id):
    """تحديث التفويض"""
    try:
        current_user_id = get_jwt_identity()
        delegate = ApprovalDelegate.query.get_or_404(delegate_id)
        
        # التحقق من الصلاحية
        if delegate.delegator_id != current_user_id:
            return jsonify({'success': False, 'error': 'ليس لديك صلاحية تعديل هذا التفويض'}), 403
        
        data = request.get_json()
        
        if 'is_active' in data:
            delegate.is_active = data['is_active']
        if 'end_date' in data:
            delegate.end_date = datetime.fromisoformat(data['end_date'])
        if 'reason' in data:
            delegate.reason = data['reason']
        
        delegate.updated_at = datetime.utcnow()
        delegate.updated_by = current_user_id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'delegate': delegate.to_dict(),
            'message': 'تم تحديث التفويض بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"خطأ في تحديث التفويض: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """الحصول على الإشعارات"""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        is_read = request.args.get('is_read', type=bool)
        
        query = ApprovalNotification.query.filter(
            ApprovalNotification.recipient_id == current_user_id
        )
        
        if is_read is not None:
            query = query.filter(ApprovalNotification.is_read == is_read)
        
        notifications = query.order_by(desc(ApprovalNotification.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'notifications': [notif.to_dict() for notif in notifications.items],
            'total': notifications.total,
            'pages': notifications.pages,
            'current_page': page
        })
        
    except Exception as e:
        logger.error(f"خطأ في جلب الإشعارات: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notification_id):
    """تحديد الإشعار كمقروء"""
    try:
        current_user_id = get_jwt_identity()
        notification = ApprovalNotification.query.get_or_404(notification_id)
        
        if notification.recipient_id != current_user_id:
            return jsonify({'success': False, 'error': 'ليس لديك صلاحية لهذا الإشعار'}), 403
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديد الإشعار كمقروء'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"خطأ في تحديث الإشعار: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """لوحة تحكم الموافقات"""
    try:
        current_user_id = get_jwt_identity()
        
        # إحصائيات عامة
        total_requests = ApprovalRequest.query.count()
        pending_requests = ApprovalRequest.query.filter(
            ApprovalRequest.status == ApprovalStatus.PENDING
        ).count()
        
        my_requests = ApprovalRequest.query.filter(
            ApprovalRequest.requester_id == current_user_id
        ).count()
        
        # الطلبات المعلقة للمستخدم
        pending_for_me = len(approval_engine.get_pending_requests(current_user_id))
        
        # الإشعارات غير المقروءة
        unread_notifications = ApprovalNotification.query.filter(
            and_(
                ApprovalNotification.recipient_id == current_user_id,
                ApprovalNotification.is_read == False
            )
        ).count()
        
        # الطلبات الأخيرة
        recent_requests = ApprovalRequest.query.filter(
            ApprovalRequest.requester_id == current_user_id
        ).order_by(desc(ApprovalRequest.created_at)).limit(5).all()
        
        # إحصائيات حسب الحالة
        status_stats = {}
        for status in ApprovalStatus:
            count = ApprovalRequest.query.filter(
                ApprovalRequest.status == status
            ).count()
            status_stats[status.value] = count
        
        return jsonify({
            'success': True,
            'stats': {
                'total_requests': total_requests,
                'pending_requests': pending_requests,
                'my_requests': my_requests,
                'pending_for_me': pending_for_me,
                'unread_notifications': unread_notifications
            },
            'status_stats': status_stats,
            'recent_requests': [req.to_dict() for req in recent_requests]
        })
        
    except Exception as e:
        logger.error(f"خطأ في جلب لوحة التحكم: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@approval_bp.route('/entity-types', methods=['GET'])
@jwt_required()
def get_entity_types():
    """الحصول على أنواع الكيانات المتاحة"""
    try:
        entity_types = [
            {'value': 'expense', 'label': 'المصروفات'},
            {'value': 'purchase', 'label': 'المشتريات'},
            {'value': 'leave_request', 'label': 'طلبات الإجازة'},
            {'value': 'budget_allocation', 'label': 'تخصيص الميزانية'},
            {'value': 'contract', 'label': 'العقود'},
            {'value': 'recruitment', 'label': 'التوظيف'},
            {'value': 'training', 'label': 'التدريب'},
            {'value': 'maintenance', 'label': 'الصيانة'},
            {'value': 'document', 'label': 'الوثائق'},
            {'value': 'policy', 'label': 'السياسات'}
        ]
        
        return jsonify({
            'success': True,
            'entity_types': entity_types
        })
        
    except Exception as e:
        logger.error(f"خطأ في جلب أنواع الكيانات: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# معالج الأخطاء
@approval_bp.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'المورد غير موجود'}), 404

@approval_bp.errorhandler(403)
def forbidden(error):
    return jsonify({'success': False, 'error': 'ليس لديك صلاحية للوصول'}), 403

@approval_bp.errorhandler(400)
def bad_request(error):
    return jsonify({'success': False, 'error': 'طلب غير صحيح'}), 400
