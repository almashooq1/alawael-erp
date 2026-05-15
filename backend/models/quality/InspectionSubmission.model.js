'use strict';

/**
 * InspectionSubmission.model.js — World-Class QMS Phase 29 Commit 16.
 *
 * Quality-inspector submissions, designed for offline-first mobile
 * capture. Each submission carries a client-generated UUID so the
 * server can de-dupe even when the device retries the same payload
 * after a poor-connection retry.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const photoSchema = new Schema(
  {
    url: { type: String, default: null },
    caption: { type: String, default: null },
    capturedAt: { type: Date, default: null },
    gpsLat: { type: Number, default: null },
    gpsLng: { type: Number, default: null },
  },
  { _id: true }
);

const itemAnswerSchema = new Schema(
  {
    itemCode: { type: String, required: true },
    itemQuestion: { type: String, default: null },
    answer: { type: Schema.Types.Mixed, default: null }, // pass|fail|n/a|text|number
    notes: { type: String, default: null },
    photos: { type: [photoSchema], default: [] },
  },
  { _id: true }
);

const submissionSchema = new Schema(
  {
    submissionNumber: { type: String, unique: true, index: true }, // INS-YYYY-NNNN
    clientUuid: { type: String, unique: true, index: true, required: true },
    inspectionType: { type: String, required: true }, // hand-hygiene, env-rounds, …
    title: { type: String, required: true },
    checklistTemplateCode: { type: String, default: null },

    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },

    inspectorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, default: null },
    location: { type: String, default: null },

    capturedAt: { type: Date, required: true },
    submittedAt: { type: Date, default: Date.now },
    deviceInfo: { type: String, default: null },
    offlineDurationMs: { type: Number, default: null }, // how long the device was offline

    items: { type: [itemAnswerSchema], default: [] },
    photos: { type: [photoSchema], default: [] }, // overall photos
    overallScore: { type: Number, default: null }, // computed
    overallOutcome: {
      type: String,
      enum: ['pass', 'pass_with_actions', 'fail', null],
      default: null,
    },

    relatedIncidentId: { type: Schema.Types.ObjectId, ref: 'Incident', default: null },
    notes: { type: String, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'inspection_submissions' }
);

submissionSchema.index({ branchId: 1, inspectionType: 1, capturedAt: -1 });

submissionSchema.pre('validate', async function () {
  if (!this.submissionNumber) {
    const year = (this.capturedAt || new Date()).getUTCFullYear();
    const Model = mongoose.model('InspectionSubmission');
    const count = await Model.countDocuments({ submissionNumber: { $regex: `^INS-${year}-` } });
    this.submissionNumber = `INS-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports =
  mongoose.models.InspectionSubmission || mongoose.model('InspectionSubmission', submissionSchema);
