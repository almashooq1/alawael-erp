const Inventory = require('../models/InventoryItem'); // Assuming this exists or we mock
const TherapySession = require('../models/TherapySession');

class SmartInventoryService {
  /**
   * Predict Resource Depletion
   * Analyzes session volume to predict when consumables (Paper, Oil, Putty) will run out
   */
  static async predictDepletion() {
    // Mock Item Data
    const items = [
      { name: 'Therapy Putty (Soft)', currentStock: 10, usagePerSession: 0.1 },
      { name: 'Sanitizing Wipes', currentStock: 50, usagePerSession: 2 },
      { name: 'Face Masks', currentStock: 100, usagePerSession: 5 },
      { name: 'Ultrasound Gel', currentStock: 3, usagePerSession: 0.05 },
    ];

    const predictions = [];
    const dailySessions = 40; // Average volume

    for (const item of items) {
      const dailyConsumption = dailySessions * item.usagePerSession * 0.5; // Assume 50% of sessions use it
      const daysLeft = Math.floor(item.currentStock / dailyConsumption);

      let status = 'HEALTHY';
      if (daysLeft < 3) status = 'CRITICAL';
      else if (daysLeft < 7) status = 'LOW';

      predictions.push({
        item: item.name,
        currentStock: item.currentStock,
        dailyUsageRate: dailyConsumption.toFixed(1),
        daysUntilEmpty: daysLeft === Infinity ? '99+' : daysLeft,
        status,
      });
    }

    return predictions.sort(
      (a, b) => (a.daysUntilEmpty === '99+' ? 100 : a.daysUntilEmpty) - (b.daysUntilEmpty === '99+' ? 100 : b.daysUntilEmpty),
    );
  }

  /**
   * Equipment Maintenance Tracker
   * Checks usage hours of heavy equipment (Treadmill, Spider Cage)
   */
  static async checkMaintenanceStatus() {
    const equipment = [
      { id: 1, name: 'Lokomat Pro', lastService: '2025-10-01', usageHours: 450, maxHours: 500 },
      { id: 2, name: 'Spider Cage Audit', lastService: '2025-12-01', usageHours: 120, maxHours: 1000 },
      { id: 3, name: 'Pediatric Treadmill', lastService: '2025-11-15', usageHours: 190, maxHours: 200 },
    ];

    const alerts = [];

    for (const eq of equipment) {
      const health = (1 - eq.usageHours / eq.maxHours) * 100;

      if (health < 10) {
        alerts.push({
          equipment: eq.name,
          status: 'SERVICE_REQUIRED',
          message: `Usage at ${eq.usageHours}/${eq.maxHours} hours. Verify calibration.`,
        });
      }
    }

    return alerts;
  }
}

module.exports = SmartInventoryService;
module.exports.instance = new SmartInventoryService();
