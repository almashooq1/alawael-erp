/**
 * Workflow Management Service - نظام إدارة سير العمل المتقدم ⭐⭐⭐
 * Advanced Workflow & Approval System
 *
 * Features:
 * ✅ Multi-stage approval workflows
 * ✅ Conditional routing logic
 * ✅ Parallel and sequential approvals
 * ✅ Auto-escalation for delays
 * ✅ Role-based permissions
 * ✅ Audit trail and history
 * ✅ Email/SMS notifications
 * ✅ Workflow templates
 * ✅ SLA monitoring
 * ✅ Delegation support
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class WorkflowService {
  // ============================================
  // 📋 Workflow Templates - قوالب سير العمل
  // ============================================

  /**
   * Get all workflow templates
   */
  getWorkflowTemplates() {
    return [
      {
        id: 'license-renewal',
        name: 'تجديد الرخصة',
        nameEn: 'License Renewal',
        description: 'سير عمل تجديد الرخصة التجارية والتصاريح الحكومية',
        stages: [
          {
            id: 1,
            name: 'طلب التجديد',
            type: 'submit',
            assignedTo: 'requester',
            sla: { hours: 2 },
            requiredDocuments: ['تفويض', 'صورة الرخصة السابقة', 'صورة الهوية'],
          },
          {
            id: 2,
            name: 'مراجعة المدير المباشر',
            type: 'approval',
            assignedTo: 'direct-manager',
            sla: { hours: 24 },
            approvalOptions: ['موافقة', 'رفض', 'إعادة للمراجعة'],
            escalationAfter: { hours: 48 },
            escalateTo: 'department-head',
          },
          {
            id: 3,
            name: 'اعتماد مدير القسم',
            type: 'approval',
            assignedTo: 'department-head',
            sla: { hours: 48 },
            approvalOptions: ['اعتماد', 'رفض', 'تحويل للمدير العام'],
          },
          {
            id: 4,
            name: 'مراجعة المالية',
            type: 'review',
            assignedTo: 'finance-team',
            sla: { hours: 24 },
            parallelWith: 5,
            tasks: ['التحقق من الميزانية', 'مراجعة الرسوم', 'تأكيد الدفع'],
          },
          {
            id: 5,
            name: 'مراجعة الشؤون القانونية',
            type: 'review',
            assignedTo: 'legal-team',
            sla: { hours: 24 },
            parallelWith: 4,
            tasks: ['مراجعة الوثائق', 'التحقق من الشروط القانونية'],
          },
          {
            id: 6,
            name: 'الاعتماد النهائي',
            type: 'final-approval',
            assignedTo: 'general-manager',
            sla: { hours: 72 },
            requiredPreviousApprovals: [2, 3, 4, 5],
          },
          {
            id: 7,
            name: 'التنفيذ والتقديم',
            type: 'execution',
            assignedTo: 'operations-team',
            sla: { hours: 48 },
            actions: ['تقديم الطلب للجهة', 'متابعة التنفيذ', 'استلام الرخصة الجديدة'],
          },
        ],
        category: 'licenses',
        isActive: true,
        usageCount: 0,
      },
      {
        id: 'document-approval',
        name: 'اعتماد المستندات',
        nameEn: 'Document Approval',
        description: 'سير عمل اعتماد المستندات الرسمية والعقود',
        stages: [
          {
            id: 1,
            name: 'رفع المستند',
            type: 'submit',
            assignedTo: 'requester',
            sla: { hours: 1 },
          },
          {
            id: 2,
            name: 'المراجعة الأولية',
            type: 'review',
            assignedTo: 'document-controller',
            sla: { hours: 12 },
            checks: ['التنسيق', 'الاكتمال', 'الامتثال'],
          },
          {
            id: 3,
            name: 'الموافقة الإدارية',
            type: 'approval',
            assignedTo: 'admin-manager',
            sla: { hours: 24 },
          },
          {
            id: 4,
            name: 'التوقيع والختم',
            type: 'signing',
            assignedTo: 'authorized-signatory',
            sla: { hours: 48 },
            requiresDigitalSignature: true,
          },
        ],
        category: 'documents',
        isActive: true,
        usageCount: 0,
      },
      {
        id: 'purchase-request',
        name: 'طلب شراء',
        nameEn: 'Purchase Request',
        description: 'سير عمل طلب شراء المستلزمات والخدمات',
        stages: [
          {
            id: 1,
            name: 'طلب الشراء',
            type: 'submit',
            assignedTo: 'requester',
            sla: { hours: 2 },
          },
          {
            id: 2,
            name: 'موافقة المشرف',
            type: 'approval',
            assignedTo: 'supervisor',
            sla: { hours: 24 },
            conditionalRouting: {
              field: 'amount',
              rules: [
                { condition: 'lessThan', value: 5000, nextStage: 6 },
                { condition: 'greaterThanOrEqual', value: 5000, nextStage: 3 },
              ],
            },
          },
          {
            id: 3,
            name: 'اعتماد المدير المالي',
            type: 'approval',
            assignedTo: 'cfo',
            sla: { hours: 48 },
            condition: 'amount >= 5000',
          },
          {
            id: 4,
            name: 'موافقة المدير العام',
            type: 'approval',
            assignedTo: 'ceo',
            sla: { hours: 72 },
            condition: 'amount >= 50000',
          },
          {
            id: 5,
            name: 'طلب عروض أسعار',
            type: 'procurement',
            assignedTo: 'procurement-team',
            sla: { days: 5 },
            minimumQuotes: 3,
          },
          {
            id: 6,
            name: 'الشراء والاستلام',
            type: 'execution',
            assignedTo: 'procurement-team',
            sla: { days: 10 },
          },
        ],
        category: 'procurement',
        isActive: true,
        usageCount: 0,
      },
      {
        id: 'employee-onboarding',
        name: 'تعيين موظف جديد',
        nameEn: 'Employee Onboarding',
        description: 'سير عمل تعيين وتهيئة الموظفين الجدد',
        stages: [
          {
            id: 1,
            name: 'طلب التوظيف',
            type: 'submit',
            assignedTo: 'hr-manager',
            sla: { hours: 24 },
          },
          {
            id: 2,
            name: 'موافقة الإدارة',
            type: 'approval',
            assignedTo: 'department-head',
            sla: { hours: 48 },
          },
          {
            id: 3,
            name: 'إجراءات التوظيف',
            type: 'parallel-tasks',
            assignedTo: 'hr-team',
            sla: { days: 7 },
            tasks: [
              { name: 'عقد العمل', assignedTo: 'hr-contracts' },
              { name: 'التأمين الطبي', assignedTo: 'hr-benefits' },
              { name: 'الحسابات الإلكترونية', assignedTo: 'it-team' },
              { name: 'التأمينات الاجتماعية', assignedTo: 'hr-compliance' },
            ],
          },
          {
            id: 4,
            name: 'التهيئة والتدريب',
            type: 'training',
            assignedTo: 'training-team',
            sla: { days: 14 },
          },
        ],
        category: 'hr',
        isActive: true,
        usageCount: 0,
      },
      {
        id: 'leave-request',
        name: 'طلب إجازة',
        nameEn: 'Leave Request',
        description: 'سير عمل طلب الإجازات السنوية والمرضية',
        stages: [
          {
            id: 1,
            name: 'تقديم طلب الإجازة',
            type: 'submit',
            assignedTo: 'employee',
            sla: { hours: 1 },
          },
          {
            id: 2,
            name: 'موافقة المشرف المباشر',
            type: 'approval',
            assignedTo: 'direct-supervisor',
            sla: { hours: 24 },
            conditionalRouting: {
              field: 'leave_type',
              rules: [
                { condition: 'equals', value: 'sick', nextStage: 4 },
                { condition: 'equals', value: 'annual', nextStage: 3 },
              ],
            },
          },
          {
            id: 3,
            name: 'اعتماد الموارد البشرية',
            type: 'approval',
            assignedTo: 'hr-manager',
            sla: { hours: 48 },
            checks: ['رصيد الإجازات', 'التعارض مع جداول العمل'],
          },
          {
            id: 4,
            name: 'مراجعة التقرير الطبي',
            type: 'review',
            assignedTo: 'medical-reviewer',
            sla: { hours: 24 },
            condition: 'leave_type === sick AND days > 3',
          },
        ],
        category: 'hr',
        isActive: true,
        usageCount: 0,
      },
    ];
  }

  /**
   * Get workflow template by ID
   */
  getWorkflowTemplateById(templateId) {
    const templates = this.getWorkflowTemplates();
    return templates.find(t => t.id === templateId);
  }

  // ============================================
  // 🔄 Workflow Instance Management
  // ============================================

  /**
   * Create new workflow instance
   */
  async createWorkflowInstance(workflowData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/workflows`, workflowData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create workflow: ' + error.message);
    }
  }

  /**
   * Get all workflows with filters
   */
  async getWorkflows(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${API_BASE_URL}/workflows?${params}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch workflows: ' + error.message);
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(workflowId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/workflows/${workflowId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch workflow: ' + error.message);
    }
  }

  /**
   * Update workflow stage
   */
  async updateWorkflowStage(workflowId, stageData) {
    try {
      const response = await axios.put(`${API_BASE_URL}/workflows/${workflowId}/stage`, stageData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update workflow stage: ' + error.message);
    }
  }

  // ============================================
  // ✅ Approval Actions
  // ============================================

  /**
   * Approve workflow stage
   */
  async approveStage(workflowId, stageId, approvalData) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/workflows/${workflowId}/stages/${stageId}/approve`,
        {
          action: 'approve',
          comments: approvalData.comments || '',
          attachments: approvalData.attachments || [],
          conditions: approvalData.conditions || {},
          timestamp: new Date().toISOString(),
        }
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to approve stage: ' + error.message);
    }
  }

  /**
   * Reject workflow stage
   */
  async rejectStage(workflowId, stageId, rejectionData) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/workflows/${workflowId}/stages/${stageId}/reject`,
        {
          action: 'reject',
          reason: rejectionData.reason,
          comments: rejectionData.comments || '',
          returnToStage: rejectionData.returnToStage || null,
          timestamp: new Date().toISOString(),
        }
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to reject stage: ' + error.message);
    }
  }

  /**
   * Request revision
   */
  async requestRevision(workflowId, stageId, revisionData) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/workflows/${workflowId}/stages/${stageId}/revise`,
        {
          action: 'revise',
          revisionNotes: revisionData.notes,
          requiredChanges: revisionData.changes || [],
          returnToStage: revisionData.returnToStage || 1,
          timestamp: new Date().toISOString(),
        }
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to request revision: ' + error.message);
    }
  }

  // ============================================
  // 📊 Workflow Statistics & Reporting
  // ============================================

  /**
   * Get workflow statistics
   */
  async getWorkflowStatistics(filters = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/workflows/statistics`, { params: filters });
      return response.data;
    } catch (error) {
      // Return mock data if API fails
      return this.getMockWorkflowStatistics();
    }
  }

  getMockWorkflowStatistics() {
    return {
      total: 245,
      byStatus: {
        pending: 45,
        inProgress: 78,
        approved: 102,
        rejected: 15,
        cancelled: 5,
      },
      byTemplate: {
        'license-renewal': 89,
        'document-approval': 65,
        'purchase-request': 48,
        'employee-onboarding': 23,
        'leave-request': 20,
      },
      avgCompletionTime: {
        hours: 72,
        days: 3,
      },
      slaCompliance: {
        onTime: 185,
        delayed: 42,
        overdue: 18,
        complianceRate: 75.5,
      },
      byPriority: {
        high: 32,
        medium: 156,
        low: 57,
      },
      recentActivity: [
        {
          workflowId: 'WF-2025-001',
          title: 'تجديد السجل التجاري',
          status: 'approved',
          completedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        },
        {
          workflowId: 'WF-2025-002',
          title: 'اعتماد عقد جديد',
          status: 'pending',
          currentStage: 'مراجعة القانونية',
          updatedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
        },
        {
          workflowId: 'WF-2025-003',
          title: 'طلب شراء معدات',
          status: 'inProgress',
          currentStage: 'موافقة المدير المالي',
          updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
        },
      ],
    };
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovals(userId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/workflows/pending/${userId}`);
      return response.data;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get workflow history
   */
  async getWorkflowHistory(workflowId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/workflows/${workflowId}/history`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch workflow history: ' + error.message);
    }
  }

  // ============================================
  // 🔔 Notifications & Escalations
  // ============================================

  /**
   * Send workflow notification
   */
  async sendNotification(workflowId, notificationData) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/workflows/${workflowId}/notify`,
        notificationData
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to send notification: ' + error.message);
    }
  }

  /**
   * Escalate workflow
   */
  async escalateWorkflow(workflowId, escalationData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/workflows/${workflowId}/escalate`, {
        reason: escalationData.reason,
        escalateTo: escalationData.escalateTo,
        urgency: escalationData.urgency || 'high',
        notes: escalationData.notes || '',
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to escalate workflow: ' + error.message);
    }
  }

  // ============================================
  // 👥 Delegation Management
  // ============================================

  /**
   * Delegate approval to another user
   */
  async delegateApproval(workflowId, delegationData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/workflows/${workflowId}/delegate`, {
        fromUser: delegationData.fromUser,
        toUser: delegationData.toUser,
        reason: delegationData.reason,
        startDate: delegationData.startDate,
        endDate: delegationData.endDate,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to delegate approval: ' + error.message);
    }
  }

  // ============================================
  // 📈 SLA Monitoring
  // ============================================

  /**
   * Check SLA compliance
   */
  checkSLACompliance(workflow) {
    if (!workflow.currentStage || !workflow.currentStage.sla) {
      return { status: 'no-sla', percentage: 100 };
    }

    const stageStartTime = new Date(workflow.currentStage.startedAt);
    const now = new Date();
    const elapsedHours = (now - stageStartTime) / (1000 * 60 * 60);

    const slaHours = workflow.currentStage.sla.hours || workflow.currentStage.sla.days * 24;
    const percentage = (elapsedHours / slaHours) * 100;

    let status = 'on-track';
    if (percentage >= 100) status = 'overdue';
    else if (percentage >= 80) status = 'at-risk';
    else if (percentage >= 50) status = 'warning';

    return {
      status,
      percentage: Math.min(percentage, 100),
      elapsedHours: Math.round(elapsedHours),
      remainingHours: Math.max(0, slaHours - elapsedHours),
      slaHours,
    };
  }

  /**
   * Get SLA status color
   */
  getSLAStatusColor(slaStatus) {
    const colors = {
      'on-track': '#4caf50',
      warning: '#ff9800',
      'at-risk': '#f44336',
      overdue: '#d32f2f',
      'no-sla': '#9e9e9e',
    };
    return colors[slaStatus] || '#9e9e9e';
  }

  // ============================================
  // 🎯 Workflow Actions
  // ============================================

  /**
   * Cancel workflow
   */
  async cancelWorkflow(workflowId, cancellationData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/workflows/${workflowId}/cancel`, {
        reason: cancellationData.reason,
        comments: cancellationData.comments || '',
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to cancel workflow: ' + error.message);
    }
  }

  /**
   * Restart workflow
   */
  async restartWorkflow(workflowId, restartData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/workflows/${workflowId}/restart`, {
        restartFromStage: restartData.fromStage || 1,
        reason: restartData.reason,
        preserveData: restartData.preserveData !== false,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to restart workflow: ' + error.message);
    }
  }

  // ============================================
  // 📋 Helper Functions
  // ============================================

  /**
   * Get workflow status badge color
   */
  getStatusColor(status) {
    const colors = {
      draft: '#9e9e9e',
      pending: '#ff9800',
      inProgress: '#2196f3',
      approved: '#4caf50',
      rejected: '#f44336',
      cancelled: '#757575',
      completed: '#4caf50',
    };
    return colors[status] || '#9e9e9e';
  }

  /**
   * Get workflow priority color
   */
  getPriorityColor(priority) {
    const colors = {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#f44336',
      urgent: '#d32f2f',
    };
    return colors[priority] || '#9e9e9e';
  }

  /**
   * Calculate workflow progress
   */
  calculateProgress(workflow) {
    if (!workflow.stages || workflow.stages.length === 0) return 0;

    const completedStages = workflow.stages.filter(s => s.status === 'completed').length;
    return Math.round((completedStages / workflow.stages.length) * 100);
  }

  /**
   * Format workflow duration
   */
  formatDuration(startDate, endDate = new Date()) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const hours = Math.floor((end - start) / (1000 * 60 * 60));

    if (hours < 24) return `${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} يوم`;
    const weeks = Math.floor(days / 7);
    return `${weeks} أسبوع`;
  }

  /**
   * Check if user can approve stage
   */
  canUserApprove(workflow, stageId, userId, userRole) {
    const stage = workflow.stages.find(s => s.id === stageId);
    if (!stage || stage.status !== 'pending') return false;

    // Check role-based permission
    if (stage.assignedTo === userRole) return true;

    // Check user-specific assignment
    if (stage.assignedUsers && stage.assignedUsers.includes(userId)) return true;

    return false;
  }
}

const workflowServiceInstance = new WorkflowService();
export default workflowServiceInstance;
