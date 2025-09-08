# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات لنظام طلب الإمداد بالمواد
Supply Request Management Database Models
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

# Import db from database module to avoid conflicts
from database import db

# ==================== Supply Request Management Models ====================

class SupplyCategory(db.Model):
    """فئات المواد والإمدادات"""
    __tablename__ = 'supply_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    category_name = db.Column(db.String(100), nullable=False, unique=True)
    category_name_en = db.Column(db.String(100))
    description = db.Column(db.Text)
    parent_category_id = db.Column(db.Integer, db.ForeignKey('supply_categories.id'))
    is_active = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    parent_category = db.relationship('SupplyCategory', remote_side=[id], backref='subcategories')
    creator = db.relationship('User', backref='created_supply_categories')

class SupplyItem(db.Model):
    """المواد والإمدادات المتاحة"""
    __tablename__ = 'supply_items'
    
    id = db.Column(db.Integer, primary_key=True)
    item_code = db.Column(db.String(50), unique=True, nullable=False)
    item_name = db.Column(db.String(200), nullable=False)
    item_name_en = db.Column(db.String(200))
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey('supply_categories.id'), nullable=False)
    
    # معلومات المادة
    unit_of_measure = db.Column(db.String(20), nullable=False)  # قطعة، كيلو، لتر، متر، إلخ
    unit_cost = db.Column(db.Numeric(10, 2))
    minimum_stock_level = db.Column(db.Integer, default=0)
    maximum_stock_level = db.Column(db.Integer, default=1000)
    
    # معلومات التصنيف
    is_consumable = db.Column(db.Boolean, default=True)  # مادة استهلاكية أم دائمة
    is_controlled = db.Column(db.Boolean, default=False)  # تحتاج موافقة خاصة
    shelf_life_days = db.Column(db.Integer)  # مدة الصلاحية بالأيام
    storage_requirements = db.Column(db.Text)  # متطلبات التخزين
    
    # معلومات المورد
    supplier_name = db.Column(db.String(200))
    supplier_contact = db.Column(db.String(100))
    supplier_item_code = db.Column(db.String(100))
    
    # الحالة
    is_active = db.Column(db.Boolean, default=True)
    is_available = db.Column(db.Boolean, default=True)
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    category = db.relationship('SupplyCategory', backref='items')
    creator = db.relationship('User', backref='created_supply_items')

class BranchInventory(db.Model):
    """مخزون الفروع من المواد"""
    __tablename__ = 'branch_inventory'
    
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('supply_items.id'), nullable=False)
    
    # معلومات المخزون
    current_stock = db.Column(db.Integer, default=0)
    reserved_stock = db.Column(db.Integer, default=0)  # محجوز للطلبات المعلقة
    available_stock = db.Column(db.Integer, default=0)  # متاح للطلب
    
    # معلومات التكلفة
    average_cost = db.Column(db.Numeric(10, 2))
    total_value = db.Column(db.Numeric(12, 2))
    
    # معلومات التخزين
    location = db.Column(db.String(100))  # موقع التخزين في الفرع
    batch_number = db.Column(db.String(50))
    expiry_date = db.Column(db.Date)
    
    # معلومات التتبع
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_counted = db.Column(db.DateTime)  # آخر جرد
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    branch = db.relationship('Clinic', backref='inventory_items')
    item = db.relationship('SupplyItem', backref='branch_stocks')
    updater = db.relationship('User', backref='updated_inventories')
    
    # فهرس مركب لضمان عدم التكرار
    __table_args__ = (db.UniqueConstraint('branch_id', 'item_id', name='unique_branch_item'),)

class SupplyRequest(db.Model):
    """طلبات الإمداد بين الفروع"""
    __tablename__ = 'supply_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    request_number = db.Column(db.String(20), unique=True, nullable=False)
    
    # معلومات الطلب
    requesting_branch_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False)
    supplying_branch_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False)
    request_type = db.Column(db.String(30), nullable=False)  # urgent, normal, scheduled
    priority_level = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    
    # معلومات التوقيت
    requested_date = db.Column(db.DateTime, default=datetime.utcnow)
    required_date = db.Column(db.DateTime, nullable=False)
    approved_date = db.Column(db.DateTime)
    shipped_date = db.Column(db.DateTime)
    received_date = db.Column(db.DateTime)
    
    # الحالة والموافقة
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, shipped, received, cancelled
    approval_status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    
    # معلومات الطلب
    reason = db.Column(db.Text, nullable=False)
    notes = db.Column(db.Text)
    internal_notes = db.Column(db.Text)  # ملاحظات داخلية
    
    # معلومات التكلفة
    estimated_total_cost = db.Column(db.Numeric(12, 2))
    actual_total_cost = db.Column(db.Numeric(12, 2))
    shipping_cost = db.Column(db.Numeric(10, 2))
    
    # معلومات الشحن
    shipping_method = db.Column(db.String(50))  # courier, internal_transport, pickup
    tracking_number = db.Column(db.String(100))
    shipping_address = db.Column(db.Text)
    
    # الأشخاص المسؤولون
    requested_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    shipped_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    received_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    requesting_branch = db.relationship('Clinic', foreign_keys=[requesting_branch_id], backref='outgoing_supply_requests')
    supplying_branch = db.relationship('Clinic', foreign_keys=[supplying_branch_id], backref='incoming_supply_requests')
    requester = db.relationship('User', foreign_keys=[requested_by], backref='supply_requests')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='approved_supply_requests')
    shipper = db.relationship('User', foreign_keys=[shipped_by], backref='shipped_supply_requests')
    receiver = db.relationship('User', foreign_keys=[received_by], backref='received_supply_requests')

class SupplyRequestItem(db.Model):
    """المواد المطلوبة في كل طلب إمداد"""
    __tablename__ = 'supply_request_items'
    
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('supply_requests.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('supply_items.id'), nullable=False)
    
    # الكميات
    requested_quantity = db.Column(db.Integer, nullable=False)
    approved_quantity = db.Column(db.Integer, default=0)
    shipped_quantity = db.Column(db.Integer, default=0)
    received_quantity = db.Column(db.Integer, default=0)
    
    # معلومات التكلفة
    unit_cost = db.Column(db.Numeric(10, 2))
    total_cost = db.Column(db.Numeric(12, 2))
    
    # معلومات إضافية
    notes = db.Column(db.Text)
    urgency_reason = db.Column(db.Text)  # سبب الاستعجال إن وجد
    
    # حالة المادة
    item_status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, shipped, received
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    request = db.relationship('SupplyRequest', backref='request_items')
    item = db.relationship('SupplyItem', backref='request_items')

class SupplyTransfer(db.Model):
    """سجل نقل المواد بين الفروع"""
    __tablename__ = 'supply_transfers'
    
    id = db.Column(db.Integer, primary_key=True)
    transfer_number = db.Column(db.String(20), unique=True, nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey('supply_requests.id'))
    
    # معلومات النقل
    from_branch_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False)
    to_branch_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False)
    transfer_type = db.Column(db.String(30), nullable=False)  # request_fulfillment, internal_transfer, emergency
    
    # معلومات التوقيت
    transfer_date = db.Column(db.DateTime, default=datetime.utcnow)
    shipped_date = db.Column(db.DateTime)
    received_date = db.Column(db.DateTime)
    
    # الحالة
    status = db.Column(db.String(20), default='pending')  # pending, in_transit, delivered, cancelled
    
    # معلومات الشحن
    shipping_method = db.Column(db.String(50))
    tracking_number = db.Column(db.String(100))
    shipping_cost = db.Column(db.Numeric(10, 2))
    
    # معلومات إضافية
    notes = db.Column(db.Text)
    reason = db.Column(db.Text)
    
    # الأشخاص المسؤولون
    initiated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    shipped_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    received_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    related_request = db.relationship('SupplyRequest', backref='transfers')
    from_branch = db.relationship('Clinic', foreign_keys=[from_branch_id], backref='outgoing_transfers')
    to_branch = db.relationship('Clinic', foreign_keys=[to_branch_id], backref='incoming_transfers')
    initiator = db.relationship('User', foreign_keys=[initiated_by], backref='initiated_transfers')
    shipper = db.relationship('User', foreign_keys=[shipped_by], backref='shipped_transfers')
    receiver = db.relationship('User', foreign_keys=[received_by], backref='received_transfers')

class SupplyTransferItem(db.Model):
    """المواد في كل عملية نقل"""
    __tablename__ = 'supply_transfer_items'
    
    id = db.Column(db.Integer, primary_key=True)
    transfer_id = db.Column(db.Integer, db.ForeignKey('supply_transfers.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('supply_items.id'), nullable=False)
    
    # الكميات
    transferred_quantity = db.Column(db.Integer, nullable=False)
    received_quantity = db.Column(db.Integer, default=0)
    
    # معلومات التكلفة
    unit_cost = db.Column(db.Numeric(10, 2))
    total_cost = db.Column(db.Numeric(12, 2))
    
    # معلومات الدفعة
    batch_number = db.Column(db.String(50))
    expiry_date = db.Column(db.Date)
    
    # حالة المادة
    condition_on_receipt = db.Column(db.String(20))  # good, damaged, expired
    notes = db.Column(db.Text)
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    transfer = db.relationship('SupplyTransfer', backref='transfer_items')
    item = db.relationship('SupplyItem', backref='transfer_items')

class SupplyNotification(db.Model):
    """إشعارات نظام الإمداد"""
    __tablename__ = 'supply_notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    notification_type = db.Column(db.String(30), nullable=False)  # low_stock, urgent_request, approval_needed, shipment_update
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    
    # معلومات المستلم
    recipient_branch_id = db.Column(db.Integer, db.ForeignKey('clinics.id'))
    recipient_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    recipient_role = db.Column(db.String(30))  # admin, manager, inventory_manager
    
    # معلومات مرتبطة
    related_request_id = db.Column(db.Integer, db.ForeignKey('supply_requests.id'))
    related_transfer_id = db.Column(db.Integer, db.ForeignKey('supply_transfers.id'))
    related_item_id = db.Column(db.Integer, db.ForeignKey('supply_items.id'))
    
    # الحالة والأولوية
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    status = db.Column(db.String(20), default='unread')  # unread, read, acknowledged, dismissed
    
    # معلومات التوقيت
    scheduled_time = db.Column(db.DateTime)  # للإشعارات المجدولة
    sent_time = db.Column(db.DateTime, default=datetime.utcnow)
    read_time = db.Column(db.DateTime)
    acknowledged_time = db.Column(db.DateTime)
    
    # معلومات إضافية
    action_required = db.Column(db.Boolean, default=False)
    action_url = db.Column(db.String(200))  # رابط للإجراء المطلوب
    expires_at = db.Column(db.DateTime)  # تاريخ انتهاء صلاحية الإشعار
    
    # معلومات التتبع
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # العلاقات
    recipient_branch = db.relationship('Clinic', backref='supply_notifications')
    recipient_user = db.relationship('User', foreign_keys=[recipient_user_id], backref='supply_notifications')
    related_request = db.relationship('SupplyRequest', backref='notifications')
    related_transfer = db.relationship('SupplyTransfer', backref='notifications')
    related_item = db.relationship('SupplyItem', backref='notifications')
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_supply_notifications')
