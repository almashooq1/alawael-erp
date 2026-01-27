"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// API route for compliance risk scores and recommendations
const express_1 = __importDefault(require("express"));
const compliance_risk_ai_1 = require("../modules/compliance-risk-ai");
const rbac_1 = require("../middleware/rbac");
const router = express_1.default.Router();
// GET /ai/compliance-risk-scores
router.get('/compliance-risk-scores', (0, rbac_1.rbac)(['admin', 'compliance-manager']), async (req, res) => {
    try {
        const days = req.query.days ? Number(req.query.days) : 30;
        const scores = await (0, compliance_risk_ai_1.getComplianceRiskScores)({ days });
        res.json(scores);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
