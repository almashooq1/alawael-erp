import express, { Request, Response } from 'express';
import { createTemplate, listTemplates, getTemplateByName, approveTemplate, rejectTemplate } from '../templates';
import { logger } from '../infra/logger';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const template = await createTemplate(req.body);
    logger.info({ id: template.id }, 'Template created');
    return res.status(201).json(template);
  } catch (err) {
    logger.error({ err }, 'Failed to create template');
    return res.status(400).json({ error: 'Failed to create template' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { locale, status } = req.query as { locale?: string; status?: string };
    const templates = await listTemplates(locale, status);
    return res.json({ data: templates });
  } catch (err) {
    logger.error({ err }, 'Failed to list templates');
    return res.status(500).json({ error: 'Failed to list templates' });
  }
});

router.get('/:name', async (req: Request, res: Response) => {
  try {
    const template = await getTemplateByName(req.params.name);
    if (!template) return res.status(404).json({ error: 'Not found' });
    return res.json(template);
  } catch (err) {
    logger.error({ err }, 'Failed to get template');
    return res.status(500).json({ error: 'Failed to get template' });
  }
});

router.patch('/:id/approve', async (req: Request, res: Response) => {
  try {
    const template = await approveTemplate(req.params.id);
    return res.json(template);
  } catch (err) {
    logger.error({ err }, 'Failed to approve template');
    return res.status(500).json({ error: 'Failed to approve template' });
  }
});

router.patch('/:id/reject', async (req: Request, res: Response) => {
  try {
    const template = await rejectTemplate(req.params.id);
    return res.json(template);
  } catch (err) {
    logger.error({ err }, 'Failed to reject template');
    return res.status(500).json({ error: 'Failed to reject template' });
  }
});

export default router;
