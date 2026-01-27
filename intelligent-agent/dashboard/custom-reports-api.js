"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const interaction_logger_1 = require("../src/modules/interaction-logger");
const router = express_1.default.Router();
// منشئ تقارير مخصصة
router.post('/custom', (req, res) => {
    const { fields, from, to, filter } = req.body;
    let logs = interaction_logger_1.InteractionLogger.getAll();
    if (from)
        logs = logs.filter(l => l.timestamp >= from);
    if (to)
        logs = logs.filter(l => l.timestamp <= to);
    if (filter)
        logs = logs.filter(filterFn(filter));
    const result = logs.map(l => {
        const row = {};
        for (const f of fields || Object.keys(l))
            row[f] = l[f];
        return row;
    });
    res.json(result);
});
function filterFn(filter) {
    // مثال: { input: 'سؤال', feedback: 5 }
    return (l) => Object.entries(filter).every(([k, v]) => l[k] == v);
}
exports.default = router;
