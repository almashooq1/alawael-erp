const Policy = require('../models/Policy');
const PolicyAcknowledgement = require('../models/PolicyAcknowledgement');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class PolicyService {
  // ==================== السياسات ====================

  /**
   * إنشاء سياسة جديدة
   */
  async createPolicy(policyData) {
    try {
      const policyId = `POL-${Date.now()}-${uuidv4().substring(0, 8)}`;
      
      const policy = new Policy({
        policyId,
        ...policyData
      });

      await policy.save();
      logger.info(`Policy created: ${policyId} by ${policyData.createdBy}`);
      return { success: true, policy, message: 'تم إنشاء السياسة بنجاح' };
    } catch (error) {
      logger.error(`Error creating policy: ${error.message}`);
      throw new Error(`فشل في إنشاء السياسة: ${error.message}`);
    }
  }

  /**
   * تحديث السياسة
   */
  async updatePolicy(policyId, updateData) {
    try {
      const policy = await Policy.findOne({ policyId });
      if (!policy) {
        throw new Error('السياسة غير موجودة');
      }

      // حفظ الإصدار السابق
      if (updateData.content && updateData.content !== policy.content) {
        policy.previousVersions.push({
          versionNumber: policy.version,
          content: policy.content,
          contentAr: policy.contentAr,
          effectiveDate: policy.effectiveDate,
          createdBy: policy.updatedBy || policy.createdBy
        });
        policy.version += 1;
      }

      Object.assign(policy, {
        ...updateData,
        updatedBy: updateData.updatedBy
      });

      await policy.save();
      logger.info(`Policy updated: ${policyId}`);
      return { success: true, policy, message: 'تم تحديث السياسة بنجاح' };
    } catch (error) {
      logger.error(`Error updating policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على السياسة
   */
  async getPolicy(policyId) {
    try {
      const policy = await Policy.findOne({ policyId });
      if (!policy) {
        throw new Error('السياسة غير موجودة');
      }
      
      // زيادة عدد المشاهدات
      policy.stats.viewCount += 1;
      await policy.save();
      
      return policy;
    } catch (error) {
      logger.error(`Error fetching policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على جميع السياسات مع التصفية
   */
  async getPolicies(filters = {}) {
    try {
      let query = {};

      if (filters.policyType) query.policyType = filters.policyType;
      if (filters.status) query.status = filters.status;
      if (filters.department) query.applicableDepartments = filters.department;
      if (filters.searchTerm) {
        query.$or = [
          { policyName: { $regex: filters.searchTerm, $options: 'i' } },
          { description: { $regex: filters.searchTerm, $options: 'i' } },
          { keywords: { $in: [new RegExp(filters.searchTerm, 'i')] } }
        ];
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const policies = await Policy.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Policy.countDocuments(query);

      return {
        success: true,
        data: policies,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(`Error fetching policies: ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على السياسات النشطة
   */
  async getActivePolicies() {
    try {
      const policies = await Policy.find({ status: 'ACTIVE' })
        .sort({ policyType: 1, createdAt: -1 });

      return policies.filter(p => p.isActive());
    } catch (error) {
      logger.error(`Error fetching active policies: ${error.message}`);
      throw error;
    }
  }

  /**
   * حذف السياسة
   */
  async deletePolicy(policyId) {
    try {
      const policy = await Policy.findOne({ policyId });
      if (!policy) {
        throw new Error('السياسة غير موجودة');
      }

      // التحقق من وجود اعترافات
      const acknowledgements = await PolicyAcknowledgement
        .countDocuments({ policyId: policy._id });

      if (acknowledgements > 0) {
        throw new Error('لا يمكن حذف السياسة - يوجد اعترافات مرتبطة بها');
      }

      await Policy.deleteOne({ policyId });
      logger.info(`Policy deleted: ${policyId}`);
      return { success: true, message: 'تم حذف السياسة بنجاح' };
    } catch (error) {
      logger.error(`Error deleting policy: ${error.message}`);
      throw error;
    }
  }

  // ==================== الموافقات ====================

  /**
   * إرسال للموافقة
   */
  async submitForApproval(policyId, requiredApprovers) {
    try {
      const policy = await Policy.findOne({ policyId });
      if (!policy) throw new Error('السياسة غير موجودة');

      policy.status = 'PENDING_APPROVAL';
      policy.requiredApprovals = requiredApprovers;

      // إنشاء سجلات الموافقة
      policy.approvals = requiredApprovers.map(role => ({
        approverRole: role,
        status: 'PENDING'
      }));

      await policy.save();
      logger.info(`Policy submitted for approval: ${policyId}`);

      // إرسال إشعارات للموافقين - سيتم إضافة هذا لاحقاً
      return { success: true, policy, message: 'تم إرسال السياسة للموافقة' };
    } catch (error) {
      logger.error(`Error submitting for approval: ${error.message}`);
      throw error;
    }
  }

  /**
   * الموافقة على السياسة
   */
  async approvePolicy(policyId, approverRole, approverName, comments = '') {
    try {
      const policy = await Policy.findOne({ policyId });
      if (!policy) throw new Error('السياسة غير موجودة');

      const approval = policy.approvals.find(a => a.approverRole === approverRole);
      if (!approval) {
        throw new Error('هذا الدور لا يملك صلاحية الموافقة');
      }

      approval.status = 'APPROVED';
      approval.approvalDate = new Date();
      approval.approverName = approverName;
      approval.comments = comments;

      // التحقق من اكتمال جميع الموافقات
      if (policy.isFullyApproved()) {
        policy.status = 'ACTIVE';
      }

      await policy.save();
      logger.info(`Policy approved by ${approverRole}: ${policyId}`);

      return { success: true, policy, message: 'تم الموافقة على السياسة' };
    } catch (error) {
      logger.error(`Error approving policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * رفض السياسة
   */
  async rejectPolicy(policyId, approverRole, approverName, reason) {
    try {
      const policy = await Policy.findOne({ policyId });
      if (!policy) throw new Error('السياسة غير موجودة');

      const approval = policy.approvals.find(a => a.approverRole === approverRole);
      if (!approval) throw new Error('هذا الدور لا يملك صلاحية الرفض');

      approval.status = 'REJECTED';
      approval.approvalDate = new Date();
      approval.approverName = approverName;
      approval.comments = reason;

      policy.status = 'DRAFT';
      await policy.save();

      logger.info(`Policy rejected by ${approverRole}: ${policyId}`);
      return { success: true, policy, message: 'تم رفض السياسة' };
    } catch (error) {
      logger.error(`Error rejecting policy: ${error.message}`);
      throw error;
    }
  }

  // ==================== الاعترافات ====================

  /**
   * إرسال السياسة للاعتراف
   */
  async sendForAcknowledgement(policyId, employees) {
    try {
      const policy = await Policy.findOne({ policyId });
      if (!policy) throw new Error('السياسة غير موجودة');

      const acknowledgements = [];

      for (const emp of employees) {
        const ackId = `ACK-${Date.now()}-${uuidv4().substring(0, 8)}`;
        
        const acknowledgement = new PolicyAcknowledgement({
          acknowledgementId: ackId,
          policyId: policy._id,
          policyName: policy.policyName,
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          department: emp.department,
          email: emp.email,
          dueDate: emp.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 أيام
        });

        await acknowledgement.save();
        acknowledgements.push(acknowledgement);
      }

      policy.stats.totalAcknowledgements = employees.length;
      policy.stats.pendingAcknowledgements = employees.length;
      await policy.save();

      logger.info(`Policy sent for acknowledgement: ${policyId} to ${employees.length} employees`);
      return { success: true, acknowledgements, message: 'تم إرسال السياسة للاعتراف' };
    } catch (error) {
      logger.error(`Error sending for acknowledgement: ${error.message}`);
      throw error;
    }
  }

  /**
   * الاعتراف بالسياسة
   */
  async acknowledgePolicies(employeeId, policyIds, ipAddress = null) {
    try {
      const results = [];

      for (const policyId of policyIds) {
        const acknowledgement = await PolicyAcknowledgement.findOne({
          policyId,
          employeeId
        });

        if (!acknowledgement) {
          results.push({ policyId, success: false, message: 'الاعترافات غير موجودة' });
          continue;
        }

        acknowledgement.status = 'ACKNOWLEDGED';
        acknowledgement.acknowledgedDate = new Date();
        acknowledgement.ipAddress = ipAddress;
        await acknowledgement.save();

        // تحديث إحصائيات السياسة
        const policy = await Policy.findById(policyId);
        if (policy) {
          policy.stats.pendingAcknowledgements = Math.max(0, policy.stats.pendingAcknowledgements - 1);
          policy.acknowledgedBy.push({
            employeeId,
            employeeName: acknowledgement.employeeName,
            acknowledgedDate: new Date(),
            ipAddress
          });
          await policy.save();
        }

        results.push({ policyId, success: true, message: 'تم الاعتراف بالسياسة' });
      }

      logger.info(`Policies acknowledged by ${employeeId}`);
      return { success: true, results };
    } catch (error) {
      logger.error(`Error acknowledging policies: ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على الاعترافات المعلقة
   */
  async getPendingAcknowledgements(filters = {}) {
    try {
      let query = { status: 'PENDING' };

      if (filters.employeeId) query.employeeId = filters.employeeId;
      if (filters.policyId) {
        const policy = await Policy.findOne({ policyId: filters.policyId });
        if (policy) query.policyId = policy._id;
      }
      if (filters.department) query.department = filters.department;
      if (filters.overdue) {
        query.dueDate = { $lt: new Date() };
      }

      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const acknowledgements = await PolicyAcknowledgement.find(query)
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit)
        .populate('policyId');

      const total = await PolicyAcknowledgement.countDocuments(query);

      return {
        success: true,
        data: acknowledgements,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(`Error fetching pending acknowledgements: ${error.message}`);
      throw error;
    }
  }

  /**
   * تقارير الاعترافات
   */
  async getAcknowledgementReports(policyId) {
    try {
      const policy = await Policy.findOne({ policyId });
      if (!policy) throw new Error('السياسة غير موجودة');

      const acknowledgements = await PolicyAcknowledgement.find({
        policyId: policy._id
      });

      const report = {
        policyId,
        policyName: policy.policyName,
        totalEmployees: policy.stats.totalAcknowledgements,
        acknowledged: acknowledgements.filter(a => a.status === 'ACKNOWLEDGED').length,
        pending: acknowledgements.filter(a => a.status === 'PENDING').length,
        rejected: acknowledgements.filter(a => a.status === 'REJECTED').length,
        expired: acknowledgements.filter(a => a.status === 'EXPIRED').length,
        
        acknowledgementRate: (
          (acknowledgements.filter(a => a.status === 'ACKNOWLEDGED').length / policy.stats.totalAcknowledgements) * 100
        ).toFixed(2) + '%',
        
        bytDepartment: this._groupByDepartment(acknowledgements),
        byStatus: this._groupByStatus(acknowledgements),
        details: acknowledgements
      };

      return { success: true, report };
    } catch (error) {
      logger.error(`Error generating acknowledgement reports: ${error.message}`);
      throw error;
    }
  }

  // ==================== الخوادم المساعدة ====================

  _groupByDepartment(acknowledgements) {
    return acknowledgements.reduce((acc, ack) => {
      if (!acc[ack.department]) {
        acc[ack.department] = { total: 0, acknowledged: 0 };
      }
      acc[ack.department].total++;
      if (ack.status === 'ACKNOWLEDGED') {
        acc[ack.department].acknowledged++;
      }
      return acc;
    }, {});
  }

  _groupByStatus(acknowledgements) {
    return acknowledgements.reduce((acc, ack) => {
      acc[ack.status] = (acc[ack.status] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = new PolicyService();
