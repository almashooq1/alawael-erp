/**
 * Smart Insurance Service — NPHIES Integration
 * System 40: التأمين الذكي وربط NPHIES
 */

'use strict';

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const InsuranceCompany = require('../models/InsuranceCompany');
const InsurancePolicy = require('../models/InsurancePolicy');
const InsuranceClaim = require('../models/InsuranceClaim');
const PriorAuthorization = require('../models/PriorAuthorization');
const InsuranceEligibilityCheck = require('../models/InsuranceEligibilityCheck');

class SmartInsuranceService {
  // ── فحص الأهلية التأمينية ──────────────────────────────────────────────────
  async checkEligibility(policyId, options = {}) {
    const policy = await InsurancePolicy.findOne({ _id: policyId, deletedAt: null }).populate(
      'insuranceCompanyId'
    );
    if (!policy) throw Object.assign(new Error('وثيقة التأمين غير موجودة'), { status: 404 });

    const company = policy.insuranceCompanyId;
    const startTime = Date.now();

    const check = await InsuranceEligibilityCheck.create({
      policyId: policy._id,
      beneficiaryId: policy.beneficiaryId,
      checkType: options.checkType || 'general',
      requestedService: options.serviceCode || null,
      branchId: options.branchId,
      createdBy: options.userId,
    });

    try {
      let result;
      if (company.supportsNphies && company.nphiesId) {
        result = await this._nphiesEligibilityCheck(policy, company, options);
      } else {
        result = await this._localEligibilityCheck(policy, options);
      }

      const responseTimeMs = Date.now() - startTime;

      await InsuranceEligibilityCheck.findByIdAndUpdate(check._id, {
        nphiesCheckId: result.nphiesCheckId || null,
        isEligible: result.isEligible,
        remainingCoverage: result.remainingCoverage,
        coverageDetails: result.coverageDetails,
        nphiesResponse: result.rawResponse || null,
        responseTimeMs,
        status: 'completed',
      });

      return { ...result, checkId: check._id, responseTimeMs };
    } catch (err) {
      await InsuranceEligibilityCheck.findByIdAndUpdate(check._id, {
        status: 'failed',
        errorMessage: err.message,
        responseTimeMs: Date.now() - startTime,
      });
      throw err;
    }
  }

  // فحص الأهلية عبر NPHIES
  async _nphiesEligibilityCheck(policy, company, options) {
    const payload = {
      resourceType: 'CoverageEligibilityRequest',
      id: uuidv4(),
      status: 'active',
      purpose: ['benefits'],
      patient: { reference: `Patient/${policy.beneficiaryId}` },
      created: new Date().toISOString(),
      insurer: { reference: `Organization/${company.nphiesId}` },
      insurance: [
        {
          focal: true,
          coverage: {
            reference: `Coverage/${policy.nphiesPolicyId || policy._id}`,
            identifier: { value: policy.memberId },
          },
        },
      ],
    };

    if (options.serviceCode) {
      payload.item = [
        {
          category: {
            coding: [
              {
                system: 'http://nphies.sa/terminology/CodeSystem/benefit-category',
                code: options.serviceCode,
              },
            ],
          },
        },
      ];
    }

    const response = await this._callNphiesApi(company, '/CoverageEligibilityRequest', payload);

    const eligible = response?.outcome !== 'error';
    const benefit = response?.insurance?.[0]?.benefit?.[0];

    return {
      isEligible: eligible,
      nphiesCheckId: response?.id,
      remainingCoverage: benefit?.used?.value
        ? policy.coverageLimit - benefit.used.value
        : policy.coverageLimit - policy.usedCoverage,
      coverageDetails: response?.insurance?.[0] || {},
      rawResponse: response,
    };
  }

  // فحص محلي بدون NPHIES
  async _localEligibilityCheck(policy, options) {
    const now = new Date();
    const isActive = policy.status === 'active' && policy.endDate > now;
    const remaining = policy.coverageLimit - policy.usedCoverage;

    return {
      isEligible: isActive && remaining > 0,
      remainingCoverage: remaining,
      coverageDetails: {
        planType: policy.planType,
        deductible: policy.deductibleAmount,
        copay: policy.copayPercentage,
        coveredServices: policy.coveredServices,
        excludedServices: policy.excludedServices,
      },
    };
  }

  // ── تقديم مطالبة تأمينية ──────────────────────────────────────────────────
  async submitClaim(data) {
    const policy = await InsurancePolicy.findOne({ _id: data.policyId, deletedAt: null }).populate(
      'insuranceCompanyId'
    );
    if (!policy) throw Object.assign(new Error('وثيقة التأمين غير موجودة'), { status: 404 });
    if (policy.status !== 'active')
      throw Object.assign(new Error('وثيقة التأمين غير فعالة'), { status: 422 });

    const company = policy.insuranceCompanyId;

    // إنشاء المطالبة
    const claimNumber = await this._generateClaimNumber();
    const claim = await InsuranceClaim.create({
      claimNumber,
      claimUuid: uuidv4(),
      policyId: policy._id,
      beneficiaryId: policy.beneficiaryId,
      insuranceCompanyId: company._id,
      serviceSessionId: data.serviceSessionId || null,
      claimType: data.claimType || 'professional',
      billedAmount: data.billedAmount,
      diagnosisCodes: data.diagnosisCodes || [],
      procedureCodes: data.procedureCodes || [],
      lineItems: data.lineItems || [],
      priorAuthId: data.priorAuthId || null,
      serviceDate: data.serviceDate || new Date(),
      status: 'draft',
      branchId: data.branchId,
      createdBy: data.userId,
    });

    // إرسال عبر NPHIES إذا كان مدعوماً
    if (company.supportsNphies && company.nphiesId && company.supportsElectronicClaims) {
      try {
        const nphiesResult = await this._submitNphiesClaim(claim, policy, company);
        await InsuranceClaim.findByIdAndUpdate(claim._id, {
          nphiesClaimId: nphiesResult.claimId,
          status: 'submitted',
          submittedAt: new Date(),
        });
        return InsuranceClaim.findById(claim._id);
      } catch (err) {
        await InsuranceClaim.findByIdAndUpdate(claim._id, {
          status: 'draft',
          submissionError: err.message,
        });
        throw err;
      }
    } else {
      // حفظ كمسودة للإرسال اليدوي
      await InsuranceClaim.findByIdAndUpdate(claim._id, { status: 'pending' });
      return InsuranceClaim.findById(claim._id);
    }
  }

  // إرسال المطالبة عبر NPHIES
  async _submitNphiesClaim(claim, policy, company) {
    const payload = {
      resourceType: 'Claim',
      id: claim.claimUuid,
      status: 'active',
      type: {
        coding: [
          { system: 'http://terminology.hl7.org/CodeSystem/claim-type', code: claim.claimType },
        ],
      },
      use: 'claim',
      patient: { reference: `Patient/${claim.beneficiaryId}` },
      created: new Date().toISOString(),
      insurer: { reference: `Organization/${company.nphiesId}` },
      provider: { reference: `Organization/${process.env.NPHIES_PROVIDER_ID}` },
      priority: { coding: [{ code: 'normal' }] },
      insurance: [
        {
          sequence: 1,
          focal: true,
          coverage: { reference: `Coverage/${policy.nphiesPolicyId}` },
          preAuthRef: claim.priorAuthId ? [claim.priorAuthId.toString()] : [],
        },
      ],
      total: { value: claim.billedAmount, currency: 'SAR' },
      diagnosis: claim.diagnosisCodes.map((code, i) => ({
        sequence: i + 1,
        diagnosisCodeableConcept: {
          coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code }],
        },
      })),
      item: claim.lineItems.map((item, i) => ({
        sequence: i + 1,
        productOrService: {
          coding: [
            {
              system: 'http://nphies.sa/terminology/CodeSystem/procedures',
              code: item.serviceCode,
            },
          ],
        },
        quantity: { value: item.quantity || 1 },
        unitPrice: { value: item.unitPrice, currency: 'SAR' },
        net: { value: item.totalPrice, currency: 'SAR' },
      })),
    };

    const response = await this._callNphiesApi(company, '/Claim', payload);
    return { claimId: response?.id, status: response?.status };
  }

  // ── طلب الموافقة المسبقة ──────────────────────────────────────────────────
  async requestPriorAuth(data) {
    const policy = await InsurancePolicy.findOne({ _id: data.policyId, deletedAt: null }).populate(
      'insuranceCompanyId'
    );
    if (!policy) throw Object.assign(new Error('وثيقة التأمين غير موجودة'), { status: 404 });

    const company = policy.insuranceCompanyId;

    const authNumber = await this._generateAuthNumber();
    const auth = await PriorAuthorization.create({
      authNumber,
      authUuid: uuidv4(),
      policyId: policy._id,
      beneficiaryId: policy.beneficiaryId,
      insuranceCompanyId: company._id,
      serviceType: data.serviceType,
      clinicalJustification: data.clinicalJustification,
      requestedServices: data.requestedServices || [],
      estimatedStartDate: data.estimatedStartDate,
      estimatedEndDate: data.estimatedEndDate,
      status: 'pending',
      branchId: data.branchId,
      createdBy: data.userId,
    });

    if (company.supportsNphies && company.supportsPriorAuth) {
      try {
        const nphiesResult = await this._submitNphiesPriorAuth(auth, policy, company);
        await PriorAuthorization.findByIdAndUpdate(auth._id, {
          nphiesAuthId: nphiesResult.authId,
          status: 'submitted',
          submittedAt: new Date(),
        });
      } catch (err) {
        await PriorAuthorization.findByIdAndUpdate(auth._id, {
          status: 'pending',
          submissionError: err.message,
        });
      }
    }

    return PriorAuthorization.findById(auth._id);
  }

  // إرسال طلب موافقة مسبقة عبر NPHIES
  async _submitNphiesPriorAuth(auth, policy, company) {
    const payload = {
      resourceType: 'Claim',
      id: auth.authUuid,
      status: 'active',
      type: { coding: [{ code: 'preauthorization' }] },
      use: 'preauthorization',
      patient: { reference: `Patient/${auth.beneficiaryId}` },
      created: new Date().toISOString(),
      insurer: { reference: `Organization/${company.nphiesId}` },
      provider: { reference: `Organization/${process.env.NPHIES_PROVIDER_ID}` },
      priority: { coding: [{ code: 'normal' }] },
      insurance: [
        { sequence: 1, focal: true, coverage: { reference: `Coverage/${policy.nphiesPolicyId}` } },
      ],
      supportingInfo: [
        {
          sequence: 1,
          category: { coding: [{ code: 'clinical-note' }] },
          valueString: auth.clinicalJustification,
        },
      ],
      item: auth.requestedServices.map((svc, i) => ({
        sequence: i + 1,
        productOrService: { coding: [{ code: svc.serviceCode }] },
        quantity: { value: svc.quantity || 1 },
        unitPrice: { value: svc.estimatedCost, currency: 'SAR' },
      })),
    };

    const response = await this._callNphiesApi(company, '/Claim', payload);
    return { authId: response?.id };
  }

  // ── الحصول على حالة NPHIES ────────────────────────────────────────────────
  async getNphiesStatus(resourceType, nphiesId, companyId) {
    const company = await InsuranceCompany.findOne({ _id: companyId, deletedAt: null });
    if (!company) throw Object.assign(new Error('شركة التأمين غير موجودة'), { status: 404 });

    const path = `/${resourceType}/${nphiesId}`;
    return this._callNphiesApi(company, path, null, 'GET');
  }

  // ── تسوية المطالبات ──────────────────────────────────────────────────────
  async reconcileInsuranceClaims(branchId, dateFrom, dateTo, companyId) {
    const match = {
      deletedAt: null,
      submittedAt: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
    };
    if (branchId) match.branchId = branchId;
    if (companyId) match.insuranceCompanyId = companyId;

    const stats = await InsuranceClaim.aggregate([
      { $match: match },
      {
        $group: {
          _id: { status: '$status', company: '$insuranceCompanyId' },
          count: { $sum: 1 },
          totalBilled: { $sum: '$billedAmount' },
          totalApproved: { $sum: '$approvedAmount' },
          totalPatientShare: { $sum: '$patientShare' },
          totalInsuranceShare: { $sum: '$insuranceShare' },
        },
      },
      {
        $group: {
          _id: '$_id.company',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count',
              totalBilled: '$totalBilled',
              totalApproved: '$totalApproved',
            },
          },
          totalBilled: { $sum: '$totalBilled' },
          totalApproved: { $sum: '$totalApproved' },
          totalPatientShare: { $sum: '$totalPatientShare' },
          totalInsuranceShare: { $sum: '$totalInsuranceShare' },
        },
      },
      {
        $lookup: {
          from: 'insurancecompanies',
          localField: '_id',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: { path: '$company', preserveNullAndEmpty: true } },
    ]);

    const summary = {
      dateFrom,
      dateTo,
      totalClaims: 0,
      totalBilled: 0,
      totalApproved: 0,
      recoveryRate: 0,
      byCompany: stats,
    };

    stats.forEach(s => {
      s.statuses.forEach(st => {
        summary.totalClaims += st.count;
      });
      summary.totalBilled += s.totalBilled;
      summary.totalApproved += s.totalApproved;
    });

    if (summary.totalBilled > 0) {
      summary.recoveryRate = ((summary.totalApproved / summary.totalBilled) * 100).toFixed(2);
    }

    return summary;
  }

  // ── إحصائيات ─────────────────────────────────────────────────────────────
  async getStats(branchId) {
    const match = { deletedAt: null };
    if (branchId) match.branchId = branchId;

    const [policyStats, claimStats, authStats] = await Promise.all([
      InsurancePolicy.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      InsuranceClaim.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalBilled: { $sum: '$billedAmount' },
            totalApproved: { $sum: '$approvedAmount' },
          },
        },
      ]),
      PriorAuthorization.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const claimTotals = claimStats.reduce(
      (acc, s) => {
        acc.totalBilled += s.totalBilled || 0;
        acc.totalApproved += s.totalApproved || 0;
        acc.count += s.count;
        return acc;
      },
      { totalBilled: 0, totalApproved: 0, count: 0 }
    );

    return {
      policies: Object.fromEntries(policyStats.map(s => [s._id, s.count])),
      claims: {
        byStatus: Object.fromEntries(claimStats.map(s => [s._id, s.count])),
        totalBilled: claimTotals.totalBilled,
        totalApproved: claimTotals.totalApproved,
        totalCount: claimTotals.count,
        approvalRate:
          claimTotals.totalBilled > 0
            ? ((claimTotals.totalApproved / claimTotals.totalBilled) * 100).toFixed(2)
            : 0,
      },
      priorAuths: Object.fromEntries(authStats.map(s => [s._id, s.count])),
    };
  }

  // ── قائمة السجلات ────────────────────────────────────────────────────────
  async list(model, filters = {}) {
    const Model = {
      policies: InsurancePolicy,
      claims: InsuranceClaim,
      auths: PriorAuthorization,
      companies: InsuranceCompany,
      checks: InsuranceEligibilityCheck,
    }[model];
    if (!Model) throw new Error('نوع السجل غير صحيح');

    const query = { deletedAt: null };
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.status) query.status = filters.status;
    if (filters.beneficiaryId) query.beneficiaryId = filters.beneficiaryId;
    if (filters.companyId) query.insuranceCompanyId = filters.companyId;
    if (filters.dateFrom) query.createdAt = { $gte: new Date(filters.dateFrom) };
    if (filters.dateTo) {
      query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };
    }
    if (filters.search) {
      const re = new RegExp(filters.search, 'i');
      if (model === 'claims') query.$or = [{ claimNumber: re }];
      if (model === 'policies') query.$or = [{ policyNumber: re }, { memberId: re }];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.per_page) || 15;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Model.countDocuments(query),
    ]);

    return { docs, total, page, pages: Math.ceil(total / limit) };
  }

  // ── مساعد: استدعاء NPHIES API ────────────────────────────────────────────
  async _callNphiesApi(company, path, payload, method = 'POST') {
    const baseUrl =
      company.apiEndpoint || process.env.NPHIES_BASE_URL || 'https://hsb.nphies.sa/claimsq';
    const creds = company.apiCredentials || {};
    const token = creds.accessToken || process.env.NPHIES_ACCESS_TOKEN;

    try {
      const response = await axios({
        method,
        url: `${baseUrl}${path}`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json',
        },
        data: method !== 'GET' ? payload : undefined,
        timeout: 30000,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.issue?.[0]?.details?.text || err.message;
      throw Object.assign(new Error(`NPHIES API Error: ${msg}`), {
        status: err.response?.status || 503,
      });
    }
  }

  // ── مساعدات الترقيم ──────────────────────────────────────────────────────
  async _generateClaimNumber() {
    const count = await InsuranceClaim.countDocuments();
    return `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }

  async _generateAuthNumber() {
    const count = await PriorAuthorization.countDocuments();
    return `AUTH-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }

  // ── تنبيهات انتهاء الوثائق ────────────────────────────────────────────────
  async sendExpiryAlerts(daysAhead = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysAhead);

    const expiring = await InsurancePolicy.find({
      deletedAt: null,
      status: 'active',
      endDate: { $lte: expiryDate, $gte: new Date() },
    }).populate('beneficiaryId insuranceCompanyId');

    const alerts = [];
    for (const policy of expiring) {
      const daysLeft = Math.ceil((policy.endDate - new Date()) / (1000 * 60 * 60 * 24));
      alerts.push({ policy: policy._id, beneficiary: policy.beneficiaryId, daysLeft });
      // يمكن إضافة إرسال إشعار هنا
    }
    return alerts;
  }
}

module.exports = new SmartInsuranceService();
