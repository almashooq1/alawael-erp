import { useTranslation } from 'i18next-react';

/**
 * Advanced i18n utilities for formatting dates, numbers, and handling pluralization
 * Provides locale-aware formatting across all supported languages
 */

export interface I18nFormatOptions {
  locale?: string;
  style?: 'short' | 'long' | 'narrow';
  timeZone?: string;
}

export interface PluralOptions {
  count: number;
  singular: string;
  plural: string;
  zero?: string;
}

/**
 * Format numbers with locale-specific formatting
 * Examples:
 *   formatNumber(1000, 'en') → "1,000"
 *   formatNumber(1000, 'ar') → "١٬٠٠٠"
 *   formatNumber(1000.5, 'fr') → "1 000,5"
 */
export const formatNumber = (
  value: number,
  locale: string = 'en',
  options?: Intl.NumberFormatOptions
): string => {
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : locale, {
      ...options,
    }).format(value);
  } catch (error) {
    console.error('Error formatting number:', error);
    return value.toString();
  }
};

/**
 * Format currency with locale-specific formatting
 * Examples:
 *   formatCurrency(99.99, 'en', 'USD') → "$99.99"
 *   formatCurrency(99.99, 'ar', 'SAR') → "﷼ 99.99"
 */
export const formatCurrency = (
  value: number,
  locale: string = 'en',
  currency: string = 'USD'
): string => {
  try {
    const localeCode = locale === 'ar' ? 'ar-SA' : locale;
    return new Intl.NumberFormat(localeCode, {
      style: 'currency',
      currency,
    }).format(value);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${currency} ${value}`;
  }
};

/**
 * Format percentage with locale-specific formatting
 * Examples:
 *   formatPercent(0.75, 'en') → "75%"
 *   formatPercent(0.75, 'ar') → "٧٥٪"
 */
export const formatPercent = (
  value: number,
  locale: string = 'en',
  maxFractionDigits: number = 2
): string => {
  try {
    const localeCode = locale === 'ar' ? 'ar-SA' : locale;
    return new Intl.NumberFormat(localeCode, {
      style: 'percent',
      maximumFractionDigits: maxFractionDigits,
    }).format(value);
  } catch (error) {
    console.error('Error formatting percent:', error);
    return `${(value * 100).toFixed(maxFractionDigits)}%`;
  }
};

/**
 * Format dates with locale-specific formatting
 * Examples:
 *   formatDate(new Date(), 'en') → "1/29/2026"
 *   formatDate(new Date(), 'ar') → "٢٩/١/٢٠٢٦"
 */
export const formatDate = (
  date: Date,
  locale: string = 'en',
  options?: Intl.DateTimeFormatOptions
): string => {
  try {
    const localeCode = locale === 'ar' ? 'ar-SA' : locale === 'fr' ? 'fr-FR' : 'en-US';
    return new Intl.DateTimeFormat(localeCode, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      ...options,
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toDateString();
  }
};

/**
 * Format time with locale-specific formatting
 * Examples:
 *   formatTime(new Date(), 'en') → "2:30:45 PM"
 *   formatTime(new Date(), 'ar') → "٢:٣٠:٤٥ م"
 */
export const formatTime = (
  date: Date,
  locale: string = 'en',
  options?: Intl.DateTimeFormatOptions
): string => {
  try {
    const localeCode = locale === 'ar' ? 'ar-SA' : locale === 'fr' ? 'fr-FR' : 'en-US';
    return new Intl.DateTimeFormat(localeCode, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      ...options,
    }).format(date);
  } catch (error) {
    console.error('Error formatting time:', error);
    return date.toTimeString();
  }
};

/**
 * Format date and time combined
 * Examples:
 *   formatDateTime(new Date(), 'en') → "1/29/2026, 2:30:45 PM"
 */
export const formatDateTime = (
  date: Date,
  locale: string = 'en',
  options?: Intl.DateTimeFormatOptions
): string => {
  try {
    const localeCode = locale === 'ar' ? 'ar-SA' : locale === 'fr' ? 'fr-FR' : 'en-US';
    return new Intl.DateTimeFormat(localeCode, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      ...options,
    }).format(date);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return date.toString();
  }
};

/**
 * Handle pluralization based on count
 * Examples:
 *   pluralize({ count: 1, singular: 'item', plural: 'items' }) → "item"
 *   pluralize({ count: 5, singular: 'item', plural: 'items' }) → "items"
 *   pluralize({ count: 0, singular: 'item', plural: 'items', zero: 'no items' }) → "no items"
 */
export const pluralize = (options: PluralOptions): string => {
  const { count, singular, plural, zero } = options;

  if (count === 0 && zero) {
    return zero;
  }

  return count === 1 ? singular : plural;
};

/**
 * Format a value with pluralization
 * Example: formatWithPlural(5, 'user', 'users') → "5 users"
 */
export const formatWithPlural = (
  count: number,
  singular: string,
  plural: string,
  locale: string = 'en'
): string => {
  const formattedCount = formatNumber(count, locale);
  const word = pluralize({ count, singular, plural });
  return `${formattedCount} ${word}`;
};

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * Examples:
 *   formatRelativeTime(new Date(Date.now() - 3600000), 'en') → "1 hour ago"
 */
export const formatRelativeTime = (
  date: Date,
  locale: string = 'en'
): string => {
  try {
    const localeCode = locale === 'ar' ? 'ar-SA' : locale === 'fr' ? 'fr-FR' : 'en-US';
    const rtf = new Intl.RelativeTimeFormat(localeCode, { numeric: 'auto' });

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (Math.abs(diffSec) < 60) {
      return rtf.format(diffSec, 'second');
    } else if (Math.abs(diffSec) < 3600) {
      return rtf.format(Math.floor(diffSec / 60), 'minute');
    } else if (Math.abs(diffSec) < 86400) {
      return rtf.format(Math.floor(diffSec / 3600), 'hour');
    } else if (Math.abs(diffSec) < 604800) {
      return rtf.format(Math.floor(diffSec / 86400), 'day');
    } else {
      return rtf.format(Math.floor(diffSec / 604800), 'week');
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return date.toDateString();
  }
};

/**
 * Hook to use i18n formatting utilities
 * Automatically uses current locale from i18n context
 */
export const useI18nFormat = () => {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return {
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, locale, options),
    formatCurrency: (value: number, currency?: string) =>
      formatCurrency(value, locale, currency),
    formatPercent: (value: number, maxFractionDigits?: number) =>
      formatPercent(value, locale, maxFractionDigits),
    formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) =>
      formatDate(date, locale, options),
    formatTime: (date: Date, options?: Intl.DateTimeFormatOptions) =>
      formatTime(date, locale, options),
    formatDateTime: (date: Date, options?: Intl.DateTimeFormatOptions) =>
      formatDateTime(date, locale, options),
    formatRelativeTime: (date: Date) => formatRelativeTime(date, locale),
    formatWithPlural: (count: number, singular: string, plural: string) =>
      formatWithPlural(count, singular, plural, locale),
  };
};

export default {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  pluralize,
  formatWithPlural,
  useI18nFormat,
};
