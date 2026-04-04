/**
 * saudiValidations.js — قواعد التحقق السعودية
 *
 * الملف: backend/utils/saudiValidations.js
 * المصدر: prompt_03 — نظام إدارة مراكز تأهيل ذوي الإعاقة — Rehab-ERP v2.0
 *
 * يتضمن دوال التحقق من:
 *   - رقم الهوية الوطنية السعودية
 *   - رقم الجوال السعودي
 *   - رقم الآيبان السعودي (IBAN)
 *   - رقم السجل التجاري
 *   - رقم ضريبة القيمة المضافة (VAT)
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// رقم الهوية الوطنية السعودية
// ═══════════════════════════════════════════════════════════════

/**
 * التحقق من رقم الهوية الوطنية السعودية
 * - 10 أرقام
 * - يبدأ بـ 1 (مواطن) أو 2 (مقيم)
 * - يمر بخوارزمية Luhn
 *
 * @param {string|number} value - رقم الهوية
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSaudiNationalId(value) {
  const id = String(value || '').trim();

  // التحقق من الصيغة: 10 أرقام تبدأ بـ 1 أو 2
  if (!/^[12]\d{9}$/.test(id)) {
    return {
      valid: false,
      error: 'رقم الهوية الوطنية يجب أن يكون 10 أرقام ويبدأ بـ 1 (مواطن) أو 2 (مقيم)',
    };
  }

  // خوارزمية Luhn
  if (!luhnCheck(id)) {
    return {
      valid: false,
      error: 'رقم الهوية الوطنية غير صحيح',
    };
  }

  return { valid: true };
}

/**
 * التحقق من رقم الهوية — للاستخدام مع مكتبات الـ validation
 * @param {string|number} value
 * @returns {boolean}
 */
function isSaudiNationalId(value) {
  return validateSaudiNationalId(value).valid;
}

// ═══════════════════════════════════════════════════════════════
// رقم الجوال السعودي
// ═══════════════════════════════════════════════════════════════

/**
 * التحقق من رقم الجوال السعودي
 * الصيغ المقبولة:
 *   - 05XXXXXXXX
 *   - +9665XXXXXXXX
 *   - 9665XXXXXXXX
 *   - 5XXXXXXXX (بدون مقدمة)
 *
 * @param {string} value - رقم الجوال
 * @returns {{ valid: boolean, normalized?: string, error?: string }}
 */
function validateSaudiMobile(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[\s\-()]/g, '');

  const pattern = /^(\+?966|0)?5[0-9]{8}$/;

  if (!pattern.test(cleaned)) {
    return {
      valid: false,
      error: 'رقم الجوال السعودي غير صحيح (مثال: 05XXXXXXXX أو +9665XXXXXXXX)',
    };
  }

  // تطبيع الرقم بصيغة +966
  let normalized = cleaned;
  if (cleaned.startsWith('+966')) {
    normalized = cleaned;
  } else if (cleaned.startsWith('966')) {
    normalized = '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    normalized = '+966' + cleaned.slice(1);
  } else if (cleaned.startsWith('5')) {
    normalized = '+966' + cleaned;
  }

  return { valid: true, normalized };
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isSaudiMobile(value) {
  return validateSaudiMobile(value).valid;
}

// ═══════════════════════════════════════════════════════════════
// رقم الآيبان السعودي (IBAN)
// ═══════════════════════════════════════════════════════════════

/**
 * التحقق من رقم الآيبان السعودي
 * الصيغة: SA + 2 أرقام تحقق + 2 حروف (رمز البنك) + 18 رقم = 24 خانة
 * يمر بخوارزمية MOD-97
 *
 * @param {string} value
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSaudiIBAN(value) {
  const iban = String(value || '')
    .toUpperCase()
    .replace(/\s/g, '');

  // التحقق من الصيغة
  if (!/^SA\d{2}[A-Z0-9]{20}$/.test(iban)) {
    return {
      valid: false,
      error: 'رقم الآيبان السعودي يجب أن يكون 24 خانة ويبدأ بـ SA (مثال: SA1234567890123456789012)',
    };
  }

  // التحقق بخوارزمية MOD-97
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let numeric = '';

  for (const char of rearranged) {
    numeric += /[0-9]/.test(char) ? char : String(char.charCodeAt(0) - 55);
  }

  // حساب MOD-97 بشكل تدريجي (لتجنب overflow)
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }

  if (remainder !== 1) {
    return {
      valid: false,
      error: 'رقم الآيبان غير صحيح',
    };
  }

  return { valid: true };
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isSaudiIBAN(value) {
  return validateSaudiIBAN(value).valid;
}

// ═══════════════════════════════════════════════════════════════
// رقم السجل التجاري
// ═══════════════════════════════════════════════════════════════

/**
 * التحقق من رقم السجل التجاري السعودي
 * - 10 أرقام
 * - يبدأ بـ 1 أو 2 أو 3 أو 4 أو 5 أو 6 أو 7 أو 8
 *
 * @param {string|number} value
 * @returns {{ valid: boolean, error?: string }}
 */
function validateCommercialRegistration(value) {
  const cr = String(value || '').trim();

  if (!/^[1-9]\d{9}$/.test(cr)) {
    return {
      valid: false,
      error: 'رقم السجل التجاري يجب أن يكون 10 أرقام',
    };
  }

  return { valid: true };
}

/**
 * @param {string|number} value
 * @returns {boolean}
 */
function isCommercialRegistration(value) {
  return validateCommercialRegistration(value).valid;
}

// ═══════════════════════════════════════════════════════════════
// رقم ضريبة القيمة المضافة (VAT)
// ═══════════════════════════════════════════════════════════════

/**
 * التحقق من رقم ضريبة القيمة المضافة السعودي
 * - 15 رقم
 * - يبدأ بـ 3
 * - ينتهي بـ 3
 *
 * @param {string|number} value
 * @returns {{ valid: boolean, error?: string }}
 */
function validateVATNumber(value) {
  const vat = String(value || '').trim();

  if (!/^3\d{13}3$/.test(vat)) {
    return {
      valid: false,
      error: 'الرقم الضريبي يجب أن يكون 15 رقماً ويبدأ وينتهي بـ 3',
    };
  }

  return { valid: true };
}

/**
 * @param {string|number} value
 * @returns {boolean}
 */
function isVATNumber(value) {
  return validateVATNumber(value).valid;
}

// ═══════════════════════════════════════════════════════════════
// دوال مساعدة
// ═══════════════════════════════════════════════════════════════

/**
 * خوارزمية Luhn للتحقق من الأرقام
 * @param {string} number
 * @returns {boolean}
 */
function luhnCheck(number) {
  let sum = 0;
  const length = number.length;

  for (let i = 0; i < length; i++) {
    let digit = parseInt(number[i], 10);

    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
  }

  return sum % 10 === 0;
}

/**
 * Middleware للتحقق من البيانات السعودية في الطلبات
 * يضيف دوال التحقق إلى req لسهولة الاستخدام
 */
function saudiValidationMiddleware(req, _res, next) {
  req.saudiValidations = {
    nationalId: value => validateSaudiNationalId(value),
    mobile: value => validateSaudiMobile(value),
    iban: value => validateSaudiIBAN(value),
    cr: value => validateCommercialRegistration(value),
    vat: value => validateVATNumber(value),
  };
  next();
}

// ═══════════════════════════════════════════════════════════════
// Express Validator Custom Validators
// ═══════════════════════════════════════════════════════════════

/**
 * للاستخدام مع express-validator:
 *
 * const { expressValidators } = require('./saudiValidations');
 * body('nationalId').custom(expressValidators.nationalId)
 */
const expressValidators = {
  nationalId: value => {
    const result = validateSaudiNationalId(value);
    if (!result.valid) throw new Error(result.error);
    return true;
  },
  mobile: value => {
    const result = validateSaudiMobile(value);
    if (!result.valid) throw new Error(result.error);
    return true;
  },
  iban: value => {
    const result = validateSaudiIBAN(value);
    if (!result.valid) throw new Error(result.error);
    return true;
  },
  cr: value => {
    const result = validateCommercialRegistration(value);
    if (!result.valid) throw new Error(result.error);
    return true;
  },
  vat: value => {
    const result = validateVATNumber(value);
    if (!result.valid) throw new Error(result.error);
    return true;
  },
};

module.exports = {
  // دوال التحقق مع رسائل الخطأ
  validateSaudiNationalId,
  validateSaudiMobile,
  validateSaudiIBAN,
  validateCommercialRegistration,
  validateVATNumber,

  // دوال boolean بسيطة
  isSaudiNationalId,
  isSaudiMobile,
  isSaudiIBAN,
  isCommercialRegistration,
  isVATNumber,

  // Middleware
  saudiValidationMiddleware,

  // express-validator
  expressValidators,

  // للاستخدام المباشر
  luhnCheck,
};
