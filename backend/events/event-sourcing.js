/**
 * Event Sourcing System - نظام تتبع الأحداث
 * Professional Event Store for Alawael ERP
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');

/**
 * Event Schema
 */
const EventSchema = new mongoose.Schema({
  // Event Identity
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true, index: true },
  aggregateType: { type: String, required: true, index: true },
  aggregateId: { type: String, required: true, index: true },
  
  // Event Data
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  metadata: {
    userId: { type: String, index: true },
    correlationId: { type: String },
    causationId: { type: String },
    ip: String,
    userAgent: String,
    source: String,
  },
  
  // Versioning
  version: { type: Number, required: true },
  
  // Timestamps
  timestamp: { type: Date, default: Date.now, index: true },
  
  // Processing Status
  processed: { type: Boolean, default: false },
  processedAt: Date,
  processingError: String,
}, {
  collection: 'events',
  timestamps: false,
});

// Compound indexes for efficient queries
EventSchema.index({ aggregateType: 1, aggregateId: 1, version: 1 });
EventSchema.index({ eventType: 1, timestamp: -1 });

/**
 * Event Store Class
 */
class EventStore extends EventEmitter {
  constructor(connection) {
    super();
    this.connection = connection;
    this.Event = connection.model('Event', EventSchema);
    this.subscribers = new Map();
    this.projections = new Map();
    this.isProcessing = false;
  }
  
  /**
   * Append event to store
   */
  async append(event) {
    const {
      eventType,
      aggregateType,
      aggregateId,
      payload,
      metadata = {},
    } = event;
    
    // Get next version number
    const version = await this.getNextVersion(aggregateType, aggregateId);
    
    // Generate event ID
    const eventId = this.generateEventId();
    
    // Create event document
    const eventDoc = new this.Event({
      eventId,
      eventType,
      aggregateType,
      aggregateId,
      payload,
      metadata: {
        ...metadata,
        timestamp: new Date(),
      },
      version,
    });
    
    // Save event
    await eventDoc.save();
    
    // Emit event for subscribers
    this.emit('event:appended', eventDoc);
    
    // Notify subscribers
    await this.notifySubscribers(eventDoc);
    
    return eventDoc;
  }
  
  /**
   * Append multiple events atomically
   */
  async appendMany(events) {
    const session = await this.connection.startSession();
    session.startTransaction();
    
    try {
      const savedEvents = [];
      
      for (const event of events) {
        const savedEvent = await this.append(event);
        savedEvents.push(savedEvent);
      }
      
      await session.commitTransaction();
      
      return savedEvents;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Get next version for aggregate
   */
  async getNextVersion(aggregateType, aggregateId) {
    const lastEvent = await this.Event.findOne({
      aggregateType,
      aggregateId,
    }).sort({ version: -1 });
    
    return lastEvent ? lastEvent.version + 1 : 1;
  }
  
  /**
   * Get events for aggregate
   */
  async getEvents(aggregateType, aggregateId, fromVersion = 0) {
    return this.Event.find({
      aggregateType,
      aggregateId,
      version: { $gt: fromVersion },
    }).sort({ version: 1 });
  }
  
  /**
   * Get all events of a type
   */
  async getEventsByType(eventType, options = {}) {
    const { limit = 100, skip = 0, fromTimestamp } = options;
    
    const query = { eventType };
    if (fromTimestamp) {
      query.timestamp = { $gte: fromTimestamp };
    }
    
    return this.Event.find(query)
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit);
  }
  
  /**
   * Subscribe to events
   */
  subscribe(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType).add(handler);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(eventType)?.delete(handler);
    };
  }
  
  /**
   * Notify all subscribers
   */
  async notifySubscribers(event) {
    const handlers = this.subscribers.get(event.eventType);
    
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Subscriber error for ${event.eventType}:`, error);
        }
      }
    }
    
    // Also notify wildcard subscribers
    const wildcardHandlers = this.subscribers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error('Wildcard subscriber error:', error);
        }
      }
    }
  }
  
  /**
   * Register projection
   */
  registerProjection(name, projection) {
    this.projections.set(name, projection);
    console.log(`✅ Projection registered: ${name}`);
  }
  
  /**
   * Rebuild projection
   */
  async rebuildProjection(name, fromTimestamp = null) {
    const projection = this.projections.get(name);
    
    if (!projection) {
      throw new Error(`Projection '${name}' not found`);
    }
    
    const query = {};
    if (fromTimestamp) {
      query.timestamp = { $gte: fromTimestamp };
    }
    
    // Get all events
    const events = await this.Event.find(query)
      .sort({ timestamp: 1 })
      .stream();
    
    let processed = 0;
    
    for await (const event of events) {
      if (projection.handles.includes(event.eventType)) {
        await projection.apply(event);
        processed++;
      }
    }
    
    console.log(`✅ Projection '${name}' rebuilt: ${processed} events processed`);
    
    return { processed };
  }
  
  /**
   * Generate unique event ID
   */
  generateEventId() {
    const crypto = require('crypto');
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
  
  /**
   * Get event statistics
   */
  async getStats() {
    const total = await this.Event.countDocuments();
    const byType = await this.Event.aggregate([
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    
    return {
      total,
      byType,
      subscribers: this.subscribers.size,
      projections: this.projections.size,
    };
  }
}

/**
 * Aggregate Base Class
 */
class Aggregate {
  constructor(id) {
    this.id = id;
    this.version = 0;
    this.changes = [];
  }
  
  /**
   * Apply event to aggregate
   */
  apply(event, isNew = true) {
    // Apply event to aggregate state
    this.handle(event);
    
    if (isNew) {
      this.changes.push(event);
    }
    
    this.version++;
  }
  
  /**
   * Load from history
   */
  loadFromHistory(events) {
    for (const event of events) {
      this.apply(event, false);
    }
  }
  
  /**
   * Get uncommitted changes
   */
  getUncommittedChanges() {
    return [...this.changes];
  }
  
  /**
   * Mark changes as committed
   */
  markChangesAsCommitted() {
    this.changes = [];
  }
  
  /**
   * Handle event (to be overridden)
   */
  handle(event) {
    // Override in subclass
  }
}

/**
 * Event Types for Alawael ERP
 */
const EventTypes = {
  // User Events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_PASSWORD_CHANGED: 'user.password_changed',
  USER_ROLE_ASSIGNED: 'user.role_assigned',
  
  // Employee Events
  EMPLOYEE_HIRED: 'employee.hired',
  EMPLOYEE_TERMINATED: 'employee.terminated',
  EMPLOYEE_PROMOTED: 'employee.promoted',
  EMPLOYEE_DEPARTMENT_CHANGED: 'employee.department_changed',
  
  // Attendance Events
  ATTENDANCE_CHECKED_IN: 'attendance.checked_in',
  ATTENDANCE_CHECKED_OUT: 'attendance.checked_out',
  ATTENDANCE_LEAVE_REQUESTED: 'attendance.leave_requested',
  ATTENDANCE_LEAVE_APPROVED: 'attendance.leave_approved',
  
  // Finance Events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_CANCELLED: 'invoice.cancelled',
  PAYMENT_RECEIVED: 'payment.received',
  BUDGET_ALLOCATED: 'budget.allocated',
  
  // Inventory Events
  STOCK_ADDED: 'stock.added',
  STOCK_REMOVED: 'stock.removed',
  STOCK_RESERVED: 'stock.reserved',
  STOCK_TRANSFERRED: 'stock.transferred',
  PURCHASE_ORDER_CREATED: 'purchase_order.created',
  
  // Project Events
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_COMPLETED: 'project.completed',
  TASK_ASSIGNED: 'task.assigned',
  TASK_COMPLETED: 'task.completed',
};

/**
 * Create Event Store
 */
const createEventStore = (connection) => {
  return new EventStore(connection);
};

module.exports = {
  EventStore,
  Aggregate,
  EventSchema,
  EventTypes,
  createEventStore,
};