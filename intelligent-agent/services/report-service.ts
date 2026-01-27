// Microservice bootstrap for Report Generator module
import express from 'express';
import { ReportGenerator } from '../src/modules/report-generator';
import { FileManager } from '../src/modules/file-manager';

const app = express();
const fileManager = new FileManager();
const reportGenerator = new ReportGenerator(fileManager);

app.use(express.json());

app.post('/generate', async (req, res) => {
  const { data, filename } = req.body;
  if (!data || !filename) return res.status(400).json({ error: 'Missing data or filename' });
  await reportGenerator.generateReport(data, filename);
  res.json({ status: 'Report generated', filename });
});

const PORT = process.env.REPORT_SERVICE_PORT || 4003;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Report Generator Microservice running on port ${PORT}`);
});
