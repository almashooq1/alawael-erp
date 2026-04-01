/**
 * NPHIES Service — المنصة الوطنية لتبادل المعلومات الصحية والتأمينية
 * HL7 FHIR R4 - مجلس الضمان الصحي (CHI)
 *
 * يدعم:
 * - التحقق من الأهلية (Eligibility Verification)
 * - الموافقة المسبقة (Prior Authorization)
 * - تقديم المطالبات (Claim Submission)
 * - طلب مستندات إضافية (Communication)
 * - تسوية الدفع (Payment Reconciliation)
 * - رموز CPT لمراكز التأهيل (97110، 97530، 92507...)
 */
'use strict';

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// ─── نماذج قاعدة البيانات ──────────────────────────────────────────────────
let EligibilityCheck, PriorAuthorization, InsuranceClaim, InsurancePolicy;
try {
  EligibilityCheck = require('../models/nphies/EligibilityCheck');
  PriorAuthorization = require('../models/nphies/PriorAuthorization');
  InsuranceClaim = require('../models/nphies/InsuranceClaim');
  InsurancePolicy = require('../models/nphies/InsurancePolicy');
} catch {
  EligibilityCheck = null;
  PriorAuthorization = null;
  InsuranceClaim = null;
  InsurancePolicy = null;
}

// ─── الإعدادات الأساسية ────────────────────────────────────────────────────
const NPHIES_ENV = process.env.NPHIES_ENV || 'sandbox';
const NPHIES_BASE_URL =
  NPHIES_ENV === 'production'
    ? process.env.NPHIES_BASE_URL || 'https://HSB.nphies.sa/$process-message'
    : 'https://HSB.nphies.sa/test/$process-message';

const NPHIES_SENDER_ID = process.env.NPHIES_SENDER_ID || '';
const NPHIES_LICENSE_ID = process.env.NPHIES_LICENSE_ID || '';
const NPHIES_PROVIDER_ID = process.env.NPHIES_PROVIDER_ID || '';
const NPHIES_ACCESS_TOKEN = process.env.NPHIES_ACCESS_TOKEN || '';

// ─── رموز CPT لمراكز التأهيل ───────────────────────────────────────────────
const REHAB_CPT_CODES = {
  97110: { desc: 'Therapeutic Exercises', descAr: 'تمارين علاجية', specialty: 'PT', unit: 15 },
  97530: { desc: 'Therapeutic Activities', descAr: 'أنشطة علاجية', specialty: 'OT', unit: 15 },
  97112: {
    desc: 'Neuromuscular Re-education',
    descAr: 'إعادة تأهيل عصبي عضلي',
    specialty: 'PT/OT',
    unit: 15,
  },
  92507: { desc: 'Speech Therapy Individual', descAr: 'علاج نطق فردي', specialty: 'SLP' },
  92508: { desc: 'Speech Therapy Group', descAr: 'علاج نطق جماعي', specialty: 'SLP' },
  97153: {
    desc: 'ABA Treatment by Protocol',
    descAr: 'تحليل سلوك تطبيقي - فردي',
    specialty: 'BA',
    unit: 15,
  },
  97155: {
    desc: 'ABA Protocol Modification',
    descAr: 'تعديل بروتوكول سلوكي',
    specialty: 'BCBA',
    unit: 15,
  },
  97156: { desc: 'ABA Family Guidance', descAr: 'توجيه أسري - ABA', specialty: 'BA', unit: 15 },
  96130: {
    desc: 'Psychological Testing 1st Hour',
    descAr: 'تقييم نفسي - أول ساعة',
    specialty: 'PSY',
  },
  96131: {
    desc: 'Psychological Testing Add. Hour',
    descAr: 'تقييم نفسي - ساعة إضافية',
    specialty: 'PSY',
  },
  97161: {
    desc: 'PT Evaluation Low Complexity',
    descAr: 'تقييم علاج طبيعي - منخفض',
    specialty: 'PT',
  },
  97162: {
    desc: 'PT Evaluation Moderate Complexity',
    descAr: 'تقييم علاج طبيعي - متوسط',
    specialty: 'PT',
  },
  97163: {
    desc: 'PT Evaluation High Complexity',
    descAr: 'تقييم علاج طبيعي - عالي',
    specialty: 'PT',
  },
  97165: {
    desc: 'OT Evaluation Low Complexity',
    descAr: 'تقييم علاج وظيفي - منخفض',
    specialty: 'OT',
  },
  97166: {
    desc: 'OT Evaluation Moderate Complexity',
    descAr: 'تقييم علاج وظيفي - متوسط',
    specialty: 'OT',
  },
  97167: {
    desc: 'OT Evaluation High Complexity',
    descAr: 'تقييم علاج وظيفي - عالي',
    specialty: 'OT',
  },
  97542: {
    desc: 'Wheelchair Management Training',
    descAr: 'تأهيل وتدريب على الكرسي المتحرك',
    specialty: 'OT',
  },
  96112: { desc: 'Developmental Testing', descAr: 'تقييم نمائي', specialty: 'DEV' },
};

// ═══════════════════════════════════════════════════════════════════════════
// خدمة NPHIES الرئيسية
// ═══════════════════════════════════════════════════════════════════════════
class NphiesService {
  constructor() {
    this.accessToken = NPHIES_ACCESS_TOKEN;
    this.client = axios.create({
      timeout: 60000,
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
    });
  }

  // =========================================================================
  // 1. بناء FHIR Bundle المحوري
  // =========================================================================

  /**
   * بناء FHIR Bundle Message
   */
  buildBundle(messageType, resources = [], options = {}) {
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();
    const insurerId = options.insurerId || '0000';
    const focusId = options.focusId || resources[0]?.id || uuidv4();
    const focusType = options.focusType || resources[0]?.resourceType || 'Claim';

    const messageHeader = {
      resourceType: 'MessageHeader',
      id: uuidv4(),
      meta: {
        profile: ['http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/message-header|1.0.0'],
      },
      eventCoding: {
        system: 'http://nphies.sa/terminology/CodeSystem/ksa-message-events',
        code: messageType,
      },
      destination: [
        {
          endpoint: NPHIES_BASE_URL,
          receiver: {
            type: 'Organization',
            identifier: {
              system: 'http://nphies.sa/license/payer-license',
              value: insurerId,
            },
          },
        },
      ],
      sender: {
        type: 'Organization',
        identifier: {
          system: 'http://nphies.sa/license/provider-license',
          value: NPHIES_LICENSE_ID,
        },
      },
      source: {
        endpoint: `http://provider.sa/${NPHIES_PROVIDER_ID}`,
      },
      focus: [{ reference: `${focusType}/${focusId}` }],
    };

    return {
      resourceType: 'Bundle',
      id: messageId,
      meta: { lastUpdated: timestamp },
      type: 'message',
      timestamp,
      entry: [
        { fullUrl: `urn:uuid:${messageHeader.id}`, resource: messageHeader },
        ...resources.map(r => ({
          fullUrl: `urn:uuid:${r.id || uuidv4()}`,
          resource: r,
        })),
      ],
    };
  }

  // =========================================================================
  // 2. التحقق من الأهلية
  // =========================================================================

  /**
   * التحقق من أهلية مريض للتأمين الصحي
   */
  async checkEligibility(patientData, coverageData, options = {}) {
    const patientId = uuidv4();
    const coverageId = uuidv4();
    const eligibilityId = uuidv4();

    const patient = {
      resourceType: 'Patient',
      id: patientId,
      meta: {
        profile: ['http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/patient|1.0.0'],
      },
      identifier: [
        {
          system:
            patientData.idType === 'national'
              ? 'http://nphies.sa/identifier/nationalId'
              : 'http://nphies.sa/identifier/iqamaId',
          value: patientData.idNumber,
        },
      ],
      name: [
        {
          use: 'official',
          text: patientData.name || '',
          family: patientData.familyName || patientData.name?.split(' ').pop() || '',
          given: [patientData.name?.split(' ')[0] || ''],
        },
      ],
      birthDate: patientData.birthDate || null,
      gender: patientData.gender === 'male' ? 'male' : 'female',
    };

    const organization = {
      resourceType: 'Organization',
      id: uuidv4(),
      identifier: [
        {
          system: 'http://nphies.sa/license/payer-license',
          value: coverageData.payerId,
        },
      ],
    };

    const coverage = {
      resourceType: 'Coverage',
      id: coverageId,
      meta: {
        profile: ['http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/coverage|1.0.0'],
      },
      status: 'active',
      subscriber: { reference: `Patient/${patientId}` },
      beneficiary: { reference: `Patient/${patientId}` },
      relationship: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/subscriber-relationship',
            code: coverageData.relationship || 'self',
          },
        ],
      },
      payor: [
        {
          reference: `Organization/${organization.id}`,
        },
      ],
      ...(coverageData.memberId && { subscriberId: coverageData.memberId }),
      ...(coverageData.policyNumber && {
        policyHolder: { identifier: { value: coverageData.policyNumber } },
      }),
    };

    const eligibilityRequest = {
      resourceType: 'CoverageEligibilityRequest',
      id: eligibilityId,
      meta: {
        profile: [
          'http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/eligibility-request|1.0.0',
        ],
      },
      status: 'active',
      purpose: ['benefits'],
      patient: { reference: `Patient/${patientId}` },
      created: new Date().toISOString(),
      provider: {
        identifier: {
          system: 'http://nphies.sa/license/provider-license',
          value: NPHIES_LICENSE_ID,
        },
      },
      insurer: {
        identifier: {
          system: 'http://nphies.sa/license/payer-license',
          value: coverageData.payerId,
        },
      },
      insurance: [
        {
          focal: true,
          coverage: { reference: `Coverage/${coverageId}` },
          ...(coverageData.preAuthRef && { preAuthRef: [coverageData.preAuthRef] }),
        },
      ],
      item: (coverageData.serviceTypes || ['medical']).map((service, idx) => ({
        sequence: idx + 1,
        category: {
          coding: [
            {
              system: 'http://nphies.sa/terminology/CodeSystem/benefit-category',
              code: service,
            },
          ],
        },
      })),
    };

    const bundle = this.buildBundle(
      'eligibility-request',
      [patient, organization, coverage, eligibilityRequest],
      {
        insurerId: coverageData.payerId,
        focusId: eligibilityId,
        focusType: 'CoverageEligibilityRequest',
      }
    );

    // حفظ في DB
    let dbRecord = null;
    if (EligibilityCheck && options.beneficiaryId && options.policyId) {
      try {
        dbRecord = await EligibilityCheck.create({
          beneficiaryId: options.beneficiaryId,
          insurancePolicyId: options.policyId,
          checkDate: new Date(),
          nphiesRequestId: bundle.id,
          status: 'pending',
          rawRequest: bundle,
        });
      } catch (err) {
        logger.warn('[NPHIES] Could not save eligibility check to DB:', err.message);
      }
    }

    const result = await this._sendToNphies(bundle);

    // تحليل الاستجابة وتحديث DB
    if (dbRecord) {
      try {
        const parsed = this._parseEligibilityResponse(result.data || {});
        await EligibilityCheck.findByIdAndUpdate(dbRecord._id, {
          status: result.success ? 'success' : 'error',
          nphiesResponseId: parsed.responseId,
          coverageStatus: parsed.coverageStatus,
          benefits: parsed.benefits,
          exclusions: parsed.exclusions,
          remainingLimit: parsed.remainingLimit,
          rawResponse: result.data,
          errorMessages: result.success ? null : JSON.stringify(result.error),
        });
      } catch (err) {
        logger.warn('[NPHIES] Could not update eligibility check in DB:', err.message);
      }
    }

    logger.info('[NPHIES] Eligibility check submitted', { bundleId: bundle.id });
    return {
      success: result.success,
      data: result.data,
      requestId: bundle.id,
      error: result.error,
    };
  }

  // =========================================================================
  // 3. الموافقة المسبقة
  // =========================================================================

  /**
   * طلب موافقة مسبقة على خدمات التأهيل
   */
  async requestPriorAuthorization(authData, options = {}) {
    const patientId = uuidv4();
    const claimId = uuidv4();

    const patient = this._buildPatient(patientId, authData);

    // بناء رموز ICD-10 كـ diagnoses
    const diagnoses = (authData.diagnosisCodes || []).map((code, idx) => ({
      sequence: idx + 1,
      diagnosisCodeableConcept: {
        coding: [
          {
            system: 'http://hl7.org/fhir/sid/icd-10',
            code,
          },
        ],
      },
      type: [
        {
          coding: [
            { system: 'http://terminology.hl7.org/CodeSystem/ex-diagnosistype', code: 'principal' },
          ],
        },
      ],
    }));

    // بناء بنود الخدمات (CPT codes)
    const items = (authData.serviceCodes || []).map((cptCode, idx) => {
      const cptInfo = REHAB_CPT_CODES[String(cptCode)] || {};
      const sessionCount = authData.requestedSessions || 1;
      const unitPrice = authData.unitPrices?.[cptCode] || 0;
      return {
        sequence: idx + 1,
        productOrService: {
          coding: [
            {
              system: 'http://nphies.sa/terminology/CodeSystem/procedure-code',
              code: String(cptCode),
              display: cptInfo.descAr || cptInfo.desc || `CPT ${cptCode}`,
            },
          ],
        },
        quantity: { value: sessionCount },
        unitPrice: { value: unitPrice, currency: 'SAR' },
        net: { value: unitPrice * sessionCount, currency: 'SAR' },
        servicedPeriod: {
          start: authData.startDate,
          end: authData.endDate,
        },
      };
    });

    const preAuthClaim = {
      resourceType: 'Claim',
      id: claimId,
      meta: {
        profile: ['http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/preauth|1.0.0'],
      },
      status: 'active',
      type: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/claim-type',
            code: authData.claimType || 'professional',
          },
        ],
      },
      use: 'preauthorization',
      patient: { reference: `Patient/${patientId}` },
      created: new Date().toISOString(),
      provider: {
        identifier: {
          system: 'http://nphies.sa/license/provider-license',
          value: NPHIES_LICENSE_ID,
        },
      },
      insurer: {
        identifier: {
          system: 'http://nphies.sa/license/payer-license',
          value: authData.payerId,
        },
      },
      priority: { coding: [{ code: authData.priority || 'normal' }] },
      insurance: [
        {
          sequence: 1,
          focal: true,
          coverage: {
            identifier: {
              system: 'http://nphies.sa/license/payer-license',
              value: authData.payerId,
            },
          },
          ...(authData.eligibilityResponseId && { preAuthRef: [authData.eligibilityResponseId] }),
        },
      ],
      diagnosis: diagnoses,
      item: items,
      total: {
        value: authData.estimatedAmount || 0,
        currency: 'SAR',
      },
    };

    const bundle = this.buildBundle('priorauth-request', [patient, preAuthClaim], {
      insurerId: authData.payerId,
      focusId: claimId,
      focusType: 'Claim',
    });

    // حفظ في DB
    let dbRecord = null;
    if (PriorAuthorization && options.beneficiaryId && options.policyId) {
      try {
        dbRecord = await PriorAuthorization.create({
          beneficiaryId: options.beneficiaryId,
          insurancePolicyId: options.policyId,
          requestDate: new Date(),
          nphiesRequestId: bundle.id,
          serviceCodes: authData.serviceCodes || [],
          diagnosisCodes: authData.diagnosisCodes || [],
          requestedSessions: authData.requestedSessions || 1,
          startDate: authData.startDate ? new Date(authData.startDate) : new Date(),
          endDate: authData.endDate ? new Date(authData.endDate) : new Date(),
          estimatedCost: authData.estimatedAmount || 0,
          status: 'pending',
          rawRequest: bundle,
          eligibilityCheckId: options.eligibilityCheckId,
        });
      } catch (err) {
        logger.warn('[NPHIES] Could not save prior auth to DB:', err.message);
      }
    }

    const result = await this._sendToNphies(bundle);

    // تحليل الاستجابة
    if (dbRecord && result.data) {
      try {
        const parsed = this._parsePreAuthResponse(result.data);
        await PriorAuthorization.findByIdAndUpdate(dbRecord._id, {
          status: parsed.status,
          nphiesResponseId: parsed.responseId,
          preAuthRef: parsed.preAuthRef,
          approvedSessions: parsed.approvedSessions,
          approvedAmount: parsed.approvedAmount,
          approvedStartDate: parsed.approvedStartDate ? new Date(parsed.approvedStartDate) : null,
          approvedEndDate: parsed.approvedEndDate ? new Date(parsed.approvedEndDate) : null,
          rejectionReason: parsed.rejectionReason,
          adjudicationDetails: parsed.adjudication,
          rawResponse: result.data,
        });
      } catch (err) {
        logger.warn('[NPHIES] Could not update prior auth in DB:', err.message);
      }
    }

    logger.info('[NPHIES] Prior authorization request submitted', { bundleId: bundle.id });
    return {
      success: result.success,
      data: result.data,
      preAuthId: claimId,
      requestId: bundle.id,
      error: result.error,
    };
  }

  // =========================================================================
  // 4. تقديم المطالبة
  // =========================================================================

  /**
   * تقديم مطالبة تأمينية
   */
  async submitClaim(claimData, options = {}) {
    const patientId = uuidv4();
    const claimId = uuidv4();

    const patient = this._buildPatient(patientId, {
      idNumber: claimData.patientId,
      name: claimData.patientName,
      birthDate: claimData.patientBirthDate,
      gender: claimData.patientGender,
    });

    // بناء التشخيصات
    const diagnoses = (claimData.diagnosisCodes || []).map((code, idx) => ({
      sequence: idx + 1,
      diagnosisCodeableConcept: {
        coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code }],
      },
      type: [{ coding: [{ code: idx === 0 ? 'principal' : 'secondary' }] }],
    }));

    // بناء بنود الخدمات
    const items = (claimData.services || []).map((service, idx) => {
      const cptInfo = REHAB_CPT_CODES[String(service.code)] || {};
      return {
        sequence: idx + 1,
        productOrService: {
          coding: [
            {
              system: 'http://nphies.sa/terminology/CodeSystem/procedure-code',
              code: String(service.code),
              display: service.name || cptInfo.descAr || cptInfo.desc || `CPT ${service.code}`,
            },
          ],
        },
        quantity: { value: service.quantity || 1, unit: service.unit || 'session' },
        unitPrice: { value: service.unitPrice || 0, currency: 'SAR' },
        net: { value: service.totalPrice || 0, currency: 'SAR' },
        servicedDate: service.date || new Date().toISOString().split('T')[0],
        ...(service.toothNumber && {
          bodySite: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/ex-tooth',
                code: String(service.toothNumber),
              },
            ],
          },
        }),
      };
    });

    const claim = {
      resourceType: 'Claim',
      id: claimId,
      meta: {
        profile: [
          'http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/institutional-claim|1.0.0',
        ],
      },
      status: 'active',
      type: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/claim-type',
            code: claimData.claimType || 'professional',
          },
        ],
      },
      subType: claimData.claimSubtype
        ? {
            coding: [
              {
                system: 'http://nphies.sa/terminology/CodeSystem/claim-subtype',
                code: claimData.claimSubtype,
              },
            ],
          }
        : undefined,
      use: 'claim',
      patient: { reference: `Patient/${patientId}` },
      created: new Date().toISOString(),
      provider: {
        identifier: {
          system: 'http://nphies.sa/license/provider-license',
          value: NPHIES_LICENSE_ID,
        },
      },
      insurer: {
        identifier: {
          system: 'http://nphies.sa/license/payer-license',
          value: claimData.payerId,
        },
      },
      priority: { coding: [{ code: claimData.priority || 'normal' }] },
      insurance: [
        {
          sequence: 1,
          focal: true,
          coverage: {
            identifier: {
              system: 'http://nphies.sa/license/payer-license',
              value: claimData.payerId,
            },
          },
          ...(claimData.preAuthRef && { preAuthRef: [claimData.preAuthRef] }),
          ...(claimData.eligibilityRef && {
            claimResponse: { identifier: { value: claimData.eligibilityRef } },
          }),
        },
      ],
      diagnosis: diagnoses,
      item: items,
      total: { value: claimData.totalAmount || 0, currency: 'SAR' },
    };

    const bundle = this.buildBundle('claim-request', [patient, claim], {
      insurerId: claimData.payerId,
      focusId: claimId,
      focusType: 'Claim',
    });

    // حفظ في DB
    let dbRecord = null;
    if (InsuranceClaim && options.beneficiaryId && options.policyId) {
      try {
        const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        dbRecord = await InsuranceClaim.create({
          beneficiaryId: options.beneficiaryId,
          insurancePolicyId: options.policyId,
          priorAuthorizationId: options.priorAuthorizationId || null,
          eligibilityCheckId: options.eligibilityCheckId || null,
          claimNumber,
          nphiesBundleId: bundle.id,
          claimDate: new Date(),
          serviceStartDate: claimData.serviceStartDate
            ? new Date(claimData.serviceStartDate)
            : new Date(),
          serviceEndDate: claimData.serviceEndDate
            ? new Date(claimData.serviceEndDate)
            : new Date(),
          claimType: claimData.claimType || 'professional',
          claimSubtype: claimData.claimSubtype || 'op',
          totalAmount: claimData.totalAmount || 0,
          status: 'submitted',
          submissionDate: new Date(),
          rawRequest: bundle,
          items: (claimData.services || []).map((s, idx) => ({
            sequence: idx + 1,
            serviceDate: s.date ? new Date(s.date) : new Date(),
            cptCode: String(s.code),
            cptDescription: s.name,
            icd10Code: claimData.diagnosisCodes?.[0] || null,
            quantity: s.quantity || 1,
            unitPrice: s.unitPrice || 0,
            totalPrice: s.totalPrice || 0,
          })),
        });
      } catch (err) {
        logger.warn('[NPHIES] Could not save claim to DB:', err.message);
      }
    }

    const result = await this._sendToNphies(bundle);

    // تحليل الاستجابة وتحديث DB
    if (dbRecord && result.data) {
      try {
        const parsed = this._parseClaimResponse(result.data);
        await InsuranceClaim.findByIdAndUpdate(dbRecord._id, {
          status: parsed.status,
          nphiesClaimId: parsed.claimId,
          responseDate: new Date(),
          approvedAmount: parsed.totalApproved,
          patientShare: parsed.totalPatientShare,
          rejectionReasons: parsed.rejectionReasons,
          adjudicationDetails: parsed.adjudication,
          rawResponse: result.data,
        });
      } catch (err) {
        logger.warn('[NPHIES] Could not update claim in DB:', err.message);
      }
    }

    logger.info('[NPHIES] Claim submitted', { bundleId: bundle.id, claimId });
    return {
      success: result.success,
      data: result.data,
      claimId,
      requestId: bundle.id,
      error: result.error,
    };
  }

  // =========================================================================
  // 5. استعلام حالة المطالبة
  // =========================================================================

  async inquireClaimStatus(claimId, payerId) {
    const taskId = uuidv4();
    const statusRequest = {
      resourceType: 'Task',
      id: taskId,
      meta: {
        profile: ['http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/status-task|1.0.0'],
      },
      status: 'requested',
      intent: 'order',
      code: {
        coding: [
          {
            system: 'http://nphies.sa/terminology/CodeSystem/task-code',
            code: 'status-check',
          },
        ],
      },
      focus: { reference: `Claim/${claimId}` },
      authoredOn: new Date().toISOString(),
      input: [
        {
          type: {
            coding: [
              {
                system: 'http://nphies.sa/terminology/CodeSystem/task-input',
                code: 'payer-id',
              },
            ],
          },
          valueIdentifier: {
            system: 'http://nphies.sa/license/payer-license',
            value: payerId,
          },
        },
      ],
    };

    const bundle = this.buildBundle('status-request', [statusRequest], {
      insurerId: payerId,
      focusId: taskId,
      focusType: 'Task',
    });

    const result = await this._sendToNphies(bundle);
    logger.info('[NPHIES] Claim status inquiry sent', { claimId });
    return { success: result.success, data: result.data, error: result.error };
  }

  // =========================================================================
  // 6. إلغاء مطالبة
  // =========================================================================

  async cancelClaim(claimId, reason) {
    const taskId = uuidv4();
    const cancelTask = {
      resourceType: 'Task',
      id: taskId,
      meta: {
        profile: ['http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/cancel-task|1.0.0'],
      },
      status: 'requested',
      intent: 'order',
      code: {
        coding: [
          {
            system: 'http://nphies.sa/terminology/CodeSystem/task-code',
            code: 'cancel',
          },
        ],
      },
      focus: { reference: `Claim/${claimId}` },
      authoredOn: new Date().toISOString(),
      input: [
        {
          type: {
            coding: [
              {
                system: 'http://nphies.sa/terminology/CodeSystem/task-input',
                code: 'reason',
              },
            ],
          },
          valueString: reason || 'طلب الإلغاء من قِبل المزود',
        },
      ],
    };

    const bundle = this.buildBundle('cancel-request', [cancelTask], {
      focusId: taskId,
      focusType: 'Task',
    });

    // تحديث DB
    if (InsuranceClaim) {
      try {
        await InsuranceClaim.findOneAndUpdate({ nphiesClaimId: claimId }, { status: 'cancelled' });
      } catch (err) {
        logger.warn('[NPHIES] Could not update claim status in DB:', err.message);
      }
    }

    const result = await this._sendToNphies(bundle);
    logger.info('[NPHIES] Claim cancellation sent', { claimId });
    return { success: result.success, data: result.data, error: result.error };
  }

  // =========================================================================
  // 7. الاستجابة لطلب مستندات إضافية
  // =========================================================================

  async respondToCommunication(communicationData) {
    const commId = uuidv4();
    const communication = {
      resourceType: 'Communication',
      id: commId,
      meta: {
        profile: ['http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/communication|1.0.0'],
      },
      status: 'completed',
      about: communicationData.claimId ? [{ reference: `Claim/${communicationData.claimId}` }] : [],
      sent: new Date().toISOString(),
      recipient: [
        {
          identifier: {
            system: 'http://nphies.sa/license/payer-license',
            value: communicationData.payerId || '',
          },
        },
      ],
      sender: {
        identifier: {
          system: 'http://nphies.sa/license/provider-license',
          value: NPHIES_LICENSE_ID,
        },
      },
      payload: [
        {
          contentString: communicationData.message || '',
        },
        ...(communicationData.documents || []).map(doc => ({
          contentAttachment: {
            contentType: doc.mimeType || 'application/pdf',
            data: doc.base64Data || '',
            title: doc.title || 'مستند',
          },
        })),
      ],
    };

    if (communicationData.requestId) {
      communication.inResponseTo = [
        { reference: `CommunicationRequest/${communicationData.requestId}` },
      ];
    }

    const bundle = this.buildBundle('communication', [communication], {
      insurerId: communicationData.payerId,
      focusId: commId,
      focusType: 'Communication',
    });

    const result = await this._sendToNphies(bundle);
    logger.info('[NPHIES] Communication response sent', { commId });
    return { success: result.success, data: result.data, error: result.error };
  }

  // =========================================================================
  // 8. تسوية الدفع (Payment Reconciliation)
  // =========================================================================

  async reconcilePayment(paymentReference, payerId) {
    const taskId = uuidv4();
    const pollRequest = {
      resourceType: 'Task',
      id: taskId,
      status: 'requested',
      intent: 'order',
      code: {
        coding: [
          {
            system: 'http://nphies.sa/terminology/CodeSystem/task-code',
            code: 'poll',
          },
        ],
      },
      authoredOn: new Date().toISOString(),
      input: [
        {
          type: {
            coding: [
              {
                system: 'http://nphies.sa/terminology/CodeSystem/task-input',
                code: 'payment-reference',
              },
            ],
          },
          valueString: paymentReference,
        },
      ],
    };

    const bundle = this.buildBundle('poll-request', [pollRequest], {
      insurerId: payerId,
      focusId: taskId,
      focusType: 'Task',
    });

    const result = await this._sendToNphies(bundle);

    // تحليل PaymentReconciliation
    if (result.success && result.data) {
      const parsed = this._parsePaymentReconciliation(result.data);

      // تحديث المطالبات المدفوعة في DB
      if (InsuranceClaim && parsed.claimPayments) {
        for (const payment of parsed.claimPayments) {
          try {
            await InsuranceClaim.findOneAndUpdate(
              { nphiesClaimId: payment.claimReference },
              {
                paidAmount: payment.paidAmount,
                paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : null,
                status: payment.paidAmount > 0 ? 'paid' : 'rejected',
              }
            );
          } catch (err) {
            logger.warn('[NPHIES] Could not update claim payment:', err.message);
          }
        }
      }

      return { success: true, data: result.data, reconciliation: parsed };
    }

    return { success: result.success, data: result.data, error: result.error };
  }

  // =========================================================================
  // 9. إرسال إلى NPHIES API
  // =========================================================================

  async _sendToNphies(bundle) {
    const token = this.accessToken || NPHIES_ACCESS_TOKEN;

    if (!NPHIES_LICENSE_ID && !token) {
      logger.warn('[NPHIES] License ID not configured — skipping API call');
      return {
        success: false,
        skipped: true,
        error: 'NPHIES credentials not configured',
        bundleId: bundle.id,
      };
    }

    try {
      const headers = {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(NPHIES_BASE_URL, bundle, {
        headers,
        timeout: 60000,
      });

      logger.info('[NPHIES] Message sent successfully', {
        bundleId: bundle.id,
        status: response.status,
      });

      return { success: true, data: response.data, status: response.status };
    } catch (err) {
      const errData = err.response?.data;
      logger.error('[NPHIES] API Error:', errData || err.message);

      // فحص OperationOutcome
      if (errData?.resourceType === 'OperationOutcome') {
        const issues = errData.issue || [];
        const errors = issues
          .filter(i => i.severity === 'error')
          .map(i => i.diagnostics || i.details?.text || 'Unknown error');

        return {
          success: false,
          error: errors.length > 0 ? errors.join('; ') : err.message,
          status: err.response?.status,
          operationOutcome: errData,
        };
      }

      return {
        success: false,
        error: errData || err.message,
        status: err.response?.status,
      };
    }
  }

  // =========================================================================
  // 10. تحليل الاستجابات
  // =========================================================================

  _parseEligibilityResponse(responseBundle) {
    const entries = responseBundle?.entry || [];
    const eligResponse = entries.find(
      e => e.resource?.resourceType === 'CoverageEligibilityResponse'
    );
    const resource = eligResponse?.resource || {};
    const insurance = resource?.insurance?.[0] || {};

    const benefits = [];
    for (const item of insurance?.item || []) {
      for (const benefit of item?.benefit || []) {
        benefits.push({
          type: benefit?.type?.coding?.[0]?.code || '',
          allowed: benefit?.allowedMoney?.value ?? benefit?.allowedUnsignedInt ?? null,
          used: benefit?.usedMoney?.value ?? benefit?.usedUnsignedInt ?? null,
          currency: benefit?.allowedMoney?.currency || 'SAR',
        });
      }
    }

    const exclusions = (insurance?.item || [])
      .filter(i => i?.excluded === true)
      .map(i => i?.category?.coding?.[0]?.display || 'غير معروف');

    let remainingLimit = null;
    const annualBenefit = benefits.find(b => b.type === 'benefit' && b.allowed && b.used);
    if (annualBenefit) {
      remainingLimit = annualBenefit.allowed - annualBenefit.used;
    }

    return {
      responseId: resource?.id || null,
      coverageStatus: insurance?.inforce ? 'active' : 'inactive',
      benefits,
      exclusions,
      remainingLimit,
    };
  }

  _parsePreAuthResponse(responseBundle) {
    const entries = responseBundle?.entry || [];
    const claimResp = entries.find(e => e.resource?.resourceType === 'ClaimResponse');
    const resource = claimResp?.resource || {};
    const outcome = resource?.outcome || 'error';

    const statusMap = {
      complete: 'approved',
      partial: 'partially_approved',
      error: 'rejected',
      queued: 'pending',
    };

    let approvedSessions = 0;
    const rejectionReasons = [];

    for (const item of resource?.item || []) {
      for (const adj of item?.adjudication || []) {
        const code = adj?.category?.coding?.[0]?.code || '';
        if (code === 'benefit') approvedSessions += adj?.value || 0;
        if (code === 'denial-reason') {
          const reason = adj?.reason?.coding?.[0]?.display || adj?.reason?.text || '';
          if (reason) rejectionReasons.push(reason);
        }
      }
    }

    return {
      responseId: resource?.id || null,
      status: statusMap[outcome] || 'rejected',
      preAuthRef: resource?.preAuthRef || null,
      approvedSessions: Math.round(approvedSessions),
      approvedAmount: resource?.total?.[0]?.amount?.value || null,
      approvedStartDate: resource?.preAuthPeriod?.start || null,
      approvedEndDate: resource?.preAuthPeriod?.end || null,
      rejectionReason: rejectionReasons.length > 0 ? rejectionReasons.join('; ') : null,
      adjudication: resource?.item || [],
    };
  }

  _parseClaimResponse(responseBundle) {
    const entries = responseBundle?.entry || [];
    const claimResp = entries.find(e => e.resource?.resourceType === 'ClaimResponse');
    const resource = claimResp?.resource || {};
    const outcome = resource?.outcome || 'error';

    const items = [];
    let totalApproved = 0;
    let totalPatientShare = 0;
    const rejectionReasons = [];

    for (const item of resource?.item || []) {
      let itemApproved = 0,
        itemPatientShare = 0,
        itemRejection = null,
        adjCode = null;
      for (const adj of item?.adjudication || []) {
        const code = adj?.category?.coding?.[0]?.code || '';
        if (code === 'benefit') itemApproved = adj?.amount?.value || 0;
        else if (code === 'copay') itemPatientShare = adj?.amount?.value || 0;
        else if (code === 'denial-reason') {
          itemRejection = adj?.reason?.coding?.[0]?.display || '';
          adjCode = adj?.reason?.coding?.[0]?.code || null;
        }
      }
      const itemStatus = itemApproved > 0 ? 'approved' : itemRejection ? 'rejected' : 'pending';
      items.push({
        sequence: item?.itemSequence || 0,
        status: itemStatus,
        approved_amount: itemApproved,
        patient_share: itemPatientShare,
        rejection_reason: itemRejection,
        adjudication_code: adjCode,
      });
      totalApproved += itemApproved;
      totalPatientShare += itemPatientShare;
      if (itemRejection) rejectionReasons.push(itemRejection);
    }

    const hasRejections = rejectionReasons.length > 0;
    const statusMap = {
      complete: hasRejections ? 'partially_approved' : 'approved',
      partial: 'partially_approved',
      error: 'rejected',
    };

    return {
      claimId: resource?.id || null,
      status: statusMap[outcome] || 'rejected',
      totalApproved,
      totalPatientShare,
      rejectionReasons,
      adjudication: resource?.item || [],
      items,
    };
  }

  _parsePaymentReconciliation(responseBundle) {
    const entries = responseBundle?.entry || [];
    const payRec = entries.find(e => e.resource?.resourceType === 'PaymentReconciliation');
    const resource = payRec?.resource || {};

    const claimPayments = (resource?.detail || []).map(detail => ({
      claimReference: detail?.request?.reference?.split('/').pop() || '',
      paidAmount: detail?.amount?.value || 0,
      paymentDate: resource?.paymentDate || null,
      type: detail?.type?.coding?.[0]?.code || '',
    }));

    return {
      paymentId: resource?.id || null,
      totalAmount: resource?.paymentAmount?.value || 0,
      paymentDate: resource?.paymentDate || null,
      period: {
        start: resource?.period?.start || null,
        end: resource?.period?.end || null,
      },
      claimPayments,
    };
  }

  // =========================================================================
  // 11. Helper Methods
  // =========================================================================

  _buildPatient(patientId, data) {
    return {
      resourceType: 'Patient',
      id: patientId,
      meta: {
        profile: ['http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/patient|1.0.0'],
      },
      identifier: [
        {
          system:
            data.idType === 'iqama'
              ? 'http://nphies.sa/identifier/iqamaId'
              : 'http://nphies.sa/identifier/nationalId',
          value: data.idNumber || '',
        },
      ],
      name: [
        {
          use: 'official',
          text: data.name || '',
          family: data.familyName || (data.name || '').split(' ').pop() || '',
          given: [(data.name || '').split(' ')[0] || ''],
        },
      ],
      birthDate: data.birthDate || null,
      gender: data.gender === 'male' ? 'male' : 'female',
    };
  }

  /**
   * الحصول على رموز CPT لمراكز التأهيل
   */
  getRehabCptCodes() {
    return REHAB_CPT_CODES;
  }

  /**
   * الحصول على وصف رمز CPT
   */
  getCptDescription(code) {
    return REHAB_CPT_CODES[String(code)] || { desc: `CPT ${code}`, descAr: `رمز CPT ${code}` };
  }

  /**
   * حالة خدمة NPHIES
   */
  getStatus() {
    return {
      service: 'NPHIES',
      env: NPHIES_ENV,
      baseUrl: NPHIES_BASE_URL,
      configured: !!(NPHIES_LICENSE_ID || this.accessToken),
      standard: 'HL7 FHIR R4',
      features: [
        'Eligibility Verification',
        'Prior Authorization',
        'Claims Submission',
        'Claim Status Inquiry',
        'Claim Cancellation',
        'Communication Response',
        'Payment Reconciliation',
      ],
      cptCodes: Object.keys(REHAB_CPT_CODES).length,
    };
  }
}

module.exports = new NphiesService();
module.exports.NphiesService = NphiesService;
module.exports.REHAB_CPT_CODES = REHAB_CPT_CODES;
