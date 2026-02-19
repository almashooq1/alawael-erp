const PolicyService = require('../services/policyService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class PolicyController {
  // ==================== السياسات ====================

  /**
   * إنشاء سياسة جديدة - POST /api/policies
   */
  async createPolicy(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.user?.id || 'SYSTEM_USER';
      const policyData = {
        ...req.body,
        createdBy: userId,
        createdByName: req.user?.name
      };

      const result = await PolicyService.createPolicy(policyData);
      res.status(201).json(result);
    } catch (error) {
      logger.error(`Error in createPolicy: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * تحديث السياسة - PUT /api/policies/:policyId
   */
  async updatePolicy(req, res) {
    try {
      const { policyId } = req.params;
      const userId = req.user?.id || 'SYSTEM_USER';

      const updateData = {
        ...req.body,
        updatedBy: userId,
        updatedByName: req.user?.name
      };

      const result = await PolicyService.updatePolicy(policyId, updateData);
      res.json(result);
    } catch (error) {
      logger.error(`Error in updatePolicy: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * الحصول على السياسة - GET /api/policies/:policyId
   */
  async getPolicy(req, res) {
    try {
      const { policyId } = req.params;
      const policy = await PolicyService.getPolicy(policyId);
      res.json({ success: true, policy });
    } catch (error) {
      logger.error(`Error in getPolicy: ${error.message}`);
      const statusCode = error.message.includes('غير موجودة') ? 404 : 500;
      res.status(statusCode).json({ success: false, error: error.message });
    }
  }

  /**
   * الحصول على جميع السياسات - GET /api/policies
   */
  async getPolicies(req, res) {
    try {
      const filters = {
        policyType: req.query.type,
        status: req.query.status,
        department: req.query.department,
        searchTerm: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      const result = await PolicyService.getPolicies(filters);
      res.json(result);
    } catch (error) {
      logger.error(`Error in getPolicies: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * الحصول على السياسات النشطة - GET /api/policies/active/all
   */
  async getActivePolicies(req, res) {
    try {
      const policies = await PolicyService.getActivePolicies();
      res.json({ success: true, data: policies });
    } catch (error) {
      logger.error(`Error in getActivePolicies: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * حذف السياسة - DELETE /api/policies/:policyId
   */
  async deletePolicy(req, res) {
    try {
      const { policyId } = req.params;
      const result = await PolicyService.deletePolicy(policyId);
      res.json(result);
    } catch (error) {
      logger.error(`Error in deletePolicy: ${error.message}`);
      const statusCode = error.message.includes('غير موجودة') ? 404 : 400;
      res.status(statusCode).json({ success: false, error: error.message });
    }
  }

  // ==================== الموافقات ====================

  /**
   * إرسال للموافقة - POST /api/policies/:policyId/submit-approval
   */
  async submitForApproval(req, res) {
    try {
      const { policyId } = req.params;
      const { approvers } = req.body;

      const result = await PolicyService.submitForApproval(policyId, approvers);
      res.json(result);
    } catch (error) {
      logger.error(`Error in submitForApproval: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * الموافقة على السياسة - POST /api/policies/:policyId/approve
   */
  async approvePolicy(req, res) {
    try {
      const { policyId } = req.params;
      const { approverRole, comments } = req.body;
      const userId = req.user?.id;
      const userName = req.user?.name;

      const result = await PolicyService.approvePolicy(
        policyId,
        approverRole,
        userName,
        comments
      );
      res.json(result);
    } catch (error) {
      logger.error(`Error in approvePolicy: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * رفض السياسة - POST /api/policies/:policyId/reject
   */
  async rejectPolicy(req, res) {
    try {
      const { policyId } = req.params;
      const { approverRole, reason } = req.body;
      const userName = req.user?.name;

      const result = await PolicyService.rejectPolicy(
        policyId,
        approverRole,
        userName,
        reason
      );
      res.json(result);
    } catch (error) {
      logger.error(`Error in rejectPolicy: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * الحصول على السياسات المعلقة للموافقة
   */
  async getPendingApprovals(req, res) {
    try {
      const policies = await PolicyService.getPolicies({ 
        status: 'PENDING_APPROVAL',
        page: req.query.page,
        limit: req.query.limit
      });
      res.json(policies);
    } catch (error) {
      logger.error(`Error in getPendingApprovals: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==================== الاعترافات ====================

  /**
   * إرسال السياسة للاعتراف - POST /api/policies/:policyId/send-acknowledgement
   */
  async sendForAcknowledgement(req, res) {
    try {
      const { policyId } = req.params;
      const { employees } = req.body;

      const result = await PolicyService.sendForAcknowledgement(policyId, employees);
      res.json(result);
    } catch (error) {
      logger.error(`Error in sendForAcknowledgement: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * الاعتراف بالسياسات - POST /api/policies/acknowledge/batch
   */
  async acknowledgePolicies(req, res) {
    try {
      const employeeId = req.user?.employeeId || req.body.employeeId;
      const { policyIds } = req.body;
      const ipAddress = req.ip;

      const result = await PolicyService.acknowledgePolicies(employeeId, policyIds, ipAddress);
      res.json(result);
    } catch (error) {
      logger.error(`Error in acknowledgePolicies: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * الحصول على الاعترافات المعلقة - GET /api/acknowledgements/pending
   */
  async getPendingAcknowledgements(req, res) {
    try {
      const filters = {
        employeeId: req.query.employeeId || req.user?.employeeId,
        policyId: req.query.policyId,
        department: req.query.department,
        overdue: req.query.overdue === 'true',
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await PolicyService.getPendingAcknowledgements(filters);
      res.json(result);
    } catch (error) {
      logger.error(`Error in getPendingAcknowledgements: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * تقرير الاعترافات - GET /api/policies/:policyId/acknowledgement-report
   */
  async getAcknowledgementReports(req, res) {
    try {
      const { policyId } = req.params;
      const result = await PolicyService.getAcknowledgementReports(policyId);
      res.json(result);
    } catch (error) {
      logger.error(`Error in getAcknowledgementReports: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==================== المساعدات الإضافية ====================

  /**
   * الحصول على أنواع السياسات
   */
  getPolicyTypes(req, res) {
    const types = [
      { value: 'SALARY_INCENTIVES', label: 'سياسات الرواتب والحوافز' },
      { value: 'LEAVE_VACATION', label: 'سياسات الإجازات' },
      { value: 'SECURITY_COMPLIANCE', label: 'أمان وامتثال' },
      { value: 'LOANS_BENEFITS', label: 'قروض ومزايا' },
      { value: 'HR_PROCEDURES', label: 'إجراءات الموارد البشرية' },
      { value: 'WORKPLACE_CONDUCT', label: 'سلوك مكان العمل' },
      { value: 'HEALTH_SAFETY', label: 'الصحة والسلامة' },
      { value: 'DATA_CONFIDENTIALITY', label: 'سرية البيانات' },
      { value: 'PERFORMANCE_EVALUATION', label: 'تقييم الأداء' },
      { value: 'DISCIPLINARY', label: 'السياسات التأديبية' },
      { value: 'COMPENSATION', label: 'التعويضات' },
      { value: 'TRAINING_DEVELOPMENT', label: 'التدريب والتطوير' },
      { value: 'WORKPLACE_RIGHTS', label: 'حقوق مكان العمل' },
      { value: 'OTHER', label: 'أخرى' }
    ];

    res.json({ success: true, types });
  }

  /**
   * الحصول على حالات السياسات
   */
  getPolicyStatuses(req, res) {
    const statuses = [
      { value: 'DRAFT', label: 'مسودة' },
      { value: 'PENDING_APPROVAL', label: 'قيد الموافقة' },
      { value: 'ACTIVE', label: 'نشطة' },
      { value: 'ARCHIVED', label: 'مؤرشفة' },
      { value: 'SUSPENDED', label: 'معلقة' }
    ];

    res.json({ success: true, statuses });
  }

  /**
   * إحصائيات عامة
   */
  async getStatistics(req, res) {
    try {
      const policies = await PolicyService.getPolicies({ limit: 1000 });
      
      const stats = {
        totalPolicies: policies.pagination.total,
        activePolicies: policies.data.filter(p => p.status === 'ACTIVE').length,
        draftPolicies: policies.data.filter(p => p.status === 'DRAFT').length,
        pendingApproval: policies.data.filter(p => p.status === 'PENDING_APPROVAL').length,
        archivedPolicies: policies.data.filter(p => p.status === 'ARCHIVED').length,
        byType: this._countByType(policies.data)
      };

      res.json({ success: true, stats });
    } catch (error) {
      logger.error(`Error in getStatistics: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  _countByType(policies) {
    return policies.reduce((acc, policy) => {
      acc[policy.policyType] = (acc[policy.policyType] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = new PolicyController();
