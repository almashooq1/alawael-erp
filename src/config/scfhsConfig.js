/**
 * SCFHS Configuration
 * إعدادات هيئة التخصصات الصحية السعودية
 *
 * Comprehensive configuration for all health specialties and sub-specializations
 * registered with SCFHS
 */

export const SCFHS_CONFIG = {
  // ============================================
  // 🏥 General Information
  // ============================================
  organization: {
    nameAr: 'هيئة التخصصات الصحية السعودية',
    nameEn: 'Saudi Commission for Health Specialties (SCFHS)',
    website: 'https://www.scfhs.org.sa',
    email: 'info@scfhs.org.sa',
    phone: '+966-11-XXXXXXXXX',
    foundedYear: 1992,
    licensingAuthority: 'Ministry of Health',
  },

  // ============================================
  // 📋 License Types
  // ============================================
  licenseTypes: {
    medical_doctor: {
      id: 'medical_doctor',
      nameAr: 'ترخيص الطبيب',
      nameEn: 'Medical Doctor License',
      code: 'MD',
      validityYears: 3,
      requiresCPD: true,
      minCPDHours: 30,
      certificateRequired: true,
      examRequired: false,
    },
    specialist: {
      id: 'specialist',
      nameAr: 'ترخيص الطبيب المتخصص',
      nameEn: 'Specialist License',
      code: 'SP',
      validityYears: 5,
      requiresCPD: true,
      minCPDHours: 50,
      certificateRequired: true,
      examRequired: true,
    },
    consultant: {
      id: 'consultant',
      nameAr: 'ترخيص الاستشاري',
      nameEn: 'Consultant License',
      code: 'CS',
      validityYears: 5,
      requiresCPD: true,
      minCPDHours: 60,
      certificateRequired: true,
      examRequired: true,
    },
    nurse: {
      id: 'nurse',
      nameAr: 'ترخيص الممرضة/الممرض',
      nameEn: 'Nursing License',
      code: 'NU',
      validityYears: 2,
      requiresCPD: true,
      minCPDHours: 20,
      certificateRequired: true,
      examRequired: false,
    },
    pharmacist: {
      id: 'pharmacist',
      nameAr: 'ترخيص الصيدلي',
      nameEn: 'Pharmacist License',
      code: 'PH',
      validityYears: 3,
      requiresCPD: true,
      minCPDHours: 30,
      certificateRequired: true,
      examRequired: false,
    },
    dentist: {
      id: 'dentist',
      nameAr: 'ترخيص طبيب الأسنان',
      nameEn: 'Dental License',
      code: 'DT',
      validityYears: 3,
      requiresCPD: true,
      minCPDHours: 25,
      certificateRequired: true,
      examRequired: false,
    },
    allied_health: {
      id: 'allied_health',
      nameAr: 'ترخيص التخصصات الصحية المساندة',
      nameEn: 'Allied Health License',
      code: 'AH',
      validityYears: 2,
      requiresCPD: true,
      minCPDHours: 15,
      certificateRequired: true,
      examRequired: false,
    },
  },

  // ============================================
  // 🏨 Medical Specialties
  // ============================================
  specialties: {
    medical: {
      id: 'medical',
      nameAr: 'الطب الباطني والتخصصات الطبية',
      nameEn: 'Internal Medicine and Medical Specialties',
      category: 'Medicine',
      subSpecialties: [
        {
          id: 'general_medicine',
          nameAr: 'الطب العام',
          nameEn: 'General Medicine',
          code: 'GM',
          trainingYears: 3,
        },
        {
          id: 'family_medicine',
          nameAr: 'طب الأسرة',
          nameEn: 'Family Medicine',
          code: 'FM',
          trainingYears: 3,
        },
        {
          id: 'internal_medicine',
          nameAr: 'الطب الباطني',
          nameEn: 'Internal Medicine',
          code: 'IM',
          trainingYears: 4,
        },
        {
          id: 'cardiology',
          nameAr: 'أمراض القلب والأوعية الدموية',
          nameEn: 'Cardiology',
          code: 'CD',
          trainingYears: 5,
        },
        {
          id: 'gastroenterology',
          nameAr: 'أمراض الجهاز الهضمي',
          nameEn: 'Gastroenterology',
          code: 'GA',
          trainingYears: 5,
        },
        {
          id: 'respiratory',
          nameAr: 'أمراض الجهاز التنفسي',
          nameEn: 'Respiratory Medicine',
          code: 'RM',
          trainingYears: 5,
        },
        {
          id: 'rheumatology',
          nameAr: 'أمراض الروماتيزم',
          nameEn: 'Rheumatology',
          code: 'RH',
          trainingYears: 5,
        },
        {
          id: 'nephrology',
          nameAr: 'أمراض الكلى',
          nameEn: 'Nephrology',
          code: 'NP',
          trainingYears: 5,
        },
        {
          id: 'endocrinology',
          nameAr: 'الغدد الصماء والسكري',
          nameEn: 'Endocrinology',
          code: 'EN',
          trainingYears: 4,
        },
        {
          id: 'infectious_diseases',
          nameAr: 'الأمراض المعدية',
          nameEn: 'Infectious Diseases',
          code: 'ID',
          trainingYears: 5,
        },
      ],
    },

    surgery: {
      id: 'surgery',
      nameAr: 'الجراحة والتخصصات الجراحية',
      nameEn: 'Surgery and Surgical Specialties',
      category: 'Surgery',
      subSpecialties: [
        {
          id: 'general_surgery',
          nameAr: 'الجراحة العامة',
          nameEn: 'General Surgery',
          code: 'GS',
          trainingYears: 5,
        },
        {
          id: 'cardiac_surgery',
          nameAr: 'جراحة القلب والأوعية الدموية',
          nameEn: 'Cardiac Surgery',
          code: 'CS',
          trainingYears: 6,
        },
        {
          id: 'orthopedic_surgery',
          nameAr: 'جراحة العظام',
          nameEn: 'Orthopedic Surgery',
          code: 'OS',
          trainingYears: 5,
        },
        {
          id: 'neurosurgery',
          nameAr: 'جراحة الأعصاب',
          nameEn: 'Neurosurgery',
          code: 'NS',
          trainingYears: 6,
        },
        {
          id: 'urology',
          nameAr: 'جراحة المسالك البولية',
          nameEn: 'Urology',
          code: 'UR',
          trainingYears: 5,
        },
        {
          id: 'vascular_surgery',
          nameAr: 'جراحة الأوعية الدموية',
          nameEn: 'Vascular Surgery',
          code: 'VS',
          trainingYears: 6,
        },
        {
          id: 'thoracic_surgery',
          nameAr: 'جراحة الصدرية',
          nameEn: 'Thoracic Surgery',
          code: 'TS',
          trainingYears: 5,
        },
        {
          id: 'pediatric_surgery',
          nameAr: 'جراحة الأطفال',
          nameEn: 'Pediatric Surgery',
          code: 'PS',
          trainingYears: 6,
        },
        {
          id: 'plastic_surgery',
          nameAr: 'جراحة التجميل والترميم',
          nameEn: 'Plastic Surgery',
          code: 'PL',
          trainingYears: 6,
        },
      ],
    },

    pediatrics: {
      id: 'pediatrics',
      nameAr: 'طب الأطفال والتخصصات',
      nameEn: 'Pediatrics and Related Specialties',
      category: 'Pediatrics',
      subSpecialties: [
        {
          id: 'general_pediatrics',
          nameAr: 'طب الأطفال العام',
          nameEn: 'General Pediatrics',
          code: 'GP',
          trainingYears: 3,
        },
        {
          id: 'neonatal_care',
          nameAr: 'حديثي الولادة',
          nameEn: 'Neonatal Care',
          code: 'NC',
          trainingYears: 3,
        },
        {
          id: 'pediatric_cardiology',
          nameAr: 'أمراض قلب الأطفال',
          nameEn: 'Pediatric Cardiology',
          code: 'PCD',
          trainingYears: 4,
        },
        {
          id: 'pediatric_gastro',
          nameAr: 'أمراض جهاز الهضم عند الأطفال',
          nameEn: 'Pediatric Gastroenterology',
          code: 'PGEA',
          trainingYears: 4,
        },
        {
          id: 'pediatric_nephrology',
          nameAr: 'أمراض الكلى عند الأطفال',
          nameEn: 'Pediatric Nephrology',
          code: 'PN',
          trainingYears: 4,
        },
        {
          id: 'pediatric_rheumatology',
          nameAr: 'أمراض الروماتيزم عند الأطفال',
          nameEn: 'Pediatric Rheumatology',
          code: 'PR',
          trainingYears: 4,
        },
        {
          id: 'pediatric_oncology',
          nameAr: 'أمراض أورام الأطفال والدم',
          nameEn: 'Pediatric Oncology',
          code: 'PO',
          trainingYears: 4,
        },
        {
          id: 'pediatric_neurology',
          nameAr: 'أمراض أعصاب الأطفال',
          nameEn: 'Pediatric Neurology',
          code: 'PN',
          trainingYears: 4,
        },
      ],
    },

    obstetrics: {
      id: 'obstetrics',
      nameAr: 'أمراض النساء والتوليد',
      nameEn: 'Obstetrics & Gynecology',
      category: 'Obstetrics',
      subSpecialties: [
        {
          id: 'obs_gyn_general',
          nameAr: 'أمراض النساء والتوليد العام',
          nameEn: 'Obstetrics & Gynecology',
          code: 'OG',
          trainingYears: 4,
        },
        {
          id: 'maternal_fetal',
          nameAr: 'طب الأم والجنين',
          nameEn: 'Maternal-Fetal Medicine',
          code: 'MFM',
          trainingYears: 5,
        },
        {
          id: 'gynecologic_oncology',
          nameAr: 'أورام الجهاز التناسلي النسائي',
          nameEn: 'Gynecologic Oncology',
          code: 'GO',
          trainingYears: 5,
        },
        {
          id: 'reproductive_endocrinology',
          nameAr: 'الغدد الصماء والخصوبة',
          nameEn: 'Reproductive Endocrinology',
          code: 'RE',
          trainingYears: 5,
        },
        {
          id: 'urogynecology',
          nameAr: 'أمراض المسالك البولية النسائية',
          nameEn: 'Urogynecology',
          code: 'UG',
          trainingYears: 4,
        },
      ],
    },

    psychiatry: {
      id: 'psychiatry',
      nameAr: 'الطب النفسي والتخصصات',
      nameEn: 'Psychiatry and Related Specialties',
      category: 'Psychiatry',
      subSpecialties: [
        {
          id: 'general_psychiatry',
          nameAr: 'الطب النفسي العام',
          nameEn: 'General Psychiatry',
          code: 'GP',
          trainingYears: 4,
        },
        {
          id: 'child_psychiatry',
          nameAr: 'الطب النفسي للأطفال',
          nameEn: 'Child Psychiatry',
          code: 'CP',
          trainingYears: 5,
        },
        {
          id: 'addiction_psychiatry',
          nameAr: 'الطب النفسي الإدماني',
          nameEn: 'Addiction Psychiatry',
          code: 'AP',
          trainingYears: 5,
        },
        {
          id: 'geriatric_psychiatry',
          nameAr: 'طب نفس الشيخوخة',
          nameEn: 'Geriatric Psychiatry',
          code: 'GRP',
          trainingYears: 5,
        },
      ],
    },

    dentistry: {
      id: 'dentistry',
      nameAr: 'طب الأسنان والتخصصات',
      nameEn: 'Dentistry and Related Specialties',
      category: 'Dentistry',
      subSpecialties: [
        {
          id: 'general_dentistry',
          nameAr: 'طب الأسنان العام',
          nameEn: 'General Dentistry',
          code: 'GD',
          trainingYears: 3,
        },
        {
          id: 'orthodontics',
          nameAr: 'تقويم الأسنان',
          nameEn: 'Orthodontics',
          code: 'ORT',
          trainingYears: 3,
        },
        {
          id: 'prosthodontics',
          nameAr: 'التركيبات السنية',
          nameEn: 'Prosthodontics',
          code: 'PRO',
          trainingYears: 3,
        },
        {
          id: 'periodontics',
          nameAr: 'أمراض اللثة',
          nameEn: 'Periodontics',
          code: 'PER',
          trainingYears: 3,
        },
        {
          id: 'endodontics',
          nameAr: 'علاج جذور الأسنان',
          nameEn: 'Endodontics',
          code: 'END',
          trainingYears: 3,
        },
        {
          id: 'oral_surgery',
          nameAr: 'جراحة الفم والفكين',
          nameEn: 'Oral Surgery',
          code: 'OS',
          trainingYears: 4,
        },
        {
          id: 'pediatric_dentistry',
          nameAr: 'طب أسنان الأطفال',
          nameEn: 'Pediatric Dentistry',
          code: 'PD',
          trainingYears: 3,
        },
      ],
    },

    pharmacy: {
      id: 'pharmacy',
      nameAr: 'الصيدلة والتخصصات الصيدلانية',
      nameEn: 'Pharmacy and Related Specialties',
      category: 'Pharmacy',
      subSpecialties: [
        {
          id: 'general_pharmacy',
          nameAr: 'الصيدلة العام',
          nameEn: 'General Pharmacy',
          code: 'GP',
          trainingYears: 4,
        },
        {
          id: 'clinical_pharmacy',
          nameAr: 'الصيدلة السريرية',
          nameEn: 'Clinical Pharmacy',
          code: 'CP',
          trainingYears: 2,
        },
        {
          id: 'hospital_pharmacy',
          nameAr: 'صيدلة المستشفيات',
          nameEn: 'Hospital Pharmacy',
          code: 'HP',
          trainingYears: 2,
        },
        {
          id: 'pharmaceutical_chemistry',
          nameAr: 'الكيمياء الصيدلانية',
          nameEn: 'Pharmaceutical Chemistry',
          code: 'PC',
          trainingYears: 2,
        },
      ],
    },

    nursing: {
      id: 'nursing',
      nameAr: 'التمريض والتخصصات',
      nameEn: 'Nursing and Related Specialties',
      category: 'Nursing',
      subSpecialties: [
        {
          id: 'general_nursing',
          nameAr: 'التمريض العام',
          nameEn: 'General Nursing',
          code: 'GN',
          trainingYears: 3,
        },
        {
          id: 'critical_care_nursing',
          nameAr: 'تمريض العناية فائقة',
          nameEn: 'Critical Care Nursing',
          code: 'CCN',
          trainingYears: 1,
        },
        {
          id: 'pediatric_nursing',
          nameAr: 'تمريض الأطفال',
          nameEn: 'Pediatric Nursing',
          code: 'PN',
          trainingYears: 1,
        },
        {
          id: 'mental_health_nursing',
          nameAr: 'تمريض الصحة النفسية',
          nameEn: 'Mental Health Nursing',
          code: 'MHN',
          trainingYears: 1,
        },
        {
          id: 'community_health_nursing',
          nameAr: 'تمريض الصحة المجتمعية',
          nameEn: 'Community Health Nursing',
          code: 'CHN',
          trainingYears: 1,
        },
      ],
    },

    allied_health: {
      id: 'allied_health',
      nameAr: 'التخصصات الصحية المساندة',
      nameEn: 'Allied Health Professions',
      category: 'Allied Health',
      subSpecialties: [
        {
          id: 'physiotherapy',
          nameAr: 'العلاج الطبيعي',
          nameEn: 'Physiotherapy',
          code: 'PT',
          trainingYears: 3,
        },
        {
          id: 'occupational_therapy',
          nameAr: 'العلاج الوظيفي',
          nameEn: 'Occupational Therapy',
          code: 'OT',
          trainingYears: 4,
        },
        {
          id: 'clinical_psychology',
          nameAr: 'علم النفس الإكلينيكي',
          nameEn: 'Clinical Psychology',
          code: 'CP',
          trainingYears: 2,
        },
        {
          id: 'medical_laboratory',
          nameAr: 'علوم المختبر الطبي',
          nameEn: 'Medical Laboratory Science',
          code: 'MLS',
          trainingYears: 4,
        },
        {
          id: 'radiography',
          nameAr: 'تقنيات الأشعة',
          nameEn: 'Radiography',
          code: 'RAD',
          trainingYears: 3,
        },
        {
          id: 'speech_therapy',
          nameAr: 'علاج النطق',
          nameEn: 'Speech Therapy',
          code: 'ST',
          trainingYears: 4,
        },
        {
          id: 'audiology',
          nameAr: 'السمعيات',
          nameEn: 'Audiology',
          code: 'AUD',
          trainingYears: 4,
        },
        {
          id: 'nutrition',
          nameAr: 'التغذية السريرية',
          nameEn: 'Clinical Nutrition',
          code: 'CN',
          trainingYears: 2,
        },
      ],
    },

    public_health: {
      id: 'public_health',
      nameAr: 'الصحة العامة والتخصصات',
      nameEn: 'Public Health and Related Specialties',
      category: 'Public Health',
      subSpecialties: [
        {
          id: 'epidemiology',
          nameAr: 'علم الأوبئة',
          nameEn: 'Epidemiology',
          code: 'EPI',
          trainingYears: 2,
        },
        {
          id: 'health_promotion',
          nameAr: 'تعزيز الصحة',
          nameEn: 'Health Promotion',
          code: 'HP',
          trainingYears: 2,
        },
        {
          id: 'occupational_health',
          nameAr: 'الصحة المهنية',
          nameEn: 'Occupational Health',
          code: 'OH',
          trainingYears: 2,
        },
        {
          id: 'community_medicine',
          nameAr: 'طب المجتمع',
          nameEn: 'Community Medicine',
          code: 'CM',
          trainingYears: 3,
        },
      ],
    },
  },

  // ============================================
  // ✅ Verification Requirements
  // ============================================
  verificationRequirements: {
    mandatory: [
      'Valid national ID',
      'Medical degree from accredited institution',
      'Proof of training/experience',
      'Clean background check',
      'No disciplinary actions',
    ],
    additional: [
      'CPD certificates',
      'Professional references',
      'English language proficiency',
      'Medical ethics declaration',
      'Health certificate',
    ],
  },

  // ============================================
  // 🔔 Compliance Standards
  // ============================================
  complianceStandards: {
    cpdRequirements: {
      mandatory: true,
      minimumHoursPerYear: 20,
      maximumYearsWithoutUpdate: 2,
      acceptedSources: [
        'SCFHS approved courses',
        'International medical conferences',
        'Published research papers',
        'Online medical education',
      ],
    },
    ethicsStandards: {
      mandatory: true,
      requiresDeclaration: true,
      auditFrequency: 'Annual',
    },
    patientSafety: {
      mandatory: true,
      requiresTraining: true,
    },
  },

  // ============================================
  // 📊 Risk Assessment Rules
  // ============================================
  riskAssessmentRules: [
    {
      category: 'Expiration',
      rules: [
        { condition: 'expired', riskLevel: 'CRITICAL', action: 'Immediate suspension' },
        { condition: 'expiring_7_days', riskLevel: 'HIGH', action: 'Urgent renewal' },
        { condition: 'expiring_30_days', riskLevel: 'MEDIUM', action: 'Schedule renewal' },
        { condition: 'expiring_90_days', riskLevel: 'LOW_MEDIUM', action: 'Prepare renewal' },
      ],
    },
    {
      category: 'Compliance',
      rules: [
        { condition: 'cpd_non_compliant', riskLevel: 'HIGH', action: 'Suspend license' },
        { condition: 'cpd_warning', riskLevel: 'MEDIUM', action: 'Issue warning' },
        { condition: 'ethics_violation', riskLevel: 'CRITICAL', action: 'Investigation' },
        { condition: 'disciplinary_action', riskLevel: 'HIGH', action: 'Review status' },
      ],
    },
  ],

  // ============================================
  // 🎓 Training & Education
  // ============================================
  trainingRecognition: {
    saudiUniversities: [
      'King Saud University',
      'University of Dammam',
      'King Abdulaziz University',
      'Princess Norah Bint Abdulrahman University',
      'Imam Abdulrahman Bin Faisal University',
    ],
    internationalRecognition: [
      'WHO approved programs',
      'GMC registered (UK)',
      'USMLE certified (USA)',
      'ECFMG certified (International)',
    ],
  },
};

/**
 * Get all specializations for a license type
 */
export const getSpecializationsByLicenseType = licenseType => {
  const specializations = [];

  if (licenseType === 'medical_doctor' || licenseType === 'specialist') {
    Object.values(SCFHS_CONFIG.specialties).forEach(specialty => {
      specializations.push({
        id: specialty.id,
        name: specialty.nameAr,
        category: specialty.category,
        subSpecialties: specialty.subSpecialties,
      });
    });
  }

  return specializations;
};

/**
 * Get CPD requirements for a license
 */
export const getCPDRequirements = licenseTypeId => {
  const licenseType = SCFHS_CONFIG.licenseTypes[licenseTypeId];

  if (!licenseType) return null;

  return {
    required: licenseType.requiresCPD,
    minimumHours: licenseType.minCPDHours,
    validityYears: licenseType.validityYears,
    hoursPerYear: Math.ceil(licenseType.minCPDHours / licenseType.validityYears),
  };
};

/**
 * Validate specialty code
 */
export const validateSpecialtyCode = (specialty, subSpecialty) => {
  const spec = SCFHS_CONFIG.specialties[specialty];

  if (!spec) return false;

  if (!subSpecialty) return true;

  return spec.subSpecialties.some(s => s.id === subSpecialty);
};

export default SCFHS_CONFIG;
