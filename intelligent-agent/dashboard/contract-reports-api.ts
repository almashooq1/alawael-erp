import express from 'express';
import { getContractReport } from '../src/modules/contract-reports';
const router = express.Router();

router.get('/summary', (req, res) => {
  res.json(getContractReport());
});

export default router;
