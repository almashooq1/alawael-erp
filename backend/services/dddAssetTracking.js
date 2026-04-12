'use strict';
/**
 * AssetTracking Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddAssetTracking.js
 */

const {
  DDDTrackedAsset,
  DDDAssetCheckout,
  DDDInventoryAudit,
  DDDDepreciationLog,
  ASSET_CATEGORIES,
  ASSET_CONDITIONS,
  TRACKING_METHODS,
  CHECKOUT_STATUSES,
  DEPRECIATION_METHODS,
  AUDIT_TYPES,
  BUILTIN_ASSET_TAGS,
} = require('../models/DddAssetTracking');

const BaseCrudService = require('./base/BaseCrudService');

class AssetTracking extends BaseCrudService {
  constructor() {
    super('AssetTracking', {}, {
      trackedAssets: DDDTrackedAsset,
      assetCheckouts: DDDAssetCheckout,
      inventoryAudits: DDDInventoryAudit,
      depreciationLogs: DDDDepreciationLog,
    });
  }

  async createAsset(data) { return this._create(DDDTrackedAsset, data); }
  async listAssets(filter = {}, page = 1, limit = 20) { return this._list(DDDTrackedAsset, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateAsset(id, data) { return this._update(DDDTrackedAsset, id, data); }

  async checkoutAsset(data) { return this._create(DDDAssetCheckout, data); }
  async listCheckouts(filter = {}, page = 1, limit = 20) { return this._list(DDDAssetCheckout, filter, { page: page, limit: limit, sort: { checkedOutAt: -1 } }); }

  async createAudit(data) { return this._create(DDDInventoryAudit, data); }
  async listAudits(filter = {}, page = 1, limit = 10) { return this._list(DDDInventoryAudit, filter, { page: page, limit: limit, sort: { startDate: -1 } }); }

  async logDepreciation(data) { return this._create(DDDDepreciationLog, data); }
  async listDepreciation(filter = {}, page = 1, limit = 20) { return this._list(DDDDepreciationLog, filter, { page: page, limit: limit, sort: { period: -1 } }); }

  async getAssetStats() {
    const [total, active, checkedOut, audits] = await Promise.all([
      DDDTrackedAsset.countDocuments(),
      DDDTrackedAsset.countDocuments({ isActive: true }),
      DDDAssetCheckout.countDocuments({ status: 'checked_out' }),
      DDDInventoryAudit.countDocuments({ status: 'completed' }),
    ]);
    return {
      totalAssets: total,
      activeAssets: active,
      currentlyCheckedOut: checkedOut,
      completedAudits: audits,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new AssetTracking();
