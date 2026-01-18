"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureContact = ensureContact;
exports.ensureConversation = ensureConversation;
exports.persistInboundMessage = persistInboundMessage;
exports.persistOutboundMessage = persistOutboundMessage;
const prisma_1 = require("./infra/prisma");
const logger_1 = require("./infra/logger");
const WINDOW_MINUTES = Number(process.env.WINDOW_MINUTES || 24 * 60);
async function ensureContact(waId) {
    return prisma_1.prisma.contact.upsert({
        where: { waId },
        update: {},
        create: { waId, tags: [], optIn: true },
    });
}
async function ensureConversation(contactId) {
    const now = new Date();
    const existing = await prisma_1.prisma.conversation.findFirst({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
    });
    const stillOpen = existing && existing.windowExpiresAt > now;
    if (stillOpen)
        return existing;
    const windowExpiresAt = new Date(now.getTime() + WINDOW_MINUTES * 60 * 1000);
    return prisma_1.prisma.conversation.create({ data: { contactId, windowExpiresAt } });
}
async function bumpWindow(conversationId) {
    const windowExpiresAt = new Date(Date.now() + WINDOW_MINUTES * 60 * 1000);
    await prisma_1.prisma.conversation.update({ where: { id: conversationId }, data: { windowExpiresAt } });
}
async function persistInboundMessage(payload) {
    const { from, body, raw } = payload;
    const contact = await ensureContact(from);
    const conversation = await ensureConversation(contact.id);
    const msg = await prisma_1.prisma.message.create({
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
    logger_1.logger.info({ msgId: msg.id, contactId: contact.id, raw }, 'Inbound message stored');
    return msg;
}
async function persistOutboundMessage(payload) {
    const { to, body, templateName, waMessageId, status = 'sent' } = payload;
    const contact = await ensureContact(to);
    const conversation = await ensureConversation(contact.id);
    const msg = await prisma_1.prisma.message.create({
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
    logger_1.logger.info({ msgId: msg.id, contactId: contact.id, waMessageId }, 'Outbound message stored');
    return msg;
}
