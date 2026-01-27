"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ai_root_cause_1 = require("../modules/ai-root-cause");
const rbac_1 = require("../middleware/rbac");
const router = express_1.default.Router();
// POST /ai/compliance-root-cause
router.post('/compliance-root-cause', (0, rbac_1.rbac)(['admin', 'compliance-manager']), async (req, res) => {
    try {
        const { event } = req.body;
        if (!event)
            return res.status(400).json({ error: 'event required' });
        const result = await (0, ai_root_cause_1.analyzeRootCause)(event);
        res.json({ result });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
