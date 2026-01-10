# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام طلب الإمداد بالمواد
Add Sample Data for Supply Request Management System
"""

from datetime import datetime, timedelta
import random
from app import app, db
from models import User, Clinic
from supply_models import (
    SupplyCategory, SupplyItem, BranchInventory, SupplyRequest, 
    SupplyRequestItem, SupplyTransfer, SupplyTransferItem, SupplyNotification
)

def add_supply_categories():
    """إضافة فئات المواد"""
    categories = [
        {
            'category_name': 'مواد مكتبية',
            'category_name_en': 'Office Supplies',
            'description': 'أقلام، ورق، ملفات ومستلزمات مكتبية',
            'sort_order': 1
        },
        {
            'category_name': 'مواد تنظيف',
            'category_name_en': 'Cleaning Supplies',
            'description': 'منظفات، مطهرات ومواد التنظيف',
            'sort_order': 2
        },
        {
            'category_name': 'أجهزة إلكترونية',
            'category_name_en': 'Electronics',
            'description': 'حاسوب، طابعات وأجهزة إلكترونية',
            'sort_order': 3
        },
        {
            'category_name': 'أثاث ومعدات',
            'category_name_en': 'Furniture & Equipment',
            'description': 'مكاتب، كراسي ومعدات الفصول',
            'sort_order': 4
        },
        {
            'category_name': 'مواد تعليمية',
            'category_name_en': 'Educational Materials',
            'description': 'كتب، وسائل تعليمية ومواد دراسية',
            'sort_order': 5
        },
        {
            'category_name': 'مواد طبية',
            'category_name_en': 'Medical Supplies',
            'description': 'إسعافات أولية ومواد طبية',
            'sort_order': 6
        }
    ]
    
    created_categories = []
    for cat_data in categories:
        category = SupplyCategory(
            category_name=cat_data['category_name'],
            category_name_en=cat_data['category_name_en'],
            description=cat_data['description'],
            sort_order=cat_data['sort_order'],
            created_by=1
        )
        db.session.add(category)
        created_categories.append(category)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(created_categories)} فئة مواد")
    return created_categories

def add_supply_items(categories):
    """إضافة المواد والإمدادات"""
    items_data = [
        # مواد مكتبية
        {'name': 'أقلام جاف زرقاء', 'name_en': 'Blue Ballpoint Pens', 'code': 'OFF-001', 'unit': 'قطعة', 'cost': 2.50, 'category': 0},
        {'name': 'أقلام رصاص', 'name_en': 'Pencils', 'code': 'OFF-002', 'unit': 'قطعة', 'cost': 1.50, 'category': 0},
        {'name': 'ورق A4 أبيض', 'name_en': 'A4 White Paper', 'code': 'OFF-003', 'unit': 'رزمة', 'cost': 25.00, 'category': 0},
        {'name': 'ملفات حفظ', 'name_en': 'File Folders', 'code': 'OFF-004', 'unit': 'قطعة', 'cost': 5.00, 'category': 0},
        {'name': 'دباسة', 'name_en': 'Stapler', 'code': 'OFF-005', 'unit': 'قطعة', 'cost': 15.00, 'category': 0},
        
        # مواد تنظيف
        {'name': 'منظف أرضيات', 'name_en': 'Floor Cleaner', 'code': 'CLN-001', 'unit': 'لتر', 'cost': 12.00, 'category': 1},
        {'name': 'مطهر اليدين', 'name_en': 'Hand Sanitizer', 'code': 'CLN-002', 'unit': 'لتر', 'cost': 20.00, 'category': 1},
        {'name': 'مناديل ورقية', 'name_en': 'Paper Towels', 'code': 'CLN-003', 'unit': 'رول', 'cost': 8.00, 'category': 1},
        {'name': 'أكياس قمامة', 'name_en': 'Garbage Bags', 'code': 'CLN-004', 'unit': 'كيس', 'cost': 0.50, 'category': 1},
        
        # أجهزة إلكترونية
        {'name': 'حاسوب مكتبي', 'name_en': 'Desktop Computer', 'code': 'ELC-001', 'unit': 'جهاز', 'cost': 2500.00, 'category': 2},
        {'name': 'طابعة ليزر', 'name_en': 'Laser Printer', 'code': 'ELC-002', 'unit': 'جهاز', 'cost': 800.00, 'category': 2},
        {'name': 'شاشة كمبيوتر', 'name_en': 'Computer Monitor', 'code': 'ELC-003', 'unit': 'جهاز', 'cost': 600.00, 'category': 2},
        {'name': 'لوحة مفاتيح', 'name_en': 'Keyboard', 'code': 'ELC-004', 'unit': 'قطعة', 'cost': 80.00, 'category': 2},
        
        # أثاث ومعدات
        {'name': 'مكتب خشبي', 'name_en': 'Wooden Desk', 'code': 'FUR-001', 'unit': 'قطعة', 'cost': 1200.00, 'category': 3},
        {'name': 'كرسي مكتب', 'name_en': 'Office Chair', 'code': 'FUR-002', 'unit': 'قطعة', 'cost': 400.00, 'category': 3},
        {'name': 'خزانة ملفات', 'name_en': 'Filing Cabinet', 'code': 'FUR-003', 'unit': 'قطعة', 'cost': 800.00, 'category': 3},
        {'name': 'سبورة بيضاء', 'name_en': 'Whiteboard', 'code': 'FUR-004', 'unit': 'قطعة', 'cost': 300.00, 'category': 3},
        
        # مواد تعليمية
        {'name': 'كتب مدرسية', 'name_en': 'Textbooks', 'code': 'EDU-001', 'unit': 'كتاب', 'cost': 45.00, 'category': 4},
        {'name': 'أقلام تلوين', 'name_en': 'Colored Pencils', 'code': 'EDU-002', 'unit': 'علبة', 'cost': 15.00, 'category': 4},
        {'name': 'لوح رسم', 'name_en': 'Drawing Board', 'code': 'EDU-003', 'unit': 'قطعة', 'cost': 25.00, 'category': 4},
        
        # مواد طبية
        {'name': 'ضمادات طبية', 'name_en': 'Medical Bandages', 'code': 'MED-001', 'unit': 'علبة', 'cost': 30.00, 'category': 5},
        {'name': 'مقياس حرارة', 'name_en': 'Thermometer', 'code': 'MED-002', 'unit': 'قطعة', 'cost': 50.00, 'category': 5},
        {'name': 'قفازات طبية', 'name_en': 'Medical Gloves', 'code': 'MED-003', 'unit': 'علبة', 'cost': 25.00, 'category': 5}
    ]
    
    created_items = []
    for item_data in items_data:
        item = SupplyItem(
            item_code=item_data['code'],
            item_name=item_data['name'],
            item_name_en=item_data['name_en'],
            description=f"وصف {item_data['name']}",
            category_id=categories[item_data['category']].id,
            unit_of_measure=item_data['unit'],
            unit_cost=item_data['cost'],
            minimum_stock_level=random.randint(5, 20),
            maximum_stock_level=random.randint(100, 500),
            is_consumable=True,
            is_controlled=item_data['cost'] > 500,
            supplier_name=f"مورد {random.randint(1, 5)}",
            created_by=1
        )
        db.session.add(item)
        created_items.append(item)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(created_items)} مادة وإمداد")
    return created_items

def add_branch_inventory(items, clinics):
    """إضافة مخزون الفروع"""
    created_inventory = []
    
    for clinic in clinics[:5]:  # أول 5 فروع
        for item in items:
            current_stock = random.randint(0, 100)
            reserved_stock = random.randint(0, min(10, current_stock))
            
            inventory = BranchInventory(
                branch_id=clinic.id,
                item_id=item.id,
                current_stock=current_stock,
                reserved_stock=reserved_stock,
                available_stock=current_stock - reserved_stock,
                average_cost=item.unit_cost * random.uniform(0.9, 1.1),
                total_value=current_stock * item.unit_cost,
                location=f"مستودع {random.randint(1, 3)}",
                batch_number=f"BATCH-{random.randint(1000, 9999)}",
                expiry_date=datetime.now() + timedelta(days=random.randint(30, 365)) if item.is_consumable else None,
                last_updated=datetime.now()
            )
            db.session.add(inventory)
            created_inventory.append(inventory)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(created_inventory)} عنصر مخزون")
    return created_inventory

def add_supply_requests(items, clinics, users):
    """إضافة طلبات الإمداد"""
    statuses = ['pending', 'approved', 'rejected', 'shipped', 'received']
    priorities = ['low', 'normal', 'high', 'urgent']
    request_types = ['normal', 'urgent', 'scheduled']
    
    created_requests = []
    
    for i in range(20):  # إنشاء 20 طلب
        requesting_branch = random.choice(clinics[:5])
        supplying_branch = random.choice([c for c in clinics[:5] if c.id != requesting_branch.id])
        requester = random.choice(users[:5])
        
        request_date = datetime.now() - timedelta(days=random.randint(0, 30))
        required_date = request_date + timedelta(days=random.randint(1, 14))
        
        supply_request = SupplyRequest(
            request_number=f"SR-{datetime.now().strftime('%Y%m%d')}-{str(i+1).zfill(4)}",
            requesting_branch_id=requesting_branch.id,
            supplying_branch_id=supplying_branch.id,
            request_type=random.choice(request_types),
            priority_level=random.choice(priorities),
            status=random.choice(statuses),
            approval_status='pending' if random.choice(statuses) == 'pending' else 'approved',
            reason=f"نحتاج هذه المواد للعمليات اليومية في {requesting_branch.name}",
            notes=f"ملاحظات إضافية للطلب رقم {i+1}",
            requested_date=request_date,
            required_date=required_date,
            shipping_method=random.choice(['internal_transport', 'courier', 'pickup']),
            shipping_address=f"عنوان {requesting_branch.name}",
            requested_by=requester.id,
            approved_by=random.choice(users[:3]).id if random.choice([True, False]) else None,
            approved_date=request_date + timedelta(hours=random.randint(1, 48)) if random.choice([True, False]) else None
        )
        
        db.session.add(supply_request)
        db.session.flush()  # للحصول على ID
        
        # إضافة المواد للطلب
        num_items = random.randint(1, 5)
        selected_items = random.sample(items, num_items)
        total_cost = 0
        
        for item in selected_items:
            quantity = random.randint(1, 20)
            item_cost = item.unit_cost * quantity
            total_cost += item_cost
            
            request_item = SupplyRequestItem(
                request_id=supply_request.id,
                item_id=item.id,
                requested_quantity=quantity,
                approved_quantity=quantity if supply_request.approval_status == 'approved' else None,
                unit_cost=item.unit_cost,
                total_cost=item_cost,
                item_status='pending',
                notes=f"ملاحظات خاصة بـ {item.item_name}"
            )
            db.session.add(request_item)
        
        supply_request.estimated_total_cost = total_cost
        if supply_request.approval_status == 'approved':
            supply_request.actual_total_cost = total_cost * random.uniform(0.95, 1.05)
        
        created_requests.append(supply_request)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(created_requests)} طلب إمداد")
    return created_requests

def add_supply_notifications(requests, users, clinics):
    """إضافة إشعارات الإمداد"""
    notification_types = ['low_stock', 'urgent_request', 'approval_needed', 'shipment_update', 'delivery_confirmation']
    priorities = ['low', 'normal', 'high', 'urgent']
    
    created_notifications = []
    
    # إشعارات للطلبات
    for request in requests[:10]:
        notification = SupplyNotification(
            notification_type=random.choice(notification_types),
            title=f"إشعار خاص بالطلب {request.request_number}",
            message=f"تحديث حالة الطلب: {request.status}",
            recipient_branch_id=request.requesting_branch_id,
            recipient_user_id=request.requested_by,
            recipient_role='manager',
            related_request_id=request.id,
            priority=random.choice(priorities),
            status='unread' if random.choice([True, False]) else 'read',
            action_required=random.choice([True, False]),
            action_url=f"/supply-management?request_id={request.id}",
            sent_time=datetime.now() - timedelta(hours=random.randint(1, 72)),
            read_time=datetime.now() - timedelta(hours=random.randint(0, 24)) if random.choice([True, False]) else None,
            expires_at=datetime.now() + timedelta(days=random.randint(7, 30)),
            created_by=1
        )
        db.session.add(notification)
        created_notifications.append(notification)
    
    # إشعارات نقص المخزون
    for i in range(10):
        clinic = random.choice(clinics[:5])
        notification = SupplyNotification(
            notification_type='low_stock',
            title="تنبيه: نقص في المخزون",
            message=f"مخزون بعض المواد في {clinic.name} أقل من الحد الأدنى",
            recipient_branch_id=clinic.id,
            recipient_role='manager',
            priority='high',
            status='unread',
            action_required=True,
            action_url="/supply-management?tab=inventory",
            sent_time=datetime.now() - timedelta(hours=random.randint(1, 48)),
            expires_at=datetime.now() + timedelta(days=7),
            created_by=1
        )
        db.session.add(notification)
        created_notifications.append(notification)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(created_notifications)} إشعار")
    return created_notifications

def main():
    """تشغيل إضافة البيانات التجريبية"""
    with app.app_context():
        print("🚀 بدء إضافة البيانات التجريبية لنظام طلب الإمداد")
        print("=" * 60)
        
        # الحصول على البيانات الأساسية
        users = User.query.limit(10).all()
        clinics = Clinic.query.limit(10).all()
        
        if not users or not clinics:
            print("❌ لا توجد مستخدمين أو فروع في النظام")
            print("يرجى إضافة مستخدمين وفروع أولاً")
            return
        
        print(f"📊 تم العثور على {len(users)} مستخدم و {len(clinics)} فرع")
        
        # إنشاء الجداول إذا لم تكن موجودة
        try:
            db.create_all()
            print("✅ تم التأكد من وجود جداول قاعدة البيانات")
        except Exception as e:
            print(f"❌ خطأ في إنشاء الجداول: {str(e)}")
            return
        
        try:
            # إضافة البيانات
            categories = add_supply_categories()
            items = add_supply_items(categories)
            inventory = add_branch_inventory(items, clinics)
            requests = add_supply_requests(items, clinics, users)
            notifications = add_supply_notifications(requests, users, clinics)
            
            print("\n" + "=" * 60)
            print("🎉 تم إنشاء البيانات التجريبية بنجاح!")
            print(f"📦 الفئات: {len(categories)}")
            print(f"📋 المواد: {len(items)}")
            print(f"🏪 عناصر المخزون: {len(inventory)}")
            print(f"📄 طلبات الإمداد: {len(requests)}")
            print(f"🔔 الإشعارات: {len(notifications)}")
            print("=" * 60)
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات: {str(e)}")
            db.session.rollback()

if __name__ == "__main__":
    main()
