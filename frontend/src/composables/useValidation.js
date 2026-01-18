// Validation Rules and Utilities for Forms
// استخدام: import { validateEmail, validatePhone, validateArabicName } from '@/composables/useValidation'

export const useValidation = () => {
  /**
   * التحقق من البريد الإلكتروني
   * @param {string} email
   * @returns {boolean}
   */
  const validateEmail = email => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * التحقق من رقم الهاتف
   * @param {string} phone
   * @returns {boolean}
   */
  const validatePhone = phone => {
    const phoneRegex = /^(\+966|0)(5[0-9]{8}|[0-9]{8})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  /**
   * التحقق من الاسم العربي
   * @param {string} name
   * @returns {boolean}
   */
  const validateArabicName = name => {
    const arabicRegex = /^[\u0600-\u06FF\s]{3,}$/;
    return arabicRegex.test(name);
  };

  /**
   * التحقق من كلمة المرور
   * @param {string} password
   * @returns {boolean}
   */
  const validatePassword = password => {
    // كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9]).{8,}$/;
    return passwordRegex.test(password);
  };

  /**
   * التحقق من حقل مطلوب
   * @param {any} value
   * @returns {boolean}
   */
  const validateRequired = value => {
    return value !== null && value !== undefined && value !== '';
  };

  /**
   * التحقق من الحد الأدنى للطول
   * @param {string} value
   * @param {number} min
   * @returns {boolean}
   */
  const validateMinLength = (value, min) => {
    return value && value.length >= min;
  };

  /**
   * التحقق من الحد الأقصى للطول
   * @param {string} value
   * @param {number} max
   * @returns {boolean}
   */
  const validateMaxLength = (value, max) => {
    return !value || value.length <= max;
  };

  /**
   * التحقق من النسبة المئوية
   * @param {number} value
   * @returns {boolean}
   */
  const validatePercentage = value => {
    return value >= 0 && value <= 100;
  };

  /**
   * التحقق من التاريخ
   * @param {string} date
   * @returns {boolean}
   */
  const validateDate = date => {
    return !isNaN(Date.parse(date));
  };

  /**
   * الحصول على رسالة خطأ للتحقق
   * @param {string} field
   * @param {string} rule
   * @returns {string}
   */
  const getErrorMessage = (field, rule) => {
    const messages = {
      required: `${field} مطلوب`,
      email: 'البريد الإلكتروني غير صحيح',
      phone: 'رقم الهاتف غير صحيح',
      password: 'كلمة المرور ضعيفة جداً',
      minLength: min => `${field} يجب أن يكون ${min} أحرف على الأقل`,
      maxLength: max => `${field} يجب ألا يتجاوز ${max} أحرف`,
      percentage: 'القيمة يجب أن تكون بين 0 و 100',
      date: 'التاريخ غير صحيح',
    };
    return messages[rule] instanceof Function ? messages[rule](field) : messages[rule];
  };

  return {
    validateEmail,
    validatePhone,
    validateArabicName,
    validatePassword,
    validateRequired,
    validateMinLength,
    validateMaxLength,
    validatePercentage,
    validateDate,
    getErrorMessage,
  };
};

export default useValidation;
