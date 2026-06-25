'use strict';

/**
 * WhatsApp Socket Handler Tests
 *
 * Covers:
 *   1. whatsapp:subscribe joins branch and org rooms.
 *   2. whatsapp:subscribe rejects invalid scopes.
 *   3. whatsapp:unsubscribe leaves rooms and cleans up.
 */

describe('WhatsApp socket handler', () => {
  let handler;
  let socket;
  let io;
  let activeSubscriptions;

  function setupSocket() {
    const rooms = new Set();
    const eventMap = {};
    return {
      id: `socket_${Math.random().toString(36).slice(2)}`,
      userId: 'user-123',
      join: room => rooms.add(room),
      leave: room => rooms.delete(room),
      emit: jest.fn((event, data) => {
        eventMap[event] = data;
      }),
      on: jest.fn((event, cb) => {
        eventMap[event] = cb;
      }),
      joinedRooms: rooms,
      eventMap,
    };
  }

  beforeEach(() => {
    jest.resetModules();
    handler = require('../sockets/handlers/whatsappHandler');
    socket = setupSocket();
    io = {};
    activeSubscriptions = new Map();
    handler(socket, io, activeSubscriptions);
  });

  test('subscribes to branch and organization rooms', () => {
    const branchId = '507f1f77bcf86cd799439011';
    const organizationId = '507f1f77bcf86cd799439022';

    socket.eventMap['whatsapp:subscribe']({ branchId, organizationId });

    expect(socket.joinedRooms.has(`whatsapp:branch:${branchId}`)).toBe(true);
    expect(socket.joinedRooms.has(`whatsapp:org:${organizationId}`)).toBe(true);
    expect(activeSubscriptions.get(socket.id)).toMatchObject({
      type: 'whatsapp',
      userId: 'user-123',
      rooms: [`whatsapp:branch:${branchId}`, `whatsapp:org:${organizationId}`],
    });
    expect(socket.emit).toHaveBeenCalledWith(
      'whatsapp:subscribed',
      expect.objectContaining({
        rooms: [`whatsapp:branch:${branchId}`, `whatsapp:org:${organizationId}`],
      })
    );
  });

  test('rejects subscription with invalid scope', () => {
    socket.eventMap['whatsapp:subscribe']({ branchId: 'not-valid!!!' });

    expect(socket.joinedRooms.size).toBe(0);
    expect(socket.emit).toHaveBeenCalledWith(
      'whatsapp:error',
      expect.objectContaining({ code: 'INVALID_SCOPE' })
    );
  });

  test('unsubscribes and leaves all rooms', () => {
    const branchId = '507f1f77bcf86cd799439011';

    socket.eventMap['whatsapp:subscribe']({ branchId });
    expect(socket.joinedRooms.size).toBe(1);

    socket.eventMap['whatsapp:unsubscribe']();
    expect(socket.joinedRooms.size).toBe(0);
    expect(activeSubscriptions.has(socket.id)).toBe(false);
    expect(socket.emit).toHaveBeenCalledWith(
      'whatsapp:unsubscribed',
      expect.objectContaining({ timestamp: expect.any(String) })
    );
  });
});
