/**
 * Risk Routes
 * مسارات API لإدارة المخاطر والتقييمات
 */

const express = require('express');
const router = express.Router();
const { RiskAssessment, AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

// GET جميع المخاطر
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, severity, status } = req.query;
    const filter = { organizationId: req.user.organizationId };
    
    if (type) filter.riskType = type;
    if (severity) filter['assessment.severity'] = severity;
    if (status) filter.status = status;
    
    const risks = await RiskAssessment.find(filter).sort({ 'assessment.severity': -1 });
    res.json({ success: true, data: risks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET مخاطر حرجة فقط
router.get('/critical', authenticate, async (req, res) => {
  try {
    const risks = await RiskAssessment.getCriticalRisks(req.user.organizationId);
    res.json({ success: true, data: risks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST إنشاء تقييم مخاطرة
router.post('/', authenticate, authorize(['risk_manager', 'admin']), async (req, res) => {
  try {
    const { riskName, riskType, description, probability, impact, exposureAmount } = req.body;
    
    const risk = new RiskAssessment({
      riskId: `risk-${Date.now()}`,
      organizationId: req.user.organizationId,
      riskName,
      riskType,
      description,
      assessment: {
        probability,
        impact,
        exposureAmount
      },
      createdBy: req.user._id
    });
    
    await risk.save();
    
    await AuditLog.create({
      logId: `audit-${Date.now()}`,
      organizationId: req.user.organizationId,
      user: { userId: req.user._id, username: req.user.username, email: req.user.email, role: req.user.role },
      operation: 'create',
      entity: 'RiskAssessment',
      entityId: risk._id,
      status: 'success'
    });
    
    res.status(201).json({ success: true, data: risk });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT تحديث تقييم مخاطرة
router.put('/:riskId', authenticate, authorize(['risk_manager', 'admin']), async (req, res) => {
  try {
    const risk = await RiskAssessment.findOneAndUpdate(
      { riskId: req.params.riskId, organizationId: req.user.organizationId },
      { ...req.body },
      { new: true }
    );
    
    if (!risk) {
      return res.status(404).json({ success: false, error: 'المخاطرة غير موجودة' });
    }
    
    await AuditLog.create({
      logId: `audit-${Date.now()}`,
      organizationId: req.user.organizationId,
      user: { userId: req.user._id, username: req.user.username, email: req.user.email, role: req.user.role },
      operation: 'update',
      entity: 'RiskAssessment',
      entityId: risk._id,
      status: 'success'
    });
    
    res.json({ success: true, data: risk });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET تحليل المخاطر الإجمالي
router.get('/analysis/summary', authenticate, async (req, res) => {
  try {
    const risks = await RiskAssessment.find({
      organizationId: req.user.organizationId,
      status: { $ne: 'closed' }
    });
    
    const totalExposure = risks.reduce((sum, r) => sum + (r.assessment.exposureAmount || 0), 0);
    const critical = risks.filter(r => r.assessment.severity === 'critical').length;
    const high = risks.filter(r => r.assessment.severity === 'high').length;
    const avgScore = risks.length > 0 ? (risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length).toFixed(2) : 0;
    
    res.json({
      success: true,
      data: {
        totalRisks: risks.length,
        totalExposure,
        criticalCount: critical,
        highCount: high,
        averageScore: avgScore,
        lastUpdate: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
