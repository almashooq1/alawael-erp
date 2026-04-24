'use strict';

/**
 * care-community-service.test.js — Phase 17 Commit 4 (4.0.86).
 *
 * Exercises:
 *   - Partner directory CRUD + deactivate + contact add
 *   - Linkage create → pause → resume → end / cancel
 *   - Linkage reads (beneficiaryLinkages / partnerLinkages)
 */

process.env.NODE_ENV = 'test';

const { createCommunityService } = require('../services/care/community.service');

function makePartnerModel() {
  const docs = [];
  let n = 0;
  function shape(data) {
    const doc = {
      _id: `cp-${++n}`,
      partnerNumber: `CP-TEST-${n}`,
      contacts: [],
      branchesServed: [],
      ...data,
      save: async function () {
        for (const c of this.contacts) {
          if (!c._id) c._id = `ct-${Math.random().toString(36).slice(2, 10)}`;
        }
        return this;
      },
    };
    return doc;
  }
  return {
    docs,
    findById: async id => docs.find(d => d._id === id) || null,
    create: async data => {
      const d = shape(data);
      docs.push(d);
      return d;
    },
    find: filter => {
      let rows = docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (v === null) {
            if (d[k] != null) return false;
            continue;
          }
          if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
            if (v.$in && !v.$in.includes(d[k])) return false;
          } else if (d[k] !== v) return false;
        }
        return true;
      });
      const api = {
        sort: () => api,
        skip: n => {
          rows = rows.slice(n);
          return api;
        },
        limit: n => {
          rows = rows.slice(0, n);
          return api;
        },
        then: (r, rj) => Promise.resolve(rows).then(r, rj),
      };
      return api;
    },
  };
}

function makeLinkageModel() {
  const docs = [];
  let n = 0;
  function shape(data) {
    const doc = {
      _id: `cl-${++n}`,
      linkageNumber: `CL-TEST-${n}`,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      ...data,
      save: async function () {
        return this;
      },
    };
    return doc;
  }
  return {
    docs,
    findById: async id => docs.find(d => d._id === id) || null,
    create: async data => {
      const d = shape(data);
      docs.push(d);
      return d;
    },
    find: filter => {
      let rows = docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (v === null) {
            if (d[k] != null) return false;
            continue;
          }
          if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
            if (v.$in && !v.$in.includes(d[k])) return false;
          } else if (d[k] !== v) return false;
        }
        return true;
      });
      const api = {
        sort: () => api,
        skip: n => {
          rows = rows.slice(n);
          return api;
        },
        limit: n => {
          rows = rows.slice(0, n);
          return api;
        },
        then: (r, rj) => Promise.resolve(rows).then(r, rj),
      };
      return api;
    },
  };
}

function makeDispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

function basePartner() {
  return {
    name: 'مدرسة النور',
    category: 'school',
  };
}

function baseLinkage(partnerId) {
  return {
    beneficiaryId: 'ben-1',
    partnerId,
    linkageType: 'ongoing',
    primaryPurpose: 'education',
    startDate: new Date(),
    caseId: 'case-1',
  };
}

// ── Partner directory ─────────────────────────────────────────────

describe('Community — Partner CRUD', () => {
  it('createPartner persists + emits partner_created', async () => {
    const partnerModel = makePartnerModel();
    const linkageModel = makeLinkageModel();
    const dispatcher = makeDispatcher();
    const svc = createCommunityService({ partnerModel, linkageModel, dispatcher });
    const doc = await svc.createPartner(basePartner());
    expect(doc.name).toBe('مدرسة النور');
    expect(doc.category).toBe('school');
    expect(doc.status).toBe('active');
    expect(dispatcher.events.some(e => e.name === 'ops.care.community.partner_created')).toBe(true);
  });

  it('createPartner missing fields throws MISSING_FIELD', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    await expect(svc.createPartner({ name: 'x' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('createPartner unknown category throws MISSING_FIELD', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    await expect(svc.createPartner({ name: 'x', category: 'bogus' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('updatePartner patches fields but not _id/partnerNumber', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    const p = await svc.createPartner(basePartner());
    const upd = await svc.updatePartner(p._id, {
      name: 'مدرسة الفرقان',
      partnerNumber: 'CP-HACK-001',
    });
    expect(upd.name).toBe('مدرسة الفرقان');
    expect(upd.partnerNumber).toBe(p.partnerNumber);
  });

  it('deactivatePartner sets status=inactive + emits', async () => {
    const partnerModel = makePartnerModel();
    const linkageModel = makeLinkageModel();
    const dispatcher = makeDispatcher();
    const svc = createCommunityService({ partnerModel, linkageModel, dispatcher });
    const p = await svc.createPartner(basePartner());
    const after = await svc.deactivatePartner(p._id);
    expect(after.status).toBe('inactive');
    expect(dispatcher.events.some(e => e.name === 'ops.care.community.partner_deactivated')).toBe(
      true
    );
  });

  it('addPartnerContact appends a contact', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    const p = await svc.createPartner(basePartner());
    const after = await svc.addPartnerContact(p._id, { name: 'أبو محمد', phone: '0555' });
    expect(after.contacts.length).toBe(1);
    expect(after.contacts[0].name).toBe('أبو محمد');
  });

  it('listPartners filters by category', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    await svc.createPartner(basePartner());
    await svc.createPartner({ name: 'مسجد الكوثر', category: 'mosque' });
    const schools = await svc.listPartners({ category: 'school' });
    expect(schools.length).toBe(1);
    expect(schools[0].category).toBe('school');
  });

  it('findPartnerById returns null for missing', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    expect(await svc.findPartnerById('cp-missing')).toBeNull();
  });
});

// ── Linkage lifecycle ──────────────────────────────────────────────

describe('Community — Linkage lifecycle', () => {
  async function seedPartner(svc) {
    return svc.createPartner(basePartner());
  }

  it('createLinkage persists with partnerNameSnapshot + emits', async () => {
    const partnerModel = makePartnerModel();
    const linkageModel = makeLinkageModel();
    const dispatcher = makeDispatcher();
    const svc = createCommunityService({ partnerModel, linkageModel, dispatcher });
    const p = await seedPartner(svc);
    const l = await svc.createLinkage(baseLinkage(p._id));
    expect(l.status).toBe('active');
    expect(l.partnerNameSnapshot).toBe('مدرسة النور');
    expect(dispatcher.events.some(e => e.name === 'ops.care.community.linkage_created')).toBe(true);
  });

  it('createLinkage missing fields throws MISSING_FIELD', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    await expect(svc.createLinkage({ beneficiaryId: 'ben-1' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('createLinkage for unknown partner throws NOT_FOUND', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    await expect(svc.createLinkage(baseLinkage('cp-missing'))).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('createLinkage against inactive partner throws CONFLICT', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    const p = await seedPartner(svc);
    await svc.deactivatePartner(p._id);
    await expect(svc.createLinkage(baseLinkage(p._id))).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('updateLinkage ignores beneficiaryId + partnerId', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    const p = await seedPartner(svc);
    const l = await svc.createLinkage(baseLinkage(p._id));
    const upd = await svc.updateLinkage(l._id, {
      beneficiaryId: 'hacked',
      partnerId: 'hacked',
      outcomeNotes: 'progressing well',
    });
    expect(upd.beneficiaryId).toBe('ben-1');
    expect(upd.partnerId).toBe(p._id);
    expect(upd.outcomeNotes).toBe('progressing well');
  });

  it('pause → resume → contact → end flow works + emits', async () => {
    const partnerModel = makePartnerModel();
    const linkageModel = makeLinkageModel();
    const dispatcher = makeDispatcher();
    const svc = createCommunityService({ partnerModel, linkageModel, dispatcher });
    const p = await seedPartner(svc);
    const l = await svc.createLinkage(baseLinkage(p._id));

    const paused = await svc.pauseLinkage(l._id, { reason: 'summer break' });
    expect(paused.status).toBe('paused');

    const resumed = await svc.resumeLinkage(l._id);
    expect(resumed.status).toBe('active');

    const contacted = await svc.recordContact(l._id, { notes: 'all good' });
    expect(contacted.lastContactAt).toBeTruthy();

    const ended = await svc.endLinkage(l._id, { endedReason: 'graduated' });
    expect(ended.status).toBe('ended');
    expect(ended.endedReason).toBe('graduated');

    const names = dispatcher.events.map(e => e.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'ops.care.community.linkage_paused',
        'ops.care.community.linkage_resumed',
        'ops.care.community.linkage_contact_recorded',
        'ops.care.community.linkage_ended',
      ])
    );
  });

  it('pauseLinkage on ended linkage throws ILLEGAL_TRANSITION', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    const p = await seedPartner(svc);
    const l = await svc.createLinkage(baseLinkage(p._id));
    await svc.endLinkage(l._id, { endedReason: 'done' });
    await expect(svc.pauseLinkage(l._id)).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' });
  });

  it('resumeLinkage on active linkage throws ILLEGAL_TRANSITION', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    const p = await seedPartner(svc);
    const l = await svc.createLinkage(baseLinkage(p._id));
    await expect(svc.resumeLinkage(l._id)).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' });
  });

  it('endLinkage without endedReason throws MISSING_FIELD', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    const p = await seedPartner(svc);
    const l = await svc.createLinkage(baseLinkage(p._id));
    await expect(svc.endLinkage(l._id, {})).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('cancelLinkage is allowed from paused', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    const p = await seedPartner(svc);
    const l = await svc.createLinkage(baseLinkage(p._id));
    await svc.pauseLinkage(l._id);
    const c = await svc.cancelLinkage(l._id, { reason: 'family moved' });
    expect(c.status).toBe('cancelled');
  });

  it('recordContact on paused linkage throws ILLEGAL_TRANSITION', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    const p = await seedPartner(svc);
    const l = await svc.createLinkage(baseLinkage(p._id));
    await svc.pauseLinkage(l._id);
    await expect(svc.recordContact(l._id)).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' });
  });
});

// ── Reads ──────────────────────────────────────────────────────────

describe('Community — Reads', () => {
  it('listLinkages filters by status', async () => {
    const partnerModel = makePartnerModel();
    const linkageModel = makeLinkageModel();
    const svc = createCommunityService({ partnerModel, linkageModel });
    const p = await svc.createPartner(basePartner());
    const l1 = await svc.createLinkage(baseLinkage(p._id));
    await svc.createLinkage({ ...baseLinkage(p._id), beneficiaryId: 'ben-2' });
    await svc.pauseLinkage(l1._id);
    const paused = await svc.listLinkages({ status: 'paused' });
    expect(paused.length).toBe(1);
  });

  it('beneficiaryLinkages excludes ended by default', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    const p = await svc.createPartner(basePartner());
    const l1 = await svc.createLinkage(baseLinkage(p._id));
    const l2 = await svc.createLinkage(baseLinkage(p._id));
    await svc.endLinkage(l1._id, { endedReason: 'done' });
    const active = await svc.beneficiaryLinkages('ben-1');
    expect(active.length).toBe(1);
    expect(active[0]._id).toBe(l2._id);
    const all = await svc.beneficiaryLinkages('ben-1', { includeEnded: true });
    expect(all.length).toBe(2);
  });

  it('partnerLinkages lists active by default', async () => {
    const svc = createCommunityService({
      partnerModel: makePartnerModel(),
      linkageModel: makeLinkageModel(),
    });
    const p = await svc.createPartner(basePartner());
    await svc.createLinkage(baseLinkage(p._id));
    await svc.createLinkage({ ...baseLinkage(p._id), beneficiaryId: 'ben-2' });
    const rows = await svc.partnerLinkages(p._id);
    expect(rows.length).toBe(2);
  });
});
