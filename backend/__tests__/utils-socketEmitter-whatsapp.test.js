'use strict';

/**
 * SocketEmitter — WhatsApp event emission tests
 *
 * Covers:
 *   1. emitWhatsAppMessage emits to branch and org rooms.
 *   2. emitWhatsAppStatusUpdate emits status payloads.
 *   3. emitWhatsAppConversationUpdate emits metadata changes.
 *   4. emitWhatsAppEscalation emits escalation alerts.
 *   5. All emitters tolerate a missing io instance.
 */

describe('SocketEmitter — WhatsApp events', () => {
  let socketEmitter;
  let mockIo;
  let emitted;

  function createMockIo() {
    emitted = [];
    return {
      to: jest.fn(room => ({
        emit: (event, data) => {
          emitted.push({ room, event, data });
        },
      })),
    };
  }

  beforeEach(() => {
    jest.resetModules();
    socketEmitter = require('../utils/socketEmitter');
    mockIo = createMockIo();
    socketEmitter.initializeSocketEmitter(mockIo);
  });

  test('emitWhatsAppMessage sends to branch and org rooms', () => {
    const result = socketEmitter.emitWhatsAppMessage({
      branchId: 'branch-1',
      organizationId: 'org-1',
      conversationId: 'conv-1',
      message: { direction: 'incoming', text: 'hello' },
      conversation: { phone: '+966500000001' },
    });

    expect(result).toBe(true);
    expect(emitted).toHaveLength(2);
    expect(emitted[0]).toMatchObject({
      room: 'whatsapp:branch:branch-1',
      event: 'whatsapp:message',
      data: { conversationId: 'conv-1', message: { text: 'hello' } },
    });
    expect(emitted[1]).toMatchObject({
      room: 'whatsapp:org:org-1',
      event: 'whatsapp:message',
    });
  });

  test('emitWhatsAppStatusUpdate sends status payload', () => {
    socketEmitter.emitWhatsAppStatusUpdate({
      branchId: 'branch-1',
      conversationId: 'conv-1',
      providerMessageId: 'msg-1',
      status: 'delivered',
    });

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      room: 'whatsapp:branch:branch-1',
      event: 'whatsapp:status',
      data: { providerMessageId: 'msg-1', status: 'delivered' },
    });
  });

  test('emitWhatsAppConversationUpdate sends metadata changes', () => {
    socketEmitter.emitWhatsAppConversationUpdate({
      branchId: 'branch-1',
      conversationId: 'conv-1',
      changes: { unreadCount: 3 },
    });

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      room: 'whatsapp:branch:branch-1',
      event: 'whatsapp:conversation',
      data: { changes: { unreadCount: 3 } },
    });
  });

  test('emitWhatsAppEscalation sends escalation alert', () => {
    socketEmitter.emitWhatsAppEscalation({
      branchId: 'branch-1',
      conversationId: 'conv-1',
      reason: 'critical_emergency',
      conversation: { phone: '+966500000001' },
    });

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      room: 'whatsapp:branch:branch-1',
      event: 'whatsapp:escalation',
      data: { reason: 'critical_emergency', type: 'escalation' },
    });
  });

  test('returns false when io is not initialized', () => {
    jest.resetModules();
    socketEmitter = require('../utils/socketEmitter');

    const result = socketEmitter.emitWhatsAppMessage({
      branchId: 'branch-1',
      conversationId: 'conv-1',
      message: { text: 'hi' },
    });

    expect(result).toBe(false);
    expect(emitted).toHaveLength(0);
  });
});
