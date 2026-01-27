import express from 'express';
import { analyzeContractsSmartly, getContractsWithRisk } from '../src/modules/contract-smart-analysis';
const router = express.Router();

router.get('/smart', (req, res) => {
  res.json(analyzeContractsSmartly());
});

export default router;

// Endpoint: العقود مع تصنيف المخاطر
router.get('/contracts-with-risk', (req, res) => {
  res.json(getContractsWithRisk());
});
