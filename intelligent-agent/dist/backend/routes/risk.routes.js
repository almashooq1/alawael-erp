"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const risk_model_1 = __importDefault(require("../models/risk.model"));
const risk_assessment_model_1 = __importDefault(require("../models/risk.assessment.model"));
const risk_event_model_1 = __importDefault(require("../models/risk.event.model"));
const rbac_middleware_1 = require("./rbac.middleware");
const risk_auditlog_model_1 = __importDefault(require("../models/risk.auditlog.model"));
const risk_integration_routes_1 = require("./risk.integration.routes");
const router = (0, express_1.Router)();
// --- Risk CRUD ---
router.get('/risks', async (req, res) => {
    const risks = await risk_model_1.default.find();
    res.json(risks);
});
router.get('/risks/:id', async (req, res) => {
    const risk = await risk_model_1.default.findById(req.params.id);
    if (!risk)
        return res.status(404).json({ error: 'Not found' });
    res.json(risk);
});
// Only admin or risk_manager can create
router.post('/risks', (0, rbac_middleware_1.requireRole)(['admin', 'risk_manager']), async (req, res) => {
    const risk = new risk_model_1.default(req.body);
    await risk.save();
    await risk_auditlog_model_1.default.create({
        riskId: risk._id.toString(),
        action: 'create',
        user: (req.user && req.user.username) || 'unknown',
        details: req.body,
    });
    // تكامل خارجي عند مخاطرة عالية
    const riskScore = risk.likelihood * risk.impact;
    if (riskScore >= 15) {
        await (0, risk_integration_routes_1.sendRiskToIntegration)(risk, 'create');
    }
    res.status(201).json(risk);
});
// Only admin or risk_manager can update
router.put('/risks/:id', (0, rbac_middleware_1.requireRole)(['admin', 'risk_manager']), async (req, res) => {
    const risk = await risk_model_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!risk)
        return res.status(404).json({ error: 'Not found' });
    await risk_auditlog_model_1.default.create({
        riskId: req.params.id,
        action: 'update',
        user: (req.user && req.user.username) || 'unknown',
        details: req.body,
    });
    // تكامل خارجي عند مخاطرة عالية
    const riskScore = risk.likelihood * risk.impact;
    if (riskScore >= 15) {
        await (0, risk_integration_routes_1.sendRiskToIntegration)(risk, 'update');
    }
    res.json(risk);
});
// Only admin can delete
router.delete('/risks/:id', (0, rbac_middleware_1.requireRole)(['admin']), async (req, res) => {
    const risk = await risk_model_1.default.findByIdAndDelete(req.params.id);
    if (!risk)
        return res.status(404).json({ error: 'Not found' });
    await risk_auditlog_model_1.default.create({
        riskId: req.params.id,
        action: 'delete',
        user: (req.user && req.user.username) || 'unknown',
        details: risk,
    });
    res.json({ success: true });
});
// --- Risk Assessment CRUD ---
router.get('/risk-assessments', async (req, res) => {
    const assessments = await risk_assessment_model_1.default.find().populate('risk');
    res.json(assessments);
});
// Only admin or risk_manager can assess
router.post('/risk-assessments', (0, rbac_middleware_1.requireRole)(['admin', 'risk_manager']), async (req, res) => {
    const { groupAssessment, reviewers, risk, likelihood, impact, notes, assessedBy, scores } = req.body;
    if (groupAssessment && Array.isArray(scores) && Array.isArray(reviewers) && reviewers.length === scores.length) {
        // Collaborative: calculate average
        const avgLikelihood = scores.reduce((sum, s) => sum + (s.likelihood || 0), 0) / scores.length;
        const avgImpact = scores.reduce((sum, s) => sum + (s.impact || 0), 0) / scores.length;
        const avgScore = scores.reduce((sum, s) => sum + (s.score || 0), 0) / scores.length;
        const assessment = new risk_assessment_model_1.default({
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
    }
    else {
        // Single assessment
        const assessment = new risk_assessment_model_1.default(req.body);
        await assessment.save();
        res.status(201).json(assessment);
    }
});
// --- Risk Event CRUD ---
router.get('/risk-events', async (req, res) => {
    const events = await risk_event_model_1.default.find().populate('risk');
    res.json(events);
});
// Only admin or risk_manager can add events
router.post('/risk-events', (0, rbac_middleware_1.requireRole)(['admin', 'risk_manager']), async (req, res) => {
    const event = new risk_event_model_1.default(req.body);
    await event.save();
    res.status(201).json(event);
});
exports.default = router;
