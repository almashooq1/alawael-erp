"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const templates_1 = require("../templates");
const logger_1 = require("../infra/logger");
const router = express_1.default.Router();
router.post('/', async (req, res) => {
    try {
        const template = await (0, templates_1.createTemplate)(req.body);
        logger_1.logger.info({ id: template.id }, 'Template created');
        return res.status(201).json(template);
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Failed to create template');
        return res.status(400).json({ error: 'Failed to create template' });
    }
});
router.get('/', async (req, res) => {
    try {
        const { locale, status } = req.query;
        const templates = await (0, templates_1.listTemplates)(locale, status);
        return res.json({ data: templates });
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Failed to list templates');
        return res.status(500).json({ error: 'Failed to list templates' });
    }
});
router.get('/:name', async (req, res) => {
    try {
        const template = await (0, templates_1.getTemplateByName)(req.params.name);
        if (!template)
            return res.status(404).json({ error: 'Not found' });
        return res.json(template);
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Failed to get template');
        return res.status(500).json({ error: 'Failed to get template' });
    }
});
router.patch('/:id/approve', async (req, res) => {
    try {
        const template = await (0, templates_1.approveTemplate)(req.params.id);
        return res.json(template);
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Failed to approve template');
        return res.status(500).json({ error: 'Failed to approve template' });
    }
});
router.patch('/:id/reject', async (req, res) => {
    try {
        const template = await (0, templates_1.rejectTemplate)(req.params.id);
        return res.json(template);
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Failed to reject template');
        return res.status(500).json({ error: 'Failed to reject template' });
    }
});
exports.default = router;
