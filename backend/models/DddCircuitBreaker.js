'use strict';
/**
 * DddCircuitBreaker Model
 * Auto-extracted from services/dddCircuitBreaker.js
 * Schemas, constants, and Mongoose model registrations.
 */
const mongoose = require('mongoose');



const circuitStateSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true, unique: true, index: true },
    state: {
      type: String,
      enum: ['closed', 'open', 'half-open'],
      default: 'closed',
    },
    failureCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    halfOpenSuccesses: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    totalFailures: { type: Number, default: 0 },
    totalSuccesses: { type: Number, default: 0 },

    lastFailure: Date,
    lastSuccess: Date,
    lastStateChange: { type: Date, default: Date.now },
    lastError: String,

    config: {
      failureThreshold: { type: Number, default: 5 },
      resetTimeoutMs: { type: Number, default: 30000 },
      halfOpenRequests: { type: Number, default: 3 },
      monitorIntervalMs: { type: Number, default: 60000 },
    },

    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const DDDCircuitState =
  mongoose.models.DDDCircuitState || mongoose.model('DDDCircuitState', circuitStateSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Circuit Event Log
   ═══════════════════════════════════════════════════════════════════════ */
const circuitEventSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true, index: true },
    eventType: {
      type: String,
      enum: ['trip', 'reset', 'half-open', 'success', 'failure', 'fallback', 'manual-reset'],
      required: true,
    },
    previousState: String,
    newState: String,
    error: String,
    durationMs: Number,
    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

circuitEventSchema.index({ serviceName: 1, createdAt: -1 });

const DDDCircuitEvent =
  mongoose.models.DDDCircuitEvent || mongoose.model('DDDCircuitEvent', circuitEventSchema);

/* ═══════════════════════════════════════════════════════════════════════
   3. Default Circuit Configurations
   ═══════════════════════════════════════════════════════════════════════ */
const CIRCUIT_DEFAULTS = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenRequests: 3,
  monitorIntervalMs: 60000,
};

const PRE_CONFIGURED_CIRCUITS = [
  {
    serviceName: 'mongodb',
    config: { failureThreshold: 3, resetTimeoutMs: 10000, halfOpenRequests: 2 },
  },
  {
    serviceName: 'redis',
    config: { failureThreshold: 5, resetTimeoutMs: 15000, halfOpenRequests: 3 },
  },
  {
    serviceName: 'email-service',
    config: { failureThreshold: 5, resetTimeoutMs: 60000, halfOpenRequests: 2 },
  },
  {
    serviceName: 'sms-service',
    config: { failureThreshold: 3, resetTimeoutMs: 120000, halfOpenRequests: 1 },
  },
  {
    serviceName: 'push-notification',
    config: { failureThreshold: 5, resetTimeoutMs: 60000, halfOpenRequests: 2 },
  },
  {
    serviceName: 'fhir-endpoint',
    config: { failureThreshold: 3, resetTimeoutMs: 30000, halfOpenRequests: 2 },
  },
  {
    serviceName: 'webhook-delivery',
    config: { failureThreshold: 10, resetTimeoutMs: 30000, halfOpenRequests: 5 },
  },
  {
    serviceName: 's3-storage',
    config: { failureThreshold: 3, resetTimeoutMs: 20000, halfOpenRequests: 2 },
  },
  {
    serviceName: 'ai-recommendation-engine',
    config: { failureThreshold: 5, resetTimeoutMs: 45000, halfOpenRequests: 3 },
  },
  {
    serviceName: 'external-assessment-api',
    config: { failureThreshold: 3, resetTimeoutMs: 60000, halfOpenRequests: 2 },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   4. CircuitBreaker Class
   ═══════════════════════════════════════════════════════════════════════ */

module.exports = {
  DDDCircuitState,
  DDDCircuitEvent,
};
