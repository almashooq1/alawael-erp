'use strict';

/**
 * W1424j — sendNotification persists an outbound record (delivery observability).
 *
 * Automated/subscriber sends (post-session, complaint-resolved, waitlist,
 * appointment reminders) route through sendNotification and were fire-and-forget
 * with NO conversation row — so Meta's delivered/read/failed status webhooks
 * (handleStatusUpdate matches WhatsAppConversation.messages.providerMessageId)
 * had nothing to reconcile, and there was no delivery/failure visibility for
 * guardian messages. recordOutbound now pushes an outgoing message on success.
 *
 * Behavioral: stub mode (WHATSAPP_ENABLED unset) makes sendTemplate succeed with
 * a stub messageId; the WhatsAppConversation model is mocked to capture the write.
 */

// Mocked by RESOLVED path — recordOutbound require('../../models/WhatsAppConversation')
// from services/whatsapp/ resolves to the same file as '../models/...' from here.
const mockFindOneAndUpdate = jest.fn(() => ({ catch: () => Promise.resolve() }));
jest.mock('../models/WhatsAppConversation', () => ({
  findOneAndUpdate: (...args) => mockFindOneAndUpdate(...args),
}));

describe('W1424j sendNotification delivery observability', () => {
  let whatsappService;
  beforeAll(() => {
    delete process.env.WHATSAPP_ENABLED; // stub mode → sendTemplate returns success
    whatsappService = require('../services/whatsapp/whatsappService');
  });

  test('records an outbound message with providerMessageId + deliveryStatus on success', async () => {
    mockFindOneAndUpdate.mockClear();
    await whatsappService.sendNotification('966500000000', 'Title', 'Body', {
      branchId: 'b1',
      beneficiaryId: 'ben1',
    });
    await new Promise(r => setImmediate(r)); // let the fire-and-forget recordOutbound run

    expect(mockFindOneAndUpdate).toHaveBeenCalled();
    const [filter, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter.phone).toBeTruthy();
    const msg = update.$push.messages;
    expect(msg.direction).toBe('outgoing');
    expect(msg.deliveryStatus).toBe('sent');
    expect(msg.providerMessageId).toMatch(/^stub-/);
    expect(update.$setOnInsert.branchId).toBe('b1');
    expect(update.$setOnInsert.beneficiaryId).toBe('ben1');
  });

  test('recordOutbound is exported and a no-op without a providerMessageId', async () => {
    mockFindOneAndUpdate.mockClear();
    expect(typeof whatsappService.recordOutbound).toBe('function');
    await whatsappService.recordOutbound('966500000000', null, {});
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});
