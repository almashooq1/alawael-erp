/**
 * Financial Validation Controller
 * Handles compliance checks and violation management
 */

const { Violation, ValidationReport, ValidatingRule } = require('../models/Validation');

// Get all violations with filtering
exports.getViolations = async (req, res) => {
  try {
    const { status, severity, type, skip = 0, limit = 20 } = req.query;

    let query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (type) query.violationType = type;

    const violations = await Violation.find(query)
      .populate('transactionId', ['_id', 'date', 'amount', 'description'])
      .populate('resolution.resolvedBy', ['name', 'email'])
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ detectionDate: -1 });

    const total = await Violation.countDocuments(query);

    res.json({
      success: true,
      data: violations,
      pagination: {
        total,
        skip: parseInt(skip),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get violation detail
exports.getViolation = async (req, res) => {
  try {
    const violation = await Violation.findById(req.params.id)
      .populate('transactionId')
      .populate('relatedTransactions')
      .populate('auditTrail.performedBy', ['name', 'email'])
      .populate('resolution.resolvedBy', ['name', 'email']);

    if (!violation) {
      return res.status(404).json({ success: false, message: 'Violation not found' });
    }

    res.json({ success: true, data: violation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Resolve violation
exports.resolveViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes, correctionAmount, status } = req.body;

    const violation = await Violation.findByIdAndUpdate(
      id,
      {
        status: status || 'resolved',
        resolution: {
          resolvedBy: req.user._id,
          resolvedAt: new Date(),
          resolution_notes,
          correctionAmount
        }
      },
      { new: true }
    ).populate('resolution.resolvedBy', ['name', 'email']);

    // Add to audit trail
    await Violation.updateOne(
      { _id: id },
      {
        $push: {
          auditTrail: {
            action: 'resolved',
            performedBy: req.user._id,
            notes: resolution_notes
          }
        }
      }
    );

    res.json({ success: true, data: violation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate validation report
exports.generateReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // Get all violations in period
    const violations = await Violation.find({
      detectionDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });

    // Calculate metrics
    const violationCountByType = {
      amount_mismatch: violations.filter(v => v.violationType === 'amount_mismatch').length,
      missing_entry: violations.filter(v => v.violationType === 'missing_entry').length,
      incorrect_account: violations.filter(v => v.violationType === 'incorrect_account').length,
      invalid_date: violations.filter(v => v.violationType === 'invalid_date').length,
      duplicate: violations.filter(v => v.violationType === 'duplicate').length,
      unauthorized: violations.filter(v => v.violationType === 'unauthorized').length
    };

    const violationsCount = {
      critical: violations.filter(v => v.severity === 'critical').length,
      high: violations.filter(v => v.severity === 'high').length,
      medium: violations.filter(v => v.severity === 'medium').length,
      low: violations.filter(v => v.severity === 'low').length
    };

    const resolvedViolations = violations.filter(v => v.status === 'resolved').length;
    const waivedViolations = violations.filter(v => v.status === 'waived').length;
    const outstandingViolations = violations.filter(
      v => ['detected', 'investigating'].includes(v.status)
    ).length;

    // Create report
    const report = new ValidationReport({
      reportPeriod: { startDate: new Date(startDate), endDate: new Date(endDate) },
      generatedBy: req.user._id,
      violationCountByType,
      violationsCount,
      complianceMetrics: {
        totalTransactions: violations.length, // Simplified
        violatedTransactions: violations.length,
        resolvedViolations,
        outstandingViolations,
        waivedViolations,
        resolutionRate: violations.length > 0 ? (resolvedViolations / violations.length) * 100 : 0
      },
      summary: {
        overallRating: resolvedViolations / violations.length > 0.8 ? 'excellent' : 'fair',
        keyFindings: [
          `${violationsCount.critical} critical violations detected`,
          `${resolvedViolations} violations resolved`,
          `Compliance rate: ${violations.length > 0 ? ((violations.length - outstandingViolations) / violations.length * 100).toFixed(2) : 0}%`
        ],
        recommendations: [
          'Implement automated validation checks',
          'Enhance segregation of duties',
          'Improve transaction documentation'
        ],
        riskAssessment: {
          fraudRisk: violationsCount.critical > 5 ? 'high' : 'low'
        }
      }
    });

    await report.save();
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get validation report
exports.getReport = async (req, res) => {
  try {
    const report = await ValidationReport.findById(req.params.id)
      .populate('generatedBy', ['name', 'email'])
      .populate('approvals.approvedBy', ['name', 'email']);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get violations report
exports.getViolationsReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.detectionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const violations = await Violation.find(query)
      .populate('transactionId')
      .sort({ detectionDate: -1 });

    const stats = {
      total: violations.length,
      bySeverity: {
        critical: violations.filter(v => v.severity === 'critical').length,
        high: violations.filter(v => v.severity === 'high').length,
        medium: violations.filter(v => v.severity === 'medium').length,
        low: violations.filter(v => v.severity === 'low').length
      },
      byType: {
        amount_mismatch: violations.filter(v => v.violationType === 'amount_mismatch').length,
        missing_entry: violations.filter(v => v.violationType === 'missing_entry').length,
        incorrect_account: violations.filter(v => v.violationType === 'incorrect_account').length,
        invalid_date: violations.filter(v => v.violationType === 'invalid_date').length,
        duplicate: violations.filter(v => v.violationType === 'duplicate').length,
        unauthorized: violations.filter(v => v.violationType === 'unauthorized').length
      },
      byStatus: {
        detected: violations.filter(v => v.status === 'detected').length,
        investigating: violations.filter(v => v.status === 'investigating').length,
        resolved: violations.filter(v => v.status === 'resolved').length,
        waived: violations.filter(v => v.status === 'waived').length
      },
      complianceRate: violations.length > 0
        ? ((violations.filter(v => v.status === 'resolved').length / violations.length) * 100).toFixed(2)
        : 100
    };

    res.json({ success: true, data: violations, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk update violations status
exports.bulkUpdateViolations = async (req, res) => {
  try {
    const { violationIds, status, notes } = req.body;

    const result = await Violation.updateMany(
      { _id: { $in: violationIds } },
      {
        status,
        $push: {
          auditTrail: {
            action: `bulk_update_to_${status}`,
            performedBy: req.user._id,
            notes
          }
        }
      }
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
