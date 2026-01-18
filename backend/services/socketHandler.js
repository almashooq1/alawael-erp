// Enhanced Socket.IO Integration for Real-time Notifications
// File: backend/services/socketHandler.js

module.exports = function setupSocketHandler(io) {
  io.on('connection', socket => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join user to their personal room
    socket.on('authenticate', data => {
      const userId = data.userId;
      socket.userId = userId;
      socket.join(`user_${userId}`);
      console.log(`[Socket.IO] User ${userId} authenticated on socket ${socket.id}`);

      // Send confirmation
      socket.emit('authenticated', {
        success: true,
        userId,
        socketId: socket.id,
      });
    });

    // Listen for specific room joins
    socket.on('join_beneficiaries_room', () => {
      socket.join('beneficiaries');
      socket.emit('joined_room', { room: 'beneficiaries' });
    });

    // Listen for medical records room
    socket.on('join_medical_records_room', () => {
      socket.join('medical_records');
      socket.emit('joined_room', { room: 'medical_records' });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });

    // Error handler
    socket.on('error', error => {
      console.error(`[Socket.IO] Error for socket ${socket.id}:`, error);
    });
  });

  return {
    // Emit beneficiary created event
    emitBeneficiaryCreated: beneficiary => {
      io.to('beneficiaries').emit('beneficiary_created', {
        _id: beneficiary._id,
        fileNumber: beneficiary.fileNumber,
        firstName: beneficiary.firstName,
        lastName: beneficiary.lastName,
        email: beneficiary.email,
        timestamp: new Date(),
      });
      console.log(`[Socket] Beneficiary created event emitted: ${beneficiary.fileNumber}`);
    },

    // Emit beneficiary updated event
    emitBeneficiaryUpdated: beneficiary => {
      io.to('beneficiaries').emit('beneficiary_updated', {
        _id: beneficiary._id,
        fileNumber: beneficiary.fileNumber,
        firstName: beneficiary.firstName,
        lastName: beneficiary.lastName,
        timestamp: new Date(),
      });
      console.log(`[Socket] Beneficiary updated event emitted: ${beneficiary.fileNumber}`);
    },

    // Emit beneficiary deleted event
    emitBeneficiaryDeleted: beneficiary => {
      io.to('beneficiaries').emit('beneficiary_deleted', {
        _id: beneficiary._id,
        fileNumber: beneficiary.fileNumber,
        firstName: beneficiary.firstName,
        lastName: beneficiary.lastName,
        timestamp: new Date(),
      });
      console.log(`[Socket] Beneficiary deleted event emitted: ${beneficiary.fileNumber}`);
    },

    // Emit medical record added event
    emitMedicalRecordAdded: (beneficiaryId, record) => {
      io.to('medical_records').emit('medical_record_added', {
        beneficiaryId,
        recordId: record._id,
        diagnosis: record.diagnosis,
        doctorId: record.doctorId,
        timestamp: new Date(),
      });
      console.log(`[Socket] Medical record added event emitted for beneficiary: ${beneficiaryId}`);
    },

    // Emit error event
    emitError: (message, severity = 'error') => {
      io.emit('notification_error', {
        message,
        severity,
        timestamp: new Date(),
      });
      console.error(`[Socket] Error event emitted: ${message}`);
    },

    // Emit to specific user
    emitToUser: (userId, event, data) => {
      io.to(`user_${userId}`).emit(event, {
        ...data,
        timestamp: new Date(),
      });
    },

    // Get connected clients info
    getConnectedClients: () => {
      const clients = [];
      io.sockets.sockets.forEach(socket => {
        clients.push({
          id: socket.id,
          userId: socket.userId || null,
          connectedAt: socket.connectedAt,
        });
      });
      return clients;
    },

    // Get connected clients count
    getConnectedCount: () => {
      return io.engine.clientsCount || Object.keys(io.sockets.sockets).length;
    },
  };
};
