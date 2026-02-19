/**
 * Validation Routes
 * مسارات API للتحقق والامتثال
 */

const express = require('express');
const router = express.Router();
const { ValidationRule, AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

// ===== VALIDATION RULES ROUTES =====

// GET جميع قواعد التحقق
router.get('/rules', authenticate, async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const filter = { organizationId: req.user.organizationId };
    
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const rules = await ValidationRule.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET قاعدة تحقق واحدة
router.get('/rules/:ruleId', authenticate, async (req, res) => {
  try {
    const rule = await ValidationRule.findOne({
      ruleId: req.params.ruleId,
      organizationId: req.user.organizationId
    });
    
    if (!rule) {
      return res.status(404).json({ success: false, error: 'قاعدة التحقق غير موجودة' });
    }
    
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST إنشاء قاعدة تحقق
router.post('/rules', authenticate, authorize(['admin', 'compliance_manager']), async (req, res) => {
  try {
    const { name, type, condition, severity, action, affectedEntities } = req.body;
    
    const rule = new ValidationRule({
      ruleId: `rule-${Date.now()}`,
      organizationId: req.user.organizationId,
      name,
      type,
      condition,
      severity,
      action,
      affectedEntities,
      createdBy: req.user._id
    });
    
    await rule.save();
    
    await AuditLog.create({
      logId: `audit-${Date.now()}`,
      organizationId: req.user.organizationId,
      user: { userId: req.user._id, username: req.user.username, email: req.user.email, role: req.user.role },
      operation: 'create',
      entity: 'ValidationRule',
      entityId: rule._id,
      changes: { after: rule },
      status: 'success'
    });
    
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT تحديث قاعدة تحقق
router.put('/rules/:ruleId', authenticate, authorize(['admin', 'compliance_manager']), async (req, res) => {
  try {
    const rule = await ValidationRule.findOneAndUpdate(
      { ruleId: req.params.ruleId, organizationId: req.user.organizationId },
      { ...req.body, modifiedBy: req.user._id },
      { new: true }
    );
    
    if (!rule) {
      return res.status(404).json({ success: false, error: 'قاعدة التحقق غير موجودة' });
    }
    
    await AuditLog.create({
      logId: `audit-${Date.now()}`,
      organizationId: req.user.organizationId,
      user: { userId: req.user._id, username: req.user.username, email: req.user.email, role: req.user.role },
      operation: 'update',
      entity: 'ValidationRule',
      entityId: rule._id,
      changes: { after: rule },
      status: 'success'
    });
    
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE حذف قاعدة تحقق
router.delete('/rules/:ruleId', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const rule = await ValidationRule.findOneAndDelete(
      { ruleId: req.params.ruleId, organizationId: req.user.organizationId }
    );
    
    if (!rule) {
      return res.status(404).json({ success: false, error: 'قاعدة التحقق غير موجودة' });
    }
    
    await AuditLog.create({
      logId: `audit-${Date.now()}`,
      organizationId: req.user.organizationId,
      user: { userId: req.user._id, username: req.user.username, email: req.user.email, role: req.user.role },
      operation: 'delete',
      entity: 'ValidationRule',
      entityId: rule._id,
      changes: { before: rule },
      status: 'success'
    });
    
    res.json({ success: true, message: 'تم حذف قاعدة التحقق بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== VIOLATIONS REPORT ROUTES =====

// GET تقرير الانتهاكات
router.get('/violations-report', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { organizationId: req.user.organizationId };
    
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    
    const rules = await ValidationRule.find({ ...filter, type: 'compliance' });
    
    const violations = [];
    let totalViolations = 0;
    let criticalCount = 0;
    let highCount = 0;
    
    rules.forEach(rule => {
      if (rule.lastViolationCount) {
        totalViolations += rule.lastViolationCount;
        if (rule.severity === 'critical') criticalCount += rule.lastViolationCount;
        if (rule.severity === 'error') highCount += rule.lastViolationCount;
      }
    });
    
    const complianceRate = rules.length > 0 ? ((rules.filter(r => r.lastViolationCount === 0).length / rules.length) * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      data: {
        violations,
        totalViolations,
        criticalCount,
        highCount,
        complianceRate,
        rules: rules.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET التقرير المركب للامتثال
router.get('/compliance-report', authenticate, async (req, res) => {
  try {
    const rules = await ValidationRule.find({
      organizationId: req.user.organizationId,
      isActive: true
    });
    
    const totalRules = rules.length;
    const successfulRules = rules.filter(r => r.lastViolationCount === 0).length;
    const complianceRate = totalRules > 0 ? ((successfulRules / totalRules) * 100).toFixed(2) : 0;
    
    const recommendations = [];
    rules.forEach(rule => {
      if (rule.lastViolationCount > 0) {
        recommendations.push(`معالجة انتهاكات "${rule.name}" (${rule.lastViolationCount} انتهاك)`);
      }
    });
    
    res.json({
      success: true,
      data: {
        complianceRate,
        totalRules,
        successfulRules,
        recommendedActions: recommendations.slice(0, 5),
        lastUpdate: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
