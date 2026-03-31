/**
 * NPHIES Service — المنصة الوطنية لتبادل المعلومات الصحية والتأمينية
 * HL7 FHIR R4 - مجلس الضمان الصحي (CHI)
 */
'use strict';

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const NPHIES_ENV = process.env.NPHIES_ENV || 'sandbox';
const NPHIES_BASE_URL =
  NPHIES_ENV === 'production'
    ? process.env.NPHIES_BASE_URL || 'https://HSB.nphies.sa/$process-message'
    : 'https://HSB.nphies.sa/test/$process-message';

const NPHIES_SENDER_ID = process.env.NPHIES_SENDER_ID || '';
const NPHIES_LICENSE_ID = process.env.NPHIES_LICENSE_ID || '';
const NPHIES_PROVIDER_ID = process.env.NPHIES_PROVIDER_ID || '';

class NphiesService {
  constructor() {
    this.client = axios.create({
      baseURL: NPHIES_BASE_URL,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  // ─── بناء FHIR Bundle ─────────────────────────────────────────────────────
  /**
   * بناء FHIR Bundle Message أساسي
   */
  buildBundle(messageType, resources = []) {
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    return {
      resourceType: 'Bundle',
      id: messageId,
      meta: { lastUpdated: timestamp },
      type: 'message',
      timestamp,
      entry: [
        {
          fullUrl: `urn:uuid:${uuidv4()}`,
          resource: {
            resourceType: 'MessageHeader',
            id: uuidv4(),
            eventCoding: {
              system: 'http://nphies.sa/terminology/CodeSystem/ksa-message-events',
              code: messageType,
            },
            destination: [
              {
                endpoint: NPHIES_BASE_URL,
                receiver: {
                  type: 'Organization',
                  identifier: { system: 'http://nphies.sa/license/nphies-license', value: '0000' },
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
          },
        },
        ...resources.map(resource => ({
          fullUrl: `urn:uuid:${resource.id || uuidv4()}`,
          resource,
        })),
      ],
    };
  }

  // ─── التحقق من أهلية التأمين ─────────────────────────────────────────────
  /**
   * التحقق من أهلية مريض للتأمين الصحي
   */
  async checkEligibility(patientData, coverageData) {
    try {
      const patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        identifier: [
          {
            system: patientData.idType === 'national' ? 'urn:oid:1.2.682.1' : 'urn:oid:1.2.682.2',
            value: patientData.idNumber,
          },
        ],
        name: [{ text: patientData.name, family: patientData.familyName || '' }],
        birthDate: patientData.birthDate,
        gender: patientData.gender === 'male' ? 'male' : 'female',
      };

      const coverage = {
        resourceType: 'Coverage',
        id: uuidv4(),
        status: 'active',
        subscriber: { reference: `Patient/${patient.id}` },
        beneficiary: { reference: `Patient/${patient.id}` },
        payor: [
          {
            type: 'Organization',
            identifier: {
              system: 'http://nphies.sa/license/payer-license',
              value: coverageData.payerId,
            },
          },
        ],
        ...(coverageData.memberId && {
          subscriberId: coverageData.memberId,
          dependent: coverageData.dependent,
        }),
      };

      const eligibilityRequest = {
        resourceType: 'CoverageEligibilityRequest',
        id: uuidv4(),
        status: 'active',
        purpose: ['benefits'],
        patient: { reference: `Patient/${patient.id}` },
        created: new Date().toISOString(),
        provider: {
          identifier: {
            system: 'http://nphies.sa/license/provider-license',
            value: NPHIES_LICENSE_ID,
          },
        },
        insurance: [{ coverage: { reference: `Coverage/${coverage.id}` } }],
        item: (coverageData.serviceTypes || ['medical']).map(service => ({
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

      const bundle = this.buildBundle('eligibility-request', [
        patient,
        coverage,
        eligibilityRequest,
      ]);
      const response = await this.client.post('', bundle);

      logger.info('[NPHIES] Eligibility check submitted');
      return { success: true, data: response.data, requestId: bundle.id };
    } catch (err) {
      logger.error('[NPHIES] checkEligibility error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  // ─── تقديم مطالبة تأمينية ─────────────────────────────────────────────────
  /**
   * تقديم مطالبة تأمينية لـ NPHIES
   */
  async submitClaim(claimData) {
    try {
      const patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        identifier: [{ value: claimData.patientId }],
        name: [{ text: claimData.patientName }],
        birthDate: claimData.patientBirthDate,
        gender: claimData.patientGender || 'unknown',
      };

      const claim = {
        resourceType: 'Claim',
        id: uuidv4(),
        status: 'active',
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/claim-type',
              code: claimData.claimType || 'professional',
            },
          ],
        },
        use: 'claim',
        patient: { reference: `Patient/${patient.id}` },
        created: new Date().toISOString(),
        provider: {
          identifier: {
            system: 'http://nphies.sa/license/provider-license',
            value: NPHIES_LICENSE_ID,
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
          },
        ],
        total: {
          value: claimData.totalAmount,
          currency: 'SAR',
        },
        item: (claimData.services || []).map((service, idx) => ({
          sequence: idx + 1,
          productOrService: {
            coding: [
              {
                system: 'http://nphies.sa/terminology/CodeSystem/services',
                code: service.code,
                display: service.name,
              },
            ],
          },
          quantity: { value: service.quantity || 1 },
          unitPrice: { value: service.unitPrice, currency: 'SAR' },
          net: { value: service.totalPrice, currency: 'SAR' },
          servicedDate: service.date || new Date().toISOString().split('T')[0],
        })),
      };

      const bundle = this.buildBundle('claim-request', [patient, claim]);
      const response = await this.client.post('', bundle);

      logger.info('[NPHIES] Claim submitted successfully');
      return { success: true, data: response.data, claimId: claim.id, requestId: bundle.id };
    } catch (err) {
      logger.error('[NPHIES] submitClaim error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  // ─── طلب الموافقة المسبقة ─────────────────────────────────────────────────
  /**
   * طلب موافقة مسبقة (Prior Authorization)
   */
  async requestPriorAuthorization(authData) {
    try {
      const patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        identifier: [{ value: authData.patientId }],
        name: [{ text: authData.patientName }],
      };

      const priorAuthRequest = {
        resourceType: 'Claim',
        id: uuidv4(),
        status: 'active',
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/claim-type',
              code: authData.serviceType || 'professional',
            },
          ],
        },
        use: 'preauthorization',
        patient: { reference: `Patient/${patient.id}` },
        created: new Date().toISOString(),
        provider: {
          identifier: {
            system: 'http://nphies.sa/license/provider-license',
            value: NPHIES_LICENSE_ID,
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
          },
        ],
        total: {
          value: authData.estimatedAmount || 0,
          currency: 'SAR',
        },
        item: (authData.services || []).map((service, idx) => ({
          sequence: idx + 1,
          productOrService: {
            coding: [
              {
                system: 'http://nphies.sa/terminology/CodeSystem/services',
                code: service.code,
                display: service.name,
              },
            ],
          },
          quantity: { value: service.quantity || 1 },
          unitPrice: { value: service.unitPrice || 0, currency: 'SAR' },
          net: { value: service.totalPrice || 0, currency: 'SAR' },
        })),
      };

      const bundle = this.buildBundle('priorauth-request', [patient, priorAuthRequest]);
      const response = await this.client.post('', bundle);

      logger.info('[NPHIES] Prior authorization request submitted');
      return {
        success: true,
        data: response.data,
        preAuthId: priorAuthRequest.id,
        requestId: bundle.id,
      };
    } catch (err) {
      logger.error('[NPHIES] requestPriorAuthorization error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  // ─── استعلام حالة المطالبة ────────────────────────────────────────────────
  /**
   * الاستعلام عن حالة مطالبة مقدمة
   */
  async inquireClaimStatus(claimId, payerId) {
    try {
      const statusRequest = {
        resourceType: 'Task',
        id: uuidv4(),
        status: 'requested',
        intent: 'order',
        focus: { reference: `Claim/${claimId}` },
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

      const bundle = this.buildBundle('status-request', [statusRequest]);
      const response = await this.client.post('', bundle);

      logger.info('[NPHIES] Claim status inquiry sent');
      return { success: true, data: response.data };
    } catch (err) {
      logger.error('[NPHIES] inquireClaimStatus error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  // ─── إلغاء مطالبة ────────────────────────────────────────────────────────
  /**
   * إلغاء مطالبة مقدمة
   */
  async cancelClaim(claimId, reason) {
    try {
      const cancelTask = {
        resourceType: 'Task',
        id: uuidv4(),
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

      const bundle = this.buildBundle('cancel-request', [cancelTask]);
      const response = await this.client.post('', bundle);

      logger.info('[NPHIES] Claim cancellation sent');
      return { success: true, data: response.data };
    } catch (err) {
      logger.error('[NPHIES] cancelClaim error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }
}

module.exports = new NphiesService();
