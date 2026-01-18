import crypto from 'crypto';
import express, { Request, Response } from 'express';
import { persistInboundMessage } from './persistence';
import { logger } from './infra/logger';
import templatesRouter from './api/templates';

const app = express();

// Register routes
app.use('/api/templates', templatesRouter);

// Keep raw body for signature verification
app.use(
  express.json({
    verify: (req: any, _res: any, buf: Buffer) => {
      req.rawBody = buf;
    },
  }),
);

const APP_SECRET = process.env.APP_SECRET || '';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || '';

function verifySignature(req: any) {
  const sig = req.header('X-Hub-Signature-256');
  if (!sig || !APP_SECRET) return false;
  const hmac = crypto.createHmac('sha256', APP_SECRET).update(req.rawBody || '').digest('hex');
  return sig === `sha256=${hmac}`;
}

app.get('/webhook', (req: Request, res: Response) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (token === VERIFY_TOKEN && challenge) {
    return res.send(challenge);
  }
  return res.status(403).send('Invalid verify token');
});

app.post('/webhook', async (req: Request, res: Response) => {
  if (!verifySignature(req)) {
    return res.status(401).send('Bad signature');
  }

  try {
    const change = req.body?.entry?.[0]?.changes?.[0];
    const message = change?.value?.messages?.[0];
    const from = message?.from as string | undefined;
    const body = message?.text?.body as string | undefined;

    if (from && body) {
      await persistInboundMessage({ from, body, raw: message });
    }

    return res.sendStatus(200);
  } catch (err) {
    logger.error({ err }, 'Webhook processing failed');
    return res.status(500).send('Internal error');
  }
});

export { app };
