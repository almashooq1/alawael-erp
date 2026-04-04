'use strict';

/**
 * اختبارات وحدة تسعير الخدمات - Service Pricing Unit Tests
 * Pure business logic - no DB connection required
 */

const {
  VAT_RATE,
  MAX_DISCOUNT_PERCENTAGE,
  TARGET_PROFIT_MARGIN,
  MIN_DAILY_REVENUE_PER_THERAPIST,
  SESSION_TYPES,
  SPECIALIZATIONS,
  SESSION_TYPE_MULTIPLIERS,
  calculateBaseSessionPrice,
  applySessionTypeMultiplier,
  calculateSessionPrice,
  calculateTherapistMonthlyRevenue,
  calculateAnnualRevenueProjection,
  calculateBreakevenPoint,
  calculateProfitMargin,
  calculatePackagePrice,
  calculateInsurancePrice,
  calculateRevenuePerTherapist,
  calculateRevenuePerBeneficiary,
  calculateCapacityUtilization,
  rankBranchesByFinancialPerformance,
} = require('../services/finance/servicePricing.service');

// ─────────────────────────────────────────────────────────────────────────────
// 1. الثوابت
// ─────────────────────────────────────────────────────────────────────────────
describe('Constants', () => {
  test('VAT_RATE = 0.15', () => {
    expect(VAT_RATE).toBe(0.15);
  });

  test('MAX_DISCOUNT_PERCENTAGE = 50', () => {
    expect(MAX_DISCOUNT_PERCENTAGE).toBe(50);
  });

  test('TARGET_PROFIT_MARGIN = 0.3', () => {
    expect(TARGET_PROFIT_MARGIN).toBe(0.3);
  });

  test('MIN_DAILY_REVENUE_PER_THERAPIST = 800', () => {
    expect(MIN_DAILY_REVENUE_PER_THERAPIST).toBe(800);
  });

  test('SESSION_TYPES يحتوي القيم الصحيحة', () => {
    expect(SESSION_TYPES).toHaveProperty('INDIVIDUAL');
    expect(SESSION_TYPES).toHaveProperty('GROUP');
    expect(SESSION_TYPES).toHaveProperty('ASSESSMENT');
    expect(SESSION_TYPES).toHaveProperty('HOME_VISIT');
    expect(SESSION_TYPES).toHaveProperty('CONSULTATION');
    expect(SESSION_TYPES).toHaveProperty('TELEHEALTH');
  });

  test('SPECIALIZATIONS يحتوي التخصصات الصحيحة', () => {
    expect(SPECIALIZATIONS).toHaveProperty('PT');
    expect(SPECIALIZATIONS).toHaveProperty('OT');
    expect(SPECIALIZATIONS).toHaveProperty('SPEECH');
    expect(SPECIALIZATIONS).toHaveProperty('ABA');
    expect(SPECIALIZATIONS).toHaveProperty('PSYCHOLOGY');
    expect(SPECIALIZATIONS).toHaveProperty('SPECIAL_ED');
    expect(SPECIALIZATIONS).toHaveProperty('VOCATIONAL');
    expect(SPECIALIZATIONS).toHaveProperty('NURSING');
  });

  test('SESSION_TYPE_MULTIPLIERS: individual=1.0', () => {
    expect(SESSION_TYPE_MULTIPLIERS.individual).toBe(1.0);
  });

  test('SESSION_TYPE_MULTIPLIERS: group=0.6', () => {
    expect(SESSION_TYPE_MULTIPLIERS.group).toBe(0.6);
  });

  test('SESSION_TYPE_MULTIPLIERS: assessment=1.5', () => {
    expect(SESSION_TYPE_MULTIPLIERS.assessment).toBe(1.5);
  });

  test('SESSION_TYPE_MULTIPLIERS: home_visit=1.75', () => {
    expect(SESSION_TYPE_MULTIPLIERS.home_visit).toBe(1.75);
  });

  test('SESSION_TYPE_MULTIPLIERS: telehealth=0.85', () => {
    expect(SESSION_TYPE_MULTIPLIERS.telehealth).toBe(0.85);
  });

  test("SPECIALIZATIONS.PT = 'pt'", () => {
    expect(SPECIALIZATIONS.PT).toBe('pt');
  });

  test("SPECIALIZATIONS.ABA = 'aba'", () => {
    expect(SPECIALIZATIONS.ABA).toBe('aba');
  });

  test("SPECIALIZATIONS.SPEECH = 'speech'", () => {
    expect(SPECIALIZATIONS.SPEECH).toBe('speech');
  });

  test("SPECIALIZATIONS.PSYCHOLOGY = 'psychology'", () => {
    expect(SPECIALIZATIONS.PSYCHOLOGY).toBe('psychology');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. calculateBaseSessionPrice
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateBaseSessionPrice', () => {
  test('PT 45 دقيقة = 250', () => {
    expect(calculateBaseSessionPrice('pt', 45)).toBe(250);
  });

  test('PT 60 دقيقة > PT 45 دقيقة', () => {
    const base45 = calculateBaseSessionPrice('pt', 45);
    const base60 = calculateBaseSessionPrice('pt', 60);
    expect(base60).toBeGreaterThan(base45);
  });

  test('PT 60 دقيقة = 250 + 15×5 = 325', () => {
    // ratePerMin=5.0, timeDiff=15, adjustment=75, total=325
    expect(calculateBaseSessionPrice('pt', 60)).toBe(325);
  });

  test('SPEECH 45 دقيقة = 280', () => {
    expect(calculateBaseSessionPrice('speech', 45)).toBe(280);
  });

  test('SPEECH 60 دقيقة = 280 + 15×5.5 = 363', () => {
    // ratePerMin=5.5, timeDiff=15, adjustment=82.5 → round=83 → 363? Actually Math.round(280+82.5)=363
    expect(calculateBaseSessionPrice('speech', 60)).toBe(363);
  });

  test('ABA 45 دقيقة = 320', () => {
    expect(calculateBaseSessionPrice('aba', 45)).toBe(320);
  });

  test('ABA 30 دقيقة < 320 (أقل من 45 دقيقة)', () => {
    // timeDiff = -15, adjustment = -15*6.5 = -97.5 → round(320-97.5)=223
    const result = calculateBaseSessionPrice('aba', 30);
    expect(result).toBeLessThan(320);
    expect(result).toBeGreaterThan(0);
  });

  test('PSYCHOLOGY 45 دقيقة = 400', () => {
    expect(calculateBaseSessionPrice('psychology', 45)).toBe(400);
  });

  test('يستخدم جدول تسعير مخصص إذا مُرِّر', () => {
    // الجدول المخصص يجب أن يكون بصيغة {spec: {base45, ratePerMin}}
    const customTable = { pt: { base45: 500, ratePerMin: 10 } };
    const result = calculateBaseSessionPrice('pt', 45, customTable);
    expect(result).toBe(500);
  });

  test('جدول مخصص 60 دقيقة يعطي base45 + ratePerMin×15', () => {
    const customTable = { pt: { base45: 500, ratePerMin: 10 } };
    const result = calculateBaseSessionPrice('pt', 60, customTable);
    expect(result).toBe(650); // 500 + 10*15
  });

  test('مدة 0 دقيقة تُطلق خطأ', () => {
    expect(() => calculateBaseSessionPrice('pt', 0)).toThrow('مدة الجلسة يجب أن تكون رقماً موجباً');
  });

  test('مدة سالبة تُطلق خطأ', () => {
    expect(() => calculateBaseSessionPrice('pt', -10)).toThrow();
  });

  test('تخصص مجهول يُطلق خطأ', () => {
    expect(() => calculateBaseSessionPrice('unknown_spec', 45)).toThrow();
  });

  test('السعر أكبر من 0 لجميع التخصصات', () => {
    const specs = Object.values(SPECIALIZATIONS);
    specs.forEach(spec => {
      const price = calculateBaseSessionPrice(spec, 45);
      expect(price).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. applySessionTypeMultiplier
// ─────────────────────────────────────────────────────────────────────────────
describe('applySessionTypeMultiplier', () => {
  test('individual لا يغير السعر (×1.0)', () => {
    const result = applySessionTypeMultiplier(250, 'individual');
    expect(result).toBe(250);
  });

  test('group يخفض السعر إلى 60%', () => {
    const result = applySessionTypeMultiplier(250, 'group');
    expect(result).toBe(Math.round(250 * 0.6)); // 150
  });

  test('assessment يرفع السعر إلى 150%', () => {
    const result = applySessionTypeMultiplier(250, 'assessment');
    expect(result).toBe(Math.round(250 * 1.5)); // 375
  });

  test('home_visit يرفع السعر إلى 175%', () => {
    const result = applySessionTypeMultiplier(250, 'home_visit');
    expect(result).toBe(Math.round(250 * 1.75)); // 438
  });

  test('telehealth يخفض السعر إلى 85%', () => {
    const result = applySessionTypeMultiplier(250, 'telehealth');
    expect(result).toBe(Math.round(250 * 0.85)); // 213
  });

  test('consultation يرفع السعر إلى 120%', () => {
    const result = applySessionTypeMultiplier(250, 'consultation');
    expect(result).toBe(Math.round(250 * 1.2)); // 300
  });

  test('نوع غير معروف يُطلق خطأ', () => {
    expect(() => applySessionTypeMultiplier(250, 'unknown_type')).toThrow(
      'نوع جلسة غير معروف: unknown_type'
    );
  });

  test('سعر أساسي 0 → النتيجة 0', () => {
    const result = applySessionTypeMultiplier(0, 'assessment');
    expect(result).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. calculateSessionPrice
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateSessionPrice', () => {
  test('حساب سعر جلسة PT فردية 45 دقيقة بدون خصم مع ضريبة', () => {
    const result = calculateSessionPrice({
      specialization: 'pt',
      durationMinutes: 45,
      sessionType: 'individual',
      discountPercent: 0,
      includeVat: true,
    });

    expect(result).toHaveProperty('basePrice');
    expect(result).toHaveProperty('adjustedPrice');
    expect(result).toHaveProperty('discountAmount');
    expect(result).toHaveProperty('priceBeforeVat');
    expect(result).toHaveProperty('vatAmount');
    expect(result).toHaveProperty('totalPrice');

    expect(result.basePrice).toBe(250);
    expect(result.adjustedPrice).toBe(250);
    expect(result.discountAmount).toBe(0);
    expect(result.priceBeforeVat).toBe(250);
    // vatAmount = Math.round(250 * 0.15) = Math.round(37.5) = 38
    expect(result.vatAmount).toBe(38);
    expect(result.totalPrice).toBe(288); // 250 + 38
  });

  test('مع خصم 20%', () => {
    const result = calculateSessionPrice({
      specialization: 'pt',
      durationMinutes: 45,
      sessionType: 'individual',
      discountPercent: 20,
      includeVat: true,
    });

    // adjustedPrice=250, discountAmount=Math.round(250*0.2)=50, priceBeforeVat=200
    expect(result.discountAmount).toBe(50);
    expect(result.priceBeforeVat).toBe(200);
    // vatAmount = Math.round(200*0.15) = 30
    expect(result.vatAmount).toBe(30);
    expect(result.totalPrice).toBe(230);
  });

  test('بدون ضريبة (includeVat=false)', () => {
    const result = calculateSessionPrice({
      specialization: 'pt',
      durationMinutes: 45,
      sessionType: 'individual',
      discountPercent: 0,
      includeVat: false,
    });

    expect(result.vatAmount).toBe(0);
    expect(result.totalPrice).toBe(result.priceBeforeVat);
  });

  test('نوع جلسة group يخفض السعر', () => {
    const individual = calculateSessionPrice({
      specialization: 'pt',
      durationMinutes: 45,
      sessionType: 'individual',
      includeVat: false,
    });
    const group = calculateSessionPrice({
      specialization: 'pt',
      durationMinutes: 45,
      sessionType: 'group',
      includeVat: false,
    });
    expect(group.totalPrice).toBeLessThan(individual.totalPrice);
  });

  test('نوع جلسة assessment يرفع السعر', () => {
    const individual = calculateSessionPrice({
      specialization: 'pt',
      durationMinutes: 45,
      sessionType: 'individual',
      includeVat: false,
    });
    const assessment = calculateSessionPrice({
      specialization: 'pt',
      durationMinutes: 45,
      sessionType: 'assessment',
      includeVat: false,
    });
    expect(assessment.totalPrice).toBeGreaterThan(individual.totalPrice);
  });

  test('خصم يتجاوز MAX_DISCOUNT_PERCENTAGE (50%) يُطلق خطأ', () => {
    expect(() =>
      calculateSessionPrice({
        specialization: 'pt',
        durationMinutes: 45,
        sessionType: 'individual',
        discountPercent: 60,
        includeVat: true,
      })
    ).toThrow('نسبة الخصم يجب أن تكون بين 0 و 50%');
  });

  test('خصم سالب يُطلق خطأ', () => {
    expect(() =>
      calculateSessionPrice({
        specialization: 'pt',
        durationMinutes: 45,
        sessionType: 'individual',
        discountPercent: -5,
        includeVat: true,
      })
    ).toThrow();
  });

  test('يُرجع sessionTypeMultiplier الصحيح', () => {
    const result = calculateSessionPrice({
      specialization: 'pt',
      durationMinutes: 45,
      sessionType: 'group',
      includeVat: false,
    });
    expect(result.sessionTypeMultiplier).toBe(0.6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. calculateTherapistMonthlyRevenue
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateTherapistMonthlyRevenue', () => {
  test('يحتوي على الحقول الصحيحة', () => {
    const result = calculateTherapistMonthlyRevenue({
      workingDaysPerMonth: 22,
      sessionsPerDay: 6,
      averageSessionPrice: 287.5,
      attendanceRate: 80,
      cancellationRate: 10,
    });

    expect(result).toHaveProperty('totalScheduledSessions');
    expect(result).toHaveProperty('attendedSessions');
    expect(result).toHaveProperty('grossRevenue');
    expect(result).toHaveProperty('dailyRevenue');
    expect(result).toHaveProperty('isAboveMinimum');
  });

  test('totalScheduledSessions = workingDays × sessionsPerDay', () => {
    const result = calculateTherapistMonthlyRevenue({
      workingDaysPerMonth: 22,
      sessionsPerDay: 6,
      averageSessionPrice: 300,
      attendanceRate: 100,
      cancellationRate: 0,
    });
    expect(result.totalScheduledSessions).toBe(132);
  });

  test('معدل حضور 100% بدون إلغاء → attendedSessions = totalScheduled', () => {
    const result = calculateTherapistMonthlyRevenue({
      workingDaysPerMonth: 22,
      sessionsPerDay: 6,
      averageSessionPrice: 300,
      attendanceRate: 100,
      cancellationRate: 0,
    });
    expect(result.attendedSessions).toBe(22 * 6);
    expect(result.grossRevenue).toBe(22 * 6 * 300);
  });

  test('isAboveMinimum صحيح عند إيراد يومي > 800', () => {
    const result = calculateTherapistMonthlyRevenue({
      workingDaysPerMonth: 22,
      sessionsPerDay: 5,
      averageSessionPrice: 300,
      attendanceRate: 90,
      cancellationRate: 5,
    });
    expect(result.isAboveMinimum).toBe(true);
  });

  test('isAboveMinimum خطأ عند إيراد يومي < 800', () => {
    const result = calculateTherapistMonthlyRevenue({
      workingDaysPerMonth: 22,
      sessionsPerDay: 2,
      averageSessionPrice: 150,
      attendanceRate: 60,
      cancellationRate: 30,
    });
    // dailyRevenue ≈ 2*150*0.6*0.7/22*22 = 126 < 800
    expect(result.isAboveMinimum).toBe(false);
  });

  test('معدل إلغاء 100% → grossRevenue = 0', () => {
    const result = calculateTherapistMonthlyRevenue({
      workingDaysPerMonth: 22,
      sessionsPerDay: 6,
      averageSessionPrice: 300,
      attendanceRate: 100,
      cancellationRate: 100,
    });
    expect(result.grossRevenue).toBe(0);
  });

  test('grossRevenue = attendedSessions × averageSessionPrice', () => {
    const result = calculateTherapistMonthlyRevenue({
      workingDaysPerMonth: 20,
      sessionsPerDay: 4,
      averageSessionPrice: 250,
      attendanceRate: 100,
      cancellationRate: 0,
    });
    expect(result.grossRevenue).toBe(result.attendedSessions * 250);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. calculateAnnualRevenueProjection
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateAnnualRevenueProjection', () => {
  test('يحسب الإيراد السنوي بشكل صحيح', () => {
    const result = calculateAnnualRevenueProjection(10, 50000, 75);

    expect(result).toHaveProperty('monthlyRevenue');
    expect(result).toHaveProperty('annualRevenue');
    expect(result).toHaveProperty('quarterlyRevenue');

    expect(result.annualRevenue).toBe(result.monthlyRevenue * 12);
  });

  test('إشغال 100% → إيراد كامل', () => {
    const result = calculateAnnualRevenueProjection(5, 60000, 100);
    expect(result.monthlyRevenue).toBe(5 * 60000);
  });

  test('إشغال 0% → إيراد 0', () => {
    const result = calculateAnnualRevenueProjection(5, 60000, 0);
    expect(result.monthlyRevenue).toBe(0);
    expect(result.annualRevenue).toBe(0);
  });

  test('therapistCount=0 يُطلق خطأ', () => {
    expect(() => calculateAnnualRevenueProjection(0, 60000, 75)).toThrow(
      'عدد المعالجين يجب أن يكون رقماً موجباً'
    );
  });

  test('averageMonthlyRevenue=0 يُطلق خطأ', () => {
    expect(() => calculateAnnualRevenueProjection(5, 0, 75)).toThrow();
  });

  test('quarterlyRevenue = annualRevenue / 4', () => {
    const result = calculateAnnualRevenueProjection(4, 100000, 100);
    // monthlyRevenue = 400000, annualRevenue = 4800000, quarterly = 1200000
    expect(result.quarterlyRevenue).toBe(result.annualRevenue / 4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. calculateBreakevenPoint
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateBreakevenPoint', () => {
  // الاسم الصحيح للحقل هو fixedCostsMonthly (وليس fixedCosts)
  const sampleCosts = {
    fixedCostsMonthly: 100000,
    variableCostPerSession: 50,
  };
  const averageSessionRevenue = 250;

  test('يحتوي على الحقول الصحيحة', () => {
    const result = calculateBreakevenPoint(sampleCosts, averageSessionRevenue);

    expect(result).toHaveProperty('contributionMargin');
    expect(result).toHaveProperty('breakevenSessions');
    expect(result).toHaveProperty('breakevenRevenue');
    expect(result).toHaveProperty('targetProfitSessions');
    expect(result).toHaveProperty('targetProfitRevenue');
  });

  test('contributionMargin = avgRevenue - variableCost', () => {
    const result = calculateBreakevenPoint(sampleCosts, averageSessionRevenue);
    expect(result.contributionMargin).toBe(250 - 50); // 200
  });

  test('breakevenSessions = ceil(fixedCostsMonthly / contributionMargin)', () => {
    const result = calculateBreakevenPoint(sampleCosts, averageSessionRevenue);
    expect(result.breakevenSessions).toBe(Math.ceil(100000 / 200)); // 500
  });

  test('breakevenRevenue = breakevenSessions × averageSessionRevenue', () => {
    const result = calculateBreakevenPoint(sampleCosts, averageSessionRevenue);
    expect(result.breakevenRevenue).toBe(result.breakevenSessions * averageSessionRevenue);
  });

  test('targetProfitSessions > breakevenSessions', () => {
    const result = calculateBreakevenPoint(sampleCosts, averageSessionRevenue);
    expect(result.targetProfitSessions).toBeGreaterThan(result.breakevenSessions);
  });

  test('مدة التعادل صفر عند fixedCostsMonthly = 0', () => {
    const result = calculateBreakevenPoint(
      { fixedCostsMonthly: 0, variableCostPerSession: 50 },
      250
    );
    expect(result.breakevenSessions).toBe(0);
  });

  test('variableCost >= avgRevenue يُطلق خطأ (هامش مساهمة سالب)', () => {
    expect(() =>
      calculateBreakevenPoint({ fixedCostsMonthly: 100000, variableCostPerSession: 300 }, 250)
    ).toThrow('هامش المساهمة يجب أن يكون موجباً');
  });

  test('fixedCostsMonthly غير موجود يُطلق خطأ', () => {
    expect(() => calculateBreakevenPoint({ variableCostPerSession: 50 }, 250)).toThrow(
      'التكاليف الثابتة يجب أن تكون رقماً موجباً'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. calculateProfitMargin
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateProfitMargin', () => {
  test('يحتوي على الحقول الصحيحة', () => {
    const result = calculateProfitMargin(1000000, 700000);
    expect(result).toHaveProperty('grossProfit');
    expect(result).toHaveProperty('profitMargin');
    expect(result).toHaveProperty('isProfit');
    expect(result).toHaveProperty('meetsTarget');
  });

  test('grossProfit = totalRevenue - totalCosts', () => {
    const result = calculateProfitMargin(1000000, 700000);
    expect(result.grossProfit).toBe(300000);
  });

  test('profitMargin هو نسبة مئوية (30 لا 0.3)', () => {
    const result = calculateProfitMargin(1000000, 700000);
    // profitMargin = (300000/1000000)*100 = 30 (%)
    expect(result.profitMargin).toBeCloseTo(30, 1);
  });

  test('isProfit صحيح عند ربح موجب', () => {
    const result = calculateProfitMargin(1000000, 700000);
    expect(result.isProfit).toBe(true);
  });

  test('meetsTarget صحيح عند هامش ≥ 30%', () => {
    const result = calculateProfitMargin(1000000, 700000);
    expect(result.meetsTarget).toBe(true);
  });

  test('meetsTarget خطأ عند هامش < 30%', () => {
    const result = calculateProfitMargin(1000000, 800000); // هامش 20%
    expect(result.meetsTarget).toBe(false);
  });

  test('isProfit خطأ عند خسارة', () => {
    const result = calculateProfitMargin(500000, 700000);
    expect(result.isProfit).toBe(false);
    expect(result.grossProfit).toBe(-200000);
  });

  test('هامش ربح 0% عند تساوي الإيراد والتكلفة → isProfit صحيح (grossProfit >= 0)', () => {
    // grossProfit = 0 >= 0 → isProfit = true
    const result = calculateProfitMargin(500000, 500000);
    expect(result.profitMargin).toBe(0);
    expect(result.isProfit).toBe(true); // 0 >= 0
  });

  test('إيراد 0 لا يُطلق خطأ', () => {
    expect(() => calculateProfitMargin(0, 0)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. calculatePackagePrice
// ─────────────────────────────────────────────────────────────────────────────
describe('calculatePackagePrice', () => {
  test('حساب سعر الباقة مع خصم 10%', () => {
    const result = calculatePackagePrice(250, 10, 10);

    expect(result).toHaveProperty('fullPrice');
    expect(result).toHaveProperty('discountAmount');
    expect(result).toHaveProperty('packagePrice');
    expect(result).toHaveProperty('pricePerSession');
    expect(result).toHaveProperty('vatAmount');
    expect(result).toHaveProperty('totalWithVat');

    expect(result.fullPrice).toBe(2500);
    // discountAmount = Math.round(2500 * 0.10) = 250
    expect(result.discountAmount).toBe(250);
    // packagePrice = 2500 - 250 = 2250
    expect(result.packagePrice).toBe(2250);
    // pricePerSession = Math.round(2250 / 10) = 225
    expect(result.pricePerSession).toBe(225);
    // vatAmount = Math.round(2250 * 0.15) = 338
    expect(result.vatAmount).toBe(338);
    expect(result.totalWithVat).toBe(2588); // 2250 + 338
  });

  test('بدون خصم → fullPrice = packagePrice', () => {
    const result = calculatePackagePrice(300, 5, 0);
    expect(result.fullPrice).toBe(1500);
    expect(result.packagePrice).toBe(1500);
    expect(result.discountAmount).toBe(0);
  });

  test('خصم 100% يُطلق خطأ (يتجاوز MAX_DISCOUNT_PERCENTAGE=50)', () => {
    expect(() => calculatePackagePrice(300, 5, 100)).toThrow('نسبة الخصم يجب أن تكون بين 0 و 50%');
  });

  test('pricePerSession = Math.round(packagePrice / sessionCount)', () => {
    const result = calculatePackagePrice(250, 12, 15);
    expect(result.pricePerSession).toBe(Math.round(result.packagePrice / 12));
  });

  test('sessionCount < 2 يُطلق خطأ', () => {
    expect(() => calculatePackagePrice(250, 1, 10)).toThrow('عدد الجلسات يجب أن يكون 2 أو أكثر');
  });

  test('totalWithVat = packagePrice + vatAmount', () => {
    const result = calculatePackagePrice(200, 8, 5);
    expect(result.totalWithVat).toBe(result.packagePrice + result.vatAmount);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. calculateInsurancePrice
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateInsurancePrice', () => {
  test('يحتوي على الحقول الصحيحة', () => {
    const result = calculateInsurancePrice(250, 80, 0);
    expect(result).toHaveProperty('insuranceCoverage');
    expect(result).toHaveProperty('patientShare');
    expect(result).toHaveProperty('coverageRatio');
  });

  test('تغطية 80% بدون تحمل → insuranceCoverage=200, patientShare=50', () => {
    const result = calculateInsurancePrice(250, 80, 0);
    expect(result.insuranceCoverage).toBe(200);
    expect(result.patientShare).toBe(50);
  });

  test('coverageRatio يُعاد كنسبة مئوية (80 لا 0.8)', () => {
    const result = calculateInsurancePrice(250, 80, 0);
    // Math.round((200/250)*100) = 80
    expect(result.coverageRatio).toBe(80);
  });

  test('coverageRatio للتغطية 75%', () => {
    const result = calculateInsurancePrice(400, 75, 0);
    expect(result.coverageRatio).toBe(75);
  });

  test('مع مبلغ تحمل → patientShare يزيد', () => {
    const withoutDeductible = calculateInsurancePrice(250, 80, 0);
    const withDeductible = calculateInsurancePrice(250, 80, 100);
    expect(withDeductible.patientShare).toBeGreaterThan(withoutDeductible.patientShare);
  });

  test('تغطية 100% بدون تحمل → patientShare = 0', () => {
    const result = calculateInsurancePrice(250, 100, 0);
    expect(result.patientShare).toBe(0);
    expect(result.insuranceCoverage).toBe(250);
  });

  test('تغطية 0% → التزام كامل على المريض', () => {
    const result = calculateInsurancePrice(250, 0, 0);
    expect(result.patientShare).toBe(250);
    expect(result.insuranceCoverage).toBe(0);
  });

  test('insuranceCoverage + patientShare = sessionPrice', () => {
    const result = calculateInsurancePrice(300, 70, 0);
    expect(result.insuranceCoverage + result.patientShare).toBe(300);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. calculateRevenuePerTherapist & calculateRevenuePerBeneficiary
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateRevenuePerTherapist', () => {
  test('حساب الإيراد لكل معالج', () => {
    const result = calculateRevenuePerTherapist(1000000, 10);
    expect(result).toBe(100000);
  });

  test('يُطلق خطأ عند therapistCount=0', () => {
    expect(() => calculateRevenuePerTherapist(1000000, 0)).toThrow(
      'عدد المعالجين يجب أن يكون رقماً موجباً'
    );
  });

  test('يُطلق خطأ عند therapistCount سالب', () => {
    expect(() => calculateRevenuePerTherapist(1000000, -5)).toThrow();
  });

  test('النتيجة مقربة بـ Math.round', () => {
    // 100000 / 3 = 33333.33 → round = 33333
    const result = calculateRevenuePerTherapist(100000, 3);
    expect(result).toBe(Math.round(100000 / 3));
  });
});

describe('calculateRevenuePerBeneficiary', () => {
  test('حساب الإيراد لكل مستفيد', () => {
    const result = calculateRevenuePerBeneficiary(500000, 100);
    expect(result).toBe(5000);
  });

  test('يُطلق خطأ عند beneficiaryCount=0', () => {
    expect(() => calculateRevenuePerBeneficiary(500000, 0)).toThrow(
      'عدد المستفيدين يجب أن يكون رقماً موجباً'
    );
  });

  test('النتيجة مقربة', () => {
    const result = calculateRevenuePerBeneficiary(100000, 3);
    expect(result).toBe(Math.round(100000 / 3));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. calculateCapacityUtilization
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateCapacityUtilization', () => {
  test('إشغال 75%', () => {
    const result = calculateCapacityUtilization(750, 1000);
    expect(result).toBe(75);
  });

  test('إشغال 100%', () => {
    const result = calculateCapacityUtilization(1000, 1000);
    expect(result).toBe(100);
  });

  test('إشغال 0%', () => {
    const result = calculateCapacityUtilization(0, 1000);
    expect(result).toBe(0);
  });

  test('maxCapacitySessions=0 يُطلق خطأ', () => {
    expect(() => calculateCapacityUtilization(500, 0)).toThrow(
      'الطاقة القصوى يجب أن تكون رقماً موجباً'
    );
  });

  test('actualSessions > maxCapacity يُطلق خطأ', () => {
    expect(() => calculateCapacityUtilization(1100, 1000)).toThrow(
      'الجلسات الفعلية لا يمكن أن تتجاوز الطاقة القصوى'
    );
  });

  test('النتيجة عدد صحيح (Math.round)', () => {
    const result = calculateCapacityUtilization(333, 1000);
    expect(Number.isInteger(result)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. rankBranchesByFinancialPerformance
// ─────────────────────────────────────────────────────────────────────────────
describe('rankBranchesByFinancialPerformance', () => {
  // الحقول الصحيحة: revenue و costs (وليس totalRevenue و totalCosts)
  const branches = [
    {
      branchId: 'B1',
      name: 'الفرع الرئيسي',
      revenue: 1200000,
      costs: 800000,
      sessionCount: 4000,
      therapistCount: 8,
    },
    {
      branchId: 'B2',
      name: 'فرع الشمال',
      revenue: 600000,
      costs: 500000,
      sessionCount: 2000,
      therapistCount: 5,
    },
    {
      branchId: 'B3',
      name: 'فرع الجنوب',
      revenue: 900000,
      costs: 700000,
      sessionCount: 3000,
      therapistCount: 6,
    },
  ];

  test('يُرجع قائمة مرتبة', () => {
    const result = rankBranchesByFinancialPerformance(branches);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
  });

  test('كل عنصر يحتوي rank', () => {
    const result = rankBranchesByFinancialPerformance(branches);
    result.forEach(b => {
      expect(b).toHaveProperty('rank');
    });
  });

  test('الترتيب: الأعلى هامشاً أولاً', () => {
    const result = rankBranchesByFinancialPerformance(branches);
    // B1: هامش = 400000/1200000 ≈ 33.3%
    // B3: هامش = 200000/900000 ≈ 22.2%
    // B2: هامش = 100000/600000 ≈ 16.7%
    expect(result[0].branchId).toBe('B1');
  });

  test('الترتيب التنازلي: B1 > B3 > B2', () => {
    const result = rankBranchesByFinancialPerformance(branches);
    expect(result[0].branchId).toBe('B1');
    expect(result[1].branchId).toBe('B3');
    expect(result[2].branchId).toBe('B2');
  });

  test('قائمة فارغة لا تُسبب خطأ', () => {
    expect(() => rankBranchesByFinancialPerformance([])).not.toThrow();
    expect(rankBranchesByFinancialPerformance([])).toHaveLength(0);
  });

  test('فرع واحد → ترتيب 1', () => {
    const result = rankBranchesByFinancialPerformance([branches[0]]);
    expect(result[0].rank).toBe(1);
  });

  test('يحتوي profitMargin و grossProfit', () => {
    const result = rankBranchesByFinancialPerformance(branches);
    result.forEach(b => {
      expect(b).toHaveProperty('profitMargin');
      expect(b).toHaveProperty('grossProfit');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. سيناريوهات متكاملة - End-to-End
// ─────────────────────────────────────────────────────────────────────────────
describe('سيناريوهات متكاملة', () => {
  test('حساب تكلفة جلسة ABA جماعية مع تأمين', () => {
    // 1. السعر الأساسي
    const basePrice = calculateBaseSessionPrice('aba', 45);
    expect(basePrice).toBe(320);

    // 2. تطبيق نوع الجلسة (جماعية)
    const groupPrice = applySessionTypeMultiplier(basePrice, 'group');
    expect(groupPrice).toBe(192); // Math.round(320 * 0.6)

    // 3. حساب تغطية التأمين 70%
    const insurance = calculateInsurancePrice(groupPrice, 70, 0);
    expect(insurance.insuranceCoverage).toBe(Math.round(192 * 0.7)); // 134
    expect(insurance.patientShare).toBe(192 - Math.round(192 * 0.7)); // 58
  });

  test('تحليل ربحية مركز تأهيل متكامل', () => {
    const monthlyRevPerTherapist = calculateTherapistMonthlyRevenue({
      workingDaysPerMonth: 22,
      sessionsPerDay: 6,
      averageSessionPrice: 280,
      attendanceRate: 85,
      cancellationRate: 8,
    });

    const projection = calculateAnnualRevenueProjection(
      10,
      monthlyRevPerTherapist.grossRevenue,
      80
    );

    const profitability = calculateProfitMargin(
      projection.annualRevenue,
      Math.round(projection.annualRevenue * 0.68)
    );

    expect(profitability.isProfit).toBe(true);
    expect(profitability.profitMargin).toBeGreaterThan(0);
  });

  test('تحليل نقطة التعادل لمركز جديد', () => {
    const costs = {
      fixedCostsMonthly: 250000, // التكاليف الثابتة الشهرية (الاسم الصحيح)
      variableCostPerSession: 60,
    };
    const avgRevenue = 270;

    const breakeven = calculateBreakevenPoint(costs, avgRevenue);

    // contributionMargin = 270 - 60 = 210
    expect(breakeven.contributionMargin).toBe(210);
    // breakevenSessions = ceil(250000/210) = 1191
    expect(breakeven.breakevenSessions).toBeGreaterThan(1000);
    expect(breakeven.targetProfitSessions).toBeGreaterThan(breakeven.breakevenSessions);
  });

  test('مقارنة أسعار الباقات: شهرية مقابل ربعية', () => {
    const monthly = calculatePackagePrice(250, 16, 5); // 16 جلسة خصم 5%
    const quarterly = calculatePackagePrice(250, 48, 15); // 48 جلسة خصم 15%

    // سعر الجلسة في الباقة الربعية أقل
    expect(quarterly.pricePerSession).toBeLessThan(monthly.pricePerSession);
  });

  test('مقارنة إيراد 3 فروع وترتيبها', () => {
    const branchesData = [
      {
        branchId: 'A',
        name: 'فرع A',
        revenue: 2000000,
        costs: 1400000,
        sessionCount: 7000,
        therapistCount: 12,
      },
      {
        branchId: 'B',
        name: 'فرع B',
        revenue: 1500000,
        costs: 900000,
        sessionCount: 5000,
        therapistCount: 8,
      },
      {
        branchId: 'C',
        name: 'فرع C',
        revenue: 800000,
        costs: 700000,
        sessionCount: 2500,
        therapistCount: 5,
      },
    ];

    const ranked = rankBranchesByFinancialPerformance(branchesData);

    // B: هامش = 600000/1500000 = 40%, A: 600000/2000000 = 30%, C: 100000/800000 = 12.5%
    expect(ranked[0].branchId).toBe('B');
    expect(ranked[ranked.length - 1].branchId).toBe('C');
  });

  test('حساب إيراد معالج بخصومات تأمين وباقات مجتمعة', () => {
    // سعر جلسة speech 45 دقيقة
    const sessionPrice = calculateBaseSessionPrice('speech', 45);
    expect(sessionPrice).toBe(280);

    // باقة 20 جلسة بخصم 10%
    const pkg = calculatePackagePrice(sessionPrice, 20, 10);
    expect(pkg.fullPrice).toBe(5600);
    expect(pkg.packagePrice).toBe(5040); // 5600 - 560

    // تغطية تأمينية 80%
    const insurance = calculateInsurancePrice(pkg.pricePerSession, 80, 0);
    expect(insurance.patientShare).toBeGreaterThan(0);
    expect(insurance.insuranceCoverage).toBeGreaterThan(0);
  });
});
