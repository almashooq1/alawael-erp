import express from 'express';
import { addSource, updateSource, listSources, removeSource } from '../src/modules/data-sources';
const router = express.Router();

// إضافة مصدر
router.post('/add', (req, res) => {
  const { type, name, config, schedule } = req.body;
  if (!type || !name || !schedule) return res.status(400).json({ error: 'type, name, schedule required' });
  const src = addSource(type, name, config, schedule);
  res.json(src);
});

// تحديث مصدر
router.post('/update', (req, res) => {
  const { id, patch } = req.body;
  if (!id || !patch) return res.status(400).json({ error: 'id, patch required' });
  const src = updateSource(id, patch);
  res.json(src);
});

// حذف مصدر
router.post('/remove', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  removeSource(id);
  res.json({ ok: true });
});

// قائمة المصادر
router.get('/list', (req, res) => {
  res.json(listSources());
});

export default router;
