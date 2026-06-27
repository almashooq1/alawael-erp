/**
 * emr.service.js — خدمة السجل الطبي الإلكتروني (EMR Service)
 */
const mongoose = require('mongoose');

// Models
const Prescription = require('../models/emr/Prescription');
const VitalSigns = require('../models/emr/VitalSigns');
const MedicationAdministration = require('../models/emr/MedicationAdministration');
const LabResult = require('../models/emr/LabResult');
const AllergyRecord = require('../models/emr/AllergyRecord');
const ImmunizationRecord = require('../models/emr/ImmunizationRecord');
const Referral = require('../models/emr/Referral');

// ─── Helpers ───────────────────────────────────────────────────────────────

function toObjectId(id) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.isValidObjectId(id)) return new mongoose.Types.ObjectId(id);
  throw new Error('Invalid ObjectId: ' + id);
}

function startOfDay(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(d) {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

// ─── 1. Prescriptions ──────────────────────────────────────────────────────

async function createPrescription(data) {
  if (!data.beneficiary || !data.prescribedBy) {
    throw new Error('beneficiary and prescribedBy are required');
  }
  data.beneficiary = toObjectId(data.beneficiary);
  data.prescribedBy = toObjectId(data.prescribedBy);

  // Check interactions (simplified logic)
  const interactions = [];
  const meds = data.medications || [];
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      const a = meds[i].medicationName;
      const b = meds[j].medicationName;
      if (a && b && a.toLowerCase() === b.toLowerCase()) {
        interactions.push({
          severity: 'moderate',
          description: `تكرار دواء: ${a}`,
          medicationsInvolved: [a, b],
        });
      }
    }
  }
  data.interactionsChecked = true;
  data.interactionAlerts = interactions;

  const prescription = new Prescription(data);
  await prescription.save();
  return prescription;
}

async function getPrescriptions(beneficiaryId) {
  const bId = toObjectId(beneficiaryId);
  return Prescription.find({ beneficiary: bId, isDeleted: false })
    .sort({ prescribedDate: -1 })
    .populate('prescribedBy', 'name firstName lastName')
    .lean();
}

// ─── 2. Vital Signs ──────────────────────────────────────────────────────

async function recordVitalSigns(data) {
  if (!data.beneficiary) throw new Error('beneficiary is required');
  data.beneficiary = toObjectId(data.beneficiary);
  if (data.recordedBy) data.recordedBy = toObjectId(data.recordedBy);
  const vital = new VitalSigns(data);
  await vital.save();
  return vital;
}

async function getVitalSignsHistory(beneficiaryId, type, days = 30) {
  const bId = toObjectId(beneficiaryId);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const query = { beneficiary: bId, recordedAt: { $gte: since }, isDeleted: false };
  const projection = type
    ? {
        beneficiary: 1,
        recordedAt: 1,
        recordedBy: 1,
        [type]: 1,
        bmi: 1,
        notes: 1,
      }
    : undefined;
  return VitalSigns.find(query, projection)
    .sort({ recordedAt: -1 })
    .populate('recordedBy', 'name firstName lastName')
    .lean();
}

// ─── 3. Medication Administration (MAR) ──────────────────────────────────

async function administerMedication(data) {
  if (!data.beneficiary || !data.medicationName || !data.dosage) {
    throw new Error('beneficiary, medicationName, and dosage are required');
  }
  data.beneficiary = toObjectId(data.beneficiary);
  if (data.prescription) data.prescription = toObjectId(data.prescription);
  if (data.administeredBy) data.administeredBy = toObjectId(data.administeredBy);
  if (data.witnessedBy) data.witnessedBy = toObjectId(data.witnessedBy);
  const mar = new MedicationAdministration(data);
  await mar.save();
  return mar;
}

async function getMedicationSchedule(beneficiaryId) {
  const bId = toObjectId(beneficiaryId);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  return MedicationAdministration.find({
    beneficiary: bId,
    scheduledTime: { $gte: todayStart, $lte: todayEnd },
    isDeleted: false,
  })
    .sort({ scheduledTime: 1 })
    .populate('administeredBy', 'name firstName lastName')
    .lean();
}

// ─── 4. Lab Results ────────────────────────────────────────────────────────

async function addLabResult(data) {
  if (!data.beneficiary || !data.orderedDate) {
    throw new Error('beneficiary and orderedDate are required');
  }
  data.beneficiary = toObjectId(data.beneficiary);
  if (data.orderedBy) data.orderedBy = toObjectId(data.orderedBy);
  const lab = new LabResult(data);
  await lab.save();
  return lab;
}

async function getLabResults(beneficiaryId) {
  const bId = toObjectId(beneficiaryId);
  return LabResult.find({ beneficiary: bId, isDeleted: false })
    .sort({ orderedDate: -1 })
    .populate('orderedBy', 'name firstName lastName')
    .lean();
}

// ─── 5. Allergies ────────────────────────────────────────────────────────────

async function addAllergy(beneficiaryId, allergyData) {
  const bId = toObjectId(beneficiaryId);
  const data = { ...allergyData, beneficiary: bId };
  if (data.recordedBy) data.recordedBy = toObjectId(data.recordedBy);
  const allergy = new AllergyRecord(data);
  await allergy.save();
  return allergy;
}

async function checkAllergyAlerts(beneficiaryId, medicationName) {
  if (!medicationName) return [];
  const bId = toObjectId(beneficiaryId);
  const allergies = await AllergyRecord.find({
    beneficiary: bId,
    clinicalStatus: 'active',
    isDeleted: false,
  }).lean();
  const alerts = [];
  const medLower = medicationName.toLowerCase();
  for (const a of allergies) {
    const nameAr = (a.allergen?.name?.ar || '').toLowerCase();
    const nameEn = (a.allergen?.name?.en || '').toLowerCase();
    if (nameAr.includes(medLower) || nameEn.includes(medLower) || medLower.includes(nameAr) || medLower.includes(nameEn)) {
      alerts.push({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.reaction?.severity || 'moderate',
        allergyId: a._id,
      });
    }
  }
  return alerts;
}

// ─── 6. Immunizations ────────────────────────────────────────────────────────

async function addImmunization(data) {
  if (!data.beneficiary || !data.dateAdministered) {
    throw new Error('beneficiary and dateAdministered are required');
  }
  data.beneficiary = toObjectId(data.beneficiary);
  if (data.administeredBy) data.administeredBy = toObjectId(data.administeredBy);
  const imm = new ImmunizationRecord(data);
  await imm.save();
  return imm;
}

async function getImmunizationSchedule(beneficiaryId) {
  const bId = toObjectId(beneficiaryId);
  return ImmunizationRecord.find({ beneficiary: bId, isDeleted: false })
    .sort({ dateAdministered: -1 })
    .populate('administeredBy', 'name firstName lastName')
    .lean();
}

// ─── 7. Referrals ──────────────────────────────────────────────────────────

async function createReferral(data) {
  if (!data.beneficiary || !data.referredBy) {
    throw new Error('beneficiary and referredBy are required');
  }
  data.beneficiary = toObjectId(data.beneficiary);
  data.referredBy = toObjectId(data.referredBy);
  if (data.referredToProvider) data.referredToProvider = toObjectId(data.referredToProvider);
  const ref = new Referral(data);
  await ref.save();
  return ref;
}

async function getReferralStatus(referralId) {
  const rId = toObjectId(referralId);
  return Referral.findById(rId)
    .populate('beneficiary', 'firstName lastName firstName_ar lastName_ar name')
    .populate('referredBy', 'name firstName lastName')
    .populate('referredToProvider', 'name firstName lastName')
    .lean();
}

async function getReferralsByBeneficiary(beneficiaryId) {
  const bId = toObjectId(beneficiaryId);
  return Referral.find({ beneficiary: bId, isDeleted: false })
    .sort({ referralDate: -1 })
    .populate('referredBy', 'name firstName lastName')
    .populate('referredToProvider', 'name firstName lastName')
    .lean();
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  createPrescription,
  getPrescriptions,
  recordVitalSigns,
  getVitalSignsHistory,
  administerMedication,
  getMedicationSchedule,
  addLabResult,
  getLabResults,
  addAllergy,
  checkAllergyAlerts,
  addImmunization,
  getImmunizationSchedule,
  createReferral,
  getReferralStatus,
  getReferralsByBeneficiary,
};
