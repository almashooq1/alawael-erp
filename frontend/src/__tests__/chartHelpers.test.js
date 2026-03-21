/**
 * chartHelpers.test.js — Recharts/Chart.js configuration presets
 * أدوات تهيئة الرسوم البيانية — ألوان، تنسيقات، إعدادات
 */
import {
  CHART_COLORS,
  CHART_GRADIENTS,
  getChartColor,
  tooltipStyle,
  formatAxisNumber,
  formatPercent,
  formatChartCurrency,
  createBarConfig,
  createLineConfig,
  createPieData,
  calculatePercentages,
  ARABIC_LEGEND_PROPS,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
  GRID_PROPS,
} from '../utils/chartHelpers';

/* ===============================================================
   Constants
   =============================================================== */
describe('CHART_COLORS', () => {
  test('has 10 colors', () => {
    expect(CHART_COLORS).toHaveLength(10);
  });

  test('all are hex color strings', () => {
    CHART_COLORS.forEach(c => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });
});

describe('CHART_GRADIENTS', () => {
  test('has expected keys', () => {
    expect(Object.keys(CHART_GRADIENTS)).toEqual(
      expect.arrayContaining(['primary', 'success', 'warning', 'danger', 'info', 'purple'])
    );
  });

  test('each gradient is a pair of hex colors', () => {
    Object.values(CHART_GRADIENTS).forEach(pair => {
      expect(pair).toHaveLength(2);
      pair.forEach(c => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
    });
  });
});

/* ===============================================================
   getChartColor
   =============================================================== */
describe('getChartColor', () => {
  test('index 0 returns first color', () => {
    expect(getChartColor(0)).toBe(CHART_COLORS[0]);
  });

  test('cycles past array length', () => {
    expect(getChartColor(10)).toBe(CHART_COLORS[0]);
    expect(getChartColor(11)).toBe(CHART_COLORS[1]);
  });
});

/* ===============================================================
   tooltipStyle
   =============================================================== */
describe('tooltipStyle', () => {
  test('returns default style object', () => {
    const s = tooltipStyle();
    expect(s.contentStyle.direction).toBe('rtl');
    expect(s.contentStyle.fontFamily).toContain('Cairo');
    expect(s.labelStyle).toBeDefined();
    expect(s.cursor).toBeDefined();
  });

  test('merges overrides', () => {
    const s = tooltipStyle({ fontSize: 18 });
    expect(s.contentStyle.fontSize).toBe(18);
    expect(s.contentStyle.direction).toBe('rtl'); // other defaults remain
  });
});

/* ===============================================================
   formatAxisNumber
   =============================================================== */
describe('formatAxisNumber', () => {
  test('millions → M', () => {
    expect(formatAxisNumber(2_500_000)).toBe('2.5M');
  });

  test('thousands → k', () => {
    expect(formatAxisNumber(4_700)).toBe('4.7k');
  });

  test('below 1000 → string of value', () => {
    expect(formatAxisNumber(500)).toBe('500');
  });

  test('exactly 1000 → 1.0k', () => {
    expect(formatAxisNumber(1000)).toBe('1.0k');
  });

  test('exactly 1M → 1.0M', () => {
    expect(formatAxisNumber(1_000_000)).toBe('1.0M');
  });
});

/* ===============================================================
   formatPercent
   =============================================================== */
describe('formatPercent', () => {
  test('default 1 decimal', () => {
    expect(formatPercent(33.333)).toBe('33.3%');
  });

  test('custom 0 decimals', () => {
    expect(formatPercent(99.7, 0)).toBe('100%');
  });

  test('zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });
});

/* ===============================================================
   formatChartCurrency
   =============================================================== */
describe('formatChartCurrency', () => {
  test('millions → M ر.س', () => {
    expect(formatChartCurrency(3_500_000)).toBe('3.5M ر.س');
  });

  test('thousands → K ر.س', () => {
    expect(formatChartCurrency(2_300)).toBe('2.3K ر.س');
  });

  test('below 1000 → value ر.س', () => {
    expect(formatChartCurrency(750)).toBe('750 ر.س');
  });
});

/* ===============================================================
   createBarConfig
   =============================================================== */
describe('createBarConfig', () => {
  test('maps bars with auto colors', () => {
    const cfg = createBarConfig([
      { dataKey: 'revenue', name: 'الإيرادات' },
      { dataKey: 'expense', name: 'المصاريف' },
    ]);
    expect(cfg).toHaveLength(2);
    expect(cfg[0].fill).toBe(CHART_COLORS[0]);
    expect(cfg[0].radius).toEqual([4, 4, 0, 0]);
    expect(cfg[1].fill).toBe(CHART_COLORS[1]);
  });

  test('respects custom color', () => {
    const cfg = createBarConfig([{ dataKey: 'x', name: 'X', color: '#ff0000' }]);
    expect(cfg[0].fill).toBe('#ff0000');
  });
});

/* ===============================================================
   createLineConfig
   =============================================================== */
describe('createLineConfig', () => {
  test('maps lines with stroke + dots', () => {
    const cfg = createLineConfig([{ dataKey: 'profit', name: 'الربح' }]);
    expect(cfg[0].stroke).toBe(CHART_COLORS[0]);
    expect(cfg[0].strokeWidth).toBe(2);
    expect(cfg[0].dot).toBeDefined();
    expect(cfg[0].activeDot).toBeDefined();
  });

  test('custom color overrides', () => {
    const cfg = createLineConfig([{ dataKey: 'x', name: 'X', color: '#123456' }]);
    expect(cfg[0].stroke).toBe('#123456');
  });
});

/* ===============================================================
   createPieData
   =============================================================== */
describe('createPieData', () => {
  test('adds fill color to each item', () => {
    const data = [
      { name: 'A', value: 30 },
      { name: 'B', value: 70 },
    ];
    const result = createPieData(data);
    expect(result[0].fill).toBe(CHART_COLORS[0]);
    expect(result[1].fill).toBe(CHART_COLORS[1]);
    expect(result[0].name).toBe('A');
    expect(result[0].value).toBe(30);
  });
});

/* ===============================================================
   calculatePercentages
   =============================================================== */
describe('calculatePercentages', () => {
  test('computes correct percentages', () => {
    const data = [
      { name: 'A', value: 25 },
      { name: 'B', value: 75 },
    ];
    const result = calculatePercentages(data);
    expect(result[0].percent).toBe(25);
    expect(result[1].percent).toBe(75);
  });

  test('handles zero total', () => {
    const result = calculatePercentages([
      { name: 'A', value: 0 },
      { name: 'B', value: 0 },
    ]);
    result.forEach(d => expect(d.percent).toBe(0));
  });

  test('handles empty array', () => {
    expect(calculatePercentages([])).toEqual([]);
  });
});

/* ===============================================================
   Static config objects
   =============================================================== */
describe('static config objects', () => {
  test('ARABIC_LEGEND_PROPS has RTL direction', () => {
    expect(ARABIC_LEGEND_PROPS.wrapperStyle.direction).toBe('rtl');
  });

  test('X_AXIS_PROPS disables axis line', () => {
    expect(X_AXIS_PROPS.axisLine).toBe(false);
    expect(X_AXIS_PROPS.tickLine).toBe(false);
  });

  test('Y_AXIS_PROPS has width', () => {
    expect(Y_AXIS_PROPS.width).toBe(60);
  });

  test('GRID_PROPS has no vertical lines', () => {
    expect(GRID_PROPS.vertical).toBe(false);
    expect(GRID_PROPS.strokeDasharray).toBe('3 3');
  });
});
