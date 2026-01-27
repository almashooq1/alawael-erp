"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const interaction_logger_1 = require("../src/modules/interaction-logger");
const router = express_1.default.Router();
// API: بيانات Power BI/Tableau (JSON)
router.get('/bi-data', (req, res) => {
    const logs = interaction_logger_1.InteractionLogger.getAll();
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
    const data = weekLogs.map(l => ({
        timestamp: l.timestamp,
        input: l.input,
        output: l.output,
        feedback: l.feedback || null
    }));
    res.json(data);
});
exports.default = router;
