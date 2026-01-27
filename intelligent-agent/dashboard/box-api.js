"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const box_integration_1 = require("../src/modules/box-integration");
const router = express_1.default.Router();
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ dest: 'uploads/' });
// رفع ملف إلى Box
router.post('/upload', upload.single('file'), async (req, res) => {
    const { clientId, clientSecret, accessToken, boxFolderId, name } = req.body;
    if (!req.file || !clientId || !clientSecret || !accessToken || !boxFolderId || !name)
        return res.status(400).json({ error: 'missing params' });
    try {
        const id = await (0, box_integration_1.uploadToBox)({
            clientId,
            clientSecret,
            accessToken,
            filePath: req.file.path,
            boxFolderId,
            name
        });
        res.json({ id });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
    finally {
        require('fs').unlinkSync(req.file.path);
    }
});
exports.default = router;
