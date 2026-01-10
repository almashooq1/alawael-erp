"""
إضافة بيانات تجريبية لنظام الموافقات متعدد المستويات
Add Sample Data for Multi-Level Approval System
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from approval_models import (
    ApprovalWorkflow, ApprovalStep, ApprovalRequest, ApprovalHistory,
    ApprovalDelegate, ApprovalNotification, ApprovalStatus, ApprovalType
)
from models import User
from datetime import datetime, timedelta
import json

def add_sample_approval_data():
    """إضافة بيانات تجريبية شاملة لنظام الموافقات"""
    
    with app.app_context():
        try:
            print("🔄 بدء إضافة البيانات التجريبية لنظام الموافقات...")
            
            # 1. إنشاء سير عمل للمصروفات
            expense_workflow = ApprovalWorkflow(
                name="موافقة المصروفات",
                description="سير عمل موافقة المصروفات حسب المبلغ",
                entity_type="expense",
                approval_type=ApprovalType.SEQUENTIAL,
                conditions={
                    "amount": {
                        "min": 0,
                        "max": 50000
                    }
                },
                timeout_hours=48,
                escalation_enabled=True,
                escalation_hours=72,
                created_by=1
            )
            
            db.session.add(expense_workflow)
            db.session.flush()
            
            # خطوات موافقة المصروفات
            expense_steps = [
                {
                    "step_name": "موافقة المدير المباشر",
                    "step_order": 1,
                    "approver_type": "user",
                    "approver_id": "2",
                    "conditions": {"amount": {"max": 10000}},
                    "timeout_hours": 24
                },
                {
                    "step_name": "موافقة المدير العام",
                    "step_order": 2,
                    "approver_type": "user",
                    "approver_id": "3",
                    "conditions": {"amount": {"min": 5000}},
                    "timeout_hours": 48
                }
            ]
            
            for step_data in expense_steps:
                step = ApprovalStep(
                    workflow_id=expense_workflow.id,
                    **step_data,
                    created_by=1
                )
                db.session.add(step)
            
            # 2. إنشاء سير عمل للمشتريات
            purchase_workflow = ApprovalWorkflow(
                name="موافقة المشتريات",
                description="سير عمل موافقة المشتريات والعقود",
                entity_type="purchase",
                approval_type=ApprovalType.PARALLEL,
                conditions={
                    "amount": {
                        "min": 1000
                    }
                },
                timeout_hours=72,
                escalation_enabled=True,
                escalation_hours=96,
                created_by=1
            )
            
            db.session.add(purchase_workflow)
            db.session.flush()
            
            # خطوات موافقة المشتريات
            purchase_steps = [
                {
                    "step_name": "موافقة مدير المشتريات",
                    "step_order": 1,
                    "approver_type": "user",
                    "approver_id": "2",
                    "timeout_hours": 24
                },
                {
                    "step_name": "موافقة المدير المالي",
                    "step_order": 1,
                    "approver_type": "user",
                    "approver_id": "3",
                    "timeout_hours": 48
                }
            ]
            
            for step_data in purchase_steps:
                step = ApprovalStep(
                    workflow_id=purchase_workflow.id,
                    **step_data,
                    created_by=1
                )
                db.session.add(step)
            
            # 3. إنشاء سير عمل لطلبات الإجازة
            leave_workflow = ApprovalWorkflow(
                name="موافقة طلبات الإجازة",
                description="سير عمل موافقة طلبات الإجازة للموظفين",
                entity_type="leave_request",
                approval_type=ApprovalType.SEQUENTIAL,
                timeout_hours=24,
                escalation_enabled=False,
                created_by=1
            )
            
            db.session.add(leave_workflow)
            db.session.flush()
            
            # خطوة موافقة الإجازة
            leave_step = ApprovalStep(
                workflow_id=leave_workflow.id,
                step_name="موافقة مدير الموارد البشرية",
                step_order=1,
                approver_type="user",
                approver_id="2",
                timeout_hours=24,
                created_by=1
            )
            db.session.add(leave_step)
            
            db.session.flush()
            
            # 4. إنشاء طلبات موافقة تجريبية
            sample_requests = [
                {
                    "workflow_id": expense_workflow.id,
                    "title": "شراء أجهزة كمبيوتر للفصول",
                    "description": "طلب شراء 5 أجهزة كمبيوتر محمولة للاستخدام في الفصول الدراسية",
                    "entity_type": "expense",
                    "entity_id": 1,
                    "amount": 15000.00,
                    "requester_id": 1,
                    "status": ApprovalStatus.PENDING,
                    "current_step": 1,
                    "metadata": {
                        "department": "التعليم",
                        "priority": "عالية",
                        "vendor": "شركة التقنية المتقدمة"
                    }
                },
                {
                    "workflow_id": expense_workflow.id,
                    "title": "صيانة أجهزة التكييف",
                    "description": "تكلفة صيانة دورية لأجهزة التكييف في المبنى الرئيسي",
                    "entity_type": "expense",
                    "entity_id": 2,
                    "amount": 3500.00,
                    "requester_id": 1,
                    "status": ApprovalStatus.APPROVED,
                    "current_step": 2,
                    "metadata": {
                        "department": "الصيانة",
                        "priority": "متوسطة"
                    }
                },
                {
                    "workflow_id": purchase_workflow.id,
                    "title": "عقد توريد مواد تنظيف",
                    "description": "عقد سنوي لتوريد مواد التنظيف والتعقيم",
                    "entity_type": "purchase",
                    "entity_id": 1,
                    "amount": 25000.00,
                    "requester_id": 1,
                    "status": ApprovalStatus.PENDING,
                    "current_step": 1,
                    "metadata": {
                        "contract_duration": "12 شهر",
                        "supplier": "شركة النظافة الشاملة"
                    }
                },
                {
                    "workflow_id": leave_workflow.id,
                    "title": "طلب إجازة سنوية",
                    "description": "طلب إجازة سنوية لمدة أسبوعين",
                    "entity_type": "leave_request",
                    "entity_id": 1,
                    "requester_id": 1,
                    "status": ApprovalStatus.REJECTED,
                    "current_step": 1,
                    "metadata": {
                        "start_date": "2024-02-01",
                        "end_date": "2024-02-14",
                        "leave_type": "سنوية"
                    }
                },
                {
                    "workflow_id": expense_workflow.id,
                    "title": "شراء مواد قرطاسية",
                    "description": "طلب شراء مواد قرطاسية للفصل الدراسي الجديد",
                    "entity_type": "expense",
                    "entity_id": 3,
                    "amount": 2500.00,
                    "requester_id": 1,
                    "status": ApprovalStatus.EXPIRED,
                    "current_step": 1,
                    "metadata": {
                        "department": "التعليم",
                        "priority": "منخفضة"
                    }
                }
            ]
            
            created_requests = []
            for req_data in sample_requests:
                request = ApprovalRequest(**req_data)
                request.calculate_expiry()
                if req_data["status"] in [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.EXPIRED]:
                    request.completed_at = datetime.utcnow() - timedelta(days=1)
                db.session.add(request)
                created_requests.append(request)
            
            db.session.flush()
            
            # 5. إنشاء تاريخ موافقات تجريبي
            sample_history = [
                # تاريخ الطلب المعتمد
                {
                    "request_id": created_requests[1].id,
                    "step_id": None,
                    "action": "submit",
                    "status": ApprovalStatus.PENDING,
                    "approver_id": 1,
                    "comments": "تم تقديم الطلب للموافقة"
                },
                {
                    "request_id": created_requests[1].id,
                    "step_id": None,
                    "action": "approve",
                    "status": ApprovalStatus.APPROVED,
                    "approver_id": 2,
                    "comments": "موافقة المدير المباشر - الطلب ضروري للصيانة"
                },
                {
                    "request_id": created_requests[1].id,
                    "step_id": None,
                    "action": "approve",
                    "status": ApprovalStatus.APPROVED,
                    "approver_id": 3,
                    "comments": "موافقة نهائية من المدير العام"
                },
                # تاريخ الطلب المرفوض
                {
                    "request_id": created_requests[3].id,
                    "step_id": None,
                    "action": "submit",
                    "status": ApprovalStatus.PENDING,
                    "approver_id": 1,
                    "comments": "تم تقديم طلب الإجازة"
                },
                {
                    "request_id": created_requests[3].id,
                    "step_id": None,
                    "action": "reject",
                    "status": ApprovalStatus.REJECTED,
                    "approver_id": 2,
                    "reason": "لا يمكن الموافقة على الإجازة في هذا التوقيت بسبب ضغط العمل"
                }
            ]
            
            for hist_data in sample_history:
                history = ApprovalHistory(**hist_data)
                db.session.add(history)
            
            # 6. إنشاء تفويضات تجريبية
            sample_delegates = [
                {
                    "delegator_id": 2,
                    "delegate_id": 3,
                    "start_date": datetime.utcnow(),
                    "end_date": datetime.utcnow() + timedelta(days=7),
                    "reason": "إجازة مرضية للمدير المباشر",
                    "conditions": {
                        "max_amount": 10000,
                        "entity_types": ["expense"]
                    },
                    "created_by": 2
                },
                {
                    "delegator_id": 3,
                    "delegate_id": 2,
                    "start_date": datetime.utcnow() - timedelta(days=30),
                    "end_date": datetime.utcnow() - timedelta(days=23),
                    "reason": "سفر خارجي للمدير العام",
                    "is_active": False,
                    "created_by": 3
                }
            ]
            
            for del_data in sample_delegates:
                delegate = ApprovalDelegate(**del_data)
                db.session.add(delegate)
            
            # 7. إنشاء إشعارات تجريبية
            sample_notifications = [
                {
                    "request_id": created_requests[0].id,
                    "notification_type": "approval_required",
                    "recipient_id": 2,
                    "title": "طلب موافقة جديد - شراء أجهزة كمبيوتر",
                    "message": "يتطلب طلب 'شراء أجهزة كمبيوتر للفصول' موافقتك",
                    "channels": ["email", "push"],
                    "is_read": False
                },
                {
                    "request_id": created_requests[2].id,
                    "notification_type": "approval_required",
                    "recipient_id": 2,
                    "title": "طلب موافقة جديد - عقد توريد",
                    "message": "يتطلب طلب 'عقد توريد مواد تنظيف' موافقتك",
                    "channels": ["email", "push"],
                    "is_read": True,
                    "read_at": datetime.utcnow() - timedelta(hours=2)
                },
                {
                    "request_id": created_requests[1].id,
                    "notification_type": "request_approved",
                    "recipient_id": 1,
                    "title": "تم الموافقة على طلبك",
                    "message": "تم الموافقة على طلبك 'صيانة أجهزة التكييف'",
                    "channels": ["email", "push"],
                    "is_read": True,
                    "read_at": datetime.utcnow() - timedelta(hours=1)
                },
                {
                    "request_id": created_requests[3].id,
                    "notification_type": "request_rejected",
                    "recipient_id": 1,
                    "title": "تم رفض طلبك",
                    "message": "تم رفض طلبك 'طلب إجازة سنوية'",
                    "channels": ["email", "push"],
                    "is_read": False
                }
            ]
            
            for notif_data in sample_notifications:
                notification = ApprovalNotification(**notif_data)
                db.session.add(notification)
            
            # حفظ جميع البيانات
            db.session.commit()
            
            print("✅ تم إضافة البيانات التجريبية بنجاح!")
            print(f"   - {len([expense_workflow, purchase_workflow, leave_workflow])} سير عمل")
            print(f"   - {len(expense_steps) + len(purchase_steps) + 1} خطوة موافقة")
            print(f"   - {len(sample_requests)} طلب موافقة")
            print(f"   - {len(sample_history)} سجل تاريخ")
            print(f"   - {len(sample_delegates)} تفويض")
            print(f"   - {len(sample_notifications)} إشعار")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
            raise e

if __name__ == "__main__":
    add_sample_approval_data()
