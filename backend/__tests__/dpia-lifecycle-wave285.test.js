/**
 * dpia-lifecycle-wave285.test.js — DPIA state machine + MFA-2 sign + wiring.
 *
 * Covers:
 *   (1) state-machine transitions allowed/rejected
 *   (2) sign() requires MFA tier 2 when factory built with enforceMfa:true
 *   (3) isFeatureApproved() returns false until signed + non-expired
 *   (4) bootstrap wires app._dpiaService with enforceMfa:true
 *   (5) routes are mounted at /api/dpia + /api/v1/dpia
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

describe('W285 — DPIA lifecycle + MFA-2 sign + wiring', () => {
  describe('state machine', () => {
    const dpiaServiceFactory = require('../services/dpia.service');
    const { TRANSITIONS } = dpiaServiceFactory;

    it('TRANSITIONS table is well-formed', () => {
      expect(TRANSITIONS.draft).toEqual(['in_review']);
      expect(TRANSITIONS.in_review).toEqual(expect.arrayContaining(['approved', 'rejected']));
      expect(TRANSITIONS.approved).toEqual(['expired']);
      expect(TRANSITIONS.rejected).toEqual([]); // terminal
      expect(TRANSITIONS.expired).toEqual(['in_review']);
    });

    it('exports the model + enum constants', () => {
      const DpiaMod = require('../models/Dpia');
      expect(typeof DpiaMod).toBe('function'); // Mongoose Model is a constructor
      expect(DpiaMod.DPIA_STATUSES).toEqual(expect.arrayContaining(['draft', 'approved']));
      expect(DpiaMod.DPIA_DATA_CATEGORIES).toEqual(expect.arrayContaining(['health', 'biometric']));
      expect(DpiaMod.DPIA_LAWFUL_BASES).toEqual(expect.arrayContaining(['consent']));
    });
  });

  describe('service: create + addRisk + transition + sign (with mocked model)', () => {
    let svc, fakeStore;

    beforeEach(() => {
      fakeStore = new Map();
      let nextId = 1;
      const FakeDpia = {
        async create(payload) {
          const id = `dpia-${nextId++}`;
          const doc = {
            _id: id,
            ...payload,
            risks: payload.risks || [],
            status: payload.status || 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
            async save() {
              this.updatedAt = new Date();
              fakeStore.set(this._id, this);
              return this;
            },
          };
          fakeStore.set(id, doc);
          return doc;
        },
        findById(id) {
          // Return a thenable matching mongoose chain
          return Promise.resolve(fakeStore.get(id) || null);
        },
        findOne(query) {
          // Used by isFeatureApproved — minimal impl
          const sortFn = () =>
            Promise.resolve(
              [...fakeStore.values()].find(
                d =>
                  (!query.featureFlag || d.featureFlag === query.featureFlag) &&
                  (!query.featureName || d.featureName === query.featureName) &&
                  (!query.status || d.status === query.status) &&
                  (!query.signedAt || d.signedAt)
              ) || null
            );
          return { sort: () => sortFn() };
        },
        find() {
          return {
            sort: () => ({
              limit: () => ({
                lean: () => Promise.resolve([...fakeStore.values()]),
              }),
            }),
          };
        },
      };
      const dpiaServiceFactory = require('../services/dpia.service');
      svc = dpiaServiceFactory({ DpiaModel: FakeDpia, enforceMfa: true });
    });

    it('create → status=draft, version=1 default', async () => {
      const dpia = await svc.create(
        {
          featureName: 'face-recognition-attendance',
          dataCategories: ['biometric', 'identity'],
          lawfulBasis: 'consent',
          dataSubjects: 'employees',
          processingPurpose: 'attendance verification via facial recognition',
        },
        { userId: 'user-1' }
      );
      expect(dpia.status).toBe('draft');
      expect(dpia.version).toBe(1);
      expect(dpia.authoredBy).toBe('user-1');
    });

    it('transition draft → in_review → approved works; signing requires MFA tier 2', async () => {
      const dpia = await svc.create(
        {
          featureName: 'parent-chatbot',
          dataCategories: ['communication'],
          lawfulBasis: 'consent',
          dataSubjects: 'guardians',
          processingPurpose: 'AI-driven Q&A assistance',
        },
        { userId: 'user-1' }
      );

      await svc.transition(dpia._id, 'in_review', {}, { userId: 'user-2' });
      await svc.transition(dpia._id, 'approved', {}, { userId: 'user-2' });

      // Sign without MFA tier 2 → reject
      await expect(svc.sign(dpia._id, { userId: 'user-3', mfaTier: 1 })).rejects.toMatchObject({
        code: 'DPIA_MFA_INSUFFICIENT',
      });

      // Sign with MFA tier 2 → success
      const signed = await svc.sign(dpia._id, { userId: 'user-3', mfaTier: 2 });
      expect(signed.signedBy).toBe('user-3');
      expect(signed.signedAt).toBeInstanceOf(Date);
    });

    it('transition rejects invalid hops (draft → approved)', async () => {
      const dpia = await svc.create(
        {
          featureName: 'gait-analysis',
          dataCategories: ['biometric', 'health'],
          lawfulBasis: 'consent',
          dataSubjects: 'beneficiaries',
          processingPurpose: 'PT motion analysis',
        },
        { userId: 'user-1' }
      );
      await expect(
        svc.transition(dpia._id, 'approved', {}, { userId: 'user-2' })
      ).rejects.toMatchObject({ code: 'DPIA_INVALID_TRANSITION' });
    });

    it('reject requires rejectionReason', async () => {
      const dpia = await svc.create(
        {
          featureName: 'feature-x',
          dataCategories: ['health'],
          lawfulBasis: 'consent',
          dataSubjects: 'beneficiaries',
          processingPurpose: 'experimental',
        },
        { userId: 'u1' }
      );
      await svc.transition(dpia._id, 'in_review', {}, { userId: 'u2' });
      await expect(
        svc.transition(dpia._id, 'rejected', {}, { userId: 'u2' })
      ).rejects.toMatchObject({ code: 'DPIA_REJECTION_REASON_REQUIRED' });
    });

    it('isFeatureApproved returns false for unsigned DPIA', async () => {
      const dpia = await svc.create(
        {
          featureName: 'unsigned-feature',
          dataCategories: ['identity'],
          lawfulBasis: 'consent',
          dataSubjects: 'employees',
          processingPurpose: 'test',
        },
        { userId: 'u1' }
      );
      await svc.transition(dpia._id, 'in_review', {}, { userId: 'u2' });
      await svc.transition(dpia._id, 'approved', {}, { userId: 'u2' });

      // Approved but not signed
      const result = await svc.isFeatureApproved('unsigned-feature');
      expect(result.approved).toBe(false);
      expect(result.reason).toBe('NO_SIGNED_DPIA');
    });
  });

  describe('bootstrap wiring', () => {
    const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    const BOOTSTRAP = fs.readFileSync(
      path.join(__dirname, '..', 'startup', 'dpiaBootstrap.js'),
      'utf8'
    );

    it('app.js calls wireDpia', () => {
      expect(APP_JS).toMatch(/require\(['"]\.\/startup\/dpiaBootstrap['"]\)\.wireDpia\(/);
    });

    it('bootstrap constructs dpiaService with enforceMfa:true', () => {
      expect(BOOTSTRAP).toMatch(/dpiaServiceFactory\(\{[^}]*enforceMfa:\s*true/);
    });

    it('bootstrap mounts at both /api/dpia and /api/v1/dpia', () => {
      expect(BOOTSTRAP).toMatch(/['"]\/api\/dpia['"]/);
      expect(BOOTSTRAP).toMatch(/['"]\/api\/v1\/dpia['"]/);
    });
  });

  describe('routes file', () => {
    const ROUTES = fs.readFileSync(path.join(__dirname, '..', 'routes', 'dpia.routes.js'), 'utf8');

    it('sign endpoint uses requireMfaTier(2)', () => {
      expect(ROUTES).toMatch(/router\.post\(['"]\/:id\/sign['"]\s*,\s*requireMfaTier\(2\)/);
    });

    it('uses attachMfaActor on all routes', () => {
      expect(ROUTES).toMatch(/router\.use\(attachMfaActor\)/);
    });
  });
});
