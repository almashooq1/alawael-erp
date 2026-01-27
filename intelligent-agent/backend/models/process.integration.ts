// process.integration.ts
// نقطة تكامل API للعمليات (RESTful)

import express from 'express';
import { Process } from './process.model';

const router = express.Router();

// بيانات تجريبية مؤقتة
let processes: Process[] = [];

// جلب جميع العمليات
router.get('/processes', (req, res) => {
  res.json(processes);
});

// إضافة عملية جديدة
router.post('/processes', (req, res) => {
  const p: Process = { ...req.body, _id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  processes.push(p);
  res.status(201).json(p);
});

// تحديث عملية
router.put('/processes/:id', (req, res) => {
  const idx = processes.findIndex(p => p._id === req.params.id);
  if (idx === -1) return res.status(404).send('Not found');
  processes[idx] = { ...processes[idx], ...req.body, updatedAt: new Date().toISOString() };
  res.json(processes[idx]);
});

// حذف عملية
router.delete('/processes/:id', (req, res) => {
  processes = processes.filter(p => p._id !== req.params.id);
  res.status(204).send();
});

export default router;
