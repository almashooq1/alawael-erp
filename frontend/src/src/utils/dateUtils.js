/**
 * Date Formatting Utilities
 */

// Format date to display format
export const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return '';

  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year)
    .replace('HH', hours)
    .replace('mm', minutes);
};

// Format date to ISO string
export const formatDateToISO = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

// Parse ISO date
export const parseISODate = (dateString) => {
  if (!dateString) return null;
  return new Date(dateString);
};

// Get relative time (e.g., "2 hours ago")
export const getRelativeTime = (date) => {
  if (!date) return '';

  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatDate(date);
};

// Get date range (start and end dates)
export const getDateRange = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  return {
    start: formatDateToISO(start),
    end: formatDateToISO(end),
  };
};

// Get current month dates
export const getCurrentMonthDates = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    start: formatDateToISO(start),
    end: formatDateToISO(end),
  };
};

// Get quarter dates
export const getQuarterDates = (quarter = null) => {
  const now = new Date();
  const year = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const q = quarter !== null ? quarter : currentQuarter;

  const month = q * 3;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 3, 0);

  return {
    start: formatDateToISO(start),
    end: formatDateToISO(end),
  };
};

// Get year dates
export const getYearDates = (year = null) => {
  const y = year || new Date().getFullYear();
  const start = new Date(y, 0, 1);
  const end = new Date(y, 11, 31);

  return {
    start: formatDateToISO(start),
    end: formatDateToISO(end),
  };
};

// Check if date is today
export const isToday = (date) => {
  const today = new Date();
  const compareDate = new Date(date);

  return (
    today.getDate() === compareDate.getDate() &&
    today.getMonth() === compareDate.getMonth() &&
    today.getFullYear() === compareDate.getFullYear()
  );
};

// Check if date is in past
export const isPast = (date) => {
  return new Date(date) < new Date();
};

// Check if date is in future
export const isFuture = (date) => {
  return new Date(date) > new Date();
};

// Get month name
export const getMonthName = (date, locale = 'en-US') => {
  return new Date(date).toLocaleString(locale, { month: 'long' });
};

// Get day name
export const getDayName = (date, locale = 'en-US') => {
  return new Date(date).toLocaleString(locale, { weekday: 'long' });
};

// Format time duration
export const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

export default {
  formatDate,
  formatDateToISO,
  parseISODate,
  getRelativeTime,
  getDateRange,
  getCurrentMonthDates,
  getQuarterDates,
  getYearDates,
  isToday,
  isPast,
  isFuture,
  getMonthName,
  getDayName,
  formatDuration,
};
