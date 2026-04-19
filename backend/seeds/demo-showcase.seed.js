/**
 * demo-showcase.seed.js — end-to-end demo data for the 19 modules
 * shipped in the 2026-04-17/18 sprint.
 *
 * Populates all the new domain records with deterministic test IDs that
 * hit the various mock-adapter branches, so every UI screen has data:
 *
 *   Branches (3)     — 1 HQ + 2 regional, each with balady+wasel codes
 *   Employees (6)    — 4 Saudi + 2 non-Saudi, mix of SCFHS/GOSI/Qiwa states
 *   Guardians (5)    — linked Users with 'parent' role
 *   Beneficiaries    — 10 children across the guardians
 *   TherapySessions  — 18 (past completed · today in-progress · upcoming)
 *   Assessments      — 8 clinical (CARS-2, VB-MAPP, Vineland, Denver-II)
 *   CarePlans        — 4 IEP with goals across 3 tiers
 *   Invoices         — 5 (1 paid · 2 ZATCA-submitted · 1 draft · 1 cancelled)
 *   NphiesClaims     — 4 (approved/rejected/pending/draft)
 *
 * All government verification subdocs populated by running the mock
 * adapters so dashboards show real-looking status chips.
 *
 * Usage:
 *   node backend/scripts/seed-demo-showcase.js
 *   node backend/scripts/seed-demo-showcase.js --reset   # clears first
 */

'use strict';

module.exports = async function seedDemoShowcase({ dryRun = false, reset = false } = {}) {
  const User = require('../models/User');
  const Branch = require('../models/Branch');
  const Employee = require('../models/HR/Employee');
  const Guardian = require('../models/Guardian');
  const Beneficiary = require('../models/Beneficiary');
  const TherapySession = require('../models/TherapySession');
  const ClinicalAssessment = require('../models/ClinicalAssessment');
  const CarePlan = require('../models/CarePlan');
  const Invoice = require('../models/Invoice');
  const NphiesClaim = require('../models/NphiesClaim');
  const CpeRecord = require('../models/CpeRecord');
  const SessionAttendance = require('../models/SessionAttendance');

  const gosi = require('../services/gosiAdapter');
  const scfhs = require('../services/scfhsAdapter');
  const qiwa = require('../services/qiwaAdapter');
  const muqeem = require('../services/muqeemAdapter');
  const balady = require('../services/baladyAdapter');
  const wasel = require('../services/waselAdapter');
  const { buildEnvelope } = require('../services/zatcaEnvelope');
  const fatoora = require('../services/fatooraAdapter');

  const report = { created: {}, updated: {} };
  const bump = (k, delta = 1) => {
    report.created[k] = (report.created[k] || 0) + delta;
  };

  // ── Clear if reset ─────────────────────────────────────────────────────
  if (reset && !dryRun) {
    await Promise.all([
      Branch.deleteMany({ code: /^DEMO-/ }),
      User.deleteMany({ email: /@demo\.alawael\.com$/ }),
      Employee.deleteMany({ email: /@demo\.alawael\.com$/ }),
      Guardian.deleteMany({ email: /@demo\.alawael\.com$/ }),
      Beneficiary.deleteMany({ beneficiaryNumber: /^DEMO-/ }),
      TherapySession.deleteMany({ title: /^\[DEMO\]/ }),
      ClinicalAssessment.deleteMany({ toolVersion: 'demo-2026' }),
      CarePlan.deleteMany({ planNumber: /^DEMO-/ }),
      Invoice.deleteMany({ invoiceNumber: /^DEMO-/ }),
      NphiesClaim.deleteMany({ claimNumber: /^DEMO-/ }),
    ]);
  }

  if (dryRun) {
    return { dryRun: true, message: 'سيتم إنشاء ~60 سجلاً للعرض التجريبي.' };
  }

  // ── Branches ──────────────────────────────────────────────────────────
  // Using balady codes that hit different adapter branches:
  //  DEMO-HQ  → 12345678 → active
  //  DEMO-RIY → 12345680 → expired (ends in 0)
  //  DEMO-JED → 12345679 → suspended (ends in 9)
  const branchSpecs = [
    {
      code: 'DEMO-HQ',
      name_ar: 'المقر الرئيسي — الرياض',
      name_en: 'HQ — Riyadh',
      type: 'hq',
      is_hq: true,
      phone: '+966112345678',
      email: 'hq@demo.alawael.com',
      location: { region: 'riyadh', city_ar: 'الرياض', address_ar: 'حي الياسمين' },
      capacity: { total_rooms: 40, therapy_rooms: 28, max_daily_sessions: 120, max_patients: 250 },
      balady_license_number: '12345678',
      wasel_short_code: 'RFYA1234',
    },
    {
      code: 'DEMO-RIY',
      name_ar: 'فرع الرياض — النخيل',
      name_en: 'Riyadh Branch — Al-Nakheel',
      type: 'branch',
      phone: '+966112345679',
      email: 'riyadh@demo.alawael.com',
      location: { region: 'riyadh', city_ar: 'الرياض', address_ar: 'حي النخيل' },
      capacity: { total_rooms: 20, therapy_rooms: 14, max_daily_sessions: 60, max_patients: 120 },
      balady_license_number: '12345680', // ends 0 → expired
      wasel_short_code: 'KRMZ5678',
    },
    {
      code: 'DEMO-JED',
      name_ar: 'فرع جدة — الروضة',
      name_en: 'Jeddah Branch — Al-Rawdah',
      type: 'branch',
      phone: '+966126789012',
      email: 'jeddah@demo.alawael.com',
      location: { region: 'makkah', city_ar: 'جدة', address_ar: 'حي الروضة' },
      capacity: { total_rooms: 15, therapy_rooms: 10, max_daily_sessions: 45, max_patients: 90 },
      balady_license_number: '12345679', // ends 9 → suspended
      wasel_short_code: 'JZBA2200', // ends 00 → not_found (intentional)
    },
  ];

  const branches = [];
  for (const spec of branchSpecs) {
    const existing = await Branch.findOne({ code: spec.code });
    const branch =
      existing ||
      (await Branch.create({
        ...spec,
        status: 'active',
        established_date: new Date('2020-01-01'),
      }));
    if (!existing) bump('branches');
    // Run mock verify for each to populate verification subdocs
    const baladyResult = await balady.verify({ licenseNumber: spec.balady_license_number });
    const waselResult = await wasel.verifyShortCode({ shortCode: spec.wasel_short_code });
    branch.balady_verification = {
      verified: baladyResult.status !== 'unknown',
      lastVerifiedAt: new Date(),
      mode: baladyResult.mode,
      status: baladyResult.status,
      licenseType: baladyResult.licenseType,
      activityName: baladyResult.activityName,
      issueDate: baladyResult.issueDate,
      expiryDate: baladyResult.expiryDate,
      governorate: baladyResult.governorate,
      city: baladyResult.city,
      remainingDays: baladyResult.remainingDays,
      message: baladyResult.message,
    };
    branch.wasel_verification = {
      verified: waselResult.status === 'match',
      lastVerifiedAt: new Date(),
      mode: waselResult.mode,
      status: waselResult.status,
      address: waselResult.address,
      city: waselResult.city,
      district: waselResult.district,
      postalCode: waselResult.postalCode,
      buildingNumber: waselResult.buildingNumber,
      additionalNumber: waselResult.additionalNumber,
      geo: waselResult.geo,
      isDeliverable: waselResult.isDeliverable,
      message: waselResult.message,
    };
    await branch.save();
    branches.push(branch);
  }

  // ── Employees ─────────────────────────────────────────────────────────
  // Mix of states:
  //  emp-0: SCFHS active + GOSI active + Qiwa compliant — green star
  //  emp-1: SCFHS active + Qiwa wps_violation (nid ends 66) — WPS alert
  //  emp-2: SCFHS expired (license ends 0) + GOSI inactive (nid 11) — compliance issues
  //  emp-3: SCFHS suspended (license ends 9) + Qiwa no_contract (nid 55)
  //  emp-4: non-Saudi + Muqeem active — expat
  //  emp-5: non-Saudi + Muqeem expired (iqama 22) — renewal alert
  const employeeSpecs = [
    {
      first: 'أحمد',
      last: 'العتيبي',
      nid: '1234567801',
      scfhs: '12345',
      email: 'therapist.ahmed@demo.alawael.com',
      role: 'therapist',
    },
    {
      first: 'نورة',
      last: 'القحطاني',
      nid: '2234567866', // tail 66 → qiwa wps_violation
      scfhs: '23456',
      email: 'therapist.noura@demo.alawael.com',
      role: 'therapist',
    },
    {
      first: 'خالد',
      last: 'الشمري',
      nid: '1234567811', // tail 11 → gosi inactive
      scfhs: '34560', // ends 0 → scfhs expired
      email: 'therapist.khaled@demo.alawael.com',
      role: 'specialist',
    },
    {
      first: 'منى',
      last: 'الدوسري',
      nid: '2234567855', // tail 55 → qiwa no_contract
      scfhs: '45679', // ends 9 → scfhs suspended
      email: 'therapist.mona@demo.alawael.com',
      role: 'specialist',
    },
    {
      first: 'Anjali',
      last: 'Nair',
      nid: '2100000003',
      scfhs: '56789',
      iqama: '2345678901', // active iqama
      email: 'therapist.anjali@demo.alawael.com',
      role: 'therapist',
      isSaudi: false,
    },
    {
      first: 'Mariam',
      last: 'Santos',
      nid: '2100000004',
      scfhs: '',
      iqama: '2000000022', // tail 22 → muqeem expired
      email: 'nurse.mariam@demo.alawael.com',
      role: 'specialist',
      isSaudi: false,
    },
  ];

  const employees = [];
  for (let i = 0; i < employeeSpecs.length; i++) {
    const spec = employeeSpecs[i];
    const existing = await Employee.findOne({ email: spec.email });
    let emp;
    if (existing) {
      emp = existing;
    } else {
      emp = await Employee.create({
        employee_code: `DEMO-EMP-${i + 1}`,
        firstName: spec.first,
        lastName: spec.last,
        firstName_ar: spec.first,
        lastName_ar: spec.last,
        email: spec.email,
        phone: `+96650000${String(i).padStart(4, '0')}`,
        national_id: spec.nid,
        national_id_expiry: new Date('2030-01-01'),
        scfhs_number: spec.scfhs || undefined,
        iqama_number: spec.iqama,
        iqama_expiry: spec.iqama ? new Date('2027-01-01') : undefined,
        hire_date: new Date('2023-01-01'),
        contract_type: 'indefinite',
        basic_salary: 8000 + i * 500,
        branch_id: branches[i % branches.length]._id,
        is_saudi: spec.isSaudi !== false,
        status: 'active',
      });
      bump('employees');
    }

    // Run all applicable mock verifications
    const gResult = await gosi.verify({ nationalId: emp.national_id });
    emp.gosi_verification = {
      verified: gResult.status !== 'unknown',
      lastVerifiedAt: new Date(),
      mode: gResult.mode,
      status: gResult.status,
      employerName: gResult.employerName,
      monthlyWage: gResult.monthlyWage,
      registrationDate: gResult.registrationDate,
      message: gResult.message,
    };
    if (emp.scfhs_number) {
      const sResult = await scfhs.verify({
        licenseNumber: emp.scfhs_number,
        nationalId: emp.national_id,
      });
      emp.scfhs_verification = {
        verified: sResult.status !== 'unknown',
        lastVerifiedAt: new Date(),
        mode: sResult.mode,
        status: sResult.status,
        classification: sResult.classification,
        specialty: sResult.specialty,
        licenseNumber: emp.scfhs_number,
        expiryDate: sResult.expiryDate,
        message: sResult.message,
      };
      if (sResult.expiryDate) emp.scfhs_expiry = sResult.expiryDate;
    }
    const qResult = await qiwa.verify({ nationalId: emp.national_id });
    emp.qiwa_verification = {
      verified: qResult.status !== 'unknown',
      lastVerifiedAt: new Date(),
      mode: qResult.mode,
      status: qResult.status,
      contractType: qResult.contractType,
      contractStartDate: qResult.contractStartDate,
      contractEndDate: qResult.contractEndDate,
      wpsCompliant: qResult.wpsCompliant,
      message: qResult.message,
    };
    if (emp.iqama_number) {
      const mResult = await muqeem.verify({ iqamaNumber: emp.iqama_number });
      emp.muqeem_verification = {
        verified: mResult.status !== 'unknown',
        lastVerifiedAt: new Date(),
        mode: mResult.mode,
        status: mResult.status,
        sponsor: mResult.sponsor,
        profession: mResult.profession,
        nationality: mResult.nationality,
        expiryDate: mResult.expiryDate,
        remainingDays: mResult.remainingDays,
        message: mResult.message,
      };
    }
    await emp.save();
    employees.push(emp);
  }

  // ── CPE records — spread three compliance verdicts across the roster ─
  //   emp-1 Ahmed (scfhs 12345): compliant (all mins met + total 105)
  //   emp-2 Noura (scfhs 23456): needs-attention (cat-2 short by 10, 4 months left)
  //   emp-3 Khaled (scfhs 34560): non-compliant + overdue (empty)
  //   emp-4 Mona   (scfhs 45679): empty (suspended license — out of scope)
  //   emp-5 Anjali (scfhs 56789): partial — only cat-1 met
  // Unverified records on emp-1 exercise the "verified-only counts" rule.
  const cpeSpecs = [
    // Ahmed — compliant: 60/30/20 verified + 15 unverified (ignored)
    {
      empIdx: 0,
      cat: '1',
      hours: 30,
      daysAgo: 120,
      verified: true,
      name: 'مؤتمر العلاج الطبيعي السعودي 2025',
      provider: 'SPTA',
    },
    {
      empIdx: 0,
      cat: '1',
      hours: 30,
      daysAgo: 400,
      verified: true,
      name: 'دورة التأهيل الحركي المتقدّم',
      provider: 'SCFHS',
    },
    {
      empIdx: 0,
      cat: '2',
      hours: 30,
      daysAgo: 60,
      verified: true,
      name: 'قراءات ذاتية موثّقة',
      provider: 'Self',
    },
    {
      empIdx: 0,
      cat: '3',
      hours: 20,
      daysAgo: 200,
      verified: true,
      name: 'إشراف على طلاب الامتياز',
      provider: 'KSU',
    },
    {
      empIdx: 0,
      cat: '2',
      hours: 15,
      daysAgo: 10,
      verified: false,
      name: 'ورشة ذاتية بانتظار الاعتماد',
      provider: 'Self',
    },
    // Noura — needs attention: cat-2 short by 10h, scfhs_expiry ~4 months out
    {
      empIdx: 1,
      cat: '1',
      hours: 55,
      daysAgo: 90,
      verified: true,
      name: 'مؤتمر الأطفال ذوي الاحتياجات',
      provider: 'KSA-OT',
    },
    {
      empIdx: 1,
      cat: '2',
      hours: 20,
      daysAgo: 45,
      verified: true,
      name: 'نشاط ذاتي',
      provider: 'Self',
    },
    {
      empIdx: 1,
      cat: '3',
      hours: 22,
      daysAgo: 30,
      verified: true,
      name: 'تدريب في الموقع',
      provider: 'Al-Awael',
    },
    // Anjali — partial: cat-1 met, others short
    {
      empIdx: 4,
      cat: '1',
      hours: 55,
      daysAgo: 180,
      verified: true,
      name: 'International Pediatric Therapy Summit',
      provider: 'IPTS',
    },
    {
      empIdx: 4,
      cat: '2',
      hours: 10,
      daysAgo: 90,
      verified: true,
      name: 'Online evidence-based practice module',
      provider: 'Coursera',
    },
  ];

  // Put Noura's cycle end 4 months out so needsAttention() fires.
  if (employees[1]) {
    employees[1].scfhs_expiry = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
    await employees[1].save();
  }

  for (const spec of cpeSpecs) {
    const target = employees[spec.empIdx];
    if (!target) continue;
    const existing = await CpeRecord.findOne({
      employeeId: target._id,
      activityName: spec.name,
    });
    if (existing) continue;
    await CpeRecord.create({
      employeeId: target._id,
      activityName: spec.name,
      activityNameAr: spec.name,
      provider: spec.provider,
      category: spec.cat,
      creditHours: spec.hours,
      activityDate: new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000),
      verified: spec.verified,
      verifiedAt: spec.verified
        ? new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000)
        : undefined,
    });
    bump('cpeRecords');
  }

  // ── Guardian users + Guardian records ─────────────────────────────────
  const guardianSpecs = [
    { first: 'محمد', last: 'الراشد', email: 'parent.mohammed@demo.alawael.com', nid: '1100000001' },
    { first: 'سارة', last: 'البدري', email: 'parent.sara@demo.alawael.com', nid: '2100000002' },
    { first: 'فهد', last: 'العنزي', email: 'parent.fahad@demo.alawael.com', nid: '1100000003' },
    { first: 'هند', last: 'السعيد', email: 'parent.hind@demo.alawael.com', nid: '2100000004' },
    {
      first: 'عبدالله',
      last: 'الحربي',
      email: 'parent.abdullah@demo.alawael.com',
      nid: '1100000005',
    },
  ];

  const guardians = [];
  for (const g of guardianSpecs) {
    let user = await User.findOne({ email: g.email });
    if (!user) {
      user = await User.create({
        name: `${g.first} ${g.last}`,
        firstName: g.first,
        lastName: g.last,
        email: g.email,
        password: 'Demo@2026',
        role: 'parent',
        nationalId: g.nid,
        phone: `+9665${g.nid.slice(-7)}`,
      });
      bump('users');
    }
    let guardian = await Guardian.findOne({ email: g.email });
    if (!guardian) {
      guardian = await Guardian.create({
        firstName_ar: g.first,
        firstName_en: g.first,
        lastName_ar: g.last,
        lastName_en: g.last,
        email: g.email,
        phone: `+9665${g.nid.slice(-7)}`,
        userId: user._id,
        nationalId: g.nid,
        accountStatus: 'verified',
      });
      bump('guardians');
    }
    guardians.push(guardian);
  }

  // ── Beneficiaries (10, distributed across guardians + branches) ───────
  const disabilityTypes = [
    'autism',
    'intellectual',
    'down_syndrome',
    'cerebral_palsy',
    'adhd',
    'learning_disability',
    'autism',
    'developmental_delay',
    'autism',
    'multiple',
  ];
  const beneficiaries = [];
  for (let i = 0; i < 10; i++) {
    const number = `DEMO-${String(10001 + i).padStart(5, '0')}`;
    const existing = await Beneficiary.findOne({ beneficiaryNumber: number });
    if (existing) {
      beneficiaries.push(existing);
      continue;
    }
    const guardian = guardians[i % guardians.length];
    const age = 4 + (i % 12);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    const ben = await Beneficiary.create({
      beneficiaryNumber: number,
      firstName: `Child-${i + 1}`,
      firstName_ar: `طفل-${i + 1}`,
      lastName: guardian.lastName_en,
      lastName_ar: guardian.lastName_ar,
      dateOfBirth: dob,
      gender: i % 2 === 0 ? 'male' : 'female',
      nationalId: `1${String(200000000 + i).padStart(9, '0')}`,
      disability: { primaryType: disabilityTypes[i] },
      guardians: [guardian._id],
      contact: {
        primaryPhone: `+9665${String(20000000 + i).padStart(7, '0')}`,
        email: `${number.toLowerCase()}@demo.alawael.com`,
      },
      status: i === 9 ? 'waiting' : 'active',
      enrollmentDate: new Date(Date.now() - (i + 1) * 30 * 24 * 3600 * 1000),
      branchId: branches[i % branches.length]._id,
    });
    beneficiaries.push(ben);
    bump('beneficiaries');
  }

  // ── Therapy sessions (18 — past/today/upcoming mix) ───────────────────
  const sessionTypes = ['علاج طبيعي', 'علاج وظيفي', 'نطق وتخاطب', 'علاج سلوكي', 'علاج نفسي'];
  const now = new Date();
  const sessions = [];
  for (let i = 0; i < 18; i++) {
    const offset = -5 + i; // -5 days to +12 days
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    date.setHours(0, 0, 0, 0);
    const hour = 9 + (i % 7); // 9:00–15:00
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
    let status;
    if (offset < 0) status = 'COMPLETED';
    else if (offset === 0) status = i % 2 === 0 ? 'IN_PROGRESS' : 'SCHEDULED';
    else status = 'SCHEDULED';

    const ben = beneficiaries[i % beneficiaries.length];
    const therapist = employees[i % 4]; // pick from first 4 (therapist roles)
    const session = await TherapySession.create({
      title: `[DEMO] جلسة #${i + 1}`,
      sessionType: sessionTypes[i % sessionTypes.length],
      beneficiary: ben._id,
      therapist: therapist._id,
      date,
      startTime,
      endTime,
      status,
      priority: i % 5 === 0 ? 'high' : 'normal',
      // Add SOAP notes for completed sessions
      notes:
        status === 'COMPLETED'
          ? {
              subjective: 'المستفيد متعاون ومستجيب.',
              objective: 'تحسُّن ملحوظ في المهارات الحركية الدقيقة.',
              assessment: 'تقدُّم جيد نحو الأهداف المُحدَّدة.',
              plan: 'استمرار البرنامج الحالي مع زيادة مستوى التحدّي.',
            }
          : undefined,
      rating: status === 'COMPLETED' ? 4 : undefined,
      // Enable telehealth on every 3rd session
      telehealth:
        i % 3 === 0
          ? {
              enabled: true,
              provider: 'jitsi',
              roomName: `alawael-demo-${i}`,
              roomUrl: `https://meet.jit.si/alawael-demo-${i}`,
            }
          : undefined,
    });
    sessions.push(session);
    bump('sessions');
  }

  // ── Session attendance — 3 risk profiles across beneficiaries ──────────
  //   Benef-0: clean attendance (18× present)
  //   Benef-1: occasional late (14 present, 3 late, 1 absent)
  //   Benef-2: ATTENTION bucket — 3 no_show in 30d (+ 10 present)
  //   Benef-3: CRITICAL bucket — 5 no_show in 30d (+ 3 present)
  //   Rest: sparse coverage
  // Attendance records are keyed to actual sessions so the model's
  // unique-sessionId constraint is honored and the dashboard can
  // cross-reference.
  const attendancePlan = {
    // beneficiaryIdx → array of {status, daysAgo, billable?, reason?}
    0: Array.from({ length: 18 }, (_, i) => ({ status: 'present', daysAgo: i + 1 })),
    1: [
      ...Array.from({ length: 14 }, (_, i) => ({ status: 'present', daysAgo: i + 1 })),
      { status: 'late', daysAgo: 5 },
      { status: 'late', daysAgo: 10 },
      { status: 'late', daysAgo: 15 },
      { status: 'absent', daysAgo: 20, reason: 'مرض' },
    ],
    2: [
      ...Array.from({ length: 10 }, (_, i) => ({ status: 'present', daysAgo: i + 1 })),
      { status: 'no_show', daysAgo: 3, billable: true, reason: 'لم يحضر دون إشعار' },
      { status: 'no_show', daysAgo: 12, billable: true, reason: 'لم يحضر دون إشعار' },
      { status: 'no_show', daysAgo: 22, billable: true, reason: 'لم يحضر دون إشعار' },
    ],
    3: [
      ...Array.from({ length: 3 }, (_, i) => ({ status: 'present', daysAgo: i + 1 })),
      { status: 'no_show', daysAgo: 2, billable: true, reason: 'لم يحضر دون إشعار' },
      { status: 'no_show', daysAgo: 8, billable: true, reason: 'لم يحضر دون إشعار' },
      { status: 'no_show', daysAgo: 14, billable: true, reason: 'لم يحضر دون إشعار' },
      { status: 'no_show', daysAgo: 20, billable: true, reason: 'لم يحضر دون إشعار' },
      { status: 'no_show', daysAgo: 26, billable: true, reason: 'لم يحضر دون إشعار' },
    ],
  };

  // Pool of available sessions per beneficiary for linking.
  const sessionsByBenef = new Map();
  for (const s of sessions) {
    const key = String(s.beneficiary || '');
    if (!sessionsByBenef.has(key)) sessionsByBenef.set(key, []);
    sessionsByBenef.get(key).push(s);
  }

  for (const [idxStr, plan] of Object.entries(attendancePlan)) {
    const benef = beneficiaries[Number(idxStr)];
    if (!benef) continue;
    const pool = sessionsByBenef.get(String(benef._id)) || [];
    // If the beneficiary has fewer actual sessions than planned entries,
    // synthesize additional sessionIds — the attendance row's unique
    // constraint is per-sessionId only, so any valid ObjectId works
    // for the demo (real production would reuse real sessions).
    for (let i = 0; i < plan.length; i++) {
      const p = plan[i];
      const session = pool[i];
      const sessionId = session?._id || new (require('mongoose').Types.ObjectId)();
      const existing = await SessionAttendance.findOne({ sessionId });
      if (existing) continue;
      await SessionAttendance.create({
        sessionId,
        beneficiaryId: benef._id,
        therapistId: session?.therapist,
        branchId: session?.branch || branches[0]?._id,
        scheduledDate: new Date(Date.now() - p.daysAgo * 24 * 60 * 60 * 1000),
        status: p.status,
        billable: !!p.billable,
        reason: p.reason,
        markedAt: new Date(),
      });
      bump('attendanceRecords');
    }
  }

  // ── Clinical assessments (8) ──────────────────────────────────────────
  const assessmentSpecs = [
    { tool: 'CARS-2', category: 'autism_screening', score: 32, interpretation: 'moderate' },
    { tool: 'M-CHAT-R', category: 'autism_screening', score: 18, interpretation: 'borderline' },
    { tool: 'VB-MAPP', category: 'language', score: 65, interpretation: 'mild' },
    {
      tool: 'Vineland-3',
      category: 'adaptive_behavior',
      score: 75,
      interpretation: 'within_normal',
    },
    { tool: 'Denver-II', category: 'cognitive', score: 55, interpretation: 'mild' },
    { tool: 'GARS-3', category: 'autism_screening', score: 90, interpretation: 'severe' },
    { tool: 'Bayley-4', category: 'cognitive', score: 45, interpretation: 'moderate' },
    { tool: 'CARS-2', category: 'autism_screening', score: 35, interpretation: 'moderate' },
  ];
  for (let i = 0; i < assessmentSpecs.length; i++) {
    const spec = assessmentSpecs[i];
    const ben = beneficiaries[i];
    const therapist = employees[i % 4];
    const d = new Date();
    d.setDate(d.getDate() - (30 + i * 15));
    await ClinicalAssessment.create({
      beneficiary: ben._id,
      therapist: therapist._id,
      branchId: ben.branchId,
      tool: spec.tool,
      toolVersion: 'demo-2026',
      category: spec.category,
      assessmentDate: d,
      duration: 60,
      score: spec.score,
      rawScore: Math.round(spec.score * 1.5),
      maxRawScore: 200,
      interpretation: spec.interpretation,
      observations: 'المستفيد متعاون. تمت متابعة البروتوكول الكامل للأداة.',
      strengths: ['مهارات لغوية متقدمة', 'تفاعل اجتماعي إيجابي'],
      concerns: ['صعوبات في الانتباه', 'حاجة لتطوير المهارات الدقيقة'],
      recommendations: ['متابعة جلسات العلاج الوظيفي', 'برنامج منزلي أسبوعي'],
      status: 'completed',
    });
    bump('assessments');
  }

  // ── Care plans (4, with goals) ────────────────────────────────────────
  for (let i = 0; i < 4; i++) {
    const ben = beneficiaries[i];
    const plan = await CarePlan.create({
      beneficiary: ben._id,
      planNumber: `DEMO-CP-${2026}-${String(i + 1).padStart(4, '0')}`,
      startDate: new Date(Date.now() - 60 * 24 * 3600 * 1000),
      reviewDate: new Date(Date.now() + 120 * 24 * 3600 * 1000),
      status: 'ACTIVE',
      educational: {
        enabled: true,
        domains: {
          academic: {
            goals: [
              {
                title: 'التعرُّف على الحروف العربية',
                type: 'ACADEMIC',
                baseline: 'يعرف 5 حروف',
                target: 'يعرف 20 حرفاً',
                criteria: '80% دقّة في 4 جلسات',
                status: i === 0 ? 'ACHIEVED' : 'IN_PROGRESS',
                progress: i === 0 ? 100 : 60,
                targetDate: new Date(Date.now() + 90 * 24 * 3600 * 1000),
              },
            ],
          },
          communication: {
            goals: [
              {
                title: 'طلب الاحتياجات بكلمة واحدة',
                type: 'COMMUNICATION',
                baseline: 'يشير فقط',
                target: 'يستخدم كلمة مناسبة',
                criteria: '75% دقّة عبر 3 بيئات',
                status: 'IN_PROGRESS',
                progress: 40 + i * 10,
                targetDate: new Date(Date.now() + 120 * 24 * 3600 * 1000),
              },
            ],
          },
        },
      },
      therapeutic: {
        enabled: true,
        domains: {
          occupational: {
            goals: [
              {
                title: 'تحسين المهارات الحركية الدقيقة',
                type: 'MOTOR',
                baseline: 'لا يُمسك القلم',
                target: 'يُمسك القلم بشكل صحيح',
                criteria: 'مستدام لمدة 10 دقائق',
                status: 'IN_PROGRESS',
                progress: 50,
                targetDate: new Date(Date.now() + 180 * 24 * 3600 * 1000),
              },
            ],
          },
        },
      },
      lifeSkills:
        i >= 2
          ? {
              enabled: true,
              domains: {
                selfCare: {
                  goals: [
                    {
                      title: 'ارتداء الملابس باستقلالية',
                      type: 'LIFE_SKILL',
                      status: 'PENDING',
                      progress: 10,
                    },
                  ],
                },
              },
            }
          : { enabled: false },
    });
    bump('carePlans');
  }

  // ── Invoices (5: draft/issued/paid + ZATCA submitted) ─────────────────
  const invoiceSpecs = [
    { ben: 0, amount: 1500, status: 'DRAFT', issue: false, submit: false },
    { ben: 1, amount: 3500, status: 'ISSUED', issue: true, submit: false },
    { ben: 2, amount: 5000, status: 'PAID', issue: true, submit: true },
    { ben: 3, amount: 15000, status: 'ISSUED', issue: true, submit: true }, // large = clearance
    { ben: 4, amount: 2000, status: 'CANCELLED', issue: false, submit: false },
  ];
  for (let i = 0; i < invoiceSpecs.length; i++) {
    const s = invoiceSpecs[i];
    const ben = beneficiaries[s.ben];
    const invoiceNumber = `DEMO-INV-202604-${String(i + 1).padStart(4, '0')}`;
    const existing = await Invoice.findOne({ invoiceNumber });
    if (existing) continue;
    const subTotal = s.amount;
    const taxAmount = Math.round(subTotal * 0.15 * 100) / 100;
    const totalAmount = Math.round((subTotal + taxAmount) * 100) / 100;
    const invoice = await Invoice.create({
      invoiceNumber,
      beneficiary: ben._id,
      issueDate: new Date(Date.now() - (i + 1) * 7 * 24 * 3600 * 1000),
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      items: [
        {
          description: `جلسة ${sessionTypes[i % sessionTypes.length]} (10 جلسات)`,
          quantity: 10,
          unitPrice: subTotal / 10,
          total: subTotal,
        },
      ],
      subTotal,
      taxAmount,
      totalAmount,
      status: s.status,
    });

    if (s.issue) {
      const env = buildEnvelope(invoice.toObject(), {
        sellerName: 'مراكز الأوائل للتأهيل',
        sellerVatNumber: '300000000000003',
        buyerName: `${ben.firstName_ar} ${ben.lastName_ar}`,
        icv: i + 1,
      });
      invoice.zatca = { ...env, zatcaStatus: 'NOT_SUBMITTED' };
    }
    if (s.submit) {
      const r = await fatoora.submit({
        invoice: invoice.toObject(),
        uuid: invoice.zatca?.uuid,
        invoiceHash: invoice.zatca?.invoiceHash,
      });
      invoice.zatca.zatcaStatus =
        r.status === 'ACCEPTED'
          ? 'ACCEPTED'
          : r.status === 'REPORTED'
            ? 'SUBMITTED'
            : 'NOT_SUBMITTED';
      invoice.zatca.submittedToZatcaAt = new Date();
      invoice.zatca.zatcaReference = r.zatcaReference;
    }
    await invoice.save();
    bump('invoices');
  }

  // ── Nphies claims (4) ─────────────────────────────────────────────────
  const claimSpecs = [
    { ben: 0, memberId: 'BUPA001', amount: 500, submit: true }, // → APPROVED
    { ben: 1, memberId: 'TAWUN77', amount: 800, submit: true }, // suffix 77 → REJECTED
    { ben: 2, memberId: 'MEDGULF99', amount: 15000, submit: true }, // > 10k → PENDING_REVIEW
    { ben: 3, memberId: 'BUPA002', amount: 1200, submit: false }, // DRAFT
  ];
  const nphies = require('../services/nphiesAdapter');
  for (let i = 0; i < claimSpecs.length; i++) {
    const s = claimSpecs[i];
    const ben = beneficiaries[s.ben];
    const claimNumber = `DEMO-CLM-202604-${String(i + 1).padStart(4, '0')}`;
    const existing = await NphiesClaim.findOne({ claimNumber });
    if (existing) continue;
    const claim = await NphiesClaim.create({
      claimNumber,
      beneficiary: ben._id,
      memberId: s.memberId,
      insurerName: s.memberId.startsWith('BUPA')
        ? 'بوبا العربية'
        : s.memberId.startsWith('TAWUN')
          ? 'التعاونية'
          : 'ميدغلف',
      serviceDate: new Date(Date.now() - 14 * 24 * 3600 * 1000),
      diagnosis: [{ code: 'F84.0', description: 'اضطراب طيف التوحد' }],
      services: [
        {
          code: 'ST001',
          description: `جلسة ${sessionTypes[i % sessionTypes.length]}`,
          quantity: 1,
          unitPrice: s.amount,
          total: s.amount,
        },
      ],
      totalAmount: s.amount,
      status: 'DRAFT',
    });

    // Run eligibility
    const elig = await nphies.checkEligibility({ memberId: s.memberId });
    claim.nphies = {
      eligibility: {
        status: elig.status,
        checkedAt: new Date(),
        message: elig.message,
        mode: elig.mode,
      },
    };
    if (elig.copay != null) claim.copay = elig.copay;
    if (elig.status === 'eligible') claim.status = 'READY';

    if (s.submit) {
      const r = await nphies.submitClaim({
        memberId: s.memberId,
        insurerId: claim.insurerId,
        services: claim.services,
        totalAmount: claim.totalAmount,
        diagnosis: claim.diagnosis,
      });
      claim.nphies.submission = {
        status: r.status,
        submittedAt: new Date(),
        claimReference: r.claimReference,
        reason: r.reason,
        message: r.message,
        mode: r.mode,
      };
      if (r.status === 'APPROVED') {
        claim.approvedAmount = r.approvedAmount ?? claim.totalAmount;
        claim.patientShare = r.remainingBalance ?? 0;
        claim.status = 'PAID';
      } else if (r.status === 'REJECTED') {
        claim.status = 'DENIED';
      } else if (r.status === 'PENDING_REVIEW') {
        claim.status = 'SUBMITTED';
      }
    }
    await claim.save();
    bump('nphiesClaims');
  }

  // ── Seed AdapterAudit rows ────────────────────────────────────────────
  // So /admin/adapter-audit and the Grafana dashboards have real-looking
  // data on first demo load instead of empty state. Spread over the past
  // 7 days; realistic success/failure/rate-limited mix (95/3/2%).
  if (!dryRun) {
    const AdapterAudit = require('../models/AdapterAudit');
    const crypto = require('crypto');
    const hash = (s, salt = process.env.JWT_SECRET || 'alawael-pdpl-salt') =>
      crypto.createHash('sha256').update(`${s}:${salt}`).digest('hex').slice(0, 32);

    // Remove older demo-seeded audit rows so reruns don't stack up
    if (reset) {
      await AdapterAudit.deleteMany({ actorEmail: /@demo\.alawael\.com$/ });
    }

    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    // Provider weights roughly match expected real-world ratio
    const providerWeights = [
      { provider: 'gosi', op: 'verify', kind: 'nationalId', weight: 25 },
      { provider: 'scfhs', op: 'verify', kind: 'licenseNumber', weight: 15 },
      { provider: 'qiwa', op: 'verify', kind: 'nationalId', weight: 15 },
      { provider: 'muqeem', op: 'verify', kind: 'iqama', weight: 10 },
      { provider: 'absher', op: 'verify', kind: 'nationalId', weight: 8 },
      { provider: 'wasel', op: 'verifyShortCode', kind: 'shortCode', weight: 8 },
      { provider: 'balady', op: 'verify', kind: 'licenseNumber', weight: 6 },
      { provider: 'nafath', op: 'initiate', kind: 'nationalId', weight: 6 },
      { provider: 'nphies', op: 'eligibility', kind: 'memberId', weight: 5 },
      { provider: 'fatoora', op: 'submit', kind: 'uuid', weight: 2 },
    ];
    const pool = [];
    providerWeights.forEach(p => {
      for (let i = 0; i < p.weight; i += 1) pool.push(p);
    });
    const actors = [...guardianSpecs.slice(0, 3), ...employeeSpecs.slice(0, 2)];

    const rows = [];
    for (let i = 0; i < 200; i += 1) {
      const p = pool[Math.floor(Math.random() * pool.length)];
      const actor = actors[Math.floor(Math.random() * actors.length)];
      const createdAt = new Date(now - Math.random() * SEVEN_DAYS);
      const roll = Math.random();
      let status;
      let success;
      if (roll < 0.03) {
        status = 'error';
        success = false;
      } else if (roll < 0.05) {
        status = 'rate_limited';
        success = false;
      } else {
        status = 'active';
        success = true;
      }
      // Realistic latency: log-normal, mostly 50-800ms, occasional outlier
      const latencyMs =
        Math.random() < 0.02
          ? Math.round(2000 + Math.random() * 2000)
          : Math.round(50 + Math.pow(Math.random(), 2) * 750);
      rows.push({
        actorEmail: actor.email,
        actorRole: actor.role || 'demo',
        provider: p.provider,
        operation: p.op,
        mode: 'mock',
        targetHash: hash(`demo-${i}-${p.provider}`),
        targetKind: p.kind,
        status,
        latencyMs,
        success,
        errorMessage: status === 'error' ? 'HTTP 503 — upstream unavailable' : undefined,
        ipHash: hash(`10.0.0.${i % 255}`),
        createdAt,
      });
    }
    await AdapterAudit.insertMany(rows);
    bump('adapterAuditRows', rows.length);
  }

  return {
    success: true,
    summary: report.created,
    credentials: {
      note: 'كل المستخدمين التجريبيين يستخدمون كلمة المرور: Demo@2026',
      parents: guardianSpecs.map(g => g.email),
      therapists: employeeSpecs.map(e => e.email),
    },
    branches: branches.map(b => ({ code: b.code, id: b._id })),
  };
};
