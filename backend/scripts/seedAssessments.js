/**
 * Seed Script: Disability Assessment Data
 * بيانات أولية لنظام المقاييس والاختبارات لذوي الإعاقة
 *
 * Usage:
 *   node backend/scripts/seedAssessments.js
 *   node backend/scripts/seedAssessments.js --drop   (drop existing first)
 *
 * Seeds:
 *  - 6 Beneficiaries
 *  - 8 Scale assessment results
 *  - 6 Test assessment results
 */

const path = require('path');
const mongoose = require('mongoose');

/* ── Load env ── */
const envPath = path.join(__dirname, '..', '.env');
try {
  require('dotenv').config({ path: envPath });
} catch {
  console.log('⚠ dotenv not available — using process.env directly');
}

const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/alawael_erp';

/* ─────────────────────── Beneficiary Seed Data ─────────────────────── */

const beneficiaries = [
  {
    name: 'أحمد محمد علي',
    mrn: 'BEN001',
    dob: new Date('2012-03-15'),
    status: 'ACTIVE',
  },
  {
    name: 'فاطمة أحمد حسن',
    mrn: 'BEN002',
    dob: new Date('2016-07-22'),
    status: 'ACTIVE',
  },
  {
    name: 'خالد سعيد محمود',
    mrn: 'BEN003',
    dob: new Date('2009-11-08'),
    status: 'ACTIVE',
  },
  {
    name: 'نورة عبدالله',
    mrn: 'BEN004',
    dob: new Date('2014-01-30'),
    status: 'ACTIVE',
  },
  {
    name: 'يوسف إبراهيم',
    mrn: 'BEN005',
    dob: new Date('2018-09-12'),
    status: 'ACTIVE',
  },
  {
    name: 'لمى سلطان',
    mrn: 'BEN006',
    dob: new Date('2020-04-05'),
    status: 'ACTIVE',
  },
];

/* ─────────────────────── Scale Results Seed Data ─────────────────────── */

const scaleResults = [
  {
    beneficiary_id: 'BEN001',
    beneficiary_name: 'أحمد محمد علي',
    date_of_birth: new Date('2012-03-15'),
    gender: 'male',
    type: 'scale',
    disability_profile: {
      type: 'physical',
      severity: 'moderate',
      onset_type: 'congenital',
    },
    assessment_details: {
      assessment_date: new Date('2026-02-15'),
      assessor_name: 'د. سارة أحمد',
      icf_body_functions: {
        mental: 75,
        sensory: 80,
        voice_and_speech: 85,
        cardiovascular: 90,
        respiratory: 90,
        digestive: 95,
        neuro_muscular: 45,
        movement: 40,
      },
    },
    functional_abilities: {
      mobility: { score: 45, level: 'moderate_difficulty' },
      self_care: { score: 65, level: 'mild_difficulty' },
      communication: { score: 80, level: 'no_difficulty' },
      cognitive: { score: 75, level: 'no_difficulty' },
      social_emotional: { score: 70, level: 'mild_difficulty' },
    },
    scales: {
      who_disability_assessment: {
        score: 58,
        domain: 'motorFunction',
        completed_date: new Date('2026-02-15'),
      },
      barthel_index: {
        score: 65,
        interpretation: 'moderate_dependence',
        completed_date: new Date('2026-02-15'),
      },
    },
    rehabilitation_readiness: {
      motivation_score: 80,
      cognitive_capacity: 75,
      physical_capacity: 50,
      family_support: 85,
      resource_availability: 70,
      overall_readiness: 'high',
    },
    recommendations: [
      {
        recommendation: 'برنامج العلاج الطبيعي المكثف',
        priority: 'immediate',
        responsible_party: 'د. سارة أحمد',
        status: 'in_progress',
      },
    ],
    assessment_status: 'completed',
    created_by: 'system-seed',
    notes: 'تقييم أولي — بيانات مبدئية',
  },
  {
    beneficiary_id: 'BEN002',
    beneficiary_name: 'فاطمة أحمد حسن',
    date_of_birth: new Date('2016-07-22'),
    gender: 'female',
    type: 'scale',
    disability_profile: {
      type: 'intellectual',
      severity: 'mild',
      onset_type: 'developmental',
    },
    assessment_details: {
      assessment_date: new Date('2026-02-14'),
      assessor_name: 'أ. نورة خالد',
      icf_body_functions: {
        mental: 55,
        sensory: 85,
        voice_and_speech: 70,
        cardiovascular: 95,
        respiratory: 95,
        digestive: 95,
        neuro_muscular: 80,
        movement: 85,
      },
    },
    functional_abilities: {
      mobility: { score: 85, level: 'no_difficulty' },
      self_care: { score: 60, level: 'mild_difficulty' },
      communication: { score: 55, level: 'moderate_difficulty' },
      cognitive: { score: 45, level: 'moderate_difficulty' },
      social_emotional: { score: 50, level: 'moderate_difficulty' },
    },
    scales: {
      who_disability_assessment: {
        score: 42,
        domain: 'cognitiveFunction',
        completed_date: new Date('2026-02-14'),
      },
      barthel_index: {
        score: 80,
        interpretation: 'mild_dependence',
        completed_date: new Date('2026-02-14'),
      },
    },
    rehabilitation_readiness: {
      motivation_score: 65,
      cognitive_capacity: 50,
      physical_capacity: 85,
      family_support: 90,
      resource_availability: 75,
      overall_readiness: 'moderate',
    },
    assessment_status: 'completed',
    created_by: 'system-seed',
  },
  {
    beneficiary_id: 'BEN003',
    beneficiary_name: 'خالد سعيد محمود',
    date_of_birth: new Date('2009-11-08'),
    gender: 'male',
    type: 'scale',
    disability_profile: {
      type: 'hearing',
      severity: 'severe',
      onset_type: 'acquired',
    },
    assessment_details: {
      assessment_date: new Date('2026-02-10'),
      assessor_name: 'د. محمد صالح',
      icf_body_functions: {
        mental: 85,
        sensory: 25,
        voice_and_speech: 40,
        cardiovascular: 95,
        respiratory: 95,
        digestive: 95,
        neuro_muscular: 90,
        movement: 90,
      },
    },
    functional_abilities: {
      mobility: { score: 90, level: 'no_difficulty' },
      self_care: { score: 85, level: 'no_difficulty' },
      communication: { score: 30, level: 'severe_difficulty' },
      cognitive: { score: 80, level: 'no_difficulty' },
      social_emotional: { score: 55, level: 'moderate_difficulty' },
    },
    scales: {
      who_disability_assessment: {
        score: 35,
        domain: 'sensoryProfile',
        completed_date: new Date('2026-02-10'),
      },
      barthel_index: {
        score: 90,
        interpretation: 'independent',
        completed_date: new Date('2026-02-10'),
      },
    },
    rehabilitation_readiness: {
      motivation_score: 90,
      cognitive_capacity: 80,
      physical_capacity: 90,
      family_support: 70,
      resource_availability: 60,
      overall_readiness: 'high',
    },
    assessment_status: 'completed',
    created_by: 'system-seed',
  },
  {
    beneficiary_id: 'BEN004',
    beneficiary_name: 'نورة عبدالله',
    date_of_birth: new Date('2014-01-30'),
    gender: 'female',
    type: 'scale',
    disability_profile: {
      type: 'autism',
      severity: 'moderate',
      onset_type: 'developmental',
    },
    assessment_details: {
      assessment_date: new Date('2026-02-12'),
      assessor_name: 'د. سارة أحمد',
      icf_body_functions: {
        mental: 50,
        sensory: 40,
        voice_and_speech: 45,
        cardiovascular: 95,
        respiratory: 95,
        digestive: 90,
        neuro_muscular: 75,
        movement: 70,
      },
    },
    functional_abilities: {
      mobility: { score: 75, level: 'mild_difficulty' },
      self_care: { score: 50, level: 'moderate_difficulty' },
      communication: { score: 35, level: 'severe_difficulty' },
      cognitive: { score: 55, level: 'moderate_difficulty' },
      social_emotional: { score: 30, level: 'severe_difficulty' },
    },
    scales: {
      who_disability_assessment: {
        score: 45,
        domain: 'dailyLiving',
        completed_date: new Date('2026-02-12'),
      },
      barthel_index: {
        score: 55,
        interpretation: 'moderate_dependence',
        completed_date: new Date('2026-02-12'),
      },
      quality_of_life_score: {
        physical: 60,
        psychological: 40,
        social: 30,
        environmental: 65,
        total: 48.75,
        completed_date: new Date('2026-02-12'),
      },
    },
    rehabilitation_readiness: {
      motivation_score: 55,
      cognitive_capacity: 55,
      physical_capacity: 75,
      family_support: 95,
      resource_availability: 80,
      overall_readiness: 'moderate',
    },
    assessment_status: 'completed',
    created_by: 'system-seed',
  },
  {
    beneficiary_id: 'BEN005',
    beneficiary_name: 'يوسف إبراهيم',
    date_of_birth: new Date('2018-09-12'),
    gender: 'male',
    type: 'scale',
    disability_profile: {
      type: 'developmental',
      severity: 'mild',
      onset_type: 'developmental',
    },
    assessment_details: {
      assessment_date: new Date('2026-02-18'),
      assessor_name: 'أ. هند العتيبي',
      icf_body_functions: {
        mental: 60,
        sensory: 70,
        voice_and_speech: 55,
        cardiovascular: 95,
        respiratory: 95,
        digestive: 95,
        neuro_muscular: 65,
        movement: 60,
      },
    },
    functional_abilities: {
      mobility: { score: 60, level: 'mild_difficulty' },
      self_care: { score: 45, level: 'moderate_difficulty' },
      communication: { score: 50, level: 'moderate_difficulty' },
      cognitive: { score: 55, level: 'moderate_difficulty' },
      social_emotional: { score: 65, level: 'mild_difficulty' },
    },
    scales: {
      who_disability_assessment: {
        score: 52,
        domain: 'developmentalIntegration',
        completed_date: new Date('2026-02-18'),
      },
      barthel_index: {
        score: 60,
        interpretation: 'moderate_dependence',
        completed_date: new Date('2026-02-18'),
      },
    },
    rehabilitation_readiness: {
      motivation_score: 70,
      cognitive_capacity: 60,
      physical_capacity: 65,
      family_support: 85,
      resource_availability: 75,
      overall_readiness: 'moderate',
    },
    assessment_status: 'active',
    created_by: 'system-seed',
  },
  {
    beneficiary_id: 'BEN006',
    beneficiary_name: 'لمى سلطان',
    date_of_birth: new Date('2020-04-05'),
    gender: 'female',
    type: 'scale',
    disability_profile: {
      type: 'intellectual',
      severity: 'moderate',
      onset_type: 'congenital',
    },
    assessment_details: {
      assessment_date: new Date('2026-02-20'),
      assessor_name: 'أ. نورة خالد',
      icf_body_functions: {
        mental: 40,
        sensory: 75,
        voice_and_speech: 50,
        cardiovascular: 95,
        respiratory: 95,
        digestive: 95,
        neuro_muscular: 70,
        movement: 75,
      },
    },
    functional_abilities: {
      mobility: { score: 70, level: 'mild_difficulty' },
      self_care: { score: 35, level: 'severe_difficulty' },
      communication: { score: 40, level: 'moderate_difficulty' },
      cognitive: { score: 35, level: 'severe_difficulty' },
      social_emotional: { score: 45, level: 'moderate_difficulty' },
    },
    scales: {
      who_disability_assessment: {
        score: 38,
        domain: 'cognitiveSkills',
        completed_date: new Date('2026-02-20'),
      },
      barthel_index: {
        score: 45,
        interpretation: 'moderate_dependence',
        completed_date: new Date('2026-02-20'),
      },
    },
    rehabilitation_readiness: {
      motivation_score: 50,
      cognitive_capacity: 40,
      physical_capacity: 70,
      family_support: 90,
      resource_availability: 65,
      overall_readiness: 'low',
    },
    assessment_status: 'active',
    created_by: 'system-seed',
  },
  // Two additional scale results for existing beneficiaries (follow-up assessments)
  {
    beneficiary_id: 'BEN001',
    beneficiary_name: 'أحمد محمد علي',
    date_of_birth: new Date('2012-03-15'),
    gender: 'male',
    type: 'scale',
    disability_profile: {
      type: 'physical',
      severity: 'moderate',
      onset_type: 'congenital',
    },
    assessment_details: {
      assessment_date: new Date('2026-01-10'),
      assessor_name: 'د. سارة أحمد',
      icf_body_functions: {
        mental: 70,
        sensory: 78,
        voice_and_speech: 82,
        cardiovascular: 88,
        respiratory: 88,
        digestive: 93,
        neuro_muscular: 38,
        movement: 35,
      },
    },
    functional_abilities: {
      mobility: { score: 38, level: 'moderate_difficulty' },
      self_care: { score: 58, level: 'moderate_difficulty' },
      communication: { score: 78, level: 'no_difficulty' },
      cognitive: { score: 72, level: 'mild_difficulty' },
      social_emotional: { score: 65, level: 'mild_difficulty' },
    },
    scales: {
      who_disability_assessment: {
        score: 50,
        domain: 'motorFunction',
        completed_date: new Date('2026-01-10'),
      },
      barthel_index: {
        score: 58,
        interpretation: 'moderate_dependence',
        completed_date: new Date('2026-01-10'),
      },
    },
    assessment_status: 'completed',
    created_by: 'system-seed',
    notes: 'تقييم سابق — قبل العلاج الطبيعي',
  },
  {
    beneficiary_id: 'BEN004',
    beneficiary_name: 'نورة عبدالله',
    date_of_birth: new Date('2014-01-30'),
    gender: 'female',
    type: 'scale',
    disability_profile: {
      type: 'autism',
      severity: 'moderate',
      onset_type: 'developmental',
    },
    assessment_details: {
      assessment_date: new Date('2026-01-05'),
      assessor_name: 'د. سارة أحمد',
      icf_body_functions: {
        mental: 45,
        sensory: 35,
        voice_and_speech: 40,
        cardiovascular: 95,
        respiratory: 95,
        digestive: 90,
        neuro_muscular: 72,
        movement: 68,
      },
    },
    scales: {
      who_disability_assessment: {
        score: 40,
        domain: 'dailyLiving',
        completed_date: new Date('2026-01-05'),
      },
      barthel_index: {
        score: 50,
        interpretation: 'moderate_dependence',
        completed_date: new Date('2026-01-05'),
      },
    },
    assessment_status: 'completed',
    created_by: 'system-seed',
    notes: 'تقييم متابعة — قبل التأهيل السلوكي',
  },
];

/* ─────────────────────── Test Results Seed Data ─────────────────────── */

const testResults = [
  {
    beneficiary_id: 'BEN001',
    beneficiary_name: 'أحمد محمد علي',
    date_of_birth: new Date('2012-03-15'),
    gender: 'male',
    type: 'test',
    disability_profile: {
      type: 'physical',
      severity: 'moderate',
    },
    assessment_details: {
      assessment_date: new Date('2026-02-16'),
      assessor_name: 'د. سارة أحمد',
      icf_body_functions: {
        mental: 75,
        sensory: 80,
        voice_and_speech: 85,
        neuro_muscular: 45,
        movement: 40,
      },
    },
    scales: {
      who_disability_assessment: {
        score: 62,
        domain: 'behaviorAssessment',
        completed_date: new Date('2026-02-16'),
      },
    },
    assessment_status: 'completed',
    created_by: 'system-seed',
  },
  {
    beneficiary_id: 'BEN002',
    beneficiary_name: 'فاطمة أحمد حسن',
    date_of_birth: new Date('2016-07-22'),
    gender: 'female',
    type: 'test',
    disability_profile: {
      type: 'intellectual',
      severity: 'mild',
    },
    assessment_details: {
      assessment_date: new Date('2026-02-14'),
      assessor_name: 'أ. نورة خالد',
      icf_body_functions: {
        mental: 55,
        sensory: 85,
        voice_and_speech: 70,
      },
    },
    scales: {
      who_disability_assessment: {
        score: 48,
        domain: 'socialSkills',
        completed_date: new Date('2026-02-14'),
      },
    },
    assessment_status: 'completed',
    created_by: 'system-seed',
  },
  {
    beneficiary_id: 'BEN003',
    beneficiary_name: 'خالد سعيد محمود',
    date_of_birth: new Date('2009-11-08'),
    gender: 'male',
    type: 'test',
    disability_profile: {
      type: 'hearing',
      severity: 'severe',
    },
    assessment_details: {
      assessment_date: new Date('2026-02-11'),
      assessor_name: 'د. محمد صالح',
    },
    scales: {
      who_disability_assessment: {
        score: 55,
        domain: 'languageSkills',
        completed_date: new Date('2026-02-11'),
      },
    },
    assessment_status: 'completed',
    created_by: 'system-seed',
  },
  {
    beneficiary_id: 'BEN004',
    beneficiary_name: 'نورة عبدالله',
    date_of_birth: new Date('2014-01-30'),
    gender: 'female',
    type: 'test',
    disability_profile: {
      type: 'autism',
      severity: 'moderate',
    },
    assessment_details: {
      assessment_date: new Date('2026-02-13'),
      assessor_name: 'د. سارة أحمد',
    },
    scales: {
      who_disability_assessment: {
        score: 38,
        domain: 'sensoryIntegration',
        completed_date: new Date('2026-02-13'),
      },
    },
    assessment_status: 'completed',
    created_by: 'system-seed',
  },
  {
    beneficiary_id: 'BEN005',
    beneficiary_name: 'يوسف إبراهيم',
    date_of_birth: new Date('2018-09-12'),
    gender: 'male',
    type: 'test',
    disability_profile: {
      type: 'developmental',
      severity: 'mild',
    },
    assessment_details: {
      assessment_date: new Date('2026-02-19'),
      assessor_name: 'أ. هند العتيبي',
    },
    scales: {
      who_disability_assessment: {
        score: 50,
        domain: 'languageSkills',
        completed_date: new Date('2026-02-19'),
      },
    },
    assessment_status: 'active',
    created_by: 'system-seed',
  },
  {
    beneficiary_id: 'BEN006',
    beneficiary_name: 'لمى سلطان',
    date_of_birth: new Date('2020-04-05'),
    gender: 'female',
    type: 'test',
    disability_profile: {
      type: 'intellectual',
      severity: 'moderate',
    },
    assessment_details: {
      assessment_date: new Date('2026-02-21'),
      assessor_name: 'أ. نورة خالد',
    },
    scales: {
      who_disability_assessment: {
        score: 42,
        domain: 'sensoryIntegration',
        completed_date: new Date('2026-02-21'),
      },
    },
    assessment_status: 'active',
    created_by: 'system-seed',
  },
];

/* ─────────────────────── Main ─────────────────────── */

async function seed() {
  const dropFirst = process.argv.includes('--drop');
  console.log('\n🌱 Seeding Disability Assessment Data...\n');
  console.log(`   MongoDB: ${MONGO_URI}`);
  console.log(`   Drop existing: ${dropFirst ? 'YES' : 'NO'}\n`);

  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  /* ── Beneficiaries ── */
  const Beneficiary = mongoose.models.Beneficiary || require('../models/Beneficiary');

  if (dropFirst) {
    const delBen = await Beneficiary.deleteMany({ mrn: { $in: beneficiaries.map(b => b.mrn) } });
    console.log(`🗑  Deleted ${delBen.deletedCount} old seed beneficiaries`);
  }

  let insertedBen = 0;
  for (const b of beneficiaries) {
    const exists = await Beneficiary.findOne({ mrn: b.mrn });
    if (!exists) {
      await Beneficiary.create(b);
      insertedBen++;
    }
  }
  console.log(
    `👤 Beneficiaries: ${insertedBen} inserted, ${beneficiaries.length - insertedBen} already existed`
  );

  /* ── Disability Assessments (scales + tests) ── */
  const DisabilityAssessment =
    mongoose.models.DisabilityAssessment || require('../models/disability-assessment.model');

  const allAssessments = [...scaleResults, ...testResults];

  if (dropFirst) {
    const delA = await DisabilityAssessment.deleteMany({ created_by: 'system-seed' });
    console.log(`🗑  Deleted ${delA.deletedCount} old seed assessments`);
  }

  // Check how many already exist
  const existingCount = await DisabilityAssessment.countDocuments({ created_by: 'system-seed' });
  if (existingCount > 0 && !dropFirst) {
    console.log(
      `📊 ${existingCount} seed assessments already exist — skipping (use --drop to replace)`
    );
  } else {
    const inserted = await DisabilityAssessment.insertMany(allAssessments, { ordered: false });
    console.log(
      `📊 Assessment records: ${inserted.length} inserted (${scaleResults.length} scales + ${testResults.length} tests)`
    );
  }

  /* ── Summary ── */
  const totalBen = await Beneficiary.countDocuments({ status: 'ACTIVE' });
  const totalAssessments = await DisabilityAssessment.countDocuments();
  const totalScales = await DisabilityAssessment.countDocuments({ type: 'scale' });
  const totalTests = await DisabilityAssessment.countDocuments({ type: 'test' });

  console.log('\n─── Database Summary ───');
  console.log(`   Active Beneficiaries : ${totalBen}`);
  console.log(`   Total Assessments    : ${totalAssessments}`);
  console.log(`     ├── Scale Results   : ${totalScales}`);
  console.log(`     └── Test Results    : ${totalTests}`);
  console.log('────────────────────────\n');

  await mongoose.disconnect();
  console.log('✅ Seed complete — disconnected\n');
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
