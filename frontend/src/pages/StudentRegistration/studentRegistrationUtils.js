/**
 * Student Registration — Validation & Payload Builder
 */

import { PROGRAMS } from './studentRegistrationConfig';

/**
 * Validate form data for a specific step.
 * @returns {{ [field: string]: string }} error map (empty = valid)
 */
export function validateStepFields(step, formData) {
  const errors = {};

  if (step === 0) {
    if (!formData.firstNameAr) errors.firstNameAr = 'الاسم الأول مطلوب';
    if (!formData.lastNameAr) errors.lastNameAr = 'اسم العائلة مطلوب';
    if (!formData.dateOfBirth) errors.dateOfBirth = 'تاريخ الميلاد مطلوب';
    if (!formData.gender) errors.gender = 'الجنس مطلوب';
    if (formData.nationalId && !/^[12]\d{9}$/.test(formData.nationalId))
      errors.nationalId = 'رقم الهوية يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2';
  }

  if (step === 1) {
    if (!formData.primaryType) errors.primaryType = 'نوع الإعاقة مطلوب';
    if (!formData.severity) errors.severity = 'مستوى الشدة مطلوب';
  }

  if (step === 2) {
    if (!formData.fatherName && !formData.motherName)
      errors.fatherName = 'يجب إدخال بيانات أحد الوالدين على الأقل';
    if (!formData.emergencyMobile) errors.emergencyMobile = 'رقم جوال الطوارئ مطلوب';
  }

  if (step === 3) {
    if (formData.selectedPrograms.length === 0)
      errors.selectedPrograms = 'يرجى اختيار برنامج واحد على الأقل';
  }

  // Steps 4 & 5 — no required fields
  return errors;
}

/**
 * Build backend-compatible payload from form state.
 */
export function buildPayload(formData) {
  return {
    personal: {
      firstNameAr: formData.firstNameAr,
      lastNameAr: formData.lastNameAr,
      firstNameEn: formData.firstNameEn,
      lastNameEn: formData.lastNameEn,
      nationalId: formData.nationalId,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      nationality: formData.nationality,
      placeOfBirth: formData.placeOfBirth,
      bloodType: formData.bloodType,
    },
    address: {
      region: formData.region,
      city: formData.city,
      district: formData.district,
      streetName: formData.streetName,
      postalCode: formData.postalCode,
    },
    disability: {
      primaryType: formData.primaryType,
      primarySubtype: formData.primarySubtype,
      severity: formData.severity,
      diagnosisDate: formData.diagnosisDate,
      diagnosisSource: formData.diagnosisSource,
      notes: formData.disabilityNotes,
    },
    guardian: {
      father: {
        name: formData.fatherName,
        nationalId: formData.fatherNationalId,
        mobile: formData.fatherMobile,
        email: formData.fatherEmail,
        occupation: formData.fatherOccupation,
        education: formData.fatherEducation,
      },
      mother: {
        name: formData.motherName,
        mobile: formData.motherMobile,
        email: formData.motherEmail,
        occupation: formData.motherOccupation,
      },
      emergencyContact: {
        name: formData.emergencyName,
        relation: formData.emergencyRelation,
        mobile: formData.emergencyMobile,
      },
    },
    programs: formData.selectedPrograms.map(p => ({
      programType: p,
      programName: PROGRAMS[p],
      status: 'active',
    })),
    schedule: {
      shift: formData.shift,
      days: formData.days,
    },
    center: {
      centerName: formData.centerName,
      branchName: formData.branchName,
      enrollmentDate: new Date().toISOString(),
    },
    medicalHistory: {
      allergies: (Array.isArray(formData.allergies) ? formData.allergies : [])
        .filter(Boolean)
        .map(a =>
          typeof a === 'string' ? { name: a, type: 'environmental', severity: 'mild' } : a
        ),
      chronicConditions: formData.chronicConditions
        ? formData.chronicConditions
            .split(',')
            .map(c => c.trim())
            .filter(Boolean)
        : [],
      medications: formData.medications
        ? formData.medications
            .split(',')
            .map(m => m.trim())
            .filter(Boolean)
            .map(m => ({ name: m, active: true }))
        : [],
      vision: { glasses: !!formData.hasGlasses },
      hearing: { hearingAid: !!formData.hasHearingAid },
    },
  };
}
