"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Route to export compliance events to Google Sheets
const express_1 = __importDefault(require("express"));
const export_compliance_to_sheets_1 = require("../modules/export-compliance-to-sheets");
const rbac_1 = require("../middleware/rbac");
const router = express_1.default.Router();
// POST /export/compliance-to-sheets
router.post('/compliance-to-sheets', (0, rbac_1.rbac)(['admin', 'compliance-manager']), async (req, res) => {
    const { userId, sheetId, range } = req.body;
    if (!userId || !sheetId)
        return res.status(400).json({ error: 'userId and sheetId required' });
    try {
        const count = await (0, export_compliance_to_sheets_1.exportComplianceEventsToGoogleSheets)({ userId, sheetId, range });
        res.json({ success: true, exported: count });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
