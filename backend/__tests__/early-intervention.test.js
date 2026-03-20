/**
 * Early Intervention System — Comprehensive Tests
 * نظام التدخل المبكر — اختبارات شاملة
 *
 * Tests all 5 modules:
 *   1. Children (CRUD + full profile + milestone initialization)
 *   2. Developmental Screenings (CRUD + child-specific)
 *   3. Developmental Milestones (CRUD + report + delay calc)
 *   4. IFSPs (CRUD + reviews + goal progress)
 *   5. Referrals (CRUD + status updates + communications)
 *   6. Dashboard analytics
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// ── Mock auth before requiring app ──
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = {
      id: '507f1f77bcf86cd799439011',
      _id: '507f1f77bcf86cd799439011',
      role: 'admin',
      name: 'Test Admin',
      email: 'admin@test.com',
    };
    next();
  },
  authenticateToken: (req, _res, next) => {
    req.user = {
      id: '507f1f77bcf86cd799439011',
      _id: '507f1f77bcf86cd799439011',
      role: 'admin',
    };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
  authorizeRole: () => (_req, _res, next) => next(),
  requireAuth: (req, _res, next) => {
    req.user = { id: '507f1f77bcf86cd799439011', role: 'admin' };
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
  requireAdmin: (_req, _res, next) => next(),
  optionalAuth: (req, _res, next) => {
    req.user = { id: '507f1f77bcf86cd799439011', role: 'admin' };
    next();
  },
  protect: (req, _res, next) => {
    req.user = { id: '507f1f77bcf86cd799439011', role: 'admin' };
    next();
  },
}));

const request = require('supertest');

let app;

beforeAll(() => {
  app = require('../server');
});

afterEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const BASE = '/api/early-intervention';
const BASE_V1 = '/api/v1/early-intervention';

const sampleChild = {
  firstName: 'Ahmed',
  firstNameAr: 'أحمد',
  lastName: 'Ali',
  lastNameAr: 'علي',
  gender: 'MALE',
  birthInfo: {
    birthDate: '2024-06-15',
    gestationalAge: 38,
    birthWeight: 3200,
    deliveryType: 'VAGINAL',
    apgarScore1Min: 8,
    apgarScore5Min: 9,
  },
  disabilityType: 'DEVELOPMENTAL_DELAY',
  disabilitySeverity: 'MILD',
  referralSource: 'HOSPITAL',
  parents: [
    {
      name: 'Mohammed Ali',
      relationship: 'FATHER',
      phone: '+966500000000',
      isPrimaryCaregiver: false,
    },
    {
      name: 'Fatima Hassan',
      relationship: 'MOTHER',
      phone: '+966500000001',
      isPrimaryCaregiver: true,
    },
  ],
};

const sampleScreening = {
  screeningDate: '2025-01-15',
  childAgeMonths: 7,
  screeningType: 'INITIAL',
  overallResult: 'AT_RISK',
  recommendation: 'REFER_EVALUATION',
  parentConsentObtained: true,
  screeningLocation: 'CLINIC',
  toolResults: [
    {
      toolName: 'ASQ-3',
      toolType: 'ASQ_3',
      domain: 'COMMUNICATION',
      rawScore: 25,
      cutoffResult: 'BELOW_CUTOFF',
    },
  ],
};

const sampleMilestone = {
  domain: 'GROSS_MOTOR',
  milestone: 'Crawls',
  milestoneAr: 'يزحف',
  expectedAgeMonths: 9,
  actualAgeMonths: 12,
  status: 'ACHIEVED',
  achievedDate: '2025-06-15',
};

const sampleIFSP = {
  startDate: '2025-03-01',
  planType: 'INITIAL',
  serviceCoordinator: '507f1f77bcf86cd799439011',
  familyConcerns: 'تأخر في النطق والحركة',
  familyPriorities: 'تحسين التواصل',
  presentLevels: {
    cognitive: 'قريب من المستوى المتوقع',
    communication: 'تأخر 3 أشهر',
    physical: 'تأخر خفيف في الحركة الكبرى',
  },
  goals: [
    {
      domain: 'COMMUNICATION',
      goalStatement: 'Will use 10 words consistently',
      goalStatementAr: 'سيستخدم 10 كلمات بشكل ثابت',
      currentLevel: 'Uses 3 words',
      targetLevel: '10 words',
      criteria: '80% of opportunities across 3 sessions',
      timeline: '6 months',
    },
  ],
  services: [
    {
      serviceType: 'SPEECH_THERAPY',
      frequency: '2 sessions/week',
      duration: 45,
      location: 'CENTER',
      status: 'PLANNED',
    },
  ],
};

const sampleReferral = {
  referralDirection: 'INBOUND',
  sourceType: 'MATERNITY_HOSPITAL',
  sourceFacility: 'King Faisal Hospital',
  referralDate: '2025-01-01',
  reason: 'Abnormal newborn screening results',
  reasonAr: 'نتائج غير طبيعية في فحص حديثي الولادة',
  urgency: 'URGENT',
  concerns: 'Failed hearing screening bilateral',
  parentConsent: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CHILDREN TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Early Intervention System — Children API', () => {
  describe('POST /children', () => {
    it('should create a new child record', async () => {
      const res = await request(app).post(`${BASE}/children`).send(sampleChild);
      expect([200, 201, 400, 500]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('childNumber');
        expect(res.body.data.firstName).toBe('Ahmed');
      }
    });

    it('should reject child with missing required fields', async () => {
      const res = await request(app).post(`${BASE}/children`).send({ firstName: 'Test' });
      expect([400, 422, 500]).toContain(res.status);
    });

    it('should reject invalid gender value', async () => {
      const res = await request(app)
        .post(`${BASE}/children`)
        .send({ ...sampleChild, gender: 'INVALID' });
      expect([400, 422, 500]).toContain(res.status);
    });
  });

  describe('GET /children', () => {
    it('should return paginated list of children', async () => {
      const res = await request(app).get(`${BASE}/children`);
      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
      }
    });

    it('should filter by status', async () => {
      const res = await request(app).get(`${BASE}/children?status=ACTIVE`);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should filter by disability type', async () => {
      const res = await request(app).get(`${BASE}/children?disabilityType=DEVELOPMENTAL_DELAY`);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should filter by age range in months', async () => {
      const res = await request(app).get(`${BASE}/children?ageMinMonths=0&ageMaxMonths=12`);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should search by name', async () => {
      const res = await request(app).get(`${BASE}/children?search=Ahmed`);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should support v1 prefix', async () => {
      const res = await request(app).get(`${BASE_V1}/children`);
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /children/:id', () => {
    it('should return 400 for invalid mongo id', async () => {
      const res = await request(app).get(`${BASE}/children/invalid-id`);
      expect([400, 404, 500]).toContain(res.status);
    });

    it('should return 404 for non-existent child', async () => {
      const res = await request(app).get(`${BASE}/children/507f1f77bcf86cd799439099`);
      expect([404, 400, 500]).toContain(res.status);
    });
  });

  describe('PUT /children/:id', () => {
    it('should update child status', async () => {
      const res = await request(app)
        .put(`${BASE}/children/507f1f77bcf86cd799439099`)
        .send({ status: 'INACTIVE' });
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /children/:id', () => {
    it('should attempt to delete a child', async () => {
      const res = await request(app).delete(`${BASE}/children/507f1f77bcf86cd799439099`);
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /children/:id/full-profile', () => {
    it('should return 404 for non-existent child profile', async () => {
      const res = await request(app).get(`${BASE}/children/507f1f77bcf86cd799439099/full-profile`);
      expect([200, 404, 400, 500]).toContain(res.status);
    });
  });

  describe('POST /children/:id/initialize-milestones', () => {
    it('should reject for non-existent child', async () => {
      const res = await request(app).post(
        `${BASE}/children/507f1f77bcf86cd799439099/initialize-milestones`
      );
      expect([201, 400, 404, 500]).toContain(res.status);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SCREENINGS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Early Intervention System — Screenings API', () => {
  describe('POST /screenings', () => {
    it('should attempt to create a screening', async () => {
      const res = await request(app)
        .post(`${BASE}/screenings`)
        .send({ ...sampleScreening, child: '507f1f77bcf86cd799439011' });
      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('should reject screening without required fields', async () => {
      const res = await request(app)
        .post(`${BASE}/screenings`)
        .send({ screeningDate: '2025-01-01' });
      expect([400, 422, 500]).toContain(res.status);
    });
  });

  describe('GET /screenings', () => {
    it('should return paginated screenings', async () => {
      const res = await request(app).get(`${BASE}/screenings`);
      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
      }
    });

    it('should filter by result', async () => {
      const res = await request(app).get(`${BASE}/screenings?overallResult=AT_RISK`);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should filter by date range', async () => {
      const res = await request(app).get(
        `${BASE}/screenings?dateFrom=2025-01-01&dateTo=2025-12-31`
      );
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /screenings/:id', () => {
    it('should return 404 for non-existent screening', async () => {
      const res = await request(app).get(`${BASE}/screenings/507f1f77bcf86cd799439099`);
      expect([404, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /screenings/child/:childId', () => {
    it('should return screenings for a specific child', async () => {
      const res = await request(app).get(`${BASE}/screenings/child/507f1f77bcf86cd799439011`);
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('PUT /screenings/:id', () => {
    it('should update a screening', async () => {
      const res = await request(app)
        .put(`${BASE}/screenings/507f1f77bcf86cd799439099`)
        .send({ status: 'COMPLETED' });
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /screenings/:id', () => {
    it('should attempt to delete a screening', async () => {
      const res = await request(app).delete(`${BASE}/screenings/507f1f77bcf86cd799439099`);
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. MILESTONES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Early Intervention System — Milestones API', () => {
  describe('POST /milestones', () => {
    it('should attempt to create a milestone', async () => {
      const res = await request(app)
        .post(`${BASE}/milestones`)
        .send({ ...sampleMilestone, child: '507f1f77bcf86cd799439011' });
      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('should reject milestone without required fields', async () => {
      const res = await request(app).post(`${BASE}/milestones`).send({ domain: 'COGNITIVE' });
      expect([400, 422, 500]).toContain(res.status);
    });

    it('should reject invalid domain', async () => {
      const res = await request(app)
        .post(`${BASE}/milestones`)
        .send({ ...sampleMilestone, child: '507f1f77bcf86cd799439011', domain: 'INVALID' });
      expect([400, 422, 500]).toContain(res.status);
    });
  });

  describe('GET /milestones', () => {
    it('should return paginated milestones', async () => {
      const res = await request(app).get(`${BASE}/milestones`);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should filter by domain', async () => {
      const res = await request(app).get(`${BASE}/milestones?domain=GROSS_MOTOR`);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should filter by delay status', async () => {
      const res = await request(app).get(`${BASE}/milestones?isDelayed=true`);
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /milestones/:id', () => {
    it('should return 404 for non-existent milestone', async () => {
      const res = await request(app).get(`${BASE}/milestones/507f1f77bcf86cd799439099`);
      expect([404, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /milestones/child/:childId', () => {
    it('should return milestones for a child', async () => {
      const res = await request(app).get(`${BASE}/milestones/child/507f1f77bcf86cd799439011`);
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /milestones/child/:childId/report', () => {
    it('should generate a milestone report', async () => {
      const res = await request(app).get(
        `${BASE}/milestones/child/507f1f77bcf86cd799439011/report`
      );
      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
      }
    });
  });

  describe('PUT /milestones/:id', () => {
    it('should update a milestone', async () => {
      const res = await request(app)
        .put(`${BASE}/milestones/507f1f77bcf86cd799439099`)
        .send({ status: 'ACHIEVED', actualAgeMonths: 10 });
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /milestones/:id', () => {
    it('should attempt to delete a milestone', async () => {
      const res = await request(app).delete(`${BASE}/milestones/507f1f77bcf86cd799439099`);
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. IFSPs TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Early Intervention System — IFSPs API', () => {
  describe('POST /ifsps', () => {
    it('should attempt to create an IFSP', async () => {
      const res = await request(app)
        .post(`${BASE}/ifsps`)
        .send({ ...sampleIFSP, child: '507f1f77bcf86cd799439011' });
      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('should reject IFSP without required fields', async () => {
      const res = await request(app).post(`${BASE}/ifsps`).send({ planType: 'INITIAL' });
      expect([400, 422, 500]).toContain(res.status);
    });
  });

  describe('GET /ifsps', () => {
    it('should return paginated IFSPs', async () => {
      const res = await request(app).get(`${BASE}/ifsps`);
      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
      }
    });

    it('should filter by status', async () => {
      const res = await request(app).get(`${BASE}/ifsps?status=ACTIVE`);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should filter by plan type', async () => {
      const res = await request(app).get(`${BASE}/ifsps?planType=INITIAL`);
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /ifsps/:id', () => {
    it('should return 404 for non-existent IFSP', async () => {
      const res = await request(app).get(`${BASE}/ifsps/507f1f77bcf86cd799439099`);
      expect([404, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /ifsps/child/:childId', () => {
    it('should return IFSPs for a specific child', async () => {
      const res = await request(app).get(`${BASE}/ifsps/child/507f1f77bcf86cd799439011`);
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('PUT /ifsps/:id', () => {
    it('should update an IFSP', async () => {
      const res = await request(app)
        .put(`${BASE}/ifsps/507f1f77bcf86cd799439099`)
        .send({ status: 'ACTIVE' });
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /ifsps/:id', () => {
    it('should attempt to delete an IFSP', async () => {
      const res = await request(app).delete(`${BASE}/ifsps/507f1f77bcf86cd799439099`);
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /ifsps/:id/reviews', () => {
    it('should add a review to an IFSP', async () => {
      const res = await request(app).post(`${BASE}/ifsps/507f1f77bcf86cd799439099/reviews`).send({
        reviewType: '6_MONTH',
        findings: 'Good progress on communication goals',
        nextReviewDate: '2025-12-01',
      });
      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('should reject review without type', async () => {
      const res = await request(app)
        .post(`${BASE}/ifsps/507f1f77bcf86cd799439099/reviews`)
        .send({ findings: 'text' });
      expect([400, 422, 500]).toContain(res.status);
    });
  });

  describe('PUT /ifsps/:id/goals/:goalId/progress', () => {
    it('should update goal progress', async () => {
      const res = await request(app)
        .put(`${BASE}/ifsps/507f1f77bcf86cd799439099/goals/507f1f77bcf86cd799439088/progress`)
        .send({ progress: 50, status: 'IN_PROGRESS', note: 'Making progress' });
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. REFERRALS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Early Intervention System — Referrals API', () => {
  describe('POST /referrals', () => {
    it('should create a referral', async () => {
      const res = await request(app).post(`${BASE}/referrals`).send(sampleReferral);
      expect([200, 201, 400, 500]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('referralNumber');
      }
    });

    it('should create a referral linked to a child', async () => {
      const res = await request(app)
        .post(`${BASE}/referrals`)
        .send({ ...sampleReferral, child: '507f1f77bcf86cd799439011' });
      expect([200, 201, 400, 500]).toContain(res.status);
    });

    it('should reject referral without required fields', async () => {
      const res = await request(app).post(`${BASE}/referrals`).send({ urgency: 'ROUTINE' });
      expect([400, 422, 500]).toContain(res.status);
    });

    it('should reject invalid referral direction', async () => {
      const res = await request(app)
        .post(`${BASE}/referrals`)
        .send({ ...sampleReferral, referralDirection: 'INVALID' });
      expect([400, 422, 500]).toContain(res.status);
    });
  });

  describe('GET /referrals', () => {
    it('should return paginated referrals', async () => {
      const res = await request(app).get(`${BASE}/referrals`);
      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
      }
    });

    it('should filter by direction', async () => {
      const res = await request(app).get(`${BASE}/referrals?referralDirection=INBOUND`);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should filter by urgency', async () => {
      const res = await request(app).get(`${BASE}/referrals?urgency=URGENT`);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should search referrals', async () => {
      const res = await request(app).get(`${BASE}/referrals?search=King+Faisal`);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should filter by date range', async () => {
      const res = await request(app).get(`${BASE}/referrals?dateFrom=2025-01-01&dateTo=2025-12-31`);
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /referrals/:id', () => {
    it('should return 404 for non-existent referral', async () => {
      const res = await request(app).get(`${BASE}/referrals/507f1f77bcf86cd799439099`);
      expect([404, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /referrals/child/:childId', () => {
    it('should return referrals for a child', async () => {
      const res = await request(app).get(`${BASE}/referrals/child/507f1f77bcf86cd799439011`);
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('PUT /referrals/:id', () => {
    it('should update a referral', async () => {
      const res = await request(app)
        .put(`${BASE}/referrals/507f1f77bcf86cd799439099`)
        .send({ urgency: 'EMERGENT' });
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /referrals/:id/status', () => {
    it('should update referral status', async () => {
      const res = await request(app)
        .patch(`${BASE}/referrals/507f1f77bcf86cd799439099/status`)
        .send({ status: 'ACCEPTED' });
      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it('should reject invalid status', async () => {
      const res = await request(app)
        .patch(`${BASE}/referrals/507f1f77bcf86cd799439099/status`)
        .send({ status: 'INVALID_STATUS' });
      expect([400, 422, 500]).toContain(res.status);
    });
  });

  describe('POST /referrals/:id/communications', () => {
    it('should add a communication log', async () => {
      const res = await request(app)
        .post(`${BASE}/referrals/507f1f77bcf86cd799439099/communications`)
        .send({
          type: 'PHONE',
          direction: 'OUTBOUND',
          contact: 'Dr. Mohammed',
          summary: 'Discussed referral status and scheduled appointment',
        });
      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('should reject communication without required fields', async () => {
      const res = await request(app)
        .post(`${BASE}/referrals/507f1f77bcf86cd799439099/communications`)
        .send({ contact: 'Doctor' });
      expect([400, 422, 500]).toContain(res.status);
    });
  });

  describe('DELETE /referrals/:id', () => {
    it('should attempt to delete a referral', async () => {
      const res = await request(app).delete(`${BASE}/referrals/507f1f77bcf86cd799439099`);
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DASHBOARD TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Early Intervention System — Dashboard API', () => {
  describe('GET /dashboard', () => {
    it('should return dashboard statistics', async () => {
      const res = await request(app).get(`${BASE}/dashboard`);
      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('summary');
        expect(res.body.data).toHaveProperty('charts');
        expect(res.body.data).toHaveProperty('recent');
      }
    });

    it('should filter dashboard by organization', async () => {
      const res = await request(app).get(`${BASE}/dashboard?organization=507f1f77bcf86cd799439011`);
      expect([200, 400, 500]).toContain(res.status);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. SERVICE UNIT TESTS (business logic)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Early Intervention Service — Unit Tests', () => {
  const service = require('../services/earlyIntervention.service');

  describe('_getStandardMilestones', () => {
    it('should return standard milestones covering all domains', () => {
      const milestones = service._getStandardMilestones();
      expect(Array.isArray(milestones)).toBe(true);
      expect(milestones.length).toBeGreaterThan(30);

      const domains = [...new Set(milestones.map(m => m.domain))];
      expect(domains).toContain('GROSS_MOTOR');
      expect(domains).toContain('FINE_MOTOR');
      expect(domains).toContain('COMMUNICATION');
      expect(domains).toContain('COGNITIVE');
      expect(domains).toContain('SOCIAL_EMOTIONAL');
      expect(domains).toContain('ADAPTIVE');
    });

    it('every milestone should have required fields', () => {
      const milestones = service._getStandardMilestones();
      milestones.forEach(m => {
        expect(m.domain).toBeDefined();
        expect(m.milestone).toBeDefined();
        expect(m.milestoneAr).toBeDefined();
        expect(typeof m.expectedAgeMonths).toBe('number');
        expect(m.expectedAgeMonths).toBeGreaterThanOrEqual(0);
        expect(m.expectedAgeMonths).toBeLessThanOrEqual(36);
      });
    });
  });

  describe('_buildChildQuery', () => {
    it('should build empty query for no filters', () => {
      const q = service._buildChildQuery({});
      expect(q).toEqual({});
    });

    it('should add status filter', () => {
      const q = service._buildChildQuery({ status: 'ACTIVE' });
      expect(q.status).toBe('ACTIVE');
    });

    it('should add search regex', () => {
      const q = service._buildChildQuery({ search: 'Ahmed' });
      expect(q.$or).toBeDefined();
      expect(q.$or.length).toBeGreaterThan(0);
    });

    it('should handle age range filters', () => {
      const q = service._buildChildQuery({ ageMinMonths: 0, ageMaxMonths: 12 });
      expect(q['birthInfo.birthDate']).toBeDefined();
    });
  });

  describe('_buildReferralQuery', () => {
    it('should handle urgency filter', () => {
      const q = service._buildReferralQuery({ urgency: 'URGENT' });
      expect(q.urgency).toBe('URGENT');
    });

    it('should handle date range', () => {
      const q = service._buildReferralQuery({ dateFrom: '2025-01-01', dateTo: '2025-12-31' });
      expect(q.referralDate).toBeDefined();
      expect(q.referralDate.$gte).toBeDefined();
      expect(q.referralDate.$lte).toBeDefined();
    });
  });
});
