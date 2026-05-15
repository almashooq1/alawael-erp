/**
 * Calendar Context - Hijri / Gregorian automatic switching
 * سياق التقويم — التبديل التلقائي بين الهجري والميلادي
 *
 * Usage:
 *   const { calendarType, toggleCalendar, isHijri } = useCalendar();
 *
 * Wrap your app (or section) with <CalendarProvider>.
 * All date-display utilities read from this context via `useCalendar`.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getCalendarType, setCalendarType } from 'utils/storageService';
import { formatDateByCalendar, formatDateTimeByCalendar, formatDateDual } from 'utils/dateUtils';

/** @type {'gregorian'|'hijri'} */
const DEFAULT_TYPE = 'gregorian';

const CalendarContext = createContext(null);

export function CalendarProvider({ children }) {
  const [calendarType, setType] = useState(() => getCalendarType() || DEFAULT_TYPE);

  // Persist to localStorage whenever preference changes
  useEffect(() => {
    setCalendarType(calendarType);
    // Expose on <html> so CSS / global helpers can read it
    document.documentElement.setAttribute('data-calendar', calendarType);
  }, [calendarType]);

  const toggleCalendar = useCallback(() => {
    setType(prev => (prev === 'gregorian' ? 'hijri' : 'gregorian'));
  }, []);

  const setHijri = useCallback(() => setType('hijri'), []);
  const setGregorian = useCallback(() => setType('gregorian'), []);

  const value = useMemo(
    () => ({
      calendarType,
      isHijri: calendarType === 'hijri',
      isGregorian: calendarType === 'gregorian',
      toggleCalendar,
      setHijri,
      setGregorian,
    }),
    [calendarType, toggleCalendar, setHijri, setGregorian]
  );

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

/**
 * Hook — consume calendar preference anywhere in the tree.
 * Must be used inside <CalendarProvider>.
 */
export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) {
    // Graceful fallback when used outside provider (e.g. during tests)
    return {
      calendarType: DEFAULT_TYPE,
      isHijri: false,
      isGregorian: true,
      toggleCalendar: () => {},
      setHijri: () => {},
      setGregorian: () => {},
    };
  }
  return ctx;
}

/**
 * Hook — returns calendar-aware formatting helpers bound to the active context.
 * Re-renders automatically when the calendar type changes.
 *
 * @returns {{ fmt, fmtDT, fmtDual, calendarType, isHijri }}
 */
export function useDateFormatter() {
  const { calendarType, isHijri } = useCalendar();
  return useMemo(
    () => ({
      calendarType,
      isHijri,
      /** Format date only — respects active calendar */
      fmt: (date, options) => formatDateByCalendar(date, calendarType, options),
      /** Format date + time — respects active calendar */
      fmtDT: date => formatDateTimeByCalendar(date, calendarType),
      /** Always show both calendars: "15 مايو 2026 | 17 ذو القعدة 1447" */
      fmtDual: formatDateDual,
    }),
    [calendarType, isHijri]
  );
}
