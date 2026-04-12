'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Asset Tracker — Phase 14 (4/4)
 *  Medical equipment tracking, maintenance, utilization
 * ═══════════════════════════════════════════════════════════════
 */

const { ASSET_CATEGORIES, ASSET_STATUSES, MAINTENANCE_TYPES, CONDITION_GRADES, BUILTIN_ASSET_TYPES } = require('../models/DddAssetTracker');

const BaseCrudService = require('./base/BaseCrudService');

class AssetTrackerService extends BaseCrudService {
  /* ── Assets CRUD ── */
  async listAssets(filter = {}) {
    const q = { isActive: true };
    if (filter.category) q.category = filter.category;
    if (filter.status) q.status = filter.status;
    if (filter.condition) q.condition = filter.condition;
    if (filter.tenant) q.tenant = filter.tenant;
    if (filter.search) {
      q.$or = [
        { name: new RegExp(filter.search, 'i') },
        { nameAr: new RegExp(filter.search, 'i') },
        { code: new RegExp(filter.search, 'i') },
        { serialNumber: new RegExp(filter.search, 'i') },
      ];
    }
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDAsset.find(q)
        .sort({ category: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDAsset.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getAsset(id) {
    return DDDAsset.findById(oid(id)).lean();
  }

  async createAsset(data) {
    // Auto-calculate next maintenance
    if (data.maintenanceIntervalDays && !data.nextMaintenanceDate) {
      const last = data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : new Date();
      data.nextMaintenanceDate = new Date(
        last.getTime() + data.maintenanceIntervalDays * 24 * 60 * 60 * 1000
      );
    }
    return DDDAsset.create(data);
  }

  async updateAsset(id, data) {
    return DDDAsset.findByIdAndUpdate(
      oid(id),
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
  }

  async retireAsset(id, reason) {
    return DDDAsset.findByIdAndUpdate(
      oid(id),
      {
        $set: {
          status: 'retired',
          isActive: false,
          'metadata.retireReason': reason,
          'metadata.retiredAt': new Date(),
        },
      },
      { new: true }
    ).lean();
  }

  /* ── Check-out / Check-in ── */
  async checkOut(assetId, userId, beneficiaryId, sessionId) {
    const asset = await DDDAsset.findById(oid(assetId));
    if (!asset) throw new Error('Asset not found');
    if (asset.status !== 'available') throw new Error(`Asset is ${asset.status}, cannot check out`);

    await DDDAsset.findByIdAndUpdate(oid(assetId), {
      $set: {
        status: 'in_use',
        currentUserId: oid(userId),
        currentBeneficiaryId: beneficiaryId ? oid(beneficiaryId) : undefined,
      },
    });

    const log = await DDDAssetUsageLog.create({
      assetId: oid(assetId),
      userId: oid(userId),
      beneficiaryId: beneficiaryId ? oid(beneficiaryId) : undefined,
      sessionId: sessionId ? oid(sessionId) : undefined,
      checkedOutAt: new Date(),
    });

    return { asset: asset.toObject(), usageLog: log };
  }

  async checkIn(assetId, condition, notes) {
    const asset = await DDDAsset.findById(oid(assetId));
    if (!asset) throw new Error('Asset not found');

    // Find latest usage log
    const usageLog = await DDDAssetUsageLog.findOne({
      assetId: oid(assetId),
      checkedInAt: null,
    }).sort({ checkedOutAt: -1 });

    let duration = 0;
    if (usageLog) {
      const now = new Date();
      duration = Math.round((now - usageLog.checkedOutAt) / 60000);
      await DDDAssetUsageLog.findByIdAndUpdate(usageLog._id, {
        $set: { checkedInAt: now, durationMinutes: duration, condition, notes },
      });
    }

    await DDDAsset.findByIdAndUpdate(oid(assetId), {
      $set: {
        status: 'available',
        currentUserId: null,
        currentBeneficiaryId: null,
        condition: condition || asset.condition,
      },
      $inc: { totalUsageHours: duration / 60 },
    });

    return { assetId, duration, condition };
  }

  /* ── Maintenance ── */
  async scheduleMaintenance(assetId, data) {
    const record = await DDDAssetMaintenanceRecord.create({ ...data, assetId: oid(assetId) });
    await DDDAsset.findByIdAndUpdate(oid(assetId), {
      $set: { nextMaintenanceDate: data.scheduledDate },
    });
    return record;
  }

  async completeMaintenance(recordId, data) {
    const record = await DDDAssetMaintenanceRecord.findByIdAndUpdate(
      oid(recordId),
      {
        $set: {
          status: 'completed',
          completedDate: new Date(),
          conditionAfter: data.conditionAfter,
          findings: data.findings,
          cost: data.cost,
          partsReplaced: data.partsReplaced,
        },
      },
      { new: true }
    ).lean();

    if (record) {
      // Update asset
      const nextDate = new Date();
      const asset = await DDDAsset.findById(record.assetId);
      if (asset) {
        nextDate.setDate(nextDate.getDate() + (asset.maintenanceIntervalDays || 90));
        await DDDAsset.findByIdAndUpdate(record.assetId, {
          $set: {
            lastMaintenanceDate: new Date(),
            nextMaintenanceDate: nextDate,
            status: 'available',
            condition: data.conditionAfter || asset.condition,
          },
          $inc: { totalMaintenanceCost: data.cost || 0 },
        });
      }
    }

    return record;
  }

  async listMaintenanceRecords(filter = {}) {
    const q = {};
    if (filter.assetId) q.assetId = oid(filter.assetId);
    if (filter.status) q.status = filter.status;
    if (filter.type) q.type = filter.type;
    if (filter.tenant) q.tenant = filter.tenant;
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDAssetMaintenanceRecord.find(q)
        .sort({ scheduledDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('assetId', 'name code category')
        .lean(),
      DDDAssetMaintenanceRecord.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getOverdueMaintenance(tenant = 'default') {
    const now = new Date();
    return DDDAsset.find({
      isActive: true,
      tenant,
      nextMaintenanceDate: { $lt: now },
      status: { $ne: 'retired' },
    })
      .sort({ nextMaintenanceDate: 1 })
      .lean();
  }

  /* ── Usage History ── */
  async getUsageHistory(assetId, filter = {}) {
    const q = { assetId: oid(assetId) };
    if (filter.from) q.checkedOutAt = { $gte: new Date(filter.from) };
    if (filter.to) {
      q.checkedOutAt = q.checkedOutAt || {};
      q.checkedOutAt.$lte = new Date(filter.to);
    }
    return DDDAssetUsageLog.find(q)
      .sort({ checkedOutAt: -1 })
      .limit(100)
      .populate('userId', 'name')
      .lean();
  }

  /* ── Utilization Report ── */
  async getUtilizationReport(dateFrom, dateTo, tenant = 'default') {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const totalDays = Math.max(1, (to - from) / (24 * 60 * 60 * 1000));

    const assets = await DDDAsset.find({ isActive: true, tenant }).lean();
    const report = [];

    for (const asset of assets) {
      const logs = await DDDAssetUsageLog.find({
        assetId: asset._id,
        checkedOutAt: { $gte: from, $lte: to },
      }).lean();

      const totalHours = logs.reduce((sum, l) => sum + (l.durationMinutes || 0) / 60, 0);
      const maxHours = totalDays * (asset.maxUsageHoursPerDay || 8);
      const utilization = maxHours > 0 ? Math.min(100, (totalHours / maxHours) * 100) : 0;

      report.push({
        assetId: asset._id,
        code: asset.code,
        name: asset.name,
        category: asset.category,
        totalHours: Math.round(totalHours * 10) / 10,
        maxHours: Math.round(maxHours),
        utilizationPercent: Math.round(utilization * 10) / 10,
        sessionCount: logs.length,
      });
    }

    report.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
    return { period: { from, to }, assets: report, totalAssets: assets.length };
  }

  /* ── Stats ── */
  async getStats(tenant = 'default') {
    const q = { isActive: true, tenant };
    const now = new Date();

    const [total, byCategory, byStatus, overdue, inUse] = await Promise.all([
      DDDAsset.countDocuments(q),
      DDDAsset.aggregate([
        { $match: q },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      DDDAsset.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      DDDAsset.countDocuments({
        ...q,
        nextMaintenanceDate: { $lt: now },
        status: { $ne: 'retired' },
      }),
      DDDAsset.countDocuments({ ...q, status: 'in_use' }),
    ]);

    return {
      total,
      byCategory: Object.fromEntries(byCategory.map(r => [r._id, r.count])),
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      overdueMaintenance: overdue,
      currentlyInUse: inUse,
      builtinTypes: BUILTIN_ASSET_TYPES.length,
    };
  }
}

module.exports = new AssetTrackerService();
