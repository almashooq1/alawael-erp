/**
 * Unit Tests — NphiesService
 * Saudi National Health Insurance Exchange (NPHIES) — HL7 FHIR R4
 *
 * Tests: module exports, REHAB_CPT_CODES, buildBundle, getRehabCptCodes,
 * getCptDescription, getStatus, _buildPatient, _parseEligibilityResponse,
 * _parsePreAuthResponse, _parseClaimResponse, _parsePaymentReconciliation,
 * checkEligibility, requestPriorAuthorization, submitClaim,
 * inquireClaimStatus, cancelClaim, respondToCommunication, reconcilePayment
 */
'use strict';

// ─── Mocks ─────────────────────────────────────────────────────────────────
jest.mock('axios', () => {
  const mockCreate = jest.fn(() => ({ post: jest.fn(), get: jest.fn() }));
  return { create: mockCreate, post: jest.fn(), get: jest.fn() };
});
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid-1234') }));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ─── Imports ───────────────────────────────────────────────────────────────
const service = require('../../services/nphies.service');
const { NphiesService, REHAB_CPT_CODES } = require('../../services/nphies.service');
const logger = require('../../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════
// 1. Module Exports
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — Module exports', () => {
  it('default export is an object (singleton instance)', () => {
    expect(service).toBeDefined();
    expect(typeof service).toBe('object');
  });

  it('default export is an instance of NphiesService', () => {
    expect(service).toBeInstanceOf(NphiesService);
  });

  it('NphiesService is a constructor function', () => {
    expect(typeof NphiesService).toBe('function');
    expect(new NphiesService()).toBeInstanceOf(NphiesService);
  });

  it('REHAB_CPT_CODES is an object with 18 keys', () => {
    expect(typeof REHAB_CPT_CODES).toBe('object');
    expect(Object.keys(REHAB_CPT_CODES)).toHaveLength(18);
  });

  it('singleton has expected public methods', () => {
    const methods = [
      'buildBundle',
      'getRehabCptCodes',
      'getCptDescription',
      'getStatus',
      'checkEligibility',
      'requestPriorAuthorization',
      'submitClaim',
      'inquireClaimStatus',
      'cancelClaim',
      'respondToCommunication',
      'reconcilePayment',
    ];
    for (const m of methods) {
      expect(typeof service[m]).toBe('function');
    }
  });

  it('singleton has private helper methods', () => {
    expect(typeof service._buildPatient).toBe('function');
    expect(typeof service._sendToNphies).toBe('function');
    expect(typeof service._parseEligibilityResponse).toBe('function');
    expect(typeof service._parsePreAuthResponse).toBe('function');
    expect(typeof service._parseClaimResponse).toBe('function');
    expect(typeof service._parsePaymentReconciliation).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. REHAB_CPT_CODES
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — REHAB_CPT_CODES', () => {
  const expectedCodes = [
    97110, 97530, 97112, 92507, 92508, 97153, 97155, 97156, 96130, 96131, 97161, 97162, 97163,
    97165, 97166, 97167, 97542, 96112,
  ];

  it.each(expectedCodes)('contains CPT code %s', code => {
    expect(REHAB_CPT_CODES[code]).toBeDefined();
  });

  it('each code has desc, descAr, and specialty', () => {
    for (const code of expectedCodes) {
      const entry = REHAB_CPT_CODES[code];
      expect(entry).toHaveProperty('desc');
      expect(entry).toHaveProperty('descAr');
      expect(entry).toHaveProperty('specialty');
      expect(typeof entry.desc).toBe('string');
      expect(typeof entry.descAr).toBe('string');
    }
  });

  it('97110 is Therapeutic Exercises / PT', () => {
    expect(REHAB_CPT_CODES[97110].desc).toBe('Therapeutic Exercises');
    expect(REHAB_CPT_CODES[97110].specialty).toBe('PT');
  });

  it('92507 is Speech Therapy Individual / SLP', () => {
    expect(REHAB_CPT_CODES[92507].desc).toBe('Speech Therapy Individual');
    expect(REHAB_CPT_CODES[92507].specialty).toBe('SLP');
  });

  it('97153 is ABA Treatment by Protocol / BA', () => {
    expect(REHAB_CPT_CODES[97153].desc).toBe('ABA Treatment by Protocol');
    expect(REHAB_CPT_CODES[97153].specialty).toBe('BA');
  });

  it('96112 is Developmental Testing / DEV', () => {
    expect(REHAB_CPT_CODES[96112].desc).toBe('Developmental Testing');
    expect(REHAB_CPT_CODES[96112].specialty).toBe('DEV');
  });

  it('some codes have unit property', () => {
    expect(REHAB_CPT_CODES[97110].unit).toBe(15);
    expect(REHAB_CPT_CODES[97530].unit).toBe(15);
  });

  it('some codes do not have unit property', () => {
    expect(REHAB_CPT_CODES[92507].unit).toBeUndefined();
    expect(REHAB_CPT_CODES[96130].unit).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. buildBundle
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — buildBundle', () => {
  it('returns a FHIR Bundle object', () => {
    const bundle = service.buildBundle('test-message', []);
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('message');
  });

  it('assigns uuidv4 as bundle id', () => {
    const bundle = service.buildBundle('test-message', []);
    expect(bundle.id).toBe('mock-uuid-1234');
  });

  it('has meta.lastUpdated and timestamp as ISO strings', () => {
    const bundle = service.buildBundle('test-message', []);
    expect(bundle.meta.lastUpdated).toBeDefined();
    expect(bundle.timestamp).toBeDefined();
    expect(() => new Date(bundle.timestamp)).not.toThrow();
  });

  it('first entry is a MessageHeader', () => {
    const bundle = service.buildBundle('eligibility-request', []);
    const first = bundle.entry[0];
    expect(first.resource.resourceType).toBe('MessageHeader');
    expect(first.fullUrl).toMatch(/^urn:uuid:/);
  });

  it('MessageHeader eventCoding.code matches messageType', () => {
    const bundle = service.buildBundle('claim-request', []);
    const mh = bundle.entry[0].resource;
    expect(mh.eventCoding.code).toBe('claim-request');
    expect(mh.eventCoding.system).toContain('nphies');
  });

  it('appends resources after MessageHeader', () => {
    const resources = [
      { resourceType: 'Patient', id: 'p1' },
      { resourceType: 'Claim', id: 'c1' },
    ];
    const bundle = service.buildBundle('claim-request', resources);
    expect(bundle.entry).toHaveLength(3); // MH + 2 resources
    expect(bundle.entry[1].resource.resourceType).toBe('Patient');
    expect(bundle.entry[2].resource.resourceType).toBe('Claim');
  });

  it('uses options.insurerId in destination receiver', () => {
    const bundle = service.buildBundle('test', [], { insurerId: '999' });
    const mh = bundle.entry[0].resource;
    expect(mh.destination[0].receiver.identifier.value).toBe('999');
  });

  it('defaults insurerId to 0000', () => {
    const bundle = service.buildBundle('test', []);
    const mh = bundle.entry[0].resource;
    expect(mh.destination[0].receiver.identifier.value).toBe('0000');
  });

  it('uses options.focusId and focusType in MessageHeader.focus', () => {
    const bundle = service.buildBundle('test', [], {
      focusId: 'abc-123',
      focusType: 'CoverageEligibilityRequest',
    });
    const mh = bundle.entry[0].resource;
    expect(mh.focus[0].reference).toBe('CoverageEligibilityRequest/abc-123');
  });

  it('defaults focusType from first resource', () => {
    const bundle = service.buildBundle('test', [{ resourceType: 'Claim', id: 'c1' }]);
    const mh = bundle.entry[0].resource;
    expect(mh.focus[0].reference).toContain('Claim');
  });

  it('handles empty resources array', () => {
    const bundle = service.buildBundle('test', []);
    expect(bundle.entry).toHaveLength(1); // only MessageHeader
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. getRehabCptCodes
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — getRehabCptCodes', () => {
  it('returns REHAB_CPT_CODES object', () => {
    expect(service.getRehabCptCodes()).toBe(REHAB_CPT_CODES);
  });

  it('returned object has 18 keys', () => {
    expect(Object.keys(service.getRehabCptCodes())).toHaveLength(18);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. getCptDescription
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — getCptDescription', () => {
  it('returns info for known code 97110', () => {
    const info = service.getCptDescription(97110);
    expect(info.desc).toBe('Therapeutic Exercises');
    expect(info.descAr).toBe('تمارين علاجية');
    expect(info.specialty).toBe('PT');
  });

  it('returns info for known code passed as string', () => {
    const info = service.getCptDescription('92507');
    expect(info.desc).toBe('Speech Therapy Individual');
  });

  it('returns default for unknown code', () => {
    const info = service.getCptDescription(99999);
    expect(info.desc).toBe('CPT 99999');
    expect(info.descAr).toContain('99999');
  });

  it('returns default for undefined code', () => {
    const info = service.getCptDescription(undefined);
    expect(info.desc).toContain('CPT');
  });

  it('returns default for null code', () => {
    const info = service.getCptDescription(null);
    expect(info.desc).toContain('CPT');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. getStatus
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — getStatus', () => {
  it('returns object with service name NPHIES', () => {
    const status = service.getStatus();
    expect(status.service).toBe('NPHIES');
  });

  it('returns env string', () => {
    const status = service.getStatus();
    expect(typeof status.env).toBe('string');
    // default is sandbox
    expect(status.env).toBe('sandbox');
  });

  it('returns baseUrl string', () => {
    const status = service.getStatus();
    expect(typeof status.baseUrl).toBe('string');
    expect(status.baseUrl).toContain('nphies');
  });

  it('returns standard as HL7 FHIR R4', () => {
    expect(service.getStatus().standard).toBe('HL7 FHIR R4');
  });

  it('features is an array of 7 items', () => {
    const features = service.getStatus().features;
    expect(Array.isArray(features)).toBe(true);
    expect(features).toHaveLength(7);
  });

  it('features includes expected items', () => {
    const features = service.getStatus().features;
    expect(features).toContain('Eligibility Verification');
    expect(features).toContain('Prior Authorization');
    expect(features).toContain('Claims Submission');
    expect(features).toContain('Payment Reconciliation');
  });

  it('cptCodes count is 18', () => {
    expect(service.getStatus().cptCodes).toBe(18);
  });

  it('configured is boolean', () => {
    expect(typeof service.getStatus().configured).toBe('boolean');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. _buildPatient
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — _buildPatient', () => {
  it('returns a Patient resource', () => {
    const p = service._buildPatient('p1', { name: 'Ali Test' });
    expect(p.resourceType).toBe('Patient');
    expect(p.id).toBe('p1');
  });

  it('uses nationalId system by default', () => {
    const p = service._buildPatient('p1', { idNumber: '1234567890' });
    expect(p.identifier[0].system).toContain('nationalId');
    expect(p.identifier[0].value).toBe('1234567890');
  });

  it('uses iqamaId system when idType is iqama', () => {
    const p = service._buildPatient('p1', { idType: 'iqama', idNumber: '2345' });
    expect(p.identifier[0].system).toContain('iqamaId');
  });

  it('uses nationalId system for non-iqama idType', () => {
    const p = service._buildPatient('p1', { idType: 'national', idNumber: '111' });
    expect(p.identifier[0].system).toContain('nationalId');
  });

  it('sets name text, family, and given', () => {
    const p = service._buildPatient('p1', { name: 'Ahmed Ali Mohammed' });
    expect(p.name[0].text).toBe('Ahmed Ali Mohammed');
    expect(p.name[0].family).toBe('Mohammed');
    expect(p.name[0].given).toEqual(['Ahmed']);
  });

  it('handles single-word name', () => {
    const p = service._buildPatient('p1', { name: 'Ahmed' });
    expect(p.name[0].family).toBe('Ahmed');
    expect(p.name[0].given).toEqual(['Ahmed']);
  });

  it('handles empty name', () => {
    const p = service._buildPatient('p1', {});
    expect(p.name[0].text).toBe('');
    expect(p.name[0].family).toBe('');
    expect(p.name[0].given).toEqual(['']);
  });

  it('sets familyName if provided', () => {
    const p = service._buildPatient('p1', { name: 'Ahmed', familyName: 'Alawi' });
    expect(p.name[0].family).toBe('Alawi');
  });

  it('sets gender to male', () => {
    const p = service._buildPatient('p1', { gender: 'male' });
    expect(p.gender).toBe('male');
  });

  it('defaults gender to female for non-male', () => {
    const p = service._buildPatient('p1', { gender: 'female' });
    expect(p.gender).toBe('female');
  });

  it('defaults gender to female when undefined', () => {
    const p = service._buildPatient('p1', {});
    expect(p.gender).toBe('female');
  });

  it('sets birthDate', () => {
    const p = service._buildPatient('p1', { birthDate: '2000-01-01' });
    expect(p.birthDate).toBe('2000-01-01');
  });

  it('birthDate defaults to null when not provided', () => {
    const p = service._buildPatient('p1', {});
    expect(p.birthDate).toBeNull();
  });

  it('has NPHIES profile meta', () => {
    const p = service._buildPatient('p1', {});
    expect(p.meta.profile).toBeDefined();
    expect(p.meta.profile[0]).toContain('nphies');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. _parseEligibilityResponse
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — _parseEligibilityResponse', () => {
  it('returns default structure for empty bundle', () => {
    const result = service._parseEligibilityResponse({});
    expect(result.responseId).toBeNull();
    expect(result.coverageStatus).toBe('inactive');
    expect(result.benefits).toEqual([]);
    expect(result.exclusions).toEqual([]);
    expect(result.remainingLimit).toBeNull();
  });

  it('returns default structure for undefined input', () => {
    const result = service._parseEligibilityResponse(undefined);
    expect(result.responseId).toBeNull();
    expect(result.benefits).toEqual([]);
  });

  it('extracts responseId from CoverageEligibilityResponse', () => {
    const bundle = {
      entry: [{ resource: { resourceType: 'CoverageEligibilityResponse', id: 'resp-1' } }],
    };
    const result = service._parseEligibilityResponse(bundle);
    expect(result.responseId).toBe('resp-1');
  });

  it('detects active coverage when inforce is true', () => {
    const bundle = {
      entry: [
        {
          resource: {
            resourceType: 'CoverageEligibilityResponse',
            id: 'resp-1',
            insurance: [{ inforce: true }],
          },
        },
      ],
    };
    const result = service._parseEligibilityResponse(bundle);
    expect(result.coverageStatus).toBe('active');
  });

  it('detects inactive coverage when inforce is false', () => {
    const bundle = {
      entry: [
        {
          resource: {
            resourceType: 'CoverageEligibilityResponse',
            id: 'resp-1',
            insurance: [{ inforce: false }],
          },
        },
      ],
    };
    const result = service._parseEligibilityResponse(bundle);
    expect(result.coverageStatus).toBe('inactive');
  });

  it('extracts benefits from insurance items', () => {
    const bundle = {
      entry: [
        {
          resource: {
            resourceType: 'CoverageEligibilityResponse',
            insurance: [
              {
                inforce: true,
                item: [
                  {
                    benefit: [
                      {
                        type: { coding: [{ code: 'benefit' }] },
                        allowedMoney: { value: 50000, currency: 'SAR' },
                        usedMoney: { value: 10000, currency: 'SAR' },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    };
    const result = service._parseEligibilityResponse(bundle);
    expect(result.benefits).toHaveLength(1);
    expect(result.benefits[0].type).toBe('benefit');
    expect(result.benefits[0].allowed).toBe(50000);
    expect(result.benefits[0].used).toBe(10000);
    expect(result.benefits[0].currency).toBe('SAR');
  });

  it('computes remainingLimit from benefit with allowed and used', () => {
    const bundle = {
      entry: [
        {
          resource: {
            resourceType: 'CoverageEligibilityResponse',
            insurance: [
              {
                item: [
                  {
                    benefit: [
                      {
                        type: { coding: [{ code: 'benefit' }] },
                        allowedMoney: { value: 50000, currency: 'SAR' },
                        usedMoney: { value: 10000 },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    };
    const result = service._parseEligibilityResponse(bundle);
    expect(result.remainingLimit).toBe(40000);
  });

  it('extracts exclusions', () => {
    const bundle = {
      entry: [
        {
          resource: {
            resourceType: 'CoverageEligibilityResponse',
            insurance: [
              {
                item: [
                  { excluded: true, category: { coding: [{ display: 'Dental' }] } },
                  { excluded: false },
                ],
              },
            ],
          },
        },
      ],
    };
    const result = service._parseEligibilityResponse(bundle);
    expect(result.exclusions).toEqual(['Dental']);
  });

  it('uses allowedUnsignedInt fallback', () => {
    const bundle = {
      entry: [
        {
          resource: {
            resourceType: 'CoverageEligibilityResponse',
            insurance: [
              {
                item: [
                  {
                    benefit: [
                      {
                        type: { coding: [{ code: 'session' }] },
                        allowedUnsignedInt: 24,
                        usedUnsignedInt: 5,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    };
    const result = service._parseEligibilityResponse(bundle);
    expect(result.benefits[0].allowed).toBe(24);
    expect(result.benefits[0].used).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. _parsePreAuthResponse
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — _parsePreAuthResponse', () => {
  const makeBundle = (outcome, items = [], extras = {}) => ({
    entry: [
      {
        resource: {
          resourceType: 'ClaimResponse',
          id: 'pr-1',
          outcome,
          preAuthRef: extras.preAuthRef || null,
          total: extras.total || [],
          preAuthPeriod: extras.preAuthPeriod || {},
          item: items,
        },
      },
    ],
  });

  it('maps outcome "complete" → status "approved"', () => {
    const result = service._parsePreAuthResponse(makeBundle('complete'));
    expect(result.status).toBe('approved');
  });

  it('maps outcome "partial" → status "partially_approved"', () => {
    const result = service._parsePreAuthResponse(makeBundle('partial'));
    expect(result.status).toBe('partially_approved');
  });

  it('maps outcome "error" → status "rejected"', () => {
    const result = service._parsePreAuthResponse(makeBundle('error'));
    expect(result.status).toBe('rejected');
  });

  it('maps outcome "queued" → status "pending"', () => {
    const result = service._parsePreAuthResponse(makeBundle('queued'));
    expect(result.status).toBe('pending');
  });

  it('maps unknown outcome → "rejected"', () => {
    const result = service._parsePreAuthResponse(makeBundle('unknown'));
    expect(result.status).toBe('rejected');
  });

  it('extracts responseId', () => {
    const result = service._parsePreAuthResponse(makeBundle('complete'));
    expect(result.responseId).toBe('pr-1');
  });

  it('extracts preAuthRef', () => {
    const result = service._parsePreAuthResponse(
      makeBundle('complete', [], { preAuthRef: 'PA-123' })
    );
    expect(result.preAuthRef).toBe('PA-123');
  });

  it('sums approved sessions from benefit adjudication', () => {
    const items = [
      {
        adjudication: [
          { category: { coding: [{ code: 'benefit' }] }, value: 10 },
          { category: { coding: [{ code: 'benefit' }] }, value: 5 },
        ],
      },
    ];
    const result = service._parsePreAuthResponse(makeBundle('complete', items));
    expect(result.approvedSessions).toBe(15);
  });

  it('collects rejection reasons from denial-reason', () => {
    const items = [
      {
        adjudication: [
          {
            category: { coding: [{ code: 'denial-reason' }] },
            reason: { coding: [{ display: 'Not medically necessary' }] },
          },
        ],
      },
    ];
    const result = service._parsePreAuthResponse(makeBundle('error', items));
    expect(result.rejectionReason).toBe('Not medically necessary');
  });

  it('joins multiple rejection reasons with semicolons', () => {
    const items = [
      {
        adjudication: [
          {
            category: { coding: [{ code: 'denial-reason' }] },
            reason: { coding: [{ display: 'Reason A' }] },
          },
          {
            category: { coding: [{ code: 'denial-reason' }] },
            reason: { coding: [{ display: 'Reason B' }] },
          },
        ],
      },
    ];
    const result = service._parsePreAuthResponse(makeBundle('error', items));
    expect(result.rejectionReason).toBe('Reason A; Reason B');
  });

  it('rejectionReason is null when no denials', () => {
    const result = service._parsePreAuthResponse(makeBundle('complete'));
    expect(result.rejectionReason).toBeNull();
  });

  it('extracts approvedAmount from total', () => {
    const result = service._parsePreAuthResponse(
      makeBundle('complete', [], { total: [{ amount: { value: 5000 } }] })
    );
    expect(result.approvedAmount).toBe(5000);
  });

  it('returns default for empty bundle', () => {
    const result = service._parsePreAuthResponse({});
    expect(result.responseId).toBeNull();
    expect(result.status).toBe('rejected');
    expect(result.approvedSessions).toBe(0);
  });

  it('extracts approved period dates', () => {
    const result = service._parsePreAuthResponse(
      makeBundle('complete', [], {
        preAuthPeriod: { start: '2025-01-01', end: '2025-06-30' },
      })
    );
    expect(result.approvedStartDate).toBe('2025-01-01');
    expect(result.approvedEndDate).toBe('2025-06-30');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. _parseClaimResponse
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — _parseClaimResponse', () => {
  const makeClaimBundle = (outcome, items = []) => ({
    entry: [
      {
        resource: {
          resourceType: 'ClaimResponse',
          id: 'cr-1',
          outcome,
          item: items,
        },
      },
    ],
  });

  it('returns approved when complete with no rejections', () => {
    const result = service._parseClaimResponse(makeClaimBundle('complete'));
    expect(result.status).toBe('approved');
  });

  it('returns partially_approved when complete with rejections', () => {
    const items = [
      {
        itemSequence: 1,
        adjudication: [
          {
            category: { coding: [{ code: 'denial-reason' }] },
            reason: { coding: [{ display: 'Excluded' }] },
          },
        ],
      },
    ];
    const result = service._parseClaimResponse(makeClaimBundle('complete', items));
    expect(result.status).toBe('partially_approved');
  });

  it('returns partially_approved for partial outcome', () => {
    const result = service._parseClaimResponse(makeClaimBundle('partial'));
    expect(result.status).toBe('partially_approved');
  });

  it('returns rejected for error outcome', () => {
    const result = service._parseClaimResponse(makeClaimBundle('error'));
    expect(result.status).toBe('rejected');
  });

  it('returns rejected for unknown outcome', () => {
    const result = service._parseClaimResponse(makeClaimBundle('xyz'));
    expect(result.status).toBe('rejected');
  });

  it('extracts claimId', () => {
    const result = service._parseClaimResponse(makeClaimBundle('complete'));
    expect(result.claimId).toBe('cr-1');
  });

  it('sums totalApproved from benefit adjudications', () => {
    const items = [
      {
        adjudication: [{ category: { coding: [{ code: 'benefit' }] }, amount: { value: 1000 } }],
      },
      {
        adjudication: [{ category: { coding: [{ code: 'benefit' }] }, amount: { value: 2000 } }],
      },
    ];
    const result = service._parseClaimResponse(makeClaimBundle('complete', items));
    expect(result.totalApproved).toBe(3000);
  });

  it('sums totalPatientShare from copay adjudications', () => {
    const items = [
      {
        adjudication: [{ category: { coding: [{ code: 'copay' }] }, amount: { value: 50 } }],
      },
    ];
    const result = service._parseClaimResponse(makeClaimBundle('complete', items));
    expect(result.totalPatientShare).toBe(50);
  });

  it('returns item-level details', () => {
    const items = [
      {
        itemSequence: 1,
        adjudication: [
          { category: { coding: [{ code: 'benefit' }] }, amount: { value: 500 } },
          { category: { coding: [{ code: 'copay' }] }, amount: { value: 25 } },
        ],
      },
    ];
    const result = service._parseClaimResponse(makeClaimBundle('complete', items));
    expect(result.items).toHaveLength(1);
    expect(result.items[0].sequence).toBe(1);
    expect(result.items[0].status).toBe('approved');
    expect(result.items[0].approved_amount).toBe(500);
    expect(result.items[0].patient_share).toBe(25);
  });

  it('item status is rejected when only denial-reason', () => {
    const items = [
      {
        itemSequence: 2,
        adjudication: [
          {
            category: { coding: [{ code: 'denial-reason' }] },
            reason: { coding: [{ display: 'Not covered', code: 'NC' }] },
          },
        ],
      },
    ];
    const result = service._parseClaimResponse(makeClaimBundle('error', items));
    expect(result.items[0].status).toBe('rejected');
    expect(result.items[0].rejection_reason).toBe('Not covered');
    expect(result.items[0].adjudication_code).toBe('NC');
  });

  it('item status is pending when no benefit and no rejection', () => {
    const items = [{ itemSequence: 3, adjudication: [] }];
    const result = service._parseClaimResponse(makeClaimBundle('complete', items));
    expect(result.items[0].status).toBe('pending');
  });

  it('collects rejectionReasons array', () => {
    const items = [
      {
        adjudication: [
          {
            category: { coding: [{ code: 'denial-reason' }] },
            reason: { coding: [{ display: 'R1' }] },
          },
        ],
      },
      {
        adjudication: [
          {
            category: { coding: [{ code: 'denial-reason' }] },
            reason: { coding: [{ display: 'R2' }] },
          },
        ],
      },
    ];
    const result = service._parseClaimResponse(makeClaimBundle('complete', items));
    expect(result.rejectionReasons).toEqual(['R1', 'R2']);
  });

  it('returns default for empty bundle', () => {
    const result = service._parseClaimResponse({});
    expect(result.claimId).toBeNull();
    expect(result.status).toBe('rejected');
    expect(result.totalApproved).toBe(0);
    expect(result.items).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. _parsePaymentReconciliation
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — _parsePaymentReconciliation', () => {
  it('returns default for empty bundle', () => {
    const result = service._parsePaymentReconciliation({});
    expect(result.paymentId).toBeNull();
    expect(result.totalAmount).toBe(0);
    expect(result.paymentDate).toBeNull();
    expect(result.period.start).toBeNull();
    expect(result.period.end).toBeNull();
    expect(result.claimPayments).toEqual([]);
  });

  it('extracts paymentId and totalAmount', () => {
    const bundle = {
      entry: [
        {
          resource: {
            resourceType: 'PaymentReconciliation',
            id: 'pay-1',
            paymentAmount: { value: 15000 },
          },
        },
      ],
    };
    const result = service._parsePaymentReconciliation(bundle);
    expect(result.paymentId).toBe('pay-1');
    expect(result.totalAmount).toBe(15000);
  });

  it('extracts paymentDate and period', () => {
    const bundle = {
      entry: [
        {
          resource: {
            resourceType: 'PaymentReconciliation',
            paymentDate: '2025-04-01',
            period: { start: '2025-03-01', end: '2025-03-31' },
          },
        },
      ],
    };
    const result = service._parsePaymentReconciliation(bundle);
    expect(result.paymentDate).toBe('2025-04-01');
    expect(result.period.start).toBe('2025-03-01');
    expect(result.period.end).toBe('2025-03-31');
  });

  it('extracts claimPayments from detail array', () => {
    const bundle = {
      entry: [
        {
          resource: {
            resourceType: 'PaymentReconciliation',
            id: 'pay-2',
            paymentDate: '2025-04-01',
            detail: [
              {
                request: { reference: 'Claim/CLM-001' },
                amount: { value: 3000 },
                type: { coding: [{ code: 'payment' }] },
              },
              {
                request: { reference: 'Claim/CLM-002' },
                amount: { value: 2000 },
                type: { coding: [{ code: 'payment' }] },
              },
            ],
          },
        },
      ],
    };
    const result = service._parsePaymentReconciliation(bundle);
    expect(result.claimPayments).toHaveLength(2);
    expect(result.claimPayments[0].claimReference).toBe('CLM-001');
    expect(result.claimPayments[0].paidAmount).toBe(3000);
    expect(result.claimPayments[0].type).toBe('payment');
    expect(result.claimPayments[1].claimReference).toBe('CLM-002');
    expect(result.claimPayments[1].paidAmount).toBe(2000);
  });

  it('handles missing request reference gracefully', () => {
    const bundle = {
      entry: [
        {
          resource: {
            resourceType: 'PaymentReconciliation',
            detail: [{ amount: { value: 100 } }],
          },
        },
      ],
    };
    const result = service._parsePaymentReconciliation(bundle);
    expect(result.claimPayments[0].claimReference).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. _sendToNphies (via async methods — no credentials)
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — _sendToNphies (no credentials)', () => {
  it('returns skipped result when no credentials', async () => {
    const bundle = service.buildBundle('test', []);
    const result = await service._sendToNphies(bundle);
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe('NPHIES credentials not configured');
    expect(result.bundleId).toBeDefined();
  });

  it('logs warning about missing license', async () => {
    const bundle = service.buildBundle('test', []);
    await service._sendToNphies(bundle);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('License ID not configured'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. checkEligibility
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — checkEligibility', () => {
  const patientData = {
    idType: 'national',
    idNumber: '1234567890',
    name: 'Ahmed Ali',
    birthDate: '1990-01-01',
    gender: 'male',
  };
  const coverageData = {
    payerId: 'INS-001',
    memberId: 'MEM-123',
    relationship: 'self',
  };

  it('returns an object with success, data, requestId, error', async () => {
    const result = await service.checkEligibility(patientData, coverageData);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('requestId');
    expect(result).toHaveProperty('error');
  });

  it('returns success:false when no credentials', async () => {
    const result = await service.checkEligibility(patientData, coverageData);
    expect(result.success).toBe(false);
  });

  it('has a requestId (bundle id)', async () => {
    const result = await service.checkEligibility(patientData, coverageData);
    expect(result.requestId).toBeDefined();
    expect(typeof result.requestId).toBe('string');
  });

  it('error indicates credentials not configured', async () => {
    const result = await service.checkEligibility(patientData, coverageData);
    expect(result.error).toContain('credentials not configured');
  });

  it('logs eligibility check submission', async () => {
    await service.checkEligibility(patientData, coverageData);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Eligibility check submitted'),
      expect.any(Object)
    );
  });

  it('works without options parameter', async () => {
    const result = await service.checkEligibility(patientData, coverageData);
    expect(result).toBeDefined();
  });

  it('works with custom serviceTypes', async () => {
    const result = await service.checkEligibility(patientData, {
      ...coverageData,
      serviceTypes: ['rehabilitation', 'psychology'],
    });
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });

  it('works with preAuthRef in coverage data', async () => {
    const result = await service.checkEligibility(patientData, {
      ...coverageData,
      preAuthRef: 'PA-001',
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. requestPriorAuthorization
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — requestPriorAuthorization', () => {
  const authData = {
    idNumber: '1234567890',
    name: 'Ahmed Ali',
    gender: 'male',
    birthDate: '1990-01-01',
    payerId: 'INS-001',
    diagnosisCodes: ['F84.0', 'G80.9'],
    serviceCodes: [97110, 92507],
    requestedSessions: 12,
    startDate: '2025-05-01',
    endDate: '2025-11-01',
    estimatedAmount: 6000,
  };

  it('returns object with success, data, preAuthId, requestId, error', async () => {
    const result = await service.requestPriorAuthorization(authData);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('preAuthId');
    expect(result).toHaveProperty('requestId');
    expect(result).toHaveProperty('error');
  });

  it('returns success:false with no credentials', async () => {
    const result = await service.requestPriorAuthorization(authData);
    expect(result.success).toBe(false);
  });

  it('preAuthId is defined (claim uuid)', async () => {
    const result = await service.requestPriorAuthorization(authData);
    expect(result.preAuthId).toBeDefined();
  });

  it('requestId is defined (bundle uuid)', async () => {
    const result = await service.requestPriorAuthorization(authData);
    expect(result.requestId).toBeDefined();
  });

  it('logs prior auth submission', async () => {
    await service.requestPriorAuthorization(authData);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Prior authorization request submitted'),
      expect.any(Object)
    );
  });

  it('works with empty diagnosisCodes', async () => {
    const result = await service.requestPriorAuthorization({
      ...authData,
      diagnosisCodes: [],
    });
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });

  it('works with empty serviceCodes', async () => {
    const result = await service.requestPriorAuthorization({
      ...authData,
      serviceCodes: [],
    });
    expect(result).toBeDefined();
  });

  it('works with unitPrices', async () => {
    const result = await service.requestPriorAuthorization({
      ...authData,
      unitPrices: { 97110: 200, 92507: 150 },
    });
    expect(result).toBeDefined();
  });

  it('works with custom claimType', async () => {
    const result = await service.requestPriorAuthorization({
      ...authData,
      claimType: 'institutional',
    });
    expect(result.success).toBe(false);
  });

  it('works with eligibilityResponseId', async () => {
    const result = await service.requestPriorAuthorization({
      ...authData,
      eligibilityResponseId: 'elig-ref-001',
    });
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. submitClaim
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — submitClaim', () => {
  const claimData = {
    patientId: '1234567890',
    patientName: 'Ahmed Ali',
    patientBirthDate: '1990-01-01',
    patientGender: 'male',
    payerId: 'INS-001',
    diagnosisCodes: ['F84.0'],
    services: [
      { code: 97110, name: 'Therapeutic Exercises', quantity: 4, unitPrice: 200, totalPrice: 800 },
    ],
    totalAmount: 800,
    claimType: 'professional',
  };

  it('returns object with success, data, claimId, requestId, error', async () => {
    const result = await service.submitClaim(claimData);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('claimId');
    expect(result).toHaveProperty('requestId');
    expect(result).toHaveProperty('error');
  });

  it('returns success:false with no credentials', async () => {
    const result = await service.submitClaim(claimData);
    expect(result.success).toBe(false);
  });

  it('claimId is defined', async () => {
    const result = await service.submitClaim(claimData);
    expect(result.claimId).toBeDefined();
  });

  it('logs claim submission', async () => {
    await service.submitClaim(claimData);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Claim submitted'),
      expect.objectContaining({ claimId: expect.any(String) })
    );
  });

  it('handles empty services array', async () => {
    const result = await service.submitClaim({ ...claimData, services: [] });
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });

  it('handles empty diagnosisCodes', async () => {
    const result = await service.submitClaim({ ...claimData, diagnosisCodes: [] });
    expect(result).toBeDefined();
  });

  it('works with preAuthRef', async () => {
    const result = await service.submitClaim({ ...claimData, preAuthRef: 'PA-001' });
    expect(result).toBeDefined();
  });

  it('works with claimSubtype', async () => {
    const result = await service.submitClaim({ ...claimData, claimSubtype: 'op' });
    expect(result).toBeDefined();
  });

  it('handles services with toothNumber body site', async () => {
    const result = await service.submitClaim({
      ...claimData,
      services: [{ code: 97110, toothNumber: 11, quantity: 1, unitPrice: 100, totalPrice: 100 }],
    });
    expect(result).toBeDefined();
  });

  it('works with eligibilityRef', async () => {
    const result = await service.submitClaim({
      ...claimData,
      eligibilityRef: 'ELIG-REF',
    });
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 16. inquireClaimStatus
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — inquireClaimStatus', () => {
  it('returns object with success, data, error', async () => {
    const result = await service.inquireClaimStatus('CLM-001', 'INS-001');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('error');
  });

  it('returns success:false with no credentials', async () => {
    const result = await service.inquireClaimStatus('CLM-001', 'INS-001');
    expect(result.success).toBe(false);
  });

  it('logs inquiry', async () => {
    await service.inquireClaimStatus('CLM-001', 'INS-001');
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Claim status inquiry sent'),
      expect.objectContaining({ claimId: 'CLM-001' })
    );
  });

  it('error indicates missing credentials', async () => {
    const result = await service.inquireClaimStatus('CLM-001', 'INS-001');
    expect(result.error).toContain('credentials not configured');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17. cancelClaim
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — cancelClaim', () => {
  it('returns object with success, data, error', async () => {
    const result = await service.cancelClaim('CLM-001', 'Duplicate');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('error');
  });

  it('returns success:false with no credentials', async () => {
    const result = await service.cancelClaim('CLM-001', 'Duplicate');
    expect(result.success).toBe(false);
  });

  it('logs cancellation', async () => {
    await service.cancelClaim('CLM-001', 'Duplicate');
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Claim cancellation sent'),
      expect.objectContaining({ claimId: 'CLM-001' })
    );
  });

  it('works without reason (uses default Arabic)', async () => {
    const result = await service.cancelClaim('CLM-002');
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });

  it('works with null reason', async () => {
    const result = await service.cancelClaim('CLM-003', null);
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 18. respondToCommunication
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — respondToCommunication', () => {
  const commData = {
    claimId: 'CLM-001',
    payerId: 'INS-001',
    message: 'المستندات المطلوبة مرفقة',
  };

  it('returns object with success, data, error', async () => {
    const result = await service.respondToCommunication(commData);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('error');
  });

  it('returns success:false with no credentials', async () => {
    const result = await service.respondToCommunication(commData);
    expect(result.success).toBe(false);
  });

  it('logs communication response', async () => {
    await service.respondToCommunication(commData);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Communication response sent'),
      expect.any(Object)
    );
  });

  it('works with documents attached', async () => {
    const result = await service.respondToCommunication({
      ...commData,
      documents: [
        { mimeType: 'application/pdf', base64Data: 'AAAA', title: 'Report.pdf' },
        { mimeType: 'image/jpeg', base64Data: 'BBBB', title: 'Photo.jpg' },
      ],
    });
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });

  it('works without documents', async () => {
    const result = await service.respondToCommunication({
      payerId: 'INS-001',
      message: 'Reply',
    });
    expect(result).toBeDefined();
  });

  it('works with requestId (inResponseTo)', async () => {
    const result = await service.respondToCommunication({
      ...commData,
      requestId: 'COMM-REQ-001',
    });
    expect(result).toBeDefined();
  });

  it('works without claimId', async () => {
    const result = await service.respondToCommunication({
      payerId: 'INS-001',
      message: 'General inquiry',
    });
    expect(result).toBeDefined();
  });

  it('works with empty message', async () => {
    const result = await service.respondToCommunication({
      payerId: 'INS-001',
      message: '',
    });
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 19. reconcilePayment
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — reconcilePayment', () => {
  it('returns object with success, data, error', async () => {
    const result = await service.reconcilePayment('PAY-REF-001', 'INS-001');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('error');
  });

  it('returns success:false with no credentials', async () => {
    const result = await service.reconcilePayment('PAY-REF-001', 'INS-001');
    expect(result.success).toBe(false);
  });

  it('does not include reconciliation when unsuccessful', async () => {
    const result = await service.reconcilePayment('PAY-REF-001', 'INS-001');
    expect(result.reconciliation).toBeUndefined();
  });

  it('error indicates missing credentials', async () => {
    const result = await service.reconcilePayment('PAY-REF-001', 'INS-001');
    expect(result.error).toContain('credentials not configured');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 20. Constructor
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — constructor', () => {
  it('instance has a client property (axios instance)', () => {
    const inst = new NphiesService();
    expect(inst).toHaveProperty('client');
    expect(inst.client).toBeDefined();
  });

  it('singleton client is an object with post/get', () => {
    // The mock returns { post, get } from axios.create
    expect(service.client).toBeDefined();
    expect(typeof service.client).toBe('object');
  });

  it('instance has accessToken property (string)', () => {
    const inst = new NphiesService();
    expect(inst).toHaveProperty('accessToken');
    expect(typeof inst.accessToken).toBe('string');
  });

  it('new instances are independent', () => {
    const a = new NphiesService();
    const b = new NphiesService();
    expect(a).not.toBe(b);
  });

  it('default accessToken is empty string (no env var)', () => {
    const inst = new NphiesService();
    expect(inst.accessToken).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 21. Edge cases & integration-like
// ═══════════════════════════════════════════════════════════════════════════
describe('NphiesService — edge cases', () => {
  it('buildBundle with resources that have no id uses uuidv4', () => {
    const resources = [{ resourceType: 'Patient' }];
    const bundle = service.buildBundle('test', resources);
    expect(bundle.entry[1].fullUrl).toContain('mock-uuid-1234');
  });

  it('buildBundle with zero resources produces single-entry bundle', () => {
    const bundle = service.buildBundle('test', []);
    expect(bundle.entry).toHaveLength(1);
    expect(bundle.entry[0].resource.resourceType).toBe('MessageHeader');
  });

  it('getCptDescription handles numeric zero', () => {
    const info = service.getCptDescription(0);
    expect(info.desc).toContain('CPT');
  });

  it('_parseEligibilityResponse handles bundle with unrelated entries', () => {
    const bundle = {
      entry: [
        { resource: { resourceType: 'Patient', id: 'p1' } },
        { resource: { resourceType: 'OperationOutcome' } },
      ],
    };
    const result = service._parseEligibilityResponse(bundle);
    expect(result.responseId).toBeNull();
    expect(result.benefits).toEqual([]);
  });

  it('_parsePreAuthResponse handles no ClaimResponse entry', () => {
    const bundle = { entry: [{ resource: { resourceType: 'Patient' } }] };
    const result = service._parsePreAuthResponse(bundle);
    expect(result.responseId).toBeNull();
    expect(result.status).toBe('rejected');
  });

  it('_parseClaimResponse handles no ClaimResponse entry', () => {
    const bundle = { entry: [{ resource: { resourceType: 'OperationOutcome' } }] };
    const result = service._parseClaimResponse(bundle);
    expect(result.claimId).toBeNull();
    expect(result.status).toBe('rejected');
  });

  it('_parsePaymentReconciliation handles no PaymentReconciliation entry', () => {
    const bundle = { entry: [{ resource: { resourceType: 'Task' } }] };
    const result = service._parsePaymentReconciliation(bundle);
    expect(result.paymentId).toBeNull();
    expect(result.totalAmount).toBe(0);
  });

  it('_buildPatient with all fields populated', () => {
    const p = service._buildPatient('p1', {
      idType: 'iqama',
      idNumber: '2345678901',
      name: 'Fatima Al-Rashid',
      familyName: 'Al-Rashid',
      birthDate: '1985-06-15',
      gender: 'female',
    });
    expect(p.identifier[0].system).toContain('iqamaId');
    expect(p.identifier[0].value).toBe('2345678901');
    expect(p.name[0].family).toBe('Al-Rashid');
    expect(p.name[0].given).toEqual(['Fatima']);
    expect(p.gender).toBe('female');
    expect(p.birthDate).toBe('1985-06-15');
  });

  it('checkEligibility with iqama idType', async () => {
    const result = await service.checkEligibility(
      { idType: 'iqama', idNumber: '2000000000', name: 'Test', gender: 'male' },
      { payerId: 'PAY-X' }
    );
    expect(result.success).toBe(false);
    expect(result.requestId).toBeDefined();
  });

  it('submitClaim with multiple services', async () => {
    const result = await service.submitClaim({
      patientId: '111',
      patientName: 'Test',
      payerId: 'INS-X',
      services: [
        { code: 97110, quantity: 2, unitPrice: 200, totalPrice: 400 },
        { code: 92507, quantity: 3, unitPrice: 150, totalPrice: 450 },
        { code: 97530, quantity: 1, unitPrice: 100, totalPrice: 100, date: '2025-06-01' },
      ],
      diagnosisCodes: ['F84.0', 'G80.9'],
      totalAmount: 950,
    });
    expect(result.success).toBe(false);
    expect(result.claimId).toBeDefined();
  });

  it('requestPriorAuthorization with iqama idType', async () => {
    const result = await service.requestPriorAuthorization({
      idType: 'iqama',
      idNumber: '2345',
      name: 'Test',
      payerId: 'INS-X',
      diagnosisCodes: ['Z00.0'],
      serviceCodes: [96112],
    });
    expect(result.success).toBe(false);
  });
});
