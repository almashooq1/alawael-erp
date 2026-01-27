import express from 'express';
import { ContractActivityLogger } from '../src/modules/contract-activity-logger';
const router = express.Router();

// سجل النشاطات لعقد محدد
router.get('/:contractId', (req, res) => {
  const contractId = req.params.contractId;
  const logs = ContractActivityLogger.getByContract(contractId);
  res.json(logs);
});

// كل السجلات (للمدير)
router.get('/', (req, res) => {
  const logs = ContractActivityLogger.getAll();
  res.json(logs);
});

export default router;
