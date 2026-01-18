import 'dotenv/config';
import express from 'express';
import { app as webhookApp } from './webhook';
import health from './health';
import { startQueueConsumer } from './queue';
import { startMetricsReporter } from './metrics';

const app = express();
const port = Number(process.env.PORT || 3000);

// Middleware
app.use(express.json({ verify: (req, res, buf) => {
  (req as any).rawBody = buf;
} }));

// Health check endpoints
app.use('/', health);

// Webhook and API routes
app.use('/webhook', webhookApp);

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});

// Start SQS consumer if configured
startQueueConsumer();

// Start metrics reporter (logs metrics every 60 seconds)
startMetricsReporter(60000);
