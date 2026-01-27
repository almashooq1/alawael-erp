"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const contract_activity_logger_1 = require("../src/modules/contract-activity-logger");
const router = express_1.default.Router();
// سجل النشاطات لعقد محدد
router.get('/:contractId', (req, res) => {
    const contractId = req.params.contractId;
    const logs = contract_activity_logger_1.ContractActivityLogger.getByContract(contractId);
    res.json(logs);
});
// كل السجلات (للمدير)
router.get('/', (req, res) => {
    const logs = contract_activity_logger_1.ContractActivityLogger.getAll();
    res.json(logs);
});
exports.default = router;
