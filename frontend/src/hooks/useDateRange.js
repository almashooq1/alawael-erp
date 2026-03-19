import { useState, useCallback } from 'react';

/**
 * useDateRange — Date range picker state management.
 *
 * @param {object} [options]
 * @param {string} [options.defaultFrom]   — Initial start date (YYYY-MM-DD)
 * @param {string} [options.defaultTo]     — Initial end date (YYYY-MM-DD)
 * @param {string} [options.defaultPreset] — Initial preset key
 *
 * @returns {object} { from, to, setFrom, setTo, setRange, preset, applyPreset, clear, isActive }
 */
const useDateRange = (options = {}) => {
  const [from, setFrom] = useState(options.defaultFrom || '');
  const [to, setTo] = useState(options.defaultTo || '');
  const [preset, setPreset] = useState(options.defaultPreset || '');

  const setRange = useCallback((newFrom, newTo) => {
    setFrom(newFrom);
    setTo(newTo);
    setPreset('');
  }, []);

  const clear = useCallback(() => {
    setFrom('');
    setTo('');
    setPreset('');
  }, []);

  const applyPreset = useCallback(key => {
    const today = new Date();
    const fmt = d => d.toISOString().split('T')[0];

    const presets = {
      today: () => {
        const d = fmt(today);
        return [d, d];
      },
      yesterday: () => {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        return [fmt(d), fmt(d)];
      },
      thisWeek: () => {
        const start = new Date(today);
        start.setDate(start.getDate() - start.getDay());
        return [fmt(start), fmt(today)];
      },
      lastWeek: () => {
        const end = new Date(today);
        end.setDate(end.getDate() - end.getDay() - 1);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        return [fmt(start), fmt(end)];
      },
      thisMonth: () => {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return [fmt(start), fmt(today)];
      },
      lastMonth: () => {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        return [fmt(start), fmt(end)];
      },
      last7Days: () => {
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        return [fmt(start), fmt(today)];
      },
      last30Days: () => {
        const start = new Date(today);
        start.setDate(start.getDate() - 29);
        return [fmt(start), fmt(today)];
      },
      last90Days: () => {
        const start = new Date(today);
        start.setDate(start.getDate() - 89);
        return [fmt(start), fmt(today)];
      },
      thisYear: () => {
        const start = new Date(today.getFullYear(), 0, 1);
        return [fmt(start), fmt(today)];
      },
    };

    const resolver = presets[key];
    if (resolver) {
      const [newFrom, newTo] = resolver();
      setFrom(newFrom);
      setTo(newTo);
      setPreset(key);
    }
  }, []);

  /**
   * Arabic labels for presets.
   */
  const PRESET_OPTIONS = [
    { key: 'today', label: 'اليوم' },
    { key: 'yesterday', label: 'أمس' },
    { key: 'thisWeek', label: 'هذا الأسبوع' },
    { key: 'lastWeek', label: 'الأسبوع الماضي' },
    { key: 'thisMonth', label: 'هذا الشهر' },
    { key: 'lastMonth', label: 'الشهر الماضي' },
    { key: 'last7Days', label: 'آخر 7 أيام' },
    { key: 'last30Days', label: 'آخر 30 يوم' },
    { key: 'last90Days', label: 'آخر 90 يوم' },
    { key: 'thisYear', label: 'هذا العام' },
  ];

  return {
    from,
    to,
    setFrom,
    setTo,
    setRange,
    preset,
    applyPreset,
    clear,
    isActive: !!(from || to),
    PRESET_OPTIONS,
  };
};

export default useDateRange;
