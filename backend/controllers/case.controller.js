/**
 * Case Management Controller
 * متحكم إدارة الحالات
 *
 * @description معالجة الطلبات والاستجابات لنظام إدارة الحالات
 * @version 1.0.0
 * @date 2026-01-30
 */

const caseService = require('../services/caseManagementService');

class CaseController {
  /**
   * إنشاء حالة جديدة
   * POST /api/cases
   */
  async createCase(req, res) {
    try {
      const userId = req.user.id; // من middleware المصادقة
      const caseData = req.body;

      const newCase = await caseService.createCase(caseData, userId);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الحالة بنجاح',
        data: newCase,
      });
    } catch (error) {
      console.error('Error creating case:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'فشل في إنشاء الحالة',
        error: error.message,
      });
    }
  }

  /**
   * الحصول على قائمة الحالات مع فلترة
   * GET /api/cases
   */
  async getCases(req, res) {
    try {
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        disabilityType: req.query.disabilityType,
        severity: req.query.severity,
        riskLevel: req.query.riskLevel,
        teamMember: req.query.teamMember,
        beneficiaryId: req.query.beneficiaryId,
        isActive: req.query.isActive === 'true',
        isArchived: req.query.isArchived === 'true',
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };

      // إزالة القيم غير المحددة
      Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc',
      };

      const result = await caseService.getCases(filters, pagination);

      res.status(200).json({
        success: true,
        data: result.cases,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting cases:', error);
      res.status(500).json({
        success: false,
        message: 'فشل في الحصول على الحالات',
        error: error.message,
      });
    }
  }

  /**
   * الحصول على تفاصيل حالة محددة
   * GET /api/cases/:id
   */
  async getCaseById(req, res) {
    try {
      const caseId = req.params.id;
      const caseData = await caseService.getCaseById(caseId);

      res.status(200).json({
        success: true,
        data: caseData,
      });
    } catch (error) {
      console.error('Error getting case:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'الحالة غير موجودة',
        error: error.message,
      });
    }
  }

  /**
   * تحديث حالة
   * PUT /api/cases/:id
   */
  async updateCase(req, res) {
    try {
      const caseId = req.params.id;
      const userId = req.user.id;
      const updateData = req.body;

      const updatedCase = await caseService.updateCase(caseId, updateData, userId);

      res.status(200).json({
        success: true,
        message: 'تم تحديث الحالة بنجاح',
        data: updatedCase,
      });
    } catch (error) {
      console.error('Error updating case:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'فشل في تحديث الحالة',
        error: error.message,
      });
    }
  }

  /**
   * تغيير حالة القبول
   * POST /api/cases/:id/status
   */
  async changeStatus(req, res) {
    try {
      const caseId = req.params.id;
      const userId = req.user.id;
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'الحالة الجديدة مطلوبة',
        });
      }

      const updatedCase = await caseService.changeStatus(caseId, status, userId, notes);

      res.status(200).json({
        success: true,
        message: 'تم تغيير الحالة بنجاح',
        data: updatedCase,
      });
    } catch (error) {
      console.error('Error changing status:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'فشل في تغيير الحالة',
        error: error.message,
      });
    }
  }

  /**
   * تعيين فريق معالج
   * POST /api/cases/:id/assign
   */
  async assignTeam(req, res) {
    try {
      const caseId = req.params.id;
      const userId = req.user.id;
      const { teamMembers } = req.body;

      if (!teamMembers || !Array.isArray(teamMembers) || teamMembers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد أعضاء الفريق',
        });
      }

      const updatedCase = await caseService.assignTeam(caseId, teamMembers, userId);

      res.status(200).json({
        success: true,
        message: 'تم تعيين الفريق بنجاح',
        data: updatedCase,
      });
    } catch (error) {
      console.error('Error assigning team:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'فشل في تعيين الفريق',
        error: error.message,
      });
    }
  }

  /**
   * إزالة عضو من الفريق
   * DELETE /api/cases/:id/team/:memberId
   */
  async removeTeamMember(req, res) {
    try {
      const caseId = req.params.id;
      const memberId = req.params.memberId;
      const userId = req.user.id;

      const updatedCase = await caseService.removeTeamMember(caseId, memberId, userId);

      res.status(200).json({
        success: true,
        message: 'تم إزالة عضو الفريق بنجاح',
        data: updatedCase,
      });
    } catch (error) {
      console.error('Error removing team member:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'فشل في إزالة عضو الفريق',
        error: error.message,
      });
    }
  }

  /**
   * إنشاء/تحديث الخطة التربوية الفردية (IEP)
   * POST /api/cases/:id/iep
   */
  async createOrUpdateIEP(req, res) {
    try {
      const caseId = req.params.id;
      const userId = req.user.id;
      const iepData = req.body;

      const iep = await caseService.createOrUpdateIEP(caseId, iepData, userId);

      res.status(200).json({
        success: true,
        message: 'تم حفظ الخطة التربوية الفردية بنجاح',
        data: iep,
      });
    } catch (error) {
      console.error('Error creating/updating IEP:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'فشل في حفظ الخطة التربوية الفردية',
        error: error.message,
      });
    }
  }

  /**
   * اعتماد الخطة التربوية الفردية
   * POST /api/cases/:id/iep/approve
   */
  async approveIEP(req, res) {
    try {
      const caseId = req.params.id;
      const userId = req.user.id;

      const iep = await caseService.approveIEP(caseId, userId);

      res.status(200).json({
        success: true,
        message: 'تم اعتماد الخطة التربوية الفردية بنجاح',
        data: iep,
      });
    } catch (error) {
      console.error('Error approving IEP:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'فشل في اعتماد الخطة التربوية الفردية',
        error: error.message,
      });
    }
  }

  /**
   * إضافة ملاحظة
   * POST /api/cases/:id/notes
   */
  async addNote(req, res) {
    try {
      const caseId = req.params.id;
      const userId = req.user.id;
      const noteData = req.body;

      const note = await caseService.addNote(caseId, noteData, userId);

      res.status(201).json({
        success: true,
        message: 'تم إضافة الملاحظة بنجاح',
        data: note,
      });
    } catch (error) {
      console.error('Error adding note:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'فشل في إضافة الملاحظة',
        error: error.message,
      });
    }
  }

  /**
   * الحصول على تاريخ الحالة
   * GET /api/cases/:id/history
   */
  async getCaseHistory(req, res) {
    try {
      const caseId = req.params.id;
      const history = await caseService.getCaseHistory(caseId);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error getting case history:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'فشل في الحصول على التاريخ',
        error: error.message,
      });
    }
  }

  /**
   * الحصول على إحصائيات الحالات
   * GET /api/cases/statistics
   */
  async getStatistics(req, res) {
    try {
      const filters = {
        status: req.query.status,
        disabilityType: req.query.disabilityType,
        teamMember: req.query.teamMember,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };

      // إزالة القيم غير المحددة
      Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

      const statistics = await caseService.getStatistics(filters);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        message: 'فشل في الحصول على الإحصائيات',
        error: error.message,
      });
    }
  }

  /**
   * البحث المتقدم
   * GET /api/cases/search
   */
  async advancedSearch(req, res) {
    try {
      const searchParams = req.query;
      const cases = await caseService.advancedSearch(searchParams);

      res.status(200).json({
        success: true,
        data: cases,
      });
    } catch (error) {
      console.error('Error in advanced search:', error);
      res.status(500).json({
        success: false,
        message: 'فشل في البحث',
        error: error.message,
      });
    }
  }

  /**
   * الحالات الحرجة
   * GET /api/cases/critical
   */
  async getCriticalCases(req, res) {
    try {
      const cases = await caseService.getCriticalCases();

      res.status(200).json({
        success: true,
        data: cases,
        count: cases.length,
      });
    } catch (error) {
      console.error('Error getting critical cases:', error);
      res.status(500).json({
        success: false,
        message: 'فشل في الحصول على الحالات الحرجة',
        error: error.message,
      });
    }
  }

  /**
   * الحالات المعلقة
   * GET /api/cases/pending
   */
  async getPendingCases(req, res) {
    try {
      const cases = await caseService.getPendingCases();

      res.status(200).json({
        success: true,
        data: cases,
        count: cases.length,
      });
    } catch (error) {
      console.error('Error getting pending cases:', error);
      res.status(500).json({
        success: false,
        message: 'فشل في الحصول على الحالات المعلقة',
        error: error.message,
      });
    }
  }

  /**
   * تقرير التقدم
   * GET /api/cases/:id/progress-report
   */
  async getProgressReport(req, res) {
    try {
      const caseId = req.params.id;
      const report = await caseService.getProgressReport(caseId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error getting progress report:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'فشل في الحصول على تقرير التقدم',
        error: error.message,
      });
    }
  }

  /**
   * أرشفة حالة
   * POST /api/cases/:id/archive
   */
  async archiveCase(req, res) {
    try {
      const caseId = req.params.id;
      const userId = req.user.id;
      const { reason } = req.body;

      const archivedCase = await caseService.archiveCase(caseId, userId, reason);

      res.status(200).json({
        success: true,
        message: 'تم أرشفة الحالة بنجاح',
        data: archivedCase,
      });
    } catch (error) {
      console.error('Error archiving case:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'فشل في أرشفة الحالة',
        error: error.message,
      });
    }
  }

  /**
   * استعادة من الأرشيف
   * POST /api/cases/:id/unarchive
   */
  async unarchiveCase(req, res) {
    try {
      const caseId = req.params.id;
      const unarchivedCase = await caseService.unarchiveCase(caseId);

      res.status(200).json({
        success: true,
        message: 'تم استعادة الحالة من الأرشيف بنجاح',
        data: unarchivedCase,
      });
    } catch (error) {
      console.error('Error unarchiving case:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'فشل في استعادة الحالة',
        error: error.message,
      });
    }
  }

  /**
   * حذف حالة (مخصص للمسؤولين فقط)
   * DELETE /api/cases/:id
   */
  async deleteCase(req, res) {
    try {
      const caseId = req.params.id;

      // تأكيد أن المستخدم لديه صلاحية الحذف
      if (req.user.role !== 'super_admin' && req.user.role !== 'center_director') {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية لحذف الحالات',
        });
      }

      // في الواقع، من الأفضل الأرشفة بدلاً من الحذف
      await caseService.archiveCase(caseId, req.user.id, 'حذف من قبل المسؤول');

      res.status(200).json({
        success: true,
        message: 'تم حذف الحالة بنجاح (أرشفة)',
      });
    } catch (error) {
      console.error('Error deleting case:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'فشل في حذف الحالة',
        error: error.message,
      });
    }
  }
}

module.exports = new CaseController();
