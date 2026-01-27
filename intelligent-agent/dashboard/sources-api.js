"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const data_sources_1 = require("../src/modules/data-sources");
const router = express_1.default.Router();
// إضافة مصدر
router.post('/add', (req, res) => {
    const { type, name, config, schedule } = req.body;
    if (!type || !name || !schedule)
        return res.status(400).json({ error: 'type, name, schedule required' });
    const src = (0, data_sources_1.addSource)(type, name, config, schedule);
    res.json(src);
});
// تحديث مصدر
router.post('/update', (req, res) => {
    const { id, patch } = req.body;
    if (!id || !patch)
        return res.status(400).json({ error: 'id, patch required' });
    const src = (0, data_sources_1.updateSource)(id, patch);
    res.json(src);
});
// حذف مصدر
router.post('/remove', (req, res) => {
    const { id } = req.body;
    if (!id)
        return res.status(400).json({ error: 'id required' });
    (0, data_sources_1.removeSource)(id);
    res.json({ ok: true });
});
// قائمة المصادر
router.get('/list', (req, res) => {
    res.json((0, data_sources_1.listSources)());
});
exports.default = router;
