import fetch from 'node-fetch';
import { enforceRateLimit } from './rateLimit';
import { persistOutboundMessage } from './persistence';
import { logger } from './infra/logger';

const TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_ID = process.env.PHONE_NUMBER_ID || '';
const GRAPH = process.env.GRAPH_VERSION || 'v19.0';

export type OutboundPayload = { to: string; body?: string; template?: any; templateName?: string };

export async function sendMessage({ to, body, template }: { to: string; body?: string; template?: any }) {
  const payload = template
    ? { messaging_product: 'whatsapp', to, type: 'template', template }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { body } };

  const url = `https://graph.facebook.com/${GRAPH}/${PHONE_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Send failed ${res.status}: ${text}`);
  }

  return res.json();
}

export async function sendAndPersist(payload: OutboundPayload) {
  await enforceRateLimit(payload.to);

  const result = await sendMessage(payload);
  const messageId = result?.messages?.[0]?.id as string | undefined;

  await persistOutboundMessage({
    to: payload.to,
    body: payload.body,
    templateName: payload.templateName,
    waMessageId: messageId,
    status: 'sent',
  });

  logger.info({ to: payload.to, messageId }, 'Outbound sent and stored');
  return { messageId, raw: result };
}
