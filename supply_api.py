# -*- coding: utf-8 -*-
"""
API endpoints لنظام طلب الإمداد بالمواد
Supply Request Management API Endpoints
"""

from datetime import datetime, timedelta
from flask import request, jsonify, render_template
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid
import json

from app import app, db
from models import User, Clinic
from supply_models import (
    SupplyCategory, SupplyItem, BranchInventory, SupplyRequest, SupplyRequestItem,
    SupplyTransfer, SupplyTransferItem, SupplyNotification
)

# ==================== Supply Request Management API Endpoints ====================

@app.route('/supply-management')
@jwt_required()
def supply_management():
    """صفحة إدارة نظام الإمداد"""
    return render_template('supply_management.html')

# Supply Categories API
@app.route('/api/supply-categories', methods=['GET'])
@jwt_required()
def get_supply_categories():
    """الحصول على فئات المواد"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        
        query = SupplyCategory.query
        
        if search:
            query = query.filter(SupplyCategory.category_name.contains(search))
        
        query = query.filter(SupplyCategory.is_active == True)
        categories = query.order_by(SupplyCategory.sort_order, SupplyCategory.category_name).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'categories': [{
                'id': cat.id,
                'category_name': cat.category_name,
                'category_name_en': cat.category_name_en,
                'description': cat.description,
                'parent_category_id': cat.parent_category_id,
                'sort_order': cat.sort_order,
                'created_at': cat.created_at.isoformat() if cat.created_at else None
            } for cat in categories.items],
            'total': categories.total,
            'pages': categories.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/supply-categories', methods=['POST'])
@jwt_required()
def create_supply_category():
    """إنشاء فئة مواد جديدة"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        category = SupplyCategory(
            category_name=data['category_name'],
            category_name_en=data.get('category_name_en'),
            description=data.get('description'),
            parent_category_id=data.get('parent_category_id'),
            sort_order=data.get('sort_order', 0),
            created_by=current_user_id
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الفئة بنجاح',
            'category_id': category.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# Supply Items API
@app.route('/api/supply-items', methods=['GET'])
@jwt_required()
def get_supply_items():
    """الحصول على المواد والإمدادات"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        category_id = request.args.get('category_id', type=int)
        
        query = SupplyItem.query
        
        if search:
            query = query.filter(
                db.or_(
                    SupplyItem.item_name.contains(search),
                    SupplyItem.item_code.contains(search)
                )
            )
        
        if category_id:
            query = query.filter(SupplyItem.category_id == category_id)
        
        query = query.filter(SupplyItem.is_active == True)
        items = query.order_by(SupplyItem.item_name).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'items': [{
                'id': item.id,
                'item_code': item.item_code,
                'item_name': item.item_name,
                'item_name_en': item.item_name_en,
                'description': item.description,
                'category_id': item.category_id,
                'category_name': item.category.category_name if item.category else None,
                'unit_of_measure': item.unit_of_measure,
                'unit_cost': float(item.unit_cost) if item.unit_cost else None,
                'minimum_stock_level': item.minimum_stock_level,
                'maximum_stock_level': item.maximum_stock_level,
                'is_consumable': item.is_consumable,
                'is_controlled': item.is_controlled,
                'shelf_life_days': item.shelf_life_days,
                'supplier_name': item.supplier_name,
                'is_available': item.is_available,
                'created_at': item.created_at.isoformat() if item.created_at else None
            } for item in items.items],
            'total': items.total,
            'pages': items.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/supply-items', methods=['POST'])
@jwt_required()
def create_supply_item():
    """إنشاء مادة جديدة"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        item = SupplyItem(
            item_code=data['item_code'],
            item_name=data['item_name'],
            item_name_en=data.get('item_name_en'),
            description=data.get('description'),
            category_id=data['category_id'],
            unit_of_measure=data['unit_of_measure'],
            unit_cost=data.get('unit_cost'),
            minimum_stock_level=data.get('minimum_stock_level', 0),
            maximum_stock_level=data.get('maximum_stock_level', 1000),
            is_consumable=data.get('is_consumable', True),
            is_controlled=data.get('is_controlled', False),
            shelf_life_days=data.get('shelf_life_days'),
            storage_requirements=data.get('storage_requirements'),
            supplier_name=data.get('supplier_name'),
            supplier_contact=data.get('supplier_contact'),
            supplier_item_code=data.get('supplier_item_code'),
            created_by=current_user_id
        )
        
        db.session.add(item)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء المادة بنجاح',
            'item_id': item.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# Branch Inventory API
@app.route('/api/branch-inventory', methods=['GET'])
@jwt_required()
def get_branch_inventory():
    """الحصول على مخزون الفرع"""
    try:
        branch_id = request.args.get('branch_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        low_stock_only = request.args.get('low_stock_only', 'false').lower() == 'true'
        
        query = BranchInventory.query.join(SupplyItem)
        
        if branch_id:
            query = query.filter(BranchInventory.branch_id == branch_id)
        
        if search:
            query = query.filter(SupplyItem.item_name.contains(search))
        
        if low_stock_only:
            query = query.filter(
                BranchInventory.current_stock <= SupplyItem.minimum_stock_level
            )
        
        inventory = query.order_by(SupplyItem.item_name).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'inventory': [{
                'id': inv.id,
                'branch_id': inv.branch_id,
                'branch_name': inv.branch.name if inv.branch else None,
                'item_id': inv.item_id,
                'item_name': inv.item.item_name if inv.item else None,
                'item_code': inv.item.item_code if inv.item else None,
                'unit_of_measure': inv.item.unit_of_measure if inv.item else None,
                'current_stock': inv.current_stock,
                'reserved_stock': inv.reserved_stock,
                'available_stock': inv.available_stock,
                'minimum_stock_level': inv.item.minimum_stock_level if inv.item else 0,
                'average_cost': float(inv.average_cost) if inv.average_cost else None,
                'total_value': float(inv.total_value) if inv.total_value else None,
                'location': inv.location,
                'batch_number': inv.batch_number,
                'expiry_date': inv.expiry_date.isoformat() if inv.expiry_date else None,
                'last_updated': inv.last_updated.isoformat() if inv.last_updated else None,
                'is_low_stock': inv.current_stock <= (inv.item.minimum_stock_level if inv.item else 0)
            } for inv in inventory.items],
            'total': inventory.total,
            'pages': inventory.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Supply Requests API
@app.route('/api/supply-requests', methods=['GET'])
@jwt_required()
def get_supply_requests():
    """الحصول على طلبات الإمداد"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        priority = request.args.get('priority')
        requesting_branch_id = request.args.get('requesting_branch_id', type=int)
        supplying_branch_id = request.args.get('supplying_branch_id', type=int)
        
        query = SupplyRequest.query
        
        if status:
            query = query.filter(SupplyRequest.status == status)
        
        if priority:
            query = query.filter(SupplyRequest.priority_level == priority)
        
        if requesting_branch_id:
            query = query.filter(SupplyRequest.requesting_branch_id == requesting_branch_id)
        
        if supplying_branch_id:
            query = query.filter(SupplyRequest.supplying_branch_id == supplying_branch_id)
        
        requests = query.order_by(SupplyRequest.requested_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'requests': [{
                'id': req.id,
                'request_number': req.request_number,
                'requesting_branch_id': req.requesting_branch_id,
                'requesting_branch_name': req.requesting_branch.name if req.requesting_branch else None,
                'supplying_branch_id': req.supplying_branch_id,
                'supplying_branch_name': req.supplying_branch.name if req.supplying_branch else None,
                'request_type': req.request_type,
                'priority_level': req.priority_level,
                'status': req.status,
                'approval_status': req.approval_status,
                'reason': req.reason,
                'notes': req.notes,
                'requested_date': req.requested_date.isoformat() if req.requested_date else None,
                'required_date': req.required_date.isoformat() if req.required_date else None,
                'approved_date': req.approved_date.isoformat() if req.approved_date else None,
                'shipped_date': req.shipped_date.isoformat() if req.shipped_date else None,
                'received_date': req.received_date.isoformat() if req.received_date else None,
                'estimated_total_cost': float(req.estimated_total_cost) if req.estimated_total_cost else None,
                'actual_total_cost': float(req.actual_total_cost) if req.actual_total_cost else None,
                'shipping_method': req.shipping_method,
                'tracking_number': req.tracking_number,
                'requester_name': f"{req.requester.first_name} {req.requester.last_name}" if req.requester else None,
                'approver_name': f"{req.approver.first_name} {req.approver.last_name}" if req.approver else None,
                'items_count': len(req.request_items)
            } for req in requests.items],
            'total': requests.total,
            'pages': requests.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/supply-requests', methods=['POST'])
@jwt_required()
def create_supply_request():
    """إنشاء طلب إمداد جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # إنشاء رقم الطلب
        request_number = f"SR-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        supply_request = SupplyRequest(
            request_number=request_number,
            requesting_branch_id=data['requesting_branch_id'],
            supplying_branch_id=data['supplying_branch_id'],
            request_type=data['request_type'],
            priority_level=data.get('priority_level', 'normal'),
            required_date=datetime.strptime(data['required_date'], '%Y-%m-%d %H:%M:%S'),
            reason=data['reason'],
            notes=data.get('notes'),
            shipping_method=data.get('shipping_method'),
            shipping_address=data.get('shipping_address'),
            requested_by=current_user_id
        )
        
        db.session.add(supply_request)
        db.session.flush()  # للحصول على ID الطلب
        
        # إضافة المواد المطلوبة
        total_cost = 0
        for item_data in data.get('items', []):
            request_item = SupplyRequestItem(
                request_id=supply_request.id,
                item_id=item_data['item_id'],
                requested_quantity=item_data['requested_quantity'],
                notes=item_data.get('notes'),
                urgency_reason=item_data.get('urgency_reason')
            )
            
            # حساب التكلفة إذا كانت متاحة
            item = SupplyItem.query.get(item_data['item_id'])
            if item and item.unit_cost:
                request_item.unit_cost = item.unit_cost
                request_item.total_cost = item.unit_cost * item_data['requested_quantity']
                total_cost += float(request_item.total_cost)
            
            db.session.add(request_item)
        
        supply_request.estimated_total_cost = total_cost
        db.session.commit()
        
        # إنشاء إشعار للفرع المورد
        notification = SupplyNotification(
            notification_type='approval_needed',
            title=f'طلب إمداد جديد - {request_number}',
            message=f'تم استلام طلب إمداد جديد من {supply_request.requesting_branch.name} بأولوية {supply_request.priority_level}',
            recipient_branch_id=data['supplying_branch_id'],
            recipient_role='manager',
            related_request_id=supply_request.id,
            priority=data.get('priority_level', 'normal'),
            action_required=True,
            action_url=f'/supply-management?request_id={supply_request.id}',
            created_by=current_user_id
        )
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء طلب الإمداد بنجاح',
            'request_id': supply_request.id,
            'request_number': request_number
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/supply-requests/<int:request_id>/approve', methods=['POST'])
@jwt_required()
def approve_supply_request(request_id):
    """الموافقة على طلب الإمداد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        supply_request = SupplyRequest.query.get_or_404(request_id)
        
        supply_request.approval_status = 'approved'
        supply_request.status = 'approved'
        supply_request.approved_by = current_user_id
        supply_request.approved_date = datetime.utcnow()
        supply_request.internal_notes = data.get('internal_notes', supply_request.internal_notes)
        
        # تحديث كميات الموافقة للمواد
        for item_data in data.get('approved_items', []):
            request_item = SupplyRequestItem.query.filter_by(
                request_id=request_id,
                item_id=item_data['item_id']
            ).first()
            
            if request_item:
                request_item.approved_quantity = item_data['approved_quantity']
                request_item.item_status = 'approved'
        
        db.session.commit()
        
        # إنشاء إشعار للفرع الطالب
        notification = SupplyNotification(
            notification_type='shipment_update',
            title=f'تمت الموافقة على طلب الإمداد - {supply_request.request_number}',
            message=f'تمت الموافقة على طلب الإمداد الخاص بك وسيتم الشحن قريباً',
            recipient_branch_id=supply_request.requesting_branch_id,
            recipient_role='manager',
            related_request_id=request_id,
            priority='normal',
            created_by=current_user_id
        )
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تمت الموافقة على طلب الإمداد بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# Supply Notifications API
@app.route('/api/supply-notifications', methods=['GET'])
@jwt_required()
def get_supply_notifications():
    """الحصول على إشعارات الإمداد"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status', 'unread')
        notification_type = request.args.get('type')
        
        query = SupplyNotification.query
        
        # فلترة حسب المستخدم أو الفرع أو الدور
        query = query.filter(
            db.or_(
                SupplyNotification.recipient_user_id == current_user_id,
                SupplyNotification.recipient_branch_id == user.clinic_id if user.clinic_id else None,
                SupplyNotification.recipient_role == user.role
            )
        )
        
        if status != 'all':
            query = query.filter(SupplyNotification.status == status)
        
        if notification_type:
            query = query.filter(SupplyNotification.notification_type == notification_type)
        
        notifications = query.order_by(SupplyNotification.sent_time.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'notifications': [{
                'id': notif.id,
                'notification_type': notif.notification_type,
                'title': notif.title,
                'message': notif.message,
                'priority': notif.priority,
                'status': notif.status,
                'action_required': notif.action_required,
                'action_url': notif.action_url,
                'sent_time': notif.sent_time.isoformat() if notif.sent_time else None,
                'read_time': notif.read_time.isoformat() if notif.read_time else None,
                'related_request_id': notif.related_request_id,
                'related_transfer_id': notif.related_transfer_id,
                'expires_at': notif.expires_at.isoformat() if notif.expires_at else None
            } for notif in notifications.items],
            'total': notifications.total,
            'pages': notifications.pages,
            'current_page': page,
            'unread_count': SupplyNotification.query.filter(
                SupplyNotification.status == 'unread',
                db.or_(
                    SupplyNotification.recipient_user_id == current_user_id,
                    SupplyNotification.recipient_branch_id == user.clinic_id if user.clinic_id else None,
                    SupplyNotification.recipient_role == user.role
                )
            ).count()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Supply Dashboard API
@app.route('/api/supply-dashboard', methods=['GET'])
@jwt_required()
def get_supply_dashboard():
    """لوحة تحكم نظام الإمداد"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # إحصائيات عامة
        total_requests = SupplyRequest.query.count()
        pending_requests = SupplyRequest.query.filter(SupplyRequest.status == 'pending').count()
        approved_requests = SupplyRequest.query.filter(SupplyRequest.status == 'approved').count()
        urgent_requests = SupplyRequest.query.filter(SupplyRequest.priority_level == 'urgent').count()
        
        # إحصائيات المخزون
        total_items = SupplyItem.query.filter(SupplyItem.is_active == True).count()
        low_stock_items = db.session.query(BranchInventory).join(SupplyItem).filter(
            BranchInventory.current_stock <= SupplyItem.minimum_stock_level
        ).count()
        
        # طلبات حديثة
        recent_requests = SupplyRequest.query.order_by(
            SupplyRequest.requested_date.desc()
        ).limit(5).all()
        
        # إشعارات غير مقروءة
        unread_notifications = SupplyNotification.query.filter(
            SupplyNotification.status == 'unread',
            db.or_(
                SupplyNotification.recipient_user_id == current_user_id,
                SupplyNotification.recipient_branch_id == user.clinic_id if user.clinic_id else None,
                SupplyNotification.recipient_role == user.role
            )
        ).count()
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_requests': total_requests,
                'pending_requests': pending_requests,
                'approved_requests': approved_requests,
                'urgent_requests': urgent_requests,
                'total_items': total_items,
                'low_stock_items': low_stock_items,
                'unread_notifications': unread_notifications
            },
            'recent_requests': [{
                'id': req.id,
                'request_number': req.request_number,
                'requesting_branch_name': req.requesting_branch.name if req.requesting_branch else None,
                'priority_level': req.priority_level,
                'status': req.status,
                'requested_date': req.requested_date.isoformat() if req.requested_date else None
            } for req in recent_requests]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
