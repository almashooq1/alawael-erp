const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { escapeRegex } = require('../utils/sanitize');
const {
  Standard,
  Accreditation,
  QualityAudit,
  ComplianceTracking,
  QualityIndicator,
} = require('../models/qualityManagement');
const safeError = require('../utils/safeError');

// ============================================
// ROOT ENDPOINT — GET /api/quality
// ============================================
router.get('/', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const [standardsCount, accreditationsCount, auditsCount, complianceCount, indicatorsCount] =
      await Promise.all([
        Standard.countDocuments(),
        Accreditation.countDocuments(),
        QualityAudit.countDocuments(),
        ComplianceTracking.countDocuments(),
        QualityIndicator.countDocuments(),
      ]);
    res.json({
      success: true,
      module: 'quality',
      data: { standardsCount, accreditationsCount, auditsCount, complianceCount, indicatorsCount },
      endpoints: [
        'GET  /standards',
        'GET  /accreditations',
        'GET  /audits',
        'GET  /compliance',
        'GET  /indicators',
        'GET  /dashboard',
        'GET  /reports/compliance-by-department',
        'GET  /reports/findings-trend',
      ],
      message: 'وحدة الجودة — Quality module',
    });
  } catch (error) {
    res.json({
      success: true,
      module: 'quality',
      data: {},
      message: 'وحدة الجودة — Quality module',
    });
  }
});

// ============================================
// STANDARDS ROUTES - معايير الجودة
// ============================================

// Get all standards
router.get('/standards', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { nameAr: { $regex: escapeRegex(search), $options: 'i' } },
        { standardId: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [standards, total] = await Promise.all([
      Standard.find(filter)
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Standard.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        standards,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// Get single standard
router.get('/standards/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const standard = await Standard.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!standard) {
      return res.status(404).json({
        success: false,
        message: 'Standard not found',
      });
    }

    res.json({
      success: true,
      data: standard,
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// Create standard
router.post(
  '/standards',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager']),
  async (req, res) => {
    try {
      const standardData = {
        ...req.body,
        createdBy: req.user._id,
      };

      const standard = new Standard(standardData);
      await standard.save();

      res.status(201).json({
        success: true,
        message: 'Standard created successfully',
        data: standard,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating standard',
        error: 'خطأ في البيانات المدخلة',
      });
    }
  }
);

// Update standard
router.put(
  '/standards/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager']),
  async (req, res) => {
    try {
      const updateData = {
        ...req.body,
        lastModifiedBy: req.user._id,
      };

      const standard = await Standard.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!standard) {
        return res.status(404).json({
          success: false,
          message: 'Standard not found',
        });
      }

      res.json({
        success: true,
        message: 'Standard updated successfully',
        data: standard,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating standard',
        error: 'خطأ في البيانات المدخلة',
      });
    }
  }
);

// Delete standard
router.delete('/standards/:id', authenticate, requireBranchAccess, authorize(['admin']), async (req, res) => {
  try {
    const standard = await Standard.findByIdAndDelete(req.params.id);

    if (!standard) {
      return res.status(404).json({
        success: false,
        message: 'Standard not found',
      });
    }

    res.json({
      success: true,
      message: 'Standard deleted successfully',
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// ============================================
// ACCREDITATIONS ROUTES - الاعتمادات
// ============================================

// Get all accreditations
router.get('/accreditations', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { type, status, expiringSoon } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    // Get accreditations expiring in next 90 days
    if (expiringSoon === 'true') {
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
      filter.expiryDate = {
        $gte: new Date(),
        $lte: ninetyDaysFromNow,
      };
      filter.status = 'active';
    }

    const accreditations = await Accreditation.find(filter)
      .populate('standards')
      .populate('responsiblePerson', 'name email')
      .sort({ expiryDate: 1 });

    res.json({
      success: true,
      data: accreditations,
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// Get single accreditation
router.get('/accreditations/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const accreditation = await Accreditation.findById(req.params.id)
      .populate('standards')
      .populate('responsiblePerson', 'name email');

    if (!accreditation) {
      return res.status(404).json({
        success: false,
        message: 'Accreditation not found',
      });
    }

    res.json({
      success: true,
      data: accreditation,
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// Create accreditation
router.post(
  '/accreditations',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager']),
  async (req, res) => {
    try {
      const accreditation = new Accreditation(req.body);
      await accreditation.save();

      res.status(201).json({
        success: true,
        message: 'Accreditation created successfully',
        data: accreditation,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating accreditation',
        error: 'خطأ في البيانات المدخلة',
      });
    }
  }
);

// Update accreditation
router.put(
  '/accreditations/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager']),
  async (req, res) => {
    try {
      const {
        name,
        nameAr,
        type,
        issuingBody,
        certificateNumber,
        issueDate,
        expiryDate,
        scope,
        scopeAr,
        standards,
        status,
        documents,
        auditSchedule,
        responsiblePerson,
        notes,
        notesAr,
      } = req.body;
      const accreditation = await Accreditation.findByIdAndUpdate(
        req.params.id,
        {
          name,
          nameAr,
          type,
          issuingBody,
          certificateNumber,
          issueDate,
          expiryDate,
          scope,
          scopeAr,
          standards,
          status,
          documents,
          auditSchedule,
          responsiblePerson,
          notes,
          notesAr,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!accreditation) {
        return res.status(404).json({
          success: false,
          message: 'Accreditation not found',
        });
      }

      res.json({
        success: true,
        message: 'Accreditation updated successfully',
        data: accreditation,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating accreditation',
        error: 'خطأ في البيانات المدخلة',
      });
    }
  }
);

// Delete accreditation
router.delete('/accreditations/:id', authenticate, requireBranchAccess, authorize(['admin']), async (req, res) => {
  try {
    const accreditation = await Accreditation.findByIdAndDelete(req.params.id);

    if (!accreditation) {
      return res.status(404).json({
        success: false,
        message: 'Accreditation not found',
      });
    }

    res.json({
      success: true,
      message: 'Accreditation deleted successfully',
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// ============================================
// QUALITY AUDITS ROUTES - مراجعات الجودة
// ============================================

// Get all audits
router.get('/audits', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { type, status, fromDate, toDate } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (fromDate || toDate) {
      filter.auditDate = {};
      if (fromDate) filter.auditDate.$gte = new Date(fromDate);
      if (toDate) filter.auditDate.$lte = new Date(toDate);
    }

    const audits = await QualityAudit.find(filter)
      .populate('accreditation')
      .populate('standards')
      .populate('createdBy', 'name email')
      .populate('findings.responsiblePerson', 'name email')
      .sort({ auditDate: -1 });

    res.json({
      success: true,
      data: audits,
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// Get single audit
router.get('/audits/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const audit = await QualityAudit.findById(req.params.id)
      .populate('accreditation')
      .populate('standards')
      .populate('createdBy', 'name email')
      .populate('findings.responsiblePerson', 'name email');

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found',
      });
    }

    res.json({
      success: true,
      data: audit,
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// Create audit
router.post(
  '/audits',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager', 'auditor']),
  async (req, res) => {
    try {
      const auditData = {
        ...req.body,
        createdBy: req.user._id,
      };

      const audit = new QualityAudit(auditData);
      await audit.save();

      res.status(201).json({
        success: true,
        message: 'Audit created successfully',
        data: audit,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating audit',
        error: 'خطأ في البيانات المدخلة',
      });
    }
  }
);

// Update audit
router.put(
  '/audits/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager', 'auditor']),
  async (req, res) => {
    try {
      const {
        title,
        titleAr,
        type,
        accreditation: accRef,
        standards,
        auditDate,
        auditors,
        scope,
        scopeAr,
        findings,
        overallScore,
        status,
        reportFile,
        nextFollowUpDate,
      } = req.body;
      const audit = await QualityAudit.findByIdAndUpdate(
        req.params.id,
        {
          title,
          titleAr,
          type,
          accreditation: accRef,
          standards,
          auditDate,
          auditors,
          scope,
          scopeAr,
          findings,
          overallScore,
          status,
          reportFile,
          nextFollowUpDate,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!audit) {
        return res.status(404).json({
          success: false,
          message: 'Audit not found',
        });
      }

      res.json({
        success: true,
        message: 'Audit updated successfully',
        data: audit,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating audit',
        error: 'خطأ في البيانات المدخلة',
      });
    }
  }
);

// Delete audit
router.delete(
  '/audits/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager']),
  async (req, res) => {
    try {
      const audit = await QualityAudit.findByIdAndDelete(req.params.id);

      if (!audit) {
        return res.status(404).json({
          success: false,
          message: 'Audit not found',
        });
      }

      res.json({
        success: true,
        message: 'Audit deleted successfully',
      });
    } catch (error) {
      safeError(res, error, 'quality');
    }
  }
);

// Add finding to audit
router.post(
  '/audits/:id/findings',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager', 'auditor']),
  async (req, res) => {
    try {
      const audit = await QualityAudit.findById(req.params.id);

      if (!audit) {
        return res.status(404).json({
          success: false,
          message: 'Audit not found',
        });
      }

      audit.findings.push(req.body);
      await audit.save();

      res.json({
        success: true,
        message: 'Finding added successfully',
        data: audit,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error adding finding',
        error: 'خطأ في البيانات المدخلة',
      });
    }
  }
);

// Update finding status
router.patch('/audits/:auditId/findings/:findingId/status', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { status } = req.body;

    const audit = await QualityAudit.findById(req.params.auditId);
    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found',
      });
    }

    const finding = audit.findings.id(req.params.findingId);
    if (!finding) {
      return res.status(404).json({
        success: false,
        message: 'Finding not found',
      });
    }

    finding.status = status;
    await audit.save();

    res.json({
      success: true,
      message: 'Finding status updated',
      data: finding,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating finding status',
      error: 'خطأ في البيانات المدخلة',
    });
  }
});

// ============================================
// COMPLIANCE TRACKING ROUTES - تتبع الامتثال
// ============================================

// Get compliance trackings
router.get('/compliance', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { standard, department, complianceLevel } = req.query;

    const filter = {};
    if (standard) filter.standard = standard;
    if (department) filter.department = department;
    if (complianceLevel) filter.complianceLevel = complianceLevel;

    const trackings = await ComplianceTracking.find(filter)
      .populate('standard')
      .populate('assessor', 'name email')
      .populate('gaps.responsiblePerson', 'name email')
      .sort({ assessmentDate: -1 });

    res.json({
      success: true,
      data: trackings,
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// Create compliance tracking
router.post(
  '/compliance',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager', 'auditor']),
  async (req, res) => {
    try {
      const trackingData = {
        ...req.body,
        assessor: req.user._id,
      };

      const tracking = new ComplianceTracking(trackingData);
      await tracking.save();

      res.status(201).json({
        success: true,
        message: 'Compliance tracking created successfully',
        data: tracking,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating compliance tracking',
        error: 'خطأ في البيانات المدخلة',
      });
    }
  }
);

// Get single compliance tracking
router.get('/compliance/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const tracking = await ComplianceTracking.findById(req.params.id)
      .populate('standard')
      .populate('assessor', 'name email')
      .populate('gaps.responsiblePerson', 'name email');

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Compliance tracking not found',
      });
    }

    res.json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// Update compliance tracking
router.put(
  '/compliance/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager', 'auditor']),
  async (req, res) => {
    try {
      const {
        standard,
        requirementId,
        department,
        complianceLevel,
        assessmentDate,
        evidence,
        gaps,
        nextReviewDate,
        notes,
        notesAr,
      } = req.body;
      const tracking = await ComplianceTracking.findByIdAndUpdate(
        req.params.id,
        {
          standard,
          requirementId,
          department,
          complianceLevel,
          assessmentDate,
          evidence,
          gaps,
          nextReviewDate,
          notes,
          notesAr,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!tracking) {
        return res.status(404).json({
          success: false,
          message: 'Compliance tracking not found',
        });
      }

      res.json({
        success: true,
        message: 'Compliance tracking updated successfully',
        data: tracking,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating compliance tracking',
        error: 'خطأ في البيانات المدخلة',
      });
    }
  }
);

// Delete compliance tracking
router.delete(
  '/compliance/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager']),
  async (req, res) => {
    try {
      const tracking = await ComplianceTracking.findByIdAndDelete(req.params.id);

      if (!tracking) {
        return res.status(404).json({
          success: false,
          message: 'Compliance tracking not found',
        });
      }

      res.json({
        success: true,
        message: 'Compliance tracking deleted successfully',
      });
    } catch (error) {
      safeError(res, error, 'quality');
    }
  }
);

// Update gap status
router.patch('/compliance/:trackingId/gaps/:gapIndex/status', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { status } = req.body;
    const { trackingId, gapIndex } = req.params;

    const tracking = await ComplianceTracking.findById(trackingId);
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Compliance tracking not found',
      });
    }

    if (!tracking.gaps[gapIndex]) {
      return res.status(404).json({
        success: false,
        message: 'Gap not found',
      });
    }

    tracking.gaps[gapIndex].status = status;
    await tracking.save();

    res.json({
      success: true,
      message: 'Gap status updated',
      data: tracking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating gap status',
      error: 'خطأ في البيانات المدخلة',
    });
  }
});

// ============================================
// QUALITY INDICATORS ROUTES - مؤشرات الجودة
// ============================================

// Get all indicators
router.get('/indicators', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { category, status } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const indicators = await QualityIndicator.find(filter)
      .populate('relatedStandards')
      .populate('responsible', 'name email')
      .populate('measurements.recordedBy', 'name email')
      .sort({ category: 1 });

    res.json({
      success: true,
      data: indicators,
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// Get single indicator
router.get('/indicators/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const indicator = await QualityIndicator.findById(req.params.id)
      .populate('relatedStandards')
      .populate('responsible', 'name email')
      .populate('measurements.recordedBy', 'name email');

    if (!indicator) {
      return res.status(404).json({
        success: false,
        message: 'Indicator not found',
      });
    }

    res.json({
      success: true,
      data: indicator,
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// Create indicator
router.post(
  '/indicators',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager']),
  async (req, res) => {
    try {
      const indicator = new QualityIndicator(req.body);
      await indicator.save();

      res.status(201).json({
        success: true,
        message: 'Indicator created successfully',
        data: indicator,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating indicator',
        error: 'خطأ في البيانات المدخلة',
      });
    }
  }
);

// Update indicator
router.put(
  '/indicators/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager']),
  async (req, res) => {
    try {
      const {
        name,
        nameAr,
        category,
        relatedStandards,
        formula,
        targetValue,
        unit,
        dataSource,
        collectionFrequency,
        measurements,
        responsible,
        status,
      } = req.body;
      const indicator = await QualityIndicator.findByIdAndUpdate(
        req.params.id,
        {
          name,
          nameAr,
          category,
          relatedStandards,
          formula,
          targetValue,
          unit,
          dataSource,
          collectionFrequency,
          measurements,
          responsible,
          status,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!indicator) {
        return res.status(404).json({
          success: false,
          message: 'Indicator not found',
        });
      }

      res.json({
        success: true,
        message: 'Indicator updated successfully',
        data: indicator,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating indicator',
        error: 'خطأ في البيانات المدخلة',
      });
    }
  }
);

// Delete indicator
router.delete(
  '/indicators/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager']),
  async (req, res) => {
    try {
      const indicator = await QualityIndicator.findByIdAndDelete(req.params.id);

      if (!indicator) {
        return res.status(404).json({
          success: false,
          message: 'Indicator not found',
        });
      }

      res.json({
        success: true,
        message: 'Indicator deleted successfully',
      });
    } catch (error) {
      safeError(res, error, 'quality');
    }
  }
);

// Add measurement to indicator
router.post(
  '/indicators/:id/measurements',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'quality_manager', 'data_collector']),
  async (req, res) => {
    try {
      const indicator = await QualityIndicator.findById(req.params.id);

      if (!indicator) {
        return res.status(404).json({
          success: false,
          message: 'Indicator not found',
        });
      }

      const measurement = {
        ...req.body,
        recordedBy: req.user._id,
      };

      indicator.measurements.push(measurement);
      await indicator.save();

      res.json({
        success: true,
        message: 'Measurement added successfully',
        data: indicator,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error adding measurement',
        error: 'خطأ في البيانات المدخلة',
      });
    }
  }
);

// ============================================
// DASHBOARD & ANALYTICS ROUTES
// ============================================

// Quality dashboard overview
router.get('/dashboard', authenticate, requireBranchAccess, async (req, res) => {
  try {
    // Count standards by category
    const standardsByCategory = await Standard.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    // Count accreditations by status
    const accreditationsByStatus = await Accreditation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Expiring accreditations (next 90 days)
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    const expiringAccreditations = await Accreditation.countDocuments({
      status: 'active',
      expiryDate: { $gte: new Date(), $lte: ninetyDaysFromNow },
    });

    // Recent audits
    const recentAudits = await QualityAudit.find()
      .sort({ auditDate: -1 })
      .limit(5)
      .populate('accreditation', 'name nameAr')
      .select('auditId title titleAr auditDate status overallScore');

    // Open findings count
    const openFindings = await QualityAudit.aggregate([
      { $unwind: '$findings' },
      { $match: { 'findings.status': { $in: ['open', 'in_progress'] } } },
      { $count: 'total' },
    ]);

    // Compliance overview
    const complianceOverview = await ComplianceTracking.aggregate([
      { $group: { _id: '$complianceLevel', count: { $sum: 1 } } },
    ]);

    // Quality indicators performance
    const indicatorsPerformance = await QualityIndicator.find({ status: 'active' })
      .select('indicatorId name nameAr targetValue measurements')
      .lean();

    const indicatorsSummary = indicatorsPerformance.map(ind => {
      const latestMeasurement = ind.measurements[ind.measurements.length - 1];
      return {
        indicatorId: ind.indicatorId,
        name: ind.name,
        nameAr: ind.nameAr,
        targetValue: ind.targetValue,
        currentValue: latestMeasurement?.value || 0,
        achieving: latestMeasurement ? latestMeasurement.value >= ind.targetValue : false,
      };
    });

    res.json({
      success: true,
      data: {
        standardsByCategory,
        accreditationsByStatus,
        expiringAccreditations,
        recentAudits,
        openFindings: openFindings[0]?.total || 0,
        complianceOverview,
        indicatorsSummary,
      },
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// Compliance report by department
router.get('/reports/compliance-by-department', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const report = await ComplianceTracking.aggregate([
      {
        $group: {
          _id: {
            department: '$department',
            complianceLevel: '$complianceLevel',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.department',
          compliance: {
            $push: {
              level: '$_id.complianceLevel',
              count: '$count',
            },
          },
          total: { $sum: '$count' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

// Audit findings trend
router.get('/reports/findings-trend', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const matchFilter = {};
    if (fromDate || toDate) {
      matchFilter.auditDate = {};
      if (fromDate) matchFilter.auditDate.$gte = new Date(fromDate);
      if (toDate) matchFilter.auditDate.$lte = new Date(toDate);
    }

    const trend = await QualityAudit.aggregate([
      { $match: matchFilter },
      { $unwind: '$findings' },
      {
        $group: {
          _id: {
            year: { $year: '$auditDate' },
            month: { $month: '$auditDate' },
            type: '$findings.type',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    safeError(res, error, 'quality');
  }
});

module.exports = router;
