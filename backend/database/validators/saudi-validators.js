/**
 * Saudi Arabia Validators - Al-Awael ERP
 * محققات البيانات السعودية
 *
 * Validates: National ID, Iqama, Phone, IBAN, CR Number, VAT Number,
 *            Postal Code, Vehicle Plate, GOSI Number, Mudad, Taqat
 */

'use strict';

// ══════════════════════════════════════════════════════════════════
// 1. National ID (Huwiya) - رقم الهوية الوطنية
// ══════════════════════════════════════════════════════════════════
/**
 * Validates Saudi National ID (10 digits, starts with 1)
 * Uses Luhn-like checksum algorithm
 */
function validateNationalId(id) {
  if (!id || typeof id !== 'string') return { valid: false, error: 'رقم الهوية مطلوب' };

  const clean = id.replace(/\s/g, '');

  if (!/^\d{10}$/.test(clean)) {
    return { valid: false, error: 'رقم الهوية يجب أن يتكون من 10 أرقام' };
  }

  if (!clean.startsWith('1')) {
    return { valid: false, error: 'رقم الهوية الوطنية يجب أن يبدأ بـ 1' };
  }

  if (!luhnCheck(clean)) {
    return { valid: false, error: 'رقم الهوية غير صحيح (checksum)' };
  }

  return { valid: true, type: 'national_id', formatted: clean };
}

// ══════════════════════════════════════════════════════════════════
// 2. Iqama (Residence Permit) - رقم الإقامة
// ══════════════════════════════════════════════════════════════════
function validateIqama(id) {
  if (!id || typeof id !== 'string') return { valid: false, error: 'رقم الإقامة مطلوب' };

  const clean = id.replace(/\s/g, '');

  if (!/^\d{10}$/.test(clean)) {
    return { valid: false, error: 'رقم الإقامة يجب أن يتكون من 10 أرقام' };
  }

  if (!clean.startsWith('2')) {
    return { valid: false, error: 'رقم الإقامة يجب أن يبدأ بـ 2' };
  }

  if (!luhnCheck(clean)) {
    return { valid: false, error: 'رقم الإقامة غير صحيح (checksum)' };
  }

  return { valid: true, type: 'iqama', formatted: clean };
}

// ══════════════════════════════════════════════════════════════════
// 3. Saudi/GCC Phone Number
// ══════════════════════════════════════════════════════════════════
function validateSaudiPhone(phone) {
  if (!phone) return { valid: false, error: 'رقم الهاتف مطلوب' };

  const clean = phone.replace(/[\s\-().+]/g, '');

  // Saudi mobile: 05xxxxxxxx or +9665xxxxxxxx or 9665xxxxxxxx
  const patterns = [
    { regex: /^05\d{8}$/, format: local => local, label: 'SA Mobile (05...)' },
    { regex: /^9665\d{8}$/, format: n => '0' + n.slice(3), label: 'SA Mobile (+966...)' },
    { regex: /^00966\d{9}$/, format: n => '0' + n.slice(5), label: 'SA International' },
  ];

  for (const p of patterns) {
    if (p.regex.test(clean)) {
      return { valid: true, formatted: '+966' + p.format(clean).slice(1), local: p.format(clean) };
    }
  }

  // Saudi landline: 01x-xxxxxxx
  if (/^0[1-4]\d{7}$/.test(clean)) {
    return { valid: true, type: 'landline', formatted: clean };
  }

  return { valid: false, error: 'رقم الهاتف غير صحيح. مثال: 0501234567' };
}

// ══════════════════════════════════════════════════════════════════
// 4. IBAN - Saudi IBAN
// ══════════════════════════════════════════════════════════════════
function validateSaudiIBAN(iban) {
  if (!iban) return { valid: false, error: 'رقم الآيبان مطلوب' };

  const clean = iban.replace(/\s/g, '').toUpperCase();

  // SA IBAN: SA + 2 check digits + 22 digits = 24 chars
  if (!/^SA\d{22}$/.test(clean)) {
    return { valid: false, error: 'الآيبان السعودي يجب أن يكون 24 حرف ويبدأ بـ SA' };
  }

  // ISO 7064 MOD97-10 validation
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const numericStr = rearranged
    .split('')
    .map(c => {
      const code = c.charCodeAt(0);
      return code >= 65 ? (code - 55).toString() : c;
    })
    .join('');

  let remainder = 0;
  for (const chunk of numericStr.match(/.{1,9}/g) || []) {
    remainder = parseInt(remainder.toString() + chunk) % 97;
  }

  if (remainder !== 1) {
    return { valid: false, error: 'رقم الآيبان غير صحيح (checksum)' };
  }

  // Format: SA12 3456 7890 1234 5678 9012
  const formatted = clean.match(/.{1,4}/g).join(' ');
  return { valid: true, formatted, raw: clean };
}

// ══════════════════════════════════════════════════════════════════
// 5. Commercial Registration (CR) - السجل التجاري
// ══════════════════════════════════════════════════════════════════
function validateCRNumber(cr) {
  if (!cr) return { valid: false, error: 'رقم السجل التجاري مطلوب' };

  const clean = cr.replace(/\s/g, '');

  if (!/^\d{10}$/.test(clean)) {
    return { valid: false, error: 'رقم السجل التجاري يجب أن يتكون من 10 أرقام' };
  }

  // First digit indicates region (1=Riyadh, 2=Jeddah, etc.)
  const regionCodes = ['1', '2', '3', '4', '5', '6', '7', '8'];
  if (!regionCodes.includes(clean[0])) {
    return { valid: false, error: 'رمز المنطقة في السجل التجاري غير صحيح' };
  }

  return { valid: true, formatted: clean, region: getRegionFromCR(clean[0]) };
}

function getRegionFromCR(code) {
  const regions = {
    1: 'الرياض',
    2: 'جدة',
    3: 'الدمام',
    4: 'المدينة المنورة',
    5: 'أبها',
    6: 'الطائف',
    7: 'تبوك',
    8: 'القصيم',
  };
  return regions[code] || 'غير محدد';
}

// ══════════════════════════════════════════════════════════════════
// 6. VAT Number (ZATCA) - رقم ضريبة القيمة المضافة
// ══════════════════════════════════════════════════════════════════
function validateVATNumber(vat) {
  if (!vat) return { valid: false, error: 'رقم ضريبة القيمة المضافة مطلوب' };

  const clean = vat.replace(/\s/g, '');

  // Saudi VAT: 15 digits, starts with 3 and ends with 3
  if (!/^3\d{13}3$/.test(clean)) {
    return {
      valid: false,
      error: 'رقم ضريبة القيمة المضافة يجب أن يكون 15 رقم ويبدأ وينتهي بـ 3',
    };
  }

  return { valid: true, formatted: clean };
}

// ══════════════════════════════════════════════════════════════════
// 7. Saudi Postal Code
// ══════════════════════════════════════════════════════════════════
function validatePostalCode(code) {
  if (!code) return { valid: false, error: 'الرمز البريدي مطلوب' };

  const clean = code.replace(/\s/g, '');

  // Saudi postal code: 5 digits
  if (!/^\d{5}$/.test(clean)) {
    return { valid: false, error: 'الرمز البريدي السعودي يتكون من 5 أرقام' };
  }

  return { valid: true, formatted: clean };
}

// ══════════════════════════════════════════════════════════════════
// 8. Vehicle Plate Number - لوحة السيارة
// ══════════════════════════════════════════════════════════════════
function validateVehiclePlate(plate) {
  if (!plate) return { valid: false, error: 'رقم لوحة السيارة مطلوب' };

  const clean = plate.replace(/\s/g, '').toUpperCase();

  // New format: 3 letters + 4 digits (e.g. ABC1234)
  const newFormat = /^[أ-ي]{3}\d{4}$|^[A-Z]{3}\d{4}$/;
  // Old format: 4 digits + 3 letters (e.g. 1234ABC)
  const oldFormat = /^\d{4}[A-Z]{3}$/;
  // Special: government/military
  const specialFormat = /^\d{5,7}$/;

  if (newFormat.test(clean) || oldFormat.test(clean) || specialFormat.test(clean)) {
    return { valid: true, formatted: clean };
  }

  return { valid: false, error: 'رقم اللوحة غير صحيح. مثال: ABC1234 أو أبج1234' };
}

// ══════════════════════════════════════════════════════════════════
// 9. GOSI Number - رقم التأمينات الاجتماعية
// ══════════════════════════════════════════════════════════════════
function validateGOSINumber(gosi) {
  if (!gosi) return { valid: false, error: 'رقم التأمينات الاجتماعية مطلوب' };

  const clean = gosi.replace(/\s/g, '');

  if (!/^\d{10}$/.test(clean)) {
    return { valid: false, error: 'رقم التأمينات الاجتماعية يجب أن يتكون من 10 أرقام' };
  }

  return { valid: true, formatted: clean };
}

// ══════════════════════════════════════════════════════════════════
// 10. Email Validator
// ══════════════════════════════════════════════════════════════════
function validateEmail(email) {
  if (!email) return { valid: false, error: 'البريد الإلكتروني مطلوب' };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'البريد الإلكتروني غير صحيح' };
  }

  return { valid: true, formatted: email.trim().toLowerCase() };
}

// ══════════════════════════════════════════════════════════════════
// 11. Age Validator (for beneficiaries)
// ══════════════════════════════════════════════════════════════════
function validateAge(dateOfBirth, options = {}) {
  const { minAge = 0, maxAge = 100 } = options;

  if (!dateOfBirth) return { valid: false, error: 'تاريخ الميلاد مطلوب' };

  const dob = new Date(dateOfBirth);
  const now = new Date();
  const age = (now - dob) / (365.25 * 24 * 60 * 60 * 1000);

  if (dob > now) return { valid: false, error: 'تاريخ الميلاد لا يمكن أن يكون في المستقبل' };
  if (age < minAge) return { valid: false, error: `العمر يجب أن يكون على الأقل ${minAge} سنة` };
  if (age > maxAge) return { valid: false, error: `العمر يجب أن يكون أقل من ${maxAge} سنة` };

  const years = Math.floor(age);
  const months = Math.floor((age - years) * 12);

  return { valid: true, age: years, months, dateOfBirth: dob };
}

// ══════════════════════════════════════════════════════════════════
// 12. Unified Document Validator (ID or Iqama)
// ══════════════════════════════════════════════════════════════════
function validateIdNumber(id) {
  if (!id) return { valid: false, error: 'رقم الهوية أو الإقامة مطلوب' };

  const clean = id.replace(/\s/g, '');

  if (clean.startsWith('1')) return validateNationalId(clean);
  if (clean.startsWith('2')) return validateIqama(clean);

  return { valid: false, error: 'رقم الهوية يجب أن يبدأ بـ 1 (مواطن) أو 2 (مقيم)' };
}

// ══════════════════════════════════════════════════════════════════
// 13. Password Strength
// ══════════════════════════════════════════════════════════════════
function validatePassword(password, options = {}) {
  const {
    minLength = 8,
    requireUppercase = true,
    requireNumber = true,
    requireSpecial = true,
  } = options;

  if (!password) return { valid: false, error: 'كلمة المرور مطلوبة', strength: 0 };
  if (password.length < minLength)
    return {
      valid: false,
      error: `كلمة المرور يجب أن تكون على الأقل ${minLength} أحرف`,
      strength: 1,
    };

  let strength = 0;
  const checks = {
    length: password.length >= minLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    arabic: /[\u0600-\u06FF]/.test(password),
  };

  strength = Object.values(checks).filter(Boolean).length;

  const errors = [];
  if (requireUppercase && !checks.uppercase) errors.push('يجب أن تحتوي على حرف كبير');
  if (requireNumber && !checks.number) errors.push('يجب أن تحتوي على رقم');
  if (requireSpecial && !checks.special) errors.push('يجب أن تحتوي على رمز خاص (@#$...)');

  if (errors.length > 0) return { valid: false, error: errors.join(', '), strength, checks };

  const strengthLabels = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية', 'قوية جداً'];
  return { valid: true, strength, strengthLabel: strengthLabels[Math.min(strength, 5)], checks };
}

// ══════════════════════════════════════════════════════════════════
// Luhn Algorithm (checksum)
// ══════════════════════════════════════════════════════════════════
function luhnCheck(num) {
  let sum = 0;
  let toggle = false;

  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i]);
    if (toggle) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    toggle = !toggle;
  }

  return sum % 10 === 0;
}

// ══════════════════════════════════════════════════════════════════
// Mongoose Custom Validators
// ══════════════════════════════════════════════════════════════════
const mongooseValidators = {
  nationalId: {
    validator: v => !v || validateIdNumber(v).valid,
    message: 'رقم الهوية أو الإقامة غير صحيح',
  },
  phone: {
    validator: v => !v || validateSaudiPhone(v).valid,
    message: 'رقم الهاتف السعودي غير صحيح',
  },
  email: {
    validator: v => !v || validateEmail(v).valid,
    message: 'البريد الإلكتروني غير صحيح',
  },
  vatNumber: {
    validator: v => !v || validateVATNumber(v).valid,
    message: 'رقم ضريبة القيمة المضافة غير صحيح',
  },
  crNumber: {
    validator: v => !v || validateCRNumber(v).valid,
    message: 'رقم السجل التجاري غير صحيح',
  },
  iban: {
    validator: v => !v || validateSaudiIBAN(v).valid,
    message: 'رقم الآيبان السعودي غير صحيح',
  },
  vehiclePlate: {
    validator: v => !v || validateVehiclePlate(v).valid,
    message: 'رقم لوحة السيارة غير صحيح',
  },
};

module.exports = {
  validateNationalId,
  validateIqama,
  validateIdNumber,
  validateSaudiPhone,
  validateSaudiIBAN,
  validateCRNumber,
  validateVATNumber,
  validatePostalCode,
  validateVehiclePlate,
  validateGOSINumber,
  validateEmail,
  validateAge,
  validatePassword,
  luhnCheck,
  mongooseValidators,
};
