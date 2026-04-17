'use strict';

/**
 * Inventory Management Calculations Service
 * وحدة إدارة المخزون والمستلزمات - Pure Business Logic
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 *
 * لا يحتوي على أي imports خارجية - pure functions فقط
 */

// ========================================
// CONSTANTS
// ========================================
const INVENTORY_CONSTANTS = {
  ITEM_CATEGORIES: {
    MEDICAL_SUPPLIES: 'medical_supplies', // مستلزمات طبية
    THERAPY_EQUIPMENT: 'therapy_equipment', // أجهزة علاجية
    OFFICE_SUPPLIES: 'office_supplies', // مستلزمات مكتبية
    CLEANING_SUPPLIES: 'cleaning_supplies', // مستلزمات نظافة
    MEDICATIONS: 'medications', // أدوية
    SPARE_PARTS: 'spare_parts', // قطع غيار
    STATIONERY: 'stationery', // قرطاسية
    FOOD_BEVERAGES: 'food_beverages', // أغذية ومشروبات
  },

  TRANSACTION_TYPES: {
    PURCHASE: 'purchase', // شراء
    ISSUE: 'issue', // صرف
    RETURN: 'return', // إرجاع
    ADJUSTMENT: 'adjustment', // تعديل جرد
    TRANSFER: 'transfer', // نقل بين فروع
    DISPOSAL: 'disposal', // إتلاف
    WRITE_OFF: 'write_off', // شطب
  },

  VALUATION_METHODS: {
    FIFO: 'fifo', // أولاً الداخل أولاً الخارج
    LIFO: 'lifo', // أخيراً الداخل أولاً الخارج
    AVERAGE: 'average', // المتوسط المرجح
  },

  STOCK_STATUS: {
    IN_STOCK: 'in_stock',
    LOW_STOCK: 'low_stock',
    OUT_OF_STOCK: 'out_of_stock',
    OVERSTOCK: 'overstock',
    EXPIRED: 'expired',
  },

  ORDER_STATUS: {
    DRAFT: 'draft',
    PENDING: 'pending',
    APPROVED: 'approved',
    ORDERED: 'ordered',
    RECEIVED: 'received',
    CANCELLED: 'cancelled',
  },

  // معدلات مرجعية
  DEFAULTS: {
    REORDER_THRESHOLD_PCT: 20, // % من الحد الأقصى للطلب التلقائي
    SAFETY_STOCK_DAYS: 7, // أيام مخزون الأمان
    LEAD_TIME_DAYS: 3, // أيام وقت التوريد الافتراضي
    MAX_EXPIRY_ALERT_DAYS: 30, // أيام للتنبيه قبل انتهاء الصلاحية
  },
};

// ========================================
// STOCK LEVEL CALCULATIONS
// ========================================

/**
 * حساب مستوى المخزون الحالي والحالة
 */
function calculateStockLevel(currentQuantity, minQuantity, maxQuantity, reorderPoint) {
  if (currentQuantity === undefined || currentQuantity === null || currentQuantity < 0) {
    return { isValid: false, error: 'الكمية الحالية غير صالحة' };
  }
  if (minQuantity < 0 || maxQuantity <= 0 || minQuantity >= maxQuantity) {
    return { isValid: false, error: 'حدود المخزون غير صالحة' };
  }

  const reorder = reorderPoint !== undefined ? reorderPoint : Math.ceil(minQuantity * 1.5);
  const fillRate =
    maxQuantity > 0 ? Math.round((currentQuantity / maxQuantity) * 100 * 100) / 100 : 0;

  let status;
  if (currentQuantity === 0) {
    status = INVENTORY_CONSTANTS.STOCK_STATUS.OUT_OF_STOCK;
  } else if (currentQuantity <= minQuantity) {
    status = INVENTORY_CONSTANTS.STOCK_STATUS.LOW_STOCK;
  } else if (currentQuantity >= maxQuantity) {
    status = INVENTORY_CONSTANTS.STOCK_STATUS.OVERSTOCK;
  } else {
    status = INVENTORY_CONSTANTS.STOCK_STATUS.IN_STOCK;
  }

  return {
    isValid: true,
    currentQuantity,
    minQuantity,
    maxQuantity,
    reorderPoint: reorder,
    fillRate,
    status,
    needsReorder: currentQuantity <= reorder,
    shortage: currentQuantity < minQuantity ? minQuantity - currentQuantity : 0,
    surplus: currentQuantity > maxQuantity ? currentQuantity - maxQuantity : 0,
    availableSpace: maxQuantity - currentQuantity,
  };
}

/**
 * حساب نقطة إعادة الطلب (Reorder Point)
 * ROP = (Average Daily Usage × Lead Time) + Safety Stock
 */
function calculateReorderPoint(avgDailyUsage, leadTimeDays, safetyStockDays) {
  if (avgDailyUsage < 0) {
    return { isValid: false, error: 'متوسط الاستهلاك اليومي لا يمكن أن يكون سالباً' };
  }
  if (leadTimeDays < 0) {
    return { isValid: false, error: 'وقت التوريد لا يمكن أن يكون سالباً' };
  }

  const safetyDays = safetyStockDays || INVENTORY_CONSTANTS.DEFAULTS.SAFETY_STOCK_DAYS;
  const safetyStock = avgDailyUsage * safetyDays;
  const demandDuringLeadTime = avgDailyUsage * leadTimeDays;
  const reorderPoint = Math.ceil(demandDuringLeadTime + safetyStock);

  return {
    isValid: true,
    reorderPoint,
    avgDailyUsage,
    leadTimeDays,
    safetyStockDays: safetyDays,
    safetyStock: Math.ceil(safetyStock),
    demandDuringLeadTime: Math.ceil(demandDuringLeadTime),
  };
}

/**
 * حساب الكمية الاقتصادية للطلب (Economic Order Quantity - EOQ)
 * EOQ = √(2DS/H)
 * D = الطلب السنوي، S = تكلفة الطلب، H = تكلفة الاحتفاظ
 */
function calculateEOQ(annualDemand, orderingCost, holdingCostPerUnit) {
  if (annualDemand <= 0) {
    return { isValid: false, error: 'الطلب السنوي يجب أن يكون أكبر من صفر' };
  }
  if (orderingCost <= 0) {
    return { isValid: false, error: 'تكلفة الطلب يجب أن تكون أكبر من صفر' };
  }
  if (holdingCostPerUnit <= 0) {
    return { isValid: false, error: 'تكلفة الاحتفاظ يجب أن تكون أكبر من صفر' };
  }

  const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
  const ordersPerYear = annualDemand / eoq;
  const avgInventory = eoq / 2;
  const totalOrderingCost = ordersPerYear * orderingCost;
  const totalHoldingCost = avgInventory * holdingCostPerUnit;
  const totalCost = totalOrderingCost + totalHoldingCost;

  return {
    isValid: true,
    eoq: Math.ceil(eoq),
    annualDemand,
    orderingCost,
    holdingCostPerUnit,
    ordersPerYear: Math.round(ordersPerYear * 100) / 100,
    daysBetweenOrders: Math.round((365 / ordersPerYear) * 10) / 10,
    avgInventory: Math.round(avgInventory * 100) / 100,
    totalOrderingCost: Math.round(totalOrderingCost * 100) / 100,
    totalHoldingCost: Math.round(totalHoldingCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

// ========================================
// VALUATION METHODS
// ========================================

/**
 * تقييم المخزون بطريقة المتوسط المرجح
 * Weighted Average Cost Method
 */
function calculateWeightedAverageCost(batches) {
  if (!batches || !Array.isArray(batches) || batches.length === 0) {
    return { isValid: false, error: 'لا توجد دفعات للحساب' };
  }

  const invalid = batches.find(b => b.quantity <= 0 || b.unitCost <= 0);
  if (invalid) {
    return { isValid: false, error: 'الكمية والتكلفة يجب أن تكون أكبر من صفر' };
  }

  const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
  const totalValue = batches.reduce((sum, b) => sum + b.quantity * b.unitCost, 0);
  const weightedAvgCost = totalValue / totalQuantity;

  return {
    isValid: true,
    weightedAvgCost: Math.round(weightedAvgCost * 100) / 100,
    totalQuantity,
    totalValue: Math.round(totalValue * 100) / 100,
    batchCount: batches.length,
    batches: batches.map(b => ({
      ...b,
      totalCost: Math.round(b.quantity * b.unitCost * 100) / 100,
    })),
  };
}

/**
 * تقييم المخزون بطريقة FIFO
 * First In First Out - الصادر يُقيَّم بتكلفة أقدم الوارد
 */
function calculateFIFOValuation(batches, issuedQuantity) {
  if (!batches || !Array.isArray(batches) || batches.length === 0) {
    return { isValid: false, error: 'لا توجد دفعات' };
  }
  if (issuedQuantity < 0) {
    return { isValid: false, error: 'الكمية الصادرة لا يمكن أن تكون سالبة' };
  }

  const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
  if (issuedQuantity > totalAvailable) {
    return {
      isValid: false,
      error: `الكمية الصادرة (${issuedQuantity}) تتجاوز المتاح (${totalAvailable})`,
    };
  }

  // ترتيب الدفعات من الأقدم للأحدث
  const sorted = [...batches].sort(
    (a, b) => new Date(a.receivedDate || 0) - new Date(b.receivedDate || 0)
  );

  let remainingToIssue = issuedQuantity;
  let issuedCost = 0;
  const issuedBatches = [];
  const remainingBatches = [];

  for (const batch of sorted) {
    if (remainingToIssue <= 0) {
      remainingBatches.push({ ...batch });
      continue;
    }

    const qtyFromBatch = Math.min(batch.quantity, remainingToIssue);
    issuedCost += qtyFromBatch * batch.unitCost;
    issuedBatches.push({
      ...batch,
      issuedQty: qtyFromBatch,
      issuedCost: qtyFromBatch * batch.unitCost,
    });

    if (batch.quantity > qtyFromBatch) {
      remainingBatches.push({ ...batch, quantity: batch.quantity - qtyFromBatch });
    }
    remainingToIssue -= qtyFromBatch;
  }

  const remainingValue = remainingBatches.reduce((sum, b) => sum + b.quantity * b.unitCost, 0);
  const remainingQty = remainingBatches.reduce((sum, b) => sum + b.quantity, 0);

  return {
    isValid: true,
    method: 'fifo',
    issuedQuantity,
    issuedCost: Math.round(issuedCost * 100) / 100,
    avgIssuedCost: issuedQuantity > 0 ? Math.round((issuedCost / issuedQuantity) * 100) / 100 : 0,
    remainingQuantity: remainingQty,
    remainingValue: Math.round(remainingValue * 100) / 100,
    issuedBatches,
    remainingBatches,
  };
}

/**
 * حساب قيمة المخزون الإجمالية
 */
function calculateInventoryValue(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: 'لا توجد أصناف لحساب القيمة' };
  }

  const validItems = items.filter(i => i.quantity >= 0 && i.unitCost >= 0);

  const totalValue = validItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const totalQuantity = validItems.reduce((sum, item) => sum + item.quantity, 0);

  // تجميع حسب الفئة
  const byCategory = {};
  validItems.forEach(item => {
    const cat = item.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = { value: 0, quantity: 0, itemCount: 0 };
    byCategory[cat].value += item.quantity * item.unitCost;
    byCategory[cat].quantity += item.quantity;
    byCategory[cat].itemCount++;
  });

  // تقريب القيم في byCategory
  Object.keys(byCategory).forEach(cat => {
    byCategory[cat].value = Math.round(byCategory[cat].value * 100) / 100;
  });

  return {
    isValid: true,
    totalValue: Math.round(totalValue * 100) / 100,
    totalQuantity,
    itemCount: validItems.length,
    avgValuePerItem:
      validItems.length > 0 ? Math.round((totalValue / validItems.length) * 100) / 100 : 0,
    byCategory,
  };
}

// ========================================
// CONSUMPTION & USAGE ANALYSIS
// ========================================

/**
 * تحليل معدل استهلاك الأصناف
 */
function analyzeConsumptionRate(transactions, periodDays) {
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return { isValid: false, error: 'لا توجد معاملات لتحليل الاستهلاك' };
  }

  const period = periodDays || 30;
  const issues = transactions.filter(t => t.type === INVENTORY_CONSTANTS.TRANSACTION_TYPES.ISSUE);
  const totalIssued = issues.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const avgDailyUsage = totalIssued / period;

  // حساب أيام المخزون المتبقية
  const daysOfStock =
    avgDailyUsage > 0 ? Math.floor(transactions[0]?.currentStock / avgDailyUsage) : null;

  // تجميع حسب نوع المعاملة
  const byType = {};
  transactions.forEach(t => {
    const type = t.type || 'unknown';
    if (!byType[type]) byType[type] = { count: 0, totalQty: 0 };
    byType[type].count++;
    byType[type].totalQty += t.quantity || 0;
  });

  return {
    isValid: true,
    totalTransactions: transactions.length,
    periodDays: period,
    totalIssued,
    avgDailyUsage: Math.round(avgDailyUsage * 100) / 100,
    avgWeeklyUsage: Math.round(avgDailyUsage * 7 * 100) / 100,
    avgMonthlyUsage: Math.round(avgDailyUsage * 30 * 100) / 100,
    daysOfStock,
    byType,
    consumptionLevel:
      avgDailyUsage === 0
        ? 'no_usage'
        : avgDailyUsage < 1
          ? 'low'
          : avgDailyUsage < 5
            ? 'medium'
            : 'high',
  };
}

/**
 * حساب معدل دوران المخزون (Inventory Turnover Ratio)
 * ITR = COGS / Average Inventory Value
 */
function calculateInventoryTurnover(cogs, openingInventoryValue, closingInventoryValue) {
  if (cogs < 0) {
    return { isValid: false, error: 'تكلفة البضاعة المباعة لا يمكن أن تكون سالبة' };
  }
  if (openingInventoryValue < 0 || closingInventoryValue < 0) {
    return { isValid: false, error: 'قيمة المخزون لا يمكن أن تكون سالبة' };
  }

  const avgInventory = (openingInventoryValue + closingInventoryValue) / 2;

  if (avgInventory === 0) {
    return { isValid: false, error: 'متوسط المخزون لا يمكن أن يكون صفراً' };
  }

  const turnoverRatio = cogs / avgInventory;
  const daysInInventory = 365 / turnoverRatio;

  return {
    isValid: true,
    turnoverRatio: Math.round(turnoverRatio * 100) / 100,
    daysInInventory: Math.round(daysInInventory * 10) / 10,
    cogs,
    avgInventory: Math.round(avgInventory * 100) / 100,
    openingInventoryValue,
    closingInventoryValue,
    efficiency:
      turnoverRatio >= 12
        ? 'excellent'
        : turnoverRatio >= 6
          ? 'good'
          : turnoverRatio >= 3
            ? 'acceptable'
            : 'poor',
  };
}

// ========================================
// EXPIRY MANAGEMENT
// ========================================

/**
 * فحص الأصناف قريبة الانتهاء أو المنتهية الصلاحية
 */
function checkExpiryStatus(items, alertDays) {
  if (!items || !Array.isArray(items)) {
    return { isValid: false, error: 'قائمة الأصناف مطلوبة' };
  }

  const threshold = alertDays || INVENTORY_CONSTANTS.DEFAULTS.MAX_EXPIRY_ALERT_DAYS;
  const now = new Date();

  const results = items.map(item => {
    if (!item.expiryDate) {
      return { ...item, expiryStatus: 'no_expiry', daysUntilExpiry: null };
    }

    const expiry = new Date(item.expiryDate);
    const daysUntilExpiry = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));

    let expiryStatus;
    if (daysUntilExpiry < 0) {
      expiryStatus = INVENTORY_CONSTANTS.STOCK_STATUS.EXPIRED;
    } else if (daysUntilExpiry <= threshold) {
      expiryStatus = 'expiring_soon';
    } else {
      expiryStatus = 'valid';
    }

    return { ...item, expiryStatus, daysUntilExpiry };
  });

  const expired = results.filter(i => i.expiryStatus === INVENTORY_CONSTANTS.STOCK_STATUS.EXPIRED);
  const expiringSoon = results.filter(i => i.expiryStatus === 'expiring_soon');
  const valid = results.filter(i => i.expiryStatus === 'valid');

  return {
    isValid: true,
    total: items.length,
    expired: expired.length,
    expiringSoon: expiringSoon.length,
    valid: valid.length,
    noExpiry: results.filter(i => i.expiryStatus === 'no_expiry').length,
    alertDays: threshold,
    items: results,
    expiredItems: expired,
    expiringSoonItems: expiringSoon.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry),
    requiresAction: expired.length > 0 || expiringSoon.length > 0,
  };
}

// ========================================
// PURCHASE ORDER CALCULATIONS
// ========================================

/**
 * حساب تفاصيل أمر الشراء
 */
function calculatePurchaseOrder(items, discountRate, vatRate) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: 'لا توجد أصناف في أمر الشراء' };
  }

  const invalidItem = items.find(i => i.quantity <= 0 || i.unitPrice <= 0);
  if (invalidItem) {
    return { isValid: false, error: 'الكمية والسعر يجب أن يكونا أكبر من صفر' };
  }

  const discount = Math.max(0, Math.min(100, discountRate || 0));
  const vat = Math.max(0, vatRate !== undefined ? vatRate : 15); // VAT 15% in Saudi Arabia

  const lineItems = items.map(item => {
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = subtotal * (discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = afterDiscount * (vat / 100);
    const total = afterDiscount + vatAmount;

    return {
      ...item,
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      afterDiscount: Math.round(afterDiscount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  });

  const subtotal = lineItems.reduce((sum, i) => sum + i.subtotal, 0);
  const totalDiscount = lineItems.reduce((sum, i) => sum + i.discountAmount, 0);
  const afterDiscount = subtotal - totalDiscount;
  const totalVat = lineItems.reduce((sum, i) => sum + i.vatAmount, 0);
  const grandTotal = afterDiscount + totalVat;

  return {
    isValid: true,
    items: lineItems,
    itemCount: items.length,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: Math.round(subtotal * 100) / 100,
    discountRate: discount,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    afterDiscount: Math.round(afterDiscount * 100) / 100,
    vatRate: vat,
    totalVat: Math.round(totalVat * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

// ========================================
// ABC ANALYSIS
// ========================================

/**
 * تحليل ABC للمخزون
 * A: أعلى 80% من القيمة (عادة 20% من الأصناف)
 * B: القيمة التالية 15% (عادة 30% من الأصناف)
 * C: أدنى 5% من القيمة (عادة 50% من الأصناف)
 */
function performABCAnalysis(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: 'لا توجد أصناف لتحليل ABC' };
  }

  // حساب القيمة الإجمالية لكل صنف
  const withValue = items.map(item => ({
    ...item,
    totalValue: (item.quantity || 0) * (item.unitCost || 0),
  }));

  // ترتيب تنازلي حسب القيمة
  const sorted = [...withValue].sort((a, b) => b.totalValue - a.totalValue);
  const totalValue = sorted.reduce((sum, i) => sum + i.totalValue, 0);

  if (totalValue === 0) {
    return { isValid: false, error: 'إجمالي قيمة المخزون صفر' };
  }

  let cumulativeValue = 0;
  const categorized = sorted.map((item, index) => {
    cumulativeValue += item.totalValue;
    const cumulativePct = (cumulativeValue / totalValue) * 100;
    const category = cumulativePct <= 80 ? 'A' : cumulativePct <= 95 ? 'B' : 'C';

    return {
      ...item,
      rank: index + 1,
      valuePct: Math.round((item.totalValue / totalValue) * 100 * 100) / 100,
      cumulativePct: Math.round(cumulativePct * 100) / 100,
      abcCategory: category,
    };
  });

  const aItems = categorized.filter(i => i.abcCategory === 'A');
  const bItems = categorized.filter(i => i.abcCategory === 'B');
  const cItems = categorized.filter(i => i.abcCategory === 'C');

  return {
    isValid: true,
    totalItems: items.length,
    totalValue: Math.round(totalValue * 100) / 100,
    items: categorized,
    summary: {
      A: {
        count: aItems.length,
        value: Math.round(aItems.reduce((s, i) => s + i.totalValue, 0) * 100) / 100,
        pct: Math.round((aItems.length / items.length) * 100),
      },
      B: {
        count: bItems.length,
        value: Math.round(bItems.reduce((s, i) => s + i.totalValue, 0) * 100) / 100,
        pct: Math.round((bItems.length / items.length) * 100),
      },
      C: {
        count: cItems.length,
        value: Math.round(cItems.reduce((s, i) => s + i.totalValue, 0) * 100) / 100,
        pct: Math.round((cItems.length / items.length) * 100),
      },
    },
  };
}

// ========================================
// STOCK RECONCILIATION
// ========================================

/**
 * مطابقة الجرد الفعلي مع السجلات
 */
function reconcileStockCount(systemRecords, physicalCount) {
  if (!systemRecords || !Array.isArray(systemRecords)) {
    return { isValid: false, error: 'سجلات النظام مطلوبة' };
  }
  if (!physicalCount || !Array.isArray(physicalCount)) {
    return { isValid: false, error: 'بيانات الجرد الفعلي مطلوبة' };
  }

  const discrepancies = [];
  let totalVarianceValue = 0;

  // بناء خريطة للجرد الفعلي
  const physicalMap = {};
  physicalCount.forEach(item => {
    physicalMap[item.itemId] = item.countedQuantity;
  });

  systemRecords.forEach(record => {
    const counted = physicalMap[record.itemId];
    if (counted === undefined) {
      discrepancies.push({
        itemId: record.itemId,
        itemName: record.itemName,
        systemQty: record.quantity,
        countedQty: 0,
        variance: -record.quantity,
        varianceValue: -(record.quantity * (record.unitCost || 0)),
        status: 'missing_from_count',
      });
    } else {
      const variance = counted - record.quantity;
      const varianceValue = variance * (record.unitCost || 0);
      totalVarianceValue += varianceValue;

      if (variance !== 0) {
        discrepancies.push({
          itemId: record.itemId,
          itemName: record.itemName,
          systemQty: record.quantity,
          countedQty: counted,
          variance,
          varianceValue: Math.round(varianceValue * 100) / 100,
          status: variance > 0 ? 'surplus' : 'shortage',
        });
      }
    }
  });

  const matched =
    systemRecords.length - discrepancies.filter(d => d.status !== 'missing_from_count').length;

  return {
    isValid: true,
    totalSystemItems: systemRecords.length,
    totalCountedItems: physicalCount.length,
    matched,
    discrepancyCount: discrepancies.length,
    discrepancies,
    totalVarianceValue: Math.round(totalVarianceValue * 100) / 100,
    accuracyRate:
      systemRecords.length > 0
        ? Math.round(
            ((systemRecords.length - discrepancies.length) / systemRecords.length) * 100 * 100
          ) / 100
        : 0,
    requiresAdjustment: discrepancies.length > 0,
  };
}

// ========================================
// SUPPLIER PERFORMANCE
// ========================================

/**
 * تقييم أداء المورد
 */
function evaluateSupplierPerformance(orders) {
  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    return { isValid: false, error: 'لا توجد طلبات لتقييم المورد' };
  }

  const completedOrders = orders.filter(
    o => o.status === INVENTORY_CONSTANTS.ORDER_STATUS.RECEIVED
  );
  if (completedOrders.length === 0) {
    return { isValid: false, error: 'لا توجد طلبات مستلمة لتقييم الأداء' };
  }

  // دقة التسليم في الوقت المحدد
  const onTimeOrders = completedOrders.filter(o => {
    if (!o.expectedDelivery || !o.actualDelivery) return false;
    return new Date(o.actualDelivery) <= new Date(o.expectedDelivery);
  });
  const onTimeRate = (onTimeOrders.length / completedOrders.length) * 100;

  // دقة الكميات
  const quantityAccuracy =
    completedOrders.reduce((sum, o) => {
      if (!o.orderedQty || !o.receivedQty) return sum;
      return sum + Math.min(o.receivedQty / o.orderedQty, 1) * 100;
    }, 0) / completedOrders.length;

  // متوسط وقت التسليم
  const deliveryTimes = completedOrders
    .filter(o => o.orderDate && o.actualDelivery)
    .map(o => (new Date(o.actualDelivery) - new Date(o.orderDate)) / (1000 * 60 * 60 * 24));

  const avgDeliveryTime =
    deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : null;

  // نقاط الأداء الإجمالية
  const overallScore = onTimeRate * 0.5 + quantityAccuracy * 0.5;

  return {
    isValid: true,
    totalOrders: orders.length,
    completedOrders: completedOrders.length,
    onTimeDeliveryRate: Math.round(onTimeRate * 100) / 100,
    quantityAccuracy: Math.round(quantityAccuracy * 100) / 100,
    avgDeliveryDays: avgDeliveryTime ? Math.round(avgDeliveryTime * 10) / 10 : null,
    overallScore: Math.round(overallScore * 100) / 100,
    rating:
      overallScore >= 90
        ? 'excellent'
        : overallScore >= 75
          ? 'good'
          : overallScore >= 60
            ? 'acceptable'
            : 'poor',
  };
}

// ========================================
// SHORTAGE FORECAST
// ========================================

/**
 * توقع نقص المخزون بناءً على معدل الاستهلاك
 */
function forecastShortage(items, forecastDays) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: 'لا توجد أصناف للتنبؤ' };
  }

  const days = forecastDays || 30;
  const forecasted = items.map(item => {
    const projectedUsage = (item.avgDailyUsage || 0) * days;
    const projectedStock = (item.currentQuantity || 0) - projectedUsage;
    const willRunOut = projectedStock < (item.minQuantity || 0);
    const daysUntilStockout =
      item.avgDailyUsage > 0 ? Math.floor(item.currentQuantity / item.avgDailyUsage) : null;

    return {
      itemId: item.itemId,
      itemName: item.itemName,
      currentQuantity: item.currentQuantity || 0,
      avgDailyUsage: item.avgDailyUsage || 0,
      projectedUsage: Math.round(projectedUsage * 100) / 100,
      projectedStock: Math.round(projectedStock * 100) / 100,
      willRunOut,
      daysUntilStockout,
      suggestedOrderQty: willRunOut
        ? Math.ceil(projectedUsage - (item.currentQuantity || 0) + (item.minQuantity || 0))
        : 0,
    };
  });

  const criticalItems = forecasted.filter(i => i.willRunOut);
  const outOfStockItems = forecasted.filter(i => i.currentQuantity === 0);

  return {
    isValid: true,
    forecastDays: days,
    totalItems: items.length,
    criticalCount: criticalItems.length,
    outOfStockCount: outOfStockItems.length,
    items: forecasted,
    criticalItems,
    requiresUrgentAction: outOfStockItems.length > 0,
    requiresPlanning: criticalItems.length > 0,
  };
}

// ========================================
// EXPORT
// ========================================
module.exports = {
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
};
