/**
 * Disability Types Seed
 * أنواع الإعاقة وفق التصنيف الدولي ICF و ICD-11
 * International Classification of Functioning (ICF) compliant
 */

'use strict';

const disabilityTypes = [
  // ─── الإعاقة الجسدية والحركية ─────────────────────────────
  {
    code: 'PHYSICAL',
    name: { ar: 'الإعاقة الجسدية والحركية', en: 'Physical & Motor Disability' },
    category: 'physical',
    icfCode: 'b7',
    description: {
      ar: 'إعاقات تؤثر على القدرة الحركية والجسدية',
      en: 'Disabilities affecting physical and motor function',
    },
    isActive: true,
    order: 1,
    subtypes: [
      { code: 'CP', name: { ar: 'شلل دماغي', en: 'Cerebral Palsy' } },
      { code: 'SCI', name: { ar: 'إصابة نخاع شوكي', en: 'Spinal Cord Injury' } },
      { code: 'AMPUT', name: { ar: 'بتر الأطراف', en: 'Limb Amputation' } },
      { code: 'MUSCU', name: { ar: 'ضمور عضلي', en: 'Muscular Dystrophy' } },
      { code: 'HEMI', name: { ar: 'شلل نصفي', en: 'Hemiplegia' } },
      { code: 'PARA', name: { ar: 'شلل سفلي', en: 'Paraplegia' } },
      { code: 'QUAD', name: { ar: 'شلل رباعي', en: 'Quadriplegia' } },
    ],
  },
  // ─── الإعاقة البصرية ────────────────────────────────────
  {
    code: 'VISUAL',
    name: { ar: 'الإعاقة البصرية', en: 'Visual Impairment' },
    category: 'sensory',
    icfCode: 'b210',
    description: { ar: 'فقدان أو ضعف القدرة البصرية', en: 'Loss or impairment of visual function' },
    isActive: true,
    order: 2,
    subtypes: [
      { code: 'BLIND', name: { ar: 'عمى كلي', en: 'Total Blindness' } },
      { code: 'LOW_VIS', name: { ar: 'ضعف بصر', en: 'Low Vision' } },
      { code: 'COLOR_BL', name: { ar: 'عمى الألوان', en: 'Color Blindness' } },
    ],
  },
  // ─── الإعاقة السمعية ────────────────────────────────────
  {
    code: 'HEARING',
    name: { ar: 'الإعاقة السمعية', en: 'Hearing Impairment' },
    category: 'sensory',
    icfCode: 'b230',
    description: {
      ar: 'فقدان أو ضعف القدرة السمعية',
      en: 'Loss or impairment of hearing function',
    },
    isActive: true,
    order: 3,
    subtypes: [
      { code: 'DEAF', name: { ar: 'صمم كلي', en: 'Total Deafness' } },
      { code: 'HARD_H', name: { ar: 'ضعف سمع', en: 'Hard of Hearing' } },
      { code: 'UNILAT', name: { ar: 'صمم من جانب واحد', en: 'Unilateral Hearing Loss' } },
    ],
  },
  // ─── إعاقة النطق واللغة ─────────────────────────────────
  {
    code: 'SPEECH',
    name: { ar: 'إعاقة النطق واللغة', en: 'Speech & Language Impairment' },
    category: 'communication',
    icfCode: 'b320',
    description: {
      ar: 'صعوبات في التواصل والنطق واللغة',
      en: 'Difficulties in communication, speech and language',
    },
    isActive: true,
    order: 4,
    subtypes: [
      { code: 'STUTTER', name: { ar: 'تأتأة', en: 'Stuttering' } },
      { code: 'APHASIA', name: { ar: 'حبسة كلامية', en: 'Aphasia' } },
      { code: 'DYSARTHRIA', name: { ar: 'عسر التلفظ', en: 'Dysarthria' } },
      { code: 'LANG_DELAY', name: { ar: 'تأخر لغوي', en: 'Language Delay' } },
      { code: 'SELECTIVE_MUTISM', name: { ar: 'صمت انتقائي', en: 'Selective Mutism' } },
    ],
  },
  // ─── الإعاقة الذهنية والتطورية ──────────────────────────
  {
    code: 'INTELLECTUAL',
    name: { ar: 'الإعاقة الذهنية', en: 'Intellectual Disability' },
    category: 'cognitive',
    icfCode: 'b117',
    icdCode: 'F7',
    description: {
      ar: 'قصور في القدرات الذهنية والمعرفية',
      en: 'Deficits in intellectual and cognitive abilities',
    },
    isActive: true,
    order: 5,
    subtypes: [
      {
        code: 'ID_MILD',
        name: { ar: 'إعاقة ذهنية بسيطة (IQ 50-70)', en: 'Mild Intellectual Disability' },
      },
      {
        code: 'ID_MOD',
        name: { ar: 'إعاقة ذهنية متوسطة (IQ 35-50)', en: 'Moderate Intellectual Disability' },
      },
      {
        code: 'ID_SEV',
        name: { ar: 'إعاقة ذهنية شديدة (IQ 20-35)', en: 'Severe Intellectual Disability' },
      },
      {
        code: 'ID_PROF',
        name: { ar: 'إعاقة ذهنية عميقة (IQ < 20)', en: 'Profound Intellectual Disability' },
      },
      { code: 'DS', name: { ar: 'متلازمة داون', en: 'Down Syndrome' } },
    ],
  },
  // ─── طيف التوحد ──────────────────────────────────────────
  {
    code: 'AUTISM',
    name: { ar: 'طيف التوحد', en: 'Autism Spectrum Disorder (ASD)' },
    category: 'developmental',
    icfCode: 'b122',
    icdCode: 'F84.0',
    description: {
      ar: 'اضطراب طيف التوحد بمستوياته المختلفة',
      en: 'Autism spectrum disorder across levels',
    },
    isActive: true,
    order: 6,
    subtypes: [
      {
        code: 'ASD_L1',
        name: { ar: 'توحد - المستوى الأول (خفيف)', en: 'ASD Level 1 - Requiring Support' },
      },
      {
        code: 'ASD_L2',
        name: {
          ar: 'توحد - المستوى الثاني (متوسط)',
          en: 'ASD Level 2 - Requiring Substantial Support',
        },
      },
      {
        code: 'ASD_L3',
        name: {
          ar: 'توحد - المستوى الثالث (شديد)',
          en: 'ASD Level 3 - Requiring Very Substantial Support',
        },
      },
    ],
  },
  // ─── اضطرابات التعلم ────────────────────────────────────
  {
    code: 'LEARNING',
    name: { ar: 'صعوبات التعلم', en: 'Learning Disabilities' },
    category: 'cognitive',
    icfCode: 'b163',
    icdCode: 'F81',
    description: {
      ar: 'صعوبات تعلم محددة تؤثر على اكتساب المهارات',
      en: 'Specific learning disabilities affecting skill acquisition',
    },
    isActive: true,
    order: 7,
    subtypes: [
      { code: 'DYSLEXIA', name: { ar: 'عسر القراءة (ديسلكسيا)', en: 'Dyslexia' } },
      { code: 'DYSCALC', name: { ar: 'عسر الحساب (ديسكالكوليا)', en: 'Dyscalculia' } },
      { code: 'DYSGRAPH', name: { ar: 'عسر الكتابة (ديسغرافيا)', en: 'Dysgraphia' } },
    ],
  },
  // ─── اضطراب نقص الانتباه ────────────────────────────────
  {
    code: 'ADHD',
    name: { ar: 'اضطراب نقص الانتباه وفرط الحركة', en: 'ADHD' },
    category: 'behavioral',
    icdCode: 'F90',
    description: {
      ar: 'نقص الانتباه مع أو بدون فرط الحركة',
      en: 'Attention deficit with or without hyperactivity',
    },
    isActive: true,
    order: 8,
    subtypes: [
      { code: 'ADHD_IN', name: { ar: 'نقص انتباه سائد', en: 'Predominantly Inattentive' } },
      { code: 'ADHD_HY', name: { ar: 'فرط حركة سائد', en: 'Predominantly Hyperactive-Impulsive' } },
      { code: 'ADHD_CO', name: { ar: 'نوع مشترك', en: 'Combined Type' } },
    ],
  },
  // ─── الاضطرابات النفسية والسلوكية ───────────────────────
  {
    code: 'MENTAL',
    name: { ar: 'الاضطرابات النفسية', en: 'Mental Health Disorders' },
    category: 'psychological',
    icdCode: 'F2-F4',
    description: {
      ar: 'اضطرابات نفسية تؤثر على الوظائف اليومية',
      en: 'Mental disorders affecting daily functioning',
    },
    isActive: true,
    order: 9,
    subtypes: [
      { code: 'ANXIETY', name: { ar: 'اضطراب قلق', en: 'Anxiety Disorder' } },
      { code: 'DEPRESSION', name: { ar: 'اكتئاب', en: 'Depression' } },
      { code: 'SCHIZO', name: { ar: 'فصام', en: 'Schizophrenia' } },
      { code: 'BIPOLAR', name: { ar: 'اضطراب ثنائي القطب', en: 'Bipolar Disorder' } },
      { code: 'OCD', name: { ar: 'وسواس قهري', en: 'OCD' } },
      { code: 'PTSD', name: { ar: 'اضطراب ما بعد الصدمة', en: 'PTSD' } },
    ],
  },
  // ─── الإعاقات المتعددة ───────────────────────────────────
  {
    code: 'MULTIPLE',
    name: { ar: 'إعاقات متعددة', en: 'Multiple Disabilities' },
    category: 'multiple',
    description: {
      ar: 'أكثر من نوع من أنواع الإعاقة في آنٍ واحد',
      en: 'Two or more disabilities occurring simultaneously',
    },
    isActive: true,
    order: 10,
    subtypes: [],
  },
  // ─── الأمراض النادرة والمزمنة ───────────────────────────
  {
    code: 'CHRONIC',
    name: { ar: 'أمراض مزمنة ونادرة', en: 'Chronic & Rare Diseases' },
    category: 'medical',
    description: {
      ar: 'حالات طبية مزمنة أو نادرة تستدعي التأهيل',
      en: 'Chronic or rare medical conditions requiring rehabilitation',
    },
    isActive: true,
    order: 11,
    subtypes: [
      { code: 'EPILEPSY', name: { ar: 'صرع', en: 'Epilepsy' } },
      { code: 'DIABETES', name: { ar: 'سكري', en: 'Diabetes' } },
      { code: 'GENETIC', name: { ar: 'أمراض وراثية', en: 'Genetic Disorders' } },
    ],
  },
  // ─── أخرى ────────────────────────────────────────────────
  {
    code: 'OTHER',
    name: { ar: 'أخرى', en: 'Other' },
    category: 'other',
    description: {
      ar: 'أنواع إعاقة أخرى لم تُذكر أعلاه',
      en: 'Other disability types not listed above',
    },
    isActive: true,
    order: 99,
    subtypes: [],
  },
];

async function seed(connection) {
  const db = connection.db || connection;
  const col = db.collection('disabilitytypes');

  let upserted = 0;
  let skipped = 0;

  for (const dt of disabilityTypes) {
    const result = await col.updateOne(
      { code: dt.code },
      {
        $setOnInsert: {
          ...dt,
          metadata: { isSystem: true },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
          name: dt.name,
          isActive: dt.isActive,
          subtypes: dt.subtypes,
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount > 0) upserted++;
    else skipped++;
  }

  console.log(`  ✔ disability-types: ${upserted} inserted, ${skipped} already existed`);
}

async function down(connection) {
  const db = connection.db || connection;
  const result = await db.collection('disabilitytypes').deleteMany({ 'metadata.isSystem': true });
  console.log(`  ✔ disability-types: removed ${result.deletedCount} system disability types`);
}

module.exports = { seed, down };
