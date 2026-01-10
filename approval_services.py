"""
محرك معالجة الموافقات متعدد المستويات
Multi-Level Approval Processing Engine
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy import and_, or_
from app import db
from approval_models import (
    ApprovalWorkflow, ApprovalStep, ApprovalRequest, ApprovalHistory,
    ApprovalDelegate, ApprovalNotification, ApprovalStatus, ApprovalType
)
from notification_services import NotificationService

logger = logging.getLogger(__name__)

class ApprovalEngine:
    """محرك معالجة الموافقات"""
    
    def __init__(self):
        self.notification_service = NotificationService()
    
    def submit_request(self, entity_type: str, entity_id: int, 
                      requester_id: int, title: str, description: str = None,
                      amount: float = None, metadata: Dict = None) -> Dict[str, Any]:
        """تقديم طلب موافقة"""
        try:
            # العثور على سير العمل المناسب
            workflow = self._find_workflow(entity_type, amount, metadata)
            if not workflow:
                return {"success": False, "error": "لم يتم العثور على سير عمل مناسب"}
            
            # إنشاء طلب الموافقة
            request = ApprovalRequest(
                workflow_id=workflow.id,
                title=title,
                description=description,
                entity_type=entity_type,
                entity_id=entity_id,
                amount=amount,
                requester_id=requester_id,
                metadata=metadata or {},
                current_step=1
            )
            
            # حساب وقت انتهاء الصلاحية
            request.calculate_expiry()
            
            db.session.add(request)
            db.session.flush()
            
            # بدء عملية الموافقة
            self._start_approval_process(request)
            
            db.session.commit()
            
            return {
                "success": True,
                "request_id": request.id,
                "workflow_name": workflow.name,
                "message": "تم تقديم الطلب بنجاح"
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في تقديم طلب الموافقة: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def approve_request(self, request_id: int, approver_id: int, 
                       comments: str = None) -> Dict[str, Any]:
        """الموافقة على الطلب"""
        try:
            request = ApprovalRequest.query.get(request_id)
            if not request:
                return {"success": False, "error": "الطلب غير موجود"}
            
            if request.status != ApprovalStatus.PENDING:
                return {"success": False, "error": "الطلب ليس في حالة انتظار"}
            
            # التحقق من صلاحية الموافق
            if not self._can_approve(request, approver_id):
                return {"success": False, "error": "ليس لديك صلاحية الموافقة على هذا الطلب"}
            
            # تسجيل الموافقة
            self._record_approval(request, approver_id, "approve", 
                                ApprovalStatus.APPROVED, comments)
            
            # الانتقال للخطوة التالية أو إكمال الطلب
            result = self._process_next_step(request)
            
            db.session.commit()
            return result
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في الموافقة على الطلب: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def reject_request(self, request_id: int, approver_id: int, 
                      reason: str) -> Dict[str, Any]:
        """رفض الطلب"""
        try:
            request = ApprovalRequest.query.get(request_id)
            if not request:
                return {"success": False, "error": "الطلب غير موجود"}
            
            if request.status != ApprovalStatus.PENDING:
                return {"success": False, "error": "الطلب ليس في حالة انتظار"}
            
            # التحقق من صلاحية الموافق
            if not self._can_approve(request, approver_id):
                return {"success": False, "error": "ليس لديك صلاحية رفض هذا الطلب"}
            
            # تسجيل الرفض
            self._record_approval(request, approver_id, "reject", 
                                ApprovalStatus.REJECTED, reason=reason)
            
            # تحديث حالة الطلب
            request.status = ApprovalStatus.REJECTED
            request.completed_at = datetime.utcnow()
            
            # إرسال إشعار للمقدم
            self._send_notification(request, "request_rejected", 
                                  request.requester_id, reason)
            
            db.session.commit()
            
            return {
                "success": True,
                "message": "تم رفض الطلب",
                "status": "rejected"
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في رفض الطلب: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def delegate_approval(self, request_id: int, delegator_id: int, 
                         delegate_id: int, reason: str) -> Dict[str, Any]:
        """تفويض الموافقة"""
        try:
            request = ApprovalRequest.query.get(request_id)
            if not request:
                return {"success": False, "error": "الطلب غير موجود"}
            
            # التحقق من صلاحية التفويض
            if not self._can_approve(request, delegator_id):
                return {"success": False, "error": "ليس لديك صلاحية تفويض هذا الطلب"}
            
            # تسجيل التفويض
            self._record_approval(request, delegate_id, "delegate", 
                                ApprovalStatus.PENDING, reason=reason,
                                delegated_from=delegator_id)
            
            # إرسال إشعار للمفوض إليه
            self._send_notification(request, "approval_delegated", 
                                  delegate_id, reason)
            
            db.session.commit()
            
            return {
                "success": True,
                "message": "تم تفويض الموافقة بنجاح"
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في تفويض الموافقة: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_pending_requests(self, user_id: int) -> List[Dict]:
        """الحصول على الطلبات المعلقة للمستخدم"""
        try:
            # البحث عن الطلبات التي يمكن للمستخدم الموافقة عليها
            requests = []
            
            # الطلبات المباشرة
            direct_requests = db.session.query(ApprovalRequest).join(
                ApprovalStep
            ).filter(
                and_(
                    ApprovalRequest.status == ApprovalStatus.PENDING,
                    ApprovalStep.step_order == ApprovalRequest.current_step,
                    ApprovalStep.approver_type == 'user',
                    ApprovalStep.approver_id == str(user_id)
                )
            ).all()
            
            requests.extend([req.to_dict() for req in direct_requests])
            
            # الطلبات المفوضة
            delegated_requests = db.session.query(ApprovalRequest).join(
                ApprovalDelegate
            ).filter(
                and_(
                    ApprovalRequest.status == ApprovalStatus.PENDING,
                    ApprovalDelegate.delegate_id == user_id,
                    ApprovalDelegate.is_active == True,
                    ApprovalDelegate.start_date <= datetime.utcnow(),
                    ApprovalDelegate.end_date >= datetime.utcnow()
                )
            ).all()
            
            requests.extend([req.to_dict() for req in delegated_requests])
            
            return requests
            
        except Exception as e:
            logger.error(f"خطأ في جلب الطلبات المعلقة: {str(e)}")
            return []
    
    def process_expired_requests(self):
        """معالجة الطلبات منتهية الصلاحية"""
        try:
            expired_requests = ApprovalRequest.query.filter(
                and_(
                    ApprovalRequest.status == ApprovalStatus.PENDING,
                    ApprovalRequest.expires_at < datetime.utcnow()
                )
            ).all()
            
            for request in expired_requests:
                request.status = ApprovalStatus.EXPIRED
                request.completed_at = datetime.utcnow()
                
                # تسجيل انتهاء الصلاحية
                self._record_approval(request, None, "expire", 
                                    ApprovalStatus.EXPIRED, 
                                    reason="انتهت صلاحية الطلب")
                
                # إرسال إشعار
                self._send_notification(request, "request_expired", 
                                      request.requester_id)
            
            db.session.commit()
            logger.info(f"تم معالجة {len(expired_requests)} طلب منتهي الصلاحية")
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في معالجة الطلبات منتهية الصلاحية: {str(e)}")
    
    def _find_workflow(self, entity_type: str, amount: float = None, 
                      metadata: Dict = None) -> Optional[ApprovalWorkflow]:
        """العثور على سير العمل المناسب"""
        workflows = ApprovalWorkflow.query.filter(
            and_(
                ApprovalWorkflow.is_active == True,
                ApprovalWorkflow.entity_type == entity_type
            )
        ).all()
        
        for workflow in workflows:
            if self._matches_conditions(workflow.conditions, amount, metadata):
                return workflow
        
        return None
    
    def _matches_conditions(self, conditions: Dict, amount: float = None, 
                          metadata: Dict = None) -> bool:
        """فحص تطابق الشروط"""
        if not conditions:
            return True
        
        # فحص شروط المبلغ
        if amount and 'amount' in conditions:
            amount_cond = conditions['amount']
            if 'min' in amount_cond and amount < amount_cond['min']:
                return False
            if 'max' in amount_cond and amount > amount_cond['max']:
                return False
        
        # فحص شروط البيانات الوصفية
        if metadata and 'metadata' in conditions:
            meta_cond = conditions['metadata']
            for key, value in meta_cond.items():
                if key not in metadata or metadata[key] != value:
                    return False
        
        return True
    
    def _start_approval_process(self, request: ApprovalRequest):
        """بدء عملية الموافقة"""
        # الحصول على الخطوة الأولى
        first_step = ApprovalStep.query.filter(
            and_(
                ApprovalStep.workflow_id == request.workflow_id,
                ApprovalStep.step_order == 1,
                ApprovalStep.is_active == True
            )
        ).first()
        
        if first_step:
            # إرسال إشعار للموافق الأول
            approver_ids = self._get_step_approvers(first_step)
            for approver_id in approver_ids:
                self._send_notification(request, "approval_required", 
                                      approver_id)
    
    def _can_approve(self, request: ApprovalRequest, user_id: int) -> bool:
        """فحص صلاحية الموافقة"""
        # الحصول على الخطوة الحالية
        current_step = ApprovalStep.query.filter(
            and_(
                ApprovalStep.workflow_id == request.workflow_id,
                ApprovalStep.step_order == request.current_step
            )
        ).first()
        
        if not current_step:
            return False
        
        # فحص الموافق المباشر
        if (current_step.approver_type == 'user' and 
            current_step.approver_id == str(user_id)):
            return True
        
        # فحص التفويض
        delegation = ApprovalDelegate.query.filter(
            and_(
                ApprovalDelegate.delegate_id == user_id,
                ApprovalDelegate.is_active == True,
                ApprovalDelegate.start_date <= datetime.utcnow(),
                ApprovalDelegate.end_date >= datetime.utcnow()
            )
        ).first()
        
        return delegation is not None
    
    def _record_approval(self, request: ApprovalRequest, approver_id: int,
                        action: str, status: ApprovalStatus, 
                        comments: str = None, reason: str = None,
                        delegated_from: int = None):
        """تسجيل إجراء الموافقة"""
        current_step = ApprovalStep.query.filter(
            and_(
                ApprovalStep.workflow_id == request.workflow_id,
                ApprovalStep.step_order == request.current_step
            )
        ).first()
        
        history = ApprovalHistory(
            request_id=request.id,
            step_id=current_step.id if current_step else None,
            action=action,
            status=status,
            approver_id=approver_id,
            comments=comments,
            reason=reason,
            delegated_from=delegated_from
        )
        
        db.session.add(history)
    
    def _process_next_step(self, request: ApprovalRequest) -> Dict[str, Any]:
        """معالجة الخطوة التالية"""
        workflow = request.workflow
        
        if workflow.approval_type == ApprovalType.SEQUENTIAL:
            return self._process_sequential_approval(request)
        elif workflow.approval_type == ApprovalType.PARALLEL:
            return self._process_parallel_approval(request)
        else:
            return self._process_majority_approval(request)
    
    def _process_sequential_approval(self, request: ApprovalRequest) -> Dict[str, Any]:
        """معالجة الموافقة المتتالية"""
        # الحصول على الخطوة التالية
        next_step = ApprovalStep.query.filter(
            and_(
                ApprovalStep.workflow_id == request.workflow_id,
                ApprovalStep.step_order == request.current_step + 1,
                ApprovalStep.is_active == True
            )
        ).first()
        
        if next_step:
            # الانتقال للخطوة التالية
            request.current_step += 1
            
            # إرسال إشعار للموافق التالي
            approver_ids = self._get_step_approvers(next_step)
            for approver_id in approver_ids:
                self._send_notification(request, "approval_required", 
                                      approver_id)
            
            return {
                "success": True,
                "message": "تم الانتقال للخطوة التالية",
                "status": "pending",
                "current_step": request.current_step
            }
        else:
            # إكمال الطلب
            request.status = ApprovalStatus.APPROVED
            request.completed_at = datetime.utcnow()
            
            # إرسال إشعار للمقدم
            self._send_notification(request, "request_approved", 
                                  request.requester_id)
            
            return {
                "success": True,
                "message": "تم الموافقة على الطلب نهائياً",
                "status": "approved"
            }
    
    def _process_parallel_approval(self, request: ApprovalRequest) -> Dict[str, Any]:
        """معالجة الموافقة المتوازية"""
        # فحص موافقة جميع الموافقين في الخطوة الحالية
        current_step = ApprovalStep.query.filter(
            and_(
                ApprovalStep.workflow_id == request.workflow_id,
                ApprovalStep.step_order == request.current_step
            )
        ).first()
        
        approver_ids = self._get_step_approvers(current_step)
        approved_count = ApprovalHistory.query.filter(
            and_(
                ApprovalHistory.request_id == request.id,
                ApprovalHistory.step_id == current_step.id,
                ApprovalHistory.status == ApprovalStatus.APPROVED
            )
        ).count()
        
        if approved_count >= len(approver_ids):
            # جميع الموافقين وافقوا، الانتقال للخطوة التالية
            return self._process_sequential_approval(request)
        else:
            return {
                "success": True,
                "message": f"تم تسجيل الموافقة ({approved_count}/{len(approver_ids)})",
                "status": "pending"
            }
    
    def _process_majority_approval(self, request: ApprovalRequest) -> Dict[str, Any]:
        """معالجة موافقة الأغلبية"""
        current_step = ApprovalStep.query.filter(
            and_(
                ApprovalStep.workflow_id == request.workflow_id,
                ApprovalStep.step_order == request.current_step
            )
        ).first()
        
        approver_ids = self._get_step_approvers(current_step)
        total_approvers = len(approver_ids)
        majority_needed = (total_approvers // 2) + 1
        
        approved_count = ApprovalHistory.query.filter(
            and_(
                ApprovalHistory.request_id == request.id,
                ApprovalHistory.step_id == current_step.id,
                ApprovalHistory.status == ApprovalStatus.APPROVED
            )
        ).count()
        
        if approved_count >= majority_needed:
            # تم الوصول للأغلبية
            return self._process_sequential_approval(request)
        else:
            return {
                "success": True,
                "message": f"تم تسجيل الموافقة ({approved_count}/{majority_needed} مطلوب)",
                "status": "pending"
            }
    
    def _get_step_approvers(self, step: ApprovalStep) -> List[int]:
        """الحصول على قائمة الموافقين للخطوة"""
        if step.approver_type == 'user':
            return [int(step.approver_id)]
        elif step.approver_type == 'role':
            # البحث عن المستخدمين بالدور المحدد
            # يحتاج تطوير حسب نظام الأدوار المستخدم
            return []
        elif step.approver_type == 'department':
            # البحث عن مدراء القسم
            # يحتاج تطوير حسب هيكل الأقسام
            return []
        
        return []
    
    def _send_notification(self, request: ApprovalRequest, 
                          notification_type: str, recipient_id: int,
                          additional_message: str = None):
        """إرسال إشعار"""
        try:
            # إنشاء رسالة الإشعار
            messages = {
                "approval_required": f"يتطلب طلب '{request.title}' موافقتك",
                "request_approved": f"تم الموافقة على طلبك '{request.title}'",
                "request_rejected": f"تم رفض طلبك '{request.title}'",
                "request_expired": f"انتهت صلاحية طلبك '{request.title}'",
                "approval_delegated": f"تم تفويض موافقة طلب '{request.title}' إليك"
            }
            
            message = messages.get(notification_type, "إشعار موافقة")
            if additional_message:
                message += f"\n{additional_message}"
            
            # حفظ الإشعار في قاعدة البيانات
            notification = ApprovalNotification(
                request_id=request.id,
                notification_type=notification_type,
                recipient_id=recipient_id,
                title=f"إشعار موافقة - {request.title}",
                message=message,
                channels=["email", "push"]
            )
            
            db.session.add(notification)
            
            # إرسال الإشعار
            self.notification_service.send_notification(
                notification_type="system",
                recipients=[recipient_id],
                subject=notification.title,
                message=message,
                priority="high"
            )
            
        except Exception as e:
            logger.error(f"خطأ في إرسال الإشعار: {str(e)}")

# إنشاء مثيل عام من محرك الموافقات
approval_engine = ApprovalEngine()
