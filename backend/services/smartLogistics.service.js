const SmartNotificationService = require('./smartNotificationService');

/**
 * PHASE 49: Advanced Logistics & Asset Management
 * Handles: Consumables Reordering, Asset Lifecycle, Medical vs Educational Tools
 */
class SmartLogisticsService {
  /**
   * Checks stock levels against "Par Levels" (Minimum Stock)
   * Auto-generates Purchase Requests for admin approval.
   */
  static async checkStockAndReorder() {
    // Mock Database of Items
    const inventory = [
      { id: 1, name: 'Surgical Masks', category: 'MEDICAL_CONSUMABLE', stock: 50, parLevel: 100, unit: 'Box' },
      { id: 2, name: 'Sensory Sand', category: 'EDUCATIONAL', stock: 5, parLevel: 2, unit: 'Kg' }, // OK
      { id: 3, name: 'Wheelchair Tires (12")', category: 'SPARE_PARTS', stock: 1, parLevel: 4, unit: 'Pair' },
    ];

    const purchaseRequests = [];

    inventory.forEach(item => {
      if (item.stock < item.parLevel) {
        const orderQty = item.parLevel * 1.5 - item.stock; // Buy enough to reach 150% of par
        purchaseRequests.push({
          itemId: item.id,
          itemName: item.name,
          quantity: Math.ceil(orderQty),
          reason: 'Below Par Level',
        });
      }
    });

    if (purchaseRequests.length > 0) {
      await SmartNotificationService.broadcastToRole(
        'PROCUREMENT_OFFICER',
        `Stock Alert: ${purchaseRequests.length} items need reordering.`,
        'INFO',
      );
    }

    return purchaseRequests;
  }

  /**
   * Asset Lifecycle Tracking
   * Tracks Depreciation and End-of-Life for Capital Assets (Wheelchairs, Robots)
   */
  static async checkAssetLifecycle() {
    const assets = [
      { id: 'A001', name: 'Pediatric Wheelchair', purchaseDate: '2020-01-01', lifespanYears: 5, value: 5000 },
      { id: 'A002', name: 'Smart Board', purchaseDate: '2022-06-01', lifespanYears: 7, value: 3000 },
    ];

    const report = assets.map(asset => {
      const purchased = new Date(asset.purchaseDate);
      const now = new Date();
      const ageYears = (now - purchased) / (1000 * 60 * 60 * 24 * 365);
      const remainingLife = asset.lifespanYears - ageYears;

      // Straight-line depreciation
      const currentValue = Math.max(0, asset.value * (remainingLife / asset.lifespanYears));

      return {
        ...asset,
        currentValue: currentValue.toFixed(2),
        status: remainingLife < 0.5 ? 'NEEDS_REPLACEMENT' : 'GOOD',
      };
    });

    return report.filter(a => a.status === 'NEEDS_REPLACEMENT');
  }
}

module.exports = SmartLogisticsService;
