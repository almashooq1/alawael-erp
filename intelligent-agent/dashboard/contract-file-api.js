"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const contract_manager_1 = require("../src/modules/contract-manager");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
const manager = new contract_manager_1.ContractManager();
// رفع ملف وربطه بعقد
router.post('/attach/:id', upload.single('file'), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No file uploaded' });
    const c = manager.getContract(req.params.id);
    if (!c)
        return res.status(404).json({ error: 'not found' });
    c.metadata = c.metadata || {};
    c.metadata.file = req.file.filename;
    res.json({ attached: true, file: req.file.filename });
});
// تنزيل ملف العقد
router.get('/file/:id', (req, res) => {
    const c = manager.getContract(req.params.id);
    if (!c || !c.metadata?.file)
        return res.status(404).json({ error: 'no file' });
    res.sendFile(path_1.default.resolve('uploads', c.metadata.file));
});
exports.default = router;
