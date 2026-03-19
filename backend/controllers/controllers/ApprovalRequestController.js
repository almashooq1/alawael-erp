// ApprovalRequestController.js
const ApprovalRequest = require('../models/ApprovalRequest');
const NotificationService = require('../services/notificationService');
// ...existing code...

const ApprovalRequestController = {
  // إنشاء طلب موافقة جديد
  createApprovalRequest: async (req, res) => {
    try {
      const { requestType, requestRefId, approvers, comment } = req.body;
      if (!approvers || !Array.isArray(approvers) || approvers.length === 0) {
        return res.status(400).json({ success: false, message: 'يجب تحديد سلسلة الموافقات' });
      }
      const steps = approvers.map(userId => ({ approver: userId, action: 'pending' }));
      const approval = await ApprovalRequest.create({
        requestType,
        requestRefId,
        requester: req.user._id,
        steps,
        comments: comment ? [{ user: req.user._id, text: comment }] : [],
      });
      // إشعار أول مسؤول
      const firstApprover = approvers[0];
      await NotificationService.sendNotification(firstApprover, {
        title: `طلب موافقة جديد (${requestType})`,
        message: `لديك طلب موافقة جديد من ${req.user.name || 'مستخدم'}`,
        channels: ['in-app', 'push'],
      });
      res.json({ success: true, approval });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // جلب طلبات الموافقة الخاصة بالمستخدم
  getMyApprovalRequests: async (req, res) => {
    try {
      const approvals = await ApprovalRequest.find({ requester: req.user._id }).sort({
        createdAt: -1,
      });
      res.json({ success: true, approvals });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // جلب الطلبات المعلقة للمسؤول الحالي
  getPendingApprovals: async (req, res) => {
    try {
      const approvals = await ApprovalRequest.find({
        'steps.approver': req.user._id,
        'steps.action': 'pending',
        status: 'pending',
      });
      res.json({ success: true, approvals });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // اتخاذ إجراء (موافقة/رفض) على خطوة الموافقة
  takeApprovalAction: async (req, res) => {
    try {
      const { approvalId } = req.params;
      const { action, comment } = req.body; // action: approved/rejected
      const approval = await ApprovalRequest.findById(approvalId);
      if (!approval) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
      const step = approval.steps[approval.currentStep];
      if (!step || String(step.approver) !== String(req.user._id) || step.action !== 'pending') {
        return res.status(403).json({ success: false, message: 'غير مصرح' });
      }
      step.action = action;
      step.actedAt = new Date();
      step.comment = comment;
      approval.comments.push({ user: req.user._id, text: comment });
      // تحديث الحالة العامة
      if (action === 'rejected') {
        approval.status = 'rejected';
      } else if (action === 'approved') {
        if (approval.currentStep < approval.steps.length - 1) {
          approval.currentStep += 1;
        } else {
          approval.status = 'approved';
        }
      }
      await approval.save();
      // إشعار صاحب الطلب
      await NotificationService.sendNotification(approval.requester, {
        title: `تحديث طلب الموافقة (${approval.requestType})`,
        message: `تم اتخاذ إجراء: ${action === 'approved' ? 'موافقة' : 'رفض'} على طلبك.`,
        channels: ['in-app', 'push'],
      });
      // إشعار المسؤول التالي إذا لم تنتهِ السلسلة
      if (approval.status === 'pending') {
        const nextStep = approval.steps[approval.currentStep];
        if (nextStep && nextStep.approver) {
          await NotificationService.sendNotification(nextStep.approver, {
            title: `طلب موافقة جديد بانتظارك (${approval.requestType})`,
            message: `يرجى مراجعة طلب الموافقة من ${req.user.name || 'مستخدم'}`,
            channels: ['in-app', 'push'],
          });
        }
      }
      res.json({ success: true, approval });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};

module.exports = ApprovalRequestController;
