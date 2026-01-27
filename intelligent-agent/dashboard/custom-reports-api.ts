import express from 'express';
import { InteractionLogger } from '../src/modules/interaction-logger';
const router = express.Router();

// منشئ تقارير مخصصة
interface InteractionLog {
  [key: string]: any;
  input?: string;
  output?: string;
  timestamp?: string;
  feedback?: number;
}

router.post('/custom', (req, res) => {
  const { fields, from, to, filter } = req.body;
  let logs: InteractionLog[] = InteractionLogger.getAll();
  if (from) logs = logs.filter(l => l.timestamp && l.timestamp >= from);
  if (to) logs = logs.filter(l => l.timestamp && l.timestamp <= to);
  if (filter) logs = logs.filter(filterFn(filter));
  const result = logs.map(l => {
    const row: any = {};
    for (const f of fields || Object.keys(l)) row[f] = l[f];
    return row;
  });
  res.json(result);
});

function filterFn(filter: any) {
  // مثال: { input: 'سؤال', feedback: 5 }
  return (l: any) => Object.entries(filter).every(([k, v]) => l[k] == v);
}

export default router;
