"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const contract_reports_1 = require("../src/modules/contract-reports");
const router = express_1.default.Router();
router.get('/summary', (req, res) => {
    res.json((0, contract_reports_1.getContractReport)());
});
exports.default = router;
