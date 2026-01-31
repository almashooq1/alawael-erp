"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const risk_model_1 = __importDefault(require("../models/risk.model"));
const rbac_middleware_1 = require("./rbac.middleware");
const router = express_1.default.Router();
// إعداد التخزين المحلي للملفات
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path_1.default.join(__dirname, '../../uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = (0, multer_1.default)({ storage });
// رفع مرفق وربطه بمخاطرة
router.post('/risks/:id/attachments', (0, rbac_middleware_1.requireRole)(['admin', 'risk_manager']), upload.single('file'), async (req, res) => {
    const risk = await risk_model_1.default.findById(req.params.id);
    if (!risk)
        return res.status(404).json({ error: 'Risk not found' });
    if (!req.file)
        return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;
    const attachment = {
        filename: req.file.originalname,
        url: fileUrl,
        uploadedAt: new Date(),
        uploadedBy: (req.user && req.user.username) || 'unknown',
    };
    risk.attachments = risk.attachments || [];
    risk.attachments.push(attachment);
    await risk.save();
    res.status(201).json(attachment);
});
exports.default = router;
