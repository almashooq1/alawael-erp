import express, { Request, Response } from 'express';
import { proxyRequest } from '../services/gatewayProxy.service';

const router = express.Router();

const SERVICE_MAP: Record<string, string> = {
  accounting: process.env.ACCOUNTING_API_BASE_URL || 'http://localhost:5001/api/accounting',
  ml: process.env.ML_API_BASE_URL || 'http://localhost:3001/api/ml',
  ai: process.env.AI_API_BASE_URL || 'http://localhost:3001/api/ai',
};

router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'operational',
    services: Object.keys(SERVICE_MAP),
    timestamp: new Date().toISOString(),
  });
});

router.all(/^\/([^/]+)\/?(.*)/, async (req: Request, res: Response) => {
  const service = req.params[0];
  const baseUrl = SERVICE_MAP[service];

  if (!baseUrl) {
    return res.status(404).json({
      success: false,
      message: `Unknown service: ${service}`,
    });
  }

  try {
    const result = await proxyRequest({ serviceName: service, baseUrl }, req);
    res.status(result.status).set('content-type', result.contentType).send(result.buffer);
  } catch (error: any) {
    res.status(502).json({
      success: false,
      message: error.message || 'Gateway proxy error',
      service,
    });
  }
});

export default router;
