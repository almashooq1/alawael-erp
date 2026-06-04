'use strict';

/**
 * Rehab center license operations — backed by the flexible License collection.
 * Legacy frontend expects /api/v1/rehab-licenses/* (RehabCenterLicenses.jsx).
 */

const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const ENTITY_TYPE = 'rehab_center_license';
const DEFAULT_EXPIRING_DAYS = 30;

const LICENSE_TYPE_CATALOG = {
  types: [
    { id: 'moh_facility', label: 'ترخيص منشأة وزارة الصحة', category: 'government_license' },
    {
      id: 'disability_center',
      label: 'ترخيص مركز تأهيل ذوي الإعاقة',
      category: 'government_license',
    },
    { id: 'municipal_operating', label: 'رخصة تشغيل بلدية', category: 'municipal_permit' },
    { id: 'commercial_record', label: 'سجل تجاري', category: 'commercial_record' },
    { id: 'civil_defense', label: 'شهادة الدفاع المدني', category: 'government_license' },
    { id: 'professional_cert', label: 'شهادة مهنية', category: 'professional_cert' },
  ],
  categories: [
    { id: 'government_license', label: 'تراخيص حكومية' },
    { id: 'municipal_permit', label: 'رخص بلدية' },
    { id: 'commercial_record', label: 'سجلات تجارية' },
    { id: 'employment_cert', label: 'شهادات عمل' },
    { id: 'professional_cert', label: 'شهادات مهنية' },
    { id: 'insurance_policy', label: 'وثائق تأمين' },
    { id: 'quality_accreditation', label: 'اعتماد جودة' },
    { id: 'technology_cert', label: 'شهادات تقنية' },
  ],
};

function getLicenseModel() {
  return require('../models/License/License');
}

function domainFilter(extra = {}) {
  return { entityType: ENTITY_TYPE, ...extra };
}

function toObjectId(id) {
  if (!id || !ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function computeStatus(doc) {
  if (doc.archived) return 'archived';
  if (doc.status === 'pending') return 'pending';
  const exp = doc.expiryDate ? new Date(doc.expiryDate) : null;
  if (exp && exp < startOfToday()) return 'expired';
  if (exp && exp <= addDays(startOfToday(), DEFAULT_EXPIRING_DAYS)) return 'expiring_soon';
  return doc.status || 'active';
}

function withComputedFields(doc) {
  if (!doc) return doc;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  o.status = computeStatus(o);
  const typeMeta = LICENSE_TYPE_CATALOG.types.find(t => t.id === o.licenseType);
  if (typeMeta) o.licenseTypeLabel = typeMeta.label;
  return o;
}

function notFound() {
  const err = new Error('license_not_found');
  err.status = 404;
  return err;
}

async function requireLicense(id, filter = {}) {
  const License = getLicenseModel();
  const doc = await License.findOne({ _id: id, ...domainFilter(filter) });
  if (!doc) throw notFound();
  return doc;
}

function buildSearchFilter(search) {
  if (!search || !String(search).trim()) return null;
  const rx = new RegExp(
    String(search)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'i'
  );
  return {
    $or: [
      { name: rx },
      { licenseNumber: rx },
      { title: rx },
      { issuingAuthority: rx },
      { notes: rx },
    ],
  };
}

async function list(query = {}, scopeFilter = {}) {
  const License = getLicenseModel();
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const filter = domainFilter({ ...scopeFilter });
  if (query.status) filter.status = String(query.status);
  if (query.category) filter.category = String(query.category);
  if (query.licenseType) filter.licenseType = String(query.licenseType);
  if (query.priority) filter.priority = String(query.priority);
  if (query.archived === 'true') filter.archived = true;
  else if (!query.includeArchived) filter.archived = { $ne: true };
  const searchPart = buildSearchFilter(query.search);
  if (searchPart) Object.assign(filter, searchPart);

  const [raw, total] = await Promise.all([
    License.find(filter)
      .sort({ expiryDate: 1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    License.countDocuments(filter),
  ]);
  const data = raw.map(withComputedFields);
  return {
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
  };
}

async function getDashboard(scopeFilter = {}) {
  const License = getLicenseModel();
  const base = domainFilter({ ...scopeFilter, archived: { $ne: true } });
  const today = startOfToday();
  const soon = addDays(today, DEFAULT_EXPIRING_DAYS);
  const [total, active, expired, expiringSoon, pending] = await Promise.all([
    License.countDocuments(base),
    License.countDocuments({ ...base, status: 'active', expiryDate: { $gte: today } }),
    License.countDocuments({
      ...base,
      $or: [{ status: 'expired' }, { expiryDate: { $lt: today } }],
    }),
    License.countDocuments({
      ...base,
      expiryDate: { $gte: today, $lte: soon },
      status: { $in: ['active', 'expiring_soon'] },
    }),
    License.countDocuments({ ...base, status: 'pending' }),
  ]);
  return { active, expired, pending, expiringSoon, total };
}

async function getEnhancedDashboard(scopeFilter = {}) {
  const License = getLicenseModel();
  const match = domainFilter({ ...scopeFilter, archived: { $ne: true } });
  const [byStatus, byType] = await Promise.all([
    License.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    License.aggregate([{ $match: match }, { $group: { _id: '$licenseType', count: { $sum: 1 } } }]),
  ]);
  const dash = await getDashboard(scopeFilter);
  return {
    ...dash,
    byStatus: byStatus.map(r => ({ status: r._id || 'unknown', count: r.count })),
    byType: byType.map(r => ({ licenseType: r._id || 'unknown', count: r.count })),
    riskDist: [],
  };
}

async function getActiveAlerts(scopeFilter = {}) {
  const { data } = await list({ status: 'expiring_soon', limit: 50, page: 1 }, scopeFilter);
  return data.map(lic => ({
    _id: `alert-${lic._id}`,
    licenseId: lic._id,
    type: 'expiry_warning',
    message: `ترخيص ${lic.name || lic.licenseNumber || lic._id} ينتهي قريباً`,
    severity: 'warning',
    read: false,
    dismissed: false,
  }));
}

async function scanAlerts(scopeFilter = {}) {
  const alerts = await getActiveAlerts(scopeFilter);
  return { scanned: alerts.length, generated: alerts.length, alerts };
}

async function getExpiringSoon(days = DEFAULT_EXPIRING_DAYS, scopeFilter = {}) {
  const License = getLicenseModel();
  const cutoff = addDays(startOfToday(), Math.max(1, parseInt(days, 10) || DEFAULT_EXPIRING_DAYS));
  const docs = await License.find(
    domainFilter({
      ...scopeFilter,
      archived: { $ne: true },
      expiryDate: { $gte: startOfToday(), $lte: cutoff },
    })
  )
    .sort({ expiryDate: 1 })
    .lean();
  return docs.map(withComputedFields);
}

async function getExpired(scopeFilter = {}) {
  const License = getLicenseModel();
  const today = startOfToday();
  const docs = await License.find(
    domainFilter({
      ...scopeFilter,
      archived: { $ne: true },
      $or: [{ status: 'expired' }, { expiryDate: { $lt: today } }],
    })
  )
    .sort({ expiryDate: -1 })
    .lean();
  return docs.map(withComputedFields);
}

async function getArchived(scopeFilter = {}) {
  const License = getLicenseModel();
  const docs = await License.find(domainFilter({ ...scopeFilter, archived: true }))
    .sort({ archivedAt: -1 })
    .lean();
  return docs.map(withComputedFields);
}

async function getById(id, scopeFilter = {}) {
  const License = getLicenseModel();
  const doc = await License.findOne({ _id: id, ...domainFilter(scopeFilter) }).lean();
  if (!doc) throw notFound();
  return withComputedFields(doc);
}

async function create(payload, userId, scopeFilter = {}) {
  const License = getLicenseModel();
  const doc = await License.create({
    ...payload,
    entityType: ENTITY_TYPE,
    status: payload.status || 'active',
    createdBy: userId,
    branchId: payload.branchId || scopeFilter.branchId,
    renewalHistory: [],
    notes: [],
    alerts: [],
  });
  return withComputedFields(doc.toObject());
}

async function update(id, payload, scopeFilter = {}) {
  const License = getLicenseModel();
  const unsetMeta = { createdAt: 0, updatedAt: 0, _id: 0, entityType: 0 };
  const clean = { ...payload };
  for (const k of Object.keys(unsetMeta)) delete clean[k];
  const doc = await License.findOneAndUpdate(
    { _id: id, ...domainFilter(scopeFilter) },
    { $set: clean },
    { returnDocument: 'after' }
  ).lean();
  if (!doc) throw notFound();
  return withComputedFields(doc);
}

async function remove(id, reason, scopeFilter = {}) {
  const License = getLicenseModel();
  const doc = await License.findOneAndUpdate(
    { _id: id, ...domainFilter(scopeFilter) },
    {
      $set: {
        archived: true,
        archivedAt: new Date(),
        archiveReason: reason || 'deleted',
        status: 'archived',
      },
    },
    { returnDocument: 'after' }
  ).lean();
  if (!doc) throw notFound();
  return withComputedFields(doc);
}

async function renew(
  id,
  { newExpiryDate, cost, notes, renewalNotes, documentUrl },
  userId,
  scopeFilter = {}
) {
  if (!newExpiryDate) {
    const err = new Error('newExpiryDate required');
    err.status = 400;
    throw err;
  }
  const License = getLicenseModel();
  const existing = await License.findOne({ _id: id, ...domainFilter(scopeFilter) }).lean();
  if (!existing) throw notFound();
  const entry = {
    renewedAt: new Date(),
    previousExpiry: existing.expiryDate,
    newExpiry: new Date(newExpiryDate),
    renewedBy: userId,
    cost: cost || 0,
    notes: notes || renewalNotes || '',
    documentUrl: documentUrl || undefined,
  };
  const history = Array.isArray(existing.renewalHistory)
    ? [...existing.renewalHistory, entry]
    : [entry];
  const doc = await License.findOneAndUpdate(
    { _id: id, ...domainFilter(scopeFilter) },
    {
      $set: {
        expiryDate: new Date(newExpiryDate),
        status: 'active',
        renewedAt: new Date(),
        renewalHistory: history,
        ...(documentUrl ? { documentUrl } : {}),
      },
    },
    { returnDocument: 'after' }
  ).lean();
  if (!doc) throw notFound();
  return withComputedFields(doc);
}

async function unarchive(id, scopeFilter = {}) {
  const License = getLicenseModel();
  const doc = await License.findOneAndUpdate(
    { _id: id, ...domainFilter(scopeFilter) },
    { $set: { archived: false, status: 'active' }, $unset: { archivedAt: 1, archiveReason: 1 } },
    { returnDocument: 'after' }
  ).lean();
  if (!doc) throw notFound();
  return withComputedFields(doc);
}

async function pushEmbedded(id, field, entry, scopeFilter = {}) {
  const License = getLicenseModel();
  const subId = new ObjectId();
  const payload = { _id: subId, ...entry, createdAt: new Date() };
  const doc = await License.findOneAndUpdate(
    { _id: id, ...domainFilter(scopeFilter) },
    { $push: { [field]: payload } },
    { returnDocument: 'after' }
  ).lean();
  if (!doc) throw notFound();
  return { [`${field.slice(0, -1)}Id`]: String(subId), ...payload };
}

async function patchAlert(id, alertId, patch, scopeFilter = {}) {
  const doc = await requireLicense(id, scopeFilter);
  if (!Array.isArray(doc.alerts)) doc.alerts = [];
  const idx = doc.alerts.findIndex(a => String(a._id) === String(alertId));
  if (idx >= 0) {
    Object.assign(doc.alerts[idx], patch);
  } else {
    doc.alerts.push({ _id: alertId, ...patch });
  }
  await doc.save();
  return { alertId, ...patch };
}

async function cloneLicense(id, overrides = {}, userId, scopeFilter = {}) {
  const src = await getById(id, scopeFilter);
  const { _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = src;
  return create(
    {
      ...rest,
      ...overrides,
      name: overrides.name || `${src.name || 'ترخيص'} (نسخة)`,
      licenseNumber: overrides.licenseNumber || `${src.licenseNumber || 'LIC'}-COPY-${Date.now()}`,
      status: 'pending',
    },
    userId,
    scopeFilter
  );
}

function getLicenseTypes() {
  return LICENSE_TYPE_CATALOG;
}

function emptyStats(shape) {
  return Promise.resolve(shape);
}

module.exports = {
  ENTITY_TYPE,
  getLicenseTypes,
  list,
  getDashboard,
  getEnhancedDashboard,
  getActiveAlerts,
  scanAlerts,
  getExpiringSoon,
  getExpired,
  getArchived,
  getById,
  create,
  update,
  remove,
  renew,
  unarchive,
  pushEmbedded,
  patchAlert,
  cloneLicense,
  emptyStats,
  toObjectId,
};
