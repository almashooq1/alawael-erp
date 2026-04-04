'use strict';

/**
 * اختبارات وحدة قائمة الانتظار الذكية بالأولوية
 * Smart Waitlist Priority Tests
 */

const {
  calculatePriorityScore,
  calculateAgeScore,
  calculateSeverityScore,
  calculateWaitTimeBonus,
  getPriorityLevel,
  getAgeCategory,
  sortWaitlistByPriority,
  recalculatePriorities,
  filterWaitlist,
  getNextInLine,
  createOffer,
  isOfferExpired,
  getRemainingOfferMinutes,
  calculateWaitlistStats,
  estimateWaitDays,
  MAX_PRIORITY_SCORE,
  MIN_PRIORITY_SCORE,
  MAX_WAIT_BONUS,
  WAIT_BONUS_PER_WEEK,
  OFFER_EXPIRY_HOURS,
  WAITLIST_STATUS,
  PRIORITY_LEVELS,
  DISABILITY_SEVERITY_SCORES,
  AGE_PRIORITY_SCORES,
} = require('../services/scheduling/waitlistPriority.service');

// ─── بيانات اختبار مشتركة ────────────────────────────────────────────────────

const makeEntry = (overrides = {}) => ({
  id: `entry-${Math.random().toString(36).slice(2)}`,
  beneficiaryId: 'ben-001',
  branchId: 'branch-1',
  serviceType: 'pt',
  status: WAITLIST_STATUS.WAITING,
  ageInYears: 5,
  disabilitySeverity: 'moderate',
  waitingDays: 14,
  isUrgentReferral: false,
  currentlyReceivingServices: false,
  requestedServicesCount: 1,
  priorityScore: 50,
  ...overrides,
});

// ─── 1. الثوابت ──────────────────────────────────────────────────────────────
describe('الثوابت', () => {
  test('MAX_PRIORITY_SCORE = 100', () => {
    expect(MAX_PRIORITY_SCORE).toBe(100);
  });

  test('MIN_PRIORITY_SCORE = 0', () => {
    expect(MIN_PRIORITY_SCORE).toBe(0);
  });

  test('MAX_WAIT_BONUS = 20', () => {
    expect(MAX_WAIT_BONUS).toBe(20);
  });

  test('WAIT_BONUS_PER_WEEK = 2', () => {
    expect(WAIT_BONUS_PER_WEEK).toBe(2);
  });

  test('OFFER_EXPIRY_HOURS = 4', () => {
    expect(OFFER_EXPIRY_HOURS).toBe(4);
  });

  test('حالات قائمة الانتظار مكتملة', () => {
    expect(WAITLIST_STATUS.WAITING).toBe('waiting');
    expect(WAITLIST_STATUS.OFFERED).toBe('offered');
    expect(WAITLIST_STATUS.ACCEPTED).toBe('accepted');
    expect(WAITLIST_STATUS.DECLINED).toBe('declined');
    expect(WAITLIST_STATUS.EXPIRED).toBe('expired');
    expect(WAITLIST_STATUS.REMOVED).toBe('removed');
  });

  test('مستويات الأولوية مكتملة', () => {
    expect(PRIORITY_LEVELS.URGENT).toBe('urgent');
    expect(PRIORITY_LEVELS.HIGH).toBe('high');
    expect(PRIORITY_LEVELS.NORMAL).toBe('normal');
    expect(PRIORITY_LEVELS.LOW).toBe('low');
  });

  test('نقاط شدة الإعاقة: severe=40, moderate=25, mild=10', () => {
    expect(DISABILITY_SEVERITY_SCORES.severe).toBe(40);
    expect(DISABILITY_SEVERITY_SCORES.moderate).toBe(25);
    expect(DISABILITY_SEVERITY_SCORES.mild).toBe(10);
  });

  test('نقاط العمر: infant=30, toddler=25, child=15', () => {
    expect(AGE_PRIORITY_SCORES.infant).toBe(30);
    expect(AGE_PRIORITY_SCORES.toddler).toBe(25);
    expect(AGE_PRIORITY_SCORES.child).toBe(15);
    expect(AGE_PRIORITY_SCORES.teen).toBe(10);
    expect(AGE_PRIORITY_SCORES.adult).toBe(5);
  });
});

// ─── 2. getAgeCategory ───────────────────────────────────────────────────────
describe('getAgeCategory — تصنيف الفئة العمرية', () => {
  test('0 سنة → infant', () => {
    expect(getAgeCategory(0)).toBe('infant');
  });

  test('2 سنة → infant', () => {
    expect(getAgeCategory(2)).toBe('infant');
  });

  test('3 سنوات → toddler', () => {
    expect(getAgeCategory(3)).toBe('toddler');
  });

  test('5 سنوات → toddler', () => {
    expect(getAgeCategory(5)).toBe('toddler');
  });

  test('6 سنوات → child', () => {
    expect(getAgeCategory(6)).toBe('child');
  });

  test('10 سنوات → child', () => {
    expect(getAgeCategory(10)).toBe('child');
  });

  test('12 سنة → teen', () => {
    expect(getAgeCategory(12)).toBe('teen');
  });

  test('17 سنة → teen', () => {
    expect(getAgeCategory(17)).toBe('teen');
  });

  test('18 سنة → adult', () => {
    expect(getAgeCategory(18)).toBe('adult');
  });

  test('40 سنة → adult', () => {
    expect(getAgeCategory(40)).toBe('adult');
  });

  test('عمر سالب → adult', () => {
    expect(getAgeCategory(-1)).toBe('adult');
  });

  test('غير رقم → adult', () => {
    expect(getAgeCategory('five')).toBe('adult');
  });
});

// ─── 3. calculateAgeScore ────────────────────────────────────────────────────
describe('calculateAgeScore — نقاط العمر', () => {
  test('رضيع (< 3) = 30', () => {
    expect(calculateAgeScore(2)).toBe(30);
  });

  test('طفل صغير (3-5) = 25', () => {
    expect(calculateAgeScore(4)).toBe(25);
  });

  test('طفل (6-11) = 15', () => {
    expect(calculateAgeScore(8)).toBe(15);
  });

  test('مراهق (12-17) = 10', () => {
    expect(calculateAgeScore(15)).toBe(10);
  });

  test('بالغ (18+) = 5', () => {
    expect(calculateAgeScore(25)).toBe(5);
  });
});

// ─── 4. calculateSeverityScore ───────────────────────────────────────────────
describe('calculateSeverityScore — نقاط شدة الإعاقة', () => {
  test('severe = 40', () => {
    expect(calculateSeverityScore('severe')).toBe(40);
  });

  test('moderate = 25', () => {
    expect(calculateSeverityScore('moderate')).toBe(25);
  });

  test('mild = 10', () => {
    expect(calculateSeverityScore('mild')).toBe(10);
  });

  test('unspecified = 15', () => {
    expect(calculateSeverityScore('unspecified')).toBe(15);
  });

  test('قيمة غير معروفة = 15 (افتراضي)', () => {
    expect(calculateSeverityScore('unknown')).toBe(15);
  });
});

// ─── 5. calculateWaitTimeBonus ───────────────────────────────────────────────
describe('calculateWaitTimeBonus — نقاط مدة الانتظار', () => {
  test('0 يوم = 0 نقطة', () => {
    expect(calculateWaitTimeBonus(0)).toBe(0);
  });

  test('6 أيام (أقل من أسبوع) = 0', () => {
    expect(calculateWaitTimeBonus(6)).toBe(0);
  });

  test('7 أيام (أسبوع) = 2 نقطة', () => {
    expect(calculateWaitTimeBonus(7)).toBe(2);
  });

  test('14 يوم (أسبوعين) = 4 نقاط', () => {
    expect(calculateWaitTimeBonus(14)).toBe(4);
  });

  test('35 يوم (5 أسابيع) = 10 نقاط', () => {
    expect(calculateWaitTimeBonus(35)).toBe(10);
  });

  test('70 يوم (10 أسابيع) = 20 نقطة (الحد الأقصى)', () => {
    expect(calculateWaitTimeBonus(70)).toBe(20);
  });

  test('100 يوم = 20 نقطة (لا يتجاوز الحد الأقصى)', () => {
    expect(calculateWaitTimeBonus(100)).toBe(20);
  });

  test('أيام سالبة = 0', () => {
    expect(calculateWaitTimeBonus(-5)).toBe(0);
  });

  test('غير رقم = 0', () => {
    expect(calculateWaitTimeBonus('many')).toBe(0);
  });
});

// ─── 6. calculatePriorityScore ───────────────────────────────────────────────
describe('calculatePriorityScore — النقاط الإجمالية', () => {
  test('طفل رضيع بإعاقة شديدة + إحالة عاجلة', () => {
    // severe(40) + infant(30) + wait0(0) + urgent(15) + noServices(10) = 95
    const score = calculatePriorityScore({
      ageInYears: 1,
      disabilitySeverity: 'severe',
      waitingDays: 0,
      isUrgentReferral: true,
      currentlyReceivingServices: false,
    });
    expect(score).toBe(95);
  });

  test('طفل صغير بإعاقة متوسطة بدون إحالة عاجلة', () => {
    // moderate(25) + toddler(25) + wait(14→4) + noUrgent(0) + noServices(10) = 64
    const score = calculatePriorityScore({
      ageInYears: 4,
      disabilitySeverity: 'moderate',
      waitingDays: 14,
      isUrgentReferral: false,
      currentlyReceivingServices: false,
    });
    expect(score).toBe(64);
  });

  test('بالغ بإعاقة خفيفة يتلقى خدمات', () => {
    // mild(10) + adult(5) + wait0(0) + noUrgent(0) + receiving(0) = 15
    const score = calculatePriorityScore({
      ageInYears: 30,
      disabilitySeverity: 'mild',
      waitingDays: 0,
      isUrgentReferral: false,
      currentlyReceivingServices: true,
    });
    expect(score).toBe(15);
  });

  test('نقاط متعددة الخدمات (+5)', () => {
    const scoreOne = calculatePriorityScore({
      ageInYears: 5,
      disabilitySeverity: 'mild',
      waitingDays: 0,
      requestedServicesCount: 1,
    });
    const scoreMultiple = calculatePriorityScore({
      ageInYears: 5,
      disabilitySeverity: 'mild',
      waitingDays: 0,
      requestedServicesCount: 3,
    });
    expect(scoreMultiple - scoreOne).toBe(5);
  });

  test('لا يتجاوز 100', () => {
    const score = calculatePriorityScore({
      ageInYears: 1,
      disabilitySeverity: 'severe',
      waitingDays: 365,
      isUrgentReferral: true,
      currentlyReceivingServices: false,
      requestedServicesCount: 5,
    });
    expect(score).toBe(MAX_PRIORITY_SCORE);
  });

  test('لا يقل عن 0', () => {
    const score = calculatePriorityScore({
      ageInYears: 50,
      disabilitySeverity: 'mild',
      waitingDays: 0,
    });
    expect(score).toBeGreaterThanOrEqual(MIN_PRIORITY_SCORE);
  });

  test('بيانات null تُلقي خطأ', () => {
    expect(() => calculatePriorityScore(null)).toThrow();
  });

  test('قيم افتراضية عند حذف الحقول', () => {
    // يجب أن لا يُلقي خطأ
    expect(() => calculatePriorityScore({})).not.toThrow();
  });

  test('الأولوية العاجلة: طفل شديد + 2 أسبوع انتظار', () => {
    // severe(40) + toddler(25) + 14days(4) + noServices(10) = 79 → HIGH
    const score = calculatePriorityScore({
      ageInYears: 4,
      disabilitySeverity: 'severe',
      waitingDays: 14,
      isUrgentReferral: false,
      currentlyReceivingServices: false,
    });
    expect(score).toBe(79);
    expect(getPriorityLevel(score)).toBe('high');
  });
});

// ─── 7. getPriorityLevel ─────────────────────────────────────────────────────
describe('getPriorityLevel — مستوى الأولوية', () => {
  test('100 → urgent', () => {
    expect(getPriorityLevel(100)).toBe('urgent');
  });

  test('80 → urgent', () => {
    expect(getPriorityLevel(80)).toBe('urgent');
  });

  test('79 → high', () => {
    expect(getPriorityLevel(79)).toBe('high');
  });

  test('60 → high', () => {
    expect(getPriorityLevel(60)).toBe('high');
  });

  test('59 → normal', () => {
    expect(getPriorityLevel(59)).toBe('normal');
  });

  test('40 → normal', () => {
    expect(getPriorityLevel(40)).toBe('normal');
  });

  test('39 → low', () => {
    expect(getPriorityLevel(39)).toBe('low');
  });

  test('0 → low', () => {
    expect(getPriorityLevel(0)).toBe('low');
  });
});

// ─── 8. sortWaitlistByPriority ───────────────────────────────────────────────
describe('sortWaitlistByPriority — ترتيب القائمة', () => {
  test('يرتب تنازلياً حسب النقاط', () => {
    const entries = [
      makeEntry({ id: 'a', priorityScore: 40 }),
      makeEntry({ id: 'b', priorityScore: 80 }),
      makeEntry({ id: 'c', priorityScore: 60 }),
    ];
    const sorted = sortWaitlistByPriority(entries);
    expect(sorted[0].id).toBe('b');
    expect(sorted[1].id).toBe('c');
    expect(sorted[2].id).toBe('a');
  });

  test('عند التعادل: الأقدم انتظاراً أولاً', () => {
    const entries = [
      makeEntry({ id: 'a', priorityScore: 70, waitingDays: 10 }),
      makeEntry({ id: 'b', priorityScore: 70, waitingDays: 30 }),
      makeEntry({ id: 'c', priorityScore: 70, waitingDays: 20 }),
    ];
    const sorted = sortWaitlistByPriority(entries);
    expect(sorted[0].id).toBe('b'); // أكثر انتظاراً
    expect(sorted[1].id).toBe('c');
    expect(sorted[2].id).toBe('a');
  });

  test('قائمة فارغة تُعيد فارغة', () => {
    expect(sortWaitlistByPriority([])).toEqual([]);
  });

  test('عنصر واحد لا يُغيّر', () => {
    const entries = [makeEntry({ id: 'only', priorityScore: 55 })];
    const sorted = sortWaitlistByPriority(entries);
    expect(sorted[0].id).toBe('only');
  });

  test('لا يُعدّل المصفوفة الأصلية (immutable)', () => {
    const entries = [
      makeEntry({ id: 'a', priorityScore: 40 }),
      makeEntry({ id: 'b', priorityScore: 80 }),
    ];
    const original = [...entries];
    sortWaitlistByPriority(entries);
    expect(entries[0].id).toBe(original[0].id);
  });

  test('غير مصفوفة تُلقي خطأ', () => {
    expect(() => sortWaitlistByPriority(null)).toThrow();
  });
});

// ─── 9. recalculatePriorities ────────────────────────────────────────────────
describe('recalculatePriorities — تحديث الأولويات', () => {
  test('يضيف الأيام للانتظار', () => {
    const entries = [makeEntry({ waitingDays: 7, ageInYears: 5, disabilitySeverity: 'moderate' })];
    const updated = recalculatePriorities(entries, 7);
    expect(updated[0].waitingDays).toBe(14);
  });

  test('يُعيد priorityScore و priorityLevel', () => {
    const entries = [makeEntry({ waitingDays: 0, ageInYears: 4, disabilitySeverity: 'severe' })];
    const updated = recalculatePriorities(entries, 1);
    expect(updated[0]).toHaveProperty('priorityScore');
    expect(updated[0]).toHaveProperty('priorityLevel');
  });

  test('الأيام الإضافية الافتراضية = 1', () => {
    const entries = [makeEntry({ waitingDays: 10, ageInYears: 5, disabilitySeverity: 'mild' })];
    const updated = recalculatePriorities(entries);
    expect(updated[0].waitingDays).toBe(11);
  });

  test('أيام سالبة تُلقي خطأ', () => {
    expect(() => recalculatePriorities([makeEntry()], -1)).toThrow();
  });

  test('لا يُعدّل المدخلات الأصلية', () => {
    const entry = makeEntry({ waitingDays: 5 });
    recalculatePriorities([entry], 7);
    expect(entry.waitingDays).toBe(5); // لم يتغير
  });
});

// ─── 10. getNextInLine ───────────────────────────────────────────────────────
describe('getNextInLine — المستفيد التالي', () => {
  const slot = { serviceType: 'pt', branchId: 'branch-1', therapistId: 'T1' };

  test('يُعيد المستفيد ذو الأولوية الأعلى', () => {
    const entries = [
      makeEntry({ id: 'low', branchId: 'branch-1', serviceType: 'pt', priorityScore: 40 }),
      makeEntry({ id: 'high', branchId: 'branch-1', serviceType: 'pt', priorityScore: 80 }),
      makeEntry({ id: 'mid', branchId: 'branch-1', serviceType: 'pt', priorityScore: 60 }),
    ];
    const next = getNextInLine(entries, slot);
    expect(next.id).toBe('high');
  });

  test('يتجاهل المستفيدين من فروع أخرى', () => {
    const entries = [
      makeEntry({ id: 'other', branchId: 'branch-2', serviceType: 'pt', priorityScore: 90 }),
      makeEntry({ id: 'same', branchId: 'branch-1', serviceType: 'pt', priorityScore: 50 }),
    ];
    const next = getNextInLine(entries, slot);
    expect(next.id).toBe('same');
  });

  test('يتجاهل خدمات مختلفة', () => {
    const entries = [
      makeEntry({ id: 'ot', branchId: 'branch-1', serviceType: 'ot', priorityScore: 90 }),
      makeEntry({ id: 'pt', branchId: 'branch-1', serviceType: 'pt', priorityScore: 50 }),
    ];
    const next = getNextInLine(entries, slot);
    expect(next.id).toBe('pt');
  });

  test('يتجاهل المدخلات غير المنتظرة', () => {
    const entries = [
      makeEntry({
        id: 'offered',
        branchId: 'branch-1',
        serviceType: 'pt',
        priorityScore: 90,
        status: 'offered',
      }),
      makeEntry({
        id: 'waiting',
        branchId: 'branch-1',
        serviceType: 'pt',
        priorityScore: 50,
        status: 'waiting',
      }),
    ];
    const next = getNextInLine(entries, slot);
    expect(next.id).toBe('waiting');
  });

  test('قائمة فارغة تُعيد null', () => {
    expect(getNextInLine([], slot)).toBeNull();
  });

  test('لا يوجد مطابق تُعيد null', () => {
    const entries = [makeEntry({ branchId: 'branch-2', serviceType: 'ot' })];
    expect(getNextInLine(entries, slot)).toBeNull();
  });

  test('معالج مفضل: يُطابق أو يقبل بدون تفضيل', () => {
    const entries = [
      makeEntry({
        id: 'pref',
        branchId: 'branch-1',
        serviceType: 'pt',
        priorityScore: 50,
        preferredTherapistId: 'T1',
      }),
      makeEntry({
        id: 'any',
        branchId: 'branch-1',
        serviceType: 'pt',
        priorityScore: 40,
        preferredTherapistId: null,
      }),
    ];
    // كلاهما مؤهل
    const next = getNextInLine(entries, slot);
    expect(next.id).toBe('pref'); // الأعلى أولوية
  });

  test('بيانات الموعد null تُلقي خطأ', () => {
    expect(() => getNextInLine([makeEntry()], null)).toThrow();
  });
});

// ─── 11. createOffer ─────────────────────────────────────────────────────────
describe('createOffer — إنشاء العرض', () => {
  const entry = makeEntry({ id: 'e1', beneficiaryId: 'ben-1' });
  const slot = {
    date: '2026-04-10',
    startTime: '09:00',
    endTime: '09:45',
    therapistId: 'T1',
    branchId: 'branch-1',
  };

  test('يُنشئ عرضاً بالبيانات الصحيحة', () => {
    const offer = createOffer(entry, slot);
    expect(offer.entryId).toBe('e1');
    expect(offer.beneficiaryId).toBe('ben-1');
    expect(offer.status).toBe(WAITLIST_STATUS.OFFERED);
    expect(offer.offeredSlot.date).toBe('2026-04-10');
  });

  test('وقت انتهاء الصلاحية = وقت الإنشاء + 4 ساعات', () => {
    const offerTime = new Date('2026-04-03T10:00:00Z');
    const offer = createOffer(entry, slot, offerTime);
    const expiry = new Date(offer.expiresAt);
    const diff = expiry.getTime() - offerTime.getTime();
    expect(diff).toBe(OFFER_EXPIRY_HOURS * 60 * 60 * 1000);
  });

  test('يحتوي على offeredAt بصيغة ISO', () => {
    const offer = createOffer(entry, slot);
    expect(offer.offeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('entry null تُلقي خطأ', () => {
    expect(() => createOffer(null, slot)).toThrow();
  });

  test('slot null تُلقي خطأ', () => {
    expect(() => createOffer(entry, null)).toThrow();
  });
});

// ─── 12. isOfferExpired ──────────────────────────────────────────────────────
describe('isOfferExpired — انتهاء العرض', () => {
  test('عرض منتهي → true', () => {
    const past = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    expect(isOfferExpired(past)).toBe(true);
  });

  test('عرض صالح → false', () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    expect(isOfferExpired(future)).toBe(false);
  });

  test('null → منتهي', () => {
    expect(isOfferExpired(null)).toBe(true);
  });

  test('undefined → منتهي', () => {
    expect(isOfferExpired(undefined)).toBe(true);
  });

  test('checkTime مخصص', () => {
    const expiresAt = new Date('2026-04-03T12:00:00Z').toISOString();
    const before = new Date('2026-04-03T11:00:00Z');
    const after = new Date('2026-04-03T13:00:00Z');
    expect(isOfferExpired(expiresAt, before)).toBe(false);
    expect(isOfferExpired(expiresAt, after)).toBe(true);
  });
});

// ─── 13. getRemainingOfferMinutes ────────────────────────────────────────────
describe('getRemainingOfferMinutes — الوقت المتبقي', () => {
  test('ساعتان متبقيتان = 120 دقيقة', () => {
    const checkTime = new Date('2026-04-03T10:00:00Z');
    const expiresAt = new Date('2026-04-03T12:00:00Z').toISOString();
    expect(getRemainingOfferMinutes(expiresAt, checkTime)).toBe(120);
  });

  test('30 دقيقة متبقية', () => {
    const checkTime = new Date('2026-04-03T11:30:00Z');
    const expiresAt = new Date('2026-04-03T12:00:00Z').toISOString();
    expect(getRemainingOfferMinutes(expiresAt, checkTime)).toBe(30);
  });

  test('انتهى منذ ساعة = -60', () => {
    const checkTime = new Date('2026-04-03T13:00:00Z');
    const expiresAt = new Date('2026-04-03T12:00:00Z').toISOString();
    expect(getRemainingOfferMinutes(expiresAt, checkTime)).toBe(-60);
  });

  test('null → -1', () => {
    expect(getRemainingOfferMinutes(null)).toBe(-1);
  });
});

// ─── 14. filterWaitlist ──────────────────────────────────────────────────────
describe('filterWaitlist — تصفية القائمة', () => {
  const entries = [
    makeEntry({
      id: 'a',
      branchId: 'b1',
      serviceType: 'pt',
      status: 'waiting',
      priorityScore: 70,
      ageInYears: 4,
    }),
    makeEntry({
      id: 'b',
      branchId: 'b1',
      serviceType: 'ot',
      status: 'waiting',
      priorityScore: 50,
      ageInYears: 10,
    }),
    makeEntry({
      id: 'c',
      branchId: 'b2',
      serviceType: 'pt',
      status: 'offered',
      priorityScore: 80,
      ageInYears: 2,
    }),
    makeEntry({
      id: 'd',
      branchId: 'b1',
      serviceType: 'pt',
      status: 'waiting',
      priorityScore: 30,
      ageInYears: 25,
    }),
  ];

  test('تصفية حسب الفرع', () => {
    const result = filterWaitlist(entries, { branchId: 'b1' });
    expect(result.length).toBe(3);
    expect(result.every(e => e.branchId === 'b1')).toBe(true);
  });

  test('تصفية حسب نوع الخدمة', () => {
    const result = filterWaitlist(entries, { serviceType: 'pt' });
    expect(result.length).toBe(3);
  });

  test('تصفية حسب الحالة', () => {
    const result = filterWaitlist(entries, { status: 'offered' });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('c');
  });

  test('تصفية حسب الحد الأدنى للأولوية', () => {
    const result = filterWaitlist(entries, { minPriorityScore: 60 });
    expect(result.length).toBe(2); // a(70) و c(80)
  });

  test('تصفية حسب الحد الأقصى للعمر', () => {
    const result = filterWaitlist(entries, { maxAgeInYears: 10 });
    expect(result.length).toBe(3); // a(4), b(10), c(2)
  });

  test('بدون فلاتر يُعيد الكل', () => {
    expect(filterWaitlist(entries, {})).toHaveLength(4);
  });

  test('فلاتر مركّبة', () => {
    const result = filterWaitlist(entries, {
      branchId: 'b1',
      serviceType: 'pt',
      status: 'waiting',
    });
    expect(result.length).toBe(2); // a و d
  });

  test('غير مصفوفة تُلقي خطأ', () => {
    expect(() => filterWaitlist(null)).toThrow();
  });
});

// ─── 15. calculateWaitlistStats ──────────────────────────────────────────────
describe('calculateWaitlistStats — إحصاءات القائمة', () => {
  test('قائمة فارغة', () => {
    const stats = calculateWaitlistStats([]);
    expect(stats.total).toBe(0);
    expect(stats.waiting).toBe(0);
    expect(stats.averageWaitDays).toBe(0);
  });

  test('إحصاءات صحيحة لقائمة مختلطة', () => {
    const entries = [
      makeEntry({ status: 'waiting', waitingDays: 10, priorityScore: 85 }),
      makeEntry({ status: 'waiting', waitingDays: 20, priorityScore: 65 }),
      makeEntry({ status: 'waiting', waitingDays: 30, priorityScore: 35 }),
      makeEntry({ status: 'offered', waitingDays: 5, priorityScore: 70 }),
    ];
    const stats = calculateWaitlistStats(entries);

    expect(stats.total).toBe(4);
    expect(stats.waiting).toBe(3);
    expect(stats.offered).toBe(1);
    expect(stats.averageWaitDays).toBe(20);
    expect(stats.maxWaitDays).toBe(30);
    expect(stats.urgentCount).toBe(1); // 85 >= 80
    expect(stats.highCount).toBe(1); // 65 ∈ [60,80)
  });

  test('byServiceType يُحسب بشكل صحيح', () => {
    const entries = [
      makeEntry({ status: 'waiting', serviceType: 'pt' }),
      makeEntry({ status: 'waiting', serviceType: 'pt' }),
      makeEntry({ status: 'waiting', serviceType: 'ot' }),
    ];
    const stats = calculateWaitlistStats(entries);
    expect(stats.byServiceType.pt).toBe(2);
    expect(stats.byServiceType.ot).toBe(1);
  });

  test('متوسط الأولوية محسوب', () => {
    const entries = [
      makeEntry({ status: 'waiting', priorityScore: 80 }),
      makeEntry({ status: 'waiting', priorityScore: 40 }),
    ];
    const stats = calculateWaitlistStats(entries);
    expect(stats.averagePriorityScore).toBe(60);
  });

  test('غير مصفوفة تُلقي خطأ', () => {
    expect(() => calculateWaitlistStats('invalid')).toThrow();
  });
});

// ─── 16. estimateWaitDays ────────────────────────────────────────────────────
describe('estimateWaitDays — تقدير الانتظار', () => {
  test('موقع 1 مع استقبال 5/أسبوع = 7 أيام', () => {
    expect(estimateWaitDays(1, 5)).toBe(7);
  });

  test('موقع 5 مع استقبال 5/أسبوع = 7 أيام', () => {
    expect(estimateWaitDays(5, 5)).toBe(7);
  });

  test('موقع 6 مع استقبال 5/أسبوع = 14 يوم', () => {
    expect(estimateWaitDays(6, 5)).toBe(14);
  });

  test('موقع 10 مع استقبال 5/أسبوع = 14 يوم', () => {
    expect(estimateWaitDays(10, 5)).toBe(14);
  });

  test('موقع 1 مع استقبال 1/أسبوع = 7 أيام', () => {
    expect(estimateWaitDays(1, 1)).toBe(7);
  });

  test('موقع 3 مع استقبال 1/أسبوع = 21 يوم', () => {
    expect(estimateWaitDays(3, 1)).toBe(21);
  });

  test('موقع 0 تُلقي خطأ', () => {
    expect(() => estimateWaitDays(0, 5)).toThrow();
  });

  test('موقع سالب تُلقي خطأ', () => {
    expect(() => estimateWaitDays(-1, 5)).toThrow();
  });

  test('معدل استقبال 0 تُلقي خطأ', () => {
    expect(() => estimateWaitDays(1, 0)).toThrow();
  });

  test('معدل استقبال افتراضي = 5', () => {
    expect(estimateWaitDays(1)).toBe(7);
    expect(estimateWaitDays(5)).toBe(7);
    expect(estimateWaitDays(6)).toBe(14);
  });
});

// ─── 17. سيناريوهات متكاملة ─────────────────────────────────────────────────
describe('سيناريوهات متكاملة', () => {
  test('رضيع شديد يحصل على أولوية عاجلة', () => {
    const score = calculatePriorityScore({
      ageInYears: 2,
      disabilitySeverity: 'severe',
      waitingDays: 0,
      isUrgentReferral: false,
      currentlyReceivingServices: false,
    });
    // severe(40) + infant(30) + 0 + noServices(10) = 80
    expect(score).toBe(80);
    expect(getPriorityLevel(score)).toBe('urgent');
  });

  test('بعد أسبوعين من الانتظار ترتفع الأولوية', () => {
    const entries = [
      makeEntry({
        id: 'child',
        ageInYears: 5,
        disabilitySeverity: 'moderate',
        waitingDays: 0,
        isUrgentReferral: false,
        currentlyReceivingServices: false,
        priorityScore: calculatePriorityScore({
          ageInYears: 5,
          disabilitySeverity: 'moderate',
          waitingDays: 0,
          currentlyReceivingServices: false,
        }),
      }),
    ];

    const scoreInitial = entries[0].priorityScore;
    const updated = recalculatePriorities(entries, 14);
    expect(updated[0].priorityScore).toBeGreaterThan(scoreInitial);
  });

  test('عند إلغاء موعد: يُحدد المستفيد التالي ويُنشئ له عرضاً', () => {
    const entries = [
      makeEntry({
        id: 'high',
        branchId: 'b1',
        serviceType: 'speech',
        priorityScore: 85,
        status: 'waiting',
      }),
      makeEntry({
        id: 'low',
        branchId: 'b1',
        serviceType: 'speech',
        priorityScore: 45,
        status: 'waiting',
      }),
    ];

    const cancelledSlot = { serviceType: 'speech', branchId: 'b1', therapistId: 'T2' };
    const next = getNextInLine(entries, cancelledSlot);

    expect(next).not.toBeNull();
    expect(next.id).toBe('high');

    const offer = createOffer(next, {
      date: '2026-04-10',
      startTime: '10:00',
      endTime: '10:45',
      therapistId: 'T2',
      branchId: 'b1',
    });
    expect(offer.status).toBe(WAITLIST_STATUS.OFFERED);
    expect(isOfferExpired(offer.expiresAt)).toBe(false); // صالح الآن
  });

  test('دورة حياة كاملة: انتظار → عرض → قبول', () => {
    const entry = makeEntry({ id: 'ben', beneficiaryId: 'B1', branchId: 'b1', serviceType: 'aba' });
    const slot = {
      date: '2026-04-15',
      startTime: '08:00',
      endTime: '09:00',
      therapistId: 'T3',
      branchId: 'b1',
    };

    // 1. إنشاء عرض
    const offer = createOffer(entry, slot, new Date('2026-04-03T08:00:00Z'));
    expect(offer.status).toBe('offered');

    // 2. التحقق أن العرض صالح
    const checkBefore = new Date('2026-04-03T10:00:00Z');
    expect(isOfferExpired(offer.expiresAt, checkBefore)).toBe(false);

    // 3. الوقت المتبقي = 2 ساعة = 120 دقيقة
    const remaining = getRemainingOfferMinutes(offer.expiresAt, checkBefore);
    expect(remaining).toBe(120);

    // 4. انتهاء الصلاحية بعد 4 ساعات
    const checkAfter = new Date('2026-04-03T13:00:00Z');
    expect(isOfferExpired(offer.expiresAt, checkAfter)).toBe(true);
  });

  test('مقارنة أولويات: طفل شديد vs مراهق خفيف مع انتظار أطول', () => {
    const youngSevere = calculatePriorityScore({
      ageInYears: 2,
      disabilitySeverity: 'severe',
      waitingDays: 7,
      currentlyReceivingServices: false,
    });
    const olderMildLongWait = calculatePriorityScore({
      ageInYears: 16,
      disabilitySeverity: 'mild',
      waitingDays: 70,
      currentlyReceivingServices: false,
    });
    // youngSevere: 40+30+2+10 = 82
    // olderMildLongWait: 10+10+20+10 = 50
    expect(youngSevere).toBeGreaterThan(olderMildLongWait);
  });
});
