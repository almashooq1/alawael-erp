/* eslint-disable no-unused-vars */
/**
 * Backend Internationalization Service
 * خدمة الترجمة للواجهة الخلفية
 */

const arTranslations = require('../locales/ar.json');
const enTranslations = require('../locales/en.json');

const translations = {
  ar: arTranslations,
  en: enTranslations,
};

const defaultLanguage = 'ar';

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - The object to search
 * @param {string} path - Dot notation path (e.g., 'auth.login')
 * @returns {*} The found value or undefined
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

/**
 * Replace template variables in translation string
 * @param {string} str - String with {{variable}} placeholders
 * @param {Object} params - Key-value pairs for replacement
 * @returns {string} String with replaced values
 */
const replaceParams = (str, params = {}) => {
  if (typeof str !== 'string') return str;

  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
};

/**
 * Translate a key to the specified language
 * @param {string} key - Translation key (dot notation)
 * @param {string} lang - Language code ('ar' or 'en')
 * @param {Object} params - Optional parameters for template replacement
 * @returns {string} Translated string
 */
const t = (key, lang = defaultLanguage, params = {}) => {
  const language = translations[lang] ? lang : defaultLanguage;
  const translation = getNestedValue(translations[language], key);

  if (translation === undefined) {
    // Fallback to default language if key not found
    if (lang !== defaultLanguage) {
      const fallback = getNestedValue(translations[defaultLanguage], key);
      if (fallback !== undefined) {
        return replaceParams(fallback, params);
      }
    }
    // Return the key if no translation found
    return key;
  }

  return replaceParams(translation, params);
};

/**
 * Get language from request headers or query
 * @param {Object} req - Express request object
 * @returns {string} Language code
 */
const getLanguageFromRequest = req => {
  // Check query parameter first
  if (req.query && req.query.lang && translations[req.query.lang]) {
    return req.query.lang;
  }

  // Check Accept-Language header
  if (req.headers && req.headers['accept-language']) {
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage.includes('ar')) return 'ar';
    if (acceptLanguage.includes('en')) return 'en';
  }

  // Check user preference if authenticated
  if (req.user && req.user.language && translations[req.user.language]) {
    return req.user.language;
  }

  return defaultLanguage;
};

/**
 * Middleware to set language for the request
 */
const i18nMiddleware = (req, res, next) => {
  req.language = getLanguageFromRequest(req);
  req.t = (key, params = {}) => t(key, req.language, params);
  next();
};

/**
 * Format date according to language
 * @param {Date|string} date - Date to format
 * @param {string} lang - Language code
 * @param {string} format - Format type ('short', 'long', 'full')
 * @returns {string} Formatted date string
 */
const formatDate = (date, lang = defaultLanguage, format = 'short') => {
  const d = new Date(date);
  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';

  const options = {
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  };

  return d.toLocaleDateString(locale, options[format] || options.short);
};

/**
 * Format number according to language
 * @param {number} number - Number to format
 * @param {string} lang - Language code
 * @returns {string} Formatted number string
 */
const formatNumber = (number, lang = defaultLanguage) => {
  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
  return new Intl.NumberFormat(locale).format(number);
};

/**
 * Format currency according to language
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: SAR)
 * @param {string} lang - Language code
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'SAR', lang = defaultLanguage) => {
  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Get direction for language
 * @param {string} lang - Language code
 * @returns {string} 'rtl' for Arabic, 'ltr' otherwise
 */
const getDirection = (lang = defaultLanguage) => {
  return lang === 'ar' ? 'rtl' : 'ltr';
};

/**
 * Get all available translations for a key (useful for API responses)
 * @param {string} key - Translation key
 * @param {Object} params - Optional parameters
 * @returns {Object} Object with translations in all languages
 */
const getAllTranslations = (key, params = {}) => {
  const result = {};
  Object.keys(translations).forEach(lang => {
    result[lang] = t(key, lang, params);
  });
  return result;
};

module.exports = {
  t,
  i18nMiddleware,
  getLanguageFromRequest,
  formatDate,
  formatNumber,
  formatCurrency,
  getDirection,
  getAllTranslations,
  translations,
  defaultLanguage,
};
