"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dropbox_integration_1 = require("../src/modules/dropbox-integration");
const router = express_1.default.Router();
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ dest: 'uploads/' });
// رفع ملف إلى Dropbox
router.post('/upload', upload.single('file'), async (req, res) => {
    const { accessToken, dropboxPath } = req.body;
    if (!req.file || !accessToken || !dropboxPath)
        return res.status(400).json({ error: 'missing params' });
    try {
        const id = await (0, dropbox_integration_1.uploadToDropbox)({
            accessToken,
            filePath: req.file.path,
            dropboxPath
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
