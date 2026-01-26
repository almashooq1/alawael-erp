/**
 * Chat Handler
 * معالج الدردشة الفورية
 */

/**
 * Handle chat/messaging events
 * معالجة أحداث الدردشة والرسائل
 */
function chatHandler(socket, io, activeSubscriptions) {
  // Join a chat room
  socket.on('chat:join', ({ roomId, userId }) => {
    if (!roomId) {
      socket.emit('error', { message: 'Room ID is required' });
      return;
    }

    const room = `chat:${roomId}`;
    socket.join(room);

    // Store subscription
    activeSubscriptions.set(socket.id, {
      type: 'chat',
      roomId,
      userId: userId || socket.userId,
      joinedAt: new Date(),
    });

    console.log(`[Chat] ${socket.id} joined room ${roomId}`);

    // Notify room members
    socket.to(room).emit('chat:user-joined', {
      userId: userId || socket.userId,
      roomId,
      timestamp: new Date().toISOString(),
    });

    // Confirm to joiner
    socket.emit('chat:joined', {
      roomId,
      timestamp: new Date().toISOString(),
    });
  });

  // Leave a chat room
  socket.on('chat:leave', ({ roomId }) => {
    if (!roomId) return;

    const room = `chat:${roomId}`;
    socket.leave(room);

    const sub = activeSubscriptions.get(socket.id);
    if (sub && sub.type === 'chat' && sub.roomId === roomId) {
      activeSubscriptions.delete(socket.id);
    }

    console.log(`[Chat] ${socket.id} left room ${roomId}`);

    // Notify room members
    socket.to(room).emit('chat:user-left', {
      userId: sub?.userId || socket.userId,
      roomId,
      timestamp: new Date().toISOString(),
    });

    socket.emit('chat:left', { roomId });
  });

  // Send message to room
  socket.on('chat:message', ({ roomId, message, metadata }) => {
    if (!roomId || !message) {
      socket.emit('error', { message: 'Room ID and message are required' });
      return;
    }

    const room = `chat:${roomId}`;
    const sub = activeSubscriptions.get(socket.id);

    const messageData = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      userId: sub?.userId || socket.userId,
      message,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    // Broadcast to room (including sender)
    io.to(room).emit('chat:message', messageData);

    console.log(`[Chat] Message sent to room ${roomId}`);

    // Confirm to sender
    socket.emit('chat:message-sent', {
      messageId: messageData.id,
      timestamp: messageData.timestamp,
    });
  });

  // Typing indicator
  socket.on('chat:typing', ({ roomId, isTyping }) => {
    if (!roomId) return;

    const room = `chat:${roomId}`;
    const sub = activeSubscriptions.get(socket.id);

    // Broadcast to others in room (not sender)
    socket.to(room).emit('chat:typing', {
      userId: sub?.userId || socket.userId,
      roomId,
      isTyping: !!isTyping,
      timestamp: new Date().toISOString(),
    });
  });

  // Get online users in room
  socket.on('chat:get-online-users', async ({ roomId }) => {
    if (!roomId) return;

    const room = `chat:${roomId}`;
    const socketsInRoom = await io.in(room).allSockets();

    const onlineUsers = [];
    socketsInRoom.forEach(socketId => {
      const sub = activeSubscriptions.get(socketId);
      if (sub && sub.type === 'chat' && sub.roomId === roomId) {
        onlineUsers.push({
          userId: sub.userId,
          joinedAt: sub.joinedAt,
        });
      }
    });

    socket.emit('chat:online-users', {
      roomId,
      users: onlineUsers,
      count: onlineUsers.length,
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = chatHandler;
