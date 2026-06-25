/**
 * WhatsApp Socket Handler
 * معالج أحداث واتساب الفورية
 *
 * Emits real-time WhatsApp events to subscribed staff clients:
 *   - whatsapp:message       new inbound/outbound message
 *   - whatsapp:status        delivery/read/failed status update
 *   - whatsapp:conversation  conversation metadata update
 *   - whatsapp:escalation    bot escalation to human staff
 *
 * Rooms:
 *   - whatsapp:branch:{branchId}   branch-scoped staff view (W1407)
 *   - whatsapp:org:{organizationId} cross-branch admin view
 */

const logger = require('../../utils/logger');

/**
 * Validate branchId / organizationId payload
 * @param {string|undefined} id
 * @returns {boolean}
 */
function isValidObjectIdLike(id) {
  if (!id) return false;
  if (typeof id !== 'string') return false;
  // MongoDB ObjectId is 24 hex chars; also accept short aliases for tests
  return /^[0-9a-fA-F]{24}$/.test(id) || /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}

/**
 * Handle WhatsApp real-time subscriptions
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @param {Map} activeSubscriptions
 */
function whatsappHandler(socket, io, activeSubscriptions) {
  // Subscribe to WhatsApp events for one or more scopes
  socket.on('whatsapp:subscribe', payload => {
    try {
      const { branchId, organizationId } = payload || {};
      const rooms = [];

      if (isValidObjectIdLike(branchId)) {
        const room = `whatsapp:branch:${branchId}`;
        socket.join(room);
        rooms.push(room);
      }

      if (isValidObjectIdLike(organizationId)) {
        const room = `whatsapp:org:${organizationId}`;
        socket.join(room);
        rooms.push(room);
      }

      if (rooms.length === 0) {
        socket.emit('whatsapp:error', {
          code: 'INVALID_SCOPE',
          message: 'branchId or organizationId required',
        });
        return;
      }

      activeSubscriptions.set(socket.id, {
        type: 'whatsapp',
        userId: socket.userId,
        rooms,
        subscribedAt: new Date(),
      });

      logger.info(`[WhatsAppSocket] ${socket.id} subscribed to ${rooms.join(', ')}`);
      socket.emit('whatsapp:subscribed', { rooms, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error('[WhatsAppSocket] Subscribe error:', error);
      socket.emit('whatsapp:error', { code: 'SUBSCRIBE_ERROR', message: error.message });
    }
  });

  // Unsubscribe from all WhatsApp rooms
  socket.on('whatsapp:unsubscribe', () => {
    try {
      const sub = activeSubscriptions.get(socket.id);
      if (sub && sub.type === 'whatsapp' && Array.isArray(sub.rooms)) {
        sub.rooms.forEach(room => socket.leave(room));
        activeSubscriptions.delete(socket.id);
        logger.info(`[WhatsAppSocket] ${socket.id} unsubscribed`);
      }
      socket.emit('whatsapp:unsubscribed', { timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error('[WhatsAppSocket] Unsubscribe error:', error);
      socket.emit('whatsapp:error', { code: 'UNSUBSCRIBE_ERROR', message: error.message });
    }
  });

  // Heartbeat / presence for staff
  socket.on('whatsapp:presence', ({ status }) => {
    const sub = activeSubscriptions.get(socket.id);
    if (sub && sub.type === 'whatsapp') {
      sub.lastPresence = { status, at: new Date() };
    }
  });
}

module.exports = whatsappHandler;
