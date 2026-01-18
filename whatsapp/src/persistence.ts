import { prisma } from './infra/prisma';
import { logger } from './infra/logger';

const WINDOW_MINUTES = Number(process.env.WINDOW_MINUTES || 24 * 60);

export type InboundMessagePayload = {
  from: string;
  body: string;
  raw?: unknown;
};

export async function ensureContact(waId: string) {
  return prisma.contact.upsert({
    where: { waId },
    update: {},
    create: { waId, tags: [], optIn: true },
  });
}

export async function ensureConversation(contactId: string) {
  const now = new Date();
  const existing = await prisma.conversation.findFirst({
    where: { contactId },
    orderBy: { createdAt: 'desc' },
  });
  const stillOpen = existing && existing.windowExpiresAt > now;
  if (stillOpen) return existing;
  const windowExpiresAt = new Date(now.getTime() + WINDOW_MINUTES * 60 * 1000);
  return prisma.conversation.create({ data: { contactId, windowExpiresAt } });
}

async function bumpWindow(conversationId: string) {
  const windowExpiresAt = new Date(Date.now() + WINDOW_MINUTES * 60 * 1000);
  await prisma.conversation.update({ where: { id: conversationId }, data: { windowExpiresAt } });
}

export async function persistInboundMessage(payload: InboundMessagePayload) {
  const { from, body, raw } = payload;
  const contact = await ensureContact(from);
  const conversation = await ensureConversation(contact.id);

  const msg = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'inbound',
      type: 'text',
      body,
      status: 'delivered',
      waMessageId: undefined,
      errorCode: undefined,
    },
  });

  await bumpWindow(conversation.id);
  logger.info({ msgId: msg.id, contactId: contact.id, raw }, 'Inbound message stored');
  return msg;
}

export type OutboundMessagePayload = {
  to: string;
  body?: string;
  templateName?: string;
  waMessageId?: string;
  status?: string;
};

export async function persistOutboundMessage(payload: OutboundMessagePayload) {
  const { to, body, templateName, waMessageId, status = 'sent' } = payload;
  const contact = await ensureContact(to);
  const conversation = await ensureConversation(contact.id);

  const msg = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'outbound',
      type: templateName ? 'template' : 'text',
      body,
      templateName,
      status,
      waMessageId,
    },
  });

  await bumpWindow(conversation.id);
  logger.info({ msgId: msg.id, contactId: contact.id, waMessageId }, 'Outbound message stored');
  return msg;
}
