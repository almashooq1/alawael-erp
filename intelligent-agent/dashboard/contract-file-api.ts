import express from 'express';
import multer from 'multer';
import path from 'path';
import { ContractManager } from '../src/modules/contract-manager';
const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const manager = new ContractManager();

// رفع ملف وربطه بعقد
router.post('/attach/:id', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const c = manager.getContract(req.params.id);
  if (!c) return res.status(404).json({ error: 'not found' });
  c.metadata = c.metadata || {};
  c.metadata.file = req.file.filename;
  res.json({ attached: true, file: req.file.filename });
});
// تنزيل ملف العقد
router.get('/file/:id', (req, res) => {
  const c = manager.getContract(req.params.id);
  if (!c || !c.metadata?.file) return res.status(404).json({ error: 'no file' });
  res.sendFile(path.resolve('uploads', c.metadata.file));
});
export default router;
