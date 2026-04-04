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
} = require('../services/inventory/inventoryCalculations.service');

// ========================================
// CONSTANTS
// ========================================
describe('INVENTORY_CONSTANTS', () => {
  test('ITEM_CATEGORIES محددة', () => {
    expect(INVENTORY_CONSTANTS.ITEM_CATEGORIES.MEDICAL_SUPPLIES).toBe('medical_supplies');
    expect(INVENTORY_CONSTANTS.ITEM_CATEGORIES.THERAPY_EQUIPMENT).toBe('therapy_equipment');
    expect(INVENTORY_CONSTANTS.ITEM_CATEGORIES.MEDICATIONS).toBe('medications');
  });

  test('TRANSACTION_TYPES محددة', () => {
    expect(INVENTORY_CONSTANTS.TRANSACTION_TYPES.PURCHASE).toBe('purchase');
    expect(INVENTORY_CONSTANTS.TRANSACTION_TYPES.ISSUE).toBe('issue');
    expect(INVENTORY_CONSTANTS.TRANSACTION_TYPES.RETURN).toBe('return');
    expect(INVENTORY_CONSTANTS.TRANSACTION_TYPES.DISPOSAL).toBe('disposal');
  });

  test('STOCK_STATUS محددة', () => {
    expect(INVENTORY_CONSTANTS.STOCK_STATUS.IN_STOCK).toBe('in_stock');
    expect(INVENTORY_CONSTANTS.STOCK_STATUS.LOW_STOCK).toBe('low_stock');
    expect(INVENTORY_CONSTANTS.STOCK_STATUS.OUT_OF_STOCK).toBe('out_of_stock');
    expect(INVENTORY_CONSTANTS.STOCK_STATUS.OVERSTOCK).toBe('overstock');
    expect(INVENTORY_CONSTANTS.STOCK_STATUS.EXPIRED).toBe('expired');
  });

  test('VALUATION_METHODS محددة', () => {
    expect(INVENTORY_CONSTANTS.VALUATION_METHODS.FIFO).toBe('fifo');
    expect(INVENTORY_CONSTANTS.VALUATION_METHODS.AVERAGE).toBe('average');
  });

  test('DEFAULTS صحيحة', () => {
    expect(INVENTORY_CONSTANTS.DEFAULTS.SAFETY_STOCK_DAYS).toBe(7);
    expect(INVENTORY_CONSTANTS.DEFAULTS.MAX_EXPIRY_ALERT_DAYS).toBe(30);
    expect(INVENTORY_CONSTANTS.DEFAULTS.LEAD_TIME_DAYS).toBe(3);
  });

  test('ORDER_STATUS محددة', () => {
    expect(INVENTORY_CONSTANTS.ORDER_STATUS.RECEIVED).toBe('received');
    expect(INVENTORY_CONSTANTS.ORDER_STATUS.DRAFT).toBe('draft');
    expect(INVENTORY_CONSTANTS.ORDER_STATUS.APPROVED).toBe('approved');
  });
});

// ========================================
// STOCK LEVEL
// ========================================
describe('calculateStockLevel', () => {
  test('مستوى طبيعي → in_stock', () => {
    const r = calculateStockLevel(50, 10, 100, 20);
    expect(r.isValid).toBe(true);
    expect(r.status).toBe('in_stock');
    expect(r.fillRate).toBe(50);
    expect(r.needsReorder).toBe(false);
    expect(r.shortage).toBe(0);
  });

  test('مخزون منخفض ≤ min → low_stock', () => {
    const r = calculateStockLevel(8, 10, 100, 20);
    expect(r.status).toBe('low_stock');
    expect(r.shortage).toBe(2);
  });

  test('مخزون منتهٍ = 0 → out_of_stock', () => {
    const r = calculateStockLevel(0, 10, 100, 20);
    expect(r.status).toBe('out_of_stock');
    expect(r.needsReorder).toBe(true);
  });

  test('مخزون زائد ≥ max → overstock', () => {
    const r = calculateStockLevel(100, 10, 100, 20);
    expect(r.status).toBe('overstock');
    expect(r.surplus).toBe(0); // exactly at max
    expect(r.availableSpace).toBe(0);
  });

  test('مخزون زائد عن max → surplus محسوب', () => {
    const r = calculateStockLevel(120, 10, 100, 20);
    expect(r.status).toBe('overstock');
    expect(r.surplus).toBe(20);
  });

  test('needsReorder عند الوصول لنقطة الطلب', () => {
    const r = calculateStockLevel(20, 10, 100, 20);
    expect(r.needsReorder).toBe(true);
  });

  test('reorderPoint افتراضي = 1.5 × min', () => {
    const r = calculateStockLevel(50, 10, 100);
    expect(r.reorderPoint).toBe(15); // ceil(10 * 1.5)
  });

  test('كمية سالبة → isValid false', () => {
    expect(calculateStockLevel(-1, 10, 100).isValid).toBe(false);
  });

  test('حدود غير صالحة → isValid false', () => {
    expect(calculateStockLevel(50, 100, 10).isValid).toBe(false); // min >= max
    expect(calculateStockLevel(50, 10, 0).isValid).toBe(false); // max = 0
  });

  test('fillRate محسوب صحيح', () => {
    const r = calculateStockLevel(75, 10, 100, 20);
    expect(r.fillRate).toBe(75);
  });
});

// ========================================
// REORDER POINT
// ========================================
describe('calculateReorderPoint', () => {
  test('حساب نقطة الطلب', () => {
    // ROP = (5 × 3) + (5 × 7) = 15 + 35 = 50
    const r = calculateReorderPoint(5, 3, 7);
    expect(r.isValid).toBe(true);
    expect(r.reorderPoint).toBe(50);
    expect(r.demandDuringLeadTime).toBe(15);
    expect(r.safetyStock).toBe(35);
  });

  test('استخدام مخزون الأمان الافتراضي (7 أيام)', () => {
    const r = calculateReorderPoint(10, 5);
    expect(r.safetyStockDays).toBe(7);
    expect(r.safetyStock).toBe(70); // 10 × 7
    expect(r.reorderPoint).toBe(120); // (10×5) + (10×7)
  });

  test('استهلاك صفري = نقطة طلب صفر', () => {
    const r = calculateReorderPoint(0, 5, 7);
    expect(r.isValid).toBe(true);
    expect(r.reorderPoint).toBe(0);
  });

  test('قيم سالبة → isValid false', () => {
    expect(calculateReorderPoint(-1, 5).isValid).toBe(false);
    expect(calculateReorderPoint(5, -1).isValid).toBe(false);
  });
});

// ========================================
// EOQ
// ========================================
describe('calculateEOQ', () => {
  test('حساب EOQ بشكل صحيح', () => {
    // EOQ = √(2 × 1200 × 50 / 2) = √60000 = 244.9 → 245
    const r = calculateEOQ(1200, 50, 2);
    expect(r.isValid).toBe(true);
    expect(r.eoq).toBe(245);
    expect(r.annualDemand).toBe(1200);
  });

  test('عدد الطلبات السنوية محسوب', () => {
    const r = calculateEOQ(1200, 50, 2);
    expect(r.ordersPerYear).toBeGreaterThan(0);
    expect(r.daysBetweenOrders).toBeGreaterThan(0);
  });

  test('إجمالي التكاليف محسوب', () => {
    const r = calculateEOQ(1200, 50, 2);
    expect(r.totalOrderingCost).toBeGreaterThan(0);
    expect(r.totalHoldingCost).toBeGreaterThan(0);
    expect(r.totalCost).toBeGreaterThan(0);
  });

  test('طلب سنوي صفر → isValid false', () => {
    expect(calculateEOQ(0, 50, 2).isValid).toBe(false);
  });

  test('تكلفة طلب صفر → isValid false', () => {
    expect(calculateEOQ(1200, 0, 2).isValid).toBe(false);
  });

  test('تكلفة احتفاظ صفر → isValid false', () => {
    expect(calculateEOQ(1200, 50, 0).isValid).toBe(false);
  });

  test('avgInventory = EOQ / 2', () => {
    const r = calculateEOQ(1200, 50, 2);
    expect(r.avgInventory).toBeCloseTo(r.eoq / 2, 0);
  });
});

// ========================================
// WEIGHTED AVERAGE COST
// ========================================
describe('calculateWeightedAverageCost', () => {
  test('حساب المتوسط المرجح', () => {
    const batches = [
      { quantity: 100, unitCost: 10 },
      { quantity: 50, unitCost: 12 },
      { quantity: 150, unitCost: 8 },
    ];
    const r = calculateWeightedAverageCost(batches);
    expect(r.isValid).toBe(true);
    // (100×10 + 50×12 + 150×8) / 300 = (1000+600+1200)/300 = 2800/300 = 9.33
    expect(r.weightedAvgCost).toBeCloseTo(9.33, 1);
    expect(r.totalQuantity).toBe(300);
    expect(r.totalValue).toBe(2800);
  });

  test('دفعة واحدة → متوسط = سعر الدفعة', () => {
    const r = calculateWeightedAverageCost([{ quantity: 50, unitCost: 15 }]);
    expect(r.weightedAvgCost).toBe(15);
  });

  test('totalCost لكل دفعة محسوب', () => {
    const r = calculateWeightedAverageCost([
      { quantity: 10, unitCost: 5 },
      { quantity: 20, unitCost: 8 },
    ]);
    expect(r.batches[0].totalCost).toBe(50);
    expect(r.batches[1].totalCost).toBe(160);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(calculateWeightedAverageCost([]).isValid).toBe(false);
    expect(calculateWeightedAverageCost(null).isValid).toBe(false);
  });

  test('كمية صفر → isValid false', () => {
    expect(calculateWeightedAverageCost([{ quantity: 0, unitCost: 10 }]).isValid).toBe(false);
  });
});

// ========================================
// FIFO VALUATION
// ========================================
describe('calculateFIFOValuation', () => {
  const batches = [
    { id: 'B1', quantity: 100, unitCost: 10, receivedDate: '2025-01-01' },
    { id: 'B2', quantity: 50, unitCost: 12, receivedDate: '2025-02-01' },
    { id: 'B3', quantity: 80, unitCost: 15, receivedDate: '2025-03-01' },
  ];

  test('FIFO - صرف من الدفعة الأقدم أولاً', () => {
    const r = calculateFIFOValuation(batches, 80);
    expect(r.isValid).toBe(true);
    expect(r.method).toBe('fifo');
    expect(r.issuedQuantity).toBe(80);
    // يُصرف 80 وحدة بسعر 10 = 800
    expect(r.issuedCost).toBe(800);
    expect(r.issuedBatches[0].id).toBe('B1');
  });

  test('FIFO - صرف من دفعتين', () => {
    const r = calculateFIFOValuation(batches, 120);
    expect(r.isValid).toBe(true);
    // 100 × 10 + 20 × 12 = 1000 + 240 = 1240
    expect(r.issuedCost).toBe(1240);
    expect(r.issuedBatches.length).toBe(2);
  });

  test('الكمية المتبقية محسوبة', () => {
    const r = calculateFIFOValuation(batches, 100);
    expect(r.remainingQuantity).toBe(130); // 230 - 100
    expect(r.remainingBatches.length).toBeGreaterThan(0);
  });

  test('كمية صادرة = المتاح كله', () => {
    const r = calculateFIFOValuation(batches, 230); // 100+50+80
    expect(r.isValid).toBe(true);
    expect(r.remainingQuantity).toBe(0);
    expect(r.remainingValue).toBe(0);
  });

  test('صرف صفر وحدات', () => {
    const r = calculateFIFOValuation(batches, 0);
    expect(r.isValid).toBe(true);
    expect(r.issuedCost).toBe(0);
    expect(r.remainingQuantity).toBe(230);
  });

  test('كمية صادرة تتجاوز المتاح → isValid false', () => {
    expect(calculateFIFOValuation(batches, 300).isValid).toBe(false);
  });

  test('كمية صادرة سالبة → isValid false', () => {
    expect(calculateFIFOValuation(batches, -10).isValid).toBe(false);
  });

  test('قائمة دفعات فارغة → isValid false', () => {
    expect(calculateFIFOValuation([], 10).isValid).toBe(false);
  });
});

// ========================================
// INVENTORY VALUE
// ========================================
describe('calculateInventoryValue', () => {
  const items = [
    { itemId: '1', quantity: 100, unitCost: 10, category: 'medical_supplies' },
    { itemId: '2', quantity: 50, unitCost: 20, category: 'medical_supplies' },
    { itemId: '3', quantity: 200, unitCost: 5, category: 'office_supplies' },
    { itemId: '4', quantity: 30, unitCost: 50, category: 'therapy_equipment' },
  ];

  test('حساب القيمة الإجمالية', () => {
    const r = calculateInventoryValue(items);
    expect(r.isValid).toBe(true);
    // 1000 + 1000 + 1000 + 1500 = 4500
    expect(r.totalValue).toBe(4500);
    expect(r.itemCount).toBe(4);
    expect(r.totalQuantity).toBe(380);
  });

  test('القيمة حسب الفئة', () => {
    const r = calculateInventoryValue(items);
    expect(r.byCategory.medical_supplies).toBeDefined();
    expect(r.byCategory.medical_supplies.value).toBe(2000); // 1000+1000
    expect(r.byCategory.office_supplies.value).toBe(1000);
  });

  test('متوسط القيمة لكل صنف', () => {
    const r = calculateInventoryValue(items);
    expect(r.avgValuePerItem).toBe(1125); // 4500/4
  });

  test('قائمة فارغة → isValid false', () => {
    expect(calculateInventoryValue([]).isValid).toBe(false);
    expect(calculateInventoryValue(null).isValid).toBe(false);
  });

  test('صنف واحد', () => {
    const r = calculateInventoryValue([{ quantity: 10, unitCost: 25, category: 'medical' }]);
    expect(r.totalValue).toBe(250);
  });
});

// ========================================
// CONSUMPTION RATE
// ========================================
describe('analyzeConsumptionRate', () => {
  const transactions = [
    { type: 'issue', quantity: 5 },
    { type: 'issue', quantity: 10 },
    { type: 'issue', quantity: 15 },
    { type: 'purchase', quantity: 100 },
    { type: 'return', quantity: 5 },
  ];

  test('تحليل معدل الاستهلاك - 30 يوم', () => {
    const r = analyzeConsumptionRate(transactions, 30);
    expect(r.isValid).toBe(true);
    expect(r.totalIssued).toBe(30); // 5+10+15
    expect(r.avgDailyUsage).toBe(1); // 30/30
    expect(r.avgWeeklyUsage).toBe(7);
    expect(r.avgMonthlyUsage).toBe(30);
  });

  test('تجميع حسب نوع المعاملة', () => {
    const r = analyzeConsumptionRate(transactions, 30);
    expect(r.byType.issue.count).toBe(3);
    expect(r.byType.purchase.count).toBe(1);
    expect(r.byType.return.count).toBe(1);
  });

  test('مستوى الاستهلاك صحيح', () => {
    // avgDailyUsage = 1 → low (بين 0 و 1 غير شامل)
    // avgDailyUsage بالضبط 1 = medium
    const r = analyzeConsumptionRate(transactions, 30);
    expect(r.consumptionLevel).toBe('medium'); // 1 >= 1 و < 5
  });

  test('لا معاملات صرف → استهلاك صفر', () => {
    const r = analyzeConsumptionRate([{ type: 'purchase', quantity: 50 }], 30);
    expect(r.totalIssued).toBe(0);
    expect(r.consumptionLevel).toBe('no_usage');
  });

  test('قائمة فارغة → isValid false', () => {
    expect(analyzeConsumptionRate([], 30).isValid).toBe(false);
    expect(analyzeConsumptionRate(null, 30).isValid).toBe(false);
  });

  test('period افتراضي = 30 يوم', () => {
    const r = analyzeConsumptionRate(transactions);
    expect(r.periodDays).toBe(30);
  });
});

// ========================================
// INVENTORY TURNOVER
// ========================================
describe('calculateInventoryTurnover', () => {
  test('حساب معدل دوران المخزون', () => {
    const r = calculateInventoryTurnover(120000, 10000, 14000);
    expect(r.isValid).toBe(true);
    // avgInventory = 12000, turnover = 120000/12000 = 10
    expect(r.turnoverRatio).toBe(10);
    expect(r.avgInventory).toBe(12000);
  });

  test('daysInInventory محسوب', () => {
    const r = calculateInventoryTurnover(120000, 10000, 14000);
    // 365/10 = 36.5
    expect(r.daysInInventory).toBe(36.5);
  });

  test('تصنيف الكفاءة', () => {
    // turnover >= 12 → excellent
    const r1 = calculateInventoryTurnover(144000, 10000, 14000); // 144000/12000 = 12
    expect(r1.efficiency).toBe('excellent');

    // turnover >= 6 → good (10)
    const r2 = calculateInventoryTurnover(120000, 10000, 14000);
    expect(r2.efficiency).toBe('good');

    // turnover >= 3 → acceptable
    const r3 = calculateInventoryTurnover(36000, 10000, 14000); // 36000/12000 = 3
    expect(r3.efficiency).toBe('acceptable');

    // turnover < 3 → poor
    const r4 = calculateInventoryTurnover(12000, 10000, 14000); // 12000/12000 = 1
    expect(r4.efficiency).toBe('poor');
  });

  test('قيم سالبة → isValid false', () => {
    expect(calculateInventoryTurnover(-100, 1000, 1000).isValid).toBe(false);
    expect(calculateInventoryTurnover(100, -1000, 1000).isValid).toBe(false);
  });

  test('متوسط مخزون صفر → isValid false', () => {
    expect(calculateInventoryTurnover(1000, 0, 0).isValid).toBe(false);
  });
});

// ========================================
// EXPIRY STATUS
// ========================================
describe('checkExpiryStatus', () => {
  const futureDate = days => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  const items = [
    { itemId: '1', expiryDate: futureDate(-10) }, // منتهي
    { itemId: '2', expiryDate: futureDate(15) }, // ينتهي قريباً (< 30 يوم)
    { itemId: '3', expiryDate: futureDate(60) }, // صالح
    { itemId: '4', expiryDate: null }, // لا تاريخ صلاحية
  ];

  test('تصنيف حالات الصلاحية', () => {
    const r = checkExpiryStatus(items);
    expect(r.isValid).toBe(true);
    expect(r.total).toBe(4);
    expect(r.expired).toBe(1);
    expect(r.expiringSoon).toBe(1);
    expect(r.valid).toBe(1);
    expect(r.noExpiry).toBe(1);
  });

  test('requiresAction عند وجود منتهٍ أو قريب الانتهاء', () => {
    const r = checkExpiryStatus(items);
    expect(r.requiresAction).toBe(true);
  });

  test('لا مشاكل → requiresAction false', () => {
    const r = checkExpiryStatus([
      { itemId: '1', expiryDate: futureDate(60) },
      { itemId: '2', expiryDate: null },
    ]);
    expect(r.requiresAction).toBe(false);
  });

  test('expiredItems فارغ', () => {
    const r = checkExpiryStatus([{ itemId: '1', expiryDate: futureDate(60) }]);
    expect(r.expiredItems).toHaveLength(0);
  });

  test('expiringSoonItems مرتبة من الأقرب', () => {
    const r = checkExpiryStatus([
      { itemId: '1', expiryDate: futureDate(25) },
      { itemId: '2', expiryDate: futureDate(5) },
      { itemId: '3', expiryDate: futureDate(15) },
    ]);
    expect(r.expiringSoonItems[0].itemId).toBe('2'); // الأقرب أولاً
  });

  test('alertDays مخصص', () => {
    const r = checkExpiryStatus(
      [{ itemId: '1', expiryDate: futureDate(45) }],
      60 // تنبيه قبل 60 يوم
    );
    expect(r.expiringSoon).toBe(1);
    expect(r.alertDays).toBe(60);
  });

  test('null → isValid false', () => {
    expect(checkExpiryStatus(null).isValid).toBe(false);
  });
});

// ========================================
// PURCHASE ORDER
// ========================================
describe('calculatePurchaseOrder', () => {
  const items = [
    { itemId: '1', name: 'قفازات', quantity: 100, unitPrice: 5 },
    { itemId: '2', name: 'مطهر', quantity: 20, unitPrice: 25 },
  ];

  test('حساب أمر شراء مع VAT 15%', () => {
    const r = calculatePurchaseOrder(items, 0, 15);
    expect(r.isValid).toBe(true);
    // subtotal = 100×5 + 20×25 = 500+500 = 1000
    expect(r.subtotal).toBe(1000);
    expect(r.totalVat).toBe(150); // 1000 × 15%
    expect(r.grandTotal).toBe(1150);
  });

  test('خصم 10%', () => {
    const r = calculatePurchaseOrder(items, 10, 15);
    // subtotal=1000, discount=100, afterDiscount=900, vat=135, total=1035
    expect(r.totalDiscount).toBe(100);
    expect(r.afterDiscount).toBe(900);
    expect(r.grandTotal).toBe(1035);
  });

  test('VAT 15% افتراضي', () => {
    const r = calculatePurchaseOrder(items);
    expect(r.vatRate).toBe(15);
    expect(r.totalVat).toBe(150);
  });

  test('بدون VAT (vatRate=0)', () => {
    const r = calculatePurchaseOrder(items, 0, 0);
    expect(r.totalVat).toBe(0);
    expect(r.grandTotal).toBe(r.subtotal);
  });

  test('إجمالي الكميات', () => {
    const r = calculatePurchaseOrder(items);
    expect(r.totalQuantity).toBe(120); // 100+20
    expect(r.itemCount).toBe(2);
  });

  test('تفاصيل كل سطر محسوبة', () => {
    const r = calculatePurchaseOrder(items, 0, 15);
    expect(r.items[0].subtotal).toBe(500);
    expect(r.items[0].vatAmount).toBe(75);
    expect(r.items[0].total).toBe(575);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(calculatePurchaseOrder([]).isValid).toBe(false);
    expect(calculatePurchaseOrder(null).isValid).toBe(false);
  });

  test('كمية صفر → isValid false', () => {
    expect(calculatePurchaseOrder([{ quantity: 0, unitPrice: 10 }]).isValid).toBe(false);
  });
});

// ========================================
// ABC ANALYSIS
// ========================================
describe('performABCAnalysis', () => {
  const items = [
    { itemId: '1', name: 'جهاز تأهيل', quantity: 5, unitCost: 2000 }, // 10000
    { itemId: '2', name: 'قفازات', quantity: 500, unitCost: 2 }, // 1000
    { itemId: '3', name: 'أدوات علاج', quantity: 20, unitCost: 100 }, // 2000
    { itemId: '4', name: 'أقلام', quantity: 100, unitCost: 1 }, // 100
    { itemId: '5', name: 'مطهر', quantity: 50, unitCost: 20 }, // 1000
  ];

  test('تصنيف ABC صحيح', () => {
    const r = performABCAnalysis(items);
    expect(r.isValid).toBe(true);
    expect(r.totalItems).toBe(5);
    // إجمالي = 14100
    // الأعلى قيمة (10000 = 70.9%) → A
    expect(r.items[0].abcCategory).toBe('A');
  });

  test('summary يحتوي A, B, C', () => {
    const r = performABCAnalysis(items);
    expect(r.summary.A).toBeDefined();
    expect(r.summary.B).toBeDefined();
    expect(r.summary.C).toBeDefined();
    expect(r.summary.A.count).toBeGreaterThan(0);
  });

  test('ترتيب تنازلي حسب القيمة', () => {
    const r = performABCAnalysis(items);
    expect(r.items[0].rank).toBe(1);
    expect(r.items[0].totalValue).toBeGreaterThanOrEqual(r.items[1].totalValue);
  });

  test('إجمالي القيمة محسوب', () => {
    const r = performABCAnalysis(items);
    expect(r.totalValue).toBe(14100); // 10000+1000+2000+100+1000
  });

  test('valuePct لكل صنف', () => {
    const r = performABCAnalysis(items);
    const totalPct = r.items.reduce((sum, i) => sum + i.valuePct, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(performABCAnalysis([]).isValid).toBe(false);
    expect(performABCAnalysis(null).isValid).toBe(false);
  });

  test('قيمة إجمالية صفر → isValid false', () => {
    expect(performABCAnalysis([{ quantity: 0, unitCost: 0 }]).isValid).toBe(false);
  });
});

// ========================================
// STOCK RECONCILIATION
// ========================================
describe('reconcileStockCount', () => {
  const systemRecords = [
    { itemId: '1', itemName: 'قفازات', quantity: 100, unitCost: 5 },
    { itemId: '2', itemName: 'مطهر', quantity: 50, unitCost: 20 },
    { itemId: '3', itemName: 'أدوات', quantity: 30, unitCost: 100 },
  ];

  const physicalCount = [
    { itemId: '1', countedQuantity: 95 }, // نقص 5
    { itemId: '2', countedQuantity: 55 }, // زيادة 5
    { itemId: '3', countedQuantity: 30 }, // مطابق
  ];

  test('مطابقة الجرد', () => {
    const r = reconcileStockCount(systemRecords, physicalCount);
    expect(r.isValid).toBe(true);
    expect(r.totalSystemItems).toBe(3);
    expect(r.discrepancyCount).toBe(2); // صنف 1 وصنف 2
    expect(r.matched).toBeGreaterThan(0);
  });

  test('حالة الفروق صحيحة', () => {
    const r = reconcileStockCount(systemRecords, physicalCount);
    const item1 = r.discrepancies.find(d => d.itemId === '1');
    const item2 = r.discrepancies.find(d => d.itemId === '2');
    expect(item1.status).toBe('shortage');
    expect(item1.variance).toBe(-5);
    expect(item2.status).toBe('surplus');
    expect(item2.variance).toBe(5);
  });

  test('قيمة التباين محسوبة', () => {
    const r = reconcileStockCount(systemRecords, physicalCount);
    const item1 = r.discrepancies.find(d => d.itemId === '1');
    expect(item1.varianceValue).toBe(-25); // -5 × 5
  });

  test('جرد مطابق تماماً → لا فروق', () => {
    const r = reconcileStockCount(
      [{ itemId: '1', quantity: 50 }],
      [{ itemId: '1', countedQuantity: 50 }]
    );
    expect(r.discrepancyCount).toBe(0);
    expect(r.requiresAdjustment).toBe(false);
    expect(r.accuracyRate).toBe(100);
  });

  test('صنف غير موجود في الجرد الفعلي', () => {
    const r = reconcileStockCount(
      [
        { itemId: '1', quantity: 50 },
        { itemId: '2', quantity: 30 },
      ],
      [{ itemId: '1', countedQuantity: 50 }] // صنف 2 غائب
    );
    const missing = r.discrepancies.find(d => d.itemId === '2');
    expect(missing.status).toBe('missing_from_count');
  });

  test('null → isValid false', () => {
    expect(reconcileStockCount(null, []).isValid).toBe(false);
    expect(reconcileStockCount([], null).isValid).toBe(false);
  });
});

// ========================================
// SUPPLIER PERFORMANCE
// ========================================
describe('evaluateSupplierPerformance', () => {
  const orders = [
    {
      status: 'received',
      orderDate: '2025-01-01',
      expectedDelivery: '2025-01-05',
      actualDelivery: '2025-01-04',
      orderedQty: 100,
      receivedQty: 100,
    },
    {
      status: 'received',
      orderDate: '2025-02-01',
      expectedDelivery: '2025-02-05',
      actualDelivery: '2025-02-07', // متأخر
      orderedQty: 50,
      receivedQty: 45, // ناقص
    },
    {
      status: 'received',
      orderDate: '2025-03-01',
      expectedDelivery: '2025-03-05',
      actualDelivery: '2025-03-05', // في الوقت
      orderedQty: 80,
      receivedQty: 80,
    },
  ];

  test('تقييم أداء المورد', () => {
    const r = evaluateSupplierPerformance(orders);
    expect(r.isValid).toBe(true);
    expect(r.totalOrders).toBe(3);
    expect(r.completedOrders).toBe(3);
  });

  test('معدل التسليم في الوقت', () => {
    const r = evaluateSupplierPerformance(orders);
    // 2 من 3 في الوقت = 66.67%
    expect(r.onTimeDeliveryRate).toBeCloseTo(66.67, 1);
  });

  test('دقة الكميات', () => {
    const r = evaluateSupplierPerformance(orders);
    // (100% + 90% + 100%) / 3 = 96.67%
    expect(r.quantityAccuracy).toBeCloseTo(96.67, 1);
  });

  test('متوسط أيام التسليم', () => {
    const r = evaluateSupplierPerformance(orders);
    expect(r.avgDeliveryDays).toBeGreaterThan(0);
  });

  test('تصنيف الأداء', () => {
    const r = evaluateSupplierPerformance(orders);
    expect(['excellent', 'good', 'acceptable', 'poor']).toContain(r.rating);
  });

  test('جميع الطلبات في الوقت وكاملة → excellent', () => {
    const perfect = [
      {
        status: 'received',
        orderDate: '2025-01-01',
        expectedDelivery: '2025-01-05',
        actualDelivery: '2025-01-03',
        orderedQty: 100,
        receivedQty: 100,
      },
      {
        status: 'received',
        orderDate: '2025-02-01',
        expectedDelivery: '2025-02-05',
        actualDelivery: '2025-02-04',
        orderedQty: 50,
        receivedQty: 50,
      },
    ];
    const r = evaluateSupplierPerformance(perfect);
    expect(r.rating).toBe('excellent');
    expect(r.onTimeDeliveryRate).toBe(100);
    expect(r.quantityAccuracy).toBe(100);
  });

  test('لا طلبات → isValid false', () => {
    expect(evaluateSupplierPerformance([]).isValid).toBe(false);
    expect(evaluateSupplierPerformance(null).isValid).toBe(false);
  });

  test('لا طلبات مستلمة → isValid false', () => {
    expect(
      evaluateSupplierPerformance([{ status: 'ordered' }, { status: 'pending' }]).isValid
    ).toBe(false);
  });
});

// ========================================
// SHORTAGE FORECAST
// ========================================
describe('forecastShortage', () => {
  const items = [
    { itemId: '1', itemName: 'قفازات', currentQuantity: 100, avgDailyUsage: 5, minQuantity: 20 },
    { itemId: '2', itemName: 'مطهر', currentQuantity: 30, avgDailyUsage: 3, minQuantity: 20 },
    { itemId: '3', itemName: 'أدوات', currentQuantity: 0, avgDailyUsage: 2, minQuantity: 10 },
  ];

  test('توقع نقص المخزون لـ 30 يوم', () => {
    const r = forecastShortage(items, 30);
    expect(r.isValid).toBe(true);
    expect(r.forecastDays).toBe(30);
    expect(r.totalItems).toBe(3);
  });

  test('الصنف 1: لن ينفد (100 - 150 < 0 but let us check)', () => {
    const r = forecastShortage(items, 30);
    const item1 = r.items.find(i => i.itemId === '1');
    // projectedStock = 100 - 30*5 = 100-150 = -50 < 20 → willRunOut = true
    expect(item1.willRunOut).toBe(true);
  });

  test('صنف خارج المخزون تماماً', () => {
    const r = forecastShortage(items, 30);
    expect(r.outOfStockCount).toBe(1); // الصنف 3
    expect(r.requiresUrgentAction).toBe(true);
  });

  test('daysUntilStockout محسوب', () => {
    const r = forecastShortage(items, 30);
    const item1 = r.items.find(i => i.itemId === '1');
    expect(item1.daysUntilStockout).toBe(20); // floor(100/5)
  });

  test('صنف بدون استهلاك → daysUntilStockout = null', () => {
    const r = forecastShortage(
      [{ itemId: 'X', currentQuantity: 50, avgDailyUsage: 0, minQuantity: 5 }],
      30
    );
    expect(r.items[0].daysUntilStockout).toBeNull();
    expect(r.items[0].willRunOut).toBe(false);
  });

  test('suggestedOrderQty للصنف الناقص', () => {
    const r = forecastShortage(items, 30);
    const item3 = r.items.find(i => i.itemId === '3');
    // willRunOut = true, projectedUsage = 30*2 = 60, currentQty=0, minQty=10
    // suggestedOrderQty = ceil(60 - 0 + 10) = 70
    expect(item3.suggestedOrderQty).toBe(70);
  });

  test('forecastDays افتراضي = 30', () => {
    const r = forecastShortage(items);
    expect(r.forecastDays).toBe(30);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(forecastShortage([]).isValid).toBe(false);
    expect(forecastShortage(null).isValid).toBe(false);
  });
});

// ========================================
// INTEGRATION
// ========================================
describe('Integration - دورة المخزون الكاملة', () => {
  test('من الاستلام إلى الصرف وإعادة الطلب', () => {
    // 1. حساب مستوى المخزون
    const stockLevel = calculateStockLevel(30, 20, 200, 50);
    expect(stockLevel.isValid).toBe(true);
    expect(stockLevel.needsReorder).toBe(true); // 30 <= 50 reorderPoint

    // 2. حساب نقطة إعادة الطلب
    const rop = calculateReorderPoint(5, 7, 3);
    expect(rop.isValid).toBe(true);
    expect(rop.reorderPoint).toBe(50); // (5×7) + (5×3) = 35+15=50

    // 3. حساب EOQ
    const eoq = calculateEOQ(1000, 100, 5);
    expect(eoq.isValid).toBe(true);
    expect(eoq.eoq).toBeGreaterThan(0);

    // 4. حساب أمر الشراء
    const po = calculatePurchaseOrder([{ quantity: eoq.eoq, unitPrice: 10 }], 0, 15);
    expect(po.isValid).toBe(true);
    expect(po.grandTotal).toBeGreaterThan(0);
  });

  test('تقييم قيمة المخزون وتحليل ABC', () => {
    const items = [
      { itemId: '1', quantity: 10, unitCost: 500, category: 'therapy' },
      { itemId: '2', quantity: 100, unitCost: 5, category: 'office' },
      { itemId: '3', quantity: 50, unitCost: 20, category: 'medical' },
    ];

    const value = calculateInventoryValue(items);
    expect(value.totalValue).toBe(6500); // 5000+500+1000

    const abc = performABCAnalysis(items);
    expect(abc.isValid).toBe(true);
    expect(abc.items[0].abcCategory).toBe('A'); // item 1 = 5000 = 76.9%
  });

  test('مطابقة الجرد وتقييم المورد', () => {
    const system = [
      { itemId: '1', itemName: 'A', quantity: 100, unitCost: 10 },
      { itemId: '2', itemName: 'B', quantity: 50, unitCost: 20 },
    ];
    const physical = [
      { itemId: '1', countedQuantity: 100 },
      { itemId: '2', countedQuantity: 48 },
    ];

    const recon = reconcileStockCount(system, physical);
    expect(recon.discrepancyCount).toBe(1); // صنف 2 فقط
    expect(recon.requiresAdjustment).toBe(true);

    const supplier = evaluateSupplierPerformance([
      {
        status: 'received',
        orderDate: '2025-01-01',
        expectedDelivery: '2025-01-07',
        actualDelivery: '2025-01-06',
        orderedQty: 100,
        receivedQty: 100,
      },
    ]);
    expect(supplier.rating).toBe('excellent');
  });

  test('توقع النقص والتحضير للطلب', () => {
    const items = [
      { itemId: '1', itemName: 'مطهر', currentQuantity: 20, avgDailyUsage: 2, minQuantity: 10 },
      { itemId: '2', itemName: 'قفازات', currentQuantity: 200, avgDailyUsage: 1, minQuantity: 50 },
    ];

    const forecast = forecastShortage(items, 30);
    expect(forecast.isValid).toBe(true);

    // الصنف 1: projectedStock = 20 - 60 = -40 < 10 → willRunOut
    const critical = forecast.items.find(i => i.itemId === '1');
    expect(critical.willRunOut).toBe(true);
    expect(critical.suggestedOrderQty).toBeGreaterThan(0);

    // الصنف 2: projectedStock = 200 - 30 = 170 > 50 → لن ينفد
    const safe = forecast.items.find(i => i.itemId === '2');
    expect(safe.willRunOut).toBe(false);
    expect(safe.suggestedOrderQty).toBe(0);
  });
});
