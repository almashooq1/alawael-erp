/**
 * Unit Tests — inventoryCalculations.service.js
 * Pure business logic — NO mocks needed
 */
'use strict';

const {
  INVENTORY_CONSTANTS,
  calculateStockLevel,
  calculateReorderPoint,
  calculateEOQ,
  calculateWeightedAverageCost,
  calculateFIFOValuation,
  calculateInventoryValue,
  analyzeConsumptionRate,
  calculateInventoryTurnover,
  checkExpiryStatus,
  calculatePurchaseOrder,
  performABCAnalysis,
  reconcileStockCount,
  evaluateSupplierPerformance,
  forecastShortage,
} = require('../../services/inventory/inventoryCalculations.service');

// ═══════════════════════════════════════
//  INVENTORY_CONSTANTS
// ═══════════════════════════════════════
describe('INVENTORY_CONSTANTS', () => {
  it('exports expected keys', () => {
    expect(INVENTORY_CONSTANTS.ITEM_CATEGORIES).toBeDefined();
    expect(INVENTORY_CONSTANTS.TRANSACTION_TYPES).toBeDefined();
    expect(INVENTORY_CONSTANTS.STOCK_STATUS).toBeDefined();
    expect(INVENTORY_CONSTANTS.ORDER_STATUS).toBeDefined();
    expect(INVENTORY_CONSTANTS.DEFAULTS).toBeDefined();
  });
});

// ═══════════════════════════════════════
//  calculateStockLevel
// ═══════════════════════════════════════
describe('calculateStockLevel', () => {
  it('in_stock when qty above reorder', () => {
    const r = calculateStockLevel(100, 20, 200, 50);
    expect(r.isValid).toBe(true);
    expect(r.status).toBe('in_stock');
    expect(r.needsReorder).toBe(false);
    expect(r.fillRate).toBe(50);
    expect(r.availableSpace).toBe(100);
  });

  it('low_stock when qty below min', () => {
    const r = calculateStockLevel(10, 20, 200, 50);
    expect(r.isValid).toBe(true);
    expect(r.status).toBe('low_stock');
    expect(r.needsReorder).toBe(true);
    expect(r.shortage).toBe(10);
  });

  it('out_of_stock when qty is 0', () => {
    const r = calculateStockLevel(0, 20, 200, 50);
    expect(r.status).toBe('out_of_stock');
    expect(r.needsReorder).toBe(true);
    expect(r.shortage).toBe(20);
  });
});

// ═══════════════════════════════════════
//  calculateReorderPoint
// ═══════════════════════════════════════
describe('calculateReorderPoint', () => {
  it('computes reorder point with safety stock', () => {
    // ROP = (avgDaily * leadTime) + (avgDaily * safetyDays) = (10*5)+(10*3) = 80
    const r = calculateReorderPoint(10, 5, 3);
    expect(r.isValid).toBe(true);
    expect(r.reorderPoint).toBe(80);
    expect(r.safetyStock).toBe(30);
    expect(r.demandDuringLeadTime).toBe(50);
  });

  it('handles zero usage', () => {
    const r = calculateReorderPoint(0, 5, 3);
    expect(r.reorderPoint).toBe(0);
  });
});

// ═══════════════════════════════════════
//  calculateEOQ
// ═══════════════════════════════════════
describe('calculateEOQ', () => {
  it('computes economic order quantity', () => {
    const r = calculateEOQ(1000, 50, 2);
    expect(r.isValid).toBe(true);
    expect(r.eoq).toBe(224); // sqrt(2*1000*50/2)=223.6→224
    expect(r.ordersPerYear).toBeCloseTo(4.47, 1);
    expect(r.totalCost).toBeCloseTo(447.21, 0);
  });

  it('returns invalid for zero demand', () => {
    const r = calculateEOQ(0, 50, 2);
    expect(r.isValid).toBe(false);
  });
});

// ═══════════════════════════════════════
//  calculateWeightedAverageCost
// ═══════════════════════════════════════
describe('calculateWeightedAverageCost', () => {
  it('computes weighted average', () => {
    const r = calculateWeightedAverageCost([
      { quantity: 100, unitCost: 10 },
      { quantity: 200, unitCost: 15 },
    ]);
    expect(r.isValid).toBe(true);
    expect(r.weightedAvgCost).toBeCloseTo(13.33, 1);
    expect(r.totalQuantity).toBe(300);
    expect(r.totalValue).toBe(4000);
    expect(r.batchCount).toBe(2);
  });

  it('returns invalid for empty', () => {
    const r = calculateWeightedAverageCost([]);
    expect(r.isValid).toBe(false);
  });
});

// ═══════════════════════════════════════
//  calculateFIFOValuation
// ═══════════════════════════════════════
describe('calculateFIFOValuation', () => {
  it('issues from earliest batches first', () => {
    const r = calculateFIFOValuation(
      [
        { quantity: 100, unitCost: 10 },
        { quantity: 200, unitCost: 15 },
      ],
      150
    );
    expect(r.isValid).toBe(true);
    expect(r.method).toBe('fifo');
    expect(r.issuedQuantity).toBe(150);
    expect(r.issuedCost).toBe(1750); // 100*10 + 50*15
    expect(r.avgIssuedCost).toBeCloseTo(11.67, 1);
    expect(r.remainingQuantity).toBe(150);
    expect(r.remainingValue).toBe(2250);
  });

  it('handles issuing zero', () => {
    const r = calculateFIFOValuation([{ quantity: 100, unitCost: 10 }], 0);
    expect(r.issuedCost).toBe(0);
    expect(r.remainingQuantity).toBe(100);
  });
});

// ═══════════════════════════════════════
//  calculateInventoryValue
// ═══════════════════════════════════════
describe('calculateInventoryValue', () => {
  it('sums value of all items', () => {
    const r = calculateInventoryValue([
      { name: 'A', quantity: 100, unitCost: 10 },
      { name: 'B', quantity: 50, unitCost: 20 },
    ]);
    expect(r.isValid).toBe(true);
    expect(r.totalValue).toBe(2000);
    expect(r.totalQuantity).toBe(150);
    expect(r.itemCount).toBe(2);
  });

  it('groups by category', () => {
    const r = calculateInventoryValue([
      { name: 'A', quantity: 10, unitCost: 5, category: 'medical' },
      { name: 'B', quantity: 20, unitCost: 3, category: 'medical' },
    ]);
    expect(r.byCategory.medical.value).toBe(110);
    expect(r.byCategory.medical.itemCount).toBe(2);
  });
});

// ═══════════════════════════════════════
//  analyzeConsumptionRate
// ═══════════════════════════════════════
describe('analyzeConsumptionRate', () => {
  it('computes daily usage from issue transactions', () => {
    const txns = [
      { type: 'issue', quantity: 10, date: '2025-06-01' },
      { type: 'issue', quantity: 15, date: '2025-06-10' },
    ];
    const r = analyzeConsumptionRate(txns, 30);
    expect(r.isValid).toBe(true);
    expect(r.totalIssued).toBe(25);
    expect(r.avgDailyUsage).toBeCloseTo(0.83, 1);
    expect(r.byType.issue.count).toBe(2);
  });

  it('returns zero usage when no issue transactions', () => {
    const txns = [{ type: 'receipt', quantity: 100, date: '2025-06-15' }];
    const r = analyzeConsumptionRate(txns, 30);
    expect(r.totalIssued).toBe(0);
    expect(r.consumptionLevel).toBe('no_usage');
  });
});

// ═══════════════════════════════════════
//  calculateInventoryTurnover
// ═══════════════════════════════════════
describe('calculateInventoryTurnover', () => {
  it('computes turnover ratio and days', () => {
    const r = calculateInventoryTurnover(50000, 10000, 15000);
    expect(r.isValid).toBe(true);
    expect(r.turnoverRatio).toBe(4); // 50000/12500
    expect(r.daysInInventory).toBeCloseTo(91.3, 0);
    expect(r.avgInventory).toBe(12500);
    expect(r.efficiency).toBe('acceptable');
  });

  it('returns invalid for zero inventory', () => {
    const r = calculateInventoryTurnover(50000, 0, 0);
    expect(r.isValid).toBe(false);
  });
});

// ═══════════════════════════════════════
//  checkExpiryStatus
// ═══════════════════════════════════════
describe('checkExpiryStatus', () => {
  it('categorizes items by expiry proximity', () => {
    const r = checkExpiryStatus(
      [
        { name: 'Soon', expiryDate: new Date(Date.now() + 5 * 86400000).toISOString() },
        { name: 'Valid', expiryDate: new Date(Date.now() + 60 * 86400000).toISOString() },
        { name: 'NoExp' },
      ],
      30
    );
    expect(r.isValid).toBe(true);
    expect(r.total).toBe(3);
    expect(r.expiringSoon).toBe(1);
    expect(r.valid).toBe(1);
    expect(r.noExpiry).toBe(1);
    expect(r.requiresAction).toBe(true);
    expect(r.expiringSoonItems[0].name).toBe('Soon');
  });

  it('reports expired items', () => {
    const r = checkExpiryStatus(
      [{ name: 'Old', expiryDate: new Date(Date.now() - 5 * 86400000).toISOString() }],
      30
    );
    expect(r.expired).toBe(1);
    expect(r.expiredItems.length).toBe(1);
  });
});

// ═══════════════════════════════════════
//  calculatePurchaseOrder
// ═══════════════════════════════════════
describe('calculatePurchaseOrder', () => {
  it('calculates order totals with discount and VAT', () => {
    // discountRate is percentage (0-100), vatRate is percentage (0-100 default 15)
    const r = calculatePurchaseOrder(
      [
        { name: 'A', quantity: 20, unitPrice: 100 },
        { name: 'B', quantity: 10, unitPrice: 250 },
      ],
      10,
      15
    );
    expect(r.isValid).toBe(true);
    expect(r.subtotal).toBe(4500);
    expect(r.totalDiscount).toBe(450);
    expect(r.afterDiscount).toBe(4050);
    expect(r.totalVat).toBe(607.5);
    expect(r.grandTotal).toBeCloseTo(4657.5, 1);
  });

  it('returns invalid for empty items', () => {
    const r = calculatePurchaseOrder([], 0, 15);
    expect(r.isValid).toBe(false);
  });

  it('returns invalid for zero price items', () => {
    const r = calculatePurchaseOrder([{ quantity: 10, unitPrice: 0 }], 0, 15);
    expect(r.isValid).toBe(false);
  });
});

// ═══════════════════════════════════════
//  performABCAnalysis
// ═══════════════════════════════════════
describe('performABCAnalysis', () => {
  it('categorizes items by cumulative value', () => {
    // totalValue = quantity * unitCost
    // Expensive: 100*100=10000 (86.96%), Medium: 50*20=1000, Cheap: 100*5=500
    // Cumulative: Expensive=86.96% → A+, but >80 → B? Let's check threshold
    // <=80 → A, <=95 → B, >95 → C
    // 86.96% cumulative → B (since 86.96 > 80)
    const r = performABCAnalysis([
      { name: 'Expensive', quantity: 100, unitCost: 100 },
      { name: 'Medium', quantity: 50, unitCost: 20 },
      { name: 'Cheap', quantity: 100, unitCost: 5 },
    ]);
    expect(r.isValid).toBe(true);
    expect(r.totalItems).toBe(3);
    // Expensive=86.96% cumulative → B (exceeds 80%)
    expect(r.items[0].name).toBe('Expensive');
    expect(r.items[0].abcCategory).toBe('B');
    expect(r.summary).toBeDefined();
  });

  it('returns invalid for items with zero value', () => {
    const r = performABCAnalysis([{ name: 'Zero', quantity: 0, unitCost: 0 }]);
    expect(r.isValid).toBe(false);
  });

  it('handles single high-value item', () => {
    const r = performABCAnalysis([{ name: 'Sole', quantity: 100, unitCost: 10 }]);
    expect(r.isValid).toBe(true);
    // Single item = 100% cumulative → C (100 > 95)
    expect(r.items[0].abcCategory).toBe('C');
  });
});

// ═══════════════════════════════════════
//  reconcileStockCount
// ═══════════════════════════════════════
describe('reconcileStockCount', () => {
  it('detects discrepancies', () => {
    const system = [
      { itemId: 'i1', itemName: 'A', quantity: 100, unitCost: 10 },
      { itemId: 'i2', itemName: 'B', quantity: 50, unitCost: 20 },
    ];
    const physical = [
      { itemId: 'i1', countedQuantity: 98 },
      { itemId: 'i2', countedQuantity: 50 },
    ];
    const r = reconcileStockCount(system, physical);
    expect(r.isValid).toBe(true);
    expect(r.totalSystemItems).toBe(2);
    expect(r.discrepancyCount).toBe(1);
    expect(r.discrepancies[0].variance).toBe(-2);
    expect(r.discrepancies[0].status).toBe('shortage');
    expect(r.requiresAdjustment).toBe(true);
  });

  it('detects missing items from count', () => {
    const system = [{ itemId: 'i1', itemName: 'A', quantity: 10, unitCost: 5 }];
    const physical = [];
    const r = reconcileStockCount(system, physical);
    expect(r.discrepancyCount).toBe(1);
    expect(r.discrepancies[0].status).toBe('missing_from_count');
  });

  it('returns invalid for null inputs', () => {
    expect(reconcileStockCount(null, []).isValid).toBe(false);
    expect(reconcileStockCount([], null).isValid).toBe(false);
  });
});

// ═══════════════════════════════════════
//  evaluateSupplierPerformance
// ═══════════════════════════════════════
describe('evaluateSupplierPerformance', () => {
  it('evaluates with on-time and quantity metrics', () => {
    const orders = [
      {
        status: 'received',
        orderedQty: 100,
        receivedQty: 100,
        orderDate: '2025-05-01',
        expectedDelivery: '2025-05-10',
        actualDelivery: '2025-05-09',
      },
      {
        status: 'received',
        orderedQty: 50,
        receivedQty: 45,
        orderDate: '2025-05-15',
        expectedDelivery: '2025-05-25',
        actualDelivery: '2025-05-28',
      },
    ];
    const r = evaluateSupplierPerformance(orders);
    expect(r.isValid).toBe(true);
    expect(r.totalOrders).toBe(2);
    expect(r.completedOrders).toBe(2);
    expect(r.onTimeDeliveryRate).toBe(50); // 1 of 2
    expect(r.quantityAccuracy).toBeGreaterThan(0);
    expect(r.avgDeliveryDays).toBeGreaterThan(0);
    expect(['excellent', 'good', 'acceptable', 'poor']).toContain(r.rating);
  });

  it('returns invalid for no completed orders', () => {
    const r = evaluateSupplierPerformance([{ status: 'pending' }]);
    expect(r.isValid).toBe(false);
  });
});

// ═══════════════════════════════════════
//  forecastShortage
// ═══════════════════════════════════════
describe('forecastShortage', () => {
  it('predicts stockouts for critical items', () => {
    const items = [
      { itemId: 'i1', itemName: 'A', currentQuantity: 50, avgDailyUsage: 5, minQuantity: 10 },
      { itemId: 'i2', itemName: 'B', currentQuantity: 200, avgDailyUsage: 2, minQuantity: 10 },
    ];
    const r = forecastShortage(items, 30);
    expect(r.isValid).toBe(true);
    expect(r.forecastDays).toBe(30);
    expect(r.totalItems).toBe(2);
    // A: projected = 50 - 5*30 = -100 → will run out
    expect(r.criticalCount).toBe(1);
    expect(r.criticalItems[0].itemId).toBe('i1');
    expect(r.criticalItems[0].daysUntilStockout).toBe(10);
  });

  it('returns invalid for empty items', () => {
    const r = forecastShortage([]);
    expect(r.isValid).toBe(false);
  });

  it('defaults to 30 days forecast', () => {
    const r = forecastShortage([
      { itemId: 'i1', currentQuantity: 100, avgDailyUsage: 1, minQuantity: 5 },
    ]);
    expect(r.forecastDays).toBe(30);
  });
});
