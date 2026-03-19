/**
 * Mental Health & Psychosocial Support Controller
 * وحدة التحكم بالدعم النفسي والصحة النفسية
 */

const mhpssService = require('../services/mhpss.service');

class MHPSSController {
  // ─── Counseling Sessions ─────────────────────────────────────────────────

  async createSession(req, res) {
    try {
      const data = {
        ...req.body,
        createdBy: req.user?._id,
        counselor: req.body.counselor || req.user?._id,
      };
      const result = await mhpssService.createSession(data);
      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getSessions(req, res) {
    try {
      const { page, limit, sortBy, sortOrder, status, type, counselor, beneficiary, search } =
        req.query;
      const filters = {};
      if (status) filters.status = status;
      if (type) filters.type = type;
      if (counselor) filters.counselor = counselor;
      if (beneficiary) filters.beneficiary = beneficiary;
      if (search) {
        const { escapeRegex } = require('../utils/sanitize');
        const safeSearch = escapeRegex(search);
        filters.$or = [
          { chiefComplaint: { $regex: safeSearch, $options: 'i' } },
          { sessionNumber: { $regex: safeSearch, $options: 'i' } },
          { groupTopic: { $regex: safeSearch, $options: 'i' } },
        ];
      }
      const result = await mhpssService.getSessions(filters, { page, limit, sortBy, sortOrder });
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getSessionById(req, res) {
    try {
      const result = await mhpssService.getSessionById(req.params.id);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async updateSession(req, res) {
    try {
      const data = { ...req.body, updatedBy: req.user?._id };
      const result = await mhpssService.updateSession(req.params.id, data);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async deleteSession(req, res) {
    try {
      const result = await mhpssService.deleteSession(req.params.id);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getSessionStats(req, res) {
    try {
      const result = await mhpssService.getSessionStats();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  // ─── Mental Health Programs ──────────────────────────────────────────────

  async createProgram(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id };
      const result = await mhpssService.createProgram(data);
      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getPrograms(req, res) {
    try {
      const { page, limit, sortBy, sortOrder, status, category, targetAudience, search } =
        req.query;
      const filters = {};
      if (status) filters.status = status;
      if (category) filters.category = category;
      if (targetAudience) filters.targetAudience = targetAudience;
      if (search) {
        const { escapeRegex } = require('../utils/sanitize');
        const safeSearch = escapeRegex(search);
        filters.$or = [
          { name: { $regex: safeSearch, $options: 'i' } },
          { nameAr: { $regex: safeSearch, $options: 'i' } },
          { description: { $regex: safeSearch, $options: 'i' } },
        ];
      }
      const result = await mhpssService.getPrograms(filters, { page, limit, sortBy, sortOrder });
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getProgramById(req, res) {
    try {
      const result = await mhpssService.getProgramById(req.params.id);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async updateProgram(req, res) {
    try {
      const result = await mhpssService.updateProgram(req.params.id, req.body);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async deleteProgram(req, res) {
    try {
      const result = await mhpssService.deleteProgram(req.params.id);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async enrollInProgram(req, res) {
    try {
      const { beneficiaryId } = req.body;
      if (!beneficiaryId) {
        return res.status(400).json({ success: false, message: 'معرّف المستفيد مطلوب' });
      }
      const result = await mhpssService.enrollInProgram(req.params.id, beneficiaryId);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async unenrollFromProgram(req, res) {
    try {
      const { beneficiaryId } = req.body;
      if (!beneficiaryId) {
        return res.status(400).json({ success: false, message: 'معرّف المستفيد مطلوب' });
      }
      const result = await mhpssService.unenrollFromProgram(req.params.id, beneficiaryId);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  // ─── Psychological Assessments ───────────────────────────────────────────

  async createAssessment(req, res) {
    try {
      const data = {
        ...req.body,
        createdBy: req.user?._id,
        assessor: req.body.assessor || req.user?._id,
      };
      const result = await mhpssService.createAssessment(data);
      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getAssessments(req, res) {
    try {
      const {
        page,
        limit,
        sortBy,
        sortOrder,
        type,
        status,
        severityLevel,
        beneficiary,
        toolUsed,
        search,
      } = req.query;
      const filters = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (severityLevel) filters.severityLevel = severityLevel;
      if (beneficiary) filters.beneficiary = beneficiary;
      if (toolUsed) filters.toolUsed = toolUsed;
      if (search) {
        const { escapeRegex } = require('../utils/sanitize');
        const safeSearch = escapeRegex(search);
        filters.$or = [
          { assessmentCode: { $regex: safeSearch, $options: 'i' } },
          { clinicalInterpretation: { $regex: safeSearch, $options: 'i' } },
        ];
      }
      const result = await mhpssService.getAssessments(filters, { page, limit, sortBy, sortOrder });
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getAssessmentById(req, res) {
    try {
      const result = await mhpssService.getAssessmentById(req.params.id);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async updateAssessment(req, res) {
    try {
      const result = await mhpssService.updateAssessment(req.params.id, req.body);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async deleteAssessment(req, res) {
    try {
      const result = await mhpssService.deleteAssessment(req.params.id);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getBeneficiaryAssessmentHistory(req, res) {
    try {
      const result = await mhpssService.getBeneficiaryAssessmentHistory(req.params.beneficiaryId);
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getAssessmentStats(req, res) {
    try {
      const result = await mhpssService.getAssessmentStats();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  // ─── Crisis Interventions ────────────────────────────────────────────────

  async createCrisis(req, res) {
    try {
      const data = {
        ...req.body,
        createdBy: req.user?._id,
        reportedBy: req.body.reportedBy || req.user?._id,
      };
      const result = await mhpssService.createCrisis(data);
      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getCrises(req, res) {
    try {
      const {
        page,
        limit,
        sortBy,
        sortOrder,
        status,
        severity,
        crisisType,
        beneficiary,
        assignedTo,
        search,
      } = req.query;
      const filters = {};
      if (status) filters.status = status;
      if (severity) filters.severity = severity;
      if (crisisType) filters.crisisType = crisisType;
      if (beneficiary) filters.beneficiary = beneficiary;
      if (assignedTo) filters.assignedTo = assignedTo;
      if (search) {
        const { escapeRegex } = require('../utils/sanitize');
        const safeSearch = escapeRegex(search);
        filters.$or = [
          { caseNumber: { $regex: safeSearch, $options: 'i' } },
          { description: { $regex: safeSearch, $options: 'i' } },
        ];
      }
      const result = await mhpssService.getCrises(filters, { page, limit, sortBy, sortOrder });
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getCrisisById(req, res) {
    try {
      const result = await mhpssService.getCrisisById(req.params.id);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async updateCrisis(req, res) {
    try {
      const result = await mhpssService.updateCrisis(req.params.id, req.body);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async deleteCrisis(req, res) {
    try {
      const result = await mhpssService.deleteCrisis(req.params.id);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async addCrisisTimelineEvent(req, res) {
    try {
      const eventData = { ...req.body, performedBy: req.user?._id };
      const result = await mhpssService.addCrisisTimelineEvent(req.params.id, eventData);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async addCrisisFollowUp(req, res) {
    try {
      const followUpData = { ...req.body, conductedBy: req.user?._id };
      const result = await mhpssService.addCrisisFollowUp(req.params.id, followUpData);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getCrisisStats(req, res) {
    try {
      const result = await mhpssService.getCrisisStats();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  // ─── Support Groups ──────────────────────────────────────────────────────

  async createGroup(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id };
      const result = await mhpssService.createGroup(data);
      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getGroups(req, res) {
    try {
      const { page, limit, sortBy, sortOrder, status, category, facilitator, search } = req.query;
      const filters = {};
      if (status) filters.status = status;
      if (category) filters.category = category;
      if (facilitator) filters.facilitator = facilitator;
      if (search) {
        const { escapeRegex } = require('../utils/sanitize');
        const safeSearch = escapeRegex(search);
        filters.$or = [
          { name: { $regex: safeSearch, $options: 'i' } },
          { nameAr: { $regex: safeSearch, $options: 'i' } },
          { description: { $regex: safeSearch, $options: 'i' } },
        ];
      }
      const result = await mhpssService.getGroups(filters, { page, limit, sortBy, sortOrder });
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async getGroupById(req, res) {
    try {
      const result = await mhpssService.getGroupById(req.params.id);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async updateGroup(req, res) {
    try {
      const result = await mhpssService.updateGroup(req.params.id, req.body);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async deleteGroup(req, res) {
    try {
      const result = await mhpssService.deleteGroup(req.params.id);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async addGroupMember(req, res) {
    try {
      const { beneficiaryId } = req.body;
      if (!beneficiaryId) {
        return res.status(400).json({ success: false, message: 'معرّف المستفيد مطلوب' });
      }
      const result = await mhpssService.addGroupMember(req.params.id, beneficiaryId);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async removeGroupMember(req, res) {
    try {
      const { beneficiaryId } = req.body;
      if (!beneficiaryId) {
        return res.status(400).json({ success: false, message: 'معرّف المستفيد مطلوب' });
      }
      const result = await mhpssService.removeGroupMember(req.params.id, beneficiaryId);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  async addGroupSession(req, res) {
    try {
      const result = await mhpssService.addGroupSession(req.params.id, req.body);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────

  async getDashboard(req, res) {
    try {
      const result = await mhpssService.getDashboardStats();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }
}

module.exports = new MHPSSController();
