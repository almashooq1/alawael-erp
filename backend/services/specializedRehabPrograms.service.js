'use strict';
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// ── Helper: paginate ──────────────────────────────────────────────────────────
const paginate = async (Model, filter, opts = {}) => {
  const page = Math.max(1, parseInt(opts.page) || 1);
  const limit = Math.min(100, parseInt(opts.limit) || 20);
  const skip = (page - 1) * limit;
  const sort = opts.sort || { createdAt: -1 };
  const [data, total] = await Promise.all([
    Model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);
  return { data, page, limit, total, pages: Math.ceil(total / limit) };
};

// ── Shared field sets ─────────────────────────────────────────────────────────
const base = {
  tenantId: { type: String, required: true, index: true },
  beneficiaryId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sessionDate: { type: Date, default: Date.now },
  therapistId: { type: mongoose.Schema.Types.ObjectId },
  notes: { type: String },
  isDeleted: { type: Boolean, default: false },
};
const ts = { timestamps: true };

// ── 1. CP Intensive ───────────────────────────────────────────────────────────
const CPIntensive =
  mongoose.models.CPIntensive ||
  mongoose.model(
    'CPIntensive',
    new mongoose.Schema(
      {
        ...base,
        gmfmLevel: { type: Number, min: 1, max: 5 },
        gmfm66Score: { type: Number, min: 0, max: 100 },
        viconSessionId: { type: String },
        motionCapData: mongoose.Schema.Types.Mixed,
        goalAreas: [{ area: String, targetScore: Number, currentScore: Number }],
      },
      ts
    )
  );

// ── 2. Stroke Neuroplasticity ─────────────────────────────────────────────────
const StrokeNeuroplasticity =
  mongoose.models.StrokeNeuroplasticity ||
  mongoose.model(
    'StrokeNeuroplasticity',
    new mongoose.Schema(
      {
        ...base,
        mikeProtocol: { constrainedHours: Number, shaping: Boolean, transfer: Boolean },
        vrSessionId: { type: String },
        vrPlatform: { type: String },
        fuglMeyerScore: { type: Number },
        barthelIndex: { type: Number },
        motorRecovery: { type: String, enum: ['early', 'middle', 'late', 'plateau'] },
      },
      ts
    )
  );

// ── 3. SCI Functional ─────────────────────────────────────────────────────────
const SCIFunctional =
  mongoose.models.SCIFunctional ||
  mongoose.model(
    'SCIFunctional',
    new mongoose.Schema(
      {
        ...base,
        asiaGrade: { type: String, enum: ['A', 'B', 'C', 'D', 'E'] },
        injuryLevel: { type: String },
        fesParams: { channels: Number, frequency: Number, pulseWidth: Number },
        lokomatSettings: { bodyWeightSupport: Number, speed: Number, guidance: Number },
        walkingDistance: { type: Number },
      },
      ts
    )
  );

// ── 4. Vision Rehab ───────────────────────────────────────────────────────────
const VisionRehab =
  mongoose.models.VisionRehab ||
  mongoose.model(
    'VisionRehab',
    new mongoose.Schema(
      {
        ...base,
        diagnosis: { type: String },
        visualAcuity: { OD: String, OS: String, OU: String },
        orcamDevice: { model: String, settingsProfile: String },
        vrOrientationId: { type: String },
        lmaScore: { type: Number },
      },
      ts
    )
  );

// ── 5. Hearing + Language ─────────────────────────────────────────────────────
const HearingLanguage =
  mongoose.models.HearingLanguage ||
  mongoose.model(
    'HearingLanguage',
    new mongoose.Schema(
      {
        ...base,
        implantType: { type: String, enum: ['cochlear', 'boneAnchored', 'BAHA', 'hearingAid'] },
        mappingSession: { mapVersion: String, threshold: [Number], comfortLevel: [Number] },
        laceModule: { type: String },
        laceScore: { type: Number },
        speechBanana: mongoose.Schema.Types.Mixed,
      },
      ts
    )
  );

// ── 6. Autism Social ──────────────────────────────────────────────────────────
const AutismSocial =
  mongoose.models.AutismSocial ||
  mongoose.model(
    'AutismSocial',
    new mongoose.Schema(
      {
        ...base,
        robotType: { type: String },
        robotSession: { duration: Number, interactions: Number, successRate: Number },
        abaTargets: [{ skill: String, baseline: Number, current: Number, mastered: Boolean }],
        vinelandScore: { type: Number },
      },
      ts
    )
  );

// ── 7. Down Syndrome Cognitive ────────────────────────────────────────────────
const DownSyndromeCognitive =
  mongoose.models.DownSyndromeCognitive ||
  mongoose.model(
    'DownSyndromeCognitive',
    new mongoose.Schema(
      {
        ...base,
        legoTherapySet: { type: String },
        legoSessionGoals: [String],
        fastForWordModule: { type: String },
        fastForWordScore: { type: Number },
        cognitiveLevel: { type: String, enum: ['mild', 'moderate', 'severe', 'profound'] },
      },
      ts
    )
  );

// ── 8. ADL Independence ───────────────────────────────────────────────────────
const ADLIndependence =
  mongoose.models.ADLIndependence ||
  mongoose.model(
    'ADLIndependence',
    new mongoose.Schema(
      {
        ...base,
        copmPriorities: [{ activity: String, performance: Number, satisfaction: Number }],
        smartHomeDevices: [{ device: String, type: String, status: String }],
        barthelScore: { type: Number },
        fimScore: { type: Number },
      },
      ts
    )
  );

// ── 9. Vocational Skills ──────────────────────────────────────────────────────
const VocationalSkills =
  mongoose.models.VocationalSkills ||
  mongoose.model(
    'VocationalSkills',
    new mongoose.Schema(
      {
        ...base,
        vrJobSimId: { type: String },
        simulatedJob: { type: String },
        aptitudeResults: mongoose.Schema.Types.Mixed,
        employabilityScore: { type: Number },
        barriers: [String],
        accommodations: [String],
      },
      ts
    )
  );

// ── 10. Pain Management ───────────────────────────────────────────────────────
const PainManagement =
  mongoose.models.PainManagement ||
  mongoose.model(
    'PainManagement',
    new mongoose.Schema(
      {
        ...base,
        painLocation: [String],
        vasScore: { type: Number, min: 0, max: 10 },
        gmiPhase: { type: String, enum: ['recognise', 'imagine', 'mirror'] },
        gmiProgress: { type: Number },
        neuromodType: { type: String, enum: ['TENS', 'NMES', 'tDCS', 'rTMS', 'SCS'] },
        neuromodParams: { frequency: Number, intensity: Number, duration: Number },
      },
      ts
    )
  );

// ── 11. Balance / Vestibular ──────────────────────────────────────────────────
const BalanceVestibular =
  mongoose.models.BalanceVestibular ||
  mongoose.model(
    'BalanceVestibular',
    new mongoose.Schema(
      {
        ...base,
        carenScenario: { type: String },
        carenSessionId: { type: String },
        bergScore: { type: Number, min: 0, max: 56 },
        dizzinessScore: { type: Number },
        fallRisk: { type: String, enum: ['low', 'moderate', 'high'] },
        ctsibResults: mongoose.Schema.Types.Mixed,
      },
      ts
    )
  );

// ── 12. Hand Therapy ──────────────────────────────────────────────────────────
const HandTherapy =
  mongoose.models.HandTherapy ||
  mongoose.model(
    'HandTherapy',
    new mongoose.Schema(
      {
        ...base,
        saeboGloveSize: { type: String },
        saeboSessionData: { reps: Number, sets: Number, assistLevel: Number },
        splintDesign: { type: String },
        splintMaterial: { type: String, enum: ['3dPrinted', 'thermoplastic', 'neoprene'] },
        gripStrength: { dominant: Number, nonDominant: Number },
        dashScore: { type: Number },
      },
      ts
    )
  );

// ── 13. Multiple Disabilities (ICF) ──────────────────────────────────────────
const MultipleDisabilities =
  mongoose.models.MultipleDisabilities ||
  mongoose.model(
    'MultipleDisabilities',
    new mongoose.Schema(
      {
        ...base,
        icfProfile: {
          bodyFunctions: [{ code: String, qualifier: Number, note: String }],
          bodyStructures: [{ code: String, qualifier: Number, note: String }],
          activities: [{ code: String, performance: Number, capacity: Number }],
          participation: [{ code: String, performance: Number, capacity: Number }],
          environmentalFactors: [{ code: String, qualifier: Number, facilitator: Boolean }],
          personalFactors: [String],
        },
        teamMembers: [{ discipline: String, therapistId: mongoose.Schema.Types.ObjectId }],
        holisticGoals: [{ goal: String, domain: String, targetDate: Date, status: String }],
      },
      ts
    )
  );

// ── 14. Aging in Place ────────────────────────────────────────────────────────
const AgingInPlace =
  mongoose.models.AgingInPlace ||
  mongoose.model(
    'AgingInPlace',
    new mongoose.Schema(
      {
        ...base,
        fallPreventionPlan: {
          homeModifications: [String],
          assistiveDevices: [String],
          exerciseProgram: String,
        },
        teleSittingStatus: { type: String, enum: ['active', 'inactive', 'alert'] },
        teleSittingAlerts: [{ alertType: String, timestamp: Date, resolved: Boolean }],
        morseScore: { type: Number },
        homeAssessment: mongoose.Schema.Types.Mixed,
      },
      ts
    )
  );

// ── 15. Sports for Disabled ───────────────────────────────────────────────────
const SportsDisabled =
  mongoose.models.SportsDisabled ||
  mongoose.model(
    'SportsDisabled',
    new mongoose.Schema(
      {
        ...base,
        sport: { type: String },
        classificationCode: { type: String },
        paralympicsEvent: { type: String },
        trainingPhase: {
          type: String,
          enum: ['preparation', 'competition', 'transition', 'offseason'],
        },
        performanceMetrics: mongoose.Schema.Types.Mixed,
        injuryRisk: { type: String, enum: ['low', 'moderate', 'high'] },
      },
      ts
    )
  );

// ── Model registry ────────────────────────────────────────────────────────────
const PROGRAM_MODELS = {
  'cp-intensive': CPIntensive,
  'stroke-neuroplasticity': StrokeNeuroplasticity,
  'sci-functional': SCIFunctional,
  'vision-rehab': VisionRehab,
  'hearing-language': HearingLanguage,
  'autism-social': AutismSocial,
  'down-syndrome': DownSyndromeCognitive,
  'adl-independence': ADLIndependence,
  'vocational-skills': VocationalSkills,
  'pain-management': PainManagement,
  'balance-vestibular': BalanceVestibular,
  'hand-therapy': HandTherapy,
  'multiple-disabilities': MultipleDisabilities,
  'aging-in-place': AgingInPlace,
  'sports-disabled': SportsDisabled,
};

// ── Service class ─────────────────────────────────────────────────────────────
class SpecializedRehabProgramsService {
  model(type) {
    const m = PROGRAM_MODELS[type];
    if (!m) throw Object.assign(new Error(`Unknown program type: ${type}`), { status: 400 });
    return m;
  }

  listPrograms() {
    return Object.keys(PROGRAM_MODELS).map(k => ({
      type: k,
      name: k.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      collection: PROGRAM_MODELS[k].collection.name,
    }));
  }

  async create(type, data) {
    return this.model(type).create(data);
  }

  async findOne(type, id, tenantId) {
    const doc = await this.model(type).findOne({ _id: id, tenantId, isDeleted: false }).lean();
    if (!doc) throw Object.assign(new Error('Record not found'), { status: 404 });
    return doc;
  }

  async list(type, tenantId, filters = {}, opts = {}) {
    return paginate(this.model(type), { tenantId, isDeleted: false, ...filters }, opts);
  }

  async update(type, id, tenantId, data) {
    const doc = await this.model(type).findOneAndUpdate(
      { _id: id, tenantId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!doc) throw Object.assign(new Error('Record not found'), { status: 404 });
    return doc;
  }

  async remove(type, id, tenantId) {
    const doc = await this.model(type).findOneAndUpdate(
      { _id: id, tenantId, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!doc) throw Object.assign(new Error('Record not found'), { status: 404 });
    return { success: true };
  }

  async summary(tenantId, beneficiaryId) {
    const out = {};
    for (const [k, M] of Object.entries(PROGRAM_MODELS)) {
      const count = await M.countDocuments({ tenantId, beneficiaryId, isDeleted: false });
      if (count) {
        const latest = await M.findOne({ tenantId, beneficiaryId, isDeleted: false })
          .sort({ createdAt: -1 })
          .lean();
        out[k] = { count, latest };
      }
    }
    return out;
  }
}

const svc = new SpecializedRehabProgramsService();

// ── Error helper ──────────────────────────────────────────────────────────────
const handle = (res, err) => {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message });
};

// ── Router ────────────────────────────────────────────────────────────────────
router.use(authenticateToken);

// GET /programs — list all 15 program types
router.get('/programs', (_req, res) => {
  res.json({ success: true, data: svc.listPrograms() });
});

// GET /beneficiary/:beneficiaryId/summary — cross-program summary
router.get('/beneficiary/:beneficiaryId/summary', async (req, res) => {
  try {
    const data = await svc.summary(req.user.tenantId, req.params.beneficiaryId);
    res.json({ success: true, beneficiaryId: req.params.beneficiaryId, data });
  } catch (err) {
    handle(res, err);
  }
});

// GET /:programType — list records (paginated)
router.get('/:programType', async (req, res) => {
  try {
    const { beneficiaryId, page, limit, sort } = req.query;
    const filters = beneficiaryId ? { beneficiaryId } : {};
    const result = await svc.list(req.params.programType, req.user.tenantId, filters, {
      page,
      limit,
      sort,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    handle(res, err);
  }
});

// POST /:programType — create record
router.post('/:programType', async (req, res) => {
  try {
    const { tenantId, userId } = req.user;
    const doc = await svc.create(req.params.programType, {
      ...req.body,
      tenantId,
      therapistId: req.body.therapistId || userId,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    handle(res, err);
  }
});

// GET /:programType/:id — get one
router.get('/:programType/:id', async (req, res) => {
  try {
    const doc = await svc.findOne(req.params.programType, req.params.id, req.user.tenantId);
    res.json({ success: true, data: doc });
  } catch (err) {
    handle(res, err);
  }
});

// PUT /:programType/:id — update
router.put('/:programType/:id', async (req, res) => {
  try {
    const doc = await svc.update(
      req.params.programType,
      req.params.id,
      req.user.tenantId,
      req.body
    );
    res.json({ success: true, data: doc });
  } catch (err) {
    handle(res, err);
  }
});

// DELETE /:programType/:id — soft-delete
router.delete('/:programType/:id', async (req, res) => {
  try {
    const result = await svc.remove(req.params.programType, req.params.id, req.user.tenantId);
    res.json({ success: true, ...result });
  } catch (err) {
    handle(res, err);
  }
});

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  SpecializedRehabProgramsService,
  service: svc,
  router,
  PROGRAM_MODELS,
  CPIntensive,
  StrokeNeuroplasticity,
  SCIFunctional,
  VisionRehab,
  HearingLanguage,
  AutismSocial,
  DownSyndromeCognitive,
  ADLIndependence,
  VocationalSkills,
  PainManagement,
  BalanceVestibular,
  HandTherapy,
  MultipleDisabilities,
  AgingInPlace,
  SportsDisabled,
};
