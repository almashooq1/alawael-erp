"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const contract_smart_analysis_1 = require("../src/modules/contract-smart-analysis");
const router = express_1.default.Router();
router.get('/smart', (req, res) => {
    res.json((0, contract_smart_analysis_1.analyzeContractsSmartly)());
});
exports.default = router;
// Endpoint: العقود مع تصنيف المخاطر
router.get('/contracts-with-risk', (req, res) => {
    res.json((0, contract_smart_analysis_1.getContractsWithRisk)());
});
