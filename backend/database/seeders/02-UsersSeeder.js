/**
 * UsersSeeder — إنشاء 30+ مستخدم تجريبي بأسماء عربية واقعية
 * مدير نظام + مدراء فروع + أخصائيون + موظفو استقبال + محاسبون + سائقون + HR
 */
'use strict';

const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Branch = require('../../models/Branch');

async function run() {
  console.log('👥 إنشاء المستخدمين (30+ موظف)...');

  const riyadh = await Branch.findOne({ code: 'RUH-01' });
  const jeddah = await Branch.findOne({ code: 'JED-01' });
  const dammam = await Branch.findOne({ code: 'DMM-01' });

  if (!riyadh || !jeddah || !dammam) {
    throw new Error('❌ لم يتم العثور على الفروع. تأكد من تشغيل BranchSeeder أولاً.');
  }

  const USERS = [
    // ═══════════════ مدير النظام ═══════════════
    {
      username: 'admin_system',
      email: 'admin@alawael.com',
      phone: '0501234567',
      fullName: 'عبدالله بن سعود المطيري',
      role: 'super_admin',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Admin@2026',
      _meta: { employeeId: 'EMP-001', specialty: null, dept: 'management' },
    },
    // ═══════════════ مدراء الفروع ═══════════════
    {
      username: 'mgr_riyadh',
      email: 'ahmed.amri@alawael.sa',
      phone: '0551234001',
      fullName: 'أحمد بن محمد العمري',
      role: 'manager',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Manager@2026',
      _meta: { employeeId: 'EMP-002', specialty: null, dept: 'management' },
    },
    {
      username: 'mgr_jeddah',
      email: 'fatimah.zahrani@alawael.sa',
      phone: '0551234002',
      fullName: 'فاطمة بنت خالد الزهراني',
      role: 'manager',
      branch: jeddah._id,
      isActive: true,
      emailVerified: true,
      _password: 'Manager@2026',
      _meta: { employeeId: 'EMP-003', specialty: null, dept: 'management' },
    },
    {
      username: 'mgr_dammam',
      email: 'saud.dosari@alawael.sa',
      phone: '0551234003',
      fullName: 'سعود بن عبدالله الدوسري',
      role: 'manager',
      branch: dammam._id,
      isActive: true,
      emailVerified: true,
      _password: 'Manager@2026',
      _meta: { employeeId: 'EMP-004', specialty: null, dept: 'management' },
    },
    // ═══════════════ أخصائيو فرع الرياض ═══════════════
    {
      username: 'sp_noura_st',
      email: 'noura.qahtani@alawael.sa',
      phone: '0551234010',
      fullName: 'نورة بنت عبدالرحمن القحطاني',
      role: 'therapist',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-010',
        specialty: 'speech_therapy',
        dept: 'clinical',
        license: 'SCFHS-ST-00123',
      },
    },
    {
      username: 'sp_mohammed_ot',
      email: 'mohammed.shahrani@alawael.sa',
      phone: '0551234011',
      fullName: 'محمد بن علي الشهراني',
      role: 'therapist',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-011',
        specialty: 'occupational_therapy',
        dept: 'clinical',
        license: 'SCFHS-OT-00456',
      },
    },
    {
      username: 'sp_sarah_pt',
      email: 'sarah.otaibi@alawael.sa',
      phone: '0551234012',
      fullName: 'سارة بنت فهد العتيبي',
      role: 'therapist',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-012',
        specialty: 'physical_therapy',
        dept: 'clinical',
        license: 'SCFHS-PT-00789',
      },
    },
    {
      username: 'sp_khalid_aba',
      email: 'khalid.ghamdi@alawael.sa',
      phone: '0551234013',
      fullName: 'خالد بن ناصر الغامدي',
      role: 'therapist',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-013',
        specialty: 'behavior_therapy',
        dept: 'clinical',
        license: 'SCFHS-BA-00321',
      },
    },
    {
      username: 'sp_hind_se',
      email: 'hind.harbi@alawael.sa',
      phone: '0551234014',
      fullName: 'هند بنت سالم الحربي',
      role: 'teacher',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-014',
        specialty: 'special_education',
        dept: 'clinical',
        license: 'MOE-SE-00654',
      },
    },
    {
      username: 'sp_omar_psy',
      email: 'omar.subaie@alawael.sa',
      phone: '0551234015',
      fullName: 'عمر بن حسن السبيعي',
      role: 'doctor',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-015',
        specialty: 'psychology',
        dept: 'clinical',
        license: 'SCFHS-PS-00987',
      },
    },
    {
      username: 'sp_manal_sw',
      email: 'manal.rashed@alawael.sa',
      phone: '0551234016',
      fullName: 'منال بنت إبراهيم الراشد',
      role: 'therapist',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-016',
        specialty: 'social_work',
        dept: 'clinical',
        license: 'SCFHS-SW-00111',
      },
    },
    // ═══════════════ أخصائيو فرع جدة ═══════════════
    {
      username: 'sp_reem_st',
      email: 'reem.sulami@alawael.sa',
      phone: '0551234020',
      fullName: 'ريم بنت ماجد السلمي',
      role: 'supervisor',
      branch: jeddah._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-020',
        specialty: 'speech_therapy',
        dept: 'clinical',
        license: 'SCFHS-ST-00234',
      },
    },
    {
      username: 'sp_badr_pt',
      email: 'badr.shamrani@alawael.sa',
      phone: '0551234021',
      fullName: 'بدر بن سعد الشمراني',
      role: 'therapist',
      branch: jeddah._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-021',
        specialty: 'physical_therapy',
        dept: 'clinical',
        license: 'SCFHS-PT-00345',
      },
    },
    {
      username: 'sp_lama_ot',
      email: 'lama.ahmadi@alawael.sa',
      phone: '0551234022',
      fullName: 'لمى بنت عادل الأحمدي',
      role: 'therapist',
      branch: jeddah._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-022',
        specialty: 'occupational_therapy',
        dept: 'clinical',
        license: 'SCFHS-OT-00567',
      },
    },
    {
      username: 'sp_faisal_aba',
      email: 'faisal.malki@alawael.sa',
      phone: '0551234023',
      fullName: 'فيصل بن يوسف المالكي',
      role: 'therapist',
      branch: jeddah._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-023',
        specialty: 'behavior_therapy',
        dept: 'clinical',
        license: 'SCFHS-BA-00432',
      },
    },
    {
      username: 'sp_amal_se',
      email: 'amal.johani@alawael.sa',
      phone: '0551234024',
      fullName: 'أمل بنت حمد الجهني',
      role: 'teacher',
      branch: jeddah._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-024',
        specialty: 'special_education',
        dept: 'clinical',
        license: 'MOE-SE-00765',
      },
    },
    // ═══════════════ أخصائيو فرع الدمام ═══════════════
    {
      username: 'sp_yasser_st',
      email: 'yasser.sharif@alawael.sa',
      phone: '0551234030',
      fullName: 'ياسر بن عبدالعزيز الشريف',
      role: 'therapist',
      branch: dammam._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-030',
        specialty: 'speech_therapy',
        dept: 'clinical',
        license: 'SCFHS-ST-00555',
      },
    },
    {
      username: 'sp_dalal_ot',
      email: 'dalal.anazi@alawael.sa',
      phone: '0551234031',
      fullName: 'دلال بنت صالح العنزي',
      role: 'therapist',
      branch: dammam._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-031',
        specialty: 'occupational_therapy',
        dept: 'clinical',
        license: 'SCFHS-OT-00666',
      },
    },
    {
      username: 'sp_turki_pt',
      email: 'turki.shahri@alawael.sa',
      phone: '0551234032',
      fullName: 'تركي بن محمد الشهري',
      role: 'therapist',
      branch: dammam._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-032',
        specialty: 'physical_therapy',
        dept: 'clinical',
        license: 'SCFHS-PT-00777',
      },
    },
    {
      username: 'sp_ghada_aba',
      email: 'ghada.balawi@alawael.sa',
      phone: '0551234033',
      fullName: 'غادة بنت عمر البلوي',
      role: 'therapist',
      branch: dammam._id,
      isActive: true,
      emailVerified: true,
      _password: 'Specialist@2026',
      _meta: {
        employeeId: 'EMP-033',
        specialty: 'behavior_therapy',
        dept: 'clinical',
        license: 'SCFHS-BA-00888',
      },
    },
    // ═══════════════ موظفو الاستقبال ═══════════════
    {
      username: 'rec_maha_ruh',
      email: 'maha.rajhi@alawael.sa',
      phone: '0551234040',
      fullName: 'مها بنت سليمان الراجحي',
      role: 'receptionist',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Reception@2026',
      _meta: { employeeId: 'EMP-040', specialty: null, dept: 'reception' },
    },
    {
      username: 'rec_wafaa_jed',
      email: 'wafaa.bishi@alawael.sa',
      phone: '0551234041',
      fullName: 'وفاء بنت أحمد البيشي',
      role: 'receptionist',
      branch: jeddah._id,
      isActive: true,
      emailVerified: true,
      _password: 'Reception@2026',
      _meta: { employeeId: 'EMP-041', specialty: null, dept: 'reception' },
    },
    {
      username: 'rec_haifa_dmm',
      email: 'haifa.mutairi@alawael.sa',
      phone: '0551234042',
      fullName: 'هيفاء بنت راشد المطيري',
      role: 'receptionist',
      branch: dammam._id,
      isActive: true,
      emailVerified: true,
      _password: 'Reception@2026',
      _meta: { employeeId: 'EMP-042', specialty: null, dept: 'reception' },
    },
    // ═══════════════ المحاسبون ═══════════════
    {
      username: 'acc_adel_ruh',
      email: 'adel.namri@alawael.sa',
      phone: '0551234050',
      fullName: 'عادل بن خالد النمري',
      role: 'accountant',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Account@2026',
      _meta: { employeeId: 'EMP-050', specialty: null, dept: 'finance' },
    },
    {
      username: 'acc_salma_jed',
      email: 'salma.faifi@alawael.sa',
      phone: '0551234051',
      fullName: 'سلمى بنت حسين الفيفي',
      role: 'accountant',
      branch: jeddah._id,
      isActive: true,
      emailVerified: true,
      _password: 'Account@2026',
      _meta: { employeeId: 'EMP-051', specialty: null, dept: 'finance' },
    },
    // ═══════════════ السائقون ═══════════════
    {
      username: 'drv_salem_ruh',
      email: 'salem.ajmi@alawael.sa',
      phone: '0551234060',
      fullName: 'سالم بن مبارك العجمي',
      role: 'user',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Driver@2026',
      _meta: { employeeId: 'EMP-060', specialty: 'driver', dept: 'transport' },
    },
    {
      username: 'drv_nasser_ruh',
      email: 'nasser.rashidi@alawael.sa',
      phone: '0551234061',
      fullName: 'ناصر بن فهد الرشيدي',
      role: 'user',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'Driver@2026',
      _meta: { employeeId: 'EMP-061', specialty: 'driver', dept: 'transport' },
    },
    {
      username: 'drv_hamdan_jed',
      email: 'hamdan.yami@alawael.sa',
      phone: '0551234062',
      fullName: 'حمدان بن سعيد اليامي',
      role: 'user',
      branch: jeddah._id,
      isActive: true,
      emailVerified: true,
      _password: 'Driver@2026',
      _meta: { employeeId: 'EMP-062', specialty: 'driver', dept: 'transport' },
    },
    {
      username: 'drv_meshal_dmm',
      email: 'meshal.hajri@alawael.sa',
      phone: '0551234063',
      fullName: 'مشعل بن راشد الهاجري',
      role: 'user',
      branch: dammam._id,
      isActive: true,
      emailVerified: true,
      _password: 'Driver@2026',
      _meta: { employeeId: 'EMP-063', specialty: 'driver', dept: 'transport' },
    },
    // ═══════════════ الموارد البشرية ═══════════════
    {
      username: 'hr_abeer',
      email: 'abeer.hamdan@alawael.sa',
      phone: '0551234070',
      fullName: 'عبير بنت صالح الحمدان',
      role: 'hr_manager',
      branch: riyadh._id,
      isActive: true,
      emailVerified: true,
      _password: 'HR@2026',
      _meta: { employeeId: 'EMP-070', specialty: null, dept: 'hr' },
    },
  ];

  let created = 0;
  let updated = 0;
  const createdUsers = [];

  for (const userData of USERS) {
    const { _password, _meta, ...userFields } = userData;

    // تحقق من وجود المستخدم (بالإيميل أو الهاتف أو اسم المستخدم)
    const orConditions = [];
    if (userFields.email) orConditions.push({ email: userFields.email });
    if (userFields.phone) orConditions.push({ phone: userFields.phone });
    if (userFields.username) orConditions.push({ username: userFields.username });
    const existing = await User.findOne({ $or: orConditions }).select('+password');

    if (existing) {
      // تحديث البيانات فقط (دون تغيير كلمة المرور)
      await User.updateOne(
        { _id: existing._id },
        { $set: { ...userFields, updatedAt: new Date() } }
      );
      createdUsers.push({ ...existing.toObject(), _meta });
      updated++;
    } else {
      // تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash(_password, 12);
      const newUser = await User.create({
        ...userFields,
        password: hashedPassword,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdUsers.push({ ...newUser.toObject(), _meta });
      created++;
    }
  }

  console.log(
    `   ✅ المستخدمون: ${created} تم إنشاؤهم، ${updated} تم تحديثهم (الإجمالي: ${USERS.length})`
  );
  return { created, updated, total: USERS.length, users: createdUsers };
}

module.exports = { run };
