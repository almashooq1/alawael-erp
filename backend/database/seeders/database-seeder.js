/* eslint-disable no-unused-vars */
/**
 * بيانات تجريبية لقاعدة البيانات - Database Seeder
 * نظام الألوائل للتأهيل وإعادة التأهيل
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// تعريف المخططات
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    fullNameAr: { type: String },
    role: { type: String, enum: ['admin', 'manager', 'employee', 'viewer'], default: 'employee' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    phone: String,
    nationalId: String,
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    preferences: {
      language: { type: String, default: 'ar' },
      theme: { type: String, default: 'light' },
      notifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    city: String,
    cityAr: String,
    address: String,
    addressAr: String,
    phone: String,
    email: String,
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    capacity: { type: Number, default: 100 },
    currentOccupancy: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '16:00' },
    },
  },
  { timestamps: true }
);

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: String,
    descriptionAr: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const disabilityTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    category: String,
    categoryAr: String,
    description: String,
    descriptionAr: String,
    requiresSpecialCare: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const beneficiarySchema = new mongoose.Schema(
  {
    // المعلومات الأساسية
    nationalId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    firstNameAr: { type: String, required: true },
    lastName: { type: String, required: true },
    lastNameAr: { type: String, required: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female'] },

    // معلومات الاتصال
    phone: String,
    email: String,
    address: String,
    addressAr: String,
    city: String,
    cityAr: String,

    // معلومات الإعاقة
    disabilityType: { type: mongoose.Schema.Types.ObjectId, ref: 'DisabilityType' },
    disabilityPercentage: { type: Number, min: 0, max: 100 },
    diagnosisDate: Date,
    diagnosisDetails: String,

    // معلومات التأهيل
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    registrationDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['active', 'inactive', 'graduated', 'transferred', 'waiting'],
      default: 'waiting',
    },

    // ولي الأمر
    guardian: {
      name: String,
      nameAr: String,
      relationship: String,
      relationshipAr: String,
      phone: String,
      email: String,
      nationalId: String,
    },

    // الملاحظات
    notes: String,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    category: String,
    categoryAr: String,
    description: String,
    descriptionAr: String,
    duration: { type: Number, default: 60 }, // بالدقائق
    price: { type: Number, default: 0 },
    requiresApproval: { type: Boolean, default: false },
    maxParticipants: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const sessionSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled',
    },
    notes: String,
    attendanceNotes: String,
    goals: [String],
    achievements: [String],
    rating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
);

const vehicleSchema = new mongoose.Schema(
  {
    plateNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: ['bus', 'van', 'car', 'ambulance'] },
    brand: String,
    model: String,
    year: Number,
    color: String,
    capacity: { type: Number, default: 20 },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'out-of-service'],
      default: 'active',
    },
    lastMaintenance: Date,
    nextMaintenance: Date,
    insuranceExpiry: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// إنشاء النماذج
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Branch = mongoose.models.Branch || mongoose.model('Branch', branchSchema);
const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);
const DisabilityType =
  mongoose.models.DisabilityType || mongoose.model('DisabilityType', disabilityTypeSchema);
const Beneficiary = mongoose.models.Beneficiary || mongoose.model('Beneficiary', beneficiarySchema);
const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);
const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);

// البيانات التجريبية
const seedData = {
  branches: [
    {
      name: 'Main Branch',
      nameAr: 'الفرع الرئيسي',
      code: 'BR001',
      city: 'Riyadh',
      cityAr: 'الرياض',
      capacity: 200,
    },
    {
      name: 'Northern Branch',
      nameAr: 'الفرع الشمالي',
      code: 'BR002',
      city: 'Riyadh',
      cityAr: 'الرياض',
      capacity: 150,
    },
    {
      name: 'Eastern Branch',
      nameAr: 'الفرع الشرقي',
      code: 'BR003',
      city: 'Dammam',
      cityAr: 'الدمام',
      capacity: 100,
    },
  ],

  departments: [
    { name: 'Physiotherapy', nameAr: 'العلاج الطبيعي', code: 'DEPT001' },
    { name: 'Occupational Therapy', nameAr: 'العلاج الوظيفي', code: 'DEPT002' },
    { name: 'Speech Therapy', nameAr: 'التخاطب', code: 'DEPT003' },
    { name: 'Psychology', nameAr: 'علم النفس', code: 'DEPT004' },
    { name: 'Special Education', nameAr: 'التربية الخاصة', code: 'DEPT005' },
    { name: 'Social Services', nameAr: 'الخدمات الاجتماعية', code: 'DEPT006' },
  ],

  disabilityTypes: [
    {
      name: 'Autism Spectrum Disorder',
      nameAr: 'اضطراب طيف التوحد',
      code: 'DT001',
      category: 'Developmental',
      categoryAr: 'نمائي',
      requiresSpecialCare: true,
    },
    {
      name: 'Cerebral Palsy',
      nameAr: 'الشلل الدماغي',
      code: 'DT002',
      category: 'Physical',
      categoryAr: 'جسدي',
      requiresSpecialCare: true,
    },
    {
      name: 'Down Syndrome',
      nameAr: 'متلازمة داون',
      code: 'DT003',
      category: 'Genetic',
      categoryAr: 'وراثي',
      requiresSpecialCare: true,
    },
    {
      name: 'Hearing Impairment',
      nameAr: 'إعاقة سمعية',
      code: 'DT004',
      category: 'Sensory',
      categoryAr: 'حسي',
    },
    {
      name: 'Visual Impairment',
      nameAr: 'إعاقة بصرية',
      code: 'DT005',
      category: 'Sensory',
      categoryAr: 'حسي',
    },
    {
      name: 'Intellectual Disability',
      nameAr: 'إعاقة ذهنية',
      code: 'DT006',
      category: 'Cognitive',
      categoryAr: 'معرفي',
    },
    {
      name: 'Learning Disability',
      nameAr: 'صعوبات التعلم',
      code: 'DT007',
      category: 'Cognitive',
      categoryAr: 'معرفي',
    },
    {
      name: 'ADHD',
      nameAr: 'اضطراب فرط الحركة',
      code: 'DT008',
      category: 'Behavioral',
      categoryAr: 'سلوكي',
    },
  ],

  services: [
    {
      name: 'Physical Therapy Session',
      nameAr: 'جلسة علاج طبيعي',
      code: 'SRV001',
      duration: 45,
      price: 200,
      category: 'Therapy',
    },
    {
      name: 'Occupational Therapy Session',
      nameAr: 'جلسة علاج وظيفي',
      code: 'SRV002',
      duration: 60,
      price: 250,
      category: 'Therapy',
    },
    {
      name: 'Speech Therapy Session',
      nameAr: 'جلسة تخاطب',
      code: 'SRV003',
      duration: 45,
      price: 200,
      category: 'Therapy',
    },
    {
      name: 'Psychological Assessment',
      nameAr: 'تقييم نفسي',
      code: 'SRV004',
      duration: 90,
      price: 500,
      category: 'Assessment',
      requiresApproval: true,
    },
    {
      name: 'Behavioral Therapy',
      nameAr: 'علاج سلوكي',
      code: 'SRV005',
      duration: 60,
      price: 300,
      category: 'Therapy',
    },
    {
      name: 'Group Therapy Session',
      nameAr: 'جلسة علاج جماعي',
      code: 'SRV006',
      duration: 90,
      price: 100,
      maxParticipants: 8,
    },
    {
      name: 'Family Counseling',
      nameAr: 'إرشاد أسري',
      code: 'SRV007',
      duration: 60,
      price: 300,
      category: 'Counseling',
    },
    {
      name: 'Educational Assessment',
      nameAr: 'تقييم تربوي',
      code: 'SRV008',
      duration: 120,
      price: 600,
      category: 'Assessment',
      requiresApproval: true,
    },
    {
      name: 'Hydrotherapy',
      nameAr: 'علاج مائي',
      code: 'SRV009',
      duration: 45,
      price: 350,
      category: 'Therapy',
    },
    {
      name: 'Sensory Integration',
      nameAr: 'التكامل الحسي',
      code: 'SRV010',
      duration: 60,
      price: 280,
      category: 'Therapy',
    },
  ],

  users: [
    {
      username: 'admin',
      email: 'admin@alawael.sa',
      password: 'Admin@123',
      fullName: 'System Administrator',
      fullNameAr: 'مدير النظام',
      role: 'admin',
      nationalId: '1000000001',
    },
    {
      username: 'manager1',
      email: 'manager1@alawael.sa',
      password: 'Manager@123',
      fullName: 'Branch Manager',
      fullNameAr: 'مدير الفرع',
      role: 'manager',
      nationalId: '1000000002',
    },
    {
      username: 'therapist1',
      email: 'therapist1@alawael.sa',
      password: 'Therapist@123',
      fullName: 'Ahmed Mohammed',
      fullNameAr: 'أحمد محمد',
      role: 'employee',
      nationalId: '1000000003',
    },
    {
      username: 'therapist2',
      email: 'therapist2@alawael.sa',
      password: 'Therapist@123',
      fullName: 'Sara Ali',
      fullNameAr: 'سارة علي',
      role: 'employee',
      nationalId: '1000000004',
    },
    {
      username: 'receptionist',
      email: 'receptionist@alawael.sa',
      password: 'Reception@123',
      fullName: 'Reception Staff',
      fullNameAr: 'موظف استقبال',
      role: 'employee',
      nationalId: '1000000005',
    },
  ],
};

// دالة البذر الرئيسية
async function seedDatabase() {
  try {
    console.log('🌱 بدء زرع البيانات التجريبية...');

    // 1. إنشاء الفروع
    console.log('📍 إنشاء الفروع...');
    const branches = await Branch.insertMany(seedData.branches);
    console.log(`   ✅ تم إنشاء ${branches.length} فروع`);

    // 2. إنشاء الأقسام
    console.log('🏢 إنشاء الأقسام...');
    const departments = await Department.insertMany(
      seedData.departments.map((dept, i) => ({
        ...dept,
        branch: branches[0]._id,
      }))
    );
    console.log(`   ✅ تم إنشاء ${departments.length} أقسام`);

    // 3. إنشاء أنواع الإعاقات
    console.log('♿ إنشاء أنواع الإعاقات...');
    const disabilityTypes = await DisabilityType.insertMany(seedData.disabilityTypes);
    console.log(`   ✅ تم إنشاء ${disabilityTypes.length} أنواع إعاقات`);

    // 4. إنشاء الخدمات
    console.log('🛠️ إنشاء الخدمات...');
    const services = await Service.insertMany(seedData.services);
    console.log(`   ✅ تم إنشاء ${services.length} خدمات`);

    // 5. إنشاء المستخدمين
    console.log('👥 إنشاء المستخدمين...');
    const hashedPasswords = await Promise.all(seedData.users.map(u => bcrypt.hash(u.password, 10)));

    const users = await User.insertMany(
      seedData.users.map((user, i) => ({
        ...user,
        password: hashedPasswords[i],
        branch: branches[0]._id,
        department: departments[0]._id,
        preferences: { language: 'ar', theme: 'light', notifications: true },
      }))
    );
    console.log(`   ✅ تم إنشاء ${users.length} مستخدمين`);

    // 6. إنشاء المستفيدين
    console.log('🧑‍🤝‍🧑 إنشاء المستفيدين...');
    const beneficiariesData = [];
    for (let i = 1; i <= 50; i++) {
      beneficiariesData.push({
        nationalId: `20${String(i).padStart(9, '0')}`,
        firstName: 'Beneficiary',
        firstNameAr: 'مستفيد',
        lastName: `${i}`,
        lastNameAr: `${i}`,
        dateOfBirth: new Date(
          2010 + Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ),
        gender: Math.random() > 0.5 ? 'male' : 'female',
        phone: `05${Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, '0')}`,
        city: 'Riyadh',
        cityAr: 'الرياض',
        disabilityType: disabilityTypes[Math.floor(Math.random() * disabilityTypes.length)]._id,
        disabilityPercentage: Math.floor(Math.random() * 60) + 20,
        branch: branches[Math.floor(Math.random() * branches.length)]._id,
        status: ['active', 'waiting', 'active', 'active', 'graduated'][
          Math.floor(Math.random() * 5)
        ],
        guardian: {
          name: `Guardian ${i}`,
          nameAr: `ولي الأمر ${i}`,
          relationship: ['father', 'mother', 'brother', 'uncle'][Math.floor(Math.random() * 4)],
          relationshipAr: ['الأب', 'الأم', 'الأخ', 'العم'][Math.floor(Math.random() * 4)],
          phone: `05${Math.floor(Math.random() * 100000000)
            .toString()
            .padStart(8, '0')}`,
        },
      });
    }
    const beneficiaries = await Beneficiary.insertMany(beneficiariesData);
    console.log(`   ✅ تم إنشاء ${beneficiaries.length} مستفيد`);

    // 7. إنشاء جلسات
    console.log('📅 إنشاء الجلسات...');
    const sessionsData = [];
    const today = new Date();

    for (let i = 0; i < 100; i++) {
      const sessionDate = new Date(today);
      sessionDate.setDate(today.getDate() + Math.floor(Math.random() * 30) - 10);

      sessionsData.push({
        beneficiary: beneficiaries[Math.floor(Math.random() * beneficiaries.length)]._id,
        service: services[Math.floor(Math.random() * services.length)]._id,
        therapist: users[Math.floor(Math.random() * 3) + 2]._id,
        branch: branches[Math.floor(Math.random() * branches.length)]._id,
        date: sessionDate,
        startTime: `${8 + Math.floor(Math.random() * 8)}:00`,
        endTime: `${9 + Math.floor(Math.random() * 8)}:00`,
        status: ['scheduled', 'completed', 'cancelled', 'no-show'][Math.floor(Math.random() * 4)],
      });
    }
    const sessions = await Session.insertMany(sessionsData);
    console.log(`   ✅ تم إنشاء ${sessions.length} جلسة`);

    // 8. إنشاء مركبات
    console.log('🚐 إنشاء المركبات...');
    const vehiclesData = [
      {
        plateNumber: 'ABC 1234',
        type: 'bus',
        brand: 'Mercedes',
        model: 'Sprinter',
        year: 2022,
        capacity: 20,
        branch: branches[0]._id,
      },
      {
        plateNumber: 'DEF 5678',
        type: 'van',
        brand: 'Toyota',
        model: 'Hiace',
        year: 2021,
        capacity: 15,
        branch: branches[0]._id,
      },
      {
        plateNumber: 'GHI 9012',
        type: 'car',
        brand: 'Honda',
        model: 'Accord',
        year: 2023,
        capacity: 4,
        branch: branches[1]._id,
      },
      {
        plateNumber: 'JKL 3456',
        type: 'bus',
        brand: 'Mercedes',
        model: 'Sprinter',
        year: 2020,
        capacity: 20,
        branch: branches[1]._id,
      },
      {
        plateNumber: 'MNO 7890',
        type: 'ambulance',
        brand: 'Ford',
        model: 'Transit',
        year: 2022,
        capacity: 8,
        branch: branches[0]._id,
      },
    ];
    const vehicles = await Vehicle.insertMany(vehiclesData);
    console.log(`   ✅ تم إنشاء ${vehicles.length} مركبات`);

    console.log('\n✨ تم زرع البيانات التجريبية بنجاح!\n');

    return {
      branches: branches.length,
      departments: departments.length,
      disabilityTypes: disabilityTypes.length,
      services: services.length,
      users: users.length,
      beneficiaries: beneficiaries.length,
      sessions: sessions.length,
      vehicles: vehicles.length,
    };
  } catch (error) {
    console.error('❌ خطأ في زرع البيانات:', error);
    throw error;
  }
}

// دالة مسح البيانات
async function clearDatabase() {
  console.log('🗑️ مسح البيانات...');

  const models = [User, Branch, Department, DisabilityType, Beneficiary, Service, Session, Vehicle];

  for (const model of models) {
    await model.deleteMany({});
  }

  console.log('✅ تم مسح جميع البيانات');
}

// تصدير الدوال
module.exports = {
  seedDatabase,
  clearDatabase,
  models: { User, Branch, Department, DisabilityType, Beneficiary, Service, Session, Vehicle },
};

// تشغيل البذر إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael')
    .then(() => seedDatabase())
    .then(() => mongoose.disconnect())
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
