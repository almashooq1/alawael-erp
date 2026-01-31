// Generic Webhook Export Module
import axios from 'axios';
import { ExportImportLogger } from './export-import-logger';

export async function exportDataToWebhook({
  userId,
  webhookUrl,
  payload,
  headers = {},
  eventType = 'generic',
}: {
  userId?: string;
  webhookUrl: string;
  payload: any;
  headers?: Record<string, string>;
  eventType?: string;
}) {
  const response = await axios.post(webhookUrl, payload, { headers });
  ExportImportLogger.log({
    timestamp: new Date().toISOString(),
    userId,
    operation: 'export',
    format: 'webhook',
    details: { webhookUrl, eventType, status: response.status }
  });
  return response.status;
}
