'use strict';

/**
 * W738 — auto-reply template deliverability gate.
 *
 * When the bot's auto-reply decision is a TEMPLATE action, the inbound
 * webhook handler now checks the template's Meta approval status (via
 * templateSync.getTemplateStatus, the same source W731 uses for the event
 * dispatcher) BEFORE sending. An unapproved template is silently dropped by
 * Meta, so the handler skips the send and escalates to staff instead. A null
 * status (no cached row / DB error) fails OPEN — the send proceeds.
 *
 * These tests drive the real handler (handleIncomingMessage) with the model
 * layer + side-effecting services mocked, so no Mongo is needed.
 */

// ─── Mocks (declared before requiring the unit under test) ──────────────────
jest.mock('../services/whatsapp/whatsappService', () => ({
  normalizePhone: (p) => p,
  markAsRead: jest.fn().mockResolvedValue(undefined),
  sendText: jest.fn().mockResolvedValue({ success: true, messageId: 'm-text' }),
  sendTemplate: jest.fn().mockResolvedValue({ success: true, messageId: 'm-tpl' }),
}));

jest.mock('../services/whatsapp/whatsappAI.service', () => ({
  // document_request → DEFAULT_POLICY maps normal urgency to a TEMPLATE action.
  classifyIntent: jest.fn().mockResolvedValue({
    intent: 'document_request',
    urgencyLevel: 'low',
    confidence: 0.9,
    sentiment: 'neutral',
    requiresHumanReview: false,
  }),
}));

jest.mock('../services/whatsapp/templateSync.service', () => ({
  getTemplateStatus: jest.fn(),
}));

jest.mock('../models/WhatsAppConversation', () => ({
  findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'conv-1' }),
  updateOne: jest.fn().mockResolvedValue({}),
}));
jest.mock('../models/WhatsAppConsent', () => ({
  recordInbound: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/notifications/notification-enhanced.service', () => ({
  send: jest.fn().mockResolvedValue(undefined),
}));

const whatsappService = require('../services/whatsapp/whatsappService');
const templateSync = require('../services/whatsapp/templateSync.service');
const notifService = require('../services/notifications/notification-enhanced.service');
const webhook = require('../services/whatsapp/whatsappWebhook.service');

const mongoose = require('mongoose');

const MSG = {
  from: '966500000000',
  id: 'wamid.TEST',
  type: 'text',
  timestamp: String(Math.floor(Date.now() / 1000)),
  text: { body: 'أرجو إرسال تقرير الجلسة' },
};
const CONTACT = { profile: { name: 'ولي الأمر' } };

describe('W738 — auto-reply template deliverability gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('skips send + escalates when the auto-reply template is REJECTED', async () => {
    templateSync.getTemplateStatus.mockResolvedValue('REJECTED');

    await webhook.handleIncomingMessage(MSG, CONTACT, 'pnid');

    expect(templateSync.getTemplateStatus).toHaveBeenCalledWith('document_request_ack');
    expect(whatsappService.sendTemplate).not.toHaveBeenCalled();
    // Gate converts the turn into an escalation → notification fires.
    expect(notifService.send).toHaveBeenCalledTimes(1);
  });

  test('sends the template when it is APPROVED', async () => {
    templateSync.getTemplateStatus.mockResolvedValue('APPROVED');

    await webhook.handleIncomingMessage(MSG, CONTACT, 'pnid');

    expect(whatsappService.sendTemplate).toHaveBeenCalledTimes(1);
    expect(whatsappService.sendTemplate).toHaveBeenCalledWith(
      MSG.from,
      'document_request_ack',
      'ar',
      expect.any(Array)
    );
    // Approved deliverable send → no escalation for this normal-urgency turn.
    expect(notifService.send).not.toHaveBeenCalled();
  });

  test('fails OPEN: a null status (no cached row / DB error) still sends', async () => {
    templateSync.getTemplateStatus.mockResolvedValue(null);

    await webhook.handleIncomingMessage(MSG, CONTACT, 'pnid');

    expect(whatsappService.sendTemplate).toHaveBeenCalledTimes(1);
    expect(notifService.send).not.toHaveBeenCalled();
  });

  test('fails OPEN when the status lookup throws', async () => {
    templateSync.getTemplateStatus.mockRejectedValue(new Error('db down'));

    await webhook.handleIncomingMessage(MSG, CONTACT, 'pnid');

    expect(whatsappService.sendTemplate).toHaveBeenCalledTimes(1);
  });
});

describe('W739 — escalation flags the conversation for the staff review queue', () => {
  let ConvModel;

  beforeEach(() => {
    jest.clearAllMocks();
    // The webhook handler resolves the conversation model via mongoose.model()
    // (see getConversationModel). Configure that instance so the upsert returns
    // a doc and the escalation flag-update is observable.
    ConvModel = mongoose.model('WhatsAppConversation');
    ConvModel.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'conv-1' });
    ConvModel.updateOne = jest.fn().mockResolvedValue({});
  });

  test('a template-not-approved escalation sets requiresHumanReview + status=escalated', async () => {
    templateSync.getTemplateStatus.mockResolvedValue('REJECTED');

    await webhook.handleIncomingMessage(MSG, CONTACT, 'pnid');

    // The conversation record is updated so Conversation.findPendingReview
    // (which filters requiresHumanReview:true) surfaces it to staff.
    const flagUpdate = ConvModel.updateOne.mock.calls.find(
      ([, update]) => update?.$set?.requiresHumanReview === true
    );
    expect(flagUpdate).toBeDefined();
    expect(flagUpdate[1].$set.status).toBe('escalated');
  });

  test('an APPROVED deliverable auto-reply does NOT flag the conversation', async () => {
    templateSync.getTemplateStatus.mockResolvedValue('APPROVED');

    await webhook.handleIncomingMessage(MSG, CONTACT, 'pnid');

    const flagUpdate = ConvModel.updateOne.mock.calls.find(
      ([, update]) => update?.$set?.requiresHumanReview === true
    );
    expect(flagUpdate).toBeUndefined();
  });
});
