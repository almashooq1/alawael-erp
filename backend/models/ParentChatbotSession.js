'use strict';

/**
 * ParentChatbotSession — Wave 120 / P3.6 Phase 1.
 *
 * Conversation persistence for the Parent Chatbot. Each session is
 * scoped to one parent user, optionally a specific beneficiary
 * (their child), and a branch.
 *
 * PDPL posture:
 *   - 30-day TTL via Mongo TTL index on `lastActivityAt`. Older
 *     sessions are deleted automatically.
 *   - No clinical data stored — only conversation text + the
 *     resolved intent label + confidence. Templates that would
 *     reveal medical detail are blocked at the service layer
 *     (see parent-chatbot.registry.FORBIDDEN_RESPONSE_TOKENS).
 *
 * Wave-18 invariants:
 *   - sessionId required + unique
 *   - turnCount === turns.length on save
 *   - lastActivityAt ≥ startedAt
 */

const mongoose = require('mongoose');

const TTL_SECONDS = 30 * 24 * 60 * 60;

const TurnSchema = new mongoose.Schema(
  {
    askedAt: { type: Date, required: true },
    message: { type: String, required: true, maxlength: 2000 },
    intent: { type: String, required: true, maxlength: 80 },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    respondedIntent: { type: String, required: true, maxlength: 80 },
    response: { type: String, required: true, maxlength: 4000 },
    clarification: {
      type: {
        topIntent: { type: String, maxlength: 80 },
        runnerUp: { type: String, maxlength: 80, default: null },
        confidence: { type: Number, min: 0, max: 1 },
      },
      default: null,
      _id: false,
    },
  },
  { _id: false }
);

const ParentChatbotSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, maxlength: 64 },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    startedAt: { type: Date, required: true, default: Date.now },
    lastActivityAt: { type: Date, required: true, default: Date.now },

    turns: { type: [TurnSchema], default: () => [] },
    turnCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Wave-18 invariants
ParentChatbotSessionSchema.pre('validate', function (next) {
  if (!Array.isArray(this.turns)) this.turns = [];
  if (this.turnCount !== this.turns.length) {
    // Self-heal rather than reject — turnCount is a denormalized
    // counter; if it drifts, the source of truth is turns.length.
    this.turnCount = this.turns.length;
  }
  if (this.lastActivityAt && this.startedAt && this.lastActivityAt < this.startedAt) {
    return next(new Error('lastActivityAt cannot precede startedAt'));
  }
  return next();
});

// TTL: documents whose `lastActivityAt` is older than 30 days are
// deleted by Mongo's TTL monitor.
ParentChatbotSessionSchema.index({ lastActivityAt: 1 }, { expireAfterSeconds: TTL_SECONDS });

module.exports =
  mongoose.models.ParentChatbotSession ||
  mongoose.model('ParentChatbotSession', ParentChatbotSessionSchema);
