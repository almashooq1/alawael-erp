const Asset = require('../models/Asset');
const logger = require('../utils/logger');

class AssetManagementService {
  /**
   * Get all assets
   */
  async getAllAssets(query = {}) {
    try {
      let mongoQuery = {};

      // Filter by status
      if (query.status) {
        mongoQuery.status = query.status;
      }

      // Filter by category
      if (query.category) {
        mongoQuery.category = query.category;
      }

      // Filter by location
      if (query.location) {
        mongoQuery.location = query.location;
      }

      // Search by name or description
      if (query.search) {
        mongoQuery.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { description: { $regex: query.search, $options: 'i' } }
        ];
      }

      const assets = await Asset.find(mongoQuery)
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

      return assets;
    } catch (error) {
      logger.error('Error in getAllAssets:', error);
      throw error;
    }
  }

  /**
   * Create new asset
   */
  async createAsset(data) {
    try {
      const asset = new Asset({
        name: data.name,
        category: data.category,
        description: data.description || '',
        value: data.value || 0,
        location: data.location || 'Unknown',
        status: data.status || 'active',
        depreciationRate: data.depreciationRate || 0.10,
        createdBy: data.createdBy,
        tags: data.tags || []
      });

      const saved = await asset.save();
      logger.info(`Asset created: ${saved._id}`);
      return saved;
    } catch (error) {
      logger.error('Error in createAsset:', error);
      throw error;
    }
  }

  /**
   * Get asset by ID
   */
  async getAssetById(assetId) {
    try {
      const asset = await Asset.findById(assetId)
        .populate('createdBy', 'firstName lastName email');

      if (!asset) return null;
      return asset;
    } catch (error) {
      logger.error('Error in getAssetById:', error);
      throw error;
    }
  }

  /**
   * Update asset
   */
  async updateAsset(assetId, updates) {
    try {
      const asset = await Asset.findByIdAndUpdate(
        assetId,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('createdBy', 'firstName lastName email');

      if (!asset) return null;

      logger.info(`Asset updated: ${assetId}`);
      return asset;
    } catch (error) {
      logger.error('Error in updateAsset:', error);
      throw error;
    }
  }

  /**
   * Delete asset
   */
  async deleteAsset(assetId) {
    try {
      const result = await Asset.findByIdAndDelete(assetId);

      if (!result) return false;

      logger.info(`Asset deleted: ${assetId}`);
      return true;
    } catch (error) {
      logger.error('Error in deleteAsset:', error);
      throw error;
    }
  }

  /**
   * Get assets by category
   */
  async getAssetsByCategory(category) {
    try {
      const assets = await Asset.find({ category })
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

      return assets;
    } catch (error) {
      logger.error('Error in getAssetsByCategory:', error);
      throw error;
    }
  }

  /**
   * Get depreciation report
   */
  async getDepreciationReport() {
    try {
      const assets = await Asset.find({ status: 'active' });

      const report = {
        generatedAt: new Date(),
        totalAssets: assets.length,
        assets: []
      };

      let totalOriginalValue = 0;
      let totalDepreciatedValue = 0;

      assets.forEach(asset => {
        const monthsOwned = Math.floor(
          (Date.now() - asset.purchaseDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
        );

        const depreciatedValue = asset.value * Math.pow(
          1 - asset.depreciationRate,
          monthsOwned / 12
        );

        const totalDepreciation = asset.value - depreciatedValue;

        totalOriginalValue += asset.value;
        totalDepreciatedValue += depreciatedValue;

        report.assets.push({
          id: asset._id,
          name: asset.name,
          category: asset.category,
          originalValue: asset.value,
          depreciatedValue: Math.round(depreciatedValue),
          monthsOwned,
          depreciationRate: asset.depreciationRate,
          totalDepreciation: Math.round(totalDepreciation),
          depreciationPercentage: ((totalDepreciation / asset.value) * 100).toFixed(2)
        });
      });

      report.summary = {
        totalOriginalValue,
        totalDepreciatedValue: Math.round(totalDepreciatedValue),
        totalDepreciation: Math.round(totalOriginalValue - totalDepreciatedValue),
        depreciationPercentage: totalOriginalValue > 0
          ? (((totalOriginalValue - totalDepreciatedValue) / totalOriginalValue) * 100).toFixed(2)
          : 0
      };

      return report;
    } catch (error) {
      logger.error('Error in getDepreciationReport:', error);
      throw error;
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    try {
      const count = await Asset.countDocuments();

      return {
        status: 'healthy',
        assetsCount: count,
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Error in getHealthStatus:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// Export singleton
const assetManagementService = new AssetManagementService();

module.exports = {
  AssetManagementService,
  assetManagementService,
  assetService: assetManagementService
};
