import { Router } from 'express';
import Risk from '../models/risk.model';
import RiskAssessment from '../models/risk.assessment.model';
import RiskEvent from '../models/risk.event.model';
import { requireRole } from './rbac.middleware';
import RiskAuditLog from '../models/risk.auditlog.model';
import { sendRiskToIntegration } from './risk.integration.routes';

const router = Router();

// --- Risk CRUD ---
router.get('/risks', async (req, res) => {
  const risks = await Risk.find();
  res.json(risks);
});

router.get('/risks/:id', async (req, res) => {
  const risk = await Risk.findById(req.params.id);
  if (!risk) return res.status(404).json({ error: 'Not found' });
  res.json(risk);
});


// Only admin or risk_manager can create
router.post('/risks', requireRole(['admin', 'risk_manager']), async (req: any, res) => {
  const risk = new Risk(req.body);
  await risk.save();
  await RiskAuditLog.create({
    riskId: risk._id.toString(),
    action: 'create',
    user: (req.user && req.user.username) || 'unknown',
    details: req.body,
  });
  // تكامل خارجي عند مخاطرة عالية
  const riskScore = risk.likelihood * risk.impact;
  if (riskScore >= 15) {
    await sendRiskToIntegration(risk, 'create');
  }
  res.status(201).json(risk);
});


// Only admin or risk_manager can update
router.put('/risks/:id', requireRole(['admin', 'risk_manager']), async (req: any, res) => {
  const risk = await Risk.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!risk) return res.status(404).json({ error: 'Not found' });
  await RiskAuditLog.create({
    riskId: req.params.id,
    action: 'update',
    user: (req.user && req.user.username) || 'unknown',
    details: req.body,
  });
  // تكامل خارجي عند مخاطرة عالية
  const riskScore = risk.likelihood * risk.impact;
  if (riskScore >= 15) {
    await sendRiskToIntegration(risk, 'update');
  }
  res.json(risk);
});


// Only admin can delete
router.delete('/risks/:id', requireRole(['admin']), async (req: any, res) => {
  const risk = await Risk.findByIdAndDelete(req.params.id);
  if (!risk) return res.status(404).json({ error: 'Not found' });
  await RiskAuditLog.create({
    riskId: req.params.id,
    action: 'delete',
    user: (req.user && req.user.username) || 'unknown',
    details: risk,
  });
  res.json({ success: true });
});

// --- Risk Assessment CRUD ---
router.get('/risk-assessments', async (req, res) => {
  const assessments = await RiskAssessment.find().populate('risk');
  res.json(assessments);
});


// Only admin or risk_manager can assess
router.post('/risk-assessments', requireRole(['admin', 'risk_manager']), async (req, res) => {
  const { groupAssessment, reviewers, risk, likelihood, impact, notes, assessedBy, scores } = req.body;
  if (groupAssessment && Array.isArray(scores) && Array.isArray(reviewers) && reviewers.length === scores.length) {
    // Collaborative: calculate average
    const avgLikelihood = scores.reduce((sum, s) => sum + (s.likelihood || 0), 0) / scores.length;
    const avgImpact = scores.reduce((sum, s) => sum + (s.impact || 0), 0) / scores.length;
    const avgScore = scores.reduce((sum, s) => sum + (s.score || 0), 0) / scores.length;
    const assessment = new RiskAssessment({
      risk,
      groupAssessment: true,
      reviewers,
      likelihood: avgLikelihood,
      impact: avgImpact,
      score: avgScore,
      notes,
      assessedBy: assessedBy || reviewers.join(','),
      assessmentDate: new Date(),
    });
    await assessment.save();
    res.status(201).json(assessment);
  } else {
    // Single assessment
    const assessment = new RiskAssessment(req.body);
    await assessment.save();
    res.status(201).json(assessment);
  }
});

// --- Risk Event CRUD ---
router.get('/risk-events', async (req, res) => {
  const events = await RiskEvent.find().populate('risk');
  res.json(events);
});


// Only admin or risk_manager can add events
router.post('/risk-events', requireRole(['admin', 'risk_manager']), async (req, res) => {
  const event = new RiskEvent(req.body);
  await event.save();
  res.status(201).json(event);
});

export default router;
