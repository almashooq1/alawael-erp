/**
 * Saudi Validators — التحقق من البيانات السعودية
 *
 * يشمل:
 *  - رقم الهوية الوطنية (10 أرقام تبدأ بـ 1 + خوارزمية Luhn)
 *  - رقم إقامة الوافد (10 أرقام تبدأ بـ 2 + خوارزمية Luhn)
 *  - رقم الجوال السعودي (05XXXXXXXX أو +9665XXXXXXXX)
 *  - IBAN سعودي (SA + 22 خانة + MOD-97)
 *  - رقم السجل التجاري (10 أرقام)
 *  - رقم الترخيص الصحي
 *
 * يمكن استخدام الـ validators كـ:
 *  1. دوال مستقلة: validateSaudiNationalId(value)
 *  2. express-validator custom rules: body('nid').custom(saudiNationalIdRule)
 *  3. middleware validators: saudiValidators.nationalId
 *
 * @module middleware/validators/saudi
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// خوارزمية Luhn (MOD-10) — تُستخدَم للتحقق من الهوية الوطنية
// ═══════════════════════════════════════════════════════════════════════════

/**
 * التحقق بخوارزمية Luhn
 * @param {string} number - رقم كـ string
 * @returns {boolean}
 */
function luhnCheck(number) {
  const str = String(number).trim();
  let sum = 0;
  const len = str.length;

  for (let i = 0; i < len; i++) {
    let digit = parseInt(str[i], 10);
    if (isNaN(digit)) return false;

    // كل رقم في موضع زوجي من اليمين يُضاعَف
    if ((len - 1 - i) % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  return sum % 10 === 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. رقم الهوية الوطنية / الإقامة
// ═══════════════════════════════════════════════════════════════════════════

/**
 * التحقق من رقم الهوية الوطنية السعودية
 * - 10 أرقام
 * - يبدأ بـ 1 (مواطن)
 * - يجتاز خوارزمية Luhn
 *
 * @param {string|number} value
 * @returns {{ valid: boolean, message?: string }}
 */
function validateSaudiNationalId(value) {
  const id = String(value || '').trim();

  if (!/^\d{10}$/.test(id)) {
    return { valid: false, message: 'رقم الهوية الوطنية يجب أن يكون 10 أرقام' };
  }

  if (!id.startsWith('1')) {
    return { valid: false, message: 'رقم الهوية الوطنية يبدأ بالرقم 1' };
  }

  if (!luhnCheck(id)) {
    return { valid: false, message: 'رقم الهوية الوطنية غير صحيح' };
  }

  return { valid: true };
}

/**
 * التحقق من رقم إقامة الوافد
 * - 10 أرقام
 * - يبدأ بـ 2 (وافد)
 * - يجتاز خوارزمية Luhn
 *
 * @param {string|number} value
 * @returns {{ valid: boolean, message?: string }}
 */
function validateResidenceId(value) {
  const id = String(value || '').trim();

  if (!/^\d{10}$/.test(id)) {
    return { valid: false, message: 'رقم الإقامة يجب أن يكون 10 أرقام' };
  }

  if (!id.startsWith('2')) {
    return { valid: false, message: 'رقم الإقامة يبدأ بالرقم 2' };
  }

  if (!luhnCheck(id)) {
    return { valid: false, message: 'رقم الإقامة غير صحيح' };
  }

  return { valid: true };
}

/**
 * التحقق من أي رقم هوية (وطني أو إقامة)
 * @param {string|number} value
 * @returns {{ valid: boolean, type?: 'national'|'residence', message?: string }}
 */
function validateSaudiId(value) {
  const id = String(value || '').trim();

  if (!/^\d{10}$/.test(id)) {
    return { valid: false, message: 'رقم الهوية يجب أن يكون 10 أرقام' };
  }

  if (id.startsWith('1')) {
    const result = validateSaudiNationalId(id);
    return result.valid ? { ...result, type: 'national' } : result;
  }

  if (id.startsWith('2')) {
    const result = validateResidenceId(id);
    return result.valid ? { ...result, type: 'residence' } : result;
  }

  return { valid: false, message: 'رقم الهوية يبدأ بـ 1 (مواطن) أو 2 (مقيم)' };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. رقم الجوال السعودي
// ═══════════════════════════════════════════════════════════════════════════

/** أنماط الأرقام السعودية المدعومة */
const SAUDI_MOBILE_REGEX = /^(\+?966|0)5[0-9]{8}$/;

/**
 * التحقق من رقم الجوال السعودي
 * يقبل الصيغ: 05XXXXXXXX | +9665XXXXXXXX | 9665XXXXXXXX
 *
 * @param {string|number} value
 * @returns {{ valid: boolean, normalized?: string, message?: string }}
 */
function validateSaudiMobile(value) {
  const raw = String(value || '')
    .trim()
    .replace(/[\s-]/g, '');

  if (!SAUDI_MOBILE_REGEX.test(raw)) {
    return {
      valid: false,
      message: 'رقم الجوال السعودي غير صحيح (مثال: 0501234567 أو +966501234567)',
    };
  }

  // توحيد الصيغة إلى +966XXXXXXXXX
  let normalized = raw;
  if (raw.startsWith('0')) {
    normalized = '+966' + raw.slice(1);
  } else if (raw.startsWith('966')) {
    normalized = '+' + raw;
  }

  return { valid: true, normalized };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. IBAN السعودي
// ═══════════════════════════════════════════════════════════════════════════

/**
 * التحقق من IBAN سعودي
 * الصيغة: SA + 2 أرقام تحقق + 2 حروف (رمز البنك) + 18 رقم = 24 خانة
 * الخوارزمية: MOD-97 (ISO 13616)
 *
 * @param {string} value
 * @returns {{ valid: boolean, bank?: string, message?: string }}
 */
function validateSaudiIBAN(value) {
  const iban = String(value || '')
    .toUpperCase()
    .replace(/\s/g, '');

  // تحقق من الصيغة الأساسية
  if (!/^SA\d{2}[A-Z0-9]{20}$/.test(iban)) {
    return {
      valid: false,
      message: 'IBAN سعودي غير صحيح (يبدأ بـ SA ويتكون من 24 خانة)',
    };
  }

  // خوارزمية MOD-97:
  // 1. نقل أول 4 أحرف للنهاية
  const rearranged = iban.slice(4) + iban.slice(0, 4);

  // 2. تحويل كل حرف لرقم (A=10, B=11, ..., Z=35)
  let numeric = '';
  for (const ch of rearranged) {
    if (/[A-Z]/.test(ch)) {
      numeric += String(ch.charCodeAt(0) - 55);
    } else {
      numeric += ch;
    }
  }

  // 3. التحقق: numeric MOD 97 === 1
  let remainder = 0;
  for (const ch of numeric) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97;
  }

  if (remainder !== 1) {
    return { valid: false, message: 'رقم IBAN السعودي غير صحيح (فشل التحقق MOD-97)' };
  }

  // استخراج رمز البنك (الأحرف 5-6)
  const bankCode = iban.slice(4, 6);

  return { valid: true, bankCode };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. رقم السجل التجاري (CR)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * التحقق من رقم السجل التجاري السعودي
 * - 10 أرقام تبدأ بـ 1 أو 2 أو 7
 *
 * @param {string|number} value
 * @returns {{ valid: boolean, message?: string }}
 */
function validateCommercialRegistration(value) {
  const cr = String(value || '').trim();

  if (!/^\d{10}$/.test(cr)) {
    return { valid: false, message: 'رقم السجل التجاري يجب أن يكون 10 أرقام' };
  }

  if (!/^[127]/.test(cr)) {
    return { valid: false, message: 'رقم السجل التجاري يبدأ بـ 1 أو 2 أو 7' };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. رقم الترخيص الصحي (MOH)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * التحقق من رقم الترخيص الصحي (وزارة الصحة)
 * الصيغة: 7 إلى 12 رقم
 *
 * @param {string|number} value
 * @returns {{ valid: boolean, message?: string }}
 */
function validateHealthLicense(value) {
  const lic = String(value || '').trim();

  if (!/^\d{7,12}$/.test(lic)) {
    return { valid: false, message: 'رقم الترخيص الصحي يجب أن يتراوح بين 7 و12 رقم' };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// express-validator custom rules — قواعد للاستخدام مع express-validator
// ═══════════════════════════════════════════════════════════════════════════

/**
 * قاعدة تحقق لـ express-validator
 * الاستخدام:
 *   body('nationalId').custom(saudiNationalIdRule)
 */
const saudiNationalIdRule = value => {
  const result = validateSaudiNationalId(value);
  if (!result.valid) throw new Error(result.message);
  return true;
};

const saudiMobileRule = value => {
  const result = validateSaudiMobile(value);
  if (!result.valid) throw new Error(result.message);
  return true;
};

const saudiIBANRule = value => {
  const result = validateSaudiIBAN(value);
  if (!result.valid) throw new Error(result.message);
  return true;
};

const saudiIdRule = value => {
  const result = validateSaudiId(value);
  if (!result.valid) throw new Error(result.message);
  return true;
};

const crRule = value => {
  const result = validateCommercialRegistration(value);
  if (!result.valid) throw new Error(result.message);
  return true;
};

// ═══════════════════════════════════════════════════════════════════════════
// Express middleware validators — وسيط التحقق المباشر
// ═══════════════════════════════════════════════════════════════════════════

/**
 * middleware: يتحقق من حقل nationalId في req.body
 */
const validateNationalIdMiddleware = (fieldName = 'nationalId') => {
  return (req, res, next) => {
    const value = req.body?.[fieldName] || req.query?.[fieldName];
    if (!value) return next(); // حقل اختياري

    const result = validateSaudiNationalId(value);
    if (!result.valid) {
      return res.status(422).json({
        success: false,
        message: result.message,
        field: fieldName,
      });
    }
    next();
  };
};

/**
 * middleware: يتحقق من حقل mobile في req.body
 */
const validateMobileMiddleware = (fieldName = 'mobile') => {
  return (req, res, next) => {
    const value = req.body?.[fieldName] || req.query?.[fieldName];
    if (!value) return next();

    const result = validateSaudiMobile(value);
    if (!result.valid) {
      return res.status(422).json({
        success: false,
        message: result.message,
        field: fieldName,
      });
    }

    // توحيد الصيغة
    if (req.body) req.body[fieldName] = result.normalized;
    next();
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // دوال التحقق المستقلة
  validateSaudiNationalId,
  validateResidenceId,
  validateSaudiId,
  validateSaudiMobile,
  validateSaudiIBAN,
  validateCommercialRegistration,
  validateHealthLicense,
  luhnCheck,

  // قواعد express-validator
  rules: {
    saudiNationalId: saudiNationalIdRule,
    saudiMobile: saudiMobileRule,
    saudiIBAN: saudiIBANRule,
    saudiId: saudiIdRule,
    commercialRegistration: crRule,
  },

  // Express middleware factories
  middleware: {
    nationalId: validateNationalIdMiddleware,
    mobile: validateMobileMiddleware,
  },
};
