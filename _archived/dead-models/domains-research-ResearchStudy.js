/**
 * ResearchStudy Model — نموذج الدراسة البحثية السريرية
 *
 * يمثل دراسة بحثية سريرية مع البروتوكول، المشاركين،
 * الموافقات الأخلاقية، جمع البيانات، النتائج
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const researchStudySchema = new Schema(
  {
    // Basic info
    title: { type: String, required: true },
    titleAr: String,
    code: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: [
        'draft',
        'proposal',
        'ethics_review',
        'approved',
        'recruiting',
        'active',
        'data_collection',
        'analysis',
        'completed',
        'published',
        'suspended',
        'terminated',
      ],
      default: 'draft',
      index: true,
    },
    type: {
      type: String,
      enum: [
        'observational',
        'interventional',
        'case_study',
        'cohort',
        'cross_sectional',
        'retrospective',
        'meta_analysis',
        'quality_improvement',
        'pilot',
      ],
      required: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },

    // Principal Investigator & Team
    principalInvestigator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    coInvestigators: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, role: String }],
    researchTeam: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: [
            'coordinator',
            'data_collector',
            'statistician',
            'research_assistant',
            'consultant',
          ],
        },
        responsibilities: [String],
      },
    ],

    // Study design
    design: {
      methodology: String,
      population: String,
      sampleSize: { target: Number, current: { type: Number, default: 0 } },
      inclusionCriteria: [String],
      exclusionCriteria: [String],
      variables: {
        independent: [{ name: String, type: { type: String }, measure: String }],
        dependent: [{ name: String, type: { type: String }, measure: String }],
        confounding: [{ name: String, controlMethod: String }],
      },
      duration: { startDate: Date, endDate: Date, expectedMonths: Number },
      hypotheses: [String],
      objectives: { primary: String, secondary: [String] },
    },

    // Ethics & compliance
    ethics: {
      irbApproval: { type: Boolean, default: false },
      irbNumber: String,
      irbApprovalDate: Date,
      irbExpiryDate: Date,
      ethicsCommittee: String,
      riskLevel: { type: String, enum: ['minimal', 'moderate', 'high'] },
      informedConsentTemplate: String,
      dataPrivacyPlan: String,
      adverseEventReporting: String,
    },

    // Participants
    participants: [
      {
        beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
        participantCode: String,
        enrolledAt: Date,
        withdrawnAt: Date,
        withdrawalReason: String,
        consentStatus: {
          type: String,
          enum: ['pending', 'obtained', 'declined', 'withdrawn'],
          default: 'pending',
        },
        consentDate: Date,
        consentForm: String,
        group: { type: String, enum: ['control', 'experimental', 'group_a', 'group_b', 'group_c'] },
        status: {
          type: String,
          enum: ['screening', 'enrolled', 'active', 'completed', 'withdrawn', 'excluded'],
          default: 'screening',
        },
      },
    ],

    // Data collection
    dataCollection: {
      methods: [
        {
          type: String,
          enum: [
            'survey',
            'interview',
            'observation',
            'clinical_measure',
            'electronic_record',
            'wearable',
            'biomarker',
            'imaging',
          ],
        },
      ],
      tools: [
        { name: String, type: { type: String }, description: String, validationStatus: String },
      ],
      schedule: [
        {
          timepoint: String,
          description: String,
          daysFromBaseline: Number,
          measures: [String],
        },
      ],
      dataPoints: { collected: { type: Number, default: 0 }, expected: Number },
    },

    // Results & publications
    results: {
      summary: String,
      primaryOutcome: String,
      secondaryOutcomes: [String],
      statisticalMethods: String,
      significance: String,
      limitations: [String],
      conclusions: String,
    },
    publications: [
      {
        title: String,
        journal: String,
        doi: String,
        publishedAt: Date,
        authors: [String],
        status: {
          type: String,
          enum: ['draft', 'submitted', 'under_review', 'accepted', 'published', 'rejected'],
        },
      },
    ],

    // Budget
    budget: {
      total: Number,
      currency: { type: String, default: 'SAR' },
      fundingSource: String,
      items: [{ category: String, description: String, amount: Number }],
      spent: { type: Number, default: 0 },
    },

    // Milestones
    milestones: [
      {
        name: String,
        dueDate: Date,
        completedDate: Date,
        status: {
          type: String,
          enum: ['pending', 'on_track', 'delayed', 'completed'],
          default: 'pending',
        },
        notes: String,
      },
    ],

    // Audit trail
    statusHistory: [
      {
        from: String,
        to: String,
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],

    description: String,
    keywords: [String],
    tags: [String],
    attachments: [{ name: String, url: String, type: { type: String } }],
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'research_studies',
  }
);

researchStudySchema.index({ principalInvestigator: 1, status: 1 });
researchStudySchema.index({ 'participants.beneficiaryId': 1 });
researchStudySchema.index({ keywords: 1 });

module.exports =
  mongoose.models.ResearchStudy || mongoose.model('ResearchStudy', researchStudySchema);
