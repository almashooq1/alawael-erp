"use strict";
// process.integration.ts
// نقطة تكامل API للعمليات (RESTful)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// بيانات تجريبية مؤقتة
let processes = [];
// جلب جميع العمليات
router.get('/processes', (req, res) => {
    res.json(processes);
});
// إضافة عملية جديدة
router.post('/processes', (req, res) => {
    const p = { ...req.body, _id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    processes.push(p);
    res.status(201).json(p);
});
// تحديث عملية
router.put('/processes/:id', (req, res) => {
    const idx = processes.findIndex(p => p._id === req.params.id);
    if (idx === -1)
        return res.status(404).send('Not found');
    processes[idx] = { ...processes[idx], ...req.body, updatedAt: new Date().toISOString() };
    res.json(processes[idx]);
});
// حذف عملية
router.delete('/processes/:id', (req, res) => {
    processes = processes.filter(p => p._id !== req.params.id);
    res.status(204).send();
});
exports.default = router;
