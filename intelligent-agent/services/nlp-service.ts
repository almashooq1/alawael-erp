// Microservice bootstrap for NLP module
import express from 'express';
import { NLPModule } from '../src/modules/nlp-module';

const app = express();
const nlp = new NLPModule();

app.use(express.json());

app.post('/analyze', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });
  const result = nlp.analyzeText(text);
  res.json(result);
});

const PORT = process.env.NLP_SERVICE_PORT || 4001;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`NLP Microservice running on port ${PORT}`);
});
