/**
 * validators — Common validation functions for Saudi Arabia / Arabic context.
 * مكتبة التحقق من البيانات — السعودية والعربية
 */

/**
 * Validate Saudi National ID (رقم الهوية الوطنية).
 * Starts with 1 (citizen) or 2 (resident), 10 digits total.
 * @param {string} id
 * @returns {boolean}
 */
export const isValidSaudiId = id => {
  if (!id || typeof id !== 'string') return false;
  const cleaned = id.replace(/\s/g, '');
  return /^[12]\d{9}$/.test(cleaned);
};

/**
 * Validate Saudi mobile number (05xxxxxxxx).
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidSaudiPhone = phone => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(05\d{8}|9665\d{8}|\+9665\d{8})$/.test(cleaned);
};

/**
 * Validate email address.
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = email => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Validate Saudi IBAN (SA + 2 check digits + 20 alphanumeric).
 * @param {string} iban
 * @returns {boolean}
 */
export const isValidSaudiIBAN = iban => {
  if (!iban) return false;
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return /^SA\d{2}[A-Z0-9]{20}$/.test(cleaned);
};

/**
 * Validate Commercial Registration number (السجل التجاري).
 * 10 digits.
 * @param {string} cr
 * @returns {boolean}
 */
export const isValidCR = cr => {
  if (!cr) return false;
  return /^\d{10}$/.test(cr.replace(/\s/g, ''));
};

/**
 * Validate VAT number (الرقم الضريبي).
 * 15 digits starting with 3 and ending with 3.
 * @param {string} vat
 * @returns {boolean}
 */
export const isValidVAT = vat => {
  if (!vat) return false;
  const cleaned = vat.replace(/\s/g, '');
  return /^3\d{13}3$/.test(cleaned);
};

/**
 * Check if a string is not empty after trimming.
 * @param {string} value
 * @returns {boolean}
 */
export const isRequired = value => {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
};

/**
 * Validate minimum length.
 * @param {string} value
 * @param {number} min
 * @returns {boolean}
 */
export const minLength = (value, min) => {
  return String(value || '').length >= min;
};

/**
 * Validate maximum length.
 * @param {string} value
 * @param {number} max
 * @returns {boolean}
 */
export const maxLength = (value, max) => {
  return String(value || '').length <= max;
};

/**
 * Validate number is in range.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export const inRange = (value, min, max) => {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * Validate a positive number.
 * @param {*} value
 * @returns {boolean}
 */
export const isPositiveNumber = value => {
  const num = Number(value);
  return !isNaN(num) && num > 0;
};

/**
 * Validate URL format.
 * @param {string} url
 * @returns {boolean}
 */
export const isValidUrl = url => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate Arabic text only.
 * @param {string} text
 * @returns {boolean}
 */
export const isArabicOnly = text => {
  if (!text) return false;
  return /^[\u0600-\u06FF\s\d.,!?؟،؛:()-]+$/.test(text);
};

/**
 * Validate strong password.
 * At least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char.
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validatePassword = password => {
  const errors = [];
  if (!password || password.length < 8) errors.push('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
  if (!/[A-Z]/.test(password)) errors.push('يجب أن تحتوي على حرف كبير');
  if (!/[a-z]/.test(password)) errors.push('يجب أن تحتوي على حرف صغير');
  if (!/\d/.test(password)) errors.push('يجب أن تحتوي على رقم');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('يجب أن تحتوي على رمز خاص');
  return { valid: errors.length === 0, errors };
};

/**
 * Create a form field validator.
 * @param {object} rules — { required?, email?, phone?, minLength?, maxLength?, pattern?, custom? }
 * @returns {function} (value) => errorMessage | null
 */
export const createFieldValidator = (rules = {}) => {
  return value => {
    if (rules.required && !isRequired(value)) return rules.requiredMsg || 'هذا الحقل مطلوب';
    if (value && rules.email && !isValidEmail(value)) return 'البريد الإلكتروني غير صالح';
    if (value && rules.phone && !isValidSaudiPhone(value)) return 'رقم الجوال غير صالح';
    if (value && rules.saudiId && !isValidSaudiId(value)) return 'رقم الهوية غير صالح';
    if (value && rules.iban && !isValidSaudiIBAN(value)) return 'رقم الآيبان غير صالح';
    if (value && rules.minLength && !minLength(value, rules.minLength))
      return `الحد الأدنى ${rules.minLength} حرف`;
    if (value && rules.maxLength && !maxLength(value, rules.maxLength))
      return `الحد الأقصى ${rules.maxLength} حرف`;
    if (value && rules.pattern && !rules.pattern.test(value))
      return rules.patternMsg || 'تنسيق غير صالح';
    if (value && rules.custom) return rules.custom(value);
    return null;
  };
};

export default {
  isValidSaudiId,
  isValidSaudiPhone,
  isValidEmail,
  isValidSaudiIBAN,
  isValidCR,
  isValidVAT,
  isRequired,
  minLength,
  maxLength,
  inRange,
  isPositiveNumber,
  isValidUrl,
  isArabicOnly,
  validatePassword,
  createFieldValidator,
};
